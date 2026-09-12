/**
 * German — turn structure and discourse.
 *
 * How you open, sequence, signal a shift, land a point and close. In a meeting
 * this is what makes a contribution sound organised rather than emitted.
 * Closing a conversation without abruptness is the hardest part and the least
 * taught.
 */

const REFERENCE = [
  { particle: 'signposting', sense: 'also, zunächst einmal, kurz gesagt, wie gesagt, jedenfalls, abschliessend.',
    note: 'They tell the listener where you are in your own argument. Without them a long turn feels like a list.' },
  { particle: 'landing a point', sense: 'der Punkt ist, im Grunde, unterm Strich, letztlich.',
    note: 'Marks the sentence you actually want remembered.' },
  { particle: 'taking a turn', sense: 'Darf ich kurz? Eine Frage dazu. Kurz dazu.',
    note: 'German meetings expect you to claim the floor explicitly rather than wait for a gap.' },
  { particle: 'handing over', sense: 'Was meinst du? Wie sehen Sie das? Was sagst du dazu?',
    note: 'Closes your turn deliberately instead of trailing off.' },
  { particle: 'exits', sense: 'Ich lass dich mal. Wir hören uns. Machs gut. Ich muss leider los.',
    note: 'Ending a conversation without abruptness. Learners either stop dead or keep talking.' },
];

let n = 0;
const id = () => `de-disc-${String(++n).padStart(2, '0')}`;

const T = (english, target, note, extra, register = 'neutral') => ({
  id: id(), particle: 'discourse', format: 'trapTranslation',
  register, professionalSafe: true, prompt: extra ? { english, extra } : { english }, target, note,
});

const ITEMS = [
  // ── signposting ─────────────────────────────────────────────────────────
  T('So, where were we?', 'Also, wo waren wir?', 'also as a discourse opener, not meaning "also". Restarts a thread.'),
  T('First of all, thank you all for coming.', 'Zunächst einmal vielen Dank, dass Sie alle gekommen sind.',
    'zunächst einmal is the standard formal opener for structuring a turn.', 'Opening a meeting you are chairing.', 'formal'),
  T('To put it briefly: we need more time.', 'Kurz gesagt: wir brauchen mehr Zeit.', 'kurz gesagt signals the summary is coming, which buys attention.'),
  T('As I said, that was never the plan.', 'Wie gesagt, das war nie der Plan.', 'wie gesagt flags a repetition without sounding irritated.'),
  T('To be honest, I am not convinced.', 'Um ehrlich zu sein, ich bin nicht überzeugt.', 'Standard preface for an unwelcome view.'),
  T('Anyway, we should move on.', 'Jedenfalls sollten wir weitermachen.', 'jedenfalls closes a digression and returns to the main thread. Note verb second.'),
  T('In any case, we will need approval.', 'Auf jeden Fall brauchen wir eine Freigabe.', 'auf jeden Fall is the emphatic certainty version; jedenfalls is the digression-closer.'),
  T('Finally, a word on the budget.', 'Abschliessend noch kurz zum Budget.', 'abschliessend signals the end is near, which meetings appreciate.', null, 'formal'),
  { id: id(), particle: 'discourse', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: '___, das sehe ich anders.', context: 'Prefacing a disagreement honestly.', options: ['Um ehrlich zu sein', 'Abschliessend', 'Zunächst einmal'] },
    target: 'Um ehrlich zu sein', note: 'The others signpost position in a sequence, not stance.' },

  // ── landing a point ─────────────────────────────────────────────────────
  T('The point is, we cannot deliver by March.', 'Der Punkt ist, wir können bis März nicht liefern.', 'Marks the load-bearing sentence.'),
  T('Basically it comes down to cost.', 'Im Grunde läuft es auf die Kosten hinaus.', 'hinauslaufen auf — a useful phrasal verb for summing up.'),
  T('At the end of the day, it is their decision.', 'Unterm Strich ist es ihre Entscheidung.', 'unterm Strich — literally below the line. Very common in business speech.'),
  { id: id(), particle: 'discourse', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das war eigentlich mein Punkt.' },
    target: 'That was actually the point I was making — reclaiming an argument that has drifted, without accusing anyone of missing it.',
    note: 'eigentlich takes the sting out of the correction.' },

  // ── taking and handing over a turn ──────────────────────────────────────
  T('Sorry, may I come in briefly?', 'Entschuldigung, darf ich kurz?', 'The standard way to claim the floor. Complete as it stands.', 'Interrupting in a meeting.', 'formal'),
  T('A quick question on that.', 'Eine Frage dazu.', 'dazu points back at what was just said. Compact and very native.'),
  T('What do you think?', 'Wie sehen Sie das?', 'Hands the turn over explicitly. Use denn to warm it: Wie sehen Sie das denn?', 'To a client, formal.', 'formal'),
  T('What would you say to that?', 'Was sagst du dazu?', 'The du version, to a colleague.'),
  { id: id(), particle: 'discourse', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Ich bin fertig.', attitude: 'closing your turn in a meeting and inviting a response, not announcing you have stopped' },
    target: 'Soweit von meiner Seite. Wie sehen Sie das?', note: 'Soweit von meiner Seite is a clean, professional way to yield the floor.' },

  // ── anecdote openers ────────────────────────────────────────────────────
  T('The other day I ran into her at the station.', 'Neulich habe ich sie am Bahnhof getroffen.', 'neulich is the standard anecdote opener. Note verb second.'),
  T('Imagine this: they called on a Sunday.', 'Stell dir vor, die haben an einem Sonntag angerufen.', 'Stell dir vor sets up the punchline and buys you the floor.'),
  T('The thing is, nobody told us.', 'Es ist so, dass uns niemand Bescheid gesagt hat.', 'Es ist so, dass… frames an explanation. Verb goes to the end after dass.'),

  // ── exits ───────────────────────────────────────────────────────────────
  T('Right, I will let you get on.', 'Gut, ich lass dich mal.', 'The standard friendly exit. mal is doing the softening.', 'Ending a call with a colleague.', 'colloquial'),
  T('We will speak soon.', 'Wir hören uns.', 'Literally we hear each other. Near-fixed sign-off for calls.'),
  T('Take care.', 'Machs gut.', 'Casual and warm. With Sie: Machen Sie es gut.', null, 'colloquial'),
  T('I am afraid I have to run.', 'Ich muss leider los.', 'losmüssen. The leider does the apologising.'),
  T('Do get in touch.', 'Melde dich.', 'Two words, complete sentence, very native. Melden Sie sich for the formal version.'),
  { id: id(), particle: 'discourse', format: 'react', register: 'neutral', professionalSafe: true,
    prompt: { line: 'Also dann, ich glaube wir haben alles besprochen.', situation: 'Closing the meeting warmly, one short line' },
    target: 'Gut, dann bis nächste Woche.', note: 'dann bis… is the standard closing formula. Any time reference works.' },
  { id: id(), particle: 'discourse', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'A: …ja. B: Tschüss. (click)', with: 'A: …ja. B: Gut, ich lass dich mal. Wir hören uns. Tschüss!' },
    target: 'The second closes in three moves — signal, forward reference, farewell. Ending on a bare Tschüss after a substantive call reads as abrupt or annoyed in German, even though the word itself is friendly.',
    note: 'Learners either stop dead or cannot stop. The three-move exit is the fix.' },
];

export default {
  enabled: true,
  weight: 0.8,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [{
    guidance:
      'Turn structure. Flag a long, well-formed turn that arrives with no signposting at all (no also, zunächst, kurz gesagt, wie gesagt, jedenfalls), ' +
      'or a conversation closed with a bare farewell after substantive discussion where a German speaker would signal the exit first. ' +
      'Do not flag short turns — they do not need signposting, and demanding it would make the learner sound padded.',
    positiveExamples: ['Kurz gesagt: wir brauchen mehr Zeit.', 'Gut, ich lass dich mal. Wir hören uns.'],
    negativeExamples: ['Wir brauchen mehr Zeit.'],
  }],
};
