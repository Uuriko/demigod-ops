import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { AWARD_BTN_CSS, AWARD_CHROME_CSS, DASHA_ROOMS, hamburgerHtml, roomRailHtml, slimFooterHtml } from './dasha-award-chrome.mjs';

const root = new URL('./', import.meta.url);
const landing = await readFile(new URL('./dasha-landing.html', root), 'utf8');
const page = await readFile(new URL('./dasha-lobby-page.html', root), 'utf8');
const client = await readFile(new URL('./dasha-lobby-client.js', root), 'utf8');
const worker = await readFile(new URL('./dasha-lobby-worker.mjs', root), 'utf8');
const chessPage = await readFile(new URL('./dasha-chess-page.html', root), 'utf8');
const simpClient = await readFile(new URL('./dasha-simp-board-client.js', root), 'utf8');
const studioEmbed = await readFile(new URL('./dasha-studio-embed.js', root), 'utf8');
const studioPage = await readFile(new URL('./dasha-meme-studio.html', root), 'utf8');
const wrangler = await readFile(new URL('./dasha-lobby-wrangler.jsonc', root), 'utf8');
const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

assert(!landing.includes('id="dasha-lobby"'), 'landing must not mount lobby');
assert(page.includes('id="dasha-lobby"'), 'dedicated lobby mount missing');
assert(!chessPage.includes('id="dasha-lobby"'), 'chess must not embed lobby chat');
assert.match(chessPage, /class="chess-still"/, 'chess keeps one still on the side');
assert.doesNotMatch(chessPage, /class="chess-stills"/, 'chess must not park stills on the board');
assert.match(chessPage, /\.btn\{[^}]*background:var\(--acid\);color:var\(--ink\)/, 'chess primary is acid fill + ink type');
assert.match(chessPage, /\.btn\.ghost\{[^}]*color:var\(--paper\);border:1px solid var\(--paper\)/, 'chess ghost is paper on ink');
assert.match(chessPage, /\.btn:disabled\{opacity:\.7/, 'chess disabled type stays readable');
assert.doesNotMatch(chessPage, /\.btn:disabled\{opacity:\.5/);
assert.match(simpClient, /\.simp-quiz-go,.simp-quiz-start\{[^}]*min-height:56px;min-width:12rem[^}]*background:#dfff00;color:#070608/, 'Take Quiz is acid fill + ink type at 56px');
assert.match(simpClient, /\.simp-quiz-go:hover,.simp-quiz-go:focus-visible,.simp-quiz-start:hover,.simp-quiz-start:focus-visible\{[^}]*color:#070608/, 'Take Quiz hover/focus stays ink on acid');
assert.match(simpClient, /\.simp-quiz-go:disabled,.simp-quiz-start:disabled\{[^}]*color:#070608/, 'Take Quiz disabled stays readable');
assert.match(simpClient, /@media\(max-width:520px\)\{[\s\S]*?\.simp-quiz-go,.simp-quiz-start\{width:100%/, 'Take Quiz is full-width on mobile');
assert.match(simpClient, /\.simp-connect,.simp-quiz-share\{[^}]*border:1px solid #f4eddb;background:none;color:#f4eddb/, 'Connect X is paper on ink');
assert.match(simpClient, /\.simp-more\{[^}]*color:#dfff00;font:900 1rem/, 'Show more is acid on ink');
assert.doesNotMatch(simpClient, /\.simp-quiz-choice\{[^}]*color:#fff/, 'quiz choices are not white type');
assert.match(simpClient, /\.simp-quiz-choice\{[^}]*color:#f4eddb/, 'quiz choices are paper on ink');
assert.doesNotMatch(simpClient, /opacity:\.55/, 'board button type is not faded to .55');
assert(chessPage.includes('Invite / 1v1'), 'chess keeps a hidden invite control for deep links');
assert.match(chessPage, /id="gate-action"[^>]*>Play</);
assert.match(chessPage, /Needs JavaScript to play/);
assert.doesNotMatch(chessPage, /Checking your seat/);
assert.match(chessPage, /class="dasha-slim[\s"]/);
assert.doesNotMatch(chessPage, /details class="dasha-menu"|aria-label="Menu">Menu</);
assert.doesNotMatch(chessPage, /<nav aria-label="Dasha">|<nav aria-label="Rooms">/);
assert.doesNotMatch(chessPage, /href="\/verse">Verse</);
assert.doesNotMatch(chessPage, /href="\/chess">Chess</, 'chess chrome must not render a Chess room door');
assert.doesNotMatch(chessPage, /\/airdrop|\/earn|\/claim|\/graph/, 'chess chrome must not grow dead or shelved doors');
{
  const ham = hamburgerHtml();
  const rail = roomRailHtml();
  const foot = slimFooterHtml();
  assert.equal(DASHA_ROOMS.length, 0, 'chrome room list is empty');
  assert.equal(rail, '', 'no numbered room rail');
  assert.doesNotMatch(ham, /dasha-menu|aria-label="Menu">Menu</, 'slim bar must not render a Menu');
  assert.doesNotMatch(ham, /<nav\b/, 'slim bar is wordmark + Buy only');
  assert.doesNotMatch(foot, /<nav\b/, 'footer has no room nav');
  assert.doesNotMatch(ham + rail + foot, /\/studio|>Studio</, 'chrome list must hide Studio');
  assert.doesNotMatch(ham + rail + foot, /\/how-to-buy|>How to buy</, 'chrome list must hide How to buy');
  assert.doesNotMatch(ham + rail + foot, /\/graph/, 'chrome list must hide Graph');
  assert.doesNotMatch(ham + rail + foot, /\/faucet/, 'chrome list must hide Faucet');
  assert.doesNotMatch(ham + rail + foot, /\/simp/, 'chrome list must hide Simp');
  assert.doesNotMatch(ham + rail + foot, /\/dasha["']|>Desk</, 'chrome list must hide Desk');
  assert.doesNotMatch(ham + rail + foot, /\/bounties/, 'chrome list must hide Bounties');
  assert.doesNotMatch(ham + rail + foot, /\/privacy|>Privacy</, 'chrome list must hide Privacy');
  assert.doesNotMatch(ham + rail + foot, /\/learn|>Learn</, 'chrome list must hide Learn');
  assert.doesNotMatch(ham + rail + foot, /\/verse|>Verse</, 'chrome list must hide Verse');
  assert.doesNotMatch(ham + rail + foot, /\/forum|>Forum</, 'chrome list must hide Forum');
  assert.doesNotMatch(ham + rail + foot, /\/chess|>Chess</, 'chrome list must hide Chess');
  assert.match(foot, /padding:1\.25rem 1\.25rem calc\(1\.25rem/);
  assert.doesNotMatch(foot, /180px/, 'footer must not reserve the retired dancer dock');
  assert.match(foot, /min-height:48px/);
  assert.match(AWARD_BTN_CSS, /a\.pill\.primary,a\.buy-dasha,.w-button[\s\S]*?background:#dfff00!important;color:#070608!important/, 'primary Buy is acid fill + ink type');
  assert.match(AWARD_BTN_CSS, /a\.btn\.ghost[\s\S]*?color:#f4eddb!important;border:1px solid #f4eddb!important/, 'ghost / Connect X is paper on ink');
  assert.match(AWARD_BTN_CSS, /a\.btn:disabled[^{]*\{opacity:\.7/, 'disabled type stays at .7');
  assert.doesNotMatch(AWARD_BTN_CSS, /color:#fff|color:white/i, 'no white type on buttons');
  assert.doesNotMatch(AWARD_BTN_CSS, /\.simp-/, 'shared lock stays off leftover Simp CSS');
  assert.match(AWARD_CHROME_CSS, /background:#dfff00!important;color:#070608!important/, 'chrome ships the button lock');
  assert.match(AWARD_CHROME_CSS, /@view-transition\{navigation:auto\}/, 'chrome ships the / ↔ /simp ink cut');
  assert.match(AWARD_CHROME_CSS, /animation-duration:200ms/, 'ink cut stays in the 160–240ms window');
  assert.match(ham, /dasha-ink-cut/, 'slim bar ships the ink overlay fallback');
  assert.match(studioEmbed, /\.btn\.primary\{background:var\(--acid\);border-color:var\(--acid\);color:var\(--ink\)/, 'studio primary is acid fill + ink type');
  assert.match(studioEmbed, /\.btn\{[\s\S]*?background:transparent;color:var\(--paper\)/, 'studio ghost is paper on ink');
  assert.match(studioEmbed, /\.chip\{min-height:48px[\s\S]*?color:var\(--paper\)/, 'studio chips are 48px paper on ink');
  assert.match(studioPage, /\.btn\.primary\{background:var\(--acid\);border-color:var\(--acid\);color:var\(--ink\)/, 'studio page primary is acid fill + ink type');
}
assert.doesNotMatch(chessPage, /href="\/forum">Forum</, 'chess page chrome must hide Forum');
assert.doesNotMatch(chessPage, /#08070a|#f5eedf|#72d6ff|#c8b6ff/);
assert(page.includes('wss://lobby.getdasha.com/ws'), 'dedicated lobby must use permanent WS host');
assert(!landing.includes('spiny-helmet'), 'temporary workers host must not remain');
assert(!landing.includes('On-site, not Discord'), 'removed Lobby framing returned');
assert(!/(?:can|might|could|will) go to zero|go(?:es|ing)? to zero|not financial advice|\bNFA\b|association is not endorsement|no price promises|old coin and Im not the dev|high risk|rugcheck|never trust|lose (?:your )?money|lose it all|worthless|dead coin/i.test(landing), 'negative coin disclaimer returned');
assert(!landing.includes('Public lobby.</h2>'), 'removed Lobby title returned');
assert(page.includes('lobby.getdasha.com/client/lobby.js'), 'dedicated page must load lobby client');
assert.match(page, /class="dasha-word" href="https:\/\/www\.getdasha\.com\/">\$dasha</, 'lobby wordmark must leave the JSON health root');
assert.match(page, /class="dasha-slim[\s"]/, 'lobby leftover page keeps the slim bar');
assert.doesNotMatch(page, /dasha-menu|aria-label="Menu">Menu</, 'lobby leftover page must not render a Menu');
assert.doesNotMatch(page, /dasha-rooms|dasha-next|<h1>/, 'forum first paint is threads + chat, not a rail or hero');
assert.doesNotMatch(page, /href="\/studio"/, 'lobby chrome must not door to Studio');
assert.doesNotMatch(page, /href="\/how-to-buy"/, 'lobby chrome must not door to How to buy');
assert.doesNotMatch(page, /href="\/verse"/, 'lobby chrome must not door to Verse');
assert.doesNotMatch(page, /href="\/learn"/, 'lobby chrome must not door to Learn');
assert.doesNotMatch(page, /href="\/privacy"/, 'lobby chrome must not door to Privacy');
assert.doesNotMatch(page, /href="\/faucet"/, 'lobby chrome must not door to Faucet');
assert.doesNotMatch(page, /href="\/simp"/, 'lobby chrome must not door to Simp');
assert.doesNotMatch(page, /href="\/dasha"/, 'lobby chrome must not door to Desk');
assert.doesNotMatch(page, /href="\/bounties"/, 'lobby chrome must not door to Bounties');
assert.doesNotMatch(page, /\/airdrop|\/earn|\/claim|\/graph/, 'forum chrome hides dead and shelved doors');
assert.doesNotMatch(page, /href="\/graph"/, 'lobby must not door to shelved /graph');
assert.doesNotMatch(page, /class="(?:brand|back)" href="\/"/, 'lobby navigation must not mislabel the lobby service root as Home');
assert(/s\.integrity='sha384-[A-Za-z0-9+/=]+'/.test(page) && page.includes("s.crossOrigin='anonymous'"), 'dedicated lobby client must be SRI-pinned after Webflow sanitization');
assert(!landing.includes('href="/forum"'), 'landing must not feature Forum');
assert(landing.includes('href="/chess"'), 'landing Chess must be same-origin');
assert(!landing.includes('href="https://lobby.getdasha.com/chess"'), 'landing must drop leftover lobby Chess href');
assert(!landing.includes('href="https://lobby.getdasha.com/forum"'), 'landing must drop leftover lobby Forum href');
assert(!/lobby-copy-(?:mint|line)|Copy mint|Copy line/.test(client), 'Lobby copy controls returned');
assert(!/discord\.gg|discord\.com\/invite|t\.me\//i.test(landing), 'landing must not promote Discord/Telegram invite links');
assert(!/official chat|verified community|safe mint/i.test(landing), 'lobby must not claim official/safe status');

assert(client.includes(mint), 'client pins mint');
assert(client.includes('settleEmptyQuiz') && client.includes('href="/simp">Take Simp'), 'empty #dasha-quiz hops to /simp');
assert(client.includes('DashaLobby'), 'client exports DashaLobby');
assert(client.includes('type === \'ready\'') || client.includes("data.type === 'ready'"), 'client handles ready frame');
assert(client.includes('waitMs') || client.includes('Wait '), 'client handles rate wait');
assert(client.includes("root.appendChild(xBar)"), 'client must append X bar');
assert(client.includes('pendingText'), 'client queues messages during join cooldown');
assert(client.includes('mountForum') && client.includes("getElementById('dasha-forum')"), 'client mounts #dasha-forum');
assert(!client.includes('Be first.'), 'empty chat log stays empty');
assert(!client.includes('verify mint'), 'chat must not lecture mint');

assert(worker.includes('export class DashaLobby'), 'worker exports Durable Object');
assert(worker.includes('acceptWebSocket'), 'worker uses hibernation WebSockets');
assert(worker.includes("idFromName('public')"), 'worker is single public room');
assert(worker.includes("type: 'ready'"), 'worker sends ready not double hello_ok');
assert(worker.includes('nickTaken'), 'worker enforces nick uniqueness');
assert(worker.includes('checkRepeat'), 'worker enforces duplicate filter');
assert(worker.includes('MAX_SOCKETS'), 'worker has connection cap');
assert(worker.includes('4001') || worker.includes('lobby full'), 'worker rejects over-cap joins');
assert(worker.includes('/capacity'), 'worker exposes capacity probe');
assert(worker.includes('isLeftoverForumPath') && worker.includes("path === '/forum' || path === '/lobby'"), 'leftover /forum and /lobby 308 home');
assert(worker.includes('LOBBY_PAGE_HTML'), 'forum page bytes stay on disk for later');
assert(!landing.includes('One room · max 80.'), 'removed Lobby explainer returned');
assert(worker.includes('/oauth/x/start'), 'worker has X OAuth start');
assert.match(worker, /\['https:\/\/www\.getdasha\.com','https:\/\/getdasha\.com','https:\/\/lobby\.getdasha\.com'\]\.forEach/, 'OAuth popup completion must target every first-party opener origin exactly');
assert(!worker.includes('return to the lobby'), 'shared OAuth completion must not force every product back to Lobby');
assert(!worker.includes('Perks unlocked: longer messages'), 'shared OAuth completion must not claim Lobby-only perks');
assert(worker.includes('isLeftoverPrivacyPath') && !worker.includes('PRIVACY_HTML'), 'leftover /privacy 308s home; no policy page');
assert(worker.includes('isLeftoverForumPath'), 'product and lobby /forum 308 home');
assert(worker.includes('NOT_FOUND_HTML') && worker.includes("'X-Dasha-Edge': 'html-404'"), 'unknown paths serve branded HTML 404');
assert(worker.includes("url.searchParams.get('continue') !== '1'") && worker.includes('Continue with X'), 'OAuth still gates continue=1');
assert(!/offline\.access/.test(await readFile(new URL('./dasha-lobby-x.mjs', root), 'utf8')), 'OAuth must not request unused persistent X access');
assert(worker.includes('sessionFromRequest'), 'worker reads optional X session');
assert(client.includes('Link X') || client.includes('link X'), 'client has optional X link control');
assert(client.includes('/oauth/x/'), 'client talks to X oauth routes');
assert(client.includes('linkedAvatar') && client.includes("document.createTextNode('@' + linkedHandle)"), 'linked identity must show @handle and avatar');
assert(!client.includes('nfaStrip'), 'Lobby warning strip must stay removed');
assert(client.includes('root.appendChild(xBar)'), 'Lobby X toolbar must mount');
assert(!client.includes('presenceStrip'), 'presence lecture must stay removed');
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
assert(!client.includes('lobby-empty') && !client.includes('Be first.'), 'empty chat log is empty');
assert(!client.includes('lobby-empty-cta') && !client.includes('lobby-empty-actions'), 'empty chat must not compete with the composer');
assert(client.includes('exactParams({ sell: WSOL, buy: MINT })') && client.includes("exactParams({ inputMint: 'sol', outputMint: MINT })") && client.includes("'/solana/pools/' + PAIR"), 'Lobby client must render only exact-mint/pair crypto links');
assert(worker.includes('setAlarm'), 'worker schedules history prune');
assert(worker.includes("'Content-Security-Policy': \"frame-ancestors 'none'; base-uri 'none'; object-src 'none'\""), 'Worker HTML security policy missing');
assert(worker.includes('applyHtmlSecurity(new Headers(upstream.headers))'), 'proxied Webflow HTML must receive Worker security headers');
assert(worker.includes('ensurePrivacyLink(html)'), 'proxied product HTML must strip leftover Privacy doors');
assert(worker.includes('rewriteStudioScriptIntegrity(html)'), 'proxied product HTML must rewrite leftover studio.js SRI');
assert(worker.includes('rewriteLobbyScriptIntegrity(html)'), 'proxied product HTML must rewrite leftover lobby.js SRI');
assert(worker.includes('stripDeadLobbyForum(html)'), 'leftover Webflow forum.js hops still get stripped off non-forum pages');
assert(worker.includes('rewriteLeftoverLobbyHrefs(html)'), 'proxied HTML must remap leftover lobby chess/forum hrefs');
assert(worker.includes('rewriteStudioBuyVerifyHref(html)'), 'proxied /studio must retarget Buy/verify off #token');
assert(worker.includes('isLeftoverHowtoPath'), 'how-to-buy is a quiet leftover 308');
assert(worker.includes('rewriteStaleCdnFavicon(html)'), 'proxied product HTML must rewrite leftover CDN favicon.ico');
assert(worker.includes('rewriteHomeFirstViewport(stripHomeSimpBoard(html))'), 'www/apex / must rewrite the first viewport after stripping leftover board chrome');
assert(worker.includes('ensureHomeChessMount') && worker.includes('chessHomeMountHtml'), 'home rewrite embeds the chess game above faucet');
assert(worker.includes('stripHomeLeftoverChrome'), 'home rewrite strips leftover Webflow chrome from the HTML');
assert(worker.includes('id="dasha-home-calm"') && worker.includes('.dasha>nav.nav') && worker.includes('main.dasha>nav.nav') && worker.includes('main.dasha>nav.nav.wrap') && worker.includes('.dasha-hero .actions a:not(.buy-dasha)') && worker.includes('.dasha-hero .actions .pill:not(.buy-dasha)') && worker.includes('github.com/Uuriko/dasha-desk') && worker.includes('a[href^="/studio#"]') && worker.includes('footer:not(.dasha-foot)'), 'home html-security injects first-paint hide CSS');
assert.doesNotMatch(worker, /References describe internet culture|dasha-assoc|Not endorsement|association is not endorsement|we will not ask for a phrase/i, 'homeFirstViewportHtml must delete disclaimer copy, not hide it');
assert(worker.includes('ensureHomeBuyPill') && worker.includes('HOME_BUY_PILL'), 'home rewrite ensures a Jupiter Buy pill');
assert.doesNotMatch(worker, /function homeFirstViewportHtml|dasha-band|dasha-posters/, 'home rewrite must not emit the lock carnival');
assert(worker.includes('WORKER_SITE_FOOTER'), 'worker pages share one site footer');
assert.doesNotMatch(worker, /id="dasha-lock"/, 'worker must not emit #dasha-lock');
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
assert(!worker.includes('font:16px/1.45 system-ui,sans-serif'), '/simp must use Arial, not system-ui');
assert(worker.includes("isExactPath(url.pathname, '/bounties')") && worker.includes("Response.redirect('https://www.getdasha.com/', 308)"), 'leftover /bounties 308s home');
assert(worker.includes('unpaidBountiesHtmlHasPayoutAmounts'), 'unpaid /bounties HTML must have a payout-amount proof');
assert(worker.includes('isLeftoverVersePath') && !worker.includes('versePageHtml'), 'leftover /verse 308s home; no Verse page');
assert(worker.includes('GRAPH_PAGE = GRAPH_PAGE_HTML') && worker.includes("Response.redirect('https://www.getdasha.com/', 308)"), 'www /graph is shelved; source stays, route 308s home');
assert(worker.includes('isLeftoverLearnPath') && !worker.includes('learnPageHtml'), 'leftover /learn 308s home; no Learn page');
assert(worker.includes('isLeftoverStudioPath') && worker.includes('isLeftoverDeskPath'), 'leftover /studio and /dasha 308 home');
assert(!worker.includes('Open Graph'), 'oauth dest must not mention Graph');
assert(!worker.includes('lobby.getdasha.com/price'), 'home chart must not use the dead /price endpoint');
assert(worker.includes('client/learn.js') && worker.includes('LEARN_CLIENT_SRI'), 'learn client bytes may still be served');
assert(worker.includes("path === '/simp/learn'"), 'worker exposes /simp/learn awards');
assert(worker.includes("'X-Dasha-Edge': 'faucet'") && worker.includes('faucetPageHtml'), 'www /faucet is worker-owned first HTML');
assert(worker.includes('client/faucet.js') && worker.includes('FAUCET_CLIENT_SRI'), 'www /faucet mounts the faucet client');
assert(worker.includes('handleFaucetApi') && worker.includes('isFaucetApiPath'), 'worker routes faucet API');
assert(worker.includes('magnetRoute') && worker.includes('magnetPageHtml'), 'honest airdrop/earn magnet rooms');
assert(!worker.includes("isExactPath(url.pathname, '/hold')") && !worker.includes("isExactPath(url.pathname, '/academy')"), 'no new colliding commerce/academy routes');
assert(worker.includes("url.pathname === '/api/graph'") && worker.includes("url.pathname === '/api/graph/expand'"), 'worker exposes public graph APIs');
assert(worker.includes('/api/graph/highlight') && worker.includes('/api/graph/wallet/challenge'), 'worker exposes graph highlight proof');
assert(worker.includes("kind: 'graph_highlight'"), 'graph highlight must use its own SIWS kind');
assert(!/getProgramAccounts/.test(worker), 'graph must not use getProgramAccounts');
assert(worker.includes('isLeftoverVersePath') && worker.includes('/dashaverse') && worker.includes('/bible'), 'leftover /dashaverse and /bible 308 home');
assert(!worker.includes('injectBountiesBoard(stripBountiesIframe'), 'www /bounties must not paint through Webflow');
assert(worker.includes('SIMP_BOARD_SRI') && worker.includes('client/simp-board.js'), 'www /simp mounts the existing board client');
assert(worker.includes('export function danceDockPath') && worker.includes('export function injectDanceDock'), 'dock helpers stay');
assert.match(worker, /export function danceDockPath\([^)]*\) \{\s*return false;\s*\}/, 'danceDockPath is false for every path');
assert.match(worker, /export function injectDanceDock\(html\) \{\s*return html;\s*\}/, 'injectDanceDock is a no-op');
assert(worker.includes('GRAPH_PAGE = GRAPH_PAGE_HTML'), '/graph must not grow the dance dock');
assert(!worker.includes("path === '/' || path === '/lobby' || path === '/studio' || path === '/dasha'"), 'dock is off every path');
assert(worker.includes('ensureHomeSimpMount') && worker.includes('injectHomeReveal'), 'home rewrite remounts the pretty board below the hero');
assert(worker.includes('ensureHomeTapeMount') && worker.includes('DASHA_TAPE_EMBED_SRC'), 'home remounts the live pair chart above the board');
assert(worker.includes('ensureHomeStillsMount') && worker.includes('stills-grid'), 'home remounts a first-party stills strip below the tape');
assert(worker.includes('ensureHomeFaucetMount') && worker.includes('faucetMountHtml'), 'home remounts the live faucet toy after the board');
assert(!worker.includes('ensureHomeSimpHop') && !worker.includes('dasha-simp-hop'), 'home #simp is the board, not a hop-only paragraph');
assert(!worker.includes('class="dasha-quiz" data-simp-api'), 'home mount is not quiz chrome');
assert(worker.includes('stripLobbySimpQuiz') && worker.includes('stripLobbySimpQuiz(LOBBY_PAGE_HTML)'), 'first-party /lobby must not mount the quiz');
assert(!worker.includes('SIMP_QUIZ_JS'), 'must not invent a second quiz client');
assert(worker.includes('simpSharePageHtml') && worker.includes('og:image:alt'), 'www /simp/r is type-first share HTML');
assert(worker.includes('simpQuizFirstPaintHtml') && worker.includes('simpResultMissingHtml'), 'www /simp first-paints the quiz and has an honest result 404');
assert(worker.includes("anon:${randomUrlToken(9)}") || worker.includes('anon:${'), 'quiz start must work without a linked X session');
assert(worker.includes('id="grwm"') && worker.includes('/client/grwm.mp4') && worker.includes('/client/grwm-loop.mp4') && worker.includes('/client/grwm.jpg'), 'home mounts first-party GRWM after the hero');
assert.ok((await stat(new URL('./dasha-worker-assets/client/grwm.mp4', root))).size < 20 * 1024 * 1024, 'grwm.mp4 must stay under 20 MiB');
assert.ok((await stat(new URL('./dasha-worker-assets/client/grwm-loop.mp4', root))).size < 1024 * 1024, 'grwm-loop.mp4 must stay under 1 MiB');
assert.ok((await stat(new URL('./dasha-worker-assets/client/grwm.jpg', root))).size > 1000, 'grwm.jpg must exist');
for (const name of ['scary', 'berlinale', 'cotton', 'hero', 'pony', 'press', 'bull', 'weekend', 'profile']) {
  assert.ok((await stat(new URL(`./dasha-worker-assets/simp/photo/${name}.jpg`, root))).size > 1000, `${name}.jpg must be hosted first-party`);
}
assert(worker.includes('<video muted loop playsinline autoplay poster="/client/grwm.jpg" src="/client/grwm-loop.mp4">'), 'GRWM living poster is muted loop autoplay');
assert(worker.includes("v.src='/client/grwm.mp4'") && worker.includes('v.controls=true') && worker.includes('v.muted=false'), 'tap swaps the same player to the full file with sound');
assert(!worker.includes('video.twimg.com') && !worker.includes('pbs.twimg.com'), 'GRWM must not hotlink X');
assert(worker.includes('overflow-x:auto') && worker.includes('scroll-snap-type:x mandatory'), 'stills strip is a horizontal flick');
assert(worker.includes('data-quiz="${quiz}"') && worker.includes('dasha-still-quiz') && worker.includes("'scary-cap'") && worker.includes("['pony', '']"), 'a still can jump into a matching quiz question');
assert.match(worker, /#stills \.still:hover,#stills \.still:focus-visible\{transform:rotate/, 'stills tilt on hover/focus');
{
  const stillsFn = worker.slice(worker.indexOf('function stillsMountHtml'), worker.indexOf('function stripLeftoverStills'));
  assert.doesNotMatch(stillsFn, /archive|sweet|media\.jpg|public\.jpg|chart\.jpg/, 'stills skip leftover / non-Dasha / duplicate frames');
}
assert(worker.includes('Needs JavaScript.'), 'www /simp noscript must not dump the bank');
assert(worker.includes('isBountiesJsonPath') && worker.includes('BOUNTIES_FEED_PAGE'), '/bounties.json stays the listings feed');
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
const { DashaLobby, bountiesPageHtml, danceDockPath, ensureHtmlLang, ensurePrivacyLink, injectBountiesBoard, injectDanceDock, normalizeBountiesFeed, parseVerseSubmit, personalizeChessPage, publicFunnelSummary, rewriteHomeFirstViewport, rewriteLeftoverLobbyHrefs, rewriteLobbyScriptIntegrity, rewriteStaleCdnFavicon, rewriteStudioBuyVerifyHref, rewriteStudioScriptIntegrity, sanitizePublicJsonLd, simpPageHtml, simpSharePageHtml, solanaRpcEndpoints, stripBountiesIframe, stripDeadLobbyForum, stripHomeSimpBoard, stripLobbySimpQuiz, unpaidBountiesHtmlHasPayoutAmounts } = workerModule;
const { LOBBY_CLIENT_JS, SIMP_BOARD_JS, SIMP_BOARD_SRI, STUDIO_CLIENT_JS, LOBBY_CLIENT_SRI } = await import('./dasha-lobby-static-gen.mjs');
const STUDIO_SRI = `sha384-${createHash('sha384').update(STUDIO_CLIENT_JS).digest('base64')}`;
const LOBBY_SRI = `sha384-${createHash('sha384').update(LOBBY_CLIENT_JS).digest('base64')}`;
assert.equal(LOBBY_SRI, LOBBY_CLIENT_SRI, 'LOBBY_CLIENT_SRI must be the hash of served client/lobby.js');
const SIMP_SRI_FROM_BYTES = `sha384-${createHash('sha384').update(SIMP_BOARD_JS).digest('base64')}`;
assert.equal(SIMP_BOARD_SRI, SIMP_SRI_FROM_BYTES, 'SIMP_BOARD_SRI must be the hash of served client/simp-board.js bytes');
assert.doesNotMatch(SIMP_BOARD_JS, /Open Studio|Open forum|Make a meme/);
assert.doesNotMatch(SIMP_BOARD_JS, /\/studio|\/forum/);
assert.doesNotMatch(SIMP_BOARD_JS, /You cannot play until you connect X|X is required\. No anonymous play\./);
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
assert.match(missingChessHtml, /<title>Chess — \$dasha<\/title>/);
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
for (const host of ['www.getdasha.com', 'getdasha.com']) {
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/forum', '/forum/', '/lobby', '/lobby/']) {
      const leftover = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(leftover.status, 308, `${host}${path} ${method} must 308 home`);
      assert.equal(leftover.headers.get('location'), 'https://www.getdasha.com/');
    }
    for (const path of ['/how-to-buy', '/how-to-buy/', '/howtobuy', '/howtobuy/']) {
      const howtobuy = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(howtobuy.status, 308, `${host}${path} ${method} must 308 home`);
      assert.equal(howtobuy.headers.get('location'), 'https://www.getdasha.com/');
    }
    for (const path of ['/privacy', '/privacy/', '/legal', '/privacy-policy']) {
      const privacy = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
      assert.equal(privacy.status, 308, `${host}${path} ${method} must 308 home`);
      assert.equal(privacy.headers.get('location'), 'https://www.getdasha.com/');
    }
  }
}
for (const method of ['GET', 'HEAD']) {
  for (const path of ['/how-to-buy', '/how-to-buy/', '/howtobuy', '/howtobuy/']) {
    const howtobuy = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(howtobuy.status, 308, `lobby${path} ${method} must 308 home`);
    assert.equal(howtobuy.headers.get('location'), 'https://www.getdasha.com/');
  }
}
for (const method of ['GET', 'HEAD']) {
  for (const path of ['/privacy', '/privacy/', '/legal', '/privacy-policy']) {
    const privacy = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(privacy.status, 308, `lobby ${path} ${method} must 308 home`);
    assert.equal(privacy.headers.get('location'), 'https://www.getdasha.com/');
  }
}
for (const method of ['GET', 'HEAD']) {
  for (const path of ['/forum', '/forum/', '/lobby', '/lobby/']) {
    const leftover = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
    assert.equal(leftover.status, 308, `lobby ${path} ${method} must 308 home`);
    assert.equal(leftover.headers.get('location'), 'https://www.getdasha.com/');
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
      assert.match(body, /<a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a> · <a class="buy-dasha"/);
      assert.match(body, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</);
      assert.match(body, /class="dasha-slim[\s"]/);
      assert.doesNotMatch(body, /Back to Dasha|USDC/);
      assert.doesNotMatch(body, /href="\/forum">Forum</);
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
    assert.equal(hop.status, 308, `lobby ${path} ${method} must 308 home`);
    assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/');
  }
}
{
  const SIMP_TOKENS = ['#070608', '#f4eddb', '#dfff00', '#ff3b81'];
  const assertSimpFirstHtml = (html, label) => {
    assert.match(html, /<h1>Simp<\/h1>/, `${label} must use h1 Simp`);
    assert.match(html, /class="dasha-slim[\s"]/, `${label} must ship the slim bar`);
    assert.doesNotMatch(html, /dasha-menu|aria-label="Menu">Menu</, `${label} must not render a Menu`);
    assert.doesNotMatch(html, /<nav aria-label="Dasha">|<nav aria-label="Rooms">/, `${label} must not render a room list`);
    assert.match(html, /class="dasha-word" href="https:\/\/www\.getdasha\.com\/">\$dasha</, `${label} wordmark must leave the JSON health root`);
    assert.doesNotMatch(html, /href="\/forum">Forum</, `${label} chrome must hide Forum`);
    assert.doesNotMatch(html, /href="\/studio">Studio</, `${label} chrome must not include Studio`);
    assert.doesNotMatch(html, /href="\/graph"/, `${label} chrome must not door to shelved /graph`);
    assert.doesNotMatch(html, /href="\/verse">Verse</, `${label} chrome must not include Verse`);
    assert.match(html, /class="buy-dasha"[^>]*>Buy \$dasha</, `${label} must keep one acid Buy pill`);
    assert.doesNotMatch(html, /href="\/chess">Chess</, `${label} chrome must not door to Chess`);
    assert.doesNotMatch(html, /\/rally|\/airdrop|\/earn|\/claim/i, `${label} chrome must not grow dead doors`);
    assert.match(html, /How big of a Dasha simp are you\?/, `${label} must lead with the quiz`);
    assert.equal((html.match(/How big of a Dasha simp are you\?/g) || []).length, 1, `${label} must not stack the quiz lede`);
    assert.doesNotMatch(html, /Open Studio|Open forum|Make a meme/);
    assert.doesNotMatch(html, /href=["'][^"']*\/(?:studio|forum)/);
    assert.doesNotMatch(html, /Quick 10Q|Deep 20Q|\b10Q\b|\b20Q\b/);
    assert.doesNotMatch(html, /Take Simp|Ranked by lore|founding #1|not measured/);
    assert.match(html, /<a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a> · <a class="buy-dasha"[^>]*>Buy \$dasha ↗<\/a> · <a href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats<\/a>/, `${label} footer must keep \$dasha + Buy + @dash_eats`);
    assert.doesNotMatch(html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '', /<nav\b|href="\/chess">Chess</, `${label} footer has no room nav`);
    assert.doesNotMatch(html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '', /href="\/learn">Learn</, `${label} footer must not include Learn`);
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
    assert.match(html, /font:16px\/1\.45 Arial,Helvetica,sans-serif/);
    assert.match(html, /font-family:"Arial Black",Arial,Helvetica,sans-serif/);
    assert.match(html, /a\{color:var\(--acid\)\}/);
    assert.doesNotMatch(html, /system-ui|\bInter\b|Geist|fonts\.googleapis/);
    assert.doesNotMatch(html, /<script>[^<]*action:'start'/);
    assert.doesNotMatch(html, /class="dasha-board"|<ol\b|No measured simps yet/);
    assert.doesNotMatch(html.replace(/href="https:\/\/x\.com\/dash_eats"/g, ''), /x\.com\//, `${label} must not dump X profiles outside the @dash_eats nav hop`);
    assert.doesNotMatch(html, /#2 @|#3 @/);
    assert.match(html, /\.simp-row\{display:grid;grid-template-columns:3\.2rem minmax\(0,1fr\) 3\.2rem/, `${label} must ship three-column board CSS`);
    assert.match(html, /<button type="button" class="simp-quiz-go" data-dasha-take-quiz>Take Quiz<\/button>/);
    assert.doesNotMatch(html, /Take the quiz|href="\/simp">Take Quiz/);
    assert.doesNotMatch(html, />RANK<|>CONTRIBUTOR<|>SCORE<|Breakdown|linked badge/i);
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
    assert.equal(invented.status, 308, `lobby ${path} must 308 home`);
    assert.equal(invented.headers.get('location'), 'https://www.getdasha.com/');
  }
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/bounties', '/bounties/']) {
      const hop = await workerModule.default.fetch(new Request(`https://lobby.getdasha.com${path}`, { method }), {});
      assert.equal(hop.status, 308, `lobby ${path} ${method} must 308 home`);
      assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/');
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
      for (const [path, edge] of [['/airdrop', 'airdrop'], ['/earn', 'earn'], ['/claim', 'claim']]) {
        const room = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(room.status, 200, `${host}${path} must stay 200`);
        assert.equal(room.headers.get('x-dasha-edge'), edge, `${host}${path} must keep x-dasha-edge ${edge}`);
        assert.doesNotMatch(await room.text(), /not an airdrop|not earn/i);
      }
      {
        const page = await workerModule.default.fetch(new Request(`https://${host}/`), {});
        assert.equal(page.status, 200, `${host}/ must stay 200`);
        assert.equal(page.headers.get('x-dasha-edge'), 'html-security');
        assert.ok((await page.text()).includes('<title>$dasha — make the timeline stranger</title>'), `${host}/ must keep its origin title`);
      }
      for (const path of ['/studio', '/studio/', '/dasha', '/dasha/', '/desk']) {
        const hop = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(hop.status, 308, `${host}${path} must 308 home`);
        assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/');
      }
      for (const path of ['/lobby', '/lobby/', '/forum', '/forum/']) {
        const hop = await workerModule.default.fetch(new Request(`https://${host}${path}`), {});
        assert.equal(hop.status, 308, `${host}${path} must 308 home`);
        assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/');
      }
      const bounties = await workerModule.default.fetch(new Request(`https://${host}/bounties`), {});
      assert.equal(bounties.status, 308, `${host}/bounties must 308 home`);
      assert.equal(bounties.headers.get('location'), 'https://www.getdasha.com/');
      const privacy = await workerModule.default.fetch(new Request(`https://${host}/privacy`), {});
      assert.equal(privacy.status, 308, `${host}/privacy must 308 home`);
      assert.equal(privacy.headers.get('location'), 'https://www.getdasha.com/');
      assert.notEqual(privacy.headers.get('x-dasha-edge'), 'privacy');
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
    assert.equal(deskPassedThrough, false, 'www /desk must not pass through Webflow');
    assert.equal(desk.status, 308, 'www /desk must 308 home');
    assert.equal(desk.headers.get('location'), 'https://www.getdasha.com/');
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
    assert.match(section, /class="dasha-slim[\s"]/, `${label} must ship the slim bar`);
    assert.doesNotMatch(section, /dasha-menu|aria-label="Menu">Menu</, `${label} must not render a Menu`);
    assert.doesNotMatch(section, /href="\/studio">Studio</, `${label} chrome must not include Studio`);
    assert.doesNotMatch(section, /href="\/forum">Forum</, `${label} chrome must hide Forum`);
    assert.doesNotMatch(section, /href="\/graph"/, `${label} chrome must not door to shelved /graph`);
    assert.doesNotMatch(section, /href="\/verse">Verse</, `${label} chrome must not include Verse`);
    assert.doesNotMatch(section, /<nav aria-label="Dasha">|href="\/chess">Chess</, `${label} chrome must not door to Chess`);
    assert.doesNotMatch(section, /\/airdrop|\/earn|\/claim|\/graph/i, `${label} chrome must not grow dead or shelved doors`);
    assert.match(section, /<header class="dasha-slim"[\s\S]*class="buy-dasha"/, `${label} must keep one acid Buy pill`);
    assert.match(section, /<footer\b[^>]*id="token"/, `${label} must keep CA + Buy in a token footer`);
    assert.match(section, /<a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a> · <a class="buy-dasha" href="https:\/\/jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump"/, `${label} site footer must keep \$dasha + Buy`);
    assert.match(section, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</, `${label} site footer must include @dash_eats`);
    assert.doesNotMatch(section.match(/<footer class="dasha-foot"[\s\S]*?<\/footer>/i)?.[0] || '', /<nav\b|href="\/chess">Chess</, `${label} site footer has no room nav`);
    assert.match(section, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/, `${label} footer must show the mint`);
    assert.match(section, /jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/, `${label} footer must keep Buy`);
    assert.match(section, /<label>Contact <input name="contact"><\/label>/, `${label} must keep contact`);
    assert.doesNotMatch(section, /href=["']\/privacy["']|>Privacy</, `${label} must not put Privacy next to contact`);
    assert.match(section, /This sends a request\. It is not a live listing\./, `${label} must not pretend a board write`);
    assert.doesNotMatch(section, /We'll add it to the board/);
    assert.doesNotMatch(section, /Payout not live/);
    assert.doesNotMatch(section, /href="\/forum">Forum</);
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
    'https://www.getdasha.com/simp',
    'https://www.getdasha.com/chess',
    'https://www.getdasha.com/faucet',
  ]) {
    assert.match(sitemapBody, new RegExp(`<loc>${loc.replaceAll('.', '\\.')}</loc>`), `${host} sitemap must list ${loc}`);
  }
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/privacy/, `${host} sitemap must not feature /privacy`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/studio/, `${host} sitemap must not feature /studio`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/dasha</, `${host} sitemap must not feature /dasha`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/learn/, `${host} sitemap must not feature /learn`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/verse/, `${host} sitemap must not feature /verse`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/how-to-buy/, `${host} sitemap must not feature leftover /how-to-buy`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/bounties/, `${host} sitemap must not feature leftover /bounties`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/capsule/, `${host} sitemap must not invent /capsule`);
  assert.doesNotMatch(sitemapBody, /lobby\.getdasha\.com\/bounties/, `${host} sitemap must not list lobby /bounties`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/forum/, `${host} sitemap must not feature leftover /forum`);
  assert.doesNotMatch(sitemapBody, /getdasha\.com\/lobby/, `${host} sitemap must not feature leftover /lobby`);
  assert.doesNotMatch(sitemapBody, /lobby\.getdasha\.com\/chess/, `${host} sitemap must not list lobby chess`);
  assert.match(sitemapBody, /\n  <url>\n    <loc>https:\/\/www\.getdasha\.com\/chess<\/loc>\n  <\/url>\n/, `${host} sitemap chess URL must keep the same indent as other locs`);
  const robots = await workerModule.default.fetch(new Request(`https://${host}/robots.txt`), {});
  const robotsBody = await robots.text();
  assert.match(robotsBody, /Allow: \/verse/, `${host} robots must allow /verse`);
  assert.doesNotMatch(robotsBody, /Allow: \/graph/, `${host} robots must not advertise shelved /graph`);
  assert.match(robotsBody, /Allow: \/learn/, `${host} robots must allow /learn`);
  assert.match(robotsBody, /Allow: \/faucet/, `${host} robots must allow /faucet`);
}

{
  assert.equal(parseVerseSubmit({ url: 'javascript:alert(1)' }).error, 'Need an http(s) link.');
  assert.equal(parseVerseSubmit({ url: 'data:text/html,x' }).error, 'Need an http(s) link.');
  assert.equal(parseVerseSubmit({ url: 'not-a-url' }).error, 'Need an http(s) link.');
  assert.equal(parseVerseSubmit({ url: 'https://dashamadness.com/more' }).url, 'https://dashamadness.com/more');
  for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
    for (const method of ['GET', 'HEAD', 'POST']) {
      for (const path of ['/verse', '/verse/', '/bible', '/dashaverse']) {
        const page = await workerModule.default.fetch(new Request(`https://${host}${path}`, { method }), {});
        assert.equal(page.status, 308, `${host} ${path} ${method} must 308 home`);
        assert.equal(page.headers.get('location'), 'https://www.getdasha.com/');
      }
    }
  }
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
{
  const oauthStartHtml = await oauthStart.text();
  assert.match(oauthStartHtml, /<a class="btn ghost" href="[^"]+">Continue with X<\/a>/);
  assert.match(oauthStartHtml, /background:#dfff00!important;color:#070608!important/);
  assert.doesNotMatch(oauthStartHtml, /\/privacy|public X identity|does not post for you/);
}
const oauthContinue = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?continue=1'), oauthEnv);
assert.equal(oauthContinue.status, 302);
assert.match(oauthContinue.headers.get('set-cookie') || '', /^__Host-dasha_x_oauth=.+Path=\/.*HttpOnly.*Secure.*SameSite=Lax/i);
assert.match(oauthContinue.headers.get('location') || '', /code_challenge_method=S256/);
const oauthGraphStart = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?return=/graph'), oauthEnv);
assert.equal(oauthGraphStart.status, 200);
assert.match(await oauthGraphStart.text(), /continue=1&amp;return=https%3A%2F%2Fwww\.getdasha\.com%2F(?!graph)|continue=1&return=https%3A%2F%2Fwww\.getdasha\.com%2F(?!graph)/);
const oauthEvilStart = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?return=https://evil.example/phish'), oauthEnv);
assert.doesNotMatch(await oauthEvilStart.text(), /evil\.example/);
const oauthGraphContinue = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/oauth/x/start?continue=1&return=/graph'), oauthEnv);
assert.equal(oauthGraphContinue.status, 302);
const oauthCookie = (oauthGraphContinue.headers.get('set-cookie') || '').match(/__Host-dasha_x_oauth=([^;]+)/)?.[1];
const oauthState = await verifyPayload(oauthEnv.LOBBY_SESSION_SECRET, oauthCookie);
assert.equal(oauthState.cont, 'https://www.getdasha.com/');
assert.match(worker, /<script nonce="\$\{scriptNonce\}">/);
assert.match(worker, /privateHtmlHeaders\(\{[\s\S]*?'Content-Type': 'text\/html; charset=utf-8'[\s\S]*?\}, scriptNonce\)/);

const privacy = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/privacy'), {});
assert.equal(privacy.status, 308);
assert.equal(privacy.headers.get('location'), 'https://www.getdasha.com/');
assert.doesNotMatch(await privacy.text(), /does not store the X access token|Dasha privacy|potter@trydemigod\.com/);
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
const publicChess = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess'), {});
assert.equal(publicChess.status, 200);
assert.equal(publicChess.headers.get('x-frame-options'), 'DENY');
assert.equal(publicChess.headers.get('strict-transport-security'), 'max-age=31536000');
assert.equal(publicChess.headers.get('x-robots-tag'), null);
const publicChessHead = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/chess', { method: 'HEAD' }), {});
assert.equal(publicChessHead.status, 200);
assert.equal(await publicChessHead.text(), '');

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
assert.equal(sitePreflight.headers.get('access-control-max-age'), '86400', 'chess/lobby POST preflight must cache so a think-time move is not OPTIONS+POST');

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
      assert.match(html, /class="dasha-slim"/, `${host} / must ship slim chrome`);
      assert.match(html, /class="dasha-crop"/, `${host} / must ship crop marks`);
      assert.match(html, /class="buy-dasha"/, `${host} / must keep Buy`);
      assert.doesNotMatch(html, /id=["']dasha-lock["']/, `${host} / must not invent #dasha-lock`);
      assert.doesNotMatch(html, /id="dasha-simp-board"|class="dasha-quiz"|simp-board\.js/, `${host} / first paint is not a quiz carnival`);
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
        assert.equal(lobby.status, 308, `${host} ${path} must 308 home`);
        assert.equal(lobby.headers.get('location'), 'https://www.getdasha.com/');
      }
    }
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const mint = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  const buy = 'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
  const webflowHome = `<!doctype html><html class="w-mod-js"><title>$dasha — make the timeline stranger</title>
<link href="https://cdn.prod.website-files.com/img/favicon.ico" rel="shortcut icon" type="image/x-icon"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"></script>
<script>WebFont.load({google:{families:["Exo:400","Bangers:regular","Raleway:400"]}});</script>
<!-- earlier unrelated -->
<!-- DashaNav stays on lobby/studio/desk -->
<style>
/* foo */
.keep-prior{border:1px solid red}
/* reduced-motion */
@media(prefers-reduced-motion:reduce){.keep-prior{scroll-behavior:auto}}
/* Home first paint is Buy $dasha. DashaNav stays on lobby/studio/desk. */
:root{--ink:#070608;--paper:#f4eddb;--acid:#dfff00;--hot:#ff3b81;--violet:#7c4dff;--hot-deep:#c21f5a}
.simp-board{display:grid}.simp-row{display:grid}.simp-rank{font-size:42px}
.dasha{min-height:100vh;background:radial-gradient(circle at 80% 5%,rgba(124,77,255,.35),transparent 32rem),var(--ink)}
.body{background-color:#1f041c}
.dasha-hero{min-height:640px}
#dasha-home h1{color:var(--ink,#F2EDE7)}
</style>
<body class="body"><nav class="dasha-nav"><a href="/studio">Studio</a></nav><div id="dasha-home" class="dasha-root"><div class="w-embed w-script">
<script>(function(){function patch(){try{document.querySelectorAll('a[href*="/studio"]').forEach(function(a){if(a.classList.contains('buy-dasha'))return;var p=new URLSearchParams();p.set('src','home');a.setAttribute('href','/studio#'+p.toString());});}catch(e){}}patch();})();</script>
<a class="skip-link" href="#content">Skip to content</a>
<section id="dasha-home-cta" aria-label="Simp"><style>#dasha-home-cta{min-height:100vh;font:16px/1.45 system-ui,sans-serif}</style><h1>$dasha</h1><p>Take Simp.</p><p><a href="/simp">Simp</a></p></section>
<main class="dasha" id="top">
<nav class="nav wrap"><a href="/studio">Studio</a><a href="#token">CA 53ux…pump</a><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a><a href="https://lobby.getdasha.com/forum">Forum</a></nav>
<header class="dasha-hero wrap" id="content"><h1>It's time $dasha.</h1><p class="price">$0.00</p><div class="poster"><span class="sticker">CMON</span><div class="poster-grid" aria-label="Open an editable Dasha Studio starter"><a class="poster-tile" href="/studio#look=poster&amp;format=square&amp;line=How%20u%20crying">How u crying at the casino</a></div></div><p class="actions"><a href="/studio">Open Studio →</a><a href="/lobby">Open lobby →</a></p></header>
<section id="token"><code id="mint">${mint}</code><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a></section>
<footer><div class="wrap"><p><a href="/studio">Studio</a> · <a href="/chess">Chess</a> · <a href="/dasha">Desk</a> · <a href="/bounties">Bounties</a> · <a href="/how-to-buy">How to buy</a> · <a href="https://github.com/Uuriko/dasha-desk">Source ↗</a></p></div></footer>
<script>(()=>{const href="/studio#look=ticket";document.querySelectorAll('a[href^="/studio"],a[href*="/studio#"]');})();</script>
</main>
</div></div></body></html>`;
  const homeHero = html => {
    const match = String(html).match(/<header\b[^>]*\bdasha-hero\b[^>]*>[\s\S]*?<\/header>/i);
    assert.ok(match, 'home must keep the Webflow hero');
    return match[0];
  };
  const assertHomeCalmCss = (html, label) => {
    const css = String(html).match(/<style id="dasha-home-calm">([\s\S]*?)<\/style>/i)?.[1] || '';
    assert.ok(css, `${label} must inject #dasha-home-calm`);
    assert.match(css, /main\.dasha>nav\.nav/, `${label} must hide main.dasha nav`);
    assert.match(css, /main\.dasha>nav\.nav\.wrap/, `${label} must hide published nav.wrap`);
    assert.match(css, /\.dasha>nav\.nav/, `${label} must hide embed nav`);
    assert.match(css, /\.dasha-nav/, `${label} must hide Designer DashaNav`);
    assert.match(css, /\.dasha-hero \.poster/, `${label} must hide hero poster`);
    assert.match(css, /\.dasha-hero \.hero-still/, `${label} must keep stills out of the hero`);
    assert.match(css, /\.dasha-hero \.price/, `${label} must hide hero price`);
    assert.match(css, /\.dasha-hero \.actions a:not\(\.buy-dasha\)/, `${label} must hide non-Buy hero actions`);
    assert.match(css, /\.dasha-hero \.actions \.pill:not\(\.buy-dasha\)/, `${label} must hide non-Buy hero pills`);
    assert.match(css, /github\.com\/Uuriko\/dasha-desk/, `${label} must hide desk source hrefs`);
    assert.match(css, /a\[href\^="\/studio#"\]/, `${label} must hide studio-hash CTAs`);
    assert.match(css, /footer:not\(\.dasha-foot\)/, `${label} must hide leftover Studio/How to buy/Desk footer`);
    assert.match(css, /content-visibility:\s*auto/, `${label} must skip paint on below-fold rooms`);
    assert.match(css, /@view-transition\{navigation:auto\}/, `${label} home gets the ink cut`);
    assert.match(css, /animation-duration:200ms/, `${label} ink cut stays in the 160–240ms window`);
    assert.match(css, /content:"\[01\]"/, `${label} must number the hero room`);
    assert.match(css, /#grwm::before\{content:"\[02\]"/, `${label} must number GRWM`);
    assert.match(css, /#dasha-tape::before\{content:"\[03\]"/, `${label} must number the live chart`);
    assert.match(css, /#stills::before\{content:"\[04\]"/, `${label} must number the stills strip`);
    assert.match(css, /#simp::before\{content:"\[05\]"/, `${label} must number the board room`);
    assert.match(css, /#simp,#simp\.is-in\{opacity:1;transform:none\}/, `${label} #simp Take Quiz must not fade to invisible`);
    assert.match(css, /#chess::before\{content:"\[06\]"/, `${label} must number the chess room`);
    assert.match(css, /#faucet::before\{content:"\[07\]"/, `${label} must number the faucet room`);
    assert.match(css, /#token::before\{content:"\[08\]"/, `${label} must number the mint band`);
    assert.match(css, /#lobby,#remix,#oss,#voice/, `${label} must hide leftover carnival`);
    assert.match(css, /scroll-behavior:auto/, `${label} must kill smooth-scroll`);
    assert.match(css, /\.dasha\{overflow-x:visible/, `${label} must drop the overflow-x trap`);
    assert.match(css, /view-timeline:none/, `${label} must kill the #token view-timeline toy`);
    assert.doesNotMatch(css, /\.buy-dasha\{display:none/, `${label} must not hide Buy`);
    assert.match(css, /a\.pill\.primary,a\.buy-dasha,.w-button[\s\S]*?background:#dfff00!important;color:#070608!important/, `${label} Buy lock is acid fill + ink type`);
    assert.match(css, /a\.btn\.ghost[\s\S]*?color:#f4eddb!important;border:1px solid #f4eddb!important/, `${label} ghost buttons are paper on ink`);
    assert.match(css, /a\.btn:disabled[^{]*\{opacity:\.7/, `${label} disabled type stays readable`);
    assert.equal([...String(html).matchAll(/id=["']dasha-home-calm["']/g)].length, 1, `${label} must inject calm CSS once`);
  };
  const assertHomeBuyPill = (scope, label) => {
    const pills = [...scope.matchAll(/<a\b[^>]*\bbuy-dasha\b[^>]*>[\s\S]*?<\/a>/gi)].map(m => m[0]);
    assert.equal(pills.length, 1, `${label} must have one Buy $dasha pill`);
    assert.match(pills[0], /href="https:\/\/jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump"/, `${label} Buy pill must use the exact Jupiter URL`);
    assert.match(pills[0], />Buy \$dasha ↗</, `${label} Buy pill must say Buy $dasha`);
    assert.doesNotMatch(scope, /payTo/, `${label} must not invent payTo`);
  };
  const assertHomeFirst = (html, label) => {
    const hero = homeHero(html);
    assertHomeCalmCss(html, label);
    assertHomeBuyPill(hero, `${label} hero`);
    assert.doesNotMatch(html, /id=["']dasha-lock["']/, `${label} must not overlay a Webflow hero with #dasha-lock`);
    assert.doesNotMatch(html, /id=["']dasha-home-cta["']/, `${label} must drop the 100vh decoy`);
    assert.doesNotMatch(html, /Take Simp\./, `${label} must drop decoy copy`);
    assert.doesNotMatch(html, /#1[fF]041[cC]/, `${label} must replace maroon #1F041C`);
    assert.match(hero, /<h1>It's time \$dasha\.<\/h1>/, `${label} must keep the headline`);
    assert.equal([...hero.matchAll(/<h1\b/g)].length, 1, `${label} hero must have one h1`);
    assert.doesNotMatch(hero, /class="poster"|poster-grid|poster-tile/, `${label} must strip poster collage tiles`);
    assert.match(hero, /class="price"/, `${label} must keep the price in the DOM`);
    assert.doesNotMatch(hero, /Open Studio →/, `${label} must strip leftover Studio actions`);
    assert.doesNotMatch(html, /class="dasha-nav"|DashaNav stays/, `${label} must strip Designer DashaNav and its comments`);
    assert.match(html, /\/\* foo \*\//, `${label} must keep earlier CSS comments`);
    assert.match(html, /\.keep-prior\{border:1px solid red\}/, `${label} must keep CSS after an earlier comment`);
    assert.match(html, /\/\* reduced-motion \*\//, `${label} must keep the reduced-motion comment`);
    assert.match(html, /<!-- earlier unrelated -->/, `${label} must keep earlier HTML comments`);
    assert.doesNotMatch(html, /href="\/studio"|How to buy/, `${label} rewritten home must not include href="/studio" or How to buy`);
    assert.doesNotMatch(html, /href="\/dasha"|href="\/bounties"|href="\/how-to-buy"/, `${label} must strip leftover Desk/Bounties/How-to-buy hrefs`);
    assert.doesNotMatch(html, /<footer(?![^>]*dasha-foot)\b/, `${label} must keep only .dasha-foot`);
    assert.doesNotMatch(html, /a\[href\*="\/studio"\]|p\.set\(\s*['"]src['"]/, `${label} must strip studio patch scripts`);
    assert.match(html, new RegExp(`id="token"[\\s\\S]*${mint}[\\s\\S]*buy-dasha`), `${label} must keep CA + Buy in #token`);
    assert.match(html, /id="dasha-tape"/, `${label} must keep a live chart room`);
    assert.match(html, /id="dasha-tape-embed"/, `${label} chart uses the official pair embed`);
    assert.match(html, /dexscreener\.com\/solana\/9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7\?embed=1/, `${label} chart embeds this pair only`);
    assert.match(html, /id="simp"/, `${label} must keep a #simp room`);
    assert.match(html, /id="dasha-simp-board"/, `${label} #simp remounts the pretty board`);
    assert.match(html, /id="dasha-simp-board"[\s\S]*data-dasha-take-quiz[^>]*>Take Quiz</, `${label} #simp first-paints Take Quiz`);
    assert.match(html, /<button type="button" class="simp-quiz-go" data-dasha-take-quiz>Take Quiz<\/button>/, `${label} Take Quiz is a static button, not a /simp hop`);
    assert.doesNotMatch(html, /href="\/simp">Take the quiz|href="\/simp">Take Quiz/, `${label} must not inject a Take the quiz link`);
    assert.doesNotMatch(hero, /Take Quiz|data-dasha-take-quiz/, `${label} hero first paint stays headline + Buy`);
    assert.match(html, /simp-board\.js/, `${label} must load the board client below the hero`);
    assert.match(html, /id="chess"/, `${label} must embed chess on home`);
    assert.match(html, /id="board"/, `${label} home chess must ship the 64-square board`);
    assert.match(html, /id="gate-action"/, `${label} home chess must ship Play`);
    assert.equal([...html.matchAll(/id=["']chess["']/g)].length, 1, `${label} must mount chess once`);
    assert.equal([...html.matchAll(/id=["']board["']/g)].length, 1, `${label} must mount one chess board`);
    assert.match(html, /id="faucet"/, `${label} must keep a #faucet room`);
    assert.match(html, /id="dasha-faucet"/, `${label} #faucet remounts the live faucet toy`);
    assert.match(html, /client\/faucet\.js/, `${label} must load faucet.js`);
    assert.match(html, /client\/faucet\.png/, `${label} must reuse faucet.png`);
    assert.ok(html.indexOf('dasha-hero') < html.indexOf('dasha-tape'), `${label} chart lives below the hero`);
    assert.ok(html.indexOf('dasha-tape') < html.indexOf('id="stills"'), `${label} stills live below the chart`);
    assert.ok(html.indexOf('id="stills"') < html.indexOf('dasha-simp-board'), `${label} stills live above the board`);
    assert.match(html, /class="stills-grid"/, `${label} stills are a quiet first-party flick`);
    assert.match(html, /data-quiz="scary-cap"/, `${label} SCARY still seeds the cap question`);
    {
      const stills = html.match(/<section id="stills"[\s\S]*?<\/section>/)?.[0] || '';
      assert.doesNotMatch(stills, /photo\/(?:archive|sweet|public|chart|media)\.jpg/, `${label} stills skip leftover frames`);
      assert.doesNotMatch(stills, /pbs\.twimg|upload\.wikimedia/, `${label} stills are first-party`);
      for (const name of ['scary', 'berlinale', 'cotton', 'hero', 'pony', 'press', 'bull', 'weekend', 'profile']) {
        assert.match(stills, new RegExp(`/simp/photo/${name}\\.jpg`), `${label} stills include ${name}`);
      }
    }
    assert.match(html, /id="grwm"/, `${label} GRWM sits after the hero`);
    assert.ok(html.indexOf('id="grwm"') < html.indexOf('id="dasha-tape"'), `${label} GRWM sits before the chart`);
    assert.match(html, /poster="\/client\/grwm\.jpg"/, `${label} GRWM uses the first-party poster`);
    assert.match(html, /src="\/client\/grwm-loop\.mp4"/, `${label} GRWM living poster is the muted loop`);
    assert.match(html, /<video muted loop playsinline autoplay poster="\/client\/grwm\.jpg"/, `${label} living poster autoplays muted only`);
    {
      const grwm = html.match(/<section id="grwm"[\s\S]*?<\/section>/)?.[0] || '';
      assert.match(grwm, /v\.src='\/client\/grwm\.mp4'/, `${label} tap loads the full first-party file`);
      assert.doesNotMatch(grwm, /twimg|@dash_eats|from X/i, `${label} GRWM has no tweet chrome`);
      assert.doesNotMatch(grwm, /<video[^>]+src="\/client\/grwm\.mp4"[^>]*autoplay/, `${label} must not autoplay the 7:14 with sound`);
    }
    assert.match(html, /\/simp\/photo\/scary\.jpg/, `${label} stills include the SCARY cap`);
    assert.ok(html.indexOf('dasha-tape') < html.indexOf('dasha-simp-board'), `${label} chart lives just above the board`);
    assert.ok(html.indexOf('dasha-simp-board') < html.indexOf('id="chess"'), `${label} chess lives after the quiz board`);
    assert.ok(html.indexOf('id="chess"') < html.indexOf('dasha-faucet'), `${label} chess lives above faucet`);
    assert.ok(html.indexOf('dasha-faucet') < html.indexOf('id="token"'), `${label} faucet lives before the mint band`);
    assert.doesNotMatch(hero, /id="dasha-simp-board"|simp-board\.js|class="dasha-quiz"|dasha-faucet|faucet\.js|dasha-tape|dexscreener|id="chess"|id="board"|gate-action|id="stills"|stills-grid|id="grwm"/, `${label} hero first paint is not the board, faucet, chart, chess, stills, or GRWM`);
    assert.doesNotMatch(html, /client\/lobby\.js|id="dasha-lobby"/, `${label} must not mount chat`);
    assert.doesNotMatch(html, /not an airdrop|free money|official faucet/i, `${label} must not invent faucet disclaimer copy`);
    assert.doesNotMatch(html, /dasha-x-gate|CONNECT X\?|First visit|openHomeGate/i, `${label} must not paint a first-visit X gate`);
    assert.equal([...html.matchAll(/class="dasha-quiz"/g)].length, 0, `${label} must not mount quiz chrome on home`);
    assert.match(html, /id="dasha-home-reveal"/, `${label} must reveal rooms once`);
    assert.doesNotMatch(html, /WebFont\.load|webfont\.js/, `${label} must drop WebFont.load`);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/, `${label} must drop Google Fonts preconnect`);
    assert.doesNotMatch(html, /Exo|Bangers|Raleway/, `${label} must drop Exo\/Bangers\/Raleway`);
    assert.doesNotMatch(html, /href=["']https:\/\/lobby\.getdasha\.com\/forum/, `${label} must drop leftover lobby-host Forum hops`);
    assert.doesNotMatch(html, /href="\/forum">Forum</, `${label} chrome must hide Forum`);
    assert.doesNotMatch(homeHero(html), /href="\/forum"/, `${label} hero must not put Forum on first paint`);
    assert.doesNotMatch(html, /--hot-deep|rgba\(124,\s*77,\s*255/, `${label} must drop the violet wash and --hot-deep`);
    assert.doesNotMatch(hero, /system-ui/, `${label} hero must not use system-ui`);
    assert.doesNotMatch(hero, /<form\b|wallet-connect|payTo|\/oauth|score=/i, `${label} first paint must not mount forms or OAuth`);
    assert.doesNotMatch(html.replace(/class="simp-(?:lede|quiz-go)"/g, ''), /class="simp-/, `${label} home first paint only ships the Take Quiz entry`);
    const lowerNav = html.match(/<nav class="nav wrap">[\s\S]*?<\/nav>/i)?.[0] || '';
    assert.doesNotMatch(lowerNav, /href="\/studio">Studio</, `${label} lower nav must not include Studio`);
    assert.doesNotMatch(lowerNav, /href="\/how-to-buy"/, `${label} lower nav must not include How to buy`);
    assert.doesNotMatch(lowerNav, /href="\/simp"/, `${label} lower nav must not door to Simp`);
    assert.doesNotMatch(lowerNav, /href="\/chess">Chess</, `${label} lower nav must not door to Chess`);
    assert.doesNotMatch(lowerNav, /href="\/graph"/, `${label} lower nav must not door to shelved /graph`);
    assert.doesNotMatch(lowerNav, /href="\/faucet"/, `${label} lower nav must not door to Faucet`);
    assert.doesNotMatch(lowerNav, /href="\/dasha"/, `${label} lower nav must not door to Desk`);
    assert.doesNotMatch(lowerNav, /href="\/verse">Verse</, `${label} lower nav must not include Verse`);
    assert.doesNotMatch(lowerNav, /href="\/bounties"/, `${label} lower nav must not door to Bounties`);
    assert.doesNotMatch(lowerNav, /#token|buy-dasha/i, `${label} lower nav must not grow a Buy pill`);
    assert.doesNotMatch(lowerNav, /href="\/forum">Forum</, `${label} lower nav must hide Forum`);
    assert.doesNotMatch(html, /href="\/forum"/, `${label} Forum stays out of the footer`);
    assert.doesNotMatch(html.match(/<footer class="dasha-foot">[\s\S]*?<\/footer>/)?.[0] || '', /<nav\b|href="\/chess">Chess</, `${label} site footer has no room nav`);
    assert.doesNotMatch(html, /href=["']https:\/\/lobby\.getdasha\.com\/chess/, `${label} leftover Chess hrefs must be same-origin`);
    assert.match(html, /\.simp-row\{display:grid;grid-template-columns:3\.2rem minmax\(0,1fr\) 3\.2rem/, `${label} must ship three-column board CSS`);
    assert.doesNotMatch(html, /\.simp-(badge|evidence|open|privacy|basis|badges|season|me)\b/, `${label} must drop leftover board soup CSS`);
    return hero;
  };
  const injected = rewriteHomeFirstViewport(stripHomeSimpBoard(webflowHome));
  assertHomeFirst(injected, 'rewrite');
  assert.doesNotMatch(injected, /href="\/studio"/, 'rewritten home string must not include href="/studio"');
  assert.doesNotMatch(injected, /How to buy/, 'rewritten home string must not include How to buy');
  {
    const commentOrder = `<!doctype html><html><head><style>
/* foo */
.keep-prior{border:1px solid red}
/* Home first paint is Buy $dasha. DashaNav stays on lobby/studio/desk. */
.dasha-hero{min-height:640px}
</style></head><body><!-- earlier unrelated --><!-- DashaNav stays on lobby/studio/desk --><header class="dasha-hero"><h1>It's time $dasha.</h1><p class="actions"><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a></p></header><section id="token"><code id="mint">${mint}</code></section></body></html>`;
    const kept = rewriteHomeFirstViewport(stripHomeSimpBoard(commentOrder));
    assert.match(kept, /\/\* foo \*\//, 'earlier /* foo */ must survive');
    assert.match(kept, /\.keep-prior\{border:1px solid red\}/, 'CSS after an earlier comment must survive');
    assert.match(kept, /<!-- earlier unrelated -->/, 'earlier HTML comment must survive');
    assert.doesNotMatch(kept, /DashaNav stays/, 'only the DashaNav comment is stripped');
    assert.doesNotMatch(kept, /href="\/studio"|How to buy/, 'comment-order fixture must not grow leftover rooms');
  }
  assert.match(injected, /class="dasha-slim[\s"]/, 'home rewrite must add the slim bar');
  assert.match(injected, /class="dasha-crop"/, 'home rewrite must add crop marks');
  assert.doesNotMatch(injected, /dasha-menu|aria-label="Menu">Menu</, 'home rewrite must not render a Menu');
  assert.doesNotMatch(injected.match(/<header class="dasha-slim">[\s\S]*?<\/header>/)?.[0] || '', /<nav\b|href="\/chess"|href="\/studio"|href="\/how-to-buy"|href="\/simp"|href="\/dasha"|href="\/bounties"|href="\/faucet"|href="\/forum"/, 'home slim bar is wordmark + Buy only');
  assert.doesNotMatch(injected.match(/<footer class="dasha-foot">[\s\S]*?<\/footer>/)?.[0] || '', /<nav\b|href="\/chess"|href="\/studio"|href="\/how-to-buy"|href="\/simp"|href="\/dasha"|href="\/bounties"|href="\/faucet"|href="\/forum"/, 'home footer is $dasha · Buy · @dash_eats');
  assert.doesNotMatch(injected.match(/<header class="dasha-slim">[\s\S]*?<\/header>/)?.[0] || '', /\/airdrop|\/graph/, 'home slim bar must hide dead and shelved doors');
  assert.doesNotMatch(injected, /dasha-next|Next up/, 'next-up stays off home first paint');
  assert.doesNotMatch(injected, /dasha-dance/, 'home rewrite must not stuff the dancer into the first viewport');
  assert.match(injected, /<a class="skip-link" href="#content">Skip to content<\/a>/, 'Designer skip → #content must stay when the hero is #content');
  assert.match(injected, /id="dasha-home"/, 'live Webflow wrapper id=dasha-home must not block the hero');
  assert.match(injected, new RegExp(mint));
  assert.equal(rewriteHomeFirstViewport(injected), injected, 'second pass must not duplicate calm CSS, Buy pill, board mount, or reveal');
  {
    const leftoverBoard = rewriteHomeFirstViewport(`<!doctype html><html><body><header class="dasha-hero"><h1>It's time $dasha.</h1><p class="actions"><a class="buy-dasha" href="${buy}">Buy $dasha</a></p></header><div id="simp"><div id="dasha-simp-board" data-simp-api="https://lobby.getdasha.com"><noscript>Needs JavaScript.</noscript></div></div></body></html>`);
    assert.match(leftoverBoard, /<button type="button" class="simp-quiz-go" data-dasha-take-quiz>Take Quiz<\/button>/, 'empty leftover #simp board still first-paints Take Quiz');
    assert.doesNotMatch(leftoverBoard, /href="\/simp">Take the quiz/);
  }
  assert.equal([...injected.matchAll(/id=["']dasha-lock["']/g)].length, 0);
  const alreadyBuy = rewriteHomeFirstViewport(stripHomeSimpBoard(webflowHome.replace(
    '<p class="actions"><a href="/studio">Open Studio →</a><a href="/lobby">Open lobby →</a></p>',
    `<p class="actions"><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a></p>`,
  )));
  assertHomeBuyPill(homeHero(alreadyBuy), 'existing Buy pill');
  const noHero = rewriteHomeFirstViewport(stripHomeSimpBoard(`<!doctype html><html><body><section id="token"><code id="mint">${mint}</code><a class="pill primary buy-dasha" href="${buy}">Buy $dasha ↗</a></section></body></html>`));
  assert.doesNotMatch(noHero, /id=["']dasha-lock["']/, 'no-hero home must not invent #dasha-lock');
  assertHomeCalmCss(noHero, 'no-hero');
  assert.match(noHero, /class="dasha-slim"/, 'no-hero home still gets slim chrome');
  assert.match(noHero, /class="dasha-crop"/, 'no-hero home still gets crop marks');
  assert.match(noHero, /class="buy-dasha"/, 'no-hero home still has Buy');
  assert.doesNotMatch(noHero, /id="dasha-simp-board"/, 'no-hero home must not invent a quiz');
  assert.match(noHero, new RegExp(`id="token"[\\s\\S]*${mint}[\\s\\S]*buy-dasha`), 'no-hero home must keep #token');
  assert.equal(rewriteHomeFirstViewport(noHero), noHero, 'no-hero second pass must be idempotent');
  const nativeFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(webflowHome, { headers: { 'Content-Type': 'text/html; charset=utf-8', Link: '<https://fonts.googleapis.com>; rel=preconnect, <https://www.getdasha.com/favicon.ico>; rel=preload; as=image' } });
    for (const host of ['www.getdasha.com', 'getdasha.com']) {
      const home = await workerModule.default.fetch(new Request(`https://${host}/`), {});
      const html = await home.text();
      assertHomeFirst(html, `${host} /`);
      assert.doesNotMatch(home.headers.get('link') || '', /fonts\.googleapis|fonts\.gstatic/, `${host} / must drop Google Fonts Link hints`);
      assert.match(home.headers.get('link') || '', /favicon\.ico/, `${host} / must keep unrelated Link hints`);
      assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 0, `${host} / must not keep Privacy in chrome`);
      assert.match(html, /<link href="\/favicon\.ico" rel="shortcut icon"/);
      assert.match(html, new RegExp(mint), `${host} / must keep the mint string`);
      assert.equal([...html.matchAll(/id=["']dasha-lock["']/g)].length, 0);
    }
    const studio = await workerModule.default.fetch(new Request('https://www.getdasha.com/studio'), {});
    assert.equal(studio.status, 308, '/studio must 308 home');
    assert.equal(studio.headers.get('location'), 'https://www.getdasha.com/');
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
      assert.equal(page.status, 308, `www ${path} must 308 home`);
      assert.equal(page.headers.get('location'), 'https://www.getdasha.com/');
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
  assert.doesNotMatch(linked, /href=["']\/privacy["']|>Privacy</);
  assert.equal(ensurePrivacyLink(linked), linked, 'Privacy strip must be idempotent');
  for (const href of ['/studio', '/lobby', 'https://lobby.getdasha.com/forum', 'https://lobby.getdasha.com/chess', '/dasha', '/bounties', '/how-to-buy', 'https://github.com/Uuriko/dasha-desk']) {
    assert.ok(linked.includes(`href="${href}"`), `home footer must keep ${href}`);
  }
  assert.match(linked, /How to buy<\/a> · /);
  const leftoverPrivacy = ensurePrivacyLink(`${homeKeep}<p class="privacy">Wallet address and balance are checked for access, then discarded.</p><a href="/privacy">Privacy</a><a href="/legal">Legal</a>`);
  assert.doesNotMatch(leftoverPrivacy, /href=["']\/(?:privacy|legal)["']|>Privacy<|>Legal<|class="privacy"/);
  assert.match(linked, /:root\{/);
  assert.match(linked, /\.dasha\{/);
  assert.match(linked, /\.pill\{/);
  assert.match(linked, /\.price\{/);
  assert.match(linked, /\.contract\{/);
  assert.match(linked, /\.spark\{/);
  assert.match(linked, /id="token"/);
  assert.doesNotMatch(linked, /\.simp-/);
  const deskNav = '<nav class="dgnav" aria-label="Dasha"><div class="dgnav-in"><a class="dgbrand" href="/">$DASHA</a><a class="dgcta" href="/studio">Make a meme →</a></div></nav>';
  const deskLinked = ensurePrivacyLink(`${deskNav}<a href="/privacy">Privacy</a>`);
  assert.doesNotMatch(deskLinked, /href=["']\/privacy["']|>Privacy</);
  assert.match(deskLinked, /href="\/studio"/);
  assert.equal(ensurePrivacyLink(deskLinked), deskLinked);
  assert.equal(ensurePrivacyLink('<html><title>x</title></html>'), '<html><title>x</title></html>', 'no footer/nav needle must not invent chrome');
  const liveHowtoFooter = '<footer>\n    <p><a href="https://www.getdasha.com/">Home</a> · <a href="https://www.getdasha.com/studio">Studio</a> · <a href="https://lobby.getdasha.com/chess">Chess</a> · <a href="https://www.getdasha.com/dasha">Desk</a> · <a href="/privacy">Privacy</a></p>\n  </footer>';
  const howtoLinked = ensurePrivacyLink(liveHowtoFooter);
  assert.doesNotMatch(howtoLinked, /href=["']\/privacy["']|>Privacy</);
  assert.match(howtoLinked, /Desk<\/a><\/p>/);
  assert.equal(ensurePrivacyLink(howtoLinked), howtoLinked, 'howto footer Privacy strip must be idempotent');
  assert.doesNotMatch(howtoLinked, /<nav/i, 'howto footer strip must not invent a nav');
  const liveChessNav = '<header class="top wrap"><a class="brand" href="https://www.getdasha.com/" aria-label="Dasha home">$<span>DASHA</span></a><nav class="top-links" aria-label="Chess"><a class="back" href="https://www.getdasha.com/">Home</a><a class="back buy" id="buy-dasha" href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&amp;buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump" target="_blank" rel="noopener noreferrer" aria-label="Buy $dasha on Jupiter using the exact mint">Buy $dasha ↗</a></nav></header>';
  const chessLinked = ensurePrivacyLink(`${liveChessNav}<a href="/privacy">Privacy</a>`);
  assert.doesNotMatch(chessLinked, /href=["']\/privacy["']|>Privacy</);
  assert.match(chessLinked, /id="buy-dasha"/);
  assert.doesNotMatch(chessLinked, /<footer/i, 'chess nav strip must not invent a footer');
  assert.equal(ensurePrivacyLink(chessLinked), chessLinked, 'chess nav Privacy strip must be idempotent');
  for (const host of ['www.getdasha.com', 'lobby.getdasha.com']) {
    const howto = await workerModule.default.fetch(new Request(`https://${host}/how-to-buy`), {});
    assert.equal(howto.status, 308, `${host} /how-to-buy 308s home`);
    assert.equal(howto.headers.get('location'), 'https://www.getdasha.com/');
    const chess = await workerModule.default.fetch(new Request(`https://${host}/chess`), {});
    assert.equal(chess.status, 200, `${host} /chess must stay 200`);
    assert.equal(chess.headers.get('x-dasha-edge'), 'chess');
    const chessHtml = await chess.text();
    assert.equal([...chessHtml.matchAll(/href=["']\/privacy["']/g)].length, 0, `${host} /chess must not keep Privacy in chrome`);
    assert.match(chessHtml, /class="dasha-slim[\s"]/);
    assert.match(chessHtml, /class="dasha-word" href="https:\/\/www\.getdasha\.com\/" aria-label="Dasha home">/);
    assert.doesNotMatch(chessHtml, /href="\/verse">Verse</);
    assert.doesNotMatch(chessHtml, /href="\/chess">Chess</, `${host} /chess chrome must not door to itself`);
    assert.doesNotMatch(chessHtml, /dasha-menu|aria-label="Menu">Menu</, `${host} /chess must not render a Menu`);
    assert.doesNotMatch(chessHtml, /href="\/graph"/);
    assert.doesNotMatch(chessHtml, /\/airdrop|\/earn|\/claim/, `${host} /chess chrome must not grow dead doors`);
    assert.doesNotMatch(chessHtml, /href="\/forum">Forum</, `${host} /chess chrome must hide Forum`);
    assert.doesNotMatch(chessHtml, /href="\/studio"|href="\/how-to-buy"/, `${host} /chess chrome has no leftover rooms`);
    assert.doesNotMatch(chessHtml, /class="(?:brand|back)" href="\/"/);
    assert.match(chessHtml, /id="buy-dasha"/);
    assert.match(chessHtml, /Buy \$dasha ↗/);
    assert.doesNotMatch(chessHtml, /class="privacy"|Wallet address and balance are checked for access/);
    assert.match(chessHtml, /<link rel="canonical" href="https:\/\/www\.getdasha\.com\/chess">/);
    assert.match(chessHtml, /<footer class="dasha-foot wrap"><p><a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a> · <a class="buy-dasha"/);
    assert.match(chessHtml, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</);
    assert.doesNotMatch(chessHtml, /<nav aria-label="Dasha">|<nav aria-label="Rooms">/, `${host} /chess must not render a room list`);
  }
  const liveLobbyNav = '<nav class="nav shell" aria-label="Lobby navigation"><a class="brand" href="https://www.getdasha.com/">$<span>DASHA</span></a><a class="back" href="https://www.getdasha.com/">← Home</a></nav>';
  const lobbyLinked = ensurePrivacyLink(`${liveLobbyNav}<a href="/privacy">Privacy</a>`);
  assert.doesNotMatch(lobbyLinked, />Privacy</);
  assert.doesNotMatch(lobbyLinked, /href="\/privacy"/);
  assert.match(lobbyLinked, /<a class="brand" href="https:\/\/www\.getdasha\.com\/">\$<span>DASHA<\/span><\/a>/);
  assert.match(lobbyLinked, /<a class="back" href="https:\/\/www\.getdasha\.com\/">← Home<\/a>/);
  assert.doesNotMatch(lobbyLinked, /<footer/i, 'lobby nav strip must not invent a footer');
  assert.equal(ensurePrivacyLink(lobbyLinked), lobbyLinked, 'lobby nav Privacy strip must be idempotent');
  {
    const forum = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/forum'), {});
    assert.equal(forum.status, 308, 'lobby /forum 308s home');
    assert.equal(forum.headers.get('location'), 'https://www.getdasha.com/');
  }
  const lobbyHead = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/forum', { method: 'HEAD' }), {});
  assert.equal(lobbyHead.status, 308, 'lobby HEAD /forum 308s home');
  assert.equal(lobbyHead.headers.get('location'), 'https://www.getdasha.com/');
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
  const remappedRooms = rewriteLeftoverLobbyHrefs('<footer><a href="https://lobby.getdasha.com/chess">Chess</a> · <a href="https://lobby.getdasha.com/forum">Forum</a></footer><script src="https://lobby.getdasha.com/client/lobby.js"></script>');
  assert.match(remappedRooms, /href="\/chess">Chess</);
  assert.match(remappedRooms, /href="\/forum">Forum</);
  assert.doesNotMatch(remappedRooms, /href=["']https:\/\/lobby\.getdasha\.com\/(?:chess|forum)/);
  assert.match(remappedRooms, /src="https:\/\/lobby\.getdasha\.com\/client\/lobby\.js"/);
  const liveScanHomeFooter = '<footer><div class="wrap"><p><a href="/studio">Studio</a> · <a href="/lobby">Lobby</a> · <a href="https://lobby.getdasha.com/chess">Chess</a> · <a href="/dasha">Desk</a> · <a href="/bounties">Bounties</a> · <a href="/how-to-buy">How to buy</a> · <a href="/privacy">Privacy</a> · <a href="https://x.com/dash_eats" target="_blank" rel="noopener noreferrer">@dash_eats ↗</a> · <a href="https://github.com/Uuriko/dasha-desk" target="_blank" rel="noopener noreferrer">Source ↗</a></p></div></footer>';
  const remappedLiveHome = rewriteLeftoverLobbyHrefs(liveScanHomeFooter);
  assert.match(remappedLiveHome, /href="\/chess">Chess</);
  assert.doesNotMatch(remappedLiveHome, /lobby\.getdasha\.com\/chess/);
  assert.match(remappedLiveHome, /href="\/lobby">Lobby</);
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
  assert.match(studioNavFixed, /class="dgcta" href="https:\/\/jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump">Buy \/ verify →</);
  assert.match(studioNavFixed, /jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/, 'Studio body Jupiter door must stay');
  assert.doesNotMatch(studioNavFixed, /dgcta[^>]*#token|#token[^>]*Buy \/ verify/);
  assert.equal(rewriteStudioBuyVerifyHref(studioNavFixed), studioNavFixed, 'studio Buy/verify rewrite must be idempotent');
  const studioPage = rewriteStudioBuyVerifyHref('<!doctype html><html><head><title>Studio</title></head><body><button class="w-button">Go</button></body></html>');
  assert.match(studioPage, /id="dasha-btn-lock"/, 'studio pages get the button contrast lock');
  assert.match(studioPage, /background:#dfff00!important;color:#070608!important/);
  assert.equal(rewriteStudioBuyVerifyHref(studioPage), studioPage, 'studio button lock inject must be idempotent');
  assert.equal(
    rewriteStudioBuyVerifyHref('<a class="dgcta" href="https://www.getdasha.com/#token">Buy / verify →</a>'),
    '<a class="dgcta" href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump">Buy / verify →</a>',
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
      assert.doesNotMatch(html, /<a href="\/privacy">Privacy<\/a>/);
      assert.equal([...html.matchAll(/href=["']\/privacy["']/g)].length, 0);
      assert.match(html, /:root\{/);
      assert.match(html, /\.dasha\{/);
      assert.match(html, /\.pill\{/);
      assert.match(html, /\.price\{/);
      assert.match(html, /\.contract\{/);
      assert.match(html, /\.spark\{/);
      assert.match(html, /id="token"/);
      assert.doesNotMatch(html, /\.simp-/);
      assert.doesNotMatch(html, /href="\/studio"|How to buy/, `${host} / rewritten home must not include href="/studio" or How to buy`);
      assert.doesNotMatch(html, /<footer(?![^>]*dasha-foot)\b/, `${host} / must drop the leftover Webflow footer`);
      assert.match(html, /<footer class="dasha-foot"/, `${host} / must keep .dasha-foot`);
      assert.doesNotMatch(html, /href=["']https:\/\/lobby\.getdasha\.com\/chess/, `${host} / leftover Chess href must be same-origin or gone`);
      assert.doesNotMatch(html, /href=["']https:\/\/lobby\.getdasha\.com\/forum/, `${host} / leftover Forum href must become \/forum or drop`);
      const lobby = await workerModule.default.fetch(new Request(`https://${host}/lobby`), {});
      assert.equal(lobby.status, 308, `${host} /lobby must 308 home`);
      assert.equal(lobby.headers.get('location'), 'https://www.getdasha.com/');
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
  const servedSimpJs = await workerModule.default.fetch(new Request('https://lobby.getdasha.com/client/simp-board.js'), {});
  assert.equal(servedSimpJs.status, 200);
  const servedSimpBytes = await servedSimpJs.text();
  assert.equal(servedSimpBytes, SIMP_BOARD_JS, 'worker /client/simp-board.js must be the in-repo quiz client');
  assert.doesNotMatch(servedSimpBytes, /Open Studio|Open forum|Make a meme/);
  assert.doesNotMatch(servedSimpBytes, /\/studio|\/forum/);
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
      assert.equal(page.status, 308, `${host}/studio must 308 home`);
      assert.equal(page.headers.get('location'), 'https://www.getdasha.com/');
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
      assert.doesNotMatch(homeHtml, /href="\/privacy"/);
      assert.doesNotMatch(homeHtml, /\.simp-/);
      const studio = await workerModule.default.fetch(new Request(`https://${host}/studio`), {});
      assert.equal(studio.status, 308, `${host}/studio must 308 home`);
      assert.equal(studio.headers.get('location'), 'https://www.getdasha.com/');
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
          assert.equal(page.status, 308, `${host} ${path} ${method} 308s home`);
          assert.equal(page.headers.get('location'), 'https://www.getdasha.com/');
        }
      }
    }
    const home = await workerModule.default.fetch(new Request('https://www.getdasha.com/'), {});
    const homeHtml = await home.text();
    assert.match(homeHtml, /uuriko\.github\.io\/dasha-desk\/bounties/, 'home must not use the bounties iframe strip');
    assert.match(homeHtml, /dasha-bounties-frame/, 'home must not strip bounties-frame CSS');
    assert.doesNotMatch(homeHtml, /id="dasha-bounties"/, 'home must not inject the bounties board');
  } finally {
    globalThis.fetch = nativeFetch;
  }
}
{
  const page = await workerModule.default.fetch(new Request('https://www.getdasha.com/bounties'), {});
  assert.equal(page.status, 308, '/bounties 308s home');
  assert.equal(page.headers.get('location'), 'https://www.getdasha.com/');
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
assert.equal(gatedStart.status, 200, 'unlinked start must begin the quiz');
assert.ok((await gatedStart.json()).question, 'unlinked start must return a question');
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
assert.equal(quizData.progress.current, 1);
assert.equal(quizData.progress.total, 22);
assert.match(quizData.question.media.src, /^\/simp\/photo\/[a-z0-9]+\.jpg$/);
assert.equal(quizData.question.media.kind, 'image');
let prevMedia = quizData.question.media.src;
for (let i = 0; i < 22; i++) {
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
assert.equal(studioDo.simpQuizMetrics.starts, 2);
assert.equal(studioDo.simpQuizMetrics.completions, 1);
assert.equal(Object.values(studioDo.simpQuizMetrics.reached).reduce((a, b) => a + b, 0), 23);
assert.equal(Object.values(studioDo.simpQuizMetrics.answers).reduce((a, b) => a + b, 0), 22);
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
