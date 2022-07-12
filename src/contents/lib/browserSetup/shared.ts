import debugging from "debug"

import type { TabState } from "~shared/state"

import AudioSync from "../AudioSync"
import SpeedController from "../SpeedController"

const debug = debugging("skip-silence:contents:lib:browserSetup:firefox")

export default function setupBrowserContent(config: TabState) {
  const speedController = new SpeedController()
  new AudioSync(config)
  let mediaSpeed = 1

  config.addListener("change", () => {
    debug(
      `Config changed, current speed is ${mediaSpeed}, should be ${config.current.media_speed}`
    )
    const shouldBeMediaSpeed = config.current.media_speed

    if (shouldBeMediaSpeed !== mediaSpeed) {
      mediaSpeed = shouldBeMediaSpeed

      debug("Media speed changed to", mediaSpeed)
      speedController.setPlaybackRate(config.current.media_speed)
    }
  })
}
