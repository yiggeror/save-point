// Hero · option C — "圆帽子": small, round and fearless. A huge feathered cap, a short purple cape, an orange
// tunic, round cheeks, a brown bob. Bounces everywhere.
import { ramp } from '../pix/gfx.js';
import { mm, rotZ, rotY, rotX, add, apply, mul } from '../rig/m3.js';
import { strip, drape } from '../rig/cloth.js';
import { heroMaterials, heroBody } from './heroA.js';

export const COL_C = { skin: '#f2b58e', hair: '#7c4a2c', top: '#e0853a', pants: '#e9dcc0', shoe: '#6a3f2a', glove: '#6a3f2a', belt: '#5c3a24', buckle: '#e3b448', cape: '#6a4aa0', band: '#6a4aa0', collar: '#f4efe4' };

export function makeHeroC(prefix = 'hC', COL = COL_C, o = {}) {
  const { mats, M } = heroMaterials(prefix, COL);
  M.hand = M.glove;
  const FP = ramp(prefix + '.face', ['#26141a', '#5b2a2a', '#ffffff', o.iris || '#6a4a2a', '#b0413e', '#6e1f24', '#e86a78', '#f09a8a']);
  return {
    id: o.id || 'heroC', name: '圆帽子', mats, M,
    ...heroBody(M, {
      hipH: 16.5, waistUp: 4.6, chestUp: 6.0, neckUp: 2.4, headUp: 8.8,
      pelvisR: [6.2, 4.8, 5.4], bellyR: [7.0, 6.2, 6.2], bellyOff: [0, 0, 0.6], chestR: [7.0, 5.4, 5.6],
      shoulderW: 6.8, upper: 6.4, fore: 6.0, upperR: 2.4, elbowR: 2.1, wristR: 1.8, cuffAt: 0.55,
      thigh: 7.0, shin: 6.6, thighR: 3.1, kneeR: 2.5, ankleR: 2.1, stance: 3.4,
      foot: [6.4, 4.0, 3.2], bootTop: 0.5, palm: [2.8, 3.0, 1.9], fingerL: 2.5,
      skullR: [8.8, 8.6, 8.3], jawR: [7.8, 6.2, 6.9], jawOff: [0, -3.0, 1.0],
      nose: { at: [0, -1.4, 8.3], r: [1.1, 1.0, 1.0] }, ears: { at: [8.4, -0.8, -0.4], r: [1.2, 2.0, 1.3] },
    }),
    face: { eye: [3.3, 0.0, 7.6], mouth: [0, -4.4, 7.4], eyeW: 2, eyeH: 3, brow: [3.3, 3.0, 7.9], browL: 2.6, showMouth: true, mouthW: 2, blush: true,
      pal: { ink: FP[0], lid: FP[1], white: FP[2], iris: FP[3], mouthLine: FP[1], mouthIn: FP[5], tongue: FP[6], brow: FP[3], blush: FP[7] } },
    hair(k) {
      if (o.hair) return o.hair(k, M);
      const { S, fig, at, ell, cone, box } = k, H = S.headF, hc = S.head, g = k.g.head;
      // brown bob with a straight fringe
      fig.add(ell(at(H, hc, [0, 0.6, -0.8]), H, [9.3, 8.9, 8.8], { g, m: M.hair, k: 0.8, part: 6,
        clip: [[apply(H, [0, -0.1, 1]), at(H, hc, [0, 0, 4.4])], [apply(H, [0, -1, 0]), at(H, hc, [0, -4.8, 0])]] }));
      fig.add(ell(at(H, hc, [0, 4.4, 4.6]), H, [7.2, 2.2, 3.8], { g, m: M.hair, k: 1.2, part: 6 }));
      // the cap: a wide soft crown and a brim turned up at one side, a long feather
      const cg = fig.group('cap', { parent: 'head', J: at(H, hc, [0, 8, 0]), R: 1, k: 0 });
      const CF = mm(H, rotZ(-8));
      fig.add(ell(at(H, hc, [0.6, 7.4, -0.4]), CF, [9.6, 5.4, 9.2], { g: cg, m: M.cape, k: 1.0, part: 7, clip: [[apply(CF, [0, -1, 0]), at(H, hc, [0, 5.4, 0])]] }));
      fig.add(ell(at(H, hc, [0.2, 5.6, 0.2]), mm(CF, rotX(-6)), [12.6, 1.1, 11.2], { g: cg, m: M.cape, k: 0.8, part: 7 }));
      fig.add(ell(at(H, hc, [0, 6.4, 0]), CF, [9.8, 1.2, 9.4], { g: cg, m: M.band, k: 0, part: 7 }));
      const f0 = at(H, hc, [-6.2, 8.4, -2.4]);
      const feather = [f0, at(H, hc, [-9.0, 12.6, -4.6]), at(H, hc, [-10.8, 16.8, -8.4]), at(H, hc, [-10.4, 19.6, -12.6]), at(H, hc, [-8.6, 20.6, -15.6])];
      strip(fig, feather, [1.0, 3.4, 3.6, 3.0, 1.0], apply(H, [1, 0, 0.3]), { g: cg, m: M.collar, thick: 1.0, part: 44 });
    },
    clothes(k) {
      const { S, fig, at, ell, box, cone } = k, C = S.chestF, P = S.pelvisF;
      const g = fig.group('gear', { parent: 'torso', J: S.chest, R: 1, k: 0 });
      const bc = at(P, S.waist, [0, -1.2, 0.5]);
      fig.add(ell(bc, P, [7.3, 1.3, 6.6], { g, m: M.belt, k: 0, part: 32 }));
      fig.add(box(at(P, bc, [0, 0, 6.4]), P, [1.2, 1.0, 0.5], 0.3, { g, m: M.buckle, k: 0, part: 33 }));
      fig.add(ell(at(C, S.chest, [0, 4.4, 0]), C, [4.4, 1.5, 4.0], { g, m: M.collar, k: 0.5, part: 34 }));
      // short cape to the waist
      const R = k.S.root, back = apply(R, [0, 0, -1]);
      const n = 5, top = [], bot = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1;
        top.push(at(C, S.chest, [u * 5.0, 3.6 - Math.abs(u) * 0.8, -5.2 + Math.abs(u) * 1.4]));
        bot.push(add(at(R, S.pelvis, [u * 7.4, -2.5 + Math.abs(u) * 0.6, 0]), mul(back, 7.8 - Math.abs(u) * 1.4)));
      }
      drape(fig, top, bot, back, { g: fig.group('cape', { parent: 'torso', J: top[2], R: 1, k: 0 }), m: M.cape, thick: 0.9, part: 42, k: 1.4, pleat: 14 });
      for (const s of [1, -1]) fig.add(ell(at(C, S.chest, [s * 4.6, 3.4, 2.4]), C, [1.1, 1.1, 0.8], { g, m: M.buckle, k: 0, part: 33 }));
    },
  };
}
export const heroC = makeHeroC();
