import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../src/restaurant1/state.js';
import {
  tick, deliverPlate, washPlate, startCooking, buyFire, fireCost, canBuyFire,
  queueCapacity, hire, hireCost, canHire, tipFactor,
} from '../src/restaurant1/engine.js';
import { DISHES, STAFF } from '../src/restaurant1/definitions.js';
import { CONFIG } from '../src/restaurant1/definitions.js';

// rng determinista: sempre el primer plat i el grup més petit
const rng = () => 0;

function stateWithGroup() {
  const start = createInitialState(0);
  const { state } = tick({ ...start, spawnTimer: 0 }, 0.1, rng);
  return state;
}

test('el grup servit encara es queda una estona abans de marxar', () => {
  const s = stateWithGroup();
  const dish = s.queue[0].diners[0].dish;
  const served = deliverPlate({ ...s, readyPlates: [dish] }, 0, dish);

  assert.equal(served.queue.length, 1, 'el grup encara hi és');
  assert.equal(served.queue[0].leaveTimer, CONFIG.leaveTime);
  assert.ok(served.money > 0, 'ha pagat en tenir el menjar');
});

test('en marxar deixa un plat brut per comensal', () => {
  const s = stateWithGroup();
  const dish = s.queue[0].diners[0].dish;
  const diners = s.queue[0].diners.length;
  const served = deliverPlate({ ...s, readyPlates: [dish] }, 0, dish);

  const id = served.queue[0].id;
  const inQueue = st => st.queue.some(g => g.id === id);

  const { state: waiting } = tick(served, CONFIG.leaveTime - 0.1, rng);
  assert.ok(inQueue(waiting), 'abans de temps no marxa');
  assert.equal(waiting.dirtyPlates.length, 0);

  const { state: gone } = tick(waiting, 0.2, rng);
  assert.ok(!inQueue(gone), 'ha marxat');
  assert.equal(gone.dirtyPlates.length, diners);
});

test('rentar un plat el treu del taulell', () => {
  const s = { ...createInitialState(0), dirtyPlates: ['hamburguesa', 'frankfurt'] };
  assert.deepEqual(washPlate(s, 0).dirtyPlates, ['frankfurt']);
  assert.deepEqual(washPlate(s, 5).dirtyPlates, s.dirtyPlates, 'índex inexistent: no toca res');
});

test('el taulell de bruts té un límit', () => {
  const full = { ...createInitialState(0), dirtyPlates: Array(CONFIG.maxDirty).fill('hamburguesa') };
  const s = stateWithGroup();
  const dish = s.queue[0].diners[0].dish;
  const served = deliverPlate({ ...full, queue: s.queue, readyPlates: [dish] }, 0, dish);
  const { state: gone } = tick(served, CONFIG.leaveTime + 0.1, rng);
  assert.equal(gone.dirtyPlates.length, CONFIG.maxDirty);
});

test('el foc més fort cou més de pressa', () => {
  const s = stateWithGroup();
  const dish = s.queue[0].diners[0].dish;

  const normal = startCooking(s, 0, dish);
  assert.equal(normal.bbqs[0].total, DISHES[dish].cookTime);

  const strong = startCooking({ ...s, fireLevel: 2 }, 0, dish);
  const factor = 1 + CONFIG.fire.step * 2;
  assert.equal(strong.bbqs[0].total, DISHES[dish].cookTime / factor);
  assert.ok(strong.bbqs[0].total < normal.bbqs[0].total);
});

test('comprar foc: costa diners, puja de nivell i té topall', () => {
  const rich = { ...createInitialState(0), money: 100000 };
  const cost = fireCost(rich);
  const after = buyFire(rich);
  assert.equal(after.fireLevel, 1);
  assert.equal(after.money, rich.money - cost);

  const poor = { ...createInitialState(0), money: 0 };
  assert.equal(buyFire(poor).fireLevel, 0, 'sense diners no puja');

  let maxed = rich;
  for (let i = 0; i < CONFIG.fire.maxLevel + 2; i++) maxed = buyFire(maxed);
  assert.equal(maxed.fireLevel, CONFIG.fire.maxLevel);
  assert.equal(canBuyFire(maxed), false);
});

test('els plats bruts treuen lloc a la cua', () => {
  const s = createInitialState(0);
  assert.equal(queueCapacity(s), CONFIG.queueMax);
  assert.equal(queueCapacity({ ...s, dirtyPlates: Array(CONFIG.dirtyPerSlot).fill('x') }), CONFIG.queueMax - 1);
  assert.equal(queueCapacity({ ...s, dirtyPlates: Array(CONFIG.maxDirty).fill('x') }), 0);
});

test('amb el taulell ple de bruts no entren clients', () => {
  const brut = { ...createInitialState(0), spawnTimer: 0, dirtyPlates: Array(CONFIG.maxDirty).fill('hamburguesa') };
  const { state, events } = tick(brut, 0.1, rng);
  assert.equal(state.queue.length, 0);
  assert.equal(events.length, 0);
});

test('el rentaplats renta sol', () => {
  const s = {
    ...createInitialState(0),
    dirtyPlates: ['hamburguesa', 'frankfurt'],
    staff: { washer: 1, cook: 0, waiter: 0 },
  };
  const { state } = tick(s, STAFF.washer.interval, rng);
  assert.equal(state.dirtyPlates.length, 1, 'n\'ha rentat un');
});

test('el cuiner posa plats a coure sol', () => {
  const s = { ...stateWithGroup(), staff: { washer: 0, cook: 1, waiter: 0 } };
  const { state } = tick(s, STAFF.cook.interval, rng);
  assert.ok(state.bbqs[0], 'la graella està en marxa');
});

test('contractar: cobra, puja i té topall', () => {
  const rich = { ...createInitialState(0), money: 100000 };
  const cost = hireCost(rich, 'cook');
  const after = hire(rich, 'cook');
  assert.equal(after.staff.cook, 1);
  assert.equal(after.money, rich.money - cost);

  assert.equal(hire({ ...createInitialState(0), money: 0 }, 'cook').staff.cook, 0, 'sense diners no contracta');

  let full = rich;
  for (let i = 0; i < STAFF.cook.max + 2; i++) full = hire(full, 'cook');
  assert.equal(full.staff.cook, STAFF.cook.max);
  assert.equal(canHire(full, 'cook'), false);
});

test('servir de pressa paga més', () => {
  assert.equal(tipFactor(0), CONFIG.tip.max, 'acabats d\'arribar: el triple');
  assert.equal(tipFactor(CONFIG.tip.fast), CONFIG.tip.max, 'dins del marge: encara el triple');
  assert.equal(tipFactor(CONFIG.tip.slow), 1, 'tard: preu normal');
  assert.equal(tipFactor(CONFIG.tip.slow + 100), 1, 'molt tard: mai menys del preu');
  const mig = tipFactor((CONFIG.tip.fast + CONFIG.tip.slow) / 2);
  assert.ok(mig > 1 && mig < CONFIG.tip.max, 'entremig, va baixant');
});

test('el grup paga segons el que ha esperat', () => {
  const s = stateWithGroup();
  const dish = s.queue[0].diners[0].dish;
  const price = DISHES[dish].price;

  const rapid = deliverPlate({ ...s, readyPlates: [dish] }, 0, dish);
  assert.equal(rapid.money, Math.round(price * CONFIG.tip.max));

  const lent = { ...s, queue: [{ ...s.queue[0], waitTime: CONFIG.tip.slow }], readyPlates: [dish] };
  assert.equal(deliverPlate(lent, 0, dish).money, price);
});

test('el personal més ràpid treballa més sovint', () => {
  const base = {
    ...createInitialState(0),
    dirtyPlates: ['a', 'b', 'c'],
    staff: { washer: 1, cook: 0, waiter: 0 },
  };
  const lent = tick(base, STAFF.washer.interval, rng).state;
  const rapid = tick({ ...base, staffSpeedLevel: CONFIG.staffSpeed.maxLevel }, STAFF.washer.interval, rng).state;
  assert.ok(rapid.dirtyPlates.length < lent.dirtyPlates.length, 'amb la millora en renta més');
});
