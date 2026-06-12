import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../src/core/throttle.js';

describe('RateLimiter', () => {
  it('spaces calls to the configured rate', async () => {
    const limiter = new RateLimiter(100); // 10ms interval, fast enough for tests
    const start = Date.now();
    const order: number[] = [];
    await Promise.all(
      Array.from({ length: 7 }, (_, i) => limiter.run(async () => order.push(i))),
    );
    const elapsed = Date.now() - start;
    // 7 calls at 10ms spacing ⇒ at least ~60ms; generous lower bound for CI jitter
    expect(elapsed).toBeGreaterThanOrEqual(55);
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('keeps serving after a rejected call', async () => {
    const limiter = new RateLimiter(1000);
    await expect(limiter.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limiter.run(async () => 'alive')).resolves.toBe('alive');
  });
});
