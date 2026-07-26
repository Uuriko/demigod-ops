#!/usr/bin/env node
// Role first-seen ledger — tracks each SF-startup ATS role's lifetime (firstSeen → lastSeen → closed)
// so we can honestly say "this role has been observed open ≥ N days." Foundation for the role-truth
// tool + sharper Pulse findings. Spec: prompts/demigod/role-ledger-build-spec.md.
//
// TWO HONESTY INVARIANTS (the whole point):
//   1. observedOpenDays uses firstSeen (OUR first observation) — never a board's date. A separate,
//      attributed postedDaysAgo carries the board's real posting date (Greenhouse first_published only).
//   2. A role is closed ONLY by a SUCCESSFUL board fetch that omits it. A failed/timed-out fetch
//      touches nothing — a flaky network must never manufacture "role closed".
//
//   node demigod-role-ledger.mjs poll        # fetch 399 boards, upsert ledger (atomic, locked)
//   node demigod-role-ledger.mjs report [--days 30] [--fn engineering] [--json]
//   node demigod-role-ledger.mjs --selftest
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categorizeRole, isUsPostedLocation } from './demigod-startup-jobs-enrich.mjs';
import { readJson, atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';
import { NEW_PROVIDERS } from './demigod-ats-providers.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const LEDGER = process.env.DEMIGOD_ROLE_LEDGER || path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const SCHEMA = 'demigod.role-ledger/1';
const RETENTION_DAYS = 180;
const TIMEOUT = 8000;
const CONCURRENCY = 12;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const roleKey = (provider, slug, jobId) => `${provider}|${slug}|${jobId}`;
const toDate = (x) => { if (x == null) return null; const d = typeof x === 'number' ? new Date(x) : new Date(String(x)); return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const observedOpenDays = (row, today) => daysBetween(row.firstSeen, today);
// Attributed posting age — ONLY where the native field is a real posting date (Greenhouse first_published).
export const postedDaysAgo = (row, today) => (row.nativePostedAt && row.nativeDateField === 'first_published') ? daysBetween(row.nativePostedAt, today) : null;

// ---- core: pure, deterministic given `today`; no clock, no network. All honesty logic lives here. ----
export function upsertLedger(prev, polledBoards, today) {
  const next = {};
  for (const [k, v] of Object.entries(prev?.roles || {})) next[k] = { ...v };
  // Pass 1: upsert all polled roles; accumulate seen keys PER board-prefix, UNIONED across duplicate
  // board entries in one poll (a slug collision emitting the same prefix twice) — so an empty board
  // can't close a role that a sibling board with the same prefix populated in the same poll (no flap).
  const seenByPrefix = new Map(); // prefix → Set(roleKey); only prefixes fetched ok appear here
  for (const board of polledBoards || []) {
    if (!board.ok) continue; // INVARIANT 2: a failed fetch closes nothing, touches nothing.
    const prefix = `${board.provider}|${board.slug}|`;
    let seen = seenByPrefix.get(prefix);
    if (!seen) seenByPrefix.set(prefix, (seen = new Set()));
    for (const r of board.roles || []) {
      const key = roleKey(board.provider, board.slug, r.jobId);
      seen.add(key);
      const ex = next[key];
      const disp = { title: r.title || '', location: r.location || '', url: r.url || '' };
      if (!ex) {
        next[key] = {
          provider: board.provider, slug: board.slug, jobId: String(r.jobId),
          company: board.company || '', ...disp,
          fn: categorizeRole(disp.title), usPosted: isUsPostedLocation(disp.location),
          firstSeen: today, lastSeen: today, closedAt: null, reopenCount: 0,
          nativePostedAt: r.nativePostedAt || null, nativeDateField: r.nativeDateField || null,
        };
      } else {
        if (ex.closedAt) { ex.closedAt = null; ex.reopenCount = (ex.reopenCount || 0) + 1; } // reopened
        ex.lastSeen = today; // firstSeen is MONOTONIC — never touched (INVARIANT 1)
        if (!ex.nativePostedAt && r.nativePostedAt) { ex.nativePostedAt = r.nativePostedAt; ex.nativeDateField = r.nativeDateField || null; } // backfill only; never overwrite the earliest captured date
        if (disp.title) ex.title = disp.title;
        if (disp.location) { ex.location = disp.location; ex.usPosted = isUsPostedLocation(disp.location); }
        if (disp.url) ex.url = disp.url;
        ex.fn = categorizeRole(ex.title);
      }
    }
  }
  // Pass 2: ONE scan (O(roles), not O(boards×roles)) — close an open role iff its board was fetched ok
  // this poll (its prefix is present) and the role wasn't among the seen keys.
  for (const [key, row] of Object.entries(next)) {
    if (row.closedAt) continue;
    const seen = seenByPrefix.get(key.slice(0, key.lastIndexOf('|') + 1));
    if (seen && !seen.has(key)) row.closedAt = today;
  }
  return { schema: SCHEMA, updatedAt: today, roles: next };
}

// Drop long-closed roles (log the count — no silent caps).
export function pruneClosed(ledger, today, retentionDays = RETENTION_DAYS) {
  const roles = {}; let pruned = 0;
  for (const [k, r] of Object.entries(ledger.roles || {})) {
    if (r.closedAt && daysBetween(r.closedAt, today) > retentionDays) { pruned++; continue; }
    roles[k] = r;
  }
  return { ledger: { ...ledger, roles }, pruned };
}

export function summarize(ledger, today) {
  const rows = Object.values(ledger.roles || {});
  const open = rows.filter((r) => !r.closedAt);
  return {
    total: rows.length, open: open.length,
    closedToday: rows.filter((r) => r.closedAt === today).length,
    aging30: open.filter((r) => observedOpenDays(r, today) >= 30).length,
    aging60: open.filter((r) => observedOpenDays(r, today) >= 60).length,
  };
}

// basis 'observed' = our first-seen age (accrues over daily polls; the conservative headline metric).
// basis 'posted'   = the board's own posting date, ATTRIBUTED, Greenhouse first_published only —
//   usable day 1. Roles older than evergreenDays (likely perennial talent-pool posts, not stuck
//   vacancies) are excluded from the aging list and counted separately, honestly.
export function report(ledger, { days = 30, fn = '', usOnly = true, today, basis = 'observed', evergreenDays = 365 } = {}) {
  const ageOf = (r) => (basis === 'posted' ? postedDaysAgo(r, today) : observedOpenDays(r, today));
  let rows = Object.values(ledger.roles || {})
    .filter((r) => !r.closedAt)
    .filter((r) => (usOnly ? r.usPosted : true))
    .filter((r) => (fn ? r.fn === fn : true))
    .map((r) => ({ ...r, observedOpenDays: observedOpenDays(r, today), postedDaysAgo: postedDaysAgo(r, today), age: ageOf(r) }))
    .filter((r) => r.age != null && r.age >= days);
  let evergreen = 0;
  if (basis === 'posted') { const keep = rows.filter((r) => r.age <= evergreenDays); evergreen = rows.length - keep.length; rows = keep; }
  rows.sort((a, b) => b.age - a.age);
  const openAll = Object.values(ledger.roles || {}).filter((r) => !r.closedAt && (usOnly ? r.usPosted : true));
  const ghost = openAll.length ? Math.round((100 * openAll.filter((r) => observedOpenDays(r, today) >= 60).length) / openAll.length) : 0;
  const byFn = {}; for (const r of rows) byFn[r.fn] = (byFn[r.fn] || 0) + 1;
  return { agingRoles: rows, openUsRoles: openAll.length, ghostRatePct: ghost, byFunction: byFn, days, basis, evergreenExcluded: evergreen };
}

// ---- board fetch (I/O; ok:true ONLY on a valid parsed job array, else ok:false → closes nothing) ----
async function fetchJson(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
// SmartRecruiters/Workable/Recruitee/Personio come from the shared module; the original 3 are inline.
const SUBDOMAIN_ATS = new Set(['Recruitee', 'Personio']); // slug lives in the hostname, not the path
const POLLERS = {
  ...NEW_PROVIDERS,
  Greenhouse: async (slug) => {
    const d = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
    if (!d || !Array.isArray(d.jobs)) return { ok: false, roles: [] };
    return { ok: true, roles: d.jobs.map((j) => ({ jobId: String(j.id), title: j.title || '', location: j.location?.name || '', url: j.absolute_url || '', nativePostedAt: toDate(j.first_published), nativeDateField: 'first_published' })) };
  },
  Lever: async (slug) => {
    const d = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!Array.isArray(d)) return { ok: false, roles: [] };
    return { ok: true, roles: d.map((p) => ({ jobId: String(p.id), title: p.text || '', location: p.categories?.location || '', url: p.hostedUrl || '', nativePostedAt: toDate(p.createdAt), nativeDateField: 'createdAt' })) };
  },
  Ashby: async (slug) => {
    const d = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    if (!d || !Array.isArray(d.jobs)) return { ok: false, roles: [] };
    return { ok: true, roles: d.jobs.map((j) => ({ jobId: String(j.id), title: j.title || '', location: typeof j.location === 'string' ? j.location : '', url: j.jobUrl || '', nativePostedAt: toDate(j.publishedAt), nativeDateField: 'publishedAt' })) };
  },
};

export function boardsFromMap(map) {
  const out = [];
  for (const c of map?.companies || []) {
    if (!c.atsSource || !c.jobsUrl || !POLLERS[c.atsSource]) continue;
    let slug = '';
    try {
      const u = new URL(c.jobsUrl);
      slug = SUBDOMAIN_ATS.has(c.atsSource) ? (u.hostname.split('.')[0] || '') : (u.pathname.split('/').filter(Boolean).pop() || '');
    } catch { continue; }
    if (slug) out.push({ provider: c.atsSource, slug, company: c.name || '' });
  }
  return out;
}

async function pool(items, worker) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); } }));
  return out;
}

// ---- selftest: each honesty invariant proven fail-capable (broken control must flip the result) ----
if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const T0 = '2026-07-01', T1 = '2026-07-20';
  const board = (ok, roles) => [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok, roles }];
  const R = (jobId, extra = {}) => ({ jobId, title: 'Senior Backend Engineer', location: 'San Francisco, CA', url: 'u', ...extra });

  // seed one open role
  let L = upsertLedger(null, board(true, [R('1')]), T0);
  const k = 'Greenhouse|acme|1';
  assert(L.roles[k] && L.roles[k].firstSeen === T0 && L.roles[k].closedAt === null, 'seed: role open, firstSeen set');
  assert(L.roles[k].fn === 'engineering' && L.roles[k].usPosted === true, 'seed: fn + usPosted via reuse');

  // INVARIANT 2 — failed fetch closes nothing (+ control: successful absence DOES close)
  const failed = upsertLedger(L, board(false, []), T1);
  assert(failed.roles[k].closedAt === null && failed.roles[k].lastSeen === T0, 'failed fetch: role stays open, lastSeen unchanged');
  const control = upsertLedger(L, board(true, []), T1); // successful fetch WITHOUT the role
  assert(control.roles[k].closedAt === T1, 'CONTROL: successful absence DOES close (proves test can fail)');

  // INVARIANT 1 — firstSeen monotonic; observedOpenDays from firstSeen not native date
  const reobs = upsertLedger(L, board(true, [R('1', { nativePostedAt: '2025-01-01', nativeDateField: 'first_published' })]), T1);
  assert(reobs.roles[k].firstSeen === T0 && reobs.roles[k].lastSeen === T1, 'firstSeen monotonic; lastSeen advances');
  assert(observedOpenDays(reobs.roles[k], T1) === 19, 'observedOpenDays from firstSeen (19d), NOT native 2025 date');
  assert(postedDaysAgo(reobs.roles[k], T1) > 500, 'postedDaysAgo separate + attributed (native first_published)');

  // reopen — closed then reappears
  const reopened = upsertLedger(control, board(true, [R('1')]), '2026-07-25');
  assert(reopened.roles[k].closedAt === null && reopened.roles[k].reopenCount === 1 && reopened.roles[k].firstSeen === T0, 'reopen: closedAt cleared, reopenCount++, firstSeen kept');

  // duplicate board (slug collision) in ONE poll: an empty sibling must NOT close/flap a role another
  // sibling with the same prefix populated (order-independent — empty listed first here).
  const dup = upsertLedger(L, [{ provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok: true, roles: [] }, { provider: 'Greenhouse', slug: 'acme', company: 'Acme', ok: true, roles: [R('1')] }], '2026-07-28');
  assert(dup.roles[k].closedAt === null && dup.roles[k].reopenCount === 0, 'dup board same poll: empty sibling does not close/flap the populated role');

  // no PII / allowed shape only
  const allowed = new Set(['provider', 'slug', 'jobId', 'company', 'title', 'location', 'url', 'fn', 'usPosted', 'firstSeen', 'lastSeen', 'closedAt', 'reopenCount', 'nativePostedAt', 'nativeDateField']);
  assert(Object.keys(L.roles[k]).every((key) => allowed.has(key)), 'row has no fields outside the allowed (no PII)');

  // degenerate — empty map → empty; all-failed poll must NOT wipe state (vacuous-green guard)
  assert(Object.keys(upsertLedger(null, [], T0).roles).length === 0, 'empty poll → empty ledger, no crash');
  assert(boardsFromMap({ companies: [] }).length === 0, 'empty map → no boards');
  assert(boardsFromMap({ companies: [{ name: 'A', atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/acme' }] })[0]?.slug === 'acme', 'boardsFromMap: path-provider slug from pathname');
  assert(boardsFromMap({ companies: [{ name: 'B', atsSource: 'Recruitee', jobsUrl: 'https://bco.recruitee.com' }] })[0]?.slug === 'bco', 'boardsFromMap: subdomain-provider slug from hostname (not empty path)');
  assert(Object.keys(upsertLedger(L, board(false, []), T1).roles).length === 1, 'all-failed poll preserves existing roles (not wiped)');

  // prune
  const old = { schema: SCHEMA, updatedAt: T0, roles: { x: { closedAt: '2026-01-01', firstSeen: '2025-12-01' } } };
  assert(pruneClosed(old, '2026-07-20').pruned === 1, 'prune drops long-closed role');

  // report shape
  const rep = report(reobs, { days: 10, today: T1 });
  assert(rep.agingRoles.length === 1 && rep.agingRoles[0].observedOpenDays === 19, 'report lists aging role w/ observedOpenDays');
  console.log(JSON.stringify({ ok: true, selftest: 'role-ledger' }));
  process.exit(0);
}

if (isMain) {
  const cmd = process.argv[2];
  const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
  if (cmd === 'poll') {
    const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
    const boards = boardsFromMap(map);
    const polled = await pool(boards, async (b) => { const r = await POLLERS[b.provider](b.slug); return { provider: b.provider, slug: b.slug, company: b.company, ok: r.ok, roles: r.roles }; });
    let summary, pruned = 0;
    withFileLock(`${LEDGER}.lock`, () => {
      const prev = readJson(LEDGER) || null;
      const up = upsertLedger(prev, polled, today);
      const pc = pruneClosed(up, today); pruned = pc.pruned;
      atomicWrite(LEDGER, JSON.stringify(pc.ledger) + '\n', { mode: 0o600 }); // compact — 13k+ roles, daily-changing local SoR (gitignored, re-pollable)
      summary = summarize(pc.ledger, today);
    });
    console.log(JSON.stringify({ ok: true, today, boards: boards.length, ok_fetches: polled.filter((p) => p.ok).length, failed: polled.filter((p) => !p.ok).length, pruned, ...summary }, null, 2));
  } else if (cmd === 'report') {
    const arg = (f, d) => { const i = process.argv.indexOf(f); const v = i > 0 ? process.argv[i + 1] : d; return (typeof v === 'string' && v.startsWith('--')) ? d : v; }; // reject a following flag as a value
    const basis = process.argv.includes('--posted') ? 'posted' : 'observed';
    const ledger = readJson(LEDGER) || { schema: SCHEMA, roles: {} };
    const dv = Number(arg('--days', 30));
    const rep = report(ledger, { days: Number.isFinite(dv) ? dv : 30, fn: arg('--fn', ''), today, basis });
    if (process.argv.includes('--json')) { console.log(JSON.stringify(rep, null, 2)); }
    else {
      const label = basis === 'posted' ? 'posted per board (attributed, Greenhouse)' : 'observed-open';
      console.log(`SF startup roles ${label} ≥${rep.days}d — ${rep.agingRoles.length} roles${rep.evergreenExcluded ? ` (+${rep.evergreenExcluded} evergreen >365d flagged separately)` : ''} · ghost-rate(observed≥60d) ${rep.ghostRatePct}% of ${rep.openUsRoles} US-posted open · by fn ${JSON.stringify(rep.byFunction)}`);
      for (const r of rep.agingRoles.slice(0, 40)) console.log(`  ${String(r.age).padStart(3)}d ${basis === 'posted' ? 'posted' : 'obs'}  ${r.company} — ${r.title}`.slice(0, 110));
    }
  } else {
    console.log('usage: demigod-role-ledger.mjs poll | report [--days N] [--fn F] [--json] | --selftest');
    process.exit(1);
  }
}
