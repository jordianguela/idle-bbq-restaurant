import { DISHES, DISH_IDS, CONFIG } from './definitions.js';
import {
  cookNeeded, platesCount, bbqCost, canBuyBbq, goalReached,
} from './engine.js';
import { renderScene, groupAt } from './scene.js';

const $ = id => document.getElementById(id);

// Estat intern de la UI: quin plat llest hem "agafat" per servir.
let selectedDish = null;
let lastState = null;

export function render(state) {
  lastState = state;
  if (selectedDish && platesCount(state, selectedDish) === 0) selectedDish = null;

  $('money').textContent = Math.floor(state.money);
  renderGoal(state);
  renderShop(state);
  renderScene(state, selectedDish);           // els clients i la cuina es veuen a l'escena
  document.body.classList.toggle('picking', selectedDish !== null);
  renderKitchen(state);
}

function renderGoal(state) {
  const pct = Math.max(0, Math.min(100, (state.money / CONFIG.goal) * 100));
  $('goal-cur').textContent = Math.floor(state.money);
  $('goal-max').textContent = CONFIG.goal;
  $('goal-fill').style.width = pct + '%';

  const banner = $('banner');
  if (goalReached(state)) {
    banner.textContent = '🎉 Objectiu assolit! Has desbloquejat el Nivell 2 (properament). Pots seguir jugant.';
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function renderShop(state) {
  const el = $('buy-bbq');
  if (!canBuyBbq(state)) {
    el.innerHTML = `BBQ al màxim (${CONFIG.maxBbqs}) ✅`;
    el.disabled = true;
    return;
  }
  const cost = bbqCost(state);
  el.innerHTML = `➕ Compra BBQ <b>${cost} €</b>`;
  el.disabled = state.money < cost;
}

function renderKitchen(state) {
  const parts = DISH_IDS
    .map(id => ({ id, n: cookNeeded(state, id) }))
    .filter(x => x.n > 0)
    .map(x => `${x.n}×${DISHES[x.id].emoji}`);
  $('order').textContent = parts.length ? `A cuinar: ${parts.join('  ')}` : 'Res per cuinar';

  const canCook = state.queue.length > 0;
  $('bbqs').innerHTML = state.bbqs.map((b, i) => {
    if (b) {
      const pct = Math.max(0, Math.min(100, ((b.total - b.remaining) / b.total) * 100));
      return `<div class="bbq-slot">BBQ ${i + 1}: ${DISHES[b.dish].emoji} ${DISHES[b.dish].name}<div class="bar"><span style="width:${pct}%"></span></div></div>`;
    }
    const buttons = DISH_IDS.map(id =>
      `<button class="dish-btn" data-action="cook" data-bbq="${i}" data-dish="${id}" ${canCook ? '' : 'disabled'}>${DISHES[id].emoji}</button>`
    ).join('');
    return `<div class="bbq-slot">BBQ ${i + 1}: <span class="muted">lliure</span> ${buttons}</div>`;
  }).join('');

  const btns = [];
  for (const id of DISH_IDS) {
    for (let k = 0; k < platesCount(state, id); k++) {
      const sel = selectedDish === id && k === 0 ? ' selected' : '';
      btns.push(`<button class="plate-btn${sel}" data-action="pick-plate" data-dish="${id}">${DISHES[id].emoji}</button>`);
    }
  }
  const hint = selectedDish ? `<div class="muted">Plat agafat: ${DISHES[selectedDish].emoji} — clica els clients que el volen</div>` : '';
  $('plates').innerHTML = (btns.length ? `Plats llestos: ${btns.join(' ')}` : '') + hint;
}

export function wire(handlers) {
  const { onStartCooking, onDeliver, onBuyBbq } = handlers;
  document.body.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // només botó principal / toc

    // clic sobre un grup de clients dibuixat a l'escena
    if (e.target.id === 'scene') {
      const gi = groupAt(e.clientX, e.clientY);
      if (gi !== null && selectedDish) {
        onDeliver(gi, selectedDish);
        selectedDish = null;
      }
      return;
    }

    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'cook') onStartCooking(Number(t.dataset.bbq), t.dataset.dish);
    else if (a === 'pick-plate') { selectedDish = selectedDish === t.dataset.dish ? null : t.dataset.dish; render(lastState); }
    else if (a === 'deliver-group') { onDeliver(Number(t.dataset.group), selectedDish); selectedDish = null; }
    else if (a === 'buy-bbq') onBuyBbq();
  });
}

export function notify(events) {
  if (!events.length) return;
  const el = $('notice');
  const msgs = events.map(ev => (ev.type === 'arrival' ? `🔔 Ha arribat un grup de ${ev.size}!` : ''));
  el.textContent = msgs.join('  ');
  el.classList.remove('hidden');
}
