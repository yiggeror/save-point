// the shot list as it stands in the timeline → docs/shots.md
import fs from 'fs';
import { TL, DURATION, BPM } from '../src/film/timeline.js';
const f = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const kind = { W: '全景', window: '窗', tally: '柜台底下', tag: '价签', clock: '钟', candle: '蜡烛', portrait: '头像', black: '黑场', credits: '字幕' };
const L = ['# 镜头表（动态分镜版）', '', `自动生成（\`tools/shot_list.mjs\`，读 \`src/film/timeline.js\`）。全片 ${f(DURATION)}，商店 BGM ${BPM} bpm。`, '', '| # | 起 | 止 | 长 | 段落 | 镜头 | 内容 |', '|---|---|---|---|---|---|---|'];
TL.SHOTS.forEach((s, i) => {
  const sec = TL.SECTIONS.find((x) => s.t0 >= x.t0 - 1e-6 && s.t0 < x.t1) || {};
  L.push(`| ${i + 1} | ${f(s.t0)} | ${f(s.t1)} | ${(s.t1 - s.t0).toFixed(1)} s | ${sec.name || ''} | ${kind[s.kind] || s.kind} | ${s.note || ''} |`);
});
const counts = {}; for (const s of TL.SHOTS) counts[s.kind] = (counts[s.kind] || 0) + 1;
L.push('', `共 ${TL.SHOTS.length} 个镜头：` + Object.entries(counts).map(([k, n]) => `${kind[k] || k} ${n}`).join('，') + '。');
fs.writeFileSync('docs/shots.md', L.join('\n') + '\n');
console.log('→ docs/shots.md', TL.SHOTS.length);
