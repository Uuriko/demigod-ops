#!/usr/bin/env node
/**
 * Shared hunt-test-fix loop for trydemigod.com and getdasha.com.
 * FIND → TEST → report. Does not mutate live sites.
 * Profiles stay separate. Do not import elizaOS.
 *
 * v3: SPA dedup, skip copy-scrub JS honesty hits, prefer raw GitHub +
 * foot-latest.js <script src> pin SHA only (not preload/head/other loaders),
 * copy-budget on bounty mount (not chrome),
 * palette stays P3, summary {p0,p1,p2,p3,unique} at top of JSON.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HONESTY_BAD = [
  /\bescrow(?:ed)?\b/i,
  /\b90[-\s]?day (?:replacement )?guarantee\b/i,
  /\bpre[-\s]?vetted\b/i,
  /\belite (?:AI )?engineers\b/i,
  /\bHermes\b/,
  /\bunlimited (?:intros|hires|matches)\b/i,
  /\bguaranteed (?:hire|match|placement)\b/i,
  /\bwe hold (?:your )?funds\b/i,
  /\b#1 (?:talent|hiring)\b/i,
];

const BOUNTY_COPY_FAT = [
  /declared bounties, not escrow/i,
  /eligibility caveats/i,
  /first-timers welcome/i,
  /this board does not hold or send funds/i,
  /owner-declared example/i,
];

const SITES = {
  demigod: {
    origin: 'https://www.trydemigod.com',
    pages: [
      '/', '/how', '/how-it-works', '/pricing', '/hire', '/talent', '/faq', '/about',
      '/contact', '/legal', '/privacy', '/terms', '/cookies', '/bounties', '/tryouts',
      '/sample', '/blog', '/startups', '/jobs', '/apply', '/?p=bounties', '/?wiz=startup',
      '/?wiz=engineer',
    ],
    feeds: [
      'https://raw.githubusercontent.com/Uuriko/demigod-site-cdn/main/bounties-feed.json',
    ],
    mustContain: ['potter@trydemigod.com'],
    mustNotContain: ['hello@trydemigod.com'],
    mixForbidden: ['$dasha', '53uxQtB9', 'simp board', '#dfff00', 'getdasha.com/studio'],
    palette: ['#03140D', '#A6FFCB', '#10C674'],
    bountyPages: ['/?p=bounties', '/bounties'],
    bountyMounts: ['dg-bounty-live', 'dg-bounty-board', 'dg-bounties'],
    oauth: [],
    cdnRepo: 'Uuriko/demigod-site-cdn',
    feedName: 'bounties-feed.json',
  },
  dasha: {
    origin: 'https://www.getdasha.com',
    pages: ['/', '/dasha', '/studio', '/bounties', '/bounties/', '/bounties.json'],
    extra: [
      'https://uuriko.github.io/dasha-desk/',
      'https://uuriko.github.io/dasha-desk/bounties/',
      'https://uuriko.github.io/dasha-desk/bounties/feed.json',
      'https://uuriko.github.io/dasha-desk/bounties.json',
    ],
    feeds: [
      'https://uuriko.github.io/dasha-desk/bounties.json',
      'https://uuriko.github.io/dasha-desk/bounties/feed.json',
    ],
    mustContain: [],
    mustNotContain: [],
    mixForbidden: ['10% when you hire', 'potter@trydemigod.com', 'sf startup talent', '#A6FFCB'],
    palette: ['#070608', '#dfff00', '#ff3b81'],
    bountyPages: ['/bounties', '/bounties/'],
    extraBounty: ['https://uuriko.github.io/dasha-desk/bounties/'],
    bountyMounts: ['bb-app', 'dg-bounty-live', 'items'],
    oauth: [
      { url: 'https://lobby.getdasha.com/oauth/x/start', name: 'X' },
      { url: 'https://lobby.getdasha.com/oauth/github/start', name: 'GitHub' },
    ],
  },
};

function abs(origin, href) {
  try { return new URL(href, origin).href; } catch { return null; }
}

async function fetchOne(url, { method = 'GET', timeout = 12000 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      signal: ac.signal,
      headers: { 'User-Agent': 'DemigodDashaHunt/3.0', Accept: 'text/html,application/json,*/*' },
    });
    const loc = res.headers.get('location');
    const cors = res.headers.get('access-control-allow-origin');
    const ctype = res.headers.get('content-type') || '';
    let body = '';
    if (method !== 'HEAD') {
      if (/json|html|text|javascript|xml/i.test(ctype) || res.status >= 400 || !ctype) {
        try {
          body = await res.text();
          if (body.length > 400000) body = body.slice(0, 400000);
        } catch {}
      }
    }
    return {
      url, ok: res.ok, status: res.status, loc, cors, ctype,
      body, bytes: body.length,
      server: res.headers.get('server') || '',
      wf: res.headers.get('x-wf-region') || '',
    };
  } catch (e) {
    return { url, ok: false, status: 0, error: String(e.message || e), body: '', cors: null, ctype: '', loc: null };
  } finally {
    clearTimeout(t);
  }
}

function extractLinks(html, base) {
  const out = new Set();
  const re = /(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const h = m[1];
    if (!h || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript:') || h.startsWith('#')) continue;
    const u = abs(base, h);
    if (u) out.add(u);
  }
  return [...out];
}

/** Strip copy-scrub / boot JS. Keep JSON-LD so crawler-visible claims still count. */
function withoutScrubberSource(html) {
  return String(html || '')
    .replace(/<script(?![^>]*type=["']application\/ld\+json)[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
}

function stripChrome(html) {
  return String(html || '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
}

function innerById(html, id) {
  const re = new RegExp(`<(?<tag>[a-zA-Z][\\w-]*)[^>]*\\sid=["']${id}["'][^>]*>([\\s\\S]*)$`, 'i');
  const m = re.exec(html);
  if (!m) return null;
  const tag = m.groups.tag;
  const rest = m[2];
  let depth = 1;
  const open = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const close = new RegExp(`</${tag}>`, 'gi');
  let i = 0;
  while (i < rest.length && depth > 0) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(rest);
    const c = close.exec(rest);
    if (c && (!o || c.index < o.index)) {
      depth--;
      if (depth === 0) return rest.slice(0, c.index);
      i = c.index + c[0].length;
    } else if (o) {
      depth++;
      i = o.index + o[0].length;
    } else break;
  }
  return rest.slice(0, 80000);
}

function bountyMountHtml(html, mounts = []) {
  for (const id of mounts) {
    const inner = innerById(html, id);
    if (inner != null) return inner;
  }
  const iframe = /<iframe[^>]*class=["'][^"']*bount[^"']*["'][^>]*src=["']([^"']+)["']/i.exec(html)
    || /<iframe[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*bount[^"']*["']/i.exec(html);
  if (iframe) return { iframeSrc: iframe[1] };
  return null;
}

function visibleWords(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

function honestyHits(text) {
  return HONESTY_BAD.filter((re) => re.test(text)).map((re) => re.source);
}

function looksLikeReplacementArray(html, source) {
  const needle = source.replace(/\\b/g, '').replace(/\[-\\s\]\?/g, '[-\\s]?');
  const re = new RegExp(`\\[\\/[^\\]]*${source.slice(0, 24)}[^\\]]*\\/[a-z]*\\s*,\\s*['"]`, 'i');
  return re.test(html) || new RegExp(`\\[\\/[^\\]]*pre-?vetted[^\\]]*\\/`, 'i').test(html) && /pre-?vetted/i.test(source);
}

function checkFeed(json) {
  const issues = [];
  if (!json || typeof json !== 'object') return ['not an object'];
  if (!Array.isArray(json.listings)) issues.push('missing listings[]');
  else {
    json.listings.forEach((row, i) => {
      if (!row || typeof row !== 'object') { issues.push(`listings[${i}] not object`); return; }
      if (!row.repo && !row.itemUrl) issues.push(`listings[${i}] no repo/itemUrl`);
      if (row.amount == null) issues.push(`listings[${i}] no amount`);
      const cur = String(row.currency || '').toUpperCase();
      if (cur && cur !== 'USDC') issues.push(`listings[${i}] currency ${cur} (want USDC)`);
      if (!cur) issues.push(`listings[${i}] no currency`);
      if (row.outcomes && !Array.isArray(row.outcomes)) issues.push(`listings[${i}] outcomes not array`);
      (row.outcomes || []).forEach((o, j) => {
        const proof = o && (o.url || o.htmlUrl || o.proof || o.pr || o.issue);
        if (!proof) issues.push(`listings[${i}].outcomes[${j}] no GitHub proof URL`);
      });
    });
  }
  return issues;
}

/** SHA from <script src=".../foot-latest.js"> only. Ignore preload/head/other loaders. */
function extractFootPins(html) {
  const pins = [];
  const seen = new Set();
  const tagRe = /<script\b[^>]*>/gi;
  let tag;
  while ((tag = tagRe.exec(String(html || '')))) {
    const srcm = /\bsrc=["']([^"']+)["']/i.exec(tag[0]);
    if (!srcm) continue;
    const m = /cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/"'\s]+)\/foot-latest\.js(?:[?#][^"']*)?$/i.exec(srcm[1]);
    if (!m) continue;
    const key = `${m[1]}/${m[2]}@${m[3]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push({ owner: m[1], repo: m[2], pin: m[3] });
  }
  return pins;
}

function feedRole(url) {
  if (/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/@]+@main\//i.test(url)) return 'jsdelivr-main';
  if (/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/@]+@(?!main)/i.test(url)) return 'jsdelivr-pin';
  if (/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\//i.test(url)) return 'raw-main';
  if (/raw\.githubusercontent\.com\//i.test(url)) return 'raw-pin';
  return 'other';
}

function hasStylesheet(html) {
  return /<link[^>]+rel=["']stylesheet["']/i.test(html) || /<link[^>]+rel=["']stylesheet["']/i.test(html);
}

function dedupFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    const key = `${f.site}\0${f.kind}\0${f.msg}`;
    if (!map.has(key)) {
      const urls = f.url ? [f.url] : [];
      map.set(key, { ...f, n: urls.length, urls });
    } else {
      const g = map.get(key);
      if (f.url && !g.urls.includes(f.url)) {
        g.urls.push(f.url);
        g.n = g.urls.length;
      }
    }
  }
  return [...map.values()];
}

async function huntSite(name, cfg) {
  const findings = [];
  const note = (sev, kind, msg, extra = {}) => findings.push({ site: name, sev, kind, msg, ...extra });

  const pageUrls = cfg.pages.map((p) => (p.startsWith('http') ? p : cfg.origin + p));
  const extras = cfg.extra || [];
  const all = [...pageUrls, ...extras];
  const bodies = {};
  const seenCopy = new Set();

  for (const url of all) {
    const r = await fetchOne(url);
    bodies[url] = r;
    if (r.error) note('P1', 'fetch', `error ${r.error}`, { url });
    else if (r.status >= 500) note('P0', 'status', `HTTP ${r.status}`, { url });
    else if (r.status === 404) note('P1', 'status', '404', { url });
    else if (r.status >= 400 && ![301, 302, 303, 307, 308].includes(r.status) && r.status !== 405)
      note('P2', 'status', `HTTP ${r.status}`, { url });
    else if ([301, 302, 307, 308].includes(r.status) && !r.loc) note('P1', 'redirect', 'redirect with no Location', { url });

    if (!r.body) continue;
    const copyKey = `${name}:${r.status}:${r.body.length}:${r.body.slice(0, 240)}:${r.body.slice(-120)}`;
    const dupShell = seenCopy.has(copyKey);
    if (!dupShell) seenCopy.add(copyKey);

    const visible = withoutScrubberSource(r.body);
    if (!dupShell) {
      for (const hit of honestyHits(visible)) {
        if (/we don.?t hold it/i.test(visible) && /escrow/i.test(hit)) continue;
        if (/declared, not escrow/i.test(visible) && /escrow/i.test(hit)) continue;
        if (looksLikeReplacementArray(r.body, hit) && !honestyHits(visible.replace(/\[\/[\s\S]{0,80}\/[a-z]*\s*,\s*['"][^'"]*['"]/g, ' ')).includes(hit))
          continue;
        note('P1', 'honesty', `bad phrase: ${hit}`, { url });
      }
      for (const needle of cfg.mustContain || []) {
        if (r.status === 200 && (r.ctype.includes('html') || !r.ctype) && !r.body.includes(needle))
          note('P2', 'copy', `missing ${needle}`, { url });
      }
      for (const needle of cfg.mustNotContain || []) {
        if (visible.includes(needle)) note('P1', 'copy', `forbidden ${needle}`, { url });
      }
      for (const mix of cfg.mixForbidden || []) {
        if (r.status === 200 && visible.toLowerCase().includes(String(mix).toLowerCase()))
          note('P1', 'mix', `other-product leak: ${mix}`, { url });
      }
    }
  }

  const bountyUrls = [
    ...(cfg.bountyPages || []).map((p) => cfg.origin + p),
    ...(cfg.extraBounty || []),
  ];
  for (const url of bountyUrls) {
    let r = bodies[url] || await fetchOne(url);
    if (!r.body) continue;
    const sheet = hasStylesheet(r.body);
    const iframe = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/i.exec(r.body)
      || /<iframe[^>]*src=["']([^"']+)["']/i.exec(r.body);
    let boardUrl = url;
    let board = r;
    if (iframe && /bount/i.test(iframe[0] + iframe[1])) {
      const src = abs(url, iframe[1]);
      if (src) {
        boardUrl = src;
        board = bodies[src] || await fetchOne(src);
        bodies[src] = board;
      }
    }

    const html = board.body || '';
    const mount = bountyMountHtml(html, cfg.bountyMounts || []);
    let copyHtml = null;
    let copySrc = 'chrome-stripped';
    if (mount && typeof mount === 'string') {
      copyHtml = stripChrome(mount);
      copySrc = 'bounty-mount';
    } else {
      copyHtml = stripChrome(withoutScrubberSource(html));
      copySrc = 'chrome-stripped';
    }
    const words = visibleWords(copyHtml);
    const bountyish = /bount|usdc|#dg-bounty|#bb-/i.test(copyHtml);
    if (copySrc === 'bounty-mount' || bountyish) {
      if (words > 180) note('P2', 'copy-budget', `bounty page ~${words} visible words (want <180)`, { url: boardUrl, nWords: words, copySrc });
    } else if (visibleWords(withoutScrubberSource(html)) > 180) {
      note('P3', 'copy-budget', `skipped chrome word-count (${visibleWords(withoutScrubberSource(html))} page words, no bounty mount in HTML)`, { url, copySrc: 'skipped-spa-chrome' });
    }
    for (const fat of BOUNTY_COPY_FAT) {
      if (fat.test(copyHtml) || fat.test(html)) note('P2', 'copy-budget', `fat disclaimer still on board: ${fat.source}`, { url: boardUrl });
    }
    if (/\b25 usd\b|\b50 usd\b|currency": "USD"/i.test(html) && !/usdc/i.test(html))
      note('P1', 'stablecoin', 'bounty still USD, not USDC', { url: boardUrl });

    for (const hex of cfg.palette || []) {
      const hay = (board.body || r.body || '').toLowerCase();
      if (!hay.includes(hex.toLowerCase()) && (url.includes('bount') || boardUrl.includes('bount'))) {
        note('P3', 'palette', `bounty HTML missing ${hex}${sheet ? ' (stylesheet link present; CSS may use vars)' : ' (no stylesheet link in HTML)'}`, {
          url, stylesheet: sheet,
        });
      }
    }
    if (name === 'dasha' && (url.includes('bount') || boardUrl.includes('bount'))) {
      const blob = html + '\n' + (r.body || '');
      const lower = blob.toLowerCase();
      const hasGh = /oauth\/github|#bb-github|#dg-bounty-gh|id=["']bb-github|id=["']dg-bounty-gh/i.test(blob) || /\bid=["']bb-github["']/.test(blob);
      const hasX = /oauth\/x(?:\/|"|'|\s)|#bb-x|#dg-bounty-x|id=["']bb-x["']|id=["']dg-bounty-x/i.test(blob);
      if (!hasGh && !/github/.test(lower))
        note('P1', 'identity', 'bounty board missing GitHub connect', { url: boardUrl });
      if (!hasX)
        note('P2', 'identity', 'bounty board missing X connect', { url: boardUrl });
    }
  }

  const pins = [];
  const seenPin = new Set();
  for (const r of Object.values(bodies)) {
    for (const p of extractFootPins((r && r.body) || '')) {
      const k = `${p.owner}/${p.repo}@${p.pin}`;
      if (seenPin.has(k)) continue;
      seenPin.add(k);
      pins.push(p);
    }
  }
  const feedSet = new Set(cfg.feeds || []);
  if (cfg.cdnRepo && cfg.feedName) {
    const [owner, repo] = cfg.cdnRepo.split('/');
    feedSet.add(`https://raw.githubusercontent.com/${owner}/${repo}/main/${cfg.feedName}`);
    for (const p of pins) {
      if (p.pin && p.pin !== 'main') {
        feedSet.add(`https://raw.githubusercontent.com/${p.owner}/${p.repo}/${p.pin}/${cfg.feedName}`);
        feedSet.add(`https://cdn.jsdelivr.net/gh/${p.owner}/${p.repo}@${p.pin}/${cfg.feedName}`);
      }
    }
    feedSet.add(`https://cdn.jsdelivr.net/gh/${cfg.cdnRepo}@main/${cfg.feedName}`);
  }

  const feedResults = [];
  for (const feed of feedSet) {
    const r = await fetchOne(feed);
    feedResults.push({ feed, r, role: feedRole(feed) });
  }
  const rawMain = feedResults.find((x) => x.role === 'raw-main' && x.r.ok);
  let rawMainIssues = [];
  if (rawMain) {
    try { rawMainIssues = checkFeed(JSON.parse(rawMain.r.body)); } catch { rawMainIssues = ['invalid JSON']; }
  }

  for (const { feed, r, role } of feedResults) {
    if (!r.ok) {
      const sev = role === 'jsdelivr-main' ? 'P3' : 'P1';
      note(sev, 'feed', `feed HTTP ${r.status || r.error}`, { url: feed, role });
      continue;
    }
    if (feed.includes('githubusercontent') || feed.includes('jsdelivr') || feed.includes('github.io')) {
      if (r.cors !== '*') note('P2', 'cors', `feed CORS is ${r.cors || 'missing'}`, { url: feed, role });
    }
    let issues = [];
    try {
      const j = JSON.parse(r.body);
      issues = checkFeed(j);
      if (Array.isArray(j.listings) && j.listings.length === 0)
        note('P3', 'feed', 'feed has zero listings', { url: feed, role });
    } catch (e) {
      issues = [`invalid JSON: ${e.message}`];
    }
    for (const iss of issues) {
      if (role === 'jsdelivr-main' && rawMain && rawMainIssues.length === 0) {
        note('P3', 'feed', `jsDelivr @main lags raw: ${iss}`, { url: feed, role });
      } else if ((role === 'jsdelivr-pin' || role === 'raw-pin') && rawMain && rawMainIssues.length === 0) {
        note('P2', 'feed', `stale foot-latest pin SHA feed: ${iss}`, { url: feed, role });
      } else {
        note('P1', 'feed', iss, { url: feed, role });
      }
    }
  }

  for (const o of cfg.oauth || []) {
    const r = await fetchOne(o.url);
    /* Roadmap D10: a provider with no wrangler secrets answers {configured:false} on
       /oauth/<p>/status, and the requirement is that the CTA reads "<Provider> soon" instead of
       offering a dead Connect. A fail-closed start route is then the designed behaviour, not an
       outage — reporting it P0 flagged a healthy site, and S2 is explicit that a crying-wolf check
       is worse than no check. Unknown status stays P0: fail loud when we cannot prove it is
       deliberate. Still surfaced at P3 so an unconfigured provider never goes silent. */
    const statusUrl = o.url.replace(/\/start$/, '/status');
    let configured = true;
    if (statusUrl !== o.url) {
      const s = await fetchOne(statusUrl);
      if (s.status === 200) {
        try { configured = JSON.parse(s.body || '{}').configured !== false; } catch { configured = true; }
      }
    }
    if (r.status === 404) note('P1', 'oauth', `${o.name} OAuth start 404`, { url: o.url });
    else if (r.status >= 500 && configured) note('P0', 'oauth', `${o.name} OAuth HTTP ${r.status}`, { url: o.url });
    else if (r.status >= 500) note('P3', 'oauth', `${o.name} OAuth unconfigured (start ${r.status}, status configured:false)`, { url: o.url });
  }

  const home = bodies[cfg.origin + '/'] || await fetchOne(cfg.origin + '/');
  if (home.body) {
    const links = extractLinks(home.body, cfg.origin + '/').filter((u) => u.startsWith(cfg.origin));
    for (const u of links.slice(0, 40)) {
      if (bodies[u]) {
        const r = bodies[u];
        if (r.status === 404) note('P1', 'dead-link', 'homepage link 404', { url: u });
        else if (r.status >= 500) note('P0', 'dead-link', `homepage link ${r.status}`, { url: u });
        continue;
      }
      const r = await fetchOne(u, { method: 'GET', timeout: 8000 });
      if (r.status === 404) note('P1', 'dead-link', 'homepage link 404', { url: u });
      else if (r.status >= 500) note('P0', 'dead-link', `homepage link ${r.status}`, { url: u });
    }
  }

  return findings;
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = wanted.length ? wanted : Object.keys(SITES);
const rawFindings = [];
for (const name of names) {
  if (!SITES[name]) { console.error('unknown site', name); continue; }
  rawFindings.push(...await huntSite(name, SITES[name]));
}

const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
const findings = dedupFindings(rawFindings);
findings.sort((a, b) => (order[a.sev] ?? 9) - (order[b.sev] ?? 9));
const summary = {
  p0: findings.filter((f) => f.sev === 'P0').length,
  p1: findings.filter((f) => f.sev === 'P1').length,
  p2: findings.filter((f) => f.sev === 'P2').length,
  p3: findings.filter((f) => f.sev === 'P3').length,
  unique: findings.length,
};
const report = {
  schema: 'site-hunt/3',
  at: new Date().toISOString(),
  summary,
  count: findings.length,
  findings,
};
console.log(JSON.stringify(report, null, 2));

const outDirs = ['/workspace'];
try {
  const p = join(homedir(), 'slop-agent-inbox', 'mission-control');
  mkdirSync(p, { recursive: true });
  outDirs.push(p);
} catch {}
try {
  mkdirSync('/home/potter/slop-agent-inbox/mission-control', { recursive: true });
  outDirs.push('/home/potter/slop-agent-inbox/mission-control');
} catch {}
const written = [];
for (const d of [...new Set(outDirs)]) {
  try {
    mkdirSync(d, { recursive: true });
    const fp = join(d, 'site-hunt-latest.json');
    writeFileSync(fp, JSON.stringify(report, null, 2) + '\n');
    written.push(fp);
  } catch {}
}
if (written.length) console.error('wrote', written.join(' '));
/* Roadmap S1: a P0 or P1 fails the run on both ship paths. The report always covers both brands,
   but the exit code is scoped with --site=<name> so a Demigod P1 cannot block a Dasha ship — an
   unscoped gate would be switched off the first week it blocked an unrelated release. */
const siteArg = process.argv.find((a) => a.startsWith('--site='))?.slice('--site='.length);
const blocking = findings.filter((f) => (f.sev === 'P0' || f.sev === 'P1') && (!siteArg || f.site === siteArg));
if (blocking.length) {
  console.error(`site-hunt: ${blocking.length} blocking finding(s)${siteArg ? ` for ${siteArg}` : ''}`);
  for (const f of blocking) console.error(`  ${f.sev} ${f.site} ${f.kind}: ${f.msg}`);
}
process.exit(blocking.length ? 2 : 0);
