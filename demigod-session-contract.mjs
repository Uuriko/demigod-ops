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
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  BUSY,
  ensureBusy,
  atomicWrite,
  readJson,
  opt,
  parseFirstJson,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
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
    const fr = readJson(path.join(BUSY, 'publish-freeze.json'));
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
  };
  ensureBusy();
  const p = path.join(BUSY, `contract-${Date.now().toString(36)}.json`);
  atomicWrite(p, JSON.stringify(c, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, path: p, contract: c }, null, 2));
  process.exit(0);
}

if (cmd === 'validate') {
  const p = args[1];
  const c = readJson(p) || readJson(path.join(BUSY, path.basename(p || '')));
  if (!c) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  const r = validate(c);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

if (cmd === 'check-active') {
  const truth = spawnSync('node', ['demigod-truth.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 90000,
  });
  const t = parseFirstJson(truth.stdout || truth.stderr || '');
  const fr = readJson(path.join(BUSY, 'publish-freeze.json'));
  const report = {
    at: new Date().toISOString(),
    fullyShipped: t?.match?.fullyShipped ?? null,
    freezeOn: Boolean(fr?.on),
    advice: t?.match?.fullyShipped
      ? 'site green — contracts should set allowShip=false and avoid foot touch'
      : 'site not fully shipped — ship path may be valid under lock',
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.error('usage: scaffold | validate <file> | check-active');
process.exit(2);
