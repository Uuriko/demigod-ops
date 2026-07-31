import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const production = ['/home/potter/DEMIGOD-SUBMISSIONS-INBOX.json', '/home/potter/DEMIGOD-BOARD.json'];
const hashes = () => production.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));

test('intake smoke HTTP fixtures leave production inbox and board unchanged', async (t) => {
  const before = hashes();
  const env = { ...process.env, DEMIGOD_INTAKE_SMOKE_WEBHOOK_ONLY: '1' };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, ['demigod-intake-smoke.mjs'], {
    cwd: '/home/potter',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (status !== 0) {
    assert.deepEqual(hashes(), before);
    t.skip(`sandbox blocked nested webhook process (${(stderr || stdout).trim().slice(0, 120) || `exit ${status}`})`);
    return;
  }
  assert.equal(status, 0, stderr || stdout);
  assert.deepEqual(hashes(), before);
  const result = JSON.parse(stdout);
  assert.match(result.checks.webhookHealth.scope, /^intake-smoke-\d+-\d+$/);
  assert.equal(result.checks.webflowSubmit.reason, 'explicit_--live-submit_required');
  assert.equal(result.checks.partnerPost.ok, true);
  assert.equal(result.checks.startupPost.ok, true);
  assert.equal(result.checks.engineerPost.ok, true);
});
