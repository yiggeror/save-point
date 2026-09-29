// Poses as semantic controls. Positions are in the figure's root frame (x = its left, y up, z = its front) and
// turned by the yaw, so a pose reads the same from any angle.
import { rotY, apply, add } from './m3.js';

export function shoulderY(D) { return D.hipH + D.waistUp + D.chestUp + D.shoulderY; }

export function pose(D, name, o = {}) {
  const yaw = o.yaw ?? 0, R = rotY(yaw), r = (v) => apply(R, v);
  const shY = shoulderY(D), reach = D.upper + D.fore;
  const P = { yaw, face: o.face || {}, breathe: o.breathe ?? 0.3 };
  const foot = (s, x = 0, z = 0) => r([s * (D.stance ?? D.hipW) + x, D.ankleH, z]);
  switch (name) {
    case 'stand':
      P.head = [0, 0, o.tilt ?? 0];
      P.arms = { L: { off: r([0.3, 0, 0.4]) }, R: { off: r([-0.3, 0, 0.4]) } };
      break;
    case 'npcWipe': {   // behind the counter: leaning in, the rag hand flat on the counter top
      const top = o.counter ?? D.hipH + D.waistUp + 1;
      const k = o.phase ?? 0;          // 0 / 1: the two frames of the NPC loop
      P.spine = [0, 12, 0]; P.head = [0, 6, 0]; P.hip = r([0, -0.6, -1]);
      P.arms = {
        R: { hand: r([-3 - k * 4.5, top + 1.2, reach * 0.62]), grip: 0.2, wrist: [55, 0, 0], pole: r([-12, top - 4, -4]) },
        L: { hand: r([6.5, top + 0.8, reach * 0.48]), grip: 0.1, wrist: [60, 10, 0], pole: r([12, top - 4, -4]) },
      };
      P.props = [{ hand: 'R', kind: 'rag' }];
      break;
    }
    case 'point': {     // points up and to its right (at the shield on the wall), looking there
      P.spine = [-8, -2, 0]; P.head = [-24, -12, 0];
      P.arms = {
        R: { hand: r([-shY * 0.1 - reach * 0.78, shY + reach * 0.42, reach * 0.3]), grip: 0.85, point: 1, wrist: [0, 70, 0] },
        L: { hand: r([5, D.hipH + D.waistUp + 1, reach * 0.45]), grip: 0.1, wrist: [60, 10, 0] },
      };
      break;
    }
    case 'offerCup': {  // holds the teacup out with both hands
      const y = shY - reach * 0.35;
      P.spine = [0, 10, 0]; P.head = [0, 10, 0];
      P.arms = {
        R: { hand: r([-1.8, y, reach * 0.8]), grip: 0.55, wrist: [10, 60, 0] },
        L: { hand: r([2.4, y - 1.8, reach * 0.74]), grip: 0.2, wrist: [70, -40, 0] },
      };
      P.props = [{ hand: 'R', kind: 'cup' }];
      break;
    }
    case 'heroPose': {  // the wooden sword up high, the other fist on the hip, chest out
      P.spine = [8, -7, 3]; P.head = [6, -12, -4]; P.hip = r([0, -0.4, 0]); P.pelvis = [0, 0, -3];
      P.arms = {
        R: { hand: r([-D.shoulderW - 4.5, shY + reach * 0.74, 2.0]), grip: 0.95, wrist: [0, -20, 0], pole: r([-18, shY - 2, -2]) },
        L: { hand: r([D.hipW + 4.6, D.hipH + 2.6, 1.2]), grip: 1, wrist: [40, 90, 0], pole: r([16, shY - 2, -8]) },
      };
      P.legs = { L: { foot: foot(1, 1.8, 2.6) }, R: { foot: foot(-1, -2.2, -2.4) } };
      P.props = [{ hand: 'R', kind: 'sword', dir: [0, 1, 0] }];
      P.face = { happy: 1, mouth: { grin: 1, w: 3 }, ...(o.face || {}) };
      break;
    }
    case 'slap': {      // all fifty coins, smack, on the counter
      const top = o.counter ?? D.hipH + D.waistUp + 1;
      P.spine = [4, 16, 0]; P.head = [0, -6, 0];
      P.arms = {
        R: { hand: r([-2.5, top + 1, reach * 0.7]), grip: 0.05, wrist: [80, 0, 0] },
        L: { hand: r([D.hipW + 4, D.hipH + 3, 0.8]), grip: 1, wrist: [40, 90, 0], pole: r([16, shY - 2, -8]) },
      };
      P.face = { eyes: 'closed', mouth: { open: 0.8, curve: 1, w: 3 } };
      break;
    }
    case 'sit': {       // sitting on the bench, tired
      const seat = o.seat ?? D.ankleH + D.shin * 0.92;
      P.hip = r([0, seat + D.pelvisR[1] * 0.55 - D.hipH, -D.thigh * 0.4]);
      P.pelvis = [0, -12, 0]; P.spine = [0, 26, 0]; P.head = [8, 14, 3];
      const kz = D.thigh * 0.55;
      P.legs = { L: { foot: foot(1, 0.8, kz + 1.6), pole: r([6, seat + 6, 30]) }, R: { foot: foot(-1, -0.8, kz + 0.6), pole: r([-6, seat + 6, 30]) } };
      P.arms = {
        R: { hand: r([-D.hipW - 1.5, seat + 3.6, kz + 1.6]), grip: 0.3, wrist: [30, 0, 0] },
        L: { hand: r([D.hipW + 1.2, seat + 3.2, kz + 2.4]), grip: 0.3, wrist: [30, 0, 0] },
      };
      P.face = { eyes: 'half', mouth: { open: 0.5, w: 2 } };
      break;
    }
    case 'wave': {
      P.spine = [6, -3, -3]; P.head = [10, -4, 6];
      P.arms = {
        R: { hand: r([-reach * 0.55, shY + reach * 0.62, 3]), grip: 0.05, spread: 1, wrist: [-10, 90, 0], pole: r([-18, shY - 6, -4]) },
        L: { off: r([0.4, 0, 0.6]) },
      };
      P.face = { happy: 1, mouth: { grin: 1, w: 3 } };
      break;
    }
    case 'walk': {      // phase 0..1 per two steps; feet stay planted: each stance foot moves back exactly one stride
      const ph = o.phase ?? 0, L = o.stride ?? D.thigh * 0.9, lift = o.lift ?? 2.2, bob = o.bob ?? 0.8, st = (D.stance ?? D.hipW) * 0.8;
      const ft = (sd, q) => {
        q = ((q % 1) + 1) % 1;
        if (q < 0.5) return r([sd * st, D.ankleH, L / 2 - (q / 0.5) * L]);
        const u = (q - 0.5) / 0.5;
        return r([sd * st, D.ankleH + Math.sin(Math.PI * u) * lift, -L / 2 + u * L]);
      };
      P.legs = { L: { foot: ft(1, ph) }, R: { foot: ft(-1, ph + 0.5) } };
      P.hip = r([0, -bob * (0.5 + 0.5 * Math.cos(4 * Math.PI * ph)) + (o.bounce ?? 0) * Math.abs(Math.sin(2 * Math.PI * ph)), 0]);
      P.spine = [-Math.sin(2 * Math.PI * ph) * 6, o.lean ?? 5, 0]; P.pelvis = [Math.sin(2 * Math.PI * ph) * 5, 0, 0];
      P.head = [Math.sin(2 * Math.PI * ph) * 3, o.headPitch ?? -2, 0];
      const sw = o.swing ?? 3.2;
      if (!o.arms) P.arms = {
        L: { hand: r([D.shoulderW + 1.6, shY - reach * 0.92, 1.2 - sw * Math.sin(2 * Math.PI * ph)]), grip: 0.35 },
        R: { hand: r([-D.shoulderW - 1.6, shY - reach * 0.92, 1.2 + sw * Math.sin(2 * Math.PI * ph)]), grip: 0.35 },
      };
      break;
    }
    case 'proud': {     // hands on hips, chest out, chin up
      P.spine = [0, -6, 0]; P.head = [o.look ?? 0, -8, 0];
      P.arms = {
        L: { hand: r([D.hipW + 4.2, D.hipH + 2.6, 1.0]), grip: 1, wrist: [40, 90, 0], pole: r([16, shY - 2, -8]) },
        R: { hand: r([-D.hipW - 4.2, D.hipH + 2.6, 1.0]), grip: 1, wrist: [40, 90, 0], pole: r([-16, shY - 2, -8]) },
      };
      P.legs = { L: { foot: foot(1, 1.2, 0.5) }, R: { foot: foot(-1, -1.2, -0.5) } };
      break;
    }
    case 'hop': {       // mid-air: knees up, arms up
      P.hip = r([0, o.air ?? 4, 0]); P.spine = [0, -4, 0]; P.head = [0, -6, 0];
      P.legs = { L: { foot: r([D.hipW, D.ankleH + (o.air ?? 4) + 3, 2]) }, R: { foot: r([-D.hipW, D.ankleH + (o.air ?? 4) + 1.5, -1]) } };
      P.arms = { L: { hand: r([D.shoulderW + 4, shY + 3, 2]), grip: 0.3 }, R: { hand: r([-D.shoulderW - 4, shY + 3, 2]), grip: 0.3 } };
      break;
    }
    case 'offer': {     // hands something across the counter to its left (screen-left when facing us)
      const top = o.counter ?? 22;
      P.spine = [16, 8, 0]; P.head = [18, 4, 0];
      P.arms = {
        L: { hand: r([D.shoulderW + reach * 0.62, top + 5, reach * 0.55]), grip: 0.85, wrist: [0, 20, 0] },
        R: { hand: r([-3, top + 1, reach * 0.5]), grip: 0.1, wrist: [60, 0, 0] },
      };
      break;
    }
    case 'armsCrossed': {
      P.spine = [0, -3, 0]; P.head = [o.look ?? 0, o.nod ?? 0, 0];
      P.arms = {
        L: { hand: r([-2.5, shY - 5.5, 5.0]), grip: 0.6, wrist: [30, 70, 0], pole: r([14, shY - 8, 2]) },
        R: { hand: r([2.5, shY - 6.5, 5.6]), grip: 0.6, wrist: [30, 70, 0], pole: r([-14, shY - 8, 2]) },
      };
      if (o.tap) P.legs = { L: { foot: r([(D.stance ?? D.hipW), D.ankleH + (o.tap > 0.5 ? 1.2 : 0), 1.5]) } };
      break;
    }
    case 'headDown': {  // forehead on the counter, arms flat
      const top = o.counter ?? 22;
      P.spine = [0, 34, 0]; P.head = [0, 26, 0]; P.hip = r([0, -1, -2]);
      P.arms = { L: { hand: r([5, top + 1, reach * 0.6]), grip: 0.1, wrist: [80, 0, 0] }, R: { hand: r([-5, top + 1, reach * 0.6]), grip: 0.1, wrist: [80, 0, 0] } };
      break;
    }
    case 'shrug': {
      P.spine = [0, -2, 0]; P.head = [0, -2, 12]; P.shrug = [2.2, 2.2];
      P.arms = { L: { hand: r([D.shoulderW + 5, shY - 3, 5]), grip: 0, wrist: [-40, -60, 0] }, R: { hand: r([-D.shoulderW - 5, shY - 3, 5]), grip: 0, wrist: [-40, -60, 0] } };
      break;
    }
    case 'salute': {
      P.spine = [0, -4, 0]; P.head = [0, -4, 0];
      P.arms = { R: { hand: r([-3.2, shY + 9, 4.5]), grip: 0, wrist: [0, 60, 0], pole: r([-16, shY, 2]) }, L: { off: r([0.3, 0, 0.4]) } };
      break;
    }
    case 'carry': {     // both hands carry something in front (the cup; the horn)
      P.spine = [0, o.lean ?? 4, 0]; P.head = [0, o.headPitch ?? 12, 0];
      P.arms = {
        R: { hand: r([-1.2, shY - reach * 0.45, reach * 0.62]), grip: 0.55, wrist: [10, 60, 0] },
        L: { hand: r([2.0, shY - reach * 0.55, reach * 0.55]), grip: 0.2, wrist: [70, -40, 0] },
      };
      if (o.phase != null) {
        const w = pose(D, 'walk', { ...o, arms: true });
        P.legs = w.legs; P.hip = w.hip; P.pelvis = w.pelvis;
      }
      break;
    }
    case 'drink': {     // the cup up to the mouth, head tipped back
      P.spine = [0, -6, 0]; P.head = [0, -22, 0];
      P.arms = { R: { hand: r([-1.5, shY + 3.5, 6.5]), grip: 0.55, wrist: [10, 60, 0] }, L: { hand: r([2, shY - 4, 5.5]), grip: 0.3 } };
      break;
    }
    case 'fan': {       // too hot: tongue out, fanning the mouth
      const k = o.phase ?? 0;
      P.spine = [0, 6, 0]; P.head = [0, -4, (k > 0.5 ? 6 : -6)];
      P.arms = { R: { hand: r([-1.5, shY + 1.5 + k * 2, 7.5]), grip: 0, spread: 1, wrist: [0, 80, 0] }, L: { hand: r([3, shY - reach * 0.55, reach * 0.5]), grip: 0.55, wrist: [10, 60, 0] } };
      break;
    }
    case 'push': {      // pushing things across the counter with both hands, not looking up
      const top = o.counter ?? 22;
      P.spine = [0, 22, 0]; P.head = [0, 18, 0];
      P.arms = { L: { hand: r([4, top + 1.2, reach * 0.85]), grip: 0.2, wrist: [70, 0, 0] }, R: { hand: r([-4, top + 1.2, reach * 0.85]), grip: 0.2, wrist: [70, 0, 0] } };
      break;
    }
    case 'reach': {     // one arm up high (hanging the horn on its hook, taking the shield off the wall)
      P.spine = [0, -8, 0]; P.head = [0, -24, 0];
      P.arms = { L: { hand: r([2, shY + reach * 0.85, 4]), grip: 0.7 }, R: { hand: r([-2, shY + reach * 0.8, 4]), grip: 0.7 } };
      break;
    }
    case 'bump': {      // bounced back off the invisible wall
      P.spine = [0, -14, -6]; P.head = [0, -16, 8]; P.hip = r([0, -1.5, -2]);
      P.arms = { L: { hand: r([D.shoulderW + 6, shY + 2, 3]), grip: 0, spread: 1 }, R: { hand: r([-D.shoulderW - 6, shY + 2, 3]), grip: 0, spread: 1 } };
      P.legs = { L: { foot: foot(1, 1, 3) }, R: { foot: foot(-1, -1, -1) } };
      break;
    }
  }
  if (o.head) P.head = o.head;
  if (o.props) P.props = [...(P.props || []), ...o.props];
  Object.assign(P, o.extra || {});
  return P;
}
