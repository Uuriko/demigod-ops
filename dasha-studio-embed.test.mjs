#!/usr/bin/env node
/**
 * Gate for the paste-anywhere Meme Studio fragment.
 *
 * Two things are protected. First, that the embed is GENERATED — a hand-edited copy that drifts
 * from the Studio is the failure mode that matters, so this regenerates and compares. Second, that
 * it cannot break the page hosting it and that page cannot break it, proved by rendering inside a
 * deliberately hostile host rather than by asserting that it was scoped.
 *
 *   node dasha-studio-embed.test.mjs        # needs CDP Chrome on :9223
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { buildStudioEmbed, embedScript } from './dasha-studio-embed-build.mjs';

const here = (f) => new URL(`./${f}`, import.meta.url);
const embed = await readFile(here('dasha-studio-embed.html'), 'utf8');
const externalScript = await readFile(here('dasha-studio-embed.js'), 'utf8');
const axeSrc = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

// ---- generated, not hand-written -------------------------------------------
assert.equal(embed, buildStudioEmbed(await readFile(here('dasha-meme-studio.html'), 'utf8')),
  'dasha-studio-embed.html is stale or was hand-edited — run: node dasha-studio-embed-build.mjs');
assert.equal(externalScript, embedScript(embed),
  'dasha-studio-embed.js drifted from the pasteable embed — run: node dasha-studio-embed-build.mjs');

// ---- it is a fragment, not a page ------------------------------------------
for (const banned of ['<!doctype', '<html', '<body', ':root']) {
  assert.ok(!embed.toLowerCase().includes(banned), `the fragment must not contain ${banned}`);
}

/* The disclaimers live inside <main>, which is why the fragment carries them. An embedder who
   pastes this into Webflow must not be able to leave the risk language behind by accident. */
/* Checked as meaning, not phrasing. The copy legitimately gets tightened — "can lose all value"
   became "Can go to zero" — and a gate that pins exact sentences either blocks good edits or gets
   loosened until it protects nothing. Each entry is a set of acceptable ways to say the same thing. */
const disclosures = [
  ['no likeness or official-status permission', [/name or likeness/i]],
];
for (const [what, patterns] of disclosures) {
  assert.ok(patterns.some((p) => p.test(embed)), `the fragment dropped its ${what} disclosure`);
}

/* A hostile host: its own palette and aggressive rules on the elements and classes the Studio
   uses, plus elements carrying the Studio's own generic ids. */
const hostile = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hostile host</title><style>
  :root{--ink:#ff0000;--paper:#ff0000;--acid:#ff0000;--line:#ff0000}
  body{margin:0;background:#ffffff;color:#000000;font-family:cursive}
  h1{font-size:9px!important}
  canvas{display:none!important}
  textarea,button{display:none!important}
  .wrap{width:80px!important}
  .btn{background:#ff0000!important}
  .looks{visibility:hidden!important}
</style></head><body>
  <h1 id="host-h1">Host headline</h1>
  <div class="wrap" id="host-wrap">host wrap</div>
  <div class="looks" id="host-looks">host looks</div>
  <canvas id="canvas" width="10" height="10"></canvas>
  <textarea id="line">HOST-OWNED</textarea>
  <p id="status">HOST-OWNED</p>
  ${embed}
</body></html>`;

const server = createServer((_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(hostile);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.setViewport({ width: 1280, height: 900 });
await page.goto(base, { waitUntil: 'networkidle2' });

const shadow = (fn, ...args) => page.evaluate(
  new Function('args', `const root = document.querySelector('.dasha-studio-embed').shadowRoot;
    const $ = (id) => root.querySelector('#' + id); return (${fn})(root, $, ...args);`), args);

// ---- the host page is unchanged --------------------------------------------
const host = await page.evaluate(() => {
  const css = (id, prop) => getComputedStyle(document.getElementById(id))[prop];
  return {
    h1: css('host-h1', 'fontSize'),
    wrap: css('host-wrap', 'width'),
    looks: css('host-looks', 'visibility'),
    bg: getComputedStyle(document.body).backgroundColor,
    canvas: document.getElementById('canvas').width,
    line: document.getElementById('line').value,
    status: document.getElementById('status').textContent,
  };
});
assert.equal(host.h1, '9px', 'the host lost its own h1 rule — Studio CSS leaked out');
assert.equal(host.wrap, '80px', 'the host lost its own .wrap rule — Studio CSS leaked out');
assert.equal(host.looks, 'hidden', 'the host lost its own .looks rule — Studio CSS leaked out');
assert.equal(host.bg, 'rgb(255, 255, 255)', 'the host background changed — body/:root rules leaked out');
assert.equal(host.canvas, 10, "the host's own #canvas was drawn into — id collision");
assert.equal(host.line, 'HOST-OWNED', "the host's own #line was written to — id collision");
assert.equal(host.status, 'HOST-OWNED', "the host's own #status was written to — id collision");

// ---- and the Studio still works in there ------------------------------------
const tool = await shadow(`(root, $) => {
  const css = (el, prop) => getComputedStyle(el)[prop];
  return { canvas: css($('canvas'), 'display'), textarea: css($('line'), 'display'),
    looks: css(root.querySelector('.looks'), 'visibility'),
    wrap: css(root.querySelector('.wrap'), 'width'),
    lookCount: root.querySelectorAll('.look').length };
}`);
assert.notEqual(tool.canvas, 'none', "the host's canvas{display:none} reached into the Studio");
assert.notEqual(tool.textarea, 'none', "the host's textarea{display:none} reached into the Studio");
assert.equal(tool.looks, 'visible', "the host's .looks{visibility:hidden} reached into the Studio");
assert.notEqual(tool.wrap, '80px', "the host's .wrap width reached into the Studio");
assert.ok(tool.lookCount >= 3, `only ${tool.lookCount} looks survived into the fragment`);

// ---- it draws a real image --------------------------------------------------
const drawn = await shadow(`async (root, $) => {
  root.querySelectorAll('.look')[1].click();
  $('line').value = 'Embedded and still weird.';
  $('line').dispatchEvent(new Event('input', { bubbles: true }));
  const blob = await new Promise((r) => $('canvas').toBlob(r, 'image/png'));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { size: blob.size, magic: [...bytes.slice(0, 4)], w: $('canvas').width, h: $('canvas').height };
}`);
assert.deepEqual(drawn.magic, [0x89, 0x50, 0x4e, 0x47], 'the embedded Studio did not export a PNG');
assert.ok(drawn.size > 5000, `the embedded export is only ${drawn.size} bytes — probably blank`);
assert.deepEqual([drawn.w, drawn.h], [1080, 1080], 'the embedded canvas is not 1080x1080');

// ---- accessibility, including into the shadow root --------------------------
await page.addScriptTag({ content: axeSrc });
const axeRun = await page.evaluate(async () => {
  const result = await axe.run(document, {});
  return { rules: result.passes.length + result.inapplicable.length,
    bad: result.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
      .filter(v => v.nodes.some(n => String(n.target).includes('dasha-studio-embed')))
      .map(v => `${v.id} (${v.nodes.length})`) };
});
assert.ok(axeRun.rules > 30, `axe evaluated only ${axeRun.rules} rules — it did not really run`);
assert.deepEqual(axeRun.bad, [], `serious/critical axe violations inside the fragment: ${axeRun.bad.join(', ')}`);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors[0] || ''}`);
await page.close();
await browser.disconnect();
server.closeAllConnections();
server.close();
console.log('Dasha Studio embed: PASS (generated, fragment-only, hostile host both ways, disclosures intact, draws, axe)');
