import { describe, expect, it } from 'vitest';
import { withRetry } from '../src/core/retry.js';

describe('withRetry', () => {
  it('succeeds after transient failures', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        if (++calls < 3) throw new Error('transient');
        return 'ok';
      },
      { baseMs: 1 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws the last error once attempts are exhausted', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error('still down');
        },
        { attempts: 3, baseMs: 1 },
      ),
    ).rejects.toThrow('still down');
    expect(calls).toBe(3);
  });

  it('fails fast on non-retryable errors', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error('400 bad request');
        },
        { baseMs: 1, isRetryable: (e) => !(e instanceof Error && e.message.startsWith('400')) },
      ),
    ).rejects.toThrow('400');
    expect(calls).toBe(1);
  });
});
