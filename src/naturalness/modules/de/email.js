/**
 * German — Business: email.
 *
 * Swiss business email: courteous without being stiff. Swiss spelling (ss).
 * Written forms here differ from spoken ones — Grüezi is spoken; in writing it
 * is Guten Tag.
 */

const REFERENCE = [
  { particle: 'Anrede', sense: 'The greeting. Guten Tag Herr Meier (neutral), Sehr geehrter Herr Meier (formal), Hallo zusammen (a team).',
    note: 'Grüezi is spoken, not written.', confidence: 'review' },
  { particle: 'Besten Dank', sense: 'Many thanks — the Swiss business default.', note: 'Vielen Dank is fine too; Besten Dank reads Swiss.' },
  { particle: 'Gerne', sense: 'Opening with Gerne … — "I am happy to …" — is a hallmark of Swiss business email.',
    note: 'Gerne sende ich Ihnen … in der Beilage = attached.' },
  { particle: 'Rückfragen', sense: 'Follow-up questions. Für Rückfragen stehe ich Ihnen gerne zur Verfügung.',
    note: 'The standard closing offer of help.' },
  { particle: 'nachfassen', sense: 'To chase or follow up on something unanswered.',
    note: 'Ich erlaube mir, auf meine Nachricht zurückzukommen — courteous, never reproachful.' },
  { particle: 'Terminvorschlag', sense: 'Proposing a meeting time — concrete options, not "when are you free?".',
    note: 'Würde Ihnen Dienstag, 14 Uhr, passen?' },
  { particle: 'Freundliche Grüsse', sense: 'Kind regards — the Swiss sign-off.', note: 'Germany writes Mit freundlichen Grüssen.', confidence: 'review' },
];

let n = 0;
const id = () => `de-mail-${String(++n).padStart(2, '0')}`;
const base = { register: 'formal', professionalSafe: true };
const T = (particle, english, target, note, extra, extraProps = {}) => ({ id: id(), ...base, particle, format: 'trapTranslation', prompt: extra ? { english, extra } : { english }, target, note, ...extraProps });
const S = (particle, blunt, level, target, note) => ({ id: id(), ...base, particle, format: 'soften', prompt: { blunt, level }, target, note });

const ITEMS = [
  T('Anrede', 'Dear Mr Meier,', 'Guten Tag Herr Meier', 'Neutral Swiss opening. Sehr geehrter Herr Meier is more formal.', 'Swiss business email, neutral tone.', { confidence: 'review', variantTags: ['ch'] }),
  T('Anrede', 'Hello everyone,', 'Hallo zusammen', 'Addressing a team in internal email.', 'Internal email to your team.', { variantTags: ['ch'] }),
  T('Besten Dank', 'Thank you for your message.', 'Besten Dank für Ihre Nachricht.', ''),
  T('Besten Dank', 'Many thanks in advance for your feedback.', 'Besten Dank im Voraus für Ihre Rückmeldung.', 'Rückmeldung = feedback, reply.'),
  T('Gerne', 'Please find my CV attached.', 'Gerne sende ich Ihnen in der Beilage meinen Lebenslauf.', 'in der Beilage is the Swiss "attached"; im Anhang is also fine.'),
  T('Rückfragen', 'If you have any questions, I am happy to help.', 'Für Rückfragen stehe ich Ihnen gerne zur Verfügung.', 'Close to a fixed formula.'),
  T('nachfassen', 'I am just following up on my email from last week.', 'Ich erlaube mir, auf meine E-Mail von letzter Woche zurückzukommen.', 'Courteous chasing.'),
  T('Terminvorschlag', 'Let me know which suits you better.', 'Geben Sie mir gerne Bescheid, was Ihnen besser passt.', 'Bescheid geben rather than a calque of "let me know".'),
  T('Freundliche Grüsse', 'Kind regards and have a good weekend,', 'Freundliche Grüsse und ein schönes Wochenende', 'Swiss sign-off.', null, { variantTags: ['ch'] }),

  S('Gerne', 'Schicken Sie mir Ihren Lebenslauf.', 'a friendly request to a candidate by email',
    'Dürfte ich Sie bitten, mir Ihren Lebenslauf zuzustellen?', 'zustellen is formal written Swiss; senden is equally fine.'),
  S('nachfassen', 'Sie haben nicht geantwortet.', 'chasing a reply with no hint of reproach',
    'Ich erlaube mir, nochmals auf meine Nachricht vom Montag zurückzukommen.', ''),
  S('Besten Dank', 'Ok, danke.', 'acknowledging a client email professionally',
    'Besten Dank für die Rückmeldung.', ''),
  S('Terminvorschlag', 'Wann haben Sie Zeit?', 'proposing a meeting with concrete options',
    'Würde Ihnen Dienstag, 14 Uhr, oder Mittwoch, 10 Uhr, passen?', 'Options get a faster reply than an open question.'),

  { id: id(), ...base, particle: 'Rückfragen', format: 'which',
    prompt: { sentence: 'Für ___ stehe ich Ihnen gerne zur Verfügung.', context: 'The standard closing offer of help.', options: ['Rückfragen', 'Rückblicke', 'Antworten'] },
    target: 'Rückfragen', note: '' },
  { id: id(), ...base, particle: 'Gerne', format: 'minimalPair',
    prompt: { without: 'Hier ist der Lebenslauf. Sagen Sie Bescheid, wenn Sie Fragen haben.',
      with: 'Gerne sende ich Ihnen in der Beilage den Lebenslauf. Für Rückfragen stehe ich Ihnen jederzeit zur Verfügung.' },
    target: 'Both are clear, but version 1 reads curt in Swiss business email. Version 2 uses the expected courtesy formulas without becoming stiff.',
    note: '' },
  { id: id(), ...base, particle: 'nachfassen', format: 'insert',
    prompt: { bare: 'Haben Sie meine E-Mail bekommen?', attitude: 'gently checking, assuming the best' },
    target: 'Ich wollte mich kurz vergewissern, ob meine E-Mail bei Ihnen angekommen ist.', note: '' },
];

export default {
  enabled: true,
  weight: 0.6,
  reference: REFERENCE,
  items: ITEMS,
  detectorHints: [],
};
