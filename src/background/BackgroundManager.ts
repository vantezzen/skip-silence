import { StateEnvironment } from "@vantezzen/plasmo-state";
import browser from "webextension-polyfill";

// @ts-ignore: chrome.offscreen is not in the type definitions yet
import { AnalyserType, TabState } from "~shared/state";
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
  } = {};
  private isOffscreenDocumentReady = false;
  // Using chrome.runtime.getURL to ensure the path is correct after build
  private OFFSCREEN_DOCUMENT_PATH = browser.runtime.getURL("src/offscreen/offscreen.html");


  constructor() {
    this.setupOffscreenDocument();
    this.attachToTabsRequestingActivation();
    this.provideTabIdApi();
    this.listenForOffscreenMessages();
  }

  private async hasOffscreenDocument(): Promise<boolean> {
    // @ts-expect-error: Type definition for chrome.offscreen may not be fully up-to-date
    if (chrome.offscreen && chrome.offscreen.hasDocument) {
      // @ts-expect-error: Type definition for chrome.offscreen may not be fully up-to-date
      return await chrome.offscreen.hasDocument();
    }
    // Fallback for older versions or if API is not available
    // @ts-expect-error: clients is not in the type definitions for webextension-polyfill
    const matchedClients = await clients.matchAll({
      type: 'offscreen',
      // @ts-expect-error: clients.matchAll type definition may not include 'offscreen'
      includeUncontrolled: true,
    });
    return matchedClients.length > 0;
  }

  private async setupOffscreenDocument() {
    try {
      if (await this.hasOffscreenDocument()) {
        debug('Offscreen document already exists.');
        // If it exists, we might not get an 'offscreen-ready' message if it's already loaded.
        // We can either assume it's ready, or try to ping it.
        // For now, let's assume it might send 'offscreen-ready' again or we handle it.
        // Alternatively, we can set this.isOffscreenDocumentReady = true here if needed.
      } else {
        debug('Creating offscreen document.');
        // @ts-expect-error: Type definition for chrome.offscreen may not be fully up-to-date
        await chrome.offscreen.createDocument({
          url: this.OFFSCREEN_DOCUMENT_PATH,
          // @ts-expect-error: Type definition for chrome.offscreen may not be fully up-to-date
          reasons: [chrome.offscreen.Reason.USER_MEDIA],
          justification: 'Audio processing for tab capture requires an offscreen document to use AudioContext and getUserMedia (via tabCapture API).',
        });
        debug('Offscreen document creation initiated.');
        // The 'offscreen-ready' message will set isOffscreenDocumentReady to true.
      }
    } catch (error) {
      console.error("Error setting up offscreen document:", error);
      // Check if the error is due to the path
      if (error.message && error.message.includes("Invalid URL") && this.OFFSCREEN_DOCUMENT_PATH.includes("src/offscreen/offscreen.html")) {
        debug("Failed to create offscreen document with 'src/offscreen/offscreen.html', trying 'offscreen.html'");
        this.OFFSCREEN_DOCUMENT_PATH = browser.runtime.getURL("offscreen.html");
        // @ts-expect-error: Type definition for chrome.offscreen may not be fully up-to-date
        await chrome.offscreen.createDocument({
          url: this.OFFSCREEN_DOCUMENT_PATH,
          // @ts-expect-error: Type definition for chrome.offscreen may not be fully up-to-date
          reasons: [chrome.offscreen.Reason.USER_MEDIA],
          justification: 'Audio processing for tab capture requires an offscreen document to use AudioContext and getUserMedia (via tabCapture API).',
        });
        debug('Offscreen document creation with fallback path initiated.');
      }
    }
  }

  private listenForOffscreenMessages() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.target !== 'service-worker') {
        return false; // Indicate that we are not handling this message if it's not for the service-worker
      }

      if (request.command === 'offscreen-ready') {
        debug('Service Worker: Offscreen document is ready.');
        this.isOffscreenDocumentReady = true;
        sendResponse({ success: true });
        return true; 
      } else if (request.command === 'initiate-tab-capture') {
        debug('Service Worker: Received initiate-tab-capture request for tab', request.tabId);
        (async () => {
          try {
            await this.ensureOffscreenDocumentIsReady();
            debug('Service Worker: Offscreen document is ready, sending start-tab-capture to offscreen for tab', request.tabId);
            // Forward the request to the offscreen document
            const offscreenResponse = await browser.runtime.sendMessage({
              target: 'offscreen',
              command: 'start-tab-capture',
              tabId: request.tabId,
            });
            sendResponse(offscreenResponse); // Forward response from offscreen document
          } catch (error) {
            console.error('Service Worker: Error during initiate-tab-capture:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        return true; // Indicate that we will send a response asynchronously
      } else if (request.command === 'audio-update') {
        // debug('Service Worker: Received audio-update from offscreen:', request);
        const { tabId, volume } = request;
        const tabReference = this.tabReferences[tabId];
        if (tabReference && tabReference.silenceSkipper) {
          // The actual processing logic will be in SilenceSkipper.ts
          // For now, we just acknowledge receipt and log.
          // In a subsequent step, SilenceSkipper will have a method like processOffscreenVolume(volume)
          tabReference.silenceSkipper.processOffscreenVolume(volume);
        } else {
          // debug(`Service Worker: No active skipper for tab ${tabId} to process audio-update.`);
        }
        // This is typically a one-way message, no response needed unless specified.
        return false; // No response sent back to offscreen for audio-updates
      }
      return false; 
    });
  }

  public async ensureOffscreenDocumentIsReady(): Promise<void> {
    if (this.isOffscreenDocumentReady && await this.hasOffscreenDocument()) {
      debug("Offscreen document is already ready.");
      return;
    }

    await this.setupOffscreenDocument();

    // Wait for the offscreen document to become ready
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.isOffscreenDocumentReady) {
          clearInterval(interval);
          resolve();
        }
      }, 100); // Check every 100ms
    });
  }
  
  private provideTabIdApi() {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.command === "get-tab-id") {
        // Ensure this listener doesn't conflict with listenForOffscreenMessages
        // It's better to have one central message listener if possible, or ensure they correctly
        // return true/false to allow other listeners to process the message.
        // Since this returns a Promise, it correctly signals it's handling the message.
        return Promise.resolve(sender.tab?.id);
      }
      return false; // Important: allow other listeners to process the message
    });
  }

  private attachToTabsRequestingActivation() {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.command === "request-activation") {
        this.attachToTab(sender.tab!.id!);
        return Promise.resolve({ success: true }); // Acknowledge activation request
      }
      return false; // Important: allow other listeners to process the message
    });
  }

  private attachToTab(tabId: number) {
    if (this.tabReferences[tabId]) {
      debug(`Already attached to tab ${tabId}`)
      return
    }

    this.updateActionIconForTab(tabId); // Call the renamed function
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

    this.tabReferences[tabId]!.state.addListener("change", (key) => {
      if (key !== "*") return
      this.createOrDestroySkipperForTab(tabId)
    })
  }

  private createOrDestroySkipperForTab(tabId: number) {
    if (!this.tabReferences[tabId]) return

    const state = this.tabReferences[tabId]!.state
    const hasSkipper = this.tabReferences[tabId]!.silenceSkipper !== undefined;
    const isEnabled = state.current.enabled;

    if (
      isEnabled &&
      !hasSkipper &&
      state.current.analyserType === AnalyserType.tabCapture // Assuming this logic is still relevant for when to create
    ) {
      debug("Creating silence skipper for tab", tabId);
      this.tabReferences[tabId]!.silenceSkipper = new SilenceSkipper(state);
    } else if (
      !isEnabled && hasSkipper
      // Only destroy if it exists and is now disabled, or analyserType changed
      // The original logic for destroying when analyserType changes is preserved below
    ) {
      debug("Disabling skipper for tab", tabId);
      this.tabReferences[tabId]!.silenceSkipper?.destroy();
      this.tabReferences[tabId]!.silenceSkipper = undefined;
    }
    
    // Handle destruction if analyserType changes away from tabCapture while skipper exists
    if (hasSkipper && isEnabled && state.current.analyserType !== AnalyserType.tabCapture) {
        debug("AnalyserType changed, destroying skipper for tab", tabId);
        this.tabReferences[tabId]!.silenceSkipper?.destroy();
        this.tabReferences[tabId]!.silenceSkipper = undefined;
    }

    // Update icon after creating/destroying skipper
    this.updateActionIconForTab(tabId);

    console.log("Config updated for tab", tabId);
  }

  private updateActionIconForTab(tabId: number) {
    if (!tabId) {
      debug("updateActionIconForTab: tabId is undefined, cannot set icon.");
      return;
    }
    const tabRef = this.tabReferences[tabId];
    const isEnabledForTab = tabRef?.state?.current?.enabled || false;

    // Define icon paths (assuming they are in the root of the extension package after build)
    // Plasmo typically puts assets from the 'assets' directory into the root of the build.
    // The original path was "assets/img/icon-32.png".
    // Let's assume the final paths in the built extension are like "icon-32.png" or "assets/icon-32.png".
    // We should use paths relative to the extension's root.
    // The manifest icons are e.g., "icon16.plasmo.6c567d50.png". These are hashed.
    // For browser.action.setIcon, we need non-hashed paths that we control.
    // Use browser.runtime.getURL to get the full, correct path to the icon.
    // Corrected path: "assets/icon-32.png" based on ls output from Turn 47.
    const iconPath = browser.runtime.getURL("assets/icon-32.png");
    // const iconPathDisabled = browser.runtime.getURL("assets/icon-32-gray.png"); // Conceptual

    debug(`Updating action icon for tab ${tabId}. Enabled: ${isEnabledForTab}. Icon path: ${iconPath}`);
    
    // For MV3, browser.action.setIcon is the way.
    // We change the icon and title based on the state.
    // If a distinct disabled icon were available, its path would be used for the 'else' case.
    if (isEnabledForTab) {
      browser.action.setIcon({
        tabId: tabId,
        path: iconPath 
      }).catch(e => console.error(`Error setting enabled icon for tab ${tabId}:`, e, "Path:", iconPath));
      browser.action.setTitle({
        tabId: tabId,
        title: browser.i18n.getMessage("actionTitleEnabled") || "Skip Silence (Enabled)" 
      }).catch(e => console.error(`Error setting enabled title for tab ${tabId}:`, e));
    } else {
      // Using the same icon for now, but title indicates disabled state.
      // If a grayscale/disabled icon (e.g., iconPathDisabled) was available and confirmed, it would be used here.
      browser.action.setIcon({
        tabId: tabId,
        path: iconPath // Or iconPathDisabled if available
      }).catch(e => console.error(`Error setting disabled-state icon for tab ${tabId}:`, e, "Path:", iconPath));
      browser.action.setTitle({
        tabId: tabId,
        title: browser.i18n.getMessage("actionTitleDisabled") || "Skip Silence (Disabled)"
      }).catch(e => console.error(`Error setting disabled title for tab ${tabId}:`, e));
    }
  }
}
