# Deploy Runbook

Everything the pipeline needs that only an admin can create. Code-side is done;
work through these once and the Worker goes live.

## 1. Microsoft Graph app registration (M365 admin)

1. [Entra admin center](https://entra.microsoft.com) → App registrations → **New registration**
   — name `linkedin-cv-pipeline`, single tenant, no redirect URI.
2. Note the **Application (client) ID** and **Directory (tenant) ID**.
3. Certificates & secrets → **New client secret** (24 months) — note the **Value** immediately.
4. API permissions → Add → Microsoft Graph → **Application permissions** → `Mail.ReadWrite`
   → **Grant admin consent**.
5. **Least privilege (recommended):** restrict the app to the shared mailbox only.
   In Exchange Online PowerShell:
   ```powershell
   New-DistributionGroup -Name "cv-pipeline-mailboxes" -Type Security
   Add-DistributionGroupMember -Identity "cv-pipeline-mailboxes" -Member linkedinapplications@rigby.ch
   New-ApplicationAccessPolicy -AppId <client-id> -PolicyScopeGroupId cv-pipeline-mailboxes@rigby.ch -AccessRight RestrictAccess
   Test-ApplicationAccessPolicy -AppId <client-id> -Identity linkedinapplications@rigby.ch   # → Granted
   ```

## 2. Notion integration token

1. notion.so/profile/integrations → **New integration** (internal), workspace: Rigby OS.
   Capabilities: read + update + insert content. Note the secret (`ntn_…`).
2. Share both databases with the integration (••• menu → Connections → add it):
   **All contacts** and **Opportunities**. The DB ids are already in `wrangler.toml`.

## 3. Groq API key

console.groq.com → API Keys → create. Default model is `llama-3.3-70b-versatile`
(override with the `GROQ_MODEL` var if needed).

## 4. Slack incoming webhook

api.slack.com/apps → create app → Incoming Webhooks → activate → add webhook to the
alerts channel (suggestion: `#cv-pipeline`). Note the URL.

## 5. Deploy (Cloudflare)

```bash
cd linkedin-cv-pipeline
npm install -D wrangler
npx wrangler login
npx wrangler secret put GRAPH_TENANT_ID
npx wrangler secret put GRAPH_CLIENT_ID
npx wrangler secret put GRAPH_CLIENT_SECRET
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler deploy          # cron trigger */5 min activates automatically
```

## 6. Route the LinkedIn emails

LinkedIn Recruiter → Settings → Product settings → Company Settings → Job posting →
**Enable job application email** → set to `linkedinapplications@rigby.ch`.
(Until this is flipped, applications keep going to individual recruiters.)

## 7. Go-live validation

1. Forward one real application email **as attachment-preserving redirect** (or post a
   test ad) so a `jobs-listings@linkedin.com` message with a CV lands in the shared mailbox.
2. Within 5 minutes: the contact appears in **All contacts**, tagged `LinkedIn applicant`,
   linked via `Applied for role`, with `Fit score` + `Fit commentary`; the mail gets the
   `cv-pipeline-processed` category; Slack shows the run summary.
3. `npx wrangler tail` streams live Worker logs if anything misbehaves.

## Operational notes

- **Use the Workers paid plan** (Standard, ~$5/mo): PDF text extraction (pdf.js) is
  CPU-heavy and a single CV can exceed the free plan's 10 ms CPU budget; the paid plan
  allows 30 s CPU per invocation.
- Each tick processes at most 25 emails (memory + wall-time bound); a 100-applicant
  burst clears over ~4 ticks (≈20 minutes) with nothing lost.

- A message that fails every run stops being retried once it ages out of the 14-day
  lookback — Slack alerts are the tripwire, act on them.
- CVs without a discoverable email address are alerted and left unprocessed (manual
  import) — the dedupe key can't be guessed safely.
- Forwarded mail (FW: from a colleague) is ignored by design: the fetch filters on
  sender `jobs-listings@linkedin.com`.
