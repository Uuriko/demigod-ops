#!/usr/bin/env python3
"""One skinned Dasha GLB: CC face albedo + A-pose humanoid + in-place step clip.

Likeness refs (not flipbook frames):
  wiki-2022.jpg      — frontal face albedo
  cotton-2014.jpg    — hair / three-quarter check
  berlinale-2021.jpg — bangs / body check

Playback is GLTFLoader + AnimationMixer. Clip has no root translation.
Atlas is grainy and matte so she keys off ink, not a plastic doll.
"""
from __future__ import annotations

import json
import math
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
REFS = ROOT / "dasha-dance-refs"
OUT_DIR = ROOT / "dasha-worker-assets" / "client"
OUT_GLB = OUT_DIR / "dasha.glb"
OUT_FACE = OUT_DIR / "dasha-face.webp"
FACE = ("wiki-2022.jpg", 320, 380, 580, 700)

SKIN = (240, 210, 190)
HAIR = (196, 163, 106)
HAIR_DIM = (141, 107, 69)
TEE = (22, 22, 24)
CAP = (12, 12, 14)
JEAN = (36, 36, 40)
SHOE = (17, 17, 20)
INK = (7, 6, 8)
PAPER = (244, 237, 219)

# Atlas tiles (u0, v0, u1, v1) in 512²
UV_FACE = (0.02, 0.02, 0.48, 0.48)
UV_HAIR = (0.52, 0.02, 0.98, 0.24)
UV_CAP = (0.52, 0.26, 0.98, 0.48)
UV_TEE = (0.02, 0.52, 0.48, 0.74)
UV_SKIN = (0.52, 0.52, 0.98, 0.74)
UV_JEAN = (0.02, 0.76, 0.48, 0.98)
UV_SHOE = (0.52, 0.76, 0.98, 0.98)

BONES = [
    "hips", "spine", "chest", "neck", "head",
    "l_shoulder", "l_upper", "l_lower",
    "r_shoulder", "r_upper", "r_lower",
    "l_upleg", "l_lowleg", "r_upleg", "r_lowleg",
]
# local bind translation (parent-relative), Y-up, A-pose
BIND = {
    "hips": (0.0, 0.82, 0.0),
    "spine": (0.0, 0.14, 0.0),
    "chest": (0.0, 0.14, 0.0),
    "neck": (0.0, 0.16, 0.0),
    "head": (0.0, 0.12, 0.0),
    "l_shoulder": (0.14, 0.12, 0.02),
    "l_upper": (0.12, -0.08, 0.0),
    "l_lower": (0.16, -0.12, 0.0),
    "r_shoulder": (-0.14, 0.12, 0.02),
    "r_upper": (-0.12, -0.08, 0.0),
    "r_lower": (-0.16, -0.12, 0.0),
    "l_upleg": (0.08, -0.02, 0.0),
    "l_lowleg": (0.0, -0.38, 0.0),
    "r_upleg": (-0.08, -0.02, 0.0),
    "r_lowleg": (0.0, -0.38, 0.0),
}
PARENT = {
    "hips": None,
    "spine": "hips",
    "chest": "spine",
    "neck": "chest",
    "head": "neck",
    "l_shoulder": "chest",
    "l_upper": "l_shoulder",
    "l_lower": "l_upper",
    "r_shoulder": "chest",
    "r_upper": "r_shoulder",
    "r_lower": "r_upper",
    "l_upleg": "hips",
    "l_lowleg": "l_upleg",
    "r_upleg": "hips",
    "r_lowleg": "r_upleg",
}


def decode_rgb(path: Path) -> tuple[int, int, np.ndarray]:
    probe = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
        text=True,
    ).strip()
    w, h = (int(x) for x in probe.split(","))
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
    )
    return w, h, np.frombuffer(raw, dtype=np.uint8).reshape(h, w, 3).copy()


def encode_image(rgb: np.ndarray, dest: Path, fmt: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    h, w = rgb.shape[:2]
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-i", "pipe:0",
        "-frames:v", "1",
    ]
    if fmt == "jpg":
        cmd += ["-q:v", "3", str(dest)]
    else:
        cmd += ["-c:v", "libwebp", "-quality", "86", "-preset", "picture", str(dest)]
    subprocess.run(cmd, input=rgb.tobytes(), check=True)


def blit(dst: np.ndarray, src: np.ndarray, x: int, y: int, dw: int, dh: int) -> None:
    sh, sw = src.shape[:2]
    ys = (np.arange(dh) * sh / dh).astype(np.int32)
    xs = (np.arange(dw) * sw / dw).astype(np.int32)
    dst[y : y + dh, x : x + dw] = src[ys][:, xs]


def fill(dst: np.ndarray, x0: int, y0: int, x1: int, y1: int, rgb: tuple[int, int, int]) -> None:
    dst[y0:y1, x0:x1] = rgb


def glyph(ch: str) -> list[str]:
    # 5x5 caps for the cap tile. Enough to read SCARY at atlas res.
    bank = {
        "S": ["#### ", "#    ", " ### ", "    #", "#### "],
        "C": [" ### ", "#    ", "#    ", "#    ", " ### "],
        "A": [" ##  ", "#  # ", "#### ", "#  # ", "#  # "],
        "R": ["###  ", "#  # ", "###  ", "# #  ", "#  # "],
        "Y": ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
    }
    return bank[ch]


def stamp_scary(dst: np.ndarray) -> None:
    text = "SCARY"
    px, py = 8, 8
    x0, y0 = 286, 160
    for i, ch in enumerate(text):
        rows = glyph(ch)
        for r, row in enumerate(rows):
            for c, bit in enumerate(row):
                if bit != "#":
                    continue
                yy = y0 + r * py
                xx = x0 + i * (5 * px + 4) + c * px
                dst[yy : yy + py - 1, xx : xx + px - 1] = PAPER


def grain(dst: np.ndarray, lo: int, hi: int, seed: int, y0: int = 0, y1: int | None = None) -> None:
    y1 = dst.shape[0] if y1 is None else y1
    rng = np.random.default_rng(seed)
    band = dst[y0:y1]
    noise = rng.integers(lo, hi + 1, band.shape, dtype=np.int16)
    dst[y0:y1] = np.clip(band.astype(np.int16) + noise, 0, 255).astype(np.uint8)


def build_atlas() -> tuple[np.ndarray, np.ndarray]:
    name, x, y, cw, ch = FACE
    w, h, raw = decode_rgb(REFS / name)
    face = raw[y : y + ch, x : x + cw]
    atlas = np.zeros((512, 512, 3), dtype=np.uint8)
    atlas[:] = INK
    blit(atlas, face, 8, 8, 240, 240)
    fill(atlas, 266, 8, 504, 120, HAIR)
    atlas[70:120, 266:504] = HAIR_DIM
    fill(atlas, 266, 132, 504, 246, CAP)
    stamp_scary(atlas)
    fill(atlas, 8, 266, 246, 378, TEE)
    fill(atlas, 266, 266, 504, 378, SKIN)
    fill(atlas, 8, 388, 246, 504, JEAN)
    fill(atlas, 266, 388, 504, 504, SHOE)
    grain(atlas, -10, 10, 61, 248, 512)
    grain(atlas, -7, 7, 67, 0, 248)
    still = np.zeros((256, 256, 3), dtype=np.uint8)
    blit(still, face, 0, 0, 256, 256)
    return atlas, still


def uv_point(rect: tuple[float, float, float, float], su: float, sv: float) -> tuple[float, float]:
    u0, v0, u1, v1 = rect
    return (u0 + (u1 - u0) * su, v0 + (v1 - v0) * sv)


class Mesh:
    def __init__(self) -> None:
        self.pos: list[tuple[float, float, float]] = []
        self.uv: list[tuple[float, float]] = []
        self.joints: list[tuple[int, int, int, int]] = []
        self.weights: list[tuple[float, float, float, float]] = []
        self.idx: list[int] = []

    def add(self, p, uv, j, w) -> int:
        i = len(self.pos)
        self.pos.append(p)
        self.uv.append(uv)
        self.joints.append(j)
        s = sum(w) or 1.0
        self.weights.append(tuple(x / s for x in w))
        return i

    def tri(self, a: int, b: int, c: int) -> None:
        self.idx.extend((a, b, c))

    def lathe(self, profile, segs: int, uv_rect, joint: int, joint2: int | None = None) -> None:
        rings = []
        n = len(profile)
        for i, (r, y) in enumerate(profile):
            ring = []
            sv = i / max(1, n - 1)
            for s in range(segs):
                t = s / segs * math.tau
                su = s / segs
                p = (math.cos(t) * r, y, math.sin(t) * r)
                uv = uv_point(uv_rect, su, sv)
                if joint2 is None:
                    j, w = (joint, 0, 0, 0), (1, 0, 0, 0)
                else:
                    j, w = (joint, joint2, 0, 0), (1.0 - sv, sv, 0, 0)
                ring.append(self.add(p, uv, j, w))
            rings.append(ring)
        for i in range(n - 1):
            for s in range(segs):
                a = rings[i][s]
                b = rings[i][(s + 1) % segs]
                c = rings[i + 1][s]
                d = rings[i + 1][(s + 1) % segs]
                self.tri(a, b, d)
                self.tri(a, d, c)

    def ellipsoid(self, c, rx, ry, rz, su, sv, uv_fn, joint: int) -> None:
        rings = []
        for v in range(sv + 1):
            phi = v / sv * math.pi
            ring = []
            for u in range(su):
                th = u / su * math.tau
                x = c[0] + rx * math.sin(phi) * math.cos(th)
                y = c[1] + ry * math.cos(phi)
                z = c[2] + rz * math.sin(phi) * math.sin(th)
                ring.append(self.add((x, y, z), uv_fn(u / su, v / sv, x, y, z), (joint, 0, 0, 0), (1, 0, 0, 0)))
            rings.append(ring)
        for v in range(sv):
            for u in range(su):
                a = rings[v][u]
                b = rings[v][(u + 1) % su]
                c0 = rings[v + 1][u]
                d = rings[v + 1][(u + 1) % su]
                if v:
                    self.tri(a, b, d)
                if v + 1 < sv:
                    self.tri(a, d, c0)

    def tube(self, a, b, ra, rb, segs, uv_rect, ja, jb) -> None:
        rings = []
        steps = 5
        ax, ay, az = a
        bx, by, bz = b
        for i in range(steps + 1):
            t = i / steps
            cx = ax + (bx - ax) * t
            cy = ay + (by - ay) * t
            cz = az + (bz - az) * t
            r = ra + (rb - ra) * t
            ring = []
            for s in range(segs):
                ang = s / segs * math.tau
                px = math.cos(ang) * r
                pz = math.sin(ang) * r
                p = (cx + px, cy, cz + pz)
                uv = uv_point(uv_rect, s / segs, t)
                ring.append(self.add(p, uv, (ja, jb, 0, 0), (1 - t, t, 0, 0)))
            rings.append(ring)
        for i in range(steps):
            for s in range(segs):
                a0 = rings[i][s]
                b0 = rings[i][(s + 1) % segs]
                c0 = rings[i + 1][s]
                d0 = rings[i + 1][(s + 1) % segs]
                self.tri(a0, b0, d0)
                self.tri(a0, d0, c0)


def head_uv(su: float, sv: float, x: float, y: float, z: float) -> tuple[float, float]:
    # Front of the head → face tile. Back / sides → hair.
    if z > 0.02 and abs(x) < 0.16:
        return uv_point(UV_FACE, 0.5 + x / 0.28, 0.18 + (1.58 - y) / 0.32)
    return uv_point(UV_HAIR, su, sv)


def build_mesh() -> Mesh:
    m = Mesh()
    hips, spine, chest, neck, head = 0, 1, 2, 3, 4
    l_sh, l_up, l_lo = 5, 6, 7
    r_sh, r_up, r_lo = 8, 9, 10
    l_ul, l_ll = 11, 12
    r_ul, r_ll = 13, 14

    m.lathe(
        [(0.19, 0.84), (0.18, 0.96), (0.20, 1.10), (0.18, 1.20), (0.15, 1.28), (0.08, 1.34)],
        12, UV_TEE, hips, chest,
    )
    m.ellipsoid((0.0, 1.46, 0.02), 0.13, 0.155, 0.12, 14, 10, head_uv, head)
    m.ellipsoid((0.0, 1.40, -0.05), 0.18, 0.19, 0.17, 12, 8, lambda su, sv, x, y, z: uv_point(UV_HAIR, su, sv), head)
    m.ellipsoid((0.12, 1.28, 0.02), 0.08, 0.12, 0.07, 8, 6, lambda su, sv, x, y, z: uv_point(UV_HAIR, su, sv), head)
    m.ellipsoid((-0.10, 1.26, 0.00), 0.07, 0.11, 0.07, 8, 6, lambda su, sv, x, y, z: uv_point(UV_HAIR, su, sv), head)
    m.ellipsoid((0.0, 1.55, 0.0), 0.15, 0.08, 0.14, 12, 6, lambda su, sv, x, y, z: uv_point(UV_CAP, su, sv), head)
    brim_z = 0.20
    for i in range(8):
        t0 = -0.5 + i / 7 * 1.0
        t1 = -0.5 + (i + 1) / 7 * 1.0
        a = m.add((t0 * 0.14, 1.50, 0.10), uv_point(UV_CAP, i / 8, 0.2), (head, 0, 0, 0), (1, 0, 0, 0))
        b = m.add((t1 * 0.14, 1.50, 0.10), uv_point(UV_CAP, (i + 1) / 8, 0.2), (head, 0, 0, 0), (1, 0, 0, 0))
        c = m.add((t0 * 0.16, 1.492, brim_z), uv_point(UV_CAP, i / 8, 0.9), (head, 0, 0, 0), (1, 0, 0, 0))
        d = m.add((t1 * 0.16, 1.492, brim_z), uv_point(UV_CAP, (i + 1) / 8, 0.9), (head, 0, 0, 0), (1, 0, 0, 0))
        m.tri(a, b, d)
        m.tri(a, d, c)

    m.tube((0.16, 1.26, 0.02), (0.30, 1.14, 0.02), 0.042, 0.036, 8, UV_SKIN, l_sh, l_up)
    m.tube((0.30, 1.14, 0.02), (0.46, 1.00, 0.02), 0.034, 0.028, 8, UV_SKIN, l_up, l_lo)
    m.tube((-0.16, 1.26, 0.02), (-0.30, 1.14, 0.02), 0.042, 0.036, 8, UV_SKIN, r_sh, r_up)
    m.tube((-0.30, 1.14, 0.02), (-0.46, 1.00, 0.02), 0.034, 0.028, 8, UV_SKIN, r_up, r_lo)

    m.tube((0.08, 0.80, 0.0), (0.08, 0.44, 0.02), 0.055, 0.046, 8, UV_JEAN, l_ul, l_ll)
    m.tube((0.08, 0.44, 0.02), (0.08, 0.10, 0.0), 0.044, 0.036, 8, UV_JEAN, l_ll, l_ll)
    m.tube((-0.08, 0.80, 0.0), (-0.08, 0.44, 0.02), 0.055, 0.046, 8, UV_JEAN, r_ul, r_ll)
    m.tube((-0.08, 0.44, 0.02), (-0.08, 0.10, 0.0), 0.044, 0.036, 8, UV_JEAN, r_ll, r_ll)

    for sx in (0.08, -0.08):
        shoe = [
            (sx - 0.05, 0.0, -0.04),
            (sx + 0.05, 0.0, -0.04),
            (sx + 0.05, 0.0, 0.11),
            (sx - 0.05, 0.0, 0.11),
            (sx - 0.05, 0.07, -0.04),
            (sx + 0.05, 0.07, -0.04),
            (sx + 0.05, 0.07, 0.11),
            (sx - 0.05, 0.07, 0.11),
        ]
        ids = [m.add(p, uv_point(UV_SHOE, 0.3, 0.4), (l_ll if sx > 0 else r_ll, 0, 0, 0), (1, 0, 0, 0)) for p in shoe]
        faces = ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2))
        for a, b, c, d in faces:
            m.tri(ids[a], ids[b], ids[c])
            m.tri(ids[a], ids[c], ids[d])
    return m


def q_axis(x: float, y: float, z: float, angle: float) -> tuple[float, float, float, float]:
    n = math.hypot(x, y, z) or 1.0
    s = math.sin(angle * 0.5)
    return (x / n * s, y / n * s, z / n * s, math.cos(angle * 0.5))


def q_mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def world_binds() -> dict[str, np.ndarray]:
    mats = {}
    for name in BONES:
        local = np.eye(4, dtype=np.float32)
        tx, ty, tz = BIND[name]
        local[0, 3] = tx
        local[1, 3] = ty
        local[2, 3] = tz
        parent = PARENT[name]
        mats[name] = local if parent is None else mats[parent] @ local
    return mats


def inverse_binds() -> np.ndarray:
    worlds = world_binds()
    out = np.zeros((len(BONES), 16), dtype=np.float32)
    for i, name in enumerate(BONES):
        inv = np.linalg.inv(worlds[name])
        out[i] = inv.T.reshape(16)  # glTF column-major via flatten of transpose of row-major
    return out


def animation() -> dict[str, list[tuple[float, tuple[float, float, float, float]]]]:
    """In-place step. Root / hips translation stays bind. Times in seconds."""
    ident = (0.0, 0.0, 0.0, 1.0)
    keys = {name: [] for name in BONES}
    frames = [
        (0.0, 1.0, 0.0),
        (0.25, 0.0, 1.0),
        (0.5, -1.0, 0.0),
        (0.75, 0.0, -1.0),
        (1.0, 1.0, 0.0),
    ]
    for t, step, lift in frames:
        keys["hips"].append((t, q_axis(0, 1, 0, 0.16 * step)))
        keys["spine"].append((t, q_axis(0, 1, 0, 0.10 * step)))
        keys["chest"].append((t, q_mul(q_axis(0, 1, 0, 0.08 * step), q_axis(0, 0, 1, -0.06 * step))))
        keys["head"].append((t, q_axis(0, 1, 0, -0.10 * step)))
        keys["l_upleg"].append((t, q_axis(1, 0, 0, 0.55 * step)))
        keys["r_upleg"].append((t, q_axis(1, 0, 0, -0.55 * step)))
        keys["l_lowleg"].append((t, q_axis(1, 0, 0, 0.35 * max(0, -step))))
        keys["r_lowleg"].append((t, q_axis(1, 0, 0, 0.35 * max(0, step))))
        keys["l_upper"].append((t, q_mul(q_axis(1, 0, 0, -0.50 * step), q_axis(0, 0, 1, 0.25))))
        keys["r_upper"].append((t, q_mul(q_axis(1, 0, 0, 0.50 * step), q_axis(0, 0, 1, -0.25))))
        keys["l_lower"].append((t, q_axis(1, 0, 0, -0.28 - 0.12 * abs(step))))
        keys["r_lower"].append((t, q_axis(1, 0, 0, -0.28 - 0.12 * abs(step))))
        keys["l_shoulder"].append((t, ident))
        keys["r_shoulder"].append((t, ident))
        keys["neck"].append((t, ident))
        # tiny bounce lives in a hip x-rot so the clip stays in-place
        keys["hips"][-1] = (t, q_mul(q_axis(1, 0, 0, 0.04 * abs(lift)), keys["hips"][-1][1]))
    return keys


def pad4(buf: bytearray) -> None:
    buf.extend(b"\x00" * ((4 - (len(buf) % 4)) % 4))


def f32(arr) -> bytes:
    return np.asarray(arr, dtype=np.float32).tobytes()


def u16(arr) -> bytes:
    return np.asarray(arr, dtype=np.uint16).tobytes()


def u8(arr) -> bytes:
    return np.asarray(arr, dtype=np.uint8).tobytes()


def write_glb(mesh: Mesh, jpeg: bytes, dest: Path) -> None:
    pos = np.asarray(mesh.pos, dtype=np.float32)
    nrm = np.zeros_like(pos)
    idx = np.asarray(mesh.idx, dtype=np.uint16)
    for i in range(0, len(idx), 3):
        a, b, c = idx[i : i + 3]
        n = np.cross(pos[b] - pos[a], pos[c] - pos[a])
        nrm[a] += n
        nrm[b] += n
        nrm[c] += n
    lens = np.linalg.norm(nrm, axis=1, keepdims=True)
    lens[lens == 0] = 1
    nrm /= lens
    uv = np.asarray(mesh.uv, dtype=np.float32)
    joints = np.asarray(mesh.joints, dtype=np.uint8)
    weights = np.asarray(mesh.weights, dtype=np.float32)
    ibm = inverse_binds()

    blob = bytearray()
    views = []

    def push(data: bytes, target: int | None = None) -> int:
        pad4(blob)
        off = len(blob)
        blob.extend(data)
        view = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        views.append(view)
        return len(views) - 1

    def acc(view, ctype, typ, count, mn=None, mx=None, extra=None):
        a = {"bufferView": view, "componentType": ctype, "count": count, "type": typ}
        if mn is not None:
            a["min"] = mn
            a["max"] = mx
        if extra:
            a.update(extra)
        accessors.append(a)
        return len(accessors) - 1

    accessors = []
    v_pos = push(f32(pos), 34962)
    v_nrm = push(f32(nrm), 34962)
    v_uv = push(f32(uv), 34962)
    v_j = push(u8(joints), 34962)
    v_w = push(f32(weights), 34962)
    v_i = push(u16(idx), 34963)
    v_ibm = push(f32(ibm))
    v_img = push(jpeg)

    a_pos = acc(v_pos, 5126, "VEC3", len(pos), pos.min(0).tolist(), pos.max(0).tolist())
    a_nrm = acc(v_nrm, 5126, "VEC3", len(pos))
    a_uv = acc(v_uv, 5126, "VEC2", len(pos))
    a_j = acc(v_j, 5121, "VEC4", len(pos))
    a_w = acc(v_w, 5126, "VEC4", len(pos))
    a_i = acc(v_i, 5123, "SCALAR", len(idx))
    a_ibm = acc(v_ibm, 5126, "MAT4", len(BONES))

    keys = animation()
    channels = []
    samplers = []
    for name, frames in keys.items():
        times = np.array([t for t, _ in frames], dtype=np.float32)
        rots = np.array([q for _, q in frames], dtype=np.float32)
        vt = push(f32(times))
        vr = push(f32(rots))
        at = acc(vt, 5126, "SCALAR", len(times), [float(times.min())], [float(times.max())])
        ar = acc(vr, 5126, "VEC4", len(rots))
        samplers.append({"input": at, "output": ar, "interpolation": "LINEAR"})
        channels.append({
            "sampler": len(samplers) - 1,
            "target": {"node": BONES.index(name) + 1, "path": "rotation"},
        })

    nodes = [{"name": "dasha", "children": [1, len(BONES) + 1]}]
    children = {n: [] for n in BONES}
    for name, parent in PARENT.items():
        if parent:
            children[parent].append(BONES.index(name) + 1)
    for i, name in enumerate(BONES):
        node = {
            "name": name,
            "translation": list(BIND[name]),
        }
        if children[name]:
            node["children"] = children[name]
        nodes.append(node)
    nodes.append({"name": "body", "mesh": 0, "skin": 0})

    gltf = {
        "asset": {"version": "2.0", "generator": "dasha-dance-glb-build"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": nodes,
        "meshes": [{
            "name": "dasha",
            "primitives": [{
                "attributes": {
                    "POSITION": a_pos,
                    "NORMAL": a_nrm,
                    "TEXCOORD_0": a_uv,
                    "JOINTS_0": a_j,
                    "WEIGHTS_0": a_w,
                },
                "indices": a_i,
                "material": 0,
            }],
        }],
        "skins": [{
            "name": "dasha",
            "joints": list(range(1, len(BONES) + 1)),
            "inverseBindMatrices": a_ibm,
            "skeleton": 1,
        }],
        "animations": [{
            "name": "step",
            "samplers": samplers,
            "channels": channels,
        }],
        "materials": [{
            "name": "dasha",
            "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0},
                "metallicFactor": 0.0,
                "roughnessFactor": 0.92,
            },
        }],
        "textures": [{"source": 0, "sampler": 0}],
        "images": [{"bufferView": v_img, "mimeType": "image/jpeg", "name": "dasha"}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
    }

    json_bytes = bytearray(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    json_bytes.extend(b" " * ((4 - (len(json_bytes) % 4)) % 4))
    pad4(blob)
    gltf["buffers"][0]["byteLength"] = len(blob)
    json_bytes = bytearray(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    json_bytes.extend(b" " * ((4 - (len(json_bytes) % 4)) % 4))

    total = 12 + 8 + len(json_bytes) + 8 + len(blob)
    out = bytearray()
    out.extend(struct.pack("<4sII", b"glTF", 2, total))
    out.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    out.extend(json_bytes)
    out.extend(struct.pack("<I4s", len(blob), b"BIN\x00"))
    out.extend(blob)
    dest.write_bytes(bytes(out))


def main() -> int:
    for extra in ("wiki-2022.jpg", "cotton-2014.jpg", "berlinale-2021.jpg"):
        if not (REFS / extra).exists():
            raise SystemExit(f"missing likeness ref {extra}")
    atlas, still = build_atlas()
    jpg_path = OUT_DIR / "dasha-atlas.jpg"
    encode_image(atlas, jpg_path, "jpg")
    encode_image(still, OUT_FACE, "webp")
    mesh = build_mesh()
    write_glb(mesh, jpg_path.read_bytes(), OUT_GLB)
    jpg_path.unlink()
    print(f"wrote {OUT_GLB} {OUT_GLB.stat().st_size} bytes verts={len(mesh.pos)} tris={len(mesh.idx)//3}")
    print(f"wrote {OUT_FACE} {OUT_FACE.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
