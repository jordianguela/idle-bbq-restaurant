import { tick, sendTicket, startCooking, deliverPlate } from './engine.js';
import { load, save } from './save.js';
import { render, wire, notify } from './ui.js';

let state;

function set(next) { state = next; render(state); }

function boot() {
  state = load(localStorage, Date.now());
  render(state);

  wire({
    onSendTicket: () => set(sendTicket(state)),
    onStartCooking: (dish) => set(startCooking(state, dish)),
    onDeliver: (dish) => set(deliverPlate(state, dish)),
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
