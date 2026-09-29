// quick look: node tools/test_char.mjs <design> <zoom> <scale> <yaws> [expr json] [pose json] → build/test_char.png
import { Surface, ramp } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { build } from '../src/rig/humanoid.js';
import { render, camera, oblique } from '../src/rig/sdf.js';
import { drawFace } from '../src/rig/face.js';
const name = process.argv[2] || 'keeperA';
const D = (await import(`../src/chars/${name}.js`))[name];
const zoom = +(process.argv[3] || 1), k = +(process.argv[4] || 4);
const yaws = (process.argv[5] || '0,45,90,135,180').split(',').map(Number);
const E = JSON.parse(process.argv[6] || '{}'), PO = JSON.parse(process.argv[7] || '{}');
const bg = ramp('bg', ['#2b2a33', '#3a3944', '#8f8a80']);
const cw = 64 * zoom, W = Math.round(cw * yaws.length), H = Math.round(76 * zoom);
const S = new Surface(W, H); S.clear(bg[1]);
const t0 = Date.now();
yaws.forEach((yaw, i) => {
  const rig = build(D, { ...PO, yaw, face: E });
  const R = render(S, rig.fig, { x: Math.round(cw / 2 + i * cw), y: Math.round(70 * zoom), zoom, mats: D.mats, cam: oblique(0.45) });
  drawFace(S, R, rig, D, E);
});
console.log('render ms', Date.now() - t0);
writePNG('build/test_char.png', W * k, H * k, upscale(W, H, S.toRGB(), k));
