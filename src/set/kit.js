// Set-dressing kit: palette ramps for the shop and pixel-art drawing helpers (planks, beams, bevels, bottles,
// books, jars, tags…). Everything is drawn with whole palette steps; texture comes from hand-placed clusters and a
// seeded random, never from noise filters.
import { ramp as palRamp, stamp, bayer, Surface } from '../pix/gfx.js';
import { ramp as rampColors, hex } from '../pix/color.js';

export const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** a set ramp generated from a base colour (n steps, base at `at`) */
export const R = (name, base, n = 6, o = {}) => palRamp(name, rampColors(base, n, { at: o.at ?? Math.floor(n / 2), ...o }));
/** a set ramp from explicit colours */
export const RX = (name, cols, flags) => palRamp(name, cols, flags);

// the oblique projection of the set: X right, Y up, Z toward the camera (0 = back wall)
export const K = 0.45, FLOOR = 124;
export const P = (X, Y, Z) => [X, FLOOR + Z * K - Y];

/** a bevelled block: face colour, light top/left edge, dark bottom/right edge */
export function bevel(s, x, y, w, h, r, lv = 3, o = {}) {
  s.rect(x, y, w, h, r[lv]);
  if (o.top !== false) s.hline(x, x + w - 1, y, r[Math.min(r.length - 1, lv + 1)]);
  if (o.left) s.vline(x, y, y + h - 1, r[Math.min(r.length - 1, lv + 1)]);
  s.hline(x, x + w - 1, y + h - 1, r[Math.max(0, lv - 2)]);
  if (o.right !== false) s.vline(x + w - 1, y + 1, y + h - 1, r[Math.max(0, lv - 1)]);
}

/** a wall or floor of planks. dir 'h' (boards run left–right) or 'v'. */
export function planks(s, x0, y0, w, h, r, o = {}) {
  const rng = rnd(o.seed ?? 7), dir = o.dir ?? 'v', bw = o.board ?? 9, base = o.lv ?? 3;
  if (dir === 'v') {
    let x = x0 - (o.offset ?? 0);
    let i = 0;
    while (x < x0 + w) {
      const bwi = bw + ((rng() * 3) | 0) - 1, lv = base + (rng() < 0.25 ? -1 : rng() < 0.2 ? 1 : 0);
      for (let xx = Math.max(x, x0); xx < Math.min(x + bwi, x0 + w); xx++) for (let y = y0; y < y0 + h; y++) s.set(xx, y, r[lv]);
      // grain: long thin darker streaks
      const gn = 2 + ((rng() * 3) | 0);
      for (let g = 0; g < gn; g++) {
        const gx = x + 1 + ((rng() * (bwi - 2)) | 0), gy = y0 + ((rng() * h) | 0), gl = 6 + ((rng() * 18) | 0);
        for (let y = gy; y < Math.min(y0 + h, gy + gl); y++) if (gx >= x0 && gx < x0 + w) s.set(gx, y, r[lv - 1]);
      }
      // a knot now and then
      if (rng() < 0.35) { const kx = x + 2 + ((rng() * (bwi - 4)) | 0), ky = y0 + 4 + ((rng() * (h - 8)) | 0); if (kx >= x0 && kx < x0 + w - 1) { s.set(kx, ky, r[lv - 2]); s.set(kx + 1, ky, r[lv - 1]); s.set(kx, ky + 1, r[lv - 1]); } }
      // seams: a dark gap and a lit edge
      if (x >= x0) { for (let y = y0; y < y0 + h; y++) s.set(x, y, r[Math.max(0, lv - 2)]); if (x + 1 < x0 + w) for (let y = y0; y < y0 + h; y++) if (rng() < 0.85) s.set(x + 1, y, r[Math.min(r.length - 1, lv + 1)]); }
      // nails top and bottom
      if (o.nails && x >= x0) for (const ny of o.nails) { s.set(x + 3, ny, r[1]); s.set(x + 3, ny - 1, r[lv + 1]); }
      x += bwi; i++;
    }
  } else {
    // horizontal boards (floor): rows get taller toward the viewer (depth)
    let y = y0, i = 0;
    const rows = o.rows || null;
    while (y < y0 + h) {
      const bh = rows ? rows[i % rows.length] : bw;
      const lv = base + (i % 3 === 1 ? -1 : 0);
      // board joints staggered
      const joints = [];
      let jx = x0 - ((rng() * 60) | 0);
      while (jx < x0 + w) { joints.push(jx); jx += 40 + ((rng() * 50) | 0); }
      for (let yy = y; yy < Math.min(y + bh, y0 + h); yy++) for (let x = x0; x < x0 + w; x++) s.set(x, yy, r[lv]);
      for (let g = 0; g < w / 14; g++) { const gx = x0 + ((rng() * w) | 0), gy = y + 1 + ((rng() * Math.max(1, bh - 2)) | 0), gl = 5 + ((rng() * 16) | 0); for (let x = gx; x < Math.min(x0 + w, gx + gl); x++) if (gy < y0 + h) s.set(x, gy, r[lv - 1]); }
      for (let x = x0; x < x0 + w; x++) { s.set(x, y, r[Math.max(0, lv - 2)]); if (y + 1 < y0 + h && rng() < 0.9) s.set(x, y + 1, r[Math.min(r.length - 1, lv + 1)]); }
      for (const j of joints) if (j > x0 && j < x0 + w) for (let yy = y; yy < Math.min(y + bh, y0 + h); yy++) s.set(j, yy, r[Math.max(0, lv - 2)]);
      y += bh; i++;
    }
  }
}

/** digits and tiny icons for price tags and UI: 3×5 */
const D35 = {
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'], ':': ['...', '.#.', '...', '.#.', '...'], ' ': ['...', '...', '...', '...', '...'],
};
export function digits(s, str, x, y, c, gap = 1) {
  for (const ch of String(str)) {
    const g = D35[ch] || D35[' '];
    g.forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') s.set(x + i, y + j, c); }));
    x += 3 + gap;
  }
  return x;
}
export const digitsW = (str, gap = 1) => String(str).length * (3 + gap) - gap;

/** a price tag hanging on a string: paper, a hole, the price in 3×5 digits */
export function tag(s, x, y, price, pal) {
  const w = digitsW(price) + 4, h = 9;
  s.rect(x, y, w, h, pal.paper[3]);
  s.hline(x, x + w - 1, y, pal.paper[4]); s.vline(x, y, y + h - 1, pal.paper[4]);
  s.hline(x, x + w - 1, y + h - 1, pal.paper[1]); s.vline(x + w - 1, y + 1, y + h - 1, pal.paper[2]);
  s.set(x, y, -1); s.set(x + w - 1, y + h - 1, pal.paper[1]);
  digits(s, price, x + 2, y + 2, pal.ink);
  return w;
}

/** potion / bottle shapes. kind: 'round' | 'tall' | 'square' | 'vial' | 'jug'. liquid: ramp. glass: ramp */
export function bottle(s, x, y, kind, liq, pal, o = {}) {
  // (x, y) = bottom-left of the bottle; returns its width
  const g = pal.glass, cork = pal.cork, ink = pal.ink2;
  const shapes = {
    round:  ['..##..', '..##..', '.#..#.', '#....#', '#....#', '#....#', '.####.'],
    tall:   ['.##.', '.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '####'],
    square: ['.##.', '####', '#..#', '#..#', '#..#', '####'],
    vial:   ['#', '#', '#', '#', '#'],
    jug:    ['.##..', '.##..', '#..#.', '#...#', '#..#.', '#..#.', '####.'],
    flask:  ['..##..', '..##..', '..##..', '.#..#.', '#....#', '#....#', '######'],
  };
  const rows = shapes[kind], h = rows.length, w = rows[0].length;
  const top = y - h;
  const lvl = o.level ?? 0.6;
  rows.forEach((row, j) => [...row].forEach((q, i) => {
    const X = x + i, Y = top + j;
    if (q === '#') {
      // neck rows are cork, body outline is dark liquid / glass
      if (j < (kind === 'vial' ? 1 : 2)) s.set(X, Y, j === 0 ? cork[4] : cork[2]);
      else s.set(X, Y, (j / h) > 1 - lvl ? liq[1] : g[1]);
    }
  }));
  // fill the inside
  rows.forEach((row, j) => {
    const a = row.indexOf('#'), b = row.lastIndexOf('#');
    for (let i = a + 1; i < b; i++) if (row[i] === '.' && j >= 2) {
      const filled = (j / h) > 1 - lvl;
      s.set(x + i, top + j, filled ? liq[i === a + 1 ? 4 : i === b - 1 ? 2 : 3] : g[3]);
    }
  });
  if (kind === 'vial') for (let j = 1; j < h; j++) s.set(x, top + j, (j / h) > 1 - lvl ? liq[3] : g[3]);
  // glint
  if (w >= 4) s.set(x + 1, top + 3, g[5]);
  if (o.label && w >= 4) { const ly = top + h - 3; for (let i = 1; i < w - 1; i++) s.set(x + i, ly, pal.paper[3]); s.set(x + ((w / 2) | 0), ly, o.labelMark ?? pal.ink); }
  return w;
}

/** a row of books on a shelf: returns x after the last book */
export function books(s, x, y, n, ramps, pal, seed = 1) {
  const rng = rnd(seed);
  for (let i = 0; i < n; i++) {
    const r = ramps[(rng() * ramps.length) | 0], h = 7 + ((rng() * 4) | 0), w = 2 + (rng() < 0.4 ? 1 : 0);
    const lean = i === n - 1 && rng() < 0.5;
    for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) s.set(x + k + (lean ? Math.floor((h - j) / 4) : 0), y - j - 1, r[k === 0 ? 4 : k === w - 1 ? 2 : 3]);
    s.set(x + (lean ? Math.floor(h / 4) : 0), y - h, r[5]);
    // spine band
    const by = y - 2 - ((rng() * (h - 4)) | 0); for (let k = 0; k < w; k++) s.set(x + k + (lean ? Math.floor((y - by) / 4) : 0), by, pal.gold[4]);
    x += w + (lean ? 2 : 0);
  }
  return x;
}

/** a scroll lying down / a rolled map */
export function scroll(s, x, y, w, pal) {
  s.rect(x, y - 3, w, 3, pal.paper[3]); s.hline(x, x + w - 1, y - 3, pal.paper[4]); s.hline(x, x + w - 1, y - 1, pal.paper[1]);
  s.vline(x, y - 3, y - 1, pal.paper[2]); s.vline(x + w - 1, y - 3, y - 1, pal.paper[1]);
  s.set(x + ((w / 2) | 0), y - 2, pal.red[3]); s.set(x + ((w / 2) | 0), y - 3, pal.red[4]);
}

/** make a Surface-sized sprite from text rows with a legend of ramps: 'a0'..'a5' style is too verbose, so the
 * legend maps single characters to palette indices directly. */
export { stamp };
