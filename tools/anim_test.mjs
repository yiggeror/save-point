// Check the acting: a filmstrip and an onion-skin overlay of one actor over a stretch of time.
// node tools/anim_test.mjs <scene> [t0] [t1] [fps] → build/anim_strip.png, build/anim_onion.png
import { Surface } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { build } from '../src/rig/humanoid.js';
import { render, oblique } from '../src/rig/sdf.js';
import { drawFace } from '../src/rig/face.js';
import { P as proj } from '../src/set/kit.js';
import { actor, STYLE } from '../src/anim/perform.js';
import { heroA } from '../src/chars/heroA.js';
import { keeperA } from '../src/chars/keeperA.js';
const cam = oblique(0.45);
const scenes = {
  // stand → walk → stop → hero pose → back to stand
  heroPose: { D: heroA, st: STYLE.hero, box: [80, 50, 90, 90], track: (t) => {
    if (t < 0.5) return { x: 100, z: 30, yaw: 20, pose: 'stand', o: {} };
    if (t < 1.5) { const u = (t - 0.5) / 1.0; return { x: 100 + u * 40, z: 30, yaw: 90, pose: 'walk', o: { phase: u * 2, stride: 10, bounce: 1.2 } }; }
    if (t < 2.1) return { x: 140, z: 30, yaw: 20, pose: 'stand', o: {} };
    if (t < 3.2) return { x: 140, z: 30, yaw: 25, pose: 'heroPose', o: {} };
    return { x: 140, z: 30, yaw: 20, pose: 'stand', o: {} };
  } },
  // the keeper: NPC wipe (mechanical) → turns and points → stands
  keeper: { D: keeperA, st: STYLE.keeper, box: [205, 60, 70, 80], track: (t) => {
    if (t < 1.0) return { x: 238, z: 34, yaw: 0, pose: 'npcWipe', o: { phase: Math.floor(t * 4) % 2, counter: 22 }, npc: true };
    if (t < 2.2) return { x: 238, z: 34, yaw: -40, pose: 'point', o: {}, fromNpc: true };
    return { x: 238, z: 34, yaw: -48, pose: 'stand', o: {} };
  } },
};
const name = process.argv[2] || 'heroPose', sc = scenes[name];
const t0 = +(process.argv[3] ?? 0), t1 = +(process.argv[4] ?? 3.6), fps = +(process.argv[5] ?? 12);
const A = actor(sc.D, sc.track, sc.st, 3);
const [bx, by, bw, bh] = sc.box, frames = [];
for (let t = t0; t < t1 - 1e-6; t += 1 / fps) {
  const S = new Surface(320, 180); S.clear(-1);
  const a = A.at(t);
  if (a) {
    const rig = build(sc.D, a.P), [x, y] = proj(a.x, 0, a.z);
    const R = render(S, rig.fig, { x: Math.round(x), y: Math.round(y), z: a.z, zoom: 1, mats: sc.D.mats, cam });
    drawFace(S, R, rig, sc.D, a.P.face);
  }
  frames.push(S.toRGB({ bg: [236, 230, 220] }));
}
const cols = 8, rows = Math.ceil(frames.length / cols), W = bw * cols, H = bh * rows, out = new Uint8Array(W * H * 3).fill(255);
frames.forEach((rgb, i) => { const ox = (i % cols) * bw, oy = Math.floor(i / cols) * bh; for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) for (let c = 0; c < 3; c++) out[((oy + y) * W + ox + x) * 3 + c] = rgb[((by + y) * 320 + bx + x) * 3 + c]; });
writePNG('build/anim_strip.png', W * 3, H * 3, upscale(W, H, out, 3));
// onion skin: every frame darkened in, later frames stronger
const on = new Float32Array(bw * bh * 3).fill(255);
frames.forEach((rgb, i) => { const a = 0.25 + 0.5 * i / frames.length; for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const k = ((by + y) * 320 + bx + x) * 3; if (rgb[k] === 236 && rgb[k + 1] === 230) continue; for (let c = 0; c < 3; c++) { const o = (y * bw + x) * 3 + c; on[o] = on[o] * (1 - a) + rgb[k + c] * a; } } });
writePNG('build/anim_onion.png', bw * 4, bh * 4, upscale(bw, bh, Uint8Array.from(on), 4));
console.log(frames.length, 'frames');
