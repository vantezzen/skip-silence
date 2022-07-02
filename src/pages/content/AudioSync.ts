import type ConfigProvider from '../shared/configProvider';
import type { MediaElement } from '../shared/types';
import debug from '../shared/debug';

/**
 * Audio Synchronizer
 * This will help to keep Audio and Video in sync on Chromium based browsers
 *
 * Related: https://github.com/vantezzen/skip-silence/issues/28
 */
export default class AudioSync {
  // Is the loop currently running
  isActive = false;

  private config: ConfigProvider;

  /**
   * Set up the class
   *
   * @param config Config to use
   */
  constructor(config: ConfigProvider) {
    this.config = config;
    this.sync = this.sync.bind(this);

    this.config.onUpdate(() => {
      if (this.config.get('keep_audio_sync') && !this.isActive) {
        // Start the loop
        this.sync();
      }
    });

    this.sync();
  }

  private resetAllElements() {
    const mediaElements = document.querySelectorAll(
      'video, audio'
    ) as NodeListOf<MediaElement>;
    for (const mediaElement of [...mediaElements]) {
      if (!mediaElement.paused) {
        mediaElement.currentTime = mediaElement.currentTime;
      }
    }
  }

  /**
   * Synchronize the audio and video of the media element
   */
  private sync() {
    if (this.config.get('keep_audio_sync') && this.config.get('enabled')) {
      this.isActive = true;
      this.resetAllElements();
      debug('AudioSync: Synced audio');

      setTimeout(this.sync, 30000);
    } else {
      debug('AudioSync: Stopping because option was disabled');

      this.isActive = false;
    }
  }
}
