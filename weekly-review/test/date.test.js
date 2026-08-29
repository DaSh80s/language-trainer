import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addDays, diffDays, easterSunday, isoWeek, isoWeekday, nextHolidayAfter,
  nextSeasonStart, seasonOf, startOfISOWeek, swissHolidays, workingDaysLeftInYear,
  yearProgress,
} from '../src/util/date.js';

test('ISO week numbering follows the Thursday rule', () => {
  assert.deepEqual(isoWeek('2026-08-29'), { year: 2026, week: 35 });
  assert.deepEqual(isoWeek('2026-08-31'), { year: 2026, week: 36 });
  // 1 January 2027 is a Friday, so it belongs to week 53 of ISO year 2026.
  assert.deepEqual(isoWeek('2027-01-01'), { year: 2026, week: 53 });
  assert.deepEqual(isoWeek('2026-01-01'), { year: 2026, week: 1 });
});

test('day arithmetic is unaffected by daylight saving transitions', () => {
  // Europe/Zurich springs forward on 29 March 2026 and back on 25 October 2026.
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(diffDays('2026-03-01', '2026-11-01'), 245);
});

test('ISO weekday and week start', () => {
  assert.equal(isoWeekday('2026-08-31'), 1);
  assert.equal(isoWeekday('2026-08-30'), 7);
  assert.equal(startOfISOWeek('2026-08-29'), '2026-08-24');
});

test('Easter and the holidays derived from it', () => {
  assert.equal(easterSunday(2026), '2026-04-05');
  assert.equal(easterSunday(2027), '2027-03-28');

  const holidays = swissHolidays(2026);
  const byName = Object.fromEntries(holidays.map((holiday) => [holiday.name, holiday.day]));
  assert.equal(byName['Good Friday'], '2026-04-03');
  assert.equal(byName['Easter Monday'], '2026-04-06');
  assert.equal(byName['Ascension Day'], '2026-05-14');
  assert.equal(byName['Swiss National Day'], '2026-08-01');
});

test('next holiday looks into the following year when needed', () => {
  assert.equal(nextHolidayAfter('2026-12-27').day, '2027-01-01');
});

test('seasons roll over correctly', () => {
  assert.equal(seasonOf('2026-08-29').name, 'Summer');
  assert.equal(seasonOf('2026-01-15').name, 'Winter');
  assert.equal(seasonOf('2026-01-15').start, '2025-12-21');
  assert.equal(nextSeasonStart('2026-08-29').name, 'Autumn');
  assert.equal(nextSeasonStart('2026-12-25').start, '2027-03-20');
});

test('year progress counts the current day as elapsed', () => {
  const progress = yearProgress('2026-12-31');
  assert.equal(progress.dayOfYear, 365);
  assert.equal(progress.remainingDays, 0);
  assert.equal(yearProgress('2024-12-31').totalDays, 366);
});

test('working days exclude weekends and public holidays', () => {
  // 28-31 December 2026: Mon 28, Tue 29, Wed 30, Thu 31 are all working days.
  assert.equal(workingDaysLeftInYear('2026-12-27'), 4);
  // From 24 December: 25th and 26th are holidays, 27th is a Sunday.
  assert.equal(workingDaysLeftInYear('2026-12-24'), 4);
});
