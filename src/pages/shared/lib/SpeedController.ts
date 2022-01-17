import ConfigProvider from "../configProvider";
import debug from '../debug';
import SilenceSkipper from './SilenceSkipper';

/**
 * Speed Controller
 * Controls speeding up and down the media element
 */
export default class SpeedController {
  // Parent skipper
  skipper : SilenceSkipper;

  _handlingRateChangeError = false;
  _blockRateChangeEvents = false;
  _rateChangeListenerAdded = false;
  _targetPlaybackRate = 0;

  /**
   * Set up the class
   * 
   * @param config Config to use
   */
  constructor(skipper : SilenceSkipper) {
    this.skipper = skipper;
  }

  /**
   * Fixes issues changing the playback rate by temporarily blocking `ratechange` event listeners.
   */
   _handlePlaybackRateChangeError() {
    this._handlingRateChangeError = true;
    // If the playback rate was set to zero by the website, it's probably because the video is not 
    // loaded and can no longer be played, and so shouldn't be tampered with.
    if (this.skipper.element.playbackRate !== 0) {
      // Prevent ratechange event listeners from running while we forcibly change playback rate
      this._blockRateChangeEvents = true;

      if (!this._rateChangeListenerAdded) {
        // Passing in `true` for the third parameter causes the event to be captured on the way down.
        this.skipper.element.addEventListener('ratechange', (event: Event) => {
          if (this._blockRateChangeEvents) {
            // Ensure the event never reaches its listeners
            event.stopImmediatePropagation();
          } else {
            // If the playback rate changes from 0 back to the default rate (usually 1) and that's
            // not what we want it to be, update it.
            if (
              this.skipper.element.playbackRate !== 0
              && this.skipper.element.playbackRate === this.skipper.element.defaultPlaybackRate
              && this.skipper.element.playbackRate !== this._targetPlaybackRate
            ) {
              this.setPlaybackRate(this._targetPlaybackRate);
            }
          }
        }, true);
        this._rateChangeListenerAdded = true;
      }

      setTimeout(() => {
        // Now try setting the rate again
        this.skipper.element.playbackRate = this._targetPlaybackRate;
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
   setPlaybackRate(rate: number) {
    this._targetPlaybackRate = rate;

    if (rate === 1) {
      // Setting the speed to exactly 1 will cause audio clicking
      // Setting the speed to slightly greater than 1 will prevent this from happening
      // Related: https://github.com/vantezzen/skip-silence/issues/52
      this._targetPlaybackRate = 1.01;
    }

    this.skipper.element.playbackRate = this._targetPlaybackRate;
    // TODO: Send background element speed
    if (!this._handlingRateChangeError) {
      // Make sure that the playback rate actually changed
      setTimeout(() => {
        const failedToChangeRate = this.skipper.element.playbackRate !== this._targetPlaybackRate;
        if (failedToChangeRate) {
          // If it didn't, try to forcibly change it
          this._handlePlaybackRateChangeError();
        }
      }, 1);
    }
  }

  /**
   * Slow the video down to playback speed
   */
  slowDown() {
    const playbackSpeed = this.skipper.config.get('playback_speed');

    this.skipper.isSpedUp = false;
    this.skipper.sampleInspector.samplesUnderThreshold = 0;

    this.skipper._sendCommand('slowDown');
    this.skipper.statistics.onSkipEnd();
    this.setPlaybackRate(playbackSpeed);

    if(this.skipper.config.get("mute_silence")) {
      // Slowly remove our mute
      // If we do this immediately, we may cause a "clicking" noise
      // Source: http://alemangui.github.io/ramp-to-value
      if (this.skipper.gain && this.skipper.audioContext) {
        this.skipper.gain.gain.setTargetAtTime(1, this.skipper.audioContext.currentTime, 0.04);
      }
    }
  }

  /**
   * Speed the video up to silence speed
   */
  speedUp() {
    const silenceSpeed = this.skipper.config.get('silence_speed');

    this.skipper._sendCommand('speedUp');
    this.skipper.statistics.onSkipStart();
    this.skipper.isSpedUp = true;

    if (this.skipper.config.get("mute_silence")) {
      // Get the audio muted before we speed up the video
      // This will help remove the "clicking" sound when speeding up with remaining audio
      if (this.skipper.gain && this.skipper.audioContext) {
        this.skipper.gain.gain.setTargetAtTime(0, this.skipper.audioContext.currentTime, 0.015);
      }

      setTimeout(() => {
        this.setPlaybackRate(silenceSpeed);
      }, 20);
    } else {
      this.setPlaybackRate(silenceSpeed);
    }
  }
}