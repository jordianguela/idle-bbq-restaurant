import { DISHES, DISH_IDS } from './definitions.js';
import { waitingCount, platesCount, ticketInKitchen } from './engine.js';

const $ = id => document.getElementById(id);

export function render(state) {
  $('money').textContent = Math.floor(state.money);
  renderTable(state);
  renderKitchen(state);
}

function renderTable(state) {
  const el = $('table');
  if (!state.table) {
    el.className = 'table empty';
    el.textContent = 'La taula és buida…';
    return;
  }
  el.className = 'table';
  const eating = state.table.eatingTimer !== null;
  const diners = state.table.diners.map(d => {
    const st = d.status === 'served' ? (eating ? 'menjant' : 'servit') : 'esperant';
    return `<div class="diner ${d.status}"><span class="em">${DISHES[d.dish].emoji}</span><span class="st">${st}</span></div>`;
  }).join('');
  const ticket = state.table.ticketLocation === 'table'
    ? `<div class="ticket" data-action="ticket">🎫 Porta el tíquet a la cuina</div>`
    : '';
  el.innerHTML = diners + ticket;
}

function renderKitchen(state) {
  const order = $('order');
  if (ticketInKitchen(state)) {
    const parts = DISH_IDS
      .map(id => ({ id, n: waitingCount(state, id) }))
      .filter(x => x.n > 0)
      .map(x => `${x.n}×${DISHES[x.id].emoji}`);
    order.textContent = parts.length ? `Comanda: ${parts.join('  ')}` : 'Comanda servida';
  } else {
    order.textContent = 'Sense comanda';
  }

  const bbq = $('bbq');
  if (state.bbq) {
    const dish = DISHES[state.bbq.dish];
    const pct = Math.max(0, Math.min(100, ((dish.cookTime - state.bbq.remaining) / dish.cookTime) * 100));
    bbq.innerHTML = `<div class="slot">Cuinant ${dish.emoji} ${dish.name}<div class="bar"><span style="width:${pct}%"></span></div></div>`;
  } else {
    const canCook = ticketInKitchen(state);
    const buttons = DISH_IDS.map(id => {
      const d = DISHES[id];
      return `<button class="dish-btn" data-action="cook" data-dish="${id}" ${canCook ? '' : 'disabled'}>${d.emoji} ${d.name}</button>`;
    }).join('');
    bbq.innerHTML = `<div class="slot">BBQ lliure${canCook ? ' — tria plat:' : ''}<div>${buttons}</div></div>`;
  }

  const plates = $('plates');
  const btns = [];
  for (const id of DISH_IDS) {
    for (let i = 0; i < platesCount(state, id); i++) {
      btns.push(`<button class="plate-btn" data-action="deliver" data-dish="${id}">${DISHES[id].emoji} entrega</button>`);
    }
  }
  plates.innerHTML = btns.length ? `Plats llestos:<br>${btns.join('')}` : '';
}

export function wire({ onSendTicket, onStartCooking, onDeliver }) {
  document.querySelector('.floor').addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    if (t.dataset.action === 'ticket') onSendTicket();
    else if (t.dataset.action === 'cook') onStartCooking(t.dataset.dish);
    else if (t.dataset.action === 'deliver') onDeliver(t.dataset.dish);
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
