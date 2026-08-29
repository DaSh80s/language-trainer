import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseIcs, wallTimeToInstant } from '../src/ics.js';
import { classifyEvent, computeMeetings, meetingWindow, sanitiseText } from '../src/meetings.js';

const here = dirname(fileURLToPath(import.meta.url));
const icsText = await readFile(resolve(here, 'fixtures.ics'), 'utf8');

const parse = () => parseIcs(icsText, {
  rangeStart: new Date('2026-08-31T00:00:00Z'),
  rangeEnd: new Date('2026-09-07T23:59:00Z'),
  defaultTimezone: 'Europe/Zurich',
});

const MEETINGS_CONFIG = {
  internalDomains: ['rigby.ch', 'rigbyag.onmicrosoft.com'],
  selfEmails: ['daniel@rigby.ch'],
  excludeTitles: ['daily meeting', 'friday forum', 'focus', 'school holiday', 'arsenal'],
  excludeAllDayInformational: true,
  excludeDeclined: true,
  alwaysIncludeTitles: ['interview', 'coffee', '1:1', 'client', 'conference'],
  minDurationMinutes: 15,
};

const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);

test('wall-clock times respect the zone offset in force on that date', () => {
  // Summer: Zurich is UTC+2. Winter: UTC+1.
  assert.equal(
    wallTimeToInstant({ year: 2026, month: 7, day: 1, hour: 9 }, 'Europe/Zurich').toISOString(),
    '2026-07-01T07:00:00.000Z',
  );
  assert.equal(
    wallTimeToInstant({ year: 2026, month: 12, day: 1, hour: 9 }, 'Europe/Zurich').toISOString(),
    '2026-12-01T08:00:00.000Z',
  );
});

test('a weekly recurring event is expanded across the window', () => {
  const standups = parse().filter((event) => event.summary === 'Daily Meeting');
  assert.equal(standups.length, 6); // Mon-Fri of week 36, plus Monday 7 September.
  assert.ok(standups.every((event) => event.recurring));
});

test('a moved occurrence replaces the original, without duplicating it', () => {
  const oneToOnes = parse().filter((event) => event.summary.startsWith('1:1 with Chiara'));
  const septemberSeventh = oneToOnes.filter((event) => event.start.toISOString().startsWith('2026-09-07'));
  assert.equal(septemberSeventh.length, 1);
  assert.equal(septemberSeventh[0].summary, '1:1 with Chiara (moved)');
  assert.equal(septemberSeventh[0].start.toISOString(), '2026-09-07T09:00:00.000Z'); // 11:00 Zurich
});

test('all-day events are recognised', () => {
  const allDay = parse().filter((event) => event.allDay);
  assert.equal(allDay.length, 1);
  assert.match(allDay[0].summary, /School Holidays/);
});

test('invisible characters are stripped from calendar text', () => {
  const hidden = `Meeting${ZERO_WIDTH_SPACE}with${RIGHT_TO_LEFT_OVERRIDE}client`;
  const cleaned = sanitiseText(hidden);
  const codePoints = [...cleaned].map((character) => character.codePointAt(0));
  assert.ok(!codePoints.includes(0x200b));
  assert.ok(!codePoints.includes(0x202e));
  assert.equal(cleaned, 'Meetingwithclient');
});

test('control characters become spaces rather than surviving into the page', () => {
  const cleaned = sanitiseText(`Board${String.fromCodePoint(0x07)}meeting`);
  assert.equal(cleaned, 'Board meeting');
});

test('titles are truncated so a long injected payload cannot dominate', () => {
  const cleaned = sanitiseText('x'.repeat(500));
  assert.equal(cleaned.length, 120);
});

test('classification includes external meetings and excludes the noise', () => {
  const events = parse();
  const verdict = (summaryStart) =>
    classifyEvent(events.find((event) => event.summary.startsWith(summaryStart)), MEETINGS_CONFIG);

  assert.equal(verdict('Lunch with Novartis').include, true);
  assert.equal(verdict('Lunch with Novartis').reason, 'external attendee');
  assert.equal(verdict('1:1 with Chiara').include, true);
  assert.equal(verdict('Daily Meeting').include, false);
  assert.equal(verdict('Vendor pitch').include, false);
  assert.equal(verdict('Vendor pitch').reason, 'declined');
  assert.equal(verdict('Zurich School Holidays').include, false);
});

test('an injected instruction in a feed is filtered out as data, never obeyed', async () => {
  const result = await computeMeetings({
    feeds: [{ label: 'Work', url: 'fixture' }],
    config: { timezone: 'Europe/Zurich', locale: 'en-GB', meetings: MEETINGS_CONFIG },
    referenceDay: '2026-08-29',
    fetchImpl: async () => ({ ok: true, text: async () => icsText }),
  });

  const titles = result.days.flatMap((day) => day.meetings.map((meeting) => meeting.title));
  assert.ok(!titles.some((title) => /IGNORE PREVIOUS/i.test(title)));
  assert.equal(result.counts.included, 2);
});

test('the meetings window is the coming Monday to Sunday', () => {
  assert.deepEqual(meetingWindow('2026-08-29'), { start: '2026-08-31', end: '2026-09-06' });
  assert.deepEqual(meetingWindow('2026-08-31'), { start: '2026-09-07', end: '2026-09-13' });
});

test('a broken feed degrades to a reported problem rather than an exception', async () => {
  const result = await computeMeetings({
    feeds: [{ label: 'Broken', url: 'fixture' }],
    config: { timezone: 'Europe/Zurich', locale: 'en-GB', meetings: MEETINGS_CONFIG },
    referenceDay: '2026-08-29',
    fetchImpl: async () => { throw new Error('DNS failure'); },
    logger: { warn: () => {} },
  });
  assert.equal(result.counts.included, 0);
  assert.match(result.problems[0], /DNS failure/);
});

test('with no feeds configured the section says so instead of inventing meetings', async () => {
  const result = await computeMeetings({
    feeds: [],
    config: { timezone: 'Europe/Zurich', locale: 'en-GB', meetings: MEETINGS_CONFIG },
    referenceDay: '2026-08-29',
  });
  assert.equal(result.available, false);
  assert.equal(result.days.length, 0);
});
