#!/usr/bin/env node
// Fail-closed: unknown flags must not vacuous-green the suite (POSIX usage = exit 2).
{
  const argvFlags = process.argv.slice(2).filter((a) => a.startsWith('-'));
  if (argvFlags.length) {
    console.error(
      `usage: node demigod-harness-selftest.mjs  (no flags; got ${argvFlags.join(' ')})`,
    );
    process.exit(2);
  }
}
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { acquireWorkUnit, classifyVerdict, normalizeGap, receiptIsFresh, selectDomain } from './demigod-harness-coord.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
function ok(value, name) { console.log(`${value ? 'PASS' : 'FAIL'} ${name}`); if (!value) failed += 1; }

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-harness-test-'));
const file = path.join(dir, 'work-unit.lock');
const first = acquireWorkUnit({ owner: 'fixture-first', file });
const second = acquireWorkUnit({ owner: 'fixture-second', file });
ok(first.acquired === true && second.acquired === false, 'two simultaneous requests admit exactly one worker');
ok(second.current?.owner === 'fixture-first', 'contender receives structured busy-lock owner');
first.release();
ok(!fs.existsSync(file), 'owner alone releases lock');

const fixtures = {
  blocked: { ok: true, blocked: true },
  degraded: { ok: true, degraded: true },
  fallback: { ok: true, executionMode: 'in-process-fallback' },
  eperm: { ok: true, failureKind: 'child-start', error: { code: 'EPERM' } },
  timeout: { ok: true, timeout: true, childExit: 124 },
};
for (const [name, fixture] of Object.entries(fixtures)) ok(classifyVerdict(fixture) !== 'pass', `${name} fixture is not progress`);
ok(classifyVerdict({ ok: true, health: [{ exit: 0 }] }) === 'pass', 'direct attested fixture alone passes');

const never = fs.readFileSync(path.join(ROOT, 'demigod-never-stop-loop.mjs'), 'utf8');
const passBranch = never.match(/if \(pass\) \{[\s\S]*?\} else \{/g)?.at(-1) || '';
ok(/markDone\(work\.id, state\)/.test(passBranch) && !/BLOCKED-DONE|after 3 fails/.test(never), 'never-stop doneIds mutation is confined to direct pass');
ok(/verificationFingerprint/.test(never) && /cooldownUntil/.test(never) && /lastVerdict/.test(never), 'never-stop persists fingerprint, cooldown, and verdict');

const future = new Date(Date.now() + 60_000).toISOString();
const past = new Date(Date.now() - 1).toISOString();
ok(selectDomain({ domains: { tools: { cooldownUntil: future } } }) === 'ship', 'cooldown selects another eligible blocker');
ok(selectDomain({ domains: { tools: { cooldownUntil: past } } }) === 'tools', 'expired cooldown permits retry');
ok(selectDomain({ releaseBlocked: true }) === 'ship', 'active release blocker outranks healthy domains');
const receiptNow = Date.parse('2026-07-20T22:00:00.000Z');
ok(receiptIsFresh({ at: new Date(receiptNow - 900_000).toISOString() }, receiptNow), 'release receipt is fresh at exact boundary');
ok(!receiptIsFresh({ at: new Date(receiptNow - 900_001).toISOString() }, receiptNow), 'stale release receipt is rejected');
ok(!receiptIsFresh({ at: 'invalid' }, receiptNow), 'invalid release receipt is rejected');
ok(!receiptIsFresh({ at: new Date(receiptNow + 1).toISOString() }, receiptNow), 'future release receipt is rejected');

ok(normalizeGap(5) === 60 && normalizeGap('bad') === 60 && normalizeGap(120) === 120, 'effective swarm gap never below 60 seconds');
const swarm = fs.readFileSync(path.join(ROOT, 'demigod-swarm-busy.mjs'), 'utf8');
ok(/duplicate-supervisor/.test(swarm) && /const roles = \['codex'\]/.test(swarm), 'duplicate supervisors rejected and implementation role bounded');
ok(spawnSync(process.execPath, [path.join(ROOT, 'demigod-swarm-busy.mjs'), 'unknown']).status === 2, 'swarm rejects unknown commands');

fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
