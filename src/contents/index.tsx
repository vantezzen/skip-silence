/**
 * Content Script
 * This script will be loaded into all pages
 */
import type { PlasmoContentScript } from "plasmo"
import browser from "webextension-polyfill"

import ConfigProvider from "../shared/configProvider"
import { isChromium } from "../shared/platform"
import setupFirefoxContent from "./lib/browserSetup/firefox"
import setupBrowserContent from "./lib/browserSetup/shared"
import Bar from "./lib/command-bar/Bar"
import "./lib/content.styles.css"
import setupKeyboardShortcuts from "./lib/keyboardShortcuts"

export const config: PlasmoContentScript = {
  matches: ["<all_urls>"],
  all_frames: true
}

const configProvider = new ConfigProvider("content")

setupBrowserContent(configProvider)
if (!isChromium) {
  setupFirefoxContent(configProvider)
}

setupKeyboardShortcuts(configProvider)

browser.runtime.sendMessage({ command: "request-activation" })
export default () => {
  const config = configProvider
  console.log("Content script loaded", config)
  return <Bar config={config} />
}
