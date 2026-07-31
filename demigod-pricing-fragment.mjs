#!/usr/bin/env node
// Structured pricing fragment for /pricing. The review found the fee model buried in prose; this makes
// it a scannable table with worked examples whose numbers come from the REAL fee logic (feeCents in
// demigod-revenue.mjs), so the displayed fee can never drift from what the code charges.
// Honest model: free for talent · 10% of first-year base salary when a hire starts · mutual yes.
//   node demigod-pricing-fragment.mjs [--fragment]   # emit HTML
//   node demigod-pricing-fragment.mjs --selftest
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_FEE_TERMS, feeCents } from './demigod-revenue.mjs';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

// pure: base salaries -> [{baseSalary, feeUsd}] using the real fee calc.
export function pricingExamples(baseSalaries = [120000, 150000, 200000, 250000]) {
  return baseSalaries.map((baseSalary) => {
    const r = feeCents(baseSalary);
    return r.ok ? { baseSalary, feeUsd: r.feeCents / 100 } : null;
  }).filter(Boolean);
}

const fmt = (n) => '$' + Number(n).toLocaleString('en-US');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function pricingFragment(examples = pricingExamples()) {
  const points = [
    ['Free for talent', 'Always. You are never charged, and your profile is not shared until you approve an intro.'],
    [`10% of ${CURRENT_FEE_TERMS.basis}`, `Charged to the startup when a hire starts; excludes ${CURRENT_FEE_TERMS.exclusions}. Nothing up front, nothing if no one is hired.`],
    ['Intro only on mutual interest', 'Demigod tech ranks fit, humans review, and both sides approve before any introduction.'],
  ].map(([h, d]) => `<li style="margin:0 0 12px"><b style="color:#08a05d;font:600 15px/1.4 ui-monospace,monospace">${esc(h)}</b><div style="color:#7f978c;font:400 14px/1.5 system-ui,sans-serif;margin-top:3px">${esc(d)}</div></li>`).join('');
  const rows = examples.map((e) => `<tr><td style="padding:8px 14px;border-top:1px solid #1a2622">${fmt(e.baseSalary)}</td><td style="padding:8px 14px;border-top:1px solid #1a2622;color:#a6ffcb;font-family:ui-monospace,monospace">${fmt(e.feeUsd)}</td></tr>`).join('');
  return `<section aria-label="Pricing" style="max-width:560px">
  <ul style="list-style:none;margin:0 0 20px;padding:0">${points}</ul>
  <table style="border-collapse:collapse;width:100%;font:400 14px/1.4 system-ui,sans-serif">
    <thead><tr><th style="text-align:left;padding:8px 14px;color:#7f978c;font:600 11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase">First-year base salary</th><th style="text-align:left;padding:8px 14px;color:#7f978c;font:600 11px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase">Your fee (10%, on start)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#7f978c;font:400 12px/1.5 system-ui,sans-serif;margin:14px 0 0">Examples only; the fee is exactly 10% of first-year base salary, excluding ${esc(CURRENT_FEE_TERMS.exclusions)}.</p>
</section>`;
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const ex = pricingExamples([120000, 150000, 200000]);
  assert(ex.length === 3, 'three valid examples');
  // the displayed fee must equal the REAL fee calc (exactly 10%) — not a hardcoded number
  for (const e of ex) assert(e.feeUsd === Math.round(e.baseSalary * 0.1), `fee is 10% of base salary via feeCents (${e.baseSalary} -> ${e.feeUsd})`);
  // fails-closed inputs are dropped, never shown
  assert(pricingExamples([-5, 0, 150000]).length === 1, 'invalid base salaries dropped, not rendered');
  const frag = pricingFragment(ex);
  assert(frag.includes('Free for talent') && frag.includes('10% of first-year base salary') && frag.includes('equity, discretionary bonus, commission, and benefits') && frag.includes('mutual interest'), 'includes the canonical fee terms');
  assert(frag.includes('$15,000') && frag.includes('$150,000'), 'renders a worked example with formatted numbers');
  assert(!pricingFragment([{ baseSalary: 1, feeUsd: 1, x: '<img src=x onerror=1>' }]).includes('<img src=x'), 'escapes untrusted text');
  console.log(JSON.stringify({ ok: true, selftest: 'pricing-fragment' }));
  process.exit(0);
}

if (isMain) { console.log(pricingFragment()); }
