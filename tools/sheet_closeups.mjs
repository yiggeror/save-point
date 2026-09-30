// Review sheets for the checkpoint-3 revision, taken from the film itself:
//   design/window-view.png — the window close-up (morning, the four deaths, the night battle) and the view at other hours
//   design/closeups.png    — every close-up insert
// node tools/sheet_closeups.mjs
import { Surface, text, loadFont, ramp } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { setup, frameRGB, AW } from '../src/film/film.js';
import { TL } from '../src/film/timeline.js';
import { windowInsert } from '../src/set/view.js';
import { grader } from '../src/set/light.js';
await setup(); await loadFont();
const T = TL.T, INK = ramp('sheet.ink', ['#14111c', '#e8e4ff', '#9a92c4']);
const film = (t) => { const rgb = frameRGB(t), out = new Uint8Array(320 * 180 * 3); for (let y = 0; y < 180; y++) out.set(rgb.subarray(y * AW * 3, y * AW * 3 + 960), y * 960); return out; };
const view = (o) => { const S = new Surface(320, 180); S.clear(0); windowInsert(S, o); return S.toRGB({ grade: grader(o.hour, S) }); };
function sheet(file, tiles, cols) {
  const CAP = 16, rows = Math.ceil(tiles.length / cols), W = 320 * cols, H = (180 + CAP) * rows;
  const S = new Surface(W, H); S.rect(0, 0, W, H, INK[0]);
  tiles.forEach(([, cap], i) => text(S, cap, (i % cols) * 320 + 4, Math.floor(i / cols) * (180 + CAP) + 180 + 2, INK[1]));
  const rgb = S.toRGB();
  tiles.forEach(([img], i) => { const ox = (i % cols) * 320, oy = Math.floor(i / cols) * (180 + CAP); for (let y = 0; y < 180; y++) rgb.set(img.subarray(y * 960, (y + 1) * 960), ((oy + y) * W + ox) * 3); });
  writePNG(file, W * 3, H * 3, upscale(W, H, rgb, 3));
  console.log(file);
}
const L1 = T.loops[0], M = T.montage;
const win = TL.SHOTS.filter((s) => s.kind === 'window');
const at = (d) => { const s = win.find((w) => w.death === d && w.montage); return s.t0 + (s.t1 - s.t0) * 0.62; };
sheet('design/window-view.png', [
  [film(L1.flashT - 1.2), '第一轮：勇者走上悬崖边的路，去塔'],
  [film(L1.flashT + 0.05), '塔上的眼睛一闪（天空跟着亮一下）'],
  [film(L1.flashT + 1.4), '一颗小星升起来：死了'],
  [film(at('fire')), '蒙太奇：火球'],
  [film(at('cliff')), '蒙太奇：从悬崖边踩空'],
  [film(at('slime')), '蒙太奇：草丛里的史莱姆'],
  [film(T.wait.flashes[0] + 0.2), '夜：塔周围在打仗（玻璃上是蜡烛的倒影）'],
  [view({ hour: 18.6, t: 40 }), '黄昏（窗在全景里的样子也跟着变）'],
  [view({ hour: 5.9, t: 10, defeated: true }), '回来那天的黎明：塔上的乌云散了，眼睛灭了'],
], 3);
const q = T.quiet, c = T.coda, w = T.wait;
const tally = TL.SHOTS.filter((s) => s.kind === 'tally');
sheet('design/closeups.png', [
  [film(T.loops[2].t0 + 0.9 * 2 + 0.22), '柜台底下：第一道记号（店主自己的手）'],
  [film(T.loops[2].ruleCut + 0.3), '读档扫过柜台底下：只有粉笔记号不褪色'],
  [(() => { const s = tally.find((x) => x.note.includes('23')); return film((s.t0 + s.t1) / 2); })(), '蒙太奇：记号 23，粉笔停在第 24 道前'],
  [film(T.loops[2].tagGlance[0] + 0.5), '第三轮：盾的价签 80'],
  [film(TL.SHOTS.find((s) => s.kind === 'tag' && s.montage).t0 + 1.2), '蒙太奇：粉笔把 8 的两笔抹掉 → 50'],
  [film(T.mapInsert[0] + 0.5), '蒙太奇：地图拿倒了（塔倒挂、N 朝下）'],
  [film(q.receipt[0] + (q.receipt[1] - q.receipt[0]) * 0.45), '收据：蓝笔画魔王，弯角和塔顶的角一样'],
  [film(q.receipt[1] - 0.15), '收据：红笔圈住左边的角，剑和箭头指过去'],
  [film(w.clock[0] + 1.2), '钟：分针走向 7:12（粉笔记号在外圈）'],
  [film(w.glitch[0] + 0.1), '7:12：画面开始褪色、存档图标出现……'],
  [film(w.candleShot[0] + 1.0), '深夜：蜡烛短了一截，交叉的手'],
  [film(c.push + (c.black - c.push) * 0.45), '尾声：盾、药水、那张收据推给新勇者'],
], 3);
