#!/usr/bin/env node
/**
 * demigod-board-pay — pay visibility as EVIDENCE, with the reader's blindness recorded.
 *
 * The whole point of this module is one distinction the rest of the codebase keeps
 * getting wrong: a company that declines to post pay and a board we cannot read pay
 * from are not the same fact, and collapsing them invents a company property out of
 * an ATS limitation.
 *
 * Measured on 40 live Ashby boards / 510 roles (2026-08-17):
 *   - Ashby is the only pay-capable reader we have. `compensationTierSummary` exists
 *     ONLY when the request carries `?includeCompensation=true`; without the param the
 *     key is absent entirely, so a naive read records OUR omission as THEIR silence.
 *   - 72.4% of Ashby roles carry a pay string. `shouldDisplayCompensationOnJobPostings`
 *     tracks it near-exactly (373 opt-in vs 369 strings) — hence intersect, not either alone.
 *   - 21.2% of roles WITHOUT the opt-in flag publish a range in the description anyway.
 *     That is why `withheld` requires checking the description too: trusting the flag
 *     alone would brand 29 of 137 roles as withholding pay while they publish it.
 *   - Greenhouse's board list API and Lever's postings API return no pay field at all.
 *     Of 471 mapped boards, 166 (35%) are structurally silent — about the ATS, not the company.
 *
 * California SB 1162 is why the distinction has teeth: employers with 15+ employees must
 * state a pay scale in the posting itself. So `withheld` on a CA role is a real signal,
 * while `unsupported` is not a signal at all. This module never asserts non-compliance —
 * it only reports which of the two situations we are actually in.
 *
 *   node demigod-board-pay.mjs --selftest
 *   node demigod-board-pay.mjs scan [--limit=N] [--out=DEMIGOD-BOARD-PAY.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPublicCompQuotes } from './demigod-public-comp.mjs';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const HOME = path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(HOME, 'DEMIGOD-SF-STARTUP-MAP.json');
const OUT = path.join(HOME, 'DEMIGOD-BOARD-PAY.json');

/**
 * Which ATS readers can express pay to us AT ALL. Establshed by probing the live APIs,
 * not by reading vendor docs: a provider earns a place here only when a real board
 * returned a real pay field. Everything absent from this set yields `unsupported`,
 * which is a statement about our reach and must never be read as a company choice.
 */
export const PAY_CAPABLE_ATS = new Set(['Ashby']);

/** Ashby only returns compensation when explicitly asked; the param IS the capability. */
export function ashbyBoardUrl(slug) {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;
}

export function payCapability(ats) {
  return PAY_CAPABLE_ATS.has(String(ats || '')) ? 'structured' : 'none';
}

/**
 * Classify ONE role. Three states, never two:
 *   published  — a pay quote exists (structured tier string, or stated in the description)
 *   withheld   — we could have seen pay here and the posting does not state it
 *   unsupported— this reader cannot carry pay; says nothing whatsoever about the company
 *
 * `quote` is always an exact substring of what the board published — never rewritten,
 * never a number we derived. Numeric min/max is deliberately NOT returned: numeric keys
 * are how a "sort by pay" grows, and a sort implies a completeness this data does not have.
 */
export function rolePayVisibility(job, ats) {
  if (payCapability(ats) !== 'structured') {
    return { state: 'unsupported', quote: null, source: null };
  }
  const comp = job?.compensation || {};
  const tier = String(comp.compensationTierSummary || comp.scrapeableCompensationSalarySummary || '').trim();
  const optIn = job?.shouldDisplayCompensationOnJobPostings === true;
  // Intersect: the flag alone can be on with nothing behind it, and a string alone can
  // survive from a tier the company since stopped displaying.
  if (tier && optIn) return { state: 'published', quote: tier, source: 'structured' };
  // The 21.2% case — no flag, but the range is written into the posting body.
  const text = String(job?.descriptionPlain || job?.descriptionHtml || '');
  const found = extractPublicCompQuotes(text)[0];
  if (found?.quote) return { state: 'published', quote: found.quote, source: 'description' };
  // A tier string with the flag off: the company took it down. Report it as withheld,
  // but keep the stale string out of the record rather than publishing what they hid.
  return { state: 'withheld', quote: null, source: null };
}

/**
 * Roll roles up to the board. A board counts as publishing if ANY role does — pay
 * disclosure is per-posting, and one published range proves the company is willing and
 * the reader is working, which is exactly what the state is for.
 */
export function rollUpBoardPay(roles = [], ats) {
  if (payCapability(ats) !== 'structured') {
    return { state: 'unsupported', roles: roles.length, published: 0, withheld: 0, quotes: [] };
  }
  const seen = roles.map((job) => rolePayVisibility(job, ats));
  const published = seen.filter((r) => r.state === 'published');
  return {
    state: published.length ? 'published' : 'withheld',
    roles: roles.length,
    published: published.length,
    withheld: seen.filter((r) => r.state === 'withheld').length,
    quotes: published.slice(0, 5).map((r) => ({ quote: r.quote, source: r.source })),
  };
}

/**
 * The anti-coverage-bias guard, made executable rather than left as a warning comment.
 *
 * 35% of mapped boards cannot express pay. Counting those as "not publishing" produces
 * the sentence "Ashby companies are more transparent" — which is not a finding about
 * companies at all, it is a finding about which vendor's API we can read. Any share,
 * ranking or comparison MUST run on this filtered set, and the denominator it returns
 * is the only honest one.
 */
export function comparablePayCompanies(rows = []) {
  return rows.filter((row) => row?.pay?.state === 'published' || row?.pay?.state === 'withheld');
}

/** Share of companies publishing pay, over the comparable denominator only. */
export function payPublishRate(rows = []) {
  const comparable = comparablePayCompanies(rows);
  const publishing = comparable.filter((row) => row.pay.state === 'published').length;
  return {
    publishing,
    comparable: comparable.length,
    excludedUnreadable: rows.length - comparable.length,
    rate: comparable.length ? publishing / comparable.length : null,
  };
}

function slugFromJobsUrl(url) {
  const m = String(url || '').match(/ashbyhq\.com\/([^/?#]+)/i);
  return m ? m[1] : null;
}

async function scan({ limit = 0, out = OUT } = {}) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const all = map.companies || map.rows || map;
  const rows = [];
  const capable = [];
  for (const c of all) {
    if (!c?.jobsUrl || !c?.atsSource) continue;
    if (payCapability(c.atsSource) !== 'structured') {
      rows.push({ name: c.name, ats: c.atsSource, jobsUrl: c.jobsUrl, pay: rollUpBoardPay([], c.atsSource) });
      continue;
    }
    const slug = slugFromJobsUrl(c.jobsUrl);
    if (slug) capable.push({ c, slug });
  }
  const queue = limit ? capable.slice(0, limit) : capable;
  let done = 0;
  const work = async () => {
    while (queue.length) {
      const { c, slug } = queue.shift();
      let pay;
      try {
        const res = await fetch(ashbyBoardUrl(slug), { headers: { 'user-agent': 'demigod-board-pay' } });
        // A failed read is NOT a company that withholds pay. Same rule as everywhere else.
        pay = res.ok
          ? rollUpBoardPay((await res.json()).jobs || [], c.atsSource)
          : { state: 'unread', roles: 0, published: 0, withheld: 0, quotes: [], httpStatus: res.status };
      } catch (err) {
        pay = { state: 'unread', roles: 0, published: 0, withheld: 0, quotes: [], error: String(err.message || err) };
      }
      rows.push({ name: c.name, ats: c.atsSource, jobsUrl: c.jobsUrl, pay });
      if (++done % 25 === 0) console.error(`  …${done} boards read`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, work));
  const stats = payPublishRate(rows);
  const payload = {
    generatedAt: new Date().toISOString(),
    note: 'unsupported = the ATS cannot express pay to us; unread = our fetch failed. Neither is a company choice. Compare only over `comparable`.',
    payCapableAts: [...PAY_CAPABLE_ATS],
    stats,
    rows,
  };
  fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `board-pay · ${stats.publishing}/${stats.comparable} comparable boards publish pay` +
      `${stats.rate === null ? '' : ` (${(100 * stats.rate).toFixed(1)}%)`}` +
      ` · ${stats.excludedUnreadable} excluded as unreadable → ${path.basename(out)}`,
  );
  return payload;
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
  };
  const ashby = 'Ashby';

  // Structured pay, opted in → published, quote carried verbatim.
  const a = rolePayVisibility(
    { shouldDisplayCompensationOnJobPostings: true, compensation: { compensationTierSummary: '$196K – $235K • Offers Equity' } },
    ashby,
  );
  assert(a.state === 'published' && a.source === 'structured', 'opted-in tier string publishes');
  assert(a.quote === '$196K – $235K • Offers Equity', 'quote is carried verbatim, not reformatted');

  // The measured 21.2%: flag off, but the posting states a range in its body.
  const b = rolePayVisibility(
    {
      shouldDisplayCompensationOnJobPostings: false,
      compensation: {},
      descriptionPlain: 'About the role. The salary range for this role is $150,000 - $210,000 USD. Apply now.',
    },
    ashby,
  );
  assert(b.state === 'published', 'a range in the description counts as published even with the flag off');
  assert(b.source === 'description', 'description-sourced pay is labelled as such');

  // Genuinely silent: capable reader, no flag, nothing in the body.
  const c = rolePayVisibility(
    { shouldDisplayCompensationOnJobPostings: false, compensation: {}, descriptionPlain: 'We are hiring engineers. Great team.' },
    ashby,
  );
  assert(c.state === 'withheld' && c.quote === null, 'no flag and no stated range is withheld, with no quote');

  // The core rule: an unreadable ATS is never a company that withholds.
  for (const ats of ['Greenhouse', 'Lever', 'Workable', '', null]) {
    const r = rolePayVisibility({ shouldDisplayCompensationOnJobPostings: false }, ats);
    assert(r.state === 'unsupported', `${ats || 'blank'} yields unsupported, never withheld`);
  }

  // A stale tier string with the flag switched off must not leak the pay they took down.
  const stale = rolePayVisibility(
    { shouldDisplayCompensationOnJobPostings: false, compensation: { compensationTierSummary: '$200K – $250K' }, descriptionPlain: 'no range here' },
    ashby,
  );
  assert(stale.state === 'withheld' && stale.quote === null, 'flag off suppresses a stale tier string');

  // Board rollup: one published role is enough to prove willingness and a working reader.
  const board = rollUpBoardPay(
    [
      { shouldDisplayCompensationOnJobPostings: true, compensation: { compensationTierSummary: '$100K – $120K' } },
      { shouldDisplayCompensationOnJobPostings: false, compensation: {}, descriptionPlain: 'nothing' },
    ],
    ashby,
  );
  assert(board.state === 'published' && board.published === 1 && board.withheld === 1, 'board rollup counts both states');
  assert(rollUpBoardPay([{}], 'Greenhouse').state === 'unsupported', 'greenhouse board rolls up unsupported');

  // The coverage-bias guard: unreadable boards must not dilute the rate.
  const rows = [
    { pay: { state: 'published' } },
    { pay: { state: 'withheld' } },
    { pay: { state: 'unsupported' } },
    { pay: { state: 'unread' } },
  ];
  assert(comparablePayCompanies(rows).length === 2, 'only published+withheld are comparable');
  const stats = payPublishRate(rows);
  assert(stats.rate === 0.5, 'rate is 1/2 over comparable, not 1/4 over everything');
  assert(stats.excludedUnreadable === 2, 'unsupported and unread are both excluded and counted');
  assert(payPublishRate([{ pay: { state: 'unsupported' } }]).rate === null, 'no comparable boards yields null, never 0');

  console.log('demigod-board-pay selftest OK · 16 assertions');
}

if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  if (args.includes('--selftest')) selftest();
  else if (args[0] === 'scan') await scan({ limit: Number(flag('limit')) || 0, out: flag('out') || OUT });
  else console.log('usage: demigod-board-pay.mjs [scan [--limit=N] [--out=FILE] | --selftest]');
}
