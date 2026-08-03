// Passive read: extract images from Grok chat for pixel art assets.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const OUT = '/home/potter/assets';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.connect({
  browserURL: 'http://[::1]:9223',
  protocolTimeout: 60000,
});

const page = (await browser.pages()).find((p) => p.url().includes('grok.com'));
if (!page) {
  console.log('no grok tab');
  process.exit(1);
}

const data = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].map((img) => ({
    src: img.src?.slice(0, 200),
    alt: img.alt,
    w: img.naturalWidth,
    h: img.naturalHeight,
  })).filter((i) => i.w > 40 && i.h > 40);
  const codes = [...document.querySelectorAll('pre code, pre')]
    .map((e) => e.innerText?.trim())
    .filter((t) => t && (t.includes('drawPixel') || t.includes('PAL') || t.length > 300));
  return { url: location.href, imgs, codes: codes.map((c) => c.slice(0, 500)), bodyTail: document.body.innerText.slice(-2000) };
});

console.log('url:', data.url);
console.log('images:', data.imgs.length);
data.imgs.forEach((i, n) => console.log(n, i.w, i.h, i.src?.slice(0, 80)));

// Screenshot grok chat area for manual asset
await page.screenshot({ path: path.join(OUT, 'grok-chat-pixel.png'), fullPage: false });
console.log('screenshot saved');

if (data.codes.length) {
  fs.writeFileSync(path.join(OUT, 'grok-code-snippet.txt'), data.codes.join('\n\n---\n\n'));
}

fs.writeFileSync(path.join(OUT, 'grok-fetch-meta.json'), JSON.stringify(data, null, 2));

// Try download first content image that looks like generated art
const imgPage = page;
const bigImg = data.imgs.find((i) => i.w >= 64 && i.h >= 64 && !i.src?.includes('profile'));
if (bigImg?.src?.startsWith('http')) {
  try {
    const resp = await fetch(bigImg.src);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(path.join(OUT, 'ninjawhee-grok-pixel.png'), buf);
    console.log('downloaded ninjawhee-grok-pixel.png', buf.length);
  } catch (e) {
    console.log('download failed', e.message);
  }
}

await browser.disconnect();