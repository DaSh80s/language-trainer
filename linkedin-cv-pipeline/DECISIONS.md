# DECISIONS

Append-only log of settled choices. Don't relitigate without new information.

## D1 — Temporary home on a `language-trainer` branch (2026-06-12)

**Decision:** Build in `linkedin-cv-pipeline/` on branch
`claude/linkedin-recruiter-notion-cv-wknzgk` of `DaSh80s/language-trainer`.
**Why:** The session's GitHub integration is hard-scoped to `language-trainer`;
`create_repository` for `DaSh80s/linkedin-cv-pipeline` returned 403. The folder is fully
self-contained (own package.json, no references outside it) so migration is trivial.
**Alternative rejected:** Blocking the build until a new repo exists — wastes the session.
**Migration steps (when ready):** create `DaSh80s/linkedin-cv-pipeline` on GitHub, then:
`git clone` language-trainer, copy the `linkedin-cv-pipeline/` folder contents to a fresh
clone of the new repo, commit, push. Then add the new repo to the Claude environment so
future sessions work there directly.

## D2 — TypeScript + Vitest, wrangler config now / install later (2026-06-12)

**Decision:** TypeScript (strict) on Workers; Vitest for tests; `wrangler.toml` written
now but the `wrangler` CLI is not a dependency until M4 (deploy).
**Why:** Typed Graph/Notion/Groq payloads catch schema drift at compile time; Vitest is
the Workers-ecosystem default. Wrangler is a heavy dependency with no use before deploy.
**Alternative rejected:** Plain JS — silent schema drift across three external APIs.

## D3 — Ports-and-adapters: pipeline depends on interfaces, not clients (2026-06-12)

**Decision:** `runPipeline()` takes `MailSource` / `CvAnalyzer` / `CandidateStore` /
`AlertSink` interfaces. Real clients (Graph/Groq/Notion/Slack) implement them; tests use
in-memory stubs.
**Why:** The whole pipeline — dedupe, burst, idempotency, failure paths — is testable
offline before any credential exists, and each integration lands independently in M2–M4.
**Alternative rejected:** Direct client calls in the pipeline — untestable until all four
credentials are wired, which inverts the milestone order.

## D4 — Score fit from structured profile + JD, not raw CV (2026-06-12)

**Decision:** Groq call 1 parses the CV attachment → structured profile; Groq call 2
scores the structured profile against the job description.
**Why:** Cheaper (no resending the document), deterministic inputs, and the profile is
written to Notion anyway, so scoring sees exactly what the recruiter sees.
**Alternative rejected:** Scoring from raw CV text — marginally richer signal, but
doubles token cost per applicant at hundreds of applicants per ad.

## D5 — Unmapped CVs: write as Unsorted + Slack alert (2026-06-12)

**Decision:** A CV whose job title can't be confidently matched to an opportunity is
still written to Notion (no opportunity relation, no score), marked `Unsorted`, and a
Slack alert is posted.
**Why:** Never lose an applicant; triage happens in Notion where the team already works.
**Alternative rejected:** Slack-only — applicants would live outside the system of record.

## D6 — `LinkedIn applicant` tag on create, ensured on update (2026-06-12)

**Decision:** Every record the pipeline creates is tagged `LinkedIn applicant`. On
dedupe-update, the tag is added if missing; existing tags are never removed.
**Why:** Explicit requirement (create); on update the candidate demonstrably applied via
LinkedIn too, and additive tagging can't destroy data. **Assumption flagged:** tagging on
update wasn't explicitly requested — revert to create-only if wrong.

## D7 — Role matching: subject/body title extraction + token-set similarity (2026-06-12)

**Decision:** Extract the job title from the email via LinkedIn-format patterns, then
match against Notion opportunity titles using normalized token-set Dice similarity with
a 0.5 confidence threshold; below threshold → Unsorted (D5).
**Why:** User confirmed the title is expected in the email; fuzzy matching tolerates
suffixes like "(m/f/d)", "- Remote". Threshold + patterns get locked against real sample
emails in M3.
**Alternative rejected:** Per-ad reference tags — deterministic but adds manual work to
every ad, which this project exists to remove.

## D8 — Verified Notion schema mapping (2026-06-12)

**Decision:** Map to the live Rigby OS schema, verified against real records:
- Contacts: **"All contacts"** (database `3f64f533d5dd4ea8a1263607204a806a`, data source
  `b5034a1f-5328-4872-a423-f1efdbb6ab97`). Dedupe key `Email`. Fields written: title,
  `Email`, `Phone 1`, `Job title`, `Education`, `Auto-summary` (summary + location +
  skills), `Fit score`, `Fit commentary`, `Sourced from`, `Client or candidate?`,
  `Applied for role`, `Job ID/Customer ref.`, `Processing notes` (Unsorted reason).
- Opportunities: **"Opportunities"** (database `f48d478f19c646e8aa0f17020d4495c2`, data
  source `805f4f75-a599-41d0-aa5c-c1f35cb5785b`). `Job Title` = title, `Orig JD text` =
  JD for scoring, `Job ID` = JOB-XXXX auto-id, terminal `Stage` values excluded from
  matching.
- **Applicant relation:** contacts `Applied for role` ↔ opportunities `Applicants`
  (dual pair confirmed on a real applicant: contact CAN-8381 ↔ JOB-1838). This is the
  same pattern the existing website-application flow uses (`From a form?`, `Job
  ID/Customer ref.`, `Fit score`/`Fit commentary` all populated there).
**Why:** Mirrors existing plumbing exactly (SPEC non-goal: don't rebuild it).
**Alternative rejected:** Configurable property names via env — pointless indirection
for a single workspace; constants in `notionSchema.ts` are typed and test-covered.

## D9 — Tag placement: `Client or candidate?` + `Sourced from` (2026-06-12)

**Decision:** The `LinkedIn applicant` tag is written as a new option in the
`Client or candidate?` multi-select (alongside the existing `Candidate`, which we also
set), and `Sourced from` is set to the existing `LinkedIn Recruiter` option.
**Why:** The schema has no generic tags field; `Client or candidate?` is the
contact-classification multi-select and multi-selects auto-create options on first
write. `Sourced from` already has a `LinkedIn Recruiter` option, so source attribution
follows the team's existing convention.
**Alternative rejected:** A new dedicated property — schema changes to a shared CRM
need the team's buy-in. **Assumption flagged:** confirm `Client or candidate?` is the
right home for the tag; trivially changeable in `notionSchema.ts`.

## D10 — Known limits of the contact-level model (2026-06-12)

- Fit score/commentary live on the *contact*, so a candidate applying to two roles keeps
  only the latest score (the role relation keeps both). Same shape as the existing
  website flow — accepted for v1.
- Dedupe checks `Email` only, not `Email 2`.
- Relation merge carries over the relation ids returned by the page read; if a contact
  ever had >25 role relations the list could truncate. Not realistic for applicants.

## D11 — Email format verified; client-ref-first role matching (2026-06-12)

**Decision:** Patterns locked against a real LinkedIn Recruiter application email
(template `email_ent_job_post_new_applicant`, sender **jobs-listings@linkedin.com**):
subject `New application: {Job Title} from {Candidate Name}`, body line
`{Job Title} at {Company} · {Location}`, CV attached as PDF. Ad titles often embed the
client ref `(rfxNNNNNNN)`, which equals the opportunity's `Client ref. no.` and appears
in its Notion title — so matching is **rfx exact match first**, token-similarity fuzzy
title second, Unsorted third. The candidate's email address only exists inside the CV,
confirming parse-CV-before-dedupe (D4).
**Why:** An exact ref is deterministic; fuzzy matching only carries ads without a ref.
**Shared mailbox:** `linkedinapplications@rigby.ch` (provided by Dan, 2026-06-12).

## D12 — Graph access: app-only token, category as processed-marker (2026-06-12)

**Decision:** Client-credentials flow (`Mail.ReadWrite` application permission, ideally
scoped to the shared mailbox via an application access policy). Fetch = messages from
jobs-listings@linkedin.com with attachments in a 14-day lookback window; processed
messages carry the `cv-pipeline-processed` category (appended, preserving existing
categories, + mark read) so mail stays visible in the inbox. Graph can't filter on
categories server-side → filtered client-side within the window.
**Alternative rejected:** Moving processed mail to a subfolder — invisible mail surprises
humans; deleting is irreversible.

## D13 — unpdf for CV text extraction; Groq via JSON mode (2026-06-12)

**Decision:** PDF→text with `unpdf` (pdf.js serverless build; runs on Workers, no native
deps). Groq chat completions with `response_format: json_object`, temperature 0; default
model `llama-3.3-70b-versatile` (overridable via `GROQ_MODEL`). The overall fit score is
computed in code as a fixed weighted blend (skills .45 / experience .35 / seniority .2)
of model sub-scores — deterministic, not model whim.
**Alternative rejected:** `pdf-parse` — depends on Node `fs`, doesn't run on Workers.

## D14 — CVs without a discoverable email fail loudly (2026-06-12)

**Decision:** If parsing yields no valid email, the message errors → Slack alert →
left unprocessed for manual import. DOCX and other non-PDF/text attachments likewise.
**Why:** Email is the dedupe key (D8); writing a record without it would either collide
with other empty-email contacts or silently break dedupe. Visible failure beats data
corruption. Revisit if LinkedIn volume shows meaningful non-PDF CV share.

## D15 — Cross-matching + client affinity (2026-06-12, requested by Dan)

**Decision (cross-match, criterion 10):** After scoring the applied role, pre-rank other
live `Sourcing priority 1/2` roles with a free local similarity (0.6·title + 0.4·skills
found in JD), Groq-score at most the top 3, and record those with overall ≥ 60 via the
existing contacts `Opps matched` relation (additive, mirrors the opportunities `Matches`
pattern) plus a "Cross-match: also worth a look for …" line in `Processing notes`.
**Decision (client affinity, criterion 11):** Clients whose *hired* opportunities
(`Done deal!`/`Extended`) clear local similarity ≥ 0.45 against the candidate get a
note: "Client affinity (heuristic): {client} previously hired similar — {roles}".
Note-only, zero Groq calls, labelled heuristic so recruiters weigh it accordingly.
**Robustness:** enrichment runs best-effort — a failure alerts to Slack and the
applicant record is still written without it.
**Why local-only for clients:** placement history is sparse; LLM-inferred client
affinity would be confident-sounding noise. Revisit with live data in v2.
**Alternative rejected:** scoring every applicant against every open role — Groq cost
and latency scale with the board size for marginal benefit beyond the top 3.

## D16 — Migrated to standalone repo (2026-06-13)

**Decision:** The project now lives at **https://github.com/DaSh80s/linkedin-cv-pipeline**
(private), cloned to `/Users/danielshalom/Documents/AI Projects/linkedin-cv-pipeline`.
This supersedes the temporary home in D1. The folder contents were imported with a fresh
history; the `language-trainer` branch `claude/linkedin-recruiter-notion-cv-wknzgk`
remains as the build's historical record but is no longer the source of truth.
**Why:** Honors the one-project-one-repo + canonical-path convention now that the repo
exists. D1's session GitHub scope (language-trainer only) blocked creating it earlier.
