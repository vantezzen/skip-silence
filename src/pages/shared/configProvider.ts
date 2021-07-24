import { browser } from "webextension-polyfill-ts";
import { ExtMessage } from './types';
import defaultConfig from './config';
import debug from './debug';
import { strict } from "assert";

type Environment = "popup" | "content" | "background";

// List of keys that should be saved to local storage
const storedKeys : (keyof typeof defaultConfig)[] = [
  "silence_threshold",
  "dynamic_silence_threshold",
  "samples_threshold",

  "playback_speed",
  "playback_speed_is_custom",
  "silence_speed",
  "silence_speed_is_custom",

  "mute_silence",
  "keep_audio_sync",

  "is_bar_icon_enabled",
  "is_bar_collapsed",

  "show_saved_time_info",

  "allow_analytics",
  "saved_time",
];

/**
 * Config Provider: Provides the config data in a way that syncs all data with other components of the
 * extension (e.g. content and background script)
 */
export default class ConfigProvider {
  config : typeof defaultConfig = defaultConfig;
  env : Environment;
  onUpdateListeners : Function[] = [];

  /**
   * Create a new Config Provider
   * 
   * @param environment Environent, the provider is used in. This is needed to determine what components to communicate with
   */
  constructor(environment : Environment) {
    this.env = environment;

    this._listenForConfigUpdates();

    if (this.env === "popup") {
      this.fetch();
    }
    if (this.env === "content") {
      this._getValuesFromStorage();
    }

    debug("ConfigProvider: Setup");
  }

  /**
   * Listen for config push or pull from other components over the browser message API
   */
  _listenForConfigUpdates() {
    browser.runtime.onMessage.addListener((msg : ExtMessage) => {
      if (!msg.command) return;

      if (msg.command === 'config') {
        // Got data about new config values
        this.config = msg.data;
        
        debug("ConfigProvider: Got config update: ", msg);
        this._onUpdate();
      } else if (msg.command === 'requestConfig') {
        // Other components requested us to send them our config values
        debug("ConfigProvider: Sending requested config");
        
        return Promise.resolve(this.config);
      }
    });
  }

  /**
   * Restore values from the local browser storage
   */
  _getValuesFromStorage() {
    browser.storage.local.get(storedKeys).then((data) => {
      debug("ConfigProvider: Got data from localstorage", data);

      for(const key of storedKeys) {
        if (data.hasOwnProperty(key)) {
          this.set(key, data[key]);
        }
      }

      debug("ConfigProvider: Config after loading local storage is", this.config);
    });
  }

  /**
   * Attach a callback listener to notify when the config changes
   * 
   * @param callback Callback to use
   */
  onUpdate(callback : Function) {
    this.onUpdateListeners.push(callback);
  }

  /**
   * Notify update listeners about an update
   */
  _onUpdate() {
    this.onUpdateListeners.forEach((callback) => callback());
  }

  /**
   * Fetch config data from another source
   * 
   * This will use the content script when inside a popup or the popup script when inside the content script
   */
  async fetch() {
    if (this.env === "popup" || this.env === "background") {
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      if (!tabs[0] || !tabs[0].id) {
        // We can't connect to a page
        return;
      }
  
      const config = await browser.tabs.sendMessage(tabs[0].id, {
        command: 'requestConfig',
      });
      if (!config) {
        // Content script hasn't sent any data
        debug("ConfigProvider:  Fetched, but no result");
        return;
      }

      this.config = config;

      debug("ConfigProvider: Fetched config: ", this.config);
      
      this._onUpdate();
    } else if (this.env === "content") {}
  }

  /**
   * Push changes to all other components
   */
  async push() {
    if (this.env === "popup" || this.env === "background") {
      // Push changes to Content script
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      if (!tabs[0] || !tabs[0].id) {
        // We can't connect to a page
        return;
      }

      await browser.tabs.sendMessage(tabs[0].id, {
        command: 'config',
        data: this.config,
      });

      debug("ConfigProvider: Pushed config to content script", this.config);
    } else {
      // Push to popup
      browser.runtime.sendMessage({
        command: 'config',
        data: this.config,
      });
    }
  }

  /**
   * Get a config value
   * 
   * @param key Config key
   * @return Value
   */
  get(key : keyof typeof defaultConfig) : any {
    return this.config[key];
  }

  /**
   * Set a config value
   * 
   * @param key Config key
   * @param value New config value
   */
  set(key : keyof typeof defaultConfig, value : any) : void {
    // @ts-ignore 2322
    this.config[key] = value;

    if(storedKeys.includes(key)) {
      // Save changes locally
      browser.storage.local.set({
        [key]: value,
      });
    }

    this.push();
    this._onUpdate();
  }
}