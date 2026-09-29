// The tension curve, keyed to the timeline's own beats (so it moves with the bars when the timeline changes).
// Picture pace, cutting, music density and loudness read from here.
import { TL, DURATION as DUR, HERO, BAR } from './timeline.js';

const T = TL.T;
export const SECTIONS = TL.SECTIONS.map((s) => ({ ...s, mood: { open: '平静', first: '轻快', discover: '好奇 → 有趣', montage: '越来越快', quiet: '放松', wait: '越来越紧', return: '释放', coda: '一个小笑', credits: '' }[s.id] }));
export const DURATION = DUR;

function build() {
  const K = [];
  const k = (t, v, note) => K.push([+t.toFixed(3), v, note]);
  k(0, 1, '黑场·存档图标'); k(3, 1.2); k(T.map[1], 1.5, '地图铺完');
  // loops 1–3: each climbs to the flash and falls back with the rewind; each a little higher than the last
  T.loops.forEach((l, i) => {
    const at = (b) => l.ft(l.s(b)), base = [2.5, 4.5, 5.0][i];
    k(l.t0 + 0.01, [1.6, 3.4, 3.8][i]);
    k(at(HERO.bell), base, i === 0 ? '门铃' : i === 1 ? '!? 又来了' : '指盾');
    k(at(HERO.slap), base + 0.5, i === 0 ? '拍金币' : undefined);
    k(at(HERO.pose), base + 0.9, i === 0 ? '英雄姿势' : undefined);
    k(l.flashT, base + 2.0, i === 0 ? '塔上一闪' : undefined);
    k(l.rw[0], base + 1.0, i === 0 ? '读档' : undefined);
    k(l.rw[1], base + 0.6);
  });
  k(T.loop4.t0 + 1.0, 4.4, '记号还在');
  // montage: a saw-tooth that climbs; each fall smaller than the last
  const M = T.montage;
  T.montageLoops.forEach(([b0, n, gag], i) => {
    const t0 = M.at(b0), t1 = M.at(b0 + n), v = 5.2 + 3.8 * (b0 / 22);
    k(t0 + 0.02, v - (gag === 'tally' ? 0.1 : 0.6));
    k(t1 - 0.05, v + 0.2, gag === 'tally' && b0 === 22 ? '23' : undefined);
  });
  // the cliff: quiet
  const q = T.quiet, w = T.wait, r = T.ret, c = T.coda;
  k(q.t0 + 0.05, 2.2); k(q.sit, 1.8, '坐在长凳上'); k(q.look[1], 1.5, '安静'); k(q.shatter, 3.0, '边界碎开'); k(q.hand[0], 2.5, '递茶'); k(q.hot, 3.2, '太烫！');
  k(q.refuse[0], 2.5, '不收钱'); k(q.t1, 3.0);
  // the wait: a smooth ramp with no release
  k(w.leave[1], 3.5, '出门'); k(w.pass, 5.0, '钟走过 7:12'); k(w.lapse[1], 6.4, '黄昏 → 夜'); k(w.flashes[0], 7.4, '塔上闪光，没有音乐'); k(w.candleShot[1], 8.3, '蜡烛短了'); k(w.last, 9.0, '最后一闪'); k(w.t1 - 0.05, 9.1);
  k(r.bell, 3.0, '门铃！'); k(r.smile[0], 2.0, '很小的笑'); k(r.wave[0], 2.5, '挥手'); k(r.star, 2.0, '一颗星');
  k(c.bell, 3.0, '新勇者'); k(c.push, 2.5, '推过去'); k(c.saved, 1.0, '存档完成'); k(T.credits.grid.t0, 2.0); k(DUR, 1.5);
  return K.sort((a, b) => a[0] - b[0]);
}
export const TENSION = build();
export function tensionAt(t) {
  const X = TENSION;
  if (t <= X[0][0]) return X[0][1];
  for (let i = 0; i + 1 < X.length; i++) if (t < X[i + 1][0]) {
    const [a, va] = X[i], [b, vb] = X[i + 1];
    return va + (vb - va) * (t - a) / Math.max(1e-6, b - a);
  }
  return X[X.length - 1][1];
}
