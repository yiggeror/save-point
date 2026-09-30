// Render the film. Worker threads write both versions of every frame — the clean 320×180 picture and the review
// frame with the notes strip (384×216) — then ffmpeg scales them by whole numbers with nearest-neighbour
// (×6 → 1920×1080 for the film, ×5 for the review) and muxes the soundtrack.
// node tools/render_film.mjs [fps=24] [workers=4] [t0] [t1] [tag]
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(here), '..');
const OUT = { clean: path.join(root, 'build', 'frames', 'film'), review: path.join(root, 'build', 'frames', 'review') };

if (isMainThread) {
  const fps = +(process.argv[2] || 24), workers = +(process.argv[3] || 4);
  const { DURATION } = await import('../src/film/timeline.js');
  const t0 = +(process.argv[4] || 0), t1 = +(process.argv[5] || DURATION), tag = process.argv[6] || '';
  const f0 = Math.round(t0 * fps), f1 = Math.floor(t1 * fps);
  for (const d of Object.values(OUT)) fs.mkdirSync(d, { recursive: true });
  const start = Date.now();
  let done = 0;
  await Promise.all(Array.from({ length: workers }, (_, w) => new Promise((res, rej) => {
    const wk = new Worker(here, { workerData: { w, workers, f0, f1, fps } });
    wk.on('message', () => { done++; if (done % 240 === 0) console.log(`  ${done}/${f1 - f0}  ${((Date.now() - start) / 1000).toFixed(0)}s`); });
    wk.on('error', rej); wk.on('exit', res);
  })));
  console.log(`frames done in ${((Date.now() - start) / 1000).toFixed(0)} s`);
  const audio = path.join(root, 'build', 'audio', 'soundtrack.wav');
  const film = path.join(root, 'film'); fs.mkdirSync(film, { recursive: true });
  const enc = (dir, scale, out, crf) => {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-start_number', String(f0), '-i', path.join(dir, '%06d.png'),
      '-ss', String(t0), '-t', String((f1 - f0) / fps), '-i', audio,
      '-vf', `scale=${scale}:flags=neighbor`, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
    console.log('→', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
  };
  enc(OUT.clean, '1920:1080', path.join(film, `save-point${tag}-1080p.mp4`), 18);
  enc(OUT.review, '1920:1080', path.join(film, `save-point${tag}-review-1080p.mp4`), 22);
} else {
  const { setup, frames, AW, AH } = await import('../src/film/film.js');
  const { encodePNG } = await import('../src/pix/png.js');
  await setup();
  const { w, workers, f0, f1, fps } = workerData;
  for (let f = f0 + w; f < f1; f += workers) {
    const { clean, review } = frames(f / fps), name = String(f).padStart(6, '0') + '.png';
    fs.writeFileSync(path.join(OUT.clean, name), encodePNG(320, 180, clean));
    fs.writeFileSync(path.join(OUT.review, name), encodePNG(AW, AH, review));
    parentPort.postMessage(f);
  }
}
