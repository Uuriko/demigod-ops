// SuperGrok Heavy dialogue art — pixel intro for eat-the-sounds
// Local Grok integrates here; merge Heavy-fetched blocks from HEAVY-PIXEL-CODE.js when available.

const PAL = {
  '.': null,
  '0': '#0a0812', '1': '#1a1028', '2': '#2a1a38', '3': '#3d2a52',
  '4': '#e8b896', '5': '#d4a078', '6': '#f8f4ff', '7': '#1a1028',
  '8': '#c9a84c', '9': '#c45c7a', 'a': '#4a8f7a', 'b': '#7b5ea7',
  'c': '#6a5040', 'd': '#14101c', 'e': '#f0d0b0', 'f': '#5a3a6a',
};

const FRAMES = {
  idle: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab1ddd1ba2........',
    '.........2ab1ddd1ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
  talk: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab19991ba2........',
    '.........2ab19991ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
  smile: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab1ddd1ba2........',
    '.........2ab18881ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
  wonder: [
    '..........22222222..........',
    '.........233333332.........',
    '........23eeeeeeee32........',
    '.......23e47777774e32.......',
    '.......23e67777776e32.......',
    '........23eeeeeeee32........',
    '.........23eeeeee32.........',
    '..........23eeee32..........',
    '...........2abba2...........',
    '..........2abbbbba2.........',
    '.........2abbbbbba2.........',
    '.........2ab17771ba2........',
    '.........2ab17771ba2........',
    '..........2abbbbba2.........',
    '...........2abba2...........',
    '..........23eeee32..........',
    '.........23e....e32.........',
    '........23e......e32........',
    '.......2c4........4c2.......',
    '.......2c4...88....4c2......',
    '.......2c4..8888...4c2......',
    '.......2c4...88....4c2......',
    '........2c4........4c2.......',
    '............................',
  ],
};

const GLYPH_AURA = ['∴', '𓅰', '𓅬'];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} W
 * @param {number} H
 * @param {number} t
 */
function drawDialogueSceneBg(ctx, W, H, t) {
  const PX = window.PixelGfx;
  if (PX) PX.setupPixelCtx(ctx);

  for (let y = 0; y < H; y += 8) {
    const band = y / H;
    ctx.fillStyle = band < 0.45 ? '#1c1230' : band < 0.75 ? '#120c1c' : '#0a0812';
    ctx.fillRect(0, y, W, 8);
  }

  if (PX) {
    PX.drawPixelWindow(ctx, W * 0.68, H * 0.1, 120, 88);
    PX.drawPixelMoon(ctx, W * 0.74, H * 0.2, 22);
  }

  const shelfY = H * 0.12;
  for (let row = 0; row < 3; row++) {
    const y = Math.floor(shelfY + row * 32);
    ctx.fillStyle = '#3d2a52';
    ctx.fillRect(W * 0.08, y, W * 0.84, 4);
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(W * 0.1 + i * (W * 0.042));
      const hue = ['#c9a84c', '#c45c7a', '#4a8f7a', '#7b5ea7'][i % 4];
      if (PX?.drawPixelVinylSpine) {
        PX.drawPixelVinylSpine(ctx, x, y - 18, 16, hue);
      } else {
        ctx.fillStyle = hue;
        ctx.fillRect(x, y - 18, 8, 16);
        ctx.fillStyle = '#0a0812';
        ctx.fillRect(x + 2, y - 14, 4, 4);
      }
    }
  }

  if (PX) {
    const spin = t * 0.04;
    [['#c9a84c', 0.18], ['#c45c7a', 0.82]].forEach(([col, fx], i) => {
      const vx = W * fx + Math.sin(spin + i * 2) * 12;
      const vy = H * 0.72 + Math.cos(spin * 0.7 + i) * 8;
      PX.fillPixelDisk(ctx, vx, vy, 10, 4, col, 3);
      PX.fillPixelDisk(ctx, vx, vy, 2, 2, '#0a0812');
    });
    PX.drawWarmGlow(ctx, W * 0.5, H * 0.88, 80, '#c9a84c', 0.06);
  }

  const ax = W * 0.28, ay = H * 0.42, aw = W * 0.44;
  ctx.fillStyle = 'rgba(201,168,76,0.12)';
  for (let i = 0; i <= 12; i++) {
    const p = i / 12;
    const x = ax + aw * p;
    const top = ay - Math.sin(p * Math.PI) * H * 0.22;
    ctx.fillRect(x, top, 4, ay - top);
  }

  ctx.font = '12px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(240,240,255,0.1)';
  GLYPH_AURA.forEach((ch, i) => {
    const ox = Math.sin(t * 0.02 + i * 2.1) * 24;
    const oy = Math.cos(t * 0.015 + i) * 14;
    ctx.fillText(ch, W * (0.12 + i * 0.14) + ox, H * 0.34 + oy);
  });

  for (let x = 0; x < W; x += 16) {
    for (let y = H * 0.55; y < H; y += 16) {
      ctx.fillStyle = (x / 16 + y / 16) % 2 === 0 ? '#14101c' : '#100c18';
      ctx.fillRect(x, y, 14, 14);
    }
  }

  if (PX) PX.drawScanlines(ctx, W, H, 0.05);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 * @param {'idle'|'talk'|'smile'|'wonder'} frame
 * @param {number} bob
 */
function drawPixelNinjawhee(ctx, x, y, scale, frame, bob) {
  const grid = FRAMES[frame] || FRAMES.idle;
  const ox = x - (grid[0].length * scale) / 2;
  const oy = y - (grid.length * scale) / 2 + bob;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const color = PAL[grid[row][col]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + col * scale, oy + row * scale, scale, scale);
    }
  }

  // headphones band
  ctx.fillStyle = '#c9a84c';
  ctx.fillRect(ox + 3 * scale, oy + 5 * scale, 8 * scale, scale);
  ctx.fillRect(ox + 2 * scale, oy + 6 * scale, scale, 2 * scale);
  ctx.fillRect(ox + 11 * scale, oy + 6 * scale, scale, 2 * scale);

  // ∴ pin on chest
  ctx.font = `${scale * 1.4}px serif`;
  ctx.fillStyle = '#f8f4ff';
  ctx.textAlign = 'center';
  ctx.fillText('∴', ox + 7 * scale, oy + 13 * scale);

  // vinyl in hand
  const vx = ox + 18 * scale, vy = oy + 19 * scale, vr = 3.2 * scale;
  ctx.fillStyle = '#1a1028';
  ctx.beginPath();
  ctx.arc(vx, vy, vr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = Math.max(1, scale * 0.35);
  ctx.stroke();
  ctx.fillStyle = '#c45c7a';
  ctx.beginPath();
  ctx.arc(vx, vy, vr * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, oy + grid.length * scale + scale * 2, grid[0].length * scale * 0.35, scale * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function emotionForNode(nodeId) {
  if (['mirror', 'beauty', 'ready_check'].includes(nodeId)) return 'smile';
  if (['jazz', 'improv', 'colors'].includes(nodeId)) return 'wonder';
  if (['open', 'meet', 'howto', 'store_open', 'store_revisit'].includes(nodeId)) return 'idle';
  if (['store_records', 'store_spin'].includes(nodeId)) return 'smile';
  return 'talk';
}

function blipPitch(speaker) {
  if (speaker === 'you') return 420;
  if (speaker === 'orph') return 460;
  if (speaker === 'simon') return 440;
  if (speaker === 'honey') return 510;
  return 495;
}

let grokPortrait = null;
let grokPortraitReady = false;
/** @type {Array<() => void>} */
let grokPortraitWaiters = [];
/** @type {{ x:number, y:number, w:number, h:number } | null} */
let grokCrop = null;

function isGrokPortraitReady() {
  return grokPortraitReady;
}

function whenGrokPortraitReady(fn) {
  if (typeof fn !== 'function') return;
  if (grokPortraitReady) {
    fn();
    return;
  }
  grokPortraitWaiters.push(fn);
}

function flushGrokPortraitWaiters() {
  const waiters = grokPortraitWaiters.splice(0);
  waiters.forEach((fn) => {
    try { fn(); } catch (_) { /* ignore */ }
  });
}

function detectGrokCrop(img) {
  const c = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0, 0, w, h).data;
  let bottom = h;
  for (let y = h - 1; y >= Math.floor(h * 0.45); y--) {
    let dark = 0;
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 4;
      if (data[i] < 32 && data[i + 1] < 32 && data[i + 2] < 32) dark++;
    }
    if (dark / Math.ceil(w / 4) > 0.82) bottom = y;
    else if (bottom < h) break;
  }
  const side = Math.min(w, bottom);
  const x = Math.max(0, Math.floor((w - side) / 2));
  return { x, y: 0, w: side, h: side };
}

const GROK_PORTRAIT_CANDIDATES = [
  'assets/ninjawhee-grok-pixel-clean.png',
  'assets/ninjawhee-grok-pixel.png',
  'assets/ninjawhee-grok-portrait.png',
];

async function resolveGrokPortraitSrc(preferred) {
  const candidates = [preferred, ...GROK_PORTRAIT_CANDIDATES]
    .filter((s, i, a) => s && a.indexOf(s) === i);
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch (_) { /* try next */ }
  }
  return candidates[0] || GROK_PORTRAIT_CANDIDATES[0];
}

function loadGrokPortrait(src, onReady) {
  if (grokPortraitReady && grokPortrait) {
    onReady?.();
    return;
  }
  const img = new Image();
  const finish = (ok) => {
    grokPortraitReady = !!ok;
    if (!ok) grokPortrait = null;
    onReady?.();
    flushGrokPortraitWaiters();
  };
  img.onload = () => {
    grokPortrait = img;
    grokCrop = detectGrokCrop(img);
    finish(true);
  };
  img.onerror = () => finish(false);
  resolveGrokPortraitSrc(src).then((url) => { img.src = url; }).catch(() => finish(false));
}

/**
 * Undertale-style dialogue blips
 * @param {AudioContext} audioCtx
 * @param {AudioNode} dest
 * @param {'talk'|'choice'|'confirm'|'vinyl'|'advance'} kind
 * @param {number} [pitch]
 */
function playUndertaleBlip(audioCtx, dest, kind, pitch = 500) {
  const t = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.connect(dest);

  if (kind === 'confirm') {
    [520, 780].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const og = audioCtx.createGain();
      og.gain.setValueAtTime(0.07, t + i * 0.06);
      og.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.1);
      o.connect(og); og.connect(g);
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.12);
    });
    return;
  }

  if (kind === 'vinyl') {
    const len = audioCtx.sampleRate * 0.08;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.4;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(ng); ng.connect(g);
    src.start(t);
    toneBlip(audioCtx, g, t + 0.05, 110, 0.08, 'sine', 0.15);
    return;
  }

  const o = audioCtx.createOscillator();
  o.type = kind === 'choice' ? 'square' : 'triangle';
  o.frequency.value = kind === 'choice' ? 340 : pitch + (Math.random() * 30 - 15);
  const og = audioCtx.createGain();
  const vol = kind === 'advance' ? 0.035 : 0.055;
  const dur = kind === 'choice' ? 0.05 : 0.042;
  og.gain.setValueAtTime(vol, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(og); og.connect(g);
  o.start(t); o.stop(t + dur + 0.02);
}

function toneBlip(audioCtx, dest, t, freq, dur, type, vol) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} color
 * @param {number} spin
 */
function drawVinylPickup(ctx, x, y, r, color, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#14101c';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, (r * i) / 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {number} bob
 */
function drawGrokPortrait(ctx, x, y, size, bob) {
  if (!grokPortrait) return false;
  const crop = grokCrop || {
    x: 0, y: 0,
    w: grokPortrait.naturalWidth || grokPortrait.width,
    h: grokPortrait.naturalHeight || grokPortrait.height,
  };
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const s = size;
  ctx.drawImage(
    grokPortrait,
    crop.x, crop.y, crop.w, crop.h,
    x - s / 2, y - s / 2 + bob, s, s
  );
  ctx.restore();
  return true;
}

const NPC_ACCENTS = {
  orph: '#7b5ea7', simon: '#4a8f7a', honey: '#c45c7a',
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 * @param {string} id
 * @param {number} bob
 */
function drawNpcPortrait(ctx, x, y, scale, id, bob) {
  const accent = NPC_ACCENTS[id] || '#c9a84c';
  const s = scale;
  const px = x - 4 * s;
  const py = y - 8 * s + bob;
  ctx.fillStyle = accent;
  ctx.fillRect(px, py + 3 * s, 8 * s, 10 * s);
  ctx.fillStyle = '#e8c4a8';
  ctx.fillRect(px + s, py, 6 * s, 6 * s);
  ctx.fillStyle = '#1a1028';
  ctx.fillRect(px + 2 * s, py + 2 * s, 4 * s, 2 * s);
  if (id === 'simon') {
    ctx.fillStyle = '#4a8f7a';
    ctx.fillRect(px + 9 * s, py + 4 * s, 3 * s, 5 * s);
  }
  if (id === 'honey') {
    ctx.fillStyle = '#c45c7a';
    ctx.fillRect(px - s, py + 2 * s, 2 * s, 4 * s);
    ctx.fillRect(px + 9 * s, py + 2 * s, 2 * s, 4 * s);
  }
  if (id === 'orph') {
    ctx.fillStyle = '#5a3a6a';
    ctx.fillRect(px + s, py - s, 6 * s, 2 * s);
  }
}

window.HeavyDialogueArt = {
  PAL, FRAMES, drawDialogueSceneBg, drawPixelNinjawhee, drawNpcPortrait,
  drawGrokPortrait, loadGrokPortrait, isGrokPortraitReady, whenGrokPortraitReady,
  drawVinylPickup, playUndertaleBlip,
  emotionForNode, blipPitch, NPC_ACCENTS,
};