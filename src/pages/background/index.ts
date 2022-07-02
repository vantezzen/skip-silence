import BackgroundManager from './BackgroundManager';
import { browser } from 'webextension-polyfill-ts';

new BackgroundManager();

// React to keyboard shortcuts
// We simply redirect them to the page using a browser message
browser.commands.onCommand.addListener(async (name: String) => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0] || !tabs[0].id) {
    // We can't connect to a page
    return;
  }

  await browser.tabs.sendMessage(tabs[0].id, {
    command: 'shortcut',
    name,
  });
});
