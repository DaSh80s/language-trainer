# D's Language Trainer

An AI-powered language practice app built with React + Vite, deployed on Vercel, backed up on GitHub.

## Live URL
https://language-trainer-kappa.vercel.app

## GitHub
https://github.com/DaSh80s/language-trainer

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + lucide-react icons
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
