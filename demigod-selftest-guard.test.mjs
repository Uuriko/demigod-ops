#!/usr/bin/env node
// A `--selftest` block that is not gated on isMain is a false green available to every future
// importer. These blocks end in process.exit(0), so when a module imports one and is itself run
// with --selftest, the IMPORTED selftest runs, exits 0, and the importer reports success having
// asserted nothing.
//
// This is not hypothetical. demigod-seo-audit.mjs shipped that way and hijacked demigod-site-health
// the moment site-health imported staticBodyTextLength from it (2026-07-31). Six more modules had
// the same shape with no importers yet — latent, and one import away from silent.
//
// The check is nesting-aware on purpose. A first pass that only looked at the selftest line itself
// reported demigod-startup-map-data.mjs as unguarded; its block is nested inside an outer
// `if (isMain)` and was fine. A detector that cries wolf gets muted, so it must model the guard the
// way the language does.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GUARD = /isMain|import\.meta\.main|argv\[1\]/;

/** PURE: line numbers (1-based) of --selftest blocks in `src` reachable when merely imported. */
export function unguardedSelftestLines(src) {
  const lines = String(src || '').split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (!/process\.argv\.includes\(['"]--selftest['"]\)/.test(ln)) return;
    if (GUARD.test(ln)) return;
    const indent = ln.match(/^\s*/)[0].length;
    // Walk back to the nearest enclosing `if (` at a smaller indent; the guard may live there.
    for (let j = i - 1; j >= 0 && j > i - 400; j--) {
      const prev = lines[j];
      if (!prev.trim()) continue;
      const prevIndent = prev.match(/^\s*/)[0].length;
      if (prevIndent < indent && /^\s*(if\s*\(|\}\s*else\s*if\s*\()/.test(prev)) {
        if (GUARD.test(prev)) return;
        break;
      }
    }
    hits.push(i + 1);
  });
  return hits;
}

test('no module runs its selftest merely because it was imported', () => {
  const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'));
  assert.ok(files.length > 50, `expected the module set, got ${files.length} — a vacuous pass otherwise`);
  const offenders = [];
  for (const f of files) {
    for (const line of unguardedSelftestLines(fs.readFileSync(path.join(ROOT, f), 'utf8'))) {
      offenders.push(`${f}:${line}`);
    }
  }
  assert.deepEqual(offenders, [], 'gate these on isMain, or an importer inherits a silent exit(0)');
});

test('the detector models the guard, not the spelling', () => {
  const bare = "if (process.argv.includes('--selftest')) {\n  run();\n}";
  assert.deepEqual(unguardedSelftestLines(bare), [1], 'an ungated top-level block is caught');

  assert.deepEqual(
    unguardedSelftestLines("if (isMain && process.argv.includes('--selftest')) {\n}"),
    [], 'guarded on the same line is fine',
  );
  // The real shape that produced a false positive first time round.
  assert.deepEqual(
    unguardedSelftestLines("if (isMain) {\n  if (process.argv.includes('--selftest')) {\n  }\n}"),
    [], 'nested inside an isMain block is fine',
  );
  // ...but nesting inside some OTHER conditional is not a guard.
  assert.deepEqual(
    unguardedSelftestLines("if (verbose) {\n  if (process.argv.includes('--selftest')) {\n  }\n}"),
    [2], 'nesting alone is not a guard',
  );
  assert.deepEqual(
    unguardedSelftestLines('const isMain = 1;\nexport function f() {}'),
    [], 'no selftest block -> nothing',
  );
  assert.deepEqual(unguardedSelftestLines(''), [], 'empty source -> nothing');
});
