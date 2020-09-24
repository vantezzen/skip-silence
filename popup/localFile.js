/**
 * Handle trying to play local files
 */
let isLocalFile = location.protocol === 'file:';

chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
  if (tabs[0] && tabs[0].url) {
    const url = new URL(tabs[0].url);

    if (url.protocol === 'file:') {
      document.getElementById('app').classList.add('hidden');
      document.getElementById('localFileError').classList.remove('hidden');
    }
  }
});