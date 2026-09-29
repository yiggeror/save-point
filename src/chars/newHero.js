// The new hero at the end: the same skeleton and body as the chosen hero, a new palette and a new haircut.
import { mm, rotZ, rotX, apply, add, mul } from '../rig/m3.js';
import { strip, strand } from '../rig/cloth.js';
import { makeHeroA, spikyHair } from './heroA.js';
import { makeHeroB } from './heroB.js';
import { makeHeroC } from './heroC.js';

/** a bob with a side-swept fringe and a ponytail */
export function ponytail(k, M) {
  const { S, fig, at, ell, cone } = k, H = S.headF, hc = S.head, g = k.g.head;
  fig.add(ell(at(H, hc, [0, 1.0, -0.6]), H, [8.7, 8.4, 8.4], { g, m: M.hair, k: 0.8, part: 6,
    clip: [[apply(H, [0, -0.2, 1]), at(H, hc, [0, 0, 4.4])], [apply(H, [0, -1, 0.3]), at(H, hc, [0, -2.0, 0])]] }));
  const fringe = [[[2, 7.2, 3.2], [-2.6, 3.8, 8.2], 2.2], [[4.6, 6, 2.6], [1.4, 3.4, 8.2], 2.0], [[6.4, 4, 1.4], [6.8, 0.2, 5.6], 1.8], [[-5.4, 5.4, 2.4], [-7.2, 1.2, 5.2], 1.8]];
  for (const [b, t, r] of fringe) fig.add(cone(at(H, hc, b), at(H, hc, t), r, 0.4, { g, m: M.hair, k: 1.2, part: 6 }));
  // the tie and the tail, swinging a little behind
  const tie = at(H, hc, [0, 4.2, -8.2]);
  fig.add(ell(tie, H, [1.4, 1.4, 1.2], { g, m: M.band, k: 0.3, part: 7 }));
  const back = apply(k.S.root, [0, 0, -1]);
  const pts = [tie]; let p = tie;
  for (let i = 1; i <= 4; i++) { p = add(p, add([0, -2.2 - i * 0.2, 0], mul(back, 1.9 - i * 0.35))); pts.push(p); }
  strand(fig, pts, [2.2, 2.4, 2.2, 1.7, 0.8], { g, m: M.hair, k: 0.9, part: 6 });
}

/** a little flat cap over a tousled crop */
export function capCrop(k, M) {
  const { S, fig, at, ell, cone } = k, H = S.headF, hc = S.head, g = k.g.head;
  fig.add(ell(at(H, hc, [0, 0.8, -0.8]), H, [9.1, 8.7, 8.7], { g, m: M.hair, k: 0.8, part: 6,
    clip: [[apply(H, [0, -0.1, 1]), at(H, hc, [0, 0, 4.6])], [apply(H, [0, -1, 0.2]), at(H, hc, [0, -3.0, 0])]] }));
  for (const [b, t, r] of [[[3, 5, 3.6], [5.6, 1.6, 7.8], 2.0], [[-3, 5, 3.6], [-5.8, 1.8, 7.6], 2.0], [[6.8, 2, 0], [9.2, -1.6, 1.6], 1.8], [[-6.8, 2, 0], [-9.4, -1.8, 1.4], 1.8]])
    fig.add(cone(at(H, hc, b), at(H, hc, t), r, 0.4, { g, m: M.hair, k: 1.2, part: 6 }));
  const CF = mm(H, rotX(-10));
  fig.add(ell(at(H, hc, [0, 6.0, -0.6]), CF, [9.2, 4.4, 9.0], { g, m: M.cape, k: 0.8, part: 7, clip: [[apply(CF, [0, -1, 0]), at(H, hc, [0, 5.0, 0])]] }));
  fig.add(ell(at(H, hc, [0, 5.3, 6.4]), mm(CF, rotX(-12)), [6.4, 0.8, 4.2], { g, m: M.cape, k: 0.6, part: 7 }));
  fig.add(ell(at(H, hc, [0, 10.4, -0.6]), H, [1.3, 1.1, 1.3], { g, m: M.band, k: 1.0, part: 7 }));
}

export const newHeroA = makeHeroA('nA', { skin: '#e7a882', hair: '#3b3f6e', top: '#2f8f86', pants: '#6b5040', shoe: '#5a3526', glove: '#6b5040', belt: '#4a2f22', buckle: '#d8d0c0', cape: '#e0a83a', band: '#e05a6a', collar: '#f0e8d4' }, { id: 'newHeroA', hair: ponytail, iris: '#5a3a6a' });
export const newHeroB = makeHeroB('nB', { skin: '#f0b890', hair: '#2a2430', top: '#b8453a', pants: '#3f4a5e', shoe: '#3a2a24', glove: '#3f4a5e', belt: '#2f2622', buckle: '#e3b448', cape: '#4a7ac8', band: '#4a7ac8', collar: '#efe6d0' }, { id: 'newHeroB', hair: (k, M) => spikyHair(k, M), iris: '#3a3a4a' });
export const newHeroC = makeHeroC('nC', { skin: '#d99a74', hair: '#e8c060', top: '#4a78b8', pants: '#e6dcc4', shoe: '#5a3a2a', glove: '#5a3a2a', belt: '#4a3222', buckle: '#e3b448', cape: '#3f8a5a', band: '#e05a4a', collar: '#f4efe4' }, { id: 'newHeroC', hair: capCrop, iris: '#4a6a3a' });
