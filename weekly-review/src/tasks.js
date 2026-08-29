/**
 * Block 4: key tasks for the next seven days.
 *
 * Grouping and prioritising are done here, in code. The model only turns the
 * resulting structure into prose, so task titles — which are untrusted text —
 * never decide what ends up in the "big three".
 */

import { readCheckbox, readDate, readMultiSelectNames, readRelationIds, readSelectName, readTitle } from './notion.js';
import { addDays, compareDays, daysBetween, diffDays, isoWeekday } from './util/date.js';

/** The next seven days, starting tomorrow, weekend included. */
export function taskWindow(referenceDay, lengthDays = 7) {
  const start = addDays(referenceDay, 1);
  return { start, end: addDays(start, lengthDays - 1), lengthDays };
}

function looksRoutine(title, hints) {
  const lower = title.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

/** Resolve a task's project name, whether the property is a select or a relation. */
async function resolveProject(client, page, tasksConfig, cache) {
  const direct = readSelectName(page, tasksConfig.projectProperty);
  if (direct) return direct;

  const relationIds = readRelationIds(page, tasksConfig.projectProperty);
  if (!relationIds.length) return null;

  const id = relationIds[0];
  if (!cache.has(id)) {
    try {
      const related = await client.getPage(id);
      cache.set(id, readTitle(related) || null);
    } catch {
      cache.set(id, null);
    }
  }
  return cache.get(id);
}

export async function computeTasks({ client, pages, config, referenceDay }) {
  const tasksConfig = config.tasks;
  const window = taskWindow(referenceDay, 7);
  const doneStatuses = tasksConfig.doneStatuses.map((status) => status.toLowerCase());
  const projectCache = new Map();

  // Weight milestones live in the same database but belong to the nutrition
  // section; listing them here would show "Week 3: ... 80.7 kg" as an overdue task.
  const milestonePattern = config.goal?.milestoneSearch?.titlePattern
    ? new RegExp(config.goal.milestoneSearch.titlePattern, 'i')
    : null;

  const items = [];
  let milestonesExcluded = 0;

  for (const page of pages) {
    const title = readTitle(page);
    if (!title) continue;

    if (milestonePattern?.test(title)) {
      milestonesExcluded += 1;
      continue;
    }

    // Completion is a checkbox in this workspace, but a status select is the
    // more common shape, so both are supported and either may be configured.
    const done = readCheckbox(page, tasksConfig.doneProperty);
    const status = readSelectName(page, tasksConfig.statusProperty);
    const isDone = done === true
      || (status ? doneStatuses.includes(status.toLowerCase()) : false);
    if (isDone) continue;

    const due = readDate(page, tasksConfig.dueProperty)?.slice(0, 10) ?? null;

    const priorityNames = [
      readSelectName(page, tasksConfig.priorityProperty),
      ...readMultiSelectNames(page, tasksConfig.priorityProperty),
    ].filter(Boolean);
    const isHighPriority = priorityNames.some((name) =>
      tasksConfig.highPriorityValues.some((value) => value.toLowerCase() === name.toLowerCase()));

    items.push({
      id: page.id,
      title,
      url: page.url ?? null,
      status,
      due,
      priority: priorityNames[0] ?? null,
      isHighPriority,
      routine: looksRoutine(title, tasksConfig.routineHints),
      project: await resolveProject(client, page, tasksConfig, projectCache),
    });
  }

  const overdue = items
    .filter((item) => item.due && compareDays(item.due, referenceDay) < 0)
    .sort((a, b) => compareDays(a.due, b.due));

  const inWindow = items
    .filter((item) => item.due
      && compareDays(item.due, window.start) >= 0
      && compareDays(item.due, window.end) <= 0)
    .sort((a, b) => compareDays(a.due, b.due));

  const undated = items.filter((item) => !item.due);

  const substantive = [...overdue, ...inWindow].filter((item) => !item.routine);
  const routine = [...overdue, ...inWindow].filter((item) => item.routine);

  // The big three: overdue beats due-soon, high priority beats normal.
  const bigThree = [...substantive]
    .sort((a, b) => {
      const overdueRank = (item) => (compareDays(item.due, referenceDay) < 0 ? 0 : 1);
      if (overdueRank(a) !== overdueRank(b)) return overdueRank(a) - overdueRank(b);
      if (a.isHighPriority !== b.isHighPriority) return a.isHighPriority ? -1 : 1;
      return compareDays(a.due, b.due);
    })
    .slice(0, 3);

  const byProject = new Map();
  for (const item of substantive) {
    const key = item.project ?? 'Unassigned';
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key).push(item);
  }

  const workingDays = daysBetween(window.start, window.end).filter((day) => isoWeekday(day) <= 5).length;
  const perWorkingDay = workingDays ? substantive.length / workingDays : substantive.length;
  const load = perWorkingDay <= 2 ? 'light' : perWorkingDay <= 4 ? 'reasonable' : 'heavy';

  return {
    window,
    counts: {
      total: items.length,
      dueInWindow: inWindow.length,
      overdue: overdue.length,
      substantive: substantive.length,
      routine: routine.length,
      undated: undated.length,
      milestonesExcluded,
    },
    bigThree: bigThree.map((item) => ({
      title: item.title,
      due: item.due,
      daysAway: diffDays(referenceDay, item.due),
      project: item.project,
      priority: item.priority,
      overdue: compareDays(item.due, referenceDay) < 0,
    })),
    byProject: [...byProject.entries()]
      .map(([project, list]) => ({
        project,
        count: list.length,
        items: list.slice(0, 6).map((item) => ({ title: item.title, due: item.due })),
      }))
      .sort((a, b) => b.count - a.count),
    overdue: overdue.slice(0, 8).map((item) => ({
      title: item.title,
      due: item.due,
      daysLate: diffDays(item.due, referenceDay),
      project: item.project,
    })),
    realism: {
      workingDays,
      substantivePerWorkingDay: Math.round(perWorkingDay * 10) / 10,
      load,
    },
  };
}
