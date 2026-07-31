import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sensitiveRetention } from './demigod-laptop-hygiene.mjs';

test('sensitive retention reports age and mode without identities', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-retention-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const old = path.join(dir, 'private-record.json');
  const fresh = path.join(dir, 'resume.pdf');
  fs.writeFileSync(old, '{}', { mode: 0o600 });
  fs.writeFileSync(fresh, '', { mode: 0o644 });
  const now = Date.now();
  fs.utimesSync(old, new Date(now - 8 * 86400000), new Date(now - 8 * 86400000));
  const result = sensitiveRetention([dir], now, 7);
  assert.deepEqual(result, { fileCount: 2, agedCount: 1, oldestAgeDays: 8, retentionDays: 7, unsafeModeCount: 1 });
  assert.equal(JSON.stringify(result).includes('private-record'), false);
  assert.equal(sensitiveRetention([old], now, 7).agedCount, 1);
});
