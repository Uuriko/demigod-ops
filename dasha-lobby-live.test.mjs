/**
 * Live integration against lobby.getdasha.com (skipped if LOBBY_LIVE=0).
 * Hard overall deadline so timed-out wait loops cannot keep the process alive.
 */
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { JOIN_COOLDOWN_MS } from './dasha-lobby-mod.mjs';

if (process.env.LOBBY_LIVE === '0') {
  console.log('dasha-lobby-live: SKIP');
  process.exit(0);
}

const BASE = process.env.LOBBY_URL || 'https://lobby.getdasha.com';
const WS = process.env.LOBBY_WS || 'wss://lobby.getdasha.com/ws';
const ORIGIN = 'https://www.getdasha.com';
const OVERALL_MS = Number(process.env.LOBBY_LIVE_TIMEOUT_MS) || 45000;

const overall = setTimeout(() => {
  console.error('dasha-lobby-live: OVERALL TIMEOUT');
  process.exit(1);
}, OVERALL_MS);
overall.unref?.();

const health = await fetch(`${BASE}/health`);
assert.equal(health.status, 200);
const body = await health.json();
assert.equal(body.ok, true);
assert.equal(body.mint, '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump');
assert.equal(body.pin, 'Public lobby.');

const lobbyJs = await fetch(`${BASE}/client/lobby.js`);
assert.equal(lobbyJs.status, 200, 'lobby client asset missing');
assert.match(await lobbyJs.text(), /DashaLobby|function mount/);
const simpJs = await fetch(`${BASE}/client/simp-board.js`);
assert.equal(simpJs.status, 200, 'simp-board client asset missing');
const simpBoard = await fetch(`${BASE}/simp/board`);
assert.equal(simpBoard.status, 200, 'simp board API missing on live worker');
const boardBody = await simpBoard.json();
assert.ok(boardBody.editorial || boardBody.schema || boardBody.measured, 'simp board payload incomplete');

function openClient(nick) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS, { headers: { Origin: ORIGIN } });
    const msgs = [];
    let done = false;
    let readyTimer = null;
    let helloTimer = null;
    const finish = (fn, arg) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(readyTimer);
      clearTimeout(helloTimer);
      fn(arg);
    };
    const timer = setTimeout(() => {
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
      finish(reject, new Error('timeout ' + nick + ' msgs=' + msgs.map((m) => m.type).join(',')));
    }, 10000);

    ws.on('message', (d) => {
      try {
        msgs.push(JSON.parse(String(d)));
      } catch {
        /* ignore */
      }
    });
    ws.on('error', (e) => finish(reject, e));
    ws.on('close', (code, reason) => finish(reject, new Error(`closed ${code} ${String(reason) || 'without reason'}`)));
    ws.on('open', () => {
      const waitReady = () => {
        if (done) return;
        if (msgs.some((m) => m.type === 'ready' || m.type === 'hello_ok')) {
          ws.send(JSON.stringify({ type: 'hello', nick }));
          return;
        }
        readyTimer = setTimeout(waitReady, 30);
      };
      waitReady();
      const waitHello = () => {
        if (done) return;
        if (msgs.some((m) => m.type === 'hello_ok' && m.you === nick)) {
          finish(resolve, { ws, msgs });
          return;
        }
        if (msgs.some((m) => m.type === 'error' && /nick taken/i.test(m.error || ''))) {
          finish(resolve, { ws, msgs, nickTaken: true });
          return;
        }
        if (msgs.some((m) => m.type === 'error')) {
          const err = msgs.find((m) => m.type === 'error');
          finish(reject, new Error('hello error: ' + (err.error || 'unknown')));
          return;
        }
        helloTimer = setTimeout(waitHello, 30);
      };
      waitHello();
    });
  });
}

const sockets = [];
try {
  const suffix = String(Date.now()).slice(-6);
  const a = await openClient('a' + suffix);
  sockets.push(a.ws);
  const b = await openClient('b' + suffix);
  sockets.push(b.ws);
  assert.ok(a.msgs.some((m) => m.type === 'ready' || m.type === 'hello_ok'), 'missing ready/hello_ok');
  assert.ok(!a.nickTaken && !b.nickTaken);

  const helloOk = a.msgs.find((m) => m.type === 'hello_ok');
  const coolMs =
    typeof helloOk?.joinCooldownRemainingMs === 'number'
      ? helloOk.joinCooldownRemainingMs
      : JOIN_COOLDOWN_MS;
  if (coolMs > 0) await new Promise((r) => setTimeout(r, coolMs + 250));

  a.ws.send(JSON.stringify({ type: 'chat', text: 'ping-' + suffix }));
  await new Promise((r) => setTimeout(r, 700));
  assert.ok(
    b.msgs.some((m) => m.type === 'chat' && m.text === 'ping-' + suffix),
    'broadcast failed',
  );

  a.ws.send(JSON.stringify({ type: 'chat', text: 'too-fast-' + suffix }));
  await new Promise((r) => setTimeout(r, 250));
  assert.ok(
    a.msgs.some((m) => m.type === 'error' && /slow down|rate/i.test(m.error || '')),
    'rate missing',
  );

  a.ws.send(JSON.stringify({ type: 'chat', text: 'claim free sol airdrop now' }));
  await new Promise((r) => setTimeout(r, 250));
  assert.ok(
    a.msgs.some((m) => m.type === 'error' && /automod/i.test(m.error || '')),
    'automod missing',
  );

  const c = await new Promise((resolve, reject) => {
    const ws = new WebSocket(WS, { headers: { Origin: ORIGIN } });
    let done = false;
    const timer = setTimeout(() => {
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
      if (!done) {
        done = true;
        reject(new Error('nick-taken timeout'));
      }
    }, 10000);
    ws.on('message', (d) => {
      const m = JSON.parse(String(d));
      if (m.type === 'ready') ws.send(JSON.stringify({ type: 'hello', nick: 'a' + suffix }));
      if (m.type === 'error' && /nick taken/i.test(m.error || '')) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ ws, nickTaken: true });
      }
      if (m.type === 'hello_ok') {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ ws, nickTaken: false });
      }
    });
    ws.on('error', (e) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(e);
    });
  });
  sockets.push(c.ws);
  assert.equal(c.nickTaken, true, 'nick uniqueness missing');

  await new Promise((resolve, reject) => {
    const bad = new WebSocket(WS, { headers: { Origin: 'https://evil.example' } });
    let settled = false;
    const done = (ok, detail) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      try {
        bad.terminate();
      } catch {
        /* ignore */
      }
      if (!ok) reject(new Error('origin-block: ' + JSON.stringify(detail)));
      else resolve();
    };
    const t = setTimeout(() => done(false, { error: 'timeout waiting for 403' }), 4000);
    bad.on('unexpected-response', (_req, res) => {
      done(res.statusCode === 403, { status: res.statusCode });
    });
    bad.on('open', () => done(false, { error: 'evil origin opened' }));
    // Do not treat generic socket error as pass (could be network fail).
    bad.on('error', (e) => {
      /* often fires with unexpected-response; only fail if still open path */
      if (!settled && /Unexpected server response: 403/.test(String(e?.message || e))) {
        done(true, { via: 'error-403' });
      }
    });
  });

  console.log('dasha-lobby-live: PASS');
  clearTimeout(overall);
} finally {
  await Promise.all(sockets.map(ws => new Promise(resolve => {
    if (ws.readyState === WebSocket.CLOSED) return resolve();
    const timer = setTimeout(() => { try { ws.terminate(); } catch { /* ignore */ } resolve(); }, 1000);
    ws.once('close', () => { clearTimeout(timer); resolve(); });
    try { ws.close(1000, 'test complete'); } catch { clearTimeout(timer); resolve(); }
  })));
}
