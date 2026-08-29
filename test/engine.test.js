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
