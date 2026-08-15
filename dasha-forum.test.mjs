import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DashaLobby } from './dasha-lobby-worker.mjs';
import { cookieHeader, createSessionToken } from './dasha-lobby-x.mjs';

globalThis.WebSocketRequestResponsePair = class {
  constructor(request, response) {
    this.request = request;
    this.response = response;
  }
};

class MemoryStorage {
  constructor() {
    this.data = new Map();
    this.alarm = null;
  }
  async get(key) {
    return this.data.get(key);
  }
  async put(key, value) {
    if (typeof key === 'object') for (const [name, row] of Object.entries(key)) this.data.set(name, row);
    else this.data.set(key, value);
  }
  async delete(key) {
    this.data.delete(key);
  }
  async getAlarm() {
    return this.alarm;
  }
  async setAlarm(value) {
    this.alarm = value;
  }
}

const root = new URL('./', import.meta.url);
const page = await readFile(new URL('./dasha-lobby-page.html', root), 'utf8');
const client = await readFile(new URL('./dasha-lobby-client.js', root), 'utf8');
const workerModule = await import('./dasha-lobby-worker.mjs');

assert.doesNotMatch(page, /<h1>/);
assert.doesNotMatch(page, /dasha-rooms|dasha-next|welcome to the forum|how this works/i);
assert.match(page, /id="dasha-forum"/);
assert.match(page, /id="dasha-lobby"/);
assert.match(page, /wss:\/\/lobby\.getdasha\.com\/ws/);
assert.match(page, /href="\/forum">Forum</);
assert.match(page, /\.forum-send,.lobby-send[\s\S]*?background:var\(--acid\);color:var\(--ink\)/, 'forum send is acid fill + ink type');
assert.match(page, /\.forum-back,.lobby-x-btn,.lobby-x-unlink\{background:transparent;color:var\(--paper\);border-color:var\(--paper\)/, 'forum ghost is paper on ink');
assert.match(page, /\.lobby-send:disabled,.forum-send:disabled\{opacity:\.7/, 'forum disabled type stays readable');
assert.doesNotMatch(page, />Lobby</);
assert.doesNotMatch(page, /Be first\.|how this works|Public chat|Connected —/i);
assert.doesNotMatch(page, /not official|not advice|not financial/i);
assert.match(client, /DashaLobby/);
assert.match(client, /data\.type === 'ready'/);
assert.match(client, /type: 'hello'/);
assert.match(client, /getElementById\('dasha-lobby'\)/);
assert.match(client, /getElementById\('dasha-forum'\)/);
assert.match(client, /mountForum/);
assert.match(client, /forum-replies/);
assert.match(client, /lastTs/);
assert.match(client, /topicTitle/);
assert.match(client, /aria-label', 'Title'/);
assert.match(client, /forum-send', 'Post'/);
assert.doesNotMatch(client, /Discourse|Latest|Unread|Hot/);
assert.doesNotMatch(page, /Discourse|Latest|Unread|Hot/);
assert.doesNotMatch(client, /Be first\./);
assert.doesNotMatch(client, /verify mint/);
assert.doesNotMatch(client, /Connected — enter a nick/);

const state = {
  storage: new MemoryStorage(),
  setWebSocketAutoResponse() {},
  blockConcurrencyWhile(fn) {
    this.ready = fn();
  },
  getWebSockets() {
    return [];
  },
};
const env = {
  ALLOWED_ORIGINS: 'https://www.getdasha.com,https://getdasha.com,https://lobby.getdasha.com',
  LOBBY_SESSION_SECRET: 'forum-test-secret-that-is-long-enough',
};
const room = new DashaLobby(state, env);
await state.ready;
state.storage.data.set('history', [{ id: 'keep-chat', nick: 'old', text: 'gm', ts: Date.now() }]);

function forumReq(path, { method = 'GET', origin = 'https://www.getdasha.com', body, cookie, ip = '198.51.100.9' } = {}) {
  return new Request(`https://lobby.getdasha.com${path}`, {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      'CF-Connecting-IP': ip,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const created = await room.handleForum(forumReq('/forum/threads', { method: 'POST', body: { text: 'first post is the thread', nick: 'ava' } }), 'https://www.getdasha.com');
assert.equal(created.status, 200);
const createdBody = await created.json();
assert.ok(createdBody.id);
assert.equal(createdBody.text, 'first post is the thread');
assert.equal(createdBody.nick, 'ava');
assert.deepEqual(createdBody.replies, []);

const listed = await room.handleForum(forumReq('/forum/threads'), '*');
assert.equal(listed.status, 200);
const listedBody = await listed.json();
assert.equal(listedBody.threads.length, 1);
assert.equal(listedBody.threads[0].id, createdBody.id);
assert.equal(listedBody.threads[0].text, 'first post is the thread');
assert.equal(listedBody.threads[0].replies, 0);
assert.equal(listedBody.threads[0].lastTs, createdBody.ts);

const second = await room.handleForum(forumReq('/forum/threads', { method: 'POST', body: { text: 'newer topic', nick: 'cam' }, ip: '198.51.100.12' }), 'https://www.getdasha.com');
assert.equal(second.status, 200);
const secondBody = await second.json();

const replied = await room.handleForum(forumReq(`/forum/threads/${createdBody.id}`, { method: 'POST', body: { text: 'one level reply', nick: 'ben' }, ip: '198.51.100.10' }), 'https://www.getdasha.com');
assert.equal(replied.status, 200);
const repliedBody = await replied.json();
assert.equal(repliedBody.replies.length, 1);
assert.equal(repliedBody.replies[0].text, 'one level reply');
assert.equal(repliedBody.replies[0].nick, 'ben');

const bumped = await room.handleForum(forumReq('/forum/threads'), '*');
const bumpedBody = await bumped.json();
assert.equal(bumpedBody.threads.length, 2);
assert.equal(bumpedBody.threads[0].id, createdBody.id);
assert.equal(bumpedBody.threads[0].replies, 1);
assert.equal(bumpedBody.threads[0].lastTs, repliedBody.replies[0].ts);
assert.equal(bumpedBody.threads[1].id, secondBody.id);

const got = await room.handleForum(forumReq(`/forum/threads/${createdBody.id}`), '*');
assert.equal(got.status, 200);
assert.equal((await got.json()).replies.length, 1);

const noOrigin = await room.handleForum(forumReq('/forum/threads', { method: 'POST', origin: '', body: { text: 'needs origin', nick: 'ava' } }), null);
assert.equal(noOrigin.status, 403);
assert.equal((await noOrigin.json()).error, 'origin required');

const badNick = await room.handleForum(forumReq('/forum/threads', { method: 'POST', body: { text: 'no identity' } }), 'https://www.getdasha.com');
assert.equal(badNick.status, 400);

const cookie = cookieHeader(await createSessionToken(env, { xId: 'x1', handle: 'dashalink', name: 'D' })).split(';')[0];
const linked = await room.handleForum(forumReq('/forum/threads', { method: 'POST', body: { text: 'linked thread' }, cookie, ip: '198.51.100.11' }), 'https://www.getdasha.com');
assert.equal(linked.status, 200);
assert.equal((await linked.json()).handle, 'dashalink');

const hist = state.storage.data.get('history');
assert.equal(hist[0].id, 'keep-chat');
assert.equal(hist[0].text, 'gm');
assert.ok(Array.isArray(state.storage.data.get('forumThreads')));
assert.equal(state.storage.data.get('forumThreads').length, 3);

const workerEnv = {
  ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
  LOBBY: {
    idFromName() {
      return 'public';
    },
    get() {
      return room;
    },
  },
};

for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
  for (const path of ['/lobby', '/lobby/', '/forum/']) {
    const res = await workerModule.default.fetch(new Request(`https://${host}${path}`), workerEnv);
    assert.equal(res.status, 308, `${host}${path} must 308 to /forum`);
    assert.equal(res.headers.get('location'), `https://${host}/forum`);
  }
  const forum = await workerModule.default.fetch(new Request(`https://${host}/forum`), workerEnv);
  assert.equal(forum.status, 200, `${host}/forum must be 200`);
  const html = await forum.text();
  assert.doesNotMatch(html, /<h1>/);
  assert.match(html, /id="dasha-forum"/);
  assert.match(html, /id="dasha-lobby"/);
  assert.match(html, /wss:\/\/lobby\.getdasha\.com\/ws/);
  assert.doesNotMatch(html, />Lobby</);
}

const apiList = await workerModule.default.fetch(forumReq('/forum/threads'), workerEnv);
assert.equal(apiList.status, 200);
assert.ok((await apiList.json()).threads.length >= 3);

console.log('dasha-forum: PASS');
