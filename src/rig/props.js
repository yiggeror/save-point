// Hand-held props, built from the same soft shapes as the figures so that fingers really close around them and
// they share the figure's light and outline. Materials are appended to every figure's material table.
import { add, sub, mul, madd, apply, norm, cross, dot, mm, rotX, rotY, rotZ } from './m3.js';
import { cone, ell, box } from './sdf.js';
import { material } from './mat.js';

export const PROP_MATS = {
  wood:    () => material('prop.wood', '#b7844f', { edge: true, r: { cool: 20, shift: 0.3 } }),
  wood2:   () => material('prop.wood2', '#7a5234', { edge: true }),
  steel:   () => material('prop.steel', '#aeb7c4', { spec: 5, specTh: 0.88, r: { cool: 250, warm: 90, dH: 0.18 } }),
  cup:     () => material('prop.cup', '#e9e2d4', { edge: true, spec: 5, specTh: 0.9, r: { cool: 230 } }),
  tea:     () => material('prop.tea', '#b0683a', { edge: true }),
  rag:     () => material('prop.rag', '#9bb0c8', { edge: true }),
  pouch:   () => material('prop.pouch', '#a9743e', { edge: true }),
  gold:    () => material('prop.gold', '#f0c040', { spec: 5, specTh: 0.8, r: { cool: 30, shift: 0.3 } }),
  chalk:   () => material('prop.chalk', '#f4f1ea', {}),
  paper:   () => material('prop.paper', '#efe3c4', { edge: true }),
  pencilR: () => material('prop.pencilR', '#c8423a', { edge: true, r: { cool: 330 } }),
  pencilB: () => material('prop.pencilB', '#3f68c2', { edge: true }),
  lead:    () => material('prop.lead', '#e8d2a8', { edge: true }),
};

/** append prop materials to a figure's material table (once) */
export function withProps(D) {
  if (D.P) return D;
  D.P = {};
  for (const [k, f] of Object.entries(PROP_MATS)) { D.P[k] = D.mats.length; D.mats.push(f()); }
  return D;
}

/**
 * Add a prop held in hand `a` (skeleton arm with .F = [thumb, fingers, back] frame and .palmC).
 * kind: 'sword' | 'cup' | 'rag' | 'pouch' | 'chalk' | 'pencil' (a red-and-blue pencil; o.end 'R'|'B' = which end writes)
 */
export function holdProp(fig, D, a, kind, o = {}) {
  const P = D.P, F = a.F, g = fig.group('prop_' + kind + a.s, null);
  const X = F.slice(0, 3), Y = F.slice(3, 6), Z = F.slice(6, 9);
  // the grip point: inside the curled fingers, toward the palm
  const grip = add(add(a.palmC, mul(Y, D.palm[0] * 0.35)), mul(Z, -D.palm[2] * 0.9));
  if (kind === 'sword') {
    // held in a fist: the blade leaves on the thumb side (X), the pommel on the little-finger side
    const ax = norm(o.dir ? o.dir : X);
    const f = o.flip ? -1 : 1;
    const up = mul(ax, f);
    const p0 = madd(grip, up, -3.6), p1 = madd(grip, up, 2.2);
    fig.add(cone(p0, p1, 0.75, 0.7, { g, m: P.wood2, k: 0, part: 60 }));
    fig.add(ell(madd(grip, up, -3.9), frame(up), [0.95, 0.95, 0.95], { g, m: P.wood2, k: 0.2, part: 60 }));
    const gd = madd(grip, up, 2.6);
    const side = norm(cross(up, Z));
    fig.add(box(gd, [...side, ...up, ...norm(cross(side, up))], [2.6, 0.55, 0.8], 0.35, { g, m: P.wood, k: 0, part: 61 }));
    const len = o.len ?? 13;
    const bc = madd(gd, up, len / 2 + 0.4);
    fig.add(box(bc, [...side, ...up, ...norm(cross(side, up))], [0.95, len / 2, 0.45], 0.4, { g, m: P.wood, k: 0, part: 62 }));
    fig.add(cone(madd(bc, up, len / 2 - 0.3), madd(bc, up, len / 2 + 1.4), 0.9, 0.15, { g, m: P.wood, k: 0.4, part: 62 }));
    return { tip: madd(bc, up, len / 2 + 1.4) };
  }
  if (kind === 'cup') {
    // a small teacup: the handle is pinched between thumb and fingers, the cup stands to the side
    const up = [0, 1, 0];
    const out = norm(sub(mul(X, 1), mul(up, dot(X, up))));
    const c = add(add(a.palmC, mul(out, 2.4)), mul(Z, -0.4));
    const h = 2.3, r = o.r ?? 1.7;
    const tea = cone(add(c, [0, h * 0.45, 0]), add(c, [0, h * 0.5, 0]), r * 0.82, r * 0.82, {});
    fig.add(cone(add(c, [0, -h / 2, 0]), add(c, [0, h / 2, 0]), r * 0.78, r, { g, m: P.cup, k: 0.3, part: 63, sub: [cone(add(c, [0, h * 0.2, 0]), add(c, [0, h, 0]), r * 0.7, r * 0.82, {})] }));
    fig.add(cone(add(c, [0, h * 0.18, 0]), add(c, [0, h * 0.24, 0]), r * 0.72, r * 0.76, { g, m: P.tea, k: 0, part: 64 }));
    return { rim: add(c, [0, h / 2, 0]), c };
  }
  if (kind === 'rag') {
    const c = add(a.palmC, mul(Z, -1.4));
    fig.add(ell(c, mm([...X, ...Y, ...Z], rotZ(20)), [3.2, 2.2, 1.2], { g, m: P.rag, k: 0.4, part: 65 }));
    fig.add(ell(add(c, mul(Y, 2.2)), [...X, ...Y, ...Z], [1.6, 1.8, 0.8], { g, m: P.rag, k: 0.8, part: 65 }));
    return {};
  }
  if (kind === 'pouch') {
    const c = add(grip, mul(Z, -0.6));
    fig.add(ell(add(c, [0, -1.4, 0]), frame([0, 1, 0]), [2.3, 2.2, 2.1], { g, m: P.pouch, k: 0.4, part: 66 }));
    fig.add(cone(add(c, [0, 0.6, 0]), add(c, [0, 1.6, 0]), 0.9, 1.3, { g, m: P.pouch, k: 0.5, part: 66 }));
    return {};
  }
  if (kind === 'pencil') {
    // the writing end's half is its colour (the keeper turns the pencil round between colours)
    const e = norm(add(Y, mul(X, 0.3))), blue = o.end === 'B';
    const a0 = madd(grip, e, -3.4), m = madd(grip, e, 0.4), a1 = madd(grip, e, 2.6), tip = madd(grip, e, 3.4);
    fig.add(cone(a0, m, 0.32, 0.32, { g, m: blue ? P.pencilR : P.pencilB, k: 0, part: 68 }));
    fig.add(cone(m, a1, 0.32, 0.32, { g, m: blue ? P.pencilB : P.pencilR, k: 0, part: 68 }));
    fig.add(cone(a1, tip, 0.3, 0.06, { g, m: P.lead, k: 0, part: 68 }));
    return { tip };
  }
  if (kind === 'chalk') {
    const d = norm(add(Y, mul(X, 0.3)));
    fig.add(cone(madd(grip, d, -0.6), madd(grip, d, 2.6), 0.45, 0.4, { g, m: P.chalk, k: 0, part: 67 }));
    return { tip: madd(grip, d, 2.6) };
  }
  return {};
}

/** a frame with the given up axis */
function frame(up) {
  const y = norm(up); let x = cross(y, [0, 0, 1]); if (Math.hypot(...x) < 1e-3) x = [1, 0, 0]; x = norm(x);
  return [...x, ...y, ...cross(x, y)];
}
