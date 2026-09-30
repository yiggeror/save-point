// Contact sheet from rendered review frames: node tools/contact.mjs t0 t1 step [cols=5] [out=build/contact.png] [fps=24]
import fs from 'fs'; import zlib from 'zlib';
import { writePNG } from '../src/pix/png.js';
const [,, a, b, st, colsS, outS, fpsS] = process.argv;
const fps = +(fpsS || 24), cols = +(colsS || 5), out = outS || 'build/contact.png';
const read = (file) => { const buf = fs.readFileSync(file); const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20); let pos = 8, idat = [];
  while (pos < buf.length) { const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8); if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len)); pos += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), rgb = new Uint8Array(W * H * 3);
  for (let j = 0; j < H; j++) raw.copy(Buffer.from(rgb.buffer), j * W * 3, j * (W * 3 + 1) + 1, (j + 1) * (W * 3 + 1)); return { W, H, rgb }; };
const ts = []; for (let t = +a; t < +b; t += +st) ts.push(t);
const first = read(`build/frames/review/${String(Math.round(ts[0] * fps)).padStart(6, '0')}.png`), AW = first.W, AH = first.H;
const rows = Math.ceil(ts.length / cols), W = cols * AW, H = rows * AH, img = new Uint8Array(W * H * 3);
ts.forEach((t, i) => { const { rgb } = read(`build/frames/review/${String(Math.round(t * fps)).padStart(6, '0')}.png`);
  const ox = (i % cols) * AW, oy = Math.floor(i / cols) * AH;
  for (let y = 0; y < AH; y++) img.set(rgb.subarray(y * AW * 3, (y + 1) * AW * 3), ((oy + y) * W + ox) * 3); });
writePNG(out, W, H, img);
console.log(out, ts.length);
