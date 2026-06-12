# linkedin-cv-pipeline

**Repo:** https://github.com/DaSh80s/language-trainer — branch `claude/linkedin-recruiter-notion-cv-wknzgk`, folder `linkedin-cv-pipeline/` *(temporary home: session tooling could not create the dedicated repo; see DECISIONS.md D1 for migration steps to `DaSh80s/linkedin-cv-pipeline`)*
**Purpose:** Automatically ingest LinkedIn Recruiter job-application emails, parse and score each CV with Groq, and write enriched, role-linked candidate records into Notion.
**Path convention:** clone to `/Users/danielshalom/Documents/AI Projects/linkedin-cv-pipeline` on every machine.

## Layout

```
src/index.ts        Worker entry (cron-triggered scheduled handler)
src/pipeline.ts     Orchestration: mail → parse → role-match → score → Notion upsert
src/core/           Pure logic: role matching, retry, rate limiting
src/clients/        Real integrations: Graph, Groq, Notion, Slack (completed in M2–M4)
test/               Vitest suite + fixtures (runs fully offline against stubs)
```

## Commands

```bash
npm install        # dev dependencies only
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

See `SPEC.md` for success criteria and non-goals; `DECISIONS.md` for settled choices.
