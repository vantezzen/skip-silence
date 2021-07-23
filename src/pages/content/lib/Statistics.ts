import ConfigProvider from "../../shared/configProvider";
import debug from '../../shared/debug';
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

  /**
   * Set up the class
   * 
   * @param config Config to use
   */
  constructor(skipper : SilenceSkipper) {
    this.skipper = skipper;
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
    const savedTime = normalTime - silenceTime;

    debug(`Statistics: Saved ${savedTime}ms (Normal: ${normalTime}ms at ${normalSpeed}x, sped up ${silenceTime}ms at ${silenceSpeed}x; Total ${skipTime}ms)`);

    if (savedTime > 0) {
      this.skipper.config.set("saved_time", this.skipper.config.get("saved_time") + savedTime);
    }
  }
}