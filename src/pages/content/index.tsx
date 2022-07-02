/**
 * Content Script
 * This script will be loaded into all pages
 */
import { browser } from 'webextension-polyfill-ts';
import React from 'react';
import { render as RenderReact } from 'react-dom';

import Bar from './command-bar/Bar';
import debug from '../shared/debug';
import ConfigProvider from '../shared/configProvider';
import { MediaElement } from '../shared/types';
import speedSettings from '../shared/speedSettings';
import SpeedController from './SpeedController';
import AudioSync from './AudioSync';

const config = new ConfigProvider('content');
const speedController = new SpeedController();
new AudioSync(config);
let mediaSpeed = 1;

config.onUpdate(() => {
  const shouldBeMediaSpeed = config.get('media_speed');

  if (shouldBeMediaSpeed !== mediaSpeed) {
    mediaSpeed = shouldBeMediaSpeed;

    debug('Media speed changed to', mediaSpeed);
    speedController.setPlaybackRate(config.get('media_speed'));
  }
});

// Render bar
const containerElement = window.document.createElement('div');
containerElement.id = 'skip-silence-bar';
window.document.body.appendChild(containerElement);

RenderReact(<Bar config={config} />, containerElement);

// Listen for keyboard shortcuts
browser.runtime.onMessage.addListener((msg) => {
  if (!msg.command) return;

  if (msg.command === 'shortcut') {
    const { name } = msg;

    if (name === 'toggle-enable') {
      config.set('enabled', !config.get('enabled'));
    } else if (
      name === 'increase-playback-speed' ||
      name === 'decrease-playback-speed'
    ) {
      // Find out index of the current speed setting
      const currentSpeed = config.get('playback_speed');
      const currentSpeedIndex =
        speedSettings.findIndex((speed) => currentSpeed === speed) || 2;

      // Increase or decrease the speed
      const newSpeedIndex =
        name === 'increase-playback-speed'
          ? currentSpeedIndex + 1
          : currentSpeedIndex - 1;
      const newSpeed = speedSettings[newSpeedIndex] || currentSpeed;

      // Update our speed
      config.set('playback_speed', newSpeed);
    } else if (name === 'toggle-command-bar') {
      config.set('is_bar_collapsed', !config.get('is_bar_collapsed'));
    }
  } else if (msg.command === 'reload') {
    window.location.reload();
  }
});

browser.runtime.sendMessage({ command: 'request-activation' });
