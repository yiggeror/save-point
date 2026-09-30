// Frame-by-frame check from the rendered film frames: node tools/strip.mjs t0 t1 [x y w h] [cols=8] [scale=2] [fps=24]
// → build/strip.png (every frame between t0 and t1, cropped, in a grid)
import fs from 'fs'; import zlib from 'zlib';
import { writePNG, upscale } from '../src/pix/png.js';
const a = process.argv.slice(2).map(Number);
const [t0, t1] = a, [cx, cy, cw, ch] = a.length >= 6 ? a.slice(2, 6) : [0, 0, 320, 180];
const cols = a[6] || 8, k = a[7] || 2, fps = a[8] || 24;
const read = (file) => { const buf = fs.readFileSync(file); const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20); let pos = 8, idat = [];
  while (pos < buf.length) { const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8); if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len)); pos += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), rgb = new Uint8Array(W * H * 3);
  for (let j = 0; j < H; j++) raw.copy(Buffer.from(rgb.buffer), j * W * 3, j * (W * 3 + 1) + 1, (j + 1) * (W * 3 + 1)); return { W, H, rgb }; };
const fr = []; for (let f = Math.round(t0 * fps); f < Math.round(t1 * fps); f++) fr.push(f);
const rows = Math.ceil(fr.length / cols), GW = (cw + 1) * cols, GH = (ch + 1) * rows, img = new Uint8Array(GW * GH * 3).fill(40);
fr.forEach((f, i) => { const { W, rgb } = read(`build/frames/film/${String(f).padStart(6, '0')}.png`); const ox = (i % cols) * (cw + 1), oy = Math.floor(i / cols) * (ch + 1);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) for (let c = 0; c < 3; c++) img[((oy + y) * GW + ox + x) * 3 + c] = rgb[((cy + y) * W + cx + x) * 3 + c]; });
writePNG('build/strip.png', GW * k, GH * k, upscale(GW, GH, img, k));
console.log(fr.length, 'frames');
