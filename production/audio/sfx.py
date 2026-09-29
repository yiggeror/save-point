"""Synthesized sound effects. Game sounds (menu, coins, bell, save, boundary, shatter) are final in character and
tuned to F major so they never fight the score. Real-world sounds (steps, door, bench, pouring, chalk) are
placeholders here; the recorded CC0 versions come in the action test.
"""
import numpy as np
from scipy import signal
from music import SR, p, hz, lowpass, highpass, bandpass

rng = np.random.default_rng(11)
def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
def norm(x, peak=0.8): return (x / (np.max(np.abs(x)) + 1e-9) * peak).astype(np.float32)
def noise(d, seed=None): return (np.random.default_rng(seed).standard_normal(int(d * SR)) if seed is not None else rng.standard_normal(int(d * SR)))
def mono(x): return x.astype(np.float32)
def square(f, t, duty=0.5): return np.where((f * t) % 1 < duty, 1.0, -1.0)

# ---------------------------------------------------------------- the shop's game sounds (in F)
def bell(strikes=3):
    """the shop bell on its spring: F6 with a soft octave and a little shimmer, shaken three times"""
    out = np.zeros(int(2.2 * SR))
    f0 = hz(p('F6'))
    for s in range(strikes):
        t0 = s * 0.085 + (0.02 if s == 2 else 0)
        amp = [1.0, 0.55, 0.3][s]
        t = tt(2.2 - t0)
        x = (np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.9) + 0.35 * np.sin(2 * np.pi * 2 * f0 * t) * np.exp(-t / 0.35)
             + 0.12 * np.sin(2 * np.pi * 3.01 * f0 * t) * np.exp(-t / 0.12) + 0.05 * np.sin(2 * np.pi * 4.2 * f0 * t) * np.exp(-t / 0.05))
        x *= np.minimum(1, t / 0.0015) * amp
        i = int(t0 * SR); out[i:i + len(x)] += x[:len(out) - i]
    return norm(out, 0.7)

def coin(k=0):
    notes = ['C7', 'A6', 'F7', 'C7']
    t = tt(0.35); f = hz(p(notes[k % 4]))
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2.4 * f * t)) * env(len(t), 0.001, 0.08)
    return norm(x, 0.35)

def slap():
    """fifty coins slapped on wood: a thump and a spray of clinks in F"""
    out = np.zeros(int(0.9 * SR))
    th = lowpass(noise(0.25)[:, None], 500)[:, 0] * env(int(0.25 * SR), 0.001, 0.05)
    out[:len(th)] += th * 1.4
    for k in range(9):
        c = coin(k); i = int((0.004 + k * 0.03 + rng.random() * 0.02) * SR)
        out[i:i + len(c)] += c[:len(out) - i] * (0.9 - k * 0.07)
    return norm(out, 0.8)

def chip(notes, d=0.06, duty=0.25, gap=0.0):
    out = []
    for q in notes:
        t = tt(d); x = square(hz(p(q)), t, duty) * env(len(t), 0.001, d * 0.7)
        out += [x, np.zeros(int(gap * SR))]
    return norm(lowpass(np.concatenate(out)[:, None], 6000)[:, 0], 0.3)
def menu_open(): return chip(['C6', 'F6'], 0.05)
def blip(): return chip(['C6'], 0.035)
def select(): return chip(['F6', 'A6'], 0.045)

def save_tick():
    t = tt(0.03); return norm(square(hz(p('C6')), t, 0.125) * env(len(t), 0.0005, 0.008), 0.12)
def map_row(i):
    """the map loading, one row: a soft tick climbing F major"""
    scale = ['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C6']
    q = scale[min(len(scale) - 1, i // 2)]
    t = tt(0.07); x = (np.sin(2 * np.pi * hz(p(q)) * t) + 0.3 * square(hz(p(q)), t, 0.125)) * env(len(t), 0.001, 0.02)
    return norm(x, 0.16)

def boing():
    """the invisible wall: a spring, F4 bending up to C5 and wobbling back"""
    t = tt(0.55); f = hz(p('F4')) * (1 + 0.5 * np.exp(-t * 9) * np.cos(t * 60) + 0.5 * (1 - np.exp(-t * 20)))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.2)
    return norm(x, 0.5)
def grid_flash():
    t = tt(0.25); x = square(hz(p('C5')), t, 0.125) * (np.floor(t * 40) % 2) * env(len(t), 0.001, 0.12)
    return norm(lowpass(x[:, None], 4000)[:, 0], 0.18)
def shatter():
    """the boundary breaking into pixels: a falling F-pentatonic sparkle of tiny blips"""
    notes = ['C7', 'A6', 'F6', 'D6', 'C6', 'A5', 'F5', 'D5', 'C5', 'A4', 'F4']
    out = np.zeros(int(1.6 * SR))
    for k, q in enumerate(notes):
        for j in range(2):
            t = tt(0.09); x = (square(hz(p(q)), t, 0.25) * 0.5 + np.sin(2 * np.pi * hz(p(q)) * t)) * env(len(t), 0.001, 0.04)
            i = int((k * 0.075 + j * 0.03 + rng.random() * 0.01) * SR); out[i:i + len(x)] += x[:len(out) - i] * (0.7 - k * 0.04)
    return norm(lowpass(out[:, None], 7000)[:, 0], 0.45)
def star():
    return norm(np.concatenate([chip(['F6', 'A6', 'C7'], 0.05)]), 0.2)

# ---------------------------------------------------------------- outside, far away
def thud():
    """a distant thud from the tower: low, soft, far"""
    t = tt(1.4); f = 70 * np.exp(-t * 2) + 38
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.01, 0.35) + lowpass(noise(1.4)[:, None], 220)[:, 0] * env(len(t), 0.005, 0.2) * 0.6
    return norm(x, 0.45)
def death_fx(kind):
    if kind == 'fire':
        t = tt(1.0); x = bandpass(noise(1.0)[:, None], 200, 1800)[:, 0] * env(len(t), 0.05, 0.35)
        return norm(x, 0.25)
    if kind == 'cliff':
        t = tt(1.1); f = hz(p('C6')) * np.exp(-t * 1.6)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.05) * np.exp(-t * 0.8) * 0.4
        return norm(np.concatenate([x, thud()[: int(0.5 * SR)] * 0.5]), 0.25)
    if kind == 'slime':
        t = tt(0.5); f = hz(p('C6')) * (1 + 0.8 * t)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.15)
        return norm(x, 0.2)
    return thud() * 0.6

# ---------------------------------------------------------------- in the room (placeholders for recordings)
def step(who='hero', k=0):
    d = 0.08; x = bandpass(noise(d)[:, None], 180 if who == 'keeper' else 300, 2500)[:, 0] * env(int(d * SR), 0.001, 0.018 if who == 'hero' else 0.03)
    return norm(x, 0.22 if who == 'hero' else 0.18)
def land(): x = lowpass(noise(0.2)[:, None], 400)[:, 0] * env(int(0.2 * SR), 0.001, 0.05); return norm(x, 0.5)
def door_close():
    x = lowpass(noise(0.3)[:, None], 300)[:, 0] * env(int(0.3 * SR), 0.002, 0.06)
    c = bandpass(noise(0.04)[:, None], 2000, 6000)[:, 0] * env(int(0.04 * SR), 0.0005, 0.01)
    x[int(0.05 * SR):int(0.05 * SR) + len(c)] += c * 0.6
    return norm(x, 0.45)
def whoosh(d=0.35, up=True):
    t = tt(d); k = t / d
    x = bandpass(noise(d)[:, None], 400, 5000)[:, 0] * (k ** 2 if up else (1 - k) ** 2) * np.sin(np.pi * np.minimum(1, k * 1.2)) ** 0.3
    return norm(x, 0.3)
def chalk(d=0.55):
    t = tt(d); jit = (np.sin(t * 2 * np.pi * 23) > 0.2).astype(float) * 0.6 + 0.4
    x = bandpass(noise(d)[:, None], 1800, 7000)[:, 0] * jit * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return norm(x, 0.28)
def scribble(): return chalk(0.8) * 0.8
def creak():
    t = tt(0.5); f = 180 + 60 * np.sin(t * 7)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * bandpass(noise(0.5)[:, None], 300, 1500)[:, 0] * 0.3 * env(len(t), 0.05, 0.2)
    th = land(); x[:len(th)] += th * 0.5
    return norm(x, 0.3)
def pour(d=2.6):
    t = tt(d); x = bandpass(noise(d)[:, None], 600, 4500)[:, 0] * (0.6 + 0.4 * np.sin(t * 31) ** 2) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.3)
    return norm(x, 0.2)
def tap(f=1800): t = tt(0.1); return norm(np.sin(2 * np.pi * f * t) * env(len(t), 0.0005, 0.02) + bandpass(noise(0.1)[:, None], 1000, 5000)[:, 0] * env(len(t), 0.0005, 0.005), 0.3)
def gulp(): t = tt(0.25); f = 260 - 120 * t / 0.25; return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.01, 0.08), 0.3)
def hot():
    """a small startled "hah!" without a voice: a squeak up, a fanning flap"""
    t = tt(0.3); f = 900 + 1400 * t / 0.3
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.005, 0.1) * 0.6
    return norm(np.concatenate([x, whoosh(0.2, False), whoosh(0.2, False)]), 0.3)
def thunk(): x = lowpass(noise(0.4)[:, None], 250)[:, 0] * env(int(0.4 * SR), 0.001, 0.09); return norm(x, 0.7)
def tick(k): t = tt(0.04); f = 2400 if k % 2 == 0 else 1900; return norm(np.sin(2 * np.pi * f * t) * env(len(t), 0.0003, 0.006) + bandpass(noise(0.04)[:, None], 2000, 8000)[:, 0] * env(len(t), 0.0003, 0.003), 0.14)
def match(): return norm(np.concatenate([bandpass(noise(0.15)[:, None], 1500, 7000)[:, 0] * env(int(0.15 * SR), 0.002, 0.05), lowpass(noise(0.8)[:, None], 1200)[:, 0] * env(int(0.8 * SR), 0.1, 0.3) * 0.3]), 0.3)
def rumble(): x = lowpass(noise(1.2)[:, None], 120)[:, 0] * env(int(1.2 * SR), 0.1, 0.4); return norm(x, 0.35)
def paper(): return norm(bandpass(noise(0.3)[:, None], 1500, 8000)[:, 0] * env(int(0.3 * SR), 0.01, 0.1), 0.18)
def push(): return norm(bandpass(noise(0.6)[:, None], 150, 1200)[:, 0] * np.sin(np.pi * np.linspace(0, 1, int(0.6 * SR))), 0.3)
def hang(): return norm(tap(2600) + tap(3100) * 0.5, 0.25)

def room(d, hour=7.0, seed=3):
    """room tone: a soft floor of air; birds outside by day"""
    r = np.random.default_rng(seed)
    x = lowpass(r.standard_normal(int(d * SR))[:, None], 900)[:, 0] * 0.02
    if 6 < hour < 18.5:
        for i in range(int(d * 0.8)):
            t0 = r.random() * d; n = int(0.12 * SR); t = np.arange(n) / SR
            f = hz(p(r.choice(['C7', 'D7', 'F7', 'G7', 'A7']))) * (1 + 0.15 * np.sin(t * 60))
            ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / t[-1]) * 0.012
            i0 = int(t0 * SR); x[i0:i0 + n] += ch[:len(x) - i0]
    return x.astype(np.float32)
