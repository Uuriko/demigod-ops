#!/usr/bin/env node
/**
 * Real contrast, measured against the pixels actually behind the text.
 *
 * axe reports zero colour-contrast violations on all three routes — and that is not the same as the
 * text being readable. Automated checkers compare two declared colours; they skip text over
 * gradients and images entirely, which is the single most common way a design fails contrast. Every
 * Dasha surface puts type over radial gradients, so the one number nobody had was the real one.
 *
 * Method: for each visible text element, read its computed colour, make the text transparent so the
 * background is exposed, screenshot that element's box, then compute contrast against the WORST
 * pixel under it — not the average, because WCAG is a floor, not a mean.
 *
 * Thresholds are WCAG AA: 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px bold).
 *
 *   node dasha-contrast.test.mjs             # live routes
 *   node dasha-contrast.test.mjs --local     # local sources instead
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const local = process.argv.includes('--local');
const srgb = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * srgb(r / 255) + 0.7152 * srgb(g / 255) + 0.0722 * srgb(b / 255);
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const parseRGB = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

let servers = [];
async function serve(file) {
  const html = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
  const server = createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}/`;
}

const targets = local
  ? [['home', await serve('dasha-landing.html')], ['studio', await serve('dasha-meme-studio.html')]]
  : [['home', 'https://www.getdasha.com/'], ['studio', 'https://www.getdasha.com/studio'], ['desk', 'https://www.getdasha.com/dasha']];

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const findings = [];

for (const [name, url] of targets) {
  for (const [device, w, h] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));

    const items = await page.evaluate(() => {
      const out = [];
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot);
          const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
          if (!direct) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight * 3) continue;
          const size = parseFloat(cs.fontSize);
          const bold = Number(cs.fontWeight) >= 700;
          out.push({
            text: el.textContent.trim().slice(0, 34),
            color: cs.color,
            size, bold,
            large: size >= 24 || (bold && size >= 18.66),
            box: { x: Math.max(0, r.x), y: Math.max(0, r.y), w: Math.min(r.width, 1600), h: Math.min(r.height, 400) },
          });
        }
      };
      walk(document);
      return out.slice(0, 60);
    });

    for (const item of items) {
      // Expose the background: hide the glyphs, keep the layout.
      await page.evaluate((t) => {
        const all = [...document.querySelectorAll('*')].flatMap((e) => (e.shadowRoot ? [e, ...e.shadowRoot.querySelectorAll('*')] : [e]));
        const el = all.find((e) => e.textContent.trim().slice(0, 34) === t);
        if (el) { el.dataset.dashaPrev = el.style.color; el.style.color = 'transparent'; }
      }, item.text);

      let worst = Infinity, worstPx = null;
      try {
        const shot = await page.screenshot({
          clip: { x: item.box.x, y: item.box.y, width: Math.max(4, item.box.w), height: Math.max(4, item.box.h) },
          encoding: 'base64',
        });
        const px = await page.evaluate(async (b64) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          const d = c.getContext('2d').getImageData(0, 0, img.width, img.height).data;
          const out = [];
          const step = Math.max(4, Math.floor(d.length / 4 / 400)) * 4;
          for (let i = 0; i < d.length; i += step) out.push([d[i], d[i + 1], d[i + 2]]);
          return out;
        }, shot);
        const fg = parseRGB(item.color);
        for (const bg of px) {
          const r = ratio(fg, bg);
          if (r < worst) { worst = r; worstPx = bg; }
        }
      } catch { worst = Infinity; }

      await page.evaluate((t) => {
        const all = [...document.querySelectorAll('*')].flatMap((e) => (e.shadowRoot ? [e, ...e.shadowRoot.querySelectorAll('*')] : [e]));
        const el = all.find((e) => e.textContent.trim().slice(0, 34) === t);
        if (el) el.style.color = el.dataset.dashaPrev || '';
      }, item.text);

      const need = item.large ? 3 : 4.5;
      if (worst < need) {
        findings.push({ route: name, device, text: item.text, color: item.color, size: Math.round(item.size), need, got: worst, bg: worstPx });
      }
    }
    console.log(`${name.padEnd(7)} ${device.padEnd(8)} checked ${items.length} text nodes`);
    await page.close();
  }
}

await browser.disconnect();
for (const s of servers) { s.closeAllConnections?.(); s.close(); }

if (findings.length) {
  console.error(`\n${findings.length} text element(s) below WCAG AA against the worst pixel behind them:\n`);
  for (const f of findings.sort((a, b) => a.got - b.got)) {
    console.error(`  ${f.got.toFixed(2)}:1 (needs ${f.need}:1)  ${f.route}/${f.device}  ${f.size}px  ${f.color} on rgb(${f.bg})\n      "${f.text}"`);
  }
  process.exit(1);
}
console.log('\nDasha contrast: PASS (every text node clears WCAG AA against the worst pixel behind it)');
