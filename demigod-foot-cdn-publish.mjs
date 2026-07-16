#!/usr/bin/env node
/**
 * demigod-foot-cdn-publish — upload foot-core → CDN + patch footer-lite + manifest
 *
 *   node demigod-foot-cdn-publish.mjs [--check|--selftest]
 *
 * Prefers permanent hosts (jsDelivr / catbox); verifies non-empty JS body + MIME.
 * Asserts publish freeze OFF (or DEMIGOD_FORCE_PUBLISH=1). Never writes a dead CDN URL.
 * After: cm6-paste footer → live-doctor / truth.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import WebSocket from 'ws';
import { ROOT } from './demigod-turn-lib.mjs';
import { resolveWebhookPublicUrl } from './demigod-webhook-url.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const args = new Set(process.argv.slice(2));
if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: node demigod-foot-cdn-publish.mjs [--check|--selftest]

Publishes the canonical foot core to an attested JavaScript CDN, then atomically
updates the footer loader and DEMIGOD-FOOT-CDN.json. Requires freeze OFF and the
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
const FOOT = path.join(ROOT, 'demigod-footer-lite.html');
const LOADER = path.join(ROOT, 'demigod-footer-loader.html');
const OUT = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const RELEASE_RECEIPT = '/tmp/dg-busy/foot-cdn-publish-latest.json';
const ALLOW_LITTER = process.env.DEMIGOD_ALLOW_LITTER === '1';
const sourceJs = fs.readFileSync(SRC, 'utf8');
const sourceVer = (sourceJs.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1];
const sourcePublicVer = (sourceJs.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1];
const sourceSha = crypto.createHash('sha256').update(sourceJs).digest('hex');
const sourceBytes = Buffer.byteLength(sourceJs);
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
  const currentSource = fs.readFileSync(SRC, 'utf8');
  const currentSha = crypto.createHash('sha256').update(currentSource).digest('hex');
  if (currentSha !== sourceSha) {
    throw new Error(
      'canonical foot core changed during CDN publish; refusing to write a stale footer or manifest',
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
  checkSelf(isExecutableJavaScriptMime('application/javascript; charset=utf-8'), 'accepts executable JavaScript MIME');
  checkSelf(!isExecutableJavaScriptMime('text/plain'), 'rejects text/plain MIME');
  checkSelf(!isExecutableJavaScriptMime('application/octet-stream'), 'rejects generic binary MIME');
  checkSelf(sourceSha.length === 64, 'computes canonical SHA-256');
  checkSelf(Number.isSafeInteger(sourceBytes) && sourceBytes > 40000, 'computes canonical UTF-8 byte count');
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
    const git = (args) =>
      spawnSync('git', args, { cwd: work, encoding: 'utf8', timeout: 60000 });
    git(['config', 'user.email', 'demigod-cdn@local']);
    git(['config', 'user.name', 'demigod-cdn']);
    git(['add', verName, 'foot-latest.js']);
    const st = git(['status', '--porcelain']);
    if ((st.stdout || '').trim()) {
      git(['commit', '-m', `foot v${sourceVer}`]);
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
    // purge / wait for jsdelivr
    await new Promise((r) => setTimeout(r, 3000));
    for (let i = 0; i < 6; i++) {
      const check = await fetchOk(cdnUrl);
      console.error(
        `jsdelivr try ${i + 1}: ${cdnUrl} len=${check.liveJs.length} ` +
          `sha=${check.liveSha?.slice(0, 12) || '?'} mime=${check.contentType || '?'} ok=${check.ok}`,
      );
      if (check.ok) {
        return { cdnUrl, liveJs: check.liveJs, host: 'cdn.jsdelivr.net', temporary: false };
      }
      await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
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
  console.error('jsdelivr failed — trying permanent catbox…');
  result = await uploadPermanent();
}
if (!result && ALLOW_LITTER) {
  result = await uploadLitter();
}
if (!result) {
  console.error('jsdelivr failed — trying gist/statically (last resort)…');
  result = await uploadGist();
}
if (!result) {
  const failureKind = classifyUploadFailure(uploadAttempts);
  const recovery = uploadFailureRecovery(failureKind, uploadAttempts);
  writeReleaseReceipt({
    ok: false,
    failureKind,
    canonicalArtifactsChanged: false,
    uploadAttempts,
    ...recovery,
    message: 'No upload host returned an attested JavaScript asset; loader and manifest were preserved.',
  });
  console.error(formatUploadFailure(failureKind, uploadAttempts));
  // Do NOT overwrite footer with a dead URL
  process.exit(publishExitCode(result));
}

const { cdnUrl, liveJs, host, temporary } = result;
const ok = true;

// v28: blog|notes|method + #note-{slug} must survive CDN publish (v27 thrash dropped them).
const redirect = `<script>(function(){var p=location.pathname;
if(/^\\/legal\\/?$/i.test(p)&&!/[?&]p=/.test(location.search))location.replace('/?p=legal');
else if(/^\\/(?:blog|notes)\\/([a-z0-9-]+)\\/?$/i.test(p))location.replace('/?p=blog#note-'+p.match(/^\\/(?:blog|notes)\\/([a-z0-9-]+)\\/?$/i)[1]);
else if(/^\\/(blog|notes)\\/?$/i.test(p))location.replace('/?p=blog');
else if(/^\\/method\\/?$/i.test(p))location.replace('/?p=method');
else if(/^\\/partnerships?\\/?$/i.test(p))location.replace('/?p=partners');
else if(/^\\/how\\/?$/i.test(p))location.replace('/?p=how');
else if(/^\\/pricing\\/?$/i.test(p))location.replace('/?p=pricing');
else if(/^\\/faq\\/?$/i.test(p))location.replace('/?p=faq');
else if(/^\\/founders\\/?$/i.test(p))location.replace('/?p=founders');
else if(/^\\/candidates\\/?$/i.test(p))location.replace('/?p=candidates');
else if(/^\\/fees\\/?$/i.test(p))location.replace('/?p=pricing');
else if(/^\\/security\\/?$/i.test(p))location.replace('/?p=legal');
else if(/^\\/sample\\/?$/i.test(p))location.replace('/?p=sample');
else if(/^\\/network\\/?$/i.test(p))location.replace('/?p=talent');
else if(/^\\/hire\\/?$/i.test(p))location.replace('/?p=hire');
else if(/^\\/talent\\/?$/i.test(p))location.replace('/?p=talent');
else if(/^\\/contact\\/?$/i.test(p))location.replace('/?p=contact');
else if(/^\\/compare\\/?$/i.test(p))location.replace('/?p=compare');
else if(/^\\/pilot\\/?$/i.test(p))location.replace('/?p=pilot');
else if(/^\\/about\\/?$/i.test(p))location.replace('/?p=about');
else if(/^\\/status\\/?$/i.test(p))location.replace('/?p=status');
else if(/^\\/events\\/?$/i.test(p))location.replace('https://files.catbox.moe/m22wy3.html');
})();</script>`;
const webhookUrl = resolveWebhookPublicUrl();
const webhookScript = webhookUrl ? `<script>window.__dgWebhookUrl=${JSON.stringify(webhookUrl)};</script>\n` : '';
const ver = (liveJs.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || '?';
const loader = `<!-- demigod-foot-cdn-loader v28 + events + foot v${ver}${temporary ? ' TEMP-litterbox-72h' : ''} -->\n${redirect}\n${webhookScript}<script id="demigod-foot-cdn-loader" src="${cdnUrl}"></script>\n`;
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
  webhookUrl: webhookUrl || null,
  host,
  footVer: ver,
}, null, 2);

// Upload and CDN propagation can take long enough for another process to alter
// the canonical core. The release lock prevents normal competing writers, but
// this final compare-and-swap guard also fails closed on an expired/overridden
// lease instead of pairing current disk truth with an older attested asset.
assertCanonicalSourceUnchanged();

// Each canonical artifact is replaced atomically. A killed publisher can leave
// old-or-new complete files, never a truncated loader or manifest that a later
// CM6 run could paste.
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
});

console.log(JSON.stringify({
  ok, cdnUrl, liveLen: liveJs.length, loaderLen: loader.length, temporary: !!temporary, host, footVer: ver,
}, null, 2));
process.exit(ok ? 0 : 1);
