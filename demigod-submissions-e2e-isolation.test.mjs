import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn } from 'node:child_process';

const production = ['/home/potter/DEMIGOD-SUBMISSIONS-INBOX.json', '/home/potter/DEMIGOD-BOARD.json'];
const hashes = () => production.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));

test('submissions E2E HTTP and approval path leaves production SoRs unchanged', async (t) => {
  const before = hashes();
  const loopbackAllowed = await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => resolve(error.code !== 'EPERM'));
    server.listen(0, '127.0.0.1', () => server.close(() => resolve(true)));
  });
  if (!loopbackAllowed) {
    assert.deepEqual(hashes(), before);
    t.skip('sandbox forbids loopback listeners; run outside sandbox for HTTP proof');
    return;
  }
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, ['demigod-submissions-e2e.mjs'], { cwd: '/home/potter', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  if (status !== 0 && /\b(?:listen|spawn).*EPERM\b/.test(stderr)) {
    assert.deepEqual(hashes(), before);
    t.skip('sandbox forbids loopback listeners; run outside sandbox for HTTP proof');
    return;
  }
  assert.equal(status, 0, stderr || stdout);
  assert.deepEqual(hashes(), before);
  const result = JSON.parse(stdout);
  assert.match(result.scope, /^submissions-e2e-\d+-\d+$/);
  assert.equal(result.postStartup.status, 200);
  assert.equal(result.postPartner.status, 200);
  assert.equal(result.approvedTitle, 'Founding Engineer');
});
