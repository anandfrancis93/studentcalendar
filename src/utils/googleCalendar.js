/**
 * Google Calendar Integration
 * Uses Google Identity Services (GIS) for OAuth2 and Calendar API v3.
 */

import { generateId } from './dateUtils';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let tokenClient = null;
let accessToken = null;

/**
 * Load the Google Identity Services library dynamically.
 */
function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google OAuth with the given Client ID.
 * Returns a promise that resolves when ready.
 */
export async function initGoogleAuth(clientId) {
  await loadGISScript();

  return new Promise((resolve) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (tokenResponse) => {
        // This callback is called after the user authorizes
        if (tokenResponse.error) {
          console.error('Google auth error:', tokenResponse);
          return;
        }
        accessToken = tokenResponse.access_token;
      },
    });
    resolve();
  });
}

/**
 * Trigger Google sign-in popup.
 * Returns a promise that resolves with the access token.
 */
export function signInGoogle() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Auth not initialized. Set your Client ID first.'));
      return;
    }

    // Override callback to capture the token
    tokenClient.callback = (tokenResponse) => {
      if (tokenResponse.error) {
        reject(new Error(tokenResponse.error_description || 'Authorization failed'));
        return;
      }
      accessToken = tokenResponse.access_token;
      resolve(accessToken);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Check if we have a valid Google access token.
 */
export function isGoogleSignedIn() {
  return !!accessToken;
}

/**
 * Sign out from Google.
 */
export function signOutGoogle() {
  if (accessToken) {
    window.google?.accounts?.oauth2?.revoke?.(accessToken);
    accessToken = null;
  }
}

/**
 * Fetch events from Google Calendar API.
 * Fetches events from now to 30 days in the future from the primary calendar.
 */
export async function fetchGoogleEvents(token) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 30);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${token || accessToken}` },
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google API error: ${resp.status}`);
  }

  const data = await resp.json();
  return parseGoogleEvents(data.items || []);
}

/**
 * Convert Google Calendar event format to our event format.
 */
function parseGoogleEvents(items) {
  return items.map((item) => {
    const start = item.start?.dateTime || item.start?.date;
    const end = item.end?.dateTime || item.end?.date;

    let dateStr, startTime, endTime;

    if (item.start?.dateTime) {
      // Timed event
      const s = new Date(item.start.dateTime);
      const e = new Date(item.end.dateTime);
      dateStr = s.toISOString().split('T')[0];
      startTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
      endTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
    } else {
      // All-day event
      dateStr = item.start.date;
      startTime = '00:00';
      endTime = '23:59';
    }

    const summary = item.summary || 'Untitled Event';
    const category = guessCategory(summary, item.description || '');

    return {
      id: generateId(),
      title: summary,
      date: dateStr,
      startTime,
      endTime,
      category,
      color: `var(--cat-${category})`,
      notes: [item.description || '', item.location ? `📍 ${item.location}` : ''].filter(Boolean).join('\n'),
      source: 'google',
      googleId: item.id,
    };
  }).filter(Boolean);
}

function guessCategory(summary, description) {
  const text = (summary + ' ' + description).toLowerCase();
  if (/\b(class|lecture|lab|seminar|recitation|section)\b/.test(text)) return 'class';
  if (/\b(study|homework|hw|assignment|quiz|exam|midterm|final|test|paper|essay|reading|due)\b/.test(text)) return 'study';
  if (/\b(gym|workout|exercise|fitness|run|yoga|basketball|football|swim)\b/.test(text)) return 'exercise';
  if (/\b(meeting|club|party|social|hangout|dinner|lunch|coffee)\b/.test(text)) return 'social';
  if (/\b(work|shift|job|intern|office)\b/.test(text)) return 'work';
  if (/\b(doctor|dentist|appointment|personal|errand)\b/.test(text)) return 'personal';
  return 'other';
}
