import debug from '../debug';
import { browser } from 'webextension-polyfill-ts';
import SilenceSkipper from './SilenceSkipper';

/**
 * Preload Manager
 * Preloading will create a second, hidden media element that can be used
 * for finding out about the media volume in front of the current position.
 */
export default class Preloader {
  skipper: SilenceSkipper;

  constructor(skipper: SilenceSkipper) {
    this.skipper = skipper;
    this.syncMediaToPreloadElement();
  }

  private syncMediaToPreloadElement() {
    this.skipper.element.addEventListener('play', () => {
      if (this.skipper.preloadElement) {
        this.skipper.preloadElement.play();
      }
    });
    this.skipper.element.addEventListener('pause', () => {
      if (this.skipper.preloadElement) {
        this.skipper.preloadElement.pause();
      }
    });
    this.skipper.element.addEventListener('timeupdate', () => {
      if (this.skipper.preloadElement) {
        const timeDiff = Math.abs(
          this.skipper.element.currentTime -
            this.skipper.preloadElement.currentTime
        );

        if (timeDiff > this.skipper.config.get('preload_length')) {
          this.skipper.preloadElement.currentTime =
            this.skipper.element.currentTime +
            this.skipper.config.get('preload_length');

          debug(
            `Preload: Needed to re-sync preload element (Diff: ${timeDiff}s)`
          );
        }
      }
    });
  }

  /**
   * Try to create a preload element for the current media element
   *
   * This function will return false if it is not possible to create one
   */
  async createPreloadElement() {
    if (this.skipper.preloadElement) return this.skipper.preloadElement;

    const videoUrl = await this.getUrlForMedia();
    if (!videoUrl || !(await this.canConnectToMediaUrl(videoUrl))) {
      return false;
    }

    const preloadElement = this.createMediaElementForMediaUrl(videoUrl);

    if (!this.skipper.element.paused) {
      preloadElement.play();
    }

    debug('Preload: Created preload element', preloadElement);

    return preloadElement;
  }

  private createMediaElementForMediaUrl(videoUrl: string) {
    const mediaElement = document.createElement(
      this.skipper.element.tagName
    ) as HTMLVideoElement | HTMLAudioElement;
    mediaElement.setAttribute('preload', 'auto');
    mediaElement.setAttribute('src', videoUrl);
    mediaElement.setAttribute('style', 'display: none;');
    mediaElement.setAttribute('data-skip-silence-ignore', 'true');
    mediaElement.setAttribute('crossOrigin', 'anonymous');
    mediaElement.id = 'skip-silence-preload';
    mediaElement.currentTime =
      this.skipper.element.currentTime +
      this.skipper.config.get('preload_length');
    document.body.appendChild(mediaElement);
    return mediaElement;
  }

  private async getUrlForMedia(): Promise<string | false> {
    if (window.location.host === 'www.youtube.com') {
      // Webextension script runs in an isolated context so we need to execute
      // an independent script on the page itself, giving us access to the ytplayer object
      const setYouTubeInfoElement = () => {
        if (!window.ytplayer) {
          console.log('Skip Silence Preload: No YouTube player found');
          return;
        }

        const videoUrls =
          window.ytplayer.bootstrapPlayerResponse.streamingData.formats;
        if (!videoUrls || videoUrls.length === 0) {
          console.log(
            'Skip Silence Preload: YouTube Error: No video urls found',
            videoUrls
          );
          return;
        }

        let videoUrl = videoUrls[0].url;
        if (videoUrl) {
          const infoElement = document.createElement('div');
          infoElement.setAttribute('src', videoUrl);
          infoElement.setAttribute('style', 'display: none;');
          infoElement.id = 'skip-silence-youtube-preload-info';
          document.body.appendChild(infoElement);
        }
      };

      // Inject script into page
      const script = document.createElement('script');
      script.textContent = `(${setYouTubeInfoElement.toString()})()`;
      (document.head || document.documentElement).appendChild(script);
      script.remove();

      // Read the resulting element that contains the video url
      const videoInfo = document.getElementById(
        'skip-silence-youtube-preload-info'
      );

      if (!videoInfo) {
        debug(
          `Skip Silence Preload: YouTube Error: No video info element found`
        );
        return false;
      }

      let videoUrl = videoInfo.getAttribute('src') as string;
      videoInfo.remove();

      debug('Preload: Using YouTube internal url', videoUrl);

      return videoUrl;
    } else {
      let videoUrl = this.skipper.element.currentSrc;
      debug('Preload: Using current src', videoUrl);
      return videoUrl;
    }
  }

  private async canConnectToMediaUrl(videoUrl: string): Promise<boolean> {
    try {
      await fetch(videoUrl, {
        method: 'HEAD',
      });
      return true;
    } catch (e) {
      debug(
        'Preload: Cannot create preload as URL is not accessible',
        videoUrl
      );
      return false;
    }
  }
}
