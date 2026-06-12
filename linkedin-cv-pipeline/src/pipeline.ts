import { withRetry } from './core/retry.js';
import { extractJobTitle, matchOpportunity } from './core/roleMatch.js';
import {
  LINKEDIN_APPLICANT_TAG,
  type ApplicationEmail,
  type CandidateRecord,
  type CvAttachment,
  type PipelineDeps,
  type RunSummary,
} from './types.js';

const CV_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

function pickCvAttachment(email: ApplicationEmail): CvAttachment | null {
  return email.attachments.find((a) => CV_MIME_TYPES.has(a.mimeType)) ?? null;
}

/**
 * One cron tick: process every unhandled application email.
 *
 * Failure isolation: one bad message never aborts the run. A failed message is
 * NOT marked processed, so the next tick retries it (SPEC criteria 8–9).
 */
export async function runPipeline(deps: PipelineDeps): Promise<RunSummary> {
  const summary: RunSummary = { received: 0, parsed: 0, written: 0, unsorted: 0, failed: 0 };

  const emails = await withRetry(() => deps.mail.fetchUnprocessed(), deps.retry);
  summary.received = emails.length;
  if (emails.length === 0) {
    await deps.alerts.summary(summary);
    return summary;
  }

  const opportunities = await withRetry(() => deps.store.listOpportunities(), deps.retry);

  for (const email of emails) {
    try {
      const attachment = pickCvAttachment(email);
      if (!attachment) {
        throw new Error(`no CV attachment on message (subject: ${email.subject})`);
      }

      const profile = await withRetry(() => deps.analyzer.parseCv(attachment), deps.retry);
      summary.parsed++;

      const title = extractJobTitle(email.subject, email.bodyPreview);
      const opportunity = matchOpportunity(title, opportunities);

      const record: CandidateRecord = {
        profile,
        opportunityId: opportunity?.id ?? null,
        fit: opportunity
          ? await withRetry(() => deps.analyzer.scoreFit(profile, opportunity.jobDescription), deps.retry)
          : null,
        tags: [LINKEDIN_APPLICANT_TAG],
        sourceMessageId: email.id,
      };

      if (!opportunity) {
        summary.unsorted++;
        await deps.alerts.error(
          'unmapped role — written as Unsorted',
          { messageId: email.id, subject: email.subject, extractedTitle: title },
        );
      }

      await withRetry(() => deps.store.upsertCandidate(record), deps.retry);
      summary.written++;
      await withRetry(() => deps.mail.markProcessed(email.id), deps.retry);
    } catch (err) {
      summary.failed++;
      await deps.alerts.error(`failed message ${email.id} (subject: ${email.subject})`, err);
    }
  }

  await deps.alerts.summary(summary);
  return summary;
}
