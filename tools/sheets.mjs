// Design sheets for checkpoint 2. Everything is rendered by the film's own renderer at the film's own pixel size:
// the sheet is one native-resolution pixel image scaled ×3, so a close-up panel has more pixels, never bigger ones.
//   node tools/sheets.mjs            → design/*.png
import fs from 'fs';
import { Surface, ramp, text, textWidth, loadFont, PAL } from '../src/pix/gfx.js';
import { writePNG, upscale } from '../src/pix/png.js';
import { build } from '../src/rig/humanoid.js';
import { render, oblique, camera } from '../src/rig/sdf.js';
import { drawFace } from '../src/rig/face.js';
import { pose } from '../src/rig/poses.js';
import { drawShop, shopLight, LAYOUT } from '../src/set/shop.js';
import { grader } from '../src/set/light.js';
import { P } from '../src/set/kit.js';
import { emote } from '../src/ui/emotes.js';
import { heroHUD, shopMenu, saveIcon } from '../src/ui/hud.js';

await loadFont();
fs.mkdirSync('design', { recursive: true });
const SCALE = 3;
const UI = ramp('ui', ['#121019', '#1d1a27', '#2a2638', '#3d3852', '#6e6790', '#b9b2d6', '#f4efe2', '#f2c14e', '#e0785a', '#8fd0a0']);
const BG = [30, 27, 40];

function panel(S, x, y, w, h, title, sub) {
  S.rect(x, y, w, h, UI[1]);
  S.hline(x + 1, x + w - 2, y, UI[4]); S.hline(x + 1, x + w - 2, y + h - 1, UI[3]);
  S.vline(x, y + 1, y + h - 2, UI[4]); S.vline(x + w - 1, y + 1, y + h - 2, UI[3]);
  S.hline(x + 2, x + w - 3, y + 1, UI[2]); S.vline(x + 1, y + 2, y + h - 3, UI[2]);
  if (title) {
    const tw = text(S, title, x + 6, y + 3, UI[6]);
    if (sub) text(S, sub, x + 10 + tw, y + 3, UI[4]);
    S.hline(x + 4, x + w - 5, y + 16, UI[2]);
  }
}
const figure = (S, D, P, o) => {
  const rig = build(D, P);
  const R = render(S, rig.fig, { mats: D.mats, cam: o.cam || oblique(0.45), ...o });
  drawFace(S, R, rig, D, P.face);
  return R;
};
const save = (S, file) => { writePNG(file, S.w * SCALE, S.h * SCALE, upscale(S.w, S.h, S.toRGB({ bg: BG }), SCALE)); console.log('→', file); };
const label = (S, str, x, y, c = UI[5]) => text(S, str, x, y, c, { align: 'center' });

// ------------------------------------------------------------------ expressions
const EXPR = {
  keeper: [
    ['平常 (NPC)', {}, null, null], ['眨眼', { eyes: 'closed' }, null, null],
    ['愣住', { eyes: 'wide', brow: 1.5, browTilt: -0.5, stache: 0.5, mouth: { open: 1.4, w: 1.8 } }, [0, -6, 0], '!?'],
    ['看不懂', { browL: 1.4, browR: -0.5, mouth: { curve: -0.5 } }, [0, 0, 11], '?'],
    ['无语', { eyes: 'half', brow: -0.6 }, [0, 5, 0], '…'],
    ['急了', { eyes: 'half', browTilt: 1.5, stache: -0.7, mouth: { open: 0.9, w: 2.8 } }, [0, -4, -5], '💢'],
    ['担心', { browTilt: -1.5, brow: 0.6, mouth: { curve: -0.7 } }, [0, 9, 4], '💧'],
    ['很小的笑', { eyes: 'happy', stache: 0.8, mouth: { curve: 0.6 } }, [0, 5, -5], null],
  ],
  hero: [
    ['自信', { brow: 0.4, browTilt: 0.8, mouth: { grin: 1, w: 3 } }, [0, -4, 0], '✦'], ['眨眼', { eyes: 'closed' }, null, null],
    ['得意', { eyes: 'happy', mouth: { grin: 1, w: 3 } }, [0, -12, 0], '♪'],
    ['看价签', { browL: 1.3, browR: -0.3, mouth: { curve: -0.4 } }, [0, 0, 10], '?'],
    ['钱不够', { browTilt: -1.3, brow: 0.4, mouth: { curve: -0.9, w: 3 } }, [0, 6, 0], '…'],
    ['累了', { eyes: 'half', mouth: { open: 0.7, w: 2 } }, [0, 12, 0], 'zz'],
    ['烫！', { eyes: 'closed', browTilt: 1.4, mouth: { open: 1.5, w: 2.4, tongue: 1 } }, [0, -6, 6], '!'],
    ['谢谢', { eyes: 'happy', brow: 0.7, mouth: { curve: 1, w: 3 } }, [0, 7, 7], '♥'],
  ],
};
const ACTIONS = {
  keeper: [['擦柜台（NPC 两帧）', 'npcWipe', 30], ['指盾', 'point', 20], ['递茶', 'offerCup', 55]],
  hero: [['英雄姿势', 'heroPose', 25], ['拍金币', 'slap', 55], ['坐下·累了', 'sit', 35]],
};

// ------------------------------------------------------------------ character sheet
function characterSheet(D, role, title, blurb, file) {
  const W = 640, H = 476;
  const S = new Surface(W, H); S.clear(UI[0]);
  // title, one-line description, palette
  text(S, title, 8, 3, UI[7]);
  text(S, blurb, 8, 17, UI[5]);
  const mats = D.mats.filter((m) => !m.name.startsWith('prop.'));
  let px = W - 6 - mats.length * 11;
  text(S, '调色板', px - 40, 3, UI[4]);
  mats.forEach((m) => { m.ramp.forEach((c, j) => S.rect(px, 4 + j * 4, 10, 4, c)); px += 11; });
  // --- panel 1: game-size turnaround
  panel(S, 4, 34, 330, 116, '游戏尺寸 · 转面', '全景里的真实大小');
  const yaws = [0, 45, 90, 135, 180];
  let top = 1e9;
  yaws.forEach((yaw, i) => { const R = figure(S, D, pose(D, 'stand', { yaw }), { x: 40 + i * 58, y: 140, zoom: 1 }); top = Math.min(top, R.y0); });
  S.hline(12, 326, 141, UI[3]);
  S.vline(318, top, 140, UI[4]); S.hline(315, 321, top, UI[4]); S.hline(315, 321, 140, UI[4]);
  text(S, `${140 - top}px`, 314, Math.max(52, top - 13), UI[5], { align: 'right' });
  // --- panel 2: actions at game size
  panel(S, 338, 34, 298, 116, '性格动作', role === 'keeper' ? '慢、稳、讲究' : '弹、大、有点傻');
  ACTIONS[role].forEach(([name, p, yaw], i) => {
    figure(S, D, pose(D, p, { yaw }), { x: 400 + i * 90, y: 128, zoom: 1 });
    label(S, name, 400 + i * 90, 132, UI[4]);
  });
  // --- panel 3: close-up detail level turnaround (×2 detail, same pixel size)
  panel(S, 4, 154, 400, 184, '插入镜头的细节级别', '同样大小的像素，重新计算出更多细节');
  [0, 40, 90, 180].forEach((yaw, i) => figure(S, D, pose(D, 'stand', { yaw }), { x: 58 + i * 98, y: 332, zoom: 2 }));
  // --- panel 4: portrait
  panel(S, 408, 154, 228, 184, '头像特写', '');
  S.clip = [410, 172, 634, 336];
  const pz = 4, headY = D.hipH + D.waistUp + D.chestUp + D.neckUp + D.headUp;
  figure(S, D, pose(D, 'stand', { yaw: 18, face: role === 'keeper' ? { eyes: 'happy', stache: 0.6, mouth: { curve: 0.6 } } : { brow: 0.4, browTilt: 0.6, mouth: { grin: 1, w: 3 } } }), { x: 522, y: 250 + headY * pz, zoom: pz, cam: camera(4) });
  S.clip = null;
  // --- panel 5: expression sheet (close-up level) + the same at game size
  panel(S, 4, 342, 632, 130, '表情表', '上：特写级别   下：同一表情在全景里的大小');
  EXPR[role].forEach(([name, face, head, em], i) => {
    const cx = 44 + i * 78;
    const Pz = pose(D, 'stand', { yaw: 16, face }); if (head) Pz.head = head;
    S.clip = [cx - 37, 360, cx + 37, 430];
    figure(S, D, Pz, { x: cx, y: 400 + headY * 3, zoom: 3 });
    S.clip = [cx - 22, 431, cx + 22, 455];
    figure(S, D, Pz, { x: cx - 4, y: 447 + headY, zoom: 1 });
    S.clip = null;
    if (em) emote(S, em, cx + 12, 446);
    label(S, name, cx, 457, UI[5]);
  });
  save(S, file);
}

// ------------------------------------------------------------------ shop sheet: four times of day
async function shopSheet(opt, keeper, hero, title, blurb, file, fullFile) {
  const W = 648, H = 416;
  const S = new Surface(W, H); S.clear(UI[0]);
  text(S, title, 8, 5, UI[7]); text(S, blurb, 8 + textWidth(title) + 10, 5, UI[5]);
  const K = (await import(`../src/chars/${keeper}.js`))[keeper], Hh = (await import(`../src/chars/${hero}.js`))[hero];
  const times = [['清晨 7:05', 7.08, true, null], ['黄昏 18:10', 18.15, false, null], ['夜 23:30', 23.5, false, { lit: true, len: 0.55 }], ['黎明 5:50', 5.85, false, { lit: false, len: 0.2 }]];
  const frames = [];
  for (const [name, hour, chars, candle] of times) {
    const F = new Surface(320, 180); F.clear(0);
    drawShop(F, { opt, hour, t: 3, candle });
    const cam = oblique(0.45);
    if (chars || candle) {
      const kp = pose(K, candle ? 'stand' : 'npcWipe', { yaw: candle ? 0 : 0, counter: 22, face: candle ? { eyes: 'half' } : {} });
      const [x, y] = P(262, 0, LAYOUT.keeperZ);
      figure(F, K, kp, { x, y, z: LAYOUT.keeperZ, zoom: 1, cam });
    }
    if (chars) {
      const hp = pose(Hh, 'stand', { yaw: 55 });
      const [x, y] = P(LAYOUT.heroSpot.x, 0, LAYOUT.heroSpot.z);
      figure(F, Hh, hp, { x, y, z: LAYOUT.heroSpot.z, zoom: 1, cam });
    }
    shopLight(F, { hour, candle, t: 3 });
    frames.push([name, F, hour]);
    if (chars && fullFile) { const rgb = F.toRGB({ grade: grader(hour, F) }); writePNG(fullFile, 1920, 1080, upscale(320, 180, rgb, 6)); console.log('→', fullFile); }
  }
  // compose: frames are graded individually, so blit their RGB into the sheet's RGB
  const base = S.toRGB({ bg: BG });
  frames.forEach(([name, F, hour], i) => {
    const ox = 4 + (i % 2) * 322, oy = 20 + Math.floor(i / 2) * 198;
    const rgb = F.toRGB({ grade: grader(hour, F) });
    for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) for (let c = 0; c < 3; c++) base[((oy + y) * W + ox + x) * 3 + c] = rgb[(y * 320 + x) * 3 + c];
    const L = new Surface(W, H); text(L, name, ox + 3, oy + 182, UI[5]);
    const lr = L.toRGB({ bg: [-1, -1, -1] });
    for (let k = 0; k < W * H; k++) if (L.px[k] >= 0) for (let c = 0; c < 3; c++) base[k * 3 + c] = lr[k * 3 + c];
  });
  writePNG(file, W * SCALE, H * SCALE, upscale(W, H, base, SCALE)); console.log('→', file);
}

// ------------------------------------------------------------------ lineup: all options together, and the new heroes
async function lineup(file) {
  const W = 640, H = 360;
  const S = new Surface(W, H); S.clear(UI[0]);
  text(S, '六个人物方案放在一起', 8, 3, UI[7]); text(S, '店主和勇者可以任意搭配。插入镜头的细节级别（×2），站在同一条地板线上，横线是柜台高度。', 8, 17, UI[5]);
  panel(S, 4, 34, 632, 176, '', '');
  const ids = [['keeperA', '老掌柜'], ['keeperB', '瘦掌柜'], ['keeperC', '大熊'], ['heroA', '刺头'], ['heroB', '傻大个'], ['heroC', '圆帽子']];
  const counterY = 190 - 22 * 2;
  for (let x = 12; x < 628; x += 3) S.set(x, counterY, UI[3]);
  text(S, '柜台', 624, counterY - 13, UI[4], { align: 'right' });
  for (const [i, [id, nm]] of ids.entries()) {
    const D = (await import(`../src/chars/${id}.js`))[id];
    figure(S, D, pose(D, 'stand', { yaw: i < 3 ? -28 : 28 }), { x: 60 + i * 104, y: 190, zoom: 2 });
    label(S, nm, 60 + i * 104, 193, UI[5]);
  }
  panel(S, 4, 214, 632, 142, '结尾的新勇者', '同一套骨架，换配色和发型');
  const { newHeroA, newHeroB, newHeroC } = await import('../src/chars/newHero.js');
  const pairs = [['heroA', newHeroA], ['heroB', newHeroB], ['heroC', newHeroC]];
  for (const [i, [id, N]] of pairs.entries()) {
    const D = (await import(`../src/chars/${id}.js`))[id];
    const cx = 110 + i * 210;
    figure(S, D, pose(D, 'stand', { yaw: 28 }), { x: cx - 36, y: 340, zoom: 1.5 });
    text(S, '→', cx, 300, UI[4], { align: 'center' });
    figure(S, N, pose(N, 'stand', { yaw: 28 }), { x: cx + 36, y: 340, zoom: 1.5 });
  }
  save(S, file);
}

// ------------------------------------------------------------------ UI mock: the interface over the wide shot
async function uiMock(file) {
  const { keeperA } = await import('../src/chars/keeperA.js'), { heroA } = await import('../src/chars/heroA.js');
  const F = new Surface(320, 180); F.clear(0);
  drawShop(F, { opt: 'A', hour: 7.1, t: 3 });
  const cam = oblique(0.45);
  const [kx, ky] = P(262, 0, LAYOUT.keeperZ);
  figure(F, keeperA, pose(keeperA, 'stand', { yaw: -30, face: {} }), { x: kx, y: ky, z: LAYOUT.keeperZ, zoom: 1, cam });
  const [hx, hy] = P(LAYOUT.heroSpot.x, 0, LAYOUT.heroSpot.z);
  figure(F, heroA, pose(heroA, 'stand', { yaw: 55, face: { browL: 1.2, mouth: { curve: -0.3 } } }), { x: hx, y: hy, z: LAYOUT.heroSpot.z, zoom: 1, cam });
  shopLight(F, { hour: 7.1 });
  heroHUD(F, { gold: 50, hp: 3, hair: heroA.mats[heroA.M.hair].ramp[3], skin: heroA.mats[heroA.M.skin].ramp[3] });
  shopMenu(F, 228, 54, [['sword', 50], ['shield', 80], ['potion', 20]], 1, { dim: [1] });
  emote(F, '?', hx + 6, hy - 64);
  saveIcon(F, 308, 164, 0.2);
  const rgb = F.toRGB({ grade: grader(7.1, F) });
  writePNG(file, 1920, 1080, upscale(320, 180, rgb, 6)); console.log('→', file);
}

const which = process.argv[2] || 'all';
if (which === 'all' || which === 'lineup') await lineup('design/lineup.png');
if (which === 'all' || which === 'ui') await uiMock('design/ui-mock-1080p.png');
const chars = [
  ['keeperA', 'keeper', '店主 · 方案 A「老掌柜」', '矮、圆、秃顶白须、圆眼镜、绿围裙。慢条斯理，东西摆得一丝不苟。'],
  ['keeperB', 'keeper', '店主 · 方案 B「瘦掌柜」', '高、瘦、分头、半月眼镜、酒红马甲、袖箍、耳后夹铅笔。一板一眼。'],
  ['keeperC', 'keeper', '店主 · 方案 C「大熊」', '高大宽厚、络腮胡、小圆眼镜、毛线帽、开衫配皮围裙。手大、动作轻。'],
  ['heroA', 'hero', '勇者 · 方案 A「刺头」', '橙色刺头、头带、蓝短袍、红披风。经典，披风和头带尾巴给跟随动作。'],
  ['heroB', 'hero', '勇者 · 方案 B「傻大个」', '瘦高、腿长、金色拖把头、长围巾。全是膝盖和胳膊肘，动作最大。'],
  ['heroC', 'hero', '勇者 · 方案 C「圆帽子」', '矮圆、大羽毛帽、紫披风。个子最小胆子最大，一路蹦。'],
];
for (const [id, role, title, blurb] of chars) {
  if (which !== 'all' && which !== id && which !== 'chars') continue;
  const D = (await import(`../src/chars/${id}.js`))[id];
  characterSheet(D, role, title, blurb, `design/${id}.png`);
}
const shops = [
  ['A', 'keeperA', 'heroA', '道具店 · 方案 A「木屋」', '暖色木板墙、低梁、绿窗帘。像住了几十年的老木屋。'],
  ['B', 'keeperB', 'heroB', '道具店 · 方案 B「白墙老铺」', '白灰泥墙配深色木构架、绿护墙板、石板地。干净、讲究。'],
  ['C', 'keeperC', 'heroC', '道具店 · 方案 C「青漆小店」', '青绿漆木板墙、手绘花边、深红柜台。颜色最鲜，最有童话感。'],
];
for (const [opt, k, h, title, blurb] of shops) {
  if (which !== 'all' && which !== 'shop' + opt && which !== 'shops') continue;
  await shopSheet(opt, k, h, title, blurb, `design/shop-${opt}.png`, `design/shop-${opt}-1080p.png`);
}
