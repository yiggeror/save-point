// Materials for figures: a palette ramp plus how light picks steps on it.
import { ramp as rampColors, figRamp } from '../pix/color.js';
import { ramp as palRamp } from '../pix/gfx.js';

/**
 * base: hex colour (or o.colors: explicit ramp, darkest first). Default ramp: 6 steps, base at step 3.
 * Steps 0–1 are the outline (0 in shadow, 1 where lit), 2–4 the three shading tones, 5 the highlight.
 */
export function material(name, base, o = {}) {
  const colors = o.colors || (o.n ? rampColors(base, o.n, { at: o.at ?? 3, ...(o.r || {}) }) : figRamp(base, o.r || {}));
  const ramp = palRamp(name, colors);
  return {
    name, ramp, base,
    tones: o.tones ?? [2, 3, 4], th: o.th ?? [0.46, 0.8],
    spec: o.spec, specTh: o.specTh, edge: o.edge, edgeWith: o.edgeWith, amb: o.amb, dif: o.dif, dither: o.dither,
    innerLine: o.innerLine, selout: o.selout,
  };
}

/** build a material table from {key: [base, opts]} → { mats: [...], M: {key: id} } */
export function materials(prefix, spec) {
  const mats = [], M = {};
  for (const [k, [base, o]] of Object.entries(spec)) { M[k] = mats.length; mats.push(material(prefix + '.' + k, base, o || {})); }
  return { mats, M };
}
