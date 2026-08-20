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
import { asStandaloneLobbyPage, normalizeBountiesFeed, solanaRpcEndpoints } from './dasha-lobby-worker.mjs';

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
assert.ok(
  (worker.match(/simpPageHtml\(\)/g) || []).length >= 2,
  'lobby host must serve the board HTML too — bare /simp was a JSON 404 on lobby.getdasha.com',
);
assert.ok(
  (worker.match(/X-Dasha-Edge': 'bounties'/g) || []).length >= 2,
  'lobby host must serve /bounties HTML — bare path was a JSON 404',
);
assert.match(worker, /\/bounties\\\.json/, 'both product and lobby hosts must serve the bounty feed');
assert.match(worker, /\/oauth\/github\/status/, 'GitHub soon must have an honest configured:false status route');
assert.deepEqual(normalizeBountiesFeed({ listings: [{ payTo: '' }] }).listings[0], {
  payTo: null,
  payoutStatus: 'not_implemented',
}, 'missing payout destinations must stay explicitly unimplemented');
assert.ok(
  worker.includes('class="lp-back"') && worker.includes('$1https://www.getdasha.com/$2'),
  'lobby ← $dasha must rewrite href=/ away from health JSON',
);
{
  const wrapped = asStandaloneLobbyPage('<a class="lp-back" href="/">← $dasha</a>');
  assert.match(wrapped, /href="https:\/\/www\.getdasha\.com\/"/);
  assert.doesNotMatch(wrapped, /<a class="lp-back" href="\/"/);
}
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
assert.match(FAUCET_PAGE_HTML, /href="\/lobby"/, 'faucet footer must open the room, not /forum');
assert.doesNotMatch(FAUCET_PAGE_HTML, /lobby\.getdasha\.com\/forum/, 'faucet must not send first-visit through the /forum 308');
assert.ok(worker.includes('handlePrice'), 'worker prices the named Raydium pool on the lobby DO');
assert.ok(worker.includes("url.pathname === '/price'"), 'worker forwards /price to the lobby DO');
assert.ok(worker.includes('9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7') || worker.includes('PAIR'), 'price uses the site pair');

assert.ok(worker.includes('function stripDeadNav') && worker.includes('/graph'), 'edge strips the dead /graph Designer nav');
assert.ok(
  worker.includes("upstream.status === 404") && worker.includes("X-Dasha-Edge': 'html-404'"),
  'www HTML 404s (including /graph) must serve branded doors, not Webflow generic',
);
assert.match(worker, /html-404[\s\S]{0,180}X-Robots-Tag': 'noindex, nofollow'|X-Robots-Tag': 'noindex, nofollow'[\s\S]{0,180}html-404/,
  'www HTML 404s must stay noindex');
assert.match(worker, /robots: 'noindex,follow'/, 'branded 404 HTML must declare noindex');
assert.match(worker, /\/bounties[\s\S]{0,400}how-to-buy[\s\S]{0,200}privacy|How to buy<\/a> · <a href="https:\/\/www\.getdasha\.com\/privacy"/,
  'bounties must keep how-to-buy + privacy help');
assert.match(
  worker,
  /Response\.redirect\('https:\/\/www\.getdasha\.com\/dasha', 308\)/,
  'lobby host /desk must 308 to www desk',
);
assert.match(
  worker,
  /Response\.redirect\('https:\/\/www\.getdasha\.com\/how-to-buy', 308\)/,
  'lobby host /how must 308 to howto',
);
assert.match(
  worker,
  /Response\.redirect\('https:\/\/www\.getdasha\.com\/simp', 308\)/,
  'lobby host /quiz must 308 to simp',
);
assert.ok(worker.includes('class="skip-link" href="#dasha-page"'), 'htmlPage 404/privacy/bounties get a skip-link');
assert.ok(worker.includes('class="skip-link" href="#dasha-studio"'), 'studio first visit must skip to the maker');
assert.ok(worker.includes('dasha-studio-shell'), 'productEdge studio page must ship the thin shell');
assert.match(
  worker,
  /Response\.redirect\('https:\/\/www\.getdasha\.com\/studio', 308\)/,
  'lobby host /studio must 308 to www rather than 404 JSON/HTML',
);
assert.ok(worker.includes('<loc>https://www.getdasha.com/simp</loc>') && worker.includes('<loc>https://www.getdasha.com/bounties</loc>') && worker.includes('<loc>https://www.getdasha.com/chess</loc>'), 'worker sitemap matches disk public routes');
assert.ok(!SITEMAP_XML.includes('/forum'), 'sitemap must not list a second community URL');
assert.ok(worker.includes('function forumToLobbyRedirect'), '/forum 308s into /lobby');
assert.ok(worker.includes("searchParams.set('pane', 'threads')"), '/forum 308 must not rely on #threads alone');
assert.ok(HOWTO_HTML.includes(MINT) && /how to buy/i.test(HOWTO_HTML), 'HOWTO_HTML is the buy guide');
assert.match(HOWTO_HTML, /copy-timeout/, 'howto Copy CA must time out hung writeText');
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
assert.ok(SITEMAP_XML.includes('/faucet'), 'sitemap lists the real faucet product surface');
assert.ok(ROBOTS_TXT.includes('Allow: /'), 'robots allow public product routes');
assert.ok(ROBOTS_TXT.includes('Allow: /faucet'), 'robots allow product faucet');
assert.ok(!ROBOTS_TXT.includes('Disallow:'), 'retired routes stay fetchable so crawlers can observe their 404/noindex response');

{
  const dedicated = 'https://paid.example.invalid/solana';
  const endpoints = solanaRpcEndpoints({ SOLANA_RPC_URL: dedicated });
  assert.equal(endpoints[0], dedicated, 'dedicated RPC stays first');
  assert.ok(endpoints.some((u) => u.includes('solana.leorpc.com')), 'leorpc free tier is a CF-friendly fallback');
  assert.ok(endpoints.includes('https://api.mainnet.solana.com') || endpoints.includes('https://api.mainnet-beta.solana.com'), 'a public mainnet host remains');
  const publicnode = endpoints.indexOf('https://solana-rpc.publicnode.com');
  const leorpc = endpoints.findIndex((u) => u.includes('solana.leorpc.com'));
  if (publicnode !== -1 && leorpc !== -1) assert.ok(leorpc < publicnode, 'leorpc before hanging publicnode');
  assert.ok(!endpoints.includes('https://solana.drpc.org'), 'drop paid-only drpc (free plan 400s)');
  assert.match(worker, /controller\.abort\(\), 3_500\)/, 'inventory RPC timeout must leave room for fallbacks');
}

console.log('dasha-worker-routes: PASS (howto+lobby+faucet edge, traps retired, sitemap/robots clean)');
