#!/usr/bin/env node
/** DIE product surface: Role Mission desk on loopback, or a password-gated public host. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCompanyPacket, loadPacketInputs } from './demigod-company-packet.mjs';
import { projectTableRow } from './demigod-company-table.mjs';
import { createNote, loadPackets, projectForReview } from './demigod-role-packet.mjs';
import { importJsonMissions, missionStorePath, openMissionStore } from './demigod-die-mission-store.mjs';
import { projectActivityList } from './demigod-die-activity-shape.mjs';
import { csvRow, exportFilename } from './demigod-die-export.mjs';
import { loadHistory, signalsFrom, withWatchlist } from './demigod-die-signals.mjs';
import { HISTORY as LIFESPAN_HISTORY, MAP as LIFESPAN_MAP, lifespans, load as loadLifespan } from './demigod-die-lifespan.mjs';
import {
  advanceApplication,
  applyCandidate,
  attachCallNote,
  attachCompany,
  bookSlot,
  closeMission,
  holdSlot,
  openRoleMission,
  presentCompany,
  projectSurfaces,
  recordDebrief,
  recordOfferTerms,
  recordOutcome,
  recordScorecard,
  toMissionCompany,
} from './demigod-role-mission-kernel.mjs';
import { buildDesk } from './demigod-structured-hiring.mjs';
import { allowWebhookRequest, webhookClientIp } from './demigod-webhook-rate-limit.mjs';
import {
  authenticate as authenticateAccount,
  can as roleCan,
  changePassword,
  disableUser,
  findUser,
  issueApiKey,
  issueSession,
  listApiKeys,
  loadAccounts,
  normalizeEmail,
  revokeApiKey,
  ROLES,
  saveAccounts,
  upsertUser,
  verifyApiKey,
  verifySession,
} from './demigod-die-accounts.mjs';

const CODE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const UI_TEMPLATE = fs.readFileSync(path.join(CODE_ROOT, 'demigod-die-web-ui.html'), 'utf8');
const HOST = '127.0.0.1';
const DEFAULT_PORT = 9880;
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const ROOT = process.env.DEMIGOD_ROOT || CODE_ROOT;
const STORE = openMissionStore(missionStorePath(BUSY, ROOT));
importJsonMissions(STORE, path.join(BUSY, 'die-role-missions.json'));
const TUNNEL_READY = fs.existsSync(path.join(process.env.HOME || '', '.config/demigod/die-tunnel-ready'));
const MAX_LIMIT = 50;
const RELEASE_ID = String(process.env.DEMIGOD_RELEASE_ID || 'local').slice(0, 120);
const PUBLIC_HOST = String(process.env.DEMIGOD_DIE_PUBLIC_HOST || '').trim().toLowerCase();
const TRUST_ACCESS_PROXY = process.env.DEMIGOD_DIE_TRUST_ACCESS_PROXY === '1';
const GATE_SECRET = String(process.env.DEMIGOD_DIE_GATE_SECRET || '').trim();
/**
 * The key that signs account sessions. It must NOT be GATE_SECRET.
 *
 * GATE_SECRET is the shared login password — `secretEqual(password, GATE_SECRET)` is how the
 * pre-accounts gate authenticates. It was also being used as the HMAC key for account sessions, so
 * anyone who had ever been told the shared password could mint a valid cookie for any address and
 * any role, admin included. Retiring the password once accounts exist does not close that: it stops
 * being accepted at the login form while remaining the key that forges what the form would have
 * issued. A signing key and a password handed to people are not the same kind of secret and cannot
 * be the same value.
 */
const SESSION_SECRET = String(process.env.DEMIGOD_DIE_SESSION_SECRET || '').trim();
/* Read from the accounts module rather than restated, so adding a role there cannot leave this
   file quietly rejecting it as invalid. */
const ROLE_NAMES = Object.keys(ROLES);
const ALLOW_TRYCLOUDFLARE = process.env.DEMIGOD_DIE_ALLOW_TRYCLOUDFLARE === '1';
const GATE_COOKIE = 'die_gate';
const GATE_MS = 12 * 60 * 60 * 1000;
const PUBLIC_URL_FILE = path.join(process.env.HOME || '', '.config/demigod/die-public-url');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * One structured line to stderr, which systemd puts in the journal.
 *
 * There was no logging at all: a 500 sent `{"error":"internal_error"}` to the caller and left
 * nothing anywhere. The person who could fix it learned neither that it happened nor what it was,
 * and "it broke once, I don't know why" is where an outage lives when nobody can look.
 *
 * Deliberately NOT logged: request bodies, cookies, headers, and query VALUES. A search on this
 * corpus is a company someone is looking at, and a log is a place data goes to be forgotten about.
 * Path and status say where; the message says what. That is enough to find a bug and not enough to
 * become a second copy of the data.
 */
export function logEvent(fields) {
  try {
    process.stderr.write(`${JSON.stringify({ at: new Date().toISOString(), service: 'die-web', ...fields })}\n`);
  } catch { /* logging must never be the thing that takes the request down */ }
}

function validDnsHost(value) {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
}

if (PUBLIC_HOST && !validDnsHost(PUBLIC_HOST)) throw new Error('invalid_hosted_configuration');
if (TRUST_ACCESS_PROXY && !PUBLIC_HOST) throw new Error('invalid_hosted_configuration');
if (PUBLIC_HOST && !TRUST_ACCESS_PROXY && !GATE_SECRET) throw new Error('invalid_hosted_configuration');
if (ALLOW_TRYCLOUDFLARE && !GATE_SECRET) throw new Error('invalid_hosted_configuration');
if (GATE_SECRET && GATE_SECRET.length < 16) throw new Error('invalid_hosted_configuration');
if (SESSION_SECRET && SESSION_SECRET.length < 32) throw new Error('invalid_session_secret');
// The one that matters. Equal values reintroduce exactly the forgery this separation exists to stop.
if (SESSION_SECRET && GATE_SECRET && SESSION_SECRET === GATE_SECRET) throw new Error('invalid_session_secret');

const baseHeaders = Object.freeze({
  'Cache-Control': 'no-store',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
});

function send(res, status, body, contentType, head = false, extra = {}) {
  const payload = typeof body === 'string' ? body : `${JSON.stringify(body)}\n`;
  res.writeHead(status, {
    ...baseHeaders,
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(payload),
    ...extra,
  });
  res.end(head ? undefined : payload);
}

function sendJson(res, status, body, head = false, extra = {}) {
  send(res, status, body, 'application/json; charset=utf-8', head, {
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    ...extra,
  });
}

function sendUi(res, head = false, extra = {}) {
  const nonce = crypto.randomBytes(18).toString('base64');
  const body = UI_TEMPLATE.replaceAll('__NONCE__', nonce);
  send(res, 200, body, 'text/html; charset=utf-8', head, {
    'Content-Security-Policy': `default-src 'none'; connect-src 'self'; img-src 'self' data:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    ...extra,
  });
}

function hostName(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw.startsWith('[') ? raw.slice(1, raw.indexOf(']')) : raw.split(':')[0];
}

function cookieMap(header) {
  const out = Object.create(null);
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const key = part.slice(0, i).trim();
    if (key) out[key] = part.slice(i + 1).trim();
  }
  return out;
}

function secretEqual(left, right) {
  const a = crypto.createHash('sha256').update(String(left)).digest();
  const b = crypto.createHash('sha256').update(String(right)).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Who is asking, from the cookie.
 *
 * Two cookie shapes coexist during the migration. An account session is `email.expiry.mac` and
 * carries an identity; the legacy shared-password cookie is `expiry.mac` and carries none. The
 * account session is checked against the accounts file as it stands NOW, so disabling someone ends
 * the session they are already holding — a revocation that leaves live cookies working is not a
 * revocation.
 */
export function identify(header, authorization) {
  /* A bearer key is checked first and never falls through to the cookie. Someone who presents a
     credential explicitly gets an answer about THAT credential — falling back would let a caller
     with a revoked key keep working on a stale cookie and never learn the key had been revoked. */
  const bearer = /^Bearer\s+(\S+)$/i.exec(String(authorization || ''));
  if (bearer) {
    const seen = verifyApiKey(bearer[1], loadAccounts());
    return seen.ok
      ? { authenticated: true, email: seen.email, role: seen.role, via: 'api_key', keyId: seen.keyId }
      : { authenticated: false, email: null, role: null, reason: seen.reason, via: 'api_key' };
  }
  const raw = cookieMap(header)[GATE_COOKIE];
  if (!raw) return { authenticated: false, email: null, role: null };
  if (raw.split('.').length === 3) {
    /* SESSION_SECRET, never GATE_SECRET. With no session secret set this passes '' and
       verifySession returns no_secret — so an unconfigured deployment rejects account cookies
       rather than falling back to validating them with the shared password. */
    const seen = verifySession(raw, SESSION_SECRET, loadAccounts());
    return seen.ok
      ? { authenticated: true, email: seen.email, role: seen.role }
      : { authenticated: false, email: null, role: null, reason: seen.reason };
  }
  // Legacy shared cookie: authenticated, but anonymous. Only honoured while no account exists.
  if (loadAccounts().users.length > 0) return { authenticated: false, email: null, role: null, reason: 'legacy_cookie_retired' };
  return { authenticated: verifyGateCookie(header), email: null, role: null };
}

function verifyGateCookie(header) {
  if (!GATE_SECRET) return false;
  const raw = cookieMap(header)[GATE_COOKIE];
  if (!raw) return false;
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return false;
  const expiry = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  if (!/^\d{11,15}$/.test(expiry)) return false;
  const expected = crypto.createHmac('sha256', GATE_SECRET).update(expiry).digest('base64url');
  const got = Buffer.from(mac);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return false;
  return Number(expiry) > Date.now();
}

function makeGateCookie() {
  const expiry = String(Date.now() + GATE_MS);
  const mac = crypto.createHmac('sha256', GATE_SECRET).update(expiry).digest('base64url');
  return `${expiry}.${mac}`;
}

function isTryCloudflare(hostname) {
  return ALLOW_TRYCLOUDFLARE && /^[a-z0-9-]+\.trycloudflare\.com$/.test(hostname);
}

function isCfargoTunnel(hostname) {
  return Boolean(GATE_SECRET)
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.cfargotunnel\.com$/.test(hostname);
}

function isGatedHost(hostname) {
  if (!GATE_SECRET) return false;
  if (isTryCloudflare(hostname) || isCfargoTunnel(hostname)) return true;
  return Boolean(PUBLIC_HOST) && hostname === PUBLIC_HOST && !TRUST_ACCESS_PROXY;
}

function publicUrlFromDisk() {
  try {
    const text = fs.readFileSync(PUBLIC_URL_FILE, 'utf8').trim();
    return /^https:\/\/[a-z0-9.-]+$/.test(text) ? text : null;
  } catch {
    return null;
  }
}

/**
 * Is the recorded public URL actually answering?
 *
 * The status surface said "Public desk is up at …" because a file on disk held a URL. It was a
 * quick tunnel that had since died, so the product asserted its own availability from the existence
 * of a text file and was wrong for as long as nobody checked. A file is not a service.
 *
 * Probed at most once a minute and cached, because status is read on every page load and a status
 * check that costs a network round trip per request is its own outage. `null` means not yet
 * checked — reported as unknown rather than as either answer.
 */
let reachCache = { url: null, ok: null, at: 0 };
const REACH_TTL_MS = 60_000;

export function publicReachability({ now = Date.now() } = {}) {
  const url = publicUrlFromDisk();
  if (!url) return { url: null, reachable: null };
  if (reachCache.url === url && now - reachCache.at < REACH_TTL_MS) return { url, reachable: reachCache.ok };
  if (reachCache.url !== url) reachCache = { url, ok: null, at: 0 };
  // Fire and forget: this request answers with what is known now, the next one gets the result.
  if (now - reachCache.at >= REACH_TTL_MS) {
    reachCache = { ...reachCache, at: now };
    fetch(`${url}/healthz`, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
      .then((r) => { reachCache = { url, ok: r.ok, at: Date.now() }; })
      .catch(() => { reachCache = { url, ok: false, at: Date.now() }; });
  }
  return { url, reachable: reachCache.ok };
}

function accessState(context = {}) {
  const { url: publicUrl, reachable } = publicReachability();
  const publicHost = PUBLIC_HOST || (publicUrl ? new URL(publicUrl).hostname : null);
  if (TUNNEL_READY) {
    return { tunnelReady: true, gateReady: Boolean(GATE_SECRET), publicHost, publicUrl, reachable, reason: null };
  }
  if (GATE_SECRET && context.hosted) {
    return { tunnelReady: false, gateReady: true, publicHost, publicUrl, reachable, reason: null };
  }
  if (GATE_SECRET) {
    return {
      tunnelReady: false,
      gateReady: true,
      publicHost,
      publicUrl,
      reachable,
      /* Say what is known, not what is hoped. A recorded URL that has not answered is reported as
         not answering, and one that has not been checked yet is reported as unchecked. */
      reason: !publicUrl
        ? 'Cloudflare Access is not enabled for this account; HTTPS stays dark. Loopback is the product.'
        : reachable === true ? `Public desk is answering at ${publicUrl}.`
        : reachable === false ? `A public URL is recorded (${publicUrl}) but it is not answering. Loopback is the product.`
        : `A public URL is recorded (${publicUrl}); reachability not yet checked.`,
    };
  }
  return {
    tunnelReady: false,
    gateReady: false,
    publicHost: PUBLIC_HOST || null,
    publicUrl,
    reason: 'Cloudflare Access is not enabled for this account; HTTPS stays dark. Loopback is the product.',
  };
}

function modeLabel(mode) {
  if (mode === 'local_read_only') return 'Local';
  if (mode === 'gated_public' || mode === 'hosted_read_only') return 'Private';
  return 'DIE';
}

function safeNext(value) {
  const raw = String(value || '/roles').split('?')[0];
  if (!/^\/[A-Za-z0-9/_-]*$/.test(raw)) return '/roles';
  return uiRoute(raw) ? raw : '/roles';
}

const loginFails = new Map();

function clientIp(req) {
  const cf = String(req.headers['cf-connecting-ip'] || '').trim();
  if (/^[0-9a-fA-F:.]+$/.test(cf)) return cf;
  return String(req.socket?.remoteAddress || 'unknown');
}

function loginBlocked(ip) {
  const now = Date.now();
  const rows = (loginFails.get(ip) || []).filter((stamp) => now - stamp < 600_000);
  loginFails.set(ip, rows);
  return rows.length >= 20;
}

function noteLoginFail(ip) {
  loginFails.set(ip, [...(loginFails.get(ip) || []), Date.now()]);
}

function sendLoginUi(res, { error = '', head = false, next = '/roles' } = {}) {
  const nonce = crypto.randomBytes(18).toString('base64');
  const dest = safeNext(next);
  const message = error
    ? `<p class="error" role="alert">${error === 'login_invalid' ? 'That password is wrong.' : 'Try again in a few minutes.'}</p>`
    : '<p class="lede">This is the private hiring desk. Sign in with your account.</p>';
  const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#0d1c17">
  <meta name="robots" content="noindex,nofollow">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230d1c17'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-size='16' fill='%23d5e8dd' font-family='Georgia'%3ED%3C/text%3E%3C/svg%3E">
  <title>DIE · Sign in</title>
  <style nonce="${nonce}">
    :root{color-scheme:light;--ink:#10211b;--muted:#5a6a63;--paper:#eef3ef;--line:#cfd8d3;font:16px/1.5 "Iowan Old Style",Georgia,serif}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:radial-gradient(1200px 500px at 10% -10%,#d7ece0 0%,transparent 55%),var(--paper);color:var(--ink)}
    header{padding:1.1rem clamp(1rem,4vw,3.5rem);background:#0d1c17;color:#f4f7f5;display:flex;justify-content:space-between;align-items:center}
    header strong{font-size:1.05rem;letter-spacing:.08em;text-transform:uppercase}
    .mode{font:0.75rem/1 ui-sans-serif,system-ui;border:1px solid #6e8b7d;border-radius:999px;padding:.3rem .7rem;color:#d5e8dd}
    main{max-width:28rem;margin:auto;padding:3rem 1.2rem}
    h1{font-size:clamp(2.1rem,6vw,3.4rem);line-height:.95;letter-spacing:-.03em;margin:.2rem 0 .6rem}
    label,button,input{font:inherit}
    label{display:block;margin:1.2rem 0 .4rem;color:var(--muted);font:0.82rem/1.2 ui-sans-serif,system-ui}
    input,button{width:100%;padding:.75rem .85rem;border-radius:12px;border:1px solid var(--line)}
    button{margin-top:1rem;background:#16382c;color:#fff;border:0;cursor:pointer}
    button:focus-visible,input:focus-visible{outline:3px solid #e2b943;outline-offset:3px}
    .lede{color:var(--muted);max-width:36ch}
    .error{color:#8f3a32;background:#fff;border:1px solid #d7a39c;border-radius:14px;padding:.85rem 1rem}
  </style>
</head>
<body>
  <header><strong>Demigod Intelligence Engine</strong><span class="mode">Private</span></header>
  <main id="content">
    <h1>Private desk</h1>
    ${message}
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${dest}">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" autocapitalize="off" spellcheck="false">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
      <button type="submit">Open DIE</button>
    </form>
  </main>
</body>
</html>`;
  send(res, error ? 401 : 200, body, 'text/html; charset=utf-8', head, {
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': `default-src 'none'; img-src 'self' data:; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  });
}

function requestContext(req) {
  const hostname = hostName(req.headers.host);
  if (hostname === '127.0.0.1' || hostname === 'localhost') {
    return { mode: 'local_read_only', authenticated: false, hosted: false };
  }
  if (isGatedHost(hostname)) {
    const who = identify(req.headers.cookie, req.headers.authorization);
    const authenticated = who.authenticated;
    return {
      mode: 'gated_public',
      authenticated,
      hosted: true,
      /* Stays !authenticated, with no exemption for api_key. Excusing a failed key from needsLogin
         looked like "don't send a program to a login form", but needsLogin is the gate that returns
         401 — so a REVOKED key would have sailed past it into the data routes as an anonymous
         reader. The login-form branch only fires for UI routes; an API caller already gets JSON. */
      needsLogin: !authenticated,
      email: who.email,
      role: who.role,
      via: who.via || 'session',
      keyId: who.keyId || null,
    };
  }
  if (!TRUST_ACCESS_PROXY || hostname !== PUBLIC_HOST) {
    throw Object.assign(new Error('host_forbidden'), { status: 403 });
  }
  const assertion = String(req.headers['cf-access-jwt-assertion'] || '');
  if (assertion.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(assertion)) {
    throw Object.assign(new Error('access_assertion_required'), { status: 403 });
  }
  // Cloudflared verifies signature, audience, and team before forwarding to this loopback-only origin.
  return { mode: 'hosted_read_only', authenticated: true, hosted: true };
}

function boundedText(value, max, error) {
  const text = String(value || '').trim();
  if (text.length > max || /[\u0000-\u001f]/.test(text)) throw Object.assign(new Error(error), { status: 400 });
  return text;
}

function parseInteger(value, { fallback, min, max, error }) {
  if (value == null || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) throw Object.assign(new Error(error), { status: 400 });
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw Object.assign(new Error(error), { status: 400 });
  }
  return number;
}

function decodeId(raw) {
  let id;
  try {
    id = decodeURIComponent(raw);
  } catch {
    throw Object.assign(new Error('invalid_id'), { status: 400 });
  }
  id = boundedText(id, 160, 'invalid_id');
  if (!id || id.includes('/') || id.includes('\\')) throw Object.assign(new Error('invalid_id'), { status: 400 });
  return id;
}

function companyList(searchParams) {
  const q = boundedText(searchParams.get('q'), 120, 'invalid_query').toLocaleLowerCase();
  const limit = parseInteger(searchParams.get('limit'), {
    fallback: 20, min: 1, max: MAX_LIMIT, error: 'invalid_limit',
  });
  const cursor = parseInteger(searchParams.get('cursor'), {
    fallback: 0, min: 0, max: 1_000_000, error: 'invalid_cursor',
  });
  const inputs = loadPacketInputs();
  const companies = Array.isArray(inputs.map?.companies) ? inputs.map.companies : [];
  const matches = q
    ? companies.filter((row) => [row?.id, row?.name, row?.website, row?.atsSource]
        .some((value) => String(value || '').toLocaleLowerCase().includes(q)))
    : companies;
  const rows = matches.slice(cursor, cursor + limit).map((row) =>
    projectTableRow(buildCompanyPacket({ companyId: row.id, ...inputs })));
  return {
    schema: 'demigod.die-company-list/1',
    q,
    limit,
    cursor,
    nextCursor: cursor + rows.length < matches.length ? String(cursor + rows.length) : null,
    total: matches.length,
    rows,
  };
}

function companyDetail(id) {
  const packet = buildCompanyPacket({ companyId: id, ...loadPacketInputs() });
  if (packet.status === 'unknown') throw Object.assign(new Error('company_not_found'), { status: 404 });
  let observation = null;
  try {
    const record = toMissionCompany(packet);
    observation = { ...record, presentation: presentCompany(record) };
  } catch (error) {
    observation = { error: String(error.message || error) };
  }
  return { ...packet, observation };
}

function roleList() {
  const packets = Object.values(loadPackets().packets || {});
  const rows = packets.map((packet) => {
    const role = projectForReview(packet);
    const workspace = buildDesk(role.roleId).workspace;
    const channels = workspace.candidateChannels;
    return {
      roleId: role.roleId,
      title: role.title,
      companyId: role.companyId,
      demo: packet.demo === true,
      state: workspace.state,
      stage: role.stage,
      checkpoints: workspace.checkpoints,
      channelCounts: {
        inbound: channels.inbound.count,
        referrals: channels.referrals.count,
        shortlist: channels.shortlist.active,
        rediscovery: channels.rediscovery.count,
        priorPairs: channels.priorPairs.count,
        reviewed: channels.reviewed.candidateCount,
      },
      updatedAt: packet.updatedAt || null,
      href: `/roles/${encodeURIComponent(role.roleId)}`,
    };
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return { schema: 'demigod.die-role-list/1', total: rows.length, rows };
}

function roleWorkspace(id) {
  const packet = loadPackets().packets?.[id] || null;
  if (!packet) throw Object.assign(new Error('role_not_found'), { status: 404 });
  projectForReview(packet);
  return buildDesk(id).workspace;
}

function icsEscape(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function icsTime(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slotIcs(mission, slot) {
  const uid = `${slot.id}@die.local`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Demigod DIE//Mission Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsTime(slot.updatedAt || slot.createdAt || new Date().toISOString())}`,
    `DTSTART:${icsTime(slot.start)}`,
    `DTEND:${icsTime(slot.end)}`,
    `SUMMARY:${icsEscape(`${mission.packet?.title || mission.roleId} · ${slot.moment || 'interview'}`)}`,
    `DESCRIPTION:${icsEscape('Demigod hold/book. No invite was sent. Import this file into your calendar.')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];
  return `${lines.join('\r\n')}`;
}

/**
 * May this request change anything?
 *
 * Authenticated was the whole test before named accounts existed, because everyone who got in was
 * the same person. Now a role exists it has to be consulted: a viewer who signs in successfully is
 * still a viewer, and "logged in therefore allowed" is exactly the assumption roles were added to
 * remove. A session with no role is the legacy shared cookie, which only survives while no account
 * exists at all.
 */
/**
 * Per-caller request budget for the hosted surface.
 *
 * Keyed by ACCOUNT when one is signed in, and only by IP when there is not. Keying an authenticated
 * app by IP punishes everyone behind one office NAT for one person's script, and lets one person
 * with several addresses have several budgets — it measures the wrong thing in both directions.
 *
 * The loopback operator is never limited. Their desk is the machine they are sitting at, and a
 * throttle there is a bug that looks like an outage.
 */
const apiHits = new Map();
export const API_WINDOW_MS = 60_000;
export const API_MAX_READS = 240;
export const API_MAX_WRITES = 60;

export function rateKey(context, req) {
  return context?.email ? `acct:${context.email}` : `ip:${webhookClientIp(req)}`;
}

function allowApi(context, req, { write = false, now = Date.now() } = {}) {
  if (context.mode === 'local_read_only') return true;
  return allowWebhookRequest(apiHits, `${rateKey(context, req)}:${write ? 'w' : 'r'}`, {
    now,
    windowMs: API_WINDOW_MS,
    max: write ? API_MAX_WRITES : API_MAX_READS,
  });
}

/* Exported so the test can call THIS function. It used to be private, so the test reimplemented the
   rule inline — and the copy drifted into asserting the bug was correct. A rule worth testing is
   worth importing. */
export function canMutate(context) {
  if (context.mode === 'local_read_only') return true;
  if (context.authenticated !== true) return false;
  if (context.role) return roleCan(context.role, 'write');
  /*
   * No role. What that means depends on HOW the caller got here, and the two cases are not alike.
   *
   * `gated_public` with no role is the legacy shared-password cookie, which only verifies while
   * zero accounts exist — `identify` retires it the moment a first account is created. Possession
   * of the shared secret is the authentication, and in that pre-accounts pilot the operator is the
   * only person who can be holding it. They keep their desk.
   *
   * `hosted_read_only` is Cloudflare Access, and it is the hole. It sets authenticated:true purely
   * because a request arrived through the proxy — and this origin deliberately refuses to trust the
   * forwarded authenticated-user header (see the assertion in the test that this file must never
   * even name it), so it has no idea who the caller is. The old `role ? … : true` fallback treated
   * that as permission, letting an unidentified caller mutate the desk and land in the audit as
   * account:null. An identity-aware proxy proves someone got in; it does not say who, and
   * "someone" cannot be attributed.
   */
  return context.mode === 'gated_public';
}

function hydrateMission(roleId, { account = null } = {}) {
  const packet = loadPackets().packets?.[roleId] || null;
  if (!packet) throw Object.assign(new Error('role_not_found'), { status: 404 });
  if (packet.demo === true) {
    return {
      schema: 'demigod.die-role-mission/1',
      roleId,
      state: 'demo_only',
      mission: null,
      surfaces: null,
      reason: 'demo_packet_not_delivery_ready',
    };
  }
  let mission = STORE.get(roleId);
  if (!mission) {
    /* `owner` stays the desk role, NOT the account address — identity travels in `account`.
       Putting the email here looked like the obvious fix for "every receipt says operator", but
       `actor` is `mission.owner`, and actor is not an address-allowed field: shapeActivityRow would
       have dropped every row it appeared in. Attribution would have deleted the receipts it was
       added to label. The two facts stay separate, which is what the audit-shape comment argued
       for in the first place. */
    mission = openRoleMission({ packet, owner: 'operator' });
    mission.actingAccount = account;
    if (packet.companyId) {
      try {
        const company = buildCompanyPacket({ companyId: packet.companyId, ...loadPacketInputs() });
        mission = attachCompany(mission, toMissionCompany(company));
      } catch {
        // Company attach is optional; hire can start from the packet alone.
      }
    }
    STORE.put(mission);
  }
  return {
    schema: 'demigod.die-role-mission/1',
    roleId,
    state: mission.closeState,
    mission,
    surfaces: projectSurfaces(mission),
    reason: null,
  };
}

function applyMissionAction(roleId, body = {}, { account = null } = {}) {
  const opened = hydrateMission(roleId, { account });
  if (!opened.mission) throw Object.assign(new Error(opened.reason || 'mission_unavailable'), { status: 400 });
  /*
   * Optimistic concurrency, when the caller says what it was looking at.
   *
   * Two operators open the same mission, one advances a candidate, and the second submits an
   * action decided against a screen that is now several versions stale. Nothing here was ever lost
   * to a race -- each request re-reads the mission and the handler is synchronous between read and
   * write -- but "not a lost update" is not the same as "acted on current information", and the
   * second operator has no way to find out they were wrong.
   *
   * Optional rather than required: making it mandatory would break every existing caller, and a
   * client that cannot say what it saw is no worse off than before. One that CAN say gets told.
   * The current version travels in the detail, in the same `code:detail` shape the kernel already
   * uses, so the client can refetch without a second round trip.
   */
  if (body.expectedVersion !== undefined && body.expectedVersion !== null) {
    const expected = Number(body.expectedVersion);
    const current = Number(opened.mission.version);
    if (!Number.isSafeInteger(expected)) {
      throw Object.assign(new Error('mission_expected_version_invalid'), { status: 400 });
    }
    if (expected !== current) {
      throw Object.assign(new Error(`mission_version_conflict:${current}`), { status: 409 });
    }
  }
  /* Set once, before the action branch, so every path through the kernel stamps the same account
     onto whatever event it pushes. Threading it through each of the eleven mutators individually
     would mean one of them eventually forgets. */
  let mission = { ...opened.mission, actingAccount: account };
  const action = String(body.action || '').trim();
  if (action === 'apply') mission = applyCandidate(mission, { candId: body.candId, source: body.source || 'applied' });
  else if (action === 'advance') mission = advanceApplication(mission, { candId: body.candId, to: body.to });
  else if (action === 'hold') {
    mission = holdSlot(mission, {
      candId: body.candId, start: body.start, end: body.end,
      interviewer: body.interviewer || 'operator', moment: body.moment || null,
    });
  } else if (action === 'book') {
    mission = bookSlot(mission, {
      slotId: body.slotId || null, candId: body.candId, start: body.start, end: body.end,
      interviewer: body.interviewer || 'operator', moment: body.moment || null,
    });
  } else if (action === 'debrief') mission = recordDebrief(mission, { slotId: body.slotId });
  else if (action === 'offer_terms') {
    mission = recordOfferTerms(mission, { candId: body.candId, terms: body.terms, band: body.band || null });
  } else if (action === 'call_note') {
    mission = attachCallNote(mission, {
      slotId: body.slotId, kind: body.kind || 'candidate_screen', summary: body.summary,
    });
  } else if (action === 'scorecard') {
    mission = recordScorecard(mission, createNote({
      roleId: mission.roleId,
      candId: body.candId,
      reviewedBy: body.reviewedBy || 'operator',
      ratings: body.ratings,
    }));
  } else if (action === 'close') mission = closeMission(mission, { state: body.state });
  else if (action === 'outcome') {
    mission = recordOutcome(mission, { learned: body.learned, keep: body.keep || [], avoid: body.avoid || [] });
  } else {
    throw Object.assign(new Error('mission_action_unknown'), { status: 400 });
  }
  STORE.put(mission);
  const last = mission.events?.at(-1);
  if (last) {
    STORE.audit({
      id: last.id,
      roleId,
      action: last.action,
      at: last.at,
      idempotencyKey: last.idempotencyKey,
      /* Two different facts, kept apart. `actor` is who the record is ABOUT — the interviewer, the
         reviewer, whoever the desk is recording. `account` is who was signed in and made the
         request. Collapsing them would let "Priya interviewed the candidate" and "Priya typed this
         in" become the same claim, and only one of those is evidence. Null account means the
         legacy anonymous cookie or loopback, which is itself worth being able to see in the log. */
      actor: last.actor,
      account,
    });
  }
  return {
    schema: 'demigod.die-role-mission/1',
    roleId,
    state: mission.closeState,
    mission,
    surfaces: projectSurfaces(mission),
    reason: null,
  };
}

function activityList(searchParams) {
  const entity = boundedText(searchParams.get('entity'), 160, 'invalid_entity');
  const limit = parseInteger(searchParams.get('limit'), {
    fallback: 20, min: 1, max: MAX_LIMIT, error: 'invalid_limit',
  });
  const cursor = parseInteger(searchParams.get('cursor'), {
    fallback: 0, min: 0, max: 1_000_000, error: 'invalid_cursor',
  });
  const receipts = [];
  for (const mission of STORE.list()) {
    for (const event of mission?.events || []) receipts.push(event);
  }
  return projectActivityList({ receipts, entity: entity || null, limit, cursor });
}

/**
 * A ceiling, not a page size. The browse routes page at MAX_LIMIT because a UI shows a screenful;
 * an export that silently handed back a screenful would be the worse failure, so this is set above
 * the largest real dataset and the route refuses rather than truncates when something exceeds it.
 */
export const EXPORT_MAX_ROWS = parseInteger(process.env.DEMIGOD_DIE_EXPORT_MAX, {
  fallback: 10_000, min: 1, max: 1_000_000, error: 'invalid_export_max',
});

/**
 * The datasets a customer can take with them, unpaginated.
 *
 * Deliberately built from the same projections the API serves rather than from the files
 * underneath: an export that reads raw disk would drift from what the product shows, and then two
 * numbers exist for the same question. This is also why the whole corpus is not offered as one
 * dataset — these are the four the app actually renders, and exporting a shape nobody has seen
 * would be publishing an unreviewed schema.
 */
/* Each dataset answers `count` WITHOUT building `rows`. The first version checked the cap after
   materialising everything, which meant an oversized export did the full 18 seconds of work for
   2,912 company packets and only then refused — protecting the caller from a misleading file while
   doing nothing to protect the server, which is the other half of why a limit exists. A cap you pay
   for before you enforce it is not a cap. */
/*
 * `rows` is a GENERATOR and `columns` is declared.
 *
 * The companies export builds a packet per company: 2,912 of them, ~1.4MB of CSV, and the whole
 * thing sat in memory before a single byte reached the caller. Yielding row by row lets the first
 * bytes go out immediately, which also stops a proxy timing out a request that is in fact
 * progressing.
 *
 * Columns are declared rather than inferred because a stream cannot see every row before writing
 * the header. That is the better contract regardless: an inferred header changes shape between
 * exports depending on which rows happened to carry which fields, so a pipeline built on it gets a
 * column that silently appears and disappears. demigod-die-web.test.mjs asserts the declaration
 * still matches what each projection produces, so drift fails a gate instead of quietly dropping a
 * column from a customer's file.
 */
export const EXPORTS = {
  companies: {
    columns: ['id', 'name', 'domain', 'website', 'source', 'hiring', 'openRoles', 'ats', 'lastSignal',
      'researchStatus', 'unknownsCount', 'peers', 'peerBasis', 'href'],
    // One load, not two: this expression used to call loadPacketInputs() twice.
    count: () => { const c = loadPacketInputs().map?.companies; return Array.isArray(c) ? c.length : 0; },
    *rows() {
      const inputs = loadPacketInputs();
      const companies = Array.isArray(inputs.map?.companies) ? inputs.map.companies : [];
      for (const row of companies) yield projectTableRow(buildCompanyPacket({ companyId: row.id, ...inputs }));
    },
  },
  roles: {
    columns: ['roleId', 'title', 'companyId', 'demo', 'state', 'stage', 'checkpoints', 'channelCounts', 'updatedAt', 'href'],
    count: () => roleList().rows.length,
    *rows() { yield* roleList().rows; },
  },
  missions: {
    columns: ['roleId', 'title', 'closeState', 'companyId', 'updatedAt', 'href'],
    count: () => missionList().rows.length,
    *rows() { yield* missionList().rows; },
  },
  calendar: {
    columns: ['id', 'candId', 'interviewer', 'moment', 'start', 'end', 'state', 'createdAt', 'updatedAt', 'roleId', 'title', 'href'],
    count: () => calendarList().slots.length,
    *rows() { yield* calendarList().slots; },
  },
  activity: {
    columns: ['id', 'at', 'actor', 'account', 'entity', 'action', 'beforeVersion', 'afterVersion',
      'idempotencyKey', 'result', 'candId'],
    count: () => STORE.list().reduce((n, m) => n + (m?.events?.length || 0), 0),
    *rows() {
      for (const mission of STORE.list()) yield* (mission?.events || []);
    },
  },
};

function missionList() {
  const rows = STORE.list().map((mission) => ({
    roleId: mission.roleId,
    title: mission.packet?.title || mission.roleId,
    closeState: mission.closeState,
    companyId: mission.packet?.companyId || null,
    updatedAt: mission.updatedAt,
    href: `/roles/${encodeURIComponent(mission.roleId)}`,
  }));
  return { schema: 'demigod.die-mission-list/1', total: rows.length, rows };
}

function calendarList() {
  const slots = [];
  for (const mission of STORE.list()) {
    for (const slot of mission.calendar?.slots || []) {
      slots.push({
        ...slot,
        roleId: mission.roleId,
        title: mission.packet?.title || mission.roleId,
        href: `/api/v1/roles/${encodeURIComponent(mission.roleId)}/slots/${encodeURIComponent(slot.id)}.ics`,
      });
    }
  }
  return { schema: 'demigod.die-calendar/1', total: slots.length, slots };
}

function readJsonBody(req, limit = 32_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (chunk) => {
      n += chunk.length;
      if (n > limit) {
        reject(Object.assign(new Error('body_too_large'), { status: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('invalid_json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const uiRoute = (pathname) => pathname === '/'
  || pathname === '/roles'
  || pathname === '/companies'
  || pathname === '/activity'
  || pathname === '/access'
  || pathname === '/signals'
  || pathname === '/missions'
  || pathname === '/calendar'
  || /^\/(?:roles|companies)\/[^/]+$/.test(pathname);

export function createDieWebServer() {
  return http.createServer(async (req, res) => {
    const method = String(req.method || 'GET').toUpperCase();
    const head = method === 'HEAD';
    let context;
    try {
      context = requestContext(req);
    } catch (error) {
      sendJson(res, error.status || 403, { ok: false, error: error.message || 'host_forbidden' }, head);
      return;
    }
    let url;
    try {
      url = new URL(req.url || '/', `http://${HOST}`);
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_url' }, head);
      return;
    }
    const missionGet = url.pathname.match(/^\/api\/v1\/roles\/([^/]+)\/mission$/);
    const missionAct = url.pathname.match(/^\/api\/v1\/roles\/([^/]+)\/mission\/actions$/);
    const gatePost = url.pathname === '/login' || url.pathname === '/logout';
    const passwordPost = url.pathname === '/api/v1/account/password';
    const adminPost = ['/api/v1/accounts', '/api/v1/accounts/disable', '/api/v1/keys', '/api/v1/keys/revoke']
      .includes(url.pathname);
    if (!['GET', 'HEAD'].includes(method)
      && !(method === 'POST' && (missionAct || gatePost || passwordPost || adminPost))) {
      sendJson(res, 405, { ok: false, error: 'method_not_allowed' }, false, { Allow: 'GET, HEAD, POST' });
      return;
    }
    const noindex = context.hosted ? { 'X-Robots-Tag': 'noindex, nofollow' } : {};
    try {
      if (url.pathname === '/healthz') {
        /* Actually asks the database something.
           This returned 200 unconditionally, so it answered "healthy" for a process whose store had
           been deleted, moved, or corrupted — the same shape as the desk reporting it was publicly
           up because a text file said so. A check that cannot fail is not a check. `seen()` is an
           indexed lookup on a key that will never exist, so it costs nothing and still proves the
           file is open and readable. */
        let store = 'ok';
        try { STORE.seen('healthz-probe-never-written'); }
        catch (error) { store = `unreadable: ${String(error.message || error).slice(0, 120)}`; }
        const healthy = store === 'ok';
        if (!healthy) logEvent({ level: 'error', event: 'health_degraded', store });
        sendJson(res, healthy ? 200 : 503, {
          ok: healthy, service: 'demigod-die-web', release: RELEASE_ID, store,
        }, head);
      } else if (url.pathname === '/robots.txt') {
        send(res, 200, 'User-agent: *\nDisallow: /\n', 'text/plain; charset=utf-8', head, noindex);
      } else if (url.pathname === '/favicon.ico') {
        send(res, 204, '', 'image/x-icon', head, noindex);
      } else if ((method === 'GET' || head) && url.pathname === '/login' && !context.hosted) {
        res.writeHead(303, { ...baseHeaders, ...noindex, Location: '/roles' });
        res.end();
      } else if (method === 'POST' && url.pathname === '/logout') {
        res.writeHead(303, {
          ...baseHeaders,
          ...noindex,
          Location: context.hosted ? '/login' : '/roles',
          'Set-Cookie': `${GATE_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
        });
        res.end();
      } else if (context.hosted && (url.pathname === '/login' || (context.needsLogin && uiRoute(url.pathname)))) {
        if (!context.needsLogin && (method === 'GET' || head) && url.pathname === '/login') {
          res.writeHead(303, { ...baseHeaders, ...noindex, Location: safeNext(url.searchParams.get('next')) });
          res.end();
          return;
        }
        if (method === 'POST' && url.pathname === '/login') {
          if (!GATE_SECRET || !context.hosted) {
            sendJson(res, 403, { ok: false, error: 'login_unavailable' });
            return;
          }
          const ip = clientIp(req);
          if (loginBlocked(ip)) {
            sendLoginUi(res, { error: 'login_blocked', next: url.searchParams.get('next') });
            return;
          }
          const origin = String(req.headers.origin || '');
          if (origin && origin !== 'null') {
            let parsed;
            try { parsed = new URL(origin); } catch {
              sendJson(res, 403, { ok: false, error: 'origin_forbidden' });
              return;
            }
            if (hostName(parsed.host) !== hostName(req.headers.host)) {
              sendJson(res, 403, { ok: false, error: 'origin_forbidden' });
              return;
            }
          }
          const type = String(req.headers['content-type'] || '');
          let password = '';
          let email = '';
          let nextPath = url.searchParams.get('next');
          if (type.includes('application/json')) {
            const payload = await readJsonBody(req, 4096);
            password = String(payload.password || '');
            email = String(payload.email || '');
            nextPath = payload.next || nextPath;
          } else {
            const raw = await new Promise((resolve, reject) => {
              const chunks = [];
              let n = 0;
              req.on('data', (chunk) => {
                n += chunk.length;
                if (n > 4096) {
                  reject(Object.assign(new Error('body_too_large'), { status: 413 }));
                  req.destroy();
                } else chunks.push(chunk);
              });
              req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
              req.on('error', reject);
            });
            const form = new URLSearchParams(raw);
            password = String(form.get('password') || '');
            email = String(form.get('email') || '');
            nextPath = form.get('next') || nextPath;
          }
          /* Named accounts first, the shared password second. A single secret cannot say who did
             anything, cannot be withdrawn from one person, and is the largest gap between this desk
             and something other people can be given. It stays as a fallback only while accounts are
             empty, so the machine never locks its own operator out mid-migration — once one account
             exists, the shared password stops being accepted. */
          const accounts = loadAccounts();
          const named = accounts.users.length > 0;
          let cookieValue = null;
          if (named) {
            /* Accounts exist but no signing key is configured: refuse rather than sign with the
               shared password. Issuing here would hand out a cookie that anyone holding that
               password could have forged themselves, which is worse than not logging in. */
            if (!SESSION_SECRET) {
              sendJson(res, 503, { ok: false, error: 'session_secret_required' });
              return;
            }
            const auth = authenticateAccount(accounts, email, password);
            if (!auth.ok) {
              noteLoginFail(ip);
              sendLoginUi(res, { error: 'login_invalid', next: nextPath });
              return;
            }
            cookieValue = issueSession(auth.user, SESSION_SECRET);
          } else {
            if (!GATE_SECRET || !secretEqual(password, GATE_SECRET)) {
              noteLoginFail(ip);
              sendLoginUi(res, { error: 'login_invalid', next: nextPath });
              return;
            }
            cookieValue = makeGateCookie();
          }
          const secure = context.hosted ? '; Secure' : '';
          res.writeHead(303, {
            ...baseHeaders,
            ...noindex,
            Location: safeNext(nextPath),
            'Set-Cookie': `${GATE_COOKIE}=${cookieValue}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(GATE_MS / 1000)}${secure}`,
          });
          res.end();
          return;
        }
        sendLoginUi(res, { head, next: url.pathname === '/login' ? url.searchParams.get('next') : url.pathname });
      } else if (context.needsLogin) {
        sendJson(res, 401, { ok: false, error: 'login_required' }, head, noindex);
      } else if (url.pathname.startsWith('/api/') && !allowApi(context, req, { write: method === 'POST' })) {
        /* Retry-After is the difference between a limit and a mystery: a client that is told when
           to come back can, and one that is not will simply retry immediately and make it worse. */
        sendJson(res, 429, { ok: false, error: 'rate_limited', retryAfterSeconds: Math.ceil(API_WINDOW_MS / 1000) }, head, {
          'Retry-After': String(Math.ceil(API_WINDOW_MS / 1000)),
        });
      } else if (url.pathname === '/api/v1/session') {
        sendJson(res, 200, {
          schema: 'demigod.die-session/1',
          mode: context.mode,
          modeLabel: modeLabel(context.mode),
          authenticated: context.authenticated === true,
          hosted: context.hosted === true,
          /* Who, not just whether. An action that cannot be attributed to a person is the thing a
             shared password made impossible, and it is what an audit trail needs to be worth
             keeping. null here means the legacy anonymous cookie, which stops being accepted the
             moment a first account exists. */
          user: context.email || null,
          role: context.role || null,
          can: context.role
            ? { read: roleCan(context.role, 'read'), write: roleCan(context.role, 'write'), admin: roleCan(context.role, 'admin') }
            : null,
          accounts: loadAccounts().users.length,
          mutations: canMutate(context),
          access: accessState(context),
          release: RELEASE_ID,
        }, head, noindex);
      } else if (passwordPost) {
        /* A person changing their own password, having proved the current one.
           Explicitly NOT reachable with an API key: a key is a machine credential, and letting one
           set its owner's password would turn "this key leaked" into "this account is gone". The
           key holder can still be the same person — they can sign in and do it in a browser. */
        if (context.via === 'api_key') {
          sendJson(res, 403, { ok: false, error: 'password_change_requires_a_session' }, head);
          return;
        }
        if (!context.email || !SESSION_SECRET) {
          sendJson(res, 403, { ok: false, error: 'password_change_requires_an_account' }, head);
          return;
        }
        const body = await readJsonBody(req, 4096);
        const changed = changePassword(loadAccounts(), context.email,
          String(body.currentPassword || ''), String(body.newPassword || ''));
        if (!changed.ok) {
          noteLoginFail(clientIp(req));
          sendJson(res, 403, { ok: false, error: 'invalid_credentials' }, head);
          return;
        }
        saveAccounts(changed.doc);
        logEvent({ level: 'info', event: 'password_changed', account: context.email });
        /* The epoch bump just invalidated every session for this account, including the one that
           asked. Handing back a fresh cookie means the person who made the change stays signed in
           while everyone else holding an old one does not — which is the outcome they wanted. */
        const fresh = issueSession({ email: context.email, role: context.role, sessionEpoch: findUser(changed.doc, context.email)?.sessionEpoch }, SESSION_SECRET);
        res.writeHead(200, {
          ...baseHeaders,
          ...noindex,
          'Content-Type': 'application/json; charset=utf-8',
          // Secure only when hosted, matching the login handler — hardcoding it makes the
          // replacement cookie undeliverable in any plain-HTTP context the login itself supports.
          'Set-Cookie': `${GATE_COOKIE}=${fresh}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(GATE_MS / 1000)}${context.hosted ? '; Secure' : ''}`,
        });
        res.end(`${JSON.stringify({ ok: true, otherSessionsEnded: true })}\n`);
      } else if (url.pathname === '/api/v1/accounts' && method === 'GET') {
        if (!roleCan(context.role, 'admin')) {
          sendJson(res, 403, { ok: false, error: 'admin_required' }, head);
          return;
        }
        const doc = loadAccounts();
        sendJson(res, 200, {
          schema: 'demigod.die-accounts-list/1',
          /* Never the hash, never a key secret. This route exists so an admin can see who has
             access, which needs names and roles and nothing that could be used to become them. */
          users: doc.users.map((u) => ({
            email: normalizeEmail(u.email),
            role: u.role,
            disabled: Boolean(u.disabledAt),
            createdAt: u.createdAt || null,
            updatedAt: u.updatedAt || null,
            keys: (u.keys || []).filter((k) => !k.revokedAt).length,
          })),
          keys: listApiKeys(doc),
        }, head);
      } else if (adminPost) {
        /*
         * Account administration, and why it is here at all.
         *
         * Until now the only way to add a colleague was the CLI on this laptop. That is workable
         * for the person who owns the machine and impossible for anyone running this as a hosted
         * app, which is the entire premise of putting it up for others to use.
         *
         * Session required, not an API key -- the same rule as changing a password. An admin key
         * that leaked would otherwise be full account takeover: mint yourself a user, sign in,
         * done. Provisioning by machine is a real enterprise need, but it wants its own narrower
         * credential rather than a bearer token that can also read the whole corpus.
         */
        if (!roleCan(context.role, 'admin')) {
          sendJson(res, 403, { ok: false, error: 'admin_required' }, head);
          return;
        }
        if (context.via === 'api_key') {
          sendJson(res, 403, { ok: false, error: 'account_admin_requires_a_session' }, head);
          return;
        }
        const body = await readJsonBody(req, 8192);
        const doc = loadAccounts();
        /* The lockout guard. An account store with no enabled admin cannot be repaired through this
           API by anyone -- it would need shell access to the host, which is exactly what a hosted
           operator does not have. So the last admin can be neither disabled nor demoted. */
        const enabledAdmins = doc.users.filter((u) => u.role === 'admin' && !u.disabledAt).map((u) => normalizeEmail(u.email));
        const isLastAdmin = (email) => enabledAdmins.length === 1 && enabledAdmins[0] === normalizeEmail(email);

        if (url.pathname === '/api/v1/accounts') {
          const email = normalizeEmail(body.email);
          if (!email) { sendJson(res, 400, { ok: false, error: 'invalid_email' }, head); return; }
          const existing = findUser(doc, email);
          const role = String(body.role || existing?.role || 'viewer');
          if (!ROLE_NAMES.includes(role)) { sendJson(res, 400, { ok: false, error: 'invalid_role', roles: ROLE_NAMES }, head); return; }
          if (!existing && !body.password) { sendJson(res, 400, { ok: false, error: 'password_required_for_a_new_account' }, head); return; }
          if (existing?.role === 'admin' && role !== 'admin' && isLastAdmin(email)) {
            sendJson(res, 409, { ok: false, error: 'refusing_to_demote_the_last_admin' }, head); return;
          }
          let next;
          try {
            next = upsertUser(doc, { email, role, password: body.password ? String(body.password) : undefined });
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error.message || 'invalid_account') }, head); return;
          }
          saveAccounts(next);
          logEvent({ level: 'info', event: existing ? 'account_updated' : 'account_created', account: context.email, subject: email, role });
          sendJson(res, 200, { ok: true, email, role, created: !existing }, head);
        } else if (url.pathname === '/api/v1/accounts/disable') {
          const email = normalizeEmail(body.email);
          if (!email || !findUser(doc, email)) { sendJson(res, 404, { ok: false, error: 'no_such_account' }, head); return; }
          if (isLastAdmin(email)) { sendJson(res, 409, { ok: false, error: 'refusing_to_disable_the_last_admin' }, head); return; }
          saveAccounts(disableUser(doc, email));
          logEvent({ level: 'info', event: 'account_disabled', account: context.email, subject: email });
          sendJson(res, 200, { ok: true, disabled: email }, head);
        } else if (url.pathname === '/api/v1/keys') {
          const email = normalizeEmail(body.email) || context.email;
          try {
            const issued = issueApiKey(doc, { email, label: String(body.label || ''), role: body.role || undefined });
            saveAccounts(issued.doc);
            logEvent({ level: 'info', event: 'api_key_issued', account: context.email, subject: email, keyId: issued.id });
            /* Returned once and never recoverable, so the response says so rather than leaving the
               caller to discover it when they come back for it. */
            sendJson(res, 200, { ok: true, id: issued.id, key: issued.secret, shown: 'once' }, head);
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error.message || 'key_refused') }, head);
          }
        } else {
          const id = String(body.id || '');
          if (!/^[0-9a-f]{12}$/.test(id)) { sendJson(res, 400, { ok: false, error: 'invalid_key_id' }, head); return; }
          saveAccounts(revokeApiKey(doc, id));
          logEvent({ level: 'info', event: 'api_key_revoked', account: context.email, keyId: id });
          sendJson(res, 200, { ok: true, revoked: id }, head);
        }
      } else if (url.pathname === '/api/v1/companies') {
        sendJson(res, 200, companyList(url.searchParams), head);
      } else if (url.pathname.startsWith('/api/v1/companies/')) {
        sendJson(res, 200, companyDetail(decodeId(url.pathname.slice('/api/v1/companies/'.length))), head);
      } else if (url.pathname === '/api/v1/roles') {
        sendJson(res, 200, roleList(), head);
      } else if (url.pathname === '/api/v1/missions') {
        sendJson(res, 200, missionList(), head);
      } else if (url.pathname === '/api/v1/calendar') {
        sendJson(res, 200, calendarList(), head);
      } else if (url.pathname.startsWith('/api/v1/roles/') && url.pathname.endsWith('/workspace')) {
        const raw = url.pathname.slice('/api/v1/roles/'.length, -'/workspace'.length);
        sendJson(res, 200, roleWorkspace(decodeId(raw)), head);
      } else if (missionGet) {
        sendJson(res, 200, hydrateMission(decodeId(missionGet[1])), head);
      } else if (missionAct && method === 'POST') {
        if (!canMutate(context)) {
          sendJson(res, 403, { ok: false, error: 'mutation_forbidden' }, head);
          return;
        }
        const body = await readJsonBody(req);
        sendJson(res, 200, applyMissionAction(decodeId(missionAct[1]), body, { account: context.email || null }), false);
      } else if (url.pathname.match(/^\/api\/v1\/roles\/[^/]+\/slots\/[^/]+\.ics$/)) {
        const parts = url.pathname.split('/');
        const roleId = decodeId(parts[4]);
        const slotId = decodeId(parts[6].replace(/\.ics$/, ''));
        const opened = hydrateMission(roleId);
        const slot = opened.mission?.calendar?.slots?.find((row) => row.id === slotId);
        if (!slot) throw Object.assign(new Error('slot_missing'), { status: 404 });
        send(res, 200, slotIcs(opened.mission, slot), 'text/calendar; charset=utf-8', head, {
          'Content-Disposition': `attachment; filename="${slotId}.ics"`,
        });
      } else if (url.pathname === '/api/v1/activity') {
        sendJson(res, 200, activityList(url.searchParams), head);
      } else if (url.pathname === '/api/v1/signals') {
        /* What changed in the world, as opposed to what we did — /api/v1/activity is our own
           mutations and answers a different question. The data has existed since 2026-07-24 in
           DEMIGOD-HIRING-HISTORY.jsonl and nothing in this app had ever read it. */
        const lines = loadHistory();
        if (!lines) {
          sendJson(res, 200, { schema: 'demigod.die-signals/1', ok: false, why: 'hiring history is unreadable', signals: [] }, head);
          return;
        }
        const state = boundedText(url.searchParams.get('state'), 40, 'invalid_state');
        const limit = parseInteger(url.searchParams.get('limit'), {
          fallback: 25, min: 1, max: MAX_LIMIT, error: 'invalid_limit',
        });
        const watchedOnly = url.searchParams.get('watched') === '1';
        /* An unfiltered feed of 490 companies buries the two that matter under 488 that do not, and
           signals decay while you scroll. The watchlist needs no new state: a company with an open
           mission is a company someone is hiring against. */
        const feed = signalsFrom(lines, {
          limit: watchedOnly ? 0 : limit,
          states: state ? [state] : null,
        });
        const body = watchedOnly
          ? withWatchlist(feed, STORE.list().map((m) => m?.crm?.company?.companyId || m?.packet?.companyId).filter(Boolean))
          : feed;
        sendJson(res, 200, { schema: 'demigod.die-signals/1', ...body }, head);
      } else if (url.pathname === '/api/v1/lifespan') {
        /* How long roles actually stay open, from the archive reconstruction. Unique data that DIE
           has never shown, and the exclusions travel with it: of 24,775 observed spans only 1,105
           can support a duration claim, and a median quoted without that denominator is a different,
           easier number. */
        const feed = lifespans(loadLifespan(LIFESPAN_HISTORY, {}), loadLifespan(LIFESPAN_MAP, {}));
        const company = boundedText(url.searchParams.get('company'), 160, 'invalid_company');
        if (company) {
          const one = (feed.companies || []).find((c) => c.companyId === company);
          sendJson(res, 200, { schema: 'demigod.die-lifespan/1', ...(one || { companyId: company, ok: false, why: 'no archived board for this company yet' }) }, head);
          return;
        }
        const limit = parseInteger(url.searchParams.get('limit'), {
          fallback: 25, min: 1, max: MAX_LIMIT, error: 'invalid_limit',
        });
        sendJson(res, 200, {
          schema: 'demigod.die-lifespan/1',
          ok: feed.ok,
          why: feed.why ?? null,
          boardsCollected: feed.boardsCollected ?? 0,
          companiesWithAClaim: feed.companiesWithAClaim ?? 0,
          overall: feed.overall ?? null,
          companies: (feed.companies || []).slice(0, limit),
        }, head);
      } else if (url.pathname === '/api/v1/export') {
        const dataset = String(url.searchParams.get('dataset') || '');
        const format = String(url.searchParams.get('format') || 'csv').toLowerCase();
        if (!EXPORTS[dataset]) {
          sendJson(res, 400, { ok: false, error: 'unknown_dataset', datasets: Object.keys(EXPORTS) }, head);
          return;
        }
        if (format !== 'csv' && format !== 'json') {
          sendJson(res, 400, { ok: false, error: 'unknown_format', formats: ['csv', 'json'] }, head);
          return;
        }
        /* A partial export must not look like a whole one. There is no field in a CSV to carry
           "and 900 more" — the file opens in Excel looking complete, gets treated as the full
           corpus, and every number derived from it is quietly wrong. Refusing is the only outcome
           that cannot be mistaken for success, so an oversized export fails with the count and the
           route that can page through it rather than handing over a truncated file. The count is
           taken before the rows are built, so the refusal costs a length rather than the export. */
        const total = EXPORTS[dataset].count();
        if (total > EXPORT_MAX_ROWS) {
          sendJson(res, 413, {
            ok: false,
            error: 'export_too_large',
            rows: total,
            max: EXPORT_MAX_ROWS,
            hint: `page through /api/v1/${dataset} with limit and cursor instead`,
          }, head);
          return;
        }
        const filename = exportFilename(dataset, format);
        const columns = EXPORTS[dataset].columns;
        res.writeHead(200, {
          ...baseHeaders,
          ...noindex,
          'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });
        if (head) { res.end(); return; }
        /*
         * A synchronous loop over res.write() is not streaming, which is what my first version of
         * this was. Node queues each chunk, but the socket can only flush when the event loop
         * turns — and a `for` loop building 2,912 company packets never lets it turn. The bytes
         * piled up in the socket buffer and left in one burst at the end: 28s to first byte, and no
         * memory saved either, which was the whole point.
         *
         * So the loop yields. `write()` returning false means the buffer is full and the consumer
         * is behind; continuing past that is how one slow client becomes unbounded server memory,
         * and waiting for 'drain' is the backpressure that stops it. On a fast client it still
         * hands the event loop a turn each batch so the flush actually happens.
         */
        const BATCH = 64;
        const push = (chunk) => new Promise((resolve) => {
          if (res.write(chunk)) setImmediate(resolve);
          else res.once('drain', resolve);
        });
        try {
          let n = 0;
          let pending = '';
          const flush = async (force) => {
            n += 1;
            if (!force && n % BATCH !== 0) return;
            const chunk = pending;
            pending = '';
            if (chunk) await push(chunk);
          };
          if (format === 'json') {
            await push(`{"schema":"demigod.die-export/1","dataset":${JSON.stringify(dataset)},"total":${total},"rows":[`);
            let first = true;
            for (const row of EXPORTS[dataset].rows()) {
              pending += first ? JSON.stringify(row) : `,${JSON.stringify(row)}`;
              first = false;
              await flush(false);
            }
            await flush(true);
            res.end(']}\n');
          } else {
            await push(csvRow(Object.fromEntries(columns.map((c) => [c, c])), columns));
            for (const row of EXPORTS[dataset].rows()) {
              pending += csvRow(row, columns);
              await flush(false);
            }
            await flush(true);
            res.end();
          }
        } catch (error) {
          /* The headers said 200 several megabytes ago, so there is no status left to change and no
             error body that would not be appended to the file the caller is already writing to
             disk. Destroying the socket is the only signal left: it surfaces as a truncated
             download rather than a CSV that looks complete and is not. The operator gets the real
             reason in the journal. */
          logEvent({ level: 'error', event: 'export_failed_mid_stream', dataset, format, rowsDeclared: total, error: String(error?.message || error).slice(0, 300) });
          res.destroy();
        }
      } else if (uiRoute(url.pathname)) {
        sendUi(res, head, noindex);
      } else {
        sendJson(res, 404, { ok: false, error: 'not_found' }, head);
      }
    } catch (error) {
      /*
       * Is this the caller's fault or ours?
       *
       * This was a prefix allowlist -- advance_, mission_, slot_, and ten more -- and it missed 30
       * of the 125 domain codes the kernel and packet actually throw, including the whole note_*
       * family, which is scorecard validation: the most user-facing input in the product. Sending
       * `mh-1` where `mh1` was meant returned 500 internal_error. The caller could not tell they
       * had made a typo, and every such typo looked like a server fault in the logs, which is how
       * real 500s get lost among fake ones.
       *
       * Every deliberate throw in this codebase is a snake_case code, optionally with a `:detail`.
       * Anything accidental -- "x is not a function", "Cannot read properties of undefined",
       * "socket hang up" -- carries spaces or capitals and cannot match. So the shape of the
       * message classifies it, and a domain code added tomorrow is covered without anyone
       * remembering to extend a list. Verified against all 125 current codes and six real runtime
       * errors.
       *
       * The details are safe to return: they interpolate stage names, slot states, and must-have
       * ids, never candidate text. Checked before widening this.
       */
      const known = /^[a-z][a-z0-9_]*(:.+)?$/.test(String(error.message || ''));
      const status = Number.isInteger(error?.status) ? error.status : known ? 400 : 500;
      /* A 500 is a bug in here; a 4xx is a caller doing something the contract refuses. Only the
         first is worth waking anyone for, and only the first gets a stack. The caller still sees
         `internal_error` and nothing more — the detail goes to the operator, not over the wire. */
      if (status >= 500) {
        logEvent({
          level: 'error',
          event: 'request_failed',
          method,
          path: url?.pathname || null,
          status,
          error: String(error?.message || error).slice(0, 300),
          stack: String(error?.stack || '').split('\n').slice(1, 4).map((line) => line.trim()),
        });
      }
      sendJson(res, status, {
        ok: false,
        error: status === 500 ? 'internal_error' : String(error.message || 'request_failed'),
      }, head);
    }
  });
}

export function listenDieWeb({ port = DEFAULT_PORT } = {}) {
  const server = createDieWebServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => resolve(server));
  });
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  const equal = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return equal ? equal.slice(flag.length + 1) : index >= 0 ? process.argv[index + 1] : null;
}

if (isMain) {
  const rawPort = argValue('--port');
  const port = parseInteger(rawPort, { fallback: DEFAULT_PORT, min: 1, max: 65535, error: 'invalid_port' });
  const server = await listenDieWeb({ port });
  console.log(`Demigod DIE app: http://${HOST}:${server.address().port}/roles`);
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
