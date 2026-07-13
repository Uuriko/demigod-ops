#!/usr/bin/env node
// Board honesty gate — pre-services phase: fails on any fabricated proof.
import { readFileSync, lstatSync, existsSync } from 'fs';
const b = JSON.parse(readFileSync('DEMIGOD-BOARD.json', 'utf8'));
const errs = [];
try {
  if (existsSync('demigod-board.json') && !lstatSync('demigod-board.json').isSymbolicLink())
    errs.push('demigod-board.json is a regular file — split-brain; must be symlink to DEMIGOD-BOARD.json');
} catch (e) {
  errs.push(`demigod-board.json stat failed: ${e.message || e}`);
}
if ((b.roles || []).length > 3) errs.push(`roles>3 (${b.roles.length})`);
for (const r of b.roles || []) if (/sim|from sms/i.test(`${r.title} ${r.stageType||''} ${r.outcome||''}`) && r.sample !== true) errs.push(`role ${r.id}: sim-derived, sample!==true`);
const s = b.signal || {};
if (s.realRoles > 0 || s.realReceipts > 0) errs.push(`signal claims real proof (${s.realRoles}/${s.realReceipts}) — stays 0 until a human-delivered receipt exists`);
for (const r of b.receipts || []) if (r.status === 'delivered' && !/sample/i.test(r.note || '')) errs.push(`receipt #${r.number}: "delivered" without sample label`);
for (const p of b.pilots || []) {
  if (/^\+?1?415555/.test(p.phone || '')) errs.push(`pilot ${p.id}: sim 555 phone`);
  if (p.slaDue) errs.push(`pilot ${p.id}: slaDue present (SLA promises banned)`);
}
if ((b.testimonials || []).length) errs.push('testimonials present — none are real yet');
if (errs.length) { console.error('BOARD HONESTY FAIL:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('board honesty OK');
