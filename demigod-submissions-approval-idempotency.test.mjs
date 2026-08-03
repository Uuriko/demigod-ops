import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const realTmp = fs.realpathSync(os.tmpdir());
const testRoot = fs.mkdtempSync(path.join(realTmp, 'dg-submissions-approval-'));
process.env.DEMIGOD_TEST_SCOPE = `submissions-approval-${process.pid}`;
process.env.DEMIGOD_TEST_ROOT = testRoot;
process.env.DEMIGOD_INBOX_PATH = path.join(testRoot, 'test-submissions-inbox.json');
after(() => {
  const real = fs.realpathSync(testRoot);
  assert.equal(path.dirname(real), realTmp);
  assert.ok(path.basename(real).startsWith('dg-submissions-approval-'));
  fs.rmSync(real, { recursive: true, force: true });
});

const {
  approveSubmission,
  mintBoardEntry,
  BOARD_PATH,
  INBOX_PATH,
  saveBoard,
  saveInbox,
} = await import('./demigod-submissions-lib.mjs');

const requiredRoleEvidence = {
  'company-name': 'Fixture Co',
  'company-stage': 'seed',
  '90day-outcome': 'Own one measurable launch outcome',
  'work-location': 'San Francisco, CA',
  'salary-range': '$180-220k',
  'interview-process': 'Founder chat → work sample → final; target decision in ~2 weeks',
  'contact-email': 'founder@fixture.invalid',
};

test('repeated approval reuses one featured card', () => {
  saveBoard({ roles: [], candidates: [] }, { reason: 'approval-idempotency-test' });
  saveInbox({ items: [{
    id: 'sub-approval-idempotency',
    form: 'startup-hire',
    status: 'new',
    raw: { ...requiredRoleEvidence, 'role-title': 'Founding Designer', 'stack-needs': 'Seed design systems' },
  }] });

  const first = approveSubmission('sub-approval-idempotency', { reason: 'approval-test:first' });
  const second = approveSubmission('sub-approval-idempotency', { reason: 'approval-test:second' });
  const inbox = JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8'));
  const board = JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));

  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(second.featured.id, first.featured.id);
  assert.equal(board.roles.length, 1);
  assert.equal(inbox.items[0].status, 'featured');
  assert.equal(inbox.items[0].featuredId, first.featured.id);
});

test('approval retry repairs a board-success inbox-failure orphan', () => {
  const submission = {
    id: 'sub-approval-orphan',
    form: 'startup-hire',
    status: 'new',
    raw: { ...requiredRoleEvidence, 'role-title': 'Founding PM', 'stack-needs': 'Seed product' },
  };
  saveBoard({ roles: [], candidates: [] }, { reason: 'approval-orphan-test' });
  saveInbox({ items: [submission] });

  // Exact failure boundary: board persisted, inbox featured state did not.
  mintBoardEntry({ ...submission, status: 'reviewed' }, { reason: 'approval-orphan:halfway' });
  const repaired = approveSubmission(submission.id, { reason: 'approval-orphan:retry' });
  const inbox = JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8'));
  const board = JSON.parse(fs.readFileSync(BOARD_PATH, 'utf8'));

  assert.equal(repaired.reused, true);
  assert.equal(repaired.repaired, true);
  assert.equal(board.roles.length, 1);
  assert.equal(inbox.items[0].status, 'featured');
  assert.equal(inbox.items[0].featuredId, board.roles[0].id);
});
