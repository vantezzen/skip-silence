import { browser } from "webextension-polyfill-ts";
import { ExtMessage } from '../shared/types';

// Tabs where Skip Silence is enabled
let skipSilenceEnabledTabs : Set<number> = new Set();

export default function setupMessageListener() {
  // React to messages from the other components
  browser.runtime.onMessage.addListener(async (msg : ExtMessage, sender) => {
    if (!msg.command || !sender || !sender.tab || !sender.tab.id) return;

    browser.pageAction.show(sender.tab.id);
    if (msg.command === 'hasElement') {
      console.log('Enable extension for tab', sender.tab.id);

      // Set icon back to colored version
      browser.pageAction.setIcon({
        tabId: sender.tab.id,
        path: "assets/img/icon-32.png"
      });
    } else if (msg.command === 'noElement') {
      console.log('Disable extension for tab', sender.tab.id);

      // Set icon to black/white version as browser may not do this itself
      browser.pageAction.setIcon({
        tabId: sender.tab.id,
        path: "assets/img/disabled.png"
      });
    } else if (msg.command === 'tabEnabledInfo') {
      // Tab is enabled or disabled
      console.log('Tab status', sender.tab.id, msg.enabled);

      if (msg.enabled) {
        // Enable Skip Silence for this tab
        skipSilenceEnabledTabs.add(sender.tab.id);
      } else {
        // Disable Skip Silence for this tab
        skipSilenceEnabledTabs.delete(sender.tab.id);
      }
    } else if (msg.command === 'requestTabIsEnabled') {
      // Request tab status
      console.log('Request tab status', sender.tab.id, skipSilenceEnabledTabs.has(sender.tab.id));
      return skipSilenceEnabledTabs.has(sender.tab.id);
    }
  });

}