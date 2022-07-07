import browser from "webextension-polyfill"

import debug from "../debug"
import createAudioContextSecure from "./AudioContext"
import type SilenceSkipper from "./SilenceSkipper"

const getTabAudioCapture = (): Promise<MediaStream | null> => {
  return new Promise((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: false }, resolve)
  })
}

export async function attachSkipper(skipper: SilenceSkipper) {
  // We don't need to attach multiple times
  if (skipper.isAttached) return false

  skipper.audioContext = await createAudioContextSecure()

  // Create our audio components
  skipper.analyser = skipper.audioContext.createAnalyser()

  if (skipper.element) {
    skipper.source = skipper.audioContext.createMediaElementSource(
      skipper.element
    )
  } else {
    skipper.tabCaptureStream = await getTabAudioCapture()
    if (!skipper.tabCaptureStream) {
      debug("No stream found")
      return false
    }

    skipper.source = skipper.audioContext.createMediaStreamSource(
      skipper.tabCaptureStream
    )
  }
  skipper.gain = skipper.audioContext.createGain()

  // Connect our components
  // Source -> Analyser -> Gain -> Destination
  let nextNode = skipper.source.connect(skipper.analyser).connect(skipper.gain)
  nextNode.connect(skipper.audioContext.destination)

  skipper.audioFrequencies = new Float32Array(skipper.analyser.fftSize)

  skipper.isAttached = true

  debug("Attached to tab")
}
