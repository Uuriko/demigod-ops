import test from 'node:test';
import assert from 'node:assert/strict';
import { approveSubmission, ingestSubmission, loadBoard, loadInbox, publicStatus, saveBoard, saveInbox, submissionApprovalBlocker } from './demigod-submissions-lib.mjs';
import { REFERRALS_PATH } from './demigod-referrals.mjs';

test('direct test runs isolate referral side effects', () => {
  assert.match(REFERRALS_PATH, /^\/tmp\/dg-busy\/tests\//);
});

test('intake rejection cannot be promoted by approval', () => {
  assert.equal(submissionApprovalBlocker({ status: 'rejected', rejectReasons: ['missing_resume'] }), 'rejected');
  assert.equal(submissionApprovalBlocker({ status: 'spam' }), 'spam');
  assert.equal(submissionApprovalBlocker({ status: 'new', rejectReasons: ['invalid_email'] }), 'rejected_by_intake');
  assert.equal(submissionApprovalBlocker({ status: 'new' }), null);
  assert.equal(submissionApprovalBlocker({ status: 'featured', featuredId: 'cand-1', rejectReasons: ['legacy'] }), null);
  assert.equal(submissionApprovalBlocker({ form: 'candidate', status: 'updated', raw: { 'skills-stack': 'Design' } }), 'duplicate_update');
  assert.equal(submissionApprovalBlocker({ form: 'startup-hire', status: 'new', raw: { 'role-title': 'Designer' } }), 'missing_required_evidence');
  /* A complete candidate needs a TIMESTAMP as well as complete fields. The blocker gained
     `candidate_availability_reconfirmation_required` (demigod-submissions-lib.mjs:1118), which
     fires when availability freshness is not current — and freshness reads
     `availabilityConfirmedAt || at`. This fixture carried neither, so the date was unparseable
     rather than stale and the new rule refused it. Every real submission has `at` (ingest sets
     it); the fixture was the thing that was incomplete, not the rule. */
  const completeCandidate = (at) => ({
    form: 'candidate', status: 'new', at, raw: {
      'full-name': 'Candidate', 'seeker-email': 'candidate@example.com', 'skills-stack': 'Design',
      experience: 'Shipped onboarding', 'sf-bay': 'yes', availability: 'now',
      'salary-expectation': '$170–190k base', 'resume-url': 'https://example.com/resume.pdf',
    },
  });
  assert.equal(submissionApprovalBlocker(completeCandidate(new Date().toISOString())), null,
    'a complete, freshly-stated candidate is approvable');
  /* Assert the rule in BOTH directions. Checking only the passing case would let the blocker be
     deleted without this test noticing — the vacuous-green shape this suite keeps producing.
     CANDIDATE_INTENT_DAYS is 30, so 120 days is unambiguously stale. */
  assert.equal(
    submissionApprovalBlocker(completeCandidate(new Date(Date.now() - 120 * 86400000).toISOString())),
    'candidate_availability_reconfirmation_required',
    'stale availability must block promotion until the candidate reconfirms',
  );
});

test('approveSubmission enforces the shared blocker before board work', async () => {
  const source = await import('node:fs').then((fs) => fs.readFileSync(new URL('./demigod-submissions-lib.mjs', import.meta.url), 'utf8'));
  /* Assert the ORDERING, not the call signature. This pinned
     `submissionApprovalBlocker(submission);` — one argument — and went red when the guard got
     STRONGER: it now takes the whole inbox (`submissionApprovalBlocker(submission, inbox.items)`)
     so it can catch cross-record problems like duplicate updates. Pinning arity punishes the
     improvement. What must hold is that the blocker is consulted, that a blocker throws
     NOT_APPROVABLE, and that both happen BEFORE any board read or write. */
  const fn = source.slice(source.indexOf('export function approveSubmission'), source.indexOf('export function rejectSubmission'));
  assert.ok(fn.length > 200, 'approveSubmission body located — markers must resolve before slicing');
  assert.match(fn, /const blocker = submissionApprovalBlocker\(submission[^)]*\)/, 'blocker is consulted');
  assert.match(fn, /if \(blocker\)[\s\S]{0,200}NOT_APPROVABLE/, 'a blocker throws NOT_APPROVABLE');
  const blockerAt = fn.indexOf('submissionApprovalBlocker');
  const boardAt = Math.min(...['loadBoard(', 'writeBoard(', 'saveBoard('].map((s) => { const i = fn.indexOf(s); return i < 0 ? Infinity : i; }));
  assert.ok(blockerAt >= 0 && blockerAt < boardAt, 'the blocker must run before any board access');
});

test('incomplete legacy candidate cannot mutate the board or its inbox state', () => {
  const candidate = { id: 'legacy-candidate', form: 'engineer-join-sms', status: 'updated', raw: { 'skills-stack': 'Design' } };
  saveInbox({ items: [candidate] });
  saveBoard({ roles: [], candidates: [] }, { reason: 'approval-guard-test' });
  assert.throws(() => approveSubmission(candidate.id), (error) => error.code === 'NOT_APPROVABLE' && /duplicate_update/.test(error.message));
  const board = loadBoard();
  assert.deepEqual(board.roles, []);
  assert.deepEqual(board.candidates, []);
  assert.equal(loadInbox().items[0].status, 'updated');
});

test('same-email update cannot mint a second public card or expose the prior status reference', () => {
  const data = {
    'company-name': 'Replay Co',
    'company-stage': 'seed',
    'role-title': 'Founding Designer',
    'stack-needs': 'Design systems',
    '90day-outcome': 'Ship onboarding',
    'work-location': 'San Francisco, CA',
    'salary-range': '$180-220k',
    /* startupRoleReadiness gained `interview-process` as a required field. Without it the record
       is missing_required_evidence, auto-feature is skipped, and status stays 'new' — which is
       correct behaviour, not a dedupe bug. This test is about a REPLAY of a complete submission,
       so the fixture has to be complete. Verified: with this field, missing === []. */
    'interview-process': 'Screen, take-home, onsite',
    'contact-email': 'replay@fixture.invalid',
  };
  saveInbox({ items: [], recentContacts: [] });
  saveBoard({ roles: [], candidates: [] }, { reason: 'submission-replay-guard-test' });

  const first = ingestSubmission({ name: 'startup-hire', sourceSubmissionId: 'wf-replay-first', data }, { autoFeature: true });
  const replay = ingestSubmission({
    name: 'startup-hire',
    sourceSubmissionId: 'wf-replay-second',
    data: { ...data, 'role-title': 'Replay title' },
  }, { autoFeature: true });

  assert.equal(first.record.status, 'featured');
  assert.equal(replay.record.status, 'updated');
  assert.equal(replay.featured, null);
  assert.equal(loadBoard().roles.length, 1);
  assert.equal(loadInbox().items.find((item) => item.id === first.record.id).raw['role-title'], 'Founding Designer');
  assert.throws(() => approveSubmission(replay.record.id), (error) => error.code === 'NOT_APPROVABLE' && /duplicate_update/.test(error.message));
  assert.ok(!JSON.stringify(publicStatus(replay.record)).includes(first.record.id));
});
