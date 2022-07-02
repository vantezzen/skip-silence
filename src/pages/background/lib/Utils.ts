import { browser } from 'webextension-polyfill-ts';
import debug from '../../shared/debug';

import createAudioContextSecure from './AudioContext';
import type SilenceSkipper from './SilenceSkipper';

const getTabAudioCapture = (tabId: number): Promise<MediaStream | null> => {
  // TODO: Use tabId instead of current tab only
  return new Promise((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: false }, resolve);
  });
};

export async function attachSkipperToTab(skipper: SilenceSkipper) {
  // We don't need to attach multiple times
  if (skipper.isAttached) return false;

  skipper.audioContext = await createAudioContextSecure();

  // Create our audio components
  skipper.analyser = skipper.audioContext.createAnalyser();

  const stream = await getTabAudioCapture(skipper.config.tabId);
  if (!stream) {
    debug('No stream found');
    return false;
  }

  skipper.source = skipper.audioContext.createMediaStreamSource(stream);
  skipper.gain = skipper.audioContext.createGain();

  // Connect our components
  // Source -> Analyser -> Gain -> Destination
  let nextNode = skipper.source.connect(skipper.analyser).connect(skipper.gain);
  nextNode.connect(skipper.audioContext.destination);

  skipper.audioFrequencies = new Float32Array(skipper.analyser.fftSize);

  skipper.isAttached = true;

  debug('Attached to tab');
}