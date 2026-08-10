#!/usr/bin/env node
/**
 * Dasha live audit — disk/worker/site/protocol parity for announce-ready.
 *
 *   node dasha-audit-live.mjs              # worker + site; read-only
 *   node dasha-audit-live.mjs --protocol   # include mutating production WS checks
 *   node dasha-audit-live.mjs --fast       # smaller worker + site check (~2s)
 *   node dasha-audit-live.mjs --strict     # howto must be live; soft lag becomes hard
 *   DASHA_AUDIT_PROTOCOL=1                 # include mutating production WS checks
 *
 * Exit 0: announce-ready (only allowlisted soft lag, e.g. howto-404)
 * Exit 1: hard fail
 * JSON → stdout + /tmp/dasha-audit-live.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JOIN_COOLDOWN_MS } from './dasha-lobby-mod.mjs';
import { ANON_SOFT_CAP } from './dasha-lobby-x.mjs';
import { MISLEADING_COIN_COPY, NEGATIVE_COIN_COPY, publicCopyFromHtml } from './dasha-public-copy.mjs';
import { extractWebMetadata, metadataMismatches, WEBFLOW_METADATA } from './dasha-webflow-metadata.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const fast = args.has('--fast') || process.env.DASHA_AUDIT_FAST === '1';
const strict = args.has('--strict') || process.env.DASHA_LIVE_STRICT === '1';
const protocol =
  args.has('--protocol') || process.env.DASHA_AUDIT_PROTOCOL === '1' || process.env.LOBBY_LIVE === '1';
const skipProtocol =
  fast || !protocol || process.env.LOBBY_LIVE === '0' || args.has('--no-protocol');

const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const MINT_SOURCE_X = 'https://x.com/dash_eats/status/2085405228078432279';
const WSOL = 'So11111111111111111111111111111111111111112';
const PAIR = '9KkDpvUQRqXjiuyMFcy1CwqrxLwDcGGUR2Cap2Qt7bU7';
const SITE = process.env.DASHA_LIVE_BASE || 'https://www.getdasha.com';
const LOBBY = process.env.LOBBY_URL || 'https://lobby.getdasha.com';
const WS_URL = process.env.LOBBY_WS || 'wss://lobby.getdasha.com/ws';
const ORIGIN = 'https://www.getdasha.com';
/** Per-request ceiling so a dead host cannot hang ship/audit forever. */
const FETCH_MS = Number(process.env.DASHA_AUDIT_FETCH_MS) || 12_000;

/** Soft lag never blocks announce unless --strict. */
export const SOFT_LAG = new Set([
  'howto-404',
  'health-assets-mixed',
  'holder-rpc-public',
  'desk-shell-stale-chart-label',
  'sitemap-404',
  'robots-empty',
  'seo-no-canonical', // only if we cannot see Webflow shell; embed-only pages vary
]);

const t0 = Date.now();
const hard = [];
const soft = [];
const checks = [];

/** Pure: should a failed check be soft lag? Exported for tools self-test. */
export function isSoftFail(id, isStrict = false, allow = SOFT_LAG) {
  return !isStrict && allow.has(id);
}

export function noteFactory(state, { isStrict = false, softIds = SOFT_LAG } = {}) {
  return function note(layer, id, ok, detail = {}) {
    state.checks.push({ layer, id, ok, ...detail });
    if (!ok) {
      if (isSoftFail(id, isStrict, softIds)) state.soft.push(id);
      else state.hard.push(id);
    }
  };
}

const note = noteFactory({ checks, hard, soft }, { isStrict: strict, softIds: SOFT_LAG });

async function get(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const { headers: extraHeaders, cacheBust = true, asBytes = false, ...rest } = opts;
    // Webflow O2O often keeps stale HTML after publish; bust it for trustworthy verify.
    let finalUrl = url;
    if (cacheBust && /^https?:\/\//i.test(url) && !/[?&]_=/.test(url)) {
      finalUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
    }
    const r = await fetch(finalUrl, {
      redirect: 'follow',
      headers: {
        'user-agent': 'dasha-audit-live/1',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        ...(extraHeaders || {}),
      },
      ...rest,
      signal: ctrl.signal,
    });
    const bytes = asBytes ? Buffer.from(await r.arrayBuffer()) : null;
    const text = asBytes ? '' : await r.text();
    return {
      status: r.status,
      text,
      bytes,
      contentType: r.headers.get('content-type') || '',
      headers: r.headers,
      ok: r.ok,
      error: null,
    };
  } catch (e) {
    return {
      status: 0,
      text: '',
      bytes: Buffer.alloc(0),
      contentType: '',
      headers: new Headers(),
      ok: false,
      error: e?.name === 'AbortError' ? `timeout ${FETCH_MS}ms` : String(e?.message || e).slice(0, 120),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Pure helpers exported for the audit tool self-test. */
export function extractOgImage(html) {
  for (const tag of String(html || '').match(/<meta\b[^>]*>/gi) || []) {
    const attrs = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)) {
      attrs[match[1].toLowerCase()] = match[3];
    }
    if ((attrs.property || attrs.name || '').toLowerCase() === 'og:image') {
      return String(attrs.content || '').replaceAll('&amp;', '&');
    }
  }
  return '';
}

export function hasPinnedSimpClient(html) {
  return /(?:const SIMP_SRI=['"]sha384-[A-Za-z0-9+/=]+['"][\s\S]*?s\.integrity\s*=\s*SIMP_SRI|s\.integrity\s*=\s*['"]sha384-[A-Za-z0-9+/=]+['"])/.test(html) &&
    /s\.crossOrigin\s*=\s*['"]anonymous['"]/.test(html);
}

export function hasCurrentStudio(html) {
  const studioExternal =
    html.includes('lobby.getdasha.com/client/studio.js') &&
    /integrity=["']sha384-[A-Za-z0-9+/=]+["']/.test(html);
  const studioInline =
    html.includes('class="dasha-studio-embed"') &&
    html.includes("attachShadow({ mode: 'open' })");
  return /\$?dasha\s*(?:·|-)?\s*Meme Studio/i.test(html) && (studioExternal || studioInline);
}

const SITEMAP_AUDIT_CAP = 100;
const SITEMAP_ORIGINS = new Set([new URL(SITE).origin, new URL(LOBBY).origin]);
const sitemapLocs = xml => [...String(xml || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(match => match[1].replaceAll('&amp;', '&'));

export function sitemapUrlViolations(xml) {
  const locs = sitemapLocs(xml), violations = [];
  if (!locs.length) violations.push('missing-loc');
  if (locs.length > SITEMAP_AUDIT_CAP) violations.push(`too-many-urls:${locs.length}`);
  const seen = new Set();
  for (const loc of locs) {
    let url;
    try { url = new URL(loc); } catch { violations.push(`invalid-url:${loc}`); continue; }
    if (loc.length >= 2048) violations.push(`url-too-long:${loc.slice(0, 80)}`);
    if (!SITEMAP_ORIGINS.has(url.origin)) violations.push(`foreign-origin:${url.origin}`);
    if (url.protocol !== 'https:') violations.push(`non-https:${loc}`);
    if (url.username || url.password) violations.push(`url-credentials:${loc}`);
    if (url.hash) violations.push(`url-fragment:${loc}`);
    if (seen.has(url.href)) violations.push(`duplicate-url:${url.href}`);
    seen.add(url.href);
  }
  return violations;
}

export function sitemapUrls(xml) {
  const seen = new Set(), urls = [];
  for (const loc of sitemapLocs(xml)) {
    let url;
    try { url = new URL(loc); } catch { continue; }
    if (!SITEMAP_ORIGINS.has(url.origin) || url.protocol !== 'https:' || url.username || url.password || url.hash || seen.has(url.href)) continue;
    seen.add(url.href);
    if (urls.push(url.href) === SITEMAP_AUDIT_CAP) break;
  }
  return urls;
}

export function homeOrphanedRoutes(xml, html) {
  const hrefs = new Set([...String(html || '').matchAll(/<a\b[^>]*\bhref=["']([^"']+)/gi)].map(match => {
    try { return new URL(match[1].replaceAll('&amp;', '&'), SITE).pathname.replace(/\/$/, '') || '/'; }
    catch { return ''; }
  }));
  return sitemapUrls(xml).map(url => new URL(url).pathname.replace(/\/$/, '') || '/').filter(path => path !== '/' && !hrefs.has(path));
}

export function indexabilityViolations(url, page) {
  const html = String(page?.text || '');
  const canonical = (html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)/i)
    || html.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i))?.[1];
  return [
    ...(page?.status === 200 ? [] : [`status:${page?.status || 0}`]),
    ...(/<meta\b[^>]*\b(?:name|property)=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html) ? ['noindex'] : []),
    ...(canonical === url ? [] : [`canonical:${canonical || 'missing'}`]),
  ];
}

export function socialCardViolations(page) {
  const html = String(page?.text || '');
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const values = Object.fromEntries(tags.map(tag => {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)].map(match => [match[1].toLowerCase(), match[3]]));
    return [(attrs.name || attrs.property || '').toLowerCase(), attrs.content || ''];
  }));
  return [
    ...(String(values['og:image'] || '').startsWith('https://') ? [] : ['og:image']),
    ...(values['twitter:card'] === 'summary_large_image' ? [] : ['twitter:card']),
  ];
}

export function htmlPolicyViolations(page) {
  const headers = page?.headers || new Headers();
  const csp = headers.get('content-security-policy') || '';
  const permissions = headers.get('permissions-policy') || '';
  return [
    ...(/max-age=(?:31536000|[4-9]\d{7,})/i.test(headers.get('strict-transport-security') || '') ? [] : ['hsts']),
    ...(headers.get('x-frame-options') === 'DENY' ? [] : ['frame']),
    ...(/frame-ancestors 'none'/.test(csp) && /base-uri 'none'/.test(csp) && /object-src 'none'/.test(csp) ? [] : ['csp']),
    ...(headers.get('x-content-type-options') === 'nosniff' ? [] : ['nosniff']),
    ...(headers.get('referrer-policy') === 'no-referrer' ? [] : ['referrer']),
    ...(['camera', 'microphone', 'geolocation', 'payment', 'usb'].every(name => permissions.includes(`${name}=()`)) ? [] : ['permissions']),
  ];
}

/** Live Webflow shell allowlist; Dasha-owned cross-origin clients must also be SRI pinned. */
export function executionViolations(html) {
  const source = String(html || '');
  const violations = /<iframe\b/i.test(source) ? ['iframe'] : [];
  for (const tag of source.match(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)].map(match => [match[1].toLowerCase(), match[3].replaceAll('&amp;', '&')]));
    const src = attrs.src || '';
    const platform =
      src === 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js' ||
      /^https:\/\/d3e54v103j8qbb\.cloudfront\.net\/js\/jquery-3\.5\.1\.min\.dc5e7f18c8\.js(?:\?|$)/.test(src) ||
      /^https:\/\/cdn\.prod\.website-files\.com\/5f1458122ba25e70a3ff2bd0\/js\/webflow\.(?:schunk\.)?[a-z0-9.]+\.js$/.test(src);
    const dashaClient = /^https:\/\/lobby\.getdasha\.com\/client\/(?:lobby|simp-board|studio)\.js$/.test(src);
    const pinned = /^sha384-[A-Za-z0-9+/=]+$/.test(attrs.integrity || '') && (attrs.crossorigin || '').toLowerCase() === 'anonymous';
    if (!platform && !(dashaClient && pinned)) violations.push(src || 'script-without-src');
  }
  return violations;
}

/** Every clickable crypto route must retain the exact mint/pool and safe new-tab isolation. */
export function cryptoLinkViolations(html) {
  const violations = [];
  for (const tag of String(html || '').match(/<a\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)].map(match => [match[1].toLowerCase(), match[3].replaceAll('&amp;', '&')]));
    const href = attrs.href || '';
    if ((attrs.target || '').toLowerCase() === '_blank') {
      const rel = new Set(String(attrs.rel || '').toLowerCase().split(/\s+/));
      if (!rel.has('noopener') || !rel.has('noreferrer')) violations.push(`unsafe-new-tab:${href}`);
    }
    let url;
    try { url = new URL(href, SITE); } catch { continue; }
    if (url.username || url.password) violations.push(`url-credentials:${href}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['getdasha.com', 'lobby.getdasha.com'].includes(host) && url.protocol !== 'https:') violations.push(`non-https:${href}`);
    if (host === 'jup.ag') {
      if (url.pathname !== '/swap' || url.searchParams.get('buy') !== MINT || url.searchParams.get('sell') !== WSOL) violations.push(`jupiter-mint:${href}`);
      if ([...url.searchParams.keys()].length !== 2 || url.searchParams.getAll('buy').length !== 1 || url.searchParams.getAll('sell').length !== 1) violations.push(`jupiter-params:${href}`);
    }
    if (host === 'pump.fun' && url.pathname !== `/coin/${MINT}`) violations.push(`pump-mint:${href}`);
    if (host === 'phantom.com' && url.pathname !== `/tokens/solana/${MINT}`) violations.push(`phantom-mint:${href}`);
    if (host === 'raydium.io' && url.searchParams.get('outputMint') !== MINT) violations.push(`raydium-mint:${href}`);
    if (host === 'solscan.io' && url.pathname !== `/token/${MINT}`) violations.push(`solscan-mint:${href}`);
    if (host === 'geckoterminal.com' && url.pathname.toLowerCase() !== `/solana/pools/${PAIR}`.toLowerCase()) violations.push(`gecko-pool:${href}`);
    if (host === 'birdeye.so' && url.pathname !== `/token/${MINT}`) violations.push(`birdeye-mint:${href}`);
    if (host === 'dexscreener.com') violations.push(`dexscreener-profile:${href}`);
  }
  return violations;
}

/** Public funnel is aggregate, thresholded, and deliberately identity-free. */
export function publicMetricsViolations(value) {
  if (!value || typeof value !== 'object') return ['not-object'];
  const violations = [];
  const allowed = {
    root: new Set(['ok', 'since', 'completionSince', 'threshold', 'studio', 'quiz', 'chess', 'limits']),
    studio: new Set(['opens', 'firstEdits', 'openToEdit', 'completions', 'editToCompletion', 'exports', 'editToExport', 'shareIntents', 'shareApiResolutions']),
    quiz: new Set(['starts', 'completions', 'startToComplete', 'replays', 'shareIntents', 'completeToShareIntent']),
    chess: new Set(['pageOpens', 'linkIntents', 'enrollmentIntents', 'holderProofIntents', 'queueIntents', 'pageOpenToLinkIntent', 'linkToEnrollmentIntent', 'enrollmentToHolderProofIntent', 'holderProofToQueueIntent', 'buyIntents', 'pageOpenToBuyIntent', 'gamesStarted', 'gamesCompleted', 'gameStartToComplete', 'rematchesOffered', 'rematchesAccepted', 'rematchOfferToAccept', 'replayOpens', 'replayPlayIntents', 'replayOpenToPlay', 'replayShareIntents', 'replayShareHandoffs', 'replayShareIntentToHandoff', 'completionToReplayShare', 'challengesCreated', 'challengesAccepted', 'challengeCreateToAccept', 'challengeShareIntents', 'tournamentsCreated', 'tournamentJoins', 'tournamentsStarted', 'tournamentsCompleted', 'tournamentShareIntents']),
  };
  for (const key of Object.keys(value)) if (!allowed.root.has(key)) violations.push(`root:${key}`);
  for (const group of ['studio', 'quiz', 'chess']) {
    if (!value[group] || typeof value[group] !== 'object' || Array.isArray(value[group])) {
      violations.push(`${group}:missing`);
      continue;
    }
    for (const key of Object.keys(value[group])) if (!allowed[group].has(key)) violations.push(`${group}:${key}`);
    for (const [key, cell] of Object.entries(value[group])) {
      if (cell === null) continue;
      if (!Number.isFinite(cell) || cell < 0) violations.push(`${group}:${key}:value`);
      else if (/To/.test(key) && cell > 1) violations.push(`${group}:${key}:ratio`);
      else if (!/To/.test(key) && cell < value.threshold) violations.push(`${group}:${key}:unsuppressed`);
    }
  }
  if (value.ok !== true) violations.push('ok');
  if (!Number.isInteger(value.threshold) || value.threshold < 5) violations.push('threshold');
  if (!Number.isFinite(Date.parse(value.since))) violations.push('since');
  if ('completions' in (value.studio || {}) && !Number.isFinite(Date.parse(value.completionSince))) violations.push('completionSince');
  if (!/aggregate/i.test(value.limits || '') || !/not unique-user/i.test(value.limits || '')) violations.push('limits');
  return violations;
}

export function pngDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

export function cryptoClaimViolations(html) {
  const copy = publicCopyFromHtml(html);
  const match = copy.match(MISLEADING_COIN_COPY);
  return match ? [match[0]] : [];
}

/** Structured data is another public claim surface; keep it minimal and visible. */
export function structuredDataViolations(html) {
  const violations = [], types = [];
  for (const [index, match] of [...String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    let value;
    try { value = JSON.parse(match[1]); } catch { violations.push(`invalid-json:${index + 1}`); continue; }
    const type = value?.['@type'];
    types.push(type);
    if (['SoftwareApplication', 'WebApplication'].includes(type)) violations.push(`hidden-app-schema:${type}`);
    if (value && Object.hasOwn(value, 'license')) violations.push(`license-claim:${String(value.license).slice(0, 100)}`);
  }
  if (types.filter(type => type === 'WebSite').length > 1) violations.push('duplicate-website');
  return violations;
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function diskLanding() {
  try {
    return readFileSync(join(root, 'dasha-landing.html'), 'utf8');
  } catch {
    return '';
  }
}

function diskAssetHash() {
  try {
    const p = join(root, 'dasha-lobby-static-gen.mjs');
    if (!existsSync(p)) return null;
    const m = readFileSync(p, 'utf8').match(/ASSET_HASH\s*=\s*["']([a-f0-9]+)["']/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

async function sampleHealth(times = 5) {
  const samples = [];
  for (let i = 0; i < times; i++) {
    const health = await get(`${LOBBY}/health?s=${i}&t=${Date.now()}`);
    let hj = null;
    try {
      hj = health.text ? JSON.parse(health.text) : null;
    } catch {
      /* ignore */
    }
    samples.push({ health, hj });
    if (i + 1 < times) await new Promise((r) => setTimeout(r, 200));
  }
  return samples;
}

async function auditWorker() {
  // Sample multiple times: custom-domain edges can briefly serve two Worker versions after deploy.
  const samples = await sampleHealth(5);
  const okSamples = samples.filter((s) => s.health.status === 200 && s.hj?.ok === true);
  const hj = okSamples[0]?.hj || samples[0]?.hj;
  const health = okSamples[0]?.health || samples[0]?.health;
  const assetSet = new Set(okSamples.map((s) => s.hj?.assets).filter(Boolean));

  note('worker', 'health', okSamples.length > 0, {
    status: health?.status,
    error: health?.error,
    samplesOk: okSamples.length,
  });
  note('worker', 'health-mint', hj?.mint === MINT, { mint: hj?.mint });
  note('worker', 'health-pin-clean', hj?.pin === 'Public lobby.');
  note('worker', 'health-assets', typeof hj?.assets === 'string' && hj.assets.length >= 8, {
    assets: hj?.assets || null,
    variants: [...assetSet],
  });
  // Must match product constant — missing field is a hard fail (stale worker), not a pass.
  note('worker', 'soft-cap', hj?.softCapAnon === ANON_SOFT_CAP, {
    softCapAnon: hj?.softCapAnon,
    expect: ANON_SOFT_CAP,
  });
  if (hj?.holderRpc === 'public-fallback') {
    checks.push({ layer: 'worker', id: 'holder-rpc-public', ok: false, soft: true });
    if (!soft.includes('holder-rpc-public')) soft.push('holder-rpc-public');
  }
  // Soft: mixed versions during CF rollout (informational).
  if (assetSet.size > 1) {
    checks.push({
      layer: 'worker',
      id: 'health-assets-mixed',
      ok: false,
      soft: true,
      variants: [...assetSet],
    });
    if (!soft.includes('health-assets-mixed')) soft.push('health-assets-mixed');
  }

  const diskHash = diskAssetHash();
  if (diskHash) {
    // Pass if any edge sample matches disk (mixed rollout) OR workers.dev matches.
    let liveMatch = [...assetSet].includes(diskHash);
    let workersDevAssets = null;
    if (!liveMatch) {
      const wd = await get(
        `https://dasha-lobby.getdasha.workers.dev/health?t=${Date.now()}`,
      );
      try {
        workersDevAssets = wd.text ? JSON.parse(wd.text).assets : null;
      } catch {
        /* ignore */
      }
      liveMatch = workersDevAssets === diskHash;
    }
    note('worker', 'assets-hash-match', liveMatch, {
      live: hj?.assets || null,
      workersDev: workersDevAssets,
      disk: diskHash,
      variants: [...assetSet],
    });
  }

  const lobbyJs = await get(`${LOBBY}/client/lobby.js`);
  note(
    'worker',
    'client-lobby',
    lobbyJs.status === 200 && /DashaLobby|function mount/.test(lobbyJs.text),
    { status: lobbyJs.status, bytes: lobbyJs.text.length, error: lobbyJs.error },
  );
  note('worker', 'client-lobby-mint', lobbyJs.text.includes(MINT));

  const studioJs = await get(`${LOBBY}/client/studio.js`);
  note(
    'worker',
    'client-studio',
    studioJs.status === 200 && studioJs.text.includes('attachShadow'),
    { status: studioJs.status, bytes: studioJs.text.length, error: studioJs.error },
  );
  note('worker', 'client-studio-mobile-scroll', studioJs.text.includes('touch-action:pan-y'));

  const publicMetrics = await get(`${LOBBY}/studio/metrics/public`);
  let publicMetricsJson = null;
  try { publicMetricsJson = JSON.parse(publicMetrics.text); } catch { /* handled below */ }
  const metricsViolations = publicMetricsViolations(publicMetricsJson);
  note('worker', 'public-metrics', publicMetrics.status === 200 && metricsViolations.length === 0, {
    status: publicMetrics.status,
    violations: metricsViolations,
    since: publicMetricsJson?.since || null,
  });

  const simpJs = await get(`${LOBBY}/client/simp-board.js`);
  note(
    'worker',
    'client-simp',
    simpJs.status === 200 && /DashaSimpBoard|simp-board/.test(simpJs.text),
    { status: simpJs.status, bytes: simpJs.text.length, error: simpJs.error },
  );

  const board = await get(`${LOBBY}/simp/board`);
  let bj = null;
  try {
    bj = board.text ? JSON.parse(board.text) : null;
  } catch {
    /* ignore */
  }
  note(
    'worker',
    'simp-board',
    board.status === 200 && Boolean(bj?.editorial || bj?.schema || Array.isArray(bj?.measured)),
    { status: board.status, error: board.error },
  );

  const resultUrl = bj?.measured?.find((entry) => entry?.quiz?.resultUrl)?.quiz?.resultUrl;
  if (resultUrl) {
    const resultPage = await get(resultUrl, { extraHeaders: { 'user-agent': 'Twitterbot/1.0' } });
    note('worker', 'simp-result-card', resultPage.status === 200 && /twitter:card[^>]+summary_large_image/i.test(resultPage.text) && /og:image[^>]+\/simp\/card\/quiz\.png/i.test(resultPage.text), {
      status: resultPage.status,
      url: resultUrl,
    });
  }
  const quizCard = await get(`${LOBBY}/simp/card/quiz.png`, { asBytes: true, extraHeaders: { 'user-agent': 'Twitterbot/1.0' } });
  note('worker', 'simp-result-image', quizCard.status === 200 && quizCard.contentType === 'image/png' && JSON.stringify(pngDimensions(quizCard.bytes)) === JSON.stringify({ width: 1200, height: 628 }) && quizCard.bytes?.length <= 2_000_000, {
    status: quizCard.status,
    contentType: quizCard.contentType,
    dimensions: pngDimensions(quizCard.bytes),
    bytes: quizCard.bytes?.length || 0,
    maxBytes: 2_000_000,
  });

  const stats = await get(`${LOBBY}/stats`);
  let sj = null;
  try {
    sj = stats.text ? JSON.parse(stats.text) : null;
  } catch {
    /* ignore */
  }
  note('worker', 'stats', stats.status === 200 && sj?.ok === true && sj?.max === 80, {
    status: stats.status,
    count: sj?.count,
    xLink: sj?.xLink,
    error: stats.error,
  });

  // SEO fallbacks hosted on lobby (www may still lag Webflow SEO settings).
  const robots = await get(`${LOBBY}/robots.txt`);
  note(
    'worker',
    'lobby-robots',
    robots.status === 200 && /User-agent:/i.test(robots.text) && /Sitemap:/i.test(robots.text),
    { status: robots.status, bytes: robots.text.length },
  );
  const sm = await get(`${LOBBY}/sitemap.xml`);
  note(
    'worker',
    'lobby-sitemap',
    sm.status === 200 && /getdasha\.com/i.test(sm.text) && /\/studio/i.test(sm.text),
    { status: sm.status, bytes: sm.text.length },
  );

  return { health: hj, stats: sj };
}

async function auditSite() {
  const home = await get(`${SITE}/`);
  const desk = await get(`${SITE}/dasha`);
  const studio = await get(`${SITE}/studio`);
  const lobbyPage = await get(`${SITE}/lobby`);
  const howto = await get(`${SITE}/how-to-buy`);
  const disk = diskLanding();

  note('site', 'home-200', home.status === 200, {
    status: home.status,
    bytes: home.text.length,
    error: home.error,
  });
  note('site', 'desk-200', desk.status === 200, { status: desk.status, error: desk.error });
  note('site', 'studio-200', studio.status === 200, { status: studio.status, error: studio.error });

  note('site', 'home-mint', home.text.includes(MINT));
  note('site', 'home-mint-source', home.text.includes(MINT_SOURCE_X));
  note('site', 'home-jup', home.text.includes('jup.ag'));
  note(
    'site',
    'home-one-buy-venue',
    home.text.includes('jup.ag/swap') &&
      !/pump\.fun|phantom\.com\/tokens|raydium\.io\/swap/i.test(home.text),
  );
  note('site', 'home-lobby-link', home.text.includes('href="/lobby"'));
  note('site', 'home-no-lobby-mount', !home.text.includes('id="dasha-lobby"'));
  note('site', 'lobby-page-200', lobbyPage.status === 200, { status: lobbyPage.status });
  note('site', 'lobby-page-mount', lobbyPage.text.includes('id="dasha-lobby"'));
  note('site', 'lobby-page-client', lobbyPage.text.includes('lobby.getdasha.com/client/lobby.js'));
  note(
    'site',
    'home-simp-mount',
    home.text.includes('id="simp"') && home.text.includes('id="dasha-simp-board"'),
  );
  note('site', 'home-simp-client', home.text.includes('lobby.getdasha.com/client/simp-board.js'));
  note('site', 'home-negative-coin-copy', !NEGATIVE_COIN_COPY.test(publicCopyFromHtml(home.text)));
  note('site', 'desk-negative-coin-copy', !NEGATIVE_COIN_COPY.test(publicCopyFromHtml(desk.text)));
  note('site', 'studio-negative-coin-copy', !NEGATIVE_COIN_COPY.test(publicCopyFromHtml(studio.text)));
  note('site', 'lobby-negative-coin-copy', !NEGATIVE_COIN_COPY.test(publicCopyFromHtml(lobbyPage.text)));
  note('site', 'home-no-telegram', !/t\.me\/dashacommunity/i.test(home.text));
  note('site', 'home-no-thesis', !/thesis card|conviction receipt/i.test(home.text));
  note('site', 'home-no-safe-claims', !/official Dasha|safe token|verified mint/i.test(home.text));

  note('site', 'desk-shell-stale-chart-label', !/chart on Dexscreener/i.test(publicCopyFromHtml(desk.text)), {
    current: /chart on Dexscreener/i.test(publicCopyFromHtml(desk.text)) ? 'chart on Dexscreener' : null,
    expected: 'chart on GeckoTerminal',
  });
  note(
    'site',
    'home-simp-sri',
    hasPinnedSimpClient(home.text),
  );

  for (const [id, response] of Object.entries({ home, studio, desk, lobby: lobbyPage, howto })) {
    const expected = WEBFLOW_METADATA[id];
    const actual = extractWebMetadata(response.text);
    const mismatches = metadataMismatches(actual, expected);
    note('site', `metadata-${id}`, response.status === 200 && mismatches.length === 0, {
      pageId: expected.pageId,
      path: expected.path,
      mismatches,
      actual,
      expected: Object.fromEntries(Object.entries(expected).filter(([key]) => key !== 'pageId' && key !== 'path')),
    });
  }

  const ogImage = extractOgImage(home.text);
  const liveOg = ogImage ? await get(ogImage, { asBytes: true, cacheBust: false }) : null;
  const liveOgDimensions = pngDimensions(liveOg?.bytes);
  note(
    'site',
    'home-og-image',
    Boolean(
      ogImage &&
      liveOg?.status === 200 &&
      /^image\/png\b/i.test(liveOg.contentType) &&
      liveOgDimensions?.width === 1200 &&
      liveOgDimensions?.height === 630
    ),
    {
      url: ogImage || null,
      status: liveOg?.status || 0,
      contentType: liveOg?.contentType || null,
      dimensions: liveOgDimensions,
      bytes: liveOg?.bytes?.length || 0,
    },
  );
  let diskOg = null;
  try {
    diskOg = readFileSync(join(root, 'dasha-worker-assets/og/dasha-social-card.png'));
  } catch {
    /* hard-failed by parity check below */
  }
  note(
    'site',
    'home-og-card-current',
    Boolean(diskOg?.length && liveOg?.bytes?.length && sha256(diskOg) === sha256(liveOg.bytes)),
    {
      url: ogImage || null,
      diskHash: diskOg?.length ? sha256(diskOg) : null,
      liveHash: liveOg?.bytes?.length ? sha256(liveOg.bytes) : null,
    },
  );

  if (disk) {
    const need = [
      ['parity-lobby-link', 'href="/lobby"'],
      ['parity-simp-client', 'lobby.getdasha.com/client/simp-board.js'],
    ];
    for (const [id, n] of need) {
      if (disk.includes(n)) note('site', id, home.text.includes(n), { needle: n });
    }
    const diskBytes = Buffer.byteLength(disk, 'utf8');
    note('site', 'landing-under-cap', diskBytes <= 49000, { diskBytes });
  }

  note('site', 'desk-mint', desk.text.includes(MINT) && desk.text.includes('jup.ag'));
  const deskNeutral = !/buy the dip|dd-fomo|raid kit/i.test(desk.text);
  note('site', 'desk-neutral', deskNeutral);

  note('site', 'studio-current', hasCurrentStudio(studio.text));

  const howtoLive = howto.status === 200;
  if (howtoLive) {
    note('site', 'howto-live', true, { status: 200 });
    note('site', 'howto-mint', howto.text.includes(MINT));
    note('site', 'howto-mint-source', howto.text.includes(MINT_SOURCE_X));
    note('site', 'howto-negative-coin-copy', !NEGATIVE_COIN_COPY.test(publicCopyFromHtml(howto.text)));
    note(
      'site',
      'howto-one-buy-venue',
      howto.text.includes('jup.ag') && !/pump\.fun|phantom\.com\/tokens|raydium\.io\/swap/i.test(howto.text),
    );
    note(
      'site',
      'howto-swap-step',
      /data-n=["']03["'][^>]*>[\s\S]{0,160}<h2>Swap<\/h2>/i.test(howto.text),
    );
    note(
      'site',
      'howto-concise',
      howto.text.includes('SOL → match mint') || howto.text.includes('match mint'),
    );
  } else if (strict) {
    note('site', 'howto-live', false, { status: howto.status });
  } else {
    // Soft lag: recorded but does not fail announce.
    checks.push({ layer: 'site', id: 'howto-404', ok: false, soft: true, status: howto.status });
    if (!soft.includes('howto-404')) soft.push('howto-404');
  }

  // SEO surfaces (Webflow site settings — often neglected while embeds ship fine).
  const knownByPath = new Map([
    ['/', home], ['/studio', studio], ['/dasha', desk], ['/lobby', lobbyPage], ['/how-to-buy', howto],
  ]);
  const routeIds = { '/': 'home', '/studio': 'studio', '/dasha': 'desk', '/lobby': 'lobby', '/how-to-buy': 'howto' };
  const auditPublicPages = routePages => {
    for (const [url, page] of routePages) {
      const path = new URL(url).pathname;
      const id = routeIds[path] || path.slice(1).replace(/[^a-z0-9]+/gi, '-') || 'home';
      const executable = executionViolations(page.text);
      note('site', `execution-${id}`, page.status === 200 && executable.length === 0, { violations: executable });
      const links = cryptoLinkViolations(page.text);
      note('site', `crypto-links-${id}`, page.status === 200 && links.length === 0, { violations: links });
      const claims = cryptoClaimViolations(page.text);
      note('site', `crypto-claims-${id}`, page.status === 200 && claims.length === 0, { violations: claims });
      const structured = structuredDataViolations(page.text);
      note('site', `structured-data-${id}`, page.status === 200 && structured.length === 0, { violations: structured });
    }
  };
  const sitemap = await get(`${SITE}/sitemap.xml`);
  if (sitemap.status === 200 && /<urlset|<url>/i.test(sitemap.text)) {
    note('site', 'sitemap-live', true, { status: 200, bytes: sitemap.text.length });
    const hasHome = sitemap.text.includes('getdasha.com/');
    const hasStudio = sitemap.text.includes('/studio');
    const hasDesk = sitemap.text.includes('/dasha');
    note('site', 'sitemap-routes', hasHome && hasStudio && hasDesk, {
      hasHome,
      hasStudio,
      hasDesk,
    });
    const urls = sitemapUrls(sitemap.text);
    const sitemapScopeViolations = sitemapUrlViolations(sitemap.text);
    note('site', 'sitemap-url-scope', sitemapScopeViolations.length === 0, { violations: sitemapScopeViolations });
    const orphaned = homeOrphanedRoutes(sitemap.text, home.text);
    note('site', 'home-sitemap-navigation', orphaned.length === 0, { routes: urls.length, orphaned });
    const routePages = await Promise.all(urls.map(async url => [url, knownByPath.get(new URL(url).pathname) || await get(url)]));
    auditPublicPages(routePages);
    const routeChecks = routePages.map(([url, page]) => [url, indexabilityViolations(url, page)]);
    const routeViolations = Object.fromEntries(routeChecks.filter(([, violations]) => violations.length));
    note('site', 'sitemap-indexable', urls.length > 0 && Object.keys(routeViolations).length === 0, {
      routes: urls.length,
      violations: routeViolations,
    });
    const cardChecks = routePages.map(([url, page]) => [url, socialCardViolations(page)]);
    const cardViolations = Object.fromEntries(cardChecks.filter(([, violations]) => violations.length));
    note('site', 'sitemap-social-cards', Object.keys(cardViolations).length === 0, {
      routes: urls.length,
      violations: cardViolations,
    });
    const policyChecks = routePages.map(([url, page]) => [url, htmlPolicyViolations(page)]);
    const policyViolations = Object.fromEntries(policyChecks.filter(([, violations]) => violations.length));
    note('site', 'sitemap-html-policy', Object.keys(policyViolations).length === 0, {
      routes: urls.length,
      violations: policyViolations,
    });
  } else if (strict) {
    auditPublicPages([...knownByPath].map(([path, page]) => [`${SITE}${path}`, page]));
    note('site', 'sitemap-live', false, { status: sitemap.status });
  } else {
    auditPublicPages([...knownByPath].map(([path, page]) => [`${SITE}${path}`, page]));
    checks.push({ layer: 'site', id: 'sitemap-404', ok: false, soft: true, status: sitemap.status });
    if (!soft.includes('sitemap-404')) soft.push('sitemap-404');
  }

  const robots = await get(`${SITE}/robots.txt`);
  const robotsBody = (robots.text || '').trim();
  if (robots.status === 200 && robotsBody.length > 0) {
    note('site', 'robots-live', true, { bytes: robotsBody.length });
  } else if (strict) {
    note('site', 'robots-live', false, { status: robots.status, bytes: robotsBody.length });
  } else {
    checks.push({
      layer: 'site',
      id: 'robots-empty',
      ok: false,
      soft: true,
      status: robots.status,
      bytes: robotsBody.length,
    });
    if (!soft.includes('robots-empty')) soft.push('robots-empty');
  }

  // Webflow shell metadata (outside embed) — soft when missing.
  const hasCanonical =
    /rel=["']canonical["']/i.test(home.text) || /property=["']og:url["']/i.test(home.text);
  if (hasCanonical) note('site', 'seo-canonical', true);
  else if (strict) note('site', 'seo-canonical', false);
  else {
    checks.push({ layer: 'site', id: 'seo-no-canonical', ok: false, soft: true });
    if (!soft.includes('seo-no-canonical')) soft.push('seo-no-canonical');
  }

  // Desk must stay trust-reset (hard). Ignore explicit anti-FOMO comments.
  const deskProbe = desk.text.replace(/No FOMO,\s*raid,\s*or referral\.?/gi, '');
  note(
    'site',
    'desk-no-fomo',
    !/\braid kit\b|\bbuy the dip\b|dd-fomo|\breferral code\b|\bref=[a-z0-9_-]+/i.test(deskProbe),
  );

  // Retired product surfaces must stay gone from public home/desk/studio.
  const allPublic = home.text + desk.text + studio.text;
  note('site', 'no-thesis-public', !/thesis card|conviction receipt|receipt-form/i.test(allPublic));
  note('site', 'no-telegram-public', !/t\.me\/dashacommunity/i.test(allPublic));

  return {
    homeBytes: home.text.length,
    ogImage: ogImage || null,
    deskNeutral,
    howtoLive,
    sitemapStatus: sitemap.status,
    robotsBytes: robotsBody.length,
  };
}

async function openWs(nick) {
  const { default: WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers: { Origin: ORIGIN } });
    const msgs = [];
    let done = false;
    let readyTimer;
    let helloTimer;
    const finish = (fn, value, keepOpen = false) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(readyTimer);
      clearTimeout(helloTimer);
      if (!keepOpen) ws.terminate();
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error(`timeout ${nick}`)), 12000);
    ws.on('message', (d) => {
      try {
        msgs.push(JSON.parse(String(d)));
      } catch {
        /* ignore */
      }
    });
    ws.on('error', (error) => finish(reject, error));
    ws.on('close', (code, reason) =>
      finish(reject, new Error(`closed ${nick} ${code} ${String(reason)}`)),
    );
    ws.on('open', () => {
      const waitReady = () => {
        if (done) return;
        if (msgs.some((m) => m.type === 'ready')) {
          ws.send(JSON.stringify({ type: 'hello', nick }));
          return;
        }
        readyTimer = setTimeout(waitReady, 25);
      };
      waitReady();
      const waitHello = () => {
        if (done) return;
        if (msgs.some((m) => m.type === 'hello_ok' && m.you === nick)) {
          finish(resolve, { ws, msgs }, true);
          return;
        }
        if (msgs.some((m) => m.type === 'error' && /nick taken/i.test(m.error || ''))) {
          finish(resolve, { ws, msgs, nickTaken: true }, true);
          return;
        }
        helloTimer = setTimeout(waitHello, 25);
      };
      waitHello();
    });
  });
}

async function auditProtocol() {
  let WebSocket;
  try {
    ({ default: WebSocket } = await import('ws'));
  } catch (e) {
    note('protocol', 'ws-module', false, { error: String(e?.message || e) });
    return;
  }

  const suffix = String(Date.now()).slice(-6);
  let a;
  let b;
  let c;
  try {
    a = await openWs('a' + suffix);
    b = await openWs('b' + suffix);
    note(
      'protocol',
      'hello',
      !a.nickTaken && !b.nickTaken && a.msgs.some((m) => m.type === 'hello_ok'),
    );

    const helloOk = a.msgs.find((m) => m.type === 'hello_ok');
    note(
      'protocol',
      'join-cooldown-field',
      typeof helloOk?.joinCooldownRemainingMs === 'number' ||
        typeof helloOk?.joinCooldownMs === 'number',
      { remaining: helloOk?.joinCooldownRemainingMs },
    );

    const coolMs =
      typeof helloOk?.joinCooldownRemainingMs === 'number'
        ? helloOk.joinCooldownRemainingMs
        : JOIN_COOLDOWN_MS;
    if (coolMs > 0) await new Promise((r) => setTimeout(r, coolMs + 250));

    const ping = 'ping-' + suffix;
    a.ws.send(JSON.stringify({ type: 'chat', text: ping }));
    await new Promise((r) => setTimeout(r, 700));
    note(
      'protocol',
      'broadcast',
      b.msgs.some((m) => m.type === 'chat' && m.text === ping),
    );

    a.ws.send(JSON.stringify({ type: 'chat', text: 'too-fast-' + suffix }));
    await new Promise((r) => setTimeout(r, 250));
    note(
      'protocol',
      'rate-limit',
      a.msgs.some((m) => m.type === 'error' && /slow down|rate/i.test(m.error || '')),
    );

    a.ws.send(JSON.stringify({ type: 'chat', text: 'claim free sol airdrop now' }));
    await new Promise((r) => setTimeout(r, 250));
    note(
      'protocol',
      'automod',
      a.msgs.some((m) => m.type === 'error' && /automod/i.test(m.error || '')),
    );

    c = await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL, { headers: { Origin: ORIGIN } });
      const msgs = [];
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error('nick-taken timeout'));
      }, 10000);
      ws.on('message', (d) => {
        const m = JSON.parse(String(d));
        msgs.push(m);
        if (m.type === 'ready') ws.send(JSON.stringify({ type: 'hello', nick: 'a' + suffix }));
        if (m.type === 'error' && /nick taken/i.test(m.error || '')) {
          clearTimeout(timer);
          resolve({ ws, nickTaken: true });
        }
        if (m.type === 'hello_ok') {
          clearTimeout(timer);
          resolve({ ws, nickTaken: false });
        }
      });
      ws.on('error', (error) => {
        clearTimeout(timer);
        ws.terminate();
        reject(error);
      });
    });
    note('protocol', 'nick-unique', c.nickTaken === true);

    // Origin block: only an explicit HTTP 403 on upgrade proves the guard.
    // Network error / timeout must NOT count as pass (false confidence).
    await new Promise((resolve) => {
      const bad = new WebSocket(WS_URL, { headers: { Origin: 'https://evil.example' } });
      let settled = false;
      const done = (ok, detail) => {
        if (settled) return;
        settled = true;
        try {
          bad.terminate?.();
        } catch {
          /* ignore */
        }
        note('protocol', 'origin-block', ok, detail);
        resolve();
      };
      bad.on('unexpected-response', (_req, res) => {
        done(res.statusCode === 403, { status: res.statusCode });
      });
      bad.on('open', () => done(false, { error: 'evil origin opened' }));
      bad.on('error', (e) =>
        done(false, { error: 'socket error without 403', message: String(e?.message || e).slice(0, 80) }),
      );
      setTimeout(() => done(false, { error: 'timeout waiting for 403' }), 4000);
    });
  } catch (e) {
    note('protocol', 'protocol-error', false, { error: String(e?.message || e).slice(0, 200) });
  } finally {
    try {
      a?.ws?.close();
      b?.ws?.close();
      c?.ws?.close();
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  let worker = {};
  let site = {};
  try {
    worker = await auditWorker();
  } catch (e) {
    note('worker', 'worker-throw', false, { error: String(e?.message || e).slice(0, 200) });
  }
  try {
    site = await auditSite();
  } catch (e) {
    note('site', 'site-throw', false, { error: String(e?.message || e).slice(0, 200) });
  }
  if (!skipProtocol) {
    try {
      await auditProtocol();
    } catch (e) {
      note('protocol', 'protocol-throw', false, { error: String(e?.message || e).slice(0, 200) });
    }
  } else {
    checks.push({
      layer: 'protocol',
      id: 'skipped',
      ok: true,
      reason: fast
        ? '--fast'
        : args.has('--no-protocol') || process.env.LOBBY_LIVE === '0'
          ? 'protocol disabled'
          : 'read-only default; use --protocol',
    });
  }

  const hardU = [...new Set(hard)];
  const softU = [...new Set(soft)].filter((id) => !hardU.includes(id));

  const announceReady = hardU.length === 0;
  const report = {
    ok: announceReady,
    announceReady,
    ms: Date.now() - t0,
    mode: { fast, strict, protocol: !skipProtocol, fetchMs: FETCH_MS },
    site: SITE,
    lobby: LOBBY,
    hard: hardU,
    soft: softU,
    worker: {
      assets: worker?.health?.assets || null,
      count: worker?.stats?.count,
      xLink: worker?.stats?.xLink,
      softCapAnon: worker?.health?.softCapAnon,
      holderRpc: worker?.health?.holderRpc || null,
    },
    siteSummary: site,
    checks,
    note: announceReady
      ? softU.length
        ? `announce-ready with soft lag: ${softU.join(', ')}`
        : 'announce-ready'
      : `hard fails: ${hardU.join(', ')}`,
  };

  writeFileSync('/tmp/dasha-audit-live.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(announceReady ? 0 : 1);
}

// Allow `import { isSoftFail }` from tests without executing live audit.
const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href;

if (isMain) {
  main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e?.stack || e).slice(0, 1500) }));
    process.exit(1);
  });
}
