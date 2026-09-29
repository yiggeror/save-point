// contact sheet from rendered animatic frames: node tools/contact.mjs t0 t1 step cols out.png
import fs from 'fs'; import zlib from 'zlib';
import { writePNG } from '../src/pix/png.js';
const [,, a, b, st, colsS, out] = process.argv;
const fps = 12, AW = 384, AH = 216, cols = +colsS;
const read = (file) => { const buf = fs.readFileSync(file); let pos = 8, idat = [];
  while (pos < buf.length) { const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8); if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len)); pos += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), rgb = new Uint8Array(AW * AH * 3);
  for (let j = 0; j < AH; j++) raw.copy(Buffer.from(rgb.buffer), j * AW * 3, j * (AW * 3 + 1) + 1, (j + 1) * (AW * 3 + 1)); return rgb; };
const ts = []; for (let t = +a; t < +b; t += +st) ts.push(t);
const rows = Math.ceil(ts.length / cols), W = cols * AW, H = rows * AH, img = new Uint8Array(W * H * 3);
ts.forEach((t, i) => { const f = Math.round(t * fps), rgb = read(`build/animatic/${String(f).padStart(6, '0')}.png`);
  const ox = (i % cols) * AW, oy = Math.floor(i / cols) * AH;
  for (let y = 0; y < AH; y++) img.set(rgb.subarray(y * AW * 3, (y + 1) * AW * 3), ((oy + y) * W + ox) * 3); });
writePNG(out, W, H, img);
