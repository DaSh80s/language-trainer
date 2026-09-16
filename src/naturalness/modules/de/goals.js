/**
 * German — goals for the soften drills.
 *
 * A soften drill used to show the clipped German and ask for a better version.
 * That handed over most of the answer's words and turned the task into
 * guessing the model rewording. Now the learner sees what they want to
 * achieve, in English, and who they are talking to — and has to produce the
 * German themselves. The clipped version is kept, but only shown afterwards,
 * as the thing to avoid.
 *
 * Keyed by item id. `blunt` is repeated here on purpose: the tests check it
 * still matches the item, so if items are reordered and ids shift, a goal
 * cannot silently attach to the wrong drill.
 *
 * Goals describe the intent without translating the key vocabulary — "find
 * out whether they're allowed to work in Switzerland", not "ask which
 * residence permit they have" — or the drill gives the answer away again.
 */
export default {
  // ── register ────────────────────────────────────────────────────────────
  'de-reg-01': { blunt: 'Schicken Sie mir das.', goal: 'Ask them to send you the document.', who: 'A client — a polite request, not an order.' },
  'de-reg-02': { blunt: 'Ich will das besprechen.', goal: 'Suggest that you talk it through.', who: 'A colleague — propose it, do not demand it.' },
  'de-reg-03': { blunt: 'Ich habe eine Frage.', goal: 'Say that you have a question.', who: 'In a meeting — deferentially.' },
  'de-reg-04': { blunt: 'Geht das?', goal: 'Ask whether that would be possible.', who: 'A client.' },
  'de-reg-05': { blunt: 'Ich sage, wir warten.', goal: 'Give your view that you should wait.', who: 'In a meeting — as an opinion, not a ruling.' },
  'de-reg-06': { blunt: 'Darf ich Sie unterbrechen?', goal: 'Ask whether you may interrupt for a moment.', who: 'A senior person — as deferentially as possible.' },
  'de-reg-07': { blunt: 'Können Sie das bis Freitag machen?', goal: 'Ask whether they could get it done by Friday.', who: 'A colleague — a request, not a test of whether they are able to.' },
  'de-reg-08': { blunt: 'Ich brauche das heute.', goal: 'Tell them you need it today.', who: 'A colleague — firm, but not an order.' },
  'de-reg-09': { blunt: 'Sie haben einen Fehler gemacht.', goal: 'Point out that something has gone wrong.', who: 'A client — without blaming anyone.' },
  'de-reg-10': { blunt: 'Du hast das vergessen.', goal: 'Point out that this was missed.', who: 'A colleague — without blaming them.' },
  'de-reg-11': { blunt: 'Sie haben mich falsch verstanden.', goal: 'Point out that there has been a misunderstanding.', who: 'A client — correct it without accusing them.' },
  'de-reg-12': { blunt: 'Das ist falsch.', goal: 'Disagree with what was just said.', who: 'A senior colleague, in a meeting.' },
  'de-reg-13': { blunt: 'Das funktioniert nicht.', goal: 'Say that you see a problem with the plan.', who: 'In a meeting — constructively.' },
  'de-reg-14': { blunt: 'Ich bin dagegen.', goal: 'Say that you are against it.', who: 'A colleague — leave room to be persuaded.' },
  'de-reg-15': { blunt: 'Das dauert drei Wochen.', goal: 'Estimate that it will take about three weeks.', who: 'A client — you cannot fully promise the number.' },
  'de-reg-16': { blunt: 'Das ist zu teuer.', goal: 'Say that it is too expensive.', who: 'A supplier — push back without sounding final.' },
  'de-reg-23': { blunt: 'Schick mir das mal.', goal: 'Ask them to send it over to you.', who: 'A client — formal.' },
  'de-reg-24': { blunt: 'Ich kann nicht.', goal: 'Decline — you cannot make it.', who: 'A colleague who invited you — casual.' },
  'de-reg-25': { blunt: 'Ich kann nicht.', goal: 'Turn down their request — it cannot be done.', who: 'A client — formal, without making it personal.' },
  'de-reg-26': { blunt: 'Nein.', goal: 'Reject the proposal.', who: 'In a meeting — without shutting the discussion down.' },
  // ── phone calls ─────────────────────────────────────────────────────────
  'de-calls-12': { blunt: 'Wer ist da?', goal: 'Ask who is calling.', who: 'An unknown caller on your work line — politely.' },
  'de-calls-13': { blunt: 'Was?', goal: 'Say that you did not catch what they said.', who: 'A client, on the phone.' },
  'de-calls-14': { blunt: 'Ich rufe Sie an.', goal: 'Promise to get back to them by Thursday at the latest.', who: 'A client, on the phone.' },
  // ── meetings ────────────────────────────────────────────────────────────
  'de-meet-11': { blunt: 'Warten Sie.', goal: 'Cut in on the discussion to make a point.', who: 'Someone speaking in a meeting — courteously.' },
  'de-meet-12': { blunt: 'Das bringt nichts.', goal: 'Question whether the idea really moves you forward.', who: 'In a meeting — constructively.' },
  'de-meet-13': { blunt: 'Wir machen es so.', goal: 'Record the decision, then check that everyone agrees.', who: 'You are chairing the meeting.' },
  // ── numbers & terms ─────────────────────────────────────────────────────
  'de-num-15': { blunt: 'Wie viel wollen Sie verdienen?', goal: 'Ask what salary they are looking for.', who: 'A candidate — professionally.' },
  'de-num-16': { blunt: 'Wann können Sie anfangen?', goal: 'Ask when they could start, bearing in mind their notice period.', who: 'A candidate — polished.' },
  // ── candidate calls ─────────────────────────────────────────────────────
  'de-cand-01': { blunt: 'Ist Zürich Ihnen lieb?', goal: 'Ask whether the Zurich area is where they would prefer to work.', who: 'A candidate — a complete question.' },
  'de-cand-02': { blunt: 'Stadt oder Kanton?', goal: 'Ask whether only the city of Zurich would work for them, or the whole canton too.', who: 'A candidate — a complete question.' },
  'de-cand-03': { blunt: 'Sind Sie offen für Interim?', goal: 'Ask whether they would also be open to an interim assignment.', who: 'An experienced candidate — polished.' },
  'de-cand-04': { blunt: 'Das wäre akzeptabel für Sie?', goal: 'Check whether that arrangement is something they could see themselves agreeing to.', who: 'A candidate — without sounding like a negotiation.' },
  'de-cand-05': { blunt: 'Ist Schweizerdeutsch okay für Sie?', goal: 'Find out how well they follow Swiss German at work.', who: 'A German candidate — tactfully, as an open question.' },
  'de-cand-06': { blunt: 'Warum wollen Sie weg?', goal: 'Ask what is making them want to change jobs.', who: 'A candidate — without implying something is wrong.' },
  'de-cand-07': { blunt: 'Haben Sie eine Arbeitserlaubnis?', goal: 'Find out whether they are allowed to live and work in Switzerland.', who: 'A non-Swiss candidate — the way Swiss recruiters ask it.' },
  // ── email ───────────────────────────────────────────────────────────────
  'de-mail-10': { blunt: 'Schicken Sie mir Ihren Lebenslauf.', goal: 'Ask them to send you their CV.', who: 'A candidate, by email — friendly and formal.' },
  'de-mail-11': { blunt: 'Sie haben nicht geantwortet.', goal: 'Follow up on the message you sent on Monday, which has had no reply.', who: 'A client, by email — no hint of reproach.' },
  'de-mail-12': { blunt: 'Ok, danke.', goal: 'Thank them for getting back to you.', who: 'A client, by email.' },
  'de-mail-13': { blunt: 'Wann haben Sie Zeit?', goal: 'Propose a meeting on Tuesday at 2 pm or Wednesday at 10 am.', who: 'A client, by email.' },
};
