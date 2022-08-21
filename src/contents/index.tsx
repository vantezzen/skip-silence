/**
 * Content Script
 * This script will be loaded into all pages
 */
import { StateEnvironment } from "@vantezzen/plasmo-state"
import cssText from "data-text:./lib/content.styles.css"
import debugging from "debug"
import type { PlasmoContentScript } from "plasmo"
import browser from "webextension-polyfill"

import getState from "~shared/state"

import { supportsTabCapture } from "../shared/platform"
import setupFirefoxContent from "./lib/browserSetup/firefox"
import setupBrowserContent from "./lib/browserSetup/shared"
import Bar from "./lib/command-bar/Bar"
import "./lib/content.styles.css"
import setupKeyboardShortcuts from "./lib/keyboardShortcuts"

const debug = debugging("skip-silence:contents:index")

export const config: PlasmoContentScript = {
  matches: ["<all_urls>"],
  all_frames: true
}

const state = getState(StateEnvironment.Content)

setupBrowserContent(state)
if (!supportsTabCapture) {
  debug("Doesn't support tabCapture")
  setupFirefoxContent(state)
}

setupKeyboardShortcuts(state)

browser.runtime.sendMessage({ command: "request-activation" })
export default () => {
  const config = state
  return <Bar config={config} />
}
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}
