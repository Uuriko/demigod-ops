import assert from 'node:assert/strict';
import { DashaLobby } from './dasha-lobby-worker.mjs';
import { newChessState, playMove } from './dasha-chess.mjs';
import { cookieHeader, createSessionToken } from './dasha-lobby-x.mjs';

globalThis.WebSocketRequestResponsePair = class {
  constructor(request, response) { this.request = request; this.response = response; }
};

class MemoryStorage {
  constructor() { this.data = new Map(); this.alarm = null; this.writes = []; }
  async get(key) { return this.data.get(key); }
  async put(key, value) {
    this.writes.push(typeof key === 'object' ? Object.keys(key) : [key]);
    if (typeof key === 'object') for (const [name, row] of Object.entries(key)) this.data.set(name, row);
    else this.data.set(key, value);
  }
  async delete(key) { this.data.delete(key); }
  async getAlarm() { return this.alarm; }
  async setAlarm(value) { this.alarm = value; }
}

const state = {
  storage: new MemoryStorage(),
  setWebSocketAutoResponse() {},
  blockConcurrencyWhile(fn) { this.ready = fn(); },
  getWebSockets() { return []; },
};
const env = { LOBBY_SESSION_SECRET: 'chess-test-secret-that-is-long-enough', LOBBY_MOD_SECRET: 'chess-mod-secret' };
const room = new DashaLobby(state, env);
await state.ready;

const players = [
  { xId: '101', handle: 'whitecandidate', name: 'One' },
  { xId: '202', handle: 'blackcandidate', name: 'Two' },
  { xId: '303', handle: 'notaholder', name: 'Three' },
];
const cookies = {};
for (const player of players) cookies[player.xId] = cookieHeader(await createSessionToken(env, player)).split(';')[0];
room.simpProfiles = Object.fromEntries(players.map((player, index) => [player.xId, { ...player, enrolledAt: Date.now(), holderUntil: index < 2 ? Date.now() + 60_000 : 0 }]));

function request(xId, path, body) {
  return new Request(`https://lobby.getdasha.com${path}`, {
    method: body == null ? 'GET' : 'POST',
    headers: { ...(cookies[xId] ? { Cookie: cookies[xId] } : {}), Origin: 'https://www.getdasha.com', 'CF-Connecting-IP': '198.51.100.9', ...(body == null ? {} : { 'Content-Type': 'application/json' }) },
    ...(body == null ? {} : { body: JSON.stringify(body) }),
  });
}

function modRequest(path, body, authorized = true) {
  return new Request(`https://lobby.getdasha.com${path}`, {
    method: body == null ? 'GET' : 'POST',
    headers: { Origin: 'https://www.getdasha.com', ...(authorized ? { Authorization: `Bearer ${env.LOBBY_MOD_SECRET}` } : {}), ...(body == null ? {} : { 'Content-Type': 'application/json' }) },
    ...(body == null ? {} : { body: JSON.stringify(body) }),
  });
}

function delayedRequest(xId, path, body, delay) {
  const encoded = new TextEncoder().encode(JSON.stringify(body));
  return new Request(`https://lobby.getdasha.com${path}`, {
    method: 'POST', duplex: 'half',
    headers: { Cookie: cookies[xId], Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' },
    body: new ReadableStream({ async start(controller) { await new Promise(resolve => setTimeout(resolve, delay)); controller.enqueue(encoded); controller.close(); } }),
  });
}

let payload, response = await room.handleChess(request('303', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.equal(response.status, 403, 'non-holder cannot queue');
response = await room.handleChess(request(null, '/chess/event', { event: 'page_open' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'anonymous aggregate page open must not require identity');
assert.deepEqual(state.storage.writes.at(-1), ['chessMetrics'], 'high-frequency telemetry must not rewrite the retained game snapshot');
for (const event of ['link_intent', 'enrollment_intent', 'holder_proof_intent', 'queue_intent']) {
  response = await room.handleChess(request(null, '/chess/event', { event }), 'https://www.getdasha.com');
  assert.equal(response.status, 200, `${event} must remain an anonymous aggregate event`);
}
response = await room.handleChess(request(null, '/chess/event', { event: 'buy_intent' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'anonymous aggregate buy intent must not require identity');
response = await room.handleChess(request(null, '/chess/event', { event: 'replay_share' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'sharing a public replay must not require identity');
response = await room.handleChess(request(null, '/chess/event', { event: 'replay_share_handoff' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'a public replay share handoff must remain anonymous aggregate evidence');
response = await room.handleChess(request(null, '/chess/event', { event: 'replay_open' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'opening a public replay must not require identity');
response = await room.handleChess(request(null, '/chess/event', { event: 'replay_play' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'replay Play intent must not require identity');
response = await room.handleChess(request(null, '/chess/event', { event: 'tournament_share' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'sharing a public bracket must not require identity');
response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'replay_share' }) }), null);
assert.equal(response.status, 403, 'anonymous aggregate events still require a first-party origin');
const eventsBeforeMissingSubject = room.chessMetrics.pageOpens;
response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', { method: 'POST', headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'page_open' }) }), 'https://www.getdasha.com');
assert.equal(response.status, 400, 'anonymous aggregate events without a rate-limit subject must fail closed');
assert.equal(room.chessMetrics.pageOpens, eventsBeforeMissingSubject, 'unbounded anonymous events must not become public product evidence');
response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', { method: 'POST', headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json', 'Content-Length': '5000' }, body: '{}' }), 'https://www.getdasha.com');
assert.equal(response.status, 400, 'oversized Chess JSON must fail closed as 4xx instead of escaping the route');
response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', { method: 'POST', headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'page_open', padding: 'x'.repeat(5000) }) }), 'https://www.getdasha.com');
assert.equal(response.status, 400, 'actual JSON bytes must remain bounded when Content-Length is absent');

const pageOpensBeforeFlood = room.chessMetrics.pageOpens;
for (let index = 0; index < 60; index++) {
  response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', {
    method: 'POST',
    headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.42' },
    body: JSON.stringify({ event: 'page_open' }),
  }), 'https://www.getdasha.com');
  assert.equal(response.status, 200);
}
response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.42' },
  body: JSON.stringify({ event: 'page_open' }),
}), 'https://www.getdasha.com');
assert.equal(response.status, 429, 'anonymous telemetry floods must not manufacture product evidence');
assert.equal(room.chessMetrics.pageOpens, pageOpensBeforeFlood + 60, 'rejected telemetry must not increment the public funnel');
response = await room.handleChess(new Request('https://lobby.getdasha.com/chess/event', {
  method: 'POST',
  headers: { Cookie: cookies['101'], Origin: 'https://www.getdasha.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.42' },
  body: JSON.stringify({ event: 'page_open' }),
}), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'linked users must use stable identity instead of a shared network bucket');
assert.ok(room.simpRates.has('chess-event:x:101'));
room.chessMetrics.pageOpens = pageOpensBeforeFlood;
room.simpRates.delete('chess-event:203.0.113.42');
room.simpRates.delete('chess-event:x:101');

room.chessTournaments.stalecup = { id: 'stalecup', name: 'Stale Cup', organizerXId: '101', organizerHandle: 'whitecandidate', status: 'registration', entrants: [{ xId: '101', handle: 'whitecandidate' }], rounds: [], createdAt: Date.now() - 24 * 60 * 60_000 - 1 };
response = await room.handleChess(request(null, '/chess/tournament/stalecup', null), 'https://www.getdasha.com');
assert.equal(response.status, 404, 'expired registration must not block or remain public');

room.chessQueue = [{ xId: '101', handle: 'whitecandidate', at: Date.now() - 15 * 60_000 - 1 }];
room.chessTournaments.alarmcup = { id: 'alarmcup', name: 'Alarm Cup', organizerXId: '101', organizerHandle: 'whitecandidate', status: 'registration', entrants: [{ xId: '101', handle: 'whitecandidate' }], rounds: [], createdAt: Date.now() - 24 * 60 * 60_000 - 1 };
await room.alarm();
assert.deepEqual(room.chessQueue, [], 'alarm must prune stale matchmaking without another queue request');
assert.equal(room.chessTournaments.alarmcup.status, 'cancelled', 'alarm must expire stale registration without another Chess request');
assert.deepEqual(state.storage.data.get('chessState').queue, [], 'alarm cleanup must persist');
assert.equal(state.storage.data.get('chessState').tournaments.alarmcup.status, 'cancelled', 'alarm must persist tournament expiry');
assert.ok(state.storage.alarm > Date.now(), 'cleanup alarm must reschedule itself');

const beforeVoidMetrics = { ...room.chessMetrics };
const voidGame = room.makeChessGame(players[0], players[1]);
response = await room.handleChess(request(voidGame.players.w.xId, `/chess/game/${voidGame.id}`, { action: 'resign', version: 0 }), 'https://www.getdasha.com');
const voidPayload = await response.json();
assert.equal(voidPayload.game.status, 'finished');
assert.equal(voidPayload.game.rated, false, 'a game must not be rated before both players move');
assert.deepEqual(room.chessRatings, {}, 'an unplayed resignation must not change either rating');
assert.equal(room.chessMetrics.gamesCompleted, beforeVoidMetrics.gamesCompleted + 1, 'the completed table remains an honest product event');
const completedBeforeRetry = room.chessMetrics.gamesCompleted;
room.chessFinish(room.chessGames[voidGame.id], room.chessGames[voidGame.id].state);
assert.equal(room.chessMetrics.gamesCompleted, completedBeforeRetry, 'finished-game settlement must be idempotent');
delete room.chessGames[voidGame.id];
delete room.chessCurrent[players[0].xId]; delete room.chessCurrent[players[1].xId];
room.chessMetrics = beforeVoidMetrics;

const beforeClockMetrics = { ...room.chessMetrics };
const clockRace = room.makeChessGame(players[0], players[1]);
clockRace.clock.w = 40; clockRace.clock.activeSince = Date.now();
response = await room.handleChess(delayedRequest(clockRace.players.w.xId, `/chess/game/${clockRace.id}`, { from: 'e2', to: 'e4', version: 0 }, 70), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(response.status, 409, 'a move whose body finishes after the flag must lose the clock race');
assert.equal(payload.error, 'time expired');
assert.equal(room.chessGames[clockRace.id].state.moves.length, 0, 'post-flag move must never reach the position');
assert.equal(room.chessGames[clockRace.id].state.reason, 'timeout');
delete room.chessGames[clockRace.id]; delete room.chessCurrent[players[0].xId]; delete room.chessCurrent[players[1].xId];
room.chessMetrics = beforeClockMetrics;

response = await room.handleChess(request('101', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, queued: true });
response = await room.handleChess(request('202', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.equal(response.status, 201);
payload = await response.json();
assert.equal(payload.matched, true);
const gameId = payload.game.id;

const whiteX = room.chessGames[gameId].players.w.xId;
const blackX = room.chessGames[gameId].players.b.xId;
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { action: 'offer_draw', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'draw offers require one move from each player');
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { from: 'e2', to: 'e4', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
payload = await response.json();
assert.equal(payload.game.turn, 'b');
assert.equal(payload.game.legal.length, 0, 'white viewer must not receive black legal moves');
response = await room.handleChess(request(blackX, `/chess/game/${gameId}`, { from: 'e7', to: 'e5', version: 1 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { action: 'offer_draw', version: 2 }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'player to move cannot offer before moving');
response = await room.handleChess(request(blackX, `/chess/game/${gameId}`, { action: 'offer_draw', version: 2 }), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.game.drawOffer, 'mine');
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, null), 'https://www.getdasha.com');
assert.equal((await response.json()).game.drawOffer, 'theirs');
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { from: 'g1', to: 'f3', version: 2 }), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.game.drawOffer, null, 'a move must decline the outstanding draw offer');

response = await room.handleChess(request(blackX, `/chess/game/${gameId}`, { action: 'resign', version: 3 }), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.game.status, 'finished');
assert.equal(payload.game.result, '1-0');
assert.equal(room.chessRatings[whiteX].rating, 1212);
assert.equal(room.chessRatings[blackX].rating, 1188);
assert.ok(room.chessGames[gameId].finishedAt, 'finished games need an immutable discovery timestamp');

const beforeDrawMetrics = { ...room.chessMetrics };
const beforeDrawRatings = structuredClone(room.chessRatings);
const agreed = room.makeChessGame({ xId: '101', handle: 'whitecandidate' }, { xId: '202', handle: 'blackcandidate' });
agreed.state.moves.push({ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' });
response = await room.handleChess(request(agreed.players.b.xId, `/chess/game/${agreed.id}`, { action: 'offer_draw', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
response = await room.handleChess(request(agreed.players.w.xId, `/chess/game/${agreed.id}`, { action: 'offer_draw', version: 0 }), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.game.result, '1/2-1/2');
assert.equal(payload.game.reason, 'draw agreed');
delete room.chessGames[agreed.id];
delete room.chessCurrent['101']; delete room.chessCurrent['202'];
room.chessRatings = beforeDrawRatings;
room.chessMetrics = beforeDrawMetrics;

response = await room.handleChess(request(null, `/chess/replay/${gameId}`, null), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.replay.frames.length, 4);
assert.doesNotMatch(JSON.stringify(payload), /"xId"|"whiteXId"|"blackXId"/, 'public replay leaked identity keys');
const olderGame = structuredClone(room.chessGames[gameId]);
olderGame.id = 'oldergame'; olderGame.finishedAt--; olderGame.updatedAt += 60_000;
room.chessGames[olderGame.id] = olderGame;
for (let index = 0; index < 5; index++) room.chessGames[`archive${index}`] = { ...structuredClone(olderGame), id: `archive${index}`, finishedAt: olderGame.finishedAt - index - 1 };
room.chessGames.unratednew = { ...structuredClone(olderGame), id: 'unratednew', rated: false, finishedAt: room.chessGames[gameId].finishedAt + 1 };
response = await room.handleChess(request(null, '/chess/ratings', null), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.recent[0].id, gameId, 'recent games must sort by immutable completion time, not later rematch activity');
assert.equal(payload.recent.length, 5, 'public recent games must remain a bounded shelf');
assert.equal(payload.recent.some(row => row.id === 'unratednew'), false, 'unrated results must not enter public discovery');
assert.deepEqual(payload.recent[0], { id: gameId, white: `@${room.chessGames[gameId].players.w.handle}`, black: `@${room.chessGames[gameId].players.b.handle}`, result: '1-0' }, 'public Chess discovery must expose only the bounded replay summary');
assert.doesNotMatch(JSON.stringify(payload.recent), /xId|wallet|balance|moves|board/, 'recent-game shelf leaked private or heavy game state');
response = await room.handleChess(modRequest('/chess/mod/ratings', { action: 'hide', handle: room.chessGames[gameId].players.w.handle }, false), 'https://www.getdasha.com');
assert.equal(response.status, 403, 'public users must never alter Chess discovery moderation');
room.chessRatings.duplicateHistoric = { ...room.chessRatings[whiteX] };
response = await room.handleChess(modRequest('/chess/mod/ratings', { action: 'hide', handle: room.chessGames[gameId].players.w.handle }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'a reassigned historic handle must fail closed instead of hiding the wrong identity');
delete room.chessRatings.duplicateHistoric;
response = await room.handleChess(modRequest('/chess/mod/ratings', { action: 'hide', handle: `@${room.chessGames[gameId].players.w.handle}` }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, handle: room.chessGames[gameId].players.w.handle, hidden: true });
response = await room.handleChess(modRequest('/chess/mod/ratings', null), 'https://www.getdasha.com');
assert.deepEqual((await response.json()).hidden, [room.chessGames[gameId].players.w.handle], 'moderators need a bounded reversible hidden list');
response = await room.handleChess(request(null, '/chess/ratings', null), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.ratings.some(row => row.handle === room.chessGames[gameId].players.w.handle), false, 'rank-banned identity must leave the public table');
assert.equal(payload.recent.some(row => row.id === gameId), false, 'rank-banned games must leave public discovery');
response = await room.handleChess(request(null, `/chess/replay/${gameId}`, null), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'reversible rank moderation must preserve the public game record');
response = await room.handleChess(modRequest('/chess/mod/ratings', { action: 'unhide', handle: room.chessGames[gameId].players.w.handle }), 'https://www.getdasha.com');
assert.equal((await response.json()).hidden, false);
response = await room.handleChess(request(null, '/chess/ratings', null), 'https://www.getdasha.com');
assert.equal((await response.json()).recent[0].id, gameId, 'unhide must restore discovery without rewriting history');
for (const id of ['oldergame', 'archive0', 'archive1', 'archive2', 'archive3', 'archive4', 'unratednew']) delete room.chessGames[id];

response = await room.handleChess(request('303', `/chess/game/${gameId}`, null), 'https://www.getdasha.com');
assert.equal(response.status, 404, 'nonparticipant cannot read a game');
response = await room.handleChess(request(whiteX, '/chess/event', { event: 'replay_share' }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
response = await room.handleChess(request(whiteX, '/chess/event', { event: 'invented' }), 'https://www.getdasha.com');
assert.equal(response.status, 400, 'unknown chess events must not enter metrics');

room.chessGames.conflict1 = { id: 'conflict1', state: { status: 'active' } };
room.chessCurrent[blackX] = 'conflict1';
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { action: 'rematch', version: 4 }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'a stale finished game must not overwrite an opponent active elsewhere');
delete room.chessGames.conflict1; room.chessCurrent[blackX] = gameId;
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { action: 'rematch', version: 4 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
assert.equal((await response.json()).game.rematchOffer, 'mine', 'first rematch action must create an offer, not a game');
response = await room.handleChess(request(blackX, `/chess/game/${gameId}`, null), 'https://www.getdasha.com');
assert.equal((await response.json()).game.rematchOffer, 'theirs');
response = await room.handleChess(request(blackX, `/chess/game/${gameId}`, { action: 'rematch', version: 4 }), 'https://www.getdasha.com');
assert.equal(response.status, 201);
const casualRematch = (await response.json()).game;
assert.equal(casualRematch.white.handle, room.chessGames[gameId].players.b.handle, 'rematch must swap Dasha white and Anna black');
assert.equal(casualRematch.black.handle, room.chessGames[gameId].players.w.handle, 'rematch must swap both colors');
response = await room.handleChess(request(whiteX, `/chess/game/${gameId}`, { action: 'rematch', version: 4 }), 'https://www.getdasha.com');
assert.equal((await response.json()).game.id, casualRematch.id, 'duplicate acceptance must reuse the existing rematch');
delete room.chessGames[casualRematch.id];
delete room.chessGames[gameId].rematchOfferBy;
delete room.chessGames[gameId].rematchGameId;
room.chessCurrent[whiteX] = gameId; room.chessCurrent[blackX] = gameId;

const beforeChallengeMetrics = { ...room.chessMetrics };
room.chessQueue.push({ xId: '101', handle: 'whitecandidate', at: Date.now() });
response = await room.handleChess(request('101', '/chess/challenges', {}), 'https://www.getdasha.com');
assert.equal(response.status, 201);
const challenge = (await response.json()).challenge;
assert.equal(room.chessQueue.some(row => row.xId === '101'), false, 'creating a challenge must leave casual matchmaking');
room.chessQueue.push({ xId: '101', handle: 'whitecandidate', at: Date.now() });
assert.equal(room.pruneChessQueue(), true, 'stale queue state cannot expose an open challenger to casual matchmaking');
assert.equal(room.chessQueue.some(row => row.xId === '101'), false, 'open challenge must reserve its creator from matchmaking');
assert.doesNotMatch(JSON.stringify(challenge), /xId|holder|wallet/i, 'public challenge leaked private identity or holder state');
response = await room.handleChess(request('101', '/chess/challenges', {}), 'https://www.getdasha.com');
assert.equal((await response.json()).challenge.id, challenge.id, 'creator must reuse one open challenge');
response = await room.handleChess(request(null, `/chess/challenge/${challenge.id}`, null), 'https://www.getdasha.com');
assert.equal((await response.json()).challenge.creator, '@whitecandidate');
response = await room.handleChess(request('101', `/chess/challenge/${challenge.id}`, { action: 'accept' }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'creator cannot accept their own challenge');
response = await room.handleChess(request('202', `/chess/challenge/${challenge.id}`, { action: 'accept' }), 'https://www.getdasha.com');
assert.equal(response.status, 201);
const challengedGame = (await response.json()).game;
assert.equal(challengedGame.white.handle, 'whitecandidate', 'challenger must take Dasha white');
assert.equal(challengedGame.black.handle, 'blackcandidate', 'accepting player must take Anna black');
const acceptedBeforeRetry = room.chessMetrics.challengesAccepted;
response = await room.handleChess(request('202', `/chess/challenge/${challenge.id}`, { action: 'accept' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'the same accepter must be able to recover an already-created game after a lost response');
assert.equal((await response.json()).game.id, challengedGame.id, 'accept recovery must return the original game');
assert.equal(room.chessMetrics.challengesAccepted, acceptedBeforeRetry, 'accept recovery must not manufacture another acceptance');
room.simpProfiles['303'].holderUntil = Date.now() + 60_000;
response = await room.handleChess(request('303', `/chess/challenge/${challenge.id}`, { action: 'accept' }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'another identity cannot claim an accepted challenge');
delete room.chessGames[challengedGame.id]; delete room.chessCurrent['101']; delete room.chessCurrent['202']; delete room.chessChallenges[challenge.id];
room.chessMetrics = { ...beforeChallengeMetrics };

response = await room.handleChess(request('202', '/chess/challenges', {}), 'https://www.getdasha.com');
const cancelledChallenge = (await response.json()).challenge;
response = await room.handleChess(request('101', `/chess/challenge/${cancelledChallenge.id}`, { action: 'cancel' }), 'https://www.getdasha.com');
assert.equal(response.status, 403, 'only creator can cancel a challenge');
response = await room.handleChess(request('202', `/chess/challenge/${cancelledChallenge.id}`, { action: 'cancel' }), 'https://www.getdasha.com');
assert.equal((await response.json()).challenge.status, 'cancelled');
delete room.chessChallenges[cancelledChallenge.id]; room.chessMetrics = { ...beforeChallengeMetrics };

room.chessChallenges.expired1 = { id: 'expired1', creatorXId: '101', creatorHandle: 'whitecandidate', status: 'open', createdAt: Date.now() - 31 * 60_000, expiresAt: Date.now() - 1, updatedAt: Date.now() - 31 * 60_000 };
assert.equal(room.expireChessChallenges(), true);
assert.equal(room.chessChallenges.expired1.status, 'expired');
delete room.chessChallenges.expired1;

const looking = [];
const priorBroadcast = room.broadcast.bind(room);
const lookingMetrics = { ...room.chessMetrics };
room.broadcast = function (obj, except) { looking.push(obj); return priorBroadcast(obj, except); };
room.chessLooking = {};
room.chessQueue = [];
room.simpRates.delete('chess-looking:101');
response = await room.handleChess(request('101', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, queued: true });
const lookingPings = looking.filter(row => row.type === 'system' && row.lookingFor && !row.lookingFor.expired);
assert.equal(lookingPings.length, 1, 'find-match must broadcast one looking-for ping');
assert.match(lookingPings[0].text, /https:\/\/www\.getdasha\.com\/chess\?join=queue/);
assert.equal(lookingPings[0].lookingFor.url, 'https://www.getdasha.com/chess?join=queue');
response = await room.handleChess(request('101', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, queued: true });
assert.equal(looking.filter(row => row.type === 'system' && row.lookingFor && !row.lookingFor.expired).length, 1, 're-queue must not spam a second looking-for');
response = await room.handleChess(request('101', '/chess/queue', { action: 'cancel' }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, queued: false });
assert.equal(looking.some(row => row.lookingFor && row.lookingFor.expired), true, 'cancel must expire the looking-for ping');
response = await room.handleChess(request('101', '/chess/challenges', { askLobby: true }), 'https://www.getdasha.com');
const askedChallenge = (await response.json()).challenge;
assert.equal(looking.filter(row => row.lookingFor && row.lookingFor.kind === 'challenge' && !row.lookingFor.expired).length, 1, 'ask-lobby must broadcast one challenge Join URL');
assert.match(looking.find(row => row.lookingFor && row.lookingFor.kind === 'challenge').text, new RegExp(`https://www\\.getdasha\\.com/chess\\?challenge=${askedChallenge.id}`));
room.simpProfiles['303'].holderUntil = 0;
response = await room.handleChess(request('303', `/chess/challenge/${askedChallenge.id}`, { action: 'accept' }), 'https://www.getdasha.com');
assert.equal(response.status, 403, 'accept stays holder-gated');
response = await room.handleChess(request('101', `/chess/challenge/${askedChallenge.id}`, { action: 'cancel' }), 'https://www.getdasha.com');
assert.equal((await response.json()).challenge.status, 'cancelled');
assert.equal(looking.filter(row => row.lookingFor && row.lookingFor.expired && String(row.lookingFor.id).includes(askedChallenge.id)).length, 1);
delete room.chessChallenges[askedChallenge.id];
room.broadcast = priorBroadcast;
room.chessLooking = {};
room.simpRates.delete('chess-looking:101');
room.chessQueue = [];
room.chessMetrics = lookingMetrics;

for (let i = 0; i < 101; i++) room.chessGames[`archive-${i}`] = { id: `archive-${i}`, state: { status: 'finished' }, updatedAt: Date.now() + i };
response = await room.handleChess(request('101', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, queued: true });
response = await room.handleChess(request('202', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
const replayRetentionGame = (await response.json()).game;
response = await room.handleChess(request(room.chessGames[replayRetentionGame.id].players.b.xId, `/chess/game/${replayRetentionGame.id}`, { action: 'resign', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
assert.ok(room.chessGames[gameId], 'creating game 101 must not delete an already shared replay');
for (let i = 0; i < 101; i++) delete room.chessGames[`archive-${i}`];

response = await room.handleChess(request('101', '/chess/tournaments', { name: 'First Dasha Cup' }), 'https://www.getdasha.com');
assert.equal(response.status, 201);
const tournamentId = (await response.json()).tournament.id;
const tournamentsBeforeCreateRetry = room.chessMetrics.tournamentsCreated;
response = await room.handleChess(request('101', '/chess/tournaments', { name: 'First Dasha Cup' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'an organizer must recover an open tournament after a lost create response');
assert.equal((await response.json()).tournament.id, tournamentId, 'a create retry must return the original tournament');
assert.equal(room.chessMetrics.tournamentsCreated, tournamentsBeforeCreateRetry, 'a create retry must not manufacture another tournament');
room.chessQueue.push({ xId: '202', handle: 'blackcandidate', at: Date.now() });
room.chessChallenges.joinconflict = { id: 'joinconflict', creatorXId: '202', creatorHandle: 'blackcandidate', status: 'open', createdAt: Date.now(), expiresAt: Date.now() + 60_000, updatedAt: Date.now() };
response = await room.handleChess(request('202', `/chess/tournament/${tournamentId}`, { action: 'join' }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'an open challenge must block joining a conflicting tournament');
delete room.chessChallenges.joinconflict;
response = await room.handleChess(request('202', `/chess/tournament/${tournamentId}`, { action: 'join' }), 'https://www.getdasha.com');
assert.equal((await response.json()).tournament.entrants.length, 2);
assert.equal(room.chessQueue.some(row => row.xId === '202'), false, 'joining a tournament must leave casual matchmaking');
const joinedEntrants = room.chessTournaments[tournamentId].entrants;
room.chessTournaments[tournamentId].entrants = [...joinedEntrants, ...Array.from({ length: 14 }, (_, index) => ({ xId: `full-${index}`, handle: `full${index}` }))];
const joinsAtCapacity = room.chessMetrics.tournamentJoins;
response = await room.handleChess(request('202', `/chess/tournament/${tournamentId}`, { action: 'join' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'a joined holder must be able to retry enrollment after the bracket fills');
assert.equal((await response.json()).tournament.entrants.length, 16, 'an enrollment retry must not duplicate the holder');
assert.equal(room.chessMetrics.tournamentJoins, joinsAtCapacity, 'an enrollment retry must not manufacture a second join');
room.chessTournaments[tournamentId].entrants = joinedEntrants;
response = await room.handleChess(request('202', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'a registered tournament entrant must not re-enter casual matchmaking');
response = await room.handleChess(request('202', '/chess/challenges', {}), 'https://www.getdasha.com');
assert.equal(response.status, 409, 'a registered tournament entrant must not open a conflicting public challenge');
response = await room.handleChess(request('101', `/chess/tournament/${tournamentId}`, { action: 'start' }), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.tournament.status, 'active');
assert.equal(payload.tournament.rounds.length, 1);
const startedGameId = room.chessTournaments[tournamentId].rounds[0].matches[0].currentGameId;
const startsBeforeRetry = room.chessMetrics.tournamentsStarted;
response = await room.handleChess(request('101', `/chess/tournament/${tournamentId}`, { action: 'start' }), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'the organizer must recover an already-started bracket after a lost response');
assert.equal((await response.json()).tournament.rounds.length, 1, 'a Start retry must not create another round');
assert.equal(room.chessTournaments[tournamentId].rounds[0].matches[0].currentGameId, startedGameId, 'a Start retry must retain the original game');
assert.equal(room.chessMetrics.tournamentsStarted, startsBeforeRetry, 'a Start retry must not manufacture another tournament start');
assert.doesNotMatch(JSON.stringify(payload.tournament), /"gameId"/, 'public bracket must not expose an active game identifier before it becomes a replay');
assert.equal(room.chessQueue.some(row => ['101', '202'].includes(row.xId)), false, 'tournament start must purge every entrant from casual matchmaking');
assert.doesNotMatch(JSON.stringify(payload), /"xId"|"organizerXId"/, 'public bracket leaked identity keys');
room.chessQueue.push({ xId: '101', handle: 'whitecandidate', at: Date.now() });
room.simpProfiles['303'].holderUntil = Date.now() + 60_000;
response = await room.handleChess(request('303', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.deepEqual(await response.json(), { ok: true, queued: true }, 'active tournament entrant must never become a casual opponent');
const tournamentGame = room.chessGames[room.chessTournaments[tournamentId].rounds[0].matches[0].currentGameId];
tournamentGame.state.moves.push({ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' });
response = await room.handleChess(request(tournamentGame.players.b.xId, `/chess/game/${tournamentGame.id}`, { action: 'offer_draw', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
response = await room.handleChess(request(tournamentGame.players.w.xId, `/chess/game/${tournamentGame.id}`, { action: 'offer_draw', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
const tournamentMatch = room.chessTournaments[tournamentId].rounds[0].matches[0];
const rematch = room.chessGames[tournamentMatch.currentGameId];
assert.equal(room.chessTournaments[tournamentId].status, 'active', 'drawn tournament match must await a decisive rematch');
assert.deepEqual(tournamentMatch.gameIds, [tournamentGame.id, rematch.id], 'bracket must retain both replay IDs');
assert.deepEqual(room.publicChessTournament(room.chessTournaments[tournamentId]).rounds[0].matches[0].replays, [tournamentGame.id], 'public bracket must expose the completed draw while its rematch is live');
assert.equal(rematch.players.w.xId, tournamentGame.players.b.xId, 'tournament rematch must swap colors');
assert.equal(rematch.players.b.xId, tournamentGame.players.w.xId, 'tournament rematch must swap colors');
response = await room.handleChess(request(rematch.players.b.xId, `/chess/game/${rematch.id}`, { action: 'resign', version: 0 }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
assert.equal(room.chessTournaments[tournamentId].status, 'finished');
assert.equal(room.chessTournaments[tournamentId].champion.xId, rematch.players.w.xId);
assert.deepEqual(room.publicChessTournament(room.chessTournaments[tournamentId]).rounds[0].matches[0].replays, [tournamentGame.id, rematch.id], 'public bracket must retain every completed game in the match');
room.deleteChessIdentity('101');
assert.equal(room.chessTournaments[tournamentId], undefined, 'identity deletion must purge its tournament');
assert.equal(Object.values(room.chessGames).some(game => game.players?.w?.xId === '101' || game.players?.b?.xId === '101'), false, 'identity deletion must purge its games');
response = await room.handleChess(request('202', '/chess/tournaments', { name: 'Cancel Me Cup' }), 'https://www.getdasha.com');
assert.equal(response.status, 201);
const cancelledId = (await response.json()).tournament.id;
response = await room.handleChess(request('202', `/chess/tournament/${cancelledId}`, { action: 'cancel' }), 'https://www.getdasha.com');
assert.equal((await response.json()).tournament.status, 'cancelled');
response = await room.handleChess(request(null, `/chess/tournament/${cancelledId}`, null), 'https://www.getdasha.com');
assert.equal(response.status, 404, 'cancelled tournament deep link must disappear');
assert.deepEqual(room.chessMetrics, {
  since: room.chessMetrics.since,
  pageOpens: 1,
  linkIntents: 1,
  enrollmentIntents: 1,
  holderProofIntents: 1,
  queueIntents: 1,
  buyIntents: 1,
  gamesStarted: 5,
  gamesCompleted: 4,
  rematchesOffered: 1,
  rematchesAccepted: 1,
  replayShareIntents: 2,
  replayShareHandoffs: 1,
  replayOpens: 1,
  replayPlayIntents: 1,
  challengesCreated: 0,
  challengesAccepted: 0,
  challengeShareIntents: 0,
  tournamentsCreated: 2,
  tournamentJoins: 1,
  tournamentsStarted: 1,
  tournamentsCompleted: 1,
  tournamentShareIntents: 1,
});
const oddPlayers = Array.from({ length: 5 }, (_, index) => ({ xId: `odd-${index}`, handle: `odd${index}` }));
const oddTournament = { id: 'oddcup', name: 'Odd Cup', organizerXId: oddPlayers[0].xId, organizerHandle: oddPlayers[0].handle, status: 'active', entrants: oddPlayers, rounds: [], champion: null, createdAt: Date.now(), startedAt: Date.now(), finishedAt: null };
room.chessTournaments[oddTournament.id] = oddTournament;
room.startTournamentRound(oddTournament, oddPlayers);
const openingRoundIds = oddTournament.rounds[0].byes.map(player => player.xId).concat(oddTournament.rounds[0].matches.flatMap(match => [match.whiteXId, match.blackXId]));
assert.deepEqual([...openingRoundIds].sort(), oddPlayers.map(player => player.xId).sort(), 'an odd opening round must preserve every entrant exactly once');
let oddRounds = 0;
while (oddTournament.status === 'active' && oddRounds++ < 8) {
  const round = oddTournament.rounds.at(-1);
  for (const match of round.matches.filter(row => !row.winnerXId)) {
    const game = room.chessGames[match.currentGameId];
    room.chessFinish(game, { ...game.state, moves: [{ from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' }], status: 'finished', result: '1-0', reason: 'checkmate', version: Number(game.state.version) + 1 });
  }
}
assert.equal(oddTournament.status, 'finished', 'a five-player bracket must converge to one champion');
assert.ok(oddPlayers.some(player => player.xId === oddTournament.champion.xId), 'the champion must be an original entrant');
assert.deepEqual(oddTournament.rounds.map(round => [round.matches.length, round.byes.length]), [[2, 1], [1, 1], [1, 0]], 'five entrants must advance through a complete 2+bye, 1+bye, final bracket');
const oddPublic = room.publicChessTournament(oddTournament);
assert.equal(oddPublic.rounds.flatMap(round => round.matches).every(match => match.status === 'done' && match.replays.length === 1), true, 'every decisive odd-bracket match must retain one public replay');
for (const [id, game] of Object.entries(room.chessGames)) if (game.tournamentId === oddTournament.id) delete room.chessGames[id];
for (const player of oddPlayers) { delete room.chessRatings[player.xId]; delete room.chessCurrent[player.xId]; }
delete room.chessTournaments[oddTournament.id];
room.chessTournaments.regsafe = { id: 'regsafe', status: 'registration', organizerXId: '202', entrants: [{ xId: '202', handle: 'black' }, { xId: '303', handle: 'watcher' }], rounds: [] };
room.deleteChessIdentity('303');
assert.deepEqual(room.chessTournaments.regsafe.entrants.map(player => player.xId), ['202'], 'registration deletion must remove only the departing entrant');
const victimGame = room.makeChessGame({ xId: '101', handle: 'white' }, { xId: '202', handle: 'black' }, { tournamentId: 'mixedcup', matchId: 'victim' });
const preservedGame = room.makeChessGame({ xId: '505', handle: 'five' }, { xId: '606', handle: 'six' }, { tournamentId: 'mixedcup', matchId: 'preserved' });
room.chessTournaments.mixedcup = { id: 'mixedcup', status: 'active', organizerXId: '101', entrants: [{ xId: '101' }, { xId: '202' }, { xId: '505' }, { xId: '606' }], rounds: [{ byes: [], matches: [{ gameIds: [victimGame.id] }, { gameIds: [preservedGame.id] }] }] };
room.deleteChessIdentity('101');
assert.equal(room.chessTournaments.mixedcup, undefined);
assert.equal(room.chessGames[victimGame.id], undefined, 'departing identity game must be purged');
assert.ok(room.chessGames[preservedGame.id], 'unrelated tournament game must survive');
assert.equal(room.chessGames[preservedGame.id].tournamentId, undefined, 'surviving game must become standalone');
assert.equal(room.chessCurrent['505'], preservedGame.id, 'unrelated player must keep their game');

const deadTimeoutGame = room.makeChessGame({ xId: '101', handle: 'whitecandidate' }, { xId: '202', handle: 'blackcandidate' });
deadTimeoutGame.state.board = Array(64).fill('.'); deadTimeoutGame.state.board[60] = 'K'; deadTimeoutGame.state.board[48] = 'P'; deadTimeoutGame.state.board[4] = 'k';
deadTimeoutGame.clock.w = 1; deadTimeoutGame.clock.activeSince = Date.now() - 100;
response = await room.handleChess(request('101', `/chess/game/${deadTimeoutGame.id}`, null), 'https://www.getdasha.com');
payload = await response.json();
assert.equal(payload.game.result, '1/2-1/2', 'timeout cannot award a bare king a win merely because the flagging side has a pawn');
assert.equal(payload.game.reason, 'timeout · no mating material');

const timeoutGame = room.makeChessGame({ xId: '101', handle: 'whitecandidate' }, { xId: '202', handle: 'blackcandidate' });
timeoutGame.clock.w = 1;
timeoutGame.clock.activeSince = Date.now() - 100;
response = await room.handleChess(request('101', `/chess/game/${timeoutGame.id}`, null), 'https://www.getdasha.com');
assert.equal(response.status, 200);
payload = await response.json();
assert.equal(payload.game.status, 'finished');
assert.equal(payload.game.reason, 'timeout');
assert.equal(payload.game.result, '0-1');
assert.equal(payload.game.clock.w, 0);
response = await room.handleChess(request(null, `/chess/replay/${timeoutGame.id}`, null), 'https://www.getdasha.com');
assert.equal(response.status, 200, 'timed-out game must have a public replay');
response = await room.handleChess(request('101', '/chess/queue', { action: 'join' }), 'https://www.getdasha.com');
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true, queued: true });
assert.equal(room.chessCurrent['101'], undefined, 'requeue must release the finished current game');

const stressState = {
  storage: new MemoryStorage(),
  setWebSocketAutoResponse() {},
  blockConcurrencyWhile(fn) { this.ready = fn(); },
  getWebSockets() { return []; },
};
const stressRoom = new DashaLobby(stressState, env);
await stressState.ready;
const entrants = Array.from({ length: 16 }, (_, index) => ({ xId: `stress-${index}`, handle: `player${index}` }));
const stressTournament = { id: 'stresscup', name: 'Sixteen Seat Cup', organizerXId: entrants[0].xId, organizerHandle: entrants[0].handle, status: 'active', entrants, rounds: [], champion: null, createdAt: Date.now(), startedAt: Date.now(), finishedAt: null };
stressRoom.chessTournaments[stressTournament.id] = stressTournament;
stressRoom.startTournamentRound(stressTournament, entrants);
while (stressTournament.status === 'active') {
  const round = stressTournament.rounds.at(-1);
  for (const match of [...round.matches]) {
    const game = stressRoom.chessGames[match.currentGameId];
    let played = playMove(newChessState(), { from: 'e2', to: 'e4' }).state;
    played = playMove(played, { from: 'e7', to: 'e5' }).state;
    stressRoom.chessFinish(game, { ...played, status: 'finished', result: '1-0', reason: 'checkmate' });
  }
}
assert.deepEqual(stressTournament.rounds.map(round => round.matches.length), [8, 4, 2, 1], 'sixteen entrants must settle through four complete rounds');
assert.equal(Object.keys(stressRoom.chessGames).length, 15, 'single-elimination bracket must create exactly fifteen decisive games');
assert.equal(stressRoom.chessMetrics.gamesCompleted, 15);
assert.ok(entrants.some(player => player.xId === stressTournament.champion.xId), 'champion must be one of the original entrants');
const publicStress = stressRoom.publicChessTournament(stressTournament);
assert.equal(publicStress.rounds.flatMap(round => round.matches).flatMap(match => match.replays).length, 15, 'every completed bracket game must remain replayable');
assert.doesNotMatch(JSON.stringify(publicStress), /xId|currentGameId|wallet|holder/i, 'completed bracket must not leak private or active identifiers');
assert.ok(stressRoom.chessStorageBytes() < 1_000_000, 'a full sixteen-seat cup must stay below the documented storage migration trigger');

console.log('dasha-chess-worker: PASS');
