/**
 * Content Script
 * This script will be loaded into all pages
 */
import { browser } from 'webextension-polyfill-ts';
import debug from '../shared/debug';
import ConfigProvider from '../shared/configProvider';
import { isChromium } from '../shared/platform';
import setupKeyboardShortcuts from './keyboardShortcuts';
import renderCommandBar from './renderCommandBar';
import setupBrowserContent from './browserSetup/shared';
import setupFirefoxContent from './browserSetup/firefox';

const config = new ConfigProvider('content');

setupBrowserContent(config);
if (!isChromium) {
  setupFirefoxContent(config);
}

renderCommandBar(config);
setupKeyboardShortcuts(config);

browser.runtime.sendMessage({ command: 'request-activation' });
