import type { CandidateProfile, Opportunity } from '../types.js';
import { titleSimilarity } from './roleMatch.js';
import { CROSS_MATCH_STAGES, HIRED_STAGES } from './stages.js';

/** Cross-match candidates clear this Groq overall score to be recorded. */
export const CROSS_MATCH_MIN_SCORE = 60;
/** Max roles per applicant that get a (paid) Groq scoring call. */
export const MAX_CROSS_SCORED = 3;
/** Local-similarity floor for both pre-ranking and client affinity. */
const PRE_RANK_MIN = 0.2;
export const CLIENT_AFFINITY_MIN = 0.45;

/**
 * Free local similarity between a candidate profile and a role: blend of
 * current-title similarity and how many of the candidate's skills appear in
 * the JD text. Used to pre-rank before spending Groq calls (cross-match) and
 * as the whole signal for client affinity (heuristic by design, D15).
 */
export function profileRoleSimilarity(profile: CandidateProfile, opp: Opportunity): number {
  const titleScore = profile.currentTitle ? titleSimilarity(profile.currentTitle, opp.title) : 0;
  const jd = opp.jobDescription.toLowerCase();
  const hits = profile.skills.filter((s) => jd.includes(s.toLowerCase())).length;
  const skillScore = profile.skills.length ? hits / profile.skills.length : 0;
  return 0.6 * titleScore + 0.4 * skillScore;
}

/** Top live priority-1/2 roles (excluding the applied one) worth a Groq scoring call. */
export function rankCrossCandidates(
  profile: CandidateProfile,
  opportunities: Opportunity[],
  excludeOpportunityId: string | null,
  max: number = MAX_CROSS_SCORED,
): Opportunity[] {
  return opportunities
    .filter((o) => o.id !== excludeOpportunityId && CROSS_MATCH_STAGES.has(o.stage ?? ''))
    .map((o) => ({ opp: o, score: profileRoleSimilarity(profile, o) }))
    .filter((x) => x.score >= PRE_RANK_MIN)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.opp);
}

export interface ClientAffinityHit {
  clientId: string;
  /** Titles of this client's previously-hired roles the candidate resembles. */
  viaRoles: string[];
}

/** Clients whose historically *hired* roles resemble this candidate. Local only. */
export function findClientAffinities(
  profile: CandidateProfile,
  opportunities: Opportunity[],
): ClientAffinityHit[] {
  const byClient = new Map<string, string[]>();
  for (const opp of opportunities) {
    if (!HIRED_STAGES.has(opp.stage ?? '') || !opp.clientIds?.length) continue;
    if (profileRoleSimilarity(profile, opp) < CLIENT_AFFINITY_MIN) continue;
    for (const clientId of opp.clientIds) {
      byClient.set(clientId, [...(byClient.get(clientId) ?? []), opp.title]);
    }
  }
  return [...byClient].map(([clientId, viaRoles]) => ({ clientId, viaRoles }));
}
