import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('review edit returns focus to rebuilt visible review controls', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  assert.match(source, /reviewReturn = current; reviewEditStep = idx; showStep\(idx\)/);
  assert.match(source, /showStep\(returnStep\);\s*setTimeout\(function\(\)\{var target=form\.querySelector\('\.dg-wiz-edit\[data-dg-edit-step=/);
  assert.match(source, /\|\|nextBtn;try\{target\.focus\(\)\}/);
});
