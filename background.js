/**
 * Skip Silence Browser Extension:
 * Skip silent parts in videos and audio files.
 * 
 * Background script: Enable and disable browser popup based on if there
 * are source elements availiable
 * 
 * @author vantezzen (https://github.com/vantezzen)
 * @license MIT License
 */
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg.command) return;

  if (msg.command === 'enable') {
    console.log('Enable extension for tab', sender.tab.id);

    chrome.pageAction.show(sender.tab.id);
    // Set icon back to colored version
    chrome.pageAction.setIcon({
      tabId: sender.tab.id,
      path: "icons/icon-32.png"
    }, () => {})
  } else if (msg.command === 'disable') {
    console.log('Disable extension for tab', sender.tab.id);
    // chrome.pageAction.hide(sender.tab.id);

    // Set icon to black/white version as chrome may not do this itself
    chrome.pageAction.setIcon({
      tabId: sender.tab.id,
      path: "icons/disabled.png"
    }, () => {})
  }
});