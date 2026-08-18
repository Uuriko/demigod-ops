#!/usr/bin/env node
/**
 * demigod-posting-age-index — how long SF startup roles have actually been posted.
 *
 * Reads DEMIGOD-DIRECTORY-AGING.json and emits the one number Demigod can defend: the share of
 * open roles, among those with a date we can attribute to the company's own ATS, that have been
 * posted 90-365 days. Roles older than 365 days are counted apart as evergreen, never folded in.
 *
 * This is a POSTING-AGE measurement, not a ghost-job claim. An old posting can be a real, hard,
 * still-open role. Every published surface says so — the honest number is the product.
 *
 * Honesty invariant, same as demigod-site-counters: a figure with no backing value is OMITTED.
 * Never a fabricated zero, never a share computed off an empty denominator.
 *
 *   node demigod-posting-age-index.mjs              # HTML fragment (table + method + limits)
 *   node demigod-posting-age-index.mjs --json
 *   node demigod-posting-age-index.mjs --selftest
 *
 * Schema: demigod.posting-age-index/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const AGING_MIN_DAYS = 90;
const AGING_MAX_DAYS = 365;

// pure: aging file -> published figures, or null when nothing is attributable.
export function postingAgeIndex(aging = {}) {
  const rows = Object.values(aging.companies || {});
  if (!rows.length) return null;
  const sum = (field) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  const countWith = (field) => rows.filter((r) => Number(r[field]) > 0).length;
  const attributedRoles = sum('attributed');
  // No attributable dates means no defensible share. Report the counts, omit the number that
  // would be a guess — a share off a zero denominator is exactly the fabrication this refuses.
  if (attributedRoles <= 0) return null;
  const agingRoles = sum('agingRoles');
  const boards = rows.filter((r) => r.board).length;
  return {
    schema: 'demigod.posting-age-index/1',
    asOf: aging.today || null,
    companies: rows.length,
    companiesWithVerifiedBoard: boards,
    openRoles: sum('openRoles'),
    attributedRoles,
    agingRoles,
    agingSharePct: Math.round((agingRoles / attributedRoles) * 1000) / 10,
    evergreenRoles: sum('evergreenRoles'),
    companiesWithAgingRole: countWith('agingRoles'),
    companiesWithEvergreenRole: countWith('evergreenRoles'),
    window: { minDays: AGING_MIN_DAYS, maxDays: AGING_MAX_DAYS },
    /* Ships with the number, not in a footnote nobody reads. `observed90` is Demigod's own
       continuous-observation count; while the first-seen ledger is younger than 90 days it is 0,
       and the window rests on ATS-reported dates instead. Saying so is the point of the exercise. */
    limits: [
      'San Francisco technology companies with a verified public ATS board — not a national sample.',
      'Posting age is measured from the date the company\'s own ATS reports, not from when Demigod first saw the role.',
      `Demigod independently observed ${sum('observed90')} of these roles open for 90 days or more; the rest of the window rests on those ATS dates.`,
      'A long-open role is not evidence of a fake one. Hard roles stay open.',
    ],
  };
}

/**
 * The only date field this codebase treats as a real posting date.
 *
 * `postedDaysAgo` in demigod-role-ledger.mjs has always required it, and the reason is that the
 * alternatives do not mean what they look like: `createdAt` is when the record was made and
 * `publishedAt` can move when a role is edited, so either one can make an old role look new. Mixing
 * them into one denominator produces a number that is indefensible the moment anyone asks how it
 * was built.
 */
export const ATTRIBUTABLE_DATE_FIELD = 'first_published';

/** Buckets, in days. Cumulative — a role older than 365 is also older than 30. */
export const AGE_BUCKETS = [30, 90, 180, 365];

/**
 * PURE. The distribution of posting ages across open roles, per date-field cohort.
 *
 * Reported per cohort rather than pooled, because pooling is exactly the mistake that produced a
 * headline of "69.8% of 17,110" when the defensible statement is 69.1% of the 9,602 roles carrying
 * an attributable date. The two happen to be close here. That is luck, not method: the `createdAt`
 * cohort runs 13 points higher, so a different mix would have moved the pooled figure and nobody
 * would have known which part was real.
 */
export function ageDistribution(roles, today, { buckets = AGE_BUCKETS } = {}) {
  const day = (value) => {
    const ms = Date.parse(String(value || ''));
    return Number.isFinite(ms) ? Math.round((Date.parse(today) - ms) / 86400000) : null;
  };
  if (!Number.isFinite(Date.parse(today))) throw new Error('posting-age: a distribution needs a real "today"');

  const cohorts = {};
  for (const role of roles || []) {
    if (!role || role.closedAt) continue;
    const field = role.nativeDateField || 'none';
    const age = day(role.nativePostedAt);
    if (age === null || age < 0) continue;
    (cohorts[field] ||= []).push(age);
  }

  const shape = (ages) => {
    // An empty denominator yields no share at all — never a fabricated zero. Same invariant as
    // postingAgeIndex above, which returns null rather than divide by nothing.
    if (!ages.length) return null;
    const over = {};
    for (const bucket of buckets) {
      const n = ages.filter((age) => age > bucket).length;
      over[bucket] = { roles: n, sharePct: Math.round((n / ages.length) * 1000) / 10 };
    }
    const sorted = [...ages].sort((a, b) => a - b);
    return { denominator: ages.length, medianDays: sorted[Math.floor(sorted.length / 2)], over };
  };

  const out = { schema: 'demigod.posting-age-distribution/1', asOf: String(today).slice(0, 10), cohorts: {} };
  for (const [field, ages] of Object.entries(cohorts)) out.cohorts[field] = shape(ages);
  out.attributable = out.cohorts[ATTRIBUTABLE_DATE_FIELD] || null;
  out.headline = out.attributable
    ? { field: ATTRIBUTABLE_DATE_FIELD, ...out.attributable.over[30], denominator: out.attributable.denominator }
    : null;
  return out;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => Number(n).toLocaleString('en-US');

// Self-contained fragment: a real data table (the thing that gets quoted), then method, then limits.
export function indexFragment(ix) {
  if (!ix) return '';
  const row = (label, value, note) =>
    `<tr><th scope="row" style="text-align:left;font-weight:500;padding:6px 14px 6px 0">${esc(label)}</th>` +
    `<td style="text-align:right;font-variant-numeric:tabular-nums;padding:6px 0">${esc(fmt(value))}</td>` +
    `<td style="padding:6px 0 6px 14px;color:#7f978c">${esc(note || '')}</td></tr>`;
  return [
    `<section aria-labelledby="dg-age-h">`,
    `<h2 id="dg-age-h">How long SF startup roles stay posted</h2>`,
    `<p><strong>${esc(ix.agingSharePct)}%</strong> of open SF startup roles with an attributable post date `,
    `have been listed ${ix.window.minDays}–${ix.window.maxDays} days`,
    ix.asOf ? ` (as of ${esc(ix.asOf)})` : '',
    `. That is posting age, not intent — see the limits below.</p>`,
    `<table><tbody>`,
    row('Companies tracked', ix.companies, 'SF tech, verified public ATS board'),
    row('Open roles', ix.openRoles, 'across those boards'),
    row('Roles with an attributable post date', ix.attributedRoles, 'the denominator'),
    row(`Posted ${ix.window.minDays}–${ix.window.maxDays} days`, ix.agingRoles, `${ix.agingSharePct}% of attributable roles`),
    row('Posted over a year', ix.evergreenRoles, 'counted apart, never folded in'),
    row('Companies with at least one', ix.companiesWithAgingRole, 'role in that window'),
    `</tbody></table>`,
    `<h3>Method</h3>`,
    `<p>Each role's age comes from the date its own applicant tracking system reports, not from when `,
    `Demigod first saw it. Roles past ${ix.window.maxDays} days are counted separately as evergreen so `,
    `they cannot inflate the headline. Roles with no attributable date are excluded from the `,
    `denominator rather than assumed recent.</p>`,
    `<h3>Limits</h3><ul>`,
    ix.limits.map((l) => `<li>${esc(l)}</li>`).join(''),
    `</ul></section>`,
  ].join('');
}

if (isMain && process.argv.includes('--distribution')) {
  const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json'), 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  console.log(JSON.stringify(ageDistribution(Object.values(ledger.roles || {}), today), null, 1));
  // Exit, or the unconditional `if (isMain)` below also prints the aging fragment and the combined
  // output is not parseable JSON. The selftest block escapes the same way.
  process.exit(0);
} else if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };

  // --- distribution: cohorts stay separate, and an empty denominator yields no share ---
  {
    const R = (field, day, extra = {}) => ({ nativeDateField: field, nativePostedAt: day, ...extra });
    const dist = ageDistribution([
      R('first_published', '2026-08-01'),                 //  16d
      R('first_published', '2026-06-01'),                 //  77d
      R('first_published', '2026-01-01'),                 // 228d
      R('first_published', '2024-01-01'),                 // 959d
      R('createdAt', '2020-01-01'),                       // old, different cohort
      R('first_published', '2026-08-10', { closedAt: '2026-08-12' }), // closed, excluded
      R('first_published', null),                          // no date, excluded
    ], '2026-08-17');

    const a = dist.attributable;
    assert(a.denominator === 4, `closed and undated roles are excluded, got ${a.denominator}`);
    assert(a.over[30].roles === 3 && a.over[90].roles === 2, 'buckets are cumulative');
    assert(a.over[365].roles === 1, 'the oldest bucket still counts');
    assert(dist.cohorts.createdAt.denominator === 1, 'a weaker date field is its own cohort, never pooled');
    assert(dist.headline.field === 'first_published', 'the headline rests on the attributable field only');
    assert(dist.headline.denominator === 4, 'and carries its denominator');

    // The invariant this file already holds: no denominator, no share.
    const empty = ageDistribution([R('createdAt', '2026-01-01')], '2026-08-17');
    assert(empty.attributable === null && empty.headline === null, 'no attributable roles means no headline, not 0%');
    assert(empty.cohorts.createdAt.denominator === 1, 'the cohort that does exist is still reported');

    // A future-dated posting is bad data, not a negative age.
    const future = ageDistribution([R('first_published', '2027-01-01'), R('first_published', '2026-01-01')], '2026-08-17');
    assert(future.attributable.denominator === 1, 'a post date in the future is dropped, not counted as fresh');

    let threw = false;
    try { ageDistribution([], 'not-a-date'); } catch { threw = true; }
    assert(threw, 'a distribution without a real today is refused');
    assert(ageDistribution([], '2026-08-17').headline === null, 'no roles at all means no headline');
  }
  const fixture = {
    today: '2026-08-15',
    companies: {
      a: { board: 'Lever|a', openRoles: 10, attributed: 8, agingRoles: 2, evergreenRoles: 1, observed90: 0 },
      b: { board: 'Greenhouse|b', openRoles: 5, attributed: 2, agingRoles: 0, evergreenRoles: 0, observed90: 0 },
    },
  };
  const ix = postingAgeIndex(fixture);
  assert(ix.attributedRoles === 10, 'denominator is attributed roles, not open roles');
  assert(ix.agingRoles === 2 && ix.agingSharePct === 20, 'share is aging/attributed = 2/10');
  assert(ix.evergreenRoles === 1, 'evergreen counted');
  assert(!String(ix.agingRoles).includes(String(ix.evergreenRoles + ix.agingRoles)), 'evergreen never folded into aging');
  assert(ix.companiesWithAgingRole === 1, 'company counted once regardless of role count');
  // HONESTY: no attributable dates -> no index at all, never a share off an empty denominator
  assert(postingAgeIndex({ companies: { a: { openRoles: 9, attributed: 0 } } }) === null, 'zero attributed -> null, not 0%');
  assert(postingAgeIndex({}) === null, 'no companies -> null, no crash');
  assert(postingAgeIndex() === null, 'no argument -> null, no crash');
  // limits travel with the number
  assert(ix.limits.length >= 4 && ix.limits.some((l) => /not evidence of a fake one/.test(l)), 'ships the not-a-ghost-job limit');
  assert(ix.limits.some((l) => /independently observed 0 /.test(l)), 'states our own observation count honestly');
  const frag = indexFragment(ix);
  assert(frag.includes('20%') && frag.includes('Limits'), 'fragment carries the share and the limits');
  assert(indexFragment(null) === '', 'no index -> empty fragment, never a stub');
  assert(!indexFragment({ ...ix, asOf: '<img src=x onerror=alert(1)>' }).includes('<img src=x'), 'as-of is HTML-escaped');
  console.log(JSON.stringify({ ok: true, selftest: 'posting-age-index' }));
  process.exit(0);
}

if (isMain) {
  const file = process.env.DEMIGOD_AGING || path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json');
  const ix = postingAgeIndex(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (process.argv.includes('--json')) { console.log(JSON.stringify(ix, null, 2)); process.exit(0); }
  console.log(indexFragment(ix));
}
