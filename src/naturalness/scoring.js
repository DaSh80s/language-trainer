/**
 * Naturalness Layer — scoring.
 *
 * TWO NUMBERS, NEVER ONE. See NATURALNESS.md for the full reasoning.
 *
 * The original spec scored a category on the ratio of positive to negative
 * findings. That rewards avoidance: negatives only exist when you attempt
 * something, so nobody is ever flagged for the particle they did not use, and
 * the fastest way to improve the score is to stop trying. Short sentences,
 * safe verbs, certain structures — score climbs, German flatlines.
 *
 * So REACH leads and HIT RATE follows.
 */

import { CATEGORY_BY_ID } from './categories.js';

/** Rolling window: only the most recent N findings in a language count. */
export const WINDOW = 300;

/** Pseudo-count. Each category behaves as if it began with K neutral observations. */
export const K = 5;

/** Below this many observations we show "not enough yet" rather than a number. */
export const MIN_OBSERVATIONS = 8;

/** Negatives are weighted by how foreign they sound, not counted flat. */
export const SEVERITY_WEIGHT = {
  nitpick: 0.3,
  noticeable: 1.0,
  'clearly-foreign': 2.0,
};

/**
 * Reach — of the openings that were there, how many were taken.
 *
 * Only items explicitly built as an opportunity count toward the denominator
 * (`probedReach`). Because the item WAS the opportunity, this is a known count
 * rather than a model judgement about what might have been possible.
 *
 * @param {import('./contract.js').NaturalnessFinding[]} findings
 */
export function reach(findings) {
  const probes = findings.filter((f) => f.probedReach);
  if (!probes.length) return { pct: null, taken: 0, openings: 0 };
  const taken = probes.filter((f) => f.reached).length;
  return {
    pct: Math.round((taken / probes.length) * 100),
    taken,
    openings: probes.length,
  };
}

/**
 * Hit rate — when attempted, how often it landed.
 *
 *   100 × (positives + K × 0.5) / (positives + weighted negatives + K)
 *
 * The K × 0.5 term pulls thin data toward 50, so one lucky positive cannot
 * read as 100% and three early mistakes cannot read as 0%.
 *
 * @param {import('./contract.js').NaturalnessFinding[]} findings
 */
export function hitRate(findings) {
  const attempts = findings.filter((f) => f.reached);
  const positives = attempts.filter((f) => f.landed).length;
  const negatives = attempts
    .filter((f) => !f.landed)
    .reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] ?? 1.0), 0);

  const observations = attempts.length;
  const score = Math.round(
    100 * ((positives + K * 0.5) / (positives + negatives + K))
  );

  return {
    score,
    observations,
    enough: observations >= MIN_OBSERVATIONS,
    positives,
    negatives: Math.round(negatives * 10) / 10,
  };
}

/**
 * Per-category breakdown over the rolling window.
 * @param {import('./contract.js').NaturalnessFinding[]} all
 */
export function byCategory(all) {
  const windowed = all.slice(-WINDOW);
  const out = {};
  for (const f of windowed) {
    (out[f.categoryId] ||= []).push(f);
  }
  return Object.entries(out).map(([categoryId, findings]) => ({
    categoryId,
    label: CATEGORY_BY_ID[categoryId]?.label || categoryId,
    weight: CATEGORY_BY_ID[categoryId]?.weight ?? 0.5,
    reach: reach(findings),
    hit: hitRate(findings),
    total: findings.length,
  }));
}

/**
 * Cross-category roll-up. This — and only this — is where the category weight
 * applies. Multiplying it into a single category's score would make that number
 * mean nothing.
 *
 * Categories without enough observations are left out rather than dragged to
 * a default, so the headline cannot be manufactured from thin air.
 */
export function overall(all) {
  const rows = byCategory(all).filter((r) => r.hit.enough);
  if (!rows.length) return { reachPct: null, hitScore: null, categories: 0 };

  const wsum = rows.reduce((s, r) => s + r.weight, 0);
  const reachRows = rows.filter((r) => r.reach.pct !== null);
  const reachW = reachRows.reduce((s, r) => s + r.weight, 0);

  return {
    reachPct: reachRows.length
      ? Math.round(reachRows.reduce((s, r) => s + r.reach.pct * r.weight, 0) / reachW)
      : null,
    hitScore: Math.round(rows.reduce((s, r) => s + r.hit.score * r.weight, 0) / wsum),
    categories: rows.length,
  };
}

/**
 * Coverage — how much of a category's content has been seen at all.
 * Deliberately separate from score: seeing everything badly and seeing nothing
 * are different problems.
 */
export function coverage(items, findings) {
  const seen = new Set(findings.map((f) => f.itemId));
  const hit = items.filter((i) => seen.has(i.id)).length;
  return {
    seen: hit,
    total: items.length,
    pct: items.length ? Math.round((hit / items.length) * 100) : 0,
  };
}
