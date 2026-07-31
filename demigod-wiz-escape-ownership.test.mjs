import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('document Escape handler respects a wizard-consumed event', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  assert.match(source, /addEventListener\('keydown',function\(e\)\{if\(e\.defaultPrevented\)return;if\(e\.key==='Escape'/);
  assert.ok(source.includes("if (current > 0) { e.preventDefault(); backBtn.click(); }"));
});
