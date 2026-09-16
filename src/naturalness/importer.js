/**
 * Feedback importer: turn pasted feedback on the learner's own language into a
 * personal drill pack ("My phrases").
 *
 * Input is anything with concrete better phrasings in it: an AI review of a
 * call, a teacher's corrections, a list of alternatives. One model call pulls
 * the phrases out; they become ordinary drill items, so the whole existing
 * engine — judging, hints, teaching on a miss, scoring — works on them.
 *
 * Nothing is saved without the learner seeing it first. Extraction can be
 * wrong, and a wrong phrase drilled into memory is worse than none.
 */

export const IMPORT_MODEL = 'claude-sonnet-5';
export const MAX_IMPORT_ITEMS = 40;

const SYSTEM = (language) => `You turn feedback on a learner's own ${language} into drill items.

The feedback might be an AI review of a call, a teacher's corrections, or a list of better phrasings. Extract every CONCRETE improved phrase it offers.

Hard rules:
- Only extract phrasing that actually appears in the feedback. Never invent new phrases, and never "improve" the suggested ones beyond fixing an obvious typo. Keep the spelling as given (for example Swiss ss is correct, not an error).
- Skip general advice that has no concrete phrase attached ("summarise more", "be more precise").
- One item per phrase. If a list offers several alternatives, each is its own item. No duplicates.
- At most ${MAX_IMPORT_ITEMS} items.
- All English you write is British English.

Fields for each item:
- youSaid: the learner's original wording, if the feedback shows it (for example a table of "apparent wording" against "more natural alternative"). Otherwise an empty string.
- better: the improved phrase in ${language}, exactly as suggested. A single phrase or sentence, never a list.
- situation: short English telling the learner when and how to use it — written as an instruction for pitching it, e.g. "a polished question to a candidate about their preferred location". Never empty.
- english: an English translation of "better".
- meaning: one plain-English line on what the key word or construction does, so a learner who has never met it understands it. Do not start by repeating the key phrase (write "to have a clear overall understanding", not "'ein gutes Bild haben' means …").
- keyPhrase: the one-to-four-word core expression being taught, in ${language} (e.g. "infrage kommen", "Verstanden").`;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          youSaid: { type: 'string' },
          better: { type: 'string' },
          situation: { type: 'string' },
          english: { type: 'string' },
          meaning: { type: 'string' },
          keyPhrase: { type: 'string' },
        },
        required: ['youSaid', 'better', 'situation', 'english', 'meaning', 'keyPhrase'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

export function buildImportRequest(feedbackText, language = 'German') {
  return {
    model: IMPORT_MODEL,
    max_tokens: 6000,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM(language),
    messages: [{ role: 'user', content: `Feedback:\n\n${String(feedbackText || '').slice(0, 40000)}` }],
  };
}

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const norm = (v) => clean(v).toLowerCase().replace(/[.!?…]+$/, '');

/**
 * Parse the model's reply into drill items. Tolerant: a malformed reply yields
 * an empty list and an error message rather than a crash.
 */
export function parseImport(text, stamp = Date.now()) {
  let raw = null;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (m) { try { raw = JSON.parse(m[0]); } catch (e2) { /* ignore */ } }
  }
  if (!raw || !Array.isArray(raw.items)) return { ok: false, items: [], error: 'Could not read any phrases from that.' };

  const seen = new Set();
  const items = [];
  raw.items.slice(0, MAX_IMPORT_ITEMS).forEach((x, i) => {
    const better = clean(x.better);
    if (!better || seen.has(norm(better))) return;
    seen.add(norm(better));
    items.push(toDrillItem({
      youSaid: clean(x.youSaid),
      better,
      situation: clean(x.situation),
      english: clean(x.english),
      meaning: clean(x.meaning),
      keyPhrase: clean(x.keyPhrase),
    }, `mine-${stamp}-${i}`));
  });
  return { ok: true, items, error: items.length ? null : 'No concrete phrases found — the feedback may only contain general advice.' };
}

/**
 * One extracted phrase → one drill item.
 *
 * With the learner's own original wording, it is a soften drill: here is what
 * you said, say it better. Without it, a translation drill from the English.
 */
export function toDrillItem(x, id) {
  const common = {
    id,
    categoryId: 'mine',
    particle: x.keyPhrase || x.better,
    register: 'neutral',
    professionalSafe: true,
    target: x.better,
    meaning: x.meaning || '',
    english: x.english || '',
    note: '',
    source: 'import',
    addedAt: new Date().toISOString(),
  };
  if (x.youSaid && norm(x.youSaid) !== norm(x.better)) {
    return {
      ...common,
      format: 'soften',
      // Shown as "You want to say" (from the English) with the situation; the
      // learner's own clipped wording is only revealed after they answer.
      prompt: { blunt: x.youSaid, level: x.situation || 'more natural and more professional', who: x.situation || '' },
    };
  }
  return {
    ...common,
    format: 'trapTranslation',
    prompt: x.situation
      ? { english: x.english || x.better, extra: x.situation }
      : { english: x.english || x.better },
  };
}

/** Add new items to a pack, dropping any whose target is already there. */
export function mergeIntoPack(pack, incoming) {
  const have = new Set((pack || []).map((i) => norm(i.target)));
  const added = (incoming || []).filter((i) => !have.has(norm(i.target)));
  return { pack: [...(pack || []), ...added], added: added.length, skipped: (incoming || []).length - added.length };
}

/**
 * The language module with the learner's pack merged in as the 'mine'
 * category. Reference glosses come from each item's extracted meaning, so
 * teaching on a miss works for imported phrases too.
 */
export function mergeMyPack(mod, pack) {
  if (!mod) return mod;
  const items = Array.isArray(pack) ? pack : [];
  const refs = [];
  const seen = new Set();
  items.forEach((it) => {
    const key = String(it.particle || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    refs.push({ particle: it.particle, sense: it.meaning || it.english || it.target, note: '' });
  });
  return {
    ...mod,
    categories: {
      ...mod.categories,
      mine: { enabled: true, weight: 0.9, reference: refs, items, detectorHints: [] },
    },
  };
}
