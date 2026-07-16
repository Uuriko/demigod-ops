#!/usr/bin/env node
/**
 * Ship state machine: disk foot → CDN manifest → live HTML
 *
 * Stages:
 *   disk_ok → manifest_matches_disk → live_matches_manifest → documented
 *
 * Usage:
 *   node demigod-ship-status.mjs
 *   node demigod-ship-status.mjs --json
 *   node demigod-ship-status.mjs --strict   # exit 1 if not fully shipped
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { cachedFetchText, writeJsonAuto } from './demigod-perf-cache.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const MANIFEST = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const FOOTER = path.join(ROOT, 'demigod-footer-lite.html');
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const BUSY = '/tmp/dg-busy';
const OUT = path.join(BUSY, 'ship-status.json');
const strict = process.argv.includes('--strict');
// default human-readable; --json for machines
const asJson = process.argv.includes('--json');

function sha256(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

function footMeta(js) {
  if (!js) return {};
  return {
    ver: (js.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null,
    core: (js.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
  };
}

function canonicalFootLoaderUrl(html) {
  const tags = [...String(html || '').matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
  const tag = tags.find((value) => /\bid=["']demigod-foot-cdn-loader["']/i.test(value))
    || tags.find((value) => /\bsrc=["']https?:\/\/[^"']*\/foot-latest\.js(?:[?#][^"']*)?["']/i.test(value));
  return (tag?.match(/\bsrc=["'](https?:\/\/[^"'\s<>]+)["']/i) || [])[1] || null;
}

function assetId(rawUrl) {
  try {
    return new URL(rawUrl).pathname.split('/').filter(Boolean).pop() || null;
  } catch {
    return null;
  }
}

/** Strip query/hash; HTTPS only — same contract as demigod-truth canonicalAssetUrl. */
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

async function main() {
  const stages = [];
  const diskJs = fs.existsSync(FOOT) ? fs.readFileSync(FOOT, 'utf8') : '';
  const diskSha = sha256(FOOT);
  const disk = footMeta(diskJs);
  const man = readJson(MANIFEST) || {};
  const footer = fs.existsSync(FOOTER) ? fs.readFileSync(FOOTER, 'utf8') : '';
  // Pin the identified/canonical foot loader; unrelated product-map scripts must not win.
  const footerCdn = canonicalFootLoaderUrl(footer);
  const manId = assetId(man.cdnUrl);

  // stage: disk
  const diskOk = Boolean(disk.ver && diskSha);
  stages.push({
    id: 'disk_ok',
    ok: diskOk,
    detail: diskOk ? `v${disk.ver} sha=${diskSha.slice(0, 12)}…` : 'missing foot-core',
  });

  // stage: syntax
  let syntaxOk = false;
  try {
    const { spawnSync } = await import('child_process');
    const r = spawnSync('node', ['--check', FOOT], { encoding: 'utf8' });
    syntaxOk = r.status === 0;
  } catch {
    syntaxOk = false;
  }
  stages.push({ id: 'disk_syntax', ok: syntaxOk, detail: syntaxOk ? 'node --check pass' : 'syntax fail' });

  // stage: footer-lite points at manifest CDN
  const footerPoints =
    man.cdnUrl && footer.includes(manId || '___')
      ? true
      : Boolean(footerCdn && manId && footerCdn.includes(manId));
  stages.push({
    id: 'footer_lite_points_cdn',
    ok: footerPoints,
    detail: footerCdn ? `footer→${footerCdn}` : 'no catbox in footer-lite',
  });

  // stage: manifest carries the complete attested disk identity. SHA equality
  // alone is insufficient: stale/malformed metadata must not advance shipping
  // to CM6 even when it happens to reference the same bytes.
  const diskBytes = Buffer.byteLength(diskJs);
  const normalizedManifestVersion = String(man.version || '').replace(/^v/i, '');
  const normalizedManifestFootVer = String(man.footVer || '').replace(/^v/i, '');
  const manShaOk = Boolean(man.sha256 && diskSha && man.sha256 === diskSha);
  const manBytesOk = Number.isSafeInteger(man.bytes) && man.bytes === diskBytes;
  const manVersionOk = Boolean(disk.ver && normalizedManifestVersion === disk.ver);
  const manMarkersAgree = Boolean(
    normalizedManifestVersion && normalizedManifestVersion === normalizedManifestFootVer,
  );
  const manifestMatchesDisk = Boolean(
    man.ok === true && manShaOk && manBytesOk && manVersionOk && manMarkersAgree,
  );
  stages.push({
    id: 'manifest_matches_disk',
    ok: manifestMatchesDisk,
    detail: manifestMatchesDisk
      ? `attested manifest v${normalizedManifestVersion} == disk identity`
      : `disk≠manifest identity (upload CDN + update DEMIGOD-FOOT-CDN.json)`,
  });

  // stage: live probe (shared 15s cache with truth)
  let live = { ok: false };
  try {
    const html = await cachedFetchText(LIVE + '/', {
      headers: { 'User-Agent': 'dg-ship-status' },
      timeoutMs: 15000,
      bust: process.argv.includes('--no-cache'),
    });
    const text = html.text || '';
    const liveCdn = canonicalFootLoaderUrl(text);
    const liveId = assetId(liveCdn);
    const liveFoot = (text.match(/foot v(\d+)/) || [])[1] || null;
    const pub = (text.match(/Last Published:[^<]{0,60}/) || [])[0] || null;
    live = {
      ok: html.ok,
      status: html.status,
      cdn: liveCdn,
      cdnId: liveId,
      footVer: liveFoot,
      pub,
      cached: html.cached || false,
    };
  } catch (e) {
    live = { ok: false, error: String(e.message || e) };
  }

  stages.push({
    id: 'live_reachable',
    ok: Boolean(live.ok),
    detail: live.ok ? `HTTP ${live.status}` : live.error || 'unreachable',
  });

  // Full CDN URL (not basename foot-latest.js alone) — basename-only matched every jsDelivr pin.
  const liveCdnCanon = canonicalAssetUrl(live.cdn);
  const manCdnCanon = canonicalAssetUrl(man.cdnUrl);
  const liveMatchesMan = Boolean(liveCdnCanon && manCdnCanon && liveCdnCanon === manCdnCanon);
  const cdnPin = (u) => {
    const m = String(u || '').match(/@([0-9a-f]{7,40})\//i);
    return m ? m[1].slice(0, 12) : assetId(u) || '?';
  };
  stages.push({
    id: 'live_matches_manifest',
    ok: liveMatchesMan,
    detail: liveMatchesMan
      ? `live CDN == manifest @${cdnPin(manCdnCanon)}`
      : `live≠man CDN — paste-publish footer (live@${cdnPin(liveCdnCanon)} man@${cdnPin(manCdnCanon)})`,
  });

  const liveMatchesDiskVer = Boolean(live.footVer && disk.ver && live.footVer === disk.ver);
  stages.push({
    id: 'live_matches_disk_ver',
    ok: liveMatchesDiskVer,
    detail: liveMatchesDiskVer
      ? `live foot v${live.footVer}`
      : `live v${live.footVer || '?'} disk v${disk.ver || '?'}`,
  });

  // CDN body hash (project rule: hash real bytes, not just URL id)
  let cdnBody = { ok: false, matchDisk: false, sha12: null, err: null };
  if (man.cdnUrl) {
    try {
      const cr = await cachedFetchText(man.cdnUrl, {
        headers: { 'User-Agent': 'dg-ship-status-cdn' },
        timeoutMs: 20000,
        ttlMs: 20000,
        bust: process.argv.includes('--no-cache'),
      });
      const csha = cr.sha256;
      cdnBody = {
        ok: cr.ok,
        matchDisk: Boolean(diskSha && csha === diskSha),
        matchManifest: Boolean(man.sha256 && csha === man.sha256),
        sha12: csha ? csha.slice(0, 12) : null,
        sha256: csha,
        err: null,
        cached: cr.cached || false,
      };
    } catch (e) {
      cdnBody = { ok: false, matchDisk: false, sha12: null, err: String(e.message || e) };
    }
  }
  stages.push({
    id: 'cdn_body_matches_disk',
    ok: cdnBody.matchDisk === true,
    detail: cdnBody.matchDisk
      ? `CDN body sha=${cdnBody.sha12}… == disk`
      : cdnBody.err || `CDN body≠disk (sha=${cdnBody.sha12 || '?'})`,
  });

  // lock (respect expiry)
  let lock = null;
  try {
    if (fs.existsSync(path.join(BUSY, 'foot-lock.json'))) {
      const j = JSON.parse(fs.readFileSync(path.join(BUSY, 'foot-lock.json'), 'utf8'));
      const exp = j.expiresAt && Date.parse(j.expiresAt) < Date.now();
      lock = exp ? null : j;
    }
  } catch {
    /* */
  }

  const allOk = stages.every((s) => s.ok);
  const next = stages.find((s) => !s.ok);

  // Include liveMatchesDiskVer — without it nextCmd can say "all green" while stage=live_matches_disk_ver (disk≫live).
  const nextCmd = !syntaxOk
    ? 'node --check demigod-foot-core.js'
    : !manifestMatchesDisk
      ? 'bin/dg ship cdn  # guarded upload + atomic manifest/footer update'
      : !footerPoints
        ? 'update demigod-footer-lite.html script src to CDN'
        : !liveMatchesMan
          ? 'node demigod-cm6-paste-publish.mjs  # repairs + verifies head/footer; needs CDP'
          : !liveMatchesDiskVer
            ? 'node demigod-cm6-paste-publish.mjs  # live foot ver lags disk; paste footer after CDN'
            : !cdnBody.matchDisk
              ? 'bin/dg ship cdn  # CDN body drift: guarded re-upload + atomic manifest/footer update'
              : !live.ok
                ? `curl -I ${LIVE}/`
                : 'all green — no ship needed';

  // Stage next (hash chain) is NOT the agent NEXT — attach canonical buildNext separately
  let nextCanon = null;
  try {
    const { buildNext } = await import('./demigod-next.mjs');
    nextCanon = buildNext();
  } catch {
    nextCanon = null;
  }

  const report = {
    at: new Date().toISOString(),
    shipped: allOk,
    stage: allOk ? 'cdn_body_matches_disk' : next?.id || 'unknown',
    nextAction: next ? next.detail : 'fully shipped',
    nextCmd,
    /** Agent-facing NEXT (demigod-next). Prefer this over nextCmd for "what do I do". */
    nextCanon: nextCanon
      ? { id: nextCanon.id, title: nextCanon.title, cmd: nextCanon.cmd, reason: nextCanon.reason }
      : null,
    facts: {
      diskVer: disk.ver,
      liveVer: live.footVer || null,
      manVer: man.version || null,
      liveCdnId: cdnPin(liveCdnCanon),
      manCdnId: cdnPin(manCdnCanon),
      diskMatchesManifest: manifestMatchesDisk,
      freezeOn: Boolean(readJson(path.join(BUSY, 'publish-freeze.json'))?.on),
    },
    disk: { ver: disk.ver, core: disk.core, sha256: diskSha },
    manifest: {
      version: man.version || null,
      footVer: man.footVer || null,
      cdnUrl: man.cdnUrl || null,
      sha256: man.sha256 || null,
      bytes: Number.isSafeInteger(man.bytes) ? man.bytes : null,
      attested: man.ok === true,
      identityChecks: {
        sha: manShaOk,
        bytes: manBytesOk,
        version: manVersionOk,
        markersAgree: manMarkersAgree,
      },
    },
    footerLiteCdn: footerCdn,
    live,
    cdnBody,
    lock,
    stages,
  };

  try {
    writeJsonAuto(OUT, report);
  } catch {
    /* */
  }

  if (asJson) {
    console.log(process.env.DEMIGOD_JSON_PRETTY === '1' ? JSON.stringify(report, null, 2) : JSON.stringify(report));
  } else {
    console.log(`ship-status  ${allOk ? 'SHIPPED ✓' : 'INCOMPLETE'}`);
    console.log(`stage        ${report.stage}`);
    for (const s of stages) {
      console.log(`  ${s.ok ? '✓' : '✗'} ${s.id.padEnd(28)} ${s.detail}`);
    }
    console.log(`next         ${report.nextAction}`);
    console.log(`cmd          ${nextCmd}`);
    console.log(`wrote        ${OUT}`);
  }

  if (strict && !allOk) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
