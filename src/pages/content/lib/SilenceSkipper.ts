import { browser } from "webextension-polyfill-ts";
import { MediaElement } from '../../shared/types';
import debug from '../../shared/debug';
import ConfigProvider from '../../shared/configProvider';

/**
 * Silence Skipper: This class is doing the job of actually inspecting media elements and
 * slowing them up or down
 */
export default class SilenceSkipper {
  // Constructor variables
  element : MediaElement;
  config : ConfigProvider;

  // State variables
  isAttached = false;
  isSpedUp = false;
  samplesUnderThreshold = 0;
  isInspectionRunning = false;

  // Audio variables
  audioContext : AudioContext | undefined;
  analyser : AnalyserNode | undefined;
  source: MediaElementAudioSourceNode | undefined;
  audioFrequencies : Float32Array | undefined;

  /**
   * Add silence skipper to element
   * 
   * @param mediaElement Element to attach to
   * @param config Config Provider to use
   */
  constructor(mediaElement : MediaElement, config : ConfigProvider) {
    this.element = mediaElement;
    this.config = config;

    this.config.onUpdate(() => this._onConfigUpdate());
  }

  /**
   * Attach the element to the current class.
   * This is only needed when we are actually skipping silent parts as we are using excess resources
   * otherwise - this is why this step is not done in the constructor
   */
  _attachToElement() {
    // We don't need to attach multiple times
    if (this.isAttached) return false;

    this.audioContext = new AudioContext();

    // Create our audio components
    this.analyser = this.audioContext.createAnalyser();
    this.source = this.audioContext.createMediaElementSource(this.element);

    // Connect our components
    // Source -> Analyser -> Destination
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.audioFrequencies = new Float32Array(this.analyser.fftSize);

    this.isAttached = true;
  }

  /**
   * Listener for config changes to update the settings
   */
  _onConfigUpdate() {
    const isEnabled = this.config.get('enabled');

    if (isEnabled) {
      if (!this.isInspectionRunning) {
        // Start running the inspection
        this._inspectSample();
      }

      // Update our speed to the new config speed
      const playbackSpeed = this.config.get('playback_speed');
      const silenceSpeed = this.config.get('silence_speed');
      if (this.isSpedUp) {
        this.element.playbackRate = silenceSpeed;
      } else {
        this.element.playbackRate = playbackSpeed;
      }
    }
  }

  /**
   * Calculate the current volume of the media
   */
  _calculateVolume() {
    if (!this.analyser || !this.audioFrequencies) {
      debug("SilenceSkipper: Can't calculate volume as we are not attached");
      return 100;
    }

    this.analyser.getFloatTimeDomainData(this.audioFrequencies);

    // Compute volume via peak instantaneous power over the interval
    let peakInstantaneousPower = 0;
    for (let i = 0; i < this.audioFrequencies.length; i++) {
      const power = this.audioFrequencies[i];
      peakInstantaneousPower = Math.max(power, peakInstantaneousPower);
    }
    const volume = (500 * peakInstantaneousPower);

    return volume;
  }

  /**
   * Send a command to the popup
   * 
   * @param command Command to send
   */
  _sendCommand(command : String, data : Object = {}) {
    browser.runtime.sendMessage({ command, ...data });
  }

  /**
   * Inspect the current sample of the media and speed up or down accordingly
   */
  _inspectSample() {
    this.isInspectionRunning = true;

    // Make sure we are attached
    if (!this.isAttached) this._attachToElement();

    const volume = this._calculateVolume();
    const threshold = this.config.get('silence_threshold');
    const sampleThreshold = this.config.get('samples_threshold');
    const playbackSpeed = this.config.get('playback_speed');
    const silenceSpeed = this.config.get('silence_speed');

    if (volume < threshold && !this.element.paused && !this.isSpedUp) {
      // We are below our threshold and should possibly slow down
      this.samplesUnderThreshold += 1;

      if (this.samplesUnderThreshold >= sampleThreshold) {
        // We are over our sample threshold and should speed up!
        this._sendCommand('speedUp');

        this.isSpedUp = true;
        this.element.playbackRate = silenceSpeed;
      }
    } else if (volume > threshold && this.isSpedUp) {
      // Slow back down as we are now in a loud part again
      this.isSpedUp = false;
      this.samplesUnderThreshold = 0;

      this._sendCommand('slowDown');
      this.element.playbackRate = playbackSpeed;
    }

    // Send our volume information to the popup
    this._sendCommand('volume', {
      data: volume
    });

    if (this.config.get('enabled')) {
      // Continue inspecting the next sample
      setTimeout(() => this._inspectSample(), 50);
    } else {
      // Stop inspecting
      this.isInspectionRunning = false;

      this._sendCommand('volume', {
        data: 0
      });
    }
  }
}