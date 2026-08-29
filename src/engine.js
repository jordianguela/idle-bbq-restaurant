import { DISHES, DISH_IDS, CONFIG } from './definitions.js';
import { upgradeCost } from './economy.js';

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

export function anyTicketInKitchen(state) {
  return state.tables.some(t => t && t.ticketLocation === 'kitchen');
}

export function partyAllServed(table) {
  return !!table && table.diners.every(d => d.status === 'served');
}

export function tableWantsDish(table, dish) {
  return !!table && table.diners.some(d => d.status === 'waiting' && d.dish === dish);
}

// comensals que esperen 'dish' a taules amb el tíquet ja a la cuina
export function kitchenWaitingCount(state, dish) {
  let n = 0;
  for (const t of state.tables) {
    if (t && t.ticketLocation === 'kitchen') {
      n += t.diners.filter(d => d.status === 'waiting' && d.dish === dish).length;
    }
  }
  return n;
}

export function platesCount(state, dish) {
  return state.readyPlates.filter(d => d === dish).length;
}

function bbqsCooking(state, dish) {
  return state.bbqs.filter(b => b && b.dish === dish).length;
}

// plats de 'dish' que encara falta cuinar (guia per a la comanda)
export function cookNeeded(state, dish) {
  return Math.max(0, kitchenWaitingCount(state, dish) - platesCount(state, dish) - bbqsCooking(state, dish));
}

// --- Costos de la botiga ---

export function tableCost(state) {
  return upgradeCost(CONFIG.table.baseCost, CONFIG.table.growth, state.tables.length - 1);
}

export function bbqCost(state) {
  return upgradeCost(CONFIG.bbq.baseCost, CONFIG.bbq.growth, state.bbqs.length - 1);
}

// --- Accions (pures: retornen estat nou, no muten l'entrada) ---

export function sendTicket(state, tableIndex) {
  const t = state.tables[tableIndex];
  if (!t || t.ticketLocation !== 'table') return state;
  const tables = state.tables.map((tt, i) => (i === tableIndex ? { ...tt, ticketLocation: 'kitchen' } : tt));
  return { ...state, tables };
}

export function startCooking(state, bbqIndex, dish) {
  if (state.bbqs[bbqIndex] !== null || state.bbqs[bbqIndex] === undefined) return state;
  if (!anyTicketInKitchen(state)) return state;
  const bbqs = state.bbqs.map((b, i) => (i === bbqIndex ? { dish, remaining: DISHES[dish].cookTime } : b));
  return { ...state, bbqs };
}

export function deliverPlate(state, tableIndex, dish) {
  const t = state.tables[tableIndex];
  if (!t) return state;
  const plateIdx = state.readyPlates.indexOf(dish);
  if (plateIdx === -1) return state;
  const dinerIdx = t.diners.findIndex(d => d.status === 'waiting' && d.dish === dish);
  if (dinerIdx === -1) return state;

  const diners = t.diners.map((d, i) => (i === dinerIdx ? { ...d, status: 'served' } : d));
  const tables = state.tables.map((tt, i) => (i === tableIndex ? { ...tt, diners } : tt));
  const readyPlates = state.readyPlates.filter((_, i) => i !== plateIdx);
  return { ...state, tables, readyPlates };
}

export function buyTable(state) {
  const cost = tableCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, tables: [...state.tables, null] };
}

export function buyBbq(state) {
  const cost = bbqCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, bbqs: [...state.bbqs, null] };
}

// tick avança el temps del joc. Retorna sempre { state, events }.
export function tick(state, dt, rng) {
  const events = [];
  const next = {
    ...state,
    tables: [...state.tables],
    bbqs: [...state.bbqs],
    readyPlates: [...state.readyPlates],
  };

  // arribada: omple una taula lliure quan el timer arriba a 0
  next.spawnTimer -= dt;
  if (next.spawnTimer <= 0) {
    const freeIdx = next.tables.findIndex(t => t === null);
    if (freeIdx !== -1) {
      next.tables[freeIdx] = spawnParty(rng);
      events.push({ type: 'arrival', size: next.tables[freeIdx].diners.length });
    }
    next.spawnTimer = CONFIG.spawnInterval;
  }

  // cocció: cada BBQ avança independentment
  for (let i = 0; i < next.bbqs.length; i++) {
    const b = next.bbqs[i];
    if (b === null) continue;
    const remaining = b.remaining - dt;
    if (remaining <= 0) {
      if (kitchenWaitingCount(next, b.dish) > platesCount(next, b.dish)) {
        next.readyPlates.push(b.dish);
      }
      next.bbqs[i] = null;
    } else {
      next.bbqs[i] = { ...b, remaining };
    }
  }

  // menjar (només amb tot el grup servit) i pagament: cada taula
  for (let i = 0; i < next.tables.length; i++) {
    const t = next.tables[i];
    if (t === null) continue;
    if (t.eatingTimer === null && partyAllServed(t)) {
      next.tables[i] = { ...t, eatingTimer: CONFIG.eatTime };
    } else if (t.eatingTimer !== null) {
      const eatingTimer = t.eatingTimer - dt;
      if (eatingTimer <= 0) {
        const amount = t.diners.reduce((sum, d) => sum + DISHES[d.dish].price, 0);
        next.money += amount;
        events.push({ type: 'payment', amount });
        next.tables[i] = null;
      } else {
        next.tables[i] = { ...t, eatingTimer };
      }
    }
  }

  return { state: next, events };
}
