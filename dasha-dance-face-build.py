#!/usr/bin/env python3
"""Crop one consistent Dasha face albedo from the CC stills. ffmpeg in, webp out.

Likeness refs (not flipbook frames):
  wiki-2022.jpg     — frontal face albedo (moles, brows, mouth)
  cotton-2014.jpg   — hair / three-quarter check
  berlinale-2021.jpg — bangs / body check
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REFS = ROOT / "dasha-dance-refs"
OUT = ROOT / "dasha-worker-assets" / "client" / "dasha-face.webp"
# wiki-2022.jpg is 1219x1407. Box sits under the cap brim so the 3D cap is not doubled.
FACE = ("wiki-2022.jpg", 320, 380, 580, 700)
W, H = 512, 618


def decode_rgb(path: Path) -> tuple[int, int, bytearray]:
    probe = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
        text=True,
    ).strip()
    w, h = (int(x) for x in probe.split(","))
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
    )
    return w, h, bytearray(raw)


def crop(buf: bytearray, w: int, x: int, y: int, cw: int, ch: int) -> bytearray:
    out = bytearray(cw * ch * 3)
    for row in range(ch):
        src = ((y + row) * w + x) * 3
        dst = row * cw * 3
        out[dst : dst + cw * 3] = buf[src : src + cw * 3]
    return out


def scale(buf: bytearray, sw: int, sh: int, dw: int, dh: int) -> bytearray:
    out = bytearray(dw * dh * 3)
    for y in range(dh):
        sy = min(sh - 1, int(y * sh / dh))
        for x in range(dw):
            sx = min(sw - 1, int(x * sw / dw))
            si = (sy * sw + sx) * 3
            di = (y * dw + x) * 3
            out[di : di + 3] = buf[si : si + 3]
    return out


def oval_rgba(rgb: bytearray, w: int, h: int) -> bytes:
    out = bytearray(w * h * 4)
    cx, cy = (w - 1) / 2, (h - 1) / 2
    rx, ry = w * 0.48, h * 0.49
    for y in range(h):
        ny = (y - cy) / ry
        for x in range(w):
            nx = (x - cx) / rx
            d = nx * nx + ny * ny
            if d <= 0.78:
                a = 255
            elif d >= 1.0:
                a = 0
            else:
                a = int(255 * (1.0 - (d - 0.78) / 0.22))
            i = (y * w + x) * 3
            o = (y * w + x) * 4
            out[o] = rgb[i]
            out[o + 1] = rgb[i + 1]
            out[o + 2] = rgb[i + 2]
            out[o + 3] = a
    return bytes(out)


def encode_webp(rgba: bytes, w: int, h: int, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-i", "pipe:0",
            "-frames:v", "1", "-c:v", "libwebp", "-quality", "86", "-preset", "picture",
            str(dest),
        ],
        input=rgba,
        check=True,
    )


def main() -> int:
    name, x, y, cw, ch = FACE
    src = REFS / name
    if not src.exists():
        raise SystemExit(f"missing {src}")
    for extra in ("cotton-2014.jpg", "berlinale-2021.jpg"):
        if not (REFS / extra).exists():
            raise SystemExit(f"missing likeness ref {extra}")
    w, h, raw = decode_rgb(src)
    if x + cw > w or y + ch > h:
        raise SystemExit(f"{name} crop {x},{y},{cw},{ch} outside {w}x{h}")
    cut = scale(crop(raw, w, x, y, cw, ch), cw, ch, W, H)
    encode_webp(oval_rgba(cut, W, H), W, H, OUT)
    print(f"wrote {OUT} {OUT.stat().st_size} bytes {W}x{H}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
