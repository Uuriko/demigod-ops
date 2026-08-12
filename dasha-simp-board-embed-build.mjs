#!/usr/bin/env node
/**
 * Keep landing simp board client load path correct.
 * Client served from lobby.getdasha.com (Webflow custom-code size cap).
 * Homepage may load it via static <script> OR intent/IO lazy inject (prefer lazy).
 *
 *   node dasha-simp-board-embed-build.mjs --check
 *   node dasha-simp-board-embed-build.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const SIMP_SRC = 'https://lobby.getdasha.com/client/simp-board.js';
const START = '/* dasha-simp-board-client';
const TAG = `<script src="${SIMP_SRC}" defer data-dasha-simp-board-client></script>`;

function extractBlock(html) {
  const ext = html.match(
    /<script[^>]*data-dasha-simp-board-client[^>]*>\s*<\/script>|<script[^>]*src="https:\/\/lobby\.getdasha\.com\/client\/simp-board\.js"[^>]*>\s*<\/script>/i,
  );
  if (ext) {
    return { start: ext.index, end: ext.index + ext[0].length, body: ext[0], mode: 'external' };
  }
  const i = html.indexOf(START);
  if (i < 0) return null;
  const scriptStart = html.lastIndexOf('<script', i);
  const scriptEnd = html.indexOf('</script>', i);
  if (scriptStart < 0 || scriptEnd < 0) return null;
  return {
    start: scriptStart,
    end: scriptEnd + '</script>'.length,
    body: html.slice(scriptStart, scriptEnd + '</script>'.length),
    mode: 'inline',
  };
}

/** Lazy path: SIMP_SRC appears in homepage JS (createElement inject). */
function hasLazyLoad(html) {
  return (
    html.includes(SIMP_SRC) &&
    html.includes('id="dasha-simp-board"') &&
    (html.includes('IntersectionObserver') || html.includes('data-dasha-simp-board-client'))
  );
}

const landingPath = join(root, 'dasha-landing.html');
const html = readFileSync(landingPath, 'utf8');
const found = extractBlock(html);
const lazy = hasLazyLoad(html);

if (!found && !lazy) {
  if (args.has('--check')) {
    console.error('dasha-simp-board-embed-build: simp client script missing in dasha-landing.html');
    process.exit(1);
  }
  console.error('dasha-simp-board-embed-build: marker missing; add #dasha-simp-board + script tag first');
  process.exit(1);
}

if (args.has('--check')) {
  if (!html.includes(SIMP_SRC)) {
    console.error('dasha-simp-board-embed-build: landing must load', SIMP_SRC);
    process.exit(1);
  }
  if (!html.includes('id="simp"') || !html.includes('id="dasha-simp-board"')) {
    console.error('dasha-simp-board-embed-build: landing missing simp mount');
    process.exit(1);
  }
  if (!(found?.mode === 'external' || lazy)) {
    console.error('dasha-simp-board-embed-build: need external script tag or lazy inject of', SIMP_SRC);
    process.exit(1);
  }
  console.log('dasha-simp-board-embed-build: check PASS', {
    src: SIMP_SRC,
    mode: lazy ? 'lazy-io' : found.mode,
  });
  process.exit(0);
}

if (args.has('--write') || args.size === 0) {
  // Prefer keeping intentional lazy inject; only force external tag for legacy inline blocks.
  if (lazy && !found) {
    console.log('dasha-simp-board-embed-build: lazy load already present', { src: SIMP_SRC });
    process.exit(0);
  }
  if (found?.mode === 'external' || (lazy && found?.mode === 'external')) {
    console.log('dasha-simp-board-embed-build: external tag already present', { src: SIMP_SRC });
    process.exit(0);
  }
  if (lazy) {
    // Inline bootstrap already loads SIMP_SRC — do not re-add static tag.
    console.log('dasha-simp-board-embed-build: kept lazy inject', { src: SIMP_SRC, landing: html.length });
    process.exit(0);
  }
  const out = html.slice(0, found.start) + TAG + html.slice(found.end);
  writeFileSync(landingPath, out);
  console.log('dasha-simp-board-embed-build: wrote external client tag', { src: SIMP_SRC, landing: out.length });
  process.exit(0);
}

console.error('usage: node dasha-simp-board-embed-build.mjs --check|--write');
process.exit(2);
