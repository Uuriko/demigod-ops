import test from 'node:test';
import assert from 'node:assert/strict';
import { approveSubmission, ingestSubmission, loadBoard, loadInbox, publicStatus, saveBoard, saveInbox, submissionApprovalBlocker } from './demigod-submissions-lib.mjs';
import { REFERRALS_PATH } from './demigod-referrals.mjs';

test('direct test runs isolate referral side effects', () => {
  assert.match(REFERRALS_PATH, /^\/tmp\/dg-busy\/tests\//);
});

test('intake rejection cannot be promoted by approval', () => {
  const candidateRaw = {
    'full-name': 'Candidate', 'seeker-email': 'candidate@example.com', 'skills-stack': 'Design',
    experience: 'Shipped onboarding', 'sf-bay': 'yes', availability: 'now',
    'salary-expectation': '$170–190k base', 'work-auth': 'authorized',
    'resume-url': 'https://example.com/resume.pdf',
  };
  assert.equal(submissionApprovalBlocker({ status: 'rejected', rejectReasons: ['missing_resume'] }), 'rejected');
  assert.equal(submissionApprovalBlocker({ status: 'spam' }), 'spam');
  assert.equal(submissionApprovalBlocker({ status: 'new', rejectReasons: ['invalid_email'] }), 'rejected_by_intake');
  assert.equal(submissionApprovalBlocker({ status: 'new' }), null);
  assert.equal(submissionApprovalBlocker({ status: 'featured', featuredId: 'cand-1', rejectReasons: ['legacy'] }), null);
  assert.equal(submissionApprovalBlocker({ form: 'candidate', status: 'updated', raw: { 'skills-stack': 'Design' } }), 'duplicate_update');
  assert.equal(submissionApprovalBlocker({ form: 'startup-hire', status: 'new', raw: { 'role-title': 'Designer' } }), 'missing_required_evidence');
  assert.equal(submissionApprovalBlocker({ form: 'candidate', status: 'new', raw: candidateRaw }), null);
  assert.equal(
    submissionApprovalBlocker({ form: 'candidate', status: 'new', raw: { ...candidateRaw, 'work-auth': '' } }),
    'missing_required_evidence',
  );
});

test('approveSubmission enforces the shared blocker before board work', async () => {
  const source = await import('node:fs').then((fs) => fs.readFileSync(new URL('./demigod-submissions-lib.mjs', import.meta.url), 'utf8'));
  assert.match(source, /const blocker = submissionApprovalBlocker\(submission\);\s*if \(blocker\)/);
  assert.match(source, /err\.code = 'NOT_APPROVABLE'/);
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
