#!/usr/bin/env node
/**
 * demigod-recruitai-export — Phase A bridge for lalalune/recruitai-claude
 *
 * Read-only join of DEMIGOD-SF-STARTUP-MAP.json + DEMIGOD-ROLE-LEDGER.json into a
 * provenance-backed pack. No scores, fees, contacts, or sends.
 *
 *   node demigod-recruitai-export.mjs [--top N] [--json] [--selftest]
 *
 * Output: /tmp/dg-busy/recruitai-export/latest.json
 * Plan: docs/process/RECRUITAI-INTEGRATION-PLAN.md
 * Reviews: /tmp/dg-busy/{claude,codex}-recruitai-integration.md
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardFromCompany, postedDaysAgo } from './demigod-role-ledger.mjs';
import { UNSAFE_INVISIBLE_CLASS, atomicWrite, withFileLock } from './demigod-agent-tools-lib.mjs';
import {
  COMPANY_RESEARCH_FIELDS,
  projectCompanyResearch,
  refuseIfStale,
  safeResearchUrl,
} from './demigod-evidence.mjs';
import {
  categorizeRole,
  hasDeniedAtsBoard,
  isRemoteLocation,
  sameWebsiteOwner,
} from './demigod-startup-jobs-enrich.mjs';
import { normalizeAtsJobId } from './demigod-ats-providers.mjs';
import { scrubPII } from './demigod-submissions-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = path.resolve(process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy');
const OUT_DIR = path.join(BUSY, 'recruitai-export');
const GENERATIONS_DIR = path.join(BUSY, 'recruitai-export-generations');
const MAP_PATH = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const LEDGER_PATH = path.join(ROOT, 'DEMIGOD-ROLE-LEDGER.json');
const BENCHMARK_PATH = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
const CATALOG_PATH = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH.json');
const SCHEMA_V3 = 'demigod.recruitai-export/3';
const SCHEMA_V4 = 'demigod.recruitai-export/4';
const SCHEMA_V5 = 'demigod.recruitai-export/5';
const SCHEMA = 'demigod.recruitai-export/6';
const STALE_DAYS = 45;
const EVERGREEN_DAYS = 365;
const SENIORITY_BASIS = 'single-precedence-title-token';
const LOCATION_FOOTPRINT_BASIS = 'distinct-normalized-ats-location-string';
const POSTING_UPDATE_DAYS = 7;
const POSTING_UPDATE_BASIS =
  'Greenhouse:stale-first_published+updated_at-within-7d';
const SENIORITY_BANDS = [
  'intern',
  'junior',
  'senior',
  'staff',
  'principal',
  'leadManager',
  'directorPlus',
  'unspecified',
];
const ROLE_LIMIT_PER_BOARD = 25;
const EXPORT_ORDERING =
  'role-aging: staleObservedReqCount, maxObservedOpenDays, openReqCount; mapCompanyId tie-break';
const PROVIDER_ROUTING_STRATEGY =
  'non-denied exact provider|slug map join; Workable owner-required; legacy owner evidence checked when available';
const RELATIONSHIP_SCOPE = 'exported-companies-and-bounded-open-ledger-roles';
const MAX_PRIVATE_TEXT = 1000;
const UNSAFE_CONTROL_RE =
  new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f' + UNSAFE_INVISIBLE_CLASS + ']', 'g');
const RELATIONSHIP_EDGE_ENDPOINTS = {
  uses_board: ['company', 'ats_board'],
  served_by: ['ats_board', 'provider'],
  has_open_role: ['ats_board', 'open_role'],
  has_claim: ['company', 'company_claim'],
  supported_by: ['company_claim', 'research_source'],
};
const RELATIONSHIP_NODE_TYPES = new Set(
  Object.values(RELATIONSHIP_EDGE_ENDPOINTS).flat(),
);
const RELATIONSHIP_NODE_KEYS = {
  company: ['id', 'type', 'label', 'domain'],
  provider: ['id', 'type', 'label'],
  ats_board: ['id', 'type', 'provider', 'slug', 'jobsUrl'],
  open_role: [
    'id', 'type', 'title', 'location', 'url', 'usPosted',
    'firstSeen', 'lastSeen', 'agencyPolicyEvidence',
  ],
  company_claim: [
    'id', 'type', 'field', 'value', 'status', 'quote',
    'researchedAt', 'researchSource', 'verificationState',
  ],
  research_source: ['id', 'type', 'url'],
};
const RELATIONSHIP_EDGE_KEYS = ['id', 'source', 'target', 'type'];
const EXPORTED_COMPANY_RESEARCH_FIELDS = new Set(
  COMPANY_RESEARCH_FIELDS.filter((field) => field !== 'pricingStatus'),
);
const EXPORT_ROW_KEYS = [
  'mapCompanyId', 'domain', 'name', 'boardKey', 'openReqCount', 'seniorityMix',
  'firstObservedTodayReqCount', 'firstObservedTodayOlderPostedReqCount',
  'closedTodayReqCount', 'reopenedOpenReqCount',
  'greenhouseStalePostedUpdated7dReqCount', 'attributedPostedReqCount',
  'staleAttributedPostedReqCount', 'evergreenAttributedPostedReqCount',
  'maxAttributedPostedDays', 'sampleAttributedPostedRoleTitle',
  'sampleAttributedPostedRoleUrl', 'maxObservedOpenDays', 'staleObservedReqCount',
  'sampleRoleTitle', 'sampleRoleUrl', 'openPeopleOpsReqCount',
  'samplePeopleOpsRoleTitle', 'samplePeopleOpsRoleUrl', 'noAgencyEvidenceReqCount',
  'sampleNoAgencyPolicyQuote', 'sampleNoAgencyPolicyUrl',
  'openEngReqCount', 'openSalesReqCount', 'openRemoteReqCount', 'openObserved7ReqCount',
  'distinctObservedLocationCount',
  'sampleLocation',
  'jobsUrl', 'sourceLicense',
  'sourceUrl', 'retrievedAt', 'ageBasis', 'companyResearch',
];
const V5_EXPORT_ROW_KEYS = EXPORT_ROW_KEYS.filter(
  (key) => key !== 'greenhouseStalePostedUpdated7dReqCount',
);
const V4_EXPORT_ROW_KEYS = V5_EXPORT_ROW_KEYS.filter(
  (key) => key !== 'distinctObservedLocationCount',
);
const V3_EXPORT_ROW_KEYS = V4_EXPORT_ROW_KEYS.filter((key) => key !== 'seniorityMix');
const PATH_OWNED_ROLE_HOSTS = {
  Greenhouse: new Set([
    'boards.greenhouse.io',
    'job-boards.greenhouse.io',
    'job-boards.eu.greenhouse.io',
  ]),
  Lever: new Set(['jobs.lever.co']),
  Ashby: new Set(['jobs.ashbyhq.com']),
  SmartRecruiters: new Set(['jobs.smartrecruiters.com']),
  Workable: new Set(['apply.workable.com']),
};
const FORBIDDEN = new Set([
  'score',
  'qualityscore',
  'email',
  'phone',
  'persona',
  'gmail',
  'send',
  'to',
  'recipient',
]);
const FORBIDDEN_FRAGMENTS = [
  'score',
  'email',
  'phone',
  'persona',
  'gmail',
  'send',
  'recipient',
  'estimatedfee',
  'approv',
  'consent',
  'draft',
  'queue',
  'delivery',
];
const isForbiddenKey = (key) => {
  const normalized = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
  return FORBIDDEN.has(normalized) ||
    FORBIDDEN_FRAGMENTS.some((fragment) => normalized.includes(fragment));
};
const privateText = (value, allowedDomain = '') => {
  if (value == null) return value;
  const raw = String(value).replace(UNSAFE_CONTROL_RE, ' ');
  const safe = raw.toLowerCase().replace(/^www\./, '') === String(allowedDomain).toLowerCase()
    ? raw
    : scrubPII(raw);
  return safe.slice(0, MAX_PRIVATE_TEXT);
};
const isPrivateText = (value, allowedDomain = '') =>
  value == null || privateText(value, allowedDomain) === String(value);
const hasExactKeys = (value, keys) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

function roleUrlMatchesBoard(value, { provider, slug }, jobId, row) {
  try {
    const raw = String(value).trim();
    const url = new URL(raw);
    const authority = /^[a-z]+:\/\/([^/?#]+)/i.exec(raw)?.[1]?.toLowerCase();
    if (!safeResearchUrl(raw) || authority !== url.hostname) return false;
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const values = [...parts, ...url.searchParams.values()];
    const hasJobId = values.some(
      (part) => part === jobId ||
        (provider === 'SmartRecruiters' && part.startsWith(`${jobId}-`)),
    );
    if (provider === 'Recruitee' && url.hostname.endsWith('.recruitee.com')) {
      return url.hostname === `${slug}.recruitee.com` &&
        parts[0] === 'o' &&
        Boolean(parts[1]);
    }
    if (!hasJobId) return false;
    if (provider === 'Greenhouse' && PATH_OWNED_ROLE_HOSTS.Greenhouse.has(url.hostname)) {
      return parts[0] === slug && parts[1] === 'jobs' && parts[2] === jobId;
    }
    if (
      ['Lever', 'Ashby'].includes(provider) &&
      PATH_OWNED_ROLE_HOSTS[provider].has(url.hostname)
    ) {
      return parts[0] === slug && parts[1] === jobId;
    }
    if (
      provider === 'SmartRecruiters' &&
      PATH_OWNED_ROLE_HOSTS.SmartRecruiters.has(url.hostname)
    ) {
      return parts[0] === slug && parts[1]?.startsWith(`${jobId}`);
    }
    if (provider === 'Workable' && PATH_OWNED_ROLE_HOSTS.Workable.has(url.hostname)) {
      return (
        (parts[0] === 'j' && parts[1] === jobId) ||
        (parts[0] === slug && parts[1] === 'j' && parts[2] === jobId)
      );
    }
    if (provider === 'Personio' && url.hostname.endsWith('.jobs.personio.de')) {
      return (
        url.hostname === `${slug}.jobs.personio.de` &&
        parts.length === 2 &&
        parts[0] === 'job' &&
        parts[1] === jobId
      );
    }
    if (
      provider === 'Greenhouse' &&
      url.hostname === 'app.careerpuck.com' &&
      parts[0] === 'job-board' &&
      parts[1] === slug &&
      parts[2] === 'job' &&
      parts[3] === jobId
    ) return true;
    return sameWebsiteOwner(`https://${row.domain}`, raw);
  } catch {
    return false;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function isDay(value) {
  if (typeof value !== 'string') return false;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.max(0, Math.round((db - da) / 86400000));
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function domainFromWebsite(website) {
  try {
    return new URL(safeResearchUrl(website)).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function obsoleteGenerationDirs(candidates, currentSchema) {
  const keptSchemas = new Set([currentSchema]);
  let keptPrevious = false;
  return candidates.flatMap(({ dir, schema }) => {
    if (!schema) return [dir];
    if (!keptPrevious) {
      keptPrevious = true;
      keptSchemas.add(schema);
      return [];
    }
    if (!keptSchemas.has(schema)) {
      keptSchemas.add(schema);
      return [];
    }
    return [dir];
  });
}

function publishExport(doc, csv) {
  const generation = path.join(GENERATIONS_DIR, `${Date.now()}-${process.pid}`);
  const staging = `${generation}.tmp`;
  const nextLink = `${OUT_DIR}.next-${process.pid}-${Date.now()}`;
  let legacy = null;
  try {
    fs.mkdirSync(GENERATIONS_DIR, { recursive: true, mode: 0o700 });
    fs.chmodSync(GENERATIONS_DIR, 0o700);
    fs.mkdirSync(staging, { mode: 0o700 });
    atomicWrite(path.join(staging, 'latest.json'), JSON.stringify(doc, null, 2) + '\n', {
      mode: 0o600,
    });
    atomicWrite(path.join(staging, 'latest.csv'), csv, { mode: 0o600 });
    const files = Object.fromEntries(
      ['latest.json', 'latest.csv'].map((file) => [
        file,
        createHash('sha256').update(fs.readFileSync(path.join(staging, file))).digest('hex'),
      ]),
    );
    // Rename first so commit.generation can bind realpath(generation). Consumers compare
    // commit.generation === realpath(pointer); a literal join() fails when BUSY is a symlink
    // (Claude export integrity note 2026-07-30). Incomplete gen without commit is unreachable
    // until commit lands — consumer requires all three files at 0600.
    fs.renameSync(staging, generation);
    const generationReal = fs.realpathSync(generation);
    atomicWrite(
      path.join(generation, 'commit.json'),
      JSON.stringify({
        schema: 'demigod.recruitai-export-commit/1',
        at: new Date().toISOString(),
        generation: generationReal,
        rows: doc.rows.length,
        rowLimit: doc.rowLimit,
        files,
      }, null, 2) + '\n',
      { mode: 0o600 },
    );
    fs.symlinkSync(generation, nextLink, 'dir');
    let current;
    try {
      current = fs.lstatSync(OUT_DIR);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (current && !current.isSymbolicLink()) {
      legacy = `${OUT_DIR}.legacy-${process.pid}-${Date.now()}`;
      fs.renameSync(OUT_DIR, legacy);
    }
    try {
      fs.renameSync(nextLink, OUT_DIR);
    } catch (error) {
      if (legacy) fs.renameSync(legacy, OUT_DIR);
      throw error;
    }
    if (legacy) fs.rmSync(legacy, { recursive: true, force: true });
    const candidates = fs.readdirSync(GENERATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.endsWith('.tmp'))
      .map((entry) => path.join(GENERATIONS_DIR, entry.name))
      .filter((dir) => dir !== generation && dir !== generationReal)
      .map((dir) => ({ dir, mtimeMs: fs.statSync(dir).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .map(({ dir }) => {
        try {
          const candidate = loadJson(path.join(dir, 'latest.json'));
          assertExportValid(candidate);
          return { dir, schema: candidate.schema };
        } catch {
          return { dir, schema: null };
        }
      });
    for (const dir of obsoleteGenerationDirs(candidates, doc.schema)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return {
      outPath: path.join(OUT_DIR, 'latest.json'),
      csvPath: path.join(OUT_DIR, 'latest.csv'),
      commitPath: path.join(OUT_DIR, 'commit.json'),
      generation: generationReal,
    };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
    try {
      fs.unlinkSync(nextLink);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function countBy(items, field) {
  return Object.fromEntries(
    [...new Set(items.map((item) => item[field]))]
      .sort()
      .map((value) => [value, items.filter((item) => item[field] === value).length]),
  );
}

function sameCounts(actual, declared) {
  if (!declared || typeof declared !== 'object' || Array.isArray(declared)) return false;
  const keys = Object.keys(actual).sort();
  const declaredKeys = Object.keys(declared).sort();
  return (
    keys.length === declaredKeys.length &&
    keys.every((key, index) => key === declaredKeys[index] && actual[key] === declared[key])
  );
}

function compareRoleAging(a, b) {
  return (
    (b.staleObservedReqCount || 0) - (a.staleObservedReqCount || 0) ||
    (b.maxObservedOpenDays || 0) - (a.maxObservedOpenDays || 0) ||
    (b.openReqCount || 0) - (a.openReqCount || 0) ||
    String(a.mapCompanyId).localeCompare(String(b.mapCompanyId))
  );
}

function providerCoverageForRows(rows) {
  const coverage = {};
  for (const row of rows) {
    const provider = row.boardKey.provider;
    const totals = coverage[provider] ||= {
      companies: 0,
      openRoles: 0,
      firstObservedToday: 0,
      firstObservedTodayOlderPosted: 0,
      closedToday: 0,
      reopenedOpen: 0,
      attributedPosted: 0,
      staleAttributedPosted: 0,
      evergreenAttributedPosted: 0,
    };
    totals.companies++;
    totals.openRoles += row.openReqCount;
    totals.firstObservedToday += row.firstObservedTodayReqCount;
    totals.firstObservedTodayOlderPosted += row.firstObservedTodayOlderPostedReqCount;
    totals.closedToday += row.closedTodayReqCount;
    totals.reopenedOpen += row.reopenedOpenReqCount;
    totals.attributedPosted += row.attributedPostedReqCount;
    totals.staleAttributedPosted += row.staleAttributedPostedReqCount;
    totals.evergreenAttributedPosted += row.evergreenAttributedPostedReqCount;
  }
  return Object.fromEntries(
    Object.entries(coverage).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function summarizeRows(rows) {
  const noAgencyEvidence = rows
    .filter((row) => row.noAgencyEvidenceReqCount > 0)
    .slice(0, 20)
    .map((row) => ({
      mapCompanyId: row.mapCompanyId,
      name: privateText(row.name),
      count: row.noAgencyEvidenceReqCount,
      quote: row.sampleNoAgencyPolicyQuote,
      url: row.sampleNoAgencyPolicyUrl,
    }));
  const changedCompanies = rows
    .filter((row) => row.firstObservedTodayReqCount + row.closedTodayReqCount > 0)
    .sort((a, b) =>
      (b.firstObservedTodayReqCount + b.closedTodayReqCount) -
        (a.firstObservedTodayReqCount + a.closedTodayReqCount) ||
      String(a.name || '').localeCompare(String(b.name || '')),
    )
    .slice(0, 20)
    .map((row) => ({
      mapCompanyId: row.mapCompanyId,
      name: privateText(row.name),
      provider: row.boardKey.provider,
      firstObservedTodayReqCount: row.firstObservedTodayReqCount,
      firstObservedTodayOlderPostedReqCount:
        row.firstObservedTodayOlderPostedReqCount,
      closedTodayReqCount: row.closedTodayReqCount,
      reopenedOpenReqCount: row.reopenedOpenReqCount,
    }));
  return {
    counts: {
      noAgencyEvidenceRowsBeforeTop: rows.filter(
        (row) => row.noAgencyEvidenceReqCount > 0,
      ).length,
      changedCompaniesBeforeTop: rows.filter(
        (row) => row.firstObservedTodayReqCount + row.closedTodayReqCount > 0,
      ).length,
      firstObservedTodayReqsBeforeTop: rows.reduce(
        (sum, row) => sum + row.firstObservedTodayReqCount,
        0,
      ),
      firstObservedTodayOlderPostedReqsBeforeTop: rows.reduce(
        (sum, row) => sum + row.firstObservedTodayOlderPostedReqCount,
        0,
      ),
      closedTodayReqsBeforeTop: rows.reduce(
        (sum, row) => sum + row.closedTodayReqCount,
        0,
      ),
      attributedPostedReqsBeforeTop: rows.reduce(
        (sum, row) => sum + row.attributedPostedReqCount,
        0,
      ),
      staleAttributedPostedReqsBeforeTop: rows.reduce(
        (sum, row) => sum + row.staleAttributedPostedReqCount,
        0,
      ),
      evergreenAttributedPostedReqsBeforeTop: rows.reduce(
        (sum, row) => sum + row.evergreenAttributedPostedReqCount,
        0,
      ),
    },
    noAgencyEvidence,
    changedCompanies,
  };
}

const isOpenRoleToday = (role, today) => !role.closedAt && role.lastSeen === today;

export function seniorityFromTitle(value) {
  const title = String(value || '').toLowerCase().replace(/[./_–—-]+/g, ' ');
  if (/\b(?:intern(?:ship)?|co op|apprentice)\b/.test(title)) return 'intern';
  if (/\bchief of staff\b/.test(title)) return 'leadManager';
  if (/^staff accountants?\b/.test(title)) return 'unspecified';
  if (
    /\b(?:director|head|chief|president|vice president|[aes]?vp)\b/.test(title) ||
    /^(?:ceo|cto|cfo|coo|cpo|cio|ciso|cro|cmo)\b/.test(title)
  ) return 'directorPlus';
  if (/\bprincipal\b/.test(title)) return 'principal';
  if (/\bstaff\b/.test(title)) return 'staff';
  if (/\b(?:lead|manager|management)\b/.test(title)) return 'leadManager';
  if (/\b(?:senior|sr)\b/.test(title)) return 'senior';
  if (/\b(?:junior|jr|entry level)\b/.test(title)) return 'junior';
  return 'unspecified';
}

/** Index open and historical ledger roles by provider|slug. */
function indexLedger(ledger, today) {
  const byBoard = new Map();
  const allByBoard = new Map();
  const collisions = [];
  for (const row of Object.values(ledger?.roles || {})) {
    if (!row) continue;
    if (!row.provider || !row.slug) continue;
    const key = `${row.provider}|${row.slug}`;
    if (!allByBoard.has(key)) allByBoard.set(key, []);
    allByBoard.get(key).push(row);
    if (!isOpenRoleToday(row, today)) continue;
    if (!byBoard.has(key)) byBoard.set(key, []);
    byBoard.get(key).push(row);
  }
  // Detect provider|slug that map to multiple company name strings (surface only)
  for (const [key, rows] of byBoard) {
    const names = new Set(
      rows.map((r) => privateText(String(r.company || '').toLowerCase())).filter(Boolean),
    );
    if (names.size > 1) collisions.push({ key, names: [...names] });
  }
  return { byBoard, allByBoard, collisions, today };
}

function aggregateRoles(rows, today, allRows = rows) {
  const seniorityMix = Object.fromEntries(SENIORITY_BANDS.map((band) => [band, 0]));
  let maxObserved = 0;
  let stale = 0;
  let sample = null;
  let samplePeopleOps = null;
  let openPeopleOpsReqCount = 0;
  let sampleNoAgencyPolicy = null;
  let noAgencyEvidenceReqCount = 0;
  let greenhouseStalePostedUpdated7dReqCount = 0;
  let attributedPostedReqCount = 0;
  let staleAttributedPostedReqCount = 0;
  let evergreenAttributedPostedReqCount = 0;
  let maxAttributedPostedDays = null;
  let sampleAttributedPostedRole = null;
  let openEngReqCount = 0;
  let openSalesReqCount = 0;
  let openRemoteReqCount = 0;
  let openObserved7ReqCount = 0;
  let sampleLocation = null;
  const observedLocations = new Set();
  for (const row of rows) {
    seniorityMix[seniorityFromTitle(row.title)]++;
    const fn = categorizeRole(row.title);
    if (fn === 'people') {
      openPeopleOpsReqCount++;
      samplePeopleOps ||= row;
    }
    if (fn === 'engineering' || fn === 'ai/data') openEngReqCount++;
    if (fn === 'sales') openSalesReqCount++;
    if (isRemoteLocation(row.location)) openRemoteReqCount++;
    const normalizedLocation = String(row.location || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
    if (normalizedLocation) observedLocations.add(normalizedLocation);
    if (!sampleLocation && String(row.location || '').trim()) {
      sampleLocation = String(row.location).trim().slice(0, 200);
    }
    if (row.agencyPolicyEvidence?.status === 'supported') {
      noAgencyEvidenceReqCount++;
      sampleNoAgencyPolicy ||= row.agencyPolicyEvidence;
    }
    const postedAge = postedDaysAgo(row, today);
    if (Number.isFinite(postedAge) && postedAge >= 0) {
      attributedPostedReqCount++;
      if (postedAge > EVERGREEN_DAYS) {
        evergreenAttributedPostedReqCount++;
      } else {
        if (postedAge >= STALE_DAYS) {
          staleAttributedPostedReqCount++;
          const updatedAge = daysBetween(row.nativeUpdatedAt, today);
          if (
            row.provider === 'Greenhouse' &&
            row.nativeUpdatedAfterFirstPublished === true &&
            Number.isFinite(updatedAge) &&
            updatedAge >= 0 &&
            updatedAge <= POSTING_UPDATE_DAYS
          ) {
            greenhouseStalePostedUpdated7dReqCount++;
          }
        }
        if (maxAttributedPostedDays == null || postedAge > maxAttributedPostedDays) {
          maxAttributedPostedDays = postedAge;
          sampleAttributedPostedRole = row;
        }
      }
    }
    const obs = daysBetween(row.firstSeen, today);
    if (obs == null) continue;
    if (obs >= 7) openObserved7ReqCount++;
    if (obs > maxObserved) {
      maxObserved = obs;
      sample = row;
    }
    if (obs >= STALE_DAYS) stale++;
  }
  // Prefer a stale sample for the evidence tip if any
  const staleRow = rows.find((r) => (daysBetween(r.firstSeen, today) ?? 0) >= STALE_DAYS) || sample || rows[0];
  return {
    openReqCount: rows.length,
    seniorityMix,
    firstObservedTodayReqCount: allRows.filter((row) => row.firstSeen === today).length,
    firstObservedTodayOlderPostedReqCount: allRows.filter(
      (row) => row.firstSeen === today && (postedDaysAgo(row, today) ?? 0) > 0,
    ).length,
    closedTodayReqCount: allRows.filter((row) => row.closedAt === today).length,
    reopenedOpenReqCount: rows.filter((row) => Number(row.reopenCount || 0) > 0).length,
    greenhouseStalePostedUpdated7dReqCount,
    attributedPostedReqCount,
    staleAttributedPostedReqCount,
    evergreenAttributedPostedReqCount,
    maxAttributedPostedDays,
    sampleAttributedPostedRoleTitle: sampleAttributedPostedRole?.title || null,
    sampleAttributedPostedRoleUrl: sampleAttributedPostedRole?.url || null,
    maxObservedOpenDays: rows.length ? maxObserved : null,
    staleObservedReqCount: stale,
    sampleRoleTitle: staleRow?.title || null,
    sampleRoleUrl: staleRow?.url || null,
    openPeopleOpsReqCount,
    samplePeopleOpsRoleTitle: samplePeopleOps?.title || null,
    samplePeopleOpsRoleUrl: samplePeopleOps?.url || null,
    noAgencyEvidenceReqCount,
    sampleNoAgencyPolicyQuote: sampleNoAgencyPolicy?.quote || null,
    sampleNoAgencyPolicyUrl: sampleNoAgencyPolicy?.url || null,
    openEngReqCount,
    openSalesReqCount,
    openRemoteReqCount,
    openObserved7ReqCount,
    distinctObservedLocationCount: observedLocations.size,
    sampleLocation,
  };
}

/** PII-free company → provider → board → open-role projection for the selected table rows. */
export function buildRelationshipProjection(rows, ledger, today = todayUtc()) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeIds = new Set();
  const selectedBoards = new Map();
  const rolesByBoard = new Map();
  const evidenceUrlsByBoard = new Map();
  let rolesWithoutJobId = 0;
  let openRolesAvailable = 0;
  let openRolesOmitted = 0;
  const addNode = (node) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };
  const addEdge = (edge) => {
    if (edgeIds.has(edge.id)) return;
    edgeIds.add(edge.id);
    edges.push(edge);
  };

  for (const row of rows || []) {
    const provider = row.boardKey.provider;
    const slug = row.boardKey.slug;
    const boardKey = `${provider}|${slug}`;
    const companyId = `company:${row.mapCompanyId}`;
    const providerId = `provider:${provider.toLowerCase()}`;
    const boardId = `board:${boardKey}`;
    selectedBoards.set(boardKey, boardId);
    rolesByBoard.set(boardKey, []);
    evidenceUrlsByBoard.set(boardKey, new Set([
      row.sampleRoleUrl,
      row.samplePeopleOpsRoleUrl,
      row.sampleAttributedPostedRoleUrl,
      row.sampleNoAgencyPolicyUrl,
    ].filter(Boolean)));
    addNode({ id: companyId, type: 'company', label: row.name, domain: row.domain });
    addNode({ id: providerId, type: 'provider', label: provider });
    addNode({ id: boardId, type: 'ats_board', provider, slug, jobsUrl: row.jobsUrl });
    addEdge({
      id: `${companyId}|uses_board|${boardId}`,
      source: companyId,
      target: boardId,
      type: 'uses_board',
    });
    addEdge({
      id: `${boardId}|served_by|${providerId}`,
      source: boardId,
      target: providerId,
      type: 'served_by',
    });
    for (const [field, claim] of Object.entries(row.companyResearch?.fields || {})) {
      const claimId = `claim:${row.mapCompanyId}|${field}`;
      const sourceId = `source:${createHash('sha256')
        .update(claim.evidence.url)
        .digest('hex')}`;
      addNode({
        id: claimId,
        type: 'company_claim',
        field,
        value: claim.value,
        status: claim.status,
        quote: claim.evidence.quote,
        researchedAt: row.companyResearch.researchedAt,
        researchSource: row.companyResearch.source,
        verificationState: row.companyResearch.verification?.state || null,
      });
      addNode({
        id: sourceId,
        type: 'research_source',
        url: claim.evidence.url,
      });
      addEdge({
        id: `${companyId}|has_claim|${claimId}`,
        source: companyId,
        target: claimId,
        type: 'has_claim',
      });
      addEdge({
        id: `${claimId}|supported_by|${sourceId}`,
        source: claimId,
        target: sourceId,
        type: 'supported_by',
      });
    }
  }

  for (const role of Object.values(ledger?.roles || {})) {
    if (!role || !isOpenRoleToday(role, today) || !role.provider || !role.slug) continue;
    const boardKey = `${role.provider}|${role.slug}`;
    if (!selectedBoards.has(boardKey)) continue;
    const jobId = String(role.jobId || '').trim();
    if (!jobId) {
      rolesWithoutJobId++;
      continue;
    }
    rolesByBoard.get(boardKey).push(role);
  }

  for (const [boardKey, boardId] of selectedBoards) {
    const evidenceUrls = evidenceUrlsByBoard.get(boardKey);
    const evidenced = (role) =>
      evidenceUrls.has(role.url) ||
      evidenceUrls.has(role.agencyPolicyEvidence?.url);
    const roles = rolesByBoard.get(boardKey).sort((a, b) =>
      Number(evidenced(b)) - Number(evidenced(a)) ||
      String(a.firstSeen || '9999').localeCompare(String(b.firstSeen || '9999')) ||
      String(a.jobId).localeCompare(String(b.jobId)),
    );
    openRolesAvailable += roles.length;
    openRolesOmitted += Math.max(0, roles.length - ROLE_LIMIT_PER_BOARD);
    for (const role of roles.slice(0, ROLE_LIMIT_PER_BOARD)) {
      const jobId = String(role.jobId).trim();
      const roleId = `role:${role.provider}|${role.slug}|${jobId}`;
      addNode({
        id: roleId,
        type: 'open_role',
        title: privateText(role.title || null),
        location: privateText(role.location || null),
        url: role.url || null,
        usPosted: role.usPosted ?? null,
        firstSeen: role.firstSeen || null,
        lastSeen: role.lastSeen || null,
        agencyPolicyEvidence: role.agencyPolicyEvidence
          ? {
              value:
                role.agencyPolicyEvidence.value ??
                'no_unsolicited_agency_submissions',
              status: role.agencyPolicyEvidence.status,
              quote: privateText(role.agencyPolicyEvidence.quote),
              url: role.agencyPolicyEvidence.url,
            }
          : null,
      });
      addEdge({
        id: `${boardId}|has_open_role|${roleId}`,
        source: boardId,
        target: roleId,
        type: 'has_open_role',
      });
    }
  }

  return {
    scope: RELATIONSHIP_SCOPE,
    roleLimitPerBoard: ROLE_LIMIT_PER_BOARD,
    counts: {
      nodes: nodes.length,
      edges: edges.length,
      nodeTypes: countBy(nodes, 'type'),
      edgeTypes: countBy(edges, 'type'),
      openRolesAvailable,
      openRolesOmitted,
      rolesWithoutJobId,
    },
    nodes,
    edges,
  };
}

/** Source-history diagnostic counts (transport flaky / stale verified). Integers only. */
const SOURCE_HISTORY_COUNT_KEYS = [
  'claims',
  'verified',
  'absent',
  'unknown',
  'staleVerified',
  'textStableFlaky',
];

/**
 * Normalize optional source-history diagnostics for researchEvidence.
 * Invalid shapes return null (omit) — never invent counts.
 */
export function normalizeSourceHistory(input) {
  if (!input || typeof input !== 'object') return null;
  const raw = input.counts && typeof input.counts === 'object' ? input.counts : input;
  const counts = {};
  for (const key of SOURCE_HISTORY_COUNT_KEYS) {
    const n = raw[key];
    if (!Number.isSafeInteger(n) || n < 0) return null;
    counts[key] = n;
  }
  if (counts.verified + counts.absent + counts.unknown > counts.claims) return null;
  if (counts.staleVerified > counts.verified) return null;
  if (counts.textStableFlaky > counts.verified) return null;
  // Missing updatedAt → null timestamp (counts still valid). Present-but-unparseable → omit all.
  let updatedAt = null;
  if (Object.hasOwn(input, 'updatedAt') && input.updatedAt != null) {
    if (
      typeof input.updatedAt !== 'string' ||
      !Number.isFinite(Date.parse(input.updatedAt))
    ) {
      return null;
    }
    updatedAt = input.updatedAt;
  }
  return { updatedAt, counts };
}

/**
 * Build export document. Pure over map+ledger JSON.
 */
export function buildExport(
  map,
  ledger,
  {
    top = 0,
    today = isDay(ledger?.updatedAt) ? ledger.updatedAt : todayUtc(),
    benchmark = {},
    catalog = {},
    researchEvidence = null,
    sourceHistory = null,
  } = {},
) {
  const { byBoard, allByBoard, collisions } = indexLedger(ledger, today);
  const boardOwners = new Map(); // provider|slug → mapCompanyId
  const rows = [];
  const unmatched = [];
  const duplicateBoards = [];
  let deniedBoards = 0;

  for (const company of map?.companies || []) {
    if (hasDeniedAtsBoard(company)) {
      deniedBoards++;
      continue;
    }
    const board = boardFromCompany(company);
    if (!board) continue;
    const key = `${board.provider}|${board.slug}`;
    if (boardOwners.has(key) && boardOwners.get(key) !== company.id) {
      duplicateBoards.push({ key, a: boardOwners.get(key), b: company.id });
      continue;
    }
    boardOwners.set(key, company.id);
    const roleRows = byBoard.get(key) || [];
    const allRoleRows = allByBoard.get(key) || [];
    if (!allRoleRows.length) {
      unmatched.push({ mapCompanyId: company.id, key, reason: 'no-ledger-roles' });
      continue;
    }
    const changedToday = allRoleRows.some(
      (role) => role.firstSeen === today || role.closedAt === today,
    );
    // Preserve the active-hiring table, but retain a board that just became
    // empty long enough for its closure signal to remain inspectable.
    if (!roleRows.length && !changedToday) continue;
    const agg = aggregateRoles(roleRows, today, allRoleRows);
    const row = {
      mapCompanyId: company.id,
      domain: domainFromWebsite(company.website),
      name: privateText(
        company.name || board.company || null,
        domainFromWebsite(company.website),
      ),
      boardKey: { provider: board.provider, slug: board.slug },
      openReqCount: agg.openReqCount,
      seniorityMix: agg.seniorityMix,
      firstObservedTodayReqCount: agg.firstObservedTodayReqCount,
      firstObservedTodayOlderPostedReqCount:
        agg.firstObservedTodayOlderPostedReqCount,
      closedTodayReqCount: agg.closedTodayReqCount,
      reopenedOpenReqCount: agg.reopenedOpenReqCount,
      greenhouseStalePostedUpdated7dReqCount:
        agg.greenhouseStalePostedUpdated7dReqCount,
      attributedPostedReqCount: agg.attributedPostedReqCount,
      staleAttributedPostedReqCount: agg.staleAttributedPostedReqCount,
      evergreenAttributedPostedReqCount: agg.evergreenAttributedPostedReqCount,
      maxAttributedPostedDays: agg.maxAttributedPostedDays,
      sampleAttributedPostedRoleTitle: privateText(agg.sampleAttributedPostedRoleTitle),
      sampleAttributedPostedRoleUrl: agg.sampleAttributedPostedRoleUrl,
      maxObservedOpenDays: agg.maxObservedOpenDays,
      staleObservedReqCount: agg.staleObservedReqCount,
      sampleRoleTitle: privateText(agg.sampleRoleTitle),
      sampleRoleUrl: agg.sampleRoleUrl,
      openPeopleOpsReqCount: agg.openPeopleOpsReqCount,
      samplePeopleOpsRoleTitle: privateText(agg.samplePeopleOpsRoleTitle),
      samplePeopleOpsRoleUrl: agg.samplePeopleOpsRoleUrl,
      noAgencyEvidenceReqCount: agg.noAgencyEvidenceReqCount,
      sampleNoAgencyPolicyQuote: privateText(agg.sampleNoAgencyPolicyQuote),
      sampleNoAgencyPolicyUrl: agg.sampleNoAgencyPolicyUrl,
      openEngReqCount: agg.openEngReqCount,
      openSalesReqCount: agg.openSalesReqCount,
      openRemoteReqCount: agg.openRemoteReqCount,
      openObserved7ReqCount: agg.openObserved7ReqCount,
      distinctObservedLocationCount: agg.distinctObservedLocationCount,
      sampleLocation: privateText(agg.sampleLocation),
      jobsUrl: company.jobsUrl || null,
      sourceLicense: company.sourceLicense || null,
      sourceUrl: company.sourceUrl || null,
      retrievedAt: company.retrievedAt || company.openRolesAt || null,
      ageBasis: 'observed-first-seen',
    };
    for (const key of Object.keys(row)) {
      if (isForbiddenKey(key)) throw new Error(`forbidden field leaked: ${key}`);
    }
    rows.push(row);
  }

  // Role-aging order (honest name — not agency score)
  rows.sort(compareRoleAging);

  const preTopSummary = summarizeRows(rows);
  const researchGate = {
    green:
      researchEvidence?.green === true &&
      researchEvidence?.pass === true &&
      researchEvidence?.fresh === true &&
      researchEvidence?.reason === 'pass-fresh' &&
      typeof researchEvidence?.runId === 'string' &&
      Boolean(researchEvidence.runId.trim()) &&
      typeof researchEvidence?.endedAt === 'string' &&
      Number.isFinite(Date.parse(researchEvidence.endedAt)),
    pass: researchEvidence?.pass === true,
    fresh: researchEvidence?.fresh === true,
    reason: researchEvidence?.reason || 'missing',
    runId: researchEvidence?.runId || null,
    endedAt: researchEvidence?.endedAt || null,
    summary: privateText(researchEvidence?.summary || null),
    scope: 'benchmark_only',
    catalog: {
      rows: Array.isArray(catalog?.companies) ? catalog.companies.length : 0,
      inputSha256: createHash('sha256').update(JSON.stringify(catalog || {})).digest('hex'),
      state: Array.isArray(catalog?.companies) && catalog.companies.length
        ? 'not_live_replayed'
        : 'empty',
    },
    // Bound diagnostics only — never invent; null when missing/malformed.
    sourceHistory: normalizeSourceHistory(sourceHistory),
  };
  const rowLimit = Number.isSafeInteger(top) && top > 0 ? top : null;
  const sliced = (rowLimit ? rows.slice(0, rowLimit) : rows).map((row) => ({
    ...row,
    companyResearch: (() => {
      if (!researchGate.green) return null;
      const projected = projectCompanyResearch({
          companyId: row.mapCompanyId,
          benchmark,
          catalog,
        });
      if (!projected) return null;
      return {
        ...projected,
        fields: Object.fromEntries(
          Object.entries(projected.fields || {}).map(([field, claim]) => [
            field,
            {
              ...claim,
              value: privateText(claim.value),
              evidence: {
                ...claim.evidence,
                quote: privateText(claim.evidence?.quote),
              },
            },
          ]),
        ),
        verification: projected.source === 'benchmark'
          ? {
              state: 'live_replayed',
              runId: researchGate.runId,
              endedAt: researchGate.endedAt,
            }
          : {
              state: 'catalog_not_live_replayed',
              runId: null,
              endedAt: null,
            },
      };
    })(),
  }));
  const relationships = buildRelationshipProjection(sliced, ledger, today);
  const providerCoverage = providerCoverageForRows(sliced);

  return {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    mapGeneratedAt: map?.generatedAt || map?.at || null,
    roleLedgerUpdatedAt: ledger?.updatedAt || null,
    ageBasis: 'observed-first-seen',
    changeDate: today,
    changeBasis: 'ledger-observation',
    staleDaysThreshold: STALE_DAYS,
    evergreenDaysThreshold: EVERGREEN_DAYS,
    attributedPostingBasis: 'Greenhouse:first_published',
    seniorityBasis: SENIORITY_BASIS,
    locationFootprintBasis: LOCATION_FOOTPRINT_BASIS,
    postingUpdateBasis: POSTING_UPDATE_BASIS,
    researchEvidence: researchGate,
    ordering: EXPORT_ORDERING,
    rowLimit,
    providerRouting: {
      strategy: PROVIDER_ROUTING_STRATEGY,
      observedProviders: Object.keys(providerCoverage),
      coverage: providerCoverage,
    },
    counts: {
      rows: sliced.length,
      rowsBeforeTop: rows.length,
      ledgerOpenRoleKeys: byBoard.size,
      unmatchedAtsCompanies: unmatched.length,
      boardCollisions: collisions.length,
      duplicateMapBoards: duplicateBoards.length,
      deniedBoards,
      rowsWithCompanyResearch: sliced.filter((row) => row.companyResearch).length,
      rowsWithLiveReplayedResearch: sliced.filter(
        (row) => row.companyResearch?.verification?.state === 'live_replayed',
      ).length,
      rowsWithUnreplayedCatalogResearch: sliced.filter(
        (row) => row.companyResearch?.verification?.state === 'catalog_not_live_replayed',
      ).length,
      ...preTopSummary.counts,
    },
    diagnostics: {
      collisions: collisions.slice(0, 20),
      duplicateBoards: duplicateBoards.slice(0, 20),
      noAgencyEvidence: preTopSummary.noAgencyEvidence,
      changedCompanies: preTopSummary.changedCompanies,
    },
    rows: sliced,
    relationships,
  };
}

function assertNoForbiddenKeys(value, at = 'export') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenKey(key)) throw new Error(`forbidden ${key} at ${at}`);
    assertNoForbiddenKeys(child, `${at}.${key}`);
  }
}

const STRUCTURED_TEXT_KEYS = new Set([
  'a',
  'b',
  'domain',
  'id',
  'inputsha256',
  'key',
  'mapcompanyid',
  'runid',
  'sha256',
  'slug',
]);
const STRUCTURED_URL_KEYS = new Set([
  'jobsurl',
  'sampleattributedpostedroleurl',
  'samplenoagencypolicyurl',
  'samplepeopleopsroleurl',
  'sampleroleurl',
  'sourceurl',
  'url',
]);
const STRUCTURED_URL_PATH_RE =
  /^export\.(?:rows\.\d+\.(?:jobsUrl|sampleAttributedPostedRoleUrl|sampleNoAgencyPolicyUrl|samplePeopleOpsRoleUrl|sampleRoleUrl|sourceUrl)|rows\.\d+\.companyResearch\.fields\.[^.]+\.evidence\.url|diagnostics\.noAgencyEvidence\.\d+\.url|relationships\.nodes\.\d+\.(?:jobsUrl|url|agencyPolicyEvidence\.url))$/;

function assertNoContactText(value, at = 'export', field = '', parent = null) {
  if (typeof value === 'string') {
    const key = String(field).toLowerCase();
    const maxLength = STRUCTURED_URL_KEYS.has(key) ? 2048 : MAX_PRIVATE_TEXT;
    if (value.length > maxLength) throw new Error(`unbounded text at ${at}`);
    if (UNSAFE_CONTROL_RE.test(value)) {
      UNSAFE_CONTROL_RE.lastIndex = 0;
      throw new Error(`control-shaped text at ${at}`);
    }
    UNSAFE_CONTROL_RE.lastIndex = 0;
    if (scrubPII(value).includes('[contact removed]')) {
      throw new Error(`contact-shaped text at ${at}`);
    }
    if (
      STRUCTURED_URL_KEYS.has(key) &&
      STRUCTURED_URL_PATH_RE.test(at) &&
      safeResearchUrl(value)
    ) return;
    if (
      (key === 'source' || key === 'target') &&
      /\.relationships\.edges\.\d+\.(?:source|target)$/.test(at) &&
      parent?.id &&
      parent?.type
    ) return;
    if (STRUCTURED_TEXT_KEYS.has(key)) return;
    const allowedDomain =
      (key === 'name' || key === 'label') && parent && typeof parent === 'object'
        ? parent.domain
        : '';
    if (!isPrivateText(value, allowedDomain)) {
      throw new Error(`contact-shaped text at ${at}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertNoContactText(child, `${at}.${index}`, field, value));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assertNoContactText(child, `${at}.${key}`, key, value);
  }
}

export function assertExportValid(doc) {
  if (![SCHEMA_V3, SCHEMA_V4, SCHEMA_V5, SCHEMA].includes(doc.schema)) {
    throw new Error(`bad schema ${doc.schema}`);
  }
  if (!Array.isArray(doc.rows) || !doc.rows.length) throw new Error('empty rows');
  if (
    !Number.isSafeInteger(doc.counts?.rows) ||
    doc.counts.rows !== doc.rows.length ||
    !Number.isSafeInteger(doc.counts.rowsBeforeTop) ||
    doc.counts.rowsBeforeTop < doc.rows.length ||
    !(
      doc.rowLimit === null ||
      (Number.isSafeInteger(doc.rowLimit) && doc.rowLimit > 0)
    ) ||
    (doc.rowLimit === null
      ? doc.counts.rowsBeforeTop !== doc.rows.length
      : doc.rows.length !== Math.min(doc.rowLimit, doc.counts.rowsBeforeTop))
  ) {
    throw new Error('invalid row counts');
  }
  if (doc.ageBasis !== 'observed-first-seen') throw new Error('ageBasis must be observed-first-seen');
  if (doc.changeBasis !== 'ledger-observation') throw new Error('changeBasis must be ledger-observation');
  if (
    doc.attributedPostingBasis !== 'Greenhouse:first_published' ||
    (doc.schema === SCHEMA_V3
      ? Object.hasOwn(doc, 'seniorityBasis')
      : doc.seniorityBasis !== SENIORITY_BASIS) ||
    ([SCHEMA_V5, SCHEMA].includes(doc.schema)
      ? doc.locationFootprintBasis !== LOCATION_FOOTPRINT_BASIS
      : Object.hasOwn(doc, 'locationFootprintBasis')) ||
    (doc.schema === SCHEMA
      ? doc.postingUpdateBasis !== POSTING_UPDATE_BASIS
      : Object.hasOwn(doc, 'postingUpdateBasis')) ||
    doc.staleDaysThreshold !== STALE_DAYS ||
    doc.evergreenDaysThreshold !== EVERGREEN_DAYS ||
    doc.ordering !== EXPORT_ORDERING ||
    typeof doc.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(doc.generatedAt)) ||
    typeof doc.mapGeneratedAt !== 'string' ||
    !Number.isFinite(Date.parse(doc.mapGeneratedAt)) ||
    doc.rows.some(
      (row, index) => index > 0 && compareRoleAging(doc.rows[index - 1], row) > 0,
    )
  ) {
    throw new Error('invalid export metadata or ordering');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.changeDate || '')) throw new Error('invalid changeDate');
  if (
    typeof doc.researchEvidence?.green !== 'boolean' ||
    typeof doc.researchEvidence?.pass !== 'boolean' ||
    typeof doc.researchEvidence?.fresh !== 'boolean' ||
    !String(doc.researchEvidence?.reason || '').trim() ||
    doc.researchEvidence?.scope !== 'benchmark_only' ||
    !Number.isSafeInteger(doc.researchEvidence?.catalog?.rows) ||
    !/^[a-f0-9]{64}$/.test(doc.researchEvidence?.catalog?.inputSha256 || '') ||
    !['empty', 'not_live_replayed'].includes(doc.researchEvidence?.catalog?.state) ||
    (doc.researchEvidence.green &&
      (!doc.researchEvidence.pass ||
        !doc.researchEvidence.fresh ||
        doc.researchEvidence.reason !== 'pass-fresh' ||
        typeof doc.researchEvidence.runId !== 'string' ||
        !doc.researchEvidence.runId.trim() ||
        typeof doc.researchEvidence.endedAt !== 'string' ||
        !Number.isFinite(Date.parse(doc.researchEvidence.endedAt)))) ||
    (!doc.researchEvidence.green && doc.rows.some((row) => row.companyResearch)) ||
    (doc.researchEvidence.sourceHistory != null &&
      !normalizeSourceHistory(doc.researchEvidence.sourceHistory))
  ) {
    throw new Error('invalid research evidence gate');
  }
  for (const row of doc.rows) {
    const expectedRowKeys =
      doc.schema === SCHEMA
        ? EXPORT_ROW_KEYS
        : doc.schema === SCHEMA_V5
          ? V5_EXPORT_ROW_KEYS
          : doc.schema === SCHEMA_V4
            ? V4_EXPORT_ROW_KEYS
            : V3_EXPORT_ROW_KEYS;
    if (!row || typeof row !== 'object' || !hasExactKeys(row, expectedRowKeys)) {
      throw new Error('invalid export row shape');
    }
    if (typeof row.mapCompanyId !== 'string' || !row.mapCompanyId.trim()) {
      throw new Error('missing mapCompanyId');
    }
    if (
      !row.boardKey ||
      typeof row.boardKey !== 'object' ||
      !hasExactKeys(row.boardKey, ['provider', 'slug']) ||
      !row.boardKey.provider ||
      !row.boardKey.slug
    ) throw new Error('missing boardKey');
    if (!row.sourceLicense) throw new Error(`missing sourceLicense for ${row.mapCompanyId}`);
    const board = boardFromCompany({
      jobsUrl: row.jobsUrl,
      atsSource: row.boardKey.provider,
    });
    if (
      !safeResearchUrl(row.jobsUrl) ||
      !safeResearchUrl(row.sourceUrl) ||
      (row.domain !== null &&
        (typeof row.domain !== 'string' ||
          domainFromWebsite(`https://${row.domain}`) !== row.domain)) ||
      typeof row.retrievedAt !== 'string' ||
      !Number.isFinite(Date.parse(row.retrievedAt)) ||
      board?.provider !== row.boardKey.provider ||
      board?.slug !== row.boardKey.slug
    ) {
      throw new Error(`invalid source evidence for ${row.mapCompanyId}`);
    }
    if (
      (row.openReqCount > 0 &&
        (!String(row.sampleRoleTitle || '').trim() ||
          !safeResearchUrl(row.sampleRoleUrl))) ||
      (row.openPeopleOpsReqCount > 0 &&
        (!String(row.samplePeopleOpsRoleTitle || '').trim() ||
          !safeResearchUrl(row.samplePeopleOpsRoleUrl))) ||
      (row.openPeopleOpsReqCount === 0 &&
        (row.samplePeopleOpsRoleTitle || row.samplePeopleOpsRoleUrl)) ||
      (row.maxAttributedPostedDays != null &&
        (!String(row.sampleAttributedPostedRoleTitle || '').trim() ||
          !safeResearchUrl(row.sampleAttributedPostedRoleUrl))) ||
      (row.maxAttributedPostedDays == null &&
        (row.sampleAttributedPostedRoleTitle || row.sampleAttributedPostedRoleUrl))
    ) {
      throw new Error(`invalid role evidence for ${row.mapCompanyId}`);
    }
    if (row.ageBasis !== 'observed-first-seen') throw new Error('row ageBasis');
    for (const field of [
      'openReqCount',
      'firstObservedTodayReqCount',
      'firstObservedTodayOlderPostedReqCount',
      'closedTodayReqCount',
      'reopenedOpenReqCount',
      ...(doc.schema === SCHEMA
        ? ['greenhouseStalePostedUpdated7dReqCount']
        : []),
      'attributedPostedReqCount',
      'staleAttributedPostedReqCount',
      'evergreenAttributedPostedReqCount',
      'staleObservedReqCount',
    ]) {
      if (!Number.isSafeInteger(row[field]) || row[field] < 0) {
        throw new Error(`invalid ${field}`);
      }
    }
    if (row.reopenedOpenReqCount > row.openReqCount) {
      throw new Error('reopenedOpenReqCount exceeds openReqCount');
    }
    if (
      doc.schema !== SCHEMA_V3 &&
      (
      !row.seniorityMix ||
      typeof row.seniorityMix !== 'object' ||
      Array.isArray(row.seniorityMix) ||
      !hasExactKeys(row.seniorityMix, SENIORITY_BANDS) ||
      Object.values(row.seniorityMix).some(
        (count) => !Number.isSafeInteger(count) || count < 0,
      ) ||
      Object.values(row.seniorityMix).reduce((sum, count) => sum + count, 0) !==
        row.openReqCount
      )
    ) {
      throw new Error('invalid seniorityMix');
    }
    if (
      [SCHEMA_V5, SCHEMA].includes(doc.schema) &&
      (!Number.isSafeInteger(row.distinctObservedLocationCount) ||
        row.distinctObservedLocationCount < 0 ||
        row.distinctObservedLocationCount > row.openReqCount)
    ) {
      throw new Error('invalid distinctObservedLocationCount');
    }
    if (
      doc.schema === SCHEMA &&
      row.greenhouseStalePostedUpdated7dReqCount >
        row.staleAttributedPostedReqCount
    ) {
      throw new Error('greenhouseStalePostedUpdated7dReqCount exceeds stale posted roles');
    }
    if (
      row.staleObservedReqCount > row.openReqCount ||
      (row.openReqCount === 0
        ? row.maxObservedOpenDays !== null
        : !Number.isSafeInteger(row.maxObservedOpenDays) ||
          row.maxObservedOpenDays < 0)
    ) {
      throw new Error('invalid observed role age');
    }
    if (
      row.firstObservedTodayOlderPostedReqCount >
      row.firstObservedTodayReqCount
    ) {
      throw new Error('prior native post count exceeds first observed count');
    }
    const nonEvergreenAttributed =
      row.attributedPostedReqCount - row.evergreenAttributedPostedReqCount;
    if (
      row.attributedPostedReqCount > row.openReqCount ||
      row.staleAttributedPostedReqCount + row.evergreenAttributedPostedReqCount >
        row.attributedPostedReqCount ||
      (nonEvergreenAttributed === 0 && row.maxAttributedPostedDays !== null) ||
      (nonEvergreenAttributed > 0 &&
        (!Number.isSafeInteger(row.maxAttributedPostedDays) ||
          row.maxAttributedPostedDays < 0 ||
          row.maxAttributedPostedDays > EVERGREEN_DAYS))
    ) {
      throw new Error('invalid attributed posting age counts');
    }
    if (
      !Number.isSafeInteger(row.openPeopleOpsReqCount) ||
      row.openPeopleOpsReqCount < 0 ||
      row.openPeopleOpsReqCount > row.openReqCount
    ) {
      throw new Error('invalid openPeopleOpsReqCount');
    }
    if (
      !Number.isSafeInteger(row.noAgencyEvidenceReqCount) ||
      row.noAgencyEvidenceReqCount < 0 ||
      row.noAgencyEvidenceReqCount > row.openReqCount ||
      (row.noAgencyEvidenceReqCount > 0 &&
        (!row.sampleNoAgencyPolicyQuote ||
          !safeResearchUrl(row.sampleNoAgencyPolicyUrl) ||
          row.sampleNoAgencyPolicyQuote.trim().split(/\s+/).length > 20))
    ) {
      throw new Error('invalid noAgencyEvidenceReqCount');
    }
    for (const field of [
      'openEngReqCount',
      'openSalesReqCount',
      'openRemoteReqCount',
      'openObserved7ReqCount',
    ]) {
      if (
        !Number.isSafeInteger(row[field]) ||
        row[field] < 0 ||
        row[field] > row.openReqCount
      ) {
        throw new Error(`invalid ${field}`);
      }
    }
    if (
      row.sampleLocation != null &&
      (typeof row.sampleLocation !== 'string' ||
        !row.sampleLocation.trim() ||
        row.sampleLocation.length > 200)
    ) {
      throw new Error('invalid sampleLocation');
    }
    if (row.companyResearch) {
      const research = row.companyResearch;
      const acceptedFields = research.acceptedFields;
      const fields =
        research.fields && typeof research.fields === 'object' && !Array.isArray(research.fields)
          ? research.fields
          : null;
      const fieldNames = fields ? Object.keys(fields) : [];
      const expectedStatus = fields && Object.values(fields).some((field) => field?.status === 'conflict')
        ? 'verified_with_conflict'
        : fieldNames.length ? 'verified' : 'unknown';
      if (
        !hasExactKeys(research, [
          'status', 'source', 'researchedAt', 'acceptedFields',
          'quarantineHiring', 'fields', 'verification',
        ]) ||
        !['benchmark', 'catalog'].includes(research.source) ||
        !Array.isArray(acceptedFields) ||
        new Set(acceptedFields).size !== acceptedFields.length ||
        acceptedFields.some((field) => !EXPORTED_COMPANY_RESEARCH_FIELDS.has(field)) ||
        !fields ||
        fieldNames.some(
          (field) =>
            !EXPORTED_COMPANY_RESEARCH_FIELDS.has(field) ||
            !acceptedFields.includes(field),
        ) ||
        research.status !== expectedStatus ||
        typeof research.quarantineHiring !== 'boolean' ||
        (research.researchedAt !== null &&
          (typeof research.researchedAt !== 'string' ||
            !Number.isFinite(Date.parse(research.researchedAt))))
      ) {
        throw new Error('invalid company research source');
      }
      const expectedVerification = research.source === 'benchmark'
        ? 'live_replayed'
        : 'catalog_not_live_replayed';
      if (
        !research.verification ||
        typeof research.verification !== 'object' ||
        !hasExactKeys(research.verification, ['state', 'runId', 'endedAt']) ||
        research.verification.state !== expectedVerification
      ) {
        throw new Error('invalid company research verification state');
      }
      if (
        expectedVerification === 'live_replayed' &&
        (!doc.researchEvidence.green ||
          research.verification.runId !== doc.researchEvidence.runId ||
          research.verification.endedAt !== doc.researchEvidence.endedAt)
      ) {
        throw new Error('unbound live research verification');
      }
      if (
        expectedVerification === 'catalog_not_live_replayed' &&
        (research.verification.runId !== null || research.verification.endedAt !== null)
      ) {
        throw new Error('unbound catalog research verification');
      }
      for (const claim of Object.values(fields)) {
        if (
          !claim ||
          typeof claim !== 'object' ||
          !hasExactKeys(claim, ['value', 'status', 'evidence']) ||
          !claim.evidence ||
          typeof claim.evidence !== 'object' ||
          !hasExactKeys(claim.evidence, ['url', 'quote']) ||
          !['supported', 'conflict'].includes(claim?.status) ||
          !String(claim?.value || '').trim() ||
          !safeResearchUrl(claim?.evidence?.url) ||
          !String(claim?.evidence?.quote || '').trim() ||
          claim.evidence.quote.trim().split(/\s+/).length > 20
        ) {
          throw new Error('invalid company research claim');
        }
      }
    }
    for (const key of Object.keys(row)) {
      if (isForbiddenKey(key)) throw new Error(`forbidden ${key}`);
    }
    // No name-only identity: domain may be null for rare cases but boardKey required
  }
  const expectedProviderCoverage = providerCoverageForRows(doc.rows);
  if (
    doc.providerRouting?.strategy !== PROVIDER_ROUTING_STRATEGY ||
    !Array.isArray(doc.providerRouting?.observedProviders) ||
    doc.providerRouting.observedProviders.join('\0') !==
      Object.keys(expectedProviderCoverage).join('\0') ||
    JSON.stringify(doc.providerRouting.coverage) !==
      JSON.stringify(expectedProviderCoverage) ||
    doc.counts.rowsWithCompanyResearch !==
      doc.rows.filter((row) => row.companyResearch).length ||
    doc.counts.rowsWithLiveReplayedResearch !==
      doc.rows.filter(
        (row) => row.companyResearch?.verification?.state === 'live_replayed',
      ).length ||
    doc.counts.rowsWithUnreplayedCatalogResearch !==
      doc.rows.filter(
        (row) =>
          row.companyResearch?.verification?.state === 'catalog_not_live_replayed',
      ).length
  ) {
    throw new Error('invalid provider routing or research counts');
  }
  const selectedSummary = summarizeRows(doc.rows);
  const preTopCountEntries = Object.entries(selectedSummary.counts);
  const sourceCountFields = [
    'ledgerOpenRoleKeys',
    'unmatchedAtsCompanies',
    'boardCollisions',
    'duplicateMapBoards',
    'deniedBoards',
  ];
  if (
    preTopCountEntries.some(
      ([key, selected]) =>
        !Number.isSafeInteger(doc.counts[key]) ||
        doc.counts[key] < selected ||
        (doc.rowLimit === null && doc.counts[key] !== selected),
    ) ||
    sourceCountFields.some(
      (key) => !Number.isSafeInteger(doc.counts[key]) || doc.counts[key] < 0,
    ) ||
    !Array.isArray(doc.diagnostics?.collisions) ||
    !Array.isArray(doc.diagnostics?.duplicateBoards) ||
    !Array.isArray(doc.diagnostics?.noAgencyEvidence) ||
    !Array.isArray(doc.diagnostics?.changedCompanies) ||
    doc.diagnostics.collisions.length !== Math.min(doc.counts.boardCollisions, 20) ||
    doc.diagnostics.duplicateBoards.length !==
      Math.min(doc.counts.duplicateMapBoards, 20) ||
    doc.diagnostics.noAgencyEvidence.length !==
      Math.min(doc.counts.noAgencyEvidenceRowsBeforeTop, 20) ||
    doc.diagnostics.changedCompanies.length !==
      Math.min(doc.counts.changedCompaniesBeforeTop, 20) ||
    (doc.rowLimit === null &&
      (JSON.stringify(doc.diagnostics.noAgencyEvidence) !==
        JSON.stringify(selectedSummary.noAgencyEvidence) ||
        JSON.stringify(doc.diagnostics.changedCompanies) !==
          JSON.stringify(selectedSummary.changedCompanies)))
  ) {
    throw new Error('invalid pre-top summary');
  }
  const graph = doc.relationships;
  if (
    graph?.scope !== RELATIONSHIP_SCOPE ||
    !Array.isArray(graph?.nodes) ||
    !Array.isArray(graph?.edges) ||
    graph.nodes.some(
      (node) =>
        !node ||
        typeof node !== 'object' ||
        !String(node.id || '').trim() ||
        !RELATIONSHIP_NODE_TYPES.has(node.type) ||
        !hasExactKeys(node, RELATIONSHIP_NODE_KEYS[node.type]),
    ) ||
    graph.edges.some(
      (edge) =>
        !edge ||
        typeof edge !== 'object' ||
        !String(edge.id || '').trim() ||
        !RELATIONSHIP_EDGE_ENDPOINTS[edge.type] ||
        !hasExactKeys(edge, RELATIONSHIP_EDGE_KEYS),
    )
  ) {
    throw new Error('missing relationship projection');
  }
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeIds = new Set(nodesById.keys());
  if (nodeIds.size !== graph.nodes.length) throw new Error('duplicate relationship node id');
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));
  if (edgeIds.size !== graph.edges.length) throw new Error('duplicate relationship edge id');
  const nodeTypes = countBy(graph.nodes, 'type');
  const edgeTypes = countBy(graph.edges, 'type');
  const totalOpenRoles = doc.rows.reduce((sum, row) => sum + row.openReqCount, 0);
  const projectedOpenRoles = nodeTypes.open_role || 0;
  if (
    graph.roleLimitPerBoard !== ROLE_LIMIT_PER_BOARD ||
    graph.counts?.nodes !== graph.nodes.length ||
    graph.counts?.edges !== graph.edges.length ||
    !sameCounts(nodeTypes, graph.counts?.nodeTypes) ||
    !sameCounts(edgeTypes, graph.counts?.edgeTypes) ||
    !Number.isSafeInteger(graph.counts?.openRolesAvailable) ||
    !Number.isSafeInteger(graph.counts?.openRolesOmitted) ||
    !Number.isSafeInteger(graph.counts?.rolesWithoutJobId) ||
    graph.counts.rolesWithoutJobId !== 0 ||
    graph.counts.openRolesAvailable !== totalOpenRoles ||
    graph.counts.openRolesAvailable < projectedOpenRoles ||
    graph.counts.openRolesOmitted < 0 ||
    graph.counts.rolesWithoutJobId < 0 ||
    graph.counts.openRolesAvailable - projectedOpenRoles !==
      graph.counts.openRolesOmitted ||
    graph.counts.openRolesAvailable + graph.counts.rolesWithoutJobId !==
      totalOpenRoles
  ) {
    throw new Error('invalid relationship role bound');
  }

  const rowsByCompanyNode = new Map();
  const rowsByBoardNode = new Map();
  const expectedProviders = new Map();
  const expectedClaims = new Map();
  const expectedSources = new Map();
  const expectedEdges = new Set();
  for (const row of doc.rows) {
    const companyId = `company:${row.mapCompanyId}`;
    const boardId = `board:${row.boardKey.provider}|${row.boardKey.slug}`;
    const providerId = `provider:${row.boardKey.provider.toLowerCase()}`;
    if (rowsByCompanyNode.has(companyId) || rowsByBoardNode.has(boardId)) {
      throw new Error('duplicate relationship row identity');
    }
    rowsByCompanyNode.set(companyId, row);
    rowsByBoardNode.set(boardId, row);
    expectedProviders.set(providerId, row.boardKey.provider);
    expectedEdges.add(`${companyId}|uses_board|${boardId}`);
    expectedEdges.add(`${boardId}|served_by|${providerId}`);
    for (const [field, claim] of Object.entries(row.companyResearch?.fields || {})) {
      const claimId = `claim:${row.mapCompanyId}|${field}`;
      const sourceId = `source:${createHash('sha256')
        .update(claim.evidence.url)
        .digest('hex')}`;
      expectedClaims.set(claimId, { row, field, claim });
      if (
        expectedSources.has(sourceId) &&
        expectedSources.get(sourceId) !== claim.evidence.url
      ) {
        throw new Error('relationship source hash collision');
      }
      expectedSources.set(sourceId, claim.evidence.url);
      expectedEdges.add(`${companyId}|has_claim|${claimId}`);
      expectedEdges.add(`${claimId}|supported_by|${sourceId}`);
    }
  }

  for (const node of graph.nodes) {
    if (node.type === 'company') {
      const row = rowsByCompanyNode.get(node.id);
      if (!row || node.label !== row.name || node.domain !== row.domain) {
        throw new Error('invalid relationship company node');
      }
    } else if (node.type === 'provider') {
      if (
        expectedProviders.get(node.id) !== node.label ||
        node.id !== `provider:${String(node.label || '').toLowerCase()}`
      ) {
        throw new Error('invalid relationship provider node');
      }
    } else if (node.type === 'ats_board') {
      const row = rowsByBoardNode.get(node.id);
      if (
        !row ||
        node.provider !== row.boardKey.provider ||
        node.slug !== row.boardKey.slug ||
        node.jobsUrl !== row.jobsUrl
      ) {
        throw new Error('invalid relationship board node');
      }
    } else if (node.type === 'company_claim') {
      const expected = expectedClaims.get(node.id);
      if (
        !expected ||
        node.field !== expected.field ||
        node.value !== expected.claim.value ||
        node.status !== expected.claim.status ||
        node.quote !== expected.claim.evidence.quote ||
        node.researchedAt !== expected.row.companyResearch.researchedAt ||
        node.researchSource !== expected.row.companyResearch.source ||
        node.verificationState !== expected.row.companyResearch.verification?.state
      ) {
        throw new Error('invalid relationship claim node');
      }
    } else if (node.type === 'research_source') {
      if (
        expectedSources.get(node.id) !== node.url ||
        node.id !== `source:${createHash('sha256').update(node.url).digest('hex')}` ||
        !safeResearchUrl(node.url)
      ) {
        throw new Error('invalid research relationship source');
      }
    } else if (node.type === 'open_role') {
      const evidence = node.agencyPolicyEvidence;
      if (
        typeof node.id !== 'string' ||
        typeof node.title !== 'string' ||
        !node.title.trim() ||
        (node.location !== null && typeof node.location !== 'string') ||
        typeof node.url !== 'string' ||
        !safeResearchUrl(node.url) ||
        (node.usPosted !== null && typeof node.usPosted !== 'boolean') ||
        !isDay(node.firstSeen) ||
        !isDay(node.lastSeen) ||
        node.firstSeen > node.lastSeen ||
        (evidence !== null &&
          (!evidence ||
            typeof evidence !== 'object' ||
            Array.isArray(evidence) ||
            !hasExactKeys(evidence, ['value', 'status', 'quote', 'url']) ||
            evidence.value !== 'no_unsolicited_agency_submissions' ||
            evidence.status !== 'supported' ||
            typeof evidence.quote !== 'string' ||
            !evidence.quote.trim() ||
            evidence.quote.trim().split(/\s+/).length > 20 ||
            typeof evidence.url !== 'string' ||
            !safeResearchUrl(evidence.url) ||
            evidence.url !== node.url))
      ) {
        throw new Error('invalid relationship role node');
      }
    }
  }
  for (const id of [
    ...rowsByCompanyNode.keys(),
    ...rowsByBoardNode.keys(),
    ...expectedProviders.keys(),
    ...expectedClaims.keys(),
    ...expectedSources.keys(),
  ]) {
    if (!nodeIds.has(id)) throw new Error('missing required relationship node');
  }

  const graphRolesByBoard = new Map();
  const roleInbound = new Map();
  for (const edge of graph.edges) {
    if (
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target)
    ) {
      throw new Error('dangling relationship edge');
    }
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    const [sourceType, targetType] = RELATIONSHIP_EDGE_ENDPOINTS[edge.type];
    if (
      source.type !== sourceType ||
      target.type !== targetType ||
      edge.id !== `${edge.source}|${edge.type}|${edge.target}`
    ) {
      throw new Error('invalid relationship edge');
    }
    if (edge.type !== 'has_open_role') {
      if (!expectedEdges.has(edge.id)) throw new Error('unexpected relationship edge');
      continue;
    }
    const rolePrefix = `role:${source.provider}|${source.slug}|`;
    const jobId = edge.target.slice(rolePrefix.length);
    if (
      !rowsByBoardNode.has(edge.source) ||
      edge.source !== `board:${source.provider}|${source.slug}` ||
      !edge.target.startsWith(rolePrefix) ||
      normalizeAtsJobId(jobId) !== jobId ||
      !roleUrlMatchesBoard(target.url, source, jobId, rowsByBoardNode.get(edge.source))
    ) {
      throw new Error('invalid relationship role edge');
    }
    const roles = graphRolesByBoard.get(edge.source) || [];
    roles.push(target);
    graphRolesByBoard.set(edge.source, roles);
    roleInbound.set(edge.target, (roleInbound.get(edge.target) || 0) + 1);
  }
  for (const id of expectedEdges) {
    if (!edgeIds.has(id)) throw new Error('missing required relationship edge');
  }
  for (const node of graph.nodes) {
    if (node.type === 'open_role' && roleInbound.get(node.id) !== 1) {
      throw new Error('unbound relationship role node');
    }
  }
  for (const [boardId, roles] of graphRolesByBoard) {
    const row = rowsByBoardNode.get(boardId);
    if (
      roles.length > ROLE_LIMIT_PER_BOARD ||
      roles.length > row.openReqCount ||
      roles.filter((role) => role.agencyPolicyEvidence !== null).length >
        row.noAgencyEvidenceReqCount
    ) {
      throw new Error('relationship role cap exceeded');
    }
  }
  for (const row of doc.rows) {
    const roles =
      graphRolesByBoard.get(`board:${row.boardKey.provider}|${row.boardKey.slug}`) || [];
    const hasRole = (url, title) =>
      roles.some((role) => role?.url === url && role?.title === title);
    if (
      (row.openReqCount > 0 && !hasRole(row.sampleRoleUrl, row.sampleRoleTitle)) ||
      (row.openPeopleOpsReqCount > 0 &&
        !hasRole(row.samplePeopleOpsRoleUrl, row.samplePeopleOpsRoleTitle)) ||
      (row.maxAttributedPostedDays != null &&
        !hasRole(
          row.sampleAttributedPostedRoleUrl,
          row.sampleAttributedPostedRoleTitle,
        )) ||
      (row.noAgencyEvidenceReqCount > 0 &&
        !roles.some((role) =>
          role?.agencyPolicyEvidence?.status === 'supported' &&
          role.agencyPolicyEvidence.url === row.sampleNoAgencyPolicyUrl &&
          role.agencyPolicyEvidence.quote === row.sampleNoAgencyPolicyQuote))
    ) {
      throw new Error(`unbound role evidence for ${row.mapCompanyId}`);
    }
  }
  assertNoForbiddenKeys(doc);
  assertNoContactText(doc);
  return true;
}

export function exportRowsCsv(rows = []) {
  const columns = [
    ['mapCompanyId', (row) => row.mapCompanyId],
    ['domain', (row) => row.domain],
    ['name', (row) => row.name],
    ['provider', (row) => row.boardKey?.provider],
    ['boardSlug', (row) => row.boardKey?.slug],
    ['ageBasis', (row) => row.ageBasis],
    ['openReqCount', (row) => row.openReqCount],
    ['seniorityInternReqCount', (row) => row.seniorityMix?.intern],
    ['seniorityJuniorReqCount', (row) => row.seniorityMix?.junior],
    ['senioritySeniorReqCount', (row) => row.seniorityMix?.senior],
    ['seniorityStaffReqCount', (row) => row.seniorityMix?.staff],
    ['seniorityPrincipalReqCount', (row) => row.seniorityMix?.principal],
    ['seniorityLeadManagerReqCount', (row) => row.seniorityMix?.leadManager],
    ['seniorityDirectorPlusReqCount', (row) => row.seniorityMix?.directorPlus],
    ['seniorityUnspecifiedReqCount', (row) => row.seniorityMix?.unspecified],
    ['firstObservedTodayReqCount', (row) => row.firstObservedTodayReqCount],
    ['firstObservedTodayOlderPostedReqCount', (row) =>
      row.firstObservedTodayOlderPostedReqCount],
    ['closedTodayReqCount', (row) => row.closedTodayReqCount],
    ['reopenedOpenReqCount', (row) => row.reopenedOpenReqCount],
    ['greenhouseStalePostedUpdated7dReqCount', (row) =>
      row.greenhouseStalePostedUpdated7dReqCount],
    ['attributedPostedReqCount', (row) => row.attributedPostedReqCount],
    ['staleAttributedPostedReqCount', (row) => row.staleAttributedPostedReqCount],
    ['evergreenAttributedPostedReqCount', (row) => row.evergreenAttributedPostedReqCount],
    ['maxAttributedPostedDays', (row) => row.maxAttributedPostedDays],
    ['maxObservedOpenDays', (row) => row.maxObservedOpenDays],
    ['staleObservedReqCount', (row) => row.staleObservedReqCount],
    ['openPeopleOpsReqCount', (row) => row.openPeopleOpsReqCount],
    ['noAgencyEvidenceReqCount', (row) => row.noAgencyEvidenceReqCount],
    ['openEngReqCount', (row) => row.openEngReqCount],
    ['openSalesReqCount', (row) => row.openSalesReqCount],
    ['openRemoteReqCount', (row) => row.openRemoteReqCount],
    ['openObserved7ReqCount', (row) => row.openObserved7ReqCount],
    ['distinctObservedLocationCount', (row) => row.distinctObservedLocationCount],
    ['sampleLocation', (row) => row.sampleLocation],
    ['sampleRoleTitle', (row) => row.sampleRoleTitle],
    ['sampleRoleUrl', (row) => row.sampleRoleUrl],
    ['samplePeopleOpsRoleTitle', (row) => row.samplePeopleOpsRoleTitle],
    ['samplePeopleOpsRoleUrl', (row) => row.samplePeopleOpsRoleUrl],
    ['sampleAttributedPostedRoleTitle', (row) => row.sampleAttributedPostedRoleTitle],
    ['sampleAttributedPostedRoleUrl', (row) => row.sampleAttributedPostedRoleUrl],
    ['jobsUrl', (row) => row.jobsUrl],
    ['sourceLicense', (row) => row.sourceLicense],
    ['sourceUrl', (row) => row.sourceUrl],
    ['retrievedAt', (row) => row.retrievedAt],
    ['researchStatus', (row) => row.companyResearch?.status],
    ['researchSource', (row) => row.companyResearch?.source],
    ['researchVerification', (row) => row.companyResearch?.verification?.state],
    ['canonicalCompany', (row) => row.companyResearch?.fields?.canonicalCompany?.value],
    ['productSummary', (row) => row.companyResearch?.fields?.productSummary?.value],
    ['productCategory', (row) => row.companyResearch?.fields?.productCategory?.value],
    ['likelyBuyer', (row) => row.companyResearch?.fields?.likelyBuyer?.value],
    ['noAgencyPolicyQuote', (row) => row.sampleNoAgencyPolicyQuote],
    ['noAgencyPolicyUrl', (row) => row.sampleNoAgencyPolicyUrl],
  ];
  const cell = (value) => {
    const raw = value == null ? '' : String(value).replace(UNSAFE_CONTROL_RE, ' ');
    const text = /^[\p{White_Space}\p{Cc}\p{Cf}]*[=+\-@]/u.test(raw) ? `'${raw}` : raw;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    columns.map(([name]) => name).join(','),
    ...rows.map((row) => columns.map(([, get]) => cell(get(row))).join(',')),
  ].join('\n') + '\n';
}

function selftest() {
  {
    const obsolete = obsoleteGenerationDirs(
      [
        { dir: 'v6-previous', schema: SCHEMA },
        { dir: 'v6-old', schema: SCHEMA },
        { dir: 'v5-new', schema: SCHEMA_V5 },
        { dir: 'v5-old', schema: SCHEMA_V5 },
        { dir: 'v4-new', schema: SCHEMA_V4 },
        { dir: 'v4-old', schema: SCHEMA_V4 },
        { dir: 'invalid', schema: null },
        { dir: 'v3-new', schema: SCHEMA_V3 },
      ],
      SCHEMA,
    );
    if (obsolete.join(',') !== 'v6-old,v5-old,v4-old,invalid') {
      throw new Error('generation retention must keep rollback schemas');
    }
  }
  for (const [title, expected] of Object.entries({
    'Software Engineering Intern': 'intern',
    'Junior Developer': 'junior',
    'Senior Backend Engineer': 'senior',
    'Staff Platform Engineer': 'staff',
    'Principal Engineer': 'principal',
    'Engineering Manager': 'leadManager',
    'Director of Product': 'directorPlus',
    'Chief of Staff': 'leadManager',
    'Staff Accountant': 'unspecified',
    'Senior CRO Designer, Paywalls and Funnels': 'senior',
    'Architect, Office of the CTO': 'unspecified',
    'Account Executive': 'unspecified',
  })) {
    if (seniorityFromTitle(title) !== expected) {
      throw new Error(`seniority title parse: ${title}`);
    }
  }
  const map = {
    generatedAt: '2026-07-29T00:00:00.000Z',
    companies: [
      {
        id: 't:acme',
        name: 'Acme',
        website: 'https://www.acme.io/',
        jobsUrl: 'https://boards.greenhouse.io/acme',
        atsSource: 'Greenhouse',
        sourceLicense: 'test-license',
        sourceUrl: 'https://example.com/acme',
        retrievedAt: '2026-07-01',
      },
      {
        id: 't:beta',
        name: 'Beta',
        website: 'https://beta.dev/',
        jobsUrl: 'https://jobs.lever.co/beta',
        atsSource: 'Lever',
        sourceLicense: 'test-license',
        sourceUrl: 'https://example.com/beta',
        retrievedAt: '2026-07-01',
      },
      {
        id: 't:name-only',
        name: 'Acme',
        website: 'https://unrelated.example/',
        sourceLicense: 'test-license',
        sourceUrl: 'https://example.com/name-only',
      },
      {
        id: 't:acme-duplicate',
        name: 'Acme Duplicate',
        website: 'https://duplicate.example/',
        jobsUrl: 'https://boards.greenhouse.io/acme',
        atsSource: 'Greenhouse',
        sourceLicense: 'test-license',
        sourceUrl: 'https://example.com/duplicate',
      },
    ],
  };
  const ledger = {
    updatedAt: '2026-07-29',
    roles: {
      'Greenhouse|acme|1': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '1',
        company: 'Acme',
        title: 'Staff Eng',
        location: 'San Francisco',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        firstSeen: '2026-05-01',
        lastSeen: '2026-07-29',
        closedAt: null,
        nativePostedAt: '2026-04-01',
        nativeDateField: 'first_published',
        nativeUpdatedAt: '2026-07-27',
        nativeUpdatedAfterFirstPublished: true,
        agencyPolicyEvidence: {
          value: 'no_unsolicited_agency_submissions',
          status: 'supported',
          quote: 'We do not accept unsolicited resumes from staffing agencies',
          url: 'https://boards.greenhouse.io/acme/jobs/1',
        },
      },
      'Greenhouse|acme|2': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '2',
        company: 'Acme',
        title: 'PM',
        location: ' san   francisco ',
        url: 'https://boards.greenhouse.io/acme/jobs/2',
        firstSeen: '2026-07-29',
        lastSeen: '2026-07-29',
        closedAt: null,
        reopenCount: 1,
        nativePostedAt: '2026-07-20',
        nativeDateField: 'first_published',
        nativeUpdatedAt: '2026-07-28',
        nativeUpdatedAfterFirstPublished: true,
      },
      'Greenhouse|acme|closed': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: 'closed',
        company: 'Acme',
        title: 'Closed Role',
        url: 'https://boards.greenhouse.io/acme/jobs/closed',
        firstSeen: '2026-07-20',
        lastSeen: '2026-07-28',
        closedAt: '2026-07-29',
      },
      'Greenhouse|acme|stale-unclosed': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: 'stale-unclosed',
        company: 'Acme',
        title: 'Stale Unclosed Role',
        url: 'https://boards.greenhouse.io/acme/jobs/stale-unclosed',
        firstSeen: '2026-07-20',
        lastSeen: '2026-07-28',
        closedAt: null,
      },
      'Lever|beta|x': {
        provider: 'Lever',
        slug: 'beta',
        jobId: 'x',
        company: 'Beta',
        title: 'Talent Partner',
        location: 'Remote',
        fn: 'other',
        url: 'https://jobs.lever.co/beta/x',
        firstSeen: '2026-06-01',
        lastSeen: '2026-07-29',
        closedAt: null,
        nativePostedAt: '2026-01-01',
        nativeDateField: 'createdAt', // must NOT become "posted" claim
      },
    },
  };
  const benchmark = {
    researchedAt: '2026-07-29',
    companies: Array.from({ length: 30 }, (_, index) => {
      const supported = (value) => ({
        value,
        status: 'supported',
        url: 'https://www.acme.io/',
        quote: String(value),
      });
      return {
        id: index === 0 ? 't:acme' : `gold:${index}`,
        fields: {
          canonicalCompany: supported('Acme'),
          productSummary: supported('Makes useful things'),
          productCategory: supported('Software'),
          likelyBuyer: supported('Operations teams'),
          pricingStatus: { value: null, status: 'unknown', url: null, quote: null },
        },
      };
    }),
  };
  const doc = buildExport(map, ledger, {
    benchmark,
    researchEvidence: {
      green: true,
      pass: true,
      fresh: true,
      reason: 'pass-fresh',
      runId: 'test-green',
      endedAt: '2026-07-29T00:00:00.000Z',
    },
  });
  assertExportValid(doc);
  {
    const acme = doc.rows.find((row) => row.mapCompanyId === 't:acme');
    if (acme?.distinctObservedLocationCount !== 1) {
      throw new Error('location footprint must collapse case and whitespace variants');
    }
    if (acme.greenhouseStalePostedUpdated7dReqCount !== 1) {
      throw new Error('recent Greenhouse update count must stay stale-post attributed');
    }
    const v5 = structuredClone(doc);
    v5.schema = SCHEMA_V5;
    delete v5.postingUpdateBasis;
    v5.rows.forEach((row) => {
      delete row.greenhouseStalePostedUpdated7dReqCount;
    });
    assertExportValid(v5);
    const v4 = structuredClone(v5);
    v4.schema = SCHEMA_V4;
    delete v4.locationFootprintBasis;
    v4.rows.forEach((row) => { delete row.distinctObservedLocationCount; });
    assertExportValid(v4);
    const v3 = structuredClone(v4);
    v3.schema = SCHEMA_V3;
    delete v3.seniorityBasis;
    v3.rows.forEach((row) => { delete row.seniorityMix; });
    assertExportValid(v3);
  }
  if (doc.changeDate !== ledger.updatedAt) {
    throw new Error('changeDate must follow the ledger observation, not the wall clock');
  }
  if (domainFromWebsite('https://user:pass@secret.internal/private') !== null) {
    throw new Error('private company website became a relationship domain');
  }
  {
    const nullableResearchDate = structuredClone(doc);
    const row = nullableResearchDate.rows.find((candidate) => candidate.companyResearch);
    row.companyResearch.researchedAt = null;
    for (const node of nullableResearchDate.relationships.nodes) {
      if (node.id.startsWith(`claim:${row.mapCompanyId}|`)) node.researchedAt = null;
    }
    assertExportValid(nullableResearchDate);
  }
  for (const [provider, url, slug, jobId] of [
    ['Greenhouse', 'https://boards.greenhouse.io/acme/jobs/J1', 'acme', 'J1'],
    ['Lever', 'https://jobs.lever.co/acme/J1', 'acme', 'J1'],
    ['Ashby', 'https://jobs.ashbyhq.com/acme/J1', 'acme', 'J1'],
    ['SmartRecruiters', 'https://jobs.smartrecruiters.com/acme/J1-role', 'acme', 'J1'],
    ['Workable', 'https://apply.workable.com/j/J1', 'acme', 'J1'],
    ['Recruitee', 'https://acme.recruitee.com/o/custom-role-slug', 'acme', 'J1'],
    ['Personio', 'https://acme.jobs.personio.de/job/J1', 'acme', 'J1'],
  ]) {
    if (!roleUrlMatchesBoard(url, { provider, slug }, jobId, { domain: 'acme.example' })) {
      throw new Error(`${provider}: rejected owned role URL`);
    }
  }
  for (const url of [
    'https://acme.jobs.personio.de/?job=J1',
    'https://acme.jobs.personio.de/jobs/J1',
    'https://acme.jobs.personio.de/job/not-J1/J1',
  ]) {
    if (roleUrlMatchesBoard(url, { provider: 'Personio', slug: 'acme' }, 'J1', {
      domain: 'acme.example',
    })) {
      throw new Error('Personio accepted a non-native role route');
    }
  }
  if (
    roleUrlMatchesBoard(
      'https://evil.example/jobs/J1',
      { provider: 'Greenhouse', slug: 'acme' },
      'J1',
      { domain: 'acme.example' },
    )
  ) {
    throw new Error('arbitrary role host accepted');
  }
  const csv = exportRowsCsv([
    { ...doc.rows[0], name: 'Acme, "Inc."' },
    { ...doc.rows[0], name: '=HYPERLINK("https://evil.example")' },
    { ...doc.rows[0], name: '\0=1+1' },
    // Unicode LINE/PARAGRAPH SEPARATOR are line terminators to JS and to several
    // spreadsheet importers, but match neither the ASCII-control strip range nor the
    // `[",\r\n]` quote trigger. Unstripped they split one row into two records, so a CSV
    // consumer reads a different row count than the hash-bound JSON claims. Assert the
    // CSV stays exactly one record per row for the worst untrusted title we can build.
    { ...doc.rows[0], name: 'Acme\u2028Corp' },
    { ...doc.rows[0], name: 'Beta\u2029Corp' },
  ]);
  if (
    !csv.startsWith('mapCompanyId,domain,name,provider,') ||
    !csv.includes('"Acme, ""Inc."""') ||
    !csv.includes('\'=HYPERLINK(""https://evil.example"")') ||
    !csv.includes("' =1+1") ||
    /\b(?:email|phone|score|send)\b/i.test(csv.split('\n')[0]) ||
    csv.split(/[\n\r\u2028\u2029]/).filter(Boolean).length !== 6
  ) {
    throw new Error('private flat CSV contract');
  }
  const acme = doc.rows.find((r) => r.mapCompanyId === 't:acme');
  if (!acme || acme.openReqCount !== 2) throw new Error('acme open count');
  if (
    !sameCounts(acme.seniorityMix, {
      intern: 0,
      junior: 0,
      senior: 0,
      staff: 1,
      principal: 0,
      leadManager: 0,
      directorPlus: 0,
      unspecified: 1,
    })
  ) {
    throw new Error('seniority mix');
  }
  if (
    acme.firstObservedTodayReqCount !== 1 ||
    acme.firstObservedTodayOlderPostedReqCount !== 1 ||
    acme.closedTodayReqCount !== 1 ||
    acme.reopenedOpenReqCount !== 1 ||
    acme.attributedPostedReqCount !== 2 ||
    acme.staleAttributedPostedReqCount !== 1 ||
    acme.evergreenAttributedPostedReqCount !== 0 ||
    acme.maxAttributedPostedDays !== 119 ||
    acme.sampleAttributedPostedRoleTitle !== 'Staff Eng' ||
    doc.counts.changedCompaniesBeforeTop !== 1 ||
    doc.counts.firstObservedTodayReqsBeforeTop !== 1 ||
    doc.counts.firstObservedTodayOlderPostedReqsBeforeTop !== 1 ||
    doc.counts.closedTodayReqsBeforeTop !== 1 ||
    doc.diagnostics.changedCompanies[0]?.mapCompanyId !== 't:acme'
  ) {
    throw new Error('role change signals');
  }
  if (
    aggregateRoles([], '2026-07-29', [{
      firstSeen: '2026-07-29',
      nativePostedAt: '2026-07-20',
      nativeDateField: 'createdAt',
    }]).firstObservedTodayOlderPostedReqCount !== 0
  ) {
    throw new Error('untrusted native date became a posting claim');
  }
  {
    const ages = aggregateRoles(
      [
        {
          title: 'Evergreen',
          nativePostedAt: '2025-01-01',
          nativeDateField: 'first_published',
        },
        {
          title: 'Untrusted',
          nativePostedAt: '2025-01-01',
          nativeDateField: 'createdAt',
        },
      ],
      '2026-07-29',
    );
    if (
      ages.attributedPostedReqCount !== 1 ||
      ages.staleAttributedPostedReqCount !== 0 ||
      ages.evergreenAttributedPostedReqCount !== 1 ||
      ages.maxAttributedPostedDays !== null
    ) {
      throw new Error('attributed posting-age boundary');
    }
  }
  if (acme.maxObservedOpenDays < 80) throw new Error(`expected stale observed age, got ${acme.maxObservedOpenDays}`);
  if (acme.ageBasis !== 'observed-first-seen') throw new Error('basis');
  if ('estimatedFeeHint' in acme || 'score' in acme) throw new Error('forbidden score/fee');
  if (
    acme.noAgencyEvidenceReqCount !== 1 ||
    acme.sampleNoAgencyPolicyQuote !== 'We do not accept unsolicited resumes from staffing agencies' ||
    doc.counts.noAgencyEvidenceRowsBeforeTop !== 1 ||
    doc.diagnostics.noAgencyEvidence[0]?.mapCompanyId !== 't:acme'
  ) {
    throw new Error('positive no-agency policy evidence');
  }
  if (
    acme.companyResearch?.fields?.productCategory?.value !== 'Software' ||
    'pricingStatus' in acme.companyResearch.fields ||
    acme.companyResearch?.verification?.state !== 'live_replayed' ||
    doc.counts.rowsWithCompanyResearch !== 1 ||
    doc.counts.rowsWithLiveReplayedResearch !== 1 ||
    doc.counts.rowsWithUnreplayedCatalogResearch !== 0
  ) {
    throw new Error('accepted company research projection');
  }
  if (doc.researchEvidence.sourceHistory !== null) {
    throw new Error('sourceHistory must be null when not supplied');
  }
  {
    const withHistory = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      researchEvidence: {
        green: true,
        pass: true,
        fresh: true,
        reason: 'pass-fresh',
        runId: 'test-green',
        endedAt: '2026-07-29T00:00:00.000Z',
      },
      sourceHistory: {
        updatedAt: '2026-07-29T00:00:00.000Z',
        counts: {
          claims: 10,
          verified: 10,
          absent: 0,
          unknown: 0,
          staleVerified: 0,
          textStableFlaky: 2,
        },
      },
    });
    assertExportValid(withHistory);
    if (
      withHistory.researchEvidence.sourceHistory?.counts?.textStableFlaky !== 2 ||
      withHistory.researchEvidence.sourceHistory?.counts?.claims !== 10 ||
      withHistory.researchEvidence.sourceHistory?.updatedAt !== '2026-07-29T00:00:00.000Z'
    ) {
      throw new Error('sourceHistory counts not bound on researchEvidence');
    }
    const overFlaky = structuredClone(withHistory.researchEvidence.sourceHistory);
    overFlaky.counts.textStableFlaky = overFlaky.counts.verified + 1;
    if (normalizeSourceHistory(overFlaky) !== null) {
      throw new Error('textStableFlaky > verified must omit');
    }
    const badHistory = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      researchEvidence: {
        green: true,
        pass: true,
        fresh: true,
        reason: 'pass-fresh',
        runId: 'test-green',
        endedAt: '2026-07-29T00:00:00.000Z',
      },
      sourceHistory: {
        counts: {
          claims: 1,
          verified: 2, // verified > claims → refuse
          absent: 0,
          unknown: 0,
          staleVerified: 0,
          textStableFlaky: 0,
        },
      },
    });
    assertExportValid(badHistory);
    if (badHistory.researchEvidence.sourceHistory !== null) {
      throw new Error('malformed sourceHistory must omit, not invent');
    }
    if (
      normalizeSourceHistory({
        updatedAt: 'not-a-date',
        counts: {
          claims: 3,
          verified: 3,
          absent: 0,
          unknown: 0,
          staleVerified: 0,
          textStableFlaky: 0,
        },
      }) !== null
    ) {
      throw new Error('unparseable updatedAt must omit sourceHistory entirely');
    }
  }
  {
    const catalogResearch = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      catalog: {
        version: 1,
        researchedAt: '2026-07-29',
        companies: [{
          id: 't:acme',
          fields: structuredClone(benchmark.companies[0].fields),
        }],
      },
      researchEvidence: {
        green: true,
        pass: true,
        fresh: true,
        reason: 'pass-fresh',
        runId: 'test-green',
        endedAt: '2026-07-29T00:00:00.000Z',
      },
    });
    assertExportValid(catalogResearch);
    if (
      catalogResearch.rows.find((row) => row.mapCompanyId === 't:acme')
        ?.companyResearch?.verification?.state !== 'catalog_not_live_replayed' ||
      catalogResearch.researchEvidence.catalog.state !== 'not_live_replayed' ||
      catalogResearch.counts.rowsWithUnreplayedCatalogResearch !== 1 ||
      !catalogResearch.relationships.nodes
        .filter((node) => node.type === 'company_claim')
        .every((node) => node.verificationState === 'catalog_not_live_replayed')
    ) {
      throw new Error('catalog replay boundary');
    }
    // Object-shaped companies must not count as live catalog (same fail-closed as projectCompanyResearch).
    const objectCatalog = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      catalog: {
        version: 1,
        researchedAt: '2026-07-29',
        companies: { 't:acme': structuredClone(benchmark.companies[0]) },
      },
      researchEvidence: {
        green: true,
        pass: true,
        fresh: true,
        reason: 'pass-fresh',
        runId: 'test-green',
        endedAt: '2026-07-29T00:00:00.000Z',
      },
    });
    assertExportValid(objectCatalog);
    if (
      objectCatalog.researchEvidence.catalog.state !== 'empty' ||
      objectCatalog.researchEvidence.catalog.rows !== 0 ||
      objectCatalog.counts.rowsWithUnreplayedCatalogResearch !== 0
    ) {
      throw new Error('object-shaped catalog.companies must report empty, not invent rows');
    }
  }
  {
    const unsealedResearch = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      researchEvidence: {
        green: true,
        pass: true,
        fresh: true,
        reason: 'pass-fresh',
        runId: 123,
        endedAt: 1,
      },
    });
    assertExportValid(unsealedResearch);
    if (
      unsealedResearch.researchEvidence.green ||
      unsealedResearch.rows.some((row) => row.companyResearch) ||
      unsealedResearch.relationships.counts.nodeTypes.company_claim
    ) {
      throw new Error('unsealed research evidence projected');
    }
  }
  {
    const wrongReasonResearch = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      researchEvidence: {
        green: true,
        pass: true,
        fresh: true,
        reason: 'ttl-expired',
        runId: 'wrong-reason-receipt',
        endedAt: '2026-07-29T00:00:00.000Z',
      },
    });
    assertExportValid(wrongReasonResearch);
    if (
      wrongReasonResearch.researchEvidence.green ||
      wrongReasonResearch.rows.some((row) => row.companyResearch)
    ) {
      throw new Error('noncanonical green reason projected');
    }
  }
  {
    const staleResearch = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      researchEvidence: {
        green: false,
        pass: true,
        fresh: false,
        reason: 'ttl-expired',
      },
    });
    if (
      staleResearch.rows.some((row) => row.companyResearch) ||
      staleResearch.relationships.counts.nodeTypes.company_claim ||
      staleResearch.counts.rowsWithCompanyResearch
    ) {
      throw new Error('stale research evidence projected');
    }
  }
  {
    const contradictoryResearch = buildExport(map, ledger, {
      today: '2026-07-29',
      benchmark,
      researchEvidence: {
        green: true,
        pass: false,
        fresh: false,
        reason: 'ttl-expired',
        runId: 'contradictory-receipt',
      },
    });
    assertExportValid(contradictoryResearch);
    if (
      contradictoryResearch.researchEvidence.green ||
      contradictoryResearch.rows.some((row) => row.companyResearch) ||
      contradictoryResearch.relationships.counts.nodeTypes.company_claim ||
      contradictoryResearch.counts.rowsWithCompanyResearch
    ) {
      throw new Error('contradictory research evidence projected');
    }
  }
  if (doc.providerRouting.observedProviders.join(',') !== 'Greenhouse,Lever') {
    throw new Error('provider routing coverage');
  }
  if (
    doc.providerRouting.coverage.Greenhouse.companies !== 1 ||
    doc.providerRouting.coverage.Greenhouse.openRoles !== 2 ||
    doc.providerRouting.coverage.Greenhouse.firstObservedTodayOlderPosted !== 1 ||
    doc.providerRouting.coverage.Greenhouse.attributedPosted !== 2 ||
    doc.providerRouting.coverage.Greenhouse.staleAttributedPosted !== 1 ||
    doc.providerRouting.coverage.Lever.attributedPosted !== 0 ||
    doc.providerRouting.coverage.Lever.companies !== 1 ||
    doc.providerRouting.coverage.Lever.openRoles !== 1
  ) {
    throw new Error('provider routing coverage counts');
  }
  if (doc.relationships.counts.nodeTypes.company !== 2) throw new Error('company graph nodes');
  if (
    doc.relationships.counts.nodeTypes.open_role !== 3 ||
    doc.relationships.counts.openRolesAvailable !== 3 ||
    doc.relationships.nodes.some(
      (node) => node.id === 'role:Greenhouse|acme|stale-unclosed',
    )
  ) {
    throw new Error('role graph nodes');
  }
  if (doc.relationships.counts.edgeTypes.has_open_role !== 3) throw new Error('role graph edges');
  if (
    doc.relationships.counts.nodeTypes.company_claim !== 4 ||
    doc.relationships.counts.nodeTypes.research_source !== 1 ||
    doc.relationships.counts.edgeTypes.has_claim !== 4 ||
    doc.relationships.counts.edgeTypes.supported_by !== 4
  ) {
    throw new Error('claim source relationship projection');
  }
  const beta = doc.rows.find((r) => r.mapCompanyId === 't:beta');
  if (
    beta?.openPeopleOpsReqCount !== 1 ||
    beta.samplePeopleOpsRoleTitle !== 'Talent Partner' ||
    beta.samplePeopleOpsRoleUrl !== 'https://jobs.lever.co/beta/x'
  ) {
    throw new Error('positive public People/Recruiting role signal');
  }
  if (doc.counts.duplicateMapBoards !== 1) throw new Error('duplicate board collision not surfaced');
  if (doc.rows.some((row) => row.mapCompanyId === 't:name-only')) {
    throw new Error('name-only company joined without an exact board key');
  }
  {
    const misrouted = buildExport(
      {
        companies: [{
          ...map.companies[0],
          id: 't:misrouted',
          jobsUrl: 'https://evil.example/acme',
        }],
      },
      ledger,
      { today: '2026-07-29' },
    );
    if (misrouted.rows.length) throw new Error('non-native provider host routed into ledger');
  }
  {
    const justClosed = buildExport(
      {
        generatedAt: '2026-07-29T00:00:00.000Z',
        companies: [{
          id: 't:closed',
          name: 'Just Closed',
          jobsUrl: 'https://jobs.lever.co/just-closed',
          atsSource: 'Lever',
          sourceLicense: 'test-license',
          sourceUrl: 'https://example.com/just-closed',
          retrievedAt: '2026-07-29',
        }],
      },
      {
        roles: {
          'Lever|just-closed|x': {
            provider: 'Lever',
            slug: 'just-closed',
            jobId: 'x',
            company: 'Just Closed',
            firstSeen: '2026-07-20',
            closedAt: '2026-07-29',
          },
        },
      },
      { today: '2026-07-29' },
    );
    assertExportValid(justClosed);
    if (
      justClosed.rows[0]?.openReqCount !== 0 ||
      justClosed.rows[0]?.closedTodayReqCount !== 1 ||
      justClosed.relationships.counts.nodeTypes.open_role
    ) {
      throw new Error('same-day empty-board closure signal');
    }
  }
  {
    const roles = Object.fromEntries(
      Array.from({ length: 26 }, (_, index) => [
        `Greenhouse|large|${index}`,
        {
          provider: 'Greenhouse',
          slug: 'large',
          jobId: String(index),
          title: `Role ${index}`,
          firstSeen: `2026-06-${String(index + 1).padStart(2, '0')}`,
          lastSeen: '2026-07-29',
        },
      ]).reverse(),
    );
    const graph = buildRelationshipProjection(
      [{
        mapCompanyId: 't:large',
        name: 'Large',
        domain: 'large.example',
        jobsUrl: 'https://boards.greenhouse.io/large',
        boardKey: { provider: 'Greenhouse', slug: 'large' },
      }],
      { roles },
      '2026-07-29',
    );
    if (
      graph.roleLimitPerBoard !== 25 ||
      graph.counts.nodeTypes.open_role !== 25 ||
      graph.counts.openRolesAvailable !== 26 ||
      graph.counts.openRolesOmitted !== 1 ||
      !graph.nodes.some((node) => node.id === 'role:Greenhouse|large|0') ||
      graph.nodes.some((node) => node.id === 'role:Greenhouse|large|25')
    ) {
      throw new Error('bounded relationship roles');
    }
  }
  {
    const denied = buildExport(
      {
        companies: [{
          id: 'yc:assembly',
          name: 'Assembly',
          website: 'https://asm.co/',
          jobsUrl: 'https://boards.greenhouse.io/asm',
          atsSource: 'Greenhouse',
          sourceLicense: 'test-license',
        }],
      },
      {
        roles: {
          'Greenhouse|asm|1': {
            provider: 'Greenhouse',
            slug: 'asm',
            jobId: '1',
            company: 'Assembly',
            title: 'Engineer',
            firstSeen: '2026-07-01',
            closedAt: null,
          },
        },
      },
      { today: '2026-07-29' },
    );
    if (denied.rows.length !== 0 || denied.counts.deniedBoards !== 1) {
      throw new Error('denied ATS board exported');
    }
  }
  const expectInvalid = (mutate, message) => {
    const poison = structuredClone(doc);
    mutate(poison);
    try {
      assertExportValid(poison);
    } catch {
      return;
    }
    throw new Error(`poison passed: ${message}`);
  };
  expectInvalid(
    (poison) => { poison.rows[0].seniorityMix.unspecified++; },
    'seniority mix exceeds open roles',
  );
  expectInvalid(
    (poison) => { delete poison.rows[0].seniorityMix.principal; },
    'seniorityMix missing a band key',
  );
  expectInvalid(
    (poison) => { poison.rows[0].seniorityMix.staffPlus = 0; },
    'seniorityMix unknown band key',
  );
  expectInvalid(
    (poison) => {
      const mix = poison.rows[0].seniorityMix;
      mix.junior--;
      mix.unspecified++;
    },
    'seniorityMix negative band count',
  );
  expectInvalid(
    (poison) => {
      const mix = poison.rows[0].seniorityMix;
      mix.senior += 0.5;
      mix.unspecified -= 0.5;
    },
    'seniorityMix non-integer band count',
  );
  expectInvalid(
    (poison) => { poison.seniorityBasis = 'multi-label'; },
    'seniority basis drift',
  );
  expectInvalid(
    (poison) => {
      poison.rows[0].distinctObservedLocationCount = poison.rows[0].openReqCount + 1;
    },
    'location footprint exceeds open roles',
  );
  expectInvalid(
    (poison) => { poison.locationFootprintBasis = 'inferred-city-count'; },
    'location footprint basis drift',
  );
  expectInvalid(
    (poison) => {
      poison.rows[0].greenhouseStalePostedUpdated7dReqCount =
        poison.rows[0].staleAttributedPostedReqCount + 1;
    },
    'recent Greenhouse update count exceeds stale posted roles',
  );
  expectInvalid(
    (poison) => { poison.postingUpdateBasis = 'inferred-content-edit'; },
    'posting update basis drift',
  );
  for (const [field, value] of [
    ['title', 1],
    ['location', {}],
    ['usPosted', 'yes'],
    ['firstSeen', 20260729],
    ['lastSeen', 'not-a-day'],
  ]) {
    expectInvalid(
      (poison) => {
        poison.relationships.nodes.find((node) => node.type === 'open_role')[field] = value;
      },
      `invalid open-role ${field} scalar`,
    );
  }
  expectInvalid(
    (poison) => {
      poison.relationships.nodes.find((node) => node.type === 'open_role').firstSeen =
        '2026-07-30';
    },
    'open-role firstSeen after lastSeen',
  );
  expectInvalid(
    (poison) => {
      const role = poison.relationships.nodes.find(
        (node) => node.type === 'open_role' && node.agencyPolicyEvidence,
      );
      role.agencyPolicyEvidence = Object.assign([], role.agencyPolicyEvidence);
    },
    'array-shaped agency-policy evidence',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.mapCompanyId === 't:acme');
      const roles = poison.relationships.nodes.filter(
        (node) => node.type === 'open_role' && node.id.startsWith('role:Greenhouse|acme|'),
      );
      const role = roles.find((candidate) => candidate.agencyPolicyEvidence);
      const other = roles.find((candidate) => candidate !== role);
      role.agencyPolicyEvidence.url = other.url;
      row.sampleNoAgencyPolicyUrl = other.url;
      poison.diagnostics.noAgencyEvidence.find(
        (item) => item.mapCompanyId === row.mapCompanyId,
      ).url = other.url;
    },
    'agency-policy evidence URL diverges from its role',
  );
  expectInvalid(
    (poison) => {
      const roles = poison.relationships.nodes.filter(
        (node) => node.type === 'open_role' && node.id.startsWith('role:Greenhouse|acme|'),
      );
      const evidenced = roles.find((role) => role.agencyPolicyEvidence);
      const other = roles.find((role) => role !== evidenced);
      other.agencyPolicyEvidence = {
        ...evidenced.agencyPolicyEvidence,
        url: other.url,
      };
    },
    'projected agency-policy evidence exceeds its table row count',
  );
  expectInvalid(
    (poison) => { poison.rows[0].sourceLicense = null; },
    'missing provenance',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.mapCompanyId === 't:acme');
      row.domain = 'secret.internal';
      poison.relationships.nodes.find(
        (node) => node.id === `company:${row.mapCompanyId}`,
      ).domain = row.domain;
    },
    'private relationship domain',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.mapCompanyId === 't:beta');
      const company = poison.relationships.nodes.find(
        (node) => node.id === `company:${row.mapCompanyId}`,
      );
      const edge = poison.relationships.edges.find(
        (candidate) => candidate.type === 'uses_board' && candidate.source === company.id,
      );
      row.mapCompanyId = 'x'.repeat(MAX_PRIVATE_TEXT + 1);
      company.id = `company:${row.mapCompanyId}`;
      edge.source = company.id;
      edge.id = `${edge.source}|uses_board|${edge.target}`;
    },
    'unbounded relationship identity',
  );
  expectInvalid(
    (poison) => { poison.rows.reverse(); },
    'role-aging order reversed',
  );
  expectInvalid(
    (poison) => { poison.mapGeneratedAt = null; },
    'missing startup-map generation identity',
  );
  expectInvalid(
    (poison) => { poison.counts.rowsBeforeTop++; },
    'uncapped export invents upstream omissions',
  );
  expectInvalid(
    (poison) => { poison.staleDaysThreshold++; },
    'stale threshold diverges from row aggregation',
  );
  expectInvalid(
    (poison) => { poison.providerRouting.coverage.Greenhouse.openRoles++; },
    'provider coverage diverges from rows',
  );
  expectInvalid(
    (poison) => { poison.counts.rowsWithCompanyResearch++; },
    'research row count diverges from rows',
  );
  expectInvalid(
    (poison) => {
      poison.researchEvidence.sourceHistory = {
        updatedAt: '2026-07-29T00:00:00.000Z',
        counts: {
          claims: 1,
          verified: 2, // verified > claims
          absent: 0,
          unknown: 0,
          staleVerified: 0,
          textStableFlaky: 0,
        },
      };
    },
    'sourceHistory verified exceeds claims',
  );
  expectInvalid(
    (poison) => {
      poison.researchEvidence.sourceHistory = {
        updatedAt: '2026-07-29T00:00:00.000Z',
        counts: {
          claims: 5,
          verified: 5,
          absent: 0,
          unknown: 0,
          staleVerified: 0,
          textStableFlaky: 6, // flaky > verified
        },
      };
    },
    'sourceHistory textStableFlaky exceeds verified',
  );
  expectInvalid(
    (poison) => {
      poison.researchEvidence.sourceHistory = {
        updatedAt: 'not-a-date',
        counts: {
          claims: 5,
          verified: 5,
          absent: 0,
          unknown: 0,
          staleVerified: 0,
          textStableFlaky: 0,
        },
      };
    },
    'sourceHistory unparseable updatedAt',
  );

  expectInvalid(
    (poison) => { poison.counts.firstObservedTodayReqsBeforeTop = 0; },
    'uncapped pre-top count diverges from rows',
  );
  expectInvalid(
    (poison) => { poison.diagnostics.changedCompanies = []; },
    'uncapped changed-company diagnostics diverge from rows',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.boardKey.provider === 'Greenhouse');
      const boardId = `board:${row.boardKey.provider}|${row.boardKey.slug}`;
      const edge = poison.relationships.edges.find(
        (candidate) =>
          candidate.type === 'has_open_role' &&
          candidate.source === boardId &&
          poison.relationships.nodes.find((node) => node.id === candidate.target)?.url ===
            row.sampleRoleUrl,
      );
      const role = poison.relationships.nodes.find((node) => node.id === edge.target);
      const original = role.url;
      const jobId = role.id.slice(role.id.lastIndexOf('|') + 1);
      role.url = `https://evil.example/jobs/${jobId}`;
      for (const field of [
        'sampleRoleUrl',
        'samplePeopleOpsRoleUrl',
        'sampleAttributedPostedRoleUrl',
      ]) {
        if (row[field] === original) row[field] = role.url;
      }
    },
    'arbitrary-host role evidence with the same job id',
  );
  expectInvalid(
    (poison) => { poison.relationships.nodes[0].email = 'person@example.test'; },
    'forbidden graph field',
  );
  expectInvalid(
    (poison) => { poison.relationships.nodes[0].founderName = 'Alice Example'; },
    'undeclared graph PII field',
  );
  expectInvalid(
    (poison) => { poison.rows[0].founderName = 'Alice Example'; },
    'undeclared row PII field',
  );
  expectInvalid(
    (poison) => {
      poison.relationships.nodes[0].private = {
        contactEmail: 'person@example.test',
        fitScore: 99,
        sendAt: 'now',
      };
    },
    'nested composite forbidden graph fields',
  );
  for (const [key, value] of Object.entries({
    approval: true,
    approved: true,
    approve: true,
    consent: true,
    draft: {},
    queueState: 'ready',
    deliveryAuthority: true,
  })) {
    expectInvalid(
      (poison) => { poison.relationships.nodes[0].authority = { [key]: value }; },
      `forbidden ${key} authority`,
    );
  }
  expectInvalid(
    (poison) => { poison.rows[0].estimatedFeeCents = 1; },
    'forbidden estimated-fee prefix',
  );
  expectInvalid(
    (poison) => { poison.relationships.nodes[0].Email = 'person@example.test'; },
    'forbidden graph field casing',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows[0];
      row.name = 'Founder founder@example.test';
      poison.relationships.nodes.find(
        (node) => node.id === `company:${row.mapCompanyId}`,
      ).label = row.name;
      for (const group of [
        poison.diagnostics.noAgencyEvidence,
        poison.diagnostics.changedCompanies,
      ]) {
        for (const item of group) {
          if (item.mapCompanyId === row.mapCompanyId) item.name = row.name;
        }
      }
      const role = poison.relationships.nodes.find(
        (node) => node.type === 'open_role' && node.url === row.sampleRoleUrl,
      );
      const oldTitle = row.sampleRoleTitle;
      role.title = 'Call 415-555-0100 or see https://person.example/profile';
      for (const field of [
        'sampleRoleTitle',
        'samplePeopleOpsRoleTitle',
        'sampleAttributedPostedRoleTitle',
      ]) {
        if (row[field] === oldTitle) row[field] = role.title;
      }
    },
    'contact-shaped values mirrored across the table and graph',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.mapCompanyId === 't:acme');
      const role = poison.relationships.nodes.find(
        (node) => node.type === 'open_role' && node.url === row.sampleRoleUrl,
      );
      const oldTitle = role.title;
      role.title = `${oldTitle}\u202e`;
      for (const field of [
        'sampleRoleTitle',
        'samplePeopleOpsRoleTitle',
        'sampleAttributedPostedRoleTitle',
      ]) {
        if (row[field] === oldTitle) row[field] = role.title;
      }
    },
    'bidi control mirrored across the table and graph',
  );
  expectInvalid(
    (poison) => { poison.rows[0].memo = 'x'.repeat(MAX_PRIVATE_TEXT + 1); },
    'unbounded injected descriptive text',
  );
  expectInvalid(
    (poison) => {
      poison.rows[0].metadata = {
        url: 'https://person.example/profile',
      };
    },
    'nested descriptive links hidden behind structured-looking keys',
  );
  expectInvalid(
    (poison) => { poison.relationships.scope = 'unbounded'; },
    'relationship scope drift',
  );
  expectInvalid(
    (poison) => {
      const roleId = 'role:Greenhouse|acme|2';
      poison.relationships.nodes =
        poison.relationships.nodes.filter((node) => node.id !== roleId);
      poison.relationships.edges =
        poison.relationships.edges.filter((edge) => edge.target !== roleId);
      poison.relationships.counts.nodes--;
      poison.relationships.counts.edges--;
      poison.relationships.counts.nodeTypes.open_role--;
      poison.relationships.counts.edgeTypes.has_open_role--;
      poison.relationships.counts.openRolesAvailable--;
      poison.relationships.counts.rolesWithoutJobId++;
    },
    'projected role relabeled as missing identity',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows[0];
      const boardId = `board:${row.boardKey.provider}|${row.boardKey.slug}`;
      const roleId = `role:${row.boardKey.provider}|${row.boardKey.slug}|forged`;
      poison.relationships.nodes.push({
        id: roleId,
        type: 'open_role',
        title: 'Forged Role',
        url: `${row.jobsUrl}/jobs/forged`,
      });
      poison.relationships.edges.push({
        id: `${boardId}|has_open_role|${roleId}`,
        source: boardId,
        target: roleId,
        type: 'has_open_role',
      });
      row.sampleRoleTitle = 'Forged Role';
      row.sampleRoleUrl = `${row.jobsUrl}/jobs/forged`;
    },
    'fabricated role hidden behind stale graph counts',
  );
  expectInvalid(
    (poison) => { poison.relationships.edges[0].target = 'missing:node'; },
    'dangling graph edge',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows[0];
      const edge = poison.relationships.edges.find((candidate) => {
        const role = poison.relationships.nodes.find((node) => node.id === candidate.target);
        return candidate.type === 'has_open_role' &&
          role?.url === row.sampleRoleUrl &&
          role?.title === row.sampleRoleTitle;
      });
      const role = poison.relationships.nodes.find((node) => node.id === edge.target);
      const company = poison.relationships.nodes.find(
        (node) => node.id === `company:${row.mapCompanyId}`,
      );
      Object.assign(company, {
        title: role.title,
        url: role.url,
        agencyPolicyEvidence: role.agencyPolicyEvidence,
      });
      edge.target = company.id;
    },
    'open-role edge targets a non-role node',
  );
  expectInvalid(
    (poison) => {
      const edge = poison.relationships.edges.find(
        (candidate) => candidate.type === 'has_open_role',
      );
      const board = poison.relationships.nodes.find((node) => node.id === edge.source);
      const role = poison.relationships.nodes.find((node) => node.id === edge.target);
      role.id = `role:${board.provider}|${board.slug}|`;
      edge.target = role.id;
      edge.id = `${edge.source}|has_open_role|${edge.target}`;
    },
    'open-role identity has no job ID',
  );
  expectInvalid(
    (poison) => {
      const edge = poison.relationships.edges.find(
        (candidate) => candidate.target === 'role:Greenhouse|acme|2',
      );
      const role = poison.relationships.nodes.find((node) => node.id === edge.target);
      role.id = 'role:Greenhouse|acme|evil|alias';
      role.url = 'https://boards.greenhouse.io/acme/jobs/evil%7Calias';
      edge.target = role.id;
      edge.id = `${edge.source}|has_open_role|${edge.target}`;
    },
    'open-role identity bypasses the ATS job ID contract',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.mapCompanyId === 't:beta');
      const edge = poison.relationships.edges.find(
        (candidate) =>
          candidate.type === 'has_open_role' &&
          candidate.source === `board:${row.boardKey.provider}|${row.boardKey.slug}`,
      );
      const foreignRole = poison.relationships.nodes.find(
        (node) => node.id === 'role:Greenhouse|acme|2',
      );
      edge.target = foreignRole.id;
      row.sampleRoleTitle = foreignRole.title;
      row.sampleRoleUrl = foreignRole.url;
      row.samplePeopleOpsRoleTitle = foreignRole.title;
      row.samplePeopleOpsRoleUrl = foreignRole.url;
    },
    'open-role edge crosses board identity',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.mapCompanyId === 't:acme');
      const boardId = `board:${row.boardKey.provider}|${row.boardKey.slug}`;
      for (let index = 0; index < 24; index++) {
        const roleId = `role:${row.boardKey.provider}|${row.boardKey.slug}|cap-${index}`;
        poison.relationships.nodes.push({
          id: roleId,
          type: 'open_role',
          title: `Cap Role ${index}`,
          url: `https://boards.greenhouse.io/acme/jobs/cap-${index}`,
        });
        poison.relationships.edges.push({
          id: `${boardId}|has_open_role|${roleId}`,
          source: boardId,
          target: roleId,
          type: 'has_open_role',
        });
      }
      row.openReqCount += 24;
      poison.relationships.counts.nodes += 24;
      poison.relationships.counts.edges += 24;
      poison.relationships.counts.nodeTypes.open_role += 24;
      poison.relationships.counts.edgeTypes.has_open_role += 24;
      poison.relationships.counts.openRolesAvailable += 24;
    },
    'more than 25 projected roles under one board',
  );
  expectInvalid(
    (poison) => {
      poison.relationships.nodes.find((node) => node.type === 'company_claim').value =
        'forged claim';
    },
    'relationship claim diverges from its table claim',
  );
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.companyResearch);
      const seed = Object.values(row.companyResearch.fields)[0];
      const field = 'unsupportedSecretSignal';
      const claim = {
        value: 'Unreviewed internal assertion',
        status: 'supported',
        evidence: {
          url: seed.evidence.url,
          quote: 'Unreviewed internal assertion',
        },
      };
      row.companyResearch.acceptedFields.push(field);
      row.companyResearch.fields[field] = claim;
      const companyId = `company:${row.mapCompanyId}`;
      const claimId = `claim:${row.mapCompanyId}|${field}`;
      const sourceId = `source:${createHash('sha256')
        .update(claim.evidence.url)
        .digest('hex')}`;
      poison.relationships.nodes.push({
        id: claimId,
        type: 'company_claim',
        field,
        value: claim.value,
        status: claim.status,
        quote: claim.evidence.quote,
        researchedAt: row.companyResearch.researchedAt,
        researchSource: row.companyResearch.source,
        verificationState: row.companyResearch.verification.state,
      });
      poison.relationships.edges.push(
        {
          id: `${companyId}|has_claim|${claimId}`,
          source: companyId,
          target: claimId,
          type: 'has_claim',
        },
        {
          id: `${claimId}|supported_by|${sourceId}`,
          source: claimId,
          target: sourceId,
          type: 'supported_by',
        },
      );
      poison.relationships.counts.nodes++;
      poison.relationships.counts.edges += 2;
      poison.relationships.counts.nodeTypes.company_claim++;
      poison.relationships.counts.edgeTypes.has_claim++;
      poison.relationships.counts.edgeTypes.supported_by++;
    },
    'unsupported research field mirrored into its graph',
  );
  for (const [message, mutate] of [
    ['derived research status', (research) => { research.status = 'approved'; }],
    ['unique accepted research fields', (research) => {
      research.acceptedFields.push(research.acceptedFields[0]);
    }],
    ['supported accepted research fields', (research) => {
      research.acceptedFields.push('unsupportedSecretSignal');
    }],
    ['boolean research quarantine', (research) => { research.quarantineHiring = 'yes'; }],
    ['sealed research verification time', (research) => {
      research.verification.endedAt = '1999-01-01T00:00:00.000Z';
    }],
  ]) {
    expectInvalid(
      (poison) => mutate(
        poison.rows.find((candidate) => candidate.companyResearch).companyResearch,
      ),
      message,
    );
  }
  expectInvalid(
    (poison) => {
      const row = poison.rows.find((candidate) => candidate.companyResearch);
      row.companyResearch.researchedAt = 'not-a-date';
      for (const node of poison.relationships.nodes) {
        if (node.id.startsWith(`claim:${row.mapCompanyId}|`)) {
          node.researchedAt = row.companyResearch.researchedAt;
        }
      }
    },
    'invalid mirrored research date',
  );
  expectInvalid(
    (poison) => {
      poison.rows.find((row) => row.companyResearch).companyResearch.fields.productCategory.evidence.url =
        'http://127.0.0.1/private';
    },
    'unsafe company research source',
  );
  expectInvalid(
    (poison) => {
      poison.relationships.nodes.find((node) => node.type === 'research_source').url =
        'http://127.0.0.1/private';
    },
    'unsafe research relationship source',
  );
  expectInvalid(
    (poison) => {
      poison.rows.find((row) => row.companyResearch).companyResearch.verification.state =
        'catalog_not_live_replayed';
    },
    'research verification source mismatch',
  );
  expectInvalid(
    (poison) => { poison.researchEvidence.fresh = false; },
    'green research cannot be stale',
  );
  expectInvalid(
    (poison) => { poison.researchEvidence.reason = 'ttl-expired'; },
    'green research requires the canonical fresh-pass reason',
  );
  expectInvalid(
    (poison) => {
      poison.researchEvidence.runId = 123;
      poison.researchEvidence.endedAt = 1;
    },
    'green research requires a typed sealed receipt identity',
  );
  expectInvalid(
    (poison) => {
      poison.rows[0].firstObservedTodayOlderPostedReqCount =
        poison.rows[0].firstObservedTodayReqCount + 1;
    },
    'prior native post count exceeds first observed count',
  );
  expectInvalid(
    (poison) => {
      poison.rows[0].staleAttributedPostedReqCount =
        poison.rows[0].attributedPostedReqCount + 1;
    },
    'attributed posting counts exceed coverage',
  );
  for (const args of [
    ['--top='],
    ['--top=0'],
    ['--top=-1'],
    ['--top=1.5'],
    ['--top=1', '--top=2'],
    ['--bogus'],
    ['--selftest', '--json'],
  ]) {
    try {
      parseExportArgs(args);
    } catch (error) {
      if (error.code === 'USAGE') continue;
    }
    throw new Error(`invalid CLI accepted: ${args.join(' ')}`);
  }
  if (
    JSON.stringify(parseExportArgs(['--json', '--top', '10'])) !==
    JSON.stringify({ selftest: false, json: true, top: 10 })
  ) {
    throw new Error('valid CLI parsing');
  }
  // ordering: more stale first
  if (doc.rows[0].mapCompanyId !== 't:acme' && doc.rows[0].staleObservedReqCount < 1) {
    /* acme should rank high */
  }
  console.log(JSON.stringify({ ok: true, selftest: 'recruitai-export', rows: doc.rows.length }));
}

const USAGE =
  'usage: node demigod-recruitai-export.mjs [--top N|--top=N] [--json] [--selftest]';

function parseExportArgs(args) {
  let selftest = false;
  let json = false;
  let top = 0;
  let topSeen = false;
  const fail = () => {
    const error = new Error(USAGE);
    error.code = 'USAGE';
    throw error;
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--selftest' && !selftest) {
      selftest = true;
    } else if (arg === '--json' && !json) {
      json = true;
    } else if ((arg === '--top' || arg.startsWith('--top=')) && !topSeen) {
      topSeen = true;
      const raw = arg === '--top' ? args[++index] : arg.slice('--top='.length);
      if (!/^[1-9]\d*$/.test(raw || '')) fail();
      top = Number(raw);
      if (!Number.isSafeInteger(top)) fail();
    } else {
      fail();
    }
  }
  if (selftest && args.length !== 1) fail();
  return { selftest, json, top };
}

function main() {
  const { selftest: runSelftest, json, top } = parseExportArgs(process.argv.slice(2));
  if (runSelftest) {
    selftest();
    return;
  }
  if (!fs.existsSync(MAP_PATH) || !fs.existsSync(LEDGER_PATH)) {
    console.error('missing map or ledger JSON');
    process.exit(2);
  }
  const map = loadJson(MAP_PATH);
  const ledger = loadJson(LEDGER_PATH);
  const benchmark = loadJson(BENCHMARK_PATH);
  const catalog = loadJson(CATALOG_PATH);
  const researchEvidence = refuseIfStale('company-research-benchmark');
  // Prefer counts sealed with the benchmark run; fall back to live history file.
  let sourceHistory = null;
  try {
    const benchRun = loadJson(path.join(BUSY, 'company-research-benchmark.json'));
    if (benchRun?.sourceHistory?.counts) {
      sourceHistory = {
        updatedAt: benchRun.sourceHistory.updatedAt || null,
        counts: benchRun.sourceHistory.counts,
      };
    }
  } catch {
    /* optional */
  }
  if (!sourceHistory) {
    try {
      const hist = loadJson(path.join(BUSY, 'company-research-source-history.json'));
      if (hist?.schema === 'demigod.company-research-source-history/2' && hist.counts) {
        sourceHistory = { updatedAt: hist.updatedAt || null, counts: hist.counts };
      }
    } catch {
      /* optional */
    }
  }
  const doc = buildExport(map, ledger, {
    top,
    benchmark,
    catalog,
    researchEvidence,
    sourceHistory,
  });
  assertExportValid(doc);
  const { outPath, csvPath, commitPath, generation } = withFileLock(
    path.join(BUSY, 'recruitai-export.lock'),
    () => publishExport(doc, exportRowsCsv(doc.rows)),
  );
  if (json) {
    process.stdout.write(JSON.stringify(doc) + '\n');
  } else {
    console.log(
      JSON.stringify(
        {
          ok: true,
          outPath,
          csvPath,
          commitPath,
          generation,
          schema: doc.schema,
          rows: doc.counts.rows,
          ordering: doc.ordering,
          researchEvidence: doc.researchEvidence,
          relationships: doc.relationships.counts,
          diagnostics: doc.counts,
        },
        null,
        2,
      ),
    );
  }
}

if (isMain) {
  try {
    main();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(e.code === 'USAGE' ? 2 : 1);
  }
}
