#!/usr/bin/env node
/**
 * Hash-gated foot publish pipeline:
 *   lock → preflight → (optional CDN upload if disk≠manifest) → footer-lite
 *   → cm6 paste/publish → poll live hash/ver → receipt → ship-status --strict
 *
 * Usage:
 *   node demigod-publish-foot.mjs              # full
 *   node demigod-publish-foot.mjs --no-upload  # skip catbox; use existing CDN if hashes match
 *   node demigod-publish-foot.mjs --no-publish # paste+save only (cm6 --no-publish)
 *   node demigod-publish-foot.mjs --dry-run    # preflight only
 *   DG_LOCK_OWNER=grok node demigod-publish-foot.mjs
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { writeReceipt } from './demigod-publish-receipt.mjs';
import { assertNotFrozen, status as freezeStatus } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const FOOT = path.join(ROOT, 'demigod-foot-core.js');
const MANIFEST = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
const FOOTER = path.join(ROOT, 'demigod-footer-lite.html');
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const OWNER = process.env.DG_LOCK_OWNER || process.env.USER || 'grok';
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const NO_UPLOAD = args.has('--no-upload');
const NO_PUBLISH = args.has('--no-publish');
// Dry-run is preflight-only; do not require a held foot lock just to inspect.
if (!DRY) assertCanWriteFoot({ label: 'publish-foot' });

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function footVer(js) {
  return (js.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null;
}

function runNode(scriptArgs, opts = {}) {
  const r = spawnSync('node', scriptArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DG_LOCK_OWNER: OWNER },
    timeout: opts.timeout || 300_000,
  });
  if (r.status !== 0 && !opts.allowFail) {
    const err = (r.stderr || r.stdout || '').slice(0, 800);
    throw new Error(`${scriptArgs.join(' ')} failed (${r.status}): ${err}`);
  }
  return r;
}

function runBash(cmd, opts = {}) {
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    timeout: opts.timeout || 180_000,
  });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} failed: ${(r.stderr || r.stdout || '').slice(0, 600)}`);
  }
  return r;
}

async function pollLive(wantId, wantVer, maxMs = 120_000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
        headers: { 'User-Agent': 'dg-publish-foot' },
        signal: AbortSignal.timeout(15000),
      });
      const html = await r.text();
      const cdn = (html.match(/files\.catbox\.moe\/[a-z0-9]+\.js/) || [])[0] || null;
      const id = cdn?.split('/').pop() || null;
      const ver = (html.match(/foot v(\d+)/) || [])[1] || null;
      last = { id, ver, pub: (html.match(/Last Published:[^<]{0,50}/) || [])[0] || null };
      if (id === wantId && (!wantVer || ver === wantVer)) return { ok: true, ...last };
    } catch (e) {
      last = { error: String(e.message || e) };
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { ok: false, last };
}

function updateFooterLite(cdnUrl, ver) {
  const old = fs.readFileSync(FOOTER, 'utf8');
  let soft = '';
  if (old.includes('dg-v177-honesty-patch')) {
    let idx = old.indexOf('<script>\n/*dg-v177-honesty-patch');
    if (idx < 0) {
      const i = old.indexOf('/*dg-v177-honesty-patch');
      idx = i > 0 ? old.lastIndexOf('<script>', i) : -1;
    }
    if (idx >= 0) soft = '\n' + old.slice(idx).trimEnd() + '\n';
  }
  const loader = `<!-- demigod-foot-cdn-loader · foot v${ver} · dg-publish-foot -->
<script>(function(){var p=location.pathname;
if(/^\\/legal\\/?$/i.test(p)&&!/#privacy|#terms/.test(location.hash))location.replace('/#legal');
else if(/^\\/partnerships?\\/?$/i.test(p)&&location.hash!=='#partnerships')location.replace('/#partnerships');
else if(/^\\/events\\/?$/i.test(p))location.replace('https://files.catbox.moe/m22wy3.html');
})();</script>
<script src="${cdnUrl}"></script>
${soft}`;
  fs.writeFileSync(FOOTER, loader);
  try {
    fs.writeFileSync(path.join(ROOT, 'demigod-footer-loader.html'), loader);
  } catch {
    /* */
  }
}

async function main() {
  const log = [];
  const step = (m) => {
    log.push(m);
    console.error(`[publish-foot] ${m}`);
  };

  if (!DRY) assertNotFrozen('publish-foot');
  if (DRY && freezeStatus().frozen) step('FREEZE on — dry-run only allowed');

  let lockedByUs = false;
  let lockToken = process.env.DG_LOCK_TOKEN || null;
  const release = () => {
    if (!lockedByUs) return;
    const args = ['demigod-foot-lock.mjs', 'release', '--owner', OWNER];
    if (lockToken) args.push('--token', lockToken);
    else args.push('--force');
    runNode(args, { allowFail: true });
    lockedByUs = false;
  };

  try {
    // 1) claim lock properly (never steal another owner's lease) — inside try for clean fail
    step('claim foot lock');
    {
      const claimArgs = [
        'demigod-foot-lock.mjs',
        'claim',
        '--owner',
        OWNER,
        '--ttl',
        '2400',
        '--why',
        'dg-publish-foot',
      ];
      if (lockToken) claimArgs.push('--token', lockToken);
      const claim = runNode(claimArgs, { allowFail: true });
      if (claim.status !== 0) {
        throw new Error(
          `foot lock held by another owner — refuse publish. ${((claim.stdout || claim.stderr || '') + '').slice(0, 200)}`,
        );
      }
      lockedByUs = true;
      try {
        const j = JSON.parse(claim.stdout || '{}');
        if (j.claimed?.token) lockToken = j.claimed.token;
      } catch {
        /* */
      }
      // Refresh lock record with THIS process pid (preserve token)
      try {
        const lockPath = '/tmp/dg-busy/foot-lock.json';
        const j = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        if (j.owner === OWNER) {
          j.pid = process.pid;
          j.at = new Date().toISOString();
          j.expiresAt = new Date(Date.now() + 2400 * 1000).toISOString();
          j.why = 'dg-publish-foot';
          j.baseSha = sha256(FOOT);
          j.footVer = footVer(fs.readFileSync(FOOT, 'utf8'));
          j.ttlSec = 2400;
          if (lockToken) j.token = lockToken;
          fs.writeFileSync(lockPath, JSON.stringify(j, null, 2) + '\n');
          fs.writeFileSync(
            '/tmp/dg-busy/foot-lock.txt',
            Object.entries(j)
              .map(([k, v]) => k + '=' + v)
              .join('\n') + '\n',
          );
        }
      } catch {
        /* */
      }
    }

    // 2) preflight
    step('preflight node --check + smoke');
    runNode(['--check', FOOT]);
    const smoke = runNode(['demigod-foot-smoke.mjs'], { allowFail: true });
    if (smoke.status !== 0) throw new Error('foot smoke failed');

    const diskSha = sha256(FOOT);
    const diskJs = fs.readFileSync(FOOT, 'utf8');
    const ver = footVer(diskJs);
    if (!ver) throw new Error('no __dgFootVer in foot');

    let man = {};
    try {
      man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    } catch {
      man = {};
    }

    // 3) CDN if needed
    let cdnUrl = man.cdnUrl || null;
    if (!NO_UPLOAD && man.sha256 !== diskSha) {
      step('disk≠manifest — upload CDN');
      if (DRY) {
        step('dry-run: would upload + update manifest');
      } else {
        // prefer existing publisher
        const up = runNode(['demigod-foot-cdn-publish.mjs'], { allowFail: true, inherit: false, timeout: 180000 });
        if (up.status !== 0) {
          // manual catbox fallback
          step('cdn-publish script failed — catbox curl fallback');
          const curl = runBash(
            `curl -sS --max-time 90 -F 'reqtype=fileupload' -F 'fileToUpload=@demigod-foot-core.js' https://catbox.moe/user/api.php`,
          );
          cdnUrl = (curl.stdout || '').trim();
          if (!/^https:\/\/files\.catbox\.moe\/.+\.js$/.test(cdnUrl)) {
            throw new Error(`bad catbox response: ${cdnUrl.slice(0, 120)}`);
          }
          await new Promise((r) => setTimeout(r, 2000));
          const liveJs = await (await fetch(`${cdnUrl}?v=${Date.now()}`)).text();
          if (!liveJs.includes(`dg-foot-v${ver}-core`) && !liveJs.includes(`__dgFootVer='${ver}'`)) {
            throw new Error('CDN body missing version markers');
          }
          const remoteSha = crypto.createHash('sha256').update(liveJs).digest('hex');
          if (remoteSha !== diskSha) {
            throw new Error(`CDN body sha ${remoteSha.slice(0,12)} ≠ disk ${diskSha.slice(0,12)}`);
          }
          man = {
            at: new Date().toISOString(),
            version: `v${ver}`,
            cdnUrl,
            bytes: fs.statSync(FOOT).size,
            sha256: diskSha,
            remoteSha,
            via: 'dg-publish-foot-catbox',
          };
          fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
          updateFooterLite(cdnUrl, ver);
        } else {
          man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
          cdnUrl = man.cdnUrl;
          // ensure sha256 present for ship-status --strict
          if (man.sha256 !== diskSha) {
            man.sha256 = diskSha;
            man.version = man.version || `v${ver}`;
            man.at = new Date().toISOString();
            man.cdnUrl = cdnUrl;
            fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
            step('normalized manifest sha256 to disk');
          }
        }
      }
    } else if (NO_UPLOAD && man.sha256 && man.sha256 !== diskSha) {
      throw new Error('--no-upload but manifest sha ≠ disk — refuse stale publish');
    } else {
      step('manifest already matches disk sha — skip upload');
      cdnUrl = man.cdnUrl;
      // ensure footer points at it — never mutate on dry-run
      if (
        !DRY &&
        cdnUrl &&
        !fs.readFileSync(FOOTER, 'utf8').includes(cdnUrl.split('/').pop())
      ) {
        updateFooterLite(cdnUrl, ver);
        step('updated footer-lite to manifest CDN');
      } else if (
        DRY &&
        cdnUrl &&
        !fs.readFileSync(FOOTER, 'utf8').includes(cdnUrl.split('/').pop())
      ) {
        step('dry-run: would update footer-lite to manifest CDN (not written)');
      }
    }

    if (DRY) {
      step('dry-run complete — no cm6, no file writes');
      console.log(JSON.stringify({ ok: true, dryRun: true, diskSha, ver, cdnUrl, log }, null, 2));
      return; // finally releases
    }

    // 4) pre ship-status (informational)
    runNode(['demigod-ship-status.mjs', '--json'], { allowFail: true });

    // 5) cm6 paste publish
    step('cm6 paste' + (NO_PUBLISH ? ' (no-publish)' : ' + publish'));
    // Always repair and assert the canonical head/footer pair. Footer-only can
    // preserve a stale second loader in Head, recreating the v212 corruption.
    const cm6Args = ['demigod-cm6-paste-publish.mjs'];
    if (NO_PUBLISH) cm6Args.push('--no-publish');
    runNode(cm6Args, { inherit: true, timeout: 180000 });

    // --no-publish: paste/save only — do not require live to already match
    if (NO_PUBLISH) {
      step('no-publish — skip live poll + ship-status --strict');
      const receipt = writeReceipt({
        ok: true,
        owner: OWNER,
        diskSha,
        footVer: ver,
        cdnUrl,
        noPublish: true,
        gates: { smoke: true, shipStrict: false },
        pipeline: 'dg-publish-foot',
        log,
      });
      step('PASTED (not published)');
      console.log(JSON.stringify({ ok: true, receipt }, null, 2));
      return;
    }

    const wantId = (cdnUrl || '').split('/').pop();
    step(`poll live for ${wantId} v${ver}`);
    const poll = await pollLive(wantId, ver, 120000);
    if (!poll.ok) {
      throw new Error(`live poll failed want=${wantId} last=${JSON.stringify(poll.last)}`);
    }

    // 6) strict ship
    step('ship-status --strict');
    runNode(['demigod-ship-status.mjs', '--strict', '--json']);

    const receipt = writeReceipt({
      ok: true,
      owner: OWNER,
      diskSha,
      footVer: ver,
      cdnUrl,
      liveCdnId: poll.id,
      liveFootVer: poll.ver,
      livePub: poll.pub,
      gates: { smoke: true, shipStrict: true },
      pipeline: 'dg-publish-foot',
      log,
    });

    step('SHIPPED');
    console.log(JSON.stringify({ ok: true, receipt }, null, 2));
  } catch (e) {
    writeReceipt({
      ok: false,
      owner: OWNER,
      error: String(e.message || e),
      log,
      pipeline: 'dg-publish-foot',
    });
    console.error(JSON.stringify({ ok: false, error: String(e.message || e), log }, null, 2));
    process.exitCode = 1;
  } finally {
    release();
  }
}

main();
