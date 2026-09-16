import { DISHES, DISH_IDS, CONFIG } from './definitions.js';
import {
  cookNeeded, platesCount, bbqCost, canBuyBbq, goalReached,
} from './engine.js';
import { renderScene, groupAt, plateAt, toScene } from './scene.js';

const $ = id => document.getElementById(id);

// Estat intern de la UI: el plat que s'està arrossegant del taulell cap a un
// client. { dish, index, x, y } amb la posició dins de l'escena.
let drag = null;
let lastState = null;

export function render(state) {
  lastState = state;

  $('money').textContent = Math.floor(state.money);
  renderGoal(state);
  renderShop(state);
  renderScene(state, drag);           // els clients i la cuina es veuen a l'escena
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

  const ready = DISH_IDS.reduce((n, id) => n + platesCount(state, id), 0);
  $('plates').innerHTML = ready
    ? '<div class="muted">Arrossega els plats del taulell fins al client que els vol</div>'
    : '';
}

export function wire(handlers) {
  const { onStartCooking, onDeliver, onBuyBbq } = handlers;

  document.body.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // només botó principal / toc
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'cook') onStartCooking(Number(t.dataset.bbq), t.dataset.dish);
    else if (a === 'buy-bbq') onBuyBbq();
  });

  wireDragAndDrop($('scene'), onDeliver);
}

// Servir = agafar un plat del taulell i deixar-lo anar sobre el client.
function wireDragAndDrop(scene, onDeliver) {
  scene.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const picked = plateAt(e.clientX, e.clientY);
    if (!picked) return;
    e.preventDefault();
    drag = { ...picked, ...toScene(e.clientX, e.clientY) };
    scene.setPointerCapture(e.pointerId);
    scene.classList.add('dragging');
    renderScene(lastState, drag);
  });

  scene.addEventListener('pointermove', (e) => {
    if (!drag) {
      scene.classList.toggle('grabbable', plateAt(e.clientX, e.clientY) !== null);
      return;
    }
    Object.assign(drag, toScene(e.clientX, e.clientY));
    renderScene(lastState, drag);
  });

  const drop = (e) => {
    if (!drag) return;
    const { dish } = drag;
    const group = groupAt(e.clientX, e.clientY);
    drag = null;
    scene.classList.remove('dragging');
    scene.classList.toggle('grabbable', plateAt(e.clientX, e.clientY) !== null);
    if (group === null) render(lastState);   // el plat torna al taulell
    else onDeliver(group, dish);
  };

  scene.addEventListener('pointerup', drop);
  scene.addEventListener('pointercancel', drop);
}

export function notify(events) {
  if (!events.length) return;
  const el = $('notice');
  const msgs = events.map(ev => (ev.type === 'arrival' ? `🔔 Ha arribat un grup de ${ev.size}!` : ''));
  el.textContent = msgs.join('  ');
  el.classList.remove('hidden');
}
