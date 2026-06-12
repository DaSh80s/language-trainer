import { RateLimiter } from '../core/throttle.js';
import type { CandidateRecord, CandidateStore, Opportunity, UpsertResult } from '../types.js';

export interface NotionConfig {
  token: string;
  candidatesDbId: string;
  opportunitiesDbId: string;
  /** Name of the relation property linking candidate → opportunity (existing pattern). */
  applicantRelationProperty: string;
}

/**
 * Notion adapter. All requests go through the rate limiter so bursts stay under
 * the ~3 req/s per-token ceiling (SPEC criterion 7).
 * Skeleton — real schema mapping lands in Milestone 2. Contract it must honor:
 * dedupe by candidate email (update, don't duplicate) and additive tag merge —
 * ensure 'LinkedIn applicant' is present without removing existing tags (D6).
 */
export class NotionCandidateStore implements CandidateStore {
  private readonly limiter = new RateLimiter(3);

  constructor(private readonly config: NotionConfig) {}

  async listOpportunities(): Promise<Opportunity[]> {
    return this.limiter.run(async () => {
      throw new Error('NotionCandidateStore.listOpportunities not implemented until Milestone 2');
    });
  }

  async upsertCandidate(record: CandidateRecord): Promise<UpsertResult> {
    return this.limiter.run(async () => {
      throw new Error(
        `NotionCandidateStore.upsertCandidate(${record.profile.email}) not implemented until Milestone 2`,
      );
    });
  }
}
