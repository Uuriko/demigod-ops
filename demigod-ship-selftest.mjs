#!/usr/bin/env node
/**
 * demigod-ship-selftest — freeze-safe ship CLI contract
 * Run: node demigod-ship-selftest.mjs
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

function dgShip(args, env = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, 'demigod-ship.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, ...env },
  });
}

const help = dgShip(['help']);
ok(help.status === 0, 'ship help exit 0');
ok(/freeze:/i.test(help.stdout), 'ship help shows freeze');
ok(/status|prepare|cdn|paste|verify|run/.test(help.stdout), 'ship help lists verbs');

const st = dgShip(['status', '--json']);
ok([0, 1].includes(Number(st.status)), 'ship status runs');
let report = null;
try {
  report = JSON.parse(st.stdout.slice(st.stdout.indexOf('{')));
} catch {
  /* */
}
ok(report && report.subcommand === 'status', 'status JSON schema');
ok(report && report.freeze && typeof report.freeze.on === 'boolean', 'status has freeze');
ok(report && report.next, 'status has next');
ok(report && report.truth && report.truth.diskVer, 'status parses truth diskVer');

const freeze = freezeStatus();
if (freeze.frozen) {
  const cdn = dgShip(['cdn']);
  ok(cdn.status !== 0, 'cdn blocked while frozen');
  ok(/freeze|frozen|FREEZE/i.test(cdn.stdout + cdn.stderr), 'cdn freeze message');
  const paste = dgShip(['paste']);
  ok(paste.status !== 0, 'paste blocked while frozen');
  const runAll = dgShip(['run']);
  ok(runAll.status !== 0, 'run blocked while frozen');
} else {
  console.log('skip freeze-block asserts (freeze OFF)');
}

const bad = dgShip(['nope']);
ok(bad.status === 2, 'unknown subcommand exit 2');

// ship-os.json written by status
ok(fs.existsSync('/tmp/dg-busy/ship-latest.json'), 'ship-latest.json written');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-ship-selftest');
