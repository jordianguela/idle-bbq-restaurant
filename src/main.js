// Restaurant actiu: Nivell 1 — Street Food.
// El codi de taules/personal (restaurants 2 i 3) es conserva a ./restaurant2/.
import { tick, startCooking, deliverPlate, buyBbq } from './restaurant1/engine.js';
import { load, save } from './restaurant1/save.js';
import { render, wire, notify } from './restaurant1/ui.js';
import { initScene } from './restaurant1/scene.js';

let state;

function set(next) { state = next; render(state); }

function boot() {
  state = load(localStorage, Date.now());
  initScene(document.getElementById('scene'));
  render(state);

  wire({
    onStartCooking: (bbqIndex, dish) => set(startCooking(state, bbqIndex, dish)),
    onDeliver: (groupIndex, dish) => set(deliverPlate(state, groupIndex, dish)),
    onBuyBbq: () => set(buyBbq(state)),
  });

  // bucle de temps: arribades i cocció
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
