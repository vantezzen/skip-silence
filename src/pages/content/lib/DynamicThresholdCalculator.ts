import ConfigProvider from "../../shared/configProvider";

/**
 * Dynamic Threshold Calculator:
 * Dynamically detect the volume level silence has
 * 
 * Related: https://github.com/vantezzen/skip-silence/issues/36
 */
export default class DynamicThresholdCalculator {
  // Current dynamic threshold
  threshold = 0;

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
    if(this.previousSamples.length > 20) {
      // Calculate the dynamic silence level
      // TODO: Implement a real algorithm
      const averageVolume = this.previousSamples.reduce((acc, val) => acc + val) / this.previousSamples.length;

      this.threshold = averageVolume * 0.3;
      this.config.set('silence_threshold', this.threshold);
    }
    
    // Make sure the samples array only contains 500 samples max
    while(this.previousSamples.length > 500) {
      this.previousSamples.shift();
    }
  }
}