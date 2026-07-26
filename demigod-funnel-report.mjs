#!/usr/bin/env node
// Read the privacy-safe WIZ funnel analytics and print a readable drop-off report.
// The whole ingest→store→summary pipeline already exists (events-bot /api/events-bot/analytics/forms
// → recordFormEvent → form-analytics.json → summarizeFormAnalytics). This just surfaces it for humans.
//
//   node demigod-funnel-report.mjs [--json] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeFormAnalytics } from './demigod-form-analytics.mjs';

const STORE = process.env.DEMIGOD_FORM_ANALYTICS_STORE || '/tmp/dg-busy/form-analytics.json';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
// WIZ step order per form (matches foot-core dgFormAnalytics stepMap).
const ORDER = {
  startup: ['start', 'company', 'stage', 'role', 'skills', 'outcome', 'constraints', 'contact', 'review', 'complete'],
  talent: ['start', 'name', 'work', 'constraints', 'contact', 'resume', 'review', 'complete'],
};

export function renderFunnel(forms) {
  const lines = [];
  for (const [name, f] of Object.entries(forms)) {
    lines.push(`\n${name.toUpperCase()} — ${f.starts} started · ${f.completions} completed · ${f.completionRate == null ? 'n/a' : f.completionRate + '%'} completion`);
    const order = ORDER[name] || Object.keys(f.steps || {});
    const top = Math.max(f.starts, ...order.map((s) => (f.steps || {})[s] || 0), 1);
    for (const step of order) {
      const views = step === 'start' ? f.starts : step === 'complete' ? f.completions : (f.steps || {})[step] || 0;
      const bar = '█'.repeat(Math.round((28 * views) / top)).padEnd(28, '·');
      const val = (f.validationSteps || {})[step];
      lines.push(`  ${step.padEnd(11)} ${bar} ${String(views).padStart(4)}${val ? `   (${val} validation errors)` : ''}`);
    }
  }
  return lines.join('\n');
}

if (process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const doc = { schema: 'demigod.form-analytics/1', cells: [
    { bucket: new Date().toISOString(), form: 'startup', step: 'start', event: 'start', device: 'desktop', count: 10 },
    { bucket: new Date().toISOString(), form: 'startup', step: 'role', event: 'view', device: 'desktop', count: 6 },
    { bucket: new Date().toISOString(), form: 'startup', step: 'complete', event: 'completion', device: 'desktop', count: 3 },
  ] };
  const forms = summarizeFormAnalytics(doc);
  assert(forms.startup.starts === 10 && forms.startup.completions === 3 && forms.startup.completionRate === 30, 'summary math');
  const out = renderFunnel(forms);
  assert(out.includes('STARTUP') && out.includes('30%') && out.includes('role'), 'render includes funnel');
  assert(renderFunnel(summarizeFormAnalytics({ cells: [] })).includes('n/a'), 'empty store → n/a completion, no crash');
  console.log(JSON.stringify({ ok: true, selftest: 'funnel-report' }));
  process.exit(0);
}

if (isMain) {
  const doc = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf8')) : { cells: [] };
  const forms = summarizeFormAnalytics(doc);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(forms, null, 2)); process.exit(0); }
  const total = Object.values(forms).reduce((s, f) => s + f.starts, 0);
  console.log(`SF Demigod WIZ funnel — ${total} total starts (rolling 30d, anonymized)${total === 0 ? '  [no data yet — endpoint may be unset or no traffic]' : ''}`);
  console.log(renderFunnel(forms));
}
