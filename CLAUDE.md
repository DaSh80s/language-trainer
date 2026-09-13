# D's Language Trainer

An AI-powered language practice app built with React + Vite, deployed on Vercel, backed up on GitHub.

## Current Status
_Update this section at the end of each session so any device can pick up where you left off._

- **App state:** Live and working at https://language-trainer-kappa.vercel.app
- **Last worked on:** Built the **Naturalness Layer** (2026-09-12) — a second pillar beside the grammar drilling, targeting what separates *correct* German from *native-sounding* German. Ships as a new **Naturalness** practice mode plus its own dashboard section. First category built to depth: **modal particles** (halt, eben, doch, mal, ja, schon, wohl, denn, eigentlich, einfach), 62 drill items across five formats. Content lives in `src/naturalness/` and loads via dynamic `import()` so it never reaches first paint. Drill presentation is built deterministically from the content module (no API call); only the *judging* is model-driven, on `claude-sonnet-5` with structured outputs — judging naturalness is a much harder task than tutoring and Haiku is not good enough for it. Scoring deliberately leads with **reach** (of the openings that were there, how many you took) rather than a positive/negative ratio, because a ratio rewards avoidance: nobody is ever flagged for the particle they did not use. Hit rate is secondary, shrunk toward 50 with a pseudo-count so thin data cannot produce a flattering number, and weighted by severity. Full reasoning and the build order in `NATURALNESS.md`.
- **Then completed the layer the same day (2026-09-12):** all **seven categories** built — 245 items (particles 62, interference 41, collocations 37, reactions 28, discourse 28, register 28, repair 21), one file each under `src/naturalness/modules/de/`. Two new drill formats: `react` (respond to a line in one to three words) and `soften` (restate at a named politeness level). Repair items are **time-pressured** — they carry `timeLimitSec`, the UI shows a countdown, and the elapsed time reaches the judge, because a repair formula you have thirty seconds to compose is not a repair. Added the **ride-along detector** (`src/naturalness/detector.js`): one call per turn in the *ordinary* practice modes, fired in parallel with the tutor so it adds no waiting, with all seven categories' hints in a single cached prompt. It records positives as well as negatives, caps findings at three (enforced on parse, not just asked for), and stays silent on outright grammatical errors so it never double-reports against the grammar engine. Toggleable in the rail. Free-text findings are stored with `probedReach: false` so they feed the hit rate but can never corrupt reach — only a designed drill knows what the opening was. Added **voice** (`src/voice.js`) on the browser's own Web Speech API: a mic button dictates answers, a ♪ button speaks any tutor message; free, client-side, no dependency, hidden where the browser lacks support.
- **Polish pass (2026-09-12), from testing it as a user would:** typing **`hint`** in a Naturalness drill now gives a nudge — free and local, no API call, in two levels. Level one names the *device* the item wants ("a modal particle", "the conventional verb for that noun") without saying which, because that is the actual difficulty; level two reveals the opening words or eliminates a wrong option. Verified across all 245 items that neither level ever contains the full answer. Typing **`skip`** passes on an item and **logs it as an opening not taken** — skipping silently would let you inflate the reach score by avoiding the hard ones, which is the exact avoidance the metric exists to catch. Drill items show their category when more than one is selected; the rail shows openings taken this session; the footer now only promises what exists per mode. Note: `hint` had been advertised in the footer since long before this work but was **never implemented anywhere** — in Naturalness it was being judged as a German answer and logged as a miss.
- **Second test pass (2026-09-12), edge cases:** ending a Naturalness session used to call the tutor for a generic `X/6.00` ALTE grade — and `getSystemPrompt()` has no `naturalness` entry, so that request went out with an **empty system prompt**. A six-point German grade on a drill transcript is meaningless and competes with the naturalness score, so it is now a **local summary** computed from what happened (openings taken, attempts that landed, per-category breakdown) and costs nothing. Deselecting every category used to produce the self-contradictory "There is no naturalness content for German. German is the only module built so far"; the two cases (no module for this language / no categories picked) are now distinguished, Start is disabled outright when a language that *has* content has nothing selected, and a dead-end start no longer bumps the streak or writes a phantom history entry. Dark mode was checked by contrast ratio rather than by eye: the polish panel reads 8.44 in dark and 7.36 in light, both well past the 4.5 needed.
- **Third test pass (2026-09-13), voice and rendering:** voice is no longer unverified — spying on the Web Speech APIs confirmed `speechSynthesis.speak` fires with `lang: de-DE` at rate 0.95 and the mic starts recognition with `de-DE`/interim results. That exposed two defects. The ♪ button read the **whole message aloud**, so a German voice pronounced "Reactions React to this in German one to three words" before reaching any German; drill, feedback and skip messages now carry the German explicitly (`msg.speak`) and the button speaks only that. Where there is no German to speak the button is **hidden** — a `trapTranslation` shows English and its German *is* the answer, and `which` is a gapped sentence of underscores. And `getVoices()` is empty until the browser loads voices, so the first press used the default (usually English) voice; `speak()` now waits for `voiceschanged` with a timeout and a double-speak guard. Separately, `renderMarkdown` had **no single-asterisk italic rule**, so `*Reactions*` rendered with literal asterisks — as the tutor's own `*meiner Mutter*` always had; added, with tests confirming bold still survives. Also verified: the ride-along toggle genuinely suppresses the call (one turn with it off produced **exactly one** request, the Haiku tutor, and no polish panel).
- **Previously:** Added **Verb Drill** mode (2026-08-31) — a ninth practice mode for committing specific verbs to memory. You type the verbs you want to drill into a box in the Practice setup rail (comma or newline separated); they are saved per language in `localStorage['verbs-<Language>']` and shown as removable chips. The app rotates through the list deterministically (a `verbCursor` in state, injected into the system prompt as the FOCUS VERB) so every verb gets even coverage instead of the model favouring a few. Each exercise is one English sentence to translate, with the tense and person named in brackets, and the feedback spells out infinitive -> conjugated form plus any irregular/separable/reflexive/case quirk. Wrong answers offer "Drill this verb again? (Y/N)" — Y keeps the same verb with a new tense/person, N advances. Leaving the box empty makes the model pick 8 useful verbs for the level.
- **Previously:** Shipped the **Fluo redesign** (2026-06-28) — full visual overhaul to the warm editorial "Fluo" design system: CSS-variable theming with a working light (terracotta) / dark (fluo-lime) toggle persisted to `localStorage['lt_theme']`, Spectral + IBM Plex Sans/Mono fonts, new header + segmented tabs, two-column Practice screen (setup rail + chronological tutor chat with a thin mode/level context strip + docked answer bar), card-based Vocabulary grid, and a Progress dashboard with a weekly-activity chart. All existing logic (API, conversation/drill flow, streak, vocab & error storage) was preserved — this was a reskin, not a rewrite. Name kept as **Fluo**; default theme is **light**.
- **Also in this repo (2026-08-29):** `weekly-review/` — a scheduled generator that fills the Notion **Weekly review** page (fitness/nutrition, year & week progress, next week's meetings, next week's tasks). It replaces the four Notion custom AI blocks, which could not fetch URLs, could not see Notion Calendar, and did not run on duplication. Code computes every number from the Notion API; a free model (Gemini → Groq → Cloudflare, with a deterministic fallback) writes only the prose. Maintenance calories are read live from the Notion note, never hardcoded. Runs from `.github/workflows/weekly-review.yml` each Saturday. See `weekly-review/README.md`.
- **In progress:** Nothing — the Naturalness Layer is complete. The only open item is *use it*: drill for a while and see where the gap actually is. Five items across particles and register carry `confidence: 'review'` and show a ⚠️ in the app, because their glosses are genuinely contested among native speakers (halt vs eben, and the Swiss written forms) — worth checking those against what you hear in Zurich and telling Claude to correct them.
- **Previously in progress:** The weekly-review generator ran live on 2026-08-29 and filled all four toggles of the 29 August review page. Config is verified against the real workspace (Food Diary, Notes, All tasks, Journals). Optional next steps: add `GEMINI_API_KEY` / `GROQ_API_KEY` / `CLOUDFLARE_*` secrets for nicer prose, and `ICS_FEEDS` to enable the meetings section.
- **Next ideas:**
  - Mobile: collapse the Practice setup rail into a chip + bottom-sheet (currently it just stacks above the chat on narrow screens).
  - Vocab cards show a POS tag (Noun/Verb) only when derivable — the data model has no part-of-speech field yet; add one if we want reliable Noun/Verb filter chips.
  - iPad landscape layout (handoff only covered portrait).
  - Weekly review: delete the four old AI blocks from the Notion template now that the generator fills those toggles; set the Eisenhower field on real tasks so the "big three" is meaningful.

## Practice Modes
| Mode | Description |
|---|---|
| Conversation | Free chat in the target language |
| Grammar | Translate English sentences; drill on mistakes |
| Vocabulary | Learn 5 new words with IPA + examples |
| Translation | Bidirectional translation drills |
| **Article Gender** | App gives a bare noun → user types the article; tips & rules provided |
| **Verb Drill** | You supply the verbs; app rotates through them with translate-this-sentence drills, varying tense & person |
| **Naturalness** | Drills what is grammatical but not native. All seven categories built: particles, interference, collocations, reactions, discourse, register, repair (245 items) |
| Listening | Scenario-based comprehension questions |
| Pronunciation | IPA breakdowns and sound practice |
| Weak Areas | Targeted practice based on logged errors |

## Live URL
https://language-trainer-kappa.vercel.app

## GitHub
https://github.com/DaSh80s/language-trainer

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + lucide-react icons. The Fluo UI is built with inline styles driven by **CSS custom properties** (theme tokens defined in `LIGHT_VARS`/`DARK_VARS` at the top of `src/App.jsx`); Tailwind is still present but barely used now. Fonts (Spectral, IBM Plex Sans, IBM Plex Mono) are loaded from Google Fonts in `index.html`. Responsive breakpoints live in `src/index.css` (`.fluo-*` classes).
- **API Proxy:** Vercel serverless function (`api/chat.js`) — keeps the Anthropic API key server-side
- **Deployment:** Vercel (auto-deploys from GitHub pushes to `main`)
- **Local dev:** `npm run dev` (uses `vercel dev` to emulate serverless functions)

## Key Files
- `src/App.jsx` — the entire app (single React component: `LanguagePracticeApp`)
- `src/naturalness/` — the Naturalness Layer. `categories.js` (the seven categories + drill formats), `contract.js` (the language-module contract, JSDoc not TypeScript — see NATURALNESS.md), `scoring.js` (reach + hit rate), `drillEngine.js` (scheduling, presentation, the judge request), `detector.js` (the ride-along pass for the ordinary modes), `modules/de.js` (assembles the German module from `modules/de/*.js`, one file per category). UI rendering stays in `App.jsx`; only pure logic and content live here
- `src/voice.js` — speech recognition and synthesis via the browser's Web Speech API. No dependency, no API cost
- `NATURALNESS.md` — the build plan and the reasoning behind the scoring
- `weekly-review/` — the Notion weekly-review generator (independent of the language app; no shared code or dependencies)
- `api/chat.js` — Vercel serverless function that proxies Anthropic API calls
- `.env` — local environment variables (gitignored)
- `.env.example` — template showing required env vars

## Environment Variables
| Variable | Where |
|---|---|
| `ANTHROPIC_API_KEY` | `.env` locally, Vercel dashboard in production |
| `VITE_APP_PASSWORD` | `.env` locally, Vercel dashboard in production — this is the password on the live site's gate |

> **Forgotten the site password?** It is never written into this repo (the repo is **public**). Read it from **Vercel → project → Settings → Environment Variables** — *not* from the local `.env`, which has drifted out of date and does **not** match the live site. `VITE_*` vars are inlined at build time, so the live gate uses whatever Vercel built with. Claude also keeps the current value in Daniel's private memory, so just asking "what's the Fluo password?" in any session works. Once entered, the browser caches it in `localStorage['lt_auth']`, so only a new device or a cleared browser asks again.
>
> **The gate is cosmetic, not security.** Because the password is inlined at build time it is readable in plain text in the public JS bundle by anyone who looks. It keeps casual visitors out and nothing more. Never put anything genuinely sensitive in a `VITE_` var — secrets belong server-side in `api/chat.js`, which is why the Anthropic key is proxied there.

The Anthropic API key lives in **platform.claude.com** → Dan's Individual Org → Default workspace.

## Running Locally
```bash
export PATH="$HOME/local/bin:$PATH"  # Node.js is installed to ~/local
npm run dev   # starts vercel dev on localhost:3000
```

## Deploying
Just push to GitHub — Vercel auto-deploys:
```bash
git add src/App.jsx  # (or whichever files changed)
git commit -m "describe what you changed"
git push
```

## Making Changes
All app logic is in `src/App.jsx`. Key sections:
- **`loadAllData()`** — reads vocabulary, history, streak from `localStorage`
- **`callClaudeAPI()`** — sends requests to `/api/chat` (the Vercel proxy)
- **`handleStartSession()`** — begins a practice session
- **`handleEndSession()`** — saves session results to localStorage

## Model Use
| Path | Model | Why |
|---|---|---|
| Tutor / practice modes | `claude-haiku-4-5-20251001` | Cheap, and tutoring is the easy task |
| Naturalness judging | `claude-sonnet-5` | Judging whether German sounds native is much harder than tutoring; Haiku over-flags and returns paraphrases dressed as upgrades |
| Naturalness detector | `claude-sonnet-5` | Same task, on free text |

Measured costs: ~$0.0025 per judged drill answer, ~$0.0027 per analysed free-practice turn. The detector prompt (~2,650 tokens) clears the minimum cacheable prefix and is cached; the judge prompt (~400 tokens) does not and is not. Both are sent straight through `api/chat.js`, which forwards the request body untouched — so per-call model choice needs no proxy change.

## Anthropic Billing Notes
- API credits are separate from Claude Pro subscription
- Credits and monthly spend limit managed at: platform.claude.com/settings/limits
- Current model used: `claude-haiku-4-5-20251001`

---

## Working with Claude Code (Tips for Future Sessions)

Claude has a **Chrome extension** that lets it see and control the browser directly — no need to take manual screenshots or navigate pages yourself. To get the most out of this:

### ✅ DO
- **Use Chrome** (not Safari) for any admin tasks — Vercel, GitHub, Anthropic Console
- **Let Claude open pages** — just say "go to the Vercel dashboard" and Claude will navigate there itself
- **Stay in the Chrome tab Claude is using** — Claude controls one specific tab; use that same tab for everything
- **Just describe what you want** — e.g. "change the app title" or "add Spanish as a language option" — Claude knows the project from this file

### ❌ DON'T
- Don't navigate to pages yourself in a separate window and then share a screenshot — Claude can do this directly
- Don't use Safari for admin pages — Claude can't control Safari, only Chrome
- Don't worry about remembering technical steps — that's what this file is for

### Starting a New Session
1. Open Claude Code (claude.ai or the desktop app)
2. Make sure the Chrome extension is active (the Claude icon should be visible in Chrome's toolbar)
3. Simply describe what you want to change — Claude will read this file and know exactly what to do
4. Claude will edit the code, push to GitHub, and Vercel will auto-deploy within ~30 seconds

---

## Documentation Protocol (Claude must follow this)

**After every session where changes are made:**
1. Update the **Current Status** section at the top — what was done, today's date
2. Update the **Practice Modes** table if any modes were added or changed
3. Commit all changes (code + docs together) and push to GitHub

GitHub is the **single source of truth**. Every session should end with a clean `git status` and everything pushed. A Stop hook auto-commits any files that were missed, but Claude should do it explicitly at end of session so commit messages are meaningful.

## Cloudflare TODO (added 2026-06-17)

Deploy to **Cloudflare Pages** — it's a Vite/React SPA, so static Pages hosting is the natural fit (fast, free, no build-minute cost).
- `npm run build` -> deploy `dist/` via Pages Git integration or `wrangler pages deploy dist`.
- If it gains an API later, add a Pages Function / Worker rather than a separate host.
