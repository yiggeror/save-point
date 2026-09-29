// The rough animatic (checkpoint 3): every beat of the timeline, blocked with the real set and characters in key
// poses, the real UI, and a notes strip. Characters hold poses between keys (pose-to-pose); positions move, walks
// cycle with planted feet. Frames are 384×216: the 320×180 film frame plus notes on the right and bottom.
import { Surface, ramp, text, textWidth, loadFont, PAL, bayer } from '../pix/gfx.js';
import { build } from '../rig/humanoid.js';
import { render, oblique, camera } from '../rig/sdf.js';
import { drawFace } from '../rig/face.js';
import { pose } from '../rig/poses.js';
import { drawShop, shopLight, LAYOUT, CANDLE, doorBell, shieldProp } from '../set/shop.js';
import { drawOutside } from '../set/outside.js';
import { grader } from '../set/light.js';
import { P as proj, R as RMP, tag as drawTag, digits } from '../set/kit.js';
import { emote } from '../ui/emotes.js';
import { heroHUD, shopMenu, saveIcon, win, num, U } from '../ui/hud.js';
import { TL, DURATION, BEAT, BAR, HERO, GO_LEN, RW_LEN } from './timeline.js';
import { tensionAt } from './beats.js';
import { keeperA } from '../chars/keeperA.js';
import { heroA } from '../chars/heroA.js';
import { newHeroA } from '../chars/newHero.js';

export const AW = 384, AH = 216;
const T = TL.T;
const cam = oblique(0.45);
const UIc = ramp('anim.ui', ['#0c0a12', '#1b1826', '#2c2840', '#524c74', '#9a92c4', '#e8e4ff', '#f2c14e', '#e0785a', '#7fd0a0']);
const CH = ramp('anim.chalk', ['#5a4a3c', '#9c9488', '#d8d2c4', '#f4f0e6']);
const INK = ramp('anim.ink', ['#1a1210', '#3a2a24']);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => u * u * (3 - 2 * u);
const inside = (t, a, b) => t >= a && t < b;

// ------------------------------------------------------------------ marks on the floor (world X, Z)
const MK = {
  door: [32, 2], entry: [34, 18], counter: [200, 64], keeper: [238, 34], bench: [80, 8], benchFront: [84, 24],
  flapIn: [224, 36], flapOut: [204, 44], tea: [282, 20], out: [32, -8],
};
const KEEPER_YAW_HERO = -48, HERO_YAW_COUNTER = 55;

function walkAct(D, from, to, t0, t1, t, o = {}) {
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  const x = lerp(from[0], to[0], u), z = lerp(from[1], to[1], u);
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const yaw = o.yaw ?? Math.atan2(dx, dz) * 180 / Math.PI;
  const step = o.step ?? BEAT / 2;                        // seconds per step
  const dist = Math.hypot(dx, dz), v = dist / Math.max(0.01, t1 - t0);
  const phase = (t - t0) / (2 * step);
  return { x, z, yaw, pose: o.pose ?? 'walk', o: { phase, stride: clamp(v * step, 2, 18), bounce: o.bounce ?? 0, lean: o.lean, bob: o.bob, ...(o.extra || {}) }, face: o.face };
}
const at = (x, z, yaw, p, o = {}, face) => ({ x, z, yaw, pose: p, o, face });

// ------------------------------------------------------------------ the time of day
function loopHour(lp, t) {
  const b = lp.sb(t);
  return 7.0 + 0.2 * clamp(b / lp.flashB, 0, 1);
}
export function hourAt(t) {
  for (const lp of T.loops) {
    if (inside(t, lp.t0, lp.rw[0])) return loopHour(lp, t);
    if (inside(t, lp.rw[0], lp.rw[1])) return lerp(7.2, 7.0, (t - lp.rw[0]) / RW_LEN);
  }
  if (t < T.loops[0].t0) return 7.0;
  if (inside(t, T.loop4.t0, T.montage.t0 + 1e-6)) return 7.0;
  const q = T.quiet, w = T.wait, r = T.ret;
  if (inside(t, T.montage.t0, q.t0)) return 7.05;
  if (inside(t, q.t0, q.t1)) return lerp(7.0, 7.12, (t - q.t0) / (q.t1 - q.t0));
  if (inside(t, w.t0, w.lapse[0])) return lerp(7.12, 7.22, (t - w.t0) / (w.lapse[0] - w.t0));
  if (inside(t, w.lapse[0], w.lapse[1])) { const u = (t - w.lapse[0]) / (w.lapse[1] - w.lapse[0]); return lerp(7.22, 22.5, ease(u)); }
  if (inside(t, w.lapse[1], w.t1)) { const u = (t - w.lapse[1]) / (w.t1 - w.lapse[1]); return (22.5 + 6.8 * u) % 24; }
  if (inside(t, w.t1, r.t1)) return lerp(5.6, 6.4, (t - w.t1) / (r.t1 - w.t1));
  return 7.0;
}

// ------------------------------------------------------------------ the loop script, as blocking
function heroInLoop(lp, t, D = heroA) {
  const b = lp.sb(t), s = lp.s, H = HERO;
  const B = (x) => s(x);                                  // script beat after the hint shift
  const bt = (x) => lp.ft(B(x));                          // film time of a script beat
  if (b < H.hop[0]) return null;
  if (b < H.hop[1]) { const u = (b - H.hop[0]) / (H.hop[1] - H.hop[0]); const x = lerp(MK.door[0], MK.entry[0], u), z = lerp(MK.door[1], MK.entry[1], u); return at(x, z, 10, 'hop', { air: 7 * Math.sin(Math.PI * u) + 1 }); }
  if (b < H.look[1]) { const k = b - H.look[0]; const look = k < 1.5 ? 0 : k < 3.5 ? -40 : k < 5.5 ? 40 : 0; return at(...MK.entry, 10, 'proud', { look }, { brow: 0.4, browTilt: 0.5, mouth: { grin: 1, w: 3 } }); }
  if (b < H.walk[1]) return walkAct(D, MK.entry, MK.counter, lp.ft(H.walk[0]), lp.ft(H.walk[1]), t, { bounce: 1.4, lean: 4 });
  const react = lp.react;
  if (react === 'hint' && b < B(H.slap)) {
    // the hint: he looks up at the shield, checks his purse, shakes his head
    const k = b - H.plant;
    if (k < 1) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', {});
    if (k < 3) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { head: [-30, -18, 0] }, { browL: 1.2, mouth: { curve: -0.3 } });
    if (k < 4.5) return at(...MK.counter, HERO_YAW_COUNTER, 'carry', { headPitch: 20, props: [{ hand: 'R', kind: 'pouch' }] }, { brow: 0.3 });
    return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { head: [Math.sin(k * 9) * 30, 8, 0] }, { browTilt: -1.2, mouth: { curve: -0.8, w: 3 } });
  }
  if (b < B(H.slap) - 0.5) return at(...MK.counter, HERO_YAW_COUNTER, 'carry', { headPitch: 10, props: [{ hand: 'R', kind: 'pouch' }] }, { brow: 0.3, mouth: { grin: 1, w: 3 } });
  if (b < B(H.slap)) return at(...MK.counter, HERO_YAW_COUNTER, 'reach', {}, { eyes: 'closed', mouth: { grin: 1 } });
  if (b < B(H.slap) + 1.5) return at(...MK.counter, HERO_YAW_COUNTER, 'slap', { counter: 22 });
  if (b < B(H.sword) + (react === 'notice' ? 2 : 0)) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { head: [-10, 6, 0] }, { brow: 0.3 });
  if (b < B(H.pose)) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { props: [{ hand: 'R', kind: 'sword', dir: [0, -1, 0.3] }] }, { eyes: 'happy', mouth: { grin: 1 } });
  if (b < B(H.turn)) return at(...MK.counter, 25, 'heroPose', {});
  if (b < B(H.exit[1])) return walkAct(D, MK.counter, MK.door, bt(H.exit[0]), bt(H.exit[1]), t, { bounce: 1.4, extra: { } });
  return null;
}
function keeperInLoop(lp, t) {
  const b = lp.sb(t), s = lp.s, H = HERO;
  const npc = (k) => at(...MK.keeper, 0, 'npcWipe', { phase: Math.floor(k) % 2, counter: 22 });
  if (b < H.bell) return npc(b);
  if (lp.react === 'notice') {
    // his loop breaks: frozen mid-wipe, then looks: window, hero, window
    if (b < H.bell + 1) return at(...MK.keeper, 0, 'npcWipe', { phase: 0, counter: 22 }, { eyes: 'wide', brow: 1.2 });
    if (b < H.bell + 3) return at(...MK.keeper, -30, 'stand', { head: [-50, -10, 0] }, { eyes: 'wide', brow: 1.3, mouth: { open: 1.2 } });
    if (b < H.bell + 6) return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { eyes: 'wide', brow: 1.0 });
    if (b < H.bell + 8) return at(...MK.keeper, -30, 'stand', { head: [-50, -10, 0] }, { browL: 1.2 });
    if (b < H.sword + 2) return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { browTilt: -0.8 });
    if (b < H.sword + 4) return at(...MK.keeper, -20, 'offer', { counter: 22, props: [{ hand: 'L', kind: 'sword', dir: [-1, 0.2, 0] }] });
    return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { browL: 1.2, mouth: { curve: -0.4 } });
  }
  if (lp.react === 'hint') {
    if (b < H.plant - 1) return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { brow: 0.5 });
    if (b < s(H.slap)) return at(...MK.keeper, -60, 'point', {}, { brow: 0.8, mouth: { open: 0.8 } });
    if (b < s(H.sword)) return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { browTilt: -1.2, mouth: { curve: -0.6 } });
    if (b < s(H.sword) + 2) return at(...MK.keeper, -20, 'offer', { counter: 22, props: [{ hand: 'L', kind: 'sword', dir: [-1, 0.2, 0] }] });
    return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { eyes: 'half' });
  }
  // loop 1: a perfect NPC — still the two-frame loop, a two-frame hand-over
  if (b >= H.sword && b < H.sword + 2) return at(...MK.keeper, 0, 'offer', { counter: 22, props: [{ hand: 'L', kind: 'sword', dir: [-1, 0.2, 0] }] });
  return npc(b);
}
function loopUI(lp, t, heroState) {
  const b = lp.sb(t), s = lp.s, H = HERO, ui = { emotes: [] };
  if (b >= H.bell && b < s(H.bellOut)) ui.hud = { gold: b < s(H.pay) ? 50 : Math.max(0, 50 - Math.round((b - s(H.pay)) * 50)) };
  if (b >= s(H.menu) && b < s(H.sword)) ui.menu = { sel: b < s(H.cursor) ? 1 : 0 };
  if (lp.react === 'notice' && b >= H.bell + 0.5 && b < H.bell + 3.5) ui.emotes.push({ who: 'keeper', kind: '!?' });
  if (lp.react === 'hint') {
    if (b >= H.plant - 1 && b < s(H.slap)) ui.emotes.push({ who: 'keeper', kind: '!' });
    if (b >= H.plant + 1 && b < H.plant + 3) ui.emotes.push({ who: 'hero', kind: '?' });
    if (b >= H.plant + 4.5 && b < s(H.slap)) ui.emotes.push({ who: 'hero', kind: '…' });
    if (b >= H.plant + 3 && b < H.plant + 4.5) ui.hudBlink = true;
  }
  if (b >= s(H.pose) && b < s(H.pose) + 1) ui.emotes.push({ who: 'hero', kind: '✦' });
  if (lp.ff && b > lp.ff.b0) ui.ff = lp.ff.rate;
  return ui;
}

// ------------------------------------------------------------------ the state of the film at time t
export function stateAt(t) {
  const st = { t, shot: TL.SHOTS.find((s) => t >= s.t0 && t < s.t1) || TL.SHOTS[TL.SHOTS.length - 1], hour: hourAt(t), actors: [], ui: { emotes: [] }, fx: {} };
  st.door = doorAt(t);
  // ---- opening
  if (t < T.loops[0].t0) {
    st.keeper = at(...MK.keeper, 0, 'npcWipe', { phase: 0, counter: 22 });
    if (t < T.saveIcon[1] + 0.2) st.ui.save = { phase: t * 1.4 };
    st.fx.load = clamp((t - T.map[0]) / (T.map[1] - T.map[0]), 0, 1);
    return st;
  }
  // ---- loops 1–3 (and their rewinds)
  for (const lp of T.loops) {
    if (inside(t, lp.t0, lp.rw[0])) {
      st.loop = lp; st.keeper = keeperInLoop(lp, t); st.hero = heroInLoop(lp, t); Object.assign(st.ui, loopUI(lp, t, st.hero));
      if (inside(t, lp.ft(lp.s(HERO.window)), lp.rw[0])) st.windowHero = { lp, u: clamp((lp.sb(t) - lp.s(HERO.window)) / (lp.flashB - lp.s(HERO.window)), 0, 1), death: 'flash', flash: t - lp.flashT };
      if (lp.chalk && inside(t, lp.t0, lp.ft(lp.insert[1]))) st.tally = { count: 1, draw: clamp((t - lp.t0 - 0.9 * BAR) / 0.6, 0, 1) };
      return st;
    }
    if (inside(t, lp.rw[0], lp.rw[1])) {
      // the rewind: the whole day played backwards in RW_LEN seconds, faded to four tones
      const u = (t - lp.rw[0]) / RW_LEN, tb = lerp(lp.rw[0] - 0.01, lp.t0, ease(u));
      const s2 = stateAt(tb);
      s2.t = t; s2.fx.rewind = u;
      s2.ui = { emotes: [], save: { phase: -t * 2 } }; s2.windowHero = null; s2.tally = null; s2.tagInsert = null;
      s2.shot = TL.SHOTS.find((s) => t >= s.t0 && t < s.t1) || s2.shot;
      return s2;
    }
  }
  // ---- loop 4's opening: the rule
  if (inside(t, T.loop4.t0, T.loop4.t1)) {
    st.keeper = at(...MK.keeper, 0, 'npcWipe', { phase: 0, counter: 22 });
    st.tally = { count: 2, draw: clamp((t - T.loop4.t0 - 1.2 * BAR) / 0.6, 0, 1), rule: clamp((t - T.loop4.t0) / (1.2 * BAR), 0, 1) };
    return st;
  }
  // ---- montage
  const q = T.quiet;
  if (inside(t, T.montage.t0, q.t0)) return montageState(st, t);
  // ---- quiet
  if (inside(t, q.t0, q.t1)) return quietState(st, t);
  const w = T.wait;
  if (inside(t, w.t0, w.t1)) return waitState(st, t);
  const r = T.ret;
  if (inside(t, w.t1, r.t1)) return returnState(st, t);
  const c = T.coda;
  if (inside(t, r.t1, c.t1)) return codaState(st, t);
  st.credits = (t - c.t1) / (T.credits.t1 - c.t1);
  return st;
}

function doorAt(t) {
  // the door swings open on each bell and closes a little after
  let v = 0;
  for (const e of TL.EV) {
    if (e.kind !== 'bell' || e.t > t + 0.01) continue;
    const d = t - e.t;
    const hold = e.resolve ? 1.6 : 1.1;
    const o = d < 0.18 ? d / 0.18 : d < hold ? 1 : d < hold + 0.3 ? 1 - (d - hold) / 0.3 : 0;
    v = Math.max(v, o);
  }
  return clamp(v, 0, 1);
}

// ------------------------------------------------------------------ montage
function montageState(st, t) {
  const M = T.montage, B = M.beats(t), bar = Math.floor(B / 4) + 1, beat = B - (bar - 1) * 4;
  const loop = T.montageLoops.find(([b0, n]) => bar >= b0 && bar < b0 + n);
  const [b0, n, gag, death, cnt] = loop;
  const k = (bar - b0) * 4 + beat;                        // beats into this montage loop
  const lb = (x) => M.at(b0, 0) + 0 + (M.at(b0 + Math.floor(x / 4), x % 4) - M.at(b0, 0));
  st.montage = { gag, k, bar, beat };
  const K = MK.keeper, C = MK.counter;
  const heroQuick = (k0, k1) => {                         // enter and walk to the counter fast (between beats k0..k1)
    if (k < k0) return null;
    if (k < k0 + 0.5) return at(lerp(MK.door[0], MK.entry[0], (k - k0) / 0.5), lerp(MK.door[1], MK.entry[1], (k - k0) / 0.5), 10, 'hop', { air: 5 });
    if (k < k1) return walkAct(heroA, MK.entry, C, lb(k0 + 0.5), lb(k1), t, { bounce: 1.4, step: BEAT / 3 });
    return null;
  };
  const exitQuick = (k0, k1) => walkAct(heroA, C, MK.door, lb(k0), lb(k1), t, { bounce: 1.4, step: BEAT / 3 });
  st.ui.emotes = [];
  if (gag === 'tally') { st.tally = { count: cnt, draw: clamp(beat / 1.2, 0, 1), stop: cnt === 23 ? clamp((beat - 1.5) / 1, 0, 1) : 0 }; return st; }
  if (death && st.shot.kind === 'window') { st.windowHero = { u: clamp((k - (n * 4 - 1.5)) / 1.0, 0, 1), death, flash: t - lb(n * 4 - 1 + (gag.startsWith('rapid') ? 0.5 : 0.5)) }; }
  if (gag === 'tag') {
    if (k < 4) { st.tagInsert = { u: clamp(k / 3, 0, 1) }; return st; }
    const kk = k - 4;
    st.keeper = at(...K, KEEPER_YAW_HERO, kk < 6 ? 'armsCrossed' : 'stand', {}, kk < 6 ? { brow: 0.6, mouth: { curve: 0.4 } } : { browTilt: -1.2 });
    st.hero = heroQuick(4, 6) || (k < 7 ? at(...C, HERO_YAW_COUNTER, 'stand', { head: [-30, -18, 0] }, { eyes: 'wide', mouth: { grin: 1 } }) :
      k < 9 ? at(...C, HERO_YAW_COUNTER, 'stand', { head: [10, 4, 0] }, { browL: 1.2 }) : k < 10 ? at(...C, HERO_YAW_COUNTER, 'shrug', {}) :
      k < 11 ? at(...C, HERO_YAW_COUNTER, 'slap', { counter: 22 }) : k < 13 ? at(...C, 25, 'heroPose', {}) : exitQuick(13, 16));
    if (k >= 6 && k < 7) st.ui.emotes.push({ who: 'hero', kind: '✦' });
    if (k >= 7 && k < 10) { st.ui.menu = { sel: 1, dim: false }; st.ui.emotes.push({ who: 'hero', kind: '?' }); }
    st.ui.hud = { gold: k < 11 ? 50 : 0 }; st.tagChanged = true;
    return st;
  }
  if (gag === 'potion') {
    st.keeper = k < 3 ? at(...K, -20, 'offer', { counter: 22, props: [{ hand: 'L', kind: 'sword', dir: [-1, 0.2, 0] }] }, { eyes: 'happy', stache: 0.4 }) :
      at(...K, KEEPER_YAW_HERO, 'stand', {}, k < 9 ? { brow: 0.6 } : { eyes: 'half', stache: -0.3 });
    st.hero = heroQuick(0, 2) || (k < 3 ? at(...C, HERO_YAW_COUNTER, 'stand', {}) : k < 5 ? exitQuick(3, 5) :
      k < 6 ? at(...MK.door.map((v, i) => v + (i ? 8 : 4)), 180, 'stand', { head: [0, 20, 0] }, { eyes: 'wide' }) :
      k < 8 ? walkAct(heroA, [MK.door[0] + 4, MK.door[1] + 8], C, lb(6), lb(8), t, { bounce: 1.4, step: BEAT / 3 }) :
      k < 9 ? at(...C, HERO_YAW_COUNTER, 'slap', { counter: 22 }, { mouth: { curve: -0.3 } }) : k < 10.5 ? at(...C, 20, 'salute', {}, { brow: 0.6 }) : exitQuick(10.5, 12));
    if (k >= 5 && k < 6) st.ui.emotes.push({ who: 'hero', kind: '!' });
    if (k >= 8.5 && k < 10) st.ui.emotes.push({ who: 'keeper', kind: '…' });
    st.potionOnCounter = k >= 8.5;
    return st;
  }
  if (gag === 'map') {
    st.keeper = k < 2 ? at(...K, 0, 'npcWipe', { phase: Math.floor(k * 2) % 2, counter: 22 }, { brow: 0.8 }) : at(...K, KEEPER_YAW_HERO, 'stand', {}, k < 5 ? { brow: 0.6 } : { eyes: 'half', browTilt: 1 });
    st.hero = heroQuick(0, 1.5) || (k < 4 ? at(...C, HERO_YAW_COUNTER, 'carry', { headPitch: 22 }, { brow: 0.6, mouth: { grin: 1 } }) : k < 5.5 ? at(...C, 40, 'salute', {}, { brow: 0.6 }) : exitQuick(5.5, 8));
    if (k >= 2.5 && k < 5) st.ui.emotes.push({ who: 'hero', kind: '✦' });
    st.upsideDownMap = k >= 2 && k < 5.5;
    return st;
  }
  if (gag === 'wall') {
    const flap = [MK.flapIn[0] - 4, MK.flapIn[1]];
    st.keeper = k < 1.8 ? walkAct(keeperA, K, flap, lb(0), lb(1.8), t, { step: BEAT / 2, extra: {} }) :
      k < 3 ? at(...lerpP(flap, K, clamp((k - 1.8) / 1.2, 0, 1)), -80, 'bump', {}, { eyes: 'closed', browTilt: 1.2, mouth: { open: 1 } }) :
      at(...K, KEEPER_YAW_HERO, 'armsCrossed', {}, { eyes: 'half', stache: -0.5 });
    if (k >= 1.8 && k < 2.6) st.grid = { flash: 1 - (k - 1.8) / 0.8, x: 214 };
    st.hero = heroQuick(1, 3) || (k < 5 ? at(...C, HERO_YAW_COUNTER, 'heroPose', {}) : exitQuick(5, 8));
    if (k >= 2 && k < 4) st.ui.emotes.push({ who: 'keeper', kind: '💢' });
    return st;
  }
  // rapid loops: one bar each, the shopkeeper's reaction and the window
  const kind = gag;
  const kp = { rapid1: at(...K, KEEPER_YAW_HERO, 'armsCrossed', { tap: (k * 2) % 1 }, { eyes: 'half' }), rapid2: at(...K, 0, 'headDown', { counter: 22 }),
    rapid3: at(...K, -20, 'offer', { counter: 22, props: [{ hand: 'L', kind: 'sword', dir: [-1, 0.2, 0] }] }, { eyes: 'half' }), rapid4: at(...K, -30, 'heroPose', {}, { eyes: 'half' }) }[kind];
  st.keeper = kp;
  st.hero = kind === 'rapid4' ? at(...C, 25, 'heroPose', {}) : kind === 'rapid2' ? null : at(...C, HERO_YAW_COUNTER, 'stand', {}, { mouth: { grin: 1 } });
  if (kind === 'rapid1') st.ui.emotes.push({ who: 'keeper', kind: '💢' });
  return st;
}
const lerpP = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ------------------------------------------------------------------ quiet
function quietState(st, t) {
  const q = T.quiet;
  if (t < q.rewind[1]) { st.fx.rewind = (t - q.rewind[0]) / (q.rewind[1] - q.rewind[0]); st.keeper = at(...MK.keeper, 0, 'headDown', { counter: 22 }); return st; }
  // the keeper
  if (t < q.look[0]) st.keeper = at(...MK.keeper, 0, 'stand', { head: [0, 12, 0] }, { eyes: 'half' });
  else if (t < q.pour[0]) st.keeper = at(...MK.keeper, -60, 'stand', { head: [-10, 0, 0] }, { brow: 0.3 });
  else if (t < q.pour[1]) st.keeper = at(...MK.tea, -170, 'carry', { headPitch: 20, props: [{ hand: 'R', kind: 'cup' }] }, {});
  else if (t < q.toFlap[1]) st.keeper = walkAct(keeperA, MK.tea, MK.flapIn, q.pour[1], q.toFlap[1], t, { pose: 'carry', step: 0.45, extra: { props: [{ hand: 'R', kind: 'cup' }] } });
  else if (t < q.shatter + 0.6) st.keeper = at(...MK.flapIn, -90, 'carry', { props: [{ hand: 'R', kind: 'cup' }] }, { brow: 0.4 });
  else if (t < q.walk[1]) st.keeper = walkAct(keeperA, MK.flapIn, [MK.benchFront[0] + 20, MK.benchFront[1] + 4], q.shatter + 0.6, q.walk[1], t, { pose: 'carry', step: 0.45, extra: { props: [{ hand: 'R', kind: 'cup' }] } });
  else if (t < q.hand[1]) st.keeper = at(MK.benchFront[0] + 20, MK.benchFront[1] + 4, -110, 'offerCup', {}, { brow: 0.3, stache: 0.3 });
  else if (t < q.gifts[0]) st.keeper = at(MK.benchFront[0] + 20, MK.benchFront[1] + 4, -110, 'stand', {}, t > q.brow ? { browL: 1.4, stache: 0.3 } : {});
  else if (t < q.refuse[0]) st.keeper = at(MK.benchFront[0] + 18, MK.benchFront[1] + 2, -120, 'push', { counter: 14 }, {});
  else st.keeper = at(MK.benchFront[0] + 20, MK.benchFront[1] + 4, -110, 'stand', { head: [Math.sin((t - q.refuse[0]) * 9) * 25, 4, 0] }, { eyes: 'happy', stache: 0.5 });
  // the hero: the identical entrance (without music), then the bench
  const bellT = q.bell, B = (b) => bellT + (b - HERO.bell) * BEAT;
  const fake = { sb: (tt) => HERO.bell + (tt - bellT) / BEAT, s: (x) => x, ft: (b) => B(b) };
  if (t < bellT) st.hero = null;
  else if (t < B(HERO.walk[0])) st.hero = heroInLoop({ ...fake, react: null, flashB: 99 }, t);
  else if (t < q.sit) st.hero = walkAct(heroA, MK.entry, MK.bench, B(HERO.walk[0]), q.sit - 0.3, t, { step: 0.34, bounce: 0.2, lean: 12 });
  else if (t < q.hand[0] + 1.0) st.hero = at(...MK.bench, 15, 'sit', { seat: 16 }, { eyes: 'half', mouth: { open: 0.4 } });
  else if (t < q.gulp) st.hero = at(...MK.bench, 30, 'sit', { seat: 16, head: [20, -4, 0] }, { eyes: 'wide', brow: 0.6 });
  else if (t < q.hot) st.hero = at(...MK.bench, 30, 'sit', { seat: 16, extra: {} }, { eyes: 'closed' });
  else if (t < q.gifts[0]) st.hero = at(...MK.bench, 30, 'sit', { seat: 16 }, { eyes: 'closed', browTilt: 1.2, mouth: { open: 1.5, tongue: 1 } });
  else st.hero = at(...MK.bench, 30, 'sit', { seat: 16, head: [30, 4, 0] }, t < q.refuse[0] ? { eyes: 'wide', brow: 0.8 } : { eyes: 'happy', brow: 0.5, mouth: { curve: 1, w: 3 } });
  if (inside(t, q.bell, q.bell + 1.1)) st.ui.hud = { gold: 50 };
  if (inside(t, q.look[0] + 1.0, q.look[1])) st.ui.emotes.push({ who: 'keeper', kind: '…' });
  if (inside(t, q.hot, q.hot + 1.6)) st.ui.emotes.push({ who: 'hero', kind: '!' });
  if (inside(t, q.refuse[0] + 1.0, q.t1)) st.ui.emotes.push({ who: 'hero', kind: '♥' });
  st.boundary = t < q.shatter ? { lit: inside(t, q.toFlap[1] - 0.2, q.shatter) ? 1 : 0 } : { shatter: t - q.shatter };
  st.gifts = t >= q.gifts[0] ? clamp((t - q.gifts[0]) / (q.gifts[1] - q.gifts[0]), 0, 1) : 0;
  return st;
}

// ------------------------------------------------------------------ wait
function waitState(st, t) {
  const w = T.wait;
  st.gifts = 0;
  st.hero = t < w.leave[1] ? walkAct(heroA, MK.bench, MK.door, w.t0, w.leave[1], t, { bounce: 0.8, step: 0.3 }) : null;
  if (st.hero) st.hero.o.props = [{ hand: 'R', kind: 'sword', dir: [0, -1, 0.3] }];
  st.keeper = t < w.leave[1] + 1 ? at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { brow: 0.4 }) : at(...MK.keeper, 0, 'stand', { head: [-30, 4, 0] }, { eyes: t > w.last ? 'half' : 'open', brow: 0.2 });
  if (t > w.candle) st.candle = { lit: true, len: clamp(1 - (t - w.candle) / 20, 0.35, 1) };
  if (inside(t, w.clock[0], w.clock[1])) st.clockInsert = { pass: w.pass, t };
  if (inside(t, w.tower[0], w.tower[1]) || (t >= w.last - 0.4 && t < w.last + 1.6)) st.windowHero = { night: true, flashes: [...w.flashes, w.last], t };
  return st;
}

// ------------------------------------------------------------------ return
function returnState(st, t) {
  const r = T.ret, w = T.wait;
  st.candle = { lit: false, len: 0.3 };
  st.keeper = t < r.thunk ? at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { eyes: 'wide', brow: 1.0 }) :
    t < r.wave[1] ? at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { eyes: 'happy', stache: 0.6 }) :
    t < r.horn[1] ? walkAct(keeperA, MK.keeper, [MK.flapIn[0] - 20, 44], r.wave[1], r.wave[1] + 1.6, t, { step: 0.45 }) : at(...MK.keeper, 0, 'stand', {}, { eyes: 'happy', stache: 0.4 });
  if (t >= r.wave[1] + 1.6 && t < r.horn[1]) st.keeper = at(MK.door[0] + 10, 14, 180, 'reach', {}, { eyes: 'happy' });
  const battered = { head: [0, 6, 0] };
  if (t < r.bell) st.hero = null;
  else if (t < r.thunk - BAR * 0.5) st.hero = walkAct(heroA, MK.door, MK.counter, r.bell + 0.2, r.thunk - BAR * 0.5, t, { step: 0.4, lean: 10, bounce: 0.3, pose: 'carry', extra: { headPitch: 0 } });
  else if (t < r.thunk + 0.6) st.hero = at(...MK.counter, HERO_YAW_COUNTER, 'push', { counter: 22 }, { eyes: 'half', mouth: { grin: 1 } });
  else if (t < r.wave[0]) st.hero = at(...MK.counter, HERO_YAW_COUNTER, 'stand', battered, { eyes: 'happy', mouth: { grin: 1 } });
  else if (t < r.wave[0] + 1.6) st.hero = at(...MK.counter, 20, 'wave', {});
  else if (t < r.wave[1]) st.hero = walkAct(heroA, MK.counter, MK.door, r.wave[0] + 1.6, r.wave[1], t, { bounce: 1.2 });
  else st.hero = null;
  st.horn = t < r.thunk ? (t >= r.bell ? 'carried' : null) : t < r.horn[1] - 0.6 ? 'counter' : 'wall';
  if (inside(t, r.thunk, r.thunk + 1.2)) st.ui.emotes.push({ who: 'keeper', kind: '!' });
  if (inside(t, r.wave[0], r.wave[0] + 1.6)) st.ui.emotes.push({ who: 'hero', kind: '♪' });
  if (t >= r.smile[0] && t < r.smile[1]) st.portrait = { u: (t - r.smile[0]) / (r.smile[1] - r.smile[0]) };
  if (t >= r.star - BAR * 0.5) st.tally = { count: 23, star: clamp((t - r.star + 0.6) / 0.8, 0, 1) };
  return st;
}

// ------------------------------------------------------------------ coda
function codaState(st, t) {
  const c = T.coda, g = c.grid;
  st.horn = 'wall';
  const b = (t - g.t0) / BEAT;
  st.keeper = t < c.push - 0.1 ? at(...MK.keeper, 0, 'stand', { head: [0, 18, 0], props: [{ hand: 'R', kind: 'cup' }] }, { eyes: 'half', stache: 0.2 }) :
    at(...MK.keeper, KEEPER_YAW_HERO, 'push', { counter: 22 }, { eyes: 'half', stache: 0.3 });
  const fake = { sb: () => b, s: (x) => x, ft: (x) => g.t0 + x * BEAT, react: null, flashB: 99 };
  st.hero = b >= HERO.hop[0] && t < c.black ? heroInLoop(fake, t, newHeroA) : null;
  if (st.hero) st.heroD = newHeroA;
  if (b >= HERO.bell && t < c.black) st.ui.hud = { gold: 50, newHero: true };
  if (t >= c.push) st.pushed = clamp((t - c.push) / 0.5, 0, 1);
  if (t >= c.black) { st.black = true; st.ui = { emotes: [], save: { phase: (t - c.black) * 1.5, done: t > c.saved } }; }
  return st;
}

// ================================================================== drawing
let ready = false;
export async function setup() { await loadFont(); ready = true; }

function drawActor(S, D, a, extra = {}) {
  if (!a) return null;
  const P = pose(D, a.pose, { yaw: a.yaw, ...a.o, face: a.face || {} });
  if (a.face) P.face = { ...P.face, ...a.face };
  const rig = build(D, P);
  const [x, y] = proj(a.x, 0, a.z);
  const R = render(S, rig.fig, { x: Math.round(x), y: Math.round(y), z: a.z, zoom: 1, mats: D.mats, cam, ...extra });
  drawFace(S, R, rig, D, P.face);
  return { R, rig, x, y };
}

function film(t) {
  const st = stateAt(t);
  const S = new Surface(320, 180); S.clear(0);
  const kind = st.black ? 'black' : st.credits != null ? 'credits' : st.portrait ? 'portrait' : st.tagInsert ? 'tag' : st.clockInsert ? 'clock'
    : (st.shot.kind === 'candle') ? 'candle' : st.tally && (st.shot.kind === 'tally') ? 'tally' : st.shot.kind === 'window' ? 'window' : st.shot.kind === 'black' ? 'black' : 'W';
  st.kind = kind;
  if (kind === 'black') return { S, st, grade: null, black: true };
  if (kind === 'credits') { drawCredits(S, st.credits); return { S, st }; }
  if (kind === 'window') { drawWindowInsert(S, st, t); return { S, st, grade: grader(st.hour, S) }; }
  if (kind === 'tally') { drawTally(S, st.tally, t); return { S, st, grade: grader(7.1, S) }; }
  if (kind === 'tag') { drawTagInsert(S, st.tagInsert.u); return { S, st, grade: grader(7.05, S) }; }
  if (kind === 'clock') { drawClockInsert(S, st.clockInsert, t); return { S, st, grade: grader(st.hour, S) }; }
  if (kind === 'candle') { drawCandleInsert(S, t); return { S, st, grade: grader(23.5, S) }; }
  if (kind === 'portrait') { drawPortrait(S, st.portrait.u); return { S, st, grade: grader(6.0, S) }; }
  // ---- the wide shot
  const hour = st.hour;
  drawShop(S, { opt: 'A', hour, t, door: st.door, candle: st.candle, clock: hour, towerFlash: st.windowHero && st.windowHero.flash > 0 && st.windowHero.flash < 0.3 ? 1 : 0 });
  if (st.tagChanged) { const L = LAYOUT.shield; drawTag(S, L.x - 7, L.y + 16, 50, tagPal()); chalkOverTag(S, L.x - 5, L.y + 18); }
  if (st.horn === 'wall') hornOnWall(S);
  if (st.horn === 'counter') hornOnCounter(S);
  if (st.potionOnCounter) potionOnCounter(S);
  if (st.gifts) giftsOnBench(S, st.gifts);
  if (st.pushed != null) pushedItems(S, st.pushed);
  const kInfo = drawActor(S, keeperA, st.keeper);
  const hInfo = drawActor(S, st.heroD || heroA, st.hero);
  if (st.horn === 'carried' && hInfo) hornShape(S, Math.round(hInfo.x) - 14, Math.round(hInfo.R.y0) + 10, 1);
  if (st.boundary) drawBoundary(S, st.boundary, t);
  if (st.grid) drawGrid(S, st.grid.flash);
  shopLight(S, { hour, candle: st.candle, t });
  // UI
  const heads = { keeper: kInfo, hero: hInfo };
  if (st.ui.hud) heroHUD(S, { gold: st.ui.hud.gold, hp: 3, hair: (st.ui.hud.newHero ? newHeroA : heroA).mats[heroA.M.hair].ramp[3], skin: heroA.mats[heroA.M.skin].ramp[3], blink: st.ui.hudBlink });
  if (st.ui.hudBlink && Math.floor(t * 6) % 2 === 0) num(S, 50, 29, 16, U[7]);
  if (st.ui.menu) shopMenu(S, 150, 52, [['sword', 50], ['shield', 80], ['potion', 20]], st.ui.menu.sel ?? 0);
  for (const e of st.ui.emotes) {
    const h = heads[e.who]; if (!h) continue;
    emote(S, e.kind, Math.round(h.x + 6), Math.round(h.R.y0 - 1));
  }
  if (st.ui.ff) ffIcon(S, st.ui.ff);
  if (st.ui.save) saveIcon(S, 308, 164, st.ui.save.phase % 1, st.ui.save.done);
  return { S, st, grade: grader(hour, S) };
}

// ------------------------------------------------------------------ small set changes and props drawn flat
function tagPal() {
  return { paper: RMP('shop.paper', '#eadcb8', 6, { lo: 0.5, hi: 0.97 }), ink: RMP('shop.ink', '#2a1d1e', 1)[0] };
}
function chalkOverTag(S, x, y) { for (let j = 0; j < 5; j++) S.set(x - 1, y + j, CH[3]); }
function hornOnWall(S) {
  const D = LAYOUT.door, hx = D.x + D.w / 2, hy = D.y - 22;
  hornShape(S, hx - 10, hy + 1, 1);
}
function hornOnCounter(S) { hornShape(S, 222, 110, 1); }
const HORN = RMP('prop.horn', '#e8dcc0', 6, { lo: 0.36, hi: 0.97 }), HORNB = RMP('prop.hornb', '#6a4a8a', 6);
function hornShape(S, x, y, sc) {
  // a curling horn: thick at the base (purple band), tapering and curling to a point
  for (let i = 0; i < 20; i++) {
    const u = i / 19, w = Math.round(4 - u * 3.2), cx = x + i, cy = y + Math.round(-Math.sin(u * 2.2) * 6 + u * u * 2);
    for (let j = -w; j <= w; j++) S.set(cx, cy + j, i < 3 ? HORNB[j < 0 ? 4 : 2] : HORN[j < -w / 2 ? 5 : j > w / 2 ? 2 : 3]);
    S.set(cx, cy - w - 1, HORN[1]); S.set(cx, cy + w + 1, HORN[0]);
  }
}
function potionOnCounter(S) { const x = 216, y = 118; S.rect(x, y - 5, 4, 5, RMP('shop.red', '#c2413d', 6, { cool: 330 })[3]); S.rect(x + 1, y - 7, 2, 2, RMP('shop.cork', '#b98a58', 6)[3]); }
function giftsOnBench(S, u) {
  const pal = { iron: RMP('shop.iron', '#6f7580', 6, { cool: 260 }), steel: RMP('shop.steel', '#aab4c2', 6, { cool: 250, hi: 0.97 }), trim: RMP('A.trim', '#c49a66', 6, { lo: 0.34, hi: 0.88, cool: 320, shift: 0.25 }) };
  if (u > 0.1) { shieldProp(S, pal, 100, 104); }
  if (u > 0.45) { S.rect(90, 104, 4, 5, RMP('shop.red', '#c2413d', 6, { cool: 330 })[3]); S.rect(91, 102, 2, 2, RMP('shop.cork', '#b98a58', 6)[3]); }
  if (u > 0.75) { const p = RMP('shop.paper', '#eadcb8', 6, { lo: 0.5, hi: 0.97 }); S.rect(76, 106, 9, 3, p[4]); S.hline(76, 84, 108, p[2]); S.set(80, 107, INK[0]); }
}
function pushedItems(S, u) { const x = Math.round(214 - u * 10); S.rect(x, 115, 4, 5, RMP('shop.red', '#c2413d', 6, { cool: 330 })[3]); }
function drawBoundary(S, b, t) {
  const x0 = 204, y0 = 92, cols = 2, rows = 5;
  if (b.lit) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const X = x0 + c * 8, Y = y0 + r * 8; for (let k = 0; k < 8; k += 2) { S.set(X + k, Y, UIc[8]); S.set(X, Y + k, UIc[8]); } }
  if (b.shatter != null && b.shatter < 1.4) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (let q = 0; q < 4; q++) {
      const seed = r * 17 + c * 5 + q, vx = ((seed * 37) % 11 - 5) * 6, vy = -((seed * 13) % 7) * 6;
      const tt = b.shatter, X = x0 + c * 8 + (q % 2) * 4 + vx * tt, Y = y0 + r * 8 + (q >> 1) * 4 + vy * tt + 60 * tt * tt;
      if (Y < 150) S.rect(Math.round(X), Math.round(Y), 2, 2, UIc[8]);
    }
  }
}
function drawGrid(S, a) {
  if (a <= 0) return;
  for (let r = 0; r < 6; r++) for (let x = 0; x < 16; x += 2) S.set(206 + x, 90 + r * 8, UIc[8]);
  for (let c = 0; c < 3; c++) for (let y = 0; y < 40; y += 2) S.set(206 + c * 8, 90 + y, UIc[8]);
}
function ffIcon(S, rate) {
  win(S, 270, 4, 46, 14);
  const a = [[0, 0], [0, 6], [4, 3]];
  for (const dx of [0, 5]) S.poly(a.map(([x, y]) => [275 + dx + x, 8 + y]), U[6]);
  num(S, rate, 290, 7, U[6]); S.set(288, 9, U[6]); S.set(287, 10, U[6]); S.set(289, 10, U[6]); S.set(288, 11, U[6]); S.set(287, 8, U[6]); S.set(289, 8, U[6]);
}

// ------------------------------------------------------------------ inserts (rough: redrawn at more detail in the film)
function drawWindowInsert(S, st, t) {
  const w = st.windowHero || {};
  const hour = w.night ? 23.4 : st.hour;
  let flash = 0;
  if (w.flashes) for (const f of w.flashes) if (t >= f && t < f + 0.5) flash = 1;
  if (w.flash != null && w.flash > 0 && w.flash < 0.6) flash = 1;
  const info = drawOutside(S, 8, 8, 304, 164, { hour, t, zoom: 3.2, towerFlash: flash });
  // the frame around the view: sash, mullion, sill
  const F = RMP('A.beam', '#4e342a', 6, { lo: 0.16, hi: 0.52, cool: 320, shift: 0.25 });
  S.rect(0, 0, 320, 8, F[2]); S.rect(0, 172, 320, 8, F[3]); S.rect(0, 0, 8, 180, F[2]); S.rect(312, 0, 8, 180, F[1]);
  S.rect(157, 0, 6, 180, F[3]); S.vline(157, 0, 179, F[4]); S.rect(0, 88, 320, 5, F[3]); S.hline(0, 319, 88, F[4]);
  // the hero: a few pixels on the path
  const path = info.path;
  if (w.u != null && !w.night) {
    const u = w.u, seg = u * (path.length - 1), i = Math.min(path.length - 2, Math.floor(seg)), f = seg - i;
    let x = lerp(path[i][0], path[i + 1][0], f), y = lerp(path[i][1], path[i + 1][1], f);
    const sc = clamp(1.6 - u * 1.1, 0.5, 1.6);
    const hair = heroA.mats[heroA.M.hair].ramp[3], body = heroA.mats[heroA.M.top].ramp[3], cape = heroA.mats[heroA.M.cape].ramp[3];
    const dead = w.flash != null && w.flash > 0;
    if (w.death === 'cliff' && dead) y += w.flash * w.flash * 60, x += w.flash * 8;
    if (w.death === 'slime' && dead) { x += w.flash * 60; y -= Math.sin(Math.min(1, w.flash) * Math.PI) * 40 - w.flash * 20; }
    if (!(dead && w.death === 'flash' && w.flash > 0.3) && !(dead && w.death === 'fire' && w.flash > 0.4)) {
      const hgt = Math.max(2, Math.round(6 * sc)), X = Math.round(x), Y = Math.round(y);
      S.rect(X, Y - hgt, Math.max(1, Math.round(2 * sc)), hgt, body); S.rect(X, Y - hgt - Math.max(1, Math.round(2 * sc)), Math.max(1, Math.round(2 * sc)), Math.max(1, Math.round(2 * sc)), hair);
      if (sc > 1) S.set(X - 1, Y - hgt + 1, cape);
    }
    if (dead && w.death === 'fire' && w.flash < 1.2) { const r = 3 + w.flash * 8; S.ellipse(x, y - 4, r, r * 0.8, RMP('shop.flame2', '#f08a2a', 4)[2]); S.ellipse(x, y - 4, r * 0.6, r * 0.5, RMP('shop.flame3', '#ffd060', 4)[2]); }
    if (dead && w.death === 'slime' && w.flash < 0.4) { const G = RMP('out.slime', '#6acb5a', 5); S.ellipse(x - 6, y - 2, 5, 3.5, G[2]); S.set(Math.round(x - 7), Math.round(y - 3), G[4]); }
  }
  if (flash) {
    const [tx, ty] = info.tower.win;
    for (let r = 0; r < 3; r++) S.ring(tx + 0.5, ty + 0.5, 4 + r * 5, 4 + r * 5, RMP('out.burst', '#fff2c0', 3)[2 - Math.min(2, r)]);
  }
}
function drawTally(S, tl, t) {
  // the inside of the counter's front board, lit from above by the shop; chalk marks in fives
  const W = RMP('A.counter', '#8c4a30', 7, { lo: 0.22, hi: 0.72, at: 3, cool: 330, shift: 0.25 });
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) {
    const board = Math.floor(y / 30), seam = y % 30 === 0;
    const grain = ((x * 7 + board * 131) % 97 < 3) || ((x + y * 3 + board * 17) % 211 < 2);
    S.set(x, y, W[seam ? 1 : grain ? 2 : y < 20 ? 2 : 3]);
  }
  S.rect(0, 0, 320, 14, W[1]); S.hline(0, 319, 14, W[0]);            // the underside of the counter top
  const n = tl.count ?? 0, drawN = tl.draw != null ? tl.draw : 1;
  const mark = (i, part = 1) => {
    const g = Math.floor(i / 5), k = i % 5;
    const gx = 26 + (g % 6) * 46, gy = 40 + Math.floor(g / 6) * 50;
    if (k < 4) { const x = gx + k * 7; for (let y = 0; y < Math.round(30 * part); y++) { S.set(x, gy + y, CH[3]); S.set(x + 1, gy + y, CH[2]); } }
    else { const L = Math.round(34 * part); for (let j = 0; j < L; j++) { const x = gx - 4 + Math.round(j * 0.95), y = gy + 26 - Math.round(j * 0.62); S.set(x, y, CH[3]); S.set(x, y + 1, CH[2]); } }
  };
  for (let i = 0; i < n - 1; i++) mark(i);
  if (n > 0) mark(n - 1, clamp(drawN, 0, 1));
  if (tl.star) {
    const g = Math.floor(n / 5), gx = 26 + (g % 6) * 46 + 10, gy = 40 + Math.floor(g / 6) * 50 + 14;
    const R = 12 * clamp(tl.star, 0, 1);
    const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * 0.45 : R; pts.push([gx + Math.cos(a) * r, gy + Math.sin(a) * r]); }
    if (R > 1) { S.poly(pts, CH[3]); }
  }
  // the chalk and the hand holding it, while drawing
  if (drawN < 1 && n > 0) {
    const i = n - 1, g = Math.floor(i / 5), k = i % 5, gx = 26 + (g % 6) * 46 + (k < 4 ? k * 7 : 12), gy = 40 + Math.floor(g / 6) * 50 + Math.round(30 * drawN);
    S.rect(gx, gy - 2, 3, 6, CH[3]);
    const skin = keeperA.mats[keeperA.M.skin].ramp;
    S.ellipse(gx + 6, gy + 6, 8, 6, skin[3]); S.ellipse(gx + 4, gy + 4, 4, 3, skin[4]); S.ellipse(gx + 14, gy + 16, 9, 7, keeperA.mats[keeperA.M.sleeve].ramp[3]);
  }
  if (tl.stop) { S.rect(0, 0, 320, 180, -1); }
}
function drawTagInsert(S, u) {
  const W = RMP('A.wall', '#a4805c', 7, { lo: 0.3, hi: 0.78, at: 3, cool: 300, shift: 0.22 });
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) S.set(x, y, W[(x % 40 === 0) ? 1 : ((x * 7 + y) % 53 < 2) ? 2 : 3]);
  const P = RMP('shop.paper', '#eadcb8', 6, { lo: 0.5, hi: 0.97 });
  S.rect(100, 50, 120, 84, P[3]); S.hline(100, 219, 50, P[5]); S.vline(100, 50, 133, P[4]); S.hline(100, 219, 133, P[1]); S.vline(219, 51, 133, P[2]);
  S.ellipse(112, 62, 4, 4, W[2]); S.line(112, 20, 112, 58, INK[1]);
  const big = (d, x, y, c) => { const D57 = { 8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'] }[d];
    D57.forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') S.rect(x + i * 7, y + j * 7, 7, 7, c); })); };
  big(0, 164, 66, INK[0]);
  if (u < 0.45) big(8, 116, 66, INK[0]);
  else { big(8, 116, 66, INK[0]); S.rect(116, 66, 36, 50, P[3]); big(5, 116, 66, CH[3]); }
  const hx = u < 0.45 ? 140 : 150 + (u - 0.45) * 60, hy = 110 - Math.sin(u * 12) * 6;
  const skin = keeperA.mats[keeperA.M.skin].ramp;
  S.rect(Math.round(hx) - 2, Math.round(hy) - 14, 5, 12, CH[3]);
  S.ellipse(hx + 8, hy + 6, 16, 12, skin[3]); S.ellipse(hx + 4, hy + 2, 8, 6, skin[4]); S.ellipse(hx + 26, hy + 26, 20, 16, keeperA.mats[keeperA.M.sleeve].ramp[3]);
}
function drawClockInsert(S, c, t) {
  const W = RMP('A.wall', '#a4805c', 7, { lo: 0.3, hi: 0.78, at: 3, cool: 300, shift: 0.22 });
  S.rect(0, 0, 320, 180, W[2]);
  const B = RMP('A.beam', '#4e342a', 6, { lo: 0.16, hi: 0.52, cool: 320, shift: 0.25 }), BR = RMP('shop.brass', '#c79a45', 6, { cool: 20, shift: 0.3 }), CR = RMP('shop.cream', '#e8dcc0', 6, { lo: 0.45, hi: 0.97 });
  S.rect(90, 0, 140, 180, B[2]); S.ellipse(160, 90, 72, 72, BR[2]); S.ellipse(160, 90, 66, 66, CR[4]);
  for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r0 = k % 5 === 0 ? 54 : 58; for (let r = r0; r < 62; r++) S.set(Math.round(160 + Math.sin(a) * r), Math.round(90 - Math.cos(a) * r), k % 5 === 0 ? INK[0] : CR[2]); }
  // the chalk mark he made at 7:12, just outside the dial
  const am = 12 / 60 * Math.PI * 2; for (let r = 63; r < 70; r++) { S.set(Math.round(160 + Math.sin(am) * r), Math.round(90 - Math.cos(am) * r), CH[3]); S.set(Math.round(161 + Math.sin(am) * r), Math.round(90 - Math.cos(am) * r), CH[2]); }
  // time: the minute hand walks up to 12 past, holds one beat, and goes past
  const u = (t - (c.pass - 2.2)), hold = u > 2.2 && u < 2.7;
  const minute = hold ? 12 : u < 2.2 ? 12 - (2.2 - u) * 0.6 : 12 + (u - 2.7) * 0.6;
  const hour = 7 + minute / 60;
  const hand = (a, len, w, c) => { for (let r = 0; r < len; r++) for (let d = -w; d <= w; d++) S.set(Math.round(160 + Math.sin(a) * r + Math.cos(a) * d), Math.round(90 - Math.cos(a) * r + Math.sin(a) * d), c); };
  hand((hour % 12) / 12 * Math.PI * 2, 34, 2, INK[0]); hand(minute / 60 * Math.PI * 2, 52, 1, INK[1]); S.ellipse(160, 90, 4, 4, BR[4]);
}
function drawCandleInsert(S, t) {
  const W = RMP('A.counter', '#8c4a30', 7, { lo: 0.22, hi: 0.72, at: 3, cool: 330, shift: 0.25 });
  S.rect(0, 0, 320, 120, RMP('A.wall', '#a4805c', 7, { lo: 0.3, hi: 0.78, at: 3, cool: 300, shift: 0.22 })[1]); S.rect(0, 120, 320, 60, W[4]); S.hline(0, 319, 120, W[5]);
  const C = RMP('shop.candle', '#efe6cf', 5, { lo: 0.55, hi: 0.97 }), BR = RMP('shop.brass', '#c79a45', 6, { cool: 20, shift: 0.3 });
  S.ellipse(160, 132, 40, 8, BR[2]); S.ellipse(160, 130, 34, 6, BR[4]);
  S.rect(148, 90, 24, 40, C[3]); S.vline(148, 90, 129, C[4]); S.vline(171, 90, 129, C[1]); S.ellipse(160, 90, 12, 3, C[4]);
  S.rect(155, 92, 4, 14, C[4]); S.rect(166, 92, 3, 22, C[2]);
  S.vline(160, 80, 89, INK[0]);
  const f = Math.floor(t * 10) % 3, FL = RMP('shop.flame', '#f08a2a', 4);
  S.ellipse(160 + (f - 1), 70, 5, 11, FL[1]); S.ellipse(160, 73, 3, 7, FL[2]); S.ellipse(160, 75, 2, 3, FL[3]);
  // his hands, folded on the counter, a little further back
  const skin = keeperA.mats[keeperA.M.skin].ramp, sl = keeperA.mats[keeperA.M.sleeve].ramp;
  S.ellipse(250, 128, 30, 10, sl[2]); S.ellipse(232, 124, 14, 8, skin[3]); S.ellipse(244, 122, 12, 7, skin[4]);
}
function drawPortrait(S, u) {
  const W = RMP('A.wall', '#a4805c', 7, { lo: 0.3, hi: 0.78, at: 3, cool: 300, shift: 0.22 });
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) S.set(x, y, W[(x % 36 === 0) ? 1 : 2]);
  const smile = ease(clamp((u - 0.25) / 0.5, 0, 1));
  const D = keeperA, headY = D.hipH + D.waistUp + D.chestUp + D.neckUp + D.headUp;
  const face = smile > 0.5 ? { eyes: 'happy', stache: 0.7 * smile, mouth: { curve: 0.6 } } : { stache: 0.3 * smile, brow: 0.2 };
  const P = pose(D, 'stand', { yaw: 12, face });
  const rig = build(D, P);
  const R = render(S, rig.fig, { x: 160, y: 96 + headY * 5, zoom: 5, mats: D.mats, cam: camera(4) });
  drawFace(S, R, rig, D, P.face);
}
function drawCredits(S, u) {
  S.rect(0, 0, 320, 180, UIc[0]);
  const lines = [['存档点', 6], ['Save Point', 5], ['', 0], ['原案 · 监制', 4], ['yiggeror', 5], ['', 0], ['画面 · 动画 · 配乐', 4], ['全部由代码逐帧生成', 5], ['', 0], ['字体  Fusion Pixel 12px（SIL OFL 1.1）', 4], ['音色  FluidR3 GM', 4], ['', 0], ['（动态分镜：字幕内容为草稿）', 3]];
  let y = Math.round(190 - u * 260);
  for (const [s, c] of lines) { if (s) text(S, s, 110, y, UIc[c], { align: 'center' }); y += 15; }
  // outtakes window on the right
  win(S, 214, 50, 98, 70);
  const k = Math.floor(u * 8) % 4, d = ['fire', 'cliff', 'slime', 'flash'][k];
  const sub = new Surface(90, 62); sub.clear(0);
  drawOutside(sub, 0, 0, 90, 62, { hour: 7.5, t: u * 20, zoom: 1.1, towerFlash: (u * 8) % 1 > 0.6 ? 1 : 0 });
  S.draw(sub, 218, 54);
}

// ------------------------------------------------------------------ the notes strip and post effects
function notes(S, st, t) {
  S.rect(320, 0, 64, 216, UIc[1]); S.rect(0, 180, 320, 36, UIc[1]);
  S.vline(320, 0, 215, UIc[3]); S.hline(0, 319, 180, UIc[3]);
  const idx = TL.SHOTS.indexOf(st.shot) + 1;
  const kindName = { W: '全景', window: '窗', tally: '记号', tag: '价签', clock: '钟', candle: '蜡烛', portrait: '头像', black: '黑场', credits: '字幕' }[st.shot.kind] || st.shot.kind;
  text(S, `#${String(idx).padStart(2, '0')} ${kindName}`, 4, 183, UIc[6]);
  const note = st.shot.note || '';
  text(S, note.length > 25 ? note.slice(0, 25) : note, 60, 183, UIc[5]);
  if (note.length > 25) text(S, note.slice(25, 50), 60, 198, UIc[5]);
  const sec = TL.SECTIONS.find((s) => t >= s.t0 && t < s.t1) || TL.SECTIONS[TL.SECTIONS.length - 1];
  text(S, sec.name, 4, 198, UIc[4]);
  // right: time, cue, bar:beat, tension
  const mm = Math.floor(t / 60), ss = t % 60;
  text(S, `${mm}:${ss.toFixed(1).padStart(4, '0')}`, 324, 3, UIc[5]);
  const cue = TL.CUES.find((c) => t >= c.t0 && t < c.t1 && c.kind !== 'gameover');
  if (cue) {
    text(S, cue.id, 324, 19, UIc[6]);
    const g = cue.grid ? (cue.grid.type === 'accel' ? T.montage : null) : null;
    let bb = null;
    if (cue.kind === 'shopLoop') { const lp = T.loops.find((l) => l.n === cue.loop); bb = lp ? lp.sb(t) : (t - cue.t0) / BEAT; }
    else if (cue.kind === 'montage') bb = T.montage.beats(t);
    else if (cue.grid) bb = (t - cue.grid.t0) * cue.grid.bpm / 60;
    if (bb != null && bb >= 0) text(S, `${Math.floor(bb / 4) + 1}.${Math.floor(bb % 4) + 1}`, 324, 33, UIc[5]);
  }
  const ten = tensionAt(t);
  S.rect(330, 60, 10, 110, UIc[2]);
  const h = Math.round(ten / 10 * 108);
  S.rect(331, 169 - h, 8, h, ten > 7 ? UIc[7] : UIc[6]);
  text(S, '张力', 344, 60, UIc[4]); text(S, ten.toFixed(1), 344, 74, UIc[5]);
}
function fourTone(rgb, u, t) {
  // fade to four warm greys, rows jittering like a tape rewinding
  const pal = [[34, 30, 36], [92, 84, 86], [168, 156, 146], [232, 222, 206]];
  const out = new Uint8Array(rgb.length);
  for (let y = 0; y < 180; y++) {
    const band = Math.floor((y + t * 400) / 12) % 5 === 0, dx = band ? (Math.floor(t * 30 + y) % 3) - 1 : 0;
    for (let x = 0; x < 320; x++) {
      const sx = Math.min(319, Math.max(0, x + dx * 2)), i = (y * 320 + sx) * 3, o = (y * 320 + x) * 3;
      const l = (rgb[i] * 0.3 + rgb[i + 1] * 0.59 + rgb[i + 2] * 0.11) / 255;
      const q = Math.min(3, Math.floor(l * 4 + (bayer(x, y) - 0.5) * 0.5));
      const m = Math.min(1, u * 5);             // fades in fast
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(rgb[i + c] * (1 - m) + pal[Math.max(0, q)][c] * m);
    }
  }
  return out;
}

/** one animatic frame as RGB (AW×AH) */
export function frameRGB(t) {
  const { S, st, grade, black } = film(t);
  let rgb = S.toRGB(grade ? { grade } : {});
  if (st.fx.load != null && st.fx.load < 1) {
    const rows = Math.floor(st.fx.load * 23);
    for (let y = 0; y < 180; y++) {
      const r = Math.floor(y / 8);
      if (r > rows) for (let x = 0; x < 320; x++) rgb.fill(0, (y * 320 + x) * 3, (y * 320 + x) * 3 + 3);
      else if (r === rows) for (let x = 0; x < 320; x++) if ((x + y) % 2) rgb.fill(0, (y * 320 + x) * 3, (y * 320 + x) * 3 + 3);
    }
    if (st.fx.load <= 0) rgb.fill(0);
    const Sv = new Surface(320, 180); if (st.ui.save) saveIcon(Sv, 308, 164, st.ui.save.phase % 1, false);
    const sv = Sv.toRGB({ bg: [-1, -1, -1] });
    for (let i = 0; i < 320 * 180; i++) if (Sv.px[i] >= 0) for (let c = 0; c < 3; c++) rgb[i * 3 + c] = sv[i * 3 + c];
  }
  if (st.fx.rewind != null) rgb = fourTone(rgb, st.fx.rewind, t);
  if (black) {
    rgb.fill(0);
    if (st.ui && st.ui.save) { const Sv = new Surface(320, 180); saveIcon(Sv, 308, 164, st.ui.save.phase % 1, st.ui.save.done); const sv = Sv.toRGB({ bg: [0, 0, 0] }); rgb = sv; }
  }
  // compose with the notes
  const N = new Surface(AW, AH); N.clear(-1); notes(N, st, t);
  const nr = N.toRGB({ bg: [0, 0, 0] });
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) for (let c = 0; c < 3; c++) nr[(y * AW + x) * 3 + c] = rgb[(y * 320 + x) * 3 + c];
  return nr;
}
