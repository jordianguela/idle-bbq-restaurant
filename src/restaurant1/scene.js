// Escena del restaurant: pinta l'estat del joc amb els sprites (canvas 2D).
// No toca la lògica: rep l'estat i el dibuixa. Les interaccions només fan de
// "mapa" (quin grup hi ha sota el ratolí) i qui decideix segueix sent la UI.
import {
  SHEETS, SPRITES, TILE, WALL_VARIANTS,
  CHAR_W, CHAR_H, CHAR_COUNT, FRAME_IDLE, DIR, charSrc,
} from './sprites.js';
import { DISHES } from './definitions.js';

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
const PASS = { x: 200, y: 110, dx: 17, max: 8 };   // on es deixen els plats llestos
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
let current = { state: null, drag: null };

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

// La UI ens passa l'estat i el plat que s'estigui arrossegant; el bucle propi
// redibuixa per animar.
export function renderScene(state, drag = null) {
  current = { state, drag };
}

function loop(t) {
  if (ctx && current.state) draw(current.state, current.drag, t);
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

function draw(state, drag, t) {
  const dt = Math.min((t - lastFrame) / 1000, 0.1);   // el primer fotograma i les pestanyes de fons no donen salts
  lastFrame = t;
  walk(state, dt);

  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  drawRoom();
  drawKitchen(state, t);
  drawHallProps();
  for (let x = 0; x < SCENE_W; x += 32) sprite('counter', x, COUNTER_Y);
  drawPass(state, drag);
  drawQueue(state, drag, t);
  if (drag) plate(drag.x, drag.y, drag.dish, true);
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
  state.readyPlates.slice(0, PASS.max).forEach((dish, i) => {
    if (drag && drag.index === i) return;
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
    const wanted = drag && group.diners.some(
      d => d.status === 'waiting' && d.dish === drag.dish
    );
    if (wanted) highlightGroup(group, w, t, overGroup(drag, group, w));
    drawGroupAt(w, group.diners, gi, t);
  });
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
  const b = groupBox(group, w);
  return drag.x >= b.x && drag.x <= b.x + b.w && drag.y >= b.y && drag.y <= b.y + b.h;
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

// Quin plat del taulell s'agafa des d'aquest punt.
export function plateAt(clientX, clientY) {
  if (!canvas || !current.state) return null;
  const { x, y } = toScene(clientX, clientY);
  const plates = current.state.readyPlates.slice(0, PASS.max);
  for (let i = plates.length - 1; i >= 0; i--) {
    const p = platePos(i);
    if (Math.abs(x - p.x) <= 9 && Math.abs(y - p.y) <= 9) {
      return { dish: plates[i], index: i };
    }
  }
  return null;
}

export function groupAt(clientX, clientY) {
  if (!canvas || !current.state) return null;
  const { x, y } = toScene(clientX, clientY);
  const queue = current.state.queue;
  for (let i = 0; i < queue.length; i++) {
    const w = walkers.get(queue[i].id);
    if (!w) continue;
    const b = groupBox(queue[i], w);
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i;
  }
  return null;
}
