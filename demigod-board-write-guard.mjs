#!/usr/bin/env node
/**
 * Board write tripwire — refuse sample:false mints without honesty gate.
 * Call before any board save that claims real roles/receipts.
 *
 * Usage:
 *   node demigod-board-write-guard.mjs check
 *   node demigod-board-write-guard.mjs check --json path/to/board.json
 * Exit 0 = honest; 1 = would-fail honesty / real claims without proof
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { opt, flag } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const boardPath = opt(args, '--json', path.join(ROOT, 'DEMIGOD-BOARD.json'));

function analyze(board) {
  const roles = board.roles || [];
  const receipts = board.receipts || [];
  const realRoles = roles.filter((r) => r && r.sample === false);
  const realReceipts = receipts.filter((r) => r && r.sample === false);
  const sampleRoles = roles.filter((r) => r && r.sample !== false);
  const issues = [];
  if (roles.length > 3) issues.push({ severity: 'P0', msg: `roles=${roles.length} > 3 cap` });
  if (realRoles.length > 0 && !board.allowRealRoles) {
    issues.push({
      severity: 'P0',
      msg: `realRoles=${realRoles.length} without allowRealRoles flag — refuse silent real mint`,
    });
  }
  if (realReceipts.length > 0 && !board.allowRealReceipts) {
    issues.push({
      severity: 'P0',
      msg: `realReceipts=${realReceipts.length} without allowRealReceipts`,
    });
  }
  // honesty script
  const h = spawnSync('node', ['demigod-verify-board-honesty.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
  const honestyOk = h.status === 0 && /OK/i.test(h.stdout + h.stderr);
  if (!honestyOk) issues.push({ severity: 'P0', msg: 'board-honesty script FAIL', detail: (h.stdout + h.stderr).slice(0, 120) });

  return {
    at: new Date().toISOString(),
    path: boardPath,
    ok: issues.length === 0,
    counts: {
      roles: roles.length,
      sampleRoles: sampleRoles.length,
      realRoles: realRoles.length,
      realReceipts: realReceipts.length,
    },
    honestyOk,
    issues,
  };
}

let board;
try {
  board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: 'read_fail', detail: String(e.message || e) }));
  process.exit(1);
}

const report = analyze(board);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
