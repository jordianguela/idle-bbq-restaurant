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
const PASS = { x: 200, y: 110 };   // on es deixen els plats llestos
const SLOT_X = [58, 176, 294];  // centre de cada grup de la cua
const SLOT_FEET = 182;          // terra on trepitgen els clients
const DINER_DX = 13;

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif';

let canvas = null;
let ctx = null;
let sheets = null;
let chars = null;
let current = { state: null, selectedDish: null };

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

// La UI ens passa l'estat; el bucle propi redibuixa per animar.
export function renderScene(state, selectedDish) {
  current = { state, selectedDish };
}

function loop(t) {
  if (ctx && current.state) draw(current.state, current.selectedDish, t);
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

function draw(state, selectedDish, t) {
  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  drawRoom();
  drawKitchen(state, t);
  drawHallProps();
  for (let x = 0; x < SCENE_W; x += 32) sprite('counter', x, COUNTER_Y);
  drawPass(state, selectedDish);
  drawQueue(state, selectedDish, t);
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
function drawPass(state, selectedDish) {
  const plates = state.readyPlates.slice(0, 8);
  plates.forEach((dish, i) => {
    const x = PASS.x + i * 17;
    const y = PASS.y;
    ctx.save();
    ctx.fillStyle = dish === selectedDish ? '#d8b02b' : '#efe7dc';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `13px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(DISHES[dish].emoji, x, y);
    ctx.restore();
  });
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

function drawQueue(state, selectedDish, t) {
  state.queue.forEach((group, gi) => {
    const cx = SLOT_X[gi];
    if (cx === undefined) return;
    const wanted = selectedDish && group.diners.some(
      d => d.status === 'waiting' && d.dish === selectedDish
    );
    if (wanted) highlightGroup(group, cx, t);

    group.diners.forEach((diner, di) => {
      const x = cx + dinerOffset(di, group.diners.length);
      const served = diner.status === 'served';
      const dir = served ? DIR.down : (di === 0 ? DIR.up : DIR.side);
      const frame = served ? FRAME_IDLE : idleFrame(t, gi * 3 + di);
      character(lookOf(diner, gi * 2 + di), x, SLOT_FEET, dir, frame);
      bubble(
        x, SLOT_FEET - CHAR_H - 3,
        served ? '😋' : DISHES[diner.dish].emoji,
        served ? 'rgba(190, 236, 180, 0.95)' : 'rgba(246, 240, 230, 0.95)'
      );
    });
  });
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

function highlightGroup(group, cx, t) {
  const half = (group.diners.length * DINER_DX) + 8;
  const pulse = 0.55 + 0.45 * Math.sin(t / 220);
  ctx.save();
  ctx.strokeStyle = `rgba(216, 176, 43, ${pulse.toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.roundRect(cx - half, SLOT_FEET - CHAR_H - 24, half * 2, CHAR_H + 28, 6);
  ctx.stroke();
  ctx.restore();
}

// --- Mapa de clics: quin grup hi ha en aquest punt de la pantalla ---

export function groupAt(clientX, clientY) {
  if (!canvas || !current.state) return null;
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (SCENE_W / r.width);
  const y = (clientY - r.top) * (SCENE_H / r.height);
  if (y < SLOT_FEET - CHAR_H - 24 || y > SLOT_FEET + 6) return null;
  for (let i = 0; i < current.state.queue.length; i++) {
    const cx = SLOT_X[i];
    if (cx === undefined) continue;
    const half = (current.state.queue[i].diners.length * DINER_DX) + 8;
    if (x >= cx - half && x <= cx + half) return i;
  }
  return null;
}
