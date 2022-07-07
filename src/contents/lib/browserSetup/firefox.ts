import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"

import debug from "../../../shared/debug"
import SilenceSkipper from "../../../shared/lib/SilenceSkipper"
import type { MediaElement } from "../../../shared/types"
import inspectMediaElements from "../inspectMediaElements"

export default function setupFirefoxContent(config: TabState) {
  inspectMediaElements((element: MediaElement) => {
    debug("Main: Attaching skipper to new element", element)

    browser.runtime.sendMessage({ command: "hasElement" })

    new SilenceSkipper(config, element)
  })
}
