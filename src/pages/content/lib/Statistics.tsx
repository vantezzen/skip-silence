import React from 'react';
import { render as RenderReact } from 'react-dom';

import debug from '../../shared/debug';
import TimeSavedInfo from '../timeSavedInfo';
import SilenceSkipper from './SilenceSkipper';

/**
 * Statistics
 * This will create statistics about saved time from using Skip Silence
 * 
 * Related: https://github.com/vantezzen/skip-silence/issues/73
 */
export default class Statistics {
  // Parent skipper
  skipper : SilenceSkipper;

  // Time when the skip started
  private skipStart = -1;

  // Milliseconds saved during this media alone
  private timeSavedThisMedia = 0;

  /**
   * Set up the class
   * 
   * @param config Config to use
   */
  constructor(skipper : SilenceSkipper) {
    this.skipper = skipper;

    this.onMediaEnd = this.onMediaEnd.bind(this);
    this.skipper.element.addEventListener('ended', this.onMediaEnd);
  }

  /**
   * Inform the class that we started skipping
   */
  onSkipStart() {
    this.skipStart = performance.now();
  }

  /**
   * Inform the class that we stopped skipping
   * This will calculate how much time has been saved
   */
  onSkipEnd() {
    if (this.skipStart < 0) {
      debug("Statistics: Skip did not start");
      return;
    }

    const skipTime = performance.now() - this.skipStart;
    this.skipStart = -1;

    const normalSpeed = this.skipper.config.get("playback_speed");
    const silenceSpeed = this.skipper.config.get("silence_speed");

    const normalTime = (1 / normalSpeed) * skipTime;
    const silenceTime = (1 / silenceSpeed) * skipTime;
    const savedTime = skipTime - silenceTime;

    debug(`Statistics: Saved ${savedTime}ms (Normal: ${normalTime}ms at ${normalSpeed}x, sped up ${silenceTime}ms at ${silenceSpeed}x; Total ${skipTime}ms)`);

    if (savedTime > 0) {
      this.skipper.config.set("saved_time", this.skipper.config.get("saved_time") + savedTime);
      this.timeSavedThisMedia += savedTime;
    }
  }

  /**
   * Handle the media ending to display the saved time in that media alone
   */
  private onMediaEnd() {
    // Make sure last skip is recorded
    if (this.skipStart > 0) {
      this.onSkipEnd();
    }

    if (this.timeSavedThisMedia >= 1000 && this.skipper.config.get('show_saved_time_info')) {
      debug('Statistics: Time was saved this video');

      const mediaId ='skip-silence-info-bar-' + Math.floor(Math.random() * 10000);

      const containerElement = window.document.createElement('div');
      containerElement.id = mediaId;
      window.document.body.appendChild(containerElement);

      RenderReact(<TimeSavedInfo timeSaved={this.timeSavedThisMedia} />, containerElement);

      this.timeSavedThisMedia = 0;

      // Automatically remove the element after the message has been shown
      setTimeout(() => {
        document.getElementById(mediaId)?.remove();
      }, 6000);
    }
  }
}