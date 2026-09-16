/**
 * Naturalness Layer — category definitions (language-agnostic core).
 *
 * Nothing German lives in this file. Language-specific content lives in
 * ./modules/<code>.js and is loaded on demand.
 *
 * The seven categories here are the subset of the original thirteen that
 * matter for PROFESSIONAL SPOKEN German. See NATURALNESS.md for what was cut
 * and why.
 *
 * @typedef {'particles'|'reactions'|'discourse'|'register'|'repair'|'collocations'|'interference'|'calls'|'meetings'|'numbers'|'candidates'|'email'} CategoryId
 */

/**
 * @typedef {Object} Category
 * @property {CategoryId} id
 * @property {string} label        Shown in the UI.
 * @property {string} blurb        One line, plain English, shown under the label.
 * @property {number} weight       0-1. How much this category matters for the goal.
 *                                 Used ONLY in the cross-category roll-up, never
 *                                 inside a single category's score.
 */

/** @type {Category[]} */
export const CATEGORIES = [
  {
    id: 'particles',
    group: 'naturalness',
    label: 'Modal particles',
    blurb: 'halt, eben, doch, mal, schon — the small words that carry attitude rather than meaning.',
    weight: 1.0,
  },
  {
    id: 'reactions',
    group: 'naturalness',
    label: 'Reactions',
    blurb: 'genau, ach so, stimmt — reacting like a participant instead of delivering a monologue.',
    weight: 0.9,
  },
  {
    id: 'discourse',
    group: 'naturalness',
    label: 'Turn structure',
    blurb: 'Signposting, opening a point, landing it, and closing without sounding abrupt.',
    weight: 0.8,
  },
  {
    id: 'register',
    group: 'naturalness',
    label: 'Register & softening',
    blurb: 'Konjunktiv II, hedging, du/Sie, and the extra formality Swiss professional German expects.',
    weight: 0.8,
  },
  {
    id: 'repair',
    group: 'naturalness',
    label: 'Self-rescue',
    blurb: 'Rerouting mid-sentence instead of freezing when it goes wrong.',
    weight: 0.7,
  },
  {
    id: 'collocations',
    group: 'naturalness',
    label: 'Collocations',
    blurb: 'eine Entscheidung treffen, not machen. Pairings that are conventional rather than logical.',
    weight: 0.7,
  },
  {
    id: 'interference',
    group: 'naturalness',
    label: 'English traps',
    blurb: 'mir ist langweilig, not ich bin gelangweilt. Errors only English speakers make.',
    weight: 0.9,
  },
  // ── Business: work situations ────────────────────────────────────────────
  // Same drill engine, different lens. Naturalness asks "does this sound
  // native?"; Business asks "does this sound like a professional who does this
  // job in this language?". Built for general use — Candidate calls is one pack
  // among several, useful to any recruiter or hiring manager.
  {
    id: 'calls',
    group: 'business',
    label: 'Phone calls',
    blurb: 'Opening a call, checking you have understood, agreeing next steps, and closing without sounding abrupt.',
    weight: 0.8,
  },
  {
    id: 'meetings',
    group: 'business',
    label: 'Meetings',
    blurb: 'Taking the floor, disagreeing constructively, recording decisions and moving the agenda on.',
    weight: 0.8,
  },
  {
    id: 'numbers',
    group: 'business',
    label: 'Numbers & terms',
    blurb: 'Salary, Pensum, notice periods and start dates — pinning figures down so nothing is noted wrongly.',
    weight: 0.8,
  },
  {
    id: 'candidates',
    group: 'business',
    label: 'Candidate calls',
    blurb: 'Qualifying a candidate — motivation, location, availability, permits — in complete, polished questions.',
    weight: 0.8,
  },
  {
    id: 'email',
    group: 'business',
    label: 'Email',
    blurb: 'Business email that reads naturally: openings, requests, follow-ups and sign-offs.',
    weight: 0.6,
  },
];

/** The dropdown groups, in display order. Mode ids are `<prefix><categoryId>`. */
export const GROUPS = [
  { id: 'naturalness', prefix: 'nat:', label: 'Naturalness — sound native' },
  { id: 'business', prefix: 'biz:', label: 'Business — work situations' },
];

export const categoryIdsInGroup = (group) => CATEGORIES.filter((c) => c.group === group).map((c) => c.id);

/** @type {Record<CategoryId, Category>} */
export const CATEGORY_BY_ID = CATEGORIES.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/**
 * The five drill formats. Presentation is built deterministically from module
 * content (no API call, no drift); only the JUDGING is model-driven.
 *
 * trapTranslation is the reach probe: an English sentence whose natural German
 * wants the feature. English has no particle, so a literal translation omits it.
 * Because the item WAS the opportunity, reach is a known count rather than a
 * model judgement.
 */
export const FORMATS = {
  trapTranslation: {
    id: 'trapTranslation',
    label: 'Say this in German',
    probesReach: true,
  },
  insert: {
    id: 'insert',
    label: 'Add the attitude',
    probesReach: true,
  },
  which: {
    id: 'which',
    label: 'Which one fits?',
    probesReach: false,
  },
  minimalPair: {
    id: 'minimalPair',
    label: 'What changes?',
    probesReach: false,
  },
  reverseGloss: {
    id: 'reverseGloss',
    label: 'What is being conveyed?',
    probesReach: false,
  },
  // Reactions: a line is given, the learner answers in one to three words.
  // Learners can narrate but cannot react, which is why they sound like they
  // are delivering a monologue rather than taking part in one.
  react: {
    id: 'react',
    label: 'React to this',
    probesReach: true,
  },
  // Register: the same content restated at a named politeness level. The
  // grammar is already known; this is grammar used for social effect.
  soften: {
    id: 'soften',
    label: 'Say that again, but',
    probesReach: true,
  },
  // Business: someone has told you several facts; summarise them back before
  // moving on. Judged on accuracy (every key fact, none distorted) as well as
  // on how it sounds.
  recap: {
    id: 'recap',
    label: 'Summarise it back',
    probesReach: true,
  },
  // Business: an answer is ambiguous ("Ab 145."); ask the one question that
  // pins down what would otherwise be noted wrongly.
  clarify: {
    id: 'clarify',
    label: 'Pin it down',
    probesReach: true,
  },
};
