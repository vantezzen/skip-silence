import { browser, WebRequest } from "webextension-polyfill-ts";

export default function unblockCorsForBackgroundScript() {
  browser.webRequest.onHeadersReceived.addListener((details : WebRequest.OnHeadersReceivedDetailsType) => {
    // @ts-ignore
    const initiator = details.initiator;

    if (initiator !== window.location.origin) {
      return {};
    }

    console.log(`Unblocking ${details.url} for script`);

    const header = details.responseHeaders?.find(({name}) => name.toLowerCase() === 'access-control-allow-origin');
    if (typeof header === 'object') {
      header.value = initiator;
    } else {
      details.responseHeaders?.push({name: "Access-Control-Allow-Origin", value: initiator});
    }
    details.responseHeaders?.push({name: "X-Skip-Silence", value: "Unblocked"});
  
    return {
      responseHeaders: details.responseHeaders,
    };
  }, {
    urls: ['<all_urls>']
  }, ['blocking', 'responseHeaders']);
}