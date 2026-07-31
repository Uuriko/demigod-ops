#!/usr/bin/env node
/**
 * Hiring freshness — per-company posting-age profile with corpus context.
 *
 *   node demigod-hiring-freshness.mjs                  # top companies by stale share
 *   node demigod-hiring-freshness.mjs --json
 *   node demigod-hiring-freshness.mjs --company stripe
 *   node demigod-hiring-freshness.mjs --selftest
 *
 * WHY THIS EXISTS
 * `report --posted` already lists aging roles corpus-wide. A flat list cannot answer the two
 * questions a reader actually has: "is this company's board stale?" and "is that number normal?"
 * A median posting age of 94 days means nothing without knowing the corpus sits at 38. So this
 * rolls up per company and ranks each against every other company that has enough dated roles.
 *
 * WHAT IT REFUSES TO SAY
 * Not "ghost job". That asserts intent — that an employer is advertising a role they will not
 * fill — and nothing in this data supports a claim about intent. A long-posted role may be a
 * genuinely hard search, an evergreen pipeline req, or a board nobody prunes. What we can say is
 * exactly what we observed: this posting has been listed for N days, sourced from the employer's
 * own first_published date.
 *
 * ABSTENTION IS THE POINT
 * Only Greenhouse `first_published` is a trusted posting date (see postedDaysAgo). Every other
 * role is counted as UNDATED and reported, never imputed and never quietly dropped from the
 * denominator — otherwise a board with two dated roles out of ninety would look precisely
 * measured. Companies below `minDated` get a null percentile rather than a noisy rank.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { postedDaysAgo } from './demigod-role-ledger.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const LEDGER = process.env.DEMIGOD_ROLE_LEDGER || path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/** Median / percentile over an already-sorted ascending numeric array. */
const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[i];
};

/**
 * PURE. Per-company posting-age profiles plus corpus context.
 * @param {object} ledger  role-ledger shape ({ roles: { key: row } })
 * @param {{today?: string, minDated?: number}} opts
 */
export function hiringFreshness(ledger, { today = new Date().toISOString().slice(0, 10), minDated = 5 } = {}) {
  const rows = Object.values(ledger?.roles || {}).filter((r) => r && typeof r === 'object' && !r.closedAt);
  // Self-validation. Every age here rests on the employer's first_published date, and ATS
  // platforms auto-renew listings on 30-90 day cycles, so that field can be recycled under us.
  // The ledger pins the earliest date it ever saw and never moves it, which makes these ages a
  // LOWER bound — this number says how much that matters. Measured 2026-07-31: 0.61% of dated
  // open roles, every gap forward, median 20d. Below 1%, so the published medians are not
  // materially understated. It travels in the output so the claim carries its own caveat rather
  // than relying on anyone remembering this paragraph.
  // Note it is a CENSUS, not a rate: a role recycled before we first observed it is invisible,
  // so this is itself a floor.
  const recycled = rows.filter((r) => (r.postedDateChangeCount || 0) > 0).length;
  const byBoard = new Map();
  for (const row of rows) {
    const key = `${row.provider}|${row.slug}`;
    let b = byBoard.get(key);
    if (!b) byBoard.set(key, (b = { key, provider: row.provider, slug: row.slug, company: row.company || row.slug, ages: [], openRoles: 0, undated: 0, reposted: 0 }));
    b.openRoles += 1;
    if ((row.reopenCount || 0) > 0) b.reposted += 1;
    const age = postedDaysAgo(row, today);
    // null = the board gave us no trusted posting date. Counted, never imputed.
    if (age == null || !Number.isFinite(age) || age < 0) b.undated += 1;
    else b.ages.push(age);
    if (row.company) b.company = row.company;
  }

  const companies = [...byBoard.values()].map((b) => {
    const ages = b.ages.sort((x, y) => x - y);
    const dated = ages.length;
    return {
      provider: b.provider,
      slug: b.slug,
      company: b.company,
      openRoles: b.openRoles,
      datedRoles: dated,
      undatedRoles: b.undated,
      repostedRoles: b.reposted,
      medianPostedDays: quantile(ages, 0.5),
      p90PostedDays: quantile(ages, 0.9),
      oldestPostedDays: dated ? ages[dated - 1] : null,
      stale180: ages.filter((a) => a > 180).length,
      evergreen365: ages.filter((a) => a > 365).length,
      // Share is over DATED roles only — the honest denominator. A board with 2 dated of 90
      // must not read as "50% stale" because one of the two is old.
      staleShare: dated ? Math.round((100 * ages.filter((a) => a > 180).length) / dated) : null,
      measurable: dated >= minDated,
      percentile: null,
    };
  });

  // Corpus context: rank each measurable company's median against the others. A company with too
  // few dated roles is excluded from BOTH the ranking and the corpus that defines it, so a noisy
  // two-role board cannot move the baseline it would then be measured against.
  const ranked = companies.filter((c) => c.measurable).sort((a, b) => a.medianPostedDays - b.medianPostedDays);
  ranked.forEach((c, i) => {
    c.percentile = ranked.length < 2 ? null : Math.round((100 * i) / (ranked.length - 1));
  });

  const corpusAges = ranked.map((c) => c.medianPostedDays).sort((a, b) => a - b);
  const allDated = companies.reduce((n, c) => n + c.datedRoles, 0);
  const allUndated = companies.reduce((n, c) => n + c.undatedRoles, 0);
  return {
    schema: 'demigod.hiring-freshness/1',
    today,
    basis: 'employer first_published posting date (Greenhouse only); all other roles undated',
    corpus: {
      companies: companies.length,
      measurableCompanies: ranked.length,
      openRoles: companies.reduce((n, c) => n + c.openRoles, 0),
      datedRoles: allDated,
      undatedRoles: allUndated,
      medianCompanyPostedDays: quantile(corpusAges, 0.5),
      p90CompanyPostedDays: quantile(corpusAges, 0.9),
      postedDateRecycledRoles: recycled,
      postedDateRecycledPctOfDated: allDated ? Math.round((10000 * recycled) / allDated) / 100 : null,
      agesAreLowerBound: true,
    },
    companies,
  };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const T = '2026-07-31';
  const role = (o = {}) => ({
    provider: 'Greenhouse', slug: 'acme', company: 'Acme', title: 't', location: 'SF', url: '',
    fn: 'Engineering', usPosted: true, firstSeen: T, lastSeen: T, closedAt: null, reopenCount: 0,
    nativePostedAt: '2026-07-01', nativeDateField: 'first_published', ...o,
  });
  const led = (rows) => ({ roles: Object.fromEntries(rows.map((r, i) => [`${r.provider}|${r.slug}|j${i}`, r])) });
  const of = (res, slug) => res.companies.find((c) => c.slug === slug);

  // Untrusted date fields must ABSTAIN, not be imputed or silently dropped.
  {
    const r = hiringFreshness(led([
      role({ nativePostedAt: '2026-01-01' }),
      role({ nativePostedAt: '2026-01-01', nativeDateField: 'created_at' }),
      role({ nativePostedAt: null, nativeDateField: null }),
    ]), { today: T, minDated: 1 });
    const c = of(r, 'acme');
    assert(c.openRoles === 3, 'every open role is counted');
    assert(c.datedRoles === 1 && c.undatedRoles === 2, `only first_published is dated, got ${c.datedRoles}/${c.undatedRoles}`);
    assert(c.datedRoles + c.undatedRoles === c.openRoles, 'dated + undated must reconcile to openRoles');
    assert(r.corpus.undatedRoles === 2, 'corpus surfaces the abstention too');
  }

  // Stale share is over DATED roles — a mostly-undated board must not read as precisely measured.
  {
    const rows = [role({ nativePostedAt: '2025-01-01' })]; // ~576d, stale
    for (let i = 0; i < 9; i += 1) rows.push(role({ nativeDateField: 'created_at' }));
    const c = of(hiringFreshness(led(rows), { today: T, minDated: 1 }), 'acme');
    assert(c.datedRoles === 1 && c.staleShare === 100, 'share is over the dated denominator');
    assert(c.openRoles === 10, 'but the reader still sees all 10 open roles');
  }

  // Too few dated roles → no percentile. A noisy board gets no rank, and does not set the baseline.
  {
    const r = hiringFreshness(led([
      role({ slug: 'tiny', nativePostedAt: '2025-01-01' }),
      ...Array.from({ length: 6 }, () => role({ slug: 'big' })),
    ]), { today: T, minDated: 5 });
    assert(of(r, 'tiny').measurable === false && of(r, 'tiny').percentile === null, 'thin board gets no rank');
    assert(of(r, 'big').measurable === true, 'a board with enough dated roles is measurable');
    assert(r.corpus.measurableCompanies === 1, 'thin boards are excluded from the corpus baseline');
  }

  // Ordering: an older median must rank higher (worse) than a fresher one.
  {
    const rows = [];
    for (let i = 0; i < 5; i += 1) rows.push(role({ slug: 'fresh', nativePostedAt: '2026-07-20' }));
    for (let i = 0; i < 5; i += 1) rows.push(role({ slug: 'stale', nativePostedAt: '2024-07-20' }));
    const r = hiringFreshness(led(rows), { today: T, minDated: 5 });
    assert(of(r, 'fresh').percentile === 0 && of(r, 'stale').percentile === 100, 'percentile orders fresh→stale');
    assert(of(r, 'stale').evergreen365 === 5, 'roles past a year are counted');
  }

  // Closed roles are not open roles; reposts are surfaced.
  {
    const r = hiringFreshness(led([
      role({ closedAt: T }),
      role({ reopenCount: 2 }),
    ]), { today: T, minDated: 1 });
    const c = of(r, 'acme');
    assert(c.openRoles === 1, 'closed roles are excluded');
    assert(c.repostedRoles === 1, 'reposted roles are surfaced');
  }

  // Degenerate inputs must not crash or fabricate.
  assert(hiringFreshness(null).companies.length === 0, 'null ledger → empty, no crash');
  assert(hiringFreshness({ roles: { a: 'junk' } }).companies.length === 0, 'malformed rows are ignored');

  console.log(JSON.stringify({ ok: true, selftest: 'hiring-freshness' }));
  process.exit(0);
}

if (isMain && !process.argv.includes('--selftest')) {
  const arg = (f) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const res = hiringFreshness(ledger, { today: new Date().toISOString().slice(0, 10) });
  const only = arg('--company');
  // No process.exit() anywhere below: it discards pending async stdout, which silently truncated
  // the tail of the ~2,700-line --json payload and made it unparseable to any consumer.
  if (only) {
    const c = res.companies.find((x) => x.slug === only || x.company?.toLowerCase() === only.toLowerCase());
    if (!c) { console.error(`no board matched ${only}`); process.exitCode = 1; }
    else console.log(JSON.stringify({ ...res, companies: [c] }, null, 2));
  } else if (process.argv.includes('--json')) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    const limit = Number(arg('--limit') || 20);
    const top = res.companies
      .filter((c) => c.measurable)
      .sort((a, b) => b.staleShare - a.staleShare || b.medianPostedDays - a.medianPostedDays)
      .slice(0, Number.isFinite(limit) ? limit : 20);
    const c = res.corpus;
    console.log(
      `hiring freshness · ${c.companies} boards · ${c.openRoles} open roles · ` +
      `${c.datedRoles} with an employer posting date, ${c.undatedRoles} undated\n` +
      `corpus median company posting age ${c.medianCompanyPostedDays}d (p90 ${c.p90CompanyPostedDays}d) ` +
      `across ${c.measurableCompanies} measurable boards\n` +
      `posting dates recycled by the board on ${c.postedDateRecycledRoles} roles ` +
      `(${c.postedDateRecycledPctOfDated}% of dated) — ages below are a lower bound\n`,
    );
    for (const x of top) {
      console.log(
        `  ${String(x.staleShare).padStart(3)}% >180d  median ${String(x.medianPostedDays).padStart(4)}d  ` +
        `p${String(x.percentile).padStart(3)}  ${String(x.datedRoles).padStart(3)}/${String(x.openRoles).padEnd(4)} dated  ` +
        `${x.company}`.slice(0, 120),
      );
    }
  }
}
