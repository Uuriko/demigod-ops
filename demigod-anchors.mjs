#!/usr/bin/env node
/**
 * dg-anchors — verify search/replace anchors exist uniquely before apply.
 *
 * Usage:
 *   node demigod-anchors.mjs plan.json
 *   node demigod-anchors.mjs --file demigod-foot-core.js --old "exact string"
 *   node demigod-anchors.mjs --file X --old "…" --expect 1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { flag, opt, parseFirstJson, readJson } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function countOccurrences(hay, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while (true) {
    const j = hay.indexOf(needle, i);
    if (j < 0) break;
    n++;
    i = j + Math.max(1, needle.length);
  }
  return n;
}

function checkOne(fileRel, old, expect = 1) {
  const full = path.isAbsolute(fileRel) ? fileRel : path.join(ROOT, fileRel);
  const exists = fs.existsSync(full);
  if (!exists) {
    return { ok: false, file: fileRel, error: 'missing_file', count: 0, expect };
  }
  const text = fs.readFileSync(full, 'utf8');
  const count = countOccurrences(text, old);
  return {
    ok: count === expect,
    file: fileRel,
    count,
    expect,
    error: count === 0 ? 'anchor_missing' : count !== expect ? 'anchor_not_unique' : null,
    preview: old.slice(0, 80).replace(/\n/g, '\\n'),
  };
}

function loadPlan(p) {
  const full = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  const j = readJson(full);
  if (!j) {
    // try as JSON text path under outbox
    const alt = path.join('/tmp/dg-busy/outbox', path.basename(p));
    return readJson(alt);
  }
  return j;
}

const results = [];
let pass = true;

if (flag(args, '--file') || opt(args, '--file')) {
  const file = opt(args, '--file');
  const old = opt(args, '--old');
  const expect = Number(opt(args, '--expect', '1')) || 1;
  if (!file || old == null) {
    console.error('usage: --file PATH --old "string" [--expect 1]');
    process.exit(2);
  }
  const r = checkOne(file, old, expect);
  results.push(r);
  if (!r.ok) pass = false;
} else {
  const planPath = args.find((a) => !a.startsWith('--'));
  if (!planPath) {
    console.error('usage: demigod-anchors.mjs plan.json | --file X --old "…"');
    process.exit(2);
  }
  const plan = loadPlan(planPath);
  if (!plan) {
    console.error(JSON.stringify({ ok: false, error: 'plan_not_found', path: planPath }));
    process.exit(1);
  }
  const reps = plan.replacements || plan.replaces || [];
  if (!reps.length) {
    console.error(JSON.stringify({ ok: false, error: 'no_replacements', path: planPath }));
    process.exit(1);
  }
  for (const rep of reps) {
    const r = checkOne(rep.file, rep.old ?? rep.from, Number(rep.count ?? rep.expect ?? 1) || 1);
    results.push(r);
    if (!r.ok) pass = false;
  }
}

const report = {
  at: new Date().toISOString(),
  pass,
  checks: results,
  summary: pass ? 'PASS — all anchors unique' : 'FAIL — fix anchors before apply',
};

console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
