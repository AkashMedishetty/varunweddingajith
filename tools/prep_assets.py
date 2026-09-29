#!/usr/bin/env python3
"""Prepare every asset for the Varun & Bhavani invitation.

Inputs  : raw/01.png .. raw/12.png (generated art), the printed-card PDF.
Outputs : assets/*.webp|png|svg + assets/manifest.json (sizes + anchor points
          the page uses for exact placement).

Re-runnable; nothing in raw/ is modified.
"""
import heapq
import json
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
PDF = Path("/Users/akash/.kiro/crew/uploads/d0b8af6636e3458d87e494e3ce882af3_Varun_Kumar_Bhavani.pdf")
TMP = Path("/tmp/vk-invite/prep")
TMP.mkdir(parents=True, exist_ok=True)

manifest = {}


def save_webp(im, name, q=82, alpha_q=90, lossless=False):
    p = OUT / name
    im.save(p, "WEBP", quality=q, alpha_quality=alpha_q, method=6, lossless=lossless)
    return p.stat().st_size


def trim_rgba(im, pad=6, thr=12):
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > thr)
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1)
    return im.crop((x0, y0, x1, y1)), (x0, y0)


def fit(im, w=None, h=None):
    if w:
        return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def clean_alpha(im):
    """Kill near-invisible alpha noise and bleed edge colour into clear pixels so
    WebP's lossy colour planes do not show dark/white halos at the cut line."""
    a = np.asarray(im).astype(np.float32)
    alpha = a[..., 3]
    alpha[alpha < 6] = 0
    rgb = a[..., :3]
    solid = (alpha > 200).astype(np.uint8)
    if solid.any():
        # inpaint colour of transparent pixels from nearby solid pixels
        rgb8 = rgb.clip(0, 255).astype(np.uint8)
        mask = (alpha < 1).astype(np.uint8) * 255
        small = cv2.resize(rgb8, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
        msmall = cv2.resize(mask, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
        filled = cv2.inpaint(small, msmall, 3, cv2.INPAINT_TELEA)
        filled = cv2.resize(filled, (rgb8.shape[1], rgb8.shape[0]), interpolation=cv2.INTER_LINEAR)
        rgb = np.where(mask[..., None] > 0, filled.astype(np.float32), rgb)
    out = np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out)


# ----------------------------------------------------------------- RGBA art
ART = {
    # key : (raw, fit-kwargs, quality)
    "leaves":    ("02", {"w": 640}, 78),
    "garland":   ("03", {"h": 1000}, 82),
    "couple":    ("04", {"h": 1100}, 80),
    "cow":       ("05", {"w": 520}, 80),
    "ganesha":   ("06", {"w": 600}, 80),
    "jeelakarra": ("07", {"w": 1100}, 78),
    "mangalya":  ("08", {"w": 1100}, 76),
    "talambralu": ("09", {"w": 1100}, 76),
    "arundhati": ("10", {"h": 1150}, 78),
    "kalasham":  ("11", {"w": 600}, 78),
}

for key, (src, kw, q) in ART.items():
    im = Image.open(RAW / f"{src}.png").convert("RGBA")
    im, off = trim_rgba(im)
    trimmed_size = im.size
    im = fit(im, **kw)
    im = clean_alpha(im)
    size = save_webp(im, f"{key}.webp", q=q)
    manifest[key] = {"src": f"assets/{key}.webp", "w": im.width, "h": im.height, "kb": round(size / 1024)}
    im.save(TMP / f"{key}.png")
    # anchor detection helpers
    a = np.asarray(im)[..., 3]
    if key == "arundhati":
        ys, xs = np.nonzero(a > 128)
        top = ys.min()
        xs_top = xs[ys <= top + 6]
        manifest[key]["finger"] = [round(float(xs_top.mean()) / im.width, 4), round(float(top) / im.height, 4)]
        fx = float(xs_top.mean())
        sel = (ys <= top + 0.11 * im.height) & (np.abs(xs - fx) < 0.16 * im.width)
        pts = np.column_stack([xs[sel], ys[sel]]).astype(np.float64)
        pts -= pts.mean(0)
        _, _, vt = np.linalg.svd(pts, full_matrices=False)
        dvec = vt[0] if vt[0][1] < 0 else -vt[0]
        manifest[key]["dir"] = [round(float(dvec[0]), 4), round(float(dvec[1]), 4)]
    if key == "ganesha":
        ys, xs = np.nonzero(a > 128)
        manifest[key]["center"] = [round(float((xs.min() + xs.max()) / 2) / im.width, 4),
                                   round(float((ys.min() + ys.max()) / 2) / im.height, 4)]
    print(f"{key:11s} {im.width}x{im.height}  {size/1024:.0f} KB  (trimmed from {trimmed_size})")

# ----------------------------------------------------------------- temple
t0 = np.asarray(Image.open(RAW / "01.png").convert("RGB")).astype(np.float32)
L = t0 @ np.array([0.299, 0.587, 0.114], np.float32)
dark = 1.0 - L / 255.0
ink_full = np.clip((dark - 0.045) / (0.52 - 0.045), 0, 1) ** 0.9
rows = np.nonzero((ink_full > 0.2).mean(1) > 0.004)[0]
y0, y1 = max(0, rows.min() - 10), min(ink_full.shape[0], rows.max() + 12)
ink = ink_full[y0:y1]
H, W = ink.shape

# circle for Ganesha: biggest empty disc near the top-centre axis
empty = (ink < 0.12).astype(np.uint8)
dt = cv2.distanceTransform(empty, cv2.DIST_L2, 5)
win = dt[int(0.12 * H):int(0.45 * H), int(0.44 * W):int(0.56 * W)]
yy, xx = np.unravel_index(np.argmax(win), win.shape)
ccy, ccx = yy + int(0.12 * H), xx + int(0.44 * W)
cr = float(dt[ccy, ccx])
# doorway: biggest empty region on the axis in the lower half
win2 = dt[int(0.55 * H):int(0.9 * H), int(0.46 * W):int(0.54 * W)]
yy2, xx2 = np.unravel_index(np.argmax(win2), win2.shape)
dcy, dcx = yy2 + int(0.55 * H), xx2 + int(0.46 * W)
print(f"temple crop {W}x{H} circle=({ccx},{ccy}) r={cr:.1f}  door=({dcx},{dcy}) r={dt[dcy, dcx]:.1f}")

# geodesic "ink arrival" time: shortest path cost from the bottom step,
# cheap along ink, expensive across paper -> ink appears to flow along strokes
F = 3
Hd, Wd = H // F, W // F
ink_ds = ink[:Hd * F, :Wd * F].reshape(Hd, F, Wd, F).max(axis=(1, 3))
cost = np.where(ink_ds > 0.22, 1.0, 9.0).ravel().tolist()
N = Hd * Wd
dist = [float("inf")] * N
band = range(int(Wd * 0.46), int(Wd * 0.54))
seed_row = max(r for r in range(Hd) if any(ink_ds[r, c] > 0.22 for c in band))
heap = []
for c in band:
    if ink_ds[seed_row, c] > 0.22:
        i = seed_row * Wd + c
        dist[i] = 0.0
        heap.append((0.0, i))
heapq.heapify(heap)
NB = [(-1, -1, 1.4142), (-1, 0, 1.0), (-1, 1, 1.4142), (0, -1, 1.0), (0, 1, 1.0),
      (1, -1, 1.4142), (1, 0, 1.0), (1, 1, 1.4142)]
while heap:
    d, i = heapq.heappop(heap)
    if d > dist[i]:
        continue
    y, x = divmod(i, Wd)
    ci = cost[i]
    for dy, dx, ln in NB:
        yy_, xx_ = y + dy, x + dx
        if 0 <= yy_ < Hd and 0 <= xx_ < Wd:
            j = yy_ * Wd + xx_
            nd = d + ln * 0.5 * (ci + cost[j])
            if nd < dist[j]:
                dist[j] = nd
                heapq.heappush(heap, (nd, j))
tmap = np.array(dist, np.float32).reshape(Hd, Wd)
ref = np.percentile(tmap[ink_ds > 0.22], 99.6)
tmap = np.clip(tmap / ref, 0, 1)
TW, TH = W // 2, H // 2
tmap_up = cv2.resize(tmap, (TW, TH), interpolation=cv2.INTER_LINEAR)
tmap_up = cv2.GaussianBlur(tmap_up, (0, 0), 1.1)
Image.fromarray((tmap_up * 255).round().astype(np.uint8)).save(OUT / "temple-time.png", optimize=True)

col = np.array([140, 98, 48], np.float32)
# sepia-on-white, opaque: WebGL derives ink from luminance; the static fallback
# is multiplied onto the paper so the white disappears.
rgb = (255 * (1 - ink[..., None]) + col * ink[..., None]).clip(0, 255).astype(np.uint8)
Image.fromarray(rgb).save(OUT / "temple.webp", "WEBP", quality=68, method=6)
old_ink = OUT / "temple-ink.webp"
if old_ink.exists():
    old_ink.unlink()

# debug preview of the time map (for my own check)
vis = cv2.applyColorMap((tmap_up * 255).astype(np.uint8), cv2.COLORMAP_TURBO)
ink_small = cv2.resize(ink, (TW, TH), interpolation=cv2.INTER_AREA)
vis = (vis * ink_small[..., None] + 255 * (1 - ink_small[..., None])).astype(np.uint8)
cv2.imwrite(str(TMP / "time-preview.png"), vis)

manifest["temple"] = {
    "src": "assets/temple.webp", "time": "assets/temple-time.png",
    "w": W, "h": H,
    "circle": [round(ccx / W, 4), round(ccy / H, 4), round(cr / W, 4)],
    "door": [round(dcx / W, 4), round(dcy / H, 4)],
    "kb": round(((OUT / "temple.webp").stat().st_size + (OUT / "temple-time.png").stat().st_size) / 1024),
}
print("temple", (OUT / "temple.webp").stat().st_size // 1024, "KB  time", (OUT / "temple-time.png").stat().st_size // 1024, "KB")

# ----------------------------------------------------------------- paper
p = np.asarray(Image.open(RAW / "12.png").convert("RGB")).astype(np.float32)
Hp, Wp = p.shape[:2]
rolled = np.roll(np.roll(p, Hp // 2, 0), Wp // 2, 1)
yy, xx = np.mgrid[0:Hp, 0:Wp]
w = np.minimum(np.minimum(yy, Hp - 1 - yy) / (Hp / 2), np.minimum(xx, Wp - 1 - xx) / (Wp / 2))
w = np.clip(w * 2.4, 0, 1)
w = (w * w * (3 - 2 * w))[..., None]
seam = (p * w + rolled * (1 - w)).clip(0, 255).astype(np.uint8)
paper = Image.fromarray(seam).resize((720, 720), Image.LANCZOS)
save_webp(paper, "paper.webp", q=74)
manifest["paper"] = {"src": "assets/paper.webp", "w": 720, "h": 720,
                     "mean": [int(v) for v in np.asarray(paper).reshape(-1, 3).mean(0)]}
print("paper", (OUT / "paper.webp").stat().st_size // 1024, "KB mean", manifest["paper"]["mean"])


# ----------------------------------------------------------------- turmeric + kumkum dabs
def fbm(size, rng, octaves=(4, 8, 16, 32), amps=(1, .5, .25, .12)):
    acc = np.zeros((size, size), np.float32)
    for o, amp in zip(octaves, amps):
        g = rng.random((o, o)).astype(np.float32)
        acc += amp * cv2.resize(g, (size, size), interpolation=cv2.INTER_CUBIC)
    acc -= acc.min()
    return acc / acc.max()


def blob(size, rng, rx, ry, ang, rough, cx=0.5, cy=0.5):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
    x, y = xx - cx, yy - cy
    c, s = np.cos(ang), np.sin(ang)
    u, v = (x * c + y * s) / rx, (-x * s + y * c) / ry
    d = np.sqrt(u * u + v * v) + rough * (fbm(size, rng) - 0.5)
    return np.clip((1.0 - d) / 0.06, 0, 1)


def dab(seed, size=256):
    rng = np.random.default_rng(seed)
    m = blob(size, rng, 0.36, 0.25, rng.uniform(0, np.pi), 0.55)
    grain = fbm(size, rng, (32, 64, 128), (1, .6, .4))
    rim = np.clip(1 - m, 0, 1) * (m > 0.02)
    base = np.array([233, 165, 28], np.float32)
    light = np.array([246, 199, 82], np.float32)
    dark_c = np.array([196, 122, 12], np.float32)
    t = grain[..., None]
    rgb = base * (1 - t) + light * t
    rgb = rgb * (1 - 0.6 * rim[..., None]) + dark_c * (0.6 * rim[..., None])
    alpha = m * (0.78 + 0.22 * grain)
    # kumkum dot, slightly off-centre
    k = blob(size, rng, 0.11, 0.1, rng.uniform(0, np.pi), 0.35,
             0.5 + rng.uniform(-.05, .05), 0.5 + rng.uniform(-.05, .05))
    kg = fbm(size, rng, (24, 48, 96), (1, .6, .3))[..., None]
    krgb = np.array([150, 12, 22], np.float32) * (1 - kg * .5) + np.array([196, 24, 32], np.float32) * (kg * .5)
    kk = k[..., None]
    rgb = rgb * (1 - kk) + krgb * kk
    alpha = np.maximum(alpha, k)
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out)


for i, sd in enumerate((11, 29)):
    save_webp(dab(sd), f"dab{i + 1}.webp", q=80)
manifest["dabs"] = ["assets/dab1.webp", "assets/dab2.webp"]

# ----------------------------------------------------------------- PDF line art (raster masks)
# boxes measured on the 110-dpi renders (x0, y0, x1, y1) -> rendered at 800 dpi, trimmed
DPI, BASE = 800, 110
LINEART = {
    "la-ganesha":    (2, (150, 196, 247, 307)),
    "la-shiva":      (2, (664, 195, 759, 311)),
    "la-feast":      (2, (289, 820, 627, 900)),
    "la-venkatesa":  (3, (624, 206, 759, 306)),
    "la-couple":     (3, (166, 588, 287, 678)),
    "la-nadaswaram": (3, (620, 592, 744, 676)),
    "la-handshake":  (1, (152, 525, 238, 569)),
    "la-offer":      (1, (252, 826, 316, 903)),
    "la-flourish":   (1, (338, 225, 572, 247)),
    "la-orn":        (1, (646, 452, 782, 488)),
}
k = DPI / BASE
for name, (page, (x0, y0, x1, y1)) in LINEART.items():
    X, Y, Wc, Hc = int(x0 * k), int(y0 * k), int((x1 - x0) * k), int((y1 - y0) * k)
    stem = TMP / name
    subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(page), "-l", str(page), "-x", str(X), "-y", str(Y),
                    "-W", str(Wc), "-H", str(Hc), "-gray", "-png", "-singlefile", str(PDF), str(stem)],
                   check=True, stderr=subprocess.DEVNULL)
    g = np.asarray(Image.open(f"{stem}.png").convert("L")).astype(np.float32)
    a = np.clip((255 - g) / 200.0, 0, 1)
    ys, xs = np.nonzero(a > 0.25)
    pad = 8
    a = a[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
    hh, ww = a.shape
    cap = 900 if name == "la-feast" else (700 if name in ("la-flourish", "la-orn") else 480)
    scale = min(1.0, cap / max(hh, ww))
    if scale < 1:
        a = cv2.resize(a, (int(ww * scale), int(hh * scale)), interpolation=cv2.INTER_AREA)
    ink_col = np.array([58, 36, 20], np.float32)
    rgba = np.dstack([np.broadcast_to(ink_col, a.shape + (3,)), a * 255]).astype(np.uint8)
    im = Image.fromarray(rgba)
    size = save_webp(im, f"{name}.webp", q=80, alpha_q=85)
    manifest[name] = {"src": f"assets/{name}.webp", "w": im.width, "h": im.height, "kb": round(size / 1024)}
    im.save(TMP / f"{name}-prev.png")
    print(f"{name:14s} {im.width}x{im.height} {size/1024:.0f} KB")

# ----------------------------------------------------------------- VB monogram (true vector)
subprocess.run(["pdftocairo", "-svg", "-f", "1", "-l", "1", str(PDF), str(TMP / "p1.svg")],
               check=True, stderr=subprocess.DEVNULL)
svg = (TMP / "p1.svg").read_text()
body = svg.split("</defs>", 1)[1]
REG = (256, 406, 343, 474)   # points, page 1
picked = []
ux0 = uy0 = 1e9
ux1 = uy1 = -1e9
for m in re.finditer(r"<path [^>]*/>", body):
    tag = m.group(0)
    dm = re.search(r' d="([^"]*)"', tag)
    if not dm or 'fill="none"' in tag:
        continue
    nums = [float(v) for v in re.findall(r"-?\d+\.?\d*(?:e-?\d+)?", dm.group(1))]
    pts = np.array(nums[: len(nums) // 2 * 2]).reshape(-1, 2)
    tm = re.search(r'transform="matrix\(([^)]*)\)"', tag)
    if tm:
        a_, b_, c_, d_, e_, f_ = [float(v) for v in tm.group(1).split(",")]
        pts = np.column_stack([a_ * pts[:, 0] + c_ * pts[:, 1] + e_, b_ * pts[:, 0] + d_ * pts[:, 1] + f_])
    bx0, by0 = pts.min(0)
    bx1, by1 = pts.max(0)
    if bx0 >= REG[0] and by0 >= REG[1] and bx1 <= REG[2] and by1 <= REG[3]:
        clean = re.sub(r' fill="[^"]*"', "", tag)
        clean = re.sub(r' fill-opacity="[^"]*"', "", clean)
        picked.append(clean)
        ux0, uy0, ux1, uy1 = min(ux0, bx0), min(uy0, by0), max(ux1, bx1), max(uy1, by1)
pad = 1.5
vb = f"{ux0 - pad:.2f} {uy0 - pad:.2f} {ux1 - ux0 + 2 * pad:.2f} {uy1 - uy0 + 2 * pad:.2f}"
mono = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" class="vb-svg" aria-hidden="true">'
        f'<g class="vb-paths">{"".join(picked)}</g></svg>')
(OUT / "vb.svg").write_text(mono)
manifest["vb"] = {"src": "assets/vb.svg", "paths": len(picked), "viewBox": vb}
print("VB monogram paths", len(picked), "viewBox", vb, (OUT / "vb.svg").stat().st_size // 1024, "KB")

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
total = sum(f.stat().st_size for f in OUT.iterdir() if f.is_file())
print("assets total", total // 1024, "KB")
sys.exit(0)
