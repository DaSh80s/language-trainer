// Tests for the pure logic inside public/fuel/index.html. The app is a single
// self-contained file, so the logic block is cut out between its markers.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../public/fuel/index.html', import.meta.url), 'utf8');
const block = html.split('/*LOGIC-START*/')[1].split('/*LOGIC-END*/')[0];
const L = new Function(`${block}; return Logic;`)();

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exitCode = 1; } };
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} not near ${b}`);

test('dayKey uses the local day, not UTC', () => {
  assert.equal(L.dayKey(new Date(2026, 10, 10, 23, 30)), '2026-11-10');
  assert.equal(L.dayKey(new Date(2026, 10, 10, 0, 5)), '2026-11-10');
});
test('addDays crosses months, years and DST', () => {
  assert.equal(L.addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(L.addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(L.addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(L.addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(L.daysBetween('2026-03-01', '2026-04-01'), 31);
});
test('parseNum accepts Swiss and German number entry', () => {
  assert.equal(L.parseNum('80,5'), 80.5);
  assert.equal(L.parseNum("2'600"), 2600);
  assert.equal(L.parseNum(' 1.5 '), 1.5);
  assert.equal(L.parseNum('0'), 0);
  for (const bad of ['', 'abc', '12abc', '1.2.3', '--1']) assert.equal(L.parseNum(bad), null, bad);
});
const entries = [
  { day: '2026-11-10', name: 'Skyr', qty: 2, kcal: 100, protein: 17 },
  { day: '2026-11-10', name: 'Bread', qty: 1, kcal: 250, protein: 8, carbs: 45 },
  { day: '2026-11-08', name: 'Pizza', qty: 1, kcal: 900, protein: 30 },
];
test('dayTotals multiplies by portions and ignores other days', () => {
  const t = L.dayTotals(entries, '2026-11-10');
  assert.equal(t.kcal, 450); assert.equal(t.protein, 42); assert.equal(t.carbs, 45); assert.equal(t.fat, 0); assert.equal(t.entries, 2);
  assert.equal(L.dayTotals(entries, '2026-11-09').entries, 0);
});
test('target defaults to maintenance minus 400', () => {
  assert.equal(L.targetKcal({ maintenanceKcal: 2600 }), 2200);
  assert.equal(L.targetKcal({ maintenanceKcal: 2600, targetKcal: 2000 }), 2000);
  assert.equal(L.targetKcal({}), null);
});
test('week averages skip unlogged days rather than counting them as zero', () => {
  const w = L.weekSummary(entries, '2026-11-10', { maintenanceKcal: 2600 });
  assert.equal(w.days.length, 7); assert.equal(w.days[0].day, '2026-11-04'); assert.equal(w.days[6].day, '2026-11-10');
  assert.equal(w.daysLogged, 2);
  assert.equal(w.avgKcal, 675);
  assert.equal(w.balanceKcal, -1925);
  near(w.expectedKgPerWeek, -1925 * 7 / 7700);
});
test('an empty week reports nothing rather than zero', () => {
  const w = L.weekSummary([], '2026-11-10', { maintenanceKcal: 2600 });
  assert.equal(w.avgKcal, null); assert.equal(w.balanceKcal, null); assert.equal(w.expectedKgPerWeek, null);
});
test('weight trend is a least-squares slope in kg per week', () => {
  const ws = [0, 7, 14, 21].map((n, i) => ({ day: L.addDays('2026-10-20', n), kg: 82 - i * 0.5 }));
  const t = L.weightTrend(ws, '2026-11-10', 28);
  near(t.kgPerWeek, -0.5); assert.equal(t.readings, 4);
});
test('weight trend refuses thin data', () => {
  assert.equal(L.weightTrend([{ day: '2026-11-01', kg: 80 }, { day: '2026-11-10', kg: 79 }], '2026-11-10'), null);
  const close = ['2026-11-08', '2026-11-09', '2026-11-10'].map((day) => ({ day, kg: 80 }));
  assert.equal(L.weightTrend(close, '2026-11-10'), null);
  const old = ['2026-08-01', '2026-08-10', '2026-08-20'].map((day) => ({ day, kg: 80 }));
  assert.equal(L.weightTrend(old, '2026-11-10'), null);
});
test('seven-day weight average', () => {
  const ws = [{ day: '2026-11-03', kg: 90 }, { day: '2026-11-04', kg: 81 }, { day: '2026-11-10', kg: 80 }];
  assert.equal(L.weekAverageWeight(ws, '2026-11-10'), 80.5);
  assert.equal(L.weekAverageWeight([], '2026-11-10'), null);
});
test('streak survives an empty today but not a gap', () => {
  const mk = (...days) => days.map((day) => ({ day }));
  assert.equal(L.streak(mk('2026-11-10', '2026-11-09', '2026-11-08'), '2026-11-10'), 3);
  assert.equal(L.streak(mk('2026-11-09', '2026-11-08'), '2026-11-10'), 2);
  assert.equal(L.streak(mk('2026-11-08'), '2026-11-10'), 0);
  assert.equal(L.streak([], '2026-11-10'), 0);
});
test('food CSV matches the Notion Food Diary columns and escapes safely', () => {
  const csv = L.foodCsv([{ day: '2026-11-10', name: 'Rice, "sticky"', qty: 1.5, kcal: 200, protein: 4.33, fibre: 1, fat: 0, carbs: 44, sugar: 0 }, { day: '2026-11-09', name: '=SUM(A1)', qty: 1, kcal: 1 }]);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'Name,Logged for,Calories,Protein (g),Fibre (g),Fat (g),Carbs (g),Sugar (g)');
  assert.equal(lines[1], "'=SUM(A1),2026-11-09,1,0,0,0,0,0");
  assert.equal(lines[2], '"Rice, ""sticky"" ×1.5",2026-11-10,300,6.5,1.5,0,66,0');
});
test('weight CSV uses the existing Notion title convention', () => {
  assert.equal(L.weightCsv([{ day: '2026-08-28', kg: 80.8 }]).trim().split('\n')[1], '80.8 kg - 28 August 2026,80.8');
});
test('backup validation rejects junk before it can replace data', () => {
  assert.equal(L.validateBackup({ entries: [{ name: 'a', day: '2026-11-10', kcal: 1 }], weights: [{ day: '2026-11-10', kg: 80 }] }), null);
  assert.ok(L.validateBackup(null)); assert.ok(L.validateBackup([])); assert.ok(L.validateBackup({ entries: [] }));
  assert.ok(L.validateBackup({ entries: [{ name: 'a', day: 'tomorrow', kcal: 1 }], weights: [] }));
  assert.ok(L.validateBackup({ entries: [], weights: [{ day: '2026-11-10', kg: '80' }] }));
});
test('topFoods ranks by use, then recency', () => {
  const foods = { a: { name: 'A', uses: 1, last: 5 }, b: { name: 'B', uses: 3, last: 1 }, c: { name: 'C', uses: 1, last: 9 } };
  assert.deepEqual(L.topFoods(foods, 2).map((f) => f.name), ['B', 'C']);
});

console.log(`fuel: ${passed} tests passed`);
