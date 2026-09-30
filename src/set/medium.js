// The medium shot of the bench (the tea, the gifts): the same corner of the shop as the wide shot, redrawn at twice
// the detail — not scaled up. Wide-shot coordinates (x, y) map to this frame by MED.x(x) = (x − 30)·2,
// MED.y(y) = (y − 56)·2, so the characters, rendered at zoom 2 with the same oblique camera, stand where they stood.
// In frame: the right edge of the door with its round window, the wall boards, the pegs (straw hat, satchel, scarf),
// the pendulum clock, a timber post, the window with the live view (the tower!), its curtain and sill, the wainscot,
// the bench with its cushion and blankets, the floor and the rug; the morning sunbeam with dust floating in it.
import { EMIT, NOLIGHT, bayer } from '../pix/gfx.js';
import { R, RX, P, FLOOR, K } from './kit.js';
import { palettes, LAYOUT } from './shop.js';
import { boards } from './wood.js';
import { drawView } from './view.js';
import { lightPoly } from './light.js';

export const MED = { X0: 30, Y0: 56, s: 2, x: (x) => (x - 30) * 2, y: (y) => (y - 56) * 2 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const MOTE = RX('med.mote', ['#fff0cc', '#fffaf0'], EMIT);

/** a bevelled bar: lit top and left, dark bottom and right */
function bar(S, x, y, w, h, r, lv = 3) {
  S.rect(x, y, w, h, r[lv]);
  S.hline(x, x + w - 1, y, r[Math.min(r.length - 1, lv + 1)]); S.vline(x, y, y + h - 1, r[Math.min(r.length - 1, lv + 1)]);
  S.hline(x, x + w - 1, y + h - 1, r[Math.max(0, lv - 2)]); S.vline(x + w - 1, y + 1, y + h - 1, r[Math.max(0, lv - 1)]);
}

export function drawBenchMedium(S, o = {}) {
  const pal = palettes('A'), hour = o.hour ?? 7.1, t = o.t ?? 0;
  const X = MED.x, Y = MED.y, L = LAYOUT;
  // ---- the wall: vertical boards, the wainscot below, a timber post
  boards(S, 0, 0, 320, Y(100), pal.wall, { dir: 'v', size: 20, vary: 3, seed: 11, knots: 5, lv: 3, nails: Array.from({ length: 16 }, (_, i) => [i * 20 + 3, Y(97) - 4]) });
  const wy = Y(100);
  S.rect(0, wy, 320, Y(FLOOR) - wy, pal.wain[3]);
  S.hline(0, 319, wy, pal.trim[5]); S.hline(0, 319, wy + 1, pal.trim[4]); S.hline(0, 319, wy + 2, pal.trim[3]); S.hline(0, 319, wy + 3, pal.wain[1]);
  for (let px = X(4) - 52 * 3; px < 320; px += 52) {
    const w = 44, y1 = wy + 9, h = Y(FLOOR) - y1 - 7;
    S.rect(px, y1, w, h, pal.wain[3]);
    S.hline(px, px + w - 1, y1, pal.wain[1]); S.vline(px, y1, y1 + h - 1, pal.wain[1]); S.hline(px, px + w - 1, y1 + 1, pal.wain[2]); S.vline(px + 1, y1, y1 + h - 1, pal.wain[2]);
    S.hline(px + 1, px + w - 1, y1 + h - 1, pal.wain[5]); S.vline(px + w - 1, y1 + 1, y1 + h - 1, pal.wain[4]);
    S.rect(px + 4, y1 + 4, w - 8, h - 8, pal.wain[4]); S.rect(px + 6, y1 + 6, w - 12, h - 12, pal.wain[3]);
    for (let k = 0; k < 5; k++) { const gx = px + 8 + Math.floor(hash(px + k, 3) * (w - 16)); for (let j = 0; j < h - 14; j++) if (hash(gx * 7 + j, 4) < 0.7) S.set(gx, y1 + 7 + j, pal.wain[2]); }
  }
  S.hline(0, 319, Y(FLOOR) - 4, pal.wain[5]); S.hline(0, 319, Y(FLOOR) - 5, pal.wain[2]); S.hline(0, 319, Y(FLOOR) - 1, pal.wain[1]);
  bar(S, X(108), 0, 12, Y(FLOOR), pal.beam, 3);
  for (let y = 4; y < Y(FLOOR); y += 9) if (hash(y, 7) < 0.6) S.vline(X(108) + 3 + Math.floor(hash(y, 8) * 6), y, y + 5, pal.beam[2]);

  // ---- the door (closed): planks, a brace, the round window, the handle; its frame
  const D = L.door, dx0 = X(D.x), dx1 = X(D.x + D.w);
  boards(S, dx0, Y(D.y), dx1 - dx0, Y(D.y + D.h) - Y(D.y), pal.wall, { dir: 'v', size: 18, vary: 2, seed: 13, knots: 2, lv: 3 });
  for (const hy of [D.y + 10, D.y + D.h - 14]) { S.rect(dx0, Y(hy), dx1 - dx0, 4, pal.wall[2]); S.hline(dx0, dx1 - 1, Y(hy), pal.wall[4]); S.hline(dx0, dx1 - 1, Y(hy) + 3, pal.wall[0]); }
  for (let k = 0; k < 60; k++) { const u = k / 60, x = dx0 + 2 + u * (dx1 - dx0 - 4), y = Y(D.y + D.h - 14) - u * (Y(D.y + D.h - 14) - Y(D.y + 11)); S.rect(Math.round(x), Math.round(y), 2, 3, pal.wall[2]); S.set(Math.round(x), Math.round(y), pal.wall[4]); }
  const wcx = X(D.x + D.w / 2), wcy = Y(D.y + 24);
  S.ellipse(wcx, wcy, 12, 12, pal.beam[1]); S.ellipse(wcx, wcy, 11, 11, pal.beam[3]); S.ellipse(wcx, wcy, 9, 9, pal.glass[3]);
  S.ellipse(wcx - 2, wcy - 2, 5, 5, pal.glass[4]); S.set(wcx - 4, wcy - 5, pal.glass[5]); S.set(wcx - 5, wcy - 4, pal.glass[5]);
  S.rect(wcx - 9, wcy - 1, 18, 2, pal.beam[2]); S.rect(wcx - 1, wcy - 9, 2, 18, pal.beam[2]);
  const hx = X(D.x + D.w - 7), hy2 = Y(D.y + 40);
  S.rect(hx, hy2, 6, 6, pal.brass[3]); S.hline(hx, hx + 5, hy2, pal.brass[5]); S.vline(hx + 5, hy2 + 1, hy2 + 5, pal.brass[1]); S.rect(hx + 1, hy2 + 6, 4, 3, pal.brass[2]); S.set(hx + 1, hy2 + 1, pal.brass[5]);
  bar(S, dx1, Y(D.y) - 8, 8, Y(D.y + D.h) - Y(D.y) + 8, pal.beam, 3);
  for (let y = Y(D.y); y < Y(D.y + D.h); y += 11) S.set(dx1 + 4, y, pal.beam[1]);

  // ---- the pegs: a straw hat, a leather satchel, a knitted scarf
  for (const px of [62, 72, 82]) { const x = X(px), y = Y(64); S.rect(x, y, 3, 3, pal.trim[4]); S.set(x + 2, y + 2, pal.trim[1]); S.hline(x, x + 2, y + 3, pal.beam[1]); }
  { // hat: a round brim seen a little from below, a crown with a red band, straw weave
    const cx = X(62) + 1, cy = Y(66) + 2;
    S.ellipse(cx, cy + 3, 10, 3, pal.sack[2]); S.ellipse(cx, cy + 2, 10, 2.6, pal.sack[4]);
    S.rect(cx - 5, cy - 5, 11, 7, pal.sack[3]); S.ellipse(cx + 0.5, cy - 5, 5.5, 2, pal.sack[5]);
    S.rect(cx - 5, cy - 1, 11, 2, pal.cloth[3]); S.hline(cx - 5, cx + 5, cy - 1, pal.cloth[4]);
    for (let x = cx - 9; x <= cx + 9; x += 2) S.set(x, cy + 3, pal.sack[1]);
    for (let y = cy - 4; y < cy - 1; y++) for (let x = cx - 4; x <= cx + 4; x += 3) S.set(x + (y % 2), y, pal.sack[2]);
  }
  { // satchel: hanging by its strap, flap with a brass buckle, stitched edges
    const x = X(69), y = Y(67);
    S.line(X(72) + 1, Y(64) + 3, x + 2, y + 1, pal.leather[2]); S.line(X(72) + 1, Y(64) + 3, x + 12, y + 1, pal.leather[2]);
    bar(S, x, y, 15, 12, pal.leather, 3);
    S.rect(x + 1, y + 1, 13, 5, pal.leather[4]); S.hline(x + 1, x + 13, y + 6, pal.leather[1]);
    for (let k = x + 2; k < x + 13; k += 2) S.set(k, y + 10, pal.leather[5]);
    S.rect(x + 6, y + 5, 3, 3, pal.brass[3]); S.set(x + 6, y + 5, pal.brass[5]);
  }
  { // scarf: teal, knitted rows, folded over the peg, fringed ends
    const x = X(81), y = Y(66);
    for (let j = 0; j < 28; j++) for (let i = 0; i < 5; i++) {
      const q = j > 15 ? 2 : 0, c = (j + (i % 2)) % 3 === 0 ? pal.teal[2] : i === 0 ? pal.teal[4] : i === 4 ? pal.teal[2] : pal.teal[3];
      S.set(x + i + q, y + j, (j % 8 === 6) ? pal.cream[3] : c);
    }
    for (let i = 0; i < 5; i++) { S.set(x + 2 + i, y + 28, pal.cream[4]); S.set(x + 2 + i, y + 29 + (i % 2), pal.cream[3]); }
  }

  // ---- the clock: case, the lower half of the face, the pendulum swinging behind its glass
  { const cx = X(L.clock.x), cy = Y(L.clock.y);
    bar(S, cx - 16, 0, 34, cy + 54, pal.beam, 3);
    for (let y = 0; y < cy + 54; y += 7) if (hash(y, 21) < 0.5) S.vline(cx - 12 + Math.floor(hash(y, 22) * 24), y, y + 4, pal.beam[2]);
    S.ellipse(cx + 0.5, cy + 0.5, 14, 14, pal.brass[2]); S.ellipse(cx + 0.5, cy + 0.5, 12.5, 12.5, pal.brass[4]); S.ellipse(cx + 0.5, cy + 0.5, 11, 11, pal.cream[4]);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; for (let r = 8; r < 10.5; r += 0.5) S.set(Math.round(cx + Math.sin(a) * r), Math.round(cy - Math.cos(a) * r), k % 3 === 0 ? pal.ink : pal.cream[2]); }
    const hr = hour % 12, hh = hr / 12 * Math.PI * 2, mm = (hour % 1) * Math.PI * 2;
    for (let r = 0; r < 6; r++) { S.set(Math.round(cx + Math.sin(hh) * r), Math.round(cy - Math.cos(hh) * r), pal.ink); S.set(Math.round(cx + Math.sin(hh) * r + 1), Math.round(cy - Math.cos(hh) * r), pal.ink); }
    for (let r = 0; r < 9; r++) S.set(Math.round(cx + Math.sin(mm) * r), Math.round(cy - Math.cos(mm) * r), pal.iron[1]);
    S.ellipse(cx + 0.5, cy + 0.5, 1.5, 1.5, pal.brass[5]);
    const py = cy + 18;
    S.rect(cx - 10, py, 21, 32, pal.beam[1]); S.rect(cx - 8, py + 2, 17, 28, pal.glass[1]);
    const sw = Math.sin(t * Math.PI) * 6;
    S.line(cx, py + 2, Math.round(cx + sw * 0.8), py + 20, pal.brass[2]); S.line(cx + 1, py + 2, Math.round(cx + 1 + sw * 0.8), py + 20, pal.brass[3]);
    S.ellipse(cx + sw + 0.5, py + 23, 4, 4, pal.brass[2]); S.ellipse(cx + sw - 0.5, py + 22, 2.5, 2.5, pal.brass[4]); S.set(Math.round(cx + sw - 1), py + 21, pal.brass[5]);
    for (let k = 0; k < 6; k++) S.set(cx - 7 + k, py + 3 + k, pal.glass[3]);
  }

  // ---- the window: the view (drawn for this size, not scaled), frame, mullion, transom, glints, curtain, sill
  const W = L.window, vx = X(W.x), vy = Y(W.y), vw = W.w * 2, vh = W.h * 2;
  drawView(S, vx, vy, vw, vh, { hour, t, lod: 'small', eye: o.towerFlash ? 1 : 0, defeated: o.defeated });
  bar(S, vx - 8, vy - 8, vw + 16, 8, pal.beam, 3);
  bar(S, vx - 8, vy, 8, vh, pal.beam, 3); bar(S, vx + vw, vy, 8, vh, pal.beam, 3);
  bar(S, vx + vw / 2 - 3, vy, 6, vh, pal.beam, 3); bar(S, vx, Y(W.y + 28), vw, 6, pal.beam, 3);
  for (const [gx, gy] of [[vx + 6, Y(W.y + 33)], [vx + vw / 2 + 6, Y(W.y + 33)]]) for (let k = 0; k < 10; k++) { if (bayer(gx + k, gy) < 0.6) S.set(gx + k, gy + 10 - k, pal.glass[5], NOLIGHT); if (k > 2 && k < 7) S.set(gx + k + 4, gy + 10 - k, pal.glass[4], NOLIGHT); }
  // curtain, tied back, soft folds
  const cx0 = X(W.x - 12), tie = Y(W.y + 34);
  for (let y = Math.max(0, vy - 12); y < vy + vh - 8; y++) {
    const pinch = Math.max(0, 1 - Math.abs(y - tie) / 28), w = Math.round(16 - pinch * 8 + (y > tie ? (y - tie) * 0.12 : 0));
    for (let i = 0; i < w; i++) { const f = (i + Math.round(Math.sin(y * 0.08) * 1.5)) % 6; S.set(cx0 + 16 - w + i, y, pal.curtain[i === 0 ? 1 : f < 2 ? 4 : f < 4 ? 3 : 2]); }
  }
  S.rect(cx0 + 1, tie, 15, 4, pal.gold[3]); S.hline(cx0 + 1, cx0 + 15, tie, pal.gold[5]); S.hline(cx0 + 1, cx0 + 15, tie + 3, pal.gold[1]);
  // sill, a potted geranium, a watering can
  const sy = Y(W.y + W.h);
  S.rect(vx - 14, sy, vw + 28, 6, pal.trim[4]); S.hline(vx - 14, vx + vw + 13, sy, pal.trim[5]); S.rect(vx - 12, sy + 6, vw + 24, 5, pal.trim[2]); S.hline(vx - 12, vx + vw + 11, sy + 10, pal.trim[0]);
  { const px = X(W.x + 6), py = sy;
    S.poly([[px, py - 12], [px + 14, py - 12], [px + 12, py], [px + 2, py]], pal.pot[3]); S.rect(px - 1, py - 14, 16, 3, pal.pot[4]); S.hline(px - 1, px + 14, py - 14, pal.pot[5]);
    for (let y = py - 11; y < py; y++) S.set(px + 11 - Math.floor((y - py + 11) * 0.15), y, pal.pot[1]);
    for (const [lx, ly, d] of [[6, -22, -1], [2, -19, -1], [11, -20, 1], [5, -27, 1], [9, -26, -1], [0, -15, -1], [14, -15, 1]]) for (let k = 0; k < 5; k++) { const x = px + lx + d * k * 0.7, y = py + ly + Math.abs(k - 2) * 0.8; S.set(Math.round(x), Math.round(y), pal.leaf[k < 2 ? 4 : 3]); S.set(Math.round(x), Math.round(y) + 1, pal.leaf[2]); }
    for (const [fx, fy] of [[6, -30], [10, -29], [8, -32]]) { S.set(px + fx, py + fy, pal.red[4]); S.set(px + fx + 1, py + fy, pal.red[3]); S.set(px + fx, py + fy + 1, pal.red[2]); }
  }
  { const x = X(W.x + W.w - 16), y = sy;
    S.rect(x, y - 10, 14, 10, pal.teal[3]); S.hline(x, x + 13, y - 10, pal.teal[4]); S.vline(x + 13, y - 9, y - 1, pal.teal[1]); S.vline(x, y - 9, y - 1, pal.teal[4]);
    S.line(x + 14, y - 8, x + 20, y - 14, pal.teal[2]); S.line(x + 14, y - 7, x + 20, y - 13, pal.teal[3]); S.rect(x + 19, y - 16, 3, 2, pal.teal[4]);
    S.line(x - 1, y - 8, x - 3, y - 12, pal.teal[2]); S.hline(x + 2, x + 10, y - 14, pal.teal[2]); S.set(x + 1, y - 13, pal.teal[2]); S.set(x + 11, y - 13, pal.teal[2]);
  }

  // ---- the floor: boards running across, getting wider toward us; the rug; the doormat
  const fy0 = Y(FLOOR);
  const rows = [8, 9, 10, 11, 12, 13, 14];
  boards(S, 0, fy0, 320, 180 - fy0, pal.floor, { dir: 'h', size: 10, vary: 2, seed: 41, knots: 3, lv: 3 });
  for (let x = 0; x < 320; x++) { S.set(x, fy0, pal.floor[1]); if (bayer(x, fy0 + 1) < 0.5) S.set(x, fy0 + 1, pal.floor[2]); }
  { const [x0, y0] = P(58, 0, 20), [x1, y1] = P(192, 0, 60), rx = X(x0), ry = Y(y0), w = (x1 - x0) * 2, h = Math.round((y1 - y0) * 2);
    for (let y = 0; y < Math.min(h, 180 - ry); y++) for (let x = 0; x < w && rx + x < 320; x++) {
      const bx = Math.min(x, w - 1 - x), by = Math.min(y, h - 1 - y);
      let c;
      if (bx < 2 || by < 2) c = pal.rug[1];
      else if (bx < 6 || by < 4) c = pal.rug3[(x + y) % 4 === 0 ? 2 : (x + y) % 4 === 2 ? 4 : 3];
      else if (bx < 10 || by < 6) c = pal.rug[(x * 3 + y) % 5 === 0 ? 2 : 3];
      else { const u = (x - 10) % 32 - 16, v = (y - 6) % 16 - 8, d = Math.abs(u) / 2 + Math.abs(v);
        c = d < 3 ? pal.rug3[4] : d < 6 ? pal.rug2[3] : d < 7.6 ? pal.rug2[2] : pal.rug[(x + 2 * y) % 9 === 0 ? 2 : (x * y) % 13 === 0 ? 4 : 3]; }
      S.set(rx + x, ry + y, c);
    }
    for (let y = 0; y < h; y += 2) { S.set(rx - 1, ry + y, pal.rug3[3]); S.set(rx - 2, ry + y + 1, pal.rug3[2]); }
  }
  { const [mx, my] = P(D.x - 2, 0, 6), x = X(mx), y = Y(my);
    S.rect(x, y, (D.w + 4) * 2, 8, pal.sack[2]); S.hline(x, x + (D.w + 4) * 2 - 1, y, pal.sack[4]);
    for (let i = 0; i < (D.w + 4) * 2; i += 2) { S.set(x + i, y + 3, pal.sack[1]); S.set(x + i + 1, y + 5, pal.sack[3]); }
  }

  // ---- the bench: legs, the seat seen a little from above, its front edge; the cushion and folded blankets
  const B = L.bench, bx0 = X(B.x), bw = (B.x1 - B.x) * 2;
  const top = Y(P(0, B.seatY, B.z0)[1]), seat = Y(P(0, B.seatY, B.z1)[1]), yb = Y(P(0, 0, B.z1)[1]), ybk = Y(P(0, 0, B.z0)[1]);
  for (const lx of [bx0 + 6, bx0 + bw - 12]) bar(S, lx, top, 6, ybk - top, pal.beam, 2);
  S.curZ = (x, y) => ((y / 2 + MED.Y0) + 0.5 - FLOOR + B.seatY) / K;
  for (let y = top; y < seat; y++) for (let x = bx0; x < bx0 + bw; x++) {
    const board = Math.floor((y - top) / 4), gap = (y - top) % 4 === 3;
    let lv = gap ? 1 : 3 + (board % 2 ? 0 : 1);
    if (!gap && hash(Math.floor(x / 9) + board * 31, 5) < 0.2 && (x + y) % 2) lv -= 1;
    S.set(x, y, pal.trim[lv]);
  }
  S.hline(bx0, bx0 + bw - 1, top, pal.trim[5]);
  S.curZ = B.z1;
  bar(S, bx0, seat, bw, 6, pal.beam, 3);
  for (let x = bx0 + 3; x < bx0 + bw - 3; x += 17) S.set(x, seat + 2, pal.beam[1]);
  for (const lx of [bx0 + 4, bx0 + bw - 10]) { S.rect(lx, seat + 6, 6, yb - seat - 6, pal.beam[3]); S.vline(lx, seat + 6, yb - 1, pal.beam[4]); S.vline(lx + 5, seat + 6, yb - 1, pal.beam[1]); }
  S.rect(bx0 + 8, yb - 10, bw - 16, 3, pal.beam[2]); S.hline(bx0 + 8, bx0 + bw - 9, yb - 10, pal.beam[3]);
  S.curZ = null;
  for (let x = bx0 + 2; x < bx0 + bw - 2; x++) for (let y = seat + 6; y < yb; y++) { const c = S.get(x, y); if (c >= 0 && !pal.beam.includes(c)) S.set(x, y, pal.floor[Math.max(0, (pal.floor.indexOf(c) >= 0 ? pal.floor.indexOf(c) : 3) - 2)]); }
  { // the knitted cushion (red and cream, a cable pattern) and the folded blankets
    const cx = bx0 + 12, cy = top - 7;
    for (let x = 0; x < 32; x++) for (let y = 0; y < 10; y++) { const edge = y === 0 || x === 0 || x === 31; S.set(cx + x, cy + y, edge ? pal.cloth[y === 0 ? 4 : 1] : ((x >> 1) + y) % 4 < 2 ? pal.cloth[3] : (x % 8 === 3 ? pal.cream[4] : pal.cream[3])); }
    const bx = bx0 + bw - 32;
    for (let j = 0; j < 4; j++) bar(S, bx, top - 4 - j * 4, 24, 4, j % 2 ? pal.teal : pal.cream, 3);
    for (let j = 0; j < 4; j++) S.hline(bx + 2, bx + 21, top - 3 - j * 4, (j % 2 ? pal.teal : pal.cream)[2]);
  }
}

/** the morning light in the medium shot: the beam through the window down to the floor, and dust floating in it */
export function benchLight(S, o = {}) {
  const hour = o.hour ?? 7.1, t = o.t ?? 0, L = LAYOUT, W = L.window;
  if (!(hour > 6.2 && hour < 18.6)) return;
  const u = (hour - 6.2) / (18.6 - 6.2), dxs = 0.9 - u * 1.8, dz = 1.25, dy = 0.55 + Math.sin(u * Math.PI) * 0.9;
  const Y0 = FLOOR - (W.y + W.h), Y1 = FLOOR - W.y;
  const foot = (Xw, Yh) => { const s = Yh / dy; return P(Xw + dxs * s, 0, dz * s); };
  const a = foot(W.x + 3, Y0), b = foot(W.x + W.w - 3, Y0), c = foot(W.x + W.w - 3, Y1 - 4), d = foot(W.x + 3, Y1 - 4);
  const m = ([x, y]) => [MED.x(x), MED.y(y)];
  lightPoly(S, [a, b, c, d].map(m), 2, { soft: 3, cls: 2, only: (x, y) => y >= MED.y(FLOOR) - 1 });
  const top0 = [MED.x(W.x + 4), MED.y(W.y + W.h)], top1 = [MED.x(W.x + W.w - 4), MED.y(W.y + W.h)];
  lightPoly(S, [top0, top1, m(b), m(a)], 1, { soft: 5, cls: 2 });
  // dust: motes drifting slowly through the beam, bright only while inside it
  const A = m(a), B = m(b);
  for (let i = 0; i < 46; i++) {
    const s = hash(i, 61), w = hash(i, 62), ph = hash(i, 63) * 6.28;
    const k = ((s + t * 0.012 * (0.5 + hash(i, 64))) % 1 + 1) % 1;             // down the beam, slowly
    const x0 = top0[0] + (top1[0] - top0[0]) * w, y0 = top0[1];
    const x1 = A[0] + (B[0] - A[0]) * w, y1 = A[1];
    const x = x0 + (x1 - x0) * k + Math.sin(t * 0.7 + ph) * 3, y = y0 + (y1 - y0) * k + Math.sin(t * 0.5 + ph * 2) * 2;
    if (y > MED.y(FLOOR) - 2) continue;
    S.set(Math.round(x), Math.round(y), MOTE[Math.sin(t * 2.3 + ph) > 0.6 ? 1 : 0]);
  }
}
