/**
 * An offline stand-in for the Notion API.
 *
 * Shapes mirror the real REST responses closely enough to exercise the whole
 * pipeline — client, parsers, maths and renderers — with no network and no
 * workspace. Numbers deliberately echo the handoff so output can be sanity
 * checked against figures Daniel already recognises.
 */

const FOOD_DB = '382ee9fd-1543-8173-9181-c53d205152aa';
const NOTES_DB = '6905399d-89b8-4580-80c2-90a917b1e20c';
const TASKS_DB = '845be900-d560-4da0-bf7e-b228bd811df1';
const MAINTENANCE_NOTE = 'fb74074b-4a94-4abd-81dd-b4a45db04aba';
const TARGETS_NOTE = '32bee9fd-1543-8052-bbd7-eb8c6590eb63';

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

function taskRows() {
  return [
    page({
      Name: title('Week 4: 7-day average weight at or below 80.1 kg'),
      Due: date('2026-09-06'), Status: select('Not started'), Project: select('Weight goal'),
    }, '2026-08-01'),
    page({
      Name: title('Week 3: 7-day average weight at or below 80.7 kg'),
      Due: date('2026-08-28'), Status: select('Not started'), Project: select('Weight goal'),
    }, '2026-08-01'),
    page({
      Name: title('Send Q4 pricing proposal to Novartis'),
      Due: date('2026-09-02'), Status: select('In progress'), Project: select('Client development'),
      Priority: select('High'),
    }, '2026-08-20'),
    page({
      Name: title('Sign off new consultant contracts'),
      Due: date('2026-08-27'), Status: select('In progress'), Project: select('Operations'),
      Priority: select('High'),
    }, '2026-08-14'),
    page({
      Name: title('Review candidate shortlist for CFO search'),
      Due: date('2026-09-03'), Status: select('Not started'), Project: select('CFO search'),
    }, '2026-08-22'),
    page({
      Name: title('Prepare board pack'),
      Due: date('2026-09-04'), Status: select('Not started'), Project: select('Operations'),
    }, '2026-08-25'),
    page({
      Name: title('Daily check email triage'),
      Due: date('2026-09-01'), Status: select('Not started'), Project: select('Operations'),
    }, '2026-08-25'),
    page({
      Name: title('Weekly timesheet approval'),
      Due: date('2026-09-04'), Status: select('Not started'), Project: select('Operations'),
    }, '2026-08-25'),
    page({
      Name: title('Already finished thing'),
      Due: date('2026-09-01'), Status: select('Done'), Project: select('Operations'),
    }, '2026-08-25'),
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
        properties: { Name: title(NOTE_TITLES[id] ?? 'Untitled') },
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
