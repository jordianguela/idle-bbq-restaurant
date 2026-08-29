export const DISHES = {
  bistec:    { id: 'bistec',    name: 'Bistec',    emoji: '🥩', price: 10, cookTime: 1.5 },
  costelles: { id: 'costelles', name: 'Costelles', emoji: '🍖', price: 16, cookTime: 2.5 },
};

export const DISH_IDS = ['bistec', 'costelles'];

export const CONFIG = {
  eatTime: 3,
  spawnInterval: 2,
  tableCapacity: 4,
  partySizes: [
    { size: 1, weight: 1 },
    { size: 2, weight: 3 },
    { size: 4, weight: 3 },
  ],
  table: { baseCost: 100, growth: 1.6 },
  bbq: { baseCost: 80, growth: 1.6 },
  // Personal: quantitat (contractar) i habilitat (velocitat). Costos provisionals,
  // pensats per afinar-los a l'alça més endavant.
  waiter: { baseCost: 60, growth: 1.6, actionTime: 1.2 },
  cook: { baseCost: 120, growth: 1.7 },
  waiterSkill: { baseCost: 80, growth: 1.8, decay: 0.85 },  // -15% temps d'acció per nivell
  cookSkill: { baseCost: 100, growth: 1.8, decay: 0.85 },   // -15% temps de cocció per nivell
};
