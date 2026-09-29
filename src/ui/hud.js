// Game UI drawn into the frame: the hero's HUD (face, hearts, gold), the shop menu (icons and prices only), the
// save crystal in the corner. Numbers use a 5×7 pixel font so they read clearly at 1080p.
import { ramp, stamp } from '../pix/gfx.js';

export const U = ramp('ui.hud', ['#0e0c16', '#1f1b33', '#2f2a4a', '#4c4674', '#8a82c0', '#e8e4ff', '#ffffff', '#f0c040', '#b07818', '#e04848', '#901c30', '#58c8f0', '#2a6ab0', '#b8f0ff', '#f8e8b0', '#a86a38']);
const L = { k: U[0], d: U[1], m: U[2], M: U[3], l: U[4], w: U[5], W: U[6], y: U[7], o: U[8], r: U[9], R: U[10], c: U[11], b: U[12], C: U[13], p: U[14], n: U[15] };

const D57 = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'], 3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
};
export function num(S, n, x, y, c, shadow = U[0]) {
  for (const ch of String(n)) {
    const g = D57[ch]; if (!g) { x += 4; continue; }
    g.forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') { S.set(x + i + 1, y + j + 1, shadow); } }));
    g.forEach((row, j) => [...row].forEach((q, i) => { if (q === '#') S.set(x + i, y + j, c); }));
    x += 6;
  }
  return x;
}

/** a window: dark fill, a light rim, rounded corners */
export function win(S, x, y, w, h) {
  S.rect(x + 1, y + 1, w - 2, h - 2, U[1]);
  S.hline(x + 2, x + w - 3, y, U[5]); S.hline(x + 2, x + w - 3, y + h - 1, U[4]);
  S.vline(x, y + 2, y + h - 3, U[5]); S.vline(x + w - 1, y + 2, y + h - 3, U[4]);
  S.set(x + 1, y + 1, U[5]); S.set(x + w - 2, y + 1, U[5]); S.set(x + 1, y + h - 2, U[4]); S.set(x + w - 2, y + h - 2, U[4]);
  S.hline(x + 2, x + w - 3, y + 1, U[3]); S.vline(x + 1, y + 2, y + h - 3, U[3]);
}

export const ICON = {
  heart: stamp(['.rr.rr.', 'rWrrrrR', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'], L),
  heartEmpty: stamp(['.MM.MM.', 'M.....M', 'M.....M', '.M...M.', '..M.M..', '...M...'], L),
  coin: stamp(['.yyy.', 'yWyyo', 'yyoyo', 'yyyyo', '.ooo.'], L),
  sword: stamp(['.......p', '......pp', '.....pp.', '....pp..', 'n..pp...', '.nnp....', '..nn....', '.n..n...'], L),
  shield: stamp(['.MMMMM.', 'MnnpnnM', 'MnnpnnM', 'MpppppM', '.MnpnM.', '..MpM..', '...M...'], L),
  potion: stamp(['..nn..', '..ww..', '.w..w.', 'wrrrrw', 'wrWrrw', 'wrrrrw', '.wwww.'], L),
  cursor: stamp(['W...', 'WW..', 'WWW.', 'WW..', 'W...'], L),
};

/** the hero's HUD, top-left: a little face, hearts, gold */
export function heroHUD(S, o = {}) {
  const x = o.x ?? 4, y = o.y ?? 4, hp = o.hp ?? 3, max = o.max ?? 3, gold = o.gold ?? 50;
  win(S, x, y, 62, 22);
  // face icon: a tiny version of the hero's head (hair colour from the design)
  const hc = o.hair ?? U[9], sk = o.skin ?? U[14];
  S.rect(x + 4, y + 5, 11, 12, U[2]);
  S.rect(x + 6, y + 8, 7, 7, sk); S.hline(x + 5, x + 13, y + 6, hc); S.hline(x + 6, x + 12, y + 7, hc); S.set(x + 5, y + 7, hc); S.set(x + 13, y + 7, hc); S.set(x + 8, y + 5, hc); S.set(x + 11, y + 5, hc);
  S.set(x + 8, y + 10, U[0]); S.set(x + 11, y + 10, U[0]); S.hline(x + 9, x + 10, y + 13, U[10]);
  for (let i = 0; i < max; i++) S.draw(i < hp ? ICON.heart : ICON.heartEmpty, x + 18 + i * 8, y + 4);
  S.draw(ICON.coin, x + 18, y + 12);
  num(S, gold, x + 25, y + 12, U[6]);
}

/** the shop menu: icons and prices, a cursor on the chosen row */
export function shopMenu(S, x, y, rows, sel = 0, o = {}) {
  const h = 6 + rows.length * 11;
  win(S, x, y, 50, h);
  rows.forEach(([icon, price], i) => {
    const ry = y + 4 + i * 11;
    if (i === sel) S.rect(x + 3, ry - 1, 44, 11, U[2]);
    S.draw(ICON[icon], x + 10, ry + (icon === 'sword' ? 0 : 1));
    S.draw(ICON.coin, x + 22, ry + 2);
    num(S, price, x + 29, ry + 1, o.dim?.includes(i) ? U[4] : U[6]);
  });
  S.draw(ICON.cursor, x + 4, y + 5 + sel * 11);
}

/** the save crystal: a turning diamond with a glint; phase 0..1 turns it; done shows a check */
export function saveIcon(S, x, y, phase = 0, done = false) {
  const f = Math.floor(phase * 6) % 6, w = [5, 4, 2, 1, 2, 4][f];
  for (let j = 0; j < 11; j++) {
    const hw = Math.round((j < 5 ? j / 5 : (10 - j) / 5) * w);
    for (let i = -hw; i <= hw; i++) S.set(x + i, y + j, i < 0 ? U[11] : i === 0 ? U[13] : U[12]);
  }
  S.set(x, y + 2, U[6]);
  if (done) { const ck = stamp(['....W', '...W.', 'W.W..', '.W...'], L); S.draw(ck, x + 5, y + 7); }
}
