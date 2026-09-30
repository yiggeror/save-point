// Close-up helpers for the inserts: one of a character's arms rendered big by the same figure renderer (so the hand
// in a close-up is the same hand, same materials and outlines, as in the wide shot), holding a prop whose tip is
// placed exactly where the drawing is happening.
import { build } from '../rig/humanoid.js';
import { render, camera, project } from '../rig/sdf.js';
import { pose } from '../rig/poses.js';
import { drawFace } from '../rig/face.js';
import { rotY, apply } from '../rig/m3.js';

/**
 * o: { side ('R'), yaw (the body's facing, degrees), hand: [x,y,z] target in body coordinates (x to the body's left,
 *      y up, z forward), wrist: [bend, roll, dev], grip, pole (body coords), prop (kind), pitch (camera), zoom,
 *      at: [sx, sy] where the prop's tip (or the wrist) should land on screen, light }
 * Returns the render record (with the screen position of the tip).
 */
export function renderArm(S, D, o) {
  const side = o.side ?? 'R', yaw = o.yaw ?? 180, R = rotY(yaw), r = (v) => apply(R, v);
  const P = pose(D, 'stand', { yaw });
  P.arms = { ...P.arms, [side]: { hand: r(o.hand), grip: o.grip ?? 0.9, wrist: o.wrist ?? [0, 0, 0], pole: o.pole ? r(o.pole) : undefined, spread: o.spread ?? 0 } };
  P.props = o.prop ? [{ hand: side, kind: o.prop, ...(o.propOpt || {}) }] : [];
  const rig = build(D, P);
  const f = rig.fig, keep = new Set([f.gidx['arm' + side], f.gidx['prop_' + o.prop + (side === 'L' ? 1 : -1)]]);
  const fig = { prims: f.prims.filter((p) => keep.has(p.g) && !(o.noUpper && p.name === 'upper' + side) && (o.keep ? o.keep(p) : true)), groups: f.groups, gidx: f.gidx };
  const cam = camera(o.pitch ?? 20);
  const anchor = (o.prop && rig.props[o.prop + side] && rig.props[o.prop + side].tip) || rig.S.arm[side].wr;
  const [ax, ay] = project(cam, anchor), zoom = o.zoom ?? 5;
  const x = o.at[0] - ax * zoom, y = o.at[1] - ay * zoom;
  const Rr = render(S, fig, { x, y, zoom, mats: D.mats, cam, light: o.light });
  Rr.tip = [o.at[0], o.at[1]];
  return Rr;
}

/**
 * A figure (or some of its groups) rendered big and facing the camera, with its face. o: { pose, po (pose options),
 * arms: {L, R} (body coordinates; yaw ~0), head: [yaw, pitch, roll], face, x, y (screen point of the floor origin),
 * zoom, pitch (camera), groups: ['head', 'torso', 'armL', …] to draw only those, noFace }
 */
export function renderFigure(S, D, o) {
  const P = pose(D, o.pose ?? 'stand', { yaw: o.yaw ?? 0, face: o.face || {}, ...(o.po || {}) });
  if (o.arms) P.arms = { ...P.arms, ...o.arms };
  if (o.head) P.head = o.head;
  if (o.face) P.face = { ...P.face, ...o.face };
  if (o.props) P.props = o.props;
  const rig = build(D, P), f = rig.fig;
  const fig = o.groups ? { prims: f.prims.filter((p) => o.groups.includes(f.groups[p.g].name) && !(o.noUpper && /^upper/.test(p.name || ''))), groups: f.groups, gidx: f.gidx } : f;
  const R = render(S, fig, { x: o.x, y: o.y, zoom: o.zoom ?? 4, mats: D.mats, cam: camera(o.pitch ?? 4) });
  if (!o.noFace && (!o.groups || o.groups.includes('head'))) drawFace(S, R, rig, D, P.face);
  return { R, rig };
}
