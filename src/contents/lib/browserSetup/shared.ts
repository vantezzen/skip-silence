import debugging from "debug"

import type ConfigProvider from "~shared/configProvider"

import AudioSync from "../AudioSync"
import SpeedController from "../SpeedController"

const debug = debugging("skip-silence:contents:lib:browserSetup:firefox")

export default function setupBrowserContent(config: ConfigProvider) {
  const speedController = new SpeedController()
  new AudioSync(config)
  let mediaSpeed = 1

  config.onUpdate(() => {
    const shouldBeMediaSpeed = config.get("media_speed")

    if (shouldBeMediaSpeed !== mediaSpeed) {
      mediaSpeed = shouldBeMediaSpeed

      debug("Media speed changed to", mediaSpeed)
      speedController.setPlaybackRate(config.get("media_speed"))
    }
  })
}
