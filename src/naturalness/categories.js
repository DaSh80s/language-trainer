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
 * @typedef {'particles'|'reactions'|'discourse'|'register'|'repair'|'collocations'|'interference'} CategoryId
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
    label: 'Modal particles',
    blurb: 'halt, eben, doch, mal, schon — the small words that carry attitude rather than meaning.',
    weight: 1.0,
  },
  {
    id: 'reactions',
    label: 'Reactions',
    blurb: 'genau, ach so, stimmt — reacting like a participant instead of delivering a monologue.',
    weight: 0.9,
  },
  {
    id: 'discourse',
    label: 'Turn structure',
    blurb: 'Signposting, opening a point, landing it, and closing without sounding abrupt.',
    weight: 0.8,
  },
  {
    id: 'register',
    label: 'Register & softening',
    blurb: 'Konjunktiv II, hedging, du/Sie, and the extra formality Swiss professional German expects.',
    weight: 0.8,
  },
  {
    id: 'repair',
    label: 'Self-rescue',
    blurb: 'Rerouting mid-sentence instead of freezing when it goes wrong.',
    weight: 0.7,
  },
  {
    id: 'collocations',
    label: 'Collocations',
    blurb: 'eine Entscheidung treffen, not machen. Pairings that are conventional rather than logical.',
    weight: 0.7,
  },
  {
    id: 'interference',
    label: 'English traps',
    blurb: 'mir ist langweilig, not ich bin gelangweilt. Errors only English speakers make.',
    weight: 0.9,
  },
];

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
};
