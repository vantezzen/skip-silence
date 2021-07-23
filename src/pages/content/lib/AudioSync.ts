import ConfigProvider from "../../shared/configProvider";
import debug from '../../shared/debug';
import SilenceSkipper from './SilenceSkipper';

/**
 * Audio Synchronizer
 * This will help to keep Audio and Video in sync on Chromium based browsers
 * 
 * Related: https://github.com/vantezzen/skip-silence/issues/28
 */
export default class AudioSync {
  // Parent skipper
  skipper : SilenceSkipper;

  // Is the loop currently running
  isActive = false;

  /**
   * Set up the class
   * 
   * @param config Config to use
   */
  constructor(skipper : SilenceSkipper) {
    this.skipper = skipper;
    this.sync = this.sync.bind(this);

    this.skipper.config.onUpdate(() => {
      if (this.skipper.config.get('keep_audio_sync') && !this.isActive) {
        // Start the loop
        this.sync();
      }
    });

    this.sync();
  }

  /**
   * Synchronize the audio and video of the media element
   */
  private sync() {
    if (this.skipper.config.get('keep_audio_sync') && this.skipper.config.get('enabled')) {
      this.isActive = true;
      this.skipper.element.currentTime = this.skipper.element.currentTime;
      debug("AudioSync: Synced audio");

      setTimeout(this.sync, 5000);
    } else {
      debug('AudioSync: Stopping because option was disabled');

      this.isActive = false;
    }
  }
}