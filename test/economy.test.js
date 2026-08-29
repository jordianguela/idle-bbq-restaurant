import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upgradeCost } from '../src/economy.js';

test('cost base quan level és 0', () => {
  assert.equal(upgradeCost(15, 1.15, 0), 15);
});

test('el cost creix amb el level i arrodoneix amunt', () => {
  assert.equal(upgradeCost(15, 1.15, 1), 18); // 15*1.15=17.25 -> 18
  assert.equal(upgradeCost(15, 1.15, 2), 20); // 15*1.3225=19.8375 -> 20
});
