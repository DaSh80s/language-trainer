import type { Opportunity } from '../types.js';

/**
 * Extraction patterns locked against real LinkedIn Recruiter mail on 2026-06-12
 * (sender jobs-listings@linkedin.com, template email_ent_job_post_new_applicant):
 *   Subject: "New application: TEMOS Business Analyst (rfx1560984) from Polina …"
 *   Body:    "Your job has a new applicant" / "{title} at Rigby AG · Zurich, …"
 * Job titles often embed the client ref "(rfxNNNNNNN)", which also lives in the
 * opportunity's title and `Client ref. no.` — an exact-match signal that takes
 * priority over fuzzy title matching (DECISIONS D11).
 */
const SUBJECT_PATTERNS = [
  /new application(?:\s+for)?:?\s*(.+?)\s+from\s+.+$/i,
  /(.+?)\s*[-–—]\s*new applicant/i,
];

const BODY_PATTERNS = [
  /applied (?:to|for)(?: your)?(?: job)?[:\s]+["']?(.+?)["']?(?:\.|,|\n|$)/i,
  /^\s*(.+?)\s+at\s+.+?\s·\s/m, // "{title} at {company} · {location}"
];

const CLIENT_REF = /\brfx\s?(\d{4,})\b/i;

export interface RoleHints {
  title: string | null;
  /** Normalized client ref, e.g. "rfx1560984". */
  clientRef: string | null;
}

export function extractRoleHints(subject: string, body: string): RoleHints {
  let title: string | null = null;
  for (const p of SUBJECT_PATTERNS) {
    const m = subject.match(p);
    if (m?.[1]) {
      title = m[1].replace(/\s+/g, ' ').trim();
      break;
    }
  }
  if (!title) {
    for (const p of BODY_PATTERNS) {
      const m = body.match(p);
      if (m?.[1]) {
        title = m[1].replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }
  const refMatch = subject.match(CLIENT_REF) ?? body.match(CLIENT_REF) ?? (title?.match(CLIENT_REF) ?? null);
  return { title, clientRef: refMatch ? `rfx${refMatch[1]}` : null };
}

/** Noise tokens that appear in ad titles but carry no role signal. */
const STOPWORDS = new Set(['m', 'f', 'd', 'w', 'x', 'remote', 'hybrid', 'onsite', 'the', 'a', 'an', 'and', '&', '100']);

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

function hasClientRef(opp: Opportunity, ref: string): boolean {
  if (opp.clientRef) {
    const oppRef = opp.clientRef.toLowerCase().replace(/\s+/g, '');
    // Digit fallback covers a `Client ref. no.` stored without the rfx prefix.
    if (oppRef === ref || oppRef.replace(/\D/g, '') === ref.replace(/\D/g, '')) return true;
  }
  return opp.title.toLowerCase().replace(/\s+/g, '').includes(ref);
}

/**
 * Client-ref exact match first; token-similarity fallback above the confidence
 * threshold; otherwise null → Unsorted (D5).
 */
export function matchOpportunity(hints: RoleHints, opportunities: Opportunity[]): Opportunity | null {
  if (hints.clientRef) {
    const exact = opportunities.find((o) => hasClientRef(o, hints.clientRef!));
    if (exact) return exact;
  }
  if (!hints.title) return null;
  let best: Opportunity | null = null;
  let bestScore = 0;
  for (const opp of opportunities) {
    const score = titleSimilarity(hints.title, opp.title);
    if (score > bestScore) {
      best = opp;
      bestScore = score;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}
