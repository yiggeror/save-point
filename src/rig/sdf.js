// Characters as soft 3D shapes, rendered straight onto the pixel grid.
//
// A figure is a list of primitives (round cones for limbs, ellipsoids, rounded boxes) grouped into body parts.
// Inside a group the primitives melt together (smooth union), and a child group (an arm) melts into its parent (the
// torso) only close to the joint that connects them. So a figure is one continuous volume: no seams at the joints,
// flesh gathers on the inside of a bend and stays round on the outside, while a forearm that crosses the chest
// stays a separate shape in front of it.
//
// Every pixel of the target surface fires one orthographic ray (sphere tracing). The hit gives depth, normal,
// material and part; from those we pick whole ramp steps (toon shading), draw one continuous outline around the
// silhouette plus inner lines only where one part is well in front of another (so the line fades in away from the
// joint, never at it), and clean the edges pixel by pixel.
import { apply, applyT, dot, norm, sub, len, clamp } from './m3.js';
import { bayer, PAL } from '../pix/gfx.js';

// ------------------------------------------------------------------ primitives
const BIG = 1e9;

export function cone(a, b, ra, rb, o = {}) {
  const ba = sub(b, a), l2 = Math.max(1e-6, dot(ba, ba)), rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const ev = (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const yy = pax * ba[0] + pay * ba[1] + paz * ba[2], zz = yy - l2;
    const qx = pax * l2 - ba[0] * yy, qy = pay * l2 - ba[1] * yy, qz = paz * l2 - ba[2] * yy;
    const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return prim(ev, c, Math.sqrt(l2) / 2 + Math.max(ra, rb), o);
}
export const sphere = (c, r, o) => cone(c, [c[0], c[1] + 1e-3, c[2]], r, r, o);

/** ellipsoid: centre c, frame m (rows = local axes), radii r=[rx,ry,rz] */
export function ell(c, m, r, o = {}) {
  const ev = (x, y, z) => {
    const px = x - c[0], py = y - c[1], pz = z - c[2];
    const lx = px * m[0] + py * m[1] + pz * m[2], ly = px * m[3] + py * m[4] + pz * m[5], lz = px * m[6] + py * m[7] + pz * m[8];
    const k0 = Math.hypot(lx / r[0], ly / r[1], lz / r[2]);
    const k1 = Math.hypot(lx / (r[0] * r[0]), ly / (r[1] * r[1]), lz / (r[2] * r[2]));
    return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
  };
  return prim(ev, c, Math.max(...r), o);
}

/** rounded box: centre c, frame m, half extents h, corner radius rr */
export function box(c, m, h, rr = 0, o = {}) {
  const ev = (x, y, z) => {
    const px = x - c[0], py = y - c[1], pz = z - c[2];
    const qx = Math.abs(px * m[0] + py * m[1] + pz * m[2]) - h[0] + rr;
    const qy = Math.abs(px * m[3] + py * m[4] + pz * m[5]) - h[1] + rr;
    const qz = Math.abs(px * m[6] + py * m[7] + pz * m[8]) - h[2] + rr;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - rr;
  };
  return prim(ev, c, Math.hypot(h[0], h[1], h[2]), o);
}

/**
 * o: { g: group, m: material (id or fn(p)→id), part, k: blend radius inside the group,
 *      clip: [[nx,ny,nz], [px,py,pz]]… half-spaces to keep (dot(p - point, n) <= 0) }
 */
function prim(ev0, c, r, o) {
  let ev = ev0;
  if (o.clip) {
    const cl = o.clip.map(([n, q]) => { const nn = norm(n); return [nn, dot(nn, q)]; });
    ev = (x, y, z) => { let d = ev0(x, y, z); for (const [n, q] of cl) d = Math.max(d, x * n[0] + y * n[1] + z * n[2] - q); return d; };
  }
  if (o.sub) {                         // carve other shapes out (e.g. an open mouth, a hollow cup)
    const subs = o.sub;
    const e1 = ev;
    ev = (x, y, z) => { let d = e1(x, y, z); for (const s of subs) d = Math.max(d, -s.ev(x, y, z)); return d; };
  }
  return { ev, c, r, g: o.g ?? 0, m: o.m ?? 0, part: o.part ?? o.g ?? 0, k: o.k ?? 0, name: o.name };
}

const smin = (a, b, k) => {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

// ------------------------------------------------------------------ a figure = primitives + group structure
export class Figure {
  constructor() {
    this.prims = [];
    this.groups = [];   // {name, attach:{parent, J, R, k} | null}
    this.gidx = {};
  }
  group(name, attach = null) {
    if (this.gidx[name] != null) return this.gidx[name];
    this.gidx[name] = this.groups.length;
    this.groups.push({ name, attach: attach ? { ...attach, parent: this.gidx[attach.parent] } : null });
    return this.gidx[name];
  }
  add(p) { this.prims.push(p); return p; }
}

// ------------------------------------------------------------------ camera
export function camera(pitch = 8) {
  const s = Math.sin(pitch * Math.PI / 180), c = Math.cos(pitch * Math.PI / 180);
  return { f: [0, -s, -c], u: [0, c, -s], r: [1, 0, 0], back: [0, s, c] };
}
/** project a local point to local screen coords (x right, y down, in character units) + depth toward camera */
export const project = (cam, p) => [p[0], -(p[1] * cam.u[1] + p[2] * cam.u[2]), p[1] * cam.back[1] + p[2] * cam.back[2]];

// ------------------------------------------------------------------ rendering
/**
 * Render a figure into surface `S`.
 * opt: { x, y: target pixel of the local origin (the floor point), zoom, cam, mats, light, id, flip }
 * mats: material table, index → { ramp:[palette idx…], tones:[levels], th:[thresholds], spec, specTh, edge, line }
 * Returns the raster (for faces and props that must be occluded by the figure).
 */
export function render(S, fig, opt) {
  const zoom = opt.zoom || 1, cam = opt.cam || camera(8), mats = opt.mats;
  const L = norm(opt.light || [-0.55, 0.6, 0.6]);           // key light (from the window: left, above, in front)
  const H = norm([L[0] + cam.back[0], L[1] + cam.back[1], L[2] + cam.back[2]]);
  const prims = fig.prims, groups = fig.groups, NG = groups.length;

  // bounding box on screen
  let x0 = BIG, y0 = BIG, x1 = -BIG, y1 = -BIG;
  const scr = prims.map((p) => {
    const [sx, sy] = project(cam, p.c), rr = p.r + p.k + 1;
    const X = opt.x + sx * zoom, Y = opt.y + sy * zoom, R = rr * zoom;
    x0 = Math.min(x0, X - R); y0 = Math.min(y0, Y - R); x1 = Math.max(x1, X + R); y1 = Math.max(y1, Y + R);
    return [X, Y, R];
  });
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(S.w, Math.ceil(x1)); y1 = Math.min(S.h, Math.ceil(y1));
  const W = Math.max(0, x1 - x0), Hh = Math.max(0, y1 - y0);
  const R = {
    x0, y0, w: W, h: Hh, zoom, cam, opt,
    hit: new Uint8Array(W * Hh), depth: new Float32Array(W * Hh).fill(-BIG),
    mat: new Int16Array(W * Hh).fill(-1), part: new Int16Array(W * Hh).fill(-1), grp: new Int16Array(W * Hh).fill(-1),
    nrm: new Float32Array(W * Hh * 3), lvl: new Int8Array(W * Hh), pos: new Float32Array(W * Hh * 3),
  };
  if (!W || !Hh) return R;

  // tiles of 4×4 px → candidate primitives
  const TS = 4, TW = Math.ceil(W / TS), TH = Math.ceil(Hh / TS);
  const tiles = new Array(TW * TH);
  for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
    const ax = x0 + tx * TS, ay = y0 + ty * TS, bx = ax + TS, by = ay + TS, list = [];
    for (let i = 0; i < prims.length; i++) {
      const [X, Y, Rr] = scr[i];
      const dx = Math.max(ax - X, 0, X - bx), dy = Math.max(ay - Y, 0, Y - by);
      if (dx * dx + dy * dy <= Rr * Rr) list.push(i);
    }
    tiles[ty * TW + tx] = list;
  }
  // extra primitives that must be seen by any tile touched by their attachment zone are covered by the bounds above
  const gd = new Float64Array(NG);
  let cand = null;
  const map = (x, y, z) => {
    gd.fill(BIG);
    for (let j = 0; j < cand.length; j++) {
      const p = prims[cand[j]], d = p.ev(x, y, z);
      gd[p.g] = smin(gd[p.g], d, p.k);
    }
    let d = BIG;
    for (let g = 0; g < NG; g++) {
      const v = gd[g]; if (v >= BIG) continue;
      const at = groups[g].attach;
      if (at && d < BIG) {
        const q = Math.hypot(x - at.J[0], y - at.J[1], z - at.J[2]) / at.R;
        const kk = q < 1 ? at.k * (1 - q) * (1 - q) : 0;
        d = smin(d, v, kk);
      } else d = d < v ? d : v;
    }
    return d;
  };
  // which primitive owns a surface point (closest raw distance)
  const owner = (x, y, z) => {
    let best = BIG, bi = -1;
    for (let j = 0; j < cand.length; j++) { const d = prims[cand[j]].ev(x, y, z); if (d < best) { best = d; bi = cand[j]; } }
    return bi;
  };

  const { f, u, r, back } = cam;
  const DEP = 400;                      // rays start this far in front of the origin (character units)
  const eps = 0.02;
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    cand = tiles[((py / TS) | 0) * TW + ((px / TS) | 0)];
    if (!cand.length) continue;
    const sx = (x0 + px + 0.5 - opt.x) / zoom, sy = (y0 + py + 0.5 - opt.y) / zoom;
    // origin: screen point pushed toward the camera
    const ox = r[0] * sx - u[0] * sy + back[0] * DEP, oy = r[1] * sx - u[1] * sy + back[1] * DEP, oz = r[2] * sx - u[2] * sy + back[2] * DEP;
    let t = DEP - 80, hit = false, x = 0, y = 0, z = 0;
    for (let i = 0; i < 96; i++) {
      x = ox + f[0] * t; y = oy + f[1] * t; z = oz + f[2] * t;
      const d = map(x, y, z);
      if (d < eps) { hit = true; break; }
      t += Math.max(d * 0.85, 0.01);
      if (t > DEP + 80) break;
    }
    if (!hit) continue;
    const k = py * W + px;
    R.hit[k] = 1;
    R.depth[k] = DEP - t;
    R.pos[k * 3] = x; R.pos[k * 3 + 1] = y; R.pos[k * 3 + 2] = z;
    // normal (tetrahedron differences)
    const e = 0.05;
    const a1 = map(x + e, y - e, z - e), a2 = map(x - e, y - e, z + e), a3 = map(x - e, y + e, z - e), a4 = map(x + e, y + e, z + e);
    const n = norm([a1 - a2 - a3 + a4, -a1 - a2 + a3 + a4, -a1 + a2 - a3 + a4]);
    R.nrm[k * 3] = n[0]; R.nrm[k * 3 + 1] = n[1]; R.nrm[k * 3 + 2] = n[2];
    const oi = owner(x, y, z), p = prims[oi];
    R.mat[k] = typeof p.m === 'function' ? p.m([x, y, z]) : p.m;
    R.part[k] = p.part; R.grp[k] = p.g;
    // shading: key light + ambient + a little occlusion in creases
    let occ = 0;
    for (let s = 1; s <= 3; s++) { const h = s * 0.9; occ += (h - map(x + n[0] * h, y + n[1] * h, z + n[2] * h)) / (1 << s); }
    occ = clamp(1 - occ * 0.9, 0, 1);
    const ndl = dot(n, L);
    const M = mats[R.mat[k]] || mats[0];
    let v = (M.amb ?? 0.32) + (M.dif ?? 0.72) * Math.max(0, ndl * 0.85 + 0.15);
    v *= 0.55 + 0.45 * occ;
    // choose a tone (whole ramp step); optional dither band at the thresholds
    const th = M.th || [0.38, 0.62, 0.9];
    const band = M.dither || 0, bx = bayer(x0 + px, y0 + py) - 0.5;
    let tone = 0;
    for (let i = 0; i < th.length; i++) if (v + bx * band > th[i]) tone = i + 1;
    let level = M.tones[Math.min(tone, M.tones.length - 1)];
    if (M.spec != null && dot(n, H) > (M.specTh ?? 0.94) && ndl > 0.2) level = M.spec;
    R.lvl[k] = level;
  }
  finish(S, R, mats, opt);
  return R;
}

// ------------------------------------------------------------------ outlines, cleanup and output
function finish(S, R, mats, opt) {
  const { w: W, h: H, hit } = R;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : hit[y * W + x]);
  // 1. silhouette cleanup: drop pixels hanging on by one side, fill one-pixel notches
  for (let pass = 0; pass < 2; pass++) {
    const rm = [], add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n4 = at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1);
      const k = y * W + x;
      if (hit[k] && n4 <= 1) rm.push(k);
      else if (!hit[k] && n4 >= 3) add.push([k, x, y]);
    }
    for (const k of rm) hit[k] = 0;
    for (const [k, x, y] of add) {        // borrow the owner/shade of the nearest neighbour
      hit[k] = 1;
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([a, b]) => b * W + a).filter((q) => q >= 0 && q < W * H && R.mat[q] >= 0 && hit[q]);
      const q = nb.reduce((m, q) => (R.depth[q] > R.depth[m] ? q : m), nb[0]);
      R.mat[k] = R.mat[q]; R.part[k] = R.part[q]; R.grp[k] = R.grp[q]; R.depth[k] = R.depth[q]; R.lvl[k] = R.lvl[q];
      R.nrm[k * 3] = R.nrm[q * 3]; R.nrm[k * 3 + 1] = R.nrm[q * 3 + 1]; R.nrm[k * 3 + 2] = R.nrm[q * 3 + 2];
    }
  }
  // 2. lines: silhouette, depth steps (front part only), and material edges that ask for a line
  const LINE_DEPTH = (opt.lineDepth ?? 2.2);
  const line = new Uint8Array(W * H);    // 1 = outer, 2 = inner
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!hit[k]) continue;
    let outer = false, inner = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (!at(X, Y)) { outer = true; break; }
      const q = Y * W + X;
      const dz = R.depth[k] - R.depth[q];
      if (dz > LINE_DEPTH && R.grp[k] !== R.grp[q] || dz > LINE_DEPTH * 2.2) inner = true;
      const mk = mats[R.mat[k]], mq = mats[R.mat[q]];
      if (R.mat[k] !== R.mat[q] && mk?.edge && !(mq?.edge && R.depth[q] > R.depth[k] + 0.3) && (mk.edgeWith ? mk.edgeWith.includes(R.mat[q]) : true)) inner = true;
    }
    if (outer) line[k] = 1; else if (inner) line[k] = 2;
  }
  // 3. pixel-perfect: remove the corner pixel of an L in a line (keeps lines one pixel thin)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (line[k] !== 2) continue;
    const L = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && line[Y * W + X] > 0;
    const n = L(x, y - 1), s = L(x, y + 1), e = L(x + 1, y), w = L(x - 1, y);
    if ((n && e && !s && !w && !L(x - 1, y + 1)) || (n && w && !s && !e && !L(x + 1, y + 1)) ||
        (s && e && !n && !w && !L(x - 1, y - 1)) || (s && w && !n && !e && !L(x + 1, y - 1))) line[k] = 0;
  }
  // 4. write to the surface
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x; if (!hit[k]) continue;
    const M = mats[R.mat[k]] || mats[0];
    let lv = R.lvl[k];
    if (line[k]) {
      // selective outline: dark ramp end, one step lighter where the surface is lit (softer against the light)
      const lit = lv >= (M.tones[M.tones.length - 1]);
      lv = line[k] === 1 ? (lit && M.selout !== false ? 1 : 0) : (M.innerLine ?? (lit ? 1 : 0));
    }
    const c = M.ramp[Math.max(0, Math.min(M.ramp.length - 1, lv))];
    const X = R.x0 + x, Y = R.y0 + y;
    if (opt.mask && !opt.mask(X, Y)) continue;
    const pre = S.curId; S.curId = opt.id || 0; S.set(X - S.ox, Y - S.oy, c); S.curId = pre;
  }
  R.line = line;
}

/** is local point p visible (not hidden by the figure itself)? returns [X, Y, visible] in target pixels */
export function probe(R, p, tol = 1.2) {
  const [sx, sy, dz] = project(R.cam, p);
  const X = R.opt.x + sx * R.zoom, Y = R.opt.y + sy * R.zoom;
  const x = Math.floor(X) - R.x0, y = Math.floor(Y) - R.y0;
  if (x < 0 || y < 0 || x >= R.w || y >= R.h) return [X, Y, false, null];
  const k = y * R.w + x;
  const vis = R.hit[k] && Math.abs(R.depth[k] - dz) < tol;
  return [X, Y, !!vis, k];
}
