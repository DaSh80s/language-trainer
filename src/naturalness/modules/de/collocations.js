/**
 * German — collocations.
 *
 * The verb-noun pairings that are conventional rather than logical. One of the
 * highest-yield categories and one of the least taught: the learner version is
 * always grammatical, always comprehensible, and always slightly wrong.
 *
 * Every item carries learnerTrap — the plausible wrong version an English
 * speaker reaches for. Swiss orthography throughout (ss, never ß).
 */

const REFERENCE = [
  { particle: 'treffen vs machen', sense: 'Decisions and agreements are MET in German, not made.',
    note: 'eine Entscheidung treffen, eine Vereinbarung treffen. machen is the reflex for an English speaker and is the giveaway.' },
  { particle: 'stellen vs fragen', sense: 'A question is PLACED, not asked.',
    note: 'eine Frage stellen. Ich möchte eine Frage machen is immediately foreign.' },
  { particle: 'nehmen / üben / leisten', sense: 'German spreads across many light verbs where English mostly uses have, make and do.',
    note: 'Rücksicht nehmen, Kritik üben, einen Beitrag leisten, Zeit in Anspruch nehmen.' },
  { particle: 'why this matters at work', sense: 'Business German is dense with these. Getting them right is most of sounding professional.',
    note: 'A meeting is full of decisions, deadlines, offers and responsibilities — every one of them collocates.' },
];

let n = 0;
const id = () => `de-coll-${String(++n).padStart(2, '0')}`;

/** English stimulus whose literal translation picks the wrong light verb. */
const C = (english, target, learnerTrap, note) => ({
  id: id(), particle: 'collocation', format: 'trapTranslation',
  register: 'neutral', professionalSafe: true,
  prompt: { english }, target, learnerTrap, note,
});

const W = (sentence, context, options, target, note) => ({
  id: id(), particle: 'collocation', format: 'which',
  register: 'neutral', professionalSafe: true,
  prompt: { sentence, context, options }, target, note,
});

const ITEMS = [
  C('We need to make a decision this week.', 'Wir müssen diese Woche eine Entscheidung treffen.',
    'eine Entscheidung machen', 'Decisions are met, not made. The single most common collocation error at work.'),
  C('Can I ask you a question?', 'Kann ich Ihnen eine Frage stellen?',
    'eine Frage machen', 'Questions are placed. fragen alone also works: Darf ich Sie etwas fragen?'),
  C('We came to an agreement.', 'Wir haben eine Vereinbarung getroffen.',
    'eine Vereinbarung gemacht', 'Same treffen family as Entscheidung.'),
  C('Please take the others into consideration.', 'Nimm bitte Rücksicht auf die anderen.',
    'Rücksicht geben', 'Rücksicht nehmen auf. A fixed pairing with no logical route to it.'),
  C('She criticised the proposal.', 'Sie hat Kritik am Vorschlag geübt.',
    'Kritik gemacht', 'Kritik üben is the formal register; kritisieren is the plain verb.'),
  C('That is out of the question.', 'Das kommt nicht in Frage.',
    'Das ist aus der Frage', 'in Frage kommen. The negative form is the one you will actually use.'),
  C('I am available on Thursday.', 'Am Donnerstag stehe ich zur Verfügung.',
    'Ich bin verfügbar', 'zur Verfügung stehen. The bin verfügbar version is understandable but reads translated.'),
  C('We can make the room available.', 'Wir können den Raum zur Verfügung stellen.',
    'den Raum verfügbar machen', 'stehen when you are available; stellen when you make something available.'),
  C('We attach great importance to punctuality.', 'Wir legen grossen Wert auf Pünktlichkeit.',
    'Wir geben viel Wert', 'Wert legen auf. Very common in Swiss professional writing and speech.'),
  C('Price plays no part in this.', 'Der Preis spielt hier keine Rolle.',
    'Der Preis hat keine Rolle', 'eine Rolle spielen. keine Rolle spielen is the form you meet most.'),
  C('We have to take measures.', 'Wir müssen Massnahmen ergreifen.',
    'Massnahmen nehmen', 'ergreifen or treffen, never nehmen.'),
  C('Shall we arrange a meeting?', 'Sollen wir einen Termin vereinbaren?',
    'einen Termin machen', 'vereinbaren is the professional register; ausmachen is the casual one.'),
  C('They are putting pressure on us.', 'Sie üben Druck auf uns aus.',
    'Sie machen Druck auf uns', 'Druck ausüben auf. Note the separable prefix at the end.'),
  C('I will take responsibility for it.', 'Ich übernehme die Verantwortung dafür.',
    'Ich nehme die Verantwortung', 'übernehmen, not nehmen. And dafür, not für das.'),
  C('Let me know when it is done.', 'Sag mir Bescheid, wenn es fertig ist.',
    'Lass mich wissen', 'Bescheid sagen or Bescheid geben. A literal "let me know" does not exist.'),
  C('I will check with my colleague first.', 'Ich halte zuerst Rücksprache mit meinem Kollegen.',
    'Ich spreche zurück', 'Rücksprache halten mit. Formal and very useful in Swiss office German.'),
  C('That will influence the result.', 'Das nimmt Einfluss auf das Ergebnis.',
    'Das macht Einfluss', 'Einfluss nehmen auf, or the plainer beeinflussen.'),
  C('We would like to make you an offer.', 'Wir möchten Ihnen ein Angebot unterbreiten.',
    'ein Angebot geben', 'unterbreiten is the formal register; machen also works and is more neutral.'),
  C('I will get in touch with them.', 'Ich nehme Kontakt mit ihnen auf.',
    'Ich mache Kontakt', 'Kontakt aufnehmen mit. Separable, so auf goes to the end.'),
  C('He gave a speech.', 'Er hat eine Rede gehalten.',
    'eine Rede gemacht', 'Speeches, lectures and presentations are all held: halten.'),
  C('Nobody paid any attention to it.', 'Niemand hat dem Beachtung geschenkt.',
    'Aufmerksamkeit gegeben', 'Beachtung or Aufmerksamkeit schenken — attention is gifted, not given.'),
  C('Everyone made a contribution.', 'Alle haben einen Beitrag geleistet.',
    'einen Beitrag gemacht', 'leisten. Also Arbeit leisten, Hilfe leisten.'),
  C('We have to set priorities.', 'Wir müssen Prioritäten setzen.',
    'Prioritäten machen', 'setzen. One of the few where the English verb maps closely.'),
  C('We are making good progress.', 'Wir machen gute Fortschritte.',
    'Wir haben guten Fortschritt', 'Here machen IS right, and the noun is plural. A useful counterexample.'),
  C('That will take a lot of time.', 'Das nimmt viel Zeit in Anspruch.',
    'Das nimmt viel Zeit', 'in Anspruch nehmen. The plain dauert lange is also fine and more spoken.'),
  C('I would like to raise that point.', 'Das möchte ich zur Sprache bringen.',
    'Das möchte ich aufbringen', 'zur Sprache bringen. Slightly formal, ideal for a meeting.'),
  C('We need to find a solution.', 'Wir müssen eine Lösung finden.',
    'eine Lösung machen', 'finden or erarbeiten. Not machen.'),
  C('That builds trust.', 'Das schafft Vertrauen.',
    'Das macht Vertrauen', 'schaffen for creating something abstract: Vertrauen, Klarheit, Arbeitsplätze.'),
  C('I am keeping that option in mind.', 'Diese Option fasse ich ins Auge.',
    'Ich halte die Option im Kopf', 'ins Auge fassen. Idiomatic but standard in professional use.'),
  C('Please bear that in mind.', 'Bitte behalten Sie das im Hinterkopf.',
    'Bitte halten Sie das im Kopf', 'im Hinterkopf behalten. Very common and very hard to guess.'),

  W('Wir müssen eine Entscheidung ___.', 'The standard business phrase.', ['treffen', 'machen', 'nehmen'],
    'treffen', 'machen is the English speaker reflex and the clearest single giveaway.'),
  W('Darf ich eine Frage ___?', 'Politely, in a meeting.', ['stellen', 'machen', 'geben'],
    'stellen', 'Questions are placed in German.'),
  W('Das kommt leider nicht in ___.', 'That is out of the question.', ['Frage', 'Rede', 'Sprache'],
    'Frage', 'in Frage kommen — and zur Sprache bringen is a different fixed phrase.'),
  W('Wir legen grossen ___ auf Qualität.', 'We attach great importance to quality.', ['Wert', 'Preis', 'Druck'],
    'Wert', 'Wert legen auf. Standard in Swiss professional German.'),
  W('Ich ___ die Verantwortung dafür.', 'Taking responsibility.', ['übernehme', 'nehme', 'mache'],
    'übernehme', 'übernehmen, not the bare nehmen an English speaker expects.'),

  { id: id(), particle: 'collocation', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'Wir haben eine Entscheidung gemacht.', with: 'Wir haben eine Entscheidung getroffen.' },
    target: 'Both are understood instantly, but the first marks you as a non-native within four words. Nothing is ungrammatical about it — machen simply is not the verb that goes with Entscheidung.',
    note: 'This is the whole category in one example: correct, clear, and wrong.' },
  { id: id(), particle: 'collocation', format: 'reverseGloss', register: 'formal', professionalSafe: true,
    prompt: { sentence: 'Ich stehe Ihnen gerne zur Verfügung.' },
    target: 'I am happy to help / I am at your disposal — the standard closing line of a professional German email or call.',
    note: 'Worth knowing as a whole unit. It is close to a formula.' },
];

export default {
  enabled: true,
  weight: 0.7,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [{
    guidance:
      'Collocations: the conventional verb for a given noun. Flag where the learner picked a grammatical but non-conventional light verb — ' +
      'especially machen where treffen, stellen, üben, ergreifen, leisten, halten, schenken, setzen or schaffen is required. ' +
      'Give the conventional pairing as the upgrade. Do not flag a correct pairing merely because a more formal one exists.',
    positiveExamples: ['eine Entscheidung treffen', 'eine Frage stellen', 'Massnahmen ergreifen'],
    negativeExamples: ['eine Entscheidung machen', 'eine Frage machen', 'Massnahmen nehmen'],
  }],
};
