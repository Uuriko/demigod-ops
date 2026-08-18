#!/usr/bin/env node
/**
 * Worker /lobby is a document. dasha-lobby-page.html stays a Webflow fragment.
 * Live 2026-08-17 served the fragment raw — no <title>, tab leaked CSS.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { asStandaloneLobbyPage } from './dasha-lobby-worker.mjs';
import { LOBBY_PAGE_HTML } from './dasha-lobby-static-gen.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const fragment = readFileSync(join(root, 'dasha-lobby-page.html'), 'utf8');

assert.match(fragment, /^<style>/);
assert.doesNotMatch(fragment, /<title[\s>]/i, 'Webflow embed must stay a fragment');
assert.doesNotMatch(LOBBY_PAGE_HTML, /<title[\s>]/i, 'generated Worker blob is still the fragment');
assert.match(fragment, /id="dasha-lobby-page"/);
assert.match(fragment, /id="dasha-forum"/, 'lobby must mount forum beside chat');
assert.match(fragment, /lobby\.getdasha\.com\/forum/, 'lobby header must open the full forum page');
assert.match(fragment, /Official room\. No Telegram\. No Discord\./, 'first paint must say this is the official room');
assert.match(LOBBY_PAGE_HTML, /id="dasha-forum"/, 'worker lobby blob must mount forum beside chat');

const page = asStandaloneLobbyPage(LOBBY_PAGE_HTML);
const title = page.match(/<title>([^<]*)<\/title>/)?.[1];
assert.equal(title, '$dasha lobby');
assert.doesNotMatch(title, /[{};#]/, 'title must not be CSS');
assert.match(page, /^<!doctype html>/i);
assert.match(page, /<html lang="en">/);
assert.match(page, /id="dasha-lobby-page"/);
assert.match(page, /<\/body><\/html>$/);
assert.equal(asStandaloneLobbyPage(page), page, 'already-titled documents stay put');

const leaked = asStandaloneLobbyPage('<style>\n  #dasha-lobby-page{--ink:#070608}\n</style>');
assert.equal(leaked.match(/<title>([^<]*)<\/title>/)?.[1], '$dasha lobby');
assert.doesNotMatch(leaked.match(/<title>([^<]*)<\/title>/)?.[1] || '', /--ink/);

console.log('dasha-lobby-page-html: PASS');
