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
import { categorizeRole } from './demigod-startup-jobs-enrich.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const LEDGER_PATH = path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const AGING_PATH = path.join(ROOT, 'DEMIGOD-DIRECTORY-AGING.json');
const SCOREBOARD_PATH = path.join(BUSY, 'enrichment-scoreboard.json');
const BOARDS_PATH = path.join(BUSY, 'ats-board-coverage.json');
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
  console.log(JSON.stringify({ ok: true, selftest: 'enrichment' }));
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    selftest();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`usage: node demigod-enrichment.mjs scoreboard|boards|reclassify|batch [--skip-poll] [--skip-import] [--apply-import] [--selftest]
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
