// The story's single timeline (draft, checkpoint 1): sections, beats and the tension curve.
// Picture pace, cutting, music density and loudness all read from here. Times are seconds from the first frame.
// They will move to the bar lines of the score in the animatic stage.

export const SECTIONS = [
  { id: 'open',     name: '开场',   mood: '平静',           t0: 0,   t1: 14 },
  { id: 'first',    name: '第一次', mood: '轻快',           t0: 14,  t1: 38 },
  { id: 'discover', name: '发现',   mood: '好奇 → 有趣',    t0: 38,  t1: 72 },
  { id: 'montage',  name: '蒙太奇', mood: '越来越快',       t0: 72,  t1: 110 },
  { id: 'quiet',    name: '安静',   mood: '放松',           t0: 110, t1: 146 },
  { id: 'wait',     name: '等待',   mood: '越来越紧',       t0: 146, t1: 178 },
  { id: 'return',   name: '回来',   mood: '释放',           t0: 178, t1: 198 },
  { id: 'coda',     name: '尾声',   mood: '一个小笑',       t0: 198, t1: 210 },
  { id: 'credits',  name: '字幕',   mood: '',               t0: 210, t1: 228 },
];

/** [t, tension 0..10, note] */
export const TENSION = [
  [0, 1, '黑场·存档图标'], [3, 1.2], [8, 1.5, '地图铺完'], [14, 2.5, '门铃'], [17, 3, '拍金币'], [24, 3.5, '英雄姿势'], [28, 3],
  [31, 4.6, '塔上一闪'], [33, 3.8], [35, 3.4, '读档'], [38, 4.5, '!? 又来了'], [41, 5], [47, 5], [51, 5.6, '一闪'], [53, 4.2],
  [55, 3.8, '第一道记号'], [58, 5, '指盾'], [65, 5.8, '一闪'], [66, 4.6], [68, 4.4, '记号还在'], [72, 5.2],
  // montage: a saw-tooth that climbs, each fall smaller than the last
  [78, 6.2, '改价签'], [80, 6.6, '火光'], [81, 5.6], [86, 6.9, '还药水'], [88, 7.2, '掉下悬崖'], [89, 6.4],
  [93, 7.4, '地图拿倒'], [95, 7.8, '史莱姆'], [96, 7.2], [99, 8.2, '撞墙'], [100, 7.8], [102, 8.4], [103, 8.1], [104.5, 8.7], [105.5, 8.5],
  [106.5, 8.9], [107.3, 8.8], [108, 9.1, '23'],
  // the cliff: quiet
  [110, 2, '坐在长凳上'], [117, 1.5, '安静'], [121, 3, '走出柜台·边界碎开'], [128, 2.5, '倒茶'], [135, 3.2, '太烫！'], [139, 2.5, '不收钱'],
  // the wait: a smooth ramp with no release
  [146, 3.5, '出门'], [150, 5, '钟走过 7:12'], [158, 6, '黄昏 → 夜'], [166, 7.5, '塔上闪光，没有音乐'], [172, 8.2, '蜡烛短了'], [176, 9, '最后一闪'],
  [178, 3, '门铃！'], [184, 2, '很小的笑'], [188, 2.5, '挥手'], [194, 2, '一颗星'],
  [198, 3, '新勇者'], [203, 2.5, '推过去'], [207, 1, '存档完成'], [210, 2], [228, 1.5],
];

export const DURATION = 228;
export function tensionAt(t) {
  const T = TENSION;
  if (t <= T[0][0]) return T[0][1];
  for (let i = 0; i + 1 < T.length; i++) if (t < T[i + 1][0]) {
    const [a, va] = T[i], [b, vb] = T[i + 1];
    return va + (vb - va) * (t - a) / (b - a);
  }
  return T[T.length - 1][1];
}
