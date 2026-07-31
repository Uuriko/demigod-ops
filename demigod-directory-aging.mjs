#!/usr/bin/env node
// Per-company open-role AGING for the /startups directory — the "role-truth" signal no other directory
// shows: how long each company's roles have actually been open. Built from the first-seen role ledger,
// keeping its honesty invariants: observedOpenDays = days since WE first observed the role open on the
// company's public ATS board (never the board's own date), and only OPEN + US-posted roles are counted.
// Output DEMIGOD-DIRECTORY-AGING.json is a compact per-company lookup the directory render can read.
//   node demigod-directory-aging.mjs [--out file] | --selftest
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardsFromMap, observedOpenDays, postedDaysAgo } from './demigod-role-ledger.mjs';
import { enqueueReseal } from './demigod-reseal-queue.mjs';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const norm = (s) => String(s || '').toLowerCase().trim();

// PURE: roll open+US-posted ledger roles up per board key ("provider|slug"), on TWO honest bases:
//  - observed*: days since DEMIGOD first saw the role open (firstSeen). Honest but young — grows over time.
//  - posted*:   days since the role's own board posting date, ATTRIBUTED (Greenhouse first_published only,
//               so postedDaysAgo returns null otherwise). Real signal from day one, for the attributed subset.
// Closed roles and non-US-posted roles are excluded from both.
// Below this many attributed roles a board is not rankable: one old posting would swing it.
const MIN_DATED_FOR_RANK = 5;

export function agingByBoard(ledger, today) {
  const byBoard = {};
  for (const r of Object.values(ledger?.roles || {})) {
    if (r.closedAt || !r.usPosted) continue;
    const key = `${r.provider}|${r.slug}`;
    const b = byBoard[key] || (byBoard[key] = {
      openRoles: 0, oldestObservedDays: 0,
      observed7: 0, observed30: 0, observed60: 0, observed90: 0,
      attributed: 0, agingRoles: 0, evergreenRoles: 0, oldestAgingDays: 0,
      roleMix: {}, postedAges: [],
    });
    b.openRoles++;
    const fn = String(r.fn || 'other').slice(0, 40) || 'other';
    b.roleMix[fn] = (b.roleMix[fn] || 0) + 1;
    const od = observedOpenDays(r, today);
    if (od >= 0) {
      if (od > b.oldestObservedDays) b.oldestObservedDays = od;
      if (od >= 7) b.observed7++;
      if (od >= 30) b.observed30++;
      if (od >= 60) b.observed60++;
      if (od >= 90) b.observed90++;
    }
    const pd = postedDaysAgo(r, today); // null unless the board date is attributed (first_published)
    if (pd != null && pd >= 0) {
      b.attributed++;
      b.postedAges.push(pd);
      // >365d = perennial / talent-pool posting (e.g. "Join our talent community"), not a stuck vacancy.
      if (pd > 365) b.evergreenRoles++;
      else if (pd >= 90) { b.agingRoles++; if (pd > b.oldestAgingDays) b.oldestAgingDays = pd; }
    }
  }
  // A board's MEDIAN posting age says something the extremes cannot: oldestAgingDays is one
  // outlier, while the median describes the board. Derived only from attributed dates, so a board
  // with no trusted dates gets null rather than a fabricated middle. The raw array is dropped —
  // this asset ships to the CDN and 973 companies of per-role ages would bloat it for no reader.
  for (const b of Object.values(byBoard)) {
    const ages = b.postedAges.sort((x, y) => x - y);
    const at = (q) => (ages.length ? ages[Math.min(ages.length - 1, Math.max(0, Math.round((ages.length - 1) * q)))] : null);
    b.medianPostedDays = at(0.5);
    b.p90PostedDays = at(0.9);
    delete b.postedAges;
  }
  return byBoard;
}

// PURE: join board aging to map companies (via boardsFromMap's provider|slug), keyed by normalized name.
export function directoryAging(map, ledger, today) {
  const byBoard = agingByBoard(ledger, today);
  const companies = {};
  for (const b of boardsFromMap(map)) {
    const a = byBoard[`${b.provider}|${b.slug}`];
    if (!a || a.openRoles === 0) continue; // only companies with observed open roles
    companies[norm(b.company)] = { name: b.company, board: `${b.provider}|${b.slug}`, ...a };
  }
  // Corpus context. "median 146d" is unreadable until you know the corpus sits at 51d, so rank each
  // board against the others. Boards under MIN_DATED_FOR_RANK are excluded from the ranking AND
  // from the corpus that defines it — otherwise a two-role board both gets a noisy rank and moves
  // the baseline it is then measured against.
  const ranked = Object.values(companies)
    .filter((c) => c.attributed >= MIN_DATED_FOR_RANK && c.medianPostedDays != null)
    .sort((x, y) => x.medianPostedDays - y.medianPostedDays);
  ranked.forEach((c, i) => {
    c.postedPercentile = ranked.length < 2 ? null : Math.round((100 * i) / (ranked.length - 1));
  });
  return companies;
}

export function buildAsset(map, ledger, today) {
  const companies = directoryAging(map, ledger, today);
  const vals = Object.values(companies);
  return {
    schema: 'demigod.directory-aging/2',
    today,
    note: "Open-role aging per company from Demigod's first-seen ledger. 'agingRoles' = open roles posted 90-365 days ago per the company's own board date (attributed to Greenhouse first_published) — the honest 'still open a while' signal; roles posted >365 days ago are counted apart as 'evergreenRoles' (perennial/talent-pool postings, not stuck vacancies). 'observed*' = days since Demigod first saw the role open (grows over time). Only open, US-posted roles counted. Counts are facts, not a 'ghost job' verdict.",
    companyCount: vals.length,
    companiesWithAgingRole: vals.filter((c) => c.agingRoles > 0).length,
    companiesWithObserved90: vals.filter((c) => c.observed90 > 0).length,
    companies,
  };
}

// Public-safe fields stamped onto map companies for the directory renderer.
// Observed* = our firstSeen (honest, young ledger). agingRoles = attributed board post 90–365d.
const MAP_AGING_KEYS = [
  'agingRoles', 'oldestAgingDays',
  'medianPostedDays', 'postedPercentile',
  'oldestObservedDays', 'observed7', 'observed30', 'observed60', 'observed90',
  'ledgerOpenRoles', 'roleMix',
];

// Enrich map companies in place. Idempotent: clears stale keys when the company no longer qualifies.
export function enrichMap(map, asset) {
  const byName = asset.companies || {};
  let enriched = 0;
  const globalMix = {};
  for (const c of map.companies || []) {
    for (const k of MAP_AGING_KEYS) {
      if (k in c) delete c[k];
    }
    const a = byName[norm(c.name)];
    if (!a || !(a.openRoles > 0)) continue;
    // Always attach observed span when we have ledger open roles (even if <7d) so the UI can
    // say "tracked Nd (our first seen)" — never invent board post age.
    if (Number.isSafeInteger(a.oldestObservedDays) && a.oldestObservedDays >= 0) {
      c.oldestObservedDays = a.oldestObservedDays;
    }
    if (a.observed7 > 0) c.observed7 = a.observed7;
    if (a.observed30 > 0) c.observed30 = a.observed30;
    if (a.observed60 > 0) c.observed60 = a.observed60;
    if (a.observed90 > 0) c.observed90 = a.observed90;
    if (a.openRoles > 0) c.ledgerOpenRoles = a.openRoles;
    if (a.agingRoles > 0) {
      c.agingRoles = a.agingRoles;
      c.oldestAgingDays = a.oldestAgingDays;
    }
    // Median + rank travel together or not at all: a median with no corpus context invites the
    // reader to invent a baseline, and a rank without its median hides what was ranked.
    if (a.attributed >= MIN_DATED_FOR_RANK && a.medianPostedDays != null && a.postedPercentile != null) {
      c.medianPostedDays = a.medianPostedDays;
      c.postedPercentile = a.postedPercentile;
    }
    // roleMix from ledger fn (US-open only) — public counts, not a quality score.
    if (a.roleMix && typeof a.roleMix === 'object' && !Array.isArray(a.roleMix)) {
      const mix = {};
      for (const [fn, n] of Object.entries(a.roleMix)) {
        if (Number.isSafeInteger(n) && n > 0) {
          mix[fn] = n;
          globalMix[fn] = (globalMix[fn] || 0) + n;
        }
      }
      if (Object.keys(mix).length) c.roleMix = mix;
    }
    enriched++;
  }
  if (map.coverage && typeof map.coverage === 'object') {
    map.coverage.roleAgingBasis =
      'observed* = days since Demigod first saw the role open on the public ATS board; ' +
      'agingRoles = board first_published date 90–365d (Greenhouse only); evergreen >365d excluded from aging.';
    map.coverage.roleAgingAt = asset.today || null;
    map.coverage.companiesWithObservedOpen = asset.companyCount || 0;
    map.coverage.companiesWithPostedAging = asset.companiesWithAgingRole || 0;
    if (Object.keys(globalMix).length) {
      map.coverage.roleMix = globalMix;
      map.coverage.roleMixBasis = 'open US-posted ledger roles; title-heuristic fn buckets';
    }
  }
  return enriched;
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const T = '2026-07-28';
  const role = (o) => ({ provider: 'Lever', slug: 'acme', company: 'Acme', usPosted: true, closedAt: null, firstSeen: '2026-07-01', ...o });
  const led = (rows) => ({ roles: Object.fromEntries(rows.map((r, i) => [`k${i}`, r])) });
  // observed basis (firstSeen): 2026-04-24 -> ~95d; 2026-06-01 -> ~57d; 2026-07-20 -> 8d
  const a = agingByBoard(led([
    role({ firstSeen: '2026-04-24' }), role({ firstSeen: '2026-06-01' }), role({ firstSeen: '2026-07-20' }),
  ]), T)['Lever|acme'];
  assert(a.openRoles === 3, 'counts all 3 open roles');
  assert(a.observed7 === 3, `observed7 all three (got ${a.observed7})`);
  assert(a.observed90 === 1 && a.observed60 === 1 && a.observed30 === 2, `observed buckets (got ${JSON.stringify(a)})`);
  assert(a.oldestObservedDays >= 94 && a.oldestObservedDays <= 96, `oldest observed ~95d (got ${a.oldestObservedDays})`);
  // posted basis: attributed (first_published) only; 90-365d = aging; >365d = evergreen (counted apart); non-attributed excluded
  const p = agingByBoard(led([
    role({ nativePostedAt: '2026-01-01', nativeDateField: 'first_published' }), // ~208d -> agingRoles
    role({ nativePostedAt: '2026-05-20', nativeDateField: 'first_published' }), // ~69d  -> attributed, not aging
    role({ nativePostedAt: '2019-01-01', nativeDateField: 'first_published' }), // ~7yr  -> evergreen, NOT aging
    role({ nativePostedAt: '2026-01-01', nativeDateField: 'created_at' }),      // NOT attributed -> excluded from posted
  ]), T)['Lever|acme'];
  assert(p.attributed === 3, 'only first_published-attributed roles count (created_at excluded)');
  assert(p.agingRoles === 1, `aging = posted 90-365d only (got ${JSON.stringify(p)})`);
  assert(p.evergreenRoles === 1, 'posted >365d counted as evergreen, not aging (no ghost overclaim)');
  assert(p.oldestAgingDays >= 205 && p.oldestAgingDays <= 212, `oldest aging ~208d, capped below evergreen (got ${p.oldestAgingDays})`);
  // HONESTY: closed roles and non-US-posted roles must NOT count at all
  const b = agingByBoard(led([
    role({ firstSeen: '2026-04-24', closedAt: '2026-07-20' }),
    role({ firstSeen: '2026-04-24', usPosted: false }),
    role({ firstSeen: '2026-04-24' }),
  ]), T)['Lever|acme'];
  assert(b.openRoles === 1 && b.observed90 === 1, 'closed + non-US-posted excluded');
  // join: a company with a resolvable board + open roles shows up; others do not
  const map = { companies: [{ name: 'Acme', atsSource: 'Lever', jobsUrl: 'https://jobs.lever.co/acme' }, { name: 'NoBoard', jobsUrl: '' }] };
  const dir = directoryAging(map, led([role({ firstSeen: '2026-04-24' })]), T);
  assert(dir.acme && dir.acme.openRoles === 1 && dir.acme.observed90 === 1, 'company with board+open roles joined');
  assert(!dir.noboard, 'company without a board is omitted (no fabricated aging)');
  // enrichMap: observed + posted aging; idempotent (clears stale)
  const em = {
    companies: [
      { name: 'Acme' },
      { name: 'Other', agingRoles: 9, oldestObservedDays: 99, observed7: 3 },
    ],
    coverage: {},
  };
  const asset = {
    today: T,
    companyCount: 1,
    companiesWithAgingRole: 1,
    companies: {
      acme: {
        openRoles: 5,
        agingRoles: 4,
        oldestAgingDays: 200,
        oldestObservedDays: 12,
        observed7: 3,
        observed30: 1,
        observed60: 0,
        observed90: 0,
      },
    },
  };
  const n = enrichMap(em, asset);
  assert(n === 1, 'one company enriched');
  assert(em.companies[0].agingRoles === 4 && em.companies[0].oldestAgingDays === 200, 'enrichMap adds posted aging');
  assert(em.companies[0].oldestObservedDays === 12 && em.companies[0].observed7 === 3, 'enrichMap adds observed span');
  assert(em.companies[0].ledgerOpenRoles === 5 && em.companies[0].observed30 === 1, 'ledger open + observed30');
  assert(!('agingRoles' in em.companies[1]) && !('oldestObservedDays' in em.companies[1]), 'clears stale on non-match');
  assert(/first (?:seen|saw)/i.test(em.coverage.roleAgingBasis || ''), 'coverage documents observed basis');
  // openRoles=0 board must not stamp phantom fields
  const empty = { companies: [{ name: 'Ghost' }], coverage: {} };
  enrichMap(empty, { companies: { ghost: { openRoles: 0, oldestObservedDays: 50 } }, companyCount: 0 });
  assert(!('oldestObservedDays' in empty.companies[0]), 'zero openRoles does not enrich');
  // --- median posting age + corpus rank ------------------------------------------------------
  {
    const fp = (d, extra = {}) => role({ nativePostedAt: d, nativeDateField: 'first_published', ...extra });
    // Median describes the board; oldestAgingDays is one outlier. Five roles, middle is 2026-04-01.
    const m = agingByBoard(led([
      fp('2026-07-01'), fp('2026-06-01'), fp('2026-04-01'), fp('2026-02-01'), fp('2025-01-01'),
    ]), T)['Lever|acme'];
    assert(m.attributed === 5, 'all five dated');
    assert(m.medianPostedDays === 118, `median is the middle posting, got ${m.medianPostedDays}`);
    assert(m.oldestAgingDays !== m.medianPostedDays, 'median must not collapse to the oldest outlier');
    assert(!('postedAges' in m), 'raw per-role ages must not ship in the asset');

    // Untrusted date fields cannot contribute to the median.
    const u = agingByBoard(led([
      fp('2026-04-01'),
      role({ nativePostedAt: '2020-01-01', nativeDateField: 'created_at' }),
      role({ nativePostedAt: null, nativeDateField: null }),
    ]), T)['Lever|acme'];
    assert(u.attributed === 1 && u.medianPostedDays === 118, `median from attributed only, got ${u.medianPostedDays}`);
    assert(u.openRoles === 3, 'but all three still count as open roles');

    // A board with no trusted date gets null, never a fabricated middle.
    const n = agingByBoard(led([role({ nativeDateField: 'created_at', nativePostedAt: '2020-01-01' })]), T)['Lever|acme'];
    assert(n.medianPostedDays === null, 'no attributed dates -> null median');

    // Rank: needs >= MIN_DATED_FOR_RANK, and thin boards must not set the baseline they are judged by.
    const mkMap = (slugs) => ({ companies: slugs.map((sl) => ({ name: sl, jobsUrl: `https://jobs.lever.co/${sl}`, atsSource: 'Lever' })) });
    const rows = [];
    for (let i = 0; i < 6; i += 1) rows.push(fp('2026-07-01', { slug: 'fresh', company: 'fresh' }));
    for (let i = 0; i < 6; i += 1) rows.push(fp('2024-07-01', { slug: 'stale', company: 'stale' }));
    rows.push(fp('2020-01-01', { slug: 'thin', company: 'thin' })); // 1 dated only
    const da = directoryAging(mkMap(['fresh', 'stale', 'thin']), led(rows), T);
    assert(da.fresh.postedPercentile === 0, `fresher board ranks 0, got ${da.fresh.postedPercentile}`);
    assert(da.stale.postedPercentile === 100, `staler board ranks 100, got ${da.stale.postedPercentile}`);
    assert(da.thin.postedPercentile === undefined || da.thin.postedPercentile === null,
      'a board under the rank threshold gets no percentile');

    // enrichMap stamps median and rank together, and only when rankable.
    const map = mkMap(['fresh', 'stale', 'thin']); // needs >=2 rankable boards: a rank against nothing is null
    enrichMap(map, buildAsset(map, led(rows), T));
    const f = map.companies.find((c) => c.name === 'fresh');
    const t = map.companies.find((c) => c.name === 'thin');
    assert(Number.isSafeInteger(f.medianPostedDays) && Number.isSafeInteger(f.postedPercentile),
      'rankable company carries both fields onto the map');
    assert(!('medianPostedDays' in t) && !('postedPercentile' in t),
      'thin company carries neither — no median without its context');

    // A LONE rankable board: median exists, but a rank against nothing does not. Neither field may
    // be stamped — a median with no corpus invites the reader to supply their own baseline.
    const soloMap = mkMap(['fresh', 'thin']);
    enrichMap(soloMap, buildAsset(soloMap, led(rows), T));
    const solo = soloMap.companies.find((c) => c.name === 'fresh');
    assert(!('medianPostedDays' in solo) && !('postedPercentile' in solo),
      'a single rankable board carries neither field — no rank means no median either');
  }

  console.log(JSON.stringify({ ok: true, selftest: 'directory-aging' }));
  process.exit(0);
}

if (isMain) {
  const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
  const mapPath = process.env.DEMIGOD_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(process.env.DEMIGOD_ROLE_LEDGER || path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json'), 'utf8'));
  const asset = buildAsset(map, ledger, today);
  if (process.argv.includes('--enrich-map')) {
    const n = enrichMap(map, asset); // map carries observed* + posted aging for the directory
    // Compact JSON — same style as jobs enrich (CDN-friendly).
    fs.writeFileSync(mapPath, `${JSON.stringify(map)}\n`);
    console.log(
      `enriched ${mapPath} · ${n} companies with ledger open roles · ` +
        `${asset.companiesWithAgingRole} with posted 90–365d aging · ` +
        `${asset.companiesWithObserved90} with observed≥90d`,
    );
    // Map is in research seal scope — enqueue reseal so export doesn't stay red forever.
    try {
      const row = enqueueReseal({ why: 'directory-aging --enrich-map' });
      console.log(`reseal-queue enqueued · ${row.at} · run: node demigod-reseal-queue.mjs run`);
    } catch (e) {
      console.log(`reseal-queue skip: ${e.message || e}`);
    }
  } else {
    const oi = process.argv.indexOf('--out');
    const out = oi >= 0 && process.argv[oi + 1] ? process.argv[oi + 1] : path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json');
    fs.writeFileSync(out, JSON.stringify(asset));
    console.log(`wrote ${out} · ${asset.companyCount} companies with open roles · ${asset.companiesWithAgingRole} with a role posted 90-365d ago (still open)`);
  }
}
