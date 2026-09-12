/**
 * German — interference from English (interference.fromEn).
 *
 * Keyed by SOURCE language, not just target: these are errors only English
 * speakers make. The flagship is the impersonal dative family, where English
 * says "I am cold" and German must say "it is cold to me".
 *
 * Only fromEn is populated. The structure is keyed so fromEs, fromFr and so on
 * can be added without reshaping anything.
 */

const REFERENCE = [
  { particle: 'the impersonal dative', sense: 'Physical and emotional states are things that happen TO you: mir ist kalt, not ich bin kalt.',
    note: 'ich bin kalt means you are a cold person, or a corpse. The whole family works this way: kalt, warm, heiss, schlecht, übel, langweilig, egal, peinlich, unwohl.' },
  { particle: 'haben for states', sense: 'Hunger, thirst, fear and luck are things you HAVE, not things you are.',
    note: 'Ich habe Hunger / Durst / Angst / Glück. Ich bin hungrig exists but sounds clinical and unidiomatic in speech.' },
  { particle: 'es gibt vs es ist', sense: 'es gibt = there exists, anywhere. es ist = a specific thing is in a specific place.',
    note: 'Es gibt ein Problem (a problem exists). Da ist das Problem (there is the problem, pointing at it).' },
  { particle: 'false friends', sense: 'Words that look English and are not.',
    note: 'bekommen = receive, not become. eventuell = possibly, not eventually. also = so/therefore, not also. sensibel = sensitive, not sensible. Gift = poison. Chef = boss. Rat = advice. Art = kind/type.' },
  { particle: 'verb second', sense: 'The finite verb is the second element in a main clause, whatever comes first.',
    note: 'Gestern habe ich das gemacht. English word order (Gestern ich habe…) is the single most audible interference error.' },
];

let n = 0;
const id = () => `de-int-${String(++n).padStart(2, '0')}`;

const T = (english, target, note, extra) => ({
  id: id(), particle: 'interference', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
  prompt: extra ? { english, extra } : { english }, target, note,
});

const ITEMS = [
  // ── the impersonal dative family ────────────────────────────────────────
  T("I'm cold.", 'Mir ist kalt.', 'ich bin kalt describes your personality, or your corpse. This is the flagship English trap.'),
  T("I'm too warm.", 'Mir ist zu warm.', 'Same pattern. The person is in the dative; the state is the subject.'),
  T("I feel sick.", 'Mir ist schlecht.', 'ich bin krank means you are ill generally; mir ist schlecht is nausea right now.'),
  T("I'm bored.", 'Mir ist langweilig.', 'ich bin gelangweilt is grammatical and sounds translated. Natives say mir ist langweilig.'),
  T("I don't mind.", 'Das ist mir egal.', 'Literally: it is indifferent to me. Careful with tone — it can read as dismissive.'),
  T("That was embarrassing for me.", 'Das war mir peinlich.', 'Again dative. Ich war peinlich would mean you yourself were embarrassing.'),
  T("I'm not feeling great.", 'Mir ist nicht wohl.', 'Or mir geht es nicht gut. Both dative.'),
  T("Are you cold?", 'Ist dir kalt?', 'The dative pronoun moves, the structure does not.'),
  { id: id(), particle: 'impersonal dative', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: '___ ist langweilig.', context: 'You are bored right now, in this meeting.', options: ['Mir', 'Ich', 'Ich bin'] },
    target: 'Mir', note: 'Ich bin langweilig would mean you are a boring person — a genuinely embarrassing slip.' },
  { id: id(), particle: 'impersonal dative', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'Ich bin langweilig.', with: 'Mir ist langweilig.' },
    target: 'The first says you are a boring person; the second says you are bored. English collapses both into "I am bored", which is exactly why this error is so common and so hard to hear yourself make.',
    note: 'If you drill one interference item, drill this one.' },

  // ── haben for states ────────────────────────────────────────────────────
  T("I'm hungry.", 'Ich habe Hunger.', 'Ich bin hungrig exists but sounds clinical. Speech uses haben.'),
  T("I'm thirsty.", 'Ich habe Durst.', 'Same pattern.'),
  T("I was lucky.", 'Ich hatte Glück.', 'Luck is had, not been.'),
  T("I'm scared of that.", 'Ich habe Angst davor.', 'Note davor, not vor das — the da- compound is required with a pronoun reference.'),

  // ── es gibt vs es ist ───────────────────────────────────────────────────
  T("There's a problem with the invoice.", 'Es gibt ein Problem mit der Rechnung.', 'es gibt for existence. Accusative after it: ein Problem, not einem.'),
  T("There were a lot of people there.", 'Es waren viele Leute da.', 'Specific people in a specific place, so not es gibt. This distinction trips up nearly every English speaker.'),
  { id: id(), particle: 'es gibt', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: '___ noch Fragen?', context: 'Closing a presentation: any questions?', options: ['Gibt es', 'Sind es', 'Ist es'] },
    target: 'Gibt es', note: 'Gibt es noch Fragen? is close to fixed in professional German.' },

  // ── false friends ───────────────────────────────────────────────────────
  T("I got your email.", 'Ich habe deine E-Mail bekommen.', 'bekommen = receive. It never means become. To become is werden.'),
  T("He became a manager.", 'Er ist Manager geworden.', 'werden, not bekommen. The pair is the classic false-friend trap in both directions.'),
  T("We might possibly need more time.", 'Wir brauchen eventuell mehr Zeit.', 'eventuell = possibly. It does NOT mean eventually — that is schliesslich or letztendlich.'),
  T("So we agreed on Friday.", 'Also haben wir uns auf Freitag geeinigt.', 'also = so/therefore. German for English "also" is auch.'),
  T("That was a sensible decision.", 'Das war eine vernünftige Entscheidung.', 'sensibel means sensitive, not sensible. vernünftig is the word you want.'),
  T("She is very sensitive about it.", 'Sie ist da sehr sensibel.', 'The other half of the same pair.'),
  T("I need to ask my boss.", 'Ich muss meinen Chef fragen.', 'Chef = boss. A chef in the kitchen is a Koch.'),
  T("Can you give me some advice?", 'Kannst du mir einen Rat geben?', 'Rat = advice. Nothing to do with the animal.'),
  T("What kind of contract is it?", 'Was für eine Art von Vertrag ist das?', 'Art = kind/type. Art in the gallery sense is Kunst.'),
  T("The current situation is difficult.", 'Die aktuelle Situation ist schwierig.', 'aktuell = current. It does not mean actual, which is tatsächlich or eigentlich.'),
  { id: id(), particle: 'false friends', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Wir schicken die Unterlagen ___ nächste Woche.', context: 'Possibly, we are not yet sure.', options: ['eventuell', 'schliesslich', 'aktuell'] },
    target: 'eventuell', note: 'The eventually/eventuell trap, which quietly changes the meaning of a commitment.' },
  { id: id(), particle: 'false friends', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Ich bekomme langsam Hunger.' },
    target: 'I am starting to get hungry. bekommen is receive/get, and langsam here means gradually rather than slowly.',
    note: 'langsam as "gradually" is a second small trap sitting inside the first.' },

  // ── word order ──────────────────────────────────────────────────────────
  T("Yesterday I finished the report.", 'Gestern habe ich den Bericht fertig gemacht.', 'Verb second. Gestern ich habe is the most audible English-speaker error there is.'),
  T("Unfortunately we cannot do that.", 'Leider können wir das nicht machen.', 'Same rule: the adverb takes first position, so the verb comes before the subject.'),
  T("After the meeting I will call you.", 'Nach dem Meeting rufe ich dich an.', 'Fronted phrase, then verb, then subject. And the separable prefix goes to the end.'),
  { id: id(), particle: 'verb second', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Morgen ___ wir das besprechen.', context: 'Tomorrow we will discuss it.', options: ['können', 'wir können', 'wir'] },
    target: 'können', note: 'Position one is taken by Morgen, so the finite verb must be second and the subject follows.' },
  { id: id(), particle: 'verb final', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Ich denke, wir sollten warten. (…weil…)', attitude: 'restate as a weil-clause, verb to the end' },
    target: 'Ich denke, wir sollten warten, weil wir noch keine Zahlen haben.', note: 'Subordinating conjunctions send the finite verb to the end. Easy to know, hard to do live.' },

  // ── prepositions governed by the verb ───────────────────────────────────
  T("I'm looking forward to Friday.", 'Ich freue mich auf Freitag.', 'auf for something still to come. über is for something that has happened.'),
  T("I was pleased about the result.", 'Ich habe mich über das Ergebnis gefreut.', 'Same verb, different preposition, different time reference.'),
  T("It depends on the budget.", 'Das hängt vom Budget ab.', 'abhängen von, and the prefix goes to the end. Not depends auf.'),
  T("We are waiting for a decision.", 'Wir warten auf eine Entscheidung.', 'warten auf plus accusative. Not für.'),

  // ── smaller but very audible ────────────────────────────────────────────
  T("I'm going to make a decision this week.", 'Ich treffe diese Woche eine Entscheidung.', 'Decisions are met, not made. See the collocations category.'),
  T("Let me know if you have questions.", 'Sag mir Bescheid, wenn du Fragen hast.', 'Bescheid sagen is the fixed expression. A literal translation of "let me know" does not exist.'),
  T("I have to work on Saturday.", 'Ich muss am Samstag arbeiten.', 'am for days. Not auf Samstag.'),
];

export default {
  enabled: true,
  weight: 0.9,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [{
    guidance:
      'Interference from English. Watch specifically for: ich bin kalt/langweilig instead of the impersonal dative (mir ist…); ' +
      'ich bin hungrig instead of ich habe Hunger; es ist where es gibt is needed; false friends (bekommen for become, eventuell for eventually, ' +
      'also for also, sensibel for sensible, aktuell for actual); and English word order in a main clause (subject before a fronted adverb). ' +
      'Many of these are outright errors rather than naturalness issues — if it is simply wrong, leave it to the grammar engine and stay silent.',
    positiveExamples: ['Mir ist kalt.', 'Ich habe Hunger.', 'Gestern habe ich das gemacht.'],
    negativeExamples: ['Ich bin kalt.', 'Ich bin hungrig.', 'Gestern ich habe das gemacht.'],
  }],
};
