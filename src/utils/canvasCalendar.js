/**
 * Canvas LMS Calendar Integration
 * Fetches events via the Canvas iCal feed URL through a CORS proxy.
 */

import { parseICS } from './icsParser';

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

/**
 * Fetch and parse events from a Canvas iCal feed URL.
 *
 * How to find your Canvas feed URL:
 * 1. Log in to Canvas
 * 2. Go to Calendar
 * 3. Click "Calendar Feed" link (bottom of page)
 * 4. Copy the URL (looks like https://your-school.instructure.com/feeds/calendars/user_xxxx.ics)
 */
export async function fetchCanvasEvents(feedUrl) {
  if (!feedUrl) {
    throw new Error('Please provide your Canvas calendar feed URL.');
  }

  // Validate URL format
  if (!feedUrl.includes('.ics') && !feedUrl.includes('instructure.com') && !feedUrl.includes('canvas')) {
    throw new Error('This doesn\'t look like a Canvas feed URL. It should end in .ics or come from your Canvas calendar settings.');
  }

  let icsText = null;
  let lastError = null;

  // Try each CORS proxy
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(feedUrl), {
        headers: {
          'Accept': 'text/calendar, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      icsText = await response.text();

      // Validate it's actually ICS content
      if (!icsText.includes('BEGIN:VCALENDAR')) {
        throw new Error('Response is not a valid iCal feed.');
      }

      break; // Success
    } catch (err) {
      lastError = err;
      continue; // Try next proxy
    }
  }

  if (!icsText) {
    throw new Error(
      `Failed to fetch Canvas feed. ${lastError?.message || ''}\n\n` +
      'Make sure you\'re using the correct Calendar Feed URL from Canvas. ' +
      'Go to Canvas → Calendar → click "Calendar Feed" at the bottom.'
    );
  }

  // Parse the ICS content
  const events = parseICS(icsText);

  // Tag all events as coming from Canvas
  return events.map(e => ({
    ...e,
    source: 'canvas',
  }));
}

/**
 * Validate a Canvas feed URL format.
 */
export function isValidCanvasFeedUrl(url) {
  if (!url) return false;
  try {
    new URL(url);
    return url.includes('.ics') || url.includes('instructure.com') || url.includes('canvas');
  } catch {
    return false;
  }
}
