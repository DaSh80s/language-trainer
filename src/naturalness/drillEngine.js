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
        instruction: 'Say this in German — the way a native would actually put it, not word for word.',
        stimulus: p.english,
        extras: p.extra ? [{ label: 'Note', value: p.extra }] : [],
        inputHint: 'Your German',
      };
    case 'insert':
      return {
        instruction: 'Rewrite this in German so it carries the attitude below.',
        stimulus: p.bare,
        extras: [{ label: 'Attitude', value: p.attitude }],
        inputHint: 'Your version',
      };
    case 'which':
      return {
        instruction: 'Fill the gap with one of the German options below — type just that word.',
        stimulus: p.sentence,
        extras: [
          { label: 'Context', value: p.context },
          { label: 'Options', value: (p.options || []).join('  ·  ') },
        ],
        inputHint: 'Your choice',
      };
    case 'minimalPair':
      return {
        instruction: 'What changes between version 1 and version 2? Answer in English — a sentence is plenty.',
        // Numbered, because several of these pairs are dialogues whose own "A:"
        // and "B:" speaker labels otherwise read as the labels for the two
        // versions, leaving no way to tell which line is which.
        stimulus: `**1 ·** ${p.without}\n\n**2 ·** ${p.with}`,
        extras: [],
        inputHint: 'What changes',
      };
    case 'reverseGloss':
      return {
        instruction: 'What is this conveying? Answer in English — a sentence is plenty.',
        stimulus: p.sentence,
        extras: [],
        inputHint: 'What it conveys',
      };
    case 'react':
      return {
        // Most reactions are one to three words, but a few (buying thinking time,
        // closing a meeting) are naturally a short sentence. Promising "one to
        // three words" and then expecting a sentence is exactly the kind of
        // unclear instruction that leaves the learner guessing.
        instruction: String(item.target || '').trim().split(/\s+/).length > 3
          ? 'Reply in German — one short sentence.'
          : 'Reply in German — one to three words.',
        stimulus: p.line,
        extras: p.situation ? [{ label: 'Situation', value: p.situation }] : [],
        inputHint: 'Your reaction',
      };
    case 'soften': {
      // Start from the intent, never from the clipped German: showing that
      // handed over most of the answer and left "pitched as below" as the only
      // instruction. The clipped version is revealed after answering instead.
      const who = p.who || p.level;
      if (p.goal) {
        return {
          instruction: 'Say this in German — the way you would actually put it to them.',
          stimulus: `**You want to:** ${p.goal}`,
          extras: who ? [{ label: 'Who / how', value: who }] : [],
          inputHint: 'Your German',
        };
      }
      // Imported phrases carry the English meaning of the better version.
      if (item.english) {
        return {
          instruction: 'Say this in German — the way you would actually put it to them.',
          stimulus: `**You want to say:** "${item.english}"`,
          extras: who ? [{ label: 'Who / how', value: who }] : [],
          inputHint: 'Your German',
        };
      }
      // Last resort, with no English to work from: rewrite, but say plainly what that means.
      return {
        instruction: 'This German sounds clipped. Rewrite it in German as a complete, polished version.',
        stimulus: p.blunt,
        extras: who ? [{ label: 'Who / how', value: who }] : [],
        inputHint: 'Your German',
      };
    }
    case 'recap':
      return {
        instruction: 'Summarise this back to them in German before moving on — every key fact, in your own words.',
        stimulus: p.said,
        extras: p.situation ? [{ label: 'Situation', value: p.situation }] : [],
        inputHint: 'Your summary',
      };
    case 'clarify':
      return {
        instruction: 'Ask one clarifying question in German that pins down what is unclear below.',
        stimulus: p.said,
        extras: [{ label: 'Unclear', value: p.unclear }],
        inputHint: 'Your question',
      };
    default:
      return { instruction: 'Answer:', stimulus: item.target, extras: [], inputHint: 'Answer' };
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
  calls: 'a phone-call formula — for checking understanding, agreeing next steps or closing',
  meetings: 'a meeting phrase — for taking the floor, recording a decision or moving on',
  numbers: 'the precise term for the figure, and every detail pinned down',
  candidates: 'a complete, polished question rather than a clipped one',
  email: 'the courtesy formula business email expects',
  mine: 'the phrasing from your own feedback',
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
- Write to the learner directly, in the second person ("you"). Never refer to "the learner".
- Never invent a fault to seem useful.

Fields:
- reached: did the learner attempt the target feature at all (for a particle: did they use it)?
- landed: if reached, did it come out naturally and in the right slot? False if reached is false.
- severity: how foreign the answer sounds. "none" if it is fine.
- naturalText: the natural German. If the learner's answer was already natural, repeat theirs.
- explanation: one or two sentences, English, plain language.
- meaning: what the target word or device actually MEANS and does, in one plain-English line. Fill this in whenever the learner failed to produce it (reached false, or landed false) - they clearly do not know the word yet, and being corrected without being taught is useless. Empty string when they got it right.
- example: one further example sentence using the target, in German, then an em dash, then its English translation. Same rule - fill it in when they missed it, empty string otherwise. Use a DIFFERENT sentence from the expected answer.`;

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    reached: { type: 'boolean' },
    landed: { type: 'boolean' },
    severity: { type: 'string', enum: ['none', 'nitpick', 'noticeable', 'clearly-foreign'] },
    naturalText: { type: 'string' },
    explanation: { type: 'string' },
    meaning: { type: 'string' },
    example: { type: 'string' },
  },
  required: ['reached', 'landed', 'severity', 'naturalText', 'explanation', 'meaning', 'example'],
  additionalProperties: false,
};

/**
 * Build the request body for judging one answer.
 * Posted to /api/chat, which forwards it to the Messages API untouched.
 */
/** Business categories are judged on professional fit as well as naturalness. */
const CATEGORY_GROUP_HINT = {
  calls: 'Context: a professional phone call in Switzerland. Judge whether it sounds like a competent professional, not just a native speaker.',
  meetings: 'Context: a business meeting in Switzerland. Judge professional fit as well as naturalness.',
  numbers: 'Context: discussing figures and employment terms in Switzerland. Precision matters as much as naturalness.',
  candidates: 'Context: a recruiter qualifying a candidate by phone in Switzerland. Questions should be complete and polished, but not stiff or over-long — and must not lean on the same filler (e.g. grundsätzlich) every time.',
  email: 'Context: Swiss business email. Judge courtesy and naturalness of written business German; Swiss spelling (ss, never ß).',
  mine: 'Context: phrasing the learner collected from real feedback on their own speech. Judge naturalness and professional fit; an equally natural alternative is fully correct.',
};

export function buildJudgeRequest(item, answer, elapsedSec) {
  const p = present(item);
  const overTime = item.timeLimitSec && elapsedSec > item.timeLimitSec;
  const context = [
    `Format: ${item.format}`,
    `Target feature: ${item.particle}`,
    `What the learner was shown: ${p.stimulus}`,
    ...(p.extras || []).map((e) => `  ${e.label}: ${e.value}`),
    `Expected natural answer: ${item.target}`,
    item.note ? `Teaching note: ${item.note}` : null,
    item.format === 'soften' && item.prompt?.blunt && (item.prompt?.goal || item.english)
      ? `The clipped version the learner must avoid (NOT shown to them before answering): ${item.prompt.blunt}. If their answer is essentially this clipped version, landed is false.`
      : null,
    item.mustInclude?.length
      ? `This is a RECAP. Key facts the summary must carry: ${item.mustInclude.join('; ')}. A missing or distorted fact means landed is false, and the explanation must name which fact. reached = they actually summarised rather than replying or asking a new question.`
      : null,
    item.mustPin?.length
      ? `This is a CLARIFYING QUESTION. It must pin down: ${item.mustPin.join('; ')}. Anything left open means landed is false — name what was missed. reached = they asked a clarifying question at all. A question that covers everything in a different, natural way is fully correct.`
      : null,
    CATEGORY_GROUP_HINT[item.categoryId] || null,
    item.timeLimitSec
      ? `This item is time-pressured (${item.timeLimitSec}s limit). They answered in ${Math.round(elapsedSec)}s${overTime ? ' — over the limit' : ''}. Judge the German, not the clock, but a fluent-sounding rescue matters more here than a perfectly polished one.`
      : null,
    '',
    `The learner answered: ${answer}`,
  ].filter(Boolean).join('\n');

  return {
    model: JUDGE_MODEL,
    max_tokens: 600,
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
      meaning: '',
      example: '',
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
    meaning: String(raw.meaning || ''),
    example: String(raw.example || ''),
  };
}
