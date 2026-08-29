import { CONFIG } from './definitions.js';

export function createInitialState(now) {
  return {
    level: 1,
    money: 0,
    spawnTimer: CONFIG.spawnInterval,
    queue: [],        // grups esperant; cada grup: { diners: [{ dish, status }] }
    bbqs: [null],     // cada posició: null (lliure) o { dish, remaining, total }
    readyPlates: [],  // plats cuinats pendents de donar
    lastSeen: now,
  };
}
