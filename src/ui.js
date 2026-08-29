import { DISHES, DISH_IDS, CONFIG } from './definitions.js';
import {
  anyTicketInKitchen, tableWantsDish, cookNeeded, platesCount,
  tableCost, bbqCost,
} from './engine.js';

const $ = id => document.getElementById(id);

// Estat intern de la UI: quin plat llest hem "agafat" per entregar.
let selectedDish = null;
let lastState = null;

export function render(state) {
  lastState = state;
  // si el plat seleccionat ja no existeix, deixa'l anar
  if (selectedDish && platesCount(state, selectedDish) === 0) selectedDish = null;

  $('money').textContent = Math.floor(state.money);
  renderShop(state);
  renderTables(state);
  renderKitchen(state);
}

function renderShop(state) {
  const tc = tableCost(state);
  const bc = bbqCost(state);
  const bt = $('buy-table');
  const bb = $('buy-bbq');
  bt.innerHTML = `➕ Compra taula (${tc} €) <small>${state.tables.length} ara</small>`;
  bb.innerHTML = `➕ Compra BBQ (${bc} €) <small>${state.bbqs.length} ara</small>`;
  bt.disabled = state.money < tc;
  bb.disabled = state.money < bc;
}

function renderTables(state) {
  const el = $('tables');
  el.innerHTML = state.tables.map((t, i) => renderTableCard(t, i, state)).join('');
}

function renderTableCard(t, i, state) {
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

  // taula com a destí d'entrega si tenim un plat agafat que hi encaixa
  const isTarget = selectedDish && tableWantsDish(t, selectedDish);
  const targetAttr = isTarget ? ` data-action="deliver-table" data-table="${i}"` : '';
  const cls = `table-card${isTarget ? ' target' : ''}`;
  return `<div class="${cls}"${targetAttr}><div class="th">Taula ${i + 1}</div><div class="diners">${diners}</div>${extra}</div>`;
}

function renderKitchen(state) {
  // comanda: què falta cuinar en total
  const parts = DISH_IDS
    .map(id => ({ id, n: cookNeeded(state, id) }))
    .filter(x => x.n > 0)
    .map(x => `${x.n}×${DISHES[x.id].emoji}`);
  $('order').textContent = parts.length ? `A cuinar: ${parts.join('  ')}` : 'Res per cuinar';

  // BBQs
  const canCook = anyTicketInKitchen(state);
  $('bbqs').innerHTML = state.bbqs.map((b, i) => {
    if (b) {
      const dish = DISHES[b.dish];
      const pct = Math.max(0, Math.min(100, ((dish.cookTime - b.remaining) / dish.cookTime) * 100));
      return `<div class="bbq-slot">BBQ ${i + 1}: ${dish.emoji} ${dish.name}<div class="bar"><span style="width:${pct}%"></span></div></div>`;
    }
    const buttons = DISH_IDS.map(id =>
      `<button class="dish-btn" data-action="cook" data-bbq="${i}" data-dish="${id}" ${canCook ? '' : 'disabled'}>${DISHES[id].emoji}</button>`
    ).join('');
    return `<div class="bbq-slot">BBQ ${i + 1}: <span class="muted">lliure</span> ${buttons}</div>`;
  }).join('');

  // plats llestos (clica per agafar-ne un)
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
  const { onSendTicket, onStartCooking, onDeliver, onBuyTable, onBuyBbq } = handlers;
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
