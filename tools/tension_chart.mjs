// The tension curve as a pixel chart → docs/tension-curve.png
import { Surface, ramp, text, textWidth, loadFont, bayer } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { SECTIONS, TENSION, DURATION, tensionAt } from '../src/film/beats.js';

await loadFont();
const W = 640, H = 250, K = 3;
const C = ramp('chart', ['#121019', '#1d1a27', '#2a2638', '#3d3852', '#6e6790', '#b9b2d6', '#f4efe2', '#f2c14e', '#e0785a', '#7fc0e0', '#8fd0a0']);
const S = new Surface(W, H); S.clear(C[0]);
const x0 = 30, x1 = W - 8, y0 = 34, y1 = 196;
const X = (t) => Math.round(x0 + (x1 - x0) * t / DURATION), Y = (v) => Math.round(y1 - (y1 - y0) * v / 10);
text(S, '紧张度曲线', 8, 4, C[7]); text(S, '两个高峰：锯齿上升的蒙太奇 · 没有释放的等待。高峰之后都是断崖。', 8 + textWidth('紧张度曲线') + 10, 4, C[5]);
// section bands
SECTIONS.forEach((s, i) => {
  const a = X(s.t0), b = X(s.t1);
  S.rect(a, y0, b - a, y1 - y0, i % 2 ? C[1] : C[0]);
  text(S, s.name, Math.round((a + b) / 2), y1 + 16, C[5], { align: 'center' });
  if (s.mood) text(S, s.mood, Math.round((a + b) / 2), y1 + 30, C[4], { align: 'center' });
  S.vline(a, y0, y1, C[2]);
});
// grid
for (let v = 0; v <= 10; v += 2) { for (let x = x0; x < x1; x += 2) S.set(x, Y(v), C[2]); text(S, String(v), x0 - 4, Y(v) - 6, C[4], { align: 'right' }); }
// the curve: filled area (dithered), then the line
let prevY = null;
for (let x = x0; x < x1; x++) {
  const t = (x - x0) / (x1 - x0) * DURATION, v = tensionAt(t), y = Y(v);
  for (let yy = y + 1; yy < y1; yy++) if (bayer(x, yy) < 0.25 + 0.5 * (v / 10)) S.set(x, yy, v > 7 ? C[8] : v > 4 ? C[3] : C[2]);
  if (prevY != null) S.vline(x, Math.min(prevY, y), Math.max(prevY, y), v > 7 ? C[8] : C[7]);
  S.set(x, y, v > 7 ? C[8] : C[7]);
  prevY = y;
}
// a few notes
const notes = [[31, '塔上一闪'], [55, '第一道记号'], [108, '23'], [117, '安静'], [135, '太烫！'], [150, '钟走过'], [176, '最后一闪'], [178, '门铃'], [207, '存档完成']];
notes.forEach(([t, s], i) => {
  const x = X(t), y = Y(tensionAt(t));
  S.set(x, y - 1, C[6]); S.set(x, y - 2, C[6]);
  const ty = Math.max(y0 - 12, y - 16 - (i % 2) * 12);
  text(S, s, x, ty, C[6], { align: 'center' });
});
// time axis
for (let t = 0; t <= DURATION; t += 30) { const x = X(t); S.vline(x, y1, y1 + 2, C[4]); text(S, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, Math.min(x, W - 16), y1 + 2, C[3], { align: 'center' }); }
writePNG('docs/tension-curve.png', W * K, H * K, upscale(W, H, S.toRGB(), K));
console.log('→ docs/tension-curve.png');
