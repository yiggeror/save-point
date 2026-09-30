// The animation layer: turns the story's blocking (which pose each character holds when) into acting.
//
// A character's track is a function t → spec { x, z, yaw, pose, o, face, npc?, blend?, curve?, idle? }. Held poses
// come out of the timeline as steps; here every change of pose becomes a movement:
//  · the poses are resolved to explicit targets (hands, feet, elbows, knees, head, spine) and blended, hands along
//    an arc, not a straight line;
//  · the curve has an anticipation (a small move the other way first) and an overshoot that settles — big for the
//    hero (bouncy), small and slow for the keeper (steady);
//  · overlapping action: the eyes and head lead, the body follows, the arms and then the wrists drag behind;
//  · on top, the life that never stops: breathing, blinking (and a blink on big head turns), a slow weight shift;
//  · secondary motion: a damped spring driven by how the body actually moved (starts, stops, hops, turns) gives
//    the hair, headband tails, cape and apron their lag and swing.
// The keeper's NPC routine (spec.npc) bypasses all of it: two mechanical frames, like a game sprite. When he acts on
// his own the acting switches on — the contrast the film is about.
import { pose } from '../rig/poses.js';
import { skeleton } from '../rig/humanoid.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const frac = (x) => x - Math.floor(x);
const hash = (i, s = 0) => { let h = (Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const V = {
  lerp: (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
};
const angLerp = (a, b, u) => { const d = ((b - a + 540) % 360) - 180; return a + d * u; };

// ------------------------------------------------------------------ styles
export const STYLE = {
  hero:   { dur: 0.22, ant: 0.14, over: 0.16, lead: 1.5, drag: 0.12, blinkEvery: [2.2, 4.0], breathe: 3.0, shift: 0.35, spring: { f: 2.2, z: 0.28, gain: 0.9 } },
  keeper: { dur: 0.42, ant: 0.05, over: 0.05, lead: 1.35, drag: 0.16, blinkEvery: [3.0, 5.5], breathe: 3.8, shift: 0.22, spring: { f: 1.6, z: 0.4, gain: 0.7 } },
};

/**
 * The blend curve: u (0..1 through the move) → progress, with an anticipation dip at the start and an overshoot that
 * settles at the end. curve 'snap' (fast out), 'ease', 'slow' (long settle), 'step' (no in-betweens: NPC).
 */
export function curve(u, st, kind = 'ease') {
  if (kind === 'step') return u < 1 ? 0 : 1;
  u = clamp(u, 0, 1);
  const a = kind === 'slow' ? st.ant * 0.3 : st.ant, o = kind === 'slow' ? st.over * 0.5 : st.over;
  let p = kind === 'snap' ? 1 - (1 - u) ** 3 : ease(u);
  p -= a * Math.sin(Math.PI * clamp(u / 0.35, 0, 1)) * (1 - clamp(u / 0.35, 0, 1));   // anticipation: a little the other way
  p += o * Math.sin(Math.PI * clamp((u - 0.55) / 0.45, 0, 1)) * (u > 0.55 ? 1 : 0);    // overshoot, then settle
  return p;
}

// ------------------------------------------------------------------ poses as explicit targets
const DEF3 = [0, 0, 0];
/** the pose for a spec, with every target made explicit (so any two poses blend) */
export function resolve(D, spec) {
  const P = pose(D, spec.pose, { yaw: spec.yaw ?? 0, ...(spec.o || {}), face: spec.face || {} });
  if (spec.face) P.face = { ...P.face, ...spec.face };
  const S = skeleton(D, P);
  const R = { yaw: P.yaw ?? 0, face: P.face || {}, breathe: P.breathe ?? 0.3, props: P.props || [], shrug: (P.shrug || [0, 0]).slice(),
    head: (P.head || DEF3).slice(), spine: (P.spine || DEF3).slice(), pelvis: (P.pelvis || DEF3).slice(), hip: (P.hip || DEF3).slice(), arms: {}, legs: {}, gear: P.gear };
  for (const side of ['L', 'R']) {
    const A = (P.arms || {})[side] || {}, a = S.arm[side];
    R.arms[side] = { hand: a.target.slice(), pole: a.pole.slice(), wrist: (A.wrist || DEF3).slice(), grip: A.grip ?? 0.25, spread: A.spread ?? 0, point: A.point ?? 0 };
    const Lg = (P.legs || {})[side] || {}, l = S.leg[side];
    R.legs[side] = { foot: l.target.slice(), pole: l.pole.slice(), yaw: l.fyaw, toe: Lg.toe || 0 };
  }
  return R;
}
const lerpA = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
function blendFace(a, b, u) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (typeof x === 'number' || typeof y === 'number') out[k] = lerp(typeof x === 'number' ? x : 0, typeof y === 'number' ? y : 0, clamp(u, 0, 1));
    else if (x && y && typeof x === 'object' && typeof y === 'object') out[k] = blendFace(x, y, u);
    else out[k] = u < 0.5 ? x : y;
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
/**
 * Blend two resolved poses. u is the body's progress (from curve()); the head leads, the arms and wrists drag.
 * The hands travel on an arc bowed away from the chest.
 */
export function blend(A, B, u, st = STYLE.keeper, raw = u) {
  const uh = curve(clamp(raw * st.lead, 0, 1), st, 'ease');
  const ua = curve(clamp((raw - st.drag) / (1 - st.drag), 0, 1), st, 'ease');
  const uw = curve(clamp((raw - st.drag * 1.8) / (1 - st.drag * 1.8), 0, 1), st, 'ease');
  const P = {
    yaw: angLerp(A.yaw, B.yaw, u), breathe: lerp(A.breathe, B.breathe, clamp(u, 0, 1)),
    head: lerpA(A.head, B.head, uh), spine: lerpA(A.spine, B.spine, u), pelvis: lerpA(A.pelvis, B.pelvis, u), hip: lerpA(A.hip, B.hip, u),
    shrug: lerpA(A.shrug, B.shrug, u), face: blendFace(A.face, B.face, uh), props: raw < 0.6 ? A.props : B.props, arms: {}, legs: {}, gear: raw < 0.5 ? A.gear : B.gear,
  };
  for (const side of ['L', 'R']) {
    const a = A.arms[side], b = B.arms[side];
    const d = V.sub(b.hand, a.hand), dist = V.len(d);
    const mid = V.lerp(a.hand, b.hand, 0.5), out = V.sub(mid, [0, mid[1] - 4, 0]);        // bow outward and up from the body's axis
    const ol = Math.hypot(out[0], out[2]) || 1;
    const bow = [out[0] / ol * dist * 0.18, dist * 0.12, out[2] / ol * dist * 0.18];
    const arc = Math.sin(Math.PI * clamp(ua, 0, 1));
    P.arms[side] = {
      hand: V.add(V.lerp(a.hand, b.hand, ua), V.mul(bow, arc)), pole: V.lerp(a.pole, b.pole, ua), wrist: lerpA(a.wrist, b.wrist, uw),
      grip: clamp(lerp(a.grip, b.grip, uw), 0, 1), spread: clamp(lerp(a.spread, b.spread, uw), 0, 1), point: clamp(lerp(a.point, b.point, uw), 0, 1),
    };
    const fa = A.legs[side], fb = B.legs[side];
    // a foot that moves more than a little is lifted on its way (a step), otherwise it slides into place
    const fd = V.len(V.sub(fb.foot, fa.foot)), lift = fd > 1.5 ? Math.sin(Math.PI * clamp(u, 0, 1)) * Math.min(2.2, fd * 0.4) : 0;
    P.legs[side] = { foot: V.add(V.lerp(fa.foot, fb.foot, clamp(u, 0, 1)), [0, lift, 0]), pole: V.lerp(fa.pole, fb.pole, u), yaw: angLerp(fa.yaw, fb.yaw, clamp(u, 0, 1)), toe: lerp(fa.toe, fb.toe, u) };
  }
  return P;
}
/** a resolved pose → the P the rig builds from */
export function toRig(R) {
  const P = { yaw: R.yaw, face: R.face, breathe: R.breathe, head: R.head, spine: R.spine, pelvis: R.pelvis, hip: R.hip, shrug: R.shrug, props: R.props, arms: {}, legs: {}, sec: R.sec, gear: R.gear };
  for (const side of ['L', 'R']) {
    const a = R.arms[side]; P.arms[side] = { hand: a.hand, pole: a.pole, wrist: a.wrist, grip: a.grip, spread: a.spread, point: a.point };
    const l = R.legs[side]; P.legs[side] = { foot: l.foot, pole: l.pole, yaw: l.yaw, toe: l.toe };
  }
  return P;
}

// ------------------------------------------------------------------ the actor
const keyOf = (s) => (s ? JSON.stringify([s.pose, s.x, s.z, s.yaw, s.o && Object.fromEntries(Object.entries(s.o).filter(([k]) => !['phase', 'stride', 'air', 'bounce', 'lean', 'bob'].includes(k))), s.face]) : 'none');
const moving = (s) => s && (s.pose === 'walk' || (s.pose === 'carry' && s.o && s.o.phase != null) || s.pose === 'hop');

/**
 * An actor: D (design), track (t → spec), style (STYLE.hero / STYLE.keeper), seed.
 * at(t) → { x, z, P (for build/render), face } or null.
 */
export function actor(D, track, style, seed = 1) {
  const DT = 1 / 48, WIN = 0.75;
  function raw(t) { const s = track(t); return s || null; }
  /** position of the root and the hips at t (for secondary motion) */
  function rootAt(t) {
    const s = raw(t); if (!s) return null;
    const P = pose(D, s.pose, { yaw: s.yaw ?? 0, ...(s.o || {}) });
    return [s.x, (P.hip ? P.hip[1] : 0) + (s.pose === 'hop' ? (s.o.air ?? 0) : 0), s.z, s.yaw ?? 0];
  }
  function blended(t, depth = 0) {
    const s = raw(t); if (!s) return null;
    const R = resolve(D, s);
    if (s.npc) return { R, x: s.x, z: s.z, s };
    // when did this pose begin?
    const k = keyOf(s), kk = moving(s) ? s.pose : null;
    let tc = null, prev = null;
    for (let i = 1; i * DT <= WIN; i++) {
      const tt = t - i * DT, p = raw(tt);
      const same = p && (kk ? p.pose === kk : keyOf(p) === k);
      if (!same) { tc = tt + DT; prev = p; break; }
    }
    const dur = s.blend ?? (moving(s) || (prev && moving(prev)) ? Math.min(0.2, style.dur) : style.dur);
    if (tc == null || !prev || prev.npc && !s.fromNpc || t - tc >= dur) return { R, x: s.x, z: s.z, s };
    // a big jump in position is a cut in the blocking, not a movement: snap
    if (Math.hypot(prev.x - s.x, prev.z - s.z) > 10 && !moving(s) && !moving(prev)) return { R, x: s.x, z: s.z, s };
    const u = (t - tc) / dur;
    const pb = depth < 1 ? blended(tc - 1e-3, depth + 1) : { R: resolve(D, prev), x: prev.x, z: prev.z };
    const c = curve(u, style, s.curve ?? (s.pose === 'heroPose' || s.pose === 'slap' ? 'snap' : 'ease'));
    const B = blend(pb.R, R, c, style, u);
    const q = moving(s) || moving(prev) ? clamp(u, 0, 1) : clamp(c, 0, 1.05);
    return { R: B, x: lerp(pb.x, s.x, q), z: lerp(pb.z, s.z, q), s };
  }
  /** secondary motion: a damped spring driven by the root's acceleration over the last second */
  function secondary(t) {
    const { f, z, gain } = style.spring, w = 2 * Math.PI * f, h = 1 / 60, N = 60;
    const pts = [];
    for (let i = N + 2; i >= 0; i--) pts.push(rootAt(t - i * h));
    let x = [0, 0, 0], v = [0, 0, 0];
    for (let i = 2; i < pts.length; i++) {
      const a = pts[i], b = pts[i - 1], c = pts[i - 2];
      let acc = [0, 0, 0];
      if (a && b && c) {
        acc = [(a[0] - 2 * b[0] + c[0]) / (h * h), (a[1] - 2 * b[1] + c[1]) / (h * h), (a[2] - 2 * b[2] + c[2]) / (h * h)];
        // turning swings things sideways: the yaw's acceleration, felt at the back of the body
        const ya = ((a[3] - 2 * b[3] + c[3]) / (h * h)) * Math.PI / 180, yaw = a[3] * Math.PI / 180;
        acc = V.add(acc, [Math.cos(yaw) * ya * 3, 0, -Math.sin(yaw) * ya * 3]);
        acc = acc.map((q) => clamp(q, -900, 900));
      }
      const F = V.sub(V.mul(acc, -gain / (w * w) * w * w), V.add(V.mul(v, 2 * z * w), V.mul(x, w * w)));
      v = V.add(v, V.mul(F, h)); x = V.add(x, V.mul(v, h));
    }
    const a = pts[pts.length - 1], c = pts[pts.length - 3];
    const vel = a && c ? [(a[0] - c[0]) / (2 * h), (a[1] - c[1]) / (2 * h), (a[2] - c[2]) / (2 * h)].map((q) => clamp(q, -80, 80)) : [0, 0, 0];
    return { sway: x.map((q) => clamp(q, -6, 6)), vel };
  }
  function at(t) {
    const b = blended(t); if (!b) return null;
    const R = b.R, ck = b.s.clock ?? t;           // the idle clock: script time inside a loop, so every loop is identical
    if (!b.s.npc) {
      // breathing, a slow weight shift, and blinks
      R.breathe = frac(ck / style.breathe + seed * 0.37);
      const idle = b.s.idle !== false && !moving(b.s);
      if (idle) {
        const w = Math.sin(ck * 2 * Math.PI / 5.3 + seed) * style.shift, yawr = (R.yaw ?? 0) * Math.PI / 180;
        R.hip = [R.hip[0] + Math.cos(yawr) * w, R.hip[1] - Math.abs(w) * 0.15, R.hip[2] - Math.sin(yawr) * w];
        R.spine = [R.spine[0], R.spine[1], R.spine[2] - w * 2.5];
        R.head = [R.head[0] + Math.sin(ck * 0.7 + seed) * 1.2, R.head[1] + Math.sin(ck * 0.53 + seed * 2) * 0.8, R.head[2] + w * 1.5];
      }
      if (blinking(ck, style, seed) && (!R.face.eyes || R.face.eyes === 'open' || R.face.eyes === 'wide' || R.face.eyes === 'half')) R.face = { ...R.face, eyes: 'closed' };
      R.sec = secondary(t);
    }
    return { x: b.x, z: b.z, P: toRig(R), face: R.face, spec: b.s };
  }
  return { at, raw };
}
/** blinks: every few seconds (seeded), two frames closed */
function blinking(t, st, seed) {
  const [a, b] = st.blinkEvery, n = Math.floor(t / 0.5);
  for (let k = n - 1; k <= n; k++) {
    // a blink may start in each half-second slot with the right probability
    if (hash(k, seed * 17 + 3) < 0.5 / ((a + b) / 2)) { const t0 = k * 0.5 + hash(k, seed * 17 + 4) * 0.5; if (t >= t0 && t < t0 + 0.09) return true; }
  }
  return false;
}
