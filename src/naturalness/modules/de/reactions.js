/**
 * German — reaction tokens and backchannel.
 *
 * Learners can narrate but cannot react, which is why they sound like they are
 * delivering a monologue rather than taking part in a conversation. In a meeting
 * this is the difference between a participant and a presenter.
 */

const REFERENCE = [
  { particle: 'genau', sense: 'Exactly. The workhorse agreement token in professional German.', note: 'Safe everywhere. Overuse is a mild tic but never an error.' },
  { particle: 'stimmt', sense: 'True, you are right. Concedes a point someone else made.', note: 'Slightly warmer than genau because it credits the other person.' },
  { particle: 'ach so', sense: 'Oh, I see. Marks the moment something clicks.', note: 'Signals you were following and have now understood. Its absence makes you seem unmoved.' },
  { particle: 'eben', sense: 'Precisely, that is my point.', note: 'Agreement that also claims you said it first. See the particles category.' },
  { particle: 'na ja', sense: 'Well... Hedged, half-agreeing, usually with a reservation coming.', note: 'The single most useful way to disagree without disagreeing.' },
  { particle: 'alles klar', sense: 'Got it, understood, fine.', note: 'Closes a topic. Also a greeting question: Alles klar?' },
  { particle: 'mal sehen', sense: 'We will see. Non-committal.', note: 'Buys time without refusing.' },
  { particle: 'von mir aus', sense: 'Fine by me. Consent without enthusiasm.', note: 'Careful: it can read as grudging. Tone carries it.' },
  { particle: 'kann sein', sense: 'Could be. Neither agreeing nor arguing.', note: 'Useful when you do not want to concede but will not fight.' },
  { particle: 'im Ernst?', sense: 'Seriously? Genuine surprise.', note: 'Neutral register; echt jetzt? is the casual version.' },
  { particle: '— the gap —', sense: 'Silence where a native would react reads as disengagement, not politeness.', note: 'English speakers back-channel with mm-hm and right; German wants an actual word.' },
];

let n = 0;
const id = () => `de-react-${String(++n).padStart(2, '0')}`;

const ITEMS = [
  { id: id(), particle: 'genau', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Also wir verschieben das auf nächste Woche, oder?', situation: 'You agree — that is right' },
    target: 'Genau.', note: 'The default professional agreement token.' },
  { id: id(), particle: 'stimmt', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Das haben wir letztes Jahr schon mal versucht.', situation: 'They are right and you had forgotten' },
    target: 'Stimmt.', note: 'Credits them with the point, which genau does not.' },
  { id: id(), particle: 'ach so', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Sie ist nicht krank, sie ist auf einer Schulung.', situation: 'It clicks — you had misunderstood' },
    target: 'Ach so.', note: 'Marks the moment of understanding. Without it you seem unmoved.' },
  { id: id(), particle: 'na ja', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Das lief doch ganz gut, oder?', situation: 'You do not really agree, but you are not going to argue' },
    target: 'Na ja…', note: 'Disagreeing without disagreeing. Enormously useful.' },
  { id: id(), particle: 'im Ernst?', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Der Kunde hat den Vertrag gestern gekündigt.', situation: 'Genuine surprise' },
    target: 'Im Ernst?', note: 'Neutral register. echt jetzt? is the casual equivalent.' },
  { id: id(), particle: 'alles klar', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Ich schicke dir die Unterlagen heute Abend.', situation: 'Understood, topic closed' },
    target: 'Alles klar.', note: 'Signs off a topic cleanly.' },
  { id: id(), particle: 'mal sehen', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Glaubst du, wir schaffen das bis Freitag?', situation: 'You genuinely do not know and will not commit' },
    target: 'Mal sehen.', note: 'Buys time without refusing.' },
  { id: id(), particle: 'von mir aus', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Sollen wir das Meeting auf zehn Uhr vorziehen?', situation: 'You do not mind either way' },
    target: 'Von mir aus.', note: 'Consent without enthusiasm. Can read grudging, so watch the tone.' },
  { id: id(), particle: 'kann sein', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Ich glaube, das liegt am neuen Prozess.', situation: 'You are unconvinced but not going to argue' },
    target: 'Kann sein.', note: 'Neither concedes nor fights.' },
  { id: id(), particle: 'nicht wirklich', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Hat sich das Problem damit erledigt?', situation: 'No, not really' },
    target: 'Nicht wirklich.', note: 'Softer than a flat nein and far more natural.' },
  { id: id(), particle: 'verstehe', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Wir mussten das Budget kürzen, deshalb die Verzögerung.', situation: 'You accept the explanation' },
    target: 'Verstehe.', note: 'One word. Shows you followed without agreeing or objecting.' },
  { id: id(), particle: 'klar', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Kannst du das bis morgen fertig machen?', situation: 'Yes, obviously, no problem' },
    target: 'Klar.', note: 'Warmer and quicker than ja. Very common at work.' },
  { id: id(), particle: 'schade', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Sie kann leider nicht dabei sein.', situation: 'Mild regret' },
    target: 'Schade.', note: 'The standard one-word expression of regret. English has no neat equivalent.' },
  { id: id(), particle: 'na gut', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Anders geht es leider nicht.', situation: 'Reluctant acceptance' },
    target: 'Na gut.', note: 'All right then. Accepts without endorsing.' },
  { id: id(), particle: 'keine Ahnung', format: 'react', register: 'colloquial', professionalSafe: true,
    prompt: { line: 'Weisst du, wer das entschieden hat?', situation: 'You genuinely have no idea' },
    target: 'Keine Ahnung.', note: 'Fine at work among colleagues; with a client prefer Das weiss ich leider nicht.' },
  { id: id(), particle: 'echt jetzt?', format: 'react', register: 'colloquial', professionalSafe: false,
    prompt: { line: 'Die Präsentation ist auf morgen vorgezogen.', situation: 'Disbelief, among colleagues you know well' },
    target: 'Echt jetzt?', note: 'Casual. Use Im Ernst? with a client.' },
  { id: id(), particle: 'wie bitte?', format: 'react', register: 'formal', professionalSafe: true,
    prompt: { line: '…und deshalb übernehmen Sie das Projekt ab Montag.', situation: 'You did not catch it, or cannot believe it' },
    target: 'Wie bitte?', note: 'Does double duty: I did not hear you, and I beg your pardon.' },
  { id: id(), particle: 'sag bloss', format: 'react', register: 'colloquial', professionalSafe: false,
    prompt: { line: 'Er hat gekündigt.', situation: 'You are not entirely surprised — mild irony' },
    target: 'Sag bloss.', note: 'You do not say. Often dry rather than genuinely surprised.' },
  { id: id(), particle: 'passt', format: 'react', register: 'neutral', professionalSafe: true, variantTags: ['ch'],
    prompt: { line: 'Wir treffen uns um halb drei im kleinen Sitzungszimmer.', situation: 'That works for you' },
    target: 'Passt.', note: 'Very common in Switzerland and the south. In the north, Geht klar.' },
  { id: id(), particle: 'geht klar', format: 'react', register: 'colloquial', professionalSafe: true,
    prompt: { line: 'Schaffst du das noch heute?', situation: 'Yes, consider it done' },
    target: 'Geht klar.', note: 'Confident agreement to do something.' },

  { id: id(), particle: 'genau / stimmt', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: '___ — daran hatte ich gar nicht gedacht.', context: 'Someone raised a point you had missed and you are crediting them.', options: ['Stimmt', 'Genau', 'Klar'] },
    target: 'Stimmt', note: 'stimmt credits them; genau would claim you were already there.' },
  { id: id(), particle: 'na ja / nicht wirklich', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: '___, das würde ich so nicht sagen.', context: 'Softening the run-up to a disagreement.', options: ['Na ja', 'Genau', 'Alles klar'] },
    target: 'Na ja', note: 'Signals the disagreement before it lands, which takes the sting out.' },
  { id: id(), particle: 'ach so', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: '___, das erklärt einiges.', context: 'Something has just clicked.', options: ['Ach so', 'Von mir aus', 'Mal sehen'] },
    target: 'Ach so', note: 'Ach so plus a consequence is a very common pairing.' },

  { id: id(), particle: 'na ja', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Na ja, wenn du meinst.' },
    target: 'Well, if you say so — visible doubt, but letting it go rather than fighting about it.', note: 'Polite surrender with the reservation left on the record.' },
  { id: id(), particle: 'von mir aus', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Von mir aus gerne.' },
    target: 'Happy to, as far as I am concerned — consent, warmed up by gerne.', note: 'The gerne is doing real work: without it, von mir aus alone can sound flat.' },
  { id: id(), particle: 'ach was', format: 'reverseGloss', register: 'colloquial', professionalSafe: false,
    prompt: { sentence: 'Ach was, das schaffst du locker.' },
    target: 'Oh come off it, you will manage easily — brushing aside someone talking themselves down.', note: 'Dismissive in a friendly way. Colleagues, not clients.' },

  { id: id(), particle: 'reaction density', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'A: Wir haben das Budget gekürzt.  B: (Schweigen)', with: 'A: Wir haben das Budget gekürzt.  B: Ach so. Und was heisst das für uns?' },
    target: 'The reaction token buys a beat, shows you followed, and hands the turn back deliberately. Silence reads as disengagement or disapproval, not politeness.',
    note: 'English speakers back-channel with mm-hm and right; German expects an actual word.' },
  { id: id(), particle: 'im Ernst?', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Seriously? Since when?' },
    target: 'Im Ernst? Seit wann?', note: 'Two short reactions in a row is very natural and very hard for learners to do.' },
];

export default {
  enabled: true,
  weight: 0.9,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [{
    guidance:
      'Reaction tokens (genau, stimmt, ach so, na ja, alles klar, klar, schade, verstehe, kann sein, mal sehen) keep a conversation two-sided. ' +
      'Flag a turn where the learner responded to something notable with bare content and no reaction at all, so it reads as a monologue. ' +
      'Do not flag a turn that simply did not call for a reaction, and do not ask for more tokens once the learner is already using them.',
    positiveExamples: ['Ach so. Und was heisst das für uns?', 'Stimmt, daran hatte ich nicht gedacht.'],
    negativeExamples: ['Und was heisst das für uns?'],
  }],
};
