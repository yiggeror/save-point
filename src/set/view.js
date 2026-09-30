// The view from the shop window: the film's most repeated picture, so it is painted properly and nearly everything
// in it moves.
//
// One composition, two levels of detail: 'insert' fills the 320×180 frame (the window close-up, framed by the sash
// and mullion drawn by windowInsert) and 'small' is the same landscape seen through the window in the wide shot.
// Far to near: sky (darkening into a violet aura round the tower), sun or moon and stars, two layers of clouds, a slow
// spiral of storm cloud over the demon lord's tower with lightning inside it, the pale far range, the black crag and
// the tower (horned roof, pennant, a glowing eye, lit slits), the plateau with a waterfall, the escarpment the road
// runs along (the ledge the hero steps off), a belt of forest, fields and meadow with sheep, the road winding up from
// the village, a windmill, a neighbour's roof and chimney, laundry, the big tree in front of the shop.
// Moving: clouds at two speeds and their shadows sliding over the land, the storm spiral and its lightning, the eye,
// the pennant, birds, the waterfall and its spray, gusts of wind running through grass and wheat, sheep grazing,
// windmill sails, chimney smoke, laundry, branches and falling leaves, butterflies by day and fireflies by night.
import { EMIT, NOLIGHT, PAL, bayer } from '../pix/gfx.js';
import { R, RX, rnd } from './kit.js';
import { hex, mix } from '../pix/color.js';
import { skyAt } from './outside.js';

const N = NOLIGHT;
const C = {
  far:    R('v.far', '#aebbdc', 6, { lo: 0.56, hi: 0.93, cool: 270, warm: 60, shift: 0.15 }),
  far0:   R('v.far0', '#bcc6e2', 5, { lo: 0.66, hi: 0.95, cool: 260, shift: 0.1 }),
  snow:   R('v.snow', '#eef2fb', 5, { lo: 0.72, hi: 0.99, cool: 250 }),
  crag:   R('v.crag', '#564660', 7, { lo: 0.14, hi: 0.6, at: 3, cool: 290, warm: 30, shift: 0.2 }),
  tower:  R('v.tower', '#433852', 7, { lo: 0.1, hi: 0.56, at: 3, cool: 290, warm: 40, shift: 0.15 }),
  roofT:  R('v.roofT', '#5e2a4c', 5, { lo: 0.14, hi: 0.5, cool: 320 }),
  horn:   R('v.horn', '#d8ccb0', 4, { lo: 0.5, hi: 0.92 }),
  vortex: R('v.vortex', '#5a4a78', 6, { lo: 0.16, hi: 0.62, cool: 290, warm: 330, shift: 0.15 }),
  pennant: R('v.pennant', '#b8305a', 4, { lo: 0.3, hi: 0.66, cool: 330 }),
  hillB:  R('v.hillB', '#78a294', 6, { lo: 0.44, hi: 0.84, cool: 230, warm: 120, shift: 0.2 }),
  forest: R('v.forest', '#3f7a4c', 7, { lo: 0.18, hi: 0.72, at: 3, cool: 220, warm: 100, shift: 0.3 }),
  meadow: R('v.meadow', '#80b44e', 7, { lo: 0.3, hi: 0.87, at: 3, cool: 190, warm: 95, shift: 0.3 }),
  wheat:  R('v.wheat', '#d8b858', 6, { lo: 0.42, hi: 0.92, cool: 30, warm: 90 }),
  soil:   R('v.soil', '#9c7454', 5, { lo: 0.3, hi: 0.7 }),
  rock:   R('v.rock', '#9a8c7e', 7, { lo: 0.24, hi: 0.84, at: 3, cool: 280, warm: 70, shift: 0.22 }),
  path:   R('v.path', '#dcbc88', 6, { lo: 0.42, hi: 0.93, cool: 20, warm: 80 }),
  water:  R('v.water', '#7cc6e6', 5, { lo: 0.5, hi: 0.98, cool: 230 }),
  mist:   R('v.mist', '#e4ecf2', 4, { lo: 0.72, hi: 0.98, cool: 250 }),
  roof:   R('v.roof', '#b65a3c', 7, { lo: 0.24, hi: 0.8, at: 3, cool: 330, shift: 0.3 }),
  wall:   R('v.wall', '#e6d4b0', 6, { lo: 0.46, hi: 0.95 }),
  timber: R('v.timber', '#6a4a3a', 5, { lo: 0.18, hi: 0.56 }),
  stone:  R('v.stone', '#a09488', 6, { lo: 0.34, hi: 0.84, cool: 270 }),
  mill:   R('v.mill', '#eadcc2', 5, { lo: 0.52, hi: 0.96 }),
  sail:   R('v.sail', '#e0d2b4', 4, { lo: 0.6, hi: 0.95 }),
  wool:   R('v.wool', '#f0ece0', 4, { lo: 0.58, hi: 0.99 }),
  cloth1: R('v.cloth1', '#d8524e', 4, { lo: 0.38, hi: 0.78, cool: 330 }), cloth2: R('v.cloth2', '#4f86d8', 4, { lo: 0.4, hi: 0.8 }), cloth3: R('v.cloth3', '#f4ecd8', 4, { lo: 0.64, hi: 0.98 }),
  tree:   R('v.tree', '#4c8a40', 7, { lo: 0.2, hi: 0.8, at: 3, cool: 200, warm: 95, shift: 0.35 }),
  trunk:  R('v.trunk', '#6a4a36', 5, { lo: 0.18, hi: 0.58 }),
  smoke:  R('v.smoke', '#dcdce4', 5, { lo: 0.55, hi: 0.97, cool: 250 }),
  flower: RX('v.flower', ['#f0d050', '#f07a8a', '#fbfbf0', '#b890f0', '#ffffff']),
  slime:  R('v.slime', '#5ec45a', 6, { lo: 0.3, hi: 0.9, cool: 190, warm: 100 }),
  fire:   RX('v.fire', ['#8a2a1a', '#e0501e', '#f89a2a', '#ffd76a', '#fff6c8'], EMIT),
  bolt:   RX('v.bolt', ['#7a4ae0', '#c8a0ff', '#ffffff'], EMIT),
  eye:    RX('v.eye', ['#2a1020', '#b0302a', '#f0602a', '#ffb050', '#fff0b0'], EMIT),
  lamp:   RX('v.lamp', ['#5a3a1a', '#f0a040', '#ffd88a', '#fff4d0'], EMIT),
  fly:    RX('v.fly', ['#a8e070', '#f0ffb0'], EMIT),
  hero:   RX('v.hero', ['#241820', '#e8622c', '#3f73b8', '#c73a3f', '#f0b48e', '#d9c9a3', '#5a3a2a', '#ffa860'], N),
  ink:    RX('v.ink', ['#1e1622', '#2c2230', '#3a3040'], N),
  butter: RX('v.butter', ['#f8f0a0', '#ffffff', '#f0a0c8']),
};
// sky slots rewritten every frame: plain bands, the same bands tinted toward the aura (two strengths), the sun
const NB = 9;
const SKY = RX('v.sky', Array.from({ length: NB }, () => '#000000'), EMIT);
const AUR1 = RX('v.aura1', Array.from({ length: NB }, () => '#000000'), EMIT);
const AUR2 = RX('v.aura2', Array.from({ length: NB }, () => '#000000'), EMIT);
const SUN = RX('v.sun', ['#000000', '#000000', '#000000', '#000000'], EMIT);
const CLOUD = RX('v.cloud', Array.from({ length: 5 }, () => '#ffffff'), EMIT);
const STAR = RX('v.star', ['#6a74a8', '#b8c0f0', '#ffffff'], EMIT);
const LUNA = RX('v.luna', ['#9096bc', '#d8dcf0', '#fbfbff'], EMIT);
const FLASH = RX('v.flash', ['#f4ecff', '#ffffff'], EMIT);

const CLOUDKEYS = [
  [0, '#1c2244', '#2a3258', '#3a4470', '#4c5886', '#7078a8'], [5.2, '#3a3464', '#5a4a78', '#8a6a8e', '#c890a0', '#f4c8b0'],
  [6.4, '#98a0c8', '#bcc4e0', '#e0e6f4', '#f6f8fc', '#ffffff'], [12, '#9cb0d8', '#c2d4ee', '#e4eefa', '#f8fbff', '#ffffff'],
  [16.8, '#a4a8cc', '#ccccdc', '#ece6e6', '#fff4ea', '#fffcf4'], [18.2, '#6a4a7a', '#a26a86', '#e0908a', '#ffc090', '#ffe8b8'],
  [19.3, '#2c2a58', '#4a3a6a', '#7a5074', '#a0667a', '#c88a8a'], [20.4, '#161c3c', '#222a4c', '#303a60', '#404c78', '#5a669a'],
  [24, '#1c2244', '#2a3258', '#3a4470', '#4c5886', '#7078a8'],
];
const AURAKEYS = [[0, '#0e0818'], [5.4, '#2a1030'], [7, '#2e1c44'], [17, '#2e1c44'], [18.6, '#3a1234'], [20, '#0e0818'], [24, '#0e0818']];
function keyed(keys, h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= h) i++;
  const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)];
  const u = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((c, j) => mix(hex(c), hex(b[j + 1]), u));
}
const night = (h) => h >= 19.8 || h < 5.3;
const dusky = (h) => (h > 17.6 && h < 19.8) || (h >= 5.3 && h < 6.4);
const frac = (x) => x - Math.floor(x);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** smooth 1D value noise, 0..1 */
const vn = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, s) * (1 - u) + hash(i + 1, s) * u; };

// ------------------------------------------------------------------ composition (view coordinates = insert pixels)
export const V = {
  tower: { x: 214, base: 80, top: 20 },
  eye: [214, 39],
  vortex: [214, 2],
  // the road from the village (bottom) through the fields, up the ramp onto the ledge, along it, up the crag
  path: [[150, 186], [146, 174], [134, 164], [124, 156], [128, 148], [146, 142], [160, 137], [168, 131], [170, 124], [176, 116],
    [186, 113], [198, 112], [207, 110], [212, 104], [220, 98], [210, 92], [206, 88], [214, 84], [214, 81]],
  ledge: [174, 300, 113],        // the escarpment's top edge: from x, to x, at y
  cliffL: [40, 92, 106],         // a lower cliff on the left, the waterfall pours over it
  slime: [110, 156], windmill: [270, 104], chimney: [22, 128], sheep: [[236, 150], [250, 154], [262, 147]],
};
const PATH_LEN = (() => { let L = 0; for (let i = 1; i < V.path.length; i++) L += Math.hypot(V.path[i][0] - V.path[i - 1][0], V.path[i][1] - V.path[i - 1][1]); return L; })();
/** a point along the road (u 0..1 by length) and the hero's scale there */
export function pathAt(u) {
  let d = clamp(u, 0, 1) * PATH_LEN;
  for (let i = 1; i < V.path.length; i++) {
    const [ax, ay] = V.path[i - 1], [bx, by] = V.path[i], L = Math.hypot(bx - ax, by - ay);
    if (d <= L || i === V.path.length - 1) { const f = clamp(d / L, 0, 1), y = ay + (by - ay) * f; return [ax + (bx - ax) * f, y, clamp((y - 64) / 90, 0.42, 1)]; }
    d -= L;
  }
}
// where each way of dying happens, along the road
export const DEATH_U = { flash: 0.985, fire: 0.84, cliff: 0.64, slime: 0.13 };
// where the hero is when the window shot starts (a long shot shows him from the ledge; a quick one just before)
export const FROM_U = { flash: 0.6, fire: 0.52, cliff: 0.42, slime: 0.02 };

// ------------------------------------------------------------------ the view transform
// insert: view = screen (offset by x0,y0). small: uniform scale h/180, panned so the tower sits right of the mullion.
function makeM(x0, y0, w, h, lod) {
  if (lod === 'insert') return { lod, s: 1, ox: 0, x0, y0, w, h, X: (x) => x - x0 + 0.5, Y: (y) => y - y0 + 0.5, sx: (X) => x0 + X, sy: (Y) => y0 + Y };
  const s = h / 180, ox = V.tower.x - (w * 0.66) / s;
  return { lod, s, ox, x0, y0, w, h, X: (x) => ox + (x - x0 + 0.5) / s, Y: (y) => (y - y0 + 0.5) / s, sx: (X) => x0 + (X - ox) * s, sy: (Y) => y0 + Y * s };
}
/** run fn(x, y, X, Y) over the screen pixels whose view coordinates fall in [X0,X1)×[Y0,Y1) */
function each(M, X0, Y0, X1, Y1, fn) {
  const xa = Math.max(M.x0, Math.floor(M.sx(X0))), xb = Math.min(M.x0 + M.w, Math.ceil(M.sx(X1)));
  const ya = Math.max(M.y0, Math.floor(M.sy(Y0))), yb = Math.min(M.y0 + M.h, Math.ceil(M.sy(Y1)));
  for (let y = ya; y < yb; y++) { const Y = M.Y(y); for (let x = xa; x < xb; x++) fn(x, y, M.X(x), Y); }
}

// ------------------------------------------------------------------ cloud shadows on the land
let SHADOWS = [];
const FX = { flash: 0, defeated: false };
function setShadows(t, hour) {
  SHADOWS = [];
  if (night(hour) || dusky(hour)) return;
  for (let i = 0; i < 3; i++) {
    const span = 520, X = ((i * 190 + t * 2.6) % span + span) % span - 100;
    SHADOWS.push([X, 118 + i * 17, 40 + i * 10, 6 + i * 3]);
  }
}
/** 1 where a cloud's shadow lies on the ground at view (X,Y), dithered at the edge */
function shade(X, Y, x, y) {
  for (const [cx, cy, rx, ry] of SHADOWS) {
    const d = Math.hypot((X - cx) / rx, (Y - cy) / ry);
    if (d < 1 && (d < 0.8 || bayer(x, y) < (1 - d) * 5)) return 1;
  }
  return 0;
}
const sh = (ramp, lv, X, Y, x, y) => ramp[clamp(lv - shade(X, Y, x, y), 0, ramp.length - 1)];

// ------------------------------------------------------------------ sky
function sky(S, M, hour, t) {
  const [top, mid, hor] = skyAt(hour), tint = keyed(AURAKEYS, hour)[0];
  for (let i = 0; i < NB; i++) {
    const u = i / (NB - 1), c = u < 0.55 ? mix(top, mid, u / 0.55) : mix(mid, hor, (u - 0.55) / 0.45);
    PAL.rgb[SKY[i]] = c.map(Math.round);
    PAL.rgb[AUR1[i]] = mix(c, tint, 0.26).map(Math.round);
    PAL.rgb[AUR2[i]] = mix(c, tint, 0.5).map(Math.round);
    if (FX.flash > 0) for (const R0 of [SKY, AUR1, AUR2]) PAL.rgb[R0[i]] = mix(PAL.rgb[R0[i]], [246, 240, 255], FX.flash * (R0 === SKY ? 0.75 : 0.6)).map(Math.round);
  }
  const [vx, vy] = V.vortex;
  each(M, M.ox, 0, M.ox + M.w / M.s + 1, 180, (x, y, X, Y) => {
    const b = clamp(Math.floor((Y / 112) * (NB - 1) + (bayer(x, y) - 0.5) * 0.9 + 0.5), 0, NB - 1);
    // the aura: the sky darkens toward violet round the tower, in two dithered steps
    const d = Math.hypot((X - vx) / 118, (Y - vy) / 92);
    const th = bayer(x, y);
    const a2 = FX.defeated ? 0 : clamp((0.62 - d) * 14 + 0.5, 0, 1), a1 = FX.defeated ? 0 : clamp((0.95 - d) * 12 + 0.5, 0, 1);
    S.set(x, y, a2 > th ? AUR2[b] : a1 > th ? AUR1[b] : SKY[b]);
  });
  if (night(hour)) {
    const rng = rnd(41), n = Math.round(M.w * M.h / (M.lod === 'insert' ? 60 : 80));
    for (let i = 0; i < n; i++) {
      const sx = M.x0 + Math.floor(rng() * M.w), sy = M.y0 + Math.floor(rng() * M.h * 0.55), big = rng() < 0.08, ph = rng() * 6.28, sp = 1 + rng() * 2;
      const tw = Math.sin(t * sp + ph);
      S.set(sx, sy, tw > 0.7 ? STAR[2] : tw > -0.3 ? STAR[1] : STAR[0]);
      if (big && M.lod === 'insert' && tw > 0.2) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) S.set(sx + dx, sy + dy, STAR[0]);
    }
    // a shooting star now and then
    const ph = frac(t / 9);
    if (M.lod === 'insert' && ph < 0.08) {
      const u = ph / 0.08, x = M.x0 + 40 + u * 90, y = M.y0 + 18 + u * 26;
      for (let k = 0; k < 8; k++) S.set(Math.round(x - k * 2), Math.round(y - k * 1.2), k < 2 ? STAR[2] : STAR[k < 5 ? 1 : 0]);
    }
  }
}

function sunMoon(S, M, hour, t) {
  const ins = M.lod === 'insert';
  if (hour > 5.4 && hour < 19.3) {
    const u = (hour - 5.4) / (19.3 - 5.4);
    const X = 20 + 150 * u, Y = 92 - Math.sin(u * Math.PI) * 70;
    const low = hour < 7 || hour > 17.4;
    PAL.rgb[SUN[0]] = low ? [255, 206, 140] : [255, 250, 228];
    PAL.rgb[SUN[1]] = low ? [255, 176, 120] : [255, 240, 200];
    const band = clamp(Math.floor((Y / 112) * (NB - 1)), 0, NB - 1);
    PAL.rgb[SUN[2]] = mix(PAL.rgb[SKY[band]], PAL.rgb[SUN[1]], 0.4).map(Math.round);
    PAL.rgb[SUN[3]] = mix(PAL.rgb[SKY[band]], PAL.rgb[SUN[1]], 0.2).map(Math.round);
    const x = M.sx(X), y = M.sy(Y), r = (low ? 8 : 6.5) * (ins ? 1 : 0.5) + (ins ? 0 : 0.6);
    for (let yy = Math.floor(y - r * 3); yy <= y + r * 3; yy++) for (let xx = Math.floor(x - r * 3); xx <= x + r * 3; xx++) {
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / r;
      if (d > 1 && d < 3 && bayer(xx, yy) < (d < 1.7 ? 0.55 : 0.2)) S.set(xx, yy, d < 1.7 ? SUN[2] : SUN[3]);
    }
    S.ellipse(x, y, r + 1, r + 1, SUN[1]); S.ellipse(x, y, r, r, SUN[0]);
  } else {
    const x = M.sx(52), y = M.sy(26), r = ins ? 7 : 2.5;
    for (let yy = Math.floor(y - r * 2.8); yy <= y + r * 2.8; yy++) for (let xx = Math.floor(x - r * 2.8); xx <= x + r * 2.8; xx++) {
      const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / r;
      if (d > 1.1 && d < 2.8 && bayer(xx, yy) < (d < 1.8 ? 0.35 : 0.12)) S.set(xx, yy, STAR[0]);
    }
    S.ellipse(x, y, r, r, LUNA[1]);
    S.ellipse(x - r * 0.28, y - r * 0.28, r * 0.62, r * 0.62, LUNA[2]);
    if (ins) for (const [a, b, q] of [[2, 1.6, 1.3], [-2.6, 2.6, 1], [2.8, -2, 0.8]]) S.ellipse(x + a, y + b, q, q, LUNA[0]);
  }
}

// ------------------------------------------------------------------ clouds
const CLOUD_SET = [
  // [x, y, w, h, speed px/s]  back layer (small, slow) then front layer (big, faster)
  [30, 22, 50, 11, 1.0], [150, 12, 38, 9, 1.0], [262, 30, 44, 10, 1.0],
  [90, 50, 74, 17, 2.6], [228, 62, 56, 14, 2.6], [360, 44, 60, 15, 2.6],
];
function cloudColors(hour) { const c = keyed(CLOUDKEYS, hour); CLOUD.forEach((i, j) => (PAL.rgb[i] = c[j].map(Math.round))); }
/** a cumulus: rounded lobes on a flat base; bright rim toward the sun, a shadowed belly, a dark underside line */
function cumulus(S, M, cx, cy, W, H, seed, sunLeft) {
  const rng = rnd(seed), n = 3 + Math.floor(W / 14);
  const lobes = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, r = H * (0.5 + 0.5 * Math.sin(Math.PI * u)) * (0.8 + rng() * 0.4);
    lobes.push([cx - W / 2 + W * u + (rng() - 0.5) * 4, cy - r * 0.3, r]);
  }
  const base = cy + H * 0.3;
  const inside = (X, Y) => { if (Y > base) return 0; for (const [lx, ly, r] of lobes) { const dx = X - lx, dy = (Y - ly) * 1.2; if (dx * dx + dy * dy < r * r) return 1; } return 0; };
  const e = 1 / M.s;
  each(M, cx - W / 2 - H, cy - H * 1.6, cx + W / 2 + H, base + 1, (x, y, X, Y) => {
    if (!inside(X, Y)) return;
    const up = inside(X, Y - 1.6 * e), side = inside(X + (sunLeft ? -2 : 2) * e, Y - 0.6 * e), below = !inside(X, Y + e);
    let c = CLOUD[3];
    if (below) c = CLOUD[1];
    else if (Y > base - H * 0.28) c = bayer(x, y) < 0.5 || Y > base - H * 0.14 ? CLOUD[2] : CLOUD[3];
    else if (!up || !side) c = CLOUD[4];
    else if (Y > cy - H * 0.2 && !inside(X + (sunLeft ? 3 : -3) * e, Y + 2 * e) && bayer(x, y) < 0.6) c = CLOUD[2];
    S.set(x, y, c);
  });
}
function clouds(S, M, hour, t) {
  cloudColors(hour);
  const sunLeft = hour < 12.5 || night(hour);
  CLOUD_SET.forEach(([cx, cy, W, H, sp], i) => {
    const span = 480, X = ((cx + t * sp + 80) % span + span) % span - 80;
    cumulus(S, M, X, cy, W, H, i * 31 + 7, sunLeft);
  });
  if (M.lod === 'insert' && !night(hour)) for (const [cx, cy, L] of [[40, 8, 44], [196, 26, 36], [300, 12, 30]]) {
    const x = ((cx + t * 0.5) % 380 + 380) % 380 - 30;
    for (let i = 0; i < L; i++) { const yy = cy + (i > L * 0.6 ? 1 : 0) + (i > L * 0.85 ? 1 : 0); S.set(M.x0 + Math.round(x + i), M.y0 + yy, CLOUD[i < 3 || i > L - 4 ? 2 : 3]); if (i > L * 0.2 && i < L * 0.5) S.set(M.x0 + Math.round(x + i + 3), M.y0 + yy - 1, CLOUD[2]); }
  }
}

// ------------------------------------------------------------------ the storm over the tower
/** a slow spiral of dark cloud turning over the tower; lightning flickers inside it every few seconds */
function vortex(S, M, t, hour) {
  const [cx, cy] = V.vortex, rx = 104, ry = 26;
  const flashOn = (() => { const p = t / 3.3, k = Math.floor(p), f = frac(p); return f < 0.05 || (f > 0.09 && f < 0.12) ? k : -1; })();
  const fX = flashOn >= 0 ? cx + (hash(flashOn, 5) - 0.5) * 110 : 0, fY = flashOn >= 0 ? cy + 6 + hash(flashOn, 6) * 12 : 0;
  each(M, cx - rx, cy - ry, cx + rx, cy + ry, (x, y, X, Y) => {
    const dx = (X - cx) / rx, dy = (Y - cy) / ry, r = Math.hypot(dx, dy);
    if (r > 1) return;
    const a = Math.atan2(dy, dx);
    const s = frac(a / (Math.PI * 2) * 3 + Math.log(r + 0.08) * 0.9 - t * 0.045);
    const dens = (1 - r * r) * 0.62 + 0.18;
    const th = (bayer(x, y) - 0.5) * 0.1;
    if (s + th > dens) return;
    let lv = s < 0.1 ? 4 : s < 0.3 ? 3 : 2;
    if (r < 0.2) lv = 1;
    if (Y > cy + ry * 0.55 && lv > 2) lv -= 1;            // the underside is darker
    let c = C.vortex[lv], f = N;
    if (flashOn >= 0) { const d = Math.hypot(X - fX, (Y - fY) * 2); if (d < 30) { c = d < 14 ? FLASH[0] : C.vortex[5]; f = EMIT; } }
    S.set(x, y, c, f);
  });
  if (flashOn >= 0 && M.lod === 'insert') {
    let px = fX, py = fY;
    for (let i = 0; i < 6; i++) { const nx = px + (hash(flashOn * 7 + i, 8) - 0.5) * 10, ny = py + 3; S.line(M.sx(px), M.sy(py), M.sx(nx), M.sy(ny), FLASH[1]); px = nx; py = ny; }
  }
}

// ------------------------------------------------------------------ the far range
const FAR0 = [[36, 74, 1.0], [132, 70, 1.1], [250, 76, 0.9], [306, 72, 1.0]];
const FAR = [[4, 62, 1.25], [60, 72, 1.1], [104, 56, 1.3], [160, 70, 1.15], [270, 60, 1.25], [326, 70, 1.1]];
function peaks(S, M, list, ramp, snowRamp, sunLeft, far) {
  const ins = M.lod === 'insert';
  for (const [px, py, k] of list) {
    const hw = (104 - py) * k * 1.3;
    each(M, px - hw - 4, py - 1, px + hw + 4, 104, (x, y, X, Y) => {
      const jag = (vn(X * 0.35, px) - 0.5) * 3 + (vn(X * 1.3, px + 9) - 0.5) * 1.4;
      const edge = py + Math.abs(X - px) / (k * 1.3) + jag;
      if (Y < edge) return;
      const ridge = px + (vn(Y * 0.18, px + 3) - 0.5) * 7 + (Y - py) * (sunLeft ? 0.35 : -0.35);
      const lit = sunLeft ? X < ridge : X > ridge;
      const dy = Y - edge;
      let c = lit ? ramp[far ? 3 : 4] : ramp[far ? 2 : 2];
      if (!lit && dy > 10) c = ramp[1];
      if (lit && dy > 16 && !far) c = ramp[3];
      // gullies: short strokes running down the slope
      if (ins && !far && dy > 5 && dy < 30 && hash(Math.floor(X / 3) * 17 + Math.floor(Y / 5), px) < 0.16 && (Math.floor(X) + Math.floor(Y)) % 3 === 0) c = lit ? ramp[2] : ramp[0];
      // snow on the tops, a jagged lower edge
      const snowLine = py + 10 + (vn(X * 0.6, px + 5) - 0.3) * 9;
      if (Y < snowLine && Y < 84) c = lit ? snowRamp[far ? 3 : 4] : snowRamp[far ? 1 : 2];
      if (dy < 1 && ins) c = lit ? snowRamp[4] : (Y < snowLine ? snowRamp[3] : ramp[3]);
      S.set(x, y, c, N);
    });
  }
}
function farRange(S, M, hour) {
  const sunLeft = hour < 12.5;
  peaks(S, M, FAR0, C.far0, C.snow, sunLeft, true);
  peaks(S, M, FAR, C.far, C.snow, sunLeft, false);
}

// ------------------------------------------------------------------ the crag and the tower
function cragTop(X) {
  // a plateau under the tower and jagged spires either side
  const sp = [[190, 74, 2.8], [238, 76, 2.8], [180, 90, 2.2], [250, 90, 2.2], [168, 104, 1.6], [262, 102, 1.6]];
  let top = X >= 203 && X <= 226 ? 81 + (vn(X * 0.8, 3) - 0.5) * 1.5 : 200;
  for (const [sx, sy, k] of sp) top = Math.min(top, sy + Math.abs(X - sx) * k + (vn(X * 0.9, sx) - 0.5) * 3);
  // the shoulders fall away to the plateau
  top = Math.min(top, 80 + Math.max(0, Math.abs(X - 214) - 12) * 0.9 + (vn(X * 0.5, 11) - 0.5) * 3);
  return top;
}
function crag(S, M, hour) {
  const ins = M.lod === 'insert', sunLeft = hour < 12.5;
  each(M, 150, 60, 290, 118, (x, y, X, Y) => {
    const T = cragTop(X);
    if (Y < T) return;
    const slope = cragTop(X + 1) - cragTop(X - 1);          // >0: the face turns toward the left
    const facingSun = sunLeft ? slope > 0.4 : slope < -0.4;
    const dy = Y - T;
    let lv = facingSun ? 4 : slope === 0 ? 3 : 2;
    if (dy > 6) lv = Math.min(lv, 3);
    if (dy > 14) lv = 2;
    // vertical cracks and horizontal ledges
    if (ins) {
      const cx = Math.floor(X / 5), crack = hash(cx, 21) < 0.35 && Math.abs(X - (cx * 5 + 2)) < 0.6 && dy > 2;
      if (crack) lv = Math.max(0, lv - 2);
      if (Math.floor(Y) % 7 === 0 && hash(Math.floor(X / 6), Math.floor(Y / 7)) < 0.5 && dy > 3) lv = Math.min(5, lv + 1);
    }
    if (dy < 1) lv = facingSun ? 5 : 1;
    S.set(x, y, C.crag[lv], N);
  });
}

function tower(S, M, t, hour, fx) {
  const T = C.tower, ins = M.lod === 'insert', cx = V.tower.x;
  const eyeHot = fx.eye > 0.5, glow = (night(hour) || dusky(hour)) && !FX.defeated;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2) * Math.sin(t * 0.63 + 1);
  if (!ins) {
    // a handful of pixels that still read: spire, horns, turret, one bright eye, the pennant
    const X = Math.round(M.sx(cx)), yb = Math.round(M.sy(80)), yt = Math.round(M.sy(22));
    for (let y = yt + 3; y <= yb; y++) { S.set(X - 1, y, T[3], N); S.set(X, y, T[2], N); S.set(X + 1, y, T[1], N); }
    for (let y = Math.round(M.sy(58)); y <= yb; y++) S.set(X - 3, y, T[2], N);
    S.set(X - 3, Math.round(M.sy(56)), C.roofT[2], N);
    S.set(X, yt, C.roofT[2], N); S.set(X - 1, yt + 1, C.roofT[3], N); S.set(X, yt + 1, C.roofT[2], N); S.set(X + 1, yt + 1, C.roofT[1], N);
    S.set(X - 2, yt + 2, C.roofT[2], N); S.set(X + 2, yt + 2, C.roofT[1], N); S.set(X - 3, yt + 1, C.horn[2], N); S.set(X + 3, yt + 1, C.horn[2], N);
    S.set(X, yt - 1, T[1], N); S.set(X, yt - 2, T[1], N); if (!FX.defeated) S.set(X + 1, yt - 2, C.pennant[2 + (Math.floor(t * 3) % 2)], N);
    S.set(X, Math.round(M.sy(V.eye[1])), FX.defeated ? C.tower[0] : eyeHot ? C.eye[4] : C.eye[pulse > 0.6 || glow ? 3 : 2]);
    return;
  }
  const px = (x, y, c, f = N) => S.set(M.sx(x), M.sy(y), c, f);
  // body shading across a round tower: lit edge, face, shade, dark edge
  const shadeAt = (x, x0, x1) => { const v = (x - x0) / (x1 - x0); return v < 0.14 ? 4 : v < 0.5 ? 3 : v < 0.82 ? 2 : 1; };
  const stones = (x0, x1, y0, y1, seed) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const row = Math.floor((y - y0) / 3), mortar = (y - y0) % 3 === 2, joint = (x + row * 2 + seed) % 5 === 0;
      let lv = shadeAt(x, x0, x1);
      if (mortar || joint) lv = Math.max(0, lv - 1);
      if (x === x0) lv = 5;
      if (x === x1) lv = 0;
      px(x, y, T[lv]);
    }
  };
  // the side turret (left) and a buttress (right)
  stones(cx - 15, cx - 9, 56, 81, 1);
  for (let y = 47; y < 56; y++) { const hw = Math.round((y - 47) * 0.45); for (let x = cx - 12 - hw; x <= cx - 12 + hw; x++) px(x, y, x < cx - 12 ? C.roofT[3] : C.roofT[1]); }
  px(cx - 12, 45, T[1]); px(cx - 12, 46, T[1]);
  for (let y = 64; y <= 81; y++) { const w = Math.round((y - 64) * 0.3); for (let x = cx + 7; x <= cx + 8 + w; x++) px(x, y, T[x === cx + 7 ? 2 : 1]); }
  // the keep
  stones(cx - 6, cx + 6, 36, 81, 0);
  // the upper stage, narrower, over a ring of battlements
  stones(cx - 4, cx + 4, 25, 35, 3);
  for (let x = cx - 8; x <= cx + 8; x++) {
    px(x, 36, T[x < cx - 3 ? 5 : x < cx + 2 ? 4 : 2]); px(x, 37, T[1]); px(x, 38, T[0]);
    if (((x - cx + 8) % 3) !== 1) { px(x, 34, T[x < cx ? 4 : 2]); px(x, 35, T[x < cx ? 3 : 2]); }
  }
  // the roof: a tall dark cone with a flared eave, and two horns curling out of it
  for (let y = 8; y < 26; y++) {
    const hw = Math.round((y - 8) * 0.34 + (y > 22 ? (y - 22) * 0.9 : 0));
    for (let x = cx - hw; x <= cx + hw; x++) {
      const v = (x - (cx - hw)) / Math.max(1, 2 * hw);
      let lv = v < 0.3 ? 3 : v < 0.7 ? 2 : 1;
      if ((y + Math.floor((x - cx) / 2)) % 4 === 0 && y > 12) lv = Math.max(0, lv - 1);   // tile rows
      if (y === 25) lv = 0;
      px(x, y, C.roofT[lv]);
    }
  }
  for (const s of [-1, 1]) {
    // a horn: out from the eave, curling up, thick at the root and tapering to a point
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, a = u * 2.1, x = cx + s * (3 + Math.sin(a) * 6.5), y = 22 - (1 - Math.cos(a)) * 5.2 - u * 1.5;
      const th = u < 0.45 ? 1 : 0;
      px(Math.round(x), Math.round(y), C.horn[u < 0.3 ? 1 : u < 0.7 ? 2 : 3]);
      if (th) { px(Math.round(x), Math.round(y) + 1, C.horn[0]); px(Math.round(x) - s, Math.round(y) + 1, C.horn[0]); }
    }
  }
  // the spike on top and the pennant, waving
  for (let y = 0; y < 8; y++) px(cx, y, T[y < 2 ? 3 : 1]);
  for (let i = 0; i < (FX.defeated ? 0 : 10); i++) {
    const wv = Math.round(Math.sin(t * 5.5 - i * 0.7) * (i / 10) * 2);
    const len = i < 6 ? 3 : i < 9 ? 2 : 1;
    for (let j = 0; j < len; j++) px(cx + 1 + i, 1 + j + wv, C.pennant[j === 0 ? 3 : j === len - 1 ? 1 : 2]);
  }
  // the eye: a round window under the battlements that glows and pulses (white-hot when it strikes)
  const [ex, ey] = V.eye;
  const eyeLv = FX.defeated ? 1 : eyeHot ? 4 : glow ? (pulse > 0.5 ? 4 : 3) : pulse > 0.6 ? 3 : 2;
  const EYE = ['..###..', '.#ooo#.', '#oOPOo#', '.#ooo#.', '..###..'];
  EYE.forEach((row, j) => [...row].forEach((q, i) => {
    if (q === '.') return;
    if (FX.defeated) { px(ex - 3 + i, ey - 2 + j, q === '#' ? T[0] : T[1]); return; }      // the eye has gone out
    const c = q === '#' ? C.eye[0] : q === 'P' ? (eyeHot ? C.eye[4] : C.eye[0]) : q === 'O' ? C.eye[eyeLv] : C.eye[eyeLv - 1];
    px(ex - 3 + i, ey - 2 + j, c, q === '#' ? N : EMIT);
  }));
  if (glow || eyeHot) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = 5 + (k % 2); if (bayer(k, 1) < 0.6) px(ex + Math.round(Math.cos(a) * r), ey + Math.round(Math.sin(a) * r * 0.7), C.eye[1], EMIT); }
  // slit windows, lit at dusk and at night; the gate, faintly red inside
  for (const [x, y] of [[cx - 2, 50], [cx + 2, 62], [cx - 12, 64], [cx, 29]]) { px(x, y, glow ? C.eye[3] : C.tower[0], glow ? EMIT : N); px(x, y + 1, glow ? C.eye[2] : C.tower[0], glow ? EMIT : N); }
  for (let y = 74; y <= 81; y++) for (let x = cx - 2; x <= cx + 2; x++) { if (y === 74 && Math.abs(x - cx) === 2) continue; if (FX.defeated) px(x, y, T[0]); else px(x, y, y > 78 ? C.eye[1] : C.eye[0], EMIT); }
}

// ------------------------------------------------------------------ the plateau, the waterfall, the escarpment
const plateauTop = (X) => 99 + Math.sin(X * 0.035 + 1.4) * 4 + Math.sin(X * 0.013) * 3 + (vn(X * 0.2, 4) - 0.5) * 2;
function plateau(S, M, t) {
  const ins = M.lod === 'insert';
  each(M, M.ox - 2, 90, M.ox + M.w / M.s + 2, 124, (x, y, X, Y) => {
    const T = plateauTop(X);
    if (Y < T) return;
    const d = Y - T;
    let c;
    if (ins) {
      // a calm highland: lit grass near the rim, a shade lower down, soft dithered folds, clumps of distant trees
      let lv = d < 1 ? 5 : d < 5 ? 4 : 3;
      if (d >= 4 && d < 6 && bayer(x, y) < 0.5) lv = 4;
      const fold = Math.sin(X * 0.06 + d * 0.5) + Math.sin(X * 0.023 - 1);
      if (d > 6 && fold > 1.2 && bayer(x, y) < 0.5) lv = 4;
      const ci = Math.floor(X / 9), crow = Math.floor((d - 2) / 5);
      if (d > 2 && hash(ci * 5 + crow, 12) < 0.4) {
        const ccx = ci * 9 + 2 + hash(ci + crow * 3, 13) * 5, ccy = 2 + crow * 5 + 2, w2 = 2 + hash(ci + crow, 14) * 2.5;
        const dx = (X - ccx) / w2, dy2 = (d - ccy) / 1.6;
        if (dx * dx + dy2 * dy2 < 1) lv = dy2 < -0.3 && dx < 0.3 ? 3 : 2;
        else if (Math.abs(dx) < 1 && dy2 >= 1 && dy2 < 1.7) lv = 2;                    // its shadow
      }
      c = sh(C.hillB, lv, X, Y, x, y);
    } else c = sh(C.hillB, d < 1 ? 5 : 4, X, Y, x, y);
    if (!ins) c = C.hillB[d < 1.5 ? 5 : 4];
    S.set(x, y, c, N);
  });
}
/** the waterfall: over the left cliff's edge into the woods, a cloud of spray at its foot */
function waterfall(S, M, t) {
  const ins = M.lod === 'insert';
  const wx = 64, wy0 = V.cliffL[2] - 1, wy1 = 124;
  each(M, wx - 6, wy0 - 2, wx + 6, wy1, (x, y, X, Y) => {
    if (Math.abs(X - wx) > 5) return;
    if (Math.abs(X - wx) > 3.6) return;
    const s = frac((Y - t * 34) / 6 + Math.floor(X) * 0.37);
    S.set(x, y, C.water[s < 0.25 ? 4 : X < wx - 1 ? 3 : 2], N);
  });
  // a stream from the plateau above feeding it
  each(M, wx - 16, wy0 - 8, wx + 4, wy0, (x, y, X, Y) => { const cxs = wx - (wy0 - Y) * 2.2; if (Math.abs(X - cxs) < 1.6) S.set(x, y, C.water[frac(X * 0.3 + t * 2) < 0.3 ? 4 : 3], N); });
  if (!ins) return;
  for (let k = 0; k < 22; k++) {
    const a = frac(t * 0.5 + k / 22), x = wx + Math.sin(k * 2.3) * 12 * a, y = wy1 - 2 - a * 8 + a * a * 5;
    const r = a < 0.5 ? 1 : 0;
    for (let dy = 0; dy <= r; dy++) for (let dx = 0; dx <= r; dx++) S.set(M.sx(Math.round(x) + dx), M.sy(Math.round(y) + dy), C.mist[a < 0.45 ? 3 : 2], N);
  }
}
/** the escarpments: bands of rock under the plateau; the road runs along the right one's top edge */
function escarpment(S, M, hour) {
  cliffBand(S, M, hour, ...V.ledge, 128, 7);
  cliffBand(S, M, hour, ...V.cliffL, 119, 17);
}
function cliffBand(S, M, hour, x0, x1, top, bot, seed) {
  const ins = M.lod === 'insert', sunLeft = hour < 12.5;
  each(M, x0 - 10, top - 1, x1 + 10, bot + 4, (x, y, X, Y) => {
    const T = top + (vn(X * 0.3, seed) - 0.5) * 1.2 + (X < x0 ? (x0 - X) * 1.2 : 0) + (X > x1 ? (X - x1) * 1.2 : 0);
    const B = bot + (vn(X * 0.2, seed + 1) - 0.5) * 4;
    if (Y < T || Y > B) return;
    const dy = Y - T;
    // rock in irregular vertical columns: each has a lit face and a shaded face; dark cracks between; ledges
    const q = X * 0.22 + vn(Y * 0.12, seed + 2) * 0.8, col = Math.floor(q), f = q - col;
    const litSide = sunLeft ? f < 0.45 : f > 0.55;
    let lv = dy < 1.2 ? 5 : f < 0.1 || f > 0.93 ? 1 : litSide ? 4 : 2;
    if (lv === 4 && hash(col * 7 + Math.floor(Y / 4), seed + 32) < 0.25) lv = 3;
    if (ins && dy > 2 && Math.floor(Y + hash(col, seed + 33) * 5) % 6 === 0 && lv > 1) lv = litSide ? 5 : 3;   // little ledges catch the light
    if (dy > B - T - 4) lv = Math.max(1, lv - 1);
    if (Y > B - 1.5) lv = 1;
    S.set(x, y, sh(C.rock, lv, X, Y, x, y), N);
  });
}

// ------------------------------------------------------------------ the forest belt
function forest(S, M, t) {
  const ins = M.lod === 'insert';
  if (!ins) {
    each(M, M.ox - 2, 114, M.ox + M.w / M.s + 2, 136, (x, y, X, Y) => {
      const T = 119 + Math.sin(X * 0.08) * 2 + (vn(x * 0.7, 3) - 0.5) * 5;
      if (Y < T || Y > 134) return;
      const q = hash((x >> 1) * 7 + (y >> 1) * 131, 4), top = Y - T < 3;
      S.set(x, y, C.forest[top ? (q < 0.5 ? 4 : 3) : q < 0.3 ? 2 : q > 0.85 ? 4 : 3], N);
    });
    return;
  }
  // crowns in three rows, back to front; each crown a dome with a dark rim, a lit cap toward the sun, a highlight
  const rows = [[118, 4.5, 0], [124, 5.5, 1], [131, 6.5, 2]];
  for (const [ry, r, k] of rows) {
    for (let X = -6 + k * 3; X < 330; X += r * 1.5) {
      const jx = X + (hash(Math.floor(X), 40 + k) - 0.5) * 3, jy = ry + (hash(Math.floor(X), 50 + k) - 0.5) * 3 + Math.sin(jx * 0.05) * 2;
      if (onPath(jx, jy, r + 2)) continue;
      if (k === 0 && ((jx > V.ledge[0] - 4 && jx < V.ledge[1]) || (jx > V.cliffL[0] - 4 && jx < V.cliffL[1] + 4))) continue;   // the cliffs show above the woods
      if (k === 1 && jx > V.ledge[0] + 2 && jx < V.ledge[1] - 4) continue;
      if (jx > 150 && jx < 176 && jy > 126) continue;                  // the clearing where the road comes up
      const rr = r * (0.85 + hash(Math.floor(X), 60 + k) * 0.35);
      each(M, jx - rr - 1, jy - rr - 1, jx + rr + 1, jy + rr + 3, (x, y, Xp, Yp) => {
        const dx = (Xp - jx) / rr, dy = (Yp - jy) / (rr * 0.9);
        const bump = Math.sin(Math.atan2(dy, dx) * 5 + jx) * 0.08;
        const d = Math.hypot(dx, dy) - bump;
        if (d > 1 || Yp > jy + rr * 0.6 + 2) return;
        const l = -dx * 0.6 - dy * 0.8;                                  // light from the upper left
        let lv = d > 0.86 ? 1 : l > 0.45 ? 5 : l > 0.05 ? 4 : l > -0.35 ? 3 : 2;
        if (lv === 4 && bayer(x, y) < 0.2) lv = 3;
        if (lv === 5 && bayer(x, y) < 0.3) lv = 4;
        S.set(x, y, sh(C.forest, lv - (2 - k) * 0 - (k === 0 ? 1 : 0), Xp, Yp, x, y), N);
      });
    }
  }
}
/** is (X,Y) within r of the road? */
function onPath(X, Y, r) {
  const P = V.path;
  for (let i = 1; i < P.length; i++) {
    const [ax, ay] = P[i - 1], [bx, by] = P[i], vx = bx - ax, vy = by - ay;
    const u = clamp(((X - ax) * vx + (Y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
    if (Math.hypot(X - ax - vx * u, Y - ay - vy * u) < r) return true;
  }
  return false;
}

// ------------------------------------------------------------------ fields and meadow
const meadowTop = (X) => 133 + Math.sin(X * 0.03 + 2.2) * 3 + Math.sin(X * 0.09) * 1;
// patchwork fields: [quad corners, kind]
const FIELDS = [
  [[[20, 138], [74, 136], [86, 150], [26, 154]], 'wheat'], [[[76, 136], [118, 135], [118, 147], [88, 149]], 'green'],
  [[[26, 156], [88, 152], [96, 164], [34, 170]], 'soil'], [[[176, 137], [226, 136], [232, 144], [180, 146]], 'wheat'],
];
const inQuad = (q, X, Y) => { let inside = false; for (let i = 0, j = 3; i < 4; j = i++) { const [ax, ay] = q[j], [bx, by] = q[i]; if ((ay > Y) !== (by > Y) && X < ax + (Y - ay) * (bx - ax) / (by - ay)) inside = !inside; } return inside; };
function gustAt(X, t) { const g = ((t * 46) % 560) - 120; const d = X - g; return d > -30 && d < 8 ? (d < 0 ? 1 + d / 30 : 1 - d / 8) : 0; }
function meadow(S, M, t) {
  const ins = M.lod === 'insert';
  each(M, M.ox - 2, 126, M.ox + M.w / M.s + 2, 180, (x, y, X, Y) => {
    const T = meadowTop(X);
    if (Y < T) return;
    const d = Y - T;
    let c = sh(C.meadow, d < 1 ? 5 : d < 6 ? 4 : d < 24 ? 3 : 3, X, Y, x, y);
    if (ins) {
      // dithered bands of lighter grass where the land rolls toward the light
      const roll = Math.sin(X * 0.05 + Y * 0.22) + Math.sin(X * 0.021 - Y * 0.1);
      if (roll > 1.1 && bayer(x, y) < 0.5) c = sh(C.meadow, 4, X, Y, x, y);
      if (roll < -1.3 && bayer(x, y) < 0.5) c = sh(C.meadow, 2, X, Y, x, y);
      for (const [q, kind] of FIELDS) if (inQuad(q, X, Y)) {
        const g = gustAt(X, t);
        if (kind === 'wheat') { const row = Math.floor(Y) % 3; let lv = row === 0 ? 4 : row === 1 ? 3 : 2; if (g > 0.3 && row !== 2) lv += 1; c = sh(C.wheat, lv, X, Y, x, y); }
        else if (kind === 'green') { const row = (Math.floor(X * 0.5 + Y)) % 3; c = sh(C.meadow, row === 0 ? 2 : g > 0.3 ? 5 : 4, X, Y, x, y); }
        else { const row = Math.floor(Y) % 2; c = sh(C.soil, row ? 2 : 3, X, Y, x, y); }
        // hedges on the edges
        if (!inQuad(q, X, Y - 1.2) || !inQuad(q, X - 1.2, Y) || !inQuad(q, X + 1.2, Y)) c = C.forest[(Math.floor(X) % 3) ? 2 : 3];
        break;
      }
    } else if (d > 3 && hash((x >> 1) * 13 + (y >> 1) * 71, 5) < 0.12) c = C.meadow[2];
    S.set(x, y, c, N);
  });
}

// ------------------------------------------------------------------ the road
function road(S, M, hour) {
  const P = V.path, ins = M.lod === 'insert';
  const wAt = (Y) => Math.max(0.7, (Y - 82) / 7.5);
  // body first, then the edges on top, so the curves stay clean
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i + 1 < P.length; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
    for (let k = 0; k <= n; k++) {
      const u = k / n, X = ax + (bx - ax) * u, Y = ay + (by - ay) * u, w = wAt(Y) / 2;
      if (!ins) { S.set(Math.round(M.sx(X)), Math.round(M.sy(Y)), C.path[3], N); continue; }
      for (let d = -w; d <= w; d += 0.5) {
        const x = Math.round(X + d), y = Math.round(Y);
        const e = Math.abs(d) > w - 0.9;
        if (pass === 0 && !e) {
          let lv = 4;
          if (Y > 150 && Math.abs(Math.abs(d) - w * 0.45) < 0.5) lv = 3;          // wheel ruts
          if (hash(x * 7 + y * 13, 71) < 0.05) lv = 5; else if (hash(x * 5 + y * 11, 72) < 0.05) lv = 2;
          S.set(M.x0 + x, M.y0 + y, sh(C.path, lv, x, y, x, y), N);
        }
        if (pass === 1 && e) S.set(M.x0 + x, M.y0 + y, sh(C.path, d > 0 ? 1 : 2, x, y, x, y), N);
      }
    }
  }
  if (!ins) return;
  // fence along the lower bend, and a signpost where a track turns off to the fields
  const fence = [[170, 180], [166, 172], [160, 165], [153, 159], [146, 154], [139, 150]];
  for (let i = 0; i + 1 < fence.length; i++) {
    const [ax, ay] = fence[i], [bx, by] = fence[i + 1], ha = Math.round(3 + (ay - 150) * 0.12), hb = Math.round(3 + (by - 150) * 0.12);
    S.line(M.x0 + ax, M.y0 + ay - ha, M.x0 + bx, M.y0 + by - hb, C.timber[3], N);
    S.line(M.x0 + ax, M.y0 + ay - Math.round(ha * 0.45), M.x0 + bx, M.y0 + by - Math.round(hb * 0.45), C.timber[2], N);
  }
  for (const [fx, fy] of fence) { const h = Math.round(4 + (fy - 150) * 0.14); S.vline(M.x0 + fx, M.y0 + fy - h, M.y0 + fy, C.timber[1], N); S.set(M.x0 + fx, M.y0 + fy - h, C.timber[4], N); S.set(M.x0 + fx + 1, M.y0 + fy, C.meadow[1], N); }
  S.vline(M.x0 + 118, M.y0 + 142, M.y0 + 152, C.timber[1], N);
  S.rect(M.x0 + 113, M.y0 + 142, 9, 3, C.timber[3], N); S.hline(M.x0 + 113, M.x0 + 121, M.y0 + 142, C.timber[4], N); S.set(M.x0 + 112, M.y0 + 143, C.timber[3], N);
  S.hline(M.x0 + 114, M.x0 + 119, M.y0 + 143, C.timber[1], N);
}

// ------------------------------------------------------------------ bushes, flowers, grass
function bush(S, M, bx, by, r, t) {
  const rr = r;
  each(M, bx - rr - 1, by - rr, bx + rr + 1, by + 2, (x, y, X, Y) => {
    const dx = (X - bx) / rr, dy = (Y - by) / (rr * 0.75);
    const d = Math.hypot(dx, dy) - Math.sin(Math.atan2(dy, dx) * 6 + bx) * 0.08;
    if (d > 1 || Y > by + 1) return;
    const l = -dx * 0.6 - dy * 0.8;
    let lv = d > 0.85 ? 1 : l > 0.5 ? 5 : l > 0.1 ? 4 : 3;
    if (Y > by - 1) lv = 1;
    S.set(x, y, sh(C.forest, lv, X, Y, x, y), N);
  });
}
function grass(S, M, t, hour) {
  if (M.lod !== 'insert') return;
  const rng = rnd(77);
  for (let i = 0; i < 260; i++) {
    const X = Math.floor(rng() * 320), Y = 140 + Math.floor(rng() * 40), tall = 2 + Math.floor(rng() * 2) + (Y > 162 ? 1 : 0);
    const fl = rng(), fc = Math.floor(rng() * 4);
    if (onPath(X, Y, (Y - 82) / 15 + 1) || Y < meadowTop(X) + 3) continue;
    if (FIELDS.some(([q]) => inQuad(q, X, Y))) continue;
    const g = gustAt(X, t), sway = Math.round(Math.sin(t * 1.7 + X * 0.2) * 0.6 + g * 2);
    for (let k = 0; k < tall; k++) {
      const off = k === tall - 1 ? sway : k === tall - 2 && Math.abs(sway) > 1 ? Math.sign(sway) : 0;
      S.set(M.x0 + X + off, M.y0 + Y - k, C.meadow[k === tall - 1 ? (g > 0.4 ? 6 : 5) : 4], N);
    }
    S.set(M.x0 + X + 1, M.y0 + Y, C.meadow[2], N);
    if (fl < 0.16) { S.set(M.x0 + X + sway, M.y0 + Y - tall, C.flower[fc], N); if (Y > 160) S.set(M.x0 + X + sway + 1, M.y0 + Y - tall, C.flower[fc], N); }
  }
}
function butterflies(S, M, hour, t) {
  if (M.lod !== 'insert' || night(hour) || dusky(hour)) return;
  for (let i = 0; i < 3; i++) {
    const X = 180 + i * 34 + Math.sin(t * 0.7 + i * 2) * 18, Y = 158 + Math.sin(t * 1.3 + i) * 6 + Math.sin(t * 5 + i) * 1.5;
    const up = Math.floor(t * 10 + i) % 2, c = C.butter[i % 3];
    const x = M.x0 + Math.round(X), y = M.y0 + Math.round(Y);
    S.set(x, y, C.ink[1], N);
    if (up) { S.set(x - 1, y - 1, c); S.set(x + 1, y - 1, c); } else { S.set(x - 1, y, c); S.set(x + 1, y, c); }
  }
}
function fireflies(S, M, hour, t) {
  if (!night(hour) || M.lod !== 'insert') return;
  for (let i = 0; i < 22; i++) {
    const X = 20 + hash(i, 5) * 280 + Math.sin(t * 0.6 + i) * 6, Y = 128 + hash(i, 6) * 46 + Math.sin(t * 0.9 + i * 2) * 3;
    const b = Math.sin(t * 2 + i * 1.7);
    if (b > 0.2) S.set(M.x0 + Math.round(X), M.y0 + Math.round(Y), C.fly[b > 0.8 ? 1 : 0]);
  }
}

// ------------------------------------------------------------------ sheep
function sheep(S, M, hour, t) {
  if (M.lod !== 'insert') return;
  V.sheep.forEach(([sx, sy], i) => {
    // graze: amble a few pixels, stop, head down, head up
    const cyc = frac(t / (9 + i * 2) + i * 0.3), walk = cyc < 0.3, X = sx + Math.sin(Math.floor(t / (9 + i * 2)) + i) * 6 + (walk ? cyc / 0.3 : 1) * 3 * (i % 2 ? -1 : 1);
    const down = !walk && Math.floor(t * 0.8 + i) % 3 !== 0;
    const x = M.x0 + Math.round(X), y = M.y0 + sy, dir = i % 2 ? -1 : 1;
    const W = C.wool;
    for (let j = -3; j <= 3; j++) for (let k = -2; k <= 0; k++) if (!(Math.abs(j) === 3 && k === -2)) S.set(x + j, y + k, W[k === -2 ? 3 : j * dir < -1 ? 1 : 2], N);
    S.set(x - dir, y - 3, W[3], N); S.set(x + dir, y - 3, W[3], N);
    const hx = x + dir * 4, hy = y + (down ? 0 : -2);
    S.set(hx, hy, C.ink[2], N); S.set(hx + dir, hy, C.ink[2], N); S.set(hx, hy - 1, C.ink[1], N);
    const step = walk && Math.floor(t * 6) % 2;
    S.set(x - 2, y + 1, C.ink[2], N); S.set(x + 2 - (step ? 1 : 0), y + 1, C.ink[2], N);
  });
}

// ------------------------------------------------------------------ windmill
function windmill(S, M, t) {
  const [mx, my] = V.windmill, ins = M.lod === 'insert';
  if (!ins) {
    const X = Math.round(M.sx(mx)), Y = Math.round(M.sy(my));
    if (X < M.x0 - 4 || X > M.x0 + M.w + 4) return;
    S.vline(X, Y, Y + 6, C.mill[4], N); S.vline(X + 1, Y + 1, Y + 6, C.mill[2], N); S.set(X, Y - 1, C.roof[2], N);
    const a = t * 0.9;
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 4; r++) S.set(Math.round(X + Math.cos(a + s * Math.PI / 2) * r), Math.round(Y + Math.sin(a + s * Math.PI / 2) * r), C.timber[1], N);
    return;
  }
  // the little hill it stands on
  each(M, mx - 30, my + 10, mx + 30, 136, (x, y, X, Y) => { const T = my + 14 + ((X - mx) / 26) ** 2 * 12; if (Y >= T) S.set(x, y, sh(C.meadow, Y < T + 1 ? 5 : 4, X, Y, x, y), N); });
  // body: a tapering tower, lit left, a door, a window
  for (let j = 0; j < 20; j++) { const hw = 3 + j * 0.16; for (let i = -Math.round(hw); i <= Math.round(hw); i++) S.set(M.x0 + mx + i, M.y0 + my + j, C.mill[i < -1 ? 4 : i < 1 ? 3 : i < Math.round(hw) ? 2 : 1], N); }
  S.rect(M.x0 + mx - 1, M.y0 + my + 15, 3, 5, C.timber[1], N); S.set(M.x0 + mx - 1, M.y0 + my + 7, C.timber[1], N); S.set(M.x0 + mx - 1, M.y0 + my + 8, C.timber[1], N);
  for (let j = -3; j <= 0; j++) { const hw = 4 + j; for (let i = -hw; i <= hw; i++) S.set(M.x0 + mx + i, M.y0 + my + j, C.roof[i < 0 ? 4 : 2], N); }
  // four sails with lattice, turning
  const a0 = t * 0.9, hx = mx, hy = my + 1;
  for (let s = 0; s < 4; s++) {
    const a = a0 + s * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let r = 1; r <= 15; r++) {
      S.set(M.x0 + Math.round(hx + ca * r), M.y0 + Math.round(hy + sa * r), C.timber[1], N);
      if (r > 3) for (let q = 1; q <= 3; q++) {
        const c = (r % 3 === 0 || q === 3) ? C.timber[2] : C.sail[s % 2 ? 2 : 3];
        S.set(M.x0 + Math.round(hx + ca * r - sa * q), M.y0 + Math.round(hy + sa * r + ca * q), c, N);
      }
    }
  }
  S.set(M.x0 + hx, M.y0 + hy, C.timber[0], N);
}

// ------------------------------------------------------------------ birds
function birds(S, M, hour, t) {
  if (night(hour)) return;
  const period = 13, ph = frac(t / period);
  if (ph > 0.6) return;
  const u = ph / 0.6;
  for (let i = 0; i < 4; i++) {
    const X = -20 + u * 380 + [0, -8, -13, -20][i], Y = 58 + [0, 4, -3, 2][i] - u * 14 + Math.sin(u * 8 + i) * 2;
    const up = Math.floor(t * 7 + i * 1.5) % 2 === 0;
    const px = Math.round(M.sx(X)), py = Math.round(M.sy(Y)), c = C.ink[1];
    if (M.lod !== 'insert') { S.set(px, py, c, N); continue; }
    S.set(px, py, c, N); S.set(px - 1, py + (up ? -1 : 0), c, N); S.set(px + 1, py + (up ? -1 : 0), c, N);
    if (up) { S.set(px - 2, py - 1, c, N); S.set(px + 2, py - 1, c, N); } else { S.set(px - 2, py + 1, c, N); S.set(px + 2, py + 1, c, N); }
  }
}

// ------------------------------------------------------------------ the near village: roof, chimney, laundry, lamp
function rooftop(S, M, hour, t) {
  const ins = M.lod === 'insert';
  if (!ins) return;
  const x0 = M.x0, y0 = M.y0;
  // a tiled roof in the bottom-left: rows of tiles, each with a lit lip and a dark gap under it
  const ridge = 144, eave = (Y) => 58 + (Y - ridge) * 1.1;
  for (let Y = ridge; Y < 180; Y++) {
    const r = Math.floor((Y - ridge) / 5), inRow = (Y - ridge) % 5;
    for (let X = 0; X <= eave(Y); X++) {
      const tile = Math.floor((X + (r % 2) * 3.5) / 7), tx = (X + (r % 2) * 3.5) % 7;
      let lv = inRow === 0 ? 5 : inRow === 4 ? 1 : tx < 1 ? 2 : tx < 3 ? 4 : 3;
      if (hash(tile * 13 + r, 90) < 0.12 && inRow > 0 && inRow < 4) lv = Math.max(2, lv - 1);   // an odd weathered tile
      if (X > eave(Y) - 1.5) lv = 0;
      S.set(x0 + X, y0 + Y, C.roof[lv], N);
    }
  }
  for (let X = 0; X < 60; X++) { S.set(x0 + X, y0 + ridge - 1, C.roof[2], N); S.set(x0 + X, y0 + ridge - 2, C.roof[X % 6 < 5 ? 4 : 3], N); }
  // a dormer window, lit at dusk and night
  const glow = night(hour) || dusky(hour);
  S.rect(x0 + 38, y0 + 152, 10, 9, C.wall[3], N); S.hline(x0 + 37, x0 + 48, y0 + 151, C.roof[1], N);
  for (let i = 0; i < 7; i++) S.hline(x0 + 37 + Math.floor(i * 0.5), x0 + 48 - Math.floor(i * 0.5), y0 + 150 - i, C.roof[i === 6 ? 5 : 3], N);
  S.rect(x0 + 40, y0 + 154, 6, 6, glow ? C.lamp[2] : C.ink[1], glow ? EMIT : N);
  S.vline(x0 + 43, y0 + 154, y0 + 159, C.timber[1], N); S.hline(x0 + 40, x0 + 45, y0 + 156, C.timber[1], N);
  if (!glow) { S.set(x0 + 41, y0 + 155, C.water[3], N); S.set(x0 + 42, y0 + 154, C.water[4], N); }
  // the chimney: stone blocks, a cap, smoke rising and leaning with the wind
  const [cx, cy] = V.chimney;
  for (let Y = cy; Y < ridge; Y++) for (let X = cx; X < cx + 9; X++) {
    const row = Math.floor((Y - cy) / 3), mortar = (Y - cy) % 3 === 2 || (X + row * 2) % 5 === 0;
    let lv = X === cx ? 5 : X === cx + 8 ? 1 : X < cx + 3 ? 4 : 3;
    if (mortar && X > cx && X < cx + 8) lv = 2;
    S.set(x0 + X, y0 + Y, C.stone[lv], N);
  }
  S.rect(x0 + cx - 1, y0 + cy - 2, 11, 2, C.stone[4], N); S.hline(x0 + cx - 1, x0 + cx + 9, y0 + cy - 1, C.stone[1], N);
  // puffs swell as they rise, lean with the wind, then shrink away (solid shapes: a lit side, a shaded side)
  for (let k = 7; k >= 0; k--) {
    const a = frac(t * 0.2 + k / 8);
    const px = cx + 4 + Math.sin(a * 5 + k) * 2 + a * a * 36, py = cy - 3 - a * 52;
    const r = (1.6 + a * 6) * (a > 0.62 ? 1 - (a - 0.62) / 0.38 : 1);
    if (r < 0.7) continue;
    const lv = a < 0.35 ? 4 : a < 0.65 ? 3 : 2;
    for (let yy = Math.floor(py - r - 1); yy <= py + r + 1; yy++) for (let xx = Math.floor(px - r - 1); xx <= px + r + 1; xx++) {
      const dx = (xx + 0.5 - px) / r, dy = (yy + 0.5 - py) / (r * 0.85);
      const d = Math.hypot(dx, dy) - Math.sin(Math.atan2(dy, dx) * 4 + k) * 0.1;
      if (d > 1) continue;
      const lit = -dx * 0.7 - dy * 0.7 > 0.25;
      S.set(x0 + xx, y0 + yy, C.smoke[lit ? lv : lv - 1], N);
    }
  }
}
function laundry(S, M, t) {
  if (M.lod !== 'insert') return;
  const x0 = M.x0, y0 = M.y0;
  const ax = 31, ay = 132, bx = 82, by = 126;
  const sag = (u) => Math.sin(u * Math.PI) * 4;
  for (let i = 0; i <= 60; i++) { const u = i / 60; S.set(x0 + Math.round(ax + (bx - ax) * u), y0 + Math.round(ay + (by - ay) * u + sag(u)), C.ink[2], N); }
  S.vline(x0 + bx, y0 + by - 1, y0 + 152, C.timber[1], N); S.vline(x0 + bx + 1, y0 + by, y0 + 152, C.timber[2], N);
  [[40, C.cloth1, 7, 8], [54, C.cloth3, 9, 10], [68, C.cloth2, 6, 9]].forEach(([x, col, cw, ch], i) => {
    const u = (x - ax) / (bx - ax), y = Math.round(ay + (by - ay) * u + sag(u));
    for (let j = 0; j < ch; j++) {
      const sway = Math.round(Math.sin(t * 3.4 + i * 1.3 - j * 0.4) * (j / ch) * 2.2);
      for (let k = 0; k < cw; k++) S.set(x0 + x + k + sway, y0 + y + 1 + j, col[k === 0 ? 3 : k === cw - 1 ? 1 : j === ch - 1 ? 1 : (k + j) % 5 === 0 ? 1 : 2], N);
      if (i === 2 && j > 4) S.set(x0 + x + 2 + sway, y0 + y + 1 + j, C.ink[2], N);      // trouser legs
    }
    S.set(x0 + x + 1, y0 + y, C.timber[3], N); S.set(x0 + x + cw - 2, y0 + y, C.timber[3], N);
  });
}
function streetLamp(S, M, hour) {
  if (M.lod !== 'insert') return;
  const x = M.x0 + 136, y = M.y0 + 178, glow = night(hour) || dusky(hour);
  S.vline(x, y - 22, y, C.ink[2], N); S.vline(x + 1, y - 22, y, C.ink[1], N);
  S.hline(x - 2, x + 3, y - 23, C.ink[2], N);
  S.rect(x - 2, y - 30, 6, 6, glow ? C.lamp[2] : C.ink[1], glow ? EMIT : N); S.hline(x - 3, x + 4, y - 31, C.ink[2], N); S.set(x, y - 32, C.ink[2], N);
  if (glow) {
    S.rect(x - 1, y - 29, 4, 3, C.lamp[3], EMIT);
    for (let yy = -12; yy <= 12; yy++) for (let xx = -12; xx <= 12; xx++) { const d = Math.hypot(xx, yy) / 12; if (d < 1 && d > 0.35 && bayer(x + xx, y + yy) < (1 - d) * 0.4) S.set(x + xx + 1, y - 27 + yy, C.lamp[1], EMIT); }
  }
}

// ------------------------------------------------------------------ the big tree in front of the shop
function bigTree(S, M, t) {
  const ins = M.lod === 'insert', sway = Math.sin(t * 0.7) * 1.3 + Math.sin(t * 1.9) * 0.4;
  if (!ins) {
    // in the wide shot the tree's crown fills the window's top-right corner
    const X0 = M.x0 + M.w, Y0 = M.y0;
    for (const [dx, dy, r] of [[-4, 4, 9], [-14, 0, 7], [-2, 16, 6]]) {
      const cx = X0 + dx + Math.round(sway * 0.5), cy = Y0 + dy;
      S.ellipse(cx, cy, r, r * 0.8, C.tree[2], N); S.ellipse(cx - 2, cy - 2, r * 0.6, r * 0.5, C.tree[3], N); S.set(cx - 4, cy - 3, C.tree[5], N);
    }
    return;
  }
  const x0 = M.x0, y0 = M.y0;
  // trunk up the right edge, a bough reaching left
  for (let Y = 0; Y < 180; Y++) for (let X = 298; X < 320; X++) {
    const e = 300 + Math.sin(Y * 0.07) * 2;
    if (X < e) continue;
    const v = (X - e) / 20;
    let lv = v < 0.12 ? 3 : v < 0.4 ? 2 : 1;
    // bark: long vertical furrows that wander, a few lit ridges
    const col = Math.floor((X - e) / 3), fur = hash(col, 95), wob = Math.sin(Y * 0.15 + col * 2) * 0.8;
    if (Math.abs((X - e) - (col * 3 + 1.5 + wob)) < 0.5 && hash(col * 31 + Math.floor(Y / (6 + fur * 10)), 96) < 0.8) lv = Math.max(0, lv - 1);
    else if (v < 0.4 && hash(col * 17 + Math.floor(Y / 5), 97) < 0.12) lv = Math.min(4, lv + 1);
    S.set(x0 + X, y0 + Y, C.trunk[lv], N);
  }
  for (let i = 0; i < 70; i++) {
    const u = i / 70, X = 300 - u * 62, Y = 36 - u * 12 + u * u * 16 + sway * u, th = Math.round(4 - u * 3);
    for (let k = -th; k <= th; k++) S.set(x0 + Math.round(X), y0 + Math.round(Y + k), C.trunk[k < 0 ? 3 : k === th ? 0 : 2], N);
  }
  // leaf clusters: each a lobed blob with shadow, body, lit cap, highlight flecks that flicker in the wind
  const cl = [[296, -2, 20, 14], [270, 6, 16, 11], [248, 18, 13, 9], [236, 34, 9, 7], [280, 24, 14, 10], [306, 26, 12, 12], [258, 40, 10, 8], [302, 52, 11, 10]];
  cl.forEach(([cx0, cy0, rx, ry], j) => {
    const cx = cx0 + sway * (1 - j * 0.05) + Math.sin(t * 2.1 + j) * 0.5, cy = cy0;
    each(M, cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry + 2, (x, y, X, Y) => {
      const dx = (X - cx) / rx, dy = (Y - cy) / ry, ang = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy) - Math.sin(ang * 7 + j * 2) * 0.09 - Math.sin(ang * 13 + j) * 0.05;
      if (d > 1) return;
      const l = -dx * 0.55 - dy * 0.85;
      let lv = d > 0.88 ? 1 : l > 0.55 ? 5 : l > 0.15 ? 4 : l > -0.3 ? 3 : 2;
      if (lv >= 4 && bayer(x, y) < 0.18) lv--;
      S.set(x, y, C.tree[lv], N);
    });
    // fluttering flecks
    for (let k = 0; k < 10; k++) {
      const a = hash(k + j * 10, 91) * 6.28, r = hash(k + j * 10, 92) * 0.8;
      const X = cx + Math.cos(a) * rx * r, Y = cy + Math.sin(a) * ry * r;
      const on = Math.sin(t * 3.3 + k * 1.7 + j) > 0.35;
      S.set(x0 + Math.round(X), y0 + Math.round(Y), on ? C.tree[6] : C.tree[2], N);
    }
  });
  // now and then a leaf lets go and tumbles down past the window
  for (let k = 0; k < 3; k++) {
    const a = frac(t * 0.11 + k / 3), X = 270 - a * 90 + Math.sin(a * 14 + k) * 6, Y = 30 + a * 150;
    const f = Math.floor(a * 30) % 3;
    S.set(x0 + Math.round(X), y0 + Math.round(Y), C.tree[f === 0 ? 5 : 4], N); if (f === 1) S.set(x0 + Math.round(X) + 1, y0 + Math.round(Y), C.tree[3], N);
  }
}

// ------------------------------------------------------------------ the hero out there, and the ways he dies
const HERO_SPR = {
  // tiny hero sprites: 0 ink outline, 1 hair, 2 tunic, 3 cape, 4 skin, 5 trousers, 6 boots, 7 lit hair
  big: [
    ['..0.0..', '.07110.', '.01110.', '.04440.', '0323230', '0322230', '.05550.', '.05.50.', '.06.60.'],
    ['..0.0..', '.07110.', '.01110.', '.04440.', '0323230', '0322230', '.05550.', '..555..', '..066..'],
  ],
  mid: [['.0.0.', '07110', '.444.', '32223', '.555.', '.5.5.', '.6.6.'], ['.0.0.', '07110', '.444.', '32223', '.555.', '..5..', '..6..']],
  small: [['.1.', '141', '323', '.5.', '5.5'], ['.1.', '141', '323', '.5.', '.5.']],
  far: [['1', '2', '5'], ['7', '2', '5']],
};
function heroSprite(S, x, y, scale, frame, flip = false) {
  const set = scale > 0.78 ? HERO_SPR.big : scale > 0.56 ? HERO_SPR.mid : scale > 0.38 ? HERO_SPR.small : HERO_SPR.far;
  const rows = set[frame % 2], hgt = rows.length, wd = rows[0].length;
  const pal = [C.hero[0], C.hero[1], C.hero[2], C.hero[3], C.hero[4], C.hero[5], C.hero[6], C.hero[7]];
  rows.forEach((row, j) => [...row].forEach((q, i) => { if (q !== '.') S.set(Math.round(x) - Math.floor(wd / 2) + (flip ? wd - 1 - i : i), Math.round(y) - hgt + 1 + j, pal[+q], N); }));
  return hgt;
}
function puff(S, x, y, r, a, cols) {
  for (let yy = Math.floor(y - r); yy <= y + r; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
    const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / r;
    if (d < 1 && bayer(xx, yy) < 1.15 - a) S.set(xx, yy, cols[d < 0.4 ? cols.length - 1 : d < 0.75 ? cols.length - 2 : 0], EMIT);
  }
}
/** the soul's twinkle rising after a death */
function twinkle(S, x, y, k) {
  const r = k < 0.5 ? 2 : 3;
  S.set(x, y, C.bolt[2]);
  for (let i = 1; i <= r; i++) { const c = i === r ? C.bolt[0] : C.bolt[1]; S.set(x - i, y, c); S.set(x + i, y, c); S.set(x, y - i, c); S.set(x, y + i, c); }
  if (k > 0.5) { S.set(x - 1, y - 1, C.bolt[1]); S.set(x + 1, y + 1, C.bolt[1]); S.set(x + 1, y - 1, C.bolt[1]); S.set(x - 1, y + 1, C.bolt[1]); }
}
/**
 * The hero's walk and death in the insert. w: { u (0..1 progress from `from` to the death spot), death, dt (seconds
 * since the death, <0 before), t, from (optional start along the road) }
 */
function heroAndDeath(S, M, w) {
  const x0 = M.x0, y0 = M.y0;
  const du = DEATH_U[w.death] ?? DEATH_U.flash, from = w.from ?? FROM_U[w.death] ?? 0;
  const U = from + (du - from) * clamp(w.u, 0, 1);
  const [x, y, sc] = pathAt(U);
  const [xp] = pathAt(Math.max(0, U - 0.01));
  const flip = x < xp - 0.01;
  const frame = Math.floor(w.t * 6);
  const dt = w.dt ?? -1;
  const [ex, ey] = V.eye;
  if (w.death === 'flash' || w.death === 'fire') {
    if (dt < 0 || (w.death === 'flash' && dt < 0.12)) heroSprite(S, x0 + x, y0 + y, sc, frame, flip);
    // a bolt from the eye (flash) or a fireball lobbed out of the eye (fire)
    if (w.death === 'flash' && dt >= 0 && dt < 0.3) {
      let px = ex, py = ey + 2;
      for (let i = 1; i <= 7; i++) {
        const nx = ex + (x - ex) * i / 7 + (i < 7 ? (hash(i, Math.floor(w.t * 24)) - 0.5) * 7 : 0), ny = ey + 2 + (y - 3 - ey - 2) * i / 7;
        S.line(x0 + px, y0 + py, x0 + nx, y0 + ny, C.bolt[2]); S.line(x0 + px + 1, y0 + py, x0 + nx + 1, y0 + ny, C.bolt[1]);
        px = nx; py = ny;
      }
    }
    if (w.death === 'fire' && dt < 0 && dt > -1.0) {
      const k = 1 + dt / 1.0, fx = ex + (x - ex) * k, fy = ey + (y - 4 - ey) * k - Math.sin(k * Math.PI) * 18;
      for (let i = 1; i < 6; i++) { const q = Math.max(0, k - i * 0.035); S.set(x0 + Math.round(ex + (x - ex) * q), y0 + Math.round(ey + (y - 4 - ey) * q - Math.sin(q * Math.PI) * 18), C.fire[i < 3 ? 2 : 1]); }
      puff(S, x0 + fx, y0 + fy, 3.2, 0, [C.fire[1], C.fire[3], C.fire[4]]);
    }
    if (dt >= 0 && dt < 1.3) {
      const a = dt / 1.3;
      puff(S, x0 + x, y0 + y - 3, 3 + a * (w.death === 'fire' ? 12 : 9), a, w.death === 'fire' ? [C.fire[0], C.fire[2], C.fire[3], C.fire[4]] : [C.bolt[0], C.bolt[1], C.bolt[2]]);
      if (a > 0.35) for (let k = 0; k < 5; k++) { const s = (a - 0.35) / 0.65; S.set(x0 + Math.round(x + (k - 2) * 3 + s * 3), y0 + Math.round(y - 6 - s * 16 - (k % 2) * 2), C.smoke[3 - (k % 2)], N); }
    }
    if (dt >= 0.9 && dt < 2.4) twinkle(S, x0 + Math.round(x + 1), y0 + Math.round(y - 8 - (dt - 0.9) * 10), frac(dt * 3));
    return;
  }
  if (w.death === 'cliff') {
    if (dt < 0) { heroSprite(S, x0 + x, y0 + y, sc, frame, flip); return; }
    // one step off the ledge: a beat in the air, feet running on nothing, then straight down the rock face
    const hang = 0.35, fall = Math.max(0, dt - hang);
    const fx = x + 2 + Math.min(dt, hang) * 6, fy = y + 2 + fall * fall * 60;
    if (fy < 136) heroSprite(S, x0 + fx, y0 + fy, sc, dt < hang ? Math.floor(w.t * 14) : 0, flip);
    if (dt < hang) { S.set(x0 + Math.round(fx) + 3, y0 + Math.round(fy) - 8, C.ink[0], N); S.set(x0 + Math.round(fx) + 3, y0 + Math.round(fy) - 6, C.ink[0], N); }   // a '!' of surprise
    if (fall > 0.2 && fall < 0.9) for (let k = 0; k < 3; k++) S.set(x0 + Math.round(fx + (k - 1) * 3), y0 + Math.round(fy - 8 - k * 2), C.mist[3], N);
    if (dt > 1.0 && dt < 2.4) twinkle(S, x0 + Math.round(fx), y0 + Math.round(128 - (dt - 1.0) * 10), frac(dt * 3));
    return;
  }
  if (w.death === 'slime') {
    const [sxp, syp] = V.slime;
    // the slime waits in the bush, hops out, bonks him; he flies off in a long arc over the fields
    const hop = dt < -0.7 ? 0 : clamp((dt + 0.7) / 0.7, 0, 1);
    const slx = sxp + hop * 8, sly = syp - Math.abs(Math.sin(hop * Math.PI * 2)) * 6;
    const sq = dt >= 0 && dt < 0.18 ? 1 : 0, G = C.slime;
    const X = x0 + Math.round(slx), Y = y0 + Math.round(sly);
    S.ellipse(X + 0.5, Y - 2 + sq * 0.5, 5 + sq, 4 - sq, G[1], N); S.ellipse(X + 0.5, Y - 2.5 + sq * 0.5, 4 + sq, 3 - sq, G[3], N);
    S.set(X - 2, Y - 5 + sq, G[5], N); S.set(X - 1, Y - 5 + sq, G[4], N);
    S.set(X - 1, Y - 3, C.ink[0], N); S.set(X + 2, Y - 3, C.ink[0], N);
    if (dt < 0) { heroSprite(S, x0 + x, y0 + y, sc, frame, flip); if (dt > -0.7 && dt < -0.35) { S.set(X + 1, Y - 9, C.ink[0], N); S.set(X + 1, Y - 7, C.ink[0], N); } return; }
    const a = Math.min(2.4, dt);
    const hx = x + a * 60, hy = y - Math.sin(Math.min(1, a / 1.8) * Math.PI) * 44 + (a > 1.8 ? (a - 1.8) * 30 : 0);
    if (a < 2.0) heroSprite(S, x0 + hx, y0 + hy, sc * 0.9, Math.floor(w.t * 16));
    if (dt < 0.2) puff(S, x0 + x + 2, y0 + y - 4, 3 + dt * 12, dt * 3, [C.bolt[1], C.bolt[2]]);
    if (a > 1.3 && a < 2.4) twinkle(S, x0 + Math.round(hx + 3), y0 + Math.round(hy - 6), frac(dt * 3));
  }
}
/** the night battle: bursts of colour round the tower, the eye flaring */
function battle(S, M, t, flashes) {
  const T = V.tower;
  for (const f of flashes || []) {
    const dt = t - f;
    if (dt < 0 || dt > 1.0) continue;
    const a = dt / 1.0, k = Math.floor(f * 7) % 3, cols = [[C.fire[1], C.fire[3], C.fire[4]], [C.bolt[0], C.bolt[1], C.bolt[2]], [C.eye[1], C.eye[3], C.eye[4]]][k];
    const bx = T.x + (hash(Math.floor(f * 10), 2) - 0.5) * 24, by = T.base - 8 + (hash(Math.floor(f * 10), 3) - 0.5) * 20;
    puff(S, M.sx(bx), M.sy(by), (3 + a * 11) * (M.lod === 'insert' ? 1 : 0.4), a, cols);
    if (M.lod === 'insert' && a < 0.5) for (let i = 0; i < 8; i++) { const ang = i / 8 * 6.28 + f, r = 6 + a * 26; S.set(Math.round(M.sx(bx + Math.cos(ang) * r)), Math.round(M.sy(by + Math.sin(ang) * r * 0.7)), cols[1]); }
  }
}

// ------------------------------------------------------------------ the whole view
/**
 * Draw the view into (x0, y0, w, h).
 * o: { hour, t, lod: 'insert'|'small', hero: {u, death, dt, t}, battle: [flash times], eye (0..1: 1 = the eye strikes),
 *      flash (0..1: the sky lights up), defeated (the storm gone, the eye dark) }
 */
export function drawView(S, x0, y0, w, h, o = {}) {
  const hour = o.hour ?? 7, t = o.t ?? 0, lod = o.lod ?? 'insert';
  const M = makeM(x0, y0, w, h, lod);
  const clip = S.clip;
  S.clip = [Math.max(x0, clip ? clip[0] : 0), Math.max(y0, clip ? clip[1] : 0), Math.min(x0 + w, clip ? clip[2] : S.w), Math.min(y0 + h, clip ? clip[3] : S.h)];
  const fx = { eye: o.eye ?? 0 };
  FX.flash = o.flash ?? 0; FX.defeated = !!o.defeated;
  setShadows(t, hour);
  sky(S, M, hour, t);
  sunMoon(S, M, hour, t);
  clouds(S, M, hour, t);
  farRange(S, M, hour);
  if (!FX.defeated) vortex(S, M, t, hour);
  birds(S, M, hour, t);
  crag(S, M, hour);
  tower(S, M, t, hour, fx);
  plateau(S, M, t);
  escarpment(S, M, hour);
  waterfall(S, M, t);
  meadow(S, M, t);
  windmill(S, M, t);
  forest(S, M, t);
  road(S, M, hour);
  if (lod === 'insert') { bush(S, M, V.slime[0] - 2, V.slime[1] + 1, 8, t); bush(S, M, 98, 160, 6, t); bush(S, M, 206, 162, 7, t); bush(S, M, 280, 142, 5, t); }
  sheep(S, M, hour, t);
  grass(S, M, t, hour);
  if (lod === 'insert' && o.hero) heroAndDeath(S, M, o.hero);
  if (o.battle) battle(S, M, t, o.battle);
  if (fx.eye > 0.5 && lod === 'small') {
    const X = M.sx(V.eye[0]), Y = M.sy(V.eye[1]);
    S.ellipse(X + 0.5, Y + 0.5, 2.6, 2.6, FLASH[1], EMIT);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, L = k % 2 ? 4 : 7; for (let r = 3; r <= L; r++) S.set(Math.round(X + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r), r > L - 2 ? FLASH[0] : FLASH[1], EMIT); }
  }
  streetLamp(S, M, hour);
  rooftop(S, M, hour, t);
  laundry(S, M, t);
  bigTree(S, M, t);
  butterflies(S, M, hour, t);
  fireflies(S, M, hour, t);
  S.clip = clip;
}

// ------------------------------------------------------------------ the window close-up
const F = {
  beam: R('A.beam', '#4e342a', 6, { lo: 0.16, hi: 0.52, cool: 320, shift: 0.25 }),
  trim: R('A.trim', '#c49a66', 6, { lo: 0.34, hi: 0.88, cool: 320, shift: 0.25 }),
  curtain: R('A.curtain', '#5e7d4e', 6, { cool: 200, warm: 95 }),
  pot: R('shop.pot', '#c0703f', 6, { cool: 10 }), leaf: R('shop.leaf', '#5a9a4a', 6, { cool: 200, warm: 95, shift: 0.35 }),
  red: R('shop.red', '#c2413d', 6, { cool: 330 }), gold: R('shop.gold', '#e0b048', 6, { cool: 20, shift: 0.3 }),
  glint: RX('v.glint', ['#ffffff'], EMIT), candle: RX('v.candleRef', ['#6a3a1a', '#c8742a', '#ffc060', '#fff0c0'], EMIT),
};
export const MULLION = [94, 99];
/**
 * The keeper's view: the landscape seen through the lower sash, the frame, one mullion, the curtains tied back at the
 * edges, the sill with its potted plant. o: drawView options, plus candle (a reflection of the candle in the glass).
 */
export function windowInsert(S, o = {}) {
  drawView(S, 0, 0, 320, 180, { ...o, lod: 'insert' });
  const B = F.beam, t = o.t ?? 0;
  // glass: two faint glints in each pane, and at night the candle's reflection flickering in the right pane
  for (const [gx, gy] of [[22, 30], [120, 24]]) for (let k = 0; k < 14; k++) { if (bayer(gx + k, gy - k) < 0.45) S.set(gx + k, gy + 14 - k, F.glint[0]); if (k > 3 && k < 9 && bayer(gx + k + 4, gy - k) < 0.3) S.set(gx + k + 4, gy + 14 - k, F.glint[0]); }
  if (o.candle) {
    const fl = Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.5, cx = 262, cy = 128;
    for (let y = -14; y <= 14; y++) for (let x = -10; x <= 10; x++) { const d = Math.hypot(x / 10, y / 14); if (d < 1 && bayer(cx + x, cy + y) < (1 - d) * 0.35) S.set(cx + x, cy + y, F.candle[1]); }
    S.ellipse(cx + fl * 0.6, cy - 2, 2, 4, F.candle[2]); S.ellipse(cx + fl * 0.3, cy - 1, 1, 2, F.candle[3]); S.vline(cx, cy + 3, cy + 12, F.candle[0]);
  }
  // the frame: header, jambs, the mullion; dark wood, backlit, a lit lip on the edges toward the glass
  const frame = (x, y, w, h, lipL, lipR, lipB) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let lv = 2;
      if ((i + j * 3) % 11 === 0) lv = 1;
      if (lipL && i === 0) lv = 4; if (lipR && i === w - 1) lv = 3; if (lipB && j === h - 1) lv = 4;
      if (lipL && i === 1) lv = 1; if (lipR && i === w - 2) lv = 1; if (lipB && j === h - 2) lv = 1;
      S.set(x + i, y + j, B[lv]);
    }
  };
  frame(0, 0, 320, 7, false, false, true);
  frame(0, 0, 9, 168, false, true, false);
  frame(311, 0, 9, 168, true, false, false);
  frame(MULLION[0], 0, MULLION[1] - MULLION[0] + 1, 168, true, true, false);
  S.rect(MULLION[0], 4, MULLION[1] - MULLION[0] + 1, 3, B[2]);
  // the sill: a lit top, a dark front edge
  S.rect(0, 166, 320, 14, F.trim[2]); S.rect(0, 166, 320, 5, F.trim[4]); S.hline(0, 319, 166, F.trim[5]); S.hline(0, 319, 171, F.trim[1]); S.hline(0, 319, 179, F.trim[0]);
  for (let x = 3; x < 320; x += 23) S.hline(x, x + 6, 168, F.trim[3]);
  // curtains at both edges, tied back: soft folds of green cloth
  for (const side of [-1, 1]) {
    for (let y = 0; y < 170; y++) {
      const tie = 104, pinch = Math.max(0, 1 - Math.abs(y - tie) / 60), w = Math.round(22 - pinch * 12 + (y > tie ? (y - tie) * 0.12 : 0));
      for (let i = 0; i < w; i++) {
        const x = side < 0 ? i : 319 - i, fold = (i * 3 + Math.round(Math.sin(y * 0.05 + i) * 1.5) + (side < 0 ? 0 : 2)) % 7;
        let lv = fold < 2 ? 4 : fold < 4 ? 3 : fold < 6 ? 2 : 1;
        if (i === w - 1) lv = 1;
        S.set(x, y, F.curtain[lv]);
      }
    }
    const tx = side < 0 ? 4 : 305;
    S.rect(tx, 102, 12, 4, F.gold[3]); S.hline(tx, tx + 11, 102, F.gold[5]); S.hline(tx, tx + 11, 105, F.gold[1]);
  }
  // the potted plant on the sill, as in the wide shot
  const px = 36, py = 168;
  S.poly([[px, py - 18], [px + 26, py - 18], [px + 22, py], [px + 4, py]], F.pot[3]);
  S.rect(px - 2, py - 22, 30, 5, F.pot[4]); S.hline(px - 2, px + 27, py - 22, F.pot[5]); S.hline(px - 2, px + 27, py - 18, F.pot[1]);
  for (let y = py - 17; y < py; y++) { S.set(px + 20 - Math.floor((y - py + 17) * 0.22), y, F.pot[1]); S.set(px + 3 + Math.floor((y - py + 17) * 0.22), y, F.pot[4]); }
  const leaves = [[13, -40, -1], [4, -34, -1], [22, -36, 1], [9, -46, 1], [17, -48, -1], [0, -28, -1], [26, -28, 1], [13, -30, 1]];
  for (const [lx, ly, d] of leaves) {
    for (let k = 0; k < 9; k++) { const x = px + lx + d * k * 0.6, y = py + ly + Math.abs(k - 4) * 0.9 - 4; S.set(Math.round(x), Math.round(y), F.leaf[k < 3 ? 4 : 3]); S.set(Math.round(x), Math.round(y) + 1, F.leaf[2]); S.set(Math.round(x), Math.round(y) + 2, F.leaf[k > 2 && k < 7 ? 2 : 1]); }
    S.line(px + 13, py - 22, px + lx + 4 * d, py + ly + 2, F.leaf[1]);
  }
  S.ellipse(px + 13, py - 53, 3, 3, F.red[3]); S.ellipse(px + 12, py - 54, 1.5, 1.5, F.red[5]); S.set(px + 13, py - 53, F.gold[4]);
}
