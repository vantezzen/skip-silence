import debug from '../debug';
import { browser } from "webextension-polyfill-ts";
import SilenceSkipper from './SilenceSkipper';

/**
 * Background Media Loader: This will load the media element separately in the background page
 * and sync the status of the media element to the main page.
 */
export default class BackgroundMediaLoader {
  // Parent skipper
  skipper : SilenceSkipper;

  mediaId?: number;

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
  }

  async createBackgroundMediaElement() {
    if (this.mediaId) return;

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
          return;
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
        return false;
      }

      videoUrl = videoInfo.getAttribute('src') as string;
      videoInfo.remove();

      debug('Preload: Using YouTube internal url', videoUrl);
    }

    if (!videoUrl) return false;

    const result = await browser.runtime.sendMessage({
      command: 'background:setupMedia',
      src: videoUrl,
      tagType: this.skipper.element.tagName.toLowerCase(),
      playing: this.skipper.element.paused ? false : true,
      time: this.skipper.element.currentTime
    });
    if (result) {
      this.mediaId = result;
    }

    debug('BackgroundMediaLoader: Created media element', this.mediaId);
    return result !== null;
  }
}