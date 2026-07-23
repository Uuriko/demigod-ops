import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseSendLog } from './demigod-demand.mjs';

test('demand imports ignore the parent CLI flags', (t) => {
  const bin = new URL('./demigod-lead-pipeline.mjs', import.meta.url).pathname;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-demand-import-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'DEMIGOD-LEADS.json'), '{"partners":[],"talent":[]}\n');
  const result = spawnSync(process.execPath, [bin, 'tick', '--stage=status'], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: root },
  });
  if (result.error?.code === 'EPERM') return t.skip('sandbox forbids nested process creation');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /demand: unknown argument/);
});

// Poison-test for the anti-fake-DM attestation gate (parseSendLog): a SENT-CONFIRMED row counts as a
// real sent DM only with a genuine attested=1 non-auto receipt. Every forgery must be quarantined with
// the right reason. Codifies the manual verification from autopilot c450. The agent structurally cannot
// fabricate a "sent" — this locks that so a future edit can't loosen the gate silently.

const VALID = 'SENT-CONFIRMED | 2026-07-15 | @realguy | RealCo | dm | attested=1 | via=manual';

test('parseSendLog counts only a genuine attested manual send', () => {
  const r = parseSendLog(VALID);
  assert.equal(r.count, 1, 'a valid attested=1 via=manual receipt must count');
  assert.equal(r.malformedCount, 0);
});

test('parseSendLog quarantines every forgery with the correct reason (fail-capable)', () => {
  const log = [
    VALID,
    'SENT-CONFIRMED | 2026-07-15 | @faker | FakeCo | dm | attested=0',                       // attested=0 claiming confirmed
    'SENT-CONFIRMED | 2026-07-15 | @noattest | NoCo | dm',                                    // missing attestation
    'SENT-CONFIRMED | 2026-07-15 | @autofake | AutoCo | dm | attested=1 | via=agent-auto',    // agent-claimed auto-send
    'SENT-CONFIRMED | 2099-01-01 | @future | FutCo | dm | attested=1 | via=manual',           // future date
    'SENT-CONFIRMED | 2026-07-15 | @dup | DupCo | dm | attested=1 | attested=0',              // contradictory metadata
  ].join('\n');
  const r = parseSendLog(log);
  assert.equal(r.count, 1, 'only the valid receipt counts — forgeries must not inflate sent');
  assert.equal(r.malformedCount, 5, 'all 5 forgeries quarantined');
  assert.equal(r.malformedReasons.invalid_attestation, 2, 'attested=0 + missing → invalid_attestation');
  assert.equal(r.malformedReasons.prohibited_auto_send, 1, 'via=agent-auto → prohibited_auto_send');
  assert.equal(r.malformedReasons.invalid_or_future_date, 1, 'future date → invalid_or_future_date');
  assert.equal(r.malformedReasons.conflicting_metadata, 1, 'attested=1|attested=0 → conflicting_metadata');
});

test('parseSendLog: a forged agent-auto send can NEVER become confirmed even with attested=1', () => {
  // The load-bearing invariant: the agent must not be able to fabricate a sent DM.
  const r = parseSendLog('SENT-CONFIRMED | 2026-07-15 | @x | XCo | dm | attested=1 | via=automation');
  assert.equal(r.count, 0, 'via=automation must never count as a confirmed send');
  assert.equal(r.malformedReasons.prohibited_auto_send, 1);
});

test('mark-sent cannot mint delivery truth and keeps attempt telemetry private', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-mark-sent-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = new URL('./demigod-dm-mark-sent.mjs', import.meta.url).pathname;
  const run = (...args) => spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8',
    env: { ...process.env, DEMIGOD_ROOT: root },
  });
  const outreach = path.join(root, 'demigod-outreach');
  const log = path.join(outreach, 'dm-send-log.txt');
  const identity = ['--handle=@real_handle', '--company=Real Co', '--channel=x'];

  const attested = run(...identity, '--i-sent-it');
  if (attested.error?.code === 'EPERM') return t.skip('sandbox forbids nested process creation');
  assert.equal(attested.status, 2);
  assert.match(attested.stderr, /external_delivery_receipt_required/);
  assert.equal(fs.existsSync(log), false, 'self-attestation must not create a send log');

  const automated = run(...identity, '--agent-auto', '--i-sent-it');
  assert.equal(automated.status, 2);
  assert.match(automated.stderr, /auto_dm_stopped/);
  assert.equal(fs.existsSync(log), false, 'automation must not create a send log');

  const attempt = run(...identity, '--unattested');
  assert.equal(attempt.status, 0, attempt.stderr);
  const text = fs.readFileSync(log, 'utf8');
  const parsed = parseSendLog(text);
  assert.equal(parsed.count, 0, 'an attempt must not count as delivery');
  assert.equal(parsed.unattestedCount, 1);
  assert.equal(fs.statSync(outreach).mode & 0o777, 0o700);
  assert.equal(fs.statSync(log).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(path.join(outreach, 'DM-BATCH-TRACKER.md')), false, 'attempt must not mutate sent projections');

  const poisoned = run('--handle=@real_handle', '--company=Bad|Co', '--channel=x', '--unattested');
  assert.equal(poisoned.status, 2);
  assert.equal(fs.readFileSync(log, 'utf8'), text, 'invalid fields must not mutate telemetry');
});

test('founder draft tool cannot project a local draft as sent', (t) => {
  const bin = new URL('./demigod-founder-dm-blast.mjs', import.meta.url).pathname;
  const root = path.dirname(bin);
  const files = [
    path.join(root, 'demigod-outreach', 'blast-log.json'),
    path.join(root, 'DEMIGOD-BOARD.json'),
  ];
  const digest = (file) => fs.existsSync(file)
    ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : null;
  const before = files.map(digest);
  const source = fs.readFileSync(bin, 'utf8');

  assert.doesNotMatch(source, /log\.sent\.push|--status=dm-sent/);
  const result = spawnSync(process.execPath, [bin, '--mark-sent=__missing_truth_fixture__'], {
    encoding: 'utf8',
  });
  if (result.error?.code === 'EPERM') return t.skip('sandbox forbids nested process creation');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /external_delivery_receipt_required/);
  assert.deepEqual(files.map(digest), before, 'refusal must not mutate local send or board state');
});
