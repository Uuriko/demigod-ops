#!/usr/bin/env node
/**
 * demigod-proof-sla.mjs
 * Monitors 48h pilot SLA. Exit 1 if any overdue (for cron alerting).
 * Uses same Slack webhook as sla-pager if available.
 */
import { loadBoard } from './demigod-submissions-lib.mjs';

const board = loadBoard();
const pilots = board.pilots || [];
const now = Date.now();

const ACTIVE = new Set(['new', 'briefed', 'matched', 'intros-sent']);
const open = pilots.filter(p => ACTIVE.has(p.status) && p.slaDue);
const overdue = open.filter(p => new Date(p.slaDue).getTime() < now);
const dueSoon = open.filter(p => {
  const diff = new Date(p.slaDue).getTime() - now;
  return diff > 0 && diff < 24 * 3600 * 1000;
});

console.log(`SLA: ${open.length} open, ${overdue.length} OVERDUE, ${dueSoon.length} due <24h`);
overdue.forEach(p => console.log('  BREACH:', p.email, p.status, 'was due', p.slaDue));
dueSoon.forEach(p => console.log('  due soon:', p.email, p.status, 'due', p.slaDue));

const webhook = process.env.SLACK_WEBHOOK_URL || process.env.DEMIGOD_SLACK_WEBHOOK;
if (overdue.length && webhook) {
  // fire and forget
  fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `🚨 Pilot SLA breach: ${overdue.map(p => p.email).join(', ')} — 48h/$100-back clock expired` })
  }).catch(() => {});
}

console.log('npm run demigod:verify:all');
console.log('Pre-services: SLAs are simulated until real Twilio + alerting wired.');

process.exit(overdue.length ? 1 : 0);
