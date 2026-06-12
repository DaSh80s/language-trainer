import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlackAlertSink } from '../src/clients/slack.js';

afterEach(() => vi.unstubAllGlobals());

describe('SlackAlertSink', () => {
  it('never throws when the webhook is unreachable (alerting must not kill the run)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')));
    const sink = new SlackAlertSink('https://hooks.slack.invalid/x');
    await expect(sink.error('ctx', new Error('boom'))).resolves.toBeUndefined();
    await expect(sink.summary({ received: 3, parsed: 3, written: 3, unsorted: 0, failed: 0 })).resolves.toBeUndefined();
  });

  it('never throws on a non-2xx webhook response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no_service', { status: 410 })));
    const sink = new SlackAlertSink('https://hooks.slack.invalid/x');
    await expect(sink.error('ctx', 'detail')).resolves.toBeUndefined();
  });

  it('skips the summary post on idle ticks to avoid channel spam', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchSpy);
    const sink = new SlackAlertSink('https://hooks.slack.invalid/x');
    await sink.summary({ received: 0, parsed: 0, written: 0, unsorted: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
