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
assert(page.includes('wss://lobby.getdasha.com/ws'), 'dedicated lobby must use permanent WS host');
assert(!landing.includes('spiny-helmet'), 'temporary workers host must not remain');
assert(!landing.includes('On-site, not Discord'), 'removed Lobby framing returned');
assert(!/(?:can|might|could|will) go to zero|go(?:es|ing)? to zero|not financial advice|\bNFA\b|association is not endorsement|no price promises|old coin and Im not the dev|high risk|rugcheck|never trust|lose (?:your )?money|lose it all|worthless|dead coin/i.test(landing), 'negative coin disclaimer returned');
assert(!landing.includes('Public lobby.</h2>'), 'removed Lobby title returned');
assert(page.includes('lobby.getdasha.com/client/lobby.js'), 'dedicated page must load lobby client');
assert.match(page, /<a class="brand" href="https:\/\/www\.getdasha\.com\/">\$<span>DASHA<\/span><\/a>/, 'lobby brand must leave the JSON health root');
assert.match(page, /<a class="back" href="https:\/\/www\.getdasha\.com\/">← Home<\/a>/, 'lobby Home must leave the JSON health root');
assert.doesNotMatch(page, /class="(?:brand|back)" href="\/"/, 'lobby navigation must not mislabel the lobby service root as Home');
assert(/s\.integrity='sha384-[A-Za-z0-9+/=]+'/.test(page) && page.includes("s.crossOrigin='anonymous'"), 'dedicated lobby client must be SRI-pinned after Webflow sanitization');
assert(landing.includes('href="/lobby"'), 'landing discovery link to lobby missing');
assert(!/lobby-copy-(?:mint|line)|Copy mint|Copy line/.test(client), 'Lobby copy controls returned');
assert(!/discord\.gg|discord\.com\/invite|t\.me\//i.test(landing), 'landing must not promote Discord/Telegram invite links');
assert(!/official chat|verified community|safe mint/i.test(landing), 'lobby must not claim official/safe status');

assert(client.includes(mint), 'client pins mint');
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
assert(worker.includes('FORUM_HTML') && worker.includes("'X-Dasha-Edge': 'forum'"), 'lobby /forum serves branded HTML 404');
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
  client.includes('verify mint') && client.includes('getdasha.com/#token'),
  'verify mint must deep-link Home CA when not already on Home',
);
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
assert(worker.includes('rewriteStaleCdnFavicon(html)'), 'proxied product HTML must rewrite leftover CDN favicon.ico');
assert(worker.includes('escapeHtml(err)') && worker.includes('escapeHtml(String(e.message || e)'), 'OAuth error HTML must escape upstream text');

// Simp Board reuses Lobby DO + session; never auto-enrolls on OAuth
assert(worker.includes("'/simp/board'") || worker.includes('"/simp/board"') || worker.includes('/simp/board'), 'worker exposes /simp/board');
assert(worker.includes('/simp/me'), 'worker exposes /simp/me');
assert(worker.includes('/simp/join'), 'worker exposes /simp/join');
assert(worker.includes('/simp/leave'), 'worker exposes /simp/leave');
assert(worker.includes("'X-Dasha-Edge': 'simp'") && worker.includes('simpPageHtml'), 'www /simp is worker-owned first HTML');
assert(worker.includes('SIMP_QUIZ_JS') && worker.includes('https://lobby.getdasha.com/simp/quiz'), 'www /simp ships a worker-owned quiz script');
assert(worker.includes('simpSharePageHtml') && worker.includes('og:image:alt'), 'www /simp/r is type-first share HTML');
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
const { DashaLobby, ensureHtmlLang, ensurePrivacyLink, injectBountiesBoard, injectHomeSimpCta, normalizeBountiesFeed, personalizeChessPage, publicFunnelSummary, rewriteStaleCdnFavicon, rewriteStudioScriptIntegrity, sanitizePublicJsonLd, simpPageHtml, simpSharePageHtml, solanaRpcEndpoints, stripBountiesIframe, stripHomeSimpBoard } = workerModule;
const { STUDIO_CLIENT_JS } = await import('./dasha-lobby-static-gen.mjs');
const STUDIO_SRI = `sha384-${createHash('sha384').update(STUDIO_CLIENT_JS).digest('base64')}`;
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
assert.match(dynamicChessHtml, /og:url" content="https:\/\/lobby\.getdasha\.com\/chess\?game=game123"/);
assert.match(dynamicChessHtml, /og:image:type" content="image\/png"/);
assert.match(dynamicChessHtml, /og:image:width" content="1200"/);
assert.match(dynamicChessHtml, /og:image:height" content="630"/);
assert.match(dynamicChessHtml, /twitter:image:alt" content="Dasha Chess"/);
assert.match(dynamicChessHtml, /<meta name="robots" content="index,follow">/);
assert.equal(dynamicChess.headers.get('cache-control'), 'public, max-age=120');
const positionedChess = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?game=game123&ply=1'), dynamicChessEnv);
const positionedChessHtml = await positionedChess.text();
assert.match(positionedChessHtml, /<link rel="canonical" href="https:\/\/lobby\.getdasha\.com\/chess\?game=game123">/, 'position links must consolidate on the durable replay');
assert.match(positionedChessHtml, /og:url" content="https:\/\/lobby\.getdasha\.com\/chess\?game=game123"/);
assert.doesNotMatch(positionedChessHtml, /[?&]ply=1/, 'temporary replay position must not fragment metadata');
const dynamicTournament = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?tournament=cup123'), dynamicChessEnv);
const dynamicTournamentHtml = await dynamicTournament.text();
assert.match(dynamicTournamentHtml, /<title>First Dasha Cup — Dasha Chess<\/title>/);
assert.match(dynamicTournamentHtml, /Open tournament · 2\/16 players\./);
assert.match(dynamicTournamentHtml, /og:url" content="https:\/\/lobby\.getdasha\.com\/chess\?tournament=cup123"/);
assert.match(dynamicTournamentHtml, /<meta name="robots" content="index,follow">/);
assert.doesNotMatch(dynamicTournamentHtml, /game123|@white/, 'tournament card must not reuse replay metadata');
const openChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?challenge=open123'), dynamicChessEnv);
const openChallengeHtml = await openChallenge.text();
assert.match(openChallengeHtml, /<title>@dasha_player challenges you — Dasha Chess<\/title>/);
assert.match(openChallengeHtml, /Take Anna\. Dasha has white\./);
assert.match(openChallengeHtml, /og:url" content="https:\/\/lobby\.getdasha\.com\/chess\?challenge=open123"/);
assert.match(openChallengeHtml, /<meta name="robots" content="noindex,follow">/);
const mixedChallenge = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?tournament=cup123&challenge=open123'), dynamicChessEnv);
const mixedChallengeHtml = await mixedChallenge.text();
assert.match(mixedChallengeHtml, /<title>@dasha_player challenges you — Dasha Chess<\/title>/, 'server metadata must choose the same mixed-link object as the browser');
assert.match(mixedChallengeHtml, /og:url" content="https:\/\/lobby\.getdasha\.com\/chess\?challenge=open123"/);
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
const missingChess = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess?game=missing1'), dynamicChessEnv);
const missingChessHtml = await missingChess.text();
assert.match(missingChessHtml, /<title>Dasha Chess — holders play<\/title>/);
assert.match(missingChessHtml, /og:url" content="https:\/\/lobby\.getdasha\.com\/chess"/);
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
      assert.equal(forum.status, 308, `${host}${path} ${method} must permanently send product-host Forum to lobby`);
      assert.equal(forum.headers.get('location'), 'https://lobby.getdasha.com/forum');
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
    assert.equal(forum.status, 404, `lobby ${path} ${method} must be a branded HTML 404`);
    assert.match(forum.headers.get('content-type') || '', /text\/html/);
    assert.equal(forum.headers.get('x-dasha-edge'), 'forum');
    const body = await forum.text();
    if (method === 'HEAD') {
      assert.equal(body, '', `lobby ${path} HEAD must return an empty body`);
    } else {
      assert.match(body, /<title>Dasha forum<\/title>/);
      assert.match(body, /Dasha|\$dasha/);
      assert.match(body, /no forum yet/i);
      assert.notEqual(body, '{"error":"not found"}');
    }
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
for (const path of ['/no-such-page', '/no-such-page-242', '/no-such-page-251', '/no-such-page-253', '/no-such-page/', '/studio/', '/studio']) {
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
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/">Back to Dasha<\/a>/);
      assert.match(body, /Dasha|\$dasha/);
      assert.notEqual(body, '{"error":"not found"}');
      assert.doesNotMatch(body, /no forum yet/i);
      assert.doesNotMatch(body, /<title>Dasha forum<\/title>/);
    }
  }
}
{
  const SIMP_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const assertSimpFirstHtml = (html, label) => {
    assert.match(html, /<h1>Simp<\/h1>/, `${label} must use h1 Simp`);
    assert.match(html, /PerryALPHA founding #1 is editorial and non-measured/);
    assert.match(html, /editorial #1 · not measured/);
    assert.match(html, /<noscript>Answer in the browser — questions are not in this HTML\.<\/noscript>/);
    assert.match(html, /class="dasha-quiz"/);
    assert.match(html, /data-mode="quick"/);
    assert.match(html, /data-mode="deep"/);
    assert.match(html, />Quick<\/button>/);
    assert.match(html, /lobby\.getdasha\.com\/simp\/quiz/);
    assert.match(html, /action:'start'/);
    assert.match(html, /action:'answer'/);
    assert.match(html, /class="dasha-board"/);
    assert.doesNotMatch(html, /\.simp-/);
    assert.doesNotMatch(html, /class="simp-/);
    assert.doesNotMatch(html, /score=/);
    assert.doesNotMatch(html, /"answer"\s*:/);
    assert.doesNotMatch(html, /oauth\/x\/start|Connect X/);
    assert.doesNotMatch(html, /Pick your strongest lane|Her feature directorial debut|Sailor Socialism/);
    for (const token of SIMP_TOKENS) assert.match(html, new RegExp(token));
    for (const hex of html.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
      assert.ok(SIMP_TOKENS.includes(hex.toLowerCase()), `${label} must stay tokens-only (saw ${hex})`);
    }
  };
  const emptyHtml = simpPageHtml(null);
  assertSimpFirstHtml(emptyHtml, 'empty board helper');
  assert.match(emptyHtml, /No measured simps yet\./);
  assert.doesNotMatch(emptyHtml, /<ol\b/);
  const leakHtml = simpPageHtml({
    schema: 'dasha-simp-board/v1',
    editorial: [{ rank: 1, display: '@PerryALPHA', handle: 'perryalpha', measured: false }],
    measured: [{
      rank: 2,
      handle: 'a',
      display: '@a',
      href: 'https://x.com/a',
      xId: 'leak-xid-must-not-render',
      wallet: 'leak-wallet-must-not-render',
      balance: 'leak-balance-must-not-render',
    }],
    xId: 'leak-board-xid',
    wallet: 'leak-board-wallet',
    balance: 'leak-board-balance',
  });
  assertSimpFirstHtml(leakHtml, 'measured helper');
  assert.match(leakHtml, /<ol class="dasha-board">/);
  assert.match(leakHtml, /href="https:\/\/x\.com\/a"/);
  assert.doesNotMatch(leakHtml, /leak-/);
  assert.doesNotMatch(leakHtml, /xId|wallet|balance/);
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
          assert.match(html, /No measured simps yet\./);
        }
      }
      for (const path of ['/quiz', '/quiz/']) {
        const quiz = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
        assert.equal(quiz.status, 308, `${host}${path} ${method} must permanently send quiz to /simp`);
        assert.equal(quiz.headers.get('location'), 'https://www.getdasha.com/simp');
      }
    }
  }
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/simp', '/simp/']) {
      const page = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
      assert.equal(page.status, 308, `lobby ${path} ${method} must permanently send exact /simp to www`);
      assert.equal(page.headers.get('location'), 'https://www.getdasha.com/simp');
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
  assertSimpFirstHtml(fetchedHtml, 'www /simp via GET /simp/board');
  assert.match(fetchedHtml, /No measured simps yet\./);
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
  const shareEnv = {
    LOBBY: {
      idFromName: () => 'room',
      get: () => ({
        fetch: async (req) => {
          const path = new URL(req.url).pathname;
          if (path === '/simp/result/sharetest') {
            return new Response(JSON.stringify({ ok: true, result: fixture }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: 'result not found' }), { status: 404 });
        },
      }),
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
      const missing = await workerModule.default.fetch(new Request(`https://${host}/simp/r/missingid`, { method }), shareEnv);
      assert.equal(missing.status, 404, `${host} /simp/r/missingid ${method} must be honest 404`);
      assert.equal(missing.headers.get('x-dasha-edge'), 'html-404');
      const missingHtml = await missing.text();
      if (method === 'HEAD') {
        assert.equal(missingHtml, '');
      } else {
        assert.match(missingHtml, /<h1>Result not found<\/h1>/);
        assert.doesNotMatch(missingHtml, /9\/10|Dasha scholar|0\/0/);
        assert.doesNotMatch(missingHtml, /score=/);
      }
    }
  }
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
        ['/bounties', 'Bounties', 'html-security'],
        ['/dasha', 'Dasha', 'html-security'],
      ]) {
        const page = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(page.status, 200, `${host}${path} must stay 200`);
        assert.equal(page.headers.get('x-dasha-edge'), edge);
        assert.ok((await page.text()).includes(`<title>${title}</title>`), `${host}${path} must keep its origin title`);
      }
      const privacy = await workerModule.default.fetch(new Request(`https://${host}/privacy`), {});
      assert.equal(privacy.status, 200, `${host}/privacy must stay worker-served 200`);
      assert.equal(privacy.headers.get('x-dasha-edge'), 'privacy');
      assert.match(await privacy.text(), /<title>Dasha privacy<\/title>/);
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
  assert.match(listedSection, /<h1>Bounties<\/h1>/);
  assert.match(listedSection, /Post a project\. Other people run spare compute on it\./);
  assert.match(listedSection, /<a class="go" href="#dasha-bounty-post">Post a project<\/a>/);
  assert.match(listedSection, /<a class="go" href="mailto:potter@trydemigod\.com\?subject=I%20have%20excess%20compute">I have excess compute<\/a>/);
  assert.match(listedSection, /<form\b[^>]*action="mailto:potter@trydemigod\.com"[^>]*method="get"/i);
  assert.match(listedSection, /name="name"/);
  assert.match(listedSection, /What to run/);
  assert.match(listedSection, /name="contact"/);
  assert.match(listedSection, /We'll add it to the board\./);
  assert.doesNotMatch(listedSection, /writes?\s+\/bounties\.json|saved to \/bounties/i);
  assert.doesNotMatch(listedSection, /uuriko\.github\.io\/dasha-desk\/bounties|issues\/new\?template=bounty-project/i);
  assert.match(listedSection, /docs/);
  assert.match(listedSection, /desk/);
  assert.match(listedSection, /href="https:\/\/github\.com\/Uuriko\/dasha-desk\/issues\/8"/);
  assert.match(listedSection, /25 USDC/);
  assert.match(listedSection, /50 USDC/);
  assert.doesNotMatch(listedSection, /not implemented/i);
  assert.match(listedSection, /Payout not live/);
  const firstListing = listedSection.match(/<li\b[\s\S]*?<\/li>/i)?.[0] || '';
  assert.match(firstListing, /docs/);
  assert.doesNotMatch(firstListing, /not implemented/i);
  assert.doesNotMatch(listedSection, /<script\b/i);
  assert.doesNotMatch(listedSection, /\bClaim\b|\bPay\b/);
  assert.doesNotMatch(listed, /<iframe/i);
  assert.doesNotMatch(listed, /#c8b6ff|rgba\(\s*124\s*,\s*77\s*,\s*255|t\.me\//i);
  assert.doesNotMatch(listed, /payTo:""/);
  const BOARD_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  for (const hex of listedSection.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
    assert.ok(BOARD_TOKENS.includes(hex.toLowerCase()), `bounties board must stay tokens-only (saw ${hex})`);
  }
  const emptyListed = injectBountiesBoard(shell, { listings: [] });
  const emptyFallback = injectBountiesBoard(shell, normalizeBountiesFeed(null));
  for (const empty of [emptyListed, emptyFallback]) {
    const emptySection = empty.match(/<section\b[^>]*id=["']dasha-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
    assert.match(emptySection, /<h1>Bounties<\/h1>/);
    assert.match(emptySection, /Post a project\. Other people run spare compute on it\./);
    assert.match(emptySection, /<a class="go" href="#dasha-bounty-post">Post a project<\/a>/);
    assert.match(emptySection, /I have excess compute/);
    assert.match(emptySection, /mailto:potter@trydemigod\.com/);
    assert.match(emptySection, /No open bounties/);
    assert.doesNotMatch(empty, /<li\b/);
    assert.doesNotMatch(empty, /25 USDC|50 USDC/);
    assert.doesNotMatch(empty, /payTo:""/);
  }
  const nullPay = injectBountiesBoard(shell, { listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: null }] });
  assert.match(nullPay, /Payout not live/);
  assert.doesNotMatch(nullPay, /not implemented/i);
  assert.doesNotMatch(nullPay, /payTo:""/);
  const blankPay = injectBountiesBoard(shell, { listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: '' }, { kind: 'project', name: 'desk', amount: 50, currency: 'USDC', payTo: '   ' }] });
  assert.match(blankPay, /Payout not live/);
  assert.doesNotMatch(blankPay, /not implemented/i);
  assert.doesNotMatch(blankPay, /payTo:""/);
  const dest = '11111111111111111111111111111111';
  const fundedHtml = injectBountiesBoard(shell, { listings: [{ kind: 'item', name: 'docs', amount: 25, currency: 'USDC', payTo: dest }] });
  const fundedSection = fundedHtml.match(/<section\b[^>]*id=["']dasha-bounties["'][\s\S]*?<\/section>/i)?.[0] || '';
  assert.doesNotMatch(fundedSection, /Payout not live/);
  assert.doesNotMatch(fundedSection, /not implemented/i);
  assert.doesNotMatch(fundedSection, new RegExp(dest));
  assert.doesNotMatch(JSON.stringify(normalizeBountiesFeed({ listings: [{ payTo: '' }] })), /payTo:""/);
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
const { createSessionToken, signPayload } = await import('./dasha-lobby-x.mjs');

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
    'https://lobby.getdasha.com/chess',
  ]) {
    assert.match(sitemapBody, new RegExp(`<loc>${loc.replaceAll('.', '\\.')}</loc>`), `${host} sitemap must list ${loc}`);
  }
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/capsule/, `${host} sitemap must not invent /capsule`);
  assert.doesNotMatch(sitemapBody, /lobby\.getdasha\.com\/bounties/, `${host} sitemap must not list lobby /bounties`);
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
assert.match(worker, /<script nonce="\$\{scriptNonce\}">/);
assert.match(worker, /privateHtmlHeaders\(\{[\s\S]*?'Content-Type': 'text\/html; charset=utf-8'[\s\S]*?\}, scriptNonce\)/);

const privacy = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/privacy'), {});
assert.equal(privacy.status, 200);
const privacyText = await privacy.text();
assert.match(privacyText, /does not store the X access token[\s\S]*Completed chess games are public replays showing both X handles, ratings, moves, result, and completion time/);
assert.match(privacyText, /Leave Board removes[\s\S]*chess rating, games and tournaments involving you[\s\S]*private report/);
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
      assert.doesNotMatch(html, /simp-board\.js/, `${host} / must drop the Simp client`);
      assert.doesNotMatch(html, /dasha-simp-board/, `${host} / must drop the Simp mount`);
      assert.doesNotMatch(html, /Simp board\./, `${host} / must drop the Simp board heading`);
      assert.doesNotMatch(html, /\.simp-board/, `${host} / must drop leftover Simp CSS`);
      assert.doesNotMatch(html, leftoverSimpCss, `${host} / must drop the 16 leftover Simp selectors`);
      assert.match(html, /id="token"/);
      assert.match(html, /\.dasha\{min-height:100vh/, `${host} / must keep .dasha`);
      assert.match(html, /\.contract\{border:1px solid red\}/, `${host} / must keep unrelated CSS`);
      assert.equal(home.headers.get('x-dasha-edge'), 'html-security');
    }
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      for (const path of ['/lobby', '/lobby/']) {
        const lobby = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        const lobbyHtml = await lobby.text();
        assert.match(lobbyHtml, /lobby\.getdasha\.com\/client\/simp-board\.js/, `${host} ${path} must not strip the Simp client`);
        assert.match(lobbyHtml, /id="dasha-simp-board"/, `${host} ${path} must keep the Simp mount`);
        assert.match(lobbyHtml, /Simp board\./, `${host} ${path} must keep the Simp board heading`);
        assert.doesNotMatch(lobbyHtml, leftoverSimpCss, `${host} ${path} must drop leftover Simp CSS`);
        assert.doesNotMatch(lobbyHtml, /\.simp-board\{/, `${host} ${path} must drop leftover .simp-board CSS`);
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
  const HOME_CTA_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  const webflowHome = `<!doctype html><html class="w-mod-js"><title>$dasha — make the timeline stranger</title>
<link href="https://cdn.prod.website-files.com/img/favicon.ico" rel="shortcut icon" type="image/x-icon"/>
<style>
:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81;--violet:#7c4dff;--hot-deep:#c21f5a}
.simp-board{display:grid}.simp-row{display:grid}.simp-rank{font-size:42px}
.dasha-hero{min-height:640px}
</style>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<main class="dasha" id="top">
<header class="dasha-hero wrap" id="content"><h1>It's time $dasha</h1><a class="pill primary" href="/studio">Make something →</a></header>
<section id="token"><code id="mint">${mint}</code></section>
<footer><p><a href="/how-to-buy">How to buy</a></p></footer>
</main>
</body></html>`;
  const homeCtaSection = html => {
    const match = String(html).match(/<section\b[^>]*\bid=["']dasha-home-cta["'][^>]*>[\s\S]*?<\/section>/i);
    assert.ok(match, 'home must inject #dasha-home-cta');
    return match[0];
  };
  const firstSectionAt = html => String(html).search(/<section\b/i);
  const injected = injectHomeSimpCta(webflowHome);
  const section = homeCtaSection(injected);
  assert.equal(firstSectionAt(injected), injected.search(/<section\b[^>]*\bid=["']dasha-home-cta["']/i), '#dasha-home-cta must be the first section');
  assert.match(injected, /<a class="skip-link" href="#content">Skip to content<\/a><section id="dasha-home-cta"/);
  assert.match(section, /<h1>\$dasha<\/h1>/);
  assert.match(section, /Take Simp\./);
  assert.match(section, /<a href="\/simp">Simp<\/a>/);
  assert.match(section, /<a href="\/how-to-buy">How to buy<\/a>/);
  assert.doesNotMatch(section, /<form\b/i);
  assert.doesNotMatch(section, /wallet-connect/i);
  assert.doesNotMatch(section, /payTo/);
  assert.doesNotMatch(section, /\/oauth/);
  assert.doesNotMatch(section, /<script\b/i);
  assert.doesNotMatch(section, /jupiter|iframe|twitter\.com\/embed|class="simp-|score=/i);
  assert.doesNotMatch(section, /--violet|--hot-deep|#c8b6ff|rgba\(124,77,255/);
  for (const hex of section.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
    assert.ok(HOME_CTA_TOKENS.includes(hex.toLowerCase()), `home CTA inject must stay tokens-only (saw ${hex})`);
  }
  assert.match(injected, /It's time \$dasha/);
  assert.match(injected, /Make something →/);
  assert.match(injected, new RegExp(mint));
  assert.doesNotMatch(injected, /#dasha-home-cta[\s\S]{0,200}display:\s*none|#content[\s\S]{0,80}display:\s*none|\.dasha-hero[\s\S]{0,80}display:\s*none/);
  assert.equal(injectHomeSimpCta(injected), injected, 'second pass must not duplicate #dasha-home-cta');
  assert.equal([...injected.matchAll(/id=["']dasha-home-cta["']/g)].length, 1);
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(webflowHome, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const home = await workerModule.default.fetch(new Request(`https://${host}/`), {});
      const html = await home.text();
      const cta = homeCtaSection(html);
      assert.equal(firstSectionAt(html), html.search(/<section\b[^>]*\bid=["']dasha-home-cta["']/i), `${host} / first section must be #dasha-home-cta`);
      assert.match(cta, /<a href="\/simp">Simp<\/a>/, `${host} / primary CTA must be Simp`);
      assert.match(cta, /<a href="\/how-to-buy">How to buy<\/a>/, `${host} / How to buy must be secondary`);
      assert.doesNotMatch(cta, /<form\b|wallet-connect|payTo|\/oauth|<script\b/i);
      assert.doesNotMatch(cta, /--violet|--hot-deep|#c8b6ff|rgba\(124,77,255/);
      for (const hex of cta.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
        assert.ok(HOME_CTA_TOKENS.includes(hex.toLowerCase()), `${host} / inject must stay tokens-only (saw ${hex})`);
      }
      assert.doesNotMatch(html, /\.simp-/);
      assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 1, `${host} / must keep one Privacy link`);
      assert.match(html, /<link href="\/favicon\.ico" rel="shortcut icon"/);
      assert.match(html, new RegExp(mint), `${host} / must keep the mint string`);
      assert.match(html, /It's time \$dasha/);
      assert.equal([...html.matchAll(/id=["']dasha-home-cta["']/g)].length, 1);
    }
    const studio = await workerModule.default.fetch(new Request('https://www.getdasha.com/studio'), {});
    assert.doesNotMatch(await studio.text(), /id=["']dasha-home-cta["']/, '/studio must not get the home Simp CTA');
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
    assert.match(howtoHtml, /<a href="https:\/\/www\.getdasha\.com\/">Home<\/a>/);
    assert.doesNotMatch(howtoHtml, /href="\/">(?:\$dasha|Home)</);
    assert.match(howtoHtml, /<a href="https:\/\/www\.getdasha\.com\/studio">Studio<\/a>/);
    assert.match(howtoHtml, /<a href="https:\/\/lobby\.getdasha\.com\/chess">Chess<\/a>/);
    assert.match(howtoHtml, /<a href="https:\/\/www\.getdasha\.com\/dasha">Desk<\/a>/);
    assert.equal((howtoHtml.match(/<footer\b/gi) || []).length, 1, `${host} /how-to-buy must keep one footer`);
    assert.equal((howtoHtml.match(/<nav\b/gi) || []).length, 1, `${host} /how-to-buy must keep its existing nav`);
    const chess = await workerModule.default.fetch(new Request(`https://${host}/chess`), {});
    assert.equal(chess.status, 200, `${host} /chess must stay 200`);
    assert.equal(chess.headers.get('x-dasha-edge'), 'chess');
    const chessHtml = await chess.text();
    assert.equal([...chessHtml.matchAll(/href=["']\/privacy["']/g)].length, 1, `${host} /chess must have one Privacy link`);
    assert.match(chessHtml, />Privacy</);
    assert.match(chessHtml, /<a class="brand" href="https:\/\/www\.getdasha\.com\/" aria-label="Dasha home">/);
    assert.match(chessHtml, /<a class="back" href="https:\/\/www\.getdasha\.com\/">Home<\/a>/);
    assert.doesNotMatch(chessHtml, /class="(?:brand|back)" href="\/"/);
    assert.match(chessHtml, /id="buy-dasha"/);
    assert.match(chessHtml, /Buy \$dasha ↗/);
    assert.match(chessHtml, /<p class="privacy">Wallet address and balance are checked for access, then discarded\. Ratings belong to linked X identities\.<\/p>/);
    assert.doesNotMatch(chessHtml, /<footer\b/i, `${host} /chess must not invent a footer`);
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
    assert.doesNotMatch(lobbyHtml, /class="(?:brand|back)" href="\/"/);
    assert.doesNotMatch(lobbyHtml, /<footer\b/i, `lobby ${path} must not invent a footer`);
    assert.match(lobbyHtml, /--ink:#070608/);
    assert.match(lobbyHtml, /--paper:#f4eddb/);
    assert.match(lobbyHtml, /--acid:#dfff00/);
    assert.match(lobbyHtml, /--hot:#ff3b81/);
    assert.ok(lobbyHtml.includes('sha384-fet8Bw+WiNBtGR2I4mj67Pk8Xv3WsVe4FvNEHBsjIoUvglQBomg5UPprS72dKEKb'), `lobby ${path} must keep lobby.js SRI`);
  }
  const lobbyHead = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/lobby', { method: 'HEAD' }), {});
  assert.equal(lobbyHead.status, 200, 'lobby HEAD /lobby must stay 200');
  assert.equal(await lobbyHead.text(), '', 'lobby HEAD /lobby must have an empty body');
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
      assert.match(lobbyHtml, /lobby\.getdasha\.com\/forum/);
      assert.doesNotMatch(lobbyHtml, /\.dasha\{|\.pill\{|\.price\{|\.contract\{|\.spark\{|id="token"/);
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
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
      for (const path of ['/bounties', '/bounties/']) {
        const page = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        const html = await page.text();
        assert.doesNotMatch(html, /<iframe/i, `${host} ${path} must drop the Pages iframe`);
        assert.doesNotMatch(html, /uuriko\.github\.io\/dasha-desk\/bounties/);
        assert.doesNotMatch(html, /dasha-bounties-frame/, `${host} ${path} must drop leftover frame CSS`);
        assert.match(html, /html, body \{ margin: 0; padding: 0; height: 100%; \}/, `${host} ${path} must keep the rest of the embed CSS`);
        assert.match(html, /id="dasha-bounties"/, `${host} ${path} must inject the no-JS board`);
        assert.match(html, /<h1>Bounties<\/h1>/, `${host} ${path} must name the product`);
        assert.match(html, /Post a project\. Other people run spare compute on it\./, `${host} ${path} must say what the board is`);
        assert.match(html, /<a class="go" href="#dasha-bounty-post">Post a project<\/a>/, `${host} ${path} must keep the post path`);
        assert.match(html, /I have excess compute/, `${host} ${path} must keep the spare-compute path`);
        assert.match(html, /mailto:potter@trydemigod\.com\?subject=I%20have%20excess%20compute/, `${host} ${path} must keep a no-JS compute mailto`);
        assert.match(html, /mailto:potter@trydemigod\.com/, `${host} ${path} must keep a no-JS post path`);
        assert.match(html, /No open bounties/, `${host} ${path} must stay honest when the feed source is not JSON`);
        assert.doesNotMatch(html, /not implemented/i, `${host} ${path} must not headline leftover payout status`);
        assert.doesNotMatch(html, /uuriko\.github\.io\/dasha-desk\/bounties/, `${host} ${path} must not remount the Pages iframe`);
        assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 1, `${host} ${path} must add one Privacy link on the board`);
        assert.match(html, /<a href="\/privacy">Privacy<\/a>/);
        assert.match(html, /#dasha-bounties a\{color:#dfff00\}/, `${host} ${path} must keep the existing board link color`);
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
    assert.match(thrownHtml, /id="dasha-bounties"/);
    assert.match(thrownHtml, /<h1>Bounties<\/h1>/);
    assert.match(thrownHtml, /I have excess compute/);
    assert.match(thrownHtml, /mailto:potter@trydemigod\.com/);
    assert.match(thrownHtml, /No open bounties/);
    assert.doesNotMatch(thrownHtml, /not implemented/i);
    assert.doesNotMatch(thrownHtml, /<iframe/i);
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
let quizResponse = await quizPost({ action: 'start', mode: 'quick' });
let quizData = await quizResponse.json();
const quizAttemptId = quizData.attemptId;
assert.equal(quizResponse.status, 200);
for (let i = 0; i < 10; i++) {
  quizResponse = await quizPost({ action: 'answer', answer: 0, attemptId: quizAttemptId });
  quizData = await quizResponse.json();
}
assert.equal(quizData.done, true);
assert.equal(quizData.linkRequired, true);
assert.equal(studioDo.simpQuizMetrics.starts, 1);
assert.equal(studioDo.simpQuizMetrics.completions, 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.reached).reduce((a, b) => a + b, 0), 10);
assert.equal(Object.values(studioDo.simpQuizMetrics.answers).reduce((a, b) => a + b, 0), 10);
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
studioDo.env.LOBBY_SESSION_SECRET = 'holder-test-secret';
studioDo.simpProfiles.x1 = { xId: 'x1', handle: 'ava', enrolledAt: Date.now(), awards: [] };
const sessionToken = await createSessionToken(studioDo.env, { xId: 'x1', handle: 'ava' });
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
const finalizedQuiz = await holderRequest('/simp/quiz', { action: 'finalize', attemptId: quizAttemptId });
assert.equal(finalizedQuiz.status, 200);
assert.equal(Object.values(studioDo.simpQuizMetrics.lanes).reduce((a, b) => a + b, 0), 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.tiers).reduce((a, b) => a + b, 0), 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.elapsed).reduce((a, b) => a + b, 0), 1);
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
