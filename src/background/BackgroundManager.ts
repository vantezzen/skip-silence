import { StateEnvironment } from "@vantezzen/plasmo-state"
import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"
import getState from "~shared/state"

import debug from "../shared/debug"
import SilenceSkipper from "../shared/lib/SilenceSkipper"

export type BackgroundTabReference = {
  tabId: number
  state: TabState
  silenceSkipper?: SilenceSkipper
}

export default class BackgroundManager {
  private tabReferences: {
    [tabId: number]: BackgroundTabReference | undefined
  } = {}

  constructor() {
    this.attachToTabsRequestingActivation()
    this.provideTabIdApi()
  }

  private provideTabIdApi() {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.command === "get-tab-id") {
        return Promise.resolve(sender.tab?.id)
      }
    })
  }

  private attachToTabsRequestingActivation() {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.command === "request-activation") {
        this.attachToTab(sender.tab!.id!)
      }
    })
  }

  private attachToTab(tabId: number) {
    if (this.tabReferences[tabId]) {
      debug(`Already attached to tab ${tabId}`)
      return
    }

    // this.enableBrowserActionForTab(tabId)
    this.setupTabReferenceForTabId(tabId)
    this.listenForTabRemovedEvent(tabId)
  }

  private listenForTabRemovedEvent(tabId: number) {
    const tabRemovedListener = (removedTabId: number) => {
      if (removedTabId === tabId) {
        debug(`Tab ${tabId} removed - detaching`)
        this.detachTab(tabId)
        browser.tabs.onRemoved.removeListener(tabRemovedListener)
      }
    }
    browser.tabs.onRemoved.addListener(tabRemovedListener)
  }

  private detachTab(tabId: number) {
    if (!this.tabReferences[tabId]) {
      debug(`Already detached from tab ${tabId}`)
      return
    }
    this.tabReferences[tabId]?.silenceSkipper?.destroy()
    this.tabReferences[tabId]?.state.destroy()
    this.tabReferences[tabId] = undefined
  }

  private setupTabReferenceForTabId(tabId: number) {
    const state = getState(StateEnvironment.Background, tabId)
    this.tabReferences[tabId] = {
      tabId,
      state
    }

    this.tabReferences[tabId]!.state.addListener("change", () => {
      this.createOrDestroySkipperForTab(tabId)
    })
  }

  private createOrDestroySkipperForTab(tabId: number) {
    if (!this.tabReferences[tabId]) return

    const state = this.tabReferences[tabId]!.state
    const skipper = this.tabReferences[tabId]!.silenceSkipper
    const isEnabled = state.current.enabled

    if (isEnabled && !skipper) {
      debug("Creating silence skipper for tab", tabId)
      this.tabReferences[tabId]!.silenceSkipper = new SilenceSkipper(state)
    }

    if (!isEnabled && skipper) {
      debug("Destroying silence skipper for tab", tabId)
      this.tabReferences[tabId]!.silenceSkipper?.destroy()
      delete this.tabReferences[tabId]!.silenceSkipper
    }

    console.log("Config updated for tab", tabId)
  }

  private enableBrowserActionForTab(tabId: number) {
    debug("Enabling page action for tab", tabId)
    browser.pageAction.show(tabId)
    browser.pageAction.setIcon({
      tabId,
      path: "assets/img/icon-32.png"
    })
  }
}
