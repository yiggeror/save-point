# 存档点 · Save Point

一部 4 分钟的无对白像素动画短片。一家像素 RPG 道具店里，店主 NPC 发现同一个勇者一次次死掉、读档，又从门口走进来。
他只能待在柜台后面，只能卖东西，可他还是想办法帮了这个勇者一把。

A 4-minute, dialogue-free pixel-art short. Every frame and every note is computed in code.

## 看片

| 文件 | 内容 |
|---|---|
| `film/save-point-1080p.mp4` | **正片**，1920×1080，3:59.8，从黑场开始 |
| `film/save-point-review-1080p.mp4` | **对照版**：同一条时间线，画面下方和右侧是镜头号、景别、镜头说明、段落、时间、音乐 cue、小节.拍、张力值 |
| `film/title-music-1080p.mp4`、`film/title-sfx-1080p.mp4` | 单独的片名片头（6 秒）：带配乐 / 只有音效 |
| `film/action-test-1080p.mp4` | 动作测试（检查点 4），从正片的帧里剪出来，每段前面有标题卡 |
| `web/index.html` | 网页播放器（正片 / 对照版 / 两个片头；段落跳转；手机可用） |

`film/send/`（运行 `tools/package.mjs` 生成，不进仓库）：30 MB 以内的 720p 版本，以及在硬切处切开的 1080p 分段。

镜头表 [`docs/shots.md`](docs/shots.md) · 音乐说明 [`docs/music.md`](docs/music.md) · 段落表 [`docs/cue-sheet.md`](docs/cue-sheet.md) · 素材来源 [`CREDITS.md`](CREDITS.md) · 制作记录 [`PROGRESS.md`](PROGRESS.md)

## 怎么做的

- **一张索引色画布**（`src/pix/`）。原生 320×180，每个像素存"哪条色阶的第几级"，外加是否自发光、光照级数和深度。光照只按整级移动色阶，
  时间（清晨、黄昏、夜、黎明）换调色板，所以明暗永远是像素色块和有序抖动。输出只做整数倍最近邻放大：1080p ×6、720p ×4，对照版 384×216 ×5。
- **人物**（`src/rig/`、`src/chars/`）是 3D 骨架上的软形状（带两骨 IK），逐像素求交后再做像素画的色阶、描边、内线和清理；脸按 3D 锚点贴像素，
  会随头转、被手挡住。店铺和人物用同一个斜投影，手搭在柜台上、坐在长凳上都按深度逐像素判断。特写用同样大小的像素、更高的细节重新计算。
- **表演**（`src/anim/perform.js`）：动画写成姿势到姿势，这一层把它变成表演：预备和过冲、头先动手后跟、手走弧线、呼吸、眨眼、重心转移、
  头发/披风/围裙的弹簧二次运动。勇者快而弹，店主慢而稳；NPC 在游戏循环里按拍子换帧，循环断了之后才开始"活过来"。
- **一条时间线**（`src/film/timeline.js`）：按小节写（120 bpm）。画面、界面、音效和配乐都读这一张表，所以门铃落在拍子上、快进时音乐跟着快进、
  读档时这一轮自己的声音倒放。
- **声音**（`production/audio/`）：`score.py` 作曲（FluidSynth + FluidR3 GM，每件乐器一道低通、共用一个芯片式回声），`sfx.py` 合成游戏音
  （都在 F 大调上），`foley.py` 处理 CC0 录音（脚步、门、倒茶……），`mix.py` 混音到 −16.5 LUFS，并生成段落表、检查每段起止有没有重叠。
- **镜头**（`src/film/film.js`、`inserts.js`、`closeups.js`、`src/set/`）：固定全景为主；窗外是一整幅会动的风景（`src/set/view.js`），
  特写（柜台底下的粉笔记号、价签、收据、地图、钟、蜡烛）用同一套木纹、粉笔、纸的像素画，手是角色自己的手放大渲染。

## 重新生成

需要 Node 18+、Python 3（`numpy scipy soundfile mido pyloudnorm`；改了文字时还要 `fonttools`）、FluidSynth + `/usr/share/sounds/sf2/FluidR3_GM.sf2`、ffmpeg。

```sh
python3 tools/font_extract.py      # 片中用到的字形 → assets/font/fusion12.json（改了任何文字之后）
node tools/export_cues.mjs         # 时间线 → build/cues.json（给声音用）
python3 production/audio/score.py  # 配乐各段 → build/audio/*.wav
python3 production/audio/mix.py    # 音效 + 录音 + 配乐 → build/audio/soundtrack.wav，段落表 → docs/cue-sheet.md
node tools/render_film.mjs         # 逐帧渲染（4 线程，约 4 分钟）→ film/save-point-1080p.mp4、film/save-point-review-1080p.mp4
node tools/action_test.mjs         # 动作测试 → film/action-test-1080p.mp4（用上一步的帧）
python3 production/audio/title.py  # 片头的两条声轨
node tools/title.mjs               # 片头 → film/title-music-1080p.mp4、film/title-sfx-1080p.mp4
node tools/package.mjs             # 720p 和 1080p 分段 → film/send/，网页用的小文件 → web/media/
node tools/shot_list.mjs           # 镜头表 → docs/shots.md
node tools/tension_chart.mjs       # 张力曲线 → docs/tension-curve.png
```

只看某一段：`node tools/contact_film.mjs 120 140 1` 出一张对照版的联系表；`node tools/animatic_still.mjs 155.5,156` 出几张单帧；
`node tools/render_film.mjs 24 4 120 140 -test` 只渲染一段。设定图：`node tools/sheets.mjs`（`design/*.png`），特写样张：`node tools/sheet_closeups.mjs`。

## 许可

- 代码：MIT（`LICENSE`）。片子、设定图和其他画面：CC BY 4.0。
- 字体 Fusion Pixel 12px：SIL OFL 1.1（`fonts/OFL-FusionPixel.txt`）。音色 FluidR3 GM：MIT。录音音效：CC0。详见 [`CREDITS.md`](CREDITS.md)。
