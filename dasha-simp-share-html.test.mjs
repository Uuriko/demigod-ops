#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LIVE_SIMP_BOARD_SRI,
  challengeRedirectPath,
  isRetiredSeoPath,
  privacyPageHtml,
  quizRedirectPath,
  simpPageHtml,
  simpResultHtml,
} from './dasha-simp-share-html.mjs';

const id = 'xvojI8Cdg8B6';
const page = simpPageHtml();
assert.match(page, /og:image/);
assert.match(page, /twitter:card" content="summary_large_image"/);
assert.match(page, /theme-color" content="#dfff00"/);
assert.match(page, /canonical" href="https:\/\/www\.getdasha\.com\/simp"/);
assert.ok(page.includes(LIVE_SIMP_BOARD_SRI), 'page pins live simp-board SRI');
assert.doesNotMatch(page, /\?challenge=/);

const html = simpResultHtml({ id, title: 'Dasha simp', correct: 9, total: 28 });
assert.match(html, /og:title" content="Beat 9\/28 · Dasha simp"/);
assert.doesNotMatch(html, /Still loading/);
assert.match(html, /class="dasha-start"[^>]*>Start/);
assert.match(html, /simp\/card\/xvojI8Cdg8B6\.png\?v=3/);
assert.match(html, /canonical" href="https:\/\/www\.getdasha\.com\/simp\/r\/xvojI8Cdg8B6"/);
assert.doesNotMatch(html, /\?challenge=/);
assert.match(html, /theme-color" content="#dfff00"/);
assert.match(html, /dasha-share/);
assert.ok(html.includes(LIVE_SIMP_BOARD_SRI));

assert.equal(quizRedirectPath(), '/simp');
assert.equal(
  LIVE_SIMP_BOARD_SRI,
  'sha384-6yviuWr0L1Luwc02JwZxQHUeHoPIZ+6C7y23f/YJ7J5uA4Aa/FNZMtLEWR4iUAb/',
);
for (const trap of ['/airdrop', '/earn', '/claim', '/rally']) {
  assert.equal(isRetiredSeoPath(trap), true, trap);
}
assert.equal(isRetiredSeoPath('/faucet'), false);
const privacy = privacyPageHtml();
assert.match(privacy, /<h1>Privacy<\/h1>/);
assert.match(privacy, /theme-color" content="#dfff00"/);
assert.match(privacy, /canonical" href="https:\/\/www\.getdasha\.com\/privacy"/);

const faucet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-faucet-page.html'), 'utf8');
assert.match(faucet, /og:title" content="\$dasha \/ free \$dasha"/);
const faucetClient = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-faucet-client.js'), 'utf8');
assert.match(faucetClient, /'free \$dasha'/);
assert.doesNotMatch(faucetClient, /faucet-send', 'Send'/);
assert.match(faucet, /twitter:card" content="summary_large_image"/);
assert.match(faucet, /theme-color" content="#dfff00"/);
assert.match(faucet, /dasha-social-card\.png/);
assert.match(faucet, /id="dasha-faucet"|dasha-faucet/);
assert.match(faucet, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/);

assert.equal(challengeRedirectPath('?challenge=xvojI8Cdg8B6'), '/simp/r/xvojI8Cdg8B6');
assert.equal(challengeRedirectPath(new URLSearchParams('challenge=xvojI8Cdg8B6')), '/simp/r/xvojI8Cdg8B6');
assert.equal(challengeRedirectPath('?challenge=nope'), null);
assert.equal(challengeRedirectPath(''), null);

assert.throws(() => simpResultHtml({ id: '../x', title: 'Dasha simp', correct: 1, total: 1 }));

const worker = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-lobby-worker.mjs'), 'utf8');
const wired = worker.includes('dasha-simp-share-html');
const legacyCta = worker.includes('/?challenge=${id}#simp');
if (!wired) {
  console.log('dasha-simp-share-html: helper PASS; worker not wired (Codex holds dasha-lobby-worker.mjs)');
} else {
  assert.ok(!legacyCta, 'wired worker must not keep leftover /?challenge=#simp CTA');
  console.log('dasha-simp-share-html: helper+wire PASS');
}
