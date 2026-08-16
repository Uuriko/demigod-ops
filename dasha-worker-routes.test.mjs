#!/usr/bin/env node
/**
 * Source contract: product edge keeps buy + lobby + tip faucet; SEO traps stay retired.
 * Faucet is a real product surface; airdrop/earn/claim/rally remain traps.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HOWTO_HTML,
  LOBBY_PAGE_HTML,
  FAUCET_PAGE_HTML,
  ROBOTS_TXT,
  SITEMAP_XML,
} from './dasha-lobby-static-gen.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const worker = readFileSync(join(root, 'dasha-lobby-worker.mjs'), 'utf8');
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

assert.ok(worker.includes('HOWTO_HTML'), 'worker imports HOWTO_HTML');
assert.ok(worker.includes('LOBBY_PAGE_HTML'), 'worker imports LOBBY_PAGE_HTML');
assert.ok(worker.includes('FAUCET_PAGE_HTML'), 'worker imports FAUCET_PAGE_HTML');
assert.ok(worker.includes("/how-to-buy"), 'worker routes how-to-buy');
assert.ok(worker.includes("X-Dasha-Edge': 'howto'"), 'howto edge marker');
assert.ok(worker.includes("X-Dasha-Edge': 'lobby-page'"), 'lobby edge marker on product host');
assert.ok(worker.includes("X-Dasha-Edge': 'faucet'"), 'faucet edge marker on product host');

assert.ok(worker.includes('RETIRED_SEO_PATHS'), 'worker names the SEO trap set');
for (const trap of ['/airdrop', '/earn', '/claim', '/rally']) {
  assert.ok(worker.includes(`'${trap}'`), `worker retires trap ${trap}`);
}
// Product tip faucet must NOT be in the retired set as a bare path with the old trap list intent.
assert.ok(worker.includes('handleFaucet'), 'worker routes faucet API');
assert.ok(worker.includes('/client/faucet.js'), 'worker serves faucet client');

assert.ok(HOWTO_HTML.includes(MINT) && /how to buy/i.test(HOWTO_HTML), 'HOWTO_HTML is the buy guide');
assert.ok(LOBBY_PAGE_HTML.includes('dasha-lobby') && LOBBY_PAGE_HTML.includes('lobby.js'), 'LOBBY_PAGE_HTML mounts chat');
assert.ok(FAUCET_PAGE_HTML.includes('dasha-faucet') && FAUCET_PAGE_HTML.includes(MINT), 'FAUCET_PAGE_HTML mounts tip UI');
assert.ok(SITEMAP_XML.includes('/how-to-buy') && SITEMAP_XML.includes('/lobby'), 'sitemap lists buy + lobby');
assert.ok(!/airdrop|\/earn|\/claim/i.test(SITEMAP_XML), 'sitemap must not list SEO traps');
assert.ok(!SITEMAP_XML.includes('/faucet'), 'sitemap omits faucet (product, not SEO magnet)');
assert.ok(ROBOTS_TXT.includes('Allow: /how-to-buy') && ROBOTS_TXT.includes('Allow: /lobby'), 'robots allow buy+lobby');
assert.ok(ROBOTS_TXT.includes('Allow: /faucet'), 'robots allow product faucet');
assert.ok(ROBOTS_TXT.includes('Disallow: /airdrop'), 'robots disallow airdrop trap');

console.log('dasha-worker-routes: PASS (howto+lobby+faucet edge, traps retired, sitemap/robots clean)');
