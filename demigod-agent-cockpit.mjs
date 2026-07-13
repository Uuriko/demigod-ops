#!/usr/bin/env node
/**
 * Demigod Agent Cockpit — single source of "what should I do next"
 *
 * CLI:  node demigod-agent-cockpit.mjs [--json] [--md]
 * HTTP: mounted by demigod-agent-dashboard as /api/cockpit
 *
 * Designed for Grok/Codex/Fable session starts: one object, no false greens.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
  const boardHonesty = readJson(path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json'));

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
      const r = await fetch(`${LIVE}/?cb=${Date.now()}`, {
        headers: { 'User-Agent': 'dg-cockpit' },
        signal: AbortSignal.timeout(8000),
      });
      const html = await r.text();
      const cdnId = footScriptId(html);
      const foot = (html.match(/foot v(\d+)/) || [])[1] || null;
      live = {
        ok: r.ok,
        status: r.status,
        ms: Date.now() - t0,
        cdnId,
        footVer: foot,
        hasHiring: /I.?m hiring/i.test(html),
        hasFindJob: /Find a job/i.test(html),
      };
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
    board.realRoles = b.signal?.realRoles ?? null;
    board.pass = boardHonesty?.pass ?? (board.roles <= 3 && (board.realRoles === 0 || board.realRoles == null));
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

  const swarmDir = path.join(BUSY, 'swarm');
  let swarm = { present: false, reports: [] };
  if (fs.existsSync(swarmDir)) {
    const reports = [];
    const walk = (d) => {
      for (const name of fs.readdirSync(d)) {
        const fp = path.join(d, name);
        const st = fs.statSync(fp);
        if (st.isDirectory()) walk(fp);
        else if (/\.(md|json)$/.test(name)) {
          reports.push({
            name: path.relative(swarmDir, fp),
            ageSec: Math.round((Date.now() - st.mtimeMs) / 1000),
            bytes: st.size,
          });
        }
      }
    };
    try {
      walk(swarmDir);
      swarm = { present: true, reports: reports.sort((a, b) => a.ageSec - b.ageSec).slice(0, 20) };
    } catch {
      /* */
    }
  }

  // Derive ONE next action — never false green
  let next = null;
  if (!live.ok) {
    next = {
      pri: 0,
      id: 'live-down',
      title: 'Live site unreachable',
      cmd: 'curl -sS -I https://www.trydemigod.com/',
      mutate: false,
    };
  } else if (!liveEqDiskVer || !liveEqManId || !diskMatchesManifest) {
    next = {
      pri: freezeOn ? 2 : 1,
      id: 'ship-drift',
      title: freezeOn
        ? `Disk v${diskVer} ≠ live v${live.footVer || '?'} (freeze ON — wait for unfreeze)`
        : `Ship disk v${diskVer} to live (cdn ${manId || footerSrc || '?'})`,
      cmd: freezeOn
        ? 'node demigod-publish-freeze.mjs status'
        : 'node demigod-foot-cdn-publish.mjs && node demigod-cm6-paste-publish.mjs --footer-only',
      mutate: !freezeOn,
    };
  } else if (verify?.pass === false || verifyFresh === false) {
    next = {
      pri: 1,
      id: 'verify-source',
      title: verifyFresh === false ? 'Re-run verify:source (stale vs foot mtime)' : 'verify:source FAIL',
      cmd: 'npm run demigod:verify:source && node demigod-foot-smoke.mjs',
      mutate: false,
    };
  } else if (board.pass === false) {
    next = {
      pri: 1,
      id: 'board-honesty',
      title: 'Board honesty fail',
      cmd: 'node demigod-verify-board-honesty.mjs',
      mutate: false,
    };
  } else if (!cdp.up) {
    next = {
      pri: 2,
      id: 'cdp-up',
      title: 'CDP down — start Chrome for live tests',
      cmd: '~/agent-dev.sh up',
      mutate: false,
    };
  } else {
    next = {
      pri: 3,
      id: 'smoke',
      title: 'Site hash chain green — run agent smoke / GTM',
      cmd: 'node demigod-agent-smoke.mjs && cat /tmp/dg-busy/agent-smoke.json',
      mutate: false,
    };
  }

  const cockpit = {
    at,
    phase: 'GTM + pre-services honesty',
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
    swarm,
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
    agentStart: [
      'node demigod-agent-cockpit.mjs --md',
      'cat /tmp/dg-busy/AGENT-BRIEF.md',
      'node demigod-agent-smoke.mjs',
      next.cmd,
    ],
    rules: [
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
    fs.writeFileSync(path.join(BUSY, 'cockpit.json'), JSON.stringify(cockpit, null, 2));
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
  if (c.swarm?.present) {
    lines.push('');
    lines.push('## Swarm reports');
    for (const r of (c.swarm.reports || []).slice(0, 8)) {
      lines.push(`- ${r.ageSec}s ${r.name} (${r.bytes}b)`);
    }
  }
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
  process.exit(c.shipped || c.next.pri >= 3 ? 0 : c.next.pri <= 1 ? 2 : 0);
}
