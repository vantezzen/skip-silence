import { browser, Runtime } from 'webextension-polyfill-ts';

import defaultConfig, { ConfigKey } from './config';
import debug from './debug';
import type { ExtMessage } from './types';

type Environment = 'popup' | 'content' | 'background';

// List of keys that should be saved to local storage
const storedKeys: ConfigKey[] = [
  'silence_threshold',
  'dynamic_silence_threshold',
  'samples_threshold',

  'playback_speed',
  'playback_speed_is_custom',
  'silence_speed',
  'silence_speed_is_custom',

  'mute_silence',
  'keep_audio_sync',

  'is_bar_icon_enabled',
  'is_bar_collapsed',

  'show_saved_time_info',

  'allow_analytics',
  'saved_time',
];

export async function getCurrentTabId(): Promise<number> {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tabs[0] || !tabs[0].id) {
    // We can't connect to a page
    return -1;
  }
  return tabs[0].id;
}

/**
 * Config Provider: Provides the config data in a way that syncs all data with other components of the
 * extension (e.g. content and background script)
 */
export default class ConfigProvider {
  config: typeof defaultConfig = defaultConfig;
  previousConfig: typeof defaultConfig = defaultConfig;
  env: Environment;
  onUpdateListeners: Function[] = [];
  tabId: number;

  /**
   * Create a new Config Provider
   *
   * @param environment Environent, the provider is used in. This is needed to determine what components to communicate with
   */
  constructor(environment: Environment, tabId: number = -1) {
    this.env = environment;
    this.tabId = tabId;
    this._configUpdateListener = this._configUpdateListener.bind(this);
    if (this.env === 'content') {
      chrome.runtime.sendMessage({ command: 'get-tab-id' }, (tabId) => {
        this.tabId = tabId;
        this.fetch();
      });
    }

    this._listenForConfigUpdates();

    if (this.env === 'popup' || this.env === 'content') {
      this.fetch();
    }
    if (this.env === 'background') {
      this._getValuesFromStorage();
    }

    debug('ConfigProvider: Setup');
  }

  private _configUpdateListener(
    msg: ExtMessage,
    sender: Runtime.MessageSender
  ) {
    if (!msg.command) return;

    const senderTab = msg.tabId === -1 ? sender.tab?.id : msg.tabId;
    if (senderTab !== this.tabId) {
      debug('ConfigProvider: Discarding message from wrong tab', msg);
      return;
    }

    if (msg.command === 'config') {
      // Got data about new config values
      this.previousConfig = this.config;
      this.config = msg.data;

      debug('ConfigProvider: Got config update: ', msg);
      this._onUpdate();
    } else if (msg.command === 'requestConfig') {
      // Other components requested us to send them our config values
      debug('ConfigProvider: Sending requested config');

      return Promise.resolve(this.config);
    }
  }

  /**
   * Listen for config push or pull from other components over the browser message API
   */
  _listenForConfigUpdates() {
    browser.runtime.onMessage.addListener(this._configUpdateListener);
  }

  /**
   * Restore values from the local browser storage
   */
  _getValuesFromStorage() {
    browser.storage.local.get(storedKeys).then((data: any) => {
      debug('ConfigProvider: Got data from localstorage', data);

      for (const key of storedKeys) {
        if (data.hasOwnProperty(key)) {
          this.set(key, data[key]);
        }
      }

      debug(
        'ConfigProvider: Config after loading local storage is',
        this.config
      );
    });
  }

  /**
   * Attach a callback listener to notify when the config changes
   *
   * @param callback Callback to use
   */
  onUpdate(callback: Function) {
    this.onUpdateListeners.push(callback);
  }

  removeOnUpdateListener(callback: Function) {
    this.onUpdateListeners = this.onUpdateListeners.filter(
      (listener) => listener !== callback
    );
  }

  /**
   * Notify update listeners about an update
   */
  _onUpdate() {
    if (JSON.stringify(this.previousConfig) === JSON.stringify(this.config)) {
      debug('ConfigProvider: No change, discarding');
      return;
    }
    this.onUpdateListeners.forEach((callback) => callback());
  }

  async fetch() {
    if (this.env === 'popup' || this.env === 'content') {
      const config = await browser.runtime.sendMessage({
        command: 'requestConfig',
        tabId: this.tabId,
      });
      if (!config) {
        debug('ConfigProvider:  Fetched, but no result');
        return;
      }

      if (JSON.stringify(this.config) === JSON.stringify(config)) {
        debug('ConfigProvider: Fetched, but no change');
        return;
      }

      this.previousConfig = this.config;
      this.config = config;

      debug('ConfigProvider: Fetched config: ', this.config);

      this._onUpdate();
    }
  }

  /**
   * Push changes to all other components
   */
  async push() {
    if (this.env === 'popup' || this.env === 'background') {
      // Push changes to Content script
      try {
        await browser.tabs.sendMessage(this.tabId, {
          command: 'config',
          data: this.config,
          tabId: this.tabId,
        });
      } catch (e) {
        debug('ConfigProvider: Error pushing config to content script', e);
      }

      debug('ConfigProvider: Pushed config to content script', this.config);
    }

    try {
      browser.runtime.sendMessage({
        command: 'config',
        data: this.config,
        tabId: this.tabId,
      });
    } catch (e) {}
  }

  /**
   * Get a config value
   *
   * @param key Config key
   * @return Value
   */
  get(key: keyof typeof defaultConfig): any {
    return this.config[key];
  }

  /**
   * Set a config value
   *
   * @param key Config key
   * @param value New config value
   */
  set(key: keyof typeof defaultConfig, value: any): void {
    this.previousConfig = { ...this.config };
    // @ts-ignore 2322
    this.config[key] = value;

    if (storedKeys.includes(key)) {
      // Save changes locally
      browser.storage.local.set({
        [key]: value,
      });
    }

    this.push();
    this._onUpdate();
  }

  destroy() {
    this.onUpdateListeners = [];
    browser.runtime.onMessage.removeListener(this._configUpdateListener);
  }
}
