#!/usr/bin/env node
/**
 * demigod-truth — THE single state oracle (agents must use this, not invent drift checks)
 *
 *   bin/dg truth              # human summary
 *   bin/dg truth --json
 *   bin/dg truth --strict     # exit 1 unless fullyShipped (disk==CDN==live + board)
 *   bin/dg truth --require-match  # exit 1 if disk ver ≠ live ver (release mode)
 *
 * Also: node demigod-live-doctor.mjs  → thin alias of this tool
 *
 * Writes: /tmp/dg-busy/truth.json + truth.md
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { isFrozen } from './demigod-agent-tools-lib.mjs';
import { beginRun, sealRun, addArtifact } from './demigod-evidence.mjs';
import { appendFromTruth } from './demigod-version-ledger.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const asMd = args.includes('--md') || (!asJson && !args.includes('--quiet'));
const strict = args.includes('--strict');
const requireMatch =
  args.includes('--require-match') || process.env.DEMIGOD_REQUIRE_LIVE_MATCH === '1';
const quiet = args.includes('--quiet');

function sha256Buf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
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

async function fetchText(url) {
  const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, {
    headers: { 'User-Agent': 'demigod-truth' },
    signal: AbortSignal.timeout(22000),
  });
  const buf = Buffer.from(await r.arrayBuffer());
  return {
    ok: r.ok,
    status: r.status,
    contentType: r.headers.get('content-type') || '',
    text: buf.toString('utf8'),
    bytes: buf.length,
    sha256: sha256Buf(buf),
  };
}

async function main() {
  const footPath = path.join(ROOT, 'demigod-foot-core.js');
  const run = beginRun('truth', {
    scope: [footPath, path.join(ROOT, 'demigod-head-styles.css'), path.join(ROOT, 'demigod-footer-lite.html')],
  });
  const headCssPath = path.join(ROOT, 'demigod-head-styles.css');
  const manPath = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
  const footerPath = path.join(ROOT, 'demigod-footer-lite.html');
  const headMinPath = path.join(ROOT, 'demigod-head-minimal.html');
  const boardPath = path.join(ROOT, 'DEMIGOD-BOARD.json');
  const verifyPath = path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json');

  const footJs = readText(footPath);
  const diskSha = sha256File(footPath);
  const diskVer =
    (footJs.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] ||
    (footJs.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] ||
    null;
  const man = readJson(manPath) || {};
  const footer = readText(footerPath);
  const headMin = readText(headMinPath);
  const board = readJson(boardPath) || {};
  const verify = readJson(verifyPath);
  const freeze = isFrozen();

  const footerCdn =
    (footer.match(/src=["'](https:\/\/files\.catbox\.moe\/[a-z0-9]+\.js)["']/) || [])[1] || null;
  const headCssDiskUrl =
    (headMin.match(/https:\/\/files\.catbox\.moe\/[a-z0-9]+\.css/) || [])[0] || null;

  const syn = runNode(['--check', footPath]);
  const syntaxOk = syn.status === 0;
  const boardRun = runNode(['demigod-verify-board-honesty.mjs']);
  const boardOk = boardRun.status === 0;

  // Lock via CLI (handles expiry)
  let lock = { held: false, owner: null, expiresAt: null, free: true };
  {
    const st = runNode(['demigod-foot-lock.mjs', 'status'], 10000);
    try {
      const j = JSON.parse(st.out.slice(st.out.indexOf('{')));
      lock = {
        held: Boolean(j?.locked),
        free: !j?.locked,
        owner: j?.lock?.owner || null,
        expiresAt: j?.lock?.expiresAt || null,
        baseShaMatch: j?.baseShaMatch ?? null,
        footVer: j?.footVer || null,
      };
    } catch {
      /* */
    }
  }

  // Live HTML
  let liveHtml;
  try {
    liveHtml = await fetchText(LIVE + '/');
  } catch (e) {
    liveHtml = { ok: false, status: 0, text: '', err: String(e.message || e), sha256: null, bytes: 0 };
  }
  const liveFootUrl =
    (liveHtml.text.match(/src=["'](https:\/\/files\.catbox\.moe\/[a-z0-9]+\.js)["']/) || [])[1] ||
    null;
  const liveCssUrl =
    (liveHtml.text.match(/https:\/\/files\.catbox\.moe\/[a-z0-9]+\.css/) || [])[0] || null;

  let liveJs = null;
  let liveVer = null;
  let liveJsSha = null;
  if (liveFootUrl) {
    try {
      liveJs = await fetchText(liveFootUrl);
      liveVer = (liveJs.text.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || null;
      liveJsSha = liveJs.sha256;
    } catch (e) {
      liveJs = { ok: false, err: String(e.message || e) };
    }
  }

  const manId = (man.cdnUrl || '').match(/\/([a-z0-9]+\.js)/)?.[1] || null;
  const liveId = liveFootUrl?.match(/\/([a-z0-9]+\.js)/)?.[1] || null;
  const diskMatchesManifest = Boolean(diskSha && man.sha256 && diskSha === man.sha256);
  const liveMatchesManifest = Boolean(manId && liveId && manId === liveId);
  const diskEqualsLiveVer = Boolean(diskVer && liveVer && diskVer === liveVer);
  const liveBodyMatchesDisk = Boolean(diskSha && liveJsSha && diskSha === liveJsSha);

  // Intentional drift: freeze ON + disk ahead of live
  let driftExpected = false;
  if (diskVer && liveVer && diskVer !== liveVer && freeze.on && Number(diskVer) > Number(liveVer)) {
    driftExpected = true;
  }

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
      liveHtml.ok &&
      diskEqualsLiveVer &&
      liveBodyMatchesDisk &&
      boardOk &&
      (diskMatchesManifest || !man.sha256), // manifest optional if never published
  );

  const issues = [];
  const ok = [];
  if (!syntaxOk) issues.push('foot syntax fail');
  else ok.push(`disk foot v${diskVer} syntax ok`);
  if (liveHtml.ok) ok.push(`live HTML ${liveHtml.status}`);
  else issues.push(`live HTML fail ${liveHtml.err || liveHtml.status}`);
  if (liveFootUrl && liveVer) ok.push(`live foot ${liveFootUrl} v${liveVer}`);
  else if (liveHtml.ok) issues.push('no live foot CDN in HTML');
  if (diskEqualsLiveVer) ok.push(`disk==live ver v${diskVer}`);
  else if (diskVer && liveVer) {
    const msg = `version drift disk v${diskVer} != live v${liveVer}`;
    if (driftExpected) ok.push(`${msg} (freeze ON — intentional)`);
    else issues.push(msg);
  }
  if (liveBodyMatchesDisk) ok.push('live CDN body sha == disk');
  else if (liveJsSha && diskSha) {
    if (driftExpected) ok.push('CDN body ≠ disk (expected while freeze/disk-ahead)');
    else issues.push('live CDN body sha ≠ disk foot');
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
      sha256: diskSha,
      sha12: diskSha?.slice(0, 12) || null,
      bytes: footJs ? Buffer.byteLength(footJs) : null,
      syntaxOk,
    },
    headCss: {
      path: headCssPath,
      sha256: sha256File(headCssPath),
      diskUrl: headCssDiskUrl,
    },
    manifest: {
      version: man.version || null,
      cdnUrl: man.cdnUrl || null,
      cdnId: manId,
      sha256: man.sha256 || null,
      diskMatchesManifest,
    },
    footer: { pointsCdn: footerCdn, matchesManifest: Boolean(footerCdn && manId && footerCdn.endsWith(manId)) },
    live: {
      htmlOk: liveHtml.ok,
      htmlStatus: liveHtml.status,
      footUrl: liveFootUrl,
      footVer: liveVer,
      cssUrl: liveCssUrl,
      footSha256: liveJsSha,
      footBytes: liveJs?.bytes ?? null,
    },
    match: {
      diskEqualsLiveVer,
      liveBodyMatchesDisk,
      liveMatchesManifest,
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

  facts.summaryLine = `TRUTH ${pass ? 'PASS' : 'FAIL'} disk=v${diskVer} live=v${liveVer || '?'} freeze=${freeze.on ? 'ON' : 'OFF'} lock=${lock.held ? lock.owner : 'free'} board=${boardOk ? 'ok' : 'FAIL'} shipped=${fullyShipped}${driftExpected ? ' driftExpected' : ''}`;

  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'truth.json'), JSON.stringify(facts, null, 2) + '\n');
  // Alias for live-doctor consumers
  fs.writeFileSync(path.join(BUSY, 'live-doctor.json'), JSON.stringify(facts, null, 2) + '\n');

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
  // rewrite truth.json with evidence pointer
  fs.writeFileSync(path.join(BUSY, 'truth.json'), JSON.stringify(facts, null, 2) + '\n');
  fs.writeFileSync(path.join(BUSY, 'live-doctor.json'), JSON.stringify(facts, null, 2) + '\n');
  try {
    facts.ledgerLine = appendFromTruth(facts);
  } catch (e) {
    facts.ledgerError = String(e.message || e);
  }

  if (asJson) {
    console.log(JSON.stringify(facts, null, 2));
  } else if (!quiet) {
    console.log(`# truth ${pass ? 'PASS' : 'FAIL'} · disk v${diskVer} · live v${liveVer}`);
    for (const o of ok) console.log(`  ✓ ${o}`);
    for (const i of issues) console.log(`  ✗ ${i}`);
    console.log(facts.summaryLine);
    console.log(`report: ${path.join(BUSY, 'truth.json')}`);
  }

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
