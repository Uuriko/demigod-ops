import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStatus, draftHygiene, operatingDateKey, queueWhyUnbackedFlags } from './demigod-demand.mjs';

test('time-sensitive recipient claims fail closed without a fresh source receipt', () => {
  // Hygiene ages against America/Los_Angeles operating day — not UTC ISO date
  // (late-evening PDT is already "tomorrow" in UTC and would false-fail).
  const today = operatingDateKey();
  const claim = 'Hi there,\n\nNoticed Acme is hiring engineers in SF.';
  const flags = (body) => draftHygiene({ name: 'Acme', company: 'Acme', body }).flags;

  assert.ok(flags(claim).some((flag) => flag.id === 'claim_source_freshness' && flag.sev === 'error'));
  assert.ok(flags(`# source: https://example.com/jobs\n# verified: 2026-02-31\n${claim}`).some((flag) => flag.id === 'claim_source_freshness'));
  assert.ok(flags(`# source: https://example.com/jobs\n# verified: 2000-01-01\n${claim}`).some((flag) => flag.id === 'claim_source_freshness'));
  assert.ok(!flags(`# source: https://example.com/jobs\n# verified: ${today}\n${claim}`).some((flag) => flag.id === 'claim_source_freshness'));
  assert.ok(!flags('Hi there,\n\nAcme felt like a strong fit. If you are hiring, share a role.').some((flag) => flag.id === 'claim_source_freshness'));
});

test('legacy SENT-CONFIRMED logging instructions fail closed', () => {
  const body = '# log send in dm-send-log.txt as SENT-CONFIRMED\n\nHi there,\n\nHello.';
  assert.ok(draftHygiene({ name: 'Acme', company: 'Acme', body }).flags.some((flag) => flag.id === 'legacy_send_logging'));
});

test('quantified role counts require a countable board URL, not a marketing careers page', () => {
  const today = operatingDateKey();
  const claim = 'Hi team,\n\nSaw Acme has seven open roles across growth and product.\n\nDemigod starts with one role and one 90-day outcome.';
  const careers = `# source: https://www.acme.example/careers\n# verified: ${today}\n${claim}`;
  const ycJobs = `# source: https://www.ycombinator.com/companies/acme/jobs\n# verified: ${today}\n${claim}`;
  const ashby = `# source: https://api.ashbyhq.com/posting-api/job-board/acme\n# verified: ${today}\n${claim}`;
  assert.ok(draftHygiene({ name: 'Acme', company: 'Acme', body: careers }).flags.some((f) => f.id === 'role_count_source' && f.sev === 'error'));
  assert.ok(!draftHygiene({ name: 'Acme', company: 'Acme', body: ycJobs }).flags.some((f) => f.id === 'role_count_source'));
  assert.ok(!draftHygiene({ name: 'Acme', company: 'Acme', body: ashby }).flags.some((f) => f.id === 'role_count_source'));
  // Product pitch "one role" without has/have is not a recipient role-count claim.
  const soft = `# source: https://www.acme.example/careers\n# verified: ${today}\nHi team,\n\nSaw Acme lists San Francisco as HQ. Demigod starts with one role and one 90-day outcome.`;
  assert.ok(!draftHygiene({ name: 'Acme', company: 'Acme', body: soft }).flags.some((f) => f.id === 'role_count_source'));
});

test('queue why role counts must be backed by ready-draft body', () => {
  const softDraft = 'Hi team,\n\nSaw Acme lists San Francisco as HQ. Demigod starts with one role.';
  assert.ok(queueWhyUnbackedFlags('seven SF roles across DevRel', softDraft).some((f) => f.id === 'queue_why_unbacked'));
  assert.equal(queueWhyUnbackedFlags('SF HQ + careers invite (no board)', softDraft).length, 0);
  assert.equal(
    queueWhyUnbackedFlags('13 live roles across design', 'Saw Pocket has 13 open roles, including design.').length,
    0,
  );
});

test('flagged draft packs are never labeled ready', () => {
  const status = buildStatus();
  if (status.drafts.needFix.length) assert.doesNotMatch(status.next, /draft packs ready/i);
});
