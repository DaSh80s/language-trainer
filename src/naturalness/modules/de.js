/**
 * German naturalness module.
 *
 * Built out: `particles` (the first category, to full depth).
 * The other six are declared but empty — the UI shows coverage honestly
 * rather than pretending a thin module is complete.
 *
 * Register tags do real work: a mislabelled item actively teaches the wrong
 * thing. Items whose gloss is genuinely contested carry `confidence: 'review'`
 * so they can be checked by a speaker rather than trusted blindly.
 */

/** Reference content for the particles category — browsable teaching material. */
const PARTICLE_REFERENCE = [
  {
    particle: 'halt',
    sense: 'Resignation. "That is simply how it is, and nothing can be done about it."',
    note: 'Leans southern German, Austrian and Swiss, though now widely understood everywhere. Safe in professional speech.',
    confidence: 'review',
    pair: { without: 'Das ist so.', with: 'Das ist halt so.' },
  },
  {
    particle: 'eben',
    sense: 'The same resignation as halt, but more assertive — "exactly as I already said".',
    note: 'Leans northern. On its own, "Eben!" is a strong agreement token: that is precisely my point.',
    confidence: 'review',
    pair: { without: 'Das ist so.', with: 'Das ist eben so.' },
  },
  {
    particle: 'doch',
    sense: 'Pushes back against an expectation or an implied negative. Also warms up an imperative.',
    note: 'In a request it makes the request friendlier, not weaker: "Komm doch mit" is inviting, "Komm mit" is an order.',
    pair: { without: 'Das ist klar.', with: 'Das ist doch klar.' },
  },
  {
    particle: 'mal',
    sense: 'Makes something casual and low-stakes — the rough equivalent of English "just" or "for a sec".',
    note: 'The single most useful particle for sounding unstiff at work. Bare imperatives sound barked without it.',
    pair: { without: 'Warte.', with: 'Warte mal.' },
  },
  {
    particle: 'ja',
    sense: 'Appeals to shared knowledge — "as you know", "after all". Also marks mild surprise.',
    note: 'Nothing to do with ja meaning yes. Unstressed in this use.',
    pair: { without: 'Du weisst, wie das ist.', with: 'Du weisst ja, wie das ist.' },
  },
  {
    particle: 'schon',
    sense: 'Concessive: "admittedly / true enough, but…". Separately, a reassurance: it will be fine.',
    note: 'Distinct from schon meaning already. "Das wird schon" is pure reassurance.',
    pair: { without: 'Das stimmt, aber es ist teuer.', with: 'Das stimmt schon, aber es ist teuer.' },
  },
  {
    particle: 'wohl',
    sense: 'Probability — presumably, I assume, probably.',
    note: 'Useful professionally for hedging a claim you cannot fully stand behind.',
    pair: { without: 'Er ist schon weg.', with: 'Er ist wohl schon weg.' },
  },
  {
    particle: 'denn',
    sense: 'In questions only. Signals genuine interest and takes the edge off.',
    note: 'High value at work: a bare question can read as interrogation. "Wie sehen Sie das denn?" is collegial; "Wie sehen Sie das?" can sound like a challenge.',
    pair: { without: 'Wo ist das Problem?', with: 'Wo ist denn das Problem?' },
  },
  {
    particle: 'eigentlich',
    sense: 'Actually — a mild gap between what was expected and what is the case. Also a soft topic-change.',
    note: 'Softens disagreement neatly: "Ich bin eigentlich dagegen" is far gentler than "Ich bin dagegen".',
    pair: { without: 'Wollte ich früher gehen.', with: 'Eigentlich wollte ich früher gehen.' },
  },
  {
    particle: 'einfach',
    sense: 'Simply, just — dismisses complexity or excuse-making.',
    note: 'Often carries a shrug: the matter is more straightforward than the other person is making it.',
    pair: { without: 'Das geht nicht.', with: 'Das geht einfach nicht.' },
  },
  {
    particle: '— position —',
    sense: 'Particles sit in the Mittelfeld: after the finite verb and any pronouns, before the new information.',
    note: 'Ich habe ihm das halt gesagt. NOT: Ich habe halt ihm das gesagt. Getting the slot wrong is a common and very audible error.',
  },
  {
    particle: '— stacking —',
    sense: 'Particles combine, and the combinations are very native: doch mal, ja mal, halt eben, denn eigentlich.',
    note: 'Komm doch mal vorbei. Was ist denn eigentlich los? Stacking is rarely taught and instantly recognisable when done right.',
  },
];

let n = 0;
const id = (p) => `de-part-${p}-${String(++n).padStart(2, '0')}`;

/** @type {import('../contract.js').DrillItem[]} */
const PARTICLE_ITEMS = [
  // ── halt ────────────────────────────────────────────────────────────────
  { id: id('halt'), particle: 'halt', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: "That's just how it is." },
    target: 'Das ist halt so.', note: 'halt carries the whole "nothing to be done" shrug. Without it the sentence is merely factual.' },
  { id: id('halt'), particle: 'halt', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: "Then I'll just have to wait." },
    target: 'Dann muss ich halt warten.', note: 'English carries the resignation in "just have to"; German puts it in halt.' },
  { id: id('halt'), particle: 'halt', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Er ist neu.', attitude: 'explaining away a mistake — that accounts for it, no more to say' },
    target: 'Er ist halt neu.', note: 'Turns a bare fact into an excuse offered on behalf of somebody else.' },
  { id: id('halt'), particle: 'halt', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Wir müssen nochmal anfangen.', attitude: 'resigned — annoying, but there it is' },
    target: 'Wir müssen halt nochmal anfangen.', note: 'Very common in meetings when delivering unwelcome news you cannot change.' },
  { id: id('halt'), particle: 'halt', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das ist ___ so, da kann man nichts machen.', context: 'Pure resignation, not contradicting anyone.', options: ['halt', 'doch', 'ja'] },
    target: 'halt', note: 'doch would contradict an implied objection; ja would appeal to shared knowledge. Neither fits pure resignation.' },
  { id: id('halt'), particle: 'halt', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das kostet halt mehr.' },
    target: 'It simply costs more — that is the trade-off and there is no point arguing with it.', note: 'Not defensive, not apologetic. Just stating an unavoidable cost.' },

  // ── eben ────────────────────────────────────────────────────────────────
  { id: id('eben'), particle: 'eben', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Exactly — that is what I said.' },
    target: 'Eben.', note: 'One word does the whole job. A very native way to agree while claiming you got there first.' },
  { id: id('eben'), particle: 'eben', format: 'trapTranslation', register: 'colloquial', professionalSafe: true,
    prompt: { english: 'Fine, not then.' },
    target: 'Dann eben nicht.', note: 'Slightly huffy acceptance. Common and useful.' },
  { id: id('eben'), particle: 'eben', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Wir haben zu wenig Zeit.', attitude: 'confirming a point you already made and were not heard on' },
    target: 'Wir haben eben zu wenig Zeit.', note: 'eben reasserts; halt would merely shrug.' },
  { id: id('eben'), particle: 'eben', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Das ist der Punkt.', attitude: 'that is precisely what I have been getting at' },
    target: 'Das ist eben der Punkt.', note: 'Good for landing an argument in a meeting.' },
  { id: id('eben'), particle: 'eben', format: 'which', register: 'neutral', professionalSafe: true, confidence: 'review',
    prompt: { sentence: 'Das habe ich ___ gesagt.', context: 'You said it before, nobody listened, and you are pointedly repeating it.', options: ['eben', 'halt', 'wohl'] },
    target: 'eben', note: 'eben claims prior authorship of the point. halt would only shrug at it.' },
  { id: id('eben'), particle: 'eben', format: 'minimalPair', register: 'neutral', professionalSafe: true, confidence: 'review',
    prompt: { without: 'Das ist halt so.', with: 'Das ist eben so.' },
    target: 'Both are resigned, but eben is more assertive and points back to something already said; halt is a plain shrug. halt also leans southern and Swiss, eben more northern.',
    note: 'This distinction is genuinely contested among native speakers — worth checking against what you hear in Zurich.' },

  // ── doch ────────────────────────────────────────────────────────────────
  { id: id('doch'), particle: 'doch', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'But that is obvious, surely.' },
    target: 'Das ist doch klar.', note: 'doch does the work of both "but" and "surely" here.' },
  { id: id('doch'), particle: 'doch', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Do come along.' },
    target: 'Komm doch mit.', note: 'Without doch it is an instruction. With it, an invitation.' },
  { id: id('doch'), particle: 'doch', format: 'insert', register: 'formal', professionalSafe: true,
    prompt: { bare: 'Setzen Sie sich.', attitude: 'warm and inviting rather than instructing' },
    target: 'Setzen Sie sich doch.', note: 'Standard hospitality register. The bare form is close to a command.' },
  { id: id('doch'), particle: 'doch', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Das weisst du.', attitude: 'reminding someone of something they already know' },
    target: 'Das weisst du doch.', note: 'Mild, not accusatory — but tone matters.' },
  { id: id('doch'), particle: 'doch', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Ich habe ___ gesagt, dass das nicht geht.', context: 'Pushing back against the implication that you never mentioned it.', options: ['doch', 'mal', 'wohl'] },
    target: 'doch', note: 'doch contradicts the implied "you did not say".' },
  { id: id('doch'), particle: 'doch', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das ist doch nicht so schlimm.' },
    target: 'Come on, it is not that bad — pushing back against the other person treating it as serious.', note: 'Reassuring and mildly dismissive at once.' },

  // ── mal ─────────────────────────────────────────────────────────────────
  { id: id('mal'), particle: 'mal', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Could you just help me for a second?' },
    target: 'Kannst du mal kurz helfen?', note: 'mal plus kurz is the standard way to make a small ask small.' },
  { id: id('mal'), particle: 'mal', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: "I'll have a look." },
    target: 'Ich schau mal.', note: 'Without mal it sounds like a formal undertaking rather than a casual glance.' },
  { id: id('mal'), particle: 'mal', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Warte.', attitude: 'friendly, not barked' },
    target: 'Warte mal.', note: 'The clearest single illustration of what mal does to an imperative.' },
  { id: id('mal'), particle: 'mal', format: 'insert', register: 'formal', professionalSafe: true,
    prompt: { bare: 'Zeigen Sie mir das.', attitude: 'a light request rather than an instruction' },
    target: 'Zeigen Sie mir das mal.', note: 'Works with Sie as well as du — mal is not informality, it is low stakes.' },
  { id: id('mal'), particle: 'mal', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Schauen wir ___, was passiert.', context: 'Let us see what happens — provisional, no commitment.', options: ['mal', 'schon', 'ja'] },
    target: 'mal', note: '"Schauen wir mal" is close to a fixed expression.' },
  { id: id('mal'), particle: 'mal', format: 'reverseGloss', register: 'colloquial', professionalSafe: true,
    prompt: { sentence: 'Hör mal, das sehe ich anders.' },
    target: 'Look, I see that differently — softening the run-up to a disagreement.', note: 'Buys a moment and signals that disagreement is coming without hostility.' },

  // ── ja ──────────────────────────────────────────────────────────────────
  { id: id('ja'), particle: 'ja', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'You know how it is.' },
    target: 'Du weisst ja, wie das ist.', note: 'Unstressed ja. Nothing to do with yes.' },
  { id: id('ja'), particle: 'ja', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Well that IS interesting.' },
    target: 'Das ist ja interessant.', note: 'Mild surprise. English does it with stress; German does it with ja.' },
  { id: id('ja'), particle: 'ja', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Das haben wir schon besprochen.', attitude: 'as you will recall — appealing to shared memory, not scolding' },
    target: 'Das haben wir ja schon besprochen.', note: 'Without ja this can land as a rebuke in a meeting.' },
  { id: id('ja'), particle: 'ja', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Das ist nicht neu.', attitude: 'we both already know this' },
    target: 'Das ist ja nicht neu.', note: 'Builds common ground rather than scoring a point.' },
  { id: id('ja'), particle: 'ja', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Du kennst ihn ___.', context: 'Appealing to what the listener already knows about him.', options: ['ja', 'doch', 'wohl'] },
    target: 'ja', note: 'doch would push back against a denial; wohl would hedge. ja simply invokes shared knowledge.' },
  { id: id('ja'), particle: 'ja', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das war ja klar.' },
    target: 'Well, that was predictable — a knowing, slightly weary "we all saw that coming".', note: 'Very common reaction to an unsurprising setback.' },

  // ── schon ───────────────────────────────────────────────────────────────
  { id: id('schon'), particle: 'schon', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'That is true enough, but it is expensive.' },
    target: 'Das stimmt schon, aber es ist teuer.', note: 'The classic concessive. Grants the point before turning it.' },
  { id: id('schon'), particle: 'schon', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'It will be fine.' },
    target: 'Das wird schon.', note: 'Complete sentence as it stands. Nothing needs to follow.' },
  { id: id('schon'), particle: 'schon', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Das ist möglich.', attitude: 'conceding it is plausible, with a but coming' },
    target: 'Das ist schon möglich.', note: 'Signals the concession before you make it — good meeting habit.' },
  { id: id('schon'), particle: 'schon', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Ich verstehe das.', attitude: 'I do understand, grudgingly — and yet' },
    target: 'Ich verstehe das schon.', note: 'Grants understanding without granting agreement.' },
  { id: id('schon'), particle: 'schon', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das schaffen wir ___.', context: 'Reassuring the team that it will work out.', options: ['schon', 'halt', 'eben'] },
    target: 'schon', note: 'The reassurance use. halt or eben would make it resigned instead of encouraging.' },
  { id: id('schon'), particle: 'schon', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'Das stimmt, aber…', with: 'Das stimmt schon, aber…' },
    target: 'Both concede, but schon makes the concession explicit and warmer — it signals you have genuinely weighed the point before disagreeing.', note: 'Worth making a habit: it buys goodwill cheaply.' },

  // ── wohl ────────────────────────────────────────────────────────────────
  { id: id('wohl'), particle: 'wohl', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'He has probably already left.' },
    target: 'Er ist wohl schon weg.', note: 'wohl is the hedge; schon here means already, not the particle.' },
  { id: id('wohl'), particle: 'wohl', format: 'trapTranslation', register: 'formal', professionalSafe: true,
    prompt: { english: 'That was presumably a misunderstanding.' },
    target: 'Das war wohl ein Missverständnis.', note: 'A useful, face-saving way to name a problem without assigning blame.' },
  { id: id('wohl'), particle: 'wohl', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Sie hat es vergessen.', attitude: 'you assume so but do not know' },
    target: 'Sie hat es wohl vergessen.', note: 'Without wohl you are asserting it as fact, which can sound like an accusation.' },
  { id: id('wohl'), particle: 'wohl', format: 'insert', register: 'formal', professionalSafe: true,
    prompt: { bare: 'Das wird teurer.', attitude: 'presumably, hedged — you are not certain' },
    target: 'Das wird wohl teurer.', note: 'Good for flagging a risk without committing to a number.' },
  { id: id('wohl'), particle: 'wohl', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Da haben wir ___ ein Problem.', context: 'Acknowledging a problem, hedged and understated.', options: ['wohl', 'ja', 'einfach'] },
    target: 'wohl', note: 'Understated acknowledgement. einfach would be blunt; ja would assume shared knowledge.' },
  { id: id('wohl'), particle: 'wohl', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das muss wohl so sein.' },
    target: 'I suppose that must be how it is — reluctant acceptance of a conclusion you cannot verify.', note: 'Hedged resignation, distinct from the flat resignation of halt.' },

  // ── denn ────────────────────────────────────────────────────────────────
  { id: id('denn'), particle: 'denn', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'So where is the problem?' },
    target: 'Wo ist denn das Problem?', note: 'Without denn this can read as a challenge.' },
  { id: id('denn'), particle: 'denn', format: 'trapTranslation', register: 'formal', professionalSafe: true,
    prompt: { english: 'And how do you see it?', extra: 'Use Sie. You are genuinely curious, not testing them.' },
    target: 'Wie sehen Sie das denn?', note: 'High-value at work. The bare question can sound like an interrogation.' },
  { id: id('denn'), particle: 'denn', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Was machst du?', attitude: 'genuine curiosity, not suspicion' },
    target: 'Was machst du denn?', note: 'Tone changes completely. Bare questions in German are blunter than English ones.' },
  { id: id('denn'), particle: 'denn', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Wann fängt das an?', attitude: 'lightly asking, not demanding' },
    target: 'Wann fängt das denn an?', note: 'Note the slot: denn sits before the new information.' },
  { id: id('denn'), particle: 'denn', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Was ist ___ los?', context: 'What is going on? — concerned rather than demanding.', options: ['denn', 'halt', 'schon'] },
    target: 'denn', note: '"Was ist denn los?" is close to fixed. The bare form sounds sharp.' },
  { id: id('denn'), particle: 'denn', format: 'minimalPair', register: 'neutral', professionalSafe: true,
    prompt: { without: 'Warum haben Sie das gemacht?', with: 'Warum haben Sie das denn gemacht?' },
    target: 'The bare question is close to an accusation; denn turns it into genuine enquiry. In a work conversation the difference is significant.',
    note: 'If you drill one denn item, drill this one.' },

  // ── eigentlich ──────────────────────────────────────────────────────────
  { id: id('eig'), particle: 'eigentlich', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'I had actually meant to leave earlier.' },
    target: 'Eigentlich wollte ich früher gehen.', note: 'Fronted here. eigentlich moves around more freely than most particles.' },
  { id: id('eig'), particle: 'eigentlich', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'What is happening with the budget, actually?' },
    target: 'Was ist eigentlich mit dem Budget?', note: 'The soft topic-change use — raising something slightly off-agenda.' },
  { id: id('eig'), particle: 'eigentlich', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Ich bin dagegen.', attitude: 'softening a disagreement so it does not land as a wall' },
    target: 'Ich bin eigentlich dagegen.', note: 'Leaves the door open. Useful when you may yet be persuaded.' },
  { id: id('eig'), particle: 'eigentlich', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Das ist eine gute Idee.', attitude: 'mild surprise — better than you first expected' },
    target: 'Das ist eigentlich eine gute Idee.', note: 'Careful: it can read as faint praise. Tone carries it.' },
  { id: id('eig'), particle: 'eigentlich', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Wie lange dauert das ___?', context: 'Raising a question that is slightly aside from the main topic.', options: ['eigentlich', 'denn', 'wohl'] },
    target: 'eigentlich', note: 'denn would also work but marks curiosity; eigentlich marks the shift of topic.' },
  { id: id('eig'), particle: 'eigentlich', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Eigentlich schon.' },
    target: 'Well, yes, basically — agreement with a small reservation left unstated.', note: 'Two words carrying a whole hedged yes.' },

  // ── einfach ─────────────────────────────────────────────────────────────
  { id: id('einf'), particle: 'einfach', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'That simply will not work.' },
    target: 'Das geht einfach nicht.', note: 'Firm without being aggressive. Closes a line of discussion.' },
  { id: id('einf'), particle: 'einfach', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Just let me know.' },
    target: 'Sag einfach Bescheid.', note: 'Bescheid sagen is itself a collocation worth knowing.' },
  { id: id('einf'), particle: 'einfach', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Wir machen das morgen.', attitude: 'no fuss, the obvious solution' },
    target: 'Wir machen das einfach morgen.', note: 'Deflates a problem someone is overcomplicating.' },
  { id: id('einf'), particle: 'einfach', format: 'insert', register: 'neutral', professionalSafe: true,
    prompt: { bare: 'Ich habe es vergessen.', attitude: 'plainly, without excuse-making' },
    target: 'Ich habe es einfach vergessen.', note: 'Owning it flatly often lands better than an elaborate excuse.' },
  { id: id('einf'), particle: 'einfach', format: 'which', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Probier es ___ aus.', context: 'Just give it a go — encouraging, low stakes.', options: ['einfach', 'wohl', 'eben'] },
    target: 'einfach', note: 'mal would also work here and the two often stack: "Probier es einfach mal aus."' },
  { id: id('einf'), particle: 'einfach', format: 'reverseGloss', register: 'neutral', professionalSafe: true,
    prompt: { sentence: 'Das ist einfach so.' },
    target: 'That is simply the case — flatter and blunter than "Das ist halt so", with less of a shrug.', note: 'Compare with halt: einfach dismisses, halt resigns.' },

  // ── stacking ────────────────────────────────────────────────────────────
  { id: id('stack'), particle: 'doch mal', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'Do drop by some time.' },
    target: 'Komm doch mal vorbei.', note: 'doch invites, mal keeps it low-stakes. The pair is extremely common.' },
  { id: id('stack'), particle: 'denn eigentlich', format: 'trapTranslation', register: 'neutral', professionalSafe: true,
    prompt: { english: 'So what is actually going on?' },
    target: 'Was ist denn eigentlich los?', note: 'Stacked particles are a strong native marker and rarely taught.' },
];

/** @type {import('../contract.js').LanguageModule} */
const de = {
  code: 'de',
  label: 'German',
  variants: [{ id: 'ch', label: 'Swiss Standard German' }],
  categories: {
    particles: {
      enabled: true,
      weight: 1.0,
      reference: PARTICLE_REFERENCE,
      items: PARTICLE_ITEMS,
      detectorHints: [{
        guidance:
          'Modal particles (halt, eben, doch, mal, ja, schon, wohl, denn, eigentlich, einfach) carry attitude rather than content. ' +
          'Flag a turn only where a native speaker would clearly have used one and the learner produced a grammatically perfect but flat sentence. ' +
          'Never flag the mere absence of a particle in a sentence that is fine without one.',
        positiveExamples: ['Das ist halt so.', 'Kannst du mal kurz helfen?', 'Wie sehen Sie das denn?'],
        negativeExamples: ['Das ist so.', 'Kannst du kurz helfen?'],
      }],
    },
    reactions: { enabled: false, weight: 0.9, items: [], detectorHints: [] },
    discourse: { enabled: false, weight: 0.8, items: [], detectorHints: [] },
    register: { enabled: false, weight: 0.8, items: [], detectorHints: [] },
    repair: { enabled: false, weight: 0.7, items: [], detectorHints: [] },
    collocations: { enabled: false, weight: 0.7, items: [], detectorHints: [] },
    interference: { enabled: false, weight: 0.9, items: [], detectorHints: [] },
  },
};

export default de;
