import ConfigProvider from "../configProvider";
import debug from '../debug';

/**
 * Dynamic Threshold Calculator:
 * Dynamically detect the volume level silence has
 * 
 * Related: https://github.com/vantezzen/skip-silence/issues/36
 */
export default class DynamicThresholdCalculator {
  // Current dynamic threshold
  threshold = 10;

  // Extension configuration
  config : ConfigProvider;

  // Volume of the previous 500 samples to better calculate the threshold
  previousSamples : number[] = [];

  /**
   * Set up the calculator
   * 
   * @param config Config to use
   */
  constructor(config : ConfigProvider) {
    this.config = config;
  }

  /**
   * Let the calculator inspect a new sample.
   * This will be used to adjust the calculated threshold
   */
  calculate() {
    if (this.previousSamples.length < 20) {
      // Not enough data yet
      return;
    }

    const currentTreshold = this.threshold;
    const sortedSamples = this.previousSamples.sort((a, b) => a - b);
    const lowerLimit = sortedSamples[Math.floor(this.previousSamples.length * 0.15)];
    const delta = Math.abs(this.threshold - lowerLimit);

    if (lowerLimit > this.threshold) {
      this.threshold += delta * 0.1;
    } else if (lowerLimit < this.threshold) {
      // Threshold should decrease faster so we can better adapt to fast volume changes
      this.threshold -= delta * 0.4;
    }

    debug(`Threshold update:
Old: ${currentTreshold}
New: ${this.threshold}
Lower limit: ${lowerLimit}
Delta: ${delta}
Samples: ${this.previousSamples.length}
Min Sample: ${Math.min(...this.previousSamples)}
Max Sample: ${Math.max(...this.previousSamples)}`, sortedSamples);
    
    this.config.set('silence_threshold', this.threshold);

    // Make sure the samples array only contains 100 samples max
    while(this.previousSamples.length > 100) {
      this.previousSamples.shift();
    }
  }
}