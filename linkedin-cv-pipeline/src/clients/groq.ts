import { HttpApiError } from '../core/apiError.js';
import { extractCvText, type TextExtractor } from '../core/cvText.js';
import type { CandidateProfile, CvAnalyzer, CvAttachment, FitScore } from '../types.js';

export interface GroqConfig {
  apiKey: string;
  model: string;
}

export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

export class GroqApiError extends HttpApiError {
  constructor(status: number, body: string) {
    super('Groq', status, body);
  }
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Keeps even bloated CVs well inside the context window. */
const MAX_CV_CHARS = 24_000;

/** Overall = weighted blend of sub-scores, computed here — deterministic, not model whim. */
export const FIT_WEIGHTS = { skills: 0.45, experience: 0.35, seniority: 0.2 } as const;

const PARSE_SYSTEM = `You extract structured data from CVs/resumes for a recruitment CRM.
Respond with a single JSON object, nothing else:
{"name": string, "email": string, "phone": string|null, "location": string|null,
 "current_title": string|null, "experience_years": number|null,
 "skills": string[] (max 15, most significant first),
 "education": string[] (degrees/certifications, max 6),
 "summary": string (2-3 sentences, factual, no hype)}
Use null/[] when information is absent. Never invent contact details.`;

const SCORE_SYSTEM = `You score a candidate profile against a job description for a recruitment CRM.
Respond with a single JSON object, nothing else:
{"skills": integer 0-100, "experience": integer 0-100, "seniority": integer 0-100,
 "rationale": string (3-4 sentences citing concrete evidence from the profile)}
skills = overlap of candidate skills with the JD's required skills.
experience = relevance and depth of work history for this role's domain.
seniority = match of candidate level to the role's level (over- and under-qualification both reduce it).
Be strict: 80+ means a recruiter would shortlist without hesitation.`;

interface ChatResponse {
  choices: { message: { content: string } }[];
}

const clamp = (n: unknown): number => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

export class GroqAnalyzer implements CvAnalyzer {
  constructor(
    private readonly config: GroqConfig,
    private readonly extractText: TextExtractor = extractCvText,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async chat(system: string, user: string): Promise<Record<string, unknown>> {
    const res = await this.fetchImpl(GROQ_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw new GroqApiError(res.status, await res.text());
    const data = (await res.json()) as ChatResponse;
    const content = data.choices[0]?.message.content ?? '';
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error(`Groq returned non-JSON content: ${content.slice(0, 200)}`);
    }
  }

  async parseCv(attachment: CvAttachment): Promise<CandidateProfile> {
    const cvText = (await this.extractText(attachment)).slice(0, MAX_CV_CHARS);
    const raw = await this.chat(PARSE_SYSTEM, `CV file "${attachment.filename}":\n\n${cvText}`);

    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      // Email is the dedupe key (D8); without it the record can't be safely written.
      throw new Error(`CV parse found no candidate email in ${attachment.filename} — manual import needed`);
    }
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const strArr = (v: unknown) =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : [];

    return {
      name: str(raw.name) ?? email,
      email: email.toLowerCase(),
      phone: str(raw.phone),
      location: str(raw.location),
      currentTitle: str(raw.current_title),
      experienceYears: typeof raw.experience_years === 'number' ? raw.experience_years : undefined,
      skills: strArr(raw.skills),
      education: strArr(raw.education),
      summary: str(raw.summary),
    };
  }

  async scoreFit(profile: CandidateProfile, jobDescription: string): Promise<FitScore> {
    const raw = await this.chat(
      SCORE_SYSTEM,
      `JOB DESCRIPTION:\n${jobDescription.slice(0, MAX_CV_CHARS)}\n\nCANDIDATE PROFILE:\n${JSON.stringify(profile, null, 1)}`,
    );
    const skills = clamp(raw.skills);
    const experience = clamp(raw.experience);
    const seniority = clamp(raw.seniority);
    return {
      skills,
      experience,
      seniority,
      overall: Math.round(
        skills * FIT_WEIGHTS.skills + experience * FIT_WEIGHTS.experience + seniority * FIT_WEIGHTS.seniority,
      ),
      rationale: typeof raw.rationale === 'string' ? raw.rationale : undefined,
    };
  }
}
