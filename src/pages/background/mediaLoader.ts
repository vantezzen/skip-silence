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
    skipper: SilenceSkipper,
    element: HTMLVideoElement | HTMLAudioElement,
    isBuffering: boolean,
  } | undefined,
}

export default class MediaLoader {

  media: MediaReferences = {};
  private nextMediaId = 1;

  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    browser.runtime.onMessage.addListener(async (msg : ExtMessage, sender) => {
      if (!msg.command || !sender || !sender.tab || !sender.tab.id) return;
  
      if (msg.command === 'background:setupMedia') {
        console.log('Setup media for tab', sender.tab.id);
        const mediaId = await this.setupMedia(sender.tab.id, msg.src, msg.tagType, msg.playing);
        console.log('Set up media with id', mediaId);

        browser.tabs.sendMessage(sender.tab.id, {
          command: 'background:mediaIdResult',
          mediaId
        });

        return mediaId;
      } else if (msg.command === 'background:syncMedia') {
        const { event } = msg;
        if (event === 'play') {
          console.log('Play media for tab', sender.tab.id);
          this.media[msg.mediaId]?.skipper.element.play();
        } else if (event === 'pause') {
          console.log('Pause media for tab', sender.tab.id);
          this.media[msg.mediaId]?.skipper.element.pause();
        } else if (event === 'timeupdate') {
          const media = this.media[msg.mediaId];
          if (!media) return;
          console.log('Timeupdate media for tab', sender.tab.id, media.skipper.element.currentTime, msg.time);

          const timeDiff = media.skipper.element.currentTime - msg.time;
        
          if (timeDiff < 0 || timeDiff > ((media.skipper.config.get('preload_length') * 3) + 0.4)) {
            media.skipper.element.currentTime = msg.time + media.skipper.config.get('preload_length') + 0.4;

            console.log(`Media Loader: Needed to re-sync preload element (Diff: ${timeDiff}s)`);
          }
        }
      } else if (msg.command === 'background:destroyMedia') {
        console.log('Destroy media for tab', sender.tab.id);
        this.destroyMedia(msg.mediaId);
      }
    });
  }

  private async setupMedia(tabId: number, src: string, tagType: string, playing: boolean): Promise<number | false> {
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
    if (playing) mediaElement.play();

    const skipper = new SilenceSkipper(mediaElement, new ConfigProvider('background'));
    this.media[mediaId] = {
      tabId,
      skipper,
      element: mediaElement,
      isBuffering: false,
    };

    return mediaId;
  }

  private destroyMedia(mediaId: number) {
    const media = this.media[mediaId];
    if (!media) return;

    media.element.remove();
    this.media[mediaId] = undefined;
  }
}