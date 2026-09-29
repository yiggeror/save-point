// Cloth and strands made of soft segments: capes, scarves, apron ties, headband tails, hair locks.
// A strip is a centre polyline with a width at each point and a facing (normal) direction; each segment is a thin
// rounded box and neighbours melt together, so a strip reads as one piece of cloth.
import { add, sub, mul, norm, cross, dot, len, lerp3 } from './m3.js';
import { box, cone } from './sdf.js';

export function strip(fig, pts, widths, normal, o = {}) {
  const t = o.thick ?? 0.7;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], d = sub(b, a), L = len(d) || 1e-3;
    const y = mul(d, 1 / L);
    const nrm = typeof normal === 'function' ? normal(i) : normal;
    let z = sub(nrm, mul(y, dot(nrm, y))); z = norm(len(z) < 1e-4 ? cross(y, [1, 0, 0]) : z);
    const x = cross(y, z);
    const w = (widths[i] + widths[i + 1]) / 2;
    const m = [...x, ...y, ...z];
    fig.add(box(lerp3(a, b, 0.5), m, [w / 2, L / 2 + (o.overlap ?? 0.35), t / 2], Math.min(t / 2, o.round ?? 0.45), { g: o.g, m: o.m, k: o.k ?? 1.2, part: o.part ?? 40 }));
  }
}

/** a round strand (hair lock, tie, tail): cones along a polyline with a radius at each point */
export function strand(fig, pts, radii, o = {}) {
  for (let i = 0; i + 1 < pts.length; i++)
    fig.add(cone(pts[i], pts[i + 1], radii[i], radii[i + 1], { g: o.g, m: o.m, k: o.k ?? 0.6, part: o.part ?? 41 }));
}

/**
 * Verlet chain for secondary motion (hair, ties, capes): follows its anchor a little late, swings, settles.
 * n points, segment length seg. step(anchor, dt, gravity, wind) advances; rest(anchor, dir) initialises.
 */
export class Chain {
  constructor(n, seg, o = {}) {
    this.n = n; this.seg = seg; this.damp = o.damp ?? 0.9; this.stiff = o.stiff ?? 0.15;
    this.p = []; this.q = [];
  }
  rest(anchor, dir) {
    const d = norm(dir);
    this.p = Array.from({ length: this.n }, (_, i) => add(anchor, mul(d, i * this.seg)));
    this.q = this.p.map((v) => v.slice());
  }
  /** rest shape: bias[i] (a direction per link) says where each link wants to point, stiff pulls toward it */
  step(anchor, dt, g = [0, -60, 0], bias = null, collide = null) {
    const { p, q } = this;
    p[0] = anchor.slice(); q[0] = anchor.slice();
    for (let i = 1; i < this.n; i++) {
      const v = mul(sub(p[i], q[i]), this.damp);
      q[i] = p[i];
      p[i] = add(add(p[i], v), mul(g, dt * dt));
    }
    for (let it = 0; it < 6; it++) {
      for (let i = 1; i < this.n; i++) {
        if (bias) {
          const want = add(p[i - 1], mul(norm(bias[i - 1]), this.seg));
          p[i] = add(p[i], mul(sub(want, p[i]), this.stiff));
        }
        const d = sub(p[i], p[i - 1]), L = len(d) || 1e-6;
        p[i] = add(p[i - 1], mul(d, this.seg / L));
        if (collide) p[i] = collide(p[i], i);
      }
    }
    return p;
  }
}

/**
 * A pleated drape (cape, apron skirt, curtain): vertical panels from top[i] to bot[i], alternately turned a little
 * about their long axis so the cloth shows soft folds. back: the direction the outside of the cloth faces.
 */
export function drape(fig, top, bot, back, o = {}) {
  const n = top.length, t = o.thick ?? 0.8, pleat = (o.pleat ?? 16) * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const a = top[i], b = bot[i], d = sub(b, a), L = len(d) || 1e-3, y = mul(d, 1 / L);
    let z = sub(back, mul(y, dot(back, y))); z = norm(z);
    let x = cross(y, z);
    const ang = (i % 2 ? 1 : -1) * pleat;
    const z2 = norm(add(mul(z, Math.cos(ang)), mul(x, Math.sin(ang)))); x = cross(y, z2);
    const wTop = i + 1 < n ? len(sub(top[i + 1], top[i])) : len(sub(top[i], top[i - 1]));
    const wBot = i + 1 < n ? len(sub(bot[i + 1], bot[i])) : len(sub(bot[i], bot[i - 1]));
    const w = (wTop + wBot) / 2 * (o.widen ?? 1.15);
    fig.add(box(lerp3(a, b, 0.5), [...x, ...y, ...z2], [w / 2, L / 2, t / 2], Math.min(t / 2, 0.4), { g: o.g, m: o.m, k: o.k ?? 1.3, part: o.part ?? 42 }));
  }
}
