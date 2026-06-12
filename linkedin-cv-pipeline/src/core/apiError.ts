/**
 * HTTP error carrying retryability for withRetry (core/retry.ts):
 * 429 and 5xx heal on retry; other 4xx are mapping/config bugs and fail fast.
 * Shared by the Graph/Notion/Groq clients so the semantics can't drift.
 */
export class HttpApiError extends Error {
  constructor(
    api: string,
    readonly status: number,
    body: string,
  ) {
    super(`${api} API ${status}: ${body.slice(0, 300)}`);
  }
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}
