import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeNutrition, foodRowDay, parseMilestones, parseWeightEntries,
  reviewWindow, summariseFood, summariseWeight,
} from '../src/nutrition.js';

const FOOD_CONFIG = {
  dateProperties: ['Effective date', 'Logged for'],
  fallbackToCreatedTime: true,
  numberProperties: {
    calories: 'Calories', protein: 'Protein (g)', fibre: 'Fibre (g)',
    fat: 'Fat (g)', carbs: 'Carbs (g)',
  },
};

const foodRow = (day, calories, protein, fibre, dateProperty = 'Effective date') => ({
  id: `${day}-${calories}`,
  created_time: `${day}T10:00:00.000Z`,
  properties: {
    Item: { type: 'title', title: [{ plain_text: 'Meal' }] },
    Calories: { type: 'number', number: calories },
    'Protein (g)': { type: 'number', number: protein },
    'Fibre (g)': { type: 'number', number: fibre },
    [dateProperty]: { type: 'date', date: { start: day } },
  },
});

test('the review window is the seven completed days ending yesterday', () => {
  assert.deepEqual(reviewWindow('2026-08-29'), {
    start: '2026-08-22', end: '2026-08-28', lengthDays: 7,
  });
});

test('date precedence prefers Effective date, then Logged for, then created time', () => {
  const withEffective = foodRow('2026-08-24', 100, 10, 2);
  withEffective.properties['Logged for'] = { type: 'date', date: { start: '2026-08-01' } };
  assert.equal(foodRowDay(withEffective, FOOD_CONFIG, 'Europe/Zurich'), '2026-08-24');

  const loggedOnly = foodRow('2026-08-24', 100, 10, 2, 'Logged for');
  assert.equal(foodRowDay(loggedOnly, FOOD_CONFIG, 'Europe/Zurich'), '2026-08-24');

  const createdOnly = { id: 'x', created_time: '2026-08-24T22:30:00.000Z', properties: {} };
  assert.equal(foodRowDay(createdOnly, FOOD_CONFIG, 'Europe/Zurich'), '2026-08-25');
});

test('averages are taken over logged days, not calendar days', () => {
  const window = reviewWindow('2026-08-29');
  const summary = summariseFood(
    [foodRow('2026-08-22', 2000, 100, 20), foodRow('2026-08-23', 3000, 200, 40)],
    FOOD_CONFIG, window, 'Europe/Zurich',
  );

  assert.equal(summary.daysWithEntries, 2);
  // 2500, not 714 - an unlogged day is unknown, not zero.
  assert.equal(summary.averages.calories, 2500);
  assert.equal(summary.averages.protein, 150);
});

test('multiple rows on one day are summed', () => {
  const window = reviewWindow('2026-08-29');
  const summary = summariseFood(
    [foodRow('2026-08-22', 800, 40, 8), foodRow('2026-08-22', 700, 35, 7)],
    FOOD_CONFIG, window, 'Europe/Zurich',
  );
  assert.equal(summary.daysWithEntries, 1);
  assert.equal(summary.averages.calories, 1500);
});

test('rows outside the window are skipped, not counted', () => {
  const window = reviewWindow('2026-08-29');
  const summary = summariseFood([foodRow('2026-07-01', 2000, 100, 20)], FOOD_CONFIG, window, 'Europe/Zurich');
  assert.equal(summary.daysWithEntries, 0);
  assert.equal(summary.skippedRows, 1);
});

const weightPage = (titleText) => ({
  id: titleText,
  created_time: '2026-08-28T08:00:00.000Z',
  properties: { Name: { type: 'title', title: [{ plain_text: titleText }] } },
});

test('weight entries are parsed out of page titles', () => {
  const entries = parseWeightEntries(
    [weightPage('80.8 kg — 28 August 2026'), weightPage('81.2 kg — 22 August 2026')],
    { titleContains: 'kg', numberProperty: null, dateProperty: null }, 'Europe/Zurich',
  );
  assert.deepEqual(entries, [
    { day: '2026-08-22', kg: 81.2 },
    { day: '2026-08-28', kg: 80.8 },
  ]);
});

test('implausible weights are rejected', () => {
  const entries = parseWeightEntries(
    [weightPage('5 kg of potatoes — 28 August 2026'), weightPage('800 kg — 28 August 2026')],
    { titleContains: 'kg', numberProperty: null, dateProperty: null }, 'Europe/Zurich',
  );
  assert.equal(entries.length, 0);
});

test('a numeric property is preferred over the title when configured', () => {
  const page = weightPage('80.8 kg — 28 August 2026');
  page.properties.Weight = { type: 'number', number: 79.4 };
  page.properties.Date = { type: 'date', date: { start: '2026-08-27' } };
  const entries = parseWeightEntries([page], {
    titleContains: 'kg', numberProperty: 'Weight', dateProperty: 'Date',
  }, 'Europe/Zurich');
  assert.deepEqual(entries, [{ day: '2026-08-27', kg: 79.4 }]);
});

test('a falling weight series produces a negative weekly slope', () => {
  const entries = [
    { day: '2026-08-01', kg: 82.5 }, { day: '2026-08-08', kg: 82.0 },
    { day: '2026-08-15', kg: 81.6 }, { day: '2026-08-22', kg: 81.2 },
    { day: '2026-08-28', kg: 80.8 },
  ];
  const summary = summariseWeight(entries, reviewWindow('2026-08-29'), 28);
  assert.ok(summary.observedKgPerWeek < 0);
  assert.equal(summary.direction, 'down');
  assert.equal(summary.latest.kg, 80.8);
});

test('milestones are read from task titles with their due dates', () => {
  const milestones = parseMilestones(
    [{
      id: 'm1',
      properties: {
        Name: { type: 'title', title: [{ plain_text: 'Week 4: 7-day average weight at or below 80.1 kg' }] },
        Due: { type: 'date', date: { start: '2026-09-06' } },
      },
    }],
    { milestoneSearch: { titlePattern: '7-day average weight at or below\\s*([0-9]+(?:[.,][0-9]+)?)\\s*kg' } },
    { dueProperty: 'Due' },
  );
  assert.deepEqual(milestones, [{
    title: 'Week 4: 7-day average weight at or below 80.1 kg',
    due: '2026-09-06',
    targetKg: 80.1,
  }]);
});

const BASE_CONFIG = {
  grading: {
    intakeBandKcal: 100, kcalPerKgFat: 7700,
    protein: { A: 1.0, B: 0.9, C: 0.8, D: 0.65 },
    fibre: { A: 1.0, B: 0.85, C: 0.7, D: 0.5 },
    fatLoss: { A: 1.0, B: 0.75, C: 0.5, D: 0.25 },
    loggingDaysForFullCredit: 7,
  },
  goal: { targetWeightKg: 78, deadline: '2026-10-18', description: 'below 78 kg' },
};

function buildFacts({ maintenance = 2600, avgCalories = 2265 } = {}) {
  const window = reviewWindow('2026-08-29');
  return computeNutrition({
    window,
    referenceDay: '2026-08-29',
    config: BASE_CONFIG,
    food: {
      daysWithEntries: 6, totalEntries: 20, skippedRows: 0, days: [],
      averages: { calories: avgCalories, protein: 140, fibre: 25, fat: 78, carbs: 200 },
    },
    weight: {
      periodAverage: 81.05, previousAverage: 81.6, observedKgPerWeek: -0.43,
      direction: 'down', latest: { day: '2026-08-28', kg: 80.8 },
      readingsInWindow: 6, readingsInTrend: 12, trendWindowDays: 28,
    },
    milestones: [{ title: 'Week 4', due: '2026-09-06', targetKg: 80.1 }],
    targets: {
      values: { maintenanceKcal: maintenance, targetKcal: 2200, proteinTargetG: 150, fibreTargetG: 30 },
      provenance: { maintenanceKcal: { description: 'from your note' } },
    },
  });
}

test('the deficit and its predicted weight change come from the note maintenance value', () => {
  const facts = buildFacts();
  assert.equal(facts.balance.deficitVsMaintenance, 335);
  assert.equal(facts.balance.position, 'below maintenance');
  // 335 kcal/day * 7 / 7700 = 0.3045 kg/week of loss.
  assert.equal(facts.balance.predictedKgPerWeek, -0.305);
});

test('changing the maintenance note changes the verdict, not the code', () => {
  const lower = buildFacts({ maintenance: 2300 });
  assert.equal(lower.balance.deficitVsMaintenance, 35);
  assert.equal(lower.balance.position, 'around maintenance');

  const higher = buildFacts({ maintenance: 2900 });
  assert.equal(higher.balance.deficitVsMaintenance, 635);
  assert.ok(higher.balance.predictedKgPerWeek < lower.balance.predictedKgPerWeek);
});

test('eating above maintenance is reported as such', () => {
  const facts = buildFacts({ avgCalories: 2900 });
  assert.equal(facts.balance.position, 'above maintenance');
  assert.ok(facts.balance.predictedKgPerWeek > 0);
});

test('grades and the goal maths line up with the inputs', () => {
  const facts = buildFacts();
  assert.equal(facts.grades.protein, 'B');   // 140/150 = 0.93
  assert.equal(facts.grades.fibre, 'C');     // 25/30  = 0.83
  assert.equal(facts.grades.logging, 'B');   // 6/7    = 0.86
  assert.equal(facts.goal.kgToGo, 3.05);
  assert.equal(facts.goal.daysToDeadline, 50);
  assert.equal(facts.milestones.next.targetKg, 80.1);
  assert.equal(facts.milestones.next.gapKg, 0.95);
});

test('the scale is cross-checked against the food log', () => {
  assert.equal(buildFacts().crossCheck.agreement, 'consistent');
  // Eating at maintenance while the scale drops fast is a divergence.
  const diverging = buildFacts({ avgCalories: 2590 });
  assert.equal(diverging.crossCheck.agreement, 'diverging');
});
