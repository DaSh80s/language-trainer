/**
 * Naturalness Layer — drill engine.
 *
 * Presentation is built deterministically from module content: no API call, no
 * drift, and the opportunity is known rather than inferred (which is what makes
 * the reach metric honest). Only the JUDGING is model-driven, because judging
 * whether German sounds native is the genuinely hard part.
 */

import { FORMATS } from './categories.js';

/** Judging naturalness is much harder than tutoring — do not run it on Haiku. */
export const JUDGE_MODEL = 'claude-sonnet-5';

// ── Scheduling ────────────────────────────────────────────────────────────────

/**
 * Pick the next item. Unseen content first, then anything previously missed,
 * then whatever was seen longest ago.
 *
 * @param {import('./contract.js').DrillItem[]} items
 * @param {Record<string, {seen: number, missed: number, lastSeen: string}>} progress
 * @param {string[]} recentIds  Items served this session, to avoid immediate repeats.
 */
export function pickNext(items, progress = {}, recentIds = []) {
  if (!items.length) return null;
  const recent = new Set(recentIds.slice(-6));
  const eligible = items.filter((i) => !recent.has(i.id));
  const pool = eligible.length ? eligible : items;

  const unseen = pool.filter((i) => !progress[i.id]);
  if (unseen.length) return unseen[Math.floor(Math.random() * unseen.length)];

  const missed = pool
    .filter((i) => (progress[i.id]?.missed || 0) > 0)
    .sort((a, b) => (progress[b.id].missed - progress[a.id].missed));
  if (missed.length) return missed[0];

  return pool
    .slice()
    .sort((a, b) =>
      new Date(progress[a.id]?.lastSeen || 0) - new Date(progress[b.id]?.lastSeen || 0)
    )[0];
}

// ── Presentation ──────────────────────────────────────────────────────────────

/**
 * Build what the learner sees. Returns the instruction line and the stimulus.
 * @param {import('./contract.js').DrillItem} item
 */
export function present(item) {
  const p = item.prompt || {};
  switch (item.format) {
    case 'trapTranslation':
      return {
        instruction: 'Say this in German, the way a native speaker actually would.',
        stimulus: p.english,
        extra: p.extra || null,
        inputHint: 'Your German',
      };
    case 'insert':
      return {
        instruction: 'Rewrite this so it carries the attitude in brackets.',
        stimulus: p.bare,
        extra: `[ ${p.attitude} ]`,
        inputHint: 'Your version',
      };
    case 'which':
      return {
        instruction: 'Which one fits? Type just the word.',
        stimulus: p.sentence,
        extra: `${p.context}   —   ${(p.options || []).join('  ·  ')}`,
        inputHint: 'Your choice',
      };
    case 'minimalPair':
      return {
        instruction: 'What changes between these two? Answer in English.',
        stimulus: `${p.without}\n${p.with}`,
        extra: null,
        inputHint: 'What changes',
      };
    case 'reverseGloss':
      return {
        instruction: 'What is being conveyed here? Answer in English.',
        stimulus: p.sentence,
        extra: null,
        inputHint: 'What it conveys',
      };
    case 'react':
      return {
        instruction: 'React to this in German — one to three words.',
        stimulus: p.line,
        extra: p.situation ? `[ ${p.situation} ]` : null,
        inputHint: 'Your reaction',
      };
    case 'soften':
      return {
        instruction: 'Say the same thing, but pitched as described.',
        stimulus: p.blunt,
        extra: `[ ${p.level} ]`,
        inputHint: 'Your version',
      };
    default:
      return { instruction: 'Answer:', stimulus: item.target, extra: null, inputHint: 'Answer' };
  }
}

/** Does this format probe reach — i.e. was it built as an opportunity? */
export function probesReach(item) {
  return Boolean(FORMATS[item.format]?.probesReach);
}

/**
 * A nudge, in two levels. Local, free, no API call.
 *
 * Level 1 names the DEVICE the item is asking for without saying which one.
 * That is the genuinely useful hint, because the hard part of a reach probe is
 * knowing that a particle belongs there at all — being told the sentence starts
 * "Das ist…" helps nobody.
 *
 * Level 2 reveals the opening, or eliminates a wrong option.
 */
const DEVICE = {
  particles: 'a modal particle — a small word carrying attitude rather than content',
  reactions: 'a reaction token, one to three words',
  discourse: 'a signposting phrase that tells the listener where you are',
  register: 'a softer construction — think Konjunktiv II',
  repair: 'a repair formula that keeps the sentence alive',
  collocations: 'the conventional verb for that noun, which is probably not machen',
  interference: 'a German structure that does not mirror the English one',
};

export function hintFor(item, level = 1) {
  if (!item) return null;

  const analytic = item.format === 'minimalPair' || item.format === 'reverseGloss';

  if (level <= 1 && !analytic) {
    const device = DEVICE[item.categoryId];
    if (device) return `This one wants ${device}. Try again, or type **hint** for more.`;
  }

  if (item.format === 'which') {
    const opts = item.prompt?.options || [];
    const wrong = opts.filter((o) => o !== item.target);
    if (!wrong.length) return 'Think about what each option does to the sentence.';
    return `Not **${wrong[0]}**.`;
  }

  const words = String(item.target || '').trim().split(/\s+/);
  // Reaction and short answers are one to three words by design, so revealing
  // "the first two words" would hand over the whole thing. Reveal letters instead.
  if (words.length <= 2) {
    const head = words[0].replace(/[^\p{L}]/gu, '').slice(0, 2);
    return head ? `It starts with **${head}**…` : 'Think about what the situation calls for.';
  }
  return `It starts: **${words.slice(0, 2).join(' ')}**…`;
}

// ── Judging ───────────────────────────────────────────────────────────────────

const JUDGE_SYSTEM = `You judge whether a German learner's answer sounds NATIVE, not merely correct.

The learner is an advanced (C2) English speaker living in Zurich whose goal is professional spoken German. Their grammar is already good; the gap is naturalness.

You are given a drill item, what the item was probing, and the learner's answer.

Rules:
- Judge naturalness, not grammar. Do not mark down a perfectly natural answer for a comma.
- If the answer uses the target feature naturally, that is a POSITIVE result. Say so. Positive results matter as much as negative ones and are the main thing that keeps a learner going.
- A different but equally natural answer than the expected one is still correct. Germans have more than one way to say most things.
- Be specific and short. One or two sentences of explanation, in English.
- Never invent a fault to seem useful.

Fields:
- reached: did the learner attempt the target feature at all (for a particle: did they use it)?
- landed: if reached, did it come out naturally and in the right slot? False if reached is false.
- severity: how foreign the answer sounds. "none" if it is fine.
- naturalText: the natural German. If the learner's answer was already natural, repeat theirs.
- explanation: one or two sentences, English, plain language.`;

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    reached: { type: 'boolean' },
    landed: { type: 'boolean' },
    severity: { type: 'string', enum: ['none', 'nitpick', 'noticeable', 'clearly-foreign'] },
    naturalText: { type: 'string' },
    explanation: { type: 'string' },
  },
  required: ['reached', 'landed', 'severity', 'naturalText', 'explanation'],
  additionalProperties: false,
};

/**
 * Build the request body for judging one answer.
 * Posted to /api/chat, which forwards it to the Messages API untouched.
 */
export function buildJudgeRequest(item, answer, elapsedSec) {
  const p = present(item);
  const overTime = item.timeLimitSec && elapsedSec > item.timeLimitSec;
  const context = [
    `Format: ${item.format}`,
    `Target feature: ${item.particle}`,
    `What the learner was shown: ${p.stimulus}${p.extra ? `  ${p.extra}` : ''}`,
    `Expected natural answer: ${item.target}`,
    item.note ? `Teaching note: ${item.note}` : null,
    item.timeLimitSec
      ? `This item is time-pressured (${item.timeLimitSec}s limit). They answered in ${Math.round(elapsedSec)}s${overTime ? ' — over the limit' : ''}. Judge the German, not the clock, but a fluent-sounding rescue matters more here than a perfectly polished one.`
      : null,
    '',
    `The learner answered: ${answer}`,
  ].filter(Boolean).join('\n');

  return {
    model: JUDGE_MODEL,
    max_tokens: 400,
    // Sonnet 5 runs adaptive thinking when the parameter is omitted, which would
    // quietly add output tokens to what should be a cheap classification.
    thinking: { type: 'disabled' },
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: JUDGE_SCHEMA },
    },
    // Stable across every call, so it caches once the prefix is long enough.
    system: [{ type: 'text', text: JUDGE_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: context }],
  };
}

/**
 * Tolerant parse. output_config guarantees valid JSON in the first text block,
 * but a proxy hiccup or a model that ignores the schema should degrade to a
 * usable result rather than throwing away the learner's turn.
 */
export function parseJudgement(text) {
  let raw = null;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (match) { try { raw = JSON.parse(match[0]); } catch (e2) { /* fall through */ } }
  }
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      reached: false,
      landed: false,
      severity: null,
      naturalText: '',
      explanation: String(text || '').slice(0, 400) || 'Could not read the response.',
    };
  }
  const sev = raw.severity === 'none' ? null : raw.severity || null;
  return {
    ok: true,
    reached: Boolean(raw.reached),
    landed: Boolean(raw.reached) && Boolean(raw.landed),
    severity: sev,
    naturalText: String(raw.naturalText || ''),
    explanation: String(raw.explanation || ''),
  };
}
