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
  }
  Object.assign(P, o.extra || {});
  return P;
}
