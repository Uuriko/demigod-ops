#!/usr/bin/env python3
"""Digitize first-party stills into an MK hard-keyed sprite strip. ffmpeg in, webp out."""
from __future__ import annotations

import random
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PHOTO = ROOT / "dasha-worker-assets" / "simp" / "photo"
OUT = ROOT / "dasha-worker-assets" / "client" / "dasha-sheet.webp"
INK = (7, 6, 8)
FW, FH = 88, 150
# Loose figure windows as (x, y, w, h) fractions. Feet sit on the cell floor.
FRAMES = [
    ("weekend.jpg", (0.30, 0.05, 0.36, 0.90)),
    ("weekend.jpg", (0.24, 0.04, 0.40, 0.92)),
    ("profile.jpg", (0.10, 0.00, 0.80, 1.00)),
    ("bull.jpg", (0.18, 0.02, 0.52, 0.96)),
    ("public.jpg", (0.16, 0.00, 0.66, 0.98)),
    ("press.jpg", (0.14, 0.00, 0.70, 0.98)),
    ("chart.jpg", (0.16, 0.00, 0.66, 0.98)),
    ("weekend.jpg", (0.34, 0.08, 0.34, 0.86)),
]


def run(cmd: list[str]) -> None:
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def probe(path: Path) -> tuple[int, int]:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
        text=True,
    ).strip()
    w, h = out.split(",")
    return int(w), int(h)


def decode_rgb(path: Path) -> tuple[int, int, bytearray]:
    w, h = probe(path)
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
    )
    return w, h, bytearray(raw)


def px(buf: bytearray, w: int, x: int, y: int) -> tuple[int, int, int]:
    i = (y * w + x) * 3
    return buf[i], buf[i + 1], buf[i + 2]


def setpx(buf: bytearray, w: int, x: int, y: int, rgb: tuple[int, int, int]) -> None:
    i = (y * w + x) * 3
    buf[i], buf[i + 1], buf[i + 2] = rgb


def dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def luma(p: tuple[int, int, int]) -> int:
    return (p[0] * 3 + p[1] * 6 + p[2]) // 10


def skin(p: tuple[int, int, int]) -> bool:
    r, g, b = p
    return r > 70 and r > g - 8 and r > b and (r - b) > 12 and g > 40


def crop(buf: bytearray, w: int, h: int, box: tuple[float, float, float, float]) -> tuple[int, int, bytearray]:
    x, y, cw, ch = box
    x0 = max(0, min(w - 1, int(w * x)))
    y0 = max(0, min(h - 1, int(h * y)))
    x1 = max(x0 + 1, min(w, int(w * (x + cw))))
    y1 = max(y0 + 1, min(h, int(h * (y + ch))))
    nw, nh = x1 - x0, y1 - y0
    out = bytearray(nw * nh * 3)
    for yy in range(nh):
        src = ((y0 + yy) * w + x0) * 3
        dst = yy * nw * 3
        out[dst : dst + nw * 3] = buf[src : src + nw * 3]
    return nw, nh, out


def edge_samples(buf: bytearray, w: int, h: int) -> list[tuple[int, int, int]]:
    pts = []
    for x in range(0, w, max(1, w // 16)):
        pts.append(px(buf, w, x, 0))
        pts.append(px(buf, w, x, h - 1))
    for y in range(0, h, max(1, h // 16)):
        pts.append(px(buf, w, 0, y))
        pts.append(px(buf, w, w - 1, y))
    return pts


def near_bg(p: tuple[int, int, int], samples: list[tuple[int, int, int]], limit: int) -> bool:
    return any(dist(p, s) <= limit for s in samples)


def key(buf: bytearray, w: int, h: int) -> None:
    samples = edge_samples(buf, w, h)
    keep = bytearray(b"\x01" * (w * h))
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))
    seen = bytearray(w * h)
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        p = px(buf, w, x, y)
        cx = x / max(1, w - 1)
        cy = y / max(1, h - 1)
        core = 0.18 < cx < 0.82 and cy < 0.88
        if core or skin(p):
            continue
        if not near_bg(p, samples, 48):
            continue
        keep[i] = 0
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                stack.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if not keep[y * w + x]:
                setpx(buf, w, x, y, INK)


def contrast_grain(buf: bytearray, w: int, h: int, seed: int) -> None:
    rng = random.Random(seed)
    n = w * h
    for i in range(n):
        o = i * 3
        r, g, b = buf[o], buf[o + 1], buf[o + 2]
        if (r, g, b) == INK:
            continue
        r = min(255, max(0, int((r - 128) * 1.42 + 118)))
        g = min(255, max(0, int((g - 128) * 1.38 + 116)))
        b = min(255, max(0, int((b - 128) * 1.28 + 110)))
        if luma((r, g, b)) < 26:
            buf[o : o + 3] = bytes(INK)
            continue
        noise = rng.randint(-14, 14)
        buf[o] = min(255, max(0, r + noise))
        buf[o + 1] = min(255, max(0, g + noise))
        buf[o + 2] = min(255, max(0, b + noise))


def scale_pad(buf: bytearray, w: int, h: int) -> bytearray:
    scale = min(FW / w, FH / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    ox, oy = (FW - nw) // 2, FH - nh
    out = bytearray(FW * FH * 3)
    for i in range(0, len(out), 3):
        out[i : i + 3] = bytes(INK)
    for y in range(nh):
        sy = min(h - 1, int(y / scale))
        for x in range(nw):
            sx = min(w - 1, int(x / scale))
            dx, dy = ox + x, oy + y
            if 0 <= dx < FW and 0 <= dy < FH:
                setpx(out, FW, dx, dy, px(buf, w, sx, sy))
    return out


def encode_webp(rgb: bytes, w: int, h: int, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-i", "pipe:0",
            "-frames:v", "1", "-c:v", "libwebp", "-quality", "82", "-preset", "picture",
            str(dest),
        ],
        input=rgb,
        check=True,
    )


def main() -> int:
    strip = bytearray(FW * len(FRAMES) * FH * 3)
    for i, (name, box) in enumerate(FRAMES):
        w, h, raw = decode_rgb(PHOTO / name)
        cw, ch, cut = crop(raw, w, h, box)
        key(cut, cw, ch)
        contrast_grain(cut, cw, ch, seed=11 + i * 17)
        cell = scale_pad(cut, cw, ch)
        for y in range(FH):
            src = y * FW * 3
            dst = (y * (FW * len(FRAMES)) + i * FW) * 3
            strip[dst : dst + FW * 3] = cell[src : src + FW * 3]
    encode_webp(bytes(strip), FW * len(FRAMES), FH, OUT)
    print(f"wrote {OUT} {OUT.stat().st_size} bytes {FW * len(FRAMES)}x{FH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
