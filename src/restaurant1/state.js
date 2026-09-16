import { CONFIG } from './definitions.js';

export function createInitialState(now) {
  return {
    level: 1,
    money: 0,
    spawnTimer: CONFIG.spawnInterval,
    queue: [],        // grups a la botiga; cada grup: { id, diners, leaveTimer }
    nextGroupId: 1,   // identitat de cada grup (l'escena hi enganxa l'animació)
    bbqs: [null],     // cada posició: null (lliure) o { dish, remaining, total }
    readyPlates: [],  // plats cuinats pendents de donar
    dirtyPlates: [],  // plats bruts que han deixat els clients (a rentar a la pica)
    lastSeen: now,
  };
}
