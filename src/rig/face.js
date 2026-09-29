// Faces: eyes, glasses and mouth drawn as pixel shapes on top of the rendered head, anchored to points on the
// head in 3D (so they turn, foreshorten and hide with it), and occluded by anything in front of the face.
// The same code draws them at every detail level: at game size an eye is one or two pixels, in a close-up it has
// a lid, an iris and a highlight.
import { add, sub, mul, apply, dot, norm } from './m3.js';
import { project } from './sdf.js';

/** per-pixel drawing guard: only on the given parts, only if nothing is in front of depth z */
function guard(R, parts, z, tol = 1.5) {
  return (X, Y) => {
    const x = X - R.x0, y = Y - R.y0;
    if (x < 0 || y < 0 || x >= R.w || y >= R.h) return false;
    const k = y * R.w + x;
    if (!R.hit[k]) return false;
    if (parts && !parts.includes(R.part[k])) return false;
    return R.depth[k] <= z + tol;
  };
}
const toScreen = (R, p) => { const [sx, sy, dz] = project(R.cam, p); return [R.opt.x + sx * R.zoom, R.opt.y + sy * R.zoom, dz]; };

/** fill an ellipse given by centre c and two screen axes (a, b): pixels whose centre maps inside */
function ellipseAxes(c, a, b, fn, ringFn) {
  const ext = Math.ceil(Math.max(Math.hypot(a[0], a[1]), Math.hypot(b[0], b[1]))) + 1;
  const det = a[0] * b[1] - a[1] * b[0];
  if (Math.abs(det) < 1e-6) return;
  const ins = (x, y) => {
    const px = x + 0.5 - c[0], py = y + 0.5 - c[1];
    const u = (px * b[1] - py * b[0]) / det, v = (a[0] * py - a[1] * px) / det;
    return u * u + v * v <= 1;
  };
  for (let y = Math.floor(c[1] - ext); y <= Math.ceil(c[1] + ext); y++)
    for (let x = Math.floor(c[0] - ext); x <= Math.ceil(c[0] + ext); x++) {
      if (!ins(x, y)) continue;
      const edge = !ins(x + 1, y) || !ins(x - 1, y) || !ins(x, y + 1) || !ins(x, y - 1);
      if (fn) fn(x, y, edge);
      if (edge && ringFn) ringFn(x, y);
    }
}

/**
 * Draw the face.
 * D.face: { eye:[x,y,z] (left eye, head space; the right one is mirrored), mouth:[x,y,z], eyeW, eyeH, glasses,
 *           ink, white, iris, lip, mouthIn, tongue, glassRim, glassGlint, lash }
 * E (expression): { open (0..1.3), look:[x,y] (−1..1), happy (^ eyes), squint, mouth:{ w, open, curve, tongue } }
 */
export function drawFace(S, R, rig, D, E = {}) {
  const F = D.face, H = rig.S.headF, hc = rig.S.head, z = R.zoom;
  const pal = F.pal;
  const Hx = H.slice(0, 3), Hy = H.slice(3, 6), Hz = H.slice(6, 9);
  const facing = dot(Hz, R.cam.back);          // 1 = looking at us, 0 = profile, <0 = away
  const eyes = [];
  for (const s of [1, -1]) {
    const [ex, ey, ez] = F.eye;
    const p = add(hc, apply(H, [s * ex, ey, ez]));
    const n = norm(apply(H, [s * 0.45, 0.1, 1]));       // eye surface normal
    const vis = dot(n, R.cam.back);
    if (vis < 0.12) continue;
    const [X, Y, dz] = toScreen(R, p);
    // foreshortened width of the eye: its horizontal axis along the head's x
    const ax = mul(apply(H, [1, 0, 0]), 1), ay = mul(apply(H, [0, 1, 0]), 1);
    const [ax0, ay0] = [ax[0], -(ax[1] * R.cam.u[1] + ax[2] * R.cam.u[2])];
    const [bx0, by0] = [ay[0], -(ay[1] * R.cam.u[1] + ay[2] * R.cam.u[2])];
    eyes.push({ s, X, Y, dz, vis, a: [ax0, ay0], b: [bx0, by0] });
  }
  const put =(x, y, c, zRef) => { if (c == null) return; if (guardAt(R, x, y, F.parts || [1], zRef, F.tol ?? 1.6)) S.set(x - S.ox, y - S.oy, c); };

  // ---------------------------------------------------------------- eyes
  const open = E.open ?? 1, look = E.look || [0, 0];
  for (const e of eyes) {
    const w = (F.eyeW ?? 1) * z, h = (F.eyeH ?? 2) * z * Math.min(1.35, open);
    const fx = Math.max(0.35, Math.min(1, e.vis * 1.1));
    // centre, snapped: keep the pair symmetric at game size
    let cx = e.X + look[0] * z * 0.6, cy = e.Y + look[1] * z * 0.5;
    const style = E.eyes || (open < 0.25 ? 'closed' : E.happy ? 'happy' : 'open');
    if (z <= 1.01) {
      // game size: hand-placed pixels
      const x0 = Math.round(cx - 0.5 * (F.eyeW ?? 1)), y0 = Math.round(cy - (F.eyeH ?? 2) / 2);
      const ink = pal.ink;
      if (style === 'closed' || style === 'happy') {
        const W = Math.max(1, Math.round((F.eyeW ?? 1) + 1));
        for (let i = 0; i < W; i++) put(x0 + i - (e.s < 0 ? 1 : 0) * 0, y0 + (F.eyeH ?? 2) - 1 - (style === 'happy' && (i === 0 || i === W - 1) ? 0 : style === 'happy' ? 1 : 0), ink, e.dz);
      } else if (style === 'wide') {
        for (let j = 0; j < (F.eyeH ?? 2) + 1; j++) for (let i = 0; i < Math.max(1, F.eyeW ?? 1); i++) put(x0 + i, y0 + j - 1, ink, e.dz);
        if (pal.white != null) put(x0 + (e.s > 0 ? 1 : -1) * 0, y0 - 1, pal.white, e.dz);
      } else if (style === 'half') {
        for (let i = 0; i < Math.max(2, F.eyeW ?? 1); i++) put(x0 + i - (F.eyeW ?? 1 ? 0 : 1), y0 + (F.eyeH ?? 2) - 1, ink, e.dz);
        if (pal.lid != null) for (let i = 0; i < Math.max(2, F.eyeW ?? 1); i++) put(x0 + i, y0 + (F.eyeH ?? 2) - 2, pal.lid, e.dz);
      } else {
        for (let j = 0; j < (F.eyeH ?? 2); j++) for (let i = 0; i < (F.eyeW ?? 1); i++) put(x0 + i, y0 + j, ink, e.dz);
        if (pal.white != null && (F.eyeW ?? 1) >= 2) put(x0 + (e.s > 0 ? 0 : (F.eyeW ?? 1) - 1), y0, pal.white, e.dz);
      }
      continue;
    }
    // close-up: shaped eyes
    const bl = Math.hypot(e.b[0], e.b[1]) || 1, bu = [e.b[0] / bl, e.b[1] / bl];
    const B = sc2(bu, h * 0.5), A = sc2([-bu[1], bu[0]], w * 0.5 * fx);
    if (style === 'closed' || style === 'happy') {
      const n = Math.max(2, Math.round(w * fx));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n * 2 - 1;
        const dy = (style === 'happy' ? -1 : 1) * (1 - u * u) * z * 0.6;
        put(Math.round(cx - w * fx / 2 + i), Math.round(cy + dy), pal.ink, e.dz);
        if (z >= 3) put(Math.round(cx - w * fx / 2 + i), Math.round(cy + dy) + 1, pal.ink, e.dz);
      }
      continue;
    }
    const wide = style === 'wide', half = style === 'half';
    const A2 = wide ? sc2(A, 1.45) : A, B2 = wide ? sc2(B, 1.3) : B;
    const cutY = half ? cy - Math.abs(B2[1]) * 0.1 : -1e9;          // half-lidded: everything above this is lid
    ellipseAxes([cx, cy], A2, B2, (x, y, edge) => { if (y + 0.5 >= cutY) put(x, y, pal.ink, e.dz); });
    if (pal.iris != null && w >= 3) ellipseAxes([cx, cy + z * 0.2], sc2(A2, wide ? 0.45 : 0.62), sc2(B2, wide ? 0.45 : 0.62), (x, y) => { if (y + 0.5 >= cutY + 1) put(x, y, pal.iris, e.dz); });
    if (half) {   // the heavy upper lid: a flat line across the top of the eye
      const hw = Math.max(Math.abs(A2[0]), 1) + 0.5;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw) - 1; x++) put(x, Math.round(cutY) - 1, pal.ink, e.dz);
    }
    if (wide && pal.white != null && w < 3) {   // bead eyes: a bright catch light when they pop open
      put(Math.round(cx - 0.5), Math.round(cy - Math.abs(B2[1]) * 0.5), pal.white, e.dz);
    }
    if (pal.white != null && w >= 2 && !half) {
      const hx = Math.round(cx - w * fx * 0.18 * e.s - 0.3), hy = Math.round(cy - h * (wide ? 0.3 : 0.22));
      put(hx, hy, pal.white, e.dz);
      if (z >= 3) { put(hx + 1, hy, pal.white, e.dz); put(hx, hy + 1, pal.white, e.dz); }
    }
    // upper lid line for heavy / sleepy eyes
    if ((E.lid ?? 0) > 0) {
      const cut = cy - h / 2 + h * E.lid;
      for (let y = Math.floor(cy - h / 2 - 1); y < cut; y++) for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++)
        if (guardAt(R, x, y, F.parts || [1], e.dz, F.tol ?? 1.6) && S.get(x - S.ox, y - S.oy) === pal.ink) S.set(x - S.ox, y - S.oy, pal.lid ?? pal.ink);
    }
  }

  // ---------------------------------------------------------------- lines on the skin (wrinkles, creases): close-ups only
  if (F.lines && z >= 2) {
    const skinR = D.mats[D.M.skin].ramp, sk = D.skullR;
    for (const ln of F.lines) {
      if (z < (ln.minZoom ?? 2)) continue;
      const col = skinR[ln.lv ?? 2];
      for (const s of ln.mirror === false ? [1] : [1, -1]) {
        const pts = ln.pts.map(([x, y]) => {
          const u = (s * x) / sk[0], v = y / sk[1];
          const zz = sk[2] * Math.sqrt(Math.max(0, 1 - u * u - v * v));
          return toScreen(R, add(hc, apply(H, [s * x, y, zz])));
        });
        for (let i = 0; i + 1 < pts.length; i++) {
          const [x0, y0, d0] = pts[i], [x1, y1] = pts[i + 1];
          const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
          for (let k = 0; k <= n; k++) {
            const t = k / n, X = Math.round(x0 + (x1 - x0) * t - 0.5), Y = Math.round(y0 + (y1 - y0) * t - 0.5);
            if (guardAt(R, X, Y, [1], d0, 1.8)) S.set(X - S.ox, Y - S.oy, col);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------- blush
  if (F.blush && pal.blush != null) {
    for (const e of eyes) {
      const bx = Math.round(e.X + e.s * z * 1.4 - (z < 2 ? 0.5 : 0)), by = Math.round(e.Y + z * 2.4);
      const bw = Math.max(1, Math.round(z * 1.6 * Math.max(0.5, e.vis))), bh = Math.max(1, Math.round(z * 0.6));
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) put(bx + i - Math.floor(bw / 2), by + j, pal.blush, e.dz);
    }
  }

  // ---------------------------------------------------------------- brows (2D, for faces without sculpted brows)
  if (F.brow) {
    for (const e of eyes) {
      const s = e.s;
      const lift = (E.brow ?? 0) + (s > 0 ? (E.browL ?? 0) : (E.browR ?? 0));
      const tilt = (E.browTilt ?? 0);            // + = inner ends down (cross), − = inner ends up (worried)
      const [bx, by, bz] = F.brow;
      const inner = add(hc, apply(H, [s * (bx - (F.browL ?? 3) * 0.45), by + lift - tilt * 0.35, bz]));
      const outer = add(hc, apply(H, [s * (bx + (F.browL ?? 3) * 0.45), by + lift + tilt * 0.35, bz - 0.6]));
      const [x0, y0, d0] = toScreen(R, inner), [x1, y1] = toScreen(R, outer);
      const th = Math.max(1, Math.round(z * (F.browT ?? 0.8)));
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = Math.round(x0 + (x1 - x0) * t - 0.5), y = Math.round(y0 + (y1 - y0) * t - 0.5);
        for (let j = 0; j < th; j++) if (guardAt(R, x, y + j, [1, 6], d0, 2.5)) S.set(x - S.ox, y + j - S.oy, pal.brow ?? pal.ink);
      }
    }
  }

  // ---------------------------------------------------------------- glasses
  if (F.glasses) {
    for (const s of [1, -1]) {
      const [ex, ey, ez] = F.eye;
      const c3 = add(hc, apply(H, [s * ex, ey, ez + (F.lensOut ?? 0.9)]));
      const n = Hz;
      const vis = dot(norm(apply(H, [s * 0.35, 0, 1])), R.cam.back);
      if (vis < -0.1) continue;
      const r = F.lensR ?? 2.4;
      const [X, Y, dz] = toScreen(R, c3);
      const pa = apply(H, [r, 0, 0]), pb = apply(H, [0, r, 0]);
      const A = [pa[0] * z, -(pa[1] * R.cam.u[1] + pa[2] * R.cam.u[2]) * z];
      const B = [pb[0] * z, -(pb[1] * R.cam.u[1] + pb[2] * R.cam.u[2]) * z];
      const rim = pal.rim, glint = pal.glint;
      let first = true;
      const half = F.glasses === 'half';
      const th = Math.max(1, Math.round(z * (F.rimT ?? 0.3)));
      const la = Math.hypot(A[0], A[1]), lb = Math.hypot(B[0], B[1]);
      const Ai = sc2(A, Math.max(0.1, (la - th) / la)), Bi = sc2(B, Math.max(0.1, (lb - th) / lb));
      const inner = new Set();
      ellipseAxes([X, Y], Ai, Bi, (x, y) => inner.add(x + ',' + y));
      ellipseAxes([X, Y], A, B, (x, y, edge) => {
        if (!edge && inner.has(x + ',' + y)) return;
        if (half && y + 0.5 < Y - 0.2) return;
        if (guardAt(R, x, y, null, dz, 0.9)) S.set(x - S.ox, y - S.oy, rim);
      });
      if (half) {   // the straight top edge of a half-moon lens
        const hw = Math.abs(A[0]) + Math.abs(B[0]);
        for (let x = Math.round(X - hw); x <= Math.round(X + hw) - 1; x++) { const y = Math.round(Y - 0.5); if (guardAt(R, x, y, null, dz, 0.9)) S.set(x - S.ox, y - S.oy, rim); }
      }
      // glint: top-left of each lens (the key light is up and to the left)
      if (glint != null) {
        const gx = Math.round(X - Math.abs(A[0]) * 0.45), gy = Math.round(Y - Math.abs(B[1]) * 0.45);
        if (guardAt(R, gx, gy, null, dz, 0.9) && z > 1.01) S.set(gx - S.ox, gy - S.oy, glint);
      }
      // temple arm toward the ear, when the side of the head is toward us
      const earSide = dot(apply(H, [s, 0, 0]), R.cam.back);
      if (earSide > 0.25) {
        const e0 = add(hc, apply(H, [s * (ex + r * 0.95), ey + 0.3, ez + 0.3]));
        const e1 = add(hc, apply(H, [s * (F.earX ?? 7.6), ey + 0.2, F.earZ ?? -0.5]));
        const [x0, y0, d0] = toScreen(R, e0), [x1, y1, d1] = toScreen(R, e1);
        const n2 = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let i = 0; i <= n2; i++) {
          const t = i / n2, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t), d = d0 + (d1 - d0) * t;
          if (guardAt(R, x, y, null, d, 0.9)) S.set(x - S.ox, y - S.oy, rim);
        }
      }
      // bridge
      if (s === 1 && facing > 0.2) {
        const b0 = add(hc, apply(H, [ex - r, ey + 0.4, ez + 0.9])), b1 = add(hc, apply(H, [-(ex - r), ey + 0.4, ez + 0.9]));
        const [x0, y0, d0] = toScreen(R, b0), [x1, y1] = toScreen(R, b1);
        for (let x = Math.round(Math.min(x0, x1)); x <= Math.round(Math.max(x0, x1)); x++) { const y = Math.round(y0); if (guardAt(R, x, y, null, d0, 1.2)) S.set(x - S.ox, y - S.oy, rim); }
      }
      first = false;
    }
  }

  // ---------------------------------------------------------------- mouth
  const Mo = E.mouth || {};
  if (F.mouth && (Mo.open > 0 || F.showMouth || Mo.tongue || Mo.grin)) {
    const p = add(hc, apply(H, F.mouth));
    const vis = dot(norm(apply(H, [0, -0.2, 1])), R.cam.back);
    if (vis > 0.1) {
      const [X, Y, dz] = toScreen(R, p);
      const w = Math.max(1, (Mo.w ?? F.mouthW ?? 2) * z * Math.max(0.5, vis)), o = (Mo.open ?? 0) * z;
      const curve = (Mo.curve ?? 0);
      const tol = F.mouthTol ?? 2.2;
      if (Mo.grin) {
        // a wide open grin: flat top edge, rounded bottom (a "D" on its side)
        const n = Math.max(3, Math.round(w)), hh = Math.max(2, Math.round(z * 1.6 * Mo.grin));
        const x0 = Math.round(X - n / 2);
        for (let j = 0; j < hh; j++) {
          const inset = j === 0 ? 0 : Math.round(((j / hh) ** 2) * n * 0.35 + (j === hh - 1 ? 1 : 0) * (n > 3 ? 1 : 0));
          for (let i = inset; i < n - inset; i++) {
            const edge = j === 0 || j === hh - 1 || i === inset || i === n - inset - 1;
            const c = z < 2 ? (j === 0 ? pal.mouthLine ?? pal.ink : pal.mouthIn ?? pal.ink) : edge ? pal.mouthLine ?? pal.ink : (j === 1 && pal.white != null ? pal.white : pal.mouthIn ?? pal.ink);
            if (guardAt(R, x0 + i, Math.round(Y) + j - 1, F.parts || [1], dz, tol)) S.set(x0 + i - S.ox, Math.round(Y) + j - 1 - S.oy, c);
          }
        }
      } else if (o >= 0.6) {
        const A = [w / 2, 0], B = [0, Math.max(0.8, o / 2)];
        ellipseAxes([X, Y + o / 2], A, B, (x, y, edge) => { if (guardAt(R, x, y, F.parts || [1], dz, tol)) S.set(x - S.ox, y - S.oy, edge || z < 2 ? pal.mouthLine ?? pal.ink : pal.mouthIn ?? pal.ink); });
      } else {
        const n = Math.max(1, Math.round(w));
        for (let i = 0; i < n; i++) {
          const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
          const y = Math.round(Y - curve * (1 - u * u) * z * 0.5 + curve * z * 0.3);
          const x = Math.round(X - n / 2 + i + 0.5 - 0.5);
          if (guardAt(R, x, y, F.parts || [1], dz, tol)) S.set(x - S.ox, y - S.oy, pal.mouthLine ?? pal.ink);
        }
      }
      if (Mo.tongue) {
        const tx = Math.round(X), ty = Math.round(Y + o * 0.7 + 1);
        const tw = Math.max(1, Math.round(z * 1.2)), th = Math.max(1, Math.round(z * (1 + Mo.tongue)));
        for (let j = 0; j < th; j++) for (let i = -Math.floor(tw / 2); i < Math.ceil(tw / 2) + (z < 2 ? 1 : 0); i++) S.set(tx + i - S.ox, ty + j - S.oy, pal.tongue);
      }
    }
  }
}

const sc2 = (a, s) => [a[0] * s, a[1] * s];

function guardAt(R, X, Y, parts, z, tol) {
  const x = X - R.x0, y = Y - R.y0;
  if (x < 0 || y < 0 || x >= R.w || y >= R.h) return false;
  const k = y * R.w + x;
  if (!R.hit[k]) return false;
  if (R.S && R.S.zb && R.opt.z != null) { const si = Y * R.S.w + X; if (R.opt.z + R.pos[k * 3 + 2] < R.S.zb[si] - 0.35) return false; }
  if (parts && !parts.includes(R.part[k])) return false;
  return R.depth[k] <= z + tol;
}
