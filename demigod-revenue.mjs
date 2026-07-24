#!/usr/bin/env node
/**
 * demigod-revenue — 10% fee math + invoice stub (no Stripe until live).
 *
 *   node demigod-revenue.mjs preview --cash=180000 [--currency=USD]
 *   node demigod-revenue.mjs stub --pair=PAIR --cash=180000 --evidence=path
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
const FEE_RATE = 0.1; // product truth: 10% first-year cash only

/** Integer cents; fail closed on bad input. */
export function feeCents(firstYearCash, rate = FEE_RATE) {
  const n = Number(firstYearCash);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'firstYearCash must be positive number' };
  }
  if (rate !== 0.1) {
    // product locks 10% for now; explicit override must be conscious
    if (process.env.DEMIGOD_FEE_RATE_UNLOCK !== '1') {
      return { ok: false, error: 'fee rate locked at 0.10 (set DEMIGOD_FEE_RATE_UNLOCK=1 to override)' };
    }
  }
  const cashCents = Math.round(n * 100);
  const amount = Math.round(cashCents * rate);
  return {
    ok: true,
    firstYearCash: n,
    cashCents,
    rate,
    feeCents: amount,
    feeDisplay: (amount / 100).toFixed(2),
    currency: 'USD',
    note: '10% of first-year cash only on hire; Stripe pending — invoice is a stub until paid evidence',
  };
}

export function invoiceStub({ pairId, cash, evidencePath, actor = 'agent' }) {
  const calc = feeCents(cash);
  if (!calc.ok) return calc;
  if (!pairId) return { ok: false, error: 'pairId required' };
  if (!evidencePath || !fs.existsSync(evidencePath)) {
    return { ok: false, error: 'hire evidence path required and must exist' };
  }
  const st = fs.statSync(evidencePath);
  if (!st.size) return { ok: false, error: 'hire evidence empty' };

  const id = `inv_${pairId}_${Date.now().toString(36)}`;
  const rec = {
    schema: 'demigod.invoice-stub/1',
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
      `Per our terms: 10% of first-year cash = $${calc.feeDisplay} USD.`,
      'Stripe is pending — reply for wire/ACH details.',
      'Nothing is charged until hire is confirmed (this email is the invoice draft).',
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
  a(feeCents(0).ok === false, 'zero cash fails');
  a(feeCents(-1).ok === false, 'negative fails');
  a(feeCents('x').ok === false, 'nan fails');
  const r = feeCents(180000);
  a(r.ok && r.feeCents === 1800000, '10% of 180k = 18000.00 → 1800000 cents');
  a(feeCents(100000).feeDisplay === '10000.00', 'display 10000.00');
  // stub without evidence fails
  const s = invoiceStub({ pairId: 'p1', cash: 100000, evidencePath: '/no/such' });
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
  if (cmd === 'preview') {
    const cash = arg(rest, '--cash');
    console.log(JSON.stringify(feeCents(Number(cash)), null, 2));
  } else if (cmd === 'stub') {
    console.log(
      JSON.stringify(
        invoiceStub({
          pairId: arg(rest, '--pair'),
          cash: Number(arg(rest, '--cash')),
          evidencePath: arg(rest, '--evidence'),
          actor: arg(rest, '--actor') || 'agent',
        }),
        null,
        2,
      ),
    );
  } else if (cmd === 'selftest') selftest();
  else {
    console.error('usage: preview --cash=N | stub --pair=ID --cash=N --evidence=path | selftest');
    process.exit(2);
  }
}
