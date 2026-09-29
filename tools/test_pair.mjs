// two designs side by side at several yaws: node tools/test_pair.mjs keeperA heroA [zoom] [scale]
import { Surface, ramp } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { build } from '../src/rig/humanoid.js';
import { render, camera, oblique } from '../src/rig/sdf.js';
import { drawFace } from '../src/rig/face.js';
const names = process.argv.slice(2).filter((a) => isNaN(+a));
const nums = process.argv.slice(2).filter((a) => !isNaN(+a)).map(Number);
const zoom = nums[0] || 1, k = nums[1] || 4;
const yaws = [0, 45, 90, 135, 180];
const bg = ramp('bg', ['#2b2a33', '#3a3944', '#8f8a80']);
const cw = 40 * zoom, W = cw * yaws.length * names.length, H = 80 * zoom;
const S = new Surface(W, H); S.clear(bg[1]);
let i = 0;
for (const n of names) {
  const D = (await import(`../src/chars/${n}.js`))[n];
  for (const yaw of yaws) {
    const rig = build(D, { yaw, face: {} });
    const R = render(S, rig.fig, { x: Math.round(cw / 2 + i * cw), y: Math.round(74 * zoom), zoom, mats: D.mats, cam: oblique(0.45) });
    drawFace(S, R, rig, D, {});
    i++;
  }
}
writePNG('build/test_pair.png', W * k, H * k, upscale(W, H, S.toRGB(), k));
