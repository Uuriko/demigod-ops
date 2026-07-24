import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalTool,
  executionFailure,
  executionSucceeded,
  parseDogfoodBool,
  parseLogFlags,
  rowExecutionOk,
  summarize,
} from './demigod-tool-dogfood.mjs';

test('dogfood merges only uniquely registered tool aliases', () => {
  assert.equal(canonicalTool('dg-truth'), 'truth');
  assert.equal(canonicalTool('dg-funnel-status'), 'funnel-status');
  assert.equal(canonicalTool('dg-funnel'), 'funnel-status');
  assert.equal(canonicalTool('demigod-verify-source'), 'verify-source');
  assert.equal(canonicalTool('source-verify'), 'verify-source');
  assert.equal(canonicalTool('verify-board'), 'board-honesty');
  assert.equal(canonicalTool('verify-loop-state'), 'loop-state');
  assert.equal(canonicalTool('verify-loop'), 'loop-state');
  assert.equal(canonicalTool('ask-claude'), 'ask-claude');
  assert.equal(canonicalTool('lead-pipeline-packages'), 'pipeline-packages');
  assert.equal(canonicalTool('events-selftest'), 'events-bot-selftest');
  assert.equal(canonicalTool('coord'), 'agent-coord-status');
  assert.equal(canonicalTool('dash-coord'), 'api-coord');
  assert.equal(canonicalTool('dashboard-coord'), 'api-coord');
  assert.equal(canonicalTool('dg-dash-status'), 'dash');
  assert.equal(canonicalTool('dg-dash-health'), 'dg-dash-health');
  assert.equal(canonicalTool('dg-quality'), 'quality');
  assert.equal(canonicalTool('demigod-user-test'), 'usertest');
  assert.equal(canonicalTool('user-test'), 'usertest');
  assert.equal(canonicalTool('dg-user-test'), 'usertest');
  assert.equal(canonicalTool('dg-usertest'), 'usertest');
  assert.equal(canonicalTool('dashboard-status'), 'dash');
  assert.equal(canonicalTool('demigod:funnel:selftest'), 'funnel-selftest');
  assert.equal(canonicalTool('events-online-selftest'), 'events-online');
  assert.equal(canonicalTool('events-online-status'), 'events-online');
  assert.equal(canonicalTool('events-api-policy'), 'events-app-policy');
  assert.equal(canonicalTool('events-review'), 'events-app-policy');
  assert.equal(canonicalTool('events-management'), 'events-app-policy');
  assert.equal(canonicalTool('store-reconcile-premature-rsvp'), 'events-reconcile');
  assert.equal(canonicalTool('demigod-tools-os-selftest'), 'tools-os-selftest');
  assert.equal(canonicalTool('events-fast-test'), 'events-test');
  assert.equal(canonicalTool('node-check'), 'verify-source');
  assert.equal(canonicalTool('quality-Q7'), 'tools-os-selftest');
  assert.equal(canonicalTool('truth-prepareOnlyAssets'), 'truth');
  assert.equal(canonicalTool('events-audience-gates'), 'events-test');
  assert.equal(canonicalTool('startup-map-refresh'), 'startup-map-refresh');
  assert.equal(canonicalTool('mobile-a11y'), 'wiz-a11y-audit');
  assert.equal(canonicalTool('priority-board'), 'priority');
  assert.equal(canonicalTool('dg-priority'), 'priority');
  assert.equal(canonicalTool('dogfood-status'), 'dogfood');
  assert.equal(canonicalTool('grok-busy-loop'), 'grok-busy-loop');
  assert.equal(canonicalTool('dashboard-cli'), 'tools-os-selftest');
  assert.equal(canonicalTool('lead-sourcer-test'), 'lead-sourcer');
  assert.equal(canonicalTool('dg-orca'), 'orca-status');
  assert.equal(canonicalTool('dashboard-events-test'), 'events-dashboard-test');
  assert.equal(canonicalTool('events-honesty-test'), 'events-app-policy');
  assert.equal(canonicalTool('demand-status'), 'demand');
  assert.equal(canonicalTool('matches'), 'match-review');
  assert.equal(canonicalTool('demigod-startup-atlas'), 'tools-os-selftest');
  assert.equal(canonicalTool('dashboard-events-contract'), 'events-dashboard-test');
  assert.equal(canonicalTool('pipeline'), 'pipeline-status');
  assert.equal(canonicalTool('dg-work-find'), 'work-find');
  assert.equal(canonicalTool('tools-regression'), 'funnel-selftest');
  assert.equal(canonicalTool('forms-p0-tests'), 'usertest');
  assert.equal(canonicalTool('forms-p0-browser'), 'wiz-playtest');
  assert.equal(canonicalTool('matching-readiness'), 'match-review');
  assert.equal(canonicalTool('wiz-cdp-talent'), 'wiz-playtest');
  assert.equal(canonicalTool('wiz-cdp-startup'), 'wiz-playtest');
  assert.equal(canonicalTool('dashboard-health'), 'dash');
  assert.equal(canonicalTool('community-forms-integration'), 'usertest');
  assert.equal(canonicalTool('wiz-mobile-startup'), 'wiz-playtest');
  assert.equal(executionSucceeded(1, 'webflow-doctor'), true);
  assert.equal(executionSucceeded(1, 'webflow'), true);
  assert.equal(executionSucceeded(1, 'dg-publish'), true);
  assert.equal(executionSucceeded(1, 'publish-dry-run'), true); // alias → dg-publish
  assert.equal(executionSucceeded(1, 'cm6-check'), false); // structural gate fail stays fail
});

test('dogfood retires generic wrap labels that are not registry tools', () => {
  const status = summarize([
    { tool: 'node-test', ok: true },
    { tool: 'tools-defect-scan', ok: false },
    { tool: 'totally-fake-tool-xyz', ok: true },
    { tool: 'dashboard-cli', ok: true },
  ]);
  assert.equal(status.unregisteredEvents, 0);
  assert.equal(status.retiredEvents, 3);
  assert.equal(status.registeredEvents, 1);
  assert.equal(status.tools[0].tool, 'tools-os-selftest');
});

test('dogfood reports registry coverage without discarding unknown tools', () => {
  const status = summarize([
    { tool: 'dg-truth', ok: true },
    { tool: 'grok-busy-loop', ok: true },
  ]);
  assert.equal(status.registeredEvents, 1);
  assert.equal(status.unregisteredEvents, 0);
  assert.equal(status.retiredEvents, 1);
  assert.equal(status.retired[0].tool, 'grok-busy-loop');
});

test('dogfood excludes non-CLI capabilities from registry coverage', () => {
  const status = summarize([{ tool: 'computer-use', ok: true }, { tool: 'agent-comms', ok: true }]);
  assert.equal(status.unregisteredEvents, 0);
  assert.equal(status.retiredEvents, 2);
});

test('dogfood maps user-test wrap labels onto usertest and retires yolo entry labels', () => {
  const status = summarize([
    { tool: 'user-test', ok: true },
    { tool: 'dg-user-test', ok: true },
    { tool: 'dashboard-status', ok: true },
    { tool: 'claude-yolo-loop', ok: true },
    { tool: 'claude-entry', ok: false },
  ]);
  assert.equal(status.unregisteredEvents, 0);
  assert.equal(status.registeredEvents, 3);
  assert.equal(status.retiredEvents, 2);
  assert.ok(status.tools.some((t) => t.tool === 'usertest' && t.n === 2));
  assert.ok(status.tools.some((t) => t.tool === 'dash' && t.n === 1));
});

test('dogfood retires run IDs rather than treating them as tools', () => {
  const status = summarize([
    { tool: 'dg-dash-health', ok: false },
    { tool: 'gates-cycle-6573', ok: true },
    { tool: 'events-online-6567', ok: true },
    { tool: 'audit-100', ok: true },
  ]);
  assert.equal(status.total, 1);
  assert.equal(status.retiredEvents, 3);
  assert.equal(status.tools[0].tool, 'audit-100');
  assert.equal(status.suggestions.some((suggestion) => suggestion.kind === 'registry'), false);
});

test('dogfood retires one-shot composite labels', () => {
  const status = summarize([{ tool: 'release-check', ok: false }, { tool: 'foot-privacy-check', ok: true }]);
  assert.equal(status.unregisteredEvents, 0);
  assert.equal(status.retiredEvents, 2);
});

test('dogfood separates red policy outcomes from execution failures', () => {
  const status = summarize([
    { tool: 'truth', ok: false, executionOk: true },
    { tool: 'truth', ok: false, executionOk: false, childExit: 124, failureKind: 'timeout' },
    { tool: 'truth', ok: false },
  ]);
  assert.equal(status.tools[0].red, 1);
  assert.equal(status.tools[0].fail, 2);
  assert.equal(status.tools[0].timeout, 1);
  assert.equal(status.timeouts, 1);
  assert.equal(status.suggestions.some((suggestion) => suggestion.kind === 'timeout'), false);
  assert.equal(status.suggestions.some((suggestion) => suggestion.kind === 'reliability'), false);
  assert.equal(executionSucceeded(1, 'truth'), true);
  assert.equal(executionSucceeded(1, 'bin/dg truth'), true); // alias → truth
  assert.equal(executionSucceeded(1, 'tools-os-selftest'), false);
  assert.equal(executionSucceeded(1, 'funnel-selftest'), false);
  assert.equal(executionSucceeded(1), false);
  assert.equal(executionSucceeded(2), false);
  assert.equal(executionSucceeded(2, 'cockpit'), true);
  assert.equal(executionSucceeded(2, 'events-online'), true);
  assert.equal(executionSucceeded(2, 'ship'), true);
  assert.equal(executionSucceeded(2, 'funnel-selftest'), false);
  assert.equal(executionSucceeded(null), false);
  // childExit is ground truth — even when stale executionOk:false predated EXIT2_OK.
  assert.equal(rowExecutionOk({ ok: false, childExit: 2, tool: 'events-online' }), true);
  assert.equal(rowExecutionOk({ ok: false, childExit: 1, tool: 'truth' }), true);
  assert.equal(rowExecutionOk({ ok: false, childExit: 1, tool: 'funnel-selftest' }), false);
  assert.equal(rowExecutionOk({ ok: false, executionOk: false, childExit: 2, tool: 'events-online' }), true);
  assert.equal(rowExecutionOk({ ok: false, executionOk: false, childExit: 1, tool: 'funnel-selftest' }), false);
  const legacy = summarize([
    { tool: 'events-online', ok: false, childExit: 2, why: 'legacy-wrap-no-executionOk' },
    { tool: 'events-online', ok: false, executionOk: true, childExit: 2 },
    { tool: 'events-online', ok: false, executionOk: false, childExit: 2, why: 'stale-pre-EXIT2' },
    { tool: 'events-online', ok: false, childExit: null, failureKind: 'child-start' },
  ]);
  const eo = legacy.tools.find((t) => t.tool === 'events-online');
  assert.equal(eo.red, 3);
  assert.equal(eo.fail, 1);
});

test('dogfood distinguishes timeout pressure from other execution failures', () => {
  const timeoutStatus = summarize([
    { tool: 'truth', ok: false, childExit: 124 },
    { tool: 'truth', ok: false, childExit: 124 },
    { tool: 'truth', ok: true },
  ]);
  assert.match(timeoutStatus.suggestions[0].text, /timeout pressure \(2\/3\)/);

  const failureStatus = summarize([
    { tool: 'truth', ok: false },
    { tool: 'truth', ok: false },
    { tool: 'truth', ok: true },
  ]);
  assert.match(failureStatus.suggestions[0].text, /other execution failures \(2\/3\)/);
});

test('dogfood explains hard execution failures', () => {
  assert.deepEqual(executionFailure({ status: 124 }), { failureKind: 'timeout' });
  assert.deepEqual(executionFailure({ status: null, error: new Error('spawn missing') }), {
    failureKind: 'child-start',
    stderr: 'spawn missing',
  });
  assert.deepEqual(executionFailure({ status: 2, stderr: 'bad input\n' }), {
    failureKind: 'exit',
    stderr: 'bad input\n',
  });
  assert.equal(executionFailure({ status: 2, stderr: 'x'.repeat(2001) }).stderr, 'x'.repeat(2000));
});

test('dogfood manual log --ok/--useful is fail-closed', () => {
  assert.equal(parseDogfoodBool('1', 'ok').value, true);
  assert.equal(parseDogfoodBool('0', 'ok').value, false);
  assert.equal(parseDogfoodBool('true', 'ok').value, true);
  assert.equal(parseDogfoodBool('FALSE', 'ok').value, false);
  assert.match(parseDogfoodBool(null, 'ok').error, /missing --ok/);
  assert.match(parseDogfoodBool('no', 'ok').error, /invalid --ok=no/);
  // case-insensitive true/false only
  assert.equal(parseDogfoodBool('False', 'ok').value, false);

  const good = parseLogFlags(['--tool=truth', '--ok=1', '--useful=0', '--why=hi']);
  assert.equal(good.ok, true);
  assert.equal(good.useful, false);
  assert.equal(good.tool, 'truth');

  assert.match(parseLogFlags(['--tool=truth']).error, /missing --ok/);
  assert.match(parseLogFlags(['--tool=truth', '--ok=no']).error, /invalid --ok=no/);
  assert.match(parseLogFlags(['--tool=truth', '--ok=1', '--useful=maybe']).error, /invalid --useful=maybe/);
  // useful optional when omitted
  assert.equal(parseLogFlags(['--tool=truth', '--ok=0']).useful, null);
});
