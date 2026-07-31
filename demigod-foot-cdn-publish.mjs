#!/usr/bin/env node
/**
 * demigod-foot-cdn-publish — upload the site asset bundle → CDN, then patch canonical loaders
 *
 *   node demigod-foot-cdn-publish.mjs [--check|--selftest]
 *
 * Uses one immutable jsDelivr commit so the foot, map assets, and head CSS stay together.
 * Verifies exact remote bytes + MIME for all four assets before mutating canonical artifacts.
 * Asserts publish freeze OFF (or DEMIGOD_FORCE_PUBLISH=1). Never writes a partial/dead release URL.
 * After: cm6-paste footer → truth.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import WebSocket from 'ws';
import { ROOT } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const args = new Set(process.argv.slice(2));
if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: node demigod-foot-cdn-publish.mjs [--check|--selftest]

Publishes the canonical site bundle to an attested immutable CDN commit,
then atomically updates the footer loader and DEMIGOD-FOOT-CDN.json. Requires freeze OFF and the
active foot release lock. --check and --selftest are read-only and require neither.`);
  process.exit(0);
}
const SELFTEST = args.delete('--selftest');
const CHECK_ONLY = args.delete('--check');
if (args.size) {
  console.error(`unknown argument(s): ${[...args].join(', ')}`);
  process.exit(2);
}

const SRC = path.join(ROOT, 'demigod-foot-core.js');
const MAP_SRC = path.join(ROOT, 'demigod-startup-atlas-web.js');
const MAP_DATA_SRC = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const HEAD_CSS_SRC = path.join(ROOT, 'demigod-head-styles.css');
// Public machine-readable roles feed. OPTIONAL on purpose: this file publishes the whole site, so
// a missing or unreadable feed must degrade to "not published this run", never take the ship down.
const ROLES_FEED_SRC = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const HEAD = path.join(ROOT, 'demigod-head-minimal.html');
const HEAD_OUT = path.join(ROOT, 'DEMIGOD-HEAD-CDN.json');
const FOOT = path.join(ROOT, 'demigod-footer-lite.html');
const LOADER = path.join(ROOT, 'demigod-footer-loader.html');
const OUT = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const RELEASE_RECEIPT = '/tmp/dg-busy/foot-cdn-publish-latest.json';
const HEAD_RECEIPT = '/tmp/dg-busy/head-css-cdn.json';
const NO_JS_FALLBACK = `<noscript id="dg-path-noscript">
  <section aria-labelledby="dg-nojs-title" style="max-width:40rem;margin:2rem auto;padding:1rem 1.25rem;font:500 1rem/1.5 system-ui,sans-serif;color:#0A0A0A;background:#F5F0E6;border:1px solid rgba(201,168,76,.45);border-radius:8px">
    <h1 id="dg-nojs-title" style="font:700 1.35rem/1.25 system-ui,sans-serif;margin:0 0 .75rem">Demigod — tech-matched SF startup talent</h1>
    <p>Demigod helps San Francisco startups hire curated technical talent through structured briefs, direct human review, and transparent 10% success pricing. Candidates can join the curated network without a placement fee.</p>
    <nav aria-label="No-JavaScript links" style="display:flex;flex-wrap:wrap;gap:.5rem 1rem">
      <a href="/">Home</a>
      <a href="/startups">Browse verified startup hiring</a>
      <a href="mailto:potter@trydemigod.com?subject=Hiring%20with%20Demigod">Hire talent by email</a>
      <a href="mailto:potter@trydemigod.com?subject=Joining%20the%20Demigod%20talent%20network">Join the talent network by email</a>
    </nav>
    <p>JavaScript is unavailable, so interactive forms are replaced with direct email links.</p>
  </section>
</noscript>`;
const sourceJs = fs.readFileSync(SRC, 'utf8');
const mapJs = fs.readFileSync(MAP_SRC, 'utf8');
const mapData = fs.readFileSync(MAP_DATA_SRC, 'utf8');
const headCss = fs.readFileSync(HEAD_CSS_SRC, 'utf8');
const rolesFeed = (() => {
  try { return fs.readFileSync(ROLES_FEED_SRC, 'utf8'); } catch { return null; }
})();
const sourceVer = (sourceJs.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1];
const sourcePublicVer = (sourceJs.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1];
const sourceSha = crypto.createHash('sha256').update(sourceJs).digest('hex');
const sourceBytes = Buffer.byteLength(sourceJs);
const mapSha = crypto.createHash('sha256').update(mapJs).digest('hex');
const mapBytes = Buffer.byteLength(mapJs);
const mapDataSha = crypto.createHash('sha256').update(mapData).digest('hex');
const mapDataBytes = Buffer.byteLength(mapData);
const headCssSha = crypto.createHash('sha256').update(headCss).digest('hex');
const headCssMd5 = crypto.createHash('md5').update(headCss).digest('hex');
const headCssBytes = Buffer.byteLength(headCss);
const rolesFeedSha = rolesFeed ? crypto.createHash('sha256').update(rolesFeed).digest('hex') : null;
const rolesFeedBytes = rolesFeed ? Buffer.byteLength(rolesFeed) : 0;
const uploadAttempts = [];

function recordUploadAttempt(host, ok, detail = '') {
  uploadAttempts.push({ host, ok: Boolean(ok), detail: String(detail || '').slice(0, 240) });
}

function classifyUploadFailure(attempts) {
  const details = attempts.map((attempt) => attempt.detail.toLowerCase());
  const transportUnavailable = (detail) =>
    /not authenticated|authentication required|could not resolve host|temporary failure in name resolution|failed to connect|could not connect|couldn't connect|connection refused|network is unreachable|timed? out|cdp target creation failed/.test(detail);
  // Only call the release transport-blocked when every attempted route failed
  // for a transport/auth reason. A mixed result (for example DNS on one route
  // but a remote attestation mismatch on another) needs inspection and must
  // not be hidden behind the retry-when-network-returns state.
  return details.length > 0 && details.every(transportUnavailable)
    ? 'release-transport-unavailable'
    : 'upload-unavailable';
}

// Keep the CLI contract explicit: callers in ship/control/dashboard must never
// interpret an unattested upload as a successful release.
function publishExitCode(result) {
  return result && result.ok === true ? 0 : 1;
}

function lockFailureRetryable(lockResult) {
  return lockResult?.error === 'foot_locked_by_other';
}

function formatUploadFailure(kind, attempts) {
  const hosts = [...new Set(attempts.map((attempt) => attempt.host).filter(Boolean))];
  const attempted = hosts.length ? ` attempted=${hosts.join(',')}` : '';
  return `upload failed: ${kind}${attempted}; canonical loader and manifest preserved`;
}

function uploadFailureRecovery(kind, attempts) {
  const blockedTransports = [...new Set(attempts
    .filter((attempt) => attempt.ok !== true)
    .map((attempt) => attempt.host)
    .filter(Boolean))];
  return {
    retryable: kind === 'release-transport-unavailable',
    blockedTransports,
    nextState: kind === 'release-transport-unavailable'
      ? 'retry-when-release-transport-is-available'
      : 'inspect-upload-attestation',
    retryTrigger: kind === 'release-transport-unavailable'
      ? 'release-transport-available'
      : 'upload-attestation-reviewed',
  };
}

function currentReleaseLeaseIdentity() {
  try {
    const lock = JSON.parse(fs.readFileSync('/tmp/dg-busy/foot-lock.json', 'utf8'));
    return {
      baseSha: typeof lock?.baseSha === 'string' ? lock.baseSha : null,
      footVer: lock?.footVer == null ? null : String(lock.footVer).replace(/^v/i, ''),
    };
  } catch {
    return { baseSha: null, footVer: null };
  }
}

function releaseLockRecovery(lockResult, now = Date.now(), leaseIdentity = currentReleaseLeaseIdentity()) {
  const expiresAt = lockResult?.expiresAt || null;
  const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
  const retryInMs = Number.isFinite(expiresMs) ? Math.max(0, expiresMs - now) : null;
  const sourceMismatch = [];
  if (leaseIdentity?.footVer && leaseIdentity.footVer !== sourceVer) sourceMismatch.push('version');
  if (leaseIdentity?.baseSha && leaseIdentity.baseSha !== sourceSha) sourceMismatch.push('sha256');
  const staleForSource = lockResult?.error === 'foot_locked_by_other' && sourceMismatch.length > 0;
  return {
    state: staleForSource
      ? 'wait-for-stale-core-release-lease'
      : lockResult?.error === 'foot_locked_by_other'
        ? 'wait-for-release-lease'
      : 'claim-release-lease',
    owner: lockResult?.owner || null,
    retryAfter: Number.isFinite(expiresMs) ? new Date(expiresMs).toISOString() : null,
    retryInMs,
    staleForSource,
    sourceMismatch,
    leaseSource: {
      version: leaseIdentity?.footVer || null,
      sha256: leaseIdentity?.baseSha || null,
    },
    requestedSource: { version: sourceVer || null, sha256: sourceSha },
    command: 'node demigod-foot-cdn-publish.mjs',
    then: 'node demigod-cm6-paste-publish.mjs',
    guarded: true,
    gatedBy: ['publish-freeze', 'foot-lock', 'live-attestation'],
    takeoverAllowed: false,
  };
}

function isExecutableJavaScriptMime(contentType) {
  const mime = String(contentType || '').split(';', 1)[0].trim().toLowerCase();
  return /^(?:application|text)\/(?:javascript|ecmascript|x-javascript)$/.test(mime);
}

function isCssMime(contentType) {
  return String(contentType || '').split(';', 1)[0].trim().toLowerCase() === 'text/css';
}

// temp+rename so concurrent verify:source never reads a torn footer-lite/loader/manifest
// mid-ship (same class as gate OUTPUT atomicity: verify-source/board-honesty c20/c21).
function writeFileAtomic(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(temp, contents, { mode: 0o644 });
    fs.renameSync(temp, file);
  } finally {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {
      /* preserve original failure */
    }
  }
}

function headWithCdn(html, cdnUrl) {
  if (!/^https:\/\/cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]+\/head-latest\.css$/i.test(cdnUrl)) {
    throw new Error(`unapproved head CSS URL: ${cdnUrl}`);
  }
  const old = /https:\/\/(?:files\.catbox\.moe\/[a-z0-9]+|cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@[a-f0-9]+\/head-latest)\.css/gi;
  const matches = String(html || '').match(old) || [];
  if (matches.length !== 1) throw new Error(`expected one canonical head CSS URL, found ${matches.length}`);
  return html.replace(old, cdnUrl);
}

function writeReleaseReceipt(payload) {
  writeFileAtomic(RELEASE_RECEIPT, JSON.stringify({
    schema: 'demigod.foot-cdn-publish/1',
    at: new Date().toISOString(),
    sourceVersion: sourceVer || null,
    sourceSha256: sourceSha,
    sourceBytes,
    ...payload,
  }, null, 2) + '\n');
}

function assertCanonicalSourceUnchanged() {
  const current = [
    [SRC, sourceSha],
    [MAP_SRC, mapSha],
    [MAP_DATA_SRC, mapDataSha],
    [HEAD_CSS_SRC, headCssSha],
    ...(rolesFeed ? [[ROLES_FEED_SRC, rolesFeedSha]] : []),
  ];
  if (current.some(([file, expected]) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== expected)) {
    throw new Error(
      'canonical release source changed during CDN publish; refusing to write a stale footer or manifest',
    );
  }
}

function footLoaderUrls(html) {
  return [...String(html || '').matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => {
      if (/\bid=["']demigod-foot-cdn-loader["']/i.test(tag)) return true;
      const src = (tag.match(/\bsrc=["'](https:\/\/[^"']+)["']/i) || [])[1];
      return Boolean(src && /\/foot-latest\.js(?:[?#].*)?$/i.test(src));
    })
    .map((tag) => (tag.match(/\bsrc=["'](https:\/\/[^"']+)["']/i) || [])[1])
    .filter(Boolean);
}

function releaseAlignment() {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {
    // The individual checks below deliberately fail closed.
  }
  const footer = fs.existsSync(FOOT) ? fs.readFileSync(FOOT, 'utf8') : '';
  // Permanent jsDelivr releases use foot-latest.js. Verified fallback hosts
  // use content-addressed filenames, so retain the dedicated loader id as the
  // identity signal instead of falsely reporting a missing footer loader.
  const loaderUrls = footLoaderUrls(footer);
  const canonical = (raw) => {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:') return null;
      url.search = '';
      url.hash = '';
      return url.href;
    } catch {
      return null;
    }
  };
  const checks = {
    sourceVersionMarkersAgree: Boolean(sourceVer && sourcePublicVer && sourceVer === sourcePublicVer),
    manifestAttested: manifest?.ok === true,
    manifestVersionMarkersAgree: Boolean(
      manifest?.version != null &&
      manifest?.footVer != null &&
      String(manifest.version).replace(/^v/i, '') ===
        String(manifest.footVer).replace(/^v/i, ''),
    ),
    manifestVersionMatchesSource: String(manifest?.version || '').replace(/^v/i, '') === sourceVer,
    manifestShaMatchesSource: manifest?.sha256 === sourceSha,
    manifestBytesMatchSource: manifest?.bytes === sourceBytes,
    footerHasOneCanonicalLoader: loaderUrls.length === 1,
    footerMatchesManifest: loaderUrls.length === 1 && canonical(loaderUrls[0]) === canonical(manifest?.cdnUrl),
  };
  const manifestVersion = manifest?.version == null
    ? null
    : String(manifest.version).replace(/^v/i, '');
  const manifestBytes = Number.isSafeInteger(manifest?.bytes) ? manifest.bytes : null;
  const identityDelta = {
    version: checks.manifestVersionMatchesSource
      ? null
      : { expected: sourceVer || null, staged: manifestVersion },
    sha256: checks.manifestShaMatchesSource
      ? null
      : { expected: sourceSha, staged: manifest?.sha256 || null },
    bytes: checks.manifestBytesMatchSource
      ? null
      : { expected: sourceBytes, staged: manifestBytes },
  };
  const sourceIdentityDrift = [
    'manifestVersionMatchesSource',
    'manifestShaMatchesSource',
    'manifestBytesMatchSource',
  ].filter((name) => !checks[name]);
  const structuralDrift = Object.entries(checks)
    .filter(([name, ok]) => !ok && !sourceIdentityDrift.includes(name))
    .map(([name]) => name);
  const recovery = {
    state: sourceIdentityDrift.length
      ? 'publish-canonical-foot'
      : structuralDrift.length
        ? 'repair-release-artifacts'
        : 'release-aligned',
    command: sourceIdentityDrift.length ? 'node demigod-foot-cdn-publish.mjs' : null,
    then: sourceIdentityDrift.length ? 'node demigod-cm6-paste-publish.mjs' : null,
    guarded: sourceIdentityDrift.length > 0,
    gatedBy: sourceIdentityDrift.length
      ? ['publish-freeze', 'foot-lock', 'live-attestation']
      : [],
    sourceIdentityDrift,
    structuralDrift,
  };
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    drift: Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name),
    source: { version: sourceVer || null, sha256: sourceSha, bytes: sourceBytes },
    manifest: {
      version: manifestVersion,
      footVer: manifest?.footVer == null
        ? null
        : String(manifest.footVer).replace(/^v/i, ''),
      sha256: manifest?.sha256 || null,
      bytes: manifestBytes,
      cdnUrl: canonical(manifest?.cdnUrl),
    },
    identityDelta,
    recovery,
    footerLoaderUrls: loaderUrls.map(canonical).filter(Boolean),
  };
}

function sameVersionContentCollision(manifest) {
  const manifestVersion = String(manifest?.version || '').replace(/^v/i, '');
  const manifestFootVersion = String(manifest?.footVer || manifest?.version || '').replace(/^v/i, '');
  return Boolean(
    manifest?.sha256 && sourceVer && manifestVersion === sourceVer &&
    manifestFootVersion === sourceVer && manifest.sha256 !== sourceSha
  );
}

if (CHECK_ONLY) {
  const result = releaseAlignment();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (SELFTEST) {
  const failures = [];
  const checkSelf = (condition, label) => {
    if (condition) console.log('ok', label);
    else failures.push(label);
  };
  checkSelf(Boolean(sourceVer && sourcePublicVer && sourceVer === sourcePublicVer), 'canonical version markers agree');
  checkSelf(sourceJs.length > 40000 && /dg-foot-v\d+-core/.test(sourceJs), 'canonical source has foot-core identity');
  checkSelf(mapJs.includes("demigod.sf-startup-map/3"), 'startup map script expects the current data schema');
  checkSelf(JSON.parse(mapData).schema === 'demigod.sf-startup-map/3', 'startup map data uses the current schema');
  checkSelf(isExecutableJavaScriptMime('application/javascript; charset=utf-8'), 'accepts executable JavaScript MIME');
  checkSelf(!isExecutableJavaScriptMime('text/plain'), 'rejects text/plain MIME');
  checkSelf(!isExecutableJavaScriptMime('application/octet-stream'), 'rejects generic binary MIME');
  checkSelf(isCssMime('text/css; charset=utf-8'), 'accepts CSS MIME');
  checkSelf(!isCssMime('text/plain'), 'rejects non-CSS MIME');
  checkSelf(sourceSha.length === 64, 'computes canonical SHA-256');
  checkSelf(Number.isSafeInteger(sourceBytes) && sourceBytes > 40000, 'computes canonical UTF-8 byte count');
  checkSelf(headCssSha.length === 64 && headCssBytes > 10000, 'computes canonical head CSS identity');
  checkSelf(
    !rolesFeed || JSON.parse(rolesFeed).schema === 'demigod.roles-feed/8',
    'roles feed, when present, uses the current schema',
  );
  checkSelf(
    NO_JS_FALLBACK.includes('<noscript id="dg-path-noscript">') &&
      NO_JS_FALLBACK.includes('Browse verified startup hiring') &&
      (NO_JS_FALLBACK.match(/mailto:potter@trydemigod\.com\?subject=/g) || []).length === 2,
    'generated footer keeps a native no-JavaScript fallback',
  );
  checkSelf(
    headWithCdn(
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@123abc/head-latest.css">',
      'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@456def/head-latest.css',
    ).includes('@456def/head-latest.css'),
    'patches exactly one approved immutable head CSS URL',
  );
  checkSelf(RELEASE_RECEIPT.startsWith('/tmp/dg-busy/'), 'failure receipt stays outside canonical release artifacts');
  checkSelf(
    footLoaderUrls('<script id="demigod-foot-cdn-loader" src="https://files.catbox.moe/abc123.js"></script>')[0] ===
      'https://files.catbox.moe/abc123.js',
    'recognizes an identified hashed fallback loader',
  );
  checkSelf(
    footLoaderUrls('<script src="https://cdn.jsdelivr.net/gh/org/repo@sha/foot-latest.js?v=408"></script>').length === 1,
    'recognizes the canonical foot-latest loader without an id',
  );
  checkSelf(
    footLoaderUrls('<script src="https://cdn.jsdelivr.net/gh/org/repo@sha/unrelated.js"></script>').length === 0,
    'ignores unrelated scripts on an approved CDN host',
  );
  const alignment = releaseAlignment();
  checkSelf(Array.isArray(alignment.drift), 'read-only alignment check exposes concrete drift');
  checkSelf(
    Object.hasOwn(alignment.checks, 'manifestVersionMarkersAgree') &&
      alignment.checks.manifestVersionMarkersAgree ===
        Boolean(alignment.manifest.version && alignment.manifest.footVer &&
          alignment.manifest.version === alignment.manifest.footVer),
    'read-only alignment check rejects split-brain manifest version markers',
  );
  checkSelf(alignment.source.sha256 === sourceSha, 'read-only alignment check uses canonical source identity');
  checkSelf(
    alignment.identityDelta && Object.hasOwn(alignment.identityDelta, 'version') &&
      Object.hasOwn(alignment.identityDelta, 'sha256') && Object.hasOwn(alignment.identityDelta, 'bytes'),
    'read-only alignment check exposes expected-versus-staged identity',
  );
  checkSelf(
    alignment.recovery?.state === (alignment.ok ? 'release-aligned' : 'publish-canonical-foot') &&
      Array.isArray(alignment.recovery?.sourceIdentityDrift) &&
      Array.isArray(alignment.recovery?.structuralDrift),
    'read-only alignment check exposes classified recovery without mutating artifacts',
  );
  checkSelf(
    alignment.ok || (
      alignment.recovery?.guarded === true &&
      alignment.recovery?.gatedBy?.join(',') === 'publish-freeze,foot-lock,live-attestation'
    ),
    'source identity recovery preserves every release mutation gate',
  );
  checkSelf(classifyUploadFailure([
    { detail: 'GitHub CLI is not authenticated' },
    { detail: 'curl: (6) Could not resolve host: catbox.moe' },
  ]) === 'release-transport-unavailable', 'classifies combined auth and network blockage');
  checkSelf(classifyUploadFailure([
    { detail: 'GitHub CLI is not authenticated' },
  ]) === 'release-transport-unavailable', 'classifies auth-only transport blockage');
  checkSelf(classifyUploadFailure([
    { detail: 'curl: (7) Failed to connect to 127.0.0.1 port 9223' },
  ]) === 'release-transport-unavailable', 'classifies network-only transport blockage');
  checkSelf(classifyUploadFailure([
    { detail: 'curl: (6) Temporary failure in name resolution' },
    { detail: 'curl: (7) Could not connect to server: Connection refused' },
  ]) === 'release-transport-unavailable', 'classifies common DNS and connection-refused transport failures');
  checkSelf(classifyUploadFailure([
    { detail: 'remote asset failed attestation' },
  ]) === 'upload-unavailable', 'preserves generic upload failure classification');
  checkSelf(classifyUploadFailure([
    { detail: 'curl: (6) Could not resolve host: catbox.moe' },
    { detail: 'remote asset failed attestation' },
  ]) === 'upload-unavailable', 'mixed transport and integrity failures require inspection');
  checkSelf(classifyUploadFailure([]) === 'upload-unavailable', 'empty attempt evidence fails closed');
  checkSelf(publishExitCode(null) === 1, 'failed upload returns a non-zero CLI status');
  checkSelf(publishExitCode({ ok: false }) === 1, 'unattested upload returns a non-zero CLI status');
  checkSelf(publishExitCode({ ok: true }) === 0, 'attested upload returns a zero CLI status');
  checkSelf(
    lockFailureRetryable({ error: 'foot_locked_by_other' }) === true,
    'foreign release lease is retryable after its bounded lease window',
  );
  checkSelf(
    lockFailureRetryable({ error: 'foot_lock_required' }) === false,
    'missing release lease is not mislabeled as retryable',
  );
  checkSelf(
    formatUploadFailure('release-transport-unavailable', [
      { host: 'jsdelivr-github' },
      { host: 'catbox' },
      { host: 'catbox' },
    ]) ===
      'upload failed: release-transport-unavailable attempted=jsdelivr-github,catbox; canonical loader and manifest preserved',
    'failure summary exposes classification and deduplicated transports',
  );
  const recovery = uploadFailureRecovery('release-transport-unavailable', [
    { host: 'catbox', ok: false },
    { host: 'catbox', ok: false },
    { host: 'gist-github', ok: false },
  ]);
  checkSelf(recovery.retryable === true, 'transport failure receipt is explicitly retryable');
  checkSelf(
    recovery.retryTrigger === 'release-transport-available',
    'transport failure receipt names the external retry trigger',
  );
  checkSelf(
    recovery.blockedTransports.join(',') === 'catbox,gist-github',
    'transport failure receipt deduplicates blocked transports',
  );
  const leaseRecovery = releaseLockRecovery({
    error: 'foot_locked_by_other', owner: 'publisher-a', expiresAt: '2030-01-01T00:00:10.000Z',
  }, Date.parse('2030-01-01T00:00:00.000Z'), { baseSha: sourceSha, footVer: sourceVer });
  checkSelf(leaseRecovery.state === 'wait-for-release-lease', 'foreign release lease has an explicit wait state');
  checkSelf(leaseRecovery.retryInMs === 10000, 'foreign release lease exposes a bounded retry delay');
  checkSelf(leaseRecovery.takeoverAllowed === false, 'foreign release lease never implies an unsafe takeover');
  const staleLeaseRecovery = releaseLockRecovery({
    error: 'foot_locked_by_other', owner: 'publisher-old', expiresAt: '2030-01-01T00:00:10.000Z',
  }, Date.parse('2030-01-01T00:00:00.000Z'), { baseSha: '0'.repeat(64), footVer: '1' });
  checkSelf(
    staleLeaseRecovery.state === 'wait-for-stale-core-release-lease' &&
      staleLeaseRecovery.staleForSource === true &&
      staleLeaseRecovery.sourceMismatch.join(',') === 'version,sha256',
    'foreign lease pinned to an older core explains identity drift without permitting takeover',
  );
  const rewrittenLeaseRecovery = releaseLockRecovery({
    error: 'foot_locked_by_other', owner: 'publisher-rewritten', expiresAt: '2030-01-01T00:00:10.000Z',
  }, Date.parse('2030-01-01T00:00:00.000Z'), { baseSha: '0'.repeat(64), footVer: sourceVer });
  checkSelf(
    rewrittenLeaseRecovery.staleForSource === true && rewrittenLeaseRecovery.sourceMismatch.join(',') === 'sha256',
    'same-version rewritten source is diagnosed as SHA drift',
  );
  checkSelf(
    sameVersionContentCollision({ version: sourceVer, footVer: sourceVer, sha256: '0'.repeat(64) }),
    'same-version rewritten source is refused before upload',
  );
  checkSelf(
    !sameVersionContentCollision({ version: String(Number(sourceVer) - 1), footVer: String(Number(sourceVer) - 1), sha256: '0'.repeat(64) }),
    'new source version may replace older release bytes',
  );
  if (failures.length) {
    console.error('FAIL', failures);
    process.exit(1);
  }
  console.log('ALL PASS demigod-foot-cdn-publish selftest');
  process.exit(0);
}

assertNotFrozen('foot-cdn-publish');
const releaseLock = assertCanWriteFoot({ label: 'foot-cdn-publish', soft: true });
if (!releaseLock.ok) {
  // Preserve a machine-readable coordination receipt. Previously the lock
  // helper exited the process directly, so truth/cycle callers saw stale CDN
  // drift but could not distinguish "publisher is busy" from a missing lock.
  writeReleaseReceipt({
    ok: false,
    failureKind: releaseLock.error || 'release-lock-unavailable',
    canonicalArtifactsChanged: false,
    retryable: lockFailureRetryable(releaseLock),
    releaseLock: {
      owner: releaseLock.owner || null,
      expiresAt: releaseLock.expiresAt || null,
    },
    recovery: releaseLockRecovery(releaseLock),
    message: 'Canonical release artifacts were preserved while the foot release lock was unavailable.',
  });
  console.error(JSON.stringify(releaseLock, null, 2));
  process.exit(1);
}

if (!sourceVer || !sourcePublicVer || sourceVer !== sourcePublicVer) {
  console.error(
    `source version markers disagree: __dgFootVer=${sourceVer || 'missing'} ` +
      `dgFootVersion=${sourcePublicVer || 'missing'}`,
  );
  process.exit(1);
}

let stagedManifest = null;
try { stagedManifest = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
if (sameVersionContentCollision(stagedManifest)) {
  console.error(`refusing same-version content rewrite: v${sourceVer} already attests different bytes; bump all foot version markers`);
  process.exit(3);
}

const check = spawnSync('node', ['--check', SRC], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr || check.stdout);
  process.exit(1);
}

function curlUpload(url, extra = []) {
  const r = spawnSync(
    'curl',
    [
      '-sS', '--fail-with-body', '--max-time', '120',
      '-F', 'reqtype=fileupload', ...extra,
      '-F', `fileToUpload=@${SRC};type=application/javascript`,
      url,
    ],
    { encoding: 'utf8' },
  );
  return {
    body: (r.stdout || '').trim(),
    error: r.status === 0 ? '' : (r.stderr || `curl exited ${r.status}`).trim(),
    status: r.status,
  };
}

async function cdpCall(ws, method, params = {}, timeout = 30000) {
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      reject(new Error(`CDP timeout ${method}`));
    }, timeout);
    const onMessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== id) return;
      clearTimeout(timer);
      ws.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/** Browser-network fallback for sandboxes where shell DNS is unavailable. */
async function cdpCatboxUpload() {
  const cdp = process.env.CDP_URL || 'http://127.0.0.1:9223';
  let ws;
  let targetId;
  try {
    const create = spawnSync('curl', ['-sS', '-X', 'PUT', `${cdp}/json/new?${encodeURIComponent('https://catbox.moe/')}`], { encoding: 'utf8', timeout: 8000 });
    if (create.status !== 0) throw new Error((create.stderr || 'CDP target creation failed').trim());
    const created = JSON.parse(create.stdout);
    targetId = created.id;
    ws = new WebSocket(created.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    await cdpCall(ws, 'Runtime.enable');
    await cdpCall(ws, 'Page.enable');
    for (let i = 0; i < 30; i++) {
      const state = await cdpCall(ws, 'Runtime.evaluate', {
        expression: 'document.readyState', returnByValue: true,
      });
      if (state.result?.value === 'complete') break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const result = await cdpCall(ws, 'Runtime.evaluate', {
      expression: `(async () => {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', new Blob([${JSON.stringify(sourceJs)}], {type:'application/javascript'}), ${JSON.stringify(`foot-v${sourceVer}.js`)});
        const response = await fetch('/user/api.php', {method:'POST', body:form});
        const url = (await response.text()).trim();
        if (!response.ok || !/^https:\/\/files\.catbox\.moe\/.+\.js$/.test(url)) return {status:response.status, url};
        const asset = await fetch(url + '?v=' + Date.now(), {cache:'no-store'});
        return {status:response.status, url, assetStatus:asset.status, contentType:asset.headers.get('content-type') || '', liveJs:await asset.text()};
      })()`,
      awaitPromise: true,
      returnByValue: true,
    }, 120000);
    const value = result.result?.value || {};
    return value.status >= 200 && value.status < 300 ? value : null;
  } catch (error) {
    recordUploadAttempt('catbox-cdp', false, error.message || error);
    console.error('catbox CDP fallback failed:', error.message || error);
    return null;
  } finally {
    try { ws?.close(); } catch { /* best effort */ }
    if (targetId) {
      spawnSync('curl', ['-sS', `${cdp}/json/close/${targetId}`], { encoding: 'utf8', timeout: 5000 });
    }
  }
}

async function fetchOk(cdnUrl) {
  try {
    const separator = cdnUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${cdnUrl}${separator}v=${Date.now()}`, { cache: 'no-store' });
    const liveJs = await response.text();
    const remoteVer = (liveJs.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1];
    const remotePublicVer = (liveJs.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1];
    const contentType = response.headers.get('content-type') || '';
    const liveSha = crypto.createHash('sha256').update(liveJs).digest('hex');
    const liveBytes = Buffer.byteLength(liveJs);
    const ok =
      response.ok &&
      liveJs.length > 40000 &&
      /dg-foot-v\d+-core/.test(liveJs) &&
      liveJs.includes('function hero') &&
      (liveJs.includes('#dg-bar') || liveJs.includes('__dgFootVer')) &&
      remoteVer === sourceVer &&
      remotePublicVer === sourcePublicVer &&
      liveSha === sourceSha &&
      liveBytes === sourceBytes &&
      isExecutableJavaScriptMime(contentType);
    return {
      ok,
      liveJs,
      remoteVer,
      remotePublicVer,
      liveSha,
      liveBytes,
      contentType,
      executableJavaScriptMime: isExecutableJavaScriptMime(contentType),
      status: response.status,
    };
  } catch (e) {
    return { ok: false, liveJs: '', err: String(e.message || e) };
  }
}

async function fetchExact(cdnUrl, expected, javascript = false) {
  try {
    const response = await fetch(`${cdnUrl}?v=${Date.now()}`, { cache: 'no-store' });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';
    return {
      ok: response.ok && body === expected &&
        (javascript ? isExecutableJavaScriptMime(contentType) : /^application\/json(?:;|$)/i.test(contentType)),
      status: response.status,
      contentType,
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function fetchCssExact(cdnUrl) {
  try {
    const response = await fetch(`${cdnUrl}?v=${Date.now()}`, { cache: 'no-store' });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';
    return {
      ok: response.ok && body === headCss && isCssMime(contentType),
      status: response.status,
      contentType,
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function uploadPermanent() {
  for (let i = 1; i <= 4; i++) {
    const upload = curlUpload('https://catbox.moe/user/api.php');
    const cdnUrl = upload.body;
    if (!/^https:\/\/files\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
      recordUploadAttempt('catbox', false, upload.error || cdnUrl || `curl exited ${upload.status}`);
      console.error(`catbox try ${i}: bad response`, (upload.error || cdnUrl).slice(0, 240));
      // DNS failure is deterministic for this process; retries only delay the
      // remaining CDP/GitHub fallbacks and obscure the real ship blocker.
      if (upload.status === 6 || /Could not resolve host/i.test(upload.error)) break;
      await new Promise((r) => setTimeout(r, 1500 * i));
      continue;
    }
    // wait for prop
    await new Promise((r) => setTimeout(r, 2000));
    const { ok, liveJs } = await fetchOk(cdnUrl);
    console.error(`catbox try ${i}: ${cdnUrl} len=${liveJs.length} ok=${ok}`);
    if (ok) return { cdnUrl, liveJs, host: 'catbox.moe', temporary: false };
    recordUploadAttempt('catbox', false, 'uploaded asset failed SHA/version/MIME attestation');
    await new Promise((r) => setTimeout(r, 2000 * i));
  }
  const browserUpload = await cdpCatboxUpload();
  if (/^https:\/\/files\.catbox\.moe\/.+\.js$/.test(browserUpload?.url || '')) {
    const liveJs = browserUpload.liveJs || '';
    const liveSha = crypto.createHash('sha256').update(liveJs).digest('hex');
    const remoteVer = (liveJs.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1];
    const remotePublicVer = (liveJs.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1];
    const browserOk =
      browserUpload.assetStatus === 200 &&
      liveSha === sourceSha &&
      remoteVer === sourceVer &&
      remotePublicVer === sourcePublicVer &&
      isExecutableJavaScriptMime(browserUpload.contentType);
    console.error(
      `catbox CDP: ${browserUpload.url} len=${liveJs.length} sha=${liveSha.slice(0, 12)} ` +
        `mime=${browserUpload.contentType || '?'} ok=${browserOk}`,
    );
    if (browserOk) return { cdnUrl: browserUpload.url, liveJs, host: 'catbox.moe', temporary: false };
    recordUploadAttempt(
      'catbox-cdp',
      false,
      browserUpload?.error || 'browser-uploaded asset failed status/SHA/version/MIME attestation',
    );
  } else {
    // cdpCatboxUpload records thrown transport failures itself. Only add the
    // protocol-level failure here when no lower-level receipt already exists.
    if (!uploadAttempts.some((attempt) => attempt.host === 'catbox-cdp')) {
      recordUploadAttempt(
        'catbox-cdp',
        false,
        browserUpload?.error || 'CDP upload did not return a Catbox JavaScript URL',
      );
    }
  }
  return null;
}

async function uploadLitter() {
  const upload = curlUpload('https://litterbox.catbox.moe/resources/internals/api.php', [
    '-F', 'time=72h',
  ]);
  const cdnUrl = upload.body;
  if (!/^https:\/\/litter\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
    recordUploadAttempt('litterbox', false, upload.error || cdnUrl || `curl exited ${upload.status}`);
    console.error('litterbox failed:', (upload.error || cdnUrl).slice(0, 240));
    return null;
  }
  await new Promise((r) => setTimeout(r, 2000));
  const { ok, liveJs } = await fetchOk(cdnUrl);
  console.error(`litterbox: ${cdnUrl} len=${liveJs.length} ok=${ok}`);
  if (!ok) {
    recordUploadAttempt('litterbox', false, 'uploaded asset failed SHA/version/MIME attestation');
    return null;
  }
  return { cdnUrl, liveJs, host: 'litterbox.catbox.moe', temporary: true };
}

/** Prefer jsDelivr (application/javascript). Gist raw is text/plain+nosniff → browsers refuse. */
async function uploadJsdelivr() {
  if (process.env.DEMIGOD_ALLOW_JSDELIVR === '0') return null;
  const repo = process.env.DEMIGOD_CDN_REPO || 'Uuriko/demigod-site-cdn';
  const cachedRepo = process.env.DEMIGOD_CDN_WORKTREE || '/tmp/demigod-cdn-pub';
  const cachedGit = fs.existsSync(path.join(cachedRepo, '.git'));
  const gh = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (gh.status !== 0 && !cachedGit) {
    recordUploadAttempt('jsdelivr-github', false, 'GitHub CLI is not authenticated');
    console.error('jsdelivr fallback: gh not authenticated');
    return null;
  }
  const work = path.join('/tmp', `demigod-cdn-pub-${Date.now()}`);
  try {
    fs.mkdirSync(work, { recursive: true });
    const clone = cachedGit
      ? spawnSync('git', ['clone', '--depth=1', cachedRepo, work], { encoding: 'utf8', timeout: 120000 })
      : spawnSync('gh', ['repo', 'clone', repo, work, '--', '--depth=1'], {
          encoding: 'utf8',
          timeout: 120000,
        });
    if (clone.status === 0 && cachedGit) {
      const cachedOrigin = spawnSync('git', ['remote', 'get-url', 'origin'], {
        cwd: cachedRepo,
        encoding: 'utf8',
      });
      const origin = (cachedOrigin.stdout || '').trim();
      if (origin) {
        spawnSync('git', ['remote', 'set-url', 'origin', origin], { cwd: work, encoding: 'utf8' });
      }
    }
    if (clone.status !== 0) {
      if (gh.status !== 0) {
        recordUploadAttempt('jsdelivr-github', false, clone.stderr || clone.stdout || 'cached CDN checkout clone failed');
        console.error('jsdelivr cached checkout failed', (clone.stderr || clone.stdout || '').slice(0, 300));
        return null;
      }
      // create if missing
      fs.mkdirSync(work, { recursive: true });
      spawnSync('git', ['init', '--initial-branch=main'], { cwd: work, encoding: 'utf8' });
      spawnSync('gh', ['repo', 'create', repo, '--public', '--source', work, '--remote', 'origin', '--push'], {
        encoding: 'utf8',
        timeout: 120000,
      });
    }
    const verName = `foot-v${sourceVer}.js`;
    fs.writeFileSync(path.join(work, verName), sourceJs);
    fs.writeFileSync(path.join(work, 'foot-latest.js'), sourceJs);
    fs.writeFileSync(path.join(work, 'startup-map-latest.js'), mapJs);
    fs.writeFileSync(path.join(work, 'sf-startup-map.json'), mapData);
    fs.writeFileSync(path.join(work, 'head-latest.css'), headCss);
    if (rolesFeed) fs.writeFileSync(path.join(work, 'roles-feed.json'), rolesFeed);
    const git = (args) =>
      spawnSync('git', args, { cwd: work, encoding: 'utf8', timeout: 60000 });
    git(['config', 'user.email', 'demigod-cdn@local']);
    git(['config', 'user.name', 'demigod-cdn']);
    // Explicit add list — a file merely written into the work dir is NOT published. Writing
    // roles-feed.json without staging it here is exactly why the first two attempts cut a commit
    // that did not contain it, and why the manifest gate then (correctly) refused to advertise it.
    git(['add', verName, 'foot-latest.js', 'startup-map-latest.js', 'sf-startup-map.json', 'head-latest.css',
      ...(rolesFeed ? ['roles-feed.json'] : [])]);
    const st = git(['status', '--porcelain']);
    if ((st.stdout || '').trim()) {
      git(['commit', '-m', `site v${sourceVer}`]);
      const push = spawnSync('git', ['push', 'origin', 'HEAD:main'], {
        cwd: work,
        encoding: 'utf8',
        timeout: 120000,
      });
      if (push.status !== 0) {
        recordUploadAttempt('jsdelivr-github', false, push.stderr || push.stdout || 'git push failed');
        console.error('jsdelivr push failed', (push.stderr || push.stdout || '').slice(0, 300));
        return null;
      }
    }
    // pin by commit for cache correctness
    const rev = git(['rev-parse', 'HEAD']);
    const sha = (rev.stdout || '').trim().slice(0, 12) || 'main';
    const cdnUrl = `https://cdn.jsdelivr.net/gh/${repo}@${sha}/foot-latest.js`;
    // Probe the immutable commit URL immediately. If propagation lags, preserve
    // the old 3s first wait and every later backoff/check.
    for (let i = 0; i < 7; i++) {
      const check = await fetchOk(cdnUrl);
      const mapUrl = new URL('startup-map-latest.js', cdnUrl).href;
      const mapDataUrl = new URL('sf-startup-map.json', cdnUrl).href;
      const headCssUrl = new URL('head-latest.css', cdnUrl).href;
      const rolesFeedUrl = new URL('roles-feed.json', cdnUrl).href;
      const [mapCheck, mapDataCheck, headCssCheck] = check.ok
        ? await Promise.all([
            fetchExact(mapUrl, mapJs, true),
            fetchExact(mapDataUrl, mapData),
            fetchCssExact(headCssUrl),
          ])
        : [{ ok: false }, { ok: false }, { ok: false }];
      // The feed is optional, so it must never block the ship — but it must also never be
      // ADVERTISED unless it actually resolves. Recording a manifest URL for an asset that was
      // not uploaded publishes a broken promise, which is worse than omitting it. That is exactly
      // what happened on the first attempt: the publisher refuses same-version rewrites, so no new
      // CDN commit was cut, the asset never uploaded, and the manifest still listed a 404.
      const rolesFeedCheck = check.ok && rolesFeed
        ? await fetchExact(rolesFeedUrl, rolesFeed)
        : { ok: false };
      console.error(
        `jsdelivr try ${i + 1}: ${cdnUrl} len=${check.liveJs.length} ` +
        `sha=${check.liveSha?.slice(0, 12) || '?'} mime=${check.contentType || '?'} ` +
          `foot=${check.ok} map=${mapCheck.ok} data=${mapDataCheck.ok} head=${headCssCheck.ok} feed=${rolesFeedCheck.ok}`,
      );
      if (check.ok && mapCheck.ok && mapDataCheck.ok && headCssCheck.ok) {
        return {
          cdnUrl,
          liveJs: check.liveJs,
          host: 'cdn.jsdelivr.net',
          temporary: false,
          assets: {
            startupMap: { url: mapUrl, sha256: mapSha, bytes: mapBytes },
            mapData: { url: mapDataUrl, sha256: mapDataSha, bytes: mapDataBytes },
            headCss: { url: headCssUrl, sha256: headCssSha, bytes: headCssBytes },
            ...(rolesFeedCheck.ok
              ? { rolesFeed: { url: rolesFeedUrl, sha256: rolesFeedSha, bytes: rolesFeedBytes } }
              : {}),
          },
        };
      }
      await new Promise((r) => setTimeout(r, i === 0 ? 3000 : 2500 * i));
    }
    return null;
  } catch (e) {
    console.error('jsdelivr fallback error', e.message || e);
    return null;
  } finally {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/** Gist raw — last resort only (often blocked by nosniff text/plain in browsers). */
async function uploadGist() {
  if (process.env.DEMIGOD_ALLOW_GIST === '0') return null;
  const gh = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
  if (gh.status !== 0) {
    recordUploadAttempt('gist-github', false, 'GitHub CLI is not authenticated');
    console.error('gist fallback: gh not authenticated');
    return null;
  }
  const tmp = path.join('/tmp', `demigod-foot-v${sourceVer}-${Date.now()}.js`);
  fs.writeFileSync(tmp, sourceJs);
  const create = spawnSync(
    'gh',
    ['gist', 'create', tmp, '--public=false', '-d', `Demigod foot-core v${sourceVer} CDN fallback`],
    { encoding: 'utf8', timeout: 120000 },
  );
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  const out = `${create.stdout || ''}\n${create.stderr || ''}`;
  const gistUrl = (out.match(/https:\/\/gist\.github\.com\/[^/\s]+\/[a-f0-9]+/) || [])[0];
  if (!gistUrl) {
    recordUploadAttempt('gist-github', false, out || 'gist create returned no URL');
    console.error('gist fallback: create failed', out.slice(0, 300));
    return null;
  }
  const id = gistUrl.split('/').pop();
  const api = spawnSync('gh', ['api', `gists/${id}`, '--jq', '.files | to_entries[0].value.raw_url'], {
    encoding: 'utf8',
    timeout: 60000,
  });
  const rawUrl = (api.stdout || '').trim();
  if (!/^https:\/\/gist\.githubusercontent\.com\//.test(rawUrl)) {
    recordUploadAttempt('gist-github', false, api.stderr || api.stdout || 'gist API returned no raw URL');
    console.error('gist fallback: no raw_url', (api.stderr || api.stdout || '').slice(0, 240));
    return null;
  }
  // Prefer statically.io wrapper for correct application/javascript MIME
  const parts = rawUrl.match(/gist\.githubusercontent\.com\/([^/]+)\/([a-f0-9]+)\/raw\/[^/]+\/(.+)$/);
  let cdnUrl = rawUrl;
  if (parts) {
    cdnUrl = `https://cdn.statically.io/gist/${parts[1]}/${parts[2]}/raw/${parts[3]}`;
  }
  await new Promise((r) => setTimeout(r, 1500));
  const check = await fetchOk(cdnUrl);
  console.error(
    `gist/static: ${cdnUrl} len=${check.liveJs.length} sha=${check.liveSha?.slice(0, 12) || '?'} ` +
      `mime=${check.contentType || '?'} ok=${check.ok}`,
  );
  if (!check.ok) {
    recordUploadAttempt(
      cdnUrl.includes('statically') ? 'gist-statically' : 'gist-raw',
      false,
      `asset failed status/SHA/version/MIME attestation: status=${check.status || 0} mime=${check.contentType || '?'}`,
    );
    return null;
  }
  return {
    cdnUrl,
    liveJs: check.liveJs,
    host: cdnUrl.includes('statically') ? 'cdn.statically.io' : 'gist.githubusercontent.com',
    temporary: false,
  };
}

// The CM6/live contract is easiest to audit with the immutable, commit-pinned
// foot-latest.js URL. Keep one-off hosts as verified fallbacks, not the primary
// path; otherwise a successful CDN publish can immediately fail CM6 preflight.
let result = await uploadJsdelivr();
if (!result) {
  const failureKind = classifyUploadFailure(uploadAttempts);
  const recovery = uploadFailureRecovery(failureKind, uploadAttempts);
  writeReleaseReceipt({
    ok: false,
    failureKind,
    canonicalArtifactsChanged: false,
    uploadAttempts,
    ...recovery,
    message: 'No upload host returned the complete attested site bundle; canonical loaders and manifests were preserved.',
  });
  console.error(formatUploadFailure(failureKind, uploadAttempts));
  // Do NOT overwrite footer with a dead URL
  process.exit(publishExitCode(result));
}

const { cdnUrl, liveJs, host, temporary, assets } = result;
const ok = true;
const headAsset = assets?.headCss;
if (!headAsset?.url || headAsset.sha256 !== headCssSha || headAsset.bytes !== headCssBytes) {
  throw new Error('attested CDN bundle is missing the canonical head CSS identity');
}
const headBefore = fs.readFileSync(HEAD, 'utf8');
const headAfter = headWithCdn(headBefore, headAsset.url);

// v29: v28 routes plus a served-body no-JavaScript fallback.
const redirect = `<script>(function(){var p=location.pathname,s=location.search||'',h=location.hash||'';function go(u){var i=u.indexOf('#'),f=i<0?'':u.slice(i);if(i>=0)u=u.slice(0,i);if(s)u+=(u.indexOf('?')<0?'?':'&')+s.slice(1);location.replace(u+(h||f))}
if(/^\\/legal\\/?$/i.test(p)&&!/[?&]p=/.test(location.search))go('/?p=legal');
else if(/^\\/(?:blog|notes)\\/([a-z0-9-]+)\\/?$/i.test(p))go('/?p=blog#note-'+p.match(/^\\/(?:blog|notes)\\/([a-z0-9-]+)\\/?$/i)[1]);
else if(/^\\/(blog|notes)\\/?$/i.test(p))go('/?p=blog');
else if(/^\\/method\\/?$/i.test(p))go('/?p=how');
else if(/^\\/partnerships?\\/?$/i.test(p)||/^\\/partners\\/?$/i.test(p))go('/?p=partners');
else if(/^\\/(?:event-bot|events-bot)\\/?$/i.test(p))go('/?p=events');
else if(/^\\/how\\/?$/i.test(p))go('/?p=how');
else if(/^\\/pricing\\/?$/i.test(p))go('/?p=pricing');
else if(/^\\/faq\\/?$/i.test(p))go('/?p=faq');
else if(/^\\/founders\\/?$/i.test(p))go('/?p=hire');
else if(/^\\/(?:candidates|engineers)\\/?$/i.test(p))go('/?p=talent');
else if(/^\\/fees\\/?$/i.test(p))go('/?p=pricing');
else if(/^\\/security\\/?$/i.test(p))go('/?p=legal');
else if(/^\\/sample\\/?$/i.test(p))go('/?p=sample');
else if(/^\\/network\\/?$/i.test(p))go('/?p=talent');
else if(/^\\/hire\\/?$/i.test(p))go('/?p=hire');
else if(/^\\/talent\\/?$/i.test(p))go('/?p=talent');
else if(/^\\/contact\\/?$/i.test(p))go('/?p=contact');
else if(/^\\/compare\\/?$/i.test(p))go('/?p=pricing');
else if(/^\\/pilot\\/?$/i.test(p))go('/?p=hire');
else if(/^\\/about\\/?$/i.test(p))go('/?p=about');
else if(/^\\/status\\/?$/i.test(p))go('/?p=about');
else if(/^\\/events\\/?$/i.test(p))go('/?p=events');
})();</script>`;
const ver = (liveJs.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || '?';
const loader = `<!-- demigod-foot-cdn-loader v29 + events + foot v${ver}${temporary ? ' TEMP-litterbox-72h' : ''} -->\n${NO_JS_FALLBACK}\n${redirect}\n<script id="demigod-foot-cdn-loader" src="${cdnUrl}"></script>\n`;
const manifest = JSON.stringify({
  at: new Date().toISOString(),
  version: ver,
  cdnUrl,
  ok,
  temporary: !!temporary,
  // The fetched asset is SHA/byte-attested above. Record the immutable
  // canonical count so truth and CM6 compare against the same source snapshot.
  bytes: sourceBytes,
  // fetchOk/CDP attestation already proved remote bytes equal source bytes.
  // Persist the canonical source hash so CM6 preflight cannot bless drift.
  sha256: sourceSha,
  liveLen: liveJs.length,
  loaderLen: loader.length,
  host,
  footVer: ver,
  assets,
}, null, 2);

// Upload and CDN propagation can take long enough for another process to alter
// the canonical core. The release lock prevents normal competing writers, but
// this final compare-and-swap guard also fails closed on an expired/overridden
// lease instead of pairing current disk truth with an older attested asset.
assertCanWriteFoot({ label: 'foot-cdn-publish-final' });
assertCanonicalSourceUnchanged();
if (fs.readFileSync(HEAD, 'utf8') !== headBefore) {
  throw new Error('canonical head changed during CDN publish; refusing to overwrite concurrent work');
}

// Each canonical artifact is replaced atomically. A killed publisher can leave
// old-or-new complete files, never a truncated loader or manifest that a later
// CM6 run could paste.
const headAt = new Date().toISOString();
writeFileAtomic(HEAD, headAfter);
writeFileAtomic(HEAD_OUT, JSON.stringify({
  at: headAt,
  cdnUrl: headAsset.url,
  ok: true,
  headLen: headAfter.length,
  cssLen: headCss.length,
}, null, 2) + '\n');
writeFileAtomic(HEAD_RECEIPT, JSON.stringify({
  at: headAt,
  match: true,
  href: headAsset.url,
  diskSha256: headCssSha,
  liveSha256: headCssSha,
  diskMd5: headCssMd5,
  liveMd5: headCssMd5,
  diskBytes: headCssBytes,
  liveBytes: headCssBytes,
  note: 'demigod-foot-cdn-publish bundled head CSS',
}, null, 2) + '\n');
writeFileAtomic(FOOT, loader);
writeFileAtomic(LOADER, loader);
writeFileAtomic(OUT, manifest);
writeReleaseReceipt({
  ok: true,
  failureKind: null,
  canonicalArtifactsChanged: true,
  cdnUrl,
  host,
  footVer: ver,
  assets,
});

console.log(JSON.stringify({
  ok, cdnUrl, liveLen: liveJs.length, loaderLen: loader.length, temporary: !!temporary, host, footVer: ver,
}, null, 2));
process.exit(ok ? 0 : 1);
