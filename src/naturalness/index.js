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

/**
 * What a target feature means, from the module's own curated reference.
 *
 * Preferred over asking the model for a gloss: these were written and checked
 * deliberately, and the contested ones (halt vs eben) carry their caveats.
 * Returns null where the category has no per-word reference — collocations and
 * interference tag every item with a generic feature name, so there is nothing
 * to key on and the judge supplies the gloss instead.
 */
export function referenceFor(mod, categoryId, particle) {
  if (!mod || !particle) return null;
  const cat = mod.categories?.[categoryId];
  if (!cat?.reference) return null;
  const key = String(particle).trim().toLowerCase();
  return cat.reference.find((r) => String(r.particle).trim().toLowerCase() === key) || null;
}

/**
 * Another worked example of the same feature, taken from a different drill item.
 *
 * trapTranslation items carry the English they were built from, so they give a
 * German sentence with its gloss for free — no generation, no invented example.
 */
export function exampleFor(mod, categoryId, particle, excludeItemId) {
  if (!mod || !particle) return null;
  const cat = mod.categories?.[categoryId];
  if (!cat?.items) return null;
  const key = String(particle).trim().toLowerCase();
  const hit = cat.items.find((it) => (
    it.id !== excludeItemId
    && String(it.particle).trim().toLowerCase() === key
    && it.format === 'trapTranslation'
    && it.prompt?.english
    && it.target
  ));
  return hit ? { german: hit.target, english: hit.prompt.english } : null;
}
