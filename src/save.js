import { createInitialState } from './state.js';

const KEY = 'idle-bbq-save';

export function save(state, storage, now) {
  storage.setItem(KEY, JSON.stringify({
    money: state.money,
    tables: state.tables.length,
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
    state.tables = Array(Math.max(1, saved.tables ?? 1)).fill(null);
    state.bbqs = Array(Math.max(1, saved.bbqs ?? 1)).fill(null);
  }
  return state;
}
