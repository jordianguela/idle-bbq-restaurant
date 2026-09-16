// --- Nivell 1: Street Food ---
export const DISHES = {
  hamburguesa: { id: 'hamburguesa', name: 'Hamburguesa', emoji: '🍔', price: 12, cookTime: 2 },
  frankfurt:   { id: 'frankfurt',   name: 'Frankfurt',   emoji: '🌭', price: 8,  cookTime: 1.5 },
};

export const DISH_IDS = ['hamburguesa', 'frankfurt'];

export const CONFIG = {
  levelName: 'Street Food',
  goal: 10000,          // € per obrir el restaurant del nivell 2
  queueMax: 3,          // grups màxims fent cua
  spawnInterval: 1.5,   // segons entre arribades (si la cua no és plena)
  partySizes: [         // grups d'1 o 2 persones
    { size: 1, weight: 1 },
    { size: 2, weight: 1 },
  ],
  leaveTime: 3,         // segons que es queden amb el menjar abans de marxar
  maxDirty: 8,          // plats bruts que caben al taulell
  maxBbqs: 3,           // pots tenir fins a 3 BBQ al nivell 1
  bbq: { baseCost: 150, growth: 2 },
};
