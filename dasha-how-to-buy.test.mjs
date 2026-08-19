#!/usr/bin/env node
/**
 * How-to-buy disk gate. Route is live and crawlably linked from Home.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const html = readFileSync(join(__dirname, 'dasha-how-to-buy.html'), 'utf8');
const landing = readFileSync(join(__dirname, 'dasha-landing.html'), 'utf8');
const deskPath = join(__dirname, 'dasha-desk/src/body.html');
const desk = existsSync(deskPath) ? readFileSync(deskPath, 'utf8') : '';

assert.ok(html.includes(MINT), 'mint on how-to-buy');
assert.ok(html.includes('jup.ag/swap'), 'jupiter deep link');
assert.ok(html.includes('https://phantom.com/tokens/solana/' + MINT), 'Phantom token page');
assert.ok(!/raydium\.io\/swap/i.test(html), 'retired Raydium venue returned');
assert.match(html, /data-n="01"[\s\S]*?wallet[\s\S]*?SOL/, 'Get SOL must mention wallet and SOL');
assert.doesNotMatch(html, /We never take your card|Nobody from \$dasha will ask for it/i);
assert.ok(html.includes('https://phantom.app/'), 'official Phantom download');
assert.ok(html.includes('https://solflare.com/'), 'official Solflare download');
assert.ok(html.includes('https://phantom.app/ul/v1/swap?buy=solana%3A101%2Faddress%3A' + MINT), 'Phantom in-app swap deeplink');
assert.ok(html.includes('https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=' + MINT), 'browser Jupiter URL');
assert.ok(html.includes('https://jup.ag/onboard'), 'Jupiter onboard for SOL');
assert.ok(html.includes('https://www.coinbase.com/price/solana'), 'Coinbase SOL send path');
assert.ok(html.includes('https://pump.fun/coin/' + MINT), 'pump.fun coin URL');
assert.ok(html.includes('https://trade.phantom.com/token/' + MINT), 'Phantom trade URL');
assert.ok(html.includes('https://solscan.io/token/' + MINT), 'Solscan mint URL');
assert.ok(html.includes('Never search $dasha by name'), 'mint step must reject name search');
assert.ok(/iPhone\|iPad\|iPod\|Android/.test(html), 'device-aware Buy must detect phones');
assert.ok(!/trojan|axiom|moonshot|moonpay\.com/i.test(html), 'howto featured a banned venue');
assert.ok(html.includes('https://plugin.jup.ag/plugin-v1.js'), 'official Jupiter plugin script');
assert.ok(html.includes('hideJup') && html.includes('box.hidden=true'), 'failed plugin must hide the box');
assert.match(html, /fixedMint:CA|fixedMint:\s*['"]53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump['"]/, 'plugin locks output to published mint');
assert.match(html, /initialOutputMint:CA|initialOutputMint:\s*['"]53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump['"]/, 'plugin initial output is published mint');
assert.ok(!/payTo|referralAccount/i.test(html), 'howto must not invent payTo or referralAccount');
const WSOL = 'So11111111111111111111111111111111111111112';
assert.doesNotMatch(html.replaceAll(MINT, '').replaceAll(WSOL, ''), /[1-9A-HJ-NP-Za-km-z]{32,44}/, 'howto contains a mint other than $dasha or WSOL');
assert.ok(html.includes('DashaHowToBuy'), 'export for tests');
assert.match(html, /class="dasha-slim[\s"]/, 'howto must use the hamburger');
assert.match(html, /class="dasha-crop"/, 'howto must keep crop marks');
assert.match(html, /<a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a> · <a class="buy-dasha"/, 'footer is \$dasha + Buy');
assert.match(html, /\.btn\{[^}]*background:var\(--acid\);color:var\(--ink\)/, 'howto primary is acid fill + ink type');
assert.match(html, /\.btn\.ghost\{[^}]*color:var\(--paper\);border:1px solid var\(--paper\)/, 'howto ghost is paper on ink');
assert.match(html, /footer \.buy-dasha,footer \.buy-dasha:hover\{background:var\(--acid\);color:var\(--ink\)/, 'howto Buy hover stays ink on acid');
assert.match(html, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</, 'footer includes @dash_eats');
assert.match(html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '', /t\.me\/\+xB7S8mIQaKFiZjRh/, 'howto footer includes Telegram');
assert.doesNotMatch(html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '', /\/studio|>Studio<|>Privacy<|>Chess</, 'howto footer has no leftover rooms');
assert.doesNotMatch(html, /href="\/graph"/, 'howto chrome must hide Graph');
assert.ok(!html.includes('t.me/dashacommunity'), 'no disallowed telegram');
assert.ok(!/can go to zero|not financial advice|\bNFA\b|rugcheck|warning|disclaimer|not an endorsement|never trust|wrong one|lookalike|fake token|token safe/i.test(html), 'negative coin copy returned');
for (const step of ['01', '02', '03']) assert.ok(html.includes(`data-n="${step}"`), `howto missing step ${step}`);
assert.ok(html.includes('id="buy-sticky"') || html.includes('buy-sticky'), 'howto sticky buy bar');
assert.ok(html.includes('SOL → match mint → swap') || html.includes('match mint'), 'howto concise lede');
assert.match(html, /property="og:image" content="https:\/\//, 'howto must have a share image');
assert.match(html, /name="twitter:card" content="summary_large_image"/, 'howto must declare a large X card');
assert.match(html, /name="twitter:site" content="@dash_eats"/, 'howto large card must name @dash_eats');
assert.match(html, /https:\/\/www\.coingecko\.com\/en\/coins\/dash_eats/, 'howto points at live dash_eats');
assert.match(html, /https:\/\/www\.coingecko\.com\/en\/coins\/dasha/, 'howto still names the generic Dasha CoinGecko page');
assert.match(html, /VVAIFU/, 'howto still says /coins/dasha is VVAIFU');
assert.doesNotMatch(html, /CoinGecko['’]s Dasha is only VVAIFU|including CoinGecko['’]s Dasha \(VVAIFU\)/, 'VVAIFU-only CoinGecko wording is gone');
assert.doesNotMatch(html, /dasha-menu|aria-label="Menu">Menu</, 'howto must not render a Menu');
assert.doesNotMatch(html, /application\/ld\+json|"@type"\s*:\s*"HowTo"/, 'retired HowTo structured data returned');
// One copy affordance is clearer than making both the code block and button perform the same action.
assert.ok(html.includes('user-select:all'), 'mint must remain selectable');
assert.equal((html.match(/id="copy"/g) || []).length, 1, 'howto must expose one primary mint-copy control');
assert.ok(!html.includes('copyFromCa'), 'duplicate tap-to-copy behavior returned to the mint code');
assert.ok(!/04 · Share|Copy share pack|Draft on X|buildSharePack/.test(html), 'no promo share ladder');
for (const bad of ['official Dasha', 'safe token', 'verified mint', 'endorsed by']) {
  assert.ok(!html.toLowerCase().includes(bad.toLowerCase()), `howto must not claim: ${bad}`);
}
assert.match(landing, /href=["']\/how-to-buy["']/, 'home must crawlably link live how-to-buy');
assert.doesNotMatch(landing, /href=["']\/graph["']/, 'home must not door to shelved /graph');
if (desk) assert.ok(!/href=["']\/how-to-buy["']/.test(desk), 'desk must not primary-link how-to-buy');

const m = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(m, 'howto script');
const box = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({}),
    body: { appendChild() {}, removeChild() {} },
  },
  navigator: {},
  URL,
  console,
};
box.window = box;
vm.runInNewContext(m[1], box, { filename: 'how-to-buy.html' });
const H = box.window.DashaHowToBuy || box.DashaHowToBuy;
assert.ok(H, 'DashaHowToBuy export');
assert.equal(H.CA, MINT);
assert.ok(H.BUY.includes(MINT) && /jup\.ag/.test(H.BUY), 'buy route lost exact mint');
assert.deepEqual(Object.keys(H).sort(), ['BUY', 'CA'], 'buy guide exports more than its one handoff needs');

console.log('dasha how-to-buy: PASS');
