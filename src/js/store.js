// Local-first persistence. The storage backend is injected (window.localStorage in
// the app, an in-memory mock in tests) — everything else is plain data.
//
// Anything read from storage or importJSON is untrusted: normalization coerces
// shapes/numbers here so the UI layer never renders or computes on junk.

import { MEALS } from './nutrition.js';

export const STORAGE_KEY = 'tally.data.v1';
const RECENT_FOODS_CAP = 30;

const toNum = (v, fallback = 0) => {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const isPlainObject = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const plainObjects = (arr) => (Array.isArray(arr) ? arr.filter(isPlainObject) : []);

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultSettings() {
  return {
    calorieGoal: 2200,
    proteinGoal: 150,
    carbsGoal: 220,
    fatGoal: 70,
    weightUnit: 'lb',
    creditExercise: true,
    providers: {
      usda: { enabled: true, apiKey: '' },
      nutritionix: { enabled: false, appId: '', appKey: '' },
      off: { enabled: true },
    },
  };
}

export function defaultData() {
  return {
    version: 1,
    settings: defaultSettings(),
    diary: [],
    workouts: [],
    customFoods: [],
    recentFoods: [],
  };
}

function mergeSettings(saved) {
  const s = isPlainObject(saved) ? saved : {};
  const base = defaultSettings();
  const providers = { ...base.providers };
  for (const key of Object.keys(providers)) {
    const sp = s.providers?.[key];
    providers[key] = { ...providers[key], ...(isPlainObject(sp) ? sp : {}) };
  }
  const merged = { ...base, ...s, providers };
  for (const k of ['calorieGoal', 'proteinGoal', 'carbsGoal', 'fatGoal']) {
    merged[k] = toNum(merged[k], base[k]);
  }
  merged.weightUnit = merged.weightUnit === 'kg' ? 'kg' : 'lb';
  merged.creditExercise = Boolean(merged.creditExercise);
  return merged;
}

function sanitizeDiaryEntry(e) {
  const servings = toNum(e.servings, 1) > 0 ? toNum(e.servings, 1) : 1;
  const totals = {
    calories: toNum(e.calories),
    protein: toNum(e.protein),
    carbs: toNum(e.carbs),
    fat: toNum(e.fat),
  };
  const per = isPlainObject(e.per)
    ? {
        calories: toNum(e.per.calories),
        protein: toNum(e.per.protein),
        carbs: toNum(e.per.carbs),
        fat: toNum(e.per.fat),
      }
    : { // derive per-serving values so editing servings rescales correctly
        calories: totals.calories / servings,
        protein: totals.protein / servings,
        carbs: totals.carbs / servings,
        fat: totals.fat / servings,
      };
  return {
    ...e,
    id: String(e.id ?? makeId()),
    date: String(e.date ?? ''),
    meal: MEALS.includes(e.meal) ? e.meal : 'snacks',
    name: String(e.name ?? ''),
    brand: String(e.brand ?? ''),
    servingLabel: String(e.servingLabel ?? ''),
    servings,
    per,
    ...totals,
    createdAt: toNum(e.createdAt),
  };
}

function sanitizeWorkout(w) {
  const type = w.type === 'cardio' ? 'cardio' : 'strength';
  return {
    ...w,
    id: String(w.id ?? makeId()),
    date: String(w.date ?? ''),
    type,
    name: String(w.name ?? ''),
    notes: String(w.notes ?? ''),
    sets: type === 'strength'
      ? plainObjects(w.sets).map((s) => ({ reps: toNum(s.reps), weight: toNum(s.weight) }))
      : null,
    durationMin: type === 'cardio' ? toNum(w.durationMin) : null,
    distance: type === 'cardio' ? (toNum(w.distance) || null) : null,
    distanceUnit: w.distanceUnit === 'km' ? 'km' : 'mi',
    caloriesBurned: toNum(w.caloriesBurned),
    createdAt: toNum(w.createdAt),
  };
}

export class Store {
  constructor(storage) {
    this.storage = storage;
    this.data = this.#load();
  }

  #load() {
    let raw = null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      return defaultData();
    }
    if (!raw) return defaultData();
    try {
      const parsed = JSON.parse(raw);
      return this.#normalize(parsed);
    } catch {
      return defaultData();
    }
  }

  #normalize(parsed) {
    if (!isPlainObject(parsed)) return defaultData();
    return {
      version: 1,
      settings: mergeSettings(parsed.settings),
      diary: plainObjects(parsed.diary).map(sanitizeDiaryEntry),
      workouts: plainObjects(parsed.workouts).map(sanitizeWorkout),
      customFoods: plainObjects(parsed.customFoods),
      recentFoods: plainObjects(parsed.recentFoods),
    };
  }

  save() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  // ---- settings ----

  get settings() {
    return this.data.settings;
  }

  updateSettings(patch) {
    const providers = patch.providers
      ? mergeSettings({ ...this.data.settings, providers: {
          ...this.data.settings.providers,
          ...Object.fromEntries(Object.entries(patch.providers).map(([k, v]) => [
            k, { ...this.data.settings.providers[k], ...v },
          ])),
        } }).providers
      : this.data.settings.providers;
    this.data.settings = { ...this.data.settings, ...patch, providers };
    this.save();
    return this.data.settings;
  }

  // ---- food diary ----

  addDiaryEntry(entry) {
    const full = {
      id: makeId(),
      createdAt: Date.now(),
      brand: '',
      servingLabel: '',
      servings: 1,
      protein: 0,
      carbs: 0,
      fat: 0,
      ...entry,
    };
    this.data.diary.push(full);
    this.save();
    return full;
  }

  updateDiaryEntry(id, patch) {
    const e = this.data.diary.find((x) => x.id === id);
    if (!e) return null;
    Object.assign(e, patch);
    this.save();
    return e;
  }

  removeDiaryEntry(id) {
    const before = this.data.diary.length;
    this.data.diary = this.data.diary.filter((x) => x.id !== id);
    if (this.data.diary.length !== before) this.save();
    return before !== this.data.diary.length;
  }

  diaryFor(date) {
    return this.data.diary
      .filter((e) => e.date === date)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  // ---- workouts ----

  addWorkout(workout) {
    const full = { id: makeId(), createdAt: Date.now(), notes: '', ...workout };
    this.data.workouts.push(full);
    this.save();
    return full;
  }

  updateWorkout(id, patch) {
    const w = this.data.workouts.find((x) => x.id === id);
    if (!w) return null;
    Object.assign(w, patch);
    this.save();
    return w;
  }

  removeWorkout(id) {
    const before = this.data.workouts.length;
    this.data.workouts = this.data.workouts.filter((x) => x.id !== id);
    if (this.data.workouts.length !== before) this.save();
    return before !== this.data.workouts.length;
  }

  workoutsFor(date) {
    return this.data.workouts
      .filter((w) => w.date === date)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  /** Unique exercise names from workout history, most recent first (for autocomplete). */
  exerciseNames() {
    const seen = new Set();
    const names = [];
    const sorted = [...this.data.workouts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    for (const w of sorted) {
      const name = (w.name || '').trim();
      const lower = name.toLowerCase();
      if (name && !seen.has(lower)) {
        seen.add(lower);
        names.push(name);
      }
    }
    return names;
  }

  // ---- custom foods ----

  addCustomFood(food) {
    const full = { id: makeId(), source: 'custom', brand: '', ...food };
    full.key = `custom:${full.id}`;
    this.data.customFoods.push(full);
    this.save();
    return full;
  }

  removeCustomFood(id) {
    this.data.customFoods = this.data.customFoods.filter((f) => f.id !== id);
    this.data.recentFoods = this.data.recentFoods.filter((f) => f.key !== `custom:${id}`);
    this.save();
  }

  get customFoods() {
    return this.data.customFoods;
  }

  // ---- recent foods ----

  rememberFood(food) {
    const key = food.key || `${food.source}:${(food.name || '').toLowerCase()}|${(food.brand || '').toLowerCase()}`;
    this.data.recentFoods = [
      { ...food, key },
      ...this.data.recentFoods.filter((f) => f.key !== key),
    ].slice(0, RECENT_FOODS_CAP);
    this.save();
  }

  get recentFoods() {
    return this.data.recentFoods;
  }

  // ---- backup ----

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'Not valid JSON.' };
    }
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1
      || !Array.isArray(parsed.diary) || !Array.isArray(parsed.workouts)) {
      return { ok: false, error: 'Not a Tally backup file.' };
    }
    this.data = this.#normalize(parsed);
    this.save();
    return { ok: true };
  }

  clearAll() {
    this.data = defaultData();
    this.save();
  }
}
