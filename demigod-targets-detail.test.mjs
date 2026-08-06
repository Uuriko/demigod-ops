#!/usr/bin/env node
// Guard: the --detail join adds company context WITHOUT inventing anything and without
// persisting map columns into the target store.
//
// The store's rule (iteration O) is that it holds judgement plus the ledger's own observations.
// Copying description/website/teamSize in would create a third source of truth that goes stale
// silently, so the join happens at display time and the store keeps its shape.
//
//   node --test demigod-targets-detail.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { companyContext, companyKeyFor, mergeTargets } from './demigod-role-ledger.mjs';

const row = (company, age) => ({ company, age, title: 'Staff Engineer', url: `https://b.example/${company}/1`, provider: 'Greenhouse' });

test('companyKeyFor normalises the way the startup screen does', () => {
  assert.equal(companyKeyFor('General Proximity'), 'generalproximity');
  assert.equal(companyKeyFor('Long Term Stock Exchange'), 'longtermstockexchange');
  assert.equal(companyKeyFor('  Coram.AI '), 'coramai');
  assert.equal(companyKeyFor(null), '');
});

test('companyContext returns only display fields, never contact fields', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ctx-'));
  const f = path.join(dir, 'map.json');
  fs.writeFileSync(f, JSON.stringify({ companies: [
    { name: 'Acme Labs', description: 'Builds things', website: 'https://acme.example/', teamSize: 12,
      stage: 'Early', jobsUrl: 'https://boards.example/acme', sourceLicense: 'YC-public',
      email: 'must-not-leak@acme.example', neighborhood: 'Mission' },
  ] }));
  const ctx = companyContext(f);
  const a = ctx.acmelabs;
  assert.ok(a, 'company resolved by normalised key');
  assert.deepEqual(Object.keys(a).sort(), ['description', 'jobsUrl', 'sourceLicense', 'stage', 'teamSize', 'website']);
  assert.doesNotMatch(JSON.stringify(ctx), /must-not-leak/, 'no contact field may be carried through');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a missing map file degrades to no context rather than throwing', () => {
  assert.deepEqual(companyContext('/nonexistent/map.json'), {});
});

test('a company absent from the map yields no context — and must not crash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ctx2-'));
  const f = path.join(dir, 'map.json');
  fs.writeFileSync(f, JSON.stringify({ companies: [{ name: 'Acme Labs', description: 'x' }] }));
  const ctx = companyContext(f);
  // This is the real case: the ledger still sees a company the regenerated map dropped.
  assert.equal(ctx[companyKeyFor('Vanished Co')], undefined);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the store itself never gains map columns', () => {
  const store = mergeTargets({ schema: 'demigod.targets/1', companies: {} }, [row('Acme Labs', 200)], '2026-08-06');
  const keys = Object.keys(store.companies.acmelabs);
  for (const forbidden of ['description', 'website', 'teamSize', 'stage', 'jobsUrl']) {
    assert.equal(keys.includes(forbidden), false, `${forbidden} must stay in the map, not the store`);
  }
});

test('a multi-word company keys identically in the store and the context join', () => {
  // The bug this catches: mergeTargets once used trim().toLowerCase() (keeping the space) while
  // companyContext keyed on alphanumerics only, so "general proximity" and "generalproximity" were
  // two identities for one company and --detail silently showed no context for every multi-word
  // name. Single-word fixtures cannot catch it — both schemes agree on "Hightouch".
  const store = mergeTargets({ schema: 'demigod.targets/1', companies: {} }, [row('General Proximity', 314)], '2026-08-06');
  const storeKeys = Object.keys(store.companies);
  assert.deepEqual(storeKeys, ['generalproximity'], `store key must be normalised, got ${storeKeys}`);
  assert.equal(storeKeys[0], companyKeyFor('General Proximity'), 'store and context must agree on identity');
  for (const k of storeKeys) assert.doesNotMatch(k, /\s/, 'no whitespace may survive in a store key');
});
