// The title card (separate from the film, which starts from black): two versions, the same picture —
//   film/title-music-1080p.mp4 (with the hook and the save chime) and film/title-sfx-1080p.mp4 (only the sounds).
// Black; the save crystal spins; "存档点" loads in row by row, the way the shop does; "Save Point" types in; the
// crystal settles — saved; a glint runs across the letters; the picture steps down to black.
// The big letters are the 12 px font's glyphs enlarged by Scale2x twice: edges and diagonals are redrawn at the
// film's pixel size (no big blocky pixels), then outlined, shaded in bands and given a drop shadow.
// node tools/title.mjs   (after production/audio/title.py)
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process';
import { Surface, text, loadFont, ramp, bayer, textWidth } from '../src/pix/gfx.js';
import { encodePNG } from '../src/pix/png.js';
import { saveIcon } from '../src/ui/hud.js';
await loadFont();
const ROWS0 = 1.2, ROWS1 = 3.0, NROWS = 12, SUB0 = 3.25, SUBDT = 0.06, SAVED = 4.1, END = 6.4, fps = 24;   // = production/audio/title.py
const C = ramp('title.logo', ['#1a1020', '#3a2230', '#8c3a2c', '#d0602c', '#f29a3c', '#ffd27a', '#fff4d0']);
const SUBC = ramp('title.sub', ['#6a6490', '#c8c2ea']);

// the glyphs as a bitmap
const word = '存档点', W0 = textWidth(word) + 2, H0 = 14;
const G = new Surface(W0, H0); G.clear(-1); text(G, word, 1, 1, 1);
let bm = Array.from({ length: H0 }, (_, y) => Array.from({ length: W0 }, (_, x) => (G.px[y * W0 + x] >= 0 ? 1 : 0)));
const scale2x = (b) => {
  const h = b.length, w = b[0].length, o = Array.from({ length: h * 2 }, () => new Array(w * 2).fill(0));
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : b[y][x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), Cc = at(x - 1, y), D = at(x, y + 1);
    o[2 * y][2 * x] = Cc === A && Cc !== D && A !== B ? A : P;
    o[2 * y][2 * x + 1] = A === B && A !== Cc && B !== D ? B : P;
    o[2 * y + 1][2 * x] = D === Cc && D !== B && Cc !== A ? Cc : P;
    o[2 * y + 1][2 * x + 1] = B === D && B !== A && D !== Cc ? D : P;
  }
  return o;
};
bm = scale2x(scale2x(bm));
const LH = bm.length, LW = bm[0].length, LX = Math.round(160 - LW / 2), LY = 52;
const inL = (x, y) => y >= 0 && x >= 0 && y < LH && x < LW && bm[y][x] === 1;

function frame(t) {
  const S = new Surface(320, 180); S.rect(0, 0, 320, 180, C[0]);
  // the logo, row by row
  const rows = t < ROWS0 ? -1 : (t - ROWS0) / (ROWS1 - ROWS0) * NROWS, rowH = Math.ceil((LH + 4) / NROWS);
  for (let y = -3; y < LH + 4; y++) for (let x = -3; x < LW + 4; x++) {
    const r = (y + 3) / rowH; if (r > rows) continue;
    if (Math.floor(r) === Math.floor(rows) && (x + y) % 2) continue;       // the row being laid, dithered
    const X = LX + x, Y = LY + y;
    if (inL(x, y)) {
      // bands: light at the top of each stroke, deeper toward its foot; a highlight on upper edges
      const band = y < LH * 0.3 ? 5 : y < LH * 0.55 ? 4 : y < LH * 0.8 ? 3 : 2;
      const top = !inL(x, y - 1), left = !inL(x - 1, y);
      S.set(X, Y, C[top ? 6 : left && band < 5 ? band + 1 : band]);
    } else if (inL(x - 1, y) || inL(x + 1, y) || inL(x, y - 1) || inL(x, y + 1) || inL(x - 1, y - 1) || inL(x + 1, y + 1) || inL(x - 1, y + 1) || inL(x + 1, y - 1)) S.set(X, Y, C[1]);   // outline
    else if (inL(x - 2, y - 2) || inL(x - 1, y - 2)) S.set(X, Y, C[1]);                                                                    // drop shadow
  }
  // a glint crossing the letters after "saved"
  if (t > SAVED + 0.3 && t < SAVED + 1.1) {
    const gx = (t - SAVED - 0.3) / 0.8 * (LW + 30) - 15;
    for (let y = 0; y < LH; y++) for (let k = 0; k < 3; k++) { const x = Math.round(gx - y * 0.5 + k); if (inL(x, y)) S.set(LX + x, LY + y, C[6]); }
  }
  // "Save Point", letter by letter
  const n = t < SUB0 ? 0 : Math.min(10, Math.floor((t - SUB0) / SUBDT) + 1), sub = 'Save Point'.slice(0, n);
  if (n) { const w = textWidth('Save Point'); text(S, sub, 160 - Math.round(w / 2), LY + LH + 12, SUBC[1]); }
  // the save crystal: spinning, then settled (saved)
  if (t > 0.5) saveIcon(S, 160, t < ROWS0 ? 84 : LY + LH + 30, t < SAVED ? (t * 1.4) % 1 : 0, t >= SAVED);
  // step down to black at the end (whole palette steps through an ordered dither, no blending)
  const rgb = S.toRGB();
  const k = t > END - 0.8 ? (t - (END - 0.8)) / 0.8 : 0;
  if (k > 0) for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) if (bayer(x, y) < k) { const i = (y * 320 + x) * 3; rgb[i] = 26; rgb[i + 1] = 16; rgb[i + 2] = 32; }
  return rgb;
}
const OUT = path.join('build', 'frames', 'title'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const NF = Math.round(END * fps);
for (let f = 0; f < NF; f++) fs.writeFileSync(path.join(OUT, String(f).padStart(6, '0') + '.png'), encodePNG(320, 180, frame(f / fps)));
for (const [v, wav] of [['music', 'title_music.wav'], ['sfx', 'title_sfx.wav']]) {
  const out = `film/title-${v}-1080p.mp4`;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(OUT, '%06d.png'), '-i', path.join('build', 'audio', wav),
    '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
  console.log('→', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
}
fs.writeFileSync('build/title_still.png', encodePNG(320, 180, frame(SAVED + 0.6)));
