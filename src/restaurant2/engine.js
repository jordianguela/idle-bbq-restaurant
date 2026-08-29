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

export function spawnParty(rng) {
  const size = pickPartySize(rng);
  const diners = [];
  for (let i = 0; i < size; i++) {
    diners.push({ dish: pickDish(rng), status: 'waiting' });
  }
  return { diners, ticketLocation: 'table', eatingTimer: null };
}

// --- Habilitats (velocitat) ---

export function waiterActionTime(state) {
  return CONFIG.waiter.actionTime * CONFIG.waiterSkill.decay ** state.waiterSkill;
}

export function effectiveCookTime(state, dish) {
  return DISHES[dish].cookTime * CONFIG.cookSkill.decay ** state.cookSkill;
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

export function cookNeeded(state, dish) {
  return Math.max(0, kitchenWaitingCount(state, dish) - platesCount(state, dish) - bbqsCooking(state, dish));
}

function mostNeededDish(state) {
  let best = null, bestN = 0;
  for (const id of DISH_IDS) {
    const n = cookNeeded(state, id);
    if (n > bestN) { bestN = n; best = id; }
  }
  return best;
}

// --- Costos de la botiga ---

export function tableCost(state) { return upgradeCost(CONFIG.table.baseCost, CONFIG.table.growth, state.tables.length - 1); }
export function bbqCost(state) { return upgradeCost(CONFIG.bbq.baseCost, CONFIG.bbq.growth, state.bbqs.length - 1); }
export function waiterCost(state) { return upgradeCost(CONFIG.waiter.baseCost, CONFIG.waiter.growth, state.waiters.length); }
export function cookCost(state) { return upgradeCost(CONFIG.cook.baseCost, CONFIG.cook.growth, state.cooks.length); }
export function waiterSkillCost(state) { return upgradeCost(CONFIG.waiterSkill.baseCost, CONFIG.waiterSkill.growth, state.waiterSkill); }
export function cookSkillCost(state) { return upgradeCost(CONFIG.cookSkill.baseCost, CONFIG.cookSkill.growth, state.cookSkill); }

// --- Accions manuals (pures: retornen estat nou, no muten l'entrada) ---

export function sendTicket(state, tableIndex) {
  const t = state.tables[tableIndex];
  if (!t || t.ticketLocation !== 'table') return state;
  const tables = state.tables.map((tt, i) => (i === tableIndex ? { ...tt, ticketLocation: 'kitchen' } : tt));
  return { ...state, tables };
}

export function startCooking(state, bbqIndex, dish) {
  if (state.bbqs[bbqIndex] !== null || state.bbqs[bbqIndex] === undefined) return state;
  if (!anyTicketInKitchen(state)) return state;
  const total = effectiveCookTime(state, dish);
  const bbqs = state.bbqs.map((b, i) => (i === bbqIndex ? { dish, remaining: total, total } : b));
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

// --- Botiga: comprar/contractar/millorar ---

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

export function hireWaiter(state) {
  const cost = waiterCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, waiters: [...state.waiters, { cooldown: 0 }] };
}

export function hireCook(state) {
  const cost = cookCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, cooks: [...state.cooks, { cooldown: 0 }] };
}

export function upgradeWaiterSkill(state) {
  const cost = waiterSkillCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, waiterSkill: state.waiterSkill + 1 };
}

export function upgradeCookSkill(state) {
  const cost = cookSkillCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, cookSkill: state.cookSkill + 1 };
}

// --- Automatització (opera sobre l'objecte mutable `next` dins de tick) ---

function tryWaiterDeliver(next) {
  for (let p = 0; p < next.readyPlates.length; p++) {
    const dish = next.readyPlates[p];
    const ti = next.tables.findIndex(t => t && t.diners.some(d => d.status === 'waiting' && d.dish === dish));
    if (ti !== -1) {
      const t = next.tables[ti];
      const di = t.diners.findIndex(d => d.status === 'waiting' && d.dish === dish);
      const diners = t.diners.map((d, k) => (k === di ? { ...d, status: 'served' } : d));
      next.tables[ti] = { ...t, diners };
      next.readyPlates = next.readyPlates.filter((_, k) => k !== p);
      return true;
    }
  }
  return false;
}

function tryWaiterSendTicket(next) {
  const ti = next.tables.findIndex(t => t && t.ticketLocation === 'table');
  if (ti === -1) return false;
  next.tables[ti] = { ...next.tables[ti], ticketLocation: 'kitchen' };
  return true;
}

function waitersAct(next, dt) {
  const actionTime = waiterActionTime(next);
  for (let i = 0; i < next.waiters.length; i++) {
    const w = next.waiters[i];
    if (w.cooldown > 0) {
      next.waiters[i] = { cooldown: w.cooldown - dt };
    } else if (tryWaiterDeliver(next) || tryWaiterSendTicket(next)) {
      next.waiters[i] = { cooldown: actionTime };
    }
  }
}

function cooksAct(next, dt) {
  for (let i = 0; i < next.cooks.length; i++) {
    const c = next.cooks[i];
    if (c.cooldown > 0) { next.cooks[i] = { cooldown: c.cooldown - dt }; continue; }
    const bi = next.bbqs.findIndex(b => b === null);
    if (bi === -1) continue;               // cap BBQ lliure
    const dish = mostNeededDish(next);
    if (!dish) continue;                    // res per cuinar
    const total = effectiveCookTime(next, dish);
    next.bbqs[bi] = { dish, remaining: total, total };
    next.cooks[i] = { cooldown: total };
  }
}

// tick avança el temps del joc. Retorna sempre { state, events }.
export function tick(state, dt, rng) {
  const events = [];
  const next = {
    ...state,
    tables: [...state.tables],
    bbqs: [...state.bbqs],
    readyPlates: [...state.readyPlates],
    waiters: [...state.waiters],
    cooks: [...state.cooks],
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

  // cambrers: envien tíquets i entreguen plats
  waitersAct(next, dt);

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

  // cuiners: comencen a coure el plat que més falta en una BBQ lliure
  cooksAct(next, dt);

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
