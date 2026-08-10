/**
 * Contract for ship Webflow readback hashing (must match dasha-ship.mjs).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MISLEADING_COIN_COPY, NEGATIVE_COIN_COPY, publicCopyFromHtml } from './dasha-public-copy.mjs';
import { extractWebMetadata, metadataMismatches, stripDuplicateOgImage, webflowPageUpdate, WEBFLOW_METADATA } from './dasha-webflow-metadata.mjs';

function normalizeEmbed(s) {
  return String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
function embedHash(s) {
  return createHash('sha256').update(normalizeEmbed(s), 'utf8').digest('hex');
}

assert.equal(embedHash('a\nb'), embedHash('a\r\nb'));
assert.equal(embedHash('a\nb'), embedHash('a\rb'));
assert.notEqual(embedHash('a\nb'), embedHash('a\nb '));
assert.notEqual(embedHash('full body'), embedHash('full bod')); // middle/tail truncate
assert.match('Can go to zero.', NEGATIVE_COIN_COPY);
assert.match('Not affiliated with the coin.', NEGATIVE_COIN_COPY);
assert.doesNotMatch(publicCopyFromHtml('<style>.lobby-nfa{color:red}</style><p>Public lobby.</p>'), NEGATIVE_COIN_COPY);
assert.match(publicCopyFromHtml('<script>const share="NFA"</script>'), NEGATIVE_COIN_COPY);
for (const promise of ['earn $dasha', 'receive Dasha tokens for posting', 'claim free tokens', 'win an airdrop', 'holders get 10 points', '10 points for holding', 'buy $dasha and earn rank']) {
  assert.match(promise, MISLEADING_COIN_COPY, `public copy must reject token-reward promise: ${promise}`);
}
assert.doesNotMatch('Quiz points reflect answers only.', MISLEADING_COIN_COPY);
assert.doesNotMatch('Holder badge verified for 28 days.', MISLEADING_COIN_COPY);
assert.doesNotMatch('Buy on Jupiter and receive $dasha.', MISLEADING_COIN_COPY);
const sampleMeta = '<title>$dasha lobby</title><meta content="Public chat for $dasha." name="description"><meta property="og:type" content="website"><meta property="og:url" content="https://www.getdasha.com/lobby"><meta property="og:title" content="$dasha lobby"><meta content="Public chat for $dasha." property="og:description"><meta property="og:image" content="https://lobby.getdasha.com/og/dasha-social-card.png"><link href="https://www.getdasha.com/lobby" rel="canonical">';
assert.deepEqual(metadataMismatches(extractWebMetadata(sampleMeta), WEBFLOW_METADATA.lobby), []);
assert.deepEqual(metadataMismatches(extractWebMetadata(sampleMeta.replace('$dasha lobby', 'Wrong')), WEBFLOW_METADATA.lobby), ['title']);
assert.deepEqual(metadataMismatches(extractWebMetadata(sampleMeta.replace('property="og:url" content="https://www.getdasha.com/lobby"', 'property="og:url" content="https://example.com"')), WEBFLOW_METADATA.lobby), ['ogUrl']);
assert.deepEqual(metadataMismatches(extractWebMetadata(sampleMeta.replace('</title>', '</title><meta property="og:image" content="https://example.com/duplicate.png">')), WEBFLOW_METADATA.lobby), ['ogImageCount']);
assert.equal(WEBFLOW_METADATA.home.pageId, '5f1458136c15aa41639b8538');
assert.equal(WEBFLOW_METADATA.howto.pageId, null);
assert.equal(webflowPageUpdate(WEBFLOW_METADATA.home).seo.description, '$dasha. Make something. Pass it on.');
assert.equal(webflowPageUpdate(WEBFLOW_METADATA.home).openGraph.imageUrl, 'https://lobby.getdasha.com/og/dasha-social-card.png');
assert.equal(stripDuplicateOgImage('<meta property="og:image" content="old"><meta name="twitter:image" content="keep">'), '<meta name="twitter:image" content="keep">');
assert.equal(stripDuplicateOgImage('<style>keep</style>\n<meta content="old" property="og:image">\n<link rel="canonical" href="keep">'), '<style>keep</style>\n<link rel="canonical" href="keep">');
assert.deepEqual(metadataMismatches(extractWebMetadata(readFileSync(new URL('./dasha-how-to-buy.html', import.meta.url), 'utf8')), WEBFLOW_METADATA.howto), []);

// ship source must use hashMatch / embedHash (not 0.85 ratio alone)
const ship = readFileSync(new URL('./dasha-ship.mjs', import.meta.url), 'utf8');
assert.match(ship, /function embedHash/);
assert.match(ship, /hashMatch/);
assert.match(ship, /createHash\('sha256'\)/);
assert.match(ship, /NEGATIVE_COIN_COPY/);
assert.match(ship, /fail\(`\$\{name\} has negative coin copy`\)/);
assert.match(ship, /dasha-domain-check\.mjs/);
assert.match(ship, /function checkExecutionBoundary/);
assert.match(ship, /contains an iframe/);
assert.match(ship, /executes an unapproved script/);
assert.match(ship, /has an unpinned cross-origin script/);
assert.doesNotMatch(ship, /ratio < 0\.85/);
const tokenPreflight = ship.indexOf("if (!want.tokenCheck && !want.dry && (want.push || want.publish)) await assertToken();");
assert.ok(tokenPreflight > 0 && tokenPreflight < ship.indexOf('if (want.prep) prep();'), 'ship must validate Webflow OAuth before mutating prepared artifacts');
assert.equal((ship.match(/await assertToken\(\);/g) || []).length, 2, 'token check must run once for explicit smoke and once for outbound preflight');
assert.match(ship, /if \(!want\.dry && \(want\.push \|\| want\.publish \|\| want\.verify \|\| wantLobbyDeploy\)\)/, 'dry runs must not stamp a shipped release');

console.log('dasha-ship-readback: PASS');
