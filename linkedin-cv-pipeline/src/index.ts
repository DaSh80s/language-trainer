import { GraphMailSource } from './clients/graph.js';
import { DEFAULT_GROQ_MODEL, GroqAnalyzer } from './clients/groq.js';
import { NotionCandidateStore } from './clients/notion.js';
import { SlackAlertSink } from './clients/slack.js';
import { runPipeline } from './pipeline.js';

export interface Env {
  GRAPH_TENANT_ID: string;
  GRAPH_CLIENT_ID: string;
  GRAPH_CLIENT_SECRET: string;
  MAILBOX_ADDRESS: string;
  GROQ_API_KEY: string;
  GROQ_MODEL?: string;
  NOTION_TOKEN: string;
  NOTION_CONTACTS_DB_ID: string;
  NOTION_OPPORTUNITIES_DB_ID: string;
  SLACK_WEBHOOK_URL: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const alerts = new SlackAlertSink(env.SLACK_WEBHOOK_URL);
    const run = runPipeline({
      mail: new GraphMailSource({
        tenantId: env.GRAPH_TENANT_ID,
        clientId: env.GRAPH_CLIENT_ID,
        clientSecret: env.GRAPH_CLIENT_SECRET,
        mailboxAddress: env.MAILBOX_ADDRESS,
      }),
      analyzer: new GroqAnalyzer({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL }),
      store: new NotionCandidateStore({
        token: env.NOTION_TOKEN,
        contactsDatabaseId: env.NOTION_CONTACTS_DB_ID,
        opportunitiesDatabaseId: env.NOTION_OPPORTUNITIES_DB_ID,
      }),
      alerts,
    }).catch((err) => alerts.error('pipeline run crashed', err));
    ctx.waitUntil(run);
  },
};
