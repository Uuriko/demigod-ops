#!/usr/bin/env node
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

// Derived, never hardcoded: REPO_ROOT exists on one laptop and fails in any clean checkout.
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

const ROOT = REPO_ROOT;
const PRODUCTION_FILES = ['DEMIGOD-SUBMISSIONS-INBOX.json', 'DEMIGOD-BOARD.json'].map((name) => path.join(ROOT, name));

function fingerprint(file) {
  return fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : 'missing';
}

async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => socket.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

function waitForStart(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`webhook startup timed out: ${output}`)), 5000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('\n')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`webhook exited during startup (${code ?? signal}): ${output}`));
    });
  });
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 2000);
    child.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
}

test('real webhook process enforces raw-body HMAC before isolated writes', async () => {
  const scope = `webhook-hmac-${process.pid}-${Date.now()}`;
  const testDir = path.join('/tmp/dg-busy/tests', scope);
  const inbox = path.join(testDir, 'test-submissions-inbox.json');
  const productionBefore = PRODUCTION_FILES.map(fingerprint);
  const secret = 'c'.repeat(64);
  const port = await freePort();
  const child = spawn(process.execPath, ['demigod-submissions-webhook.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      DEMIGOD_TEST_SCOPE: scope,
      DEMIGOD_WEBHOOK_HOST: '127.0.0.1',
      DEMIGOD_WEBHOOK_PORT: String(port),
      DEMIGOD_WEBFLOW_WEBHOOK_SECRET_STARTUP: '',
      DEMIGOD_WEBFLOW_WEBHOOK_SECRET_ENGINEER: '',
      DEMIGOD_WEBFLOW_WEBHOOK_SECRET: secret,
      DEMIGOD_AUTO_FEATURE: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForStart(child);
    const base = `http://127.0.0.1:${port}`;
    const health = await (await fetch(`${base}/health`)).json();
    assert.deepEqual(health.auth, { mode: 'webflow-hmac-sha256', keyCount: 1 });
    assert.deepEqual(Object.keys(health.auth).sort(), ['keyCount', 'mode']);
    assert.doesNotMatch(JSON.stringify(health), new RegExp(secret));

    const body = Buffer.from(JSON.stringify({
      triggerType: 'form_submission',
      payload: {
        id: `hmac-${Date.now()}`,
        name: 'startup-hire',
        data: { 'company-name': 'Demigod Labs', 'contact-email': 'process-check@integration.invalid', 'role-title': 'Designer' },
      },
    }));
    const post = (headers = {}) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

    assert.equal((await post()).status, 401);
    assert.equal(fs.existsSync(inbox), false, 'missing signature must not create the inbox');
    assert.equal((await post({ 'x-webflow-timestamp': String(Date.now()), 'x-webflow-signature': '0'.repeat(64) })).status, 401);
    assert.equal(fs.existsSync(inbox), false, 'bad signature must not create the inbox');

    const timestamp = String(Date.now());
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}:`).update(body).digest('hex');
    assert.equal((await post({ 'x-webflow-timestamp': timestamp, 'x-webflow-signature': signature })).status, 200);
    const saved = JSON.parse(fs.readFileSync(inbox, 'utf8'));
    assert.equal(saved.items.length, 1);
    assert.equal(saved.items[0].raw['contact-email'], 'process-check@integration.invalid');
    assert.deepEqual(PRODUCTION_FILES.map(fingerprint), productionBefore, 'production inbox/board hashes must remain unchanged');
  } finally {
    await stop(child);
    assert.ok(child.exitCode !== null || child.signalCode !== null, 'child process must be cleaned up');
    assert.deepEqual(PRODUCTION_FILES.map(fingerprint), productionBefore, 'production hashes must remain unchanged even on failure');
  }
});
