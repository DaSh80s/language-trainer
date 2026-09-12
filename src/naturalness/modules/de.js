/**
 * German naturalness module.
 *
 * One file per category under ./de/ — with this much content a single file
 * would be unmaintainable. They are imported statically here, so Vite still
 * bundles the whole German module into one lazily-loaded chunk; nothing German
 * reaches first paint.
 *
 * Register tags do real work: a mislabelled item actively teaches the wrong
 * thing. Items whose gloss is genuinely contested carry `confidence: 'review'`
 * so they surface a warning in the app rather than being trusted blindly.
 *
 * Swiss orthography throughout (ss, never ß), and Swiss-specific items are
 * tagged `variantTags: ['ch']`.
 */

import particles from './de/particles.js';
import reactions from './de/reactions.js';
import discourse from './de/discourse.js';
import register from './de/register.js';
import repair from './de/repair.js';
import collocations from './de/collocations.js';
import interference from './de/interference.js';

/** @type {import('../contract.js').LanguageModule} */
const de = {
  code: 'de',
  label: 'German',
  variants: [{ id: 'ch', label: 'Swiss Standard German' }],
  categories: {
    particles,
    reactions,
    discourse,
    register,
    repair,
    collocations,
    interference,
  },
};

export default de;
