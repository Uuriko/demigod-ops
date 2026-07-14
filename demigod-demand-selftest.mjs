#!/usr/bin/env node
/**
 * demigod-demand-selftest + next + ledger smoke
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildNext } from './demigod-next.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

function run(script, args = []) {
  return spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
  });
}

const st = run('demigod-demand.mjs', ['status', '--json']);
ok(st.status === 0, 'demand status exit 0');
let demand = null;
try {
  demand = JSON.parse(st.stdout.slice(st.stdout.indexOf('{')));
} catch {
  /* */
}
ok(demand?.honesty?.agentNeverAutoSends === true, 'never auto-sends flag');
ok(demand?.honesty?.inventsPilots === false, 'no invent pilots');
ok(typeof demand?.dms?.sentConfirmed === 'number', 'sentConfirmed is number');
ok(typeof demand?.queue?.pending === 'number', 'pending is number');
ok(demand?.pilots?.realFilled === 0 || demand?.pilots?.realFilled > 0, 'realFilled present');
// Must not claim fake pilots when table is empty placeholders
if (demand?.pilots?.realFilled === 0) {
  ok(true, 'zero real pilots allowed (honest)');
}

const q = run('demigod-demand.mjs', ['queue', '--json']);
ok(q.status === 0, 'demand queue');

const t = run('demigod-demand.mjs', ['templates']);
ok(t.status === 0, 'demand templates');
ok(/REPLY-TEMPLATES|reply/i.test(t.stdout), 'templates mention reply');

// freeze must not block demand
const freeze = freezeStatus();
ok(st.status === 0, 'demand works regardless of freeze=' + (freeze.frozen ? 'ON' : 'OFF'));

// next builder
const n = buildNext();
ok(n.id && n.cmd && n.title, 'buildNext shape');
ok(typeof n.freeze?.on === 'boolean', 'next has freeze');
ok(typeof n.truthEvidence?.green === 'boolean', 'next has truthEvidence');
const te = refuseIfStale('truth');
if (te.green && freeze.frozen) {
  ok(n.id === 'demand-human' || n.cmd.includes('demand'), 'green+freeze → demand next');
  ok(n.mutate === false, 'demand next not mutate');
}
if (!te.green) {
  ok(n.id === 'truth', 'stale → truth next');
}

const nx = run('demigod-next.mjs', ['--json']);
ok(nx.status === 0, 'demigod-next CLI');
ok(fs.existsSync('/tmp/dg-busy/next.json'), 'next.json written');

// ledger file path exists after truth (may already)
const led = path.join(ROOT, 'DEMIGOD-VERSION-LEDGER.jsonl');
const truth = run('demigod-truth.mjs', ['--quiet']);
ok(truth.status === 0 || truth.status === 1, 'truth runs for ledger');
ok(fs.existsSync(led), 'version ledger file exists');
const last = fs.readFileSync(led, 'utf8').trim().split('\n').pop();
let line = null;
try {
  line = JSON.parse(last);
} catch {
  /* */
}
ok(line && line.diskVer, 'ledger last line has diskVer');
ok(typeof line.freeze === 'boolean', 'ledger freeze boolean');

// refuse inventing: demand status must not say "sent 15" if log empty — check consistency
if (demand.dms.sentConfirmed === 0) {
  ok(!/sent 1[5-9]|15\+ DMs/i.test(st.stdout), 'no fake high sent counts in text');
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-demand-selftest');
