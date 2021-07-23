/**
 * Skip Silence Analytics helpers
 */

import debug from "./debug";

/**
 * Setup Analytics Tags
 */
export function setupAnalytics() {
  const sa = document.createElement('script');
  sa.src = "https://scripts.simpleanalyticscdn.com/latest.dev.js";
  sa.id = "simpleanalytics";
  sa.async = true;
  sa.defer = true;
  sa.setAttribute('data-collect-dnt', 'true');
  sa.setAttribute('data-hostname', 'skipsilence.analytics.vantezzen.io');
  document.body.appendChild(sa);

  const plausible = document.createElement('script');
  plausible.setAttribute('data-domain', 'skipsilence.a.vantezzen.io');
  plausible.async = true;
  plausible.defer = true;
  plausible.src = "https://a.vantezzen.io/js/plausible.js";
  document.body.appendChild(plausible);
}

/**
 * Track a new event
 * 
 * @param {string} name - The name of the event to track
 */
export default function trackEvent(name : string, data ?: { [key: string]: any }) {
  debug(`Analytics: New event "${name}"`, data);

  window.sa_event(name);
  if (data) {
    window.plausible(name, { props: data });
  } else {
    window.plausible(name);
  }
}