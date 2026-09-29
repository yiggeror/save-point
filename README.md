# 存档点 · Save Point

一部无对白的像素动画短片（制作中）。一家像素 RPG 道具店里，店主 NPC 发现同一个勇者一次次死掉、读档，又从门口走进来。
他只能待在柜台后面，只能卖东西，可他还是想办法帮了这个勇者一把。

A dialogue-free pixel-art short (in production). Every frame is computed in code.

## 现在在哪一步

检查点 3：音乐小样和粗动态分镜等确认。看 `film/animatic-1080p.mp4`，听 `music/theme-demo.m4a`；说明见 [`docs/music.md`](docs/music.md)、[`docs/shots.md`](docs/shots.md)、[`docs/cue-sheet.md`](docs/cue-sheet.md)，进度见 [`PROGRESS.md`](PROGRESS.md)。

## 怎么做的（简）

- 画面原生 320×180，整数倍放大。所有东西画进一张索引色画布：每个像素是"某条色阶的第几级"，光照和时间只移动整级、换调色板。
- 人物是 3D 骨架上的软形状，逐像素求交后做像素画的色阶和描边；脸按 3D 锚点贴像素。特写用同样大小的像素、更高的细节级别重新计算。
- 店铺和人物用同一个斜投影，手放在柜台上、坐在长凳上都按深度逐像素判断。

## 重新生成

需要 Node 18+、Python 3（`numpy scipy soundfile mido pyloudnorm`；改了文字时还要 `fonttools`）、FluidSynth + `FluidR3_GM.sf2`、ffmpeg。

```sh
python3 tools/font_extract.py      # 从 Fusion Pixel 12px 提取用到的字形 → assets/font/fusion12.json
node tools/tension_chart.mjs       # docs/tension-curve.png
node tools/sheets.mjs              # design/*.png（全部设定图）
node tools/sheets.mjs heroA        # 只生成一张：keeperA…C / heroA…C / shopA…C / lineup / ui
node tools/export_cues.mjs         # 时间表 → build/cues.json（给声音用）
python3 production/audio/score.py  # 配乐各段 → build/audio/*.wav
python3 production/audio/mix.py    # 声轨 → build/audio/soundtrack.wav，段落表 → docs/cue-sheet.md
node tools/render_animatic.mjs     # 动态分镜 → film/animatic-1080p.mp4
node tools/shot_list.mjs           # 镜头表 → docs/shots.md
```

## 许可

- 代码：MIT。作品（画面、设定图）：CC BY 4.0。
- 字体 Fusion Pixel 12px：SIL OFL 1.1，见 `fonts/OFL-FusionPixel.txt`。
