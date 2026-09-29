// Render the animatic: worker threads write native 384×216 PNG frames, ffmpeg scales ×5 (nearest) and muxes the
// soundtrack. node tools/render_animatic.mjs [fps=12] [workers=4] [from] [to]
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const here = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(here), '..');
const OUT = path.join(root, 'build', 'animatic');

if (isMainThread) {
  const fps = +(process.argv[2] || 12), workers = +(process.argv[3] || 4);
  const { DURATION } = await import('../src/film/timeline.js');
  const t0 = +(process.argv[4] || 0), t1 = +(process.argv[5] || DURATION);
  const f0 = Math.round(t0 * fps), f1 = Math.floor(t1 * fps);
  fs.mkdirSync(OUT, { recursive: true });
  const start = Date.now();
  let done = 0;
  await Promise.all(Array.from({ length: workers }, (_, w) => new Promise((res, rej) => {
    const wk = new Worker(here, { workerData: { w, workers, f0, f1, fps } });
    wk.on('message', () => { done++; if (done % 200 === 0) console.log(`  ${done}/${f1 - f0}  ${((Date.now() - start) / 1000).toFixed(0)}s`); });
    wk.on('error', rej); wk.on('exit', res);
  })));
  console.log(`frames done in ${((Date.now() - start) / 1000).toFixed(0)} s`);
  const audio = path.join(root, 'build', 'audio', 'soundtrack.wav');
  const film = path.join(root, 'film'); fs.mkdirSync(film, { recursive: true });
  const out = path.join(film, 'animatic-1080p.mp4');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-start_number', String(f0), '-i', path.join(OUT, '%06d.png'),
    '-ss', String(t0), '-t', String((f1 - f0) / fps), '-i', audio,
    '-vf', 'scale=1920:1080:flags=neighbor', '-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '24', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
  console.log('→', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
} else {
  const { setup, frameRGB, AW, AH } = await import('../src/film/animatic.js');
  const { encodePNG } = await import('../src/pix/png.js');
  await setup();
  const { w, workers, f0, f1, fps } = workerData;
  for (let f = f0 + w; f < f1; f += workers) {
    const rgb = frameRGB(f / fps);
    fs.writeFileSync(path.join(OUT, String(f).padStart(6, '0') + '.png'), encodePNG(AW, AH, rgb));
    parentPort.postMessage(f);
  }
}
