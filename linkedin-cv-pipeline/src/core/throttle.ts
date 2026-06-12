/**
 * Serializes calls with a minimum spacing so a 100-applicant burst stays under
 * Notion's ~3 req/s ceiling (SPEC criterion 7) instead of slamming it.
 */
export class RateLimiter {
  private readonly intervalMs: number;
  private tail: Promise<void> = Promise.resolve();
  private nextSlot = 0;

  constructor(requestsPerSecond: number) {
    this.intervalMs = 1000 / requestsPerSecond;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const myTurn = this.tail.then(async () => {
      const wait = this.nextSlot - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.nextSlot = Date.now() + this.intervalMs;
    });
    // Keep the chain alive even if fn rejects.
    this.tail = myTurn.catch(() => {});
    await myTurn;
    return fn();
  }
}
