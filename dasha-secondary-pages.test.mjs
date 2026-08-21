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
assert.ok(privacy.includes('Private X IDs') && privacy.includes('reaction counts'), 'privacy must disclose private reaction dedupe and count-only output');
assert.ok(privacy.includes('public replays'), 'privacy must mention chess replays are public');
assert.ok(privacy.includes('aggregate only'), 'privacy must clarify funnel counts are aggregate');
assert.ok(privacy.includes('season snapshots'), 'privacy must mention season snapshots');
assert.ok(privacy.includes('Cloudflare'), 'privacy must name third-party hosts (Cloudflare)');
assert.ok(privacy.includes('Solana RPC'), 'privacy must name third-party hosts (Solana RPC)');
assert.ok(privacy.includes('chess rating'), 'privacy must list chess data in deletion scope');
assert.ok(privacy.includes('Anonymous aggregate counts'), 'privacy must clarify anonymous aggregates remain');

const [worker, landing, board, sitemap] = await Promise.all([
  'dasha-lobby-worker.mjs',
  'dasha-landing.html',
  'dasha-simp-board-client.js',
  'dasha-sitemap.xml',
].map(name => readFile(new URL('./' + name, import.meta.url), 'utf8')));
assert.match(worker, /const CONTRIBUTE_HTML = htmlPage\('Contribute to Dasha'/);
assert.match(worker, /url\.pathname === '\/contribute'[\s\S]{0,500}X-Dasha-Edge': 'contribute'/);
assert.match(worker, /no wallet, holder status, or Simp Points required/i);
assert.match(worker, /A docs fix needs no setup: open a file on GitHub, click the pencil, then propose changes\./);
assert.match(worker, /PR points are not live yet/);
assert.match(landing, /href="\/contribute"[^>]*>Contribute code ↗<\/a>/);
assert.match(board, /ossLink\.href = 'https:\/\/www\.getdasha\.com\/contribute'/);
assert.match(sitemap, /<loc>https:\/\/www\.getdasha\.com\/contribute<\/loc>/);
const { default: edge } = await import('./dasha-lobby-worker.mjs');
const contribute = await edge.fetch(new Request('https://www.getdasha.com/contribute'), {});
assert.equal(contribute.status, 200);
assert.equal(contribute.headers.get('x-dasha-edge'), 'contribute');
assert.match(await contribute.text(), /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/contribute">/);
const contributeHead = await edge.fetch(new Request('https://www.getdasha.com/contribute', { method: 'HEAD' }), {});
assert.equal(contributeHead.status, 200);
assert.equal(await contributeHead.text(), '');

const studio = await edge.fetch(new Request('https://www.getdasha.com/studio'), {});
assert.equal(studio.status, 200, 'Studio must not be retired to Home');
assert.equal(studio.headers.get('x-dasha-edge'), 'studio');
assert.match(await studio.text(), /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/studio">[\s\S]*id="dasha-studio"/);
const privacyRoute = await edge.fetch(new Request('https://www.getdasha.com/privacy'), {});
assert.equal(privacyRoute.status, 200, 'Privacy must not be retired to Home');
assert.equal(privacyRoute.headers.get('x-dasha-edge'), 'privacy');
const desk = await edge.fetch(new Request('https://www.getdasha.com/desk'), {});
assert.equal(desk.status, 308);
assert.equal(desk.headers.get('location'), 'https://www.getdasha.com/dasha', 'Desk must lead to Dasha, not Home');
const nativeFetch = globalThis.fetch;
const upstreamPaths = [];
globalThis.fetch = async request => {
  upstreamPaths.push(new URL(request.url).pathname);
  return new Response('<!doctype html><title>Dasha Desk</title>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
try {
  const dasha = await edge.fetch(new Request('https://www.getdasha.com/dasha'), {});
  assert.equal(dasha.status, 200, 'Dasha must not be retired to Home');
  assert.equal(dasha.headers.get('location'), null);
  assert.match(await dasha.text(), /Dasha Desk/);
  assert.deepEqual(upstreamPaths, ['/dasha'], 'Dasha must pass its own path to Webflow');
} finally {
  globalThis.fetch = nativeFetch;
}
const liveVerifier = await readFile(new URL('./dasha-live-verify.mjs', import.meta.url), 'utf8');
assert.match(liveVerifier, /const contribute = await get\('\/contribute'\)/);
assert.match(liveVerifier, /SITEMAP_REQUIRED = \[[^\]]*'\/contribute'/);
assert.match(liveVerifier, /contributeCurrent[\s\S]{0,400}PR points are not live yet/);
assert.match(liveVerifier, /contribute-not-live/);
assert.match(liveVerifier, /raw\.githubusercontent\.com\/Uuriko\/dasha-desk\/main\/CONTRIBUTING\.md/);
assert.match(liveVerifier, /contributorGuideCurrent[\s\S]{0,300}not active yet[\s\S]{0,200}no current pull request earns Simp Points/i);
assert.match(liveVerifier, /contributor-guide-points-misleading/);

console.log('dasha secondary pages: mint-or-doors, OSS onboarding, no Pay without payTo, privacy parity with Worker');
