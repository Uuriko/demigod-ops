#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COOKIE,
  authSessionFromRequest,
  createSessionToken,
  createWalletSessionToken,
  sessionFromRequest,
} from './dasha-lobby-x.mjs';
import { LOGIN_PAGE_HTML } from './dasha-lobby-static-gen.mjs';
import { walletLoginMessage } from './dasha-simp-actions.mjs';
import workerApp, { DashaLobby } from './dasha-lobby-worker.mjs';

const env = { LOBBY_SESSION_SECRET: 'test-only-login-secret' };
const requestFor = token => new Request('https://lobby.getdasha.com/auth/status', { headers: { Cookie: `${COOKIE}=${token}` } });

const xToken = await createSessionToken(env, { xId: '42', handle: 'maker', name: 'Maker' });
assert.equal((await authSessionFromRequest(env, requestFor(xToken))).provider, 'x');
assert.equal((await sessionFromRequest(env, requestFor(xToken))).handle, 'maker');

const address = '11111111111111111111111111111111';
const walletToken = await createWalletSessionToken(env, address);
const wallet = await authSessionFromRequest(env, requestFor(walletToken));
assert.deepEqual(wallet, { provider: 'wallet', wallet: address });
assert.equal(await sessionFromRequest(env, requestFor(walletToken)), null, 'wallet login must not gain X-only perks');

const statusResponse = await workerApp.fetch(requestFor(walletToken), env);
assert.equal(statusResponse.status, 200);
assert.deepEqual(await statusResponse.json(), {
  loggedIn: true,
  provider: 'wallet',
  x: null,
  wallet: { address, display: '1111…1111' },
});
const logoutResponse = await workerApp.fetch(new Request('https://lobby.getdasha.com/auth/logout', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com', Cookie: `${COOKIE}=${walletToken}` },
}), { ...env, ALLOWED_ORIGINS: 'https://www.getdasha.com' });
assert.match(logoutResponse.headers.get('Set-Cookie') || '', /Max-Age=0/);
const loginResponse = await workerApp.fetch(new Request('https://lobby.getdasha.com/login'), env);
assert.equal(loginResponse.status, 200);
assert.match(await loginResponse.text(), /data-wallet-login/);
assert.equal((await workerApp.fetch(new Request('https://www.getdasha.com/login'), env)).status, 200);
let proxied = '';
const proxyResponse = await workerApp.fetch(new Request('https://lobby.getdasha.com/auth/wallet/challenge', {
  method: 'POST',
  headers: { Origin: 'https://www.getdasha.com' },
  body: '{}',
}), {
  ...env,
  ALLOWED_ORIGINS: 'https://www.getdasha.com',
  LOBBY: { idFromName: () => 'public', get: () => ({ fetch: request => { proxied = new URL(request.url).pathname; return new Response('{}'); } }) },
});
assert.equal(proxyResponse.status, 200);
assert.equal(proxied, '/auth/wallet/challenge');

const b58 = bytes => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = 0n, out = '';
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  while (value) { out = alphabet[Number(value % 58n)] + out; value /= 58n; }
  for (const byte of bytes) { if (byte) break; out = '1' + out; }
  return out || '1';
};
const records = new Map();
const room = Object.create(DashaLobby.prototype);
room.env = env;
room.simpRates = new Map();
room.state = { storage: {
  get: key => records.get(key),
  put: (key, value) => { records.set(key, value); },
  delete: key => records.delete(key),
} };
const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const loginAddress = b58(new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey)));
const challengeResponse = await room.handleSimp(new Request('https://lobby.getdasha.com/auth/wallet/challenge', {
  method: 'POST', body: JSON.stringify({ publicKey: loginAddress }),
}), 'https://www.getdasha.com');
assert.equal(challengeResponse.status, 200);
const challengeData = await challengeResponse.json();
const signature = b58(new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, new TextEncoder().encode(challengeData.message))));
const verifyBody = JSON.stringify({ publicKey: loginAddress, challenge: challengeData.challenge, signature });
const verified = await room.handleSimp(new Request('https://lobby.getdasha.com/auth/wallet/verify', { method: 'POST', body: verifyBody }), 'https://www.getdasha.com');
assert.equal(verified.status, 200);
assert.match(verified.headers.get('Set-Cookie') || '', new RegExp(`^${COOKIE}=`));
const replay = await room.handleSimp(new Request('https://lobby.getdasha.com/auth/wallet/verify', { method: 'POST', body: verifyBody }), 'https://www.getdasha.com');
assert.equal(replay.status, 409, 'a wallet login signature cannot be replayed');

const message = walletLoginMessage({
  publicKey: address,
  nonce: '0123456789abcdef',
  issuedAt: 1_700_000_000_000,
  expiresAt: 1_700_000_300_000,
  domain: 'www.getdasha.com',
  uri: 'https://www.getdasha.com/login',
});
assert.match(message, /^www\.getdasha\.com wants you to sign in with your Solana account:/);
assert.match(message, /Nonce: 0123456789abcdef/);
assert.match(message, /Expiration Time:/);
assert.match(message, /sends no transaction and proves address control only/);

const page = readFileSync(new URL('./dasha-login-page.html', import.meta.url), 'utf8');
assert.match(page, /class="skip-link" href="#dasha-login"/, 'login first visit must skip chrome to the form');
assert.match(page, /href="https:\/\/www\.getdasha\.com\/how-to-buy">How to buy</, 'login first visit must link How to buy');
assert.match(page, /href="https:\/\/www\.getdasha\.com\/privacy">Privacy</, 'login first visit must link Privacy');
const client = readFileSync(new URL('./dasha-x-connect-prompt.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('./dasha-lobby-worker.mjs', import.meta.url), 'utf8');
assert.match(page, /data-x-login[^>]*>Continue with X/);
assert.match(page, /data-wallet-login>Connect wallet/);
assert.match(page, /data-login-next hidden><a href="\/simp#holder">Verify holder perks →<\/a>/,
  'login success must hand off to the existing holder-proof flow');
assert.match(page, /checks no balance, and grants no points/);
assert.doesNotMatch(LOGIN_PAGE_HTML, /__X_CONNECT_SRI__/);
assert.match(LOGIN_PAGE_HTML, /integrity="sha384-/);
assert.match(client, /\/auth\/wallet\/challenge/);
assert.match(client, /\/auth\/wallet\/verify/);
assert.match(client, /data-dasha-login-link/);
assert.match(client, /next\.hidden = !loggedIn/);
assert.match(client, /data\.provider === 'x' \? 'Verify holder perks →' : 'Holder perks need X \+ Board →'/);
assert.match(client, /Address control only\./, 'wallet login must not imply holder or X-linked access');
assert.doesNotMatch(client, /setInterval\(maybeShow/, 'login must be user-initiated, not an interruption');
assert.match(worker, /challenge\.origin !== allowedOrigin/);
assert.match(worker, /delete logins\[body\.publicKey\]/, 'wallet login challenge must be one-time');
assert.match(worker, /slice\(0, 100\)/, 'anonymous wallet challenges must stay storage-bounded');
assert.match(worker, /session\?\.provider === 'x'/, 'status must keep providers distinct');

console.log('dasha login: PASS (X or one-time wallet signature; wallet cannot gain X perks)');
