/**
 * Poison tests for demigod-die-contracts-check.
 *
 * A contract checker that cannot fail is worse than none: it converts "nobody verified this" into
 * "verified", which is exactly the confusion the checker exists to remove. Everything here feeds it
 * something broken and asserts it says so. The green run in verify-all only means something because
 * these prove the red run is reachable.
 *
 * Also pins the state semantics grok set when handing this work over: `unwired` is neither a pass
 * nor a violation. Free prose must not fail the suite, and must never be counted as enforced.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkContracts, hiringStatusComplaints, parseSections, EXECUTORS, SCHEMA } from './demigod-die-contracts-check.mjs';

test('a missing CONTRACTS.md fails — absence is never health', async () => {
  const report = await checkContracts({ file: path.join(os.tmpdir(), 'dg-no-such-contracts.md') });
  assert.equal(report.ok, false, 'a missing contract document must not pass quietly');
  assert.match(String(report.error), /missing/i);
});

test('a contract document with no numbered sections fails rather than passing vacuously', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-contracts-'));
  const file = path.join(dir, 'CONTRACTS.md');
  try {
    fs.writeFileSync(file, '# Contracts\n\nSome prose with no numbered headings at all.\n');
    const report = await checkContracts({ file });
    assert.equal(report.ok, false, 'zero parsed sections is a broken parse, not a clean bill');
    assert.match(String(report.error), /no numbered sections/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('unwired is not a pass — prose-only sections are never counted as enforced', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-contracts-'));
  const file = path.join(dir, 'CONTRACTS.md');
  try {
    // Section numbers with no executor. If these ever report `pass`, the checker is lying.
    fs.writeFileSync(file, '## 101. Invented\n\nprose\n\n## 102. Also invented\n\nmore prose\n');
    const report = await checkContracts({ file });
    assert.equal(report.counts.unwired, 2);
    assert.equal(report.counts.pass, 0, 'prose must never be counted as verified');
    assert.equal(report.counts.violation, 0, 'prose must never fail the suite either');
    assert.equal(report.ok, true, 'unwired alone keeps the run green, by design');
    assert.ok(report.sections.every((s) => s.status === 'unwired'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an executor that throws is reported as a violation, not swallowed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-contracts-'));
  const file = path.join(dir, 'CONTRACTS.md');
  const saved = EXECUTORS[5];
  try {
    fs.writeFileSync(file, '## 5. Claim\n\nprose\n');
    EXECUTORS[5] = { name: 'exploding executor', run: () => { throw new Error('boom'); } };
    const report = await checkContracts({ file });
    assert.equal(report.ok, false, 'a throwing executor must fail the run');
    assert.equal(report.counts.violation, 1);
    assert.match(String(report.sections[0].detail), /boom/);
  } finally {
    EXECUTORS[5] = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an executor returning a violation fails the whole run', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-contracts-'));
  const file = path.join(dir, 'CONTRACTS.md');
  const saved = EXECUTORS[11];
  try {
    fs.writeFileSync(file, '## 11. Safe URL\n\nprose\n');
    EXECUTORS[11] = { name: 'always-violating', run: () => ({ status: 'violation', detail: 'contract broken' }) };
    const report = await checkContracts({ file });
    assert.equal(report.ok, false);
    assert.equal(report.counts.violation, 1);
  } finally {
    EXECUTORS[11] = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('headings are parsed structurally, so the document stays editable', () => {
  // Pinned to `## N. Title`, not to byte offsets or a hash — grok keeps authoring this file and
  // must be able to amend §29 without the checker going red for cosmetic reasons.
  const md = [
    '## 1. Company identity',
    'prose',
    '### 5. subsection is not a contract',
    '## 29. Role mission kernel',
    'more prose',
  ].join('\n');
  const parsed = parseSections(md);
  assert.deepEqual(parsed.map((s) => s.n), [1, 29], 'only ## headings count');
  assert.equal(parsed[1].title, 'Role mission kernel');
  assert.deepEqual(parseSections('## not numbered\n'), []);
});

test('§29 board-observed goes red for a status function that trusts a date alone', async () => {
  // The bug this rule exists for, reintroduced: `openRolesAt` present, no count, and the ladder
  // still calls it observed. That is what live yc:10x said until 2026-08-17.
  const dateAlone = (company = {}, { quarantined = false } = {}) => {
    if (quarantined) return 'quarantined';
    if (company.openRolesStale) return 'board_stale';
    return company.openRolesAt ? 'board_observed' : 'unknown';
  };
  const complaints = hiringStatusComplaints(dateAlone);
  assert.ok(complaints.length > 0, 'a date-only ladder must be reported, not accepted');
  assert.match(complaints.join(' '), /not company_reported/);

  const { hiringStatusOf } = await import('./demigod-role-mission-kernel.mjs');
  assert.deepEqual(hiringStatusComplaints(hiringStatusOf), [], 'and the real kernel must have nothing to answer for');
});

test('the live contract set is green and genuinely exercised', async () => {
  const report = await checkContracts();
  assert.equal(report.schema, SCHEMA);
  assert.equal(report.ok, true, `live violations: ${JSON.stringify(report.sections.filter((s) => s.status === 'violation'))}`);
  assert.ok(report.counts.pass >= 3, 'at least the wired sections must really run');
  assert.ok(report.counts.unwired > 0, 'the unwired backlog is the point — it must stay visible');
});
