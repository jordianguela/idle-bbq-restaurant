import { serve, buyMeat, buyCook, tick } from './engine.js';
import { load, save } from './save.js';
import { render, wireButtons, showOffline } from './ui.js';

let state;

function update(next) {
  state = next;
  render(state);
}

function boot() {
  const { state: loaded, offlineEarnings } = load(localStorage, Date.now());
  state = loaded;
  render(state);
  showOffline(offlineEarnings);

  wireButtons({
    onServe: () => update(serve(state)),
    onBuyMeat: () => update(buyMeat(state)),
    onBuyCook: () => update(buyCook(state)),
  });

  // bucle d'ingressos passius: cada 200ms afegim el temps transcorregut
  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    update(tick(state, (now - last) / 1000));
    last = now;
  }, 200);

  // desat automàtic cada 5s i en tancar
  setInterval(() => save(state, localStorage, Date.now()), 5000);
  window.addEventListener('beforeunload', () => save(state, localStorage, Date.now()));
}

boot();
