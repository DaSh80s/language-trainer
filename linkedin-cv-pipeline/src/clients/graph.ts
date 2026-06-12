import type { ApplicationEmail, MailSource } from '../types.js';

export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailboxAddress: string;
}

/**
 * Microsoft Graph adapter for the shared mailbox.
 * Skeleton — completed in Milestone 3 against the real app registration.
 * "Processed" = message moved out of Inbox is rejected; we flag with a category
 * so humans can still see the mail where they expect it.
 */
export class GraphMailSource implements MailSource {
  constructor(private readonly config: GraphConfig) {}

  async fetchUnprocessed(): Promise<ApplicationEmail[]> {
    // M3: client-credentials token → GET /users/{mailbox}/messages
    //     ?$filter=hasAttachments eq true and not categories/any(c:c eq 'cv-pipeline-processed')
    //     then GET /messages/{id}/attachments for each.
    throw new Error('GraphMailSource.fetchUnprocessed not implemented until Milestone 3');
  }

  async markProcessed(messageId: string): Promise<void> {
    // M3: PATCH /users/{mailbox}/messages/{id} adding category 'cv-pipeline-processed'.
    throw new Error(`GraphMailSource.markProcessed(${messageId}) not implemented until Milestone 3`);
  }
}
