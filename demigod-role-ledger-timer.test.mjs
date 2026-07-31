import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const serviceUrl = new URL('./systemd-user/demigod-role-ledger.service', import.meta.url);
const timerUrl = new URL('./systemd-user/demigod-role-ledger.timer', import.meta.url);
const service = fs.readFileSync(serviceUrl, 'utf8');
const timer = fs.readFileSync(timerUrl, 'utf8');

test('daily role observation uses the proven poller and never outreach or publish', () => {
  assert.match(service, /^UMask=0077$/m);
  assert.match(service, /^ExecStart=.*\/node \/home\/potter\/demigod-role-ledger\.mjs poll$/m);
  assert.deepEqual(service.match(/^ExecStartPost=.*$/gm), [
    'ExecStartPost=/home/potter/.nvm/versions/node/v24.17.0/bin/node /home/potter/demigod-recruitai-export.mjs',
    'ExecStartPost=/home/potter/.nvm/versions/node/v24.17.0/bin/node /home/potter/demigod-recruitai-seed-pack.mjs',
  ]);
  assert.match(timer, /^OnCalendar=daily$/m);
  assert.match(timer, /^Persistent=true$/m);
  assert.doesNotMatch(`${service}\n${timer}`, /(?:auto.?send|publish|webflow|directory-aging)/i);
});

test('systemd accepts both units', () => {
  const run = spawnSync('systemd-analyze', ['--user', 'verify', fileURLToPath(serviceUrl), fileURLToPath(timerUrl)], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
