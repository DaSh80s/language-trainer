/**
 * German — Business: candidate calls.
 *
 * Qualifying a candidate by phone: motivation, location, availability, permits.
 * Useful to any recruiter or hiring manager, not to one company.
 *
 * Several items start from real clipped questions ("Ist Zürich Ihnen lieb?")
 * and their polished versions. One deliberate choice: an AI review of such a
 * call put "grundsätzlich" into three of its six suggested questions. Each is
 * fine alone; together they are a tic. So it appears here sparingly, and one
 * item teaches exactly that.
 */

const REFERENCE = [
  { particle: 'infrage kommen', sense: 'To be an option — Käme das für Sie infrage? Would that be an option for you?',
    note: 'infrage and in Frage are both correct spellings. Konjunktiv II (käme) keeps it open.' },
  { particle: 'vorstellbar', sense: 'Conceivable — Wäre das für Sie vorstellbar? Could you see yourself doing that?',
    note: 'Gentler than akzeptabel, which sounds like a negotiation.' },
  { particle: 'grundsätzlich', sense: 'In principle, basically.',
    note: 'Useful once. In every question it becomes a filler, the same problem as repeating okay.' },
  { particle: 'Arbeitsort', sense: 'Place of work. bevorzugter Arbeitsort = preferred location.',
    note: 'Also: pendeln (to commute), Homeoffice (one word).' },
  { particle: 'Wechselmotivation', sense: 'Why someone wants to change job.',
    note: 'Ask it as what they are moving towards, not what is wrong: Was motiviert Sie, sich zu verändern?' },
  { particle: 'Aufenthaltsbewilligung', sense: 'Residence permit — B, C, or G for cross-border commuters (Grenzgänger).',
    note: 'The Swiss question is which permit, not whether they have a work permit.' },
  { particle: 'Schweizerdeutsch', sense: 'Swiss German — the dialect, as opposed to Hochdeutsch.',
    note: 'Ask how well they understand it at work; okay? invites a polite yes.' },
  { particle: 'Einordnung', sense: 'Placing, categorising — Das hilft mir bei der Einordnung.',
    note: 'A purposeful acknowledgement: it tells them why you asked.' },
  { particle: 'moving on from a role', sense: 'Closing off a role that does not fit, then giving the next questions a purpose.',
    note: 'Verstanden. Dann verfolgen wir diese Stelle nicht weiter. Damit wir Sie künftig gezielter ansprechen können …' },
  { particle: 'Wenn ich Sie richtig verstehe', sense: 'If I understand you correctly — restating before moving on.',
    note: 'End with Stimmt das so? so they can correct you.' },
  { particle: 'Verstanden', sense: 'Understood — a crisp acknowledgement that sounds more assured than okay.',
    note: 'Especially useful when a candidate turns something down.' },
  { particle: 'Gut zu wissen', sense: 'Good to know — acknowledges useful information.',
    note: 'Better than okay when a candidate volunteers something relevant.' },
  { particle: 'sich melden', sense: 'To get in touch.', note: 'Ich melde mich, sobald sich etwas Konkretes ergibt.' },
];

let n = 0;
const id = () => `de-cand-${String(++n).padStart(2, '0')}`;
const base = { register: 'formal', professionalSafe: true };
const T = (particle, english, target, note) => ({ id: id(), ...base, particle, format: 'trapTranslation', prompt: { english }, target, note });
const S = (particle, blunt, level, target, note) => ({ id: id(), ...base, particle, format: 'soften', prompt: { blunt, level }, target, note });

const ITEMS = [
  S('Arbeitsort', 'Ist Zürich Ihnen lieb?', 'a complete question about their preferred place of work',
    'Ist die Region Zürich Ihr bevorzugter Arbeitsort?', 'Ist Ihnen lieb is understood but sounds oddly personal.'),
  S('infrage kommen', 'Stadt oder Kanton?', 'a full question: would the whole canton work, or only the city',
    'Käme für Sie nur die Stadt Zürich infrage, oder auch der ganze Kanton?', 'Clipped two-word questions work, but sound hurried.'),
  S('infrage kommen', 'Sind Sie offen für Interim?', 'polished, to an experienced candidate',
    'Wären Sie auch für ein Interim-Mandat offen?', 'Konjunktiv II does the politeness. No grundsätzlich needed.'),
  S('vorstellbar', 'Das wäre akzeptabel für Sie?', 'checking openness without sounding like a negotiation',
    'Wäre das für Sie vorstellbar?', ''),
  S('Schweizerdeutsch', 'Ist Schweizerdeutsch okay für Sie?', 'asking a German candidate about Swiss German, tactfully',
    'Wie gut verstehen Sie Schweizerdeutsch im beruflichen Alltag?', 'An open question gets a truer answer than okay?'),
  S('Wechselmotivation', 'Warum wollen Sie weg?', 'asking about motivation to change, without implying something is wrong',
    'Was motiviert Sie, sich beruflich zu verändern?', ''),
  S('Aufenthaltsbewilligung', 'Haben Sie eine Arbeitserlaubnis?', 'asking a non-Swiss candidate about their permit, the Swiss way',
    'Welche Aufenthaltsbewilligung haben Sie?', 'In Switzerland it is the permit type — B, C or G — that matters.'),

  T('Einordnung', 'That helps me place your profile.', 'Das hilft mir bei der Einordnung Ihres Profils.', ''),
  T('Wechselmotivation', 'What would a new role need to offer you?', 'Was müsste Ihnen eine neue Stelle bieten?', ''),
  T('Wechselmotivation', 'What would your ideal next role look like?', 'Wie sähe Ihre ideale nächste Stelle aus?', 'sähe: Konjunktiv II of sehen.'),
  T('infrage kommen', 'Would a role in Basel also be an option for you?', 'Käme für Sie auch eine Stelle in Basel infrage?', ''),
  T('Arbeitsort', 'How far would you be willing to commute?', 'Wie weit wären Sie bereit zu pendeln?', ''),
  T('Arbeitsort', 'How many days of home office matter to you?', 'Wie viele Tage Homeoffice sind Ihnen wichtig?', 'Homeoffice, one word.'),
  T('moving on from a role', "Understood. Then we won't pursue this position. So that we can approach you more precisely in future, I'd like to note your search criteria.",
    'Verstanden. Dann verfolgen wir diese Stelle nicht weiter. Damit wir Sie künftig gezielter ansprechen können, möchte ich noch kurz Ihre Suchkriterien festhalten.',
    'Close the dead end, then give the next questions a purpose.'),
  T('sich melden', "I'll keep an eye out for suitable positions and get in touch as soon as something concrete comes up.",
    'Ich halte die Augen nach passenden Stellen offen und melde mich, sobald sich etwas Konkretes ergibt.', ''),

  { id: id(), ...base, particle: 'Wenn ich Sie richtig verstehe', format: 'recap',
    prompt: { said: 'Ich suche entweder eine Teamleitung im Applikationsmanagement oder eine Consulting-Rolle im Gesundheitswesen. Am liebsten im Raum Zürich. Interim ginge auch, je nach Dauer.',
      situation: 'Recap before you move on to salary' },
    mustInclude: ['team lead in application management, or a consulting role in healthcare', 'Zurich area preferred', 'interim possible depending on duration'],
    target: 'Wenn ich Sie richtig verstehe, suchen Sie eine Teamleitung im Applikationsmanagement oder eine Consulting-Rolle im Gesundheitswesen, idealerweise im Raum Zürich, und ein Interim-Mandat käme je nach Dauer auch infrage. Stimmt das so?',
    note: 'Stimmt das so? hands the turn back so they can correct you.' },
  { id: id(), ...base, particle: 'Wechselmotivation', format: 'recap',
    prompt: { said: 'Ich bin seit sechs Jahren bei der gleichen Firma und fühle mich nicht mehr gefordert. Eine Führungsrolle würde mich reizen, aber nicht um jeden Preis.',
      situation: 'Recap their motivation' },
    mustInclude: ['six years at the same company', 'no longer challenged', 'leadership appeals, but not at any price'],
    target: 'Sie sind also seit sechs Jahren im gleichen Unternehmen, fühlen sich nicht mehr gefordert und könnten sich eine Führungsrolle vorstellen, aber nicht um jeden Preis.',
    note: '' },
  { id: id(), ...base, particle: 'Wechselmotivation', format: 'clarify',
    prompt: { said: 'Ich bin offen für alles Mögliche.', unclear: 'what they would rule out' },
    mustPin: ['what is excluded or a deal-breaker'],
    target: 'Gut zu hören. Gibt es trotzdem Bereiche oder Rollen, die für Sie klar nicht infrage kommen?',
    note: 'Open to anything tells you nothing; asking what is excluded does.' },
  { id: id(), ...base, particle: 'Aufenthaltsbewilligung', format: 'clarify',
    prompt: { said: 'Ich wohne in Konstanz.', unclear: 'whether they would move to Switzerland or commute across the border' },
    mustPin: ['relocate or commute as a cross-border commuter'],
    target: 'Würden Sie für die Stelle in die Schweiz ziehen, oder als Grenzgänger pendeln?',
    note: 'Grenzgänger: cross-border commuter, on a G permit.' },

  { id: id(), ...base, particle: 'Verstanden', format: 'react',
    prompt: { line: 'Die Stelle passt leider nicht zu meinen Vorstellungen.', situation: 'Acknowledge and accept it, without disappointment' },
    target: 'Verstanden.', note: '' },
  { id: id(), ...base, particle: 'Gut zu wissen', format: 'react',
    prompt: { line: 'Ich habe übrigens auch schon mit Epic gearbeitet.', situation: 'Acknowledge that this is useful information' },
    target: 'Gut zu wissen.', note: '' },

  { id: id(), ...base, particle: 'infrage kommen', format: 'which',
    prompt: { sentence: 'Käme das für Sie ___?', context: 'Would that be an option for you?', options: ['infrage', 'zur Frage', 'fraglich'] },
    target: 'infrage', note: 'in Frage, as two words, is also correct.' },
  { id: id(), ...base, particle: 'grundsätzlich', format: 'minimalPair',
    prompt: { without: 'Wären Sie grundsätzlich offen? Wäre das grundsätzlich vorstellbar? Kommt das grundsätzlich infrage?',
      with: 'Wären Sie dafür offen? Wäre das für Sie vorstellbar? Käme das infrage?' },
    target: 'Each question in version 1 is fine on its own, but grundsätzlich in every one becomes a verbal tic, just like repeating okay. Version 2 keeps the politeness through Konjunktiv II and varies the wording.',
    note: 'Swapping one filler for another is not an upgrade.' },
  { id: id(), ...base, particle: 'vorstellbar', format: 'insert',
    prompt: { bare: 'Sie müssten zwei Tage pro Woche vor Ort sein.', attitude: 'presenting a requirement as something they can weigh up, not as a condition' },
    target: 'Wäre es für Sie vorstellbar, zwei Tage pro Woche vor Ort zu sein?', note: '' },
];

export default {
  enabled: true,
  weight: 0.8,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [],
};
