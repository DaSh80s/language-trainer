import { RateLimiter } from '../core/throttle.js';
import type { CandidateRecord, CandidateStore, Opportunity, UpsertResult } from '../types.js';
import {
  buildContactProperties,
  CONTACT_PROPS,
  opportunityJobRef,
  parseContactPage,
  parseOpportunityPage,
  type NotionPage,
} from './notionSchema.js';

export interface NotionConfig {
  token: string;
  /** "All contacts" database id (3f64f533…). */
  contactsDatabaseId: string;
  /** "Opportunities" database id (f48d478f…). */
  opportunitiesDatabaseId: string;
}

export class NotionApiError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Notion API ${status}: ${body.slice(0, 300)}`);
  }
  /** 429 and 5xx heal on retry; 4xx mapping bugs do not. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface QueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Notion adapter for the verified Rigby schema (see notionSchema.ts / D8).
 * Every request goes through the 3 req/s limiter so applicant bursts stay
 * under Notion's per-token ceiling (SPEC criterion 7).
 */
export class NotionCandidateStore implements CandidateStore {
  private readonly limiter = new RateLimiter(3);
  /** Opportunity page id → JOB-XXXX ref, filled by listOpportunities. */
  private jobRefs = new Map<string, string>();

  constructor(
    private readonly config: NotionConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.limiter.run(async () => {
      const res = await this.fetchImpl(`${API}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${this.config.token}`,
          'notion-version': NOTION_VERSION,
          'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new NotionApiError(res.status, await res.text());
      return res.json() as Promise<T>;
    });
  }

  async listOpportunities(): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];
    let cursor: string | null = null;
    do {
      const page: QueryResponse = await this.request(
        'POST',
        `/databases/${this.config.opportunitiesDatabaseId}/query`,
        { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
      );
      for (const result of page.results) {
        const opp = parseOpportunityPage(result);
        if (!opp) continue; // terminal stage or untitled
        opportunities.push(opp);
        const ref = opportunityJobRef(result);
        if (ref) this.jobRefs.set(opp.id, ref);
      }
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return opportunities;
  }

  private async findContactByEmail(email: string): Promise<NotionPage | null> {
    const res: QueryResponse = await this.request(
      'POST',
      `/databases/${this.config.contactsDatabaseId}/query`,
      { filter: { property: CONTACT_PROPS.email, email: { equals: email } }, page_size: 1 },
    );
    return res.results[0] ?? null;
  }

  async upsertCandidate(record: CandidateRecord): Promise<UpsertResult> {
    const jobRef = record.opportunityId ? (this.jobRefs.get(record.opportunityId) ?? null) : null;
    const existingPage = await this.findContactByEmail(record.profile.email);

    if (existingPage) {
      const existing = parseContactPage(existingPage);
      await this.request('PATCH', `/pages/${existing.pageId}`, {
        properties: buildContactProperties(record, jobRef, existing),
      });
      return { action: 'updated', recordId: existing.pageId };
    }

    const created = await this.request<NotionPage>('POST', '/pages', {
      parent: { database_id: this.config.contactsDatabaseId },
      properties: buildContactProperties(record, jobRef),
    });
    return { action: 'created', recordId: created.id };
  }
}
