// Minimal PNG writer (RGB or RGBA, 8 bit) on Node's zlib. Used for contact sheets, design sheets and stills.
import zlib from 'zlib';
import fs from 'fs';

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** rgb: Uint8Array of w*h*ch bytes (ch = 3 or 4) */
export function encodePNG(w, h, rgb, ch = 3) {
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * ch + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * ch, w * ch).copy(raw, y * (w * ch + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = ch === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function writePNG(file, w, h, rgb, ch = 3) {
  fs.writeFileSync(file, encodePNG(w, h, rgb, ch));
}

/** nearest-neighbour integer upscale of an RGB buffer */
export function upscale(w, h, rgb, k, ch = 3) {
  const W = w * k, H = h * k, out = new Uint8Array(W * H * ch);
  for (let y = 0; y < H; y++) {
    const sy = (y / k) | 0;
    for (let x = 0; x < W; x++) {
      const s = (sy * w + ((x / k) | 0)) * ch, d = (y * W + x) * ch;
      for (let c = 0; c < ch; c++) out[d + c] = rgb[s + c];
    }
  }
  return out;
}
