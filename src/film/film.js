// The rough animatic (checkpoint 3): every beat of the timeline, blocked with the real set and characters in key
// poses, the real UI, and a notes strip. Characters hold poses between keys (pose-to-pose); positions move, walks
// cycle with planted feet. Frames are 384×216: the 320×180 film frame plus notes on the right and bottom.
import { Surface, ramp, text, textWidth, loadFont, PAL, bayer } from '../pix/gfx.js';
import { build } from '../rig/humanoid.js';
import { render, oblique, camera } from '../rig/sdf.js';
import { drawFace } from '../rig/face.js';
import { pose } from '../rig/poses.js';
import { drawShop, shopLight, LAYOUT, CANDLE, doorBell, shieldProp } from '../set/shop.js';
import { windowInsert, drawView, pathAt, DEATH_U } from '../set/view.js';
import { drawTally as tallyInsert, drawTag as tagInsert, drawReceipt, drawMapInsert as mapInsertDraw, drawPush, drawClock, drawCandle, wallBackdrop, CHALK_ID, shieldFlat, potionUp } from './inserts.js';
import { drawBenchMedium, benchLight, MED } from '../set/medium.js';
import { grader } from '../set/light.js';
import { P as proj, R as RMP, tag as drawTag, digits } from '../set/kit.js';
import { emote } from '../ui/emotes.js';
import { heroHUD, shopMenu, saveIcon, win, num, U } from '../ui/hud.js';
import { TL, DURATION, BEAT, BAR, HERO, GO_LEN, RW_LEN } from './timeline.js';
import { tensionAt } from './beats.js';
import { keeperA } from '../chars/keeperA.js';
import { heroA } from '../chars/heroA.js';
import { newHeroA } from '../chars/newHero.js';
import { actor, STYLE } from '../anim/perform.js';

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
  if (b < H.hop[1] + 0.5) return { ...at(...MK.entry, 10, 'stand', { hipSet: [0, -2.6, 0.4], spine: [0, 16, 0], head: [0, -8, 0], armsSet: { L: { hand: [9, 18, 4], grip: 0.3 }, R: { hand: [-9, 18, 4], grip: 0.3 } } }, { eyes: 'closed', mouth: { grin: 1 } }), blend: 0.07 };   // lands: knees give
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
  const late = react === 'notice' ? 2 : 0;
  if (b < B(H.sword) + late) {
    // waiting for his sword: he looks up at the shelves, at the shield on the wall, back at the keeper — bouncing on his toes
    const k = b - (B(H.slap) + 1.5);
    if (k < 0.9) return at(...MK.counter, HERO_YAW_COUNTER, 'proud', { look: 30 }, { brow: 0.3, mouth: { grin: 1, w: 3 } });
    if (k < 1.8) return at(...MK.counter, HERO_YAW_COUNTER, 'proud', { look: -38 }, { brow: 0.5 });
    return at(...MK.counter, HERO_YAW_COUNTER, 'proud', { look: 0 }, { brow: 0.2, mouth: { grin: 1, w: 3 } });
  }
  if (b < B(H.pose)) {
    // the sword: he holds it up in front of his face (eyes shining), then a practice swing
    const k = b - (B(H.sword) + late), sword = (dir) => [{ hand: 'R', kind: 'sword', dir }];
    if (k < 0.5) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { props: sword([0, -1, 0.3]) }, { eyes: 'wide', mouth: { open: 0.6 } });
    if (k < 1.8) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { props: sword([0, 1, 0]), armsSet: { R: { hand: [-2.2, 30.5, 7.5], grip: 0.95, wrist: [0, 70, 0] } }, head: [0, -4, 4] }, { eyes: 'happy', mouth: { grin: 1, w: 3 } });
    if (k < 2.4) return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { props: sword([0.4, 1, 0.3]), armsSet: { R: { hand: [-9, 33, -2], grip: 0.95, wrist: [0, -20, 0] } }, spine: [-12, -4, 0] }, { eyes: 'open', brow: 0.6, mouth: { curve: 0.6 } });
    return at(...MK.counter, HERO_YAW_COUNTER, 'stand', { props: sword([0.3, -0.4, 1]), armsSet: { R: { hand: [-2, 22, 11], grip: 0.95, wrist: [0, 40, 0] } }, spine: [14, 10, 0] }, { eyes: 'open', brow: 0.8, mouth: { grin: 1 } });
  }
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
    if (b < H.bell + 4.6) return at(...MK.keeper, KEEPER_YAW_HERO, 'stand', {}, { eyes: 'wide', brow: 1.0 });
    if (b < H.bell + 6) return at(...MK.keeper, KEEPER_YAW_HERO, 'glasses', {}, { eyes: 'open', brow: 0.8 });
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
      if (st.hero) st.hero = { ...st.hero, clock: lp.sb(t) * BEAT };            // his idle runs on script time: every loop identical
      if (inside(t, lp.ft(lp.s(HERO.window)), lp.rw[0])) st.windowHero = { lp, u: clamp((lp.sb(t) - lp.s(HERO.window)) / (lp.flashB - lp.s(HERO.window)), 0, 1), death: 'flash', flash: t - lp.flashT };
      if (lp.chalk && inside(t, lp.t0, lp.ft(lp.insert[1]))) st.tally = { count: 1, draw: clamp((t - lp.t0 - 0.9 * BAR) / 0.6, 0, 1) };
      if (lp.tagGlance && inside(t, ...lp.tagGlance)) st.tagInsert = { u: 0 };
      return st;
    }
    if (inside(t, lp.rw[0], lp.rw[1])) {
      // the rewind: the whole day played backwards in RW_LEN seconds, faded to four tones
      const u = (t - lp.rw[0]) / RW_LEN, tb = lerp(lp.rw[0] - 0.01, lp.t0, ease(u));
      const s2 = stateAt(tb);
      s2.t = t; s2.fx.rewind = u; s2.tScene = s2.tScene ?? tb;            // the set runs backwards too: dust, steam, the pendulum
      s2.ui = { emotes: [], save: { phase: -t * 2 } }; s2.windowHero = null; s2.tally = null; s2.tagInsert = null;
      if (lp.ruleCut && t >= lp.ruleCut) { s2.tally = { count: 1, draw: 1, fresh: false }; s2.fx.keepChalk = true; }
      s2.shot = TL.SHOTS.find((s) => t >= s.t0 && t < s.t1) || s2.shot;
      return s2;
    }
  }
  // ---- loop 4's opening: the rule
  if (inside(t, T.loop4.t0, T.loop4.t1)) {
    st.keeper = at(...MK.keeper, 0, 'npcWipe', { phase: 0, counter: 22 });
    const d0 = T.loop4.t0 + 1.2 * BAR;
    st.tally = { count: t < d0 ? 1 : 2, draw: t < d0 ? 1 : clamp((t - d0) / 0.6, 0, 1), fresh: t >= d0, touch: t > T.loop4.t0 + 0.3 * BAR && t < d0 - 0.1 ? 1 : null };
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
    // at the door he finds it: '!' and the item he didn't pay for, the way a game shows a found item
    if (k >= 4.6 && k < 5.2) st.ui.emotes.push({ who: 'hero', kind: '!' });
    if (k >= 5.2 && k < 6.6) st.ui.emotes.push({ who: 'hero', kind: 'potion' });
    if (k >= 8.5 && k < 10) st.ui.emotes.push({ who: 'keeper', kind: '…' });
    st.potionOnCounter = k >= 8.5;
    return st;
  }
  if (gag === 'map') {
    st.keeper = k < 2 ? at(...K, 0, 'npcWipe', { phase: Math.floor(k * 2) % 2, counter: 22 }, { brow: 0.8 }) : at(...K, KEEPER_YAW_HERO, 'stand', {}, k < 5 ? { brow: 0.6 } : { eyes: 'half', browTilt: 1 });
    st.hero = heroQuick(0, 1.5) || (k < 4 ? at(...C, HERO_YAW_COUNTER, 'carry', { headPitch: 22 }, { brow: 0.6, mouth: { grin: 1 } }) : k < 5.5 ? at(...C, 40, 'salute', {}, { brow: 0.6 }) : exitQuick(5.5, 8));
    if (k >= 4.5 && k < 5.5) st.ui.emotes.push({ who: 'hero', kind: '✦' });
    if (k >= 4.6 && k < 6.5) st.ui.emotes.push({ who: 'keeper', kind: '…' });
    if (inside(t, ...T.mapInsert)) st.mapInsert = { u: (t - T.mapInsert[0]) / (T.mapInsert[1] - T.mapInsert[0]) };
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
// hands placed at world points: world [X, Y, Z] → the body coordinates of a character at (x, z) turned by yaw
const toLocal = (W, x, z, yaw) => { const a = -yaw * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), dx = W[0] - x, dz = W[2] - z; return [c * dx + sn * dz, W[1], -sn * dx + c * dz]; };
const QM = { hero: [80, 8], keeper: [111, 12], out: [150, 52], cup: [97, 23, 11] };   // the medium shot's marks
function quietState(st, t) {
  const q = T.quiet;
  st.tScene = t;
  if (t < q.rewind[1]) { st.fx.rewind = (t - q.rewind[0]) / (q.rewind[1] - q.rewind[0]); st.keeper = at(...MK.keeper, 0, 'headDown', { counter: 22 }); return st; }
  const [kx, kz] = QM.keeper, KY = -80, HY = 50, [hx, hz] = QM.hero;
  const cupK = { R: { hand: toLocal(QM.cup, kx, kz, KY), grip: 0.55, wrist: [10, 60, 0] }, L: { hand: toLocal([QM.cup[0] + 1.5, QM.cup[1] - 1.8, QM.cup[2] + 1], kx, kz, KY), grip: 0.2, wrist: [70, -40, 0] } };
  const cupH = (dy = 0, dz = 0) => ({ R: { hand: toLocal([QM.cup[0] - 1, QM.cup[1] + dy, QM.cup[2] + dz], hx, hz, HY), grip: 0.55, wrist: [10, 60, 0] }, L: { hand: toLocal([QM.cup[0] - 2.5, QM.cup[1] - 1.6 + dy, QM.cup[2] + 1.2 + dz], hx, hz, HY), grip: 0.3, wrist: [60, -30, 0] } });
  const cupProp = [{ hand: 'R', kind: 'cup' }];
  // ---- the keeper
  if (t < q.look[0]) st.keeper = at(...MK.keeper, 0, 'stand', { head: [0, 12, 0] }, { eyes: 'half' });
  else if (t < q.look[0] + 1.6) st.keeper = at(...MK.keeper, -40, 'stand', { head: [-30, 4, 0] }, { brow: 0.2 });
  else if (t < q.pour[0]) st.keeper = at(...MK.keeper, -60, 'stand', { head: [-10, 0, 0] }, { brow: 0.3, eyes: 'half' });
  else if (t < q.pour[0] + 0.9) st.keeper = walkAct(keeperA, MK.keeper, MK.tea, q.pour[0], q.pour[0] + 0.9, t, { step: 0.45 });
  else if (t < q.pour[1]) {
    // at the stove, his back to us: takes a cup, pours (the kettle tilts, his elbow lifts), puts the kettle back
    const u = (t - q.pour[0] - 0.9) / (q.pour[1] - q.pour[0] - 0.9);
    st.keeper = at(...MK.tea, -170, 'carry', { headPitch: 24, props: cupProp, armsSet: u > 0.25 && u < 0.8 ? { L: { hand: [5, 27 + Math.sin(u * 12) * 0.4, 7], grip: 0.8, wrist: [0, -40 - (u - 0.25) * 80, 0] } } : {} }, {});
  }
  else if (t < q.toFlap[1] - 0.5) st.keeper = walkAct(keeperA, MK.tea, [MK.flapIn[0] + 6, MK.flapIn[1]], q.pour[1], q.toFlap[1] - 0.5, t, { pose: 'carry', step: 0.45, extra: { props: cupProp } });
  else if (t < q.shatter - 0.35) st.keeper = at(MK.flapIn[0] + 6, MK.flapIn[1], -90, 'carry', { props: cupProp, headPitch: 18 }, { brow: 0.6, eyes: 'open' });   // stops at the edge; looks down at it
  else if (t < q.shatter + 0.25) st.keeper = at(MK.flapIn[0] + 6, MK.flapIn[1], -90, 'carry', { props: cupProp, headPitch: -4, lean: -3 }, { brow: 0.2, stache: 0.2 });  // a breath in
  else if (t < q.medium[0]) st.keeper = walkAct(keeperA, [MK.flapIn[0] + 6, MK.flapIn[1]], [kx + 8, kz + 2], q.shatter + 0.25, q.medium[0] + 0.5, t, { pose: 'carry', step: 0.42, extra: { props: cupProp } });
  else if (t < q.hand[0]) st.keeper = walkAct(keeperA, [kx + 8, kz + 2], [kx, kz], q.medium[0], q.hand[0], t, { pose: 'carry', step: 0.42, extra: { props: cupProp }, yaw: KY });
  else if (t < q.hand[0] + 1.2) st.keeper = at(kx, kz, KY, 'stand', { props: cupProp, armsSet: cupK, spine: [0, 10, 0], head: [0, 12, 0] }, { brow: 0.2, stache: 0.3 });
  else if (t < q.brow) st.keeper = at(kx, kz, KY + 5, 'stand', { head: [0, 8, 0] }, { stache: 0.25 });
  else if (t < q.leave[0]) st.keeper = at(kx, kz, KY + 5, 'stand', { head: [4, 2, -4], shrugBob: 1 }, { browL: 1.5, stache: 0.55, eyes: 'happy' });   // amused
  else if (t < q.leave[1]) st.keeper = walkAct(keeperA, [kx, kz], QM.out, q.leave[0], q.leave[1], t, { step: 0.42 });
  else if (t < q.gifts[0]) st.keeper = null;
  else {
    const G = q.gifts, KG = [kx + 2, kz + 2];
    const carry = { L: { hand: [8, 22.5, 5.5], grip: 0.85, wrist: [0, 20, 0] }, R: { hand: [-3, 24, 7], grip: 0.7, wrist: [10, 60, 0] } };
    const props2 = [{ hand: 'L', kind: 'shield', face: [0, 0, 1] }, { hand: 'R', kind: 'potion' }];
    if (t < G[0] + 1.0) st.keeper = walkAct(keeperA, QM.out, KG, G[0], G[0] + 1.0, t, { step: 0.42, extra: { props: props2, armsSet: carry } });
    else if (t < G[0] + 1.3) st.keeper = at(...KG, -110, 'stand', { props: props2, armsSet: carry, head: [0, 14, 0] }, {});
    else if (t < G[0] + 1.9) st.keeper = at(...KG, -110, 'stand', { props: [{ hand: 'R', kind: 'potion' }], spine: [0, 28, 0], head: [0, 16, 0], armsSet: { L: { hand: toLocal([97, 17.5, 9], ...KG, -110), grip: 0.4, wrist: [60, 0, 0] }, R: carry.R } }, {});
    else if (t < G[0] + 2.4) st.keeper = at(...KG, -110, 'stand', { spine: [0, 26, 0], head: [0, 16, 0], armsSet: { R: { hand: toLocal([101, 17.5, 9], ...KG, -110), grip: 0.4, wrist: [60, 0, 0] } } }, {});
    else if (t < q.receipt[1]) st.keeper = at(...KG, -110, 'stand', { spine: [0, 8, 0], head: [0, 10, 0], armsSet: { R: { hand: [-2.4, 17, 7.5], grip: 0.6, wrist: [30, 40, 0] } }, props: [{ hand: 'R', kind: 'receipt' }] }, { brow: 0.3 });
    else if (t < q.react[0] + 0.5) st.keeper = at(...KG, -110, 'stand', { armsSet: { R: { hand: toLocal([93, 24, 12], ...KG, -110), grip: 0.6, wrist: [0, 60, 0] } }, props: [{ hand: 'R', kind: 'receipt' }] }, { brow: 0.3 });
    else if (t < q.refuse[0] + 0.4) st.keeper = at(...KG, -110, 'stand', { head: [0, 6, 0] }, { eyes: 'happy', stache: 0.4 });
    else if (t < q.refuse[0] + 1.6) st.keeper = at(...KG, -110, 'stand', { armsSet: { R: { hand: toLocal([92, 21, 12.5], ...KG, -110), grip: 0.1, wrist: [60, 0, 0] } }, head: [Math.sin((t - q.refuse[0]) * 10) * 22, 6, 0] }, { eyes: 'happy', stache: 0.5 });
    else st.keeper = at(...KG, -110, 'stand', { head: [0, 4, 0] }, { eyes: 'happy', stache: 0.5 });
  }
  // ---- the hero: the identical entrance (without music), then the bench
  const bellT = q.bell, B = (b) => bellT + (b - HERO.bell) * BEAT;
  const fake = { sb: (tt) => HERO.bell + (tt - bellT) / BEAT, s: (x) => x, ft: (b) => B(b) };
  const sit = (yaw, o = {}, face) => at(hx, hz, yaw, 'sit', { seat: 16, ...o }, face);
  if (t < bellT) st.hero = null;
  else if (t < B(HERO.walk[0])) st.hero = { ...heroInLoop({ ...fake, react: null, flashB: 99 }, t), clock: fake.sb(t) * BEAT };
  else if (t < q.sit - 0.4) st.hero = walkAct(heroA, MK.entry, [hx + 2, hz + 6], B(HERO.walk[0]), q.sit - 0.4, t, { step: 0.36, bounce: 0.2, lean: 12 });
  else if (t < q.sit) st.hero = at(hx + 1, hz + 3, 18, 'stand', { spine: [0, 16, 0], hipSet: [0, -1.5, -1] }, { eyes: 'half' });   // turns his back to the bench, lowers himself
  else if (t < q.hand[0]) st.hero = sit(15, {}, { eyes: 'half', mouth: { open: 0.4 } });
  else if (t < q.hand[0] + 0.6) st.hero = sit(HY, { head: [10, -14, 0] }, { eyes: 'wide', brow: 0.7 });                        // someone is handing him tea?
  else if (t < q.hand[0] + 1.2) st.hero = sit(HY, { spine: [0, 34, 0], head: [0, -6, 0], armsSet: cupH(0.2, 0), props: t >= q.hand[0] + 1.18 ? cupProp : [] }, { eyes: 'wide', brow: 0.5 });
  else if (t < q.hand[1]) st.hero = sit(HY, { spine: [0, 22, 0], head: [0, 24, 0], armsSet: cupH(-1.5, -2.5), props: cupProp }, { eyes: 'open', mouth: { curve: 0.5 } });
  else if (t < q.gulp) st.hero = sit(HY, { spine: [0, 12, 0], head: [0, 8, 0], armsSet: cupH(-0.5, -3), props: cupProp }, { eyes: 'happy', mouth: { curve: 0.6 } });
  else if (t < q.hot) st.hero = sit(HY, { spine: [0, 4, 0], head: [0, -24, 0], armsSet: { R: { hand: [-1.6, 34.5, 5.5], grip: 0.55, wrist: [10, 60, 0] }, L: { hand: [1.5, 30, 6], grip: 0.3 } }, props: cupProp }, { eyes: 'closed' });   // gulp
  else if (t < q.brow + 0.8) {
    const k = Math.floor((t - q.hot) * 9) % 2;
    st.hero = sit(HY, { spine: [0, 10, 0], head: [0, -2, k ? 7 : -7], armsSet: { L: { hand: [2.5, 33.5 + k * 1.6, 7.5], grip: 0, spread: 1, wrist: [0, -80, 0] }, R: { hand: [-6.5, 24, 6], grip: 0.55, wrist: [10, 60, 0] } }, props: cupProp }, { eyes: 'closed', browTilt: 1.3, mouth: { open: 1.5, tongue: 1 } });
  }
  else if (t < q.alone[0] + 0.2) st.hero = sit(HY + 10, { head: [0, 18, 0], armsSet: cupH(-2, -3.5), props: cupProp }, { eyes: 'half', brow: -0.3, mouth: { curve: -0.4 } });   // eyes the cup, wary
  else if (t < q.alone[0] + 1.1) st.hero = sit(HY + 10, { head: [0, 12, 0], armsSet: { R: { hand: [-1.2, 31.5, 6.5], grip: 0.55, wrist: [10, 60, 0] }, L: { hand: [1.8, 29.5, 7], grip: 0.3 } }, props: cupProp }, { eyes: 'half', mouth: { open: 0.6, w: 1 } });   // blows on it
  else if (t < q.alone[0] + 1.7) st.hero = sit(HY + 10, { head: [0, -8, 0], armsSet: { R: { hand: [-1.4, 34, 6], grip: 0.55, wrist: [10, 60, 0] }, L: { hand: [1.5, 30, 6.5], grip: 0.3 } }, props: cupProp }, { eyes: 'closed' });   // a careful sip
  else if (t < q.gifts[0] + 1.2) st.hero = sit(HY + 10, { head: [0, 6, 4], armsSet: cupH(-2.5, -3.5), props: cupProp }, { eyes: 'happy', mouth: { curve: 1, w: 3 }, blush: 0.6 });   // …good
  else if (t < q.react[0]) st.hero = sit(HY, { head: [16, 10, 0], armsSet: cupH(-3, -4), props: cupProp }, { eyes: 'wide', brow: 0.8 });   // what is he doing?
  else if (t < q.refuse[0]) {
    const nod = t > q.react[0] + 0.9 ? Math.max(0, Math.sin((t - q.react[0] - 0.9) * 11)) * 16 : 0;
    const hold = { R: { hand: [-2, 27, 8], grip: 0.6, wrist: [0, 70, 0] }, L: { hand: [-6.5, 23, 5.5], grip: 0.55, wrist: [10, 60, 0] } };
    st.hero = sit(HY, { head: [4, 18 + nod, 0], armsSet: t > q.react[0] + 0.4 ? hold : cupH(-3, -4), props: t > q.react[0] + 0.4 ? [{ hand: 'R', kind: 'receipt' }, { hand: 'L', kind: 'cup' }] : cupProp }, t < q.react[0] + 0.9 ? { eyes: 'wide', brow: 1.0 } : { eyes: 'happy', brow: 0.8, mouth: { grin: 1 } });
  }
  else if (t < q.refuse[0] + 1.6) st.hero = sit(HY, { head: [0, 4, 0], armsSet: { R: { hand: toLocal([93, 21.5, 12], hx, hz, HY), grip: 0.7, wrist: [0, 60, 0] } }, props: [{ hand: 'R', kind: 'pouch' }] }, { eyes: 'open', brow: 0.4, mouth: { open: 0.4 } });   // tries to pay
  else st.hero = sit(HY, { head: [8, 4, 0] }, { eyes: 'happy', brow: 0.5, mouth: { curve: 1, w: 3 }, blush: 0.5 });
  if (inside(t, q.bell, q.bell + 1.1)) st.ui.hud = { gold: 50 };
  if (inside(t, q.look[0] + 1.6, q.look[1])) st.ui.emotes.push({ who: 'keeper', kind: '…' });
  if (inside(t, q.hot, q.hot + 1.4)) st.ui.emotes.push({ who: 'hero', kind: '!' });
  if (inside(t, q.react[0] + 0.15, q.react[0] + 0.9)) st.ui.emotes.push({ who: 'hero', kind: '!' });
  if (inside(t, q.react[0] + 0.9, q.react[1])) st.ui.emotes.push({ who: 'hero', kind: '✦' });
  if (inside(t, q.refuse[0] + 1.6, q.t1)) st.ui.emotes.push({ who: 'hero', kind: '♥' });
  st.boundary = t < q.shatter ? { lit: inside(t, q.shatter - 1.1, q.shatter) ? 1 : 0 } : { shatter: t - q.shatter };
  st.benchGifts = { shield: t >= q.gifts[0] + 1.9, potion: t >= q.gifts[0] + 2.4 };
  st.gifts = 0;
  return st;
}

// ------------------------------------------------------------------ wait
function waitState(st, t) {
  const w = T.wait;
  st.gifts = 0;
  const gear = { gear: { backShield: true } }, sword = [{ hand: 'R', kind: 'sword', dir: [0, -1, 0.3] }];
  const B0 = QM.hero;
  if (t < w.t0 + 0.5) st.hero = at(...B0, 50, 'sit', { seat: 16, extra: gear, props: sword, spine: [0, 34, 0] }, { eyes: 'open', brow: 0.4 });      // leans forward to get up
  else if (t < w.t0 + 0.9) st.hero = at(B0[0] + 1, B0[1] + 3, 80, 'stand', { extra: gear, props: sword, spine: [0, 14, 0] }, { eyes: 'open', brow: 0.6 });
  else if (t < w.leave[1]) st.hero = walkAct(heroA, [B0[0] + 1, B0[1] + 3], MK.door, w.t0 + 0.9, w.leave[1], t, { bounce: 1.0, step: 0.3, extra: { extra: gear, props: sword } });
  else st.hero = null;
  const K = MK.keeper, KG = [QM.keeper[0] + 2, QM.keeper[1] + 2];
  // he watches the hero go, then walks back behind his counter through the open flap (the boundary is gone)
  if (t < w.t0 + 1.4) st.keeper = at(...KG, -140, 'stand', { head: [-10, 0, 0] }, { brow: 0.4, stache: 0.2 });
  else if (t < w.t0 + 3.6) st.keeper = walkAct(keeperA, KG, MK.flapOut, w.t0 + 1.4, w.t0 + 3.6, t, { step: 0.45 });
  else if (t < w.t0 + 4.4) st.keeper = walkAct(keeperA, MK.flapOut, MK.flapIn, w.t0 + 3.6, w.t0 + 4.4, t, { step: 0.45 });
  else if (t < w.t0 + 5.4) st.keeper = walkAct(keeperA, MK.flapIn, K, w.t0 + 4.4, w.t0 + 5.4, t, { step: 0.45 });
  else if (t < w.leave[1] + 1) st.keeper = at(...K, KEEPER_YAW_HERO, 'stand', {}, { brow: 0.4, stache: 0.2 });
  else if (t < w.lapse[0]) st.keeper = at(...K, -20, 'stand', { head: [-30, 4, 0] }, { brow: 0.2 });
  else if (t < w.lapse[1]) {
    // the day going by, in time-lapse: little jobs, each a jump — dusting, counting, the glasses, peeking out, the clock
    const jobs = [['dust', -175, { phase: 0 }], ['dust', -175, { phase: 1 }], ['count', 0, { counter: 22, phase: 0 }], ['count', 0, { counter: 22, phase: 1 }], ['glasses', -20, {}],
      ['peek', -40, { counter: 22 }], ['stand', -150, { head: [-40, -8, 0] }], ['count', 0, { counter: 22, phase: 0 }], ['peek', -40, { counter: 22 }], ['stand', -30, { head: [-30, 2, 0] }]];
    const i = Math.min(jobs.length - 1, Math.floor((t - w.lapse[0]) / (w.lapse[1] - w.lapse[0]) * jobs.length));
    const [p, yaw, o] = jobs[i];
    st.keeper = { ...at(...K, yaw, p, o, p === 'peek' ? { eyes: 'half', brow: 0.3 } : { eyes: 'half' }), blend: 0.08 };
  }
  else st.keeper = at(...K, 0, 'stand', { head: [-30, 4, 0] }, { eyes: t > w.last ? 'half' : 'open', brow: 0.2 });
  if (t > w.candle) st.candle = { lit: true, len: clamp(1 - (t - w.candle) / 20, 0.35, 1) };
  if (inside(t, w.clock[0], w.clock[1])) st.clockInsert = { pass: w.pass, t };
  if (inside(t, ...w.glitch)) { st.fx.glitch = (t - w.glitch[0]) / (w.glitch[1] - w.glitch[0]); st.ui.save = { phase: t * 2 }; }
  if (inside(t, w.tower[0], w.tower[1]) || (t >= w.last - 0.4 && t < w.last + 1.6)) st.windowHero = { night: true, flashes: [...w.flashes, w.last], t };
  return st;
}

// ------------------------------------------------------------------ return
function returnState(st, t) {
  const r = T.ret, w = T.wait;
  st.candle = { lit: false, len: 0.3 };
  st.defeated = true;                                      // outside, the storm over the tower is gone
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
  const sip = Math.floor((t - g.t0) / 2.2) % 3 === 1;
  st.keeper = t < c.push - 0.1 ? (sip ? at(...MK.keeper, 0, 'drink', { props: [{ hand: 'R', kind: 'cup' }], head: [0, -8, 0] }, { eyes: 'closed', stache: 0.2 }) : at(...MK.keeper, 0, 'carry', { headPitch: 18, props: [{ hand: 'R', kind: 'cup' }] }, { eyes: 'half', stache: 0.2 })) :
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

// ------------------------------------------------------------------ the final film: the same blocking, acted
// MODE.final: characters go through the animation layer (blends, anticipation, overlap, idle life, secondary motion);
// otherwise (the animatic) they hold their key poses.
export const MODE = { final: true };
const stCache = new Map();
function stateCached(t) {
  const k = Math.round(t * 4800);
  let s = stCache.get(k);
  if (!s) { if (stCache.size > 3000) stCache.clear(); s = stateAt(t); stCache.set(k, s); }
  return s;
}
const npcify = (a) => (a && a.pose === 'npcWipe' && a.npc == null ? { ...a, npc: true } : a);
const ACT = {
  keeper: actor(keeperA, (t) => npcify(stateCached(t).keeper), STYLE.keeper, 1),
  hero: actor(heroA, (t) => { const s = stateCached(t); return s.heroD && s.heroD !== heroA ? null : s.hero; }, STYLE.hero, 2),
  newHero: actor(newHeroA, (t) => { const s = stateCached(t); return s.heroD === newHeroA ? s.hero : null; }, STYLE.hero, 5),
};
function drawActed(S, D, A, t, extra = {}) {
  const a = A.at(t);
  if (!a) return null;
  const rig = build(D, a.P);
  let [x, y] = proj(a.x, 0, a.z);
  if (extra.map) [x, y] = extra.map(x, y);
  const R = render(S, rig.fig, { x: Math.round(x), y: Math.round(y), z: a.z, zoom: extra.zoom ?? 1, mats: D.mats, cam });
  drawFace(S, R, rig, D, a.P.face);
  return { R, rig, x, y, a };
}

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
    : st.mapInsert ? 'map' : st.shot.kind === 'receipt' ? 'receipt' : st.shot.kind === 'push' ? 'push'
    : st.shot.kind === 'medium' ? 'medium' : (st.shot.kind === 'candle') ? 'candle' : st.tally && (st.shot.kind === 'tally') ? 'tally' : st.shot.kind === 'window' ? 'window' : st.shot.kind === 'black' ? 'black' : 'W';
  st.kind = kind;
  if (kind === 'black') return { S, st, grade: null, black: true };
  if (kind === 'credits') { drawCredits(S, st.credits); return { S, st }; }
  if (kind === 'window') { drawWindowInsert(S, st, t); return { S, st, grade: grader(st.hour, S) }; }
  if (kind === 'tally') { tallyInsert(S, st.tally, t); return { S, st, grade: grader(7.1, S) }; }
  if (kind === 'tag') { tagInsert(S, st.tagInsert.u, t); return { S, st, grade: grader(7.05, S) }; }
  if (kind === 'map') { mapInsertDraw(S, st.mapInsert.u, t); return { S, st, grade: grader(7.1, S) }; }
  if (kind === 'receipt') { drawReceipt(S, (t - st.shot.t0) / (st.shot.t1 - st.shot.t0), t); return { S, st, grade: grader(st.hour, S) }; }
  if (kind === 'push') { drawPush(S, (t - st.shot.t0) / (st.shot.t1 - st.shot.t0), t); return { S, st, grade: grader(7.0, S) }; }
  if (kind === 'clock') { drawClock(S, st.clockInsert, t); if (st.ui.save) saveIcon(S, 308, 164, st.ui.save.phase % 1, false); return { S, st, grade: grader(st.hour, S) }; }
  if (kind === 'candle') { drawCandle(S, t, { len: st.candle ? st.candle.len : 0.5 }); return { S, st, grade: grader(23.5, S) }; }
  if (kind === 'portrait') { drawPortrait(S, st.portrait.u); return { S, st, grade: grader(6.0, S) }; }
  if (kind === 'medium') { drawMediumShot(S, st, t); return { S, st, grade: grader(st.hour, S) }; }
  // ---- the wide shot
  const hour = st.hour;
  const wh = st.windowHero;
  const towerFlash = wh && ((wh.flash > 0 && wh.flash < 0.3) || (wh.night && wh.flashes.some((f) => t >= f && t < f + 0.3))) ? 1 : 0;
  const ts = st.tScene ?? t;
  drawShop(S, { opt: 'A', hour, t: ts, door: st.door, candle: st.candle, clock: hour, towerFlash, battle: wh && wh.night ? wh.flashes : null, defeated: st.defeated });
  if (st.tagChanged) { const L = LAYOUT.shield; drawTag(S, L.x - 7, L.y + 16, 50, tagPal()); chalkOverTag(S, L.x - 5, L.y + 18); }
  if (st.horn === 'wall') hornOnWall(S);
  if (st.horn === 'counter') hornOnCounter(S);
  if (st.potionOnCounter) potionOnCounter(S);
  if (st.gifts) giftsOnBench(S, st.gifts, st.receiptInHand);
  if (st.pushed != null) pushedItems(S, st.pushed);
  const kInfo = MODE.final ? drawActed(S, keeperA, ACT.keeper, t) : drawActor(S, keeperA, st.keeper);
  const hInfo = MODE.final ? drawActed(S, st.heroD || heroA, st.heroD === newHeroA ? ACT.newHero : ACT.hero, t) : drawActor(S, st.heroD || heroA, st.hero);
  if (st.horn === 'carried' && hInfo) hornShape(S, Math.round(hInfo.x) - 14, Math.round(hInfo.R.y0) + 10, 1);
  if (st.receiptInHand && hInfo) receiptInHand(S, Math.round(hInfo.x) + RIH[0], Math.round(hInfo.y) + RIH[1]);
  if (st.boundary) drawBoundary(S, st.boundary, t);
  if (st.grid) drawGrid(S, st.grid.flash);
  shopLight(S, { hour, candle: st.candle, t: ts });
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

// ------------------------------------------------------------------ the medium shot of the bench
function drawMediumShot(S, st, t) {
  const hour = st.hour, ts = st.tScene ?? t;
  drawBenchMedium(S, { hour, t: ts });
  const map = (x, y) => [MED.x(x), MED.y(y)];
  if (st.benchGifts) {
    // the shield lying on the seat beside him, the potion standing next to it
    const [sx, sy] = map(...proj(97, 16.3, 6.5));
    if (st.benchGifts.shield) shieldFlat(S, Math.round(sx), Math.round(sy), 13, 6);
    const [px, py] = map(...proj(102.5, 16.3, 5));
    if (st.benchGifts.potion) potionUp(S, Math.round(px) - 8, Math.round(py) - 21, 2);
  }
  const kInfo = MODE.final ? drawActed(S, keeperA, ACT.keeper, t, { zoom: 2, map }) : null;
  const hInfo = MODE.final ? drawActed(S, heroA, ACT.hero, t, { zoom: 2, map }) : null;
  benchLight(S, { hour, t: ts });
  const heads = { keeper: kInfo, hero: hInfo };
  for (const e of st.ui.emotes) { const h = heads[e.who]; if (!h) continue; emote(S, e.kind, Math.round(h.x + 12), Math.round(h.R.y0 + 2)); }
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
function giftsOnBench(S, u, inHand) {
  const pal = { iron: RMP('shop.iron', '#6f7580', 6, { cool: 260 }), steel: RMP('shop.steel', '#aab4c2', 6, { cool: 250, hi: 0.97 }), trim: RMP('A.trim', '#c49a66', 6, { lo: 0.34, hi: 0.88, cool: 320, shift: 0.25 }) };
  if (u > 0.1) { shieldProp(S, pal, 100, 104); }
  if (u > 0.45) { S.rect(90, 104, 4, 5, RMP('shop.red', '#c2413d', 6, { cool: 330 })[3]); S.rect(91, 102, 2, 2, RMP('shop.cork', '#b98a58', 6)[3]); }
  const p = RMP('shop.paper', '#eadcb8', 6, { lo: 0.5, hi: 0.97 });

}
const RIH = [5, -24];
function receiptInHand(S, x, y) {
  // the receipt held up in both hands: paper, the blue doodle and the red circle, tiny
  const p = RMP('shop.paper', '#eadcb8', 6, { lo: 0.5, hi: 0.97 }), red = RMP('ins.redp2', '#d0443a', 3)[1], blue = RMP('ins.blue2', '#3f68c2', 3)[1];
  S.rect(x, y, 9, 7, p[4]); S.hline(x, x + 8, y, p[5]); S.hline(x, x + 8, y + 6, p[2]); S.vline(x + 8, y + 1, y + 6, p[3]);
  S.set(x + 4, y + 3, blue); S.set(x + 5, y + 3, blue); S.set(x + 4, y + 4, blue); S.set(x + 3, y + 2, blue); S.set(x + 6, y + 2, blue); S.set(x + 2, y + 1, red); S.set(x + 3, y + 1, red);
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
  const o = { hour: w.night ? 23.4 : st.hour, t };
  if (w.night) {
    // the night battle: bursts round the tower, the eye flaring with each; the keeper's candle reflected in the glass
    o.battle = w.flashes; o.candle = true;
    if (w.flashes.some((f) => t >= f && t < f + 0.3)) o.eye = 1;
  } else if (w.u != null) {
    const dt = w.flash;                                    // seconds since the death (negative before)
    // the same day every loop: the world outside runs on the loop's script time
    o.t = w.lp ? 100 + w.lp.sb(t) * BEAT : t;
    o.hero = { u: w.u, death: w.death, dt, t, from: w.lp ? undefined : DEATH_U[w.death] - (w.death === 'slime' ? 0.1 : 0.14) };
    if (w.death === 'flash' && dt >= 0 && dt < 0.3) { o.eye = 1; o.flash = Math.max(0, 1 - dt / 0.2); }
    if (w.death === 'fire' && dt > -1.2 && dt < -0.8) o.eye = 1;
  }
  windowInsert(S, o);
}
function drawPortrait(S, u) {
  wallBackdrop(S);
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
  const lines = [['存档点', 6], ['Save Point', 5], ['', 0], ['原案 · 监制', 4], ['yiggeror', 5], ['', 0], ['画面 · 动画 · 配乐', 4], ['全部由代码逐帧生成', 5], ['', 0],
    ['字体  Fusion Pixel 12px', 4], ['（SIL OFL 1.1）', 3], ['音色  FluidR3 GM', 4], ['录音音效  Kenney · rubberduck', 4], ['· qubodup（CC0）', 4], ['', 0], ['谢谢观看', 5]];
  let y = Math.round(190 - u * 260);
  for (const [s, c] of lines) { if (s) text(S, s, 110, y, UIc[c], { align: 'center' }); y += 15; }
  // outtakes window on the right
  win(S, 214, 50, 98, 70);
  const k = Math.floor(u * 8) % 4, d = ['fire', 'cliff', 'slime', 'flash'][k], uu = (u * 8) % 1;
  const sub = new Surface(90, 62); sub.clear(0);
  const [dx, dy] = pathAt(DEATH_U[d]), ox = Math.round(clamp(dx - 45, 0, 230)), oy = Math.round(clamp(dy - 40, 0, 118));
  const dt = (uu - 0.5) * (T.credits.t1 - T.coda.t1) / 8;
  drawView(sub, -ox, -oy, 320, 180, { hour: 7.5, t: 100 + uu * 4, lod: 'insert', hero: { u: clamp(uu / 0.5, 0, 1), death: d, dt, t: u * 30, from: DEATH_U[d] - 0.1 }, eye: d === 'flash' && dt >= 0 && dt < 0.3 ? 1 : 0 });
  S.draw(sub, 218, 54);
}

// ------------------------------------------------------------------ the notes strip and post effects
function notes(S, st, t) {
  S.rect(320, 0, 64, 216, UIc[1]); S.rect(0, 180, 320, 36, UIc[1]);
  S.vline(320, 0, 215, UIc[3]); S.hline(0, 319, 180, UIc[3]);
  const idx = TL.SHOTS.indexOf(st.shot) + 1;
  const kindName = { W: '全景', window: '窗', tally: '记号', tag: '价签', clock: '钟', candle: '蜡烛', portrait: '头像', black: '黑场', credits: '字幕', receipt: '收据', map: '地图', push: '柜台', medium: '中景' }[st.shot.kind] || st.shot.kind;
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
function fourTone(rgb, u, t, keep) {
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
      if (keep && keep.id[y * 320 + x] === CHALK_ID) { for (let c = 0; c < 3; c++) out[o + c] = rgb[o + c]; continue; }   // the chalk doesn't rewind
      for (let c = 0; c < 3; c++) out[o + c] = Math.round(rgb[i + c] * (1 - m) + pal[Math.max(0, q)][c] * m);
    }
  }
  return out;
}

/** both versions of a frame: the clean 320×180 film frame and the review frame with the notes strip (AW×AH) */
export function frames(t) {
  const { rgb, st } = picture(t);
  return { clean: rgb, review: withNotes(rgb, st, t) };
}
/** one frame as RGB: with the notes strip (AW×AH, the review version) or the clean 320×180 film frame */
export function frameRGB(t, o = { notes: true }) {
  const { rgb, st } = picture(t);
  return o.notes ? withNotes(rgb, st, t) : rgb;
}
function withNotes(rgb, st, t) {
  const N = new Surface(AW, AH); N.clear(-1); notes(N, st, t);
  const nr = N.toRGB({ bg: [0, 0, 0] });
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) for (let c = 0; c < 3; c++) nr[(y * AW + x) * 3 + c] = rgb[(y * 320 + x) * 3 + c];
  return nr;
}
function picture(t) {
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
  if (st.fx.rewind != null) rgb = fourTone(rgb, st.fx.rewind, t, st.fx.keepChalk ? S : null);
  // 7:12: the rewind starts — flickers — and doesn't happen
  if (st.fx.glitch != null && st.fx.glitch < 0.9 && Math.floor(t * 16) % 3 !== 2) rgb = fourTone(rgb, 0.12 + 0.1 * st.fx.glitch, t);
  if (black) {
    rgb.fill(0);
    if (st.ui && st.ui.save) { const Sv = new Surface(320, 180); saveIcon(Sv, 308, 164, st.ui.save.phase % 1, st.ui.save.done); const sv = Sv.toRGB({ bg: [0, 0, 0] }); rgb = sv; }
  }
  return { rgb, st };
}
