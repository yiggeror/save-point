"""The score of 《存档点》 (draft for checkpoint 3).

One tune, the shop music, in F major at 120 bpm with swung eighths: a small 16-bit band (flute with a glockenspiel
an octave up, marimba off-beats, pizzicato and upright bass on one and three, a harp, shaker and wood block).
Its full form is A (ends open, on C) · A′ (ends closed, on F) · B (the bridge) · A″. Until the hero comes back,
the film never lets it reach the closed cadence: every loop restarts it from bar 1 and is cut off by the
"game over" drifting in through the window. The first time A′ closes is on the star under the counter.

Material
  · the hook: C–F–A (the same rising arpeggio as the save chime), answered by G–F–D
  · game over: the hook turned around and slowed (A–F–C, a sigh D–C), on an ocarina, far away
  · the bell is tuned to F; coins and menu blips are in F major

Outputs (build/audio/): shop_master.wav, gameover.wav, montage.wav, musicbox.wav, wait.wav, first_note.wav,
return.wav, credits.wav, save_jingle.wav, theme_demo.wav — each starting at its cue's own zero.
"""
import math
import numpy as np
from music import Arr, Grid, Accel, grid_from, seq, swing, per_inst, render, save, lowpass, bandpass, snes_echo, load_cues, p, SR

C = load_cues()

# ------------------------------------------------------------------ harmony and the tune
V = {  # chord: (bass, voicing)
    'F': ('F2', ['A3', 'C4', 'F4']), 'F/A': ('A2', ['A3', 'C4', 'F4']), 'Dm7': ('D2', ['A3', 'C4', 'F4']), 'Gm7': ('G2', ['Bb3', 'D4', 'F4']),
    'C7': ('C2', ['Bb3', 'E4', 'G4']), 'C7sus': ('C2', ['Bb3', 'F4', 'G4']), 'Bb': ('Bb1', ['Bb3', 'D4', 'F4']), 'Bbmaj7': ('Bb1', ['A3', 'D4', 'F4']),
    'A7': ('A1', ['G3', 'C#4', 'E4']), 'G7': ('G2', ['F3', 'B3', 'D4']), 'Am7': ('A1', ['G3', 'C4', 'E4']), 'D7': ('D2', ['F#3', 'C4', 'D4']),
    'Bbmaj7/C': ('C2', ['Bb3', 'D4', 'F4', 'A4']), 'F6': ('F2', ['A3', 'D4', 'F4']),
}
HARM = {
    1: [('F', 4)], 2: [('Dm7', 4)], 3: [('Gm7', 4)], 4: [('C7', 4)], 5: [('F', 4)], 6: [('Bb', 4)], 7: [('Gm7', 2), ('C7', 2)], 8: [('C7sus', 3), ('C7', 1)],
    9: [('F', 4)], 10: [('Dm7', 4)], 11: [('Gm7', 4)], 12: [('C7', 4)], 13: [('F/A', 4)], 14: [('Bb', 4)], 15: [('C7', 4)], 16: [('F', 4)],
    17: [('Bbmaj7', 4)], 18: [('A7', 4)], 19: [('Dm7', 4)], 20: [('G7', 4)], 21: [('Gm7', 4)], 22: [('C7', 4)], 23: [('Am7', 2), ('D7', 2)], 24: [('Gm7', 2), ('C7', 2)],
}
MEL = {
    1: 'C5:.5 F5:.5 A5:1 G5:.5 F5:.5 D5:1', 2: 'C5:1.5 A4:.5 C5:2', 3: 'Bb4:.5 D5:.5 G5:1 F5:.5 E5:.5 D5:1', 4: 'E5:1.5 D5:.5 C5:2',
    5: 'C5:.5 F5:.5 A5:1 G5:.5 F5:.5 D5:1', 6: 'F5:1 G5:.5 A5:.5 Bb5:1.5 A5:.5', 7: 'G5:.5 F5:.5 E5:.5 F5:.5 G5:1 E5:1', 8: 'C5:3 r:1',
    9: 'C5:.5 F5:.5 A5:1 C6:.5 A5:.5 F5:1', 10: 'C5:1.5 A4:.5 C5:2', 11: 'Bb4:.5 D5:.5 G5:1 Bb5:.5 G5:.5 F5:1', 12: 'E5:1 G5:1 C6:1 Bb5:1',
    13: 'A5:1.5 F5:.5 C6:2', 14: 'D6:1 C6:.5 Bb5:.5 A5:1 G5:1', 15: 'A5:.5 Bb5:.5 G5:1 E5:1 G5:1', 16: 'F5:3 r:1',
    17: 'D5:1 F5:1 A5:1.5 G5:.5', 18: 'E5:2 C#5:1 E5:1', 19: 'F5:1 A5:1 D6:1.5 C6:.5', 20: 'B5:2 G5:2',
    21: 'Bb5:1 A5:.5 G5:.5 F5:1 D5:1', 22: 'E5:1 F5:.5 G5:.5 C5:2', 23: 'A5:1 G5:.5 F5:.5 F#5:1 A5:1', 24: 'G5:2 E5:1 C5:1',
}
for k in range(25, 33): HARM[k], MEL[k] = HARM[k - 16], MEL[k - 16]
HOOK = 'C5:.5 F5:.5 A5:1'

rng = np.random.default_rng(7)
def hum(x=0.008): return float(rng.uniform(-x, x))

def band(A, g, bar, tb, lv=1.0, parts=('mel', 'glock', 'bass', 'marimba', 'harp', 'drums'), mel_inst='flute', accent=None):
    """one bar of the shop band: grid bar `bar` plays theme bar `tb`"""
    B0 = (bar - 1) * 4
    if 'mel' in parts:
        seq(A, g, bar, 0, MEL[tb], 78 * lv, mel_inst)
        if 'glock' in parts: seq(A, g, bar, 0, MEL[tb], 64 * lv, 'glock', shift=12, leg=0.5)
    beat = 0
    for ch, nb in HARM[tb]:
        bass, vo = V[ch]
        if 'bass' in parts:
            for k in range(0, nb, 2):
                root = p(bass) + (7 if k == 2 and nb == 4 else 0)
                t0 = g.tb(B0 + beat + k) + hum()
                A.n(t0, g.tb(B0 + beat + k + 0.9) - t0, root, 70 * lv, 'bass')
                A.n(t0, g.tb(B0 + beat + k + 0.5) - t0, root + 12, 58 * lv, 'pizz')
        if 'marimba' in parts:
            for k in range(1, nb, 2):
                t0 = g.tb(B0 + beat + k) + hum()
                for q in vo: A.n(t0, g.tb(B0 + beat + k + 0.35) - t0, q, 50 * lv, 'marimba')
        beat += nb
    if 'marimba' in parts and bar % 2 == 0:       # a swung pickup into every other bar
        bass, vo = V[HARM[tb][-1][0]]
        t0 = g.tb(B0 + swing(3.5))
        A.n(t0, 0.1, vo[-1], 44 * lv, 'marimba')
    if 'harp' in parts and bar % 2 == 1:
        bass, vo = V[HARM[tb][0][0]]
        notes = [p(vo[0]) + 12, p(vo[1]) + 12, p(vo[2]) + 12, p(vo[0]) + 24]
        for k, q in enumerate(notes): A.n(g.tb(B0 + k * 0.25), g.tb(B0 + 2) - g.tb(B0 + k * 0.25), q, 46 * lv, 'harp')
    if 'drums' in parts:
        for k in range(8):
            Bk = B0 + swing(k * 0.5)
            A.dr(g.tb(Bk) + hum(0.004), 82, (66 if k % 2 == 0 else 44) * lv)       # shaker
        A.dr(g.tb(B0), 35, 62 * lv)                                               # soft kick
        for k in (1, 3): A.dr(g.tb(B0 + k), 76, 62 * lv)                          # wood block
        if (bar - 1) % 4 == 0: A.dr(g.tb(B0), 81, 48 * lv)                        # triangle on each phrase

# ------------------------------------------------------------------ cues
def shop_master():
    """the shop music from bar 1, as every loop hears it (the loops cut it where the day ends)"""
    A = Arr(); g = Grid(0, 120)
    for bar in range(1, 17): band(A, g, bar, bar)
    # the slap (bar 7, one): the band hits with it
    for q in V['Gm7'][1]: A.n(g.at(7), 0.18, q, 70, 'marimba')
    A.n(g.at(7), 0.3, 'G2', 90, 'bass'); A.dr(g.at(7), 49, 34); A.dr(g.at(7), 35, 60)
    # the pose (bar 9, one): a little "item get" sparkle over the start of A′
    for k, q in enumerate(['C6', 'F6', 'A6', 'C7']): A.n(g.at(9) + k * 0.06, 0.4, q, 52, 'glock')
    return per_inst(A, 'shop_master', length=g.at(17) + 2)

def gameover():
    """the hook turned around and slowed, far away (the mix makes it distant)"""
    A = Arr(); g = Grid(0, 132)
    seq(A, g, 1, 0, 'A4:1 F4:1 C4:1 | D4:.5 C4:2.5', 80, 'ocarina', sw=0.5, leg=0.96)
    for t, ch in ((0, 'F'), (3, 'Bb'), (3.5, 'F')):
        bass, vo = V[ch]
        dur = (0.5 if t == 3 else 3.0 if t == 0 else 2.5) * 60 / 132
        for q in vo: A.n(g.tb(t), dur, q, 40, 'accordion')
        A.n(g.tb(t), dur, bass, 50, 'bass')
    A.clamp(g.tb(6.0) + 0.1)
    return per_inst(A, 'gameover', length=g.tb(6.5) + 1.0)

def montage():
    """one piece that never stops: the tune restarts from its hook at every loop, faster and faster, and stops dead"""
    M = C['montage']; A = Arr(); g = Accel(0, M['bpm0'], M['bpm1'], M['bars'])
    for b0, n, gag, death, *cnt in M['loops']:
        if gag == 'tally':
            # counting: the hook on glockenspiel and marimba over a held F, the band keeps its pulse
            band(A, g, b0, 1, lv=0.8, parts=('bass', 'marimba', 'drums'))
            seq(A, g, b0, 0, 'C6:.5 F6:.5 A6:1 r:2', 60, 'glock', leg=0.5)
            seq(A, g, b0, 0, HOOK + ' r:2', 60, 'marimba', leg=0.6)
            continue
        first = 3 if b0 == 1 else 1          # the first montage loop carries on from loop 4's opening bars
        for k in range(n): band(A, g, b0 + k, first + k, lv=0.95 + 0.12 * (b0 / 22))
    end = g.at(23)
    A.clamp(end, release=0.015)
    return per_inst(A, 'montage', length=end + 1.0)

def musicbox():
    """the quiet: a music box, slowly; a held note while the tea is handed over; a pizzicato "hot!"; the second half"""
    Q = C['quiet']; t0 = C['musicBox']['t0']
    A = Arr(); g = Grid(0, 84)
    for bar, tb in ((1, 1), (2, 2)):
        seq(A, g, bar, 0, MEL[tb], 58, 'musicbox', sw=0.5)
        bass, vo = V[HARM[tb][0][0]]
        for k, q in enumerate(vo): A.n(g.at(bar) + k * 0.05, g.at(bar + 1) - g.at(bar), q, 26, 'harp')
    # the last note of bar 2 (C) is held through the hand-over and the gulp
    hold_end = Q['hot'] - t0
    A.ev = [e for e in A.ev if not (e['i'] == 'musicbox' and e['t'] >= g.at(2, 2) - 0.01)]
    A.n(g.at(2, 2), hold_end - g.at(2, 2), 'C5', 50, 'musicbox')
    A.n(g.at(2, 2), hold_end - g.at(2, 2), 'C4', 22, 'slowstr'); A.n(g.at(2, 2), hold_end - g.at(2, 2), 'F3', 18, 'slowstr')
    # hot! — a pizzicato tumble (in key)
    h = Q['hot'] - t0
    for k, q in enumerate(['F5', 'C5', 'A4', 'F4']): A.n(h + k * 0.09, 0.12, q, 64 - k * 6, 'pizz')
    A.n(h + 0.42, 0.4, 'C6', 30, 'xylo')
    # after the eyebrow: the second half of A, gently, ending open
    g2 = Grid(Q['brow'] + 0.5 - t0, 92)
    for bar, tb in ((1, 5), (2, 6), (3, 7), (4, 8)):
        seq(A, g2, bar, 0, MEL[tb], 56, 'musicbox', sw=0.5)
        for ch, nb in HARM[tb]:
            bass, vo = V[ch]
            A.n(g2.at(bar), g2.at(bar + 1) - g2.at(bar), bass, 30, 'bass')
            for q in vo: A.n(g2.at(bar), g2.at(bar + 1) - g2.at(bar), q, 22, 'slowstr')
            break
    end = g2.at(5) + 1.2
    A.clamp(end)
    return per_inst(A, 'musicbox', length=end + 1.5)

def wait():
    """the clock is the pulse; a C pedal under a chord that won't resolve; the hook without its answer; flashes"""
    W = C['wait']; t0 = W['t0']
    A = Arr()
    pass_t, lapse0, last = W['pass'] - t0, W['lapse'][0] - t0, W['last'] - t0
    # pedal from the moment the minute hand goes past 7:12, re-struck every 4 s, getting louder
    t = pass_t; k = 0
    while t < last:
        d = min(4.0, last - t + 0.3)
        A.n(t, d, 'C2', 44 + k * 5, 'bass'); A.n(t, d, 'C3', 30 + k * 5, 'slowstr')
        t += 4.0; k += 1
    # the suspended chord from the time-lapse on
    t = lapse0; k = 0
    while t < last:
        d = min(4.0, last - t + 0.3)
        for q in V['Bbmaj7/C'][1]: A.n(t, d, q, 22 + k * 5, 'slowstr')
        t += 4.0; k += 1
    # the hook, unanswered, on the harp (on the clock's beats)
    for s in (lapse0 + 1.0, lapse0 + 5.0, lapse0 + 9.0):
        if s < last - 2:
            for j, q in enumerate(['C5', 'F5', 'A5']): A.n(s + j * 0.5 * (1 if j < 2 else 1), 1.4 if j == 2 else 0.5, q, 40, 'harp')
    # each flash: a soft low timpani and a pizzicato C
    for f in W['flashes']:
        A.n(f - t0, 1.2, 'C2', 60, 'timp'); A.n(f - t0, 0.3, 'C3', 50, 'pizz')
    A.clamp(last + 0.35)
    return per_inst(A, 'wait', length=W['t1'] - t0 + 0.5)

def first_note():
    """after the first flash in the night: the game over's first note, far away — and then nothing"""
    A = Arr(); A.n(0.0, 0.55, 'A4', 70, 'ocarina'); A.n(0.0, 0.55, 'F3', 30, 'accordion')
    return per_inst(A, 'first_note', length=2.0)

def return_cue():
    """the bell resolves it: A′, warm and small, closing on F for the first time — on the star"""
    R = C['ret']; g = grid_from(R['grid'], 0)
    A = Arr()
    for bar in range(1, 9):
        tb = 8 + bar
        band(A, g, bar, tb, lv=0.85, parts=('mel', 'bass', 'harp'), mel_inst='flute')
        seq(A, g, bar, 0, MEL[tb], 36, 'clarinet', shift=-12)
        for ch, nb in HARM[tb]:
            bass, vo = V[ch]
            for q in vo: A.n(g.at(bar), g.at(bar + 1) - g.at(bar), q, 26, 'slowstr')
            break
    # the horn on the counter (bar 3, one): a soft low accent
    A.n(g.at(3), 1.2, 'G2', 55, 'timp')
    # the star (bar 8, one): the first closed cadence, a sparkle
    for k, q in enumerate(['A6', 'C7', 'F7']): A.n(g.at(8) + k * 0.07, 0.8, q, 40, 'glock')
    A.dr(g.at(8), 81, 40)
    for q in ['F2', 'C3', 'A3', 'C4', 'F4']: A.n(g.at(8), g.at(9, 1.5) - g.at(8), q, 40, 'harp' if q[-1] != '2' else 'bass')
    end = R['t1'] - R['grid']['t0'] - 0.05
    A.clamp(end, release=0.25)
    return per_inst(A, 'return', length=end + 0.6)

def credits():
    """credits: the end of the bridge, then A′'s last phrase, the whole band, closing on F"""
    A = Arr(); g = Grid(0, 120)
    for bar, tb in enumerate([19, 20, 13, 14, 15, 16], start=1): band(A, g, bar, tb)
    for q in ['F2', 'C3', 'A3', 'C4', 'F4', 'A4']: A.n(g.at(6), 2.2, q, 50, 'harp' if q != 'F2' else 'bass')
    end = C['credits']['t1'] - C['credits']['grid']['t0']
    A.clamp(end, release=0.4)
    return per_inst(A, 'credits', length=end + 0.5)

def save_jingle():
    A = Arr()
    for k, q in enumerate(['C6', 'F6', 'A6', 'C7']): A.n(k * 0.11, 0.9 - k * 0.1, q, 64, 'celesta')
    for q in ['F3', 'A3', 'C4', 'F4']: A.n(0.33, 1.0, q, 30, 'slowstr')
    return per_inst(A, 'save_jingle', length=2.2)

def theme_demo():
    """the whole tune once: A · A′ · B · A″ (the only place it plays from the top to its end without a cut)"""
    A = Arr(); g = Grid(0, 120)
    for bar in range(1, 33):
        band(A, g, bar, bar, lv=1.0 if bar < 17 or bar > 24 else 0.9)
        if 17 <= bar <= 24:
            bass, vo = V[HARM[bar][0][0]]
            for q in vo: A.n(g.at(bar), g.at(bar + 1) - g.at(bar), q, 24, 'slowstr')
    for q in ['F2', 'C3', 'A3', 'C4', 'F4', 'A4']: A.n(g.at(32), 3.0, q, 52, 'harp' if q != 'F2' else 'bass')
    for k, q in enumerate(['A6', 'C7', 'F7']): A.n(g.at(32) + k * 0.07, 1.0, q, 44, 'glock')
    A.clamp(g.at(33) + 2.0)
    return per_inst(A, 'theme_demo', length=g.at(33) + 3.0)

if __name__ == '__main__':
    import sys
    which = sys.argv[1:] or ['shop_master', 'gameover', 'montage', 'musicbox', 'wait', 'first_note', 'return', 'credits', 'save_jingle', 'theme_demo']
    fns = {'shop_master': shop_master, 'gameover': gameover, 'montage': montage, 'musicbox': musicbox, 'wait': wait, 'first_note': first_note,
           'return': return_cue, 'credits': credits, 'save_jingle': save_jingle, 'theme_demo': theme_demo}
    for w in which:
        x = fns[w]()
        print(f'{w:12s} {len(x) / SR:6.2f}s  peak {20 * np.log10(np.max(np.abs(x)) + 1e-9):6.1f} dB  → {save(x, w + ".wav")}')
