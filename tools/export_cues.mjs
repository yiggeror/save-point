// Export the timeline for the sound: sections, cues (with their tempo grids), events, shots → build/cues.json
import fs from 'fs';
import { TL, DURATION, BPM, HERO, GO_DELAY, GO_LEN, RW_LEN } from '../src/film/timeline.js';
const T = TL.T;
const loops = T.loops.map((l) => ({ n: l.n, t0: l.t0, ff: l.ff, shift: l.shift, stopB: l.stopB, stopT: l.stopT, flashT: l.flashT, goT: l.goT, rw: l.rw, t1: l.t1 }));
const out = {
  DURATION, BPM, HERO, GO_DELAY, GO_LEN, RW_LEN,
  sections: TL.SECTIONS, cues: TL.CUES, events: TL.EV, shots: TL.SHOTS, loops, loop4: T.loop4,
  montage: { ...T.montage.spec(), loops: T.montageLoops },
  quiet: T.quiet, wait: T.wait, ret: { ...T.ret, grid: T.ret.grid.spec() }, coda: { ...T.coda, grid: T.coda.grid.spec() },
  credits: { ...T.credits, grid: T.credits.grid.spec() }, musicBox: T.musicBox.spec(),
};
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/cues.json', JSON.stringify(out, null, 1));
console.log(`cues: ${out.cues.length} cues, ${out.events.length} events, ${out.shots.length} shots, ${DURATION.toFixed(1)} s`);
