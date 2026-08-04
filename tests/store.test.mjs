import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store, STORAGE_KEY, defaultSettings } from '../src/js/store.js';

class MemStorage {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial)); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}

const fresh = () => new Store(new MemStorage());

test('starts with defaults on empty storage', () => {
  const store = fresh();
  assert.equal(store.settings.calorieGoal, 2200);
  assert.equal(store.settings.providers.usda.enabled, true);
  assert.deepEqual(store.data.diary, []);
});

test('survives corrupt JSON in storage', () => {
  const store = new Store(new MemStorage({ [STORAGE_KEY]: '{not json!!' }));
  assert.equal(store.settings.calorieGoal, 2200);
});

test('survives a storage backend that throws', () => {
  const store = new Store({ getItem() { throw new Error('denied'); }, setItem() {} });
  assert.equal(store.settings.calorieGoal, 2200);
});

test('merges saved settings over defaults, keeping new default keys', () => {
  const saved = JSON.stringify({
    version: 1, diary: [], workouts: [],
    settings: { calorieGoal: 1800, providers: { usda: { apiKey: 'abc' } } },
  });
  const store = new Store(new MemStorage({ [STORAGE_KEY]: saved }));
  assert.equal(store.settings.calorieGoal, 1800);
  assert.equal(store.settings.providers.usda.apiKey, 'abc');
  assert.equal(store.settings.providers.usda.enabled, true);       // default kept
  assert.equal(store.settings.providers.off.enabled, true);        // untouched provider kept
  assert.equal(store.settings.weightUnit, defaultSettings().weightUnit);
});

test('diary entries persist and round-trip through storage', () => {
  const storage = new MemStorage();
  const store = new Store(storage);
  const entry = store.addDiaryEntry({
    date: '2026-08-04', meal: 'lunch', name: 'Burrito', source: 'custom',
    servings: 1, per: { calories: 900 }, calories: 900, protein: 40, carbs: 90, fat: 35,
  });
  assert.ok(entry.id);
  const reloaded = new Store(storage);
  assert.equal(reloaded.diaryFor('2026-08-04').length, 1);
  assert.equal(reloaded.diaryFor('2026-08-04')[0].name, 'Burrito');
  assert.equal(reloaded.diaryFor('2026-08-05').length, 0);
});

test('updateDiaryEntry patches, removeDiaryEntry deletes', () => {
  const store = fresh();
  const e = store.addDiaryEntry({ date: '2026-08-04', meal: 'lunch', name: 'Soup', calories: 200 });
  store.updateDiaryEntry(e.id, { servings: 2, calories: 400 });
  assert.equal(store.diaryFor('2026-08-04')[0].calories, 400);
  assert.equal(store.updateDiaryEntry('nope', {}), null);
  assert.equal(store.removeDiaryEntry(e.id), true);
  assert.equal(store.removeDiaryEntry(e.id), false);
  assert.equal(store.diaryFor('2026-08-04').length, 0);
});

test('diaryFor sorts by creation time', () => {
  const store = fresh();
  const a = store.addDiaryEntry({ date: '2026-08-04', meal: 'lunch', name: 'First', calories: 1 });
  const b = store.addDiaryEntry({ date: '2026-08-04', meal: 'lunch', name: 'Second', calories: 2 });
  store.updateDiaryEntry(a.id, { createdAt: b.createdAt + 1000 });
  assert.deepEqual(store.diaryFor('2026-08-04').map((x) => x.name), ['Second', 'First']);
});

test('workout CRUD and per-date filtering', () => {
  const store = fresh();
  const w = store.addWorkout({
    date: '2026-08-04', type: 'strength', name: 'Bench press',
    sets: [{ reps: 10, weight: 135 }], caloriesBurned: 120,
  });
  store.addWorkout({ date: '2026-08-05', type: 'cardio', name: 'Running', durationMin: 30 });
  assert.equal(store.workoutsFor('2026-08-04').length, 1);
  store.updateWorkout(w.id, { caloriesBurned: 150 });
  assert.equal(store.workoutsFor('2026-08-04')[0].caloriesBurned, 150);
  assert.equal(store.removeWorkout(w.id), true);
  assert.equal(store.workoutsFor('2026-08-04').length, 0);
});

test('exerciseNames dedupes case-insensitively, most recent first', () => {
  const store = fresh();
  store.addWorkout({ date: '2026-08-01', type: 'strength', name: 'Bench Press', createdAt: 1 });
  store.addWorkout({ date: '2026-08-02', type: 'strength', name: 'bench press', createdAt: 2 });
  store.addWorkout({ date: '2026-08-03', type: 'cardio', name: 'Running', createdAt: 3 });
  assert.deepEqual(store.exerciseNames(), ['Running', 'bench press']);
});

test('custom foods get a stable key and can be removed', () => {
  const store = fresh();
  const f = store.addCustomFood({ name: 'Protein shake', calories: 220, protein: 40, carbs: 8, fat: 3 });
  assert.equal(f.source, 'custom');
  assert.equal(f.key, `custom:${f.id}`);
  store.removeCustomFood(f.id);
  assert.equal(store.customFoods.length, 0);
});

test('rememberFood dedupes by key and caps the list at 30', () => {
  const store = fresh();
  store.rememberFood({ key: 'usda:1', name: 'Eggs', calories: 78 });
  store.rememberFood({ key: 'usda:2', name: 'Toast', calories: 80 });
  store.rememberFood({ key: 'usda:1', name: 'Eggs', calories: 78 });
  assert.deepEqual(store.recentFoods.map((f) => f.key), ['usda:1', 'usda:2']);
  for (let i = 0; i < 40; i++) store.rememberFood({ key: `usda:x${i}`, name: `Food ${i}` });
  assert.equal(store.recentFoods.length, 30);
});

test('export/import round-trips all data', () => {
  const store = fresh();
  store.addDiaryEntry({ date: '2026-08-04', meal: 'dinner', name: 'Pizza', calories: 600 });
  store.addWorkout({ date: '2026-08-04', type: 'cardio', name: 'Bike', durationMin: 45 });
  store.updateSettings({ calorieGoal: 1900 });
  const backup = store.exportJSON();

  const other = fresh();
  const result = other.importJSON(backup);
  assert.equal(result.ok, true);
  assert.equal(other.diaryFor('2026-08-04')[0].name, 'Pizza');
  assert.equal(other.workoutsFor('2026-08-04')[0].name, 'Bike');
  assert.equal(other.settings.calorieGoal, 1900);
});

test('importJSON rejects garbage without touching existing data', () => {
  const store = fresh();
  store.addDiaryEntry({ date: '2026-08-04', meal: 'lunch', name: 'Keep me', calories: 1 });
  assert.equal(store.importJSON('not json').ok, false);
  assert.equal(store.importJSON('{"hello":"world"}').ok, false);
  assert.equal(store.importJSON('{"version":2,"diary":[],"workouts":[]}').ok, false);
  assert.equal(store.diaryFor('2026-08-04').length, 1);
});

test('updateSettings patches one provider without clobbering others', () => {
  const store = fresh();
  store.updateSettings({ providers: { nutritionix: { enabled: true, appId: 'id', appKey: 'key' } } });
  assert.equal(store.settings.providers.nutritionix.appId, 'id');
  assert.equal(store.settings.providers.usda.enabled, true);
  store.updateSettings({ providers: { usda: { apiKey: 'mykey' } } });
  assert.equal(store.settings.providers.usda.apiKey, 'mykey');
  assert.equal(store.settings.providers.usda.enabled, true);
  assert.equal(store.settings.providers.nutritionix.appId, 'id');
});

test('clearAll resets to defaults', () => {
  const store = fresh();
  store.addDiaryEntry({ date: '2026-08-04', meal: 'lunch', name: 'X', calories: 1 });
  store.clearAll();
  assert.deepEqual(store.data.diary, []);
  assert.equal(store.settings.calorieGoal, 2200);
});
