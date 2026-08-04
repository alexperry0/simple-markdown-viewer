// Pure date + nutrition math. No DOM, no storage — everything here is unit-testable.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-time date key: 'YYYY-MM-DD'. */
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return dateKey(new Date());
}

/** Parse a date key at local noon (noon avoids DST-boundary day shifts). */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(key, n) {
  return dateKey(new Date(keyToDate(key).getTime() + n * DAY_MS));
}

/** Array of n date keys ending at endKey, ascending. */
export function lastNDays(n, endKey) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i));
  return out;
}

export function formatDateLabel(key, today = todayKey()) {
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  const d = keyToDate(key);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== keyToDate(today).getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}

export function round1(x) {
  return Math.round((Number(x) || 0) * 10) / 10;
}

/** Scale a food's per-serving macros by a serving multiplier. */
export function scaleServing(food, servings) {
  const s = Number(servings) || 0;
  return {
    calories: round1((food.calories || 0) * s),
    protein: round1((food.protein || 0) * s),
    carbs: round1((food.carbs || 0) * s),
    fat: round1((food.fat || 0) * s),
  };
}

export function diaryTotals(entries) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    t.calories += Number(e.calories) || 0;
    t.protein += Number(e.protein) || 0;
    t.carbs += Number(e.carbs) || 0;
    t.fat += Number(e.fat) || 0;
  }
  t.calories = round1(t.calories);
  t.protein = round1(t.protein);
  t.carbs = round1(t.carbs);
  t.fat = round1(t.fat);
  return t;
}

export function workoutCalories(workouts) {
  return round1(workouts.reduce((sum, w) => sum + (Number(w.caloriesBurned) || 0), 0));
}

/**
 * Daily budget summary.
 * remaining = goal − eaten (+ burned, when exercise calories are credited back).
 */
export function dailySummary(entries, workouts, settings) {
  const totals = diaryTotals(entries);
  const burned = workoutCalories(workouts);
  const goal = Number(settings.calorieGoal) || 0;
  const credit = settings.creditExercise ? burned : 0;
  return {
    ...totals,
    burned,
    goal,
    remaining: round1(goal - totals.calories + credit),
  };
}

/** Total volume (sum of reps × weight) for a strength workout's sets. */
export function strengthVolume(sets = []) {
  return round1(sets.reduce((sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0));
}

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};
