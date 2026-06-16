# Nutrition Tracker

A voice-first food logging system for Dan. Capture meals by dictation (watch or
phone), enrich them with AI-estimated nutrition, store them in a dedicated Notion
database, and run trend analysis on demand.

This folder is the **Claude Code intelligence layer + build kit** for the system
described in the build spec. It contains everything that can be prepared without a
live Notion connection. The live Notion steps run once the connection points at the
right account (see below).

## ⚠️ Status — blocked on Notion account (2026-06-16)

The Notion integration is currently authorised against Dan's **work (Rigby) account**
(`daniel@rigby.ch`), not his personal Notion. Personal food tracking should not live
in a company workspace, so the live build is **paused**.

Nothing was created, migrated, or deleted in the work Notion. A `Nutrition Log`
database (one test row) already exists there from an earlier setup attempt — leave it
alone; it is in the wrong workspace.

**To unblock:** repoint the Notion connection to the personal account, then run the
live build (§ "Going live" below).

### How to repoint the Notion connection (Claude Code on the web)

1. Open the Connectors / Integrations settings for this Claude Code environment
   (the same connectors panel used by Claude.ai).
2. **Disconnect** the existing Notion connector (currently signed in as
   `daniel@rigby.ch`).
3. **Reconnect** Notion and, during the OAuth/login step, sign in with the
   **personal** Notion account (not the Rigby SSO login).
4. Grant the integration access to the workspace/teamspace where the Food Log should
   live.
5. Start a fresh Claude Code session and say *"run the nutrition tracker live build"* —
   the steps are in this README.

Exact button labels vary by client; see
<https://code.claude.com/docs/en/claude-code-on-the-web> for the current connectors UI.
If the personal Notion is on the same login as work, create the database under a
clearly personal teamspace instead.

## Files

| File | Purpose | Build-order step |
|---|---|---|
| `notion-schema.md` | Ready-to-run `CREATE TABLE` DDL for the Food Log database | §9.1 |
| `enrichment-runbook.md` | How Claude Code parses & enriches Pending/Recalculate entries | §9.3, §5 |
| `analytics-runbook.md` | Daily/weekly/monthly totals, comparisons, pattern insight | §9.5 |
| `ios-shortcut-instructions.md` | Step-by-step Shortcut build, both capture modes | §9.4 |
| `phase2-exercise.md` | Exercise database design + cross-reference (later) | §9.6 |

## Going live (run these once Notion points at the personal account)

1. **Create the database** — feed `notion-schema.md`'s DDL to the Notion
   `create-database` tool. Save the returned `data_source_id` into this README.
2. **Existing-notes analysis** — search the personal Notion for food notes, extract
   recurring meals, and produce a **Frequent Meals** list with pre-computed nutrition
   (feeds the Shortcut quick-tap menu). Optionally backfill history.
3. **Enrichment pass** — follow `enrichment-runbook.md` to fill any Pending entries.
4. **Build the Shortcut** — Dan follows `ios-shortcut-instructions.md`, pasting in the
   database ID + Notion token.
5. **Analytics** — run summaries per `analytics-runbook.md` on demand or on a schedule.

> Filled in at go-live:
> - Food Log `database_id`: _TBD_
> - Food Log `data_source_id`: _TBD_
> - Frequent Meals list: _TBD_

## Key constraints (from the spec)

- **Adaptive input** — works with partial *or* complete data; never blocks on missing
  fields.
- **British English** spelling throughout — "Fibre", not "Fiber".
- **Dedicated database** — food tracking stays separate from general notes.
- **Low friction first** — capture is fast (voice or one tap); enrichment and
  refinement happen behind the scenes or later.
- **Non-interactive runs** — the Notion MCP needs interactive permission pre-grant
  before any scheduled/unattended enrichment run.
