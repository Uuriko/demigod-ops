#!/usr/bin/env node
/**
 * Ops reconcile — cross-check submits / pilots / outreach counts.
 * Surfaces silent drop-offs between inbox → pilot → outreach.
 *
 * Usage:
 *   node demigod-ops-reconcile.mjs
 *   node demigod-ops-reconcile.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUSY,
  ensureBusy,
  atomicWrite,
  readJson,
  flag,
} from './demigod-agent-tools-lib.mjs';
import { hasValidSendReceipt } from './demigod-funnel.mjs';
import { countOpenPilotOs } from './demigod-demand.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const asJson = flag(process.argv, '--json');

const inbox = readJson(path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json')) || { items: [] };
const pilots = readJson(path.join(ROOT, 'DEMIGOD-PILOTS.json')) || { pilots: [] };
const outreach = readJson(path.join(ROOT, 'DEMIGOD-OUTREACH.json')) || { leads: [] };
const stale = readJson(path.join(BUSY, 'submissions-stale.json'));

const items = inbox.items || [];
const newSubs = items.filter((i) => i.status === 'new');
const startupNew = newSubs.filter((i) => /startup/i.test(i.form || ''));
const pilotsOpen = countOpenPilotOs(pilots);
const leads = outreach.leads || [];
const openLeads = leads.filter((l) => !['pass', 'pilot'].includes(l.status));
const sent = leads.filter((l) => hasValidSendReceipt({
  ...l,
  stateHistory: (l.stateHistory || l.history || []).map((h) => ({ ...h, to: h.to || h.status })),
}));
const replied = leads.filter((l) => l.status === 'replied' || l.repliedAt);

// submit ids referenced by pilots
const pilotSources = new Set(
  (pilots.pilots || [])
    .map((p) => String(p.source || ''))
    .filter((s) => s.startsWith('submit:'))
    .map((s) => s.slice(7)),
);
const orphanSubs = startupNew.filter((s) => s.id && !pilotSources.has(s.id)).slice(0, 20);

const gaps = [];
if (startupNew.length > 0 && pilotsOpen === 0) {
  gaps.push({
    severity: 'P1',
    msg: `${startupNew.length} new startup sub(s) but zero open non-sample pilots`,
  });
}
if (orphanSubs.length) {
  gaps.push({
    severity: 'P1',
    msg: `${orphanSubs.length} new startup sub(s) not linked to pilot-os via source=submit:…`,
  });
}
if (sent.length > 0 && replied.length === 0 && sent.length >= 5) {
  gaps.push({
    severity: 'P2',
    msg: `${sent.length} outreach sent, 0 replies logged — check positioning or tracking`,
  });
}
if ((stale?.staleCount || 0) > 0) {
  gaps.push({
    severity: 'P1',
    msg: `${stale.staleCount} stale status=new submissions (run demigod-submissions-stale.mjs)`,
  });
}

const report = {
  at: new Date().toISOString(),
  counts: {
    inboxTotal: items.length,
    statusNew: newSubs.length,
    startupNew: startupNew.length,
    pilotsOpen,
    pilotsAll: (pilots.pilots || []).length,
    outreachOpen: openLeads.length,
    outreachSent: sent.length,
    outreachReplied: replied.length,
    staleNew: stale?.staleCount ?? null,
  },
  orphanStartupSubs: orphanSubs.map((s) => ({ id: s.id, at: s.at, form: s.form })),
  gaps,
  ok: gaps.filter((g) => g.severity === 'P1').length === 0,
  next: [
    'node demigod-watch-submits.mjs',
    'node demigod-submissions-stale.mjs',
    'node demigod-submit-to-pilot.mjs --latest-startup  # if real founder',
    'node demigod-pilot-os.mjs open',
    'node demigod-outreach-tracker.mjs list',
  ],
};

ensureBusy();
atomicWrite(path.join(BUSY, 'ops-reconcile.json'), JSON.stringify(report, null, 2) + '\n');

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`ops-reconcile  ${report.ok ? 'OK' : 'GAPS'}  ${report.at}`);
  console.log(`  inbox new=${report.counts.statusNew} startupNew=${report.counts.startupNew}`);
  console.log(`  pilots open=${report.counts.pilotsOpen}  outreach sent=${report.counts.outreachSent} replied=${report.counts.outreachReplied}`);
  for (const g of gaps) console.log(`  [${g.severity}] ${g.msg}`);
  if (!gaps.length) console.log('  (no cross-store gaps)');
  console.log(`wrote /tmp/dg-busy/ops-reconcile.json`);
}

process.exit(report.ok ? 0 : 2);
