import { CONFIG } from './definitions.js';

export function createInitialState(now) {
  return {
    money: 0,
    spawnTimer: CONFIG.spawnInterval,
    tables: [null],   // cada posició: null (buida) o una taula ocupada
    bbqs: [null],     // cada posició: null (lliure) o { dish, remaining, total }
    readyPlates: [],  // plats cuinats pendents d'entregar (bossa comuna de la cuina)
    waiters: [],      // cada posició: { cooldown } (0 = llest per actuar)
    cooks: [],        // cada posició: { cooldown }
    waiterSkill: 0,   // nivell de velocitat dels cambrers
    cookSkill: 0,     // nivell de velocitat dels cuiners
    lastSeen: now,
  };
}
