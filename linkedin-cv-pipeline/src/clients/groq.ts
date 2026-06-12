import type { CandidateProfile, CvAnalyzer, CvAttachment, FitScore } from '../types.js';

export interface GroqConfig {
  apiKey: string;
  model: string;
}

/**
 * Groq adapter: CV → structured profile, and profile + JD → fit score (DECISIONS D4).
 * Skeleton — prompts and JSON-schema response handling land in Milestone 4.
 */
export class GroqAnalyzer implements CvAnalyzer {
  constructor(private readonly config: GroqConfig) {}

  async parseCv(attachment: CvAttachment): Promise<CandidateProfile> {
    throw new Error(`GroqAnalyzer.parseCv(${attachment.filename}) not implemented until Milestone 4`);
  }

  async scoreFit(profile: CandidateProfile, jobDescription: string): Promise<FitScore> {
    void profile;
    void jobDescription;
    throw new Error('GroqAnalyzer.scoreFit not implemented until Milestone 4');
  }
}
