import debug from '../debug';
import { browser } from "webextension-polyfill-ts";
import SilenceSkipper from './SilenceSkipper';
import { ExtMessage } from '../types';

/**
 * Background Media Loader: This will load the media element separately in the background page
 * and sync the status of the media element to the main page.
 */
export default class BackgroundMediaLoader {
  // Parent skipper
  skipper : SilenceSkipper;

  mediaId?: number;
  isLoadingMedia = false;

  onMediaIdResultListeners : ((result?: number) => void)[] = [];

  /**
   * Set up the class
   * 
   * @param config Config to use
   */
  constructor(skipper : SilenceSkipper) {
    this.skipper = skipper;

    // Sync media to background page element
    ['play', 'pause'].forEach(event => {
      this.skipper.element.addEventListener(event, () => {
        if (this.mediaId) {
          browser.runtime.sendMessage({
            command: 'background:syncMedia',
            mediaId: this.mediaId,
            event,
          });
        }
      });
    });
    
    this.skipper.element.addEventListener('timeupdate', () => {
      if (this.mediaId) {
        browser.runtime.sendMessage({
          command: 'background:syncMedia',
          mediaId: this.mediaId,
          event: 'timeupdate',
          time: this.skipper.element.currentTime
        });
      }
    });

    browser.runtime.onMessage.addListener((msg: ExtMessage) => {
      if (!msg.command) return;
      if (msg.command === 'background:mediaIdResult') {
        const result = msg.mediaId;
        this.onMediaIdResultListeners.forEach(listener => {
          listener(result);
        });
        this.onMediaIdResultListeners = [];
      }
    });
  }

  createBackgroundMediaElement() {
    return new Promise(async (resolve, reject) => {
      if (this.mediaId || this.isLoadingMedia) return resolve(true);
      debug('BackgroundMediaLoader: Setting up new media element', this.mediaId, this.isLoadingMedia);
      this.isLoadingMedia = true;
  
      let videoUrl : string | false = false;
      if (window.location.host === "www.youtube.com") {
        // Webextension script runs in an isolated context so we need to execute
        // an independent script on the page itself, giving us access to the ytplayer object
        const setYouTubeInfoElement = () => {
          if (!window.ytplayer) {
            console.log("Skip Silence BackgroundMediaLoader: No YouTube player found");
            return;
          }
  
          const videoUrls = window.ytplayer.bootstrapPlayerResponse.streamingData.formats;
          if (!videoUrls || videoUrls.length === 0) {
            console.log('Skip Silence BackgroundMediaLoader: YouTube Error: No video urls found', videoUrls);
            return
          } 
  
          videoUrl = videoUrls[0].url;
          if (videoUrl) {
            const infoElement = document.createElement('div');
            infoElement.setAttribute("src", videoUrl);
            infoElement.setAttribute("style", "display: none;");
            infoElement.id = "skip-silence-youtube-preload-info";
            document.body.appendChild(infoElement);
          }
        }
  
        // Inject script into page
        const script = document.createElement('script');
        script.textContent = `(${setYouTubeInfoElement.toString()})()`;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
  
        // Read the resulting element that contains the video url
        const videoInfo = document.getElementById('skip-silence-youtube-preload-info');
  
        if (!videoInfo) {
          debug(`Skip Silence BackgroundMediaLoader: YouTube Error: No video info element found`);
          return resolve(false);
        }
  
        videoUrl = videoInfo.getAttribute('src') as string;
        videoInfo.remove();
  
        debug('Preload: Using YouTube internal url', videoUrl);
      } else {
        videoUrl = this.skipper.element.currentSrc;
      }
  
      if (!videoUrl) {
        debug('Skip Silence BackgroundMediaLoader: No video url found');
        this.isLoadingMedia = false;
        return resolve(false);
      }
  
      browser.runtime.sendMessage({
        command: 'background:setupMedia',
        src: videoUrl,
        tagType: this.skipper.element.tagName.toLowerCase(),
        playing: this.skipper.element.paused ? false : true,
        time: this.skipper.element.currentTime
      });

      // Browser message callbacks will timeout so we must implement our own callback system
      this.onMediaIdResultListeners.push(result => {
        if (result) {
          this.mediaId = result;

          window.addEventListener('beforeunload', (event) => {
            if (this.mediaId) {
              browser.runtime.sendMessage({
                command: 'background:destroyMedia',
                mediaId: this.mediaId,
              });
            }
          });
        }
    
        debug('BackgroundMediaLoader: Created media element', this.mediaId);
        this.isLoadingMedia = false;
        return resolve(result !== null);
      });
    });
  }
}