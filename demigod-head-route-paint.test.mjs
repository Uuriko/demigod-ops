import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const head = fs.readFileSync(new URL('./demigod-head-minimal.html', import.meta.url), 'utf8');

test('JS-rendered routes paint a static shell before foot-core is ready', () => {
  assert.match(head, /location\.pathname!==['"]\/['"].*document\.documentElement\.classList\.add\(['"]dg-route-boot['"]\)/);
  assert.match(head, /html\.dg-route-boot::before\{content:['"]Demigod['"]/);
  assert.match(head, /html\.dg-route-boot:has\(body\.dg-ready\)::before[^}]*display:none/);
});
