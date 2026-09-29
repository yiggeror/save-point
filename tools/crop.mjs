// crop a region of a PNG we rendered (re-render cheaper: use the raw surface) — here: re-read PNG via zlib
import fs from 'fs'; import zlib from 'zlib';
import { writePNG, upscale } from '../src/pix/png.js';
const [,, file, x, y, w, h, k, out] = process.argv;
const buf = fs.readFileSync(file);
let pos = 8, W, H, idat = [];
while (pos < buf.length) { const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
  if (type === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); } if (type === 'IDAT') idat.push(data); pos += 12 + len; }
const raw = zlib.inflateSync(Buffer.concat(idat)); const rgb = new Uint8Array(W * H * 3);
for (let j = 0; j < H; j++) raw.copy(Buffer.from(rgb.buffer), j * W * 3, j * (W * 3 + 1) + 1, (j + 1) * (W * 3 + 1));
const cw = +w, ch = +h, c = new Uint8Array(cw * ch * 3);
for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) for (let q = 0; q < 3; q++) c[(j * cw + i) * 3 + q] = rgb[((+y + j) * W + (+x + i)) * 3 + q];
writePNG(out || 'build/crop.png', cw * +k, ch * +k, upscale(cw, ch, c, +k));
