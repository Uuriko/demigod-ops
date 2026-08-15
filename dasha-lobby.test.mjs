import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const root = new URL('./', import.meta.url);
const landing = await readFile(new URL('./dasha-landing.html', root), 'utf8');
const page = await readFile(new URL('./dasha-lobby-page.html', root), 'utf8');
const client = await readFile(new URL('./dasha-lobby-client.js', root), 'utf8');
const worker = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const chessPage = await readFile(new URL('./dasha-chess-page.html', root), 'utf8');
const wrangler = await readFile(new URL('./dasha-lobby-wrangler.jsonc', root), 'utf8');
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

assert(!landing.includes('id="dasha-lobby"'), 'landing must not mount lobby');
assert(page.includes('id="dasha-lobby"'), 'dedicated lobby mount missing');
assert(chessPage.includes('id="dasha-lobby"'), 'chess must embed the existing lobby chat');
assert(chessPage.includes('Invite / 1v1'), 'chess 1v1 must be a first-class gate action');
assert.match(chessPage, /id="gate-title">Link X</);
assert.match(chessPage, /Needs JavaScript to play/);
assert.doesNotMatch(chessPage, /Checking your seat/);
assert.match(chessPage, /<a class="back" href="\/privacy">Privacy<\/a>/);
assert.match(chessPage, /<a class="back" href="\/verse">Verse<\/a>/);
assert.doesNotMatch(chessPage, /forum/i, 'chess page must not grow a Forum link');
assert.doesNotMatch(chessPage, /#08070a|#f5eedf|#72d6ff|#c8b6ff/);
assert(page.includes('wss://lobby.getdasha.com/ws'), 'dedicated lobby must use permanent WS host');
assert(!landing.includes('spiny-helmet'), 'temporary workers host must not remain');
assert(!landing.includes('On-site, not Discord'), 'removed Lobby framing returned');
assert(!/(?:can|might|could|will) go to zero|go(?:es|ing)? to zero|not financial advice|\bNFA\b|association is not endorsement|no price promises|old coin and Im not the dev|high risk|rugcheck|never trust|lose (?:your )?money|lose it all|worthless|dead coin/i.test(landing), 'negative coin disclaimer returned');
assert(!landing.includes('Public lobby.</h2>'), 'removed Lobby title returned');
assert(page.includes('lobby.getdasha.com/client/lobby.js'), 'dedicated page must load lobby client');
assert.match(page, /<a class="brand" href="https:\/\/www\.getdasha\.com\/">\$<span>DASHA<\/span><\/a>/, 'lobby brand must leave the JSON health root');
assert.match(page, /<a class="back" href="https:\/\/www\.getdasha\.com\/">← Home<\/a>/, 'lobby Home must leave the JSON health root');
assert.match(page, /<a class="back" href="\/verse">Verse<\/a>/, 'lobby header must link Verse');
assert.doesNotMatch(page, /class="(?:brand|back)" href="\/"/, 'lobby navigation must not mislabel the lobby service root as Home');
assert(/s\.integrity='sha384-[A-Za-z0-9+/=]+'/.test(page) && page.includes("s.crossOrigin='anonymous'"), 'dedicated lobby client must be SRI-pinned after Webflow sanitization');
assert(landing.includes('href="/lobby"'), 'landing discovery link to lobby missing');
assert(!/lobby-copy-(?:mint|line)|Copy mint|Copy line/.test(client), 'Lobby copy controls returned');
assert(!/discord\.gg|discord\.com\/invite|t\.me\//i.test(landing), 'landing must not promote Discord/Telegram invite links');
assert(!/official chat|verified community|safe mint/i.test(landing), 'lobby must not claim official/safe status');

assert(client.includes(mint), 'client pins mint');
assert(client.includes("el('span', 'lobby-mint', MINT)"), 'lobby pin must show the full mint');
assert(!client.includes('MINT.slice(0, 6)'), 'lobby pin must not ellipsis the mint');
assert(client.includes('settleEmptyQuiz') && client.includes('href="/simp">Take Simp'), 'empty #dasha-quiz hops to /simp');
assert(client.includes('DashaLobby'), 'client exports DashaLobby');
assert(client.includes('type === \'ready\'') || client.includes("data.type === 'ready'"), 'client handles ready frame');
assert(client.includes('waitMs') || client.includes('Wait '), 'client handles rate wait');
// UI nodes must be mounted (regression: pin/xbar/presence were built but never appended)
assert(client.includes("root.appendChild(pin)"), 'client must append pin chrome');
assert(client.includes("root.appendChild(xBar)") || client.includes('root.appendChild(xBar)'), 'client must append X bar');
assert(client.includes("root.appendChild(presenceStrip)"), 'client must append presence');
assert(client.includes('lobby-expand') || client.includes('Expand chat'), 'client offers expand chat');
assert(client.includes('pendingText') || client.includes('message queued'), 'client queues messages during join cooldown');

assert(worker.includes('export class DashaLobby'), 'worker exports Durable Object');
assert(worker.includes('acceptWebSocket'), 'worker uses hibernation WebSockets');
assert(worker.includes("idFromName('public')"), 'worker is single public room');
assert(worker.includes("type: 'ready'"), 'worker sends ready not double hello_ok');
assert(worker.includes('nickTaken'), 'worker enforces nick uniqueness');
assert(worker.includes('checkRepeat'), 'worker enforces duplicate filter');
assert(worker.includes('MAX_SOCKETS'), 'worker has connection cap');
assert(worker.includes('4001') || worker.includes('lobby full'), 'worker rejects over-cap joins');
assert(worker.includes('/capacity'), 'worker exposes capacity probe');
assert(worker.includes("url.pathname === '/lobby'"), 'worker exposes dedicated /lobby page');
assert(worker.includes('LOBBY_PAGE_HTML'), 'worker serves the generated lobby page');
assert(!landing.includes('One room · max 80.'), 'removed Lobby explainer returned');
assert(worker.includes('/oauth/x/start'), 'worker has X OAuth start');
assert.match(worker, /\['https:\/\/www\.getdasha\.com','https:\/\/getdasha\.com','https:\/\/lobby\.getdasha\.com'\]\.forEach/, 'OAuth popup completion must target every first-party opener origin exactly');
assert(!worker.includes('return to the lobby'), 'shared OAuth completion must not force every product back to Lobby');
assert(!worker.includes('Perks unlocked: longer messages'), 'shared OAuth completion must not claim Lobby-only perks');
assert(worker.includes("url.pathname === '/privacy'") && worker.includes('PRIVACY_HTML'), 'worker serves privacy policy');
assert(worker.includes("url.pathname === '/forum'") && worker.includes('LOBBY_CHAT'), 'product and lobby /forum permanently send visitors to lobby chat');
assert(worker.includes('NOT_FOUND_HTML') && worker.includes("'X-Dasha-Edge': 'html-404'"), 'unknown paths serve branded HTML 404');
assert(worker.includes("url.searchParams.get('continue') !== '1'") && worker.includes('Continue with X'), 'OAuth must show privacy notice before redirect');
assert(!/offline\.access/.test(await readFile(new URL('./dasha-lobby-x.mjs', root), 'utf8')), 'OAuth must not request unused persistent X access');
assert(worker.includes('sessionFromRequest'), 'worker reads optional X session');
assert(client.includes('Link X') || client.includes('link X'), 'client has optional X link control');
assert(client.includes('/oauth/x/'), 'client talks to X oauth routes');
assert(client.includes("document.createTextNode('X · ')") && client.includes('linkedAvatar'), 'linked identity must show X attribution and avatar');
// Header chrome must be mounted (was once stripped and left chat looking empty/broken).
assert(client.includes('root.appendChild(pin)'), 'Lobby pin chrome must mount');
assert(
  client.includes('verify mint') && client.includes("verifyA.href = '/how-to-buy'"),
  'verify mint must hand off to /how-to-buy',
);
assert(!client.includes('#token'), 'verify mint must not dump people under the home lock');
assert(client.includes("el('a', null, 'Verse')") && client.includes("verseA.href = '/verse'"), 'lobby pin must link Verse to /verse');
assert(!client.includes('nfaStrip'), 'Lobby warning strip must stay removed');
assert(client.includes('root.appendChild(xBar)'), 'Lobby X toolbar must mount');
assert(client.includes('root.appendChild(presenceStrip)'), 'Lobby presence must mount');
assert(!client.includes("'lobby-note'"), 'Lobby footnote returned');
assert(!/lobby-(?:remix|report)|Remix as (?:story|post)|Report to host/.test(client), 'message action controls returned');
assert(worker.includes('MAX_PER_IP') || worker.includes('checkIpJoin'), 'worker enforces per-IP join limits');
assert(worker.includes('schedulePresence') || worker.includes('quiet'), 'worker quiets join spam');
assert(worker.includes('SLOW_MODE') || worker.includes('roomSlowLimits') || worker.includes('slow mode'), 'worker has busy slow mode');
assert(worker.includes('/stats') || worker.includes('roomStats'), 'worker exposes /stats');
assert(worker.includes("path === '/studio/event'") && worker.includes("path === '/studio/metrics'"), 'worker exposes Studio funnel routes');
assert(worker.includes("open: 'opens'") && worker.includes("first_edit: 'firstEdits'") && worker.includes("completion: 'completions'") && worker.includes("share_intent: 'shareIntents'"), 'Studio event vocabulary must stay bounded');
assert(worker.includes("modAllowed(request, this.env)"), 'Studio metrics readout must remain operator-authenticated');
assert(!/studioMetrics\s*\[[^\]]*(?:xId|wallet|caption|photo|draft|ip)/i.test(worker), 'Studio metrics must remain aggregate-only');
assert(client.includes('lobby-presence') || client.includes('paintPresence') || client.includes(' linked'), 'client shows presence strip');
assert(client.includes('lobby-empty') && client.includes('Be first.'), 'client empty state title');
assert(client.includes('makeEmptyState') && client.includes("'Be first.'"), 'empty state must invite the first message');
assert(!client.includes('lobby-empty-cta') && !client.includes('lobby-empty-actions'), 'empty chat must not compete with the composer');
assert(client.includes('exactParams({ sell: WSOL, buy: MINT })') && client.includes("exactParams({ inputMint: 'sol', outputMint: MINT })") && client.includes("'/solana/pools/' + PAIR"), 'Lobby client must render only exact-mint/pair crypto links');
assert(worker.includes('setAlarm'), 'worker schedules history prune');
assert(worker.includes("'Content-Security-Policy': \"frame-ancestors 'none'; base-uri 'none'; object-src 'none'\""), 'Worker HTML security policy missing');
assert(worker.includes('applyHtmlSecurity(new Headers(upstream.headers))'), 'proxied Webflow HTML must receive Worker security headers');
assert(worker.includes('ensurePrivacyLink(html)'), 'proxied product HTML must gain a Privacy link in the rewrite pass');
assert(worker.includes('rewriteStudioScriptIntegrity(html)'), 'proxied product HTML must rewrite leftover studio.js SRI');
assert(worker.includes('rewriteLobbyScriptIntegrity(html)'), 'proxied product HTML must rewrite leftover lobby.js SRI');
assert(worker.includes('stripDeadLobbyForum(html)'), 'www /lobby must drop the dead Forum hop');
assert(worker.includes('rewriteStudioBuyVerifyHref(html)'), 'proxied /studio must retarget Buy/verify off #token');
assert(worker.includes('href="/how-to-buy">How to buy<'), 'home lock nav must include How to buy');
assert(worker.includes('rewriteStaleCdnFavicon(html)'), 'proxied product HTML must rewrite leftover CDN favicon.ico');
assert(worker.includes('rewriteHomeFirstViewport(stripHomeSimpBoard(html))'), 'www/apex / must rewrite the first viewport after stripping leftover board chrome');
assert(worker.includes('alignHomeLowerNav') && worker.includes('HOME_CULTURE_NAV'), 'home rewrite aligns the hidden Webflow nav');
assert(worker.includes('max-width:640px') && worker.includes('dasha-posters{grid-template-columns:1fr}'), 'lock posters stack under 640px');
assert(worker.includes('WORKER_SITE_FOOTER'), 'worker pages share one site footer');
assert(worker.includes('id="dasha-lock"') && worker.includes('dasha-band'), 'home first viewport must be #dasha-lock with an acid band');
assert(!worker.includes('>Take Simp.<') && !worker.includes("escapeHtml('Take Simp.')"), 'system-ui Take Simp decoy copy must be gone');
assert(!worker.includes('<section id="dasha-home-cta"') && !worker.includes('function injectHomeSimpCta') && !worker.includes('function homeSimpCtaHtml'), 'worker must delete the 100vh decoy, not keep a quiz-in-fallback');
assert(worker.includes('stripHomeCtaDecoy') && worker.includes("if (html.includes('id=\"dasha-home\"')) return html;") === false, 'live #dasha-home wrapper must not early-return the lock');
assert(worker.includes('escapeHtml(err)') && worker.includes('escapeHtml(String(e.message || e)'), 'OAuth error HTML must escape upstream text');

// Simp Board reuses Lobby DO + session; never auto-enrolls on OAuth
assert(worker.includes("'/simp/board'") || worker.includes('"/simp/board"') || worker.includes('/simp/board'), 'worker exposes /simp/board');
assert(worker.includes('/simp/me'), 'worker exposes /simp/me');
assert(worker.includes('/simp/join'), 'worker exposes /simp/join');
assert(worker.includes('/simp/leave'), 'worker exposes /simp/leave');
assert(worker.includes("'X-Dasha-Edge': 'simp'") && worker.includes('simpPageHtml'), 'www /simp is worker-owned first HTML');
assert(worker.includes("'X-Dasha-Edge': 'bounties'") && worker.includes('bountiesPageHtml'), 'www /bounties is worker-owned first HTML');
assert(worker.includes('unpaidBountiesHtmlHasPayoutAmounts'), 'unpaid /bounties HTML must have a payout-amount proof');
assert(worker.includes("'X-Dasha-Edge': 'verse'") && worker.includes('versePageHtml'), 'www /verse is worker-owned first HTML');
assert(worker.includes("'X-Dasha-Edge': 'graph'") && worker.includes('GRAPH_PAGE'), 'www /graph is worker-owned first HTML');
assert(worker.includes("'X-Dasha-Edge': 'learn'") && worker.includes('learnPageHtml'), 'www /learn is worker-owned first HTML');
assert(worker.includes('client/learn.js') && worker.includes('LEARN_CLIENT_SRI'), 'www /learn mounts the learn client');
assert(worker.includes("path === '/simp/learn'"), 'worker exposes /simp/learn awards');
assert(worker.includes("'X-Dasha-Edge': 'faucet'") && worker.includes('faucetPageHtml'), 'www /faucet is worker-owned first HTML');
assert(worker.includes('client/faucet.js') && worker.includes('FAUCET_CLIENT_SRI'), 'www /faucet mounts the faucet client');
assert(worker.includes('handleFaucetApi') && worker.includes('isFaucetApiPath'), 'worker routes faucet API');
assert(!worker.includes("isExactPath(url.pathname, '/earn')") && !worker.includes("isExactPath(url.pathname, '/airdrop')"), 'no earn/airdrop routes');
assert(!worker.includes("isExactPath(url.pathname, '/hold')") && !worker.includes("isExactPath(url.pathname, '/academy')"), 'no new colliding commerce/academy routes');
assert(worker.includes("url.pathname === '/api/graph'") && worker.includes("url.pathname === '/api/graph/expand'"), 'worker exposes public graph APIs');
assert(worker.includes('/api/graph/highlight') && worker.includes('/api/graph/wallet/challenge'), 'worker exposes graph highlight proof');
assert(worker.includes("kind: 'graph_highlight'"), 'graph highlight must use its own SIWS kind');
assert(!/getProgramAccounts/.test(worker), 'graph must not use getProgramAccounts');
assert(worker.includes("isExactPath(url.pathname, '/dashaverse')") && worker.includes('VERSE_WWW'), ' /dashaverse aliases to /verse');
assert(!worker.includes('injectBountiesBoard(stripBountiesIframe'), 'www /bounties must not paint through Webflow');
assert(worker.includes('SIMP_BOARD_SRI') && worker.includes('client/simp-board.js'), 'www /simp mounts the existing board client');
assert(worker.includes('href="#simp"') && worker.includes('class="dasha-quiz"'), 'home first HTML mounts the playable quiz in the hero');
assert(worker.includes('stripLobbySimpQuiz') && worker.includes('stripLobbySimpQuiz(LOBBY_PAGE_HTML)'), 'first-party /lobby must not mount the quiz');
assert(!worker.includes('SIMP_QUIZ_JS'), 'must not invent a second quiz client');
assert(worker.includes('simpSharePageHtml') && worker.includes('og:image:alt'), 'www /simp/r is type-first share HTML');
assert(worker.includes('simpQuizFirstPaintHtml') && worker.includes('simpResultMissingHtml'), 'www /simp first-paints the quiz and has an honest result 404');
assert(worker.includes("error: 'link X to take the quiz'"), 'quiz start must require a linked X session');
assert(worker.includes('Needs JavaScript.'), 'www /simp noscript must not dump the bank');
assert(worker.includes("isExactPath(url.pathname, '/bounties')") && worker.includes('BOUNTIES_FEED_PAGE'), 'lobby /bounties hops to www');
assert(worker.includes("pathname.replace(/\\/$/, '') === '/simp/hold'") && worker.includes("error: 'not_configured'"), 'hold stays a not_configured stub');
assert(!/\/simp\/hold[\s\S]{0,180}verify/i.test(worker), 'hold must not be called a verify');
assert(worker.includes('scrubSeasonSnapshots') && worker.includes('delete this.simpQuizAttempts') && worker.includes('storage.delete(`simpHolder:'), 'leave must delete linked Board state');
assert(worker.includes('joinBoard') && worker.includes('leaveBoard') && worker.includes('buildPublicBoard'), 'worker uses pure scoring helpers');
assert(worker.includes('handleSimp') || worker.includes('persistSimp'), 'worker persists simp profiles in DO');
assert(worker.includes("method !== 'POST'") || worker.includes('method not allowed'), 'worker rejects non-POST mutations');
assert(worker.includes("error: 'origin not allowed'") && worker.includes("request.method !== 'GET'"), 'worker rejects cross-origin board mutations');
// Callback HTML path mints a session cookie only — no joinBoard between createSessionToken and response.
{
  const cb = worker.indexOf("pathname === '/oauth/x/callback'");
  assert.ok(cb > 0, 'oauth callback route missing');
  const slice = worker.slice(cb, cb + 2500);
  assert(slice.includes('createSessionToken'), 'callback mints session');
  assert(!slice.includes('joinBoard'), 'OAuth callback must not auto-enroll on Simp Board');
  assert(!slice.includes('simpProfiles'), 'OAuth callback must not touch board storage');
}
assert(landing.includes('id="simp"') && landing.includes('id="dasha-simp-board"'), 'landing mounts simp board');
assert(landing.includes('DashaSimpBoard') || landing.includes('dasha-simp-board-client'), 'landing inlines simp board client');

assert(wrangler.includes('"class_name": "DashaLobby"'), 'wrangler binds DO class');
assert(wrangler.includes('new_sqlite_classes'), 'wrangler has DO sqlite migration');
assert(wrangler.includes('lobby.getdasha.com'), 'wrangler routes custom domain');
assert(wrangler.includes('www.getdasha.com'), 'wrangler allows site origin');
assert(worker.includes("pathname === '/bounties.json'") || worker.includes('isBountiesJsonPath'), 'worker exposes /bounties.json');
assert(worker.includes('bounties-feed'), 'worker marks the listings feed');
assert(worker.includes("USDC on Solana. We don't hold it."), 'worker pins the no-custody note');

// Aggregate Studio funnel: bounded events in, authenticated counters out.
globalThis.WebSocketRequestResponsePair ||= class WebSocketRequestResponsePair {};
const workerModule = await import('./dasha-lobby-worker.mjs');
const { DashaLobby, bountiesPageHtml, ensureHtmlLang, ensurePrivacyLink, injectBountiesBoard, normalizeBountiesFeed, parseVerseSubmit, personalizeChessPage, publicFunnelSummary, rewriteHomeFirstViewport, rewriteLobbyScriptIntegrity, rewriteStaleCdnFavicon, rewriteStudioBuyVerifyHref, rewriteStudioScriptIntegrity, sanitizePublicJsonLd, simpPageHtml, simpSharePageHtml, solanaRpcEndpoints, stripBountiesIframe, stripDeadLobbyForum, stripHomeSimpBoard, stripLobbySimpQuiz, unpaidBountiesHtmlHasPayoutAmounts, versePageHtml } = workerModule;
const { LOBBY_CLIENT_JS, SIMP_BOARD_JS, SIMP_BOARD_SRI, STUDIO_CLIENT_JS, LOBBY_CLIENT_SRI } = await import('./dasha-lobby-static-gen.mjs');
const STUDIO_SRI = `sha384-${createHash('sha384').update(STUDIO_CLIENT_JS).digest('base64')}`;
const LOBBY_SRI = `sha384-${createHash('sha384').update(LOBBY_CLIENT_JS).digest('base64')}`;
assert.equal(LOBBY_SRI, LOBBY_CLIENT_SRI, 'LOBBY_CLIENT_SRI must be the hash of served client/lobby.js');
const SIMP_SRI_FROM_BYTES = `sha384-${createHash('sha384').update(SIMP_BOARD_JS).digest('base64')}`;
assert.equal(SIMP_BOARD_SRI, SIMP_SRI_FROM_BYTES, 'SIMP_BOARD_SRI must be the hash of served client/simp-board.js bytes');
assert.match(STUDIO_CLIENT_JS, /const LOOKS=\[\{id:'poster'/, 'served studio.js LOOKS[0] must be type-first poster');
assert.match(STUDIO_CLIENT_JS, /id:'photo'/, 'photo remains an optional look in served studio.js');
assert.match(STUDIO_CLIENT_JS, /function syncPhotoPick/, 'served studio.js must keep face thumbs off first paint');
assert.match(STUDIO_CLIENT_JS, /LOOKS.find\(\(option\)=>option.id==='photo'\)/, 'served studio.js must select Photo by id, not LOOKS[0]');
const personalized = personalizeChessPage(chessPage, { title: '<winner> — Dasha Chess', description: '12 moves & mate', url: 'https://lobby.getdasha.com/chess?game=abc123' });
assert.match(personalized, /&lt;winner&gt; — Dasha Chess/);
assert.match(personalized, /12 moves &amp; mate/);
assert.doesNotMatch(personalized, /<winner>/);
assert.match(personalized, /<meta name="robots" content="index,follow">/);
assert.match(personalizeChessPage(chessPage, { robots: 'noindex,follow' }), /<meta name="robots" content="noindex,follow">/);
assert.match(personalizeChessPage(chessPage, { robots: 'unsafe' }), /<meta name="robots" content="index,follow">/, 'robots directives must be allowlisted');
const dynamicChessEnv = {
  LOBBY: {
    idFromName: () => 'room',
    get: () => ({ fetch: async request => {
      const path = new URL(request.url).pathname;
      if (path.endsWith('/game123')) return new Response(JSON.stringify({ ok: true, replay: { id: 'game123', result: '1-0', reason: 'checkmate', white: { handle: 'white' }, black: { handle: 'black' }, moves: [{}, {}] } }), { status: 200 });
      if (path.endsWith('/cup123')) return new Response(JSON.stringify({ ok: true, tournament: { id: 'cup123', name: 'First Dasha Cup', status: 'registration', entrants: [{}, {}], maxPlayers: 16 } }), { status: 200 });
      if (path.endsWith('/open123')) return new Response(JSON.stringify({ ok: true, challenge: { id: 'open123', status: 'open', creator: '@dasha_player' } }), { status: 200 });
      if (path.endsWith('/claimed1')) return new Response(JSON.stringify({ ok: true, challenge: { id: 'claimed1', status: 'accepted', creator: '@dasha_player' } }), { status: 200 });
      if (path.endsWith('/expired1')) return new Response(JSON.stringify({ ok: true, challenge: { id: 'expired1', status: 'expired', creator: '@dasha_player' } }), { status: 200 });
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    } }),
  },
};
const dynamicChess = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?game=game123'), dynamicChessEnv);
const dynamicChessHtml = await dynamicChess.text();
assert.match(dynamicChessHtml, /<title>@white 1-0 @black — Dasha Chess<\/title>/);
assert.match(dynamicChessHtml, /2 moves · checkmate · Replay every move\./);
assert.match(dynamicChessHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess\?game=game123"/);
assert.match(dynamicChessHtml, /og:image:type" content="image\/png"/);
assert.match(dynamicChessHtml, /og:image:width" content="1200"/);
assert.match(dynamicChessHtml, /og:image:height" content="630"/);
assert.match(dynamicChessHtml, /twitter:image:alt" content="Dasha Chess"/);
assert.match(dynamicChessHtml, /<meta name="robots" content="index,follow">/);
assert.equal(dynamicChess.headers.get('cache-control'), 'public, max-age=120');
const positionedChess = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?game=game123&ply=1'), dynamicChessEnv);
const positionedChessHtml = await positionedChess.text();
assert.match(positionedChessHtml, /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/chess\?game=game123">/, 'position links must consolidate on the durable replay');
assert.match(positionedChessHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess\?game=game123"/);
assert.doesNotMatch(positionedChessHtml, /[?&]ply=1/, 'temporary replay position must not fragment metadata');
const dynamicTournament = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?tournament=cup123'), dynamicChessEnv);
const dynamicTournamentHtml = await dynamicTournament.text();
assert.match(dynamicTournamentHtml, /<title>First Dasha Cup — Dasha Chess<\/title>/);
assert.match(dynamicTournamentHtml, /Open tournament · 2\/16 players\./);
assert.match(dynamicTournamentHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess\?tournament=cup123"/);
assert.match(dynamicTournamentHtml, /<meta name="robots" content="index,follow">/);
assert.doesNotMatch(dynamicTournamentHtml, /game123|@white/, 'tournament card must not reuse replay metadata');
const openChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?challenge=open123'), dynamicChessEnv);
const openChallengeHtml = await openChallenge.text();
assert.match(openChallengeHtml, /<title>@dasha_player challenges you — Dasha Chess<\/title>/);
assert.match(openChallengeHtml, /Take Anna\. Dasha has white\./);
assert.match(openChallengeHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess\?challenge=open123"/);
assert.match(openChallengeHtml, /<meta name="robots" content="noindex,follow">/);
const mixedChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?tournament=cup123&challenge=open123'), dynamicChessEnv);
const mixedChallengeHtml = await mixedChallenge.text();
assert.match(mixedChallengeHtml, /<title>@dasha_player challenges you — Dasha Chess<\/title>/, 'server metadata must choose the same mixed-link object as the browser');
assert.match(mixedChallengeHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess\?challenge=open123"/);
assert.doesNotMatch(mixedChallengeHtml, /First Dasha Cup/, 'mixed challenge links must not preview a different tournament');
const claimedChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?challenge=claimed1'), dynamicChessEnv);
const claimedChallengeHtml = await claimedChallenge.text();
assert.match(claimedChallengeHtml, /<title>@dasha_player&#39;s table is claimed — Dasha Chess<\/title>/);
assert.match(claimedChallengeHtml, /The table is claimed\./);
assert.match(claimedChallengeHtml, /<meta name="robots" content="noindex,follow">/);
const expiredChallengeCard = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?challenge=expired1'), dynamicChessEnv);
const expiredChallengeCardHtml = await expiredChallengeCard.text();
assert.match(expiredChallengeCardHtml, /<title>@dasha_player&#39;s table is closed — Dasha Chess<\/title>/);
assert.match(expiredChallengeCardHtml, /This table is closed\./);
assert.match(expiredChallengeCardHtml, /<meta name="robots" content="noindex,follow">/);
const missingChallengeCard = await workerModule.default.fetch(new Request('https://www.getdasha.com/chess?challenge=missing1'), dynamicChessEnv);
const missingChallengeCardHtml = await missingChallengeCard.text();
assert.equal(missingChallengeCard.status, 200, 'unknown challenge must stay on the chess page');
assert.match(missingChallengeCardHtml, /<title>Challenge not found — Dasha Chess<\/title>/);
assert.match(missingChallengeCardHtml, /This invite expired or was never created\./);
assert.match(missingChallengeCardHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess\?challenge=missing1"/);
assert.match(missingChallengeCardHtml, /<meta name="robots" content="noindex,follow">/);
assert.doesNotMatch(missingChallengeCardHtml, /x-dasha-edge.*html-404|Page not found/i);
for (const [path, dest] of [
  ['/chess/me', 'https://lobby.getdasha.com/chess/me'],
  ['/chess/ratings', 'https://lobby.getdasha.com/chess/ratings'],
  ['/chess/tournaments', 'https://lobby.getdasha.com/chess/tournaments'],
  ['/chess/replay/game12345', 'https://lobby.getdasha.com/chess/replay/game12345'],
]) {
  for (const method of ['GET', 'HEAD']) {
    const redirected = await workerModule.default.fetch(new Request(`https://www.getdasha.com${path}`, { method }), {});
    assert.equal(redirected.status, 308, `www ${method} ${path} must send chess reads to lobby`);
    assert.equal(redirected.headers.get('location'), dest);
  }
}
const missingChess = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?game=missing1'), dynamicChessEnv);
const missingChessHtml = await missingChess.text();
assert.match(missingChessHtml, /<title>Dasha Chess — holders play<\/title>/);
assert.match(missingChessHtml, /og:url" content="https:\/\/www\.getdasha\.com\/chess"/);
assert.doesNotMatch(missingChessHtml, /missing1/, 'invalid replay id must fall back to generic canonical metadata');
assert.match(missingChessHtml, /<meta name="robots" content="index,follow">/);
for (const path of ['/checkout', '/paypal-checkout', '/order-confirmation']) {
  const retired = await workerModule.default.fetch(new Request(`https://www.getdasha.com${path}`), {});
  assert.equal(retired.status, 404, `${path} must not expose Webflow's retired commerce shell`);
  assert.equal(retired.headers.get('x-dasha-edge'), 'retired-commerce');
}
for (const method of ['GET', 'HEAD']) {
  const rally = await workerModule.default.fetch(new Request('https://www.getdasha.com/rally', { method }), {});
  assert.equal(rally.status, 308, `retired Rally ${method} must redirect permanently`);
  assert.equal(rally.headers.get('location'), 'https://www.getdasha.com/');
}
assert.doesNotMatch(worker, /pathname === ['"]\/desk['"]/, 'desk must stay a Webflow 301, not a worker second desk');
const lobbyPrivacy = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/privacy'), {});
const lobbyPrivacyHtml = await lobbyPrivacy.text();
for (const host of ['www.getdasha.com', 'getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/forum', '/forum/']) {
      const forum = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(forum.status, 308, `${host}${path} ${method} must permanently send product-host Forum to lobby chat`);
      assert.equal(forum.headers.get('location'), 'https://www.getdasha.com/lobby');
    }
    for (const path of ['/howtobuy', '/howtobuy/']) {
      const howtobuy = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(howtobuy.status, 308, `${host}${path} ${method} must permanently send the unspaced alias to /how-to-buy`);
      assert.equal(howtobuy.headers.get('location'), 'https://www.getdasha.com/how-to-buy');
    }
    for (const path of ['/privacy', '/privacy/']) {
      const privacy = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(privacy.status, 200, `${host}${path} ${method} must serve the same privacy page as lobby`);
      assert.equal(privacy.headers.get('x-dasha-edge'), 'privacy');
      assert.equal(await privacy.text(), method === 'HEAD' ? '' : lobbyPrivacyHtml);
    }
  }
}
for (const method of ['GET', 'HEAD']) {
  for (const path of ['/howtobuy', '/howtobuy/']) {
    const howtobuy = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(howtobuy.status, 308, `lobby${path} ${method} must permanently send the unspaced alias to /how-to-buy`);
    assert.equal(howtobuy.headers.get('location'), 'https://www.getdasha.com/how-to-buy');
  }
}
{
  const lobbyHowto = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/how-to-buy'), {});
  assert.equal(lobbyHowto.status, 200, 'lobby /how-to-buy must stay 200');
  assert.equal(lobbyHowto.headers.get('x-dasha-edge'), 'howto');
}
for (const method of ['GET', 'HEAD']) {
  const privacy = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/privacy/', { method }), {});
  assert.equal(privacy.status, 200, `lobby /privacy/ ${method} must serve the same privacy page as /privacy`);
  assert.match(privacy.headers.get('content-type') || '', /text\/html/);
  assert.equal(privacy.headers.get('x-dasha-edge'), null, 'lobby /privacy/ must not set X-Dasha-Edge');
  assert.equal(await privacy.text(), method === 'HEAD' ? '' : lobbyPrivacyHtml);
  if (method === 'GET') {
    assert.match(lobbyPrivacyHtml, /<title>Dasha privacy<\/title>/);
  }
}
for (const path of ['/forum', '/forum/']) {
  for (const method of ['GET', 'HEAD']) {
    const forum = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(forum.status, 308, `lobby ${path} ${method} must permanently send Forum to lobby chat`);
    assert.equal(forum.headers.get('location'), 'https://www.getdasha.com/lobby');
  }
}
{
  for (const headers of [{}, { Accept: 'text/html' }]) {
    const lobbyRoot = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/', { headers }), {});
    assert.equal(lobbyRoot.status, 200, `lobby GET / must stay JSON health${headers.Accept ? ' even with Accept: text/html' : ''}`);
    assert.match(lobbyRoot.headers.get('content-type') || '', /application\/json/);
    assert.notEqual(lobbyRoot.status, 302);
    assert.equal(lobbyRoot.headers.get('location'), null);
    const lobbyRootBody = await lobbyRoot.json();
    assert.equal(lobbyRootBody.ok, true);
    assert.equal(lobbyRootBody.service, 'dasha-lobby');
  }
}
for (const path of ['/no-such-page', '/no-such-page-242', '/no-such-page-251', '/no-such-page-253', '/no-such-page/']) {
  for (const method of ['GET', 'HEAD']) {
    const page = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(page.status, 404, `lobby ${path} ${method} must be a branded HTML 404`);
    assert.match(page.headers.get('content-type') || '', /text\/html/);
    assert.equal(page.headers.get('x-dasha-edge'), 'html-404');
    const body = await page.text();
    if (method === 'HEAD') {
      assert.equal(body, '', `lobby ${path} HEAD must return an empty body`);
    } else {
      assert.match(body, /<title>Page not found — \$dasha<\/title>/);
      assert.match(body, /This path is not a Dasha page\./);
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/">Home<\/a>/);
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/lobby">Lobby<\/a>/);
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/simp">Simp<\/a>/);
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/verse">Verse<\/a>/);
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/how-to-buy">How to buy<\/a>/);
      assert.doesNotMatch(body, /Back to Dasha|\/forum|USDC/);
      assert.match(body, /Dasha|\$dasha/);
      assert.notEqual(body, '{"error":"not found"}');
      assert.doesNotMatch(body, /no forum yet/i);
      assert.doesNotMatch(body, /<title>Dasha forum<\/title>/);
    }
  }
}
for (const path of ['/studio', '/studio/']) {
  for (const method of ['GET', 'HEAD']) {
    const hop = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(hop.status, 308, `lobby ${path} ${method} must send Studio to www`);
    assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/studio');
  }
}
{
  const SIMP_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const assertSimpFirstHtml = (html, label) => {
    assert.match(html, /<h1>Simp<\/h1>/, `${label} must use h1 Simp`);
    assert.match(html, /How big of a Dasha simp are you\?/, `${label} must lead with the quiz`);
    assert.match(html, /Take the quiz\. Ranked by lore and contributions\./);
    assert.doesNotMatch(html, /Quick 10Q|Deep 20Q|\b10Q\b|\b20Q\b/);
    assert.match(html, /<a class="dasha-go" href="#dasha-quiz">Take Simp<\/a>/);
    assert.match(html, /<a href="\/verse">Verse<\/a>/);
    assert.match(html, /PerryALPHA founding #1 is editorial and non-measured/);
    assert.match(html, /editorial #1 · not measured/);
    assert.match(html, /id="dasha-quiz"[\s\S]*How big of a Dasha simp are you\?/);
    assert.match(html, /<noscript><p>Needs JavaScript\.<\/p><\/noscript>/);
    assert.doesNotMatch(html, /Pick your strongest lane/);
    assert.doesNotMatch(html, /Which t\.A\.T\.u\. song is Red Scare/);
    assert.doesNotMatch(html, /questions are not in this HTML/);
    assert.match(html, /class="dasha-quiz"/);
    assert.match(html, /id="dasha-quiz"/);
    assert.match(html, /id="dasha-simp-board"/);
    assert.match(html, /lobby\.getdasha\.com\/client\/simp-board\.js/);
    assert.match(html, new RegExp(`s\\.integrity='${SIMP_SRI_FROM_BYTES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
    assert.match(html, /s\.crossOrigin='anonymous'/);
    assert.match(html, /system-ui,sans-serif/);
    assert.match(html, /a\{color:var\(--acid\)\}/);
    assert.doesNotMatch(html, /Arial/);
    assert.doesNotMatch(html, /<script>[^<]*action:'start'/);
    assert.doesNotMatch(html, /class="dasha-board"|<ol\b|No measured simps yet/);
    assert.doesNotMatch(html, /x\.com\/|#2 @|#3 @/);
    assert.doesNotMatch(html, /\.simp-/);
    assert.doesNotMatch(html, /class="simp-/);
    assert.doesNotMatch(html, /score=/);
    assert.doesNotMatch(html, /"answer"\s*:/);
    assert.doesNotMatch(html, /oauth\/x\/start|Connect X/);
    assert.doesNotMatch(html, /payTo|X_CLIENT_SECRET|X_CLIENT_ID|LOBBY_SESSION_SECRET/);
    assert.doesNotMatch(html, /Payout not live/);
    assert.doesNotMatch(html, /The public record calls it her first feature|Berlin Best First Feature/);
    for (const token of SIMP_TOKENS) assert.match(html, new RegExp(token));
    for (const hex of html.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
      assert.ok(SIMP_TOKENS.includes(hex.toLowerCase()), `${label} must stay tokens-only (saw ${hex})`);
    }
  };
  const emptyHtml = simpPageHtml();
  assertSimpFirstHtml(emptyHtml, 'quiz page helper');
  for (const host of ['www.getdasha.com', 'getdasha.com']) {
    for (const method of ['GET', 'HEAD']) {
      for (const path of ['/simp', '/simp/']) {
        const page = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
        assert.equal(page.status, 200, `${host}${path} ${method} must be worker-owned 200`);
        assert.equal(page.headers.get('x-dasha-edge'), 'simp');
        assert.match(page.headers.get('content-type') || '', /text\/html/);
        const html = await page.text();
        if (method === 'HEAD') {
          assert.equal(html, '', `${host}${path} HEAD must return an empty body`);
        } else {
          assertSimpFirstHtml(html, `${host}${path}`);
        }
      }
      for (const path of ['/quiz', '/quiz/']) {
        const quiz = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
        assert.equal(quiz.status, 308, `${host}${path} ${method} must permanently send quiz to /simp`);
        assert.equal(quiz.headers.get('location'), 'https://www.getdasha.com/simp');
      }
      const photo = await workerModule.default.fetch(new Request(`https://${host}/simp/photo/weekend.jpg`, { method }), {
        ASSETS: { fetch: async (req) => new Response(req.method === 'HEAD' ? null : 'jpg', { status: 200, headers: { 'Content-Type': 'image/jpeg' } }) },
      });
      assert.equal(photo.status, 200, `${host} /simp/photo must serve first-party stills`);
      assert.equal(photo.headers.get('content-type'), 'image/jpeg');
      assert.equal(photo.headers.get('access-control-allow-origin'), '*');
      assert.equal(await photo.text(), method === 'HEAD' ? '' : 'jpg');
    }
  }
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/simp', '/simp/']) {
      const page = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
      assert.equal(page.status, 200, `lobby ${path} ${method} must be the playable quiz`);
      assert.equal(page.headers.get('x-dasha-edge'), 'simp');
      const html = await page.text();
      if (method === 'HEAD') {
        assert.equal(html, '', `lobby ${path} HEAD must return an empty body`);
      } else {
        assertSimpFirstHtml(html, `lobby ${path}`);
      }
    }
  }
  for (const method of ['GET', 'POST']) {
    const hold = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/simp/hold', { method }), {});
    assert.equal(hold.status, 501, `lobby ${method} /simp/hold must stay 501`);
    const body = await hold.json();
    assert.equal(body.configured, false);
    assert.equal(body.error, 'not_configured');
    assert.notEqual(body.error, 'verify');
    assert.equal(body.ok, undefined);
  }
  const lobbyQuiz = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/quiz'), {});
  assert.equal(lobbyQuiz.status, 404, 'lobby /quiz must not invent a quiz page');
  assert.equal(lobbyQuiz.headers.get('x-dasha-edge'), 'html-404');
  for (const path of ['/dasha', '/desk']) {
    const invented = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`), {});
    assert.equal(invented.status, 404, `lobby ${path} must not invent a product page`);
    assert.equal(invented.headers.get('x-dasha-edge'), 'html-404');
  }
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/bounties', '/bounties/']) {
      const hop = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
      assert.equal(hop.status, 308, `lobby ${path} ${method} must permanently send bounties to www`);
      assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/bounties');
    }
  }
  const boardEnv = {
    LOBBY: {
      idFromName: () => 'room',
      get: () => ({
        fetch: async () => new Response(JSON.stringify({
          schema: 'dasha-simp-board/v1',
          editorial: [{ rank: 1, display: '@PerryALPHA', handle: 'perryalpha', measured: false }],
          measured: [],
          xId: 'leak-xid-must-not-render',
          wallet: 'leak-wallet-must-not-render',
          balance: 'leak-balance-must-not-render',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      }),
    },
  };
  const fetched = await workerModule.default.fetch(new Request('https://www.getdasha.com/simp'), boardEnv);
  const fetchedHtml = await fetched.text();
  assertSimpFirstHtml(fetchedHtml, 'www /simp first HTML');
  assert.doesNotMatch(fetchedHtml, /leak-/);
}
{
  const SHARE_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const fixture = {
    correct: 9,
    total: 10,
    title: 'Dasha scholar',
    lane: 'Cinema obsessive',
    vibeNote: 'Main-character energy (+3).',
  };
  const shareHtml = simpSharePageHtml(fixture, 'sharetest');
  assert.match(shareHtml, /<h1>Dasha scholar<\/h1>/);
  assert.match(shareHtml, /property="og:title" content="Dasha scholar"/);
  assert.match(shareHtml, /property="og:description" content="Main-character energy \(\+3\)\."/);
  assert.match(shareHtml, /property="og:image:alt" content="Dasha scholar"/);
  assert.match(shareHtml, /twitter:image:alt" content="Dasha scholar"/);
  assert.doesNotMatch(shareHtml, /<h1>[^<]*9\/10/);
  assert.doesNotMatch(shareHtml, /property="og:title" content="[^"]*9\/10/);
  assert.doesNotMatch(shareHtml, /property="og:description" content="9\/10/);
  assert.doesNotMatch(shareHtml, /property="og:image:alt" content="[^"]*9\/10/);
  assert.match(shareHtml, /9\/10/);
  assert.match(shareHtml, /class="dasha-share"/);
  assert.match(shareHtml, /navigator\.share/);
  assert.match(shareHtml, /x\.com\/intent\/post/);
  assert.doesNotMatch(shareHtml, /\.simp-/);
  assert.doesNotMatch(shareHtml, /class="simp-/);
  assert.doesNotMatch(shareHtml, /score=/);
  assert.doesNotMatch(shareHtml, /oauth\/x\/start|Connect X|type="email"/);
  for (const hex of shareHtml.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
    assert.ok(SHARE_TOKENS.includes(hex.toLowerCase()), `share page must stay tokens-only (saw ${hex})`);
  }
  const shareRows = new Map();
  const shareState = {
    storage: {
      get: async (key) => shareRows.get(key),
      put: async (key, value) => { if (key && typeof key === 'object') { for (const [k, v] of Object.entries(key)) shareRows.set(k, v); return; } shareRows.set(key, value); },
      delete: async (key) => shareRows.delete(key),
      list: async () => ({ keys: [...shareRows.keys()].map((name) => ({ name })) }),
      getAlarm: async () => 1,
      setAlarm: async () => {},
    },
    setWebSocketAutoResponse() {},
    blockConcurrencyWhile(fn) { this.ready = fn(); },
  };
  const shareDo = new DashaLobby(shareState, { ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com' });
  await shareState.ready;
  shareDo.simpQuizResults.sharetest = fixture;
  const shareEnv = {
    LOBBY: {
      idFromName: () => 'room',
      get: () => shareDo,
    },
  };
  for (const host of ['www.getdasha.com', 'getdasha.com']) {
    for (const method of ['GET', 'HEAD']) {
      const page = await workerModule.default.fetch(new Request(`https://${host}/simp/r/sharetest`, { method }), shareEnv);
      assert.equal(page.status, 200, `${host} /simp/r/sharetest ${method} must be worker-owned 200`);
      assert.equal(page.headers.get('x-dasha-edge'), 'simp-share');
      const html = await page.text();
      if (method === 'HEAD') {
        assert.equal(html, '', `${host} /simp/r/sharetest HEAD must return an empty body`);
      } else {
        assert.match(html, /<h1>Dasha scholar<\/h1>/);
        assert.match(html, /property="og:title" content="Dasha scholar"/);
        assert.match(html, /property="og:image:alt" content="Dasha scholar"/);
        assert.doesNotMatch(html, /<h1>[^<]*9\/10/);
      }
      const missing = await workerModule.default.fetch(new Request(`https://${host}/simp/r/unknown`, { method }), shareEnv);
      assert.equal(missing.status, 404, `${host} /simp/r/unknown ${method} must be the result 404`);
      assert.equal(missing.headers.get('x-dasha-edge'), 'simp-result', `${host} /simp/r/unknown must use the result 404`);
      assert.notEqual(missing.headers.get('x-dasha-edge'), 'html-404', `${host} /simp/r/unknown must not use the generic branded 404`);
      const missingBody = await missing.text();
      if (method === 'HEAD') {
        assert.equal(missingBody, '');
      } else {
        assert.match(missingBody, /<h1>Result not found<\/h1>/);
        assert.match(missingBody, /No quiz result for this id/);
        assert.notEqual(missingBody.trim(), '', `${host} /simp/r/unknown must not 200 a blank page`);
        assert.doesNotMatch(missingBody, /Page not found — \$dasha|9\/10|Dasha scholar|0\/0/);
      }
      const resultPath = await workerModule.default.fetch(new Request(`https://${host}/simp/result/unknown`, { method }), shareEnv);
      assert.equal(resultPath.status, 404, `${host} /simp/result/unknown ${method} must be the result HTML 404`);
      assert.equal(resultPath.headers.get('x-dasha-edge'), 'simp-result');
      const resultPathBody = await resultPath.text();
      if (method === 'HEAD') {
        assert.equal(resultPathBody, '');
      } else {
        assert.match(resultPathBody, /<h1>Result not found<\/h1>/);
        assert.doesNotMatch(resultPathBody, /9\/10|Dasha scholar|0\/0/);
      }
    }
  }
  const knownResult = await workerModule.default.fetch(new Request('https://www.getdasha.com/simp/result/sharetest'), shareEnv);
  assert.equal(knownResult.status, 200, 'www /simp/result/:id must serve HTML for a real result');
  assert.equal(knownResult.headers.get('x-dasha-edge'), 'simp-share');
  assert.match(await knownResult.text(), /<h1>Dasha scholar<\/h1>/);
  const lobbyJson = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/simp/result/unknown'), shareEnv);
  assert.equal(lobbyJson.status, 404, 'lobby /simp/result/:id stays JSON');
  assert.match(lobbyJson.headers.get('content-type') || '', /json/);
  assert.equal((await lobbyJson.json()).error, 'result not found');
  const unseen = await workerModule.default.fetch(new Request('https://www.getdasha.com/simp/r/sharetest'), {});
  assert.equal(unseen.status, 308, 'www share page hops to lobby only when the store is unseen');
  assert.equal(unseen.headers.get('location'), 'https://lobby.getdasha.com/simp/r/sharetest');
}
{
  const metricsEnv = {
    LOBBY: {
      idFromName: () => 'room',
      get: () => ({
        fetch: async () => new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
    },
  };
  const publicMetrics = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/studio/metrics/public'), metricsEnv);
  assert.equal(publicMetrics.status, 200, 'lobby /studio/metrics/public must stay a JSON API');
  assert.match(publicMetrics.headers.get('content-type') || '', /application\/json/);
  assert.notEqual(publicMetrics.headers.get('x-dasha-edge'), 'html-404');
  assert.equal((await publicMetrics.json()).ok, true);
}
{
  const webflow404 = `<!doctype html><html><head><title>404 - Page not found</title>
<link rel="stylesheet" href="https://cdn.prod.website-files.com/css/webflow-https-errors.webflow.css">
</head><body>Page not found</body></html>`;
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const u = new URL(typeof input === 'string' ? input : input.url);
      const known = new Map([
        ['/', '$dasha — make the timeline stranger'],
        ['/lobby', '$dasha lobby'],
        ['/lobby/', '$dasha lobby'],
        ['/bounties', 'Bounties'],
        ['/bounties/', 'Bounties'],
        ['/dasha', 'Dasha'],
        ['/dasha/', 'Dasha'],
      ]);
      if (u.hostname.endsWith('getdasha.com') && known.has(u.pathname)) {
        return new Response(`<!doctype html><html><title>${known.get(u.pathname)}</title></html>`, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response(webflow404, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    };
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      for (const path of ['/no-such-page', '/no-such-page-241']) {
        const page = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(page.status, 404, `${host}${path} must stay 404`);
        assert.match(page.headers.get('content-type') || '', /text\/html/);
        assert.equal(page.headers.get('x-dasha-edge'), 'html-404');
        const html = await page.text();
        assert.match(html, /<title>Page not found — \$dasha<\/title>/);
        assert.match(html, /Dasha|\$dasha/);
        assert.doesNotMatch(html, /webflow-https-errors/);
        assert.doesNotMatch(html, /<title>404 - Page not found<\/title>/);
        const head = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method: 'HEAD' }), {});
        assert.equal(head.status, 404, `${host}${path} HEAD must stay 404`);
        assert.match(head.headers.get('content-type') || '', /text\/html/);
        assert.equal(await head.text(), '', `${host}${path} HEAD must return an empty body`);
      }
      for (const [path, title, edge] of [
        ['/', '$dasha — make the timeline stranger', 'html-security'],
        ['/lobby', '$dasha lobby', 'html-security'],
        ['/dasha', 'Dasha', 'html-security'],
      ]) {
        const page = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(page.status, 200, `${host}${path} must stay 200`);
        assert.equal(page.headers.get('x-dasha-edge'), edge);
        assert.ok((await page.text()).includes(`<title>${title}</title>`), `${host}${path} must keep its origin title`);
      }
      const bounties = await workerModule.default.fetch(new Request(`https://${host}/bounties`), {});
      assert.equal(bounties.status, 200, `${host}/bounties must stay worker-owned 200`);
      assert.equal(bounties.headers.get('x-dasha-edge'), 'bounties');
      assert.match(await bounties.text(), /<title>Bounties<\/title>/);
      const privacy = await workerModule.default.fetch(new Request(`https://${host}/privacy`), {});
      assert.equal(privacy.status, 200, `${host}/privacy must stay worker-served 200`);
      assert.equal(privacy.headers.get('x-dasha-edge'), 'privacy');
      const privacyHtml = await privacy.text();
      assert.match(privacyHtml, /<title>Dasha privacy<\/title>/);
      assert.match(privacyHtml, /<a href="\/verse">Verse<\/a>/);
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const nativeFetch = globalThis.fetch;
  let deskPassedThrough = false;
  try {
    globalThis.fetch = async (request) => {
      deskPassedThrough = new URL(request.url).pathname === '/desk';
      return new Response('<!doctype html><html><title>Not Found</title>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    };
    const desk = await workerModule.default.fetch(new Request('https://www.getdasha.com/desk'), {});
    assert.equal(deskPassedThrough, true, 'www /desk must remain a Webflow pass-through');
    assert.equal(desk.status, 404, 'www /desk must not become a worker-owned desk');
    assert.notEqual(desk.headers.get('x-dasha-edge'), 'privacy');
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const iconPaths = [
    '/favicon.ico',
    '/favicon.svg',
    '/favicon.png',
    '/apple-touch-icon',
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
  ];
  const nativeFetch = globalThis.fetch;
  let originHits = 0;
  try {
    globalThis.fetch = async () => {
      originHits += 1;
      return new Response('<!doctype html><html><title>Page not found — $dasha</title></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    };
    for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
      for (const path of iconPaths) {
        const res = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(res.status, 200, `${host}${path} must serve the existing mark`);
        const ct = res.headers.get('content-type') || '';
        assert.doesNotMatch(ct, /text\/html/, `${host}${path} must not be HTML`);
        assert.notEqual(res.headers.get('x-dasha-edge'), 'html-404', `${host}${path} must not use html-404`);
        const body = await res.text();
        assert.notEqual(body, '', `${host}${path} 200 body must not be empty`);
        assert.doesNotMatch(body, /<!doctype html>/i, `${host}${path} must not be branded HTML 404`);
        assert.doesNotMatch(body, /Page not found — \$dasha/);
        if (ct.includes('image/svg+xml')) {
          assert.match(body, /viewBox="0 0 64 64"/);
          assert.match(body, /fill="#070608"/);
          assert.match(body, /#dfff00/);
          assert.match(body, /r="14"/);
          assert.match(body, /r="12"/);
        }
      }
      const head = await workerModule.default.fetch(new Request(`https://${host}/favicon.ico`, { method: 'HEAD' }), {});
      assert.equal(head.status, 200, `${host}/favicon.ico HEAD must match GET status`);
      assert.doesNotMatch(head.headers.get('content-type') || '', /text\/html/);
      assert.equal(await head.text(), '', `${host}/favicon.ico HEAD must return an empty body`);
    }
    assert.equal(originHits, 0, 'icon paths must not pass through to Webflow origin');
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const emptyPay = normalizeBountiesFeed({
    schema: 'dasha-bounties-feed/v1',
    note: 'stale note',
    listings: [{ kind: 'item', name: 'docs', payTo: '' }, { kind: 'project', name: 'desk', payTo: '   ' }],
  });
  assert.equal(emptyPay.schema, 'dasha-bounties-feed/v1');
  assert.equal(emptyPay.note, "USDC on Solana. We don't hold it.");
  assert.equal(emptyPay.listings[0].payTo, null);
  assert.equal(emptyPay.listings[0].payoutStatus, 'not_implemented');
  assert.equal(emptyPay.listings[1].payTo, null);
  assert.equal(emptyPay.listings[1].payoutStatus, 'not_implemented');
  assert.doesNotMatch(JSON.stringify(emptyPay), /"payTo":""/);
  const dest = '11111111111111111111111111111111';
  const funded = normalizeBountiesFeed({ listings: [{ kind: 'item', name: 'docs', payTo: ` ${dest} ` }] });
  assert.equal(funded.listings[0].payTo, dest);
  assert.notEqual(funded.listings[0].payoutStatus, 'not_implemented');
}
{
  const shell = `<!doctype html><html><body><div class="w-embed"><style>html, body { margin: 0; padding: 0; height: 100%; }</style></div><script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js"></script><script src="https://cdn.prod.website-files.com/webflow.js"></script></body></html>`;
  const liveFeed = {
    schema: 'dasha-bounties-feed/v1',
    listings: [
      { kind: 'item', name: 'docs', itemUrl: 'https://github.com/Uuriko/dasha-desk/issues/8', amount: 25, currency: 'USDC', chain: 'solana', payTo: null, payoutStatus: 'not_implemented' },
      { kind: 'project', name: 'desk', amount: 50, currency: 'USDC', chain: 'solana', payTo: null, payoutStatus: 'not_implemented' },
    ],
  };
  const listed = injectBountiesBoard(shell, liveFeed);
  const listedSection = listed.match(/<section\b[^>]*id=["']dasha-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
  assert.match(listed, /id="dasha-bounties"/);
  assert.match(listed, /aria-label="Bounties"/);
  assert.match(listed, /w-embed[\s\S]*id="dasha-bounties"[\s\S]*(?:jquery|webflow\.js)/);
  assert.match(listed, /html, body \{ margin: 0; padding: 0; height: 100%; \}/);
  const BOARD_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const assertBountiesChrome = (section, label) => {
    assert.match(section, /<h1>Bounties<\/h1>/, `${label} must name the product`);
    assert.match(section, /font-family:"Arial Black",Arial,Helvetica,sans-serif/, `${label} must use the display face`);
    assert.match(section, /font:16px\/1\.45 Arial,Helvetica,sans-serif/, `${label} must use Arial body`);
    assert.doesNotMatch(section, /system-ui/, `${label} must not use system-ui`);
    assert.match(section, /href="\/studio">Studio</, `${label} nav must include Studio`);
    assert.match(section, /href="\/simp">Simp</, `${label} nav must include Simp`);
    assert.match(section, /href="\/verse">Verse</, `${label} nav must include Verse`);
    assert.match(section, /href="\/bounties">Bounties</, `${label} nav must include Bounties`);
    assert.match(section, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</, `${label} nav must include @dash_eats`);
    assert.doesNotMatch(section.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0] || '', /53ux|Buy|jup\.ag|#token|\/forum/i, `${label} must keep CA and Buy out of the top nav`);
    assert.match(section, /<footer\b[^>]*id="token"/, `${label} must keep CA + Buy in a token footer`);
    assert.match(section, /<a href="\/studio">Studio<\/a> · <a href="\/lobby">Lobby<\/a> · <a href="\/simp">Simp<\/a> · <a href="\/learn">Learn<\/a> · <a href="\/faucet">Faucet<\/a> · <a href="\/graph">Graph<\/a> · <a href="\/verse">Verse<\/a> · <a href="\/bounties">Bounties<\/a> · <a href="\/how-to-buy">How to buy<\/a> · <a href="\/privacy">Privacy<\/a>/, `${label} must keep the site footer`);
    assert.match(section, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/, `${label} footer must show the mint`);
    assert.match(section, /jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/, `${label} footer must keep Buy`);
    assert.match(section, /<label>Contact <input name="contact"><\/label> <a href="\/privacy">Privacy<\/a>/, `${label} must put Privacy next to contact`);
    assert.match(section, /This sends a request\. It is not a live listing\./, `${label} must not pretend a board write`);
    assert.doesNotMatch(section, /We'll add it to the board/);
    assert.doesNotMatch(section, /Payout not live/);
    assert.doesNotMatch(section, /\/forum/);
    assert.doesNotMatch(section, /#1[fF]041[cC]|#0000[eE]{2}|#7c4dff|--violet|--hot-deep/);
    for (const hex of section.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
      assert.ok(BOARD_TOKENS.includes(hex.toLowerCase()), `${label} must stay tokens-only (saw ${hex})`);
    }
  };
  assert.match(listed, /id="dasha-bounties"/);
  assert.match(listed, /aria-label="Bounties"/);
  assert.match(listed, /w-embed[\s\S]*id="dasha-bounties"[\s\S]*(?:jquery|webflow\.js)/);
  assert.match(listed, /html, body \{ margin: 0; padding: 0; height: 100%; \}/);
  assertBountiesChrome(listedSection, 'injected board');
  assert.match(listedSection, /Post a project\. Other people run spare compute on it\./);
  assert.match(listedSection, /<a class="go" href="#dasha-bounty-post">Post a project<\/a>/);
  assert.match(listedSection, /<a class="go" href="mailto:potter@trydemigod\.com\?subject=I%20have%20excess%20compute">I have excess compute<\/a>/);
  assert.match(listedSection, /<form\b[^>]*action="mailto:potter@trydemigod\.com"[^>]*method="get"/i);
  assert.match(listedSection, /name="name"/);
  assert.match(listedSection, /What to run/);
  assert.doesNotMatch(listedSection, /writes?\s+\/bounties\.json|saved to \/bounties/i);
  assert.doesNotMatch(listedSection, /uuriko\.github\.io\/dasha-desk\/bounties|issues\/new\?template=bounty-project/i);
  assert.doesNotMatch(listedSection, /docs: add CONTRIBUTING screenshot/);
  assert.doesNotMatch(listedSection, /href="https:\/\/github\.com\/Uuriko\/dasha-desk\/issues\/8"/);
  assert.match(listedSection, /No open bounties/);
  assert.doesNotMatch(listedSection, />dasha desk<|>desk</);
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts(listedSection), false, 'unpaid Work list must not print USDC or $ payout amounts');
  assert.doesNotMatch(listedSection, /<p class="amt">/);
  assert.match(listedSection, /Payouts are not configured yet\./);
  assert.ok(listedSection.indexOf('<h1>Bounties</h1>') < listedSection.indexOf('Payouts are not configured yet.'), 'payout note must not be first-paint copy');
  assert.doesNotMatch(listedSection, /not implemented/i);
  assert.doesNotMatch(listedSection, /<li\b/);
  assert.doesNotMatch(listedSection, /<script\b/i);
  assert.doesNotMatch(listedSection, /\bClaim\b|\bPay\b/);
  assert.doesNotMatch(listed, /<iframe/i);
  assert.doesNotMatch(listed, /#c8b6ff|rgba\(\s*124\s*,\s*77\s*,\s*255|t\.me\//i);
  assert.doesNotMatch(listed, /payTo:""/);
  const emptyListed = injectBountiesBoard(shell, { listings: [] });
  const emptyFallback = injectBountiesBoard(shell, normalizeBountiesFeed(null));
  for (const empty of [emptyListed, emptyFallback]) {
    const emptySection = empty.match(/<section\b[^>]*id=["']dasha-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
    assertBountiesChrome(emptySection, 'empty board');
    assert.match(emptySection, /Post a project\. Other people run spare compute on it\./);
    assert.match(emptySection, /<a class="go" href="#dasha-bounty-post">Post a project<\/a>/);
    assert.match(emptySection, /I have excess compute/);
    assert.match(emptySection, /mailto:potter@trydemigod\.com/);
    assert.match(emptySection, /No open bounties/);
    assert.match(emptySection, /Payouts are not configured yet\./);
    assert.doesNotMatch(empty, /<li\b/);
    assert.equal(unpaidBountiesHtmlHasPayoutAmounts(emptySection), false, 'empty Work list must not invent USDC or $ payout amounts');
    assert.doesNotMatch(empty, /payTo:""/);
  }
  const nullPay = injectBountiesBoard(shell, { listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: null }] });
  assert.match(nullPay, /Payouts are not configured yet\./);
  assert.match(nullPay, /No open bounties/);
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts(nullPay), false);
  assert.doesNotMatch(nullPay, /Payout not live/);
  assert.doesNotMatch(nullPay, /not implemented/i);
  assert.doesNotMatch(nullPay, /payTo:""/);
  const blankPay = injectBountiesBoard(shell, { listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: '' }, { kind: 'project', name: 'desk', amount: 50, currency: 'USDC', payTo: '   ' }] });
  assert.match(blankPay, /Payouts are not configured yet\./);
  assert.match(blankPay, /No open bounties/);
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts(blankPay), false);
  assert.doesNotMatch(blankPay, /Payout not live/);
  assert.doesNotMatch(blankPay, /not implemented/i);
  assert.doesNotMatch(blankPay, /payTo:""/);
  const dest = '22222222222222222222222222222222';
  const fundedHtml = injectBountiesBoard(shell, { listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: dest }] });
  const fundedSection = fundedHtml.match(/<section\b[^>]*id=["']dasha-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
  assertBountiesChrome(fundedSection, 'funded board');
  assert.match(fundedSection, /25 USDC/);
  assert.doesNotMatch(fundedSection, /Payout not live/);
  assert.doesNotMatch(fundedSection, /Payouts are not configured yet/);
  assert.doesNotMatch(fundedSection, /not implemented/i);
  assert.doesNotMatch(fundedSection, new RegExp(dest));
  assert.doesNotMatch(JSON.stringify(normalizeBountiesFeed({ listings: [{ payTo: '' }] })), /payTo:""/);
  const pageHtml = bountiesPageHtml(liveFeed);
  assert.match(pageHtml, /<title>Bounties<\/title>/);
  assertBountiesChrome(pageHtml, 'worker-owned page helper');
  assert.match(pageHtml, /Payouts are not configured yet\./);
  assert.doesNotMatch(pageHtml, /href="https:\/\/github\.com\/Uuriko\/dasha-desk\/issues\/8"/);
  assert.match(pageHtml, /No open bounties/);
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts(pageHtml), false, 'worker-owned /bounties HTML must omit USDC / $ payout amounts while unconfigured');
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts('25 USDC'), true);
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts('$25'), true);
  assert.equal(unpaidBountiesHtmlHasPayoutAmounts('$DASHA · Buy $dasha'), false);
}
{
  const nativeFetch = globalThis.fetch;
  const sample = {
    name: 'dasha bounties',
    schema: 'dasha-bounties-feed/v1',
    note: "USDC on Solana. We don't hold it.",
    url: 'https://www.getdasha.com/bounties',
    listings: [
      { kind: 'item', name: 'docs', payTo: '', amount: 25, currency: 'USDC', chain: 'solana' },
      { kind: 'project', name: 'dasha desk', payTo: '11111111111111111111111111111111', amount: 50, currency: 'USDC', chain: 'solana' },
    ],
  };
  try {
    let webflowHit = false;
    const fetched = [];
    globalThis.fetch = async (input) => {
      const u = String(input?.url || input);
      fetched.push(u);
      if (/getdasha\.com\/bounties\.json/.test(u)) webflowHit = true;
      if (u.includes('dasha-desk') && u.includes('bounties.json')) {
        return new Response(JSON.stringify(sample), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ pageId: '6a7dba6b14a729ed4d121341' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
      for (const method of ['GET', 'HEAD']) {
        const res = await workerModule.default.fetch(new Request(`https://${host}/bounties.json`, { method }), {});
        assert.equal(res.status, 200, `${host} /bounties.json ${method} must be the listings feed`);
        assert.equal(res.headers.get('x-dasha-edge'), 'bounties-feed');
        assert.match(res.headers.get('content-type') || '', /application\/json/);
        assert.equal(res.headers.get('cache-control'), 'public, max-age=120');
        assert.equal(res.headers.get('access-control-allow-origin'), '*');
        if (method === 'HEAD') {
          assert.equal(await res.text(), '');
          continue;
        }
        const text = await res.text();
        assert.doesNotMatch(text, /"payTo":""/);
        assert.doesNotMatch(text, /pageId/);
        const body = JSON.parse(text);
        assert.equal(body.schema, 'dasha-bounties-feed/v1');
        assert.equal(body.note, "USDC on Solana. We don't hold it.");
        assert.equal(body.listings[0].payTo, null);
        assert.equal(body.listings[0].payoutStatus, 'not_implemented');
        assert.equal(body.listings[1].payTo, '11111111111111111111111111111111');
      }
    }
    assert.equal(webflowHit, false, '/bounties.json must not fetch Webflow page JSON');
    assert.ok(fetched.some((u) => u.includes('dasha-desk') && u.includes('bounties.json')), 'feed must pin dasha-desk');
    globalThis.fetch = async () => { throw new Error('offline'); };
    const fallback = await workerModule.default.fetch(new Request('https://www.getdasha.com/bounties.json'), {});
    assert.equal(fallback.status, 200);
    assert.equal(fallback.headers.get('x-dasha-edge'), 'bounties-feed');
    const fallbackBody = await fallback.json();
    assert.equal(fallbackBody.schema, 'dasha-bounties-feed/v1');
    assert.equal(fallbackBody.note, "USDC on Solana. We don't hold it.");
    assert.doesNotMatch(JSON.stringify(fallbackBody), /"payTo":""/);
    assert.ok(Array.isArray(fallbackBody.listings));
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
const canonicalSchema = '<script type="application/ld+json">{"@type":"WebSite","@id":"https://www.getdasha.com/#website"}</script>';
const staleSchemas = '<script type="application/ld+json">{"@type":"WebSite"}</script><script type="application/ld+json">{"@type":"SoftwareApplication","license":"https://creativecommons.org/publicdomain/zero/1.0/"}</script>';
assert.equal(sanitizePublicJsonLd(staleSchemas + canonicalSchema), canonicalSchema);
assert.match(sanitizePublicJsonLd('<script type="application/ld+json">{bad}</script>'), /\{bad\}/, 'invalid JSON-LD remains visible to the audit instead of being silently rewritten');
assert.equal(ensureHtmlLang('<!doctype html><html class="w-mod-js"><head>'), '<!doctype html><html lang="en" class="w-mod-js"><head>');
assert.equal(ensureHtmlLang('<html lang="fr"><head>'), '<html lang="fr"><head>', 'preserve an explicit upstream language');
assert.deepEqual(solanaRpcEndpoints({}), ['https://api.mainnet-beta.solana.com']);
assert.deepEqual(solanaRpcEndpoints({ SOLANA_RPC_URLS: 'https://primary.example, https://backup.example, https://ignored.example' }), ['https://primary.example', 'https://backup.example']);
assert.deepEqual(solanaRpcEndpoints({ SOLANA_RPC_URL: 'https://primary.example' }), ['https://primary.example']);
assert.throws(() => solanaRpcEndpoints({ SOLANA_RPC_URL: 'http://unsafe.example' }), /HTTPS/);
const suppressed = publicFunnelSummary({ since: 1, opens: 4, firstEdits: 3 }, { starts: 4, completions: 2 }, { pageOpens: 4, buyIntents: 4 });
assert.equal(suppressed.studio.opens, null);
assert.equal(suppressed.quiz.starts, null);
assert.equal(suppressed.chess.gamesStarted, null);
assert.equal(suppressed.chess.pageOpens, null);
assert.equal(suppressed.chess.linkIntents, null);
assert.equal(suppressed.chess.pageOpenToLinkIntent, null);
assert.equal(suppressed.chess.buyIntents, null);
assert.equal(suppressed.chess.pageOpenToBuyIntent, null);
assert.equal(suppressed.studio.openToEdit, null);
assert.ok(Number.isFinite(Date.parse(suppressed.completionSince)));
assert.doesNotMatch(JSON.stringify(suppressed), /sources|answers|lanes|tiers|elapsed/);
const publicSummary = publicFunnelSummary({ since: 1, opens: 10, firstEdits: 5, completions: 5, exports: 5, shareSuccesses: 5 }, { starts: 10, completions: 5, shares: 5 }, { pageOpens: 10, linkIntents: 8, enrollmentIntents: 7, holderProofIntents: 6, queueIntents: 5, buyIntents: 5, gamesStarted: 10, gamesCompleted: 5, rematchesOffered: 10, rematchesAccepted: 5, replayOpens: 10, replayPlayIntents: 5, replayShareIntents: 5, tournamentsCreated: 5, tournamentShareIntents: 5 });
assert.equal(publicSummary.studio.openToEdit, 0.5);
assert.equal(publicSummary.studio.editToCompletion, 1);
assert.equal(publicSummary.studio.shareApiResolutions, 5);
assert.ok(!('confirmedShares' in publicSummary.studio));
assert.equal(publicSummary.quiz.completeToShareIntent, 1);
assert.equal(publicSummary.chess.pageOpens, 10);
assert.equal(publicSummary.chess.buyIntents, 5);
assert.equal(publicSummary.chess.pageOpenToBuyIntent, 0.5);
assert.equal(publicSummary.chess.pageOpenToLinkIntent, 0.8);
assert.equal(publicSummary.chess.linkToEnrollmentIntent, 0.875);
assert.equal(publicSummary.chess.enrollmentToHolderProofIntent, 0.857);
assert.equal(publicSummary.chess.holderProofToQueueIntent, 0.833);
assert.equal(publicSummary.chess.gameStartToComplete, 0.5);
assert.equal(publicSummary.chess.rematchOfferToAccept, 0.5);
assert.equal(publicSummary.chess.replayOpenToPlay, 0.5);
assert.equal(publicSummary.chess.completionToReplayShare, 1);
const crossSessionSummary = publicFunnelSummary(
  { since: 1, opens: 5, firstEdits: 6 },
  { starts: 5, completions: 6 },
  { gamesCompleted: 5, replayShareIntents: 6, replayShareHandoffs: 5 },
);
assert.equal(crossSessionSummary.studio.openToEdit, null, 'cross-session event ratios above one are not comparable cohorts');
assert.equal(crossSessionSummary.quiz.startToComplete, null, 'aggregate quiz events must not masquerade as conversion above one');
assert.equal(crossSessionSummary.chess.completionToReplayShare, null, 'repeat replay shares must not break or inflate the public funnel');
assert.equal(crossSessionSummary.chess.replayShareIntentToHandoff, 0.833, 'a bounded intent-to-handoff ratio remains useful');
const { createSessionToken, signPayload, verifyPayload } = await import('./dasha-lobby-x.mjs');

for (const path of ['/', '/lobby', '/oauth/x/start?return=%2Flobby', '/client/studio.js']) {
  const redirected = await workerModule.default.fetch(new Request(`http://lobby.getdasha.com${path}`), {});
  assert.equal(redirected.status, 308, `${path} must redirect to HTTPS`);
  assert.equal(redirected.headers.get('location'), `https://lobby.getdasha.com${path}`);
}
for (const path of ['/robots.txt', '/sitemap.xml']) {
  const response = await workerModule.default.fetch(new Request(`https://www.getdasha.com${path}`, { method: 'HEAD' }), {});
  assert.equal(response.status, 200, `${path} HEAD must match GET status`);
  assert.equal(await response.text(), '', `${path} HEAD must not return a body`);
}
for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
  const sitemap = await workerModule.default.fetch(new Request(`https://${host}/sitemap.xml`), {});
  assert.equal(sitemap.status, 200, `${host} /sitemap.xml must stay 200`);
  assert.match(sitemap.headers.get('content-type') || '', /application\/xml/);
  const sitemapBody = await sitemap.text();
  for (const loc of [
    'https://www.getdasha.com/',
    'https://www.getdasha.com/studio',
    'https://www.getdasha.com/lobby',
    'https://www.getdasha.com/dasha',
    'https://www.getdasha.com/how-to-buy',
    'https://www.getdasha.com/privacy',
    'https://www.getdasha.com/bounties',
    'https://www.getdasha.com/simp',
    'https://www.getdasha.com/verse',
    'https://www.getdasha.com/chess',
    'https://www.getdasha.com/graph',
    'https://www.getdasha.com/learn',
    'https://www.getdasha.com/faucet',
  ]) {
    assert.match(sitemapBody, new RegExp(`<loc>${loc.replaceAll('.', '\\.')}</loc>`), `${host} sitemap must list ${loc}`);
  }
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/capsule/, `${host} sitemap must not invent /capsule`);
  assert.doesNotMatch(sitemapBody, /lobby\.getdasha\.com\/bounties/, `${host} sitemap must not list lobby /bounties`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/forum/, `${host} sitemap must not add Forum`);
  assert.doesNotMatch(sitemapBody, /lobby\.getdasha\.com\/chess/, `${host} sitemap must not list lobby chess`);
  assert.match(sitemapBody, /\n  <url>\n    <loc>https:\/\/www\.getdasha\.com\/chess<\/loc>\n  <\/url>\n/, `${host} sitemap chess URL must keep the same indent as other locs`);
  const robots = await workerModule.default.fetch(new Request(`https://${host}/robots.txt`), {});
  const robotsBody = await robots.text();
  assert.match(robotsBody, /Allow: \/verse/, `${host} robots must allow /verse`);
  assert.match(robotsBody, /Allow: \/graph/, `${host} robots must allow /graph`);
  assert.match(robotsBody, /Allow: \/learn/, `${host} robots must allow /learn`);
  assert.match(robotsBody, /Allow: \/faucet/, `${host} robots must allow /faucet`);
}

{
  const VERSE_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const verseHtml = versePageHtml();
  assert.match(verseHtml, /<h1>Dashaverse<\/h1>/);
  assert.match(verseHtml, /Other Dasha sites\. Ours is the token\. Send the next one\./);
  assert.match(verseHtml, /Dasha Madness/);
  assert.match(verseHtml, /https:\/\/dashamadness\.com\//);
  assert.match(verseHtml, /target="_blank" rel="noopener noreferrer">Go there ↗<\/a>/);
  assert.match(verseHtml, /We don't run dashamadness\.com/);
  assert.doesNotMatch(verseHtml, /featured|getdasha\.com<\/p>|payTo|\/hold|53ux/i);
  assert.doesNotMatch(verseHtml, /type="email"|name="email"|name="name"/i);
  for (const hex of verseHtml.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
    assert.ok(VERSE_TOKENS.includes(hex.toLowerCase()), `verse page must stay tokens-only (saw ${hex})`);
  }
  assert.equal(parseVerseSubmit({ url: 'javascript:alert(1)' }).error, 'Need an http(s) link.');
  assert.equal(parseVerseSubmit({ url: 'data:text/html,x' }).error, 'Need an http(s) link.');
  assert.equal(parseVerseSubmit({ url: 'not-a-url' }).error, 'Need an http(s) link.');
  assert.equal(parseVerseSubmit({ url: 'https://dashamadness.com/more' }).url, 'https://dashamadness.com/more');
  const verseRows = new Map();
  const verseState = {
    storage: {
      get: async (key) => verseRows.get(key),
      put: async (key, value) => { if (key && typeof key === 'object') { for (const [k, v] of Object.entries(key)) verseRows.set(k, v); return; } verseRows.set(key, value); },
      delete: async (key) => verseRows.delete(key),
      getAlarm: async () => 1,
      setAlarm: async () => {},
    },
    setWebSocketAutoResponse() {},
    blockConcurrencyWhile(fn) { this.ready = fn(); },
  };
  const verseDo = new DashaLobby(verseState, { ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com' });
  await verseState.ready;
  const verseEnv = { LOBBY: { idFromName: () => 'room', get: () => verseDo } };
  for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
    for (const method of ['GET', 'HEAD']) {
      const page = await workerModule.default.fetch(new Request(`https://${host}/verse`, { method }), {});
      assert.equal(page.status, 200, `${host} /verse ${method} must be 200`);
      assert.equal(page.headers.get('x-dasha-edge'), 'verse');
      const html = await page.text();
      if (method === 'HEAD') {
        assert.equal(html, '', `${host} /verse HEAD must return an empty body`);
      } else {
        assert.match(html, /Dasha Madness/);
        assert.match(html, /https:\/\/dashamadness\.com\//);
        assert.doesNotMatch(html, /Got it\. We'll look/);
      }
      const alias = await workerModule.default.fetch(new Request(`https://${host}/dashaverse`, { method }), {});
      assert.equal(alias.status, 308, `${host} /dashaverse ${method} must alias to /verse`);
      assert.equal(alias.headers.get('location'), 'https://www.getdasha.com/verse');
    }
    const bad = await workerModule.default.fetch(new Request(`https://${host}/verse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url: 'javascript:alert(1)' }),
    }), {});
    assert.equal(bad.status, 400, `${host} verse must reject a javascript: URL`);
    assert.match(JSON.stringify(await bad.json()), /Need an http\(s\) link/);
    const missing = await workerModule.default.fetch(new Request(`https://${host}/verse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/dasha' }),
    }), {});
    assert.equal(missing.status, 503, `${host} verse must not fake a save without the lobby room`);
    assert.match((await missing.json()).error, /Couldn't save/);
    const saved = await workerModule.default.fetch(new Request(`https://${host}/verse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'CF-Connecting-IP': '203.0.113.9' },
      body: JSON.stringify({ url: 'https://example.com/dasha', note: 'another board' }),
    }), verseEnv);
    assert.equal(saved.status, 200, `${host} verse must persist a valid URL`);
    assert.equal((await saved.json()).status, "Got it. We'll look.");
    const listed = await workerModule.default.fetch(new Request(`https://${host}/verse`), verseEnv);
    const listedHtml = await listed.text();
    assert.match(listedHtml, /Dasha Madness/);
    assert.doesNotMatch(listedHtml, /example\.com\/dasha|another board/, `${host} must keep pending submissions off the public list`);
  }
  assert.equal(verseDo.versePending.length, 3);
  assert.equal(verseDo.versePending[0].url, 'https://example.com/dasha');
  const formSaved = await workerModule.default.fetch(new Request('https://www.getdasha.com/verse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.10' },
    body: 'url=https%3A%2F%2Fexample.net%2Flore&note=',
  }), verseEnv);
  assert.equal(formSaved.status, 200);
  assert.match(await formSaved.text(), /Got it\. We(?:'|&#39;)ll look/);
}

// Adversarial OAuth error text stays text, never markup; private pages are hardened and noindexed.
const hostile = '<img src=x onerror=alert(1)>';
const oauthError = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com/oauth/x/callback?error=${encodeURIComponent(hostile)}`), {
  X_CLIENT_ID: 'test', X_CLIENT_SECRET: 'test', LOBBY_SESSION_SECRET: 'test-secret', ALLOWED_ORIGINS: 'https://www.getdasha.com',
});
assert.equal(oauthError.status, 400);
const oauthHtml = await oauthError.text();
assert(!oauthHtml.includes(hostile) && oauthHtml.includes('&lt;img'), 'OAuth error reflected executable HTML');
assert.equal(oauthError.headers.get('x-frame-options'), 'DENY');
assert.equal(oauthError.headers.get('strict-transport-security'), 'max-age=31536000');
assert.match(oauthError.headers.get('content-security-policy') || '', /frame-ancestors 'none'.*base-uri 'none'.*object-src 'none'/);
assert.match(oauthError.headers.get('content-security-policy') || '', /default-src 'none'.*script-src 'none'.*form-action 'none'/);
assert.match(oauthError.headers.get('permissions-policy') || '', /camera=\(\).*microphone=\(\)/);
assert.equal(oauthError.headers.get('x-robots-tag'), 'noindex, nofollow');
assert.match(oauthError.headers.get('set-cookie') || '', /^__Host-dasha_x_oauth=;.*Max-Age=0.*HttpOnly.*Secure.*SameSite=Lax/i, 'callback must invalidate OAuth state cookie');

const oauthEnv = { X_CLIENT_ID: 'test-client', X_CLIENT_SECRET: 'test-secret', LOBBY_SESSION_SECRET: 'test-session', ALLOWED_ORIGINS: 'https://www.getdasha.com' };
const oauthStart = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start'), oauthEnv);
assert.equal(oauthStart.status, 200);
assert.match(await oauthStart.text(), /\/privacy[\s\S]*Continue with X/);
const oauthContinue = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?continue=1'), oauthEnv);
assert.equal(oauthContinue.status, 302);
assert.match(oauthContinue.headers.get('set-cookie') || '', /^__Host-dasha_x_oauth=.+Path=\/.*HttpOnly.*Secure.*SameSite=Lax/i);
assert.match(oauthContinue.headers.get('location') || '', /code_challenge_method=S256/);
const oauthGraphStart = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?return=/graph'), oauthEnv);
assert.equal(oauthGraphStart.status, 200);
assert.match(await oauthGraphStart.text(), /continue=1&amp;return=https%3A%2F%2Fwww\.getdasha\.com%2Fgraph|continue=1&return=https%3A%2F%2Fwww\.getdasha\.com%2Fgraph/);
const oauthEvilStart = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?return=https://evil.example/phish'), oauthEnv);
assert.doesNotMatch(await oauthEvilStart.text(), /evil\.example/);
const oauthGraphContinue = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?continue=1&return=/graph'), oauthEnv);
assert.equal(oauthGraphContinue.status, 302);
const oauthCookie = (oauthGraphContinue.headers.get('set-cookie') || '').match(/__Host-dasha_x_oauth=([^;]+)/)?.[1];
const oauthState = await verifyPayload(oauthEnv.LOBBY_SESSION_SECRET, oauthCookie);
assert.equal(oauthState.cont, 'https://www.getdasha.com/graph');
assert.match(worker, /<script nonce="\$\{scriptNonce\}">/);
assert.match(worker, /privateHtmlHeaders\(\{[\s\S]*?'Content-Type': 'text\/html; charset=utf-8'[\s\S]*?\}, scriptNonce\)/);

const privacy = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/privacy'), {});
assert.equal(privacy.status, 200);
const privacyText = await privacy.text();
assert.match(privacyText, /does not store the X access token[\s\S]*Completed chess games are public replays showing both X handles, ratings, moves, result, and completion time/);
assert.match(privacyText, /opt in to graph highlight[\s\S]*public X handle on \/graph until that proof expires, or until you leave the Board or unlink/);
assert.match(privacyText, /Leave Board removes[\s\S]*chess rating, games and tournaments involving you[\s\S]*potter@trydemigod\.com/);
assert.equal(privacy.headers.get('x-robots-tag'), null);
for (const host of ['lobby.getdasha.com', 'www.getdasha.com']) {
  const response = await workerModule.default.fetch(new Request(`https://${host}/.well-known/security.txt`), {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /^text\/plain/);
  const body = await response.text();
  assert.match(body, /^Contact: https:\/\/github\.com\/Uuriko\/dasha-desk\/security\/advisories\/new/m);
  assert.match(body, /^Expires: 2027-08-01T00:00:00Z$/m);
  assert.match(body, new RegExp(`^Canonical: https://${host.replaceAll('.', '\\.')}\/\\.well-known\/security\\.txt$`, 'm'));
}

const logout = (method, origin) => workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/logout', { method, ...(origin ? { headers: { Origin: origin } } : {}) }), oauthEnv);
assert.equal((await logout('GET')).status, 405, 'logout must not mutate on GET');
const hostileLogout = await logout('POST', 'https://evil.example');
assert.equal(hostileLogout.status, 403);
assert.equal(hostileLogout.headers.get('set-cookie'), null);
const siteLogout = await logout('POST', 'https://www.getdasha.com');
assert.equal(siteLogout.status, 200);
assert.equal(siteLogout.headers.get('access-control-allow-origin'), 'https://www.getdasha.com');
assert.match(siteLogout.headers.get('set-cookie') || '', /__Host-dasha_x=;.*Max-Age=0/);
assert.match(siteLogout.headers.get('set-cookie') || '', /(?:^|, )dasha_x=;.*Max-Age=0/, 'logout must retire the legacy session cookie');

// Public HTML gets the browser hardening but must remain indexable.
const publicLobby = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/lobby'), {});
assert.equal(publicLobby.status, 200);
assert.equal(publicLobby.headers.get('x-frame-options'), 'DENY');
assert.equal(publicLobby.headers.get('strict-transport-security'), 'max-age=31536000');
assert.equal(publicLobby.headers.get('x-robots-tag'), null);
const publicLobbyHead = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/lobby', { method: 'HEAD' }), {});
assert.equal(publicLobbyHead.status, 200);
assert.equal(await publicLobbyHead.text(), '');

const ogAsset = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/og/dasha-social-card.png'), {
  ASSETS: { fetch: async () => new Response('png', { headers: { 'Content-Type': 'image/png' } }) },
});
assert.equal(ogAsset.status, 200);
assert.equal(ogAsset.headers.get('content-type'), 'image/png');
assert.equal(ogAsset.headers.get('access-control-allow-origin'), '*');
assert.equal(ogAsset.headers.get('cross-origin-resource-policy'), 'cross-origin');
assert.equal(ogAsset.headers.get('cache-control'), 'public, max-age=86400');

for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    const photo = await workerModule.default.fetch(new Request(`https://${host}/simp/photo/weekend.jpg`, { method }), {
      ASSETS: { fetch: async (req) => new Response(req.method === 'HEAD' ? null : 'jpg', { status: 200, headers: { 'Content-Type': 'image/jpeg' } }) },
    });
    assert.equal(photo.status, 200, `${host} ${method} /simp/photo/weekend.jpg must be 200`);
    assert.equal(photo.headers.get('content-type'), 'image/jpeg');
    assert.equal(await photo.text(), method === 'HEAD' ? '' : 'jpg');
  }
}
for (const host of ['www.getdasha.com', 'getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    const res = await workerModule.default.fetch(new Request(`https://${host}/og/dasha-social-card.png`, { method }), {
      ASSETS: { fetch: async (req) => new Response(req.method === 'HEAD' ? null : 'png', { status: 200, headers: { 'Content-Type': 'image/png' } }) },
    });
    assert.equal(res.status, 200, `${host} ${method} /og/dasha-social-card.png must serve ASSETS PNG`);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(res.headers.get('cache-control'), 'public, max-age=86400');
    assert.equal(await res.text(), method === 'HEAD' ? '' : 'png');
  }
}

const corsEnv = { ALLOWED_ORIGINS: 'https://www.getdasha.com' };
const preflight = origin => workerModule.default.fetch(new Request('https://lobby.getdasha.com/simp/join', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } }), corsEnv);
const evilPreflight = await preflight('https://evil.example');
assert.equal(evilPreflight.status, 403);
assert.equal(evilPreflight.headers.get('access-control-allow-origin'), null);
const sitePreflight = await preflight('https://www.getdasha.com');
assert.equal(sitePreflight.status, 204);
assert.equal(sitePreflight.headers.get('access-control-allow-origin'), 'https://www.getdasha.com');
assert.equal(sitePreflight.headers.get('access-control-allow-credentials'), 'true');

const nativeFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response('<!doctype html><html class="w-mod-js"><title>Dasha</title>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const proxiedHome = await workerModule.default.fetch(new Request('https://www.getdasha.com/'), {});
  assert.equal(proxiedHome.status, 200);
  assert.equal(proxiedHome.headers.get('x-frame-options'), 'DENY');
  assert.match(proxiedHome.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  assert.equal(proxiedHome.headers.get('x-robots-tag'), null);
  assert.equal(proxiedHome.headers.get('x-dasha-edge'), 'html-security');
  assert.match(await proxiedHome.text(), /<html lang="en" class="w-mod-js">/);
} finally {
  globalThis.fetch = nativeFetch;
}
{
  const leftoverSimpCss = /\.simp-(handle|badge|evidence|open|status|privacy|basis|pts|badges|season|actions|tool-actions|action|tool|me|tools)\b/;
  const homeFixture = `<!doctype html><html class="w-mod-js"><title>$dasha — make the timeline stranger</title>
<style>
:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00}
.dasha{min-height:100vh;color:var(--paper)}
.pill{display:inline-flex;min-height:48px}
.contract{border:1px solid red}
.simp-board{display:grid;gap:10px;max-width:920px}.simp-row{display:grid}.simp-rank{font-size:42px}
.simp-board-root{max-width:920px}
.dasha .simp-handle{display:inline-flex;align-items:center;min-height:44px;color:var(--paper)!important;font-size:clamp(22px,4vw,38px);font-weight:950;text-decoration:none!important}
.simp-badge{display:inline-block;margin-left:10px;padding:7px 9px;background:var(--hot);color:var(--ink);font-size:11px;font-weight:950;letter-spacing:.06em}
.dasha .simp-evidence{display:inline-flex;align-items:center;min-height:44px;color:var(--paper)!important;font-size:14px;font-weight:900;text-underline-offset:4px}
.simp-open{grid-template-columns:90px 1fr;background:rgba(255,255,255,.025)}
.simp-status,.simp-privacy,.simp-basis,.simp-pts,.simp-badges,.simp-season{margin:0;color:rgba(244,237,219,.78);font-size:14px}
.simp-handle+.simp-pts{margin-left:10px}
.simp-actions,.simp-tool-actions{display:flex;flex-wrap:wrap;gap:10px}
.simp-action,.simp-tool{min-height:44px;padding:0 16px;border:1px solid var(--acid);border-radius:999px;background:var(--acid);color:var(--ink);font:inherit;font-size:12px;font-weight:950;text-transform:uppercase;cursor:pointer}
.simp-me,.simp-tools{padding:14px;border:1px solid var(--line);background:rgba(124,77,255,.09)}
.price{margin:0}
.spark{grid-area:spark;height:44px}
@media(max-width:600px){.simp-row{grid-template-columns:54px 1fr}.simp-rank{font-size:30px}.simp-evidence{grid-column:2}.simp-badge{display:table;margin:8px 0 0}.price{padding:0}}
@media(max-width:480px){.pill{padding:0 17px}.contract{padding:24px}}
</style>
<section id="token"><h2>$dasha.</h2></section>
<section id="simp" aria-labelledby="simp-title"><div class="wrap">
<h2 class="section-title" id="simp-title">Simp board.</h2>
<div id="dasha-simp-board" data-simp-api="https://lobby.getdasha.com"></div>
</div></section>
<script>(()=>{const root=document.getElementById('dasha-simp-board');const s=document.createElement('script');s.src='https://lobby.getdasha.com/client/simp-board.js';document.head.appendChild(s)})()</script>
</html>`;
  const cleaned = stripHomeSimpBoard(homeFixture);
  assert.doesNotMatch(cleaned, /simp-board\.js/);
  assert.doesNotMatch(cleaned, /dasha-simp-board/);
  assert.doesNotMatch(cleaned, /Simp board\./);
  assert.doesNotMatch(cleaned, /\.simp-board/);
  assert.doesNotMatch(cleaned, /\.simp-row/);
  assert.doesNotMatch(cleaned, /\.simp-rank/);
  assert.doesNotMatch(cleaned, leftoverSimpCss);
  assert.match(cleaned, /id="token"/);
  assert.match(cleaned, /:root\{--ink:#070608/);
  assert.match(cleaned, /\.dasha\{min-height:100vh/);
  assert.match(cleaned, /\.pill\{display:inline-flex/);
  assert.match(cleaned, /\.contract\{border:1px solid red\}/);
  assert.match(cleaned, /\.price\{margin:0\}/);
  assert.match(cleaned, /\.spark\{grid-area:spark/);
  assert.match(cleaned, /@media\(max-width:600px\)\{\.price\{padding:0\}\}/);
  assert.match(cleaned, /@media\(max-width:480px\)\{\.pill\{padding:0 17px\}\.contract\{padding:24px\}\}/);
  assert.equal(stripHomeSimpBoard(homeFixture), cleaned);
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(homeFixture, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const home = await workerModule.default.fetch(new Request(`https://${host}/`), {});
      const html = await home.text();
      assert.match(html, /lobby\.getdasha\.com\/client\/simp-board\.js/, `${host} / must remount the SRI'd Simp client in the hero`);
      assert.ok(html.includes(`integrity="${SIMP_BOARD_SRI}"`), `${host} / simp-board.js must keep its SRI pin`);
      assert.match(html, /id="dasha-simp-board"/, `${host} / must mount the quiz in the first viewport`);
      assert.match(html, /class="dasha-quiz"/, `${host} / must keep one .dasha-quiz mount`);
      assert.doesNotMatch(html, /Simp board\./, `${host} / must drop the leftover Simp board heading`);
      assert.doesNotMatch(html, /\.simp-board/, `${host} / must drop leftover Simp CSS`);
      assert.doesNotMatch(html, leftoverSimpCss, `${host} / must drop the 16 leftover Simp selectors`);
      assert.doesNotMatch(html, /score=|"answer"\s*:/, `${host} / must not leak answers`);
      assert.match(html, /id="token"/);
      assert.match(html, /\.dasha\{min-height:100vh/, `${host} / must keep .dasha`);
      assert.match(html, /\.contract\{border:1px solid red\}/, `${host} / must keep unrelated CSS`);
      assert.equal(home.headers.get('x-dasha-edge'), 'html-security');
    }
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      for (const path of ['/lobby', '/lobby/']) {
        const lobby = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        const lobbyHtml = await lobby.text();
        assert.doesNotMatch(lobbyHtml, /lobby\.getdasha\.com\/client\/simp-board\.js/, `${host} ${path} must not mount the Simp client`);
        assert.doesNotMatch(lobbyHtml, /id="dasha-simp-board"/, `${host} ${path} must not keep a Simp mount`);
        assert.doesNotMatch(lobbyHtml, /dasha-quiz/, `${host} ${path} must not expose a quiz mount`);
        assert.doesNotMatch(lobbyHtml, /Simp board\./, `${host} ${path} must drop leftover Simp board heading`);
        assert.doesNotMatch(lobbyHtml, leftoverSimpCss, `${host} ${path} must drop leftover Simp CSS`);
        assert.doesNotMatch(lobbyHtml, /\.simp-board\{/, `${host} ${path} must drop leftover .simp-board CSS`);
        assert.doesNotMatch(lobbyHtml, /score=|"answer"\s*:/, `${host} ${path} must not leak answers`);
        assert.match(lobbyHtml, /id="token"/, `${host} ${path} must keep #token`);
        assert.match(lobbyHtml, /:root\{--ink:#070608/, `${host} ${path} must keep :root tokens`);
        assert.match(lobbyHtml, /\.dasha\{min-height:100vh/, `${host} ${path} must keep .dasha`);
        assert.match(lobbyHtml, /\.pill\{display:inline-flex/, `${host} ${path} must keep .pill`);
        assert.match(lobbyHtml, /\.price\{margin:0\}/, `${host} ${path} must keep .price`);
        assert.match(lobbyHtml, /\.contract\{border:1px solid red\}/, `${host} ${path} must keep .contract`);
        assert.match(lobbyHtml, /\.spark\{grid-area:spark/, `${host} ${path} must keep .spark`);
        assert.match(lobbyHtml, /@media\(max-width:480px\)\{\.pill\{padding:0 17px\}\.contract\{padding:24px\}\}/, `${host} ${path} must keep unrelated media queries`);
      }
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const HOME_HEXES = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  const buy = 'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  const styleHexes = html => [...String(html).matchAll(/(?:background|color|box-shadow|fill|stroke)\s*:[^;{}]*?(#[0-9a-fA-F]{3,8})\b/gi)].map(m => m[1].toLowerCase());
  const webflowHome = `<!doctype html><html class="w-mod-js"><title>$dasha — make the timeline stranger</title>
<link href="https://cdn.prod.website-files.com/img/favicon.ico" rel="shortcut icon" type="image/x-icon"/>
<script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"></script>
<script>WebFont.load({google:{families:["Exo:400","Bangers:regular","Raleway:400"]}});</script>
<style>
:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81;--violet:#7c4dff;--hot-deep:#c21f5a}
.simp-board{display:grid}.simp-row{display:grid}.simp-rank{font-size:42px}
.dasha{min-height:100vh;background:radial-gradient(circle at 80% 5%,rgba(124,77,255,.35),transparent 32rem),var(--ink)}
.body{background-color:#1f041c}
.dasha-hero{min-height:640px}
#dasha-home h1{color:var(--ink,#F2EDE7)}
</style>
<body class="body"><div id="dasha-home" class="dasha-root"><div class="w-embed w-script">
<a class="skip-link" href="#content">Skip to content</a>
<section id="dasha-home-cta" aria-label="Simp"><style>#dasha-home-cta{min-height:100vh;font:16px/1.45 system-ui,sans-serif}</style><h1>$dasha</h1><p>Take Simp.</p><p><a href="/simp">Simp</a></p></section>
<main class="dasha" id="top">
<nav class="nav wrap"><a href="/studio">Studio</a><a href="#token">CA 53ux…pump</a><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a><a href="https://lobby.getdasha.com/forum">Forum</a></nav>
<header class="dasha-hero wrap" id="content"><h1>It's time $dasha</h1><div class="poster"><a class="poster-tile">How u crying at the casino</a></div></header>
<section id="token"><code id="mint">${mint}</code><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a></section>
<footer><p><a href="/how-to-buy">How to buy</a> · <a href="https://lobby.getdasha.com/forum">Forum</a> · <a href="/lobby">Lobby</a> · <a href="/dasha">Desk</a> · <a href="https://lobby.getdasha.com/chess">Chess</a></p></footer>
</main>
</div></div></body></html>`;
  const homeFirst = html => {
    const match = String(html).match(/<section\b[^>]*\bid=["']dasha-lock["'][^>]*>[\s\S]*?<\/section>/i);
    assert.ok(match, 'home must inject #dasha-lock');
    return match[0];
  };
  const firstSectionAt = html => String(html).search(/<section\b/i);
  const assertHomeFirst = (html, label) => {
    const section = homeFirst(html);
    assert.equal(firstSectionAt(html), html.search(/<section\b[^>]*\bid=["']dasha-lock["']/i), `${label} first section must be #dasha-lock`);
    assert.doesNotMatch(html, /id=["']dasha-home-cta["']/, `${label} must drop the 100vh decoy`);
    assert.doesNotMatch(html, /Take Simp\./, `${label} must drop decoy copy`);
    assert.doesNotMatch(section, /min-height:\s*100vh/, `${label} first viewport must not be a 100vh stub`);
    assert.match(section, /html,body,body\.body,\.dasha-root,\.dasha\{background:#070608!important/, `${label} must force ink on the Webflow maroon body`);
    assert.doesNotMatch(html, /#1[fF]041[cC]/, `${label} must replace maroon #1F041C`);
    assert.match(section, /class="dasha-band"/, `${label} must have the acid band`);
    assert.match(section, /IT(?:'|&\#39;)S TIME \$DASHA/, `${label} band must carry culture lines`);
    assert.match(section, /animation:dasha-band 28s linear infinite/, `${label} band must animate`);
    assert.doesNotMatch((section.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '').split('@media')[0], /animation:\s*none/, `${label} band default must not be animation:none`);
    assert.match(section, /prefers-reduced-motion:reduce[^}]*animation:\s*none/, `${label} reduced motion must freeze the ticker`);
    assert.match(section, /\$DASHA/, `${label} must show $DASHA`);
    assert.match(section, /src="\/favicon\.svg"/, `${label} must show cherries`);
    assert.match(section, /href="\/studio">Studio</, `${label} nav must include Studio`);
    assert.match(section, /href="#simp">Simp</, `${label} nav must include in-hero Simp`);
    assert.match(section, /href="\/graph">Graph</, `${label} nav must include Graph`);
    assert.match(section, /href="\/verse">Verse</, `${label} nav must include Verse`);
    assert.match(section, /href="\/bounties">Bounties</, `${label} nav must include Bounties`);
    assert.match(section, /href="\/how-to-buy">How to buy</, `${label} nav must include How to buy`);
    assert.match(section, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</, `${label} nav must include @dash_eats`);
    assert.match(section, /class="dasha-x"[^>]*href="https:\/\/x\.com\/dash_eats"/, `${label} lock must pin @dash_eats under the headline`);
    assert.doesNotMatch(section, /href=["']\/simp["']/, `${label} must not send the hero CTA to \/simp`);
    assert.doesNotMatch(section, /53ux|buy-dasha|#token|jup\.ag|Buy \$dasha|Buy \/ verify/, `${label} must keep CA and Jupiter Buy out of the first-viewport nav`);
    assert.match(html, new RegExp(`id="token"[\\s\\S]*${mint}[\\s\\S]*buy-dasha`), `${label} must keep CA + Buy in #token`);
    assert.equal([...section.matchAll(/<h1\b/g)].length, 1, `${label} lock must have one h1`);
    assert.doesNotMatch(html, /<header\b[^>]*dasha-hero[\s\S]*<h1/, `${label} must drop the second hero h1`);
    assert.match(section, /<h1>IT(?:'|&\#39;)S TIME \$DASHA<\/h1>/, `${label} must have one culture display line`);
    assert.match(section, /class="dasha-posters"/, `${label} must keep the poster stack in the first viewport`);
    assert.match(section, /dasha-posters[\s\S]*href="\/graph">Graph</, `${label} must keep a Graph poster`);
    assert.match(section, /max-height:8\.5rem/, `${label} posters must fit inside 800px`);
    assert.match(section, /@media\(max-width:640px\)\{#dasha-lock \.dasha-posters\{grid-template-columns:1fr\}\}/, `${label} posters must stack under 640px`);
    assert.match(section, /id="dasha-simp-board"/, `${label} must mount the quiz`);
    assert.equal([...section.matchAll(/class="dasha-quiz"/g)].length, 1, `${label} must keep one .dasha-quiz`);
    assert.match(section, /lobby\.getdasha\.com\/client\/simp-board\.js/, `${label} must load the existing quiz client`);
    assert.ok(section.includes(`integrity="${SIMP_BOARD_SRI}"`), `${label} quiz client must be SRI-pinned`);
    assert.match(section, /crossorigin="anonymous"/, `${label} quiz client must be CORS-anonymous`);
    assert.match(section, /References describe internet culture\. Not endorsement\./, `${label} must keep the association line`);
    assert.doesNotMatch(html, /WebFont\.load|webfont\.js/, `${label} must drop WebFont.load`);
    assert.doesNotMatch(html, /Exo|Bangers|Raleway/, `${label} must drop Exo\/Bangers\/Raleway`);
    assert.doesNotMatch(html, /\/forum/, `${label} must drop Forum hrefs`);
    assert.doesNotMatch(html, /--hot-deep|rgba\(124,\s*77,\s*255/, `${label} must drop the violet wash and --hot-deep`);
    assert.doesNotMatch(section, /radial-gradient|#7c4dff/, `${label} first viewport must not use violet`);
    assert.doesNotMatch(section, /system-ui/, `${label} first viewport must not use system-ui`);
    assert.doesNotMatch(section, /<form\b|wallet-connect|payTo|\/oauth|class="simp-|score=/i);
    const lowerNav = html.match(/<nav class="nav wrap">[\s\S]*?<\/nav>/i)?.[0] || '';
    assert.match(lowerNav, /href="\/studio">Studio</, `${label} lower nav must include Studio`);
    assert.match(lowerNav, /href="\/simp">Simp</, `${label} lower nav must include Simp`);
    assert.match(lowerNav, /href="\/graph">Graph</, `${label} lower nav must include Graph`);
    assert.match(lowerNav, /href="\/verse">Verse</, `${label} lower nav must include Verse`);
    assert.match(lowerNav, /href="\/bounties">Bounties</, `${label} lower nav must include Bounties`);
    assert.match(lowerNav, /@dash_eats/, `${label} lower nav must include @dash_eats`);
    assert.doesNotMatch(lowerNav, /Buy|#token|\/lobby|\/forum/i, `${label} lower nav must stay culture-only`);
    assert.match(html, /href="\/lobby"/, `${label} Lobby stays in the footer`);
    assert.match(html, /href="\/dasha"/, `${label} Desk stays in the footer`);
    assert.match(html, /lobby\.getdasha\.com\/chess/, `${label} Chess stays in the footer`);
    for (const hex of styleHexes(section)) {
      assert.ok(HOME_HEXES.includes(hex), `${label} first viewport must stay tokens-only (saw ${hex})`);
    }
    assert.doesNotMatch(html, /\.simp-/);
    return section;
  };
  const injected = rewriteHomeFirstViewport(stripHomeSimpBoard(webflowHome));
  assertHomeFirst(injected, 'rewrite');
  assert.match(injected, /<a class="skip-link" href="#simp">Skip to content<\/a><section id="dasha-lock"/);
  assert.match(injected, /id="dasha-home"/, 'live Webflow wrapper id=dasha-home must not block the lock');
  assert.match(injected, new RegExp(mint));
  assert.equal(rewriteHomeFirstViewport(injected), injected, 'second pass must not duplicate #dasha-lock');
  assert.equal([...injected.matchAll(/id=["']dasha-lock["']/g)].length, 1);
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(webflowHome, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const home = await workerModule.default.fetch(new Request(`https://${host}/`), {});
      const html = await home.text();
      assertHomeFirst(html, `${host} /`);
      assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 1, `${host} / must keep one Privacy link`);
      assert.match(html, /<link href="\/favicon\.ico" rel="shortcut icon"/);
      assert.match(html, new RegExp(mint), `${host} / must keep the mint string`);
      assert.equal([...html.matchAll(/id=["']dasha-lock["']/g)].length, 1);
    }
    const studio = await workerModule.default.fetch(new Request('https://www.getdasha.com/studio'), {});
    assert.doesNotMatch(await studio.text(), /id=["']dasha-lock["']/, '/studio must not get the home first viewport');
  } finally {
    globalThis.fetch = nativeFetch;
  }
  const lobbyRoot = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/'), {});
  assert.equal(lobbyRoot.status, 200, 'lobby GET / must stay JSON health');
  assert.match(lobbyRoot.headers.get('content-type') || '', /application\/json/);
  assert.equal((await lobbyRoot.json()).ok, true);
  const simp = await workerModule.default.fetch(new Request('https://www.getdasha.com/simp'), {});
  assert.equal(simp.status, 200);
  assert.equal(simp.headers.get('x-dasha-edge'), 'simp');
  assert.match(await simp.text(), /<h1>Simp<\/h1>/);
  const quiz = await workerModule.default.fetch(new Request('https://www.getdasha.com/quiz'), {});
  assert.equal(quiz.status, 308);
  assert.equal(quiz.headers.get('location'), 'https://www.getdasha.com/simp');
  const hold = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/simp/hold'), {});
  assert.equal(hold.status, 501);
  assert.equal((await hold.json()).error, 'not_configured');
}
{
  const leftoverLiveSelectors = ['.simp-basis', '.simp-me', '.simp-privacy', '.simp-pts', '.simp-season', '.simp-status'];
  const lobbyDeadCss = `<!doctype html><html class="w-mod-js"><title>$dasha lobby</title>
<style>
:root{--ink:#070608;--paper:#f4eddb}
.dasha{min-height:100vh;color:var(--paper)}
.pill{display:inline-flex;min-height:48px}
.price{margin:0}
.contract{border:1px solid red}
.spark{grid-area:spark;height:44px}
.simp-basis{margin:0}
.simp-me{padding:14px}
.simp-privacy{color:rgba(244,237,219,.78)}
.simp-pts{margin-left:10px}
.simp-season{font-size:14px}
.simp-status{margin:0}
@media(max-width:480px){.pill{padding:0 17px}.contract{padding:24px}}
</style>
<section id="token"><h2>$dasha.</h2></section>
</html>`;
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(lobbyDeadCss, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    for (const path of ['/lobby', '/lobby/']) {
      const page = await workerModule.default.fetch(new Request(`https://www.getdasha.com${path}`), {});
      const html = await page.text();
      for (const sel of leftoverLiveSelectors) {
        assert.doesNotMatch(html, new RegExp(`${sel.replace('.', '\\.')}\\b`), `www ${path} must drop ${sel}`);
      }
      assert.match(html, /:root\{--ink:#070608/, `www ${path} must keep :root tokens`);
      assert.match(html, /\.dasha\{min-height:100vh/, `www ${path} must keep .dasha`);
      assert.match(html, /\.pill\{display:inline-flex/, `www ${path} must keep .pill`);
      assert.match(html, /\.price\{margin:0\}/, `www ${path} must keep .price`);
      assert.match(html, /\.contract\{border:1px solid red\}/, `www ${path} must keep .contract`);
      assert.match(html, /\.spark\{grid-area:spark/, `www ${path} must keep .spark`);
      assert.match(html, /id="token"/, `www ${path} must keep #token`);
      assert.match(html, /@media\(max-width:480px\)\{\.pill\{padding:0 17px\}\.contract\{padding:24px\}\}/, `www ${path} must keep unrelated media queries`);
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const liveHomeFooter = '<footer><div class="wrap"><p><a href="/studio">Studio</a> · <a href="/lobby">Lobby</a> · <a href="https://lobby.getdasha.com/forum">Forum</a> · <a href="https://lobby.getdasha.com/chess">Chess</a> · <a href="/dasha">Desk</a> · <a href="/bounties">Bounties</a> · <a href="/how-to-buy">How to buy</a> · <a href="https://x.com/dash_eats" target="_blank" rel="noopener noreferrer">@dash_eats ↗</a> · <a href="https://github.com/Uuriko/dasha-desk" target="_blank" rel="noopener noreferrer">Source ↗</a></p></div></footer>';
  const homeKeep = `<!doctype html><html class="w-mod-js"><title>$dasha — make the timeline stranger</title>
<style>
:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00}
.dasha{min-height:100vh;color:var(--paper)}
.pill{display:inline-flex;min-height:48px}
.price{margin:0}
.contract{border:1px solid red}
.spark{grid-area:spark;height:44px}
</style>
<section id="token"><h2>$dasha.</h2></section>
${liveHomeFooter}
</html>`;
  const linked = ensurePrivacyLink(homeKeep);
  assert.match(linked, /href="\/privacy"/);
  assert.match(linked, />Privacy</);
  assert.equal([...linked.matchAll(/href=["']\/privacy["']/g)].length, 1);
  assert.equal(ensurePrivacyLink(linked), linked, 'Privacy inject must be idempotent');
  for (const href of ['/studio', '/lobby', 'https://lobby.getdasha.com/forum', 'https://lobby.getdasha.com/chess', '/dasha', '/bounties', '/how-to-buy', 'https://github.com/Uuriko/dasha-desk']) {
    assert.ok(linked.includes(`href="${href}"`), `home footer must keep ${href}`);
  }
  assert.match(linked, /How to buy<\/a> · <a href="\/privacy">Privacy<\/a> · /);
  assert.match(linked, /:root\{/);
  assert.match(linked, /\.dasha\{/);
  assert.match(linked, /\.pill\{/);
  assert.match(linked, /\.price\{/);
  assert.match(linked, /\.contract\{/);
  assert.match(linked, /\.spark\{/);
  assert.match(linked, /id="token"/);
  assert.doesNotMatch(linked, /\.simp-/);
  const deskNav = '<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a class="dgcta" href="/studio">Make a meme →</a></div></nav>';
  const deskLinked = ensurePrivacyLink(deskNav);
  assert.match(deskLinked, /<a href="\/privacy">Privacy<\/a><\/div><\/nav>/);
  assert.match(deskLinked, /href="\/studio"/);
  assert.equal(ensurePrivacyLink(deskLinked), deskLinked);
  assert.equal(ensurePrivacyLink('<html><title>x</title></html>'), '<html><title>x</title></html>', 'no footer/nav needle must not invent chrome');
  const liveHowtoFooter = '<footer>\n    <p><a href="https://www.getdasha.com/">Home</a> · <a href="https://www.getdasha.com/studio">Studio</a> · <a href="https://lobby.getdasha.com/chess">Chess</a> · <a href="https://www.getdasha.com/dasha">Desk</a></p>\n  </footer>';
  const howtoLinked = ensurePrivacyLink(liveHowtoFooter);
  assert.match(howtoLinked, /Desk<\/a> · <a href="\/privacy">Privacy<\/a><\/p>/);
  assert.equal([...howtoLinked.matchAll(/href=["']\/privacy["']/g)].length, 1);
  assert.equal(ensurePrivacyLink(howtoLinked), howtoLinked, 'howto footer Privacy inject must be idempotent');
  assert.doesNotMatch(howtoLinked, /<nav/i, 'howto footer inject must not invent a nav');
  const liveChessNav = '<header class="top wrap"><a class="brand" href="https://www.getdasha.com/" aria-label="Dasha home">$<span>DASHA</span></a><nav class="top-links" aria-label="Chess"><a class="back" href="https://www.getdasha.com/">Home</a><a class="back buy" id="buy-dasha" href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&amp;buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump" target="_blank" rel="noopener noreferrer" aria-label="Buy $dasha on Jupiter using the exact mint">Buy $dasha ↗</a></nav></header>';
  const chessLinked = ensurePrivacyLink(liveChessNav);
  assert.match(chessLinked, /Buy \$dasha ↗<\/a><a href="\/privacy">Privacy<\/a><\/nav>/);
  assert.match(chessLinked, /id="buy-dasha"/);
  assert.doesNotMatch(chessLinked, /<footer/i, 'chess nav inject must not invent a footer');
  assert.equal(ensurePrivacyLink(chessLinked), chessLinked, 'chess nav Privacy inject must be idempotent');
  for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
    const howto = await workerModule.default.fetch(new Request(`https://${host}/how-to-buy`), {});
    assert.equal(howto.status, 200, `${host} /how-to-buy must stay 200`);
    assert.equal(howto.headers.get('x-dasha-edge'), 'howto');
    const howtoHtml = await howto.text();
    assert.equal([...howtoHtml.matchAll(/href=["']\/privacy["']/g)].length, 1, `${host} /how-to-buy must have one Privacy link`);
    assert.match(howtoHtml, />Privacy</);
    assert.match(howtoHtml, /<a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a>/);
    assert.doesNotMatch(howtoHtml, /href="\/">(?:\$dasha|Home)</);
    assert.match(howtoHtml, /<a href="\/studio">Studio<\/a> · <a href="\/lobby">Lobby<\/a> · <a href="\/simp">Simp<\/a> · <a href="\/graph">Graph<\/a> · <a href="\/verse">Verse<\/a> · <a href="\/bounties">Bounties<\/a> · <a href="\/how-to-buy">How to buy<\/a> · <a href="\/privacy">Privacy<\/a>/);
    assert.doesNotMatch(howtoHtml, /\/forum|USDC/);
    assert.equal((howtoHtml.match(/<footer\b/gi) || []).length, 1, `${host} /how-to-buy must keep one footer`);
    assert.equal((howtoHtml.match(/<nav\b/gi) || []).length, 1, `${host} /how-to-buy must keep its existing nav`);
    assert.match(howtoHtml, /data-n="01"[\s\S]*?wallet[\s\S]*?SOL/, `${host} /how-to-buy Get SOL must mention wallet and SOL`);
    assert.ok(howtoHtml.includes('53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), `${host} /how-to-buy must keep the published mint`);
    assert.doesNotMatch(howtoHtml, /payTo|referralAccount/i, `${host} /how-to-buy must not invent payTo or referralAccount`);
    assert.ok(howtoHtml.includes('https://phantom.app/ul/v1/swap?buy=solana%3A101%2Faddress%3A53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), `${host} /how-to-buy Phantom deeplink`);
    assert.ok(howtoHtml.includes('https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), `${host} /how-to-buy Jupiter URL`);
    assert.ok(howtoHtml.includes('https://pump.fun/coin/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), `${host} /how-to-buy pump.fun URL`);
    assert.ok(howtoHtml.includes('https://trade.phantom.com/token/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), `${host} /how-to-buy Phantom trade URL`);
    assert.ok(howtoHtml.includes('https://solscan.io/token/53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), `${host} /how-to-buy Solscan URL`);
    assert.doesNotMatch(howtoHtml, /trojan|axiom|moonshot|moonpay\.com/i, `${host} /how-to-buy featured a banned venue`);
    assert.match(howtoHtml, /fixedMint:CA/, `${host} /how-to-buy plugin must lock the published mint`);
    const howtoCsp = howto.headers.get('content-security-policy') || '';
    assert.match(howtoCsp, /frame-ancestors 'none'/);
    assert.doesNotMatch(howtoCsp, /script-src|default-src/, `${host} /how-to-buy CSP must still allow the Jupiter plugin`);
    const chess = await workerModule.default.fetch(new Request(`https://${host}/chess`), {});
    assert.equal(chess.status, 200, `${host} /chess must stay 200`);
    assert.equal(chess.headers.get('x-dasha-edge'), 'chess');
    const chessHtml = await chess.text();
    assert.equal([...chessHtml.matchAll(/href=["']\/privacy["']/g)].length, 2, `${host} /chess must keep header + footer Privacy`);
    assert.match(chessHtml, />Privacy</);
    assert.match(chessHtml, /<a class="brand" href="https:\/\/www\.getdasha\.com\/" aria-label="Dasha home">/);
    assert.match(chessHtml, /<a class="back" href="https:\/\/www\.getdasha\.com\/">Home<\/a>/);
    assert.match(chessHtml, /<a class="back" href="\/verse">Verse<\/a>/);
    assert.match(chessHtml, /<a class="back" href="\/privacy">Privacy<\/a>/);
    assert.doesNotMatch(chessHtml, /forum/i, `${host} /chess must not grow a Forum link`);
    assert.doesNotMatch(chessHtml, /class="(?:brand|back)" href="\/"/);
    assert.match(chessHtml, /id="buy-dasha"/);
    assert.match(chessHtml, /Buy \$dasha ↗/);
    assert.match(chessHtml, /<p class="privacy">Wallet address and balance are checked for access, then discarded\. Ratings belong to linked X identities\.<\/p>/);
    assert.match(chessHtml, /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/chess">/);
    assert.match(chessHtml, /<footer class="wrap"><p><a href="https:\/\/www\.getdasha\.com\/studio">Studio<\/a> · <a href="https:\/\/www\.getdasha\.com\/lobby">Lobby<\/a> · <a href="\/simp">Simp<\/a> · <a href="\/verse">Verse<\/a> · <a href="\/bounties">Bounties<\/a> · <a href="\/how-to-buy">How to buy<\/a> · <a href="\/privacy">Privacy<\/a><\/p><\/footer>/);
    assert.equal((chessHtml.match(/<nav\b/gi) || []).length, 1, `${host} /chess must keep its existing nav`);
  }
  const liveLobbyNav = '<nav class="nav shell" aria-label="Lobby navigation"><a class="brand" href="https://www.getdasha.com/">$<span>DASHA</span></a><a class="back" href="https://www.getdasha.com/">← Home</a></nav>';
  const lobbyLinked = ensurePrivacyLink(liveLobbyNav);
  assert.match(lobbyLinked, />Privacy</);
  assert.match(lobbyLinked, /href="\/privacy"/);
  assert.equal([...lobbyLinked.matchAll(/href=["']\/privacy["']/g)].length, 1);
  assert.match(lobbyLinked, /<a class="brand" href="https:\/\/www\.getdasha\.com\/">\$<span>DASHA<\/span><\/a>/);
  assert.match(lobbyLinked, /<a class="back" href="https:\/\/www\.getdasha\.com\/">← Home<\/a>/);
  assert.doesNotMatch(lobbyLinked, /<footer/i, 'lobby nav inject must not invent a footer');
  assert.equal(ensurePrivacyLink(lobbyLinked), lobbyLinked, 'lobby nav Privacy inject must be idempotent');
  for (const path of ['/lobby', '/lobby/']) {
    const lobby = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`), {});
    assert.equal(lobby.status, 200, `lobby ${path} must stay 200`);
    assert.match(lobby.headers.get('content-type') || '', /text\/html/);
    const lobbyHtml = await lobby.text();
    assert.equal([...lobbyHtml.matchAll(/href=["']\/privacy["']/g)].length, 1, `lobby ${path} must have one Privacy link`);
    assert.equal((lobbyHtml.match(/>Privacy</g) || []).length, 1, `lobby ${path} must show Privacy once`);
    assert.match(lobbyHtml, /aria-label="Lobby navigation"/);
    assert.match(lobbyHtml, /<a class="brand" href="https:\/\/www\.getdasha\.com\/">\$<span>DASHA<\/span><\/a>/);
    assert.match(lobbyHtml, /<a class="back" href="https:\/\/www\.getdasha\.com\/">← Home<\/a>/);
    assert.match(lobbyHtml, /<a class="back" href="\/verse">Verse<\/a>/);
    assert.doesNotMatch(lobbyHtml, /class="(?:brand|back)" href="\/"/);
    assert.doesNotMatch(lobbyHtml, /<footer\b/i, `lobby ${path} must not invent a footer`);
    assert.match(lobbyHtml, /--ink:#070608/);
    assert.match(lobbyHtml, /--paper:#f4eddb/);
    assert.match(lobbyHtml, /--acid:#dfff00/);
    assert.match(lobbyHtml, /--hot:#ff3b81/);
    assert.ok(lobbyHtml.includes(LOBBY_SRI), `lobby ${path} must pin lobby.js to the hash of client/lobby.js`);
    assert.ok(lobbyHtml.includes(`s.integrity='${LOBBY_SRI}'`), `lobby ${path} inject hash must equal client/lobby.js`);
    assert.match(lobbyHtml, /id="dasha-lobby"/, `lobby ${path} must keep chat`);
    assert.doesNotMatch(lobbyHtml, /class="dasha-quiz"/, `lobby ${path} must not mount the quiz`);
    assert.doesNotMatch(lobbyHtml, /id="dasha-simp-board"/, `lobby ${path} must not keep a quiz mount`);
    assert.doesNotMatch(lobbyHtml, /lobby\.getdasha\.com\/client\/simp-board\.js/, `lobby ${path} must not load the quiz client`);
    assert.doesNotMatch(lobbyHtml, /lobby\.getdasha\.com\/forum/, `lobby ${path} must not remount leftover Forum`);
    assert.doesNotMatch(lobbyHtml, /score=|"answer"\s*:/, `lobby ${path} must not leak answers`);
  }
  const lobbyHead = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/lobby', { method: 'HEAD' }), {});
  assert.equal(lobbyHead.status, 200, 'lobby HEAD /lobby must stay 200');
  assert.equal(await lobbyHead.text(), '', 'lobby HEAD /lobby must have an empty body');
  const staleLobbySri = 'sha384-fet8Bw+WiNBtGR2I4mj67Pk8Xv3WsVe4FvNEHBsjIoUvglQBomg5UPprS72dKEKb';
  const chatOnly = `<!doctype html><html><body><main><div id="dasha-lobby" data-lobby-url="wss://lobby.getdasha.com/ws"></div></main><script>(function(){var s=document.createElement('script');s.src='https://lobby.getdasha.com/client/lobby.js';s.integrity='${staleLobbySri}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s)})();</script></body></html>`;
  const leftoverQuiz = `${chatOnly}<style id="dasha-quiz-style">#dasha-quiz{margin-top:2rem}</style><div id="dasha-quiz" class="dasha-quiz"><div id="dasha-simp-board"><noscript>x</noscript></div></div><script>(function(){var s=document.createElement('script');s.src='https://lobby.getdasha.com/client/simp-board.js';s.integrity='${SIMP_BOARD_SRI}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s)})();</script>`;
  const lobbyQuiz = stripLobbySimpQuiz(leftoverQuiz);
  assert.match(lobbyQuiz, /id="dasha-lobby"/);
  assert.doesNotMatch(lobbyQuiz, /class="dasha-quiz"/);
  assert.doesNotMatch(lobbyQuiz, /id="dasha-simp-board"/);
  assert.doesNotMatch(lobbyQuiz, /dasha-quiz-style/);
  assert.doesNotMatch(lobbyQuiz, /lobby\.getdasha\.com\/client\/simp-board\.js/);
  assert.match(lobbyQuiz, /client\/lobby\.js/);
  assert.ok(lobbyQuiz.includes(`s.integrity='${LOBBY_SRI}'`), '/lobby inject hash must equal the hash of client/lobby.js');
  assert.equal(lobbyQuiz.includes(staleLobbySri), false, 'stale Webflow lobby.js SRI must be rewritten');
  assert.equal(rewriteLobbyScriptIntegrity(lobbyQuiz), lobbyQuiz, 'lobby SRI rewrite must be idempotent');
  const staleLobbyTag = `<script src="https://lobby.getdasha.com/client/lobby.js" integrity="${staleLobbySri}" crossorigin="anonymous"></script>`;
  const fixedLobbyTag = rewriteLobbyScriptIntegrity(staleLobbyTag);
  assert.equal(fixedLobbyTag.includes(staleLobbySri), false, 'stale lobby.js src integrity must be rewritten');
  assert.ok(fixedLobbyTag.includes(`integrity="${LOBBY_SRI}"`), 'lobby.js src integrity must equal the hash of client/lobby.js');
  assert.equal(
    rewriteLobbyScriptIntegrity('<script src="https://lobby.getdasha.com/client/lobby.js"></script>'),
    '<script src="https://lobby.getdasha.com/client/lobby.js"></script>',
    'lobby tag with no integrity must stay',
  );
  const deadForum = stripDeadLobbyForum('<header><a href="https://lobby.getdasha.com/forum">Forum</a></header><div id="dasha-forum"></div><script src="https://lobby.getdasha.com/client/forum.js"></script>');
  assert.doesNotMatch(deadForum, /forum/i);
  assert.doesNotMatch(lobbyQuiz, /forum/i);
  assert.doesNotMatch(lobbyQuiz, /score=|"answer"\s*:/);
  assert.equal(stripLobbySimpQuiz(lobbyQuiz), lobbyQuiz, 'second lobby quiz strip must be idempotent');
  assert.equal([...lobbyQuiz.matchAll(/id=["']dasha-simp-board["']/g)].length, 0);
  assert.equal([...lobbyQuiz.matchAll(/client\/simp-board\.js/g)].length, 0);
  const staleStudioSri = 'sha384-rwyBrN9MFswysun8gGdKfRSOByQyA3zYhRxZvaBlcw6abIyHL9k5UVb4cfFaiuQL';
  const jquerySri = 'sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=';
  const webflowCssSri = 'sha384-webflowCssMustStay';
  const webflowJsSri = 'sha384-webflowJsMustStay';
  const studioFixture = `<!doctype html><html class="w-mod-js"><title>Dasha Studio — make one, pass it on</title>
<script type="application/ld+json">{"@type":"Person","name":"John Potter","url":"https://x.com/potterlab"}</script>
<link href="https://cdn.prod.website-files.com/css/webflow.css" rel="stylesheet" integrity="${webflowCssSri}" crossorigin="anonymous">
<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a href="/privacy">Privacy</a></div></nav>
<p>Loading studio…</p>
<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js" integrity="${jquerySri}" crossorigin="anonymous"></script>
<script src="https://cdn.prod.website-files.com/js/webflow.js" integrity="${webflowJsSri}" crossorigin="anonymous"></script>
<script src="https://lobby.getdasha.com/client/studio.js" integrity="${staleStudioSri}" crossorigin="anonymous"></script>
</html>`;
  const studioFixed = rewriteStudioScriptIntegrity(studioFixture);
  assert.equal(studioFixed.includes(staleStudioSri), false, 'stale studio.js SRI must be gone');
  assert.match(studioFixed, /src="https:\/\/lobby\.getdasha\.com\/client\/studio\.js"/);
  assert.ok(studioFixed.includes(`integrity="${STUDIO_SRI}"`), 'studio.js integrity must match served bytes');
  assert.match(studioFixed, /src="https:\/\/lobby\.getdasha\.com\/client\/studio\.js"[^>]*crossorigin="anonymous"/);
  assert.equal(rewriteStudioScriptIntegrity(studioFixed), studioFixed, 'studio SRI rewrite must be idempotent');
  const studioNav = '<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a class="dgcta" href="/#token">Buy / verify →</a><a href="/privacy">Privacy</a></div></nav><p><a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump">Buy $dasha ↗</a></p>';
  const studioNavFixed = rewriteStudioBuyVerifyHref(studioNav);
  assert.match(studioNavFixed, /class="dgcta" href="\/how-to-buy">Buy \/ verify →</);
  assert.match(studioNavFixed, /jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/, 'Studio body Jupiter door must stay');
  assert.doesNotMatch(studioNavFixed, /dgcta[^>]*#token|#token[^>]*Buy \/ verify/);
  assert.equal(rewriteStudioBuyVerifyHref(studioNavFixed), studioNavFixed, 'studio Buy/verify rewrite must be idempotent');
  assert.equal(
    rewriteStudioBuyVerifyHref('<a class="dgcta" href="https://www.getdasha.com/#token">Buy / verify →</a>'),
    '<a class="dgcta" href="/how-to-buy">Buy / verify →</a>',
  );
  assert.ok(studioFixed.includes(`integrity="${jquerySri}"`), 'jquery SRI must stay');
  assert.ok(studioFixed.includes(`integrity="${webflowCssSri}"`), 'Webflow CSS SRI must stay');
  assert.ok(studioFixed.includes(`integrity="${webflowJsSri}"`), 'webflow.js SRI must stay');
  assert.equal(
    rewriteStudioScriptIntegrity('<script src="https://lobby.getdasha.com/client/studio.js"></script>'),
    '<script src="https://lobby.getdasha.com/client/studio.js"></script>',
    'studio tag with no integrity must stay',
  );
  const lobbyLeftover = `<!doctype html><html><title>$dasha lobby</title>
<style>
.lobby-lede{margin:0}
.lobby-status{margin:0;font-size:14px}
.simp-privacy{color:red}
</style>
<header class="lp-top">
<a class="lp-back" href="/">← $dasha</a>
<a class="lp-back" href="https://lobby.getdasha.com/forum" style="margin-left:auto">Forum</a>
</header>
<div id="dasha-forum"></div>
<script src="https://lobby.getdasha.com/client/forum.js"></script>
<script>(function(){var s=document.createElement('script');s.src='https://lobby.getdasha.com/client/lobby.js';s.integrity='${staleLobbySri}';s.crossOrigin='anonymous';s.defer=true;document.head.appendChild(s)})();</script>
</html>`;
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const path = new URL(typeof input === 'string' ? input : input.url).pathname;
      const body = path === '/' || path === '' ? homeKeep : lobbyLeftover;
      return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const home = await workerModule.default.fetch(new Request(`https://${host}/`), {});
      const html = await home.text();
      assert.equal(home.status, 200);
      assert.equal(home.headers.get('x-dasha-edge'), 'html-security');
      assert.match(html, /<a href="\/privacy">Privacy<\/a>/);
      assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 1);
      assert.match(html, /:root\{/);
      assert.match(html, /\.dasha\{/);
      assert.match(html, /\.pill\{/);
      assert.match(html, /\.price\{/);
      assert.match(html, /\.contract\{/);
      assert.match(html, /\.spark\{/);
      assert.match(html, /id="token"/);
      assert.doesNotMatch(html, /\.simp-/);
      const lobby = await workerModule.default.fetch(new Request(`https://${host}/lobby`), {});
      const lobbyHtml = await lobby.text();
      assert.equal(lobby.status, 200);
      assert.match(lobbyHtml, /\.lobby-lede\{/);
      assert.match(lobbyHtml, /\.lobby-status\{/);
      assert.doesNotMatch(lobbyHtml, /\.simp-privacy/);
      assert.doesNotMatch(lobbyHtml, /\.simp-/);
      assert.match(lobbyHtml, /<a class="lp-back" href="\/privacy">Privacy<\/a>/);
      assert.match(lobbyHtml, /href="\/"/);
      assert.doesNotMatch(lobbyHtml, /lobby\.getdasha\.com\/forum/, `${host} /lobby must drop the dead Forum hop`);
      assert.doesNotMatch(lobbyHtml, /id=["']dasha-forum["']/, `${host} /lobby must drop the empty forum mount`);
      assert.doesNotMatch(lobbyHtml, /client\/forum\.js/, `${host} /lobby must drop the 404 forum.js`);
      assert.ok(lobbyHtml.includes(`s.integrity='${LOBBY_SRI}'`), `${host} /lobby inject hash must equal client/lobby.js`);
      assert.equal(lobbyHtml.includes(staleLobbySri), false, `${host} /lobby must rewrite the stale lobby.js SRI`);
      assert.doesNotMatch(lobbyHtml, /class="dasha-quiz"/, `${host} /lobby must not inject the quiz`);
      assert.doesNotMatch(lobbyHtml, /id="dasha-simp-board"/, `${host} /lobby must not keep a quiz mount`);
      assert.doesNotMatch(lobbyHtml, /lobby\.getdasha\.com\/client\/simp-board\.js/, `${host} /lobby must not load the quiz client`);
      assert.doesNotMatch(lobbyHtml, /score=|"answer"\s*:/, `${host} /lobby must not leak answers`);
      assert.doesNotMatch(lobbyHtml, /\.dasha\{|\.pill\{|\.price\{|\.contract\{|\.spark\{|id="token"/);
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
  const servedLobbyJs = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/lobby.js'), {});
  assert.equal(servedLobbyJs.status, 200);
  const servedLobbyBytes = await servedLobbyJs.text();
  assert.equal(servedLobbyBytes, LOBBY_CLIENT_JS, 'worker /client/lobby.js must be the in-repo lobby client');
  assert.equal(
    `sha384-${createHash('sha384').update(servedLobbyBytes).digest('base64')}`,
    LOBBY_SRI,
    'served client/lobby.js hash must match the /lobby inject pin',
  );
}
{
  const staleStudioSri = 'sha384-rwyBrN9MFswysun8gGdKfRSOByQyA3zYhRxZvaBlcw6abIyHL9k5UVb4cfFaiuQL';
  const studioOrigin = `<!doctype html><html class="w-mod-js"><title>Dasha Studio — make one, pass it on</title>
<script type="application/ld+json">{"@type":"Person","name":"John Potter","url":"https://x.com/potterlab"}</script>
<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a href="/privacy">Privacy</a></div></nav>
<p>Loading studio…</p>
<script src="https://lobby.getdasha.com/client/studio.js" integrity="${staleStudioSri}" crossorigin="anonymous"></script>
</html>`;
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(studioOrigin, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const page = await workerModule.default.fetch(new Request(`https://${host}/studio`), {});
      assert.equal(page.status, 200, `${host}/studio must stay 200`);
      assert.equal(page.headers.get('x-dasha-edge'), 'html-strip-personal-brand');
      const html = await page.text();
      assert.match(html, /<title>[^<]*Dasha Studio/);
      assert.match(html, /href="\/privacy"/);
      assert.equal(html.includes(staleStudioSri), false, `${host}/studio must drop the leftover studio.js pin`);
      assert.match(html, /src="https:\/\/lobby\.getdasha\.com\/client\/studio\.js"/);
      assert.ok(html.includes(`integrity="${STUDIO_SRI}"`), `${host}/studio integrity must match served studio.js`);
      assert.match(html, /Loading studio…/);
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
  const studioJs = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/studio.js'), {});
  assert.equal(studioJs.status, 200);
  assert.match(studioJs.headers.get('content-type') || '', /javascript/);
  const studioBytes = await studioJs.text();
  assert.equal(`sha384-${createHash('sha384').update(studioBytes).digest('base64')}`, STUDIO_SRI);
  assert.equal(studioBytes, STUDIO_CLIENT_JS);
}
{
  const cherriesDataUri = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20role%3D%22img%22%20aria-label%3D%22Dasha%22%3E%3Ctitle%3EDasha%3C%2Ftitle%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%23070608%22%2F%3E%3Cg%20transform%3D%22translate(32%2033)%20scale(0.82)%20translate(-32%20-32)%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23dfff00%22%20stroke-width%3D%227%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22M18%2031%20C19%2019%2026%2010%2036%206%22%2F%3E%3Cpath%20d%3D%22M46%2037%20C48%2026%2042%2014%2036%206%22%2F%3E%3C%2Fg%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2245%22%20r%3D%2214%22%20fill%3D%22%23dfff00%22%2F%3E%3Ccircle%20cx%3D%2246%22%20cy%3D%2247%22%20r%3D%2212%22%20fill%3D%22%23dfff00%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E';
  const laterPng = 'https://cdn.prod.website-files.com/686c27624add10d53ab44923/dasha-icon-512.png';
  const liveShortcut = '<link href="https://cdn.prod.website-files.com/img/favicon.ico" rel="shortcut icon" type="image/x-icon"/>';
  const laterIcons = `<link rel="icon" href="${cherriesDataUri}"><link rel="icon" href="${laterPng}">`;
  const faviconFixture = `<!doctype html><html class="w-mod-js"><title>$dasha — make the timeline stranger</title>
${liveShortcut}
${laterIcons}
<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a href="/privacy">Privacy</a></div></nav>
<style>:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81}.dasha{min-height:100vh}</style>
</html>`;
  const firstShortcutHref = (html) => {
    const tags = String(html).match(/<link\b[^>]*>/gi) || [];
    for (const tag of tags) {
      if (!/\brel\s*=\s*(["'])[^"']*\bicon\b/i.test(tag)) continue;
      const href = tag.match(/\bhref\s*=\s*(["'])([^"']*)\1/i);
      return href ? href[2] : '';
    }
    return '';
  };
  const faviconFixed = rewriteStaleCdnFavicon(faviconFixture);
  assert.equal(firstShortcutHref(faviconFixed), '/favicon.ico', 'first shortcut icon must point at first-party cherries');
  assert.match(faviconFixed, /<link href="\/favicon\.ico" rel="shortcut icon" type="image\/x-icon"\/>/);
  assert.equal(faviconFixed.includes('cdn.prod.website-files.com/img/favicon.ico'), false, 'stale CDN favicon.ico must be gone');
  assert.ok(faviconFixed.includes(`href="${cherriesDataUri}"`), 'later cherries data-URI icon must stay');
  assert.ok(faviconFixed.includes(`href="${laterPng}"`), 'later dasha-icon-512.png must stay');
  assert.equal(rewriteStaleCdnFavicon(faviconFixed), faviconFixed, 'CDN favicon rewrite must be idempotent');
  const reversed = '<link rel="shortcut icon" type="image/x-icon" href="https://cdn.prod.website-files.com/img/favicon.ico"/>';
  assert.match(rewriteStaleCdnFavicon(reversed), /<link rel="shortcut icon" type="image\/x-icon" href="\/favicon\.ico"\/>/);
  const already = '<link href="/favicon.ico" rel="shortcut icon" type="image/x-icon"/>';
  assert.equal(rewriteStaleCdnFavicon(already), already, 'already-first-party shortcut must stay');
  const clean = `<!doctype html><html><title>x</title>${laterIcons}</html>`;
  assert.equal(rewriteStaleCdnFavicon(clean), clean, 'HTML without the stale CDN favicon must be a no-op');
  const staleStudioSri = 'sha384-rwyBrN9MFswysun8gGdKfRSOByQyA3zYhRxZvaBlcw6abIyHL9k5UVb4cfFaiuQL';
  const studioFaviconOrigin = `<!doctype html><html class="w-mod-js"><title>Dasha Studio — make one, pass it on</title>
${liveShortcut}
${laterIcons}
<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a href="/privacy">Privacy</a></div></nav>
<p>Loading studio…</p>
<script src="https://lobby.getdasha.com/client/studio.js" integrity="${staleStudioSri}" crossorigin="anonymous"></script>
</html>`;
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const path = new URL(typeof input === 'string' ? input : input.url).pathname;
      const body = path === '/studio' || path === '/studio/' ? studioFaviconOrigin : faviconFixture;
      return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const home = await workerModule.default.fetch(new Request(`https://${host}/`), {});
      assert.equal(home.status, 200, `${host}/ must stay 200`);
      const homeHtml = await home.text();
      assert.equal(firstShortcutHref(homeHtml), '/favicon.ico', `${host}/ first shortcut icon must be /favicon.ico`);
      assert.equal(homeHtml.includes('cdn.prod.website-files.com/img/favicon.ico'), false, `${host}/ must drop the stale CDN favicon`);
      assert.ok(homeHtml.includes(`href="${cherriesDataUri}"`), `${host}/ must keep the later cherries data-URI`);
      assert.ok(homeHtml.includes(`href="${laterPng}"`), `${host}/ must keep dasha-icon-512.png`);
      assert.match(homeHtml, /href="\/privacy"/);
      assert.doesNotMatch(homeHtml, /\.simp-/);
      const studio = await workerModule.default.fetch(new Request(`https://${host}/studio`), {});
      assert.equal(studio.status, 200, `${host}/studio must stay 200`);
      const studioHtml = await studio.text();
      assert.match(studioHtml, /<title>[^<]*Dasha Studio/);
      assert.equal(firstShortcutHref(studioHtml), '/favicon.ico', `${host}/studio first shortcut icon must be /favicon.ico`);
      assert.equal(studioHtml.includes('cdn.prod.website-files.com/img/favicon.ico'), false, `${host}/studio must drop the stale CDN favicon`);
      assert.ok(studioHtml.includes(`href="${cherriesDataUri}"`), `${host}/studio must keep the later cherries data-URI`);
      assert.ok(studioHtml.includes(`href="${laterPng}"`), `${host}/studio must keep dasha-icon-512.png`);
      assert.match(studioHtml, /href="\/privacy"/);
      assert.doesNotMatch(studioHtml, /\.simp-/);
      assert.equal(studioHtml.includes(staleStudioSri), false, `${host}/studio must drop the leftover studio.js pin`);
      assert.ok(studioHtml.includes(`integrity="${STUDIO_SRI}"`), `${host}/studio integrity must match served studio.js`);
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const bountiesFixture = `<!doctype html><html class="w-mod-js"><title>Bounties</title>
<div class="w-embed"><style>html, body { margin: 0; padding: 0; height: 100%; } .dasha-bounties-frame { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; }</style>
<iframe class="dasha-bounties-frame" title="dasha bounties" src="https://uuriko.github.io/dasha-desk/bounties/"></iframe>
</div></html>`;
  const cleaned = stripBountiesIframe(bountiesFixture);
  assert.doesNotMatch(cleaned, /<iframe/i);
  assert.doesNotMatch(cleaned, /uuriko\.github\.io\/dasha-desk\/bounties/);
  assert.doesNotMatch(cleaned, /dasha-bounties-frame/);
  assert.match(cleaned, /w-embed/);
  assert.match(cleaned, /html, body \{ margin: 0; padding: 0; height: 100%; \}/);
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(bountiesFixture, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      for (const method of ['GET', 'HEAD']) {
        for (const path of ['/bounties', '/bounties/']) {
          const page = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
          assert.equal(page.status, 200, `${host} ${path} ${method} must be worker-owned 200`);
          assert.equal(page.headers.get('x-dasha-edge'), 'bounties');
          const html = await page.text();
          if (method === 'HEAD') {
            assert.equal(html, '', `${host} ${path} HEAD must return an empty body`);
            continue;
          }
          assert.match(html, /<title>Bounties<\/title>/);
          assert.doesNotMatch(html, /<iframe/i, `${host} ${path} must not paint the Pages iframe`);
          assert.doesNotMatch(html, /w-mod-js|w-embed|dasha-bounties-frame/);
          assert.doesNotMatch(html, /uuriko\.github\.io\/dasha-desk\/bounties/);
          assert.match(html, /id="dasha-bounties"/, `${host} ${path} must be the no-JS board`);
          assert.match(html, /<h1>Bounties<\/h1>/, `${host} ${path} must name the product`);
          assert.match(html, /font-family:"Arial Black",Arial,Helvetica,sans-serif/, `${host} ${path} must use the display face`);
          assert.match(html, /font:16px\/1\.45 Arial,Helvetica,sans-serif/, `${host} ${path} must use Arial body`);
          assert.doesNotMatch(html, /system-ui/, `${host} ${path} must not use system-ui`);
          assert.match(html, /href="\/studio">Studio</, `${host} ${path} nav must include Studio`);
          assert.match(html, /href="\/simp">Simp</, `${host} ${path} nav must include Simp`);
          assert.match(html, /href="\/verse">Verse</, `${host} ${path} nav must include Verse`);
          assert.match(html, /href="\/bounties">Bounties</, `${host} ${path} nav must include Bounties`);
          assert.match(html, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</, `${host} ${path} nav must include @dash_eats`);
          assert.doesNotMatch(html.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0] || '', /53ux|Buy|jup\.ag|\/forum/i, `${host} ${path} must keep CA and Buy out of the top nav`);
          assert.match(html, /<footer\b[^>]*id="token"/, `${host} ${path} must keep CA + Buy in a token footer`);
          assert.match(html, /Post a project\. Other people run spare compute on it\./, `${host} ${path} must say what the board is`);
          assert.match(html, /<a class="go" href="#dasha-bounty-post">Post a project<\/a>/, `${host} ${path} must keep the post path`);
          assert.match(html, /I have excess compute/, `${host} ${path} must keep the spare-compute path`);
          assert.match(html, /mailto:potter@trydemigod\.com\?subject=I%20have%20excess%20compute/, `${host} ${path} must keep a no-JS compute mailto`);
          assert.match(html, /mailto:potter@trydemigod\.com/, `${host} ${path} must keep a no-JS post path`);
          assert.match(html, /This sends a request\. It is not a live listing\./, `${host} ${path} must not pretend a board write`);
          assert.match(html, /<label>Contact <input name="contact"><\/label> <a href="\/privacy">Privacy<\/a>/, `${host} ${path} must put Privacy next to contact`);
          assert.match(html, /No open bounties/, `${host} ${path} must stay honest when the feed source is not JSON`);
          assert.match(html, /Payouts are not configured yet\./, `${host} ${path} must keep the unpaid note on an empty Work list`);
          assert.equal(unpaidBountiesHtmlHasPayoutAmounts(html), false, `${host} ${path} must not print USDC or $ payout amounts while unconfigured`);
          assert.doesNotMatch(html, /Payout not live/);
          assert.doesNotMatch(html, /not implemented/i, `${host} ${path} must not headline leftover payout status`);
          assert.doesNotMatch(html, /We'll add it to the board/);
          assert.doesNotMatch(html, /\/forum/);
          assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 2, `${host} ${path} must keep contact + footer Privacy`);
          assert.match(html, /a\{color:var\(--acid\)\}/, `${host} ${path} must keep acid links`);
          const BOARD_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
          for (const hex of html.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
            assert.ok(BOARD_TOKENS.includes(hex.toLowerCase()), `${host} ${path} must stay tokens-only (saw ${hex})`);
          }
        }
      }
    }
    const home = await workerModule.default.fetch(new Request('https://www.getdasha.com/'), {});
    const homeHtml = await home.text();
    assert.match(homeHtml, /uuriko\.github\.io\/dasha-desk\/bounties/, 'home must not use the bounties iframe strip');
    assert.match(homeHtml, /dasha-bounties-frame/, 'home must not strip bounties-frame CSS');
    assert.doesNotMatch(homeHtml, /id="dasha-bounties"/, 'home must not inject the bounties board');
    globalThis.fetch = async (input) => {
      const u = String(input?.url || input);
      if (u.includes('bounties.json')) throw new Error('offline');
      return new Response(bountiesFixture, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    };
    const thrown = await workerModule.default.fetch(new Request('https://www.getdasha.com/bounties'), {});
    const thrownHtml = await thrown.text();
    assert.equal(thrown.headers.get('x-dasha-edge'), 'bounties');
    assert.match(thrownHtml, /id="dasha-bounties"/);
    assert.match(thrownHtml, /<h1>Bounties<\/h1>/);
    assert.match(thrownHtml, /I have excess compute/);
    assert.match(thrownHtml, /mailto:potter@trydemigod\.com/);
    assert.match(thrownHtml, /This sends a request\. It is not a live listing\./);
    assert.match(thrownHtml, /No open bounties/);
    assert.match(thrownHtml, /Payouts are not configured yet\./);
    assert.equal(unpaidBountiesHtmlHasPayoutAmounts(thrownHtml), false, 'offline /bounties must not print USDC or $ payout amounts');
    assert.doesNotMatch(thrownHtml, /Payout not live/);
    assert.doesNotMatch(thrownHtml, /not implemented/i);
    assert.doesNotMatch(thrownHtml, /<iframe/i);
    assert.doesNotMatch(thrownHtml, /w-mod-js|system-ui/);
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const liveUnpaid = {
    schema: 'dasha-bounties-feed/v1',
    listings: [
      { kind: 'item', name: 'docs: add CONTRIBUTING screenshot of GitHub web edit flow', itemUrl: 'https://github.com/Uuriko/dasha-desk/issues/8', amount: 25, currency: 'USDC', chain: 'solana', payTo: null, payoutStatus: 'not_implemented' },
      { kind: 'project', name: 'dasha desk', amount: 50, currency: 'USDC', chain: 'solana', payTo: null, payoutStatus: 'not_implemented' },
    ],
  };
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const u = String(input?.url || input);
      if (u.includes('dasha-desk') && u.includes('bounties.json')) {
        return new Response(JSON.stringify(liveUnpaid), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('nope', { status: 404 });
    };
    const page = await workerModule.default.fetch(new Request('https://www.getdasha.com/bounties'), {});
    const html = await page.text();
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('x-dasha-edge'), 'bounties');
    assert.match(html, /<title>Bounties<\/title>/);
    assert.match(html, /id="dasha-bounties"/);
    assert.match(html, /Payouts are not configured yet\./);
    assert.match(html, /This sends a request\. It is not a live listing\./);
    assert.match(html, /mailto:potter@trydemigod\.com/);
    assert.doesNotMatch(html, /href="https:\/\/github\.com\/Uuriko\/dasha-desk\/issues\/8"/);
    assert.match(html, /No open bounties/);
    assert.doesNotMatch(html, />dasha desk</);
    assert.equal(unpaidBountiesHtmlHasPayoutAmounts(html), false, 'served /bounties HTML must not contain USDC or $ payout amounts while payouts are unconfigured');
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const githubStart = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/github/start'), {});
  assert.equal(githubStart.status, 501);
  const githubStartBody = await githubStart.json();
  assert.equal(githubStartBody.configured, false);
  assert.equal(githubStartBody.error, 'not_configured');
  assert.notEqual(githubStartBody.error, 'not found');
  const githubStatus = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/github/status'), {});
  assert.equal(githubStatus.status, 200);
  const githubStatusBody = await githubStatus.json();
  assert.equal(githubStatusBody.configured, false);
  assert.equal(githubStatusBody.linked, false);
  assert.equal(githubStatusBody.github, null);
}
const rows = new Map();
const storage = {
  async get(key) { return rows.get(key); },
  async put(key, value) {
    if (typeof key === 'object') for (const [name, item] of Object.entries(key)) rows.set(name, item);
    else rows.set(key, value);
  },
  async delete(key) { return rows.delete(key); },
  async getAlarm() { return 1; },
  async setAlarm() {},
};
const state = {
  storage,
  setWebSocketAutoResponse() {},
  blockConcurrencyWhile(fn) { this.ready = fn(); },
};
rows.set('studioMetrics', { since: 1, opens: 3, firstEdits: 2, sources: { direct: 3 } });
const migrationDo = new DashaLobby(state, { ALLOWED_ORIGINS: 'https://www.getdasha.com' });
await state.ready;
const migratedCompletionSince = migrationDo.studioMetrics.completionSince;
assert.ok(Number.isFinite(migratedCompletionSince));
assert.equal(rows.get('studioMetrics').completionSince, migratedCompletionSince, 'completion migration boundary must persist immediately');
const reloadedMigrationDo = new DashaLobby(state, { ALLOWED_ORIGINS: 'https://www.getdasha.com' });
await state.ready;
assert.equal(reloadedMigrationDo.studioMetrics.completionSince, migratedCompletionSince, 'completion migration boundary must survive a cold start without an event');
rows.set('chessState', {
  games: { legacy: { state: { status: 'active' } } }, ratings: {}, current: {}, queue: [], tournaments: {}, metrics: {},
});
const chessMigrationDo = new DashaLobby(state, { ALLOWED_ORIGINS: 'https://www.getdasha.com' });
await state.ready;
const migratedClockSince = chessMigrationDo.chessGames.legacy.clock.activeSince;
assert.equal(rows.get('chessState').games.legacy.clock.activeSince, migratedClockSince, 'legacy active-game clock must persist immediately');
const reloadedChessMigrationDo = new DashaLobby(state, { ALLOWED_ORIGINS: 'https://www.getdasha.com' });
await state.ready;
assert.equal(reloadedChessMigrationDo.chessGames.legacy.clock.activeSince, migratedClockSince, 'legacy active-game clock must not reset on cold start');
rows.clear();
const studioDo = new DashaLobby(state, { ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com', LOBBY_MOD_SECRET: 'test-secret' });
await state.ready;
studioDo.simpQuizResults.sharetest = { correct: 9, total: 10, title: 'Dasha scholar', lane: 'Cinema obsessive' };
const shareResultHead = await studioDo.fetch(new Request('https://lobby.getdasha.com/simp/r/sharetest', { method: 'HEAD' }));
assert.equal(shareResultHead.status, 200);
assert.equal(await shareResultHead.text(), '');
const shareResult = await studioDo.fetch(new Request('https://lobby.getdasha.com/simp/r/sharetest'));
const shareResultHtml = await shareResult.text();
assert.match(shareResultHtml, /twitter:card[^>]+summary_large_image/);
assert.match(shareResultHtml, /twitter:image[^>]+\/simp\/card\/quiz\.png/);
assert.match(shareResultHtml, /og:image:width[^>]+1200[\s\S]*og:image:height[^>]+628/);
const studioEvent = (body) => studioDo.fetch(new Request('https://lobby.getdasha.com/studio/event', {
  method: 'POST', headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
assert.equal((await studioEvent({ event: 'open', source: 'quiz' })).status, 200);
assert.equal((await studioEvent({ event: 'first_edit', caption: 'must not persist' })).status, 200);
assert.equal((await studioEvent({ event: 'anything_else' })).status, 400);
const publicMetrics = await (await studioDo.fetch(new Request('https://lobby.getdasha.com/studio/metrics/public'))).json();
assert.equal(publicMetrics.ok, true);
assert.equal(publicMetrics.studio.opens, null);
assert.equal(publicMetrics.threshold, 5);
assert.doesNotMatch(JSON.stringify(publicMetrics), /sources|answers|wallet|xId|caption/);
assert.equal((await studioDo.fetch(new Request('https://lobby.getdasha.com/studio/metrics'))).status, 401);
const metricsResponse = await studioDo.fetch(new Request('https://lobby.getdasha.com/studio/metrics', { headers: { Authorization: 'Bearer test-secret' } }));
const metrics = await metricsResponse.json();
assert.equal(metrics.metrics.opens, 1);
assert.equal(metrics.metrics.firstEdits, 1);
assert.equal(metrics.metrics.sources.quiz, 1);
assert.equal(metrics.quizMetrics.starts, 0);
assert.equal(Number.isInteger(metrics.chessStorage.bytes), true);
assert.equal(metrics.chessStorage.migrateAtBytes, 1_000_000);
assert.equal(JSON.stringify(studioDo.chessSnapshot()).length > 0, true);
assert.equal(Number.isFinite(metrics.metrics.since), true);
assert.doesNotMatch(JSON.stringify(rows.get('studioMetrics')), /caption|must not persist|wallet|xId|draft/i);

// Decision-grade quiz metrics come from validated quiz transitions; the event endpoint is share-only.
const quizPost = (body, path = '/simp/quiz') => studioDo.fetch(new Request(`https://lobby.getdasha.com${path}`, {
  method: 'POST', headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));
assert.equal((await quizPost({ event: 'start' }, '/simp/quiz/event')).status, 400);
const gatedStart = await quizPost({ action: 'start' });
assert.equal(gatedStart.status, 401, 'unlinked start must be refused');
assert.equal((await gatedStart.json()).error, 'link X to take the quiz');
studioDo.env.LOBBY_SESSION_SECRET = 'holder-test-secret';
studioDo.simpProfiles.x1 = { xId: 'x1', handle: 'ava', enrolledAt: Date.now(), awards: [] };
const sessionToken = await createSessionToken(studioDo.env, { xId: 'x1', handle: 'ava' });
const linkedQuizPost = (body) => studioDo.fetch(new Request('https://lobby.getdasha.com/simp/quiz', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', Cookie: `__Host-dasha_x=${sessionToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));
let quizResponse = await linkedQuizPost({ action: 'start' });
let quizData = await quizResponse.json();
assert.equal(quizResponse.status, 200);
assert.equal(quizData.attemptId, undefined);
assert.equal('total' in (quizData.progress || {}), false);
assert.match(quizData.question.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
assert.equal(quizData.question.media.kind, 'image');
let prevMedia = quizData.question.media.src;
for (let i = 0; i < 17; i++) {
  quizResponse = await linkedQuizPost({ action: 'answer', answer: 0 });
  quizData = await quizResponse.json();
  if (!quizData.done) {
    assert.match(quizData.question.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
    assert.notEqual(quizData.question.media.src, prevMedia);
    prevMedia = quizData.question.media.src;
  }
}
assert.equal(quizData.done, true);
assert.equal(quizData.linkRequired, undefined);
assert.match(quizData.resultUrl, /^https:\/\/www\.getdasha\.com\/simp\/r\/[A-Za-z0-9_-]+$/);
assert.equal(quizData.quiz.resultUrl, quizData.resultUrl);
assert.equal(studioDo.simpQuizMetrics.starts, 1);
assert.equal(studioDo.simpQuizMetrics.completions, 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.reached).reduce((a, b) => a + b, 0), 17);
assert.equal(Object.values(studioDo.simpQuizMetrics.answers).reduce((a, b) => a + b, 0), 17);
assert.equal(Object.values(studioDo.simpQuizMetrics.lanes).reduce((a, b) => a + b, 0), 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.tiers).reduce((a, b) => a + b, 0), 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.elapsed).reduce((a, b) => a + b, 0), 1);
assert.equal((await quizPost({ event: 'share' }, '/simp/quiz/event')).status, 200);
assert.equal(studioDo.simpQuizMetrics.shares, 1);
const resetMetrics = (auth) => studioDo.fetch(new Request('https://lobby.getdasha.com/studio/metrics', {
  method: 'POST', headers: { ...(auth ? { Authorization: 'Bearer test-secret' } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }),
}));
assert.equal((await resetMetrics(false)).status, 401);
const resetResponse = await resetMetrics(true);
const resetData = await resetResponse.json();
assert.equal(resetResponse.status, 200);
assert.equal(resetData.reset, true);
assert.equal(studioDo.studioMetrics.opens, 0);
assert.equal(studioDo.simpQuizMetrics.starts, 0);
assert.equal(studioDo.studioMetrics.since, studioDo.simpQuizMetrics.since);
assert.deepEqual(rows.get('studioMetrics'), studioDo.studioMetrics);
assert.deepEqual(rows.get('simpQuizMetrics'), studioDo.simpQuizMetrics);

// Holder challenges are issued only after a wallet is known and are bound to that address.
const holderRequestFrom = (origin, path, body) => studioDo.fetch(new Request(`https://lobby.getdasha.com${path}`, {
  method: 'POST',
  headers: { Origin: origin, Cookie: `__Host-dasha_x=${sessionToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));
const holderRequest = (path, body) => holderRequestFrom('https://www.getdasha.com', path, body);
const holderRequestWithoutOrigin = (path, body) => studioDo.fetch(new Request(`https://lobby.getdasha.com${path}`, {
  method: 'POST',
  headers: { Cookie: `__Host-dasha_x=${sessionToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));
assert.equal((await holderRequestWithoutOrigin('/simp/wallet/challenge', { publicKey: '11111111111111111111111111111111' })).status, 403);
assert.equal((await holderRequestWithoutOrigin('/simp/wallet/verify', {})).status, 403);
const finalizedQuiz = await holderRequest('/simp/quiz', { action: 'finalize', attemptId: 'missing' });
assert.equal(finalizedQuiz.status, 400);
assert.equal((await holderRequest('/simp/wallet/challenge', {})).status, 400);
assert.equal((await holderRequest('/simp/wallet/challenge', { publicKey: '1'.repeat(44) })).status, 400, 'Base58-looking non-32-byte address must be rejected');
const proofAddress = '11111111111111111111111111111111';
const holderChallengeResponse = await holderRequest('/simp/wallet/challenge', { publicKey: proofAddress });
assert.equal(holderChallengeResponse.status, 200);
const holderChallenge = await holderChallengeResponse.json();
assert.match(holderChallenge.message, new RegExp(proofAddress));
assert.match(holderChallenge.message, /^www\.getdasha\.com wants you to sign in/, 'holder proof must bind the exact requesting product host');
assert.match(holderChallenge.message, /\nNonce: [A-Za-z0-9]{8,}\n/, 'holder nonce must satisfy the SIWS alphanumeric grammar');
const lobbyHolderChallenge = await (await holderRequestFrom('https://lobby.getdasha.com', '/simp/wallet/challenge', { publicKey: proofAddress })).json();
assert.match(lobbyHolderChallenge.message, /^lobby\.getdasha\.com wants you to sign in/, 'Chess holder proof must identify its actual requesting host');
assert.match(lobbyHolderChallenge.message, /\nURI: https:\/\/lobby\.getdasha\.com\/\n/, 'Chess holder proof URI must match its requesting origin');
assert.equal(rows.has('simpHolder:x1'), true, 'holder challenge nonce must survive Worker restarts');
assert.equal((await holderRequest('/simp/wallet/verify', { challenge: holderChallenge.challenge, publicKey: mint, signature: '1'.repeat(64) })).status, 401, 'challenge must reject a different wallet before signature/RPC work');
assert.equal(rows.has('simpHolder:x1'), true, 'invalid wallet must not consume the holder challenge');

// A valid challenge survives transient RPC failure, then is consumed by a definitive check.
const holderKeys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const holderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', holderKeys.publicKey));
const toBase58 = (bytes) => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = BigInt(`0x${Buffer.from(bytes).toString('hex')}`), out = '';
  while (value) { out = alphabet[Number(value % 58n)] + out; value /= 58n; }
  for (const byte of bytes) { if (byte) break; out = `1${out}`; }
  return out || '1';
};
const signedAddress = toBase58(holderPublic);
const expiredMessage = 'expired holder proof';
const expiredChallenge = await signPayload(studioDo.env.LOBBY_SESSION_SECRET, {
  kind: 'simp_holder', xId: 'x1', publicKey: signedAddress, nonce: 'expired1', message: expiredMessage, exp: Date.now() - 1,
});
const expiredSignature = new Uint8Array(await crypto.subtle.sign('Ed25519', holderKeys.privateKey, new TextEncoder().encode(expiredMessage)));
assert.equal((await holderRequest('/simp/wallet/verify', { challenge: expiredChallenge, publicKey: signedAddress, signature: toBase58(expiredSignature) })).status, 401, 'expired holder challenge must fail at the endpoint');
const signedChallenge = await (await holderRequest('/simp/wallet/challenge', { publicKey: signedAddress })).json();
const signedBytes = new Uint8Array(await crypto.subtle.sign('Ed25519', holderKeys.privateKey, new TextEncoder().encode(signedChallenge.message)));
const verifyBody = { challenge: signedChallenge.challenge, publicKey: signedAddress, signature: toBase58(signedBytes) };
let rpcCalls = 0;
studioDo.env.SOLANA_RPC_URLS = 'https://primary.example,https://backup.example';
globalThis.fetch = async () => { rpcCalls += 1; return Response.json({ error: { message: 'temporary failure' } }, { status: 503 }); };
try {
  assert.equal((await holderRequestFrom('https://lobby.getdasha.com', '/simp/wallet/verify', verifyBody)).status, 401, 'holder challenge must not cross first-party origins');
  studioDo.simpRates.delete('holder-verify:x1');
  assert.equal((await holderRequest('/simp/wallet/verify', verifyBody)).status, 503, 'total RPC failure must remain retryable');
  assert.equal(rows.has('simpHolder:x1'), true, 'transient RPC failure must not force another wallet signature');
  globalThis.fetch = async () => { rpcCalls += 1; return Response.json({ result: { value: [{ account: { data: { parsed: { info: { owner: signedAddress, mint, tokenAmount: { amount: '1' } } } } } }] } }); };
  assert.equal((await holderRequest('/simp/wallet/verify', verifyBody)).status, 200);
  assert.equal((await holderRequest('/simp/wallet/verify', verifyBody)).status, 409);
  assert.equal(rpcCalls, 3, 'holder proof must try both configured RPCs before a bounded same-signature retry');
  assert.equal(rows.has('simpHolder:x1'), false, 'valid holder challenge must be consumed');
} finally {
  globalThis.fetch = nativeFetch;
}
for (let i = 0; i < 3; i++) assert.equal((await holderRequest('/simp/wallet/challenge', { publicKey: proofAddress })).status, 200);
const holderRateLimited = await holderRequest('/simp/wallet/challenge', { publicKey: proofAddress });
assert.equal(holderRateLimited.status, 429);
assert.equal(Number.isFinite((await holderRateLimited.json()).waitMs), true, 'holder rate limit must tell the client when to retry');

const check = spawnSync(process.execPath, ['dasha-lobby-embed-build.mjs', '--check'], {
  cwd: new URL('.', import.meta.url).pathname,
  encoding: 'utf8',
});
assert.equal(check.status, 0, check.stderr || check.stdout || 'embed check failed');

const simpCheck = spawnSync(process.execPath, ['dasha-simp-board-embed-build.mjs', '--check'], {
  cwd: new URL('.', import.meta.url).pathname,
  encoding: 'utf8',
});
assert.equal(simpCheck.status, 0, simpCheck.stderr || simpCheck.stdout || 'simp embed check failed');

console.log('dasha-lobby: PASS');
