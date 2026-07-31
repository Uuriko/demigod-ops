#!/usr/bin/env node
/**
 * demigod-truth — THE single state oracle (agents must use this, not invent drift checks)
 *
 *   bin/dg truth              # human summary
 *   bin/dg truth --json
 *   bin/dg truth --strict     # exit 1 unless fullyShipped (disk==CDN==live + board)
 *   bin/dg truth --require-match  # exit 1 if disk ver ≠ live ver (release mode)
 *
 *
 * Writes: /tmp/dg-busy/truth.json + truth.md
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { isFrozen } from './demigod-agent-tools-lib.mjs';
import { beginRun, sealRun, addArtifact, refuseIfStale } from './demigod-evidence.mjs';
import { appendFromTruth } from './demigod-version-ledger.mjs';
import { cachedFetchText, writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';

/** Foot CDN script src — catbox, litterbox, gist, jsDelivr, statically */
const FOOT_SCRIPT_SRC_RE =
  /src=["'](https?:\/\/(?:files\.catbox\.moe|litter\.catbox\.moe|gist\.githubusercontent\.com|cdn\.jsdelivr\.net|cdn\.statically\.io)[^"']+\.js(?:[?#][^"']*)?)["']/i;
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const args = process.argv.slice(2);
const TRUTH_FLAGS = new Set([
  '--json',
  '--md',
  '--quiet',
  '--strict',
  '--selftest',
  '--require-match',
  '--no-cache',
  '--help',
  '-h',
]);
const unknownArg = args.find((a) => !TRUTH_FLAGS.has(a));
if (unknownArg) {
  console.error(
    `truth: unknown argument ${unknownArg} — try: bin/dg truth [--json|--md|--quiet|--strict|--require-match|--selftest|--no-cache]`,
  );
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`demigod-truth — disk → manifest → CDN → live oracle

Usage: bin/dg truth [--json|--md|--quiet|--strict|--require-match|--selftest|--no-cache]

--json            machine-readable facts
--strict          exit 1 unless fullyShipped
--require-match   exit 1 if disk foot version ≠ live
--selftest        offline contract checks only
--no-cache        bypass live HTML cache`);
  process.exit(0);
}
const asJson = args.includes('--json');
const asMd = args.includes('--md') || (!asJson && !args.includes('--quiet'));
const strict = args.includes('--strict');
const selftest = args.includes('--selftest');
const requireMatch =
  args.includes('--require-match') || process.env.DEMIGOD_REQUIRE_LIVE_MATCH === '1';
const quiet = args.includes('--quiet');

function runSelftest() {
  const failures = [];
  const check = (condition, label) => {
    if (condition) console.log(`ok ${label}`);
    else failures.push(label);
  };

  const manifestUrl = 'https://cdn.jsdelivr.net/gh/org/repo@abc123/foot-latest.js';
  check(canonicalAssetUrl(`${manifestUrl}?v=443#boot`) === manifestUrl, 'canonical URL strips cache identity noise');
  check(canonicalAssetUrl('http://cdn.jsdelivr.net/foot-latest.js') === null, 'canonical URL rejects non-HTTPS assets');
  check(canonicalAssetUrl('not a URL') === null, 'canonical URL rejects malformed assets');
  check(assetId(manifestUrl) === 'foot-latest.js', 'asset identity uses the URL pathname');
  check(assetId(null) === null, 'asset identity fails closed without a URL');
  check(
    footLoaderUrls(`<script src="${manifestUrl}?v=443"></script>`, manifestUrl).length === 1,
    'loader detection recognizes canonical foot-latest with a cache query',
  );
  check(
    footLoaderUrls(
      `<script src="${manifestUrl}"></script>` +
        '<script src="https://cdn.jsdelivr.net/gh/org/repo@older/foot-latest.js"></script>',
      manifestUrl,
    ).length === 2,
    'loader detection preserves duplicate current/stale foot loaders for corruption checks',
  );
  check(
    footLoaderUrls('<script id="demigod-foot-cdn-loader" src="https://files.catbox.moe/abc123.js"></script>', manifestUrl).length === 1,
    'loader detection recognizes an identified hashed fallback',
  );
  check(
    footLoaderUrls('<script src="https://cdn.jsdelivr.net/gh/org/repo@abc123/unrelated.js"></script>', manifestUrl).length === 0,
    'loader detection ignores unrelated approved-host JavaScript',
  );
  check(
    versionHintsFromLive(
      '<!-- demigod-foot-cdn-loader v27 + events + foot v449 -->',
      'https://cdn.statically.io/gist/u/id/raw/demigod-foot-v449-1.js',
    ) === '449',
    'version hints read demigod-foot-vNNN basename / loader comment',
  );
  check(
    gistRawFallback(
      'https://cdn.statically.io/gist/Uuriko/3ff02b9e2c7a8720e136e9cb61aab508/raw/demigod-foot-v449-1.js',
    ) ===
      'https://gist.githubusercontent.com/Uuriko/3ff02b9e2c7a8720e136e9cb61aab508/raw/demigod-foot-v449-1.js',
    'statically gist URLs map to raw gist fallback',
  );
  check(isExecutableJavaScriptMime('application/javascript; charset=utf-8'), 'MIME accepts executable JavaScript');
  check(!isExecutableJavaScriptMime('text/plain'), 'MIME rejects text/plain');
  check(!isExecutableJavaScriptMime('application/octet-stream'), 'MIME rejects generic binary content');
  check(isCssMime('text/css; charset=utf-8'), 'MIME accepts CSS');
  check(!isCssMime('text/plain'), 'MIME rejects non-CSS text');
  check(
    headCssUrls(
      '<link href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@abc123/head-latest.css">' +
        '<link href="https://files.catbox.moe/abc123.css">',
    ).length === 2,
    'head CSS detection preserves duplicate approved loaders',
  );
  check(sha256Buf(Buffer.from('demigod')).length === 64, 'SHA-256 identity is complete');
  const combinedBlock = releaseMutationGuards({ leaseHeld: true, transportBlocked: true });
  check(
    combinedBlock.blockedByLease === true && combinedBlock.progressBlockedByLease === false,
    'transport outage stays primary while a held lease still blocks mutation',
  );
  check(
    /retryTrigger:\s*releaseTransportBlocked/.test(fs.readFileSync(new URL(import.meta.url), 'utf8')),
    'release recovery exposes an explicit retry trigger',
  );

  const lagClear = computePublishLag({
    prepareOnlyRelease: true,
    fullyShipped: true,
    diskVer: '818',
    liveVer: '802',
    at: '2026-07-24T03:00:00.000Z',
  });
  check(lagClear.lagging === false && lagClear.overdue === false, 'publish lag clears when fullyShipped');

  const lagFresh = computePublishLag({
    prepareOnlyRelease: true,
    fullyShipped: false,
    diskVer: '805',
    liveVer: '802',
    at: '2026-07-24T03:00:00.000Z',
    prev: { lagging: true, pair: '805->802', firstSeenAt: '2026-07-24T02:30:00.000Z' },
    thresholdHours: 6,
    thresholdVersions: 8,
  });
  check(
    lagFresh.lagging === true &&
      lagFresh.versionsAhead === 3 &&
      lagFresh.overdue === false &&
      lagFresh.firstSeenAt === '2026-07-24T02:30:00.000Z',
    'publish lag tracks age under thresholds without overdue',
  );

  const lagDebt = computePublishLag({
    prepareOnlyRelease: true,
    fullyShipped: false,
    diskVer: '818',
    liveVer: '802',
    at: '2026-07-24T10:00:00.000Z',
    prev: { lagging: true, pair: '818->802', firstSeenAt: '2026-07-23T20:00:00.000Z' },
    thresholdHours: 6,
    thresholdVersions: 8,
  });
  check(
    lagDebt.overdue === true && lagDebt.overdueByAge === true && lagDebt.overdueByVersions === true,
    'publish lag overdue by age and version delta',
  );

  const lagLedger = computePublishLag({
    prepareOnlyRelease: true,
    fullyShipped: false,
    diskVer: '810',
    liveVer: '802',
    at: '2026-07-24T12:00:00.000Z',
    ledgerLines: [
      { at: '2026-07-23T10:00:00.000Z', diskVer: '802', liveVer: '802', fullyShipped: true },
      { at: '2026-07-23T11:00:00.000Z', diskVer: '803', liveVer: '802', fullyShipped: false },
      { at: '2026-07-23T12:00:00.000Z', diskVer: '810', liveVer: '802', fullyShipped: false },
    ],
    thresholdHours: 1000,
    thresholdVersions: 100,
  });
  check(
    lagLedger.firstSeenAt === '2026-07-23T11:00:00.000Z',
    'publish lag bootstraps firstSeenAt from version ledger after last ship',
  );

  const sibOk = classifySiblingAssetDrift({
    diskAtlas: 'map-free Craigslist dg-dir-list No SVG map',
    liveAtlas: 'radiusMiles: 3 dg-atlas-map layers: { startups: true, venues: true }',
    diskMapJson: JSON.stringify({
      companies: Array.from({ length: 100 }, (_, i) => ({ name: 'c' + i, hiring: 'yes' })),
    }),
    liveMapJson: JSON.stringify({
      companies: Array.from({ length: 10 }, (_, i) => ({ name: 'c' + i })),
    }),
    diskAtlasSha: 'a',
    liveAtlasSha: 'b',
    diskMapSha: 'c',
    liveMapSha: 'd',
  });
  check(
    sibOk.intentional === true &&
      sibOk.atlas.status === 'intentional-redesign' &&
      sibOk.mapData.status === 'intentional-expand',
    'sibling drift classifies map-free atlas + expanded map-data as intentional',
  );
  const sibPrepared = classifySiblingAssetDrift({
    diskAtlasSha: 'disk-atlas',
    liveAtlasSha: 'live-atlas',
    diskMapSha: 'disk-map',
    liveMapSha: 'live-map',
    preparedBy: 'ship-prepare-test',
  });
  check(
    sibPrepared.intentional === true &&
      sibPrepared.atlas.status === 'prepared' &&
      sibPrepared.mapData.status === 'prepared' &&
      sibPrepared.preparedBy === 'ship-prepare-test',
    'sibling drift accepts a hash-matching ship-prepare receipt',
  );

  if (failures.length) {
    for (const label of failures) console.error(`FAIL ${label}`);
    console.error(`${failures.length} FAIL demigod-truth selftest`);
    process.exit(1);
  }
  console.log('ALL PASS demigod-truth selftest');
  process.exit(0);
}

function releaseMutationGuards({ leaseHeld, transportBlocked }) {
  return {
    // Transport can be the primary progress blocker without weakening the
    // independent release mutex. Callers must never infer write permission
    // from a network outage while another publisher still owns the lease.
    blockedByLease: Boolean(leaseHeld),
    progressBlockedByLease: Boolean(leaseHeld && !transportBlocked),
  };
}

/**
 * Track prepare-only disk≠live as aging *debt* (not an outage). Soft-ok forever
 * made multi-version lag invisible; this surfaces threshold breaches without
 * auto-shipping. Thresholds: DEMIGOD_PUBLISH_LAG_HOURS (default 6),
 * DEMIGOD_PUBLISH_LAG_VERSIONS (default 8).
 */
export function computePublishLag({
  prepareOnlyRelease,
  fullyShipped,
  diskVer,
  liveVer,
  at = new Date().toISOString(),
  prev = null,
  ledgerLines = null,
  thresholdHours = Number(process.env.DEMIGOD_PUBLISH_LAG_HOURS || 6),
  thresholdVersions = Number(process.env.DEMIGOD_PUBLISH_LAG_VERSIONS || 8),
} = {}) {
  const thrH = Number.isFinite(thresholdHours) && thresholdHours > 0 ? thresholdHours : 6;
  const thrV =
    Number.isFinite(thresholdVersions) && thresholdVersions > 0 ? thresholdVersions : 8;
  const d = Number(String(diskVer || '').replace(/^v/, ''));
  const l = Number(String(liveVer || '').replace(/^v/, ''));
  const versionsAhead =
    Number.isFinite(d) && Number.isFinite(l) ? Math.max(0, d - l) : 0;
  const pair = `${diskVer || '?'}->${liveVer || '?'}`;
  const lagging = Boolean(
    prepareOnlyRelease && !fullyShipped && versionsAhead > 0 && diskVer && liveVer,
  );

  if (!lagging) {
    return {
      schema: 'demigod.publish-lag/1',
      at,
      lagging: false,
      pair: null,
      diskVer: diskVer || null,
      liveVer: liveVer || null,
      versionsAhead: 0,
      firstSeenAt: null,
      ageHours: 0,
      thresholdHours: thrH,
      thresholdVersions: thrV,
      overdue: false,
      overdueByAge: false,
      overdueByVersions: false,
      note: 'no prepare-only version debt',
    };
  }

  let firstSeenAt = null;
  if (prev?.lagging && prev?.pair === pair && prev?.firstSeenAt) {
    firstSeenAt = prev.firstSeenAt;
  } else if (Array.isArray(ledgerLines)) {
    // Earliest continuous lag vs this live pin after last fullyShipped of that pin.
    let lastShipAt = null;
    for (const row of ledgerLines) {
      if (!row || typeof row !== 'object') continue;
      const lv = String(row.liveVer || '').replace(/^v/, '');
      const dv = String(row.diskVer || '').replace(/^v/, '');
      if (row.fullyShipped && lv === String(liveVer).replace(/^v/, '') && dv === lv) {
        lastShipAt = row.at || lastShipAt;
      }
    }
    for (const row of ledgerLines) {
      if (!row || typeof row !== 'object') continue;
      const lv = String(row.liveVer || '').replace(/^v/, '');
      const dv = String(row.diskVer || '').replace(/^v/, '');
      if (lv !== String(liveVer).replace(/^v/, '')) continue;
      if (!dv || !Number.isFinite(Number(dv)) || Number(dv) <= Number(lv)) continue;
      if (lastShipAt && row.at && row.at < lastShipAt) continue;
      firstSeenAt = row.at;
      break;
    }
  }
  if (!firstSeenAt) firstSeenAt = at;

  const ageMs = Math.max(0, Date.parse(at) - Date.parse(firstSeenAt));
  const ageHours = Math.round((ageMs / 3600000) * 10) / 10;
  const overdueByAge = ageHours >= thrH;
  const overdueByVersions = versionsAhead >= thrV;
  const overdue = overdueByAge || overdueByVersions;

  return {
    schema: 'demigod.publish-lag/1',
    at,
    lagging: true,
    pair,
    diskVer: String(diskVer),
    liveVer: String(liveVer),
    versionsAhead,
    firstSeenAt,
    ageHours,
    thresholdHours: thrH,
    thresholdVersions: thrV,
    overdue,
    overdueByAge,
    overdueByVersions,
    note: overdue
      ? 'publish lag DEBT — needs exact current-request publish authorization (not auto-ship)'
      : 'publish lag tracked — still under age/version thresholds',
  };
}

function loadPublishLagPrev(busy = BUSY) {
  try {
    return JSON.parse(fs.readFileSync(path.join(busy, 'publish-lag.json'), 'utf8'));
  } catch {
    return null;
  }
}

function loadLedgerRows(root = ROOT) {
  try {
    const text = fs.readFileSync(path.join(root, 'DEMIGOD-VERSION-LEDGER.jsonl'), 'utf8');
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function persistPublishLag(lag, busy = BUSY) {
  try {
    fs.mkdirSync(busy, { recursive: true });
    writeJsonAuto(path.join(busy, 'publish-lag.json'), lag);
  } catch {
    /* best-effort */
  }
}

/**
 * Classify startup-map / map-data identity lag: intentional staged product work
 * vs unexplained corruption. Used when prepare-only publish lag is already DEBT
 * so agents do not thrash "heal" sibling assets.
 */
export function classifySiblingAssetDrift({
  diskAtlas = '',
  liveAtlas = '',
  diskMapJson = '',
  liveMapJson = '',
  diskAtlasSha = null,
  liveAtlasSha = null,
  diskMapSha = null,
  liveMapSha = null,
  preparedBy = null,
} = {}) {
  const atlasMatch = Boolean(diskAtlasSha && liveAtlasSha && diskAtlasSha === liveAtlasSha);
  const mapMatch = Boolean(diskMapSha && liveMapSha && diskMapSha === liveMapSha);
  if (atlasMatch && mapMatch) {
    return {
      schema: 'demigod.sibling-drift/1',
      intentional: true,
      status: 'matched',
      atlas: { status: 'matched' },
      mapData: { status: 'matched' },
      summary: 'sibling assets match live/manifest',
    };
  }
  const prepared = String(preparedBy || '').startsWith('ship-prepare-');

  const diskMapFree =
    /\bmap-free\b|dg-dir-|Craigslist|No SVG map/i.test(diskAtlas) &&
    !/\bradiusMiles\b|\bdg-atlas-map\b/.test(diskAtlas);
  const liveFullAtlas =
    /\bradiusMiles\b|\bdg-atlas-map\b|\blayers:\s*\{[^}]*venues/i.test(liveAtlas);

  let diskCos = null;
  let liveCos = null;
  let diskHiring = null;
  let liveHiring = null;
  try {
    const d = diskMapJson ? JSON.parse(diskMapJson) : null;
    diskCos = Array.isArray(d?.companies) ? d.companies.length : null;
    diskHiring = Array.isArray(d?.companies)
      ? d.companies.filter((c) => c && c.hiring != null).length
      : null;
  } catch {
    /* ignore */
  }
  try {
    const l = liveMapJson ? JSON.parse(liveMapJson) : null;
    liveCos = Array.isArray(l?.companies) ? l.companies.length : null;
    liveHiring = Array.isArray(l?.companies)
      ? l.companies.filter((c) => c && c.hiring != null).length
      : null;
  } catch {
    /* ignore */
  }

  const atlas = atlasMatch
    ? { status: 'matched' }
    : prepared
      ? { status: 'prepared', note: `current disk hashes passed ${preparedBy}` }
      : {
        status: diskMapFree && liveFullAtlas ? 'intentional-redesign' : 'unexplained',
        diskBytes: diskAtlas ? Buffer.byteLength(diskAtlas) : null,
        liveBytes: liveAtlas ? Buffer.byteLength(liveAtlas) : null,
        note:
          diskMapFree && liveFullAtlas
            ? 'disk=map-free directory (dg-dir); live=SVG atlas+radius+venues'
            : 'atlas body differs without map-free redesign markers',
      };

  const mapExpanded =
    Number.isFinite(diskCos) &&
    Number.isFinite(liveCos) &&
    diskCos > liveCos * 2 &&
    (diskHiring || 0) > (liveHiring || 0);
  const mapData = mapMatch
    ? { status: 'matched' }
    : prepared
      ? { status: 'prepared', note: `current disk hashes passed ${preparedBy}` }
      : {
        status: mapExpanded ? 'intentional-expand' : 'unexplained',
        diskCompanies: diskCos,
        liveCompanies: liveCos,
        diskHiringLabeled: diskHiring,
        liveHiringLabeled: liveHiring,
        note: mapExpanded
          ? `disk companies ${diskCos} (hiring-labeled ${diskHiring}) vs live ${liveCos}`
          : 'map-data body differs without clear expansion signal',
      };

  const intentional =
    ['matched', 'prepared', 'intentional-redesign'].includes(atlas.status) &&
    ['matched', 'prepared', 'intentional-expand'].includes(mapData.status);

  const bits = [];
  if (atlas.status !== 'matched') bits.push(`atlas:${atlas.status}`);
  if (mapData.status !== 'matched') bits.push(`mapData:${mapData.status}`);

  return {
    schema: 'demigod.sibling-drift/1',
    intentional,
    status: intentional ? 'intentional-staged' : 'needs-review',
    preparedBy: prepared ? preparedBy : null,
    atlas,
    mapData,
    summary: bits.length
      ? bits.join(' · ')
      : 'sibling assets match live/manifest',
  };
}

function canonicalAssetUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

function assetId(canonicalUrl) {
  if (!canonicalUrl) return null;
  try {
    return path.posix.basename(new URL(canonicalUrl).pathname) || null;
  } catch {
    return null;
  }
}

function footLoaderUrls(html, manifestCdnUrl) {
  const source = String(html || '');
  const manifestCanonical = canonicalAssetUrl(manifestCdnUrl);
  return [...source.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => ({
      tag: match[0],
      // Historical Webflow pastes identify the loader with a comment rather
      // than an id. Limit the look-behind to the gap immediately before this
      // script so an unrelated approved-host asset is never counted as foot.
      precededByLoaderMarker: /<!--\s*demigod-foot-cdn-loader\b[^>]*-->\s*$/i.test(
        source.slice(Math.max(0, match.index - 240), match.index),
      ),
    }))
    .map(({ tag, precededByLoaderMarker }) => {
      const raw = (tag.match(FOOT_SCRIPT_SRC_RE) || [])[1] || null;
      const canonical = canonicalAssetUrl(raw);
      if (!canonical) return null;
      // Count canonical/stale foot loaders, but not unrelated scripts that
      // happen to share an approved CDN host. A stale GitHub loader retains
      // the foot-latest basename; hashed fallbacks retain the dedicated id or
      // match the attested manifest URL.
      const identified = /\bid=["']demigod-foot-cdn-loader["']/i.test(tag);
      const namedFoot = assetId(canonical)?.toLowerCase() === 'foot-latest.js';
      if (!identified && !precededByLoaderMarker && !namedFoot && canonical !== manifestCanonical) return null;
      return raw;
    })
    .filter(Boolean);
}

function headCssUrls(html) {
  return [
    ...String(html || '').matchAll(
      /https:\/\/(?:files\.catbox\.moe\/[a-z0-9]+|cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]+\/head-latest)\.css/gi,
    ),
  ].map((match) => match[0]);
}

function sha256Buf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function isExecutableJavaScriptMime(contentType) {
  return /^(?:application|text)\/(?:javascript|x-javascript|ecmascript)(?:\s*;|$)/i.test(
    String(contentType || '').trim(),
  );
}
function isCssMime(contentType) {
  return /^text\/css(?:\s*;|$)/i.test(String(contentType || '').trim());
}
function sha256File(file) {
  try {
    return sha256Buf(fs.readFileSync(file));
  } catch {
    return null;
  }
}
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}
function runNode(argv, timeout = 25000) {
  const r = spawnSync('node', argv, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { status: r.status ?? 1, out: ((r.stdout || '') + (r.stderr || '')).trim() };
}

async function fetchText(url, { timeoutMs = 22000 } = {}) {
  const force = process.env.DEMIGOD_TRUTH_NO_CACHE === '1' || process.argv.includes('--no-cache');
  return cachedFetchText(url, {
    ttlMs: Number(process.env.DEMIGOD_LIVE_CACHE_TTL_MS) || 15000,
    headers: { 'User-Agent': 'demigod-truth' },
    timeoutMs,
    bust: force,
  });
}

function errorText(error) {
  return [error?.cause?.code, error?.cause?.message, error?.message || error]
    .filter(Boolean)
    .join(': ');
}

/** Prefer version from URL basename (demigod-foot-v449-….js) or loader comment. */
function versionHintsFromLive(html, footUrl) {
  const fromUrl = (String(footUrl || '').match(/demigod-foot-v(\d+)/i) || [])[1] || null;
  const fromComment =
    (String(html || '').match(/demigod-foot-cdn-loader[^<]{0,80}foot\s+v(\d+)/i) || [])[1] || null;
  return fromUrl || fromComment || null;
}

/** When statically.io is slow, try the raw gist URL for the same path. */
function gistRawFallback(url) {
  try {
    const u = new URL(url);
    if (!/cdn\.statically\.io$/i.test(u.hostname)) return null;
    // /gist/User/id/raw/file.js → gist.githubusercontent.com/User/id/raw/file.js
    const m = u.pathname.match(/^\/gist\/([^/]+)\/([a-f0-9]+)\/raw\/(.+)$/i);
    if (!m) return null;
    return `https://gist.githubusercontent.com/${m[1]}/${m[2]}/raw/${m[3]}`;
  } catch {
    return null;
  }
}

async function main() {
  const footPath = path.join(ROOT, 'demigod-foot-core.js');
  const mapPath = path.join(ROOT, 'demigod-startup-atlas-web.js');
  const mapDataPath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  const run = beginRun('truth', {
    scope: [footPath, mapPath, mapDataPath, path.join(ROOT, 'demigod-head-styles.css'), path.join(ROOT, 'demigod-footer-lite.html')],
  });
  const headCssPath = path.join(ROOT, 'demigod-head-styles.css');
  const manPath = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
  const footerPath = path.join(ROOT, 'demigod-footer-lite.html');
  const releaseReceiptPath = path.join(BUSY, 'foot-cdn-publish-latest.json');
  const headMinPath = path.join(ROOT, 'demigod-head-minimal.html');
  const boardPath = path.join(ROOT, 'DEMIGOD-BOARD.json');
  const verifyPath = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');

  const footJs = readText(footPath);
  const diskSha = sha256File(footPath);
  const diskBytes = footJs ? Buffer.byteLength(footJs) : null;
  const headCss = readText(headCssPath);
  const headCssSha = sha256File(headCssPath);
  const headCssBytes = headCss ? Buffer.byteLength(headCss) : null;
  const mapSource = readText(mapPath);
  const mapDataSource = readText(mapDataPath);
  const mapSha = sha256File(mapPath);
  const mapBytes = mapSource ? Buffer.byteLength(mapSource) : null;
  const mapDataSha = sha256File(mapDataPath);
  const mapDataBytes = mapDataSource ? Buffer.byteLength(mapDataSource) : null;
  const diskInternalVer = (footJs.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null;
  const diskPublicVer =
    (footJs.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] || null;
  const diskVersionMarkersAgree = Boolean(
    diskInternalVer && diskPublicVer && diskInternalVer === diskPublicVer,
  );
  // A half-written core has no releasable identity. Never let fallback order
  // make one of two disagreeing markers look canonical.
  const diskVer = diskVersionMarkersAgree ? diskInternalVer : null;
  const man = readJson(manPath) || {};
  const footer = readText(footerPath);
  const headMin = readText(headMinPath);
  const board = readJson(boardPath) || {};
  const verify = readJson(verifyPath);
  const freeze = isFrozen();

  // Use the same identified-loader contract for disk and live. Falling back
  // to the first approved-host `.js` can misidentify an unrelated asset as
  // the foot and makes loader count disagree with the URL we attest.
  const footerCdn = footLoaderUrls(footer, man.cdnUrl)[0] || null;
  const headCssDiskUrls = headCssUrls(headMin);
  const headCssDiskUrl = headCssDiskUrls[0] || null;

  const syn = runNode(['--check', footPath]);
  const syntaxOk = syn.status === 0;
  const boardRun = runNode(['demigod-verify-board-honesty.mjs']);
  const boardOk = boardRun.status === 0;

  // Lock — read busy file first (no spawn); CLI only if missing
  let lock = {
    held: false,
    owner: null,
    expiresAt: null,
    free: true,
    ownerAlive: null,
    state: 'free',
  };
  {
    const lj = readJson(path.join(BUSY, 'foot-lock.json'));
    if (lj?.owner || lj?.expiresAt) {
      const exp = lj.expiresAt && Date.parse(lj.expiresAt) < Date.now();
      let ownerAlive = null;
      if (
        !exp &&
        lj.pidScope === 'lease-owner' &&
        Number.isSafeInteger(lj.pid) &&
        lj.pid > 0
      ) {
        try {
          process.kill(lj.pid, 0);
          ownerAlive = true;
        } catch {
          ownerAlive = false;
        }
      }
      lock = {
        held: !exp && Boolean(lj.owner),
        free: exp || !lj.owner,
        owner: exp ? null : lj.owner || null,
        expiresAt: lj.expiresAt || null,
        baseSha: lj.baseSha || null,
        baseShaMatch: Boolean(lj.baseSha && diskSha && lj.baseSha === diskSha),
        footVer: lj.footVer || null,
        ownerAlive,
        // PID liveness is diagnostic only. The tokenized lease remains held
        // until release/expiry, but ship consumers must not describe an
        // exited owner as an active publisher or attempt an unsafe takeover.
        state: exp || !lj.owner
          ? 'free'
          : ownerAlive === false
            ? 'held-owner-exited'
            : ownerAlive === true
              ? 'held-owner-active'
              : 'held-owner-unknown',
      };
    } else {
      const st = runNode(['demigod-foot-lock.mjs', 'status'], 8000);
      try {
        const j = JSON.parse(st.out.slice(st.out.indexOf('{')));
        lock = {
          held: Boolean(j?.locked),
          free: !j?.locked,
          owner: j?.lock?.owner || null,
          expiresAt: j?.lock?.expiresAt || null,
          baseSha: j?.lock?.baseSha || null,
          baseShaMatch: j?.baseShaMatch ?? null,
          footVer: j?.footVer || null,
          ownerAlive: j?.ownerAlive ?? null,
          state: !j?.locked
            ? 'free'
            : j?.ownerAlive === false
              ? 'held-owner-exited'
              : j?.ownerAlive === true
                ? 'held-owner-active'
                : 'held-owner-unknown',
        };
      } catch {
        /* */
      }
    }
  }

  // Live HTML
  let liveHtml;
  try {
    liveHtml = await fetchText(LIVE + '/');
  } catch (e) {
    liveHtml = { ok: false, status: 0, text: '', err: errorText(e), sha256: null, bytes: 0 };
  }
  const liveFootUrls = footLoaderUrls(liveHtml.text, man.cdnUrl);
  const liveFootUrl = liveFootUrls[0] || null;
  const liveFootLoaderCount = liveFootUrls.length;
  const liveCssUrls = headCssUrls(liveHtml.text);
  const liveCssUrl = liveCssUrls[0] || null;
  const liveCssLoaderCount = liveCssUrls.length;

  let liveJs = null;
  let liveVer = null;
  let liveJsSha = null;
  if (liveFootUrl) {
    const candidates = [liveFootUrl, gistRawFallback(liveFootUrl)].filter(Boolean);
    let lastErr = null;
    for (const candidate of candidates) {
      try {
        // Foot payloads are ~200KB+; short timeouts false-fail green on slow CDNs.
        liveJs = await fetchText(candidate, { timeoutMs: 90000 });
        if (!liveJs?.ok) {
          lastErr = liveJs?.err || `HTTP ${liveJs?.status || '?'}`;
          continue;
        }
        liveVer = (liveJs.text.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null;
        liveJsSha = liveJs.sha256;
        if (liveVer || liveJsSha) break;
      } catch (e) {
        lastErr = errorText(e);
        liveJs = { ok: false, err: lastErr };
      }
    }
    if (!liveVer) {
      liveVer = versionHintsFromLive(liveHtml.text, liveFootUrl);
    }
    if (!liveJs?.ok && lastErr && !liveJs?.err) liveJs = { ok: false, err: lastErr };
  }

  const manifestUrl = canonicalAssetUrl(man.cdnUrl);
  const canonicalLiveFootUrl = canonicalAssetUrl(liveFootUrl);
  const manId = assetId(manifestUrl);
  const liveId = assetId(canonicalLiveFootUrl);
  const diskMatchesManifest = Boolean(diskSha && man.sha256 && diskSha === man.sha256);
  const manifestBytesMatchDisk = Boolean(
    diskBytes != null && Number.isSafeInteger(man.bytes) && man.bytes === diskBytes,
  );
  const manifestVersionMatchesDisk = Boolean(
    diskVer && man.version && String(man.version).replace(/^v/i, '') === String(diskVer),
  );
  const manifestAttested = man.ok === true;
  const manifestVersionMarkersAgree = Boolean(
    man.version != null &&
    man.footVer != null &&
    String(man.version).replace(/^v/i, '') === String(man.footVer).replace(/^v/i, ''),
  );
  const manifestMap = man.assets?.startupMap || {};
  const manifestMapData = man.assets?.mapData || {};
  const manifestHeadCss = man.assets?.headCss || {};
  const manifestMapMatchesDisk = Boolean(
    manifestMap.sha256 === mapSha && manifestMap.bytes === mapBytes && canonicalAssetUrl(manifestMap.url),
  );
  const manifestMapDataMatchesDisk = Boolean(
    manifestMapData.sha256 === mapDataSha &&
      manifestMapData.bytes === mapDataBytes &&
      canonicalAssetUrl(manifestMapData.url),
  );
  const manifestHeadCssMatchesDisk = Boolean(
    manifestHeadCss.sha256 === headCssSha &&
      manifestHeadCss.bytes === headCssBytes &&
      canonicalAssetUrl(manifestHeadCss.url),
  );
  const canonicalManifestHeadCssUrl = canonicalAssetUrl(manifestHeadCss.url);
  const diskHeadCssMatchesManifest = Boolean(
    canonicalManifestHeadCssUrl &&
      canonicalAssetUrl(headCssDiskUrl) === canonicalManifestHeadCssUrl,
  );
  const liveHeadCssMatchesManifest = Boolean(
    canonicalManifestHeadCssUrl &&
      canonicalAssetUrl(liveCssUrl) === canonicalManifestHeadCssUrl,
  );
  const [liveMap, liveMapData, liveHeadCss] = await Promise.all([
    manifestMap.url ? fetchText(manifestMap.url, { timeoutMs: 30000 }) : null,
    manifestMapData.url ? fetchText(manifestMapData.url, { timeoutMs: 30000 }) : null,
    liveCssUrl ? fetchText(liveCssUrl, { timeoutMs: 30000 }) : null,
  ]);
  const liveMapMatchesDisk = Boolean(
    liveMap?.ok && liveMap.sha256 === mapSha && isExecutableJavaScriptMime(liveMap.contentType),
  );
  const liveMapDataMatchesDisk = Boolean(
    liveMapData?.ok &&
      liveMapData.sha256 === mapDataSha &&
      /^application\/json(?:;|$)/i.test(liveMapData.contentType || ''),
  );
  const liveHeadCssMatchesDisk = Boolean(
    liveHeadCss?.ok &&
      liveHeadCss.sha256 === headCssSha &&
      liveHeadCss.bytes === headCssBytes &&
      isCssMime(liveHeadCss.contentType),
  );
  const rawReleaseReceipt = readJson(releaseReceiptPath);
  const releaseReceiptMatchesDisk = Boolean(
    rawReleaseReceipt &&
    rawReleaseReceipt.sourceSha256 === diskSha &&
    rawReleaseReceipt.sourceBytes === diskBytes &&
    String(rawReleaseReceipt.sourceVersion || '').replace(/^v/i, '') === String(diskVer || ''),
  );
  // A publisher receipt is diagnostic evidence, never release attestation.
  // Ignore receipts for an older core so truth cannot blame current drift on a
  // transport failure that happened against different source bytes.
  const releaseAttempt = rawReleaseReceipt
    ? {
        at: rawReleaseReceipt.at || null,
        relevantToDisk: releaseReceiptMatchesDisk,
        ok: releaseReceiptMatchesDisk ? rawReleaseReceipt.ok === true : null,
        failureKind: releaseReceiptMatchesDisk && rawReleaseReceipt.ok !== true
          ? rawReleaseReceipt.failureKind || 'unknown'
          : null,
        retryable: releaseReceiptMatchesDisk && rawReleaseReceipt.ok !== true
          ? rawReleaseReceipt.retryable === true
          : null,
        blockedTransports:
          releaseReceiptMatchesDisk && rawReleaseReceipt.ok !== true && Array.isArray(rawReleaseReceipt.blockedTransports)
            ? [...new Set(rawReleaseReceipt.blockedTransports.map((value) => String(value)).filter(Boolean))]
            : [],
        nextState: releaseReceiptMatchesDisk && rawReleaseReceipt.ok !== true
          ? rawReleaseReceipt.nextState || null
          : null,
        canonicalArtifactsChanged: releaseReceiptMatchesDisk
          ? rawReleaseReceipt.canonicalArtifactsChanged === true
          : null,
        uploadAttempts: releaseReceiptMatchesDisk && Array.isArray(rawReleaseReceipt.uploadAttempts)
          ? rawReleaseReceipt.uploadAttempts.map(({ host, ok: attemptOk, detail }) => ({
              host: String(host || 'unknown'),
              ok: attemptOk === true,
              detail: String(detail || '').slice(0, 240),
            }))
          : [],
      }
    : null;
  const liveMatchesManifest = Boolean(
    manifestUrl && canonicalLiveFootUrl && manifestUrl === canonicalLiveFootUrl,
  );
  const diskEqualsLiveVer = Boolean(diskVer && liveVer && diskVer === liveVer);
  const liveBodyMatchesDisk = Boolean(diskSha && liveJsSha && diskSha === liveJsSha);
  // Raw gist/statically sometimes serves text/plain; if body SHA matches disk
  // foot and carries __dgFootVer, treat as executable foot (not a MIME lie).
  const liveFootMimeOk = Boolean(
    liveJs?.ok &&
      (isExecutableJavaScriptMime(liveJs.contentType) ||
        (liveBodyMatchesDisk && /__dgFootVer=['"]\d+['"]/.test(liveJs.text || ''))),
  );
  const releaseArtifactsMatchDisk = Boolean(
    diskVersionMarkersAgree &&
      diskMatchesManifest &&
      manifestBytesMatchDisk &&
      manifestVersionMatchesDisk &&
      manifestAttested &&
      manifestVersionMarkersAgree &&
      manifestMapMatchesDisk &&
      manifestMapDataMatchesDisk &&
      manifestHeadCssMatchesDisk &&
      diskHeadCssMatchesManifest &&
      headCssDiskUrls.length === 1,
  );
  const releaseIdentityDelta = {
    version: manifestVersionMatchesDisk
      ? null
      : { expected: diskVer, staged: man.version == null ? null : String(man.version).replace(/^v/i, '') },
    sha256: diskMatchesManifest
      ? null
      : { expected: diskSha, staged: man.sha256 || null },
    bytes: manifestBytesMatchDisk
      ? null
      : { expected: diskBytes, staged: Number.isSafeInteger(man.bytes) ? man.bytes : null },
    headCss:
      manifestHeadCssMatchesDisk && diskHeadCssMatchesManifest
        ? null
        : {
            expected: { sha256: headCssSha, bytes: headCssBytes, url: headCssDiskUrl },
            staged: {
              sha256: manifestHeadCss.sha256 || null,
              bytes: Number.isSafeInteger(manifestHeadCss.bytes) ? manifestHeadCss.bytes : null,
              url: manifestHeadCss.url || null,
            },
          },
  };
  // Distinguish an unattended drift from a coordinated publish already in
  // progress. This is diagnostic only: neither state is release attestation.
  const releaseOwnerMatchesDisk = Boolean(
    lock.held && lock.baseShaMatch === true && lock.baseSha === diskSha,
  );
  const releaseOwnerActive = Boolean(releaseOwnerMatchesDisk && lock.ownerAlive === true);
  const releaseOwnerExited = Boolean(releaseOwnerMatchesDisk && lock.ownerAlive === false);
  const releaseBlockedByLease = Boolean(lock.held && !releaseArtifactsMatchDisk);
  const releaseBlockingOwnerExited = Boolean(releaseBlockedByLease && lock.ownerAlive === false);
  const releaseBlockingOwnerUnknown = Boolean(releaseBlockedByLease && lock.ownerAlive == null);
  const releaseBlockingLeaseStaleCore = Boolean(releaseBlockedByLease && !releaseOwnerMatchesDisk);
  const releaseRetryAtMs = releaseBlockedByLease ? Date.parse(lock.expiresAt || '') : NaN;
  const releaseRetryInMs = Number.isFinite(releaseRetryAtMs)
    ? Math.max(0, releaseRetryAtMs - Date.now())
    : null;
  // A current-source publish receipt is stronger diagnostic evidence than PID
  // liveness. The lease remains enforced, but waiting on it cannot repair an
  // upload whose transports are all unavailable.
  const releaseTransportBlocked = Boolean(
    !releaseArtifactsMatchDisk &&
      releaseAttempt?.relevantToDisk === true &&
      releaseAttempt?.ok === false &&
      releaseAttempt?.failureKind === 'release-transport-unavailable',
  );
  const releasePrimaryBlocker = releaseArtifactsMatchDisk
    ? null
    : releaseTransportBlocked
      ? 'release-transport'
      : releaseBlockedByLease
        ? 'release-lease'
        : 'release-artifact-drift';
  const releaseGuards = releaseMutationGuards({
    leaseHeld: releaseBlockedByLease,
    transportBlocked: releaseTransportBlocked,
  });
  const releaseState = releaseArtifactsMatchDisk
    ? 'artifacts-ready'
    : releaseTransportBlocked
      ? 'cdn-transport-unavailable'
      : releaseOwnerActive
      ? 'publisher-active'
      : releaseBlockingOwnerExited && releaseBlockingLeaseStaleCore
          ? 'publisher-exited-stale-core-lease-held'
        : releaseOwnerExited
          ? 'publisher-exited-lease-held'
          : releaseBlockedByLease && releaseBlockingLeaseStaleCore
            ? 'publisher-stale-core-lease-held'
            : releaseOwnerMatchesDisk
              ? 'publisher-lease-held-liveness-unknown'
              : 'publish-required';
  const releaseRecovery = releaseArtifactsMatchDisk
    ? null
    : {
        state: releaseState,
        command: 'node demigod-foot-cdn-publish.mjs',
        then: 'node demigod-cm6-paste-publish.mjs',
        guarded: true,
        gatedBy: ['publish-freeze', 'foot-lock', 'live-attestation'],
        blockedByLease: releaseGuards.blockedByLease,
        progressBlockedByLease: releaseGuards.progressBlockedByLease,
        staleForCore: releaseBlockingLeaseStaleCore,
        takeoverAllowed: false,
        retryAfter: releaseBlockedByLease ? lock.expiresAt : null,
        retryInMs: releaseRetryInMs,
        retryTrigger: releaseTransportBlocked
          ? 'release-transport-available'
          : releaseBlockedByLease
            ? 'release-lease-expired-or-released'
            : 'release-artifacts-published',
      };

  // Intentional drift: freeze ON + disk ahead of live
  let driftExpected = false;
  if (diskVer && liveVer && diskVer !== liveVer && freeze.on && Number(diskVer) > Number(liveVer)) {
    driftExpected = true;
  }
  // Publish-gated prepare-only: current request did not authorize CDN/Webflow publish.
  // Disk may lead live/manifest on foot + sibling assets; ship prepare stays green, truth
  // must not hard-fail on identity lag alone (fullyShipped still false).
  const publishAuthorized = process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH === '1';
  const prepareOnlyRelease = Boolean(
    !publishAuthorized &&
      syntaxOk &&
      diskVersionMarkersAgree &&
      liveHtml.ok &&
      liveFootLoaderCount === 1 &&
      liveFootMimeOk &&
      boardOk &&
      diskVer &&
      liveVer,
  );
  // Backward-compat alias: sibling-only lag when foot already matches live/manifest.
  const prepareOnlySiblingAssets =
    prepareOnlyRelease &&
    diskEqualsLiveVer &&
    liveBodyMatchesDisk &&
    liveMatchesManifest &&
    diskMatchesManifest &&
    manifestBytesMatchDisk &&
    manifestVersionMatchesDisk &&
    manifestAttested;

  const roles = board.roles || [];
  const signal = board.signal || {
    realRoles: roles.filter((r) => !r.sample).length,
    sampleRoles: roles.filter((r) => r.sample).length,
    realReceipts: (board.receipts || []).filter((r) => !r.sample).length,
  };

  const me = process.env.DG_LOCK_OWNER || process.env.USER || 'agent';
  // Hard mutex: free lock means you must claim first (cannot edit until lease held)
  const canEditFoot =
    process.env.DG_FOOT_LOCK_SKIP === '1' ||
    Boolean(lock.held && lock.owner === me && process.env.DG_LOCK_TOKEN);

  const fullyShipped = Boolean(
    syntaxOk &&
      diskVersionMarkersAgree &&
      liveHtml.ok &&
      liveFootLoaderCount === 1 &&
      liveCssLoaderCount === 1 &&
      headCssDiskUrls.length === 1 &&
      diskEqualsLiveVer &&
      liveBodyMatchesDisk &&
      liveFootMimeOk &&
      liveMatchesManifest &&
      boardOk &&
      diskMatchesManifest &&
      manifestBytesMatchDisk &&
      manifestVersionMatchesDisk &&
      manifestAttested &&
      manifestVersionMarkersAgree &&
      manifestMapMatchesDisk &&
      manifestMapDataMatchesDisk &&
      liveMapMatchesDisk &&
      liveMapDataMatchesDisk &&
      manifestHeadCssMatchesDisk &&
      diskHeadCssMatchesManifest &&
      liveHeadCssMatchesManifest &&
      liveHeadCssMatchesDisk
  );

  const issues = [];
  const ok = [];
  if (!syntaxOk) issues.push('foot syntax fail');
  else ok.push(`disk foot v${diskInternalVer || diskPublicVer || '?'} syntax ok`);
  if (diskVersionMarkersAgree) ok.push(`disk foot version markers agree v${diskVer}`);
  else issues.push(
    `disk foot version markers disagree (__dgFootVer=${diskInternalVer || '?'} / dgFootVersion=${diskPublicVer || '?'})`,
  );
  if (liveHtml.ok) ok.push(`live HTML ${liveHtml.status}`);
  else issues.push(`live HTML fail ${liveHtml.err || liveHtml.status}`);
  if (liveHtml.ok && liveFootLoaderCount === 1) ok.push('live foot loader count == 1');
  else if (liveHtml.ok) issues.push(`live foot loader count ${liveFootLoaderCount} != 1`);
  if (liveHtml.ok && liveCssLoaderCount === 1) ok.push('live head CSS loader count == 1');
  else if (liveHtml.ok) issues.push(`live head CSS loader count ${liveCssLoaderCount} != 1`);
  if (headCssDiskUrls.length === 1) ok.push('disk head CSS loader count == 1');
  else issues.push(`disk head CSS loader count ${headCssDiskUrls.length} != 1`);
  if (liveFootUrl && liveVer) ok.push(`live foot ${liveFootUrl} v${liveVer}`);
  else if (liveHtml.ok && liveFootUrl && !liveVer) {
    issues.push(
      `live foot CDN found but version unreadable (${liveJs?.err || 'no __dgFootVer / hint'})`,
    );
  } else if (liveHtml.ok) issues.push('no live foot CDN in HTML');
  if (diskEqualsLiveVer) ok.push(`disk==live ver v${diskVer}`);
  else if (diskVer && liveVer) {
    const msg = `version drift disk v${diskVer} != live v${liveVer}`;
    if (driftExpected) ok.push(`${msg} (freeze ON — intentional)`);
    else if (prepareOnlyRelease) ok.push(`${msg} (prepare-only — publish unauthorized)`);
    else issues.push(msg);
  }
  if (liveBodyMatchesDisk) ok.push('live CDN body sha == disk');
  else if (liveJsSha && diskSha) {
    if (driftExpected) ok.push('CDN body ≠ disk (expected while freeze/disk-ahead)');
    else if (prepareOnlyRelease) ok.push('live CDN body sha ≠ disk foot (prepare-only — publish unauthorized)');
    else issues.push('live CDN body sha ≠ disk foot');
  }
  if (diskMatchesManifest) ok.push('manifest sha == disk foot');
  else if (prepareOnlyRelease && man.sha256 && diskSha) {
    ok.push('manifest sha ≠ disk foot (prepare-only — publish unauthorized)');
  } else if (man.sha256 && diskSha) issues.push('manifest sha ≠ disk foot (publish CDN before CM6)');
  else issues.push('manifest sha missing (publish CDN before CM6)');
  if (manifestBytesMatchDisk) ok.push(`manifest bytes == disk foot (${diskBytes})`);
  else if (prepareOnlyRelease && Number.isSafeInteger(man.bytes) && diskBytes != null) {
    ok.push(`manifest bytes ${man.bytes} ≠ disk foot ${diskBytes} (prepare-only — publish unauthorized)`);
  } else if (Number.isSafeInteger(man.bytes) && diskBytes != null) {
    issues.push(`manifest bytes ${man.bytes} ≠ disk foot ${diskBytes}`);
  } else {
    issues.push('manifest bytes missing or invalid (publish CDN before CM6)');
  }
  if (manifestVersionMatchesDisk) ok.push(`manifest version == disk v${diskVer}`);
  else if (prepareOnlyRelease) {
    ok.push(`manifest version v${man.version || '?'} ≠ disk v${diskVer || '?'} (prepare-only — publish unauthorized)`);
  } else issues.push(`manifest version v${man.version || '?'} ≠ disk v${diskVer || '?'}`);
  if (manifestAttested) ok.push('manifest release attested');
  else issues.push('manifest release is not positively attested');
  if (manifestVersionMarkersAgree) ok.push('manifest version markers agree');
  else issues.push(`manifest version markers disagree (${man.version || '?'} / ${man.footVer || '?'})`);
  if (manifestMapMatchesDisk) ok.push('manifest startup-map identity == disk');
  else if (prepareOnlyRelease) {
    ok.push('manifest startup-map identity ≠ disk (prepare-only — publish unauthorized)');
  } else issues.push('manifest startup-map identity missing or stale');
  if (manifestMapDataMatchesDisk) ok.push('manifest map-data identity == disk');
  else if (prepareOnlyRelease) {
    ok.push('manifest map-data identity ≠ disk (prepare-only — publish unauthorized)');
  } else issues.push('manifest map-data identity missing or stale');
  if (liveMapMatchesDisk) ok.push('live startup-map body == disk with executable MIME');
  else if (manifestMap.url && prepareOnlyRelease) {
    ok.push('live startup-map body ≠ disk (prepare-only — publish unauthorized)');
  } else if (manifestMap.url) issues.push('live startup-map body or MIME does not match disk');
  if (liveMapDataMatchesDisk) ok.push('live map-data body == disk with JSON MIME');
  else if (manifestMapData.url && prepareOnlyRelease) {
    ok.push('live map-data body ≠ disk (prepare-only — publish unauthorized)');
  } else if (manifestMapData.url) issues.push('live map-data body or MIME does not match disk');
  if (manifestHeadCssMatchesDisk) ok.push('manifest head-CSS identity == disk');
  else if (prepareOnlyRelease) {
    ok.push('manifest head-CSS identity ≠ disk (prepare-only — publish unauthorized)');
  } else issues.push('manifest head-CSS identity missing or stale');
  if (diskHeadCssMatchesManifest) ok.push('disk head CSS URL == manifest');
  else if (prepareOnlyRelease) {
    ok.push('disk head CSS URL ≠ manifest (prepare-only — publish unauthorized)');
  } else issues.push('disk head CSS URL ≠ manifest');
  if (liveHeadCssMatchesManifest) ok.push('live head CSS URL == manifest');
  else if (prepareOnlyRelease) {
    ok.push('live head CSS URL ≠ manifest (prepare-only — publish unauthorized)');
  } else issues.push('live head CSS URL ≠ manifest');
  if (liveHeadCssMatchesDisk) {
    ok.push(`live head CSS body == disk with CSS MIME (${liveHeadCss.contentType})`);
  } else if (liveCssUrl && prepareOnlyRelease) {
    ok.push('live head CSS body ≠ disk (prepare-only — publish unauthorized)');
  } else if (liveCssUrl) issues.push('live head CSS body or MIME does not match disk');
  if (liveFootMimeOk) ok.push(`live CDN MIME executable (${liveJs.contentType})`);
  else if (liveJs?.ok) issues.push(`live CDN MIME is not executable JavaScript (${liveJs.contentType || 'missing'})`);
  if (liveMatchesManifest) ok.push('live foot URL == manifest CDN URL');
  else if (liveHtml.ok && man.cdnUrl && prepareOnlyRelease) {
    ok.push('live foot URL ≠ manifest CDN URL (prepare-only — publish unauthorized)');
  } else if (liveHtml.ok && man.cdnUrl) issues.push('live foot URL ≠ manifest CDN URL');
  if (footerCdn && manifestUrl && canonicalAssetUrl(footerCdn) === manifestUrl) {
    ok.push('disk footer URL == manifest CDN URL');
  } else if (man.cdnUrl && prepareOnlyRelease) {
    ok.push('disk footer URL ≠ manifest CDN URL (prepare-only — publish unauthorized)');
  } else if (man.cdnUrl) {
    issues.push('disk footer URL ≠ manifest CDN URL (publish CDN before CM6)');
  }
  if (boardOk) ok.push('board honesty pass');
  else issues.push('board honesty FAIL');
  if (freeze.on) ok.push(`freeze ON: ${freeze.why || ''}`);
  else ok.push('freeze OFF');
  if (lock.held) ok.push(`foot-lock HELD by ${lock.owner}`);
  else ok.push('foot-lock free');

  // pass: no hard issues (driftExpected not an issue)
  let pass = issues.length === 0;
  if (requireMatch && !diskEqualsLiveVer) {
    pass = false;
    if (!issues.some((i) => i.includes('version drift'))) {
      issues.push(`require-match: disk v${diskVer} live v${liveVer}`);
    }
  }
  if (strict && !fullyShipped) pass = false;

  const facts = {
    schemaVersion: 1,
    id: 'truth',
    at: new Date().toISOString(),
    pass,
    requireMatch,
    strict,
    driftExpected,
    fullyShipped,
    liveUrl: LIVE,
    foot: {
      path: footPath,
      ver: diskVer,
      internalVer: diskInternalVer,
      publicVer: diskPublicVer,
      versionMarkersAgree: diskVersionMarkersAgree,
      sha256: diskSha,
      sha12: diskSha?.slice(0, 12) || null,
      bytes: diskBytes,
      syntaxOk,
    },
    headCss: {
      path: headCssPath,
      sha256: headCssSha,
      bytes: headCssBytes,
      diskUrl: headCssDiskUrl,
      diskLoaderCount: headCssDiskUrls.length,
      diskUrlMatchesManifest: diskHeadCssMatchesManifest,
      manifestUrl: manifestHeadCss.url || null,
      manifestMatchesDisk: manifestHeadCssMatchesDisk,
      liveUrl: liveCssUrl,
      liveLoaderCount: liveCssLoaderCount,
      liveUrlMatchesManifest: liveHeadCssMatchesManifest,
      liveSha256: liveHeadCss?.sha256 || null,
      liveBytes: liveHeadCss?.bytes ?? null,
      liveContentType: liveHeadCss?.contentType || null,
      liveMatchesDisk: liveHeadCssMatchesDisk,
    },
    manifest: {
      version: man.version || null,
      cdnUrl: man.cdnUrl || null,
      cdnId: manId,
      sha256: man.sha256 || null,
      diskMatchesManifest,
      bytes: Number.isSafeInteger(man.bytes) ? man.bytes : null,
      bytesMatchDisk: manifestBytesMatchDisk,
      versionMatchesDisk: manifestVersionMatchesDisk,
      attested: manifestAttested,
      versionMarkersAgree: manifestVersionMarkersAgree,
      assets: {
        startupMap: { ...manifestMap, matchesDisk: manifestMapMatchesDisk, liveMatchesDisk: liveMapMatchesDisk },
        mapData: { ...manifestMapData, matchesDisk: manifestMapDataMatchesDisk, liveMatchesDisk: liveMapDataMatchesDisk },
        headCss: {
          ...manifestHeadCss,
          matchesDisk: manifestHeadCssMatchesDisk,
          liveMatchesDisk: liveHeadCssMatchesDisk,
        },
      },
    },
    release: {
      state: releaseState,
      artifactsMatchDisk: releaseArtifactsMatchDisk,
      identityDelta: releaseIdentityDelta,
      ownerMatchesDisk: releaseOwnerMatchesDisk,
      ownerActive: releaseOwnerActive,
      ownerExited: releaseOwnerExited,
      blockedByLease: releaseBlockedByLease,
      blockingOwnerExited: releaseBlockingOwnerExited,
      blockingOwnerUnknown: releaseBlockingOwnerUnknown,
      blockingLeaseStaleCore: releaseBlockingLeaseStaleCore,
      transportBlocked: releaseTransportBlocked,
      primaryBlocker: releasePrimaryBlocker,
      owner: releaseBlockedByLease ? lock.owner : null,
      retryAfter: releaseBlockedByLease ? lock.expiresAt : null,
      retryInMs: releaseRetryInMs,
      requiresPublish: !releaseArtifactsMatchDisk,
      liveAttested: fullyShipped,
      recovery: releaseRecovery,
    },
    releaseAttempt,
    liveFootLoaders: {
      count: liveFootLoaderCount,
      urls: liveFootUrls,
      single: liveFootLoaderCount === 1,
    },
    footer: {
      pointsCdn: footerCdn,
      matchesManifest: Boolean(manifestUrl && canonicalAssetUrl(footerCdn) === manifestUrl),
    },
    live: {
      reachable: Boolean(liveHtml.ok),
      htmlOk: liveHtml.ok,
      htmlStatus: liveHtml.status,
      htmlError: liveHtml.ok ? null : liveHtml.err || `HTTP ${liveHtml.status || 0}`,
      footUrl: liveFootUrl,
      footVer: liveVer,
      cssUrl: liveCssUrl,
      cssLoaderCount: liveCssLoaderCount,
      cssSha256: liveHeadCss?.sha256 || null,
      cssBytes: liveHeadCss?.bytes ?? null,
      cssContentType: liveHeadCss?.contentType || null,
      cssMatchesDisk: liveHeadCssMatchesDisk,
      footSha256: liveJsSha,
      footBytes: liveJs?.bytes ?? null,
      footContentType: liveJs?.contentType || null,
      footMimeOk: liveFootMimeOk,
    },
    match: {
      diskEqualsLiveVer,
      liveBodyMatchesDisk,
      liveFootMimeOk,
      liveMatchesManifest,
      liveHeadCssMatchesManifest,
      liveHeadCssMatchesDisk,
      fullyShipped,
    },
    freeze: { on: freeze.on, why: freeze.why || null, env: freeze.env, file: freeze.file },
    board: {
      honestyOk: boardOk,
      roles: roles.length,
      signal,
    },
    lock,
    gates: {
      verifySourcePass: verify?.pass ?? null,
      verifySourceAt: verify?.at ?? null,
    },
    claims: {
      'live==disk': fullyShipped,
      board_honest: boardOk,
      can_edit_foot: Boolean(canEditFoot),
    },
    ok,
    issues,
    summaryLine: null,
  };

  facts.prepareOnlyRelease = prepareOnlyRelease;
  facts.prepareOnlySiblingAssets = prepareOnlySiblingAssets;

  // Sibling asset drift classification (startup-map + map-data) — intentional vs unexplained.
  // A prepare receipt is an identity attestation: exact scoped hashes, not wall time, expire it.
  const siblingPrepare = refuseIfStale('ship-prepare', { maxAgeSec: 0 });
  const siblingDrift = classifySiblingAssetDrift({
    diskAtlas: mapSource || '',
    liveAtlas: liveMap?.ok ? liveMap.text || liveMap.body || '' : '',
    diskMapJson: mapDataSource || '',
    liveMapJson: liveMapData?.ok ? liveMapData.text || liveMapData.body || '' : '',
    diskAtlasSha: mapSha,
    liveAtlasSha: liveMap?.ok ? liveMap.sha256 : null,
    diskMapSha: mapDataSha,
    liveMapSha: liveMapData?.ok ? liveMapData.sha256 : null,
    preparedBy: siblingPrepare.green ? siblingPrepare.runId : null,
  });
  facts.siblingDrift = siblingDrift;
  try {
    writeJsonAuto(path.join(BUSY, 'sibling-drift.json'), { ...siblingDrift, at: facts.at });
  } catch {
    /* best-effort */
  }
  if (!liveMapMatchesDisk || !liveMapDataMatchesDisk) {
    ok.push(
      siblingDrift.intentional
        ? `sibling asset drift intentional: ${siblingDrift.summary}`
        : `sibling asset drift NEEDS REVIEW: ${siblingDrift.summary}`,
    );
  }

  // Aging prepare-only debt (soft — never forces publish; surfaces threshold breach).
  const publishLag = computePublishLag({
    prepareOnlyRelease,
    fullyShipped,
    diskVer,
    liveVer,
    at: facts.at || new Date().toISOString(),
    prev: loadPublishLagPrev(BUSY),
    ledgerLines: loadLedgerRows(ROOT),
  });
  persistPublishLag(publishLag, BUSY);
  facts.publishLag = publishLag;
  if (publishLag.lagging) {
    const lagMsg = `publish lag disk v${publishLag.diskVer} live v${publishLag.liveVer} · +${publishLag.versionsAhead} ver · ${publishLag.ageHours}h (debt after ${publishLag.thresholdHours}h or +${publishLag.thresholdVersions} ver)`;
    const sibBit = siblingDrift.intentional
      ? ' · siblings intentional-staged'
      : siblingDrift.status === 'needs-review'
        ? ' · siblings NEED REVIEW'
        : '';
    if (publishLag.overdue) ok.push(`${lagMsg} · DEBT — needs current-request publish auth${sibBit}`);
    else ok.push(`${lagMsg} · tracked${sibBit}`);
  }

  const prepareBit =
    !fullyShipped && prepareOnlyRelease
      ? prepareOnlySiblingAssets
        ? ' prepareOnlyAssets'
        : ' prepareOnly'
      : '';
  const lagBit = publishLag.overdue ? ' lagDebt' : publishLag.lagging ? ' lagTracked' : '';
  facts.summaryLine = `TRUTH ${pass ? 'PASS' : 'FAIL'} disk=v${diskVer} live=v${liveVer || '?'} freeze=${freeze.on ? 'ON' : 'OFF'} lock=${lock.held ? lock.owner : 'free'} board=${boardOk ? 'ok' : 'FAIL'} shipped=${fullyShipped}${driftExpected ? ' driftExpected' : ''}${prepareBit}${lagBit}`;

  fs.mkdirSync(BUSY, { recursive: true });
  writeJsonAuto(path.join(BUSY, 'truth.json'), facts);

  const md = [
    `# Demigod TRUTH ${facts.at}`,
    facts.summaryLine,
    '',
    ...ok.map((o) => `- ✓ ${o}`),
    ...issues.map((i) => `- ✗ ${i}`),
    '',
    `JSON: ${path.join(BUSY, 'truth.json')}`,
  ].join('\n');
  fs.writeFileSync(path.join(BUSY, 'truth.md'), md + '\n');

  facts.evidence = sealRun(
    addArtifact(run, 'truth.json', path.join(BUSY, 'truth.json')),
    { pass, exit: pass ? 0 : 1, summary: facts.summaryLine, ttlSec: 3600 },
    { freeze: facts.freeze, lock: facts.lock },
  );
  facts.evidenceRunId = facts.evidence.runId;
  facts.evidenceFresh = true;
  writeJsonAuto(path.join(BUSY, 'truth.json'), facts);
  try {
    facts.ledgerLine = appendFromTruth(facts);
  } catch (e) {
    facts.ledgerError = String(e.message || e);
  }

  if (asJson) {
    const pretty = process.env.DEMIGOD_JSON_PRETTY === '1';
    console.log(pretty ? JSON.stringify(facts, null, 2) : JSON.stringify(facts));
  } else if (!quiet) {
    console.log(`# truth ${pass ? 'PASS' : 'FAIL'} · disk v${diskVer || '?'} · live v${liveVer || '?'}`);
    for (const o of ok) console.log(`  ✓ ${o}`);
    for (const i of issues) console.log(`  ✗ ${i}`);
    console.log(facts.summaryLine);
    console.log(`report: ${path.join(BUSY, 'truth.json')}`);
  }

  process.exit(pass ? 0 : 1);
}

if (selftest) runSelftest();

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
