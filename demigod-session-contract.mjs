#!/usr/bin/env node
/**
 * Session / task contract — agents declare intent before heavy work.
 * Validates JSON contracts so thrash without stop conditions is harder.
 *
 * Schema:
 * {
 *   "goal": "…",
 *   "owner": "grok",
 *   "touch": ["demigod-foot-core.js"],  // optional files
 *   "verify": ["node demigod-preflight.mjs --quick"],
 *   "stop": "preflight green",
 *   "forbid": ["oauth", "game", "rewrite"]
 * }
 *
 * Usage:
 *   node demigod-session-contract.mjs validate path.json
 *   node demigod-session-contract.mjs scaffold --goal "…"
 *   node demigod-session-contract.mjs check-active   # against freeze + truth
 *
 * The contract is written in DEMIGOD_ROOT. The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  atomicWrite,
  readJson,
  opt,
  parseFirstJson,
} from './demigod-agent-tools-lib.mjs';

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SESSION-CONTRACT.json');
}

function contractsDir() {
  return path.join(dataRoot(), 'DEMIGOD-CONTRACTS');
}

function freezePath() {
  return path.join(dataRoot(), 'DEMIGOD-PUBLISH-FREEZE.json');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function diskFootVer() {
  try {
    const foot = fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
    return (foot.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
if (args.includes('--publish')) fail('publish_refused');
const cmd = args[0] || 'help';

const FORBID_DEFAULT = ['oauth', 'game', 'rewrite', 'auto-publish', 'hermes', 'eliza'];

function validate(c) {
  const issues = [];
  if (!c || typeof c !== 'object') issues.push('not_object');
  if (!c.goal || String(c.goal).length < 8) issues.push('goal_too_short');
  if (!c.owner) issues.push('owner_required');
  if (!c.stop) issues.push('stop_condition_required');
  if (!Array.isArray(c.verify) || !c.verify.length) issues.push('verify_required');
  const forbid = c.forbid || FORBID_DEFAULT;
  const g = String(c.goal || '').toLowerCase();
  for (const f of forbid) {
    if (g.includes(String(f).toLowerCase())) issues.push(`goal_mentions_forbid:${f}`);
  }
  // if touch includes foot, require freeze off or explicit allowShip
  const touch = c.touch || [];
  if (touch.some((t) => /foot-core|footer-lite|head-/.test(t)) && !c.allowShip) {
    const fr = readJson(freezePath());
    if (fr?.on) issues.push('publish_frozen_but_contract_touches_foot');
  }
  return { ok: issues.length === 0, issues, contract: c };
}

if (cmd === 'scaffold') {
  const goal = opt(args, '--goal', 'describe goal here');
  const c = {
    goal,
    owner: process.env.DG_LOCK_OWNER || process.env.USER || 'agent',
    touch: [],
    verify: ['node demigod-preflight.mjs --quick', 'node demigod-truth.mjs --md'],
    stop: 'preflight green + truth fullyShipped',
    forbid: FORBID_DEFAULT,
    allowShip: false,
    createdAt: new Date().toISOString(),
    diskFootVer: diskFootVer(),
  };
  const p = path.join(contractsDir(), `contract-${Date.now().toString(36)}.json`);
  atomicWrite(p, JSON.stringify(c, null, 2) + '\n');
  const report = {
    at: c.createdAt,
    ok: true,
    path: p,
    reportPath: reportPath(),
    diskFootVer: c.diskFootVer,
    goal: c.goal,
    owner: c.owner,
    sent: false,
    liveMail: false,
    livePublish: false,
  };
  atomicWrite(reportPath(), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, contract: c }, null, 2));
  process.exit(0);
}

if (cmd === 'validate') {
  const p = args[1];
  const base = path.basename(p || '');
  const c = readJson(p)
    || readJson(path.join(contractsDir(), base))
    || readJson(path.join(dataRoot(), base));
  if (!c) {
    console.error(JSON.stringify({ ok: false, error: 'not_found', sent: false, liveMail: false, livePublish: false }));
    process.exit(1);
  }
  const r = validate(c);
  console.log(JSON.stringify({
    ...r,
    path: p,
    diskFootVer: diskFootVer(),
    sent: false,
    liveMail: false,
    livePublish: false,
  }, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (cmd === 'check-active') {
  const truth = spawnSync('node', ['demigod-truth.mjs', '--json'], {
    cwd: dataRoot(),
    encoding: 'utf8',
    timeout: 90000,
  });
  const t = parseFirstJson(truth.stdout || truth.stderr || '');
  const fr = readJson(freezePath());
  const report = {
    at: new Date().toISOString(),
    path: path.join(dataRoot(), 'DEMIGOD-SESSION-CONTRACT-ACTIVE.json'),
    diskFootVer: diskFootVer(),
    fullyShipped: t?.match?.fullyShipped ?? null,
    freezeOn: Boolean(fr?.on),
    advice: t?.match?.fullyShipped
      ? 'site green — contracts should set allowShip=false and avoid foot touch'
      : 'site not fully shipped — ship path may be valid under lock',
    sent: false,
    liveMail: false,
    livePublish: false,
  };
  atomicWrite(report.path, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.error('usage: scaffold | validate <file> | check-active');
process.exit(2);
