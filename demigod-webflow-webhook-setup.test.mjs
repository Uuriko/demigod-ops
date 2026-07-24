#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveWebflowWebhookSecrets, webflowWebhookSecretCoverage } from './demigod-webhook-auth.mjs';
import { priorCreatedWebhooks, tryApiWebhooks, validateWebhookTarget } from './demigod-webflow-webhook-setup.mjs';

process.env.DEMIGOD_CURRENT_REQUEST_PUBLISH = '1'; // fixture fetches are fully mocked

function responses(rows) {
  let index = 0;
  return async () => {
    const body = rows[index++];
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  };
}

test('API setup persists returned secretKey privately without reporting it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-setup-'));
  const secretFile = path.join(dir, 'webhook.env');
  const startup = 'a'.repeat(64);
  const engineer = 'b'.repeat(64);
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  try {
    const result = await tryApiWebhooks('https://hooks.example.com/', {
      fetchImpl: responses([{ id: 'one', secretKey: startup }, { id: 'two', secretKey: engineer }]),
      secretFile,
    });
    assert.equal(result.ok, true);
    assert.equal(fs.statSync(secretFile).mode & 0o077, 0);
    assert.deepEqual(resolveWebflowWebhookSecrets({}, { secretFile }), [startup, engineer]);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(`${startup}|${engineer}`));
  } finally {
    delete process.env.WEBFLOW_API_TOKEN;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('successful create without documented secretKey fails closed', async () => {
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  try {
    const result = await tryApiWebhooks('https://hooks.example.com/', {
      fetchImpl: responses([{ id: 'one' }, { id: 'two', secret_key: 'c'.repeat(64) }]),
      secretFile: path.join(os.tmpdir(), `dg-webhook-missing-${process.pid}.env`),
    });
    assert.equal(result.ok, false);
    assert.equal(result.createdButUnauthenticated, true);
    assert.equal(result.secretKeyCount, 0);
  } finally { delete process.env.WEBFLOW_API_TOKEN; }
});

test('successful create without a valid webhook id fails closed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-missing-id-'));
  const secretFile = path.join(dir, 'webhook.env');
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  try {
    const result = await tryApiWebhooks('https://hooks.example.com/', {
      fetchImpl: responses([{ secretKey: 'a'.repeat(64) }, { id: 'two', secretKey: 'b'.repeat(64) }]),
      secretFile,
    });
    assert.equal(result.ok, false);
    assert.equal(result.results[0].error, 'webflow_api_invalid_response');
    assert.deepEqual(resolveWebflowWebhookSecrets({}, { secretFile }), ['b'.repeat(64)]);
  } finally {
    delete process.env.WEBFLOW_API_TOKEN;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('API error receipts do not echo arbitrary response text', async () => {
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  const echoed = 'private-response-text';
  try {
    const result = await tryApiWebhooks('https://hooks.example.com/', {
      fetchImpl: async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ id: echoed, message: echoed }) }),
    });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(echoed));
    assert.equal(result.results[0].error, 'webflow_api_error');
  } finally { delete process.env.WEBFLOW_API_TOKEN; }
});

test('setup has no unsigned dashboard creation fallback', () => {
  const source = fs.readFileSync(new URL('./demigod-webflow-webhook-setup.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /connectBrowser|tryDashboardCdp|fillUrl/);
  assert.match(source, /unsigned dashboard fallback disabled/);
});

test('retry readiness is per form, not merely a matching key count', () => {
  const startup = 'a'.repeat(64);
  const engineer = 'b'.repeat(64);
  assert.deepEqual(webflowWebhookSecretCoverage({ DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP: startup }), { startup: true, engineer: false });
  assert.deepEqual(webflowWebhookSecretCoverage({ DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER: engineer }), { startup: false, engineer: true });
  assert.deepEqual(webflowWebhookSecretCoverage({ DEMIGOD_WEBFLOW_WEBHOOK_SECRET: startup }), { startup: true, engineer: true });
});

test('partial setup receipt skips the completed form on retry', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-retry-'));
  const secretFile = path.join(dir, 'webhook.env');
  const startup = 'e'.repeat(64);
  const engineer = 'f'.repeat(64);
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  let calls = 0;
  try {
    const first = await tryApiWebhooks('https://hooks.example.com/', {
      secretFile,
      fetchImpl: async () => {
        calls += 1;
        return calls === 1
          ? { ok: true, status: 200, text: async () => JSON.stringify({ id: 'startup-id', secretKey: startup }) }
          : { ok: false, status: 503, text: async () => JSON.stringify({ message: 'unavailable' }) };
      },
    });
    assert.equal(first.ok, false);
    const prior = priorCreatedWebhooks({ webhookUrl: 'https://hooks.example.com/', attempts: [first] }, 'https://hooks.example.com/');
    assert.deepEqual([...prior], [['startup-hire', 'startup-id']]);

    const retryCalls = [];
    const retry = await tryApiWebhooks('https://hooks.example.com/', {
      secretFile,
      skipForms: prior,
      configuredKeyCount: 1,
      fetchImpl: async (_url, options) => {
        retryCalls.push(JSON.parse(options.body).filter.name);
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'engineer-id', secretKey: engineer }) };
      },
    });
    assert.equal(retry.ok, true);
    assert.deepEqual(retryCalls, ['engineer-join'], 'retry must not duplicate the completed startup webhook');
    assert.deepEqual(resolveWebflowWebhookSecrets({}, { secretFile }), [startup, engineer]);
    assert.doesNotMatch(JSON.stringify(retry), new RegExp(`${startup}|${engineer}`));
  } finally {
    delete process.env.WEBFLOW_API_TOKEN;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('network failure preserves a webhook created earlier in the batch', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-network-'));
  const secretFile = path.join(dir, 'webhook.env');
  const startup = '9'.repeat(64);
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  let calls = 0;
  try {
    const result = await tryApiWebhooks('https://hooks.example.com/', {
      secretFile,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 2) throw new Error('network unavailable');
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'startup-id', secretKey: startup }) };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.results[1].error, 'webflow_api_unavailable');
    assert.deepEqual(
      [...priorCreatedWebhooks({ webhookUrl: 'https://hooks.example.com/', attempts: [result] }, 'https://hooks.example.com/')],
      [['startup-hire', 'startup-id']],
    );
    assert.deepEqual(resolveWebflowWebhookSecrets({}, { secretFile }), [startup]);
  } finally {
    delete process.env.WEBFLOW_API_TOKEN;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('invalid webhook targets fail before any fetch', async () => {
  process.env.WEBFLOW_API_TOKEN = 'fixture-token';
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('must not fetch'); };
  try {
    for (const target of [
      'http://hooks.example.com/',
      'https://127.0.0.1/',
      'https://10.2.3.4/',
      'https://[::1]/',
      'https://[::ffff:127.0.0.1]/',
      'https://service.local/hook',
      'https://user:pass@hooks.example.com/',
      'https://hooks.example.com/#secret',
      `https://hooks.example.com/${'x'.repeat(2050)}`,
      'not a url',
    ]) {
      assert.equal(validateWebhookTarget(target).ok, false, target);
      const result = await tryApiWebhooks(target, { fetchImpl });
      assert.equal(result.ok, false);
      assert.match(result.reason, /^invalid webhook target:/);
    }
    assert.equal(calls, 0);
    assert.equal(validateWebhookTarget('https://hooks.example.com/webflow').ok, true);
  } finally { delete process.env.WEBFLOW_API_TOKEN; }
});
