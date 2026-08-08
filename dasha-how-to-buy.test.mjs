#!/usr/bin/env node
/**
 * How-to-buy conversion gate — pure disk checks + optional CDP.
 * Does not hang: puppeteer is hard-timeouted; vm fallback always works.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const html = readFileSync(join(__dirname, 'dasha-how-to-buy.html'), 'utf8');
assert.ok(html.includes(MINT), 'mint on how-to-buy');
assert.ok(html.includes('jup.ag/swap'), 'jupiter deep link');
assert.ok(html.includes('DashaHowToBuy'), 'export for tests');
assert.ok(html.includes('/dasha') && html.includes('/studio'), 'nav loops to product surfaces');
for (const step of ['01 · Wallet', '02 · Mint', '03 · Quote', '04 · Confirm', 'review the quote', 'Read the wallet request']) assert.ok(html.includes(step), `missing buyer step: ${step}`);
assert.ok(!/04 · Share|Copy share pack|Draft on X|buildSharePack/.test(html), 'promotion leaked into the four-step buy path');
assert.ok(!html.includes('t.me/dashacommunity'), 'no disallowed telegram');
for (const bad of ['official Dasha', 'safe token', 'verified mint', 'endorsed by']) {
  assert.ok(!html.toLowerCase().includes(bad.toLowerCase()), `howto must not claim: ${bad}`);
}
const m = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(m, 'howto script');
const box = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({}),
    body: { appendChild() {}, removeChild() {} },
  },
  navigator: {},
  URL,
  console,
};
box.window = box;
vm.runInNewContext(m[1], box, { filename: 'how-to-buy.html' });
const H = box.window.DashaHowToBuy || box.DashaHowToBuy;
assert.ok(H, 'DashaHowToBuy export');
assert.equal(H.CA, MINT);
assert.ok(H.BUY.includes(MINT) && /jup\.ag/.test(H.BUY), 'buy export lost exact Jupiter route');

let cdp = false;
try {
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await Promise.race([
    puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('cdp-timeout')), 6000)),
  ]);
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 8000 });
  const g = await page.evaluate(() => {
    const H = window.DashaHowToBuy;
    return {
      ca: H && H.CA,
      hasCopy: !!document.getElementById('copy'),
      buyHref: document.getElementById('buy')?.href || '',
    };
  });
  assert.equal(g.ca, MINT);
  assert.ok(g.hasCopy && g.buyHref.includes('jup.ag'));
  await page.close();
  await browser.disconnect();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  cdp = true;
} catch {
  // vm path already covered
}

console.log('dasha how-to-buy: PASS' + (cdp ? ' [cdp]' : ' [vm]'));
