#!/usr/bin/env node
/**
 * Faucet page: must have link back to home.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dasha-faucet-page.html', import.meta.url), 'utf8');
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
assert.ok(html.includes('faucet') || html.includes('Faucet'), 'must be faucet page');
assert.ok(/min-height:\s*4[48]px/.test(html), '44/48px touch targets');
assert.ok(html.includes('getdasha.com/') || html.includes('faucet'), 'must have a door');
assert.ok(html.includes(MINT), 'faucet must keep the associated mint');
assert.ok(html.includes(`jup.ag/swap?sell=So11111111111111111111111111111111111111112`), 'Buy must stay SOL input');
assert.ok(html.includes(`buy=${MINT}`) || html.includes(`buy=${MINT.replace(/&/g, '')}`), 'Buy must use the exact mint');
assert.match(html, /href="\/lobby"/, 'faucet footer must open the official room, not Telegram');
assert.doesNotMatch(html, /t\.me|telegram/i, 'faucet must not advertise Telegram');
assert.match(html, /data-faucet-still="https:\/\/lobby\.getdasha\.com\/client\/faucet\.avif"/, 'faucet still must be the converted AVIF, not the 1.1MB PNG');
assert.match(html, /<h1>free \$dasha<\/h1>/, 'faucet first paint must expose one h1 before JS mounts');
assert.match(html, /class="skip-link" href="#dasha-faucet"/, 'faucet first visit must skip chrome to the tip');
assert.match(html, /href="https:\/\/www\.getdasha\.com\/how-to-buy">How to buy</, 'faucet first visit must link How to buy');
assert.match(html, /href="https:\/\/www\.getdasha\.com\/privacy">Privacy</, 'faucet first visit must link Privacy');
console.log('dasha-faucet-page: PASS');
