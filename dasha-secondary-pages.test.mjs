#!/usr/bin/env node
/**
 * Static contract for the prepared secondary pages that remain public.
 * Mint or honest doors; no Pay without payTo; 44/48px targets in CSS.
 *
 * Also gates the privacy page against copy drift from the Worker's PRIVACY_HTML:
 * every material disclosure in the Worker must also appear on the static page.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const files = [
  'dasha-privacy.html',
  'dasha-notes.html',
  'dasha-404.html',
];

for (const name of files) {
  const html = await readFile(new URL('./' + name, import.meta.url), 'utf8');
  const hasMint = html.includes(mint);
  const hasDoor = /href="\/"|href="\/how-to-buy"|href="\/studio"|href="\/simp"/.test(html);
  assert.ok(hasMint || hasDoor, `${name} has neither the associated mint nor a home/how-to-buy/studio/simp door`);
  assert.ok(/min-height:\s*4[48]px/.test(html), `${name} lost 44/48px touch targets`);
  const payButtons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?Pay[\s\S]*?<\/button>/gi)];
  for (const hit of payButtons) {
    assert.ok(/payTo/.test(html), `${name} has a Pay control without a payTo listing`);
  }
  assert.doesNotMatch(html, /<a\b[^>]*>\s*Pay\s*</i, `${name} grew an inline Pay link`);
}

// --- Privacy-specific regression: keep parity with Worker's PRIVACY_HTML ---
const privacy = await readFile(new URL('./dasha-privacy.html', import.meta.url), 'utf8');
assert.ok(privacy.includes('Referral links'), 'privacy must mention referral link tracking');
assert.ok(privacy.includes('Lobby history'), 'privacy must mention lobby history limits');
assert.ok(privacy.includes('public replays'), 'privacy must mention chess replays are public');
assert.ok(privacy.includes('aggregate only'), 'privacy must clarify funnel counts are aggregate');
assert.ok(privacy.includes('season snapshots'), 'privacy must mention season snapshots');
assert.ok(privacy.includes('Cloudflare'), 'privacy must name third-party hosts (Cloudflare)');
assert.ok(privacy.includes('Solana RPC'), 'privacy must name third-party hosts (Solana RPC)');
assert.ok(privacy.includes('chess rating'), 'privacy must list chess data in deletion scope');
assert.ok(privacy.includes('Anonymous aggregate counts'), 'privacy must clarify anonymous aggregates remain');

console.log('dasha secondary pages: mint-or-doors, 44px targets, no Pay without payTo, privacy parity with Worker');
