import { DISHES, DISH_IDS, CONFIG, STAFF, STAFF_IDS } from './definitions.js';
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
  // waitTime: segons des que han arribat, per calcular la propina.
  return { id, diners, leaveTimer: null, waitTime: 0 };
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

// Propina per rapidesa: servir de seguida paga fins al triple, i va baixant
// fins al preu normal si els fas esperar.
export function tipFactor(waitTime) {
  const { fast, slow, max } = CONFIG.tip;
  const late = Math.max(0, Math.min(1, (waitTime - fast) / (slow - fast)));
  return max - (max - 1) * late;
}

// Els plats bruts ocupen el local: cada tants, un client menys hi cap.
export function queueCapacity(state) {
  const lost = Math.floor(state.dirtyPlates.length / CONFIG.dirtyPerSlot);
  return Math.max(0, CONFIG.queueMax - lost);
}

// --- Personal ---

export function hireCost(state, role) {
  return upgradeCost(STAFF[role].baseCost, STAFF[role].growth, state.staff[role]);
}

export function canHire(state, role) {
  return state.staff[role] < STAFF[role].max;
}

export function hire(state, role) {
  if (!canHire(state, role)) return state;
  const cost = hireCost(state, role);
  if (state.money < cost) return state;
  return {
    ...state,
    money: state.money - cost,
    staff: { ...state.staff, [role]: state.staff[role] + 1 },
  };
}

// Què fa cadascú quan li toca. Retorna l'estat nou, o null si no hi ha feina.
const STAFF_WORK = {
  washer: (state) => (state.dirtyPlates.length ? washPlate(state, 0) : null),

  cook: (state) => {
    const free = state.bbqs.indexOf(null);
    if (free === -1) return null;
    const dish = DISH_IDS.find(id => cookNeeded(state, id) > 0);
    return dish ? startCooking(state, free, dish) : null;
  },

  waiter: (state) => {
    for (const dish of state.readyPlates) {
      const group = state.queue.findIndex(g => groupWantsDish(g, dish));
      if (group !== -1) return deliverPlate(state, group, dish);
    }
    return null;
  },
};

// Personal més ràpid: tots fan la feina més sovint.
export function staffSpeedFactor(state) {
  return 1 + CONFIG.staffSpeed.step * (state.staffSpeedLevel ?? 0);
}

export function staffSpeedCost(state) {
  return upgradeCost(CONFIG.staffSpeed.baseCost, CONFIG.staffSpeed.growth, state.staffSpeedLevel ?? 0);
}

export function canBuyStaffSpeed(state) {
  return (state.staffSpeedLevel ?? 0) < CONFIG.staffSpeed.maxLevel;
}

export function buyStaffSpeed(state) {
  if (!canBuyStaffSpeed(state)) return state;
  const cost = staffSpeedCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, staffSpeedLevel: (state.staffSpeedLevel ?? 0) + 1 };
}

function runStaff(state, dt) {
  let next = state;
  const timers = { ...state.staffTimers };
  const speed = staffSpeedFactor(state);

  for (const role of STAFF_IDS) {
    const hired = next.staff[role];
    if (!hired) continue;
    timers[role] -= dt * hired * speed;    // més personal i més ràpids, més feina feta
    while (timers[role] < 0) {
      timers[role] += STAFF[role].interval;
      const done = STAFF_WORK[role](next);
      if (!done) break;                    // res a fer: no s'acumula feina
      next = done;
    }
  }
  return { ...next, staffTimers: timers };
}

// Foc més fort: multiplica la velocitat de cocció de totes les graelles.
export function fireFactor(state) {
  return 1 + CONFIG.fire.step * (state.fireLevel ?? 0);
}

export function fireCost(state) {
  return upgradeCost(CONFIG.fire.baseCost, CONFIG.fire.growth, state.fireLevel ?? 0);
}

export function canBuyFire(state) {
  return (state.fireLevel ?? 0) < CONFIG.fire.maxLevel;
}

export function buyFire(state) {
  if (!canBuyFire(state)) return state;
  const cost = fireCost(state);
  if (state.money < cost) return state;
  return { ...state, money: state.money - cost, fireLevel: (state.fireLevel ?? 0) + 1 };
}

// --- Accions manuals (pures) ---

export function startCooking(state, bbqIndex, dish) {
  if (state.bbqs[bbqIndex] !== null || state.bbqs[bbqIndex] === undefined) return state;
  if (state.queue.length === 0) return state;
  const total = DISHES[dish].cookTime / fireFactor(state);
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
    const price = newGroup.diners.reduce((s, d) => s + DISHES[d.dish].price, 0);
    const factor = tipFactor(newGroup.waitTime);
    const amount = Math.round(price * factor);
    const eating = { ...newGroup, leaveTimer: CONFIG.leaveTime, paid: amount, factor };
    const queue = state.queue.map((gg, i) => (i === queueIndex ? eating : gg));
    return { ...state, queue, readyPlates, money: state.money + amount };
  }
  const queue = state.queue.map((gg, i) => (i === queueIndex ? newGroup : gg));
  return { ...state, queue, readyPlates };
}

// Portar un plat brut a la pica: rentat i fora.
export function washPlate(state, index) {
  if (index < 0 || index >= state.dirtyPlates.length) return state;
  return { ...state, dirtyPlates: state.dirtyPlates.filter((_, i) => i !== index) };
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

  // els que ja tenen el menjar se'n van quan se'ls acaba el temps, i deixen
  // els plats bruts al taulell
  next.dirtyPlates = [...state.dirtyPlates];
  next.queue = next.queue
    .map(g => (g.leaveTimer === null
      ? { ...g, waitTime: g.waitTime + dt }        // encara esperen: corre el crono
      : { ...g, leaveTimer: g.leaveTimer - dt }))
    .filter(g => {
      if (g.leaveTimer === null || g.leaveTimer > 0) return true;
      for (const d of g.diners) {
        if (next.dirtyPlates.length < CONFIG.maxDirty) next.dirtyPlates.push(d.dish);
      }
      return false;
    });

  // arribada: nou grup si hi caben (els plats bruts ocupen lloc)
  next.spawnTimer -= dt;
  if (next.spawnTimer <= 0) {
    if (next.queue.length < queueCapacity(next)) {
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

  return { state: runStaff(next, dt), events };
}
