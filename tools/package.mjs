// Delivery copies, cut from the rendered frames (never re-scaled from the 1080p file, so the pixels stay square):
//   film/send/save-point-720p.mp4, save-point-review-720p.mp4   — under 30 MB each, for sending
//   film/send/save-point-1080p-partN.mp4, …-review-1080p-partN.mp4 — the 1080p versions split at hard cuts
//   web/media/*.mp4, poster.png                                   — small copies for the web player (≤ 15 MB)
// node tools/package.mjs [720|parts|web] (after render_film and title; no argument makes all three)
import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process';
import { TL, DURATION, FPS } from '../src/film/timeline.js';

const fps = FPS || 24, LIMIT = 30e6, WEB = 15e6;
const F = { clean: 'build/frames/film', review: 'build/frames/review' }, AUDIO = 'build/audio/soundtrack.wav';
const SEND = 'film/send', MEDIA = 'web/media', only = process.argv[2];
const want = k => !only || only === k;
for (const d of [SEND, MEDIA]) fs.mkdirSync(d, { recursive: true });
const nFrames = fs.readdirSync(F.clean).filter(n => n.endsWith('.png')).length;
const firstFrame = t => Math.ceil(t * fps - 1e-6);   // first frame whose time falls inside a shot starting at t

// clean frames are 320×180; review frames 384×216. 720p: ×4 for the film, ×3 (1152×648, letterboxed) for the review.
const VF = {
  clean: { 1080: 'scale=1920:1080:flags=neighbor', 720: 'scale=1280:720:flags=neighbor', 540: 'scale=960:540:flags=neighbor' },
  review: { 1080: 'scale=1920:1080:flags=neighbor', 720: 'scale=1152:648:flags=neighbor,pad=1280:720:64:36:color=0x0e0c14', 540: 'scale=768:432:flags=neighbor,pad=960:540:96:54:color=0x0e0c14' },
};
function enc(kind, res, out, crf, f0 = 0, f1 = nFrames, abr = '192k') {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-start_number', String(f0), '-i', path.join(F[kind], '%06d.png'),
    '-ss', String(f0 / fps), '-t', String((f1 - f0) / fps), '-i', AUDIO, '-frames:v', String(f1 - f0),
    '-vf', VF[kind][res], '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', abr, '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
  return fs.statSync(out).size;
}
// encode, raising the CRF until the file fits
function fit(kind, res, out, crf, limit, abr) {
  for (;;) {
    const size = enc(kind, res, out, crf, 0, nFrames, abr);
    console.log(`→ ${out}  crf ${crf}  ${(size / 1e6).toFixed(1)} MB`);
    if (size < limit * 0.97) return;
    crf += 2;
  }
}

if (want('720')) {
  fit('clean', 720, path.join(SEND, 'save-point-720p.mp4'), 18, LIMIT);
  fit('review', 720, path.join(SEND, 'save-point-review-720p.mp4'), 21, LIMIT);
}

// 1080p parts: cut where a section starts (always a hard cut, and the music has a clean edge there), choosing the
// section start nearest each equal split, so no part is over the limit
if (want('parts')) {
  const full = fs.statSync('film/save-point-1080p.mp4').size, parts = Math.ceil(full / (LIMIT * 0.9));
  const cuts = TL.SECTIONS.slice(1).map(s => s.t0);
  const at = [0];
  for (let i = 1; i < parts; i++) {
    const goal = DURATION * i / parts;
    at.push(cuts.reduce((a, b) => Math.abs(b - goal) < Math.abs(a - goal) ? b : a));
  }
  at.push(DURATION);
  for (const kind of ['clean', 'review']) {
    for (let i = 0; i < parts; i++) {
      const f0 = firstFrame(at[i]), f1 = i === parts - 1 ? nFrames : firstFrame(at[i + 1]);
      const out = path.join(SEND, `save-point${kind === 'review' ? '-review' : ''}-1080p-part${i + 1}.mp4`);
      const size = enc(kind, 1080, out, kind === 'review' ? 22 : 18, f0, f1);
      console.log(`→ ${out}  ${(f0 / fps).toFixed(2)}–${(f1 / fps).toFixed(2)} s  ${(size / 1e6).toFixed(1)} MB`);
    }
  }
}

// web player copies
if (want('web')) {
  fit('clean', 720, path.join(MEDIA, 'save-point.mp4'), 24, WEB, '128k');
  fit('review', 540, path.join(MEDIA, 'save-point-review.mp4'), 24, WEB, '128k');
  for (const v of ['music', 'sfx']) fs.copyFileSync(`film/title-${v}-1080p.mp4`, path.join(MEDIA, `title-${v}.mp4`));
  // poster: the medium shot, the tea handed over (2:30)
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(F.clean, String(150 * fps).padStart(6, '0') + '.png'), '-vf', VF.clean[720], path.join(MEDIA, 'poster.png')], { stdio: 'inherit' });
}
