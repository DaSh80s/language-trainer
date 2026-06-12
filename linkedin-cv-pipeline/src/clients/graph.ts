import { HttpApiError } from '../core/apiError.js';
import type { ApplicationEmail, CvAttachment, MailSource } from '../types.js';

export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Shared mailbox the LinkedIn application emails arrive at. */
  mailboxAddress: string;
}

export class GraphApiError extends HttpApiError {
  constructor(status: number, body: string) {
    super('Graph', status, body);
  }
}

const GRAPH = 'https://graph.microsoft.com/v1.0';
const APPLICATION_SENDER = 'jobs-listings@linkedin.com';
export const PROCESSED_CATEGORY = 'cv-pipeline-processed';
/** Re-scan window: anything older was either processed or predates the pipeline. */
const LOOKBACK_DAYS = 14;
/**
 * Per-tick cap: bounds memory (base64 CVs held in RAM) and wall time (serial
 * Groq/Notion calls) for a single invocation. A 100-applicant burst clears
 * over a few 5-minute ticks instead of one giant run — nothing is lost, the
 * remainder simply stays unprocessed until the next tick.
 */
export const MAX_BATCH = 25;

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  categories?: string[];
}

interface GraphAttachment {
  '@odata.type'?: string;
  name?: string;
  contentType?: string;
  contentBytes?: string;
}

interface ListResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

/**
 * Microsoft Graph adapter for the shared mailbox (app-only client credentials;
 * requires Mail.ReadWrite application permission scoped to the mailbox).
 * "Processed" = the message carries the PROCESSED_CATEGORY category, so mail
 * stays visible in the inbox where the team expects it (D12). Graph does not
 * support filtering on categories server-side, so already-processed messages
 * inside the lookback window are dropped client-side.
 */
export class GraphMailSource implements MailSource {
  private token: { value: string; expiresAt: number } | null = null;
  /** Categories per fetched message, so markProcessed appends instead of clobbering. */
  private readonly knownCategories = new Map<string, string[]>();

  constructor(
    private readonly config: GraphConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    const res = await this.fetchImpl(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }).toString(),
      },
    );
    if (!res.ok) throw new GraphApiError(res.status, await res.text());
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new GraphApiError(res.status, await res.text());
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private mailboxUrl(path: string): string {
    return `${GRAPH}/users/${encodeURIComponent(this.config.mailboxAddress)}${path}`;
  }

  async fetchUnprocessed(): Promise<ApplicationEmail[]> {
    this.knownCategories.clear(); // re-populated below; prevents unbounded growth across ticks
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
    const filter =
      `receivedDateTime ge ${since}` +
      ` and hasAttachments eq true` +
      ` and from/emailAddress/address eq '${APPLICATION_SENDER}'`;
    const select = 'id,subject,bodyPreview,receivedDateTime,categories';
    let url: string | undefined = this.mailboxUrl(
      `/messages?$filter=${encodeURIComponent(filter)}&$select=${select}&$top=50`,
    );

    const messages: GraphMessage[] = [];
    while (url) {
      const page: ListResponse<GraphMessage> = await this.request('GET', url);
      messages.push(...page.value);
      url = page['@odata.nextLink'];
    }

    const unprocessed = messages
      .filter((m) => !(m.categories ?? []).includes(PROCESSED_CATEGORY))
      .slice(0, MAX_BATCH);
    const emails: ApplicationEmail[] = [];
    for (const message of unprocessed) {
      this.knownCategories.set(message.id, message.categories ?? []);
      emails.push({
        id: message.id,
        subject: message.subject ?? '',
        bodyPreview: message.bodyPreview ?? '',
        receivedAt: message.receivedDateTime ?? '',
        attachments: await this.fetchAttachments(message.id),
      });
    }
    return emails;
  }

  private async fetchAttachments(messageId: string): Promise<CvAttachment[]> {
    const res: ListResponse<GraphAttachment> = await this.request(
      'GET',
      this.mailboxUrl(`/messages/${messageId}/attachments?$select=name,contentType,contentBytes`),
    );
    return res.value
      .filter((a) => a.contentBytes && (a['@odata.type'] ?? '').endsWith('fileAttachment'))
      .map((a) => ({
        filename: a.name ?? 'attachment',
        mimeType: a.contentType ?? 'application/octet-stream',
        contentBase64: a.contentBytes!,
      }));
  }

  async markProcessed(messageId: string): Promise<void> {
    const existing = this.knownCategories.get(messageId) ?? [];
    await this.request('PATCH', this.mailboxUrl(`/messages/${messageId}`), {
      categories: [...new Set([...existing, PROCESSED_CATEGORY])],
      isRead: true,
    });
  }
}
