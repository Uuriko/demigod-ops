#!/usr/bin/env node
/**
 * demigod-free-ops — no-account free utilities for Demigod
 *
 *   node demigod-free-ops.mjs email <addr>          syntax + MX
 *   node demigod-free-ops.mjs email-hygiene          Events outreach queue MX pass
 *   node demigod-free-ops.mjs uptime                 live + foot ver + local dash
 *   node demigod-free-ops.mjs yc-oss [--sf] [--limit=N]
 *   node demigod-free-ops.mjs selftest
 *   node demigod-free-ops.mjs all                    email-hygiene + uptime + yc-oss cache
 *
 * No Apollo/Hunter/Resend keys. Pure DNS + HTTPS. No auto-send.
 */
import fs from 'fs';
import path from 'path';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const DASH = process.env.DEMIGOD_DASH_URL || 'http://127.0.0.1:9878';
const EVENTS_STORE = path.join(ROOT, 'DEMIGOD-EVENTS.json');
const YC_URL =
  process.env.DEMIGOD_YC_OSS_URL ||
  'https://yc-oss.github.io/api/companies/all.json';
const YC_DIR = path.join(BUSY, 'yc-oss');
const UPTIME_OUT = path.join(BUSY, 'uptime-latest.json');
const EMAIL_CACHE = path.join(BUSY, 'email-mx-cache.json');

const SYNTAX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BAD_DOMAIN =
  /\.(test|invalid|localhost|example|local)$|^(example\.(com|org|net)|test\.(com|org|net)|localhost|email\.com|domain\.com|nowhere\.com|noemail\.com|null\.com|void\.com|fake\.com|spam\.com|asdf\.com|xxx\.com|sample\.com|invent\.com|placeholder\.com|testmail\.com|mailtest\.com)$|^(?:.*\.)?(mailinator\.com|yopmail\.com|guerrillamail\.com|guerrillamailblock\.com|tempmail\.com|temp-mail\.org|throwaway\.email|10minutemail\.com|trashmail\.com|sharklasers\.com|grr\.la|spam4\.me|discard\.email|getnada\.com|maildrop\.cc|mailnesia\.com)$/i;
// residual-5: invent form fillers + system boxes (align events-bot isRealOutreachEmail)
const BAD_LOCAL =
  /^(fake|placeholder|invented|invalid|unknown|dummy|asdf|xxx|qwerty|sample|noone|nobody|none|anybody|user|username|email|youremail|name|firstname|lastname|test|testing|demo|null|na|n\/a|tbd|todo|fixme|changeme|change\.?me|editme|edit\.?me|fillme|fill\.?me|insert|me|myself|private|redacted|censored|hidden|void|empty|blank|spam|trash|junk|foo|bar|baz|yourname|someone|somebody|anyone|everybody|everyone|noreply|no-reply|donotreply|do-not-reply|no[-_]?reply|do[-_]?not[-_]?reply|mailer-daemon|postmaster|bounce|bounces|return|subscribe|notifications?|alerts?|unsubscribe|abuse|root|devnull|automated|robot|bot|auto|system|daemon|admin)(?:[._-].*)?$/i;

// ── email ──────────────────────────────────────────────────────────

/** Syntax + invent filters (sync). Aligns with events-bot isRealOutreachEmail. */
export function checkEmailSyntax(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  if (!SYNTAX_RE.test(e)) {
    return { ok: false, email: e, reason: 'syntax' };
  }
  const domain = e.split('@')[1] || '';
  const local = (e.split('@')[0] || '').split('+')[0];
  if (!domain || domain.split('.').length < 2) {
    return { ok: false, email: e, reason: 'domain' };
  }
  if (BAD_DOMAIN.test(domain)) {
    return { ok: false, email: e, reason: 'reserved_domain' };
  }
  if (BAD_LOCAL.test(local)) {
    return { ok: false, email: e, reason: 'dummy_local' };
  }
  // Invent pattern: hello@hello.com / info@info.com (align events-bot)
  const domainHead = domain.split('.')[0] || '';
  if (domainHead && local === domainHead) {
    return { ok: false, email: e, reason: 'dummy_local' };
  }
  // Platform mailboxes — same gate as events-bot isRealOutreachEmail (residual-5 ATS/social)
  if (
    /(?:^|\.)(linkedin\.com|indeed\.com|wellfound\.com|ycombinator\.com|workatastartup\.com|ziprecruiter\.com|facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|partiful\.com|lu\.ma|luma\.com|eventbrite\.com|meetup\.com|splashthat\.com|glassdoor\.com|crunchbase\.com|angellist\.com|angel\.co|greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|jobvite\.com|smartrecruiters\.com)$/i.test(
      domain,
    )
  ) {
    return { ok: false, email: e, reason: 'platform_mailbox' };
  }
  return { ok: true, email: e, domain, local };
}

function loadMxCache() {
  try {
    return JSON.parse(fs.readFileSync(EMAIL_CACHE, 'utf8'));
  } catch {
    return { v: 1, domains: {} };
  }
}

function saveMxCache(cache) {
  try {
    fs.mkdirSync(path.dirname(EMAIL_CACHE), { recursive: true });
    fs.writeFileSync(EMAIL_CACHE, JSON.stringify(cache, null, 2));
  } catch {
    /* best-effort */
  }
}

export const isAuthoritativeNoMx = (reason) =>
  ['ENODATA', 'ENOTFOUND'].includes(String(reason || '').toUpperCase());

/**
 * MX lookup (async). Caches domain results 24h under /tmp/dg-busy.
 * @returns {{ ok, email, domain, mx?, reason?, cached? }}
 */
export async function checkEmailMx(email, opts = {}) {
  const syn = checkEmailSyntax(email);
  if (!syn.ok) return { ...syn, mx: false };
  const domain = syn.domain;
  const ttlMs = Number(opts.ttlMs) || 24 * 60 * 60 * 1000;
  const cache = loadMxCache();
  const hit = cache.domains[domain];
  if (hit && Date.now() - (hit.at || 0) < ttlMs && !opts.force) {
    return {
      ok: !!hit.ok,
      email: syn.email,
      domain,
      mx: hit.mx || [],
      reason: hit.ok ? null : hit.reason || 'no_mx',
      retryable: !hit.ok && !isAuthoritativeNoMx(hit.reason),
      cached: true,
    };
  }
  try {
    const records = await dns.resolveMx(domain);
    const mx = (records || [])
      .map((r) => ({ exchange: r.exchange, priority: r.priority }))
      .sort((a, b) => a.priority - b.priority);
    const ok = mx.length > 0;
    cache.domains[domain] = {
      ok,
      mx: mx.slice(0, 5),
      reason: ok ? null : 'no_mx',
      at: Date.now(),
    };
    saveMxCache(cache);
    return { ok, email: syn.email, domain, mx: mx.slice(0, 5), reason: ok ? null : 'no_mx' };
  } catch (err) {
    const code = err?.code || err?.message || 'dns_error';
    const retryable = !isAuthoritativeNoMx(code);
    const ok = false;
    if (!retryable) {
      cache.domains[domain] = { ok, mx: [], reason: String(code), at: Date.now() };
      saveMxCache(cache);
    }
    return {
      ok,
      email: syn.email,
      domain,
      mx: [],
      reason: String(code),
      retryable,
    };
  }
}

/** Full check: syntax then MX. */
export async function checkEmail(email, opts = {}) {
  const syn = checkEmailSyntax(email);
  if (!syn.ok) return { ...syn, mx: false };
  if (opts.mx === false) return { ...syn, mx: null, skipped: true };
  const mx = await checkEmailMx(syn.email, opts);
  return {
    ok: syn.ok && mx.ok,
    email: syn.email,
    domain: syn.domain,
    syntax: true,
    mx: mx.ok,
    mxRecords: mx.mx,
    reason: mx.ok ? null : mx.reason,
    cached: mx.cached,
    retryable: mx.retryable,
  };
}

/**
 * Hygiene Events outreach queue: reject syntax/invent (already) + no-MX.
 * Mutates store file when save=true.
 */
export async function hygieneEventsOutreachMx(opts = {}) {
  const storePath = opts.storePath || EVENTS_STORE;
  if (!fs.existsSync(storePath)) {
    return { ok: false, error: 'no_events_store', path: storePath };
  }
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const list = store.outreach || [];
  let rejected = 0;
  let okCount = 0;
  let skipped = 0;
  const details = [];
  for (const o of list) {
    if (!o || (o.status !== 'queued' && o.status !== 'drafted')) {
      skipped++;
      continue;
    }
    const res = await checkEmail(o.toEmail, { force: !!opts.force });
    o.emailCheck = {
      syntax: !!res.syntax || !!res.ok,
      mx: res.mx === true,
      reason: res.reason || null,
      at: new Date().toISOString(),
    };
    if (!res.ok && !res.retryable) {
      o.status = 'rejected';
      o.rejectReason = res.reason === 'syntax' || res.reason === 'reserved_domain' || res.reason === 'dummy_local'
        ? 'invent_or_invalid_email'
        : 'no_mx:' + (res.reason || 'fail');
      o.sentAt = null;
      rejected++;
      details.push({ id: o.id, toEmail: o.toEmail, reject: o.rejectReason });
    } else {
      okCount++;
    }
  }
  if (opts.save !== false) {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  }
  return {
    ok: true,
    rejected,
    okCount,
    skipped,
    total: list.length,
    details: details.slice(0, 20),
    path: storePath,
  };
}

// ── uptime ─────────────────────────────────────────────────────────

async function fetchText(url, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { 'user-agent': 'demigod-free-ops/1 uptime' },
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url: res.url || url };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: String(err?.message || err), url };
  } finally {
    clearTimeout(t);
  }
}

function parseFootVer(html) {
  if (!html) return null;
  const m =
    html.match(/__dgFootVer=['"](\d+)['"]/) ||
    html.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) ||
    html.match(/Demigod v(\d+)/) ||
    html.match(/foot[\/-]v(\d+)/i) ||
    html.match(/demigod-foot-v(\d+)/i);
  return m ? m[1] : null;
}

function diskFootVer() {
  try {
    const js = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    const m = js.match(/__dgFootVer=['"](\d+)['"]/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Probe Events Bot public tunnel (FOCUS health). Optional auto-heal. */
export async function smokeEventsApi(opts = {}) {
  const events = {
    local: false,
    public: false,
    needHeal: false,
    healed: false,
    tunnelUrl: null,
    error: null,
  };
  try {
    const { spawnSync } = await import('child_process');
    const st = spawnSync(process.execPath, [path.join(ROOT, 'demigod-events-online.mjs'), 'status'], {
      encoding: 'utf8',
      timeout: 20000,
    });
    let j = {};
    try {
      j = JSON.parse((st.stdout || '').trim() || '{}');
    } catch {
      /* */
    }
    events.local = !!j.local;
    events.public = !!j.public;
    events.needHeal = !!j.needHeal || (j.local && !j.public);
    events.tunnelUrl = j.tunnelUrl || null;
    if (events.needHeal && opts.heal !== false) {
      const h = spawnSync(process.execPath, [path.join(ROOT, 'demigod-events-online.mjs'), 'heal'], {
        encoding: 'utf8',
        timeout: 120000,
      });
      try {
        const hj = JSON.parse((h.stdout || '').trim() || '{}');
        events.healed = !!hj.healed || !!hj.public;
        events.public = !!hj.public;
        events.tunnelUrl = hj.tunnelUrl || events.tunnelUrl;
        events.via = hj.via || null;
      } catch {
        events.error = (h.stderr || h.stdout || 'heal failed').slice(0, 200);
      }
    }
  } catch (e) {
    events.error = String(e?.message || e);
  }
  return events;
}

/** Live site + foot version + optional local dash + events public. */
export async function smokeUptime(opts = {}) {
  const liveUrl = opts.live || LIVE;
  const dashUrl = opts.dash || DASH;
  const disk = diskFootVer();
  const live = await fetchText(liveUrl);
  let footSrc = null;
  let liveVer = parseFootVer(live.text);
  // Follow script src if version not inline
  if (!liveVer && live.text) {
    const sm =
      live.text.match(
        /src=["'](https?:\/\/[^"']*demigod-foot[^"']+\.js[^"']*)["']/i,
      ) ||
      live.text.match(/src=["'](https?:\/\/cdn\.jsdelivr\.net\/[^"']+foot[^"']+)["']/i);
    if (sm) {
      footSrc = sm[1];
      const js = await fetchText(footSrc);
      if (js.ok) liveVer = parseFootVer(js.text);
    }
  }
  const dash = await fetchText(dashUrl, 4000);
  const versionMatch = disk && liveVer ? disk === liveVer : null;
  const events = await smokeEventsApi({ heal: opts.healEvents !== false });
  const result = {
    at: new Date().toISOString(),
    pass: !!(live.ok && live.status >= 200 && live.status < 400),
    live: {
      url: liveUrl,
      ok: live.ok,
      status: live.status,
      error: live.error || null,
      footVer: liveVer,
      footSrc,
    },
    disk: { footVer: disk },
    versionMatch,
    dash: {
      url: dashUrl,
      ok: dash.ok,
      status: dash.status,
      error: dash.error || null,
      optional: true,
    },
    events,
  };
  result.pass = result.live.ok;
  // soft warn only if dash down
  result.warn = [];
  if (!result.dash.ok) result.warn.push('dash_down');
  if (versionMatch === false) result.warn.push('foot_version_drift');
  if (!events.public) result.warn.push('events_public_down');
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(UPTIME_OUT, JSON.stringify(result, null, 2));
  } catch {
    /* ignore */
  }
  return result;
}

// ── yc-oss ─────────────────────────────────────────────────────────

// Bay Area locations only (not all of CA)
const SF_LOC_RE =
  /\b(san\s*francisco|oakland|berkeley|palo\s*alto|mountain\s*view|san\s*mateo|redwood\s*city|menlo\s*park|sunnyvale|cupertino|santa\s*clara|san\s*jose|daly\s*city|south\s*san\s*francisco|emeryville|alameda|fremont|hayward|burlingame|san\s*carlos|foster\s*city|milpitas|los\s*altos|los\s*gatos|campbell|saratoga|belmont|san\s*bruno|south\s*bay|east\s*bay|peninsula|silicon\s*valley|bay\s*area)\b/i;

function isSfIsh(c) {
  const loc = String(c.all_locations || c.location || c.city || '');
  return !!(loc && SF_LOC_RE.test(loc));
}

/**
 * Fetch YC-oss company dump, cache, optional SF filter.
 */
export async function ycOssCompanies(opts = {}) {
  fs.mkdirSync(YC_DIR, { recursive: true });
  const cachePath = path.join(YC_DIR, 'all.json');
  const metaPath = path.join(YC_DIR, 'meta.json');
  const maxAge = Number(opts.maxAgeMs) || 7 * 24 * 60 * 60 * 1000;
  let list = null;
  let fromCache = false;
  try {
    const st = fs.statSync(cachePath);
    if (Date.now() - st.mtimeMs < maxAge && !opts.force) {
      list = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      fromCache = true;
    }
  } catch {
    /* fetch */
  }
  if (!list) {
    const res = await fetchText(YC_URL, 60000);
    if (!res.ok) {
      return { ok: false, error: res.error || 'fetch_failed', status: res.status };
    }
    try {
      list = JSON.parse(res.text);
    } catch (e) {
      return { ok: false, error: 'json_parse', detail: String(e.message || e) };
    }
    if (!Array.isArray(list)) {
      // some dumps wrap
      list = list.companies || list.data || [];
    }
    fs.writeFileSync(cachePath, JSON.stringify(list));
    fs.writeFileSync(
      metaPath,
      JSON.stringify({ at: new Date().toISOString(), url: YC_URL, count: list.length }, null, 2),
    );
  }
  const sfOnly = opts.sf !== false; // default Bay Area filter for Demigod
  let out = Array.isArray(list) ? list : [];
  if (sfOnly) out = out.filter(isSfIsh);
  // Exact Active only — /active/i falsely matches "Inactive".
  if (opts.active) out = out.filter((c) => String(c.status || '').trim().toLowerCase() === 'active');
  if (opts.hiring) out = out.filter((c) => !!c.isHiring);
  const limit = Math.min(5000, Math.max(1, Number(opts.limit) || 50));
  const slim = out.slice(0, limit).map((c) => ({
    name: c.name || c.company_name || null,
    batch: c.batch || null,
    location: c.all_locations || c.location || c.city || null,
    one_liner: c.one_liner || c.long_description || null,
    website: c.website || null,
    yc_url: c.url || null,
    status: c.status || null,
    team_size: c.team_size || null,
    isHiring: !!c.isHiring,
    industry: c.industry || null,
  }));
  const filteredPath = path.join(YC_DIR, sfOnly ? 'sf-sample.json' : 'sample.json');
  fs.writeFileSync(
    filteredPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        fromCache,
        sfOnly,
        totalSource: Array.isArray(list) ? list.length : 0,
        matched: out.length,
        sample: slim,
      },
      null,
      2,
    ),
  );
  return {
    ok: true,
    fromCache,
    sfOnly,
    totalSource: Array.isArray(list) ? list.length : 0,
    matched: out.length,
    sample: slim,
    paths: { cache: cachePath, sample: filteredPath, meta: metaPath },
  };
}

// ── selftest + CLI ─────────────────────────────────────────────────

export async function selftest() {
  const fails = [];
  const ok = (cond, msg) => {
    if (!cond) fails.push(msg);
  };
  ok(checkEmailSyntax('').ok === false, 'empty email');
  ok(checkEmailSyntax('venue@example.com').ok === false, 'example.com reserved');
  ok(checkEmailSyntax('fake@gmail.com').ok === false, 'dummy local');
  ok(checkEmailSyntax('potter@trydemigod.com').ok === true, 'real syntax');
  const mxGood = await checkEmailMx('potter@trydemigod.com', { force: true });
  ok(mxGood.ok === true, 'trydemigod MX exists');
  const mxBad = await checkEmailMx('a@invalid.invalid', { force: true });
  ok(mxBad.ok === false, 'invalid.invalid no MX');
  // uptime: network may fail in sandbox — soft
  const up = await smokeUptime();
  ok(typeof up.pass === 'boolean', 'uptime shape');
  ok(up.disk.footVer, 'disk foot ver readable');
  return { ok: fails.length === 0, fails, uptimePass: up.pass, liveVer: up.live?.footVer };
}

function usage() {
  console.log(`demigod-free-ops — free no-account utilities

  email <addr>              syntax + MX check
  email-hygiene [--force]   Events outreach queue MX reject
  uptime                    live + foot version + dash
  yc-oss [--all] [--active] [--hiring] [--limit=N] [--force]
  selftest
  all                       hygiene + uptime + yc-oss (Bay sample)
`);
}

async function main(argv) {
  const args = argv.slice(2);
  const cmd = args[0] || 'help';
  const flag = (name) => args.includes(name);
  const num = (name, d) => {
    const a = args.find((x) => x.startsWith(name + '='));
    return a ? Number(a.split('=')[1]) : d;
  };

  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    usage();
    return 0;
  }
  if (cmd === 'email') {
    const addr = args[1];
    if (!addr) {
      console.error('usage: email <addr>');
      return 1;
    }
    const r = await checkEmail(addr, { force: flag('--force') });
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 2;
  }
  if (cmd === 'email-hygiene') {
    const r = await hygieneEventsOutreachMx({ force: flag('--force') });
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  }
  if (cmd === 'uptime') {
    const r = await smokeUptime();
    console.log(JSON.stringify(r, null, 2));
    return r.pass ? 0 : 2;
  }
  if (cmd === 'yc-oss') {
    const r = await ycOssCompanies({
      sf: !flag('--all'),
      limit: num('--limit', 50),
      force: flag('--force'),
      active: flag('--active'),
      hiring: flag('--hiring'),
    });
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  }
  if (cmd === 'selftest') {
    const r = await selftest();
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  }
  if (cmd === 'all') {
    const hygiene = await hygieneEventsOutreachMx({});
    const uptime = await smokeUptime();
    const yc = await ycOssCompanies({ sf: true, limit: 40 });
    const out = { hygiene, uptime, yc };
    console.log(JSON.stringify(out, null, 2));
    const pass = hygiene.ok && uptime.pass && yc.ok;
    return pass ? 0 : 2;
  }
  usage();
  return 1;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv)
    .then((code) => process.exit(code ?? 0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
