import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('modal focus trap admits only rendered, non-inert controls', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const focusables = source.match(/function focusables\(root\)\{[^\n]+/)?.[0] || '';
  assert.match(focusables, /getClientRects\(\)\.length>0/);
  assert.match(focusables, /closest\('\[inert\],\[aria-hidden="true"\]'\)/);
  assert.match(focusables, /catch\(e\)\{return false\}/);
});

test('modal close restores opener focus only after its background and mobile bar', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const hide = source.match(/function hide\(f\)\{[^\n]+/)?.[0] || '';
  const detach = hide.indexOf('detachTrap(true)');
  assert.ok(detach > hide.indexOf('restoreModalBackground()'));
  assert.ok(detach > hide.indexOf("bar.style.removeProperty('display')"));
});

test('show captures opener before inert isolation and passes it to attachTrap', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  assert.match(source, /function show\(id, opener\)/);
  assert.match(source, /function attachTrap\(m, opener\)/);
  const showStart = source.indexOf('function show(id, opener)');
  const isolate = source.indexOf('isolateModalBackground(m)', showStart);
  const focusBack = source.indexOf('var focusBack=', showStart);
  assert.ok(focusBack > -1 && focusBack < isolate, 'focusBack before isolateModalBackground');
  assert.match(source, /attachTrap\(m, focusBack\)/);
  assert.match(source, /show\(S, el\)/);
  assert.match(source, /show\(J, el\)/);
  assert.match(source, /LAST_FOCUS\.isConnected/);
});
