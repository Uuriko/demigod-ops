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
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const norm = (s) => String(s || '').toLowerCase().trim();

// PURE: roll open+US-posted ledger roles up per board key ("provider|slug"), on TWO honest bases:
//  - observed*: days since DEMIGOD first saw the role open (firstSeen). Honest but young — grows over time.
//  - posted*:   days since the role's own board posting date, ATTRIBUTED (Greenhouse first_published only,
//               so postedDaysAgo returns null otherwise). Real signal from day one, for the attributed subset.
// Closed roles and non-US-posted roles are excluded from both.
export function agingByBoard(ledger, today) {
  const byBoard = {};
  for (const r of Object.values(ledger?.roles || {})) {
    if (r.closedAt || !r.usPosted) continue;
    const key = `${r.provider}|${r.slug}`;
    const b = byBoard[key] || (byBoard[key] = {
      openRoles: 0, oldestObservedDays: 0, observed30: 0, observed60: 0, observed90: 0,
      attributed: 0, agingRoles: 0, evergreenRoles: 0, oldestAgingDays: 0,
    });
    b.openRoles++;
    const od = observedOpenDays(r, today);
    if (od >= 0) {
      if (od > b.oldestObservedDays) b.oldestObservedDays = od;
      if (od >= 30) b.observed30++;
      if (od >= 60) b.observed60++;
      if (od >= 90) b.observed90++;
    }
    const pd = postedDaysAgo(r, today); // null unless the board date is attributed (first_published)
    if (pd != null && pd >= 0) {
      b.attributed++;
      // >365d = perennial / talent-pool posting (e.g. "Join our talent community"), not a stuck vacancy.
      if (pd > 365) b.evergreenRoles++;
      else if (pd >= 90) { b.agingRoles++; if (pd > b.oldestAgingDays) b.oldestAgingDays = pd; }
    }
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

// Enrich map companies in place with the aging count the directory renderer shows. Idempotent: clears
// stale aging on companies that no longer qualify, so re-running never leaves phantom badges.
export function enrichMap(map, asset) {
  const byName = asset.companies || {};
  let enriched = 0;
  for (const c of map.companies || []) {
    const a = byName[norm(c.name)];
    if (a && a.agingRoles > 0) { c.agingRoles = a.agingRoles; c.oldestAgingDays = a.oldestAgingDays; enriched++; }
    else if ('agingRoles' in c) { delete c.agingRoles; delete c.oldestAgingDays; }
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
  // enrichMap: adds agingRoles to matching companies; idempotent (clears stale)
  const em = { companies: [{ name: 'Acme' }, { name: 'Other', agingRoles: 9 }] };
  const asset = { companies: { acme: { agingRoles: 4, oldestAgingDays: 200 } } };
  enrichMap(em, asset);
  assert(em.companies[0].agingRoles === 4 && em.companies[0].oldestAgingDays === 200, 'enrichMap adds aging by normalized name');
  assert(!('agingRoles' in em.companies[1]), 'enrichMap clears stale aging on non-matching company (idempotent)');
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
    const n = enrichMap(map, asset); // map object now carries per-company agingRoles
    fs.writeFileSync(mapPath, JSON.stringify(map));
    console.log(`enriched ${mapPath} · ${n} companies tagged with an aging-role count (posted 90-365d)`);
  } else {
    const oi = process.argv.indexOf('--out');
    const out = oi >= 0 && process.argv[oi + 1] ? process.argv[oi + 1] : path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json');
    fs.writeFileSync(out, JSON.stringify(asset));
    console.log(`wrote ${out} · ${asset.companyCount} companies with open roles · ${asset.companiesWithAgingRole} with a role posted 90-365d ago (still open)`);
  }
}
