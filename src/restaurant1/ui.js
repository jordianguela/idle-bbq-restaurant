import { CONFIG } from './definitions.js';
import {
  bbqCost, canBuyBbq, fireCost, canBuyFire, fireFactor, goalReached,
} from './engine.js';
import { renderScene, hotspotAt, dropTargetAt, toScene } from './scene.js';

const $ = id => document.getElementById(id);

// Estat de la interacció (no és estat de joc): què s'arrossega, quin menú de
// graella hi ha obert i on és el punter, per marcar l'opció de sota.
const ui = { drag: null, menu: null, pointer: null };
let lastState = null;

export function render(state) {
  lastState = state;
  renderScene(state, ui);
  renderHud(state);
  renderShop(state);
}

function renderHud(state) {
  const money = Math.floor(state.money);
  $('money').textContent = money;
  $('goal-cur').textContent = money;
  $('goal-max').textContent = CONFIG.goal;
  $('goal-fill').style.width = Math.max(0, Math.min(100, (state.money / CONFIG.goal) * 100)) + '%';

  const banner = $('banner');
  banner.textContent = '🎉 Objectiu assolit! Nivell 2 properament — pots seguir jugant.';
  banner.classList.toggle('hidden', !goalReached(state));
}

function renderShop(state) {
  $('shop').innerHTML = [
    offer({
      action: 'buy-bbq',
      icon: '🍳',
      name: 'Una altra graella',
      note: `${state.bbqs.length} de ${CONFIG.maxBbqs}`,
      cost: canBuyBbq(state) ? bbqCost(state) : null,
      money: state.money,
    }),
    offer({
      action: 'buy-fire',
      icon: '🔥',
      name: 'Foc més fort',
      note: canBuyFire(state)
        ? `cuina ×${fireFactor(state).toFixed(2)} → ×${(fireFactor(state) + CONFIG.fire.step).toFixed(2)}`
        : `cuina ×${fireFactor(state).toFixed(2)}`,
      cost: canBuyFire(state) ? fireCost(state) : null,
      money: state.money,
    }),
  ].join('');
}

// cost null = ja està al màxim
function offer({ action, icon, name, note, cost, money }) {
  const maxed = cost === null;
  const disabled = maxed || money < cost;
  return `<button class="shop-btn" data-action="${action}" ${disabled ? 'disabled' : ''}>
    <span class="s-icon">${icon}</span>
    <span class="s-text"><b>${name}</b><small>${note}</small></span>
    <span class="s-cost">${maxed ? 'màxim ✅' : `${cost} €`}</span>
  </button>`;
}

export function wire(handlers) {
  $('build').addEventListener('click', () => $('shop').classList.toggle('hidden'));
  $('shop').addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'buy-bbq') handlers.onBuyBbq();
    else if (action === 'buy-fire') handlers.onBuyFire();
  });
  wireScene($('scene'), handlers);
}

// Tota la partida es juga a l'escena: clicar la graella per triar el plat,
// arrossegar els plats llestos als clients i els bruts a la pica.
function wireScene(scene, { onStartCooking, onDeliver, onWash }) {
  scene.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;              // només botó principal / toc
    e.preventDefault();
    const hit = hotspotAt(e.clientX, e.clientY);

    if (!hit || hit.type === 'close') {
      ui.menu = null;
      render(lastState);
      return;
    }
    if (hit.type === 'dish') {
      ui.menu = null;
      onStartCooking(hit.bbq, hit.dish);
      return;
    }
    if (hit.type === 'grill') {
      if (lastState.queue.length) ui.menu = hit.index;   // sense clients no hi ha res a coure
      render(lastState);
      return;
    }
    if (hit.type === 'plate') {
      ui.drag = { kind: hit.kind, dish: hit.dish, index: hit.index, ...toScene(e.clientX, e.clientY) };
      scene.setPointerCapture(e.pointerId);
      scene.classList.add('dragging');
      renderScene(lastState, ui);
    }
  });

  scene.addEventListener('pointermove', (e) => {
    const point = toScene(e.clientX, e.clientY);
    if (ui.drag) {
      Object.assign(ui.drag, point);
    } else {
      ui.pointer = point;
      scene.classList.toggle('grabbable', hotspotAt(e.clientX, e.clientY) !== null);
    }
    renderScene(lastState, ui);
  });

  const drop = (e) => {
    if (!ui.drag) return;
    const held = ui.drag;
    ui.drag = null;
    scene.classList.remove('dragging');
    scene.classList.toggle('grabbable', hotspotAt(e.clientX, e.clientY) !== null);

    const target = dropTargetAt(e.clientX, e.clientY, held.kind);
    if (!target) render(lastState);                    // el plat es queda on era
    else if (target.type === 'sink') onWash(held.index);
    else onDeliver(target.index, held.dish);
  };

  scene.addEventListener('pointerup', drop);
  scene.addEventListener('pointercancel', drop);
}
