import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Poison-test for the foot-core parse+boot gate (foot-smoke): it must PASS the real foot-core and FAIL
// a syntactically-broken one. This is the multi-day-outage class — a foot-core that greps-green but does
// not parse (v150) breaks the live site. Verified manually in autopilot c471; codified here (#40) so a
// future edit that swallows the vm.Script/boot exception is caught, like the c458 honesty poison-tests.

const SMOKE = path.join(import.meta.dirname, 'demigod-foot-smoke.mjs');
const REAL_FOOT = path.join(import.meta.dirname, 'demigod-foot-core.js');

// Runs foot-smoke against `src`; returns exit code (0 = pass).
function runSmoke(src) {
  try {
    execFileSync('node', [SMOKE, src], { stdio: 'ignore' });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

test('foot-smoke PASSES the real foot-core (baseline — not vacuous-red)', () => {
  assert.equal(runSmoke(REAL_FOOT), 0, 'the real foot-core must boot clean — else the gate is vacuous-red or foot-core is broken');
});

test('foot-smoke FAILS a syntactically-broken foot-core (fail-capable)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'footsmoke-'));
  try {
    const broken = path.join(dir, 'foot-broken.js');
    // real foot-core (passes every marker/semantic check) + one syntax error → parse must throw
    fs.writeFileSync(broken, fs.readFileSync(REAL_FOOT, 'utf8') + '\nvar broken = ;\n');
    assert.notEqual(runSmoke(broken), 0, 'a syntax error anywhere in foot-core must fail the smoke gate');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('foot-smoke FAILS a foot-core that throws at boot (runtime, beyond node --check)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'footsmoke-'));
  try {
    const boom = path.join(dir, 'foot-boom.js');
    // parses fine but throws when booted — the case node --check (syntax-only) would miss
    fs.writeFileSync(boom, fs.readFileSync(REAL_FOOT, 'utf8') + '\nthrow new Error("boot explosion");\n');
    assert.notEqual(runSmoke(boom), 0, 'a boot-time throw must fail the smoke gate');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
