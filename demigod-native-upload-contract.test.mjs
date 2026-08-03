#!/usr/bin/env node
import assert from 'node:assert/strict';
import { extractResumeReference, ingestSubmission, parseWebhookPayload, shouldAutoReject } from './demigod-submissions-lib.mjs';

const resume = 'https://uploads-ssl.webflow.com/site/file_candidate-resume.pdf';
const payload = parseWebhookPayload(JSON.stringify({
  triggerType: 'form_submission',
  payload: {
    name: 'engineer-join',
    data: {
      'seeker-email': 'candidate@example.com',
      'skills-stack': 'GTM operations',
      experience: 'Built lifecycle programs.',
      resume,
    },
  },
}));

assert.equal(extractResumeReference(payload.data), resume);
assert.equal(shouldAutoReject(payload.data, payload.name, { items: [] }).reject, false);
const { record } = ingestSubmission(payload);
assert.equal(record.raw.resume, resume, 'native upload URL must survive webhook -> private inbox');
assert.equal(extractResumeReference(record.raw), resume, 'private review must resolve the native field');

for (const bad of ['javascript:alert(1)', 'http://example.com/resume.pdf', 'https://user:secret@example.com/resume.pdf']) {
  const gate = shouldAutoReject({ ...payload.data, resume: bad }, payload.name, { items: [] });
  assert.ok(gate.reasons.includes('resume_url_invalid'), `unsafe native resume must fail: ${bad}`);
}

assert.equal(extractResumeReference({ Resume: resume }), resume);
assert.equal(extractResumeReference({ 'resume-url': resume }), resume);
assert.equal(extractResumeReference({ resume: { url: resume } }), '', 'unexpected object shapes must not be string-coerced');
assert.ok(shouldAutoReject({ ...payload.data, resume: { url: resume } }, payload.name, { items: [] }).reasons.includes('resume_url_invalid'));
assert.ok(shouldAutoReject({ ...payload.data, 'resume-url': { url: resume } }, payload.name, { items: [] }).reasons.includes('resume_url_invalid'));

console.log('demigod native upload data contract: PASS');
