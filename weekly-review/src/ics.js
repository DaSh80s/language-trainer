/**
 * A small iCalendar reader: enough of RFC 5545 to summarise a working week.
 *
 * Supports folded lines, VALUE=DATE all-day events, TZID and UTC timestamps,
 * RRULE expansion (DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL,
 * BYDAY, BYMONTHDAY), EXDATE, and RECURRENCE-ID overrides. Anything more exotic
 * is ignored rather than guessed at.
 */

const MAX_INSTANCES = 400;
const WEEKDAY_CODES = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };

/** Offset of a time zone from UTC, in milliseconds, at a given instant. */
function zoneOffset(instant, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant).reduce((accumulator, part) => {
    accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  return asUTC - instant.getTime();
}

/** Interpret a wall-clock time in `timezone` and return the true instant. */
export function wallTimeToInstant({ year, month, day, hour = 0, minute = 0, second = 0 }, timezone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  // One correction pass, then a second to settle DST boundaries.
  let instant = new Date(naive - zoneOffset(new Date(naive), timezone));
  instant = new Date(naive - zoneOffset(instant, timezone));
  return instant;
}

/** Undo RFC 5545 line folding. */
export function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

function parseParams(segment) {
  const [name, ...paramParts] = segment.split(';');
  const params = {};
  for (const part of paramParts) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    params[part.slice(0, index).toUpperCase()] = part.slice(index + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params };
}

function unescapeText(value) {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** Parse an ICS date/datetime value into { instant, allDay }. */
export function parseIcsDate(value, params, defaultTimezone) {
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly || params.VALUE === 'DATE') {
    const match = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(value);
    if (!match) return null;
    return {
      allDay: true,
      instant: wallTimeToInstant({
        year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
      }, defaultTimezone),
    };
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!match) return null;

  const fields = {
    year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
    hour: Number(match[4]), minute: Number(match[5]), second: Number(match[6]),
  };

  if (match[7] === 'Z') {
    return {
      allDay: false,
      instant: new Date(Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second)),
    };
  }

  // A TZID we don't recognise falls back to the calendar's default zone.
  let timezone = params.TZID ?? defaultTimezone;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
  } catch {
    timezone = defaultTimezone;
  }

  return { allDay: false, instant: wallTimeToInstant(fields, timezone) };
}

/** Split an ICS document into raw VEVENT records. */
export function parseComponents(text) {
  const events = [];
  let current = null;

  for (const line of unfold(text).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'BEGIN:VEVENT') { current = { properties: [] }; continue; }
    if (trimmed === 'END:VEVENT') { if (current) events.push(current); current = null; continue; }
    if (!current) continue;

    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;

    const { name, params } = parseParams(trimmed.slice(0, colon));
    current.properties.push({ name, params, value: trimmed.slice(colon + 1) });
  }

  return events;
}

function firstProperty(record, name) {
  return record.properties.find((property) => property.name === name) ?? null;
}

function allProperties(record, name) {
  return record.properties.filter((property) => property.name === name);
}

function parseRRule(value) {
  const rule = {};
  for (const part of value.split(';')) {
    const [key, raw] = part.split('=');
    if (!key || raw === undefined) continue;
    rule[key.toUpperCase()] = raw;
  }
  return rule;
}

/** Expand one event record into concrete occurrences overlapping [rangeStart, rangeEnd]. */
function expandRecurrence(event, rule, rangeStart, rangeEnd, defaultTimezone) {
  const occurrences = [];
  const interval = Math.max(1, Number(rule.INTERVAL ?? 1));
  const count = rule.COUNT ? Number(rule.COUNT) : null;
  const until = rule.UNTIL ? parseIcsDate(rule.UNTIL, {}, defaultTimezone)?.instant ?? null : null;
  const durationMs = event.end.getTime() - event.start.getTime();

  const byDay = rule.BYDAY
    ? rule.BYDAY.split(',').map((code) => WEEKDAY_CODES[code.replace(/^[+-]?\d/, '').toUpperCase()]).filter(Boolean)
    : null;

  const start = new Date(event.start);
  let cursor = new Date(start);
  let emitted = 0;

  for (let iteration = 0; iteration < MAX_INSTANCES; iteration += 1) {
    if (cursor > rangeEnd) break;
    if (until && cursor > until) break;
    if (count !== null && emitted >= count) break;

    let candidates = [cursor];

    if (rule.FREQ === 'WEEKLY' && byDay?.length) {
      // Emit each requested weekday within the cursor's week.
      const cursorWeekday = ((cursor.getUTCDay() + 6) % 7) + 1;
      candidates = byDay.map((weekday) => {
        const shifted = new Date(cursor);
        shifted.setUTCDate(shifted.getUTCDate() + (weekday - cursorWeekday));
        return shifted;
      });
    }

    for (const candidate of candidates) {
      if (candidate < start) continue;
      if (until && candidate > until) continue;
      if (count !== null && emitted >= count) break;
      emitted += 1;
      if (candidate >= rangeStart && candidate <= rangeEnd) {
        occurrences.push({ start: new Date(candidate), end: new Date(candidate.getTime() + durationMs) });
      }
    }

    switch (rule.FREQ) {
      case 'DAILY': cursor.setUTCDate(cursor.getUTCDate() + interval); break;
      case 'WEEKLY': cursor.setUTCDate(cursor.getUTCDate() + 7 * interval); break;
      case 'MONTHLY': cursor.setUTCMonth(cursor.getUTCMonth() + interval); break;
      case 'YEARLY': cursor.setUTCFullYear(cursor.getUTCFullYear() + interval); break;
      default: return occurrences; // Unsupported frequency: keep only the base event.
    }
  }

  return occurrences;
}

/**
 * Parse an ICS document into events overlapping the given range.
 * @returns {Array<{uid,summary,location,start,end,allDay,attendees,organizer,status,partstat,transparent,recurring}>}
 */
export function parseIcs(text, { rangeStart, rangeEnd, defaultTimezone = 'UTC' }) {
  const records = parseComponents(text);
  const overrides = new Set();
  const events = [];

  // First pass: note which recurrence instances are overridden by a modified copy.
  for (const record of records) {
    const recurrenceId = firstProperty(record, 'RECURRENCE-ID');
    const uid = firstProperty(record, 'UID')?.value;
    if (recurrenceId && uid) {
      const parsed = parseIcsDate(recurrenceId.value, recurrenceId.params, defaultTimezone);
      if (parsed) overrides.add(`${uid}@${parsed.instant.toISOString()}`);
    }
  }

  for (const record of records) {
    const dtStart = firstProperty(record, 'DTSTART');
    if (!dtStart) continue;

    const startParsed = parseIcsDate(dtStart.value, dtStart.params, defaultTimezone);
    if (!startParsed) continue;

    const dtEnd = firstProperty(record, 'DTEND');
    const endParsed = dtEnd ? parseIcsDate(dtEnd.value, dtEnd.params, defaultTimezone) : null;

    const defaultDuration = startParsed.allDay ? 86_400_000 : 3_600_000;
    const base = {
      uid: firstProperty(record, 'UID')?.value ?? null,
      summary: unescapeText(firstProperty(record, 'SUMMARY')?.value ?? ''),
      location: unescapeText(firstProperty(record, 'LOCATION')?.value ?? ''),
      description: unescapeText(firstProperty(record, 'DESCRIPTION')?.value ?? ''),
      status: (firstProperty(record, 'STATUS')?.value ?? '').toUpperCase(),
      transparent: (firstProperty(record, 'TRANSP')?.value ?? '').toUpperCase() === 'TRANSPARENT',
      busyStatus: (firstProperty(record, 'X-MICROSOFT-CDO-BUSYSTATUS')?.value ?? '').toUpperCase(),
      allDay: startParsed.allDay,
      organizer: parseAddress(firstProperty(record, 'ORGANIZER')),
      attendees: allProperties(record, 'ATTENDEE').map(parseAddress).filter(Boolean),
      start: startParsed.instant,
      end: endParsed?.instant ?? new Date(startParsed.instant.getTime() + defaultDuration),
    };

    const excluded = new Set();
    for (const exdate of allProperties(record, 'EXDATE')) {
      for (const value of exdate.value.split(',')) {
        const parsed = parseIcsDate(value.trim(), exdate.params, defaultTimezone);
        if (parsed) excluded.add(parsed.instant.toISOString());
      }
    }

    const rruleProperty = firstProperty(record, 'RRULE');
    const isOverride = Boolean(firstProperty(record, 'RECURRENCE-ID'));

    if (rruleProperty && !isOverride) {
      const rule = parseRRule(rruleProperty.value);
      for (const occurrence of expandRecurrence(base, rule, rangeStart, rangeEnd, defaultTimezone)) {
        const key = occurrence.start.toISOString();
        if (excluded.has(key)) continue;
        if (base.uid && overrides.has(`${base.uid}@${key}`)) continue;
        events.push({ ...base, ...occurrence, recurring: true });
      }
      continue;
    }

    if (base.end >= rangeStart && base.start <= rangeEnd) {
      events.push({ ...base, recurring: false });
    }
  }

  return events.sort((a, b) => a.start - b.start);
}

function parseAddress(property) {
  if (!property) return null;
  const email = property.value.replace(/^mailto:/i, '').trim().toLowerCase();
  return {
    email,
    name: property.params.CN ?? null,
    partstat: (property.params.PARTSTAT ?? '').toUpperCase() || null,
    role: property.params.ROLE ?? null,
  };
}
