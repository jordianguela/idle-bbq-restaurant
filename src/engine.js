import { DISHES, DISH_IDS, CONFIG } from './definitions.js';

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

export function spawnParty(rng) {
  const size = pickPartySize(rng);
  const diners = [];
  for (let i = 0; i < size; i++) {
    diners.push({ dish: pickDish(rng), status: 'waiting' });
  }
  return { diners, ticketLocation: 'table', eatingTimer: null };
}

// --- Càlculs derivats ---

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

// --- Accions (pures: retornen estat nou, no muten l'entrada) ---

export function sendTicket(state) {
  if (!state.table || state.table.ticketLocation !== 'table') return state;
  return { ...state, table: { ...state.table, ticketLocation: 'kitchen' } };
}

export function startCooking(state, dish) {
  if (!state.table || !ticketInKitchen(state) || state.bbq !== null) return state;
  return { ...state, bbq: { dish, remaining: DISHES[dish].cookTime } };
}

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

// tick avança el temps del joc. Retorna sempre { state, events }.
export function tick(state, dt, rng) {
  const events = [];
  const next = { ...state };

  // arribada de grups (només si la taula és lliure)
  if (next.table === null) {
    next.spawnTimer -= dt;
    if (next.spawnTimer <= 0) {
      next.table = spawnParty(rng);
      next.spawnTimer = CONFIG.spawnInterval;
      events.push({ type: 'arrival', size: next.table.diners.length });
    }
  }

  // cocció a la BBQ (un plat alhora)
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

  // menjar (només quan tot el grup està servit) i pagament
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

  return { state: next, events };
}
