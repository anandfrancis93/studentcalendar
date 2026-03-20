/**
 * ICS/iCal Parser
 * Parses .ics file content into our event format.
 */

import { generateId } from './dateUtils';

/**
 * Parse an ICS string and return an array of event objects.
 */
export function parseICS(icsText) {
  const events = [];
  const lines = unfoldLines(icsText);

  let inEvent = false;
  let eventProps = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      eventProps = {};
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false;
      const event = propsToEvent(eventProps);
      if (event) events.push(event);
      continue;
    }

    if (inEvent) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = trimmed.substring(0, colonIdx);
        const value = trimmed.substring(colonIdx + 1);
        // Strip parameters like DTSTART;TZID=... → just use DTSTART
        const key = keyPart.split(';')[0].toUpperCase();
        eventProps[key] = value;
      }
    }
  }

  return events;
}

/**
 * Unfold ICS lines (lines starting with space/tab are continuations).
 */
function unfoldLines(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

/**
 * Convert raw ICS properties to our event format.
 */
function propsToEvent(props) {
  const summary = unescapeICS(props.SUMMARY || '');
  if (!summary) return null;

  const dtstart = parseICSDate(props.DTSTART);
  const dtend = parseICSDate(props.DTEND);

  if (!dtstart) return null;

  const description = unescapeICS(props.DESCRIPTION || '');
  const location = unescapeICS(props.LOCATION || '');

  // Guess category from summary/description
  const category = guessCategory(summary, description);

  return {
    id: generateId(),
    title: summary,
    date: dtstart.dateStr,
    startTime: dtstart.timeStr || '00:00',
    endTime: dtend?.timeStr || dtstart.timeStr || '00:00',
    category,
    color: `var(--cat-${category})`,
    notes: [description, location ? `📍 ${location}` : ''].filter(Boolean).join('\n'),
    source: 'ics-import',
  };
}

/**
 * Parse an ICS date string (20260319T140000Z or 20260319).
 */
function parseICSDate(str) {
  if (!str) return null;

  // Remove any TZID prefix value
  const clean = str.replace(/^.*:/, '').trim();

  // Full datetime: 20260319T140000Z or 20260319T140000
  const dtMatch = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (dtMatch) {
    const [, y, m, d, hh, mm] = dtMatch;
    return {
      dateStr: `${y}-${m}-${d}`,
      timeStr: `${hh}:${mm}`,
    };
  }

  // Date only: 20260319
  const dMatch = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dMatch) {
    const [, y, m, d] = dMatch;
    return {
      dateStr: `${y}-${m}-${d}`,
      timeStr: null,
    };
  }

  return null;
}

/**
 * Unescape ICS text values.
 */
function unescapeICS(str) {
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Guess event category from text.
 */
function guessCategory(summary, description) {
  const text = (summary + ' ' + description).toLowerCase();
  if (/\b(class|lecture|lab|seminar|recitation|section)\b/.test(text)) return 'class';
  if (/\b(study|homework|hw|assignment|quiz|exam|midterm|final|test|paper|essay|reading|due)\b/.test(text)) return 'study';
  if (/\b(gym|workout|exercise|fitness|run|yoga|basketball|football|swim|training)\b/.test(text)) return 'exercise';
  if (/\b(meeting|club|party|social|hangout|dinner|lunch|coffee|friend)\b/.test(text)) return 'social';
  if (/\b(work|shift|job|intern|office)\b/.test(text)) return 'work';
  if (/\b(doctor|dentist|appointment|personal|errand|grocery)\b/.test(text)) return 'personal';
  return 'other';
}

/**
 * Generate an ICS string from our events array.
 */
export function generateICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudentCal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const dtstart = toICSDateTime(event.date, event.startTime);
    const dtend = toICSDateTime(event.date, event.endTime || event.startTime);

    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    if (event.notes) {
      lines.push(`DESCRIPTION:${escapeICS(event.notes)}`);
    }
    lines.push(`UID:${event.id}@studentcal`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function toICSDateTime(dateStr, timeStr) {
  const d = dateStr.replace(/-/g, '');
  const t = (timeStr || '00:00').replace(':', '') + '00';
  return `${d}T${t}`;
}

function escapeICS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
