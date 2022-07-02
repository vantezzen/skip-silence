import { browser } from 'webextension-polyfill-ts';
import ConfigProvider from '../../shared/configProvider';
import debug from '../../shared/debug';

import DynamicThresholdCalculator from './DynamicThresholdCalculator';
import SampleInspector from './SampleInspector';
import SpeedController from './SpeedController';

/**
 * Silence Skipper: This class is doing the job of actually inspecting media elements and
 * slowing them up or down
 */
export default class SilenceSkipper {
  config: ConfigProvider;

  // State variables
  isDestroyed = false;
  isAttached = false;
  isSpedUp = false;
  samplesSinceLastVolumeMessage = 0;

  // Audio variables
  audioContext: AudioContext | undefined;
  analyser: AnalyserNode | undefined;
  gain: GainNode | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  audioFrequencies: Float32Array | undefined;

  // Dependencies
  dynamicThresholdCalculator: DynamicThresholdCalculator;
  speedController: SpeedController;
  sampleInspector: SampleInspector;

  /**
   * Add silence skipper to tab
   *
   * @param mediaElement Element to attach to
   * @param config Config Provider to use
   */
  constructor(config: ConfigProvider) {
    this.config = config;

    // Setup dependencies
    this.dynamicThresholdCalculator = new DynamicThresholdCalculator(config);
    this.speedController = new SpeedController(this);
    this.sampleInspector = new SampleInspector(this);

    // Attach our config listener
    this._onConfigUpdate = this._onConfigUpdate.bind(this);
    this.config.onUpdate(this._onConfigUpdate);

    // Initial update to setup current config
    this._onConfigUpdate();
  }

  /**
   * Listener for config changes to update the settings
   */
  async _onConfigUpdate() {
    const isEnabled = this.config.get('enabled');

    if (isEnabled) {
      debug('SilenceSkipper: Updating direct media config');
      this.updateDirectMediaConfig();
    } else if (this.config.previousConfig.enabled) {
      debug('SilenceSkipper: Returning to normal playback');
      this.speedController.setPlaybackRate(1);
    }
  }

  private updateDirectMediaConfig() {
    if (!this.sampleInspector.isInspectionRunning) {
      debug('SilenceSkipper: Starting inspection for direct media element');
      this.sampleInspector.inspectSample();
    }

    // Update our speed to the new config speed
    const playbackSpeed = this.config.get('playback_speed');
    const silenceSpeed = this.config.get('silence_speed');
    if (this.isSpedUp) {
      this.speedController.setPlaybackRate(silenceSpeed);
    } else {
      this.speedController.setPlaybackRate(playbackSpeed);
    }

    // Update gain level
    const muteSilence = this.config.get('mute_silence');
    if (muteSilence && this.isSpedUp) {
      if (this.gain) {
        // Make sure our silence is muted
        this.gain.gain.value = 0;
      }
    } else if (this.gain) {
      // Make sure we are not muted
      this.gain.gain.value = 1;
    }
  }

  /**
   * Send a command to the popup
   *
   * @param command Command to send
   * @param data Additional data to send (optional)
   */
  _sendCommand(command: String, data: Object = {}) {
    browser.runtime.sendMessage({ command, ...data });
  }

  destroy() {
    this.isDestroyed = true;
    this.analyser?.disconnect();
    this.source?.disconnect();
    this.gain?.disconnect();
    this.audioContext?.close();
    this.config.removeOnUpdateListener(this._onConfigUpdate);
  }
}
