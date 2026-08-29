/**
 * Text parsing shared by the notes reader and the weight log.
 *
 * Both read numbers and dates out of free-form Notion text written by a human,
 * so the parsers accept the formats a human in Zurich actually types:
 * "2,600", "2'600", "2 600", "28 August 2026", "28.08.2026", "2026-08-28".
 */

import { makeDay } from './date.js';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Strip markdown emphasis and collapse whitespace, preserving character offsets loosely. */
export function normalizeLine(line) {
  return line
    .replace(/[*_`~]/g, ' ')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse the first number appearing at or after `fromIndex`.
 *
 * Thousands separators (',', "'", '.') are only treated as such when followed
 * by exactly three digits, so "2,600" is 2600 while "2,6" is 2.6.
 */
export function parseNumberAfter(text, fromIndex = 0) {
  const slice = text.slice(fromIndex);
  const match = /-?\d[\d'’,.  ]*\d|-?\d/.exec(slice);
  if (!match) return null;

  let raw = match[0].replace(/[\s ]/g, '');

  // Normalise thousands separators, then whatever is left is the decimal point.
  raw = raw.replace(/['’]/g, '');
  raw = raw.replace(/,(?=\d{3}\b)/g, '');
  raw = raw.replace(/\.(?=\d{3}\b)/g, '');
  raw = raw.replace(/,/g, '.');

  // A trailing separator was punctuation, not part of the number.
  raw = raw.replace(/\.$/, '');

  const value = Number(raw);
  return Number.isFinite(value) ? { value, index: fromIndex + match.index, raw: match[0] } : null;
}

export function parseNumber(text) {
  return parseNumberAfter(text, 0)?.value ?? null;
}

/** Find a date anywhere in the text and return it as 'YYYY-MM-DD', or null. */
export function parseDateInText(text) {
  const source = normalizeLine(text);

  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(source);
  if (iso) return makeDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Accept abbreviations too: 'aug', 'Aug.', 'Sept', 'August'.
  const monthNames = MONTHS.map((month) => `${month.slice(0, 3)}(?:${month.slice(3)})?`).join('|');

  // "28 August 2026" / "28 Aug 2026" / "28th August 2026"
  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s.]+(${monthNames})[a-z]*\\.?[,\\s]+(\\d{4})`, 'i',
  ).exec(source);
  if (dayFirst) {
    return makeDay(Number(dayFirst[3]), monthIndex(dayFirst[2]) + 1, Number(dayFirst[1]));
  }

  // "August 28, 2026"
  const monthFirst = new RegExp(
    `\\b(${monthNames})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})`, 'i',
  ).exec(source);
  if (monthFirst) {
    return makeDay(Number(monthFirst[3]), monthIndex(monthFirst[1]) + 1, Number(monthFirst[2]));
  }

  // Swiss numeric: 28.08.2026
  const swiss = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/.exec(source);
  if (swiss) return makeDay(Number(swiss[3]), Number(swiss[2]), Number(swiss[1]));

  return null;
}

function monthIndex(name) {
  const lower = name.toLowerCase();
  const exact = MONTHS.indexOf(lower);
  if (exact !== -1) return exact;
  return MONTHS.findIndex((month) => month.startsWith(lower.slice(0, 3)));
}

/** Least-squares slope of y against x, in y-units per x-unit. Null when undetermined. */
export function linearSlope(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (const point of points) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  }
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
