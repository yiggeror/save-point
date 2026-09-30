"""The room's real sounds, from CC0 recordings (see assets/sfx/SOURCES.md): footsteps on the wooden floor, the door,
the bench, cloth, the purse, the teacup, pouring, a gulp, wood knocks, paper. Each is trimmed, pitched, filtered and
enveloped here so that it sits in the same small room as the synthesized game sounds.
"""
import os
import numpy as np
import soundfile as sf
from scipy import signal
from music import SR, lowpass, highpass, bandpass

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(HERE, '..', '..', 'assets', 'sfx')
_cache = {}
def load(rel):
    """mono float32 at SR, trimmed of leading silence"""
    if rel in _cache: return _cache[rel]
    x, sr = sf.read(os.path.join(SFX, rel), always_2d=True)
    x = x.mean(1)
    if sr != SR:
        g = np.gcd(sr, SR); x = signal.resample_poly(x, SR // g, sr // g)
    a = np.abs(x); i = np.argmax(a > a.max() * 0.02)
    x = x[max(0, i - int(0.002 * SR)):].astype(np.float32)
    _cache[rel] = x
    return x
def pitch(x, semis):
    """resample (changes length, like a tape): semis > 0 higher and shorter"""
    if abs(semis) < 1e-3: return x
    r = 2 ** (semis / 12); n = int(len(x) / r)
    return np.interp(np.arange(n) * r, np.arange(len(x)), x).astype(np.float32)
def fade(x, a=0.002, r=0.03):
    n = len(x); e = np.ones(n, np.float32)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr)
    return x * e
def peak(x, p): return (x / (np.abs(x).max() + 1e-9) * p).astype(np.float32)
def dur(x, d): return fade(x[:int(d * SR)])

# ---------------------------------------------------------------- people
def step(who='hero', k=0):
    """wooden floorboards: the hero light and quick (higher, shorter), the keeper heavier and softer"""
    x = load(f'kenney-impact-sounds/footstep_wood_00{k % 5}.ogg')
    if who == 'keeper': x = lowpass(pitch(x, -3 + (k % 3) * 0.4)[:, None], 2600)[:, 0]; return peak(dur(x, 0.22), 0.2)
    return peak(dur(pitch(x, 2.5 + (k % 3) * 0.5), 0.16), 0.24)
def land():
    """the hero landing from his hop through the door: a step, heavier, and his gear"""
    x = load('kenney-impact-sounds/footstep_wood_002.ogg'); c = load('kenney-rpg-audio/cloth2.ogg')
    y = np.zeros(int(0.5 * SR), np.float32); s = pitch(x, 0.5); y[:len(s)] += peak(s, 0.5)[:len(y)]
    cc = peak(dur(c, 0.3), 0.18); y[int(0.02 * SR):int(0.02 * SR) + len(cc)] += cc[:len(y) - int(0.02 * SR)]
    return peak(fade(y), 0.5)
def cloth(k=0, d=0.35): return peak(dur(highpass(load(f'kenney-rpg-audio/cloth{1 + k % 4}.ogg')[:, None], 400)[:, 0], d), 0.2)
def coins():
    """the purse: coins handled inside leather"""
    return peak(dur(load('kenney-rpg-audio/handleCoins.ogg'), 0.8), 0.3)

# ---------------------------------------------------------------- the room
def door_open(): return peak(dur(lowpass(load('kenney-rpg-audio/doorOpen_1.ogg')[:, None], 6000)[:, 0], 0.9), 0.35)
def door_close(): return peak(dur(lowpass(load('kenney-rpg-audio/doorClose_4.ogg')[:, None], 5000)[:, 0], 0.6), 0.45)
def creak(k=0):
    """the old bench taking his weight"""
    x = load(f'kenney-rpg-audio/creak{1 + k % 3}.ogg')
    return peak(dur(lowpass(pitch(x, -4)[:, None], 3500)[:, 0], 0.9), 0.32)
def knock(kind='light', k=0):
    """wood on wood: a cup or a bottle set down on the counter, the shield on the bench, the horn on the counter"""
    f = {'light': 'impactWood_light_000', 'light2': 'impactWood_light_002', 'medium': 'impactWood_medium_001', 'heavy': 'impactWood_heavy_000'}[kind]
    return peak(dur(load(f'kenney-impact-sounds/{f}.ogg'), 0.6), {'light': 0.3, 'light2': 0.3, 'medium': 0.45, 'heavy': 0.7}[kind])
def cup_set():
    """a ceramic cup set on wood"""
    x = load('kenney-impact-sounds/impactPlate_light_000.ogg')
    return peak(dur(pitch(x, 3), 0.35), 0.28)
def glass(k=0): return peak(dur(load(f'kenney-impact-sounds/impactGlass_light_00{0 if k % 2 == 0 else 2}.ogg'), 0.5), 0.28)
def paper(k=0): return peak(dur(highpass(load(f'kenney-rpg-audio/bookFlip{1 + k % 2}.ogg')[:, None], 900)[:, 0], 0.4), 0.2)
def pour(d=2.6):
    """tea into a cup: running water with a resonance that climbs as the cup fills, a splash at the start, a drip to end"""
    src = load('rubberduck-100-cc0-sfx-2/sfx100v2_loop_water_01.ogg')
    n = int(d * SR)
    x = np.tile(src, n // len(src) + 1)[:n].astype(np.float64)
    x = bandpass(x[:, None], 350, 7000)[:, 0]
    # a resonant band-pass whose centre rises from ~700 Hz to ~2400 Hz (the cup's air column shortening)
    y = np.zeros(n); f0 = 700 * (2400 / 700) ** (np.arange(n) / n)
    q = 5.0; s1 = s2 = 0.0
    for i in range(n):                     # a state-variable filter, sample by sample
        g = np.tan(np.pi * f0[i] / SR); k = 1 / q
        a1 = 1 / (1 + g * (g + k)); v1 = a1 * (s1 * 1 + g * (x[i] - s2)); v2 = s2 + g * v1
        s1 = 2 * v1 - s1; s2 = 2 * v2 - s2
        y[i] = v1
    out = 0.55 * y / (np.abs(y).max() + 1e-9) + 0.25 * x / (np.abs(x).max() + 1e-9)
    t = np.arange(n) / SR
    envl = np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.35) * (1 + 0.5 * np.exp(-t / 0.15))
    out = out * envl
    return peak(out.astype(np.float32), 0.26)
def gulp():
    return peak(dur(load('qubodup-bottle-drink/swallow-01.flac'), 0.4), 0.4)

def blow():
    """blowing on hot tea: a soft breath"""
    from music import SR as _SR
    n = int(0.7 * SR); t = np.arange(n) / SR
    x = np.random.default_rng(5).standard_normal(n)
    x = bandpass(x[:, None], 250, 2200)[:, 0] * np.sin(np.pi * np.minimum(1, t / 0.7)) ** 1.5
    return peak(x.astype(np.float32), 0.12)
def sip(): return peak(dur(highpass(load('qubodup-bottle-drink/swallow-05.flac')[:, None], 300)[:, 0], 0.6), 0.22)
def shield_set():
    """the shield laid on the bench: wood on wood, the iron rim ringing a little"""
    w = knock('medium'); m = peak(dur(load('kenney-rpg-audio/metalClick.ogg'), 0.3), 0.12)
    y = np.zeros(max(len(w), len(m) + int(0.01 * SR)), np.float32); y[:len(w)] += w; y[int(0.01 * SR):int(0.01 * SR) + len(m)] += m
    return y
def cup_pass(): return peak(dur(pitch(load('kenney-impact-sounds/impactPlate_light_001.ogg'), 5), 0.25), 0.14)
