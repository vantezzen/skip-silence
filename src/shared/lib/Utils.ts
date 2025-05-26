import debugging from "debug"
import browser from "webextension-polyfill"

import { supportsTabCapture } from "~shared/platform"
import { AnalyserType } from "~shared/state"

import createAudioContextSecure from "./AudioContext"
import type SilenceSkipper from "./SilenceSkipper"
import getDisplayCapture from "./displayCapture/getDisplayCapture"

const debug = debugging("skip-silence:contents:lib:Utils")

const getTabAudioCapture = (): Promise<MediaStream | null> => {
  return new Promise((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: false }, resolve)
  })
}

async function getAudioSource(skipper: SilenceSkipper) {
  const { analyserType } = skipper.config.current
  debug("Getting audio source for analyser type", analyserType)

  if (skipper.element && analyserType === AnalyserType.element) {
    debug("Creating audio source from element")
    return skipper.audioContext.createMediaElementSource(skipper.element)
  }
  if (analyserType === AnalyserType.tabCapture && supportsTabCapture) {
    debug("Requesting tab capture via offscreen document for tab", skipper.config.current.tabId);

    try {
      // Send a message to the background script to ensure the offscreen document is ready
      // and then to tell the offscreen document to start capture.
      const response = await browser.runtime.sendMessage({
        target: "service-worker", // Targeting the service worker (background script)
        command: "initiate-tab-capture",
        tabId: skipper.config.current.tabId,
      });

      if (response && response.success) {
        debug("Tab capture initiated successfully via offscreen document for tab", skipper.config.current.tabId);
        // The actual MediaStreamSource is now in the offscreen document.
        // This function will no longer return a source node for tabCapture.
        return null; 
      } else {
        console.error("Failed to initiate tab capture in offscreen document:", response?.error);
        throw new Error(response?.error || "Failed to initiate tab capture in offscreen document.");
      }
    } catch (error) {
      console.error("Error requesting tab capture initiation from service worker:", error);
      throw error;
    }
  }
  if (analyserType === AnalyserType.displayMedia) {
    debug("Creating audio source from display media")

    skipper.deviceMediaStream = await getDisplayCapture()
    if (!skipper.deviceMediaStream) {
      debug("No stream found")
      throw new Error("No stream found")
    }

    return skipper.audioContext.createMediaStreamSource(
      skipper.deviceMediaStream
    )
  }

  throw new Error("Unknown or unusable analyser type")
}

export async function attachSkipper(skipper: SilenceSkipper) {
  // We don't need to attach multiple times
  if (skipper.isAttached) return false;

  debug("Attaching skipper for analyser type:", skipper.config.current.analyserType);

  // For tabCapture, AudioContext and source are managed by the offscreen document.
  if (skipper.config.current.analyserType !== AnalyserType.tabCapture) {
    skipper.audioContext = await createAudioContextSecure();
    skipper.analyser = skipper.audioContext.createAnalyser();
    skipper.source = await getAudioSource(skipper); // This will be null for tabCapture if called, but shouldn't be
    skipper.gain = skipper.audioContext.createGain();

    if (skipper.source) { // Source will be null for tabCapture if logic flows here, handle defensively
        // Connect our components for non-tabCapture types
        // Source -> Analyser -> Gain -> Destination
        let nextNode = skipper.source.connect(skipper.analyser);
        if (skipper.config.current.analyserType !== AnalyserType.displayMedia) {
            nextNode.connect(skipper.audioContext.destination);
        }
        skipper.audioFrequencies = new Float32Array(skipper.analyser.fftSize);
    } else {
        debug("Source is null, likely tabCapture, or an error occurred for other types.");
    }
  } else {
    // For tabCapture, we still need an analyser node for receiving volume levels from offscreen.
    // However, this analyser won't be connected to a local source.
    // We'll need a mechanism to feed data into this analyser from offscreen messages.
    // OR, the offscreen document sends processed volume levels directly, and `processAudio` adapts.
    // For now, let's assume `processAudio` will be adapted to listen for messages if it's tabCapture.
    debug("Tab capture mode: Audio processing is handled by the offscreen document.");
    // No local audio context, source, or gain node setup here for tab capture.
    // The SilenceSkipper's processAudio will need to be adapted for tabCapture.
    // It might involve listening to messages from the offscreen document that contain volume levels.
    // For now, we just set isAttached to true.
  }

  skipper.isAttached = true;
  debug("Skipper attachment process complete for tab", skipper.config.current.tabId);
}
