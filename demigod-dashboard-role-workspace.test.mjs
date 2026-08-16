#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');

assert.match(ui, /<label for="shRoleSelect"/);
assert.match(ui, /<select id="shRoleSelect"/);
assert.match(ui, /id="shWorkspace"[^>]*aria-live="polite"/);
assert.match(ui, /function loadRoleWorkspace\(role\)/);
assert.match(ui, /fetch\('\/api\/structured-hiring\?role='/);
assert.match(ui, /w\.schema!==['"]demigod\.role-workspace\/1['"]/);
assert.match(ui, /Candidate channels/);
assert.match(ui, /Evidence questions/);
assert.match(ui, /external action/);
assert.doesNotMatch(ui.match(/async function loadRoleWorkspace\(role\)\{([\s\S]*?)\n\}\n\nasync function loadStructuredHiring/)?.[1] || '', /method\s*:\s*['"]POST['"]/);

console.log(JSON.stringify({ ok: true, selftest: 'dashboard-role-workspace' }));
