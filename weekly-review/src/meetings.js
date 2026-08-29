/**
 * Block 3: notable meetings next week.
 *
 * Calendar text is untrusted input — the handoff found injected instructions
 * inside a subscribed feed — so every string that leaves this module is
 * sanitised, truncated, and passed onward as data. Nothing here interprets a
 * calendar entry as an instruction, and the include/exclude decision is made
 * by these rules rather than by a model reading the titles.
 */

import { parseIcs } from './ics.js';
import { addDays, instantToDay, startOfISOWeek } from './util/date.js';

const MAX_TITLE_LENGTH = 120;

/**
 * Drop invisible characters and neutralise control characters.
 *
 * Bidi overrides and zero-width joiners are how text hides one instruction
 * inside another, so they are removed outright rather than escaped.
 */
function stripUnsafeCharacters(value) {
  let out = '';
  for (const character of value) {
    const code = character.codePointAt(0);

    const isInvisible =
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0x2060 ||
      code === 0xfeff;
    if (isInvisible) continue;

    const isControl = code < 0x20 || code === 0x7f;
    out += isControl ? ' ' : character;
  }
  return out;
}

/** Strip unsafe characters, collapse whitespace, truncate. */
export function sanitiseText(value, maxLength = MAX_TITLE_LENGTH) {
  if (!value) return '';
  const cleaned = stripUnsafeCharacters(value).replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

function domainOf(email) {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

function matchesAny(text, needles) {
  const lower = text.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

/** Decide whether one event belongs in the review, and why. */
export function classifyEvent(event, meetingsConfig) {
  const summary = sanitiseText(event.summary);
  const selfEmails = (meetingsConfig.selfEmails ?? []).map((email) => email.toLowerCase());

  if (event.status === 'CANCELLED') return { include: false, reason: 'cancelled' };

  if (meetingsConfig.excludeDeclined) {
    const declined = event.attendees.some(
      (attendee) => attendee.partstat === 'DECLINED'
        && (selfEmails.length === 0 || selfEmails.includes(attendee.email)),
    );
    if (declined) return { include: false, reason: 'declined' };
  }

  if (event.allDay && meetingsConfig.excludeAllDayInformational) {
    return { include: false, reason: 'all-day informational' };
  }

  if (matchesAny(summary, meetingsConfig.excludeTitles)) {
    return { include: false, reason: 'routine or informational title' };
  }

  const durationMinutes = (event.end - event.start) / 60000;
  if (durationMinutes < meetingsConfig.minDurationMinutes) {
    return { include: false, reason: 'too short' };
  }

  const externalAttendees = event.attendees.filter((attendee) => {
    const domain = domainOf(attendee.email);
    return domain && !meetingsConfig.internalDomains.includes(domain);
  });

  if (externalAttendees.length) {
    return { include: true, reason: 'external attendee', externalAttendees };
  }

  if (matchesAny(summary, meetingsConfig.alwaysIncludeTitles)) {
    return { include: true, reason: 'notable by title', externalAttendees: [] };
  }

  return { include: false, reason: 'internal, no external attendee' };
}

/** Fetch and parse every configured ICS feed. Feed failures degrade, never throw. */
export async function loadFeeds(feeds, { rangeStart, rangeEnd, timezone, fetchImpl = fetch, logger = console }) {
  const events = [];
  const problems = [];

  for (const feed of feeds) {
    try {
      const response = await fetchImpl(feed.url, { redirect: 'follow' });
      if (!response.ok) {
        problems.push(`Feed "${feed.label}" returned HTTP ${response.status}.`);
        continue;
      }
      const text = await response.text();
      const parsed = parseIcs(text, { rangeStart, rangeEnd, defaultTimezone: timezone });
      events.push(...parsed.map((event) => ({ ...event, feed: feed.label })));
    } catch (error) {
      problems.push(`Feed "${feed.label}" could not be read: ${error.message}`);
      logger.warn?.(`ICS feed failed: ${feed.label}: ${error.message}`);
    }
  }

  return { events, problems };
}

export function meetingWindow(referenceDay) {
  const monday = addDays(startOfISOWeek(referenceDay), 7);
  return { start: monday, end: addDays(monday, 6) };
}

export async function computeMeetings({ feeds, config, referenceDay, fetchImpl, logger = console }) {
  const window = meetingWindow(referenceDay);
  const timezone = config.timezone;

  if (!feeds?.length) {
    return {
      window,
      available: false,
      reason: 'No calendar feeds are configured, so the meetings section was skipped rather than guessed at.',
      days: [],
      counts: { included: 0, excluded: 0 },
      problems: [],
    };
  }

  const rangeStart = new Date(`${window.start}T00:00:00Z`);
  const rangeEnd = new Date(`${addDays(window.end, 1)}T00:00:00Z`);

  const { events, problems } = await loadFeeds(feeds, {
    rangeStart, rangeEnd, timezone, fetchImpl, logger,
  });

  const timeFormatter = new Intl.DateTimeFormat(config.locale, {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const included = [];
  const excludedReasons = new Map();
  const seen = new Set();

  for (const event of events) {
    const verdict = classifyEvent(event, config.meetings);
    if (!verdict.include) {
      excludedReasons.set(verdict.reason, (excludedReasons.get(verdict.reason) ?? 0) + 1);
      continue;
    }

    // The same meeting can appear in two feeds; keep one copy.
    const key = `${sanitiseText(event.summary).toLowerCase()}@${event.start.toISOString()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    included.push({
      title: sanitiseText(event.summary),
      day: instantToDay(event.start, timezone),
      startTime: timeFormatter.format(event.start),
      endTime: timeFormatter.format(event.end),
      durationMinutes: Math.round((event.end - event.start) / 60000),
      location: sanitiseText(event.location, 60),
      feed: event.feed,
      recurring: event.recurring,
      reason: verdict.reason,
      externalOrganisations: [
        ...new Set((verdict.externalAttendees ?? []).map((attendee) => domainOf(attendee.email))),
      ].slice(0, 4),
      attendeeCount: event.attendees.length,
    });
  }

  included.sort((a, b) => (a.day === b.day
    ? a.startTime.localeCompare(b.startTime)
    : a.day.localeCompare(b.day)));

  const byDay = new Map();
  for (const meeting of included) {
    if (!byDay.has(meeting.day)) byDay.set(meeting.day, []);
    byDay.get(meeting.day).push(meeting);
  }

  return {
    window,
    available: true,
    days: [...byDay.entries()].map(([day, meetings]) => ({ day, meetings })),
    counts: {
      included: included.length,
      excluded: [...excludedReasons.values()].reduce((sum, count) => sum + count, 0),
      excludedByReason: Object.fromEntries(excludedReasons),
    },
    problems,
  };
}
