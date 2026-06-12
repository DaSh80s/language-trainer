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
