/**
 * German — Business: phone calls.
 *
 * Opening a call, checking understanding, agreeing next steps and closing.
 * Swiss professional German throughout (ss, never ß). Written for general use,
 * not for any one profession.
 */

const REFERENCE = [
  { particle: 'opening a call', sense: 'Say who you are and why you are calling in the first two sentences.',
    note: 'Grüezi, hier ist … von … Ich rufe wegen … an. Spoken in Switzerland; in writing and in Germany, Guten Tag.' },
  { particle: 'Passt es gerade?', sense: 'Is now a good moment? Checking before launching into the call.',
    note: 'Expected rather than overly polite. Haben Sie kurz Zeit? is equally common.' },
  { particle: 'akustisch nicht verstanden', sense: '"I did not catch that" — the line was the problem, not the meaning.',
    note: 'Das habe ich akustisch nicht verstanden. Saves face on both sides and is ideal on a poor connection.' },
  { particle: 'Wenn ich Sie richtig verstehe', sense: 'If I understand you correctly — restating to confirm before you move on.',
    note: 'Signals attention and prevents wrong notes. Follow with Stimmt das so? to hand the turn back.' },
  { particle: 'festhalten', sense: 'To note down for the record; to state a conclusion so it is agreed.',
    note: 'Dann halte ich fest, dass … The verb goes to the end after dass.' },
  { particle: 'sich melden', sense: 'To get in touch, to get back to someone.',
    note: 'Ich melde mich bis Freitag bei Ihnen. Not zurückkommen, which is a calque of "get back to".' },
  { particle: 'Wie verbleiben wir?', sense: 'How shall we leave it? — the standard move for agreeing next steps before hanging up.',
    note: 'The answer uses the same verb: Wir verbleiben so, dass …' },
  { particle: 'Verstanden', sense: 'Understood. A crisp acknowledgement that sounds more assured than okay.',
    note: 'Use it where you would otherwise say okay for the third time in a minute.' },
  { particle: 'Gut zu wissen', sense: 'Good to know — acknowledges information and signals that it matters.',
    note: 'Better than okay when someone volunteers something useful.' },
  { particle: 'closing a call', sense: 'Confirm what was agreed, thank them, sign off warmly — three moves, not one.',
    note: 'A bare Tschüss after a substantive call can land as abrupt.' },
];

let n = 0;
const id = () => `de-calls-${String(++n).padStart(2, '0')}`;
const base = { register: 'formal', professionalSafe: true };
const T = (particle, english, target, note, extra) => ({ id: id(), ...base, particle, format: 'trapTranslation', prompt: extra ? { english, extra } : { english }, target, note });
const S = (particle, blunt, level, target, note) => ({ id: id(), ...base, particle, format: 'soften', prompt: { blunt, level }, target, note });
const R = (particle, line, situation, target, note) => ({ id: id(), ...base, particle, format: 'react', prompt: { line, situation }, target, note });

const ITEMS = [
  T('opening a call', "Hello, this is Anna Keller from Novatec. I'm calling about your application.",
    'Grüezi, hier ist Anna Keller von Novatec. Ich rufe wegen Ihrer Bewerbung an.',
    'Name and reason in the first two sentences. anrufen is separable, so an goes to the end.', 'Spoken, in Switzerland.'),
  T('Passt es gerade?', 'Is now a good time?', 'Passt es Ihnen gerade?', 'Asking first is expected, not fussy.'),
  T('Passt es gerade?', "If now doesn't suit you, I'm happy to call back later.",
    'Wenn es Ihnen gerade nicht passt, rufe ich gerne später nochmals an.', 'nochmals is the usual Swiss form of noch einmal.'),
  T('akustisch nicht verstanden', "Sorry, I didn't quite catch that.", 'Entschuldigung, das habe ich akustisch nicht verstanden.',
    'akustisch makes clear the problem was the line, not your German.'),
  T('akustisch nicht verstanden', "The line is bad — could you repeat that?", 'Die Verbindung ist schlecht. Könnten Sie das bitte wiederholen?',
    'Konjunktiv II plus bitte for the request.'),
  T('Wenn ich Sie richtig verstehe', "If I understand you correctly, you'd prefer a permanent position.",
    'Wenn ich Sie richtig verstehe, möchten Sie lieber eine Festanstellung.', 'After the wenn-clause the main clause starts with its verb: möchten Sie.'),
  T('festhalten', "So I'll note that you're available from March.", 'Dann halte ich fest, dass Sie ab März verfügbar sind.',
    'Verb to the end after dass.'),
  T('sich melden', "I'll get back to you by Friday.", 'Ich melde mich bis Freitag bei Ihnen.', 'sich melden bei plus dative.'),
  T('Wie verbleiben wir?', 'How shall we leave it?', 'Wie verbleiben wir?', 'Near-fixed before hanging up.'),
  T('Wie verbleiben wir?', "So we'll leave it that I send you the job description today.",
    'Dann verbleiben wir so, dass ich Ihnen heute die Stellenbeschreibung schicke.', 'The answer to Wie verbleiben wir? reuses the verb.'),
  T('closing a call', 'Thank you for your time, and have a good rest of the day.', 'Vielen Dank für Ihre Zeit und noch einen schönen Tag.',
    'noch einen schönen Tag is the standard warm sign-off.'),

  S('opening a call', 'Wer ist da?', 'answering an unknown caller at work, politely',
    'Entschuldigung, mit wem spreche ich?', 'Wer ist da? is what you say through a front door, not on a business line.'),
  S('akustisch nicht verstanden', 'Was?', 'you did not catch what a client said',
    'Entschuldigung, wie bitte?', 'Or: Das habe ich akustisch nicht verstanden.'),
  S('sich melden', 'Ich rufe Sie an.', 'a specific promise about when you will be back in touch',
    'Ich melde mich spätestens am Donnerstag bei Ihnen.', 'A date turns a vague promise into a commitment.'),

  R('Verstanden', 'Ich bin ab dem ersten März verfügbar.', 'Acknowledge crisply — not with okay', 'Verstanden.', ''),
  R('Gut zu wissen', 'Ich spreche übrigens auch fliessend Französisch.', 'Acknowledge that this is useful information', 'Gut zu wissen.', ''),
  R('closing a call', 'Also, das wäre es von meiner Seite.', 'Thank them briefly and warmly', 'Sehr hilfreich, danke.',
    'Short thanks that also signals you are wrapping up.'),

  { id: id(), ...base, particle: 'Wenn ich Sie richtig verstehe', format: 'recap',
    prompt: { said: 'Also, ich bin momentan noch ungekündigt. Meine Kündigungsfrist beträgt drei Monate, aber ich könnte eventuell früher gehen, wenn mein Arbeitgeber mitmacht.',
      situation: 'Someone on the phone, before you move to the next topic' },
    mustInclude: ['has not yet resigned', 'three months notice', 'possibly earlier if the employer agrees'],
    target: 'Wenn ich Sie richtig verstehe, haben Sie noch nicht gekündigt, die Kündigungsfrist beträgt drei Monate, und ein früherer Austritt wäre allenfalls in Absprache mit Ihrem Arbeitgeber möglich. Stimmt das so?',
    note: 'allenfalls — possibly, if need be — is a Swiss favourite. And eventuell means possibly, never eventually.' },
  { id: id(), ...base, particle: 'Wenn ich Sie richtig verstehe', format: 'clarify',
    prompt: { said: 'Ich könnte ab Anfang Jahr starten.', unclear: 'which year, and the actual start date' },
    mustPin: ['which year', 'a concrete start date'],
    target: 'Meinen Sie Anfang Januar 2027, also direkt nach Neujahr?',
    note: 'A vague date written down is a wrong date waiting to happen.' },

  { id: id(), ...base, particle: 'sich melden', format: 'which',
    prompt: { sentence: 'Ich ___ mich morgen bei Ihnen.', context: 'I will get back to you tomorrow.', options: ['melde', 'rufe', 'komme'] },
    target: 'melde', note: 'sich melden bei. The other two do not take sich here.' },
  { id: id(), ...base, particle: 'Wie verbleiben wir?', format: 'which',
    prompt: { sentence: 'Wie ___ wir?', context: 'How shall we leave it — agreeing next steps before hanging up.', options: ['verbleiben', 'bleiben', 'machen'] },
    target: 'verbleiben', note: 'Wie bleiben wir? is not idiomatic.' },
  { id: id(), ...base, particle: 'closing a call', format: 'minimalPair',
    prompt: { without: 'Okay. Tschüss.', with: 'Gut, dann verbleiben wir so. Vielen Dank für das Gespräch und noch einen schönen Tag.' },
    target: 'Version 2 confirms what was agreed, thanks them and signs off warmly. Version 1 ends so abruptly that it can sound dismissive after a substantive business call.',
    note: 'Confirm, thank, sign off.' },
];

export default {
  enabled: true,
  weight: 0.8,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [],
};
