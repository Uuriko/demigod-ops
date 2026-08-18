#!/usr/bin/env node
/**
 * demigod-die-webapp-smoke — can somebody who is not the machine's owner actually use this?
 *
 * WHY THIS EXISTS SEPARATELY FROM THE UNIT TESTS
 * demigod-die-web.test.mjs proves the pieces. It cannot prove the journey, because every piece can
 * be individually correct while the path through them is broken — which is how a tunnel ended up
 * fronting a dead app, and how a test asserting an interlock passed against a unit that never ran.
 *
 * So this walks the whole outside-user path against a real server on a real gated host, in order:
 * an admin is created, they sign in over the gate, they read, they act, they are told when they
 * acted on stale state, they take their data with them, a machine gets a key, the key is revoked
 * and stops working, and a disabled person's key stops working too.
 *
 * EVERY STEP MUST BE ABLE TO FAIL. A smoke test that only ever asserts 200 proves the server is
 * listening, not that it is enforcing anything, so each permitted step is paired with the refusal
 * that should accompany it.
 *
 * Runs against a throwaway store and accounts file. It never touches the live desk.
 *
 *   node demigod-die-webapp-smoke.mjs
 *   node demigod-die-webapp-smoke.mjs --keep   # leave the scratch dir for inspection
 *
 * Schema: demigod.die-webapp-smoke/1
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = 'smoke-desk.trycloudflare.com';
const GATE = 'gate-secret-for-the-smoke-run';
const SIGNING = 'a-distinct-signing-key-of-at-least-32-chars';
const PASSWORD = 'first smoke password';

const results = [];
const step = (ok, name, detail = '') => {
  results.push({ ok, name, detail });
  process.stdout.write(`  ${ok ? '·' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
};

function freePort() {
  // 9800-9899 is the scratch band used by the other manual runs in this repo.
  return 9800 + Math.floor(Number(process.hrtime.bigint() % 90n));
}

/*
 * node:http, not fetch.
 *
 * undici treats Host as a forbidden header and drops it silently. Every request therefore arrived
 * as 127.0.0.1, which requestContext classifies as local_read_only — the operator's own machine,
 * where nothing is gated. The first run of this file reported eight failures that were all the
 * same thing: it was testing loopback while claiming to test a public host, and "a stranger is
 * refused" failed because on loopback a stranger is not a stranger.
 *
 * This is precisely the class of error the file exists to catch, so it is worth the raw client.
 */
function raw(port, pathname, { method = 'GET', body, cookie, bearer, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : body;
    const headers = { Host: HOST };
    if (payload !== null) {
      headers['Content-Type'] = contentType || 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) headers.Cookie = cookie;
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (contentType === 'application/x-www-form-urlencoded') headers.Origin = `https://${HOST}`;
    const request = http.request({ host: '127.0.0.1', port, path: pathname, method, headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch { /* html or a redirect */ }
        resolve({ status: res.statusCode, json, text, headers: res.headers });
      });
    });
    request.on('error', reject);
    if (payload !== null) request.write(payload);
    request.end();
  });
}

const req = (port, pathname, options = {}) => raw(port, pathname, {
  ...options,
  body: options.body === undefined ? undefined : JSON.stringify(options.body),
});

async function form(port, pathname, fields, cookie) {
  const res = await raw(port, pathname, {
    method: 'POST',
    body: new URLSearchParams(fields).toString(),
    contentType: 'application/x-www-form-urlencoded',
    cookie,
  });
  const setCookie = String(res.headers['set-cookie']?.[0] || '');
  return { status: res.status, cookie: setCookie.split(';')[0] || null };
}

const run = (args, env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env } });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${args.join(' ')} exited ${code}: ${out.slice(0, 400)}`))));
});

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'die-smoke-'));
  const accounts = path.join(dir, 'accounts.json');
  const store = path.join(dir, 'missions.sqlite');
  const liveStore = path.join(process.env.HOME || '', '.local/share/demigod/die-missions.sqlite');
  if (fs.existsSync(liveStore)) fs.copyFileSync(liveStore, store);
  const env = { DEMIGOD_DIE_ACCOUNTS: accounts, DEMIGOD_DIE_STORE: store };

  // --- an admin exists before anyone can sign in ---
  await run([path.join(ROOT, 'demigod-die-accounts.mjs'), '--add', 'admin@smoke.test', '--role', 'admin'],
    { ...env, DEMIGOD_DIE_PASSWORD: PASSWORD });
  step(fs.existsSync(accounts), 'an admin account can be created');

  const port = freePort();
  const server = spawn(process.execPath, [path.join(ROOT, 'demigod-die-web.mjs'), '--port', String(port)], {
    cwd: ROOT,
    env: {
      ...process.env, ...env,
      DEMIGOD_DIE_GATE_SECRET: GATE,
      DEMIGOD_DIE_SESSION_SECRET: SIGNING,
      DEMIGOD_DIE_ALLOW_TRYCLOUDFLARE: '1',
    },
  });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });

  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await req(port, '/healthz')).status === 200) break; } catch { /* not up yet */ }
      await new Promise((r) => setTimeout(r, 250));
    }

    const health = await req(port, '/healthz');
    step(health.status === 200 && health.json?.store === 'ok', 'health reports on the store it read', health.json?.store);

    // --- the door is shut before anyone signs in ---
    step((await req(port, '/api/v1/roles')).status === 401, 'a stranger is refused');

    const bad = await form(port, '/login', { email: 'admin@smoke.test', password: 'not the password' });
    step(!bad.cookie, 'the wrong password issues no session');

    const login = await form(port, '/login', { email: 'admin@smoke.test', password: PASSWORD });
    const cookie = login.cookie;
    step(Boolean(cookie) && login.status === 303, 'the admin can sign in');

    const session = await req(port, '/api/v1/session', { cookie });
    step(session.json?.user === 'admin@smoke.test' && session.json?.role === 'admin',
      'the session names who it is', `${session.json?.user} / ${session.json?.role}`);

    // --- reading ---
    const roles = await req(port, '/api/v1/roles', { cookie });
    step(roles.status === 200 && Array.isArray(roles.json?.rows), 'roles list');
    const companies = await req(port, '/api/v1/companies?limit=5', { cookie });
    step(companies.status === 200 && companies.json?.rows?.length > 0, 'companies list',
      `${companies.json?.total} total`);

    // --- acting, and being told when the state moved ---
    const roleId = roles.json.rows[0]?.roleId;
    const mission = await req(port, `/api/v1/roles/${encodeURIComponent(roleId)}/mission`, { cookie });
    const version = mission.json?.mission?.version;
    step(Number.isSafeInteger(version), 'a mission carries a version', String(version));

    const stale = await req(port, `/api/v1/roles/${encodeURIComponent(roleId)}/mission/actions`, {
      method: 'POST', cookie, body: { action: 'apply', candId: 'smoke-a', source: 'applied', expectedVersion: 1 },
    });
    step(stale.status === 409, 'acting on a stale version is refused', stale.json?.error);

    const acted = await req(port, `/api/v1/roles/${encodeURIComponent(roleId)}/mission/actions`, {
      method: 'POST', cookie, body: { action: 'apply', candId: 'smoke-a', source: 'applied', expectedVersion: version },
    });
    step(acted.status === 200, 'acting on the current version succeeds');

    const typo = await req(port, `/api/v1/roles/${encodeURIComponent(roleId)}/mission/actions`, {
      method: 'POST', cookie, body: { action: 'scorecard', candId: 'smoke-a', ratings: [{ mustHaveId: 'nope', rating: 'yes', evidence: 'evidence here' }] },
    });
    step(typo.status >= 400 && typo.status < 500 && typo.json?.error !== 'internal_error',
      'a bad field is the caller\'s fault, not a 500', `${typo.status} ${typo.json?.error}`);

    // --- the receipt says who ---
    const activity = await req(port, '/api/v1/activity', { cookie });
    const mine = (activity.json?.rows || []).filter((r) => r.account === 'admin@smoke.test');
    step(mine.length > 0, 'the audit trail names the account that acted', `${mine.length} attributed row(s)`);

    // --- taking the data with you ---
    const csv = await req(port, '/api/v1/export?dataset=roles&format=csv', { cookie });
    const lines = csv.text.trim().split('\r\n');
    step(csv.status === 200 && lines.length > 1 && !/^[=+@]/.test(lines[1] || ''),
      'export returns a CSV with no unguarded formula lead', `${lines.length - 1} row(s)`);
    step((csv.headers['content-disposition'] || '').includes('attachment'), 'export downloads as a file');
    const badDataset = await req(port, '/api/v1/export?dataset=everything', { cookie });
    step(badDataset.status === 400, 'an unknown dataset is refused');

    // --- a machine gets its own credential ---
    const issued = await run([path.join(ROOT, 'demigod-die-accounts.mjs'), '--key-new', 'admin@smoke.test', '--label', 'smoke'], env);
    const key = JSON.parse(issued).key;
    step(Boolean(key), 'an API key can be issued');
    step((await req(port, '/api/v1/roles', { bearer: key })).status === 200, 'the key reads');
    step((await req(port, '/api/v1/roles', { bearer: `${key}x` })).status === 401, 'a tampered key does not');
    step((await req(port, '/api/v1/account/password', {
      method: 'POST', bearer: key, body: { currentPassword: PASSWORD, newPassword: 'second smoke password' },
    })).status === 403, 'a key cannot change its owner\'s password');

    const keyId = key.split('_')[1];
    await run([path.join(ROOT, 'demigod-die-accounts.mjs'), '--key-revoke', keyId], env);
    step((await req(port, '/api/v1/roles', { bearer: key })).status === 401,
      'a revoked key stops working with no restart');

    // --- and the person can be shut off ---
    const key2 = JSON.parse(await run([path.join(ROOT, 'demigod-die-accounts.mjs'), '--key-new', 'admin@smoke.test'], env)).key;
    step((await req(port, '/api/v1/roles', { bearer: key2 })).status === 200, 'a fresh key works');
    await run([path.join(ROOT, 'demigod-die-accounts.mjs'), '--disable', 'admin@smoke.test'], env);
    step((await req(port, '/api/v1/roles', { bearer: key2 })).status === 401,
      'disabling the person kills the key their program holds');
    step((await req(port, '/api/v1/roles', { cookie })).status === 401,
      'and the browser session they were already holding');

    // --- nothing in the log should be a server fault ---
    const faults = (serverLog.match(/"status":5\d\d/g) || []).length;
    step(faults === 0, 'no 500 was logged during the whole journey', `${faults} found`);
  } finally {
    server.kill('SIGTERM');
    if (!process.argv.includes('--keep')) fs.rmSync(dir, { recursive: true, force: true });
    else process.stdout.write(`  scratch kept at ${dir}\n`);
  }

  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\ndemigod die webapp smoke: ${results.length - failed.length}/${results.length} steps\n`);
  if (failed.length) {
    process.stderr.write(`FAILED:\n${failed.map((f) => `  · ${f.name} ${f.detail}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('an outside user can sign in, read, act, export, and be shut off again.\n');
}

await main();
