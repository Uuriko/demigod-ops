#!/usr/bin/env node
/**
 * demigod-enrichment — scoreboard + offline reclassify + batch pipeline.
 *
 * Exhaustive feature inventory: docs/die/ENRICHMENT-FEATURES.md
 *
 *   node demigod-enrichment.mjs scoreboard
 *   node demigod-enrichment.mjs boards     # AR-28 coverage receipt (no new scrapers)
 *   node demigod-enrichment.mjs reclassify
 *   node demigod-enrichment.mjs feed [--days N] [--limit N]   # public roles feed (website data)
 *   node demigod-enrichment.mjs velocity [--days N]          # hiring open/close velocity (ledger)
 *   node demigod-enrichment.mjs requisitions                 # gated distinct-req stats
 *   node demigod-enrichment.mjs clay                         # website-facing clay summary receipt
 *   node demigod-enrichment.mjs batch [--skip-poll] [--skip-import] [--apply-import]
 *   node demigod-enrichment.mjs --selftest
 *
 * Never invents contacts, scores, fees, or Phase 2 product.
 * Clay = public company/role facts for directory + observed-roles — not people-data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { categorizeRole } from './demigod-startup-jobs-enrich.mjs';
import { rolesFeed, rolesFeedToRss } from './demigod-roles-feed.mjs';
import { publicRolesFromFeed, writeFooterPublicRoles, embedScript, loadCompanyProfiles } from './demigod-public-roles.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const LEDGER_PATH = path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const AGING_PATH = path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json');
const SCOREBOARD_PATH = path.join(BUSY, 'enrichment-scoreboard.json');
const BOARDS_PATH = path.join(BUSY, 'ats-board-coverage.json');
const FEED_PATH = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const VELOCITY_PATH = path.join(BUSY, 'enrichment-velocity.json');
const REQUISITIONS_PATH = path.join(BUSY, 'enrichment-requisitions.json');
const CLAY_PATH = path.join(BUSY, 'enrichment-clay-website.json');
const COVERAGE_PATH = path.join(BUSY, 'enrichment-coverage.json');
const RSS_PATH = path.join(ROOT, 'DEMIGOD-ROLES-FEED.rss');
const PUBLIC_ROLES_PATH = path.join(ROOT, 'DEMIGOD-PUBLIC-ROLES.json');
const SCHEMA = 'demigod.enrichment-scoreboard/1';
const BOARDS_SCHEMA = 'demigod.ats-board-coverage/1';

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
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

export function buildScoreboard({ map, ledger, aging, exportDoc, research } = {}) {
  const roles = Object.values(ledger?.roles || {});
  const open = roles.filter((r) => r && !r.closedAt);
  const openUs = open.filter((r) => r.usPosted);
  const withPolicy = open.filter((r) => r.agencyPolicyEvidence?.status === 'supported').length;
  const withNative = open.filter((r) => r.nativePostedAt).length;
  const people = open.filter((r) => r.fn === 'people').length;
  const byFn = {};
  for (const r of open) byFn[r.fn || 'other'] = (byFn[r.fn || 'other'] || 0) + 1;

  const cos = map?.companies || [];
  const withLedger = cos.filter((c) => (c.ledgerOpenRoles || 0) > 0).length;
  const withObserved7 = cos.filter((c) => (c.observed7 || 0) > 0).length;
  const withAging = cos.filter((c) => (c.agingRoles || 0) > 0).length;
  const withRoleMix = cos.filter((c) => c.roleMix && Object.keys(c.roleMix).length).length;

  const rows = exportDoc?.rows || [];
  const exportSums = {
    rows: rows.length,
    openReq: rows.reduce((s, r) => s + (r.openReqCount || 0), 0),
    eng: rows.reduce((s, r) => s + (r.openEngReqCount || 0), 0),
    sales: rows.reduce((s, r) => s + (r.openSalesReqCount || 0), 0),
    remote: rows.reduce((s, r) => s + (r.openRemoteReqCount || 0), 0),
    peopleOps: rows.reduce((s, r) => s + (r.openPeopleOpsReqCount || 0), 0),
    noAgency: rows.reduce((s, r) => s + (r.noAgencyEvidenceReqCount || 0), 0),
    observed7: rows.reduce((s, r) => s + (r.openObserved7ReqCount || 0), 0),
    research: rows.filter((r) => r.companyResearch).length,
  };

  return {
    schema: SCHEMA,
    at: new Date().toISOString(),
    ledger: {
      totalRoles: roles.length,
      open: open.length,
      openUs: openUs.length,
      withAgencyPolicy: withPolicy,
      withNativePostedAt: withNative,
      withUpdatedAt: open.filter((r) => r.nativeUpdatedAt).length,
      withEmployerDepartment: open.filter((r) => r.employerDepartment).length,
      withEmployerOffice: open.filter((r) => r.employerOffice).length,
      requisitionIdShaped: open.filter((r) => r.requisitionSignal === 'id').length,
      requisitionAbstain: open.filter((r) => r.requisitionSignal === 'abstain').length,
      peopleFn: people,
      byFn,
      updatedAt: ledger?.updatedAt || null,
    },
    map: {
      companies: cos.length,
      withLedgerOpen: withLedger,
      withObserved7,
      withPostedAging: withAging,
      withRoleMix,
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
        }
      : null,
    research: research || null,
    note:
      'Public-attributable hiring facts only. withAgencyPolicy / peopleFn are positive counts, not scores. observed ages stay low until multi-day poll history grows.',
  };
}

/**
 * AR-28 thin: board coverage from map + export diagnostics (no new ATS scrapers).
 */
export function buildBoardCoverage({ map, exportDoc } = {}) {
  const cos = map?.companies || [];
  const byAts = {};
  let withJobsUrl = 0;
  let withOpenRoles = 0;
  let jobsUrlNoRoles = 0;
  let noJobs = 0;
  const samplesNoRoles = [];
  for (const c of cos) {
    const ats = c.atsSource || (c.jobsUrl ? 'url-only' : null);
    if (c.jobsUrl) {
      withJobsUrl++;
      if ((c.openRoles || 0) > 0) {
        withOpenRoles++;
        if (ats && ats !== 'url-only') byAts[ats] = (byAts[ats] || 0) + 1;
      } else {
        jobsUrlNoRoles++;
        if (samplesNoRoles.length < 12) {
          samplesNoRoles.push({
            id: c.id || null,
            name: c.name || null,
            jobsUrl: c.jobsUrl,
            atsSource: c.atsSource || null,
          });
        }
      }
    } else {
      noJobs++;
    }
  }
  const counts = exportDoc?.counts || {};
  return {
    schema: BOARDS_SCHEMA,
    at: new Date().toISOString(),
    map: {
      companies: cos.length,
      withJobsUrl,
      withOpenRoles,
      jobsUrlNoOpenRoles: jobsUrlNoRoles,
      noJobsUrl: noJobs,
      byAtsProvider: byAts,
      sampleJobsUrlNoRoles: samplesNoRoles,
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
      'Coverage facts only. Does not add ATS hosts. jobsUrl without openRoles may be YC jobs page or unpollable board.',
  };
}


/** Days between YYYY-MM-DD strings (UTC day). */
function dayDiff(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/**
 * PURE. Open/close velocity from ledger firstSeen / closedAt (our observation clock).
 * Website-safe: no people data, no scores.
 *
 * BACKFILL IS NOT AN OPEN. When a board enters the ledger, every role already posted on it gets
 * today's `firstSeen`. Counting those as opens measures Demigod starting to watch a company, not
 * the company starting to hire — and it lands at the TOP of the ranking, because a board arrives
 * with its whole backlog at once. Measured 2026-08-16: Block ranked #1 at 195 opened / 1 closed
 * and Reddit #3 at 154 / 3, of which 192 and 152 were roles on boards first tracked that same day.
 *
 * A role present at a board's first observation was never observed opening — we saw it exist, not
 * begin. So the rule is the same one that makes closes trustworthy: only transitions we actually
 * witnessed are events. Backfill is counted and reported separately rather than dropped silently,
 * because "we started tracking 12 boards this week" is real information, just not hiring momentum.
 */
export function hiringVelocity(ledger, { today = new Date().toISOString().slice(0, 10), days = 7 } = {}) {
  const windowDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 90) : 7;
  const roles = Object.values(ledger?.roles || {}).filter((r) => r && typeof r === 'object');
  // Earliest observation per board — the day that board's backlog entered the ledger.
  const boardFirstSeen = {};
  for (const r of roles) {
    if (!r.firstSeen) continue;
    const key = `${r.provider}|${r.slug}`;
    if (!boardFirstSeen[key] || r.firstSeen < boardFirstSeen[key]) boardFirstSeen[key] = r.firstSeen;
  }
  const isBackfill = (r) => r.firstSeen === boardFirstSeen[`${r.provider}|${r.slug}`];
  const opened = [];
  const closed = [];
  const backfilled = [];
  for (const r of roles) {
    if (r.firstSeen && dayDiff(r.firstSeen, today) >= 0 && dayDiff(r.firstSeen, today) <= windowDays) {
      (isBackfill(r) ? backfilled : opened).push(r);
    }
    if (r.closedAt && dayDiff(r.closedAt, today) >= 0 && dayDiff(r.closedAt, today) <= windowDays) {
      closed.push(r);
    }
  }
  const byBoard = {};
  const bump = (r, kind) => {
    const key = `${r.provider}|${r.slug}`;
    const row = (byBoard[key] ||= {
      provider: r.provider,
      slug: r.slug,
      company: r.company || null,
      opened: 0,
      closed: 0,
    });
    row[kind] += 1;
    if (r.company) row.company = r.company;
  };
  for (const r of opened) bump(r, 'opened');
  for (const r of closed) bump(r, 'closed');
  const boards = Object.values(byBoard).sort(
    (a, b) => b.opened + b.closed - (a.opened + a.closed) || String(a.company).localeCompare(String(b.company)),
  );
  return {
    schema: 'demigod.enrichment-velocity/1',
    at: new Date().toISOString(),
    today,
    windowDays,
    basis: 'firstSeen/closedAt on Demigod role-ledger (observation clock), not employer post dates',
    counts: {
      openedInWindow: opened.length,
      closedInWindow: closed.length,
      net: opened.length - closed.length,
      boardsActive: boards.length,
      // Roles that were already posted when we first saw their board. Not opens; reported so the
      // difference between "they started hiring" and "we started looking" stays visible.
      backfilledInWindow: backfilled.length,
      boardsFirstTrackedInWindow: new Set(backfilled.map((r) => `${r.provider}|${r.slug}`)).size,
    },
    topBoards: boards.slice(0, 40),
  };
}

/**
 * PURE. Gated distinct-requisition stats — never silently replace posting counts.
 * Abstains when requisitionSignal !== 'id' (Airbnb ONE/MULTI trap).
 */
export function requisitionStats(ledger) {
  const open = Object.values(ledger?.roles || {}).filter((r) => r && !r.closedAt);
  const byBoard = {};
  let idShaped = 0;
  let abstain = 0;
  let missing = 0;
  for (const r of open) {
    const key = `${r.provider}|${r.slug}`;
    const row = (byBoard[key] ||= {
      provider: r.provider,
      slug: r.slug,
      company: r.company || null,
      postings: 0,
      requisitionIdDistinct: 0,
      requisitionAbstain: 0,
      requisitionMissing: 0,
      _ids: new Set(),
    });
    row.postings += 1;
    if (r.requisitionSignal === 'id' && r.requisitionId) {
      idShaped += 1;
      row._ids.add(r.requisitionId);
    } else if (r.requisitionSignal === 'abstain') {
      abstain += 1;
      row.requisitionAbstain += 1;
    } else {
      missing += 1;
      row.requisitionMissing += 1;
    }
  }
  const boards = Object.values(byBoard).map((b) => {
    const { _ids, ...rest } = b;
    return {
      ...rest,
      requisitionIdDistinct: _ids.size,
      // Honest dual count: postings always; distinct only when ID-shaped.
      note:
        _ids.size > 0 && _ids.size < b.postings
          ? 'distinct ID-shaped requisitions < postings (employer reuses req ids or mixed signals)'
          : b.requisitionAbstain > 0
            ? 'some requisition_id values abstained (not ID-shaped)'
            : null,
    };
  });
  boards.sort((a, b) => b.postings - a.postings);
  return {
    schema: 'demigod.enrichment-requisitions/1',
    at: new Date().toISOString(),
    basis:
      'requisitionSignal=id only counts toward distinct openings; ONE/MULTI/TBD abstain. Postings always reported separately.',
    counts: {
      openPostings: open.length,
      requisitionIdShaped: idShaped,
      requisitionAbstain: abstain,
      requisitionMissing: missing,
      boards: boards.length,
    },
    topBoards: boards.slice(0, 50),
  };
}

/**
 * Website-facing Clay summary: feed + velocity + employer-field coverage + public roles slice.
 */

/**
 * PURE. Coverage + freshness of public employer fields and dual clocks.
 * Fail-closed: empty evidence → 0 counts, never invented fill rates as quality scores.
 */
export function coverageFreshness(ledger, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const open = Object.values(ledger?.roles || {}).filter((r) => r && !r.closedAt);
  const n = open.length;
  const pct = (k) => (n ? Math.round((1000 * k) / n) / 10 : 0);
  const withDept = open.filter((r) => r.employerDepartment).length;
  const withOffice = open.filter((r) => r.employerOffice).length;
  const withUpdated = open.filter((r) => r.nativeUpdatedAt).length;
  const withEmpType = open.filter((r) => r.employmentType).length;
  const withWorkplace = open.filter((r) => r.workplaceType).length;
  const withPosted = open.filter((r) => r.nativePostedAt && r.nativeDateField === 'first_published').length;
  const withReqId = open.filter((r) => r.requisitionSignal === 'id').length;
  const withReqAbs = open.filter((r) => r.requisitionSignal === 'abstain').length;
  let maintainedStale = 0;
  let editedNewerThanFirstSeen = 0;
  const ages = [];
  for (const r of open) {
    const obs = dayDiff(r.firstSeen, today);
    if (Number.isFinite(obs) && obs >= 0) ages.push(obs);
    const posted = r.nativePostedAt && r.nativeDateField === 'first_published' ? dayDiff(r.nativePostedAt, today) : null;
    const edited = r.nativeUpdatedAt ? dayDiff(r.nativeUpdatedAt, today) : null;
    if (posted != null && posted >= 90 && edited != null && edited <= 14) maintainedStale += 1;
    if (r.nativeUpdatedAt && r.firstSeen && r.nativeUpdatedAt > r.firstSeen) editedNewerThanFirstSeen += 1;
  }
  ages.sort((a, b) => a - b);
  const medianAge = ages.length ? ages[Math.floor(ages.length / 2)] : null;
  const maxAge = ages.length ? ages[ages.length - 1] : null;
  return {
    schema: 'demigod.enrichment-coverage/1',
    at: new Date().toISOString(),
    today,
    basis:
      'Field fill is presence of public board/ledger facts on open roles. Percentages are coverage of open postings, not quality scores. maintainedStale = Greenhouse first_published ≥90d and updated_at within 14d.',
    openRoles: n,
    fieldFill: {
      employerDepartment: { n: withDept, pct: pct(withDept) },
      employerOffice: { n: withOffice, pct: pct(withOffice) },
      nativeUpdatedAt: { n: withUpdated, pct: pct(withUpdated) },
      employmentType: { n: withEmpType, pct: pct(withEmpType) },
      workplaceType: { n: withWorkplace, pct: pct(withWorkplace) },
      attributedFirstPublished: { n: withPosted, pct: pct(withPosted) },
      requisitionIdShaped: { n: withReqId, pct: pct(withReqId) },
      requisitionAbstain: { n: withReqAbs, pct: pct(withReqAbs) },
    },
    dualClocks: {
      maintainedStale,
      boardUpdatedAfterFirstSeen: editedNewerThanFirstSeen,
      note: 'firstSeen is our observation; first_published/updated_at are employer clocks when present',
    },
    observationAges: {
      medianDays: medianAge,
      maxDays: maxAge,
      note: 'Observed open age from Demigod firstSeen only',
    },
  };
}

export function clayWebsiteSummary({ ledger, map, aging, feed, velocity, requisitions, publicRoles, coverage } = {}) {
  const open = Object.values(ledger?.roles || {}).filter((r) => r && !r.closedAt);
  return {
    schema: 'demigod.enrichment-clay-website/1',
    at: new Date().toISOString(),
    note:
      'Public company/role facts for directory + observed-roles. Not people enrichment, not matching inventory, not Clay.com clone.',
    ledger: {
      open: open.length,
      withEmployerDepartment: open.filter((r) => r.employerDepartment).length,
      withEmployerOffice: open.filter((r) => r.employerOffice).length,
      withUpdatedAt: open.filter((r) => r.nativeUpdatedAt).length,
      requisitionIdShaped: open.filter((r) => r.requisitionSignal === 'id').length,
      requisitionAbstain: open.filter((r) => r.requisitionSignal === 'abstain').length,
      updatedAt: ledger?.updatedAt || null,
    },
    map: map
      ? {
          companies: (map.companies || []).length,
          withLedgerOpen: (map.companies || []).filter((c) => (c.ledgerOpenRoles || 0) > 0).length,
          withRoleMix: (map.companies || []).filter((c) => c.roleMix && Object.keys(c.roleMix).length).length,
        }
      : null,
    aging: aging
      ? { companyCount: aging.companyCount ?? null, companiesWithAgingRole: aging.companiesWithAgingRole ?? null, today: aging.today ?? null }
      : null,
    feed: feed
      ? {
          schema: feed.schema,
          windowDays: feed.windowDays,
          returned: feed.counts?.returned ?? feed.roles?.length ?? 0,
          inWindow: feed.counts?.inWindow ?? null,
          withEmployerDepartment: feed.counts?.withEmployerDepartment ?? null,
          withBoardUpdatedAt: feed.counts?.withBoardUpdatedAt ?? null,
        }
      : null,
    velocity: velocity?.counts || null,
    requisitions: requisitions?.counts || null,
    publicRoles: publicRoles
      ? { count: publicRoles.roles?.length ?? 0, generatedAt: publicRoles.generatedAt ?? null }
      : null,
    coverage: coverage
      ? {
          openRoles: coverage.openRoles,
          fieldFill: coverage.fieldFill,
          dualClocks: coverage.dualClocks,
          observationAges: coverage.observationAges,
        }
      : null,
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

  const board = buildScoreboard({
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
          fn: 'engineering',
          usPosted: true,
          closedAt: null,
          nativePostedAt: '2026-01-01',
          agencyPolicyEvidence: { status: 'supported' },
        },
        y: { fn: 'people', usPosted: true, closedAt: null },
      },
    },
    aging: { companyCount: 1, companiesWithAgingRole: 1, today: '2026-07-30' },
    exportDoc: {
      schema: 'demigod.recruitai-export/3',
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
  assert(board.map.withRoleMix === 1 && board.export.eng === 3, 'scoreboard map/export');
  assert(board.schema === SCHEMA, 'schema');
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

  const vel = hiringVelocity(
    {
      roles: {
        a: { provider: 'Greenhouse', slug: 'a', company: 'A', firstSeen: '2026-07-28', closedAt: null },
        b: { provider: 'Greenhouse', slug: 'a', company: 'A', firstSeen: '2026-07-01', closedAt: '2026-07-29' },
        c: { provider: 'Lever', slug: 'b', company: 'B', firstSeen: '2026-07-30', closedAt: null },
      },
    },
    { today: '2026-07-31', days: 7 },
  );
  // Board 'a' was already tracked (its earliest role is 2026-07-01), so role 'a' appearing on
  // 07-28 is a witnessed open. Board 'b' is seen for the first time on 07-30 — its role was
  // already posted when we arrived, so it is backfill, not an open. Counting it as an open is
  // what put Block (195 opened / 1 closed) at the top of the live ranking on 2026-08-16.
  assert(vel.counts.openedInWindow === 1 && vel.counts.closedInWindow === 1, 'velocity window counts only witnessed opens');
  assert(vel.counts.backfilledInWindow === 1 && vel.counts.boardsFirstTrackedInWindow === 1, 'the backlog is reported, not dropped');
  assert(!vel.topBoards.some((b) => b.slug === 'b'), 'a board we just started watching is not hiring momentum');
  assert(vel.topBoards.some((b) => b.slug === 'a' && b.opened === 1 && b.closed === 1), 'velocity board');

  const rq = requisitionStats({
    roles: {
      x: { closedAt: null, provider: 'Greenhouse', slug: 's', company: 'S', requisitionId: 'JR1', requisitionSignal: 'id' },
      y: { closedAt: null, provider: 'Greenhouse', slug: 's', company: 'S', requisitionId: 'JR1', requisitionSignal: 'id' },
      z: { closedAt: null, provider: 'Greenhouse', slug: 's', company: 'S', requisitionId: 'ONE', requisitionSignal: 'abstain' },
      w: { closedAt: null, provider: 'Greenhouse', slug: 's', company: 'S' },
    },
  });
  assert(rq.counts.openPostings === 4 && rq.counts.requisitionIdShaped === 2 && rq.counts.requisitionAbstain === 1, 'req counts');
  assert(rq.topBoards[0].requisitionIdDistinct === 1, 'distinct JR1 once');

  const clay = clayWebsiteSummary({
    ledger: { updatedAt: '2026-07-31', roles: { a: { closedAt: null, employerDepartment: 'Eng', nativeUpdatedAt: '2026-07-30' } } },
    feed: { schema: 'demigod.roles-feed/1', windowDays: 1, counts: { returned: 1 }, roles: [{}] },
    velocity: vel,
    requisitions: rq,
    publicRoles: { roles: [{}, {}], generatedAt: '2026-07-31T00:00:00.000Z' },
  });
  assert(clay.schema === 'demigod.enrichment-clay-website/1' && clay.publicRoles.count === 2, 'clay summary');
  const covFresh = coverageFreshness({
    roles: {
      a: { closedAt: null, firstSeen: '2026-01-01', employerDepartment: 'E', nativeUpdatedAt: '2026-07-20', nativePostedAt: '2026-01-01', nativeDateField: 'first_published', requisitionSignal: 'id' },
      b: { closedAt: null, firstSeen: '2026-07-01', requisitionSignal: 'abstain', requisitionId: 'ONE' },
    },
  }, { today: '2026-07-31' });
  assert(covFresh.schema === 'demigod.enrichment-coverage/1' && covFresh.openRoles === 2, 'coverage schema');
  assert(covFresh.fieldFill.employerDepartment.n === 1 && covFresh.fieldFill.requisitionAbstain.n === 1, 'coverage fill');
  assert(covFresh.dualClocks.maintainedStale === 1, 'maintained stale dual clock');

  console.log(JSON.stringify({ ok: true, selftest: 'enrichment' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-enrichment.mjs scoreboard|boards|reclassify|feed|velocity|requisitions|coverage|clay|batch [--skip-poll] [--skip-import] [--apply-import] [--selftest]
See docs/die/ENRICHMENT-FEATURES.md for the exhaustive feature inventory.`);
    process.exit(0);
  }
  const cmd = args.find((a) => !a.startsWith('-')) || 'scoreboard';
  const argNum = (flag, d) => {
    const i = args.indexOf(flag);
    if (i < 0) return d;
    const v = Number(args[i + 1]);
    return Number.isFinite(v) ? v : d;
  };
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
  if (cmd === 'feed') {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) {
      console.error(JSON.stringify({ ok: false, error: 'missing ledger' }));
      process.exit(1);
    }
    const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
    const feed = rolesFeed(ledger, { today, days: argNum('--days', 1), limit: argNum('--limit', 120) });
    atomicWrite(FEED_PATH, `${JSON.stringify(feed, null, 2)}\n`, { mode: 0o600 });
    atomicWrite(RSS_PATH, rolesFeedToRss(feed), { mode: 0o644 });
    const pub = publicRolesFromFeed(feed, { limit: argNum('--public-limit', 8), profiles: loadCompanyProfiles() });
    atomicWrite(PUBLIC_ROLES_PATH, `${JSON.stringify(pub, null, 2)}\n`, { mode: 0o600 });
    const embedPath = path.join(ROOT, 'demigod-public-roles-embed.js');
    atomicWrite(embedPath, embedScript(pub), { mode: 0o600 });
    const footer = writeFooterPublicRoles(pub);
    console.log(
      JSON.stringify(
        {
          ok: true,
          feed: FEED_PATH,
          publicRoles: PUBLIC_ROLES_PATH,
          embed: embedPath,
          footer,
          counts: feed.counts,
          publicCount: pub.roles.length,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (cmd === 'velocity') {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) {
      console.error(JSON.stringify({ ok: false, error: 'missing ledger' }));
      process.exit(1);
    }
    const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
    const vel = hiringVelocity(ledger, { today, days: argNum('--days', 7) });
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(VELOCITY_PATH, `${JSON.stringify(vel, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify({ ok: true, path: VELOCITY_PATH, counts: vel.counts }, null, 2));
    return;
  }
  if (cmd === 'requisitions') {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) {
      console.error(JSON.stringify({ ok: false, error: 'missing ledger' }));
      process.exit(1);
    }
    const rq = requisitionStats(ledger);
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(REQUISITIONS_PATH, `${JSON.stringify(rq, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify({ ok: true, path: REQUISITIONS_PATH, counts: rq.counts }, null, 2));
    return;
  }
  if (cmd === 'coverage') {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) {
      console.error(JSON.stringify({ ok: false, error: 'missing ledger' }));
      process.exit(1);
    }
    const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
    const cov = coverageFreshness(ledger, { today });
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(COVERAGE_PATH, `${JSON.stringify(cov, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify({ ok: true, path: COVERAGE_PATH, openRoles: cov.openRoles, fieldFill: cov.fieldFill, dualClocks: cov.dualClocks }, null, 2));
    return;
  }
  if (cmd === 'clay') {
    const ledger = readJson(LEDGER_PATH);
    if (!ledger) {
      console.error(JSON.stringify({ ok: false, error: 'missing ledger' }));
      process.exit(1);
    }
    const today = process.env.DEMIGOD_LEDGER_DATE || new Date().toISOString().slice(0, 10);
    const feed = rolesFeed(ledger, { today, days: argNum('--days', 1), limit: argNum('--limit', 120) });
    atomicWrite(FEED_PATH, `${JSON.stringify(feed, null, 2)}\n`, { mode: 0o600 });
    const pub = publicRolesFromFeed(feed, { limit: argNum('--public-limit', 8), profiles: loadCompanyProfiles() });
    atomicWrite(PUBLIC_ROLES_PATH, `${JSON.stringify(pub, null, 2)}\n`, { mode: 0o600 });
    atomicWrite(path.join(ROOT, 'demigod-public-roles-embed.js'), embedScript(pub), { mode: 0o600 });
    const footer = writeFooterPublicRoles(pub);
    const velocity = hiringVelocity(ledger, { today, days: argNum('--velocity-days', 7) });
    atomicWrite(VELOCITY_PATH, `${JSON.stringify(velocity, null, 2)}\n`, { mode: 0o600 });
    const requisitions = requisitionStats(ledger);
    atomicWrite(REQUISITIONS_PATH, `${JSON.stringify(requisitions, null, 2)}\n`, { mode: 0o600 });
    const coverage = coverageFreshness(ledger, { today });
    atomicWrite(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`, { mode: 0o600 });
    atomicWrite(RSS_PATH, rolesFeedToRss(feed), { mode: 0o644 });
    const clay = clayWebsiteSummary({
      ledger,
      map: readJson(MAP_PATH),
      aging: readJson(AGING_PATH),
      feed,
      velocity,
      requisitions,
      publicRoles: pub,
      coverage,
    });
    fs.mkdirSync(BUSY, { recursive: true, mode: 0o700 });
    atomicWrite(CLAY_PATH, `${JSON.stringify(clay, null, 2)}\n`, { mode: 0o600 });
    console.log(
      JSON.stringify(
        {
          ok: true,
          clay: CLAY_PATH,
          feed: FEED_PATH,
          velocity: VELOCITY_PATH,
          requisitions: REQUISITIONS_PATH,
          coverage: COVERAGE_PATH,
          rss: RSS_PATH,
          publicRoles: PUBLIC_ROLES_PATH,
          footer,
          summary: clay,
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
    const out = reclassifyLedgerFunctions(ledger);
    atomicWrite(LEDGER_PATH, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
    console.log(JSON.stringify({ ok: true, ...out, path: LEDGER_PATH }));
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
