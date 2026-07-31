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

const run = spawnSync(process.execPath, ['demigod-sprint-selftest.mjs'], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
  timeout: 60_000,
});

assert.equal(run.status, 0, run.stderr || run.stdout);
assert.deepEqual(production.map(fingerprint), before, 'selftest must not mutate production state');

console.log('demigod sprint selftest isolation: PASS');
