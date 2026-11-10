/**
 * Vocabulary helpers — pure logic, no React, so it can be tested in Node.
 *
 * A saved word may carry an optional `pos` (part of speech). Words saved before
 * the field existed have none, and must keep working: for those the part of
 * speech is derived where that is safe (a leading article means a noun, an
 * English gloss starting "to " means a verb) and otherwise left unknown.
 * Unknown shows nothing — a guessed tag is worse than no tag.
 */

export const PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'];

export const POS_LABEL = {
  noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb', phrase: 'Phrase', other: 'Other',
};
export const POS_PLURAL = {
  noun: 'Nouns', verb: 'Verbs', adjective: 'Adjectives', adverb: 'Adverbs', phrase: 'Phrases', other: 'Other',
};

export const ARTICLES = new Set([
  'der', 'die', 'das', 'el', 'la', 'le', 'les', 'los', 'las', 'un', 'una', 'une',
  'il', 'lo', 'gli', 'de', 'het', 'ett', 'en',
]);

export function splitArticle(word) {
  if (!word) return [null, word || ''];
  const parts = String(word).trim().split(/\s+/);
  if (parts.length > 1 && ARTICLES.has(parts[0].toLowerCase())) {
    return [parts[0], parts.slice(1).join(' ')];
  }
  return [null, word];
}

const POS_ALIASES = [
  ['noun', /^(n|noun|nomen|substantiv|substantive|sustantivo|nom)\b/],
  ['verb', /^(v|vb|verb|verbo|verbe)\b/],
  ['adjective', /^(adj|adjective|adjektiv|adjetivo|adjectif)\b/],
  ['adverb', /^(adv|adverb|adverbio|adverbe)\b/],
  ['phrase', /^(phrase|expression|idiom|collocation|redewendung|ausdruck)\b/],
  ['other', /^(other|particle|partikel|preposition|conjunction|pronoun|interjection|numeral|article|determiner)\b/],
];

/** Map whatever was typed or returned ("Noun (f.)", "adj.", "Substantiv") onto the six values, or null. */
export function normalizePos(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/^[^a-z]+/, '');
  if (!s) return null;
  const hit = POS_ALIASES.find(([, re]) => re.test(s));
  return hit ? hit[0] : null;
}

/** The part of speech of a saved word: stored if present, else derived where safe, else null. */
export function posOf(v) {
  if (!v) return null;
  const stored = normalizePos(v.pos);
  if (stored) return stored;
  if (splitArticle(v.word)[0]) return 'noun';
  if (/^to\s+\S/i.test(String(v.translation || '').trim())) return 'verb';
  return null;
}

/** Parts of speech actually present in a list, in canonical order, with counts. */
export function posCounts(list) {
  const counts = {};
  (list || []).forEach((v) => { const p = posOf(v); if (p) counts[p] = (counts[p] || 0) + 1; });
  return PARTS_OF_SPEECH.filter((p) => counts[p]).map((p) => ({ pos: p, count: counts[p] }));
}

/** The line format the vocabulary tutor is asked to use for each new word. */
export const VOCAB_LINE_FORMAT = '**word** (part of speech) /IPA/ — English meaning — "example sentence"';

/**
 * Pull new words out of a tutor reply written in VOCAB_LINE_FORMAT.
 *
 * Deliberately strict about one thing: the bracket after the bold word must be
 * a recognisable part of speech. That is what stops ordinary bold text with a
 * parenthesis after it from being saved as vocabulary.
 */
export function parseVocabEntries(text) {
  const out = [];
  const seen = new Set();
  String(text || '').split('\n').forEach((line) => {
    const m = line.match(/\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*(.*)$/);
    if (!m) return;
    const word = m[1].trim();
    const pos = normalizePos(m[2]);
    if (!word || !pos || word.length > 80) return;
    let rest = m[3].trim();
    let ipa = '';
    const ipaMatch = rest.match(/^[/[]([^/\]]{1,60})[/\]]\s*/);
    if (ipaMatch) { ipa = ipaMatch[1].trim(); rest = rest.slice(ipaMatch[0].length); }
    rest = rest.replace(/^[—–:-]\s*/, '');
    let example = '';
    const exMatch = rest.match(/["„“«]([^"“”»]+)["“”»]\s*$/);
    if (exMatch) { example = exMatch[1].trim(); rest = rest.slice(0, exMatch.index); }
    const translation = rest.replace(/\s*[—–-]\s*$/, '').replace(/\*+/g, '').trim();
    const key = word.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ word, pos, ipa, translation, example });
  });
  return out;
}

/** Add parsed entries to a saved list, skipping words already there. Never mutates the input. */
export function mergeVocab(list, entries, now = Date.now()) {
  const have = new Set((list || []).map((v) => String(v.word || '').trim().toLowerCase()));
  const added = [];
  (entries || []).forEach((e, i) => {
    const key = String(e.word || '').trim().toLowerCase();
    if (!key || have.has(key)) return;
    have.add(key);
    const stamp = new Date(now).toISOString();
    added.push({
      id: now + i, word: e.word, translation: e.translation || '', example: e.example || '',
      ...(e.ipa ? { ipa: e.ipa } : {}), ...(e.pos ? { pos: e.pos } : {}),
      dateAdded: stamp, nextReview: stamp, reviewCount: 0,
    });
  });
  return { list: added.length ? [...(list || []), ...added] : (list || []), added: added.length };
}
