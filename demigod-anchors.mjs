#!/usr/bin/env node
/**
 * dg-anchors — verify search/replace anchors exist uniquely before apply.
 * A named plan is read from the data root. The report stays there.
 * This command does not apply the plan, publish, or send mail.
 *
 * Usage:
 *   node demigod-anchors.mjs plan.json
 *   node demigod-anchors.mjs --file demigod-foot-core.js --old "exact string"
 *   node demigod-anchors.mjs --file X --old "…" --expect 1
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, flag, opt, readJson } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-ANCHORS.json');
}

function fail(error, extra = {}) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
    ...extra,
  }));
  process.exit(1);
}

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
  const full = path.isAbsolute(fileRel) ? fileRel : path.join(dataRoot(), fileRel);
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
  const full = path.isAbsolute(p) ? p : path.join(dataRoot(), p);
  return readJson(full);
}

function readRuns() {
  try {
    const saved = JSON.parse(fs.readFileSync(reportPath(), 'utf8'));
    return Array.isArray(saved.runs) ? saved.runs : [];
  } catch {
    return [];
  }
}

function saveRun(entry) {
  const runs = [...readRuns(), entry];
  atomicWrite(reportPath(), JSON.stringify({
    ok: true,
    sent: false,
    liveMail: false,
    livePublish: false,
    runs,
  }, null, 2) + '\n');
  return runs.length;
}

const args = process.argv.slice(2);
if (args.includes('--publish')) fail('publish_refused');

const results = [];
let pass = true;
let planPath = null;

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
  planPath = args.find((a) => !a.startsWith('--'));
  if (!planPath) {
    console.error('usage: demigod-anchors.mjs plan.json | --file X --old "…"');
    process.exit(2);
  }
  const plan = loadPlan(planPath);
  if (!plan) fail('plan_not_found', { path: planPath });
  const reps = plan.replacements || plan.replaces || [];
  if (!reps.length) fail('no_replacements', { path: planPath });
  for (const rep of reps) {
    const r = checkOne(rep.file, rep.old ?? rep.from, Number(rep.count ?? rep.expect ?? 1) || 1);
    results.push(r);
    if (!r.ok) pass = false;
  }
  const count = saveRun({
    at: new Date().toISOString(),
    plan: planPath,
    pass,
    checks: results,
    sent: false,
    liveMail: false,
    livePublish: false,
  });
  console.log(JSON.stringify({
    ok: pass,
    pass,
    plan: planPath,
    count,
    path: reportPath(),
    checks: results,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(pass ? 0 : 1);
}

console.log(JSON.stringify({
  ok: pass,
  pass,
  at: new Date().toISOString(),
  checks: results,
  summary: pass ? 'PASS — all anchors unique' : 'FAIL — fix anchors before apply',
  sent: false,
  liveMail: false,
  livePublish: false,
}));
process.exit(pass ? 0 : 1);
