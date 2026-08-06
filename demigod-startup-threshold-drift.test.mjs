#!/usr/bin/env node
// Guard: the four independent "is this a startup" classifiers must agree on their threshold.
//
// The same screen has now been implemented four times, in four files, by more than one author:
//   demigod-public-roles.mjs      STARTUP_TEAM_MAX = 200   (startupScore, the shared export)
//   demigod-role-ledger.mjs       consumes startupScore via --startups
//   demigod-lead-sourcer.mjs      consumes startupScore via --startups
//   demigod-startup-atlas-web.js  dgStartupBand, its own `teamSize <= 200`
//
// They agree today. Nothing enforces that. The atlas copy exists because the atlas is a browser
// bundle and cannot import the Node module, which is a real constraint — so the duplication is not
// obviously removable, and the cheap protection is a test that goes red when the numbers diverge
// rather than a refactor that coordinates four files other agents are actively editing.
//
// A drift here is not cosmetic: the directory would rank a company as a startup while the outreach
// tooling screened it out, and the two surfaces would disagree about who Demigod is for.
//
//   node --test demigod-startup-threshold-drift.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startupScore } from './demigod-public-roles.mjs';

const read = (f) => fs.readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');

test('source reads are real (non-vacuous: an empty read cannot satisfy the regexes)', () => {
  assert.ok(read('demigod-public-roles.mjs').length > 5000, 'public-roles read');
  assert.ok(read('demigod-startup-atlas-web.js').length > 20000, 'atlas read');
});

test('the canonical threshold is declared once, as a named constant', () => {
  const src = read('demigod-public-roles.mjs');
  const m = src.match(/const STARTUP_TEAM_MAX = (\d+)/);
  assert.ok(m, 'STARTUP_TEAM_MAX must stay a named constant — an inline number cannot be cross-checked');
  assert.equal(Number(m[1]), 200, 'canonical startup team-size ceiling');
});

test('the atlas browser copy uses the same ceiling', () => {
  const src = read('demigod-startup-atlas-web.js');
  const band = src.slice(src.indexOf('function dgStartupBand'), src.indexOf('function dgParseFilterHash'));
  assert.ok(band.length > 60, 'dgStartupBand located — markers must resolve before slicing');
  const nums = [...band.matchAll(/teamSize <= (\d+)/g)].map((x) => Number(x[1]));
  assert.ok(nums.length >= 1, 'dgStartupBand must compare teamSize against a ceiling');
  const canonical = Number(read('demigod-public-roles.mjs').match(/const STARTUP_TEAM_MAX = (\d+)/)[1]);
  for (const n of nums) {
    assert.equal(n, canonical, `atlas ceiling ${n} has drifted from STARTUP_TEAM_MAX ${canonical}`);
  }
});

test('both classifiers agree at the boundary, not just in the constant', () => {
  // A shared number is necessary but not sufficient — the comparison could be < vs <=.
  const src = read('demigod-startup-atlas-web.js');
  const band = src.slice(src.indexOf('function dgStartupBand'), src.indexOf('function dgParseFilterHash'));
  // Rebuild the atlas rule in isolation and compare verdicts across the boundary.
  const atlasBand = (teamSize) => {
    if (!Number.isSafeInteger(teamSize) || teamSize < 1) return 1;
    if (teamSize <= 200) return 2;
    return 0;
  };
  assert.match(band, /<= 200\) return 2/, 'atlas rule shape is what this test models');
  for (const n of [1, 10, 50, 199, 200, 201, 1000]) {
    const node = startupScore({ teamSize: n, stage: null, tags: [] });
    assert.equal(node, atlasBand(n), `disagreement at teamSize=${n}: node ${node} vs atlas ${atlasBand(n)}`);
  }
});
