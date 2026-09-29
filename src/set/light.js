// Light for the set: the time of day re-grades the whole palette; local light (the sunbeam through the window, the
// open door, the candle) moves pixels up their own ramps by whole steps with a narrow ordered-dither edge.
import { bayer } from '../pix/gfx.js';
import { hex, mix, rgb2lch, lch2rgb } from '../pix/color.js';

// grade keys: [hour, multiply rgb, lift rgb (added to shadows), saturation]
const GK = [
  [0, [0.3, 0.36, 0.62], [4, 6, 18], 0.6],
  [5.0, [0.36, 0.38, 0.62], [6, 6, 18], 0.65],
  [5.8, [0.72, 0.64, 0.8], [14, 6, 16], 0.85],
  [6.8, [1.04, 0.97, 0.9], [8, 4, 0], 1.0],
  [9, [1.02, 1.0, 0.96], [2, 2, 2], 1.0],
  [15, [1.0, 0.98, 0.95], [2, 2, 2], 1.0],
  [17.2, [1.05, 0.93, 0.8], [8, 2, 4], 1.04],
  [18.4, [0.98, 0.72, 0.6], [14, 4, 12], 1.02],
  [19.4, [0.48, 0.44, 0.66], [8, 4, 18], 0.75],
  [20.5, [0.3, 0.36, 0.62], [4, 6, 18], 0.6],
  [24, [0.3, 0.36, 0.62], [4, 6, 18], 0.6],
];
function key(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (i + 1 < GK.length && GK[i + 1][0] <= h) i++;
  const a = GK[i], b = GK[Math.min(GK.length - 1, i + 1)], t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]);
  const L = (p, q) => p.map((v, j) => v + (q[j] - v) * t);
  return { mul: L(a[1], b[1]), lift: L(a[2], b[2]), sat: a[3] + (b[3] - a[3]) * t };
}
const CANDLE = [0.96, 0.74, 0.5];

/**
 * A grading function for Surface.toRGB: (rgb, pixelIndex, paletteIndex) → rgb.
 * lightClass (Surface.lc): 0 ambient, 1 candle-lit (warm, keeps its colour at night), 2 sun.
 */
export function grader(hour, S) {
  const g = key(hour);
  const cache = new Map();
  return (rgb, i) => {
    const cls = S && S.lc ? S.lc[i] : 0;
    let m = g.mul, lift = g.lift, sat = g.sat;
    if (cls === 1) { const w = 0.72; m = m.map((v, j) => v * (1 - w) + CANDLE[j] * w); lift = [10, 4, 0]; sat = Math.max(sat, 0.95); }
    if (cls === 2) { m = m.map((v, j) => v * [1.06, 1.02, 0.94][j]); }
    let [r, gg, b] = rgb.map((v, j) => v * m[j] + lift[j] * (1 - v / 255));
    if (sat !== 1) { const l = 0.3 * r + 0.59 * gg + 0.11 * b; r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat; }
    return [r, gg, b].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  };
}

/** apply `steps` of light inside a polygon (screen space), with a dithered edge `soft` px wide. cls marks the light colour */
export function lightPoly(S, pts, steps, o = {}) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const soft = o.soft ?? 2;
  const dist = (px, py) => {           // signed distance to the polygon (negative inside)
    let d = 1e9, inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j], [bx, by] = pts[i];
      if ((ay > py) !== (by > py) && px < ax + (py - ay) * (bx - ax) / (by - ay)) inside = !inside;
      const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
      d = Math.min(d, Math.hypot(px - ax - vx * t, py - ay - vy * t));
    }
    return inside ? -d : d;
  };
  for (let y = Math.max(0, Math.floor(y0 - soft)); y < Math.min(S.h, Math.ceil(y1 + soft)); y++)
    for (let x = Math.max(0, Math.floor(x0 - soft)); x < Math.min(S.w, Math.ceil(x1 + soft)); x++) {
      const i = y * S.w + x;
      if (S.px[i] < 0 || (o.only && !o.only(x, y, i))) continue;
      const d = dist(x + 0.5, y + 0.5);
      const a = Math.max(0, Math.min(1, 0.5 - d / (soft * 2 || 1)));
      if (a <= 0) continue;
      if (a >= 1 || a > bayer(x, y)) {
        S.lt[i] = Math.max(-8, Math.min(8, S.lt[i] + steps));
        if (o.cls != null && S.lc) S.lc[i] = o.cls;
      }
    }
}

/** radial light (candle): rings of `steps`, `steps-1`, … out to radius r, dithered between rings */
export function lightRadial(S, cx, cy, r, steps, o = {}) {
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(S.h, Math.ceil(cy + r)); y++)
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(S.w, Math.ceil(cx + r)); x++) {
      const i = y * S.w + x; if (S.px[i] < 0) continue;
      const d = Math.hypot((x + 0.5 - cx), (y + 0.5 - cy) * (o.squash ?? 1)) / r;
      if (d >= 1) continue;
      // whole steps in rings, dithered only in a narrow band where one ring meets the next
      const v = Math.pow(1 - d, o.falloff ?? 0.8) * steps;
      const q = Math.floor(v + (bayer(x, y) - 0.5) * (o.band ?? 0.35) + 0.5);
      if (q > 0) { S.lt[i] = Math.max(-8, Math.min(8, S.lt[i] + q)); if (S.lc && o.cls != null && (1 - d) > (o.clsAt ?? 0.15)) S.lc[i] = o.cls; }
    }
}
