import { createInitialState } from './state.js';

const KEY = 'idle-bbq-save';

export function save(state, storage, now) {
  storage.setItem(KEY, JSON.stringify({ money: state.money, lastSeen: now }));
}

export function load(storage, now) {
  const state = createInitialState(now);
  const raw = storage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    state.money = saved.money ?? 0;
  }
  return state;
}
