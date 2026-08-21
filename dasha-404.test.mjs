#!/usr/bin/env node
/**
 * 404 page contract: must offer a door back to home, must not claim it's a real page.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dasha-404.html', import.meta.url), 'utf8');
assert.ok(html.includes('404'), 'must mention 404');
assert.ok(html.includes('/how-to-buy') || html.includes('href="/"'), 'must have a door back');
assert.ok(html.includes('href="/lobby"'), '404 must open the room after forum merged into lobby');
assert.doesNotMatch(html, /lobby\.getdasha\.com\/forum/, '404 must not send anyone through /forum');
assert.doesNotMatch(html, /<meta name="robots" content="index"/, '404 must not be indexable');
console.log('dasha-404: PASS');
