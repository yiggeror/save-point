// Colour: hex ↔ rgb, OKLab/OKLCH, and pixel-art colour ramps (hue-shifted: shadows lean cool, lights lean warm).

export const hex = (h) => {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
export const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const l2s = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);

export function rgb2oklab([r, g, b]) {
  r = s2l(r); g = s2l(g); b = s2l(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function oklab2rgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [l2s(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    l2s(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    l2s(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)].map((v) => Math.max(0, Math.min(255, v)));
}
export const rgb2lch = (c) => { const [L, a, b] = rgb2oklab(c); return [L, Math.hypot(a, b), Math.atan2(b, a) * 180 / Math.PI]; };
export const lch2rgb = ([L, C, h]) => oklab2rgb([L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)]);

const lerp = (a, b, t) => a + (b - a) * t;
function lerpHue(a, b, t) { let d = ((b - a + 540) % 360) - 180; return a + d * t; }

/**
 * A pixel-art ramp around a base colour.
 * n levels (0 = darkest). The base sits at level `at`. Shadows shift hue toward `cool` (default a violet-blue)
 * and lose a little chroma; lights shift toward `warm` (a yellow) and lose chroma toward the top.
 */
export function ramp(base, n = 5, o = {}) {
  const at = o.at ?? Math.floor(n / 2);
  const [L0, C0, h0] = rgb2lch(typeof base === 'string' ? hex(base) : base);
  const lo = o.lo ?? Math.max(0.12, L0 - 0.36), hi = o.hi ?? Math.min(0.97, L0 + 0.3);
  const cool = o.cool ?? 285, warm = o.warm ?? 85, shift = o.shift ?? 0.28;
  const out = [];
  for (let i = 0; i < n; i++) {
    let L, C, h;
    if (i <= at) {
      const t = at === 0 ? 0 : (at - i) / at;             // 0 at base → 1 at darkest
      L = lerp(L0, lo, t); C = C0 * (1 - 0.15 * t) + (o.shadowChroma ?? 0.02) * t; h = lerpHue(h0, cool, shift * t);
    } else {
      const t = (i - at) / (n - 1 - at);                    // 0 at base → 1 at lightest
      L = lerp(L0, hi, t); C = C0 * (1 - (o.fade ?? 0.35) * t); h = lerpHue(h0, warm, shift * 0.8 * t);
    }
    out.push(lch2rgb([L, C, h]));
  }
  return out;
}

/** mix two rgb colours */
export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * A figure ramp with fixed roles: [outline, lit outline, shadow, base, light, highlight].
 * Outlines are always dark enough to hold the silhouette against a busy background.
 */
export function figRamp(base, o = {}) {
  const [L0, C0, h0] = rgb2lch(typeof base === 'string' ? hex(base) : base);
  const cool = o.cool ?? 290, warm = o.warm ?? 80, sh = o.shift ?? 0.25;
  const dS = o.dS ?? 0.13, dL = o.dL ?? 0.075, dH = o.dH ?? 0.14;
  const Ls = L0 - dS;
  const o0 = Math.max(0.13, Math.min(o.o0 ?? 0.27, Ls - 0.3)), o1 = Math.max(o0 + 0.08, Math.min(o.o1 ?? 0.4, Ls - 0.14));
  const pt = (L, C, t) => lch2rgb([Math.max(0, Math.min(0.99, L)), Math.max(0, C), t >= 0 ? lerpHue(h0, warm, sh * t) : lerpHue(h0, cool, -sh * t)]);
  return [
    pt(o0, C0 * 0.55 + 0.02, -1.6),
    pt(o1, C0 * 0.75 + 0.02, -1.2),
    pt(Ls, C0 * (o.shadowC ?? 1.0) + 0.01, -1),
    pt(L0, C0, 0),
    pt(L0 + dL, C0 * 0.92, 0.6),
    pt(L0 + dH, C0 * (o.hiC ?? 0.7), 1),
  ];
}
