/**
 * Content Script
 * This script will be loaded into all pages
 */
import debug from '../shared/debug';
import ConfigProvider from '../shared/configProvider';
import { MediaElement } from '../shared/types';

import inspectMediaElements from './lib/InspectMediaElements';
import SilenceSkipper from './lib/SilenceSkipper';

// Create config provider so we can exchange information with the popup
const config = new ConfigProvider("content");
config.onUpdate(() => {
  debug("Main: Updated config: ", config.config);
});

// Attach the skipper to all media elements
inspectMediaElements((element : MediaElement) => {
  debug("Main: Attaching skipper to new element", element);

  new SilenceSkipper(element, config);
});
