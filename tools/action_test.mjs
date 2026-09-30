// The action test (checkpoint 4), cut from the finished film's own frames and sound: walking, sitting down and
// getting up, pouring and handing over the tea, walking out through the boundary, the hero pose, the rewind, and
// a handful of the small actions — each introduced by a title card. node tools/action_test.mjs (after render_film)
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process';
import { Surface, text, loadFont, ramp } from '../src/pix/gfx.js';
import { encodePNG } from '../src/pix/png.js';
import { TL, HERO, BEAT } from '../src/film/timeline.js';
await loadFont();
const T = TL.T, L1 = T.loops[0], L2 = T.loops[1], q = T.quiet, w = T.wait, fps = 24;
const segs = [
  ['两人走路 · 勇者', '弹、大、脚踩实', L1.ft(HERO.walk[0]) - 0.2, L1.ft(HERO.walk[1]) + 0.4],
  ['两人走路 · 店主', '慢、稳，端着茶', q.pour[1] - 0.2, q.toFlap[1] - 0.4],
  ['走出柜台边界', '停下，低头看，吸一口气，边界碎开', q.toFlap[1] - 0.6, q.shatter + 1.8],
  ['坐下', '背对长凳，慢慢坐下去', q.sit - 1.6, q.sit + 1.2],
  ['倒茶', '背对我们，在炉子边倒一杯', q.pour[0] + 0.6, q.pour[1]],
  ['递杯', '中景：递过去、双手接住、一口喝下、太烫', q.medium[0] + 0.3, q.brow + 0.6],
  ['起身', '前倾、站起来，背上盾出门', w.t0, w.t0 + 2.6],
  ['英雄姿势', '看剑、试挥一下、预备，然后摆好', L1.ft(HERO.sword) - 0.2, L1.ft(HERO.turn) + 0.3],
  ['读档倒带', '画面褪成 4 色，一切倒着走，又从门口进来', L1.rw[0] - 0.6, L2.ft(HERO.hop[1]) + 0.4],
  ['小动作 · 勇者', '等剑的时候东张西望（每一轮一模一样）', L1.ft(HERO.slap) + 0.6, L1.ft(HERO.sword)],
  ['小动作 · 店主', '循环断了：愣住，看窗外，推眼镜', L2.ft(HERO.bell) - 0.3, L2.ft(HERO.bell + 7)],
  ['小动作 · 店主', '等他回来的一天：擦架子、数钱、往窗外看', w.lapse[0], w.lapse[1]],
];
const OUT = path.join('build', 'frames', 'action'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const INK = ramp('at.ink', ['#0e0c14', '#e8e4ff', '#f2c14e', '#9a92c4']);
let n = 0; const audio = [];
const card = (i, title, sub) => {
  const S = new Surface(320, 180); S.rect(0, 0, 320, 180, INK[0]);
  text(S, `动作测试 ${i + 1}/${segs.length}`, 160, 70, INK[3], { align: 'center' });
  text(S, title, 160, 86, INK[2], { align: 'center' }); text(S, sub, 160, 104, INK[1], { align: 'center' });
  const png = encodePNG(320, 180, S.toRGB());
  for (let k = 0; k < fps * 1.2; k++) fs.writeFileSync(path.join(OUT, String(n++).padStart(6, '0') + '.png'), png);
  audio.push([null, 1.2]);
};
segs.forEach(([title, sub, t0, t1], i) => {
  card(i, title, sub);
  const f0 = Math.round(t0 * fps), f1 = Math.round(t1 * fps);
  for (let f = f0; f < f1; f++) fs.copyFileSync(path.join('build', 'frames', 'film', String(f).padStart(6, '0') + '.png'), path.join(OUT, String(n++).padStart(6, '0') + '.png'));
  audio.push([f0 / fps, (f1 - f0) / fps]);
});
fs.writeFileSync('build/action_audio.json', JSON.stringify(audio));
let r = spawnSync('python3', ['-c', `
import json, numpy as np, soundfile as sf
x, sr = sf.read('build/audio/soundtrack.wav', always_2d=True)
parts = []
for t0, d in json.load(open('build/action_audio.json')):
    n = int(round(d * sr))
    if t0 is None: parts.append(np.zeros((n, 2)))
    else:
        s = x[int(round(t0 * sr)):int(round(t0 * sr)) + n].copy()
        f = int(0.03 * sr); s[:f] *= np.linspace(0, 1, f)[:, None]; s[-f:] *= np.linspace(1, 0, f)[:, None]
        parts.append(s)
sf.write('build/action_audio.wav', np.concatenate(parts), sr, subtype='PCM_16')
`], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(OUT, '%06d.png'), '-i', 'build/action_audio.wav',
  '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', 'film/action-test-1080p.mp4'], { stdio: 'inherit' });
if (r.status) process.exit(r.status);
console.log('→ film/action-test-1080p.mp4', (fs.statSync('film/action-test-1080p.mp4').size / 1e6).toFixed(1), 'MB', (n / fps).toFixed(1), 's');
