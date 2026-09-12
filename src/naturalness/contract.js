/**
 * Naturalness Layer — the language-module contract.
 *
 * Types only; no runtime code. Every language module exports this same shape.
 * Missing categories are simply absent or `enabled: false`, and the UI hides
 * or greys what is absent rather than showing an empty panel.
 *
 * Documented as JSDoc rather than TypeScript deliberately — see NATURALNESS.md.
 */

/**
 * @typedef {import('./categories.js').CategoryId} CategoryId
 * @typedef {'trapTranslation'|'insert'|'which'|'minimalPair'|'reverseGloss'} DrillFormat
 * @typedef {'formal'|'neutral'|'colloquial'|'slang'} Register
 * @typedef {'nitpick'|'noticeable'|'clearly-foreign'} Severity
 */

/**
 * @typedef {Object} DrillItem
 * @property {string} id
 * @property {string} particle        The feature being drilled (a particle, a collocation, …).
 * @property {DrillFormat} format
 * @property {Object} prompt          Format-specific presentation. Built deterministically,
 *                                    never generated, so the drill is fast and controlled.
 * @property {string} target          The natural form, or the expected explanation.
 * @property {string} [note]          One line on why, shown after answering.
 * @property {Register} register
 * @property {boolean} [professionalSafe]
 * @property {string[]} [variantTags] e.g. ['ch'] for Swiss-only.
 * @property {'review'} [confidence]  Set where the gloss is genuinely contested and wants
 *                                    checking by a speaker rather than trusting blindly.
 * @property {string} [audioHint]     Stress/intonation note. Reserved for the voice phase —
 *                                    nothing reads it yet, but it stays in the schema so
 *                                    adding voice is not a migration.
 */

/**
 * @typedef {Object} CategoryContent
 * @property {boolean} enabled
 * @property {number} weight
 * @property {Array<Object>} [reference]
 * @property {DrillItem[]} items
 * @property {Array<{guidance: string, positiveExamples?: string[], negativeExamples?: string[]}>} detectorHints
 */

/**
 * @typedef {Object} LanguageModule
 * @property {string} code
 * @property {string} label
 * @property {Array<{id: string, label: string}>} [variants]
 * @property {Partial<Record<CategoryId, CategoryContent>>} categories
 */

/**
 * One logged observation. Kept separate from the grammar error store at the
 * data layer, even though both surface near each other in the UI.
 *
 * @typedef {Object} NaturalnessFinding
 * @property {string} id
 * @property {CategoryId} categoryId
 * @property {string} itemId
 * @property {string} particle
 * @property {boolean} probedReach    Whether this item was built as an opportunity, so the
 *                                    denominator for reach is known rather than guessed.
 * @property {boolean} reached        Did the learner attempt the feature at all.
 * @property {boolean} landed         If reached, did it come out naturally.
 * @property {Severity|null} severity
 * @property {string} learnerText
 * @property {string} naturalText
 * @property {string} explanation
 * @property {string} timestamp
 */

export {};
