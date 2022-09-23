import debug from "../debug"
import type SilenceSkipper from "./SilenceSkipper"

/**
 * Speed Controller
 * Controls speeding up and down the media element
 */
export default class SpeedController {
  // Parent skipper
  skipper: SilenceSkipper

  /**
   * Set up the class
   *
   * @param config Config to use
   */
  constructor(skipper: SilenceSkipper) {
    this.skipper = skipper
  }

  /**
   * Attempts to change the video playback rate
   */
  setPlaybackRate(rate: number) {
    debug(`SilenceSkipper: Setting playback rate to ${rate}`)
    this.skipper.config.current.media_speed = rate
  }

  /**
   * Slow the video down to playback speed
   */
  slowDown() {
    const playbackSpeed = this.skipper.config.current.playback_speed

    this.skipper.isSpedUp = false
    this.skipper.sampleInspector.samplesUnderThreshold = 0

    this.skipper._sendCommand("slowDown")
    this.setPlaybackRate(playbackSpeed)

    if (this.skipper.config.current.mute_silence) {
      // Slowly remove our mute
      // If we do this immediately, we may cause a "clicking" noise
      // Source: http://alemangui.github.io/ramp-to-value
      if (this.skipper.gain && this.skipper.audioContext) {
        this.skipper.gain.gain.setTargetAtTime(
          1,
          this.skipper.audioContext.currentTime,
          0.04
        )
      }
    }
  }

  /**
   * Speed the video up to silence speed
   */
  speedUp() {
    const silenceSpeed = this.skipper.config.current.silence_speed

    this.skipper._sendCommand("speedUp")
    this.skipper.isSpedUp = true

    if (this.skipper.config.current.mute_silence) {
      // Get the audio muted before we speed up the video
      // This will help remove the "clicking" sound when speeding up with remaining audio
      if (this.skipper.gain && this.skipper.audioContext) {
        this.skipper.gain.gain.setTargetAtTime(
          0,
          this.skipper.audioContext.currentTime,
          0.015
        )
      }

      setTimeout(() => {
        this.setPlaybackRate(silenceSpeed)
      }, 20)
    } else {
      this.setPlaybackRate(silenceSpeed)
    }
  }
}
