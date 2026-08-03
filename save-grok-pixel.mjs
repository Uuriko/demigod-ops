import puppeteer from 'puppeteer-core';
import fs from 'fs';

const OUT = '/home/potter/assets/ninjawhee-grok-pixel.png';

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const grok = (await browser.pages()).find((p) => p.url().includes('grok.com'));

const handle = await grok.evaluateHandle(() => {
  return [...document.querySelectorAll('img')].find(
    (i) => i.src?.includes('/generated/') && i.naturalWidth >= 256
  );
});

const el = handle.asElement();
if (!el) {
  console.log('no img element');
  process.exit(1);
}

await el.screenshot({ path: OUT });
const size = fs.statSync(OUT).size;
console.log('screenshot element saved', size, 'bytes');

// Write cropped clean portrait (strips Grok chat chrome from bottom)
const CLEAN = '/home/potter/assets/ninjawhee-grok-pixel-clean.png';
const dataUrl = await grok.evaluate(() => {
  const img = [...document.querySelectorAll('img')].find(
    (i) => i.src?.includes('/generated/') && i.naturalWidth >= 256
  );
  if (!img) return null;
  const c = document.createElement('canvas');
  const w = img.naturalWidth;
  const h = img.naturalHeight;
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
  const x0 = Math.max(0, Math.floor((w - side) / 2));
  const out = document.createElement('canvas');
  out.width = side;
  out.height = side;
  out.getContext('2d').drawImage(c, x0, 0, side, side, 0, 0, side, side);
  return out.toDataURL('image/png');
});
if (dataUrl) {
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(CLEAN, Buffer.from(b64, 'base64'));
  console.log('clean crop saved', fs.statSync(CLEAN).size);
}

// Also save small preview for dialogue portrait
const preview = '/home/potter/assets/ninjawhee-grok-portrait.png';
const handle2 = await grok.evaluateHandle(() => {
  return [...document.querySelectorAll('img')].find((i) => i.src?.includes('preview-image'));
});
const el2 = handle2.asElement();
if (el2) {
  await el2.screenshot({ path: preview });
  console.log('preview saved', fs.statSync(preview).size);
}

await browser.disconnect();