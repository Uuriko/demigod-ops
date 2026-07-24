#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withFileLock } from './demigod-agent-tools-lib.mjs';

const [, , mode, root, id] = process.argv;

if (mode === 'writer') {
  const store = path.join(root, 'DEMIGOD-LEADS.json');
  await withFileLock(`${store}.lock`, async () => {
    const doc = JSON.parse(fs.readFileSync(store, 'utf8'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    doc.updates.push(id);
    fs.writeFileSync(store, `${JSON.stringify(doc)}\n`);
  });
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-funnel-lock-race-'));
try {
  const store = path.join(tmp, 'DEMIGOD-LEADS.json');
  fs.writeFileSync(store, '{"updates":[]}\n');
  const run = (writerId) => new Promise((resolve, reject) => {
    const child = fork(fileURLToPath(import.meta.url), ['writer', tmp, writerId], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`writer ${writerId} exited ${code}`)));
  });
  await Promise.all([run('alpha'), run('beta')]);
  assert.deepEqual(JSON.parse(fs.readFileSync(store, 'utf8')).updates.sort(), ['alpha', 'beta']);
  console.log('PASS funnel CRM lock: two concurrent async writers both survive');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
