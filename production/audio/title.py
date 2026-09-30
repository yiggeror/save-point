"""The title card's two soundtracks (the film itself starts from black; the title is separate, to add or not):
  build/audio/title_music.wav — the hook on the music box and harp, answered, closing on the save chime
  build/audio/title_sfx.wav   — only the sounds: the save icon ticking, the title loading row by row, the letters,
                                the chiptune "saved"
Times match tools/title.mjs.
"""
import numpy as np
from music import Arr, Grid, per_inst, save, SR, loudness, gain_to
import sfx

ROWS0, ROWS1, NROWS = 1.2, 3.0, 12        # the logo loads in NROWS rows between these times
SUB0, SUBN, SUBDT = 3.25, 10, 0.06       # "Save Point", one letter every SUBDT
SAVED, END = 4.1, 6.4

def place(buf, x, t, g=1.0):
    if x.ndim == 1: x = np.stack([x, x], 1)
    i = int(t * SR); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n] * g

N = int(END * SR)
fx = np.zeros((N, 2), np.float32)
for t in (0.6, 0.95): place(fx, sfx.save_tick(), t, 0.8)
for i in range(NROWS): place(fx, sfx.map_row(i * 2), ROWS0 + (ROWS1 - ROWS0) * i / NROWS, 0.9)
for k in range(SUBN): place(fx, sfx.blip(), SUB0 + k * SUBDT, 0.35)
chime = sfx.chip(['C6', 'F6', 'A6', 'C7'], 0.07)

# music: the hook (C–F–A) and its answer (G–F–D) on the music box over a harp, then the celesta save chime on F
A = Arr(); g = Grid(ROWS0, 84)
for t, d, q in [(0, .5, 'C5'), (.5, .5, 'F5'), (1, 1, 'A5'), (2, .5, 'G5'), (2.5, .5, 'F5'), (3, 1, 'D5')]:
    A.n(g.at(1, t), g.at(1, t + d) - g.at(1, t), q, 60, 'musicbox')
for t, q in [(0, 'F3'), (0.05, 'A3'), (0.1, 'C4'), (2, 'Bb2'), (2.05, 'D3'), (2.1, 'F3')]: A.n(g.at(1, t), 1.6, q, 34, 'harp')
A.n(g.at(1, 0), g.at(2) - g.at(1, 0), 'F3', 18, 'slowstr'); A.n(g.at(1, 0), g.at(2) - g.at(1, 0), 'C4', 16, 'slowstr')
for k, q in enumerate(['C6', 'F6', 'A6', 'C7']): A.n(SAVED + k * 0.11, 0.9 - k * 0.1, q, 64, 'celesta')
for q in ['F3', 'A3', 'C4', 'F4']: A.n(SAVED + 0.33, 1.6, q, 30, 'slowstr')
A.n(SAVED + 0.33, 1.8, 'F2', 36, 'harp')
mus = per_inst(A, 'title_music_notes', length=END)
mus = np.asarray(mus, np.float32)[:N]
if len(mus) < N: mus = np.pad(mus, ((0, N - len(mus)), (0, 0)))

sfx_only = fx.copy(); place(sfx_only, chime, SAVED, 0.9)
with_music = fx * 0.7 + gain_to(mus, -20.0)
for name, x in (('title_sfx.wav', sfx_only), ('title_music.wav', with_music)):
    x = gain_to(x, -18.0); pk = np.abs(x).max()
    if pk > 0.89: x *= 0.89 / pk
    print(name, f'{loudness(x):.1f} LUFS', save(x.astype(np.float32), name))
