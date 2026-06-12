import type { AlertSink, RunSummary } from '../types.js';

/** Posts errors and per-run summaries to a Slack incoming webhook (SPEC criterion 8). */
export class SlackAlertSink implements AlertSink {
  constructor(private readonly webhookUrl: string) {}

  // Alerting must never take the pipeline down — a thrown alert inside the
  // pipeline's catch path would abort the rest of the batch. Last resort is
  // the Worker log, so post() catches network rejections too, not just !ok.
  private async post(text: string): Promise<void> {
    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        console.error(`Slack webhook failed: ${res.status}`);
      }
    } catch (err) {
      console.error(`Slack webhook unreachable: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async error(context: string, detail: unknown): Promise<void> {
    const detailText = detail instanceof Error ? detail.message : JSON.stringify(detail);
    await this.post(`:rotating_light: cv-pipeline error — ${context}\n\`\`\`${detailText}\`\`\``);
  }

  async summary(s: RunSummary): Promise<void> {
    if (s.received === 0) return; // don't spam the channel on idle ticks
    await this.post(
      `cv-pipeline run: received ${s.received} · parsed ${s.parsed} · written ${s.written}` +
        ` · unsorted ${s.unsorted} · failed ${s.failed}`,
    );
  }
}
