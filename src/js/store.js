// Local-first persistence. The storage backend is injected (window.localStorage in
// the app, an in-memory mock in tests) — everything else is plain data.

export const STORAGE_KEY = 'tally.data.v1';
const RECENT_FOODS_CAP = 30;

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

function mergeSettings(saved = {}) {
  const base = defaultSettings();
  const providers = { ...base.providers };
  for (const key of Object.keys(providers)) {
    providers[key] = { ...providers[key], ...(saved.providers?.[key] || {}) };
  }
  return { ...base, ...saved, providers };
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
    if (!parsed || typeof parsed !== 'object') return defaultData();
    const base = defaultData();
    return {
      version: 1,
      settings: mergeSettings(parsed.settings),
      diary: Array.isArray(parsed.diary) ? parsed.diary : base.diary,
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : base.workouts,
      customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : base.customFoods,
      recentFoods: Array.isArray(parsed.recentFoods) ? parsed.recentFoods : base.recentFoods,
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
