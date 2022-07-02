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
    this.attachToAllCurrentTabs();
    this.listenForTabChanges();
  }

  private attachToAllCurrentTabs() {
    browser.tabs.query({}).then((tabs) => {
      debug('Found tabs - attaching to all', tabs);
      tabs.forEach((tab) => {
        if (tab.id) {
          this.attachToTab(tab.id);
        }
      });
    });
  }

  private listenForTabChanges() {
    browser.tabs.onCreated.addListener((tab) => {
      debug('Tab created - attaching', tab);

      if (tab.id) {
        this.attachToTab(tab.id);
      }
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      debug('Tab removed - detaching', tabId);

      if (tabId) {
        this.tabReferences[tabId] = undefined;
      }
    });
  }

  private attachToTab(tabId: number) {
    if (this.tabReferences[tabId]) {
      debug(`Already attached to tab ${tabId}`);
      return;
    }

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
        this.tabReferences[tabId]!.silenceSkipper = new SilenceSkipper(
          configProvider
        );
      }
      console.log('Config updated for tab', tabId);
    });
  }
}
