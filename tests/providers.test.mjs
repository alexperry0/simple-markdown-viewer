import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseUsdaSearch, parseNutritionixInstant, parseNutritionixFoods,
  parseOffSearch, searchFoods, resolveFood,
} from '../src/js/providers.js';

// ---- fixtures modeled on real API response shapes ----

const usdaFixture = {
  foods: [
    {
      fdcId: 2708866,
      description: 'BIG MAC',
      dataType: 'Branded',
      brandOwner: "McDonald's Corporation",
      brandName: "MCDONALD'S",
      servingSize: 219,
      servingSizeUnit: 'g',
      householdServingFullText: '1 burger',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 257 },
        { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 12 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'G', value: 13 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 20 },
      ],
    },
    {
      fdcId: 173944,
      description: 'Bananas, raw',
      dataType: 'SR Legacy',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KJ', value: 371 },
        { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 89 },
        { nutrientId: 1003, value: 1.09 },
        { nutrientId: 1004, value: 0.33 },
        { nutrientId: 1005, value: 22.84 },
      ],
    },
    { fdcId: 999, description: 'No nutrients here', foodNutrients: [] },
  ],
};

const nixInstantFixture = {
  branded: [
    {
      food_name: 'Burrito Bowl, Chicken',
      brand_name: 'Chipotle Mexican Grill',
      nix_item_id: '513fc9e73fe3ffd40300109f',
      serving_qty: 1,
      serving_unit: 'bowl',
      nf_calories: 665,
    },
  ],
  common: [
    { food_name: 'chicken burrito', serving_qty: 1, serving_unit: 'burrito' },
    { food_name: 'Chicken Burrito', serving_qty: 1, serving_unit: 'burrito' }, // dupe
  ],
};

const nixNaturalFixture = {
  foods: [{
    food_name: 'chicken burrito',
    brand_name: null,
    serving_qty: 1,
    serving_unit: 'burrito',
    serving_weight_grams: 219.99,
    nf_calories: 442.18,
    nf_protein: 20.65,
    nf_total_carbohydrate: 45.8,
    nf_total_fat: 19.03,
  }],
};

const offFixture = {
  products: [
    {
      code: '722252100900',
      product_name: 'Crunchy Peanut Butter Energy Bar',
      brands: 'Clif Bar, Clif',
      serving_size: '68 g',
      nutriments: {
        'energy-kcal_serving': 250, proteins_serving: 11, carbohydrates_serving: 40, fat_serving: 6,
        'energy-kcal_100g': 368, proteins_100g: 16.2,
      },
    },
    {
      code: '111',
      product_name: 'Plain Oats',
      brands: '',
      nutriments: { 'energy-kcal_100g': 379, proteins_100g: 13.2, carbohydrates_100g: 67.7, fat_100g: 6.5 },
    },
    { code: '222', nutriments: { 'energy-kcal_100g': 100 } },          // no name → skipped
    { code: '333', product_name: 'No nutrition info', nutriments: {} }, // no kcal → skipped
  ],
};

// ---- USDA ----

test('parseUsdaSearch scales branded foods to their serving size', () => {
  const foods = parseUsdaSearch(usdaFixture);
  const bigMac = foods[0];
  assert.equal(bigMac.key, 'usda:2708866');
  assert.equal(bigMac.name, 'Big Mac');                  // ALL-CAPS fixed
  assert.equal(bigMac.brand, "Mcdonald's");              // ALL-CAPS brand normalized too
  assert.equal(bigMac.servingLabel, '1 burger (219 g)');
  assert.equal(Math.round(bigMac.calories), Math.round(257 * 2.19));
  assert.equal(bigMac.needsResolve, false);
});

test('parseUsdaSearch presents generic foods per 100 g and skips kJ energy', () => {
  const banana = parseUsdaSearch(usdaFixture)[1];
  assert.equal(banana.servingLabel, '100 g');
  assert.equal(banana.calories, 89);                     // kcal row, not the kJ row
  assert.equal(banana.protein, 1.09);
});

test('parseUsdaSearch drops foods without calorie data', () => {
  const foods = parseUsdaSearch(usdaFixture);
  assert.equal(foods.length, 2);
  assert.ok(!foods.some((f) => f.key === 'usda:999'));
});

test('parseUsdaSearch tolerates empty/missing payloads', () => {
  assert.deepEqual(parseUsdaSearch({}), []);
  assert.deepEqual(parseUsdaSearch(null), []);
});

// ---- Nutritionix ----

test('parseNutritionixInstant maps branded items with calories, flagged for resolution', () => {
  const foods = parseNutritionixInstant(nixInstantFixture);
  const bowl = foods[0];
  assert.equal(bowl.source, 'nutritionix');
  assert.equal(bowl.brand, 'Chipotle Mexican Grill');
  assert.equal(bowl.calories, 665);
  assert.equal(bowl.needsResolve, true);
  assert.deepEqual(bowl.resolveRef, { kind: 'item', id: '513fc9e73fe3ffd40300109f' });
});

test('parseNutritionixInstant dedupes common foods case-insensitively', () => {
  const commons = parseNutritionixInstant(nixInstantFixture).filter((f) => f.resolveRef?.kind === 'natural');
  assert.equal(commons.length, 1);
  assert.equal(commons[0].calories, null);
});

test('parseNutritionixFoods extracts full macros and serving weight', () => {
  const food = parseNutritionixFoods(nixNaturalFixture);
  assert.equal(food.servingLabel, '1 burrito (219.99 g)');
  assert.equal(food.calories, 442.18);
  assert.equal(food.protein, 20.65);
  assert.equal(food.needsResolve, false);
  assert.equal(parseNutritionixFoods({ foods: [] }), null);
});

test('resolveFood fetches detail for a common food via natural/nutrients', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => nixNaturalFixture };
  };
  const food = {
    key: 'nutritionix:common:chicken burrito', source: 'nutritionix', name: 'Chicken Burrito',
    brand: '', needsResolve: true, resolveRef: { kind: 'natural', query: 'chicken burrito' },
  };
  const resolved = await resolveFood(food, { nutritionix: { appId: 'id', appKey: 'key' } }, fakeFetch);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /natural\/nutrients/);
  assert.equal(calls[0].opts.headers['x-app-id'], 'id');
  assert.equal(resolved.calories, 442.18);
  assert.equal(resolved.needsResolve, false);
  assert.equal(resolved.name, 'Chicken Burrito');        // display name kept
  assert.equal(resolved.key, food.key);                  // identity kept
});

test('resolveFood passes through foods that need no resolution', async () => {
  const food = { name: 'Eggs', needsResolve: false, calories: 78 };
  const resolved = await resolveFood(food, {}, () => { throw new Error('should not fetch'); });
  assert.equal(resolved, food);
});

// ---- Open Food Facts ----

test('parseOffSearch prefers per-serving values when present', () => {
  const bar = parseOffSearch(offFixture)[0];
  assert.equal(bar.servingLabel, '68 g');
  assert.equal(bar.calories, 250);
  assert.equal(bar.protein, 11);
  assert.equal(bar.brand, 'Clif Bar');                   // first brand only
});

test('parseOffSearch falls back to per-100g values', () => {
  const oats = parseOffSearch(offFixture)[1];
  assert.equal(oats.servingLabel, '100 g');
  assert.equal(oats.calories, 379);
});

test('parseOffSearch skips unusable products', () => {
  assert.equal(parseOffSearch(offFixture).length, 2);
});

// ---- orchestration ----

function fetchStub(routes) {
  return async (url) => {
    for (const [pattern, response] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        if (response instanceof Error) throw response;
        return { ok: response.ok ?? true, status: response.status ?? 200, json: async () => response.body };
      }
    }
    throw new Error(`no route for ${url}`);
  };
}

const allProviders = {
  usda: { enabled: true, apiKey: '' },
  nutritionix: { enabled: true, appId: 'id', appKey: 'key' },
  off: { enabled: true },
};

test('searchFoods merges results across providers, interleaved by source', async () => {
  const fetchFn = fetchStub({
    'api.nal.usda.gov': { body: usdaFixture },
    'trackapi.nutritionix.com': { body: nixInstantFixture },
    'openfoodfacts.org': { body: offFixture },
  });
  const { foods, errors } = await searchFoods('burrito', allProviders, fetchFn);
  assert.equal(errors.length, 0);
  assert.equal(foods.length, 2 + 2 + 2);
  const firstThree = foods.slice(0, 3).map((f) => f.source).sort();
  assert.deepEqual(firstThree, ['nutritionix', 'off', 'usda']); // round-robin, not blocks
});

test('searchFoods reports provider failures without dropping other results', async () => {
  const fetchFn = fetchStub({
    'api.nal.usda.gov': { ok: false, status: 500 },
    'trackapi.nutritionix.com': new Error('network down'),
    'openfoodfacts.org': { body: offFixture },
  });
  const { foods, errors } = await searchFoods('oats', allProviders, fetchFn);
  assert.equal(foods.length, 2);
  assert.equal(errors.length, 2);
  const sources = errors.map((e) => e.source).sort();
  assert.deepEqual(sources, ['nutritionix', 'usda']);
});

test('searchFoods skips disabled and unconfigured providers', async () => {
  let usdaCalled = false;
  const fetchFn = async (url) => {
    if (url.includes('usda')) usdaCalled = true;
    return { ok: true, json: async () => offFixture };
  };
  const settings = {
    usda: { enabled: false },
    nutritionix: { enabled: true, appId: '', appKey: '' },  // enabled but keyless → skipped
    off: { enabled: true },
  };
  const { foods, errors } = await searchFoods('oats', settings, fetchFn);
  assert.equal(usdaCalled, false);
  assert.equal(errors.length, 0);
  assert.ok(foods.every((f) => f.source === 'off'));
});
