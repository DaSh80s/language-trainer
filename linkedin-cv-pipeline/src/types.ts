/** Domain types and the ports the pipeline depends on (see DECISIONS.md D3). */

export interface CvAttachment {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface ApplicationEmail {
  /** Graph message id — used for idempotent mark-as-processed. */
  id: string;
  subject: string;
  bodyPreview: string;
  receivedAt: string;
  attachments: CvAttachment[];
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  experienceYears?: number;
  skills: string[];
  education: string[];
  summary?: string;
}

/** Sub-scores 0–100 each; overall is the weighted blend (see scoring prompt in M4). */
export interface FitScore {
  skills: number;
  experience: number;
  seniority: number;
  overall: number;
  rationale?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  jobDescription: string;
  /** Client reference (e.g. "rfx1557530") — exact-match signal for role mapping. */
  clientRef?: string;
}

export const LINKEDIN_APPLICANT_TAG = 'LinkedIn applicant';

export interface CandidateRecord {
  profile: CandidateProfile;
  /** null ⇒ could not be confidently mapped to a role: Unsorted (SPEC criterion 6). */
  opportunityId: string | null;
  fit: FitScore | null;
  tags: string[];
  sourceMessageId: string;
}

export interface UpsertResult {
  action: 'created' | 'updated';
  recordId: string;
}

export interface RunSummary {
  received: number;
  parsed: number;
  written: number;
  unsorted: number;
  failed: number;
}

// ── Ports ────────────────────────────────────────────────────────────────────

export interface MailSource {
  fetchUnprocessed(): Promise<ApplicationEmail[]>;
  markProcessed(messageId: string): Promise<void>;
}

export interface CvAnalyzer {
  parseCv(attachment: CvAttachment): Promise<CandidateProfile>;
  scoreFit(profile: CandidateProfile, jobDescription: string): Promise<FitScore>;
}

export interface CandidateStore {
  listOpportunities(): Promise<Opportunity[]>;
  /** Dedupe by profile.email: update existing record, else create (SPEC criterion 5). */
  upsertCandidate(record: CandidateRecord): Promise<UpsertResult>;
}

export interface AlertSink {
  error(context: string, detail: unknown): Promise<void>;
  summary(summary: RunSummary): Promise<void>;
}

export interface PipelineDeps {
  mail: MailSource;
  analyzer: CvAnalyzer;
  store: CandidateStore;
  alerts: AlertSink;
  /** Backoff tuning for transient-failure retries (tests use ~1ms base). */
  retry?: { attempts?: number; baseMs?: number };
}
