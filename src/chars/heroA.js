// Hero · option A — "刺头": big orange spiky hair, a blue headband with long tails, a blue tunic with a belt,
// a short red cape, brown gloves and boots. Bouncy, big, a little silly.
import { materials } from '../rig/mat.js';
import { ramp } from '../pix/gfx.js';
import { mm, rotZ, rotY, rotX, add, sub, apply, mul, norm, lerp3 } from '../rig/m3.js';
import { strip, strand, drape } from '../rig/cloth.js';
import { withProps } from '../rig/props.js';

export function heroMaterials(prefix, c) {
  return materials(prefix, {
    skin:   [c.skin, { r: { cool: 15, shift: 0.3, o0: 0.3, o1: 0.45 } }],
    hair:   [c.hair, { strands: 12, spec: 5, specTh: 0.9, edge: true, r: { cool: 330, shift: 0.3, dH: 0.12 } }],
    top:    [c.top, {}],
    sleeve: [c.top, {}],
    pants:  [c.pants, {}],
    shoe:   [c.shoe, { spec: 5, specTh: 0.97 }],
    glove:  [c.glove, {}],
    belt:   [c.belt, { edge: true }],
    buckle: [c.buckle, { spec: 5, specTh: 0.85 }],
    cape:   [c.cape, { edge: true }],
    band:   [c.band, { edge: true }],
    collar: [c.collar ?? c.top, { edge: true }],
  });
}

export const COL_A = { skin: '#f0b48e', hair: '#e8622c', top: '#3f73b8', pants: '#d9c9a3', shoe: '#7a4a2c', glove: '#8c5a33', belt: '#5c3a24', buckle: '#e3b448', cape: '#c73a3f', band: '#2e4f8f', collar: '#f2e7cf' };

export function heroBody(M, extra = {}) {
  return {
    M,
    hipH: 21, waistUp: 5, chestUp: 6.4, neckUp: 3.0, neckFwd: 0.4, headUp: 8.4, headFwd: 0.8,
    pelvisR: [6.0, 4.6, 5.0], bellyR: [6.2, 5.6, 5.0], chestR: [7.4, 5.8, 5.4], chestOff: [0, 0.4, 0],
    neckR: 2.3, torsoK: 4,
    shoulderW: 7.4, shoulderY: 2.6, shoulderZ: -0.4, deltR: 2.9,
    upper: 7.6, fore: 7.0, upperR: 2.35, elbowR: 2.0, wristR: 1.7, cuffAt: 0.5, foreMat: M.sleeve, wristMat: M.hand ?? M.skin, cuffRoll: M.hand != null ? 2.25 : 0,
    palm: [3.0, 3.1, 1.9], fingerR: 0.62, fingerL: 2.8, hangOut: 1.6, hangFwd: 1.0,
    hipW: 3.2, hipDrop: 2.0, thigh: 9.2, shin: 8.8, thighR: 3.0, kneeR: 2.4, ankleR: 2.0, ankleH: 2.2, stance: 3.6, footOut: 9,
    foot: [6.8, 3.9, 3.2], bootTop: 0.55, bootFlare: 0.5,
    skullR: [8.0, 7.9, 7.6], jawR: [6.9, 5.2, 6.1], jawOff: [0, -2.9, 0.9],
    nose: { at: [0, -1.6, 7.5], r: [1.1, 1.2, 1.1] }, ears: { at: [7.7, -0.5, -0.4], r: [1.2, 2.0, 1.3] },
    matPelvis: M.pants, matBelly: M.top,
    ...extra,
  };
}

/** spiky hair: a cap behind the hairline, spikes flung back, a fringe over the forehead */
export function spikyHair(k, M, o = {}) {
  const { S, fig, at, ell, cone } = k, H = S.headF, hc = S.head, g = k.g.head;
  const Hz = H.slice(6, 9), Hy = H.slice(3, 6);
  fig.add(ell(at(H, hc, [0, 0.9, -0.5]), H, [8.5, 8.4, 8.1], {
    g, m: M.hair, k: 0.8, part: 6,
    clip: [[apply(H, [0, -0.25, 1]), at(H, hc, [0, 0, 3.4])], [apply(H, [0, -1, 0.55]), at(H, hc, [0, -1.2, 0])]],
  }));
  const sway = o.sway || [0, 0, 0];
  const spikes = o.spikes || [
    [[0, 5, -4], [0, 10.5, -10], 3.4], [[3.5, 5, -3.5], [6.5, 8.5, -10], 3.0], [[-3.5, 5, -3.5], [-6.5, 8.5, -10], 3.0],
    [[2, 6.5, 0], [4, 12.8, -3.5], 3.0], [[-2, 6.5, 0], [-3.6, 12.6, -3.8], 3.0], [[0, 6.8, 1.5], [0.6, 13.4, 1.0], 2.8],
    [[5.5, 2, -3], [10, 3.5, -8.5], 2.6], [[-5.5, 2, -3], [-10, 3.5, -8.5], 2.6], [[0, 1, -6], [0, 1.5, -13], 2.8],
    [[4, -1, -5], [7.5, -3.5, -10.5], 2.2], [[-4, -1, -5], [-7.5, -3.5, -10.5], 2.2],
  ];
  // secondary motion: the tips lag behind the head's movement (world units), more the longer the spike
  const sw = k.sec && k.sec.sway ? k.sec.sway : [0, 0, 0], vel = k.sec && k.sec.vel ? k.sec.vel : [0, 0, 0];
  const lag = (b, t) => { const L = Math.hypot(t[0] - b[0], t[1] - b[1], t[2] - b[2]) / 10; return [sw[0] * 0.45 * L - vel[0] * 0.012 * L, sw[1] * 0.35 * L, sw[2] * 0.45 * L - vel[2] * 0.012 * L]; };
  for (const [b, t, r] of spikes) fig.add(cone(at(H, hc, b), add(at(H, hc, add(t, sway)), lag(b, t)), r, 0.35, { g, m: M.hair, k: 1.4, part: 6 }));
  // fringe
  const fr = o.fringe || [[[1.8, 7.4, 3.2], [3.6, 3.0, 8.3], 1.7], [[-1.4, 7.6, 3.4], [-2.4, 2.8, 8.4], 1.7], [[0.2, 8, 3.6], [0.8, 3.6, 8.6], 1.5], [[4.8, 5.6, 2.6], [7.4, 3.2, 5.0], 1.6], [[-4.8, 5.6, 2.6], [-7.2, 3.0, 5.0], 1.6]];
  for (const [b, t, r] of fr) fig.add(cone(at(H, hc, b), at(H, hc, t), r, 0.3, { g, m: M.hair, k: 1.1, part: 6 }));
}

const D_PROP = (k) => { if (!k.D.P) withProps(k.D); return true; };
export function makeHeroA(prefix = 'hA', COL = COL_A, o = {}) {
  const { mats, M } = heroMaterials(prefix, COL);
  M.hand = M.glove;
  const FP = ramp(prefix + '.face', ['#26141a', '#5b2a2a', '#ffffff', o.iris || '#3a5d9a', '#b0413e', '#6e1f24', '#e86a78']);
  return {
    id: o.id || 'heroA', name: '刺头', mats, M,
    ...heroBody(M),
    face: { eye: [3.0, 0.3, 7.0], mouth: [0, -4.3, 6.6], eyeW: 2, eyeH: 3, brow: [3.0, 3.2, 7.2], browL: 3, showMouth: true, mouthW: 2,
      pal: { ink: FP[0], lid: FP[1], white: FP[2], iris: FP[3], mouthLine: FP[1], mouthIn: FP[5], tongue: FP[6], brow: FP[0] } },
    hair(k) {
      if (o.hair) return o.hair(k, M);
      spikyHair(k, M);
      const { S, fig, at, ell } = k, H = S.headF, hc = S.head, g = k.g.head;
      // headband high on the forehead, over the hair, knotted at the back with two tails
      const HB = mm(H, rotX(-14));
      fig.add(ell(at(H, hc, [0, 0.9, -0.5]), HB, [9.0, 8.9, 8.7], {
        g, m: M.band, k: 0, part: 7,
        clip: [[apply(HB, [0, 1, 0]), at(H, hc, [0, 7.0, 0])], [apply(HB, [0, -1, 0]), at(H, hc, [0, 5.6, 0])]],
      }));
      const knot = at(H, hc, [0, 3.6, -8.8]);
      fig.add(ell(knot, H, [1.6, 1.3, 1.2], { g, m: M.band, k: 0.4, part: 7 }));
      const down = [0, -1, 0], back = apply(k.S.root, [0, 0, -1]);
      for (const s of [1, -1]) {
        const pts = [knot];
        let p = knot;
        const sw = k.sec && k.sec.sway ? k.sec.sway : [0, 0, 0], vel = k.sec && k.sec.vel ? k.sec.vel : [0, 0, 0];
        const drift = [sw[0] * 0.5 - vel[0] * 0.02, sw[1] * 0.3 + Math.abs(vel[0] + vel[2]) * 0.004, sw[2] * 0.5 - vel[2] * 0.02];
        for (let i = 1; i <= 4; i++) { p = add(p, add(add(mul(down, 2.1), add(mul(back, 1.3 - i * 0.2), apply(k.S.root, [s * (0.9 - i * 0.1), 0, 0]))), mul(drift, 0.25 * i))); pts.push(p); }
        strip(fig, pts, [1.9, 1.8, 1.7, 1.6, 1.3], apply(k.S.root, [0, 0, -1]), { g, m: M.band, thick: 0.6, part: 7 });
      }
    },
    clothes(k) {
      const { S, fig, at, ell, box, cone } = k, C = S.chestF, P = S.pelvisF;
      const g = fig.group('gear', { parent: 'torso', J: S.chest, R: 1, k: 0 });
      // belt with a buckle
      const bc = at(P, S.waist, [0, -1.6, 0]);
      fig.add(ell(bc, P, [6.9, 1.4, 5.9], { g, m: M.belt, k: 0, part: 32 }));
      fig.add(box(at(P, bc, [0, 0, 5.6]), P, [1.3, 1.1, 0.5], 0.3, { g, m: M.buckle, k: 0, part: 33 }));
      // tunic skirt: flares a little over the hips
      fig.add(ell(at(P, S.pelvis, [0, -1.0, 0]), P, [6.8, 5.2, 5.8], { g: k.g.torso, m: M.top, k: 1.5, part: 0, clip: [[apply(P, [0, -1, 0]), at(P, S.pelvis, [0, -4.6, 0])]] }));
      // collar
      fig.add(ell(at(C, S.chest, [0, 4.6, 0]), C, [4.2, 1.4, 3.8], { g, m: M.collar, k: 0.5, part: 34 }));
      // cape: pleated, from the back of the shoulders down to the backs of the knees
      const R = k.S.root, back = apply(R, [0, 0, -1]);
      const flare = k.capeFlare ?? 1;
      const n = 5, top = [], bot = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1;
        top.push(at(C, S.chest, [u * 5.2, 3.9 - Math.abs(u) * 0.8, -5.0 + Math.abs(u) * 1.2]));
        // the hem lags behind the body and streams back with speed (secondary motion from the animation layer)
        const sw = k.sec && k.sec.sway ? k.sec.sway : [0, 0, 0], vel = k.sec && k.sec.vel ? k.sec.vel : [0, 0, 0];
        const sp = Math.hypot(vel[0], vel[2]), stream = [-vel[0] * 0.07, Math.min(3.5, sp * 0.05) + sw[1] * 0.4, -vel[2] * 0.07];
        const hem = [sw[0] * 1.1 + stream[0] * (1 - Math.abs(u) * 0.2), stream[1], sw[2] * 1.1 + stream[2] * (1 - Math.abs(u) * 0.2)];
        bot.push(add(add(at(R, [0, 0, 0], [u * 7.4, 0, 0]), add([0, S.pelvis[1] - 13.5 + Math.abs(u) * 0.8, 0], add(mul(back, 6.2 + flare * 1.2 - Math.abs(u) * 1.2), [S.pelvis[0], 0, S.pelvis[2]]))), hem));
      }
      drape(fig, top, bot, back, { g: fig.group('cape', { parent: 'torso', J: top[2], R: 1, k: 0 }), m: M.cape, thick: 0.9, part: 42, k: 1.4, pleat: 14 });
      // clasps
      for (const s of [1, -1]) fig.add(ell(at(C, S.chest, [s * 5.0, 3.6, 1.8]), C, [1.1, 1.1, 0.8], { g, m: M.buckle, k: 0, part: 33 }));
      // the keeper's shield, slung on his back when he sets out (over the cape)
      if (k.gear && k.gear.backShield && D_PROP(k)) {
        const P2 = k.D.P, sc = at(C, S.chest, [0, -1.5, -7.6]), F = C;
        fig.add(ell(sc, F, [6.4, 6.4, 0.6], { g, m: P2.iron, k: 0, part: 70 }));
        fig.add(ell(at(C, S.chest, [0, -1.5, -8.0]), F, [5.8, 5.8, 0.6], { g, m: P2.shield, k: 0, part: 71 }));
        fig.add(ell(at(C, S.chest, [0, -1.5, -8.6]), F, [1.5, 1.5, 0.8], { g, m: P2.iron, k: 0.2, part: 72 }));
      }
    },
  };
}
export const heroA = makeHeroA();
