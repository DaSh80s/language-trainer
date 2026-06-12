/**
 * Mapping between pipeline domain types and the real Rigby Notion schema,
 * verified against live data on 2026-06-12 (see DECISIONS.md D8):
 * - Contacts DB "All contacts" (data source b5034a1f-…): dedupe by `Email`;
 *   `Applied for role` is the contacts side of the dual relation whose
 *   opportunities side is `Applicants` (confirmed on a real applicant pair).
 * - Opportunities DB "Opportunities" (data source 805f4f75-…): `Job Title`
 *   title, `Orig JD text` job description, `Job ID` auto-increment (JOB-XXXX).
 * Pure functions only — the HTTP client lives in notion.ts.
 */
import {
  LINKEDIN_APPLICANT_TAG,
  type CandidateRecord,
  type Opportunity,
} from '../types.js';

export const CONTACT_PROPS = {
  email: 'Email',
  phone: 'Phone 1',
  linkedin: 'LinkedIn',
  jobTitle: 'Job title',
  education: 'Education',
  summary: 'Auto-summary',
  fitScore: 'Fit score',
  fitCommentary: 'Fit commentary',
  sourcedFrom: 'Sourced from',
  tags: 'Client or candidate?',
  appliedForRole: 'Applied for role',
  jobRef: 'Job ID/Customer ref.',
  processingNotes: 'Processing notes',
} as const;

export const OPPORTUNITY_PROPS = {
  title: 'Job Title',
  jobDescription: 'Orig JD text',
  jobId: 'Job ID',
  stage: 'Stage',
  clientRef: 'Client ref. no.',
} as const;

/** Existing select option in `Sourced from` — reused, not invented. */
export const SOURCED_FROM_LINKEDIN = 'LinkedIn Recruiter';
export const CANDIDATE_TAG = 'Candidate';

/** Stages where the role can no longer receive applicants — skipped for matching. */
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

// ── Notion API value shapes (the subset we touch) ────────────────────────────

interface RichTextItem {
  plain_text?: string;
  text?: { content: string };
}

export interface NotionPage {
  id: string;
  properties: Record<string, NotionPropertyValue>;
}

export interface NotionPropertyValue {
  type?: string;
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  email?: string | null;
  select?: { name: string } | null;
  multi_select?: { name: string }[];
  relation?: { id: string }[];
  unique_id?: { prefix: string | null; number: number | null };
  number?: number | null;
}

const text = (content: string) => [{ text: { content: content.slice(0, 2000) } }];
const plain = (items: RichTextItem[] | undefined) =>
  (items ?? []).map((i) => i.plain_text ?? i.text?.content ?? '').join('');

// ── Reading ──────────────────────────────────────────────────────────────────

export function parseOpportunityPage(page: NotionPage): Opportunity | null {
  const stage = page.properties[OPPORTUNITY_PROPS.stage]?.select?.name;
  if (stage && TERMINAL_STAGES.has(stage)) return null;
  const title = plain(page.properties[OPPORTUNITY_PROPS.title]?.title);
  if (!title) return null;
  const clientRef = plain(page.properties[OPPORTUNITY_PROPS.clientRef]?.rich_text).trim();
  return {
    id: page.id,
    title,
    jobDescription: plain(page.properties[OPPORTUNITY_PROPS.jobDescription]?.rich_text),
    ...(clientRef ? { clientRef } : {}),
  };
}

export function opportunityJobRef(page: NotionPage): string | null {
  const uid = page.properties[OPPORTUNITY_PROPS.jobId]?.unique_id;
  if (!uid || uid.number == null) return null;
  return uid.prefix ? `${uid.prefix}-${uid.number}` : String(uid.number);
}

export interface ExistingContact {
  pageId: string;
  tags: string[];
  appliedRoleIds: string[];
}

export function parseContactPage(page: NotionPage): ExistingContact {
  return {
    pageId: page.id,
    tags: (page.properties[CONTACT_PROPS.tags]?.multi_select ?? []).map((o) => o.name),
    appliedRoleIds: (page.properties[CONTACT_PROPS.appliedForRole]?.relation ?? []).map((r) => r.id),
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────

function fitCommentaryText(record: CandidateRecord): string {
  const fit = record.fit;
  if (!fit) return '';
  const breakdown =
    `Skills ${fit.skills}/100 · Experience ${fit.experience}/100 · ` +
    `Seniority ${fit.seniority}/100 — overall ${fit.overall}/100.`;
  return fit.rationale ? `${breakdown}\n${fit.rationale}` : breakdown;
}

/**
 * Builds the properties payload for create (no `existing`) or update.
 * Tag and relation merges are additive: existing values are never removed
 * (SPEC criterion 5, DECISIONS D6). Relation updates replace the whole list,
 * so the existing ids must be carried over here.
 */
export function buildContactProperties(
  record: CandidateRecord,
  jobRef: string | null,
  existing?: ExistingContact,
): Record<string, unknown> {
  const { profile } = record;
  const tags = new Set([
    ...(existing?.tags ?? []),
    CANDIDATE_TAG,
    LINKEDIN_APPLICANT_TAG,
    ...record.tags,
  ]);
  const roleIds = new Set(existing?.appliedRoleIds ?? []);
  if (record.opportunityId) roleIds.add(record.opportunityId);

  // Location/skills go into the summary text: the schema's location and skills
  // properties are curated selects, and arbitrary values would pollute their options.
  const summaryParts = [
    profile.summary,
    profile.location ? `Location: ${profile.location}` : '',
    profile.skills.length ? `Skills: ${profile.skills.join(', ')}` : '',
  ];

  const props: Record<string, unknown> = {
    title: { title: text(profile.name) },
    [CONTACT_PROPS.email]: { email: profile.email },
    [CONTACT_PROPS.tags]: { multi_select: [...tags].map((name) => ({ name })) },
    [CONTACT_PROPS.sourcedFrom]: { select: { name: SOURCED_FROM_LINKEDIN } },
    [CONTACT_PROPS.appliedForRole]: { relation: [...roleIds].map((id) => ({ id })) },
  };

  if (profile.phone) props[CONTACT_PROPS.phone] = { phone_number: profile.phone };
  if (profile.currentTitle) props[CONTACT_PROPS.jobTitle] = { rich_text: text(profile.currentTitle) };
  if (profile.education.length) props[CONTACT_PROPS.education] = { rich_text: text(profile.education.join('; ')) };
  const summary = summaryParts.filter(Boolean).join('\n');
  if (summary) props[CONTACT_PROPS.summary] = { rich_text: text(summary) };
  if (record.fit) {
    props[CONTACT_PROPS.fitScore] = { number: record.fit.overall };
    props[CONTACT_PROPS.fitCommentary] = { rich_text: text(fitCommentaryText(record)) };
  }
  if (jobRef) props[CONTACT_PROPS.jobRef] = { rich_text: text(jobRef) };
  if (!record.opportunityId) {
    props[CONTACT_PROPS.processingNotes] = {
      rich_text: text(
        `Unsorted: could not confidently map to an opportunity (source message ${record.sourceMessageId}). Needs manual triage.`,
      ),
    };
  }
  return props;
}
