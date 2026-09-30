// The close-up inserts, drawn as proper pixel art: the tally under the counter, the price tag, the receipt the keeper
// draws the demon lord's weak point on, the map held upside down, the three things pushed across the counter.
// Shared pieces: wooden boards (grain that flows round knots, lit edges, dark gaps, nails), chalk strokes (a bright
// core, a ragged edge, skips where the grain dips, dust), pencil lines, paper. Hands are the characters' own hands,
// rendered big by the figure renderer (closeups.js).
import { bayer } from '../pix/gfx.js';
import { lightRadial } from '../set/light.js';
import { R, RX, rnd, digits } from '../set/kit.js';
import { renderArm, renderFigure } from './closeups.js';
import { boards } from '../set/wood.js';
export { boards };
import { heroA } from '../chars/heroA.js';
import { emote } from '../ui/emotes.js';
import { keeperA } from '../chars/keeperA.js';
import { newHeroA } from '../chars/newHero.js';

export const CHALK_ID = 77;
const C = {
  raw:    R('ins.raw', '#a0714a', 8, { lo: 0.2, hi: 0.78, at: 4, cool: 330, warm: 70, shift: 0.25 }),
  under:  R('ins.under', '#6a4432', 6, { lo: 0.12, hi: 0.5, cool: 320, shift: 0.2 }),
  wall:   R('ins.wall', '#a4805c', 8, { lo: 0.26, hi: 0.82, at: 4, cool: 300, warm: 70, shift: 0.22 }),
  bench:  R('ins.bench', '#b58658', 8, { lo: 0.24, hi: 0.86, at: 4, cool: 320, warm: 75, shift: 0.25 }),
  top:    R('ins.top', '#8c4a30', 8, { lo: 0.18, hi: 0.76, at: 4, cool: 330, warm: 60, shift: 0.25 }),
  iron:   R('ins.iron', '#5e6470', 5, { lo: 0.16, hi: 0.72, cool: 260 }),
  chalk:  RX('ins.chalk', ['#8a8076', '#bab2a6', '#dfd9cd', '#f6f2e8', '#ffffff']),
  paper:  R('ins.paper', '#efe3c4', 6, { lo: 0.5, hi: 0.98, cool: 40, warm: 90 }),
  graph:  RX('ins.graph', ['#2e3450', '#4a5478', '#7a86ac']),
  redp:   RX('ins.redp', ['#8e2a28', '#d0443a', '#f07060']),
  ink:    RX('ins.ink', ['#241a1c', '#4a3a3a']),
  dust:   RX('ins.dust', ['#6a5a4a']),
  cob:    RX('ins.cob', ['#d8d0c4']),
};
const frac = (x) => x - Math.floor(x);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const ease = (u) => u * u * (3 - 2 * u);

// ------------------------------------------------------------------ chalk
/**
 * A chalk stroke from a to b, drawn to fraction `prog`. Bright core, ragged edge, gaps where the grain dips, dust
 * falling under a fresh stroke. o: { w (width px), seed, grain (mask from boards), fresh, pressure }
 */
export function chalkStroke(S, a, b, prog, o = {}) {
  if (prog <= 0) return a;                                   // the pen waits at the start of the stroke
  const w = o.w ?? 3, seed = o.seed ?? 1, L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L * 2 * prog));
  const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L, nx = -dy, ny = dx;
  const prev = S.curId; S.curId = CHALK_ID;
  let end = a;
  for (let k = 0; k <= n; k++) {
    const s = (k / n) * L * prog;
    const wob = Math.sin(s * 0.3 + seed) * 0.5 + (hash(Math.floor(s), seed) - 0.5) * 0.35;
    const cx = a[0] + dx * s + nx * wob, cy = a[1] + dy * s + ny * wob;
    const ww = w * (s < 2 ? 1.25 : s > L - 3 ? 0.8 : 1) * (0.9 + hash(Math.floor(s * 2), seed + 1) * 0.25);
    for (let q = -ww / 2; q <= ww / 2; q += 0.5) {
      const x = Math.round(cx + nx * q), y = Math.round(cy + ny * q);
      const edge = Math.abs(q) > ww / 2 - 0.7;
      const hsh = hash(x * 31 + y * 17, seed + 2);
      if (o.grain && o.grain.at(x, y) && hsh < 0.4) { S.set(x, y, C.chalk[1]); continue; }   // thinner in the grooves
      if (edge && hsh < 0.3) continue;                                   // ragged edge
      S.set(x, y, C.chalk[edge ? 2 : hsh < 0.08 ? 2 : o.fresh ? 4 : 3]);
    }
    end = [cx, cy];
  }
  // dust: a few grains fallen under the stroke (fresh strokes only)
  if (o.fresh) for (let k = 0; k < 10 * prog; k++) {
    const s = hash(k, seed + 7) * L * prog, fx = a[0] + dx * s + (hash(k, seed + 8) - 0.5) * 4, fy = a[1] + dy * s + 2 + hash(k, seed + 9) * 8;
    S.set(Math.round(fx), Math.round(fy), C.chalk[hash(k, seed + 10) < 0.5 ? 1 : 0]);
  }
  S.curId = prev;
  return end;
}
/** a chalk polyline: points, drawn to fraction prog of its total length. Returns the pen position. */
export function chalkPath(S, pts, prog, o = {}) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let left = L * clamp(prog, 0, 1), pen = pts[0];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const f = Math.min(1, left / seg[i - 1]);
    pen = chalkStroke(S, pts[i - 1], pts[i], f, { ...o, seed: (o.seed ?? 1) + i * 13 });
    left -= seg[i - 1];
  }
  return pen;
}

// ------------------------------------------------------------------ the tally under the counter
/** where tally mark i sits: groups of five, four uprights and a slash */
function markGeom(i) {
  const g = Math.floor(i / 5), k = i % 5, gx = 26 + g * 50, top = 66 + (g % 2) * 2;
  if (k < 4) { const x = gx + k * 8 + (hash(i, 3) - 0.5) * 2; return [[x + 1.5, top], [x, top + 40]]; }
  return [[gx - 6, top + 34], [gx + 31, top + 6]];
}
const STAR = (cx, cy, r) => { const p = []; for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * (4 * Math.PI / 5); p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.95]); } return p; };

/**
 * tl: { count, draw (0..1 progress of the last mark), star (0..1), stop (0..1: the hand stops before mark 24),
 *       touch (0..1: the fingertip taps the old mark), t }
 */
export function drawTally(S, tl, t) {
  // the back of the counter's front boards, raw and unplaned, under the dark overhang of the counter top
  const grain = boards(S, 0, 0, 320, 180, C.raw, {
    dir: 'h', size: 30, vary: 6, seed: 11, knots: 6,
    shade: (x, y) => (y < 34 ? -(34 - y) / 14 : 0) + (y > 150 ? -(y - 150) / 26 : 0),
    nails: [[8, 22], [8, 52], [8, 82], [8, 112], [8, 142]],
  });
  // a batten across the boards on the right, and the counter top's underside along the top
  boards(S, 302, 0, 18, 180, C.raw, { dir: 'v', size: 18, seed: 12, knots: 1, lv: 5, shade: (x, y) => -(x - 302) / 10 + (y < 40 ? -(40 - y) / 16 : 0), nails: [[309, 24], [309, 88], [309, 152]] });
  for (let y = 0; y < 180; y++) { S.set(301, y, C.raw[1]); S.set(300, y, C.raw[2]); }
  for (let y = 0; y < 12; y++) for (let x = 0; x < 320; x++) S.set(x, y, C.under[y < 9 ? (frac((x + y * 3) / 37) < 0.1 ? 0 : 1) : y === 9 ? 3 : 2]);
  for (let x = 0; x < 320; x++) if (bayer(x, 12) < 0.5) S.set(x, 12, C.under[2]);
  // a cobweb in the corner
  for (let k = 0; k < 5; k++) for (let r = 2; r < 18; r += 5) { const a = k / 4 * Math.PI / 2; if (bayer(k, r) < 0.7) S.set(Math.round(299 - Math.cos(a) * r * 0.9 - 1), Math.round(13 + Math.sin(a) * r), C.cob[0]); }
  // the marks
  const n = tl.count ?? 0, drawN = tl.draw != null ? clamp(tl.draw, 0, 1) : 1;
  let pen = null;
  for (let i = 0; i < n; i++) {
    const [a, b] = markGeom(i), last = i === n - 1;
    const p = chalkStroke(S, a, b, last ? drawN : 1, { seed: i * 7 + 1, grain, fresh: last && drawN < 1.001 && tl.fresh !== false });
    if (last && drawN < 1) pen = p;
  }
  if (tl.star) {
    const [, b] = markGeom(n - 1), cx = b[0] + 26, cy = 86;
    const q = clamp(tl.star, 0, 1);
    pen = chalkPath(S, STAR(cx, cy, 15), q, { seed: 91, grain, fresh: true, w: 2.8 });
    if (q >= 1) pen = null;
  }
  // the hand: his own, holding the chalk, the tip on the stroke
  const hand = pen || (tl.touch != null ? [markGeom(0)[0][0] + 1, 90] : tl.stop ? (() => { const [a] = markGeom(n); return [a[0] + 2, a[1] - 3 - tl.stop * 6]; })() : null);
  if (hand) renderArm(S, keeperA, { at: [Math.round(hand[0]), Math.round(hand[1])], yaw: 140, hand: [-4, 13, 9], wrist: [30, 60, 0], grip: 0.6, prop: 'chalk', pitch: 15, zoom: 11 });
}

// ------------------------------------------------------------------ pencil and paper
/** a 1-px pencil path drawn to fraction prog; a darker pixel now and then where the lead presses. Returns the pen */
export function pencilPath(S, pts, prog, ramp, o = {}) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let left = L * clamp(prog, 0, 1), pen = pts[0], px = null, py = null;
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], f = Math.min(1, left / seg[i - 1]), n = Math.max(1, Math.ceil(seg[i - 1] * f * 2));
    for (let k = 0; k <= n; k++) {
      const u = (k / n) * f, x = Math.round(ax + (bx - ax) * u), y = Math.round(ay + (by - ay) * u);
      if (x === px && y === py) continue;
      S.set(x, y, ramp[hash(x * 13 + y * 7, o.seed ?? 1) < 0.2 || k === 0 ? 0 : 1]);
      if (o.bold) S.set(x + 1, y, ramp[1]);
      px = x; py = y; pen = [ax + (bx - ax) * u, ay + (by - ay) * u];
    }
    left -= seg[i - 1];
  }
  return pen;
}
/** a receipt: cream paper, a torn perforated top edge, the printed side's lines showing faintly through, a shadow */
export function receiptPaper(S, x, y, w, h, o = {}) {
  const P = C.paper;
  for (let j = 0; j < h + 2; j++) for (let i = 0; i < w + 2; i++) if (i >= 2 && j >= 2 && (i >= w || j >= h)) S.set(x + i, y + j, o.shadow ?? P[0]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const jt = o.flip ? h - 1 - j : j;
    if (jt < 2 && ((i + (jt ? 1 : 0)) % 3 === 0)) continue;                   // the torn perforation
    let lv = 4;
    if (i === 0 || j === (o.flip ? 0 : 2)) lv = 5;
    if (i === w - 1 || j === h - 1) lv = 2;
    // the print on the other side, mirrored and faint: a header, item lines, a total, the shop's little bottle mark
    const pr = (o.showThrough ?? true) && ((j === 12 && i > w * 0.3 && i < w * 0.7) || ([22, 28, 34].includes(j) && i > 8 && i < w - 8 && (i % 7 !== 0)) || (j === h - 14 && i > w * 0.55 && i < w - 8));
    if (pr && bayer(x + i, y + j) < 0.5) lv = 3;
    S.set(x + i, y + j, P[lv]);
  }
}

// the demon lord's weak point, in the keeper's hand (receipt coordinates, origin at the head's centre)
const mir = (p) => p.map(([x, y]) => [-x, y]);
const HORN_L = [[-11, -11], [-18, -15], [-24, -21], [-27, -29], [-25, -37], [-20, -42], [-22, -35], [-21, -28], [-17, -21], [-9, -14]];
export const WEAK = {
  blue: [
    [[-14, -8], [-16, 0], [-14, 8], [-8, 14], [0, 17], [8, 14], [14, 8], [16, 0], [14, -8], [8, -13], [0, -14], [-8, -13], [-14, -8]],
    HORN_L, mir(HORN_L),
    [[-11, -5], [-3, -1]], [[11, -5], [3, -1]],
    [[-8, 2], [-5, 2], [-6, 3], [-8, 2]], [[8, 2], [5, 2], [6, 3], [8, 2]],
    [[-8, 7], [-5, 11], [-2, 7], [1, 11], [4, 7], [7, 11], [9, 7]],
    // the sword: pommel, grip, guard, blade (two edges and the point)
    [[50, 24], [47, 19]], [[43, 20], [51, 14]], [[46, 17], [31, -6], [29, -12], [34, -9], [49, 15]],
  ],
  red: [
    // round the left horn, one and a quarter times, and an arrow from the sword's point to it, and a '!'
    Array.from({ length: 34 }, (_, k) => { const a = (200 + k * 13.5) * Math.PI / 180, r = 1 + k * 0.004; return [-21 + Math.cos(a) * 10.5 * r, -28 + Math.sin(a) * 15 * r]; }),
    [[26, -16], [14, -23], [-8, -28]], [[-3, -33], [-9, -28], [-3, -23]],
    [[54, -32], [53, -21]], [[53, -17], [53, -16]],
  ],
};
/** draw the doodle `d` to progress p (0..1 over all its strokes, blue first then red); returns the pen and its colour */
export function doodle(S, d, ox, oy, p, o = {}) {
  const strokes = [...d.blue.map((s) => [s, 'blue']), ...d.red.map((s) => [s, 'red'])];
  const lens = strokes.map(([s]) => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L + 6; });
  const tot = lens.reduce((a, b) => a + b, 0);
  let left = clamp(p, 0, 1) * tot, pen = null, which = 'blue';
  strokes.forEach(([s, col], i) => {
    if (left <= 0) return;
    const f = Math.min(1, left / lens[i]);
    const pts = s.map(([x, y]) => [ox + x * (o.flip ? -1 : 1) * (o.k ?? 1), oy + y * (o.flip ? -1 : 1) * (o.k ?? 1)]);
    const q = pencilPath(S, pts, Math.min(1, f * lens[i] / (lens[i] - 6)), col === 'blue' ? C.graph : C.redp, { seed: i + 1, bold: col === 'red' && o.boldRed });
    if (f < 1) { pen = q; which = col; }
    left -= lens[i];
  });
  return { pen, which };
}

// the keeper's right hand writing on something lying flat, seen from above
export const WRITING = { yaw: 240, hand: [-7, 11, 18], wrist: [35, 55, 0], pole: [-16, -4, 4], grip: 0.6, prop: 'pencil', pitch: 25, zoom: 10, noUpper: true };
/**
 * The quiet section's insert: the receipt on the bench, and the keeper's hand drawing the weak point.
 * u: 0..1 through the shot.
 */
export function drawReceipt(S, u, t) {
  boards(S, 0, 0, 320, 180, C.bench, { dir: 'h', size: 36, vary: 4, seed: 21, knots: 3, lv: 5, shade: (x, y) => -(x / 320) * 1.2 + (y > 150 ? -(y - 150) / 30 : 0) });
  // the gifts beside it: the shield's rim at the corner, the potion's shadow
  for (let y = 120; y < 180; y++) for (let x = 0; x < 60; x++) {
    const d = Math.hypot(x + 20, y - 200);
    if (d < 70) S.set(x, y, d > 66 ? C.iron[d > 68.5 ? 0 : 3] : d > 62 ? C.iron[1] : C.bench[d > 58 ? 3 : 5]);
  }
  const rx = 96, ry = 36, rw = 150, rh = 100;
  receiptPaper(S, rx, ry, rw, rh, { shadow: C.bench[2] });
  const ox = rx + 58, oy = ry + 58;
  // draw: 0.05–0.9 of the shot; then a beat to look at it
  const p = clamp((u - 0.05) / 0.85, 0, 1);
  const { pen, which } = doodle(S, WEAK, ox, oy, ease(p) * 0.35 + p * 0.65);
  const at = pen || (u < 0.05 ? [ox + 40, oy + 30] : u < 0.97 ? [ox + 70, oy + 34] : null);
  if (at) renderArm(S, keeperA, { at: [Math.round(at[0]), Math.round(at[1])], ...WRITING, propOpt: { end: which === 'red' ? 'R' : 'B' } });
}

// the keeper's map on the back of a receipt: the shop, the road (dashed), a tree, the ledge, the horned tower, a red X,
// a north arrow — the right way up. The hero holds it the other way.
const dash = (pts, on = 2.2, off = 1.8) => {
  const out = []; let carry = 0, draw = true, cur = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    let [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; let L = Math.hypot(bx - ax, by - ay);
    while (L > 0) {
      const need = (draw ? on : off) - carry, step = Math.min(need, L), f = step / L;
      const nx = ax + (bx - ax) * f, ny = ay + (by - ay) * f;
      if (draw) cur.push([nx, ny]);
      carry += step; L -= step; ax = nx; ay = ny;
      if (carry >= (draw ? on : off) - 1e-6) { if (draw) out.push(cur); draw = !draw; carry = 0; cur = [[ax, ay]]; }
    }
  }
  if (draw && cur.length > 1) out.push(cur);
  return out;
};
export const MAP = {
  blue: [
    [[-24, 14], [-24, 9], [-17, 9], [-17, 14], [-24, 14]], [[-25, 9], [-20.5, 5], [-16, 9]], [[-21, 14], [-21, 11], [-19, 11], [-19, 14]],
    ...dash([[-15, 12], [-7, 10], [-3, 5], [-8, 1], [0, -2], [8, -3], [13, -7], [17, -10]]),
    [[-11, 5], [-11, 3]], [[-12, 3], [-13, 1], [-11, -1], [-9, 1], [-10, 3], [-12, 3]],
    [[4, 0], [6, 2]], [[7, 0], [9, 2]], [[10, -1], [12, 1]],
    [[19, -5], [19, -13], [23, -13], [23, -5]], [[18, -13], [21, -18], [24, -13]], [[19, -14], [17, -16], [17.5, -18.5]], [[23, -14], [25, -16], [24.5, -18.5]],
    [[-22, -6], [-22, -15]], [[-24, -13], [-22, -15], [-20, -13]], [[-24, -17], [-24, -21], [-20, -17], [-20, -21]],
  ],
  red: [[[13, -6], [17, -2]], [[17, -6], [13, -2]]],
};
/**
 * The montage's map gag: the hero, close, holding up the keeper's map and nodding with great confidence — upside
 * down. u: 0..1 through the shot.
 */
export function drawMapInsert(S, u, t) {
  boards(S, 0, 0, 320, 180, C.wall, { dir: 'v', size: 22, vary: 4, seed: 31, knots: 3, lv: 4, shade: (x) => -Math.abs(x - 160) / 150 });
  const nod = Math.sin(t * 9) * 5, Y0 = 62 + 43.8 * 4.6;
  const face = { eyes: 'happy', brow: 0.8, mouth: { grin: 1 } };
  const arms = { L: { hand: [8.5, 29, 7.5], grip: 0.7, wrist: [20, -80, 0] }, R: { hand: [-8.5, 29, 7.5], grip: 0.7, wrist: [20, -80, 0] } };
  const fo = { x: 160, y: Y0, zoom: 4.6, pitch: 6, arms, head: [0, 8 + nod, 0], face };
  renderFigure(S, heroA, fo);
  // the map, upside down (its torn edge at the bottom), between his hands; then his hands again, over its edges
  const mx = 121, my = 104, mw = 78, mh = 52;
  receiptPaper(S, mx, my, mw, mh, { showThrough: false, flip: true });
  doodle(S, MAP, mx + mw / 2, my + mh / 2, 1, { flip: true, k: 1.3 });
  renderFigure(S, heroA, { ...fo, groups: ['armL', 'armR'] });
}

// ------------------------------------------------------------------ the coda: three things pushed across the counter
const G = {
  shield: R('ins.shield', '#b48454', 7, { lo: 0.22, hi: 0.84, at: 3, cool: 320, shift: 0.25 }),
  red: R('ins.red', '#c83e3a', 6, { lo: 0.22, hi: 0.86, cool: 330, warm: 40 }),
  glass: R('ins.glass', '#cfe2ea', 4, { lo: 0.55, hi: 0.99, cool: 230 }),
  cork: R('ins.cork', '#b98a58', 4, { lo: 0.35, hi: 0.8 }),
};
export function shieldFlat(S, cx, cy, rx, ry) {
  // a round wooden shield lying on the counter: planks, an iron rim with rivets, a boss, light from the upper left
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 3; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = Math.hypot(u, v);
    const us = (x + 0.5 - cx - 1) / rx, vs = (y + 0.5 - cy - 3) / ry;
    if (d > 1 && Math.hypot(us, vs) <= 1) { S.set(x, y, C.top[1]); continue; }       // its shadow on the counter
    if (d > 1) continue;
    const l = -u * 0.6 - v * 0.8;
    let c;
    if (d > 0.9) c = C.iron[d > 0.97 ? 0 : l > 0.2 ? 4 : 2];
    else if (d < 0.2) c = C.iron[d < 0.1 && l > 0 ? 4 : l > 0 ? 3 : 1];
    else { const pl = Math.floor((x - cx + rx) / 9), seam = Math.abs(((x - cx + rx) % 9)) < 1; c = G.shield[seam ? 1 : clamp(3 + (l > 0.3 ? 1 : l < -0.3 ? -1 : 0) + (pl % 2 ? 0 : 0), 0, 6)]; }
    S.set(x, y, c);
  }
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.set(Math.round(cx + Math.cos(a) * rx * 0.945), Math.round(cy + Math.sin(a) * ry * 0.945), C.iron[4]); }
}
export function potionUp(S, x, y, k = 2) {
  // a round red potion standing on the counter: glass, liquid with a lit side, a cork, a glint
  const rows = ['...cc...', '...cc...', '..gGGg..', '..g..g..', '.gRRRRg.', 'gRrRRRRg', 'gRrRRRRg', 'gRRRRRRg', 'gRRRRRRg', '.gRRRRg.', '..gggg..'];
  rows.forEach((row, j) => [...row].forEach((q, i) => {
    const c = { c: G.cork[2], g: G.glass[1], G: G.glass[2], R: G.red[2], r: G.red[4] }[q];
    if (!c) return;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) S.set(x + i * k + dx, y + j * k + dy, c);
  }));
  for (const [a, b] of [[2, 5], [2, 6], [3, 5]]) S.set(x + a * k - 1, y + b * k, G.glass[3]);
  for (let i = 0; i < 6 * k; i++) S.set(x + k + i, y + 11 * k, C.top[1]);
}
/** u: 0..1 through the shot */
export function drawPush(S, u, t) {
  boards(S, 0, 0, 320, 150, C.top, { dir: 'h', size: 26, vary: 4, seed: 41, knots: 2, lv: 4, shade: (x, y) => -y / 150 * 0.8 + (x < 60 ? -(60 - x) / 60 : 0) });
  S.rect(0, 150, 320, 30, C.top[1]); S.hline(0, 319, 150, C.top[6]); S.hline(0, 319, 151, C.top[5]); S.hline(0, 319, 152, C.top[3]);
  const slide = ease(clamp(u / 0.5, 0, 1)) * 24, lift = ease(clamp((u - 0.62) / 0.3, 0, 1)) * 90;
  // his hands behind the things, pushing; after the push they go back
  const arms = { L: { hand: [5, 23, 13], wrist: [10, -60, 0], grip: 0.1, pole: [14, 18, -6] }, R: { hand: [-5, 23, 13], wrist: [10, 60, 0], grip: 0.1, pole: [-14, 18, -6] } };
  if (lift < 88) renderFigure(S, keeperA, { x: 160, y: 126 + slide - lift, zoom: 8, pitch: 35, arms, groups: ['armL', 'armR'] });
  shieldFlat(S, 92, 70 + slide, 60, 30);
  potionUp(S, 214, 10 + slide, 3);
  // the receipt, nearest: the weak point, the right way up for whoever stands here
  const rx = 138, ry = 66 + slide;
  receiptPaper(S, rx, ry, 124, 80, { shadow: C.top[1] });
  doodle(S, WEAK, rx + 46, ry + 48, 1, { k: 0.85 });
}

// ------------------------------------------------------------------ the price tag under the shield
/** a thick ink stroke along a path (a brush: discs of radius r) */
function inkPath(S, pts, r, col) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; S.ellipse(x, y, r, r, col); }
  }
}
// blocky shop digits as strokes (a seven-segment hand): an 8 loses two strokes and becomes a 5
const SEG = { t: [[5, 3], [25, 3]], tl: [[3, 5], [3, 20]], tr: [[27, 5], [27, 20]], m: [[5, 22], [25, 22]], bl: [[3, 24], [3, 39]], br: [[27, 24], [27, 39]], b: [[5, 41], [25, 41]] };
const DIG = { 8: ['t', 'tl', 'tr', 'm', 'bl', 'br', 'b'], 0: ['t', 'tl', 'tr', 'bl', 'br', 'b'] };
function digit(S, d, ox, oy, col) { for (const k of DIG[d]) inkPath(S, SEG[k].map(([x, y]) => [ox + x, oy + y]), 2.4, col); }
/** chalk rubbed over ink: white on the paper, a grey ghost where the ink was */
function whiteout(S, a, b, prog, w, seed) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
  for (let s = 0; s <= L * prog; s += 0.5) for (let q = -w / 2; q <= w / 2; q += 0.5) {
    const x = Math.round(a[0] + dx * s - dy * q), y = Math.round(a[1] + dy * s + dx * q), hsh = hash(x * 31 + y * 17, seed);
    if (Math.abs(q) > w / 2 - 1 && hsh < 0.4) continue;
    const under = S.get(x, y), ink = under === C.ink[0] || under === C.chalk[1];
    S.set(x, y, ink ? C.chalk[hsh < 0.45 ? 1 : 2] : C.chalk[hsh < 0.15 ? 2 : hsh < 0.6 ? 3 : 4]);
  }
  return [a[0] + dx * L * prog, a[1] + dy * L * prog];
}
const loop = (cx, cy, rx, ry, a0 = -90, turn = 360, n = 40) => Array.from({ length: n + 1 }, (_, k) => { const a = (a0 + turn * k / n) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const FIVE = [[26, 3], [7, 3], [5, 21], [15, 17], [24, 22], [27, 32], [21, 41], [11, 43], [3, 37]];
/**
 * The montage's tag gag (and loop 3's glance at it): the shield on the wall, its tag hanging from a nail, "80" in ink;
 * the keeper's chalk writes a fat 5 over the 8. u: 0..1 (≤0.2 just the tag; 0.2–0.9 the chalk).
 */
export function drawTag(S, u, t) {
  boards(S, 0, 0, 320, 180, C.wall, { dir: 'v', size: 24, vary: 4, seed: 51, knots: 3, lv: 4, shade: (x, y) => (y < 40 ? -(40 - y) / 40 : 0) });
  // the shield's lower rim, hanging above
  for (let y = 0; y < 44; y++) for (let x = 60; x < 260; x++) {
    const d = Math.hypot((x - 160) / 96, (y + 60) / 100);
    if (d < 1) S.set(x, y, d > 0.95 ? C.iron[d > 0.985 ? 0 : 2] : d > 0.9 ? C.iron[3] : G.shield[(Math.floor((x - 64) / 14) % 2) ? 3 : 4]);
    else if (d < 1.04 && y > 2) S.set(x, y, C.wall[2]);
  }
  // the nail and the string
  S.set(160, 52, C.iron[1]); S.set(161, 52, C.iron[3]);
  S.line(160, 53, 128, 70, C.ink[1]); S.line(161, 53, 194, 70, C.ink[1]);
  // the tag: card with a reinforced hole, a shadow on the wall
  const tx = 100, ty = 68, tw = 120, th = 78;
  for (let y = ty + 3; y < ty + th + 3; y++) for (let x = tx + 4; x < tx + tw + 4; x++) S.set(x, y, C.wall[1]);
  receiptPaper(S, tx, ty, tw, th, { showThrough: false });
  for (let x = tx; x < tx + tw; x++) S.set(x, ty, C.paper[5]);
  S.ring(tx + tw / 2, ty + 9, 4, 4, C.paper[2]); S.ellipse(tx + tw / 2, ty + 9, 2.2, 2.2, C.wall[1]);
  // "80" in ink, blocky, the way the shop writes prices
  const ox = tx + 26, oy = ty + 22;
  digit(S, 8, ox, oy, C.ink[0]); digit(S, 0, ox + 40, oy, C.ink[0]);
  // the chalk: rub out the 8's upper right and lower left strokes, twice each: now it says 50
  const p = clamp((u - 0.2) / 0.7, 0, 1), rubs = [[[27, 2], [27, 21]], [[27, 21], [27, 3]], [[3, 23], [3, 42]], [[3, 42], [3, 24]]];
  let pen = null;
  rubs.forEach(([a, b], i) => { const q = clamp(p * 4 - i, 0, 1); if (q > 0) { const e = whiteout(S, [ox + a[0], oy + a[1]], [ox + b[0], oy + b[1]], q, 7, 61 + i); if (q < 1) pen = e; } });
  if (pen) renderArm(S, keeperA, { at: [Math.round(pen[0]), Math.round(pen[1])], yaw: 140, hand: [-4, 13, 9], wrist: [30, 60, 0], grip: 0.6, prop: 'chalk', pitch: 15, zoom: 11 });
}

// ------------------------------------------------------------------ the clock at 7:12
const K = {
  case: R('ins.case', '#6a4432', 7, { lo: 0.14, hi: 0.6, at: 3, cool: 320, shift: 0.25 }),
  brass: R('ins.brass', '#c79a45', 7, { lo: 0.22, hi: 0.95, at: 3, cool: 20, warm: 90, shift: 0.3 }),
  dial: R('ins.dial', '#ece2c8', 5, { lo: 0.62, hi: 0.98, cool: 40, warm: 90 }),
  hand: RX('ins.hand', ['#1c1418', '#3a2a2a', '#5a4a48']),
};
/** c: { pass (film time the minute hand reaches 12 past) }. The minute hand walks up to 7:12, holds a beat, goes on. */
export function drawClock(S, c, t) {
  boards(S, 0, 0, 320, 180, C.wall, { dir: 'v', size: 24, vary: 4, seed: 71, knots: 2, lv: 3 });
  const cx = 160, cy = 84, R0 = 64;
  // the case: a dark wooden hood round the dial, grain running down, a lit left edge
  boards(S, 82, 0, 156, 180, K.case, { dir: 'v', size: 26, vary: 3, seed: 72, knots: 2, lv: 3, shade: (x) => (x < 90 ? 1 : x > 228 ? -1 : 0) });
  for (let y = 0; y < 180; y++) { S.set(82, y, K.case[5]); S.set(237, y, K.case[0]); S.set(236, y, K.case[1]); }
  // the bezel: a brass ring lit from the upper left
  for (let y = cy - R0 - 8; y <= cy + R0 + 8; y++) for (let x = cx - R0 - 8; x <= cx + R0 + 8; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > R0 + 7 || d < R0 - 1) continue;
    const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), l = Math.cos(a + Math.PI * 0.75);
    let lv = 3 + Math.round(l * 1.6 + (bayer(x, y) - 0.5) * 0.6);
    if (d > R0 + 5.8) lv = 1; else if (d < R0) lv = 1; else if (d > R0 + 2.5 && d < R0 + 3.5) lv += 1;
    S.set(x, y, K.brass[clamp(lv, 0, 6)]);
  }
  // the dial: cream, a touch darker toward the rim; minute ticks, hour marks, four numerals
  for (let y = cy - R0; y <= cy + R0; y++) for (let x = cx - R0; x <= cx + R0; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R0;
    if (d >= 1) continue;
    S.set(x, y, K.dial[d > 0.92 ? 1 : d > 0.8 && bayer(x, y) < (d - 0.8) * 6 ? 2 : 3]);
  }
  for (let k = 0; k < 60; k++) {
    const a = k / 60 * Math.PI * 2, big = k % 5 === 0, r0 = big ? R0 - 11 : R0 - 6;
    for (let r = r0; r < R0 - 3; r++) { const x = Math.round(cx + Math.sin(a) * r), y = Math.round(cy - Math.cos(a) * r); S.set(x, y, K.hand[big ? 0 : 2]); if (big) S.set(x + 1, y, K.hand[0]); }
  }
  const num = (s, a) => { const r = R0 - 20, x = cx + Math.sin(a) * r, y = cy - Math.cos(a) * r; const w = s.length * 4 - 1; for (let dx = 0; dx < 2; dx++) digits(S, s, Math.round(x - w / 2) + dx, Math.round(y - 2), K.hand[0]); };
  num('12', 0); num('3', Math.PI / 2); num('6', Math.PI); num('9', Math.PI * 1.5);
  // the chalk mark he made on the case at 12 past
  const am = 12 / 60 * Math.PI * 2;
  chalkStroke(S, [cx + Math.sin(am) * (R0 + 11), cy - Math.cos(am) * (R0 + 11)], [cx + Math.sin(am) * (R0 + 22), cy - Math.cos(am) * (R0 + 22)], 1, { w: 3, seed: 5 });
  // the hands: the minute hand walks to 12 past, holds a beat, goes on
  const u = t - (c.pass - 2.2), hold = u > 2.2 && u < 2.7;
  const minute = hold ? 12 : u < 2.2 ? 12 - (2.2 - u) * 0.6 : 12 + (u - 2.7) * 0.6, hour = 7 + minute / 60;
  const hand = (a, len, w, tip, col, sh) => {
    for (let r = -6; r < len; r++) {
      const ww = r > len - tip ? w * (len - r) / tip : r < 0 ? w * 0.7 : w;
      for (let q = -ww; q <= ww; q += 0.5) {
        const x = Math.round(cx + Math.sin(a) * r + Math.cos(a) * q), y = Math.round(cy - Math.cos(a) * r + Math.sin(a) * q);
        if (sh) S.set(x + 1, y + 2, K.dial[1]); else S.set(x, y, col);
      }
    }
  };
  for (const sh of [true, false]) { hand((hour % 12) / 12 * Math.PI * 2, 34, 2.6, 10, K.hand[0], sh); hand(minute / 60 * Math.PI * 2, 54, 1.4, 12, K.hand[1], sh); }
  S.ellipse(cx + 0.5, cy + 0.5, 4, 4, K.brass[2]); S.ellipse(cx, cy, 2.5, 2.5, K.brass[5]);
  // the glass: a curved gleam at the upper left
  for (let k = 0; k < 40; k++) { const a = Math.PI * (1.1 + k / 40 * 0.45), r = R0 - 8; const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r); if (bayer(x, y) < 0.7) S.set(x, y, K.dial[4]); if (k > 8 && k < 30 && bayer(x + 1, y + 1) < 0.4) S.set(x + 1, y + 1, K.dial[4]); }
  // the pendulum's window below, the bob swinging with the ticks
  S.rect(136, 158, 48, 22, K.case[0]); S.hline(136, 183, 158, K.case[5]);
  const sw = Math.sin(t * Math.PI) * 14;
  S.line(160, 158, Math.round(160 + sw * 0.4), 170, K.brass[2]); S.ellipse(160 + sw, 174, 6, 6, K.brass[2]); S.ellipse(159 + sw, 173, 4, 4, K.brass[4]); S.set(Math.round(157 + sw), 171, K.brass[6]);
}

/** a plain backdrop of the shop's wall boards (for the portrait) */
export function wallBackdrop(S) { boards(S, 0, 0, 320, 180, C.wall, { dir: 'v', size: 26, vary: 4, seed: 91, knots: 3, lv: 3, shade: (x) => -Math.abs(x - 160) / 130 }); }

// ------------------------------------------------------------------ the candle, late at night
const W8 = {
  wax: R('ins.wax', '#efe6cf', 6, { lo: 0.5, hi: 0.98, cool: 30, warm: 90 }),
  flame: RX('ins.flame', ['#b0401a', '#f08a2a', '#ffc860', '#fff4d0'], 1),
  glow: RX('ins.glow', ['#6a3a20', '#a05a2a'], 1),
};
/** o: { len (0..1 of the candle left) } */
export function drawCandle(S, t, o = {}) {
  boards(S, 0, 0, 320, 118, C.wall, { dir: 'v', size: 24, vary: 4, seed: 81, knots: 2, lv: 2 });
  boards(S, 0, 118, 320, 62, C.top, { dir: 'h', size: 14, vary: 2, seed: 82, knots: 1, lv: 4 });
  for (let x = 0; x < 320; x++) { S.set(x, 118, C.top[6]); S.set(x, 119, C.top[5]); }
  const cx = 130, base = 140, len = o.len ?? 0.5, top = Math.round(base - 14 - 70 * len), hw = 13;
  // the brass dish and its ring handle
  S.ellipse(cx + 0.5, base + 1, 34, 7, K.brass[1]); S.ellipse(cx + 0.5, base, 32, 6, K.brass[3]); S.ellipse(cx - 4, base - 1, 22, 3.5, K.brass[5]);
  S.ring(cx + 38, base - 1, 7, 5, K.brass[2]); S.ring(cx + 38, base - 2, 6, 4, K.brass[4]);
  S.ellipse(cx + 0.5, base - 6, 9, 3, K.brass[2]); S.rect(cx - 6, base - 12, 13, 7, K.brass[3]); S.vline(cx - 6, base - 12, base - 6, K.brass[5]);
  // the wax: lit toward the flame on its left, drips down one side, a pool at the top
  for (let y = top; y < base - 11; y++) for (let x = cx - hw; x <= cx + hw; x++) {
    const v = (x - (cx - hw)) / (2 * hw);
    S.set(x, y, W8.wax[v < 0.15 ? 4 : v < 0.55 ? 3 : v < 0.85 ? 2 : 1]);
  }
  S.ellipse(cx + 0.5, top, hw, 3, W8.wax[4]); S.ellipse(cx + 0.5, top, hw - 4, 1.8, W8.wax[5]);
  for (const [dx, L] of [[-9, 18], [3, 10], [9, 26]]) { S.vline(cx + dx, top, top + L, W8.wax[dx < 0 ? 5 : 4]); S.set(cx + dx, top + L + 1, W8.wax[3]); S.vline(cx + dx + 1, top + 1, top + L - 2, W8.wax[3]); }
  // the wick and the flame, flickering
  S.vline(cx, top - 5, top - 1, C.ink[0]);
  const fl = Math.sin(t * 13) * 0.8 + Math.sin(t * 7.3 + 1) * 0.6, h = 18 + Math.sin(t * 9) * 1.5;
  for (let y = 0; y < h + 6; y++) for (let x = -6; x <= 6; x++) {
    const v = y / h, w = v < 0.7 ? 1 - (0.7 - v) / 0.7 * 0.85 : 1 - (v - 0.7) / 0.3 * 0.4;
    const bend = (1 - v) * fl;
    const d = Math.abs(x - bend) / (4.6 * w);
    if (v > 1.25 || d > 1) continue;
    const c = v > 0.8 && d < 0.5 ? 3 : v > 0.55 && d < 0.7 ? 2 : d < 0.85 ? 1 : 0;
    S.set(cx + x, top - 6 - h + y + 2, W8.flame[c]);
  }
  // his hands, folded on the counter at the right
  const arms = { L: { hand: [1.6, 23.4, 11], grip: 0.5, wrist: [20, -90, 0], pole: [14, 22, 2] }, R: { hand: [-1.6, 23.4, 10.4], grip: 0.5, wrist: [20, 90, 0], pole: [-14, 22, 2] } };
  renderFigure(S, keeperA, { x: 244, y: 214, zoom: 5, pitch: 24, arms, groups: ['armL', 'armR'], noUpper: true });
  // the candle's light: warm rings on everything near it
  lightRadial(S, cx, top - 10, 190, 4, { cls: 1, falloff: 1.1, clsAt: 0.02 });
  return { flame: [cx, top - 12] };
}
