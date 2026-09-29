// node tools/test_pose.mjs <design> <pose> <yaw> [zoom] [scale]
import { Surface, ramp } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { build } from '../src/rig/humanoid.js';
import { render, camera } from '../src/rig/sdf.js';
import { drawFace } from '../src/rig/face.js';
import { pose } from '../src/rig/poses.js';
const [,, name, pname, yawS, zS, kS] = process.argv;
const D = (await import(`../src/chars/${name}.js`))[name];
const zoom = +(zS || 1), k = +(kS || 4), yaws = (yawS || '30').split(',').map(Number);
const bg = ramp('bg', ['#2b2a33', '#3a3944', '#8f8a80']);
const cw = 64 * zoom, W = cw * yaws.length, H = 90 * zoom;
const S = new Surface(W, H); S.clear(bg[1]);
yaws.forEach((yaw, i) => {
  const P = pose(D, pname, { yaw });
  const rig = build(D, P);
  const R = render(S, rig.fig, { x: Math.round(cw / 2 + i * cw), y: Math.round(84 * zoom), zoom, mats: D.mats, cam: camera(8) });
  drawFace(S, R, rig, D, P.face);
});
writePNG('build/test_pose.png', W * k, H * k, upscale(W, H, S.toRGB(), k));
