import browser from "webextension-polyfill"

import ConfigProvider from "../shared/configProvider"
import debug from "../shared/debug"
import SilenceSkipper from "../shared/lib/SilenceSkipper"

export type BackgroundTabReference = {
  tabId: number
  configProvider: ConfigProvider
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
    this.tabReferences[tabId]?.configProvider.destroy()
    this.tabReferences[tabId] = undefined
  }

  private setupTabReferenceForTabId(tabId: number) {
    const configProvider = new ConfigProvider("background", tabId)
    this.tabReferences[tabId] = {
      tabId,
      configProvider
    }

    this.tabReferences[tabId]!.configProvider.onUpdate(() => {
      this.createOrDestroySkipperForTab(tabId)
    })
  }

  private createOrDestroySkipperForTab(tabId: number) {
    if (!this.tabReferences[tabId]) return

    const configProvider = this.tabReferences[tabId]!.configProvider
    const skipper = this.tabReferences[tabId]!.silenceSkipper
    const isEnabled = configProvider.get("enabled")

    if (isEnabled && !skipper) {
      debug("Creating silence skipper for tab", tabId)
      this.tabReferences[tabId]!.silenceSkipper = new SilenceSkipper(
        configProvider
      )
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
