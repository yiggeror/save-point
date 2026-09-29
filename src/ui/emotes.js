// Emote bubbles: the only "speech" in the film. Hand-drawn pixel stamps: a round bubble with a tail and an icon.
import { ramp, stamp } from '../pix/gfx.js';

const C = ramp('ui.emote', ['#1a1420', '#5a4a6a', '#f8f4ec', '#ffffff', '#e04848', '#f0a830', '#4a8ae0', '#e06090', '#9ad0f0', '#6a5a7a']);
const LEG = { k: C[0], s: C[1], w: C[2], W: C[3], r: C[4], y: C[5], b: C[6], p: C[7], c: C[8], g: C[9] };

const BUBBLE = [
  '..#########..',
  '.#wwwwwwwww#.',
  '#wwwwwwwwwww#',
  '#wwwwwwwwwww#',
  '#wwwwwwwwwww#',
  '#wwwwwwwwwww#',
  '#wwwwwwwwwww#',
  '#wwwwwwwwwww#',
  '#wwwwwwwwwww#',
  '.#wwwwwwwww#.',
  '..###w####...',
  '....#w#......',
  '....##.......',
];
const ICONS = {
  '!':  ['.kk.', '.kk.', '.kk.', '.kk.', '....', '.kk.'],
  '?':  ['.kkk.', 'k...k', '...k.', '..k..', '.....', '..k..'],
  '!?': ['kk.kkk.', 'kk.k..k', 'kk...k.', 'kk..k..', '.......', 'kk..k..'],
  '…':  ['.......', '.......', '.......', '.......', '.......', 'k.k.k..'],
  '♪':  ['..kkk', '..k.k', '..k..', 'kkk..', 'kkk..', '.k...'],
  '♥':  ['.rr.rr.', 'rWrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
  '💢': ['.r...r.', 'rr...rr', '.......', '.......', 'rr...rr', '.r...r.'],
  '💧': ['...b.', '..bb.', '.bcbb', '.bbbb', '..bb.', '.....'],
  '✦':  ['...y...', '...y...', '.yyyyy.', '...y...', '...y...', '.......'],
  'zz': ['kkk....', '..k....', '.k..kkk', 'kkk...k', '.....k.', '....kkk'],
};

/** draw an emote bubble with its tail's tip at (x, y); scale 1. pop (0..1) squashes it in */
export function emote(S, kind, x, y, o = {}) {
  const b = stamp(BUBBLE, { '#': C[0], w: C[2] });
  const ic = ICONS[kind];
  const ox = x - 5, oy = y - 13;
  if ((o.pop ?? 1) < 0.35) { S.draw(stamp(['.#.', '#w#', '.#.'], { '#': C[0], w: C[2] }), x - 1, y - 4); return; }
  S.draw(b, ox, oy);
  if (!ic) return;
  const s = stamp(ic, LEG);
  S.draw(s, ox + Math.floor((13 - s.w) / 2), oy + 2 + Math.floor((8 - s.h) / 2));
}
export const EMOTES = Object.keys(ICONS);
