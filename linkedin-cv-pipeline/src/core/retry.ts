export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  /** Return false to fail immediately (e.g. 4xx that won't heal). Default: see below. */
  isRetryable?: (err: unknown) => boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Errors may declare their own retryability (e.g. NotionApiError: 429/5xx yes, 4xx no). */
function defaultIsRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'retryable' in err) {
    return Boolean((err as { retryable: unknown }).retryable);
  }
  return true;
}

/** Exponential backoff with full jitter: base, 2×base, 4×base… */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 4, baseMs = 500, isRetryable = defaultIsRetryable } = opts;
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
