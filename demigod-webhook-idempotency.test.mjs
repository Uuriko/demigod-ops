#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ingestSubmission, loadInbox, parseWebhookPayload, saveBoard, saveInbox } from './demigod-submissions-lib.mjs';

const handler = fs.readFileSync(new URL('./demigod-submissions-webhook.mjs', import.meta.url), 'utf8');
assert.match(handler, /const parsed = parseWebhookPayload\(buf\);/);
assert.match(handler, /ingestSubmission\(\{ \.\.\.parsed, name: formName \}\)/, 'handler must preserve sourceSubmissionId');
assert.match(handler, /id: result\.record\.id/, 'handler receipt must use the reused record id');

saveInbox({ items: [], recentContacts: [] });
saveBoard({ roles: [], candidates: [] }, { reason: 'provider-event-idempotency-test' });

const wire = (id) => JSON.stringify({
  triggerType: 'form_submission',
  payload: {
    id,
    name: 'engineer-join',
    data: {
      'seeker-email': 'retry@example.com',
      'skills-stack': 'Product operations',
      'resume-url': 'https://files.example.com/retry.pdf',
    },
  },
});

const firstPayload = parseWebhookPayload(wire('wf-event-1'));
assert.equal(firstPayload.sourceSubmissionId, 'wf-event-1');
const first = ingestSubmission(firstPayload);
const retry = ingestSubmission(parseWebhookPayload(wire('wf-event-1')));
assert.equal(retry.reused, true);
assert.equal(retry.record.id, first.record.id, 'same provider event must reuse the receipt');
assert.equal(loadInbox().items.length, 1, 'same provider event must not prepend a duplicate');

const resubmission = ingestSubmission(parseWebhookPayload(wire('wf-event-2')));
assert.equal(resubmission.reused, false);
assert.notEqual(resubmission.record.id, first.record.id, 'different provider event must remain distinct');
assert.equal(resubmission.record.status, 'updated', 'same-email resubmission keeps existing update semantics');
assert.equal(resubmission.record.supersedes, first.record.id);
assert.equal(loadInbox().items.length, 2);

for (const invalid of ['', 'bad/id', 'x'.repeat(161), { id: 'object' }]) {
  const parsed = parseWebhookPayload(JSON.stringify({ triggerType: 'form_submission', payload: { id: invalid, name: 'engineer-join', data: {} } }));
  assert.equal(parsed.sourceSubmissionId, undefined);
}

console.log('demigod provider-event idempotency: PASS');
