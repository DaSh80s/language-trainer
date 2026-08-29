import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCandidates, selectValue } from '../src/targets.js';

const FIELDS = {
  maintenanceKcal: {
    synonyms: ['maintenance calories', 'maintenance', 'tdee'],
    min: 1200, max: 5000, required: true,
  },
  proteinTargetG: { synonyms: ['protein target', 'protein'], min: 40, max: 300 },
};

const note = (...lines) => [{ label: 'Maintenance note', pageId: 'note-1', lines }];

test('reads a plain labelled value', () => {
  const found = extractCandidates(note('Maintenance calories: 2,600 kcal'), FIELDS);
  assert.equal(selectValue(found.maintenanceKcal, '2026-08-28').value, 2600);
});

test('accepts Swiss thousands separators', () => {
  const found = extractCandidates(note("Maintenance: 2'750 kcal"), FIELDS);
  assert.equal(selectValue(found.maintenanceKcal, '2026-08-28').value, 2750);
});

test('a dated line takes effect from its date, not before', () => {
  const found = extractCandidates(
    note('2026-06-01 — maintenance 2,700 kcal', 'From 1 September 2026: maintenance calories 2,550 kcal'),
    FIELDS,
  );
  assert.equal(selectValue(found.maintenanceKcal, '2026-08-28').value, 2700);
  assert.equal(selectValue(found.maintenanceKcal, '2026-09-05').value, 2550);
});

test('a future value is reported but not applied', () => {
  const found = extractCandidates(
    note('2026-06-01 maintenance 2,700 kcal', 'From 1 September 2026: maintenance 2,550 kcal'),
    FIELDS,
  );
  const selected = selectValue(found.maintenanceKcal, '2026-08-28');
  assert.equal(selected.value, 2700);
  assert.equal(selected.upcoming.value, 2550);
});

test('an undated headline losing to a dated history raises a warning', () => {
  const found = extractCandidates(
    note('Maintenance calories: 2,600 kcal', 'History', '2026-06-01 — maintenance 2,700 kcal'),
    FIELDS,
  );
  const selected = selectValue(found.maintenanceKcal, '2026-08-28');
  assert.equal(selected.value, 2700);
  assert.match(selected.warnings[0], /in preference to/);
});

test('values outside the plausible range are ignored', () => {
  const found = extractCandidates(note('Maintenance calories: 26 kcal'), FIELDS);
  assert.equal(found.maintenanceKcal.length, 0);
  assert.equal(selectValue(found.maintenanceKcal, '2026-08-28'), null);
});

test('the longest matching synonym wins, so fields do not collide', () => {
  const found = extractCandidates(note('Protein target: 150 g'), FIELDS);
  assert.equal(selectValue(found.proteinTargetG, '2026-08-28').value, 150);
  assert.equal(found.maintenanceKcal.length, 0);
});

test('several fields on one line are each read from after their own label', () => {
  const found = extractCandidates(note('Maintenance 2600 kcal and protein target 150 g'), FIELDS);
  assert.equal(selectValue(found.maintenanceKcal, '2026-08-28').value, 2600);
  assert.equal(selectValue(found.proteinTargetG, '2026-08-28').value, 150);
});
