// A humanoid: skeleton from semantic pose controls (+ two-bone IK for arms and legs), then soft body shapes on it.
// Units are pixels at zoom 1. Local space: origin on the floor under the pelvis, +Y up, the body faces +Z at yaw 0
// (toward the camera), +X is the figure's anatomical LEFT. yaw 90 faces screen-right.
import { add, sub, mul, madd, dot, len, norm, cross, lerp3, apply, mm, ypr, rotY, rotX, rotZ, frameUp, clamp, I3 } from './m3.js';
import { Figure, cone, ell, box, sphere } from './sdf.js';
import { holdProp, withProps } from './props.js';

/** two-bone IK: root A, target T, lengths l1 l2, pole point. Returns [joint, end] */
export function ik2(A, T, l1, l2, pole) {
  const d = sub(T, A), dist = len(d) || 1e-6;
  const dc = clamp(dist, Math.abs(l1 - l2) + 0.05, (l1 + l2) * 0.9995);
  const dir = mul(d, 1 / dist);
  const cosA = clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  let pv = sub(pole, A); pv = sub(pv, mul(dir, dot(pv, dir)));
  if (len(pv) < 1e-6) pv = cross(dir, [0, 0, 1]);
  pv = norm(pv);
  const J = add(add(A, mul(dir, l1 * cosA)), mul(pv, l1 * sinA));
  return [J, madd(A, dir, dc)];
}

const P0 = { yaw: 0, hip: [0, 0, 0], pelvis: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], arms: {}, legs: {}, breathe: 0, shrug: [0, 0] };

/**
 * Build the skeleton. D = design proportions, P = pose.
 * P.hip: pelvis offset; P.pelvis / P.spine / P.head: [yaw, pitch, roll] (degrees, relative);
 * P.arms.L|R: { hand:[x,y,z] (local), pole:[x,y,z], wrist:[bend, roll, side], grip: 0..1, spread }
 * P.legs.L|R: { foot:[x,y,z] (ankle, local), yaw, toe (deg), pole }
 */
export function skeleton(D, P) {
  P = { ...P0, ...P };
  const root = rotY(P.yaw);
  const R = (v) => apply(root, v);
  const pelvisF = mm(root, ypr(...P.pelvis));
  const chestF = mm(pelvisF, ypr(...P.spine));
  const headF = mm(chestF, ypr(...P.head));
  const b = Math.sin((P.breathe || 0) * Math.PI * 2) * 0.5 + 0.5;
  const pelvis = add([0, D.hipH, 0], R(P.hip));
  const waist = add(pelvis, apply(pelvisF, [0, D.waistUp, 0]));
  const chest = add(waist, apply(chestF, [0, D.chestUp + b * 0.25, 0]));
  const neck = add(chest, apply(chestF, [0, D.neckUp, D.neckFwd || 0]));
  const head = add(neck, apply(headF, [0, D.headUp, D.headFwd || 0]));
  const S = { root, pelvisF, chestF, headF, pelvis, waist, chest, neck, head, breathe: b, arm: {}, leg: {} };

  for (const [side, s] of [['L', 1], ['R', -1]]) {
    // ---- arm
    const A = P.arms[side] || {};
    const shrug = P.shrug[side === 'L' ? 0 : 1] || 0;
    const sh = add(chest, apply(chestF, [s * D.shoulderW, D.shoulderY + shrug + b * 0.3, D.shoulderZ || 0]));
    const l1 = D.upper, l2 = D.fore;
    let hand = A.hand;
    if (!hand) {                                           // hanging: a pendulum from the shoulder, a little bent
      const hang = add(add(sh, R([s * (D.hangOut ?? 1.2), 0, D.hangFwd ?? 1.2])), [0, -(l1 + l2) * 0.96, 0]);
      hand = add(hang, A.off || [0, 0, 0]);
    }
    const pole = A.pole ? A.pole : add(sh, apply(chestF, [s * 6, -6, -12]));
    const [el, wr] = ik2(sh, hand, l1, l2, pole);
    // hand frame: y = toward the fingertips, z = back of the hand, x = thumb direction
    const fd0 = norm(sub(wr, el));
    const out = apply(chestF, [s, 0, 0]);
    let dors = sub(out, mul(fd0, dot(out, fd0)));
    if (len(dors) < 0.1) dors = apply(chestF, [0, 0, -1]);
    dors = norm(dors);
    const [bend = 0, roll = 0, dev = 0] = A.wrist || [];
    // roll (pronation) around the forearm
    const rr = roll * Math.PI / 180, ax = fd0, c = Math.cos(rr), sn = Math.sin(rr * s);
    dors = norm(add(mul(dors, c), mul(cross(ax, dors), sn)));
    // bend the hand toward the palm (flexion, +) or back (extension, −), and sideways (deviation)
    let thumb = norm(mul(cross(dors, fd0), -s));
    const bb = bend * Math.PI / 180, dd = dev * Math.PI / 180;
    let fd = norm(add(mul(fd0, Math.cos(bb)), mul(dors, -Math.sin(bb))));
    dors = norm(cross(fd, thumb)); if (dot(dors, cross(fd0, thumb)) < 0) dors = mul(dors, -1);
    dors = norm(sub(dors, mul(fd, dot(dors, fd))));
    fd = norm(add(mul(fd, Math.cos(dd)), mul(thumb, Math.sin(dd))));
    thumb = norm(cross(fd, dors)); if (dot(thumb, mul(cross(dors, fd0), -s)) < 0) thumb = mul(thumb, -1);
    S.arm[side] = { s, sh, el, wr, fd, dors, thumb, grip: A.grip ?? 0.25, spread: A.spread ?? 0, point: A.point ?? 0, target: hand, pole };

    // ---- leg
    const Lg = P.legs[side] || {};
    const hipJ = add(pelvis, apply(pelvisF, [s * D.hipW, -D.hipDrop, 0]));
    const ankle = Lg.foot || add([s * (D.stance ?? D.hipW), D.ankleH, 0], [0, 0, 0]);
    const ankleL = Lg.foot ? ankle : R(ankle);
    const kpole = Lg.pole || add(hipJ, apply(pelvisF, [s * 1.5, -D.thigh, 18]));
    const [kn, an] = ik2(hipJ, ankleL, D.thigh, D.shin, kpole);
    const fyaw = (Lg.yaw ?? s * (D.footOut ?? 8)) + P.yaw;
    const footF = mm(rotY(fyaw), rotX(Lg.toe || 0));
    S.leg[side] = { s, hip: hipJ, knee: kn, ankle: an, footF, target: ankleL, pole: kpole, fyaw: fyaw - P.yaw };
  }
  return S;
}

/** helpers for design builders */
export function kit(fig, S) {
  const at = (F, o, v) => add(o, apply(F, v));
  return { fig, S, at, cone, ell, box, sphere, add, sub, mul, madd, norm, lerp3, apply, mm, ypr, rotX, rotY, rotZ, frameUp, cross, dot, len };
}

/**
 * Standard body. D gives proportions and materials:
 *  D.M: material ids { skin, top, sleeve, fore, pants, shoe, … }
 *  D.torso(ctx) / D.head(ctx) / D.hair(ctx) / D.clothes(ctx): optional extra shapes
 */
export function build(D, P) {
  const S = skeleton(D, P);
  const fig = new Figure();
  const ctx = kit(fig, S);
  ctx.D = D;
  ctx.expr = P.face || {};
  ctx.sec = P.sec || {};
  ctx.gear = P.gear || {};           // things worn for a while (the shield on his back when he leaves)              // secondary motion: sway [x,y,z] (world units), lift, from the animation layer
  const M = D.M;
  const gTorso = fig.group('torso');
  const gHead = fig.group('head', { parent: 'torso', J: S.neck, R: D.neckBlendR ?? 5, k: D.neckK ?? 2.5 });
  ctx.g = { torso: gTorso, head: gHead };

  // ---------------- torso: pelvis, belly, chest (one soft volume)
  const mid = frameUp(lerp3(S.pelvisF.slice(3, 6), S.chestF.slice(3, 6), 0.5), lerp3(S.pelvisF.slice(6, 9), S.chestF.slice(6, 9), 0.5));
  const tk = D.torsoK ?? 5;
  fig.add(ell(ctx.at(S.pelvisF, S.pelvis, D.pelvisOff || [0, 0, 0]), S.pelvisF, D.pelvisR, { g: gTorso, m: D.matPelvis ?? M.pants, k: tk, name: 'pelvis' }));
  fig.add(ell(ctx.at(mid, S.waist, D.bellyOff || [0, 0, 0]), mid, D.bellyR, { g: gTorso, m: D.matBelly ?? M.top, k: tk, name: 'belly' }));
  const chestR = [D.chestR[0], D.chestR[1] + S.breathe * 0.2, D.chestR[2] + S.breathe * 0.15];
  fig.add(ell(ctx.at(S.chestF, S.chest, D.chestOff || [0, 0, 0]), S.chestF, chestR, { g: gTorso, m: M.top, k: tk, name: 'chest' }));
  // neck
  fig.add(cone(ctx.at(S.chestF, S.chest, [0, D.chestR[1] * 0.5, 0]), S.neck, D.neckR, D.neckR * 0.95, { g: gTorso, m: D.matNeck ?? M.skin, k: 1.5, name: 'neck' }));
  // shoulders: a soft deltoid that rides up with the arm
  for (const side of ['L', 'R']) {
    const a = S.arm[side];
    const up = clamp(dot(norm(sub(a.el, a.sh)), S.chestF.slice(3, 6)) + 0.2, 0, 1.2);  // arm elevation
    const del = madd(madd(a.sh, S.chestF.slice(3, 6), up * 1.1 - 0.3), norm(sub(a.el, a.sh)), 0.6);
    fig.add(sphere(del, D.deltR + up * 0.4, { g: gTorso, m: M.sleeve, k: 3, name: 'delt' + side }));
  }

  // ---------------- arms (each its own group, melting into the torso only at the shoulder)
  for (const side of ['L', 'R']) {
    const a = S.arm[side];
    const g = fig.group('arm' + side, { parent: 'torso', J: a.sh, R: D.upperR * 3.2, k: D.shoulderK ?? 3.5 });
    const upM = M.sleeve, foM = D.foreMat ?? M.sleeve;
    fig.add(cone(a.sh, a.el, D.upperR, D.elbowR, { g, m: upM, k: 1.2, part: 10, name: 'upper' + side }));
    // forearm: material may change at the cuff
    const cuff = D.cuffAt ?? 1.1;   // 0..1 along the forearm (>1 = sleeve covers all of it)
    if (cuff >= 1) fig.add(cone(a.el, a.wr, D.elbowR, D.wristR, { g, m: foM, k: 1.2, part: 10, name: 'fore' + side }));
    else {
      const c = lerp3(a.el, a.wr, cuff);
      fig.add(cone(a.el, c, D.elbowR, lerp(D.elbowR, D.wristR, cuff), { g, m: foM, k: 1.0, part: 10 }));
      fig.add(cone(c, a.wr, lerp(D.elbowR, D.wristR, cuff), D.wristR, { g, m: D.wristMat ?? M.skin, k: 1.0, part: 10 }));
      if (D.cuffRoll) fig.add(cone(madd(c, sub(a.wr, a.el), -0.06), madd(c, sub(a.wr, a.el), 0.07), D.cuffRoll, D.cuffRoll * 0.95, { g, m: foM, k: 0.6, part: 10 }));
    }
    if (D.sleeveEnd) D.sleeveEnd(ctx, a, g);
    hand(ctx, D, a, g);
  }

  // ---------------- legs
  for (const side of ['L', 'R']) {
    const l = S.leg[side];
    const g = fig.group('leg' + side, { parent: 'torso', J: l.hip, R: D.thighR * 2.6, k: D.hipK ?? 3 });
    fig.add(cone(l.hip, l.knee, D.thighR, D.kneeR, { g, m: M.pants, k: 1.2, part: 20, name: 'thigh' + side }));
    const bootTop = D.bootTop ?? 0;   // 0..1 up the shin where the boot starts
    if (bootTop > 0) {
      const c = lerp3(l.ankle, l.knee, bootTop);
      fig.add(cone(l.knee, c, D.kneeR, lerp(D.ankleR, D.kneeR, bootTop), { g, m: M.pants, k: 1.0, part: 20 }));
      fig.add(cone(c, l.ankle, lerp(D.ankleR, D.kneeR, bootTop) + (D.bootFlare ?? 0.3), D.ankleR + 0.2, { g, m: M.shoe, k: 1.0, part: 20 }));
    } else fig.add(cone(l.knee, l.ankle, D.kneeR, D.ankleR, { g, m: M.pants, k: 1.2, part: 20, name: 'shin' + side }));
    // foot
    const F = l.footF, [fl, fw, fh] = D.foot;
    const fc = ctx.at(F, l.ankle, [0, -D.ankleH * 0.45 + fh * 0.5 - 0.2, fl * 0.3]);
    fig.add(box(fc, F, [fw / 2, fh / 2, fl / 2], Math.min(fw, fh) * 0.45, { g, m: M.shoe, k: 1.2, part: 21, name: 'foot' + side }));
  }

  // ---------------- head
  const H = S.headF, hc = S.head;
  fig.add(ell(hc, H, D.skullR, { g: gHead, m: M.skin, k: 2.5, part: 1, name: 'skull' }));
  if (D.jawR) fig.add(ell(ctx.at(H, hc, D.jawOff), H, D.jawR, { g: gHead, m: M.skin, k: 3, part: 1, name: 'jaw' }));
  if (D.nose) fig.add(ell(ctx.at(H, hc, D.nose.at), H, D.nose.r, { g: gHead, m: M.nose ?? M.skin, k: D.nose.k ?? 0.9, part: 2, name: 'nose' }));
  if (D.ears) for (const s of [1, -1]) {
    const [x, y, z] = D.ears.at;
    fig.add(ell(ctx.at(H, hc, [s * x, y, z]), mm(H, rotY(s * 12)), D.ears.r, { g: gHead, m: M.skin, k: 0.8, part: 3, name: 'ear' }));
  }
  if (D.head) D.head(ctx);
  if (D.hair) D.hair(ctx);
  if (D.clothes) D.clothes(ctx);
  const props = {};
  if (P.props) { withProps(D); for (const pr of P.props) props[pr.kind + pr.hand] = holdProp(fig, D, S.arm[pr.hand], pr.kind, pr); }
  return { fig, S, props };
}
const lerp = (a, b, t) => a + (b - a) * t;

/** a hand: palm, four two-segment fingers and a thumb. At game size the fingers melt into a mitten on their own. */
function hand(ctx, D, a, g) {
  const { fig } = ctx;
  const [pl, pw, pt] = D.palm;                // palm length (along the fingers), width, thickness
  const F = [...a.thumb, ...a.fd, ...a.dors];  // x = thumb side, y = fingers, z = back of hand
  const pc = madd(a.wr, a.fd, pl * 0.5);
  fig.add(box(pc, F, [pw / 2, pl / 2, pt / 2], Math.min(pw, pt) * 0.48, { g, m: D.M.hand ?? D.M.skin, k: 1.0, part: 11, name: 'palm' }));
  const grip = a.grip, fr = D.fingerR ?? pt * 0.32, flen = D.fingerL ?? pl * 0.85;
  const curl1 = grip * 80 + 8, curl2 = grip * 95 + 10;
  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) / 1.5;                // −1 (thumb side) … +1 (little finger)
    const k0 = add(pc, apply(F, [-u * pw * 0.36, pl * 0.45, 0]));
    const spread = (a.spread || 0) * u * 12;
    const lenF = flen * (1 - Math.abs(u + 0.3) * 0.12) * (i === 3 ? 0.8 : 1);
    const pointing = a.point && i === 0;
    const c1 = pointing ? 0 : curl1, c2 = pointing ? 0 : curl2;
    const d1 = apply(F, dirCurl(c1, spread)), d2 = apply(F, dirCurl(c1 + c2, spread));
    const m1 = madd(k0, d1, lenF * 0.55), m2 = madd(m1, d2, lenF * 0.45);
    fig.add(cone(k0, m1, fr, fr * 0.92, { g, m: D.M.hand ?? D.M.skin, k: 0.5, part: 12 }));
    fig.add(cone(m1, m2, fr * 0.92, fr * 0.85, { g, m: D.M.hand ?? D.M.skin, k: 0.4, part: 12 }));
  }
  // thumb: from the base of the palm on the thumb side, opposing toward the fingers as the grip closes
  const tb = add(pc, apply(F, [pw * 0.42, -pl * 0.2, -pt * 0.15]));
  const td1 = norm(apply(F, [0.75 - grip * 0.35, 0.55, -0.35 - grip * 0.3]));
  const t1 = madd(tb, td1, flen * 0.45);
  const td2 = norm(apply(F, [0.35 - grip * 0.7, 0.8, -0.3 - grip * 0.45]));
  const t2 = madd(t1, td2, flen * 0.38);
  fig.add(cone(tb, t1, fr * 1.15, fr, { g, m: D.M.hand ?? D.M.skin, k: 0.7, part: 12 }));
  fig.add(cone(t1, t2, fr, fr * 0.88, { g, m: D.M.hand ?? D.M.skin, k: 0.4, part: 12 }));
  a.palmC = pc; a.F = F;
}
/** direction of a finger segment curled by `c` degrees toward the palm (−z), spread sideways by `s` degrees */
function dirCurl(c, s) {
  const r = c * Math.PI / 180, q = s * Math.PI / 180;
  return [Math.sin(q) * Math.cos(r), Math.cos(q) * Math.cos(r), -Math.sin(r)];
}
