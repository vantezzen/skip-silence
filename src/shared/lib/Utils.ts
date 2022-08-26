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
    debug("Creating audio source from tab capture")

    skipper.tabCaptureStream = await getTabAudioCapture()
    if (!skipper.tabCaptureStream) {
      debug("No stream found")
      throw new Error("No stream found")
    }

    return skipper.audioContext.createMediaStreamSource(
      skipper.tabCaptureStream
    )
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
  if (skipper.isAttached) return false

  debug("Attaching skipper")

  skipper.audioContext = await createAudioContextSecure()

  // Create our audio components
  skipper.analyser = skipper.audioContext.createAnalyser()

  skipper.source = await getAudioSource(skipper)
  skipper.gain = skipper.audioContext.createGain()

  // Connect our components
  // Source -> Analyser -> Gain -> Destination
  let nextNode = skipper.source.connect(skipper.analyser)
  if (skipper.config.current.analyserType !== AnalyserType.displayMedia) {
    nextNode.connect(skipper.audioContext.destination)
  }

  skipper.audioFrequencies = new Float32Array(skipper.analyser.fftSize)

  skipper.isAttached = true

  debug("Attached to tab")
}
