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
};
