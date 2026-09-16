import { DISHES, DISH_IDS, CONFIG } from './definitions.js';
import { upgradeCost } from '../economy.js';

// --- Aleatorietat (rng injectat: funció que retorna [0, 1)) ---

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

export function spawnGroup(rng, id) {
  const size = pickPartySize(rng);
  const diners = [];
  for (let i = 0; i < size; i++) {
    // `look` és la llavor d'aspecte del client (quin sprite li toca). La lògica
    // no en sap res: qui la interpreta és l'escena.
    diners.push({ dish: pickDish(rng), status: 'waiting', look: rng() });
  }
  // leaveTimer: null mentre esperen; segons que els queden un cop tenen el menjar.
  return { id, diners, leaveTimer: null };
}

// --- Càlculs derivats ---

export function queueWaitingCount(state, dish) {
  let n = 0;
  for (const g of state.queue) {
    n += g.diners.filter(d => d.status === 'waiting' && d.dish === dish).length;
  }
  return n;
}

export function platesCount(state, dish) {
  return state.readyPlates.filter(d => d === dish).length;
}

function bbqsCooking(state, dish) {
  return state.bbqs.filter(b => b && b.dish === dish).length;
}

export function cookNeeded(state, dish) {
  return Math.max(0, queueWaitingCount(state, dish) - platesCount(state, dish) - bbqsCooking(state, dish));
}

export function groupAllServed(group) {
  return group.diners.every(d => d.status === 'served');
}

export function groupWantsDish(group, dish) {
  return group.diners.some(d => d.status === 'waiting' && d.dish === dish);
}

export function goalReached(state) {
  return state.money >= CONFIG.goal;
}

// --- Botiga (només BBQ al nivell 1, fins a CONFIG.maxBbqs) ---

export function bbqCost(state) {
  return upgradeCost(CONFIG.bbq.baseCost, CONFIG.bbq.growth, state.bbqs.length - 1);
}

export function canBuyBbq(state) {
  return state.bbqs.length < CONFIG.maxBbqs;
}

export function buyBbq(state) {
  if (!canBuyBbq(state)) return state;
  const cost = bbqCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, bbqs: [...state.bbqs, null] };
}

// --- Accions manuals (pures) ---

export function startCooking(state, bbqIndex, dish) {
  if (state.bbqs[bbqIndex] !== null || state.bbqs[bbqIndex] === undefined) return state;
  if (state.queue.length === 0) return state;
  const total = DISHES[dish].cookTime;
  const bbqs = state.bbqs.map((b, i) => (i === bbqIndex ? { dish, remaining: total, total } : b));
  return { ...state, bbqs };
}

export function deliverPlate(state, queueIndex, dish) {
  const g = state.queue[queueIndex];
  if (!g) return state;
  const plateIdx = state.readyPlates.indexOf(dish);
  if (plateIdx === -1) return state;
  const dinerIdx = g.diners.findIndex(d => d.status === 'waiting' && d.dish === dish);
  if (dinerIdx === -1) return state;

  const diners = g.diners.map((d, i) => (i === dinerIdx ? { ...d, status: 'served' } : d));
  const newGroup = { ...g, diners };
  const readyPlates = state.readyPlates.filter((_, i) => i !== plateIdx);

  // quan el grup té tot el menjar paga a l'instant, però encara es queda una
  // estona a la botiga (CONFIG.leaveTime) abans de marxar per la porta
  if (groupAllServed(newGroup)) {
    const amount = newGroup.diners.reduce((s, d) => s + DISHES[d.dish].price, 0);
    const eating = { ...newGroup, leaveTimer: CONFIG.leaveTime };
    const queue = state.queue.map((gg, i) => (i === queueIndex ? eating : gg));
    return { ...state, queue, readyPlates, money: state.money + amount };
  }
  const queue = state.queue.map((gg, i) => (i === queueIndex ? newGroup : gg));
  return { ...state, queue, readyPlates };
}

// tick avança el temps del joc. Retorna sempre { state, events }.
export function tick(state, dt, rng) {
  const events = [];
  const next = {
    ...state,
    queue: [...state.queue],
    bbqs: [...state.bbqs],
    readyPlates: [...state.readyPlates],
  };

  // els que ja tenen el menjar se'n van quan se'ls acaba el temps
  next.queue = next.queue
    .map(g => (g.leaveTimer === null ? g : { ...g, leaveTimer: g.leaveTimer - dt }))
    .filter(g => g.leaveTimer === null || g.leaveTimer > 0);

  // arribada: nou grup a la cua si no és plena
  next.spawnTimer -= dt;
  if (next.spawnTimer <= 0) {
    if (next.queue.length < CONFIG.queueMax) {
      const g = spawnGroup(rng, next.nextGroupId++);
      next.queue.push(g);
      events.push({ type: 'arrival', size: g.diners.length });
    }
    next.spawnTimer = CONFIG.spawnInterval;
  }

  // cocció: cada BBQ avança independentment
  for (let i = 0; i < next.bbqs.length; i++) {
    const b = next.bbqs[i];
    if (b === null) continue;
    const remaining = b.remaining - dt;
    if (remaining <= 0) {
      if (queueWaitingCount(next, b.dish) > platesCount(next, b.dish)) {
        next.readyPlates.push(b.dish);
      }
      next.bbqs[i] = null;
    } else {
      next.bbqs[i] = { ...b, remaining };
    }
  }

  return { state: next, events };
}
