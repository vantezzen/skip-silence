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
  samplesSinceLastVolumeMessage = 0;

  // Audio variables
  audioContext : AudioContext | undefined;
  analyser : AnalyserNode | undefined;
  gain : GainNode | undefined;
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
    this.gain = this.audioContext.createGain();

    // Connect our components
    // Source -> Analyser -> Gain -> Destination
    this.source
      .connect(this.analyser)
      .connect(this.gain)
      .connect(this.audioContext.destination);

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

      // Update gain level
      const muteSilence = this.config.get("mute_silence");
      if(muteSilence && this.isSpedUp) {
        if (this.gain) {
          // Make sure our silence is muted 
          this.gain.gain.value = 0;
        }
      } else if (this.gain) {
        // Make sure we are not muted 
        this.gain.gain.value = 1;
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
   * Slow the video down to playback speed
   */
  _slowDown() {
    const playbackSpeed = this.config.get('playback_speed');

    this.isSpedUp = false;
    this.samplesUnderThreshold = 0;

    this._sendCommand('slowDown');
    this.element.playbackRate = playbackSpeed;
    
    if(this.config.get("mute_silence")) {
      // Slowly remove our mute
      // If we do this immediately, we may cause a "clicking" noise
      // Source: http://alemangui.github.io/ramp-to-value
      if (this.gain && this.audioContext) {
        this.gain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.04);
      }
    }
  }

  /**
   * Speed the video up to silence speed
   */
  _speedUp() {
    const silenceSpeed = this.config.get('silence_speed');

    this._sendCommand('speedUp');
    this.isSpedUp = true;

    if (this.config.get("mute_silence")) {
      // Get the audio muted before we speed up the video
      // This will help remove the "clicking" sound when speeding up with remaining audio
      if (this.gain && this.audioContext) {
        this.gain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.015);
      }
      
      setTimeout(() => {
        this.element.playbackRate = silenceSpeed;
      }, 20);
    } else {
      this.element.playbackRate = silenceSpeed;
    }
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

    if (volume < threshold && !this.element.paused && !this.isSpedUp) {
      // We are below our threshold and should possibly slow down
      this.samplesUnderThreshold += 1;

      if (this.samplesUnderThreshold >= sampleThreshold) {
        // We are over our sample threshold and should speed up!
        this._speedUp();
      }
    } else if (volume > threshold && this.isSpedUp) {
      // Slow back down as we are now in a loud part again
      this._slowDown();
    }

    // Send our volume information to the popup
    this.samplesSinceLastVolumeMessage++;
    if (this.samplesSinceLastVolumeMessage >= 2) {
      this._sendCommand('volume', {
        data: volume
      });
      this.samplesSinceLastVolumeMessage = 0;
    }

    if (this.config.get('enabled')) {
      // Continue inspecting the next sample
      setTimeout(() => this._inspectSample(), 25);
    } else {
      // Stop inspecting
      this.isInspectionRunning = false;

      // Make sure the video is back to normal speed
      if (this.isSpedUp) {
        this.isSpedUp = false;
        this.samplesUnderThreshold = 0;
      }
      this._sendCommand('slowDown');
      this.element.playbackRate = 1;

      this._sendCommand('volume', {
        data: 0
      });
    }
  }
}