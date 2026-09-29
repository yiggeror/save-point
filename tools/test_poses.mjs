// several poses in a row: node tools/test_poses.mjs <design> <yaw> <zoom> <scale> pose1,pose2,…  (pose@k=v for options)
import { Surface, ramp } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { build } from '../src/rig/humanoid.js';
import { render, oblique } from '../src/rig/sdf.js';
import { drawFace } from '../src/rig/face.js';
import { pose } from '../src/rig/poses.js';
const [,, name, yawS, zS, kS, list] = process.argv;
const D = (await import(`../src/chars/${name}.js`))[name];
const zoom = +zS, k = +kS, names = list.split(',');
const bg = ramp('bg', ['#2b2a33', '#3a3944', '#8f8a80']);
const cw = 54 * zoom, W = cw * names.length, H = 90 * zoom;
const S = new Surface(W, H); S.clear(bg[1]);
names.forEach((spec, i) => {
  const [pn, ...opts] = spec.split('@');
  const o = { yaw: +yawS }; for (const q of opts) { const [a, b] = q.split('='); o[a] = isNaN(+b) ? b : +b; }
  const P = pose(D, pn, o);
  const rig = build(D, P);
  const R = render(S, rig.fig, { x: Math.round(cw / 2 + i * cw), y: Math.round(84 * zoom), zoom, mats: D.mats, cam: oblique(0.45) });
  drawFace(S, R, rig, D, P.face);
});
writePNG('build/test_poses.png', W * k, H * k, upscale(W, H, S.toRGB(), k));
