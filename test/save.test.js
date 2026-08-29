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
