import { DISHES, DISH_IDS, CONFIG } from './definitions.js';
import {
  anyTicketInKitchen, tableWantsDish, cookNeeded, platesCount,
  tableCost, bbqCost, waiterCost, cookCost, waiterSkillCost, cookSkillCost,
} from './engine.js';

const $ = id => document.getElementById(id);

// Estat intern de la UI: quin plat llest hem "agafat" per entregar.
let selectedDish = null;
let lastState = null;

export function render(state) {
  lastState = state;
  if (selectedDish && platesCount(state, selectedDish) === 0) selectedDish = null;

  $('money').textContent = Math.floor(state.money);
  renderShop(state);
  renderStaff(state);
  renderTables(state);
  renderKitchen(state);
}

function shopBtn(id, label, cost, money) {
  const el = $(id);
  el.innerHTML = `${label} <b>${cost} €</b>`;
  el.disabled = money < cost;
}

function renderShop(state) {
  const m = state.money;
  shopBtn('buy-table', '➕ Taula', tableCost(state), m);
  shopBtn('buy-bbq', '➕ BBQ', bbqCost(state), m);
  shopBtn('hire-waiter', '🧑‍💼 Cambrer', waiterCost(state), m);
  shopBtn('hire-cook', '🧑‍🍳 Cuiner', cookCost(state), m);
  shopBtn('up-waiter', '⚡ Vel. cambrer', waiterSkillCost(state), m);
  shopBtn('up-cook', '⚡ Vel. cuiner', cookSkillCost(state), m);
}

function renderStaff(state) {
  const wBusy = state.waiters.filter(w => w.cooldown > 0).length;
  const cBusy = state.cooks.filter(c => c.cooldown > 0).length;
  $('staff').innerHTML =
    `🧑‍💼 Cambrers: <b>${state.waiters.length}</b> (vel. ${state.waiterSkill}) · actius ${wBusy}` +
    ` &nbsp;|&nbsp; 🧑‍🍳 Cuiners: <b>${state.cooks.length}</b> (vel. ${state.cookSkill}) · actius ${cBusy}`;
}

function renderTables(state) {
  $('tables').innerHTML = state.tables.map((t, i) => renderTableCard(t, i)).join('');
}

function renderTableCard(t, i) {
  if (t === null) {
    return `<div class="table-card empty">Taula ${i + 1}<br><span class="muted">buida…</span></div>`;
  }
  const eating = t.eatingTimer !== null;
  const diners = t.diners.map(d => {
    const st = d.status === 'served' ? (eating ? 'menjant' : 'servit') : 'esperant';
    return `<div class="diner ${d.status}"><span class="em">${DISHES[d.dish].emoji}</span><span class="st">${st}</span></div>`;
  }).join('');

  let extra = '';
  if (eating) {
    const pct = Math.max(0, Math.min(100, ((CONFIG.eatTime - t.eatingTimer) / CONFIG.eatTime) * 100));
    extra = `<div class="eating">😋 Menjant…<div class="bar"><span style="width:${pct}%"></span></div></div>`;
  } else if (t.ticketLocation === 'table') {
    extra = `<div class="ticket" data-action="ticket" data-table="${i}">🎫 Envia a la cuina</div>`;
  }

  const isTarget = selectedDish && tableWantsDish(t, selectedDish);
  const targetAttr = isTarget ? ` data-action="deliver-table" data-table="${i}"` : '';
  const cls = `table-card${isTarget ? ' target' : ''}`;
  return `<div class="${cls}"${targetAttr}><div class="th">Taula ${i + 1}</div><div class="diners">${diners}</div>${extra}</div>`;
}

function renderKitchen(state) {
  const parts = DISH_IDS
    .map(id => ({ id, n: cookNeeded(state, id) }))
    .filter(x => x.n > 0)
    .map(x => `${x.n}×${DISHES[x.id].emoji}`);
  $('order').textContent = parts.length ? `A cuinar: ${parts.join('  ')}` : 'Res per cuinar';

  const canCook = anyTicketInKitchen(state);
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
  const hint = selectedDish ? `<div class="muted">Plat agafat: ${DISHES[selectedDish].emoji} — clica una taula per servir</div>` : '';
  $('plates').innerHTML = (btns.length ? `Plats llestos: ${btns.join(' ')}` : '') + hint;
}

export function wire(handlers) {
  const {
    onSendTicket, onStartCooking, onDeliver,
    onBuyTable, onBuyBbq, onHireWaiter, onHireCook, onUpWaiter, onUpCook,
  } = handlers;
  document.body.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return; // només botó principal / toc
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'ticket') onSendTicket(Number(t.dataset.table));
    else if (a === 'cook') onStartCooking(Number(t.dataset.bbq), t.dataset.dish);
    else if (a === 'pick-plate') { selectedDish = selectedDish === t.dataset.dish ? null : t.dataset.dish; render(lastState); }
    else if (a === 'deliver-table') { onDeliver(Number(t.dataset.table), selectedDish); selectedDish = null; }
    else if (a === 'buy-table') onBuyTable();
    else if (a === 'buy-bbq') onBuyBbq();
    else if (a === 'hire-waiter') onHireWaiter();
    else if (a === 'hire-cook') onHireCook();
    else if (a === 'up-waiter') onUpWaiter();
    else if (a === 'up-cook') onUpCook();
  });
}

export function notify(events) {
  if (!events.length) return;
  const el = $('notice');
  const msgs = events.map(ev => {
    if (ev.type === 'arrival') return `🔔 Ha arribat una taula de ${ev.size}!`;
    if (ev.type === 'payment') return `💰 Han pagat ${ev.amount} €!`;
    return '';
  });
  el.textContent = msgs.join('  ');
  el.classList.remove('hidden');
}
