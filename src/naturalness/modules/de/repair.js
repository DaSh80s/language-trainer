/**
 * German — fluency and self-rescue.
 *
 * What to do mid-sentence when it goes wrong. Learners freeze; natives reroute.
 *
 * Every item here carries `timeLimitSec`, because this skill only exists under
 * real-time pressure — a repair formula you have thirty seconds to compose is
 * not a repair, it is a translation exercise.
 */

const REFERENCE = [
  { particle: 'rephrasing', sense: 'beziehungsweise (bzw.), also, was ich sagen wollte, ich formuliere das mal anders.',
    note: 'These buy a second and signal a correction is coming, so the listener waits rather than interrupting.' },
  { particle: 'the missing word', sense: 'Wie sagt man…? Mir fällt das Wort nicht ein. So eine Art…',
    note: 'Asking for the word is native behaviour, not failure. Natives do it constantly.' },
  { particle: 'circumlocution', sense: 'Talk around the missing word: das Ding, mit dem man… / so was wie…',
    note: 'Far more fluent than stopping. The listener usually supplies the word for you.' },
  { particle: 'verb-final recovery', sense: 'Realising mid-clause that the verb must go to the end, and getting it there without restarting.',
    note: 'The specific German version of this problem. Finish the clause — do not abandon it and start again.' },
  { particle: 'buying time', sense: 'also, ähm, sagen wir mal, wie soll ich sagen, moment.',
    note: 'Hesitation markers are not errors. Silence is what makes you sound stuck.' },
];

let n = 0;
const id = () => `de-rep-${String(++n).padStart(2, '0')}`;

/** Time-pressured by construction: repair only matters against the clock. */
const R = (props) => ({
  id: id(), particle: 'repair', register: 'neutral', professionalSafe: true,
  timeLimitSec: 20, ...props,
});

const ITEMS = [
  R({ format: 'trapTranslation', prompt: { english: 'We need it by Friday — or rather, by Thursday evening.' },
    target: 'Wir brauchen das bis Freitag, beziehungsweise bis Donnerstagabend.',
    note: 'beziehungsweise is the workhorse self-correction. Spoken, bzw. is said in full.' }),
  R({ format: 'trapTranslation', prompt: { english: 'What I meant to say was, the budget is already approved.' },
    target: 'Also, was ich sagen wollte: das Budget ist schon freigegeben.',
    note: 'Flags the restart so the listener does not treat the false start as your position.' }),
  R({ format: 'trapTranslation', prompt: { english: 'Let me put that differently.' },
    target: 'Ich formuliere das mal anders.', note: 'Complete sentence. Buys several seconds and sounds deliberate.' }),
  R({ format: 'trapTranslation', prompt: { english: 'How do you say... when a contract runs out?' },
    target: 'Wie sagt man… wenn ein Vertrag ausläuft?',
    note: 'Asking is native behaviour. The alternative is stopping, which is worse.' }),
  R({ format: 'trapTranslation', prompt: { english: 'The word escapes me.' },
    target: 'Mir fällt das Wort gerade nicht ein.', note: 'einfallen plus dative. A fixed, very useful unit.' }),
  R({ format: 'trapTranslation', prompt: { english: 'It is a kind of... deadline, but internal.' },
    target: 'Das ist so eine Art… Frist, aber intern.', note: 'so eine Art is the standard circumlocution opener.' }),
  R({ format: 'trapTranslation', prompt: { english: 'How shall I put it...' },
    target: 'Wie soll ich sagen…', note: 'Pure time-buying. Completely natural and very common.' }),
  R({ format: 'trapTranslation', prompt: { english: 'Let us say around twenty thousand.' },
    target: 'Sagen wir mal, so um die zwanzigtausend.',
    note: 'sagen wir mal plus so um die — hedged number, bought time, no commitment.' }),
  R({ format: 'trapTranslation', prompt: { english: 'Hang on, that is not quite right.' },
    target: 'Moment, das stimmt so nicht ganz.', note: 'Retracts without abandoning the turn.' }),
  R({ format: 'trapTranslation', prompt: { english: 'I do not know the word — the thing you sign at the end.' },
    target: 'Ich weiss das Wort nicht — das Ding, das man am Ende unterschreibt.',
    note: 'Relative clause circumlocution. The listener will usually hand you the word.' }),

  R({ format: 'insert', prompt: { bare: 'Wir müssen das verschieben. Nein, warte.', attitude: 'correct yourself mid-turn without starting the sentence again' },
    target: 'Wir müssen das verschieben, beziehungsweise wir sollten es zumindest kurz besprechen.',
    note: 'The repair rides on the existing clause rather than replacing it.' }),
  R({ format: 'insert', prompt: { bare: 'Ich denke, wir sollten… (you have lost the thread)', attitude: 'buy time out loud rather than going silent' },
    target: 'Ich denke, wir sollten… also, wie soll ich sagen… das nochmal anschauen.',
    note: 'Filled hesitation keeps the floor. Silence hands it away.' }),
  R({ format: 'insert', prompt: { bare: 'Ich glaube, dass wir mehr Zeit… (verb still needed at the end)', attitude: 'finish the dass-clause properly instead of restarting' },
    target: 'Ich glaube, dass wir mehr Zeit brauchen.',
    note: 'The verb-final recovery. Hold the clause open and land the verb — do not abandon it.' }),
  R({ format: 'insert', prompt: { bare: 'Das ist, weil wir keine Zahlen haben. (wrong: weil needs verb final)', attitude: 'repair the word order mid-sentence, out loud' },
    target: 'Das ist so, weil wir noch keine Zahlen haben.',
    note: 'Spoken German does tolerate weil plus main-clause order, but in professional speech the verb-final version is safer.',
    confidence: 'review' }),

  R({ format: 'which', prompt: { sentence: 'Wir liefern im März, ___ Anfang April.', context: 'Correcting yourself to a more accurate figure.', options: ['beziehungsweise', 'jedenfalls', 'immerhin'] },
    target: 'beziehungsweise', note: 'bzw. is specifically the or-rather correction.' }),
  R({ format: 'which', prompt: { sentence: '___, das war nicht ganz das, was ich meinte.', context: 'Retracting mid-turn.', options: ['Also', 'Genau', 'Eben'] },
    target: 'Also', note: 'also as a restart marker. genau and eben would agree, which is the opposite of what you want.' }),

  R({ format: 'reverseGloss', prompt: { sentence: 'Wie gesagt, beziehungsweise, ich versuchs nochmal.' },
    target: 'As I said — or rather, let me try that again. A speaker stacking two repair markers because the first attempt was not working.',
    note: 'Stacking repairs is normal, not sloppy.' }),
  R({ format: 'reverseGloss', prompt: { sentence: 'So eine Art Zwischenlösung, wenn man so will.' },
    target: 'A sort of interim solution, if you like — hedging a term the speaker is not sure is the right one.',
    note: 'wenn man so will licenses an imprecise word. Very useful when you are unsure.' }),

  R({ format: 'react', prompt: { line: 'Und wie hoch sind die laufenden Kosten genau?', situation: 'You do not know and need a moment — do not go silent' },
    target: 'Moment, lassen Sie mich kurz überlegen.', note: 'Claims thinking time explicitly instead of leaving dead air.' }),
  R({ format: 'react', prompt: { line: 'Sie haben gesagt, das sei bereits genehmigt.', situation: 'You did not say that and need to correct it fast' },
    target: 'Da muss ich kurz korrigieren.', note: 'Announces the correction before making it, which keeps it collegial.' }),

  { id: id(), particle: 'repair', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'Wir brauchen… (Stille) …äh… (Stille)', with: 'Wir brauchen… also, wie soll ich sagen… mehr Spielraum.' },
    target: 'Both speakers are equally stuck. The second keeps the floor and sounds like someone thinking; the first sounds like someone who has run out of German.',
    note: 'The difference is not vocabulary. It is whether the hesitation is filled out loud.' },
];

export default {
  enabled: true,
  weight: 0.7,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [{
    guidance:
      'Self-rescue. This category is mostly invisible in written practice — flag only a clear abandoned construction that was restarted from scratch ' +
      'where a native would have repaired in place (beziehungsweise, also was ich sagen wollte, ich formuliere das mal anders). ' +
      'Never flag hesitation markers as errors: they are the correct behaviour, not a fault.',
    positiveExamples: ['Wir brauchen das bis Freitag, beziehungsweise bis Donnerstag.', 'Also, was ich sagen wollte: …'],
    negativeExamples: [],
  }],
};
