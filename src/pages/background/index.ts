import { browser, WebRequest } from "webextension-polyfill-ts";
import { ExtMessage } from '../shared/types';

import '../../assets/img/icon-48.png';
import '../../assets/img/icon-128.png';

// URL that should be CORS unblocked
let corsUnblockedUrls : { url: string, for: string, tab: number }[] = [];

// Tabs where Skip Silence is enabled
let skipSilenceEnabledTabs : Set<number> = new Set();

// React to keyboard shortcuts
// We simply redirect them to the page using a browser message
browser.commands.onCommand.addListener(async (name : String) => {
  const tabs = await browser.tabs.query({active: true, currentWindow: true});
  if (!tabs[0] || !tabs[0].id) {
    // We can't connect to a page
    return;
  }

  await browser.tabs.sendMessage(tabs[0].id, {
    command: 'shortcut',
    name,
  });
});

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
  } else if (msg.command === 'corsUnblock') {
    // CORS unblocking is restricted to the tab and page only for security reasons
    console.log(`Unblocking ${msg.url} for ${msg.for} on tab ${sender.tab.id}`);
    corsUnblockedUrls.push({
      url: msg.url,
      for: msg.for,
      tab: sender.tab.id
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

// CORS Unblock
browser.webRequest.onHeadersReceived.addListener((details : WebRequest.OnHeadersReceivedDetailsType) => {
  // @ts-ignore
  const initator = details.initiator;

  if (
    // Don't allow CORS unblocking anything other than audio and video
    (details.type !== 'media' && details.type !== 'xmlhttprequest') ||

    // Only remove CORS for GET and HEAD requests
    (details.method !== 'GET' && details.method !== 'HEAD') ||

    // Ignore requests that don't contain headers
    (!details.responseHeaders) ||

    // Don't allow CORS unblocking for requests that haven't been unblocked
    // @ts-ignore
    (corsUnblockedUrls.find((item) => item.url === details.url && item.for === initator && details.tabId === item.tab) === undefined)
  ) {
    return;
  }

  const header = details.responseHeaders.find(({name}) => name.toLowerCase() === 'access-control-allow-origin');
  if (header) {
    header.value = initator;
  } else {
    details.responseHeaders.push({name: "Access-Control-Allow-Origin", value: initator});
  }

  return {
    responseHeaders: details.responseHeaders,
  };
}, {
  urls: ['<all_urls>']
}, ['blocking', 'responseHeaders']);