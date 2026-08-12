/**
 * Tiny pure-JS OG card for Studio handoffs (no deps).
 * 1200×628 RGB PNG: ink field, acid bar, line + look/format.
 */
/* Half-res card keeps pure store-deflate under ~600KB while staying OG-legible. */
const W = 600;
const H = 314;

// 5×7 uppercase-ish glyphs (bits row-major). Space + A–Z + 0–9 + $ + a few.
const FONT = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0e],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x1f],
  J: [0x01, 0x01, 0x01, 0x01, 0x11, 0x11, 0x0e],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  0: [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  1: [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  2: [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  3: [0x1f, 0x01, 0x02, 0x06, 0x01, 0x11, 0x0e],
  4: [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  5: [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  6: [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  7: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  8: [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  9: [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ',': [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "'": [0x0c, 0x0c, 0x08, 0x00, 0x00, 0x00, 0x00],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '·': [0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00],
};

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = data.length;
  const out = new Uint8Array(8 + len + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, len);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crcBuf = out.subarray(4, 8 + len);
  view.setUint32(8 + len, crc32(crcBuf));
  return out;
}
function deflateStore(raw) {
  // zlib wrapper + stored deflate blocks (no compression)
  const blocks = [];
  let offset = 0;
  while (offset < raw.length) {
    const size = Math.min(65535, raw.length - offset);
    const last = offset + size >= raw.length ? 1 : 0;
    const block = new Uint8Array(5 + size);
    block[0] = last;
    block[1] = size & 0xff;
    block[2] = (size >> 8) & 0xff;
    block[3] = ~size & 0xff;
    block[4] = (~size >> 8) & 0xff;
    block.set(raw.subarray(offset, offset + size), 5);
    blocks.push(block);
    offset += size;
  }
  const bodyLen = blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(2 + bodyLen + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let p = 2;
  for (const b of blocks) {
    out.set(b, p);
    p += b.length;
  }
  // Adler-32 of raw
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < raw.length; i++) {
    s1 = (s1 + raw[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler = ((s2 << 16) | s1) >>> 0;
  const view = new DataView(out.buffer);
  view.setUint32(out.length - 4, adler);
  return out;
}

function fillRect(px, x0, y0, w, h, r, g, b) {
  for (let y = y0; y < y0 + h && y < H; y++) {
    if (y < 0) continue;
    for (let x = x0; x < x0 + w && x < W; x++) {
      if (x < 0) continue;
      const i = (y * W + x) * 3;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  }
}

function drawChar(px, ch, x, y, scale, r, g, b) {
  const glyph = FONT[ch] || FONT[ch.toUpperCase()] || FONT['?'];
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if (bits & (0x10 >> col)) {
        fillRect(px, x + col * scale, y + row * scale, scale, scale, r, g, b);
      }
    }
  }
}

function drawText(px, text, x, y, scale, r, g, b, maxWidth) {
  let cx = x;
  const step = 6 * scale;
  for (const ch of text) {
    if (maxWidth && cx + step > x + maxWidth) break;
    drawChar(px, ch, cx, y, scale, r, g, b);
    cx += step;
  }
  return cx;
}

function wrapWords(text, maxChars) {
  const words = String(text || '').toUpperCase().replace(/[^\w$.,!?' ·-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

export async function handoffOgPng(state = {}) {
  const px = new Uint8Array(W * H * 3);
  // ink background
  fillRect(px, 0, 0, W, H, 7, 6, 8);
  // violet / hot glows (block approximations)
  fillRect(px, 700, 0, 500, 280, 40, 25, 70);
  fillRect(px, 0, 400, 420, 228, 55, 20, 40);
  // acid bottom bar
  fillRect(px, 0, H - 40, W, 40, 223, 255, 0);
  // kicker
  drawText(px, 'YOUR TURN  ·  $DASHA', 24, 20, 2, 223, 255, 0, 560);
  const look = String(state.look || 'poster').toUpperCase();
  const format = String(state.format || 'square').toUpperCase();
  drawText(px, `${look}  ·  ${format}`, 24, 48, 2, 230, 220, 196, 560);
  // line
  const lines = wrapWords(state.line || 'MAKE ONE', 18);
  let ly = 90;
  for (const line of lines) {
    drawText(px, line, 24, ly, 5, 244, 237, 219, 560);
    ly += 5 * 8 + 10;
  }
  // footer on acid bar
  drawText(px, 'GETDASHA.COM  ·  OPEN  ·  CHANGE ONE THING', 24, H - 28, 2, 7, 6, 8, 560);

  // PNG scanlines: filter 0 + RGB
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1);
    raw[row] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), row + 1);
  }
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, W);
  ihdrView.setUint32(4, H);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const compressed = await zlibDeflate(raw);
  const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', new Uint8Array(0))];
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function zlibDeflate(raw) {
  if (typeof CompressionStream === 'function') {
    try {
      const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch { /* fall through */ }
  }
  return deflateStore(raw);
}

export const HANDOFF_OG_WIDTH = W;
export const HANDOFF_OG_HEIGHT = H;
