# SPEC — LinkedIn Recruiter → Notion CV Pipeline

## Goal

Eliminate the ~10-min/applicant manual CV handling for LinkedIn Recruiter applications.
A Cloudflare Worker on a cron trigger reads application emails from the existing M365
shared mailbox via Microsoft Graph, extracts each CV, uses Groq to parse it into
structured candidate data and score fit against the role's job description from Notion,
links the candidate to the right opportunity, and writes the enriched record to Notion
within minutes of arrival — with no manual steps.

## Success criteria (definition of done)

1. A new application email results in a fully populated Notion candidate record within
   minutes, with no manual steps.
2. The candidate is linked to the correct opportunity via the existing applicant relation,
   matched by fuzzy job-title matching from the email subject/body.
3. Each candidate carries a fit-score breakdown — **skills / experience / seniority
   sub-scores plus a weighted overall 0–100** — against that role's job description.
4. **Every record the pipeline creates is tagged `LinkedIn applicant`** in Notion.
5. Duplicate applications (same candidate email) **update** the existing record rather
   than creating a second one. Updates also ensure the `LinkedIn applicant` tag is
   present, without removing existing tags.
6. A CV that can't be confidently mapped to a role is still written, marked **Unsorted**
   for manual triage, and a Slack alert is posted.
7. A burst of 100+ applications from a single ad is processed without losing any and
   without Notion rate-limit failures (writes throttled to ~3 req/s).
8. Failures are visible: parse/write errors post to Slack with actionable context, and
   every run posts a summary (received / parsed / written / unsorted / failed).
9. Idempotency: processed emails are marked in the mailbox; a re-run never double-imports.
   Dedupe-by-email is the second safety net.
10. **Cross-matching:** each applicant is also checked against other live roles in
    `Sourcing priority 1/2`. Strong fits (Groq overall ≥ 60, max 3 scored per applicant
    after free local pre-ranking) are linked via the `Opps matched` relation and noted
    on the record ("Cross-match: also worth a look for …").
11. **Client affinity (heuristic):** clients whose historically *hired* roles
    (`Done deal!`/`Extended`) resemble the candidate get a note on the record
    ("Client affinity (heuristic): {client} previously hired similar — …"). Local
    similarity only, explicitly labelled heuristic, no relations written.

## Non-goals (scope guard)

- No changes to how website applicants are handled — the existing Notion plumbing is
  reused (the applicant-relation pattern is mirrored), not rebuilt.
- No candidate outreach, messaging, or interview scheduling.
- No UI/dashboard in v1 — Notion is the interface.
- No paid services (no Zapier, no new paid mailbox, no Gmail/personal accounts).

## Architecture (settled — see DECISIONS.md for rationale)

| Concern | Choice |
|---|---|
| Inbox | Microsoft 365 shared mailbox (existing tenant) |
| Email access | Microsoft Graph API |
| Compute | Cloudflare Workers (TypeScript) |
| Scheduling | Cloudflare Cron Triggers |
| CV parsing + scoring | Groq |
| System of record | Notion API |
| Error visibility | Slack incoming webhook |

## Milestones

1. **Scaffold (this milestone):** repo layout, SPEC/DECISIONS, typed pipeline core,
   fixture-driven tests covering criteria 3–9 against in-memory stubs. *Done = tests
   and typecheck green offline.*
2. **Notion integration:** real candidates/opportunities DB schemas, applicant relation,
   dedupe lookup, rate-limit queue against the live API.
3. **Graph integration:** shared-mailbox auth, attachment extraction, mark-as-processed;
   lock role-mapping patterns against real LinkedIn sample emails.
4. **Groq + Slack + deploy:** live parsing/scoring prompts, Slack alerts, burst test,
   `wrangler deploy` with cron trigger.

Exit condition for the project loop: a burst of 100+ fixture applications processes
end-to-end with zero loss, correct dedupe, and all failure paths visibly logged.

## Inputs still needed (provided during build)

- Sample LinkedIn Recruiter application emails (M3 — locks role-mapping patterns).
- Notion candidates DB ID + schema; opportunities DB ID + applicant-relation property
  name (M2).
- Shared mailbox address + Graph app registration / permissions (M3).
- Slack webhook or channel for error logging (M4).
