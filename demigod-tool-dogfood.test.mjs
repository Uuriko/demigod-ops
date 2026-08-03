import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalTool,
  executionFailure,
  executionSucceeded,
  parseDogfoodBool,
  parseLogFlags,
  rowExecutionOk,
  rowKind,
  summarize,
} from './demigod-tool-dogfood.mjs';
import { TOOLS } from './demigod-tools-registry.mjs';

test('dogfood derives registry aliases without collapsing registry IDs', () => {
  for (const tool of TOOLS) assert.equal(canonicalTool(tool.id), tool.id);
  for (const [alias, tool] of [
    ['dg-truth', 'truth'],
    ['demigod-verify-source', 'verify-source'],
    ['bin/dg', 'orient'],
    ['dg-quality', 'quality'],
    ['matches', 'match-review'],
    ['bin/dg-smoke', 'smoke'],
  ]) assert.equal(canonicalTool(alias), tool);
  for (const alias of ['orca-check', 'orca-wait', 'orca-dispatch', 'orca-task', 'api-orca']) {
    assert.equal(canonicalTool(alias), 'orca-status');
  }
  assert.equal(canonicalTool('source-verify'), 'source-verify');
  assert.equal(executionSucceeded(1, 'webflow-doctor'), true);
  assert.equal(executionSucceeded(1, 'ship'), true);
  assert.equal(executionSucceeded(1, 'cm6-check'), false);
});

test('dogfood repairs stored umbrella rows from a registered raw tool', () => {
  const status = summarize([
    {
      at: '2026-01-01T00:00:00Z',
      tool: 'control',
      rawTool: 'bin/dg',
      source: 'wrap',
      ok: true,
    },
    {
      at: '2026-01-01T00:00:01Z',
      tool: 'ship',
      rawTool: 'ship-prepare',
      source: 'wrap',
      ok: true,
    },
  ]);
  assert.equal(status.tools.find((tool) => tool.tool === 'orient').executions, 1);
  assert.equal(status.tools.find((tool) => tool.tool === 'control').executions, 0);
  assert.equal(status.tools.find((tool) => tool.tool === 'ship-prepare').executions, 1);
  assert.equal(status.tools.find((tool) => tool.tool === 'ship').executions, 0);
  assert.deepEqual(status.recentExecutions.map((row) => row.tool), ['ship-prepare', 'orient']);
});

test('dogfood retires only current compatibility labels and cycle IDs', () => {
  const status = summarize([
    { tool: 'workflow-map', ok: true },
    { tool: 'api-coord', ok: false },
    { tool: 'gates-cycle-6573', ok: true },
    { tool: 'unknown-wrapper', ok: true },
  ]);
  assert.equal(status.unregisteredEvents, 1);
  assert.equal(status.retiredEvents, 3);
  assert.deepEqual(status.retired.map((row) => row.tool).sort(), ['api-coord', 'gates-cycle-6573', 'workflow-map']);
});

test('dogfood separates executions, judgments, and synthetic wraps', () => {
  const status = summarize([
    { at: '2026-01-01T00:00:00Z', tool: 'truth', source: 'wrap', argv: ['bin/dg', 'truth'], ok: true, childExit: 0 },
    { at: '2026-01-01T00:00:01Z', tool: 'truth', source: 'manual', ok: false, useful: true },
    { at: '2026-01-01T00:00:02Z', tool: 'truth', source: 'wrap', argv: ['true'], ok: true, childExit: 0 },
  ]);
  const truth = status.tools.find((tool) => tool.tool === 'truth');
  assert.equal(status.rawTotal, 3);
  assert.equal(status.wrapTotal, 2);
  assert.equal(status.executionTotal, 1);
  assert.equal(status.annotationTotal, 1);
  assert.equal(status.syntheticWrapTotal, 1);
  assert.equal(
    status.executionTotal + status.annotationTotal + status.syntheticWrapTotal,
    status.rawTotal,
  );
  assert.equal(truth.executions, 1);
  assert.equal(truth.annotations, 1);
  assert.equal(truth.syntheticWraps, 1);
  assert.equal(truth.ok, 1);
  assert.equal(truth.fail, 0);
  assert.equal(truth.useful, 1);
  assert.deepEqual(status.recentExecutions.map(({ tool, outcome }) => ({ tool, outcome })), [
    { tool: 'truth', outcome: 'ok' },
  ]);
});

test('dogfood does not turn an annotation-only unknown label into a registry warning', () => {
  const status = summarize([
    { at: '2026-01-01T00:00:00Z', tool: 'local-note', source: 'manual', useful: true },
  ]);
  assert.equal(status.unregisteredEvents, 1);
  assert.equal(status.unregisteredExecutions, 0);
  assert.equal(status.unregisteredExecutionTools, 0);
  assert.equal(status.suggestions.some((suggestion) => suggestion.kind === 'registry'), false);
});

test('dogfood warns only when an unknown execution label repeats', () => {
  const once = summarize([{ tool: 'new-wrapper', ok: true }]);
  assert.equal(once.suggestions.some((suggestion) => suggestion.kind === 'registry'), false);
  const repeated = summarize([{ tool: 'new-wrapper', ok: true }, { tool: 'new-wrapper', ok: true }]);
  assert.equal(repeated.suggestions.some((suggestion) => suggestion.kind === 'registry'), true);
});

test('dogfood kind totals include retired rows and reconcile to raw input', () => {
  const status = summarize([
    { tool: 'workflow-map', source: 'wrap', argv: ['node', 'old-tool.mjs'], ok: true },
    { tool: 'api-coord', source: 'manual', useful: true },
  ]);
  assert.equal(status.retiredEvents, 2);
  assert.equal(status.executionTotal, 1);
  assert.equal(status.annotationTotal, 1);
  assert.equal(status.syntheticWrapTotal, 0);
  assert.equal(
    status.executionTotal + status.annotationTotal + status.syntheticWrapTotal,
    status.rawTotal,
  );
});

test('dogfood reports registered tools with no real execution', () => {
  const annotationOnly = summarize([
    { at: '2026-01-01T00:00:00Z', tool: 'truth', source: 'manual', ok: true, useful: true },
  ]);
  assert.equal(annotationOnly.tools.find((tool) => tool.tool === 'truth').executions, 0);
  assert.ok(annotationOnly.unusedTools.includes('truth'));

  const empty = summarize([]);
  assert.ok(empty.tools.some((tool) => tool.tool === 'truth' && tool.executions === 0));
  assert.ok(empty.unusedTools.includes('truth'));
});

test('dogfood recognizes only one-command true wraps as synthetic', () => {
  assert.equal(rowKind({ source: 'wrap', argv: ['true'] }), 'synthetic');
  assert.equal(rowKind({ source: 'wrap', argv: ['/bin/true'] }), 'synthetic');
  assert.equal(rowKind({ source: 'wrap', argv: ['true', 'arg'] }), 'execution');
  assert.equal(rowKind({ source: 'manual' }), 'annotation');
  assert.equal(rowKind({ ok: true }), 'execution');
});

test('dogfood limits reliability advice to registered tools', () => {
  const status = summarize([
    { tool: 'external-wrapper', ok: false },
    { tool: 'external-wrapper', ok: false },
    { tool: 'truth', ok: false },
    { tool: 'truth', ok: false },
  ]);
  assert.equal(
    status.suggestions.some((suggestion) => suggestion.tool === 'external-wrapper' && suggestion.kind === 'reliability'),
    false,
  );
  assert.equal(
    status.suggestions.some((suggestion) => suggestion.tool === 'truth' && suggestion.kind === 'reliability'),
    true,
  );
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
    { tool: 'truth', ok: true },
    { tool: 'truth', ok: false, childExit: 124 },
    { tool: 'truth', ok: false, childExit: 124 },
  ]);
  assert.match(timeoutStatus.suggestions[0].text, /timeout pressure \(2\/3\)/);

  const failureStatus = summarize([
    { tool: 'truth', ok: true },
    { tool: 'truth', ok: false },
    { tool: 'truth', ok: false },
  ]);
  assert.match(failureStatus.suggestions[0].text, /other execution failures \(2\/3\)/);

  const recoveredStatus = summarize([
    { tool: 'verify-source', ok: false, childExit: 1 },
    { tool: 'verify-source', ok: false, childExit: 1 },
    { tool: 'verify-source', ok: true, childExit: 0 },
  ]);
  assert.equal(recoveredStatus.tools.find((tool) => tool.tool === 'verify-source').fail, 2);
  assert.equal(recoveredStatus.suggestions.some((suggestion) => suggestion.tool === 'verify-source'), false);
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
