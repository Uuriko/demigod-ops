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

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';

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
  const freeze = readJson(path.join(BUSY, 'publish-freeze.json')) || {};
  const man = readJson(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json')) || {};
  const verify = readJson(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json'));
  const boardH = readJson(path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json'));
  const board = readJson(path.join(ROOT, 'DEMIGOD-BOARD.json'));
  const smoke = readJson(path.join(BUSY, 'agent-smoke.json'));
  const lock = readJson(path.join(BUSY, 'foot-lock.json'));
  const core = path.join(ROOT, 'demigod-foot-core.js');
  const diskSha = sha(core);
  const manSha = man.sha256 || null;
  const footM = ageSec(core);
  const verM = ageSec(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json'));
  const verifyFresh = verM != null && footM != null ? verM <= footM + 5 || (verify?.pass && verM < 7200) : false;
  // better: verify mtime >= foot mtime - 2s
  let verifyVsFoot = false;
  try {
    const fm = fs.statSync(core).mtimeMs;
    const vm = fs.statSync(path.join(ROOT, 'DEMIGOD-VERIFY-SOURCE.json')).mtimeMs;
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
      ok: fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')),
      title: 'board audit log present',
      detail: fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')) ? 'DEMIGOD-BOARD-AUDIT.jsonl' : 'missing',
      block: false,
      warn: !fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')),
    },
    {
      id: 'pairs-ledger',
      ok: fs.existsSync(path.join(ROOT, 'demigod-pairs-lib.mjs')),
      title: 'pair ledger module',
      detail: (() => {
        try {
          const p = readJson(path.join(ROOT, 'DEMIGOD-PAIRS.json'));
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
    blockers: blockers.map((b) => b.id),
    warnings: warnings.map((w) => w.id),
    items,
    nextCmd: freezeOn
      ? 'node demigod-publish-freeze.mjs status  # freeze ON — do not ship'
      : ready
        ? 'node demigod-foot-cdn-publish.mjs && node demigod-cm6-paste-publish.mjs --footer-only'
        : 'fix blockers then re-run: node demigod-ship-checklist.mjs',
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const c = buildShipChecklist();
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'ship-checklist.json'), JSON.stringify(c, null, 2));
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
