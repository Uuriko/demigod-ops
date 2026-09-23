#!/usr/bin/env node
/**
 * Record open pilot SLA breaches for one data root.
 * An overdue pilot stays in that report. This command does not post to Slack.
 *
 * Usage:
 *   node demigod-proof-sla.mjs
 *   node demigod-proof-sla.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { loadBoard } from './demigod-submissions-lib.mjs';

const ACTIVE = new Set(['new', 'briefed', 'matched', 'intros-sent']);

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-SLA-PROOF.json');
}

function pilotRow(pilot) {
  return {
    id: pilot.id || '',
    email: pilot.email || '',
    status: pilot.status || '',
    slaDue: pilot.slaDue || '',
  };
}

function buildReport(now = Date.now()) {
  const board = loadBoard();
  const pilots = Array.isArray(board.pilots) ? board.pilots : [];
  const open = pilots.filter((pilot) => ACTIVE.has(pilot.status) && pilot.slaDue);
  const overdue = open.filter((pilot) => new Date(pilot.slaDue).getTime() < now);
  const dueSoon = open.filter((pilot) => {
    const diff = new Date(pilot.slaDue).getTime() - now;
    return diff > 0 && diff < 24 * 3600 * 1000;
  });
  return {
    at: new Date(now).toISOString(),
    ok: overdue.length === 0,
    open: open.length,
    overdue: overdue.length,
    dueSoon: dueSoon.length,
    overduePilots: overdue.map(pilotRow),
    dueSoonPilots: dueSoon.map(pilotRow),
    report: reportPath(),
    sent: false,
    liveMail: false,
    liveSlack: false,
  };
}

function run() {
  const report = buildReport();
  fs.mkdirSync(dataRoot(), { recursive: true });
  atomicWrite(report.report, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  return report.ok ? 0 : 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(run());
