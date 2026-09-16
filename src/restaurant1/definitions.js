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
  maxDirty: 9,          // plats bruts que caben al taulell
  dirtyPerSlot: 3,      // cada 3 plats bruts, un client menys a la cua
  maxBbqs: 3,           // pots tenir fins a 3 BBQ al nivell 1
  bbq: { baseCost: 150, growth: 2 },
  // Foc més fort: cada nivell cou un 25% més ràpid (×2 al nivell 4)
  fire: { baseCost: 120, growth: 1.8, maxLevel: 4, step: 0.25 },
};

// Personal: cadascú fa una feina sol, cada `interval` segons. Contractar-ne
// un altre del mateix ofici fa la feina el doble de ràpid.
export const STAFF_IDS = ['washer', 'cook', 'waiter'];

export const STAFF = {
  washer: { name: 'Rentaplats', icon: '🧽',   job: 'renta els plats bruts',       baseCost: 250, growth: 2.2, max: 2, interval: 2.5 },
  cook:   { name: 'Cuiner',     icon: '👨‍🍳', job: 'posa plats a coure sol',      baseCost: 450, growth: 2.2, max: 2, interval: 2 },
  waiter: { name: 'Cambrer',    icon: '🛎️',  job: 'serveix els plats als clients', baseCost: 700, growth: 2.2, max: 2, interval: 2.5 },
};
