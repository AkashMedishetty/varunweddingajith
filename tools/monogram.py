#!/usr/bin/env python3
"""Build assets/vb.svg: the VB monogram from the printed card PDF, one class per part.

  python3 tools/monogram.py --debug   -> /tmp/vk-mono/tiles.html (every path highlighted + numbered)
  python3 tools/monogram.py           -> assets/vb.svg, classes from GROUPS below

Colours live in invite.css (.vb path.<class>) so they can be tuned without rebuilding.
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PDF = Path("/Users/akash/.kiro/crew/uploads/d0b8af6636e3458d87e494e3ce882af3_Varun_Kumar_Bhavani.pdf")
TMP = Path("/tmp/vk-mono")
REG = (256, 406, 343, 474)   # monogram region on page 1, in PDF points

# path index -> class. Filled in after reading the debug tiles.
# v = letter V, b = letter B, sw1..sw3 = water swirls (blue shades),
# lo1..lo3 = lotus (petal pinks), lf = lotus leaf/stem, w = white inlay (paper)
GROUPS = {
    19: "v", 2: "v", 0: "vl", 1: "b",                                   # letters (leaf green)
    6: "sw1", 21: "sw1", 12: "sw1", 5: "sw2", 20: "sw2",                # water swirls (deep, mid blue)
    4: "sw3", 14: "sw3", 15: "sw3", 16: "sw3",                          # small waves + drop (light blue)
    7: "lo1", 13: "lo1", 17: "lo1", 18: "lo1",                          # lotus outer petals + tip
    8: "lo2", 10: "lo2", 11: "lo2", 3: "lo3", 9: "lo3",                 # lotus inner + centre petals
}


def extract():
    TMP.mkdir(parents=True, exist_ok=True)
    svgp = TMP / "p1.svg"
    subprocess.run(["pdftocairo", "-svg", "-f", "1", "-l", "1", str(PDF), str(svgp)],
                   check=True, stderr=subprocess.DEVNULL)
    body = svgp.read_text().split("</defs>", 1)[1]
    out = []
    for m in re.finditer(r"<path [^>]*/>", body):
        tag = m.group(0)
        dm = re.search(r' d="([^"]*)"', tag)
        if not dm or 'fill="none"' in tag:
            continue
        nums = [float(v) for v in re.findall(r"-?\d+\.?\d*(?:e-?\d+)?", dm.group(1))]
        pts = list(zip(nums[0::2], nums[1::2]))
        tm = re.search(r'transform="matrix\(([^)]*)\)"', tag)
        if tm:
            a, b, c, d, e, f = [float(v) for v in tm.group(1).split(",")]
            pts = [(a * x + c * y + e, b * x + d * y + f) for x, y in pts]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        bb = (min(xs), min(ys), max(xs), max(ys))
        if not (bb[0] >= REG[0] and bb[1] >= REG[1] and bb[2] <= REG[2] and bb[3] <= REG[3]):
            continue
        fm = re.search(r' fill="([^"]*)"', tag)
        white = bool(fm) and fm.group(1).replace(" ", "").startswith("rgb(100%,100%,100%")
        clean = re.sub(r' fill="[^"]*"', "", tag)
        clean = re.sub(r' fill-opacity="[^"]*"', "", clean)
        out.append({"tag": clean, "white": white, "bb": bb})
    return out


def union(ps, pad=1.5):
    x0 = min(p["bb"][0] for p in ps) - pad
    y0 = min(p["bb"][1] for p in ps) - pad
    x1 = max(p["bb"][2] for p in ps) + pad
    y1 = max(p["bb"][3] for p in ps) + pad
    return x0, y0, x1 - x0, y1 - y0


def debug(ps):
    vb = "%.2f %.2f %.2f %.2f" % union(ps)
    tiles = []
    for i, p in enumerate(ps):
        layers = []
        for j, q in enumerate(ps):
            if j == i:
                col = "#e0102a"
            else:
                col = "#ffffff" if q["white"] else "#b9b9b9"
            layers.append(q["tag"].replace("<path ", '<path fill="%s" ' % col, 1))
        tiles.append('<div class="t"><svg viewBox="%s">%s</svg><b>%d%s</b></div>'
                     % (vb, "".join(layers), i, " W" if p["white"] else ""))
    html = ("<!doctype html><html><head><meta charset='utf-8'><style>"
            "body{margin:0;background:#fff;font:14px monospace}"
            ".g{display:grid;grid-template-columns:repeat(6,200px);gap:6px;padding:6px}"
            ".t{position:relative;border:1px solid #ddd;height:150px}"
            ".t svg{width:100%;height:100%}"
            ".t b{position:absolute;left:4px;top:2px;color:#000;background:#ff0;padding:0 3px}"
            "</style></head><body><div class='g'>" + "".join(tiles) + "</div></body></html>")
    (TMP / "tiles.html").write_text(html)
    rows = (len(ps) + 5) // 6
    print("paths", len(ps), "white", sum(p["white"] for p in ps), "tiles rows", rows)
    for i, p in enumerate(ps):
        bb = p["bb"]
        print("%2d %s  x %.1f-%.1f  y %.1f-%.1f" % (i, "W" if p["white"] else "K", bb[0], bb[2], bb[1], bb[3]))


def build(ps):
    vb = "%.2f %.2f %.2f %.2f" % union(ps)
    body, lotus = [], []
    for i, p in enumerate(ps):
        cls = "w" if p["white"] else GROUPS.get(i, "k")
        tag = p["tag"].replace("<path ", '<path class="%s" ' % cls, 1)
        (lotus if cls.startswith("lo") else body).append(tag)
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" class="vb-svg" aria-hidden="true">'
           '<g class="vb-paths">%s</g><g class="lotus">%s</g></svg>' % (vb, "".join(body), "".join(lotus)))
    out = ROOT / "assets" / "vb.svg"
    out.write_text(svg)
    print("wrote", out, len(ps), "paths", out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    ps = extract()
    if "--debug" in sys.argv:
        debug(ps)
    else:
        build(ps)
