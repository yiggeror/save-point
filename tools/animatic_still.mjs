// render animatic stills at given times: node tools/animatic_still.mjs t1,t2,… [scale] → build/still.png (stacked in a grid of 3)
import { setup, frameRGB, AW, AH } from '../src/film/film.js';
import { writePNG, upscale } from '../src/pix/png.js';
await setup();
const ts = process.argv[2].split(',').map(Number), k = +(process.argv[3] || 2);
const cols = 3, rows = Math.ceil(ts.length / cols), W = AW * cols, H = AH * rows;
const out = new Uint8Array(W * H * 3);
ts.forEach((t, i) => {
  const t0 = Date.now(); const rgb = frameRGB(t); const ms = Date.now() - t0;
  const ox = (i % cols) * AW, oy = Math.floor(i / cols) * AH;
  for (let y = 0; y < AH; y++) out.set(rgb.subarray(y * AW * 3, (y + 1) * AW * 3), ((oy + y) * W + ox) * 3);
  console.log(t, ms + 'ms');
});
writePNG('build/still.png', W * k, H * k, upscale(W, H, out, k));
