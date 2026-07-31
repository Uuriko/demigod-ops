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

test('an alias path never claims canonical for itself', () => {
  const src = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  // Pull the REAL declarations and the REAL expression out of foot-core, so this exercises shipped
  // behaviour instead of a copy of the rule that could drift from it.
  const decls = src.slice(src.indexOf('var DG_PAGE_PATHS = {'));
  const DG_PAGE_PATHS = Object.fromEntries(
    [...decls.slice(0, decls.indexOf('};')).matchAll(/'(\/[a-z0-9-]*)':\s*'([a-z-]+)'/g)].map((m) => [m[1], m[2]]),
  );
  const prefSrc = src.slice(src.indexOf('var preferred = {'));
  const preferred = Object.fromEntries(
    [...prefSrc.slice(0, prefSrc.indexOf('};')).matchAll(/([a-z]+):'(\/[a-z]*)'/g)].map((m) => [m[1], m[2]]),
  );
  const line = /var pagePath = ([^;]+);/.exec(src)?.[1];
  assert.ok(line, 'found the pagePath expression');
  const pagePathFor = new Function('DG_PAGE_PATHS', 'preferred', 'pathNow', 'id', `return ${line};`);

  assert.ok(Object.keys(DG_PAGE_PATHS).length > 20 && Object.keys(preferred).length > 10, 'declarations parsed');

  // THE INVARIANT: for any declared path, canonical is the ROUTE's preferred path — never the alias.
  // Without this, /referral, /referrals and /partners (all route 'refer') each asserted they were
  // the original, which is precisely the duplication a canonical exists to resolve.
  const offenders = [];
  for (const [pathNow, id] of Object.entries(DG_PAGE_PATHS)) {
    if (!preferred[id]) continue;
    const got = pagePathFor(DG_PAGE_PATHS, preferred, pathNow, id);
    if (got !== preferred[id]) offenders.push(`${pathNow} (${id}) -> ${got}, want ${preferred[id]}`);
  }
  assert.deepEqual(offenders, [], 'every declared alias must canonicalise to its route preferred path');

  // Named regressions, so a future edit cannot quietly re-break the ones we measured live.
  assert.equal(pagePathFor(DG_PAGE_PATHS, preferred, '/how-it-works', 'how'), '/how');
  assert.equal(pagePathFor(DG_PAGE_PATHS, preferred, '/referrals', 'refer'), '/refer');
  assert.equal(pagePathFor(DG_PAGE_PATHS, preferred, '/media', 'press'), '/press');
  // The preferred path still canonicalises to itself, and an unknown route still degrades to ?p=.
  assert.equal(pagePathFor(DG_PAGE_PATHS, preferred, '/how', 'how'), '/how');
  assert.equal(pagePathFor(DG_PAGE_PATHS, preferred, '/', 'nosuchroute'), '/?p=nosuchroute');
});
