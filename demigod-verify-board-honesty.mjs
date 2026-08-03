#!/usr/bin/env node
/**
 * demigod-verify-board-honesty — gate: no fabricated roles/receipts on board
 *
 *   node demigod-verify-board-honesty.mjs
 *
 * Pre-services: ≤3 seed sample roles; realRoles/real receipts must stay 0 until
 * a human-delivered intro. Best-effort writes DEMIGOD-BOARD-HONESTY.json for control/dash
 * (non-fatal if read-only sandbox — VERDICT + exit code are the product).
 * Exit ≠0 on fail. Reads DEMIGOD-BOARD.json (or demigod-board.json alias).
 */
import { readFileSync, writeFileSync, renameSync, lstatSync, existsSync } from 'fs';
import path from 'path';

const ROOT = process.env.DEMIGOD_ROOT || process.cwd();
const boardHonestyArgs = process.argv.slice(2);
const BOARD_HONESTY_FLAGS = new Set(['--help', '-h']);
const unknownBoardHonesty = boardHonestyArgs.find((a) => !BOARD_HONESTY_FLAGS.has(a));
if (unknownBoardHonesty) {
  console.error(
    `board-honesty: unknown argument ${unknownBoardHonesty} — try: node demigod-verify-board-honesty.mjs`,
  );
  process.exit(2);
}
if (boardHonestyArgs.includes('--help') || boardHonestyArgs.includes('-h')) {
  console.log(`demigod-verify-board-honesty — gate: no fabricated board roles/receipts

Usage: node demigod-verify-board-honesty.mjs`);
  process.exit(0);
}
const boardPath = path.join(ROOT, 'DEMIGOD-BOARD.json');
const outPath = path.join(ROOT, 'DEMIGOD-BOARD-HONESTY.json');
const b = JSON.parse(readFileSync(boardPath, 'utf8'));
const errs = [];
try {
  const lower = path.join(ROOT, 'demigod-board.json');
  if (existsSync(lower) && !lstatSync(lower).isSymbolicLink())
    errs.push('demigod-board.json is a regular file — split-brain; must be symlink to DEMIGOD-BOARD.json');
} catch (e) {
  errs.push(`demigod-board.json stat failed: ${e.message || e}`);
}
if ((b.roles || []).length > 3) errs.push(`roles>3 (${b.roles.length})`);
for (const r of b.roles || [])
  if (/sim|from sms/i.test(`${r.title} ${r.stageType || ''} ${r.outcome || ''}`) && r.sample !== true)
    errs.push(`role ${r.id}: sim-derived, sample!==true`);
const s = b.signal || {};
if (s.realRoles > 0 || s.realReceipts > 0)
  errs.push(
    `signal claims real proof (${s.realRoles}/${s.realReceipts}) — stays 0 until a human-delivered receipt exists`,
  );
// The signal is a STORED claim; the roles are the evidence. Nothing made them agree, so a role with
// sample:false (or no sample field) and an ordinary title passed every check above while
// computeSignal() counts it as realRoles:1 — proven in a sandbox: gate PASS, computeSignal 1,
// stored 0. The board could contradict itself and stay green. Only sim-derived titles were ever
// required to carry sample:true, so any fake that does not say "sim"/"from sms" walked through.
// Assert the invariant instead: non-sample roles ARE the real roles, so the count must match.
// Deliberately no import of computeSignal — board-lib pulls in submissions-lib, and coupling a
// lean gate to that chain to guard a surface foot-core no longer renders (fetchBoard: 0 calls
// since v205) is not worth it. This stays correct when real roles legitimately arrive: then
// realRoles should EQUAL the non-sample count rather than being 0.
const nonSample = (b.roles || []).filter((r) => r.sample !== true).length;
if (nonSample !== (s.realRoles || 0))
  errs.push(
    `board self-contradicts: ${nonSample} non-sample role(s) but signal.realRoles=${s.realRoles || 0}`,
  );
for (const r of b.receipts || [])
  if (r.status === 'delivered' && !/sample/i.test(r.note || ''))
    errs.push(`receipt #${r.number}: "delivered" without sample label`);
for (const p of b.pilots || []) {
  if (/^\+?1?415555/.test(p.phone || '')) errs.push(`pilot ${p.id}: sim 555 phone`);
  if (p.slaDue) errs.push(`pilot ${p.id}: slaDue present (SLA promises banned)`);
}
if ((b.testimonials || []).length) errs.push('testimonials present — none are real yet');

const report = {
  at: new Date().toISOString(),
  pass: errs.length === 0,
  errors: errs,
  roles: (b.roles || []).length,
  receipts: (b.receipts || []).length,
  realRoles: s.realRoles ?? 0,
  realReceipts: s.realReceipts ?? 0,
};
try {
  // Atomic write (temp+rename): coord + autopilot run this gate concurrently; a direct write
  // can be read torn → transient false signal. Same fix as verify-source.mjs.
  const tmp = `${outPath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(report, null, 2) + '\n');
  renameSync(tmp, outPath);
} catch (e) {
  // Codex (and others) run read-only by design — JSON is convenience, not the gate product.
  console.error('warn: could not write honesty json (read-only ok):', e.message || e);
}

if (errs.length) {
  console.error('BOARD HONESTY FAIL:\n- ' + errs.join('\n- '));
  process.exit(1);
}
console.log('board honesty OK');
