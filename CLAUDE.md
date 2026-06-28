# D's Language Trainer

An AI-powered language practice app built with React + Vite, deployed on Vercel, backed up on GitHub.

## Current Status
_Update this section at the end of each session so any device can pick up where you left off._

- **App state:** Live and working at https://language-trainer-kappa.vercel.app
- **Last worked on:** Shipped the **Fluo redesign** (2026-06-28) — full visual overhaul to the warm editorial "Fluo" design system: CSS-variable theming with a working light (terracotta) / dark (fluo-lime) toggle persisted to `localStorage['lt_theme']`, Spectral + IBM Plex Sans/Mono fonts, new header + segmented tabs, two-column Practice screen (setup rail + chronological tutor chat with a thin mode/level context strip + docked answer bar), card-based Vocabulary grid, and a Progress dashboard with a weekly-activity chart. All existing logic (API, conversation/drill flow, streak, vocab & error storage) was preserved — this was a reskin, not a rewrite. Name kept as **Fluo**; default theme is **light**.
- **In progress:** Nothing — app is stable
- **Next ideas:**
  - Mobile: collapse the Practice setup rail into a chip + bottom-sheet (currently it just stacks above the chat on narrow screens).
  - Vocab cards show a POS tag (Noun/Verb) only when derivable — the data model has no part-of-speech field yet; add one if we want reliable Noun/Verb filter chips.
  - iPad landscape layout (handoff only covered portrait).

## Practice Modes
| Mode | Description |
|---|---|
| Conversation | Free chat in the target language |
| Grammar | Translate English sentences; drill on mistakes |
| Vocabulary | Learn 5 new words with IPA + examples |
| Translation | Bidirectional translation drills |
| **Article Gender** | App gives a bare noun → user types the article; tips & rules provided |
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
- `api/chat.js` — Vercel serverless function that proxies Anthropic API calls
- `.env` — local environment variables (gitignored)
- `.env.example` — template showing required env vars

## Environment Variables
| Variable | Where |
|---|---|
| `ANTHROPIC_API_KEY` | `.env` locally, Vercel dashboard in production |

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
