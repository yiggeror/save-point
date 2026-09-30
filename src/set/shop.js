// The item shop — the film's only set, seen as a fixed 320×180 wide shot the way a 16-bit RPG draws a room.
//
// Layout (shared by every design option, so the storyboard holds whichever is chosen):
//   back wall, left → right: the door (with its bell) · the bench · the clock · the window (the world, the tower) ·
//   the shield with its price tag · the counter with a lifting flap at its left end · shelves and drawers behind.
// Depth uses the set's oblique projection (kit.P): X right, Y up, Z toward the camera; the back wall stands at Z = 0.
import { Surface, NOLIGHT, EMIT, bayer } from '../pix/gfx.js';
import { R, RX, rnd, P, K, FLOOR, planks, bevel, tag, bottle, books, scroll, digits } from './kit.js';
import { drawOutside } from './outside.js';
import { drawView } from './view.js';
import { lightPoly, lightRadial } from './light.js';

// ------------------------------------------------------------------ palettes per design option
function palettes(opt) {
  const common = {
    ink: RX('shop.ink', ['#2a1d1e'])[0],
    glass: R('shop.glass', '#a9c6d6', 6, { lo: 0.42, hi: 0.97, cool: 250 }),
    cork: R('shop.cork', '#b98a58', 6),
    paper: R('shop.paper', '#eadcb8', 6, { lo: 0.5, hi: 0.97 }),
    red: R('shop.red', '#c2413d', 6, { cool: 330 }), blue: R('shop.blue', '#3f6fc0', 6), green: R('shop.green', '#4f9a52', 6, { cool: 200, warm: 95 }),
    purple: R('shop.purple', '#8a55b0', 6), amber: R('shop.amber', '#e0a03a', 6, { cool: 20 }), teal: R('shop.teal', '#3f9a9a', 6),
    gold: R('shop.gold', '#e0b040', 6, { cool: 20, shift: 0.3 }), brass: R('shop.brass', '#c79a45', 6, { cool: 20, shift: 0.3 }),
    iron: R('shop.iron', '#6f7580', 6, { cool: 260 }), steel: R('shop.steel', '#aab4c2', 6, { cool: 250, hi: 0.97 }),
    leather: R('shop.leather', '#8a5530', 6), cloth: R('shop.cloth', '#b8523e', 6, { cool: 330 }), cream: R('shop.cream', '#e8dcc0', 6, { lo: 0.45, hi: 0.97 }),
    leaf: R('shop.leaf', '#5a9a4a', 6, { cool: 200, warm: 95, shift: 0.35 }), pot: R('shop.pot', '#c0703f', 6, { cool: 10 }),
    flame: RX('shop.flame', ['#b8401e', '#f08a2a', '#ffd060', '#fff4c8'], EMIT),
    candle: R('shop.candle', '#efe6cf', 5, { lo: 0.55, hi: 0.97 }),
    apple: R('shop.apple', '#d0443a', 6, { cool: 330 }), sack: R('shop.sack', '#c8a878', 6, { lo: 0.36 }),
    outdoor: R('shop.outdoor', '#d8c49a', 6, { lo: 0.5, hi: 0.95 }),
  };
  common.ink2 = common.ink;
  const A = {
    wall: R('A.wall', '#a4805c', 7, { lo: 0.3, hi: 0.78, at: 3, cool: 300, shift: 0.22 }),
    wain: R('A.wain', '#5e4c40', 7, { lo: 0.2, hi: 0.6, at: 3, cool: 280, shift: 0.22 }),
    beam: R('A.beam', '#4e342a', 6, { lo: 0.16, hi: 0.52, cool: 320, shift: 0.25 }),
    floor: R('A.floor', '#8c5c3c', 7, { lo: 0.26, hi: 0.72, at: 3, cool: 320, shift: 0.25 }),
    trim: R('A.trim', '#c49a66', 6, { lo: 0.34, hi: 0.88, cool: 320, shift: 0.25 }),
    counter: R('A.counter', '#8c4a30', 7, { lo: 0.22, hi: 0.72, at: 3, cool: 330, shift: 0.25 }),
    rug: R('A.rug', '#a8453c', 6, { cool: 330 }), rug2: R('A.rug2', '#2f4f78', 6), rug3: R('A.rug3', '#e0c48a', 6, { lo: 0.4 }),
    curtain: R('A.curtain', '#5e7d4e', 6, { cool: 200, warm: 95 }),
  };
  const B = {
    wall: R('B.wall', '#e2d6bd', 7, { lo: 0.5, hi: 0.95, at: 4, cool: 250, shift: 0.3 }),
    wain: R('B.wain', '#4f6e5c', 7, { lo: 0.22, hi: 0.66, at: 3, cool: 250, shift: 0.25 }),
    beam: R('B.beam', '#4a3228', 6, { lo: 0.16, hi: 0.52, cool: 330, shift: 0.25 }),
    floor: R('B.floor', '#8f8a86', 7, { lo: 0.3, hi: 0.78, at: 3, cool: 260, shift: 0.2 }),
    trim: R('B.trim', '#5f7f6a', 6, { lo: 0.26, hi: 0.72, cool: 250, shift: 0.25 }),
    counter: R('B.counter', '#6f4a36', 7, { lo: 0.22, hi: 0.7, at: 3, cool: 330, shift: 0.25 }),
    rug: R('B.rug', '#7a3a58', 6, { cool: 300 }), rug2: R('B.rug2', '#d8a04a', 6), rug3: R('B.rug3', '#ead8b0', 6, { lo: 0.4 }),
    curtain: R('B.curtain', '#9a4a3e', 6, { cool: 330 }),
  };
  const C = {
    wall: R('C.wall', '#3f6a70', 7, { lo: 0.22, hi: 0.66, at: 3, cool: 260, shift: 0.25 }),
    wain: R('C.wain', '#5a3a36', 7, { lo: 0.2, hi: 0.6, at: 3, cool: 330, shift: 0.25 }),
    beam: R('C.beam', '#3e2c2a', 6, { lo: 0.14, hi: 0.5, cool: 330, shift: 0.25 }),
    floor: R('C.floor', '#7a5038', 7, { lo: 0.24, hi: 0.66, at: 3, cool: 330, shift: 0.25 }),
    trim: R('C.trim', '#c49a52', 6, { lo: 0.34, hi: 0.86, cool: 20, shift: 0.3 }),
    counter: R('C.counter', '#7c3f36', 7, { lo: 0.2, hi: 0.66, at: 3, cool: 330, shift: 0.25 }),
    rug: R('C.rug', '#c47a3a', 6, { cool: 20 }), rug2: R('C.rug2', '#2d5a5a', 6), rug3: R('C.rug3', '#e8d0a0', 6, { lo: 0.4 }),
    curtain: R('C.curtain', '#8a3e52', 6, { cool: 300 }),
  };
  return { ...common, ...({ A, B, C }[opt]) };
}

// ------------------------------------------------------------------ the layout
export const LAYOUT = {
  door: { x: 14, y: 50, w: 36, h: 74 },
  bench: { x: 56, x1: 106, seatY: 16, z0: 2, z1: 11 },
  clock: { x: 84, y: 54 },
  window: { x: 118, y: 30, w: 70, h: 62 },
  shield: { x: 205, y: 46 },
  barrel: { x: 289, z: 27 },
  counter: { x0: 212, x1: 308, z0: 40, z1: 56, h: 22, flap: 16 },
  keeperZ: 34, heroSpot: { x: 196, z: 64 },
};

// ------------------------------------------------------------------ draw
/**
 * Draw the shop into S (320×180).
 * o: { opt: 'A'|'B'|'C', hour, t, door (0 closed … 1 open), towerFlash, layer: 'back'|'front'|'all' }
 * 'back' draws everything behind the counter (the shopkeeper stands between), 'front' the counter and foreground.
 */
export function drawShop(S, o = {}) {
  const opt = o.opt || 'A', pal = palettes(opt), L = LAYOUT, t = o.t ?? 0, hour = o.hour ?? 7.2;
  const layer = o.layer || 'all';
  if (layer !== 'front') {
    wall(S, pal, opt);
    windowView(S, pal, opt, hour, t, o);
    door(S, pal, opt, o.door ?? 0, hour, t);
    ceiling(S, pal, opt, t);
    floor(S, pal, opt);
    bench(S, pal, opt);
    clock(S, pal, opt, o.clock ?? hour, t);
    wallItems(S, pal, opt, t);
    shelves(S, pal, opt, t);
    backCabinet(S, pal, opt, t, hour);
    barrel(S, pal, opt);
  }
  if (layer !== 'back') {
    counter(S, pal, opt, t, o);
    if (o.candle) candle(S, pal, o.candle, t);
    foreground(S, pal, opt);
  }
  return pal;
}

/** the candle on the counter: len 1 = new, 0 = burnt down; lit or not */
export const CANDLE = { X: 238, Z: 47 };
function candle(S, pal, c, t) {
  const [x, yb] = P(CANDLE.X, LAYOUT.counter.h, CANDLE.Z), y = Math.round(yb);
  S.curZ = CANDLE.Z;
  // brass saucer with a ring handle
  S.hline(x - 3, x + 3, y, pal.brass[2]); S.hline(x - 2, x + 2, y - 1, pal.brass[4]); S.set(x + 4, y - 1, pal.brass[3]); S.set(x + 5, y - 2, pal.brass[2]); S.set(x + 4, y - 3, pal.brass[3]);
  const h = Math.max(1, Math.round(2 + (c.len ?? 1) * 9));
  S.rect(x - 1, y - 1 - h, 3, h, pal.candle[3]); S.vline(x - 1, y - h, y - 2, pal.candle[4]); S.vline(x + 1, y - h, y - 2, pal.candle[2]);
  // a drip of wax
  if ((c.len ?? 1) < 0.8) { S.set(x + 1, y - h + 1, pal.candle[4]); S.set(x + 1, y - h + 2, pal.candle[3]); S.set(x - 2, y - 1, pal.candle[3]); }
  S.set(x, y - 2 - h, pal.ink);
  if (c.lit) {
    const f = Math.floor(t * 10) % 4, sway = [0, 1, 0, -1][f];
    S.set(x, y - 3 - h, pal.flame[2]); S.set(x, y - 4 - h, pal.flame[3]); S.set(x + (sway > 0 ? 1 : 0), y - 5 - h, pal.flame[2]);
    S.set(x - 1, y - 3 - h, pal.flame[1]); S.set(x + 1, y - 3 - h, pal.flame[1]);
    if (f % 2 === 0) S.set(x + sway, y - 6 - h, pal.flame[1]);
  }
  S.curZ = null;
  return [x, y - 4 - h];
}

/** local light for the time of day: the sunbeam through the window, the door, the candle */
export function shopLight(S, o = {}) {
  const hour = o.hour ?? 7.2, L = LAYOUT, W = L.window;
  const t = o.t ?? 0;
  if (hour > 6.2 && hour < 18.6) {
    // the sun: from the east (screen left) in the morning to the west in the evening; always coming in toward us
    const u = (hour - 6.2) / (18.6 - 6.2);
    const dx = (0.9 - u * 1.8), dz = 1.25, dy = 0.55 + Math.sin(u * Math.PI) * 0.9;
    const strength = hour < 7 || hour > 17.8 ? 1 : 2;
    const Y0 = FLOOR - (W.y + W.h), Y1 = FLOOR - W.y;           // window bottom/top heights above the floor
    const foot = (X, Y) => { const s = Y / dy; return P(X + dx * s, 0, dz * s); };
    const a = foot(W.x + 3, Y0), b = foot(W.x + W.w - 3, Y0), c = foot(W.x + W.w - 3, Y1 - 4), d = foot(W.x + 3, Y1 - 4);
    const onFloor = (x, y) => y >= FLOOR;
    lightPoly(S, [a, b, c, d].map(([x, y]) => [x, Math.min(179, y)]), strength, { soft: 1.5, cls: 2, only: (x, y) => y >= FLOOR - 1 && !S.fig?.[y * S.w + x] });
    // the beam through the air: one step, from the window down to its patch on the floor
    lightPoly(S, [[W.x + 4, W.y + W.h], [W.x + W.w - 4, W.y + W.h], b, a], 1, { soft: 3, cls: 2 });
    return { patch: [a, b, c, d], dx, dy, dz };
  }
  if (o.candle?.lit) {
    const [x, yb] = P(CANDLE.X, LAYOUT.counter.h, CANDLE.Z);
    const h = Math.round(2 + (o.candle.len ?? 1) * 9), fy = Math.round(yb) - 5 - h;
    const flick = 1 + Math.sin((o.t ?? 0) * 13) * 0.03 + Math.sin((o.t ?? 0) * 7.3) * 0.03;
    lightRadial(S, x + 0.5, fy, 78 * flick, 3.0, { cls: 1, squash: 1.15, clsAt: 0.34, band: 0.3, falloff: 0.9 });
  }
  return null;
}

// ------------------------------------------------------------------ pieces
function wall(S, pal, opt) {
  const L = LAYOUT;
  if (opt === 'B') {
    // whitewashed plaster between dark timber frames, green wainscot
    const rng = rnd(5);
    S.rect(0, 14, 320, FLOOR - 14, pal.wall[4]);
    for (let i = 0; i < 1400; i++) { const x = (rng() * 320) | 0, y = 14 + ((rng() * (FLOOR - 14)) | 0); S.set(x, y, pal.wall[rng() < 0.6 ? 3 : 5]); }
    for (let i = 0; i < 26; i++) { // cracks and worn patches showing the stone underneath
      let x = (rng() * 320) | 0, y = 20 + ((rng() * 70) | 0);
      for (let k = 0; k < 4 + rng() * 6; k++) { S.set(x, y, pal.wall[2]); x += rng() < 0.5 ? 1 : 0; y += 1; }
    }
    for (const x of [0, 108, 192, 316]) bevel(S, x, 14, 5, FLOOR - 14, pal.beam, 3, { left: true });
    for (const [x0, x1] of [[5, 108], [113, 192], [197, 316]]) { S.line(x0, 60, x1, 30, pal.beam[2]); S.line(x0, 61, x1, 31, pal.beam[3]); }
    wainscot(S, pal, 98);
  } else if (opt === 'C') {
    // painted teal boards, a stencilled border, dark wainscot
    planks(S, 0, 14, 320, FLOOR - 14, pal.wall, { dir: 'v', board: 11, seed: 21, lv: 3, nails: [18, 95] });
    for (let x = 0; x < 320; x += 8) { S.set(x + 3, 24, pal.trim[4]); S.set(x + 4, 23, pal.trim[3]); S.set(x + 4, 25, pal.trim[3]); S.set(x + 5, 24, pal.trim[4]); }
    S.hline(0, 319, 20, pal.trim[2]); S.hline(0, 319, 28, pal.trim[2]);
    wainscot(S, pal, 100);
  } else {
    planks(S, 0, 14, 320, FLOOR - 14, pal.wall, { dir: 'v', board: 10, seed: 11, lv: 3, nails: [18, 97] });
    wainscot(S, pal, 100);
    // posts of the timber frame
    for (const x of [108, 192]) bevel(S, x, 14, 6, FLOOR - 14, pal.beam, 3, { left: true });
  }
  // ambient occlusion where the wall meets the floor and the ceiling
  for (let x = 0; x < 320; x++) { S.set(x, FLOOR - 1, shade(S, x, FLOOR - 1, -1)); S.set(x, 14, shade(S, x, 14, -1)); S.set(x, 15, shade(S, x, 15, -1)); }
}
function shade(S, x, y, d) { const c = S.get(x, y); return c < 0 ? c : shiftIdx(c, d); }
import { shift as shiftIdx } from '../pix/gfx.js';

function wainscot(S, pal, y0) {
  S.rect(0, y0, 320, FLOOR - y0, pal.wain[3]);
  S.hline(0, 319, y0, pal.trim[4]); S.hline(0, 319, y0 + 1, pal.trim[3]); S.hline(0, 319, y0 + 2, pal.wain[1]);
  for (let x = 4; x < 320; x += 26) {
    // raised panels
    const w = 22, y1 = y0 + 5, h = FLOOR - y1 - 4;
    S.rect(x, y1, w, h, pal.wain[3]);
    S.hline(x, x + w - 1, y1, pal.wain[1]); S.vline(x, y1, y1 + h - 1, pal.wain[1]);
    S.hline(x + 1, x + w - 1, y1 + h - 1, pal.wain[5]); S.vline(x + w - 1, y1 + 1, y1 + h - 1, pal.wain[4]);
    S.rect(x + 2, y1 + 2, w - 4, h - 4, pal.wain[4]);
    S.rect(x + 3, y1 + 3, w - 6, h - 6, pal.wain[3]);
  }
  S.hline(0, 319, FLOOR - 2, pal.wain[5]); S.hline(0, 319, FLOOR - 3, pal.wain[2]);
}

function ceiling(S, pal, opt, t) {
  // joists and the main beam
  S.rect(0, 0, 320, 14, pal.beam[1]);
  for (let x = 6; x < 320; x += 22) { S.rect(x, 0, 8, 7, pal.beam[2]); S.hline(x, x + 7, 6, pal.beam[0]); S.vline(x, 0, 6, pal.beam[3]); }
  bevel(S, 0, 7, 320, 7, pal.beam, 3);
  for (let x = 0; x < 320; x += 3) if ((x * 7) % 5 === 0) S.set(x, 10, pal.beam[2]);
  // hanging herbs and garlic on the beam (they sway a little)
  const sway = (k) => Math.round(Math.sin(t * 0.7 + k) * 0.6);
  const herbs = [[32, 1], [40, 2], [47, 1], [248, 2], [262, 1], [276, 2]];
  herbs.forEach(([x, kind], i) => {
    const sw = sway(i);
    S.vline(x, 14, 17, pal.sack[1]);
    if (kind === 1) { // bundle of dried herbs
      for (let j = 0; j < 9; j++) for (let k = -1 - (j >> 2); k <= 1 + (j >> 2); k++) S.set(x + k + (j > 4 ? sw : 0), 18 + j, pal.leaf[(k + j) % 3 === 0 ? 1 : j < 3 ? 3 : 2]);
      S.hline(x - 1, x + 1, 18, pal.cloth[2]);
    } else {        // a string of garlic
      for (let j = 0; j < 3; j++) { const gy = 19 + j * 4, gx = x + (j % 2 ? 1 : -1) + sw * (j > 0); S.ellipse(gx + 0.5, gy + 0.5, 2, 2, pal.cream[3]); S.set(gx - 1, gy - 1, pal.cream[5]); S.set(gx + 1, gy + 1, pal.cream[1]); }
    }
  });
  // the lantern hanging from the beam (unlit by day)
  const lx = 156, ly = 14;
  S.vline(lx, ly, ly + 5, pal.iron[1]);
  S.rect(lx - 3, ly + 6, 7, 2, pal.iron[2]); S.rect(lx - 2, ly + 8, 5, 6, pal.glass[2]); S.rect(lx - 3, ly + 14, 7, 2, pal.iron[2]);
  S.vline(lx - 3, ly + 8, ly + 13, pal.iron[1]); S.vline(lx + 3, ly + 8, ly + 13, pal.iron[1]); S.set(lx - 1, ly + 9, pal.glass[5]);
  S.set(lx, ly + 11, pal.candle[3]); S.set(lx, ly + 12, pal.candle[2]);
}

function floor(S, pal, opt) {
  if (opt === 'B') {
    // flagstones in the oblique projection
    const rng = rnd(3);
    S.rect(0, FLOOR, 320, 180 - FLOOR, pal.floor[3]);
    let y = FLOOR, row = 0;
    const rows = [5, 6, 7, 8, 9, 10, 11, 12];
    while (y < 180) {
      const h = rows[Math.min(row, rows.length - 1)];
      let x = -((row * 13) % 24);
      while (x < 320) {
        const w = 22 + ((rng() * 12) | 0), lv = 3 + (rng() < 0.3 ? -1 : rng() < 0.3 ? 1 : 0);
        S.rect(x + 1, y + 1, w - 1, h - 1, pal.floor[lv]);
        S.hline(x + 1, x + w - 1, y + 1, pal.floor[lv + 1]);
        for (let k = 0; k < 3; k++) S.set(x + 2 + ((rng() * (w - 4)) | 0), y + 2 + ((rng() * Math.max(1, h - 3)) | 0), pal.floor[lv - 1]);
        S.vline(x, y, y + h - 1, pal.floor[1]);
        x += w;
      }
      S.hline(0, 319, y, pal.floor[1]);
      y += h; row++;
    }
  } else {
    planks(S, 0, FLOOR, 320, 180 - FLOOR, pal.floor, { dir: 'h', rows: [4, 4, 5, 5, 6, 6, 7, 7, 8, 9], seed: 41, lv: 3 });
  }
  // shadow line where the floor meets the wall
  for (let x = 0; x < 320; x++) S.set(x, FLOOR, shade(S, x, FLOOR, -1));
  rug(S, pal, opt);
}

function rug(S, pal, opt) {
  // a woven rug from the door to the counter: X 54..196, Z 18..58
  const [x0, y0] = P(58, 0, 20), [x1, y1] = P(192, 0, 60);
  const w = x1 - x0, h = Math.round(y1 - y0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const bx = Math.min(x, w - 1 - x), by = Math.min(y, h - 1 - y);
    let c;
    if (bx < 1 || by < 1) c = pal.rug[1];
    else if (bx < 3 || by < 2) c = pal.rug3[(x + y) % 4 === 0 ? 2 : 3];
    else if (bx < 5 || by < 3) c = pal.rug[3];
    else {
      // diamonds
      const u = (x - 5) % 16 - 8, v = (y - 3) % 8 - 4;
      const d = Math.abs(u) / 2 + Math.abs(v);
      c = d < 1.5 ? pal.rug3[4] : d < 3 ? pal.rug2[3] : d < 3.8 ? pal.rug2[2] : pal.rug[(x + y) % 7 === 0 ? 2 : 3];
    }
    S.set(x0 + x, Math.round(y0) + y, c);
  }
  // fringe
  for (let y = 0; y < h; y += 2) { S.set(x0 - 1, Math.round(y0) + y, pal.rug3[3]); S.set(x0 + w, Math.round(y0) + y, pal.rug3[3]); }
}

function door(S, pal, opt, open, hour, t) {
  const D = LAYOUT.door;
  // frame
  bevel(S, D.x - 4, D.y - 4, D.w + 8, 4, pal.beam, 3);
  bevel(S, D.x - 4, D.y, 4, D.h, pal.beam, 3, { left: true });
  bevel(S, D.x + D.w, D.y, 4, D.h, pal.beam, 3);
  // doorway: outside when open (a lit street), dark wood when closed
  const gx = D.x, gy = D.y, gw = D.w, gh = D.h;
  if (open > 0.01) {
    // the street outside: a bright path, the house across the lane, a slice of sky
    drawOutside(S, gx, gy, gw, gh, { hour, t, zoom: 1.6 });
    S.rect(gx, gy + gh - 16, gw, 16, pal.outdoor[3], NOLIGHT);
    for (let i = 0; i < gw; i += 3) S.set(gx + i, gy + gh - 16 + ((i * 7) % 5), pal.outdoor[2], NOLIGHT);
    S.hline(gx, gx + gw - 1, gy + gh - 16, pal.outdoor[4], NOLIGHT);
  }
  // the door leaf: swings inward on hinges at the left; seen from inside it narrows as it opens
  const lw = Math.round(gw * (1 - open * 0.78));
  const skew = Math.round(open * 7);
  const leaf = (x, y) => {
    const u = x / lw;
    return pal.wall[(x % 9 === 0) ? 1 : 3 - (open > 0.5 ? 1 : 0) + (x % 9 === 1 ? 1 : 0)];
  };
  if (lw > 1) {
    for (let x = 0; x < lw; x++) {
      const topY = gy + Math.round(-skew * (x / lw)), botY = gy + gh - 1 + Math.round(skew * 0.4 * (x / lw));
      for (let y = topY; y <= botY; y++) S.set(gx + x, y, leaf(x, y - gy));
      S.set(gx + x, topY, pal.wall[4]); S.set(gx + x, botY, pal.wall[1]);
    }
    S.vline(gx + lw - 1, gy - skew, gy + gh - 1 + Math.round(skew * 0.4), pal.wall[1]);
    // cross braces and hinges
    if (open < 0.5) {
      for (const hy of [gy + 10, gy + gh - 14]) { S.hline(gx, gx + lw - 1, hy, pal.wall[1]); S.hline(gx, gx + lw - 1, hy + 1, pal.wall[4]); }
      S.line(gx + 1, gy + gh - 14, gx + lw - 2, gy + 11, pal.wall[1]);
      for (const hy of [gy + 9, gy + gh - 15]) S.rect(gx, hy, 7, 4, pal.iron[2]), S.hline(gx, gx + 6, hy, pal.iron[4]);
      // round window in the door
      const cx = gx + gw / 2, cy = gy + 24;
      S.ellipse(cx, cy, 6, 6, pal.beam[2]); S.ellipse(cx, cy, 4.6, 4.6, pal.glass[3]);
      S.set(Math.round(cx - 2), Math.round(cy - 2), pal.glass[5]); S.set(Math.round(cx - 1), Math.round(cy - 3), pal.glass[5]);
      S.hline(Math.round(cx - 4), Math.round(cx + 3), Math.round(cy), pal.beam[2]); S.vline(Math.round(cx), Math.round(cy - 4), Math.round(cy + 3), pal.beam[2]);
      // handle
      S.rect(gx + gw - 7, gy + 40, 3, 3, pal.brass[3]); S.set(gx + gw - 7, gy + 40, pal.brass[5]); S.set(gx + gw - 5, gy + 42, pal.brass[1]);
    }
  }
  // doormat
  const [mx, my] = P(D.x - 2, 0, 6);
  S.rect(mx, Math.round(my), D.w + 4, 4, pal.sack[2]); S.hline(mx, mx + D.w + 3, Math.round(my), pal.sack[4]);
  for (let x = mx + 1; x < mx + D.w + 3; x += 2) S.set(x, Math.round(my) + 2, pal.sack[1]);
  // the bell on its curly bracket, above the door, to the right
  doorBell(S, pal, D.x + D.w + 1, D.y - 7, 0);
}

export function doorBell(S, pal, x, y, swing) {
  S.hline(x, x + 6, y, pal.iron[1]); S.set(x + 7, y + 1, pal.iron[1]); S.set(x + 7, y - 1, pal.iron[1]); S.set(x + 6, y - 2, pal.iron[1]);
  const bx = x + 4 + Math.round(swing * 2), by = y + 1;
  S.vline(x + 4, y + 1, y + 2, pal.iron[1]);
  const bell = ['..#..', '.###.', '.###.', '#####', '..#..'];
  bell.forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') S.set(bx - 2 + i, by + 2 + j, j === 3 ? pal.brass[2] : i === 1 ? pal.brass[5] : pal.brass[3]); }));
}

function bench(S, pal, opt) {
  const B = LAYOUT.bench;
  const [x0, yb] = P(B.x, 0, B.z1), seat = Math.round(yb - B.seatY);
  const w = B.x1 - B.x;
  const top = Math.round(P(0, B.seatY, B.z0)[1]);
  // back legs, seat top (seen from above: a thin band), seat front edge, front legs
  for (const lx of [x0 + 3, x0 + w - 6]) S.rect(lx, top, 3, Math.round(P(0, 0, B.z0)[1]) - top, pal.beam[2]);
  S.curZ = (x, y) => (y + 0.5 - FLOOR + B.seatY) / K;
  S.rect(x0, top, w, seat - top, pal.trim[3]);
  S.hline(x0, x0 + w - 1, top, pal.trim[4]);
  for (let x = x0 + 5; x < x0 + w; x += 11) S.vline(x, top + 1, seat - 1, pal.trim[2]);
  S.curZ = B.z1;
  bevel(S, x0, seat, w, 3, pal.beam, 3);
  for (const lx of [x0 + 2, x0 + w - 5]) { S.rect(lx, seat + 3, 3, Math.round(yb) - seat - 3, pal.beam[3]); S.vline(lx + 2, seat + 3, Math.round(yb) - 1, pal.beam[1]); }
  S.hline(x0 + 4, x0 + w - 5, Math.round(yb) - 5, pal.beam[2]);
  S.curZ = null;
  // shadow under the bench
  for (let x = x0 + 1; x < x0 + w - 1; x++) for (let y = seat + 3; y < Math.round(yb); y++) if (S.get(x, y) >= 0 && ![pal.beam[3], pal.beam[1], pal.beam[2]].includes(S.get(x, y))) S.set(x, y, shade(S, x, y, -2));
  // a knitted cushion and a folded blanket
  const cx = x0 + 6, cy = top - 3;
  for (let x = 0; x < 16; x++) for (let y = 0; y < 5; y++) { const edge = y === 0 || x === 0 || x === 15; S.set(cx + x, cy + y, edge ? pal.cloth[y === 0 ? 4 : 1] : (x + y) % 4 < 2 ? pal.cloth[3] : pal.cream[3]); }
  const bx = x0 + w - 16;
  for (let j = 0; j < 4; j++) bevel(S, bx, top - 2 - j * 2, 12, 2, j % 2 ? pal.teal : pal.cream, 3);
}

function clock(S, pal, opt, hour, t) {
  const C = LAYOUT.clock;
  // case: a wooden body with a round face and a glass door over the pendulum
  const x = C.x, y = C.y;
  bevel(S, x - 8, y - 9, 17, 36, pal.beam, 3, { left: true });
  S.rect(x - 9, y - 11, 19, 3, pal.trim[3]); S.hline(x - 9, x + 9, y - 11, pal.trim[4]); S.rect(x - 3, y - 14, 7, 3, pal.trim[3]); S.set(x, y - 15, pal.trim[4]);
  S.ellipse(x + 0.5, y + 0.5, 7, 7, pal.brass[2]); S.ellipse(x + 0.5, y + 0.5, 6, 6, pal.cream[4]);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.set(Math.round(x + Math.sin(a) * 5), Math.round(y - Math.cos(a) * 5), k % 3 === 0 ? pal.ink : pal.cream[2]); }
  // hands
  const hh = ((hour % 12) / 12) * Math.PI * 2, mm = ((hour % 1)) * Math.PI * 2;
  S.line(x, y, Math.round(x + Math.sin(hh) * 3), Math.round(y - Math.cos(hh) * 3), pal.ink);
  S.line(x, y, Math.round(x + Math.sin(mm) * 4.6), Math.round(y - Math.cos(mm) * 4.6), pal.iron[1]);
  S.set(x, y, pal.brass[4]);
  // pendulum window
  S.rect(x - 5, y + 9, 11, 16, pal.beam[1]); S.rect(x - 4, y + 10, 9, 14, pal.glass[1]);
  const sw = Math.sin(t * Math.PI) * 3;
  S.line(x, y + 10, Math.round(x + sw * 0.8), y + 19, pal.brass[2]);
  S.ellipse(x + sw + 0.5, y + 20.5, 2, 2, pal.brass[3]); S.set(Math.round(x + sw - 1), y + 19, pal.brass[5]);
  S.set(x - 3, y + 11, pal.glass[4]); S.set(x - 2, y + 11, pal.glass[3]);
}

function windowView(S, pal, opt, hour, t, o) {
  const W = LAYOUT.window;
  drawView(S, W.x, W.y, W.w, W.h, { hour, t, lod: 'small', eye: o.towerFlash ? 1 : 0, battle: o.battle, defeated: o.defeated });
  // frame, mullions, sill
  const f = opt === 'B' ? pal.trim : pal.beam;
  bevel(S, W.x - 4, W.y - 4, W.w + 8, 4, f, 3);
  bevel(S, W.x - 4, W.y, 4, W.h, f, 3, { left: true }); bevel(S, W.x + W.w, W.y, 4, W.h, f, 3);
  S.rect(W.x + W.w / 2 - 1, W.y, 3, W.h, f[3]); S.vline(W.x + W.w / 2 - 1, W.y, W.y + W.h - 1, f[4]); S.vline(W.x + W.w / 2 + 1, W.y, W.y + W.h - 1, f[1]);
  S.rect(W.x, W.y + 28, W.w, 3, f[3]); S.hline(W.x, W.x + W.w - 1, W.y + 28, f[4]); S.hline(W.x, W.x + W.w - 1, W.y + 30, f[1]);
  // glass glints: short diagonals in each pane
  for (const [px, py] of [[W.x + 4, W.y + 4], [W.x + W.w / 2 + 4, W.y + 4], [W.x + 4, W.y + 33], [W.x + W.w / 2 + 4, W.y + 33]]) {
    for (let k = 0; k < 4; k++) S.set(Math.round(px + k), Math.round(py + 5 - k), pal.glass[5], NOLIGHT);
    for (let k = 0; k < 2; k++) S.set(Math.round(px + k + 3), Math.round(py + 5 - k), pal.glass[4], NOLIGHT);
  }
  // sill
  const [sx, sy] = [W.x - 7, W.y + W.h];
  S.rect(sx, sy, W.w + 14, 3, pal.trim[4]); S.hline(sx, sx + W.w + 13, sy, pal.trim[5]); S.rect(sx + 1, sy + 3, W.w + 12, 3, pal.trim[2]); S.hline(sx + 1, sx + W.w + 12, sy + 5, pal.trim[0]);
  // a potted plant and a watering can on the sill
  const px = W.x + 6, py = sy;
  S.rect(px, py - 5, 7, 5, pal.pot[3]); S.hline(px - 1, px + 7, py - 6, pal.pot[4]); S.vline(px + 6, py - 5, py - 1, pal.pot[1]);
  const leaves = [[3, -9], [1, -11], [5, -12], [0, -8], [6, -9], [3, -13], [2, -7], [4, -7]];
  for (const [lx, ly] of leaves) { S.set(px + lx, py + ly, pal.leaf[3]); S.set(px + lx + 1, py + ly, pal.leaf[4]); S.set(px + lx, py + ly + 1, pal.leaf[2]); }
  S.set(px + 3, py - 14, pal.red[4]); S.set(px + 4, py - 14, pal.red[3]);
  const cx = W.x + W.w - 16;
  S.rect(cx, py - 5, 7, 5, pal.teal[3]); S.hline(cx, cx + 6, py - 5, pal.teal[4]); S.vline(cx + 6, py - 4, py - 1, pal.teal[1]);
  S.line(cx + 7, py - 4, cx + 10, py - 7, pal.teal[2]); S.set(cx + 10, py - 8, pal.teal[4]);
  S.line(cx - 1, py - 4, cx - 2, py - 6, pal.teal[2]); S.hline(cx + 1, cx + 5, py - 7, pal.teal[2]);
  // curtains, tied back
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? W.x - 12 : W.x + W.w + 4;
    for (let y = W.y - 6; y < W.y + W.h - 4; y++) {
      const tie = W.y + 34;
      const pinch = Math.max(0, 1 - Math.abs(y - tie) / 14);
      const wdt = Math.round(8 - pinch * 4 + (y > tie ? (y - tie) * 0.12 : 0));
      for (let x = 0; x < wdt; x++) {
        const xx = side < 0 ? x0 + (8 - wdt) * 0 + x : x0 + 8 - wdt + x;
        const fold = (x + (side < 0 ? 0 : 1)) % 3;
        S.set(xx, y, pal.curtain[fold === 0 ? 2 : fold === 1 ? 3 : 4]);
      }
    }
    S.rect(side < 0 ? W.x - 12 : W.x + W.w + 5, W.y + 33, 7, 2, pal.gold[3]);
  }
  S.rect(W.x - 14, W.y - 8, W.w + 28, 2, pal.iron[2]); S.hline(W.x - 14, W.x + W.w + 13, W.y - 8, pal.iron[4]);
  S.ellipse(W.x - 15, W.y - 7, 2, 2, pal.brass[3]); S.ellipse(W.x + W.w + 14, W.y - 7, 2, 2, pal.brass[3]);
}

function wallItems(S, pal, opt, t) {
  const L = LAYOUT;
  // a framed picture over the bench: the shop on its first day (a tiny painting)
  const fx = 58, fy = 40;
  bevel(S, fx, fy, 16, 13, pal.gold, 3, { left: true });
  S.rect(fx + 2, fy + 2, 12, 9, pal.glass[3]);
  S.rect(fx + 2, fy + 7, 12, 4, pal.leaf[2]); S.rect(fx + 5, fy + 4, 6, 5, pal.cream[3]); S.set(fx + 7, fy + 3, pal.red[3]); S.set(fx + 8, fy + 3, pal.red[3]); S.hline(fx + 4, fx + 11, fy + 4, pal.red[2]); S.set(fx + 7, fy + 7, pal.beam[1]);
  // three pegs by the door: a straw hat, a satchel, a knitted scarf
  for (const hx of [62, 72, 82]) { S.set(hx, 64, pal.trim[4]); S.set(hx, 65, pal.trim[2]); S.set(hx + 1, 65, pal.beam[1]); }
  S.rect(58, 66, 9, 2, pal.sack[4]); S.rect(60, 64, 5, 2, pal.sack[3]); S.hline(60, 64, 64, pal.sack[5]); S.hline(58, 66, 67, pal.sack[2]); S.hline(60, 64, 65, pal.cloth[3]);
  S.rect(69, 67, 7, 6, pal.leather[3]); S.hline(69, 75, 67, pal.leather[4]); S.vline(75, 68, 72, pal.leather[1]); S.hline(69, 75, 72, pal.leather[1]); S.set(72, 69, pal.brass[4]); S.line(70, 66, 72, 64, pal.leather[2]); S.line(74, 66, 72, 64, pal.leather[2]);
  for (let j = 0; j < 14; j++) { const q = j > 7 ? 1 : 0; S.set(81 + q, 66 + j, pal.teal[j % 3 === 0 ? 2 : 3]); S.set(82 + q, 66 + j, pal.teal[4]); if (j > 3 && j < 10) S.set(83 + q, 66 + j, pal.teal[2]); }
  S.set(81, 80, pal.cream[4]); S.set(83, 80, pal.cream[4]); S.set(82, 81, pal.cream[4]);
  // a cork notice board: a wanted poster (a slime), a sketch of the tower, a note with a coin on it
  const nx = 58, ny = 22;
  bevel(S, nx - 1, ny - 1, 30, 18, pal.beam, 3);
  S.rect(nx, ny, 28, 16, pal.cork[3]); for (let k = 0; k < 30; k++) S.set(nx + ((k * 7) % 28), ny + ((k * 5) % 16), pal.cork[k % 2 ? 2 : 4]);
  S.rect(nx + 2, ny + 2, 9, 11, pal.paper[4]); S.hline(nx + 2, nx + 10, ny + 12, pal.paper[2]);
  S.ellipse(nx + 6.5, ny + 8, 3, 2.4, pal.green[3]); S.hline(nx + 4, nx + 9, ny + 10, pal.green[2]); S.set(nx + 5, ny + 7, pal.ink); S.set(nx + 8, ny + 7, pal.ink); S.set(nx + 5, ny + 6, pal.green[5]);
  S.set(nx + 6, ny + 2, pal.red[3]);
  S.rect(nx + 13, ny + 3, 8, 10, pal.paper[3]); S.vline(nx + 17, ny + 5, ny + 11, pal.purple[2]); S.set(nx + 16, ny + 5, pal.purple[2]); S.set(nx + 18, ny + 5, pal.purple[2]); S.hline(nx + 14, nx + 20, ny + 11, pal.leaf[2]); S.set(nx + 17, ny + 3, pal.blue[3]);
  S.rect(nx + 22, ny + 6, 5, 6, pal.cream[4]); S.ellipse(nx + 24.5, ny + 8.5, 1.5, 1.5, pal.gold[3]); S.set(nx + 24, ny + 8, pal.gold[5]); S.set(nx + 24, ny + 6, pal.red[3]);
  // above the door: an empty iron hook, waiting (the demon lord's horn will hang here at the end)
  const hkx = LAYOUT.door.x + LAYOUT.door.w / 2, hky = LAYOUT.door.y - 22;
  S.set(hkx, hky, pal.iron[1]); S.set(hkx, hky + 1, pal.iron[3]); S.set(hkx + 1, hky + 2, pal.iron[3]); S.set(hkx + 2, hky + 1, pal.iron[4]);
  for (let i = -8; i <= 8; i++) if (Math.abs(i) > 5) S.set(hkx + i, hky + 3 + Math.round(Math.abs(i) * 0.2), shiftIdx(S.get(hkx + i, hky + 3), -1));
  // an umbrella stand by the door with an umbrella and a walking stick
  const ux = 2, [, uy] = P(0, 0, 6);
  S.rect(ux, Math.round(uy) - 10, 9, 10, pal.pot[2]); S.hline(ux, ux + 8, Math.round(uy) - 10, pal.pot[4]); S.hline(ux, ux + 8, Math.round(uy) - 6, pal.pot[1]);
  S.line(ux + 3, Math.round(uy) - 10, ux + 2, Math.round(uy) - 28, pal.leather[2]); S.set(ux + 1, Math.round(uy) - 29, pal.leather[3]); S.set(ux + 2, Math.round(uy) - 30, pal.leather[3]); S.set(ux + 3, Math.round(uy) - 29, pal.leather[3]);
  for (let j = 0; j < 14; j++) { const hw = j < 3 ? 1 : 2; for (let i = -hw; i <= hw - 1; i++) S.set(ux + 6 + i, Math.round(uy) - 11 - j, pal.blue[i < 0 ? 3 : 2]); }
  S.vline(ux + 6, Math.round(uy) - 28, Math.round(uy) - 25, pal.iron[2]);

  // the shield on the wall with its price tag (story prop: must read at a glance)
  shieldProp(S, pal, L.shield.x, L.shield.y);
  S.line(L.shield.x + 2, L.shield.y + 12, L.shield.x - 2, L.shield.y + 16, pal.ink);
  tag(S, L.shield.x - 7, L.shield.y + 16, 80, pal);
  // a better sword for display (too expensive): on two pegs
  const sx = 118, sy = 106;
  // (kept off the window; the rack is under the window by the wainscot)
}

export function shieldProp(S, pal, x, y) {
  // a round wooden shield with an iron rim and boss
  S.ellipse(x + 0.5, y + 0.5, 10, 10, pal.iron[1]);
  S.ellipse(x + 0.5, y + 0.5, 9, 9, pal.iron[3]);
  S.ellipse(x + 0.5, y + 0.5, 8, 8, pal.trim[3]);
  for (let k = -8; k <= 8; k += 4) for (let j = -8; j <= 8; j++) if ((k + 0.5) ** 2 + (j + 0.5) ** 2 < 64) S.set(x + k, y + j, pal.trim[2]);
  S.ellipse(x - 2.5, y - 2.5, 4, 4, pal.trim[4]);
  S.ellipse(x + 0.5, y + 0.5, 3, 3, pal.iron[2]); S.ellipse(x - 0.5, y - 0.5, 2, 2, pal.iron[4]); S.set(x - 1, y - 1, pal.steel[5]);
  for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [0, -8], [0, 8], [-8, 0], [8, 0]]) S.set(x + Math.round(a * 0.95), y + Math.round(b * 0.95), pal.iron[4]);
  S.set(x - 4, y - 8, pal.steel[5]); S.set(x - 6, y - 6, pal.steel[4]);
}

function shelves(S, pal, opt, t) {
  // three shelves on the back wall behind the counter; the shopkeeper sorts by colour and size
  const x0 = 214, x1 = 318;
  const rows = [36, 58, 80];
  const rng = rnd(77);
  // brackets
  for (const y of rows) {
    for (let x = x0; x < x1; x++) { S.set(x, y + 3, shade(S, x, y + 3, -2)); S.set(x, y + 4, shade(S, x, y + 4, -1)); }
    S.rect(x0, y, x1 - x0, 3, pal.trim[3]); S.hline(x0, x1 - 1, y, pal.trim[5]); S.hline(x0, x1 - 1, y + 2, pal.trim[1]);
    for (const bx of [x0 + 6, x1 - 8]) { S.rect(bx, y + 3, 2, 4, pal.trim[2]); S.set(bx + 1, y + 6, pal.trim[1]); }
  }
  // top shelf: red and blue potions, in order
  let x = x0 + 3;
  const pot = [['round', pal.red], ['round', pal.red], ['round', pal.red], ['tall', pal.blue], ['tall', pal.blue], ['square', pal.green], ['square', pal.green], ['flask', pal.purple], ['jug', pal.amber], ['vial', pal.red], ['vial', pal.blue], ['vial', pal.green]];
  for (const [k, r] of pot) { x += bottle(S, x, rows[0], k, r, pal, { level: 0.55 + rng() * 0.3, label: k !== 'vial' && rng() < 0.7 }) + 2; }
  // middle shelf: books, jars of herbs, a scroll rack
  x = books(S, x0 + 3, rows[1], 7, [pal.red, pal.blue, pal.green, pal.leather, pal.purple], pal, 3) + 3;
  for (let j = 0; j < 3; j++) { jar(S, x, rows[1], [pal.leaf, pal.amber, pal.red][j], pal); x += 9; }
  for (let j = 0; j < 3; j++) scroll(S, x + j * 2, rows[1] - j * 3, 12, pal);
  x += 18;
  for (let j = 0; j < 2; j++) { box(S, x, rows[1], 9, 7, pal.leather, pal); x += 10; }
  // bottom shelf: little sacks and a pair of boots for sale
  x = x0 + 3;
  for (let j = 0; j < 4; j++) { sack(S, x, rows[2], pal); x += 9; }
  bootsProp(S, x + 2, rows[2], pal); x += 18;
  for (let j = 0; j < 3; j++) { bottle(S, x, rows[2], 'round', [pal.teal, pal.red, pal.amber][j], pal, { level: 0.7 }); x += 8; }
  S.rect(x, rows[2] - 5, 12, 5, pal.leather[3]); S.hline(x, x + 11, rows[2] - 5, pal.leather[4]); S.vline(x + 11, rows[2] - 4, rows[2] - 1, pal.leather[1]); S.set(x + 5, rows[2] - 3, pal.gold[4]);
}

function jar(S, x, y, r, pal) {
  S.rect(x, y - 7, 7, 7, pal.glass[3]); S.hline(x, x + 6, y - 8, pal.cork[3]); S.hline(x + 1, x + 5, y - 9, pal.cork[4]);
  S.rect(x + 1, y - 5, 5, 4, r[3]); S.set(x + 2, y - 4, r[4]); S.set(x + 4, y - 3, r[2]); S.set(x + 1, y - 6, pal.glass[5]);
  S.vline(x, y - 7, y - 1, pal.glass[2]); S.vline(x + 6, y - 7, y - 1, pal.glass[1]); S.hline(x, x + 6, y - 1, pal.glass[1]);
}
function box(S, x, y, w, h, r, pal) {
  bevel(S, x, y - h, w, h, r, 3, { left: true });
  S.hline(x + 1, x + w - 2, y - h + 2, r[2]); S.set(x + (w >> 1), y - h + 4, pal.gold[4]);
}
function sack(S, x, y, pal) {
  const rows = ['..##..', '.#..#.', '######', '######', '######', '.####.'];
  rows.forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') S.set(x + i, y - 6 + j, pal.sack[i === 0 || j === 5 ? 2 : i === 5 ? 2 : j === 2 ? 4 : 3]); }));
  S.hline(x + 1, x + 4, y - 5, pal.cloth[2]);
}
function bootsProp(S, x, y, pal) {
  for (const bx of [x, x + 7]) {
    S.rect(bx + 1, y - 9, 4, 7, pal.leather[3]); S.rect(bx, y - 3, 7, 3, pal.leather[3]);
    S.vline(bx + 1, y - 9, y - 3, pal.leather[4]); S.hline(bx, bx + 6, y - 1, pal.leather[1]); S.hline(bx + 1, bx + 4, y - 9, pal.leather[5]);
  }
}

function backCabinet(S, pal, opt, t, hour) {
  // a low cabinet against the back wall, behind the counter: apothecary drawers and the tea corner
  const [x0, yb] = P(214, 0, 8), top = Math.round(yb - 26);
  const w = 104;
  S.rect(x0, top, w, Math.round(yb) - top, pal.counter[3]);
  S.rect(x0 - 1, top - 3, w + 2, 3, pal.counter[4]); S.hline(x0 - 1, x0 + w, top - 3, pal.counter[5]);
  // drawers: a grid, each with a brass knob and a tiny icon label
  const icons = ['leaf', 'drop', 'star', 'moon', 'leaf', 'drop', 'star', 'moon'];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 6; i++) {
    const dx = x0 + 3 + i * 10, dy = top + 3 + j * 10;
    bevel(S, dx, dy, 9, 9, pal.counter, 3, { left: true });
    S.rect(dx + 2, dy + 2, 5, 3, pal.paper[3]);
    const ic = (i + j * 3) % 4;
    if (ic === 0) { S.set(dx + 3, dy + 3, pal.green[3]); S.set(dx + 4, dy + 3, pal.green[4]); S.set(dx + 5, dy + 3, pal.green[2]); }
    if (ic === 1) { S.set(dx + 4, dy + 2, pal.blue[3]); S.hline(dx + 3, dx + 5, dy + 3, pal.blue[3]); S.set(dx + 4, dy + 4, pal.blue[2]); }
    if (ic === 2) { S.set(dx + 4, dy + 2, pal.gold[4]); S.hline(dx + 3, dx + 5, dy + 3, pal.gold[3]); S.set(dx + 4, dy + 4, pal.gold[3]); }
    if (ic === 3) { S.set(dx + 3, dy + 2, pal.purple[3]); S.set(dx + 3, dy + 3, pal.purple[3]); S.set(dx + 4, dy + 4, pal.purple[3]); S.set(dx + 5, dy + 4, pal.purple[2]); }
    S.set(dx + 4, dy + 6, pal.brass[4]); S.set(dx + 4, dy + 7, pal.brass[1]);
  }
  // the tea corner: a little iron stove with a kettle, steam, cups on hooks
  const sx = x0 + 66, sy = top - 3;
  S.rect(sx, sy - 9, 14, 9, pal.iron[2]); S.hline(sx, sx + 13, sy - 9, pal.iron[4]); S.rect(sx + 4, sy - 6, 6, 4, pal.iron[0]);
  const fl = Math.floor(t * 8) % 3;
  S.set(sx + 6, sy - 3, pal.flame[1 + (fl % 2)], EMIT); S.set(sx + 7, sy - 3, pal.flame[1 + ((fl + 1) % 2)], EMIT); S.set(sx + 6 + (fl === 2 ? 1 : 0), sy - 4, pal.flame[2], EMIT);
  // teapot
  const tx = sx + 2, ty = sy - 9;
  S.ellipse(tx + 5, ty - 4, 5, 4, pal.teal[3]); S.ellipse(tx + 4, ty - 5, 3, 2, pal.teal[4]); S.set(tx + 3, ty - 6, pal.teal[5]);
  S.rect(tx + 4, ty - 9, 3, 1, pal.teal[2]); S.set(tx + 5, ty - 10, pal.teal[4]);
  S.line(tx + 10, ty - 4, tx + 13, ty - 7, pal.teal[3]); S.line(tx - 1, ty - 6, tx - 1, ty - 3, pal.teal[2]); S.set(tx, ty - 7, pal.teal[2]);
  // steam from the spout
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.6 + k / 3) % 1, px = tx + 13 + Math.round(Math.sin(ph * 6 + k) * 1.5 + ph * 3), py = ty - 8 - Math.round(ph * 14);
    if (ph < 0.8) S.set(px, py, pal.cream[ph < 0.4 ? 5 : 4], NOLIGHT);
  }
  // cups on hooks
  for (let k = 0; k < 3; k++) { const cx = sx + 20 + k * 6, cy = top - 16; S.set(cx + 1, cy - 2, pal.brass[2]); S.rect(cx, cy, 4, 3, pal.cream[4]); S.hline(cx, cx + 3, cy + 2, pal.cream[2]); S.set(cx + 4, cy + 1, pal.cream[3]); }
  // a tea tin and a jar of honey
  S.rect(sx + 18, sy - 7, 5, 7, pal.red[3]); S.hline(sx + 18, sx + 22, sy - 7, pal.red[4]); S.set(sx + 20, sy - 4, pal.gold[4]);
  jar(S, sx + 25, sy, pal.amber, pal);
}

function barrel(S, pal, opt) {
  // a barrel of wooden swords at the end of the counter: the cheapest thing in the shop
  const B = LAYOUT.barrel, [x, yb] = P(B.x, 0, B.z);
  const w = 16, h = 18, top = Math.round(yb) - h;
  // swords sticking out
  const swords = [[3, -17, -1], [7, -21, 0], [11, -16, 1], [5, -13, 1]];
  for (const [sx, sh, lean] of swords) {
    for (let j = 0; j < -sh; j++) { const X = x + sx + Math.round(lean * j / 6); S.set(X, top - j, pal.trim[j < 3 ? 2 : 4]); S.set(X + 1, top - j, pal.trim[j < 3 ? 1 : 3]); }
    const gy = top - 3; S.hline(x + sx - 1 + Math.round(lean * 3 / 6), x + sx + 2 + Math.round(lean * 3 / 6), gy, pal.beam[3]);
    S.set(x + sx + Math.round(lean * (-sh) / 6), top + sh, pal.trim[5]);
  }
  for (let j = 0; j < h; j++) {
    const bulge = Math.round(Math.sin(j / (h - 1) * Math.PI) * 1.5);
    for (let i = -bulge; i < w + bulge; i++) {
      const stave = (i + 20) % 4 === 0;
      const hoop = j === 2 || j === h - 3;
      S.set(x + i, top + j, hoop ? pal.iron[i < w / 2 ? 3 : 2] : pal.counter[stave ? 2 : i < 4 ? 4 : i > w - 4 ? 2 : 3]);
    }
  }
  S.hline(x, x + w - 1, top, pal.counter[5]);
  S.line(x + 8, top - 12, x + 12, top - 9, pal.ink);
  tag(S, x + 9, top - 10, 50, pal);
}

function counter(S, pal, opt, t, o) {
  const C = LAYOUT.counter;
  const [x0, yf] = P(C.x0, 0, C.z1), [, yb] = P(C.x0, 0, C.z0);
  const w = C.x1 - C.x0, topF = Math.round(yf - C.h), topB = Math.round(yb - C.h);
  // top surface (seen from above); every pixel knows its depth so hands can rest on it
  S.curZ = (x, y) => (y + 0.5 - FLOOR + C.h) / K;
  for (let y = topB; y < topF; y++) for (let x = 0; x < w; x++) S.set(x0 + x, y, pal.counter[(x * 3 + y * 7) % 23 === 0 ? 3 : y === topB ? 5 : 4]);
  // grain on the top
  const rng = rnd(9);
  for (let k = 0; k < 18; k++) { const gx = x0 + ((rng() * w) | 0), gy = topB + 1 + ((rng() * (topF - topB - 1)) | 0), gl = 4 + ((rng() * 10) | 0); S.hline(gx, Math.min(x0 + w - 1, gx + gl), gy, pal.counter[3]); }
  // the front edge lip and the front face with panels
  S.curZ = C.z1;
  S.hline(x0, x0 + w - 1, topF, pal.counter[5]); S.hline(x0, x0 + w - 1, topF + 1, pal.counter[2]);
  S.rect(x0, topF + 2, w, Math.round(yf) - topF - 2, pal.counter[3]);
  for (let px = x0 + C.flap + 3; px + 18 <= x0 + w - 2; px += 20) {
    const py = topF + 4, ph = Math.round(yf) - topF - 8;
    S.rect(px, py, 17, ph, pal.counter[2]); S.rect(px + 1, py + 1, 15, ph - 2, pal.counter[4]); S.rect(px + 2, py + 2, 13, ph - 4, pal.counter[3]);
    S.hline(px + 1, px + 15, py + ph - 2, pal.counter[5]);
  }
  // an emblem on the middle panel: a potion
  const ex = x0 + C.flap + 3 + 20 * 2 + 5, ey = topF + 7;
  bottle(S, ex + 1, ey + 10, 'round', pal.red, pal, { level: 0.8 });
  // the lifting flap at the left end: a seam and hinges; a little door below
  S.vline(x0 + C.flap, topB, Math.round(yf) - 1, pal.counter[1]);
  S.set(x0 + C.flap - 1, topF + 1, pal.iron[3]); S.set(x0 + C.flap + 1, topF + 1, pal.iron[3]);
  S.rect(x0 + 2, topF + 4, C.flap - 4, Math.round(yf) - topF - 7, pal.counter[2]); S.rect(x0 + 3, topF + 5, C.flap - 6, Math.round(yf) - topF - 9, pal.counter[3]);
  S.set(x0 + C.flap - 4, topF + 11, pal.brass[4]);
  // kick board and shadow on the floor
  S.hline(x0, x0 + w - 1, Math.round(yf) - 1, pal.counter[1]); S.hline(x0, x0 + w - 1, Math.round(yf) - 2, pal.counter[2]);
  for (let x = x0 - 1; x < x0 + w + 2; x++) for (let y = Math.round(yf); y < Math.round(yf) + 3; y++) S.set(x, y, shade(S, x, y, -(3 - (y - Math.round(yf)))));
  S.vline(x0, topB, Math.round(yf) - 1, pal.counter[4]); S.vline(x0 + w - 1, topB, Math.round(yf) - 1, pal.counter[1]);
  S.curZ = null;
  // things on the counter: ledger + ink, scale, candy jar, coin tray (they stand toward the back of the top)
  S.curZ = C.z0 + 5;
  const ly = topF - 1;
  // ledger (open)
  const lx = x0 + 52;
  S.rect(lx, ly - 3, 18, 4, pal.paper[4]); S.vline(lx + 9, ly - 3, ly, pal.paper[2]); S.hline(lx, lx + 17, ly + 1, pal.leather[2]);
  for (let k = 0; k < 3; k++) { S.hline(lx + 1, lx + 7, ly - 2 + k, k === 1 ? pal.paper[2] : pal.paper[4]); S.hline(lx + 11, lx + 16, ly - 2 + k, k === 0 ? pal.paper[2] : pal.paper[4]); }
  S.rect(lx + 20, ly - 3, 3, 3, pal.ink); S.set(lx + 21, ly - 4, pal.ink); S.line(lx + 22, ly - 4, lx + 25, ly - 9, pal.cream[5]); S.set(lx + 24, ly - 8, pal.cream[4]);
  // brass scale
  const bx = x0 + 80;
  S.vline(bx, ly - 10, ly, pal.brass[3]); S.hline(bx - 6, bx + 6, ly - 10, pal.brass[4]);
  for (const s of [-1, 1]) { S.line(bx + s * 6, ly - 10, bx + s * 6 - 2, ly - 6, pal.brass[2]); S.line(bx + s * 6, ly - 10, bx + s * 6 + 2, ly - 6, pal.brass[2]); S.hline(bx + s * 6 - 3, bx + s * 6 + 3, ly - 5, pal.brass[3]); }
  S.hline(bx - 3, bx + 3, ly, pal.brass[2]);
  // candy jar
  jar(S, x0 + 34, ly + 1, pal.red, pal); S.set(x0 + 36, ly - 4, pal.blue[4]); S.set(x0 + 38, ly - 3, pal.amber[4]);
  // coin tray
  S.rect(x0 + 20, ly - 1, 9, 2, pal.leather[2]); S.hline(x0 + 21, x0 + 27, ly - 1, pal.leather[4]);
  S.curZ = null;
}

function foreground(S, pal, opt) {
  S.curZ = 120;
  // sacks of flour in the bottom-right corner and a crate of apples in the bottom-left; kept to the very edges
  const [cx, cy] = P(-2, 0, 118);
  const cw = 26, ch = 16;
  bevel(S, cx, Math.round(cy) - ch, cw, ch, pal.counter, 3, { left: true });
  for (let k = 0; k < 3; k++) S.hline(cx + 1, cx + cw - 2, Math.round(cy) - ch + 4 + k * 4, pal.counter[2]);
  for (let k = 0; k < 7; k++) { const ax = cx + 3 + (k % 4) * 5 + (k > 3 ? 2 : 0), ay = Math.round(cy) - ch - 2 - (k > 3 ? 3 : 0); S.ellipse(ax + 0.5, ay + 0.5, 2.4, 2.2, pal.apple[3]); S.set(ax - 1, ay - 1, pal.apple[5]); S.set(ax, ay - 2, pal.leaf[2]); }
  const [sx, sy] = P(296, 0, 116);
  for (let k = 0; k < 2; k++) {
    const x = sx + k * 13 - 4, y = Math.round(sy) - k * 3;
    for (let j = 0; j < 20; j++) { const hw = Math.round(7 - Math.abs(j - 12) * 0.25 - (j < 4 ? (4 - j) : 0)); for (let i = -hw; i <= hw; i++) S.set(x + i, y - j, pal.sack[i === -hw ? 4 : i === hw ? 2 : j === 0 ? 1 : 3]); }
    S.hline(x - 3, x + 3, y - 16, pal.cloth[2]);
  }
  S.curZ = null;
}
