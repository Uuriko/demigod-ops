#!/usr/bin/env node
/**
 * Flag stale status=new submissions (honesty: "will follow up" vs abandoned queue).
 * The report stays under DEMIGOD_ROOT. This command does not send mail.
 *
 * Usage:
 *   node demigod-submissions-stale.mjs
 *   node demigod-submissions-stale.mjs --hours 48
 *   node demigod-submissions-stale.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson, opt, flag } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function inboxPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SUBMISSIONS-STALE.json');
}

function buildReport(argv = process.argv) {
  const hours = Number(opt(argv, '--hours', '48')) || 48;
  const cutoff = Date.now() - hours * 3600 * 1000;
  const inbox = readJson(inboxPath()) || { items: [] };
  const items = inbox.items || [];
  const stale = items
    .filter((it) => (it.status || '') === 'new')
    .filter((it) => {
      const t = Date.parse(it.at || 0);
      return Number.isFinite(t) && t < cutoff;
    })
    .map((it) => ({
      id: it.id,
      at: it.at,
      form: it.form,
      ageHours: Math.round((Date.now() - Date.parse(it.at)) / 3600000),
      statusUrl: `https://www.trydemigod.com/#status/${it.id}`,
    }))
    .sort((a, b) => b.ageHours - a.ageHours);

  return {
    at: new Date().toISOString(),
    hours,
    totalNew: items.filter((i) => i.status === 'new').length,
    staleCount: stale.length,
    stale: stale.slice(0, 50),
    action: stale.length
      ? 'triage or mark handled — stale queue undermines follow-up honesty'
      : 'no stale new submissions',
    report: reportPath(),
    sent: false,
    liveMail: false,
  };
}

function run(argv = process.argv) {
  const asJson = flag(argv, '--json');
  const report = buildReport(argv);
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(report.report, JSON.stringify(report, null, 2) + '\n');

  if (asJson) console.log(JSON.stringify(report));
  else {
    console.log(`submissions-stale  stale=${report.staleCount}  status_new=${report.totalNew}  threshold=${report.hours}h`);
    for (const s of report.stale.slice(0, 12)) {
      console.log(`  · ${s.ageHours}h  ${s.form}  ${s.id}  ${s.at}`);
    }
    if (!report.stale.length) console.log('  (none)');
    console.log(`next  ${report.action}`);
    console.log(`report  ${report.report}`);
  }

  return report.staleCount ? 2 : 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(run());
