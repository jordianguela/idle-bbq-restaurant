import { createInitialState } from './state.js';
import { CONFIG, STAFF, STAFF_IDS } from './definitions.js';

const KEY = 'idle-bbq-lvl1';

// El navegador pot tenir el localStorage bloquejat (finestra privada, permisos):
// si passa, es juga igual, només que sense desar.
export function save(state, storage, now) {
  try {
    storage.setItem(KEY, JSON.stringify({
      money: state.money,
      bbqs: state.bbqs.length,
      fireLevel: state.fireLevel,
      staff: state.staff,
      lastSeen: now,
    }));
  } catch { /* partida no desada */ }
}

export function load(storage, now) {
  const state = createInitialState(now);
  let raw = null;
  try { raw = storage.getItem(KEY); } catch { /* sense partida desada */ }
  if (raw) {
    const saved = JSON.parse(raw);
    state.money = saved.money ?? 0;
    const nb = Math.min(CONFIG.maxBbqs, Math.max(1, saved.bbqs ?? 1));
    state.bbqs = Array(nb).fill(null);
    state.fireLevel = Math.min(CONFIG.fire.maxLevel, Math.max(0, saved.fireLevel ?? 0));
    for (const role of STAFF_IDS) {
      state.staff[role] = Math.min(STAFF[role].max, Math.max(0, saved.staff?.[role] ?? 0));
    }
  }
  return state;
}
