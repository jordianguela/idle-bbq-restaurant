import { CONFIG, STAFF, STAFF_IDS } from './definitions.js';
import {
  bbqCost, canBuyBbq, fireCost, canBuyFire, fireFactor,
  staffSpeedCost, canBuyStaffSpeed, staffSpeedFactor,
  hireCost, canHire, goalReached,
} from './engine.js';
import { renderScene, hotspotAt, dropTargetAt, toScene } from './scene.js';

const $ = id => document.getElementById(id);

// Estat de la interacció (no és estat de joc): què s'arrossega, quin menú de
// graella hi ha obert i on és el punter, per marcar l'opció de sota.
const ui = { drag: null, menu: null, pointer: null };
let lastState = null;

export function render(state) {
  lastState = state;

  // si el plat que portàvem ja no hi és (l'ha agafat el personal, per exemple)
  if (ui.drag) {
    const plates = ui.drag.kind === 'ready' ? state.readyPlates : state.dirtyPlates;
    if (plates[ui.drag.index] !== ui.drag.dish) ui.drag = null;
  }

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
    offer({
      action: 'buy-staff-speed',
      icon: '🏃',
      name: 'Personal més ràpid',
      note: canBuyStaffSpeed(state)
        ? `feina ×${staffSpeedFactor(state).toFixed(2)} → ×${(staffSpeedFactor(state) + CONFIG.staffSpeed.step).toFixed(2)}`
        : `feina ×${staffSpeedFactor(state).toFixed(2)}`,
      cost: canBuyStaffSpeed(state) ? staffSpeedCost(state) : null,
      money: state.money,
    }),
    ...STAFF_IDS.map(role => offer({
      action: 'hire',
      role,
      icon: STAFF[role].icon,
      name: STAFF[role].name,
      note: `${STAFF[role].job} · ${state.staff[role]} de ${STAFF[role].max}`,
      cost: canHire(state, role) ? hireCost(state, role) : null,
      money: state.money,
    })),
  ].join('');
}

// cost null = ja està al màxim
function offer({ action, role, icon, name, note, cost, money }) {
  const maxed = cost === null;
  const disabled = maxed || money < cost;
  return `<button class="shop-btn" data-action="${action}"${role ? ` data-role="${role}"` : ''} ${disabled ? 'disabled' : ''}>
    <span class="s-icon">${icon}</span>
    <span class="s-text"><b>${name}</b><small>${note}</small></span>
    <span class="s-cost">${maxed ? 'màxim ✅' : `${cost} €`}</span>
  </button>`;
}

export function wire(handlers) {
  $('build').addEventListener('click', () => $('shop').classList.toggle('hidden'));
  $('shop').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'buy-bbq') handlers.onBuyBbq();
    else if (el.dataset.action === 'buy-fire') handlers.onBuyFire();
    else if (el.dataset.action === 'buy-staff-speed') handlers.onBuyStaffSpeed();
    else if (el.dataset.action === 'hire') handlers.onHire(el.dataset.role);
  });
  wireScene($('scene'), handlers);
}

// Tota la partida es juga a l'escena: clicar la graella per triar el plat, i
// portar els plats o bé arrossegant-los, o bé clicant-los i clicant on van.
function wireScene(scene, { onStartCooking, onDeliver, onWash }) {
  const CLICK_SLOP = 3;   // píxels d'escena: menys que això, és un clic

  // Deixar el plat que portem: al client, a la pica, o enlloc (torna al seu lloc).
  const release = (e) => {
    const held = ui.drag;
    ui.drag = null;
    scene.classList.remove('dragging');

    const target = dropTargetAt(e.clientX, e.clientY, held.kind);
    if (!target) render(lastState);
    else if (target.type === 'sink') onWash(held.index);
    else onDeliver(target.index, held.dish);
  };

  scene.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;              // només botó principal / toc
    e.preventDefault();

    if (ui.drag && ui.drag.mode === 'click') {   // ja en portàvem un: aquest clic el deixa
      release(e);
      return;
    }

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
      const point = toScene(e.clientX, e.clientY);
      ui.drag = { kind: hit.kind, dish: hit.dish, index: hit.index, mode: 'drag', from: point, ...point };
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
    if (!ui.drag || ui.drag.mode !== 'drag') return;

    // Si el punter gairebé no s'ha mogut, era un clic: el plat queda agafat i
    // el deixarem al pròxim clic.
    const moved = Math.hypot(ui.drag.x - ui.drag.from.x, ui.drag.y - ui.drag.from.y);
    if (moved < CLICK_SLOP) {
      ui.drag.mode = 'click';
      renderScene(lastState, ui);
      return;
    }
    release(e);
  };

  scene.addEventListener('pointerup', drop);
  scene.addEventListener('pointercancel', drop);
}
