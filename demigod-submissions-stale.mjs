#!/usr/bin/env node
/**
 * Flag stale status=new submissions (honesty: "will follow up" vs abandoned queue).
 *
 * Usage:
 *   node demigod-submissions-stale.mjs
 *   node demigod-submissions-stale.mjs --hours 48
 *   node demigod-submissions-stale.mjs --json
 */
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUSY,
  ensureBusy,
  atomicWrite,
  readJson,
  opt,
  flag,
} from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const INBOX = path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const hours = Number(opt(process.argv, '--hours', '48')) || 48;
const asJson = flag(process.argv, '--json');
const cutoff = Date.now() - hours * 3600 * 1000;

const inbox = readJson(INBOX) || { items: [] };
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

const report = {
  at: new Date().toISOString(),
  hours,
  totalNew: items.filter((i) => i.status === 'new').length,
  staleCount: stale.length,
  stale: stale.slice(0, 50),
  action: stale.length
    ? 'triage or mark handled — stale queue undermines follow-up honesty'
    : 'no stale new submissions',
};

ensureBusy();
atomicWrite(path.join(BUSY, 'submissions-stale.json'), JSON.stringify(report, null, 2) + '\n');

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`submissions-stale  stale=${report.staleCount}  status_new=${report.totalNew}  threshold=${hours}h`);
  for (const s of stale.slice(0, 12)) {
    console.log(`  · ${s.ageHours}h  ${s.form}  ${s.id}  ${s.at}`);
  }
  if (!stale.length) console.log('  (none)');
  console.log(`next  ${report.action}`);
}

process.exit(stale.length ? 2 : 0);
