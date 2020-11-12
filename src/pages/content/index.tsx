/**
 * Content Script
 * This script will be loaded into all pages
 */
import { browser } from "webextension-polyfill-ts";
import React from 'react';
import { render as RenderReact } from 'react-dom';

import Bar from './control-bar/Bar';
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


browser.runtime.sendMessage({ command: 'noElement' });

// Attach the skipper to all media elements
inspectMediaElements((element : MediaElement) => {
  debug("Main: Attaching skipper to new element", element);

  browser.runtime.sendMessage({ command: 'hasElement' });

  new SilenceSkipper(element, config);
});
