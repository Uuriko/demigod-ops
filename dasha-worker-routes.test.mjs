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
import { solanaRpcEndpoints } from './dasha-lobby-worker.mjs';

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
assert.ok(worker.includes('dasha-simp-share-html'), 'product edge imports overlay helper');
assert.ok(worker.includes("X-Dasha-Edge': 'simp'"), 'simp edge marker');
assert.ok(!worker.includes('/?challenge=${id}#simp'), 'no leftover challenge CTA');

assert.ok(worker.includes('RETIRED_SEO_PATHS'), 'worker names the SEO trap set');
for (const trap of ['/airdrop', '/earn', '/claim', '/rally']) {
  assert.ok(worker.includes(`'${trap}'`), `worker retires trap ${trap}`);
}
// Product tip faucet must NOT be in the retired set as a bare path with the old trap list intent.
assert.ok(worker.includes('handleFaucet'), 'worker routes faucet API');
assert.ok(worker.includes('/client/faucet.js'), 'worker serves faucet client');
assert.match(worker, /ASSETS\.fetch[\s\S]{0,400}\/client\/faucet\.png|\/client\/faucet\.png[\s\S]{0,200}ASSETS\.fetch/,
  'worker must serve the faucet still from ASSETS — the file is uploaded, the route was missing');
assert.ok(worker.includes("/client/faucet.avif"), 'worker must serve the converted faucet still');
assert.ok(FAUCET_PAGE_HTML.includes('/client/faucet.avif'), 'faucet page must request the AVIF still');
assert.ok(worker.includes('handlePrice'), 'worker prices the named Raydium pool on the lobby DO');
assert.ok(worker.includes("url.pathname === '/price'"), 'worker forwards /price to the lobby DO');
assert.ok(worker.includes('9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7') || worker.includes('PAIR'), 'price uses the site pair');

assert.ok(worker.includes('function stripDeadNav') && worker.includes('/graph'), 'edge strips the dead /graph Designer nav');
assert.ok(worker.includes('dasha-studio-shell'), 'productEdge studio page must ship the thin shell');
assert.ok(worker.includes('<loc>https://www.getdasha.com/simp</loc>') && worker.includes('<loc>https://www.getdasha.com/bounties</loc>') && worker.includes('<loc>https://www.getdasha.com/chess</loc>'), 'worker sitemap matches disk public routes');
assert.ok(HOWTO_HTML.includes(MINT) && /how to buy/i.test(HOWTO_HTML), 'HOWTO_HTML is the buy guide');
{
  const script = HOWTO_HTML.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'HOWTO_HTML ships an inline script');
  assert.match(script, /token\\\/\|coin\\\//, 'mint-check regex must keep escaped slashes after the template literal is evaluated');
  assert.doesNotThrow(() => new Function(script), 'HOWTO_HTML inline script must parse (template-literal \\/ must not eat regex slashes)');
}
assert.ok(LOBBY_PAGE_HTML.includes('dasha-lobby') && LOBBY_PAGE_HTML.includes('lobby.js'), 'LOBBY_PAGE_HTML mounts chat');
assert.ok(FAUCET_PAGE_HTML.includes('dasha-faucet') && FAUCET_PAGE_HTML.includes(MINT), 'FAUCET_PAGE_HTML mounts tip UI');
assert.ok(SITEMAP_XML.includes('/how-to-buy') && SITEMAP_XML.includes('/lobby'), 'sitemap lists buy + lobby');
assert.ok(!/airdrop|\/earn|\/claim/i.test(SITEMAP_XML), 'sitemap must not list SEO traps');
assert.ok(!SITEMAP_XML.includes('/faucet'), 'sitemap omits faucet (product, not SEO magnet)');
assert.ok(ROBOTS_TXT.includes('Allow: /how-to-buy') && ROBOTS_TXT.includes('Allow: /lobby'), 'robots allow buy+lobby');
assert.ok(ROBOTS_TXT.includes('Allow: /faucet'), 'robots allow product faucet');
assert.ok(ROBOTS_TXT.includes('Disallow: /airdrop'), 'robots disallow airdrop trap');

{
  const dedicated = 'https://paid.example.invalid/solana';
  const endpoints = solanaRpcEndpoints({ SOLANA_RPC_URL: dedicated });
  assert.equal(endpoints[0], dedicated, 'dedicated RPC stays first');
  assert.ok(endpoints.includes('https://api.mainnet-beta.solana.com'), 'public mainnet is a fallback');
  const mainnet = endpoints.indexOf('https://api.mainnet-beta.solana.com');
  const publicnode = endpoints.indexOf('https://solana-rpc.publicnode.com');
  if (publicnode !== -1) assert.ok(mainnet < publicnode, 'mainnet-beta before hanging publicnode');
  assert.ok(!endpoints.includes('https://solana.drpc.org'), 'drop paid-only drpc (free plan 400s)');
  assert.match(worker, /controller\.abort\(\), 3_500\)/, 'inventory RPC timeout must leave room for fallbacks');
}

console.log('dasha-worker-routes: PASS (howto+lobby+faucet edge, traps retired, sitemap/robots clean)');
