import { describe, expect, it } from 'vitest';
import { FIT_WEIGHTS, GroqAnalyzer, GroqApiError } from '../src/clients/groq.js';
import type { CandidateProfile, CvAttachment } from '../src/types.js';

const attachment: CvAttachment = {
  filename: 'CV_Maya_Cohen.pdf',
  mimeType: 'application/pdf',
  contentBase64: btoa('irrelevant - extractor is stubbed'),
};

const profile: CandidateProfile = {
  name: 'Maya Cohen',
  email: 'maya@example.com',
  skills: ['SQL'],
  education: [],
};

function analyzerWith(reply: unknown, status = 200) {
  const calls: { url: string; body: any }[] = [];
  const fetchStub = (async (url: any, init: any) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (status !== 200) return new Response('rate limited', { status });
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }),
      { status: 200 },
    );
  }) as typeof fetch;
  const analyzer = new GroqAnalyzer(
    { apiKey: 'gk', model: 'test-model' },
    async () => 'Maya Cohen\nmaya@example.com\nSenior Backend Engineer',
    fetchStub,
  );
  return { analyzer, calls };
}

describe('GroqAnalyzer.parseCv', () => {
  it('maps the JSON reply to a CandidateProfile and normalizes the email', async () => {
    const { analyzer, calls } = analyzerWith({
      name: 'Maya Cohen',
      email: 'Maya@Example.com',
      phone: '+41 79 123 45 67',
      location: 'Zurich',
      current_title: 'Senior Backend Engineer',
      experience_years: 9,
      skills: ['TypeScript', 'SQL'],
      education: ['BSc CS'],
      summary: 'Senior engineer.',
    });
    const result = await analyzer.parseCv(attachment);
    expect(result.email).toBe('maya@example.com');
    expect(result.name).toBe('Maya Cohen');
    expect(result.skills).toEqual(['TypeScript', 'SQL']);
    expect(result.experienceYears).toBe(9);

    const body = calls[0]!.body;
    expect(body.model).toBe('test-model');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.temperature).toBe(0);
    expect(body.messages[1].content).toContain('maya@example.com'); // CV text reached the prompt
  });

  it('refuses a parse without a usable email (dedupe key)', async () => {
    const { analyzer } = analyzerWith({ name: 'Mystery Person', email: 'not-an-email', skills: [] });
    await expect(analyzer.parseCv(attachment)).rejects.toThrow(/no candidate email/);
  });

  it('tolerates null/missing optional fields', async () => {
    const { analyzer } = analyzerWith({ name: null, email: 'x@y.ch', skills: null, education: null });
    const result = await analyzer.parseCv(attachment);
    expect(result.name).toBe('x@y.ch'); // falls back to email
    expect(result.skills).toEqual([]);
  });
});

describe('GroqAnalyzer.scoreFit', () => {
  it('clamps sub-scores and computes the weighted overall deterministically', async () => {
    const { analyzer } = analyzerWith({ skills: 120, experience: -5, seniority: 60, rationale: 'Solid.' });
    const fit = await analyzer.scoreFit(profile, 'JD text');
    expect(fit).toEqual({
      skills: 100,
      experience: 0,
      seniority: 60,
      overall: Math.round(100 * FIT_WEIGHTS.skills + 0 * FIT_WEIGHTS.experience + 60 * FIT_WEIGHTS.seniority),
      rationale: 'Solid.',
    });
  });
});

describe('Groq error handling', () => {
  it('marks 429 retryable so withRetry backs off instead of failing fast', async () => {
    const { analyzer } = analyzerWith({}, 429);
    const err = await analyzer.parseCv(attachment).catch((e) => e);
    expect(err).toBeInstanceOf(GroqApiError);
    expect(err.retryable).toBe(true);
  });

  it('marks 400 non-retryable', async () => {
    const { analyzer } = analyzerWith({}, 400);
    const err = await analyzer.parseCv(attachment).catch((e) => e);
    expect(err.retryable).toBe(false);
  });
});
