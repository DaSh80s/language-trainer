import {
  type AlertSink,
  type ApplicationEmail,
  type CandidateProfile,
  type CandidateRecord,
  type CandidateStore,
  type CvAnalyzer,
  type CvAttachment,
  type FitScore,
  type MailSource,
  type Opportunity,
  type RunSummary,
  type UpsertResult,
} from '../src/types.js';

// ── Fixture builders ─────────────────────────────────────────────────────────

export function makeCvAttachment(name: string, email: string, skills: string[] = ['typescript']): CvAttachment {
  const text = `Name: ${name}\nEmail: ${email}\nSkills: ${skills.join(', ')}\nExperience: 5 years`;
  return { filename: `${name.replace(/\s+/g, '_')}_CV.pdf`, mimeType: 'application/pdf', contentBase64: btoa(text) };
}

let emailCounter = 0;

export function makeEmail(opts: {
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  attachments?: CvAttachment[];
}): ApplicationEmail {
  return {
    id: `msg-${++emailCounter}`,
    subject: `New application: ${opts.jobTitle} from ${opts.candidateName}`,
    bodyPreview: `${opts.candidateName} applied to your job: ${opts.jobTitle}.`,
    receivedAt: new Date().toISOString(),
    attachments: opts.attachments ?? [makeCvAttachment(opts.candidateName, opts.candidateEmail)],
  };
}

export const OPPORTUNITIES: Opportunity[] = [
  { id: 'opp-backend', title: 'Senior Backend Engineer (m/f/d)', jobDescription: 'Node, TypeScript, distributed systems.', stage: 'Sourcing priority 1' },
  { id: 'opp-product', title: 'Product Manager', jobDescription: 'Roadmaps, discovery, B2B SaaS.', stage: 'Open to all' },
  { id: 'opp-data', title: 'Data Analyst - Remote', jobDescription: 'SQL, dashboards, experimentation.', stage: 'Sourcing priority 2' },
];

// ── In-memory ports ──────────────────────────────────────────────────────────

export class InMemoryMailSource implements MailSource {
  processed = new Set<string>();
  constructor(private readonly emails: ApplicationEmail[]) {}

  async fetchUnprocessed(): Promise<ApplicationEmail[]> {
    return this.emails.filter((e) => !this.processed.has(e.id));
  }

  async markProcessed(messageId: string): Promise<void> {
    this.processed.add(messageId);
  }
}

/** Parses the fixture CV text format. `failFirstAttempt` injects one transient failure per CV. */
export class FakeAnalyzer implements CvAnalyzer {
  parseCalls = 0;
  private readonly failedOnce = new Set<string>();

  constructor(private readonly failFirstAttempt: (attachment: CvAttachment) => boolean = () => false) {}

  async parseCv(attachment: CvAttachment): Promise<CandidateProfile> {
    this.parseCalls++;
    if (this.failFirstAttempt(attachment) && !this.failedOnce.has(attachment.filename)) {
      this.failedOnce.add(attachment.filename);
      throw new Error('transient: model overloaded');
    }
    const text = atob(attachment.contentBase64);
    const field = (label: string) => text.match(new RegExp(`${label}: (.+)`))?.[1] ?? '';
    return {
      name: field('Name'),
      email: field('Email'),
      skills: field('Skills').split(', ').filter(Boolean),
      education: [],
      experienceYears: 5,
    };
  }

  async scoreFit(profile: CandidateProfile, jobDescription: string): Promise<FitScore> {
    void profile;
    void jobDescription;
    return { skills: 70, experience: 60, seniority: 80, overall: 68 };
  }
}

export interface StoredRecord extends CandidateRecord {
  recordId: string;
}

/** Honors the CandidateStore contract: dedupe by email, additive tag merge (D6). */
export class InMemoryStore implements CandidateStore {
  records = new Map<string, StoredRecord>(); // keyed by candidate email
  created = 0;
  updated = 0;

  constructor(private readonly opportunities: Opportunity[] = OPPORTUNITIES) {}

  async listOpportunities(): Promise<Opportunity[]> {
    return this.opportunities;
  }

  async upsertCandidate(record: CandidateRecord): Promise<UpsertResult> {
    const existing = this.records.get(record.profile.email);
    if (existing) {
      this.updated++;
      const mergedTags = [...new Set([...existing.tags, ...record.tags])];
      this.records.set(record.profile.email, { ...existing, ...record, tags: mergedTags });
      return { action: 'updated', recordId: existing.recordId };
    }
    this.created++;
    const recordId = `rec-${this.records.size + 1}`;
    this.records.set(record.profile.email, { ...record, recordId });
    return { action: 'created', recordId };
  }

  async resolveClientNames(clientIds: string[]): Promise<Map<string, string>> {
    return new Map(clientIds.map((id) => [id, `Client ${id}`]));
  }
}

export class CollectingAlerts implements AlertSink {
  errors: { context: string; detail: unknown }[] = [];
  summaries: RunSummary[] = [];

  async error(context: string, detail: unknown): Promise<void> {
    this.errors.push({ context, detail });
  }

  async summary(summary: RunSummary): Promise<void> {
    this.summaries.push(summary);
  }
}
