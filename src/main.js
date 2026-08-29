import { tick, sendTicket, startCooking, deliverPlate, buyTable, buyBbq } from './engine.js';
import { load, save } from './save.js';
import { render, wire, notify } from './ui.js';

let state;

function set(next) { state = next; render(state); }

function boot() {
  state = load(localStorage, Date.now());
  render(state);

  wire({
    onSendTicket: (i) => set(sendTicket(state, i)),
    onStartCooking: (bbqIndex, dish) => set(startCooking(state, bbqIndex, dish)),
    onDeliver: (tableIndex, dish) => set(deliverPlate(state, tableIndex, dish)),
    onBuyTable: () => set(buyTable(state)),
    onBuyBbq: () => set(buyBbq(state)),
  });

  // bucle de temps: avança el joc i mostra avisos
  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    const { state: next, events } = tick(state, dt, Math.random);
    state = next;
    render(state);
    notify(events);
  }, 200);

  // desat automàtic
  setInterval(() => save(state, localStorage, Date.now()), 5000);
  window.addEventListener('beforeunload', () => save(state, localStorage, Date.now()));
}

boot();
