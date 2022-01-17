/**
 * MediaLoader: Allows running media in the background page without blocking the main page
 */
import { browser } from "webextension-polyfill-ts";
import { ExtMessage } from '../shared/types';
import SilenceSkipper from "../shared/lib/SilenceSkipper";
import ConfigProvider from "../shared/configProvider";

type MediaReferences = {
  [key: number]: {
    tabId: number,
    skipper: SilenceSkipper
  }
}

export default class MediaLoader {

  media: MediaReferences = {};
  private nextMediaId = 0;

  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    browser.runtime.onMessage.addListener(async (msg : ExtMessage, sender) => {
      if (!msg.command || !sender || !sender.tab || !sender.tab.id) return;
  
      if (msg.command === 'background:setupMedia') {
        console.log('Setup media for tab', sender.tab.id);
        return this.setupMedia(sender.tab.id, msg.src, msg.tagType);
      } else if (msg.command === 'background:syncMedia') {
        const { event } = msg;
        if (event === 'play') {
          console.log('Play media for tab', sender.tab.id);
          this.media[msg.mediaId].skipper.element.play();
        } else if (event === 'pause') {
          console.log('Pause media for tab', sender.tab.id);
          this.media[msg.mediaId].skipper.element.pause();
        } else if (event === 'timeupdate') {
          console.log('Timeupdate media for tab', sender.tab.id);

          const timeDiff = Math.abs(this.media[msg.mediaId].skipper.element.currentTime - msg.time);
        
          if (timeDiff > this.media[msg.mediaId].skipper.config.get('preload_length')) {
            this.media[msg.mediaId].skipper.element.currentTime = msg.time + this.media[msg.mediaId].skipper.config.get('preload_length');

            console.log(`Media Loader: Needed to re-sync preload element (Diff: ${timeDiff}s)`);
          }
          this.media[msg.mediaId].skipper.element.currentTime = msg.time;
        }
      }
    });
  }

  private async setupMedia(tabId: number, src: string, tagType: string): Promise<number | false> {
    const mediaId = this.nextMediaId++;

    // Try to connect to the video url. If we can't, then we can't use the background page
    try {
      await fetch(src, {
        method: 'HEAD'
      });
    } catch (e) {
      console.log('Media Loader: Cannot create preload as URL is not accessible', src);
      return false;
    }

    const mediaElement = document.createElement(tagType) as HTMLVideoElement | HTMLAudioElement;
    mediaElement.src = src;
    mediaElement.setAttribute("preload", "auto");
    document.body.appendChild(mediaElement);

    const skipper = new SilenceSkipper(mediaElement, new ConfigProvider('background'));
    this.media[mediaId] = {
      tabId,
      skipper
    };

    return mediaId;
  }


}