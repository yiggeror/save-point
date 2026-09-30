// Wooden boards drawn as pixel art: grain lines that run along each board and bend round the knots (1 px, never
// broken), a lit lip and a dark gap on every board, knots, nails. Used by the close-ups and the medium shot.
import { bayer } from '../pix/gfx.js';
import { R, rnd } from './kit.js';

const IRON = R('ins.iron', '#5e6470', 5, { lo: 0.16, hi: 0.72, cool: 260 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/**
 * Boards: dir 'h' (running left–right, stacked) or 'v' (side by side). Grain lines flow along the board and bend round
 * knots; each board has a lit leading edge and a dark gap; nails where o.nails says. shade(x, y) → extra steps
 * (float; dithered). Returns a grain mask (1 where a groove runs) for chalk to skip over.
 */
export function boards(S, x0, y0, w, h, ramp, o = {}) {
  const dir = o.dir ?? 'h', seed = o.seed ?? 3, rng = rnd(seed), base = o.lv ?? Math.floor(ramp.length / 2);
  const sizes = [];
  for (let a = 0, i = 0; a < (dir === 'h' ? h : w); i++) { const s = (o.size ?? 28) + Math.round((rng() - 0.5) * (o.vary ?? 6)); sizes.push([a, s, rng() < 0.3 ? -1 : rng() < 0.25 ? 1 : 0]); a += s; }
  const knots = [];
  for (let k = 0; k < (o.knots ?? 5); k++) knots.push([x0 + rng() * w, y0 + rng() * h, 1.6 + rng() * 2.2]);
  const mask = new Uint8Array(w * h);
  // the grain phase at (i, j): distance across the board, bent by slow waves and round the knots
  const phase = (i, j, b, b0, bs) => {
    const x = x0 + i, y = y0 + j, along = dir === 'h' ? i : j, v = (dir === 'h' ? j : i) - b0;
    let ph = v + Math.sin(along * 0.011 + b * 1.7 + seed) * bs * 0.3 + Math.sin(along * 0.043 + b * 3.1) * 1.4;
    for (const [kx, ky, kr] of knots) {
      const dx = x - kx, dy = y - ky, d = Math.hypot(dir === 'h' ? dx * 0.4 : dx, dir === 'h' ? dy : dy * 0.4);
      ph += (dir === 'h' ? Math.sign(dy) : Math.sign(dx)) * kr * 2.4 * Math.exp(-((d / (kr * 1.9)) ** 2));
    }
    return ph;
  };
  const SP = [4.2, 6.5, 5.1, 7.3, 4.8];
  const lineIdx = (ph, b) => { let k = 0, a = 0; while (a + SP[(k + b) % SP.length] <= ph && k < 60) { a += SP[(k + b) % SP.length]; k++; } return k; };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + i, y = y0 + j;
    const along = dir === 'h' ? i : j, across = dir === 'h' ? j : i;
    let b = sizes.length - 1; while (b > 0 && sizes[b][0] > across) b--;
    const [b0, bs, bv] = sizes[b], v = across - b0;
    let lv = base + bv;
    // a grain line wherever the phase crosses a line boundary between this pixel and the one before it (1 px, unbroken)
    const ph = phase(i, j, b, b0, bs), ph0 = dir === 'h' ? phase(i, j - 1, b, b0, bs) : phase(i - 1, j, b, b0, bs);
    const k1 = lineIdx(Math.max(0, ph), b), k0 = lineIdx(Math.max(0, ph0), b);
    if (k1 !== k0 && v > 1) { lv -= 1; mask[j * w + i] = 1; if ((k1 + b) % 3 === 0 && hash(Math.floor(along / 9) + k1 * 31, seed) < 0.6) lv -= 0; }
    let inKnot = -1;
    for (const [kx, ky, kr] of knots) { const d = Math.hypot(dir === 'h' ? (x - kx) * 0.55 : x - kx, dir === 'h' ? y - ky : (y - ky) * 0.55); if (d < kr) inKnot = d / kr; }
    if (inKnot >= 0) lv = base - (inKnot < 0.4 ? 3 : inKnot < 0.75 ? 1 : 2);
    // edges: a lit lip, then the gap
    if (v === 0) lv += 1;
    if (v === bs - 1) lv = 1;
    if (v === bs - 2) lv -= 1;
    if (o.shade) { const sv = o.shade(x, y); lv += Math.floor(sv + bayer(x, y) * 0.999); }
    S.set(x, y, ramp[clamp(lv, 0, ramp.length - 1)]);
  }
  // nails: a dark head with a lit rim, a little rust stain under some
  for (const [nx, ny] of o.nails || []) {
    S.set(nx, ny, IRON[1]); S.set(nx + 1, ny, IRON[0]); S.set(nx, ny + 1, IRON[0]); S.set(nx + 1, ny + 1, IRON[0]); S.set(nx, ny, IRON[3]);
    if (hash(nx * 7 + ny, 5) < 0.5) S.set(nx + 1, ny + 2, ramp[2]);
  }
  return { mask, x0, y0, w, h, at: (x, y) => (x >= x0 && y >= y0 && x < x0 + w && y < y0 + h ? mask[(y - y0) * w + (x - x0)] : 0) };
}

