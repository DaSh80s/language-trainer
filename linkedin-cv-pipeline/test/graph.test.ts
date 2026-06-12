import { describe, expect, it } from 'vitest';
import { GraphMailSource, PROCESSED_CATEGORY } from '../src/clients/graph.js';

const TOKEN_RESPONSE = { access_token: 'tok-1', expires_in: 3600 };

const message = (id: string, categories: string[] = []) => ({
  id,
  subject: `New application: Data Analyst from Candidate ${id}`,
  bodyPreview: 'Your job has a new applicant',
  receivedDateTime: '2026-06-12T10:00:00Z',
  categories,
});

const cvAttachment = {
  '@odata.type': '#microsoft.graph.fileAttachment',
  name: 'CV_Candidate.pdf',
  contentType: 'application/pdf',
  contentBytes: 'JVBERi0=',
};

function sourceWith(handler: (url: string, init?: RequestInit) => unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchStub = (async (url: any, init: any) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(handler(url, init)), { status: 200 });
  }) as typeof fetch;
  const source = new GraphMailSource(
    { tenantId: 'tenant', clientId: 'client', clientSecret: 'secret', mailboxAddress: 'linkedinapplications@rigby.ch' },
    fetchStub,
  );
  return { source, calls };
}

describe('GraphMailSource', () => {
  it('fetches application mail, skips processed, and maps attachments', async () => {
    const { source, calls } = sourceWith((url) => {
      if (url.includes('/oauth2/')) return TOKEN_RESPONSE;
      if (url.includes('/attachments')) return { value: [cvAttachment] };
      return { value: [message('m1'), message('m2', [PROCESSED_CATEGORY])] };
    });

    const emails = await source.fetchUnprocessed();

    expect(emails).toHaveLength(1);
    expect(emails[0]!.id).toBe('m1');
    expect(emails[0]!.attachments).toEqual([
      { filename: 'CV_Candidate.pdf', mimeType: 'application/pdf', contentBase64: 'JVBERi0=' },
    ]);
    const listCall = calls.find((c) => c.url.includes('/messages?'))!;
    expect(listCall.url).toContain('linkedinapplications%40rigby.ch');
    const filter = decodeURIComponent(listCall.url);
    expect(filter).toContain("from/emailAddress/address eq 'jobs-listings@linkedin.com'");
    expect(filter).toContain('hasAttachments eq true');
  });

  it('follows @odata.nextLink pagination', async () => {
    let listCalls = 0;
    const { source } = sourceWith((url) => {
      if (url.includes('/oauth2/')) return TOKEN_RESPONSE;
      if (url.includes('/attachments')) return { value: [cvAttachment] };
      listCalls++;
      return listCalls === 1
        ? { value: [message('m1')], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next-page' }
        : { value: [message('m2')] };
    });
    const emails = await source.fetchUnprocessed();
    expect(emails.map((e) => e.id)).toEqual(['m1', 'm2']);
  });

  it('reuses the cached token across requests', async () => {
    const { source, calls } = sourceWith((url) => {
      if (url.includes('/oauth2/')) return TOKEN_RESPONSE;
      if (url.includes('/attachments')) return { value: [cvAttachment] };
      return { value: [message('m1')] };
    });
    await source.fetchUnprocessed();
    await source.fetchUnprocessed();
    expect(calls.filter((c) => c.url.includes('/oauth2/'))).toHaveLength(1);
  });

  it('marks processed by appending the category, preserving existing ones', async () => {
    const { source, calls } = sourceWith((url) => {
      if (url.includes('/oauth2/')) return TOKEN_RESPONSE;
      if (url.includes('/attachments')) return { value: [cvAttachment] };
      return { value: [message('m1', ['Important'])] };
    });
    await source.fetchUnprocessed();
    await source.markProcessed('m1');

    const patch = calls.find((c) => c.init?.method === 'PATCH')!;
    expect(patch.url).toContain('/messages/m1');
    expect(JSON.parse(patch.init!.body as string)).toEqual({
      categories: ['Important', PROCESSED_CATEGORY],
      isRead: true,
    });
  });

  it('drops non-file attachments (inline images, item attachments)', async () => {
    const { source } = sourceWith((url) => {
      if (url.includes('/oauth2/')) return TOKEN_RESPONSE;
      if (url.includes('/attachments'))
        return { value: [{ '@odata.type': '#microsoft.graph.itemAttachment', name: 'fwd' }, cvAttachment] };
      return { value: [message('m1')] };
    });
    const emails = await source.fetchUnprocessed();
    expect(emails[0]!.attachments).toHaveLength(1);
  });
});
