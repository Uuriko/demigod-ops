#!/usr/bin/env node
/**
 * demigod-pilot-tracker.mjs
 * Usage: node demigod-pilot-tracker.mjs --founderEmail=you@co.com --status=briefed
 * Appends to board.pilots[], calls publish, prints Slack copy + demo link.
 * npm run demigod:verify:all
 * Zero extra deps. Max ~70 lines.
 */
import fs from 'fs';
import { spawnSync } from 'child_process';
import { loadBoard, saveBoard } from './demigod-submissions-lib.mjs';

function parseArg(name) {
  const m = process.argv.find(a => a === '--' + name || a.startsWith('--' + name + '='));
  if (!m) return null;
  if (m === '--' + name) return true;
  return m.split('=')[1];
}

const email = parseArg('founderEmail') || parseArg('email');
const status = parseArg('status') || 'new';
const brief = parseArg('brief') || '';
const phone = parseArg('phone') || '';
const intros = parseInt(parseArg('intros') || '0', 10) || 0;
const resetSla = !!parseArg('reset-sla');
const dryRun = !!parseArg('dry-run') || !!parseArg('dry');
const outcome90d = parseArg('90d-outcome') || parseArg('90d');

const STATUSES = ['new', 'briefed', 'matched', 'intros-sent', 'dm-sent', 'closed', 'churned'];
if (!STATUSES.includes(status)) {
  console.error(`Invalid --status=${status}. Allowed: ${STATUSES.join(', ')}`);
  process.exit(1);
}

if (!email && !parseArg('report')) {
  console.error('Usage: node demigod-pilot-tracker.mjs --founderEmail=foo@bar.com --status=briefed [--brief="..."] [--phone=1] [--intros=3] [--reset-sla] [--report]');
  process.exit(1);
}

let board = loadBoard();
board.pilots = Array.isArray(board.pilots) ? board.pilots : [];

if (parseArg('report')) {
  // Lean report for pilots (simple table, honest only). YAGNI - basic status. Moved early for load.
  const pilots = board.pilots;
  console.log('Pilots report (lean):');
  if (pilots.length === 0) {
    console.log('  (none logged yet - use --founderEmail etc)');
  } else {
    pilots.slice(0,5).forEach(p => {
      console.log(`  ${p.email || p.id} | ${p.status} | intros:${p.intros||0} | sla:${p.slaDue ? p.slaDue.slice(0,10) : 'n/a'}${p['90d-outcome'] ? ' | 90d:'+p['90d-outcome'].slice(0,20) : ''}`);
    });
  }
  process.exit(0);
}

const now = new Date();

let entry = board.pilots.find(p => p.email === email);
const isNew = !entry;
if (isNew) {
  entry = {
    id: 'plt-' + now.getTime().toString(36),
    email,
    status,
    at: now.toISOString(),
    // no slaDue — honesty: no 48h SLA promises (2026-07-12 audit)
    preServices: true,
    pendingIntegrations: ['twilio', 'stripe'],
    brief: brief.slice(0, 200) || undefined,
    phone: phone || undefined,
    phoneProvided: !!phone,
    introsSent: intros || undefined,
    '90d-outcome': outcome90d || undefined,
    history: [{ status, at: now.toISOString() }]
  };
  board.pilots.push(entry);
} else {
  entry.status = status;
  entry.updatedAt = now.toISOString();
  if (brief) entry.brief = brief.slice(0, 200);
  if (phone) {
    entry.phone = phone;
    entry.phoneProvided = true;
  }
  if (intros) entry.introsSent = (entry.introsSent || 0) + intros;
  if (resetSla) {
    // no slaDue re-mint
  }
  if (outcome90d) {
    entry['90d-outcome'] = outcome90d;
  }
  entry.history = [...(entry.history || []), { status, at: now.toISOString() }];
}

if (!dryRun) {
  saveBoard(board, { reason: 'pilot-tracker', actor: process.env.USER || 'pilot-tracker' });

  // Publish (re-uses board CDN + real roles logic)
  const pub = spawnSync('node', ['demigod-board-publish.mjs'], { stdio: 'inherit' });
  if (pub.status !== 0) console.warn('board-publish non-zero but continuing');
} else {
  console.log('[dry-run] skipping saveBoard + publish');
}

const demoHash = (board.receipts && board.receipts[0] && board.receipts[0].hash) || 'demo';
const phoneClaim = entry.phone ? `phone ${entry.phone} collected for SMS` : 'phone field collected (no number yet)';
console.log('NEW PILOT logged:', email, 'status:', status, 'phone:', !!entry.phone, '90d:', entry['90d-outcome'] || 'n/a');
if (intros) console.log(`Intro log: ${intros} intro${intros === 1 ? '' : 's'} sent for ${email}`);
console.log('Slack copy: `New Demigod pilot: ' + email + ' — ' + status + ' (Fast human reply or $100 back). Demo: https://www.trydemigod.com/#receipt/' + demoHash + ' (' + phoneClaim + ' — Twilio/Stripe pending)`');
console.log('Public demo link: https://www.trydemigod.com/#receipt/' + demoHash);
console.log('Verify: npm run demigod:verify:all');
console.log('Note: pre-services mode — SMS & Stripe mocks active; real creds swap later.');

const ACTIVE = new Set(['new', 'briefed', 'matched', 'intros-sent']);
const pre = board.pilots.filter(p => p.preServices);
const byStatus = pre.reduce((m, p) => { m[p.status] = (m[p.status] || 0) + 1; return m; }, {});
const open = pre.filter(p => ACTIVE.has(p.status) && (p.followUpAt || p.slaDue));
const overdue = open.filter(p => { const d = p.followUpAt || p.slaDue; return d && new Date(d).getTime() < Date.now(); });
const dueSoon = open.filter(p => {
  const d = new Date(p.followUpAt || p.slaDue).getTime() - Date.now();
  return d > 0 && d < 24 * 3600 * 1000;
});
console.log('Pre-services pipeline:', pre.length, 'pilots —', JSON.stringify(byStatus));
if (dueSoon.length) console.log('SLA due <24h:', dueSoon.map(p => p.email).join(', '));
if (overdue.length) console.log('SLA BREACHED:', overdue.map(p => p.email).join(', '));
