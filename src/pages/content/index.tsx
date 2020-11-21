/**
 * Content Script
 * This script will be loaded into all pages
 */
import { browser } from "webextension-polyfill-ts";
import React from 'react';
import { render as RenderReact } from 'react-dom';

import Bar from './command-bar/Bar';
import debug from '../shared/debug';
import ConfigProvider from '../shared/configProvider';
import { MediaElement } from '../shared/types';
import speedSettings from '../shared/speedSettings';

import inspectMediaElements from './lib/inspectMediaElements';
import SilenceSkipper from './lib/SilenceSkipper';

// Create config provider so we can exchange information with the popup
const config = new ConfigProvider("content");
config.onUpdate(() => {
  debug("Main: Updated config: ", config.config);
});

// Render bar
const containerElement = window.document.createElement('div');
containerElement.id = 'skip-silence-bar';
window.document.body.appendChild(containerElement);

RenderReact(<Bar config={config} />, containerElement);

// Listen for keyboard shortcuts
browser.runtime.onMessage.addListener((msg) => {
  if (msg.command && msg.command === 'shortcut') {
    const { name } = msg;

    if (name === 'toggle-enable') {
      config.set('enabled', !config.get('enabled'));
    } else if (name === 'increase-playback-speed' || name === 'decrease-playback-speed') {
      // Find out index of the current speed setting
      const currentSpeed = config.get('playback_speed');
      const currentSpeedIndex = speedSettings.findIndex((speed) => currentSpeed === speed) || 2;

      // Increase or decrease the speed
      const newSpeedIndex = name === 'increase-playback-speed' ? currentSpeedIndex + 1 : currentSpeedIndex - 1;
      const newSpeed = speedSettings[newSpeedIndex] || currentSpeed;

      // Update our speed
      config.set('playback_speed', newSpeed);
    } else if (name === 'toggle-command-bar') {
      config.set('is_bar_collapsed', !config.get('is_bar_collapsed'));
    }
  }
});

browser.runtime.sendMessage({ command: 'noElement' });

// Attach the skipper to all media elements
inspectMediaElements((element : MediaElement) => {
  debug("Main: Attaching skipper to new element", element);

  browser.runtime.sendMessage({ command: 'hasElement' });

  new SilenceSkipper(element, config);
});
