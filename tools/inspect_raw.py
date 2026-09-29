#!/usr/bin/env python3
"""Contact sheet + alpha statistics for the raw generated assets.

Usage: python3 tools/inspect_raw.py [out.png]
Writes a checkerboard contact sheet (so transparency is visible) and prints,
per image: size, alpha coverage, and whether the subject touches an edge
(a subject that touches the border was probably cropped by the generator).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

RAW = Path(__file__).resolve().parent.parent / "raw"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/vk-invite/sheet.png")
CELL = 400
COLS = 4


def checker(w, h, s=16):
    a = np.zeros((h, w, 3), np.uint8)
    yy, xx = np.mgrid[0:h, 0:w]
    m = ((yy // s + xx // s) % 2).astype(bool)
    a[m] = (150, 150, 150)
    a[~m] = (110, 110, 110)
    return Image.fromarray(a, "RGB")


files = sorted(RAW.glob("[0-9][0-9].png"))
rows = (len(files) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * CELL, rows * CELL), (40, 40, 40))
draw = ImageDraw.Draw(sheet)

for i, f in enumerate(files):
    im = Image.open(f)
    rgba = im.convert("RGBA")
    a = np.asarray(rgba)[..., 3]
    info = f"{f.stem}: {im.size[0]}x{im.size[1]} mode={im.mode}"
    if im.mode == "RGBA":
        opaque = (a > 250).mean()
        clear = (a < 5).mean()
        ys, xs = np.nonzero(a > 16)
        bbox = (xs.min(), ys.min(), xs.max(), ys.max()) if len(xs) else None
        edge = []
        if bbox:
            if bbox[0] <= 2: edge.append("L")
            if bbox[1] <= 2: edge.append("T")
            if bbox[2] >= im.size[0] - 3: edge.append("R")
            if bbox[3] >= im.size[1] - 3: edge.append("B")
        info += f" opaque={opaque:.2f} clear={clear:.2f} bbox={bbox} touches={''.join(edge) or '-'}"
    else:
        rgb = np.asarray(im.convert("RGB")).astype(int)
        info += f" mean={rgb.reshape(-1,3).mean(0).round(1).tolist()} corner={rgb[4,4].tolist()}"
    print(info)
    t = rgba.copy()
    t.thumbnail((CELL - 8, CELL - 24))
    bg = checker(t.size[0], t.size[1])
    bg.paste(t, (0, 0), t)
    cx = (i % COLS) * CELL + (CELL - t.size[0]) // 2
    cy = (i // COLS) * CELL + 20 + (CELL - 24 - t.size[1]) // 2
    sheet.paste(bg, (cx, cy))
    draw.text(((i % COLS) * CELL + 6, (i // COLS) * CELL + 4), f.stem, fill=(255, 220, 120))

OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT)
print("sheet", OUT, sheet.size)
