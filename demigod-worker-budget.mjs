#!/usr/bin/env node
/**
 * Worker budget enforcer — cap concurrent agent processes (laptop hygiene).
 *
 * Usage:
 *   node demigod-worker-budget.mjs status
 *   node demigod-worker-budget.mjs check [--max 6]   # exit 1 if over
 *   node demigod-worker-budget.mjs list
 */
import { execSync } from 'child_process';
import { BUSY, ensureBusy, atomicWrite, opt } from './demigod-agent-tools-lib.mjs';

const args = process.argv.slice(2);
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
  return { at: new Date().toISOString(), max: MAX, count: heavy.length, heavy, all: workers };
}

const snap = snapshot();
ensureBusy();
atomicWrite(`${BUSY}/worker-budget.json`, JSON.stringify(snap, null, 2) + '\n');

if (cmd === 'list' || cmd === 'status') {
  console.log(
    JSON.stringify(
      {
        at: snap.at,
        count: snap.count,
        max: snap.max,
        over: snap.count > snap.max,
        byKind: snap.heavy.reduce((a, w) => {
          a[w.kind] = (a[w.kind] || 0) + 1;
          return a;
        }, {}),
        workers: snap.heavy,
      },
      null,
      2,
    ),
  );
  if (cmd === 'check' || args.includes('--check')) {
    process.exit(snap.count > snap.max ? 1 : 0);
  }
  process.exit(0);
}

if (cmd === 'check') {
  console.log(
    JSON.stringify({
      ok: snap.count <= snap.max,
      count: snap.count,
      max: snap.max,
      over: snap.count > snap.max,
    }),
  );
  process.exit(snap.count > snap.max ? 1 : 0);
}

console.error('usage: status | list | check [--max N]');
process.exit(2);
