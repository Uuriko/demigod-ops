#!/usr/bin/env node
/**
 * The lobby page, checked where its contents actually exist.
 *
 * Almost nothing on this page is in this page. The chat client is fetched from lobby.getdasha.com
 * and injects its own DOM, so the things worth protecting — that the chat mounts, that it fills the
 * screen, that the enlarge control is gone, that buying is reachable from inside the conversation —
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
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

let server, target = 'https://www.getdasha.com/lobby';
if (!live) {
  const frag = await readFile(new URL('./dasha-lobby-page.html', import.meta.url), 'utf8');
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"><title>$dasha lobby</title>`
    + `<style>body{margin:0}</style></head><body>${frag}</body></html>`;
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
    const buy = document.querySelector('.lp-buy');
    const vis = (el) => !!el && !!el.offsetParent;
    return {
      mounted: !!root?.children.length,
      logHeight: log ? Math.round(log.getBoundingClientRect().height) : 0,
      viewport: innerHeight,
      composer: vis(form),
      enlarge: vis(root?.querySelector('.lobby-expand-btn')),
      nfa: vis(root?.querySelector('.lobby-nfa')),
      buyVisible: vis(buy),
      buyHeight: buy ? Math.round(buy.getBoundingClientRect().height) : 0,
      buyHref: buy?.getAttribute('href') || '',
      buyAboveFold: buy ? buy.getBoundingClientRect().top < innerHeight : false,
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

  /* Buying from inside the conversation is the Phantom idea this page borrows: you are already
     talking about the coin, so the thing to do about it should not be a page away. It must be
     visible without scrolling, a real touch target, and a genuine link even before any script runs. */
  assert.ok(seen.buyVisible, `${device}: no buy control in the chat`);
  assert.ok(seen.buyAboveFold, `${device}: the buy control is below the fold`);
  assert.ok(seen.buyHeight >= 44, `${device}: the buy control is ${seen.buyHeight}px, under the 44px touch target`);
  assert.ok(seen.buyHref.includes('jup.ag/swap') && seen.buyHref.includes(MINT),
    `${device}: the buy control is not a real Jupiter link carrying our mint — a dead click if the plugin fails`);

  assert.ok(!seen.horizontalScroll, `${device}: the page scrolls sideways`);

  // Copy the operator removed must not reappear here, including from the client's own strip.
  for (const gone of [/can go to zero/i, /not financial advice/i, /association is not endorsement/i]) {
    assert.ok(!gone.test(seen.text), `${device}: removed copy is visible on the lobby — ${gone.source}`);
  }
  assert.ok(seen.text.includes('check it before you buy') || /verify/i.test(seen.text),
    `${device}: the anti-scam guidance is gone — that one we keep`);

  assert.deepEqual(errors, [], `${device}: page errors — ${errors[0] || ''}`);
  console.log(`  ${device.padEnd(8)} chat ${seen.logHeight}px of ${seen.viewport}px `
    + `(${Math.round(share * 100)}%) · buy ${seen.buyHeight}px above the fold · enlarge:${seen.enlarge} nfa:${seen.nfa}`);
}

await Promise.all(pages.map((p) => p.close().catch(() => {})));
await browser.disconnect();
server?.close();
console.log(`Dasha lobby page: PASS (${live ? 'live' : 'local'} — mounts, fills the screen, no enlarge control, buy reachable in-chat)`);
