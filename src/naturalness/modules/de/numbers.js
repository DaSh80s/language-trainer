/**
 * German — Business: numbers and employment terms.
 *
 * Swiss conventions: Pensum as a percentage, the 13th monthly salary, per as
 * "as of", and 145'000 with an apostrophe. Most of the skill here is asking the
 * one question that stops a figure being noted wrongly.
 */

const REFERENCE = [
  { particle: 'Pensum', sense: 'Workload as a percentage of full time — 100 %, 80 %, 60 %.',
    note: 'Swiss. Job ads say 80–100 %. In Germany you would hear Vollzeit / Teilzeit or Stundenumfang.' },
  { particle: 'Lohn', sense: 'Salary. Bruttojahreslohn = gross annual salary; Lohnvorstellungen = salary expectations.',
    note: 'Lohn is the everyday Swiss word; Gehalt is more German-German.' },
  { particle: 'Fixlohn', sense: 'Base salary, as opposed to Gesamtvergütung (total compensation including bonus).',
    note: 'A single annual figure can mean either, so ask which.' },
  { particle: '13. Monatslohn', sense: 'The 13th monthly salary, standard in Switzerland.',
    note: 'An annual salary may be quoted with or without it — always check.' },
  { particle: 'Kündigungsfrist', sense: 'Notice period. ungekündigt = has not yet resigned.',
    note: 'Wie lange ist Ihre Kündigungsfrist?' },
  { particle: 'per', sense: 'As of, with effect from — per 1. März.',
    note: 'Standard in Swiss business German. ab 1. März is also fine.' },
  { particle: 'befristet', sense: 'Fixed-term. unbefristet = permanent; Festanstellung = permanent employment.',
    note: 'Interim-Mandat for an interim assignment.' },
  { particle: 'Beträge nennen', sense: 'Saying figures: units before tens — hundertfünfundvierzigtausend.',
    note: 'Written 145’000 in Switzerland, with an apostrophe. In speech people often drop the tausend, which is exactly why you clarify.' },
  { particle: 'Notiert', sense: 'Noted — confirms you have written a figure down.',
    note: 'A one-word confirmation that sounds on top of things.' },
];

let n = 0;
const id = () => `de-num-${String(++n).padStart(2, '0')}`;
const base = { register: 'formal', professionalSafe: true };
const T = (particle, english, target, note, tags) => ({ id: id(), ...base, particle, format: 'trapTranslation', prompt: { english }, target, note, ...(tags ? { variantTags: tags } : {}) });
const C = (particle, said, unclear, mustPin, target, note) => ({ id: id(), ...base, particle, format: 'clarify', prompt: { said, unclear }, mustPin, target, note });

const ITEMS = [
  T('Pensum', 'Are you looking for full time, or would 80 percent also work?',
    'Suchen Sie eine Stelle mit 100 Prozent, oder käme auch ein Pensum von 80 Prozent infrage?', 'Swiss usage.', ['ch']),
  T('Lohn', 'What is your current gross annual salary?', 'Wie hoch ist Ihr aktueller Bruttojahreslohn?', 'Lohn rather than Gehalt in Switzerland.'),
  T('Fixlohn', 'Is that base salary or total compensation including bonus?',
    'Ist das der Fixlohn oder die Gesamtvergütung inklusive Bonus?', ''),
  T('13. Monatslohn', 'Is that based on twelve or thirteen monthly salaries?',
    'Ist das auf zwölf oder dreizehn Monatslöhne gerechnet?', 'The 13th salary is standard in Switzerland, so check.', ['ch']),
  T('Kündigungsfrist', 'What is your notice period?', 'Wie lange ist Ihre Kündigungsfrist?', ''),
  T('per', 'So you could start on 1 June at the earliest?', 'Sie könnten also frühestens per 1. Juni beginnen?', 'per plus a date = as of.', ['ch']),
  T('per', 'The position is to be filled as of 1 March.', 'Die Stelle ist per 1. März zu besetzen.', 'Job-ad wording.', ['ch']),
  T('befristet', 'Is it a permanent or a fixed-term contract?', 'Ist es eine unbefristete oder eine befristete Anstellung?', ''),
  T('Beträge nennen', 'One hundred and forty-five thousand francs.', 'Hundertfünfundvierzigtausend Franken.', 'Units before tens: fünfundvierzig.'),
  T('Beträge nennen', 'About ten percent below your current salary.', 'Rund zehn Prozent unter Ihrem aktuellen Lohn.', 'rund is the usual word for about with figures.'),

  C('Fixlohn', 'Ab 145.', 'the currency, gross or net, the Pensum it assumes, and whether it is base salary or total',
    ['currency', 'gross or net', 'the Pensum', 'base salary or total compensation'],
    'Nur damit ich es korrekt notiere: Meinen Sie CHF 145’000 brutto bei 100 Prozent, und ist das der Fixlohn oder die Gesamtvergütung?',
    'Four things can be wrong with a bare number. Pin them all in one question.'),
  C('13. Monatslohn', 'Ich verdiene momentan 120’000.', 'whether the 13th salary is included, and whether a bonus comes on top',
    ['13th salary included or not', 'bonus on top or not'],
    'Ist der 13. Monatslohn da schon eingerechnet, und kommt allenfalls noch ein Bonus dazu?', ''),
  C('Pensum', 'Ich möchte nicht mehr voll arbeiten.', 'the percentage they actually want',
    ['the target percentage'],
    'Welches Pensum schwebt Ihnen vor — eher 80 oder 60 Prozent?', 'vorschweben: to have in mind. Offering two numbers makes it easy to answer.'),
  C('Kündigungsfrist', 'Ich wäre relativ kurzfristig verfügbar.', 'whether they have already resigned, and a concrete start date',
    ['resigned already or not', 'a concrete start date'],
    'Was heisst das konkret — haben Sie bereits gekündigt, und ab wann könnten Sie beginnen?', 'kurzfristig can mean two weeks or three months.'),

  { id: id(), ...base, particle: 'Lohn', format: 'soften',
    prompt: { blunt: 'Wie viel wollen Sie verdienen?', level: 'asking about salary expectations, professionally' },
    target: 'Was sind Ihre Lohnvorstellungen?', note: 'Lohnvorstellungen is the standard term; wollen is blunt.' },
  { id: id(), ...base, particle: 'Kündigungsfrist', format: 'soften',
    prompt: { blunt: 'Wann können Sie anfangen?', level: 'polished, and taking the notice period into account' },
    target: 'Ab wann wären Sie unter Berücksichtigung Ihrer Kündigungsfrist verfügbar?', note: '' },

  { id: id(), ...base, particle: 'Fixlohn', format: 'recap',
    prompt: { said: 'Aktuell liege ich bei 132’000 brutto, inklusive 13. Monatslohn, plus ungefähr zehn Prozent Bonus. Für einen Wechsel bräuchte ich mindestens 145’000 fix.',
      situation: 'Summarise the salary picture back before you note it' },
    mustInclude: ['currently 132000 gross including the 13th salary', 'about 10 percent bonus on top', 'needs at least 145000 fixed to move'],
    target: 'Damit ich es richtig notiere: Sie liegen aktuell bei CHF 132’000 brutto inklusive 13. Monatslohn, plus rund zehn Prozent Bonus, und für einen Wechsel bräuchten Sie mindestens CHF 145’000 Fixlohn. Stimmt das so?',
    note: 'Damit ich es richtig notiere is a natural reason to recap figures.' },

  { id: id(), ...base, particle: 'Pensum', format: 'which', variantTags: ['ch'],
    prompt: { sentence: 'Die Stelle ist mit einem ___ von 80 bis 100 Prozent ausgeschrieben.', context: 'Swiss job-ad wording.', options: ['Pensum', 'Satz', 'Anteil'] },
    target: 'Pensum', note: '' },
  { id: id(), ...base, particle: 'Notiert', format: 'react',
    prompt: { line: 'Das wäre dann ein Pensum von 80 Prozent.', situation: 'Confirm that you have written it down' },
    target: 'Notiert.', note: '' },
];

export default {
  enabled: true,
  weight: 0.8,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [],
};
