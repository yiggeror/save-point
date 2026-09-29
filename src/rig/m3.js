// Small 3-vector / 3x3-matrix kit. Vectors are [x,y,z]; matrices are 9-arrays whose ROWS are the local axes
// (row 0 = local x/right, row 1 = local y/up, row 2 = local z/forward), so a local vector v maps to world as
// v.x*row0 + v.y*row1 + v.z*row2.
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

export const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const row = (m, i) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]];
/** local → world direction */
export const apply = (m, v) => [
  v[0] * m[0] + v[1] * m[3] + v[2] * m[6],
  v[0] * m[1] + v[1] * m[4] + v[2] * m[7],
  v[0] * m[2] + v[1] * m[5] + v[2] * m[8]];
/** world → local direction */
export const applyT = (m, v) => [
  v[0] * m[0] + v[1] * m[1] + v[2] * m[2],
  v[0] * m[3] + v[1] * m[4] + v[2] * m[5],
  v[0] * m[6] + v[1] * m[7] + v[2] * m[8]];
/** compose: first local frame b expressed in a (b is relative to a) */
export const mm = (a, b) => [...apply(a, row(b, 0)), ...apply(a, row(b, 1)), ...apply(a, row(b, 2))];
const D = Math.PI / 180;
/** rotations in degrees. rotY: yaw (turn), rotX: pitch (nod: +ve tips forward/down), rotZ: roll (tilt) */
export const rotY = (a) => { const c = Math.cos(a * D), s = Math.sin(a * D); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
export const rotX = (a) => { const c = Math.cos(a * D), s = Math.sin(a * D); return [1, 0, 0, 0, c, s, 0, -s, c]; };
export const rotZ = (a) => { const c = Math.cos(a * D), s = Math.sin(a * D); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
/** yaw, then pitch, then roll (all in the parent frame's terms) */
export const ypr = (y = 0, p = 0, r = 0) => mm(mm(rotY(y), rotX(p)), rotZ(r));
/** a frame whose up axis is `up` and whose forward is as close to `fwd` as possible */
export function frameUp(up, fwd) {
  const y = norm(up);
  let x = cross(y, fwd); if (len(x) < 1e-6) x = cross(y, [0, 0, 1]); x = norm(x);
  const z = cross(x, y);
  return [...x, ...y, ...z];
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
