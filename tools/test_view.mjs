// node tools/test_view.mjs [lod] [scale] → build/test_view.png : the window view at several hours / deaths (grid of 3)
import { Surface } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { drawView } from '../src/set/view.js';
import { grader } from '../src/set/light.js';
const lod = process.argv[2] || 'insert', k = +(process.argv[3] || 2);
const cases = (process.argv[4] ? JSON.parse(process.argv[4]) : [
  { hour: 7.2, t: 3 }, { hour: 12, t: 10, hero: { u: 0.6, death: 'flash', dt: -1, t: 10 } }, { hour: 18.6, t: 20 },
  { hour: 23.4, t: 5 }, { hour: 7.1, t: 4, hero: { u: 1, death: 'fire', dt: 0.3, t: 4 } }, { hour: 7.1, t: 4, hero: { u: 1, death: 'slime', dt: 0.6, t: 4 } },
]);
const w = lod === 'insert' ? 320 : 70, h = lod === 'insert' ? 180 : 62;
const cols = Math.min(3, cases.length), rows = Math.ceil(cases.length / cols), W = w * cols, H = h * rows;
const out = new Uint8Array(W * H * 3);
cases.forEach((c, i) => {
  const S = new Surface(w, h); S.clear(0);
  const t0 = Date.now();
  drawView(S, 0, 0, w, h, { lod, ...c });
  const rgb = S.toRGB({ grade: grader(c.hour, S) });
  console.log(i, Date.now() - t0, 'ms');
  const ox = (i % cols) * w, oy = Math.floor(i / cols) * h;
  for (let y = 0; y < h; y++) out.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), ((oy + y) * W + ox) * 3);
});
writePNG('build/test_view.png', W * k, H * k, upscale(W, H, out, k));
