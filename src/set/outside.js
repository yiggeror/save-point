// The world outside the window: sky, clouds, the far mountains with the demon lord's tower on the highest peak,
// the green hills and the path that winds up to it, the village roofs just outside. Layers drift at their own
// speeds; the sky and the light follow the time of day.
import { NOLIGHT, EMIT, PAL, bayer } from '../pix/gfx.js';
import { R, RX, rnd } from './kit.js';
import { hex, mix, toHex } from '../pix/color.js';

// ramps (daylight colours; the time of day re-grades them)
const C = {
  mtnFar:  R('out.mtnFar', '#8fa3c7', 5, { lo: 0.55, hi: 0.86, cool: 280, shift: 0.2 }),
  mtnMid:  R('out.mtnMid', '#6f8fa6', 5, { lo: 0.45, hi: 0.8, cool: 280, shift: 0.2 }),
  snow:    R('out.snow', '#e8eef7', 4, { lo: 0.7, hi: 0.98, cool: 270 }),
  hill:    R('out.hill', '#6d9a5a', 6, { lo: 0.36, hi: 0.82, cool: 200, warm: 95, shift: 0.3 }),
  hill2:   R('out.hill2', '#86a860', 6, { lo: 0.42, hi: 0.86, cool: 200, warm: 95, shift: 0.3 }),
  forest:  R('out.forest', '#3f6b4f', 5, { lo: 0.26, hi: 0.62, cool: 220, shift: 0.3 }),
  path:    R('out.path', '#d2b27a', 5, { lo: 0.5, hi: 0.9 }),
  tower:   R('out.tower', '#4b3d5c', 6, { lo: 0.16, hi: 0.62, cool: 290, shift: 0.2 }),
  towerLit: RX('out.towerLit', ['#ff9a4a', '#ffd27a', '#fff2c0'], EMIT),
  roof:    R('out.roof', '#b0553e', 6, { lo: 0.3, hi: 0.78, cool: 330, shift: 0.3 }),
  roof2:   R('out.roof2', '#5e6f8a', 6, { lo: 0.3, hi: 0.78, cool: 280, shift: 0.3 }),
  house:   R('out.house', '#e0cfae', 5, { lo: 0.5, hi: 0.93 }),
  tree:    R('out.tree', '#4f8a4a', 6, { lo: 0.28, hi: 0.78, cool: 200, warm: 95, shift: 0.35 }),
  trunk:   R('out.trunk', '#6b4a36', 4, { lo: 0.25, hi: 0.6 }),
  smoke:   R('out.smoke', '#d8d8e0', 4, { lo: 0.62, hi: 0.95 }),
  win:     RX('out.win', ['#2c2a3a', '#ffcf6a', '#fff1b8'], EMIT),
  flag:    R('out.flag', '#8e2f5a', 4, { lo: 0.3, hi: 0.65 }),
};
// a block of palette slots rewritten every frame for the sky (it is light, so it is not graded)
const SKY = RX('out.sky', Array.from({ length: 12 }, () => '#000000'), EMIT);
const CLOUD = RX('out.cloud', Array.from({ length: 4 }, () => '#ffffff'), EMIT);
const STAR = RX('out.star', ['#8890c0', '#e8ecff'], EMIT);

// sky gradients by hour: [hour, top, middle, horizon]
const SKYKEYS = [
  [0, '#0d1230', '#1a2150', '#2a3060'], [4.5, '#141a44', '#2d2f66', '#5b4a78'], [5.6, '#3a4a8a', '#a7789a', '#f2a88a'],
  [6.6, '#6f9fd8', '#b3c9e6', '#f8dcb4'], [8, '#5f9ce0', '#9cc6ec', '#dcecf2'], [12, '#4f92e0', '#8cc0ee', '#cfe6f4'],
  [16.5, '#5a90d6', '#9ec2e6', '#f0e2c0'], [18, '#4a6ab8', '#d98a7a', '#ffc27a'], [19, '#2a3070', '#7a4a7a', '#e0785a'],
  [20, '#141a44', '#2a2a5c', '#4a3a66'], [24, '#0d1230', '#1a2150', '#2a3060'],
];
const CLOUDKEYS = [
  [0, '#2a3060', '#3a4478', '#4a5890', '#5a6aa0'], [5.6, '#6a5a8a', '#b88aa0', '#f0b8a8', '#ffe0c8'], [7, '#b8c4dc', '#dde6f2', '#f6f8fc', '#ffffff'],
  [12, '#b8c8e0', '#dce8f4', '#f6faff', '#ffffff'], [17, '#b8b8d0', '#e0d8e0', '#fff0e0', '#fffaf0'], [18.3, '#7a5a8a', '#d0808a', '#ffb088', '#ffe0b0'],
  [19.4, '#3a3060', '#5a4070', '#8a5a78', '#a87080'], [20.5, '#1e2448', '#2a3258', '#384068', '#465078'], [24, '#2a3060', '#3a4478', '#4a5890', '#5a6aa0'],
];
function keyed(keys, h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= h) i++;
  const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)];
  const t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((c, j) => mix(hex(c), hex(b[j + 1]), t));
}
export function skyAt(h) { return keyed(SKYKEYS, h); }

/** a 1D ridge: height at x (deterministic) */
function ridge(seed, x, scale, oct = 4) {
  let v = 0, amp = 1, f = 1 / scale, tot = 0;
  for (let o = 0; o < oct; o++) {
    const xi = Math.floor(x * f), xf = x * f - xi;
    const h1 = hashf(seed + o * 101, xi), h2 = hashf(seed + o * 101, xi + 1);
    const u = xf * xf * (3 - 2 * xf);
    v += (h1 + (h2 - h1) * u) * amp; tot += amp; amp *= 0.5; f *= 2;
  }
  return v / tot;
}
function hashf(s, i) { let h = (i * 374761393 + s * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/**
 * Draw the view into the rectangle (x0,y0,w,h) of surface S.
 * o: { hour, t (seconds, for drift), zoom (1 = seen through the window in the wide shot), towerFlash (0..1),
 *      hero: { u (0..1 along the path), frame } }
 * Returns layout info (tower top, path points) for effects.
 */
export function drawOutside(S, x0, y0, w, h, o = {}) {
  const hour = o.hour ?? 7, t = o.t ?? 0, z = o.zoom ?? 1;
  const clip = S.clip; S.clip = [x0, y0, x0 + w, y0 + h];
  // --- sky (banded, dithered where the bands meet)
  const [top, mid, hor] = skyAt(hour);
  const bands = 6;
  for (let i = 0; i < bands; i++) {
    const u = i / (bands - 1);
    PAL.rgb[SKY[i]] = (u < 0.5 ? mix(top, mid, u * 2) : mix(mid, hor, (u - 0.5) * 2)).map(Math.round);
  }
  for (let y = 0; y < h; y++) {
    const v = (y / (h * 0.78)) * (bands - 1);
    for (let x = 0; x < w; x++) {
      const b = Math.min(bands - 1, Math.floor(v + (bayer(x, y) - 0.5) * 0.9 + 0.5));
      S.set(x0 + x, y0 + y, SKY[Math.max(0, b)]);
    }
  }
  // --- stars at night
  const night = hour >= 19.6 || hour < 5.4;
  if (night) {
    const rng = rnd(99);
    for (let i = 0; i < w * h / 60; i++) {
      const sx = (rng() * w) | 0, sy = (rng() * h * 0.55) | 0, tw = Math.sin(t * (1 + rng() * 2) + i) > 0.6;
      S.set(x0 + sx, y0 + sy, STAR[tw ? 1 : 0]);
    }
  }
  // --- sun / moon
  const sunUp = hour > 5.6 && hour < 19.2;
  if (sunUp) {
    const u = (hour - 5.6) / (19.2 - 5.6);
    const sx = x0 + w * (0.12 + 0.8 * u), sy = y0 + h * (0.62 - Math.sin(u * Math.PI) * 0.55);
    const sr = 3.2 * z;
    PAL.rgb[SKY[10]] = hour < 7 || hour > 17.5 ? [255, 214, 150] : [255, 248, 222];
    PAL.rgb[SKY[11]] = hour < 7 || hour > 17.5 ? [255, 180, 120] : [255, 236, 190];
    S.ellipse(sx, sy, sr + 1, sr + 1, SKY[11]); S.ellipse(sx, sy, sr, sr, SKY[10]);
  } else {
    const mx = x0 + w * 0.24, my = y0 + h * 0.18;
    PAL.rgb[SKY[10]] = [236, 238, 255]; PAL.rgb[SKY[11]] = [150, 160, 210];
    S.ellipse(mx, my, 2.6 * z, 2.6 * z, SKY[10]); S.ellipse(mx + 1.2 * z, my - 0.6 * z, 2.2 * z, 2.2 * z, SKY[Math.min(5, 1)]);
  }
  // --- clouds: soft cumulus made of stacked ellipses, drifting
  const cc = keyed(CLOUDKEYS, hour);
  CLOUD.forEach((i, j) => (PAL.rgb[i] = cc[j].map(Math.round)));
  const drift = (t * 1.2 * z) % (w + 60 * z);
  const clouds = [[0.1, 0.2, 1.0], [0.55, 0.12, 0.8], [0.85, 0.3, 0.6], [0.35, 0.36, 0.5]];
  clouds.forEach(([cx, cy, sc], k) => {
    let X = x0 + ((cx * (w + 60 * z) + drift * (0.6 + k * 0.15)) % (w + 60 * z)) - 30 * z, Y = y0 + cy * h;
    cloud(S, X, Y, sc * z, k);
  });
  // --- far mountains + the tower
  const hz = y0 + h * 0.62;                     // horizon line of the far range
  const peakX = x0 + w * 0.7;
  const far = [];
  for (let x = 0; x < w; x++) {
    const X = x0 + x;
    let hgt = (ridge(3, x / z, 22) * 0.55 + 0.25) * h * 0.34;
    const dp = Math.abs(X - peakX) / (w * 0.22);
    hgt += Math.max(0, 1 - dp) ** 1.4 * h * 0.26;
    far.push(hz - hgt);
  }
  for (let x = 0; x < w; x++) {
    const X = x0 + x, top = Math.round(far[x]);
    const slope = far[Math.min(w - 1, x + 1)] - far[Math.max(0, x - 1)];
    for (let y = top; y < y0 + h; y++) {
      const lit = slope > 0.2 ? 3 : slope < -0.2 ? 1 : 2;
      const snowy = y - top < 2 + (Math.abs(X - peakX) < w * 0.12 ? 3 : 0) && top < hz - h * 0.2;
      S.set(X, y, snowy ? C.snow[lit >= 2 ? 3 : 1] : C.mtnFar[lit], NOLIGHT);
    }
    S.set(X, top, C.mtnFar[4], NOLIGHT);
  }
  const peakY = Math.round(far[Math.round(peakX - x0)]);
  const tw = tower(S, Math.round(peakX), peakY + 1, z, o.towerFlash ?? 0, hour);
  // --- mid range and forest line
  const hz2 = y0 + h * 0.74;
  for (let x = 0; x < w; x++) {
    const X = x0 + x, hgt = (ridge(11, x / z, 14) * 0.6 + 0.2) * h * 0.16, top = Math.round(hz2 - hgt);
    for (let y = top; y < y0 + h; y++) S.set(X, y, C.mtnMid[y === top ? 3 : 2], NOLIGHT);
    // forest: bumpy tree tops
    const ft = Math.round(hz2 + 1 - ridge(17, x / z, 2.2, 2) * 3 * z);
    for (let y = ft; y < y0 + h; y++) S.set(X, y, C.forest[y === ft ? 3 : y - ft < 2 ? 2 : 1], NOLIGHT);
  }
  // --- green hills with the path
  const hz3 = y0 + h * 0.84;
  const hillTop = [];
  for (let x = 0; x < w; x++) {
    const X = x0 + x, hgt = (ridge(23, x / z, 30, 3) * 0.7 + 0.2) * h * 0.12, top = Math.round(hz3 - hgt);
    hillTop.push(top);
    for (let y = top; y < y0 + h; y++) {
      const d = y - top;
      S.set(X, y, C.hill2[d === 0 ? 4 : d < 3 ? 3 : 2 + ((bayer(X, y) < 0.3 && d < 5) ? 1 : 0)], NOLIGHT);
    }
  }
  // the path: from the bottom left, zig-zagging up the hills toward the tower
  const path = [[0.08, 1.02], [0.2, 0.93], [0.42, 0.9], [0.36, 0.84], [0.52, 0.8], [0.6, 0.76], [0.66, 0.72], [0.69, 0.66]]
    .map(([u, v]) => [x0 + u * w, y0 + v * h]);
  for (let i = 0; i + 1 < path.length; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let k = 0; k <= n; k++) {
      const q = k / n, px = ax + (bx - ax) * q, py = ay + (by - ay) * q;
      const wdt = Math.max(1, (py - y0) / h * 3.2 * z - 0.6);
      for (let dx = -Math.floor(wdt / 2); dx <= Math.floor(wdt / 2); dx++) S.set(Math.round(px + dx), Math.round(py), C.path[py > y0 + h * 0.8 ? 3 : 2], NOLIGHT);
    }
  }
  // --- village roofs just outside (in front of the hills)
  village(S, x0, y0, w, h, z, t, hour);
  // --- a tree at the right edge, swaying
  treeAt(S, x0 + w * 0.9, y0 + h + 2, z, t);
  S.clip = clip;
  return { tower: tw, path, horizon: hz };
}

function cloud(S, X, Y, sc, k) {
  const blobs = [[0, 0, 7, 3.4], [6, -2, 6, 4], [12, 0, 6, 3.2], [-6, 1, 4.5, 2.4], [17, 1.5, 4, 2]];
  for (const [bx, by, rx, ry] of blobs) S.ellipse(X + bx * sc, Y + by * sc, rx * sc, ry * sc, CLOUD[2]);
  for (const [bx, by, rx, ry] of blobs) S.ellipse(X + bx * sc - 0.8 * sc, Y + by * sc - 0.8 * sc, rx * sc * 0.75, ry * sc * 0.65, CLOUD[3]);
  // flat, shaded underside
  for (let x = Math.floor(X - 10 * sc); x < X + 22 * sc; x++) {
    const y = Math.round(Y + 2.6 * sc);
    if (S.get(x, y - 1) === CLOUD[2] || S.get(x, y - 1) === CLOUD[3]) { S.set(x, y, CLOUD[1]); S.set(x, y - 1, CLOUD[1]); }
  }
}

/** the demon lord's tower: a crooked dark spire with horns and one glowing window */
function tower(S, x, y, z, flash, hour) {
  const T = C.tower, H = Math.round(22 * z), W = Math.max(3, Math.round(4 * z));
  for (let j = 0; j < H; j++) {
    const u = j / H, ww = Math.max(1, Math.round(W * (1 - u * 0.45)));
    const lean = Math.round(Math.sin(u * 2.2) * 0.8 * z);
    for (let i = 0; i < ww; i++) S.set(x - Math.floor(ww / 2) + i + lean, y - j, T[i === 0 ? 3 : i === ww - 1 ? 1 : 2], NOLIGHT);
  }
  // battlement ring and horns
  const ty = y - H, tl = Math.round(Math.sin(2.2) * 0.8 * z);
  for (let i = -2; i <= 2; i++) S.set(x + i + tl, ty, T[2], NOLIGHT);
  for (const s of [-1, 1]) { S.set(x + s * 2 + tl, ty - 1, T[2], NOLIGHT); S.set(x + s * 3 + tl, ty - 2, T[1], NOLIGHT); if (z > 1.5) S.set(x + s * 3 + tl, ty - 3, T[1], NOLIGHT); }
  S.set(x + tl, ty - 1, T[3], NOLIGHT); S.set(x + tl, ty - 2, T[2], NOLIGHT);
  // a small flag on the spire
  S.set(x + tl, ty - 3, T[1], NOLIGHT); S.set(x + tl + 1, ty - 3, C.flag[2], NOLIGHT); S.set(x + tl + 2, ty - 3, C.flag[3], NOLIGHT);
  // the window: dim by day, glowing at night, white-hot on a flash
  const wy = ty + Math.round(4 * z);
  const lit = flash > 0 ? 2 : hour > 18.5 || hour < 6 ? 1 : 0;
  S.set(x + tl, wy, C.win[lit]);
  if (z > 1.5) S.set(x + tl, wy + 1, C.win[lit]);
  return { x: x + tl, y: ty, win: [x + tl, wy], H };
}

function village(S, x0, y0, w, h, z, t, hour) {
  const base = y0 + h;
  const houses = [[0.02, 0.8, C.roof, 1.0], [0.24, 0.86, C.roof2, 0.8], [0.52, 0.9, C.roof, 0.7]];
  for (const [u, v, roof, sc] of houses) {
    const hx = x0 + u * w, hy = y0 + v * h, hw = 16 * z * sc, hh = 8 * z * sc;
    // wall
    S.rect(Math.round(hx + 2 * z), Math.round(hy), Math.round(hw - 4 * z), Math.round(base - hy), C.house[3], NOLIGHT);
    // window, lit in the evening
    const lit = hour > 18.2 || hour < 6.2;
    S.rect(Math.round(hx + hw * 0.5), Math.round(hy + 3 * z), Math.max(1, Math.round(2 * z)), Math.max(1, Math.round(2 * z)), lit ? C.win[1] : C.house[1], lit ? EMIT : NOLIGHT);
    // roof: a triangle with shingles
    const ry = Math.round(hy - hh * 0.9);
    for (let j = 0; j <= Math.round(hh); j++) {
      const hwj = (j / hh) * (hw / 2 + 2 * z);
      for (let x = Math.round(hx + hw / 2 - hwj); x <= Math.round(hx + hw / 2 + hwj); x++)
        S.set(x, ry + j, roof[j === 0 ? 4 : (j % 3 === 0 ? 2 : x < hx + hw / 2 ? 3 : 2)], NOLIGHT);
    }
    // chimney + smoke
    const cx = Math.round(hx + hw * 0.72), cy = Math.round(ry + hh * 0.3);
    S.rect(cx, cy - Math.round(3 * z), Math.max(2, Math.round(2 * z)), Math.round(3 * z), C.roof[1], NOLIGHT);
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.35 + k * 0.25 + u) % 1;
      const sx = cx + 1 + Math.sin(ph * 5 + u * 7) * 1.5 * z + ph * 4 * z, sy = cy - 4 * z - ph * 12 * z;
      const r = (0.8 + ph * 1.6) * z;
      S.ellipse(sx, sy, r, r * 0.8, C.smoke[ph < 0.5 ? 3 : 2], NOLIGHT);
    }
  }
}

function treeAt(S, x, y, z, t) {
  const sway = Math.round(Math.sin(t * 0.9) * 0.7 * z);
  S.rect(Math.round(x), Math.round(y - 14 * z), Math.max(2, Math.round(2 * z)), Math.round(14 * z), C.trunk[2], NOLIGHT);
  const blobs = [[0, -18, 7, 6], [-5, -14, 5, 4], [5, -13, 5, 4], [0, -24, 5, 4]];
  for (const [bx, by, rx, ry] of blobs) S.ellipse(x + bx * z + sway, y + by * z, rx * z, ry * z, C.tree[2], NOLIGHT);
  for (const [bx, by, rx, ry] of blobs) S.ellipse(x + bx * z + sway - z, y + by * z - z, rx * z * 0.7, ry * z * 0.6, C.tree[3], NOLIGHT);
  for (const [bx, by, rx, ry] of blobs) S.ellipse(x + bx * z + sway - 1.6 * z, y + by * z - 1.8 * z, rx * z * 0.35, ry * z * 0.3, C.tree[4], NOLIGHT);
}
