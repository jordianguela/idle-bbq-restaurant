# Prototip Idle BBQ — Iteració 1 (bucle base) — Pla d'implementació

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tenir un joc jugable al navegador on cliques per servir clients, guanyes diners, compres millores (carn i cuiner) amb cost creixent, el cuiner genera ingressos passius, la partida es desa sola i en tornar reps els guanys offline.

**Architecture:** Separem la **lògica pura** (mòduls ES sense DOM, testejats amb `node:test`) de la **UI** (renderitzat DOM al navegador). L'estat del joc és un objecte simple; funcions pures el transformen (servir, comprar, tick). El desat i el càlcul offline reben un `storage` injectat perquè siguin testejables.

**Tech Stack:** HTML + CSS + JavaScript (mòduls ES natius). Tests amb `node:test` (Node ≥ 18, aquí v23). Sense dependències externes.

## Global Constraints

- Sense frameworks ni dependències npm. Només HTML/CSS/JS natiu i `node:test`.
- Tot en **mòduls ES** (`import`/`export`), tant al navegador (`<script type="module">`) com als tests.
- La lògica pura **no toca `window`, `document` ni `localStorage`** directament: rep el que necessita per paràmetre (p. ex. `storage`, `now`). Així es pot testejar amb Node.
- Els diners es mostren i s'acumulen com a nombres; les compres arrodoneixen el cost cap amunt amb `Math.ceil`.
- Idioma de la UI i comentaris: català.

---

## Estructura de fitxers

- `src/economy.js` — càlcul de costos escalats. Responsabilitat: matemàtica de preus.
- `src/definitions.js` — dades de les millores (carn, cuiner): cost base, creixement, efecte.
- `src/state.js` — estat inicial de la partida.
- `src/engine.js` — funcions pures que transformen l'estat: servir, comprar, tick, càlculs derivats.
- `src/save.js` — desar/carregar a un `storage` injectat i calcular guanys offline.
- `src/ui.js` — renderitzat DOM i connexió d'events (només navegador).
- `src/main.js` — arrencada: carrega partida, mostra offline, engega el bucle, connecta la UI.
- `index.html` — pàgina que carrega `main.js` com a mòdul.
- `styles.css` — estils.
- `test/economy.test.js`, `test/engine.test.js`, `test/save.test.js` — tests de la lògica pura.

---

### Task 1: Economy — cost escalat

**Files:**
- Create: `src/economy.js`
- Test: `test/economy.test.js`

**Interfaces:**
- Produces: `upgradeCost(baseCost: number, growth: number, level: number): number` — cost de la **propera** compra quan ja en tens `level`. Fórmula: `Math.ceil(baseCost * growth ** level)`.

- [ ] **Step 1: Write the failing test**

```js
// test/economy.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upgradeCost } from '../src/economy.js';

test('cost base quan level és 0', () => {
  assert.equal(upgradeCost(15, 1.15, 0), 15);
});

test('el cost creix amb el level i arrodoneix amunt', () => {
  assert.equal(upgradeCost(15, 1.15, 1), 18); // 15*1.15=17.25 -> 18
  assert.equal(upgradeCost(15, 1.15, 2), 20); // 15*1.3225=19.8375 -> 20
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/economy.test.js`
Expected: FAIL amb "Cannot find module '../src/economy.js'" o similar.

- [ ] **Step 3: Write minimal implementation**

```js
// src/economy.js
export function upgradeCost(baseCost, growth, level) {
  return Math.ceil(baseCost * growth ** level);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/economy.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/economy.js test/economy.test.js
git commit -m "feat: cost escalat de millores (economy)"
```

---

### Task 2: Definicions i estat inicial

**Files:**
- Create: `src/definitions.js`
- Create: `src/state.js`

**Interfaces:**
- Produces (`definitions.js`):
  - `MEAT = { id:'meat', name:'Millor carn', baseCost:15, growth:1.15, perServeBonus:1 }`
  - `COOK = { id:'cook', name:'Cuiner', baseCost:50, growth:1.15, incomePerSec:1 }`
- Produces (`state.js`): `createInitialState(now: number): { money:0, meatLevel:0, cookCount:0, lastSeen: now }`

- [ ] **Step 1: Write the definitions**

```js
// src/definitions.js
export const MEAT = { id: 'meat', name: 'Millor carn', baseCost: 15, growth: 1.15, perServeBonus: 1 };
export const COOK = { id: 'cook', name: 'Cuiner', baseCost: 50, growth: 1.15, incomePerSec: 1 };
```

- [ ] **Step 2: Write the initial state**

```js
// src/state.js
export function createInitialState(now) {
  return { money: 0, meatLevel: 0, cookCount: 0, lastSeen: now };
}
```

- [ ] **Step 3: Sanity check (import des de Node)**

Run: `node -e "import('./src/state.js').then(m=>console.log(m.createInitialState(1000)))"`
Expected: `{ money: 0, meatLevel: 0, cookCount: 0, lastSeen: 1000 }`

- [ ] **Step 4: Commit**

```bash
git add src/definitions.js src/state.js
git commit -m "feat: definicions de millores i estat inicial"
```

---

### Task 3: Engine — servir i càlculs derivats

**Files:**
- Create: `src/engine.js`
- Test: `test/engine.test.js`

**Interfaces:**
- Consumes: `MEAT`, `COOK` de `definitions.js`.
- Produces:
  - `moneyPerServe(state): number` → `1 + state.meatLevel * MEAT.perServeBonus`
  - `incomePerSec(state): number` → `state.cookCount * COOK.incomePerSec`
  - `serve(state): newState` → còpia de l'estat amb `money += moneyPerServe(state)`

Totes les funcions de l'engine són **pures**: retornen un estat nou, no muten l'entrada.

- [ ] **Step 1: Write the failing test**

```js
// test/engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moneyPerServe, incomePerSec, serve } from '../src/engine.js';

const base = { money: 0, meatLevel: 0, cookCount: 0, lastSeen: 0 };

test('moneyPerServe és 1 sense millores i puja amb la carn', () => {
  assert.equal(moneyPerServe(base), 1);
  assert.equal(moneyPerServe({ ...base, meatLevel: 3 }), 4);
});

test('incomePerSec depèn del nombre de cuiners', () => {
  assert.equal(incomePerSec(base), 0);
  assert.equal(incomePerSec({ ...base, cookCount: 2 }), 2);
});

test('serve afegeix diners i no muta l original', () => {
  const s = serve({ ...base, meatLevel: 2 }); // per serve = 3
  assert.equal(s.money, 3);
  assert.equal(base.money, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (mòdul no trobat).

- [ ] **Step 3: Write minimal implementation**

```js
// src/engine.js
import { MEAT, COOK } from './definitions.js';

export function moneyPerServe(state) {
  return 1 + state.meatLevel * MEAT.perServeBonus;
}

export function incomePerSec(state) {
  return state.cookCount * COOK.incomePerSec;
}

export function serve(state) {
  return { ...state, money: state.money + moneyPerServe(state) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: engine servir i càlculs derivats"
```

---

### Task 4: Engine — comprar millores

**Files:**
- Modify: `src/engine.js`
- Test: `test/engine.test.js` (afegir casos)

**Interfaces:**
- Consumes: `upgradeCost` de `economy.js`; `MEAT`, `COOK`.
- Produces:
  - `meatCost(state): number` → `upgradeCost(MEAT.baseCost, MEAT.growth, state.meatLevel)`
  - `cookCost(state): number` → `upgradeCost(COOK.baseCost, COOK.growth, state.cookCount)`
  - `buyMeat(state): newState` → si `money >= meatCost`, resta el cost i `meatLevel+1`; si no, retorna l'estat igual.
  - `buyCook(state): newState` → anàleg amb `cookCount`.

- [ ] **Step 1: Write the failing test (afegir al fitxer existent)**

```js
// afegir a test/engine.test.js
import { meatCost, cookCost, buyMeat, buyCook } from '../src/engine.js';

test('meatCost i cookCost surten de les definicions', () => {
  assert.equal(meatCost(base), 15);
  assert.equal(cookCost(base), 50);
});

test('buyMeat compra si hi ha prou diners', () => {
  const s = buyMeat({ ...base, money: 20 });
  assert.equal(s.meatLevel, 1);
  assert.equal(s.money, 5); // 20 - 15
});

test('buyMeat no fa res si no hi ha prou diners', () => {
  const s = buyMeat({ ...base, money: 10 });
  assert.equal(s.meatLevel, 0);
  assert.equal(s.money, 10);
});

test('buyCook compra un cuiner', () => {
  const s = buyCook({ ...base, money: 60 });
  assert.equal(s.cookCount, 1);
  assert.equal(s.money, 10); // 60 - 50
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (`meatCost is not a function`).

- [ ] **Step 3: Write minimal implementation (afegir a `src/engine.js`)**

```js
// afegir a src/engine.js
import { upgradeCost } from './economy.js';

export function meatCost(state) {
  return upgradeCost(MEAT.baseCost, MEAT.growth, state.meatLevel);
}

export function cookCost(state) {
  return upgradeCost(COOK.baseCost, COOK.growth, state.cookCount);
}

export function buyMeat(state) {
  const cost = meatCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, meatLevel: state.meatLevel + 1 };
}

export function buyCook(state) {
  const cost = cookCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, cookCount: state.cookCount + 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS (tots els tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: comprar carn i cuiner amb cost creixent"
```

---

### Task 5: Engine — tick d'ingressos passius

**Files:**
- Modify: `src/engine.js`
- Test: `test/engine.test.js` (afegir casos)

**Interfaces:**
- Produces: `tick(state, dtSeconds): newState` → `money += incomePerSec(state) * dtSeconds`. No muta l'entrada.

- [ ] **Step 1: Write the failing test (afegir)**

```js
// afegir a test/engine.test.js
import { tick } from '../src/engine.js';

test('tick acumula ingressos passius segons els cuiners i el temps', () => {
  const s = tick({ ...base, cookCount: 2, money: 0 }, 3); // 2/sec * 3s = 6
  assert.equal(s.money, 6);
});

test('tick sense cuiners no dona diners', () => {
  const s = tick({ ...base, money: 5 }, 10);
  assert.equal(s.money, 5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (`tick is not a function`).

- [ ] **Step 3: Write minimal implementation (afegir a `src/engine.js`)**

```js
// afegir a src/engine.js
export function tick(state, dtSeconds) {
  return { ...state, money: state.money + incomePerSec(state) * dtSeconds };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: tick d'ingressos passius"
```

---

### Task 6: Desat, càrrega i guanys offline

**Files:**
- Create: `src/save.js`
- Test: `test/save.test.js`

**Interfaces:**
- Consumes: `createInitialState` de `state.js`; `incomePerSec` de `engine.js`.
- Produces:
  - `save(state, storage, now)` → escriu a `storage` la clau `'idle-bbq-save'` amb l'estat en JSON i `lastSeen = now`.
  - `load(storage, now): { state, offlineEarnings }` → si no hi ha desat, retorna `{ state: createInitialState(now), offlineEarnings: 0 }`. Si n'hi ha, calcula `elapsed = max(0, (now - state.lastSeen) / 1000)` segons, `offlineEarnings = Math.floor(incomePerSec(state) * elapsed)`, suma els guanys a `money`, posa `lastSeen = now`.
- `storage` és qualsevol objecte amb `getItem(key)` i `setItem(key, value)` (a Node en fem un de fals; al navegador és `localStorage`).

- [ ] **Step 1: Write the failing test**

```js
// test/save.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { save, load } from '../src/save.js';

function fakeStorage() {
  const data = {};
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('load sense desat retorna estat inicial i 0 offline', () => {
  const s = fakeStorage();
  const { state, offlineEarnings } = load(s, 1000);
  assert.equal(state.money, 0);
  assert.equal(state.lastSeen, 1000);
  assert.equal(offlineEarnings, 0);
});

test('save i load recuperen l estat', () => {
  const s = fakeStorage();
  save({ money: 42, meatLevel: 1, cookCount: 0, lastSeen: 0 }, s, 5000);
  const { state } = load(s, 5000);
  assert.equal(state.money, 42);
  assert.equal(state.meatLevel, 1);
});

test('load calcula guanys offline segons cuiners i temps', () => {
  const s = fakeStorage();
  // desat a t=0 amb 2 cuiners
  save({ money: 0, meatLevel: 0, cookCount: 2, lastSeen: 0 }, s, 0);
  // tornem 10s després -> 2/sec * 10s = 20
  const { state, offlineEarnings } = load(s, 10000);
  assert.equal(offlineEarnings, 20);
  assert.equal(state.money, 20);
  assert.equal(state.lastSeen, 10000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/save.test.js`
Expected: FAIL (mòdul no trobat).

- [ ] **Step 3: Write minimal implementation**

```js
// src/save.js
import { createInitialState } from './state.js';
import { incomePerSec } from './engine.js';

const KEY = 'idle-bbq-save';

export function save(state, storage, now) {
  storage.setItem(KEY, JSON.stringify({ ...state, lastSeen: now }));
}

export function load(storage, now) {
  const raw = storage.getItem(KEY);
  if (!raw) {
    return { state: createInitialState(now), offlineEarnings: 0 };
  }
  const saved = JSON.parse(raw);
  const elapsed = Math.max(0, (now - saved.lastSeen) / 1000);
  const offlineEarnings = Math.floor(incomePerSec(saved) * elapsed);
  const state = { ...saved, money: saved.money + offlineEarnings, lastSeen: now };
  return { state, offlineEarnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/save.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS a tots els fitxers de `test/`.

- [ ] **Step 6: Commit**

```bash
git add src/save.js test/save.test.js
git commit -m "feat: desat, càrrega i guanys offline"
```

---

### Task 7: UI, HTML i arrencada (verificació manual)

**Files:**
- Create: `src/ui.js`
- Create: `src/main.js`
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Consumes: tot l'engine (`serve`, `buyMeat`, `buyCook`, `tick`, `moneyPerServe`, `incomePerSec`, `meatCost`, `cookCost`) i `save`/`load`.
- `ui.js` produce: `render(state)` (pinta valors) i `wireButtons(handlers)` on `handlers = { onServe, onBuyMeat, onBuyCook }`.

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Idle BBQ Restaurant</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="game">
    <h1>🔥 Idle BBQ Restaurant</h1>
    <p class="money">Diners: <span id="money">0</span> €</p>
    <p class="rate"><span id="rate">0</span> €/s · <span id="perserve">1</span> € per client</p>

    <button id="serve" class="serve-btn">Serveix un client (+<span id="serveval">1</span> €)</button>

    <section class="shop">
      <button id="buy-meat" class="buy-btn">
        Millor carn — <span id="meat-cost">15</span> € <small>(nivell <span id="meat-level">0</span>)</small>
      </button>
      <button id="buy-cook" class="buy-btn">
        Contracta cuiner — <span id="cook-cost">50</span> € <small>(<span id="cook-count">0</span> cuiners)</small>
      </button>
    </section>

    <div id="offline" class="offline hidden"></div>
  </main>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
:root { color-scheme: light dark; }
body {
  font-family: system-ui, sans-serif;
  display: flex; justify-content: center; padding: 2rem;
  background: #1b1512; color: #f4ece4;
}
.game { width: min(460px, 100%); text-align: center; }
h1 { font-size: 1.6rem; }
.money { font-size: 1.4rem; font-weight: 700; }
.rate { opacity: 0.8; font-size: 0.95rem; }
button { cursor: pointer; border: none; border-radius: 12px; font: inherit; }
.serve-btn {
  width: 100%; padding: 1.2rem; margin: 1rem 0; font-size: 1.1rem; font-weight: 700;
  background: #d8542b; color: white;
}
.serve-btn:active { transform: scale(0.98); }
.shop { display: grid; gap: 0.6rem; }
.buy-btn { padding: 0.9rem; background: #3a2c22; color: #f4ece4; text-align: left; }
.buy-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.offline {
  margin-top: 1.2rem; padding: 0.9rem; border-radius: 12px;
  background: #2c3a22; color: #eaf4e4;
}
.hidden { display: none; }
```

- [ ] **Step 3: Create `src/ui.js`**

```js
// src/ui.js
import { moneyPerServe, incomePerSec, meatCost, cookCost } from './engine.js';

const $ = id => document.getElementById(id);

export function render(state) {
  $('money').textContent = Math.floor(state.money);
  $('rate').textContent = incomePerSec(state);
  $('perserve').textContent = moneyPerServe(state);
  $('serveval').textContent = moneyPerServe(state);

  const mCost = meatCost(state);
  const cCost = cookCost(state);
  $('meat-cost').textContent = mCost;
  $('meat-level').textContent = state.meatLevel;
  $('cook-cost').textContent = cCost;
  $('cook-count').textContent = state.cookCount;

  $('buy-meat').disabled = state.money < mCost;
  $('buy-cook').disabled = state.money < cCost;
}

export function wireButtons({ onServe, onBuyMeat, onBuyCook }) {
  $('serve').addEventListener('click', onServe);
  $('buy-meat').addEventListener('click', onBuyMeat);
  $('buy-cook').addEventListener('click', onBuyCook);
}

export function showOffline(earnings) {
  if (earnings <= 0) return;
  const el = $('offline');
  el.textContent = `Mentre no hi eres, el teu restaurant ha guanyat ${earnings} €! 🍖`;
  el.classList.remove('hidden');
}
```

- [ ] **Step 4: Create `src/main.js`**

```js
// src/main.js
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
```

- [ ] **Step 5: Verificació manual al navegador**

Run: `python3 -m http.server 8000` (des de l'arrel del projecte)
Obre: `http://localhost:8000/`
Comprova:
1. Es veu "Diners: 0". Clicant "Serveix un client" pugen els diners d'1 en 1.
2. Quan tens 15 €, el botó "Millor carn" s'activa; en comprar-lo, cada client dona +1 més i el cost puja.
3. Quan tens 50 €, pots contractar un cuiner; després els diners pugen sols (mira `€/s`).
4. Recarrega la pàgina: els diners es mantenen (desat).
5. Espera uns segons amb un cuiner, tanca la pestanya, torna a obrir: apareix el missatge de guanys offline.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css src/ui.js src/main.js
git commit -m "feat: UI, arrencada i bucle del navegador (iteració 1 jugable)"
```

---

## Fora d'abast d'aquesta iteració (properes)

- Capacitat / ritme d'arribada de clients (iteració 2).
- Segon i tercer pilar: productors locals, ambient/sala.
- Rols de personal rics (cambrer, sommelier, caixer) i pujar-los d'habilitat.
- Tycoon 2D de col·locació.
- Límit d'hores acumulables per als guanys offline; format de números grans (k, M).

---

## Self-Review

- **Cobertura del spec:** aquesta iteració cobreix el bucle base del §4 del disseny (clients→servir→diners→millores→automatització→offline→persistència). Els pilars i el tycoon queden explícitament fora, alineats amb el full de ruta.
- **Placeholders:** cap "TBD"/"TODO"; tot el codi és complet.
- **Consistència de tipus:** els noms `moneyPerServe`, `incomePerSec`, `serve`, `buyMeat`, `buyCook`, `meatCost`, `cookCost`, `tick`, `save`, `load` s'usen igual a engine, save, ui i main. `storage` amb `getItem`/`setItem` coincideix entre `save.js` i `main.js` (`localStorage`) i els tests (fake).
