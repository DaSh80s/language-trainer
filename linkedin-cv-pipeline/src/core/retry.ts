export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  /** Return false to fail immediately (e.g. 4xx that won't heal). Default: retry all. */
  isRetryable?: (err: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Exponential backoff with full jitter: base, 2×base, 4×base… */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 4, baseMs = 500, isRetryable = () => true } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts - 1 || !isRetryable(err)) break;
      await sleep(Math.random() * baseMs * 2 ** attempt);
    }
  }
  throw lastErr;
}
