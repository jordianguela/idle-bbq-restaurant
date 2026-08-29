export const DISHES = {
  bistec:    { id: 'bistec',    name: 'Bistec',    emoji: '🥩', price: 10, cookTime: 2.5 },
  costelles: { id: 'costelles', name: 'Costelles', emoji: '🍖', price: 16, cookTime: 3.5 },
};

export const DISH_IDS = ['bistec', 'costelles'];

export const CONFIG = {
  eatTime: 4,
  spawnInterval: 2,
  tableCapacity: 4,
  partySizes: [
    { size: 1, weight: 1 },
    { size: 2, weight: 3 },
    { size: 4, weight: 3 },
  ],
};
