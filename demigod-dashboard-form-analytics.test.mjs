import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('dashboard distinguishes a missing analytics receipt from zero traffic', () => {
  const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
  assert.match(server, /available: Boolean\(doc\), forms: summarizeFormAnalytics\(doc \|\| \{\}\)/);
  assert.match(ui, /analytics\.available\?/);
  assert.match(ui, /blocked at/);
  assert.match(ui, /f\.validationSteps/);
  assert.match(ui, /analytics\.available\?'<div class="card wide"><h2>Form funnel/);
  assert.match(ui, /<div class="meta">No form events yet\.<\/div>/);
});
