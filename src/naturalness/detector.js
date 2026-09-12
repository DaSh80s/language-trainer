/**
 * Naturalness Layer — the passive detector ("ride-along").
 *
 * Runs on the learner's own turns in the ORDINARY practice modes, alongside the
 * tutor reply rather than instead of it. Output is not a correction — the
 * sentence was already correct — but an upgrade.
 *
 * One model call per turn with every category's hints composed into a single
 * prompt, not one call per category.
 */

import { CATEGORY_BY_ID } from './categories.js';

export const DETECTOR_MODEL = 'claude-sonnet-5';

/** Hard cap. More than this and the learner stops reading them. */
export const MAX_FINDINGS = 3;

const SYSTEM = `You upgrade an advanced German learner's output from CORRECT to NATIVE.

The learner is a C2 English speaker living in Zurich. Their goal is professional spoken German. Their grammar is already good.

You are given one turn they wrote. Return upgrades, not corrections.

Hard rules:
- Flag ONLY what is grammatically correct but unnatural. If something is an outright grammatical ERROR, stay silent about it — a separate grammar engine already handles errors, and reporting it twice is worse than not reporting it.
- At most ${MAX_FINDINGS} findings. Fewer is better. If the turn is fine, return none — an empty list is a good outcome, not a failure.
- NEVER flag the absence of an idiom or a figure of speech. "You could have used a Redewendung here" is unhelpful and pushes learners into forced, overstuffed German.
- Never invent a fault to seem useful. A short, plain, natural sentence needs no upgrade.
- Do not flag a turn that is only one or two words, or that is a direct answer to a drill.
- If the learner wrote in English rather than the target language, return nothing at all. Some practice modes ask for answers in English, and judging those for German naturalness is meaningless.

ALSO record what went RIGHT. If the learner used a modal particle, a reaction token, a correct collocation, a softened request or a signposting phrase naturally, record it as a positive. Positives drive the learner's score upward and are the main reason they keep going — do not skip them because finding faults feels more useful.

Write explanations in English, one or two sentences, plain language.`;

const SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoryId: { type: 'string', enum: Object.keys(CATEGORY_BY_ID) },
          learnerText: { type: 'string' },
          naturalText: { type: 'string' },
          explanation: { type: 'string' },
          severity: { type: 'string', enum: ['nitpick', 'noticeable', 'clearly-foreign'] },
        },
        required: ['categoryId', 'learnerText', 'naturalText', 'explanation', 'severity'],
        additionalProperties: false,
      },
    },
    positives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          categoryId: { type: 'string', enum: Object.keys(CATEGORY_BY_ID) },
          learnerText: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['categoryId', 'learnerText', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings', 'positives'],
  additionalProperties: false,
};

/**
 * Compose the per-category guidance into one prompt.
 * @param {import('./contract.js').LanguageModule} mod
 */
function hintBlock(mod) {
  if (!mod) return '';
  return Object.entries(mod.categories)
    .filter(([, c]) => c.enabled && c.detectorHints?.length)
    .map(([id, c]) => {
      const cat = CATEGORY_BY_ID[id];
      const h = c.detectorHints[0];
      const pos = h.positiveExamples?.length ? `\n  natural: ${h.positiveExamples.join(' | ')}` : '';
      const neg = h.negativeExamples?.length ? `\n  flat: ${h.negativeExamples.join(' | ')}` : '';
      return `- ${id} (${cat?.label || id}): ${h.guidance}${pos}${neg}`;
    })
    .join('\n');
}

/**
 * @param {string} learnerText  The learner's turn.
 * @param {import('./contract.js').LanguageModule} mod
 * @param {string} language
 */
export function buildDetectorRequest(learnerText, mod, language = 'German') {
  const hints = hintBlock(mod);
  return {
    model: DETECTOR_MODEL,
    max_tokens: 700,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // Stable across every call in a session, so it caches.
    system: [{
      type: 'text',
      text: `${SYSTEM}\n\nCategories and what to look for in ${language}:\n${hints}`,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{ role: 'user', content: `The learner wrote:\n\n${learnerText}` }],
  };
}

/** Should this turn be analysed at all? Cheap local gate before spending a call. */
export function worthAnalysing(text) {
  const t = String(text || '').trim();
  if (t.length < 12) return false;              // one-word answers carry nothing
  if (!/\s/.test(t)) return false;              // single token
  if (/^(y|yes|n|no|ja|nein|ok|okay)$/i.test(t)) return false;  // drill control answers
  return true;
}

export function parseDetection(text) {
  let raw = null;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (m) { try { raw = JSON.parse(m[0]); } catch (e2) { /* ignore */ } }
  }
  if (!raw || typeof raw !== 'object') return { ok: false, findings: [], positives: [] };

  const findings = Array.isArray(raw.findings) ? raw.findings : [];
  const positives = Array.isArray(raw.positives) ? raw.positives : [];
  return {
    ok: true,
    // The cap is enforced here as well as in the prompt: a model that ignores
    // the instruction should not be able to bury the learner in notes.
    findings: findings.filter((f) => f && f.categoryId && CATEGORY_BY_ID[f.categoryId]).slice(0, MAX_FINDINGS),
    positives: positives.filter((p) => p && p.categoryId && CATEGORY_BY_ID[p.categoryId]).slice(0, MAX_FINDINGS),
  };
}

/** Turn a detection into stored findings. Free text has no known opening, so
 *  these never count toward reach — only drills can measure that honestly. */
export function toFindings(detection, sourceText) {
  const now = new Date().toISOString();
  const mk = (categoryId, learnerText, naturalText, explanation, landed, severity) => ({
    id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoryId,
    itemId: null,
    particle: 'free practice',
    probedReach: false,
    reached: true,
    landed,
    severity: severity || null,
    learnerText: learnerText || sourceText,
    naturalText: naturalText || '',
    explanation: explanation || '',
    timestamp: now,
    source: 'detector',
  });
  return [
    ...detection.findings.map((f) => mk(f.categoryId, f.learnerText, f.naturalText, f.explanation, false, f.severity)),
    ...detection.positives.map((p) => mk(p.categoryId, p.learnerText, p.learnerText, p.note, true, null)),
  ];
}
