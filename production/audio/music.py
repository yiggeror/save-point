"""Score engine for 《存档点》: note events on tempo grids (the same grids the picture uses), rendered with FluidSynth
(FluidR3 GM samples) and then made to sound like one 16-bit game world: a soft low-pass like a sample chip's
interpolation, a short feedback echo with a filtered loop, fixed panning, no concert-hall reverb.
"""
import json, os, subprocess, tempfile, math
import numpy as np
import mido
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BUILD = os.path.join(ROOT, 'build', 'audio')
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 48000
os.makedirs(BUILD, exist_ok=True)

def load_cues():
    return json.load(open(os.path.join(ROOT, 'build', 'cues.json')))

# ------------------------------------------------------------------ pitches
NN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def p(s):
    if not isinstance(s, str): return int(s)
    s = s.strip(); n = NN[s[0].upper()]; i = 1
    while i < len(s) and s[i] in '#b': n += 1 if s[i] == '#' else -1; i += 1
    return n + 12 * (int(s[i:]) + 1)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

# ------------------------------------------------------------------ tempo grids (mirror src/film/timeline.js)
class Grid:
    def __init__(self, t0, bpm, meter=4): self.t0, self.bpm, self.m = t0, bpm, meter
    def tb(self, B): return self.t0 + B * 60.0 / self.bpm
    def at(self, bar, beat=0.0): return self.tb((bar - 1) * self.m + beat)
    def bpm_at(self, B): return self.bpm
class Accel:
    def __init__(self, t0, bpm0, bpm1, bars): self.t0, self.p0, self.p1, self.NB, self.m = t0, bpm0, bpm1, bars * 4, 4
    def tb(self, B):
        p0, p1, NB = self.p0, self.p1, self.NB
        if B <= NB:
            pp = p0 + (p1 - p0) * B / NB
            return self.t0 + 60.0 * NB / (p1 - p0) * math.log(pp / p0)
        return self.tb(NB) + (B - NB) * 60.0 / p1
    def at(self, bar, beat=0.0): return self.tb((bar - 1) * 4 + beat)
    def bpm_at(self, B): return self.p1 if B >= self.NB else self.p0 + (self.p1 - self.p0) * B / self.NB
def grid_from(spec, t0=None):
    t = spec['t0'] if t0 is None else t0
    if spec['type'] == 'accel': return Accel(t, spec['bpm0'], spec['bpm1'], spec['bars'])
    return Grid(t, spec['bpm'], spec.get('meter', 4))

# ------------------------------------------------------------------ instruments (GM programs) and their places
INST = {  # name: (program, pan 0..127, volume, low-pass Hz)
    'flute': (73, 70, 100, 7200), 'ocarina': (79, 64, 100, 6500), 'clarinet': (71, 58, 96, 6500), 'oboe': (68, 74, 90, 6500),
    'glock': (9, 84, 80, 9000), 'musicbox': (10, 64, 100, 8000), 'celesta': (8, 76, 90, 8500), 'marimba': (12, 44, 100, 7500),
    'xylo': (13, 90, 80, 8500), 'vibes': (11, 80, 90, 7500), 'harp': (46, 38, 100, 7500), 'pizz': (45, 52, 110, 6500),
    'strings': (48, 64, 90, 5500), 'slowstr': (49, 64, 90, 5000), 'bass': (32, 64, 110, 3500), 'tuba': (58, 60, 100, 3000),
    'accordion': (21, 70, 85, 6000), 'nylon': (24, 50, 100, 6500), 'timp': (47, 64, 110, 3000), 'pad': (89, 64, 80, 4500),
    'bassoon': (70, 56, 95, 4500), 'kalimba': (108, 70, 100, 7000),
}
DRUM = 'drums'

class Arr:
    """a list of note events, all in seconds"""
    def __init__(self): self.ev = []
    def n(self, t, dur, pitch, vel, inst, **k):
        self.ev.append(dict(t=float(t), d=max(0.02, float(dur)), p=p(pitch), v=int(max(1, min(127, vel))), i=inst, **k))
    def dr(self, t, note, vel, dur=0.15):
        self.ev.append(dict(t=float(t), d=dur, p=int(note), v=int(max(1, min(127, vel))), i=DRUM))
    def shift(self, dt):
        for e in self.ev: e['t'] += dt
        return self
    def clamp(self, t_end, release=0.08):
        """end every note by t_end (so a cue never rings on into the next)"""
        keep = []
        for e in self.ev:
            if e['t'] >= t_end - 0.005: continue
            e['d'] = min(e['d'], t_end - e['t'] + release)
            keep.append(e)
        self.ev = keep
        return self

def swing(B, amount=0.58):
    """swung eighths: an off-beat eighth (x.5) is placed at x + amount"""
    f = B - math.floor(B)
    if abs(f - 0.5) < 1e-6: return math.floor(B) + amount
    return B

def seq(A, g, bar, beat, spec, vel, inst, sw=0.58, leg=0.92, shift=0, accent=None, stacc=None):
    """write a melody line 'C5:.5 F5:.5 A5:1 …' starting at (bar, beat) on grid g. Returns the end beat index."""
    B = (bar - 1) * g.m + beat
    for k, tok in enumerate(spec.replace('|', ' ').split()):
        q, d = tok.split(':'); d = float(d)
        if q != 'r':
            t0 = g.tb(swing(B, sw)); t1 = g.tb(swing(B + d, sw))
            v = vel * (accent(k, B) if accent else 1)
            A.n(t0, (t1 - t0) * (stacc or leg), p(q) + shift, v, inst)
        B += d
    return B

# ------------------------------------------------------------------ rendering
def render(A, name, length=None, tail=2.0):
    """render an Arr to a stereo float32 array (FluidSynth, no FluidSynth reverb/chorus)"""
    insts = sorted({e['i'] for e in A.ev if e['i'] != DRUM})
    assert len(insts) <= 15, insts
    ch = {}
    c = 0
    for nm in insts:
        if c == 9: c += 1
        ch[nm] = c; c += 1
    mid = mido.MidiFile(ticks_per_beat=480); tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=500000, time=0))            # 960 ticks per second
    msgs = []
    for nm, cc in ch.items():
        prog, pan, vol, _ = INST[nm]
        msgs += [(0, 0, mido.Message('program_change', channel=cc, program=prog)), (0, 1, mido.Message('control_change', channel=cc, control=10, value=pan)),
                 (0, 1, mido.Message('control_change', channel=cc, control=7, value=vol)), (0, 1, mido.Message('control_change', channel=cc, control=91, value=0)),
                 (0, 1, mido.Message('control_change', channel=cc, control=93, value=0))]
    msgs += [(0, 1, mido.Message('control_change', channel=9, control=7, value=100)), (0, 1, mido.Message('control_change', channel=9, control=91, value=0))]
    for e in A.ev:
        cc = 9 if e['i'] == DRUM else ch[e['i']]
        t0 = max(0.0, e['t'])
        msgs.append((t0, 3, mido.Message('note_on', channel=cc, note=e['p'], velocity=e['v'])))
        msgs.append((t0 + e['d'], 2, mido.Message('note_off', channel=cc, note=e['p'], velocity=0)))
    msgs.sort(key=lambda x: (x[0], x[1]))
    last = 0
    for t, _, m in msgs:
        tick = int(round(t * 960)); m.time = tick - last; last = tick; tr.append(m)
    end = max([e['t'] + e['d'] for e in A.ev] + [0]) + tail
    if length: end = length
    tmp = tempfile.mkdtemp()
    mf, wf = os.path.join(tmp, name + '.mid'), os.path.join(tmp, name + '.wav')
    mid.save(mf)
    subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '0.6', '-r', str(SR), '-F', wf, SF2, mf], check=True, capture_output=True)
    x, sr = sf.read(wf, dtype='float32')
    assert sr == SR
    n = int(end * SR)
    if len(x) < n: x = np.pad(x, ((0, n - len(x)), (0, 0)))
    return x[:n]

def per_inst(A, name, length=None, fx=True):
    """render each instrument separately so each gets its own low-pass (the chip's softness differs by voice)"""
    out = None
    groups = {}
    for e in A.ev: groups.setdefault(e['i'], []).append(e)
    for nm, evs in groups.items():
        B = Arr(); B.ev = evs
        x = render(B, f'{name}_{nm}', length)
        lp = 9000 if nm == DRUM else INST[nm][3]
        x = lowpass(x, lp)
        out = x if out is None else _add(out, x)
    if out is None: out = np.zeros((int((length or 1) * SR), 2), np.float32)
    return snes_echo(out) if fx else out

def _add(a, b):
    n = max(len(a), len(b))
    a = np.pad(a, ((0, n - len(a)), (0, 0))); b = np.pad(b, ((0, n - len(b)), (0, 0)))
    return a + b

def lowpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'low')
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)
def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)
def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)

def snes_echo(x, delay=0.144, fb=0.36, wet=0.24):
    """the chip's echo: a feedback delay whose loop is low-passed by a short FIR, slightly different L/R times"""
    h = np.array([0.1, 0.18, 0.24, 0.24, 0.14, 0.06, 0.03, 0.01])
    y = x.copy()
    n = len(x)
    for c, dl in ((0, delay), (1, delay + 0.016)):
        d = int(dl * SR)
        xs = x[:, c].astype(np.float64)
        w = np.zeros(n); e = np.zeros(n)
        for s0 in range(0, n, d):
            s1 = min(n, s0 + d)
            idx = np.arange(s0, s1) - d
            acc = np.zeros(s1 - s0)
            for k, hk in enumerate(h):
                j = idx - k
                ok = j >= 0
                acc[ok] += hk * w[j[ok]]
            e[s0:s1] = acc
            w[s0:s1] = xs[s0:s1] + fb * acc
        y[:, c] = xs + wet * e
    return y.astype(np.float32)

def db(x): return 20 * np.log10(max(1e-9, x))
def loudness(x):
    import pyloudnorm as pyln
    m = pyln.Meter(SR)
    if len(x) < SR * 0.5: return -70.0
    try: return float(m.integrated_loudness(x.astype(np.float64)))
    except Exception: return -70.0
def gain_to(x, lufs):
    L = loudness(x)
    return x * (10 ** ((lufs - L) / 20)) if L > -69 else x

def save(x, name):
    fn = os.path.join(BUILD, name)
    sf.write(fn, x, SR, subtype='PCM_24')
    return fn
