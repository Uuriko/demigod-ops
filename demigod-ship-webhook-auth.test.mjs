#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShipChecklist } from './demigod-ship-checklist.mjs';

const SECRET_KEYS = [
  'DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP',
  'DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER',
  'DEMIGOD_WEBFLOW_WEBHOOK_SECRET',
];

function withSecrets(values, fn) {
  const before = Object.fromEntries(SECRET_KEYS.map((key) => [key, process.env[key]]));
  for (const key of SECRET_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  try { return fn(); } finally {
    for (const key of SECRET_KEYS) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
}

test('ship checklist labels unsigned webhook mode local-only without blocking site ship', () => {
  const checklist = withSecrets({}, buildShipChecklist);
  const item = checklist.items.find((entry) => entry.id === 'webhook-auth-production');
  assert.deepEqual(checklist.webhookAuth, { mode: 'compat-unsigned', keyCount: 0, productionReady: false });
  assert.equal(item.ok, false);
  assert.equal(item.warn, true);
  assert.equal(item.block, false);
  assert.match(item.detail, /local only; production webhook is not ready/);
});

test('ship checklist reports configured HMAC without exposing key material', () => {
  const secret = 'd'.repeat(64);
  const checklist = withSecrets({ DEMIGOD_WEBFLOW_WEBHOOK_SECRET: secret }, buildShipChecklist);
  const item = checklist.items.find((entry) => entry.id === 'webhook-auth-production');
  assert.deepEqual(checklist.webhookAuth, { mode: 'webflow-hmac-sha256', keyCount: 1, productionReady: true });
  assert.equal(item.ok, true);
  assert.equal(item.warn, false);
  assert.doesNotMatch(JSON.stringify({ item, auth: checklist.webhookAuth }), new RegExp(secret));
});
