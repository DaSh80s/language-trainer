#!/usr/bin/env node
/**
 * Runs the entire pipeline against fixtures instead of Notion.
 *
 * This is the fastest way to see what next Saturday's page will look like, and
 * it runs in CI as a smoke test that the maths and rendering still work.
 */

import { loadConfig } from '../src/config.js';
import { NotionClient } from '../src/notion.js';
import { gatherFacts, writeProse } from '../src/index.js';
import { blocksToPreview, renderMeetings, renderNutrition, renderProgress, renderTasks } from '../src/render.js';
import { createFakeNotionFetch } from '../test/fixtures.js';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const referenceDay = process.argv[2] ?? '2026-08-29';

const config = await loadConfig();
config.llm.enabled = false; // Deterministic output, so the demo is reproducible.

const client = new NotionClient({
  token: 'fake-token-for-fixtures',
  fetchImpl: createFakeNotionFetch(),
  logger: console,
});

// Serve the sample calendar from disk instead of the network.
const icsPath = resolve(dirname(fileURLToPath(import.meta.url)), '../test/fixtures.ics');
const icsText = await readFile(icsPath, 'utf8');
const fakeIcsFetch = async () => ({ ok: true, text: async () => icsText });

const facts = await gatherFacts({
  config,
  client,
  referenceDay,
  feeds: [{ label: 'Work (sample)', url: 'fixture://calendar.ics' }],
  fetchImpl: fakeIcsFetch,
});
const prose = await writeProse(facts, config);
const generatedAt = '2026-08-29 07:00';

const sections = [
  [config.sections.nutrition.toggle, renderNutrition(facts.nutrition, prose.nutrition.text, generatedAt)],
  [config.sections.progress.toggle, renderProgress(facts.progress, prose.progress.text, generatedAt)],
  [config.sections.meetings.toggle, renderMeetings(facts.meetings, prose.meetings.text, generatedAt, config.locale)],
  [config.sections.tasks.toggle, renderTasks(facts.tasks, prose.tasks.text, generatedAt)],
];

for (const [toggle, blocks] of sections) {
  console.log(`\n▸ ${toggle}`);
  console.log(blocksToPreview(blocks, '   '));
}
