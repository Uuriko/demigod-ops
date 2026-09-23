#!/usr/bin/env node
/**
 * Worker budget enforcer — cap concurrent agent processes (laptop hygiene).
 *
 * Usage:
 *   node demigod-worker-budget.mjs status
 *   node demigod-worker-budget.mjs check [--max 6]   # exit 1 if over
 *   node demigod-worker-budget.mjs list
 *
 * The report is written in DEMIGOD_ROOT. The command does not publish or stop a process.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, opt } from './demigod-agent-tools-lib.mjs';

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-WORKER-BUDGET.json');
}

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function diskFootVer() {
  try {
    const foot = fs.readFileSync(path.join(dataRoot(), 'demigod-foot-core.js'), 'utf8');
    return (foot.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);
if (args.includes('--publish')) fail('publish_refused');

const cmd = args[0] || 'status';
const MAX = Number(opt(args, '--max', process.env.DG_WORKER_MAX || '6')) || 6;

function snapshot() {
  let raw = '';
  try {
    raw = execSync(
      "ps -eo pid,etime,pcpu,pmem,cmd --width 240 | grep -E 'claude --print|codex exec|bin/df |demigod-agent-dashboard|cm6-paste' | grep -v grep || true",
      { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
    );
  } catch {
    raw = '';
  }
  const lines = raw.split('\n').filter(Boolean);
  const workers = lines.map((line) => {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!m) return { raw: line.slice(0, 120) };
    const cmdLine = m[5];
    let kind = 'other';
    if (/fable|bin\/df/.test(cmdLine)) kind = 'fable';
    else if (/model sonnet/.test(cmdLine)) kind = 'sonnet';
    else if (/model opus/.test(cmdLine)) kind = 'opus';
    else if (/claude/.test(cmdLine)) kind = 'claude';
    else if (/codex exec/.test(cmdLine)) kind = 'codex';
    else if (/demigod-agent-dashboard/.test(cmdLine)) kind = 'dashboard';
    else if (/cm6-paste/.test(cmdLine)) kind = 'publish';
    return { pid: m[1], etime: m[2], pcpu: m[3], pmem: m[4], kind, cmd: cmdLine.slice(0, 140) };
  });
  const heavy = workers.filter((w) => !['dashboard', 'other'].includes(w.kind));
  return {
    at: new Date().toISOString(),
    path: reportPath(),
    diskFootVer: diskFootVer(),
    max: MAX,
    count: heavy.length,
    heavy,
    all: workers,
    sent: false,
    liveMail: false,
    livePublish: false,
  };
}

const snap = snapshot();
atomicWrite(reportPath(), JSON.stringify(snap, null, 2) + '\n');

function emit(body, code) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(code);
}

if (cmd === 'list' || cmd === 'status') {
  const body = {
    at: snap.at,
    path: snap.path,
    diskFootVer: snap.diskFootVer,
    count: snap.count,
    max: snap.max,
    over: snap.count > snap.max,
    byKind: snap.heavy.reduce((a, w) => {
      a[w.kind] = (a[w.kind] || 0) + 1;
      return a;
    }, {}),
    workers: snap.heavy,
    sent: false,
    liveMail: false,
    livePublish: false,
  };
  if (cmd === 'check' || args.includes('--check')) {
    emit(body, snap.count > snap.max ? 1 : 0);
  }
  emit(body, 0);
}

if (cmd === 'check') {
  emit({
    ok: snap.count <= snap.max,
    path: snap.path,
    diskFootVer: snap.diskFootVer,
    count: snap.count,
    max: snap.max,
    over: snap.count > snap.max,
    sent: false,
    liveMail: false,
    livePublish: false,
  }, snap.count > snap.max ? 1 : 0);
}

console.error('usage: status | list | check [--max N]');
process.exit(2);
