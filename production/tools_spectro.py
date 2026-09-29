"""Pixel spectrogram of a wav (log frequency, beat grid overlay) → PNG, for checking a render without ears."""
import sys, numpy as np, soundfile as sf, zlib, struct
def png(fn, img):
    h, w, _ = img.shape
    raw = b''.join(b'\x00' + img[y].tobytes() for y in range(h))
    def ch(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(fn, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 9)) + ch(b'IEND', b''))
fn, out = sys.argv[1], sys.argv[2]
bpm = float(sys.argv[3]) if len(sys.argv) > 3 else 120
t0, t1 = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (0, None)
x, sr = sf.read(fn); x = x.mean(axis=1) if x.ndim > 1 else x
x = x[int(t0 * sr): int(t1 * sr) if t1 else None]
hop, N = 256, 4096
frames = 1 + (len(x) - N) // hop
win = np.hanning(N)
S = np.array([np.abs(np.fft.rfft(x[i * hop:i * hop + N] * win)) for i in range(frames)])
f = np.fft.rfftfreq(N, 1 / sr)
H = 360
mids = np.linspace(np.log2(40), np.log2(10000), H)
img = np.zeros((H, frames, 3), np.uint8)
for r, m in enumerate(mids):
    k = np.argmin(np.abs(np.log2(f + 1e-9) - m))
    v = 20 * np.log10(S[:, k] + 1e-9)
    v = np.clip((v + 30) / 60, 0, 1)
    img[H - 1 - r, :, 0] = (v * 255).astype(np.uint8); img[H - 1 - r, :, 1] = (v ** 2 * 200).astype(np.uint8); img[H - 1 - r, :, 2] = (v ** 0.5 * 120).astype(np.uint8)
# beat lines
for b in np.arange(0, (len(x) / sr) * bpm / 60, 1):
    c = int(b * 60 / bpm * sr / hop)
    if c < frames: img[:, c, :] = [60, 60, 90] if b % 4 else [120, 120, 160]
# C notes (octave lines)
for o in range(1, 9):
    fr = 440 * 2 ** ((12 * (o + 1) - 69) / 12)
    r = H - 1 - int((np.log2(fr) - mids[0]) / (mids[-1] - mids[0]) * (H - 1))
    if 0 <= r < H: img[r, ::4, :] = [200, 200, 80]
png(out, img)
print(frames, 'cols')
