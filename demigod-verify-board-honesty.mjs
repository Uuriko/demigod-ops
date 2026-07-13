#!/usr/bin/env node
// Board honesty gate — pre-services phase: fails on any fabricated proof.
// Always writes DEMIGOD-BOARD-HONESTY.json so control plane / dash can read pass/fail.
import { readFileSync, writeFileSync, lstatSync, existsSync } from 'fs';
import path from 'path';

const ROOT = process.env.DEMIGOD_ROOT || process.cwd();
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
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
} catch (e) {
  console.error('warn: could not write honesty json', e.message || e);
}

if (errs.length) {
  console.error('BOARD HONESTY FAIL:\n- ' + errs.join('\n- '));
  process.exit(1);
}
console.log('board honesty OK');
