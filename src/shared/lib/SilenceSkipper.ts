import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"
import type { MediaElement } from "~shared/types"

import debug from "../debug"
import DynamicThresholdCalculator from "./DynamicThresholdCalculator"
import SampleInspector from "./SampleInspector"
import SpeedController from "./SpeedController"

/**
 * Silence Skipper: This class is doing the job of actually inspecting media elements and
 * slowing them up or down
 */
export default class SilenceSkipper {
  config: TabState
  element?: MediaElement

  // State variables
  isDestroyed = false
  isAttached = false
  isSpedUp = false
  samplesSinceLastVolumeMessage = 0
  wasEnabled = false

  // Audio variables
  audioContext: AudioContext | undefined
  analyser: AnalyserNode | undefined
  gain: GainNode | undefined
  source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | undefined
  audioFrequencies: Float32Array | undefined
  tabCaptureStream: MediaStream | null = null
  deviceMediaStream: MediaStream | null = null

  // Dependencies
  dynamicThresholdCalculator: DynamicThresholdCalculator
  speedController: SpeedController
  sampleInspector: SampleInspector

  /**
   * Add silence skipper to tab
   *
   * @param config Config Provider to use
   * @param mediaElement If provided the mediaelement to inspect - otherwise tabCapture will be used
   */
  constructor(config: TabState, mediaElement?: MediaElement) {
    this.config = config
    this.element = mediaElement

    // Setup dependencies
    this.dynamicThresholdCalculator = new DynamicThresholdCalculator(config)
    this.speedController = new SpeedController(this)
    this.sampleInspector = new SampleInspector(this)

    // Attach our config listener
    this._onConfigUpdate = this._onConfigUpdate.bind(this)
    this.config.addListener("change", this._onConfigUpdate)

    // Initial update to setup current config
    this._onConfigUpdate("*")
  }

  /**
   * Listener for config changes to update the settings
   */
  async _onConfigUpdate(key: string) {
    // Ignore updates by this context as it will cause an infinite loop
    if (key !== "*") return

    const isEnabled = this.config.current.enabled

    if (isEnabled) {
      debug("SilenceSkipper: Updating direct media config")
      this.updateDirectMediaConfig()
    } else if (this.wasEnabled) {
      debug("SilenceSkipper: Returning to normal playback")
      this.speedController.setPlaybackRate(1)
    }

    this.wasEnabled = isEnabled
  }

  private updateDirectMediaConfig() {
    if (!this.sampleInspector.isInspectionRunning) {
      debug("SilenceSkipper: Starting inspection for direct media element")
      this.sampleInspector.inspectSample()
    }

    // Update our speed to the new config speed
    const playbackSpeed = this.config.current.playback_speed
    const silenceSpeed = this.config.current.silence_speed
    const mediaSpeed = this.config.current.media_speed
    if (this.isSpedUp && mediaSpeed !== silenceSpeed) {
      this.speedController.setPlaybackRate(silenceSpeed)
    } else if (!this.isSpedUp && mediaSpeed !== playbackSpeed) {
      this.speedController.setPlaybackRate(playbackSpeed)
    }

    // Update gain level
    const muteSilence = this.config.current.mute_silence
    if (muteSilence && this.isSpedUp) {
      if (this.gain) {
        // Make sure our silence is muted
        this.gain.gain.value = 0
      }
    } else if (this.gain) {
      // Make sure we are not muted
      this.gain.gain.value = 1
    }
  }

  /**
   * Send a command to the popup
   *
   * @param command Command to send
   * @param data Additional data to send (optional)
   */
  _sendCommand(command: String, data: Object = {}) {
    browser.runtime.sendMessage({ command, ...data }).catch(() => {})
  }

  destroy() {
    this.isDestroyed = true
    this.analyser?.disconnect()
    this.source?.disconnect()
    this.gain?.disconnect()
    this.audioContext?.close()
    this.config.removeListener("change", this._onConfigUpdate)
    this.tabCaptureStream?.getTracks().forEach((track) => track.stop())
    this.deviceMediaStream?.getTracks().forEach((track) => track.stop())
  }
}
