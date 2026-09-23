#!/usr/bin/env node
/**
 * Ship readiness checklist — freeze-aware, local-only truth.
 * CLI: node demigod-ship-checklist.mjs [--json]
 * Does NOT publish. Answers: "are we allowed / ready to ship foot?"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function checklistPath() {
  return path.join(dataRoot(), 'DEMIGOD-SHIP-CHECKLIST.json');
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function sha(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return null;
  }
}

function ageSec(file) {
  try {
    return Math.round((Date.now() - fs.statSync(file).mtimeMs) / 1000);
  } catch {
    return null;
  }
}

export function buildShipChecklist() {
  const root = dataRoot();
  const freeze = readJson(path.join(root, 'DEMIGOD-PUBLISH-FREEZE.json')) || {};
  const man = readJson(path.join(root, 'DEMIGOD-FOOT-CDN.json')) || {};
  const verify = readJson(path.join(root, 'DEMIGOD-VERIFY-SOURCE.json'));
  const boardH = readJson(path.join(root, 'DEMIGOD-BOARD-HONESTY.json'));
  const board = readJson(path.join(root, 'DEMIGOD-BOARD.json'));
  const smoke = readJson(path.join(root, 'DEMIGOD-AGENT-SMOKE.json'));
  const lock = readJson(path.join(root, 'DEMIGOD-FOOT-LOCK.json'));
  const core = path.join(root, 'demigod-foot-core.js');
  const diskSha = sha(core);
  const manSha = man.sha256 || null;
  const footM = ageSec(core);
  const verM = ageSec(path.join(root, 'DEMIGOD-VERIFY-SOURCE.json'));
  const verifyFresh = verM != null && footM != null ? verM <= footM + 5 || (verify?.pass && verM < 7200) : false;
  // better: verify mtime >= foot mtime - 2s
  let verifyVsFoot = false;
  try {
    const fm = fs.statSync(core).mtimeMs;
    const vm = fs.statSync(path.join(root, 'DEMIGOD-VERIFY-SOURCE.json')).mtimeMs;
    verifyVsFoot = vm + 2000 >= fm;
  } catch {
    verifyVsFoot = false;
  }

  const freezeOn = Boolean(freeze.on);
  const lockHeld = Boolean(lock && lock.expiresAt && Date.parse(lock.expiresAt) > Date.now());
  const roles = (board?.roles || []).length;
  const real = board?.signal?.realRoles ?? null;

  const items = [
    {
      id: 'freeze-off',
      ok: !freezeOn,
      title: 'Publish freeze OFF',
      detail: freezeOn ? `ON — ${freeze.why || ''}` : 'OFF',
      block: freezeOn,
    },
    {
      id: 'lock-free',
      ok: !lockHeld,
      title: 'Foot lock free',
      detail: lockHeld ? `held by ${lock.owner || '?'}` : 'free',
      block: lockHeld,
    },
    {
      id: 'verify-pass',
      ok: verify?.pass === true,
      title: 'verify:source PASS',
      detail: verify?.pass === true ? 'PASS' : verify?.pass === false ? 'FAIL' : 'missing',
      block: verify?.pass !== true,
    },
    {
      id: 'verify-fresh',
      ok: verifyVsFoot,
      title: 'verify fresher than foot-core',
      detail: verifyVsFoot ? 'fresh' : 'stale vs foot — re-run verify:source',
      block: !verifyVsFoot,
    },
    {
      id: 'disk-man-sha',
      ok: Boolean(diskSha && manSha && diskSha === manSha),
      title: 'disk sha == manifest sha',
      detail: diskSha && manSha ? (diskSha === manSha ? 'match' : 'mismatch') : 'missing sha',
      block: !(diskSha && manSha && diskSha === manSha),
    },
    {
      id: 'smoke-pass',
      ok: smoke?.corePass === true || smoke?.pass === true,
      title: 'agent-smoke core PASS',
      detail: smoke?.at ? `at ${smoke.at}` : 'no smoke yet',
      block: false, // warn not hard block
      warn: !(smoke?.corePass === true || smoke?.pass === true),
    },
    {
      id: 'board-honest',
      ok: roles <= 3 && (real === 0 || real == null || boardH?.pass === true),
      title: 'board honesty OK',
      detail: `roles=${roles} real=${real}`,
      block: roles > 3,
    },
    {
      id: 'board-audit',
      ok: fs.existsSync(path.join(root, 'DEMIGOD-BOARD-AUDIT.jsonl')),
      title: 'board audit log present',
      detail: fs.existsSync(path.join(root, 'DEMIGOD-BOARD-AUDIT.jsonl')) ? 'DEMIGOD-BOARD-AUDIT.jsonl' : 'missing',
      block: false,
      warn: !fs.existsSync(path.join(root, 'DEMIGOD-BOARD-AUDIT.jsonl')),
    },
    {
      id: 'pairs-ledger',
      ok: fs.existsSync(path.join(root, 'demigod-pairs-lib.mjs')),
      title: 'pair ledger module',
      detail: (() => {
        try {
          const p = readJson(path.join(root, 'DEMIGOD-PAIRS.json'));
          return `${Object.keys(p?.pairs || {}).length} pairs`;
        } catch {
          return 'module ok';
        }
      })(),
      block: false,
    },
  ];

  const blockers = items.filter((i) => i.block);
  const warnings = items.filter((i) => i.warn && !i.block);
  const ready = blockers.length === 0;

  return {
    at: new Date().toISOString(),
    ready,
    freezeOn,
    verifyAt: verify?.at ?? null,
    path: checklistPath(),
    blockers: blockers.map((b) => b.id),
    warnings: warnings.map((w) => w.id),
    items,
    sent: false,
    liveMail: false,
    livePublish: false,
    nextCmd: freezeOn
      ? 'node demigod-publish-freeze.mjs status  # freeze ON — do not ship'
      : ready
        ? 'node demigod-foot-cdn-publish.mjs && node demigod-cm6-paste-publish.mjs --footer-only'
        : 'fix blockers then re-run: node demigod-ship-checklist.mjs',
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({
      ok: false,
      error: 'publish_refused',
      sent: false,
      liveMail: false,
      livePublish: false,
    }));
    process.exit(1);
  }
  const c = buildShipChecklist();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(checklistPath(), JSON.stringify(c, null, 2) + '\n');
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(c, null, 2));
  } else {
    console.log(`# Ship checklist  ready=${c.ready}  freeze=${c.freezeOn ? 'ON' : 'OFF'}`);
    for (const i of c.items) {
      const mark = i.block ? '✗' : i.warn ? '!' : '✓';
      console.log(`${mark} ${i.title} — ${i.detail}`);
    }
    console.log(`\nnext: ${c.nextCmd}`);
  }
  process.exit(c.ready && !c.freezeOn ? 0 : 2);
}
