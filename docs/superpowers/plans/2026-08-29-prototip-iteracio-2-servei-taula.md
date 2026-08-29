# Prototip Idle BBQ — Iteració 2 (servei de taula) — Pla d'implementació

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir el bucle "clic per servir" per un bucle de servei de taula espacial (sala esquerra ↔ cuina dreta): els clients arriben sols, treuen un tíquet, portes la comanda a la cuina, cuines el plat correcte en una BBQ (barra de progrés), l'entregues, i quan tot el grup està servit mengen, paguen i marxen.

**Architecture:** Lògica pura desacoblada de la UI. L'estat és un objecte simple; funcions pures el transformen (`tick`, `sendTicket`, `startCooking`, `deliverPlate`). L'aleatorietat s'injecta com a `rng` per tests deterministes. La UI (clic) crida aquestes accions; el drag-and-drop futur cridarà les mateixes.

**Tech Stack:** HTML + CSS + JavaScript (mòduls ES natius). Tests amb `node:test`. Sense dependències.

## Global Constraints

- Sense frameworks ni dependències npm. Només HTML/CSS/JS natiu i `node:test`.
- Mòduls ES (`import`/`export`) a tot arreu.
- La lògica pura no toca `window`/`document`/`localStorage`: rep `storage`, `now`, `rng` per paràmetre.
- `rng` és una funció `() => number` a `[0, 1)`. Totes les funcions que necessiten atzar la reben com a paràmetre.
- `tick` retorna **sempre** `{ state, events }`, on `events` és una llista (possiblement buida) de `{ type: 'arrival', size }` o `{ type: 'payment', amount }`.
- Les funcions de l'engine són **pures**: retornen estat nou, no muten l'entrada.
- Idioma de la UI i comentaris: català.
- `src/main.js` està ignorat pel gitignore global: en fer-hi commit cal `git add -f src/main.js`.

## Reemplaçaments

Aquesta iteració **reescriu** `definitions.js`, `state.js`, `engine.js`, `save.js`, `ui.js`, `main.js`, `index.html`, `styles.css` i els tests `engine.test.js` / `save.test.js`. El fitxer `src/economy.js` i `test/economy.test.js` **es conserven** (es reutilitzaran per a les millores en una iteració futura; segueixen passant).

---

## Estructura de fitxers (després de la iteració)

- `src/definitions.js` — `DISHES`, `DISH_IDS`, `CONFIG` (preus, temps, mides de grup).
- `src/state.js` — `createInitialState(now)`.
- `src/engine.js` — `pickPartySize`, `pickDish`, `spawnParty`, helpers derivats i accions (`tick`, `sendTicket`, `startCooking`, `deliverPlate`).
- `src/save.js` — desar/carregar només els diners.
- `src/ui.js` — render de sala + cuina + avisos, i connexió de clics.
- `src/main.js` — arrencada i bucle de temps.
- `src/economy.js` — (es conserva, sense canvis).
- `index.html`, `styles.css` — pantalla de dues columnes.
- `test/engine.test.js`, `test/save.test.js` — tests reescrits.

---

### Task 1: Definicions i config

**Files:**
- Modify (reescriu): `src/definitions.js`

**Interfaces:**
- Produces:
  - `DISHES = { bistec: { id:'bistec', name:'Bistec', emoji:'🥩', price:10, cookTime:2.5 }, costelles: { id:'costelles', name:'Costelles', emoji:'🍖', price:16, cookTime:3.5 } }`
  - `DISH_IDS = ['bistec', 'costelles']`
  - `CONFIG = { eatTime:4, spawnInterval:2, tableCapacity:4, partySizes:[{size:1,weight:1},{size:2,weight:3},{size:4,weight:3}] }`

- [ ] **Step 1: Reescriu `src/definitions.js`**

```js
// src/definitions.js
export const DISHES = {
  bistec:    { id: 'bistec',    name: 'Bistec',    emoji: '🥩', price: 10, cookTime: 2.5 },
  costelles: { id: 'costelles', name: 'Costelles', emoji: '🍖', price: 16, cookTime: 3.5 },
};

export const DISH_IDS = ['bistec', 'costelles'];

export const CONFIG = {
  eatTime: 4,
  spawnInterval: 2,
  tableCapacity: 4,
  partySizes: [
    { size: 1, weight: 1 },
    { size: 2, weight: 3 },
    { size: 4, weight: 3 },
  ],
};
```

- [ ] **Step 2: Sanity check**

Run: `node -e "import('./src/definitions.js').then(m=>console.log(m.DISH_IDS, m.DISHES.bistec.price, m.CONFIG.eatTime))"`
Expected: `[ 'bistec', 'costelles' ] 10 4`

- [ ] **Step 3: Commit**

```bash
git add src/definitions.js
git commit -m "feat(it2): definicions de plats i config del servei"
```

---

### Task 2: Estat inicial

**Files:**
- Modify (reescriu): `src/state.js`

**Interfaces:**
- Consumes: `CONFIG` de `definitions.js`.
- Produces: `createInitialState(now) → { money:0, spawnTimer:CONFIG.spawnInterval, table:null, bbq:null, readyPlates:[], lastSeen:now }`

- [ ] **Step 1: Reescriu `src/state.js`**

```js
// src/state.js
import { CONFIG } from './definitions.js';

export function createInitialState(now) {
  return {
    money: 0,
    spawnTimer: CONFIG.spawnInterval,
    table: null,
    bbq: null,
    readyPlates: [],
    lastSeen: now,
  };
}
```

- [ ] **Step 2: Sanity check**

Run: `node -e "import('./src/state.js').then(m=>console.log(JSON.stringify(m.createInitialState(1000))))"`
Expected: `{"money":0,"spawnTimer":2,"table":null,"bbq":null,"readyPlates":[],"lastSeen":1000}`

- [ ] **Step 3: Commit**

```bash
git add src/state.js
git commit -m "feat(it2): estat inicial del servei de taula"
```

---

### Task 3: Engine — arribada de grups (spawn)

**Files:**
- Create (reescriu de zero): `src/engine.js`
- Create (reescriu de zero): `test/engine.test.js`

**Interfaces:**
- Consumes: `DISHES`, `DISH_IDS`, `CONFIG` de `definitions.js`.
- Produces:
  - `pickPartySize(rng) → number` — tria ponderada segons `CONFIG.partySizes`.
  - `pickDish(rng) → string` — tria uniforme de `DISH_IDS`.
  - `spawnParty(rng) → { diners:[{dish,status:'waiting'}], ticketLocation:'table', eatingTimer:null }`

**Nota sobre `rng` a `pickPartySize`:** amb pesos `[1,3,3]` (total 7), `rng()` es multiplica per 7 i es recorren els trams: `[0,1)→size 1`, `[1,4)→size 2`, `[4,7)→size 4`.

- [ ] **Step 1: Write the failing test**

```js
// test/engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPartySize, pickDish, spawnParty } from '../src/engine.js';

// rng determinista que va retornant els valors de la llista
function seq(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('pickPartySize reparteix segons els pesos [1,3,3] sobre total 7', () => {
  assert.equal(pickPartySize(() => 0.0), 1);   // 0*7=0 -> tram size 1
  assert.equal(pickPartySize(() => 0.2), 2);   // 0.2*7=1.4 -> tram size 2
  assert.equal(pickPartySize(() => 0.9), 4);   // 0.9*7=6.3 -> tram size 4
});

test('pickDish tria de DISH_IDS', () => {
  assert.equal(pickDish(() => 0.0), 'bistec');
  assert.equal(pickDish(() => 0.99), 'costelles');
});

test('spawnParty crea comensals amb plat i estat waiting, tíquet a la taula', () => {
  // mida: 0.2 -> 2 comensals; plats: 0.0 -> bistec, 0.99 -> costelles
  const party = spawnParty(seq([0.2, 0.0, 0.99]));
  assert.equal(party.diners.length, 2);
  assert.deepEqual(party.diners.map(d => d.dish), ['bistec', 'costelles']);
  assert.ok(party.diners.every(d => d.status === 'waiting'));
  assert.equal(party.ticketLocation, 'table');
  assert.equal(party.eatingTimer, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (mòdul/funcions no trobades).

- [ ] **Step 3: Write minimal implementation**

```js
// src/engine.js
import { DISHES, DISH_IDS, CONFIG } from './definitions.js';

export function pickPartySize(rng) {
  const total = CONFIG.partySizes.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of CONFIG.partySizes) {
    if (r < p.weight) return p.size;
    r -= p.weight;
  }
  return CONFIG.partySizes[CONFIG.partySizes.length - 1].size;
}

export function pickDish(rng) {
  return DISH_IDS[Math.floor(rng() * DISH_IDS.length)];
}

export function spawnParty(rng) {
  const size = pickPartySize(rng);
  const diners = [];
  for (let i = 0; i < size; i++) {
    diners.push({ dish: pickDish(rng), status: 'waiting' });
  }
  return { diners, ticketLocation: 'table', eatingTimer: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat(it2): arribada de grups (spawn) amb rng injectat"
```

---

### Task 4: Engine — helpers derivats i `tick` (arribada)

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Produces:
  - `ticketInKitchen(state) → boolean` — `!!state.table && state.table.ticketLocation === 'kitchen'`.
  - `allServed(state) → boolean` — `!!state.table && state.table.diners.every(d => d.status === 'served')`.
  - `waitingCount(state, dish) → number` — comensals `waiting` que volen `dish`.
  - `platesCount(state, dish) → number` — plats llestos de `dish`.
  - `tick(state, dt, rng) → { state, events }` — de moment només: si `table === null`, resta `dt` a `spawnTimer`; quan arriba a 0 o menys, genera un grup amb `spawnParty(rng)`, reinicia `spawnTimer = CONFIG.spawnInterval` i afegeix `event { type:'arrival', size }`.

- [ ] **Step 1: Write the failing test (afegir)**

```js
// afegir a test/engine.test.js
import { ticketInKitchen, allServed, waitingCount, platesCount, tick } from '../src/engine.js';

function baseState(over = {}) {
  return { money: 0, spawnTimer: 2, table: null, bbq: null, readyPlates: [], lastSeen: 0, ...over };
}

test('tick no fa arribar ningú abans que s esgoti spawnTimer', () => {
  const { state, events } = tick(baseState({ spawnTimer: 2 }), 1, () => 0.2);
  assert.equal(state.table, null);
  assert.equal(state.spawnTimer, 1);
  assert.deepEqual(events, []);
});

test('tick fa arribar un grup quan spawnTimer arriba a 0', () => {
  const { state, events } = tick(baseState({ spawnTimer: 1 }), 1, () => 0.2); // mida 2
  assert.ok(state.table);
  assert.equal(state.table.diners.length, 2);
  assert.equal(state.spawnTimer, 2); // reiniciat
  assert.deepEqual(events, [{ type: 'arrival', size: 2 }]);
});

test('tick no fa arribar ningú si la taula està ocupada', () => {
  const occupied = baseState({ table: { diners: [{ dish: 'bistec', status: 'waiting' }], ticketLocation: 'table', eatingTimer: null }, spawnTimer: 0 });
  const { state, events } = tick(occupied, 5, () => 0.2);
  assert.equal(state.table.diners.length, 1); // segueix la mateixa taula
  assert.deepEqual(events, []);
});

test('helpers derivats', () => {
  const s = baseState({ table: { diners: [{ dish: 'bistec', status: 'waiting' }, { dish: 'bistec', status: 'served' }], ticketLocation: 'kitchen', eatingTimer: null }, readyPlates: ['bistec'] });
  assert.equal(ticketInKitchen(s), true);
  assert.equal(allServed(s), false);
  assert.equal(waitingCount(s, 'bistec'), 1);
  assert.equal(platesCount(s, 'bistec'), 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (`tick is not a function`).

- [ ] **Step 3: Write minimal implementation (afegir a `src/engine.js`)**

```js
// afegir a src/engine.js
export function ticketInKitchen(state) {
  return !!state.table && state.table.ticketLocation === 'kitchen';
}

export function allServed(state) {
  return !!state.table && state.table.diners.every(d => d.status === 'served');
}

export function waitingCount(state, dish) {
  if (!state.table) return 0;
  return state.table.diners.filter(d => d.status === 'waiting' && d.dish === dish).length;
}

export function platesCount(state, dish) {
  return state.readyPlates.filter(d => d === dish).length;
}

export function tick(state, dt, rng) {
  const events = [];
  let next = { ...state };

  if (next.table === null) {
    next.spawnTimer -= dt;
    if (next.spawnTimer <= 0) {
      next.table = spawnParty(rng);
      next.spawnTimer = CONFIG.spawnInterval;
      events.push({ type: 'arrival', size: next.table.diners.length });
    }
  }

  return { state: next, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat(it2): helpers derivats i tick d'arribada"
```

---

### Task 5: Engine — `sendTicket` i `startCooking`

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Produces:
  - `sendTicket(state) → state` — si hi ha taula i `ticketLocation === 'table'`, el passa a `'kitchen'`; si no, retorna l'estat igual. No muta l'entrada.
  - `startCooking(state, dish) → state` — si hi ha taula, el tíquet és a la cuina i `bbq === null`, posa `bbq = { dish, remaining: DISHES[dish].cookTime }`; si no, retorna l'estat igual. No muta l'entrada.

- [ ] **Step 1: Write the failing test (afegir)**

```js
// afegir a test/engine.test.js
import { sendTicket, startCooking } from '../src/engine.js';

function tableState(over = {}) {
  return baseState({
    table: { diners: [{ dish: 'bistec', status: 'waiting' }], ticketLocation: 'table', eatingTimer: null },
    ...over,
  });
}

test('sendTicket mou el tíquet a la cuina', () => {
  const s = sendTicket(tableState());
  assert.equal(s.table.ticketLocation, 'kitchen');
});

test('startCooking no fa res si el tíquet encara és a la taula', () => {
  const s = startCooking(tableState(), 'bistec');
  assert.equal(s.bbq, null);
});

test('startCooking cou si el tíquet és a la cuina i la BBQ és lliure', () => {
  const ready = sendTicket(tableState());
  const s = startCooking(ready, 'bistec');
  assert.deepEqual(s.bbq, { dish: 'bistec', remaining: 2.5 });
});

test('startCooking no fa res si la BBQ ja està ocupada', () => {
  const busy = { ...sendTicket(tableState()), bbq: { dish: 'costelles', remaining: 1 } };
  const s = startCooking(busy, 'bistec');
  assert.deepEqual(s.bbq, { dish: 'costelles', remaining: 1 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (`sendTicket is not a function`).

- [ ] **Step 3: Write minimal implementation (afegir a `src/engine.js`)**

```js
// afegir a src/engine.js
export function sendTicket(state) {
  if (!state.table || state.table.ticketLocation !== 'table') return state;
  return { ...state, table: { ...state.table, ticketLocation: 'kitchen' } };
}

export function startCooking(state, dish) {
  if (!state.table || !ticketInKitchen(state) || state.bbq !== null) return state;
  return { ...state, bbq: { dish, remaining: DISHES[dish].cookTime } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat(it2): accions sendTicket i startCooking"
```

---

### Task 6: Engine — `tick` acaba la cocció (plat o temps perdut)

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Modifica `tick`: si `bbq !== null`, resta `dt` a `bbq.remaining`; quan arriba a 0 o menys, la cocció acaba: si `waitingCount(dish) > platesCount(dish)` es crea un plat (`readyPlates` hi afegeix `dish`); si no, es malgasta (no es crea res). En tots dos casos `bbq = null`.

- [ ] **Step 1: Write the failing test (afegir)**

```js
// afegir a test/engine.test.js
test('tick avança la cocció i crea un plat quan cal', () => {
  const cooking = baseState({
    table: { diners: [{ dish: 'bistec', status: 'waiting' }], ticketLocation: 'kitchen', eatingTimer: null },
    bbq: { dish: 'bistec', remaining: 1 },
  });
  const { state } = tick(cooking, 1, () => 0);
  assert.equal(state.bbq, null);
  assert.deepEqual(state.readyPlates, ['bistec']);
});

test('tick malgasta la cocció si el plat no fa falta', () => {
  const cooking = baseState({
    table: { diners: [{ dish: 'costelles', status: 'waiting' }], ticketLocation: 'kitchen', eatingTimer: null },
    bbq: { dish: 'bistec', remaining: 0.5 }, // ningú vol bistec
  });
  const { state } = tick(cooking, 1, () => 0);
  assert.equal(state.bbq, null);
  assert.deepEqual(state.readyPlates, []);
});

test('tick no acaba la cocció si encara falta temps', () => {
  const cooking = baseState({
    table: { diners: [{ dish: 'bistec', status: 'waiting' }], ticketLocation: 'kitchen', eatingTimer: null },
    bbq: { dish: 'bistec', remaining: 2 },
  });
  const { state } = tick(cooking, 0.5, () => 0);
  assert.deepEqual(state.bbq, { dish: 'bistec', remaining: 1.5 });
  assert.deepEqual(state.readyPlates, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (la cocció encara no s'avança).

- [ ] **Step 3: Modifica `tick` a `src/engine.js`**

Afegeix aquest bloc dins `tick`, **després** del bloc d'arribada i **abans** del `return`:

```js
  // avança la cocció de la BBQ
  if (next.bbq !== null) {
    const remaining = next.bbq.remaining - dt;
    if (remaining <= 0) {
      const dish = next.bbq.dish;
      if (waitingCount(next, dish) > platesCount(next, dish)) {
        next.readyPlates = [...next.readyPlates, dish];
      }
      next.bbq = null;
    } else {
      next.bbq = { ...next.bbq, remaining };
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat(it2): tick acaba la cocció (plat llest o temps perdut)"
```

---

### Task 7: Engine — `deliverPlate`

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Produces: `deliverPlate(state, dish) → state` — si hi ha un plat llest de `dish` i un comensal `waiting` que el vol, marca aquell comensal com `served` i treu **un** plat de `readyPlates`. Si no, retorna l'estat igual. No muta l'entrada.

- [ ] **Step 1: Write the failing test (afegir)**

```js
// afegir a test/engine.test.js
import { deliverPlate } from '../src/engine.js';

test('deliverPlate serveix un comensal que vol el plat i treu el plat', () => {
  const s = baseState({
    table: { diners: [{ dish: 'bistec', status: 'waiting' }, { dish: 'costelles', status: 'waiting' }], ticketLocation: 'kitchen', eatingTimer: null },
    readyPlates: ['bistec'],
  });
  const out = deliverPlate(s, 'bistec');
  assert.equal(out.table.diners[0].status, 'served');
  assert.equal(out.table.diners[1].status, 'waiting');
  assert.deepEqual(out.readyPlates, []);
});

test('deliverPlate no fa res si no hi ha plat llest d aquell tipus', () => {
  const s = baseState({
    table: { diners: [{ dish: 'bistec', status: 'waiting' }], ticketLocation: 'kitchen', eatingTimer: null },
    readyPlates: [],
  });
  const out = deliverPlate(s, 'bistec');
  assert.equal(out.table.diners[0].status, 'waiting');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (`deliverPlate is not a function`).

- [ ] **Step 3: Write minimal implementation (afegir a `src/engine.js`)**

```js
// afegir a src/engine.js
export function deliverPlate(state, dish) {
  if (!state.table) return state;
  const plateIdx = state.readyPlates.indexOf(dish);
  if (plateIdx === -1) return state;
  const dinerIdx = state.table.diners.findIndex(d => d.status === 'waiting' && d.dish === dish);
  if (dinerIdx === -1) return state;

  const diners = state.table.diners.map((d, i) => (i === dinerIdx ? { ...d, status: 'served' } : d));
  const readyPlates = state.readyPlates.filter((_, i) => i !== plateIdx);
  return { ...state, table: { ...state.table, diners }, readyPlates };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat(it2): entrega de plats (deliverPlate)"
```

---

### Task 8: Engine — `tick` menjar i pagament

**Files:**
- Modify: `src/engine.js`
- Modify: `test/engine.test.js`

**Interfaces:**
- Modifica `tick` (després del bloc de cocció, abans del `return`):
  - Si hi ha taula, `eatingTimer === null` i `allServed(state)` → arrenca `eatingTimer = CONFIG.eatTime` (i **no** el decrementa aquest mateix tick).
  - Si no (hi ha taula amb `eatingTimer !== null`) → resta `dt`; quan arriba a 0 o menys, **cobra**: `amount = suma dels preus dels plats dels comensals`; `money += amount`; afegeix `event { type:'payment', amount }`; buida la taula (`table = null`), buida `readyPlates`, i reinicia `spawnTimer = CONFIG.spawnInterval`.

- [ ] **Step 1: Write the failing test (afegir)**

```js
// afegir a test/engine.test.js
test('tick arrenca el menjar només quan tots estan servits', () => {
  const served = baseState({
    table: { diners: [{ dish: 'bistec', status: 'served' }, { dish: 'costelles', status: 'served' }], ticketLocation: 'kitchen', eatingTimer: null },
  });
  const { state } = tick(served, 1, () => 0);
  assert.equal(state.table.eatingTimer, 4); // arrencat, no decrementat aquest tick
});

test('tick no arrenca el menjar si algú encara espera', () => {
  const partial = baseState({
    table: { diners: [{ dish: 'bistec', status: 'served' }, { dish: 'costelles', status: 'waiting' }], ticketLocation: 'kitchen', eatingTimer: null },
  });
  const { state } = tick(partial, 1, () => 0);
  assert.equal(state.table.eatingTimer, null);
});

test('en acabar el menjar, cobra i allibera la taula', () => {
  const eating = baseState({
    money: 5,
    table: { diners: [{ dish: 'bistec', status: 'served' }, { dish: 'costelles', status: 'served' }], ticketLocation: 'kitchen', eatingTimer: 1 },
    readyPlates: [],
  });
  const { state, events } = tick(eating, 1, () => 0);
  assert.equal(state.table, null);          // taula lliure
  assert.equal(state.money, 5 + 10 + 16);   // 5 + bistec + costelles
  assert.deepEqual(events, [{ type: 'payment', amount: 26 }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/engine.test.js`
Expected: FAIL (l'eatingTimer no s'arrenca / no cobra).

- [ ] **Step 3: Modifica `tick` a `src/engine.js`**

Afegeix aquest bloc dins `tick`, **després** del bloc de cocció i **abans** del `return`:

```js
  // menjar i pagament
  if (next.table !== null) {
    if (next.table.eatingTimer === null && allServed(next)) {
      next.table = { ...next.table, eatingTimer: CONFIG.eatTime };
    } else if (next.table.eatingTimer !== null) {
      const eatingTimer = next.table.eatingTimer - dt;
      if (eatingTimer <= 0) {
        const amount = next.table.diners.reduce((sum, d) => sum + DISHES[d.dish].price, 0);
        next.money += amount;
        events.push({ type: 'payment', amount });
        next.table = null;
        next.readyPlates = [];
        next.spawnTimer = CONFIG.spawnInterval;
      } else {
        next.table = { ...next.table, eatingTimer };
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/engine.test.js`
Expected: PASS (tots).

- [ ] **Step 5: Commit**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat(it2): tick menjar i cobrament del grup"
```

---

### Task 9: Desat només dels diners (offline desactivat)

**Files:**
- Modify (reescriu): `src/save.js`
- Modify (reescriu): `test/save.test.js`

**Interfaces:**
- Consumes: `createInitialState` de `state.js`.
- Produces:
  - `save(state, storage, now)` → escriu a la clau `'idle-bbq-save'` un JSON `{ money, lastSeen: now }`.
  - `load(storage, now) → state` → si no hi ha desat, `createInitialState(now)`; si n'hi ha, `createInitialState(now)` amb `money` recuperat. (Sense guanys offline.)

- [ ] **Step 1: Reescriu el test**

```js
// test/save.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { save, load } from '../src/save.js';

function fakeStorage() {
  const data = {};
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('load sense desat retorna estat inicial', () => {
  const s = fakeStorage();
  const state = load(s, 1000);
  assert.equal(state.money, 0);
  assert.equal(state.table, null);
  assert.equal(state.lastSeen, 1000);
});

test('save i load recuperen només els diners, amb la sala neta', () => {
  const s = fakeStorage();
  save({ money: 99, table: { diners: [{ dish: 'bistec', status: 'served' }], ticketLocation: 'kitchen', eatingTimer: 2 }, bbq: null, readyPlates: ['bistec'], spawnTimer: 0, lastSeen: 0 }, s, 5000);
  const state = load(s, 5000);
  assert.equal(state.money, 99);
  assert.equal(state.table, null);      // el servei en curs no es persisteix
  assert.deepEqual(state.readyPlates, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/save.test.js`
Expected: FAIL (el `load` antic retorna `{ state, offlineEarnings }`, no un estat pla).

- [ ] **Step 3: Reescriu `src/save.js`**

```js
// src/save.js
import { createInitialState } from './state.js';

const KEY = 'idle-bbq-save';

export function save(state, storage, now) {
  storage.setItem(KEY, JSON.stringify({ money: state.money, lastSeen: now }));
}

export function load(storage, now) {
  const state = createInitialState(now);
  const raw = storage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    state.money = saved.money ?? 0;
  }
  return state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/save.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the whole suite**

Run: `node --test`
Expected: PASS a tot (`economy`, `engine`, `save`).

- [ ] **Step 6: Commit**

```bash
git add src/save.js test/save.test.js
git commit -m "feat(it2): desat només dels diners (offline desactivat)"
```

---

### Task 10: UI, HTML, estils i arrencada (verificació manual + simulació)

**Files:**
- Modify (reescriu): `src/ui.js`
- Modify (reescriu): `src/main.js`
- Modify (reescriu): `index.html`
- Modify (reescriu): `styles.css`

**Interfaces:**
- Consumes: `tick`, `sendTicket`, `startCooking`, `deliverPlate`, `waitingCount`, `platesCount`, `ticketInKitchen` de `engine.js`; `DISHES`, `DISH_IDS` de `definitions.js`; `load`, `save` de `save.js`.
- `ui.js` produce:
  - `render(state)` — pinta sala + cuina.
  - `wire(handlers)` on `handlers = { onSendTicket, onStartCooking(dish), onDeliver(dish) }` — connecta els clics (delegació d'events al contenidor).
  - `notify(events)` — mostra avisos a partir dels `events` del tick.

- [ ] **Step 1: Reescriu `index.html`**

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
  <header class="topbar">
    <h1>🔥 Idle BBQ</h1>
    <p class="money">Diners: <span id="money">0</span> €</p>
  </header>
  <div id="notice" class="notice hidden"></div>
  <main class="floor">
    <section class="hall">
      <h2>Sala</h2>
      <div id="table" class="table empty">La taula és buida…</div>
    </section>
    <section class="kitchen">
      <h2>Cuina</h2>
      <div id="order" class="order">Sense comanda</div>
      <div id="bbq" class="bbq"></div>
      <div id="plates" class="plates"></div>
    </section>
  </main>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Reescriu `styles.css`**

```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { font-family: system-ui, sans-serif; margin: 0; background: #1b1512; color: #f4ece4; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; background: #2a201a; }
.topbar h1 { font-size: 1.2rem; margin: 0; }
.money { font-weight: 700; font-size: 1.1rem; margin: 0; }
.notice { margin: 0.6rem 1.2rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: #3b3320; }
.hidden { display: none; }
.floor { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.2rem; }
.hall, .kitchen { background: #241b16; border-radius: 14px; padding: 1rem; min-height: 260px; }
h2 { margin-top: 0; font-size: 1rem; opacity: 0.85; }
.table.empty { opacity: 0.5; font-style: italic; padding: 2rem 0; text-align: center; }
.diner { display: inline-flex; flex-direction: column; align-items: center; margin: 0.3rem; padding: 0.5rem 0.7rem; border-radius: 10px; background: #33271f; min-width: 64px; }
.diner .st { font-size: 0.7rem; opacity: 0.8; }
.diner.served { background: #2c3a22; }
.ticket { margin-top: 0.8rem; padding: 0.7rem; border-radius: 10px; background: #d8b02b; color: #241b16; font-weight: 700; cursor: pointer; text-align: center; }
.order { padding: 0.6rem; border-radius: 10px; background: #33271f; margin-bottom: 0.8rem; }
.bbq { margin-bottom: 0.8rem; }
.bbq button, .plates button { cursor: pointer; border: none; border-radius: 10px; font: inherit; padding: 0.6rem 0.8rem; margin: 0.2rem; }
.bbq .slot { padding: 0.7rem; border-radius: 10px; background: #33271f; }
.bar { height: 10px; border-radius: 6px; background: #4a3a2e; margin-top: 0.4rem; overflow: hidden; }
.bar > span { display: block; height: 100%; background: #d8542b; }
.dish-btn { background: #3a2c22; color: #f4ece4; }
.dish-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.plate-btn { background: #d8542b; color: white; }
