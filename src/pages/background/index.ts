import { browser } from "webextension-polyfill-ts";
import { ExtMessage } from '../shared/types';

import '../../assets/img/icon-48.png';
import '../../assets/img/icon-128.png';

browser.runtime.onMessage.addListener((msg : ExtMessage, sender) => {
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
  }
});