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
  issueSession,
  loadAccounts,
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
const ALLOW_TRYCLOUDFLARE = process.env.DEMIGOD_DIE_ALLOW_TRYCLOUDFLARE === '1';
const GATE_COOKIE = 'die_gate';
const GATE_MS = 12 * 60 * 60 * 1000;
const PUBLIC_URL_FILE = path.join(process.env.HOME || '', '.config/demigod/die-public-url');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function validDnsHost(value) {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
}

if (PUBLIC_HOST && !validDnsHost(PUBLIC_HOST)) throw new Error('invalid_hosted_configuration');
if (TRUST_ACCESS_PROXY && !PUBLIC_HOST) throw new Error('invalid_hosted_configuration');
if (PUBLIC_HOST && !TRUST_ACCESS_PROXY && !GATE_SECRET) throw new Error('invalid_hosted_configuration');
if (ALLOW_TRYCLOUDFLARE && !GATE_SECRET) throw new Error('invalid_hosted_configuration');
if (GATE_SECRET && GATE_SECRET.length < 16) throw new Error('invalid_hosted_configuration');

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
export function identify(header) {
  const raw = cookieMap(header)[GATE_COOKIE];
  if (!raw) return { authenticated: false, email: null, role: null };
  if (raw.split('.').length === 3) {
    const seen = verifySession(raw, GATE_SECRET, loadAccounts());
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
    const who = identify(req.headers.cookie);
    const authenticated = who.authenticated;
    return { mode: 'gated_public', authenticated, hosted: true, needsLogin: !authenticated, email: who.email, role: who.role };
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

function canMutate(context) {
  if (context.mode === 'local_read_only') return true;
  if (context.authenticated !== true) return false;
  return context.role ? roleCan(context.role, 'write') : true;
}

function hydrateMission(roleId) {
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
    mission = openRoleMission({ packet, owner: 'operator' });
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
  const opened = hydrateMission(roleId);
  if (!opened.mission) throw Object.assign(new Error(opened.reason || 'mission_unavailable'), { status: 400 });
  let mission = opened.mission;
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
    if (!['GET', 'HEAD'].includes(method) && !(method === 'POST' && (missionAct || gatePost))) {
      sendJson(res, 405, { ok: false, error: 'method_not_allowed' }, false, { Allow: 'GET, HEAD, POST' });
      return;
    }
    const noindex = context.hosted ? { 'X-Robots-Tag': 'noindex, nofollow' } : {};
    try {
      if (url.pathname === '/healthz') {
        sendJson(res, 200, { ok: true, service: 'demigod-die-web', release: RELEASE_ID }, head);
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
            const auth = authenticateAccount(accounts, email, password);
            if (!auth.ok) {
              noteLoginFail(ip);
              sendLoginUi(res, { error: 'login_invalid', next: nextPath });
              return;
            }
            cookieValue = issueSession(auth.user, GATE_SECRET);
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
      } else if (uiRoute(url.pathname)) {
        sendUi(res, head, noindex);
      } else {
        sendJson(res, 404, { ok: false, error: 'not_found' }, head);
      }
    } catch (error) {
      const known = /^(advance_|mission_|application_|slot_|offer_|conversation_|packet_|scorecard_|debrief_|outcome_|cand_|owner_|pair_)|_id$|_contact_shaped$/.test(String(error.message || ''));
      const status = Number.isInteger(error?.status) ? error.status : known ? 400 : 500;
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
