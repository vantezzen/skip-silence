import debug from '../debug';
import createAudioContextSecure from './AudioContext';
import SilenceSkipper from './SilenceSkipper';

/**
 * Attach the element to a skipper.
 * This is only needed when we are actually skipping silent parts as we are using excess resources
 * otherwise - this is why this step is not done in the constructor
 */
export async function attachSkipperToElement(skipper: SilenceSkipper) {
  // We don't need to attach multiple times
  if (skipper.isAttached) return false;

  skipper.audioContext = await createAudioContextSecure();

  // Create our audio components
  skipper.analyser = skipper.audioContext.createAnalyser();
  skipper.source = skipper.audioContext.createMediaElementSource(skipper.preloadElement || skipper.element);
  skipper.gain = skipper.audioContext.createGain();

  // Connect our components
  // Source -> Analyser -> Gain -> Destination
  let nextNode = skipper.source
    .connect(skipper.analyser)
    .connect(skipper.gain);

  if (skipper.preloadElement) {
    const muteGain = skipper.audioContext.createGain();
    skipper.gain.connect(muteGain);
    muteGain.gain.value = 0;

    nextNode = muteGain;
  }
  nextNode.connect(skipper.audioContext.destination);
  
  skipper.audioFrequencies = new Float32Array(skipper.analyser.fftSize);

  skipper.isAttached = true;
}