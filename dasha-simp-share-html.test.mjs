#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import {
  LIVE_SIMP_BOARD_SRI,
  challengeRedirectPath,
  isRetiredSeoPath,
  privacyPageHtml,
  quizRedirectPath,
  simpMemberBadgeSvg,
  simpMemberHtml,
  simpPageHtml,
  simpResultHtml,
} from './dasha-simp-share-html.mjs';
import edgeWorker from './dasha-lobby-worker.mjs';
import { simpMemberOgPng } from './dasha-handoff-og.mjs';
import { SIMP_BOARD_SRI } from './dasha-lobby-static-gen.mjs';

const id = 'xvojI8Cdg8B6';
const page = simpPageHtml();
assert.match(page, /og:image/);
assert.match(page, /twitter:card" content="summary_large_image"/);
assert.match(page, /theme-color" content="#dfff00"/);
assert.match(page, /canonical" href="https:\/\/www\.getdasha\.com\/simp"/);
assert.ok(page.includes(LIVE_SIMP_BOARD_SRI), 'page pins live simp-board SRI');
assert.match(page, /<main>\s*<h1>Simp<\/h1>/, 'simp first paint must have a main landmark');
assert.match(page, /class="skip-link" href="#dasha-quiz"/, 'simp first visit must skip chrome to the quiz');
assert.match(page, /href="https:\/\/www\.getdasha\.com\/how-to-buy">How to buy</, 'simp first visit must link How to buy');
assert.match(page, /href="https:\/\/www\.getdasha\.com\/privacy">Privacy</, 'simp first visit must link Privacy');
assert.doesNotMatch(page, /\?challenge=/);

const html = simpResultHtml({ id, title: 'Dasha simp', correct: 9, total: 28 });
assert.match(html, /og:title" content="Beat 9\/28 · Dasha simp"/);
assert.doesNotMatch(html, /Still loading/);
assert.match(html, /class="dasha-start"[^>]*>Start/);
assert.match(html, /simp\/card\/quiz\.png/);
assert.match(html, /canonical" href="https:\/\/www\.getdasha\.com\/simp\/r\/xvojI8Cdg8B6"/);
assert.doesNotMatch(html, /\?challenge=/);
assert.match(html, /theme-color" content="#dfff00"/);
assert.match(html, /dasha-share/);
assert.match(html, /class="dasha-share"[^>]*data-image="https:\/\/lobby\.getdasha\.com\/simp\/card\/quiz\.png"/);
assert.match(html, /navigator\.canShare\(\{files:\[card\]\}\)/);
assert.match(html, /blob\.type==='image\/png'&&blob\.size>0&&blob\.size<=1000000/);
assert.match(html, /copy-timeout/, 'share-card copy must time out hung writeText');
assert.match(html, /withTimeout\(navigator\.clipboard\.writeText\(text\),800\)/, 'share writeText must be raced at 800ms');
assert.ok(html.includes(LIVE_SIMP_BOARD_SRI));
const resultScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const resultShareScript = resultScripts[1];
assert.equal(resultScripts.length, 2);
async function runResultShare(share, { fileShare = false, blob = { type: 'image/png', size: 4379 } } = {}) {
  let click, shared = null, copied = null;
  const attrs = {
    'data-title': 'Beat 9/28 · Dasha simp',
    'data-text': 'Beat 9/28 · Dasha simp\nBeat this\n$dasha\nhttps://www.getdasha.com/simp/r/xvojI8Cdg8B6',
    'data-url': 'https://www.getdasha.com/simp/r/xvojI8Cdg8B6',
    'data-image': 'https://lobby.getdasha.com/simp/card/quiz.png',
  };
  const button = { getAttribute: name => attrs[name], addEventListener: (_type, fn) => { click = fn; } };
  class MockFile {
    constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
  }
  runInNewContext(resultShareScript, {
    document: { querySelector: () => button },
    navigator: {
      ...(share ? { share: data => { shared = data; return share(data); } } : {}),
      ...(fileShare ? { canShare: data => Array.isArray(data.files) && data.files.length === 1 } : {}),
      clipboard: { writeText: text => { copied = text; return Promise.resolve(); } },
    },
    fetch: fileShare ? async () => ({ ok: true, blob: async () => blob }) : undefined,
    File: fileShare ? MockFile : undefined,
    setTimeout: () => 1,
    Promise,
    Error,
  });
  await new Promise(resolve => setImmediate(resolve));
  click();
  await new Promise(resolve => setImmediate(resolve));
  return { shared, copied, attrs };
}
const resultFileShare = await runResultShare(() => Promise.resolve(), { fileShare: true });
assert.equal(resultFileShare.shared.files[0].name, 'dasha-quiz-xvojI8Cdg8B6.png');
assert.equal(resultFileShare.shared.files[0].type, 'image/png');
assert.equal(resultFileShare.shared.url, resultFileShare.attrs['data-url']);
assert.equal(resultFileShare.copied, null);
const resultInvalidCard = await runResultShare(() => Promise.resolve(), { fileShare: true, blob: { type: 'text/html', size: 20 } });
assert.equal(resultInvalidCard.shared.files, undefined);
const resultCancelled = await runResultShare(() => Promise.reject({ name: 'AbortError' }));
assert.equal(resultCancelled.copied, null);
const resultBlocked = await runResultShare(() => Promise.reject({ name: 'NotAllowedError' }));
assert.equal(resultBlocked.copied, resultBlocked.attrs['data-text']);
const resultNoShare = await runResultShare(null);
assert.equal(resultNoShare.copied, resultNoShare.attrs['data-text']);

const memberHtml = simpMemberHtml({
  handle: 'Maker_7',
  rank: 52,
  total: 25,
  components: { linked_x: 10, quiz: 15, creative: 0, community: 0, connector: 0, oss: 0, donate: 0, holder: 0 },
  holder: true,
  badges: ['linked', 'maker', 'remixer', 'holder', 'unknown', 'maker'],
  quiz: { correct: 8, total: 10, title: 'ignored stored title' },
  spotlight: { platform: 'ignored', url: 'https://www.github.com/Maker/' },
});
assert.match(memberHtml, /<title>@Maker_7 · #52 on the \$dasha Simp Board<\/title>/);
assert.match(memberHtml, /canonical" href="https:\/\/www\.getdasha\.com\/simp\/u\/maker_7"/);
assert.match(memberHtml, /25 Simp Points · Confirmed simp · 8\/10 · current measured rank\./);
assert.match(memberHtml, /<p class="breakdown" aria-label="Simp Point breakdown">X 10 · Quiz 15<\/p>/);
assert.match(memberHtml, /<p class="earned" aria-label="Earned badges">Maker · Remixer<\/p>/);
assert.doesNotMatch(memberHtml, /unknown|>Linked ·|>Holder ·/);
assert.match(memberHtml, /data-text="[^"]*Confirmed simp · 8\/10/);
assert.match(memberHtml, /<span class="holder">Holder proof current<\/span> · <a href="https:\/\/www\.getdasha\.com\/chess">Rated chess<\/a> · <a href="https:\/\/www\.getdasha\.com\/lobby">500-char chat<\/a>/);
assert.match(memberHtml, /href="https:\/\/www\.getdasha\.com\/simp#member-maker_7"/);
assert.match(memberHtml, /href="https:\/\/github\.com\/Maker"[^>]*nofollow ugc[^>]*>GitHub Spotlight ↗<\/a>/);
assert.match(memberHtml, /<summary>GitHub badge<\/summary>/);
assert.match(memberHtml, /\[!\[@Maker_7 is #52 on the \$dasha Simp Board, holder check current\]\(https:\/\/www\.getdasha\.com\/simp\/u\/maker_7\/badge\.svg\)\]\(https:\/\/www\.getdasha\.com\/simp\/u\/maker_7\)/);
assert.match(memberHtml, /og:image:alt" content="@Maker_7 · #52 on the \$dasha Simp Board · holder check current"/);
assert.match(memberHtml, /id="dasha-badge-copy"[^>]*>Copy badge<\/button>/);
assert.match(memberHtml, /id="dasha-member-share"[^>]*>Share rank<\/button>/);
assert.match(memberHtml, /id="dasha-member-share"[^>]*data-image="https:\/\/www\.getdasha\.com\/simp\/u\/maker_7\/card\.png"/);
assert.match(memberHtml, /fetch\(image,\{cache:'force-cache'\}\)/);
assert.match(memberHtml, /blob\.type==='image\/png'&&blob\.size>0&&blob\.size<=1000000/);
assert.match(memberHtml, /navigator\.canShare\(\{files:\[card\]\}\)/);
assert.match(memberHtml, /navigator\.clipboard\.writeText\(t\.value\)/);
assert.match(memberHtml, /copy-timeout[\s\S]*800/);
assert.match(memberHtml, /function select\(\)\{t\.focus\(\);t\.select\(\)/, 'blocked clipboard must leave selectable Markdown');
assert.doesNotMatch(memberHtml, /execCommand/);
assert.match(memberHtml, /twitter:card" content="summary_large_image"/);
assert.match(memberHtml, /og:image" content="https:\/\/www\.getdasha\.com\/simp\/u\/maker_7\/card\.png"/);
assert.match(memberHtml, /og:image:width" content="600"/);
assert.match(memberHtml, /og:image:height" content="314"/);
const profileJsonLd = JSON.parse(memberHtml.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
assert.deepEqual(profileJsonLd, {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: '@Maker_7',
    alternateName: 'Maker_7',
    url: 'https://www.getdasha.com/simp/u/maker_7',
    description: '25 Simp Points · Confirmed simp · 8/10 · current measured rank.',
    image: 'https://www.getdasha.com/simp/u/maker_7/card.png',
    sameAs: ['https://x.com/maker_7'],
  },
});
assert.deepEqual(profileJsonLd.mainEntity.sameAs, ['https://x.com/maker_7'], 'only the OAuth-proven X identity belongs in sameAs');
assert.ok(!profileJsonLd.mainEntity.sameAs.some(url => url.includes('github.com')), 'unverified Spotlight must not become identity metadata');
const memberScripts = [...memberHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const [badgeScript, memberShareScript] = memberScripts;
assert.equal(memberScripts.length, 2);
async function runBadgeCopy(writeText) {
  let click, focused = false, selected = false;
  const button = { textContent: 'Copy badge', disabled: false, addEventListener: (_type, fn) => { click = fn; } };
  const textarea = { value: 'badge markdown', focus: () => { focused = true; }, select: () => { selected = true; } };
  runInNewContext(badgeScript, {
    document: { getElementById: id => id === 'dasha-badge-copy' ? button : id === 'dasha-badge-markdown' ? textarea : null },
    navigator: { clipboard: { writeText } },
    setTimeout: () => 1,
    Promise,
    Error,
  });
  click();
  await new Promise(resolve => setImmediate(resolve));
  return { button, focused, selected };
}
let copied = '';
const copyPass = await runBadgeCopy(value => { copied = value; return Promise.resolve(); });
assert.equal(copied, 'badge markdown');
assert.equal(copyPass.button.textContent, 'Copied');
const copyFallback = await runBadgeCopy(() => Promise.reject(new Error('blocked')));
assert.equal(copyFallback.focused && copyFallback.selected, true);
assert.equal(copyFallback.button.textContent, 'Selected — copy');
async function runMemberShare(share, { fileShare = false, blob = { type: 'image/png', size: 4379 } } = {}) {
  let click, shared = null, opened = null;
  const attrs = {
    'data-title': '@Maker_7 · #52 on the $dasha Simp Board',
    'data-text': '@Maker_7 · #52 on the $dasha Simp Board\n25 Simp Points · current measured rank.\n$dasha',
    'data-url': 'https://www.getdasha.com/simp/u/maker_7',
    'data-image': 'https://www.getdasha.com/simp/u/maker_7/card.png',
  };
  const button = { addEventListener: (_type, fn) => { click = fn; }, getAttribute: name => attrs[name] };
  class MockFile {
    constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
  }
  runInNewContext(memberShareScript, {
    document: { getElementById: id => id === 'dasha-member-share' ? button : null },
    navigator: share ? {
      share: data => { shared = data; return share(data); },
      ...(fileShare ? { canShare: data => Array.isArray(data.files) && data.files.length === 1 } : {}),
    } : {},
    window: { open: (...args) => { opened = args; } },
    fetch: fileShare ? async () => ({ ok: true, blob: async () => blob }) : undefined,
    File: fileShare ? MockFile : undefined,
    encodeURIComponent,
    Error,
  });
  await new Promise(resolve => setImmediate(resolve));
  click();
  await new Promise(resolve => setImmediate(resolve));
  return { shared, opened, attrs };
}
const nativeShare = await runMemberShare(() => Promise.resolve());
assert.equal(JSON.stringify(nativeShare.shared), JSON.stringify({
  title: nativeShare.attrs['data-title'],
  text: nativeShare.attrs['data-text'],
  url: nativeShare.attrs['data-url'],
}));
assert.equal(nativeShare.opened, null);
const nativeFileShare = await runMemberShare(() => Promise.resolve(), { fileShare: true });
assert.equal(nativeFileShare.shared.files[0].name, 'dasha-simp-maker_7.png');
assert.equal(nativeFileShare.shared.files[0].type, 'image/png');
assert.equal(nativeFileShare.shared.url, nativeFileShare.attrs['data-url']);
const invalidFileShare = await runMemberShare(() => Promise.resolve(), { fileShare: true, blob: { type: 'text/html', size: 20 } });
assert.equal(invalidFileShare.shared.files, undefined);
const oversizedFileShare = await runMemberShare(() => Promise.resolve(), { fileShare: true, blob: { type: 'image/png', size: 1000001 } });
assert.equal(oversizedFileShare.shared.files, undefined);
const xFallback = await runMemberShare(null);
assert.equal(xFallback.opened[1], '_blank');
assert.equal(new URL(xFallback.opened[0]).searchParams.get('text'), xFallback.attrs['data-text'] + '\n' + xFallback.attrs['data-url']);
const cancelledShare = await runMemberShare(() => Promise.reject({ name: 'AbortError' }));
assert.equal(cancelledShare.opened, null);
const blockedShare = await runMemberShare(() => Promise.reject({ name: 'NotAllowedError' }));
assert.match(blockedShare.opened[0], /^https:\/\/x\.com\/intent\/post\?text=/);
assert.doesNotMatch(simpMemberHtml({ handle: 'maker', rank: 2, total: 25, spotlight: { url: 'https://evil.example/maker' } }), /evil\.example/);
assert.doesNotMatch(simpMemberHtml({ handle: 'maker', rank: 2, total: 25, holder: false }), /class="holder"|\/chess|\/lobby/);
assert.doesNotMatch(simpMemberHtml({ handle: 'maker', rank: 2, total: 25, quiz: { correct: 99, total: 1, title: 'OWNED' } }), /OWNED/);
assert.doesNotMatch(simpMemberHtml({ handle: 'maker', rank: 2, total: 25, components: { linked_x: 10, oss: 999 } }), /class="breakdown"/,
  'an inconsistent upstream breakdown must not make a misleading public claim');
assert.throws(() => simpMemberHtml({ handle: '../maker', rank: 2, total: 25 }));
assert.throws(() => simpMemberHtml({ handle: 'maker', rank: 1, total: 25 }));
assert.throws(() => simpMemberHtml({ handle: 'maker', rank: 2, total: -1 }));

const badge = simpMemberBadgeSvg({ handle: 'Maker_7', rank: 52, total: 25, holder: true });
assert.match(badge, /^<svg[^>]*role="img"[^>]*aria-labelledby="title"/);
assert.match(badge, /<title id="title">@Maker_7 is #52 on the \$dasha Simp Board · holder check current<\/title>/);
assert.match(badge, /\$dasha SIMP · HOLDER/);
assert.match(badge, /@Maker_7 · #52 · 25 PTS/);
assert.doesNotMatch(badge, /<script|foreignObject|href=/i);
assert.throws(() => simpMemberBadgeSvg({ handle: '<script>', rank: 2, total: 25 }));

const publicMember = { handle: 'Maker_7', rank: 52, total: 25, components: { linked_x: 10, quiz: 15 }, holder: true, badges: ['linked', 'maker'], quiz: { correct: 8, total: 10, title: 'Confirmed simp' }, spotlight: { platform: 'GitHub', url: 'https://github.com/Maker' } };
const memberEnv = (found) => ({
  LOBBY: {
    idFromName: () => 'public',
    get: () => ({
      fetch: async (request) => found && new URL(request.url).pathname === '/simp/member/maker_7'
        ? new Response(JSON.stringify({ ok: true, member: publicMember }), { status: 200 })
        : new Response(JSON.stringify({ error: 'member not found' }), { status: 404 }),
    }),
  },
});
const memberResponse = await edgeWorker.fetch(new Request('https://www.getdasha.com/simp/u/MAKER_7'), memberEnv(true));
assert.equal(memberResponse.status, 200);
assert.equal(memberResponse.headers.get('x-dasha-edge'), 'simp-member-share');
assert.match(await memberResponse.clone().text(), /aria-label="Earned badges">Maker<\/p>/);
assert.match(await memberResponse.text(), /@Maker_7 · #52[\s\S]*Confirmed simp · 8\/10[\s\S]*X 10 · Quiz 15[\s\S]*Holder proof current[\s\S]*Rated chess[\s\S]*500-char chat[\s\S]*GitHub Spotlight/);
const badgeResponse = await edgeWorker.fetch(new Request('https://www.getdasha.com/simp/u/MAKER_7/badge.svg'), memberEnv(true));
assert.equal(badgeResponse.status, 200);
assert.equal(badgeResponse.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
assert.equal(badgeResponse.headers.get('cross-origin-resource-policy'), 'cross-origin');
assert.equal(badgeResponse.headers.get('x-dasha-edge'), 'simp-member-badge');
assert.match(await badgeResponse.text(), /@Maker_7 · #52 · 25 PTS/);
const memberCardResponse = await edgeWorker.fetch(new Request('https://www.getdasha.com/simp/u/MAKER_7/card.png'), memberEnv(true));
assert.equal(memberCardResponse.status, 200);
assert.equal(memberCardResponse.headers.get('content-type'), 'image/png');
assert.equal(memberCardResponse.headers.get('cross-origin-resource-policy'), 'cross-origin');
assert.equal(memberCardResponse.headers.get('x-dasha-edge'), 'simp-member-card');
const memberCard = Buffer.from(await memberCardResponse.arrayBuffer());
assert.equal(memberCard.subarray(1, 4).toString(), 'PNG');
assert.deepEqual([memberCard.readUInt32BE(16), memberCard.readUInt32BE(20)], [600, 314]);
assert.ok(memberCard.length > 800, 'member card is unexpectedly empty');
assert.notDeepEqual(
  Buffer.from(await simpMemberOgPng({ handle: 'Maker_7', rank: 52, total: 25, holder: false })),
  memberCard,
  'member card must show a current holder mark',
);
assert.notDeepEqual(
  Buffer.from(await simpMemberOgPng({ handle: 'Maker_7', rank: 53, total: 26 })),
  memberCard,
  'member card must change with current rank and points',
);
assert.notDeepEqual(
  Buffer.from(await simpMemberOgPng({ handle: 'Maker_7', rank: 52, total: 25, holder: true, quiz: { correct: 4, total: 10, title: 'ignored' } })),
  memberCard,
  'member card must show the derived earned quiz title',
);
assert.deepEqual(
  Buffer.from(await simpMemberOgPng({ handle: 'Maker_7', rank: 52, total: 25, holder: true, quiz: { correct: 99, total: 1, title: 'OWNED' } })),
  Buffer.from(await simpMemberOgPng({ handle: 'Maker_7', rank: 52, total: 25, holder: true })),
  'invalid or stored quiz title text must not affect the card',
);
await assert.rejects(() => simpMemberOgPng({ handle: '../maker', rank: 2, total: 25 }));
const missingMemberResponse = await edgeWorker.fetch(new Request('https://www.getdasha.com/simp/u/missing'), memberEnv(false));
assert.equal(missingMemberResponse.status, 404);
assert.equal(missingMemberResponse.headers.get('x-robots-tag'), 'noindex, nofollow');
const missingBadgeResponse = await edgeWorker.fetch(new Request('https://www.getdasha.com/simp/u/missing/badge.svg'), memberEnv(false));
assert.equal(missingBadgeResponse.status, 404);
assert.equal(missingBadgeResponse.headers.get('x-dasha-edge'), 'simp-member-badge-missing');
const missingMemberCardResponse = await edgeWorker.fetch(new Request('https://www.getdasha.com/simp/u/missing/card.png'), memberEnv(false));
assert.equal(missingMemberCardResponse.status, 404);
assert.equal(missingMemberCardResponse.headers.get('x-dasha-edge'), 'simp-member-card-missing');

assert.equal(quizRedirectPath(), '/simp');
assert.equal(LIVE_SIMP_BOARD_SRI, SIMP_BOARD_SRI, 'share pages must import the generated Simp client pin');
const liveVerifier = readFileSync(new URL('./dasha-live-verify.mjs', import.meta.url), 'utf8');
assert.match(liveVerifier, /import \{[^}]*\bSIMP_BOARD_SRI\b[^}]*\} from '\.\/dasha-lobby-static-gen\.mjs'/);
assert.match(liveVerifier, /boardPin === SIMP_BOARD_SRI && boardServed === SIMP_BOARD_SRI/);
assert.match(liveVerifier, /assert\.equal\(boardSriPrepared, true/);
for (const trap of ['/airdrop', '/earn', '/claim', '/rally']) {
  assert.equal(isRetiredSeoPath(trap), true, trap);
}
assert.equal(isRetiredSeoPath('/faucet'), false);
const privacy = privacyPageHtml();
assert.match(privacy, /<h1>Privacy<\/h1>/);
assert.match(privacy, /<main>\s*<h1>Privacy<\/h1>/, 'privacy first paint must have a main landmark');
assert.match(privacy, /theme-color" content="#dfff00"/);
assert.match(privacy, /canonical" href="https:\/\/www\.getdasha\.com\/privacy"/);

const faucet = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-faucet-page.html'), 'utf8');
assert.match(faucet, /og:title" content="\$dasha \/ free \$dasha"/);
const faucetClient = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-faucet-client.js'), 'utf8');
assert.match(faucetClient, /'free \$dasha'/);
assert.doesNotMatch(faucetClient, /faucet-send', 'Send'/);
assert.match(faucet, /twitter:card" content="summary_large_image"/);
assert.match(faucet, /theme-color" content="#dfff00"/);
assert.match(faucet, /dasha-social-card\.png/);
assert.match(faucet, /id="dasha-faucet"|dasha-faucet/);
assert.match(faucet, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/);

assert.equal(challengeRedirectPath('?challenge=xvojI8Cdg8B6'), '/simp/r/xvojI8Cdg8B6');
assert.equal(challengeRedirectPath(new URLSearchParams('challenge=xvojI8Cdg8B6')), '/simp/r/xvojI8Cdg8B6');
assert.equal(challengeRedirectPath('?challenge=nope'), null);
assert.equal(challengeRedirectPath(''), null);

assert.throws(() => simpResultHtml({ id: '../x', title: 'Dasha simp', correct: 1, total: 1 }));

const worker = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-lobby-worker.mjs'), 'utf8');
const assetsBuild = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-lobby-assets-build.mjs'), 'utf8');
const boardClient = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'dasha-simp-board-client.js'), 'utf8');
assert.match(boardClient, /entry\.holder === true[\s\S]{0,240}Current holder · play chess[\s\S]{0,180}www\.getdasha\.com\/chess/,
  'the public leaderboard holder mark must expose its existing rated-chess benefit');
for (const [, dependency] of worker.matchAll(/from '\.\/([^']+\.mjs)'/g)) {
  if (dependency !== 'dasha-lobby-static-gen.mjs') {
    assert(assetsBuild.includes(`'${dependency}'`), `Worker asset identity omits ${dependency}`);
  }
}
assert.match(worker, /\/simp\/member\//, 'Worker must expose the public member lookup used by share pages');
assert.match(worker, /limit: Number\.MAX_SAFE_INTEGER/, 'member lookup must not disappear below the top-50 board limit');
assert.doesNotMatch(worker, /system-ui/, 'worker public HTML must not use the forbidden system-ui face');
assert.doesNotMatch(worker, /#c8b6ff/, 'worker public HTML must not use the forbidden lavender accent');
assert.match(worker, /RETIRED_SEO_PATHS\.has\(/, 'worker must 308 the retired SEO-bait paths to home');
const wired = worker.includes('dasha-simp-share-html');
const legacyCta = worker.includes('/?challenge=${id}#simp');
if (!wired) {
  console.log('dasha-simp-share-html: helper PASS; worker not wired (SRI pin is live-coordinated — re-pin home + /simp in the same ship)');
} else {
  assert.ok(!legacyCta, 'wired worker must not keep leftover /?challenge=#simp CTA');
  console.log('dasha-simp-share-html: helper+wire PASS');
}
