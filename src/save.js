import { createInitialState } from './state.js';
import { incomePerSec } from './engine.js';

const KEY = 'idle-bbq-save';

export function save(state, storage, now) {
  storage.setItem(KEY, JSON.stringify({ ...state, lastSeen: now }));
}

export function load(storage, now) {
  const raw = storage.getItem(KEY);
  if (!raw) {
    return { state: createInitialState(now), offlineEarnings: 0 };
  }
  const saved = JSON.parse(raw);
  const elapsed = Math.max(0, (now - saved.lastSeen) / 1000);
  const offlineEarnings = Math.floor(incomePerSec(saved) * elapsed);
  const state = { ...saved, money: saved.money + offlineEarnings, lastSeen: now };
  return { state, offlineEarnings };
}
