/**
 * Calendar-day arithmetic that is safe across time zones.
 *
 * A "day" here is always the string 'YYYY-MM-DD'. Internally days are anchored
 * to 12:00 UTC so that adding days can never slip across a boundary because of
 * a daylight-saving shift.
 */

const MS_PER_DAY = 86_400_000;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function assertDay(day) {
  if (typeof day !== 'string' || !DAY_RE.test(day)) {
    throw new TypeError(`Expected a 'YYYY-MM-DD' day string, got ${JSON.stringify(day)}`);
  }
  return day;
}

/** The current calendar day in the given IANA time zone. */
export function todayInZone(timezone, now = new Date()) {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we want.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Convert an instant (or ISO timestamp) to the calendar day it falls on in a zone. */
export function instantToDay(instant, timezone) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  return todayInZone(timezone, date);
}

export function dayToUTC(day) {
  const [, y, m, d] = DAY_RE.exec(assertDay(day));
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12));
}

export function utcToDay(date) {
  return date.toISOString().slice(0, 10);
}

export function makeDay(year, month, dayOfMonth) {
  return utcToDay(new Date(Date.UTC(year, month - 1, dayOfMonth, 12)));
}

export function addDays(day, count) {
  const date = dayToUTC(day);
  date.setUTCDate(date.getUTCDate() + count);
  return utcToDay(date);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from, to) {
  return Math.round((dayToUTC(to) - dayToUTC(from)) / MS_PER_DAY);
}

export function compareDays(a, b) {
  return assertDay(a) < assertDay(b) ? -1 : a > b ? 1 : 0;
}

/** Inclusive range of days. */
export function daysBetween(start, end) {
  const out = [];
  for (let day = start; compareDays(day, end) <= 0; day = addDays(day, 1)) out.push(day);
  return out;
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(day) {
  return ((dayToUTC(day).getUTCDay() + 6) % 7) + 1;
}

/** The Monday of the ISO week containing `day`. */
export function startOfISOWeek(day) {
  return addDays(day, 1 - isoWeekday(day));
}

/** ISO-8601 week number and its ISO year (which can differ from the calendar year). */
export function isoWeek(day) {
  const date = dayToUTC(day);
  // Shift to the Thursday of this week: the ISO year is whichever year that lands in.
  date.setUTCDate(date.getUTCDate() - (isoWeekday(day) - 1) + 3);
  const isoYear = date.getUTCFullYear();

  const jan4 = new Date(Date.UTC(isoYear, 0, 4, 12));
  const jan4Weekday = ((jan4.getUTCDay() + 6) % 7) + 1;
  const week1Monday = new Date(jan4.getTime() - (jan4Weekday - 1) * MS_PER_DAY);

  const week = Math.round((date.getTime() - week1Monday.getTime()) / (7 * MS_PER_DAY)) + 1;
  return { year: isoYear, week };
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

/** How far through the calendar year `day` is, counting the day itself as elapsed. */
export function yearProgress(day) {
  const year = Number(day.slice(0, 4));
  const total = daysInYear(year);
  const elapsed = diffDays(makeDay(year, 1, 1), day) + 1;
  return {
    year,
    dayOfYear: elapsed,
    totalDays: total,
    elapsedFraction: elapsed / total,
    remainingDays: total - elapsed,
  };
}

/* ------------------------------------------------------------------ *
 * Seasons (astronomical, northern hemisphere, fixed-date approximation)
 * ------------------------------------------------------------------ */

const SEASON_STARTS = [
  { name: 'Winter', month: 12, day: 21 },
  { name: 'Autumn', month: 9, day: 22 },
  { name: 'Summer', month: 6, day: 21 },
  { name: 'Spring', month: 3, day: 20 },
];

export function seasonOf(day) {
  const year = Number(day.slice(0, 4));
  for (const season of SEASON_STARTS) {
    const start = makeDay(year, season.month, season.day);
    if (compareDays(day, start) >= 0) {
      return { name: season.name, start };
    }
  }
  // Before 20 March: still the winter that began last December.
  return { name: 'Winter', start: makeDay(year - 1, 12, 21) };
}

export function nextSeasonStart(day) {
  const year = Number(day.slice(0, 4));
  const candidates = [];
  for (const offset of [0, 1]) {
    for (const season of SEASON_STARTS) {
      candidates.push({ name: season.name, start: makeDay(year + offset, season.month, season.day) });
    }
  }
  candidates.sort((a, b) => compareDays(a.start, b.start));
  return candidates.find((candidate) => compareDays(candidate.start, day) > 0);
}

/* ------------------------------------------------------------------ *
 * Swiss (canton Zurich) public holidays
 * ------------------------------------------------------------------ */

/** Easter Sunday, by the Meeus/Jones/Butcher algorithm. */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
  return makeDay(year, month, dayOfMonth);
}

/** Public holidays observed in canton Zurich, as { day, name }. */
export function swissHolidays(year) {
  const easter = easterSunday(year);
  return [
    { day: makeDay(year, 1, 1), name: 'New Year' },
    { day: makeDay(year, 1, 2), name: "Berchtold's Day" },
    { day: addDays(easter, -2), name: 'Good Friday' },
    { day: addDays(easter, 1), name: 'Easter Monday' },
    { day: makeDay(year, 5, 1), name: 'Labour Day' },
    { day: addDays(easter, 39), name: 'Ascension Day' },
    { day: addDays(easter, 50), name: 'Whit Monday' },
    { day: makeDay(year, 8, 1), name: 'Swiss National Day' },
    { day: makeDay(year, 12, 25), name: 'Christmas Day' },
    { day: makeDay(year, 12, 26), name: "St Stephen's Day" },
  ].sort((a, b) => compareDays(a.day, b.day));
}

export function nextHolidayAfter(day) {
  const year = Number(day.slice(0, 4));
  const upcoming = [...swissHolidays(year), ...swissHolidays(year + 1)];
  return upcoming.find((holiday) => compareDays(holiday.day, day) > 0) ?? null;
}

/** Working days (Mon-Fri, excluding Zurich public holidays) strictly after `day`, to year end. */
export function workingDaysLeftInYear(day) {
  const year = Number(day.slice(0, 4));
  const holidays = new Set(swissHolidays(year).map((holiday) => holiday.day));
  let count = 0;
  for (let current = addDays(day, 1); Number(current.slice(0, 4)) === year; current = addDays(current, 1)) {
    if (isoWeekday(current) <= 5 && !holidays.has(current)) count += 1;
  }
  return count;
}

/** Count of a given ISO weekday remaining in the year, strictly after `day`. */
export function weekdaysLeftInYear(day, weekday) {
  const year = Number(day.slice(0, 4));
  let count = 0;
  for (let current = addDays(day, 1); Number(current.slice(0, 4)) === year; current = addDays(current, 1)) {
    if (isoWeekday(current) === weekday) count += 1;
  }
  return count;
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function formatDay(day, { locale = 'en-GB', style = 'long' } = {}) {
  const options = style === 'long'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(dayToUTC(day));
}

export function weekdayName(day, { locale = 'en-GB', style = 'long' } = {}) {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(dayToUTC(day));
}

/** A text progress bar, e.g. '████████░░░░ 66%'. */
export function progressBar(fraction, width = 20) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(clamped * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
