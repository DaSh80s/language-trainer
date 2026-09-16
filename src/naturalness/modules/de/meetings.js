/**
 * German — Business: meetings.
 *
 * Taking the floor, disagreeing constructively, recording decisions, moving the
 * agenda on. Includes Swiss office vocabulary (Traktandum, Pendenz) — tagged
 * `ch` — because it is what you will actually hear in a Swiss meeting room.
 */

const REFERENCE = [
  { particle: 'Traktandum', sense: 'Swiss for agenda item; the agenda itself is the Traktandenliste.',
    note: 'In Germany: Tagesordnungspunkt. Using Traktandum in Zurich marks you as someone who works here.' },
  { particle: 'Pendenz', sense: 'Swiss office German for an open task or outstanding item.',
    note: 'Germans say offener Punkt or To-do. Pendenzenliste = the running list of open items.' },
  { particle: 'einhaken', sense: 'To cut in on a point — softer and more collegial than unterbrechen.',
    note: 'Darf ich hier kurz einhaken? Near-fixed.' },
  { particle: 'anders sehen', sense: 'Disagreeing by framing it as your view rather than as their error.',
    note: 'Ich sehe das etwas anders. Keeps the discussion open.' },
  { particle: 'zurückkommen auf', sense: 'To come back to a point later.',
    note: 'Darauf kommen wir später zurück. darauf because it refers to a thing.' },
  { particle: 'festhalten', sense: 'To record a decision so everyone is agreed on it.',
    note: 'Halten wir fest: … or Dann halten wir fest, dass …' },
  { particle: 'übernehmen', sense: 'To take on a task. The verb for assigning and volunteering.',
    note: 'Wer übernimmt das? / Das übernehme ich.' },
  { particle: 'Einverstanden', sense: 'Agreed — committed assent, firmer than genau.',
    note: 'Einverstanden, sofern … lets you agree with a condition.' },
  { particle: 'knapp', sense: 'Tight, only just — for a deadline or budget at risk.',
    note: 'Das wird knapp. Honest doubt without refusing.' },
  { particle: 'anknüpfen', sense: 'To build on what someone said.',
    note: 'Um an das anzuknüpfen, was Anna gesagt hat … A courteous way into a discussion.' },
];

let n = 0;
const id = () => `de-meet-${String(++n).padStart(2, '0')}`;
const base = { register: 'formal', professionalSafe: true };
const T = (particle, english, target, note, tags) => ({ id: id(), ...base, particle, format: 'trapTranslation', prompt: { english }, target, note, ...(tags ? { variantTags: tags } : {}) });
const S = (particle, blunt, level, target, note) => ({ id: id(), ...base, particle, format: 'soften', prompt: { blunt, level }, target, note });

const ITEMS = [
  T('Traktandum', "Let's move on to the next agenda item.", 'Kommen wir zum nächsten Traktandum.',
    'Swiss. In Germany: zum nächsten Tagesordnungspunkt.', ['ch']),
  T('Pendenz', "That's still an open item from last week.", 'Das ist noch eine Pendenz von letzter Woche.',
    'Swiss office German. In Germany: ein offener Punkt.', ['ch']),
  T('Pendenz', "Let's quickly go through the open items.", 'Gehen wir kurz die Pendenzen durch.', 'durchgehen is separable.', ['ch']),
  T('einhaken', 'May I jump in briefly here?', 'Darf ich hier kurz einhaken?', 'Softer than unterbrechen.'),
  T('anders sehen', 'I see that a little differently.', 'Ich sehe das etwas anders.', 'Your view, not their mistake.'),
  T('zurückkommen auf', "Let's come back to that later.", 'Darauf kommen wir später nochmals zurück.', 'zurückkommen auf; darauf for a thing.'),
  T('festhalten', "Let's record what we've agreed.", 'Halten wir fest, was wir vereinbart haben.', 'Verb first: a proposal to the room.'),
  T('übernehmen', 'Who will take care of that?', 'Wer übernimmt das?', 'Wer macht das? works but is blunter.'),
  T('übernehmen', "I'll take that on.", 'Das übernehme ich.', 'Object first — very natural when volunteering.'),
  T('anknüpfen', 'Just to build on what Anna said:', 'Um kurz an das anzuknüpfen, was Anna gesagt hat:', 'anknüpfen an plus accusative.'),

  S('einhaken', 'Warten Sie.', 'stopping someone mid-flow in a meeting, courteously',
    'Entschuldigung, darf ich hier kurz einhaken?', 'Warten Sie is an order.'),
  S('anders sehen', 'Das bringt nichts.', 'questioning whether an idea helps, constructively',
    'Ich frage mich, ob uns das wirklich weiterbringt.', 'A question invites discussion; a verdict closes it.'),
  S('festhalten', 'Wir machen es so.', 'stating a decision so the room can agree to it',
    'Dann halten wir fest, dass wir es so machen. Sind alle einverstanden?', 'Record it, then check agreement.'),

  { id: id(), ...base, particle: 'Einverstanden', format: 'react',
    prompt: { line: 'Ich schlage vor, dass wir das Budget erst im Oktober freigeben.', situation: 'You agree, firmly' },
    target: 'Einverstanden.', note: '' },
  { id: id(), ...base, particle: 'knapp', format: 'react',
    prompt: { line: 'Schaffen wir das bis Ende Monat?', situation: 'You doubt it but will not refuse' },
    target: 'Das wird knapp.', note: '' },

  { id: id(), ...base, particle: 'festhalten', format: 'recap',
    prompt: { said: 'Also: Das Marketing liefert die Texte bis Mittwoch, die IT prüft bis Freitag die Schnittstelle, und das Go-live verschieben wir auf den 15. Oktober.',
      situation: 'Summarising the decisions before closing the meeting' },
    mustInclude: ['marketing delivers texts by Wednesday', 'IT checks the interface by Friday', 'go-live moved to 15 October'],
    target: 'Halten wir fest: Das Marketing liefert die Texte bis Mittwoch, die IT prüft die Schnittstelle bis Freitag, und das Go-live ist neu am 15. Oktober.',
    note: 'neu am … is a very Swiss way of flagging a changed date.' },
  { id: id(), ...base, particle: 'übernehmen', format: 'clarify',
    prompt: { said: 'Das sollte jemand bis nächste Woche anschauen.', unclear: 'who is responsible, and by which day' },
    mustPin: ['who owns the task', 'the exact deadline'],
    target: 'Wer übernimmt das, und bis wann genau — bis Montag oder bis Freitag?',
    note: 'Nächste Woche is five possible deadlines.' },

  { id: id(), ...base, particle: 'Traktandum', format: 'which', variantTags: ['ch'],
    prompt: { sentence: 'Das nehmen wir als eigenes ___ auf.', context: 'We will put that on the agenda as its own item (Swiss office German).', options: ['Traktandum', 'Termin', 'Anlass'] },
    target: 'Traktandum', note: 'Anlass is Swiss for an event; Termin is an appointment.' },
  { id: id(), ...base, particle: 'zurückkommen auf', format: 'minimalPair',
    prompt: { without: 'Okay. Nächstes Thema.', with: 'Gut, damit ist das geklärt. Kommen wir zum nächsten Traktandum.' },
    target: 'Version 2 closes the point before moving on, so nobody wonders whether it is settled. Version 1 jumps and can leave people behind.',
    note: 'Close the point, then move.' },
  { id: id(), ...base, particle: 'anders sehen', format: 'insert',
    prompt: { bare: 'Das ist zu teuer.', attitude: 'raising a cost concern while acknowledging the idea has merit' },
    target: 'Die Idee gefällt mir, ich habe aber Bedenken wegen der Kosten.', note: 'Credit first, concern second.' },
];

export default {
  enabled: true,
  weight: 0.8,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [],
};
