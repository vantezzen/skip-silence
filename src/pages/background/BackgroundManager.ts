import { browser } from 'webextension-polyfill-ts';
import debug from '../shared/debug';
import SilenceSkipper from './lib/SilenceSkipper';
import ConfigProvider from '../shared/configProvider';

export type BackgroundTabReference = {
  tabId: number;
  configProvider: ConfigProvider;
  silenceSkipper?: SilenceSkipper;
};

export default class BackgroundManager {
  private tabReferences: {
    [tabId: number]: BackgroundTabReference | undefined;
  } = {};

  constructor() {
    this.attachToTabsRequestingActivation();
    this.provideTabIdApi();
  }

  private provideTabIdApi() {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.command === 'get-tab-id') {
        return Promise.resolve(sender.tab?.id);
      }
    });
  }

  private attachToTabsRequestingActivation() {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.command === 'request-activation') {
        this.attachToTab(sender.tab!.id!);
      }
    });
  }

  private attachToTab(tabId: number) {
    if (this.tabReferences[tabId]) {
      debug(`Already attached to tab ${tabId}`);
      return;
    }

    debug('Enabling page action for tab', tabId);
    browser.pageAction.show(tabId);
    browser.pageAction.setIcon({
      tabId,
      path: 'assets/img/icon-32.png',
    });

    const configProvider = new ConfigProvider('background', tabId);
    this.tabReferences[tabId] = {
      tabId,
      configProvider,
    };

    configProvider.onUpdate(() => {
      if (
        this.tabReferences[tabId] &&
        configProvider.get('enabled') &&
        !this.tabReferences[tabId]!.silenceSkipper
      ) {
        debug('Creating silence skipper for tab', tabId);
        this.tabReferences[tabId]!.silenceSkipper = new SilenceSkipper(
          configProvider
        );
      }

      if (
        this.tabReferences[tabId] &&
        !configProvider.get('enabled') &&
        this.tabReferences[tabId]!.silenceSkipper
      ) {
        // TODO: Check for memory leak
        debug('Destroying silence skipper for tab', tabId);
        delete this.tabReferences[tabId]!.silenceSkipper;
      }

      console.log('Config updated for tab', tabId);
    });
  }
}
