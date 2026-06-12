import type { Opportunity } from '../types.js';

/**
 * Patterns observed in LinkedIn Recruiter notification subjects/bodies.
 * PROVISIONAL until locked against real sample emails in Milestone 3 (SPEC).
 */
const SUBJECT_PATTERNS = [
  /new application(?:\s+for)?:?\s*(.+?)\s+from\s+.+$/i,
  /(?:your job post|application for)\s*[:"]?\s*(.+?)["']?\s*(?:from|received|-)\s/i,
  /(.+?)\s*[-–—]\s*new applicant/i,
];

const BODY_PATTERNS = [/applied (?:to|for)(?: your)?(?: job)?[:\s]+["']?(.+?)["']?(?:\.|,|\n|$)/i];

export function extractJobTitle(subject: string, body: string): string | null {
  for (const p of SUBJECT_PATTERNS) {
    const m = subject.match(p);
    if (m?.[1]) return m[1].trim();
  }
  for (const p of BODY_PATTERNS) {
    const m = body.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/** Noise tokens that appear in ad titles but carry no role signal. */
const STOPWORDS = new Set(['m', 'f', 'd', 'w', 'x', 'remote', 'hybrid', 'onsite', 'the', 'a', 'an', 'and', '&']);

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length > 0 && !STOPWORDS.has(t)),
  );
}

/** Dice coefficient over token sets: 2·|A∩B| / (|A|+|B|). */
export function titleSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}

export const MATCH_THRESHOLD = 0.5;

/** Best opportunity whose title clears the confidence threshold, else null (→ Unsorted). */
export function matchOpportunity(
  extractedTitle: string | null,
  opportunities: Opportunity[],
): Opportunity | null {
  if (!extractedTitle) return null;
  let best: Opportunity | null = null;
  let bestScore = 0;
  for (const opp of opportunities) {
    const score = titleSimilarity(extractedTitle, opp.title);
    if (score > bestScore) {
      best = opp;
      bestScore = score;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
