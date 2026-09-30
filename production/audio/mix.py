"""The soundtrack: the score's cues placed on the timeline, the shop music cut and fast-forwarded exactly the way
each loop's script runs, the rewinds made from the loop's own sound played backwards, effects on the events the
picture exports, a room tone. Writes build/audio/soundtrack.wav and docs/cue-sheet.md (start, end, overlap and
loudness of every cue).
"""
import os
import numpy as np
import soundfile as sf
from music import SR, BUILD, ROOT, load_cues, loudness, lowpass, highpass, bandpass, snes_echo
import sfx

C = load_cues()
DUR = C['DURATION']; BEAT = 60.0 / C['BPM']
N = int((DUR + 1.0) * SR)
music = np.zeros((N, 2), np.float32)
fxbus = np.zeros((N, 2), np.float32)
placed = []   # (cue id, t0, t1, array) for the cue sheet

def stem(name):
    x, sr = sf.read(os.path.join(BUILD, name + '.wav'), dtype='float32'); assert sr == SR
    return x if x.ndim == 2 else np.stack([x, x], 1)

def ending(x, t0, t_end, fade=0.3):
    """a cue must be silent by t_end (film time): fade its last `fade` seconds and cut"""
    n = int(max(0, t_end - t0) * SR)
    if n >= len(x): return x
    y = x[:n].copy(); nf = min(n, int(fade * SR))
    y[n - nf:] *= np.linspace(1, 0, nf)[:, None]
    return y

def place(buf, x, t, gain=1.0, pan=0.0):
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], 1)
    i = int(round(t * SR))
    if i >= len(buf): return
    j = max(0, -i); i = max(0, i)
    n = min(len(buf) - i, len(x) - j)
    if n > 0: buf[i:i + n] += x[j:j + n] * gain

def to_lufs(x, target):
    L = loudness(x)
    return 10 ** ((target - L) / 20) if L > -69 else 1.0

def distant(x):
    """heard through the window from far away: narrow band, mostly mono, more echo"""
    m = x.mean(axis=1)
    m = bandpass(m[:, None], 350, 3200)[:, 0]
    y = np.stack([m, m * 0.9], 1)
    return snes_echo(y, delay=0.21, fb=0.45, wet=0.5)

# ------------------------------------------------------------------ the shop music, per loop
MASTER = stem('shop_master')
g_shop = to_lufs(MASTER[: int(24 * SR)], -21.0)
def shop_segment(t0, t1, ff=None, fade=0.015):
    """film time t0..t1 of a loop that started at t0; master time follows the script (×rate while fast-forwarding)"""
    ts = np.arange(int(t0 * SR), int(t1 * SR)) / SR
    sb = (ts - t0) / BEAT
    if ff:
        tf = t0 + ff['b0'] * BEAT
        over = ts > tf
        sb[over] = ff['b0'] + (ts[over] - tf) * ff['rate'] / BEAT
    m = sb * BEAT * SR
    k = np.clip(m.astype(int), 0, len(MASTER) - 2); fr = (m - k)[:, None]
    y = MASTER[k] * (1 - fr) + MASTER[k + 1] * fr
    nf = int(fade * SR); y[-nf:] *= np.linspace(1, 0, nf)[:, None]
    return y

for L in C['loops']:
    y = shop_segment(L['t0'], L['stopT'], L['ff'])
    place(music, y, L['t0'], g_shop); placed.append((f'shop{L["n"]}', L['t0'], L['stopT'], y * g_shop))
L4 = C['loop4']
y = shop_segment(L4['t0'], L4['t1'], None, fade=0.004)
place(music, y, L4['t0'], g_shop); placed.append(('shop4', L4['t0'], L4['t1'], y * g_shop))
cd = C['coda']
y = shop_segment(cd['grid']['t0'], cd['black'], None, fade=0.006)
place(music, y, cd['grid']['t0'], g_shop); placed.append(('coda', cd['grid']['t0'], cd['black'], y * g_shop))

# ------------------------------------------------------------------ the other cues
GO0 = distant(stem('gameover')); g_go = to_lufs(GO0, -31.0)
for L in C['loops']:
    GO = ending(GO0, L['goT'], L['rw'][0] - 0.05, 0.4)
    place(music, GO, L['goT'], g_go); placed.append((f'go{L["n"]}', L['goT'], L['goT'] + len(GO) / SR, GO * g_go))
cues = {c['id']: c for c in C['cues']}
for cid, name, target in [('montage', 'montage', -19.5), ('musicbox', 'musicbox', -25.0), ('wait', 'wait', -27.0),
                          ('return', 'return', -21.0), ('credits', 'credits', -20.0), ('saved', 'save_jingle', -26.0)]:
    x = stem(name); g = to_lufs(x, target)
    t0 = cues[cid]['t0']
    nxt = min([c['t0'] for c in C['cues'] if c['t0'] > t0 + 0.5 and c['kind'] not in ('gameover',)] + [DUR + 1])
    if cid == 'musicbox': nxt = C['wait']['pass'] - 0.5          # the music box has finished before the clock passes 7:12
    x = ending(x, t0, nxt - 0.25, 0.5)
    place(music, x, t0, g); placed.append((cid, t0, t0 + len(x) / SR, x * g))
FN = distant(stem('first_note')); t_fn = cues['wait']['firstNote']
place(music, FN, t_fn, to_lufs(FN, -33.0)); placed.append(('first_note', t_fn, t_fn + len(FN) / SR, FN))

# ------------------------------------------------------------------ effects on the picture's events
SOUNDS = {
    'bell': (lambda e: sfx.bell(), -0.2, 0.9), 'slap': (lambda e: sfx.slap(), 0.1, 0.9), 'coin': (lambda e: sfx.coin(e.get('k', 0)), 0.1, 0.8),
    'menuOpen': (lambda e: sfx.menu_open(), 0.2, 0.9), 'blip': (lambda e: sfx.blip(), 0.2, 0.9), 'select': (lambda e: sfx.select(), 0.2, 0.9),
    'handover': (lambda e: sfx.whoosh(0.25), 0.15, 0.5), 'land': (lambda e: sfx.land(), -0.4, 0.8), 'doorClose': (lambda e: sfx.door_close(), -0.6, 0.8),
    'step': (lambda e: sfx.step(e.get('who', 'hero')), 0.0, 0.7), 'thud': (lambda e: sfx.thud(), 0.0, 0.5), 'chalk': (lambda e: sfx.chalk(), 0.1, 0.8),
    'saveTick': (lambda e: sfx.save_tick(), 0.5, 0.8), 'mapRow': (lambda e: sfx.map_row(e['i']), 0.0, 0.8),
    'rewindWhoosh': (lambda e: sfx.whoosh(0.3, True), 0.0, 0.6), 'boing': (lambda e: sfx.boing(), 0.3, 0.8), 'gridFlash': (lambda e: sfx.grid_flash(), 0.3, 0.8),
    'potionClink': (lambda e: sfx.tap(2600), 0.2, 0.6), 'scribble': (lambda e: sfx.scribble(), 0.3, 0.6),
    'rewindAbort': (lambda e: sfx.whoosh(0.45, True), 0.0, 0.7),
    'deathFx': (lambda e: sfx.death_fx(e.get('death')), 0.0, 0.6), 'benchSit': (lambda e: sfx.creak(), -0.5, 0.8), 'pour': (lambda e: sfx.pour(e.get('dur', 2.6)), 0.4, 0.7),
    'shatter': (lambda e: sfx.shatter(), 0.1, 0.9), 'cupSet': (lambda e: sfx.tap(1500), -0.4, 0.6), 'gulp': (lambda e: sfx.gulp(), -0.4, 0.8), 'hot': (lambda e: sfx.hot(), -0.4, 0.8),
    'itemSet': (lambda e: sfx.thunk() * 0.4, -0.4, 0.8), 'paper': (lambda e: sfx.paper(), -0.4, 0.7), 'clockPass': (lambda e: sfx.tick(0) * 1.6, -0.3, 0.8),
    'match': (lambda e: sfx.match(), 0.3, 0.8), 'towerFlash': (lambda e: sfx.rumble(), 0.0, 0.5), 'tick': (lambda e: sfx.tick(int(e['t'])), -0.3, 0.8),
    'thunk': (lambda e: sfx.thunk(), 0.2, 0.9), 'hang': (lambda e: sfx.hang(), -0.6, 0.7), 'star': (lambda e: sfx.star(), 0.1, 0.6), 'push': (lambda e: sfx.push(), 0.2, 0.8),
}
for e in C['events']:
    if e['kind'] not in SOUNDS: continue
    f, pan, g = SOUNDS[e['kind']]
    if e['kind'] == 'tick' and abs(e['t'] - C['wait']['pass']) < 0.5: continue     # the clock holds its breath as it passes 7:12
    place(fxbus, f(e), e['t'], g * 0.5, pan)

# room tone under the shop (not under black or credits)
shots = C['shots']
room = sfx.room(DUR + 1.0)
mask = np.zeros(N, np.float32)
for s in shots:
    if s['kind'] in ('black', 'credits'): continue
    mask[int(s['t0'] * SR):int(s['t1'] * SR)] = 1.0
mask = np.convolve(mask, np.ones(int(0.2 * SR)) / int(0.2 * SR), mode='same').astype(np.float32)
fxbus[:, 0] += room[:N] * mask * 0.8; fxbus[:, 1] += np.roll(room[:N], 997) * mask * 0.8

# ------------------------------------------------------------------ rewinds: the loop's own sound, backwards and fast
def rewind(t, dur, frm):
    seg = (music + fxbus)[int(frm * SR):int(t * SR)][::-1]
    n = int(dur * SR)
    idx = np.linspace(0, len(seg) - 1, n)
    k = idx.astype(int); fr = (idx - k)[:, None]
    y = seg[k] * (1 - fr) + seg[np.minimum(k + 1, len(seg) - 1)] * fr
    y = lowpass(y, 5000) * 1.4
    w = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.4
    return y * w[:, None]
for e in C['events']:
    if e['kind'] != 'rewind': continue
    if e.get('short'):
        frm = e['t'] - 7.0
    else:
        frm = e['from']
    place(fxbus, rewind(e['t'], e['dur'], frm), e['t'], 1.0)

# ------------------------------------------------------------------ master
mix = music + fxbus
mix = np.tanh(mix * 1.15) / 1.15
Lm = loudness(mix)
mix *= 10 ** ((-16.5 - Lm) / 20)
peak = np.max(np.abs(mix))
if peak > 0.89: mix *= 0.89 / peak
out = os.path.join(BUILD, 'soundtrack.wav')
sf.write(out, mix, SR, subtype='PCM_24')
print(f'soundtrack {len(mix) / SR:.1f}s  integrated {loudness(mix):.1f} LUFS  peak {20 * np.log10(np.max(np.abs(mix))):.1f} dB → {out}')

# ------------------------------------------------------------------ cue sheet
master_gain = 10 ** ((-16.5 - Lm) / 20)
def active(x, thr=-55):
    e = np.abs(x).max(axis=1)
    idx = np.where(e > 10 ** (thr / 20))[0]
    return (idx[0] / SR, idx[-1] / SR) if len(idx) else (0, 0)
rows = []
for cid, t0, t1, x in sorted(placed, key=lambda r: r[1]):
    a0, a1 = active(x * master_gain)
    rows.append([cid, t0 + a0, t0 + a1, loudness(x * master_gain)])
names = {c['id']: c['name'] for c in C['cues']}
names.update({'coda': '尾声：商店 BGM 从第一小节重新开始', 'first_note': '夜里：只有"游戏结束"的第一个音'})
lines = ['# 段落表（配乐）', '', '自动生成（`production/audio/mix.py`）。时间是正片时间；"有声"是这一段实际发出声音的起止（-55 dBFS 以上）；响度是这一段单独的整合响度（LUFS，已含母带增益）。', '',
         '| 段落 | 内容 | 有声起 | 有声止 | 时长 | 响度 | 和下一段 |', '|---|---|---|---|---|---|---|']
fmt = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
problems = 0
for i, (cid, a0, a1, L) in enumerate(rows):
    nxt = rows[i + 1] if i + 1 < len(rows) else None
    gap = ''
    if nxt:
        d = nxt[1] - a1
        gap = f'间隔 {d:.2f} s' if d >= 0 else f'**重叠 {-d:.2f} s**'
        if nxt[0] == 'first_note': gap = '（下一段在"等待"里面，是它的一部分）'
        elif d < -0.02: problems += 1
    lines.append(f'| `{cid}` | {names.get(cid, cid)} | {fmt(a0)} | {fmt(a1)} | {a1 - a0:.1f} s | {L:.1f} | {gap} |')
lines += ['', f'整片整合响度 {loudness(mix):.1f} LUFS，峰值 {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS。重叠检查：{"没有段落重叠" if problems == 0 else f"{problems} 处重叠，需要处理"}。']
open(os.path.join(ROOT, 'docs', 'cue-sheet.md'), 'w').write('\n'.join(lines) + '\n')
print('cue sheet → docs/cue-sheet.md', 'overlaps:', problems)
