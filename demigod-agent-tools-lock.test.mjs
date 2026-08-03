import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { withFileLock } from './demigod-agent-tools-lib.mjs';

test('withFileLock holds async callbacks through settlement', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-tools-lock-'));
  const lock = path.join(dir, 'store.lock');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  let finish;
  const pending = withFileLock(lock, () => new Promise((resolve) => { finish = resolve; }));
  assert.equal(fs.existsSync(lock), true);
  finish('done');
  assert.equal(await pending, 'done');
  assert.equal(fs.existsSync(lock), false);
});

test('withFileLock preserves synchronous return values', () => {
  const lock = path.join(os.tmpdir(), `dg-tools-lock-${process.pid}-${Date.now()}`);
  assert.equal(withFileLock(lock, () => 42), 42);
  assert.equal(fs.existsSync(lock), false);
});
