# Naturalness Layer — build plan

Status: **steps 1-4 built and live** (2026-09-12). Particles drilling works end to end; the
remaining categories are declared but empty, and the ride-along detector and voice are still to come.

A second pillar alongside the grammar drilling, targeting what separates *correct* German
from *native-sounding* German. This plan is a revision of the original spec, narrowed after
working out how Fluo is actually used.

---

## What changed from the original spec, and why

The spec was written without knowing the usage pattern. Four things moved:

**1. It is a drill mode, not a passive watcher.**
The spec's centrepiece was a "Naturalness Pass" running silently on free-conversation turns.
But practice here happens in the *structured* modes (Grammar, Verb Drill, Article Gender),
not free chat — so a passive observer would collect almost nothing.

This turned out to be a better design anyway. A designed prompt is a far sharper probe than
passive listening: to find out whether *mir ist langweilig* is reachable, hand over "I'm bored"
to translate and know in one turn, rather than waiting weeks for it to arise naturally. It is
much more sample-efficient, which matters for burst rather than daily practice.

The passive detector still gets built — it rides along in the other modes later (step 6).

**2. Seven categories, not thirteen.**
The target is **professional spoken German** (meetings, calls, clients). That prunes hard:

| Keep | Why |
|---|---|
| `particles` | Densest single marker of native spoken German. The classic C2 gap. |
| `reactions` | Sounding like a participant in a meeting, not a lecturer. |
| `discourse` | Signposting, turn structure, opening and closing. |
| `register` | Konjunktiv II softening, du/Sie, Swiss professional formality. |
| `repair` | Self-rescue mid-sentence. The real-time survival skill. |
| `collocations` | *eine Entscheidung treffen*, not *machen*. High business yield. |
| `interference` | The English-speaker traps. Flagship: the impersonal dative family. |

| Cut or deferred | Why |
|---|---|
| `idioms` | In a client meeting a slightly-off idiom is worse than none. |
| `culture` | Swiss *formality* is in scope (under `register`); *Velo*/*Znüni* vocabulary and humour are not. |
| `spokenForm` | Inverts to **recognition only** — understand `haste`/`ham` at speed, never produce them at a client. Different drill, later. |
| `wordFormation` | Separable-prefix grid is real work but reads as grammar, which is already well covered. |
| `wordFields`, `governedForms` | Useful, not distinguishing for this goal. |

**3. Text first, voice as a scoped follow-on.**
Two constraints locked in now so voice slots in without a rewrite: answer checking is
**model-based, never string matching** (speech recognition returns messy unpunctuated text),
and `audioHint` stays in the schema from day one though nothing reads it yet.
Voice, when it comes, is the browser's own `SpeechRecognition` / `speechSynthesis` — free,
client-side, German and Swiss German voices, no API cost, no new dependency.

**4. Plain JS with JSDoc typedefs, not TypeScript.**
The spec is written in TS. Adding a TS toolchain to a single-file Vite app whose build is
already fragile on Node 25 buys documentation we can get from JSDoc at zero setup cost and
zero new build risk. The module contract stays explicit and checkable; it just isn't compiled.
Revisit if a second language module makes the contract hard to hold by hand.

---

## Scoring — two numbers, never one

The spec's "ratio of positive to negative findings" fails three ways: thin categories produce
nonsense (one positive, no negatives reads as 100%), the category weight gets multiplied into
a per-category score where it does not belong, and — the serious one — **it rewards avoidance**.

Negatives only exist when you attempt something. Nobody is flagged for the *halt* they didn't
say. So the fastest way to improve a ratio-based score is to stop trying: short sentences, safe
verbs, certain structures. The score climbs, the German flatlines. That is the standard way
advanced learners plateau, and it is invisible to any metric that only counts errors.

So the dashboard leads with **reach** and treats hit rate as secondary. At C2 the hit rate is
probably already fine nearly everywhere — the gap is not using *eben* wrongly, it is not using
it at all.

### Reach
Of the opportunities where the category was natural, how often was it taken.

In a drill the denominator is **known and designed** — the item was built as an opportunity —
so this is a clean count, not a model judgement: *"20 openings for a particle, you used one in 6."*
(In the later ride-along detector, where opportunity can't be known, fall back to raw frequency
per 100 turns rather than asking the model to judge what was possible.)

### Hit rate
When attempted, how often it landed naturally:

```
hit rate = 100 × (positives + k × 0.5) / (positives + weighted negatives + k),  k = 5
```

- `k = 5` is a pseudo-count: every category behaves as if it began with five neutral
  observations, so thin data sits near 50 and moves only as real evidence arrives.
- Negatives weighted by severity: nitpick 0.3, noticeable 1.0, clearly-foreign 2.0.
- Rolling window: last 300 turns in that language, so it reflects now.
- Below ~8 observations show "not enough yet", not a number.
- Always print the observation count beside the score.
- Category weight applies only to the cross-category roll-up, never inside a category's score.

| positives | negatives | score | reads as |
|---|---|---|---|
| 0 | 0 | 50 | no data, neutral |
| 1 | 0 | 58 | one good sign, barely moves |
| 0 | 3 (noticeable) | 31 | bad, not 0 on three points |
| 20 | 5 (noticeable) | 75 | earned |

Thirteen-spoke radar is unreadable — use a bar list sorted by gap.

---

## First category: particles, to full depth

Ten: `halt`, `eben`, `doch`, `mal`, `ja`, `schon`, `wohl`, `denn`, `eigentlich`, `einfach`.

Target ~60 items. Each particle needs: a one-line plain-English sense, minimal pairs, the
**midfield position rule** (after the finite verb and pronouns, before the new information —
learners routinely get this wrong), a professional-safe flag, and common **stacks**
(*doch mal*, *ja mal*, *halt eben*), which are very native and rarely taught.

### Five drill formats

1. **Minimal pair recognition** — two versions, what changes? Cheap way in to a new particle.
2. **Insert the particle** — bare sentence plus a target attitude ("as though it's obvious and
   nothing can be done about it") → produce the particle version. The core production drill.
3. **Which particle** — sentence plus context, choose among 2–3. Tests *halt* vs *eben* vs *einfach*.
4. **Reverse gloss** — given a particle sentence, say what attitude it carries. Comprehension.
5. **Trap translation** — an English sentence whose natural German wants a particle. English
   has no particle, so a literal translation omits it. **This is the reach probe** and the
   format that makes the reach metric honest.

### Known risk, flagged honestly
Particle glosses are genuinely hard and models get them subtly wrong. *halt* vs *eben* is
contested among native speakers and carries a north/south split — *halt* is more southern and
Swiss, *eben* more northern — which matters directly in Zurich. Low-confidence glosses will be
marked for review rather than presented as settled.

---

## Build order

1. **Scaffolding.** Category ids, module contract (JSDoc), storage keys, `naturalness` entry in
   the `modes` array, empty dashboard section. No content — proves the wiring.
2. **Particles module.** ~60 items across the ten particles, five drill formats.
3. **Drill engine.** Serve and rotate items, judge answers via the model, log findings.
4. **Scoring and dashboard.** Reach and hit rate as above, particles only.
5. **Use it, then tune.** Real sessions before any more content gets written.
6. **Second category** (`reactions`) — validates the contract is genuinely language- and
   category-agnostic. Then the ride-along detector in other modes. Then voice.

Content for the remaining categories gets written only after step 5 says where the gap is.

---

## Technical notes

- **Model:** judging naturalness is much harder than tutoring — run it on `claude-sonnet-5`,
  not Haiku. At roughly 1,500 input / 250 output tokens per call the difference is about
  $2.50 vs $5.00 a month at daily use. Do not economise here.
- No proxy change needed: `api/chat.js` forwards `req.body` untouched and the client already
  picks the model per call.
- Use **structured outputs** (`output_config: {format: {...}}`) for the finding schema rather
  than parsing JSON out of prose.
- **Prompt caching: measured, does not currently apply.** The judge system prompt is stable and
  carries `cache_control`, but at ~400 tokens it sits below the model's minimum cacheable prefix,
  so live calls return `cache_read_input_tokens: 0`. Harmless, and it will start paying off on its
  own if the prompt grows as more categories land. Not worth padding the prompt to force: measured
  cost is ~$0.0025 per judged answer (861 in / 71 out on Sonnet 5), so caching would save
  fractions of a cent.
- Set `thinking` deliberately: Sonnet 5 runs adaptive thinking when the parameter is omitted,
  which quietly adds output tokens to what should be a cheap call. `effort: "low"` is likely right.
- **Storage:** `naturalness-<Language>` for findings, `naturalness-progress-<Language>` for
  item scheduling. Kept separate from `errors-<Language>` at the data layer. Dedupe and cap —
  findings ride along in the existing backup export and will otherwise bloat it.
- **Bundle:** load language modules with dynamic `import()` so Vite code-splits them. Language
  is chosen at session setup, which is a natural boundary. Content must not reach first paint.
- **Clean up on landing:** `src/App.jsx:351` (the conversation prompt) already asks the tutor for
  "✓ 1-2 alternatives", a crude naturalness upgrade. Once this layer exists the two will
  duplicate and sometimes contradict on the same screen. That instruction comes out.
