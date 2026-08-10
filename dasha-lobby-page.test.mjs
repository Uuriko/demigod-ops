#!/usr/bin/env node
/**
 * The lobby page, checked where its contents actually exist.
 *
 * Almost nothing on this page is in this page. The chat client is fetched from lobby.getdasha.com
 * and injects its own DOM, so the things worth protecting — that the chat mounts, that it fills the
 * screen, and that the enlarge and transactional controls are gone —
 * are invisible to any check that reads the HTML. The release contract tried to forbid the enlarge
 * button by string and was testing something that could never appear either way.
 *
 * So this runs a browser. Local by default, because the page must be right before it is published.
 *
 *   node dasha-lobby-page.test.mjs           # local source
 *   node dasha-lobby-page.test.mjs --live    # production
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const live = process.argv.includes('--live');
const source = await readFile(new URL('./dasha-lobby-page.html', import.meta.url), 'utf8');
assert.match(source, /lobby\.js';s\.integrity='sha384-[A-Za-z0-9+/=]+';s\.crossOrigin='anonymous'/,
  'Lobby client must be cross-origin pinned');
assert.doesNotMatch(source, /plugin\.jup\.ag|window\.Jupiter|Jupiter\.init/,
  'Lobby must keep the exact Jupiter link instead of executing a mutable swap plugin');

let server, target = 'https://www.getdasha.com/lobby';
if (!live) {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"><title>$dasha lobby</title>`
    + `<style>body{margin:0}</style></head><body>${source}</body></html>`;
  server = createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  target = `http://127.0.0.1:${server.address().port}/`;
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const pages = [];
process.on('exit', () => { try { server?.close(); } catch {} });

for (const [device, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
  const page = await browser.newPage();
  pages.push(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 100)));
  await page.setViewport({ width, height });
  await page.goto(target, { waitUntil: 'networkidle2', timeout: 45000 });
  // The client connects over a websocket and renders when it is ready, not on load.
  await page.waitForFunction(() => document.getElementById('dasha-lobby')?.children.length > 0,
    { timeout: 25000 }).catch(() => {});

  const seen = await page.evaluate(() => {
    const root = document.getElementById('dasha-lobby');
    const log = root?.querySelector('.lobby-log');
    const form = root?.querySelector('.lobby-form');
    const vis = (el) => !!el && !!el.offsetParent;
    return {
      mounted: !!root?.children.length,
      logHeight: log ? Math.round(log.getBoundingClientRect().height) : 0,
      viewport: innerHeight,
      composer: vis(form),
      enlarge: vis(root?.querySelector('.lobby-expand-btn')),
      nfa: vis(root?.querySelector('.lobby-nfa')),
      buyVisible: vis(document.querySelector('.lp-buy')),
      mintVisible: vis(document.querySelector('.lp-mint')),
      horizontalScroll: document.documentElement.scrollWidth > innerWidth + 1,
      text: document.body.innerText,
    };
  });

  assert.ok(seen.mounted, `${device}: the chat did not mount — the page is an empty shell`);
  assert.ok(seen.composer, `${device}: there is nowhere to type`);

  /* Big, which is the entire reason it moved off the homepage. Half the viewport is the floor: below
     that we have rebuilt the cramped box that needed an enlarge button in the first place. */
  const share = seen.logHeight / seen.viewport;
  assert.ok(share > 0.45,
    `${device}: the chat is ${seen.logHeight}px of ${seen.viewport}px (${Math.round(share * 100)}%) — `
    + 'it moved to its own page to be big, and it is not');

  assert.ok(!seen.enlarge, `${device}: the enlarge control is back on a page that is already the chat`);

  assert.ok(!seen.buyVisible, `${device}: a buy control is competing with the chat`);
  assert.ok(!seen.mintVisible, `${device}: duplicated mint chrome is competing with the chat`);

  assert.ok(!seen.horizontalScroll, `${device}: the page scrolls sideways`);

  // Copy the operator removed must not reappear here, including from the client's own strip.
  for (const gone of [/can go to zero/i, /not financial advice/i, /association is not endorsement/i]) {
    assert.ok(!gone.test(seen.text), `${device}: removed copy is visible on the lobby — ${gone.source}`);
  }
  assert.deepEqual(errors, [], `${device}: page errors — ${errors[0] || ''}`);
  console.log(`  ${device.padEnd(8)} chat ${seen.logHeight}px of ${seen.viewport}px `
    + `(${Math.round(share * 100)}%) · buy:${seen.buyVisible} mint:${seen.mintVisible} · enlarge:${seen.enlarge} nfa:${seen.nfa}`);
}

await Promise.all(pages.map((p) => p.close().catch(() => {})));
await browser.disconnect();
if (server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

// The release contract scans shipped HTML, not rendered text. Removed phrases in comments still
// poison live verification, so keep the source clean as well as the visible page.
for (const gone of [/can go to zero/i, /not financial advice/i, /association is not endorsement/i]) {
  assert.ok(!gone.test(source), `removed copy remains in shipped Lobby HTML — ${gone.source}`);
}
console.log(`Dasha lobby page: PASS (${live ? 'live' : 'local'} — mounts, fills the screen, no transactional chrome)`);
