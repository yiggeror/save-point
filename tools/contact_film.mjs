// Contact sheet straight from the renderer: node tools/contact_film.mjs t0 t1 step [cols=4] [out=build/contact.png]
// Each cell is the review frame (picture + notes), so the time, shot and section are printed on it.
import { setup, frameRGB, AW, AH } from '../src/film/film.js';
import { writePNG } from '../src/pix/png.js';
await setup();
const [a, b, st] = process.argv.slice(2, 5).map(Number), cols = +(process.argv[5] || 4), out = process.argv[6] || 'build/contact.png';
const ts = []; for (let t = a; t < b - 1e-6; t += st) ts.push(t);
const rows = Math.ceil(ts.length / cols), W = cols * AW, H = rows * AH, img = new Uint8Array(W * H * 3);
ts.forEach((t, i) => { const rgb = frameRGB(t); const ox = (i % cols) * AW, oy = Math.floor(i / cols) * AH;
  for (let y = 0; y < AH; y++) img.set(rgb.subarray(y * AW * 3, (y + 1) * AW * 3), ((oy + y) * W + ox) * 3); });
writePNG(out, W, H, img);
console.log(out, ts.length, 'frames');
