// stack PNGs vertically: node tools/stack.mjs out.png a.png b.png ...
import fs from 'fs'; import zlib from 'zlib';
import { writePNG } from '../src/pix/png.js';
const [,, out, ...files] = process.argv;
const imgs = files.map((file) => {
  const buf = fs.readFileSync(file); let pos = 8, W, H, idat = [];
  while (pos < buf.length) { const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { W = data.readUInt32BE(0); H = data.readUInt32BE(4); } if (type === 'IDAT') idat.push(data); pos += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)); const rgb = new Uint8Array(W * H * 3);
  for (let j = 0; j < H; j++) raw.copy(Buffer.from(rgb.buffer), j * W * 3, j * (W * 3 + 1) + 1, (j + 1) * (W * 3 + 1));
  return { W, H, rgb };
});
const W = Math.max(...imgs.map((i) => i.W)), H = imgs.reduce((a, i) => a + i.H, 0);
const o = new Uint8Array(W * H * 3); let y = 0;
for (const i of imgs) { for (let j = 0; j < i.H; j++) o.set(i.rgb.subarray(j * i.W * 3, (j + 1) * i.W * 3), ((y + j) * W) * 3); y += i.H; }
writePNG(out, W, H, o);
