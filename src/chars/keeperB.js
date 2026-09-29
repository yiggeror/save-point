// Shopkeeper · option B — "瘦掌柜": tall and thin, neat grey hair with a side parting, a pencil moustache and
// half-moon spectacles, a burgundy waistcoat over a white shirt with sleeve garters, a bow tie, a pencil behind the
// ear. Precise, fussy, a little stiff.
import { materials } from '../rig/mat.js';
import { ramp } from '../pix/gfx.js';
import { mm, rotZ, rotY, rotX, add, apply } from '../rig/m3.js';

const { mats, M } = materials('kB', {
  skin:   ['#e3a58a', { r: { cool: 15, shift: 0.3, o0: 0.3, o1: 0.45 } }],
  nose:   ['#df9a82', { r: { cool: 10, shift: 0.3, o0: 0.3, o1: 0.45 } }],
  hair:   ['#a7a6ad', { edge: true, spec: 5, specTh: 0.93, r: { cool: 275, shift: 0.35, dH: 0.12 } }],
  top:    ['#8a3240', { edge: true }],
  sleeve: ['#efe9de', { r: { dS: 0.12 } }],
  shirt:  ['#efe9de', { r: { dS: 0.12 } }],
  pants:  ['#474a5c', {}],
  shoe:   ['#2f2a33', { spec: 5, specTh: 0.95 }],
  tie:    ['#2c3f6e', { edge: true }],
  garter: ['#6b2530', { edge: true }],
  pencil: ['#e2b23c', {}],
  button: ['#d9b85a', { spec: 5, specTh: 0.8 }],
});
const FP = ramp('kB.face', ['#24141a', '#4e2c2c', '#9c7a3a', '#d8c07a', '#ffffff', '#6e1f24', '#e0707a']);

export const keeperB = {
  id: 'keeperB', name: '瘦掌柜', mats, M,
  hipH: 24, waistUp: 5.5, chestUp: 7.5, neckUp: 4.6, neckFwd: 0.8, headUp: 8.8, headFwd: 0.9,
  pelvisR: [5.6, 4.4, 4.6], bellyR: [5.6, 5.8, 4.8], bellyOff: [0, 0, 0.3], chestR: [6.6, 5.8, 4.6],
  neckR: 1.9, torsoK: 4,
  shoulderW: 6.6, shoulderY: 2.6, shoulderZ: -0.4, deltR: 2.4,
  upper: 9.0, fore: 8.4, upperR: 2.0, elbowR: 1.75, wristR: 1.45, cuffAt: 1.2, foreMat: M.sleeve,
  palm: [3.2, 2.8, 1.6], fingerR: 0.55, fingerL: 3.2, hangOut: 1.2, hangFwd: 1.0,
  hipW: 2.9, hipDrop: 2.0, thigh: 10.6, shin: 10.2, thighR: 2.7, kneeR: 2.1, ankleR: 1.7, ankleH: 2.0, stance: 3.0, footOut: 12,
  foot: [7.2, 3.3, 2.6],
  skullR: [7.0, 8.6, 7.4], jawR: [6.0, 6.2, 6.2], jawOff: [0, -3.8, 0.8],
  nose: { at: [0, -1.4, 7.4], r: [1.2, 2.2, 1.8], k: 0.8 }, ears: { at: [6.8, -0.6, -0.6], r: [1.1, 2.2, 1.3] },
  matPelvis: M.pants, matBelly: M.top, matNeck: M.skin,
  face: { eye: [2.7, 0.9, 6.5], mouth: [0, -5.6, 6.2], eyeW: 1, eyeH: 2, brow: [2.8, 3.4, 6.7], browL: 2.6, browT: 0.7,
    glasses: 'half', lensR: 2.0, lensOut: 1.0, earX: 6.8, earZ: -0.6, mouthW: 2,
    pal: { ink: FP[0], lid: FP[1], rim: FP[3], glint: FP[4], white: FP[4], mouthLine: FP[1], mouthIn: FP[5], tongue: FP[6], brow: FP[1] } },
  head(k) {
    const { S, fig, at, ell, cone } = k, H = S.headF, hc = S.head, g = k.g.head;
    // neat hair: a cap parted on the left, combed flat and over to the right
    fig.add(ell(at(H, hc, [0.2, 1.5, -0.6]), mm(H, rotZ(-4)), [7.5, 8.2, 7.9], {
      g, m: M.hair, k: 0.6, part: 6,
      clip: [[apply(H, [0, -0.45, 1]), at(H, hc, [0, 3.2, 4.4])], [apply(H, [0, -1, 0.5]), at(H, hc, [0, 0.5, 0])]],
    }));
    fig.add(ell(at(H, hc, [-2.6, 6.6, 2.4]), mm(H, rotZ(16)), [4.6, 2.3, 4.6], { g, m: M.hair, k: 1.2, part: 6 }));   // the sweep
    // temples, a little grey at the sides
    for (const s of [1, -1]) fig.add(ell(at(H, hc, [s * 6.3, 0.2, -1.8]), H, [1.6, 3.2, 3.6], { g, m: M.hair, k: 1.0, part: 6 }));
    // pencil moustache
    const e = k.expr || {};
    for (const s of [1, -1]) fig.add(ell(at(H, hc, [s * 1.9, -3.7 + (e.stache ?? 0) * 0.3, 6.8]), mm(H, rotZ(s * -10)), [2.1, 0.65, 0.8], { g, m: M.hair, k: 0.4, part: 5 }));
    // the pencil behind the right ear
    const p0 = at(H, hc, [-7.2, 2.6, 2.6]), p1 = at(H, hc, [-6.6, -1.2, -4.2]);
    fig.add(cone(p0, p1, 0.55, 0.55, { g: fig.group('pencil', { parent: 'head', J: p0, R: 1, k: 0 }), m: M.pencil, part: 8 }));
  },
  clothes(k) {
    const { S, fig, at, ell, box, cone } = k, C = S.chestF, P = S.pelvisF;
    // shirt front shows in the V of the waistcoat: a white panel on the chest
    const g = fig.group('vest', { parent: 'torso', J: S.chest, R: 1, k: 0 });
    fig.add(ell(at(C, S.chest, [0, 2.5, 2.6]), C, [2.2, 3.4, 2.4], { g, m: M.shirt, k: 0, part: 34, clip: [[apply(C, [0, 0, -1]), at(C, S.chest, [0, 0, 3.6])]] }));
    // bow tie
    for (const s of [1, -1]) fig.add(ell(at(C, S.chest, [s * 1.3, 5.3, 4.6]), mm(C, rotZ(s * 12)), [1.4, 0.95, 0.7], { g, m: M.tie, k: 0.3, part: 35 }));
    fig.add(ell(at(C, S.chest, [0, 5.3, 4.9]), C, [0.6, 0.6, 0.5], { g, m: M.tie, k: 0, part: 35 }));
    // waistcoat buttons
    for (let i = 0; i < 3; i++) fig.add(ell(at(C, S.chest, [0, -1.2 - i * 2.4, 4.9 - i * 0.1]), C, [0.55, 0.55, 0.4], { g, m: M.button, k: 0, part: 36 }));
    // sleeve garters above the elbows
    for (const side of ['L', 'R']) {
      const a = S.arm[side];
      const c0 = [0, 1, 2].map((i) => a.sh[i] + (a.el[i] - a.sh[i]) * 0.62), c1 = [0, 1, 2].map((i) => a.sh[i] + (a.el[i] - a.sh[i]) * 0.74);
      fig.add(cone(c0, c1, 2.25, 2.1, { g: fig.group('arm' + side), m: M.garter, k: 0.3, part: 10 }));
    }
    // shirt collar points
    for (const s of [1, -1]) fig.add(ell(at(C, S.chest, [s * 1.9, 5.9, 3.4]), mm(C, rotZ(s * 30)), [1.4, 0.8, 0.8], { g, m: M.shirt, k: 0.2, part: 34 }));
  },
};
