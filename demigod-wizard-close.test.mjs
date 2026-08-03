import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');

assert.doesNotMatch(source, /\bofferAbandon\b|dg-abandon|Follow-up request|\bDIRTY\b/);
assert.match(source, /sessionStorage\.setItem\(SAVE_KEY/);
assert.match(source, /sessionStorage\.removeItem\(SAVE_KEY\)/);
assert.match(
  source,
  /if\(c&&c\.closest\(S\+'\,'\+J\)\)\{e\.preventDefault\(\);OPEN=null;hide\(true\);return\}/,
);
assert.match(
  source,
  /if\(e\.key==='Escape'&&OPEN\)\{OPEN=null;hide\(true\)\}/,
);

console.log('wizard close: honest close + same-tab resume guard ok');
