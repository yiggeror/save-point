// Shopkeeper · option A — "老掌柜": short and round, bald crown with white tufts, big white moustache, round
// spectacles, a green apron over a cream shirt with rolled sleeves. Slow, steady, particular.
import { materials } from '../rig/mat.js';
import { ramp } from '../pix/gfx.js';
import { mm, rotZ, rotY, rotX, add, apply } from '../rig/m3.js';

const { mats, M } = materials('kA', {
  skin:   ['#e8a987', { r: { cool: 15, shift: 0.3, o0: 0.3, o1: 0.45 } }],
  nose:   ['#e39079', { r: { cool: 10, shift: 0.3, o0: 0.3, o1: 0.45 } }],
  hair:   ['#e6e1da', { r: { cool: 275, shift: 0.5, dS: 0.12, dH: 0.08 } }],
  top:    ['#e6d9bd', { r: { dS: 0.12 } }],
  sleeve: ['#e6d9bd', { r: { dS: 0.12 } }],
  apron:  ['#4f7a52', { edge: true }],
  pants:  ['#6b5140', {}],
  shoe:   ['#4a3530', { spec: 5, specTh: 0.97 }],
  strap:  ['#3f6343', { edge: true }],
});

const FP = ramp('kA.face', ['#2a1714', '#5a2f22', '#8a5a2a', '#c99a4a', '#fff6e0', '#b0413e', '#6e1f24', '#e0707a']);

export const keeperA = {
  id: 'keeperA', name: '老掌柜', mats, M,
  // proportions (px at zoom 1)
  hipH: 15.5, waistUp: 5, chestUp: 7, neckUp: 3.2, neckFwd: 0.6, headUp: 8.6, headFwd: 0.6,
  pelvisR: [7.4, 5.2, 6.2], bellyR: [9.4, 7.8, 8.6], bellyOff: [0, -0.5, 1.6], chestR: [8.4, 5.6, 6.4], chestOff: [0, 0, -0.4],
  neckR: 2.8, torsoK: 5,
  shoulderW: 8.0, shoulderY: 2.2, shoulderZ: -0.6, deltR: 3.2,
  upper: 7.2, fore: 6.8, upperR: 2.7, elbowR: 2.3, wristR: 1.75, cuffAt: 0.16, cuffRoll: 2.75, foreMat: M.sleeve,
  palm: [3.1, 3.3, 1.9], fingerR: 0.62, fingerL: 2.9, hangOut: 1.8, hangFwd: 1.6,
  hipW: 3.7, hipDrop: 2.2, thigh: 6.4, shin: 6.0, thighR: 3.5, kneeR: 2.7, ankleR: 2.1, ankleH: 2.0, stance: 3.9, footOut: 10,
  foot: [6.6, 4.1, 3.0],
  skullR: [8.3, 8.1, 7.9], jawR: [7.5, 5.6, 6.6], jawOff: [0, -3.1, 0.9],
  nose: { at: [0, -1.6, 7.7], r: [1.8, 1.6, 1.5] }, ears: { at: [8.0, -0.6, -0.8], r: [1.3, 2.2, 1.4] },
  matPelvis: M.pants, matBelly: M.top,
  // face anchors in head space: eyes, brows, mouth
  face: { eye: [3.1, 0.6, 7.0], mouth: [0, -4.9, 6.9], eyeW: 1, eyeH: 2, glasses: 'round', lensR: 2.35, lensOut: 0.7, earX: 7.8, earZ: -0.6, mouthW: 2.5,
    pal: { ink: FP[0], lid: FP[1], rim: FP[2], glint: FP[4], white: FP[4], mouthLine: FP[0], mouthIn: FP[6], tongue: FP[7] } },
  head(k) {
    const { S, fig, at, ell } = k, H = S.headF, hc = S.head, g = k.g.head;
    // white tufts over the ears and round the back
    for (const s of [1, -1]) {
      fig.add(ell(at(H, hc, [s * 7.0, 0.8, -2.2]), mm(H, rotZ(s * 12)), [2.6, 3.5, 3.8], { g, m: M.hair, k: 1.6, part: 4 }));
      fig.add(ell(at(H, hc, [s * 5.6, 3.6, -3.4]), mm(H, rotZ(s * 30)), [2.2, 2.0, 2.8], { g, m: M.hair, k: 1.4, part: 4 }));
    }
    fig.add(ell(at(H, hc, [0, 0.4, -6.4]), H, [6.4, 3.8, 2.6], { g, m: M.hair, k: 1.8, part: 4 }));
    // one proud curl on the crown
    fig.add(ell(at(H, hc, [1.2, 8.3, 0.6]), mm(H, rotZ(-25)), [1.3, 1.0, 1.1], { g, m: M.hair, k: 1.2, part: 4 }));
    // bushy brows (they move with the expression: k.expr.brow)
    const e = k.expr || {};
    for (const s of [1, -1]) {
      const lift = (e.brow ?? 0) + (s > 0 ? (e.browL ?? 0) : (e.browR ?? 0)), tilt = (e.browTilt ?? 0) * s;
      fig.add(ell(at(H, hc, [s * 3.3, 3.3 + lift, 6.9 - Math.abs(lift) * 0.2]), mm(H, rotZ(s * (8 + tilt))), [2.3, 1.05, 1.3], { g, m: M.hair, k: 0.5, part: 5 }));
    }
    // the moustache: two drooping wings
    for (const s of [1, -1]) {
      const w = e.stache ?? 0;
      fig.add(ell(at(H, hc, [s * 2.5, -3.5 + w * 0.4, 7.4]), mm(mm(H, rotZ(s * (-16 + w * 12))), rotY(s * 18)), [3.0, 1.45, 1.6], { g, m: M.hair, k: 0.9, part: 5 }));
    }
  },
  clothes(k) {
    const { S, fig, at, ell, box, cone } = k, C = S.chestF, P = S.pelvisF;
    const g = fig.group('apron', { parent: 'torso', J: S.chest, R: 1, k: 0 });
    // bib: a skin a little outside the chest, front only
    const cc = at(C, S.chest, [0, 0, -0.4]);
    fig.add(ell(cc, C, [8.4 + 0.45, 5.6 + 0.45, 6.4 + 0.45], {
      g, m: M.apron, k: 0, part: 30,
      clip: [[apply(C, [0, 0, -1]), at(C, cc, [0, 0, 2.8])], [apply(C, [1, 0, 0]), at(C, cc, [4.6, 0, 0])], [apply(C, [-1, 0, 0]), at(C, cc, [-4.6, 0, 0])], [apply(C, [0, 1, 0]), at(C, cc, [0, 3.2, 0])]],
    }));
    // skirt over the belly and down the front of the thighs
    const mid = S.waist;
    const bc = at(P, mid, [0, -0.5, 1.6]);
    fig.add(ell(bc, P, [9.4 + 0.5, 7.8 + 0.5, 8.6 + 0.5], {
      g, m: M.apron, k: 1.2, part: 30,
      clip: [[apply(P, [0, 0, -1]), at(P, bc, [0, 0, 3.2])], [apply(P, [1, 0, 0]), at(P, bc, [6.2, 0, 0])], [apply(P, [-1, 0, 0]), at(P, bc, [-6.2, 0, 0])]],
    }));
    const kn = add(S.leg.L.knee, S.leg.R.knee).map((v) => v / 2);
    const top = at(P, S.pelvis, [0, -1, 6.4]), bot = [kn[0], kn[1] + 0.6, kn[2] + 3.4];
    const pc = top.map((v, i) => (v + bot[i]) / 2);
    fig.add(box(pc, P, [6.3, (top[1] - bot[1]) / 2 + 0.6, 0.7], 0.6, { g, m: M.apron, k: 1.5, part: 30 }));
    // neck strap
    for (const s of [1, -1]) fig.add(cone(at(C, S.chest, [s * 4.2, 3.4, 5.0]), at(C, S.neck, [s * 2.6, 0.2, -1.2]), 0.55, 0.5, { g, m: M.strap, k: 0, part: 31 }));
  },
};
