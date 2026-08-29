import { CONFIG } from './definitions.js';

export function createInitialState(now) {
  return {
    money: 0,
    spawnTimer: CONFIG.spawnInterval,
    tables: [null],   // cada posició: null (buida) o una taula ocupada
    bbqs: [null],     // cada posició: null (lliure) o { dish, remaining }
    readyPlates: [],  // plats cuinats pendents d'entregar (bossa comuna de la cuina)
    lastSeen: now,
  };
}
