import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { publicStatus, shouldAutoReject } from './demigod-submissions-lib.mjs';

test('candidate ingestion requires a resume or profile reference', () => {
  const base = {
    'seeker-email': 'candidate@example.com',
    'skills-stack': 'Product design and research',
  };
  const missing = shouldAutoReject(base, 'engineer-join', { items: [] });
  assert.equal(missing.reject, true);
  assert.ok(missing.reasons.includes('missing_resume'));

  const uploaded = shouldAutoReject({ ...base, resume: 'https://uploads.example.com/resume.pdf' }, 'engineer-join', { items: [] });
  assert.equal(uploaded.reject, false);

  const linked = shouldAutoReject({ ...base, 'resume-url': 'https://drive.example.com/resume' }, 'candidate-profile', { items: [] });
  assert.equal(linked.reject, false);
});

test('malformed contact is rejected without blocking missing-email rehydration', () => {
  const base = {
    'skills-stack': 'Product design and research',
    resume: 'https://uploads.example.com/resume.pdf',
  };
  const malformed = shouldAutoReject({ ...base, 'seeker-email': 'not-an-email' }, 'engineer-join', { items: [] });
  assert.equal(malformed.reject, true);
  assert.ok(malformed.reasons.includes('invalid_email'));

  const missing = shouldAutoReject(base, 'engineer-join', { items: [] });
  assert.ok(!missing.reasons.includes('invalid_email'));

  const valid = shouldAutoReject({ ...base, 'seeker-email': 'person@example.invalid' }, 'engineer-join', { items: [] });
  assert.ok(!valid.reasons.includes('invalid_email'));
});

test('public status hides internal rejection classifications', () => {
  const spam = publicStatus({ id: 'sub-a', form: 'engineer-join', status: 'spam' });
  const rejected = publicStatus({ id: 'sub-b', form: 'engineer-join', status: 'rejected' });
  assert.equal(spam.status, 'not_accepted');
  assert.equal(rejected.status, 'not_accepted');
  assert.deepEqual(spam.steps, rejected.steps);
  assert.doesNotMatch(JSON.stringify([spam, rejected]), /spam|filtered|rejected|review gate/i);

  const webhook = fs.readFileSync(new URL('./demigod-submissions-webhook.mjs', import.meta.url), 'utf8');
  assert.match(webhook, /status: publicStatus\(result\.record\)\.status/);
  assert.doesNotMatch(webhook, /status: result\.record\.status/);
});
