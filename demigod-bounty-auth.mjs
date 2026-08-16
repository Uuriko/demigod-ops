#!/usr/bin/env node
/**
 * Demigod bounty identity — GitHub required (real OAuth). X optional.
 *
 *   GET  /api/events-bot/oauth/github/status
 *   GET  /api/events-bot/oauth/github/start
 *   POST /api/events-bot/oauth/github/exchange  { code, state }
 *   GET  /api/events-bot/oauth/github/me        Authorization: Bearer <jwt>
 *   GET  /api/events-bot/oauth/x/status
 *   GET  /api/events-bot/oauth/x/start
 *   POST /api/events-bot/oauth/x/exchange       { code, state, verifier }
 *
 * Secrets (never commit): env or ~/.config/demigod/bounty-oauth.json (0600)
 *   GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET / DEMIGOD_BOUNTY_SESSION_SECRET
 *   X_CLIENT_ID / X_CLIENT_SECRET  (optional)
 *
 * GitHub OAuth App callback must be exactly: https://www.trydemigod.com/?p=bounties
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const GH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GH_TOKEN = 'https://github.com/login/oauth/access_token';
const GH_USER = 'https://api.github.com/user';
const X_AUTHORIZE = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN = 'https://api.twitter.com/2/oauth2/token';
const X_ME = 'https://api.twitter.com/2/users/me';
export const BOUNTY_REDIRECT = 'https://www.trydemigod.com/?p=bounties';
const CFG_PATH = process.env.DEMIGOD_BOUNTY_OAUTH_FILE
  || path.join(os.homedir(), '.config', 'demigod', 'bounty-oauth.json');
const SESSION_TTL_S = 30 * 24 * 3600;
const STATE_TTL_MS = 15 * 60 * 1000;

const states = new Map();

function readCfg() {
  let file = {};
  try {
    file = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
    if (!file || typeof file !== 'object') file = {};
  } catch {
    file = {};
  }
  return {
    githubClientId: String(process.env.GITHUB_OAUTH_CLIENT_ID || file.githubClientId || '').trim(),
    githubClientSecret: String(process.env.GITHUB_OAUTH_CLIENT_SECRET || file.githubClientSecret || '').trim(),
    sessionSecret: String(process.env.DEMIGOD_BOUNTY_SESSION_SECRET || file.sessionSecret || '').trim(),
    xClientId: String(process.env.X_CLIENT_ID || file.xClientId || '').trim(),
    xClientSecret: String(process.env.X_CLIENT_SECRET || file.xClientSecret || '').trim(),
  };
}

function ensureSessionSecret(cfg) {
  if (cfg.sessionSecret && cfg.sessionSecret.length >= 24) return cfg.sessionSecret;
  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true, mode: 0o700 });
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')) || {}; } catch { prev = {}; }
    prev.sessionSecret = prev.sessionSecret || secret;
    fs.writeFileSync(CFG_PATH, JSON.stringify(prev, null, 2) + '\n', { mode: 0o600 });
    return String(prev.sessionSecret);
  } catch {
    return secret;
  }
}

export function githubConfigured(cfg = readCfg()) {
  return Boolean(cfg.githubClientId && cfg.githubClientSecret);
}
export function xConfigured(cfg = readCfg()) {
  return Boolean(cfg.xClientId && cfg.xClientSecret);
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function signJwt(payload, secret) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secret).update(h + '.' + p).digest());
  return h + '.' + p + '.' + sig;
}
export function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const want = b64url(crypto.createHmac('sha256', secret).update(h + '.' + p).digest());
  const a = Buffer.from(s);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!body || (body.exp && body.exp < Math.floor(Date.now() / 1000))) return null;
    return body;
  } catch {
    return null;
  }
}

function putState(kind, extra = {}) {
  const state = b64url(crypto.randomBytes(24));
  const verifier = extra.verifier || '';
  states.set(state, { kind, at: Date.now(), verifier });
  if (states.size > 500) {
    const now = Date.now();
    for (const [k, v] of states) if (now - v.at > STATE_TTL_MS) states.delete(k);
  }
  return state;
}
function takeState(state, kind) {
  const rec = states.get(state);
  states.delete(state);
  if (!rec || rec.kind !== kind || Date.now() - rec.at > STATE_TTL_MS) return null;
  return rec;
}

function bearer(req) {
  const h = String(req.headers.authorization || req.headers.Authorization || '');
  const m = h.match(/^Bearer\s+(\S+)/i);
  return m ? m[1] : '';
}

export function bountyPayHref(it) {
  const to = String(it?.payTo || '').trim();
  const amt = it?.amount;
  const sol = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const base = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  if (!to || amt == null || amt === '') return '';
  if (String(it.chain || '').toLowerCase() === 'base' && /^0x[a-fA-F0-9]{40}$/.test(to)) {
    const units = String(Math.round(Number(amt) * 1e6));
    if (!/^\d+$/.test(units)) return '';
    return 'ethereum:' + base + '@8453/transfer?address=' + encodeURIComponent(to) + '&uint256=' + units;
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(to) && !/^0x/i.test(to)) {
    return 'solana:' + to + '?amount=' + encodeURIComponent(String(amt)) + '&spl-token=' + sol;
  }
  return '';
}

async function ghExchange(code, cfg) {
  const body = new URLSearchParams({
    client_id: cfg.githubClientId,
    client_secret: cfg.githubClientSecret,
    code: String(code || ''),
    redirect_uri: BOUNTY_REDIRECT,
  });
  const tokRes = await fetch(GH_TOKEN, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const tok = await tokRes.json();
  if (!tok?.access_token) throw new Error(tok?.error_description || tok?.error || 'github_token');
  const uRes = await fetch(GH_USER, {
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + tok.access_token, 'User-Agent': 'demigod-bounties' },
    signal: AbortSignal.timeout(8000),
  });
  const u = await uRes.json();
  if (!u?.login || !u?.id) throw new Error('github_user');
  return {
    login: String(u.login),
    id: String(u.id),
    avatarUrl: String(u.avatar_url || ''),
    htmlUrl: String(u.html_url || ('https://github.com/' + u.login)),
  };
}

function pkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

async function xExchange(code, verifier, cfg) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: BOUNTY_REDIRECT,
    client_id: cfg.xClientId,
    code_verifier: verifier,
  });
  const basic = Buffer.from(cfg.xClientId + ':' + cfg.xClientSecret).toString('base64');
  const tokRes = await fetch(X_TOKEN, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const tok = await tokRes.json();
  if (!tok?.access_token) throw new Error(tok?.error_description || tok?.error || 'x_token');
  const uRes = await fetch(X_ME + '?user.fields=profile_image_url,username,name', {
    headers: { Authorization: 'Bearer ' + tok.access_token },
    signal: AbortSignal.timeout(8000),
  });
  const u = await uRes.json();
  const d = u?.data;
  if (!d?.username || !d?.id) throw new Error('x_user');
  return {
    handle: String(d.username),
    id: String(d.id),
    avatarUrl: String(d.profile_image_url || ''),
    htmlUrl: 'https://x.com/' + d.username,
  };
}

function jwtFor(kind, ident, secret) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    kind,
    login: ident.login || ident.handle,
    id: ident.id,
    avatarUrl: ident.avatarUrl || '',
    htmlUrl: ident.htmlUrl || '',
    iat: now,
    exp: now + SESSION_TTL_S,
  }, secret);
}

/**
 * @returns {Promise<boolean>} true if this request was an oauth route
 */
export async function handleBountyOauth(req, res, url, { json, rateLimit, rateLimited }) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (!p.startsWith('/api/events-bot/oauth/')) return false;
  const cfg = readCfg();
  const secret = ensureSessionSecret(cfg);

  if (p === '/api/events-bot/oauth/github/status' && req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      configured: githubConfigured(cfg),
      github: githubConfigured(cfg),
      x: xConfigured(cfg),
      redirect: BOUNTY_REDIRECT,
    });
  }

  if (p === '/api/events-bot/oauth/github/start' && req.method === 'GET') {
    if (!rateLimit(req, { max: 20, bucket: 'gh-start' })) return rateLimited(res);
    if (!githubConfigured(cfg)) {
      return json(res, 503, { ok: false, configured: false, github: false, error: 'github_oauth_unconfigured' });
    }
    const state = putState('github');
    const authorizeUrl = GH_AUTHORIZE
      + '?client_id=' + encodeURIComponent(cfg.githubClientId)
      + '&redirect_uri=' + encodeURIComponent(BOUNTY_REDIRECT)
      + '&scope=' + encodeURIComponent('read:user')
      + '&state=' + encodeURIComponent(state);
    return json(res, 200, { ok: true, configured: true, authorizeUrl, state });
  }

  if (p === '/api/events-bot/oauth/github/exchange' && req.method === 'POST') {
    if (!rateLimit(req, { max: 20, bucket: 'gh-ex' })) return rateLimited(res);
    if (!githubConfigured(cfg)) return json(res, 503, { ok: false, configured: false, error: 'github_oauth_unconfigured' });
    let body = {};
    try {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        let n = 0;
        req.on('data', (c) => {
          n += c.length;
          if (n > 8000) reject(new Error('body too large'));
          else chunks.push(c);
        });
        req.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
          catch (e) { reject(e); }
        });
        req.on('error', reject);
      });
    } catch (e) {
      return json(res, 400, { ok: false, error: 'bad_json' });
    }
    if (!takeState(String(body.state || ''), 'github')) {
      return json(res, 400, { ok: false, error: 'invalid_state' });
    }
    try {
      const ident = await ghExchange(body.code, cfg);
      const token = jwtFor('github', ident, secret);
      return json(res, 200, {
        ok: true,
        token,
        login: ident.login,
        avatarUrl: ident.avatarUrl,
        htmlUrl: ident.htmlUrl,
      });
    } catch (e) {
      return json(res, 400, { ok: false, error: 'github_exchange', message: String(e.message || e).slice(0, 120) });
    }
  }

  if (p === '/api/events-bot/oauth/github/me' && req.method === 'GET') {
    const body = verifyJwt(bearer(req), secret);
    if (!body || body.kind !== 'github' || !body.login) {
      return json(res, 401, { ok: false, github: false });
    }
    return json(res, 200, {
      ok: true,
      github: true,
      login: body.login,
      avatarUrl: body.avatarUrl || '',
      htmlUrl: body.htmlUrl || ('https://github.com/' + body.login),
    });
  }

  if (p === '/api/events-bot/oauth/x/status' && req.method === 'GET') {
    return json(res, 200, { ok: true, x: xConfigured(cfg) });
  }

  if (p === '/api/events-bot/oauth/x/start' && req.method === 'GET') {
    if (!rateLimit(req, { max: 20, bucket: 'x-start' })) return rateLimited(res);
    if (!xConfigured(cfg)) {
      return json(res, 503, { ok: false, configured: false, x: false, error: 'x_oauth_unconfigured' });
    }
    const { verifier, challenge } = pkce();
    const state = putState('x', { verifier });
    const authorizeUrl = X_AUTHORIZE
      + '?response_type=code'
      + '&client_id=' + encodeURIComponent(cfg.xClientId)
      + '&redirect_uri=' + encodeURIComponent(BOUNTY_REDIRECT)
      + '&scope=' + encodeURIComponent('users.read tweet.read offline.access')
      + '&state=' + encodeURIComponent(state)
      + '&code_challenge=' + encodeURIComponent(challenge)
      + '&code_challenge_method=S256';
    return json(res, 200, { ok: true, configured: true, authorizeUrl, state, verifier });
  }

  if (p === '/api/events-bot/oauth/x/exchange' && req.method === 'POST') {
    if (!rateLimit(req, { max: 20, bucket: 'x-ex' })) return rateLimited(res);
    if (!xConfigured(cfg)) return json(res, 503, { ok: false, configured: false, error: 'x_oauth_unconfigured' });
    let body = {};
    try {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        let n = 0;
        req.on('data', (c) => {
          n += c.length;
          if (n > 8000) reject(new Error('body too large'));
          else chunks.push(c);
        });
        req.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
          catch (e) { reject(e); }
        });
        req.on('error', reject);
      });
    } catch {
      return json(res, 400, { ok: false, error: 'bad_json' });
    }
    const st = takeState(String(body.state || ''), 'x');
    if (!st) return json(res, 400, { ok: false, error: 'invalid_state' });
    try {
      const ident = await xExchange(body.code, st.verifier || body.verifier, cfg);
      const token = jwtFor('x', ident, secret);
      return json(res, 200, {
        ok: true,
        token,
        handle: ident.handle,
        avatarUrl: ident.avatarUrl,
        htmlUrl: ident.htmlUrl,
      });
    } catch (e) {
      return json(res, 400, { ok: false, error: 'x_exchange', message: String(e.message || e).slice(0, 120) });
    }
  }

  return json(res, 404, { ok: false, error: 'not_found' });
}

export default { handleBountyOauth, githubConfigured, xConfigured, bountyPayHref, verifyJwt, BOUNTY_REDIRECT };
