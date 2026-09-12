// Atles dels fulls de sprites: on és cada retall dins de cada PNG.
// Packs: restaurant → Bitglow; personatges → Jephed (Game Between The Lines).
// Aquí només hi ha dades; qui dibuixa és scene.js.

export const SHEETS = {
  walls: 'assets/restaurant/floorswalls_LRK.png',
  kitchen: 'assets/restaurant/kitchen_LRK.png',
  living: 'assets/restaurant/livingroom_LRK.png',
  decor: 'assets/restaurant/decorations_LRK.png',
  doors: 'assets/restaurant/doorswindowsstairs_LRK.png',
};

export const TILE = 16;

// [full, x, y, amplada, alçada]. Els retalls amb variants es repeteixen
// horitzontalment cada `w` píxels (mateix moble, un altre color/textura).
export const SPRITES = {
  wallBrick:    ['walls',   144,  80,  16, 48],
  floorKitchen: ['walls',   144, 192,  16, 16],
  floorHall:    ['walls',    16, 192,  16, 16],
  kitchenBlock: ['kitchen',  23,  11, 145, 65],
  counter:      ['kitchen', 192,  41,  32, 23],   // mòdul que es repeteix sense juntes
  grillOff:     ['kitchen', 192,  80,  32, 42],
  grillOn:      ['kitchen', 240,  80,  32, 42],
  fridge:       ['kitchen', 356,  24,  24, 56],
  window:       ['doors',   208, 177,  48, 30],
  table:        ['living',  224, 208,  32, 32],
  chair:        ['living',  272, 208,  16, 32],
  rug:          ['living',   16, 336,  64, 32],
  plantTall:    ['decor',    80,  80,  16, 31],
  plantSmall:   ['decor',    16,  81,  15, 30],
  picture:      ['decor',   112,  96,  32, 16],
  poster:       ['decor',   112,  64,  32, 16],
};

export const WALL_VARIANTS = 4; // columnes de maó diferents dins del full

// --- Personatges ---
// Cada fitxer és un personatge: 3 fotogrames (cames esquerra / quiet / dreta)
// × 4 direccions (mirant avall, de costat ×2, d'esquena).
export const CHAR_W = 20;
export const CHAR_H = 32;
export const CHAR_COUNT = 40;
export const FRAME_IDLE = 1;
export const DIR = { down: 0, side: 1, sideAlt: 2, up: 3 };

export function charSrc(look) {
  return `assets/characters/${String(look % CHAR_COUNT).padStart(3, '0')}.png`;
}
