/**
 * An offline stand-in for the Notion API.
 *
 * Shapes mirror the real REST responses closely enough to exercise the whole
 * pipeline — client, parsers, maths and renderers — with no network and no
 * workspace. Numbers deliberately echo the handoff so output can be sanity
 * checked against figures Daniel already recognises.
 */

import { loadConfig } from '../src/config.js';

// Derived from the real config rather than hardcoded: an ID corrected in
// config.json must never silently stop matching the fixtures.
const config = await loadConfig();

const FOOD_DB = config.foodLog.databaseId;
const NOTES_DB = config.weightLog.databaseId;
const TASKS_DB = config.tasks.databaseId;
const MAINTENANCE_NOTE = config.targets.sources[0].pageId;
const TARGETS_NOTE = config.targets.sources[1].pageId;

export const IDS = { FOOD_DB, NOTES_DB, TASKS_DB, MAINTENANCE_NOTE, TARGETS_NOTE };

let counter = 0;
const nextId = () => `page-${(counter += 1)}`;

function title(value) {
  return { type: 'title', title: [{ plain_text: value }] };
}
function number(value) {
  return { type: 'number', number: value };
}
function date(value) {
  return { type: 'date', date: value === null ? null : { start: value } };
}
function select(value) {
  return { type: 'select', select: value === null ? null : { name: value } };
}
function multiSelect(values) {
  return { type: 'multi_select', multi_select: values.map((name) => ({ name })) };
}
function checkbox(value) {
  return { type: 'checkbox', checkbox: value };
}
function relation(ids) {
  return { type: 'relation', relation: ids.map((id) => ({ id })) };
}

function page(properties, createdDay) {
  return {
    object: 'page',
    id: nextId(),
    created_time: `${createdDay}T09:00:00.000Z`,
    url: `https://notion.so/${nextId()}`,
    properties,
  };
}

/** Seven days ending 28 Aug 2026, with 25 August deliberately unlogged. */
const FOOD_DAYS = [
  { day: '2026-08-22', calories: 2380, protein: 128, fibre: 22, fat: 84, carbs: 210, meals: 3 },
  { day: '2026-08-23', calories: 2510, protein: 118, fibre: 18, fat: 96, carbs: 240, meals: 3 },
  { day: '2026-08-24', calories: 2140, protein: 152, fibre: 29, fat: 71, carbs: 185, meals: 4 },
  { day: '2026-08-26', calories: 2060, protein: 161, fibre: 33, fat: 66, carbs: 170, meals: 4 },
  { day: '2026-08-27', calories: 2210, protein: 144, fibre: 27, fat: 74, carbs: 195, meals: 3 },
  { day: '2026-08-28', calories: 2295, protein: 139, fibre: 24, fat: 79, carbs: 205, meals: 3 },
];

function foodRows() {
  const rows = [];
  for (const entry of FOOD_DAYS) {
    // Split each day across its meals so the aggregation is genuinely exercised.
    for (let meal = 0; meal < entry.meals; meal += 1) {
      const share = meal === entry.meals - 1
        ? 1 - (Math.floor((1 / entry.meals) * 100) / 100) * (entry.meals - 1)
        : Math.floor((1 / entry.meals) * 100) / 100;
      rows.push(page({
        Item: title(`Meal ${meal + 1} on ${entry.day}`),
        Calories: number(Math.round(entry.calories * share)),
        'Protein (g)': number(Math.round(entry.protein * share)),
        'Fibre (g)': number(Math.round(entry.fibre * share)),
        'Fat (g)': number(Math.round(entry.fat * share)),
        'Carbs (g)': number(Math.round(entry.carbs * share)),
        'Effective date': date(entry.day),
        'Logged for': date(entry.day),
      }, entry.day));
    }
  }
  return rows;
}

const WEIGHTS = [
  ['2026-08-01', 82.5], ['2026-08-05', 82.2], ['2026-08-08', 82.0], ['2026-08-12', 81.8],
  ['2026-08-15', 81.6], ['2026-08-18', 81.4], ['2026-08-22', 81.2], ['2026-08-23', 81.7],
  ['2026-08-24', 81.7], ['2026-08-26', 80.45], ['2026-08-27', 80.45], ['2026-08-28', 80.8],
];

function weightRows() {
  return WEIGHTS.map(([day, kg]) => page({
    Name: title(`${kg} kg — ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}`),
  }, day));
}

const PROJECT_IDS = new Map();

/**
 * Mirrors the real All tasks schema: the title is "Task", completion is a
 * checkbox whose name carries an invisible prefix, the project is a relation,
 * and priority comes from the Eisenhower multi-select.
 */
function task(name, due, project, { done = false, priority = null } = {}) {
  if (!PROJECT_IDS.has(project)) PROJECT_IDS.set(project, `project-${PROJECT_IDS.size + 1}`);

  const properties = {
    Task: title(name),
    Due: date(due),
    '\uFEFFDone': checkbox(done),
    Project: relation([PROJECT_IDS.get(project)]),
  };
  if (priority) properties['Do, delete, delegate, automate'] = multiSelect([priority]);
  return page(properties, '2026-08-20');
}

export function projectTitleFor(id) {
  return [...PROJECT_IDS.entries()].find(([, value]) => value === id)?.[0] ?? null;
}

function taskRows() {
  return [
    task('Week 4: 7-day average weight at or below 80.1 kg', '2026-09-06', 'Weight goal'),
    task('Week 3: 7-day average weight at or below 80.7 kg', '2026-08-28', 'Weight goal'),
    task('Send Q4 pricing proposal to Novartis', '2026-09-02', 'Client development', { priority: 'Do' }),
    task('Sign off new consultant contracts', '2026-08-27', 'Operations', { priority: 'Do' }),
    task('Review candidate shortlist for CFO search', '2026-09-03', 'CFO search'),
    task('Prepare board pack', '2026-09-04', 'Operations'),
    task('Daily check email triage', '2026-09-01', 'Operations'),
    task('Weekly timesheet approval', '2026-09-04', 'Operations'),
    task('Already finished thing', '2026-09-01', 'Operations', { done: true }),
  ];
}

const NOTE_CONTENT = {
  [MAINTENANCE_NOTE]: [
    'Maintenance calories: 2,600 kcal (updated 12 August 2026)',
    'Recalculated after the summer break. Revisit in October.',
  ],
  [TARGETS_NOTE]: [
    'Fat loss target: 2,200 kcal/day',
    'Protein target: 150 g',
    'Fibre target: 30 g',
  ],
};

const NOTE_TITLES = {
  [MAINTENANCE_NOTE]: 'Maintenance calories',
  [TARGETS_NOTE]: 'Food analysis',
};

const DB_ROWS = {
  [FOOD_DB]: foodRows,
  [NOTES_DB]: weightRows,
  [TASKS_DB]: taskRows,
};

/** A fetch implementation that answers Notion REST calls from the fixtures above. */
export function createFakeNotionFetch({ onRequest } = {}) {
  return async function fakeFetch(url, options = {}) {
    const path = url.replace('https://api.notion.com/v1', '');
    onRequest?.(options.method ?? 'GET', path);

    const ok = (body) => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => body,
      text: async () => JSON.stringify(body),
    });

    const queryMatch = /^\/databases\/([^/]+)\/query$/.exec(path);
    if (queryMatch) {
      const factory = DB_ROWS[queryMatch[1]];
      if (!factory) return notFound(path);
      return ok({ object: 'list', results: factory(), has_more: false, next_cursor: null });
    }

    const pageMatch = /^\/pages\/([^/?]+)$/.exec(path);
    if (pageMatch) {
      const id = pageMatch[1];
      return ok({
        object: 'page',
        id,
        properties: { Name: title(projectTitleFor(id) ?? NOTE_TITLES[id] ?? 'Untitled') },
        last_edited_time: '2026-08-12T10:00:00.000Z',
      });
    }

    const childrenMatch = /^\/blocks\/([^/?]+)\/children/.exec(path);
    if (childrenMatch) {
      const lines = NOTE_CONTENT[childrenMatch[1]] ?? [];
      return ok({
        object: 'list',
        results: lines.map((line, index) => ({
          object: 'block',
          id: `block-${childrenMatch[1]}-${index}`,
          type: 'paragraph',
          has_children: false,
          paragraph: { rich_text: [{ plain_text: line }] },
        })),
        has_more: false,
        next_cursor: null,
      });
    }

    return notFound(path);
  };

  function notFound(path) {
    return {
      ok: false,
      status: 404,
      headers: new Map(),
      json: async () => ({ code: 'object_not_found', message: `No fixture for ${path}` }),
      text: async () => `No fixture for ${path}`,
    };
  }
}

export const EXPECTED = {
  loggedDays: 6,
  meanCalories: Math.round(FOOD_DAYS.reduce((sum, day) => sum + day.calories, 0) / FOOD_DAYS.length),
};
