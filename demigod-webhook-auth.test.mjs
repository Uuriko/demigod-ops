#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { persistWebflowWebhookSecrets, resolveWebflowWebhookSecrets, verifyWebflowWebhook, webhookAuthReadiness, webhookAuthSafeToBind } from './demigod-webhook-auth.mjs';

const body = Buffer.from('{"triggerType":"form_submission","payload":{"id":"abc123"}}');
const timestamp = '1722370035277';
const secret = 'a'.repeat(64);
const signature = crypto.createHmac('sha256', secret).update(`${timestamp}:`).update(body).digest('hex');

assert.deepEqual(resolveWebflowWebhookSecrets({}), []);
assert.deepEqual(webhookAuthReadiness([]), { mode: 'compat-unsigned', keyCount: 0 });
assert.equal(verifyWebflowWebhook(body, {}, []).allowed, true, 'unset auth must preserve unsigned compatibility');
for (const host of ['127.0.0.1', '::1', 'localhost', 'LOCALHOST']) assert.equal(webhookAuthSafeToBind(host, []), true);
for (const host of ['0.0.0.0', '::', '192.168.1.2']) assert.equal(webhookAuthSafeToBind(host, []), false);
assert.equal(webhookAuthSafeToBind('0.0.0.0', [secret]), true);

const secrets = resolveWebflowWebhookSecrets({
  DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP: secret,
  DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER: 'b'.repeat(64),
  DEMIGOD_WEBFLOW_WEBHOOK_SECRET: secret,
  IRRELEVANT_SECRET: 'c'.repeat(64),
});
assert.deepEqual(secrets, [secret, 'b'.repeat(64)], 'aliases are bounded and deduplicated');
assert.deepEqual(webhookAuthReadiness(secrets), { mode: 'webflow-hmac-sha256', keyCount: 2 });
assert.equal(verifyWebflowWebhook(body, { 'x-webflow-timestamp': timestamp, 'x-webflow-signature': signature }, secrets).allowed, true);
for (const headers of [
  {},
  { 'x-webflow-timestamp': timestamp, 'x-webflow-signature': '0'.repeat(64) },
  { 'x-webflow-timestamp': 'not-time', 'x-webflow-signature': signature },
  { 'x-webflow-timestamp': timestamp, 'x-webflow-signature': 'short' },
]) assert.equal(verifyWebflowWebhook(body, headers, secrets).allowed, false);

const publicState = JSON.stringify(webhookAuthReadiness(secrets));
assert.doesNotMatch(publicState, new RegExp(secret));
assert.doesNotMatch(publicState, /SECRET_STARTUP|SECRET_ENGINEER/);

const handler = fs.readFileSync(new URL('./demigod-submissions-webhook.mjs', import.meta.url), 'utf8');
const verifyAt = handler.indexOf('verifyWebflowWebhook(buf, req.headers, WEBFLOW_SECRETS)');
const parseAt = handler.indexOf('parseWebhookPayload(buf)');
const ingestAt = handler.indexOf('ingestSubmission({ ...parsed, name: formName })');
assert.ok(verifyAt >= 0 && parseAt > verifyAt && ingestAt > parseAt, 'handler must authenticate raw body before parse and ingest');
assert.match(handler, /auth: WEBFLOW_AUTH/);
assert.match(handler, /webhookAuthSafeToBind\(HOST, WEBFLOW_SECRETS\)/);
assert.doesNotMatch(handler, /auth:\s*WEBFLOW_SECRETS/);

const failureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-secret-failure-'));
const directoryTarget = path.join(failureDir, 'target-is-a-directory');
const leakedTmp = `${directoryTarget}.${process.pid}.tmp`;
fs.mkdirSync(directoryTarget);
try {
  assert.throws(() => persistWebflowWebhookSecrets(
    { DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP: secret },
    { secretFile: directoryTarget },
  ));
  assert.equal(fs.existsSync(leakedTmp), false, 'failed rename must not leave a plaintext secret temp file');
} finally {
  fs.rmSync(failureDir, { recursive: true, force: true });
}

console.log('demigod Webflow webhook auth readiness: PASS');
