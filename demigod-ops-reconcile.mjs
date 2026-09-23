#!/usr/bin/env node
/**
 * Ops reconcile — cross-check submits / pilots / outreach counts.
 * The stale count comes from this data root's stale report. The reconcile stays there.
 * This command does not send mail.
 *
 * Usage:
 *   node demigod-ops-reconcile.mjs
 *   node demigod-ops-reconcile.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson, flag } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function stalePath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-STALE.json');
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-OPS-RECONCILE.json');
}

function buildReport() {
  const inbox = readJson(path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json')) || { items: [] };
  const pilots = readJson(path.join(dataRoot(), 'DEMIGOD-PILOTS.json')) || { pilots: [] };
  const outreach = readJson(path.join(dataRoot(), 'DEMIGOD-OUTREACH.json')) || { leads: [] };
  const stale = readJson(stalePath());
  const staleIds = (stale?.stale || []).map((row) => row?.id).filter(Boolean);

  const items = inbox.items || [];
  const newSubs = items.filter((i) => i.status === 'new');
  const startupNew = newSubs.filter((i) => /startup/i.test(i.form || ''));
  const pilotList = (pilots.pilots || []).filter((p) => !['churned', 'closed'].includes(p.status) && !p.sample);
  const leads = outreach.leads || [];
  const openLeads = leads.filter((l) => !['pass', 'pilot'].includes(l.status));
  const sent = leads.filter((l) => l.status === 'sent' || l.sentAt);
  const replied = leads.filter((l) => l.status === 'replied' || l.repliedAt);

  const pilotSources = new Set(
    (pilots.pilots || [])
      .map((p) => String(p.source || ''))
      .filter((s) => s.startsWith('submit:'))
      .map((s) => s.slice(7)),
  );
  const orphanSubs = startupNew.filter((s) => s.id && !pilotSources.has(s.id)).slice(0, 20);

  const gaps = [];
  if (startupNew.length > 0 && pilotList.length === 0) {
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

  return {
    at: new Date().toISOString(),
    counts: {
      inboxTotal: items.length,
      statusNew: newSubs.length,
      startupNew: startupNew.length,
      pilotsOpen: pilotList.length,
      pilotsAll: (pilots.pilots || []).length,
      outreachOpen: openLeads.length,
      outreachSent: sent.length,
      outreachReplied: replied.length,
      staleNew: stale?.staleCount ?? null,
    },
    staleIds,
    staleReport: stalePath(),
    orphanStartupSubs: orphanSubs.map((s) => ({ id: s.id, at: s.at, form: s.form })),
    gaps,
    ok: gaps.filter((g) => g.severity === 'P1').length === 0,
    report: reportPath(),
    sent: false,
    liveMail: false,
    next: [
      'node demigod-watch-submits.mjs',
      'node demigod-submissions-stale.mjs',
      'node demigod-submit-to-pilot.mjs --latest-startup  # if real founder',
      'node demigod-pilot-os.mjs open',
      'node demigod-outreach-tracker.mjs list',
    ],
  };
}

function run(argv = process.argv) {
  const asJson = flag(argv, '--json');
  const report = buildReport();
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(report.report, JSON.stringify(report, null, 2) + '\n');
  if (asJson) console.log(JSON.stringify(report));
  else {
    console.log(`ops-reconcile  ${report.ok ? 'OK' : 'GAPS'}  ${report.at}`);
    console.log(`  inbox new=${report.counts.statusNew} startupNew=${report.counts.startupNew}`);
    console.log(`  pilots open=${report.counts.pilotsOpen}  outreach sent=${report.counts.outreachSent} replied=${report.counts.outreachReplied}`);
    for (const g of report.gaps) console.log(`  [${g.severity}] ${g.msg}`);
    if (!report.gaps.length) console.log('  (no cross-store gaps)');
    console.log(`report  ${report.report}`);
  }
  return report.ok ? 0 : 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(run());
