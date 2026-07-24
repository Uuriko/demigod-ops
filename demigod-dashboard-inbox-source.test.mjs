import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const source = ui.match(/function inboxSource\(attribution\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(source, 'inboxSource helper exists');
const inboxSource = Function(`${source}; return inboxSource`)();

test('Inbox Source cell prefers compact redacted attribution with a clear fallback', () => {
  assert.equal(inboxSource({ utm_source: 'linkedin', utm_medium: 'social' }), 'linkedin/social');
  assert.equal(inboxSource({ utm_source: 'linkedin', utm_campaign: 'founder launch' }), 'founder launch');
  assert.equal(inboxSource({ referral: 'demo-day' }), 'demo-day');
  assert.equal(inboxSource({ role_id: 'role-42' }), 'role-42');
  assert.equal(inboxSource({ event_id: 'event-7' }), 'event-7');
  assert.equal(inboxSource(), '—');
  assert.match(ui, /<th>Source<\/th>/);
  assert.match(ui, /esc\(inboxSource\(r\.attribution\)\)/);
  assert.doesNotMatch(ui, /btnInboxNew/);
});

test('slim polling preserves inbox fields and changes pulse when queues change', () => {
  const slimInbox = dashboard.match(/inbox: data\.inbox[\s\S]*?\n\s*: null,/)?.[0] || '';
  for (const field of ['byKind', 'newestAgeSec', 'error']) assert.match(slimInbox, new RegExp(field));
  assert.match(dashboard, /formAnalytics: data\.formAnalytics \|\| null/);
  assert.match(dashboard, /data\.inbox\?\.rows \|\| \[\]/);
  assert.match(dashboard, /data\.matches\?\.pairs \|\| \[\]/);
  const expression = dashboard.match(/data\.pulseKey = (crypto\.createHash\('sha256'\)\.update\([\s\S]*?\.join\('\|'\)\)\.digest\('hex'\));/)?.[1];
  assert.ok(expression, 'pulse is hashed at the shared producer');
  const pulse = (data) => Function('crypto', 'data', `return ${expression}`)(crypto, data);
  const base = { work: { agents: [], claims: {} }, inbox: { total: 0, rows: [] }, matches: { pairs: [] }, formAnalytics: {} };
  assert.match(pulse(base), /^[0-9a-f]{64}$/);
  assert.equal(pulse(base), pulse(structuredClone(base)));
  assert.notEqual(pulse(base), pulse({ ...base, inbox: { total: 1, rows: [] } }));
});
