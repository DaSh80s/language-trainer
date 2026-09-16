// Naturalness + Business drill tests. Run: node tests/naturalness.test.mjs
// Plain Node, no framework, no API calls.
import de, { goals } from '../src/naturalness/modules/de.js';
import * as eng from '../src/naturalness/drillEngine.js';
import * as sc from '../src/naturalness/scoring.js';
import * as nat from '../src/naturalness/index.js';
import * as det from '../src/naturalness/detector.js';
import * as cats from '../src/naturalness/categories.js';
import * as voice from '../src/voice.js';

let fails = 0;
const t = (name, cond, detail = '') => {
  if (!cond) { fails++; console.log('  FAIL', name, detail); } else console.log('  ok  ', name);
};
const all = Object.entries(de.categories).flatMap(([cid, c]) => c.items.map((i) => ({ ...i, categoryId: cid })));
const inGroup = (g) => all.filter((i) => cats.CATEGORY_BY_ID[i.categoryId]?.group === g);

console.log('\n== content ==');
t('every module category is a known category', Object.keys(de.categories).every((c) => cats.CATEGORY_BY_ID[c]));
t('every category has a group', cats.CATEGORIES.every((c) => c.group));
t('ids globally unique', new Set(all.map((i) => i.id)).size === all.length);
t('naturalness has 245 items', inGroup('naturalness').length === 245, inGroup('naturalness').length);
t('business has at least 90 items', inGroup('business').length >= 90, inGroup('business').length);
t('every item has a known format', all.every((i) => cats.FORMATS[i.format]), all.filter((i) => !cats.FORMATS[i.format]).map((i) => i.id).join(','));
t('no ß in any German shown or expected (Swiss spelling)', !all.some((i) => /ß/.test(JSON.stringify(i.prompt) + i.target)),
  all.filter((i) => /ß/.test(JSON.stringify(i.prompt) + i.target)).map((i) => i.id).join(','));

console.log('\n== presentation (the "what am I being asked?" guard) ==');
const bad = all.filter((i) => { const p = eng.present(i); return !p.instruction || !p.stimulus || String(p.stimulus).includes('undefined') || (p.extras || []).some((e) => !e.value); });
t('every item presents with no gaps', bad.length === 0, bad.slice(0, 5).map((i) => i.id).join(','));
t('every instruction names the answer language', all.every((i) => /German|English/.test(eng.present(i).instruction)));
t('extras are labelled, never bare brackets', !all.some((i) => (eng.present(i).extras || []).some((e) => !e.label || String(e.value).startsWith('['))));
t('minimal pairs numbered 1 and 2', all.filter((i) => i.format === 'minimalPair').every((i) => /\*\*1 ·\*\*[\s\S]*\*\*2 ·\*\*/.test(eng.present(i).stimulus)));
t('react instruction matches the expected length', all.filter((i) => i.format === 'react').every((i) => {
  const words = i.target.trim().split(/\s+/).length;
  const ins = eng.present(i).instruction;
  return words <= 3 ? ins.includes('one to three words') : ins.includes('short sentence');
}));

console.log('\n== soften drills: intent first, answer not handed over ==');
const soft = all.filter((i) => i.format === 'soften');
t('every soften drill has an English goal and a who/how', soft.every((i) => i.prompt.goal && i.prompt.who),
  soft.filter((i) => !i.prompt.goal || !i.prompt.who).map((i) => i.id).join(','));
t('every goal belongs to a real soften drill with the same clipped wording', Object.entries(goals).every(([id, g]) => {
  const it = all.find((i) => i.id === id);
  return it && it.format === 'soften' && it.prompt.blunt === g.blunt;
}), Object.entries(goals).filter(([id, g]) => { const it = all.find((i) => i.id === id); return !it || it.prompt.blunt !== g.blunt; }).map(([id]) => id).join(','));
t('the clipped German is not shown before answering', soft.every((i) => !JSON.stringify(eng.present(i)).includes(i.prompt.blunt)));
t('the instruction no longer says "pitched as below"', soft.every((i) => !/pitched as below/.test(eng.present(i).instruction)));
// Words spelt the same in English and German cannot be kept out of an English
// goal, and are not a giveaway. Everything else long enough to matter is checked.
const SHARED_WORDS = new Set(['interim']);
const tWords = (s) => s.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 6 && !SHARED_WORDS.has(w));
t('goals do not smuggle in the long German words of the answer', soft.every((i) => {
  const shown = JSON.stringify(eng.present(i)).toLowerCase();
  return tWords(i.target).every((w) => !shown.includes(w));
}), soft.filter((i) => { const shown = JSON.stringify(eng.present(i)).toLowerCase(); return tWords(i.target).some((w) => shown.includes(w)); })
  .map((i) => `${i.id}:${tWords(i.target).filter((w) => JSON.stringify(eng.present(i)).toLowerCase().includes(w)).join('/')}`).join(', '));
t('goal reads as a continuation of "You want to:"', soft.every((i) => /\*\*You want to:\*\* [a-z]/.test(eng.present(i).stimulus)));
t('judge still knows the clipped version to reject', JSON.stringify(eng.buildJudgeRequest(soft[0], 'x', 0)).includes(soft[0].prompt.blunt));

console.log('\n== business formats ==');
t('recaps list the facts to check', all.filter((i) => i.format === 'recap').every((i) => i.mustInclude?.length));
t('clarifies list what to pin down', all.filter((i) => i.format === 'clarify').every((i) => i.mustPin?.length));
const recap = all.find((i) => i.format === 'recap');
const rq = JSON.stringify(eng.buildJudgeRequest(recap, 'x', 0));
t('judge gets the recap facts', rq.includes('Key facts'));
t('judge gets business context', rq.includes('Context:'));
const clar = all.find((i) => i.format === 'clarify');
t('judge gets the clarify pins', JSON.stringify(eng.buildJudgeRequest(clar, 'x', 0)).includes('pin down'));
t('model answers do not lean on grundsätzlich', !inGroup('business').some((i) => i.format !== 'minimalPair' && /grundsätzlich/.test(i.target)));
t('mixed modes stay in their group', ['naturalness', 'business'].every((g) => cats.categoryIdsInGroup(g).every((id) => cats.CATEGORY_BY_ID[id].group === g)));

console.log('\n== teaching on a miss ==');
const wohl = all.find((i) => i.particle === 'wohl');
t('wohl has a curated gloss', !!nat.referenceFor(de, 'particles', 'wohl'));
const eg = nat.exampleFor(de, 'particles', 'wohl', wohl.id);
t('wohl has a different curated example', !!eg && eg.german !== wohl.target);
t('generic tags get no curated gloss (judge fills in)', nat.referenceFor(de, 'collocations', 'collocation') === null);
t('every business item has a curated gloss', inGroup('business').every((i) => nat.referenceFor(de, i.categoryId, i.particle)),
  inGroup('business').filter((i) => !nat.referenceFor(de, i.categoryId, i.particle)).map((i) => `${i.id}:${i.particle}`).join(','));
const js = eng.parseJudgement(JSON.stringify({ reached: false, landed: false, severity: 'noticeable', naturalText: 'a', explanation: 'b', meaning: 'm', example: 'e' }));
t('judge meaning and example parsed', js.meaning === 'm' && js.example === 'e');

console.log('\n== feedback importer ==');
const raw = JSON.stringify({ items: [
  { youSaid: 'Ist Zürich Ihnen lieb?', better: 'Ist die Region Zürich Ihr bevorzugter Arbeitsort?', situation: 'a polished question about location', english: 'Is the Zurich area your preferred place of work?', meaning: 'bevorzugter Arbeitsort = preferred place of work', keyPhrase: 'bevorzugter Arbeitsort' },
  { youSaid: '', better: 'Verstanden.', situation: 'acknowledging, instead of okay', english: 'Understood.', meaning: 'a crisp acknowledgement', keyPhrase: 'Verstanden' },
  { youSaid: '', better: 'verstanden', situation: 'dup', english: 'dup', meaning: 'dup', keyPhrase: 'Verstanden' },
  { youSaid: '', better: '', situation: 'empty', english: '', meaning: '', keyPhrase: '' },
] });
const imp = nat.parseImport(raw, 123);
t('parses items, drops empty and duplicate', imp.ok && imp.items.length === 2, imp.items.length);
t('you-said pair becomes a soften drill', imp.items[0].format === 'soften' && imp.items[0].prompt.blunt === 'Ist Zürich Ihnen lieb?');
t('imported soften shows the English, not your clipped German', eng.present(imp.items[0]).stimulus.includes('Is the Zurich area') && !JSON.stringify(eng.present(imp.items[0])).includes('Ist Zürich Ihnen lieb?'));
t('bare phrase becomes a translation drill', imp.items[1].format === 'trapTranslation' && imp.items[1].prompt.english === 'Understood.');
t('imported items present cleanly', imp.items.every((i) => { const p = eng.present(i); return p.instruction && p.stimulus && (p.extras || []).every((e) => e.value); }));
t('garbage reply degrades, no throw', nat.parseImport('not json').ok === false);
const m1 = nat.mergeIntoPack([], imp.items);
const m2 = nat.mergeIntoPack(m1.pack, imp.items);
t('merge adds new', m1.added === 2);
t('merge skips phrases already in the pack', m2.added === 0 && m2.skipped === 2 && m2.pack.length === 2);
const merged = nat.mergeMyPack(de, m1.pack);
t('merged module exposes My phrases', merged.categories.mine.items.length === 2 && nat.builtCategories(merged).includes('mine'));
t('base module is not mutated', !de.categories.mine);
t('imported phrase gets a gloss for teaching on a miss', nat.referenceFor(merged, 'mine', 'Verstanden')?.sense === 'a crisp acknowledgement');
t('empty pack is not a built category', !nat.builtCategories(nat.mergeMyPack(de, [])).includes('mine'));
t('mergeMyPack tolerates no module', nat.mergeMyPack(null, m1.pack) === null);
t('judge context covers imported phrases', JSON.stringify(eng.buildJudgeRequest(merged.categories.mine.items[0], 'x', 0)).includes('real feedback'));
t('German module lists filler words', Array.isArray(de.fillers) && de.fillers.includes('grundsätzlich'));

console.log('\n== scoring ==');
const mk = (cat, o) => ({ categoryId: cat, itemId: 'x', particle: 'p', probedReach: true, reached: true, landed: true, severity: null, ...o });
t('empty reads neutral', sc.hitRate([]).observations === 0);
t('window caps at 300', sc.byCategory(Array(400).fill(mk('particles', {})))[0].total === 300);
t('business categories score', sc.byCategory([mk('candidates', {})])[0].label === 'Candidate calls');

console.log('\n== detector ==');
t('gate skips tiny turns', det.worthAnalysing('Ja.') === false);
t('cap enforced on parse', det.parseDetection(JSON.stringify({ findings: Array(9).fill({ categoryId: 'particles', learnerText: 'a', naturalText: 'b', explanation: 'c', severity: 'nitpick' }), positives: [] })).findings.length === 3);
t('free-text findings never probe reach', det.toFindings({ findings: [], positives: [{ categoryId: 'register', learnerText: 'd', note: 'e' }] }, 's').every((f) => f.probedReach === false));

console.log('\n== voice ==');
t('German locale', voice.langCode('German') === 'de-DE');
t('asterisks stripped before speaking', voice.speakableText('*Reactions* **Warte mal.**') === 'Reactions Warte mal.');
t('no browser: no throw', voice.speak('x', 'German') === false);

console.log(fails ? `\n${fails} FAILURE(S)\n` : '\nAll checks passed.\n');
process.exit(fails ? 1 : 0);
