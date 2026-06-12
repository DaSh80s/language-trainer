import {
  CROSS_MATCH_MIN_SCORE,
  findClientAffinities,
  rankCrossCandidates,
} from './core/affinity.js';
import { withRetry } from './core/retry.js';
import { extractRoleHints, matchOpportunity } from './core/roleMatch.js';
import { isLive } from './core/stages.js';
import {
  LINKEDIN_APPLICANT_TAG,
  type ApplicationEmail,
  type CandidateProfile,
  type CandidateRecord,
  type ClientAffinity,
  type CrossMatchResult,
  type CvAttachment,
  type Opportunity,
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
 * Cross-match against other priority-1/2 roles + client-affinity notes
 * (SPEC criteria 10–11). Best-effort: a failure here alerts and returns what
 * was gathered so far — it never sinks the applicant write itself.
 */
async function crossEnrich(
  deps: PipelineDeps,
  profile: CandidateProfile,
  allOpportunities: Opportunity[],
  liveOpportunities: Opportunity[],
  appliedOpportunityId: string | null,
  messageId: string,
): Promise<{ crossMatches: CrossMatchResult[]; clientAffinities: ClientAffinity[] }> {
  const crossMatches: CrossMatchResult[] = [];
  const clientAffinities: ClientAffinity[] = [];
  try {
    for (const candidate of rankCrossCandidates(profile, liveOpportunities, appliedOpportunityId)) {
      const fit = await withRetry(() => deps.analyzer.scoreFit(profile, candidate.jobDescription), deps.retry);
      if (fit.overall >= CROSS_MATCH_MIN_SCORE) {
        crossMatches.push({ opportunityId: candidate.id, title: candidate.title, overall: fit.overall });
      }
    }

    const hits = findClientAffinities(profile, allOpportunities);
    if (hits.length > 0) {
      const names = await withRetry(
        () => deps.store.resolveClientNames(hits.map((h) => h.clientId)),
        deps.retry,
      );
      for (const hit of hits) {
        clientAffinities.push({ ...hit, clientName: names.get(hit.clientId) ?? 'Unknown client' });
      }
    }
  } catch (err) {
    await deps.alerts.error(`cross-match enrichment failed for ${messageId} — record written without it`, err);
  }
  return { crossMatches, clientAffinities };
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
  const liveOpportunities = opportunities.filter((o) => isLive(o.stage));

  for (const email of emails) {
    try {
      const attachment = pickCvAttachment(email);
      if (!attachment) {
        throw new Error(`no CV attachment on message (subject: ${email.subject})`);
      }

      const profile = await withRetry(() => deps.analyzer.parseCv(attachment), deps.retry);
      summary.parsed++;

      const hints = extractRoleHints(email.subject, email.bodyPreview);
      const opportunity = matchOpportunity(hints, liveOpportunities);

      const enrichment = await crossEnrich(deps, profile, opportunities, liveOpportunities, opportunity?.id ?? null, email.id);

      const record: CandidateRecord = {
        profile,
        opportunityId: opportunity?.id ?? null,
        fit: opportunity
          ? await withRetry(() => deps.analyzer.scoreFit(profile, opportunity.jobDescription), deps.retry)
          : null,
        tags: [LINKEDIN_APPLICANT_TAG],
        sourceMessageId: email.id,
        ...enrichment,
      };

      if (!opportunity) {
        summary.unsorted++;
        await deps.alerts.error(
          'unmapped role — written as Unsorted',
          { messageId: email.id, subject: email.subject, extracted: hints },
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
