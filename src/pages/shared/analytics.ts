/**
 * Skip Silence Analytics helpers
 */

import debug from './debug';

/**
 * Setup Analytics Tags
 */
export function setupAnalytics() {
  const sa = document.createElement('script');
  sa.src = '/assets/external/simpleanalytics.js';
  sa.id = 'simpleanalytics';
  sa.async = true;
  sa.defer = true;
  sa.setAttribute('data-collect-dnt', 'true');
  sa.setAttribute('data-hostname', 'skipsilence.analytics.vantezzen.io');
  document.body.appendChild(sa);
}

/**
 * Track a new event
 *
 * @param {string} name - The name of the event to track
 */
export default function trackEvent(
  name: string,
  data?: { [key: string]: any }
) {
  debug(`Analytics: New event "${name}"`, data);

  window.sa_event(name);
}
