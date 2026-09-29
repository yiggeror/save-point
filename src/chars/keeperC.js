// Shopkeeper · option C — "大熊": a big, broad, gentle man. A full trimmed beard, a bald head under a knitted cap,
// tiny round glasses, a mustard cardigan with elbow patches over a shirt, a leather apron, big careful hands.
import { materials } from '../rig/mat.js';
import { ramp } from '../pix/gfx.js';
import { mm, rotZ, rotY, rotX, add, apply } from '../rig/m3.js';

const { mats, M } = materials('kC', {
  skin:   ['#d9936f', { r: { cool: 15, shift: 0.3, o0: 0.28, o1: 0.42 } }],
  nose:   ['#d4826a', { r: { cool: 10, shift: 0.3, o0: 0.28, o1: 0.42 } }],
  hair:   ['#7a5238', { strands: 14, edge: true, r: { cool: 300, shift: 0.3, dH: 0.12 } }],
  top:    ['#c9924a', {}],
  sleeve: ['#c9924a', {}],
  patch:  ['#8a5e3a', { edge: true }],
  pants:  ['#4f5b4b', {}],
  shoe:   ['#3b2a24', { spec: 5, specTh: 0.96 }],
  apron:  ['#7b5a40', { edge: true, spec: 5, specTh: 0.97, ditherZ: 0 }],
  cap:    ['#a5443c', { edge: true }],
  shirt:  ['#e6dfcc', { r: { dS: 0.12 } }],
});
const FP = ramp('kC.face', ['#22120e', '#4b2a1e', '#5b4a3a', '#a08a5a', '#ffffff', '#6e1f24', '#e0707a']);

export const keeperC = {
  id: 'keeperC', name: '大熊', mats, M,
  hipH: 22, waistUp: 6, chestUp: 8.5, neckUp: 3.2, neckFwd: 1.2, headUp: 8.4, headFwd: 1.2,
  pelvisR: [8.4, 6.0, 7.0], bellyR: [10.4, 8.8, 9.0], bellyOff: [0, 0, 1.4], chestR: [11.0, 7.6, 7.8], chestOff: [0, 0.4, -0.4],
  neckR: 3.2, torsoK: 5,
  shoulderW: 10.6, shoulderY: 2.4, shoulderZ: -0.8, deltR: 4.0,
  upper: 9.4, fore: 9.0, upperR: 3.4, elbowR: 3.0, wristR: 2.4, cuffAt: 0.84, foreMat: M.sleeve, cuffRoll: 2.8,
  palm: [4.2, 4.4, 2.5], fingerR: 0.85, fingerL: 3.8, hangOut: 2.4, hangFwd: 1.8,
  hipW: 4.4, hipDrop: 2.6, thigh: 9.8, shin: 9.2, thighR: 4.2, kneeR: 3.4, ankleR: 2.7, ankleH: 2.4, stance: 4.8, footOut: 10,
  foot: [8.4, 5.2, 3.6], bootTop: 0.2,
  skullR: [8.2, 8.4, 8.0], jawR: [7.4, 6.2, 6.6], jawOff: [0, -3.2, 1.0],
  nose: { at: [0, -1.2, 7.7], r: [1.7, 1.8, 1.6] }, ears: { at: [8.0, -0.5, -0.6], r: [1.3, 2.3, 1.4] },
  matPelvis: M.pants, matBelly: M.top,
  face: { eye: [2.9, 1.0, 7.1], mouth: [0, -4.6, 7.4], eyeW: 1, eyeH: 2, brow: [3.0, 3.2, 7.2], browL: 3.2, browT: 1.0,
    glasses: 'round', lensR: 1.75, lensOut: 0.8, earX: 8.0, earZ: -0.6, mouthW: 2.4, mouthTol: 3.5, parts: [1, 5],
    pal: { ink: FP[0], lid: FP[1], rim: FP[3], glint: FP[4], white: FP[4], mouthLine: FP[1], mouthIn: FP[5], tongue: FP[6], brow: FP[2] } },
  head(k) {
    const { S, fig, at, ell } = k, H = S.headF, hc = S.head, g = k.g.head;
    const e = k.expr || {};
    // the beard: a full, trimmed shape along the jaw, cheeks and chin
    fig.add(ell(at(H, hc, [0, -4.4, 1.9]), H, [8.2, 6.3, 6.9], {
      g, m: M.hair, k: 1.2, part: 5,
      clip: [[apply(H, [0, 1, 0.3]), at(H, hc, [0, -1.6, 0])]],
    }));
    // moustache over the beard
    for (const s of [1, -1]) fig.add(ell(at(H, hc, [s * 2.2, -3.1 + (e.stache ?? 0) * 0.4, 7.9]), mm(H, rotZ(s * -14)), [2.7, 1.3, 1.4], { g, m: M.hair, k: 0.6, part: 5 }));
    // a snug knitted cap with a turned-up brim
    fig.add(ell(at(H, hc, [0, 1.2, -0.5]), H, [8.75, 8.1, 8.45], { g, m: M.cap, k: 0.4, part: 7, clip: [[apply(H, [0, -1, 0]), at(H, hc, [0, 3.6, 0])]] }));
    fig.add(ell(at(H, hc, [0, 4.3, -0.4]), mm(H, rotX(-4)), [9.15, 1.55, 8.85], { g, m: M.cap, k: 0.3, part: 7 }));
    fig.add(ell(at(H, hc, [0, 9.3, -0.6]), H, [1.5, 1.2, 1.5], { g, m: M.cap, k: 1.2, part: 7 }));
  },
  clothes(k) {
    const { S, fig, at, ell, box, cone } = k, C = S.chestF, P = S.pelvisF;
    const g = fig.group('apron', { parent: 'torso', J: S.chest, R: 1, k: 0 });
    // leather apron: bib and a long skirt
    const cc = at(C, S.chest, [0, 0, -0.4]);
    fig.add(ell(cc, C, [11.0 + 0.5, 7.6 + 0.5, 7.8 + 0.5], {
      g, m: M.apron, k: 0, part: 30,
      clip: [[apply(C, [0, 0, -1]), at(C, cc, [0, 0, 3.4])], [apply(C, [1, 0, 0]), at(C, cc, [6.0, 0, 0])], [apply(C, [-1, 0, 0]), at(C, cc, [-6.0, 0, 0])], [apply(C, [0, 1, 0]), at(C, cc, [0, 4.4, 0])]],
    }));
    const bc = at(P, S.waist, [0, 0, 1.4]);
    fig.add(ell(bc, P, [10.4 + 0.5, 8.8 + 0.5, 9.0 + 0.5], {
      g, m: M.apron, k: 1.2, part: 30,
      clip: [[apply(P, [0, 0, -1]), at(P, bc, [0, 0, 3.6])], [apply(P, [1, 0, 0]), at(P, bc, [8.0, 0, 0])], [apply(P, [-1, 0, 0]), at(P, bc, [-8.0, 0, 0])]],
    }));
    const kn = add(S.leg.L.knee, S.leg.R.knee).map((v) => v / 2);
    const top = at(P, S.pelvis, [0, -1, 7.2]), bot = [kn[0], kn[1] - 2.5, kn[2] + 4.2];
    const pc = top.map((v, i) => (v + bot[i]) / 2);
    fig.add(box(pc, P, [8.0, (top[1] - bot[1]) / 2 + 0.6, 0.8], 0.7, { g, m: M.apron, k: 1.5, part: 30 }));
    for (const s of [1, -1]) fig.add(cone(at(C, S.chest, [s * 5.4, 4.2, 5.6]), at(C, S.neck, [s * 3.2, 0.2, -1.4]), 0.7, 0.65, { g, m: M.apron, k: 0, part: 31 }));
    // elbow patches
    for (const side of ['L', 'R']) {
      const a = S.arm[side];
      const back = apply(C, [0, 0, -1]);
      fig.add(ell(add(a.el, [back[0] * 2.4, back[1] * 2.4, back[2] * 2.4]), C, [2.0, 2.4, 1.4], { g: fig.group('arm' + side), m: M.patch, k: 0.4, part: 10 }));
    }
    // shirt collar at the neck
    fig.add(ell(at(C, S.chest, [0, 6.0, 1.2]), C, [4.6, 1.6, 4.2], { g, m: M.shirt, k: 0.4, part: 34 }));
  },
};
