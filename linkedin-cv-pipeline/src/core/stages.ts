/** Opportunity `Stage` semantics (values verified against the live schema, D8). */

/** Role can no longer receive applicants — excluded from applied-role matching. */
export const TERMINAL_STAGES = new Set([
  'Closed other',
  'Done deal!',
  'Extended',
  'Position closed / budget cut',
  'Unqualified lead',
  'Declined participation / did not find qualified candidates',
  'Offer declined by candidate',
  'Closed filled by client',
]);

/** Actively sourced roles worth cross-matching every new applicant against. */
export const CROSS_MATCH_STAGES = new Set(['Sourcing priority 1', 'Sourcing priority 2']);

/** Stages proving the client actually hired — the basis for client affinity. */
export const HIRED_STAGES = new Set(['Done deal!', 'Extended']);

export const isLive = (stage: string | undefined): boolean => !stage || !TERMINAL_STAGES.has(stage);
