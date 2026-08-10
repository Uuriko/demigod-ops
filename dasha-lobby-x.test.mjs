import assert from 'node:assert/strict';
import {
  normalizeHandle,
  linkedLimits,
  mayJoinRoom,
  signPayload,
  verifyPayload,
  readCookie,
  sessionFromRequest,
  authorizeUrl,
  publicLink,
  ANON_SOFT_CAP,
  MAX_TEXT_LINKED,
  xConfigured,
} from './dasha-lobby-x.mjs';

assert.equal(normalizeHandle('@Dash_Eats'), 'dash_eats');
assert.equal(normalizeHandle('bad handle!'), null);
assert.equal(publicLink({ handle: 'ava' }).display, '@ava');

const anon = linkedLimits(false);
const linked = linkedLimits(true);
assert.ok(linked.maxText > anon.maxText);
assert.equal(linked.maxText, MAX_TEXT_LINKED);
assert.ok(linked.rateMs < anon.rateMs);
assert.ok(linked.maxPerMin > anon.maxPerMin);

assert.equal(mayJoinRoom({ count: 10, maxSockets: 80, linked: false }).ok, true);
assert.equal(mayJoinRoom({ count: ANON_SOFT_CAP, maxSockets: 80, linked: false }).ok, false);
assert.equal(mayJoinRoom({ count: ANON_SOFT_CAP, maxSockets: 80, linked: true }).ok, true);
assert.equal(mayJoinRoom({ count: 80, maxSockets: 80, linked: true }).ok, false);

assert.equal(xConfigured({}), false);
assert.equal(xConfigured({ X_CLIENT_ID: 'a', X_CLIENT_SECRET: 'b', LOBBY_SESSION_SECRET: 'c' }), true);

const secret = 'test-secret-key-for-hmac';
const token = await signPayload(secret, { handle: 'ava', xId: '1', exp: Date.now() + 60_000 });
const ok = await verifyPayload(secret, token);
assert.equal(ok.handle, 'ava');
const bad = await verifyPayload(secret, token + 'x');
assert.equal(bad, null);
assert.equal(await verifyPayload(secret, token + '.ignored'), null, 'signed tokens must use exactly two segments');
assert.equal(await verifyPayload(secret, '%%%.' + 'x'.repeat(50)), null, 'malformed base64 must fail closed');
assert.equal(await verifyPayload(secret, 'x'.repeat(4097)), null, 'oversized token must fail closed');
const exp = await signPayload(secret, { handle: 'ava', exp: Date.now() - 1000 });
assert.equal(await verifyPayload(secret, exp), null);
assert.equal(readCookie('__Host-dasha_x=%E0%A4%A'), null, 'malformed cookie encoding must fail closed');
const noExpiry = await signPayload(secret, { v: 1, xId: '1', handle: 'ava' });
assert.equal(await sessionFromRequest({ LOBBY_SESSION_SECRET: secret }, new Request('https://lobby.getdasha.com', { headers: { Cookie: `__Host-dasha_x=${noExpiry}` } })), null, 'session must carry an expiry');

const url = authorizeUrl({
  clientId: 'cid',
  redirectUri: 'https://lobby.getdasha.com/oauth/x/callback',
  state: 'st',
  challenge: 'ch',
});
assert.match(url, /x\.com\/i\/oauth2\/authorize/);
assert.match(url, /code_challenge_method=S256/);
const auth = new URL(url);
assert.deepEqual(new Set(auth.searchParams.get('scope').split(' ')), new Set(['tweet.read', 'users.read']));
assert.doesNotMatch(auth.searchParams.get('scope'), /write|offline\.access/);

console.log('dasha-lobby-x: PASS');
