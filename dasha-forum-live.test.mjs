#!/usr/bin/env node
/**
 * The forum's authenticated path, and the chess push's delivery — the two things that shipped
 * without ever being exercised.
 *
 * dasha-forum.test.mjs proves the rules, dasha-forum-worker.test.mjs proves the storage shape, and
 * dasha-chess-push.test.mjs proves the frame matches what the page filters on. All three read code
 * or call pure functions. None of them ever posted a thread or delivered a frame to a socket, so
 * everything past "is the session real" was unproven in production.
 *
 * This drives the real DashaLobby against a fake Durable Object state: real handleForum, real
 * sessionFromRequest, real signed cookies, real storage semantics including the 128 KiB ceiling.
 * Matchmaking is not reachable here — queueing wants a Simp profile and an on-chain holder proof —
 * so the chess half tests broadcastChess directly, which is the part that was wrong.
 *
 *   node dasha-forum-live.test.mjs
 */
import assert from 'node:assert/strict';

/* Two Cloudflare runtime globals the constructor reaches for. Stubbed before the import so the
   class can be built under plain Node — the point is to exercise the handlers, not the platform. */
globalThis.WebSocketRequestResponsePair ??= class { constructor(request, response) { this.request = request; this.response = response; } };

const { DashaLobby } = await import('./dasha-lobby-worker.mjs');
const { signPayload } = await import('./dasha-lobby-x.mjs');

const SECRET = 'test-secret-for-local-verification-only';
const ORIGIN = 'https://www.getdasha.com';
const env = { LOBBY_SESSION_SECRET: SECRET, ALLOWED_ORIGINS: ORIGIN, MINT: 'x' };

/** A Durable Object storage stand-in with the semantics the handler actually relies on. */
function fakeState() {
  const map = new Map();
  return {
    blockConcurrencyWhile: async (fn) => fn(),
    getWebSockets: () => [],
    setWebSocketAutoResponse: () => {},
    storage: {
      get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : undefined),
      put: async (k, v) => {
        if (typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) map.set(kk, structuredClone(vv)); return; }
        /* The real ceiling, enforced. This is the failure the single-key design would have hit. */
        const bytes = new TextEncoder().encode(JSON.stringify(v)).length;
        assert.ok(bytes <= 128 * 1024, `storage.put(${k}) wrote ${(bytes / 1024).toFixed(0)} KiB, over the 128 KiB value limit`);
        map.set(k, structuredClone(v));
      },
      delete: async (k) => { map.delete(k); },
      list: async ({ prefix } = {}) => new Map([...map].filter(([k]) => !prefix || k.startsWith(prefix))),
      setAlarm: async () => {},
      getAlarm: async () => null,
    },
    _map: map,
  };
}

const cookieFor = async (handle, xId) =>
  `__Host-dasha_x=${await signPayload(SECRET, { v: 1, handle, xId, name: handle, exp: Date.now() + 3_600_000 })}`;

const call = (lobby, path, { method = 'GET', body, cookie } = {}) =>
  lobby.handleForum(new Request(`https://lobby.getdasha.com${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Origin: ORIGIN,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), ORIGIN);

const read = async (res) => ({ status: res.status, data: await res.json() });

// ---- the cookie must actually authenticate --------------------------------------
{
  const lobby = new DashaLobby(fakeState(), env);
  const anon = await read(await call(lobby, '/forum/threads', { method: 'POST', body: { title: 'x', text: 'y' } }));
  assert.equal(anon.status, 401, 'no cookie is refused');

  const cookie = await cookieFor('dash_eats', '111');
  const made = await read(await call(lobby, '/forum/threads', { method: 'POST', body: { title: 'First thread', text: 'Opening post.' }, cookie }));
  assert.equal(made.status, 200, `a signed session must be accepted, got ${JSON.stringify(made.data)}`);
  assert.equal(made.data.thread.handle, 'dash_eats', 'the handle comes from the session, not the body');
  assert.ok(made.data.thread.id, 'the thread gets an id');

  /* Identity must not be forgeable through the body — the whole reason handleForum ignores it. */
  const spoof = await read(await call(lobby, '/forum/threads', {
    method: 'POST', body: { title: 'Spoofed', text: 'hi', handle: 'elonmusk', avatar: 'http://evil' }, cookie,
  }));
  assert.equal(spoof.data.thread.handle, 'dash_eats', 'a handle in the body must be ignored');
}

// ---- a thread round-trips, and replies count ------------------------------------
{
  const lobby = new DashaLobby(fakeState(), env);
  const a = await cookieFor('dash_eats', '111');
  const b = await cookieFor('anna', '222');
  const made = await read(await call(lobby, '/forum/threads', { method: 'POST', body: { title: 'Round trip', text: 'Opener.' }, cookie: a }));
  const id = made.data.thread.id;

  const got = await read(await call(lobby, `/forum/thread/${id}`));
  assert.equal(got.status, 200, 'a thread reads back');
  assert.equal(got.data.posts.length, 1, 'the opener is there');
  assert.equal(got.data.posts[0].text, 'Opener.');

  const replied = await read(await call(lobby, `/forum/thread/${id}`, { method: 'POST', body: { text: 'A reply.' }, cookie: b }));
  assert.equal(replied.status, 200, `a reply from a second session is accepted, got ${JSON.stringify(replied.data)}`);
  assert.equal(replied.data.post.handle, 'anna');

  const after = await read(await call(lobby, `/forum/thread/${id}`));
  assert.equal(after.data.posts.length, 2, 'the reply is persisted');
  const list = await read(await call(lobby, '/forum/threads'));
  const row = list.data.threads.find((t) => t.id === id);
  assert.equal(row.replies, 1, 'the index reply count follows the posts');
  assert.ok(row.lastTs >= made.data.thread.ts, 'a reply moves the thread up the index');

  // Automod must hold through the authenticated door too.
  const scam = await read(await call(lobby, `/forum/thread/${id}`, { method: 'POST', body: { text: 'join t.me/dashacommunity' }, cookie: b }));
  assert.equal(scam.status, 400, 'the chat automod applies to a logged-in poster');
  assert.equal((await read(await call(lobby, `/forum/thread/${id}`))).data.posts.length, 2, 'a refused post is not stored');

  assert.equal((await read(await call(lobby, '/forum/thread/nope'))).status, 404, 'an unknown thread is 404');
}

// ---- storage stays under the ceiling with real traffic --------------------------
{
  const state = fakeState();
  const lobby = new DashaLobby(state, env);
  const a = await cookieFor('dash_eats', '111');
  const made = await read(await call(lobby, '/forum/threads', { method: 'POST', body: { title: 'Big', text: 'x'.repeat(2000) }, cookie: a }));
  const id = made.data.thread.id;
  /* Fill the thread to its cap with maximum-length posts. fakeState asserts the 128 KiB limit on
     every put, so this fails loudly if a thread can ever outgrow its value. */
  let accepted = 1;
  for (let i = 0; i < 80; i++) {
    /* The 20/min limiter is real and fires here — confirmed by it stopping this loop the first time
       it was written. Cleared each pass because this section is about the storage ceiling; the
       limiter itself is asserted in dasha-forum-worker.test.mjs. */
    lobby.simpRates.clear();
    const res = await read(await call(lobby, `/forum/thread/${id}`, { method: 'POST', body: { text: 'y'.repeat(2000) }, cookie: a }));
    if (res.status === 200) accepted++;
    else { assert.match(res.data.error, /full/i, `filling must end in "full", got ${res.data.error}`); break; }
  }
  assert.ok(accepted > 1 && accepted <= 50, `thread filled to ${accepted} posts, expected to stop at the 50 cap`);
  const posts = (await read(await call(lobby, `/forum/thread/${id}`))).data.posts;
  assert.equal(posts.length, accepted, 'every accepted post is readable');

  /* Structural, not size-based. A single full thread is only ~105 KiB, so reverting to one blob
     still fits one key and the ceiling assert above stays quiet — the 38 MB failure needs several
     threads to show up. Asserting the key layout catches the regression at any size. */
  for (let t = 0; t < 3; t++) {
    lobby.simpRates.clear();
    const extra = await read(await call(lobby, '/forum/threads', { method: 'POST', body: { title: `Extra ${t}`, text: 'z'.repeat(2000) }, cookie: a }));
    assert.equal(extra.status, 200, 'more threads are accepted');
  }
  const keys = [...state._map.keys()];
  const threadKeys = keys.filter((k) => k.startsWith('forum:t:'));
  assert.ok(keys.includes('forum:index'), 'the index has its own key');
  assert.equal(threadKeys.length, 4, `one key per thread, got ${threadKeys.length}: ${keys.join(', ')}`);
  assert.ok(!keys.includes('forum'), 'the whole board must never live under one key');
  for (const k of threadKeys) {
    const stored = state._map.get(k);
    assert.ok(Array.isArray(stored), `${k} holds a post array, not a map of threads`);
    assert.ok(stored.every((p) => typeof p.text === 'string'), `${k} holds posts only`);
  }
}

// ---- the chess push reaches both players and nobody else ------------------------
{
  const state = fakeState();
  const sent = [];
  const socket = (xId) => ({
    deserializeAttachment: () => (xId ? { xId } : {}),
    send: (raw) => sent.push({ xId, raw }),
  });
  state.getWebSockets = () => [socket('111'), socket('222'), socket('333'), socket(null)];
  const lobby = new DashaLobby(state, env);

  const game = {
    id: 'g1',
    players: { w: { xId: '111', handle: 'dash_eats', rating: 1200 }, b: { xId: '222', handle: 'anna', rating: 1200 } },
    clock: { w: 600000, b: 600000, active: 'w', activeSince: Date.now() },
    state: { board: [...'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR'], turn: 'w', castling: 'KQkq',
      enPassant: null, halfmove: 0, fullmove: 1, moves: [], positions: {}, version: 1, status: 'active', result: null, reason: null },
  };
  lobby.broadcastChess(game);

  assert.equal(sent.length, 2, `only the two players may be told, got ${sent.length} sends`);
  assert.deepEqual(sent.map((s) => s.xId).sort(), ['111', '222'], 'the spectator and the anonymous socket get nothing');
  const frame = JSON.parse(sent[0].raw);
  assert.equal(frame.type, 'chess', 'the page drops any type that is not exactly "chess"');
  assert.equal(frame.id, 'g1', 'the page matches on the game id');
  assert.ok(!('game' in frame), 'no viewer-relative game state may ride the socket');
  assert.equal(sent[0].raw, sent[1].raw, 'both players get an identical frame — it carries nothing per-viewer');

  sent.length = 0;
  lobby.broadcastChess(null);
  lobby.broadcastChess({ id: '' });
  assert.equal(sent.length, 0, 'a missing game must not broadcast');
}

console.log('dasha forum live: PASS (signed session accepted, body identity ignored, thread round-trip, reply counting, automod through the authenticated door, storage under 128 KiB at cap, chess push to both players only)');
