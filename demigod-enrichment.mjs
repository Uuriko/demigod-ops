#!/usr/bin/env node
/**
 * demigod-enrichment — scoreboard + offline reclassify + batch pipeline.
 *
 * Exhaustive feature inventory: docs/die/ENRICHMENT-FEATURES.md
 *
 *   node demigod-enrichment.mjs scoreboard
 *   node demigod-enrichment.mjs boards     # AR-28 coverage receipt (no new scrapers)
 *   node demigod-enrichment.mjs reclassify
 *   node demigod-enrichment.mjs batch [--skip-poll] [--skip-import] [--apply-import]
 *   node demigod-enrichment.mjs --selftest
 *
 * Never invents contacts, scores, fees, or Phase 2 product.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { categorizeRole, isRemoteLocation } from './demigod-startup-jobs-enrich.mjs';
import { boardActivityInsightFromLedger } from './demigod-hiring-pulse.mjs';
import { observedOpenDays, postedDaysAgo } from './demigod-role-ledger.mjs';
import { seniorityFromTitle } from './demigod-recruitai-export.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const LEDGER_PATH = path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const AGING_PATH = path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json');
const SCOREBOARD_PATH = path.join(BUSY, 'enrichment-scoreboard.json');
const BOARDS_PATH = path.join(BUSY, 'ats-board-coverage.json');
const SCHEMA = 'demigod.enrichment-scoreboard/2';
const BOARDS_SCHEMA = 'demigod.ats-board-coverage/1';

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/**
 * Offline honesty: count open roles whose stored fn ≠ live categorizeRole(title).
 * Pure — never mutates. Used by scoreboard + control-board after AR-08 classifier batches.
 */
export function measureLedgerFnDrift(ledger) {
  const roles = ledger?.roles;
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) {
    return { open: 0, drift: 0, otherOpen: 0, otherShare: 0, byFromTo: {} };
  }
  let open = 0;
  let drift = 0;
  let otherOpen = 0;
  const byFromTo = {};
  for (const r of Object.values(roles)) {
    if (!r || typeof r !== 'object' || r.closedAt) continue;
    open++;
    const live = categorizeRole(r.title);
    const stored = String(r.fn || 'other');
    if (stored === 'other') otherOpen++;
    if (stored !== live) {
      drift++;
      const k = `${stored}→${live}`;
      byFromTo[k] = (byFromTo[k] || 0) + 1;
    }
  }
  return {
    open,
    drift,
    otherOpen,
    otherShare: open ? Math.round((otherOpen / open) * 1000) / 1000 : 0,
    byFromTo,
  };
}

/**
 * Apify/unified-schema honesty: open-role counts by nativeDateField.
 * Only first_published is attributed for postedDaysAgo (Greenhouse); createdAt/publishedAt are stamps.
 * Pure — never mutates. Never a posting-age claim by itself.
 */
export function measureNativeDateFieldLandscape(ledger) {
  const roles = ledger?.roles;
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) {
    return {
      open: 0,
      withNativePostedAt: 0,
      attributablePosted: 0,
      byNativeDateField: [],
      basis:
        'only nativeDateField=first_published feeds attributed posting age; other fields are board stamps',
    };
  }
  let open = 0;
  let withNative = 0;
  let attributable = 0;
  const by = {};
  for (const r of Object.values(roles)) {
    if (!r || typeof r !== 'object' || r.closedAt) continue;
    open++;
    if (!r.nativePostedAt) continue;
    withNative++;
    const field = String(r.nativeDateField || 'unknown').slice(0, 40) || 'unknown';
    by[field] = (by[field] || 0) + 1;
    if (field === 'first_published') attributable++;
  }
  const byNativeDateField = Object.entries(by)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([field, n]) => ({ field, n }));
  return {
    open,
    withNativePostedAt: withNative,
    attributablePosted: attributable,
    byNativeDateField,
    basis:
      'only nativeDateField=first_published feeds attributed posting age; other fields are board stamps',
  };
}

/**
 * AR-25-thin: open-role observed-age landscape from firstSeen only (not board post date).
 * Counts by day buckets — honesty for ≥7/≥30 badges without thrashing poll.
 * Never a ghost-job rate product or company rank.
 */
export function measureObservedAgeLandscape(ledger, { today } = {}) {
  const day = today || new Date().toISOString().slice(0, 10);
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byBucket = {
    '0d': 0,
    '1-2d': 0,
    '3-6d': 0,
    '7-13d': 0,
    '14-29d': 0,
    '30d+': 0,
    withoutFirstSeen: 0,
  };
  let maxDays = 0;
  let ge7 = 0;
  let ge30 = 0;
  let withFirstSeen = 0;
  for (const r of open) {
    if (!r.firstSeen) {
      byBucket.withoutFirstSeen += 1;
      continue;
    }
    const d = observedOpenDays(r, day);
    if (!Number.isFinite(d) || d < 0) {
      byBucket.withoutFirstSeen += 1;
      continue;
    }
    withFirstSeen += 1;
    if (d > maxDays) maxDays = d;
    if (d >= 7) ge7 += 1;
    if (d >= 30) ge30 += 1;
    let b = '30d+';
    if (d <= 0) b = '0d';
    else if (d <= 2) b = '1-2d';
    else if (d <= 6) b = '3-6d';
    else if (d <= 13) b = '7-13d';
    else if (d <= 29) b = '14-29d';
    byBucket[b] += 1;
  }
  const openN = open.length;
  return {
    open: openN,
    withFirstSeen,
    withoutFirstSeen: byBucket.withoutFirstSeen,
    maxDays,
    ge7,
    ge30,
    byBucket,
    basis:
      'firstSeen observation days only (observedOpenDays); not board posted age; ge7/ge30 badge readiness counts — not ghost-job scores',
  };
}

/** Calendar days since lastSeen re-observation (day stamps); null if missing/invalid. */
export function daysSinceLastSeen(row, today) {
  const ls = row?.lastSeen;
  const day = today || new Date().toISOString().slice(0, 10);
  if (!ls || !day) return null;
  // Reuse firstSeen-day arithmetic: lastSeen is the same day-stamp domain.
  const d = observedOpenDays({ firstSeen: ls }, day);
  return Number.isFinite(d) ? d : null;
}

/**
 * TheirStack / poll residual — open-role lastSeen re-observation landscape (counts only).
 * Days since last successful board re-see (lastSeen advances on poll hit; stalls on fetch hold).
 * Complements ledger.observedAge (firstSeen span) — not board posted age or ghost-job %.
 */
export function measureLastSeenLandscape(ledger, { today } = {}) {
  const day = today || new Date().toISOString().slice(0, 10);
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byBucket = {
    '0d': 0,
    '1-2d': 0,
    '3-6d': 0,
    '7-13d': 0,
    '14-29d': 0,
    '30d+': 0,
    withoutLastSeen: 0,
  };
  let maxDays = 0;
  let ge1 = 0;
  let ge3 = 0;
  let ge7 = 0;
  let withLastSeen = 0;
  const byProviderStale = Object.create(null);
  const byCompanyStale = Object.create(null);
  for (const r of open) {
    const d = daysSinceLastSeen(r, day);
    if (d == null || d < 0) {
      byBucket.withoutLastSeen += 1;
      continue;
    }
    withLastSeen += 1;
    if (d > maxDays) maxDays = d;
    if (d >= 1) ge1 += 1;
    if (d >= 3) ge3 += 1;
    if (d >= 7) ge7 += 1;
    let b = '30d+';
    if (d <= 0) b = '0d';
    else if (d <= 2) b = '1-2d';
    else if (d <= 6) b = '3-6d';
    else if (d <= 13) b = '7-13d';
    else if (d <= 29) b = '14-29d';
    byBucket[b] += 1;
    if (d >= 3) {
      const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
      byProviderStale[p] = (byProviderStale[p] || 0) + 1;
      const co = String(r.company || 'unknown').slice(0, 80) || 'unknown';
      byCompanyStale[co] = (byCompanyStale[co] || 0) + 1;
    }
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    withLastSeen,
    withoutLastSeen: byBucket.withoutLastSeen,
    maxDays,
    ge1,
    ge3,
    ge7,
    ge3Share: openN ? Number((ge3 / openN).toFixed(4)) : 0,
    byBucket,
    byProviderStale: rank(byProviderStale, 'provider'),
    byCompanyStaleTop: rank(byCompanyStale, 'company'),
    basis:
      'open-role lastSeen day lag only (days since last poll re-see); ge3/ge7 stale re-observation counts + provider/company tops; anomaly grace may hold lastSeen — not ghost-job %, fill rate, or demand (see ledger.observedAge for firstSeen span)',
  };
}

/**
 * Levels/Coresignal residual — open-role board posted-age landscape.
 * Only nativeDateField=first_published (postedDaysAgo); createdAt/publishedAt stamps excluded.
 * Counts only — agingRoles (90–365d) + evergreen (>365d) mirror directory-aging honesty; not ghost-job %.
 */
export function measurePostedAgeLandscape(ledger, { today } = {}) {
  const day = today || new Date().toISOString().slice(0, 10);
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byBucket = {
    '0-6d': 0,
    '7-29d': 0,
    '30-89d': 0,
    '90-365d': 0,
    '365d+': 0,
  };
  let attributable = 0;
  let withoutAttributed = 0;
  let maxDays = 0;
  let agingRoles = 0; // 90–365d (directory-aging parity)
  let evergreenRoles = 0; // >365d perennial/talent-pool
  for (const r of open) {
    const pd = postedDaysAgo(r, day);
    if (pd == null || !Number.isFinite(pd) || pd < 0) {
      withoutAttributed += 1;
      continue;
    }
    attributable += 1;
    if (pd > maxDays) maxDays = pd;
    if (pd > 365) evergreenRoles += 1;
    else if (pd >= 90) agingRoles += 1;
    let b = '365d+';
    if (pd <= 6) b = '0-6d';
    else if (pd <= 29) b = '7-29d';
    else if (pd <= 89) b = '30-89d';
    else if (pd <= 365) b = '90-365d';
    byBucket[b] += 1;
  }
  const openN = open.length;
  return {
    open: openN,
    attributable,
    withoutAttributed,
    maxDays,
    agingRoles,
    evergreenRoles,
    byBucket,
    basis:
      'postedDaysAgo only when nativeDateField=first_published; stamps (createdAt/publishedAt) excluded; agingRoles=90–365d, evergreen=>365d — not ghost-job rates',
  };
}

/**
 * Ashby/LinkedIn-insights residual — open-role seniority landscape from titles only.
 * Reuses export seniorityFromTitle buckets. Counts only — not leveling scores or IC/manager ratios as product.
 */
export function measureSeniorityLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const bySeniority = Object.create(null);
  const byFnSenior = Object.create(null); // eng-only top for honesty on IC depth, still counts
  for (const r of open) {
    const s = seniorityFromTitle(r.title) || 'unspecified';
    bySeniority[s] = (bySeniority[s] || 0) + 1;
    if ((r.fn || '') === 'engineering') {
      byFnSenior[s] = (byFnSenior[s] || 0) + 1;
    }
  }
  const rank = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([seniority, n]) => ({ seniority, n }));
  const openN = open.length;
  const unspecified = bySeniority.unspecified || 0;
  return {
    open: openN,
    unspecified,
    specified: openN - unspecified,
    bySeniority: rank(bySeniority),
    byEngineeringSeniority: rank(byFnSenior),
    basis:
      'title-heuristic seniorityFromTitle buckets only; unspecified is not mid-level; not a leveling or org-design score',
  };
}

/**
 * Apify/ATS residual — open-role workplace landscape from location text only.
 * Exclusive buckets: hybrid > remote > onsite > unspecified > empty.
 * Counts only — never invents workplace from city names alone; not a remote-rate score.
 */
export function measureWorkplaceLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let remote = 0;
  let hybrid = 0;
  let onsite = 0;
  let unspecified = 0;
  let empty = 0;
  const byProviderRemote = Object.create(null);
  const byFnRemote = Object.create(null);
  for (const r of open) {
    const loc = String(r.location || '').trim();
    const t = loc.toLowerCase();
    let bucket = 'unspecified';
    if (!loc) bucket = 'empty';
    else if (/\bhybrid\b/.test(t)) bucket = 'hybrid';
    else if (isRemoteLocation(loc)) bucket = 'remote';
    else if (/\b(on-?site|in[- ]office|office[- ]based)\b/.test(t)) bucket = 'onsite';
    if (bucket === 'remote') {
      remote += 1;
      const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
      const fn = String(r.fn || 'other').slice(0, 40) || 'other';
      byProviderRemote[p] = (byProviderRemote[p] || 0) + 1;
      byFnRemote[fn] = (byFnRemote[fn] || 0) + 1;
    } else if (bucket === 'hybrid') hybrid += 1;
    else if (bucket === 'onsite') onsite += 1;
    else if (bucket === 'empty') empty += 1;
    else unspecified += 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    remote,
    hybrid,
    onsite,
    unspecified,
    empty,
    remoteShare: openN ? Number((remote / openN).toFixed(4)) : 0,
    byProviderRemote: rank(byProviderRemote, 'provider'),
    byFnRemote: rank(byFnRemote, 'fn'),
    basis:
      'location-text exclusive buckets (hybrid>remote>onsite>unspecified>empty); city-only is unspecified; not a remote-rate product score',
  };
}

/**
 * AR-27-thin: open-role agency-policy evidence landscape as counts only.
 * Positive-only supported quotes — never invent no-agency from silence.
 */
export function measureAgencyPolicyLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let withPolicy = 0;
  const byProvider = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of open) {
    if (r.agencyPolicyEvidence?.status !== 'supported') continue;
    withPolicy += 1;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    byProvider[p] = (byProvider[p] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    withPolicy,
    withoutPolicy: openN - withPolicy,
    share: openN ? Number((withPolicy / openN).toFixed(4)) : 0,
    byProvider: rank(byProvider, 'provider'),
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'positive-only supported no_unsolicited_agency evidence on open roles; silence is not evidence',
  };
}

/**
 * TheirStack residual — open roles that reappeared after a successful board omit (reopenCount).
 * Counts only — reopens are board reappearances, never filled/hired or quality scores.
 */
export function measureReopenLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let withReopen = 0;
  let reopenEvents = 0;
  const byProvider = Object.create(null);
  const byCompany = Object.create(null);
  const byCount = Object.create(null);
  for (const r of open) {
    const n = Number(r.reopenCount) || 0;
    if (!Number.isFinite(n) || n <= 0) continue;
    withReopen += 1;
    reopenEvents += n;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    const k = String(Math.min(Math.floor(n), 5)); // cap bucket key 1..5+
    const bucket = n >= 5 ? '5+' : k;
    byProvider[p] = (byProvider[p] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
    byCount[bucket] = (byCount[bucket] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    withReopen,
    withoutReopen: openN - withReopen,
    reopenEvents,
    share: openN ? Number((withReopen / openN).toFixed(4)) : 0,
    byProvider: rank(byProvider, 'provider'),
    byCompanyTop: rank(byCompany, 'company'),
    byReopenCount: rank(byCount, 'reopenCount'),
    basis:
      'reopenCount increments when a previously closed role reappears on a successful poll; exits≠filled; not a quality or churn score',
  };
}

/**
 * TheirStack residual — lifetime closed-role landscape (board omit after successful poll).
 * Counts only — closed ≠ filled/hired; complements windowed boardActivity.closedInWindow.
 */
export function measureClosedLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  let open = 0;
  let closed = 0;
  const byProvider = Object.create(null);
  const byFn = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of roles) {
    if (!r || typeof r !== 'object') continue;
    if (!r.closedAt) {
      open += 1;
      continue;
    }
    closed += 1;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const fn = String(r.fn || 'other').slice(0, 40) || 'other';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    byProvider[p] = (byProvider[p] || 0) + 1;
    byFn[fn] = (byFn[fn] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const total = open + closed;
  return {
    total,
    open,
    closed,
    share: total ? Number((closed / total).toFixed(4)) : 0,
    byProvider: rank(byProvider, 'provider'),
    byFn: rank(byFn, 'fn'),
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'closedAt set only after successful poll omit; lifetime tallies — not filled/hired, not a churn or quality score; windowed exits live on boardActivity',
  };
}

/** Calendar days since closedAt (day stamps); null if missing/invalid. */
export function daysSinceClosed(row, today) {
  const c = row?.closedAt;
  const day = today || new Date().toISOString().slice(0, 10);
  if (!c || !day) return null;
  // Reuse firstSeen-day arithmetic: closedAt is the same day-stamp domain.
  const d = observedOpenDays({ firstSeen: c }, day);
  return Number.isFinite(d) ? d : null;
}

/**
 * TheirStack residual — closed-role age landscape (days since closedAt).
 * How long ago roles left polled boards — complements lifetime closed counts + windowed boardActivity.
 * Counts only — closed ≠ filled/hired; not a churn or quality score.
 */
export function measureClosedAgeLandscape(ledger, { today } = {}) {
  const day = today || new Date().toISOString().slice(0, 10);
  const roles = Object.values(ledger?.roles || {});
  const closed = roles.filter((r) => r && r.closedAt);
  const byBucket = {
    '0d': 0,
    '1-2d': 0,
    '3-6d': 0,
    '7-13d': 0,
    '14-29d': 0,
    '30d+': 0,
    invalid: 0,
  };
  let maxDays = 0;
  let ge1 = 0;
  let ge3 = 0;
  let ge7 = 0;
  let withAge = 0;
  const byProvider = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of closed) {
    const d = daysSinceClosed(r, day);
    if (d == null || d < 0) {
      byBucket.invalid += 1;
      continue;
    }
    withAge += 1;
    if (d > maxDays) maxDays = d;
    if (d >= 1) ge1 += 1;
    if (d >= 3) ge3 += 1;
    if (d >= 7) ge7 += 1;
    let b = '30d+';
    if (d <= 0) b = '0d';
    else if (d <= 2) b = '1-2d';
    else if (d <= 6) b = '3-6d';
    else if (d <= 13) b = '7-13d';
    else if (d <= 29) b = '14-29d';
    byBucket[b] += 1;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    byProvider[p] = (byProvider[p] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const n = closed.length;
  return {
    closed: n,
    withAge,
    invalid: byBucket.invalid,
    maxDays,
    ge1,
    ge3,
    ge7,
    ge7Share: n ? Number((ge7 / n).toFixed(4)) : 0,
    byBucket,
    byProvider: rank(byProvider, 'provider'),
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'days since closedAt only (board omit lag depth); ge7=closed ≥7d ago; not filled/hired, not churn quality; complements ledger.closed counts + boardActivity window exits',
  };
}

/**
 * Deel residual — open-role US-posted vs non-US landscape (usPosted flag from location gate).
 * Counts only — not EOR/compliance product, visa claims, or country risk scores.
 */
export function measureUsPostedLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let usPosted = 0;
  const byProviderUs = Object.create(null);
  const byProviderNonUs = Object.create(null);
  const byFnUs = Object.create(null);
  for (const r of open) {
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const fn = String(r.fn || 'other').slice(0, 40) || 'other';
    if (r.usPosted === true) {
      usPosted += 1;
      byProviderUs[p] = (byProviderUs[p] || 0) + 1;
      byFnUs[fn] = (byFnUs[fn] || 0) + 1;
    } else {
      byProviderNonUs[p] = (byProviderNonUs[p] || 0) + 1;
    }
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  const nonUs = openN - usPosted;
  return {
    open: openN,
    usPosted,
    nonUs,
    share: openN ? Number((usPosted / openN).toFixed(4)) : 0,
    byProviderUs: rank(byProviderUs, 'provider'),
    byProviderNonUs: rank(byProviderNonUs, 'provider'),
    byFnUs: rank(byFnUs, 'fn'),
    basis:
      'usPosted from location gate (US/remote markers); nonUs includes foreign + empty/ambiguous — not EOR, visa, or compliance claims',
  };
}

/**
 * Title-heuristic employment type (intern / partTime / contract / unspecified).
 * Exclusive: intern > partTime > contract > unspecified.
 * Contract signals require contingent phrasing — not "Contracts Manager" function titles.
 * Not a full-time claim and not an HRIS employment-class product.
 */
export function employmentTypeFromTitle(title) {
  const raw = String(title || '').trim();
  if (!raw) return 'unspecified';
  const t = raw.toLowerCase();
  if (/\b(?:interns?(?:hip)?|co-?ops?|apprentices?(?:hip)?)\b/.test(t)) return 'intern';
  if (/\bpart[\s-]?time\b/.test(t)) return 'partTime';
  // Contingent / contract employment — not "Contracts Manager" / "Contracts & Procurement" craft titles.
  if (
    /[\[(]\s*contract(?:or|ual|ing)?\b/.test(t) ||
    /\bfixed[\s-]?term\b/.test(t) ||
    /\bindependent\s+contractor\b/.test(t) ||
    /\bcontract[\s-]?to[\s-]?hire\b/.test(t) ||
    /\b\d+[\s-]?months?\s+contract\b/.test(t) ||
    /\b1099\b/.test(t) ||
    /[-–—|/]\s*contract(?:or|ual)?\s*$/.test(t) ||
    /[-–—]\s*contract(?:or|ual)?\b/.test(t) ||
    /\bcontractor\b/.test(t) ||
    /\bcontractual\b/.test(t) ||
    /\btemporary\b/.test(t)
  ) {
    return 'contract';
  }
  return 'unspecified';
}

/**
 * Rippling residual — open-role employment-type landscape from titles only.
 * Counts only — not HRIS class, payroll, or contingent-workforce quality scores.
 */
export function measureEmploymentTypeLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byType = Object.create(null);
  const byProviderContract = Object.create(null);
  const byFnIntern = Object.create(null);
  for (const r of open) {
    const et = employmentTypeFromTitle(r.title);
    byType[et] = (byType[et] || 0) + 1;
    if (et === 'contract') {
      const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
      byProviderContract[p] = (byProviderContract[p] || 0) + 1;
    } else if (et === 'intern') {
      const fn = String(r.fn || 'other').slice(0, 40) || 'other';
      byFnIntern[fn] = (byFnIntern[fn] || 0) + 1;
    }
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  const intern = byType.intern || 0;
  const partTime = byType.partTime || 0;
  const contract = byType.contract || 0;
  const unspecified = byType.unspecified || 0;
  const specified = intern + partTime + contract;
  return {
    open: openN,
    intern,
    partTime,
    contract,
    unspecified,
    specified,
    specifiedShare: openN ? Number((specified / openN).toFixed(4)) : 0,
    byType: rank(byType, 'employmentType'),
    byProviderContract: rank(byProviderContract, 'provider'),
    byFnIntern: rank(byFnIntern, 'fn'),
    basis:
      'title-heuristic exclusive buckets (intern>partTime>contract>unspecified); Contracts-function titles stay unspecified; not full-time claims or HRIS employment class',
  };
}

/**
 * Phenom/career-site residual — catch-all / general-application titles on public boards.
 * True for "General Application", "Don't see a role?", future-openings catch-alls, etc.
 * Not a quality score and does not remove roles from open counts.
 */
export function isGeneralApplicationTitle(title) {
  const t = String(title || '')
    .toLowerCase()
    .trim();
  if (!t) return false;
  if (/\bgeneral\s+(?:\/\s*)?(?:opportunistic\s+)?(?:job\s+)?application\b/.test(t)) return true;
  if (/\bopen\s+applications?\b/.test(t)) return true;
  if (/\bdon['’]?t see\b/.test(t) || /\bcouldn['’]?t find\b/.test(t) || /\bcan['’]?t find\b/.test(t)) return true;
  if (/\bnot seeing a position\b/.test(t)) return true;
  if (/\ba job not listed\b/.test(t) || /\bbuild your own role\b/.test(t)) return true;
  if (/\bcreate your own\b/.test(t) || /\bname your job\b/.test(t)) return true;
  if (/\bi don['’]?t fit\b/.test(t)) return true;
  if (/^other(?:\s+positions)?$/.test(t)) return true;
  if (/\bfuture (?:opportunities|openings|showroom|jewelry|gemology)\b/.test(t)) return true;
  if (/\bget in touch\b/.test(t) || /\bwe have moved our careers\b/.test(t)) return true;
  if (/\bhiring event\b/.test(t) || /^temp job\b/.test(t)) return true;
  if (/\btell us more\b/.test(t) || /\bapply anyway\b/.test(t)) return true;
  if (/\bexpress interest\b/.test(t) || /\brole for you\??$/.test(t)) return true;
  return false;
}

/**
 * Phenom residual — open-role general-application / catch-all landscape from titles only.
 * Counts only — not board quality scores; catch-alls remain in open unless separately filtered.
 */
export function measureGeneralApplicationLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let generalApp = 0;
  const byProvider = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of open) {
    if (!isGeneralApplicationTitle(r.title)) continue;
    generalApp += 1;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    byProvider[p] = (byProvider[p] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    generalApp,
    concrete: openN - generalApp,
    share: openN ? Number((generalApp / openN).toFixed(4)) : 0,
    byProvider: rank(byProvider, 'provider'),
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'title-heuristic catch-all / general-application / future-openings / don\'t-see-a-role posts; counts only — not quality scores; does not strip from open',
  };
}

/** Multi-label US metro markers from location text (not exclusive). Empty → []. */
export function metrosFromLocation(location) {
  const t = String(location || '').toLowerCase();
  if (!t.trim()) return [];
  const hits = [];
  if (
    /\b(san francisco|\bsf\b|bay area|oakland|berkeley|palo alto|mountain view|san jose|sunnyvale|redwood city|menlo park|south bay|east bay|peninsula|cupertino|santa clara|foster city|san mateo|burlingame|daly city|fremont|hayward|emeryville|silicon valley)\b/.test(
      t,
    )
  ) {
    hits.push('sfBay');
  }
  if (/\b(new york|\bnyc\b|brooklyn|manhattan|queens)\b/.test(t)) hits.push('nyc');
  if (/\bseattle\b/.test(t)) hits.push('seattle');
  if (/\b(los angeles|\bla\b|santa monica|venice,?\s*ca)\b/.test(t)) hits.push('la');
  if (/\baustin\b/.test(t)) hits.push('austin');
  if (/\bboston\b|\bcambridge,?\s*ma\b/.test(t)) hits.push('boston');
  if (/\bchicago\b/.test(t)) hits.push('chicago');
  if (/\bdenver\b|\bboulder\b/.test(t)) hits.push('denver');
  if (/\bmiami\b/.test(t)) hits.push('miami');
  if (/\batlanta\b/.test(t)) hits.push('atlanta');
  if (/\bdallas\b|\bhouston\b|\btexas\b/.test(t) && !hits.includes('austin')) {
    // texas metros loose — only if not already austin; keep simple: dallasHouston tag
    if (/\bdallas\b|\bhouston\b/.test(t)) hits.push('dallasHouston');
  }
  return hits;
}

/**
 * Deel/Rippling residual — open-role US metro landscape from location text (multi-label).
 * Complements usPosted (country gate) with metro honesty for SF-map operators.
 * Counts only — not geo-ranking, visa, or remote-friendly scores.
 */
export function measureMetroLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byMetro = Object.create(null);
  const byProviderSfBay = Object.create(null);
  const byFnSfBay = Object.create(null);
  let sfBay = 0;
  let withMetro = 0;
  let multiMetro = 0;
  for (const r of open) {
    const metros = metrosFromLocation(r.location);
    if (!metros.length) continue;
    withMetro += 1;
    if (metros.length >= 2) multiMetro += 1;
    for (const m of metros) byMetro[m] = (byMetro[m] || 0) + 1;
    if (metros.includes('sfBay')) {
      sfBay += 1;
      const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
      const fn = String(r.fn || 'other').slice(0, 40) || 'other';
      byProviderSfBay[p] = (byProviderSfBay[p] || 0) + 1;
      byFnSfBay[fn] = (byFnSfBay[fn] || 0) + 1;
    }
  }
  const rank = (obj, keyName, n = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    withMetro,
    withoutMetro: openN - withMetro,
    multiMetro,
    sfBay,
    sfBayShare: openN ? Number((sfBay / openN).toFixed(4)) : 0,
    byMetro: rank(byMetro, 'metro'),
    byProviderSfBay: rank(byProviderSfBay, 'provider', 8),
    byFnSfBay: rank(byFnSfBay, 'fn', 8),
    basis:
      'location-text multi-label US metro markers (sfBay/nyc/seattle/…); a role may count in multiple metros; remote-only/city-unknown is withoutMetro; not a geo rank or visa product',
  };
}

/**
 * PredictLeads residual — founding / early-seat title signal from public boards.
 * True for "Founding Engineer", founder-in-residence, founders associate/office.
 * Excludes ex-/former founder and "future founder" aspirational phrasing.
 */
export function isFoundingTitle(title) {
  const t = String(title || '')
    .toLowerCase()
    .trim();
  if (!t) return false;
  if (/\bex-?founders?\b|\bformer founders?\b/.test(t)) return false;
  if (/\bfuture founders?\b/.test(t)) return false;
  if (/\bfounding\b/.test(t)) return true;
  if (/\bfounder in residence\b/.test(t)) return true;
  if (/\bfounders? (?:associate|office)\b/.test(t)) return true;
  if (/\boffice of the founders?\b/.test(t)) return true;
  // Bare "Founder" as role (not company narrative)
  if (/^founders?\b/.test(t) || /\bfounders?\s*[-–—,/)]/.test(t)) return true;
  return false;
}

/**
 * PredictLeads residual — open-role founding-title landscape from titles only.
 * Counts only — early-seat board signal, not company stage scores or intent products.
 */
export function measureFoundingLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let founding = 0;
  const byProvider = Object.create(null);
  const byFn = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of open) {
    if (!isFoundingTitle(r.title)) continue;
    founding += 1;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const fn = String(r.fn || 'other').slice(0, 40) || 'other';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    byProvider[p] = (byProvider[p] || 0) + 1;
    byFn[fn] = (byFn[fn] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    founding,
    nonFounding: openN - founding,
    share: openN ? Number((founding / openN).toFixed(4)) : 0,
    byProvider: rank(byProvider, 'provider'),
    byFn: rank(byFn, 'fn'),
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'title-heuristic founding/early-seat markers (Founding *, founder in residence, founders associate/office); excludes ex-/former/future founder; counts only — not company stage or intent scores',
  };
}

/**
 * Language markers in a job title (multi-label). bilingual/multilingual is a flag.
 * Not proof of fluency requirements beyond title text; franchise ≠ french.
 */
export function languageMarkersFromTitle(title) {
  const t = String(title || '')
    .toLowerCase()
    .trim();
  if (!t) return { languages: [], bilingual: false, hasLanguageSignal: false };
  const bilingual = /\bbilingual\b|\bmultilingual\b/.test(t);
  const languages = [];
  if (/\bspanish\b|\bespañol\b/.test(t)) languages.push('spanish');
  if (/\bfrench\b|\bfrançais\b/.test(t) && !/\bfranchise\b/.test(t)) languages.push('french');
  if (/\bmandarin\b|\bcantonese\b|\bchinese\b/.test(t)) languages.push('chinese');
  if (/\bjapanese\b/.test(t)) languages.push('japanese');
  if (/\bkorean\b/.test(t)) languages.push('korean');
  if (/\bgerman\b|\bdeutsch\b/.test(t)) languages.push('german');
  if (/\bportuguese\b|\bportuguês\b/.test(t)) languages.push('portuguese');
  if (/\bitalian\b/.test(t)) languages.push('italian');
  if (/\bhindi\b|\btagalog\b|\barabic\b|\brussian\b|\bhebrew\b|\bvietnamese\b/.test(t)) {
    languages.push('other');
  }
  return {
    languages,
    bilingual,
    hasLanguageSignal: bilingual || languages.length > 0,
  };
}

/**
 * Phenom residual — open-role language/bilingual title landscape (counts only).
 * Complements workplace/metro; not a localization quality score or person skill graph.
 */
export function measureLanguageLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let withLanguage = 0;
  let bilingual = 0;
  const byLanguage = Object.create(null);
  const byProvider = Object.create(null);
  const byFn = Object.create(null);
  for (const r of open) {
    const m = languageMarkersFromTitle(r.title);
    if (!m.hasLanguageSignal) continue;
    withLanguage += 1;
    if (m.bilingual) bilingual += 1;
    for (const lang of m.languages) byLanguage[lang] = (byLanguage[lang] || 0) + 1;
    if (m.bilingual && m.languages.length === 0) {
      byLanguage.bilingualOnly = (byLanguage.bilingualOnly || 0) + 1;
    }
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const fn = String(r.fn || 'other').slice(0, 40) || 'other';
    byProvider[p] = (byProvider[p] || 0) + 1;
    byFn[fn] = (byFn[fn] || 0) + 1;
  }
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    withLanguage,
    withoutLanguage: openN - withLanguage,
    bilingual,
    share: openN ? Number((withLanguage / openN).toFixed(4)) : 0,
    byLanguage: rank(byLanguage, 'language'),
    byProvider: rank(byProvider, 'provider', 8),
    byFn: rank(byFn, 'fn', 8),
    basis:
      'title-heuristic multi-label language markers + bilingual/multilingual flag; franchise excluded from french; silence is not monolingual claim; not a skill graph or localization score',
  };
}

/**
 * TheirStack residual — lifetime open-role concentration by company (counts only).
 * Complements windowed boardActivity.byCompanyTop with point-in-time open intensity.
 * Not a hiring-quality or intent score; top-N share is observation honesty only.
 */
export function measureCompanyOpenLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byCompany = Object.create(null);
  const byProvider = Object.create(null);
  for (const r of open) {
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    byCompany[c] = (byCompany[c] || 0) + 1;
    byProvider[p] = (byProvider[p] || 0) + 1;
  }
  const ranked = Object.entries(byCompany).sort(
    (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  const openN = open.length;
  const companies = ranked.length;
  const sumTop = (n) => ranked.slice(0, n).reduce((s, [, count]) => s + count, 0);
  const top10 = sumTop(10);
  const top25 = sumTop(25);
  const byBucket = { '1': 0, '2-5': 0, '6-20': 0, '21-100': 0, '100+': 0 };
  for (const [, n] of ranked) {
    if (n <= 1) byBucket['1'] += 1;
    else if (n <= 5) byBucket['2-5'] += 1;
    else if (n <= 20) byBucket['6-20'] += 1;
    else if (n <= 100) byBucket['21-100'] += 1;
    else byBucket['100+'] += 1;
  }
  const rankProv = Object.entries(byProvider)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([provider, n]) => ({ provider, n }));
  return {
    open: openN,
    companies,
    top10Share: openN ? Number((top10 / openN).toFixed(4)) : 0,
    top25Share: openN ? Number((top25 / openN).toFixed(4)) : 0,
    byCompanyTop: ranked.slice(0, 12).map(([company, n]) => ({ company, n })),
    byCompanyBucket: Object.entries(byBucket).map(([bucket, n]) => ({ bucket, n })),
    byProviderOpen: rankProv,
    basis:
      'point-in-time open-role counts by company name on owned ledger; topN share is concentration honesty only — not intent, quality, or rank product; complements windowed boardActivity intensity',
  };
}

/**
 * Classify apply URL hostname: ATS-native boards vs careers subdomain vs custom domain.
 * Complements provider field (Greenhouse roles often link via company.com).
 */
export function urlHostClassFromUrl(url) {
  let host = '';
  try {
    host = new URL(String(url || '')).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return { hostClass: 'invalid', host: '' };
  }
  if (!host) return { hostClass: 'empty', host: '' };
  if (
    /(^|\.)jobs\.ashbyhq\.com$/.test(host) ||
    /(^|\.)(job-boards|boards)\.greenhouse\.io$/.test(host) ||
    /(^|\.)jobs\.lever\.co$/.test(host) ||
    /(^|\.)apply\.workable\.com$/.test(host) ||
    /smartrecruiters\.com$/.test(host) ||
    /recruitee\.com$/.test(host) ||
    /personio\.(de|com)$/.test(host)
  ) {
    return { hostClass: 'atsNative', host };
  }
  if (/^(jobs|careers|jobs-eu|jobs-us)\./.test(host) || /\.careers\./.test(host)) {
    return { hostClass: 'careersHost', host };
  }
  return { hostClass: 'customDomain', host };
}

/**
 * Merge/Apply residual — open-role apply-URL host-class landscape (counts only).
 * Honesty on native ATS hosts vs company career domains without scraping new boards.
 */
export function measureUrlHostLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const byHostClass = Object.create(null);
  const byProviderClass = Object.create(null);
  const byHost = Object.create(null);
  let invalid = 0;
  for (const r of open) {
    const { hostClass, host } = urlHostClassFromUrl(r.url);
    byHostClass[hostClass] = (byHostClass[hostClass] || 0) + 1;
    if (hostClass === 'invalid' || hostClass === 'empty') {
      invalid += 1;
      continue;
    }
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const pk = `${p}|${hostClass}`;
    byProviderClass[pk] = (byProviderClass[pk] || 0) + 1;
    if (host) byHost[host] = (byHost[host] || 0) + 1;
  }
  const rank = (obj, keyName, n = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  const atsNative = byHostClass.atsNative || 0;
  const careersHost = byHostClass.careersHost || 0;
  const customDomain = byHostClass.customDomain || 0;
  return {
    open: openN,
    atsNative,
    careersHost,
    customDomain,
    invalid,
    atsNativeShare: openN ? Number((atsNative / openN).toFixed(4)) : 0,
    byHostClass: rank(byHostClass, 'hostClass'),
    byProviderClass: rank(byProviderClass, 'providerClass', 12),
    byHostTop: rank(byHost, 'host', 12),
    basis:
      'apply URL hostname classes (atsNative ashby/gh/lever/…, careersHost jobs.|careers., customDomain); complements provider field; not a scrape target list or quality score',
  };
}

/**
 * Greenhouse residual — open roles whose board-reported posted date changed while we tracked them.
 * postedDateChangeCount honesty: stored nativePostedAt never moves, so ages are a lower bound.
 * Counts only — not a fraud score or company quality rank.
 */
export function measurePostedDateRecycleLandscape(ledger) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  let withRecycle = 0;
  let changeEvents = 0;
  const byProvider = Object.create(null);
  const byCompany = Object.create(null);
  const byCount = Object.create(null);
  for (const r of open) {
    const n = Number(r.postedDateChangeCount) || 0;
    if (!Number.isFinite(n) || n <= 0) continue;
    withRecycle += 1;
    changeEvents += n;
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
    const bucket = n >= 5 ? '5+' : String(Math.floor(n));
    byProvider[p] = (byProvider[p] || 0) + 1;
    byCompany[c] = (byCompany[c] || 0) + 1;
    byCount[bucket] = (byCount[bucket] || 0) + 1;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  return {
    open: openN,
    withRecycle,
    withoutRecycle: openN - withRecycle,
    changeEvents,
    share: openN ? Number((withRecycle / openN).toFixed(4)) : 0,
    byProvider: rank(byProvider, 'provider'),
    byCompanyTop: rank(byCompany, 'company'),
    byChangeCount: rank(byCount, 'changeCount'),
    basis:
      'postedDateChangeCount when board-reported nativePostedAt changes while role stays open; stored date never moves so posted ages are a lower bound — not a fraud or quality score',
  };
}

/**
 * Greenhouse residual — open roles where board nativeUpdatedAt is after first_published (counts only).
 * Distinct from postedDateRecycle (post-date field changes): this is updated_at > first_published flag.
 * Not a ghost-job or content-quality score; Ashby/Lever lack the flag (withoutFlag).
 */
export function measureNativeUpdateLandscape(ledger) {
  const open = Object.values(ledger?.roles || {}).filter((r) => r && !r.closedAt);
  let updatedAfter = 0;
  let notUpdatedAfter = 0;
  let flagNull = 0;
  let withoutFlag = 0;
  const byProviderTrue = Object.create(null);
  const byProviderFlag = Object.create(null);
  const byCompanyTrue = Object.create(null);
  for (const r of open) {
    const p = String(r.provider || 'unknown').slice(0, 40) || 'unknown';
    if (!Object.hasOwn(r, 'nativeUpdatedAfterFirstPublished')) {
      withoutFlag += 1;
      continue;
    }
    byProviderFlag[p] = (byProviderFlag[p] || 0) + 1;
    const v = r.nativeUpdatedAfterFirstPublished;
    if (v === true) {
      updatedAfter += 1;
      byProviderTrue[p] = (byProviderTrue[p] || 0) + 1;
      const c = String(r.company || 'unknown').slice(0, 80) || 'unknown';
      byCompanyTrue[c] = (byCompanyTrue[c] || 0) + 1;
    } else if (v === false) {
      notUpdatedAfter += 1;
    } else {
      flagNull += 1;
    }
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const openN = open.length;
  const withFlag = updatedAfter + notUpdatedAfter + flagNull;
  return {
    open: openN,
    withFlag,
    withoutFlag,
    updatedAfter,
    notUpdatedAfter,
    flagNull,
    shareOfOpen: openN ? Number((updatedAfter / openN).toFixed(4)) : 0,
    shareOfFlagged: withFlag ? Number((updatedAfter / withFlag).toFixed(4)) : 0,
    byProviderTrue: rank(byProviderTrue, 'provider'),
    byProviderFlag: rank(byProviderFlag, 'provider'),
    byCompanyTop: rank(byCompanyTrue, 'company'),
    basis:
      'nativeUpdatedAfterFirstPublished when Greenhouse updated_at > first_published; withoutFlag=Ashby/Lever/etc.; not ghost-job % or content-quality score',
  };
}

/** Offline: refresh ledger.fn from titles (no network). Returns change count. */
export function reclassifyLedgerFunctions(ledger) {
  if (!ledger || typeof ledger !== 'object') throw new Error('ledger required');
  const roles = ledger.roles;
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) {
    throw new Error('ledger.roles must be plain object');
  }
  let changed = 0;
  let open = 0;
  const byFn = {};
  for (const r of Object.values(roles)) {
    if (!r || typeof r !== 'object') continue;
    const next = categorizeRole(r.title);
    if (r.fn !== next) {
      r.fn = next;
      changed++;
    }
    if (!r.closedAt) {
      open++;
      byFn[next] = (byFn[next] || 0) + 1;
    }
  }
  return { changed, open, byFn };
}

export function buildScoreboard({ map, ledger, aging, exportDoc, research, today } = {}) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const openUs = open.filter((r) => r.usPosted);
  const withNative = open.filter((r) => r.nativePostedAt).length;
  const people = open.filter((r) => r.fn === 'people').length;
  const byFn = {};
  for (const r of open) byFn[r.fn || 'other'] = (byFn[r.fn || 'other'] || 0) + 1;
  const fnDrift = measureLedgerFnDrift(ledger);
  const day = today || new Date().toISOString().slice(0, 10);
  const nativeDates = measureNativeDateFieldLandscape(ledger);
  const agencyPolicy = measureAgencyPolicyLandscape(ledger);
  const workplace = measureWorkplaceLandscape(ledger);
  const observedAge = measureObservedAgeLandscape(ledger, { today: day });
  const lastSeen = measureLastSeenLandscape(ledger, { today: day });
  const postedAge = measurePostedAgeLandscape(ledger, { today: day });
  const seniority = measureSeniorityLandscape(ledger);
  const reopen = measureReopenLandscape(ledger);
  const closedLand = measureClosedLandscape(ledger);
  const closedAge = measureClosedAgeLandscape(ledger, { today: day });
  const postedDateRecycle = measurePostedDateRecycleLandscape(ledger);
  const usPostedLand = measureUsPostedLandscape(ledger);
  const employmentType = measureEmploymentTypeLandscape(ledger);
  const generalApp = measureGeneralApplicationLandscape(ledger);
  const metro = measureMetroLandscape(ledger);
  const founding = measureFoundingLandscape(ledger);
  const language = measureLanguageLandscape(ledger);
  const companyOpen = measureCompanyOpenLandscape(ledger);
  const urlHost = measureUrlHostLandscape(ledger);
  const nativeUpdate = measureNativeUpdateLandscape(ledger);
  const withPolicy = agencyPolicy.withPolicy;
  // 7d board activity (roles-feed SoR): new first-obs + board-exit — not filled/hired or scores.
  const boardActivity = boardActivityInsightFromLedger(ledger, { today: day, days: 7 });

  const cos = map?.companies || [];
  const withLedger = cos.filter((c) => (c.ledgerOpenRoles || 0) > 0).length;
  const withObserved7 = cos.filter((c) => (c.observed7 || 0) > 0).length;
  const withAging = cos.filter((c) => (c.agingRoles || 0) > 0).length;
  const withRoleMix = cos.filter((c) => c.roleMix && Object.keys(c.roleMix).length).length;
  const mapAts = measureMapAtsLandscape(map);
  const mapSource = measureMapSourceLandscape(map);
  const mapHiringHonesty = measureMapHiringHonestyLandscape(map);
  const mapProfile = measureMapProfileLandscape(map);
  const mapInception = measureMapInceptionLandscape(map);
  const mapRetrieved = measureMapRetrievedLandscape(map);
  const mapTags = measureMapTagsLandscape(map);
  const mapWebsite = measureMapWebsiteLandscape(map);
  const mapAging = measureMapAgingLandscape(map);
  const mapLicense = measureMapLicenseLandscape(map);
  const mapRoleMix = measureMapRoleMixLandscape(map);
  const mapOpenRoles = measureMapOpenRolesLandscape(map);
  const mapJobsStamp = measureMapJobsStampLandscape(map);

  const rows = exportDoc?.rows || [];
  const exportReq = measureExportReqLandscape(exportDoc);
  const exportSeniority = measureExportSeniorityLandscape(exportDoc);
  const exportLocation = measureExportLocationLandscape(exportDoc);
  const exportFn = measureExportFnLandscape(exportDoc);
  const exportChurn = measureExportChurnLandscape(exportDoc);
  const exportAge = measureExportAgeLandscape(exportDoc);
  const exportResearch = measureExportResearchLandscape(exportDoc);
  const exportSample = measureExportSampleLandscape(exportDoc);
  const exportRelationships = measureExportRelationshipLandscape(exportDoc);
  const exportProvider = measureExportProviderLandscape(exportDoc);
  const exportDiagnostics = measureExportDiagnosticsLandscape(exportDoc);
  const exportDomain = measureExportDomainLandscape(exportDoc);
  const exportJobsUrl = measureExportJobsUrlLandscape(exportDoc);
  const exportLicense = measureExportLicenseLandscape(exportDoc);
  const exportRetrieved = measureExportRetrievedLandscape(exportDoc);
  const exportIdentity = measureExportIdentityLandscape(exportDoc);
  const exportSums = {
    rows: rows.length,
    openReq: exportReq.openReqSum,
    eng: exportReq.engSum,
    sales: exportReq.salesSum,
    remote: exportReq.remoteSum,
    peopleOps: exportReq.peopleOpsSum,
    noAgency: exportReq.noAgencySum,
    observed7: exportReq.observed7Sum,
    research: exportReq.withResearch,
  };

  return {
    schema: SCHEMA,
    at: new Date().toISOString(),
    ledger: {
      totalRoles: roles.length,
      open: open.length,
      openUs: openUs.length,
      usPosted: {
        usPosted: usPostedLand.usPosted,
        nonUs: usPostedLand.nonUs,
        share: usPostedLand.share,
        byProviderUs: usPostedLand.byProviderUs,
        byProviderNonUs: usPostedLand.byProviderNonUs,
        byFnUs: usPostedLand.byFnUs,
        basis: usPostedLand.basis,
      },
      withAgencyPolicy: withPolicy,
      agencyPolicy: {
        withoutPolicy: agencyPolicy.withoutPolicy,
        share: agencyPolicy.share,
        byProvider: agencyPolicy.byProvider,
        byCompanyTop: agencyPolicy.byCompanyTop,
        basis: agencyPolicy.basis,
      },
      workplace: {
        remote: workplace.remote,
        hybrid: workplace.hybrid,
        onsite: workplace.onsite,
        unspecified: workplace.unspecified,
        empty: workplace.empty,
        remoteShare: workplace.remoteShare,
        byProviderRemote: workplace.byProviderRemote,
        byFnRemote: workplace.byFnRemote,
        basis: workplace.basis,
      },
      observedAge: {
        withFirstSeen: observedAge.withFirstSeen,
        withoutFirstSeen: observedAge.withoutFirstSeen,
        maxDays: observedAge.maxDays,
        ge7: observedAge.ge7,
        ge30: observedAge.ge30,
        byBucket: observedAge.byBucket,
        basis: observedAge.basis,
      },
      lastSeen: {
        withLastSeen: lastSeen.withLastSeen,
        withoutLastSeen: lastSeen.withoutLastSeen,
        maxDays: lastSeen.maxDays,
        ge1: lastSeen.ge1,
        ge3: lastSeen.ge3,
        ge7: lastSeen.ge7,
        ge3Share: lastSeen.ge3Share,
        byBucket: lastSeen.byBucket,
        byProviderStale: lastSeen.byProviderStale,
        byCompanyStaleTop: lastSeen.byCompanyStaleTop,
        basis: lastSeen.basis,
      },
      postedAge: {
        attributable: postedAge.attributable,
        withoutAttributed: postedAge.withoutAttributed,
        maxDays: postedAge.maxDays,
        agingRoles: postedAge.agingRoles,
        evergreenRoles: postedAge.evergreenRoles,
        byBucket: postedAge.byBucket,
        basis: postedAge.basis,
      },
      seniority: {
        specified: seniority.specified,
        unspecified: seniority.unspecified,
        bySeniority: seniority.bySeniority,
        byEngineeringSeniority: seniority.byEngineeringSeniority,
        basis: seniority.basis,
      },
      reopen: {
        withReopen: reopen.withReopen,
        withoutReopen: reopen.withoutReopen,
        reopenEvents: reopen.reopenEvents,
        share: reopen.share,
        byProvider: reopen.byProvider,
        byCompanyTop: reopen.byCompanyTop,
        byReopenCount: reopen.byReopenCount,
        basis: reopen.basis,
      },
      closed: {
        closed: closedLand.closed,
        open: closedLand.open,
        share: closedLand.share,
        byProvider: closedLand.byProvider,
        byFn: closedLand.byFn,
        byCompanyTop: closedLand.byCompanyTop,
        basis: closedLand.basis,
      },
      closedAge: {
        closed: closedAge.closed,
        withAge: closedAge.withAge,
        invalid: closedAge.invalid,
        maxDays: closedAge.maxDays,
        ge1: closedAge.ge1,
        ge3: closedAge.ge3,
        ge7: closedAge.ge7,
        ge7Share: closedAge.ge7Share,
        byBucket: closedAge.byBucket,
        byProvider: closedAge.byProvider,
        byCompanyTop: closedAge.byCompanyTop,
        basis: closedAge.basis,
      },
      employmentType: {
        intern: employmentType.intern,
        partTime: employmentType.partTime,
        contract: employmentType.contract,
        unspecified: employmentType.unspecified,
        specified: employmentType.specified,
        specifiedShare: employmentType.specifiedShare,
        byType: employmentType.byType,
        byProviderContract: employmentType.byProviderContract,
        byFnIntern: employmentType.byFnIntern,
        basis: employmentType.basis,
      },
      generalApplication: {
        generalApp: generalApp.generalApp,
        concrete: generalApp.concrete,
        share: generalApp.share,
        byProvider: generalApp.byProvider,
        byCompanyTop: generalApp.byCompanyTop,
        basis: generalApp.basis,
      },
      metro: {
        withMetro: metro.withMetro,
        withoutMetro: metro.withoutMetro,
        multiMetro: metro.multiMetro,
        sfBay: metro.sfBay,
        sfBayShare: metro.sfBayShare,
        byMetro: metro.byMetro,
        byProviderSfBay: metro.byProviderSfBay,
        byFnSfBay: metro.byFnSfBay,
        basis: metro.basis,
      },
      founding: {
        founding: founding.founding,
        nonFounding: founding.nonFounding,
        share: founding.share,
        byProvider: founding.byProvider,
        byFn: founding.byFn,
        byCompanyTop: founding.byCompanyTop,
        basis: founding.basis,
      },
      language: {
        withLanguage: language.withLanguage,
        withoutLanguage: language.withoutLanguage,
        bilingual: language.bilingual,
        share: language.share,
        byLanguage: language.byLanguage,
        byProvider: language.byProvider,
        byFn: language.byFn,
        basis: language.basis,
      },
      companyOpen: {
        companies: companyOpen.companies,
        top10Share: companyOpen.top10Share,
        top25Share: companyOpen.top25Share,
        byCompanyTop: companyOpen.byCompanyTop,
        byCompanyBucket: companyOpen.byCompanyBucket,
        byProviderOpen: companyOpen.byProviderOpen,
        basis: companyOpen.basis,
      },
      urlHost: {
        atsNative: urlHost.atsNative,
        careersHost: urlHost.careersHost,
        customDomain: urlHost.customDomain,
        invalid: urlHost.invalid,
        atsNativeShare: urlHost.atsNativeShare,
        byHostClass: urlHost.byHostClass,
        byProviderClass: urlHost.byProviderClass,
        byHostTop: urlHost.byHostTop,
        basis: urlHost.basis,
      },
      nativeUpdate: {
        withFlag: nativeUpdate.withFlag,
        withoutFlag: nativeUpdate.withoutFlag,
        updatedAfter: nativeUpdate.updatedAfter,
        notUpdatedAfter: nativeUpdate.notUpdatedAfter,
        flagNull: nativeUpdate.flagNull,
        shareOfOpen: nativeUpdate.shareOfOpen,
        shareOfFlagged: nativeUpdate.shareOfFlagged,
        byProviderTrue: nativeUpdate.byProviderTrue,
        byProviderFlag: nativeUpdate.byProviderFlag,
        byCompanyTop: nativeUpdate.byCompanyTop,
        basis: nativeUpdate.basis,
      },
      postedDateRecycle: {
        withRecycle: postedDateRecycle.withRecycle,
        withoutRecycle: postedDateRecycle.withoutRecycle,
        changeEvents: postedDateRecycle.changeEvents,
        share: postedDateRecycle.share,
        byProvider: postedDateRecycle.byProvider,
        byCompanyTop: postedDateRecycle.byCompanyTop,
        byChangeCount: postedDateRecycle.byChangeCount,
        basis: postedDateRecycle.basis,
      },
      withNativePostedAt: withNative,
      // first_published only for attributed posted age (Greenhouse); stamps are not claims.
      attributablePosted: nativeDates.attributablePosted,
      byNativeDateField: nativeDates.byNativeDateField,
      peopleFn: people,
      byFn,
      fnDrift: fnDrift.drift,
      fnOtherOpen: fnDrift.otherOpen,
      fnOtherShare: fnDrift.otherShare,
      updatedAt: ledger?.updatedAt || null,
    },
    boardActivity: boardActivity
      ? {
          windowDays: boardActivity.windowDays,
          newOpenInWindow: boardActivity.newOpenInWindow,
          closedInWindow: boardActivity.closedInWindow,
          companiesWithNewOpen: boardActivity.companiesWithNewOpen,
          companiesClosedInWindow: boardActivity.companiesClosedInWindow,
          // In-window landscapes from pulse/roles-feed (observation counts, not ranks/targets).
          byProvider: Array.isArray(boardActivity.byProvider) ? boardActivity.byProvider : [],
          byFn: Array.isArray(boardActivity.byFn) ? boardActivity.byFn : [],
          byCompanyTop: Array.isArray(boardActivity.byCompanyTop) ? boardActivity.byCompanyTop : [],
          byCompanyClosedTop: Array.isArray(boardActivity.byCompanyClosedTop)
            ? boardActivity.byCompanyClosedTop
            : [],
          windowExceedsObservationHistory: boardActivity.windowExceedsObservationHistory,
          windowExceedsClosureHistory: boardActivity.windowExceedsClosureHistory,
          observationSpanDays: boardActivity.observationSpanDays,
          closureObservationSpanDays: boardActivity.closureObservationSpanDays,
        }
      : null,
    map: {
      companies: cos.length,
      withLedgerOpen: withLedger,
      withObserved7,
      withPostedAging: withAging,
      withRoleMix,
      ats: {
        withJobsUrl: mapAts.withJobsUrl,
        noJobsUrl: mapAts.noJobsUrl,
        withOpenRoles: mapAts.withOpenRoles,
        primary: mapAts.primary,
        secondary: mapAts.secondary,
        primaryOpen: mapAts.primaryOpen,
        secondaryOpen: mapAts.secondaryOpen,
        ycJobsPage: mapAts.ycJobsPage,
        byHostClass: mapAts.byHostClass,
        byHost: mapAts.byHost,
        byAtsSource: mapAts.byAtsSource,
        basis: mapAts.basis,
      },
      source: {
        ycTagged: mapSource.ycTagged,
        ycShare: mapSource.ycShare,
        withYcBatch: mapSource.withYcBatch,
        wikidata: mapSource.wikidata,
        hnHiring: mapSource.hnHiring,
        hiringLabeled: mapSource.hiringLabeled,
        withLedgerOpen: mapSource.withLedgerOpen,
        withInception: mapSource.withInception,
        bySource: mapSource.bySource,
        byYcBatchTop: mapSource.byYcBatchTop,
        byInceptionDecade: mapSource.byInceptionDecade,
        basis: mapSource.basis,
      },
      hiringHonesty: {
        hiringYes: mapHiringHonesty.hiringYes,
        hiringUnknown: mapHiringHonesty.hiringUnknown,
        hiringNull: mapHiringHonesty.hiringNull,
        withLedgerOpen: mapHiringHonesty.withLedgerOpen,
        withJobsUrl: mapHiringHonesty.withJobsUrl,
        hiringYesWithLedger: mapHiringHonesty.hiringYesWithLedger,
        hiringYesNoLedger: mapHiringHonesty.hiringYesNoLedger,
        ledgerOpenNotHiringYes: mapHiringHonesty.ledgerOpenNotHiringYes,
        hiringYesWithJobsUrl: mapHiringHonesty.hiringYesWithJobsUrl,
        hiringYesNoJobsUrl: mapHiringHonesty.hiringYesNoJobsUrl,
        hiringYesShare: mapHiringHonesty.hiringYesShare,
        labeledWithoutLedgerShare: mapHiringHonesty.labeledWithoutLedgerShare,
        basis: mapHiringHonesty.basis,
      },
      profile: {
        withWebsite: mapProfile.withWebsite,
        emptyWebsite: mapProfile.emptyWebsite,
        withDescription: mapProfile.withDescription,
        emptyDescription: mapProfile.emptyDescription,
        shortDescription: mapProfile.shortDescription,
        withInception: mapProfile.withInception,
        withNeighborhood: mapProfile.withNeighborhood,
        coreComplete: mapProfile.coreComplete,
        coreCompleteShare: mapProfile.coreCompleteShare,
        byDescBucket: mapProfile.byDescBucket,
        byLocationPrecision: mapProfile.byLocationPrecision,
        basis: mapProfile.basis,
      },
      inception: {
        companies: mapInception.companies,
        withInception: mapInception.withInception,
        withoutInception: mapInception.withoutInception,
        invalid: mapInception.invalid,
        asOfYear: mapInception.asOfYear,
        minYear: mapInception.minYear,
        maxYear: mapInception.maxYear,
        medianYear: mapInception.medianYear,
        minAgeYears: mapInception.minAgeYears,
        maxAgeYears: mapInception.maxAgeYears,
        medianAgeYears: mapInception.medianAgeYears,
        young0to2: mapInception.young0to2,
        young0to2Share: mapInception.young0to2Share,
        withJobsUrl: mapInception.withJobsUrl,
        jobsWithInception: mapInception.jobsWithInception,
        hiringYes: mapInception.hiringYes,
        hiringWithInception: mapInception.hiringWithInception,
        byAgeCohort: mapInception.byAgeCohort,
        byDecade: mapInception.byDecade,
        byYearTop: mapInception.byYearTop,
        basis: mapInception.basis,
      },
      retrieved: {
        companies: mapRetrieved.companies,
        withRetrievedAt: mapRetrieved.withRetrievedAt,
        withoutRetrievedAt: mapRetrieved.withoutRetrievedAt,
        invalid: mapRetrieved.invalid,
        minHours: mapRetrieved.minHours,
        maxHours: mapRetrieved.maxHours,
        medianHours: mapRetrieved.medianHours,
        ge24h: mapRetrieved.ge24h,
        ge72h: mapRetrieved.ge72h,
        ge24Share: mapRetrieved.ge24Share,
        withJobsUrl: mapRetrieved.withJobsUrl,
        jobsGe24h: mapRetrieved.jobsGe24h,
        byAgeBucket: mapRetrieved.byAgeBucket,
        bySource: mapRetrieved.bySource,
        basis: mapRetrieved.basis,
      },
      tags: {
        companies: mapTags.companies,
        withTags: mapTags.withTags,
        withoutTags: mapTags.withoutTags,
        singleTag: mapTags.singleTag,
        multiTag: mapTags.multiTag,
        multiShare: mapTags.multiShare,
        ycTag: mapTags.ycTag,
        ycBatchTag: mapTags.ycBatchTag,
        wikidataTag: mapTags.wikidataTag,
        hnTag: mapTags.hnTag,
        withJobsUrl: mapTags.withJobsUrl,
        jobsMultiTag: mapTags.jobsMultiTag,
        byTagCount: mapTags.byTagCount,
        byTagTop: mapTags.byTagTop,
        basis: mapTags.basis,
      },
      website: {
        withHost: mapWebsite.withHost,
        invalid: mapWebsite.invalid,
        com: mapWebsite.com,
        ai: mapWebsite.ai,
        io: mapWebsite.io,
        comShare: mapWebsite.comShare,
        aiShare: mapWebsite.aiShare,
        byTld: mapWebsite.byTld,
        byHostTop: mapWebsite.byHostTop,
        multiHost: mapWebsite.multiHost,
        basis: mapWebsite.basis,
      },
      aging: {
        withLedgerOpen: mapAging.withLedgerOpen,
        withOldestObserved: mapAging.withOldestObserved,
        withoutOldestObserved: mapAging.withoutOldestObserved,
        maxOldestDays: mapAging.maxOldestDays,
        ge7: mapAging.ge7,
        ge30: mapAging.ge30,
        withAgingRoles: mapAging.withAgingRoles,
        agingRolesSum: mapAging.agingRolesSum,
        withMedianPosted: mapAging.withMedianPosted,
        byOldestBucket: mapAging.byOldestBucket,
        basis: mapAging.basis,
      },
      license: {
        withLicense: mapLicense.withLicense,
        withoutLicense: mapLicense.withoutLicense,
        ycPublic: mapLicense.ycPublic,
        cc0: mapLicense.cc0,
        hnPublic: mapLicense.hnPublic,
        ycPublicShare: mapLicense.ycPublicShare,
        withJobsUrl: mapLicense.withJobsUrl,
        byLicense: mapLicense.byLicense,
        bySourceHost: mapLicense.bySourceHost,
        byLicenseJobs: mapLicense.byLicenseJobs,
        basis: mapLicense.basis,
      },
      roleMix: {
        withRoleMix: mapRoleMix.withRoleMix,
        withoutRoleMix: mapRoleMix.withoutRoleMix,
        roleSum: mapRoleMix.roleSum,
        engShareOfRoles: mapRoleMix.engShareOfRoles,
        otherShareOfRoles: mapRoleMix.otherShareOfRoles,
        engDominant: mapRoleMix.engDominant,
        byFn: mapRoleMix.byFn,
        byEngShareBucket: mapRoleMix.byEngShareBucket,
        basis: mapRoleMix.basis,
      },
      openRoles: {
        withOpenRoles: mapOpenRoles.withOpenRoles,
        withoutOpenRoles: mapOpenRoles.withoutOpenRoles,
        openRolesSum: mapOpenRoles.openRolesSum,
        maxOpenRoles: mapOpenRoles.maxOpenRoles,
        withLedgerOpen: mapOpenRoles.withLedgerOpen,
        bothPresent: mapOpenRoles.bothPresent,
        countMatch: mapOpenRoles.countMatch,
        countMismatch: mapOpenRoles.countMismatch,
        openGtLedger: mapOpenRoles.openGtLedger,
        openLtLedger: mapOpenRoles.openLtLedger,
        openNoLedger: mapOpenRoles.openNoLedger,
        ledgerNoOpen: mapOpenRoles.ledgerNoOpen,
        absDeltaSum: mapOpenRoles.absDeltaSum,
        matchShare: mapOpenRoles.matchShare,
        byOpenBucket: mapOpenRoles.byOpenBucket,
        byCompanyTop: mapOpenRoles.byCompanyTop,
        byAtsMismatch: mapOpenRoles.byAtsMismatch,
        mismatchTop: mapOpenRoles.mismatchTop,
        basis: mapOpenRoles.basis,
      },
      jobsStamp: {
        withOpenRolesAt: mapJobsStamp.withOpenRolesAt,
        withoutOpenRolesAt: mapJobsStamp.withoutOpenRolesAt,
        invalid: mapJobsStamp.invalid,
        minHours: mapJobsStamp.minHours,
        maxHours: mapJobsStamp.maxHours,
        medianHours: mapJobsStamp.medianHours,
        ge24h: mapJobsStamp.ge24h,
        ge72h: mapJobsStamp.ge72h,
        ge24Share: mapJobsStamp.ge24Share,
        withJobsUrl: mapJobsStamp.withJobsUrl,
        withOpenRoles: mapJobsStamp.withOpenRoles,
        withAtsSource: mapJobsStamp.withAtsSource,
        withJobsSource: mapJobsStamp.withJobsSource,
        jobsUrlNoStamp: mapJobsStamp.jobsUrlNoStamp,
        stampNoJobsUrl: mapJobsStamp.stampNoJobsUrl,
        openRolesNoStamp: mapJobsStamp.openRolesNoStamp,
        byAgeBucket: mapJobsStamp.byAgeBucket,
        byJobsSource: mapJobsStamp.byJobsSource,
        byAtsSource: mapJobsStamp.byAtsSource,
        basis: mapJobsStamp.basis,
      },
      coverage: map?.coverage
        ? {
            roleAgingAt: map.coverage.roleAgingAt || null,
            companiesWithObservedOpen: map.coverage.companiesWithObservedOpen || null,
            companiesWithPostedAging: map.coverage.companiesWithPostedAging || null,
          }
        : null,
    },
    aging: aging
      ? {
          companyCount: aging.companyCount || null,
          companiesWithAgingRole: aging.companiesWithAgingRole || null,
          today: aging.today || null,
        }
      : null,
    export: exportDoc
      ? {
          schema: exportDoc.schema || null,
          generatedAt: exportDoc.generatedAt || null,
          researchGreen: exportDoc.researchEvidence?.green === true,
          ...exportSums,
          req: {
            boards: exportReq.boards,
            openReqSum: exportReq.openReqSum,
            withAttributed: exportReq.withAttributed,
            withStaleAttributed: exportReq.withStaleAttributed,
            withEvergreen: exportReq.withEvergreen,
            withGhStaleUpdate: exportReq.withGhStaleUpdate,
            withReopened: exportReq.withReopened,
            withResearch: exportReq.withResearch,
            attributedSum: exportReq.attributedSum,
            staleAttributedSum: exportReq.staleAttributedSum,
            evergreenSum: exportReq.evergreenSum,
            ghStaleUpdateSum: exportReq.ghStaleUpdateSum,
            reopenedSum: exportReq.reopenedSum,
            byOpenReqBucket: exportReq.byOpenReqBucket,
            byProvider: exportReq.byProvider,
            byAgeBasis: exportReq.byAgeBasis,
            byCompanyTop: exportReq.byCompanyTop,
            basis: exportReq.basis,
          },
          seniority: {
            boards: exportSeniority.boards,
            withMix: exportSeniority.withMix,
            withoutMix: exportSeniority.withoutMix,
            roleSum: exportSeniority.roleSum,
            specified: exportSeniority.specified,
            unspecified: exportSeniority.unspecified,
            specifiedShare: exportSeniority.specifiedShare,
            byLevel: exportSeniority.byLevel,
            boardsMajorityUnspecified: exportSeniority.boardsMajorityUnspecified,
            basis: exportSeniority.basis,
          },
          location: {
            boards: exportLocation.boards,
            locationLabelSum: exportLocation.locationLabelSum,
            multiLocation: exportLocation.multiLocation,
            singleLocation: exportLocation.singleLocation,
            multiShare: exportLocation.multiShare,
            maxDistinct: exportLocation.maxDistinct,
            withRemote: exportLocation.withRemote,
            byDistinctBucket: exportLocation.byDistinctBucket,
            byCompanyTop: exportLocation.byCompanyTop,
            basis: exportLocation.basis,
          },
          fn: {
            boards: exportFn.boards,
            engSum: exportFn.engSum,
            salesSum: exportFn.salesSum,
            peopleOpsSum: exportFn.peopleOpsSum,
            remoteSum: exportFn.remoteSum,
            engDominant: exportFn.engDominant,
            salesDominant: exportFn.salesDominant,
            peopleDominant: exportFn.peopleDominant,
            noEng: exportFn.noEng,
            remoteHeavy: exportFn.remoteHeavy,
            engShareOfOpen: exportFn.engShareOfOpen,
            byEngShareBucket: exportFn.byEngShareBucket,
            basis: exportFn.basis,
          },
          churn: {
            boards: exportChurn.boards,
            withFirstObservedToday: exportChurn.withFirstObservedToday,
            firstObservedTodaySum: exportChurn.firstObservedTodaySum,
            withClosedToday: exportChurn.withClosedToday,
            closedTodaySum: exportChurn.closedTodaySum,
            withReopened: exportChurn.withReopened,
            reopenedSum: exportChurn.reopenedSum,
            withOlderPostedFirstSeen: exportChurn.withOlderPostedFirstSeen,
            olderPostedFirstSeenSum: exportChurn.olderPostedFirstSeenSum,
            activeChurn: exportChurn.activeChurn,
            activeChurnShare: exportChurn.activeChurnShare,
            netObservedToday: exportChurn.netObservedToday,
            byProviderChurn: exportChurn.byProviderChurn,
            byCompanyFirstTop: exportChurn.byCompanyFirstTop,
            byCompanyClosedTop: exportChurn.byCompanyClosedTop,
            basis: exportChurn.basis,
          },
          age: {
            boards: exportAge.boards,
            withMaxAttributed: exportAge.withMaxAttributed,
            withoutMaxAttributed: exportAge.withoutMaxAttributed,
            maxAttributedDays: exportAge.maxAttributedDays,
            boardsAttributedGe90: exportAge.boardsAttributedGe90,
            boardsAttributedGe365: exportAge.boardsAttributedGe365,
            byMaxAttributedBucket: exportAge.byMaxAttributedBucket,
            withMaxObserved: exportAge.withMaxObserved,
            withoutMaxObserved: exportAge.withoutMaxObserved,
            maxObservedDays: exportAge.maxObservedDays,
            boardsObservedGe7: exportAge.boardsObservedGe7,
            byMaxObservedBucket: exportAge.byMaxObservedBucket,
            byCompanyAttributedGe90Top: exportAge.byCompanyAttributedGe90Top,
            basis: exportAge.basis,
          },
          researchJoin: {
            boards: exportResearch.boards,
            withResearch: exportResearch.withResearch,
            withoutResearch: exportResearch.withoutResearch,
            researchShare: exportResearch.researchShare,
            quarantineHiring: exportResearch.quarantineHiring,
            acceptedFieldSum: exportResearch.acceptedFieldSum,
            avgAcceptedFields: exportResearch.avgAcceptedFields,
            byStatus: exportResearch.byStatus,
            bySource: exportResearch.bySource,
            byAcceptedField: exportResearch.byAcceptedField,
            byCompanyTop: exportResearch.byCompanyTop,
            basis: exportResearch.basis,
          },
          sample: {
            boards: exportSample.boards,
            withSampleRoleTitle: exportSample.withSampleRoleTitle,
            withSampleRoleUrl: exportSample.withSampleRoleUrl,
            withSampleLocation: exportSample.withSampleLocation,
            coreSampleComplete: exportSample.coreSampleComplete,
            coreSampleShare: exportSample.coreSampleShare,
            withSamplePeopleOps: exportSample.withSamplePeopleOps,
            withSampleAttributed: exportSample.withSampleAttributed,
            withNoAgencyQuote: exportSample.withNoAgencyQuote,
            withNoAgencyUrl: exportSample.withNoAgencyUrl,
            peopleOpsSampleShare: exportSample.peopleOpsSampleShare,
            attributedSampleShare: exportSample.attributedSampleShare,
            byProviderPeopleOps: exportSample.byProviderPeopleOps,
            byProviderAttributed: exportSample.byProviderAttributed,
            basis: exportSample.basis,
          },
          relationships: {
            present: exportRelationships.present,
            nodes: exportRelationships.nodes,
            edges: exportRelationships.edges,
            byNodeType: exportRelationships.byNodeType,
            byEdgeType: exportRelationships.byEdgeType,
            openRolesAvailable: exportRelationships.openRolesAvailable,
            openRolesOmitted: exportRelationships.openRolesOmitted,
            openRolesInGraph: exportRelationships.openRolesInGraph,
            omitShare: exportRelationships.omitShare,
            companies: exportRelationships.companies,
            boards: exportRelationships.boards,
            providers: exportRelationships.providers,
            claims: exportRelationships.claims,
            researchSources: exportRelationships.researchSources,
            scope: exportRelationships.scope,
            roleLimitPerBoard: exportRelationships.roleLimitPerBoard,
            basis: exportRelationships.basis,
          },
          provider: {
            providers: exportProvider.providers,
            companiesSum: exportProvider.companiesSum,
            openRolesSum: exportProvider.openRolesSum,
            firstObservedTodaySum: exportProvider.firstObservedTodaySum,
            closedTodaySum: exportProvider.closedTodaySum,
            reopenedOpenSum: exportProvider.reopenedOpenSum,
            attributedPostedSum: exportProvider.attributedPostedSum,
            staleAttributedSum: exportProvider.staleAttributedSum,
            evergreenAttributedSum: exportProvider.evergreenAttributedSum,
            providersWithAttributed: exportProvider.providersWithAttributed,
            providersWithoutAttributed: exportProvider.providersWithoutAttributed,
            attributedShareOfOpen: exportProvider.attributedShareOfOpen,
            observedProviders: exportProvider.observedProviders,
            strategy: exportProvider.strategy,
            byProvider: exportProvider.byProvider,
            basis: exportProvider.basis,
          },
          diagnostics: {
            collisions: exportDiagnostics.collisions,
            duplicateBoards: exportDiagnostics.duplicateBoards,
            noAgencyEvidenceRows: exportDiagnostics.noAgencyEvidenceRows,
            noAgencyRoleSum: exportDiagnostics.noAgencyRoleSum,
            changedCompanies: exportDiagnostics.changedCompanies,
            changedFirstSum: exportDiagnostics.changedFirstSum,
            changedClosedSum: exportDiagnostics.changedClosedSum,
            changedReopenedSum: exportDiagnostics.changedReopenedSum,
            changedOlderPostedSum: exportDiagnostics.changedOlderPostedSum,
            byProviderChanged: exportDiagnostics.byProviderChanged,
            rows: exportDiagnostics.rows,
            rowsBeforeTop: exportDiagnostics.rowsBeforeTop,
            ledgerOpenRoleKeys: exportDiagnostics.ledgerOpenRoleKeys,
            unmatchedAtsCompanies: exportDiagnostics.unmatchedAtsCompanies,
            boardCollisions: exportDiagnostics.boardCollisions,
            duplicateMapBoards: exportDiagnostics.duplicateMapBoards,
            deniedBoards: exportDiagnostics.deniedBoards,
            rowsWithCompanyResearch: exportDiagnostics.rowsWithCompanyResearch,
            rowsWithLiveReplayedResearch: exportDiagnostics.rowsWithLiveReplayedResearch,
            rowsWithUnreplayedCatalogResearch: exportDiagnostics.rowsWithUnreplayedCatalogResearch,
            changedCompaniesBeforeTop: exportDiagnostics.changedCompaniesBeforeTop,
            identityClean: exportDiagnostics.identityClean,
            basis: exportDiagnostics.basis,
          },
          domain: {
            boards: exportDomain.boards,
            withDomain: exportDomain.withDomain,
            emptyDomain: exportDomain.emptyDomain,
            invalid: exportDomain.invalid,
            com: exportDomain.com,
            ai: exportDomain.ai,
            io: exportDomain.io,
            comShare: exportDomain.comShare,
            aiShare: exportDomain.aiShare,
            multiLabelHost: exportDomain.multiLabelHost,
            multiLabelShare: exportDomain.multiLabelShare,
            byTld: exportDomain.byTld,
            byHostTop: exportDomain.byHostTop,
            multiHost: exportDomain.multiHost,
            byProvider: exportDomain.byProvider,
            basis: exportDomain.basis,
          },
          jobsUrl: {
            boards: exportJobsUrl.boards,
            withJobsUrl: exportJobsUrl.withJobsUrl,
            noJobsUrl: exportJobsUrl.noJobsUrl,
            invalid: exportJobsUrl.invalid,
            primary: exportJobsUrl.primary,
            secondary: exportJobsUrl.secondary,
            yc: exportJobsUrl.yc,
            other: exportJobsUrl.other,
            primaryShare: exportJobsUrl.primaryShare,
            providerHostMatch: exportJobsUrl.providerHostMatch,
            providerHostMismatch: exportJobsUrl.providerHostMismatch,
            byHostClass: exportJobsUrl.byHostClass,
            byHost: exportJobsUrl.byHost,
            byProviderClass: exportJobsUrl.byProviderClass,
            basis: exportJobsUrl.basis,
          },
          license: {
            boards: exportLicense.boards,
            withLicense: exportLicense.withLicense,
            withoutLicense: exportLicense.withoutLicense,
            ycPublic: exportLicense.ycPublic,
            cc0: exportLicense.cc0,
            hnPublic: exportLicense.hnPublic,
            ycPublicShare: exportLicense.ycPublicShare,
            withSourceUrl: exportLicense.withSourceUrl,
            byLicense: exportLicense.byLicense,
            bySourceHost: exportLicense.bySourceHost,
            byProviderLicense: exportLicense.byProviderLicense,
            basis: exportLicense.basis,
          },
          retrieved: {
            boards: exportRetrieved.boards,
            withRetrievedAt: exportRetrieved.withRetrievedAt,
            withoutRetrievedAt: exportRetrieved.withoutRetrievedAt,
            invalid: exportRetrieved.invalid,
            minHours: exportRetrieved.minHours,
            maxHours: exportRetrieved.maxHours,
            medianHours: exportRetrieved.medianHours,
            ge24h: exportRetrieved.ge24h,
            ge72h: exportRetrieved.ge72h,
            ge24Share: exportRetrieved.ge24Share,
            byAgeBucket: exportRetrieved.byAgeBucket,
            byProvider: exportRetrieved.byProvider,
            basis: exportRetrieved.basis,
          },
          identity: {
            boards: exportIdentity.boards,
            withMapCompanyId: exportIdentity.withMapCompanyId,
            withoutMapCompanyId: exportIdentity.withoutMapCompanyId,
            withSlug: exportIdentity.withSlug,
            withoutSlug: exportIdentity.withoutSlug,
            withDomain: exportIdentity.withDomain,
            withoutDomain: exportIdentity.withoutDomain,
            withName: exportIdentity.withName,
            emptyName: exportIdentity.emptyName,
            slugDomainAlign: exportIdentity.slugDomainAlign,
            slugDomainMisalign: exportIdentity.slugDomainMisalign,
            alignShare: exportIdentity.alignShare,
            byIdScheme: exportIdentity.byIdScheme,
            byProviderMisalign: exportIdentity.byProviderMisalign,
            misalignSamples: exportIdentity.misalignSamples,
            basis: exportIdentity.basis,
          },
        }
      : null,
    research: research || null,
    note:
      'Public-attributable hiring facts only. withAgencyPolicy / peopleFn / workplace / observedAge / postedAge / seniority / reopen / closed / postedDateRecycle / usPosted are positive counts, not scores. ' +
      'boardActivity newOpen/closed are observation facts (exits≠filled); short-history flags mean not mature rates. ' +
      'byProvider/byFn are in-window open landscape counts (not scores). ' +
      'workplace buckets come from location text only (city-only=unspecified). ' +
      'observedAge is firstSeen depth only; postedAge is first_published board age only (stamps excluded); not ghost-job %. ' +
      'seniority is title-heuristic buckets only (not leveling scores). ' +
      'reopen is board reappearance after successful omit (not filled/hired). ' +
      'closed is lifetime board-omit tallies (not filled/hired; windowed exits on boardActivity). ' +
      'postedDateRecycle means board-reported post date changed while open (stored age is lower bound). ' +
      'usPosted is location-gate geography observation only (not EOR/visa product). ' +
      'map.ats is jobsUrl host/source landscape (secondary yield owner-gated; no new scrapers).',
  };
}

/**
 * AR-28-thin: map ATS host/source landscape from owned map rows (no poll, no new scrapers).
 * Primary = Greenhouse/Ashby/Lever/Workable; secondary = Personio/Recruitee/SmartRecruiters.
 * Counts only — not a board-quality score; secondary yield stays owner-gated.
 */
export function measureMapAtsLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const byHostClass = Object.create(null);
  const byAtsSource = Object.create(null);
  const byHost = Object.create(null);
  let withJobsUrl = 0;
  let noJobsUrl = 0;
  let withOpenRoles = 0;
  let jobsUrlNoOpenRoles = 0;
  let primary = 0;
  let secondary = 0;
  let primaryOpen = 0;
  let secondaryOpen = 0;
  let ycJobsPage = 0;
  const classifyHost = (url) => {
    const u = String(url || '').toLowerCase();
    if (!u) return { class: 'none', host: null };
    let host = null;
    try {
      host = new URL(url).hostname.replace(/^www\./, '').slice(0, 80) || null;
    } catch {
      host = null;
    }
    if (/personio\.|recruitee\.|smartrecruiters\./.test(u)) return { class: 'secondary', host };
    if (/greenhouse\.|ashbyhq\.|lever\.co|workable\./.test(u)) return { class: 'primary', host };
    if (/ycombinator\.com/.test(u)) return { class: 'yc', host };
    return { class: 'other', host };
  };
  for (const c of cos) {
    const openN = Number(c.openRoles) || 0;
    const ats = String(c.atsSource || (c.jobsUrl ? 'url-only' : 'none')).slice(0, 40) || 'none';
    byAtsSource[ats] = (byAtsSource[ats] || 0) + 1;
    if (!c.jobsUrl) {
      noJobsUrl += 1;
      byHostClass.none = (byHostClass.none || 0) + 1;
      continue;
    }
    withJobsUrl += 1;
    if (openN > 0) withOpenRoles += 1;
    else jobsUrlNoOpenRoles += 1;
    const { class: hc, host } = classifyHost(c.jobsUrl);
    byHostClass[hc] = (byHostClass[hc] || 0) + 1;
    if (host) byHost[host] = (byHost[host] || 0) + 1;
    if (hc === 'primary') {
      primary += 1;
      if (openN > 0) primaryOpen += 1;
    } else if (hc === 'secondary') {
      secondary += 1;
      if (openN > 0) secondaryOpen += 1;
    } else if (hc === 'yc') {
      ycJobsPage += 1;
    }
  }
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    companies: cos.length,
    withJobsUrl,
    noJobsUrl,
    withOpenRoles,
    jobsUrlNoOpenRoles,
    primary,
    secondary,
    primaryOpen,
    secondaryOpen,
    ycJobsPage,
    byHostClass: rank(byHostClass, 'class'),
    byHost: rank(byHost, 'host'),
    byAtsSource: rank(byAtsSource, 'atsSource'),
    basis:
      'map jobsUrl host class + atsSource counts only; secondary=Personio/Recruitee/SR; primary=GH/Ashby/Lever/Workable; no new scrapers; secondary open yield remains owner-gated',
  };
}

/**
 * Wellfound/atlas residual — map company source + YC tag landscape (counts only).
 * Uses owned tags/source/inceptionYear/hiring/ledgerOpenRoles — not stage scores.
 */
export function measureMapSourceLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  let ycTagged = 0;
  let withYcBatch = 0;
  let wikidata = 0;
  let hnHiring = 0;
  let hiringLabeled = 0;
  let withLedgerOpen = 0;
  let withInception = 0;
  const bySource = Object.create(null);
  const byBatch = Object.create(null);
  const byInceptionDecade = Object.create(null);
  for (const c of cos) {
    const src = String(c.source || 'unknown').slice(0, 40) || 'unknown';
    bySource[src] = (bySource[src] || 0) + 1;
    const tags = Array.isArray(c.tags) ? c.tags.map((x) => String(x || '')) : [];
    const tagL = tags.map((x) => x.toLowerCase());
    if (tagL.some((x) => x === 'yc' || x.startsWith('yc ') || x.includes('y combinator'))) {
      ycTagged += 1;
    }
    for (const raw of tags) {
      if (/^YC\s+/i.test(raw) || /^Y Combinator/i.test(raw)) {
        withYcBatch += 1;
        const batch = String(raw).slice(0, 40);
        byBatch[batch] = (byBatch[batch] || 0) + 1;
        break; // one batch stamp per company
      }
    }
    if (tagL.some((x) => x.includes('wikidata'))) wikidata += 1;
    if (tagL.some((x) => x === 'hn-hiring' || x.includes('hn-hiring'))) hnHiring += 1;
    if (c.hiring === true || c.hiring === 1 || c.hiring === 'true' || c.hiring === 'yes') {
      hiringLabeled += 1;
    }
    if ((Number(c.ledgerOpenRoles) || 0) > 0) withLedgerOpen += 1;
    const y = Number(c.inceptionYear);
    if (Number.isFinite(y) && y >= 1970 && y <= 2030) {
      withInception += 1;
      const decade = `${Math.floor(y / 10) * 10}s`;
      byInceptionDecade[decade] = (byInceptionDecade[decade] || 0) + 1;
    }
  }
  const rank = (obj, keyName, n = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const n = cos.length;
  return {
    companies: n,
    ycTagged,
    ycShare: n ? Number((ycTagged / n).toFixed(4)) : 0,
    withYcBatch,
    wikidata,
    hnHiring,
    hiringLabeled,
    withLedgerOpen,
    withInception,
    bySource: rank(bySource, 'source'),
    byYcBatchTop: rank(byBatch, 'batch', 10),
    byInceptionDecade: rank(byInceptionDecade, 'decade'),
    basis:
      'map company tags/source/inceptionYear/hiring/ledgerOpenRoles tallies only; YC batch from tags; not a stage score or fundraising product',
  };
}

/** Map hiring flag: only explicit yes is labeled hiring (unknown/null are not claims). */
export function isMapHiringYes(company) {
  const h = company?.hiring;
  return h === true || h === 1 || h === 'true' || h === 'yes';
}

/**
 * Common Room residual — map hiring-label vs ledger-open honesty (counts only).
 * Surfaces labeled-hiring without open ledger roles (and inverse) without inventing demand scores.
 */
export function measureMapHiringHonestyLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  let hiringYes = 0;
  let hiringUnknown = 0;
  let hiringNull = 0;
  let withLedgerOpen = 0;
  let withJobsUrl = 0;
  let hiringYesWithLedger = 0;
  let hiringYesNoLedger = 0;
  let ledgerOpenNotHiringYes = 0;
  let hiringYesWithJobsUrl = 0;
  let hiringYesNoJobsUrl = 0;
  for (const c of cos) {
    const yes = isMapHiringYes(c);
    const ledger = (Number(c.ledgerOpenRoles) || 0) > 0;
    const jobs = Boolean(c.jobsUrl);
    if (yes) hiringYes += 1;
    else if (c.hiring === 'unknown') hiringUnknown += 1;
    else hiringNull += 1;
    if (ledger) withLedgerOpen += 1;
    if (jobs) withJobsUrl += 1;
    if (yes && ledger) hiringYesWithLedger += 1;
    if (yes && !ledger) hiringYesNoLedger += 1;
    if (ledger && !yes) ledgerOpenNotHiringYes += 1;
    if (yes && jobs) hiringYesWithJobsUrl += 1;
    if (yes && !jobs) hiringYesNoJobsUrl += 1;
  }
  const n = cos.length;
  return {
    companies: n,
    hiringYes,
    hiringUnknown,
    hiringNull,
    withLedgerOpen,
    withJobsUrl,
    hiringYesWithLedger,
    hiringYesNoLedger,
    ledgerOpenNotHiringYes,
    hiringYesWithJobsUrl,
    hiringYesNoJobsUrl,
    hiringYesShare: n ? Number((hiringYes / n).toFixed(4)) : 0,
    labeledWithoutLedgerShare: hiringYes
      ? Number((hiringYesNoLedger / hiringYes).toFixed(4))
      : 0,
    basis:
      'map hiring flag (yes|unknown|null) vs ledgerOpenRoles>0 vs jobsUrl presence; yes without ledger is label lag/stale-label honesty — not demand or quality scores',
  };
}

/** Description length bucket for map profile completeness (not quality). */
export function mapDescriptionBucket(description) {
  const s = String(description ?? '').trim();
  if (!s) return 'empty';
  if (s.length < 40) return 'short';
  if (s.length < 200) return 'medium';
  return 'long';
}

/**
 * Clearbit/Apollo residual — map company profile field completeness (counts only).
 * Website / description length / inception / neighborhood / locationPrecision presence —
 * not firmographic quality scores or invented headcount.
 */
export function measureMapProfileLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  let withWebsite = 0;
  let emptyWebsite = 0;
  let withDescription = 0;
  let emptyDescription = 0;
  let shortDescription = 0;
  let withInception = 0;
  let withNeighborhood = 0;
  let coreComplete = 0;
  const byDescBucket = Object.create(null);
  const byLocationPrecision = Object.create(null);
  for (const c of cos) {
    const web = String(c.website ?? '').trim();
    const hasWeb = Boolean(web);
    if (hasWeb) withWebsite += 1;
    else emptyWebsite += 1;
    const bucket = mapDescriptionBucket(c.description);
    byDescBucket[bucket] = (byDescBucket[bucket] || 0) + 1;
    if (bucket === 'empty') emptyDescription += 1;
    else withDescription += 1;
    if (bucket === 'short') shortDescription += 1;
    const y = Number(c.inceptionYear);
    const hasInc = Number.isFinite(y) && y >= 1970 && y <= 2030;
    if (hasInc) withInception += 1;
    const neigh = String(c.neighborhood ?? '').trim();
    if (neigh) withNeighborhood += 1;
    const prec = String(c.locationPrecision ?? '').trim() || '(null)';
    byLocationPrecision[prec] = (byLocationPrecision[prec] || 0) + 1;
    // Core directory row: website + non-empty description + valid inception year.
    if (hasWeb && bucket !== 'empty' && hasInc) coreComplete += 1;
  }
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const n = cos.length;
  return {
    companies: n,
    withWebsite,
    emptyWebsite,
    withDescription,
    emptyDescription,
    shortDescription,
    withInception,
    withNeighborhood,
    coreComplete,
    coreCompleteShare: n ? Number((coreComplete / n).toFixed(4)) : 0,
    byDescBucket: rank(byDescBucket, 'bucket'),
    byLocationPrecision: rank(byLocationPrecision, 'precision'),
    basis:
      'map website/description/inceptionYear/neighborhood/locationPrecision presence only; desc buckets empty|<40|40-199|≥200 chars; core=website+nonempty-desc+inception — not firmographic quality, headcount, or enrichment scores',
  };
}

/** Company age cohort from inception year vs asOfYear (not stage score). */
export function mapInceptionAgeCohort(ageYears) {
  const a = Number(ageYears);
  if (!Number.isFinite(a) || a < 0) return '(invalid)';
  if (a <= 2) return '0-2y';
  if (a <= 5) return '3-5y';
  if (a <= 10) return '6-10y';
  if (a <= 20) return '11-20y';
  return '20y+';
}

/**
 * Crunchbase / Clearbit residual — map inceptionYear age-cohort landscape (counts only).
 * Company age from inceptionYear (asOfYear − year) + decade/year tallies + jobs/hiring presence.
 * Complements map.profile (withInception scalar) and map.source byInceptionDecade.
 * Not stage, fundraising, or firmographic quality scores.
 */
export function measureMapInceptionLandscape(map, { asOfYear } = {}) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const year =
    asOfYear != null && Number.isFinite(Number(asOfYear))
      ? Number(asOfYear)
      : new Date().getUTCFullYear();
  let withInception = 0;
  let withoutInception = 0;
  let invalid = 0;
  let withJobsUrl = 0;
  let jobsWithInception = 0;
  let hiringYes = 0;
  let hiringWithInception = 0;
  let young0to2 = 0;
  const years = [];
  const ages = [];
  const byAgeCohort = Object.create(null);
  const byDecade = Object.create(null);
  const byYear = Object.create(null);
  for (const c of cos) {
    const hasJobs = Boolean(String(c.jobsUrl ?? '').trim());
    if (hasJobs) withJobsUrl += 1;
    const hireYes =
      c.hiring === true || c.hiring === 1 || c.hiring === 'true' || c.hiring === 'yes';
    if (hireYes) hiringYes += 1;
    const raw = c.inceptionYear;
    if (raw == null || raw === '') {
      withoutInception += 1;
      byAgeCohort['(none)'] = (byAgeCohort['(none)'] || 0) + 1;
      continue;
    }
    const y = Number(raw);
    if (!Number.isFinite(y) || y < 1970 || y > 2030) {
      invalid += 1;
      byAgeCohort['(invalid)'] = (byAgeCohort['(invalid)'] || 0) + 1;
      continue;
    }
    withInception += 1;
    if (hasJobs) jobsWithInception += 1;
    if (hireYes) hiringWithInception += 1;
    years.push(y);
    const age = Math.max(0, year - y);
    ages.push(age);
    const cohort = mapInceptionAgeCohort(age);
    byAgeCohort[cohort] = (byAgeCohort[cohort] || 0) + 1;
    if (cohort === '0-2y') young0to2 += 1;
    const decade = `${Math.floor(y / 10) * 10}s`;
    byDecade[decade] = (byDecade[decade] || 0) + 1;
    byYear[String(y)] = (byYear[String(y)] || 0) + 1;
  }
  years.sort((a, b) => a - b);
  ages.sort((a, b) => a - b);
  const median = (arr) => {
    if (!arr.length) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
  };
  const n = cos.length;
  const rank = (obj, keyName, top = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, top)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    companies: n,
    withInception,
    withoutInception,
    invalid,
    asOfYear: year,
    minYear: years.length ? years[0] : null,
    maxYear: years.length ? years[years.length - 1] : null,
    medianYear: median(years),
    minAgeYears: ages.length ? ages[0] : null,
    maxAgeYears: ages.length ? ages[ages.length - 1] : null,
    medianAgeYears: median(ages),
    young0to2,
    young0to2Share: withInception ? Number((young0to2 / withInception).toFixed(4)) : 0,
    withJobsUrl,
    jobsWithInception,
    hiringYes,
    hiringWithInception,
    byAgeCohort: rank(byAgeCohort, 'cohort'),
    byDecade: rank(byDecade, 'decade'),
    byYearTop: rank(byYear, 'year', 10),
    basis:
      'map inceptionYear age cohorts (asOfYear−year → 0-2y/3-5y/6-10y/11-20y/20y+) + decade/year tallies + jobsUrl/hiringYes presence; not stage, fundraising, headcount, or firmographic quality scores (see map.profile withInception + map.source byInceptionDecade)',
  };
}

/**
 * Firecrawl residual — map company retrievedAt freshness landscape (counts only).
 * Directory-wide stamp age (hours since map company retrievedAt), not role post age.
 * Complements export.retrieved (hiring-board subset only).
 */
export function measureMapRetrievedLandscape(map, { now } = {}) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const nowMs = now != null ? Number(now) : Date.now();
  let withRetrievedAt = 0;
  let withoutRetrievedAt = 0;
  let invalid = 0;
  let ge24h = 0;
  let ge72h = 0;
  let withJobsUrl = 0;
  let jobsGe24h = 0;
  const hoursList = [];
  const byAgeBucket = Object.create(null);
  const bySourceHours = Object.create(null);
  for (const c of cos) {
    const hasJobs = Boolean(String(c.jobsUrl ?? '').trim());
    if (hasJobs) withJobsUrl += 1;
    const raw = c.retrievedAt;
    if (raw == null || raw === '') {
      withoutRetrievedAt += 1;
      byAgeBucket['(none)'] = (byAgeBucket['(none)'] || 0) + 1;
      continue;
    }
    const t = Date.parse(String(raw));
    if (!Number.isFinite(t)) {
      invalid += 1;
      byAgeBucket['(invalid)'] = (byAgeBucket['(invalid)'] || 0) + 1;
      continue;
    }
    withRetrievedAt += 1;
    const hours = Math.max(0, (nowMs - t) / 3_600_000);
    hoursList.push(hours);
    const bucket = exportRetrievedAgeBucket(hours);
    byAgeBucket[bucket] = (byAgeBucket[bucket] || 0) + 1;
    if (hours >= 24) {
      ge24h += 1;
      if (hasJobs) jobsGe24h += 1;
    }
    if (hours >= 72) ge72h += 1;
    const src = String(c.source || 'unknown').slice(0, 40) || 'unknown';
    if (!bySourceHours[src]) bySourceHours[src] = [];
    bySourceHours[src].push(hours);
  }
  hoursList.sort((a, b) => a - b);
  const median = (arr) => {
    if (!arr.length) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2
      ? Number(arr[mid].toFixed(2))
      : Number(((arr[mid - 1] + arr[mid]) / 2).toFixed(2));
  };
  const n = cos.length;
  const rank = (obj, keyName, top = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, top)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const bySource = Object.entries(bySourceHours)
    .map(([source, hs]) => {
      const sorted = [...hs].sort((a, b) => a - b);
      return {
        source,
        n: sorted.length,
        medianHours: median(sorted),
        maxHours: sorted.length ? Number(sorted[sorted.length - 1].toFixed(2)) : null,
      };
    })
    .sort((a, b) => b.n - a.n || (a.source < b.source ? -1 : 1))
    .slice(0, 10);
  return {
    companies: n,
    withRetrievedAt,
    withoutRetrievedAt,
    invalid,
    minHours: hoursList.length ? Number(hoursList[0].toFixed(2)) : null,
    maxHours: hoursList.length ? Number(hoursList[hoursList.length - 1].toFixed(2)) : null,
    medianHours: median(hoursList),
    ge24h,
    ge72h,
    ge24Share: n ? Number((ge24h / n).toFixed(4)) : 0,
    withJobsUrl,
    jobsGe24h,
    byAgeBucket: rank(byAgeBucket, 'bucket'),
    bySource,
    basis:
      'map company retrievedAt age (hours since directory stamp) only; buckets reuse exportRetrievedAgeBucket; jobsGe24h=jobsUrl companies ≥24h old; not role post age, ghost-job %, or quality ranks (see export.retrieved for hiring-board subset)',
  };
}

/**
 * Wellfound / Atlas residual — map company tags landscape (counts only).
 * Tag-count mix (0/1/multi) + provenance tags (yc / YC batch / wikidata / hn-hiring).
 * Complements map.source (source field + batch tallies without multi-tag share).
 * Not a skill graph, topic model, or company quality rank.
 */
export function measureMapTagsLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  let withTags = 0;
  let withoutTags = 0;
  let singleTag = 0;
  let multiTag = 0;
  let ycTag = 0;
  let ycBatchTag = 0;
  let wikidataTag = 0;
  let hnTag = 0;
  let withJobsUrl = 0;
  let jobsMultiTag = 0;
  const byTagCount = Object.create(null);
  const byTag = Object.create(null);
  for (const c of cos) {
    const tags = Array.isArray(c.tags) ? c.tags.map((t) => String(t || '').trim()).filter(Boolean) : [];
    const n = tags.length;
    byTagCount[String(n)] = (byTagCount[String(n)] || 0) + 1;
    const hasJobs = Boolean(String(c.jobsUrl ?? '').trim());
    if (hasJobs) withJobsUrl += 1;
    if (n === 0) {
      withoutTags += 1;
      continue;
    }
    withTags += 1;
    if (n === 1) singleTag += 1;
    else {
      multiTag += 1;
      if (hasJobs) jobsMultiTag += 1;
    }
    let sawYc = false;
    let sawBatch = false;
    let sawWd = false;
    let sawHn = false;
    for (const t of tags) {
      const key = t.slice(0, 48);
      byTag[key] = (byTag[key] || 0) + 1;
      const tl = t.toLowerCase();
      if (tl === 'yc') sawYc = true;
      if (/^yc\s/i.test(t) || /^y combinator/i.test(t)) sawBatch = true;
      if (tl.includes('wikidata')) sawWd = true;
      if (tl === 'hn-hiring' || tl.includes('hn-hiring')) sawHn = true;
    }
    if (sawYc) ycTag += 1;
    if (sawBatch) ycBatchTag += 1;
    if (sawWd) wikidataTag += 1;
    if (sawHn) hnTag += 1;
  }
  const n = cos.length;
  const rank = (obj, keyName, top = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, top)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    companies: n,
    withTags,
    withoutTags,
    singleTag,
    multiTag,
    multiShare: n ? Number((multiTag / n).toFixed(4)) : 0,
    ycTag,
    ycBatchTag,
    wikidataTag,
    hnTag,
    withJobsUrl,
    jobsMultiTag,
    byTagCount: rank(byTagCount, 'count'),
    byTagTop: rank(byTag, 'tag'),
    basis:
      'map company tags length mix (0/1/multi) + provenance tag presence (yc, YC batch stamp, wikidata*, hn-hiring) + jobsUrl×multi; not skill graphs, topic models, or company quality ranks (see map.source for source/batch landscape)',
  };
}

/**
 * Parse map company website → hostname + public suffix label (last label only).
 * Not a full PSL; multi-part ccTLDs (co.uk) count as the last label — honesty not geo.
 */
export function mapWebsiteHostParts(website) {
  const raw = String(website ?? '').trim();
  if (!raw) return { host: null, tld: '(invalid)' };
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
    const host = new URL(withScheme).hostname.replace(/^www\./i, '').toLowerCase().slice(0, 80);
    if (!host) return { host: null, tld: '(invalid)' };
    const parts = host.split('.').filter(Boolean);
    const tld = parts.length ? parts[parts.length - 1].slice(0, 24) : '(invalid)';
    return { host, tld: tld || '(invalid)' };
  } catch {
    return { host: null, tld: '(invalid)' };
  }
}

/**
 * Clearbit/Brandfetch residual — map company website host + TLD landscape (counts only).
 * Domain suffix mix (.com/.ai/.io/…) without firmographic quality or geo scores.
 */
export function measureMapWebsiteLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  let withHost = 0;
  let invalid = 0;
  let com = 0;
  let ai = 0;
  let io = 0;
  const byTld = Object.create(null);
  const byHost = Object.create(null);
  for (const c of cos) {
    const { host, tld } = mapWebsiteHostParts(c.website);
    byTld[tld] = (byTld[tld] || 0) + 1;
    if (!host) {
      invalid += 1;
      continue;
    }
    withHost += 1;
    byHost[host] = (byHost[host] || 0) + 1;
    if (tld === 'com') com += 1;
    else if (tld === 'ai') ai += 1;
    else if (tld === 'io') io += 1;
  }
  const rank = (obj, keyName, n = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const multiHost = Object.entries(byHost)
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 8)
    .map(([host, n]) => ({ host, n }));
  const n = cos.length;
  return {
    companies: n,
    withHost,
    invalid,
    com,
    ai,
    io,
    comShare: n ? Number((com / n).toFixed(4)) : 0,
    aiShare: n ? Number((ai / n).toFixed(4)) : 0,
    byTld: rank(byTld, 'tld'),
    byHostTop: rank(byHost, 'host', 8),
    multiHost,
    basis:
      'map website hostname + last-label TLD tallies only (not full PSL); multiHost=same host on >1 company; not domain quality, brand score, or geo product',
  };
}

/**
 * CH-15 / Ashby residual — map company observed-aging landscape (counts only).
 * Company-level oldestObservedDays / agingRoles / medianPostedDays from directory aging enrich —
 * complements ledger.observedAge (role-level). Calendar depth needed for ≥7/≥30 badges; not poll thrash.
 */
export function measureMapAgingLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const byOldestBucket = {
    '0d': 0,
    '1-2d': 0,
    '3-6d': 0,
    '7-13d': 0,
    '14-29d': 0,
    '30d+': 0,
  };
  let withLedgerOpen = 0;
  let withOldestObserved = 0;
  let withoutOldestObserved = 0;
  let maxOldestDays = 0;
  let ge7 = 0;
  let ge30 = 0;
  let withAgingRoles = 0;
  let agingRolesSum = 0;
  let withMedianPosted = 0;
  for (const c of cos) {
    const ledgerN = Number(c.ledgerOpenRoles) || 0;
    if (ledgerN <= 0) continue;
    withLedgerOpen += 1;
    const raw = c.oldestObservedDays;
    const d = Number(raw);
    if (raw == null || !Number.isFinite(d) || d < 0) {
      withoutOldestObserved += 1;
    } else {
      withOldestObserved += 1;
      if (d > maxOldestDays) maxOldestDays = d;
      if (d >= 7) ge7 += 1;
      if (d >= 30) ge30 += 1;
      let b = '30d+';
      if (d <= 0) b = '0d';
      else if (d <= 2) b = '1-2d';
      else if (d <= 6) b = '3-6d';
      else if (d <= 13) b = '7-13d';
      else if (d <= 29) b = '14-29d';
      byOldestBucket[b] += 1;
    }
    const agingN = Number(c.agingRoles) || 0;
    if (agingN > 0) {
      withAgingRoles += 1;
      agingRolesSum += agingN;
    }
    if (c.medianPostedDays != null && Number.isFinite(Number(c.medianPostedDays))) {
      withMedianPosted += 1;
    }
  }
  return {
    withLedgerOpen,
    withOldestObserved,
    withoutOldestObserved,
    maxOldestDays,
    ge7,
    ge30,
    withAgingRoles,
    agingRolesSum,
    withMedianPosted,
    byOldestBucket,
    basis:
      'map companies with ledgerOpenRoles>0: oldestObservedDays buckets + agingRoles + medianPostedDays presence; company-level observation depth (not board posted age); ge7/ge30 badge readiness — not ghost-job scores; calendar time not poll thrash',
  };
}

/**
 * Wikidata / YC residual — map sourceLicense + sourceUrl host landscape (counts only).
 * Provenance license mix (YC-public / CC0 / HN-public) and source host; jobsUrl cross —
 * not a content-quality or copyright-clearance product.
 */
export function measureMapLicenseLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  let withLicense = 0;
  let withoutLicense = 0;
  let ycPublic = 0;
  let cc0 = 0;
  let hnPublic = 0;
  let withJobsUrl = 0;
  const byLicense = Object.create(null);
  const bySourceHost = Object.create(null);
  const byLicenseJobs = Object.create(null);
  for (const c of cos) {
    const lic = String(c.sourceLicense ?? '').trim() || '(null)';
    if (lic === '(null)') withoutLicense += 1;
    else withLicense += 1;
    byLicense[lic] = (byLicense[lic] || 0) + 1;
    if (lic === 'YC-public') ycPublic += 1;
    else if (lic === 'CC0-1.0') cc0 += 1;
    else if (lic === 'HN-public') hnPublic += 1;
    const jobs = Boolean(c.jobsUrl);
    if (jobs) withJobsUrl += 1;
    const cross = `${lic}|${jobs ? 'jobs' : 'noJobs'}`;
    byLicenseJobs[cross] = (byLicenseJobs[cross] || 0) + 1;
    let host = '(invalid)';
    try {
      const raw = String(c.sourceUrl ?? '').trim();
      if (raw) {
        const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
        host = new URL(withScheme).hostname.replace(/^www\./i, '').toLowerCase().slice(0, 80) || '(invalid)';
      }
    } catch {
      host = '(invalid)';
    }
    bySourceHost[host] = (bySourceHost[host] || 0) + 1;
  }
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const n = cos.length;
  return {
    companies: n,
    withLicense,
    withoutLicense,
    ycPublic,
    cc0,
    hnPublic,
    ycPublicShare: n ? Number((ycPublic / n).toFixed(4)) : 0,
    withJobsUrl,
    byLicense: rank(byLicense, 'license'),
    bySourceHost: rank(bySourceHost, 'host'),
    byLicenseJobs: rank(byLicenseJobs, 'key'),
    basis:
      'map sourceLicense + sourceUrl hostname tallies + license×jobsUrl cross; provenance observation only — not copyright clearance, content quality, or company ranks',
  };
}

/**
 * Eightfold residual — map company roleMix landscape (counts only).
 * Full categorizeRole fn taxonomy summed across companies with roleMix enrich;
 * eng-share buckets + eng-dominant companies. Complements export.fn (partial board counts)
 * and ledger.byFn (role-level). Not demand or skill-graph scores.
 */
export function measureMapRoleMixLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const byFn = Object.create(null);
  const byEngShareBucket = {
    '0': 0,
    '0-25': 0,
    '25-50': 0,
    '50-75': 0,
    '75-100': 0,
  };
  let withRoleMix = 0;
  let withoutRoleMix = 0;
  let roleSum = 0;
  let engSum = 0;
  let otherSum = 0;
  let engDominant = 0;
  for (const c of cos) {
    const m = c.roleMix;
    if (!m || typeof m !== 'object' || Array.isArray(m) || !Object.keys(m).length) {
      withoutRoleMix += 1;
      continue;
    }
    withRoleMix += 1;
    let total = 0;
    let eng = 0;
    let topK = null;
    let topN = -1;
    for (const [rawK, rawV] of Object.entries(m)) {
      const k = String(rawK || 'other').slice(0, 40) || 'other';
      const n = Number(rawV) || 0;
      byFn[k] = (byFn[k] || 0) + n;
      total += n;
      if (k === 'engineering') eng += n;
      if (k === 'other') otherSum += n;
      if (n > topN) {
        topN = n;
        topK = k;
      }
    }
    roleSum += total;
    engSum += eng;
    if (total <= 0) continue;
    if (topK === 'engineering') engDominant += 1;
    const sh = eng / total;
    if (sh <= 0) byEngShareBucket['0'] += 1;
    else if (sh < 0.25) byEngShareBucket['0-25'] += 1;
    else if (sh < 0.5) byEngShareBucket['25-50'] += 1;
    else if (sh < 0.75) byEngShareBucket['50-75'] += 1;
    else byEngShareBucket['75-100'] += 1;
  }
  const rank = (obj, keyName) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, n]) => ({ [keyName]: k, n }));
  return {
    companies: cos.length,
    withRoleMix,
    withoutRoleMix,
    roleSum,
    engShareOfRoles: roleSum ? Number((engSum / roleSum).toFixed(4)) : 0,
    otherShareOfRoles: roleSum ? Number((otherSum / roleSum).toFixed(4)) : 0,
    engDominant,
    byFn: rank(byFn, 'fn'),
    byEngShareBucket,
    basis:
      'map company roleMix (categorizeRole) fn sums + eng-share buckets + eng-dominant companies; companies without roleMix excluded from mix math; not skill graphs, demand, or company quality scores',
  };
}

/**
 * Jobs-enrich residual — map openRoles vs ledgerOpenRoles honesty (counts only).
 * openRoles = last jobs-enrich US-posted board stamp; ledgerOpenRoles = role-ledger poll join.
 * Size buckets + match/mismatch/lag crosses. Complements map.ats withOpenRoles and map.hiringHonesty.
 * Not demand scores or company quality ranks.
 */
export function measureMapOpenRolesLandscape(map) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const byOpenBucket = {
    null: 0,
    '1': 0,
    '2-5': 0,
    '6-20': 0,
    '21-100': 0,
    '100+': 0,
  };
  let withOpenRoles = 0;
  let withoutOpenRoles = 0;
  let openRolesSum = 0;
  let maxOpenRoles = 0;
  let withLedgerOpen = 0;
  let bothPresent = 0;
  let countMatch = 0;
  let countMismatch = 0;
  let openNoLedger = 0;
  let ledgerNoOpen = 0;
  let absDeltaSum = 0;
  let openGtLedger = 0;
  let openLtLedger = 0;
  const byCompany = Object.create(null);
  const byAtsMismatch = Object.create(null);
  const mismatchRows = [];
  for (const c of cos) {
    const rawOpen = c.openRoles;
    const open = Number(rawOpen);
    const hasOpen = rawOpen != null && Number.isFinite(open) && open > 0;
    const ledger = Number(c.ledgerOpenRoles) || 0;
    const hasLedger = ledger > 0;
    if (hasLedger) withLedgerOpen += 1;
    if (!hasOpen) {
      withoutOpenRoles += 1;
      byOpenBucket.null += 1;
      if (hasLedger) ledgerNoOpen += 1;
      continue;
    }
    withOpenRoles += 1;
    openRolesSum += open;
    if (open > maxOpenRoles) maxOpenRoles = open;
    if (open === 1) byOpenBucket['1'] += 1;
    else if (open <= 5) byOpenBucket['2-5'] += 1;
    else if (open <= 20) byOpenBucket['6-20'] += 1;
    else if (open <= 100) byOpenBucket['21-100'] += 1;
    else byOpenBucket['100+'] += 1;
    const name = String(c.name || c.id || 'unknown').slice(0, 80) || 'unknown';
    byCompany[name] = (byCompany[name] || 0) + open;
    if (hasLedger) {
      bothPresent += 1;
      const d = Math.abs(open - ledger);
      absDeltaSum += d;
      if (d === 0) countMatch += 1;
      else {
        countMismatch += 1;
        if (open > ledger) openGtLedger += 1;
        else openLtLedger += 1;
        const ats = String(c.atsSource || 'unknown').slice(0, 40) || 'unknown';
        byAtsMismatch[ats] = (byAtsMismatch[ats] || 0) + 1;
        mismatchRows.push({
          company: name,
          open,
          ledger,
          delta: open - ledger,
          ats,
        });
      }
    } else {
      openNoLedger += 1;
    }
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const mismatchTop = mismatchRows
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || (a.company < b.company ? -1 : 1))
    .slice(0, 8);
  const n = cos.length;
  return {
    companies: n,
    withOpenRoles,
    withoutOpenRoles,
    openRolesSum,
    maxOpenRoles,
    withLedgerOpen,
    bothPresent,
    countMatch,
    countMismatch,
    openGtLedger,
    openLtLedger,
    openNoLedger,
    ledgerNoOpen,
    absDeltaSum,
    matchShare: bothPresent ? Number((countMatch / bothPresent).toFixed(4)) : 0,
    byOpenBucket,
    byCompanyTop: rank(byCompany, 'company'),
    byAtsMismatch: rank(byAtsMismatch, 'ats'),
    mismatchTop,
    basis:
      'map openRoles (jobs-enrich US-posted stamp) size buckets + vs ledgerOpenRoles match/mismatch/lag; openGt/LtLedger=directional count when both present; byAtsMismatch + mismatchTop (abs delta) observation lag only — not demand, quality, or fill scores; lag expected between enrich and poll',
  };
}

/**
 * Firecrawl / jobs-enrich residual — map openRolesAt jobs-stamp freshness (counts only).
 * Age of jobs-enrich openRolesAt (hours) + jobsSource mix + jobsUrl/ats coverage.
 * Complements map.retrieved (directory retrievedAt) and map.openRoles (count match).
 * Not role post age, ghost-job %, or demand scores.
 */
export function measureMapJobsStampLandscape(map, { now } = {}) {
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const nowMs = now != null ? Number(now) : Date.now();
  let withOpenRolesAt = 0;
  let withoutOpenRolesAt = 0;
  let invalid = 0;
  let ge24h = 0;
  let ge72h = 0;
  let withJobsUrl = 0;
  let withOpenRoles = 0;
  let withAtsSource = 0;
  let withJobsSource = 0;
  let jobsUrlNoStamp = 0;
  let stampNoJobsUrl = 0;
  let openRolesNoStamp = 0;
  const hoursList = [];
  const byAgeBucket = Object.create(null);
  const byJobsSource = Object.create(null);
  const byAtsSource = Object.create(null);
  for (const c of cos) {
    const hasJobs = Boolean(String(c.jobsUrl ?? '').trim());
    if (hasJobs) withJobsUrl += 1;
    const open = Number(c.openRoles);
    const hasOpen = c.openRoles != null && Number.isFinite(open) && open > 0;
    if (hasOpen) withOpenRoles += 1;
    const ats = String(c.atsSource ?? '').trim();
    if (ats) {
      withAtsSource += 1;
      const ak = ats.slice(0, 40);
      byAtsSource[ak] = (byAtsSource[ak] || 0) + 1;
    }
    const js = String(c.jobsSource ?? '').trim();
    if (js) {
      withJobsSource += 1;
      const jk = js.slice(0, 40);
      byJobsSource[jk] = (byJobsSource[jk] || 0) + 1;
    }
    const raw = c.openRolesAt;
    if (raw == null || raw === '') {
      withoutOpenRolesAt += 1;
      byAgeBucket['(none)'] = (byAgeBucket['(none)'] || 0) + 1;
      if (hasJobs) jobsUrlNoStamp += 1;
      if (hasOpen) openRolesNoStamp += 1;
      continue;
    }
    const t = Date.parse(String(raw));
    if (!Number.isFinite(t)) {
      invalid += 1;
      byAgeBucket['(invalid)'] = (byAgeBucket['(invalid)'] || 0) + 1;
      continue;
    }
    withOpenRolesAt += 1;
    if (!hasJobs) stampNoJobsUrl += 1;
    const hours = Math.max(0, (nowMs - t) / 3_600_000);
    hoursList.push(hours);
    const bucket = exportRetrievedAgeBucket(hours);
    byAgeBucket[bucket] = (byAgeBucket[bucket] || 0) + 1;
    if (hours >= 24) ge24h += 1;
    if (hours >= 72) ge72h += 1;
  }
  hoursList.sort((a, b) => a - b);
  const median = (arr) => {
    if (!arr.length) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2
      ? Number(arr[mid].toFixed(2))
      : Number(((arr[mid - 1] + arr[mid]) / 2).toFixed(2));
  };
  const rank = (obj, keyName, top = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, top)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const n = cos.length;
  return {
    companies: n,
    withOpenRolesAt,
    withoutOpenRolesAt,
    invalid,
    minHours: hoursList.length ? Number(hoursList[0].toFixed(2)) : null,
    maxHours: hoursList.length ? Number(hoursList[hoursList.length - 1].toFixed(2)) : null,
    medianHours: median(hoursList),
    ge24h,
    ge72h,
    ge24Share: withOpenRolesAt ? Number((ge24h / withOpenRolesAt).toFixed(4)) : 0,
    withJobsUrl,
    withOpenRoles,
    withAtsSource,
    withJobsSource,
    jobsUrlNoStamp,
    stampNoJobsUrl,
    openRolesNoStamp,
    byAgeBucket: rank(byAgeBucket, 'bucket'),
    byJobsSource: rank(byJobsSource, 'jobsSource'),
    byAtsSource: rank(byAtsSource, 'ats'),
    basis:
      'map openRolesAt age (hours since jobs-enrich stamp) + jobsSource/atsSource coverage; jobsUrlNoStamp=has jobsUrl without openRolesAt; openRolesNoStamp=has openRoles without stamp; not directory retrievedAt (see map.retrieved), role post age, or demand scores',
  };
}

/**
 * RecruitAI residual — export board open-req honesty landscape (counts only).
 * Open-req size buckets, attributed/stale/evergreen/GH-update/reopen board coverage + sums,
 * provider mix, research join — not company quality or demand scores.
 */
export function measureExportReqLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const byOpenReqBucket = {
    '1': 0,
    '2-5': 0,
    '6-20': 0,
    '21-100': 0,
    '100+': 0,
  };
  let openReqSum = 0;
  let engSum = 0;
  let salesSum = 0;
  let remoteSum = 0;
  let peopleOpsSum = 0;
  let noAgencySum = 0;
  let observed7Sum = 0;
  let withAttributed = 0;
  let withStaleAttributed = 0;
  let withEvergreen = 0;
  let withGhStaleUpdate = 0;
  let withReopened = 0;
  let withResearch = 0;
  let attributedSum = 0;
  let staleAttributedSum = 0;
  let evergreenSum = 0;
  let ghStaleUpdateSum = 0;
  let reopenedSum = 0;
  const byProvider = Object.create(null);
  const byAgeBasis = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const n = Number(r.openReqCount) || 0;
    openReqSum += n;
    engSum += Number(r.openEngReqCount) || 0;
    salesSum += Number(r.openSalesReqCount) || 0;
    remoteSum += Number(r.openRemoteReqCount) || 0;
    peopleOpsSum += Number(r.openPeopleOpsReqCount) || 0;
    noAgencySum += Number(r.noAgencyEvidenceReqCount) || 0;
    observed7Sum += Number(r.openObserved7ReqCount) || 0;
    if (n <= 1) byOpenReqBucket['1'] += 1;
    else if (n <= 5) byOpenReqBucket['2-5'] += 1;
    else if (n <= 20) byOpenReqBucket['6-20'] += 1;
    else if (n <= 100) byOpenReqBucket['21-100'] += 1;
    else byOpenReqBucket['100+'] += 1;
    const attr = Number(r.attributedPostedReqCount) || 0;
    const stale = Number(r.staleAttributedPostedReqCount) || 0;
    const ever = Number(r.evergreenAttributedPostedReqCount) || 0;
    const gh = Number(r.greenhouseStalePostedUpdated7dReqCount) || 0;
    const reo = Number(r.reopenedOpenReqCount) || 0;
    if (attr > 0) {
      withAttributed += 1;
      attributedSum += attr;
    }
    if (stale > 0) {
      withStaleAttributed += 1;
      staleAttributedSum += stale;
    }
    if (ever > 0) {
      withEvergreen += 1;
      evergreenSum += ever;
    }
    if (gh > 0) {
      withGhStaleUpdate += 1;
      ghStaleUpdateSum += gh;
    }
    if (reo > 0) {
      withReopened += 1;
      reopenedSum += reo;
    }
    if (r.companyResearch) withResearch += 1;
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    byProvider[prov] = (byProvider[prov] || 0) + 1;
    const basis = String(r.ageBasis || '(null)').slice(0, 40) || '(null)';
    byAgeBasis[basis] = (byAgeBasis[basis] || 0) + 1;
    const name = String(r.name || r.domain || 'unknown').slice(0, 80) || 'unknown';
    byCompany[name] = (byCompany[name] || 0) + n;
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards: rows.length,
    openReqSum,
    engSum,
    salesSum,
    remoteSum,
    peopleOpsSum,
    noAgencySum,
    observed7Sum,
    withAttributed,
    withStaleAttributed,
    withEvergreen,
    withGhStaleUpdate,
    withReopened,
    withResearch,
    attributedSum,
    staleAttributedSum,
    evergreenSum,
    ghStaleUpdateSum,
    reopenedSum,
    byOpenReqBucket,
    byProvider: rank(byProvider, 'provider'),
    byAgeBasis: rank(byAgeBasis, 'ageBasis'),
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'recruitai export board rows: openReq size buckets + attributed/stale/evergreen/GH-stale-update/reopen board counts & role sums + provider/ageBasis mix; not company quality, demand, or ghost-job scores',
  };
}

/** Export seniorityMix level keys (title-heuristic board aggregates; not leveling scores). */
const EXPORT_SENIORITY_LEVELS = [
  'intern',
  'junior',
  'senior',
  'staff',
  'principal',
  'leadManager',
  'directorPlus',
  'unspecified',
];

/**
 * Ashby residual — export board seniorityMix landscape (counts only).
 * Sums per-board title-heuristic mix already on recruitai-export rows; complements ledger.seniority (role-level).
 * Not leveling/calibration scores or company quality ranks.
 */
export function measureExportSeniorityLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const byLevel = Object.create(null);
  for (const k of EXPORT_SENIORITY_LEVELS) byLevel[k] = 0;
  let withMix = 0;
  let withoutMix = 0;
  let boardsMajorityUnspecified = 0;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const m = r.seniorityMix;
    if (!m || typeof m !== 'object' || Array.isArray(m)) {
      withoutMix += 1;
      continue;
    }
    withMix += 1;
    let rowSum = 0;
    let unspec = 0;
    for (const k of EXPORT_SENIORITY_LEVELS) {
      const n = Number(m[k]) || 0;
      byLevel[k] += n;
      rowSum += n;
      if (k === 'unspecified') unspec = n;
    }
    if (rowSum > 0 && unspec * 2 >= rowSum) boardsMajorityUnspecified += 1;
  }
  const roleSum = EXPORT_SENIORITY_LEVELS.reduce((s, k) => s + byLevel[k], 0);
  const unspecified = byLevel.unspecified || 0;
  const specified = roleSum - unspecified;
  const rank = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([level, n]) => ({ level, n }));
  return {
    boards: rows.length,
    withMix,
    withoutMix,
    roleSum,
    specified,
    unspecified,
    specifiedShare: roleSum ? Number((specified / roleSum).toFixed(4)) : 0,
    byLevel: rank(byLevel),
    boardsMajorityUnspecified,
    basis:
      'export row seniorityMix title-heuristic level sums across boards; majority-unspecified = unspecified≥50% of board openReq; not leveling scores, calibration, or company quality',
  };
}

/**
 * Deel / Rippling residual — export board location diversity landscape (counts only).
 * distinctObservedLocationCount + openRemoteReqCount board coverage; not geo-compliance or EOR product.
 * Complements ledger.metro / usPosted (role-level location text).
 */
export function measureExportLocationLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const byDistinctBucket = {
    '1': 0,
    '2-5': 0,
    '6-20': 0,
    '21-50': 0,
    '50+': 0,
  };
  let locationLabelSum = 0;
  let multiLocation = 0;
  let singleLocation = 0;
  let maxDistinct = 0;
  let withRemote = 0;
  const byCompany = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const n = Number(r.distinctObservedLocationCount) || 0;
    locationLabelSum += n;
    if (n > maxDistinct) maxDistinct = n;
    if (n <= 1) {
      singleLocation += 1;
      byDistinctBucket['1'] += 1;
    } else {
      multiLocation += 1;
      if (n <= 5) byDistinctBucket['2-5'] += 1;
      else if (n <= 20) byDistinctBucket['6-20'] += 1;
      else if (n <= 50) byDistinctBucket['21-50'] += 1;
      else byDistinctBucket['50+'] += 1;
    }
    if ((Number(r.openRemoteReqCount) || 0) > 0) withRemote += 1;
    const name = String(r.name || r.domain || 'unknown').slice(0, 80) || 'unknown';
    byCompany[name] = (byCompany[name] || 0) + n;
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    locationLabelSum,
    multiLocation,
    singleLocation,
    multiShare: boards ? Number((multiLocation / boards).toFixed(4)) : 0,
    maxDistinct,
    withRemote,
    byDistinctBucket,
    byCompanyTop: rank(byCompany, 'company'),
    basis:
      'export distinctObservedLocationCount buckets + multi-location board share + openRemoteReqCount>0 boards; location label diversity only — not EOR/visa, remote-friendly scores, or company quality',
  };
}

/**
 * Phenom residual — export board eng/sales/people/remote mix landscape (counts only).
 * openEng/Sales/PeopleOps/Remote req tallies + eng-share buckets + dominant-fn boards.
 * Complements ledger.byFn (role-level) and export.req (size/age signals). Not demand scores.
 */
export function measureExportFnLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const byEngShareBucket = {
    '0': 0,
    '0-25': 0,
    '25-50': 0,
    '50-75': 0,
    '75-100': 0,
  };
  let engSum = 0;
  let salesSum = 0;
  let peopleOpsSum = 0;
  let remoteSum = 0;
  let openSum = 0;
  let engDominant = 0;
  let salesDominant = 0;
  let peopleDominant = 0;
  let noEng = 0;
  let remoteHeavy = 0;
  let openBoards = 0;
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const open = Number(r.openReqCount) || 0;
    const eng = Number(r.openEngReqCount) || 0;
    const sales = Number(r.openSalesReqCount) || 0;
    const people = Number(r.openPeopleOpsReqCount) || 0;
    const remote = Number(r.openRemoteReqCount) || 0;
    engSum += eng;
    salesSum += sales;
    peopleOpsSum += people;
    remoteSum += remote;
    openSum += open;
    if (open <= 0) continue;
    openBoards += 1;
    if (eng === 0) noEng += 1;
    // Dominant among eng/sales/people (ties prefer eng then sales).
    if (eng >= sales && eng >= people) engDominant += 1;
    else if (sales >= eng && sales >= people) salesDominant += 1;
    else peopleDominant += 1;
    if (remote * 2 >= open) remoteHeavy += 1;
    const sh = eng / open;
    if (sh <= 0) byEngShareBucket['0'] += 1;
    else if (sh < 0.25) byEngShareBucket['0-25'] += 1;
    else if (sh < 0.5) byEngShareBucket['25-50'] += 1;
    else if (sh < 0.75) byEngShareBucket['50-75'] += 1;
    else byEngShareBucket['75-100'] += 1;
  }
  return {
    boards: rows.length,
    openBoards,
    engSum,
    salesSum,
    peopleOpsSum,
    remoteSum,
    engDominant,
    salesDominant,
    peopleDominant,
    noEng,
    remoteHeavy,
    engShareOfOpen: openSum ? Number((engSum / openSum).toFixed(4)) : 0,
    byEngShareBucket,
    basis:
      'export openEng/Sales/PeopleOps/Remote req sums + eng-share buckets of openReq + dominant among eng/sales/people + remoteHeavy (remote≥50% open); not demand, quality, or fit scores',
  };
}

/**
 * TheirStack residual — export board day-churn landscape (counts only).
 * firstObservedToday / closedToday / reopened / older-posted-first-seen from last export snapshot.
 * Complements ledger boardActivity (7d role-feed) and export.req withReopened scalar.
 * Not fill rates, hiring velocity scores, or company quality ranks.
 */
export function measureExportChurnLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  let withFirstObservedToday = 0;
  let firstObservedTodaySum = 0;
  let withClosedToday = 0;
  let closedTodaySum = 0;
  let withReopened = 0;
  let reopenedSum = 0;
  let withOlderPostedFirstSeen = 0;
  let olderPostedFirstSeenSum = 0;
  let activeChurn = 0;
  const byProviderChurn = Object.create(null);
  const byCompanyFirst = Object.create(null);
  const byCompanyClosed = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const first = Number(r.firstObservedTodayReqCount) || 0;
    const closed = Number(r.closedTodayReqCount) || 0;
    const reo = Number(r.reopenedOpenReqCount) || 0;
    const older = Number(r.firstObservedTodayOlderPostedReqCount) || 0;
    if (first > 0) {
      withFirstObservedToday += 1;
      firstObservedTodaySum += first;
      const name = String(r.name || r.domain || 'unknown').slice(0, 80) || 'unknown';
      byCompanyFirst[name] = (byCompanyFirst[name] || 0) + first;
    }
    if (closed > 0) {
      withClosedToday += 1;
      closedTodaySum += closed;
      const name = String(r.name || r.domain || 'unknown').slice(0, 80) || 'unknown';
      byCompanyClosed[name] = (byCompanyClosed[name] || 0) + closed;
    }
    if (reo > 0) {
      withReopened += 1;
      reopenedSum += reo;
    }
    if (older > 0) {
      withOlderPostedFirstSeen += 1;
      olderPostedFirstSeenSum += older;
    }
    if (first > 0 || closed > 0 || reo > 0) {
      activeChurn += 1;
      const prov =
        (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
          ? String(r.boardKey.provider)
          : 'unknown'
        ).slice(0, 40) || 'unknown';
      byProviderChurn[prov] = (byProviderChurn[prov] || 0) + 1;
    }
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    withFirstObservedToday,
    firstObservedTodaySum,
    withClosedToday,
    closedTodaySum,
    withReopened,
    reopenedSum,
    withOlderPostedFirstSeen,
    olderPostedFirstSeenSum,
    activeChurn,
    activeChurnShare: boards ? Number((activeChurn / boards).toFixed(4)) : 0,
    // Observation proxy only (first-seen − closed today); exits ≠ filled.
    netObservedToday: firstObservedTodaySum - closedTodaySum,
    byProviderChurn: rank(byProviderChurn, 'provider'),
    byCompanyFirstTop: rank(byCompanyFirst, 'company'),
    byCompanyClosedTop: rank(byCompanyClosed, 'company'),
    basis:
      'export firstObservedToday/closedToday/reopened/older-posted-first-seen board counts from last snapshot; activeChurn=any day signal; netObservedToday=first−closed (observation only) — not fill rates, hiring velocity scores, or company quality',
  };
}

/**
 * Levels / AR-25 residual — export board age-extremes landscape (counts only).
 * maxAttributedPostedDays (first_published board max among open reqs) + maxObservedOpenDays
 * (Demigod first-seen depth). Complements ledger.postedAge / observedAge (role-level) and
 * export.req attributed/stale/evergreen sums. Not ghost-job scores or company quality ranks.
 */
export function measureExportAgeLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const byMaxAttributedBucket = {
    null: 0,
    '0-6d': 0,
    '7-29d': 0,
    '30-89d': 0,
    '90-365d': 0,
    '365d+': 0,
  };
  const byMaxObservedBucket = {
    null: 0,
    '0d': 0,
    '1-2d': 0,
    '3-6d': 0,
    '7-13d': 0,
    '14-29d': 0,
    '30d+': 0,
  };
  let withMaxAttributed = 0;
  let withoutMaxAttributed = 0;
  let maxAttributedDays = 0;
  let boardsAttributedGe90 = 0;
  let boardsAttributedGe365 = 0;
  let withMaxObserved = 0;
  let withoutMaxObserved = 0;
  let maxObservedDays = 0;
  let boardsObservedGe7 = 0;
  const byCompanyAttr = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const rawAttr = r.maxAttributedPostedDays;
    const attr = Number(rawAttr);
    if (rawAttr == null || !Number.isFinite(attr) || attr < 0) {
      withoutMaxAttributed += 1;
      byMaxAttributedBucket.null += 1;
    } else {
      withMaxAttributed += 1;
      if (attr > maxAttributedDays) maxAttributedDays = attr;
      if (attr >= 90) boardsAttributedGe90 += 1;
      if (attr >= 365) boardsAttributedGe365 += 1;
      let b = '365d+';
      if (attr <= 6) b = '0-6d';
      else if (attr <= 29) b = '7-29d';
      else if (attr <= 89) b = '30-89d';
      else if (attr < 365) b = '90-365d';
      byMaxAttributedBucket[b] += 1;
      if (attr >= 90) {
        const name = String(r.name || r.domain || 'unknown').slice(0, 80) || 'unknown';
        byCompanyAttr[name] = Math.max(byCompanyAttr[name] || 0, attr);
      }
    }
    const rawObs = r.maxObservedOpenDays;
    const obs = Number(rawObs);
    if (rawObs == null || !Number.isFinite(obs) || obs < 0) {
      withoutMaxObserved += 1;
      byMaxObservedBucket.null += 1;
    } else {
      withMaxObserved += 1;
      if (obs > maxObservedDays) maxObservedDays = obs;
      if (obs >= 7) boardsObservedGe7 += 1;
      let b = '30d+';
      if (obs <= 0) b = '0d';
      else if (obs <= 2) b = '1-2d';
      else if (obs <= 6) b = '3-6d';
      else if (obs <= 13) b = '7-13d';
      else if (obs <= 29) b = '14-29d';
      byMaxObservedBucket[b] += 1;
    }
  }
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards: rows.length,
    withMaxAttributed,
    withoutMaxAttributed,
    maxAttributedDays,
    boardsAttributedGe90,
    boardsAttributedGe365,
    byMaxAttributedBucket,
    withMaxObserved,
    withoutMaxObserved,
    maxObservedDays,
    boardsObservedGe7,
    byMaxObservedBucket,
    byCompanyAttributedGe90Top: rank(byCompanyAttr, 'company'),
    basis:
      'export maxAttributedPostedDays (first_published board max among open) + maxObservedOpenDays (first-seen depth) buckets; ge90/ge365 attributed and ge7 observed are badge-readiness counts — not ghost-job scores, fill rates, or company quality; observation depth needs calendar time',
  };
}

/**
 * Company-research residual — export board companyResearch join landscape (counts only).
 * Presence, status/source mix, quarantineHiring, acceptedFields tallies from joined CR rows.
 * Complements export.req withResearch scalar and top-level researchGreen seal.
 * Not firmographic quality, fit, or company ranks.
 */
export function measureExportResearchLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  let withResearch = 0;
  let withoutResearch = 0;
  let quarantineHiring = 0;
  let acceptedFieldSum = 0;
  const byStatus = Object.create(null);
  const bySource = Object.create(null);
  const byAcceptedField = Object.create(null);
  const byCompany = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const cr = r.companyResearch;
    if (!cr || typeof cr !== 'object' || Array.isArray(cr)) {
      withoutResearch += 1;
      continue;
    }
    withResearch += 1;
    const status = String(cr.status ?? '(null)').slice(0, 40) || '(null)';
    const source = String(cr.source ?? '(null)').slice(0, 40) || '(null)';
    byStatus[status] = (byStatus[status] || 0) + 1;
    bySource[source] = (bySource[source] || 0) + 1;
    if (cr.quarantineHiring === true) quarantineHiring += 1;
    const af = Array.isArray(cr.acceptedFields) ? cr.acceptedFields : [];
    acceptedFieldSum += af.length;
    for (const raw of af) {
      const f = String(raw || '').slice(0, 48) || '(empty)';
      byAcceptedField[f] = (byAcceptedField[f] || 0) + 1;
    }
    const name = String(r.name || r.domain || 'unknown').slice(0, 80) || 'unknown';
    byCompany[name] = (byCompany[name] || 0) + 1;
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    withResearch,
    withoutResearch,
    researchShare: boards ? Number((withResearch / boards).toFixed(4)) : 0,
    quarantineHiring,
    acceptedFieldSum,
    avgAcceptedFields: withResearch
      ? Number((acceptedFieldSum / withResearch).toFixed(2))
      : 0,
    byStatus: rank(byStatus, 'status'),
    bySource: rank(bySource, 'source'),
    byAcceptedField: rank(byAcceptedField, 'field'),
    byCompanyTop: rank(byCompany, 'company', 8),
    basis:
      'export companyResearch join: with/without + status/source + quarantineHiring + acceptedFields tallies; coverage honesty only — not firmographic quality, demand, fit, or company ranks; CR scope remains benchmark-gated',
  };
}

/**
 * RecruitAI residual — export board sample-surface landscape (counts only).
 * Presence of sample role title/url/location + peopleOps / attributed-posted / no-agency quote samples.
 * Complements export.fn peopleOps sums and export.req attributed flags. Not role quality or desk scores.
 */
export function measureExportSampleLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  let withSampleRoleTitle = 0;
  let withSampleRoleUrl = 0;
  let withSampleLocation = 0;
  let withSamplePeopleOps = 0;
  let withSampleAttributed = 0;
  let withNoAgencyQuote = 0;
  let withNoAgencyUrl = 0;
  let coreSampleComplete = 0;
  const byProviderPeople = Object.create(null);
  const byProviderAttributed = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const title = Boolean(String(r.sampleRoleTitle ?? '').trim());
    const url = Boolean(String(r.sampleRoleUrl ?? '').trim());
    const loc = Boolean(String(r.sampleLocation ?? '').trim());
    if (title) withSampleRoleTitle += 1;
    if (url) withSampleRoleUrl += 1;
    if (loc) withSampleLocation += 1;
    if (title && url && loc) coreSampleComplete += 1;
    const people = Boolean(
      String(r.samplePeopleOpsRoleTitle ?? '').trim() || String(r.samplePeopleOpsRoleUrl ?? '').trim(),
    );
    const attr = Boolean(
      String(r.sampleAttributedPostedRoleTitle ?? '').trim() ||
        String(r.sampleAttributedPostedRoleUrl ?? '').trim(),
    );
    const noAgQ = Boolean(String(r.sampleNoAgencyPolicyQuote ?? '').trim());
    const noAgU = Boolean(String(r.sampleNoAgencyPolicyUrl ?? '').trim());
    if (people) withSamplePeopleOps += 1;
    if (attr) withSampleAttributed += 1;
    if (noAgQ) withNoAgencyQuote += 1;
    if (noAgU) withNoAgencyUrl += 1;
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    if (people) byProviderPeople[prov] = (byProviderPeople[prov] || 0) + 1;
    if (attr) byProviderAttributed[prov] = (byProviderAttributed[prov] || 0) + 1;
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    withSampleRoleTitle,
    withSampleRoleUrl,
    withSampleLocation,
    coreSampleComplete,
    coreSampleShare: boards ? Number((coreSampleComplete / boards).toFixed(4)) : 0,
    withSamplePeopleOps,
    withSampleAttributed,
    withNoAgencyQuote,
    withNoAgencyUrl,
    peopleOpsSampleShare: boards ? Number((withSamplePeopleOps / boards).toFixed(4)) : 0,
    attributedSampleShare: boards ? Number((withSampleAttributed / boards).toFixed(4)) : 0,
    byProviderPeopleOps: rank(byProviderPeople, 'provider'),
    byProviderAttributed: rank(byProviderAttributed, 'provider'),
    basis:
      'export sample* field presence (role title/url/location core + peopleOps/attributed-posted/no-agency samples); core=title+url+location; provider mix for people/attributed only — not role quality, desk scores, or company ranks',
  };
}

/**
 * RecruitAI residual — export relationships graph landscape (counts only).
 * Node/edge totals + type tallies + open-role omit honesty from relationships.counts.
 * Complements export.req open size (rows) with graph projection coverage. Not a knowledge-graph product.
 */
export function measureExportRelationshipLandscape(exportDoc) {
  const rel = exportDoc?.relationships && typeof exportDoc.relationships === 'object'
    ? exportDoc.relationships
    : null;
  if (!rel) {
    return {
      present: false,
      nodes: 0,
      edges: 0,
      byNodeType: [],
      byEdgeType: [],
      openRolesAvailable: 0,
      openRolesOmitted: 0,
      openRolesInGraph: 0,
      omitShare: 0,
      companies: 0,
      boards: 0,
      providers: 0,
      claims: 0,
      researchSources: 0,
      scope: null,
      roleLimitPerBoard: null,
      basis:
        'export relationships graph missing; counts only when present — not a knowledge-graph, match, or demand product',
    };
  }
  const counts = rel.counts && typeof rel.counts === 'object' ? rel.counts : {};
  const nodeTypes =
    counts.nodeTypes && typeof counts.nodeTypes === 'object' ? counts.nodeTypes : null;
  const edgeTypes =
    counts.edgeTypes && typeof counts.edgeTypes === 'object' ? counts.edgeTypes : null;
  // Prefer counts.*; fall back to array lengths when counts incomplete.
  const nodesArr = Array.isArray(rel.nodes) ? rel.nodes : null;
  const edgesArr = Array.isArray(rel.edges) ? rel.edges : null;
  let nodes = Number(counts.nodes);
  if (!Number.isFinite(nodes) || nodes < 0) nodes = nodesArr ? nodesArr.length : 0;
  let edges = Number(counts.edges);
  if (!Number.isFinite(edges) || edges < 0) edges = edgesArr ? edgesArr.length : 0;
  const byNodeTypeObj = Object.create(null);
  if (nodeTypes) {
    for (const [k, v] of Object.entries(nodeTypes)) {
      byNodeTypeObj[String(k).slice(0, 40)] = Number(v) || 0;
    }
  } else if (nodesArr) {
    for (const n of nodesArr) {
      const t = String(n?.type || n?.kind || '(none)').slice(0, 40) || '(none)';
      byNodeTypeObj[t] = (byNodeTypeObj[t] || 0) + 1;
    }
  }
  const byEdgeTypeObj = Object.create(null);
  if (edgeTypes) {
    for (const [k, v] of Object.entries(edgeTypes)) {
      byEdgeTypeObj[String(k).slice(0, 40)] = Number(v) || 0;
    }
  } else if (edgesArr) {
    for (const e of edgesArr) {
      const t = String(e?.type || e?.kind || e?.rel || '(none)').slice(0, 40) || '(none)';
      byEdgeTypeObj[t] = (byEdgeTypeObj[t] || 0) + 1;
    }
  }
  const rank = (obj, keyName) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, n]) => ({ [keyName]: k, n }));
  const openRolesAvailable = Number(counts.openRolesAvailable) || 0;
  const openRolesOmitted = Number(counts.openRolesOmitted) || 0;
  const openRolesInGraph = byNodeTypeObj.open_role || 0;
  const denom = openRolesAvailable || openRolesInGraph + openRolesOmitted;
  const companies = byNodeTypeObj.company || 0;
  const boards = byNodeTypeObj.ats_board || 0;
  const providers = byNodeTypeObj.provider || 0;
  const claims = byNodeTypeObj.company_claim || 0;
  const researchSources = byNodeTypeObj.research_source || 0;
  return {
    present: true,
    nodes,
    edges,
    byNodeType: rank(byNodeTypeObj, 'type'),
    byEdgeType: rank(byEdgeTypeObj, 'type'),
    openRolesAvailable,
    openRolesOmitted,
    openRolesInGraph,
    omitShare: denom ? Number((openRolesOmitted / denom).toFixed(4)) : 0,
    companies,
    boards,
    providers,
    claims,
    researchSources,
    scope: rel.scope != null ? String(rel.scope).slice(0, 120) : null,
    roleLimitPerBoard:
      rel.roleLimitPerBoard != null && Number.isFinite(Number(rel.roleLimitPerBoard))
        ? Number(rel.roleLimitPerBoard)
        : null,
    basis:
      'export relationships graph: node/edge totals + type tallies + openRolesAvailable/omitted (bounded graph omit honesty); not a knowledge-graph product, match/fit score, or demand signal',
  };
}

/**
 * Merge / ATS residual — export providerRouting coverage landscape (counts only).
 * Per-provider board/open/day-churn/attributed depth from export providerRouting.coverage
 * (fallback: boardKey tallies on rows). Surfaces Greenhouse attributed-only honesty.
 * Not provider quality ranks or multi-ATS scraper product.
 */
export function measureExportProviderLandscape(exportDoc) {
  const routing =
    exportDoc?.providerRouting && typeof exportDoc.providerRouting === 'object'
      ? exportDoc.providerRouting
      : null;
  const coverage =
    routing?.coverage && typeof routing.coverage === 'object' ? routing.coverage : null;
  const byProvider = [];
  let companiesSum = 0;
  let openRolesSum = 0;
  let firstObservedTodaySum = 0;
  let closedTodaySum = 0;
  let reopenedOpenSum = 0;
  let attributedPostedSum = 0;
  let staleAttributedSum = 0;
  let evergreenAttributedSum = 0;
  let providersWithAttributed = 0;
  let providersWithoutAttributed = 0;

  if (coverage && Object.keys(coverage).length) {
    for (const [rawP, rawC] of Object.entries(coverage)) {
      const provider = String(rawP || 'unknown').slice(0, 40) || 'unknown';
      const c = rawC && typeof rawC === 'object' ? rawC : {};
      const companies = Number(c.companies) || 0;
      const openRoles = Number(c.openRoles) || 0;
      const first = Number(c.firstObservedToday) || 0;
      const closed = Number(c.closedToday) || 0;
      const reo = Number(c.reopenedOpen) || 0;
      const attr = Number(c.attributedPosted) || 0;
      const stale = Number(c.staleAttributedPosted) || 0;
      const ever = Number(c.evergreenAttributedPosted) || 0;
      companiesSum += companies;
      openRolesSum += openRoles;
      firstObservedTodaySum += first;
      closedTodaySum += closed;
      reopenedOpenSum += reo;
      attributedPostedSum += attr;
      staleAttributedSum += stale;
      evergreenAttributedSum += ever;
      if (attr > 0) providersWithAttributed += 1;
      else providersWithoutAttributed += 1;
      byProvider.push({
        provider,
        companies,
        openRoles,
        firstObservedToday: first,
        closedToday: closed,
        reopenedOpen: reo,
        attributedPosted: attr,
        staleAttributedPosted: stale,
        evergreenAttributedPosted: ever,
        attributedShareOfOpen: openRoles ? Number((attr / openRoles).toFixed(4)) : 0,
      });
    }
  } else {
    // Fallback: board counts only from rows (no open/attributed depth).
    const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
    const tally = Object.create(null);
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      const provider =
        (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
          ? String(r.boardKey.provider)
          : 'unknown'
        ).slice(0, 40) || 'unknown';
      if (!tally[provider]) {
        tally[provider] = {
          provider,
          companies: 0,
          openRoles: 0,
          firstObservedToday: 0,
          closedToday: 0,
          reopenedOpen: 0,
          attributedPosted: 0,
          staleAttributedPosted: 0,
          evergreenAttributedPosted: 0,
        };
      }
      const t = tally[provider];
      t.companies += 1;
      t.openRoles += Number(r.openReqCount) || 0;
      t.firstObservedToday += Number(r.firstObservedTodayReqCount) || 0;
      t.closedToday += Number(r.closedTodayReqCount) || 0;
      t.reopenedOpen += Number(r.reopenedOpenReqCount) || 0;
      t.attributedPosted += Number(r.attributedPostedReqCount) || 0;
      t.staleAttributedPosted += Number(r.staleAttributedPostedReqCount) || 0;
      t.evergreenAttributedPosted += Number(r.evergreenAttributedPostedReqCount) || 0;
    }
    for (const t of Object.values(tally)) {
      companiesSum += t.companies;
      openRolesSum += t.openRoles;
      firstObservedTodaySum += t.firstObservedToday;
      closedTodaySum += t.closedToday;
      reopenedOpenSum += t.reopenedOpen;
      attributedPostedSum += t.attributedPosted;
      staleAttributedSum += t.staleAttributedPosted;
      evergreenAttributedSum += t.evergreenAttributedPosted;
      if (t.attributedPosted > 0) providersWithAttributed += 1;
      else providersWithoutAttributed += 1;
      byProvider.push({
        ...t,
        attributedShareOfOpen: t.openRoles
          ? Number((t.attributedPosted / t.openRoles).toFixed(4))
          : 0,
      });
    }
  }

  byProvider.sort(
    (a, b) =>
      b.openRoles - a.openRoles ||
      b.companies - a.companies ||
      (a.provider < b.provider ? -1 : a.provider > b.provider ? 1 : 0),
  );

  const observed =
    routing && Array.isArray(routing.observedProviders)
      ? routing.observedProviders.map((p) => String(p).slice(0, 40))
      : byProvider.map((x) => x.provider);

  return {
    providers: byProvider.length,
    companiesSum,
    openRolesSum,
    firstObservedTodaySum,
    closedTodaySum,
    reopenedOpenSum,
    attributedPostedSum,
    staleAttributedSum,
    evergreenAttributedSum,
    providersWithAttributed,
    providersWithoutAttributed,
    attributedShareOfOpen: openRolesSum
      ? Number((attributedPostedSum / openRolesSum).toFixed(4))
      : 0,
    observedProviders: observed,
    strategy: routing?.strategy != null ? String(routing.strategy).slice(0, 200) : null,
    byProvider,
    basis:
      'export providerRouting.coverage (or row boardKey fallback): per-provider companies/openRoles/day-churn/attributed depth; attributed often Greenhouse-only (first_published) — not provider quality ranks, multi-ATS scrape product, or demand scores',
  };
}

/**
 * RecruitAI residual — export diagnostics + counts honesty landscape (counts only).
 * Collisions/dupes/no-agency evidence lists + changedCompanies day-churn + top-level counts
 * (denied/unmatched/CR join). Complements export.churn (row-level) and export.provider.
 * Not identity quality scores or delivery readiness.
 */
export function measureExportDiagnosticsLandscape(exportDoc) {
  const diag =
    exportDoc?.diagnostics && typeof exportDoc.diagnostics === 'object'
      ? exportDoc.diagnostics
      : {};
  const counts =
    exportDoc?.counts && typeof exportDoc.counts === 'object' ? exportDoc.counts : {};
  const collisions = Array.isArray(diag.collisions) ? diag.collisions : [];
  const duplicateBoards = Array.isArray(diag.duplicateBoards) ? diag.duplicateBoards : [];
  const noAgencyEvidence = Array.isArray(diag.noAgencyEvidence) ? diag.noAgencyEvidence : [];
  const changedCompanies = Array.isArray(diag.changedCompanies) ? diag.changedCompanies : [];

  let changedFirstSum = 0;
  let changedClosedSum = 0;
  let changedReopenedSum = 0;
  let changedOlderPostedSum = 0;
  const byProviderChanged = Object.create(null);
  for (const x of changedCompanies) {
    if (!x || typeof x !== 'object') continue;
    changedFirstSum += Number(x.firstObservedTodayReqCount) || 0;
    changedClosedSum += Number(x.closedTodayReqCount) || 0;
    changedReopenedSum += Number(x.reopenedOpenReqCount) || 0;
    changedOlderPostedSum += Number(x.firstObservedTodayOlderPostedReqCount) || 0;
    const prov = String(x.provider || 'unknown').slice(0, 40) || 'unknown';
    byProviderChanged[prov] = (byProviderChanged[prov] || 0) + 1;
  }

  let noAgencyRoleSum = 0;
  for (const x of noAgencyEvidence) {
    if (!x || typeof x !== 'object') continue;
    noAgencyRoleSum += Number(x.count) || 0;
  }

  const rank = (obj, keyName, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));

  const n = (k) => {
    const v = Number(counts[k]);
    return Number.isFinite(v) ? v : 0;
  };

  return {
    collisions: collisions.length,
    duplicateBoards: duplicateBoards.length,
    noAgencyEvidenceRows: noAgencyEvidence.length,
    noAgencyRoleSum,
    changedCompanies: changedCompanies.length,
    changedFirstSum,
    changedClosedSum,
    changedReopenedSum,
    changedOlderPostedSum,
    byProviderChanged: rank(byProviderChanged, 'provider'),
    // Top-level export counts (identity / join honesty)
    rows: n('rows'),
    rowsBeforeTop: n('rowsBeforeTop'),
    ledgerOpenRoleKeys: n('ledgerOpenRoleKeys'),
    unmatchedAtsCompanies: n('unmatchedAtsCompanies'),
    boardCollisions: n('boardCollisions'),
    duplicateMapBoards: n('duplicateMapBoards'),
    deniedBoards: n('deniedBoards'),
    rowsWithCompanyResearch: n('rowsWithCompanyResearch'),
    rowsWithLiveReplayedResearch: n('rowsWithLiveReplayedResearch'),
    rowsWithUnreplayedCatalogResearch: n('rowsWithUnreplayedCatalogResearch'),
    changedCompaniesBeforeTop: n('changedCompaniesBeforeTop'),
    identityClean:
      collisions.length === 0 &&
      duplicateBoards.length === 0 &&
      n('boardCollisions') === 0 &&
      n('duplicateMapBoards') === 0 &&
      n('deniedBoards') === 0 &&
      n('unmatchedAtsCompanies') === 0,
    basis:
      'export diagnostics lists (collisions/dupes/no-agency/changedCompanies) + counts identity/join fields; changed* are day-window observation on listed cos only — not fill rates, identity quality scores, or delivery readiness',
  };
}

/**
 * Clearbit residual — export board domain + TLD landscape (counts only).
 * Domain host/TLD mix on recruitai-export rows (company career domain stamps).
 * Complements map.website (full directory) with hiring-board subset only.
 * Not brand quality, geo product, or company ranks.
 */
export function measureExportDomainLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  let withDomain = 0;
  let emptyDomain = 0;
  let invalid = 0;
  let com = 0;
  let ai = 0;
  let io = 0;
  let multiLabelHost = 0; // host label count ≥3 (e.g. careers.snowflake.com)
  const byTld = Object.create(null);
  const byHost = Object.create(null);
  const byProvider = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    byProvider[prov] = (byProvider[prov] || 0) + 1;
    const raw = String(r.domain ?? '').trim();
    if (!raw) {
      emptyDomain += 1;
      byTld['(empty)'] = (byTld['(empty)'] || 0) + 1;
      continue;
    }
    const { host, tld } = mapWebsiteHostParts(raw);
    if (!host) {
      invalid += 1;
      byTld['(invalid)'] = (byTld['(invalid)'] || 0) + 1;
      continue;
    }
    withDomain += 1;
    byTld[tld] = (byTld[tld] || 0) + 1;
    byHost[host] = (byHost[host] || 0) + 1;
    if (tld === 'com') com += 1;
    else if (tld === 'ai') ai += 1;
    else if (tld === 'io') io += 1;
    const labels = host.split('.').filter(Boolean).length;
    if (labels >= 3) multiLabelHost += 1;
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 12) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const multiHost = Object.entries(byHost)
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 8)
    .map(([host, n]) => ({ host, n }));
  return {
    boards,
    withDomain,
    emptyDomain,
    invalid,
    com,
    ai,
    io,
    comShare: boards ? Number((com / boards).toFixed(4)) : 0,
    aiShare: boards ? Number((ai / boards).toFixed(4)) : 0,
    multiLabelHost,
    multiLabelShare: boards ? Number((multiLabelHost / boards).toFixed(4)) : 0,
    byTld: rank(byTld, 'tld'),
    byHostTop: rank(byHost, 'host', 8),
    multiHost,
    byProvider: rank(byProvider, 'provider', 8),
    basis:
      'export row domain hostname + last-label TLD tallies (via mapWebsiteHostParts; not full PSL); multiLabelHost=≥3 labels (careers.x.com); multiHost=same domain on >1 board — not brand quality, geo, or company ranks',
  };
}

/**
 * Merge / AR-28 residual — export jobsUrl host-class landscape (counts only).
 * Primary/secondary/yc/other host classes on export board jobsUrl (same host rules as map.ats).
 * Complements map.ats (full directory) + export.provider (boardKey) + export.domain (career domain).
 * Not a multi-ATS scraper product or board-quality score.
 */
export function measureExportJobsUrlLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const byHostClass = Object.create(null);
  const byHost = Object.create(null);
  const byProviderClass = Object.create(null);
  let withJobsUrl = 0;
  let noJobsUrl = 0;
  let invalid = 0;
  let primary = 0;
  let secondary = 0;
  let yc = 0;
  let other = 0;
  let providerHostMatch = 0;
  let providerHostMismatch = 0;
  const classify = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return { class: 'none', host: null };
    const u = raw.toLowerCase();
    let host = null;
    try {
      const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
      host = new URL(withScheme).hostname.replace(/^www\./i, '').toLowerCase().slice(0, 80) || null;
    } catch {
      return { class: 'invalid', host: null };
    }
    if (!host) return { class: 'invalid', host: null };
    if (/personio\.|recruitee\.|smartrecruiters\./.test(u)) return { class: 'secondary', host };
    if (/greenhouse\.|ashbyhq\.|lever\.co|workable\./.test(u)) return { class: 'primary', host };
    if (/ycombinator\.com/.test(u)) return { class: 'yc', host };
    return { class: 'other', host };
  };
  const providerExpectedHost = (provider) => {
    const p = String(provider || '').toLowerCase();
    if (p === 'greenhouse') return /greenhouse\./;
    if (p === 'ashby') return /ashbyhq\./;
    if (p === 'lever') return /lever\.co/;
    if (p === 'workable') return /workable\./;
    if (p === 'personio') return /personio\./;
    if (p === 'recruitee') return /recruitee\./;
    if (p === 'smartrecruiters') return /smartrecruiters\./;
    return null;
  };
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const { class: hc, host } = classify(r.jobsUrl);
    byHostClass[hc] = (byHostClass[hc] || 0) + 1;
    if (hc === 'none') {
      noJobsUrl += 1;
      continue;
    }
    if (hc === 'invalid') {
      invalid += 1;
      continue;
    }
    withJobsUrl += 1;
    if (host) byHost[host] = (byHost[host] || 0) + 1;
    if (hc === 'primary') primary += 1;
    else if (hc === 'secondary') secondary += 1;
    else if (hc === 'yc') yc += 1;
    else other += 1;
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    const cross = `${prov}|${hc}`;
    byProviderClass[cross] = (byProviderClass[cross] || 0) + 1;
    const expect = providerExpectedHost(prov);
    if (expect && host) {
      if (expect.test(host)) providerHostMatch += 1;
      else providerHostMismatch += 1;
    }
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    withJobsUrl,
    noJobsUrl,
    invalid,
    primary,
    secondary,
    yc,
    other,
    primaryShare: boards ? Number((primary / boards).toFixed(4)) : 0,
    providerHostMatch,
    providerHostMismatch,
    byHostClass: rank(byHostClass, 'class'),
    byHost: rank(byHost, 'host'),
    byProviderClass: rank(byProviderClass, 'key'),
    basis:
      'export jobsUrl host class (primary=GH/Ashby/Lever/Workable; secondary=Personio/Recruitee/SR; yc=ycombinator) + provider×class cross + boardKey.provider vs host match; not multi-ATS scrape product, board quality, or demand scores',
  };
}

/**
 * Wikidata / YC residual — export board sourceLicense + sourceUrl landscape (counts only).
 * Hiring-board provenance mix (CC0 / YC-public / HN-public) vs map.license (full directory).
 * Not copyright clearance, content quality, or company ranks.
 */
export function measureExportLicenseLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  let withLicense = 0;
  let withoutLicense = 0;
  let ycPublic = 0;
  let cc0 = 0;
  let hnPublic = 0;
  let withSourceUrl = 0;
  const byLicense = Object.create(null);
  const bySourceHost = Object.create(null);
  const byProviderLicense = Object.create(null);
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const lic = String(r.sourceLicense ?? '').trim() || '(null)';
    if (lic === '(null)') withoutLicense += 1;
    else withLicense += 1;
    byLicense[lic] = (byLicense[lic] || 0) + 1;
    if (lic === 'YC-public') ycPublic += 1;
    else if (lic === 'CC0-1.0') cc0 += 1;
    else if (lic === 'HN-public') hnPublic += 1;
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    const cross = `${prov}|${lic}`;
    byProviderLicense[cross] = (byProviderLicense[cross] || 0) + 1;
    let host = '(invalid)';
    try {
      const raw = String(r.sourceUrl ?? '').trim();
      if (raw) {
        withSourceUrl += 1;
        const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
        host =
          new URL(withScheme).hostname.replace(/^www\./i, '').toLowerCase().slice(0, 80) ||
          '(invalid)';
      }
    } catch {
      host = '(invalid)';
    }
    bySourceHost[host] = (bySourceHost[host] || 0) + 1;
  }
  const boards = rows.length;
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    withLicense,
    withoutLicense,
    ycPublic,
    cc0,
    hnPublic,
    ycPublicShare: boards ? Number((ycPublic / boards).toFixed(4)) : 0,
    withSourceUrl,
    byLicense: rank(byLicense, 'license'),
    bySourceHost: rank(bySourceHost, 'host'),
    byProviderLicense: rank(byProviderLicense, 'key'),
    basis:
      'export row sourceLicense + sourceUrl hostname tallies + provider×license cross on hiring boards only; provenance observation — not copyright clearance, quality, or company ranks (see map.license for full directory)',
  };
}

/** Bucket board retrievedAt age in hours → fixed honesty labels. */
export function exportRetrievedAgeBucket(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 0) return '(invalid)';
  if (h < 1) return '0-1h';
  if (h < 6) return '1-6h';
  if (h < 24) return '6-24h';
  if (h < 72) return '1-3d';
  if (h < 168) return '3-7d';
  return '7d+';
}

/**
 * Firecrawl / TheirStack residual — export board retrievedAt freshness landscape (counts only).
 * Age of board poll snapshot (hours since retrievedAt), not role post age or ghost-job scores.
 * Complements export.age (role-level extremes) and role-ledger poll cadence.
 */
export function measureExportRetrievedLandscape(exportDoc, { now } = {}) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  const nowMs = now != null ? Number(now) : Date.now();
  let withRetrievedAt = 0;
  let withoutRetrievedAt = 0;
  let invalid = 0;
  let ge24h = 0;
  let ge72h = 0;
  const hoursList = [];
  const byAgeBucket = Object.create(null);
  const byProviderHours = Object.create(null); // provider → hours[]
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const raw = r.retrievedAt;
    if (raw == null || raw === '') {
      withoutRetrievedAt += 1;
      byAgeBucket['(none)'] = (byAgeBucket['(none)'] || 0) + 1;
      continue;
    }
    const t = Date.parse(String(raw));
    if (!Number.isFinite(t)) {
      invalid += 1;
      byAgeBucket['(invalid)'] = (byAgeBucket['(invalid)'] || 0) + 1;
      continue;
    }
    withRetrievedAt += 1;
    const hours = Math.max(0, (nowMs - t) / 3_600_000);
    hoursList.push(hours);
    const bucket = exportRetrievedAgeBucket(hours);
    byAgeBucket[bucket] = (byAgeBucket[bucket] || 0) + 1;
    if (hours >= 24) ge24h += 1;
    if (hours >= 72) ge72h += 1;
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    if (!byProviderHours[prov]) byProviderHours[prov] = [];
    byProviderHours[prov].push(hours);
  }
  hoursList.sort((a, b) => a - b);
  const median = (arr) => {
    if (!arr.length) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2
      ? Number(arr[mid].toFixed(2))
      : Number(((arr[mid - 1] + arr[mid]) / 2).toFixed(2));
  };
  const boards = rows.length;
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  const byProvider = Object.entries(byProviderHours)
    .map(([provider, hs]) => {
      const sorted = [...hs].sort((a, b) => a - b);
      return {
        provider,
        n: sorted.length,
        medianHours: median(sorted),
        maxHours: sorted.length ? Number(sorted[sorted.length - 1].toFixed(2)) : null,
      };
    })
    .sort((a, b) => b.n - a.n || (a.provider < b.provider ? -1 : 1))
    .slice(0, 12);
  return {
    boards,
    withRetrievedAt,
    withoutRetrievedAt,
    invalid,
    minHours: hoursList.length ? Number(hoursList[0].toFixed(2)) : null,
    maxHours: hoursList.length ? Number(hoursList[hoursList.length - 1].toFixed(2)) : null,
    medianHours: median(hoursList),
    ge24h,
    ge72h,
    ge24Share: boards ? Number((ge24h / boards).toFixed(4)) : 0,
    byAgeBucket: rank(byAgeBucket, 'bucket'),
    byProvider,
    basis:
      'export row retrievedAt age (hours since board poll snapshot) only; buckets 0-1h/1-6h/6-24h/1-3d/3-7d/7d+; not role post age, ghost-job %, or board quality ranks (see export.age for role extremes)',
  };
}

/** Host labels from career domain useful for slug alignment (drop careers/jobs/tld noise). */
export function exportDomainAlignLabels(domain) {
  const { host } = mapWebsiteHostParts(domain);
  if (!host) return [];
  const skip = new Set([
    'www',
    'careers',
    'jobs',
    'boards',
    'job',
    'engineering',
    'docs',
    'japan',
    'go',
    'team',
    'about',
    'www2',
    'com',
    'io',
    'ai',
    'co',
    'org',
    'net',
    'live',
    'app',
    'dev',
    'so',
    'gg',
    'us',
  ]);
  return host
    .split('.')
    .filter(Boolean)
    .map((l) => l.replace(/[^a-z0-9]/g, ''))
    .filter((l) => l && !skip.has(l));
}

/** True when boardKey.slug shares a label with career domain (observation, not quality). */
export function exportSlugDomainAlign(slug, domain) {
  const s = String(slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!s) return false;
  const labels = exportDomainAlignLabels(domain);
  return labels.some((l) => l === s || (l.length >= 3 && (l.includes(s) || s.includes(l))));
}

/**
 * Dover / ATS residual — export board identity join landscape (counts only).
 * mapCompanyId scheme + boardKey.slug + domain/name presence + slug↔domain align.
 * Complements export.license (provenance) and export.diagnostics (collisions).
 * Not a match score or company quality rank.
 */
export function measureExportIdentityLandscape(exportDoc) {
  const rows = Array.isArray(exportDoc?.rows) ? exportDoc.rows : [];
  let withMapCompanyId = 0;
  let withoutMapCompanyId = 0;
  let withSlug = 0;
  let withoutSlug = 0;
  let withDomain = 0;
  let withoutDomain = 0;
  let withName = 0;
  let emptyName = 0;
  let slugDomainAlign = 0;
  let slugDomainMisalign = 0;
  const byIdScheme = Object.create(null);
  const byProviderMisalign = Object.create(null);
  const misalignSamples = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const id = String(r.mapCompanyId ?? '').trim();
    if (id) {
      withMapCompanyId += 1;
      const scheme = (id.includes(':') ? id.split(':')[0] : 'plain').slice(0, 24) || 'plain';
      byIdScheme[scheme] = (byIdScheme[scheme] || 0) + 1;
    } else {
      withoutMapCompanyId += 1;
      byIdScheme['(none)'] = (byIdScheme['(none)'] || 0) + 1;
    }
    const slug =
      r.boardKey && typeof r.boardKey === 'object' ? String(r.boardKey.slug ?? '').trim() : '';
    const prov =
      (r.boardKey && typeof r.boardKey === 'object' && r.boardKey.provider
        ? String(r.boardKey.provider)
        : 'unknown'
      ).slice(0, 40) || 'unknown';
    if (slug) withSlug += 1;
    else withoutSlug += 1;
    const domain = String(r.domain ?? '').trim();
    if (domain) withDomain += 1;
    else withoutDomain += 1;
    const name = String(r.name ?? '').trim();
    if (name) withName += 1;
    else emptyName += 1;
    if (slug && domain) {
      if (exportSlugDomainAlign(slug, domain)) slugDomainAlign += 1;
      else {
        slugDomainMisalign += 1;
        byProviderMisalign[prov] = (byProviderMisalign[prov] || 0) + 1;
        if (misalignSamples.length < 8) {
          misalignSamples.push({
            name: name.slice(0, 40) || null,
            slug: slug.slice(0, 40),
            domain: domain.slice(0, 60),
            provider: prov,
          });
        }
      }
    }
  }
  const boards = rows.length;
  const comparable = slugDomainAlign + slugDomainMisalign;
  const rank = (obj, keyName, n = 10) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, n)
      .map(([k, count]) => ({ [keyName]: k, n: count }));
  return {
    boards,
    withMapCompanyId,
    withoutMapCompanyId,
    withSlug,
    withoutSlug,
    withDomain,
    withoutDomain,
    withName,
    emptyName,
    slugDomainAlign,
    slugDomainMisalign,
    alignShare: comparable ? Number((slugDomainAlign / comparable).toFixed(4)) : 0,
    byIdScheme: rank(byIdScheme, 'scheme'),
    byProviderMisalign: rank(byProviderMisalign, 'provider'),
    misalignSamples,
    basis:
      'export mapCompanyId scheme + boardKey.slug + domain/name presence + slug↔domain label align (careers/jobs/tld labels dropped); join honesty only — not match scores, brand quality, or inventing identities (see export.license provenance + export.diagnostics collisions)',
  };
}

/**
 * AR-28 thin: board coverage from map + export diagnostics (no new ATS scrapers).
 */
export function buildBoardCoverage({ map, exportDoc } = {}) {
  const land = measureMapAtsLandscape(map);
  const cos = Array.isArray(map?.companies) ? map.companies : [];
  const byAts = {};
  const samplesNoRoles = [];
  for (const c of cos) {
    const ats = c.atsSource || (c.jobsUrl ? 'url-only' : null);
    if (c.jobsUrl) {
      if ((c.openRoles || 0) > 0) {
        if (ats && ats !== 'url-only') byAts[ats] = (byAts[ats] || 0) + 1;
      } else if (samplesNoRoles.length < 12) {
        samplesNoRoles.push({
          id: c.id || null,
          name: c.name || null,
          jobsUrl: c.jobsUrl,
          atsSource: c.atsSource || null,
        });
      }
    }
  }
  const counts = exportDoc?.counts || {};
  return {
    schema: BOARDS_SCHEMA,
    at: new Date().toISOString(),
    map: {
      companies: land.companies,
      withJobsUrl: land.withJobsUrl,
      withOpenRoles: land.withOpenRoles,
      jobsUrlNoOpenRoles: land.jobsUrlNoOpenRoles,
      noJobsUrl: land.noJobsUrl,
      byAtsProvider: byAts,
      primary: land.primary,
      secondary: land.secondary,
      primaryOpen: land.primaryOpen,
      secondaryOpen: land.secondaryOpen,
      ycJobsPage: land.ycJobsPage,
      byHostClass: land.byHostClass,
      byHost: land.byHost,
      byAtsSource: land.byAtsSource,
      sampleJobsUrlNoRoles: samplesNoRoles,
      basis: land.basis,
    },
    export: exportDoc
      ? {
          rows: counts.rows ?? exportDoc.rows?.length ?? null,
          unmatchedAtsCompanies: counts.unmatchedAtsCompanies ?? null,
          boardCollisions: counts.boardCollisions ?? null,
          duplicateMapBoards: counts.duplicateMapBoards ?? null,
          deniedBoards: counts.deniedBoards ?? null,
          generatedAt: exportDoc.generatedAt || null,
        }
      : null,
    note:
      'Coverage facts only. Does not add ATS hosts. jobsUrl without openRoles may be YC jobs page or unpollable board. secondaryOpen waits owner-gated detect+enrich.',
  };
}

function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    script,
    args,
    status: r.status,
    ok: r.status === 0,
    stdout: (r.stdout || '').slice(-2000),
    stderr: (r.stderr || '').slice(-1000),
  };
}

export function recruitaiImportArgs(apply = false) {
  return [apply ? '--apply' : '--dry-run', '--reqs', '--reqs-per-company=3'];
}

export function runBatch({ skipPoll = false, skipImport = false, applyImport = false } = {}) {
  const steps = [];
  const push = (name, fn) => {
    const started = Date.now();
    try {
      const result = fn();
      if (result?.ok === false) {
        throw new Error(`${name} failed${result.stderr ? `: ${result.stderr}` : ''}`);
      }
      steps.push({ name, ok: true, ms: Date.now() - started, result });
      return result;
    } catch (e) {
      steps.push({ name, ok: false, ms: Date.now() - started, error: String(e?.message || e) });
      throw e;
    }
  };

  push('reclassify', () => {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) throw new Error('missing role ledger');
    const out = reclassifyLedgerFunctions(ledger);
    ledger.updatedAt = new Date().toISOString().slice(0, 10);
    atomicWrite(LEDGER_PATH, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
    return { ok: true, ...out };
  });

  if (!skipPoll) {
    push('role-ledger-poll', () => runNode('demigod-role-ledger.mjs', ['poll']));
  }

  push('directory-aging', () => runNode('demigod-directory-aging.mjs'));
  push('directory-aging-enrich-map', () => runNode('demigod-directory-aging.mjs', ['--enrich-map']));
  push('directory-static', () => runNode('demigod-directory-static.mjs'));
  push('hiring-pulse', () => runNode('demigod-hiring-pulse.mjs'));
  push('recruitai-export', () => runNode('demigod-recruitai-export.mjs'));
  push('recruitai-desk-pack', () => runNode('demigod-recruitai-desk.mjs', ['pack']));

  if (!skipImport) {
    push(applyImport ? 'recruitai-import-apply-reqs' : 'recruitai-import-preview-reqs', () =>
      runNode('demigod-recruitai-import.mjs', recruitaiImportArgs(applyImport)),
    );
  }

  push('scoreboard', () => {
    const board = buildScoreboard({
      map: readJson(MAP_PATH),
      ledger: readJson(LEDGER_PATH),
      aging: readJson(AGING_PATH),
      exportDoc: readJson(path.join(BUSY, 'recruitai-export/latest.json')),
    });
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(SCOREBOARD_PATH, `${JSON.stringify(board, null, 2)}\n`, { mode: 0o600 });
    return { ok: true, path: SCOREBOARD_PATH, ledgerOpen: board.ledger.open };
  });

  return {
    schema: 'demigod.enrichment-batch/1',
    at: new Date().toISOString(),
    skipPoll,
    skipImport,
    applyImport,
    steps,
    ok: steps.every((s) => s.ok),
  };
}

function selftest() {
  const assert = (c, m) => {
    if (!c) throw new Error(`enrichment selftest: ${m}`);
  };
  const ledger = {
    roles: {
      a: { title: 'Senior Software Engineer', fn: 'other', closedAt: null },
      b: { title: 'Account Executive', fn: 'other', closedAt: null },
      c: { title: 'Recruiter', fn: 'other', closedAt: '2026-07-01' },
    },
  };
  const rc = reclassifyLedgerFunctions(ledger);
  assert(rc.changed === 3, 'reclassify all');
  assert(ledger.roles.a.fn === 'engineering', 'eng');
  assert(ledger.roles.b.fn === 'sales', 'sales');
  assert(ledger.roles.c.fn === 'people', 'people closed still reclassed');
  assert(rc.open === 2, 'open count');
  const stale = {
    roles: {
      a: { title: 'Senior Software Engineer', fn: 'other', closedAt: null },
      b: { title: 'Account Executive', fn: 'sales', closedAt: null },
    },
  };
  const drift = measureLedgerFnDrift(stale);
  assert(drift.open === 2 && drift.drift === 1 && drift.byFromTo['other→engineering'] === 1, 'fn drift measure');
  assert(measureLedgerFnDrift(ledger).drift === 0, 'reclassified ledger has zero drift');

  const T = '2026-07-31';
  const board = buildScoreboard({
    today: T,
    map: {
      companies: [
        { name: 'A', ledgerOpenRoles: 2, observed7: 1, roleMix: { engineering: 2 } },
        { name: 'B', agingRoles: 1 },
      ],
      coverage: { roleAgingAt: '2026-07-30', companiesWithObservedOpen: 1 },
    },
    ledger: {
      updatedAt: '2026-07-30',
      roles: {
        x: {
          provider: 'Greenhouse',
          company: 'Aco',
          title: 'Senior Software Engineer',
          fn: 'engineering',
          location: 'US Remote',
          usPosted: true,
          closedAt: null,
          firstSeen: T,
          lastSeen: T,
          reopenCount: 1,
          postedDateChangeCount: 1,
          url: 'https://boards.greenhouse.io/acme/jobs/1',
          nativePostedAt: '2026-01-01',
          nativeDateField: 'first_published',
          agencyPolicyEvidence: { status: 'supported' },
        },
        y: {
          provider: 'Greenhouse',
          company: 'Aco',
          title: 'Director of Recruiting',
          fn: 'people',
          location: 'San Francisco, CA (Hybrid)',
          usPosted: true,
          closedAt: null,
          firstSeen: '2026-07-24',
          lastSeen: T,
          reopenCount: 0,
          url: 'https://boards.greenhouse.io/acme/jobs/2',
          nativePostedAt: '2026-02-01',
          nativeDateField: 'createdAt',
        },
        z: {
          provider: 'Greenhouse',
          company: 'Bco',
          title: 'AE',
          fn: 'sales',
          location: 'New York, NY',
          closedAt: '2026-07-30',
          firstSeen: '2026-07-20',
          lastSeen: '2026-07-30',
          url: 'https://boards.greenhouse.io/acme/jobs/3',
        },
      },
    },
    aging: { companyCount: 1, companiesWithAgingRole: 1, today: '2026-07-30' },
    exportDoc: {
      schema: 'demigod.recruitai-export/6',
      rows: [
        {
          openReqCount: 5,
          openEngReqCount: 3,
          openSalesReqCount: 1,
          openRemoteReqCount: 2,
          openPeopleOpsReqCount: 1,
          noAgencyEvidenceReqCount: 0,
          openObserved7ReqCount: 0,
          companyResearch: { status: 'verified' },
        },
      ],
      researchEvidence: { green: true },
    },
  });
  assert(board.ledger.open === 2 && board.ledger.withAgencyPolicy === 1, 'scoreboard ledger');
  assert(board.ledger.agencyPolicy?.withoutPolicy === 1, 'agency withoutPolicy');
  assert(board.ledger.agencyPolicy?.share === 0.5, 'agency share');
  assert(
    Array.isArray(board.ledger.agencyPolicy?.byProvider) &&
      board.ledger.agencyPolicy.byProvider.some((x) => x.provider === 'Greenhouse' && x.n === 1),
    'agency byProvider',
  );
  assert(
    Array.isArray(board.ledger.agencyPolicy?.byCompanyTop) &&
      board.ledger.agencyPolicy.byCompanyTop.some((x) => x.company === 'Aco' && x.n === 1),
    'agency byCompanyTop',
  );
  assert(board.ledger.workplace?.remote === 1 && board.ledger.workplace?.hybrid === 1, 'workplace remote+hybrid');
  assert(board.ledger.workplace?.remoteShare === 0.5, 'workplace remoteShare');
  assert(
    Array.isArray(board.ledger.workplace?.byProviderRemote) &&
      board.ledger.workplace.byProviderRemote.some((x) => x.provider === 'Greenhouse' && x.n === 1),
    'workplace byProviderRemote',
  );
  // y firstSeen 2026-07-24 → 7d on T (still in 7d newOpen window); x same-day → 0d
  assert(board.ledger.observedAge?.maxDays === 7, 'observedAge maxDays');
  assert(board.ledger.observedAge?.ge7 === 1 && board.ledger.observedAge?.ge30 === 0, 'observedAge ge7');
  assert(board.ledger.observedAge?.byBucket?.['0d'] === 1 && board.ledger.observedAge?.byBucket?.['7-13d'] === 1, 'observedAge buckets');
  // x first_published 2026-01-01 → ~211d aging; y createdAt stamp excluded
  assert(board.ledger.postedAge?.attributable === 1 && board.ledger.postedAge?.withoutAttributed === 1, 'postedAge attr');
  assert(board.ledger.postedAge?.agingRoles === 1 && board.ledger.postedAge?.evergreenRoles === 0, 'postedAge aging');
  assert(board.ledger.postedAge?.byBucket?.['90-365d'] === 1, 'postedAge 90-365 bucket');
  assert(board.ledger.seniority?.specified === 2 && board.ledger.seniority?.unspecified === 0, 'seniority specified');
  assert(
    board.ledger.seniority?.bySeniority?.some((x) => x.seniority === 'senior' && x.n === 1) &&
      board.ledger.seniority?.bySeniority?.some((x) => x.seniority === 'directorPlus' && x.n === 1),
    'seniority bySeniority',
  );
  assert(
    board.ledger.seniority?.byEngineeringSeniority?.some((x) => x.seniority === 'senior' && x.n === 1),
    'seniority eng slice',
  );
  assert(board.ledger.reopen?.withReopen === 1 && board.ledger.reopen?.withoutReopen === 1, 'reopen split');
  assert(board.ledger.reopen?.reopenEvents === 1 && board.ledger.reopen?.share === 0.5, 'reopen events');
  assert(
    board.ledger.reopen?.byProvider?.some((x) => x.provider === 'Greenhouse' && x.n === 1),
    'reopen byProvider',
  );
  // z closed AE → closed=1, open=2, share≈0.3333
  assert(board.ledger.closed?.closed === 1 && board.ledger.closed?.open === 2, 'closed split');
  assert(board.ledger.closed?.share === 0.3333, 'closed share');
  assert(
    board.ledger.closed?.byProvider?.some((x) => x.provider === 'Greenhouse' && x.n === 1) &&
      board.ledger.closed?.byCompanyTop?.some((x) => x.company === 'Bco' && x.n === 1),
    'closed byProvider/company',
  );
  assert(board.ledger.postedDateRecycle?.withRecycle === 1 && board.ledger.postedDateRecycle?.withoutRecycle === 1, 'recycle split');
  assert(board.ledger.postedDateRecycle?.changeEvents === 1 && board.ledger.postedDateRecycle?.share === 0.5, 'recycle events');
  assert(
    board.ledger.postedDateRecycle?.byProvider?.some((x) => x.provider === 'Greenhouse' && x.n === 1),
    'recycle byProvider',
  );
  assert(board.ledger.usPosted?.usPosted === 2 && board.ledger.usPosted?.nonUs === 0, 'usPosted openUs');
  assert(board.ledger.usPosted?.share === 1, 'usPosted share');
  assert(
    board.ledger.usPosted?.byProviderUs?.some((x) => x.provider === 'Greenhouse' && x.n === 2),
    'usPosted byProviderUs',
  );
  // fixture open titles (SWE + Director of Recruiting) have no contingent markers → unspecified
  assert(board.ledger.employmentType?.unspecified === 2 && board.ledger.employmentType?.specified === 0, 'employmentType fixture');
  assert(board.ledger.employmentType?.basis?.includes('title-heuristic'), 'employmentType basis');
  assert(board.ledger.generalApplication?.generalApp === 0 && board.ledger.generalApplication?.concrete === 2, 'generalApp fixture');
  assert(board.ledger.generalApplication?.basis?.includes('catch-all'), 'generalApp basis');
  // fixture: US Remote + SF Hybrid → sfBay=1 (hybrid loc), remote-only not a metro
  assert(board.ledger.metro?.sfBay === 1 && board.ledger.metro?.withMetro === 1, 'metro fixture sfBay');
  assert(board.ledger.metro?.basis?.includes('multi-label'), 'metro basis');
  assert(board.ledger.founding?.founding === 0 && board.ledger.founding?.nonFounding === 2, 'founding fixture');
  assert(board.ledger.founding?.basis?.includes('founding'), 'founding basis');
  assert(board.ledger.language?.withLanguage === 0 && board.ledger.language?.withoutLanguage === 2, 'language fixture');
  assert(board.ledger.language?.basis?.includes('language'), 'language basis');
  // fixture open: 2 roles same company Aco
  assert(board.ledger.companyOpen?.companies === 1 && board.ledger.companyOpen?.top10Share === 1, 'companyOpen fixture');
  assert(
    board.ledger.companyOpen?.byCompanyTop?.some((x) => x.company === 'Aco' && x.n === 2),
    'companyOpen byCompanyTop',
  );
  assert(board.ledger.companyOpen?.basis?.includes('point-in-time'), 'companyOpen basis');
  // fixture URLs are boards.greenhouse.io → atsNative=2
  assert(board.ledger.urlHost?.atsNative === 2 && board.ledger.urlHost?.customDomain === 0, 'urlHost fixture');
  assert(board.ledger.urlHost?.basis?.includes('hostname'), 'urlHost basis');
  assert(board.ledger.attributablePosted === 1, 'scoreboard attributable first_published only');
  assert(
    Array.isArray(board.ledger.byNativeDateField) &&
      board.ledger.byNativeDateField.some((x) => x.field === 'first_published' && x.n === 1),
    'scoreboard byNativeDateField',
  );
  // Pure agency-policy landscape helper
  {
    const ap = measureAgencyPolicyLandscape({
      roles: {
        a: {
          closedAt: null,
          provider: 'Ashby',
          company: 'Xco',
          agencyPolicyEvidence: { status: 'supported' },
        },
        b: { closedAt: null, provider: 'Ashby', company: 'Yco' },
        c: {
          closedAt: '2026-01-01',
          provider: 'Ashby',
          company: 'Xco',
          agencyPolicyEvidence: { status: 'supported' },
        },
      },
    });
    assert(ap.open === 2 && ap.withPolicy === 1 && ap.withoutPolicy === 1, 'agency landscape counts');
    assert(ap.byProvider[0]?.provider === 'Ashby' && ap.byProvider[0].n === 1, 'agency landscape provider');
    assert(ap.basis.includes('positive-only'), 'agency landscape basis');
  }
  // Pure workplace landscape helper
  {
    const wp = measureWorkplaceLandscape({
      roles: {
        a: { closedAt: null, location: 'Remote - US', provider: 'Lever', fn: 'engineering' },
        b: { closedAt: null, location: 'Hybrid | NYC', provider: 'Lever', fn: 'sales' },
        c: { closedAt: null, location: 'Austin, TX | Onsite', provider: 'Ashby', fn: 'ops' },
        d: { closedAt: null, location: 'Seattle, WA', provider: 'Greenhouse', fn: 'product' },
        e: { closedAt: null, location: '', provider: 'Greenhouse', fn: 'other' },
        f: {
          closedAt: '2026-01-01',
          location: 'Remote',
          provider: 'Lever',
          fn: 'engineering',
        },
      },
    });
    assert(wp.open === 5 && wp.remote === 1 && wp.hybrid === 1 && wp.onsite === 1, 'workplace buckets');
    assert(wp.unspecified === 1 && wp.empty === 1, 'workplace unspec+empty');
    assert(wp.remoteShare === 0.2, 'workplace pure remoteShare');
    assert(wp.byProviderRemote.some((x) => x.provider === 'Lever' && x.n === 1), 'workplace remote provider');
    assert(wp.byFnRemote.some((x) => x.fn === 'engineering' && x.n === 1), 'workplace remote fn');
    assert(wp.basis.includes('location-text'), 'workplace basis');
  }
  // Pure observed-age landscape helper
  {
    const oa = measureObservedAgeLandscape(
      {
        roles: {
          a: { closedAt: null, firstSeen: '2026-07-31' },
          b: { closedAt: null, firstSeen: '2026-07-29' },
          c: { closedAt: null, firstSeen: '2026-07-25' },
          d: { closedAt: null, firstSeen: '2026-07-18' },
          e: { closedAt: null, firstSeen: '2026-07-01' },
          f: { closedAt: null, firstSeen: '2026-06-01' },
          g: { closedAt: null },
          h: { closedAt: '2026-07-30', firstSeen: '2026-01-01' },
        },
      },
      { today: '2026-07-31' },
    );
    assert(oa.open === 7 && oa.withFirstSeen === 6 && oa.withoutFirstSeen === 1, 'observed age coverage');
    // ages: 0,2,6,13,30,60 → ge7=3 (13/30/60), ge30=2 (30/60)
    assert(oa.maxDays === 60 && oa.ge7 === 3 && oa.ge30 === 2, 'observed age thresholds');
    assert(oa.byBucket['0d'] === 1 && oa.byBucket['1-2d'] === 1 && oa.byBucket['3-6d'] === 1, 'young buckets');
    assert(oa.byBucket['7-13d'] === 1 && oa.byBucket['14-29d'] === 0 && oa.byBucket['30d+'] === 2, 'mature buckets');
    assert(oa.basis.includes('firstSeen'), 'observed age basis');
  }
  // Pure lastSeen re-observation landscape (TheirStack/poll residual)
  {
    assert(daysSinceLastSeen({ lastSeen: '2026-07-31' }, '2026-07-31') === 0, 'ls days 0');
    assert(daysSinceLastSeen({ lastSeen: '2026-07-28' }, '2026-07-31') === 3, 'ls days 3');
    assert(daysSinceLastSeen({}, '2026-07-31') == null, 'ls missing');
    const ls = measureLastSeenLandscape(
      {
        roles: {
          a: { closedAt: null, lastSeen: '2026-07-31', provider: 'Ashby', company: 'Acme' },
          b: { closedAt: null, lastSeen: '2026-07-30', provider: 'Ashby', company: 'Acme' },
          c: { closedAt: null, lastSeen: '2026-07-28', provider: 'Greenhouse', company: 'Beta' },
          d: { closedAt: null, lastSeen: '2026-07-25', provider: 'Greenhouse', company: 'Beta' },
          e: { closedAt: null, lastSeen: '2026-07-18', provider: 'Lever', company: 'Gamma' },
          f: { closedAt: null, lastSeen: '2026-07-01', provider: 'Lever', company: 'Gamma' },
          g: { closedAt: null },
          h: { closedAt: '2026-07-30', lastSeen: '2026-01-01', provider: 'Ashby', company: 'Zed' },
        },
      },
      { today: '2026-07-31' },
    );
    assert(ls.open === 7 && ls.withLastSeen === 6 && ls.withoutLastSeen === 1, 'ls cov');
    // ages: 0,1,3,6,13,30 → ge1=5, ge3=4, ge7=2
    assert(ls.maxDays === 30 && ls.ge1 === 5 && ls.ge3 === 4 && ls.ge7 === 2, 'ls thresh');
    assert(ls.byBucket['0d'] === 1 && ls.byBucket['1-2d'] === 1 && ls.byBucket['3-6d'] === 2, 'ls young');
    assert(ls.byBucket['7-13d'] === 1 && ls.byBucket['30d+'] === 1, 'ls mature');
    assert(ls.byProviderStale.some((x) => x.provider === 'Greenhouse' && x.n === 2), 'ls stale GH');
    assert(ls.byCompanyStaleTop.some((x) => x.company === 'Gamma' && x.n === 2), 'ls stale co');
    assert(ls.basis.includes('lastSeen'), 'ls basis');
  }
  // Pure posted-age landscape helper
  {
    const pa = measurePostedAgeLandscape(
      {
        roles: {
          a: {
            closedAt: null,
            nativePostedAt: '2026-07-30',
            nativeDateField: 'first_published',
          },
          b: {
            closedAt: null,
            nativePostedAt: '2026-07-01',
            nativeDateField: 'first_published',
          },
          c: {
            closedAt: null,
            nativePostedAt: '2026-05-01',
            nativeDateField: 'first_published',
          },
          d: {
            closedAt: null,
            nativePostedAt: '2026-01-01',
            nativeDateField: 'first_published',
          },
          e: {
            closedAt: null,
            nativePostedAt: '2024-01-01',
            nativeDateField: 'first_published',
          },
          f: {
            closedAt: null,
            nativePostedAt: '2026-01-01',
            nativeDateField: 'createdAt',
          },
          g: { closedAt: null },
          h: {
            closedAt: '2026-07-30',
            nativePostedAt: '2024-01-01',
            nativeDateField: 'first_published',
          },
        },
      },
      { today: '2026-07-31' },
    );
    // ages: 1, 30, 91, 211, 942 → buckets 0-6/7-29/30-89/90-365/365d+; f+g unattributed; h closed
    assert(pa.open === 7 && pa.attributable === 5 && pa.withoutAttributed === 2, 'posted age coverage');
    assert(pa.byBucket['0-6d'] === 1 && pa.byBucket['7-29d'] === 0 && pa.byBucket['30-89d'] === 1, 'posted young/mid');
    assert(pa.byBucket['90-365d'] === 2 && pa.byBucket['365d+'] === 1, 'posted aging buckets');
    assert(pa.agingRoles === 2 && pa.evergreenRoles === 1, 'posted aging+evergreen');
    assert(pa.maxDays === 942, 'posted maxDays');
    assert(pa.basis.includes('first_published'), 'posted age basis');
  }
  // Pure seniority landscape helper
  {
    const sn = measureSeniorityLandscape({
      roles: {
        a: { closedAt: null, title: 'Staff Engineer', fn: 'engineering' },
        b: { closedAt: null, title: 'Junior Analyst', fn: 'finance/legal' },
        c: { closedAt: null, title: 'Software Engineer', fn: 'engineering' },
        d: { closedAt: null, title: 'Principal Scientist', fn: 'ai/data' },
        e: { closedAt: null, title: 'Intern', fn: 'engineering' },
        f: { closedAt: '2026-01-01', title: 'Senior Engineer', fn: 'engineering' },
      },
    });
    // staff, junior, unspecified, principal, intern — closed senior excluded
    assert(sn.open === 5 && sn.specified === 4 && sn.unspecified === 1, 'seniority coverage');
    assert(sn.bySeniority.some((x) => x.seniority === 'staff' && x.n === 1), 'seniority staff');
    assert(sn.bySeniority.some((x) => x.seniority === 'junior' && x.n === 1), 'seniority junior');
    assert(sn.bySeniority.some((x) => x.seniority === 'unspecified' && x.n === 1), 'seniority unspec');
    assert(sn.byEngineeringSeniority.some((x) => x.seniority === 'staff' && x.n === 1), 'eng staff');
    assert(sn.byEngineeringSeniority.some((x) => x.seniority === 'intern' && x.n === 1), 'eng intern');
    assert(sn.byEngineeringSeniority.some((x) => x.seniority === 'unspecified' && x.n === 1), 'eng unspec');
    assert(sn.basis.includes('title-heuristic'), 'seniority basis');
  }
  // Pure reopen landscape helper
  {
    const ro = measureReopenLandscape({
      roles: {
        a: { closedAt: null, reopenCount: 1, provider: 'Ashby', company: 'Xco' },
        b: { closedAt: null, reopenCount: 2, provider: 'Ashby', company: 'Xco' },
        c: { closedAt: null, reopenCount: 0, provider: 'Lever', company: 'Yco' },
        d: { closedAt: null, provider: 'Lever', company: 'Yco' },
        e: { closedAt: '2026-01-01', reopenCount: 3, provider: 'Ashby', company: 'Xco' },
      },
    });
    assert(ro.open === 4 && ro.withReopen === 2 && ro.withoutReopen === 2, 'reopen coverage');
    assert(ro.reopenEvents === 3 && ro.share === 0.5, 'reopen events/share');
    assert(ro.byProvider.some((x) => x.provider === 'Ashby' && x.n === 2), 'reopen provider');
    assert(ro.byCompanyTop.some((x) => x.company === 'Xco' && x.n === 2), 'reopen company');
    assert(ro.byReopenCount.some((x) => x.reopenCount === '1' && x.n === 1), 'reopen count=1');
    assert(ro.byReopenCount.some((x) => x.reopenCount === '2' && x.n === 1), 'reopen count=2');
    assert(ro.basis.includes('reappear'), 'reopen basis');
  }
  // Pure closed landscape helper
  {
    const cl = measureClosedLandscape({
      roles: {
        a: { closedAt: null, provider: 'Ashby', fn: 'engineering', company: 'X' },
        b: { closedAt: '2026-07-30', provider: 'Ashby', fn: 'sales', company: 'X' },
        c: { closedAt: '2026-07-29', provider: 'Lever', fn: 'sales', company: 'Y' },
        d: { closedAt: '2026-07-28', provider: 'Lever', fn: 'ops', company: 'Y' },
      },
    });
    assert(cl.total === 4 && cl.open === 1 && cl.closed === 3 && cl.share === 0.75, 'closed coverage');
    assert(cl.byProvider.some((x) => x.provider === 'Lever' && x.n === 2), 'closed provider');
    assert(cl.byFn.some((x) => x.fn === 'sales' && x.n === 2), 'closed fn');
    assert(cl.byCompanyTop.some((x) => x.company === 'Y' && x.n === 2), 'closed company');
    assert(cl.basis.includes('not filled'), 'closed basis');
  }
  // Pure closed-age landscape (TheirStack residual)
  {
    assert(daysSinceClosed({ closedAt: '2026-07-31' }, '2026-07-31') === 0, 'ca days 0');
    assert(daysSinceClosed({ closedAt: '2026-07-24' }, '2026-07-31') === 7, 'ca days 7');
    assert(daysSinceClosed({}, '2026-07-31') == null, 'ca missing');
    const ca = measureClosedAgeLandscape(
      {
        roles: {
          a: { closedAt: '2026-07-31', provider: 'Ashby', company: 'Acme' },
          b: { closedAt: '2026-07-30', provider: 'Ashby', company: 'Acme' },
          c: { closedAt: '2026-07-28', provider: 'Greenhouse', company: 'Beta' },
          d: { closedAt: '2026-07-24', provider: 'Greenhouse', company: 'Beta' },
          e: { closedAt: '2026-07-01', provider: 'Lever', company: 'Gamma' },
          f: { closedAt: null, provider: 'Ashby', company: 'OpenCo' },
          g: { closedAt: 'bad', provider: 'Ashby', company: 'Bad' },
        },
      },
      { today: '2026-07-31' },
    );
    assert(ca.closed === 6 && ca.withAge === 5 && ca.invalid === 1, 'ca cov');
    // ages: 0,1,3,7,30 → ge1=4, ge3=3, ge7=2
    assert(ca.maxDays === 30 && ca.ge1 === 4 && ca.ge3 === 3 && ca.ge7 === 2, 'ca thresh');
    assert(ca.byBucket['0d'] === 1 && ca.byBucket['1-2d'] === 1 && ca.byBucket['3-6d'] === 1, 'ca young');
    assert(ca.byBucket['7-13d'] === 1 && ca.byBucket['30d+'] === 1, 'ca mature');
    assert(ca.byProvider.some((x) => x.provider === 'Greenhouse' && x.n === 2), 'ca prov');
    assert(ca.byCompanyTop.some((x) => x.company === 'Beta' && x.n === 2), 'ca co');
    assert(ca.basis.includes('closedAt'), 'ca basis');
  }
  // Pure posted-date recycle landscape helper
  {
    const rc = measurePostedDateRecycleLandscape({
      roles: {
        a: { closedAt: null, postedDateChangeCount: 1, provider: 'Ashby', company: 'Sco' },
        b: { closedAt: null, postedDateChangeCount: 2, provider: 'Ashby', company: 'Sco' },
        c: { closedAt: null, postedDateChangeCount: 0, provider: 'Greenhouse', company: 'Gco' },
        d: { closedAt: null, provider: 'Greenhouse', company: 'Gco' },
        e: { closedAt: '2026-01-01', postedDateChangeCount: 4, provider: 'Ashby', company: 'Sco' },
      },
    });
    assert(rc.open === 4 && rc.withRecycle === 2 && rc.withoutRecycle === 2, 'recycle coverage');
    assert(rc.changeEvents === 3 && rc.share === 0.5, 'recycle events/share');
    assert(rc.byProvider.some((x) => x.provider === 'Ashby' && x.n === 2), 'recycle provider');
    assert(rc.byCompanyTop.some((x) => x.company === 'Sco' && x.n === 2), 'recycle company');
    assert(rc.byChangeCount.some((x) => x.changeCount === '1' && x.n === 1), 'recycle count=1');
    assert(rc.byChangeCount.some((x) => x.changeCount === '2' && x.n === 1), 'recycle count=2');
    assert(rc.basis.includes('lower bound'), 'recycle basis');
  }
  // Pure usPosted landscape helper
  {
    const up = measureUsPostedLandscape({
      roles: {
        a: { closedAt: null, usPosted: true, provider: 'Ashby', fn: 'engineering' },
        b: { closedAt: null, usPosted: true, provider: 'Ashby', fn: 'sales' },
        c: { closedAt: null, usPosted: false, provider: 'Lever', fn: 'ops' },
        d: { closedAt: null, provider: 'Greenhouse', fn: 'product' },
        e: { closedAt: '2026-01-01', usPosted: true, provider: 'Ashby', fn: 'engineering' },
      },
    });
    assert(up.open === 4 && up.usPosted === 2 && up.nonUs === 2 && up.share === 0.5, 'usPosted coverage');
    assert(up.byProviderUs.some((x) => x.provider === 'Ashby' && x.n === 2), 'usPosted provider us');
    assert(up.byProviderNonUs.some((x) => x.provider === 'Lever' && x.n === 1), 'usPosted provider non');
    assert(up.byFnUs.some((x) => x.fn === 'engineering' && x.n === 1), 'usPosted fn');
    assert(up.basis.includes('location gate'), 'usPosted basis');
  }
  // Pure employment-type landscape helper (Rippling-thin; title only)
  {
    assert(employmentTypeFromTitle('Software Engineering Intern') === 'intern', 'et intern');
    assert(employmentTypeFromTitle('Internship General App') === 'intern', 'et internship');
    assert(employmentTypeFromTitle('Backend (Identity International)') === 'unspecified', 'et no intern in International');
    assert(employmentTypeFromTitle('Product Manager - Internal Product') === 'unspecified', 'et no intern in Internal');
    assert(employmentTypeFromTitle('Accessioner (Part-Time)') === 'partTime', 'et partTime');
    assert(employmentTypeFromTitle('Design Systems Designer (Contract)') === 'contract', 'et (Contract)');
    assert(employmentTypeFromTitle('Senior Software Engineer - Contract') === 'contract', 'et - Contract');
    assert(employmentTypeFromTitle('[CONTRACT] People Ops Specialist') === 'contract', 'et [CONTRACT]');
    assert(employmentTypeFromTitle('Senior Accountant (Contract-to-Hire)') === 'contract', 'et C2H');
    assert(employmentTypeFromTitle('Fixed Term Contract Partner') === 'contract', 'et fixed term');
    assert(employmentTypeFromTitle('Contractual || Assistant Manager') === 'contract', 'et contractual');
    assert(employmentTypeFromTitle('Contracts Manager, APAC') === 'unspecified', 'et contracts manager craft');
    assert(employmentTypeFromTitle('Contracts & Procurement Specialist') === 'unspecified', 'et contracts craft');
    assert(employmentTypeFromTitle('Senior Legal & Contracts Manager') === 'unspecified', 'et legal contracts craft');
    assert(employmentTypeFromTitle('Product Designer, Contractors') === 'unspecified', 'et contractors product not employment');
    assert(employmentTypeFromTitle('Therapist 1099') === 'contract', 'et 1099');
    const et = measureEmploymentTypeLandscape({
      roles: {
        a: { closedAt: null, title: 'Software Engineering Intern', provider: 'Ashby', fn: 'engineering' },
        b: { closedAt: null, title: 'Designer (Contract)', provider: 'Ashby', fn: 'design' },
        c: { closedAt: null, title: 'Retail Associate (Part-Time)', provider: 'Lever', fn: 'operations' },
        d: { closedAt: null, title: 'Contracts Manager', provider: 'Greenhouse', fn: 'finance/legal' },
        e: { closedAt: null, title: 'Staff Engineer', provider: 'Greenhouse', fn: 'engineering' },
        f: { closedAt: '2026-01-01', title: 'Intern', provider: 'Ashby', fn: 'engineering' },
      },
    });
    assert(et.open === 5 && et.intern === 1 && et.contract === 1 && et.partTime === 1, 'et counts');
    assert(et.unspecified === 2 && et.specified === 3 && et.specifiedShare === 0.6, 'et specified');
    assert(et.byProviderContract.some((x) => x.provider === 'Ashby' && x.n === 1), 'et provider contract');
    assert(et.byFnIntern.some((x) => x.fn === 'engineering' && x.n === 1), 'et fn intern');
    assert(et.basis.includes('title-heuristic'), 'et basis');
  }
  // Pure general-application landscape helper (Phenom-thin; title only)
  {
    assert(isGeneralApplicationTitle('General Application') === true, 'ga general');
    assert(isGeneralApplicationTitle("Don't see a role for you?") === true, 'ga dont see');
    assert(isGeneralApplicationTitle('Build Your Own Role') === true, 'ga build');
    assert(isGeneralApplicationTitle('Future Opportunities: Retirement Advocate') === true, 'ga future');
    assert(isGeneralApplicationTitle('Software Engineer - Future Openings') === true, 'ga future openings');
    assert(isGeneralApplicationTitle('Other') === true, 'ga other');
    assert(isGeneralApplicationTitle('Senior Software Engineer') === false, 'ga concrete eng');
    assert(isGeneralApplicationTitle('General Manager, Data Centers') === false, 'ga not general manager');
    const ga = measureGeneralApplicationLandscape({
      roles: {
        a: { closedAt: null, title: 'General Application', provider: 'Ashby', company: 'Aco' },
        b: { closedAt: null, title: "Don't see a role?", provider: 'Ashby', company: 'Aco' },
        c: { closedAt: null, title: 'Staff Engineer', provider: 'Greenhouse', company: 'Bco' },
        d: { closedAt: null, title: 'Account Executive', provider: 'Lever', company: 'Cco' },
        e: { closedAt: '2026-01-01', title: 'Open Application', provider: 'Ashby', company: 'Aco' },
      },
    });
    assert(ga.open === 4 && ga.generalApp === 2 && ga.concrete === 2 && ga.share === 0.5, 'ga counts');
    assert(ga.byProvider.some((x) => x.provider === 'Ashby' && x.n === 2), 'ga provider');
    assert(ga.byCompanyTop.some((x) => x.company === 'Aco' && x.n === 2), 'ga company');
    assert(ga.basis.includes('catch-all'), 'ga basis');
  }
  // Pure metro landscape helper (Deel-thin multi-label location metros)
  {
    assert(metrosFromLocation('San Francisco, CA').includes('sfBay'), 'metro sf');
    assert(metrosFromLocation('US Remote').length === 0, 'metro remote none');
    assert(
      metrosFromLocation('San Francisco, CA | New York City, NY').includes('sfBay') &&
        metrosFromLocation('San Francisco, CA | New York City, NY').includes('nyc'),
      'metro multi',
    );
    assert(metrosFromLocation('Seattle, WA').includes('seattle'), 'metro seattle');
    assert(metrosFromLocation('Austin, TX').includes('austin'), 'metro austin');
    const m = measureMetroLandscape({
      roles: {
        a: { closedAt: null, location: 'San Francisco, CA', provider: 'Ashby', fn: 'engineering' },
        b: {
          closedAt: null,
          location: 'San Francisco, CA | New York City, NY',
          provider: 'Ashby',
          fn: 'sales',
        },
        c: { closedAt: null, location: 'US Remote', provider: 'Greenhouse', fn: 'ops' },
        d: { closedAt: null, location: 'Seattle, WA', provider: 'Lever', fn: 'engineering' },
        e: { closedAt: '2026-01-01', location: 'San Francisco, CA', provider: 'Ashby', fn: 'engineering' },
      },
    });
    assert(m.open === 4 && m.sfBay === 2 && m.withMetro === 3 && m.withoutMetro === 1, 'metro coverage');
    assert(m.multiMetro === 1 && m.sfBayShare === 0.5, 'metro multi/share');
    assert(m.byMetro.some((x) => x.metro === 'sfBay' && x.n === 2), 'metro byMetro sf');
    assert(m.byMetro.some((x) => x.metro === 'nyc' && x.n === 1), 'metro byMetro nyc');
    assert(m.byProviderSfBay.some((x) => x.provider === 'Ashby' && x.n === 2), 'metro provider sf');
    assert(m.byFnSfBay.some((x) => x.fn === 'engineering' && x.n === 1), 'metro fn sf');
    assert(m.basis.includes('multi-label'), 'metro basis');
  }
  // Pure founding landscape helper (PredictLeads-thin; title only)
  {
    assert(isFoundingTitle('Founding Engineer') === true, 'fd founding eng');
    assert(isFoundingTitle('Founding Account Executive') === true, 'fd founding ae');
    assert(isFoundingTitle('Founder in Residence') === true, 'fd fir');
    assert(isFoundingTitle("Founder's Associate") === true, 'fd founders assoc');
    assert(isFoundingTitle('ex-Founder') === false, 'fd exclude ex');
    assert(isFoundingTitle('Former Founder') === false, 'fd exclude former');
    assert(isFoundingTitle('Chief of Staff (Future Founder/VC)') === false, 'fd exclude future');
    assert(isFoundingTitle('Senior Software Engineer') === false, 'fd concrete');
    const fd = measureFoundingLandscape({
      roles: {
        a: { closedAt: null, title: 'Founding Engineer', provider: 'Ashby', company: 'Aco', fn: 'engineering' },
        b: { closedAt: null, title: 'Founding GTM', provider: 'Ashby', company: 'Aco', fn: 'sales' },
        c: { closedAt: null, title: 'Staff Engineer', provider: 'Greenhouse', company: 'Bco', fn: 'engineering' },
        d: { closedAt: null, title: 'ex-Founder', provider: 'Lever', company: 'Cco', fn: 'operations' },
        e: { closedAt: '2026-01-01', title: 'Founding Marketer', provider: 'Ashby', company: 'Aco', fn: 'marketing' },
      },
    });
    assert(fd.open === 4 && fd.founding === 2 && fd.nonFounding === 2 && fd.share === 0.5, 'fd counts');
    assert(fd.byProvider.some((x) => x.provider === 'Ashby' && x.n === 2), 'fd provider');
    assert(fd.byFn.some((x) => x.fn === 'engineering' && x.n === 1), 'fd fn');
    assert(fd.byCompanyTop.some((x) => x.company === 'Aco' && x.n === 2), 'fd company');
    assert(fd.basis.includes('founding'), 'fd basis');
  }
  // Pure language landscape helper (Phenom-thin; title only)
  {
    assert(languageMarkersFromTitle('Bilingual Case Manager (Spanish Speaking)').hasLanguageSignal, 'lang bil+es');
    assert(languageMarkersFromTitle('Bilingual Case Manager (Spanish Speaking)').languages.includes('spanish'), 'lang es');
    assert(languageMarkersFromTitle('Bilingual Case Manager (Spanish Speaking)').bilingual === true, 'lang bil flag');
    assert(languageMarkersFromTitle('CSM - German speaker').languages.includes('german'), 'lang de');
    assert(languageMarkersFromTitle('Franchise Manager').hasLanguageSignal === false, 'lang not franchise');
    assert(languageMarkersFromTitle('Staff Engineer').hasLanguageSignal === false, 'lang none');
    const lg = measureLanguageLandscape({
      roles: {
        a: {
          closedAt: null,
          title: 'Bilingual Therapist — Spanish/English',
          provider: 'Ashby',
          fn: 'other',
        },
        b: { closedAt: null, title: 'CSM - German speaker', provider: 'Ashby', fn: 'sales' },
        c: { closedAt: null, title: 'Bilingual Support', provider: 'Lever', fn: 'operations' },
        d: { closedAt: null, title: 'Staff Engineer', provider: 'Greenhouse', fn: 'engineering' },
        e: { closedAt: '2026-01-01', title: 'French Speaking AE', provider: 'Ashby', fn: 'sales' },
      },
    });
    assert(lg.open === 4 && lg.withLanguage === 3 && lg.withoutLanguage === 1, 'lang coverage');
    assert(lg.bilingual === 2 && lg.share === 0.75, 'lang bil/share');
    assert(lg.byLanguage.some((x) => x.language === 'spanish' && x.n === 1), 'lang by spanish');
    assert(lg.byLanguage.some((x) => x.language === 'german' && x.n === 1), 'lang by german');
    assert(lg.byLanguage.some((x) => x.language === 'bilingualOnly' && x.n === 1), 'lang bil only');
    assert(lg.byProvider.some((x) => x.provider === 'Ashby' && x.n === 2), 'lang provider');
    assert(lg.basis.includes('multi-label'), 'lang basis');
  }
  // Pure company-open concentration landscape (TheirStack-thin)
  {
    const co = measureCompanyOpenLandscape({
      roles: {
        a: { closedAt: null, company: 'Aco', provider: 'Ashby' },
        b: { closedAt: null, company: 'Aco', provider: 'Ashby' },
        c: { closedAt: null, company: 'Aco', provider: 'Ashby' },
        d: { closedAt: null, company: 'Bco', provider: 'Greenhouse' },
        e: { closedAt: null, company: 'Cco', provider: 'Lever' },
        f: { closedAt: '2026-01-01', company: 'Aco', provider: 'Ashby' },
      },
    });
    assert(co.open === 5 && co.companies === 3, 'co coverage');
    assert(co.top10Share === 1 && co.top25Share === 1, 'co top share full');
    assert(co.byCompanyTop[0].company === 'Aco' && co.byCompanyTop[0].n === 3, 'co top company');
    assert(co.byCompanyBucket.some((x) => x.bucket === '2-5' && x.n === 1), 'co bucket 2-5');
    assert(co.byCompanyBucket.some((x) => x.bucket === '1' && x.n === 2), 'co bucket 1');
    assert(co.byProviderOpen.some((x) => x.provider === 'Ashby' && x.n === 3), 'co provider');
    assert(co.basis.includes('point-in-time'), 'co basis');
  }
  // Pure URL host-class landscape helper (Merge/Apply-thin)
  {
    assert(urlHostClassFromUrl('https://jobs.ashbyhq.com/x/1').hostClass === 'atsNative', 'uh ashby');
    assert(urlHostClassFromUrl('https://job-boards.greenhouse.io/x/jobs/1').hostClass === 'atsNative', 'uh gh');
    assert(urlHostClassFromUrl('https://jobs.lever.co/x/1').hostClass === 'atsNative', 'uh lever');
    assert(urlHostClassFromUrl('https://careers.airbnb.com/positions/1').hostClass === 'careersHost', 'uh careers');
    assert(urlHostClassFromUrl('https://stripe.com/jobs/listing/1').hostClass === 'customDomain', 'uh custom');
    assert(urlHostClassFromUrl('not-a-url').hostClass === 'invalid', 'uh invalid');
    const uh = measureUrlHostLandscape({
      roles: {
        a: {
          closedAt: null,
          provider: 'Ashby',
          url: 'https://jobs.ashbyhq.com/a/1',
        },
        b: {
          closedAt: null,
          provider: 'Greenhouse',
          url: 'https://job-boards.greenhouse.io/b/jobs/2',
        },
        c: {
          closedAt: null,
          provider: 'Greenhouse',
          url: 'https://stripe.com/jobs/listing/3',
        },
        d: {
          closedAt: null,
          provider: 'Greenhouse',
          url: 'https://careers.example.com/x',
        },
        e: {
          closedAt: '2026-01-01',
          provider: 'Ashby',
          url: 'https://jobs.ashbyhq.com/a/9',
        },
      },
    });
    assert(uh.open === 4 && uh.atsNative === 2 && uh.customDomain === 1 && uh.careersHost === 1, 'uh counts');
    assert(uh.atsNativeShare === 0.5, 'uh share');
    assert(uh.byProviderClass.some((x) => x.providerClass === 'Greenhouse|customDomain' && x.n === 1), 'uh prov class');
    assert(uh.byHostTop.some((x) => x.host === 'stripe.com' && x.n === 1), 'uh host top');
    assert(uh.basis.includes('hostname'), 'uh basis');
  }
  assert(board.map.withRoleMix === 1 && board.export.eng === 3, 'scoreboard map/export');
  // scoreboard map companies fixture has no jobsUrl — ats still defined
  assert(board.map.ats && board.map.ats.noJobsUrl === 2, 'scoreboard map.ats noJobs');
  assert(Array.isArray(board.map.ats.byHostClass), 'scoreboard map.ats byHostClass');
  // fixture map has no tags — source still defined with zeros
  assert(board.map.source && board.map.source.ycTagged === 0 && board.map.source.withYcBatch === 0, 'map.source fixture');
  assert(board.map.source?.basis?.includes('tags'), 'map.source basis');
  // fixture: A has ledgerOpenRoles=2, neither has hiring=yes
  assert(board.map.hiringHonesty?.withLedgerOpen === 1 && board.map.hiringHonesty?.hiringYes === 0, 'map.hiringHonesty fixture');
  assert(board.map.hiringHonesty?.basis?.includes('hiring flag'), 'map.hiringHonesty basis');
  // Pure landscape helper
  {
    const land = measureNativeDateFieldLandscape({
      roles: {
        a: { closedAt: null, nativePostedAt: '2026-01-01', nativeDateField: 'first_published' },
        b: { closedAt: null, nativePostedAt: '2026-01-01', nativeDateField: 'createdAt' },
        c: { closedAt: '2026-01-02', nativePostedAt: '2026-01-01', nativeDateField: 'first_published' },
      },
    });
    assert(land.open === 2 && land.attributablePosted === 1 && land.withNativePostedAt === 2, 'native landscape counts');
    assert(land.byNativeDateField.some((x) => x.field === 'createdAt' && x.n === 1), 'createdAt stamp counted');
  }
  assert(board.schema === SCHEMA, 'schema v2');
  assert(board.boardActivity?.newOpenInWindow === 2 && board.boardActivity?.closedInWindow === 1, 'scoreboard boardActivity');
  assert(board.boardActivity.byProvider?.[0]?.provider === 'Greenhouse' && board.boardActivity.byProvider[0].n === 2, 'scoreboard byProvider landscape');
  assert(
    Array.isArray(board.boardActivity.byCompanyTop) &&
      board.boardActivity.byCompanyTop.some((x) => x.company === 'Aco' && x.openInWindow === 2),
    'scoreboard byCompanyTop intensity',
  );
  assert(
    Array.isArray(board.boardActivity.byCompanyClosedTop) &&
      board.boardActivity.byCompanyClosedTop.some((x) => x.company === 'Bco' && x.closedInWindow === 1),
    'scoreboard byCompanyClosedTop intensity',
  );
  assert(
    board.boardActivity.byFn?.some((x) => x.fn === 'engineering' && x.n === 1) &&
      board.boardActivity.byFn?.some((x) => x.fn === 'people' && x.n === 1),
    'scoreboard byFn landscape',
  );
  // closedAt 1d ago → span=1; 7d window exceeds short closure history.
  assert(board.boardActivity.windowExceedsClosureHistory === true && board.boardActivity.closureObservationSpanDays === 1, 'short closure history flagged on scoreboard');
  assert(
    recruitaiImportArgs().includes('--dry-run') && !recruitaiImportArgs().includes('--apply'),
    'batch import defaults to preview',
  );
  assert(recruitaiImportArgs(true).includes('--apply'), 'apply import requires explicit opt-in');
  const cov = buildBoardCoverage({
    map: {
      companies: [
        { id: 'yc:a', name: 'A', jobsUrl: 'https://jobs.lever.co/a', atsSource: 'Lever', openRoles: 2 },
        { id: 'yc:b', name: 'B', jobsUrl: 'https://www.ycombinator.com/companies/b/jobs', openRoles: 0 },
        { id: 'yc:c', name: 'C' },
      ],
    },
    exportDoc: { counts: { rows: 1, unmatchedAtsCompanies: 0, boardCollisions: 0, duplicateMapBoards: 0, deniedBoards: 0 } },
  });
  assert(cov.schema === BOARDS_SCHEMA, 'boards schema');
  assert(cov.map.withOpenRoles === 1 && cov.map.jobsUrlNoOpenRoles === 1 && cov.map.noJobsUrl === 1, 'boards counts');
  assert(cov.map.primary === 1 && cov.map.secondary === 0 && cov.map.ycJobsPage === 1, 'boards host classes');
  assert(cov.map.primaryOpen === 1 && cov.map.secondaryOpen === 0, 'boards open by class');
  assert(cov.map.byHost?.some((x) => x.host === 'jobs.lever.co' && x.n === 1), 'boards byHost');
  // Pure map ATS landscape with secondary host
  {
    const ma = measureMapAtsLandscape({
      companies: [
        { jobsUrl: 'https://boards.greenhouse.io/x', atsSource: 'Greenhouse', openRoles: 3 },
        { jobsUrl: 'https://company.personio.de/jobs', atsSource: 'Personio', openRoles: 1 },
        { jobsUrl: 'https://foo.recruitee.com/', openRoles: 0 },
        { jobsUrl: 'https://jobs.ashbyhq.com/y', atsSource: 'Ashby', openRoles: 2 },
        { jobsUrl: 'https://www.ycombinator.com/companies/z/jobs', openRoles: 0 },
        {},
      ],
    });
    assert(ma.companies === 6 && ma.primary === 2 && ma.secondary === 2 && ma.ycJobsPage === 1, 'map ats classes');
    assert(ma.primaryOpen === 2 && ma.secondaryOpen === 1, 'map ats open classes');
    assert(ma.noJobsUrl === 1 && ma.withJobsUrl === 5, 'map ats jobsUrl');
    assert(ma.byAtsSource.some((x) => x.atsSource === 'Greenhouse' && x.n === 1), 'map atsSource');
    assert(ma.basis.includes('secondary'), 'map ats basis');
  }
  // Pure map source/YC tag landscape (Wellfound/atlas-thin)
  {
    const ms = measureMapSourceLandscape({
      companies: [
        {
          tags: ['yc', 'YC Winter 2024'],
          source: 'yc',
          inceptionYear: 2023,
          hiring: 'yes',
          ledgerOpenRoles: 2,
        },
        {
          tags: ['wikidata-sf-tech'],
          source: 'wikidata',
          inceptionYear: 2015,
          hiring: 'unknown',
          ledgerOpenRoles: 0,
        },
        {
          tags: ['hn-hiring', 'yc'],
          source: 'hn',
          inceptionYear: 2020,
          hiring: 'yes',
          ledgerOpenRoles: 1,
        },
        { tags: [], source: 'manual', inceptionYear: null },
      ],
    });
    assert(ms.companies === 4 && ms.ycTagged === 2 && ms.withYcBatch === 1, 'map source yc');
    assert(ms.wikidata === 1 && ms.hnHiring === 1, 'map source tags');
    assert(ms.hiringLabeled === 2 && ms.withLedgerOpen === 2, 'map source hiring');
    assert(ms.withInception === 3, 'map source inception');
    assert(ms.byYcBatchTop.some((x) => x.batch === 'YC Winter 2024' && x.n === 1), 'map source batch');
    assert(ms.byInceptionDecade.some((x) => x.decade === '2020s' && x.n === 2), 'map source decade');
    assert(ms.bySource.some((x) => x.source === 'yc' && x.n === 1), 'map source bySource');
    assert(ms.basis.includes('tags'), 'map source basis');
  }
  // Pure map hiring-honesty landscape (Common Room-thin)
  {
    assert(isMapHiringYes({ hiring: 'yes' }) === true, 'mh yes');
    assert(isMapHiringYes({ hiring: 'unknown' }) === false, 'mh unknown');
    assert(isMapHiringYes({}) === false, 'mh null');
    const mh = measureMapHiringHonestyLandscape({
      companies: [
        { hiring: 'yes', ledgerOpenRoles: 3, jobsUrl: 'https://jobs.ashbyhq.com/a' },
        { hiring: 'yes', ledgerOpenRoles: 0, jobsUrl: 'https://jobs.ashbyhq.com/b' },
        { hiring: 'yes', ledgerOpenRoles: 0 },
        { hiring: 'unknown', ledgerOpenRoles: 2, jobsUrl: 'https://boards.greenhouse.io/c' },
        { ledgerOpenRoles: 1 },
        { hiring: 'unknown' },
      ],
    });
    assert(mh.companies === 6 && mh.hiringYes === 3 && mh.hiringUnknown === 2 && mh.hiringNull === 1, 'mh flags');
    assert(mh.withLedgerOpen === 3 && mh.withJobsUrl === 3, 'mh ledger/jobs');
    assert(mh.hiringYesWithLedger === 1 && mh.hiringYesNoLedger === 2, 'mh yes vs ledger');
    assert(mh.ledgerOpenNotHiringYes === 2, 'mh ledger not yes');
    assert(mh.hiringYesWithJobsUrl === 2 && mh.hiringYesNoJobsUrl === 1, 'mh yes jobs');
    assert(mh.labeledWithoutLedgerShare === 0.6667, 'mh labeled share');
    assert(mh.basis.includes('label lag'), 'mh basis');
  }
  // Pure map profile completeness landscape (Clearbit/Apollo-thin)
  {
    assert(mapDescriptionBucket('') === 'empty', 'desc empty');
    assert(mapDescriptionBucket('short blurb') === 'short', 'desc short');
    assert(mapDescriptionBucket('x'.repeat(50)) === 'medium', 'desc medium');
    assert(mapDescriptionBucket('y'.repeat(200)) === 'long', 'desc long');
    const mp = measureMapProfileLandscape({
      companies: [
        {
          website: 'https://a.com',
          description: 'A full company description that is long enough for medium.',
          inceptionYear: 2019,
          neighborhood: 'SoMa',
          locationPrecision: 'neighborhood',
        },
        {
          website: 'https://b.com',
          description: 'tiny',
          inceptionYear: 2021,
          locationPrecision: 'city',
        },
        { website: '', description: '', inceptionYear: null, locationPrecision: 'city' },
        {
          website: 'https://c.com',
          description: 'z'.repeat(200),
          inceptionYear: 2015,
          locationPrecision: 'city',
        },
        { website: 'https://d.com', description: 'ok text here for medium bucket xx', inceptionYear: 1800 },
      ],
    });
    assert(mp.companies === 5 && mp.withWebsite === 4 && mp.emptyWebsite === 1, 'mp website');
    assert(mp.withDescription === 4 && mp.emptyDescription === 1 && mp.shortDescription === 2, 'mp desc');
    assert(mp.withInception === 3 && mp.withNeighborhood === 1, 'mp inception/neigh');
    assert(mp.coreComplete === 3 && mp.coreCompleteShare === 0.6, 'mp core');
    assert(mp.byDescBucket.some((x) => x.bucket === 'long' && x.n === 1), 'mp desc long');
    assert(mp.byDescBucket.some((x) => x.bucket === 'short' && x.n === 2), 'mp desc short');
    assert(mp.byLocationPrecision.some((x) => x.precision === 'city' && x.n === 3), 'mp loc prec');
    assert(mp.basis.includes('firmographic'), 'mp basis');
  }
  // Pure map inception age-cohort landscape (Crunchbase/Clearbit residual)
  {
    assert(mapInceptionAgeCohort(0) === '0-2y', 'inc cohort 0');
    assert(mapInceptionAgeCohort(2) === '0-2y', 'inc cohort 2');
    assert(mapInceptionAgeCohort(3) === '3-5y', 'inc cohort 3');
    assert(mapInceptionAgeCohort(10) === '6-10y', 'inc cohort 10');
    assert(mapInceptionAgeCohort(15) === '11-20y', 'inc cohort 15');
    assert(mapInceptionAgeCohort(25) === '20y+', 'inc cohort 25');
    const mi = measureMapInceptionLandscape(
      {
        companies: [
          { inceptionYear: 2025, jobsUrl: 'https://jobs.ashbyhq.com/a', hiring: true }, // age 1
          { inceptionYear: 2024, jobsUrl: '', hiring: false }, // age 2
          { inceptionYear: 2021, jobsUrl: 'https://boards.greenhouse.io/b', hiring: true }, // age 5
          { inceptionYear: 2016, jobsUrl: '', hiring: 'yes' }, // age 10
          { inceptionYear: 2010, jobsUrl: 'https://jobs.lever.co/c', hiring: true }, // age 16
          { inceptionYear: 2000, jobsUrl: '', hiring: false }, // age 26
          { inceptionYear: null, jobsUrl: 'https://x.com', hiring: true },
          { inceptionYear: 1800, jobsUrl: '', hiring: false },
        ],
      },
      { asOfYear: 2026 },
    );
    assert(mi.companies === 8 && mi.withInception === 6 && mi.withoutInception === 1 && mi.invalid === 1, 'mi cov');
    assert(mi.asOfYear === 2026 && mi.minYear === 2000 && mi.maxYear === 2025, 'mi years');
    // years [2000,2010,2016,2021,2024,2025] med round((2016+2021)/2)=2019
    // ages  [1,2,5,10,16,26] med round((5+10)/2)=8
    assert(mi.medianYear === 2019 && mi.medianAgeYears === 8, 'mi medians');
    assert(mi.young0to2 === 2 && mi.young0to2Share === 0.3333, 'mi young');
    assert(mi.withJobsUrl === 4 && mi.jobsWithInception === 3, 'mi jobs');
    assert(mi.hiringYes === 5 && mi.hiringWithInception === 4, 'mi hiring');
    assert(mi.byAgeCohort.some((x) => x.cohort === '0-2y' && x.n === 2), 'mi 0-2');
    assert(mi.byAgeCohort.some((x) => x.cohort === '3-5y' && x.n === 1), 'mi 3-5');
    assert(mi.byAgeCohort.some((x) => x.cohort === '20y+' && x.n === 1), 'mi 20+');
    assert(mi.byDecade.some((x) => x.decade === '2020s' && x.n === 3), 'mi decade');
    assert(mi.basis.includes('inceptionYear'), 'mi basis');
  }
  // Pure map retrievedAt freshness landscape (Firecrawl residual)
  {
    const now = Date.parse('2026-07-31T12:00:00.000Z');
    const mr = measureMapRetrievedLandscape(
      {
        companies: [
          {
            retrievedAt: '2026-07-31T11:00:00.000Z', // 1h
            jobsUrl: 'https://jobs.ashbyhq.com/a',
            source: 'Y Combinator',
          },
          {
            retrievedAt: '2026-07-30T12:00:00.000Z', // 24h
            jobsUrl: 'https://boards.greenhouse.io/b',
            source: 'Wikidata',
          },
          {
            retrievedAt: '2026-07-28T12:00:00.000Z', // 72h
            jobsUrl: '',
            source: 'Wikidata',
          },
          { retrievedAt: '', jobsUrl: 'https://x.com', source: 'Hacker News (Who is Hiring)' },
          { retrievedAt: 'bad', jobsUrl: '', source: 'Y Combinator' },
        ],
      },
      { now },
    );
    assert(mr.companies === 5 && mr.withRetrievedAt === 3 && mr.withoutRetrievedAt === 1 && mr.invalid === 1, 'mr cov');
    assert(mr.ge24h === 2 && mr.ge72h === 1 && mr.jobsGe24h === 1, 'mr ge');
    assert(mr.minHours === 1 && mr.maxHours === 72 && mr.medianHours === 24, 'mr extremes');
    assert(mr.withJobsUrl === 3, 'mr jobs');
    assert(mr.byAgeBucket.some((x) => x.bucket === '1-6h' && x.n === 1), 'mr 1-6');
    assert(mr.byAgeBucket.some((x) => x.bucket === '1-3d' && x.n === 1), 'mr 1-3d');
    assert(mr.bySource.some((x) => x.source === 'Wikidata' && x.n === 2), 'mr source');
    assert(mr.basis.includes('retrievedAt'), 'mr basis');
  }
  // Pure map tags landscape (Wellfound/Atlas residual)
  {
    const mt = measureMapTagsLandscape({
      companies: [
        { tags: ['yc', 'YC Spring 2026'], jobsUrl: 'https://jobs.ashbyhq.com/a' },
        { tags: ['wikidata-sf-tech'], jobsUrl: '' },
        { tags: ['hn-hiring'], jobsUrl: 'https://x.com' },
        { tags: ['yc', 'YC Winter 2024'], jobsUrl: 'https://boards.greenhouse.io/b' },
        { tags: [], jobsUrl: '' },
        { tags: ['yc'], jobsUrl: '' },
      ],
    });
    assert(mt.companies === 6 && mt.withTags === 5 && mt.withoutTags === 1, 'mt cov');
    assert(mt.singleTag === 3 && mt.multiTag === 2 && mt.multiShare === 0.3333, 'mt multi');
    assert(mt.ycTag === 3 && mt.ycBatchTag === 2 && mt.wikidataTag === 1 && mt.hnTag === 1, 'mt kinds');
    assert(mt.withJobsUrl === 3 && mt.jobsMultiTag === 2, 'mt jobs');
    assert(mt.byTagCount.some((x) => x.count === '2' && x.n === 2), 'mt count 2');
    assert(mt.byTagTop.some((x) => x.tag === 'yc' && x.n === 3), 'mt top yc');
    assert(mt.basis.includes('tags'), 'mt basis');
  }
  // Pure native-update landscape (Greenhouse updated_at > first_published)
  {
    const nu = measureNativeUpdateLandscape({
      roles: {
        a: {
          closedAt: null,
          provider: 'Greenhouse',
          company: 'Acme',
          nativeUpdatedAfterFirstPublished: true,
        },
        b: {
          closedAt: null,
          provider: 'Greenhouse',
          company: 'Acme',
          nativeUpdatedAfterFirstPublished: true,
        },
        c: {
          closedAt: null,
          provider: 'Greenhouse',
          company: 'Beta',
          nativeUpdatedAfterFirstPublished: false,
        },
        d: {
          closedAt: null,
          provider: 'Greenhouse',
          company: 'Gamma',
          nativeUpdatedAfterFirstPublished: null,
        },
        e: { closedAt: null, provider: 'Ashby', company: 'Delta' },
        f: {
          closedAt: '2026-01-01',
          provider: 'Greenhouse',
          company: 'ClosedCo',
          nativeUpdatedAfterFirstPublished: true,
        },
      },
    });
    assert(nu.open === 5 && nu.withFlag === 4 && nu.withoutFlag === 1, 'nu coverage');
    assert(nu.updatedAfter === 2 && nu.notUpdatedAfter === 1 && nu.flagNull === 1, 'nu flags');
    assert(nu.shareOfOpen === 0.4 && nu.shareOfFlagged === 0.5, 'nu shares');
    assert(nu.byProviderTrue.some((x) => x.provider === 'Greenhouse' && x.n === 2), 'nu byProv');
    assert(nu.byCompanyTop.some((x) => x.company === 'Acme' && x.n === 2), 'nu byCo');
    assert(nu.basis.includes('ghost-job'), 'nu basis');
  }
  // Pure map website host/TLD landscape (Clearbit/Brandfetch-thin)
  {
    assert(mapWebsiteHostParts('https://www.Acme.com/about').host === 'acme.com', 'web host strip');
    assert(mapWebsiteHostParts('acme.ai').tld === 'ai', 'web bare host');
    assert(mapWebsiteHostParts('').tld === '(invalid)', 'web empty');
    const mw = measureMapWebsiteLandscape({
      companies: [
        { website: 'https://www.alpha.com' },
        { website: 'https://beta.ai/jobs' },
        { website: 'gamma.io' },
        { website: 'https://alpha.com/x' },
        { website: '' },
        { website: 'not a url !!!' },
      ],
    });
    assert(mw.companies === 6 && mw.withHost === 4 && mw.invalid === 2, 'mw coverage');
    assert(mw.com === 2 && mw.ai === 1 && mw.io === 1, 'mw tld counts');
    assert(mw.comShare === 0.3333 && mw.aiShare === 0.1667, 'mw shares');
    assert(mw.byTld.some((x) => x.tld === 'com' && x.n === 2), 'mw byTld');
    assert(mw.multiHost.some((x) => x.host === 'alpha.com' && x.n === 2), 'mw multiHost');
    assert(mw.basis.includes('PSL'), 'mw basis');
  }
  // Pure map company aging landscape (CH-15 residual)
  {
    const mag = measureMapAgingLandscape({
      companies: [
        { ledgerOpenRoles: 3, oldestObservedDays: 0, agingRoles: 0 },
        { ledgerOpenRoles: 2, oldestObservedDays: 2, agingRoles: 1, medianPostedDays: 10 },
        { ledgerOpenRoles: 5, oldestObservedDays: 5, agingRoles: 2, medianPostedDays: 40 },
        { ledgerOpenRoles: 1, oldestObservedDays: 10, agingRoles: 0 },
        { ledgerOpenRoles: 4, oldestObservedDays: 45, agingRoles: 3, medianPostedDays: 100 },
        { ledgerOpenRoles: 1 }, // missing oldest
        { ledgerOpenRoles: 0, oldestObservedDays: 99 }, // not ledger-open
        {},
      ],
    });
    assert(mag.withLedgerOpen === 6 && mag.withOldestObserved === 5 && mag.withoutOldestObserved === 1, 'mag cov');
    assert(mag.maxOldestDays === 45 && mag.ge7 === 2 && mag.ge30 === 1, 'mag ge');
    assert(mag.withAgingRoles === 3 && mag.agingRolesSum === 6 && mag.withMedianPosted === 3, 'mag aging');
    assert(mag.byOldestBucket['0d'] === 1 && mag.byOldestBucket['1-2d'] === 1, 'mag young');
    assert(mag.byOldestBucket['3-6d'] === 1 && mag.byOldestBucket['7-13d'] === 1, 'mag mid');
    assert(mag.byOldestBucket['30d+'] === 1, 'mag 30+');
    assert(mag.basis.includes('calendar'), 'mag basis');
  }
  // Pure export open-req landscape (RecruitAI residual)
  {
    const er = measureExportReqLandscape({
      rows: [
        {
          name: 'Acme',
          boardKey: { provider: 'Greenhouse', slug: 'acme' },
          openReqCount: 120,
          openEngReqCount: 80,
          openSalesReqCount: 20,
          openRemoteReqCount: 10,
          openPeopleOpsReqCount: 5,
          noAgencyEvidenceReqCount: 1,
          openObserved7ReqCount: 0,
          attributedPostedReqCount: 100,
          staleAttributedPostedReqCount: 40,
          evergreenAttributedPostedReqCount: 5,
          greenhouseStalePostedUpdated7dReqCount: 30,
          reopenedOpenReqCount: 2,
          ageBasis: 'observed-first-seen',
          companyResearch: { id: 'x' },
        },
        {
          name: 'Beta',
          boardKey: { provider: 'Ashby', slug: 'beta' },
          openReqCount: 3,
          openEngReqCount: 1,
          openSalesReqCount: 0,
          openRemoteReqCount: 0,
          openPeopleOpsReqCount: 0,
          noAgencyEvidenceReqCount: 0,
          openObserved7ReqCount: 0,
          attributedPostedReqCount: 0,
          staleAttributedPostedReqCount: 0,
          evergreenAttributedPostedReqCount: 0,
          greenhouseStalePostedUpdated7dReqCount: 0,
          reopenedOpenReqCount: 0,
          ageBasis: 'observed-first-seen',
        },
        {
          name: 'Gamma',
          boardKey: { provider: 'Greenhouse', slug: 'gamma' },
          openReqCount: 1,
          openEngReqCount: 0,
          openSalesReqCount: 0,
          openRemoteReqCount: 0,
          openPeopleOpsReqCount: 0,
          noAgencyEvidenceReqCount: 0,
          openObserved7ReqCount: 0,
          attributedPostedReqCount: 1,
          staleAttributedPostedReqCount: 0,
          evergreenAttributedPostedReqCount: 0,
          greenhouseStalePostedUpdated7dReqCount: 0,
          reopenedOpenReqCount: 1,
          ageBasis: 'observed-first-seen',
        },
      ],
    });
    assert(er.boards === 3 && er.openReqSum === 124 && er.engSum === 81, 'er sums');
    assert(er.withAttributed === 2 && er.withStaleAttributed === 1 && er.withEvergreen === 1, 'er attr');
    assert(er.withGhStaleUpdate === 1 && er.withReopened === 2 && er.withResearch === 1, 'er flags');
    assert(er.byOpenReqBucket['100+'] === 1 && er.byOpenReqBucket['2-5'] === 1 && er.byOpenReqBucket['1'] === 1, 'er buckets');
    assert(er.byProvider.some((x) => x.provider === 'Greenhouse' && x.n === 2), 'er provider');
    assert(er.byCompanyTop.some((x) => x.company === 'Acme' && x.n === 120), 'er top');
    assert(er.basis.includes('recruitai'), 'er basis');
  }
  // Pure export seniorityMix landscape (Ashby residual)
  {
    const es = measureExportSeniorityLandscape({
      rows: [
        {
          seniorityMix: {
            intern: 1,
            junior: 0,
            senior: 4,
            staff: 2,
            principal: 0,
            leadManager: 1,
            directorPlus: 0,
            unspecified: 2,
          },
        },
        {
          seniorityMix: {
            intern: 0,
            junior: 0,
            senior: 1,
            staff: 0,
            principal: 0,
            leadManager: 0,
            directorPlus: 0,
            unspecified: 9,
          },
        },
        { name: 'no-mix' },
      ],
    });
    assert(es.boards === 3 && es.withMix === 2 && es.withoutMix === 1, 'es cov');
    // specified = (1+4+2+1) + (1) = 9; unspec = 2+9 = 11; roleSum = 20
    assert(es.roleSum === 20 && es.specified === 9 && es.unspecified === 11, 'es sums');
    assert(es.specifiedShare === 0.45, 'es share');
    assert(es.boardsMajorityUnspecified === 1, 'es majority unspec');
    assert(es.byLevel.some((x) => x.level === 'senior' && x.n === 5), 'es senior');
    assert(es.basis.includes('seniorityMix'), 'es basis');
  }
  // Pure export location diversity landscape (Deel/Rippling residual)
  {
    const el = measureExportLocationLandscape({
      rows: [
        { name: 'A', distinctObservedLocationCount: 1, openRemoteReqCount: 0 },
        { name: 'B', distinctObservedLocationCount: 4, openRemoteReqCount: 2 },
        { name: 'C', distinctObservedLocationCount: 15, openRemoteReqCount: 0 },
        { name: 'D', distinctObservedLocationCount: 30, openRemoteReqCount: 5 },
        { name: 'E', distinctObservedLocationCount: 80, openRemoteReqCount: 1 },
      ],
    });
    assert(el.boards === 5 && el.locationLabelSum === 130 && el.maxDistinct === 80, 'el sums');
    assert(el.singleLocation === 1 && el.multiLocation === 4 && el.multiShare === 0.8, 'el multi');
    assert(el.withRemote === 3, 'el remote');
    assert(el.byDistinctBucket['1'] === 1 && el.byDistinctBucket['2-5'] === 1, 'el b1');
    assert(el.byDistinctBucket['6-20'] === 1 && el.byDistinctBucket['21-50'] === 1 && el.byDistinctBucket['50+'] === 1, 'el b2');
    assert(el.byCompanyTop.some((x) => x.company === 'E' && x.n === 80), 'el top');
    assert(el.basis.includes('EOR'), 'el basis');
  }
  // Pure map license/provenance landscape (Wikidata/YC residual)
  {
    const ml = measureMapLicenseLandscape({
      companies: [
        {
          sourceLicense: 'YC-public',
          sourceUrl: 'https://www.ycombinator.com/companies/a',
          jobsUrl: 'https://jobs.ashbyhq.com/a',
        },
        {
          sourceLicense: 'YC-public',
          sourceUrl: 'https://ycombinator.com/companies/b',
        },
        {
          sourceLicense: 'CC0-1.0',
          sourceUrl: 'https://www.wikidata.org/wiki/Q1',
          jobsUrl: 'https://boards.greenhouse.io/c',
        },
        {
          sourceLicense: 'HN-public',
          sourceUrl: 'https://news.ycombinator.com/item?id=1',
        },
        { sourceLicense: '', sourceUrl: '' },
      ],
    });
    assert(ml.companies === 5 && ml.withLicense === 4 && ml.withoutLicense === 1, 'ml cov');
    assert(ml.ycPublic === 2 && ml.cc0 === 1 && ml.hnPublic === 1, 'ml counts');
    assert(ml.ycPublicShare === 0.4 && ml.withJobsUrl === 2, 'ml share');
    assert(ml.byLicense.some((x) => x.license === 'YC-public' && x.n === 2), 'ml byLic');
    assert(ml.bySourceHost.some((x) => x.host === 'ycombinator.com' && x.n === 2), 'ml host');
    assert(ml.byLicenseJobs.some((x) => x.key === 'YC-public|jobs' && x.n === 1), 'ml cross');
    assert(ml.basis.includes('provenance'), 'ml basis');
  }
  // Pure export fn mix landscape (Phenom residual)
  {
    const ef = measureExportFnLandscape({
      rows: [
        {
          openReqCount: 10,
          openEngReqCount: 8,
          openSalesReqCount: 1,
          openPeopleOpsReqCount: 0,
          openRemoteReqCount: 6,
        },
        {
          openReqCount: 4,
          openEngReqCount: 0,
          openSalesReqCount: 3,
          openPeopleOpsReqCount: 1,
          openRemoteReqCount: 0,
        },
        {
          openReqCount: 6,
          openEngReqCount: 2,
          openSalesReqCount: 1,
          openPeopleOpsReqCount: 3,
          openRemoteReqCount: 1,
        },
        {
          openReqCount: 0,
          openEngReqCount: 0,
          openSalesReqCount: 0,
          openPeopleOpsReqCount: 0,
          openRemoteReqCount: 0,
        },
      ],
    });
    assert(ef.boards === 4 && ef.openBoards === 3, 'ef boards');
    assert(ef.engSum === 10 && ef.salesSum === 5 && ef.peopleOpsSum === 4 && ef.remoteSum === 7, 'ef sums');
    assert(ef.engDominant === 1 && ef.salesDominant === 1 && ef.peopleDominant === 1, 'ef dom');
    assert(ef.noEng === 1 && ef.remoteHeavy === 1, 'ef flags');
    assert(ef.engShareOfOpen === 0.5, 'ef eng share'); // 10/20
    assert(ef.byEngShareBucket['0'] === 1 && ef.byEngShareBucket['75-100'] === 1, 'ef buckets');
    assert(ef.basis.includes('openEng'), 'ef basis');
  }
  // Pure map roleMix landscape (Eightfold residual)
  {
    const mr = measureMapRoleMixLandscape({
      companies: [
        { roleMix: { engineering: 8, sales: 2 } },
        { roleMix: { sales: 5, people: 1 } },
        { roleMix: { engineering: 1, other: 3, operations: 1 } },
        { roleMix: {} },
        {},
      ],
    });
    assert(mr.companies === 5 && mr.withRoleMix === 3 && mr.withoutRoleMix === 2, 'mr cov');
    // roles: 10+6+5=21; eng 8+0+1=9; other 3
    assert(mr.roleSum === 21 && mr.engShareOfRoles === 0.4286 && mr.otherShareOfRoles === 0.1429, 'mr shares');
    assert(mr.engDominant === 1, 'mr engDom');
    assert(mr.byFn.some((x) => x.fn === 'engineering' && x.n === 9), 'mr byFn');
    assert(mr.byEngShareBucket['0'] === 1 && mr.byEngShareBucket['75-100'] === 1, 'mr buckets');
    assert(mr.basis.includes('roleMix'), 'mr basis');
  }
  // Pure export day-churn landscape (TheirStack residual)
  {
    const ec = measureExportChurnLandscape({
      rows: [
        {
          name: 'Acme',
          boardKey: { provider: 'Greenhouse' },
          firstObservedTodayReqCount: 3,
          closedTodayReqCount: 1,
          reopenedOpenReqCount: 0,
          firstObservedTodayOlderPostedReqCount: 1,
        },
        {
          name: 'Beta',
          boardKey: { provider: 'Ashby' },
          firstObservedTodayReqCount: 0,
          closedTodayReqCount: 2,
          reopenedOpenReqCount: 1,
          firstObservedTodayOlderPostedReqCount: 0,
        },
        {
          name: 'Quiet',
          boardKey: { provider: 'Greenhouse' },
          firstObservedTodayReqCount: 0,
          closedTodayReqCount: 0,
          reopenedOpenReqCount: 0,
          firstObservedTodayOlderPostedReqCount: 0,
        },
      ],
    });
    assert(ec.boards === 3 && ec.withFirstObservedToday === 1 && ec.firstObservedTodaySum === 3, 'ec first');
    assert(ec.withClosedToday === 2 && ec.closedTodaySum === 3, 'ec closed');
    assert(ec.withReopened === 1 && ec.reopenedSum === 1, 'ec reo');
    assert(ec.withOlderPostedFirstSeen === 1 && ec.olderPostedFirstSeenSum === 1, 'ec older');
    assert(ec.activeChurn === 2 && ec.activeChurnShare === 0.6667, 'ec active');
    assert(ec.netObservedToday === 0, 'ec net'); // 3-3
    assert(ec.byProviderChurn.some((x) => x.provider === 'Greenhouse' && x.n === 1), 'ec prov');
    assert(ec.byCompanyFirstTop.some((x) => x.company === 'Acme' && x.n === 3), 'ec first top');
    assert(ec.byCompanyClosedTop.some((x) => x.company === 'Beta' && x.n === 2), 'ec closed top');
    assert(ec.basis.includes('fill rates') || ec.basis.includes('not fill'), 'ec basis');
  }
  // Pure export age-extremes landscape (Levels / AR-25 residual)
  {
    const ea = measureExportAgeLandscape({
      rows: [
        { name: 'Acme', maxAttributedPostedDays: 120, maxObservedOpenDays: 5 },
        { name: 'Beta', maxAttributedPostedDays: 365, maxObservedOpenDays: 2 },
        { name: 'Gamma', maxAttributedPostedDays: 10, maxObservedOpenDays: 0 },
        { name: 'Delta', maxAttributedPostedDays: null, maxObservedOpenDays: 8 },
        { name: 'Empty' },
      ],
    });
    assert(ea.boards === 5 && ea.withMaxAttributed === 3 && ea.withoutMaxAttributed === 2, 'ea attr cov');
    assert(ea.maxAttributedDays === 365 && ea.boardsAttributedGe90 === 2 && ea.boardsAttributedGe365 === 1, 'ea attr ge');
    assert(ea.byMaxAttributedBucket['90-365d'] === 1 && ea.byMaxAttributedBucket['365d+'] === 1, 'ea attr b');
    assert(ea.byMaxAttributedBucket['7-29d'] === 1 && ea.byMaxAttributedBucket.null === 2, 'ea attr null');
    assert(ea.withMaxObserved === 4 && ea.withoutMaxObserved === 1 && ea.maxObservedDays === 8, 'ea obs');
    assert(ea.boardsObservedGe7 === 1 && ea.byMaxObservedBucket['3-6d'] === 1, 'ea obs b');
    assert(ea.byMaxObservedBucket['7-13d'] === 1 && ea.byMaxObservedBucket['0d'] === 1, 'ea obs young');
    assert(ea.byCompanyAttributedGe90Top.some((x) => x.company === 'Beta' && x.n === 365), 'ea top');
    assert(ea.basis.includes('ghost-job'), 'ea basis');
  }
  // Pure map openRoles vs ledger honesty (jobs-enrich residual)
  {
    const mo = measureMapOpenRolesLandscape({
      companies: [
        { name: 'Acme', openRoles: 10, ledgerOpenRoles: 10, atsSource: 'Greenhouse' },
        { name: 'Beta', openRoles: 5, ledgerOpenRoles: 7, atsSource: 'Ashby' },
        { name: 'Gamma', openRoles: 1, ledgerOpenRoles: 0, atsSource: 'Lever' },
        { name: 'Delta', openRoles: null, ledgerOpenRoles: 3 },
        { name: 'Huge', openRoles: 150, ledgerOpenRoles: 150, atsSource: 'Greenhouse' },
        { name: 'Empty' },
        { name: 'Over', openRoles: 20, ledgerOpenRoles: 12, atsSource: 'Ashby' },
      ],
    });
    assert(mo.companies === 7 && mo.withOpenRoles === 5 && mo.withoutOpenRoles === 2, 'mo cov');
    assert(mo.openRolesSum === 186 && mo.maxOpenRoles === 150, 'mo sums');
    assert(mo.withLedgerOpen === 5 && mo.bothPresent === 4, 'mo both');
    assert(mo.countMatch === 2 && mo.countMismatch === 2 && mo.absDeltaSum === 10, 'mo match');
    assert(mo.openGtLedger === 1 && mo.openLtLedger === 1, 'mo direction');
    assert(mo.openNoLedger === 1 && mo.ledgerNoOpen === 1, 'mo lag');
    assert(mo.matchShare === 0.5, 'mo share');
    assert(mo.byOpenBucket['1'] === 1 && mo.byOpenBucket['2-5'] === 1 && mo.byOpenBucket['100+'] === 1, 'mo b');
    assert(mo.byOpenBucket.null === 2 && mo.byOpenBucket['6-20'] === 2, 'mo b2');
    assert(mo.byCompanyTop.some((x) => x.company === 'Huge' && x.n === 150), 'mo top');
    assert(mo.byAtsMismatch.some((x) => x.ats === 'Ashby' && x.n === 2), 'mo ats mismatch');
    assert(mo.mismatchTop.some((x) => x.company === 'Over' && x.delta === 8), 'mo mismatch top');
    assert(mo.basis.includes('jobs-enrich'), 'mo basis');
  }
  // Pure map jobs-stamp openRolesAt landscape (Firecrawl/jobs-enrich residual)
  {
    const now = Date.parse('2026-07-31T12:00:00.000Z');
    const mjs = measureMapJobsStampLandscape(
      {
        companies: [
          {
            openRolesAt: '2026-07-31T11:00:00.000Z', // 1h
            jobsUrl: 'https://jobs.ashbyhq.com/a',
            openRoles: 3,
            atsSource: 'Ashby',
            jobsSource: 'YC',
          },
          {
            openRolesAt: '2026-07-30T12:00:00.000Z', // 24h
            jobsUrl: 'https://boards.greenhouse.io/b',
            openRoles: 1,
            atsSource: 'Greenhouse',
            jobsSource: 'YC',
          },
          {
            openRolesAt: '2026-07-28T12:00:00.000Z', // 72h
            jobsUrl: '',
            openRoles: 2,
            atsSource: 'Lever',
          },
          {
            openRolesAt: '',
            jobsUrl: 'https://jobs.lever.co/c',
            openRoles: 5,
            jobsSource: 'YC',
          },
          { openRolesAt: 'bad', jobsUrl: '', openRoles: null },
          { jobsUrl: '', openRoles: null },
        ],
      },
      { now },
    );
    assert(mjs.companies === 6 && mjs.withOpenRolesAt === 3 && mjs.withoutOpenRolesAt === 2 && mjs.invalid === 1, 'mjs cov');
    assert(mjs.ge24h === 2 && mjs.ge72h === 1, 'mjs ge');
    assert(mjs.minHours === 1 && mjs.maxHours === 72 && mjs.medianHours === 24, 'mjs extremes');
    assert(mjs.withJobsUrl === 3 && mjs.withOpenRoles === 4 && mjs.withAtsSource === 3, 'mjs cover');
    assert(mjs.withJobsSource === 3 && mjs.jobsUrlNoStamp === 1 && mjs.stampNoJobsUrl === 1, 'mjs lag');
    assert(mjs.openRolesNoStamp === 1, 'mjs open no stamp');
    assert(mjs.byAgeBucket.some((x) => x.bucket === '1-6h' && x.n === 1), 'mjs 1-6');
    assert(mjs.byJobsSource.some((x) => x.jobsSource === 'YC' && x.n === 3), 'mjs jobsSource');
    assert(mjs.byAtsSource.some((x) => x.ats === 'Ashby' && x.n === 1), 'mjs ats');
    assert(mjs.basis.includes('openRolesAt'), 'mjs basis');
  }
  // Pure export companyResearch join landscape (CF residual)
  {
    const erj = measureExportResearchLandscape({
      rows: [
        {
          name: 'Acme',
          companyResearch: {
            status: 'verified',
            source: 'benchmark',
            quarantineHiring: false,
            acceptedFields: ['canonicalCompany', 'productSummary'],
          },
        },
        {
          name: 'Beta',
          companyResearch: {
            status: 'verified',
            source: 'benchmark',
            quarantineHiring: true,
            acceptedFields: ['canonicalCompany', 'productSummary', 'productCategory', 'likelyBuyer'],
          },
        },
        {
          name: 'Gamma',
          companyResearch: {
            status: 'draft',
            source: 'manual',
            acceptedFields: ['canonicalCompany'],
          },
        },
        { name: 'NoCR' },
      ],
    });
    assert(erj.boards === 4 && erj.withResearch === 3 && erj.withoutResearch === 1, 'erj cov');
    assert(erj.researchShare === 0.75 && erj.quarantineHiring === 1, 'erj share');
    assert(erj.acceptedFieldSum === 7 && erj.avgAcceptedFields === 2.33, 'erj fields');
    assert(erj.byStatus.some((x) => x.status === 'verified' && x.n === 2), 'erj status');
    assert(erj.bySource.some((x) => x.source === 'benchmark' && x.n === 2), 'erj source');
    assert(erj.byAcceptedField.some((x) => x.field === 'canonicalCompany' && x.n === 3), 'erj af');
    assert(erj.byCompanyTop.some((x) => x.company === 'Acme' && x.n === 1), 'erj co');
    assert(erj.basis.includes('companyResearch'), 'erj basis');
  }
  // Pure export sample-surface landscape (RecruitAI residual)
  {
    const esm = measureExportSampleLandscape({
      rows: [
        {
          boardKey: { provider: 'Greenhouse' },
          sampleRoleTitle: 'SWE',
          sampleRoleUrl: 'https://x/1',
          sampleLocation: 'SF',
          samplePeopleOpsRoleTitle: 'Recruiter',
          sampleAttributedPostedRoleTitle: 'Old SWE',
          sampleNoAgencyPolicyQuote: 'No agencies',
          sampleNoAgencyPolicyUrl: 'https://x/policy',
        },
        {
          boardKey: { provider: 'Ashby' },
          sampleRoleTitle: 'AE',
          sampleRoleUrl: 'https://x/2',
          sampleLocation: 'NY',
          sampleAttributedPostedRoleUrl: 'https://x/old',
        },
        {
          boardKey: { provider: 'Greenhouse' },
          sampleRoleTitle: 'PM',
          sampleRoleUrl: '',
          sampleLocation: '',
          samplePeopleOpsRoleUrl: 'https://x/people',
        },
        { boardKey: { provider: 'Lever' } },
      ],
    });
    assert(esm.boards === 4 && esm.withSampleRoleTitle === 3 && esm.withSampleRoleUrl === 2, 'esm core');
    assert(esm.withSampleLocation === 2 && esm.coreSampleComplete === 2 && esm.coreSampleShare === 0.5, 'esm loc');
    assert(esm.withSamplePeopleOps === 2 && esm.withSampleAttributed === 2, 'esm flags');
    assert(esm.withNoAgencyQuote === 1 && esm.withNoAgencyUrl === 1, 'esm noag');
    assert(esm.peopleOpsSampleShare === 0.5 && esm.attributedSampleShare === 0.5, 'esm shares');
    assert(esm.byProviderPeopleOps.some((x) => x.provider === 'Greenhouse' && x.n === 2), 'esm peop');
    assert(esm.byProviderAttributed.some((x) => x.provider === 'Ashby' && x.n === 1), 'esm attr');
    assert(esm.basis.includes('sample'), 'esm basis');
  }
  // Pure export relationships graph landscape (RecruitAI residual)
  {
    const empty = measureExportRelationshipLandscape({});
    assert(empty.present === false && empty.nodes === 0 && empty.omitShare === 0, 'erl empty');
    const erl = measureExportRelationshipLandscape({
      relationships: {
        scope: 'test-scope',
        roleLimitPerBoard: 25,
        counts: {
          nodes: 100,
          edges: 110,
          nodeTypes: {
            company: 10,
            ats_board: 10,
            provider: 2,
            open_role: 70,
            company_claim: 5,
            research_source: 3,
          },
          edgeTypes: {
            uses_board: 10,
            served_by: 10,
            has_open_role: 70,
            has_claim: 5,
            supported_by: 5,
          },
          openRolesAvailable: 200,
          openRolesOmitted: 130,
        },
      },
    });
    assert(erl.present === true && erl.nodes === 100 && erl.edges === 110, 'erl totals');
    assert(erl.openRolesAvailable === 200 && erl.openRolesOmitted === 130 && erl.openRolesInGraph === 70, 'erl open');
    assert(erl.omitShare === 0.65, 'erl omit'); // 130/200
    assert(erl.companies === 10 && erl.boards === 10 && erl.providers === 2, 'erl entity');
    assert(erl.claims === 5 && erl.researchSources === 3, 'erl research');
    assert(erl.roleLimitPerBoard === 25 && erl.scope === 'test-scope', 'erl meta');
    assert(erl.byNodeType.some((x) => x.type === 'open_role' && x.n === 70), 'erl ntype');
    assert(erl.byEdgeType.some((x) => x.type === 'has_open_role' && x.n === 70), 'erl etype');
    assert(erl.basis.includes('relationships'), 'erl basis');
  }
  // Pure export providerRouting landscape (Merge/ATS residual)
  {
    const ep = measureExportProviderLandscape({
      providerRouting: {
        strategy: 'exact provider|slug',
        observedProviders: ['Greenhouse', 'Ashby', 'Lever'],
        coverage: {
          Greenhouse: {
            companies: 100,
            openRoles: 7000,
            firstObservedToday: 10,
            closedToday: 20,
            reopenedOpen: 5,
            attributedPosted: 6900,
            staleAttributedPosted: 3000,
            evergreenAttributedPosted: 400,
          },
          Ashby: {
            companies: 180,
            openRoles: 4000,
            firstObservedToday: 15,
            closedToday: 8,
            reopenedOpen: 2,
            attributedPosted: 0,
            staleAttributedPosted: 0,
            evergreenAttributedPosted: 0,
          },
          Lever: {
            companies: 40,
            openRoles: 500,
            firstObservedToday: 0,
            closedToday: 1,
            reopenedOpen: 0,
            attributedPosted: 0,
            staleAttributedPosted: 0,
            evergreenAttributedPosted: 0,
          },
        },
      },
    });
    assert(ep.providers === 3 && ep.companiesSum === 320 && ep.openRolesSum === 11500, 'ep sums');
    assert(ep.attributedPostedSum === 6900 && ep.providersWithAttributed === 1, 'ep attr');
    assert(ep.providersWithoutAttributed === 2 && ep.attributedShareOfOpen === 0.6, 'ep share');
    assert(ep.firstObservedTodaySum === 25 && ep.closedTodaySum === 29, 'ep day');
    assert(ep.byProvider[0].provider === 'Greenhouse' && ep.byProvider[0].openRoles === 7000, 'ep rank');
    assert(ep.byProvider.find((x) => x.provider === 'Ashby')?.attributedShareOfOpen === 0, 'ep ashby');
    assert(ep.observedProviders.includes('Lever') && ep.strategy.includes('slug'), 'ep meta');
    // Fallback path when providerRouting missing
    const ep2 = measureExportProviderLandscape({
      rows: [
        {
          boardKey: { provider: 'Ashby' },
          openReqCount: 10,
          firstObservedTodayReqCount: 1,
          closedTodayReqCount: 0,
          reopenedOpenReqCount: 0,
          attributedPostedReqCount: 0,
          staleAttributedPostedReqCount: 0,
          evergreenAttributedPostedReqCount: 0,
        },
        {
          boardKey: { provider: 'Ashby' },
          openReqCount: 5,
          firstObservedTodayReqCount: 0,
          closedTodayReqCount: 2,
          reopenedOpenReqCount: 1,
          attributedPostedReqCount: 0,
          staleAttributedPostedReqCount: 0,
          evergreenAttributedPostedReqCount: 0,
        },
      ],
    });
    assert(ep2.providers === 1 && ep2.companiesSum === 2 && ep2.openRolesSum === 15, 'ep2 fb');
    assert(ep2.closedTodaySum === 2 && ep2.reopenedOpenSum === 1, 'ep2 day');
    assert(ep.basis.includes('providerRouting'), 'ep basis');
  }
  // Pure export diagnostics landscape (RecruitAI residual)
  {
    const ed = measureExportDiagnosticsLandscape({
      diagnostics: {
        collisions: [],
        duplicateBoards: [{ id: 'dup' }],
        noAgencyEvidence: [{ name: 'Kikoff', count: 2 }],
        changedCompanies: [
          {
            name: 'Exa',
            provider: 'Ashby',
            firstObservedTodayReqCount: 9,
            closedTodayReqCount: 3,
            reopenedOpenReqCount: 0,
            firstObservedTodayOlderPostedReqCount: 1,
          },
          {
            name: 'Okta',
            provider: 'Greenhouse',
            firstObservedTodayReqCount: 0,
            closedTodayReqCount: 9,
            reopenedOpenReqCount: 10,
            firstObservedTodayOlderPostedReqCount: 0,
          },
        ],
      },
      counts: {
        rows: 338,
        rowsBeforeTop: 340,
        ledgerOpenRoleKeys: 339,
        unmatchedAtsCompanies: 0,
        boardCollisions: 0,
        duplicateMapBoards: 1,
        deniedBoards: 0,
        rowsWithCompanyResearch: 15,
        rowsWithLiveReplayedResearch: 15,
        rowsWithUnreplayedCatalogResearch: 0,
        changedCompaniesBeforeTop: 27,
      },
    });
    assert(ed.collisions === 0 && ed.duplicateBoards === 1 && ed.noAgencyEvidenceRows === 1, 'ed lists');
    assert(ed.noAgencyRoleSum === 2 && ed.changedCompanies === 2, 'ed noag/changed');
    assert(ed.changedFirstSum === 9 && ed.changedClosedSum === 12 && ed.changedReopenedSum === 10, 'ed sums');
    assert(ed.changedOlderPostedSum === 1, 'ed older');
    assert(ed.byProviderChanged.some((x) => x.provider === 'Ashby' && x.n === 1), 'ed prov');
    assert(ed.rows === 338 && ed.duplicateMapBoards === 1 && ed.rowsWithCompanyResearch === 15, 'ed counts');
    assert(ed.identityClean === false, 'ed dirty'); // dup boards
    const ed2 = measureExportDiagnosticsLandscape({
      diagnostics: { collisions: [], duplicateBoards: [], noAgencyEvidence: [], changedCompanies: [] },
      counts: {
        rows: 10,
        unmatchedAtsCompanies: 0,
        boardCollisions: 0,
        duplicateMapBoards: 0,
        deniedBoards: 0,
      },
    });
    assert(ed2.identityClean === true && ed2.changedCompanies === 0, 'ed2 clean');
    assert(ed.basis.includes('diagnostics'), 'ed basis');
  }
  // Pure export domain/TLD landscape (Clearbit residual)
  {
    const edom = measureExportDomainLandscape({
      rows: [
        { domain: 'acme.com', boardKey: { provider: 'Greenhouse' } },
        { domain: 'www.beta.ai', boardKey: { provider: 'Ashby' } },
        { domain: 'careers.snowflake.com', boardKey: { provider: 'Greenhouse' } },
        { domain: 'gamma.io', boardKey: { provider: 'Lever' } },
        { domain: 'acme.com', boardKey: { provider: 'Ashby' } },
        { domain: '', boardKey: { provider: 'Greenhouse' } },
        { domain: 'not a domain!!!', boardKey: { provider: 'Ashby' } },
      ],
    });
    assert(edom.boards === 7 && edom.withDomain === 5 && edom.emptyDomain === 1 && edom.invalid === 1, 'edom cov');
    assert(edom.com === 3 && edom.ai === 1 && edom.io === 1, 'edom tld');
    assert(edom.comShare === 0.4286 && edom.multiLabelHost === 1, 'edom multi');
    assert(edom.byTld.some((x) => x.tld === 'com' && x.n === 3), 'edom byTld');
    assert(edom.multiHost.some((x) => x.host === 'acme.com' && x.n === 2), 'edom multiHost');
    assert(edom.byProvider.some((x) => x.provider === 'Greenhouse' && x.n === 3), 'edom prov');
    assert(edom.basis.includes('domain'), 'edom basis');
  }
  // Pure export jobsUrl host-class landscape (Merge/AR-28 residual)
  {
    const ej = measureExportJobsUrlLandscape({
      rows: [
        {
          jobsUrl: 'https://boards.greenhouse.io/acme',
          boardKey: { provider: 'Greenhouse' },
        },
        {
          jobsUrl: 'https://jobs.ashbyhq.com/beta',
          boardKey: { provider: 'Ashby' },
        },
        {
          jobsUrl: 'https://jobs.lever.co/gamma',
          boardKey: { provider: 'Lever' },
        },
        {
          jobsUrl: 'https://company.personio.de/jobs',
          boardKey: { provider: 'Personio' },
        },
        {
          jobsUrl: 'https://www.ycombinator.com/companies/z/jobs',
          boardKey: { provider: 'Ashby' },
        },
        {
          jobsUrl: 'https://boards.greenhouse.io/x',
          boardKey: { provider: 'Ashby' }, // mismatch
        },
        { jobsUrl: '', boardKey: { provider: 'Greenhouse' } },
        { jobsUrl: 'not a url', boardKey: { provider: 'Lever' } },
      ],
    });
    assert(ej.boards === 8 && ej.withJobsUrl === 6 && ej.noJobsUrl === 1 && ej.invalid === 1, 'ej cov');
    assert(ej.primary === 4 && ej.secondary === 1 && ej.yc === 1 && ej.other === 0, 'ej classes');
    assert(ej.primaryShare === 0.5, 'ej share');
    assert(ej.providerHostMatch === 4 && ej.providerHostMismatch === 2, 'ej match');
    // GH match, Ashby match, Lever match, Personio match = 4; Ashby+yc mismatch, Ashby+GH mismatch = 2
    assert(ej.byHost.some((x) => x.host === 'jobs.ashbyhq.com' && x.n === 1), 'ej host');
    assert(ej.byProviderClass.some((x) => x.key === 'Greenhouse|primary' && x.n === 1), 'ej cross');
    assert(ej.basis.includes('jobsUrl'), 'ej basis');
  }
  // Pure export sourceLicense landscape (Wikidata/YC residual)
  {
    const el = measureExportLicenseLandscape({
      rows: [
        {
          sourceLicense: 'YC-public',
          sourceUrl: 'https://www.ycombinator.com/companies/acme',
          boardKey: { provider: 'Ashby' },
        },
        {
          sourceLicense: 'YC-public',
          sourceUrl: 'https://www.ycombinator.com/companies/beta',
          boardKey: { provider: 'Ashby' },
        },
        {
          sourceLicense: 'CC0-1.0',
          sourceUrl: 'https://www.wikidata.org/wiki/Q1',
          boardKey: { provider: 'Greenhouse' },
        },
        {
          sourceLicense: 'HN-public',
          sourceUrl: 'https://news.ycombinator.com/item?id=1',
          boardKey: { provider: 'Lever' },
        },
        { sourceLicense: '', sourceUrl: '', boardKey: { provider: 'Greenhouse' } },
        {
          sourceLicense: 'CC0-1.0',
          sourceUrl: 'not a url',
          boardKey: { provider: 'Ashby' },
        },
      ],
    });
    assert(el.boards === 6 && el.withLicense === 5 && el.withoutLicense === 1, 'el cov');
    assert(el.ycPublic === 2 && el.cc0 === 2 && el.hnPublic === 1, 'el kinds');
    // non-empty invalid sourceUrl still counts present; host falls to (invalid)
    assert(el.ycPublicShare === 0.3333 && el.withSourceUrl === 5, 'el share/url');
    assert(el.byLicense.some((x) => x.license === 'YC-public' && x.n === 2), 'el byLic');
    assert(el.bySourceHost.some((x) => x.host === 'ycombinator.com' && x.n === 2), 'el host');
    assert(el.bySourceHost.some((x) => x.host === '(invalid)' && x.n === 2), 'el invalid host');
    assert(el.byProviderLicense.some((x) => x.key === 'Ashby|YC-public' && x.n === 2), 'el cross');
    assert(el.basis.includes('sourceLicense'), 'el basis');
  }
  // Pure export retrievedAt freshness landscape (Firecrawl/TheirStack residual)
  {
    assert(exportRetrievedAgeBucket(0.5) === '0-1h', 'ret bucket 0-1');
    assert(exportRetrievedAgeBucket(3) === '1-6h', 'ret bucket 1-6');
    assert(exportRetrievedAgeBucket(12) === '6-24h', 'ret bucket 6-24');
    assert(exportRetrievedAgeBucket(48) === '1-3d', 'ret bucket 1-3d');
    assert(exportRetrievedAgeBucket(100) === '3-7d', 'ret bucket 3-7d');
    assert(exportRetrievedAgeBucket(200) === '7d+', 'ret bucket 7d+');
    const now = Date.parse('2026-07-31T12:00:00.000Z');
    const er = measureExportRetrievedLandscape(
      {
        rows: [
          {
            retrievedAt: '2026-07-31T11:30:00.000Z', // 0.5h
            boardKey: { provider: 'Greenhouse' },
          },
          {
            retrievedAt: '2026-07-31T08:00:00.000Z', // 4h
            boardKey: { provider: 'Ashby' },
          },
          {
            retrievedAt: '2026-07-30T12:00:00.000Z', // 24h
            boardKey: { provider: 'Ashby' },
          },
          {
            retrievedAt: '2026-07-28T12:00:00.000Z', // 72h
            boardKey: { provider: 'Lever' },
          },
          { retrievedAt: '', boardKey: { provider: 'Greenhouse' } },
          { retrievedAt: 'not-a-date', boardKey: { provider: 'Ashby' } },
        ],
      },
      { now },
    );
    assert(er.boards === 6 && er.withRetrievedAt === 4 && er.withoutRetrievedAt === 1 && er.invalid === 1, 'er cov');
    assert(er.ge24h === 2 && er.ge72h === 1 && er.ge24Share === 0.3333, 'er ge');
    assert(er.minHours === 0.5 && er.maxHours === 72 && er.medianHours === 14, 'er extremes');
    assert(er.byAgeBucket.some((x) => x.bucket === '0-1h' && x.n === 1), 'er 0-1');
    assert(er.byAgeBucket.some((x) => x.bucket === '1-6h' && x.n === 1), 'er 1-6');
    assert(er.byAgeBucket.some((x) => x.bucket === '1-3d' && x.n === 1), 'er 1-3d');
    assert(er.byAgeBucket.some((x) => x.bucket === '3-7d' && x.n === 1), 'er 3-7d');
    assert(er.byProvider.some((x) => x.provider === 'Ashby' && x.n === 2), 'er prov');
    assert(er.basis.includes('retrievedAt'), 'er basis');
  }
  // Pure export identity join landscape (Dover/ATS residual)
  {
    assert(exportSlugDomainAlign('snowflake', 'careers.snowflake.com'), 'id align careers');
    assert(exportSlugDomainAlign('chime', 'careers.chime.com'), 'id align chime');
    assert(!exportSlugDomainAlign('pylonlabs', 'usepylon.com'), 'id misalign pylon');
    assert(exportDomainAlignLabels('careers.snowflake.com').includes('snowflake'), 'id labels');
    const ei = measureExportIdentityLandscape({
      rows: [
        {
          mapCompanyId: 'yc:acme',
          name: 'Acme',
          domain: 'acme.com',
          boardKey: { provider: 'Ashby', slug: 'acme' },
        },
        {
          mapCompanyId: 'wd:Q1',
          name: 'Beta',
          domain: 'careers.beta.com',
          boardKey: { provider: 'Greenhouse', slug: 'beta' },
        },
        {
          mapCompanyId: 'hn:3',
          name: 'Gamma',
          domain: 'usepylon.com',
          boardKey: { provider: 'Ashby', slug: 'pylonlabs' },
        },
        {
          mapCompanyId: '',
          name: '',
          domain: '',
          boardKey: { provider: 'Lever', slug: '' },
        },
      ],
    });
    assert(ei.boards === 4 && ei.withMapCompanyId === 3 && ei.withoutMapCompanyId === 1, 'ei id');
    assert(ei.withSlug === 3 && ei.withoutSlug === 1, 'ei slug');
    assert(ei.withDomain === 3 && ei.withoutDomain === 1, 'ei domain');
    assert(ei.withName === 3 && ei.emptyName === 1, 'ei name');
    assert(ei.slugDomainAlign === 2 && ei.slugDomainMisalign === 1 && ei.alignShare === 0.6667, 'ei align');
    assert(ei.byIdScheme.some((x) => x.scheme === 'yc' && x.n === 1), 'ei scheme yc');
    assert(ei.byIdScheme.some((x) => x.scheme === 'wd' && x.n === 1), 'ei scheme wd');
    assert(ei.byProviderMisalign.some((x) => x.provider === 'Ashby' && x.n === 1), 'ei mis prov');
    assert(ei.misalignSamples.some((x) => x.slug === 'pylonlabs'), 'ei sample');
    assert(ei.basis.includes('mapCompanyId'), 'ei basis');
  }
  console.log(JSON.stringify({ ok: true, selftest: 'enrichment' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-enrichment.mjs scoreboard|boards|reclassify|batch [--skip-poll] [--skip-import] [--apply-import] [--dry-run] [--selftest]
See docs/die/ENRICHMENT-FEATURES.md for the exhaustive feature inventory.`);
    process.exit(0);
  }
  const cmd = args.find((a) => !a.startsWith('-')) || 'scoreboard';
  if (cmd === 'boards') {
    const cov = buildBoardCoverage({
      map: readJson(MAP_PATH),
      exportDoc: readJson(path.join(BUSY, 'recruitai-export/latest.json')),
    });
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(BOARDS_PATH, `${JSON.stringify(cov, null, 2)}\n`, { mode: 0o600 });
    console.log(
      JSON.stringify(
        {
          ok: true,
          path: BOARDS_PATH,
          map: cov.map,
          export: cov.export,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (cmd === 'scoreboard') {
    const board = buildScoreboard({
      map: readJson(MAP_PATH),
      ledger: readJson(LEDGER_PATH),
      aging: readJson(AGING_PATH),
      exportDoc: readJson(path.join(BUSY, 'recruitai-export/latest.json')),
    });
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(SCOREBOARD_PATH, `${JSON.stringify(board, null, 2)}\n`, { mode: 0o600 });
    console.log(
      JSON.stringify(
        {
          ok: true,
          path: SCOREBOARD_PATH,
          ledgerOpen: board.ledger.open,
          withAgencyPolicy: board.ledger.withAgencyPolicy,
          peopleFn: board.ledger.peopleFn,
          mapWithRoleMix: board.map.withRoleMix,
          export: board.export,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (cmd === 'reclassify') {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) {
      console.error(JSON.stringify({ ok: false, error: 'missing ledger' }));
      process.exit(1);
    }
    const dryRun = args.includes('--dry-run');
    const before = measureLedgerFnDrift(ledger);
    const out = reclassifyLedgerFunctions(ledger);
    const after = measureLedgerFnDrift(ledger);
    if (!dryRun) {
      atomicWrite(LEDGER_PATH, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
    }
    const receipt = {
      ok: true,
      dryRun,
      ...out,
      driftBefore: before.drift,
      driftAfter: after.drift,
      otherOpenAfter: after.otherOpen,
      otherShareAfter: after.otherShare,
      path: dryRun ? null : LEDGER_PATH,
    };
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(path.join(BUSY, 'ledger-fn-reclassify.json'), `${JSON.stringify(receipt, null, 2)}\n`, {
      mode: 0o600,
    });
    console.log(JSON.stringify(receipt));
    return;
  }
  if (cmd === 'batch') {
    const skipPoll = args.includes('--skip-poll');
    const skipImport = args.includes('--skip-import');
    const applyImport = args.includes('--apply-import');
    try {
      const receipt = runBatch({ skipPoll, skipImport, applyImport });
      atomicWrite(path.join(BUSY, 'enrichment-batch-latest.json'), `${JSON.stringify(receipt, null, 2)}\n`, {
        mode: 0o600,
      });
      console.log(
        JSON.stringify(
          {
            ok: receipt.ok,
            steps: receipt.steps.map((s) => ({ name: s.name, ok: s.ok, ms: s.ms, error: s.error })),
            receipt: path.join(BUSY, 'enrichment-batch-latest.json'),
          },
          null,
          2,
        ),
      );
      if (!receipt.ok) process.exit(1);
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }));
      process.exit(1);
    }
    return;
  }
  console.error(JSON.stringify({ ok: false, error: `unknown cmd ${cmd}` }));
  process.exit(1);
}

if (isMain) main();
