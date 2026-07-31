import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('submission watcher writes every capability-bearing artifact as 0600', () => {
  const source = fs.readFileSync(new URL('./demigod-watch-submits.mjs', import.meta.url), 'utf8');
  for (const target of ['CURSOR', 'ALERT_JSON', 'ALERT_MD']) {
    assert.match(source, new RegExp(`atomicWrite\\(${target},[\\s\\S]{0,120}?\\{ mode: 0o600 \\}\\)`));
  }
});
