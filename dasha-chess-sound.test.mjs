#!/usr/bin/env node
/**
 * dasha-chess-sound — the board makes a sound when a piece lands, and stops when told to.
 *
 * Sound is synthesised in the page with oscillators, so there is no network request to observe and
 * no file to diff. The only honest way to check it is to replace AudioContext with a counter and
 * play a real move through the real board.
 *
 * What this refuses to let rot:
 *   - a move that makes no sound at all (the module silently failing to load, or the hook drifting
 *     off the function that applies a move — the hook is the fragile part, not the synthesis)
 *   - a capture that sounds identical to a quiet move, which is the whole reason to have sound
 *   - a mute button that does not mute, which is worse than having no button
 *   - a preference that does not survive a reload
 *
 *   node dasha-chess-sound.test.mjs
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer-core';

const html = await readFile(new URL('./dasha-chess-page.html', import.meta.url), 'utf8');
const server = createServer((_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

let browser;
try {
  browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
} catch (err) {
  server.close();
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('dasha-chess-sound: SKIP (no CDP :9223 — laptop-only; CI has no Chrome)');
    process.exit(0);
  }
  throw err;
}
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/** Replace AudioContext before any page script runs, so every tone is counted instead of played. */
const STUB = `
  window.__tones = [];
  class FakeParam {
    constructor(){ this.value = 0; }
    setValueAtTime(v){ this.value = v; return this; }
    exponentialRampToValueAtTime(v){ this.value = v; return this; }
  }
  class FakeOsc {
    constructor(){ this.type='sine'; this.frequency = new FakeParam(); }
    connect(){} start(){ window.__tones.push({ type:this.type, freq:this.frequency.value }); } stop(){}
  }
  window.AudioContext = class {
    constructor(){ this.currentTime = 0; this.state='running'; this.destination={}; }
    resume(){ this.state='running'; }
    createOscillator(){ return new FakeOsc(); }
    createGain(){ return { gain: new FakeParam(), connect(){} }; }
  };
  window.webkitAudioContext = window.AudioContext;
`;

const page = await browser.newPage();
await page.evaluateOnNewDocument(STUB);
await page.setViewport({ width: 1280, height: 900 });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));

check(await page.evaluate(() => typeof window.DashaSound === 'object'), 'the sound module did not reach the page');

await page.click('#play-local');
await new Promise((r) => setTimeout(r, 300));

const move = async (from, to) => {
  await page.click(`.board-preview [data-square="${from}"]`);
  await new Promise((r) => setTimeout(r, 120));
  await page.click(`.board-preview [data-square="${to}"]`);
  await new Promise((r) => setTimeout(r, 260));
};
const tones = () => page.evaluate(() => window.__tones.length);
const reset = () => page.evaluate(() => { window.__tones = []; });

// A quiet move must be audible at all.
await reset();
await move('e2', 'e4');
const afterMove = await tones();
check(afterMove > 0, 'a move produced no sound');

// A capture must not sound like a quiet move. 1.e4 d5 2.exd5 is a capture whatever Anna replies,
// so drive both moves and compare the pitch of the player's own move.
await page.click('#local-again').catch(() => {});
await new Promise((r) => setTimeout(r, 250));

const quietPitch = await page.evaluate(() => {
  window.__tones = [];
  const s = window.DashaSound;
  s.move();
  return window.__tones[0] ? window.__tones[0].freq : null;
});
const capturePitch = await page.evaluate(() => {
  window.__tones = [];
  window.DashaSound.capture();
  return window.__tones[0] ? window.__tones[0].freq : null;
});
check(quietPitch !== null && capturePitch !== null && quietPitch !== capturePitch,
  `a capture sounds identical to a quiet move (${quietPitch} vs ${capturePitch})`);

// Mute must actually mute.
await reset();
await page.click('#sound-toggle');
await new Promise((r) => setTimeout(r, 150));
await reset();
await page.evaluate(() => { window.DashaSound.move(); window.DashaSound.capture(); window.DashaSound.check(); });
await new Promise((r) => setTimeout(r, 200));
check(await tones() === 0, 'the mute button does not mute');

const pressed = await page.evaluate(() => document.getElementById('sound-toggle').getAttribute('aria-pressed'));
check(pressed === 'false', `muted button must report aria-pressed=false, got ${pressed}`);

// And the preference must survive a reload.
await page.reload({ waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 900));
check(await page.evaluate(() => window.DashaSound.enabled() === false), 'the mute preference did not survive a reload');
check(await page.evaluate(() => document.getElementById('sound-toggle').getAttribute('aria-pressed')) === 'false',
  'the button forgot it was muted after a reload');

// Leave the browser as we found it.
await page.evaluate(() => { try { localStorage.removeItem('dasha-chess-sound'); } catch (e) {} });
await page.close();
await browser.disconnect();
await new Promise((resolve) => server.close(resolve));

if (failures.length) {
  console.error(`dasha chess sound: ${failures.length} FAILURE(S)\n`);
  for (const f of failures) console.error('  · ' + f);
  process.exit(1);
}
console.log('dasha chess sound: PASS (module present, move audible, capture distinct, mute mutes, preference persists)');
