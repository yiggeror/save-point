"""Extract bitmap glyphs from the Fusion Pixel 12px TTF (SIL OFL 1.1, see fonts/OFL-FusionPixel.txt) into
assets/font/fusion12.json, for every character used in the sources (sheets, credits, UI).

The TTF is a pixel font: every glyph is a union of axis-aligned squares on a 100-unit grid (1200 units/em, 12 px),
so testing each pixel centre against the outline reproduces the bitmap exactly.

usage: python3 tools/font_extract.py            (scans src/, tools/, docs/ for characters)
"""
import glob, json, os
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTF = os.path.join(ROOT, 'fonts', 'FusionPixel-12px.ttf')
OUT = os.path.join(ROOT, 'assets', 'font', 'fusion12.json')

chars = set(chr(c) for c in range(32, 127))
for pat in ('src/**/*.js', 'tools/*.mjs', 'docs/*.md', 'src/**/*.json'):
    for fn in glob.glob(os.path.join(ROOT, pat), recursive=True):
        chars |= set(open(fn, encoding='utf8').read())
chars = sorted(c for c in chars if ord(c) >= 32)

font = TTFont(TTF)
cmap = font.getBestCmap()
gs = font.getGlyphSet()
upm = font['head'].unitsPerEm
U = upm // 12
ASC = 10  # pixels above the baseline

def contours(name):
    pen = RecordingPen(); gs[name].draw(pen)
    out, cur = [], []
    for op, args in pen.value:
        if op == 'moveTo': cur = [args[0]]
        elif op == 'lineTo': cur.append(args[0])
        elif op in ('closePath', 'endPath'):
            if cur: out.append(cur)
            cur = []
        else:  # curves never occur in this font; approximate with the end point just in case
            cur.append(args[-1])
    if cur: out.append(cur)
    return out

def inside(px, py, polys):
    wn = 0
    for poly in polys:
        n = len(poly)
        for i in range(n):
            x0, y0 = poly[i]; x1, y1 = poly[(i + 1) % n]
            if y0 <= py < y1 or y1 <= py < y0:
                xi = x0 + (py - y0) * (x1 - x0) / (y1 - y0)
                if xi > px: wn += 1 if y1 > y0 else -1
    return wn != 0

glyphs = {}
missing = []
for ch in chars:
    cp = ord(ch)
    if cp not in cmap: missing.append(ch); continue
    name = cmap[cp]
    adv = font['hmtx'][name][0]
    polys = contours(name)
    w = max(1, round(adv / U))
    rows = []
    for py in range(12):
        yc = (ASC - py - 0.5) * U
        rows.append(''.join('#' if inside((px + 0.5) * U, yc, polys) else '.' for px in range(w)))
    glyphs[ch] = {'w': w, 'r': rows}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'size': 12, 'ascent': ASC, 'glyphs': glyphs}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(glyphs)} glyphs → {os.path.relpath(OUT, ROOT)}' + (f'  (missing: {"".join(missing)})' if missing else ''))
