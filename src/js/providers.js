// Food database providers. Each provider has a search function (network) and a pure
// parser (unit-tested against response fixtures). Results are normalized to:
//
//   {
//     key: 'usda:12345',        // stable identity, used for recent-food dedupe
//     source: 'usda' | 'nutritionix' | 'off' | 'custom',
//     name, brand,
//     servingLabel: '1 burger (219 g)',
//     calories, protein, carbs, fat,   // per serving
//     needsResolve,             // true when macros require a follow-up request
//     resolveRef,               // provider-specific ref for that follow-up
//   }
//
// MyFitnessPal's database API is closed to the public. For restaurant coverage the
// practical equivalent is Nutritionix (free tier at developer.nutritionix.com);
// USDA FoodData Central covers generic + branded grocery foods with no signup
// (DEMO_KEY), and Open Food Facts covers packaged goods, keyless.

export const USDA_DEMO_KEY = 'DEMO_KEY';
const FETCH_TIMEOUT_MS = 12000;

export const SOURCE_LABELS = {
  usda: 'USDA',
  nutritionix: 'Nutritionix',
  off: 'Open Food Facts',
  custom: 'My food',
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

// ---- USDA FoodData Central ----
// Search results report nutrients per 100 g. Branded items carry a serving size we
// scale to; everything else is presented per 100 g.

const USDA_NUTRIENTS = {
  1008: 'calories', // Energy (kcal)
  2047: 'calories', // Energy, Atwater general factors (Foundation foods)
  1003: 'protein',
  1004: 'fat',
  1005: 'carbs',
};

export function parseUsdaSearch(json) {
  const foods = [];
  for (const f of json?.foods || []) {
    if (!f?.description) continue;
    const per100 = { calories: null, protein: null, carbs: null, fat: null };
    for (const n of f.foodNutrients || []) {
      const field = USDA_NUTRIENTS[n.nutrientId];
      if (field && per100[field] == null && num(n.value) != null) {
        if (field === 'calories' && String(n.unitName || '').toUpperCase() === 'KJ') continue;
        per100[field] = Number(n.value);
      }
    }
    if (per100.calories == null) continue;

    let factor = 1;
    let servingLabel = '100 g';
    const unit = String(f.servingSizeUnit || '').toLowerCase();
    const grams = num(f.servingSize);
    if (grams && grams > 0 && ['g', 'grm', 'ml', 'mlt'].includes(unit)) {
      factor = grams / 100;
      const household = (f.householdServingFullText || '').trim();
      const metric = `${grams} ${unit.startsWith('m') ? 'ml' : 'g'}`;
      servingLabel = household ? `${household} (${metric})` : metric;
    }

    foods.push({
      key: `usda:${f.fdcId}`,
      source: 'usda',
      name: titleCase(f.description),
      brand: titleCase((f.brandName || f.brandOwner || '').trim()),
      servingLabel,
      calories: (per100.calories ?? 0) * factor,
      protein: (per100.protein ?? 0) * factor,
      carbs: (per100.carbs ?? 0) * factor,
      fat: (per100.fat ?? 0) * factor,
      needsResolve: false,
    });
  }
  return foods;
}

async function searchUsda(query, settings, fetchFn) {
  const params = new URLSearchParams({
    api_key: settings.apiKey?.trim() || USDA_DEMO_KEY,
    query,
    pageSize: '25',
    dataType: 'Branded,Foundation,SR Legacy,Survey (FNDDS)',
  });
  const res = await fetchFn(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'rate limit hit — add a free api.data.gov key in Settings' : `HTTP ${res.status}`);
  return parseUsdaSearch(await res.json());
}

// ---- Nutritionix ----
// Instant search returns branded items (chain restaurants + grocery) with calories
// only, and common items with no nutrients; both need a follow-up request for
// macros, made lazily when the user picks a result.

export function parseNutritionixInstant(json) {
  const foods = [];
  for (const b of json?.branded || []) {
    if (!b?.food_name) continue;
    foods.push({
      key: `nutritionix:${b.nix_item_id}`,
      source: 'nutritionix',
      name: titleCase(b.food_name),
      brand: (b.brand_name || '').trim(),
      servingLabel: b.serving_qty && b.serving_unit ? `${b.serving_qty} ${b.serving_unit}` : '1 serving',
      calories: num(b.nf_calories),
      protein: null,
      carbs: null,
      fat: null,
      needsResolve: true,
      resolveRef: { kind: 'item', id: b.nix_item_id },
    });
  }
  const seen = new Set();
  for (const c of json?.common || []) {
    const name = (c?.food_name || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    foods.push({
      key: `nutritionix:common:${name.toLowerCase()}`,
      source: 'nutritionix',
      name: titleCase(name),
      brand: '',
      servingLabel: c.serving_qty && c.serving_unit ? `${c.serving_qty} ${c.serving_unit}` : '1 serving',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      needsResolve: true,
      resolveRef: { kind: 'natural', query: name },
    });
  }
  return foods;
}

/** Parses both /v2/search/item and /v2/natural/nutrients responses (same foods[] shape). */
export function parseNutritionixFoods(json) {
  const f = json?.foods?.[0];
  if (!f) return null;
  const grams = num(f.serving_weight_grams);
  const qtyUnit = [f.serving_qty, f.serving_unit].filter((x) => x != null && x !== '').join(' ');
  return {
    name: titleCase(f.food_name || ''),
    brand: (f.brand_name || '').trim(),
    servingLabel: qtyUnit ? (grams ? `${qtyUnit} (${grams} g)` : qtyUnit) : '1 serving',
    calories: num(f.nf_calories) ?? 0,
    protein: num(f.nf_protein) ?? 0,
    carbs: num(f.nf_total_carbohydrate) ?? 0,
    fat: num(f.nf_total_fat) ?? 0,
    needsResolve: false,
  };
}

function nutritionixHeaders(settings) {
  return {
    'x-app-id': settings.appId?.trim() || '',
    'x-app-key': settings.appKey?.trim() || '',
    'Content-Type': 'application/json',
  };
}

async function searchNutritionix(query, settings, fetchFn) {
  const params = new URLSearchParams({ query });
  const res = await fetchFn(`https://trackapi.nutritionix.com/v2/search/instant?${params}`, {
    headers: nutritionixHeaders(settings),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'check your App ID / App Key in Settings' : `HTTP ${res.status}`);
  return parseNutritionixInstant(await res.json());
}

/** Fetch full macros for a search result that needs a follow-up request. */
export async function resolveFood(food, providerSettings, fetchFn = fetch) {
  if (!food.needsResolve) return food;
  const settings = providerSettings.nutritionix || {};
  let res;
  if (food.resolveRef?.kind === 'item') {
    const params = new URLSearchParams({ nix_item_id: food.resolveRef.id });
    res = await fetchFn(`https://trackapi.nutritionix.com/v2/search/item?${params}`, {
      headers: nutritionixHeaders(settings),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } else {
    res = await fetchFn('https://trackapi.nutritionix.com/v2/natural/nutrients', {
      method: 'POST',
      headers: nutritionixHeaders(settings),
      body: JSON.stringify({ query: food.resolveRef?.query || food.name }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  }
  if (!res.ok) throw new Error(`Couldn't load nutrition details (HTTP ${res.status}).`);
  const detail = parseNutritionixFoods(await res.json());
  if (!detail) throw new Error("Couldn't load nutrition details.");
  return { ...food, ...detail, name: food.name, brand: food.brand || detail.brand };
}

// ---- Open Food Facts ----

export function parseOffSearch(json) {
  const foods = [];
  for (const p of json?.products || []) {
    const name = (p?.product_name || '').trim();
    const n = p?.nutriments || {};
    if (!name) continue;

    const perServing = num(n['energy-kcal_serving']);
    const per100 = num(n['energy-kcal_100g']);
    let food = null;
    if (perServing != null && p.serving_size) {
      food = {
        servingLabel: String(p.serving_size).trim(),
        calories: perServing,
        protein: num(n.proteins_serving) ?? 0,
        carbs: num(n.carbohydrates_serving) ?? 0,
        fat: num(n.fat_serving) ?? 0,
      };
    } else if (per100 != null) {
      food = {
        servingLabel: '100 g',
        calories: per100,
        protein: num(n.proteins_100g) ?? 0,
        carbs: num(n.carbohydrates_100g) ?? 0,
        fat: num(n.fat_100g) ?? 0,
      };
    }
    if (!food) continue;

    foods.push({
      key: `off:${p.code || name.toLowerCase()}`,
      source: 'off',
      name,
      brand: (p.brands || '').split(',')[0].trim(),
      ...food,
      needsResolve: false,
    });
  }
  return foods;
}

async function searchOff(query, _settings, fetchFn) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: 'code,product_name,brands,serving_size,nutriments',
  });
  const res = await fetchFn(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseOffSearch(await res.json());
}

// ---- orchestration ----

const PROVIDERS = [
  { id: 'usda', search: searchUsda, ready: (s) => s.enabled },
  { id: 'nutritionix', search: searchNutritionix, ready: (s) => s.enabled && s.appId?.trim() && s.appKey?.trim() },
  { id: 'off', search: searchOff, ready: (s) => s.enabled },
];

/**
 * Search all configured providers in parallel. Never rejects: failures come back
 * in `errors` so one provider being down doesn't hide the others' results.
 */
export async function searchFoods(query, providerSettings, fetchFn = fetch) {
  const active = PROVIDERS.filter((p) => p.ready(providerSettings[p.id] || {}));
  const settled = await Promise.allSettled(
    active.map((p) => p.search(query, providerSettings[p.id] || {}, fetchFn)),
  );
  const foods = [];
  const errors = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') foods.push(...result.value);
    else errors.push({ source: active[i].id, message: result.reason?.message || 'request failed' });
  });
  return { foods: interleaveBySource(foods), errors };
}

/** Round-robin across sources so one provider's 25 rows don't bury the others. */
function interleaveBySource(foods) {
  const bySource = new Map();
  for (const f of foods) {
    if (!bySource.has(f.source)) bySource.set(f.source, []);
    bySource.get(f.source).push(f);
  }
  const lists = [...bySource.values()];
  const out = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return out;
}

function titleCase(s) {
  const str = String(s);
  if (!str) return str;
  // Leave strings that already have mixed case alone; fix ALL-CAPS/all-lower API data.
  if (str !== str.toUpperCase() && str !== str.toLowerCase()) return str;
  return str.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
}
