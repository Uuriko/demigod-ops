import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Poison-test for the board-honesty gate: assert it PASSES an honest board and FAILS every dishonest
// one. Spawns the REAL gate via DEMIGOD_ROOT (its documented seam) — not a logic replica — so an edit
// that silently breaks a check (or makes it vacuous-green) is caught here. Codifies the manual
// verification from autopilot c443/c457; the manual check missed a dimension once (c432 → c457), a
// persistent enumerated test does not.

const GATE = path.join(import.meta.dirname, 'demigod-verify-board-honesty.mjs');

// Runs the real gate against `board` written to a throwaway DEMIGOD_ROOT; returns exit code (0 = pass).
function runGate(board) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-gate-'));
  try {
    fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify(board));
    try {
      execFileSync('node', [GATE], { env: { ...process.env, DEMIGOD_ROOT: dir }, stdio: 'ignore' });
      return 0;
    } catch (e) {
      return e.status ?? 1;
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('board-honesty PASSES an honest pre-services board (fail-capable, not vacuous)', () => {
  const honest = {
    roles: [{ id: 'role-seed1', sample: true }],
    candidates: [],
    receipts: [{ hash: 'demo004', status: 'delivered', note: 'Sample receipt' }],
    signal: { realRoles: 0, realReceipts: 0 },
  };
  assert.equal(runGate(honest), 0, 'honest sample-only board must pass — else the gate is vacuous-red');
});

test('board-honesty FAILS a real receipt with signal.realReceipts>0', () => {
  assert.notEqual(runGate({
    roles: [{ id: 'role-seed1', sample: true }], candidates: [],
    receipts: [{ hash: 'a1b2c3', status: 'delivered', note: '', number: 5 }],
    signal: { realRoles: 0, realReceipts: 1 },
  }), 0);
});

test('board-honesty FAILS a real delivered receipt even when signal is falsified to 0 (independent label check)', () => {
  // The signal-tamper case: hiding a real receipt by lying in the signal must still be caught by the
  // per-receipt "delivered without sample label" check. This is the defense-in-depth that c443 proved.
  assert.notEqual(runGate({
    roles: [{ id: 'role-seed1', sample: true }], candidates: [],
    receipts: [{ hash: 'a1b2c3', status: 'delivered', note: '', number: 5 }],
    signal: { realRoles: 0, realReceipts: 0 },
  }), 0);
});

test('board-honesty FAILS a real role (sample:false) contradicting signal.realRoles=0', () => {
  assert.notEqual(runGate({
    roles: [{ id: 'role-real', title: 'PM', sample: false }], candidates: [], receipts: [],
    signal: { realRoles: 0, realReceipts: 0 },
  }), 0);
});

test('board-honesty FAILS an over-cap board (>3 seed roles)', () => {
  assert.notEqual(runGate({
    roles: Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, sample: true })),
    candidates: [], receipts: [], signal: { realRoles: 0, realReceipts: 0 },
  }), 0);
});
