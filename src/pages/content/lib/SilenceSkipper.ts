import { browser } from "webextension-polyfill-ts";
import { MediaElement } from '../../shared/types';
import debug from '../../shared/debug';
import ConfigProvider from '../../shared/configProvider';
import DynamicThresholdCalculator from "./DynamicThresholdCalculator";
import AudioSync from "./AudioSync";
import Statistics from "./Statistics";
import Preload from "./Preload";

/**
 * Silence Skipper: This class is doing the job of actually inspecting media elements and
 * slowing them up or down
 */
export default class SilenceSkipper {
  // Constructor variables
  element : MediaElement;
  preloadElement ?: MediaElement;
  config : ConfigProvider;

  // State variables
  isAttached = false;
  isSpedUp = false;
  samplesUnderThreshold = 0;
  isInspectionRunning = false;
  samplesSinceLastVolumeMessage = 0;
  _targetPlaybackRate = 0;
  _rateChangeListenerAdded = false;
  _blockRateChangeEvents = false;
  _handlingRateChangeError = false;
  _samplePosition = 0; // This will count up to 50, then and reset to 0

  // Audio variables
  audioContext : AudioContext | undefined;
  analyser : AnalyserNode | undefined;
  gain : GainNode | undefined;
  source: MediaElementAudioSourceNode | undefined;
  audioFrequencies : Float32Array | undefined;

  // Dependencies
  dynamicThresholdCalculator : DynamicThresholdCalculator;
  audioSync : AudioSync;
  statistics : Statistics;
  preload : Preload;

  /**
   * Add silence skipper to element
   * 
   * @param mediaElement Element to attach to
   * @param config Config Provider to use
   */
  constructor(mediaElement : MediaElement, config : ConfigProvider) {
    this.element = mediaElement;
    this.config = config;

    // Setup dependencies
    this.dynamicThresholdCalculator = new DynamicThresholdCalculator(config);
    this.audioSync = new AudioSync(this);
    this.statistics = new Statistics(this);
    this.preload = new Preload(this);

    // Enable Skip Silence if we should
    const isEnabled = this.config.get('enabled');
    if (isEnabled) {
      if (!this.isInspectionRunning) {
        // Start running the inspection
        this._inspectSample();
      }
    }

    // Attach our config listener
    this.config.onUpdate(() => this._onConfigUpdate());
  }

  /**
   * Attach the element to the current class.
   * This is only needed when we are actually skipping silent parts as we are using excess resources
   * otherwise - this is why this step is not done in the constructor
   */
  async _attachToElement() {
    // We don't need to attach multiple times
    if (this.isAttached) return false;

    this.audioContext = new AudioContext();

    // Try to get a preload element
    if (this.config.get('use_preload')) {
      this.config.set('has_preloaded_current_page', true);
      
      const preloadElement = await this.preload.createPreloadElement();
      if (preloadElement) {
        this.preloadElement = preloadElement;
      } else {
        this.config.set('can_use_preload', false);
      }
    }

    // Create our audio components
    this.analyser = this.audioContext.createAnalyser();
    this.source = this.audioContext.createMediaElementSource(this.preloadElement || this.element);
    this.gain = this.audioContext.createGain();

    // Connect our components
    // Source -> Analyser -> Gain -> Destination
    let nextNode = this.source
      .connect(this.analyser)
      .connect(this.gain);

    if (this.preloadElement) {
      const muteGain = this.audioContext.createGain();
      this.gain.connect(muteGain);
      muteGain.gain.value = 0;

      nextNode = muteGain;
    }
    nextNode.connect(this.audioContext.destination);
    
    this.audioFrequencies = new Float32Array(this.analyser.fftSize);

    this.isAttached = true;
  }

  /**
   * Fixes issues changing the playback rate by temporarily blocking `ratechange` event listeners.
   */
  _handlePlaybackRateChangeError() {
    this._handlingRateChangeError = true;
    // If the playback rate was set to zero by the website, it's probably because the video is not 
    // loaded and can no longer be played, and so shouldn't be tampered with.
    if (this.element.playbackRate !== 0) {
      // Prevent ratechange event listeners from running while we forcibly change playback rate
      this._blockRateChangeEvents = true;

      if (!this._rateChangeListenerAdded) {
        // Passing in `true` for the third parameter causes the event to be captured on the way down.
        this.element.addEventListener('ratechange', (event: Event) => {
          if (this._blockRateChangeEvents) {
            // Ensure the event never reaches its listeners
            event.stopImmediatePropagation();
          } else {
            // If the playback rate changes from 0 back to the default rate (usually 1) and that's
            // not what we want it to be, update it.
            if (
              this.element.playbackRate !== 0
              && this.element.playbackRate === this.element.defaultPlaybackRate
              && this.element.playbackRate !== this._targetPlaybackRate
            ) {
              this._setPlaybackRate(this._targetPlaybackRate);
            }
          }
        }, true);
        this._rateChangeListenerAdded = true;
      }

      setTimeout(() => {
        // Now try setting the rate again
        this.element.playbackRate = this._targetPlaybackRate;
        // Wait for any ratechange events to fire and get blocked
        setTimeout(() => {
          // Once we have successfully changed the playback rate, allow rate change events again.
          // We don't just remove the event entirely as we might only want to override the event 
          // some of the time.
          this._blockRateChangeEvents = false;
          this._handlingRateChangeError = false;
        }, 1);
      }, 1);
    } else {
      this._handlingRateChangeError = false;
    }
  }

  /**
   * Attempts to change the video playback rate
   */
  _setPlaybackRate(rate: number) {
    this._targetPlaybackRate = rate;

    if (rate === 1) {
      // Setting the speed to exactly 1 will cause audio clicking
      // Setting the speed to slightly greater than 1 will prevent this from happening
      // Related: https://github.com/vantezzen/skip-silence/issues/52
      this._targetPlaybackRate = 1.01;
    }

    this.element.playbackRate = this._targetPlaybackRate;
    if (this.preloadElement) {
      this.preloadElement.playbackRate = this._targetPlaybackRate;
    }
    if (!this._handlingRateChangeError) {
      // Make sure that the playback rate actually changed
      setTimeout(() => {
        const failedToChangeRate = this.element.playbackRate !== this._targetPlaybackRate;
        if (failedToChangeRate) {
          // If it didn't, try to forcibly change it
          this._handlePlaybackRateChangeError();
        }
      }, 1);
    }
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
        this._setPlaybackRate(silenceSpeed);
      } else {
        this._setPlaybackRate(playbackSpeed);
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
   * @param data Additional data to send (optional)
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
    this.statistics.onSkipEnd();
    this._setPlaybackRate(playbackSpeed);

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
    this.statistics.onSkipStart();
    this.isSpedUp = true;

    if (this.config.get("mute_silence")) {
      // Get the audio muted before we speed up the video
      // This will help remove the "clicking" sound when speeding up with remaining audio
      if (this.gain && this.audioContext) {
        this.gain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.015);
      }

      setTimeout(() => {
        this._setPlaybackRate(silenceSpeed);
      }, 20);
    } else {
      this._setPlaybackRate(silenceSpeed);
    }
  }

  /**
   * Inspect the current sample of the media and speed up or down accordingly
   */
  async _inspectSample() {
    this.isInspectionRunning = true;

    // Make sure we are attached
    if (!this.isAttached) await this._attachToElement();

    this._samplePosition = (this._samplePosition + 1) % 50;

    const volume = this._calculateVolume();
    const useDynamicThreshold = this.config.get('dynamic_silence_threshold');

    if (useDynamicThreshold && volume > 0) {
      this.dynamicThresholdCalculator.previousSamples.push(volume);

      if (this._samplePosition === 0) {
        // Let the dynamic threshold calculator re-calculate the threshold
        // This is only done every 50 samples to reduce load
        this.dynamicThresholdCalculator.calculate();
      }
    }

    const threshold = useDynamicThreshold ? this.dynamicThresholdCalculator.threshold : this.config.get('silence_threshold');
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

    // Check if we should continue inspecting
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
      this._setPlaybackRate(1);

      this._sendCommand('volume', {
        data: 0
      });
    }
  }
}