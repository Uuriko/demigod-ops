#!/usr/bin/env node
/**
 * Chess page: must be a functional standalone HTML page with board container.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dasha-chess-page.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('./dasha-lobby-worker.mjs', import.meta.url), 'utf8');
assert.ok(html.includes('chess') || html.includes('Chess'), 'must be chess page');
assert.ok(html.includes('board'), 'must have a board element');
assert.ok(html.includes('</html>'), 'must be complete HTML');
assert.match(html, /copy-timeout/, 'invite copy must time out hung writeText');
assert.match(html, /withTimeout\(navigator\.clipboard\.writeText\(text\),800\)/, 'writeText must be raced at 800ms');
assert.match(html, /class="skip-link" href="#gate"/, 'first visit must skip chrome to the play gate');
assert.match(html, /href="https:\/\/www\.getdasha\.com\/how-to-buy">How to buy</, 'chess first visit must link How to buy');
assert.match(html, /href="https:\/\/www\.getdasha\.com\/privacy">Privacy</, 'chess first visit must link Privacy');
assert.match(html, /meta name="description" content="Play Dasha versus Anna instantly\. No account for practice;/,
  'search copy must describe the working anonymous game, not only the rated gate');
assert.match(html, /gate-kicker'\)\.textContent='No account'[\s\S]{0,180}gate-title'\)\.textContent='Pick a side'/,
  'anonymous play must be the first client-rendered promise');
assert.match(html, /b\.classList\.toggle\('ghost',!challenge&&\(!me\|\|!me\.linked\)\)/,
  'rated login must be secondary while anonymous play is available');
assert.match(html, /gate\(\);trackEvent\('page_open'/, 'anonymous entry copy must render before the status request finishes');
assert.match(html, /PUBLIC_CHESS='https:\/\/www\.getdasha\.com\/chess'/, 'public chess URLs must use the indexed www surface');
assert.doesNotMatch(html, /https:\/\/lobby\.getdasha\.com\/chess(?:[?"'])/, 'shares, challenges and PGNs must not split traffic onto the API host');
for (const event of ['local_play_intent', 'local_completion', 'local_rematch_intent', 'local_share_intent']) {
  assert.match(html, new RegExp(`DashaChessTrack\\('${event}'`), `missing ${event} aggregate signal`);
}
for (const [event, metric] of Object.entries({ local_play_intent: 'localPlayIntents', local_completion: 'localCompletions', local_rematch_intent: 'localRematchIntents', local_share_intent: 'localShareIntents' })) {
  assert.ok(worker.includes(`${event}: '${metric}'`), `Worker rejects ${event}`);
}
assert.match(html, /window\.DashaChessTrack=trackEvent/, 'local play must reuse the existing session-deduplicated event path');
assert.match(html, /navigator\.share\(\{ title: 'Dasha Chess', text: text, url: canonical \}\)/, 'local result share must use the canonical public Chess URL');
assert.match(html, /toggleAttribute\('data-dasha-holder',Boolean\(me\.holder\)\)/, 'current holder status must activate the cosmetic frame');
assert.match(html, /:root\[data-dasha-holder\] \.board\{border-color:var\(--acid\);box-shadow:10px 10px 0 var\(--violet\)\}/, 'holder frame must reuse Dasha brand tokens without changing gameplay');
assert.match(html, /One signature\. No transaction\. Rated play \+ acid frame for 24h\./, 'holder gate must name the cosmetic benefit and transaction boundary');
console.log('dasha-chess-page: PASS');
