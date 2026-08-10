/**
 * Structural gate: crypto research docs shipped for 2026-08-08 goal.
 * Asserts real workspace markdown (entry: files under cwd), not a re-summary.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
function load(name) {
  const p = join(root, name);
  assert.ok(existsSync(p), 'missing file: ' + name);
  return { path: p, text: readFileSync(p, 'utf8') };
}

const note = load('DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08.md');
const landscape = load('DASHA-CRYPTO-LANDSCAPE.md');
const psych = load('DASHA-RESEARCH-CRYPTO-PSYCHOLOGY-2026-08-06.md');
const docs = load('DASHA-DOCS.md');
const brief = load('DASHA-PRODUCT-BRIEF.md');
const roadmap = load('DASHA-ROADMAP.md');
const delta = load('DASHA-CRYPTO-PRODUCT-DELTA-2026-08-08.md');
const currentDelta = load('DASHA-CRYPTO-RESEARCH-DELTA-2026-08-09.md');
const cultureDelta = load('DASHA-CRYPTO-CULTURE-DELTA-2026-08-09.md');
const discovery = load('DASHA-DISCOVERY-INTEGRITY-2026-08-09.md');
const onchain = load('dasha-onchain-check.mjs');
const liveAudit = load('dasha-audit-live.mjs');
const howto = load('dasha-how-to-buy.html');
const jupiterMetadata = JSON.parse(load('dasha-jupiter-metadata.json').text);

// --- AC1: dated research note with multi-topic + sources ---
assert.match(note.text, /2026-08-08/, 'note must be dated');
assert.match(note.text, /## 1\. Markets/, 'markets block');
assert.match(note.text, /## 2\. Tooling stack/, 'stack block');
assert.match(note.text, /## 3\. Crypto community/, 'community block');
assert.match(note.text, /## 4\. Competitors/, 'competitors/distribution block');
assert.match(note.text, /## 5\. Dasha product implications/, 'implications block');

const urls = note.text.match(/https?:\/\/[^\s\)\]>,"']+/g) || [];
assert.ok(urls.length >= 12, `expected ≥12 source URLs, got ${urls.length}`);
assert.ok(urls.some((u) => u.includes('pump.fun')), 'pump primary source');
assert.ok(urls.some((u) => u.includes('galaxy.com')), 'galaxy stack source');
assert.ok(urls.some((u) => /jup\.ag|docs\.jup/.test(u)), 'jupiter source');
assert.ok(urls.some((u) => u.includes('x.com') || u.includes('twitter.com')), 'X source');

// --- AC2: Dasha implications without banned product lies ---
assert.match(note.text, /Home|Studio|Desk|Lobby|Simp/, 'surface implications');
// t.me/dashacommunity may appear only as banned / never recommended
const tgHits = [...note.text.matchAll(/t\.me\/dashacommunity/gi)];
for (const m of tgHits) {
  const ctx = note.text.slice(Math.max(0, m.index - 80), m.index + 80);
  assert.match(ctx, /[Bb]anned|[Nn]ever|not .*HQ|do \*\*not\*\*|must not/i, 'TG path only as ban: ' + ctx);
}
const imp = note.text.split('## 5.')[1] || '';
assert.doesNotMatch(imp, /\bofficial (Dasha )?(coin|token)\b/i, 'no official coin claim');
assert.doesNotMatch(imp, /\bsafe mint\b/i, 'no safe mint product claim');
// "verified mint" only as forbidden language
if (/\bverified mint\b/i.test(imp)) {
  assert.match(imp, /[Nn]ever.*verified mint|verified mint.*as safety|not .*verified mint/i);
}
assert.match(note.text, /no negative coin jokes, warnings, or disclaimers/i, 'current public-copy rule');
assert.doesNotMatch(note.text, /can go to zero|not financial advice|\bNFA\b|association (?:is|≠) not endorsement/i, 'retired negative coin copy returned');

// --- AC3: landscape + psychology updated / supersession ---
assert.match(landscape.text, /DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08/, 'landscape points to new note');
assert.match(landscape.text, /[Ss]upersed/, 'landscape marks supersession');
assert.match(psych.text, /2026-08-08 delta/, 'psychology delta annotated');
assert.match(psych.text, /DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08/, 'psych links new note');

// --- AC4: DASHA-DOCS index ---
assert.match(docs.text, /DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08\.md/, 'docs map indexes note');
const docsRow = docs.text.split('\n').find((l) => l.includes('DASHA-CRYPTO-COMMUNITY-RESEARCH-2026-08-08'));
assert.ok(docsRow && /Current|2026-08-08/.test(docsRow), 'docs row has purpose/status: ' + docsRow);
assert.match(docs.text, /DASHA-CRYPTO-RESEARCH-DELTA-2026-08-09\.md/, 'docs map indexes current research delta');
assert.match(docs.text, /DASHA-CRYPTO-CULTURE-DELTA-2026-08-09\.md/, 'docs map indexes current culture delta');
for (const source of ['support.zora.co', 'creator.fun', 'solanamobile.com', 'doi.org']) {
  assert.match(cultureDelta.text, new RegExp(source.replace('.', '\\.')), `culture delta missing ${source} source`);
}
assert.match(cultureDelta.text, /participation without forced assetization/i, 'culture delta lost its product boundary');
assert.match(cultureDelta.text, /Five genuine eligible creative submissions/, 'culture delta lost the recognition trigger');
assert.match(cultureDelta.text, /do not establish comparable active-user cohorts/i, 'culture delta must qualify provider metrics');
assert.match(currentDelta.text, /13 opens, 8 first edits/, 'current delta must record the latest dated public Studio evidence');
assert.match(cultureDelta.text, /26 starts, 20 completions \(76\.9% aggregate completion\)/, 'culture delta lost the latest quiz evidence');
assert.match(cultureDelta.text, /Automatic discovery, without automatic scoring/, 'culture delta lost the X discovery boundary');
assert.match(cultureDelta.text, /has:media -is:retweet -is:quote/, 'culture delta lost the narrow original-media rule');
assert.match(cultureDelta.text, /Agentic payments are real; a Dasha paywall is not yet a product/, 'culture delta lost the x402 decision');
assert.match(cultureDelta.text, /One concrete external integration request/, 'Studio recipe API trigger must remain demand-gated');
assert.match(cultureDelta.text, /Repeated external calls with measurable marginal cost and a defined paid resource/, 'x402 must remain cost-and-resource gated');
assert.match(currentDelta.text, /Three opens\/edits are synthetic/i, 'current delta must distinguish synthetic task traffic');
assert.match(currentDelta.text, /intercepts that endpoint in both browser contexts/i, 'current delta must preserve production analytics test isolation');
assert.match(currentDelta.text, /Do \*\*not\*\* pivot Dasha into payments/, 'current delta must preserve the evidence-backed product boundary');
assert.match(currentDelta.text, /Recognition must not become compensated promotion/, 'research delta lost the FTC recognition boundary');
assert.match(currentDelta.text, /Posts that recommend trading or make market claims are ineligible for creative points/, 'creative scoring must exclude promotional investment claims');
assert.match(load('dasha-public-copy.mjs').text, /sharing\|posting\|buying\|holding\|purchasing\|liking\|reposting\|retweeting/, 'public-copy gate must reject incentivized promotion and purchase-linked status');
assert.match(load('dasha-onchain-check.mjs').text, /marketQualityObservation/, 'concise onchain receipt must retain bounded market-quality observations');
assert.match(load('dasha-onchain-check.mjs').text, /Token accounts are not unique people or beneficial owners/, 'market-quality observation must retain its ownership caveat');
assert.match(currentDelta.text, /documentation or endpoint residue, not that the end-user product remains available/, 'current delta must distinguish stale platform docs from product availability');
assert.match(currentDelta.text, /webhook delivery is an entitlement to verify, not an architectural assumption/, 'current delta must not conflate pay-per-use streaming with webhook entitlement');
assert.match(currentDelta.text, /application\/PR workflow is deprecated/, 'current delta must use Jupiter V3 discovery rather than the retired application path');
assert.match(currentDelta.text, /github\.com\/jup-ag\/token-list/, 'current delta must cite Jupiter\'s official V3 migration notice');
assert.doesNotMatch(load('DASHA-TASKS-PRIORITIZED.md').text, /The 2026-08-09 release is live and exact-hash verified/, 'dated roadmap must not claim current release parity');
for (const source of ['solana.com', 'docs.x.com', 'docs.phantom.com', 'sec.gov', 'arxiv.org']) {
  assert.match(currentDelta.text, new RegExp(source.replace('.', '\\.')), `current delta missing ${source} source`);
}

// --- AC5: incremental log ---
assert.match(note.text, /## 8\. Research log/, 'append-as-you-go log');
assert.match(note.text, /What landed/, 'log entries');

// --- AC6: current product docs must not send agents back to already-built work ---
assert.doesNotMatch(brief.text, /immediate missing bridge is quiz result/i, 'brief revived completed quiz bridge as missing');
assert.match(brief.text, /six connected public surfaces/, 'brief must count the current public product set');
assert.match(brief.text, /\*\*Chess\*\* — public brackets and replays/, 'brief must include Chess as a current public surface');
assert.match(brief.text, /aggregate-only open, first-edit, export, share-intent/i, 'brief missing current Studio measurement state');
assert.match(roadmap.text, /quiz-result → tailored Studio seeds/, 'roadmap missing built quiz bridge');
assert.match(roadmap.text, /aggregate-only Studio open/, 'roadmap missing built Studio metrics');
assert.match(delta.text, /C2PA Content Credentials 2\.4/, 'provenance research decision missing');
assert.match(delta.text, /Web Share Target API/, 'PWA intake decision missing');
assert.deepEqual(jupiterMetadata, {
  tokenId: '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump',
  website: 'https://www.getdasha.com',
  twitter: 'https://x.com/dash_eats',
});
assert.doesNotMatch(JSON.stringify(jupiterMetadata), /telegram|discord|description|supply/i, 'Jupiter target includes unrequested mutable metadata');
assert.match(onchain.text, /\[METADATA_X, X_PROFILE\]/, 'onchain gate must bridge current source post to intended profile');
assert.match(onchain.text, /jupiterToken\?\.audit\?\.isSus === true/, 'onchain gate must fail only an affirmative Jupiter suspicious flag');
assert.match(onchain.text, /verification === 'banned'.*tags\?\.includes\('banned'\)/, 'onchain gate must fail explicit Jupiter banned signals');
assert.match(onchain.text, /organicActivity: \{ stats6h: jupiterToken\.stats6h \|\| null, stats24h: jupiterToken\.stats24h \|\| null/, 'onchain report must preserve bounded Jupiter organic telemetry');
assert.match(onchain.text, /Never optimize with raids, wash activity, or rewards/, 'organic telemetry needs an anti-gaming boundary');
assert.match(discovery.text, /Organic Score influences[\s\S]*token discovery, verification/, 'discovery owner must explain why Jupiter organic telemetry matters');
assert.match(discovery.text, /Do not game this signal with raids, rewards, wash activity, or a trading leaderboard/, 'discovery owner must reject gaming the provider signal');
assert.match(discovery.text, /affirmative `audit\.isSus === true`/, 'discovery owner must require an affirmative suspicious signal');
assert.match(discovery.text, /Field presence alone is not suspicion/, 'discovery owner must distinguish field presence from an affirmative signal');
assert.match(onchain.text, /metadata account address mismatch/, 'onchain gate must pin the canonical metadata account');
assert.match(onchain.text, /metadata update authority mismatch/, 'onchain gate must pin the decoded metadata authority identity');
assert.match(onchain.text, /unexpected community link/, 'onchain gate must reject immutable metadata community-link drift');
assert.match(onchain.text, /IPFS gateways disagree on metadata bytes/, 'onchain gate must reject contradictory metadata delivery');
assert.match(onchain.text, /IPFS gateways disagree on image bytes/, 'onchain gate must reject contradictory image delivery');
assert.match(onchain.text, /IPFS metadata bytes do not match the pinned digest/, 'onchain gate must pin canonical metadata bytes independently of gateway availability');
assert.match(onchain.text, /IPFS image bytes do not match the pinned digest/, 'onchain gate must pin canonical image bytes independently of gateway availability');
assert.match(onchain.text, /Independent IPFS gateway corroboration is temporarily unavailable/, 'alternate gateway availability must remain observational rather than a hard outage');
assert.match(onchain.text, /phantom\.com\/tokens\/solana\/\$\{MINT\}/, 'onchain gate must read back the linked Phantom token page');
assert.match(onchain.text, /route lost the exact mint after redirects/, 'onchain gate must fail closed on third-party route redirect drift');
assert.match(onchain.text, /api\.jup\.ag\/swap\/v2\/order/, 'onchain gate must use Jupiter current meta-aggregator order API');
assert.doesNotMatch(onchain.text, /ultra-api\.jup\.ag\/order/, 'superseded Jupiter Ultra order endpoint returned');
assert.match(onchain.text, /api\.rugcheck\.xyz\/v1\/tokens\/\$\{MINT\}\/report/, 'onchain gate must read Solflare\'s named risk-data source directly');
assert.match(onchain.text, /Rugcheck does not report immutable metadata/, 'onchain gate must reject a Rugcheck metadata contradiction');
assert.match(onchain.text, /Solana Explorer direct token page identity mismatch/, 'onchain gate must pin the direct Explorer identity');
assert.match(onchain.text, /Solana Explorer exact-mint search does not surface the token/, 'onchain report must separate Explorer search discovery from direct identity');
assert.match(onchain.text, /token-verify-api\.jup\.ag/, 'onchain checker must read the public VRFD queue state');
assert.match(onchain.text, /Pending Jupiter request uses a different X handle than getdasha\.com/, 'onchain report must expose the active request identity conflict');
assert.match(onchain.text, /workflow: 'V4'/, 'onchain output must label the current VRFD workflow');
assert.match(onchain.text, /auditEventId: vrfdAudit\?\.id/, 'onchain output must preserve both public IDs for the same pending submission');
assert.match(onchain.text, /Jupiter VRFD core\/audit \$\{field\} mismatch/, 'onchain gate must reject disagreement between VRFD public views');
assert.match(onchain.text, /holderCountObservations/, 'onchain output must expose conflicting provider holder counts');
assert.match(onchain.text, /GeckoTerminal exact-mint record has no CoinGecko coin ID/, 'onchain output must expose CoinGecko listing absence without treating it as identity failure');
assert.match(onchain.text, /coinGeckoId: geckoToken/, 'onchain report must preserve the exact GeckoTerminal listing bridge');
assert.match(onchain.text, /directIdentityMatched: report\.explorer\.identityMatched/, 'concise receipt must separate Explorer direct identity from search and provider badges');
assert.match(onchain.text, /discoveryActionQueue:[\s\S]*prepared-external[\s\S]*wait-existing-request[\s\S]*externally-gated[\s\S]*monitor-only/, 'concise receipt must classify discovery work by actionability');
assert.match(onchain.text, /Explorer search currently discovers tokens through Jupiter Tokens V2/, 'action queue must encode the current Explorer search dependency');
assert.match(discovery.text, /Phantom is downstream, not another submission lane/, 'discovery owner must reject a nonexistent Phantom verification workflow');
assert.match(discovery.text, /no email address or form for token\s+verification/, 'Phantom provider boundary must cite the absence of a direct correction lane');
assert.match(onchain.text, /process\.argv\.includes\('--summary'\)/, 'onchain checker must offer a concise drift receipt');
for (const field of ['durableIdentity', 'providerIdentity', 'discoveryGaps', 'failures']) assert.match(onchain.text, new RegExp(field), `onchain summary missing ${field}`);
assert.match(onchain.text, /preparedMetadataCorrection/, 'concise drift receipt must expose the minimal correction target');
assert.match(onchain.text, /Submission, payment, support contact, or public posting remains separately authorized/, 'metadata target must not become outbound authority');
assert.match(onchain.text, /MINT_SOURCE_X/, 'onchain checker must distinguish the later exact-mint post from immutable lore metadata');
assert.match(onchain.text, /mintSourceCorroborated/, 'onchain output must report public mint-post corroboration');
assert.match(onchain.text, /comparable: false/, 'provider holder counts must not be presented as interchangeable');
assert.match(onchain.text, /Jupiter dash_eats name search contains/, 'onchain report must expose name\/symbol collisions');
assert.match(onchain.text, /canonicalRank: jupiterNameCanonicalRank/, 'onchain report must expose canonical Jupiter name-search rank');
assert.match(onchain.text, /jupiterToken\?\.audit\?\.isSus === true/, 'onchain gate must fail only an affirmative Jupiter suspicious flag');
assert.doesNotMatch(onchain.text, /Object\.hasOwn\(jupiterToken\?\.audit \|\| \{\}, 'isSus'\)/, 'Jupiter schema presence must not be treated as suspicion');
assert.match(onchain.text, /same-image competing mints/, 'onchain report must expose Explorer image collisions');
assert.match(onchain.text, /dexscreenerProfile/, 'onchain output must preserve mutable Dexscreener profile fields');
assert.match(onchain.text, /Dexscreener profile still exposes Telegram/, 'onchain report must expose the banned external Telegram without treating it as durable identity');
assert.match(discovery.text, /Do not\s+pay for Enhanced Token Info/, 'discovery plan must not buy a second mutable metadata profile');
assert.match(discovery.text, /name discovery is intermittent\/ambiguous/, 'discovery doc must not collapse Explorer identity, search, ranking, and verification');
assert.match(discovery.text, /Jupiter Tokens V2 supplies search candidates[\s\S]*providers supply separate verification readbacks/, 'discovery doc must distinguish Explorer search discovery from provider badges');
assert.match(discovery.text, /Rugcheck presence cannot repair it/, 'discovery doc must reject the stale automatic-Rugcheck search inference');
assert.match(discovery.text, /Do \*\*not\*\* submit a duplicate verification request/, 'discovery plan must account for the existing pending VRFD request');
assert.match(discovery.text, /public VRFD Open surface also exposes[\s\S]*`Update meta`/, 'discovery plan must distinguish Open metadata correction from Express');
assert.match(discovery.text, /does not establish a\s+universal fee for a standalone Standard metadata correction/, 'discovery plan must not invent standalone metadata pricing');
assert.match(discovery.text, /developers\.jup\.ag\/docs\/tokens\/verification/, 'discovery plan must cite the current Express API documentation');
assert.match(discovery.text, /Do not publish the record as verification theater/, 'discovery plan must not overclaim the unadopted sRFC-35 proposal');
assert.match(discovery.text, /every listed URL\s+currently\s+returns 200, omits `noindex`, and declares its own exact canonical URL/, 'discovery doc must distinguish crawl integrity from search-engine inclusion');
assert.match(liveAudit.text, /sitemap-indexable/, 'live audit must verify every sitemap route rather than only route strings');
assert.match(liveAudit.text, /sitemap-social-cards/, 'live audit must verify social-card metadata for every sitemap route');
assert.match(liveAudit.text, /home-sitemap-navigation/, 'live audit must compare Home anchors with the sitemap route set');
assert.match(liveAudit.text, /home-mint-source|howto-mint-source/, 'live audit must preserve the exact public mint-source post');
assert.match(liveAudit.text, /sitemap-html-policy/, 'live audit must verify browser security headers across every sitemap route');
assert.match(liveAudit.text, /sitemap-url-scope/, 'live audit must fail hostile or malformed sitemap URL scope');
assert.match(liveAudit.text, /for \(const \[url, page\] of routePages\)/, 'live crypto-link and claim audit must follow the sitemap route set');
assert.match(liveAudit.text, /jupiter-params/, 'live crypto-link audit must reject undisclosed Jupiter parameters');
assert.match(liveAudit.text, /structured-data-/, 'live audit must treat JSON-LD as a public claim surface on every sitemap route');
assert.match(load('dasha-lobby-worker.mjs').text, /sanitizePublicJsonLd/, 'edge must remove unsupported host-generated structured data');
assert.match(currentDelta.text, /Studio's object also claimed a CC0 license/, 'research delta must record the unsupported hidden crawler claim');
assert.match(currentDelta.text, /OAuth page, an unrelated repository, or an X post/, 'research delta must record the OSS evidence validator gap');
assert.match(currentDelta.text, /X status URL slugs cannot establish authorship/, 'research delta must preserve the post-id versus author-id distinction');
assert.match(currentDelta.text, /fresh random vibe of up to ±8/, 'research delta must record the rerollable rank finding');
assert.match(load('dasha-simp-score.mjs').text, /profile\.quiz\.basePoints \?\? profile\.quiz\.points/, 'quiz rank must prefer accuracy over randomized legacy points');
assert.match(load('dasha-domain-check.mjs').text, /security-\$\{host\}/, 'domain checker must read back every security.txt host');
for (const id of ['http-apex-path-query', 'https-apex-path-query', 'http-www-path-query', 'http-lobby-path-query']) assert.match(load('dasha-domain-check.mjs').text, new RegExp(id), `domain checker must preserve redirect path/query: ${id}`);
assert.match(onchain.text, /method: 'getMultipleAccounts'/, 'onchain checker must read finalized canonical pool vaults');
assert.match(onchain.text, /Token accounts are not unique people or beneficial owners/, 'concentration report must not equate token accounts with people');
assert.match(onchain.text, /frontend-api-v3\.pump\.fun\/coins\/\$\{MINT\}/, 'onchain checker must read Pump coin identity');
assert.match(onchain.text, /Pump finalized creator field mismatch/, 'onchain checker must corroborate the creator through finalized state');
assert.match(onchain.text, /not proof of the current fee recipient, wallet control/, 'creator field must not be presented as project or wallet control');
assert.match(currentDelta.text, /Market reserves are verifiable; “holders” require careful language/, 'research delta must document the market-state semantics');
assert.match(currentDelta.text, /27 quiz starts, 20 completions, 13 Studio opens, eight first\s+edits/, 'research delta must preserve the current aggregate cohort');
assert.match(currentDelta.text, /Web Intents as the simplest permissionless compose path/, 'research delta must record the current X sharing boundary');
assert.match(currentDelta.text, /paid API costs 1000 JUP/, 'research delta must distinguish free VRFD review from paid Express');
assert.match(load('DASHA-DNS-TRUST-2026-08-09.md').text, /apex.*security\.txt.*404/i, 'DNS trust doc must expose the apex disclosure mismatch');
assert.match(load('DASHA-DNS-TRUST-2026-08-09.md').text, /Worker routes require an orange-clouded\/proxied record[\s\S]*DNS\s*only/i, 'DNS trust doc must explain why the apex Worker route cannot run');
assert.doesNotMatch(load('dasha-lobby-wrangler.jsonc').text, /"pattern": "getdasha\.com\/\*"/, 'dead DNS-only apex Worker route returned');
assert.match(load('dasha-lobby-assets-build.mjs').text, /dasha-lobby-wrangler\.jsonc/, 'Worker release hash must cover route configuration');
for (const dependency of ['dasha-lobby-mod.mjs', 'dasha-lobby-x.mjs', 'dasha-simp-actions.mjs', 'dasha-simp-score.mjs']) assert.match(load('dasha-lobby-assets-build.mjs').text, new RegExp(dependency.replaceAll('.', '\\.')), `Worker release hash must cover ${dependency}`);
assert.match(load('dasha-simp-score.mjs').text, /Uuriko\\\/dasha-desk\\\/pull/, 'OSS scorer must require an exact Dasha Desk pull-request URL');
assert.match(load('dasha-public-copy.mjs').text, /locked\|burned\|burnt\|permanent/, 'public claims gate must reject unsupported liquidity permanence');
const identityTrust = load('DASHA-IDENTITY-WALLET-TRUST-2026-08-09.md');
assert.match(identityTrust.text, /same wallet can later prove a badge for another linked X account/, 'wallet reuse boundary must be explicit');
assert.match(identityTrust.text, /holder contributes exactly zero points/, 'wallet privacy decision must remain tied to zero-point rank integrity');
assert.match(delta.text, /Organic Score, price, holders, and tags remain observations/, 'volatile Jupiter discovery fields must not become product claims');
assert.match(delta.text, /CoinGecko listing externally gated/, 'CoinGecko discovery must not invent project-account authority');
assert.match(delta.text, /dasha-jupiter-metadata\.json/, 'product delta must name the prepared metadata artifact');
assert.match(currentDelta.text, /Fresh reads through `ipfs\.io`, `dweb\.link`, and `w3s\.link` returned byte-identical payloads/, 'research delta must document the corroborated IPFS payload baseline');
assert.match(identityTrust.text + load('DASHA-CRYPTO-FRONTEND-THREAT-MODEL-2026-08-09.md').text, /not described as full CID verification/, 'trust docs must not confuse UnixFS CID verification with a simple file digest');
assert.match(delta.text, /live audit now inventories the Webflow host shell/i, 'product delta must document the live executable boundary');
assert.match(liveAudit.text, /export function executionViolations/, 'live audit must reject unexpected executable origins');
assert.match(liveAudit.text, /home-simp-sri/, 'live audit must verify the dynamic Home client SRI pin');
assert.doesNotMatch(howto.text, /"@type"\s*:\s*"HowTo"|SoftwareApplication|aggregateRating|"review"\s*:/, 'retired or unsupported crawler schema returned');

console.log('dasha-crypto-research-docs: PASS');
console.log(JSON.stringify({
  notePath: note.path,
  sourceUrlCount: urls.length,
  sampleSources: [...new Set(urls)].slice(0, 12),
  landscapeSupersession: /Supersed/i.test(landscape.text),
  docsIndexed: true,
  docsRow: docsRow?.slice(0, 160),
}, null, 2));
