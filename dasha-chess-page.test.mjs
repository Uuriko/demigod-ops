import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const source = await readFile(new URL('./dasha-chess-page.html', import.meta.url), 'utf8');
const axeSource = await readFile(new URL('./node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
assert.match(source, /Dasha is white\. Anna is black\./);
assert.match(source, /Rated games are public\./, 'replay discovery must be disclosed before play');
assert.match(source, /https:\/\/lobby\.getdasha\.com/);
assert.doesNotMatch(source, /chess\.com|lichess|iframe|<script\s+src=/i, 'chess must be first-party');
assert.doesNotMatch(source, /three@|import\(['"]three|from ['"]three|importmap/i, 'chess page source must ship zero Three.js');
assert.match(source, /One signature\. No transaction\. 24h access\./);
assert.match(source, /Holder verified\. Access open for 24h\./);
const simpClient = await readFile(new URL('./dasha-simp-board-client.js', import.meta.url), 'utf8');
assert.match(simpClient, /Holder verified\. Access open for 24h\./, 'simp holderBtn must match chess 24h holder session');
assert.doesNotMatch(source + simpClient, /access is immediate/i, 'chess and simp must not contradict the 24h holder session');
assert.match(source, /id="tournament"/);
assert.match(source, /id="tournament"><h2>Play<\/h2>/, 'challenge and tournament surface needs one truthful heading');
/* Inviting one named person must be offered from "Ready to play", not only from inside matchmaking.
   The whole challenge flow — create, share a link, accept — existed and worked while its only
   entry point sat in the queued state, so playing a specific friend meant first asking to be
   matched with a stranger. A feature nobody can find is indistinguishable from one nobody built. */
assert.match(source, /textContent='Find match';b\.dataset\.action='queue';invite\.hidden=false/,
  'the ready-to-play state must offer Invite / 1v1 alongside Find match');
assert.match(source, /WWW='https:\/\/www\.getdasha\.com'/);
assert.match(source, /WWW\+'\/chess\?challenge='/, 'invite share must use the www challenge URL');
assert.match(source, /id="dasha-lobby"/, 'chess must embed the existing lobby chat');
assert.match(source, /lobby\.getdasha\.com\/client\/lobby\.js/, 'chess chat must load the existing lobby client');
assert.match(source, /id="ask-lobby"[^>]*>Ask</, 'invite must be able to ask the public room');
assert.match(source, /id="gate-kicker">Step 1</);
assert.match(source, /id="gate-title">Link X</);
assert.match(source, /id="gate-copy">Needs JavaScript to play\.</);
assert.match(source, /<noscript>/);
assert.match(source, /Needs JavaScript to play/);
assert.doesNotMatch(source, /Checking your seat|disabled>Wait</);
assert.match(source, /id="board"[^>]*>[\s\S]*data-square="e2"[\s\S]*<\/div>/, 'first HTML must ship a static opening board');
assert.match(source, /id="board"[^>]*>[\s\S]*Anna rook[\s\S]*Dasha king/);
assert.match(source, /id="rating-panel"[^>]*hidden/, 'first HTML must not flash a personal rating');
assert.match(source, /id="rating">—</);
assert.match(source, /id="record">—</);
assert.match(source, /id="white-rating">—</);
assert.match(source, /id="black-rating">—</);
assert.match(source, /Provisional/, 'an unplayed linked rating must be labeled, not hidden');
assert.match(source, /No rated games yet/, 'an empty table is empty Elo, not removed Elo');
assert.doesNotMatch(source, /id="rating">1200</);
assert.doesNotMatch(source, /id="white-rating">1200</);
assert.doesNotMatch(source, /id="black-rating">1200</);
assert.match(source, /id="tournament-form"[^>]*>[\s\S]*?>Link X</, 'first HTML Create must already be a next step');
assert.match(source, /function linkX\(\).*else location\.href=href/, 'blocked X popup must continue in the same tab');
assert.match(source, /max-width:1150px/, 'right rail must stack before TOP TABLE / CREATE clip');
assert.match(source, /--ink:#070608/);
assert.match(source, /--paper:#f4eddb/);
assert.match(source, /--acid:#dfff00/);
assert.match(source, /--hot:#ff3b81/);
assert.doesNotMatch(source, /#08070a|#f5eedf|#72d6ff|#c8b6ff/);
assert.match(source, /class="dasha-slim[\s"]/);
assert.doesNotMatch(source, /href="\/graph"/);
assert.match(source, /href="\/verse">Verse</);
assert.match(source, /@media\(max-width:560px\)\{[\s\S]*?\.dasha-slim\{flex-wrap:wrap/, 'narrow chess header must wrap');
assert.match(source.match(/<nav aria-label="Dasha"[\s\S]*?<\/nav>/)?.[0] || '', /href="\/chess">Chess</, 'chess hamburger must include Chess');
assert.match(source.match(/<nav aria-label="Dasha"[\s\S]*?<\/nav>/)?.[0] || '', /href="\/privacy">Privacy</, 'chess hamburger must include Privacy');
assert.match(source, /href="\/forum">Forum</, 'chess chrome must include Forum');
assert.match(source, /Holder chess · 10\+5/);
assert.match(source, /TimeControl/, 'PGN must document the live 10+5 increment');
assert.match(source, /600\+5/);
assert.match(source, /og:image:width" content="1200"/);
assert.match(source, /og:image:height" content="630"/);
assert.match(source, /og:image:alt" content="Dasha Chess"/);
assert.match(source, /twitter:image:alt" content="Dasha Chess"/);
assert.match(source, /id="draw"[^>]*>Offer draw</);
assert.equal((source.match(/href="https:\/\/www\.getdasha\.com\/"/g) || []).length, 2, 'Chess wordmark and slim footer must cross the lobby subdomain back to the canonical homepage');
assert.doesNotMatch(source, /class="(?:brand|back)" href="\/"/, 'Chess navigation must not mislabel the lobby service root as Home');
assert.match(source, /<a href="https:\/\/www\.getdasha\.com\/">\$dasha<\/a> · <a class="buy-dasha"/);
assert.match(source, /href="https:\/\/x\.com\/dash_eats"[^>]*>@dash_eats</);
assert.match(source.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || '', /href="\/chess">Chess</, 'chess footer must include Chess');
assert.doesNotMatch(source, /\/airdrop|\/earn|\/graph/, 'chess chrome must not grow dead or shelved doors');
assert.equal((source.match(/https:\/\/jup\.ag\/swap\?/g) || []).length, 2, 'Chess header Buy plus slim footer Buy stay on one Jupiter venue');
assert.match(source, /function loadTournaments\(\).*return fetchJson/, 'tournament restoration must return its complete async chain');
assert.match(source, /function loadChallenge\(id\).*return fetchJson/, 'challenge restoration must return its complete async chain');
assert.match(source, /jup\.ag\/swap\?sell=So11111111111111111111111111111111111111112&amp;buy=53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/);
assert.match(source, /trackEvent\('buy_intent','dasha-chess-buy-intent'\)/, 'buy intent must use the existing session-deduplicated event path');
for (const event of ['link_intent', 'enrollment_intent', 'holder_proof_intent', 'queue_intent']) assert.match(source, new RegExp("trackEvent\\('" + event), `Chess must measure ${event} without adding identity payload`);
assert.match(source, /Dasha's challenge/);
assert.match(source, /challenge_share/);
assert.match(source, /function openX\(text,done\).*tab\.opener=null.*else location\.href=href.*if\(done\)done\(!tab\)/, 'X fallback must sever opener, recover blocked popups in the current tab, and identify navigation-bound handoff intent');
assert.match(source, /handoff=function\(keepalive\)\{trackEvent\('replay_share_handoff',[^}]*keepalive\)\}/, 'same-tab replay handoff must survive immediate X navigation');
assert.doesNotMatch(source, /window\.open\([^\n]*noopener,noreferrer/, 'share handoff must not infer popup success from noopener returning null');
assert.equal((source.match(/\$\('share'\)\.addEventListener\('click',shareGame\)/g) || []).length, 1, 'Share must have exactly one click handler');
assert.match(source, /id="pgn"[^>]*hidden>PGN</, 'first HTML PGN stays hidden until a move exists');
assert.match(source, /id="copy-pgn"[^>]*hidden>Copy PGN</, 'Copy PGN must sit next to download');
assert.match(source, /id="flip"[^>]*>Flip</, 'Flip must exist as a first-class board control');
assert.match(source, /id="abort"[^>]*>Abort</, 'opening abort must exist');
assert.match(source, /id="mute"/, 'move sound must have a mute toggle');
assert.match(source, /dasha-chess-mute/, 'mute must persist in localStorage');
assert.match(source, /prefers-reduced-motion: reduce/, 'reduced motion must default mute on');
assert.match(source, /WWW\+'\/chess\?game='/, 'finished-game share and replay URLs must use www');
assert.match(source, /WWW\+'\/chess\?tournament='/, 'tournament share URLs must use www');
assert.doesNotMatch(source, /https:\/\/lobby\.getdasha\.com\/chess\?game=/);
assert.doesNotMatch(source, /https:\/\/lobby\.getdasha\.com\/chess\?tournament=/);
assert.match(source, /navigator\.onLine/, 'polling must respect explicit offline state');
assert.match(source, /url\.search='\?game='\+encodeURIComponent\(replay\.id\)/, 'replay state must discard unrelated query parameters');
assert.match(source, /location\.pathname\+'\?challenge='\+encodeURIComponent\(challenge\.id\)/, 'challenge state must discard conflicting route parameters');
assert.match(source, /function routeId\(query,name\).*\^\[A-Za-z0-9_\-\]\{6,24\}\$/, 'client route IDs must match the Worker trust boundary');
assert.match(source, /expired&&!replay&&!clockExpiryPending&&navigator\.onLine/, 'offline clock expiry must wait for reconnect adjudication');
assert.match(source, /id="gate-invite"[^>]*hidden[^>]*>Invite \/ 1v1</, 'cold matchmaking must expose one bounded Invite / 1v1 action');
assert.match(source, /\.board\[data-readonly=false\] \.sq:hover/, 'only interactive boards may advertise hover feedback');
assert.match(source, /\.board\[data-readonly=false\] \.sq:active/, 'read-only replay and opponent-turn squares must not animate on press');
assert.equal((source.match(/\.catch\(recoverGame\)/g) || []).length, 5, 'move, resign, draw, rematch, and abort must reconcile ambiguous POST results');

const startBoard = 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR';
const game = {
  id: 'game12345', side: 'w', status: 'active', result: null, reason: null,
  board: startBoard, turn: 'w', castling: 'KQkq', enPassant: null, version: 0, moves: [],
  white: { handle: 'dasha_player', rating: 1200 }, black: { handle: 'anna_player', rating: 1200 },
  legal: [{ from: 'e2', to: 'e3' }, { from: 'e2', to: 'e4' }], createdAt: Date.now(), updatedAt: Date.now(),
  clock: { w: 600000, b: 600000, active: 'w', serverNow: Date.now(), initialMs: 600000, incrementMs: 5000 },
};
const finished = { ...game, status: 'finished', result: '1-0', reason: 'checkmate', rated: true, turn: 'b', legal: [], version: 1, moves: [{ from: 'e2', to: 'e4', san: 'e4' }] };
const promotionBoard = Array(64).fill('.');
promotionBoard[7] = 'k'; promotionBoard[8] = 'P'; promotionBoard[63] = 'K';
const promotionGame = { ...game, board: promotionBoard.join(''), legal: ['q','r','b','n'].map(promotion => ({ from: 'a7', to: 'a8', promotion })) };
const captureBoard = [...startBoard]; captureBoard[44] = 'p';
const captureGame = { ...game, board: captureBoard.join(''), legal: [{ from: 'e2', to: 'e3' }] };
const replay = {
  id: game.id, result: '1-0', reason: 'checkmate', white: game.white, black: game.black,
  moves: finished.moves,
  frames: [{ board: startBoard, turn: 'w', move: null }, { board: 'rnbqkbnrpppppppp....................P...........PPPP.PPPRNBQKBNR', turn: 'b', move: finished.moves[0] }],
  tournamentId: 'cup12345',
  finishedAt: Date.UTC(2025, 0, 2),
};
const afterE5 = [...replay.frames[1].board]; afterE5[12] = '.'; afterE5[28] = 'p';
const afterNf3 = [...afterE5]; afterNf3[62] = '.'; afterNf3[45] = 'N';
const positionReplay = {
  ...replay,
  moves: [...replay.moves, { from: 'e7', to: 'e5', san: 'e5' }, { from: 'g1', to: 'f3', san: 'Nf3' }],
  frames: [...replay.frames, { board: afterE5.join(''), turn: 'w', move: { from: 'e7', to: 'e5', san: 'e5' } }, { board: afterNf3.join(''), turn: 'b', move: { from: 'g1', to: 'f3', san: 'Nf3' } }],
};
const tournament = {
  id: 'cup12345', name: 'First Dasha Cup', status: 'registration', organizer: '@dasha_player', organizerIsMe: false, joined: false,
  entrants: [{ handle: 'dasha_player', display: '@dasha_player', href: 'https://x.com/dasha_player', rating: 1200 }], maxPlayers: 16, champion: null,
  rounds: [{ number: 1, byes: [], matches: [{ white: '@dasha_player', black: '@anna_player', winner: null, status: 'replay', gameId: 'rematch678', replays: ['draw12345'] }] }],
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport });
    if (viewport.width === 390) await context.addInitScript(() => {
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (value, ...rest) { (window.__chessCardText ||= []).push(String(value)); return fillText.call(this, value, ...rest); };
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => Boolean(data?.files?.[0]?.type === 'image/png') });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
        window.__nativeChessShareCalls = (window.__nativeChessShareCalls || 0) + 1;
        const activation = navigator.userActivation.isActive, file = data.files[0], bitmap = await createImageBitmap(file), canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
        const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
        const pixel = (x, y) => [...pixels.slice((y * bitmap.width + x) * 4, (y * bitmap.width + x) * 4 + 3)];
        const colors = new Set(); for (let y = 0; y < bitmap.height; y += 16) for (let x = 0; x < bitmap.width; x += 16) colors.add(pixel(x, y).join(','));
        window.__nativeChessShare = { activation, name: file.name, type: file.type, size: file.size, text: data.text, url: data.url, width: bitmap.width, height: bitmap.height, light: pixel(351, 317), dark: pixel(288, 317), colors: colors.size };
      } });
      URL.createObjectURL = blob => { window.__pgnBlob = blob; return 'blob:dasha-pgn'; };
      URL.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = function () { window.__pgnDownload = this.download; };
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedPgn = text; } } });
    });
    let state = { ok: true, linked: false, enrolled: false, holder: false, rating: null, queued: false, game: null };
    let meRequests = 0, gameReply = game, ratingsFail = false, tournamentsFail = false;
    await context.route('https://lobby.getdasha.com/**', async route => {
      const url = new URL(route.request().url());
      const headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
      if (url.pathname === '/chess/me') { meRequests++; return route.fulfill({ status: 200, headers, body: JSON.stringify(state) }); }
      if (url.pathname === '/chess/ratings') return route.fulfill({ status: ratingsFail ? 503 : 200, headers, body: ratingsFail ? '{"error":"unavailable"}' : JSON.stringify({ ok: true, ratings: [], recent: [] }) });
      if (url.pathname === '/chess/tournaments') return route.fulfill({ status: tournamentsFail ? 503 : 200, headers, body: tournamentsFail ? '{"error":"unavailable"}' : JSON.stringify({ ok: true, tournaments: [] }) });
      if (url.pathname === `/chess/replay/${game.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, replay }) });
      if (url.pathname.startsWith('/chess/game/')) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, game: gameReply }) });
      return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
    await page.waitForFunction(() => document.querySelector('#gate-copy')?.textContent === 'Your X identity holds your rating.');
    assert.equal(await page.locator('#gate-action').textContent(), 'Link X');
    assert.equal(await page.locator('#game').isHidden(), true);
    assert.equal(await page.getByRole('link', { name: 'Dasha home' }).getAttribute('href'), 'https://www.getdasha.com/');
    assert.equal(await page.getByRole('link', { name: 'Buy $dasha on Jupiter using the exact mint' }).getAttribute('target'), '_blank');
    assert.equal(await page.locator('#rating-panel').isHidden(), true, 'anonymous chess home must not invent a personal rating');
    assert.equal(await page.locator('#rating').textContent(), '—', 'identity-less rating must stay a dash, not 1200');
    assert.equal(await page.locator('#white-rating').textContent(), '—', 'first HTML white rating must not invent 1200');
    assert.equal(await page.locator('#black-rating').textContent(), '—', 'first HTML black rating must not invent 1200');
    assert.equal(await page.locator('#recent-panel').isHidden(), true, 'an empty replay shelf must add no interface clutter');
    assert.equal(await page.locator('#tournament-name').isVisible(), true);
    assert.equal(await page.locator('#tournament-form button').textContent(), 'Link X');
    assert.equal(await page.locator('#tournament-form button').isEnabled(), true, 'anonymous Create must be a next step, not a dead control');
    assert.equal(await page.getByText('No rated games yet', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Table unavailable', { exact: true }).count(), 0, 'an empty ratings payload must not look like an outage');

    state = { ok: true, linked: true, enrolled: false, holder: false, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 }, queued: false, game: null };
    const beforeMessage = meRequests;
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://evil.example', data: { type: 'dasha-x-linked' } })));
    await page.waitForTimeout(50);
    assert.equal(meRequests, beforeMessage, 'forged OAuth completion origin must not refresh Chess identity');
    assert.equal(await page.locator('#gate-action').textContent(), 'Link X');
    await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://lobby.getdasha.com', data: { type: 'dasha-x-linked' } })));
    await page.waitForFunction(() => document.querySelector('#gate-action')?.textContent === 'Join & enter');
    assert.ok(meRequests > beforeMessage, 'valid OAuth completion must refresh Chess identity');
    assert.equal(await page.locator('#rating-panel').isVisible(), true, 'linked identity must retain its personal rating');
    assert.equal(await page.locator('#rating').textContent(), '1200', 'a linked identity starts at real provisional 1200 Elo');
    assert.equal(await page.locator('#record').textContent(), 'Provisional');
    assert.equal(await page.locator('#tournament-form button').textContent(), 'Join & enter');

    state = { ok: true, linked: true, enrolled: true, holder: true, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 }, queued: false, game };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
    assert.equal(await page.locator('#board').getAttribute('data-readonly'), 'false', 'moving side must retain an interactive board');
    assert.equal(await page.locator('[data-square="e2"]').getAttribute('aria-disabled'), null);
    assert.equal(await page.locator('#game').isVisible(), true);
    assert.equal(await page.locator('#rating-panel').isVisible(), true);
    assert.equal(await page.locator('#rating').textContent(), '1200', 'enrolled unrated players keep provisional 1200 Elo');
    assert.equal(await page.locator('#record').textContent(), 'Provisional');
    assert.equal(await page.locator('#tournament-link').isHidden(), true, 'tournament link must not appear in a live casual game');
    assert.equal(await page.locator('#replay-controls').isHidden(), true, 'replay controls must not occupy live-game space');
    assert.equal(await page.locator('.sq').count(), 64);
    assert.equal(await page.locator('.sq[tabindex="0"]').count(), 1, 'board must be one Tab stop');
    assert.deepEqual(await page.locator('.sq[data-file]').evaluateAll(nodes => nodes.map(node => node.dataset.file)), [...'abcdefgh'], 'white orientation must label files from a through h');
    assert.deepEqual(await page.locator('.sq[data-rank]').evaluateAll(nodes => nodes.map(node => node.dataset.rank)), [...'87654321'], 'white orientation must label ranks from eight through one');
    assert.equal(await page.locator('#pgn').isHidden(), true, 'PGN stays hidden until a move exists');
    assert.equal(await page.locator('#copy-pgn').isHidden(), true, 'Copy PGN stays hidden until a move exists');
    assert.equal(await page.locator('#flip').isVisible(), true, 'Flip must be available on a live board');
    assert.equal(await page.locator('#abort').isVisible(), true, 'opening with no moves must offer Abort');
    assert.equal(await page.locator('#mute').isVisible(), true, 'move sound mute must be available during a game');
    assert.equal(await page.locator('#white-rating').textContent(), '1200', 'player ratings fill only from a real game payload');
    assert.equal(await page.locator('#black-rating').textContent(), '1200');
    await page.locator('#mute').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('dasha-chess-mute')), '1');
    assert.equal(await page.locator('#mute').textContent(), 'Muted');
    await page.locator('#mute').click();
    assert.equal(await page.evaluate(() => localStorage.getItem('dasha-chess-mute')), '0');
    assert.equal(await page.locator('#mute').textContent(), 'Mute');
    let abortRequests = 0;
    page.on('request', request => { if (request.url().includes('/chess/game/') && request.method() === 'POST' && request.postDataJSON()?.action === 'abort') abortRequests++; });
    await page.locator('#abort').click();
    await page.waitForFunction(() => !document.querySelector('#abort').disabled);
    assert.equal(abortRequests, 1, 'opening Abort must post action abort');
    assert.match(await page.locator('#white-clock').textContent(), /^9:5\d|10:00$/);
    assert.equal(await page.locator('#black-clock').textContent(), '10:00');
    await page.evaluate(() => { window.__realDateNow = Date.now; Date.now = () => window.__realDateNow() + 86_400_000; });
    await page.waitForTimeout(300);
    assert.notEqual(await page.locator('#white-clock').textContent(), '0:00', 'device wall-clock skew must not create a false flag');
    await page.evaluate(() => { Date.now = window.__realDateNow; delete window.__realDateNow; });
    assert.equal(await page.locator('[data-square="e2"]').getAttribute('aria-label'), 'e2 Dasha pawn');
    let expiryRefreshes = 0;
    page.on('request', request => { if (request.url().includes('/chess/game/') && request.method() === 'GET') expiryRefreshes++; });
    state = { ...state, game: { ...game, clock: { ...game.clock, w: 1, activeSince: Date.now() - 1000, serverNow: Date.now() } } };
    const expiryRequest = page.waitForRequest(request => request.url().includes('/chess/game/') && request.method() === 'GET');
    await page.reload();
    await expiryRequest;
    await page.waitForTimeout(50);
    assert.equal(expiryRefreshes, 1, 'expired active clock must request server adjudication once');
    state = { ...state, game };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
    let resignRequests = 0;
    page.on('request', request => { if (request.url().includes('/chess/game/') && request.method() === 'POST' && request.postDataJSON()?.action === 'resign') resignRequests++; });
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#resign').click();
    assert.equal(resignRequests, 0, 'cancelled resignation must not send a request');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#resign').click();
    await page.waitForFunction(() => !document.querySelector('#resign').disabled);
    assert.equal(resignRequests, 1, 'confirmed resignation must send one request');
    await page.locator('[data-square="e2"]').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.square), 'e3');
    await page.locator('[data-square="e2"]').click();
    await page.waitForFunction(() => document.activeElement?.dataset.square === 'e2');
    assert.equal(await page.locator('[data-square="e4"]').evaluate(el => el.classList.contains('legal')), true);
    assert.match(await page.locator('[data-square="e2"]').getAttribute('aria-label'), /Dasha pawn selected$/, 'selected piece must be programmatically exposed');
    assert.equal(await page.locator('[data-square="e4"]').getAttribute('aria-label'), 'e4 empty legal move', 'legal destination must be announced without relying on color');
    await page.locator('[data-square="e2"]').click();
    assert.equal(await page.locator('.sq.selected').count(), 0, 'tapping the selected piece again must deselect it');
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="a1"]').click();
    assert.equal(await page.locator('.sq.selected').count(), 0, 'switching to an immobile friendly piece must clear selection');
    await page.locator('[data-square="e2"]').click();
    gameReply = finished;
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#resign').click();
    await page.waitForFunction(() => !document.querySelector('#resign').disabled);
    assert.equal(await page.locator('.sq.selected').count(), 0, 'server completion must clear stale piece selection');
    gameReply = game;
    state = { ...state, game: captureGame };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
    await page.locator('[data-square="e2"]').click();
    assert.equal(await page.locator('[data-square="e3"]').getAttribute('aria-label'), 'e3 Anna pawn legal capture', 'capture destination must be announced without relying on its ring');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `horizontal overflow at ${viewport.width}px: ${overflow}`);
    state = { ...state, game: { ...game, side: 'b' } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
    assert.deepEqual(await page.locator('.sq[data-file]').evaluateAll(nodes => nodes.map(node => node.dataset.file)), [...'hgfedcba'], 'Anna orientation must reverse file labels');
    assert.deepEqual(await page.locator('.sq[data-rank]').evaluateAll(nodes => nodes.map(node => node.dataset.rank)), [...'12345678'], 'Anna orientation must reverse rank labels');
    await page.locator('#flip').click();
    assert.deepEqual(await page.locator('.sq[data-file]').evaluateAll(nodes => nodes.map(node => node.dataset.file)), [...'abcdefgh'], 'Flip must invert the auto-oriented board');
    await page.locator('#flip').click();
    assert.deepEqual(await page.locator('.sq[data-file]').evaluateAll(nodes => nodes.map(node => node.dataset.file)), [...'hgfedcba'], 'a second Flip must restore the auto orientation');
    state = { ...state, game: { ...game, turn: 'b', moves: [{ from: 'e2', to: 'e4', san: 'e4' }] } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#game-status')?.textContent.includes('Dasha played e4'));
    assert.equal(await page.locator('#board').getAttribute('data-readonly'), 'true', 'opponent turn must expose a read-only board');
    assert.equal(await page.locator('.sq').first().getAttribute('aria-disabled'), 'true');
    assert.match(await page.locator('#game-status').textContent(), /Waiting for opponent… · Dasha played e4/, 'move status must identify the themed side and SAN');
    assert.equal(await page.locator('#pgn').isVisible(), true, 'PGN export appears after the first move');
    assert.equal(await page.locator('#copy-pgn').isVisible(), true, 'Copy PGN appears after the first move');
    assert.equal(await page.locator('#abort').isVisible(), true, 'Abort remains available before both sides have moved');
    state = { ...state, game: { ...game, moves: [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' }], drawOffer: 'theirs' } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#draw')?.textContent === 'Accept draw');
    assert.match(await page.locator('#game-status').textContent(), /offered a draw/);
    assert.equal(await page.locator('#abort').isHidden(), true, 'Abort must disappear after two moves');
    let acceptDrawPosts = 0;
    page.on('request', request => { if (request.url().includes('/chess/game/') && request.method() === 'POST' && request.postDataJSON()?.action === 'offer_draw') acceptDrawPosts++; });
    const acceptDraw = page.waitForRequest(request => request.url().includes('/chess/game/') && request.method() === 'POST' && request.postDataJSON()?.action === 'offer_draw');
    await page.locator('#draw').click();
    await acceptDraw;
    assert.equal(acceptDrawPosts, 1, 'Accept draw must not ask for a second confirmation');
    state = { ...state, game: { ...game, moves: [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' }], drawOffer: null } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
    assert.equal(await page.locator('#draw').isDisabled(), true, 'player to move cannot offer before moving');
    state = { ...state, game: { ...game, turn: 'b', moves: [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' }], drawOffer: null } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#draw') && !document.querySelector('#draw').disabled);
    let offerDrawPosts = 0;
    page.on('request', request => { if (request.url().includes('/chess/game/') && request.method() === 'POST' && request.postDataJSON()?.action === 'offer_draw') offerDrawPosts++; });
    page.once('dialog', dialog => { assert.equal(dialog.message(), 'Offer a draw?'); dialog.dismiss(); });
    await page.locator('#draw').click();
    assert.equal(offerDrawPosts, 0, 'cancelled draw offer must not send a request');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#draw').click();
    await page.waitForFunction(() => !document.querySelector('#draw').disabled || document.querySelector('#draw').textContent !== 'Offer draw');
    assert.equal(offerDrawPosts, 1, 'confirmed draw offer must send one request');
    state = { ...state, game: { ...game, check: true } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.sq.check'));
    assert.equal(await page.locator('#turn').textContent(), 'Dasha in check');
    assert.match(await page.locator('.sq.check').getAttribute('aria-label'), /king in check/);
    await page.addScriptTag({ content: axeSource });
    const axe = await page.evaluate(async () => { const result = await axe.run(document); return { rules: result.passes.length + result.inapplicable.length, serious: result.violations.filter(item => ['serious', 'critical'].includes(item.impact)).map(item => item.id) }; });
    assert.ok(axe.rules > 30, 'axe harness did not run');
    assert.deepEqual(axe.serious, [], `${viewport.width}px serious accessibility regression`);
    state = { ...state, game: finished };
    const meBeforeFinished = meRequests;
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#again')?.hidden);
    await page.waitForTimeout(1800);
    assert.equal(meRequests - meBeforeFinished, 1, 'a settled game must not create a permanent identity-refresh loop');
    state = { ...state, game: { ...finished, rated: false, moves: [] } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#game-status')?.textContent === 'Game complete · unrated');
    assert.equal(await page.locator('#game-status').textContent(), 'Game complete · unrated');
    state = { ...state, game: finished };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#game-status')?.textContent === 'Rated game complete');
    assert.equal(await page.locator('#again').isVisible(), true);
    assert.equal(await page.locator('#again').textContent(), 'Rematch');
    assert.equal(await page.locator('#share').isVisible(), true);
    assert.equal(await page.locator('#pgn').isVisible(), true);
    state = { ...state, holder: false };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#again')?.textContent === 'Verify to rematch');
    await page.locator('#again').click();
    assert.match(await page.locator('#game-status').textContent(), /Open this page in a Solana wallet/, 'expired proof must recover from the visible completed game');
    state = { ...state, holder: true };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#again')?.textContent === 'Rematch');
    if (viewport.width === 390) {
      state = { ...state, game: { ...finished, moves: [{ from: 'e2', to: 'e4', san: 'e4' }, { from: 'e7', to: 'e5', san: 'e5' }] } };
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#share')?.offsetParent);
      await page.evaluate(() => { document.querySelector('#share').click(); document.querySelector('#share').click(); });
      await page.waitForFunction(() => window.__nativeChessShare?.size > 1000);
      const nativeShare = await page.evaluate(() => window.__nativeChessShare);
      assert.equal(await page.evaluate(() => window.__nativeChessShareCalls), 1, 'rapid double share must open one native sheet');
      await page.waitForFunction(() => !document.querySelector('#share').disabled);
      assert.equal(nativeShare.activation, true, 'native share must be invoked during the original user activation');
      assert.equal(nativeShare.type, 'image/png');
      assert.equal(nativeShare.name, 'dasha-chess-game12345.png');
      assert.deepEqual([nativeShare.width, nativeShare.height], [1200, 630]);
      assert.deepEqual(nativeShare.light, [234, 223, 200], 'share card must contain the light board squares');
      assert.deepEqual(nativeShare.dark, [108, 89, 109], 'share card must contain the dark board squares');
      assert.ok(nativeShare.colors > 20, `share card appears blank (${nativeShare.colors} sampled colors)`);
      assert.match(nativeShare.text, /Dasha vs Anna/);
      assert.ok(await page.evaluate(() => window.__chessCardText.includes('checkmate · 1 move')), 'share card must count one white/black pair as one chess move');
      assert.equal(await page.evaluate(() => window.__chessCardText.includes('checkmate · 2 moves')), false, 'share card must not label plies as full moves');
      assert.equal(nativeShare.url, 'https://www.getdasha.com/chess?game=game12345');
      assert.doesNotMatch(nativeShare.text, /https:\/\/lobby\.getdasha\.com/, 'native share text must not duplicate its separate URL field');
      await page.locator('#pgn').click();
      assert.equal(await page.evaluate(() => window.__pgnDownload), 'dasha-vs-anna-game12345.pgn');
      const pgn = await page.evaluate(() => window.__pgnBlob.text());
      assert.match(pgn, /\[Event "Dasha Chess"\]/);
      assert.match(pgn, /^\[Event .*\n\[Site .*\n\[Date .*\n\[Round "\?"\]\n\[White .*\n\[Black .*\n\[Result /, 'PGN must emit the required Seven Tag Roster in order');
      assert.match(pgn, /\[White "@dasha_player \(Dasha\)"\]/);
      assert.match(pgn, /\[Black "@anna_player \(Anna\)"\]/);
      assert.match(pgn, /\[Result "1-0"\]/);
      assert.match(pgn, /\[TimeControl "600\+5"\]/, 'PGN must name the same 10+5 control the kicker advertises');
      assert.match(pgn, /\[Site "https:\/\/www\.getdasha\.com\/chess\?game=game12345"\]/);
      assert.match(pgn, /\n\n1\. e4 e5 1-0\n$/, 'PGN movetext must be numbered and terminate with the result');
      await page.locator('#copy-pgn').click();
      assert.equal(await page.evaluate(() => window.__copiedPgn), pgn, 'Copy PGN must write the same string as download');
      state = { ...state, game: { ...finished, moves: Array.from({ length: 80 }, (_, index) => ({ from: index % 2 ? 'e7' : 'e2', to: index % 2 ? 'e5' : 'e4', san: index % 2 ? 'e5' : 'e4' })) } };
      await page.reload();
      await page.waitForFunction(() => !document.querySelector('#pgn')?.hidden);
      await page.locator('#pgn').click();
      const longPgn = await page.evaluate(() => window.__pgnBlob.text());
      const movetext = longPgn.split('\n\n')[1].trim().split('\n');
      assert.ok(movetext.length > 1, 'long PGN movetext must wrap across lines');
      assert.ok(movetext.every(line => line.length < 80), `PGN movetext line exceeds export limit: ${Math.max(...movetext.map(line => line.length))}`);
      state = { ...state, game: finished };
    }
    state = { ...state, game: { ...finished, rematchOffer: 'theirs' } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#again')?.textContent === 'Accept rematch');
    assert.match(await page.locator('#game-status').textContent(), /wants a rematch/);
    state = { ...state, game: { ...finished, rematchOffer: 'mine' } };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#again')?.textContent === 'Rematch sent');
    assert.equal(await page.locator('#again').isDisabled(), true);
    state = { ...state, holder: false };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#again')?.textContent === 'Verify to rematch');
    assert.equal(await page.locator('#again').isEnabled(), true, 'expired offerer must be able to refresh proof while the opponent waits');
    state = { ...state, holder: true };
    state = { ...state, game: promotionGame };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
    await page.locator('[data-square="a7"]').click();
    await page.locator('[data-square="a8"]').click();
    assert.equal(await page.locator('#promotion').isVisible(), true);
    const moveRequest = page.waitForRequest(request => request.url().includes('/chess/game/') && request.method() === 'POST');
    await page.getByRole('button', { name: 'Knight' }).click();
    const submittedMove = await moveRequest;
    await page.waitForFunction(() => !document.querySelector('#promotion').open);
    assert.equal(submittedMove.postDataJSON().promotion, 'n');
    assert.deepEqual(errors, []);
    if (viewport.width === 320) {
      ratingsFail = true;
      tournamentsFail = true;
      await page.reload();
      await page.getByText('Table unavailable', { exact: true }).waitFor();
      await page.getByText('Tournaments unavailable.', { exact: true }).waitFor();
      assert.equal(await page.locator('#recent-panel').isHidden(), true, 'failed discovery must not retain a stale recent shelf');
      assert.equal(await page.getByText('No rated games yet', { exact: true }).count(), 0, 'an outage must not masquerade as an empty ladder');
      assert.equal(await page.getByRole('button', { name: 'Create', exact: true }).count(), 0, 'an outage must not masquerade as an empty tournament system');
    }
    await context.close();
  }

  const railContext = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  await railContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: false, enrolled: false, holder: false, rating: null, queued: false, game: null }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [], recent: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const railPage = await railContext.newPage();
  await railPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await railPage.waitForFunction(() => document.querySelector('#gate-copy')?.textContent === 'Your X identity holds your rating.');
  assert.ok((await railPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, '1100px must wrap TOP TABLE / CREATE instead of clipping');
  assert.equal(await railPage.getByRole('heading', { name: 'Top table' }).isVisible(), true);
  assert.equal(await railPage.locator('#tournament-form button').isVisible(), true);
  await railContext.close();

  const eloContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await eloContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@dasha_player' }, rating: { rating: 1212, games: 1, wins: 1, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [{ rank: 1, handle: 'dasha_player', display: '@dasha_player', href: 'https://x.com/dasha_player', rating: 1212, games: 1, wins: 1, losses: 0, draws: 0 }], recent: [{ id: game.id, white: '@dasha_player', black: '@anna_player', result: '1-0' }] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const eloPage = await eloContext.newPage();
  await eloPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await eloPage.waitForFunction(() => document.querySelector('#rating')?.textContent === '1212');
  assert.equal(await eloPage.locator('#rating').textContent(), '1212', 'after a rated game the sidebar must show the real Elo');
  assert.equal(await eloPage.locator('#record').textContent(), '1W · 0L · 0D · 1 games');
  assert.equal(await eloPage.locator('#leaders b').textContent(), '1212', 'top table must still show Elo for people who have played');
  assert.equal(await eloPage.getByText('No rated games yet', { exact: true }).count(), 0);
  assert.equal(await eloPage.getByText('Provisional', { exact: true }).count(), 0, 'a played rating is Elo, not provisional');
  await eloContext.close();

  const blockedLinkContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blockedLinkContext.addInitScript(() => { window.open = () => null; });
  await blockedLinkContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/oauth/x/start') return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/html' }, body: '<!doctype html><title>X start</title>' });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: false, enrolled: false, holder: false, rating: null, queued: false, game: null }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [], recent: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const blockedLinkPage = await blockedLinkContext.newPage();
  await blockedLinkPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await blockedLinkPage.waitForFunction(() => document.querySelector('#gate-copy')?.textContent === 'Your X identity holds your rating.');
  await Promise.all([
    blockedLinkPage.waitForURL(/\/oauth\/x\/start/),
    blockedLinkPage.locator('#gate-action').click(),
  ]);
  assert.match(blockedLinkPage.url(), /\/oauth\/x\/start/, 'blocked X popup must continue in the same tab');
  await blockedLinkContext.close();

  const holderRetryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let holder = false, holderChallenges = 0, holderVerifies = 0, holderSignatures = 0;
  await holderRetryContext.addInitScript(() => {
    window.solana = {
      publicKey: { toString: () => '11111111111111111111111111111111' },
      connect: async function () { return { publicKey: this.publicKey }; },
      signMessage: async () => { window.__holderSignatures = (window.__holderSignatures || 0) + 1; return { signature: new Uint8Array([1, 2, 3]) }; },
    };
  });
  await holderRetryContext.route('https://lobby.getdasha.com/**', route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder, queued: false, game: null, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/simp/wallet/challenge') { holderChallenges++; return route.fulfill({ status: 200, headers, body: '{"ok":true,"message":"prove holder","challenge":"signed-challenge"}' }); }
    if (url.pathname === '/simp/wallet/verify') { holderVerifies++; if (holderVerifies === 1) return route.fulfill({ status: 503, headers, body: '{"error":"Solana holder check unavailable — try again"}' }); holder = true; return route.fulfill({ status: 200, headers, body: '{"ok":true,"holder":true}' }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: '{"ok":true,"ratings":[]}' });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: '{"ok":true,"tournaments":[]}' });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const holderRetryPage = await holderRetryContext.newPage();
  await holderRetryPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await holderRetryPage.locator('#gate-action').click();
  await holderRetryPage.waitForFunction(() => document.querySelector('#gate-title')?.textContent === 'Ready to play');
  assert.equal(await holderRetryPage.locator('#gate-action').textContent(), 'Find match');
  assert.equal(await holderRetryPage.getByRole('button', { name: 'Invite / 1v1' }).isVisible(), true, 'ready state must show Invite / 1v1 as an equal play action');
  assert.equal(await holderRetryPage.locator('#gate-invite').getAttribute('class'), 'btn', 'Invite / 1v1 must not be a ghost button when ready');
  holderSignatures = await holderRetryPage.evaluate(() => window.__holderSignatures || 0);
  assert.deepEqual([holderChallenges, holderSignatures, holderVerifies], [1, 1, 2], 'transient RPC failure must reuse one signed challenge for one bounded verify retry');
  await holderRetryContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let replayShareEvents = 0;
  let replayShareHandoffs = 0;
  let replayOpenEvents = 0;
  let replayPlayEvents = 0;
  let failReplayShareOnce = true;
  let pageOpenEvents = 0;
  await context.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === `/chess/replay/${game.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, replay }) });
    if (url.pathname === '/chess/event') { const event = route.request().postDataJSON()?.event; if (event === 'replay_share' && failReplayShareOnce) { failReplayShareOnce = false; return route.abort('connectionfailed'); } if (event === 'replay_share') replayShareEvents++; if (event === 'replay_share_handoff') replayShareHandoffs++; if (event === 'replay_open') replayOpenEvents++; if (event === 'replay_play') replayPlayEvents++; if (event === 'page_open') pageOpenEvents++; return route.fulfill({ status: 200, headers, body: '{"ok":true}' }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [], recent: [{ id: game.id, white: '@dasha_player', black: '@anna_player', result: '1-0' }] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const page = await context.newPage();
  let shared = '';
  await page.addInitScript(() => {
    window.open = url => { window.__shared = url; return {}; };
    URL.createObjectURL = blob => { window.__pgnBlob = blob; return 'blob:dasha-pgn'; };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function () {};
  });
  await page.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?challenge=stale123&tournament=stale456&utm_source=x&game=${game.id}`);
  await page.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
  assert.equal(new URL(page.url()).search, `?game=${game.id}`, 'loaded replay must collapse mixed inbound state to one canonical object');
  assert.equal(await page.locator('#replay-controls').isVisible(), true);
  assert.equal(await page.locator('#flip').isVisible(), true, 'Flip must remain available on a finished replay');
  assert.equal(await page.locator('#abort').isHidden(), true, 'Abort must not appear on a finished replay');
  assert.equal(await page.locator('#recent-panel').isVisible(), true, 'rated completed games must be discoverable without a preexisting exact link');
  assert.equal(await page.locator('#recent a').getAttribute('href'), '/chess?game=game12345');
  assert.equal(await page.locator('#recent a').textContent(), '@dasha_player vs @anna_player1-0');
  assert.equal(await page.locator('#board').getAttribute('data-readonly'), 'true', 'public replay board must expose read-only semantics');
  assert.equal(await page.locator('.sq').first().getAttribute('aria-disabled'), 'true');
  assert.equal(await page.locator('#rating-panel').isHidden(), true, 'anonymous replay must not show a fake personal rating');
  assert.equal(await page.locator('#tournament-link').isVisible(), true, 'tournament replay must link back to its bracket');
  assert.equal(await page.locator('#tournament-link').getAttribute('href'), '/chess?tournament=cup12345');
  assert.equal(await page.locator('#replay-play').isVisible(), true, 'public replay must offer a direct Play handoff');
  assert.equal(await page.locator('#replay-play').getAttribute('href'), '/chess');
  await page.locator('#pgn').click();
  const replayPgn = await page.evaluate(() => window.__pgnBlob.text());
  assert.match(replayPgn, /\[Date "2025\.01\.02"\]/, 'historic replay PGN must retain its authoritative server timestamp');
  await page.locator('#replay-play').evaluate(node => node.addEventListener('click', event => event.preventDefault()));
  await page.locator('#replay-play').click();
  await page.waitForTimeout(20);
  assert.equal(replayOpenEvents, 1, 'one replay must produce one session-deduplicated open event');
  assert.equal(replayPlayEvents, 1, 'Play must produce one navigation-safe intent event');
  assert.equal(await page.locator('#replay-output').textContent(), '1. e4');
  const replayMove = page.locator('.move-jump');
  assert.equal(await replayMove.count(), 1, 'completed replay SAN must be directly navigable');
  assert.equal(await replayMove.getAttribute('aria-label'), 'Move 1. Dasha: e4');
  assert.equal(await replayMove.getAttribute('aria-current'), 'step');
  await page.locator('#replay-prev').click();
  assert.equal(await page.locator('#replay-output').textContent(), 'Start');
  assert.equal(await replayMove.getAttribute('aria-current'), null, 'Start position must clear the selected move');
  await replayMove.click();
  assert.equal(await page.locator('#replay-output').textContent(), '1. e4', 'SAN control must jump to its exact frame');
  assert.equal(await replayMove.getAttribute('aria-current'), 'step');
  assert.ok((await replayMove.boundingBox()).height >= 44, 'replay move must remain a full touch target');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })));
  assert.equal(await page.locator('#replay-output').textContent(), '1. e4', 'End must jump to the final replay position');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })));
  assert.equal(await page.locator('#replay-output').textContent(), 'Start', 'Home must jump to the initial position');
  assert.match(page.url(), /[?&]ply=0(?:&|$)/, 'replay URL must preserve the selected position');
  assert.equal(new URL(page.url()).search, `?game=${game.id}&ply=0`, 'replay controls must retain only the game and exact ply');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#replay-output')?.textContent === 'Start');
  assert.equal(await page.locator('#replay-output').textContent(), 'Start', 'exact replay position must survive reload');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.locator('#replay-output').textContent(), 'Start', 'tab focus must preserve the selected replay position');
  await page.locator('#share').click();
  await page.waitForTimeout(20);
  await page.locator('#share').click();
  await page.waitForTimeout(20);
  shared = await page.evaluate(() => window.__shared);
  assert.match(shared, /^https:\/\/x\.com\/intent\/tweet\?text=/);
  assert.match(decodeURIComponent(shared), /Replay from the start: https:\/\/www\.getdasha\.com\/chess\?game=game12345&ply=0/);
  assert.equal(replayShareEvents, 1, 'a failed share event must retry once, then deduplicate after success');
  assert.equal(pageOpenEvents, 1, 'page open must be deduplicated per browser session');
  await page.evaluate(() => {
    window.__nativeShare = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__nativeShare = data; } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
  await page.locator('#share').click();
  await page.waitForFunction(() => Boolean(window.__nativeShare));
  const urlOnlyShare = await page.evaluate(() => window.__nativeShare);
  assert.equal(urlOnlyShare.url, `https://www.getdasha.com/chess?game=${game.id}&ply=0`, 'native URL sharing must survive browsers without file-sharing detection');
  assert.doesNotMatch(urlOnlyShare.text, /https:\/\/lobby\.getdasha\.com/, 'exact-ply native share text must not duplicate its separate URL field');
  assert.equal(urlOnlyShare.files, undefined, 'unsupported file sharing must not block the native share sheet');
  await page.evaluate(() => {
    window.__nativeShare = null;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  await page.locator('#share').click();
  await page.waitForFunction(() => Boolean(window.__nativeShare));
  assert.equal((await page.evaluate(() => window.__nativeShare)).files, undefined, 'a rejected image attachment must degrade to native text and URL sharing');
  await page.evaluate(() => {
    window.__nativeShare = null;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('encoding failed'); };
  });
  await page.locator('#share').click();
  await page.waitForFunction(() => Boolean(window.__nativeShare));
  assert.equal((await page.evaluate(() => window.__nativeShare)).files, undefined, 'failed canvas encoding must retain native text and URL sharing');
  await page.waitForTimeout(20);
  assert.equal(replayShareHandoffs, 1, 'share destination handoff must be session-deduplicated across native and X paths');
  assert.ok(await page.locator('#share').isVisible());
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await context.route('https://x.com/**', route => route.abort());
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    window.open = () => null;
  });
  const blockedShare = page.waitForRequest(request => request.url().startsWith('https://x.com/intent/tweet?text='));
  await page.locator('#share').click();
  const blockedShareUrl = decodeURIComponent((await blockedShare).url());
  assert.match(blockedShareUrl, /Replay from the start: https:\/\/www\.getdasha\.com\/chess\?game=game12345&ply=0/, 'blocked popup must recover through an exact same-tab X intent');
  await context.close();

  const startCardContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await startCardContext.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, ...rest) { (window.__cardText ||= []).push(String(value)); return fillText.call(this, value, ...rest); };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => Boolean(data?.files?.length) });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {} });
  });
  await startCardContext.route('https://lobby.getdasha.com/**', route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === `/chess/replay/${game.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, replay }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: '{"ok":true,"ratings":[]}' });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const startCardPage = await startCardContext.newPage();
  await startCardPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?game=${game.id}&ply=0`);
  await startCardPage.waitForFunction(() => document.querySelector('#replay-output')?.textContent === 'Start');
  await startCardPage.locator('#share').click();
  await startCardPage.waitForFunction(() => window.__cardText?.some(value => value.includes('replay')));
  const startCardText = await startCardPage.evaluate(() => window.__cardText);
  assert.ok(startCardText.includes('$dasha · replay start'), 'initial-position card must use the same Start language as replay controls');
  assert.equal(startCardText.includes('$dasha · replay move 0'), false, 'initial-position card must never expose implementation-oriented move zero');
  await startCardContext.close();

  const positionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await positionContext.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (value, ...rest) { (window.__positionCardText ||= []).push(String(value)); return fillText.call(this, value, ...rest); };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => Boolean(data?.files?.length) });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__positionShare = { text: data.text, url: data.url }; } });
  });
  await positionContext.route('https://lobby.getdasha.com/**', route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === `/chess/replay/${game.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, replay: positionReplay }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: '{"ok":true,"ratings":[]}' });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const positionPage = await positionContext.newPage();
  await positionPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?game=${game.id}&ply=2`);
  await positionPage.waitForFunction(() => document.querySelector('#replay-output')?.textContent === '1... e5');
  await positionPage.locator('#share').click();
  await positionPage.waitForFunction(() => Boolean(window.__positionShare));
  const positionShare = await positionPage.evaluate(() => window.__positionShare);
  assert.match(positionShare.text, /Replay after 1\.\.\. e5/, 'Black replay position must use exact chess notation, not the raw ply number');
  assert.equal(positionShare.url, `https://www.getdasha.com/chess?game=${game.id}&ply=2`, 'shared mid-game position must retain its exact durable state');
  assert.ok(await positionPage.evaluate(() => window.__positionCardText.includes('$dasha · after 1... e5')), 'share card must match the exact Black-move notation');
  await positionContext.close();

  const tournamentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let tournamentView = tournament;
  await tournamentContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === `/chess/tournament/${tournament.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournament: tournamentView }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: false, enrolled: false, holder: false, queued: false, game: null }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const tournamentPage = await tournamentContext.newPage();
  await tournamentPage.addInitScript(() => { window.open = url => { window.__shared = url; return {}; }; });
  await tournamentPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?tournament=${tournament.id}`);
  await tournamentPage.waitForFunction(() => document.querySelector('#tournament-body')?.textContent.includes('First Dasha Cup'));
  assert.match(await tournamentPage.locator('#tournament-body').textContent(), /Open · 1\/16/);
  assert.equal(await tournamentPage.getByRole('button', { name: 'Join', exact: true }).count(), 0, 'anonymous tournament viewer must not see an impossible Join action');
  assert.equal(await tournamentPage.locator('#gate-action').textContent(), 'Link X');
  assert.equal(await tournamentPage.locator('#rating-panel').isHidden(), true, 'anonymous tournament viewer must not see a fake personal rating');
  assert.equal(await tournamentPage.getByRole('link', { name: 'Replay', exact: true }).getAttribute('href'), '/chess?game=draw12345', 'public bracket must link a completed draw while its rematch is live');
  await tournamentPage.getByRole('button', { name: 'Share' }).click();
  const tournamentShare = decodeURIComponent(await tournamentPage.evaluate(() => window.__shared));
  assert.match(tournamentShare, /Join the tournament: https:\/\/www\.getdasha\.com\/chess\?tournament=cup12345/);
  tournamentView = { ...tournament, status: 'finished', champion: '@dasha_player' };
  await tournamentPage.addInitScript(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__tournamentNativeShare = data; } }); });
  await tournamentPage.reload();
  await tournamentPage.waitForFunction(() => document.querySelector('#tournament-body')?.textContent.includes('Complete'));
  await tournamentPage.getByRole('button', { name: 'Share' }).click();
  await tournamentPage.waitForFunction(() => window.__tournamentNativeShare?.url);
  const completedShare = await tournamentPage.evaluate(() => window.__tournamentNativeShare);
  assert.equal(completedShare.title, 'First Dasha Cup — Dasha Chess');
  assert.equal(completedShare.url, 'https://www.getdasha.com/chess?tournament=cup12345');
  assert.match(completedShare.text, /See the bracket · 1\/16 players/);
  assert.doesNotMatch(completedShare.text, /Join the tournament/);
  assert.ok((await tournamentPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await tournamentContext.close();

  const missingTournamentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await missingTournamentContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') { await new Promise(resolve => setTimeout(resolve, 80)); return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: false, enrolled: false, holder: false, queued: false, game: null }) }); }
    if (url.pathname === '/chess/tournament/missing1') return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const missingTournamentPage = await missingTournamentContext.newPage();
  await missingTournamentPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?tournament=missing1`);
  await missingTournamentPage.getByText('Tournament unavailable.', { exact: true }).waitFor();
  await missingTournamentPage.waitForTimeout(150);
  assert.equal(await missingTournamentPage.getByText('Tournament unavailable.', { exact: true }).isVisible(), true, 'late identity state must not erase an unavailable tournament deep link');
  await missingTournamentContext.close();

  const unavailableChallengeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await unavailableChallengeContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@holder' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/challenge/missing1') return route.fulfill({ status: 503, headers, body: JSON.stringify({ error: 'Challenge unavailable.' }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const unavailableChallengePage = await unavailableChallengeContext.newPage();
  await unavailableChallengePage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?challenge=missing1`);
  await unavailableChallengePage.getByText('Challenge unavailable.', { exact: true }).waitFor();
  assert.equal(await unavailableChallengePage.locator('#gate-title').textContent(), 'Challenge unavailable');
  assert.equal(await unavailableChallengePage.getByRole('button', { name: 'Create', exact: true }).count(), 0, 'a failed shared challenge must not expose an unrelated tournament action');
  assert.equal(await unavailableChallengePage.getByRole('button', { name: 'Challenge', exact: true }).count(), 0, 'a failed shared challenge must not expose another challenge action beneath the error');
  assert.ok((await unavailableChallengePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'challenge failure must fit mobile');
  await unavailableChallengeContext.close();

  const missingChallengeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await missingChallengeContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@holder' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/challenge/missing1') return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'This challenge was not found or has expired.' }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const missingChallengePage = await missingChallengeContext.newPage();
  await missingChallengePage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?challenge=missing1`);
  await missingChallengePage.getByText('This challenge was not found or has expired.', { exact: true }).waitFor();
  assert.equal(await missingChallengePage.locator('#gate-title').textContent(), 'This challenge was not found', 'unknown challenge must use honest copy, not a branded 404');
  assert.equal(await missingChallengePage.locator('#gate-action').textContent(), 'Find match');
  assert.equal(await missingChallengePage.getByRole('button', { name: 'Invite / 1v1' }).isVisible(), true);
  await missingChallengeContext.close();

  const lostCreateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let tournamentCommitted = false, tournamentCreatePosts = 0;
  const ownedTournament = { ...tournament, organizerIsMe: true, joined: true };
  await lostCreateContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === '/chess/tournaments' && route.request().method() === 'POST') { tournamentCreatePosts++; tournamentCommitted = true; return route.abort('connectionfailed'); }
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: tournamentCommitted ? [ownedTournament] : [] }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const lostCreatePage = await lostCreateContext.newPage();
  await lostCreatePage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await lostCreatePage.getByPlaceholder('Cup name').fill('First Dasha Cup');
  await lostCreatePage.getByRole('button', { name: 'Create', exact: true }).click();
  await lostCreatePage.getByText('First Dasha Cup', { exact: true }).waitFor();
  assert.equal(tournamentCreatePosts, 1, 'ambiguous Create recovery must never replay the tournament POST');
  assert.equal(await lostCreatePage.locator('#tournament-status').count(), 0, 'a recovered tournament must not retain a false network error');
  assert.ok((await lostCreatePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'recovered tournament must fit mobile');
  await lostCreateContext.close();

  const lostStartContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let tournamentStarted = false, tournamentStartPosts = 0;
  const readyTournament = { ...tournament, organizerIsMe: true, joined: true, entrants: [...tournament.entrants, { handle: 'anna_player', display: '@anna_player', href: 'https://x.com/anna_player', rating: 1200 }] };
  await lostStartContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === `/chess/tournament/${tournament.id}` && route.request().method() === 'POST') { tournamentStartPosts++; tournamentStarted = true; return route.abort('connectionfailed'); }
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [{ ...readyTournament, status: tournamentStarted ? 'active' : 'registration' }] }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const lostStartPage = await lostStartContext.newPage();
  await lostStartPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await lostStartPage.getByRole('button', { name: 'Start', exact: true }).click();
  await lostStartPage.getByText(/Playing · 2\/16/).waitFor();
  assert.equal(tournamentStartPosts, 1, 'ambiguous Start recovery must never replay the tournament POST');
  assert.equal(await lostStartPage.locator('#tournament-status').count(), 0, 'a recovered active bracket must not retain a false network error');
  await lostStartContext.close();

  const holderTournamentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let holderTournamentView = tournament;
  await holderTournamentContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === `/chess/tournament/${tournament.id}` && route.request().method() === 'POST') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournament: { ...holderTournamentView, status: 'cancelled' } }) });
    if (url.pathname === `/chess/tournament/${tournament.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournament: holderTournamentView }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@holder' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const holderTournamentPage = await holderTournamentContext.newPage();
  await holderTournamentPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?tournament=${tournament.id}`);
  await holderTournamentPage.getByRole('button', { name: 'Join', exact: true }).waitFor();
  assert.equal(await holderTournamentPage.getByRole('button', { name: 'Join', exact: true }).isEnabled(), true, 'verified holder must retain tournament Join');
  holderTournamentView = { ...tournament, organizerIsMe: true, joined: true };
  await holderTournamentPage.reload();
  await holderTournamentPage.getByRole('button', { name: 'Start', exact: true }).waitFor();
  assert.equal(await holderTournamentPage.getByRole('button', { name: 'Start', exact: true }).isDisabled(), true, 'organizer cannot start a one-player cup');
  holderTournamentView = { ...holderTournamentView, entrants: [...tournament.entrants, { handle: 'anna_player', display: '@anna_player', href: 'https://x.com/anna_player', rating: 1200 }] };
  await holderTournamentPage.reload();
  assert.equal(await holderTournamentPage.getByRole('button', { name: 'Start', exact: true }).isEnabled(), true, 'two-player cup must expose the valid Start action');
  assert.ok((await holderTournamentPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1, 'organizer actions must not overflow mobile');
  await holderTournamentPage.getByRole('button', { name: 'Cancel', exact: true }).click();
  await holderTournamentPage.getByText('Open a table for up to 16 holders.', { exact: true }).waitFor();
  assert.equal(new URL(holderTournamentPage.url()).search, '', 'cancelled tournament must clear its obsolete deep link');
  assert.equal(await holderTournamentPage.getByText('Tournament unavailable.', { exact: true }).count(), 0, 'successful cancellation must not become an unavailable-tournament state');
  await holderTournamentContext.close();

  const challengeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const challenge = { id: 'invite123', status: 'open', creator: '@dasha_player', creatorRating: 1240, creatorIsMe: false, canAccept: true, expiresAt: Date.now() + 30 * 60_000 };
  await challengeContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === '/chess/challenge/invite123' && route.request().method() === 'POST') return route.fulfill({ status: 201, headers, body: JSON.stringify({ ok: true, challenge: { ...challenge, status: 'accepted' }, game }) });
    if (url.pathname === '/chess/challenge/invite123') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, challenge }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@holder' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const challengePage = await challengeContext.newPage();
  await challengePage.addInitScript(() => { window.open = url => { window.__shared = url; return {}; }; history.replaceState = function() {}; });
  await challengePage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?challenge=invite123`);
  await challengePage.getByRole('button', { name: 'Accept', exact: true }).waitFor();
  assert.equal(await challengePage.locator('#gate-title').textContent(), '@dasha_player challenges you', 'exact challenge must lead the first screen');
  assert.equal(await challengePage.locator('#gate-copy').textContent(), 'Dasha has white. Take Anna.');
  assert.equal(await challengePage.getByRole('button', { name: 'Accept', exact: true }).getAttribute('class'), 'btn', 'Accept must be the single primary action for an eligible invitee');
  assert.equal(await challengePage.getByRole('button', { name: 'Accept', exact: true }).count(), 1, 'challenge must expose one Accept action');
  assert.equal(await challengePage.getByRole('button', { name: 'Share', exact: true }).getAttribute('class'), 'btn ghost', 'Share must remain secondary when Accept is available');
  assert.match(await challengePage.locator('#tournament-body').textContent(), /Dasha's challenge.*@dasha_player.*1240.*Open/s);
  assert.match(await challengePage.locator('#tournament-body').textContent(), /Open · 30m/, 'temporary challenge must disclose its remaining lifetime');
  await challengePage.getByRole('button', { name: 'Share', exact: true }).click();
  assert.match(decodeURIComponent(await challengePage.evaluate(() => window.__shared)), /Dasha has white\. Take Anna\./);
  await challengePage.getByRole('button', { name: 'Accept', exact: true }).click();
  await challengePage.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
  assert.doesNotMatch(await challengePage.locator('#tournament-body').textContent(), /Dasha's challenge/, 'accepted challenge card must leave the Play panel when its game starts');
  assert.match(await challengePage.locator('#tournament-body').textContent(), /Open a table for up to 16 holders\./, 'accepted challenge must restore the ordinary Play panel');
  assert.ok((await challengePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await challengeContext.close();

  const anonymousChallengeContext = await browser.newContext({ viewport: { width: 320, height: 720 } });
  await anonymousChallengeContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/challenge/invite123') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, challenge: { ...challenge, canAccept: false } }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: false, enrolled: false, holder: false, queued: false, game: null }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const anonymousChallengePage = await anonymousChallengeContext.newPage();
  await anonymousChallengePage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?game=x&tournament=cup12345&challenge=invite123&utm_source=x`);
  await anonymousChallengePage.locator('#gate-action').waitFor();
  await anonymousChallengePage.waitForFunction(() => document.querySelector('#gate-title')?.textContent === '@dasha_player challenges you');
  assert.equal(new URL(anonymousChallengePage.url()).search, '?challenge=invite123', 'loaded challenge must collapse mixed inbound state to one canonical object');
  assert.equal(await anonymousChallengePage.locator('#gate-title').textContent(), '@dasha_player challenges you', 'anonymous invite must preserve its context above the fold');
  assert.equal(await anonymousChallengePage.locator('#gate-copy').textContent(), 'Dasha has white. Take Anna.');
  assert.equal(await anonymousChallengePage.getByRole('button', { name: 'Accept', exact: true }).count(), 0, 'anonymous invite must not expose an impossible Accept');
  assert.ok((await anonymousChallengePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await anonymousChallengePage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?game=x&utm_source=x`);
  await anonymousChallengePage.waitForFunction(() => document.querySelector('#gate-title')?.textContent === 'Link X');
  assert.equal(new URL(anonymousChallengePage.url()).search, '?utm_source=x', 'invalid object state must be removed without discarding unrelated attribution');
  await anonymousChallengeContext.close();

  const queueContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let challengeCreates = 0;
  await queueContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: true, game: null, x: { display: '@waiting' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/challenges' && route.request().method() === 'POST') { challengeCreates++; return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, challenge: { id: 'queueinvite1', status: 'open', creator: '@waiting', creatorRating: 1200, creatorIsMe: true, canAccept: false, expiresAt: Date.now() + 30 * 60_000 } }) }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const queuePage = await queueContext.newPage();
  await queuePage.addInitScript(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__queueShare = data; } }); window.open = url => { window.__queueFallback = url; return {}; }; });
  await queuePage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await queuePage.getByRole('button', { name: 'Invite / 1v1' }).waitFor();
  assert.equal(await queuePage.locator('#gate-action').textContent(), 'Cancel', 'queue remains the primary state until the user chooses an invite');
  await queuePage.getByRole('button', { name: 'Invite / 1v1' }).click();
  await queuePage.waitForFunction(() => document.querySelector('#gate-title')?.textContent === 'Your table is open');
  await queuePage.getByRole('button', { name: 'Share', exact: true }).click();
  await queuePage.waitForFunction(() => window.__queueShare?.url || window.__queueFallback);
  assert.equal(challengeCreates, 1, 'one invite action must create one challenge');
  const queueShare = await queuePage.evaluate(() => window.__queueShare?.url || decodeURIComponent(window.__queueFallback || ''));
  assert.match(queueShare, /https:\/\/www\.getdasha\.com\/chess\?challenge=queueinvite1/, 'invite share must carry the exact www challenge link');
  assert.equal(await queuePage.locator('#gate-title').textContent(), 'Your table is open');
  assert.equal(await queuePage.locator('#gate-action').textContent(), 'Share');
  assert.equal(await queuePage.locator('#challenge-url').inputValue(), 'https://www.getdasha.com/chess?challenge=queueinvite1');
  assert.equal(await queuePage.getByRole('button', { name: 'Invite / 1v1' }).isHidden(), true, 'accepted escape hatch must not remain duplicated');
  assert.ok((await queuePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await queueContext.close();

  const lostChallengeCreateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let challengeCreatePosts = 0;
  const recoveredChallenge = { id: 'recover123', status: 'open', creator: '@holder', creatorRating: 1200, creatorIsMe: true, canAccept: false, expiresAt: Date.now() + 30 * 60_000 };
  await lostChallengeCreateContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === '/chess/challenges' && route.request().method() === 'POST') { challengeCreatePosts++; return challengeCreatePosts === 1 ? route.abort('connectionfailed') : route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, challenge: recoveredChallenge }) }); }
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: null, x: { display: '@holder' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const lostChallengeCreatePage = await lostChallengeCreateContext.newPage();
  await lostChallengeCreatePage.addInitScript(() => { history.replaceState = function (_state, _title, url) { window.__recoveredChallengeUrl = String(url); }; });
  await lostChallengeCreatePage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await lostChallengeCreatePage.getByRole('button', { name: 'Invite / 1v1' }).click();
  await lostChallengeCreatePage.waitForTimeout(1200);
  assert.equal(challengeCreatePosts, 2, `challenge recovery request count; panel: ${await lostChallengeCreatePage.locator('#tournament-body').textContent()}`);
  assert.equal(await lostChallengeCreatePage.locator('#gate-title').textContent(), 'Your table is open', `challenge recovery gate; panel: ${await lostChallengeCreatePage.locator('#tournament-body').textContent()}`);
  await lostChallengeCreatePage.getByText('Your table is open', { exact: true }).waitFor();
  assert.equal(challengeCreatePosts, 2, 'challenge creation may retry once only after a transport failure');
  assert.equal(await lostChallengeCreatePage.evaluate(() => window.__recoveredChallengeUrl), '/chess?challenge=recover123', 'bounded recovery must retain the authoritative challenge ID');
  assert.equal(await lostChallengeCreatePage.getByText('Network unavailable', { exact: true }).count(), 0, 'successful recovery must not retain a false network error');
  await lostChallengeCreateContext.close();

  const creatorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let challengeReads = 0;
  await creatorContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/challenge/invite123') { challengeReads++; return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, challenge: { ...challenge, creatorIsMe: true, canAccept: false, status: challengeReads > 1 ? 'accepted' : 'open' } }) }); }
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: challengeReads > 1 ? game : null, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const creatorPage = await creatorContext.newPage();
  await creatorPage.addInitScript(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__challengeNativeShare = data; } }); });
  await creatorPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?challenge=invite123`);
  await creatorPage.getByRole('button', { name: 'Cancel', exact: true }).waitFor();
  assert.equal(await creatorPage.getByRole('button', { name: 'Share', exact: true }).getAttribute('class'), 'btn', 'Share must be the creator primary action');
  assert.equal(await creatorPage.getByRole('button', { name: 'Cancel', exact: true }).getAttribute('class'), 'btn ghost');
  await creatorPage.getByRole('button', { name: 'Share', exact: true }).click();
  await creatorPage.waitForFunction(() => window.__challengeNativeShare?.url);
  const challengeNativeShare = await creatorPage.evaluate(() => window.__challengeNativeShare);
  assert.equal(challengeNativeShare.title, 'Dasha Chess');
  assert.equal(challengeNativeShare.url, 'https://www.getdasha.com/chess?challenge=invite123');
  assert.match(challengeNativeShare.text, /Dasha has white\. Take Anna\./);
  await creatorPage.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64, null, { timeout: 4500 });
  assert.ok(challengeReads > 1, 'open challenge must poll for acceptance');
  assert.equal(await creatorPage.locator('#game').isVisible(), true, 'creator must enter the accepted game without refreshing');
  assert.doesNotMatch(await creatorPage.locator('#tournament-body').textContent(), /Dasha's challenge|Table claimed/, 'creator must not retain a claimed challenge card after its game appears');
  assert.match(await creatorPage.locator('#tournament-body').textContent(), /Open a table for up to 16 holders\./, 'creator must return to the ordinary Play panel');
  assert.equal(new URL(creatorPage.url()).search, '', 'accepted challenge URL state must clear after the creator enters its game');
  await creatorContext.close();

  const lostMoveContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const committedBoard = [...startBoard]; committedBoard[52] = '.'; committedBoard[36] = 'P';
  const committedGame = { ...game, board: committedBoard.join(''), turn: 'b', version: 1, legal: [], moves: [{ from: 'e2', to: 'e4', san: 'e4' }] };
  let movePosts = 0, moveCommitted = false, recoveryReads = 0;
  await lostMoveContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') {
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: moveCommitted ? committedGame : game, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    }
    if (url.pathname.startsWith('/chess/game/') && route.request().method() === 'POST') { movePosts++; moveCommitted = true; return route.abort('connectionfailed'); }
    if (url.pathname.startsWith('/chess/game/')) { recoveryReads++; await new Promise(resolve => setTimeout(resolve, 250)); return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, game: committedGame }) }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const lostMovePage = await lostMoveContext.newPage();
  await lostMovePage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await lostMovePage.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
  await lostMovePage.locator('[data-square="e2"]').click();
  await lostMovePage.locator('[data-square="e4"]').click();
  await lostMovePage.waitForFunction(() => document.querySelector('#game-status')?.textContent === 'Network unavailable');
  await lostMovePage.locator('[data-square="e4"]').click();
  await lostMovePage.waitForFunction(() => document.querySelector('#turn')?.textContent === 'Anna to move');
  assert.equal(movePosts, 1, 'a lost move response must reconcile before another tap can submit');
  assert.equal(recoveryReads, 1, 'an ambiguous POST result must perform one authoritative recovery read');
  assert.match(await lostMovePage.locator('[data-square="e4"]').getAttribute('aria-label'), /Dasha pawn/);
  await lostMoveContext.close();

  const lostResignContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let resignPosts = 0, resignCommitted = false;
  await lostResignContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' }, authoritative = resignCommitted ? finished : game;
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: authoritative, x: { display: '@dasha_player' }, rating: { rating: 1212, games: 1, wins: 1, losses: 0, draws: 0 } }) });
    if (url.pathname.startsWith('/chess/game/') && route.request().method() === 'POST') { resignPosts++; resignCommitted = true; return route.abort('connectionfailed'); }
    if (url.pathname.startsWith('/chess/game/')) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, game: authoritative }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const lostResignPage = await lostResignContext.newPage();
  await lostResignPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await lostResignPage.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
  lostResignPage.once('dialog', dialog => dialog.accept());
  await lostResignPage.getByRole('button', { name: 'Resign' }).click();
  await lostResignPage.waitForFunction(() => document.querySelector('#turn')?.textContent.includes('checkmate'));
  assert.equal(resignPosts, 1, 'a committed resignation with a lost response must not be submitted twice');
  assert.equal(await lostResignPage.getByRole('button', { name: 'Resign' }).isHidden(), true, 'reconciliation must replace the apparently live board with the finished result');
  await lostResignContext.close();

  const outageActionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let outage = false, outageCommitted = false, outageMeReads = 0, outageGameReads = 0, outageActionPosts = 0;
  await outageActionContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') { outageMeReads++; return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: outageCommitted ? finished : game, x: { display: '@dasha_player' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) }); }
    if (url.pathname.startsWith('/chess/game/') && route.request().method() === 'POST') { outageActionPosts++; outage = true; outageCommitted = true; return route.abort('connectionfailed'); }
    if (url.pathname.startsWith('/chess/game/')) { outageGameReads++; if (outage) return route.abort('internetdisconnected'); return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, game: finished }) }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const outageActionPage = await outageActionContext.newPage();
  await outageActionPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await outageActionPage.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
  const meReadsBeforeOutage = outageMeReads;
  outageActionPage.once('dialog', dialog => dialog.accept());
  await outageActionPage.getByRole('button', { name: 'Resign' }).click();
  await outageActionPage.waitForFunction(() => document.querySelector('#game-status')?.textContent === 'Network unavailable');
  assert.equal(await outageActionPage.locator('#game').isVisible(), true, 'a failed reconciliation read must preserve the last known board');
  assert.equal(await outageActionPage.getByRole('button', { name: 'Resign' }).isVisible(), true, 'transport failure must not invent an unverified result');
  assert.equal(outageMeReads, meReadsBeforeOutage, 'transport failure must not replace the board through a second failing identity read');
  outage = false;
  await outageActionPage.waitForFunction(() => document.querySelector('#turn')?.textContent.includes('checkmate'), null, { timeout: 4500 });
  assert.ok(outageGameReads >= 2, 'a failed reconciliation GET must retry automatically while the browser remains online');
  assert.equal(outageActionPosts, 1, 'automatic reconciliation must never replay the ambiguous action POST');
  assert.ok(outageMeReads > meReadsBeforeOutage, 'successful reconciliation must refresh authoritative identity state');
  await outageActionContext.close();

  const recoveryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let offline = true;
  await recoveryContext.route('https://lobby.getdasha.com/**', async route => {
    if (offline) return route.abort('internetdisconnected');
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === `/chess/replay/${game.id}`) return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, replay }) });
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: false, enrolled: false, holder: false, queued: false, game: null }) });
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'not found' }) });
  });
  const recoveryPage = await recoveryContext.newPage();
  const recoveryErrors = [];
  recoveryPage.on('pageerror', error => recoveryErrors.push(String(error)));
  await recoveryPage.goto(`${new URL('./dasha-chess-page.html', import.meta.url).href}?game=${game.id}`);
  await recoveryPage.waitForFunction(() => document.querySelector('#gate-title')?.textContent === 'Replay unavailable');
  offline = false;
  await recoveryPage.evaluate(() => window.dispatchEvent(new Event('online')));
  await recoveryPage.waitForFunction(() => document.querySelector('#white-name')?.textContent?.startsWith('@') && document.querySelectorAll('.sq').length === 64);
  assert.equal(await recoveryPage.locator('#replay-controls').isVisible(), true, 'online recovery must restore the exact replay deep link');
  const identityPage = await recoveryContext.newPage();
  offline = true;
  await identityPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await identityPage.getByRole('button', { name: 'Retry', exact: true }).waitFor();
  assert.equal(await identityPage.locator('#gate-title').textContent(), 'Chess unavailable');
  assert.equal(await identityPage.locator('#gate-copy').textContent(), 'Try again.');
  offline = false;
  await identityPage.getByRole('button', { name: 'Retry', exact: true }).click();
  await identityPage.waitForFunction(() => document.querySelector('#gate-action')?.textContent === 'Link X');
  assert.equal(await identityPage.locator('#gate-title').textContent(), 'Link X', 'identity retry must restore the real gate without a reload');
  assert.deepEqual(recoveryErrors, [], 'transient network loss must not create unhandled page errors');
  await recoveryContext.close();

  const offlineClockContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await offlineClockContext.addInitScript(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); });
  let offlineClockReads = 0;
  await offlineClockContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url()), headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: false, game: { ...game, clock: { ...game.clock, w: 1, active: 'w', serverNow: Date.now() - 1000 } }, x: { display: '@offline' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) });
    if (url.pathname.startsWith('/chess/game/')) { offlineClockReads++; return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, game }) }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const offlineClockPage = await offlineClockContext.newPage();
  await offlineClockPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await offlineClockPage.waitForFunction(() => document.querySelector('#white-clock')?.textContent === '0:00');
  await offlineClockPage.evaluate(() => window.dispatchEvent(new Event('offline')));
  await offlineClockPage.waitForTimeout(1200);
  assert.equal(offlineClockReads, 0, 'expired local clock must remain network-idle while explicitly offline');
  assert.match(await offlineClockPage.locator('#game-status').textContent(), /clocks continue on the server/);
  await offlineClockContext.close();

  const visibilityContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let visibilityMeRequests = 0;
  await visibilityContext.route('https://lobby.getdasha.com/**', async route => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': 'null', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' };
    if (url.pathname === '/chess/me') { visibilityMeRequests++; return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, linked: true, enrolled: true, holder: true, queued: true, game: null, x: { display: '@waiting' }, rating: { rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 } }) }); }
    if (url.pathname === '/chess/ratings') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, ratings: [] }) });
    if (url.pathname === '/chess/tournaments') return route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, tournaments: [] }) });
    return route.fulfill({ status: 200, headers, body: '{"ok":true}' });
  });
  const visibilityPage = await visibilityContext.newPage();
  await visibilityPage.goto(new URL('./dasha-chess-page.html', import.meta.url).href);
  await visibilityPage.waitForFunction(() => document.querySelector('#gate-action')?.textContent === 'Cancel');
  await visibilityPage.evaluate(() => { window.__testHidden = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__testHidden }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenRequestCount = visibilityMeRequests;
  await visibilityPage.waitForTimeout(2700);
  assert.equal(visibilityMeRequests, hiddenRequestCount, 'hidden queued tab must stop matchmaking polling');
  await visibilityPage.evaluate(() => { window.__testHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await visibilityPage.waitForTimeout(100);
  assert.ok(visibilityMeRequests > hiddenRequestCount, 'visible queued tab must refresh immediately');
  await visibilityPage.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); window.dispatchEvent(new Event('offline')); });
  const offlineRequestCount = visibilityMeRequests;
  await visibilityPage.waitForTimeout(2700);
  assert.equal(visibilityMeRequests, offlineRequestCount, 'explicitly offline matchmaking must remain network-idle');
  await visibilityContext.close();
} finally {
  await browser.close();
}

console.log('dasha-chess-page: PASS');
