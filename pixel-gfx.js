// Shared pixel-art drawing helpers
window.PixelGfx = (function () {
  const PAL = {
    void: '#0a0812', ink: '#1a1028', plank: '#14101c', plankHi: '#1c1424',
    wood: '#2a2038', woodHi: '#3d2f50', woodLo: '#1a1428',
    brick: '#2a1a38', brickHi: '#4a3560', brickLo: '#1a1028', mortar: '#0a0812',
    gold: '#c9a84c', goldHi: '#e8d48c', goldLo: '#8a7040',
    rose: '#c45c7a', teal: '#4a8f7a', violet: '#7b5ea7', cream: '#f8f4e8',
  };

  function snap(v) { return Math.round(v); }

  function shadeHex(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  function fillPixel(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(snap(x), snap(y), size, size);
  }

  function fillPixelDisk(ctx, cx, cy, r, size, color, holeR = 0) {
    const r2 = r * r;
    const h2 = holeR * holeR;
    for (let y = -r; y <= r; y += size) {
      for (let x = -r; x <= r; x += size) {
        const d = x * x + y * y;
        if (d <= r2 && d >= h2) fillPixel(ctx, cx + x, cy + y, size, color);
      }
    }
  }

  function fillPixelRect(ctx, x, y, w, h, size, color) {
    for (let py = 0; py < h; py += size) {
      for (let px = 0; px < w; px += size) {
        fillPixel(ctx, x + px, y + py, size, color);
      }
    }
  }

  function drawScanlines(ctx, W, H, alpha = 0.06) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  }

  function drawPixelStar(ctx, x, y, r, color) {
    const s = Math.max(2, Math.floor(r / 3));
    fillPixel(ctx, x, y, s, color);
    fillPixel(ctx, x - s * 2, y, s, color);
    fillPixel(ctx, x + s * 2, y, s, color);
    fillPixel(ctx, x, y - s * 2, s, color);
    fillPixel(ctx, x, y + s * 2, s, color);
  }

  function drawPixelMoon(ctx, x, y, r) {
    fillPixelDisk(ctx, x, y, r, 6, 'rgba(232,224,240,0.55)', r * 0.15);
    fillPixelDisk(ctx, x - r * 0.2, y - r * 0.1, r * 0.55, 4, 'rgba(26,16,40,0.5)');
  }

  function drawPixelWindow(ctx, x, y, w, h) {
    fillPixelRect(ctx, x, y, w, h, 4, '#1a1028');
    fillPixelRect(ctx, x + 4, y + 4, w - 8, h - 8, 4, '#2a2848');
    fillPixel(ctx, x + w / 2 - 2, y + 4, 4, h - 8, '#0a0812');
    fillPixel(ctx, x + 4, y + h / 2 - 2, w - 8, 4, '#0a0812');
  }

  function drawWarmGlow(ctx, cx, cy, r, color, alpha) {
    const steps = 4;
    for (let i = steps; i >= 1; i--) {
      const rr = (r * i) / steps;
      const a = (alpha * i) / steps;
      const hex = color.startsWith('#') && color.length === 7;
      ctx.fillStyle = hex
        ? `${color}${Math.floor(a * 255).toString(16).padStart(2, '0')}`
        : color;
      fillPixelDisk(ctx, cx, cy, rr, 4, ctx.fillStyle);
    }
  }

  function drawParquetFloor(ctx, px, py, tile, tx, ty, room = 0) {
    const roomTint = [
      { base: '#1e1428', hi: '#2a2038', seam: '#120e18' },
      { base: '#1a1828', hi: '#262438', seam: '#101018' },
      { base: '#1c1428', hi: '#2a2240', seam: '#120e1a' },
    ][room] || { base: PAL.ink, hi: PAL.plank, seam: '#120e18' };
    const dark = (tx + ty) % 2 === 0;
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, tile - 2, 4, dark ? roomTint.base : roomTint.hi);
    const seam = dark ? roomTint.hi : roomTint.seam;
    fillPixelRect(ctx, px + 1, py + tile / 2 - 1, tile - 2, 2, 2, seam);
    if (tx % 2 === 0) fillPixelRect(ctx, px + tile / 2 - 1, py + 1, 2, tile - 2, 2, seam);
    if ((tx * 3 + ty) % 7 === 0) {
      fillPixel(ctx, px + 6, py + 5, 2, `rgba(201,168,76,0.1)`);
      fillPixel(ctx, px + tile - 8, py + tile - 7, 2, `rgba(201,168,76,0.06)`);
    }
    if (ty >= 11) {
      fillPixelRect(ctx, px + 2, py + tile - 5, tile - 4, 3, 2, PAL.woodLo);
      fillPixelRect(ctx, px + 2, py + tile - 2, tile - 4, 1, 2, PAL.goldLo);
    }
  }

  function drawAisleRunner(ctx, px, py, tile, tx, ty, color, strength = 0.14) {
    fillPixelRect(ctx, px + 4, py + 2, tile - 8, tile - 4, 4, `${color}${Math.floor(strength * 255).toString(16).padStart(2, '0')}`);
    fillPixelRect(ctx, px + 8, py + 6, tile - 16, 2, 2, `${color}${Math.floor(strength * 0.6 * 255).toString(16).padStart(2, '0')}`);
    if (ty % 4 === 0) {
      fillPixelRect(ctx, px + tile / 2 - 2, py + tile / 2 - 2, 4, 4, 2, `${color}${Math.floor(strength * 0.35 * 255).toString(16).padStart(2, '0')}`);
    }
  }

  function drawInteractPadDot(ctx, px, py, tile, color, kind) {
    const cx = px + tile / 2;
    const cy = py + tile - 6;
    fillPixelRect(ctx, cx - 3, cy - 3, 6, 6, 2, 'rgba(10,8,18,0.7)');
    fillPixelRect(ctx, cx - 2, cy - 2, 4, 4, 2, color);
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(248,244,232,0.75)';
    const glyph = kind === 'vinyl' ? '♫' : kind === 'examine' ? '∴' : kind === 'register' ? '★' : kind === 'secret' ? '?' : 'Z';
    ctx.fillText(glyph, cx, cy + 1);
  }

  function drawInteractTileMarker(ctx, px, py, tile, kind, color, pulse = 0, emphasis = 1) {
    const cx = px + tile / 2;
    const cy = py + tile / 2;
    const p = (0.14 + pulse * 0.2) * emphasis;
    if (emphasis < 0.55) {
      drawInteractPadDot(ctx, px, py, tile, color, kind);
      return;
    }
    if (kind === 'vinyl' && drawPixelVinylStand) {
      const goldA = 0.22 + p * 0.42;
      drawWarmGlow(ctx, cx, cy + 2, 16 + p * 10, PAL.gold, goldA * 0.45);
      ctx.strokeStyle = `rgba(201,168,76,${0.42 + p * 0.38})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 3, tile - 6, tile - 6);
      fillPixelRect(ctx, px + 5, py + 5, tile - 10, 2, 2, PAL.goldHi);
      fillPixelRect(ctx, px + 5, py + tile - 7, tile - 10, 2, 2, PAL.goldLo);
      drawPixelVinylStand(ctx, px + 4, py + 4, tile - 8, tile - 8, color, p);
      return;
    }
    if (kind === 'examine') {
      fillPixelRect(ctx, px + 6, py + 8, tile - 12, tile - 14, 3, 'rgba(10,8,18,0.9)');
      fillPixelRect(ctx, px + 8, py + 10, tile - 16, tile - 18, 3, shadeHex(color, -35));
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText('∴', cx, cy + 1);
      return;
    }
    if (kind === 'npc' || kind === 'register') {
      drawNpcZoneRing(ctx, cx, cy + 2, 9, color, p, emphasis > 0.85);
      if (emphasis > 0.7) {
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(248,244,232,${0.55 + p * 0.35})`;
        ctx.fillText(kind === 'register' ? '★' : 'Z', cx, cy - 7);
      }
      return;
    }
    if (kind === 'secret') {
      fillPixelRect(ctx, px + 9, py + 9, tile - 18, tile - 18, 3, 'rgba(10,8,18,0.82)');
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText('?', cx, cy + 2);
    }
  }

  function drawFloorRecordRack(ctx, x, y, tiles, accent, pulse = 0) {
    const w = Math.max(22, Math.min(50, tiles * 22));
    const h = 22;
    fillPixelRect(ctx, x, y + h - 6, w, 6, 3, '#1a1028');
    fillPixelRect(ctx, x + 2, y + 4, w - 4, h - 10, 4, '#14101c');
    fillPixelRect(ctx, x + 2, y + 2, w - 4, 4, 4, '#2a2038');
    const spineColors = [accent, '#c45c7a', '#4a8f7a', '#7b5ea7', '#e8e0f0', '#c9a84c'];
    const count = Math.max(4, tiles * 3);
    for (let i = 0; i < count; i++) {
      const sx = x + 5 + i * Math.floor((w - 10) / count);
      const spineH = 22 + (i % 3) * 4;
      drawPixelVinylSpine(ctx, sx, y + 8, spineH, spineColors[(i + x) % spineColors.length]);
    }
    fillPixelRect(ctx, x, y + h - 2, w, 2, 2, accent || '#c9a84c');
    fillPixelRect(ctx, x + 4, y + h - 8, w - 8, 2, 2, shadeHex(accent || '#c9a84c', -30));
    if (pulse > 0) {
      drawWarmGlow(ctx, x + w / 2, y + h / 2, 28 + pulse * 12, accent || '#c9a84c', 0.06 + pulse * 0.08);
    }
  }

  function drawBrickWall(ctx, px, py, tile, tx, ty) {
    fillPixelRect(ctx, px, py, tile, tile, 4, PAL.brickLo);
    const row = ty % 2;
    for (let rowY = 0; rowY < 3; rowY++) {
      const by = py + 3 + rowY * 8;
      const off = (row + rowY) % 2 ? 6 : 0;
      for (let bx = off; bx < tile - 4; bx += 12) {
        fillPixelRect(ctx, px + 2 + bx, by, 10, 6, 2, PAL.brick);
        fillPixelRect(ctx, px + 3 + bx, by + 1, 8, 2, 2, PAL.brickHi);
        fillPixel(ctx, px + 2 + bx, by, 2, 6, PAL.mortar);
      }
    }
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, 2, 2, shadeHex(PAL.brickHi, 15));
    fillPixelRect(ctx, px + 1, py + tile - 3, tile - 2, 2, 2, PAL.mortar);
    if (ty === 0) {
      fillPixelRect(ctx, px + 2, py + tile - 5, tile - 4, 4, 2, PAL.wood);
      fillPixelRect(ctx, px + 4, py + tile - 4, tile - 8, 2, 2, PAL.goldLo);
    }
    if ((tx + ty) % 4 === 0) {
      fillPixelRect(ctx, px + 5, py + 10, 4, 10, 2, 'rgba(201,168,76,0.07)');
    }
  }

  function drawWoodShelfTile(ctx, px, py, tile, featured, color, pulse, label) {
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, tile - 2, 4, PAL.woodLo);
    fillPixelRect(ctx, px + 2, py + 2, tile - 4, 4, 4, PAL.woodHi);
    fillPixelRect(ctx, px + 2, py + tile - 8, tile - 4, 6, 4, PAL.ink);
    fillPixelRect(ctx, px + 3, py + tile - 7, tile - 6, 2, 2, color || PAL.goldLo);
    if (featured) {
      drawPixelVinylStand(ctx, px + 2, py + 1, tile - 4, tile - 3, color, pulse);
      if (label) {
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(label, px + tile / 2, py + tile - 2);
      }
    } else {
      ctx.save();
      ctx.globalAlpha = 0.48;
      fillPixelRect(ctx, px + 3, py + 6, tile - 6, tile - 14, 4, PAL.ink);
      for (let i = 0; i < 3; i++) {
        const c = ['#c9a84c', '#c45c7a', '#4a8f7a', '#7b5ea7', '#e8e0f0'][(px + py + i) % 5];
        drawPixelVinylSpine(ctx, px + 4 + i * 8, py + 5, 16, c);
      }
      fillPixelRect(ctx, px + 4, py + 3, tile - 8, 1, 2, 'rgba(255,255,255,0.03)');
      ctx.restore();
    }
    fillPixel(ctx, px + 1, py + 4, 2, tile - 8, shadeHex(PAL.wood, -20));
  }

  function drawRegisterTile(ctx, px, py, tile) {
    drawParquetFloor(ctx, px, py, tile, 9, 4);
    fillPixelRect(ctx, px + 2, py + 2, tile - 4, tile - 5, 4, PAL.wood);
    fillPixelRect(ctx, px + 4, py + 4, tile - 8, tile - 9, 4, PAL.woodHi);
    fillPixelRect(ctx, px + 6, py + 6, tile - 12, tile - 12, 4, '#1a1428');
    fillPixelRect(ctx, px + 8, py + 8, tile - 16, 4, 2, 'rgba(201,168,76,0.35)');
    fillPixel(ctx, px + tile - 10, py + tile / 2, 3, 3, PAL.gold);
    fillPixelRect(ctx, px + 3, py + tile - 6, tile - 6, 2, 2, PAL.goldLo);
  }

  function drawDoorThreshold(ctx, px, py, tile, center) {
    fillPixelRect(ctx, px + 2, py + tile - 8, tile - 4, 6, 4, center ? PAL.goldLo : PAL.woodLo);
    fillPixelRect(ctx, px + 4, py + tile - 6, tile - 8, 3, 2, center ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.1)');
    if (center) {
      fillPixelRect(ctx, px + tile / 2 - 6, py + tile - 5, 12, 2, 2, 'rgba(74,143,122,0.35)');
    }
  }

  function drawStorefrontFacade(ctx, px, py, tile) {
    fillPixelRect(ctx, px + 2, py + 2, tile - 4, tile - 4, 4, PAL.brick);
    fillPixelRect(ctx, px + 4, py + 4, tile - 8, tile - 8, 4, PAL.brickHi);
    fillPixelRect(ctx, px + 3, py + tile - 5, tile - 6, 3, 2, PAL.wood);
    fillPixelRect(ctx, px + 5, py + tile - 4, tile - 10, 2, 2, PAL.goldLo);
  }

  function drawDoorTile(ctx, px, py, tile, glow, open = false) {
    if (open) {
      drawParquetFloor(ctx, px, py, tile, 10, 12);
      fillPixelRect(ctx, px + 2, py + 2, 4, tile - 6, 3, PAL.wood);
      fillPixelRect(ctx, px + tile - 8, py + 2, 4, tile - 6, 3, PAL.wood);
      fillPixelRect(ctx, px + 3, py + 1, 2, tile - 4, 2, PAL.goldLo);
      fillPixelRect(ctx, px + tile - 7, py + 1, 2, tile - 4, 2, PAL.goldLo);
      fillPixel(ctx, px + tile / 2, py + tile - 8, 4, 4, `rgba(201,168,76,${glow * 0.6})`);
      return;
    }
    fillPixelRect(ctx, px + 2, py + 1, tile - 4, tile - 2, 4, PAL.wood);
    fillPixelRect(ctx, px + 4, py + 3, tile - 8, tile - 6, 4, PAL.ink);
    fillPixelRect(ctx, px + 6, py + 5, tile - 12, tile - 10, 4, '#2a2848');
    fillPixelRect(ctx, px + 8, py + 7, tile - 16, tile - 14, 4, '#1a1830');
    fillPixel(ctx, px + tile - 10, py + tile / 2, 4, 4, `rgba(201,168,76,${glow})`);
    fillPixelRect(ctx, px + 8, py + 8, tile - 16, 2, 2, 'rgba(74,143,122,0.35)');
    fillPixelRect(ctx, px + 8, py + 14, tile - 16, 2, 2, 'rgba(74,143,122,0.25)');
    fillPixelRect(ctx, px + 8, py + 20, tile - 16, 2, 2, 'rgba(74,143,122,0.2)');
    fillPixelRect(ctx, px + 3, py + 2, 2, tile - 4, 2, PAL.goldLo);
  }

  function drawSpriteShadow(ctx, cx, cy, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.35, w * 0.42, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLampAmbientWash(ctx, lamps, ox, oy, tile, frame) {
    lamps.forEach(([tx, ty], i) => {
      const lx = ox + tx * tile + tile / 2;
      const ly = oy + ty * tile + tile * 0.35;
      const pulse = 0.55 + Math.sin(frame * 0.06 + i * 1.4) * 0.25;
      const r = 52 + Math.sin(frame * 0.04 + i) * 8;
      const grd = ctx.createRadialGradient(lx, ly, 4, lx, ly, r);
      grd.addColorStop(0, `rgba(232,212,140,${pulse * 0.09})`);
      grd.addColorStop(0.45, `rgba(201,168,76,${pulse * 0.035})`);
      grd.addColorStop(1, 'rgba(10,8,18,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
    });
  }

  function drawStoreVignette(ctx, ox, oy, mapW, mapH, W, H) {
    const grd = ctx.createRadialGradient(
      ox + mapW / 2, oy + mapH / 2, mapW * 0.22,
      ox + mapW / 2, oy + mapH / 2, mapW * 0.72,
    );
    grd.addColorStop(0, 'rgba(10,8,18,0)');
    grd.addColorStop(1, 'rgba(10,8,18,0.28)');
    ctx.fillStyle = grd;
    ctx.fillRect(ox - 8, oy - 8, mapW + 16, mapH + 16);
    ctx.fillStyle = 'rgba(10,8,18,0.22)';
    ctx.fillRect(0, 0, W, Math.max(0, oy - 4));
    ctx.fillStyle = 'rgba(10,8,18,0.18)';
    ctx.fillRect(0, oy + mapH + 4, W, H - oy - mapH - 4);
  }

  function drawPixelCharacter(ctx, cx, cy, scale, opts = {}) {
    const {
      body = PAL.teal, bodyHi = shadeHex(PAL.teal, 25), hair = PAL.ink,
      skin = '#e8c4a8', skinLo = '#c9a080', coat = null, accent = null,
      dir = 'down', bob = 0, frame = 0,
    } = opts;
    const s = scale;
    const px = snap(cx);
    const py = snap(cy + bob);
    drawSpriteShadow(ctx, px, py, 10 * s, 14 * s);
    const legOff = opts.moving ? Math.sin(frame * 0.35) * s : 0;
    fillPixelRect(ctx, px - 3 * s - legOff, py + 4 * s, 2 * s, 3 * s, s, shadeHex(body, -30));
    fillPixelRect(ctx, px + 1 * s + legOff, py + 4 * s, 2 * s, 3 * s, s, shadeHex(body, -30));
    fillPixelRect(ctx, px - 4 * s, py - 2 * s, 8 * s, 7 * s, s, body);
    fillPixelRect(ctx, px - 3 * s, py - 1 * s, 6 * s, 3 * s, s, bodyHi);
    if (coat) {
      fillPixelRect(ctx, px - 5 * s, py - 1 * s, 2 * s, 6 * s, s, coat);
      fillPixelRect(ctx, px + 3 * s, py - 1 * s, 2 * s, 6 * s, s, coat);
      fillPixel(ctx, px - 1 * s, py + 2 * s, 2 * s, 2 * s, accent || PAL.gold);
    }
    fillPixelRect(ctx, px - 3 * s, py - 6 * s, 6 * s, 3 * s, s, hair);
    fillPixelRect(ctx, px - 2 * s, py - 5 * s, 4 * s, 2 * s, s, shadeHex(hair, 20));
    fillPixelRect(ctx, px - 2 * s, py - 4 * s, 4 * s, 4 * s, s, skin);
    fillPixel(ctx, px - 2 * s, py - 2 * s, 4 * s, 1 * s, skinLo);
    ctx.fillStyle = PAL.ink;
    if (dir === 'down') {
      fillPixel(ctx, px - 1 * s, py - 3 * s, s, s, PAL.ink);
      fillPixel(ctx, px + 1 * s, py - 3 * s, s, s, PAL.ink);
      fillPixel(ctx, px - 1 * s, py - 1 * s, 2 * s, s, '#8a3040');
    } else if (dir === 'up') {
      fillPixelRect(ctx, px - 2 * s, py - 4 * s, 4 * s, 3 * s, s, hair);
    } else if (dir === 'left') {
      fillPixel(ctx, px - 2 * s, py - 3 * s, s, s, PAL.ink);
      fillPixel(ctx, px - 1 * s, py - 1 * s, s, s, '#8a3040');
    } else {
      fillPixel(ctx, px + 1 * s, py - 3 * s, s, s, PAL.ink);
      fillPixel(ctx, px, py - 1 * s, s, s, '#8a3040');
    }
  }

  function drawPendantLamp(ctx, x, y, glow) {
    const g = 0.35 + glow * 0.55;
    fillPixel(ctx, x, y - 14, 2, 6, PAL.ink);
    fillPixelRect(ctx, x - 1, y - 8, 4, 2, 2, PAL.goldLo);
    fillPixelRect(ctx, x - 7, y - 6, 14, 8, 2, `rgba(255,236,180,${g})`);
    fillPixelRect(ctx, x - 5, y - 4, 10, 4, 2, `rgba(232,212,140,${g * 0.85})`);
    fillPixelRect(ctx, x - 1, y + 2, 2, 4, 2, PAL.gold);
    drawWarmGlow(ctx, x, y + 4, 16 + glow * 12, PAL.goldHi, 0.06 + glow * 0.1);
  }

  function drawPixelLamp(ctx, x, y, glow) {
    drawPendantLamp(ctx, x, y, glow);
  }

  function drawPixelRug(ctx, x, y, w, h, accent) {
    fillPixelRect(ctx, x, y, w, h, 4, PAL.woodLo);
    fillPixelRect(ctx, x + 2, y + 2, w - 4, h - 4, 4, PAL.ink);
    fillPixelRect(ctx, x + 4, y + 4, w - 8, h - 8, 4, '#1c1428');
    for (let i = 0; i < 3; i++) {
      fillPixelRect(ctx, x + 8 + i * 12, y + 6, 6, h - 12, 4, accent);
      fillPixelRect(ctx, x + 9 + i * 12, y + 7, 4, h - 14, 2, shadeHex(accent, 35));
    }
    fillPixelRect(ctx, x + w / 2 - 10, y + h / 2 - 3, 20, 6, 4, accent);
    fillPixelRect(ctx, x + 2, y + 2, w - 4, 2, 2, PAL.goldLo);
    fillPixelRect(ctx, x + 2, y + h - 4, w - 4, 2, 2, PAL.goldLo);
  }

  function drawPixelShelfUnit(ctx, x, y, w, h, accent) {
    fillPixelRect(ctx, x, y, w, h, 4, '#1a1028');
    fillPixelRect(ctx, x + 2, y + 2, w - 4, 4, 4, '#2a2038');
    fillPixelRect(ctx, x + 2, y + h - 6, w - 4, 4, 4, '#0a0812');
    fillPixelRect(ctx, x + 4, y + 8, w - 8, h - 14, 4, '#14101c');
    for (let i = 0; i < 3; i++) {
      const sx = x + 6 + i * Math.floor((w - 12) / 3);
      drawPixelVinylSpine(ctx, sx, y + 10, h - 18, accent || '#c9a84c');
    }
    fillPixelRect(ctx, x, y + h - 2, w, 2, 2, accent || '#c9a84c');
  }

  function drawPixelCounter(ctx, x, y, w, h, flash = 0) {
    const top = flash > 0 ? PAL.goldHi : '#5a4070';
    fillPixelRect(ctx, x, y, w, h, 4, PAL.wood);
    fillPixelRect(ctx, x + 2, y + 2, w - 4, Math.floor(h * 0.38), 4, top);
    fillPixelRect(ctx, x + 2, y + 2, w - 4, 3, 4, shadeHex(top, 30));
    fillPixelRect(ctx, x + 4, y + Math.floor(h * 0.42), w - 8, h - Math.floor(h * 0.48), 4, PAL.ink);
    fillPixelRect(ctx, x + 6, y + h - 10, w - 12, 6, 4, PAL.void);
    fillPixelRect(ctx, x + 8, y + Math.floor(h * 0.48), w - 16, h - Math.floor(h * 0.55), 4, '#2a2848');
    if (flash > 0) {
      const a = Math.min(0.45, flash * 0.45);
      fillPixelRect(ctx, x - 4, y - 4, w + 8, h + 8, 4, `rgba(201,168,76,${a})`);
      drawWarmGlow(ctx, x + w / 2, y + h / 2, 36, PAL.goldHi, a * 0.25);
    }
    fillPixelRect(ctx, x + w - 18, y + 6, 10, 8, 2, PAL.gold);
    fillPixelRect(ctx, x + w - 16, y + 8, 6, 4, 2, '#2a2038');
    fillPixel(ctx, x + w - 14, y + 9, 2, 2, PAL.cream);
    fillPixelRect(ctx, x + 4, y + h - 2, w - 8, 2, 2, PAL.goldLo);
  }

  function drawPixelNeonSign(ctx, x, y, w, text, color, pulse) {
    const g = 0.55 + pulse * 0.35;
    drawWarmGlow(ctx, x + w / 2, y + 8, 18 + pulse * 8, color, 0.06 + pulse * 0.08);
    fillPixelRect(ctx, x - 2, y - 2, w + 4, 16, 2, 'rgba(10,8,18,0.7)');
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(0,0,0,${0.35 + pulse * 0.2})`;
    ctx.fillText(text, x + w / 2 + 1, y + 9);
    ctx.fillStyle = color.startsWith('#')
      ? color + Math.floor(g * 255).toString(16).padStart(2, '0')
      : color;
    ctx.fillText(text, x + w / 2, y + 8);
    fillPixelRect(ctx, x, y + 12, w, 2, 2, color);
    fillPixelRect(ctx, x + 2, y + 14, w - 4, 1, 2, shadeHex(color, 40));
  }

  function drawGhostSlice(ctx, cx, cy, color, keyLabel = 'D') {
    const w = 44;
    const h = 14;
    const x = cx - w / 2;
    const y = cy - h / 2;
    fillPixelRect(ctx, x, y, w, h, 2, color);
    fillPixelRect(ctx, x + 2, y + 2, w - 4, h - 4, 2, '#14101c');
    fillPixelRect(ctx, x + w - 8, y + 2, 6, h - 4, 2, shadeHex(color, 50));
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#f8f4e8';
    ctx.textAlign = 'center';
    ctx.fillText(keyLabel, cx, cy + 4);
    drawWarmGlow(ctx, cx, cy, 28, color, 0.14);
  }

  function drawPosterSparkle(ctx, cx, cy, frame) {
    const pulse = 0.45 + Math.sin(frame * 0.14) * 0.4;
    ctx.save();
    ctx.globalAlpha = pulse;
    for (let i = 0; i < 4; i++) {
      const a = (frame * 0.08 + i * 1.57);
      const r = 10 + Math.sin(frame * 0.1 + i) * 4;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      fillPixel(ctx, sx, sy, 3, i % 2 ? PAL.goldHi : PAL.gold);
    }
    ctx.globalAlpha = pulse * 0.35;
    drawWarmGlow(ctx, cx, cy, 22, PAL.gold, 0.12);
    ctx.restore();
  }

  function drawPixelPoster(ctx, x, y, w, h, title, color) {
    fillPixelRect(ctx, x, y, w, h, 4, PAL.woodLo);
    fillPixelRect(ctx, x + 2, y + 2, w - 4, h - 4, 4, PAL.ink);
    fillPixelRect(ctx, x + 4, y + 4, w - 8, h - 8, 4, '#14101c');
    fillPixelRect(ctx, x + 6, y + h - 14, w - 12, 5, 4, color);
    fillPixelRect(ctx, x + 4, y + 4, 2, h - 8, 2, shadeHex(color, -40));
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + h / 2 + 2);
  }

  function drawPixelVinylSpine(ctx, x, y, h, color) {
    fillPixelRect(ctx, x, y, 8, h, 2, color);
    fillPixel(ctx, x + 2, y + 4, 4, 4, '#0a0812');
    fillPixelRect(ctx, x + 1, y + 2, 2, h - 4, 2, 'rgba(255,255,255,0.15)');
  }

  function drawPixelVinylStand(ctx, x, y, w, h, color, pulse = 0) {
    const glow = 0.35 + pulse * 0.45;
    fillPixelRect(ctx, x, y + h - 6, w, 6, 2, '#1a1028');
    fillPixelRect(ctx, x + 2, y + h - 8, w - 4, 2, 2, color);
    fillPixelRect(ctx, x + 4, y + 4, w - 8, h - 14, 4, '#14101c');
    fillPixelRect(ctx, x + 2, y + 2, w - 4, 4, 4, '#2a2038');
    const cx = x + w / 2;
    const cy = y + h / 2 - 2;
    const rr = Math.min(w, h) * 0.28;
    fillPixelDisk(ctx, cx, cy, rr + 4, 3, color + Math.floor(glow * 120).toString(16).padStart(2, '0'));
    fillPixelDisk(ctx, cx, cy, rr, 3, '#0a0812');
    fillPixelDisk(ctx, cx, cy, rr * 0.55, 3, color);
    fillPixelDisk(ctx, cx, cy, rr * 0.12, 3, '#1a1028');
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(248,244,232,${0.55 + pulse * 0.35})`;
    ctx.fillText('♫', cx, y + h - 2);
  }

  function drawPixelFloorZone(ctx, x, y, w, h, color, pulse = 0, subtle = false) {
    const a = subtle ? 0.06 + pulse * 0.05 : 0.1 + pulse * 0.08;
    const hex = color.startsWith('#') && color.length === 7;
    ctx.fillStyle = hex
      ? `${color}${Math.floor(a * 255).toString(16).padStart(2, '0')}`
      : color;
    fillPixelRect(ctx, x + 2, y + 2, w - 4, h - 4, 4, ctx.fillStyle);
    if (!subtle) {
      ctx.strokeStyle = color + Math.floor((0.28 + pulse * 0.2) * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    }
  }

  function drawNpcZoneRing(ctx, cx, cy, r, color, pulse = 0, showBadge = true) {
    const a = 0.18 + pulse * 0.22;
    const hex = color.startsWith('#') && color.length === 7;
    ctx.strokeStyle = hex
      ? `${color}${Math.floor(a * 255).toString(16).padStart(2, '0')}`
      : color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (showBadge) {
      fillPixelRect(ctx, cx - 8, cy - r - 10, 16, 8, 2, 'rgba(10,8,18,0.75)');
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText('TALK', cx, cy - r - 4);
    }
  }

  function drawStoreZoneSign(ctx, x, y, w, label, sub, color) {
    fillPixelRect(ctx, x, y, w, 14, 2, 'rgba(10,8,18,0.82)');
    fillPixelRect(ctx, x, y + 12, w, 2, 2, color);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(label, x + w / 2, y + 8);
    if (sub) {
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(232,224,240,0.45)';
      ctx.fillText(sub, x + w / 2, y + 22);
    }
  }

  function drawStoreGuidePanel(ctx, x, y, w, vinyls, npcs, talked) {
    const rowH = 14;
    const h = 10 + vinyls.length * rowH + 8 + npcs.length * rowH + 6;
    ctx.fillStyle = 'rgba(10,8,18,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9a84c';
    ctx.fillText('GUIDE', x + 6, y + 10);
    ctx.fillStyle = 'rgba(232,224,240,0.35)';
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.fillText('♫ · ∴ · Z', x + w - 52, y + 10);

    let row = 0;
    ctx.fillStyle = 'rgba(201,168,76,0.55)';
    ctx.fillText('VINYLS', x + 6, y + 22);
    vinyls.forEach((v) => {
      const ry = y + 32 + row * rowH;
      fillPixelDisk(ctx, x + 10, ry - 3, 5, 2, v.color);
      fillPixelDisk(ctx, x + 10, ry - 3, 2, 2, '#0a0812');
      ctx.fillStyle = v.color;
      ctx.fillText(v.id, x + 22, ry);
      ctx.fillStyle = 'rgba(232,224,240,0.4)';
      const short = (v.title || v.id).slice(0, 14);
      ctx.fillText(short, x + 68, ry);
      row++;
    });

    const npcBase = y + 32 + vinyls.length * rowH + 6;
    ctx.fillStyle = 'rgba(74,143,122,0.55)';
    ctx.fillText('PEOPLE', x + 6, npcBase);
    npcs.forEach((n, i) => {
      const ry = npcBase + 10 + i * rowH;
      const done = talked?.has?.(n.id);
      const isSarah = n.id === 'ninjawhee_return';
      if (isSarah && !n.hidden) {
        ctx.fillStyle = 'rgba(201,168,76,0.25)';
        ctx.fillRect(x + 4, ry - 9, w - 8, 12);
      }
      ctx.fillStyle = done ? 'rgba(232,224,240,0.25)' : n.accent;
      ctx.fillRect(x + 8, ry - 6, 8, 8);
      ctx.fillStyle = isSarah && !n.hidden ? '#e8d48c' : (done ? 'rgba(232,224,240,0.35)' : '#f8f4e8');
      ctx.fillText(isSarah ? '>> sarah' : n.label, x + 22, ry);
      ctx.fillStyle = 'rgba(232,224,240,0.35)';
      ctx.fillText(n.hint || '', x + 68, ry);
      if (!done && !n.hidden) {
        ctx.fillStyle = '#f8f4ff';
        ctx.fillText('!', x + w - 12, ry);
      }
    });
  }

  function drawSarahStandMarker(ctx, cx, cy, pulse, fresh, tile = 28) {
    const beamA = 0.08 + Math.sin(pulse) * 0.06;
    ctx.fillStyle = `rgba(232,212,140,${beamA})`;
    ctx.fillRect(cx - 10, cy - tile * 1.6, 20, tile * 1.2);
    drawWarmGlow(ctx, cx, cy, 22 + Math.sin(pulse) * 6, '#e8d48c', fresh ? 0.2 : 0.12);
    ctx.strokeStyle = `rgba(201,168,76,${0.55 + Math.sin(pulse) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 16, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    const tagW = 72;
    const tagX = cx - tagW / 2;
    const tagY = cy - 38;
    fillPixelRect(ctx, tagX, tagY, tagW, 14, 2, 'rgba(10,8,18,0.92)');
    fillPixelRect(ctx, tagX, tagY + 12, tagW, 2, 2, '#c9a84c');
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = fresh ? '#f8f4e8' : '#e8d48c';
    ctx.fillText('>> SARAH <<', cx, tagY + 10);
    if (fresh) {
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = '#c45c7a';
      ctx.fillText('@ register', cx, tagY - 4);
    }
  }

  function drawPixelSarah(ctx, cx, cy, scale, opts = {}) {
    const {
      dir = 'down', bob = 0, mood = 'idle',
      apron = '#2a1a38', hair = '#e8d48c', shirt = '#f8f4e8',
      skin = '#e8c4a8', skinLo = '#c9a080',
    } = opts;
    const s = scale;
    const px = snap(cx);
    const py = snap(cy + bob);
    drawSpriteShadow(ctx, px, py, 11 * s, 15 * s);

    const legOff = opts.moving ? Math.sin((opts.frame || 0) * 0.35) * s : 0;
    fillPixelRect(ctx, px - 3 * s - legOff, py + 5 * s, 2 * s, 4 * s, s, '#1a1028');
    fillPixelRect(ctx, px + 1 * s + legOff, py + 5 * s, 2 * s, 4 * s, s, '#1a1028');
    fillPixelRect(ctx, px - 5 * s, py - 2 * s, 10 * s, 9 * s, s, apron);
    fillPixelRect(ctx, px - 4 * s, py - 1 * s, 8 * s, 4 * s, s, shirt);
    fillPixelRect(ctx, px - 5 * s, py - 4 * s, 2 * s, 3 * s, s, apron);
    fillPixelRect(ctx, px + 3 * s, py - 4 * s, 2 * s, 3 * s, s, apron);
    fillPixelRect(ctx, px - 1 * s, py + 1 * s, 2 * s, 2 * s, s, PAL.goldLo);

    if (dir === 'down') {
      fillPixelRect(ctx, px - 7 * s, py + 1 * s, 3 * s, 2 * s, s, skinLo);
      fillPixelRect(ctx, px + 4 * s, py, 3 * s, 2 * s, s, shirt);
    } else if (dir === 'left') {
      fillPixelRect(ctx, px - 6 * s, py, 2 * s, 5 * s, s, apron);
    } else if (dir === 'right') {
      fillPixelRect(ctx, px + 4 * s, py, 2 * s, 5 * s, s, apron);
    }

    fillPixelRect(ctx, px - 3 * s, py - 7 * s, 6 * s, 4 * s, s, skin);
    fillPixelRect(ctx, px - 4 * s, py - 11 * s, 8 * s, 5 * s, s, hair);
    fillPixelRect(ctx, px - 2 * s, py - 12 * s, 4 * s, 2 * s, s, shadeHex(hair, 30));
    fillPixelRect(ctx, px + 2 * s, py - 10 * s, 3 * s, 3 * s, s, shadeHex(hair, -15));
    fillPixelRect(ctx, px - 4 * s, py - 6 * s, 8 * s, s, s, '#c9a84c');
    fillPixelRect(ctx, px - 5 * s, py - 5 * s, s, 2 * s, s, '#c9a84c');
    fillPixelRect(ctx, px + 4 * s, py - 5 * s, s, 2 * s, s, '#c9a84c');

    ctx.font = `${Math.max(4, 3 * s)}px serif`;
    ctx.fillStyle = '#f8f4ff';
    ctx.textAlign = 'center';
    ctx.fillText('∴', px, py + 2 * s);

    if (mood === 'smile' || mood === 'talk') {
      fillPixelRect(ctx, px - 2 * s, py - 3 * s, 4 * s, s, s, '#8a5040');
    } else {
      fillPixel(ctx, px - 1 * s, py - 4 * s, s, s, PAL.ink);
      fillPixel(ctx, px + 1 * s, py - 4 * s, s, s, PAL.ink);
      fillPixel(ctx, px - 1 * s, py - 2 * s, 2 * s, s, '#8a5040');
    }

    if (mood === 'talk') {
      fillPixelRect(ctx, px - 1 * s, py - 2 * s, 2 * s, s, s, '#8a3040');
    }

    if (mood !== 'idle') {
      const vx = px + 6 * s;
      const vy = py + 2 * s;
      fillPixelDisk(ctx, vx, vy, 3 * s, s, '#1a1028');
      fillPixelDisk(ctx, vx, vy, 2 * s, s, '#c9a84c');
      fillPixelDisk(ctx, vx, vy, s, s, '#c45c7a');
    }
  }

  function drawExamineWallMarker(ctx, x, y, w, h, label, color, pulse = 0) {
    const g = 0.45 + pulse * 0.35;
    drawWarmGlow(ctx, x + w / 2, y + h / 2, 14 + pulse * 6, color, 0.08 + pulse * 0.06);
    fillPixelRect(ctx, x, y, w, h, 2, 'rgba(10,8,18,0.88)');
    fillPixelRect(ctx, x + 2, y + 2, w - 4, h - 4, 2, shadeHex(color, -35));
    fillPixelRect(ctx, x + 3, y + h - 6, w - 6, 3, 2, color);
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(248,244,232,${0.55 + g * 0.4})`;
    ctx.fillText('∴', x + w / 2, y + h / 2 + 2);
    if (label) {
      ctx.font = '4px "Press Start 2P", monospace';
      ctx.fillStyle = color + Math.floor(g * 255).toString(16).padStart(2, '0');
      ctx.fillText(label.slice(0, 10), x + w / 2, y - 3);
    }
  }

  function drawPixelCrate(ctx, x, y, accent = '#4a8f7a') {
    fillPixelRect(ctx, x, y + 6, 20, 14, 3, '#2a2038');
    fillPixelRect(ctx, x + 2, y + 4, 16, 4, 3, shadeHex(accent, -25));
    fillPixelRect(ctx, x + 3, y + 8, 14, 8, 3, '#1a1028');
    fillPixelRect(ctx, x + 4, y + 2, 12, 4, 3, accent);
    fillPixelRect(ctx, x + 6, y, 8, 3, 3, shadeHex(accent, 20));
    fillPixelRect(ctx, x + 2, y + 10, 16, 2, 2, shadeHex(accent, -35));
    fillPixel(ctx, x + 9, y + 5, 2, 2, '#f8f4e8');
  }

  function drawPixelBox(ctx, x, y, accent = '#c9a84c') {
    fillPixelRect(ctx, x, y + 4, 16, 12, 3, '#3a2838');
    fillPixelRect(ctx, x + 2, y + 2, 12, 4, 3, shadeHex(accent, -20));
    fillPixelRect(ctx, x + 3, y + 6, 10, 8, 3, '#1a1028');
    fillPixelRect(ctx, x + 5, y + 8, 6, 2, 2, accent);
    fillPixelRect(ctx, x + 2, y + 14, 12, 2, 2, '#0a0812');
  }

  function drawRecordShelfWall(ctx, x, y, tiles, accent, pulse = 0) {
    const w = tiles * 28;
    const h = 30;
    fillPixelRect(ctx, x, y, w, h, 4, '#1a1028');
    fillPixelRect(ctx, x + 2, y + 2, w - 4, 5, 4, '#2a2038');
    fillPixelRect(ctx, x + 2, y + h - 5, w - 4, 3, 4, '#0a0812');
    const spineColors = [accent, '#c45c7a', '#4a8f7a', '#7b5ea7', '#e8e0f0'];
    const count = Math.max(3, tiles * 2);
    for (let i = 0; i < count; i++) {
      const sx = x + 4 + i * Math.floor((w - 8) / count);
      const spineH = h - 10 + (i % 3) * 2;
      drawPixelVinylSpine(ctx, sx, y + 6, spineH, spineColors[(i + x) % spineColors.length]);
    }
    fillPixelRect(ctx, x, y + h - 2, w, 2, 2, accent || '#c9a84c');
    if (pulse > 0) {
      fillPixelRect(ctx, x - 1, y - 1, w + 2, h + 2, 2, `rgba(201,168,76,${0.08 + pulse * 0.12})`);
    }
  }

  function drawSarahCounterArrow(ctx, counterCx, counterCy, sarahCx, sarahCy, pulse) {
    const a = 0.4 + Math.sin(pulse) * 0.25;
    ctx.strokeStyle = `rgba(201,168,76,${a})`;
    ctx.fillStyle = `rgba(201,168,76,${a})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(counterCx, counterCy);
    ctx.lineTo(sarahCx, sarahCy - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('← sarah', sarahCx + 18, sarahCy - 24);
  }

  function drawControlBar(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(10,8,18,0.88)';
    ctx.fillRect(x, y, w, 16);
    ctx.strokeStyle = 'rgba(201,168,76,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, 16);
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,224,240,0.55)';
    ctx.fillText('←→↑↓ walk  ·  [Z] spin / talk  ·  [X] stop', x + w / 2, y + 11);
  }

  function drawTutorialArrow(ctx, fx, fy, tx, ty, pulse) {
    const dx = tx - fx;
    const dy = ty - fy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const dist = Math.min(len * 0.55, 72);
    const ax = fx + ux * dist;
    const ay = fy + uy * dist;
    const a = 0.45 + Math.sin(pulse) * 0.35;
    ctx.strokeStyle = `rgba(201,168,76,${a})`;
    ctx.fillStyle = `rgba(201,168,76,${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    const ang = Math.atan2(uy, ux);
    const sz = 6;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - Math.cos(ang - 0.5) * sz, ay - Math.sin(ang - 0.5) * sz);
    ctx.lineTo(ax - Math.cos(ang + 0.5) * sz, ay - Math.sin(ang + 0.5) * sz);
    ctx.closePath();
    ctx.fill();
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('glow shelf', ax + ux * 14, ay + uy * 14);
  }

  function drawTalkBubble(ctx, x, y, w, text, color) {
    const tw = Math.min(w, text.length * 5 + 14);
    const tx = x - tw / 2;
    const ty = y - 14;
    ctx.fillStyle = 'rgba(10,8,18,0.9)';
    ctx.fillRect(tx, ty, tw, 12);
    ctx.strokeStyle = color + '99';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, tw, 12);
    ctx.fillStyle = color;
    ctx.fillRect(tx + tw / 2 - 2, ty + 12, 4, 3);
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8f4e8';
    ctx.fillText(text, x, ty + 9);
  }

  function drawVinylRecord(ctx, x, y, r, color, spin, label) {
    const ps = 3;
    fillPixelDisk(ctx, x, y, r, ps, '#0a0812');
    for (let ring = 3; ring <= r; ring += 5) {
      const shade = ring % 10 === 0 ? '#1a1028' : '#120e18';
      fillPixelDisk(ctx, x, y, ring, ps, shade, ring - ps * 2);
    }
    fillPixelDisk(ctx, x, y, r, ps, '#14101c', r * 0.38);
    fillPixelDisk(ctx, x, y, r * 0.36, ps, color);
    fillPixelDisk(ctx, x, y, r * 0.08, ps, '#0a0812');
    fillPixelDisk(ctx, x, y, r * 0.04, ps, '#2a1a38');
    const gx = x + Math.cos(spin) * r * 0.12;
    const gy = y + Math.sin(spin) * r * 0.12;
    fillPixel(ctx, gx, gy, ps * 2, 'rgba(255,255,255,0.12)');
    if (label) {
      ctx.font = `${Math.max(8, Math.floor(r * 0.38))}px "Press Start 2P", monospace`;
      ctx.fillStyle = '#f8f4e8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y);
    }
  }

  function drawCarpetFloor(ctx, px, py, tile, tx, ty) {
    const hue = (tx + ty) % 2 === 0 ? '#3a2838' : '#322430';
    fillPixelRect(ctx, px + 1, py + 1, tile - 2, tile - 2, 4, hue);
    fillPixelRect(ctx, px + 3, py + 3, tile - 6, tile - 6, 4, shadeHex(hue, 18));
    const band = (tx % 3 + ty) % 2 === 0 ? '#c45c7a' : '#7b5ea7';
    fillPixelRect(ctx, px + 5, py + 5, tile - 10, 2, 2, `${band}33`);
    fillPixelRect(ctx, px + 5, py + tile - 9, tile - 10, 2, 2, `${band}22`);
    if ((tx + ty) % 3 === 0) {
      fillPixelRect(ctx, px + 8, py + 8, 4, 4, 2, 'rgba(201,168,76,0.18)');
    }
  }

  function drawPixelTurntable(ctx, x, y, w, h, spin) {
    fillPixelRect(ctx, x, y + h - 4, w, 4, 2, '#1a1028');
    fillPixelRect(ctx, x + 2, y + 2, w - 4, h - 8, 4, '#14101c');
    const cx = x + w / 2;
    const cy = y + h / 2 - 2;
    const rr = Math.min(w, h) * 0.32;
    fillPixelDisk(ctx, cx, cy, rr + 2, 3, '#2a2038');
    fillPixelDisk(ctx, cx, cy, rr, 3, '#0a0812');
    fillPixelDisk(ctx, cx + Math.cos(spin) * 3, cy + Math.sin(spin) * 3, rr * 0.35, 3, '#7b5ea7');
    fillPixelDisk(ctx, cx, cy, 3, 3, '#c9a84c');
    fillPixelRect(ctx, x + w - 10, y + 4, 6, 10, 2, '#4a8f7a');
  }

  function drawPixelPlant(ctx, cx, cy) {
    fillPixelRect(ctx, cx - 5, cy - 2, 10, 8, 2, '#4a3028');
    fillPixelRect(ctx, cx - 8, cy - 14, 16, 12, 4, '#2a5a38');
    fillPixelRect(ctx, cx - 4, cy - 18, 8, 6, 4, '#4a8f7a');
    fillPixel(ctx, cx, cy - 20, 4, 4, '#6aaf9a');
  }

  function drawPixelBird(ctx, cx, cy, frame, mood = 'perched') {
    const flap = mood === 'flying'
      ? Math.sin(frame * 0.55) * 5
      : mood === 'leaving'
        ? Math.sin(frame * 0.35) * 3
        : Math.sin(frame * 0.08) * 1.2;
    const bob = mood === 'perched' ? Math.sin(frame * 0.1) * 1.5 : 0;
    const y = cy + bob;
    const body = mood === 'scared' ? '#8a7a6a' : '#6a5a4a';
    const wing = mood === 'leaving' ? '#c9a84c' : '#5a4a3a';
    fillPixelRect(ctx, cx - 7, y - 3, 14, 8, 2, body);
    fillPixelRect(ctx, cx - 10, y - 6 + flap, 8, 5, 2, wing);
    fillPixelRect(ctx, cx + 2, y - 5 - flap * 0.6, 8, 4, 2, wing);
    fillPixelRect(ctx, cx + 6, y - 1, 4, 3, 2, '#c9a84c');
    fillPixel(ctx, cx + 9, y, 2, 2, '#e8c88c');
    fillPixel(ctx, cx - 3, y - 5, 2, 2, '#1a1028');
    fillPixel(ctx, cx + 2, y - 5, 2, 2, '#1a1028');
    if (mood === 'scared') {
      fillPixel(ctx, cx - 1, y + 4, 2, 2, '#c45c7a');
    }
  }

  function setupPixelCtx(ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  return {
    PAL, snap, shadeHex, fillPixel, fillPixelDisk, fillPixelRect,
    drawScanlines, drawPixelStar, drawPixelMoon, drawPixelWindow,
    drawWarmGlow, drawGhostSlice, drawPosterSparkle,
    drawPixelLamp, drawPendantLamp, drawPixelRug, drawPixelPoster, drawPixelVinylSpine,
    drawPixelShelfUnit, drawPixelCounter, drawPixelNeonSign,
    drawParquetFloor, drawCarpetFloor, drawBrickWall, drawWoodShelfTile, drawRegisterTile, drawDoorTile,
    drawDoorThreshold, drawStorefrontFacade,
    drawPixelTurntable, drawPixelPlant, drawPixelBird,
    drawSpriteShadow, drawStoreVignette, drawLampAmbientWash, drawPixelCharacter,
    drawPixelVinylStand, drawPixelFloorZone, drawInteractPadDot, drawNpcZoneRing, drawStoreZoneSign,
    drawStoreGuidePanel, drawTalkBubble, drawControlBar, drawTutorialArrow,
    drawSarahStandMarker, drawSarahCounterArrow, drawPixelSarah,
    drawExamineWallMarker, drawRecordShelfWall, drawFloorRecordRack, drawAisleRunner,
    drawInteractTileMarker,
    drawPixelCrate, drawPixelBox,
    drawVinylRecord, setupPixelCtx,
  };
})();