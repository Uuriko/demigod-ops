import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { allowFormAnalyticsWrite, allowTimestampRequest, MAX_ANALYTICS_BODY, normalizeFormEvent, processFormAnalyticsRequest, recordFormEvent, summarizeFormAnalytics } from './demigod-form-analytics.mjs';

test('talent name and resume analytics remain distinct aggregate steps', () => {
  // Foot v801+ dropped linkedin-url as a required talent field; keep name + resume distinct.
  const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  assert.match(foot, /'full-name':'name'/);
  assert.match(foot, /resume:'resume'/);
  assert.doesNotMatch(foot, /'linkedin-url':'linkedin'/);
  for (const step of ['name', 'resume']) {
    assert.equal(normalizeFormEvent({ form: 'talent', step, event: 'view', device: 'desktop' }).step, step);
  }
  assert.equal(normalizeFormEvent({ form: 'talent', step: 'profile', event: 'view', device: 'desktop' }).error, 'invalid_event');
});

test('form analytics stores only aggregate allowlisted dimensions and respects DNT', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-form-analytics-'));
  const store = path.join(dir, 'analytics.json');
  const now = Date.parse('2026-07-20T12:34:56Z');
  const input = {
    form: 'talent', step: 3, event: 'view', device: 'mobile',
    email: 'private@example.com', name: 'Private Person', answer: 'secret',
    url: 'https://example.com/resume.pdf', ip: '203.0.113.1', userAgent: 'browser', resumeType: 'application/pdf',
  };
  assert.equal(recordFormEvent(input, { store, now }).ok, true);
  const text = fs.readFileSync(store, 'utf8');
  assert.deepEqual(JSON.parse(text).cells, [{ bucket: '2026-07-20T12:00:00.000Z', form: 'talent', step: 'step-3', event: 'view', device: 'mobile', count: 1 }]);
  for (const secret of ['private@example.com', 'Private Person', 'secret', 'resume.pdf', '203.0.113.1', 'browser', 'application/pdf']) assert.ok(!text.includes(secret));
  assert.equal(fs.statSync(store).mode & 0o777, 0o600);
  const dntStore = path.join(dir, 'dnt.json');
  assert.equal(recordFormEvent({ ...input, dnt: '1' }, { store: dntStore, now }).ignored, 'dnt');
  assert.equal(fs.existsSync(dntStore), false);
});

test('analytics request boundary accepts only small JSON projections and DNT', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-form-route-'));
  const store = path.join(dir, 'analytics.json');
  const now = Date.parse('2026-07-20T12:34:56Z');
  const request = JSON.stringify({ form: 'startup', step: 'role', event: 'view', device: 'desktop', email: 'leak@example.com' });
  assert.equal(processFormAnalyticsRequest(request, { contentType: 'application/json', store, now }).status, 204);
  assert.ok(!fs.readFileSync(store, 'utf8').includes('leak@example.com'));
  assert.equal(processFormAnalyticsRequest(request, { contentType: 'text/plain', store, now }).status, 415);
  assert.equal(processFormAnalyticsRequest('{', { contentType: 'application/json', store, now }).status, 400);
  assert.equal(processFormAnalyticsRequest('x'.repeat(MAX_ANALYTICS_BODY + 1), { contentType: 'application/json', store, now }).status, 413);
  const dntStore = path.join(dir, 'dnt.json');
  assert.equal(processFormAnalyticsRequest(request, { contentType: 'application/json', dnt: '1', store: dntStore, now }).status, 204);
  assert.equal(fs.existsSync(dntStore), false);
});

test('analytics resists anonymous floods and malformed aggregate state without identity storage', () => {
  const hits = [];
  assert.equal(allowFormAnalyticsWrite(hits, 1_000, 2), true);
  assert.equal(allowFormAnalyticsWrite(hits, 1_001, 2), true);
  assert.equal(allowFormAnalyticsWrite(hits, 1_002, 2), false);
  assert.deepEqual(hits, [1_000, 1_001]);
  assert.equal(allowFormAnalyticsWrite(hits, 61_000, 2), true);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-form-poison-'));
  const store = path.join(dir, 'analytics.json');
  const now = Date.parse('2026-07-20T12:34:56Z');
  fs.writeFileSync(store, JSON.stringify({ cells: [
    { bucket: '2026-07-20T12:00:00.000Z', form: 'talent', step: 'review', event: 'view', device: 'desktop', count: '9'.repeat(1000), email: 'leak@example.com' },
    { bucket: '2026-07-20T12:00:00.000Z', form: 'talent', step: 'complete', event: 'completion', device: 'desktop', count: Number.MAX_SAFE_INTEGER },
    { bucket: 'bad', form: 'talent', step: 'review', event: 'view', device: 'desktop', count: 4, name: 'Private' },
    { bucket: '2099-01-01T00:00:00.000Z', form: 'talent', step: 'review', event: 'view', device: 'desktop', count: 4, email: 'future@example.com' },
  ] }));
  assert.equal(recordFormEvent({ form: 'talent', step: 'review', event: 'view', device: 'desktop' }, { store, now }).ok, true);
  assert.equal(recordFormEvent({ form: 'talent', step: 'complete', event: 'completion', device: 'desktop' }, { store, now }).ok, true);
  const saved = fs.readFileSync(store, 'utf8');
  assert.deepEqual(JSON.parse(saved).cells, [
    { bucket: '2026-07-20T12:00:00.000Z', form: 'talent', step: 'review', event: 'view', device: 'desktop', count: 1 },
    { bucket: '2026-07-20T12:00:00.000Z', form: 'talent', step: 'complete', event: 'completion', device: 'desktop', count: Number.MAX_SAFE_INTEGER },
  ]);
  assert.ok(!saved.includes('leak@example.com') && !saved.includes('future@example.com') && !saved.includes('Private'));
});

test('timestamp-only status budget allows normal polling but bounds inbox reads', () => {
  const hits = [];
  for (let i = 0; i < 120; i++) assert.equal(allowTimestampRequest(hits, i, 120), true);
  assert.equal(allowTimestampRequest(hits, 119, 120), false);
  assert.equal(allowTimestampRequest(hits, 60_000, 120), true);
  assert.equal(hits.length, 120);
});

test('aggregate form summary exposes recent funnel counts without copying unknown fields', () => {
  const now = Date.parse('2026-07-20T12:00:00Z');
  const summary = summarizeFormAnalytics({ cells: [
    { bucket: '2026-07-20T11:00:00Z', form: 'talent', step: 'start', event: 'start', device: 'desktop', count: 4, email: 'private@example.com' },
    { bucket: '2026-07-20T11:00:00Z', form: 'talent', step: 'resume', event: 'view', device: 'desktop', count: 3 },
    { bucket: '2026-07-20T11:00:00Z', form: 'talent', step: 'resume', event: 'validation', device: 'desktop', count: 2 },
    { bucket: '2026-07-20T11:00:00Z', form: 'talent', step: 'complete', event: 'completion', device: 'desktop', count: 2 },
    { bucket: '2026-05-01T00:00:00Z', form: 'talent', step: 'start', event: 'start', device: 'desktop', count: 50 },
    { bucket: '2026-07-20T11:00:00Z', form: 'unknown', step: 'private-answer', event: 'view', device: 'desktop', count: 99 },
  ] }, now);
  assert.deepEqual(summary.talent, { starts: 4, completions: 2, validations: 2, steps: { resume: 3 }, validationSteps: { resume: 2 }, completionRate: 50 });
  assert.doesNotMatch(JSON.stringify(summary), /private@example|private-answer/);
});

// Poison-test: identity must never reach the store, and "silent no-op success" must stay detectable.
// DNT and invalid events return non-ok / 204-without-write — not a green write of empty privacy theater.
test('form analytics disabled/ignore paths are fail-capable (not silent green writes)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-form-disabled-'));
  const store = path.join(dir, 'analytics.json');
  const now = Date.parse('2026-07-20T12:34:56Z');

  // Valid write baseline (not vacuous-red).
  assert.equal(recordFormEvent({ form: 'talent', step: 'name', event: 'view', device: 'desktop' }, { store, now }).ok, true);
  assert.equal(fs.existsSync(store), true);

  // DNT must not create or extend a store (disabled-for-this-request).
  const dntStore = path.join(dir, 'dnt.json');
  const dnt = recordFormEvent({ form: 'talent', step: 'name', event: 'view', device: 'desktop', dnt: '1' }, { store: dntStore, now });
  assert.equal(dnt.ok, false);
  assert.equal(dnt.ignored, 'dnt');
  assert.equal(fs.existsSync(dntStore), false, 'DNT must leave no analytics file');

  // Invalid / identity-only payloads must not return ok:true (would green-wash a no-op capture).
  const bad = recordFormEvent({ form: 'talent', step: 'profile', event: 'view', device: 'desktop', email: 'private@example.com' }, { store, now });
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'invalid_event');
  assert.ok(!fs.readFileSync(store, 'utf8').includes('private@example.com'));

  // Request path: DNT and invalid body must not look like a stored success with identity.
  const req = JSON.stringify({ form: 'startup', step: 'role', event: 'view', device: 'desktop', email: 'leak@example.com' });
  assert.equal(processFormAnalyticsRequest(req, { contentType: 'application/json', dnt: '1', store: path.join(dir, 'req-dnt.json'), now }).status, 204);
  assert.equal(fs.existsSync(path.join(dir, 'req-dnt.json')), false);
  assert.equal(processFormAnalyticsRequest(JSON.stringify({ form: 'nope', step: 'x', event: 'view', device: 'desktop' }), { contentType: 'application/json', store, now }).status, 422);
});
