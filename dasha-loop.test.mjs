#!/usr/bin/env node
/**
 * The handoff, tested against production.
 *
 * The roadmap's whole experiment is whether editable state survives being passed between people:
 * someone makes an image, sends a link, and the person who opens it lands in the same tool with the
 * same thing loaded and can change one thing. Every other gate checks that the Studio draws. None of
 * them checks that the loop closes, and none of them checks it on the deployed build — which today
 * is a different build from the source in this repo.
 *
 * So this makes something, takes the link the way a person would (whatever control the live build
 * offers), opens that link cold in a second page, and asserts the state came back. Deliberately
 * agnostic about which build is live: it stubs the clipboard and the share sheet and uses whichever
 * of them the page actually wires up, because the two source trees disagree about the buttons and
 * the loop has to work either way.
 *
 *   node dasha-loop.test.mjs            # live
 *   node dasha-loop.test.mjs --local    # local source
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const local = process.argv.includes('--local');
const LINE = 'the loop closed at ' + process.pid;   // distinctive, so a stale page cannot fake a pass

let server, target = 'https://www.getdasha.com/studio';
if (local) {
  const html = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
  server = createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  target = `http://127.0.0.1:${server.address().port}/`;
}

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });

/* Both trees put the Studio in a shadow root on the live site and in the document locally, so every
   lookup goes through the same resolver rather than assuming one shape. */
const inside = (page, fn, ...args) => page.evaluate(
  new Function('args', `const root = document.querySelector('.dasha-studio-embed')?.shadowRoot || document;
    const $ = (id) => root.querySelector('#' + id); return (${fn})(root, $, ...args);`), args);

const maker = await browser.newPage();
await maker.setViewport({ width: 1280, height: 900 });
await maker.goto(target, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise((r) => setTimeout(r, 2500));

// Capture whatever the page tries to hand off, however it tries to hand it off.
await maker.evaluate(() => {
  window.__handoff = [];
  const remember = (v) => { if (typeof v === 'string') window.__handoff.push(v); };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (v) => { remember(v); return Promise.resolve(); },
             write: (items) => { window.__handoff.push('[clipboard-item]'); return Promise.resolve(); } },
  });
  navigator.share = (data) => { remember(data?.url); remember(data?.text); return Promise.resolve(); };
  navigator.canShare = () => true;
});

await inside(maker, `(root, $) => {
  root.querySelectorAll('details').forEach((d) => { d.open = true; });
  const edit = $('edit'); if (edit && $('line') && $('line').offsetParent === null) edit.click();
}`);
await inside(maker, `(root, $, line) => {
  const box = $('line');
  box.value = line;
  box.dispatchEvent(new Event('input', { bubbles: true }));
}`, LINE);
await new Promise((r) => setTimeout(r, 600));

const madeBytes = await inside(maker, `async (root, $) => {
  const blob = await new Promise((r) => $('canvas').toBlob(r, 'image/png'));
  return blob.size;
}`);
assert.ok(madeBytes > 5000, `the Studio did not draw the edited image (${madeBytes} bytes)`);

/* Whichever handoff control this build ships. The standalone copy-link button was removed by
   operator decision, so share is the path that must always work; remix is tried too, because the
   deployed build still has it and a loop that only works on one tree is not a working loop. */
const controls = await inside(maker, `(root, $) => ['remix', 'share', 'copy']
  .filter((id) => $(id) && $(id).offsetParent !== null)`);
assert.ok(controls.length, 'the Studio offers no way to hand anything on');

for (const id of controls) {
  await inside(maker, `(root, $, id) => $(id).click()`, id);
  await new Promise((r) => setTimeout(r, 900));
}

const handoffs = await maker.evaluate(() => window.__handoff);
const link = handoffs.find((v) => /#.*look=|#.*line=/.test(v || ''));
assert.ok(link, `no editable link was handed off. Controls tried: ${controls.join(', ')}. `
  + `Captured: ${JSON.stringify(handoffs).slice(0, 200)}`);
assert.ok(!new URL(link).search, 'the handoff link puts state in the query string, where the server sees it');

// ---- the other side of the handoff -----------------------------------------
const receiver = await browser.newPage();
await receiver.setViewport({ width: 1280, height: 900 });
const openAs = local ? target + new URL(link).hash : link;
await receiver.goto(openAs, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise((r) => setTimeout(r, 2500));

const landed = await inside(receiver, `(root, $) => ({
  line: $('line') ? $('line').value : null,
  look: $('looks') && $('looks').selectedOptions ? $('looks').selectedOptions[0]?.textContent.trim() : null,
})`);
assert.equal(landed.line, LINE,
  `the receiver did not get the line. Sent "${LINE}", got "${landed.line}". The handoff link is decorative.`);

const receivedBytes = await inside(receiver, `async (root, $) => {
  const blob = await new Promise((r) => $('canvas').toBlob(r, 'image/png'));
  return blob.size;
}`);
assert.ok(receivedBytes > 5000, `the receiver rendered nothing usable (${receivedBytes} bytes)`);

/* And the receiver can change it and pass it on again. One generation proves a link; two prove a
   loop, which is the thing actually being tested. */
await inside(receiver, `(root, $) => {
  const box = $('line');
  box.value = box.value + ' — and again';
  box.dispatchEvent(new Event('input', { bubbles: true }));
}`);
await new Promise((r) => setTimeout(r, 500));
const secondGen = await inside(receiver, `async (root, $) => {
  const blob = await new Promise((r) => $('canvas').toBlob(r, 'image/png'));
  return blob.size;
}`);
assert.ok(secondGen > 5000 && secondGen !== receivedBytes,
  'the receiver could not materially change what it received — the chain stops at one generation');

await maker.close();
await receiver.close();
await browser.disconnect();
server?.close();

console.log(`Dasha loop: PASS (${local ? 'local' : 'live'} — made, handed off via ${controls.join('/')}, `
  + `reopened cold with the line intact, and changed again)`);
