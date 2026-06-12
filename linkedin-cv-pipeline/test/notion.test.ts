import { describe, expect, it } from 'vitest';
import { NotionCandidateStore } from '../src/clients/notion.js';
import {
  buildContactProperties,
  parseContactPage,
  parseOpportunityPage,
  type NotionPage,
} from '../src/clients/notionSchema.js';
import { LINKEDIN_APPLICANT_TAG, type CandidateRecord } from '../src/types.js';

const record = (overrides: Partial<CandidateRecord> = {}): CandidateRecord => ({
  profile: {
    name: 'Maya Cohen',
    email: 'maya@example.com',
    phone: '+41 79 123 45 67',
    currentTitle: 'Backend Engineer',
    location: 'Zurich',
    skills: ['TypeScript', 'SQL'],
    education: ['BSc Computer Science'],
    summary: 'Senior backend engineer.',
  },
  opportunityId: 'opp-page-id',
  fit: { skills: 80, experience: 70, seniority: 75, overall: 76, rationale: 'Solid match.' },
  tags: [LINKEDIN_APPLICANT_TAG],
  sourceMessageId: 'msg-1',
  crossMatches: [],
  clientAffinities: [],
  ...overrides,
});

// API-shaped fixtures matching the verified Rigby schema (D8)
const opportunityPage: NotionPage = {
  id: 'opp-page-id',
  properties: {
    'Job Title': { title: [{ plain_text: 'LUX - Senior Data Engineer SQL (rfx1557530)' }] },
    'Orig JD text': { rich_text: [{ plain_text: 'Expert SQL, Data Vault, banking.' }] },
    'Job ID': { unique_id: { prefix: 'JOB', number: 1838 } },
    Stage: { select: { name: "CV's sent" } },
  },
};

describe('parseOpportunityPage', () => {
  it('maps title, JD, and stage', () => {
    const opp = parseOpportunityPage(opportunityPage)!;
    expect(opp.title).toContain('Senior Data Engineer SQL');
    expect(opp.jobDescription).toContain('Data Vault');
    expect(opp.stage).toBe("CV's sent");
  });

  it('keeps terminal-stage roles with their stage (history feeds client affinity)', () => {
    const closed: NotionPage = {
      ...opportunityPage,
      properties: { ...opportunityPage.properties, Stage: { select: { name: 'Done deal!' } } },
    };
    expect(parseOpportunityPage(closed)?.stage).toBe('Done deal!');
  });
});

describe('buildContactProperties', () => {
  it('writes the full applicant pattern incl. the LinkedIn applicant tag (criteria 2-4)', () => {
    const props = buildContactProperties(record(), 'JOB-1838') as Record<string, any>;
    expect(props['Email']).toEqual({ email: 'maya@example.com' });
    const tagNames = props['Client or candidate?'].multi_select.map((o: any) => o.name);
    expect(tagNames).toEqual(expect.arrayContaining(['Candidate', LINKEDIN_APPLICANT_TAG]));
    expect(props['Sourced from']).toEqual({ select: { name: 'LinkedIn Recruiter' } });
    expect(props['Applied for role']).toEqual({ relation: [{ id: 'opp-page-id' }] });
    expect(props['Job ID/Customer ref.'].rich_text[0].text.content).toBe('JOB-1838');
    expect(props['Fit score']).toEqual({ number: 76 });
    expect(props['Fit commentary'].rich_text[0].text.content).toContain('Skills 80/100');
    expect(props['Auto-summary'].rich_text[0].text.content).toContain('Skills: TypeScript, SQL');
  });

  it('merges tags and role relations additively on update (criterion 5)', () => {
    const props = buildContactProperties(record(), 'JOB-1838', {
      pageId: 'existing-id',
      tags: ['Candidate', 'Hotlist-equivalent'],
      appliedRoleIds: ['earlier-opp-id'],
      oppsMatchedIds: [],
    }) as Record<string, any>;
    const tagNames = props['Client or candidate?'].multi_select.map((o: any) => o.name);
    expect(tagNames).toEqual(expect.arrayContaining(['Hotlist-equivalent', 'Candidate', LINKEDIN_APPLICANT_TAG]));
    const roleIds = props['Applied for role'].relation.map((r: any) => r.id);
    expect(roleIds).toEqual(expect.arrayContaining(['earlier-opp-id', 'opp-page-id']));
  });

  it('writes cross-matches to Opps matched (additive) and readable notes (criteria 10-11)', () => {
    const props = buildContactProperties(
      record({
        crossMatches: [{ opportunityId: 'opp-x', title: 'Data Analyst - Remote', overall: 72 }],
        clientAffinities: [{ clientId: 'c1', clientName: 'Julius Baer', viaRoles: ['LUX - Senior Data Engineer SQL'] }],
      }),
      'JOB-1838',
      { pageId: 'p', tags: [], appliedRoleIds: [], oppsMatchedIds: ['opp-old'] },
    ) as Record<string, any>;

    const matchedIds = props['Opps matched'].relation.map((r: any) => r.id);
    expect(matchedIds).toEqual(expect.arrayContaining(['opp-old', 'opp-x']));
    const notes = props['Processing notes'].rich_text[0].text.content;
    expect(notes).toContain('Cross-match: also worth a look for Data Analyst - Remote (72/100)');
    expect(notes).toContain('Client affinity (heuristic): Julius Baer');
  });

  it('marks unsorted records for triage without score or relation (criterion 6)', () => {
    const props = buildContactProperties(record({ opportunityId: null, fit: null }), null) as Record<string, any>;
    expect(props['Applied for role']).toEqual({ relation: [] });
    expect(props['Fit score']).toBeUndefined();
    expect(props['Processing notes'].rich_text[0].text.content).toContain('Unsorted');
  });
});

describe('NotionCandidateStore (fetch-stubbed)', () => {
  function storeWith(handler: (url: string, init: RequestInit) => unknown) {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchStub = (async (url: any, init: any) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(handler(url, init)), { status: 200 });
    }) as typeof fetch;
    const store = new NotionCandidateStore(
      { token: 't', contactsDatabaseId: 'contacts-db', opportunitiesDatabaseId: 'opps-db' },
      fetchStub,
    );
    return { store, calls };
  }

  it('lists opportunities with pagination and keeps JOB refs', async () => {
    let page = 0;
    const { store } = storeWith(() => {
      page++;
      return page === 1
        ? { results: [opportunityPage], has_more: true, next_cursor: 'c2' }
        : { results: [], has_more: false, next_cursor: null };
    });
    const opps = await store.listOpportunities();
    expect(opps).toHaveLength(1);
    expect(page).toBe(2);
  });

  it('creates when no contact matches the email', async () => {
    const { store, calls } = storeWith((url) =>
      url.includes('/databases/')
        ? { results: [], has_more: false, next_cursor: null }
        : { id: 'new-page-id', properties: {} },
    );
    const result = await store.upsertCandidate(record());
    expect(result).toEqual({ action: 'created', recordId: 'new-page-id' });
    const create = calls.find((c) => c.url.endsWith('/pages'))!;
    const body = JSON.parse(create.init.body as string);
    expect(body.parent).toEqual({ database_id: 'contacts-db' });
    const dedupe = calls.find((c) => c.url.includes('/databases/contacts-db/query'))!;
    expect(JSON.parse(dedupe.init.body as string).filter.email.equals).toBe('maya@example.com');
  });

  it('updates and merges when the email already exists', async () => {
    const existingPage: NotionPage = {
      id: 'existing-page-id',
      properties: {
        'Client or candidate?': { multi_select: [{ name: 'Candidate' }] },
        'Applied for role': { relation: [{ id: 'earlier-opp-id' }] },
      },
    };
    const { store, calls } = storeWith((url) =>
      url.includes('/databases/') ? { results: [existingPage], has_more: false, next_cursor: null } : {},
    );
    const result = await store.upsertCandidate(record());
    expect(result).toEqual({ action: 'updated', recordId: 'existing-page-id' });
    const patch = calls.find((c) => c.init.method === 'PATCH')!;
    expect(patch.url).toContain('/pages/existing-page-id');
    const roleIds = JSON.parse(patch.init.body as string).properties['Applied for role'].relation.map(
      (r: any) => r.id,
    );
    expect(roleIds).toEqual(expect.arrayContaining(['earlier-opp-id', 'opp-page-id']));
  });
});

describe('parseContactPage', () => {
  it('extracts merge state from a real-shaped contact page', () => {
    const existing = parseContactPage({
      id: 'p1',
      properties: {
        'Client or candidate?': { multi_select: [{ name: 'Candidate' }, { name: 'Client' }] },
        'Applied for role': { relation: [{ id: 'r1' }, { id: 'r2' }] },
      },
    });
    expect(existing).toEqual({
      pageId: 'p1',
      tags: ['Candidate', 'Client'],
      appliedRoleIds: ['r1', 'r2'],
      oppsMatchedIds: [],
    });
  });
});
