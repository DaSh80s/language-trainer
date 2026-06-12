import { describe, expect, it } from 'vitest';
import { runPipeline } from '../src/pipeline.js';
import { LINKEDIN_APPLICANT_TAG } from '../src/types.js';
import {
  CollectingAlerts,
  FakeAnalyzer,
  InMemoryMailSource,
  InMemoryStore,
  makeCvAttachment,
  makeEmail,
} from './stubs.js';

const FAST_RETRY = { baseMs: 1 };

function deps(mail: InMemoryMailSource, extra: { store?: InMemoryStore; analyzer?: FakeAnalyzer } = {}) {
  return {
    mail,
    analyzer: extra.analyzer ?? new FakeAnalyzer(),
    store: extra.store ?? new InMemoryStore(),
    alerts: new CollectingAlerts(),
    retry: FAST_RETRY,
  };
}

describe('runPipeline', () => {
  it('writes fully-populated, role-linked, tagged records (criteria 1–4)', async () => {
    const mail = new InMemoryMailSource([
      makeEmail({ jobTitle: 'Senior Backend Engineer (m/f/d)', candidateName: 'Maya Cohen', candidateEmail: 'maya@example.com' }),
      makeEmail({ jobTitle: 'Product Manager', candidateName: 'Avi Levi', candidateEmail: 'avi@example.com' }),
    ]);
    const d = deps(mail);

    const summary = await runPipeline(d);

    expect(summary).toEqual({ received: 2, parsed: 2, written: 2, unsorted: 0, failed: 0 });
    const maya = d.store.records.get('maya@example.com')!;
    expect(maya.opportunityId).toBe('opp-backend');
    expect(maya.fit?.overall).toBeGreaterThan(0);
    expect(maya.profile.name).toBe('Maya Cohen');
    for (const record of d.store.records.values()) {
      expect(record.tags).toContain(LINKEDIN_APPLICANT_TAG);
    }
    expect(mail.processed.size).toBe(2);
  });

  it('dedupes by email and merges tags additively (criteria 4–5)', async () => {
    const store = new InMemoryStore();
    // Pre-existing website applicant for the same person
    await store.upsertCandidate({
      profile: { name: 'Maya Cohen', email: 'maya@example.com', skills: [], education: [] },
      opportunityId: null,
      fit: null,
      tags: ['Website applicant'],
      sourceMessageId: 'web-1',
      crossMatches: [],
      clientAffinities: [],
    });

    const mail = new InMemoryMailSource([
      makeEmail({ jobTitle: 'Senior Backend Engineer', candidateName: 'Maya Cohen', candidateEmail: 'maya@example.com' }),
    ]);
    const summary = await runPipeline(deps(mail, { store }));

    expect(summary.written).toBe(1);
    expect(store.created).toBe(1); // only the pre-seeded create
    expect(store.updated).toBe(1);
    const maya = store.records.get('maya@example.com')!;
    expect(maya.tags).toEqual(expect.arrayContaining(['Website applicant', LINKEDIN_APPLICANT_TAG]));
    expect(maya.opportunityId).toBe('opp-backend');
  });

  it('writes unmappable roles as Unsorted and alerts (criterion 6)', async () => {
    const mail = new InMemoryMailSource([
      makeEmail({ jobTitle: 'Chief Astrology Officer', candidateName: 'Dana Mizrahi', candidateEmail: 'dana@example.com' }),
    ]);
    const d = deps(mail);

    const summary = await runPipeline(d);

    expect(summary).toEqual({ received: 1, parsed: 1, written: 1, unsorted: 1, failed: 0 });
    const dana = d.store.records.get('dana@example.com')!;
    expect(dana.opportunityId).toBeNull();
    expect(dana.fit).toBeNull();
    expect(dana.tags).toContain(LINKEDIN_APPLICANT_TAG);
    expect(d.alerts.errors).toHaveLength(1);
    expect(d.alerts.errors[0]!.context).toContain('unmapped role');
  });

  it('isolates failures, alerts, and leaves the message for the next run (criteria 8–9)', async () => {
    const broken = makeEmail({ jobTitle: 'Product Manager', candidateName: 'No Attachment', candidateEmail: 'na@example.com' });
    broken.attachments = [];
    const ok = makeEmail({ jobTitle: 'Product Manager', candidateName: 'Avi Levi', candidateEmail: 'avi@example.com' });
    const mail = new InMemoryMailSource([broken, ok]);
    const d = deps(mail);

    const summary = await runPipeline(d);

    expect(summary).toEqual({ received: 2, parsed: 1, written: 1, unsorted: 0, failed: 1 });
    expect(d.alerts.errors).toHaveLength(1);
    expect(mail.processed.has(ok.id)).toBe(true);
    expect(mail.processed.has(broken.id)).toBe(false); // retried next tick
  });

  it('cross-matches against other priority roles via skills overlap (criterion 10)', async () => {
    // Applies to Product Manager, but skills say SQL → Data Analyst (Sourcing priority 2)
    const mail = new InMemoryMailSource([
      makeEmail({
        jobTitle: 'Product Manager',
        candidateName: 'Lior Aviv',
        candidateEmail: 'lior@example.com',
        attachments: [makeCvAttachment('Lior Aviv', 'lior@example.com', ['SQL', 'dashboards'])],
      }),
    ]);
    const d = deps(mail);

    const summary = await runPipeline(d);

    expect(summary.written).toBe(1);
    const lior = d.store.records.get('lior@example.com')!;
    expect(lior.opportunityId).toBe('opp-product');
    expect(lior.crossMatches.map((m) => m.opportunityId)).toEqual(['opp-data']);
    expect(lior.crossMatches[0]!.overall).toBeGreaterThanOrEqual(60);
  });

  it('is idempotent across re-runs (criterion 9)', async () => {
    const mail = new InMemoryMailSource([
      makeEmail({ jobTitle: 'Data Analyst', candidateName: 'Noa Peretz', candidateEmail: 'noa@example.com' }),
    ]);
    const d = deps(mail);

    await runPipeline(d);
    const second = await runPipeline(d);

    expect(second.received).toBe(0);
    expect(d.store.created).toBe(1);
    expect(d.store.updated).toBe(0);
  });

  it('survives a 120-application burst with transient failures and dupes (criterion 7)', async () => {
    const emails = Array.from({ length: 115 }, (_, i) =>
      makeEmail({
        jobTitle: i % 3 === 0 ? 'Senior Backend Engineer' : i % 3 === 1 ? 'Product Manager' : 'Data Analyst',
        candidateName: `Candidate ${i}`,
        candidateEmail: `candidate${i}@example.com`,
      }),
    );
    // 5 duplicate applications from existing candidates
    for (let i = 0; i < 5; i++) {
      emails.push(
        makeEmail({
          jobTitle: 'Product Manager',
          candidateName: `Candidate ${i}`,
          candidateEmail: `candidate${i}@example.com`,
          attachments: [makeCvAttachment(`Candidate ${i} v2`, `candidate${i}@example.com`)],
        }),
      );
    }
    const mail = new InMemoryMailSource(emails);
    // Every 10th CV fails on its first parse attempt; retries must absorb it.
    const analyzer = new FakeAnalyzer((att) => att.filename.match(/Candidate_(\d+)0_/) !== null);
    const d = deps(mail, { analyzer });

    const summary = await runPipeline(d);

    expect(summary.received).toBe(120);
    expect(summary.failed).toBe(0);
    expect(summary.written).toBe(120);
    expect(d.store.records.size).toBe(115); // dupes updated, not duplicated
    expect(d.store.updated).toBe(5);
    expect(mail.processed.size).toBe(120);
    for (const record of d.store.records.values()) {
      expect(record.tags).toContain(LINKEDIN_APPLICANT_TAG);
    }
  });
});
