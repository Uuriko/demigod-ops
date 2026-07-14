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

async function main() {
  const stages = [];
  const diskJs = fs.existsSync(FOOT) ? fs.readFileSync(FOOT, 'utf8') : '';
  const diskSha = sha256(FOOT);
  const disk = footMeta(diskJs);
  const man = readJson(MANIFEST) || {};
  const footer = fs.existsSync(FOOTER) ? fs.readFileSync(FOOTER, 'utf8') : '';
  // Prefer foot <script src=…> — product map strings list other catbox .js first
  const footerCdn =
    (footer.match(/src=["']https:\/\/files\.catbox\.moe\/[a-z0-9]+\.js["']/) || [])[0]?.replace(/^src=["']|["']$/g, '') ||
    (footer.match(/files\.catbox\.moe\/[a-z0-9]+\.js/) || [])[0] ||
    null;
  const manId = (man.cdnUrl || '').match(/\/([a-z0-9]+\.js)/)?.[1] || null;

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

  // stage: manifest matches disk sha
  const manShaOk = Boolean(man.sha256 && diskSha && man.sha256 === diskSha);
  stages.push({
    id: 'manifest_matches_disk',
    ok: manShaOk,
    detail: manShaOk
      ? `manifest ${man.version} == disk sha`
      : `disk≠manifest (upload CDN + update DEMIGOD-FOOT-CDN.json)`,
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
    const liveCdn =
      (text.match(/src=["']https:\/\/files\.catbox\.moe\/([a-z0-9]+\.js)["']/) || [])[1] ||
      (text.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/) || [])[1] ||
      null;
    const liveId = liveCdn?.split('/').pop() || null;
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

  const liveMatchesMan = Boolean(live.cdnId && manId && live.cdnId === manId);
  stages.push({
    id: 'live_matches_manifest',
    ok: liveMatchesMan,
    detail: liveMatchesMan
      ? `live ${live.cdnId} == manifest`
      : `live=${live.cdnId || '?'} man=${manId || '?'} — paste-publish footer`,
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

  const nextCmd = !syntaxOk
    ? 'node --check demigod-foot-core.js'
    : !manShaOk
      ? 'curl catbox upload + update DEMIGOD-FOOT-CDN.json + demigod-footer-lite.html'
      : !footerPoints
        ? 'update demigod-footer-lite.html script src to CDN'
        : !liveMatchesMan
          ? 'node demigod-cm6-paste-publish.mjs --footer-only  # needs CDP'
          : !cdnBody.matchDisk
            ? 'CDN body sha≠disk — re-upload catbox + update manifest'
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
      diskMatchesManifest: manShaOk,
      freezeOn: Boolean(readJson(path.join(BUSY, 'publish-freeze.json'))?.on),
    },
    disk: { ver: disk.ver, core: disk.core, sha256: diskSha },
    manifest: { version: man.version || null, cdnUrl: man.cdnUrl || null, sha256: man.sha256 || null },
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
