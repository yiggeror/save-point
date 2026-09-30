# 《存档点》 制作与素材来源 · Credits

只列和这部片子有关的内容：片中出现或听到的每一样外部素材，以及它的来源和授权。

## 制作

| | |
|---|---|
| 原案 · 监制 | yiggeror |
| 画面 · 动画 · 配乐 · 音效设计 | 全部由本仓库的代码逐帧生成（Claude Code 编写） |

画面里没有任何外部图片：店铺、人物、窗外、界面、特写、字幕都在 `src/` 里用代码画出来。
旋律、和声、编曲写在 `production/audio/score.py`；游戏音效（门铃、金币、菜单、边界、存档、碰撞格子、读档倒带）在 `production/audio/sfx.py` 里合成。

## 字体

| 用在哪里 | 字体 | 作者 | 授权 | 来源 |
|---|---|---|---|---|
| 片名、界面数字、商店菜单、字幕、对照版信息条 | Fusion Pixel 12px（版本 20220405，取自 npm 包 `@fontpkg/fusion-pixel`） | TakWolf（合并了 Ark Pixel Font、Cubic 11 等开源像素字体，均为 OFL） | SIL Open Font License 1.1 | https://github.com/TakWolf/fusion-pixel-font |

授权全文：`fonts/OFL-FusionPixel.txt`。只提取了用到的字形（`tools/font_extract.py` → `assets/font/fusion12.json`）。片名"存档点"三个字取自这套字体，再用 Scale2x 放大、上色。

## 配乐音色

| 用在哪里 | 音色库 | 作者 | 授权 | 来源 |
|---|---|---|---|---|
| 全部配乐（长笛、钟琴、马林巴、拨弦、低音提琴、竖琴、单簧管、弦乐、八音盒、陶笛、打击乐） | FluidR3_GM.sf2 | Frank Wen | MIT | Debian / Ubuntu 软件包 `fluid-soundfont-gm`（https://packages.debian.org/fluid-soundfont-gm） |

用 FluidSynth 渲染，再经过 `production/audio/music.py` 里的低通和回声。

## 录音音效（真实世界的声音，全部 CC0）

每个包只拷贝了用到的文件，放在 `assets/sfx/`，原始 License.txt 在各自目录里；在 `production/audio/foley.py` 里裁剪、变调、滤波、加包络。逐个文件的说明见 [`assets/sfx/SOURCES.md`](assets/sfx/SOURCES.md)。

| 片中的声音 | 文件 | 素材包 | 作者 | 授权 | 来源 |
|---|---|---|---|---|---|
| 门开、门关 | `doorOpen_1.ogg`、`doorClose_4.ogg` | RPG Audio | Kenney | CC0 1.0 | https://kenney.nl/assets/rpg-audio |
| 钱袋、金币拍在柜台上 | `handleCoins.ogg` | RPG Audio | Kenney | CC0 1.0 | https://kenney.nl/assets/rpg-audio |
| 衣料（坐下、起身、接杯、落地） | `cloth1–4.ogg` | RPG Audio | Kenney | CC0 1.0 | https://kenney.nl/assets/rpg-audio |
| 长凳吱呀 | `creak1–3.ogg` | RPG Audio | Kenney | CC0 1.0 | https://kenney.nl/assets/rpg-audio |
| 收据、纸 | `bookFlip1–2.ogg` | RPG Audio | Kenney | CC0 1.0 | https://kenney.nl/assets/rpg-audio |
| 盾放下时的金属声 | `metalClick.ogg` | RPG Audio | Kenney | CC0 1.0 | https://kenney.nl/assets/rpg-audio |
| 木地板脚步、落地 | `footstep_wood_000–004.ogg` | Impact Sounds | Kenney | CC0 1.0 | https://kenney.nl/assets/impact-sounds |
| 木头碰撞（柜台、盾、魔王的角"咚"） | `impactWood_light_000/002`、`impactWood_medium_001`、`impactWood_heavy_000.ogg` | Impact Sounds | Kenney | CC0 1.0 | https://kenney.nl/assets/impact-sounds |
| 药水瓶 | `impactGlass_light_000/002.ogg` | Impact Sounds | Kenney | CC0 1.0 | https://kenney.nl/assets/impact-sounds |
| 茶杯放下、递杯 | `impactPlate_light_000/001.ogg` | Impact Sounds | Kenney | CC0 1.0 | https://kenney.nl/assets/impact-sounds |
| 倒茶（流水 + 杯子装满时上升的共鸣） | `sfx100v2_loop_water_01.ogg` | 100 CC0 SFX #2 | rubberduck | CC0 1.0 | https://opengameart.org/content/100-cc0-sfx-2 |
| 喝茶、吞咽 | `swallow-01.flac`、`swallow-05.flac` | Liquid Bottle Drink Set | qubodup | CC0 1.0 | https://opengameart.org/content/liquid-bottle-drink-set |

`assets/sfx/` 里另有几个同包文件（`doorOpen_2`、`doorClose_1/3`、`bookPlace1`、`handleCoins2`、`impactSoft_medium_000`）试听过、最后没用上，授权相同。

## 本仓库的授权

- 代码：MIT（`LICENSE`）。
- 片子本身、设定图和其他画面：CC BY 4.0。
