#!/usr/bin/env node
/**
 * Paste demigod head + footer-lite into Webflow Custom Code via CDP cmTile.view.dispatch
 * (Input.insertText is unreliable on this Webflow CM6 UI).
 *
 * Usage: node demigod-cm6-paste-publish.mjs [--no-publish] [--publish-only] [--check|--check-structural|--selftest]
 *   --no-publish     save head+footer only (no queue-publish)
 *   --publish-only   if Custom Code already exact vs disk, skip re-paste; only queue-publish (long CDP timeout)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const SELF_SOURCE = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const HEAD = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const FOOT = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const CORE = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
const MANIFEST_PATH = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const RELEASE_RECEIPT_PATH = path.join('/tmp', 'dg-busy', 'foot-cdn-publish-latest.json');
const RELEASE_LOCK_PATH = path.join('/tmp', 'dg-busy', 'foot-lock.json');
let MANIFEST = null;
let MANIFEST_ERROR = null;
try {
  MANIFEST = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (error) {
  // Structural editor-split checks do not depend on release metadata. Keep
  // those diagnostics available, but make every release check fail closed.
  MANIFEST_ERROR = String(error?.message || error);
}
let RELEASE_RECEIPT = null;
try {
  RELEASE_RECEIPT = JSON.parse(fs.readFileSync(RELEASE_RECEIPT_PATH, 'utf8'));
} catch {
  // The receipt is diagnostic only. Canonical readiness still comes solely
  // from the checked-in manifest, footer loader, and current foot-core bytes.
}

function readReleaseLease() {
  try {
    const value = JSON.parse(fs.readFileSync(RELEASE_LOCK_PATH, 'utf8'));
    const expiresMs = Date.parse(value?.expiresAt || '');
    const held = Boolean(value?.owner && Number.isFinite(expiresMs) && expiresMs > Date.now());
    const retryInMs = held ? Math.max(0, expiresMs - Date.now()) : null;
    return {
      held,
      owner: held ? String(value.owner) : null,
      expiresAt: held ? new Date(expiresMs).toISOString() : null,
      retryAfter: held ? new Date(expiresMs).toISOString() : null,
      retryInMs,
      sourceVersion: held && value?.footVer != null ? String(value.footVer).replace(/^v/i, '') : null,
      sourceSha256: held && typeof value?.baseSha === 'string' ? value.baseSha : null,
    };
  } catch {
    return {
      held: false,
      owner: null,
      expiresAt: null,
      retryAfter: null,
      retryInMs: null,
      sourceVersion: null,
      sourceSha256: null,
    };
  }
}
const args = new Set(process.argv.slice(2));
const NO_PUBLISH = args.has('--no-publish');
const PUBLISH_ONLY = args.has('--publish-only');
const CHECK_ONLY = args.has('--check');
const SELFTEST = args.has('--selftest');
const CHECK_STRUCTURAL = args.has('--check-structural') || SELFTEST;
const DEPRECATED_ARGS = [...args].filter((arg) => arg === '--footer-only');
const ALLOWED_ARGS = new Set([
  '--no-publish',
  '--publish-only',
  '--check',
  '--check-structural',
  '--selftest',
  '--footer-only',
]);
/** Default CDP command timeout — paste+publish evaluations can exceed 90s */
const CDP_EVAL_MS = Number(process.env.DG_CM6_EVAL_MS || 180000);
const CDP_PUBLISH_MS = Number(process.env.DG_CM6_PUBLISH_MS || 300000);

function persistedCustomCode(meta = {}) {
  return { head: meta.head || meta.preBody || '', footer: meta.postBody || meta.footer || '' };
}

function csrfHeaders(token) {
  if (!token) throw new Error('missing Webflow CSRF token');
  return { 'X-CSRF-Token': token, 'X-XSRF-TOKEN': token };
}
const UNKNOWN_ARGS = [...args].filter((arg) => !ALLOWED_ARGS.has(arg));

function canonicalPreflight() {
  const footLoaders = footLoaderUrls(FOOT);
  const footerUrl = footLoaders.length === 1 ? canonicalUrl(footLoaders[0]) : null;
  const manifestUrl = canonicalUrl(MANIFEST?.cdnUrl);
  const coreSha256 = crypto.createHash('sha256').update(CORE).digest('hex');
  const coreBytes = Buffer.byteLength(CORE);
  // All FOUR foot version markers, not just two — a partial version bump (one marker missed) is a
  // known drift source, and the paste is the last place to catch it before it ships.
  const coreVersions = [
    (CORE.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1] || null,
    (CORE.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null,
    (CORE.match(/dg-foot-v(\d+)-core/) || [])[1] || null, // banner comment (line 1)
    (CORE.match(/foot v(\d+)-core loaded/) || [])[1] || null, // boot-log console.log
  ];
  const checks = {
    editorHelperParses: helperParses(GET_VIEW),
    editorHelperPinsHeadFooter:
      /function setHead\(text\)\{[\s\S]*?const hit=eds\[0\];[\s\S]*?hit\.view\.dispatch/.test(GET_VIEW) &&
      /function setFoot\(text\)\{[\s\S]*?const hit=eds\[1\];[\s\S]*?hit\.view\.dispatch/.test(GET_VIEW),
    editorHelperRequiresExactReadback: (GET_VIEW.match(/const exact = after===text/g) || []).length === 2,
    editorHelperHasNoRawIndexWriter: !/function\s+(?:getView|setEditor)\s*\(/.test(GET_VIEW),
    editorHelperAssertsFinalSplit: /function\s+assertHeadFootSplit\s*\(/.test(GET_VIEW) &&
      // One occurrence is the declaration; the other two are the immediate
      // post-write and final readback gates in the mutating flow below.
      (SELF_SOURCE.match(/assertHeadFootSplit\(/g) || []).length >= 3 &&
      /headLoaderCount===0/.test(GET_VIEW) &&
      /footLoaderCountValue===1/.test(GET_VIEW) &&
      /headExact=h===expectedHead/.test(GET_VIEW) &&
      /footExact=f===expectedFoot/.test(GET_VIEW),
    editorHelperRejectsLoaderOutsideFooter:
      /headLoaderCount===0/.test(GET_VIEW) &&
      /footLoaderCountValue===1/.test(GET_VIEW) &&
      /!\/dg-unhide-critical\|unhide-v5\//.test(GET_VIEW),
    editorHelperVerifiesPersistedSplit:
      /fetch\('\/api\/sites\/talentlink-sf\/code'/.test(SELF_SOURCE) &&
      /pre === expectedHead && post === expectedFoot/.test(SELF_SOURCE) &&
      /if \(!persisted\.result\?\.value\?\.ok\)/.test(SELF_SOURCE),
    headHasUnhideV5: HEAD.includes('unhide-v5') && HEAD.includes('dg-unhide-critical'),
    headHasNoFootLoader: footLoaderUrls(HEAD).length === 0,
    // Webflow's head custom-code field caps at 50,000 and truncates SILENTLY (API returns 200). Gate
    // it locally at the paste site too (defense-in-depth vs verify-source), byte-measured like that
    // gate. Current head ~42.7KB; this only ever blocks a head that would ship broken.
    headUnderWebflowCap: Buffer.byteLength(HEAD, 'utf8') <= 50000,
    footerHasOneFootLoader: footLoaders.length === 1,
    footerUsesApprovedCdn: footLoaders.every((url) => /^(?:https:\/\/files\.catbox\.moe\/|https:\/\/litter\.catbox\.moe\/|https:\/\/gist\.githubusercontent\.com\/|https:\/\/cdn\.jsdelivr\.net\/|https:\/\/cdn\.statically\.io\/)/i.test(url)),
    manifestReadable: Boolean(MANIFEST && typeof MANIFEST === 'object'),
    manifestAttested: MANIFEST?.ok === true,
    manifestVersionMarkersAgree: Boolean(
      MANIFEST?.version != null &&
      MANIFEST?.footVer != null &&
      String(MANIFEST.version).replace(/^v/i, '') === String(MANIFEST.footVer).replace(/^v/i, ''),
    ),
    footerMatchesManifest: Boolean(footerUrl && manifestUrl && footerUrl === manifestUrl),
    footerHasNoHeadPayload: !/unhide-v5|dg-unhide-critical/i.test(FOOT),
    coreVersionMarkersAgree: Boolean(coreVersions[0] && coreVersions.every((v) => v === coreVersions[0])),
    manifestVersionMatchesCore: Boolean(MANIFEST && String(MANIFEST.version || '').replace(/^v/i, '') === coreVersions[0]),
    manifestShaMatchesCore: Boolean(MANIFEST?.sha256 && MANIFEST.sha256 === coreSha256),
    manifestBytesMatchCore: Boolean(Number.isSafeInteger(MANIFEST?.bytes) && MANIFEST.bytes === coreBytes),
  };
  const editorSafetyKeys = [
    'editorHelperParses',
    'editorHelperPinsHeadFooter',
    'editorHelperRequiresExactReadback',
    'editorHelperHasNoRawIndexWriter',
    'editorHelperAssertsFinalSplit',
    'editorHelperRejectsLoaderOutsideFooter',
    'editorHelperVerifiesPersistedSplit',
    'headHasUnhideV5',
    'headHasNoFootLoader',
    'headUnderWebflowCap',
    'footerHasOneFootLoader',
    'footerUsesApprovedCdn',
    'footerHasNoHeadPayload',
    'coreVersionMarkersAgree',
  ];
  const releaseKeys = [
    'manifestReadable',
    'manifestAttested',
    'manifestVersionMarkersAgree',
    'footerMatchesManifest',
    'manifestVersionMatchesCore',
    'manifestShaMatchesCore',
    'manifestBytesMatchCore',
  ];
  const structuralOk = editorSafetyKeys.every((key) => checks[key]);
  const releaseReady = releaseKeys.every((key) => checks[key]);
  const parseReleaseVersion = (value) => {
    const normalized = String(value ?? '').replace(/^v/i, '');
    if (!/^\d+$/.test(normalized)) return null;
    const parsed = Number(normalized);
    return Number.isSafeInteger(parsed) ? parsed : null;
  };
  const coreVersionNumber = parseReleaseVersion(coreVersions[0]);
  const manifestVersionNumber = parseReleaseVersion(MANIFEST?.version);
  const artifactLag = releaseReady ? null : {
    direction:
      coreVersionNumber !== null && manifestVersionNumber !== null
        ? (coreVersionNumber > manifestVersionNumber ? 'core-ahead' : coreVersionNumber < manifestVersionNumber ? 'manifest-ahead' : 'identity-drift')
        : 'identity-drift',
    versions:
      coreVersionNumber !== null && manifestVersionNumber !== null
        ? Math.abs(coreVersionNumber - manifestVersionNumber)
        : null,
    bytes: Number.isSafeInteger(MANIFEST?.bytes) ? coreBytes - MANIFEST.bytes : null,
  };
  return {
    ok: structuralOk && releaseReady,
    structuralOk,
    releaseReady,
    drift: releaseKeys.filter((key) => !checks[key]),
    checks,
    footLoaders,
    coreVersions,
    coreBytes,
    releaseDetails: {
      core: { version: coreVersions[0], sha256: coreSha256, bytes: coreBytes },
      manifest: {
        version: MANIFEST?.version == null ? null : String(MANIFEST.version).replace(/^v/i, ''),
        sha256: MANIFEST?.sha256 || null,
        bytes: Number.isSafeInteger(MANIFEST?.bytes) ? MANIFEST.bytes : null,
      },
      footerUrl,
      manifestUrl,
      // Keep the expected/staged identity explicit so a coordinator can wait
      // on the active publisher without having to reinterpret check names.
      identityDelta: {
        version: checks.manifestVersionMatchesCore
          ? null
          : { expected: coreVersions[0], staged: MANIFEST?.version == null ? null : String(MANIFEST.version).replace(/^v/i, '') },
        sha256: checks.manifestShaMatchesCore
          ? null
          : { expected: coreSha256, staged: MANIFEST?.sha256 || null },
        bytes: checks.manifestBytesMatchCore
          ? null
          : { expected: coreBytes, staged: Number.isSafeInteger(MANIFEST?.bytes) ? MANIFEST.bytes : null },
      },
      identityAligned: checks.manifestVersionMatchesCore &&
        checks.manifestShaMatchesCore && checks.manifestBytesMatchCore,
      // Keep the direction machine-readable so coordinators can distinguish a
      // normally staged core from a future/corrupt manifest without weakening the gate.
      artifactLag,
    },
    manifestPath: MANIFEST_PATH,
    manifestVersion: MANIFEST?.version || null,
    manifestError: MANIFEST_ERROR,
  };
}

function primaryReleaseBlocker({ transportBlocked, leaseHeld }) {
  if (transportBlocked) return 'release-transport';
  if (leaseHeld) return 'release-lease';
  return 'release-artifact-drift';
}

function transportFailureMatchesCore(receipt, core) {
  return Boolean(
    receipt &&
    receipt.ok === false &&
    receipt.failureKind === 'release-transport-unavailable' &&
    receipt.sourceSha256 === core.sha256 &&
    receipt.sourceVersion != null &&
    String(receipt.sourceVersion).replace(/^v/i, '') === core.version,
  );
}

function releaseRemediation(preflight) {
  if (preflight.releaseReady) return { releaseBlocker: null, nextCommand: null, releaseRecovery: null };
  const lease = readReleaseLease();
  const labels = {
    manifestReadable: 'CDN manifest is missing or unreadable',
    manifestAttested: 'CDN manifest is not positively attested',
    manifestVersionMarkersAgree: 'manifest version markers disagree',
    footerMatchesManifest: 'footer loader URL does not match the CDN manifest',
    manifestVersionMatchesCore: 'manifest version does not match foot core',
    manifestShaMatchesCore: 'manifest SHA-256 does not match foot core',
    manifestBytesMatchCore: 'manifest byte count does not match foot core',
  };
  // A receipt only describes this release when both immutable source identity
  // fields match. Never let an older failed upload suppress recovery for a
  // newer core, even when its version or failure kind happens to look similar.
  const transportBlocked = transportFailureMatchesCore(
    RELEASE_RECEIPT,
    preflight.releaseDetails.core,
  );
  const leaseStaleForCore = Boolean(
    lease.held &&
    ((lease.sourceVersion && lease.sourceVersion !== preflight.releaseDetails.core.version) ||
      (lease.sourceSha256 && lease.sourceSha256 !== preflight.releaseDetails.core.sha256)),
  );
  const recoveryState = transportBlocked
    ? 'cdn-transport-unavailable'
    : lease.held
      ? leaseStaleForCore
        ? 'wait-for-stale-core-release-lease'
        : 'wait-for-release-lease'
      : 'publish-release-artifacts';
  // Keep the actionable blocker singular. A publisher lease commonly remains
  // held after a failed upload, but in that state waiting for the lease would
  // not make progress: release transport is the actual blocker.
  const primaryBlocker = primaryReleaseBlocker({ transportBlocked, leaseHeld: lease.held });
  return {
    releaseBlocker: preflight.drift.map((key) => labels[key] || key).join('; '),
    // Publishing is the operation that regenerates both the attested manifest
    // and footer loader. The command still fails closed on freeze/lock gates.
    nextCommand: lease.held || transportBlocked ? null : 'node demigod-foot-cdn-publish.mjs',
    releaseRecovery: {
      state: recoveryState,
      primaryBlocker,
      command: 'node demigod-foot-cdn-publish.mjs',
      then: 'node demigod-cm6-paste-publish.mjs',
      mutates: true,
      guarded: true,
      gatedBy: ['publish-freeze', 'foot-lock', 'live-attestation'],
      // Primary progress and mutation safety are different dimensions. A
      // transport outage can be the reason the release cannot advance while
      // the active lease still independently forbids this process from
      // writing. Never emit leaseHeld=true with blockedByLease=false: callers
      // may use blockedByLease as a hard mutation guard.
      blockedByLease: lease.held,
      progressBlockedByLease: lease.held && !transportBlocked,
      leaseHeld: lease.held,
      // Keep the bounded coordination window at the recovery root. Cycle and
      // dashboard consumers should not have to reinterpret the nested lease
      // merely because transport is the primary blocker.
      retryAfter: lease.retryAfter,
      retryInMs: lease.retryInMs,
      staleForCore: leaseStaleForCore,
      takeoverAllowed: false,
      lease,
      retryable: transportBlocked ? RELEASE_RECEIPT.retryable === true : null,
      blockedTransports: transportBlocked && Array.isArray(RELEASE_RECEIPT.blockedTransports)
        ? RELEASE_RECEIPT.blockedTransports
        : [],
      nextState: transportBlocked ? RELEASE_RECEIPT.nextState || null : null,
    },
    releaseTransport: transportBlocked ? {
      available: false,
      failureKind: RELEASE_RECEIPT.failureKind,
      retryable: RELEASE_RECEIPT.retryable === true,
      blocked: Array.isArray(RELEASE_RECEIPT.blockedTransports) ? RELEASE_RECEIPT.blockedTransports : [],
      nextState: RELEASE_RECEIPT.nextState || null,
      receiptPath: RELEASE_RECEIPT_PATH,
      receiptAt: RELEASE_RECEIPT.at || null,
    } : { available: null, receiptPath: RELEASE_RECEIPT_PATH },
  };
}

function canonicalUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    // Release comparisons must fail closed. Comparing two identical malformed
    // strings could otherwise bless a footer/manifest pair that no browser can load.
    return null;
  }
}

function helperParses(source) {
  try {
    new Function(source);
    return true;
  } catch {
    return false;
  }
}

function isExecutableJavaScriptMime(contentType) {
  return /^(?:application|text)\/(?:javascript|x-javascript|ecmascript)(?:\s*;|$)/i.test(
    String(contentType || '').trim(),
  );
}

function footLoaderUrls(html) {
  return [...String(html || '').matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0])
    // Hashed fallback assets are identified by the dedicated loader id. For
    // the canonical jsDelivr route, also recognize foot-latest.js directly.
    // Do not treat every approved-host script as the foot loader: Webflow may
    // legitimately contain unrelated JavaScript from the same CDN.
    .filter((tag) => {
      if (/\bid=["']demigod-foot-cdn-loader["']/i.test(tag)) return true;
      const src = (tag.match(/\bsrc=["'](https?:\/\/[^"'\s<>]+)["']/i) || [])[1];
      return Boolean(src && /\/foot-latest\.js(?:[?#].*)?$/i.test(src));
    })
    .map((tag) => (tag.match(/\bsrc=["'](https?:\/\/[^"'\s<>]+)["']/i) || [])[1])
    .filter(Boolean);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTabs() {
  const r = await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`CDP tab discovery failed: HTTP ${r.status}`);
  return r.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl, { maxPayload: 50_000_000 });
  let mid = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result || {});
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  async function call(method, params, timeout = CDP_EVAL_MS) {
    await ready;
    const id = ++mid;
    const p = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout ${method} after ${timeout}ms`));
        }
      }, timeout);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
    ws.send(JSON.stringify({ id, method, params }));
    return p;
  }
  return { ws, call, ready };
}

const GET_VIEW = `
/**
 * Ordered content editors by DOM position (Webflow Custom Code: 0=Head, 1=Footer).
 * Never pick by footish/headish content — dual-footer corruption made that unsafe (v212 ship).
 */
function orderedEditors(){
  const out=[];
  const seen=new Set();
  document.querySelectorAll('.cm-editor').forEach((ed, idx)=>{
    // Webflow can leave a hidden CM tree behind while rerendering Custom Code.
    // Only rendered, connected editors are safe positional head/footer truth.
    if(!ed.isConnected || ed.getClientRects().length===0) return;
    // A CM6 editor can expose gutter and content views. Choose the first real
    // document within this editor instead of letting a gutter hide the editor.
    const candidates=[...ed.querySelectorAll('.cm-content')]
      .map(node=>node.cmView?.view || node.cmTile?.view)
      .filter(view=>view?.state?.doc && !seen.has(view));
    const view=candidates.find(candidate=>{
      const value=candidate.state.doc.toString();
      return !(/^\\s*[\\d\\n]+\\s*$/.test(value) && value.length<200);
    });
    if(!view) return;
    const t=view.state.doc.toString();
    seen.add(view);
    out.push({
      i: idx,
      view,
      len: t.length,
      headish: /unhide-v5|dg-unhide-critical|Demigod HEAD/i.test(t),
      footish: /foot-latest|foot-cdn|footer-lite|jsdelivr\\.net\\/gh\\/.*foot|catbox\\.moe\\/[a-z0-9]+\\.js/i.test(t),
    });
  });
  return out;
}
function footLoaderCount(text){
  return (String(text||'').match(/<script\\b[^>]*(?:id=["']demigod-foot-cdn-loader["']|src=["']https?:\\/\\/[^"']*\\/foot-latest\\.js(?:[?#][^"']*)?["'])[^>]*>/gi)||[]).length;
}
function setFoot(text){
  const eds=orderedEditors();
  // Footer is editor 1. Never fall back to editor 0: that is the corruption class.
  if(eds.length!==2) return {ok:false, reason:'need-exactly-2-editors', n:eds.length, eds:eds.map(c=>({i:c.i,len:c.len}))};
  const hit=eds[1];
  hit.view.dispatch({changes:{from:0,to:hit.view.state.doc.length,insert:text}});
  try{ hit.view.dom?.dispatchEvent(new InputEvent('input',{bubbles:true})); }catch(e){}
  const after=hit.view.state.doc.toString();
  const loaderCount=footLoaderCount(after);
  const exact = after===text;
  const ok = exact && loaderCount===1 && !/dg-unhide-critical|unhide-v5/.test(after);
  return {ok, i:hit.i, len:after.length, exact, loaderCount, preview:after.slice(0,100), assertFootOnly:ok, eds:eds.map(c=>({i:c.i,len:c.len,headish:c.headish,footish:c.footish}))};
}
function setHead(text){
  const eds=orderedEditors();
  if(eds.length!==2) return {ok:false, reason:'need-exactly-2-editors', n:eds.length};
  const hit=eds[0];
  hit.view.dispatch({changes:{from:0,to:hit.view.state.doc.length,insert:text}});
  try{ hit.view.dom?.dispatchEvent(new InputEvent('input',{bubbles:true})); }catch(e){}
  const after=hit.view.state.doc.toString();
  const exact = after===text;
  const ok = exact && after.includes('unhide-v5') && after.includes('dg-unhide-critical') && footLoaderCount(after)===0;
  return {ok, i:hit.i, len:after.length, exact, preview:after.slice(0,80), hasUnhide:/unhide/.test(after), assertHeadOnly:ok, eds:eds.map(c=>({i:c.i,len:c.len}))};
}
function assertHeadFootSplit(expectedHead, expectedFoot){
  const eds=orderedEditors();
  if(eds.length!==2) return {ok:false, reason:'need-exactly-2-editors', n:eds.length};
  const h=eds[0].view.state.doc.toString();
  const f=eds[1].view.state.doc.toString();
  const headLoaderCount=footLoaderCount(h);
  const footLoaderCountValue=footLoaderCount(f);
  const headExact=h===expectedHead;
  const footExact=f===expectedFoot;
  const headOk=headExact && h.includes('unhide-v5') && h.includes('dg-unhide-critical') && headLoaderCount===0;
  const footOk=footExact && footLoaderCountValue===1 && !/dg-unhide-critical|unhide-v5/.test(f);
  return {ok: headOk && footOk, headOk, footOk, headExact, footExact, headLoaderCount, footLoaderCount:footLoaderCountValue, headLen:h.length, footLen:f.length, headPreview:h.slice(0,60), footPreview:f.slice(0,60)};
}
`;

async function main() {
  if (DEPRECATED_ARGS.length) {
    throw new Error('--footer-only was removed: CM6 safety requires an exact canonical head + footer pair');
  }
  if (UNKNOWN_ARGS.length) {
    throw new Error(
      `unknown argument(s): ${UNKNOWN_ARGS.join(', ')}; expected --check, --check-structural, --selftest, --no-publish, or --publish-only`,
    );
  }
  if (CHECK_ONLY && CHECK_STRUCTURAL) throw new Error('choose one check mode');
  if (NO_PUBLISH && PUBLISH_ONLY) throw new Error('--no-publish and --publish-only are mutually exclusive');
  if (NO_PUBLISH && (CHECK_ONLY || CHECK_STRUCTURAL)) {
    throw new Error('--no-publish is a mutating save mode and cannot be combined with a read-only check mode');
  }
  if (PUBLISH_ONLY && (CHECK_ONLY || CHECK_STRUCTURAL)) {
    throw new Error('--publish-only cannot be combined with a read-only check mode');
  }
  if (args.has('--footer-only')) {
    throw new Error('--footer-only is disabled: every paste must repair and verify the canonical head/footer pair');
  }
  const preflight = canonicalPreflight();
  if (SELFTEST) {
    const headShape = persistedCustomCode({ head: 'HEAD', preBody: 'OLD', postBody: 'FOOT' });
    const legacyShape = persistedCustomCode({ preBody: 'HEAD', footer: 'FOOT' });
    if (headShape.head !== 'HEAD' || headShape.footer !== 'FOOT' || legacyShape.head !== 'HEAD' || legacyShape.footer !== 'FOOT') {
      throw new Error('Webflow meta.head/preBody attestation selftest failed');
    }
    const headers = csrfHeaders('same-token');
    if (headers['X-CSRF-Token'] !== headers['X-XSRF-TOKEN']) throw new Error('CSRF header equality selftest failed');
    let missingCsrfFailed = false;
    try { csrfHeaders(''); } catch { missingCsrfFailed = true; }
    if (!missingCsrfFailed) throw new Error('missing CSRF must fail closed');
    const blockerOrderOk =
      primaryReleaseBlocker({ transportBlocked: true, leaseHeld: true }) === 'release-transport' &&
      primaryReleaseBlocker({ transportBlocked: false, leaseHeld: true }) === 'release-lease' &&
      primaryReleaseBlocker({ transportBlocked: false, leaseHeld: false }) === 'release-artifact-drift';
    if (!blockerOrderOk) throw new Error('release blocker precedence selftest failed');
    const fixtureCore = { version: '434', sha256: 'core-434' };
    const fixtureReceipt = {
      ok: false,
      failureKind: 'release-transport-unavailable',
      sourceVersion: '434',
      sourceSha256: 'core-434',
    };
    const transportIdentityOk =
      transportFailureMatchesCore(fixtureReceipt, fixtureCore) &&
      !transportFailureMatchesCore({ ...fixtureReceipt, sourceVersion: '433' }, fixtureCore) &&
      !transportFailureMatchesCore({ ...fixtureReceipt, sourceSha256: 'older-core' }, fixtureCore) &&
      !transportFailureMatchesCore({ ...fixtureReceipt, ok: true }, fixtureCore) &&
      !transportFailureMatchesCore({ ...fixtureReceipt, failureKind: 'release-lease' }, fixtureCore);
    if (!transportIdentityOk) throw new Error('release transport receipt identity selftest failed');
    const remediation = releaseRemediation(preflight);
    const recoveryGateOk = preflight.releaseReady || (
      remediation.releaseRecovery?.guarded === true &&
      remediation.releaseRecovery?.gatedBy?.join(',') === 'publish-freeze,foot-lock,live-attestation' &&
      new Set(remediation.releaseRecovery.gatedBy).size === remediation.releaseRecovery.gatedBy.length
    );
    if (!recoveryGateOk) throw new Error('release recovery gate contract selftest failed');
  }
  if (CHECK_ONLY || CHECK_STRUCTURAL) {
    const pass = CHECK_STRUCTURAL ? preflight.structuralOk : preflight.ok;
    const remediation = releaseRemediation(preflight);
    // `ok` is the selected command's contract. Preserve the stricter release
    // result separately so structural checks never report pass=true/ok=false.
    console.log(JSON.stringify({
      mode: SELFTEST ? 'selftest' : (CHECK_STRUCTURAL ? 'check-structural' : 'check'),
      selectedContract: CHECK_STRUCTURAL ? 'editor-structure' : 'release-ready',
      ...preflight,
      canonicalOk: preflight.ok,
      releaseBlocked: !preflight.releaseReady,
      pass,
      ok: pass,
      verdict: pass
        ? (preflight.releaseReady ? 'release-ready' : 'structural-pass-release-blocked')
        : 'blocked',
      ...remediation,
    }, null, 2));
    if (!pass) process.exitCode = 1;
    return;
  }
  if (!preflight.ok) throw new Error(`canonical head/footer preflight failed: ${JSON.stringify(preflight)}`);
  // Paste mutates editors; --no-publish suppresses cloud-publish only.
  // --publish-only may skip paste when API already matches disk.
  assertNotFrozen(
    NO_PUBLISH ? 'cm6-paste-save' : PUBLISH_ONLY ? 'cm6-publish-only' : 'cm6-paste-publish',
  );
  assertCanWriteFoot({ label: PUBLISH_ONLY ? 'cm6-publish-only' : 'cm6-paste-publish' });

  const tabs = await cdpTabs();
  const loginWall = tabs.find(
    (t) =>
      t.type === 'page' &&
      /webflow\.com\/login/i.test(t.url || '') &&
      /custom-code|talentlink-sf/i.test(t.url || t.title || ''),
  );
  const page = tabs.find(
    (t) => t.type === 'page' && (t.url || '').startsWith('https://webflow.com/dashboard/sites/talentlink-sf/custom-code'),
  );
  if (!page) {
    if (loginWall) {
      console.error(
        'Webflow custom-code session expired (login wall). Re-auth in CDP Chrome, then: bin/dg-webflow open custom-code',
      );
      process.exit(3);
    }
    console.error('No custom-code tab open (bin/dg-webflow open custom-code)');
    process.exit(2);
  }
  console.log('tab', page.id.slice(0, 8), page.url.slice(0, 70));
  const { ws, call } = connect(page.webSocketDebuggerUrl);
  const closeWs = () => {
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
    } catch {
      /* best-effort CDP cleanup */
    }
  };
  process.once('exit', closeWs);
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Page.navigate', { url: 'https://webflow.com/dashboard/sites/talentlink-sf/custom-code' });
  let eds = 0;
  for (let i = 0; i < 25; i++) {
    await sleep(1200);
    const r = await call('Runtime.evaluate', {
      expression: `${GET_VIEW}; orderedEditors().length`,
      returnByValue: true,
    }, CDP_EVAL_MS);
    eds = r.result?.value || 0;
    if (eds === 2) break;
  }
  if (eds !== 2) {
    console.error(`expected exactly 2 editors; found ${eds}`);
    process.exit(3);
  }

  let skippedPaste = false;
  if (PUBLISH_ONLY) {
    // If editors already match disk, skip re-paste (avoids timeout thrash after good save).
    const pre = await call(
      'Runtime.evaluate',
      {
        expression: `${GET_VIEW}; assertHeadFootSplit(${JSON.stringify(HEAD)}, ${JSON.stringify(FOOT)})`,
        returnByValue: true,
      },
      CDP_EVAL_MS,
    );
    console.log('publish-only pre-split', pre.result?.value);
    if (pre.result?.value?.ok && pre.result?.value?.headExact && pre.result?.value?.footExact) {
      skippedPaste = true;
      console.log('publish-only: editors already exact — skip paste, queue-publish only');
    } else {
      console.log('publish-only: editors not exact — falling through to full paste');
    }
  }

  if (!skippedPaste) {
  const h = await call(
    'Runtime.evaluate',
    {
      expression: `${GET_VIEW}; setHead(${JSON.stringify(HEAD)})`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  console.log('head', h.result?.value);
  if (!h.result?.value?.ok) {
    console.error('head paste failed or assertHeadOnly failed');
    process.exit(4);
  }
  const f = await call(
    'Runtime.evaluate',
    {
      expression: `${GET_VIEW}; setFoot(${JSON.stringify(FOOT)})`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  console.log('foot', f.result?.value);
  if (!f.result?.value?.ok) {
    console.error('footer paste failed or assertFootOnly failed');
    process.exit(4);
  }
  // Re-apply head AFTER foot so setFoot can never leave dual-footer (corruption class)
  const h2 = await call(
    'Runtime.evaluate',
    {
      expression: `${GET_VIEW}; setHead(${JSON.stringify(HEAD)}); assertHeadFootSplit(${JSON.stringify(HEAD)}, ${JSON.stringify(FOOT)})`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  console.log('assert-split', h2.result?.value);
  if (!h2.result?.value?.ok) {
    console.error('post-paste head/footer split is wrong');
    process.exit(4);
  }
  const split = await call(
    'Runtime.evaluate',
    {
      expression: `${GET_VIEW}; assertHeadFootSplit(${JSON.stringify(HEAD)}, ${JSON.stringify(FOOT)})`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  console.log('final-split', split.result?.value);
  if (!split.result?.value?.ok) {
    console.error('final head/foot split assert failed', split.result?.value);
    process.exit(4);
  }
  } // end !skippedPaste

  if (!skippedPaste) {
  // Prefer Ctrl/Meta+S then Save button (forces dirty commit in some Webflow builds)
  await call(
    'Runtime.evaluate',
    {
      expression: `(() => {
      const isMac=/mac/i.test(navigator.platform);
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown',{key:'s',code:'KeyS',metaKey:isMac,ctrlKey:!isMac,bubbles:true}));
      return 'keys';
    })()`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  await sleep(500);
  const sav = await call(
    'Runtime.evaluate',
    {
      expression: `(() => {
      const b=[...document.querySelectorAll('button')].find(x=>
        !x.disabled && x.getAttribute('aria-disabled')!=='true' &&
        /^\\s*(Save|Save changes)\\s*$/i.test(x.textContent||'')
      );
      if(b){b.click();return {saved:true, label:(b.textContent||'').trim().slice(0,40)};}
      return {saved:false};
    })()`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  console.log('save', sav.result?.value);
  // Ctrl/Cmd+S may finish quickly enough that Webflow disables or relabels the
  // button before this lookup. Do not false-fail on button state: the API
  // readback below is the authoritative persistence gate.
  if (!sav.result?.value?.saved) console.warn('Save button unavailable after keyboard save; verifying persisted API');
  // Webflow Save latency varies. Readback below polls the persisted API, so a
  // slow save does not become a false failure after one fixed delay.
  await sleep(1000);

  // Verify both saved editors exactly match canonical disk content.
  const ver = await call(
    'Runtime.evaluate',
    {
      expression: `${GET_VIEW}; (() => {
      const eds=orderedEditors();
      const head=eds[0];
      const foot=eds[1];
      const h=head?head.view.state.doc.toString():'';
      const t=foot?foot.view.state.doc.toString():'';
      const expectedHead=${JSON.stringify(HEAD)};
      const expectedFoot=${JSON.stringify(FOOT)};
      return {
        ok: eds.length === 2 && h === expectedHead && t === expectedFoot,
        len:t.length,
        hasFootCdn: /foot-latest\\.js|cdn\\.jsdelivr\\.net\\/gh\\/|files\\.catbox\\.moe\\/[a-z0-9]+\\.js|gist\\.githubusercontent\\.com\\/[^\"']+\\.js/.test(t),
        exactHead: h === expectedHead,
        exactFoot: t === expectedFoot,
        sample:t.slice(0,140),
        eds:eds.map(c=>({i:c.i,len:c.len,headish:c.headish,footish:c.footish}))
      };
    })()`,
      returnByValue: true,
    },
    CDP_EVAL_MS,
  );
  console.log('verify', ver.result?.value);
  if (!ver.result?.value?.ok) {
    console.error('saved editor readback differs from canonical head/footer', ver.result?.value);
    process.exit(4);
  }
  } // end save/verify when pasted

  // CM6 readback only proves browser memory. The API payload proves Save
  // persisted both canonical fields, including in --no-publish mode.
  const persisted = await call('Runtime.evaluate', {
    expression: `(async () => {
      const expectedHead = ${JSON.stringify(HEAD)};
      const expectedFoot = ${JSON.stringify(FOOT)};
      let last = { ok: false, status: 0, exactHead: false, exactFoot: false, attempts: 0 };
      for (let attempt = 1; attempt <= 12; attempt++) {
        try {
          const res = await fetch('/api/sites/talentlink-sf/code', { credentials: 'include', cache: 'no-store' });
          const text = await res.text();
          let code = null;
          try { code = JSON.parse(text); } catch {}
          // Webflow custom-code API uses meta.head (not preBody) for site head paste.
          const pre = code?.meta?.head || code?.meta?.preBody || '';
          const post = code?.meta?.postBody || code?.meta?.footer || '';
          last = {
            ok: res.ok && pre === expectedHead && post === expectedFoot,
            status: res.status,
            exactHead: pre === expectedHead,
            exactFoot: post === expectedFoot,
            attempts: attempt,
            body: code ? null : text.slice(0, 160),
          };
          if (last.ok) return last;
        } catch (error) {
          last = { ...last, attempts: attempt, error: String(error) };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return last;
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log('persisted-api', persisted.result?.value);
  if (!persisted.result?.value?.ok) {
    console.error('Webflow persisted API head/footer differ from canonical disk content', persisted.result?.value);
    process.exit(4);
  }

  if (!NO_PUBLISH) {
    // Prefer official queue-publish API (session cookies) — more reliable than UI-only clicks
    // Long timeout: queue + task poll can exceed 90s (prior Runtime.evaluate timeouts after good save).
    const qpub = await call(
      'Runtime.evaluate',
      {
      expression: `(async () => {
        // Confirm the saved API payload exactly matches disk before queueing publish.
        const code = await (await fetch('/api/sites/talentlink-sf/code', { credentials: 'include' })).json();
        // Webflow custom-code API uses meta.head (not preBody) for site head paste.
        const pre = code?.meta?.head || code?.meta?.preBody || '';
        const post = code?.meta?.postBody || code?.meta?.footer || '';
        const expectedHead = ${JSON.stringify(HEAD)};
        const expectedFoot = ${JSON.stringify(FOOT)};
        const apiOk = pre === expectedHead && post === expectedFoot;
        if (!apiOk) return {
          status: 0,
          body: 'ABORT: Webflow API head/footer differ from canonical disk content',
          apiOk,
          headExact: pre === expectedHead,
          footExact: post === expectedFoot,
        };
        // Webflow requires both CSRF headers (meta _csrf). X-CSRF alone → 412.
        const csrf = document.querySelector('meta[name="_csrf"]')?.content || '';
        if (!csrf) return {
          status: 0,
          body: 'ABORT: missing Webflow CSRF token',
          apiOk,
          csrfOk: false,
        };
        const res = await fetch('/api/sites/talentlink-sf/queue-publish', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-Token': csrf,
            'X-XSRF-TOKEN': csrf,
          },
          body: JSON.stringify({
            origin: 'dashboard',
            publishTarget: ['talentlink-sf.webflow.io', 'www.trydemigod.com'],
          }),
        });
        const text = await res.text();
        let taskId = null;
        try { taskId = JSON.parse(text)?.taskId || JSON.parse(text)?.task || null; } catch {}
        // Fallback: poll recent tasks path if response embeds id
        const idMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (!taskId && idMatch) taskId = idMatch[0];
        // Wait for completion via task polling if we got an id; else wait fixed
        let taskStatus = null;
        if (taskId) {
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const taskPaths = [
                '/api/sites/talentlink-sf/tasks/' + taskId,
                '/api/site/talentlink-sf/tasks/' + taskId,
              ];
              let tr = null;
              for (const taskPath of taskPaths) {
                const candidate = await fetch(taskPath, { credentials: 'include' });
                if (candidate.ok) { tr = candidate; break; }
              }
              if (!tr) throw new Error('publish task endpoint unavailable');
              const tj = await tr.json();
              taskStatus = tj?.status || tj?.state || tj?.task?.status || JSON.stringify(tj).slice(0, 120);
              if (/complete|success|done|published/i.test(String(taskStatus))) break;
              if (/fail|error/i.test(String(taskStatus))) break;
            } catch (e) { taskStatus = String(e); }
          }
        } else {
          await new Promise(r => setTimeout(r, 25000));
        }
        const taskFailed = /fail|error|cancel/i.test(String(taskStatus || ''));
        const taskComplete = /complete|success|done|published/i.test(String(taskStatus || ''));
        const positiveAcceptance = /published|publish(?:ing)?\s+(?:queued|accepted)|queued|accepted|success/i.test(text);
        const negativeAcceptance = /fail(?:ed|ure)?|error|cancel(?:led|ed)?|abort(?:ed)?|reject(?:ed)?|denied/i.test(text);
        const acceptedWithoutTask = res.ok && !taskId && positiveAcceptance && !negativeAcceptance;
        return { status: res.status, body: text.slice(0, 300), taskId, taskStatus, taskFailed, taskComplete, acceptedWithoutTask, apiOk, csrfOk: true, postHasCdn: apiOk };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    },
      CDP_PUBLISH_MS,
    );
    console.log('queue-publish', qpub.result?.value);
    if (
      !qpub.result?.value?.apiOk ||
      qpub.result?.value?.csrfOk !== true ||
      qpub.result?.value?.status >= 400 ||
      qpub.result?.value?.taskFailed ||
      (qpub.result?.value?.taskId && !qpub.result?.value?.taskComplete) ||
      (!qpub.result?.value?.taskId && !qpub.result?.value?.acceptedWithoutTask)
    ) {
      console.error('publish queue aborted or failed canonical API readback', qpub.result?.value);
      process.exit(5);
    }
  }

  closeWs();
  process.removeListener('exit', closeWs);
  if (NO_PUBLISH) {
    console.log(JSON.stringify({ saved: true, published: false, liveChecked: false, skippedPaste: false }, null, 2));
    return;
  }
  // live check (poll for CDN match)
  // canonicalPreflight already proves this list contains exactly one loader.
  // Reuse that strict parser instead of selecting the first arbitrary script src.
  const footWanted = preflight.footLoaders[0] || null;
  let liveCdn = null;
  let pub = null;
  let liveOk = false;
  let liveError = null;
  for (let i = 0; i < 12; i++) {
    try {
      const liveResponse = await fetch(`https://www.trydemigod.com/?cb=${Date.now()}-${i}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!liveResponse.ok) throw new Error(`live HTML HTTP ${liveResponse.status}`);
      const live = await liveResponse.text();
      const loaderSrcs = footLoaderUrls(live);
      const liveHeadOk = live.includes('unhide-v5') && live.includes('dg-unhide-critical');
      liveCdn = loaderSrcs[0] || null;
      pub = (live.match(/Last Published: ([^<]+)/) || [])[1] || null;
      if (
        liveHeadOk &&
        footWanted &&
        loaderSrcs.length === 1 &&
        canonicalUrl(loaderSrcs[0]) === canonicalUrl(footWanted) &&
        canonicalUrl(liveCdn) === canonicalUrl(footWanted)
      ) {
        const wantVer = (CORE.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1];
        const footResponse = await fetch(`${footWanted}${footWanted.includes('?') ? '&' : '?'}cb=${Date.now()}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!footResponse.ok) throw new Error(`foot CDN HTTP ${footResponse.status}`);
        const liveFootContentType = footResponse.headers.get('content-type') || '';
        if (!isExecutableJavaScriptMime(liveFootContentType)) {
          throw new Error(`foot CDN unsafe MIME ${liveFootContentType || '(missing)'}`);
        }
        const liveFoot = await footResponse.text();
        const liveFootSha = crypto.createHash('sha256').update(liveFoot).digest('hex');
        const wantedFootSha = crypto.createHash('sha256').update(CORE).digest('hex');
        const liveMarker = (liveFoot.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null;
        const livePublicMarker = (liveFoot.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1] || null;
        if (
          liveFootSha === wantedFootSha &&
          (!wantVer || (liveMarker === wantVer && livePublicMarker === wantVer))
        ) {
          liveOk = true;
          liveError = null;
          break;
        }
      }
      liveError = `attempt ${i + 1}: ${
        liveHeadOk ? 'loader/version mismatch' : 'canonical unhide-v5 head markers missing'
      }`;
    } catch (error) {
      liveError = `attempt ${i + 1}: ${error?.message || error}`;
    }
    await sleep(4000);
  }
  console.log(JSON.stringify({ liveCdn, pub, footWanted, liveOk, liveError }, null, 2));
  process.exit(liveOk || NO_PUBLISH ? 0 : 5);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
