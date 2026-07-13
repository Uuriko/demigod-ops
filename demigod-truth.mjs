#!/usr/bin/env node
/**
 * demigod-truth — single verified facts blob (no prose claims).
 * Fable/Grok/Codex should inject this into plans, not re-narrate.
 *
 * Usage:
 *   node demigod-truth.mjs
 *   node demigod-truth.mjs --json
 *   node demigod-truth.mjs --md
 *   node demigod-truth.mjs --strict   # exit 1 if live≠disk or board fail
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const asJson = process.argv.includes('--json') || !process.argv.includes('--md');
const asMd = process.argv.includes('--md');
const strict = process.argv.includes('--strict');

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

function readText(file, max = 200_000) {
  try {
    const s = fs.readFileSync(file, 'utf8');
    return s.length > max ? s.slice(0, max) : s;
  } catch {
    return null;
  }
}

function runNode(args, timeout = 30000) {
  const r = spawnSync('node', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: r.status,
    out: ((r.stdout || '') + (r.stderr || '')).trim(),
  };
}

async function main() {
  const footPath = path.join(ROOT, 'demigod-foot-core.js');
  const manPath = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
  const boardPath = path.join(ROOT, 'DEMIGOD-BOARD.json');
  const footerPath = path.join(ROOT, 'demigod-footer-lite.html');
  const verifyPath = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');

  const footJs = readText(footPath) || '';
  const diskSha = sha256(footPath);
  const diskVer =
    (footJs.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] ||
    (footJs.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] ||
    null;
  const man = readJson(manPath) || {};
  const board = readJson(boardPath) || {};
  const verify = readJson(verifyPath);
  const footer = readText(footerPath) || '';
  // Prefer real foot <script src=…> — product map strings list other catbox .js first in footer-lite
  const footerCdn =
    (footer.match(/src=["']https:\/\/files\.catbox\.moe\/[a-z0-9]+\.js["']/) || [])[0]?.replace(/^src=["']|["']$/g, '') ||
    (footer.match(/files\.catbox\.moe\/[a-z0-9]+\.js/) || [])[0] ||
    null;

  // syntax
  const syn = runNode(['--check', footPath]);
  const syntaxOk = syn.status === 0;

  // board honesty
  const boardRun = runNode(['demigod-verify-board-honesty.mjs']);
  const boardOk = boardRun.status === 0;

  // lock
  // Prefer lock CLI (handles legacy/corrupt/expiry)
  let lockHeld = false;
  let lockOwner = null;
  let lockExpires = null;
  {
    const st = runNode(['demigod-foot-lock.mjs', 'status'], 10000);
    try {
      const start = st.out.indexOf('{');
      const end = st.out.lastIndexOf('}');
      const j = start >= 0 ? JSON.parse(st.out.slice(start, end + 1)) : null;
      lockHeld = Boolean(j?.locked);
      lockOwner = j?.lock?.owner || null;
      lockExpires = j?.lock?.expiresAt || null;
    } catch {
      const lock = readJson(path.join(BUSY, 'foot-lock.json'));
      const lockExpired = lock?.expiresAt && Date.parse(lock.expiresAt) < Date.now();
      lockHeld = Boolean(lock && !lockExpired);
      lockOwner = lockHeld ? lock.owner : null;
      lockExpires = lockHeld ? lock.expiresAt : null;
    }
  }

  // live probe
  let live = { ok: false, status: null, cdnId: null, foot: null, ms: null, err: null };
  const t0 = Date.now();
  try {
    const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'dg-truth' },
      signal: AbortSignal.timeout(12000),
    });
    const html = await r.text();
    // Product map in footer HTML lists hire/talent/… before foot-core src= — match script src only
    const cdn =
      (html.match(/src=["']https:\/\/files\.catbox\.moe\/([a-z0-9]+\.js)["']/) || [])[1] ||
      (html.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/) || [])[1] ||
      null;
    live = {
      ok: r.ok,
      status: r.status,
      cdnId: cdn,
      foot: (html.match(/foot v\d+/) || [])[0] || null,
      ms: Date.now() - t0,
      err: null,
    };
  } catch (e) {
    live = { ok: false, status: null, cdnId: null, foot: null, ms: Date.now() - t0, err: String(e.message || e) };
  }

  const manId = (man.cdnUrl || '').match(/\/([a-z0-9]+\.js)/)?.[1] || null;
  const diskMatchesManifest = Boolean(diskSha && man.sha256 && diskSha === man.sha256);
  const liveMatchesManifest = Boolean(manId && live.cdnId && manId === live.cdnId);
  const liveMatchesDiskVer = Boolean(diskVer && live.foot && live.foot.includes(`v${diskVer}`));

  // CDN body hash (project rule: never claim live==disk without body hash)
  let cdnBody = { ok: false, sha256: null, matchDisk: null, err: null, bytes: null };
  if (man.cdnUrl) {
    try {
      const cr = await fetch(`${man.cdnUrl}?v=${Date.now()}`, {
        headers: { 'User-Agent': 'dg-truth-cdn' },
        signal: AbortSignal.timeout(20000),
      });
      const body = Buffer.from(await cr.arrayBuffer());
      const csha = crypto.createHash('sha256').update(body).digest('hex');
      cdnBody = {
        ok: cr.ok,
        sha256: csha,
        sha12: csha.slice(0, 12),
        matchDisk: Boolean(diskSha && csha === diskSha),
        matchManifest: Boolean(man.sha256 && csha === man.sha256),
        bytes: body.length,
        err: null,
      };
    } catch (e) {
      cdnBody = { ok: false, sha256: null, matchDisk: false, err: String(e.message || e) };
    }
  }

  const roles = board.roles || [];
  const signal = board.signal || {
    realRoles: roles.filter((r) => !r.sample).length,
    sampleRoles: roles.filter((r) => r.sample).length,
    realReceipts: (board.receipts || []).filter((r) => !r.sample).length,
  };

  const facts = {
    at: new Date().toISOString(),
    host: (() => {
      try {
        return fs.readFileSync('/etc/hostname', 'utf8').trim();
      } catch {
        return 'local';
      }
    })(),
    liveUrl: LIVE,
    foot: {
      path: footPath,
      ver: diskVer,
      sha256: diskSha,
      sha12: diskSha ? diskSha.slice(0, 12) : null,
      bytes: (() => {
        try {
          return fs.statSync(footPath).size;
        } catch {
          return null;
        }
      })(),
      syntaxOk,
    },
    manifest: {
      version: man.version || null,
      cdnUrl: man.cdnUrl || null,
      cdnId: manId,
      sha256: man.sha256 || null,
      diskMatchesManifest,
    },
    footer: {
      pointsCdn: footerCdn,
      matchesManifest: Boolean(footerCdn && manId && footerCdn.endsWith(manId)),
    },
    live,
    cdnBody,
    match: {
      liveMatchesManifest,
      liveMatchesDiskVer,
      footerMatchesManifest: Boolean(footerCdn && manId && footerCdn.endsWith(manId)),
      cdnBodyMatchesDisk: cdnBody.matchDisk === true,
      // Align with ship-status + hash rule: CDN body sha must equal disk
      fullyShipped: Boolean(
        syntaxOk &&
          diskMatchesManifest &&
          liveMatchesManifest &&
          liveMatchesDiskVer &&
          live.ok &&
          boardOk &&
          cdnBody.matchDisk === true,
      ),
    },
    board: {
      honestyOk: boardOk,
      roles: roles.length,
      signal,
    },
    gates: {
      verifySourcePass: verify?.pass ?? null,
      verifySourceAt: verify?.at ?? null,
    },
    lock: {
      held: lockHeld,
      owner: lockHeld ? lockOwner : null,
      expiresAt: lockHeld ? lockExpires : null,
    },
    tools: {
      preflight: readJson(path.join(BUSY, 'preflight-latest.json'))?.pass ?? null,
      shipStage: readJson(path.join(BUSY, 'ship-status.json'))?.stage ?? null,
      selftest: readJson(path.join(BUSY, 'tools-selftest.json'))?.pass ?? null,
    },
  };

  // claims agents must not make without these
  const me = process.env.DG_LOCK_OWNER || process.env.USER || 'agent';
  facts.claims = {
    'live==disk': facts.match.fullyShipped,
    board_honest: boardOk,
    can_edit_foot: !lockHeld || lockOwner === me,
  };

  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'truth.json'), JSON.stringify(facts, null, 2) + '\n');

  const md = [
    `# Demigod TRUTH ${facts.at}`,
    `- foot disk: v${facts.foot.ver} sha=${facts.foot.sha12}… syntax=${facts.foot.syntaxOk}`,
    `- manifest: ${facts.manifest.version} ${facts.manifest.cdnId} diskMatch=${facts.manifest.diskMatchesManifest}`,
    `- live: ok=${facts.live.ok} ${facts.live.foot || ''} cdn=${facts.live.cdnId} matchMan=${facts.match.liveMatchesManifest}`,
    `- fullyShipped: ${facts.match.fullyShipped}`,
    `- cdnBody: matchDisk=${facts.cdnBody?.matchDisk} sha=${facts.cdnBody?.sha12 || '?'}…`,
    `- board: honesty=${facts.board.honestyOk} roles=${facts.board.roles} realRoles=${facts.board.signal.realRoles ?? '?'}`,
    `- lock: ${facts.lock.held ? 'HELD ' + facts.lock.owner : 'free'}`,
    `- verify:source: ${facts.gates.verifySourcePass}`,
    `- claims.live==disk: ${facts.claims['live==disk']}`,
  ].join('\n');
  fs.writeFileSync(path.join(BUSY, 'truth.md'), md + '\n');

  if (asMd && !process.argv.includes('--json')) {
    console.log(md);
  } else if (asJson && !asMd) {
    console.log(JSON.stringify(facts, null, 2));
  } else {
    console.log(md);
    if (process.argv.includes('--json')) console.log(JSON.stringify(facts, null, 2));
  }
  console.error(`wrote ${path.join(BUSY, 'truth.json')} ${path.join(BUSY, 'truth.md')}`);

  if (strict && !facts.match.fullyShipped) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
