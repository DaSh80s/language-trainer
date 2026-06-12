import type { AlertSink, RunSummary } from '../types.js';

/** Posts errors and per-run summaries to a Slack incoming webhook (SPEC criterion 8). */
export class SlackAlertSink implements AlertSink {
  constructor(private readonly webhookUrl: string) {}

  private async post(text: string): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      // Alerting must never take the pipeline down; last resort is the Worker log.
      console.error(`Slack webhook failed: ${res.status}`);
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
