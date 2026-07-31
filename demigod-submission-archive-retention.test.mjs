import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { retainSubmissionArchive } from './demigod-submissions-lib.mjs';

test('raw submission archive expires old PII but preserves recoverable rows', () => {
  const now = Date.parse('2026-07-21T00:00:00.000Z');
  const old = JSON.stringify({ at: '2025-01-01T00:00:00.000Z', raw: { email: 'old@example.com' } });
  const fresh = JSON.stringify({ at: '2026-07-01T00:00:00.000Z', raw: { email: 'fresh@example.com' } });
  const future = JSON.stringify({ at: '2026-07-22T00:00:00.000Z', raw: { email: 'future@example.com' } });
  const farFuture = JSON.stringify({ at: '2099-01-01T00:00:00.000Z', raw: { email: 'far@example.com' } });
  const malformed = '{recovery-needed';

  const retained = retainSubmissionArchive([old, fresh, future, farFuture, malformed].join('\n'), now);
  assert.equal(retained[0], fresh);
  for (const [line, raw] of [[retained[1], future], [retained[2], farFuture], [retained[3], malformed]]) {
    const anchored = JSON.parse(line);
    assert.equal(anchored.archiveRetentionAnchor, '2026-07-21T00:00:00.000Z');
    assert.equal(anchored.archivedRaw, raw);
  }
  assert.deepEqual(
    retainSubmissionArchive(retained.join('\n'), now + 366 * 86400000),
    [],
    'trusted anchors and normal rows expire on later compaction',
  );

  const source = fs.readFileSync(new URL('./demigod-submissions-lib.mjs', import.meta.url), 'utf8');
  assert.match(source, /atomicWrite\(archive, lines\.join\('\\n'\) \+ '\\n', \{ mode: 0o600 \}\)/);
});
