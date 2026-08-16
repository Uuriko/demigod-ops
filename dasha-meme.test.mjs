#!/usr/bin/env node
/**
 * The fast meme path, checked where it actually breaks.
 *
 * The old Studio's numbers are the spec: 800 opens, 298 first edits, 29 exports. So the failures
 * worth a gate are the ones that keep a picture off the canvas or the canvas off someone's phone —
 * not styling. Every assertion here corresponds to a way the page loads fine and is still useless.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(ROOT, 'dasha-meme.html'), 'utf8');

// A grid of 404s is the one failure that still looks like a working page.
const listed = html.match(/var TEMPLATES = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
assert.ok(listed.length >= 6, 'template strip needs enough pictures to be worth scrolling');
for (const name of listed) {
  assert.ok(
    existsSync(path.join(ROOT, 'dasha-worker-assets/simp/photo', `${name}.jpg`)),
    `template "${name}" is listed but no such file ships in dasha-worker-assets/simp/photo`,
  );
}

// crossOrigin is load-bearing: without it a remote template taints the canvas and toBlob throws,
// so Share fails only for the people who picked a template — i.e. almost everyone.
assert.match(html, /crossOrigin = 'anonymous'/, 'remote templates must be CORS-loaded or Share dies on tainted canvas');

// Share needs a real fallback. Desktop support for files is poor; download is the desktop path.
assert.match(html, /navigator\.canShare/, 'must feature-detect before sharing');
assert.match(html, /a\.download = 'dasha-meme\.png'/, 'must fall back to download when Share is unavailable');

// Bring-your-own-image keeps the tool usable even when the template host is down or unpublished.
assert.match(html, /type="file"/, 'must accept the user\'s own picture');
assert.match(html, /addEventListener\('paste'/, 'paste is the fastest path on desktop');

// Attribution is the only reason a shared meme sends anyone back.
assert.match(html, /\$dasha · getdasha\.com/, 'rendered meme must carry the mark');

// The honesty line the bible requires on any surface using her likeness.
assert.match(html, /do not\s+imply her authorization, participation, or endorsement/, 'missing the endorsement disclaimer');
assert.ok(!/official coin|verified mint|safe token|endorsed by/i.test(html), 'forbidden claim on the meme surface');

// No network dependencies beyond our own asset host: the page must work as one file.
const externals = [...html.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0])
  .filter((u) => !u.startsWith('https://lobby.getdasha.com/') && !u.startsWith('https://www.getdasha.com/'));
assert.deepEqual(externals, [], `no third-party requests allowed, found: ${externals.join(', ')}`);
assert.ok(!/<script[^>]+src=/i.test(html), 'no external scripts — this page is the whole product');

// It has to stay small. The thing it replaces was 115KB of HTML plus 114KB of JS.
assert.ok(html.length < 20_000, `page is ${html.length} bytes; the point was to be small`);

console.log(JSON.stringify({ ok: true, test: 'dasha-meme', bytes: html.length, templates: listed.length }));
