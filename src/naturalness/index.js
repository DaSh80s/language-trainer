/**
 * Naturalness Layer — public entry point.
 *
 * Language modules load with dynamic import() so Vite code-splits them: the
 * German content never reaches first paint, and adding Spanish later does not
 * grow the initial bundle. Language is chosen at session setup, which is a
 * natural boundary for the split.
 */

export { CATEGORIES, CATEGORY_BY_ID, CATEGORY_IDS, FORMATS } from './categories.js';
export * as scoring from './scoring.js';
export { pickNext, present, probesReach, buildJudgeRequest, parseJudgement, hintFor, JUDGE_MODEL } from './drillEngine.js';

/** App language names → module codes. Absent means no module exists yet. */
const MODULE_CODES = { German: 'de' };

const cache = {};

/**
 * Load the module for an app language name, or null if none exists.
 * @param {string} languageName e.g. 'German'
 */
export async function loadModule(languageName) {
  const code = MODULE_CODES[languageName];
  if (!code) return null;
  if (cache[code]) return cache[code];
  try {
    const mod = await import(`./modules/${code}.js`);
    cache[code] = mod.default;
    return cache[code];
  } catch (e) {
    console.error('Naturalness module failed to load:', languageName, e);
    return null;
  }
}

/** Is there any built content for this language? */
export function hasModule(languageName) {
  return Boolean(MODULE_CODES[languageName]);
}

/** Categories that actually have content in this module, in CATEGORIES order. */
export function builtCategories(mod) {
  if (!mod) return [];
  return Object.entries(mod.categories)
    .filter(([, c]) => c.enabled && c.items.length)
    .map(([id]) => id);
}

/** All drill items for the chosen categories. */
export function itemsFor(mod, categoryIds) {
  if (!mod) return [];
  return categoryIds.flatMap((id) => {
    const c = mod.categories[id];
    return c && c.enabled ? c.items.map((it) => ({ ...it, categoryId: id })) : [];
  });
}
