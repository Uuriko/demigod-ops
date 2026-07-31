import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  approveSubmission,
  mintBoardEntry,
  BOARD_PATH,
  INBOX_PATH,
  saveBoard,
  saveInbox,
} from './demigod-submissions-lib.mjs';
import { isFrozen } from './demigod-agent-tools-lib.mjs';

// Derived, never hardcoded: REPO_ROOT exists on one laptop and fails in any clean checkout.
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

const requiredRoleEvidence = {
  'company-name': 'Fixture Co',
  'company-stage': 'seed',
  '90day-outcome': 'Own one measurable launch outcome',
  'work-location': 'San Francisco, CA',
  'salary-range': '$180-220k',
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

test('approval stays local unless publishing is explicit', (t) => {
  saveBoard({ roles: [], candidates: [] }, { reason: 'approval-local-only-test' });
  saveInbox({ items: [{
    id: 'sub-approval-local-only',
    form: 'startup-hire',
    status: 'new',
    raw: { ...requiredRoleEvidence, 'role-title': 'Founding Recruiter', 'stack-needs': 'Early hiring' },
  }] });

  // Keep isolated SoR via DEMIGOD_TEST_SCOPE even if NODE_TEST_CONTEXT is cleared
  // (CLI path under test must not mint production DEMIGOD-BOARD.json).
  const env = {
    ...process.env,
    DEMIGOD_FORCE_PUBLISH: '',
    DEMIGOD_TEST_SCOPE: process.env.DEMIGOD_TEST_SCOPE || `approval-local-${process.pid}`,
  };
  delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, ['demigod-submissions-approve.mjs', 'sub-approval-local-only'], {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf8',
  });
  if (run.error?.code === 'EPERM') return t.skip('sandbox forbids nested process creation');
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.ok(run.stdout.trim(), JSON.stringify(run));
  assert.equal(JSON.parse(run.stdout).publish.reason, isFrozen().on ? 'publish_frozen' : 'explicit_publish_required');
});
