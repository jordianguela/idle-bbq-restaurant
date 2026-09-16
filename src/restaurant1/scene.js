// Escena del restaurant: pinta l'estat del joc amb els sprites (canvas 2D).
// No toca la lògica: rep l'estat i el dibuixa. Les interaccions només fan de
// "mapa" (quin grup hi ha sota el ratolí) i qui decideix segueix sent la UI.
import {
  SHEETS, SPRITES, TILE, WALL_VARIANTS,
  CHAR_W, CHAR_H, CHAR_COUNT, FRAME_IDLE, DIR, charSrc,
} from './sprites.js';
import { DISHES, DISH_IDS, CONFIG, STAFF_IDS } from './definitions.js';
import { queueCapacity, tipFactor } from './engine.js';

export const SCENE_W = 352;
export const SCENE_H = 240;
const SCALE = 3;

// --- Mides del local (en píxels de l'escena) ---
const WALL_H = 48;
const FLOOR_SPLIT = 128;        // on acaba la cuina i comença la sala
const COUNTER_Y = 118;          // el taulell que separa cuina i sala
const KITCHEN_BLOCK = { x: 6, y: 14 };
const FRIDGE = { x: 320, y: 30 };
const GRILL = { x0: 170, y: 52, dx: 46 };
const COOK = { x: 156, feet: 114, look: 11 };
// On es posa cadascú quan el contractes (i quina cara té)
const STAFF_SPOTS = {
  washer: { look: 12, dir: DIR.side, spots: [{ x: 60, feet: 114 }, { x: 78, feet: 100 }] },
  cook:   { look: 10, dir: DIR.up,   spots: [{ x: 196, feet: 116 }, { x: 242, feet: 116 }] },
  waiter: { look: 17, dir: DIR.down, spots: [{ x: 302, feet: 116 }, { x: 328, feet: 116 }] },
};
const PASS = { x: 200, y: 110, dx: 17, max: 8 };   // on es deixen els plats llestos
const SINK = { x: 4, y: 72 };                      // la pica: on es renten els bruts
const DIRTY = { x: 20, y: 121, dx: 17 };           // plats bruts, damunt del taulell
const SLOT_X = [58, 176, 294];  // centre de cada grup de la cua
const SLOT_FEET = 182;          // terra on trepitgen els clients
const DINER_DX = 13;
const DOOR = { x: 176, y: 254 };  // l'entrada, a baix de tot (fora de plans)
const WALK_SPEED = 64;            // píxels per segon caminant

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif';

let canvas = null;
let ctx = null;
let sheets = null;
let chars = null;
// L'estat del joc i el de la interacció (què s'arrossega, quin menú hi ha obert).
let current = { state: null, ui: {} };

// On és cada grup ara mateix (id del grup → posició i pas de caminar), i els
// que ja han marxat de la cua i encara estan sortint per la porta.
const walkers = new Map();
let leaving = [];
let lastFrame = 0;

// --- Càrrega ---

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No s'ha pogut carregar ${src}`));
    img.src = src;
  });
}

export async function initScene(el) {
  canvas = el;
  canvas.width = SCENE_W * SCALE;
  canvas.height = SCENE_H * SCALE;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE);

  const names = Object.keys(SHEETS);
  const loaded = await Promise.all(names.map(n => loadImage(SHEETS[n])));
  sheets = Object.fromEntries(names.map((n, i) => [n, loaded[i]]));
  chars = await Promise.all(
    Array.from({ length: CHAR_COUNT }, (_, i) => loadImage(charSrc(i)))
  );

  requestAnimationFrame(loop);
}

// La UI ens passa l'estat del joc i el de la interacció; el bucle propi
// redibuixa per animar.
export function renderScene(state, ui = {}) {
  current = { state, ui };
}

function loop(t) {
  if (ctx && current.state) draw(current.state, current.ui, t);
  requestAnimationFrame(loop);
}

// --- Dibuix de peces ---

function sprite(name, x, y, variant = 0) {
  const [sheet, sx, sy, w, h] = SPRITES[name];
  ctx.drawImage(sheets[sheet], sx + variant * w, sy, w, h, x, y, w, h);
}

function character(look, x, feet, dir, frame) {
  const img = chars[look % CHAR_COUNT];
  shadow(x, feet);
  ctx.drawImage(img, frame * CHAR_W, dir * CHAR_H, CHAR_W, CHAR_H,
    Math.round(x - CHAR_W / 2), Math.round(feet - CHAR_H), CHAR_W, CHAR_H);
}

function shadow(x, feet) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, feet - 1, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function bubble(x, bottom, emoji, tone) {
  const w = 20, h = 18;
  const left = x - w / 2, top = bottom - h;
  ctx.save();
  ctx.fillStyle = tone;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(left, top, w, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();            // punxa cap al cap del client
  ctx.moveTo(x - 3, bottom - 1);
  ctx.lineTo(x, bottom + 3);
  ctx.lineTo(x + 3, bottom - 1);
  ctx.closePath();
  ctx.fill();
  ctx.font = `13px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, top + h / 2 + 1);
  ctx.restore();
}

// --- Dibuix de l'escena ---

function draw(state, ui, t) {
  const dt = Math.min((t - lastFrame) / 1000, 0.1);   // el primer fotograma i les pestanyes de fons no donen salts
  lastFrame = t;
  walk(state, dt);

  const drag = ui.drag ?? null;
  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  drawRoom();
  drawKitchen(state, t);
  drawHallProps();
  for (let x = 0; x < SCENE_W; x += 32) sprite('counter', x, COUNTER_Y);
  drawPass(state, drag);
  drawDirty(state, drag);
  drawQueue(state, drag, t);
  if (ui.menu !== null && ui.menu !== undefined) drawDishMenu(ui, t);
  if (drag) drawHeldPlate(drag);
}

function drawRoom() {
  for (let x = 0; x < SCENE_W; x += TILE) {
    sprite('wallBrick', x, 0, (x / TILE) % WALL_VARIANTS);
  }
  for (let y = WALL_H; y < FLOOR_SPLIT; y += TILE) {
    for (let x = 0; x < SCENE_W; x += TILE) sprite('floorKitchen', x, y);
  }
  for (let y = FLOOR_SPLIT; y < SCENE_H; y += TILE) {
    for (let x = 0; x < SCENE_W; x += TILE) sprite('floorHall', x, y);
  }
  sprite('window', 176, 8);
  sprite('window', 248, 8);
  sprite('poster', 310, 14);
}

function drawKitchen(state, t) {
  sprite('kitchenBlock', KITCHEN_BLOCK.x, KITCHEN_BLOCK.y);
  sprite('fridge', FRIDGE.x, FRIDGE.y);
  sprite('sink', SINK.x, SINK.y);

  state.bbqs.forEach((bbq, i) => {
    const x = GRILL.x0 + i * GRILL.dx;
    sprite(bbq ? 'grillOn' : 'grillOff', x, GRILL.y);
    if (bbq) {
      const pct = Math.max(0, Math.min(1, (bbq.total - bbq.remaining) / bbq.total));
      progressBar(x + 2, GRILL.y - 9, 28, 5, pct);
      bubble(x + 16, GRILL.y - 12, DISHES[bbq.dish].emoji, 'rgba(255, 236, 200, 0.95)');
    }
  });

  // el cuiner treballa: fotograma que va canviant
  const frame = Math.floor(t / 260) % 3;
  character(COOK.look, COOK.x, COOK.feet, DIR.up, frame);

  drawStaff(state, t);
  drawCapacityWarning(state);
}

// El personal contractat es veu a la seva zona de feina.
function drawStaff(state, t) {
  STAFF_IDS.forEach((role, r) => {
    const { look, dir, spots } = STAFF_SPOTS[role];
    for (let i = 0; i < state.staff[role]; i++) {
      const spot = spots[i % spots.length];
      character(look, spot.x, spot.feet, dir, idleFrame(t, r * 5 + i));
    }
  });
}

// Amb massa plats bruts, al local hi caben menys clients.
function drawCapacityWarning(state) {
  const lost = CONFIG.queueMax - queueCapacity(state);
  if (lost <= 0) return;
  const text = lost >= CONFIG.queueMax ? 'ple de plats bruts!' : `−${lost} client${lost > 1 ? 's' : ''}`;

  ctx.save();
  ctx.font = '8px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(168, 48, 36, 0.92)';
  ctx.beginPath();
  ctx.roundRect(DIRTY.x + 44, 100, w, 13, 4);
  ctx.fill();
  ctx.fillStyle = '#ffe9e2';
  ctx.textAlign = 'left';
  ctx.fillText(text, DIRTY.x + 50, 107);
  ctx.restore();
}

// --- Menú de la graella: què hi posem, hamburguesa o frankfurt ---

function grillBox(i) {
  const [, , , w, h] = SPRITES.grillOff;
  return { x: GRILL.x0 + i * GRILL.dx, y: GRILL.y, w, h };
}

function menuOptions(bbqIndex) {
  const center = grillBox(bbqIndex).x + SPRITES.grillOff[3] / 2;
  const width = DISH_IDS.length * 22;
  return DISH_IDS.map((dish, i) => ({
    dish,
    box: { x: center - width / 2 + i * 22 + 1, y: GRILL.y - 28, w: 20, h: 20 },
  }));
}

function drawDishMenu(ui, t) {
  const options = menuOptions(ui.menu);
  const first = options[0].box;
  const last = options[options.length - 1].box;

  ctx.save();
  ctx.fillStyle = 'rgba(28, 20, 16, 0.92)';
  ctx.strokeStyle = 'rgba(216, 176, 43, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(first.x - 4, first.y - 4, (last.x + last.w) - first.x + 8, first.h + 8, 6);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();                        // punxa cap a la graella
  const tip = (first.x + last.x + last.w) / 2;
  ctx.moveTo(tip - 4, first.y + first.h + 3);
  ctx.lineTo(tip, first.y + first.h + 8);
  ctx.lineTo(tip + 4, first.y + first.h + 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  for (const option of options) {
    const over = ui.pointer && inBox(ui.pointer.x, ui.pointer.y, option.box);
    ctx.save();
    ctx.fillStyle = over ? '#d8b02b' : 'rgba(246, 240, 230, 0.92)';
    ctx.beginPath();
    ctx.roundRect(option.box.x, option.box.y, option.box.w, option.box.h, 4);
    ctx.fill();
    ctx.font = `14px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(DISHES[option.dish].emoji, option.box.x + option.box.w / 2, option.box.y + option.box.h / 2 + 1);
    ctx.restore();
  }
}

function inBox(x, y, b) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

function progressBar(x, y, w, h, pct) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 8, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 2);
  ctx.fill();
  ctx.fillStyle = '#e8862b';
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, Math.max(0, (w - 2) * pct), h - 2, 1.5);
  ctx.fill();
  ctx.restore();
}

// Els plats cuinats esperen al taulell, a la vista (banda de cuina).
// El que s'està arrossegant no es dibuixa aquí: va enganxat al dit/ratolí.
function drawPass(state, drag) {
  const held = drag && drag.kind === 'ready' ? drag.index : -1;
  state.readyPlates.slice(0, PASS.max).forEach((dish, i) => {
    if (i === held) return;
    plate(platePos(i).x, PASS.y, dish, false);
  });
}

function platePos(i) {
  return { x: PASS.x + i * PASS.dx, y: PASS.y };
}

function plate(x, y, dish, lifted) {
  ctx.save();
  if (lifted) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = lifted ? '#fff6e0' : '#efe7dc';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = `13px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(DISHES[dish].emoji, x, y);
  ctx.restore();
}

// Els clients deixen els plats bruts al taulell; van a la pica arrossegant-los.
function drawDirty(state, drag) {
  const held = drag && drag.kind === 'dirty' ? drag.index : -1;
  state.dirtyPlates.forEach((dish, i) => {
    if (i === held) return;
    const p = dirtyPos(i);
    dirtySprite(p.x, p.y, i);
  });
  if (drag && drag.kind === 'dirty') markSink(drag);
}

function dirtyPos(i) {
  return { x: DIRTY.x + i * DIRTY.dx, y: DIRTY.y };
}

function dirtySprite(x, y, i) {
  const [, , , w, h] = SPRITES[i % 2 ? 'dirtyPlateB' : 'dirtyPlate'];
  sprite(i % 2 ? 'dirtyPlateB' : 'dirtyPlate', Math.round(x - w / 2), Math.round(y - h / 2));
}

// La pica s'encén quan hi portes un plat brut a sobre.
function markSink(drag) {
  const over = overSink(drag.x, drag.y);
  ctx.save();
  ctx.strokeStyle = over ? 'rgba(120, 200, 255, 1)' : 'rgba(120, 200, 255, 0.5)';
  ctx.fillStyle = over ? 'rgba(120, 200, 255, 0.25)' : 'rgba(120, 200, 255, 0.08)';
  ctx.lineWidth = over ? 2.5 : 1.5;
  if (!over) ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.roundRect(SINK.x, SINK.y, SPRITES.sink[3], SPRITES.sink[4], 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function overSink(x, y) {
  return x >= SINK.x && x <= SINK.x + SPRITES.sink[3]
    && y >= SINK.y && y <= SINK.y + SPRITES.sink[4];
}

function drawHeldPlate(drag) {
  if (drag.kind === 'dirty') {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(drag.x, drag.y + 8, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    dirtySprite(drag.x, drag.y, drag.index);
    return;
  }
  plate(drag.x, drag.y, drag.dish, true);
}

function drawHallProps() {
  sprite('rug', 144, 198);
  sprite('chair', 12, 194);
  sprite('table', 30, 190);
  sprite('chair', 64, 194, 1);
  sprite('chair', 280, 194);
  sprite('table', 298, 190);
  sprite('plantTall', 2, 134);
  sprite('plantSmall', 334, 136);
}

// --- Els clients van a peu ---
// Entren per la porta, van fins al seu lloc del taulell i, quan marxen, tornen
// a sortir per la porta. Aquí només hi ha el moviment: quan un grup marxa de
// debò ho decideix la lògica del joc.

function walk(state, dt) {
  const present = new Set();

  state.queue.forEach((group, gi) => {
    present.add(group.id);
    let w = walkers.get(group.id);
    if (!w) {
      w = { x: DOOR.x, y: DOOR.y, dir: DIR.up, step: 0, moving: true };
      walkers.set(group.id, w);
    }
    w.diners = group.diners;   // per si marxa i l'hem de seguir dibuixant
    step(w, SLOT_X[gi] ?? SLOT_X[SLOT_X.length - 1], SLOT_FEET, dt);
  });

  for (const [id, w] of walkers) {
    if (!present.has(id)) {
      leaving.push(w);
      walkers.delete(id);
    }
  }

  leaving = leaving.filter(w => !step(w, DOOR.x, DOOR.y, dt));
}

// Acosta el grup al seu destí. Retorna cert quan ja hi és.
function step(w, tx, ty, dt) {
  const dx = tx - w.x;
  const dy = ty - w.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) {
    w.x = tx;
    w.y = ty;
    w.moving = false;
    return true;
  }
  const d = Math.min(dist, WALK_SPEED * dt);
  w.x += (dx / dist) * d;
  w.y += (dy / dist) * d;
  w.step += d;
  w.moving = true;
  w.dir = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? DIR.up : DIR.down) : DIR.side;
  return false;
}

function drawQueue(state, drag, t) {
  for (const w of leaving) drawGroupAt(w, w.diners, null, t);

  state.queue.forEach((group, gi) => {
    const w = walkers.get(group.id);
    if (!w) return;
    const wanted = drag && drag.kind === 'ready' && group.diners.some(
      d => d.status === 'waiting' && d.dish === drag.dish
    );
    if (wanted) highlightGroup(group, w, t, overGroup(drag, group, w));
    drawGroupAt(w, group.diners, gi, t);
    if (!w.moving) drawGroupTimer(group, w);
  });
}

// El crono de la propina mentre esperen, i el que han pagat quan ja mengen.
function drawGroupTimer(group, w) {
  const y = w.y - CHAR_H - 26;

  if (group.leaveTimer !== null) {
    if (!group.paid) return;
    const text = `+${group.paid} € ×${group.factor.toFixed(1)}`;
    ctx.save();
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.85)';
    ctx.strokeText(text, w.x, y + 3);
    ctx.fillStyle = group.factor > 1.05 ? '#ffd45e' : '#f4ece4';
    ctx.fillText(text, w.x, y + 3);
    ctx.restore();
    return;
  }

  const factor = tipFactor(group.waitTime);
  const left = (factor - 1) / (CONFIG.tip.max - 1);      // 1 = acabat d'arribar
  const width = 30;
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 8, 0.7)';
  ctx.beginPath();
  ctx.roundRect(w.x - width / 2, y, width, 5, 2);
  ctx.fill();
  ctx.fillStyle = left > 0.6 ? '#57c26a' : left > 0.25 ? '#e8b62b' : '#d8542b';
  ctx.beginPath();
  ctx.roundRect(w.x - width / 2 + 1, y + 1, Math.max(0, (width - 2) * left), 3, 1.5);
  ctx.fill();
  ctx.restore();
}

function drawGroupAt(w, diners, gi, t) {
  diners.forEach((diner, di) => {
    const x = w.x + dinerOffset(di, diners.length);
    const served = diner.status === 'served';
    const dir = w.moving ? w.dir : (served ? DIR.down : (di === 0 ? DIR.up : DIR.side));
    const frame = w.moving
      ? walkFrame(w.step + di * 5)
      : (served ? FRAME_IDLE : idleFrame(t, (gi ?? 0) * 3 + di));
    character(lookOf(diner, di), x, w.y, dir, frame);
    if (!w.moving) {
      bubble(
        x, w.y - CHAR_H - 3,
        served ? '😋' : DISHES[diner.dish].emoji,
        served ? 'rgba(190, 236, 180, 0.95)' : 'rgba(246, 240, 230, 0.95)'
      );
    }
  });
}

function walkFrame(distance) {
  return [0, FRAME_IDLE, 2, FRAME_IDLE][Math.floor(distance / 6) % 4];
}

// La llavor del client (0..1) tria quin dels 40 sprites li toca.
function lookOf(diner, fallback) {
  return diner.look === undefined ? fallback : Math.floor(diner.look * CHAR_COUNT);
}

// Petita vida: de tant en tant fan un pas (no és una cua de maniquís).
function idleFrame(t, seed) {
  const phase = (t / 900 + seed * 0.37) % 4;
  return phase < 3 ? FRAME_IDLE : (seed % 2 === 0 ? 0 : 2);
}

function dinerOffset(i, total) {
  return total === 1 ? 0 : (i - (total - 1) / 2) * (DINER_DX * 2);
}

function groupBox(group, w) {
  const half = (group.diners.length * DINER_DX) + 8;
  return { x: w.x - half, y: w.y - CHAR_H - 24, w: half * 2, h: CHAR_H + 28 };
}

function overGroup(drag, group, w) {
  return inBox(drag.x, drag.y, groupBox(group, w));
}

// Marca els clients que volen el plat que portes; si hi ets a sobre, s'omple.
function highlightGroup(group, w, t, over) {
  const b = groupBox(group, w);
  const pulse = 0.75 + 0.25 * Math.sin(t / 220);
  ctx.save();
  ctx.fillStyle = over ? 'rgba(216, 176, 43, 0.22)' : 'rgba(216, 176, 43, 0.08)';
  ctx.strokeStyle = `rgba(216, 176, 43, ${over ? 1 : pulse.toFixed(3)})`;
  ctx.lineWidth = over ? 2.5 : 1.5;
  if (!over) ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Mapa de punters: què hi ha en aquest punt de la pantalla ---

// Coordenades del punter dins de l'escena (el canvas es mostra escalat).
export function toScene(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (SCENE_W / r.width),
    y: (clientY - r.top) * (SCENE_H / r.height),
  };
}

// Què hi ha per clicar en aquest punt. Retorna:
//   { type: 'dish', bbq, dish }   opció del menú de la graella
//   { type: 'close' }             clic fora amb el menú obert
//   { type: 'plate', kind, dish, index }  un plat per agafar (llest o brut)
//   { type: 'grill', index }      una graella lliure
export function hotspotAt(clientX, clientY) {
  if (!canvas || !current.state) return null;
  const { x, y } = toScene(clientX, clientY);
  const state = current.state;

  const open = current.ui.menu;
  if (open !== null && open !== undefined) {
    for (const option of menuOptions(open)) {
      if (inBox(x, y, option.box)) return { type: 'dish', bbq: open, dish: option.dish };
    }
    return { type: 'close' };
  }

  const ready = state.readyPlates.slice(0, PASS.max);
  for (let i = ready.length - 1; i >= 0; i--) {
    const p = platePos(i);
    if (Math.abs(x - p.x) <= 9 && Math.abs(y - p.y) <= 9) {
      return { type: 'plate', kind: 'ready', dish: ready[i], index: i };
    }
  }

  for (let i = state.dirtyPlates.length - 1; i >= 0; i--) {
    const p = dirtyPos(i);
    if (Math.abs(x - p.x) <= 9 && Math.abs(y - p.y) <= 8) {
      return { type: 'plate', kind: 'dirty', dish: state.dirtyPlates[i], index: i };
    }
  }

  for (let i = 0; i < state.bbqs.length; i++) {
    if (state.bbqs[i]) continue;                  // ocupada: ja està coent
    if (inBox(x, y, grillBox(i))) return { type: 'grill', index: i };
  }
  return null;
}

// On cauria el que estem arrossegant: el client que vol el plat, o la pica.
export function dropTargetAt(clientX, clientY, kind) {
  if (!canvas || !current.state) return null;
  const { x, y } = toScene(clientX, clientY);

  if (kind === 'dirty') return overSink(x, y) ? { type: 'sink' } : null;

  const queue = current.state.queue;
  for (let i = 0; i < queue.length; i++) {
    const w = walkers.get(queue[i].id);
    if (w && inBox(x, y, groupBox(queue[i], w))) return { type: 'group', index: i };
  }
  return null;
}
