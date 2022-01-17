import ConfigProvider from "../configProvider";
import debug from '../debug';
import SilenceSkipper from './SilenceSkipper';
import { attachSkipperToElement } from "./Utils";

/**
 * Sample Inspector: Inspect individual samples of the media and determine if the media should be sped up or slowed down
 */
export default class SampleInspector {
  // Parent skipper
  skipper : SilenceSkipper;

  samplesUnderThreshold = 0;
  isInspectionRunning = false;
  _samplePosition = 0; // This will count up to 50, then and reset to 0

  /**
   * Set up the class
   * 
   * @param config Config to use
   */
  constructor(skipper : SilenceSkipper) {
    this.skipper = skipper;
  }

  /**
   * Calculate the current volume of the media
   */
   calculateVolume() {
    if (!this.skipper.analyser || !this.skipper.audioFrequencies) {
      debug("SilenceSkipper: Can't calculate volume as we are not attached");
      return 100;
    }

    this.skipper.analyser.getFloatTimeDomainData(this.skipper.audioFrequencies);

    // Compute volume via peak instantaneous power over the interval
    let peakInstantaneousPower = 0;
    for (let i = 0; i < this.skipper.audioFrequencies.length; i++) {
      const power = this.skipper.audioFrequencies[i];
      peakInstantaneousPower = Math.max(power, peakInstantaneousPower);
    }
    const volume = (500 * peakInstantaneousPower);

    return volume;
  }

  /**
   * Inspect the current sample of the media and speed up or down accordingly
   */
   async inspectSample() {
    this.isInspectionRunning = true;

    // Make sure we are attached
    if (!this.skipper.isAttached) await attachSkipperToElement(this.skipper);

    this._samplePosition = (this._samplePosition + 1) % 50;

    const volume = this.calculateVolume();
    const useDynamicThreshold = this.skipper.config.get('dynamic_silence_threshold');

    if (useDynamicThreshold && volume > 0) {
      this.skipper.dynamicThresholdCalculator.previousSamples.push(volume);

      if (this._samplePosition === 0) {
        // Let the dynamic threshold calculator re-calculate the threshold
        // This is only done every 50 samples to reduce load
        this.skipper.dynamicThresholdCalculator.calculate();
      }
    }

    const threshold = useDynamicThreshold ? this.skipper.dynamicThresholdCalculator.threshold : this.skipper.config.get('silence_threshold');
    const sampleThreshold = this.skipper.config.get('samples_threshold');

    if (volume < threshold && !this.skipper.element.paused && !this.skipper.isSpedUp) {
      // We are below our threshold and should possibly slow down
      this.samplesUnderThreshold += 1;

      if (this.samplesUnderThreshold >= sampleThreshold) {
        // We are over our sample threshold and should speed up!
        this.skipper.speedController.speedUp();
      }
    } else if (volume > threshold && this.skipper.isSpedUp) {
      // Slow back down as we are now in a loud part again
      this.skipper.speedController.slowDown();
    }

    // Send our volume information to the popup
    this.skipper.samplesSinceLastVolumeMessage++;
    if (this.skipper.samplesSinceLastVolumeMessage >= 2) {
      this.skipper._sendCommand('volume', {
        data: volume
      });
      this.skipper.samplesSinceLastVolumeMessage = 0;
    }

    // Check if we should continue inspecting
    if (this.skipper.config.get('enabled')) {
      // Continue inspecting the next sample
      setTimeout(() => this.inspectSample(), 25);
    } else {
      // Stop inspecting
      this.isInspectionRunning = false;

      // Make sure the video is back to normal speed
      if (this.skipper.isSpedUp) {
        this.skipper.isSpedUp = false;
        this.samplesUnderThreshold = 0;
      }
      this.skipper._sendCommand('slowDown');
      this.skipper.speedController.setPlaybackRate(1);

      this.skipper._sendCommand('volume', {
        data: 0
      });
    }
  }
}