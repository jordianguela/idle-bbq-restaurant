import { CONFIG } from './definitions.js';

export function createInitialState(now) {
  return {
    money: 0,
    spawnTimer: CONFIG.spawnInterval,
    table: null,
    bbq: null,
    readyPlates: [],
    lastSeen: now,
  };
}
