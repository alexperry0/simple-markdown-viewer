import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey, addDays, lastNDays, formatDateLabel, keyToDate,
  round1, scaleServing, diaryTotals, workoutCalories, dailySummary, strengthVolume,
} from '../src/js/nutrition.js';

test('dateKey formats local dates as YYYY-MM-DD', () => {
  assert.equal(dateKey(new Date(2026, 7, 4)), '2026-08-04');
  assert.equal(dateKey(new Date(2026, 0, 9)), '2026-01-09');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-08-04', 1), '2026-08-05');
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29'); // leap year
});

test('lastNDays returns ascending keys ending at endKey', () => {
  assert.deepEqual(lastNDays(3, '2026-08-04'), ['2026-08-02', '2026-08-03', '2026-08-04']);
});

test('keyToDate parses at local noon', () => {
  const d = keyToDate('2026-08-04');
  assert.equal(d.getHours(), 12);
  assert.equal(d.getDate(), 4);
});

test('formatDateLabel names today, yesterday, tomorrow relative to reference', () => {
  assert.equal(formatDateLabel('2026-08-04', '2026-08-04'), 'Today');
  assert.equal(formatDateLabel('2026-08-03', '2026-08-04'), 'Yesterday');
  assert.equal(formatDateLabel('2026-08-05', '2026-08-04'), 'Tomorrow');
  assert.match(formatDateLabel('2026-07-20', '2026-08-04'), /Jul/);
});

test('round1 rounds to one decimal and coerces junk to 0', () => {
  assert.equal(round1(1.25), 1.3);
  assert.equal(round1('4.04'), 4);
  assert.equal(round1(undefined), 0);
  assert.equal(round1('nope'), 0);
});

test('scaleServing multiplies per-serving macros', () => {
  const food = { calories: 257, protein: 12.4, carbs: 20.1, fat: 13.2 };
  assert.deepEqual(scaleServing(food, 2), { calories: 514, protein: 24.8, carbs: 40.2, fat: 26.4 });
  assert.deepEqual(scaleServing(food, 0.5), { calories: 128.5, protein: 6.2, carbs: 10.1, fat: 6.6 });
  assert.deepEqual(scaleServing({}, 3), { calories: 0, protein: 0, carbs: 0, fat: 0 });
});

test('diaryTotals sums entries and tolerates missing fields', () => {
  const totals = diaryTotals([
    { calories: 500, protein: 30, carbs: 40, fat: 20 },
    { calories: 250.5, protein: 10.2 },
    {},
  ]);
  assert.deepEqual(totals, { calories: 750.5, protein: 40.2, carbs: 40, fat: 20 });
});

test('workoutCalories sums caloriesBurned', () => {
  assert.equal(workoutCalories([{ caloriesBurned: 300 }, {}, { caloriesBurned: '150' }]), 450);
});

test('dailySummary credits exercise calories only when enabled', () => {
  const entries = [{ calories: 1800, protein: 0, carbs: 0, fat: 0 }];
  const workouts = [{ caloriesBurned: 400 }];
  const on = dailySummary(entries, workouts, { calorieGoal: 2200, creditExercise: true });
  assert.equal(on.remaining, 800);
  assert.equal(on.burned, 400);
  const off = dailySummary(entries, workouts, { calorieGoal: 2200, creditExercise: false });
  assert.equal(off.remaining, 400);
});

test('dailySummary goes negative when over budget', () => {
  const s = dailySummary([{ calories: 2500 }], [], { calorieGoal: 2000, creditExercise: true });
  assert.equal(s.remaining, -500);
});

test('strengthVolume sums reps × weight across sets', () => {
  assert.equal(strengthVolume([{ reps: 10, weight: 135 }, { reps: 8, weight: 155 }]), 2590);
  assert.equal(strengthVolume([]), 0);
  assert.equal(strengthVolume(), 0);
});
