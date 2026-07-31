#!/usr/bin/env node
/**
 * demigod-revenue — 10% fee math + invoice stub (no Stripe until live).
 *
 *   node demigod-revenue.mjs preview --base-salary=180000
 *   node demigod-revenue.mjs stub --pair=PAIR --base-salary=180000 --evidence=path
 *   node demigod-revenue.mjs selftest
 *
 * Never marks paid without evidence. Stripe adapter disabled (pending).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const STUBS = path.join(ROOT, 'demigod-ops', 'invoices');
export const CURRENT_FEE_TERMS = Object.freeze({
  version: '2026-07-31',
  rate: 0.1,
  basis: 'first-year base salary',
  exclusions: 'equity, discretionary bonus, commission, and benefits',
  trigger: 'confirmed candidate start',
});

/** Integer cents; fail closed on bad input. */
export function feeCents(firstYearBaseSalary) {
  const n = Number(firstYearBaseSalary);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'firstYearBaseSalary must be positive number' };
  }
  const baseSalaryCents = Math.round(n * 100);
  const amount = Math.round(baseSalaryCents * CURRENT_FEE_TERMS.rate);
  return {
    ok: true,
    firstYearBaseSalary: n,
    baseSalaryCents,
    rate: CURRENT_FEE_TERMS.rate,
    feeCents: amount,
    feeDisplay: (amount / 100).toFixed(2),
    currency: 'USD',
    feeTerms: { ...CURRENT_FEE_TERMS },
    note: '10% of first-year base salary, excluding equity, discretionary bonus, commission, and benefits; due after a confirmed candidate start',
  };
}

export function invoiceStub({ pairId, baseSalary, cash, evidencePath, actor = 'agent' }) {
  if (baseSalary != null && cash != null) {
    return { ok: false, error: 'pass --base-salary or legacy --cash, not both' };
  }
  const calc = feeCents(baseSalary ?? cash);
  if (!calc.ok) return calc;
  if (!pairId) return { ok: false, error: 'pairId required' };
  if (!evidencePath || !fs.existsSync(evidencePath)) {
    return { ok: false, error: 'hire evidence path required and must exist' };
  }
  const st = fs.statSync(evidencePath);
  if (!st.size) return { ok: false, error: 'hire evidence empty' };

  const id = `inv_${pairId}_${Date.now().toString(36)}`;
  const rec = {
    schema: 'demigod.invoice-stub/2',
    id,
    pairId,
    status: 'pending_human_send', // never 'paid' from this module
    stripe: null,
    stripeReady: false,
    ...calc,
    evidencePath,
    actor,
    at: new Date().toISOString(),
    bodyPreview: [
      `Subject: Demigod placement fee — ${pairId}`,
      '',
      `Per our terms: 10% of first-year base salary, excluding ${CURRENT_FEE_TERMS.exclusions} = $${calc.feeDisplay} USD.`,
      'Due only after a confirmed candidate start.',
      'Stripe is pending — reply for wire/ACH details.',
      'This is an invoice draft; it does not prove a start or payment.',
      '',
      '— potter@trydemigod.com',
    ].join('\n'),
  };
  fs.mkdirSync(STUBS, { recursive: true });
  const out = path.join(STUBS, `${id}.json`);
  atomicWrite(out, JSON.stringify(rec, null, 2) + '\n');
  const txt = path.join(STUBS, `${id}.txt`);
  atomicWrite(txt, rec.bodyPreview + '\n');
  return { ok: true, invoice: rec, path: out, draft: txt };
}

function arg(args, name) {
  const hit = args.find((a) => a.startsWith(name + '='));
  if (hit) return hit.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
  return null;
}

function salaryArg(args) {
  const baseSalary = arg(args, '--base-salary');
  const cash = arg(args, '--cash');
  return baseSalary != null && cash != null
    ? { ok: false, error: 'pass --base-salary or legacy --cash, not both' }
    : { ok: true, value: baseSalary ?? cash };
}

function selftest() {
  let f = 0;
  let p = 0;
  const a = (c, m) => {
    if (c) {
      p++;
      console.log('  ok ', m);
    } else {
      f++;
      console.error('  FAIL', m);
    }
  };
  a(feeCents(0).ok === false, 'zero base salary fails');
  a(feeCents(-1).ok === false, 'negative fails');
  a(feeCents('x').ok === false, 'nan fails');
  const r = feeCents(180000);
  a(r.ok && r.feeCents === 1800000, '10% of 180k = 18000.00 → 1800000 cents');
  a(feeCents(100000).feeDisplay === '10000.00', 'display 10000.00');
  a(
    r.firstYearBaseSalary === 180000 &&
      r.baseSalaryCents === 18000000 &&
      r.feeTerms.basis === 'first-year base salary' &&
      r.feeTerms.exclusions === 'equity, discretionary bonus, commission, and benefits' &&
      r.feeTerms.trigger === 'confirmed candidate start',
    'calculation carries the exact current terms snapshot',
  );
  // stub without evidence fails
  const s = invoiceStub({ pairId: 'p1', baseSalary: 100000, evidencePath: '/no/such' });
  a(s.ok === false, 'stub without evidence fails');
  console.log(`\n${p} passed, ${f} failed`);
  process.exit(f ? 1 : 0);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const cmd = process.argv[2];
  const rest = process.argv.slice(3);
  const salary = salaryArg(rest);
  if (!salary.ok) {
    console.error(JSON.stringify(salary));
    process.exit(2);
  }
  if (cmd === 'preview') {
    console.log(JSON.stringify(feeCents(Number(salary.value)), null, 2));
  } else if (cmd === 'stub') {
    console.log(
      JSON.stringify(
        invoiceStub({
          pairId: arg(rest, '--pair'),
          baseSalary: Number(salary.value),
          evidencePath: arg(rest, '--evidence'),
          actor: arg(rest, '--actor') || 'agent',
        }),
        null,
        2,
      ),
    );
  } else if (cmd === 'selftest') selftest();
  else {
    console.error('usage: preview --base-salary=N | stub --pair=ID --base-salary=N --evidence=path | selftest  (legacy: --cash)');
    process.exit(2);
  }
}
