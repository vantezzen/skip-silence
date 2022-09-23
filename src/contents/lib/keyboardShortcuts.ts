import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"

import speedSettings from "../../shared/speedSettings"

export default function setupKeyboardShortcuts(config: TabState) {
  browser.runtime.onMessage.addListener((msg) => {
    if (!msg.command) return

    if (msg.command === "shortcut") {
      const { name } = msg

      if (name === "toggle-enable") {
        config.current.enabled = !config.current.enabled
      } else if (
        name === "increase-playback-speed" ||
        name === "decrease-playback-speed"
      ) {
        // Find out index of the current speed setting
        const currentSpeed = config.current.playback_speed
        const currentSpeedIndex =
          speedSettings.findIndex((speed) => currentSpeed === speed) || 2

        // Increase or decrease the speed
        const newSpeedIndex =
          name === "increase-playback-speed"
            ? currentSpeedIndex + 1
            : currentSpeedIndex - 1
        const newSpeed = speedSettings[newSpeedIndex] || currentSpeed

        // Update our speed
        config.current.playback_speed = newSpeed
      } else if (name === "toggle-command-bar") {
        config.current.is_bar_collapsed = !config.current.is_bar_collapsed
      }
    } else if (msg.command === "reload") {
      window.location.reload()
    }
  })
}
