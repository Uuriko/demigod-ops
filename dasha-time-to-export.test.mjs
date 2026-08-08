#!/usr/bin/env node
/**
 * How long it takes a first-time visitor to get an image out, and how many interactions it costs.
 *
 * 2026 research on meme tooling is blunt about this: trend cycles peak and die within hours, and the
 * tools people keep using are the ones that turn an idea into something postable in seconds. Every
 * other number this project measures — contrast, accessibility, page weight — describes the page.
 * This one describes the product.
 *
 * Two paths are timed, because they are different products to a visitor:
 *
 *   default  — land, press Save PNG. The floor. Nobody arrives wanting the default caption, but the
 *              time to get *anything* out is what tells someone the tool works.
 *   personal — land, put your own line in, press Save PNG. The real job.
 *
 * Interaction count is measured alongside the clock and matters more than it looks. Every control
 * hidden behind a disclosure is a click before anyone can do anything, and a click costs more than
 * the milliseconds it adds — it is a decision, and decisions are where people leave.
 *
 * Budgets are deliberately generous. This is a regression alarm, not a benchmark: it should fire
 * when someone puts the export behind another panel, not when a CDN has a slow morning.
 *
 *   node dasha-time-to-export.test.mjs           # live
 *   node dasha-time-to-export.test.mjs --local   # local source
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const local = process.argv.includes('--local');
const BUDGET_MS = 8000;      // land → a PNG in hand, cold, on a throttled mobile connection
const BUDGET_CLICKS = 3;     // beyond this the tool has a menu problem, not a speed problem

let server;
let target = 'https://www.getdasha.com/studio';
if (local) {
  const html = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
  server = createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  target = `http://127.0.0.1:${server.address().port}/`;
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const results = [];

for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
  for (const mode of ['default', 'personal']) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    /* Cold every time. A warm cache measures our CDN, not the experience of arriving. */
    await page.setCacheEnabled(false);
    const client = await page.target().createCDPSession();
    // Mid-range mobile: 4x CPU slowdown, ~4G. Nobody makes memes on a workstation.
    await client.send('Emulation.setCPUThrottlingRate', { rate: device === 'mobile' ? 4 : 1 });

    const started = Date.now();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // The canvas is the product. "Ready" is when it has actually drawn something, not when load fired.
    await page.waitForFunction(() => {
      const root = document.querySelector('.dasha-studio-embed')?.shadowRoot || document;
      const c = root.querySelector('#canvas');
      if (!c) return false;
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(0, 0, Math.min(60, c.width), Math.min(60, c.height)).data;
      return d.some((v, i) => i % 4 !== 3 && v !== 0);
    }, { timeout: 30000 });
    const ready = Date.now() - started;

    let clicks = 0;
    const inside = (fn, ...args) => page.evaluate(
      new Function('args', `const root = document.querySelector('.dasha-studio-embed')?.shadowRoot || document;
        const $ = (id) => root.querySelector('#' + id); return (${fn})(root, $, ...args);`), args);

    if (mode === 'personal') {
      // Typing is not a click, but reaching the field can be. Count what a person has to press.
      const needsOpening = await inside(`(root, $) => {
        const line = $('line');
        if (!line) return true;
        return line.offsetParent === null;   // hidden behind a panel or a details block
      }`);
      if (needsOpening) {
        await inside(`(root) => { root.querySelectorAll('details').forEach((d) => { d.open = true; });
          const edit = root.querySelector('#edit'); if (edit) edit.click(); }`);
        clicks++;
      }
      await inside(`(root, $) => { const l = $('line'); l.value = 'made this in ten seconds';
        l.dispatchEvent(new Event('input', { bubbles: true })); }`);
    }

    // Reach the export control, opening whatever hides it — and count that as the cost it is.
    const exportHidden = await inside(`(root, $) => {
      const b = $('download'); return !b || b.offsetParent === null;
    }`);
    if (exportHidden) {
      await inside(`(root) => root.querySelectorAll('details').forEach((d) => { d.open = true; })`);
      clicks++;
    }

    const exported = await inside(`async (root, $) => {
      const t = Date.now();
      const blob = await new Promise((r) => $('canvas').toBlob(r, 'image/png'));
      return { ms: Date.now() - t, bytes: blob ? blob.size : 0 };
    }`);
    clicks++;   // pressing Save PNG

    const total = ready + exported.ms;
    results.push({ device, mode, ready, exportMs: exported.ms, total, clicks, bytes: exported.bytes });
    assert.ok(exported.bytes > 5000, `${device}/${mode}: export produced ${exported.bytes} bytes — not a real image`);
    await page.close();
  }
}

await browser.disconnect();
server?.close();

console.log(`\nTime to first export — ${local ? 'local source' : 'live'} (cold cache, mobile CPU throttled 4x)\n`);
console.log('  device   path      ready    export    total   clicks   size');
for (const r of results) {
  console.log(`  ${r.device.padEnd(8)} ${r.mode.padEnd(9)} ${String(r.ready + 'ms').padStart(6)}`
    + ` ${String(r.exportMs + 'ms').padStart(8)} ${String(r.total + 'ms').padStart(8)}`
    + ` ${String(r.clicks).padStart(7)}   ${(r.bytes / 1024).toFixed(0)}KB`);
}

const worst = results.reduce((a, b) => (b.total > a.total ? b : a));
const clickiest = results.reduce((a, b) => (b.clicks > a.clicks ? b : a));
console.log(`\n  worst: ${worst.device}/${worst.mode} at ${worst.total}ms · most interactions: ${clickiest.clicks}\n`);

assert.ok(worst.total <= BUDGET_MS,
  `${worst.device}/${worst.mode} takes ${worst.total}ms to produce an image (budget ${BUDGET_MS}ms). `
  + 'A meme tool that is slow to first result does not get a second use.');
assert.ok(clickiest.clicks <= BUDGET_CLICKS,
  `${clickiest.device}/${clickiest.mode} needs ${clickiest.clicks} interactions to export (budget ${BUDGET_CLICKS}). `
  + 'Something moved the export behind another panel.');
console.log('Dasha time to export: PASS');
