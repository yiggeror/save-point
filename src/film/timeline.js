// The film's one timeline, laid out in bars. Picture, UI, sound effects and the score all read from here, so a
// slap lands on a downbeat because the downbeat is where the slap is written.
//
// The shop music is 120 bpm, 4/4. A "loop" is one day the hero lives through: the shop music starts from bar 1,
// two bars of the shopkeeper's NPC idle, the bell on bar 3, and the hero's entrance, identical to the frame every
// time. Within a loop, "script time" (in beats) is what the characters act to; film time can run faster than
// script time (the ▶▶ fast-forward), and the music follows the script, so it speeds up with it.

export const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const FPS = 24;

/** constant tempo; bars count from 1 */
export class Grid {
  constructor(t0, bpm = BPM, meter = 4) { this.t0 = t0; this.bpm = bpm; this.b = 60 / bpm; this.m = meter; }
  at(bar, beat = 0) { return this.t0 + ((bar - 1) * this.m + beat) * this.b; }
  beats(t) { return (t - this.t0) / this.b; }
  get bar() { return this.m * this.b; }
  spec() { return { type: 'grid', t0: this.t0, bpm: this.bpm, meter: this.m }; }
}
/** an accelerando: tempo rises linearly (per beat) from bpm0 to bpm1 over nb bars, then holds */
export class Accel {
  constructor(t0, bpm0, bpm1, nb) { this.t0 = t0; this.p0 = bpm0; this.p1 = bpm1; this.NB = nb * 4; }
  tb(B) {                     // time of beat index B
    const { p0, p1, NB } = this;
    if (B <= NB) { const p = p0 + (p1 - p0) * B / NB; return this.t0 + 60 * NB / (p1 - p0) * Math.log(p / p0); }
    return this.tb(NB) + (B - NB) * 60 / p1;
  }
  at(bar, beat = 0) { return this.tb((bar - 1) * 4 + beat); }
  beats(t) { let lo = 0, hi = 4000; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (this.tb(m) < t) lo = m; else hi = m; } return lo; }
  bpmAt(B) { return B >= this.NB ? this.p1 : this.p0 + (this.p1 - this.p0) * B / this.NB; }
  spec() { return { type: 'accel', t0: this.t0, bpm0: this.p0, bpm1: this.p1, bars: this.NB / 4 }; }
}
export const beatOf = (bar, beat = 0) => (bar - 1) * 4 + beat;

// ------------------------------------------------------------------ the hero's script (identical every loop)
// positions in script beats (bar, beat); the entrance up to the slap never changes
export const HERO = {
  bell: beatOf(3, 0), hop: [beatOf(3, 0), beatOf(3, 1.5)], look: [beatOf(3, 1.5), beatOf(5, 0)],
  walk: [beatOf(5, 0), beatOf(6, 2)], plant: beatOf(6, 2), slap: beatOf(7, 0),
  menu: beatOf(7, 2), cursor: beatOf(7, 3), pick: beatOf(7, 3.5), sword: beatOf(8, 0), pay: beatOf(8, 1),
  pose: beatOf(9, 0), turn: beatOf(10, 0), exit: [beatOf(10, 0), beatOf(11, 0)], bellOut: beatOf(11, 0),
  window: beatOf(11, 2), stop: beatOf(12, 3.5), flash: beatOf(13, 0),
};
export const GO_DELAY = 0.9, GO_LEN = 3.0, RW_LEN = 1.5;   // game over jingle after the flash, then the rewind

/** a loop: t0 = film time of script beat 0. shift: extra beats inserted before the slap (the hint in loop 3).
 * ff: [fromBeat, rate] fast-forward from that script beat to the flash. */
function makeLoop(n, t0, o = {}) {
  const shift = o.shift || 0;
  const s = (b) => (b >= HERO.slap - 0.001 ? b + shift : b);         // script beat after the hint
  const flashB = s(HERO.flash), stopB = s(HERO.stop);
  const ff = o.ff ? { b0: o.ff[0], rate: o.ff[1] } : null;
  const ft = (b) => {                                                 // script beat → film time
    if (!ff || b <= ff.b0) return t0 + b * BEAT;
    return t0 + ff.b0 * BEAT + (b - ff.b0) * BEAT / ff.rate;
  };
  const sb = (t) => {                                                 // film time → script beat
    const tf = ff ? t0 + ff.b0 * BEAT : Infinity;
    if (t <= tf) return (t - t0) / BEAT;
    return ff.b0 + (t - tf) * ff.rate / BEAT;
  };
  const flashT = ft(flashB), goT = flashT + GO_DELAY, rw0 = goT + GO_LEN, rw1 = rw0 + RW_LEN;
  return { ...o, n, t0, s, ft, sb, ff, shift, flashB, stopB, stopT: ft(stopB), flashT, goT, rw: [rw0, rw1], t1: rw1 };
}

// ------------------------------------------------------------------ build
function build() {
  const T = {}, EV = [], SHOTS = [], CUES = [], SECTIONS = [];
  const ev = (t, kind, o = {}) => EV.push({ t: +t.toFixed(4), kind, ...o });
  const shot = (t0, t1, kind, note, o = {}) => SHOTS.push({ t0: +t0.toFixed(4), t1: +t1.toFixed(4), kind, note, ...o });
  const section = (id, name, t0, t1) => SECTIONS.push({ id, name, t0: +t0.toFixed(4), t1: +t1.toFixed(4) });

  // ---------------- ① opening: black, the save icon, the map loading row by row
  T.saveIcon = [0.3, 1.6];
  for (let t = 0.5; t < 1.6; t += 0.55) ev(t, 'saveTick');
  T.map = [1.6, 5.3]; T.mapRows = 23;
  for (let i = 0; i < T.mapRows; i++) ev(T.map[0] + (T.map[1] - T.map[0]) * i / T.mapRows, 'mapRow', { i });
  shot(0, 1.6, 'black', '黑场，存档图标在转');
  shot(1.6, 6.3, 'W', '道具店像读地图一样一行一行铺出来', { load: true });

  // ---------------- ② – ③ loops 1–3 and the start of 4
  const L = [];
  L.push(makeLoop(1, 6.3));
  L.push(makeLoop(2, L[0].t1, { react: 'notice', ff: [HERO.sword + 2.5, 3] }));
  L.push(makeLoop(3, L[1].t1, { react: 'hint', shift: 4, insert: [beatOf(1), beatOf(3)], chalk: 1, ff: [beatOf(8, 2) + 4, 3] }));
  const L4 = { n: 4, t0: L[2].t1 };
  L4.insert = [L4.t0, L4.t0 + 2 * BAR]; L4.t1 = L4.insert[1];
  T.loops = L; T.loop4 = L4;
  section('open', '开场', 0, 6.3);
  section('first', '第一次', 6.3, L[0].t1);
  section('discover', '发现', L[1].t0, L4.t1);

  for (const lp of L) {
    const g = new Grid(lp.t0);
    CUES.push({ id: `shop${lp.n}`, name: `商店 BGM · 第 ${lp.n} 轮`, kind: 'shopLoop', t0: lp.t0, t1: lp.stopT, loop: lp.n,
      map: { t0: lp.t0, ff: lp.ff ? { b0: lp.ff.b0, rate: lp.ff.rate } : null, shift: lp.shift, stopB: lp.stopB } });
    CUES.push({ id: `go${lp.n}`, name: '窗外的"游戏结束"', kind: 'gameover', t0: lp.goT, t1: lp.goT + GO_LEN });
    // sound events of the script (in film time)
    const at = (b) => lp.ft(lp.s(b));
    ev(at(HERO.bell), 'bell'); ev(at(HERO.hop[1]), 'land');
    for (let b = HERO.walk[0]; b < HERO.walk[1]; b += 0.5) ev(at(b), 'step', { who: 'hero' });
    ev(at(HERO.slap), 'slap'); ev(at(HERO.menu), 'menuOpen'); ev(at(HERO.cursor), 'blip'); ev(at(HERO.pick), 'select');
    const late = lp.react === 'notice' ? 2 : 0;
    ev(at(HERO.sword + late), 'handover'); for (let k = 0; k < 4; k++) ev(at(HERO.pay + late + k * 0.25), 'coin', { k });
    ev(at(HERO.pose), 'pose');
    for (let b = HERO.exit[0]; b < HERO.exit[1]; b += 0.5) ev(at(b), 'step', { who: 'hero' });
    ev(at(HERO.bellOut), 'bell'); ev(at(HERO.bellOut) + 0.35, 'doorClose');
    ev(lp.flashT, 'flash'); ev(lp.flashT + 0.12, 'thud');
    ev(lp.rw[0], 'rewind', { dur: RW_LEN, from: lp.t0 });
    if (lp.ff) ev(lp.ft(lp.ff.b0), 'ff', { rate: lp.ff.rate });
    // shots
    const wide0 = lp.insert ? lp.ft(lp.insert[1]) : lp.t0;
    if (lp.insert) shot(lp.t0, wide0, 'tally', lp.chalk === 1 ? '柜台底下：第一道记号' : '柜台底下', { count: lp.chalk, draw: true });
    if (lp.react === 'hint') {
      // the keeper points at the shield: a glance at its tag (80), then the hero's purse (50)
      lp.tagGlance = [at(HERO.plant - 0.5), at(HERO.plant + 1.5)];
      shot(wide0, lp.tagGlance[0], 'W', loopNote(lp));
      shot(lp.tagGlance[0], lp.tagGlance[1], 'tag', '价签特写：盾 80', { still: true });
      shot(lp.tagGlance[1], at(HERO.window), 'W', '勇者看钱袋（50），摇头，照样买木剑；快进');
    } else shot(wide0, at(HERO.window), 'W', loopNote(lp));
    shot(at(HERO.window), lp.goT + GO_LEN, 'window', '窗外：山路、塔、一闪', { death: 'flash', loop: lp.n });
    if (lp.chalk) {
      // the rule, shown: the rewind sweeps over the board under the counter and the chalk mark alone stays
      lp.ruleCut = lp.rw[0] + 0.6;
      shot(lp.rw[0], lp.ruleCut, 'W', '读档：褪成 4 色，一切倒着走', { rewind: true, loop: lp.n });
      shot(lp.ruleCut, lp.rw[1], 'tally', '读档扫过柜台底下：一切都褪色倒走，只有粉笔记号不变', { count: 1, rewind: true, loop: lp.n });
    } else shot(lp.rw[0], lp.rw[1], 'W', '读档：褪成 4 色，一切倒着走', { rewind: true, loop: lp.n });
    if (lp.chalk) ev(lp.t0 + 0.9 * BAR, 'chalk');
  }
  shot(L4.insert[0], L4.insert[1], 'tally', '记号还在。店主的手先摸了摸它，再画上第二道', { count: 2, draw: true, rule: true });
  ev(L4.insert[0] + 1.2 * BAR, 'chalk');
  CUES.push({ id: 'shop4', name: '商店 BGM · 第 4 轮（前两小节）', kind: 'shopLoop', t0: L4.t0, t1: L4.t1, loop: 4, map: { t0: L4.t0, ff: null, shift: 0, stopB: 8 }, tail: true });

  // ---------------- ④ montage: one continuous piece, accelerating; each loop shorter
  const M = new Accel(L4.t1, BPM, 168, 20);
  T.montage = M;
  const mb = (bar, beat = 0) => M.at(bar, beat);
  const ML = [
    // [first bar, bars, gag, death]
    [1, 5, 'tag', 'fire'], [6, 4, 'potion', 'cliff'], [10, 1, 'tally', null, 9], [11, 3, 'map', 'slime'], [14, 3, 'wall', 'flash'],
    [17, 1, 'tally', null, 14], [18, 1, 'rapid1', 'flash'], [19, 1, 'rapid2', 'cliff'], [20, 1, 'rapid3', 'slime'], [21, 1, 'rapid4', 'fire'],
    [22, 1, 'tally', null, 23],
  ];
  T.montageLoops = ML;
  const mEnd = mb(23);
  section('montage', '蒙太奇', L4.t1, mEnd);
  CUES.push({ id: 'montage', name: '蒙太奇：同一首主题，越来越快', kind: 'montage', t0: M.t0, t1: mEnd, grid: M.spec(), loops: ML });
  for (const [b0, n, gag, death, cnt] of ML) {
    const t0 = mb(b0), t1 = mb(b0 + n);
    if (gag === 'tally') { shot(t0, t1, 'tally', cnt === 23 ? '记号：23。粉笔停住' : `记号：${cnt}`, { count: cnt, montage: true }); ev(t0 + 0.1, 'chalk'); continue; }
    if (gag === 'tag') {
      shot(t0, mb(b0 + 1), 'tag', '价签特写：粉笔把 8 描成 5', { montage: true });
      shot(mb(b0 + 1), mb(b0 + n - 1), 'W', '改价签：勇者看见 50 眼睛发亮——菜单里还是 80', { gag, montage: true });
      ev(t0 + 0.2, 'chalk');
    } else if (gag === 'rapid1' || gag === 'rapid2' || gag === 'rapid3' || gag === 'rapid4') {
      const notes = { rapid1: '店主抱着胳膊跺脚', rapid2: '店主趴在柜台上', rapid3: '店主面无表情提前把木剑递到半空', rapid4: '店主跟着勇者一起摆英雄姿势' };
      shot(t0, mb(b0, 2.5), 'W', notes[gag], { gag, montage: true });
      shot(mb(b0, 2.5), t1, 'window', '窗外', { death, montage: true });
      ev(mb(b0, 2.5) + 0.05, 'deathFx', { death });
      ev(t0, 'bell'); ev(t0, 'rewindWhoosh');
      continue;
    } else {
      const notes = { potion: '塞药水：勇者走到门口发现了（道具图标），一脸正直地放回柜台', map: '收据背面画地图：勇者认真点头——', wall: '想走出柜台：撞上碰撞格子，被弹回来' };
      if (gag === 'map') {
        T.mapInsert = [mb(b0, 2), mb(b0 + 1, 0.5)];
        shot(t0, T.mapInsert[0], 'W', notes[gag], { gag, montage: true });
        shot(T.mapInsert[0], T.mapInsert[1], 'map', '地图特写：他拿倒了（塔倒挂、N 朝下），还在使劲点头', { montage: true });
        shot(T.mapInsert[1], mb(b0 + n - 1), 'W', '敬礼出门。店主扶额', { gag, montage: true });
      } else shot(t0, mb(b0 + n - 1), 'W', notes[gag], { gag, montage: true });
    }
    shot(mb(b0 + n - 1), t1, 'window', '窗外', { death, montage: true });
    ev(mb(b0 + n - 1, 2) + 0.05, 'deathFx', { death });
    ev(gag === 'tag' ? mb(b0 + 1) : t0, 'bell'); ev(t0, 'rewindWhoosh');
    if (gag === 'wall') { ev(mb(b0, 2), 'boing'); ev(mb(b0, 2), 'gridFlash'); }
    if (gag === 'potion') { ev(mb(b0 + 1, 2), 'potionClink'); }
    if (gag === 'map') { ev(mb(b0, 1), 'scribble'); }
  }
  ev(mEnd, 'hardStop');

  // ---------------- ⑤ quiet: no music, then a music box after the boundary breaks
  const Q = mEnd;
  T.quiet = {
    t0: Q, rewind: [Q, Q + 1.0], bell: Q + 2.0, sit: Q + 6.8, look: [Q + 8.2, Q + 12.0], pour: [Q + 12.0, Q + 15.2],
    toFlap: [Q + 15.2, Q + 17.0], shatter: Q + 17.4, walk: [Q + 18.2, Q + 22.0], hand: [Q + 22.0, Q + 24.0], gulp: Q + 24.6,
    hot: Q + 25.4, brow: Q + 26.8, leave: [Q + 27.4, Q + 28.4], alone: [Q + 28.4, Q + 30.2], gifts: [Q + 30.2, Q + 33.0],
    receipt: [Q + 33.0, Q + 37.4], react: [Q + 37.4, Q + 39.2], refuse: [Q + 39.2, Q + 41.6], t1: Q + 42.2, medium: [Q + 21.3, Q + 33.0],
  };
  const q = T.quiet;
  section('quiet', '安静', Q, q.t1);
  ev(q.rewind[0], 'rewind', { dur: 1.0, short: true }); ev(q.bell, 'bell'); ev(q.sit, 'benchSit'); ev(q.pour[0] + 0.4, 'pour', { dur: 2.6 });
  ev(q.shatter, 'shatter'); for (let t = q.walk[0]; t < q.walk[1]; t += 0.5) ev(t, 'step', { who: 'keeper' });
  ev(q.hand[0] + 1.2, 'cupPass'); ev(q.gulp, 'gulp'); ev(q.hot, 'hot');
  for (let t = q.leave[0] + 0.3; t < q.leave[1]; t += 0.45) ev(t, 'step', { who: 'keeper' });
  ev(q.alone[0] + 0.3, 'blow'); ev(q.alone[0] + 1.3, 'sip');
  for (let t = q.gifts[0]; t < q.gifts[0] + 0.8; t += 0.45) ev(t, 'step', { who: 'keeper' });
  ev(q.gifts[0] + 1.3, 'shieldSet'); ev(q.gifts[0] + 1.9, 'potionSet'); ev(q.receipt[0] - 0.3, 'paper');
  for (const f of [0.08, 0.2, 0.33, 0.46, 0.62, 0.75]) ev(q.receipt[0] + f * (q.receipt[1] - q.receipt[0]), 'scribble');
  ev(q.react[0] + 0.3, 'paper');
  const MB = new Grid(q.shatter + 0.6, 84, 4);
  T.musicBox = MB;
  CUES.push({ id: 'musicbox', name: '安静：八音盒，主题放慢', kind: 'musicbox', t0: MB.t0, t1: q.t1, grid: MB.spec(), fermata: [q.hand[1] - 0.2, q.brow + 0.6], hot: q.hot });
  shot(Q, q.rewind[1], 'W', '读档（最后一次）', { rewind: true });
  shot(q.rewind[1], q.medium[0], 'W', '勇者没有走向柜台，在长凳上坐下。安静。店主第一次走出柜台（在边界前停了一下），边界碎开', {});
  shot(q.medium[0], q.leave[1], 'medium', '中景：递茶、双手接杯、一口喝下、太烫、吐舌头扇风。店主挑眉，转身出画', {});
  shot(q.leave[1], q.gifts[0], 'medium', '中景：勇者一个人对着茶吹气，小心地抿一口——好喝', {});
  shot(q.gifts[0], q.receipt[0], 'medium', '中景：店主拿着盾和药水回来，放在他身边，掏出收据和红蓝铅笔', {});
  shot(q.receipt[0], q.receipt[1], 'receipt', '收据特写：蓝笔画魔王（弯角和塔顶的角一样），红笔圈住左边的角，剑和箭头指过去', {});
  shot(q.receipt[1], q.t1, 'medium', '中景：勇者接过收据："!"，眼睛发亮，用力点头。要付钱，店主把钱袋按回去，摇头', {});

  // ---------------- ⑥ the wait: the clock goes past 7:12; day, dusk, night; flashes; no game over
  const Wt = q.t1;
  T.wait = {
    t0: Wt, leave: [Wt, Wt + 2.4], clock: [Wt + 2.8, Wt + 6.8], pass: Wt + 5.0, lapse: [Wt + 6.8, Wt + 13.8], candle: Wt + 12.4,
    tower: [Wt + 13.8, Wt + 17.6], flashes: [Wt + 14.4, Wt + 15.6, Wt + 16.8], candleShot: [Wt + 17.6, Wt + 20.2], last: Wt + 22.4, t1: Wt + 25.0,
  };
  const w = T.wait;
  section('wait', '等待', Wt, w.t1);
  ev(w.leave[0] + 0.6, 'bell'); ev(w.pass, 'clockPass'); ev(w.candle, 'match');
  ev(Wt + 0.2, 'benchSit', { up: true });
  for (let t = Wt + 0.95; t < w.leave[1]; t += 0.3) ev(t, 'step', { who: 'hero' });
  for (let t = Wt + 1.5; t < Wt + 5.4; t += 0.45) ev(t, 'step', { who: 'keeper' });
  w.glitch = [w.pass - 0.45, w.pass + 0.15];                 // at 7:12 the picture starts to rewind … and doesn't
  ev(w.glitch[0], 'saveTick'); ev(w.glitch[0], 'rewindAbort');
  for (const f of w.flashes) ev(f, 'towerFlash'); ev(w.last, 'towerFlash', { last: true });
  for (let t = Wt + 0.5; t < w.t1; t += 1.0) ev(t, 'tick');
  CUES.push({ id: 'wait', name: '等待：钟的滴答是节拍，和声悬着', kind: 'wait', t0: Wt, t1: w.t1, grid: new Grid(Wt + 0.5, 60).spec(), flashes: [...w.flashes, w.last], firstNote: w.flashes[0] + 0.7 });
  shot(Wt, w.clock[0], 'W', '勇者背着盾出门。店主回到柜台后面', { hour: 7.15 });
  shot(w.clock[0], w.clock[1], 'clock', '钟：分针走到 7:12，画面开始褪色、存档图标出现（要读档了）——停住了。分针走过去');
  shot(w.lapse[0], w.lapse[1], 'W', '光斑移过地板，黄昏，夜。店主点上蜡烛', { lapse: true });
  shot(w.tower[0], w.tower[1], 'window', '窗外：塔上一闪一闪……没有"游戏结束"', { night: true, death: 'battle' });
  shot(w.candleShot[0], w.candleShot[1], 'candle', '蜡烛短了一截，交叉的手');
  shot(w.candleShot[1], w.t1, 'W', '夜最深。最后一闪。什么也没有', { hour: 3.2 });

  // ---------------- ⑦ return: the bell resolves the chord; the theme closes for the first time
  const R = new Grid(w.t1 + 0.6, 100);
  T.ret = { grid: R, bell: R.at(1), enter: [R.at(1), R.at(2, 2)], thunk: R.at(3), smile: [R.at(4), R.at(5)], wave: [R.at(5), R.at(6, 2)],
    horn: [R.at(6, 2), R.at(8)], star: R.at(8), t1: R.at(9, 2) };
  const r = T.ret;
  section('return', '回来', w.t1, r.t1);
  ev(r.bell, 'bell', { resolve: true }); ev(r.thunk, 'thunk'); ev(r.wave[1] - 0.4, 'bell'); ev(r.horn[1] - 0.8, 'hang'); ev(r.star, 'star');
  CUES.push({ id: 'return', name: '回来：主题第一次走到终止式', kind: 'return', t0: R.t0, t1: r.t1, grid: R.spec() });
  shot(w.t1, r.smile[0], 'W', '黎明。门铃。勇者浑身是伤，扛着魔王的角，"咚"', { hour: 5.9 });
  shot(r.smile[0], r.smile[1], 'portrait', '店主头像特写：一个很小的笑');
  shot(r.smile[1], r.star - BAR * 0.5, 'W', '挥手出门。把角挂上门上方的钩子', { hour: 6.3 });
  shot(r.star - BAR * 0.5, r.t1, 'tally', '记号的最后画了一颗星', { count: 23, star: true });

  // ---------------- ⑧ coda: a new hero; the shop music from bar 1 again; cut to black; saved
  const C = new Grid(r.t1, BPM);
  T.coda = { grid: C, bell: C.at(3), push: C.at(5), black: C.at(6, 2), saved: C.at(6, 2) + 1.0, t1: C.at(6, 2) + 3.0 };
  const c = T.coda;
  section('coda', '尾声', r.t1, c.t1);
  ev(c.bell, 'bell'); ev(c.push, 'push'); ev(c.saved, 'saved');
  CUES.push({ id: 'coda', name: '尾声：商店 BGM 从第一小节重新开始', kind: 'shopLoop', t0: C.t0, t1: c.black, loop: 'coda', map: { t0: C.t0, ff: null, shift: 0, stopB: beatOf(6, 2) }, cutHard: true });
  CUES.push({ id: 'saved', name: '存档完成', kind: 'saveJingle', t0: c.saved, t1: c.saved + 1.6 });
  shot(r.t1, c.push, 'W', '新勇者攥着 50 金币进门。店主头也不抬', { hour: 7.0, newHero: true });
  shot(c.push, c.black, 'push', '柜台特写：盾、药水、那张画着魔王弱点的收据，一起推过来', { hour: 7.0 });
  shot(c.black, c.t1, 'black', '切黑。存档图标转一下：存档完成', { saved: true });

  // ---------------- ⑨ credits
  const K = new Grid(c.t1, BPM);
  T.credits = { grid: K, t1: K.at(7) + 0.4 };
  section('credits', '字幕', c.t1, T.credits.t1);
  CUES.push({ id: 'credits', name: '片尾：桥段的后半 + A′ 的最后一句，收在 F 上', kind: 'credits', t0: K.t0, t1: T.credits.t1, grid: K.spec() });
  shot(c.t1, T.credits.t1, 'credits', '像素字幕 + 勇者各种死法的花絮');

  T.duration = T.credits.t1;
  EV.sort((a, b) => a.t - b.t);
  SHOTS.sort((a, b) => a.t0 - b.t0);
  return { T, EV, SHOTS, CUES, SECTIONS };
}
function loopNote(lp) {
  if (lp.n === 1) return '第一轮：进门 → 拍金币 → 菜单 → 英雄姿势 → 出门';
  if (lp.n === 2) return '第二轮：一模一样。店主的循环断了（!?），慢半拍递剑；之后快进 ×3';
  return '第三轮：店主指墙上的盾（80）；勇者看钱袋（50），摇头，照样买木剑；快进';
}

export const TL = build();
export const DURATION = TL.T.duration;
