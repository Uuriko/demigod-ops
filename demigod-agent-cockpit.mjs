#!/usr/bin/env node
/**
 * demigod-agent-cockpit — single agent NEXT card (no false green)
 *
 *   node demigod-agent-cockpit.mjs [--json] [--md]
 *   HTTP: demigod-agent-dashboard /api/cockpit
 *
 * Prefer demigod-next.buildNext for canonical id/cmd; cockpit may override only for
 * live-down / board-honesty / verify-source failures. Writes /tmp/dg-busy/cockpit.json.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { buildNext } from './demigod-next.mjs';
import { cachedFetchText, writeJsonAuto, isFreshFile } from './demigod-perf-cache.mjs';
import { computeSignal } from './demigod-board-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const BUSY = '/tmp/dg-busy';
const LIVE = 'https://www.trydemigod.com';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function sha256File(p) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  } catch {
    return null;
  }
}

function run(cmd, timeout = 12000) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 2 * 1024 * 1024,
    }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim().slice(0, 400);
  }
}

function footScriptId(html) {
  const m =
    html.match(/src=["']https:\/\/files\.catbox\.moe\/([a-z0-9]+\.js)["']/) ||
    html.match(/files\.catbox\.moe\/([a-z0-9]+\.js)/);
  return m ? m[1] : null;
}

export async function buildCockpit({ skipLive = false, liveOverride = null } = {}) {
  const at = new Date().toISOString();
  const corePath = path.join(ROOT, 'demigod-foot-core.js');
  const footerPath = path.join(ROOT, 'demigod-footer-lite.html');
  const manPath = path.join(ROOT, 'DEMIGOD-FOOT-CDN.json');
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json')) || {};
  const truth = readJson(path.join(BUSY, 'truth.json'));
  const ship = readJson(path.join(BUSY, 'ship-status.json'));
  const verify = readJson(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json'));

  const core = readText(corePath);
  const footer = readText(footerPath);
  const man = readJson(manPath) || {};
  const diskSha = sha256File(corePath);
  const diskVer =
    (core.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] ||
    (core.match(/dgFootVersion\s*=\s*['"]v?(\d+)/) || [])[1] ||
    null;
  const footerSrc = footScriptId(footer);
  const manId = (man.cdnUrl || '').match(/\/([a-z0-9]+\.js)/)?.[1] || null;
  const manSha = man.sha256 || null;
  const diskMatchesManifest = Boolean(diskSha && manSha && diskSha === manSha);
  const footerPointsManifest = Boolean(manId && footerSrc === manId);

  let live = { ok: false };
  if (liveOverride && typeof liveOverride === 'object') {
    // Dashboard already probed live — reuse (avoid double network)
    const footVer =
      liveOverride.footVer ||
      (liveOverride.foot || '').toString().replace(/^foot\s*v?/i, '') ||
      null;
    live = {
      ok: !!liveOverride.ok,
      status: liveOverride.status,
      ms: liveOverride.ms,
      cdnId: liveOverride.cdnId || null,
      footVer: footVer || null,
      error: liveOverride.error,
      hasHiring: liveOverride.hasHiring,
      hasFindJob: liveOverride.hasFindJob,
    };
  } else if (!skipLive) {
    try {
      const t0 = Date.now();
      // Prefer fresh truth.json (no network)
      if (isFreshFile(path.join(BUSY, 'truth.json'), 20)) {
        const tr = readJson(path.join(BUSY, 'truth.json'));
        if (tr?.live) {
          live = {
            ok: Boolean(tr.live.htmlOk ?? tr.pass),
            status: tr.live.htmlStatus || 200,
            ms: Date.now() - t0,
            cdnId: (tr.live.footUrl || '').match(/\/([a-z0-9]+\.js)/)?.[1] || null,
            footVer: tr.live.footVer || null,
            fromTruth: true,
          };
        }
      }
      if (!live.ok && live.footVer == null) {
        const html = await cachedFetchText(LIVE + '/', {
          headers: { 'User-Agent': 'dg-cockpit' },
          timeoutMs: 8000,
        });
        const text = html.text || '';
        const cdnId = footScriptId(text);
        const foot = (text.match(/foot v(\d+)/) || [])[1] || null;
        live = {
          ok: html.ok,
          status: html.status,
          ms: Date.now() - t0,
          cdnId,
          footVer: foot,
          hasHiring: /I.?m hiring/i.test(text),
          hasFindJob: /Find a job/i.test(text),
          cached: html.cached || false,
        };
      }
    } catch (e) {
      live = { ok: false, error: String(e.message || e) };
    }
  }

  let cdp = { up: false };
  try {
    const list = await (await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
    cdp = {
      up: true,
      pages: (list || []).filter((t) => t.type === 'page').length,
      targets: (list || []).length,
    };
  } catch {
    cdp = { up: false };
  }

  // freshness of verify:source vs foot mtime
  let verifyFresh = null;
  try {
    const footM = fs.statSync(corePath).mtimeMs;
    const verM = fs.existsSync(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json'))
      ? fs.statSync(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json')).mtimeMs
      : 0;
    verifyFresh = verM >= footM - 2000;
  } catch {
    verifyFresh = false;
  }

  const freezeOn = Boolean(freeze.on);
  const liveEqDiskVer = Boolean(diskVer && live.footVer && String(diskVer) === String(live.footVer));
  const liveEqManId = Boolean(manId && live.cdnId && manId === live.cdnId);
  const shipped =
    live.ok &&
    liveEqDiskVer &&
    liveEqManId &&
    diskMatchesManifest &&
    footerPointsManifest &&
    !freezeOn;

  // board honesty: prefer file or quick run summary
  let board = { pass: null, roles: null, realRoles: null };
  try {
    const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD.json'), 'utf8'));
    board.roles = (b.roles || []).length;
    // Evidence, not the stored claim: recompute realRoles from the roles array (computeSignal filters
    // seeds via isSeedRole) instead of reading the stored b.signal.realRoles or trusting the stored
    // DEMIGOD-BOARD-HONESTY.json verdict. Both could be stale: a board with <=3 REAL roles but a
    // missing/stale signal read as honest-pass (null == null), and that drove the cockpit nextAction
    // (~line 252) and coord API off a stale file. Derive pass from the recomputed count.
    board.realRoles = computeSignal(b).realRoles;
    board.pass = board.roles <= 3 && board.realRoles === 0;
  } catch {
    /* */
  }

  const openaiSet = Boolean(process.env.OPENAI_API_KEY);
  // load from config if not in env
  if (!openaiSet) {
    try {
      const envFile = path.join(process.env.HOME || '', '.config/demigod/openai.env');
      if (fs.existsSync(envFile) && /OPENAI_API_KEY=.+\S/.test(fs.readFileSync(envFile, 'utf8'))) {
        /* present on disk */
      }
    } catch {
      /* */
    }
  }

  // ONE next: demigod-next is canonical (control + dash + ship agree).
  // Only override for live-down / board / verify hard fails that next builder may miss.
  let next = null;
  let nextSource = 'demigod-next';
  if (!live.ok) {
    next = {
      pri: 0,
      id: 'live-down',
      title: 'Live site unreachable',
      cmd: 'curl -sS -I https://www.trydemigod.com/',
      mutate: false,
      freezeBlocks: false,
    };
    nextSource = 'cockpit-live-down';
  } else if (board.pass === false) {
    next = {
      pri: 1,
      id: 'board-honesty',
      title: 'Board honesty fail',
      cmd: 'node demigod-verify-board-honesty.mjs',
      mutate: false,
      freezeBlocks: false,
    };
    nextSource = 'cockpit-board';
  } else if (verify?.pass === false) {
    next = {
      pri: 1,
      id: 'verify-source',
      title: 'verify:source FAIL',
      cmd: 'npm run demigod:verify:source && node demigod-foot-smoke.mjs',
      mutate: false,
      freezeBlocks: false,
    };
    nextSource = 'cockpit-verify';
  } else {
    try {
      const canon = buildNext({ truth, demand: readJson(path.join(BUSY, 'demand-status.json')) });
      next = {
        pri: canon.pri ?? 1,
        id: canon.id,
        title: canon.title,
        cmd: canon.cmd,
        mutate: !!canon.mutate,
        freezeBlocks: !!canon.freezeBlocks,
        reason: canon.reason,
        versions: canon.versions,
        truthEvidence: canon.truthEvidence,
      };
    } catch {
      next = {
        pri: 0,
        id: 'truth',
        title: 'Refresh truth (next builder failed)',
        cmd: 'bin/dg truth',
        mutate: false,
        freezeBlocks: false,
      };
      nextSource = 'cockpit-fallback';
    }
  }

  const cockpit = {
    at,
    freeze: { on: freezeOn, why: freeze.why || null, at: freeze.at || null },
    foot: {
      diskVer,
      diskSha12: diskSha ? diskSha.slice(0, 12) : null,
      diskSha,
      manifestVer: man.version || null,
      manifestCdn: man.cdnUrl || null,
      manId,
      manSha12: manSha ? manSha.slice(0, 12) : null,
      footerSrc,
      diskMatchesManifest,
      footerPointsManifest,
    },
    live: {
      ...live,
      liveEqDiskVer,
      liveEqManId,
    },
    gates: {
      verifySourcePass: verify?.pass ?? null,
      verifyFresh,
      boardHonestyPass: board.pass,
      boardRoles: board.roles,
      boardRealRoles: board.realRoles,
    },
    cdp,
    env: {
      OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
      openaiEnvFile: fs.existsSync(path.join(process.env.HOME || '', '.config/demigod/openai.env')),
    },
    truth: truth
      ? {
          fullyShipped: truth.match?.fullyShipped,
          liveEqDisk: truth.claims?.['live==disk'],
          at: truth.at || null,
        }
      : null,
    ship: ship
      ? {
          stage: ship.stage,
          shipped: ship.shipped,
          nextCmd: ship.nextCmd,
        }
      : null,
    shipped,
    next,
    nextSource,
    agentStart: [
      'bin/dg truth',
      'bin/dg next-canon',
      'node demigod-agent-cockpit.mjs --md',
      next.cmd,
    ],
    rules: [
      'NEXT comes from demigod-next (or live-down/board/verify override)',
      'Never treat verify:source alone as deployed truth',
      'Never ship while freeze.on',
      'Mutating cmds only when freeze off + lock free',
      'One foot-core writer',
      'No game work',
    ],
  };

  // persist
  try {
    fs.mkdirSync(BUSY, { recursive: true });
    writeJsonAuto(path.join(BUSY, 'cockpit.json'), cockpit);
    fs.writeFileSync(path.join(BUSY, 'cockpit.md'), toMarkdown(cockpit));
  } catch {
    /* */
  }
  return cockpit;
}

export function toMarkdown(c) {
  const lines = [];
  lines.push('# Demigod AGENT COCKPIT');
  lines.push(`at: ${c.at}`);
  lines.push(`freeze: ${c.freeze.on ? 'ON' : 'OFF'}${c.freeze.why ? ' — ' + c.freeze.why : ''}`);
  lines.push('');
  lines.push('## Hash chain');
  lines.push(`- disk: v${c.foot.diskVer} sha ${c.foot.diskSha12}…`);
  lines.push(`- manifest: ${c.foot.manifestVer} ${c.foot.manId} matchDisk=${c.foot.diskMatchesManifest}`);
  lines.push(`- footer src: ${c.foot.footerSrc} pointsMan=${c.foot.footerPointsManifest}`);
  lines.push(
    `- live: ok=${c.live.ok} v${c.live.footVer} cdn=${c.live.cdnId} eqVer=${c.live.liveEqDiskVer} eqId=${c.live.liveEqManId}`,
  );
  lines.push(`- shipped(all green): ${c.shipped}`);
  lines.push('');
  lines.push('## Gates');
  lines.push(
    `- verify:source: ${c.gates.verifySourcePass} fresh=${c.gates.verifyFresh}`,
  );
  lines.push(
    `- board honesty: ${c.gates.boardHonestyPass} roles=${c.gates.boardRoles} real=${c.gates.boardRealRoles}`,
  );
  lines.push(`- cdp: ${c.cdp.up ? 'UP' : 'DOWN'} pages=${c.cdp.pages ?? 0}`);
  lines.push(`- openai_key env: ${c.env.OPENAI_API_KEY} file: ${c.env.openaiEnvFile}`);
  lines.push('');
  lines.push('## NEXT (do this)');
  lines.push(`- [P${c.next.pri}] ${c.next.title}`);
  lines.push(`  mutate: ${c.next.mutate}`);
  lines.push(`  cmd: \`${c.next.cmd}\``);
  lines.push('');
  lines.push('## Session start');
  for (const s of c.agentStart) lines.push(`- \`${s}\``);
  lines.push('');
  lines.push('## Rules');
  for (const r of c.rules) lines.push(`- ${r}`);
  return lines.join('\n') + '\n';
}

// CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const c = await buildCockpit({ skipLive: args.has('--offline') });
  if (args.has('--json')) {
    console.log(JSON.stringify(c, null, 2));
  } else {
    console.log(toMarkdown(c));
  }
  // 0 = idle/shipped/low urgency; 2 = attention (non-mutate still ok for agents)
  const code = c.shipped || c.next.pri >= 3 ? 0 : c.next.pri <= 1 ? 2 : 0;
  process.exit(code);
}
