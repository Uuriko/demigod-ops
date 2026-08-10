/**
 * Who watches the watchers — unit + subprocess checks for audit/ship tooling.
 * No Puppeteer. Network only for optional negative path (short timeout).
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cryptoClaimViolations, cryptoLinkViolations, executionViolations, extractOgImage, hasCurrentStudio, hasPinnedSimpClient, homeOrphanedRoutes, htmlPolicyViolations, indexabilityViolations, isSoftFail, noteFactory, pngDimensions, publicMetricsViolations, sitemapUrlViolations, sitemapUrls, socialCardViolations, SOFT_LAG, structuredDataViolations } from './dasha-audit-live.mjs';
import { ANON_SOFT_CAP } from './dasha-lobby-x.mjs';

const root = dirname(fileURLToPath(import.meta.url));

// --- pure soft-lag classification ---
assert.equal(isSoftFail('howto-404', false), true);
assert.equal(isSoftFail('howto-404', true), false);
assert.equal(isSoftFail('health-assets-mixed', false), true);
assert.equal(isSoftFail('sitemap-404', false), true);
assert.equal(isSoftFail('robots-empty', false), true);
assert.equal(isSoftFail('broadcast', false), false);
assert.equal(isSoftFail('health', false), false);
assert.ok(SOFT_LAG.has('howto-404'));
assert.ok(SOFT_LAG.has('health-assets-mixed'));
assert.ok(SOFT_LAG.has('desk-shell-stale-chart-label'));

// --- Home social-card parsing/readback primitives ---
assert.equal(
  extractOgImage('<meta content="https://cdn.example/card.png?a=1&amp;b=2" property="og:image">'),
  'https://cdn.example/card.png?a=1&b=2',
);
assert.equal(
  extractOgImage("<meta name='og:image' content='https://cdn.example/reverse.png'>"),
  'https://cdn.example/reverse.png',
);
assert.equal(extractOgImage('<meta property="og:title" content="Dasha">'), '');
assert.deepEqual(sitemapUrls('<urlset><url><loc>https://www.getdasha.com/</loc></url><url><loc>https://www.getdasha.com/studio</loc></url></urlset>'), ['https://www.getdasha.com/', 'https://www.getdasha.com/studio']);
assert.deepEqual(sitemapUrlViolations('<urlset><url><loc>https://www.getdasha.com/</loc></url></urlset>'), []);
assert.deepEqual(sitemapUrls('<urlset><url><loc>https://lobby.getdasha.com/chess</loc></url></urlset>'), ['https://lobby.getdasha.com/chess']);
const hostileSitemap = '<urlset><url><loc>https://evil.example/steal</loc></url><url><loc>http://www.getdasha.com/plain</loc></url><url><loc>https://user:pass@www.getdasha.com/private</loc></url><url><loc>https://www.getdasha.com/#fragment</loc></url><url><loc>https://www.getdasha.com/</loc></url><url><loc>https://www.getdasha.com/</loc></url></urlset>';
assert.deepEqual(sitemapUrls(hostileSitemap), ['https://www.getdasha.com/']);
assert.deepEqual(sitemapUrlViolations(hostileSitemap), [
  'foreign-origin:https://evil.example',
  'foreign-origin:http://www.getdasha.com',
  'non-https:http://www.getdasha.com/plain',
  'url-credentials:https://user:pass@www.getdasha.com/private',
  'url-fragment:https://www.getdasha.com/#fragment',
  'duplicate-url:https://www.getdasha.com/',
]);
assert.deepEqual(homeOrphanedRoutes('<loc>https://www.getdasha.com/</loc><loc>https://www.getdasha.com/studio</loc>', '<a href="/studio">Studio</a>'), []);
assert.deepEqual(homeOrphanedRoutes('<loc>https://www.getdasha.com/</loc><loc>https://www.getdasha.com/studio</loc>', '<a href="/">Home</a>'), ['/studio']);
assert.deepEqual(indexabilityViolations('https://www.getdasha.com/studio', { status: 200, text: '<link href="https://www.getdasha.com/studio" rel="canonical">' }), []);
assert.deepEqual(indexabilityViolations('https://www.getdasha.com/studio', { status: 404, text: '<meta name="robots" content="noindex"><link rel="canonical" href="https://www.getdasha.com/">' }), ['status:404', 'noindex', 'canonical:https://www.getdasha.com/']);
assert.deepEqual(socialCardViolations({ text: '<meta property="og:image" content="https://cdn.example/card.png"><meta name="twitter:card" content="summary_large_image">' }), []);
assert.deepEqual(socialCardViolations({ text: '<meta content="https://cdn.example/card.png" property="og:image"><meta content="summary_large_image" name="twitter:card">' }), []);
assert.deepEqual(socialCardViolations({ text: '<meta property="og:title" content="Dasha">' }), ['og:image', 'twitter:card']);
const secureHeaders = new Headers({
  'strict-transport-security': 'max-age=31536000',
  'x-frame-options': 'DENY',
  'content-security-policy': "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
});
assert.deepEqual(htmlPolicyViolations({ headers: secureHeaders }), []);
assert.deepEqual(htmlPolicyViolations({ headers: new Headers() }), ['hsts', 'frame', 'csp', 'nosniff', 'referrer', 'permissions']);
const png = Buffer.alloc(24);
Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
png.writeUInt32BE(1200, 16);
png.writeUInt32BE(630, 20);
assert.deepEqual(pngDimensions(png), { width: 1200, height: 630 });
assert.equal(pngDimensions(Buffer.from('not png')), null);

// --- live executable-origin inventory ---
const webflowRuntime = '<script src="https://cdn.prod.website-files.com/5f1458122ba25e70a3ff2bd0/js/webflow.schunk.abc123.js"></script>';
const pinnedClient = '<script src="https://lobby.getdasha.com/client/studio.js" integrity="sha384-abc=" crossorigin="anonymous"></script>';
assert.deepEqual(executionViolations(webflowRuntime + pinnedClient), []);
assert.deepEqual(executionViolations('<script src="https://evil.example/drain.js"></script>'), ['https://evil.example/drain.js']);
assert.deepEqual(executionViolations('<script src="https://lobby.getdasha.com/client/studio.js"></script>'), ['https://lobby.getdasha.com/client/studio.js']);
assert.deepEqual(executionViolations('<iframe src="https://example.com"></iframe>'), ['iframe']);
assert.equal(hasPinnedSimpClient("s.integrity='sha384-abc=';s.crossOrigin='anonymous'"), true);
assert.equal(hasPinnedSimpClient("const SIMP_SRI='sha384-abc=';s.integrity=SIMP_SRI;s.crossOrigin='anonymous'"), true);
assert.equal(hasPinnedSimpClient("s.src='https://lobby.getdasha.com/client/simp-board.js'"), false);
assert.equal(hasCurrentStudio('<p>Dasha Meme Studio</p><script src="https://lobby.getdasha.com/client/studio.js" integrity="sha384-abc="></script>'), true);
assert.equal(hasCurrentStudio('<div class="dasha-studio-embed"></div><p>Dasha Meme Studio</p><script>host.attachShadow({ mode: \'open\' })</script>'), true);
assert.equal(hasCurrentStudio('<p>Dasha Meme Studio</p>'), false);

// --- crypto route identity + external-tab isolation ---
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const safeBuy = `<a target="_blank" rel="noopener noreferrer" href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&amp;buy=${mint}">Buy</a>`;
assert.deepEqual(cryptoLinkViolations(safeBuy), []);
assert.deepEqual(cryptoLinkViolations(safeBuy.replace(mint, 'FakeMint')), [`jupiter-mint:https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=FakeMint`]);
assert.deepEqual(cryptoLinkViolations(safeBuy.replace('">Buy', '&amp;ref=hidden">Buy')), [`jupiter-params:https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${mint}&ref=hidden`]);
assert.deepEqual(cryptoLinkViolations(safeBuy.replace('">Buy', `&amp;buy=${mint}">Buy`)), [`jupiter-params:https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${mint}&buy=${mint}`]);
assert.deepEqual(cryptoLinkViolations(safeBuy.replace('noopener noreferrer', '')), [`unsafe-new-tab:https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${mint}`]);
assert.deepEqual(cryptoLinkViolations('<a href="https://dexscreener.com/solana/pool">Chart</a>'), ['dexscreener-profile:https://dexscreener.com/solana/pool']);
assert.deepEqual(structuredDataViolations('<script type="application/ld+json">{"@type":"WebSite"}</script>'), []);
assert.deepEqual(structuredDataViolations('<script type="application/ld+json">{bad}</script>'), ['invalid-json:1']);
assert.deepEqual(structuredDataViolations('<script type="application/ld+json">{"@type":"SoftwareApplication","license":"https://creativecommons.org/publicdomain/zero/1.0/"}</script>'), ['hidden-app-schema:SoftwareApplication', 'license-claim:https://creativecommons.org/publicdomain/zero/1.0/']);
assert.deepEqual(structuredDataViolations('<script type="application/ld+json">{"@type":"WebSite"}</script><script type="application/ld+json">{"@type":"WebSite"}</script>'), ['duplicate-website']);
assert.deepEqual(cryptoClaimViolations('<p>Make something. Pass it on.</p>'), []);
assert.deepEqual(cryptoClaimViolations('<p>Guaranteed profit.</p>'), ['Guaranteed profit']);
assert.deepEqual(cryptoClaimViolations('<p>Official $dasha coin.</p>'), ['Official $dasha coin']);
assert.deepEqual(cryptoClaimViolations('<p>SEC protected.</p>'), ['SEC protected']);
assert.deepEqual(cryptoClaimViolations('<p>Earn 25 points for sharing $dasha.</p>'), ['Earn 25 points for sharing']);
assert.deepEqual(cryptoClaimViolations('<p>Post about $dasha and get points.</p>'), ['Post about $dasha and get points']);
for (const claim of ['Holders get 10 points', '10 points for holding', 'Buy $dasha and earn rank', 'Purchasers receive early access']) {
  assert.deepEqual(cryptoClaimViolations(`<p>${claim}</p>`), [claim], `purchase-linked status escaped: ${claim}`);
}
assert.deepEqual(cryptoClaimViolations('<p>Quiz points come from correct answers.</p>'), []);
assert.deepEqual(cryptoClaimViolations('<p>Holder badge verified for 28 days.</p>'), []);
for (const claim of ['Fixed supply', 'Liquidity is locked', 'Burned LP tokens', 'Ownership renounced']) {
  assert.deepEqual(cryptoClaimViolations(`<p>${claim}</p>`), [claim], `unsupported permanence claim escaped: ${claim}`);
}
assert.deepEqual(cryptoClaimViolations('<p>Mint and freeze authorities are null.</p>'), [], 'precise authority state must not be confused with permanence theater');

// --- public funnel privacy + suppression contract ---
const publicMetrics = {
  ok: true,
  since: '2026-08-09T04:27:20.884Z',
  completionSince: '2026-08-09T12:00:00.000Z',
  threshold: 5,
  studio: { opens: 8, firstEdits: null, openToEdit: null, completions: null, editToCompletion: null, exports: null, editToExport: null, shareIntents: null, shareApiResolutions: null },
  quiz: { starts: 10, completions: 10, startToComplete: 1, replays: null, shareIntents: null, completeToShareIntent: null },
  chess: { pageOpens: null, buyIntents: null, pageOpenToBuyIntent: null, gamesStarted: null, gamesCompleted: null, gameStartToComplete: null, rematchesOffered: null, rematchesAccepted: null, rematchOfferToAccept: null, replayOpens: null, replayPlayIntents: null, replayOpenToPlay: null, replayShareIntents: null, replayShareHandoffs: null, replayShareIntentToHandoff: null, completionToReplayShare: null, challengesCreated: null, challengesAccepted: null, challengeCreateToAccept: null, challengeShareIntents: null, tournamentsCreated: null, tournamentJoins: null, tournamentsStarted: null, tournamentsCompleted: null, tournamentShareIntents: null },
  limits: 'Aggregate events only; cells below 5 and non-comparable ratios are suppressed and are not unique-user conversion or retention.',
};
assert.deepEqual(publicMetricsViolations(publicMetrics), []);
assert.deepEqual(publicMetricsViolations({ ...publicMetrics, wallet: 'leak' }), ['root:wallet']);
assert.deepEqual(publicMetricsViolations({ ...publicMetrics, studio: { ...publicMetrics.studio, exports: 4 } }), ['studio:exports:unsuppressed']);
assert.deepEqual(publicMetricsViolations({ ...publicMetrics, chess: { ...publicMetrics.chess, completionToReplayShare: 1.2 } }), ['chess:completionToReplayShare:ratio']);
assert.deepEqual(publicMetricsViolations({ ...publicMetrics, limits: 'conversion' }), ['limits']);

// --- noteFactory hard vs soft ---
{
  const state = { checks: [], hard: [], soft: [] };
  const note = noteFactory(state, { isStrict: false });
  note('site', 'howto-404', false);
  note('worker', 'health', false);
  note('site', 'home-mint', true);
  assert.deepEqual(state.soft, ['howto-404']);
  assert.deepEqual(state.hard, ['health']);
  assert.equal(state.checks.length, 3);
}
{
  const state = { checks: [], hard: [], soft: [] };
  const note = noteFactory(state, { isStrict: true });
  note('site', 'howto-404', false);
  assert.deepEqual(state.hard, ['howto-404']);
  assert.deepEqual(state.soft, []);
}

// --- soft-cap constant must match product ---
assert.equal(ANON_SOFT_CAP, 75);

// --- ship/audit files present ---
for (const f of [
  'dasha-audit-live.mjs',
  'dasha-ship.mjs',
  'dasha-live-verify.mjs',
  'dasha-lobby-live.test.mjs',
  'dasha-lobby-assets-build.mjs',
  'dasha-lobby-embed-build.mjs',
  'dasha-simp-board-embed-build.mjs',
]) {
  assert.ok(existsSync(join(root, f)), `missing ${f}`);
}

// --- package scripts wire audit ---
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(pkg.scripts['dasha:audit:live'], 'node dasha-audit-live.mjs');
assert.equal(pkg.scripts['dasha:audit:live:fast'], 'node dasha-audit-live.mjs --fast');
assert.match(pkg.scripts['dasha:audit'], /dasha-audit-live/);
assert.match(pkg.scripts['dasha:verify:live'], /dasha-live-verify/);

// --- ship verify delegates to audit ---
const ship = readFileSync(join(root, 'dasha-ship.mjs'), 'utf8');
assert.match(ship, /dasha-audit-live\.mjs/);
assert.match(ship, /readbackSurface|push:readback/);
assert.match(ship, /extractEmbedCode/);
const audit = readFileSync(join(root, 'dasha-audit-live.mjs'), 'utf8');
assert.match(audit, /home-og-card-current/);
assert.match(audit, /home-sitemap-navigation/);
assert.match(audit, /dasha-worker-assets\/og\/dasha-social-card\.png/);
assert.match(audit, /simp-result-card/);
assert.match(audit, /Twitterbot\/1\.0/);
assert.match(audit, /public-metrics/);
assert.match(audit, /if \(!keepOpen\) ws\.terminate\(\)/, 'failed audit sockets must be terminated');
assert.match(audit, /args\.has\('--protocol'\)/, 'mutating production protocol audit must be explicit');
assert.match(audit, /!protocol/, 'default live audit must remain read-only');

// --- live-verify is thin wrapper ---
const wrap = readFileSync(join(root, 'dasha-live-verify.mjs'), 'utf8');
assert.match(wrap, /dasha-audit-live/);

// --- lobby live test respects join cooldown ---
const live = readFileSync(join(root, 'dasha-lobby-live.test.mjs'), 'utf8');
assert.match(live, /JOIN_COOLDOWN|joinCooldownRemainingMs/);
assert.match(live, /client\/lobby\.js/);
assert.doesNotMatch(
  live,
  /dasha-lobby-live: PASS'[\s\S]{0,120}process\.exit\(0\)/,
  'success must reach socket cleanup',
);

// --- negative: dead host must fail fast (not hang) ---
{
  const r = spawnSync(
    process.execPath,
    ['dasha-audit-live.mjs', '--fast'],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        DASHA_LIVE_BASE: 'https://127.0.0.1:9',
        LOBBY_URL: 'https://127.0.0.1:9',
        DASHA_AUDIT_FETCH_MS: '800',
      },
      timeout: 20000,
    },
  );
  assert.notEqual(r.status, 0, 'dead host must exit non-zero');
  let report;
  try {
    report = JSON.parse(r.stdout || '{}');
  } catch {
    report = null;
  }
  assert.ok(report, 'dead host still prints JSON');
  assert.equal(report.ok, false);
  assert.ok(Array.isArray(report.hard) && report.hard.length > 0, 'hard fails listed');
  assert.ok(report.ms < 15000, `dead host hung? ms=${report.ms}`);
}

// --- real smoke: tool result and exit code agree, even while a release is intentionally stale ---
{
  const r = spawnSync(process.execPath, ['dasha-audit-live.mjs', '--fast'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
  });
  const report = JSON.parse(r.stdout);
  assert.ok(r.status === 0 || r.status === 1, `live fast audit crashed: ${(r.stderr || '').slice(-500)}`);
  assert.equal(r.status === 0, report.announceReady);
  assert.equal(report.ok, report.announceReady);
  assert.ok(Array.isArray(report.hard));
  assert.ok(report.checks?.length > 10, 'enough checks ran');
  // protocol must be skipped in --fast
  assert.ok(report.checks.some((c) => c.id === 'skipped' && c.layer === 'protocol'));
}

console.log('dasha-audit-tools: PASS');
