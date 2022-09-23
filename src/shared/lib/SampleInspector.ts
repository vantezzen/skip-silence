import debug from "../debug"
import type SilenceSkipper from "./SilenceSkipper"
import { attachSkipper } from "./Utils"

/**
 * Sample Inspector: Inspect individual samples of the media and determine if the media should be sped up or slowed down
 */
export default class SampleInspector {
  // Parent skipper
  skipper: SilenceSkipper

  samplesUnderThreshold = 0
  isInspectionRunning = false
  _samplePosition = 0 // This will count up to 50, then and reset to 0
  _lastSentVolumeInfo = 0

  /**
   * Set up the class
   *
   * @param config Config to use
   */
  constructor(skipper: SilenceSkipper) {
    this.skipper = skipper
  }

  /**
   * Calculate the current volume of the media
   */
  calculateVolume() {
    if (!this.skipper.analyser || !this.skipper.audioFrequencies) {
      debug("SilenceSkipper: Can't calculate volume as we are not attached")
      return 100
    }

    this.skipper.analyser.getFloatTimeDomainData(this.skipper.audioFrequencies)

    // Compute volume via peak instantaneous power over the interval
    let peakInstantaneousPower = 0
    for (let i = 0; i < this.skipper.audioFrequencies.length; i++) {
      const power = this.skipper.audioFrequencies[i]
      peakInstantaneousPower = Math.max(power, peakInstantaneousPower)
    }
    const volume = 500 * peakInstantaneousPower

    return volume
  }

  /**
   * Inspect the current sample of the media and speed up or down accordingly
   */
  async inspectSample() {
    this.isInspectionRunning = true

    // Make sure we are attached
    if (!this.skipper.isAttached) await attachSkipper(this.skipper)

    this._samplePosition = (this._samplePosition + 1) % 50

    const volume = this.calculateVolume()
    const useDynamicThreshold =
      this.skipper.config.current.dynamic_silence_threshold

    if (useDynamicThreshold && volume > 0) {
      this.addCurrentSampleToDynamicThreshold(volume)
    }

    const threshold = useDynamicThreshold
      ? this.skipper.dynamicThresholdCalculator.threshold
      : this.skipper.config.current.silence_threshold
    const sampleThreshold = this.skipper.config.current.samples_threshold

    this.updateSpeedBasedOnSampleResult(volume, threshold, sampleThreshold)
    this.sendVolumeInfoToPopup(volume)
    this.prepareNextInspection()
  }

  private prepareNextInspection() {
    if (this.skipper.config.current.enabled && !this.skipper.isDestroyed) {
      setTimeout(() => this.inspectSample(), 25)
    } else {
      this.stopInspection()
    }
  }

  private stopInspection() {
    this.isInspectionRunning = false

    // Make sure the video is back to normal speed
    if (this.skipper.isSpedUp) {
      this.skipper.isSpedUp = false
      this.samplesUnderThreshold = 0
    }
    this.skipper._sendCommand("slowDown")
    this.skipper.speedController.setPlaybackRate(1)

    this.skipper._sendCommand("volume", {
      data: 0
    })
  }

  private sendVolumeInfoToPopup(volume: number) {
    this.skipper.samplesSinceLastVolumeMessage++
    if (this.skipper.samplesSinceLastVolumeMessage >= 3) {
      if (this._lastSentVolumeInfo !== volume) {
        debug("SampleInspector: Sending volume information to popup")
        try {
          this.skipper._sendCommand("volume", {
            data: volume
          })
        } catch (e) {}

        this._lastSentVolumeInfo = volume
      }
      this.skipper.samplesSinceLastVolumeMessage = 0
    }
  }

  private updateSpeedBasedOnSampleResult(
    volume: number,
    threshold: any,
    sampleThreshold: any
  ) {
    if (volume < threshold && !this.skipper.isSpedUp) {
      // We are below our threshold and should possibly slow down
      this.samplesUnderThreshold += 1

      if (this.samplesUnderThreshold >= sampleThreshold) {
        // We are over our sample threshold and should speed up!
        this.skipper.speedController.speedUp()
      }
    } else if (volume > threshold && this.skipper.isSpedUp) {
      // Slow back down as we are now in a loud part again
      this.skipper.speedController.slowDown()
    }
  }

  private addCurrentSampleToDynamicThreshold(volume: number) {
    this.skipper.dynamicThresholdCalculator.previousSamples.push(volume)

    if (this._samplePosition === 0) {
      // Let the dynamic threshold calculator re-calculate the threshold
      // This is only done every 50 samples to reduce load
      this.skipper.dynamicThresholdCalculator.calculate()
    }
  }
}
