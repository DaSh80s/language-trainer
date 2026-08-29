#!/usr/bin/env node
/**
 * Weekly review generator.
 *
 *   node src/index.js discover            inspect the workspace and print schemas
 *   node src/index.js run --dry-run       compute everything, write nothing
 *   node src/index.js run                 fill this week's review page
 *
 * The run is deliberately ordered so that anything that can fail loudly does so
 * before a single block is written to Notion.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadConfig, loadDotEnv, loadFeedsFromEnv, packageRoot } from './config.js';
import { NotionClient, readMultiSelectNames, readNumber, readSelectName, readTitle, richTextToPlain } from './notion.js';
import { resolveTargets } from './targets.js';
import { computeNutrition, parseMilestones, parseWeightEntries, reviewWindow, summariseFood, summariseWeight } from './nutrition.js';
import { computeProgress } from './progress.js';
import { computeTasks, taskWindow } from './tasks.js';
import { computeMeetings } from './meetings.js';
import { generateProse } from './llm.js';
import {
  MARKER, blocksToPreview, fallbackMeetingsProse, fallbackNutritionProse,
  fallbackProgressProse, fallbackTasksProse, renderMeetings, renderNutrition,
  renderProgress, renderTasks,
} from './render.js';
import { addDays, todayInZone } from './util/date.js';

/* -------------------------------- CLI ---------------------------------- */

function parseArgs(argv) {
  const args = { command: argv[2] ?? 'run', flags: {} };
  for (let index = 3; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [name, inlineValue] = token.slice(2).split('=');
    const next = argv[index + 1];
    if (inlineValue !== undefined) args.flags[name] = inlineValue;
    else if (next && !next.startsWith('--')) { args.flags[name] = next; index += 1; }
    else args.flags[name] = true;
  }
  return args;
}

const logger = {
  info: (...parts) => console.log(...parts),
  warn: (...parts) => console.warn('⚠️ ', ...parts),
  error: (...parts) => console.error('❌', ...parts),
};

/* ----------------------------- query helpers ---------------------------- */

/** Run a filtered query, falling back to an unfiltered scan if the filter is rejected. */
async function safeQuery(client, databaseId, { filter, sorts, label, maxPages = 6 }) {
  try {
    const rows = await client.queryDatabase(databaseId, { filter, sorts });
    return { rows, filtered: true };
  } catch (error) {
    logger.warn(
      `Filtered query on ${label} failed (${error.message.slice(0, 140)}). `
      + 'Falling back to an unfiltered scan and filtering locally.',
    );
    const rows = await client.queryDatabase(databaseId, {
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      maxPages,
    });
    return { rows, filtered: false };
  }
}

function dateWindowFilter(property, start, endExclusive) {
  return {
    and: [
      { property, date: { on_or_after: start } },
      { property, date: { before: endExclusive } },
    ],
  };
}

/* ------------------------------- discover ------------------------------- */

async function commandDiscover(config, client) {
  logger.info('\n=== Workspace identity ===');
  const search = await client.request('/search', {
    method: 'POST',
    body: { filter: { property: 'object', value: 'database' }, page_size: 100 },
  });

  logger.info(`\nDatabases shared with this integration (${search.results.length}):`);
  for (const database of search.results) {
    const title = richTextToPlain(database.title ?? []);
    logger.info(`  ${database.id}  ${title || '(untitled)'}`);
  }

  const configured = [
    ['foodLog', config.foodLog.databaseId],
    ['weightLog', config.weightLog.databaseId],
    ['tasks', config.tasks.databaseId],
    ['weeklyJournal', config.weeklyJournal.databaseId],
  ];

  for (const [name, databaseId] of configured) {
    logger.info(`\n=== ${name} (${databaseId}) ===`);
    if (!databaseId || databaseId === 'REPLACE_ME') {
      logger.warn('Not configured yet.');
      continue;
    }
    try {
      const database = await client.getDatabase(databaseId);
      logger.info(`Title: ${richTextToPlain(database.title ?? [])}`);
      for (const [property, definition] of Object.entries(database.properties)) {
        logger.info(`  - ${property.padEnd(28)} ${definition.type}`);

        // A select's option list is the definitive set of values, unlike a
        // sample of rows which only shows what happens to be recent.
        const options = definition.multi_select?.options ?? definition.select?.options;
        if (options && name === 'weeklyJournal') {
          logger.info(`      all ${options.length} option(s): ${options.map((o) => o.name).join(' | ')}`);
        }
      }
    } catch (error) {
      logger.error(`Could not read: ${error.message}`);
    }
  }

  // Schemas alone do not show how a review page is identified, so show rows.
  const journal = config.weeklyJournal;
  if (journal.databaseId && journal.databaseId !== 'REPLACE_ME') {
    logger.info(`\n=== Sample pages tagged [${weeklyJournalTags(config).join(", ")}] ===`);
    try {
      const rows = await client.queryDatabase(journal.databaseId, {
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        maxPages: 3,
      });
      const tagged = rows.filter(isWeeklyJournalPage(config));
      logger.info(`${tagged.length} of ${rows.length} recent rows carry the tag.`);

      // Independent of tags: look the pages up by title.
      for (const term of ['Weekly review', 'Weekly Review', 'Week ']) {
        const { rows: byTitle } = await safeQuery(client, journal.databaseId, {
          label: `journal title contains "${term}"`,
          filter: { property: journal.titleProperty ?? 'Name', title: { contains: term } },
          maxPages: 1,
        });
        logger.info(`Title contains "${term}": ${byTitle.length} row(s)`);
        for (const page of byTitle.slice(0, 5)) {
          logger.info(
            `  - "${readTitle(page)}" | id=${page.id} `
            + `| tags=[${readMultiSelectNames(page, journal.tagsProperty).join(', ')}] `
            + `| ${journal.weekProperty}=${readNumber(page, journal.weekProperty)} `
            + `| created ${page.created_time?.slice(0, 10)}`,
          );
        }
      }

      if (!tagged.length) {
        // The configured tag matched nothing, so show what tags do exist
        // rather than leaving the reason to guesswork.
        const counts = new Map();
        for (const page of rows) {
          for (const tag of readMultiSelectNames(page, journal.tagsProperty)) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
          }
        }
        const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        logger.info(`Tags actually present (${ranked.length}):`);
        for (const [tag, count] of ranked.slice(0, 30)) logger.info(`  - ${tag} (${count})`);

        logger.info('Most recent rows, whatever their tag:');
        for (const page of rows.slice(0, 5)) {
          logger.info(`  - "${readTitle(page)}" created ${page.created_time?.slice(0, 10)}`);
        }
      }

      for (const page of tagged.slice(0, 8)) {
        const parts = [
          `"${readTitle(page)}"`,
          `created ${page.created_time?.slice(0, 10)}`,
          `tags=[${readMultiSelectNames(page, journal.tagsProperty).join(', ')}]`,
        ];
        if (journal.yearProperty) parts.push(`${journal.yearProperty}=${readSelectName(page, journal.yearProperty)}`);
        logger.info(`  - ${parts.join(' | ')}`);
      }
    } catch (error) {
      logger.error(`Could not sample rows: ${error.message}`);
    }
  }

  logger.info('\n=== Where do "Weekly review" pages actually live? ===');
  for (const term of ['Weekly review', 'Weekly journal']) {
    try {
      const found = await client.request('/search', {
        method: 'POST',
        body: { query: term, filter: { property: 'object', value: 'page' }, page_size: 8 },
      });
      logger.info(`"${term}": ${found.results.length} result(s)`);
      for (const page of found.results) {
        const parent = page.parent ?? {};
        const parentId = parent.database_id ?? parent.page_id ?? parent.type;
        logger.info(
          `  - "${readTitle(page)}" | id=${page.id} | parent ${parent.type} ${parentId} `
          + `| created ${page.created_time?.slice(0, 10)}`,
        );
      }
    } catch (error) {
      logger.error(`Search for "${term}" failed: ${error.message}`);
    }
  }

  const journalConfig = config.weeklyJournal;
  if (journalConfig.weekProperty && journalConfig.databaseId !== 'REPLACE_ME') {
    logger.info(`\n=== Rows with "${journalConfig.weekProperty}" set ===`);
    try {
      const { rows } = await safeQuery(client, journalConfig.databaseId, {
        label: 'rows with a week number',
        filter: { property: journalConfig.weekProperty, number: { is_not_empty: true } },
        maxPages: 1,
      });
      logger.info(`${rows.length} row(s) carry a week number.`);
      for (const page of rows.slice(0, 10)) {
        logger.info(
          `  - "${readTitle(page)}" | id=${page.id} `
          + `| ${journalConfig.weekProperty}=${readNumber(page, journalConfig.weekProperty)} `
          + `| tags=[${readMultiSelectNames(page, journalConfig.tagsProperty).join(', ')}] `
          + `| created ${page.created_time?.slice(0, 10)}`,
        );
      }
    } catch (error) {
      logger.error(`Could not query by week number: ${error.message}`);
    }
  }

  logger.info('\n=== Target notes ===');
  for (const source of config.targets.sources) {
    try {
      const page = await client.getPage(source.pageId);
      logger.info(`  ✅ ${source.label}: "${readTitle(page)}"`);
    } catch (error) {
      logger.error(`  ${source.label} (${source.pageId}): ${error.message}`);
    }
  }

  // Printed last so a single look at the end of the log answers the question
  // the whole command exists for.
  // A plain listing is swamped by the inline databases embedded in each review
  // page, so search by name instead.
  logger.info('\n=== SUMMARY: databases matching the names we need ===');
  for (const term of ['Journals', 'Food Diary', 'All tasks', 'Notes']) {
    try {
      const search = await client.request('/search', {
        method: 'POST',
        body: { query: term, filter: { property: 'object', value: 'database' }, page_size: 5 },
      });
      const matches = search.results
        .map((database) => ({ id: database.id, title: richTextToPlain(database.title ?? []) }))
        .filter((database) => database.title.toLowerCase().includes(term.toLowerCase()));
      logger.info(`  "${term}": ${matches.map((m) => `${m.title} = ${m.id}`).join('  |  ') || 'no match'}`);
    } catch (error) {
      logger.error(`  "${term}": search failed: ${error.message}`);
    }
  }

  logger.info('\n=== SUMMARY: every value the Tags property allows ===');
  try {
    const database = await client.getDatabase(config.weeklyJournal.databaseId);
    const property = database.properties?.[config.weeklyJournal.tagsProperty];
    const options = property?.multi_select?.options ?? property?.select?.options ?? [];
    const names = options.map((option) => option.name);
    const shown = names.slice(0, 40).join(' | ');
    logger.info(`${names.length} option(s). First 40: ${shown}${names.length > 40 ? ' ...' : ''}`);
  } catch (error) {
    logger.error(`Could not read the tag vocabulary: ${error.message}`);
  }
}

/* --------------------------------- run ---------------------------------- */

export async function gatherFacts({ config, client, referenceDay, feeds, fetchImpl }) {
  const nutritionWindow = reviewWindow(referenceDay, 7);
  const tasksWindow = taskWindow(referenceDay, 7);

  // Targets first: a missing maintenance figure should stop the run immediately.
  const targets = await resolveTargets(client, config.targets, nutritionWindow.end);
  logger.info(`Maintenance: ${targets.values.maintenanceKcal} kcal (${targets.provenance.maintenanceKcal.description})`);

  const foodStart = nutritionWindow.start;
  const foodEndExclusive = addDays(nutritionWindow.end, 1);

  const foodQuery = await safeQuery(client, config.foodLog.databaseId, {
    label: 'Food Log',
    filter: dateWindowFilter(config.foodLog.dateProperties[0], foodStart, foodEndExclusive),
    maxPages: 10,
  });

  const weightQuery = await safeQuery(client, config.weightLog.databaseId, {
    label: 'weight log (Notes)',
    filter: { property: 'title', title: { contains: config.weightLog.titleContains } },
    maxPages: 6,
  });

  const tasksQuery = await safeQuery(client, config.tasks.databaseId, {
    label: 'All tasks',
    filter: dateWindowFilter(
      config.tasks.dueProperty,
      addDays(referenceDay, -90),
      addDays(tasksWindow.end, 1),
    ),
    maxPages: 10,
  });

  const food = summariseFood(foodQuery.rows, config.foodLog, nutritionWindow, config.timezone);
  const weightEntries = parseWeightEntries(weightQuery.rows, config.weightLog, config.timezone);
  const weight = summariseWeight(weightEntries, nutritionWindow, config.weightLog.trendWindowDays);
  const milestones = parseMilestones(tasksQuery.rows, config.goal, config.tasks);

  logger.info(
    `Food rows: ${foodQuery.rows.length} (${food.daysWithEntries}/${nutritionWindow.lengthDays} days logged) · `
    + `weight readings: ${weightEntries.length} · task rows: ${tasksQuery.rows.length} · milestones: ${milestones.length}`,
  );

  const nutrition = computeNutrition({
    food, weight, milestones, targets, window: nutritionWindow, config, referenceDay,
  });
  const progress = computeProgress(referenceDay, config);
  const tasks = await computeTasks({ client, pages: tasksQuery.rows, config, referenceDay });
  const meetings = await computeMeetings({ feeds, config, referenceDay, fetchImpl, logger });

  return { nutrition, progress, tasks, meetings, targets, warnings: targets.warnings };
}

export async function writeProse(facts, config) {
  const untrustedTasks = facts.tasks.bigThree.map((item) => item.title);
  const untrustedMeetings = facts.meetings.days.flatMap((day) => day.meetings.map((meeting) => meeting.title));

  const [nutrition, progress, meetings, tasks] = await Promise.all([
    generateProse({
      instruction: 'Give at most three concrete actions for the week ahead, then one or two sentences of encouragement.',
      facts: facts.nutrition,
      config,
      fallback: fallbackNutritionProse(facts.nutrition),
      logger,
    }),
    generateProse({
      instruction: 'In two sentences, reflect on where the year stands and what the coming week is for.',
      facts: facts.progress,
      config,
      fallback: fallbackProgressProse(facts.progress),
      logger,
    }),
    generateProse({
      instruction: 'Summarise the week\'s notable meetings and flag the one that needs the most preparation.',
      facts: { ...facts.meetings, days: undefined },
      untrusted: untrustedMeetings,
      config,
      fallback: fallbackMeetingsProse(facts.meetings),
      logger,
    }),
    generateProse({
      instruction: 'Summarise the workload and give an honest realism check in two or three sentences.',
      facts: { ...facts.tasks, byProject: undefined, overdue: undefined },
      untrusted: untrustedTasks,
      config,
      fallback: fallbackTasksProse(facts.tasks),
      logger,
    }),
  ]);

  logger.info(
    `Prose: nutrition=${nutrition.provider}, progress=${progress.provider}, `
    + `meetings=${meetings.provider}, tasks=${tasks.provider}`,
  );
  if (nutrition.usedFallback && nutrition.attempts?.length) {
    logger.warn(`LLM providers were not used. Why: ${nutrition.attempts.join(' ; ')}`);
  }

  return { nutrition, progress, meetings, tasks };
}

function normaliseHeading(value) {
  return value.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function toggleText(block) {
  const content = block[block.type];
  return richTextToPlain(content?.rich_text ?? []);
}

function isToggleLike(block) {
  if (block.type === 'toggle') return true;
  return block.type.startsWith('heading_') && block[block.type]?.is_toggleable;
}

/** A page counts as a weekly review only if it carries the configured tag. */
function isWeeklyJournalPage(config) {
  const { tagsProperty } = config.weeklyJournal;
  const candidates = weeklyJournalTags(config);
  if (!tagsProperty || !candidates.length) return () => true;

  const wanted = new Set(candidates.map((tag) => tag.toLowerCase()));
  return (page) => {
    const names = [
      ...readMultiSelectNames(page, tagsProperty),
      readSelectName(page, tagsProperty),
    ].filter(Boolean);
    return names.some((name) => wanted.has(name.toLowerCase()));
  };
}

/** Accepts either a single tagValue or a list of candidates to try. */
function weeklyJournalTags(config) {
  const { tagValues, tagValue } = config.weeklyJournal;
  if (Array.isArray(tagValues) && tagValues.length) return tagValues;
  return tagValue ? [tagValue] : [];
}

/** Find the page for this week's review, or explain how to point at one. */
async function findReviewPage(client, config, referenceDay, explicitPageId) {
  if (explicitPageId) return client.getPage(explicitPageId);

  const { databaseId, dateProperty } = config.weeklyJournal;
  if (!databaseId || databaseId === 'REPLACE_ME') {
    throw new Error(
      'weeklyJournal.databaseId is not configured. Run `npm run discover` to find it, '
      + 'or pass --page <page-id> to target a specific page.',
    );
  }

  // The Notes database has no date property, so a date filter is only used
  // when one is actually configured; otherwise the tag does the work.
  const { rows } = dateProperty
    ? await safeQuery(client, databaseId, {
      label: 'weekly journal',
      filter: { property: dateProperty, date: { equals: referenceDay } },
    })
    : {
      rows: await client.queryDatabase(databaseId, {
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        maxPages: 3,
      }),
    };

  // The review pages share the Notes database with everything else, so the tag
  // is what separates them. Checked here rather than in the query because the
  // property may be a select or a multi-select, and this works for both.
  const tagged = rows.filter(isWeeklyJournalPage(config));
  if (tagged.length) return tagged[0];

  // Writing into "some other page" is never the right answer. If the page for
  // this date cannot be identified, stop and say exactly what was found, so
  // the wrong week never gets overwritten.
  const found = rows.map((page) => {
    const tags = [
      ...readMultiSelectNames(page, config.weeklyJournal.tagsProperty),
      readSelectName(page, config.weeklyJournal.tagsProperty),
    ].filter(Boolean);
    return `  - "${readTitle(page)}" (id ${page.id}) tags=[${tags.join(', ') || 'none'}]`;
  });

  throw new Error(
    `No page dated ${referenceDay} tagged [${weeklyJournalTags(config).join(', ')}] `
    + `in the ${config.weeklyJournal.databaseId} database.\n`
    + (found.length
      ? `Pages dated ${referenceDay}:\n${found.join('\n')}\n\n`
        + 'Either the tag is missing on this week\'s page, or tagValues needs updating.'
      : 'No page carries that date at all - duplicate the template first.')
    + '\nNothing was written. Pass --page <page-id> to target a page explicitly.',
  );
}

/** Replace anything a previous run wrote inside this toggle, then append the new blocks. */
async function fillToggle(client, toggle, blocks, { dryRun }) {
  const children = await client.getBlockChildren(toggle.id);
  const markerIndex = children.findIndex((child) =>
    child.type === 'paragraph'
    && richTextToPlain(child.paragraph.rich_text).startsWith(MARKER));

  const stale = markerIndex === -1 ? [] : children.slice(markerIndex);

  if (dryRun) return { removed: stale.length, added: blocks.length };

  for (const block of stale) {
    await client.deleteBlock(block.id);
  }
  await client.appendBlockChildren(toggle.id, blocks);
  return { removed: stale.length, added: blocks.length };
}

async function commandRun(config, client, flags) {
  const dryRun = Boolean(flags['dry-run']);
  const referenceDay = typeof flags.date === 'string' ? flags.date : todayInZone(config.timezone);

  if (config._isExample) {
    logger.warn(`Using ${config._path}. Copy it to config/config.json and edit it for a real run.`);
  }
  if (flags['no-llm']) config.llm.enabled = false;

  logger.info(`Reference day: ${referenceDay} (${config.timezone})`);

  const feeds = loadFeedsFromEnv();
  if (!feeds.length) logger.warn('No ICS_FEEDS configured — the meetings section will say so rather than guess.');

  const facts = await gatherFacts({ config, client, referenceDay, feeds });
  for (const warning of facts.warnings) logger.warn(warning);

  const proseBySection = await writeProse(facts, config);
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

  const sections = {
    nutrition: renderNutrition(facts.nutrition, proseBySection.nutrition.text, generatedAt),
    progress: renderProgress(facts.progress, proseBySection.progress.text, generatedAt),
    meetings: renderMeetings(facts.meetings, proseBySection.meetings.text, generatedAt, config.locale),
    tasks: renderTasks(facts.tasks, proseBySection.tasks.text, generatedAt),
  };

  if (flags.out) {
    const path = resolve(packageRoot, String(flags.out));
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify({ referenceDay, facts, sections }, null, 2));
    logger.info(`Wrote facts to ${path}`);
  }

  logger.info('\n--- preview ---');
  for (const [name, blocks] of Object.entries(sections)) {
    if (!config.sections[name].enabled) continue;
    logger.info(`\n## ${config.sections[name].toggle}`);
    logger.info(blocksToPreview(blocks));
  }
  logger.info('\n--- end preview ---\n');

  if (dryRun) {
    logger.info('Dry run: nothing was written to Notion.');
    return;
  }

  const page = await findReviewPage(client, config, referenceDay, flags.page);
  logger.info(`Writing into page ${page.id} ("${readTitle(page)}")`);

  const topLevel = await client.getBlockChildren(page.id);
  const toggles = topLevel.filter(isToggleLike);
  const missing = [];

  for (const [name, section] of Object.entries(config.sections)) {
    if (!section.enabled) continue;

    const wanted = normaliseHeading(section.toggle);
    const toggle = toggles.find((candidate) => normaliseHeading(toggleText(candidate)) === wanted)
      ?? toggles.find((candidate) => normaliseHeading(toggleText(candidate)).includes(wanted));

    if (!toggle) {
      missing.push(section.toggle);
      continue;
    }

    const result = await fillToggle(client, toggle, sections[name], { dryRun });
    logger.info(`  ${section.toggle}: replaced ${result.removed}, added ${result.added} blocks`);
  }

  if (missing.length) {
    logger.warn(
      `Could not find these toggles on the page: ${missing.join('; ')}. `
      + 'Check the headings in config.sections match the template.',
    );
    logger.warn(`Toggles actually on the page: ${toggles.map(toggleText).join(' | ') || '(none)'}`);
  }

  logger.info('Done.');
}

/** Remove everything a previous run wrote from a page, leaving your own content. */
async function commandClean(config, client, flags) {
  if (typeof flags.page !== 'string') {
    throw new Error('clean requires --page <page-id>.');
  }

  const page = await client.getPage(flags.page);
  logger.info(`Cleaning generated blocks from ${page.id} ("${readTitle(page)}")`);

  const toggles = (await client.getBlockChildren(page.id)).filter(isToggleLike);
  let removed = 0;

  for (const toggle of toggles) {
    const children = await client.getBlockChildren(toggle.id);
    const markerIndex = children.findIndex((child) =>
      child.type === 'paragraph'
      && richTextToPlain(child.paragraph.rich_text).startsWith(MARKER));
    if (markerIndex === -1) continue;

    const stale = children.slice(markerIndex);
    if (flags['dry-run']) {
      logger.info(`  ${toggleText(toggle)}: would remove ${stale.length} block(s)`);
      continue;
    }
    for (const block of stale) await client.deleteBlock(block.id);
    logger.info(`  ${toggleText(toggle)}: removed ${stale.length} block(s)`);
    removed += stale.length;
  }

  logger.info(flags['dry-run'] ? 'Dry run: nothing removed.' : `Done. Removed ${removed} block(s).`);
}

/* --------------------------------- main --------------------------------- */

async function main() {
  const args = parseArgs(process.argv);
  await loadDotEnv();
  const config = await loadConfig(typeof args.flags.config === 'string' ? args.flags.config : undefined);

  const client = new NotionClient({
    token: process.env.NOTION_TOKEN,
    version: process.env.NOTION_VERSION || undefined,
    logger,
  });

  switch (args.command) {
    case 'discover': return commandDiscover(config, client);
    case 'run': return commandRun(config, client, args.flags);
    case 'clean': return commandClean(config, client, args.flags);
    default:
      logger.error(`Unknown command "${args.command}". Use "discover" or "run".`);
      process.exitCode = 1;
  }
}

// Only run when invoked directly, so tests can import the pipeline.
const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    logger.error(error.message);
    if (process.env.DEBUG) console.error(error);
    process.exitCode = 1;
  });
}
