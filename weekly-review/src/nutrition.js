/**
 * Block 1: fitness and nutrition review.
 *
 * Every number here is computed from Notion rows, never inferred by a model.
 * Two deliberate choices worth knowing about:
 *
 * 1. Calorie and macro averages are taken over days that actually have food
 *    entries, not over all seven calendar days. Averaging over calendar days
 *    would treat an unlogged day as a zero-calorie day and flatter the deficit.
 *    Logging coverage is reported and graded separately instead.
 *
 * 2. The weight trend used for grading comes from a least-squares fit over the
 *    longer trend window (28 days by default), because seven daily weigh-ins
 *    are far too noisy to grade on. The seven-day figure is still reported.
 */

import { readDate, readNumber, readTitle } from './notion.js';
import { addDays, compareDays, daysBetween, diffDays, instantToDay } from './util/date.js';
import { linearSlope, mean, parseDateInText, round } from './util/parse.js';

const GRADE_POINTS = { A: 4, B: 3, C: 2, D: 1, F: 0 };

/** The seven completed days ending yesterday, relative to `referenceDay`. */
export function reviewWindow(referenceDay, lengthDays = 7) {
  const end = addDays(referenceDay, -1);
  return { start: addDays(end, -(lengthDays - 1)), end, lengthDays };
}

/** Resolve which calendar day a food row belongs to, honouring date precedence. */
export function foodRowDay(page, foodConfig, timezone) {
  for (const property of foodConfig.dateProperties) {
    const value = readDate(page, property);
    if (value) return value.slice(0, 10);
  }
  if (foodConfig.fallbackToCreatedTime && page.created_time) {
    return instantToDay(page.created_time, timezone);
  }
  return null;
}

/** Aggregate food rows into per-day totals across the window. */
export function summariseFood(pages, foodConfig, window, timezone) {
  const byDay = new Map(
    daysBetween(window.start, window.end).map((day) => [
      day,
      { day, entries: 0, calories: 0, protein: 0, fibre: 0, fat: 0, carbs: 0, sugar: 0 },
    ]),
  );

  let skipped = 0;

  for (const page of pages) {
    const day = foodRowDay(page, foodConfig, timezone);
    if (!day || !byDay.has(day)) {
      skipped += 1;
      continue;
    }

    const bucket = byDay.get(day);
    bucket.entries += 1;
    for (const [key, propertyName] of Object.entries(foodConfig.numberProperties)) {
      const value = readNumber(page, propertyName);
      if (typeof value === 'number') bucket[key] += value;
    }
  }

  const days = [...byDay.values()];
  const loggedDays = days.filter((day) => day.entries > 0);

  return {
    days,
    loggedDays,
    skippedRows: skipped,
    daysWithEntries: loggedDays.length,
    totalEntries: loggedDays.reduce((sum, day) => sum + day.entries, 0),
    averages: {
      calories: round(mean(loggedDays.map((day) => day.calories)), 0),
      protein: round(mean(loggedDays.map((day) => day.protein)), 1),
      fibre: round(mean(loggedDays.map((day) => day.fibre)), 1),
      fat: round(mean(loggedDays.map((day) => day.fat)), 1),
      carbs: round(mean(loggedDays.map((day) => day.carbs)), 1),
    },
    totals: {
      calories: round(loggedDays.reduce((sum, day) => sum + day.calories, 0), 0),
    },
  };
}

/** Parse weight entries. Prefers real properties; falls back to parsing titles. */
export function parseWeightEntries(pages, weightConfig, timezone) {
  const entries = [];

  for (const page of pages) {
    const title = readTitle(page);

    let kg = weightConfig.numberProperty ? readNumber(page, weightConfig.numberProperty) : null;
    if (kg === null) {
      const match = /(\d{2,3}(?:[.,]\d{1,2})?)\s*kg/i.exec(title);
      if (match) kg = Number(match[1].replace(',', '.'));
    }
    if (typeof kg !== 'number' || !Number.isFinite(kg) || kg < 40 || kg > 200) continue;

    let day = weightConfig.dateProperty ? readDate(page, weightConfig.dateProperty)?.slice(0, 10) : null;
    day ??= parseDateInText(title);
    day ??= instantToDay(page.created_time, timezone);
    if (!day) continue;

    entries.push({ day, kg, title });
  }

  // One weigh-in per day: if a day has several, average them.
  const byDay = new Map();
  for (const entry of entries) {
    if (!byDay.has(entry.day)) byDay.set(entry.day, []);
    byDay.get(entry.day).push(entry.kg);
  }

  return [...byDay.entries()]
    .map(([day, values]) => ({ day, kg: round(mean(values), 2) }))
    .sort((a, b) => compareDays(a.day, b.day));
}

export function summariseWeight(entries, window, trendWindowDays) {
  const inWindow = entries.filter(
    (entry) => compareDays(entry.day, window.start) >= 0 && compareDays(entry.day, window.end) <= 0,
  );

  const previousStart = addDays(window.start, -window.lengthDays);
  const previous = entries.filter(
    (entry) => compareDays(entry.day, previousStart) >= 0 && compareDays(entry.day, window.start) < 0,
  );

  const trendStart = addDays(window.end, -(trendWindowDays - 1));
  const trendEntries = entries.filter(
    (entry) => compareDays(entry.day, trendStart) >= 0 && compareDays(entry.day, window.end) <= 0,
  );

  const slopePerDay = linearSlope(
    trendEntries.map((entry) => ({ x: diffDays(trendStart, entry.day), y: entry.kg })),
  );
  const weeklySlope = slopePerDay === null ? null : slopePerDay * 7;

  const periodAverage = mean(inWindow.map((entry) => entry.kg));
  const previousAverage = mean(previous.map((entry) => entry.kg));

  let direction = 'unknown';
  if (weeklySlope !== null) {
    if (weeklySlope <= -0.1) direction = 'down';
    else if (weeklySlope >= 0.1) direction = 'up';
    else direction = 'flat';
  }

  return {
    latest: inWindow.length ? inWindow[inWindow.length - 1] : (entries[entries.length - 1] ?? null),
    periodAverage: round(periodAverage, 2),
    previousAverage: round(previousAverage, 2),
    weekOnWeekChange: periodAverage !== null && previousAverage !== null
      ? round(periodAverage - previousAverage, 2)
      : null,
    observedKgPerWeek: round(weeklySlope, 3),
    direction,
    readingsInWindow: inWindow.length,
    readingsInTrend: trendEntries.length,
    trendWindowDays,
  };
}

/** Milestones are task rows titled like "Week 4: 7-day average weight at or below 80.1 kg". */
export function parseMilestones(pages, goalConfig, tasksConfig) {
  const pattern = new RegExp(goalConfig.milestoneSearch.titlePattern, 'i');
  const milestones = [];

  for (const page of pages) {
    const title = readTitle(page);
    const match = pattern.exec(title);
    if (!match) continue;

    const due = readDate(page, tasksConfig.dueProperty)?.slice(0, 10) ?? parseDateInText(title);
    if (!due) continue;

    milestones.push({ title, due, targetKg: Number(match[1].replace(',', '.')) });
  }

  return milestones.sort((a, b) => compareDays(a.due, b.due));
}

function gradeFromRatio(ratio, thresholds) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return null;
  if (ratio >= thresholds.A) return 'A';
  if (ratio >= thresholds.B) return 'B';
  if (ratio >= thresholds.C) return 'C';
  if (ratio >= thresholds.D) return 'D';
  return 'F';
}

/** Assemble the full nutrition fact set. Pure: everything is passed in. */
export function computeNutrition({ food, weight, milestones, targets, window, config, referenceDay }) {
  const grading = config.grading;
  const maintenance = targets.values.maintenanceKcal;
  const targetKcal = targets.values.targetKcal;

  const avgKcal = food.averages.calories;
  const deficitVsMaintenance = avgKcal === null || maintenance === null ? null : maintenance - avgKcal;
  const deficitVsTarget = avgKcal === null || targetKcal === null ? null : targetKcal - avgKcal;

  let position = 'unknown';
  if (deficitVsMaintenance !== null) {
    if (deficitVsMaintenance > grading.intakeBandKcal) position = 'below maintenance';
    else if (deficitVsMaintenance < -grading.intakeBandKcal) position = 'above maintenance';
    else position = 'around maintenance';
  }

  const predictedKgPerWeek = deficitVsMaintenance === null
    ? null
    : round(-(deficitVsMaintenance * 7) / grading.kcalPerKgFat, 3);

  const plannedKgPerWeek = maintenance === null || targetKcal === null
    ? null
    : round(-((maintenance - targetKcal) * 7) / grading.kcalPerKgFat, 3);

  const observedKgPerWeek = weight.observedKgPerWeek;

  // Cross-check: does the scale agree with the food log?
  let crossCheck = { agreement: 'unknown', note: 'Not enough data to cross-check.' };
  if (predictedKgPerWeek !== null && observedKgPerWeek !== null) {
    const gap = Math.abs(observedKgPerWeek - predictedKgPerWeek);
    if (gap <= 0.25) {
      crossCheck = { agreement: 'consistent', gap: round(gap, 2), note: 'Scale and food log agree.' };
    } else if (observedKgPerWeek > predictedKgPerWeek) {
      crossCheck = {
        agreement: 'diverging',
        gap: round(gap, 2),
        note: 'The scale is moving more slowly than the food log predicts — likely under-logging, or water retention.',
      };
    } else {
      crossCheck = {
        agreement: 'diverging',
        gap: round(gap, 2),
        note: 'The scale is falling faster than the food log predicts — possibly a glycogen or water drop.',
      };
    }
  }

  const lastPassed = [...milestones].reverse().find((m) => compareDays(m.due, window.end) <= 0) ?? null;
  const next = milestones.find((m) => compareDays(m.due, window.end) > 0) ?? null;
  const currentAverage = weight.periodAverage;

  const milestoneStatus = {
    lastPassed: lastPassed && {
      ...lastPassed,
      met: currentAverage === null ? null : currentAverage <= lastPassed.targetKg,
      gapKg: currentAverage === null ? null : round(currentAverage - lastPassed.targetKg, 2),
    },
    next: next && {
      ...next,
      daysAway: diffDays(referenceDay, next.due),
      gapKg: currentAverage === null ? null : round(currentAverage - next.targetKg, 2),
    },
  };

  const daysToDeadline = diffDays(referenceDay, config.goal.deadline);
  const kgToGo = currentAverage === null ? null : round(currentAverage - config.goal.targetWeightKg, 2);
  const requiredKgPerWeek = kgToGo === null || daysToDeadline <= 0
    ? null
    : round(kgToGo / (daysToDeadline / 7), 3);

  // Grades.
  const fatLossRatio = plannedKgPerWeek === null || observedKgPerWeek === null || plannedKgPerWeek === 0
    ? null
    : Math.max(0, observedKgPerWeek / plannedKgPerWeek); // both negative when losing
  const proteinRatio = targets.values.proteinTargetG
    ? food.averages.protein / targets.values.proteinTargetG
    : null;
  const fibreRatio = targets.values.fibreTargetG
    ? food.averages.fibre / targets.values.fibreTargetG
    : null;
  const loggingRatio = food.daysWithEntries / grading.loggingDaysForFullCredit;

  const grades = {
    fatLoss: gradeFromRatio(fatLossRatio, grading.fatLoss),
    protein: gradeFromRatio(proteinRatio, grading.protein),
    fibre: gradeFromRatio(fibreRatio, grading.fibre),
    logging: gradeFromRatio(loggingRatio, { A: 1, B: 0.85, C: 0.7, D: 0.5 }),
  };

  const awarded = Object.values(grades).filter(Boolean);
  const overallPoints = awarded.length ? mean(awarded.map((grade) => GRADE_POINTS[grade])) : null;
  grades.overall = overallPoints === null
    ? null
    : (['F', 'D', 'C', 'B', 'A'][Math.round(overallPoints)] ?? null);

  // Headline verdict.
  let verdict = 'unknown';
  if (requiredKgPerWeek !== null && observedKgPerWeek !== null) {
    const requiredLoss = requiredKgPerWeek;
    const observedLoss = -observedKgPerWeek;
    if (observedLoss >= requiredLoss * 0.95) verdict = 'on track';
    else if (observedLoss >= requiredLoss * 0.5) verdict = 'slightly behind';
    else verdict = 'off track';
  }

  return {
    window,
    verdict,
    logging: {
      daysWithEntries: food.daysWithEntries,
      ofDays: window.lengthDays,
      totalEntries: food.totalEntries,
      skippedRows: food.skippedRows,
      complete: food.daysWithEntries === window.lengthDays,
    },
    intake: {
      avgCaloriesPerLoggedDay: food.averages.calories,
      avgProteinG: food.averages.protein,
      avgFibreG: food.averages.fibre,
      avgFatG: food.averages.fat,
      avgCarbsG: food.averages.carbs,
    },
    targets: {
      maintenanceKcal: maintenance,
      targetKcal,
      proteinTargetG: targets.values.proteinTargetG,
      fibreTargetG: targets.values.fibreTargetG,
      provenance: targets.provenance,
    },
    balance: {
      position,
      deficitVsMaintenance: round(deficitVsMaintenance, 0),
      deficitVsTarget: round(deficitVsTarget, 0),
      predictedKgPerWeek,
      plannedKgPerWeek,
    },
    weight,
    crossCheck,
    milestones: milestoneStatus,
    goal: {
      ...config.goal,
      currentSevenDayAverage: currentAverage,
      kgToGo,
      daysToDeadline,
      requiredKgPerWeek,
    },
    grades,
    dailyBreakdown: food.days.map((day) => ({
      day: day.day,
      calories: round(day.calories, 0),
      protein: round(day.protein, 0),
      fibre: round(day.fibre, 0),
      entries: day.entries,
    })),
  };
}
