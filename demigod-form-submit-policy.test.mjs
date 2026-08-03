import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const production = [
  'DEMIGOD-PAIRS.json',
  'DEMIGOD-SUBMISSIONS-INBOX.json',
  'DEMIGOD-BOARD.json',
  'DEMIGOD-PILOTS.json',
];
const fingerprint = (file) => fs.existsSync(file)
  ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  : null;
const before = production.map(fingerprint);
const policy = (...args) => {
  const run = spawnSync(process.execPath, ['demigod-form-submit-test.mjs', '--policy', ...args], {
    cwd: new URL('.', import.meta.url),
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
};

assert.deepEqual(policy(), { submit: false, externalWrites: false });
assert.deepEqual(policy('--submit'), { submit: true, externalWrites: true });
assert.deepEqual(production.map(fingerprint), before, 'policy check must not mutate production state');

console.log('demigod form submit policy: PASS');
