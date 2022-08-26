import browser from "webextension-polyfill"

import { AnalyserType, TabState } from "~shared/state"

import debug from "../../../shared/debug"
import SilenceSkipper from "../../../shared/lib/SilenceSkipper"
import type { MediaElement } from "../../../shared/types"
import inspectMediaElements from "../inspectMediaElements"

export default function setupOnPageSkipperContent(config: TabState) {
  const { analyserType } = config.current

  if (analyserType === AnalyserType.element) {
    inspectMediaElements((element: MediaElement) => {
      debug("Main: Attaching skipper to new element", element)

      browser.runtime.sendMessage({ command: "hasElement" })

      new SilenceSkipper(config, element)
    })
  } else {
    debug("Main: Using display media for capture")
    new SilenceSkipper(config)
  }
}
