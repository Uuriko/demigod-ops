import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSendLog } from './demigod-demand.mjs';

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
