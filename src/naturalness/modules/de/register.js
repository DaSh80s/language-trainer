/**
 * German — register, politeness and softening.
 *
 * The grey zone between correct and appropriate. This is grammar the learner
 * already has (Konjunktiv II, the passive) used for social effect rather than
 * for meaning.
 *
 * Swiss professional German runs noticeably more formal than German German:
 * Sie persists longer, thanks are warmer, and directness is softened further.
 */

const REFERENCE = [
  { particle: 'Konjunktiv II as politeness', sense: 'könnten, würden, hätte, wäre, dürfte — the subjunctive is the main politeness engine.',
    note: 'Können Sie das machen? is a question about ability. Könnten Sie das machen? is a request. The gap is large.' },
  { particle: 'the blameless passive', sense: 'Impersonal and passive constructions let you name a problem without naming a culprit.',
    note: 'Da ist wohl etwas schiefgelaufen. Das wurde leider übersehen. Enormously useful when the culprit is in the room.' },
  { particle: 'hedges', sense: 'eigentlich, vielleicht, eher, relativ, tendenziell, so ungefähr.',
    note: 'They buy room to be wrong. Overused they sound evasive; absent, you sound categorical.' },
  { particle: 'du and Sie', sense: 'Sie is the default with anyone you have not been offered du by.',
    note: 'In Switzerland Sie persists longer than in Germany, and switching is usually offered explicitly by the senior or older person.' },
  { particle: 'Swiss written forms', sense: 'Freundliche Grüsse, not Mit freundlichen Grüssen. Besten Dank, not Vielen Dank.',
    note: 'Small markers, instantly recognisable. Also ss throughout, never ß.', confidence: 'review' },
];

let n = 0;
const id = () => `de-reg-${String(++n).padStart(2, '0')}`;

const S = (blunt, level, target, note, register = 'formal') => ({
  id: id(), particle: 'register', format: 'soften',
  register, professionalSafe: true,
  prompt: { blunt, level }, target, note,
});

const ITEMS = [
  // ── Konjunktiv II ───────────────────────────────────────────────────────
  S('Schicken Sie mir das.', 'a polite request to a client, not an instruction',
    'Könnten Sie mir das bitte schicken?', 'Könnten plus bitte. The imperative alone is close to an order.'),
  S('Ich will das besprechen.', 'politely proposing, not demanding',
    'Ich würde das gerne besprechen.', 'würde plus gerne is the standard softener for stating what you want.'),
  S('Ich habe eine Frage.', 'raising a hand in a meeting, deferential',
    'Ich hätte eine Frage.', 'hätte rather than habe. Tiny change, markedly more polite.'),
  S('Geht das?', 'asking a client whether something is possible',
    'Wäre das möglich?', 'wäre möglich is the formal register for the blunt geht das.'),
  S('Ich sage, wir warten.', 'offering an opinion without imposing it',
    'Ich würde sagen, wir warten.', 'Ich würde sagen frames it as a view rather than a ruling.'),
  S('Darf ich Sie unterbrechen?', 'maximally deferential, interrupting a senior person',
    'Dürfte ich Sie kurz unterbrechen?', 'dürfte plus kurz. kurz is doing as much work as the subjunctive.'),
  S('Können Sie das bis Freitag machen?', 'a request rather than a test of capability',
    'Könnten Sie das bis Freitag machen?', 'Können asks whether they are able; könnten asks whether they would.'),
  S('Ich brauche das heute.', 'firm but not peremptory, to a colleague',
    'Ich bräuchte das eigentlich heute.', 'bräuchte plus eigentlich softens a hard deadline without weakening it.'),

  // ── the blameless passive ───────────────────────────────────────────────
  S('Sie haben einen Fehler gemacht.', 'naming the problem without naming the person',
    'Da ist wohl etwas schiefgelaufen.', 'The flagship face-saving construction. Nobody is accused and everyone understands.'),
  S('Du hast das vergessen.', 'flagging an omission without blame',
    'Das wurde leider übersehen.', 'Passive plus leider. The agent simply disappears.'),
  S('Sie haben mich falsch verstanden.', 'correcting without accusing',
    'Da muss ein Missverständnis vorliegen.', 'Puts the misunderstanding in the room rather than in the other person.'),
  S('Das ist falsch.', 'disagreeing with a senior colleague in a meeting',
    'Das sehe ich etwas anders.', 'Frames it as your perspective. Das ist falsch closes the conversation.'),
  S('Das funktioniert nicht.', 'raising a problem constructively',
    'Da sehe ich noch eine Schwierigkeit.', 'Names the difficulty as something you observe, not as a verdict.'),

  // ── hedging ─────────────────────────────────────────────────────────────
  S('Ich bin dagegen.', 'leaving room to be persuaded',
    'Ich bin eigentlich eher dagegen.', 'eigentlich plus eher. Two hedges, door left open.'),
  S('Das dauert drei Wochen.', 'an estimate you cannot fully stand behind',
    'Das dauert wohl so ungefähr drei Wochen.', 'wohl plus so ungefähr. Commits to a shape, not a number.'),
  S('Das ist zu teuer.', 'pushing back on price without sounding categorical',
    'Das erscheint mir relativ teuer.', 'erscheint mir makes it your impression; relativ takes the edge off.'),

  // ── du / Sie ────────────────────────────────────────────────────────────
  { id: id(), particle: 'du / Sie', format: 'which', register: 'formal', professionalSafe: true,
    prompt: { sentence: 'Ein neuer Kunde stellt sich vor. ___ ist richtig.', context: 'First meeting, a client, in Zurich.', options: ['Sie', 'du', 'ihr'] },
    target: 'Sie', note: 'In Switzerland Sie persists longer than in Germany. Wait to be offered du.' },
  { id: id(), particle: 'du / Sie', format: 'trapTranslation', register: 'formal', professionalSafe: true,
    prompt: { english: 'Shall we use first names?', extra: 'You are the senior person offering it.' },
    target: 'Wollen wir uns duzen?', note: 'duzen and siezen are verbs. The offer normally comes from the senior or older person.' },
  { id: id(), particle: 'du / Sie', format: 'reverseGloss', register: 'formal', professionalSafe: true,
    prompt: { sentence: 'Sagen Sie ruhig du.' },
    target: 'Do feel free to use du — an explicit invitation to drop the formal address.',
    note: 'ruhig here means go ahead, not quietly. A small trap inside a common phrase.' },

  // ── Swiss professional markers ──────────────────────────────────────────
  { id: id(), particle: 'Swiss register', format: 'trapTranslation', register: 'formal', professionalSafe: true, variantTags: ['ch'],
    prompt: { english: 'Many thanks in advance.', extra: 'Closing a Swiss business email.' },
    target: 'Besten Dank im Voraus.', note: 'Besten Dank is the Swiss default where Germany would say Vielen Dank.', confidence: 'review' },
  { id: id(), particle: 'Swiss register', format: 'trapTranslation', register: 'formal', professionalSafe: true, variantTags: ['ch'],
    prompt: { english: 'Kind regards,', extra: 'Signing off a Swiss business email.' },
    target: 'Freundliche Grüsse', note: 'Swiss standard. Germany writes Mit freundlichen Grüssen, and Switzerland never uses ß.', confidence: 'review' },
  { id: id(), particle: 'Swiss register', format: 'react', register: 'formal', professionalSafe: true, variantTags: ['ch'],
    prompt: { line: 'Guten Tag, mein Name ist Meier.', situation: 'Greeting back, in Zurich, spoken' },
    target: 'Grüezi, Herr Meier.', note: 'Grüezi is the spoken Swiss greeting; Guten Tag is the neutral written and formal equivalent.' },
  S('Schick mir das mal.', 'the same request, but to a client rather than a colleague',
    'Könnten Sie mir das bitte zukommen lassen?', 'zukommen lassen is markedly formal — common in Swiss professional correspondence.', 'formal'),

  // ── level-shifting the same content ─────────────────────────────────────
  S('Ich kann nicht.', 'declining an invitation from a colleague, casually',
    'Das schaffe ich leider nicht.', 'leider plus schaffen. Warmer than a bare kann nicht.', 'neutral'),
  S('Ich kann nicht.', 'declining a client request, formally',
    'Das lässt sich leider nicht einrichten.', 'The impersonal lässt sich construction removes you from the refusal.'),
  S('Nein.', 'refusing a proposal in a meeting without shutting the room down',
    'Das würde ich so nicht machen wollen.', 'Konjunktiv plus so plus wollen. Three layers of distance from a flat no.'),

  { id: id(), particle: 'register', format: 'minimalPair', register: 'formal', professionalSafe: true,
    prompt: { without: 'Können Sie mir das schicken?', with: 'Könnten Sie mir das bitte schicken?' },
    target: 'The first asks whether you are physically able to; the second asks you to. In German the indicative question can read as brusque or even sarcastic where English would hear both as polite.',
    note: 'The most load-bearing single politeness upgrade in professional German.' },
  { id: id(), particle: 'register', format: 'reverseGloss', register: 'formal', professionalSafe: true,
    prompt: { sentence: 'Da ist wohl etwas schiefgelaufen.' },
    target: 'Something appears to have gone wrong — naming a failure with no agent, so nobody at the table is accused.',
    note: 'wohl hedges it further. Learn this as a unit; it defuses a great deal.' },
];

export default {
  enabled: true,
  weight: 0.8,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [{
    guidance:
      'Register and softening. Flag where the learner used a bare indicative request (Können Sie…, Schicken Sie mir…) in a context that wants ' +
      'Konjunktiv II (Könnten Sie…, Ich hätte…, Wäre es möglich…), or stated a fault with a named agent where an impersonal or passive construction ' +
      'would be normal, or was categorical where a hedge is conventional. Do not flag informality between colleagues — only mismatch with the situation.',
    positiveExamples: ['Könnten Sie mir das bitte schicken?', 'Da ist wohl etwas schiefgelaufen.', 'Ich hätte eine Frage.'],
    negativeExamples: ['Schicken Sie mir das.', 'Sie haben einen Fehler gemacht.'],
  }],
};
