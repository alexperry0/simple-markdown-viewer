import { Store } from './store.js';
import {
  MEALS, MEAL_LABELS, todayKey, addDays, formatDateLabel, lastNDays,
  scaleServing, diaryTotals, dailySummary, strengthVolume, round1,
} from './nutrition.js';
import { searchFoods, resolveFood, SOURCE_LABELS } from './providers.js';

const store = new Store(window.localStorage);

const state = {
  tab: 'diary',
  date: todayKey(),
};

// ---------------------------------------------------------------- utilities

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function fmtCal(n) {
  return Math.round(Number(n) || 0).toLocaleString();
}

function num(value, fallback = 0) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function servingsText(servings, label) {
  const s = round1(servings);
  const qty = s === 1 ? '' : `${s} × `;
  return `${qty}${label || 'serving'}`;
}

// ---------------------------------------------------------------- header

function renderHeader() {
  $('#date-label').textContent = formatDateLabel(state.date);
  $('#date-picker').value = state.date;
  $$('.tabs .tab').forEach((t) => {
    const active = t.dataset.tab === state.tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', String(active));
  });
  $('#date-nav').style.visibility = state.tab === 'settings' ? 'hidden' : 'visible';
}

function setDate(date) {
  state.date = date;
  render();
}

function setTab(tab) {
  state.tab = tab;
  render();
}

// ---------------------------------------------------------------- diary view

function renderDiary() {
  const entries = store.diaryFor(state.date);
  const workouts = store.workoutsFor(state.date);
  const s = dailySummary(entries, workouts, store.settings);
  const pct = s.goal > 0 ? Math.min(100, (s.calories / s.goal) * 100) : 0;
  const overBudget = s.remaining < 0;

  const macroBar = (name, value, goal) => {
    const mp = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
    return `
      <div class="macro">
        <div class="macro-top">
          <span class="macro-name">${name}</span>
          <span class="macro-val">${round1(value)} / ${esc(goal)} g</span>
        </div>
        <div class="progress"><div class="progress-fill" style="width:${mp}%"></div></div>
      </div>`;
  };

  const mealCard = (meal) => {
    const rows = entries.filter((e) => e.meal === meal);
    const total = diaryTotals(rows).calories;
    const items = rows.map((e) => `
      <div class="list-row" data-action="edit-entry" data-id="${esc(e.id)}" title="Edit entry">
        <div class="grow">
          <div class="row-title">${esc(e.name)}</div>
          <div class="row-sub">${esc([e.brand, servingsText(e.servings, e.servingLabel)].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="row-val">${fmtCal(e.calories)} <small>cal</small></div>
      </div>`).join('');
    return `
      <div class="card">
        <div class="card-header-row">
          <h2>${MEAL_LABELS[meal]}</h2>
          <div style="display:flex;align-items:center;gap:10px;">
            ${total ? `<span class="meal-total">${fmtCal(total)} cal</span>` : ''}
            <button class="btn btn-sm" data-action="add-food" data-meal="${meal}">+ Add food</button>
          </div>
        </div>
        ${items || '<div class="empty-hint">Nothing logged yet.</div>'}
      </div>`;
  };

  $('#view-diary').innerHTML = `
    <div class="card">
      <div class="summary-numbers">
        <div class="summary-cell"><div class="num">${fmtCal(s.goal)}</div><div class="lbl">Goal</div></div>
        <div class="summary-op">−</div>
        <div class="summary-cell"><div class="num">${fmtCal(s.calories)}</div><div class="lbl">Food</div></div>
        <div class="summary-op">+</div>
        <div class="summary-cell"><div class="num">${fmtCal(s.burned)}</div><div class="lbl">Exercise</div></div>
        <div class="summary-op">=</div>
        <div class="summary-cell">
          <div class="num ${overBudget ? 'over-budget' : ''}">${fmtCal(s.remaining)}</div>
          <div class="lbl">Remaining</div>
        </div>
      </div>
      <div class="progress"><div class="progress-fill ${overBudget ? 'over-budget' : ''}" style="width:${pct}%"></div></div>
      <div class="macro-grid">
        ${macroBar('Protein', s.protein, store.settings.proteinGoal)}
        ${macroBar('Carbs', s.carbs, store.settings.carbsGoal)}
        ${macroBar('Fat', s.fat, store.settings.fatGoal)}
      </div>
    </div>
    ${MEALS.map(mealCard).join('')}`;

  $$('#view-diary [data-action="add-food"]').forEach((b) =>
    b.addEventListener('click', () => openFoodModal(b.dataset.meal)));
  $$('#view-diary [data-action="edit-entry"]').forEach((row) =>
    row.addEventListener('click', () => openEditEntryModal(row.dataset.id)));
}

// ---------------------------------------------------------------- food modal

const foodModal = {
  meal: 'breakfast',
  step: 'search',       // search | portion | newcustom
  tab: 'search',        // search | myfoods | quickadd
  query: '',
  results: [],
  errors: [],
  loading: false,
  searched: false,
  food: null,           // selected (resolved) food for the portion step
  resolving: false,
  resolveError: '',
  editingEntryId: null, // set when editing an existing diary entry
  searchTimer: null,
};

function openFoodModal(meal) {
  Object.assign(foodModal, {
    meal, step: 'search', tab: 'search', query: '', results: [], errors: [],
    loading: false, searched: false, food: null, resolving: false,
    resolveError: '', editingEntryId: null,
  });
  renderFoodModal();
}

function openEditEntryModal(id) {
  const entry = store.data.diary.find((e) => e.id === id);
  if (!entry) return;
  Object.assign(foodModal, {
    meal: entry.meal,
    step: 'portion',
    editingEntryId: id,
    resolving: false,
    resolveError: '',
    food: {
      name: entry.name,
      brand: entry.brand,
      source: entry.source || 'custom',
      servingLabel: entry.servingLabel,
      calories: entry.per?.calories ?? entry.calories,
      protein: entry.per?.protein ?? entry.protein,
      carbs: entry.per?.carbs ?? entry.carbs,
      fat: entry.per?.fat ?? entry.fat,
    },
  });
  renderFoodModal(entry.servings);
}

function closeModal() {
  $('#modal-root').innerHTML = '';
}

function modalShell(title, bodyHtml, headExtra = '') {
  $('#modal-root').innerHTML = `
    <div class="modal-overlay" data-action="overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <div>${headExtra}<button class="btn-icon" data-action="close" aria-label="Close">×</button></div>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
  $('#modal-root [data-action="close"]').addEventListener('click', closeModal);
  $('#modal-root [data-action="overlay"]').addEventListener('mousedown', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function renderFoodModal(initialServings = 1) {
  if (foodModal.step === 'portion') return renderPortionStep(initialServings);
  if (foodModal.step === 'newcustom') return renderNewCustomStep();

  const providerCfg = store.settings.providers;
  const nixOff = !(providerCfg.nutritionix.enabled && providerCfg.nutritionix.appId && providerCfg.nutritionix.appKey);

  const tabBtn = (id, label) =>
    `<button class="tab ${foodModal.tab === id ? 'active' : ''}" data-modal-tab="${id}">${label}</button>`;

  let body = '';
  if (foodModal.tab === 'search') {
    body = `
      <div class="modal-body">
        <div class="search-row">
          <input class="input" id="food-search-input" type="search" placeholder="Search foods, brands, restaurants…"
                 value="${esc(foodModal.query)}" autocomplete="off">
        </div>
        ${nixOff ? '<div class="result-note">Tip: enable Nutritionix in Settings for restaurant menu items (free key).</div>' : ''}
        <div class="results" id="food-results">${resultsHtml()}</div>
      </div>`;
  } else if (foodModal.tab === 'myfoods') {
    const customs = store.customFoods.map((f) => foodRow(f, 'my')).join('');
    const recents = store.recentFoods.map((f) => foodRow(f, 'recent')).join('');
    body = `
      <div class="modal-body">
        <div class="card-header-row" style="margin-top:10px;">
          <h2 style="font-size:14px;margin:0;">Custom foods</h2>
          <button class="btn btn-sm" data-action="new-custom">+ New custom food</button>
        </div>
        ${customs || '<div class="empty-hint">No custom foods yet.</div>'}
        <div class="card-header-row" style="margin-top:16px;"><h2 style="font-size:14px;margin:0;">Recent</h2></div>
        ${recents || '<div class="empty-hint">Foods you log will show up here.</div>'}
      </div>`;
  } else {
    body = `
      <div class="modal-body">
        <form id="quick-add-form" style="margin-top:10px;">
          <label class="field">Description (optional)
            <input class="input" name="name" placeholder="e.g. Slice of birthday cake">
          </label>
          <label class="field">Calories
            <input class="input" name="calories" type="number" min="0" step="1" required>
          </label>
          <div class="field-row">
            <label class="field">Protein (g)<input class="input" name="protein" type="number" min="0" step="0.1"></label>
            <label class="field">Carbs (g)<input class="input" name="carbs" type="number" min="0" step="0.1"></label>
            <label class="field">Fat (g)<input class="input" name="fat" type="number" min="0" step="0.1"></label>
          </div>
          <button class="btn btn-primary" type="submit">Add to ${MEAL_LABELS[foodModal.meal]}</button>
        </form>
      </div>`;
  }

  modalShell(`Add to ${MEAL_LABELS[foodModal.meal]}`, `
    <div class="modal-tabs">
      ${tabBtn('search', 'Search')}${tabBtn('myfoods', 'My Foods')}${tabBtn('quickadd', 'Quick Add')}
    </div>
    ${body}`);

  $$('#modal-root [data-modal-tab]').forEach((b) => b.addEventListener('click', () => {
    foodModal.tab = b.dataset.modalTab;
    renderFoodModal();
  }));

  if (foodModal.tab === 'search') {
    const input = $('#food-search-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('input', () => {
      foodModal.query = input.value;
      clearTimeout(foodModal.searchTimer);
      if (input.value.trim().length < 2) return;
      foodModal.searchTimer = setTimeout(runFoodSearch, 450);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(foodModal.searchTimer);
        runFoodSearch();
      }
    });
    wireResultRows();
  } else if (foodModal.tab === 'myfoods') {
    $('#modal-root [data-action="new-custom"]')?.addEventListener('click', () => {
      foodModal.step = 'newcustom';
      renderFoodModal();
    });
    wireResultRows();
  } else {
    $('#quick-add-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const per = {
        calories: num(fd.get('calories')),
        protein: num(fd.get('protein')),
        carbs: num(fd.get('carbs')),
        fat: num(fd.get('fat')),
      };
      store.addDiaryEntry({
        date: state.date,
        meal: foodModal.meal,
        name: (fd.get('name') || '').toString().trim() || 'Quick add',
        source: 'custom',
        servingLabel: 'serving',
        servings: 1,
        per,
        ...scaleServing(per, 1),
      });
      closeModal();
      toast(`Added to ${MEAL_LABELS[foodModal.meal]}`);
      render();
    });
  }
}

function foodRow(f, context) {
  const cal = f.calories != null ? `${fmtCal(f.calories)} <small>cal</small>` : '…';
  const badge = `<span class="badge src-${esc(f.source)}">${esc(SOURCE_LABELS[f.source] || f.source)}</span>`;
  const removeBtn = context === 'my' && f.source === 'custom'
    ? `<button class="btn-icon" data-remove-custom="${esc(f.id)}" title="Delete custom food" aria-label="Delete custom food">×</button>` : '';
  return `
    <div class="list-row" data-food-key="${esc(f.key)}" data-context="${context}">
      <div class="grow">
        <div class="row-title">${esc(f.name)}</div>
        <div class="row-sub">${esc([f.brand, f.servingLabel].filter(Boolean).join(' · '))} ${badge}</div>
      </div>
      <div class="row-val">${cal}</div>
      ${removeBtn}
    </div>`;
}

function resultsHtml() {
  if (foodModal.loading) return '<div class="result-note"><span class="spinner"></span> Searching…</div>';
  const errors = foodModal.errors.map((e) =>
    `<div class="provider-error">${esc(SOURCE_LABELS[e.source] || e.source)}: ${esc(e.message)}</div>`).join('');
  if (!foodModal.searched) {
    return `${errors}<div class="result-note">Search USDA, Open Food Facts${nutritionixReady() ? ', Nutritionix' : ''} — or check My Foods for things you've logged before.</div>`;
  }
  if (!foodModal.results.length) return `${errors}<div class="result-note">No results. Try fewer words, or use Quick Add.</div>`;
  return errors + foodModal.results.map((f) => foodRow(f, 'search')).join('');
}

function nutritionixReady() {
  const n = store.settings.providers.nutritionix;
  return n.enabled && n.appId?.trim() && n.appKey?.trim();
}

async function runFoodSearch() {
  const query = foodModal.query.trim();
  if (query.length < 2) return;
  foodModal.loading = true;
  foodModal.searched = true;
  const resultsEl = $('#food-results');
  if (resultsEl) resultsEl.innerHTML = resultsHtml();

  const { foods, errors } = await searchFoods(query, store.settings.providers);
  foodModal.loading = false;
  // Ignore stale responses typed over
  if (foodModal.query.trim() !== query) return;
  foodModal.results = foods;
  foodModal.errors = errors;
  const el = $('#food-results');
  if (el) {
    el.innerHTML = resultsHtml();
    wireResultRows();
  }
}

function wireResultRows() {
  $$('#modal-root [data-food-key]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove-custom]')) return;
      const key = row.dataset.foodKey;
      const pool = row.dataset.context === 'search' ? foodModal.results
        : [...store.customFoods, ...store.recentFoods];
      const food = pool.find((f) => f.key === key);
      if (food) selectFood(food);
    });
  });
  $$('#modal-root [data-remove-custom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.removeCustomFood(btn.dataset.removeCustom);
      renderFoodModal();
    });
  });
}

async function selectFood(food) {
  foodModal.food = food;
  foodModal.step = 'portion';
  foodModal.resolveError = '';
  if (food.needsResolve) {
    foodModal.resolving = true;
    renderPortionStep();
    try {
      foodModal.food = await resolveFood(food, store.settings.providers);
    } catch (err) {
      foodModal.resolveError = err.message || 'Request failed.';
    }
    foodModal.resolving = false;
    if (!$('#modal-root .modal')) return; // user closed the modal while resolving
  }
  renderPortionStep();
}

function renderPortionStep(initialServings = 1) {
  const f = foodModal.food;
  const editing = !!foodModal.editingEntryId;
  const title = editing ? 'Edit entry' : `Add to ${MEAL_LABELS[foodModal.meal]}`;

  if (foodModal.resolving) {
    modalShell(title, `<div class="modal-body"><div class="result-note" style="padding:24px 4px;">
      <span class="spinner"></span> Loading nutrition details…</div></div>`);
    return;
  }

  if (foodModal.resolveError) {
    modalShell(title, `<div class="modal-body">
      <div class="provider-error" style="padding:14px 4px;">${esc(foodModal.resolveError)}</div>
      <button class="btn" data-action="back-to-search">Back to search</button>
    </div>`);
    $('#modal-root [data-action="back-to-search"]').addEventListener('click', () => {
      foodModal.step = 'search';
      renderFoodModal();
    });
    return;
  }

  const mealOptions = MEALS.map((m) =>
    `<option value="${m}" ${m === foodModal.meal ? 'selected' : ''}>${MEAL_LABELS[m]}</option>`).join('');

  modalShell(title, `
    <div class="modal-body">
      <div style="margin-bottom:4px;">
        <strong>${esc(f.name)}</strong>
        ${f.brand ? `<span style="color:var(--muted);"> · ${esc(f.brand)}</span>` : ''}
        <span class="badge src-${esc(f.source)}">${esc(SOURCE_LABELS[f.source] || f.source)}</span>
      </div>
      <div class="result-note" style="padding:0 0 6px;">Serving: ${esc(f.servingLabel || 'serving')}</div>
      <div class="portion-preview" id="portion-preview"></div>
      <div class="field-row">
        <label class="field">Servings
          <input class="input" id="portion-servings" type="number" min="0.05" step="0.25" value="${esc(initialServings)}">
          <div class="qty-buttons">
            ${[0.5, 1, 1.5, 2].map((q) => `<button type="button" class="btn btn-sm" data-qty="${q}">${q}</button>`).join('')}
          </div>
        </label>
        <label class="field">Meal
          <select class="input" id="portion-meal">${mealOptions}</select>
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button class="btn btn-primary" id="portion-save">${editing ? 'Save changes' : 'Add food'}</button>
        ${editing
          ? '<button class="btn btn-danger" id="portion-delete">Delete entry</button>'
          : '<button class="btn" data-action="back-to-search">Back</button>'}
      </div>
    </div>`);

  const servingsInput = $('#portion-servings');
  const preview = () => {
    const t = scaleServing(f, num(servingsInput.value, 0));
    $('#portion-preview').innerHTML = `
      <div><div class="num">${fmtCal(t.calories)}</div><div class="lbl">Cal</div></div>
      <div><div class="num">${t.protein}</div><div class="lbl">Protein g</div></div>
      <div><div class="num">${t.carbs}</div><div class="lbl">Carbs g</div></div>
      <div><div class="num">${t.fat}</div><div class="lbl">Fat g</div></div>`;
  };
  preview();
  servingsInput.addEventListener('input', preview);
  $$('#modal-root [data-qty]').forEach((b) => b.addEventListener('click', () => {
    servingsInput.value = b.dataset.qty;
    preview();
  }));

  $('#modal-root [data-action="back-to-search"]')?.addEventListener('click', () => {
    foodModal.step = 'search';
    renderFoodModal();
  });

  $('#portion-delete')?.addEventListener('click', () => {
    if (!confirm('Delete this diary entry?')) return;
    store.removeDiaryEntry(foodModal.editingEntryId);
    closeModal();
    render();
  });

  $('#portion-save').addEventListener('click', () => {
    const servings = num(servingsInput.value, 0);
    if (servings <= 0) { toast('Servings must be greater than zero'); return; }
    const meal = $('#portion-meal').value;
    const per = { calories: f.calories || 0, protein: f.protein || 0, carbs: f.carbs || 0, fat: f.fat || 0 };
    const payload = {
      meal,
      name: f.name,
      brand: f.brand || '',
      source: f.source,
      servingLabel: f.servingLabel || 'serving',
      servings,
      per,
      ...scaleServing(per, servings),
    };
    if (foodModal.editingEntryId) {
      store.updateDiaryEntry(foodModal.editingEntryId, payload);
    } else {
      store.addDiaryEntry({ date: state.date, ...payload });
      store.rememberFood({ ...f, ...per, needsResolve: false });
      toast(`Added to ${MEAL_LABELS[meal]}`);
    }
    closeModal();
    render();
  });
}

function renderNewCustomStep() {
  modalShell('New custom food', `
    <div class="modal-body">
      <form id="custom-food-form" style="margin-top:8px;">
        <label class="field">Name<input class="input" name="name" required placeholder="e.g. Mom's lasagna"></label>
        <div class="field-row">
          <label class="field">Brand (optional)<input class="input" name="brand"></label>
          <label class="field">Serving label<input class="input" name="servingLabel" placeholder="1 slice" value="1 serving"></label>
        </div>
        <label class="field">Calories per serving<input class="input" name="calories" type="number" min="0" step="1" required></label>
        <div class="field-row">
          <label class="field">Protein (g)<input class="input" name="protein" type="number" min="0" step="0.1"></label>
          <label class="field">Carbs (g)<input class="input" name="carbs" type="number" min="0" step="0.1"></label>
          <label class="field">Fat (g)<input class="input" name="fat" type="number" min="0" step="0.1"></label>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" type="submit">Save food</button>
          <button class="btn" type="button" data-action="cancel-custom">Cancel</button>
        </div>
      </form>
    </div>`);

  $('#modal-root [data-action="cancel-custom"]').addEventListener('click', () => {
    foodModal.step = 'search';
    foodModal.tab = 'myfoods';
    renderFoodModal();
  });

  $('#custom-food-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const food = store.addCustomFood({
      name: fd.get('name').toString().trim(),
      brand: (fd.get('brand') || '').toString().trim(),
      servingLabel: (fd.get('servingLabel') || '1 serving').toString().trim() || '1 serving',
      calories: num(fd.get('calories')),
      protein: num(fd.get('protein')),
      carbs: num(fd.get('carbs')),
      fat: num(fd.get('fat')),
      needsResolve: false,
    });
    selectFood(food);
  });
}

// ---------------------------------------------------------------- workouts view

function renderWorkouts() {
  const workouts = store.workoutsFor(state.date);
  const unit = store.settings.weightUnit;
  const burned = workouts.reduce((sum, w) => sum + num(w.caloriesBurned), 0);

  const workoutCard = (w) => {
    let detail = '';
    let meta = [];
    if (w.type === 'strength') {
      const sets = (w.sets || []).map((s, i) =>
        `<li>Set ${i + 1}: ${esc(s.reps)} reps × ${esc(s.weight)} ${esc(unit)}</li>`).join('');
      detail = `<ul class="sets">${sets}</ul>`;
      meta.push(`${(w.sets || []).length} sets`, `${strengthVolume(w.sets).toLocaleString()} ${unit} volume`);
    } else {
      meta.push(`${w.durationMin} min`);
      if (w.distance) meta.push(`${w.distance} ${w.distanceUnit || 'mi'}`);
    }
    if (w.caloriesBurned) meta.push(`${fmtCal(w.caloriesBurned)} cal burned`);
    return `
      <div class="card workout-card">
        <div class="card-header-row">
          <h2>${esc(w.name)} <span class="badge">${w.type === 'strength' ? 'Strength' : 'Cardio'}</span></h2>
          <div class="workout-actions">
            <button class="btn btn-sm" data-edit-workout="${esc(w.id)}">Edit</button>
            <button class="btn btn-sm btn-danger" data-del-workout="${esc(w.id)}">Delete</button>
          </div>
        </div>
        ${detail}
        ${w.notes ? `<div class="section-note">${esc(w.notes)}</div>` : ''}
        <div class="workout-meta">${meta.map(esc).join(' · ')}</div>
      </div>`;
  };

  $('#view-workouts').innerHTML = `
    <div class="card">
      <div class="card-header-row">
        <h2>${formatDateLabel(state.date)}'s training</h2>
        <button class="btn btn-primary btn-sm" id="add-workout">+ Log workout</button>
      </div>
      <div class="workout-meta">
        ${workouts.length} workout${workouts.length === 1 ? '' : 's'}
        ${burned ? ` · ${fmtCal(burned)} cal burned${store.settings.creditExercise ? ' (credited to diary)' : ''}` : ''}
      </div>
    </div>
    ${workouts.map(workoutCard).join('') || '<div class="card"><div class="empty-hint" style="border:none;">No workouts logged for this day.</div></div>'}`;

  $('#add-workout').addEventListener('click', () => openWorkoutModal());
  $$('#view-workouts [data-edit-workout]').forEach((b) =>
    b.addEventListener('click', () => openWorkoutModal(b.dataset.editWorkout)));
  $$('#view-workouts [data-del-workout]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!confirm('Delete this workout?')) return;
      store.removeWorkout(b.dataset.delWorkout);
      render();
    }));
}

// ---------------------------------------------------------------- workout modal

const workoutModal = { id: null, type: 'strength', sets: [] };

function openWorkoutModal(id = null) {
  const existing = id ? store.data.workouts.find((w) => w.id === id) : null;
  workoutModal.id = id;
  workoutModal.type = existing?.type || 'strength';
  workoutModal.sets = existing?.sets?.map((s) => ({ ...s })) || [{ reps: 10, weight: 0 }];
  renderWorkoutModal(existing);
}

// `draft` carries unsaved form values across intra-modal re-renders (type toggle,
// add/remove set) so typed-but-unsaved fields aren't lost.
function renderWorkoutModal(existing = null, draft = null) {
  const unit = store.settings.weightUnit;
  const isStrength = workoutModal.type === 'strength';
  const names = store.exerciseNames();
  const editing = !!workoutModal.id;
  const v = {
    name: draft?.name ?? existing?.name ?? '',
    durationMin: draft?.durationMin ?? existing?.durationMin ?? 30,
    distance: draft?.distance ?? existing?.distance ?? '',
    distanceUnit: draft?.distanceUnit ?? existing?.distanceUnit ?? 'mi',
    caloriesBurned: draft?.caloriesBurned ?? existing?.caloriesBurned ?? '',
    notes: draft?.notes ?? existing?.notes ?? '',
  };

  const setsHtml = workoutModal.sets.map((s, i) => `
    <div class="set-editor-row">
      <span class="set-num">Set ${i + 1}</span>
      <input class="input" type="number" min="0" step="1" data-set-reps="${i}" value="${esc(s.reps)}" aria-label="Reps"> reps
      <input class="input" type="number" min="0" step="0.5" data-set-weight="${i}" value="${esc(s.weight)}" aria-label="Weight"> ${esc(unit)}
      <button type="button" class="btn-icon" data-remove-set="${i}" aria-label="Remove set">×</button>
    </div>`).join('');

  modalShell(editing ? 'Edit workout' : 'Log workout', `
    <div class="modal-body">
      <div class="seg" role="tablist" aria-label="Workout type">
        <button type="button" class="${isStrength ? 'active' : ''}" data-wtype="strength">Strength</button>
        <button type="button" class="${isStrength ? '' : 'active'}" data-wtype="cardio">Cardio</button>
      </div>
      <form id="workout-form">
        <label class="field">${isStrength ? 'Exercise' : 'Activity'}
          <input class="input" name="name" required list="exercise-names" autocomplete="off"
                 placeholder="${isStrength ? 'e.g. Bench press' : 'e.g. Running'}" value="${esc(v.name)}">
          <datalist id="exercise-names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        </label>
        ${isStrength ? `
          <div id="sets-editor">${setsHtml}</div>
          <button type="button" class="btn btn-sm" id="add-set">+ Add set</button>
        ` : `
          <div class="field-row">
            <label class="field">Duration (min)
              <input class="input" name="durationMin" type="number" min="1" step="1" required value="${esc(v.durationMin)}">
            </label>
            <label class="field">Distance (optional)
              <input class="input" name="distance" type="number" min="0" step="0.01" value="${esc(v.distance)}">
            </label>
            <label class="field">Unit
              <select class="input" name="distanceUnit">
                <option value="mi" ${v.distanceUnit !== 'km' ? 'selected' : ''}>mi</option>
                <option value="km" ${v.distanceUnit === 'km' ? 'selected' : ''}>km</option>
              </select>
            </label>
          </div>
        `}
        <div class="field-row" style="margin-top:10px;">
          <label class="field">Calories burned (optional)
            <input class="input" name="caloriesBurned" type="number" min="0" step="1" value="${esc(v.caloriesBurned)}">
          </label>
          <label class="field">Notes (optional)
            <input class="input" name="notes" value="${esc(v.notes)}">
          </label>
        </div>
        <button class="btn btn-primary" type="submit" style="margin-top:4px;">${editing ? 'Save changes' : 'Save workout'}</button>
      </form>
    </div>`);

  // Snapshot every form field (fields absent in the current mode fall back to
  // the values this render was seeded with).
  const readForm = () => ({
    name: $('#workout-form [name="name"]')?.value ?? v.name,
    durationMin: $('#workout-form [name="durationMin"]')?.value ?? v.durationMin,
    distance: $('#workout-form [name="distance"]')?.value ?? v.distance,
    distanceUnit: $('#workout-form [name="distanceUnit"]')?.value ?? v.distanceUnit,
    caloriesBurned: $('#workout-form [name="caloriesBurned"]')?.value ?? v.caloriesBurned,
    notes: $('#workout-form [name="notes"]')?.value ?? v.notes,
  });

  $$('#modal-root [data-wtype]').forEach((b) => b.addEventListener('click', () => {
    if (workoutModal.type === b.dataset.wtype) return;
    syncSets();
    workoutModal.type = b.dataset.wtype;
    renderWorkoutModal(existing, readForm());
  }));

  const syncSets = () => {
    workoutModal.sets.forEach((s, i) => {
      s.reps = num($(`[data-set-reps="${i}"]`)?.value, s.reps);
      s.weight = num($(`[data-set-weight="${i}"]`)?.value, s.weight);
    });
  };

  $('#add-set')?.addEventListener('click', () => {
    syncSets();
    const last = workoutModal.sets[workoutModal.sets.length - 1];
    workoutModal.sets.push({ reps: last?.reps ?? 10, weight: last?.weight ?? 0 });
    renderWorkoutModal(existing, readForm());
  });

  $$('#modal-root [data-remove-set]').forEach((b) => b.addEventListener('click', () => {
    syncSets();
    workoutModal.sets.splice(Number(b.dataset.removeSet), 1);
    if (!workoutModal.sets.length) workoutModal.sets.push({ reps: 10, weight: 0 });
    renderWorkoutModal(existing, readForm());
  }));

  $('#workout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const base = {
      date: existing?.date || state.date,
      type: workoutModal.type,
      name: fd.get('name').toString().trim(),
      caloriesBurned: num(fd.get('caloriesBurned')) || 0,
      notes: (fd.get('notes') || '').toString().trim(),
    };
    let payload;
    if (workoutModal.type === 'strength') {
      syncSets();
      const sets = workoutModal.sets.filter((s) => s.reps > 0);
      if (!sets.length) { toast('Add at least one set with reps'); return; }
      payload = { ...base, sets, durationMin: null, distance: null, distanceUnit: null };
    } else {
      const durationMin = num(fd.get('durationMin'));
      if (durationMin <= 0) { toast('Duration must be greater than zero'); return; }
      payload = {
        ...base,
        sets: null,
        durationMin,
        distance: num(fd.get('distance')) || null,
        distanceUnit: fd.get('distanceUnit')?.toString() || 'mi',
      };
    }
    if (workoutModal.id) store.updateWorkout(workoutModal.id, payload);
    else store.addWorkout(payload);
    closeModal();
    toast(workoutModal.id ? 'Workout updated' : 'Workout logged');
    render();
  });
}

// ---------------------------------------------------------------- trends view

function renderTrends() {
  const days = lastNDays(14, state.date);
  const goal = num(store.settings.calorieGoal);
  const byDay = days.map((d) => {
    const entries = store.diaryFor(d);
    const workouts = store.workoutsFor(d);
    return {
      date: d,
      calories: diaryTotals(entries).calories,
      logged: entries.length > 0,
      workouts: workouts.length,
      burned: workouts.reduce((s, w) => s + num(w.caloriesBurned), 0),
    };
  });

  const loggedDays = byDay.filter((d) => d.logged);
  const avg = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length) : 0;
  // Same budget verdict the diary shows: exercise calories count when credited.
  const netFor = (d) => d.calories - (store.settings.creditExercise ? d.burned : 0);
  const onBudget = loggedDays.filter((d) => netFor(d) <= goal).length;
  const totalWorkouts = byDay.reduce((s, d) => s + d.workouts, 0);
  const totalBurned = byDay.reduce((s, d) => s + d.burned, 0);

  const max = Math.max(goal, ...byDay.map((d) => d.calories)) * 1.08 || 1;
  const goalPct = (goal / max) * 100;

  const bars = byDay.map((d) => {
    const pct = Math.max(d.logged ? 2 : 1.2, (d.calories / max) * 100);
    const over = goal > 0 && netFor(d) > goal;
    const label = `${formatDateLabel(d.date)}: ${d.logged ? `${fmtCal(d.calories)} cal` : 'nothing logged'}`
      + (d.workouts ? `, ${d.workouts} workout${d.workouts === 1 ? '' : 's'}` : '');
    const tip = `${formatDateLabel(d.date)}\n${d.logged ? `${fmtCal(d.calories)} cal` : 'not logged'}${d.workouts ? ` · ${d.workouts} 🏋` : ''}`;
    return `
      <div class="bar-col" data-tip="${esc(tip)}" role="img" aria-label="${esc(label)}">
        <div class="bar ${d.logged ? (over ? 'over-goal' : '') : 'empty'}" style="height:${pct}%"></div>
      </div>`;
  }).join('');

  const dayLabels = byDay.map((d) => {
    const letter = new Date(d.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
    return `<span class="${d.date === todayKey() ? 'today' : ''}">${letter}</span>`;
  }).join('');

  $('#view-trends').innerHTML = `
    <div class="stat-tiles">
      <div class="stat-tile"><div class="num">${avg ? fmtCal(avg) : '—'}</div><div class="lbl">Avg cal / logged day</div></div>
      <div class="stat-tile"><div class="num">${loggedDays.length ? `${onBudget}/${loggedDays.length}` : '—'}</div><div class="lbl">Days at or under goal</div></div>
      <div class="stat-tile"><div class="num">${totalWorkouts}</div><div class="lbl">Workouts (14 days)</div></div>
      <div class="stat-tile"><div class="num">${totalBurned ? fmtCal(totalBurned) : '—'}</div><div class="lbl">Cal burned (14 days)</div></div>
    </div>
    <div class="card">
      <h2>Calories — last 14 days</h2>
      <div class="chart">
        ${goal > 0 ? `<div class="goal-line" style="bottom:${goalPct}%"><span>goal ${fmtCal(goal)}</span></div>` : ''}
        ${bars}
      </div>
      <div class="chart-days">${dayLabels}</div>
      <div class="chart-legend">
        <span class="chip"><span class="swatch" style="background:var(--accent)"></span> at/under goal</span>
        <span class="chip"><span class="swatch" style="background:var(--over)"></span> over goal</span>
        <span class="chip"><span class="swatch goal-swatch"></span> daily goal</span>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- settings view

function renderSettings() {
  const s = store.settings;
  const p = s.providers;

  $('#view-settings').innerHTML = `
    <div class="card">
      <h2>Daily goals</h2>
      <form id="goals-form">
        <div class="field-row">
          <label class="field">Calories<input class="input" name="calorieGoal" type="number" min="0" step="10" value="${esc(s.calorieGoal)}"></label>
          <label class="field">Protein (g)<input class="input" name="proteinGoal" type="number" min="0" value="${esc(s.proteinGoal)}"></label>
          <label class="field">Carbs (g)<input class="input" name="carbsGoal" type="number" min="0" value="${esc(s.carbsGoal)}"></label>
          <label class="field">Fat (g)<input class="input" name="fatGoal" type="number" min="0" value="${esc(s.fatGoal)}"></label>
        </div>
        <button class="btn btn-primary btn-sm" type="submit">Save goals</button>
      </form>
    </div>

    <div class="card">
      <h2>Preferences</h2>
      <label class="field" style="max-width:220px;">Weight unit
        <select class="input" id="pref-unit">
          <option value="lb" ${s.weightUnit === 'lb' ? 'selected' : ''}>Pounds (lb)</option>
          <option value="kg" ${s.weightUnit === 'kg' ? 'selected' : ''}>Kilograms (kg)</option>
        </select>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" id="pref-credit" ${s.creditExercise ? 'checked' : ''}>
        Add exercise calories back to my daily budget
      </label>
    </div>

    <div class="card">
      <h2>Food databases</h2>
      <p class="section-note" style="margin:0 0 10px;">MyFitnessPal doesn't offer a public API, so Tally plugs into open databases instead. Enable any mix — results are searched together.</p>
      <form id="providers-form">
        <div class="provider-block">
          <label class="checkbox-row"><input type="checkbox" name="usdaEnabled" ${p.usda.enabled ? 'checked' : ''}> USDA FoodData Central</label>
          <div class="desc">Generic + branded grocery foods. Works out of the box; a free key from
            <a href="https://api.data.gov/signup/" target="_blank" rel="noreferrer">api.data.gov</a> lifts the shared rate limit.</div>
          <div class="keys"><label class="field">API key (optional)
            <input class="input" name="usdaKey" placeholder="DEMO_KEY (default)" value="${esc(p.usda.apiKey)}"></label></div>
        </div>
        <div class="provider-block">
          <label class="checkbox-row"><input type="checkbox" name="nixEnabled" ${p.nutritionix.enabled ? 'checked' : ''}> Nutritionix</label>
          <div class="desc">Best coverage for restaurant &amp; chain menu items (McDonald's, Chipotle, …).
            Free key at <a href="https://developer.nutritionix.com" target="_blank" rel="noreferrer">developer.nutritionix.com</a>.</div>
          <div class="keys">
            <div class="field-row">
              <label class="field">App ID<input class="input" name="nixAppId" value="${esc(p.nutritionix.appId)}"></label>
              <label class="field">App Key<input class="input" name="nixAppKey" type="password" value="${esc(p.nutritionix.appKey)}"></label>
            </div>
          </div>
        </div>
        <div class="provider-block">
          <label class="checkbox-row"><input type="checkbox" name="offEnabled" ${p.off.enabled ? 'checked' : ''}> Open Food Facts</label>
          <div class="desc">Community database of packaged foods. Free, no key needed.</div>
        </div>
        <button class="btn btn-primary btn-sm" type="submit">Save data sources</button>
      </form>
    </div>

    <div class="card">
      <h2>Your data</h2>
      <p class="section-note" style="margin:0 0 10px;">Everything is stored locally on this device. Export a backup before switching machines.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" id="export-data">Export backup</button>
        <button class="btn" id="import-data">Import backup</button>
        <input type="file" id="import-file" accept="application/json" class="hidden">
      </div>
    </div>

    <div class="card danger-zone">
      <h2>Danger zone</h2>
      <button class="btn btn-danger" id="clear-data">Delete all data</button>
    </div>`;

  $('#goals-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    store.updateSettings({
      calorieGoal: num(fd.get('calorieGoal'), 2200),
      proteinGoal: num(fd.get('proteinGoal'), 0),
      carbsGoal: num(fd.get('carbsGoal'), 0),
      fatGoal: num(fd.get('fatGoal'), 0),
    });
    toast('Goals saved');
  });

  $('#pref-unit').addEventListener('change', (e) => {
    store.updateSettings({ weightUnit: e.target.value });
    toast('Saved');
  });

  $('#pref-credit').addEventListener('change', (e) => {
    store.updateSettings({ creditExercise: e.target.checked });
    toast('Saved');
  });

  $('#providers-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    store.updateSettings({
      providers: {
        usda: { enabled: !!fd.get('usdaEnabled'), apiKey: fd.get('usdaKey').toString().trim() },
        nutritionix: {
          enabled: !!fd.get('nixEnabled'),
          appId: fd.get('nixAppId').toString().trim(),
          appKey: fd.get('nixAppKey').toString().trim(),
        },
        off: { enabled: !!fd.get('offEnabled') },
      },
    });
    toast('Data sources saved');
  });

  $('#export-data').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tally-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#import-data').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const result = store.importJSON(await file.text());
      if (result.ok) { toast('Backup imported'); render(); }
      else toast(result.error);
    } catch {
      toast("Couldn't import that file.");
    }
  });

  $('#clear-data').addEventListener('click', () => {
    if (!confirm('Delete ALL diary entries, workouts, and settings? This cannot be undone.')) return;
    store.clearAll();
    toast('All data deleted');
    render();
  });
}

// ---------------------------------------------------------------- root render

function render() {
  renderHeader();
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${state.tab}`).classList.remove('hidden');
  if (state.tab === 'diary') renderDiary();
  else if (state.tab === 'workouts') renderWorkouts();
  else if (state.tab === 'trends') renderTrends();
  else renderSettings();
}

// header wiring (static elements, wired once)
$('#date-prev').addEventListener('click', () => setDate(addDays(state.date, -1)));
$('#date-next').addEventListener('click', () => setDate(addDays(state.date, 1)));
$('#date-label').addEventListener('click', () => setDate(todayKey()));
$('#date-picker').addEventListener('change', (e) => {
  if (e.target.value) setDate(e.target.value);
});
$('#date-pick-btn').addEventListener('click', () => {
  const picker = $('#date-picker');
  if (picker.showPicker) picker.showPicker();
  else picker.focus();
});
$$('.tabs .tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

render();
