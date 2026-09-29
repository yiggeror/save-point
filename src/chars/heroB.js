// Hero · option B — "傻大个": tall and gangly, a floppy blond mop over his eyes, a long yellow scarf that trails
// behind him, a green tunic that is a size too short, big boots. All knees and elbows.
import { ramp } from '../pix/gfx.js';
import { mm, rotZ, rotY, rotX, add, apply, mul } from '../rig/m3.js';
import { strip, drape } from '../rig/cloth.js';
import { heroMaterials, heroBody } from './heroA.js';

const COL = { skin: '#eeb08a', hair: '#e2bb52', top: '#4d8a4e', pants: '#6e5a48', shoe: '#5c3b2a', glove: '#6e5a48', belt: '#4a3222', buckle: '#c9c3b0', cape: '#f0c238', band: '#f0c238', collar: '#e8dfc6' };
const { mats, M } = heroMaterials('hB', COL);
const FP = ramp('hB.face', ['#26141a', '#5b2a2a', '#ffffff', '#4a6a3a', '#b0413e', '#6e1f24', '#e86a78']);

export const heroB = {
  id: 'heroB', name: '傻大个', mats, M,
  ...heroBody(M, {
    hipH: 26, waistUp: 5.4, chestUp: 6.8, neckUp: 3.6, headUp: 8.2,
    pelvisR: [5.4, 4.4, 4.6], bellyR: [5.4, 5.2, 4.5], chestR: [6.8, 5.6, 5.0],
    shoulderW: 7.0, upper: 9.6, fore: 9.0, upperR: 2.1, elbowR: 1.8, wristR: 1.5, cuffAt: 0.72,
    thigh: 11.6, shin: 11.2, thighR: 2.7, kneeR: 2.2, ankleR: 1.8, stance: 3.6,
    foot: [8.4, 4.4, 3.6], bootTop: 0.4, bootFlare: 0.9, palm: [3.4, 3.3, 2.0], fingerL: 3.2,
    skullR: [7.8, 7.8, 7.5], jawR: [6.2, 5.6, 5.9], jawOff: [0, -3.4, 0.9],
    nose: { at: [0, -1.6, 7.4], r: [1.3, 1.5, 1.4] },
  }),
  face: { eye: [2.9, 0.2, 6.9], mouth: [0, -4.8, 6.3], eyeW: 2, eyeH: 3, brow: [3.0, 3.0, 7.2], browL: 3, showMouth: true, mouthW: 3, parts: [1],
    pal: { ink: FP[0], lid: FP[1], white: FP[2], iris: FP[3], mouthLine: FP[1], mouthIn: FP[5], tongue: FP[6], brow: FP[1] } },
  hair(k) {
    const { S, fig, at, ell, cone } = k, H = S.headF, hc = S.head, g = k.g.head;
    // a floppy mop: a round cap plus thick locks falling over the forehead and ears
    fig.add(ell(at(H, hc, [0, 1.6, -0.6]), H, [8.6, 8.2, 8.3], { g, m: M.hair, k: 1.0, part: 6,
      clip: [[apply(H, [0, -0.2, 1]), at(H, hc, [0, 0, 4.6])], [apply(H, [0, -1, 0.35]), at(H, hc, [0, -2.2, 0])]] }));
    const locks = [
      [[0, 7, 3], [0.6, 2.2, 8.4], 2.1], [[2.6, 6.8, 3], [3.8, 1.8, 7.9], 2.0], [[-2.6, 6.8, 3], [-3.4, 2.0, 8.0], 2.0],
      [[5, 5.4, 2], [7.4, 0.4, 5.4], 2.0], [[-5, 5.4, 2], [-7.4, 0.2, 5.4], 2.0],
      [[6, 3, -2], [8.6, -2.6, -1.6], 2.2], [[-6, 3, -2], [-8.6, -2.8, -1.6], 2.2],
      [[0, 6, -5], [0, -2.4, -9.8], 3.0], [[4, 5, -4], [5.6, -2.2, -8.6], 2.6], [[-4, 5, -4], [-5.6, -2.2, -8.6], 2.6],
      [[1, 8.2, 0], [2.4, 10.4, 2.2], 1.3],   // the cowlick
    ];
    for (const [b, t, r] of locks) fig.add(cone(at(H, hc, b), at(H, hc, t), r, 0.9, { g, m: M.hair, k: 1.3, part: 6 }));
  },
  clothes(k) {
    const { S, fig, at, ell, box, cone } = k, C = S.chestF, P = S.pelvisF;
    const g = fig.group('gear', { parent: 'torso', J: S.chest, R: 1, k: 0 });
    const bc = at(P, S.waist, [0, -1.8, 0]);
    fig.add(ell(bc, P, [6.1, 1.3, 5.4], { g, m: M.belt, k: 0, part: 32 }));
    fig.add(box(at(P, bc, [0, 0, 5.1]), P, [1.1, 1.0, 0.5], 0.3, { g, m: M.buckle, k: 0, part: 33 }));
    fig.add(ell(at(P, S.pelvis, [0, -1.0, 0]), P, [6.1, 5.0, 5.3], { g: k.g.torso, m: M.top, k: 1.5, part: 0, clip: [[apply(P, [0, -1, 0]), at(P, S.pelvis, [0, -3.6, 0])]] }));
    // the scarf: wrapped round the neck, one long tail down the front, one flying behind
    const ng = fig.group('scarf', { parent: 'torso', J: S.neck, R: 1, k: 0 });
    fig.add(ell(at(C, S.neck, [0, -0.6, 0.2]), C, [4.4, 2.2, 4.2], { g: ng, m: M.cape, k: 0.8, part: 43 }));
    const R = k.S.root, back = apply(R, [0, 0, -1]), fwd = apply(R, [0, 0, 1]);
    const t0 = at(C, S.neck, [-1.6, -1.2, 3.4]);
    const front = [t0]; let p = t0;
    for (let i = 1; i <= 3; i++) { p = add(p, add([0, -3.4, 0], mul(fwd, 0.35))); front.push(p); }
    strip(fig, front, [2.8, 2.7, 2.6, 2.5], fwd, { g: ng, m: M.cape, thick: 0.8, part: 43 });
    const b0 = at(C, S.neck, [1.8, -0.6, -3.4]);
    const tail = [b0]; p = b0;
    for (let i = 1; i <= 4; i++) { p = add(p, add([0, -2.6 + i * 0.2, 0], add(mul(back, 2.4), apply(R, [0.6, 0, 0])))); tail.push(p); }
    strip(fig, tail, [2.8, 2.7, 2.6, 2.5, 2.3], [0, 1, 0], { g: ng, m: M.cape, thick: 0.8, part: 43 });
  },
};
