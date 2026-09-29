// The pixel canvas.
//
// Everything in the film is drawn into an *indexed* surface: each pixel holds a palette index, and every palette
// index belongs to a colour ramp (a short run of hand-picked shades, darkest first). Lighting never blends colours:
// it moves a pixel up or down its own ramp by whole steps, and the time of day re-grades the palette. So light and
// shadow always stay pixel-art colour clusters and ordered dithering, never translucent gradients.
import { hex } from './color.js';

// ------------------------------------------------------------------ palette
export const PAL = {
  rgb: [],          // index → [r,g,b]
  start: [],        // index → first index of its ramp
  len: [],          // index → ramp length
  lvl: [],          // index → level inside its ramp
  names: {},        // ramp name → array of indices
  flags: [],        // index → default flags (EMIT…)
};
export const EMIT = 1;      // emissive: not graded, not lit (sky, flames, UI)
export const NOLIGHT = 2;   // graded by time of day but ignores local light (e.g. far background)

/** register a ramp; colours are hex strings or rgb arrays, darkest first. Returns the array of indices. */
export function ramp(name, colors, flags = 0) {
  if (PAL.names[name]) return PAL.names[name];
  const s = PAL.rgb.length, n = colors.length, out = [];
  colors.forEach((c, i) => {
    PAL.rgb.push(typeof c === 'string' ? hex(c) : c.map((v) => Math.round(v)));
    PAL.start.push(s); PAL.len.push(n); PAL.lvl.push(i); PAL.flags.push(flags);
    out.push(s + i);
  });
  out.name = name;
  PAL.names[name] = out;
  return out;
}
/** move an index d steps along its ramp (clamped) */
export const shift = (c, d) => (c < 0 ? c : PAL.start[c] + Math.max(0, Math.min(PAL.len[c] - 1, PAL.lvl[c] + d)));

// ------------------------------------------------------------------ ordered dithering
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** threshold for (x,y): compare a 0..1 value against it to dither */
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];
/** quantise a continuous value v to an integer with ordered dithering (spread = width of the dither band, 0..1) */
export const dq = (v, x, y, spread = 1) => Math.floor(v + (bayer(x, y) - 0.5) * spread + 0.5);

// ------------------------------------------------------------------ surface
export class Surface {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = new Int16Array(w * h).fill(-1);    // palette index, -1 = empty
    this.fl = new Uint8Array(w * h);             // per-pixel flags
    this.lt = new Int8Array(w * h);              // local light (ramp steps)
    this.id = new Uint8Array(w * h);             // object id (for hit tests, outlines, masks)
    this.ox = 0; this.oy = 0;                    // drawing origin
    this.clip = null;                            // [x0,y0,x1,y1] or null
  }
  clear(c = -1) { this.px.fill(c); this.fl.fill(0); this.lt.fill(0); this.id.fill(0); }
  inb(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const c = this.clip; return !c || (x >= c[0] && y >= c[1] && x < c[2] && y < c[3]);
  }
  get(x, y) { x = Math.floor(x + this.ox); y = Math.floor(y + this.oy); return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.px[y * this.w + x]; }
  /** c: palette index | function(x,y)→index | -1 (skip) */
  set(x, y, c, f) {
    x = Math.floor(x + this.ox); y = Math.floor(y + this.oy);
    if (!this.inb(x, y)) return;
    if (typeof c === 'function') c = c(x - this.ox, y - this.oy);
    if (c == null || c < 0) return;
    const i = y * this.w + x;
    this.px[i] = c; this.fl[i] = f ?? PAL.flags[c]; if (this.curId) this.id[i] = this.curId;
  }
  rect(x, y, w, h, c, f) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, f); }
  hline(x0, x1, y, c, f) { if (x1 < x0) [x0, x1] = [x1, x0]; for (let x = x0; x <= x1; x++) this.set(x, y, c, f); }
  vline(x, y0, y1, c, f) { if (y1 < y0) [y0, y1] = [y1, y0]; for (let y = y0; y <= y1; y++) this.set(x, y, c, f); }
  /** Bresenham line, pixel-perfect (no doubled corners) */
  line(x0, y0, x1, y1, c, f) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, f);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** filled ellipse centred on (cx,cy) (pixel centres inside the ellipse) */
  ellipse(cx, cy, rx, ry, c, f) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) this.set(x, y, c, f);
      }
  }
  /** 1-px ellipse outline (the ring of pixels inside the ellipse that touch the outside) */
  ring(cx, cy, rx, ry, c, f) {
    const ins = (x, y) => { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; return u * u + v * v <= 1; };
    for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++)
        if (ins(x, y) && (!ins(x + 1, y) || !ins(x - 1, y) || !ins(x, y + 1) || !ins(x, y - 1))) this.set(x, y, c, f);
  }
  /** scanline polygon fill (pixel centres) */
  poly(pts, c, f) {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) * (bx - ax) / (by - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, c, f);
    }
  }
  /** draw another surface onto this one (transparent pixels skipped) */
  draw(src, x, y, o = {}) {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const si = o.flip ? (src.w - 1 - i) : i;
      const k = j * src.w + si, c = src.px[k];
      if (c < 0) continue;
      const X = Math.floor(x + i + this.ox), Y = Math.floor(y + j + this.oy);
      if (!this.inb(X, Y)) continue;
      const d = Y * this.w + X;
      this.px[d] = o.map ? o.map(c) : c; this.fl[d] = src.fl[k]; this.lt[d] = src.lt[k]; if (o.id ?? src.id[k]) this.id[d] = o.id ?? src.id[k];
    }
  }
  /** add local light (whole ramp steps) over a region: fn(x,y) → steps (float, dithered) */
  light(x0, y0, x1, y1, fn) {
    for (let y = Math.max(0, y0); y < Math.min(this.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(this.w, x1); x++) {
      const i = y * this.w + x;
      if (this.px[i] < 0) continue;
      const v = fn(x, y); if (!v) continue;
      this.lt[i] = Math.max(-8, Math.min(8, this.lt[i] + v));
    }
  }
  /** resolve to RGB. grade(rgb, pixelIndex, flags) may re-colour per time of day. bg: rgb for empty pixels */
  toRGB(o = {}) {
    const out = new Uint8Array(this.w * this.h * 3), bg = o.bg || [0, 0, 0];
    const cache = new Map();
    for (let i = 0; i < this.w * this.h; i++) {
      let c = this.px[i], rgb;
      if (c < 0) rgb = bg;
      else {
        const fl = this.fl[i];
        if (!(fl & (EMIT | NOLIGHT)) && this.lt[i]) c = shift(c, this.lt[i]);
        if (o.grade && !(fl & EMIT)) {
          const key = c * 16 + (o.gradeKey ? o.gradeKey(i) : 0);
          rgb = cache.get(key);
          if (!rgb) { rgb = o.grade(PAL.rgb[c], i, c); cache.set(key, rgb); }
        } else rgb = PAL.rgb[c];
      }
      out[i * 3] = rgb[0]; out[i * 3 + 1] = rgb[1]; out[i * 3 + 2] = rgb[2];
    }
    return out;
  }
}

// ------------------------------------------------------------------ hand-drawn stamps
/**
 * A small hand-drawn pixel image from text rows. legend maps characters to palette indices; '.' and ' ' are empty.
 * Returns a Surface.
 */
export function stamp(rows, legend) {
  if (typeof rows === 'string') rows = rows.replace(/^\n+|\n+\s*$/g, '').split('\n').map((r) => r.replace(/^\s+\|/, ''));
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const s = new Surface(w, h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    const c = legend[ch];
    if (c == null) throw new Error(`stamp: no colour for '${ch}'`);
    s.set(x, y, c);
  }));
  return s;
}

// ------------------------------------------------------------------ text (Fusion Pixel 12px, SIL OFL 1.1)
let FONT = null;
export async function loadFont() {
  if (FONT) return FONT;
  if (typeof process !== 'undefined' && process.versions?.node) {
    const fs = await import('fs');
    const url = new URL('../../assets/font/fusion12.json', import.meta.url);
    FONT = JSON.parse(fs.readFileSync(url, 'utf8'));
  } else {
    FONT = await (await fetch(new URL('../../assets/font/fusion12.json', import.meta.url))).json();
  }
  return FONT;
}
export function textWidth(str, o = {}) {
  let w = 0;
  for (const ch of str) { const g = FONT.glyphs[ch] || FONT.glyphs['?']; w += g.w + (o.track || 0); }
  return w;
}
/** draw text with its top-left at (x,y); returns the width */
export function text(s, str, x, y, c, o = {}) {
  let cx = x;
  if (o.align === 'center') cx -= Math.round(textWidth(str, o) / 2);
  if (o.align === 'right') cx -= textWidth(str, o);
  const x0 = cx;
  for (const ch of str) {
    const g = FONT.glyphs[ch] || FONT.glyphs['?'];
    g.r.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') {
      if (o.shadow != null) s.set(cx + i + 1, y + j + 1, o.shadow, o.f);
      s.set(cx + i, y + j, c, o.f);
    } });
    cx += g.w + (o.track || 0);
  }
  return cx - x0;
}
