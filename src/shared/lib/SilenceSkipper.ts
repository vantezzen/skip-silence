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
import { AnalyserType } from "~shared/state"; // Added import

export default class SilenceSkipper {
  config: TabState
  element?: MediaElement

  // State variables
  isDestroyed = false
  isAttached = false // This will be set true even for tabCapture once skipper is active
  isSpedUp = false
  samplesSinceLastVolumeMessage = 0 // May be reused for counting samples in processOffscreenVolume
  wasEnabled = false
  
  // Silence detection state (moved from SampleInspector)
  currentSamples = 0
  totalSamples = 0
  totalVolume = 0

  // Audio variables for non-tabCapture modes
  audioContext: AudioContext | undefined
  analyser: AnalyserNode | undefined
  gain: GainNode | undefined
  source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | undefined
  audioFrequencies: Float32Array | undefined
  // tabCaptureStream is now managed by offscreen document
  deviceMediaStream: MediaStream | null = null

  // Dependencies
  dynamicThresholdCalculator: DynamicThresholdCalculator
  speedController: SpeedController
  // sampleInspector: SampleInspector // Removed, logic merged into processOffscreenVolume for tabCapture

  /**
   * Add silence skipper to tab
   *
   * @param config Config Provider to use
   * @param mediaElement If provided the mediaelement to inspect - otherwise tabCapture will be used (handled by offscreen)
   */
  constructor(config: TabState, mediaElement?: MediaElement) {
    this.config = config
    this.element = mediaElement

    // Setup dependencies
    this.dynamicThresholdCalculator = new DynamicThresholdCalculator(config)
    this.speedController = new SpeedController(this)
    
    // SampleInspector is removed for tabCapture. Its logic is now in processOffscreenVolume.
    // If element or displayMedia analysis types are still used and need SampleInspector,
    // this will need to be handled, possibly by instantiating it conditionally.
    // For now, assuming tabCapture is the primary concern.

    // Attach our config listener
    this._onConfigUpdate = this._onConfigUpdate.bind(this)
    this.config.addListener("change", this._onConfigUpdate)

    // Initial update to setup current config
    this._onConfigUpdate("*")

    // For tabCapture, isAttached will be set to true by BackgroundManager after SilenceSkipper is created.
    // The actual audio stream is in the offscreen document.
    if (this.config.current.analyserType !== AnalyserType.tabCapture && this.element) {
      // TODO: Handle attachSkipper logic for element/displayMedia if it's not already covered
      // This might involve calling a method similar to the old attachSkipper from Utils.ts
      // For now, focusing on tabCapture changes.
    }
  }

  /**
   * Listener for config changes to update the settings
   */
  async _onConfigUpdate(key: string) {
    // Ignore updates by this context as it will cause an infinite loop
    if (key !== "*") return

    const { enabled, analyserType, silence_speed, playback_speed, media_speed, silence_threshold, samples_threshold, mute_silence, dynamic_silence_threshold } = this.config.current;

    if (enabled) {
      debug("SilenceSkipper: Config updated. Enabled:", enabled, "Type:", analyserType);
      if (analyserType === AnalyserType.tabCapture) {
        const targetSpeed = this.isSpedUp ? silence_speed : playback_speed;
        if (media_speed !== targetSpeed) {
          this.speedController.setPlaybackRate(targetSpeed);
        }
      } else {
        // Logic for MediaElement or displayMedia
        debug("SilenceSkipper: Updating non-tabCapture media config (element/displayMedia)");
        // If SampleInspector was used for these, its re-integration or replacement is needed here.
        // For now, this just updates speeds and gain if applicable.
        this.updateDirectMediaConfig(); 
      }
    } else if (this.wasEnabled) {
      debug("SilenceSkipper: Disabled. Returning to normal playback. Type:", analyserType);
      this.speedController.setPlaybackRate(1);
      if (analyserType === AnalyserType.tabCapture) {
        this.stopOffscreenCapture();
      }
    }

    this.wasEnabled = enabled;
  }
  
  /**
   * Processes volume data received from the offscreen document for tab capture.
   * This method now contains logic merged from SampleInspector.
   */
  public processOffscreenVolume(volume: number): void {
    if (this.isDestroyed || !this.config.current.enabled || this.config.current.analyserType !== AnalyserType.tabCapture) {
      return;
    }

    const { silence_threshold, samples_threshold, mute_silence, dynamic_silence_threshold, current_volume_threshold } = this.config.current;
    
    // Dynamic threshold calculation (merged from SampleInspector.addCurrentSampleToDynamicThreshold)
    // The original SampleInspector did this every 50 samples using _samplePosition.
    // Here, we can either count calls to processOffscreenVolume or use a similar time-based approach if needed.
    // For simplicity, let's call calculate on dynamicThresholdCalculator less frequently or manage its samples.
    // The current DynamicThresholdCalculator.addSample already handles sample storage and calculation logic.
    
    // Determine if the current sample is considered silent
    const isCurrentlySilent = volume < (dynamic_silence_threshold ? this.dynamicThresholdCalculator.getThreshold() : silence_threshold);
    
    // Update dynamic threshold calculator with the raw volume and whether it's considered silent by the fixed threshold
    // This might need adjustment based on how DynamicThresholdCalculator is intended to work.
    // Original SampleInspector called addCurrentSampleToDynamicThreshold(volume) -> which then called dynamicThresholdCalculator.previousSamples.push(volume)
    // and calculate() every 50 samples.
    // Let's simplify: addSample now takes the volume and if it was considered silent by the *fixed* threshold initially.
    // The dynamic calculator then uses this history to adjust its own threshold.
    if (dynamic_silence_threshold) {
      this.dynamicThresholdCalculator.addSample(volume, volume < silence_threshold); 
    }
    
    const effectiveThreshold = dynamic_silence_threshold
      ? this.dynamicThresholdCalculator.getThreshold()
      : silence_threshold;

    if (volume < effectiveThreshold) {
      this.currentSamples++;
    } else {
      this.currentSamples = 0;
    }

    // Logic from SampleInspector.updateSpeedBasedOnSampleResult
    if (this.currentSamples >= samples_threshold) {
      if (!this.isSpedUp) {
        this.isSpedUp = true;
        this.speedController.speedUp(); // Uses silence_speed from config
        if (mute_silence) {
          // Muting logic specific to tabCapture might need messaging offscreen if direct gain control is desired.
          // For now, SpeedController handles this if it sets volume to 0.
          debug("SilenceSkipper (tabCapture): Sped up, mute_silence active.");
        }
      }
    } else { // volume >= effectiveThreshold or currentSamples < samples_threshold
      if (this.isSpedUp) {
        this.isSpedUp = false;
        this.speedController.slowDown(); // Uses playback_speed from config
        debug("SilenceSkipper (tabCapture): Slowed down.");
      }
    }
    
    // Update TabState with the new volume for popup UI
    // This replaces _sendCommand("volume", { data: volume })
    if (this.config.set) {
      // Throttle state updates if volume updates are very frequent
      this.samplesSinceLastVolumeMessage++;
      if (this.samplesSinceLastVolumeMessage >= 3) { // Same throttling as original SampleInspector
        if (this.config.current.current_volume !== volume) { // Only update if changed
             this.config.set({ current_volume: volume, current_volume_threshold: effectiveThreshold });
        }
        this.samplesSinceLastVolumeMessage = 0;
      }
    }
  }

  private updateDirectMediaConfig() {
    // This method is for non-tabCapture types (element, displayMedia).
    // It needs to ensure that if SampleInspector is no longer used for these,
    // their audio processing and inspection loop is correctly handled.
    // For now, this method remains focused on speed and gain adjustments.
    // The actual sample inspection for these types would need a running loop,
    // previously managed by SampleInspector.inspectSample's setTimeout.
    if (this.config.current.analyserType === AnalyserType.tabCapture) return;

    debug("SilenceSkipper: updateDirectMediaConfig for non-tabCapture types.");
    // TODO: Re-evaluate how sample inspection is performed for element/displayMedia
    // if SampleInspector's main loop is removed. This might involve starting a
    // similar loop here or refactoring SampleInspector for these types.

    const playbackSpeed = this.config.current.playback_speed
    const silenceSpeed = this.config.current.silence_speed;
    const mediaSpeed = this.config.current.media_speed;

    if (this.isSpedUp && mediaSpeed !== silenceSpeed) {
      this.speedController.setPlaybackRate(silenceSpeed);
    } else if (!this.isSpedUp && mediaSpeed !== playbackSpeed) {
      this.speedController.setPlaybackRate(playbackSpeed);
    }

    // Update gain level for direct media
    const muteSilence = this.config.current.mute_silence;
    if (this.gain) { // Only if gain node exists (for non-tabCapture)
      if (muteSilence && this.isSpedUp) {
        this.gain.gain.value = 0;
      } else {
        this.gain.gain.value = 1;
      }
    }
  }

  /**
   * Send a command to the popup - This might be deprecated if popup relies on TabState.
   *
   * @param command Command to send
   * @param data Additional data to send (optional)
   */
  _sendCommand(command: String, data: Object = {}) {
    // Consider removing if popup updates are handled via TabState listeners
    // For now, keep it but be aware it might be removed.
    debug("SilenceSkipper: Sending command to popup:", command, data);
    browser.runtime.sendMessage({ command, target: "popup", ...data }).catch((e) => {
      // Errors are expected if the popup is not open
      // debug("Error sending command to popup:", e.message);
    });
  }
  
  private stopOffscreenCapture() {
    if (this.config.current.tabId) {
      debug(`SilenceSkipper: Requesting to stop offscreen capture for tab ${this.config.current.tabId}`);
      browser.runtime.sendMessage({
        target: 'offscreen', // Or 'service-worker' to route it
        command: 'stop-tab-capture',
        tabId: this.config.current.tabId
      }).catch(e => console.error("SilenceSkipper: Error sending stop-tab-capture message:", e));
    }
  }

  destroy() {
    debug(`SilenceSkipper: Destroying for tab ${this.config.current.tabId}, analyserType: ${this.config.current.analyserType}`);
    this.isDestroyed = true;

    if (this.config.current.analyserType === AnalyserType.tabCapture) {
      this.stopOffscreenCapture();
    } else {
      // Cleanup for non-tabCapture (element, displayMedia)
      this.analyser?.disconnect();
      this.source?.disconnect();
      this.gain?.disconnect();
      if (this.audioContext?.state !== "closed") {
        this.audioContext?.close().catch(e => console.error("Error closing AudioContext:", e));
      }
      this.deviceMediaStream?.getTracks().forEach((track) => track.stop());
    }
    
    this.config.removeListener("change", this._onConfigUpdate);
    // Restore playback rate to normal if it was modified
    if (this.config.current.enabled && this.speedController) {
       this.speedController.setPlaybackRate(1);
    }
  }
}
