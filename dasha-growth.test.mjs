#!/usr/bin/env node
/**
 * Growth / buy-surface gate for getdasha conversion work.
 * Matches culture-home + neutral desk + how-to-buy (no FOMO raid desk).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const read = (f) => readFileSync(join(__dirname, f), 'utf8');
const readIf = (f) => {
  try {
    return read(f);
  } catch (err) {
    if (err && err.code === 'ENOENT') return '';
    throw err;
  }
};

// --- pure builders from desk app.js
const appSrc = readIf('dasha-desk/src/app.js');
if (appSrc) {
const sandbox = { globalThis: {}, window: undefined, document: undefined, navigator: undefined, console, URL };
sandbox.globalThis = sandbox;
vm.runInNewContext(appSrc, sandbox, { filename: 'src/app.js' });
const DD = sandbox.globalThis.DDShare;
assert.ok(DD, 'DDShare export missing from desk app.js');
assert.equal(DD.CA, MINT);
assert.ok(DD.BUY.includes('jup.ag') && DD.BUY.includes(MINT), 'desk BUY is Jupiter + mint');
assert.ok(DD.PUMP && DD.PUMP.includes('pump.fun/coin/' + MINT), 'desk PUMP route');
assert.ok(DD.PHANTOM && DD.PHANTOM.includes(MINT), 'desk PHANTOM route');
assert.ok(DD.RAYDIUM && DD.RAYDIUM.includes(MINT), 'desk RAYDIUM route');
const share = DD.buildSharePack('share');
assert.ok(share.includes(MINT), 'share pack must include mint');
assert.ok(/getdasha\.com\/dasha/.test(share + DD.DESK), 'share recruits to first-party desk');
assert.ok(!/NFA|go to zero|association is not endorsement/i.test(share), 'share pack must not carry negative coin language');
assert.ok(!/t\.me\/dashacommunity/.test(share), 'share must not claim disallowed telegram');
assert.ok(!/raid|fomo|referral/i.test(share), 'desk share stays neutral (no raid/fomo)');
}

// --- culture home convert surface
const landing = read('dasha-landing.html');
assert.ok(landing.includes(MINT), 'home surfaces mint');
assert.ok(landing.includes('jup.ag'), 'home surfaces Jupiter');
assert.ok(landing.includes('buy-guide') || landing.includes('How to buy'), 'home has buy guidance');
assert.ok(!/pump\.fun|phantom\.com\/tokens|raydium\.io\/swap/i.test(landing), 'home must keep one buy venue');
assert.match(landing, /href=["']\/how-to-buy["']/, 'home must crawlably link the live buying guide');
assert.ok(landing.includes('id="mint-check"'), 'home mint paste-check');
assert.ok(landing.includes('DashaLanding') || landing.includes('checkMint'), 'home mint-check script');
assert.ok(landing.includes('/dasha') && landing.includes('/studio') && landing.includes('/graph'), 'home loops desk + studio + graph');
assert.ok(landing.includes('github.com/Uuriko/dasha-desk/contribute'), 'home OSS /contribute path');
assert.ok(landing.includes('id="oss"') && landing.includes('Start with a good first issue'), 'home OSS section + GFI CTA');
assert.ok(!landing.includes('t.me/dashacommunity'));
assert.ok(!/thesis card|conviction receipt/i.test(landing), 'home stays culture product');

// --- how-to-buy (primary conversion education surface)
const howto = read('dasha-how-to-buy.html');
assert.ok(howto.includes(MINT));
assert.ok(howto.includes('jup.ag/swap'));
assert.ok(!/phantom\.com\/tokens|raydium\.io\/swap/i.test(howto), 'howto regained retired buy venues');
assert.ok(howto.includes('https://phantom.app/ul/v1/swap?buy=solana%3A101%2Faddress%3A' + MINT), 'howto Phantom deeplink');
assert.ok(howto.includes('https://pump.fun/coin/' + MINT), 'howto pump.fun coin URL');
assert.ok(howto.includes('https://trade.phantom.com/token/' + MINT), 'howto Phantom trade URL');
assert.ok(!/trojan|axiom|moonshot|moonpay\.com/i.test(howto), 'howto featured a banned venue');
const leanBuySteps = /data-n="01"[\s\S]*?SOL[\s\S]*?data-n="02"[\s\S]*?full mint[\s\S]*?data-n="03"[\s\S]*?Jupiter/i.test(howto);
const guidedBuySteps = ['01 · Wallet', '02 · Mint', '03 · Quote', '04 · Confirm'].every((step) => howto.includes(step));
assert.ok(leanBuySteps || guidedBuySteps, 'howto must contain one complete supported buy sequence');
assert.ok(howto.includes('SOL → match mint → swap') || howto.includes('match mint'), 'howto concise lede');
assert.ok(!/04 · Share|Copy share pack|Draft on X|buildSharePack/.test(howto), 'howto conversion ladder contains promotion');
assert.ok(!howto.includes('t.me/dashacommunity'));
for (const bad of ['official Dasha', 'safe token', 'verified mint', 'endorsed by']) {
  assert.ok(!howto.toLowerCase().includes(bad.toLowerCase()), `howto must not claim: ${bad}`);
}
const m = howto.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(m, 'howto script missing');
const box = {
  window: {},
  document: { getElementById: () => null, createElement: () => ({}), body: { appendChild() {}, removeChild() {} } },
  navigator: {},
  URL,
  console,
};
box.window = box;
vm.runInNewContext(m[1], box, { filename: 'how-to-buy.html' });
const H = box.window.DashaHowToBuy || box.DashaHowToBuy;
assert.ok(H, 'DashaHowToBuy export');
assert.equal(H.CA, MINT);
assert.ok(H.BUY.includes(MINT) && /jup\.ag/.test(H.BUY), 'howto buy route lost exact mint');
assert.ok(!('PUMP' in H || 'PHANTOM' in H || 'RAYDIUM' in H), 'howto exported retired buy routes');

// desk body links guide
const body = readIf('dasha-desk/src/body.html');
if (body) {
  assert.ok(!/href=["']\/how-to-buy["']/.test(body), 'desk must not primary-link how-to-buy');
  assert.ok(body.includes('jup.ag/swap'), 'desk has Jupiter buy');
  assert.ok(body.includes('pump.fun/coin/' + MINT), 'desk has Pump.fun buy');
  assert.ok(body.includes('id="dd-buy-rails"') || body.includes('class="dd-buy-rails"'), 'desk multi-route rails');
}

console.log('Dasha growth gate: PASS (neutral desk + culture home + howto convert)');
