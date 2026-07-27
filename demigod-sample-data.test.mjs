#!/usr/bin/env node
// Honesty predicate coverage. isSampleData() is the ONE gate deciding sample-vs-real across the
// whole matcher (suggestMatches / proposeForCandidate / proposeIntro tag matches `sample:` from it,
// and outbound/receipt paths must never fire on sample data). Historically sim data has laundered
// into the real system of record; this pins the exact truth table so a refactor can't silently widen
// what counts as "real". Run: node --test demigod-sample-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSampleData } from './demigod-submissions-lib.mjs';
import { isSampleRole, isSampleCandidate } from './demigod-matching-engine.mjs';

test('flags sample/selftest/real:false at top level', () => {
  assert.equal(isSampleData({ sample: true }), true);
  assert.equal(isSampleData({ selftest: true }), true);
  assert.equal(isSampleData({ real: false }), true, 'real:false is the rolesFromPartnerInbox marker');
  assert.equal(isSampleData({ raw: { sample: true } }), true);
  assert.equal(isSampleData({ raw: { selftest: true } }), true);
});

test('default is REAL — absence of a flag is not sample (board/real inbound)', () => {
  assert.equal(isSampleData({}), false);
  assert.equal(isSampleData({ real: true }), false);
  assert.equal(isSampleData({ sample: false }), false);
  assert.equal(isSampleData(undefined), false, 'no-arg default must not crash');
});

test('sharp edges (locked deliberately — change only on purpose)', () => {
  // strict boolean: a stringy "true" does NOT count as sample. If forms ever serialize the flag as
  // a string, this test must change AND isSampleData must be widened together — not silently.
  assert.equal(isSampleData({ sample: 'true' }), false, 'strict ===true; string "true" is not sample');
  // asymmetry: top-level real:false marks sample, but nested raw.real:false does NOT (raw only checks
  // sample/selftest). Pinned so no one assumes raw.real is honored without adding it + this assert.
  assert.equal(isSampleData({ raw: { real: false } }), false, 'raw.real is NOT checked (unlike top-level real)');
});

test('engine isSampleRole/isSampleCandidate delegate to isSampleData', () => {
  assert.equal(isSampleRole({ sample: true }), true);
  assert.equal(isSampleRole({ real: false }), true);
  assert.equal(isSampleRole({ title: 'Eng', real: true }), false);
  assert.equal(isSampleCandidate({ selftest: true }), true);
  assert.equal(isSampleCandidate({ skills: 'React' }), false);
});
