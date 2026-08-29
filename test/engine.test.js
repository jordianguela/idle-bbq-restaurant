import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moneyPerServe, incomePerSec, serve, meatCost, cookCost, buyMeat, buyCook } from '../src/engine.js';

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
