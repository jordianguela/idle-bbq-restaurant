import { createInitialState } from './state.js';
import { CONFIG } from './definitions.js';

const KEY = 'idle-bbq-lvl1';

export function save(state, storage, now) {
  storage.setItem(KEY, JSON.stringify({
    money: state.money,
    bbqs: state.bbqs.length,
    lastSeen: now,
  }));
}

export function load(storage, now) {
  const state = createInitialState(now);
  const raw = storage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    state.money = saved.money ?? 0;
    const nb = Math.min(CONFIG.maxBbqs, Math.max(1, saved.bbqs ?? 1));
    state.bbqs = Array(nb).fill(null);
  }
  return state;
}
