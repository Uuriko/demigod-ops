#!/usr/bin/env node
/**
 * demigod-company-packet — read-only one-company research packet (Clay-useful slice).
 *
 * Exact company.id joins map + ledger + signals + accepted research + employer ATS
 * fields + unknowns[] + journal[] (opened / closed / reopened / maintained_stale
 * from ledger clocks we already store) + peers[] (roleMix overlap on the SF map).
 * No network. No people data. No score/state authority. No neighborhood pins.
 *
 *   node demigod-company-packet.mjs --selftest
 *   node demigod-company-packet.mjs show --id=yc:almanac
 *
 * Schema: demigod.company-packet/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPANY_RESEARCH_FIELDS,
  projectCompanyResearch,
} from './demigod-evidence.mjs';
import { identityDomainFromWebsite } from './demigod-company-identity.mjs';
import { boardsFromMap, postedVsEditedDays, projectEmployerAtsFields } from './demigod-role-ledger.mjs';
import {
  loadSignalsDoc,
  signalCountsForCompany,
} from './demigod-recruitai-seed-pack.mjs';
import { findCompanyPeers } from './demigod-company-peers.mjs';
import { hiringShape } from './demigod-hiring-shape.mjs';
import { hiringStatusOf, LAST_ATTEMPTS } from './demigod-role-mission-kernel.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const PACKET_SCHEMA = 'demigod.company-packet/1';

/** Derive lastAttempt from the map row. Never invent `ok` for a missing or stale count. */
export function projectLastAttempt(company = {}) {
  if (LAST_ATTEMPTS.includes(company.lastAttempt)) {
    return {
      lastAttempt: company.lastAttempt,
      lastAttemptAt: company.lastAttemptAt || null,
    };
  }
  if (company.openRolesStale) return { lastAttempt: 'error', lastAttemptAt: null };
  if (Number.isInteger(company.openRoles) && company.openRolesAt) {
    return { lastAttempt: 'ok', lastAttemptAt: company.lastAttemptAt || company.openRolesAt };
  }
  if (company.openRolesAt && company.openRoles == null) {
    return { lastAttempt: 'missing', lastAttemptAt: company.openRolesAt };
  }
  return {};
}
const ROLE_LIMIT = 25;
const JOURNAL_LIMIT = 20;
const JOURNAL_WINDOW_DAYS = 14;
const JOURNAL_KIND_ORDER = { opened: 0, reopened: 1, closed: 2, maintained_stale: 3 };
const PACKET_RESEARCH_FIELDS = COMPANY_RESEARCH_FIELDS.filter((field) => field !== 'pricingStatus');
const isDay = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    return null;
  }
}

function unknownPacket(companyId) {
  return {
    schema: PACKET_SCHEMA,
    status: 'unknown',
    companyId: typeof companyId === 'string' ? companyId : '',
    unknowns: [{ field: 'company', reason: 'not_found' }],
  };
}

function findMapCompany(map, companyId) {
  const rows = Array.isArray(map?.companies) ? map.companies : [];
  const hits = rows.filter((row) => row && typeof row === 'object' && row.id === companyId);
  if (hits.length > 1) {
    const err = new Error(`duplicate company id: ${companyId}`);
    err.code = 'duplicate_company_id';
    throw err;
  }
  return hits[0] || null;
}

export function projectRole(row) {
  const ats = projectEmployerAtsFields(row);
  return {
    title: typeof row?.title === 'string' ? row.title : '',
    url: typeof row?.url === 'string' ? row.url : '',
    location: typeof row?.location === 'string' ? row.location : '',
    employerDepartment: ats.employerDepartment,
    employerOffice: ats.employerOffice,
    workplaceType: ats.workplaceType,
    employmentType: ats.employmentType,
    nativeDeadline: ats.nativeDeadline,
    firstSeen: isDay(row?.firstSeen) ? row.firstSeen : null,
    lastSeen: isDay(row?.lastSeen) ? row.lastSeen : null,
    closedAt: isDay(row?.closedAt) ? row.closedAt : null,
    nativePostedAt: ats.nativePostedAt,
    nativeDateField: ats.nativeDateField,
  };
}

function daysBetweenUtc(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function utcDateOf(value) {
  if (isDay(value)) return value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function packetToday(explicit, ledger, map) {
  if (isDay(explicit)) return explicit;
  return utcDateOf(ledger?.updatedAt) || utcDateOf(map?.generatedAt) || null;
}

function inJournalWindow(day, today) {
  return Boolean(today && isDay(day) && day <= today && daysBetweenUtc(day, today) <= JOURNAL_WINDOW_DAYS);
}

function boardLedgerRoles(ledger, board) {
  if (!board || !isRecord(ledger?.roles)) return [];
  const rows = [];
  for (const row of Object.values(ledger.roles)) {
    if (!row || row.provider !== board.provider || row.slug !== board.slug) continue;
    rows.push(row);
  }
  return rows;
}

function rolesForBoard(ledger, board) {
  const rows = boardLedgerRoles(ledger, board).map(projectRole);
  rows.sort((a, b) => {
    const ac = a.closedAt ? 1 : 0;
    const bc = b.closedAt ? 1 : 0;
    return ac - bc || String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))
      || String(a.title).localeCompare(String(b.title));
  });
  return rows.slice(0, ROLE_LIMIT);
}

function journalEvent(kind, at, row, extra = {}) {
  return {
    kind,
    at,
    title: typeof row?.title === 'string' ? row.title : '',
    url: typeof row?.url === 'string' ? row.url : '',
    extra,
  };
}

function journalEventsForRole(row, today) {
  const events = [];
  const closedAt = isDay(row?.closedAt) ? row.closedAt : null;
  const firstSeen = isDay(row?.firstSeen) ? row.firstSeen : null;
  const lastSeen = isDay(row?.lastSeen) ? row.lastSeen : null;
  const open = closedAt == null;

  if (today) {
    if (firstSeen && open && inJournalWindow(firstSeen, today)) {
      events.push(journalEvent('opened', firstSeen, row));
    }
    if (closedAt && inJournalWindow(closedAt, today)) {
      events.push(journalEvent('closed', closedAt, row));
    }
    const reopenCount = row?.reopenCount;
    if (
      open
      && Number.isSafeInteger(reopenCount)
      && reopenCount > 0
      && inJournalWindow(lastSeen, today)
    ) {
      events.push(journalEvent('reopened', lastSeen, row, { reopenCount }));
    }
  }

  if (open && row?.nativeDateField === 'first_published') {
    const gap = postedVsEditedDays(row);
    const postedAt = isDay(row?.nativePostedAt) ? row.nativePostedAt : null;
    const updatedAt = isDay(row?.nativeUpdatedAt) ? row.nativeUpdatedAt : null;
    if (gap != null && gap >= JOURNAL_WINDOW_DAYS && postedAt && updatedAt) {
      events.push(journalEvent('maintained_stale', updatedAt, row, {
        postedAt,
        updatedAt,
        postedVsEditedDays: gap,
      }));
    }
  }
  return events;
}

function journalForBoard(ledger, board, today) {
  if (!board) return [];
  const events = [];
  for (const row of boardLedgerRoles(ledger, board)) {
    events.push(...journalEventsForRole(row, today));
  }
  events.sort((a, b) =>
    String(b.at).localeCompare(String(a.at))
    || (JOURNAL_KIND_ORDER[a.kind] ?? 99) - (JOURNAL_KIND_ORDER[b.kind] ?? 99)
    || String(a.title).localeCompare(String(b.title)));
  return events.slice(0, JOURNAL_LIMIT);
}

function packetResearch(projected) {
  if (!projected || !isRecord(projected)) return null;
  const fields = {};
  for (const name of PACKET_RESEARCH_FIELDS) {
    const field = projected.fields?.[name];
    if (!field || !['supported', 'conflict'].includes(field.status)) continue;
    const quote = String(field.evidence?.quote || '').trim();
    if (!quote || quote.split(/\s+/).length > 20) continue;
    fields[name] = field;
  }
  const acceptedFields = (projected.acceptedFields || [])
    .filter((name) => PACKET_RESEARCH_FIELDS.includes(name));
  return {
    status: Object.values(fields).some((field) => field.status === 'conflict')
      ? 'verified_with_conflict'
      : Object.keys(fields).length ? 'verified' : 'unknown',
    source: projected.source,
    researchedAt: projected.researchedAt || null,
    acceptedFields,
    quarantineHiring: projected.quarantineHiring === true,
    fields,
  };
}

function packetEvidence(research) {
  if (!research) return [];
  const out = [];
  for (const [field, claim] of Object.entries(research.fields || {})) {
    const url = claim?.evidence?.url;
    const quote = String(claim?.evidence?.quote || '').trim();
    if (!url || !quote || quote.split(/\s+/).length > 20) continue;
    out.push({ field, url, quote });
  }
  return out;
}

function collectUnknowns({ identity, hiring, research, signalsMissing, quarantined }) {
  const unknowns = [];
  const add = (field, reason) => unknowns.push({ field, reason });
  if (!identity.domain) add('identity.domain', 'not_found');
  if (!identity.website) add('identity.website', 'not_found');
  if (!identity.source) add('identity.source', 'not_found');
  if (!identity.sourceUrl) add('identity.sourceUrl', 'not_found');
  if (!quarantined) {
    if (!hiring.atsSource) add('hiring.atsSource', 'not_found');
    if (!hiring.jobsUrl) add('hiring.jobsUrl', 'not_found');
    if (hiring.openRoles == null) add('hiring.openRoles', 'not_found');
    if (!hiring.roleMix) add('hiring.roleMix', 'not_found');
  }
  if (signalsMissing) add('signals', 'not_found');
  if (!research) add('research', 'not_found');
  else {
    if (research.status === 'unknown') add('research', 'unresolved');
    for (const field of PACKET_RESEARCH_FIELDS) {
      if (!research.fields?.[field]) add(`research.${field}`, 'not_found');
    }
  }
  return unknowns;
}

/**
 * Pure. Exact company.id only. Duplicate map id throws (fail closed, no merge).
 * Unknown id → { status: "unknown" } with no invented identity/roles.
 */
export function buildCompanyPacket({
  companyId,
  map = {},
  ledger = {},
  signals = null,
  benchmark = {},
  catalog = {},
  signalsMissing = false,
  today,
} = {}) {
  if (typeof companyId !== 'string' || !companyId.trim()) return unknownPacket(companyId);
  const company = findMapCompany(map, companyId);
  if (!company) return unknownPacket(companyId);

  const projected = projectCompanyResearch({ companyId, benchmark, catalog });
  const research = packetResearch(projected);
  const quarantined = projected?.quarantineHiring === true;
  const peerResult = findCompanyPeers({ companyId, map });
  const asOfToday = packetToday(today, ledger, map);
  const board = quarantined ? null : (boardsFromMap({ companies: [company] })[0] || null);
  const roleRows = quarantined ? [] : rolesForBoard(ledger, board);
  const journal = quarantined ? [] : journalForBoard(ledger, board, asOfToday);
  const openFromLedger = board && isRecord(ledger?.roles)
    ? Object.values(ledger.roles).filter((row) =>
      row && row.provider === board.provider && row.slug === board.slug && !row.closedAt).length
    : null;
  const openRoles = quarantined
    ? null
    : (openFromLedger != null
      ? openFromLedger
      : (Number.isSafeInteger(company.openRoles) ? company.openRoles : null));
  const identity = {
    id: company.id,
    name: typeof company.name === 'string' ? company.name : '',
    domain: identityDomainFromWebsite(company.website),
    website: company.website || null,
    source: company.source || null,
    sourceUrl: company.sourceUrl || null,
  };
  const attempt = projectLastAttempt(company);
  const hiring = {
    // `openRolesAt` alone used to mean "we watched this board". It no longer does — see
    // hiringStatusOf, which the matching engine reads from the same place so the two surfaces
    // cannot drift apart again. Grok caught the carry half of this; the YC-link half was found on
    // live yc:10x. board_stale is additive; CONTRACTS.md declares no enum for it.
    status: hiringStatusOf(company, { quarantined, openRoles }),
    openRoles,
    openRolesAt: quarantined ? null : (company.openRolesAt || null),
    ...attempt,
    atsSource: quarantined ? null : (company.atsSource || null),
    jobsUrl: quarantined ? null : (company.jobsUrl || null),
    roleMix: quarantined ? null : (isRecord(company.roleMix) ? company.roleMix : null),
    // What that mix is for, as a label carrying the counts behind it. Quarantine hides it for
    // the same reason it hides roleMix: the shape is derived from the hiring evidence, so it
    // must not outlive the evidence's seal. Never a score — see demigod-hiring-shape.mjs.
    shape: quarantined ? null : hiringShape(company),
  };
  const signalCounts = signalCountsForCompany(signals, companyId);
  const missingSignals = signalsMissing || signals == null;
  const unknowns = collectUnknowns({
    identity,
    hiring,
    research,
    signalsMissing: missingSignals,
    quarantined,
  });
  if (!quarantined && peerResult.unknown === 'no_role_mix') {
    unknowns.push({ field: 'peers', reason: 'no_role_mix' });
  }
  return {
    schema: PACKET_SCHEMA,
    companyId,
    asOf: {
      mapGeneratedAt: map.generatedAt || null,
      ledgerUpdatedAt: ledger.updatedAt || null,
      signalsAt: signals?.at || null,
      researchedAt: research?.researchedAt || null,
    },
    identity,
    hiring,
    roles: roleRows,
    journal,
    peers: quarantined ? [] : peerResult.peers,
    peerBasis: peerResult.basis,
    signals: signalCounts,
    research,
    unknowns,
    evidence: packetEvidence(research),
  };
}

export function loadPacketInputs({
  root = ROOT,
  busy = BUSY,
  mapPath = path.join(root, 'DEMIGOD-SF-STARTUP-MAP.json'),
  ledgerPath = process.env.DEMIGOD_ROLE_LEDGER || path.join(root, 'DEMIGOD-ROLE-LEDGER.json'),
  signalsPath = process.env.DEMIGOD_SIGNALS
    || path.join(busy, 'recruitai-handoff', 'demigod-signals.json'),
  benchmarkPath = path.join(root, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json'),
  catalogPath = path.join(root, 'DEMIGOD-COMPANY-RESEARCH.json'),
} = {}) {
  const signals = loadSignalsDoc(signalsPath);
  return {
    map: readJsonIfPresent(mapPath) || {},
    ledger: readJsonIfPresent(ledgerPath) || {},
    signals,
    signalsMissing: signals == null,
    benchmark: readJsonIfPresent(benchmarkPath) || {},
    catalog: readJsonIfPresent(catalogPath) || {},
  };
}

function argValue(flag) {
  const eq = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return null;
}

function supportedField(value, quote = 'Example makes research useful.') {
  return {
    value,
    status: 'supported',
    url: 'https://acme.example/',
    quote,
  };
}

function goldBenchmark(targetId, extraFields = {}) {
  return {
    researchedAt: '2026-08-01',
    thresholds: { usableCoverage: 0.9, evidenceSupport: 0.95 },
    companies: Array.from({ length: 30 }, (_, index) => ({
      id: index === 0 ? targetId : `gold:${index}`,
      fields: {
        canonicalCompany: supportedField(index === 0 ? 'Acme' : `Gold ${index}`),
        productSummary: supportedField('Makes useful things'),
        productCategory: supportedField('Software'),
        likelyBuyer: supportedField('Operations teams'),
        pricingStatus: index < 27
          ? supportedField('contact sales', 'Contact us for pricing details.')
          : { value: null, status: 'unknown', url: null, quote: null },
        ...extraFields,
      },
    })),
  };
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`company-packet selftest: ${msg}`);
  };
  const company = {
    id: 'yc:acme',
    name: 'Acme',
    website: 'https://www.acme.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/acme',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/acme',
    openRoles: 2,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 2 },
    hiring: 'yes',
  };
  const ashbyCo = {
    id: 'yc:ash',
    name: 'Ash Co',
    website: 'https://ash.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/ash',
    atsSource: 'Ashby',
    jobsUrl: 'https://jobs.ashbyhq.com/ash',
    openRoles: 1,
    openRolesAt: '2026-08-14',
  };
  const leverCo = {
    id: 'yc:lev',
    name: 'Lev Co',
    website: 'https://lev.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/lev',
    atsSource: 'Lever',
    jobsUrl: 'https://jobs.lever.co/lev',
    openRoles: 1,
    openRolesAt: '2026-08-14',
  };
  const journalCo = {
    id: 'yc:journal',
    name: 'Journal Co',
    website: 'https://journal.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/journal',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/journal',
    openRoles: 3,
    openRolesAt: '2026-08-14',
  };
  const map = {
    generatedAt: '2026-08-14T12:00:00.000Z',
    companies: [company, ashbyCo, leverCo, journalCo],
  };
  const ledger = {
    schema: 'demigod.role-ledger/1',
    updatedAt: '2026-08-14',
    roles: {
      'Greenhouse|acme|1': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '1',
        company: 'Acme',
        title: 'Senior Backend Engineer',
        location: 'San Francisco, CA',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        firstSeen: '2026-07-01',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-06-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Engineering',
        employerOffice: 'San Francisco',
        workplaceType: null,
        employmentType: null,
        nativeDeadline: null,
      },
      'Greenhouse|acme|2': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '2',
        company: 'Acme',
        title: 'Product Designer',
        location: 'Remote US',
        url: 'https://boards.greenhouse.io/acme/jobs/2',
        firstSeen: '2026-07-10',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-07-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Design',
        employerOffice: null,
      },
      'Ashby|ash|a1': {
        provider: 'Ashby',
        slug: 'ash',
        jobId: 'a1',
        company: 'Ash Co',
        title: 'Staff Engineer',
        location: 'San Francisco',
        url: 'https://jobs.ashbyhq.com/ash/a1',
        firstSeen: '2026-07-01',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-04-27',
        nativeUpdatedAt: '2026-08-10',
        nativeDateField: 'publishedAt',
        employerDepartment: 'Engineering',
        workplaceType: 'Remote',
        employmentType: 'FullTime',
      },
      'Lever|lev|l1': {
        provider: 'Lever',
        slug: 'lev',
        jobId: 'l1',
        company: 'Lev Co',
        title: 'Account Executive',
        location: 'New York',
        url: 'https://jobs.lever.co/lev/l1',
        firstSeen: '2026-07-01',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-05-01',
        nativeUpdatedAt: '2026-08-10',
        nativeDateField: 'createdAt',
        employerDepartment: 'Sales',
      },
      'Greenhouse|journal|open1': {
        provider: 'Greenhouse',
        slug: 'journal',
        jobId: 'open1',
        company: 'Journal Co',
        title: 'Opened Role',
        location: 'San Francisco',
        url: 'https://boards.greenhouse.io/journal/jobs/open1',
        firstSeen: '2026-08-10',
        lastSeen: '2026-08-14',
        closedAt: null,
        reopenCount: 0,
        nativePostedAt: '2026-08-10',
        nativeDateField: 'first_published',
      },
      'Greenhouse|journal|closed1': {
        provider: 'Greenhouse',
        slug: 'journal',
        jobId: 'closed1',
        company: 'Journal Co',
        title: 'Closed Role',
        location: 'San Francisco',
        url: 'https://boards.greenhouse.io/journal/jobs/closed1',
        firstSeen: '2026-07-01',
        lastSeen: '2026-08-12',
        closedAt: '2026-08-12',
        reopenCount: 0,
      },
      'Greenhouse|journal|reopen1': {
        provider: 'Greenhouse',
        slug: 'journal',
        jobId: 'reopen1',
        company: 'Journal Co',
        title: 'Reopened Role',
        location: 'San Francisco',
        url: 'https://boards.greenhouse.io/journal/jobs/reopen1',
        firstSeen: '2026-06-01',
        lastSeen: '2026-08-14',
        closedAt: null,
        reopenCount: 1,
      },
      'Greenhouse|journal|stale1': {
        provider: 'Greenhouse',
        slug: 'journal',
        jobId: 'stale1',
        company: 'Journal Co',
        title: 'Stale Role',
        location: 'San Francisco',
        url: 'https://boards.greenhouse.io/journal/jobs/stale1',
        firstSeen: '2026-06-01',
        lastSeen: '2026-08-14',
        closedAt: null,
        reopenCount: 0,
        nativePostedAt: '2026-06-01',
        nativeUpdatedAt: '2026-08-10',
        nativeDateField: 'first_published',
      },
    },
  };
  const signals = {
    schema: 'demigod.recruitai-signals/3',
    at: '2026-08-14T15:00:00.000Z',
    byMapCompanyId: {
      'yc:acme': {
        firstObservedTodayReqCount: 2,
        closedTodayReqCount: 1,
        reopenedOpenReqCount: 1,
      },
    },
  };
  const benchmark = goldBenchmark('yc:acme');

  // 1. Known fixture id → identity + hiring + ≤25 roles; employer department present.
  const known = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals,
    benchmark,
    catalog: {},
  });
  assert(known.schema === PACKET_SCHEMA, 'schema');
  assert(known.companyId === 'yc:acme', 'companyId');
  assert(known.identity.id === 'yc:acme' && known.identity.name === 'Acme', 'identity');
  assert(known.identity.domain === 'acme.example', 'domain from website');
  assert(known.identity.website === 'https://www.acme.example/', 'website');
  assert(known.hiring.status === 'board_observed', 'hiring status');
  assert(known.hiring.openRoles === 2 && known.hiring.jobsUrl === company.jobsUrl, 'hiring join');
  // A count carried across an unreadable ATS read keeps its original openRolesAt, so the date
  // alone cannot mean "freshly observed" any more. The count is still the best evidence we have
  // and stays on the packet — only its status changes, so a reader is not told it was just seen.
  const staleCo = { ...company, openRolesStale: true };
  const stalePacket = buildCompanyPacket({
    companyId: 'yc:acme',
    map: { ...map, companies: map.companies.map((c) => (c.id === 'yc:acme' ? staleCo : c)) },
    ledger,
    signals,
    benchmark,
    catalog: {},
  });
  assert(stalePacket.hiring.status === 'board_stale', 'a carried count reports stale, never freshly observed');
  assert(stalePacket.hiring.openRoles === 2, 'the carried count itself survives — stale is not absent');
  assert(stalePacket.hiring.openRolesAt === '2026-08-14', 'and keeps the date it was actually verified');
  assert(known.hiring.lastAttempt === 'ok', 'integer count + date is a successful read');
  assert(stalePacket.hiring.lastAttempt === 'error', 'a carried stale count is not lastAttempt=ok');
  const missingAttempt = projectLastAttempt({ openRolesAt: '2026-08-17', openRoles: null });
  assert(missingAttempt.lastAttempt === 'missing', 'a date without a count is a missing read');
  const explicit = projectLastAttempt({ lastAttempt: 'rate_limited', lastAttemptAt: 't' });
  assert(explicit.lastAttempt === 'rate_limited' && explicit.lastAttemptAt === 't', 'explicit attempt wins');
  // A YC directory link used to arrive stamped with the run's date and no count, and `board_observed`
  // was read off that date alone. Live yc:10x said board_observed / lastAttempt missing / no roles.
  const withRow = (row) => ({ ...map, companies: [...map.companies, row] });
  const linkOnly = buildCompanyPacket({
    companyId: 'yc:linkonly',
    map: withRow({ id: 'yc:linkonly', name: 'LinkOnly', website: 'https://linkonly.example/', hiring: 'yes', jobsSource: 'YC', openRolesAt: '2026-08-14' }),
    ledger,
    catalog: {},
  });
  assert(linkOnly.hiring.status === 'company_reported', 'a dated link with no count is not an observed board');
  assert(linkOnly.hiring.openRoles === null, 'and it still reports no count');
  const readEmpty = buildCompanyPacket({
    companyId: 'yc:readempty',
    map: withRow({ id: 'yc:readempty', name: 'ReadEmpty', website: 'https://readempty.example/', openRoles: 0, atsSource: 'Lever', jobsUrl: 'https://jobs.lever.co/readempty', openRolesAt: '2026-08-14' }),
    ledger,
    catalog: {},
  });
  assert(readEmpty.hiring.status === 'board_observed', 'a board we read and found empty stays observed — 0 is a count');
  assert(Array.isArray(known.roles) && known.roles.length === 2 && known.roles.length <= 25, 'roles bound');
  assert(
    known.roles[0].employerDepartment === 'Engineering'
      || known.roles[1].employerDepartment === 'Engineering',
    'employerDepartment projects when ledger has it',
  );
  assert(known.roles.every((row) => row.nativeDateField !== 'first_published' || row.nativePostedAt), 'gh posted');
  assert(Array.isArray(known.unknowns), 'unknowns[] first-class');
  assert(!known.unknowns.some((row) => row.field === 'company'), 'known id is not unknown company');
  assert(Array.isArray(known.journal), 'known packet has journal[]');
  assert(!known.journal.some((row) => row.kind === 'opened'), 'July firstSeen is outside the 14d window');
  assert(Array.isArray(known.peers), 'known packet has peers[]');
  assert(known.peerBasis === 'sf-map + roleMix overlap', 'peerBasis exact');
  assert(!known.unknowns.some((row) => row.field === 'peers'), 'acme has roleMix so no peers unknown');
  assert(known.peers.every((row) => !('score' in row) && !('fit' in row)), 'peers emit no score');

  // 2. Unknown id → status unknown; no invented website/roles.
  const absent = buildCompanyPacket({
    companyId: 'yc:affirm',
    map,
    ledger,
    signals,
    benchmark,
  });
  assert(absent.status === 'unknown' && absent.companyId === 'yc:affirm', 'unknown status');
  assert(!absent.identity && !absent.hiring && !absent.roles, 'unknown invents nothing');
  assert(!Object.hasOwn(absent, 'journal'), 'unknown packet has no journal field');
  assert(!Object.hasOwn(absent, 'peers') && !Object.hasOwn(absent, 'peerBasis'), 'unknown packet has no peers fields');
  assert(!JSON.stringify(absent).includes('acme.example'), 'unknown does not leak fixture website');

  // 3. Duplicate map id → throw; no merge.
  let dupThrew = false;
  try {
    buildCompanyPacket({
      companyId: 'yc:acme',
      map: { companies: [company, { ...company, name: 'Acme Dup' }] },
      ledger,
    });
  } catch (error) {
    dupThrew = error?.code === 'duplicate_company_id';
  }
  assert(dupThrew, 'duplicate id fails closed');

  // 4. Research: only accepted fields; pricing absent; quote ≤20 words.
  assert(known.research?.status === 'verified', 'research projects');
  assert(known.research.fields.canonicalCompany?.value === 'Acme', 'accepted field projects');
  assert(!('pricingStatus' in (known.research.fields || {})), 'pricing stays out');
  assert(!(known.research.acceptedFields || []).includes('pricingStatus'), 'pricing not accepted on packet');
  assert(known.evidence.every((row) => row.field !== 'pricingStatus'), 'pricing not in evidence');
  assert(known.evidence.every((row) => String(row.quote).trim().split(/\s+/).length <= 20), 'quote ≤20 words');
  assert(!known.unknowns.some((row) => String(row.field).includes('pricing')), 'pricing not an unknown');

  // 5. Signals attach; missing signals file → zeros, not a crash.
  assert(
    known.signals.firstObservedToday === 2
      && known.signals.closedToday === 1
      && known.signals.reopenedOpen === 1,
    'signals attach by mapCompanyId',
  );
  const noSignals = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals: null,
    signalsMissing: true,
    benchmark,
  });
  assert(
    noSignals.signals.firstObservedToday === 0
      && noSignals.signals.closedToday === 0
      && noSignals.signals.reopenedOpen === 0,
    'missing signals → zeros',
  );
  assert(noSignals.unknowns.some((row) => row.field === 'signals' && row.reason === 'not_found'), 'signals unknown');
  assert(loadSignalsDoc('/tmp/dg-company-packet-no-signals.json') === null, 'missing signals file does not crash');

  // 6. Quarantine hides roles, jobsUrl, open count.
  const quarantined = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals,
    benchmark,
    catalog: {
      companies: [{
        id: 'yc:acme',
        quarantineHiring: true,
        fields: benchmark.companies[0].fields,
      }],
    },
  });
  assert(quarantined.hiring.status === 'quarantined', 'quarantine status');
  assert(quarantined.hiring.jobsUrl === null && quarantined.hiring.openRoles === null, 'quarantine hides jobs/open');
  assert(Array.isArray(quarantined.roles) && quarantined.roles.length === 0, 'quarantine hides roles');
  assert(Array.isArray(quarantined.journal) && quarantined.journal.length === 0, 'quarantine journal empty');
  assert(Array.isArray(quarantined.peers) && quarantined.peers.length === 0, 'quarantine peers empty');
  assert(quarantined.peerBasis === 'sf-map + roleMix overlap', 'quarantine peerBasis set');
  assert(!quarantined.unknowns.some((row) => row.field === 'peers'), 'quarantine no peers unknown');
  assert(quarantined.research?.quarantineHiring === true, 'quarantine flag on research');

  // 7. Ashby/Lever without first_published → nativePostedAt null.
  const ash = buildCompanyPacket({ companyId: 'yc:ash', map, ledger, signals: {}, benchmark: goldBenchmark('yc:ash') });
  const lev = buildCompanyPacket({ companyId: 'yc:lev', map, ledger, signals: {}, benchmark: goldBenchmark('yc:lev') });
  assert(ash.roles.length === 1 && ash.roles[0].nativePostedAt === null, 'ashby postedAt stays null');
  assert(ash.roles[0].nativeDateField === 'publishedAt', 'ashby field name preserved, value not copied');
  assert(ash.roles[0].employerDepartment === 'Engineering', 'ashby department projects');
  assert(lev.roles.length === 1 && lev.roles[0].nativePostedAt === null, 'lever postedAt stays null');
  assert(lev.roles[0].nativeDateField === 'createdAt', 'lever field name preserved, value not copied');
  assert(!ash.journal.some((row) => row.kind === 'maintained_stale'), 'ashby dates do not emit maintained_stale');
  assert(!lev.journal.some((row) => row.kind === 'maintained_stale'), 'lever dates do not emit maintained_stale');

  // 8. Packet object is never passed into scoreMatch — import/grep canary.
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const engine = fs.readFileSync(path.join(ROOT, 'demigod-matching-engine.mjs'), 'utf8');
  assert(!/\bscoreMatch\s*\(/.test(here), 'packet module never calls scoreMatch');
  assert(!/demigod-company-packet/.test(engine), 'matching engine does not import company-packet');
  assert(!/buildCompanyPacket/.test(engine), 'matching engine does not name buildCompanyPacket');

  const dumped = JSON.stringify(known);
  assert(!/"email"/.test(dumped) && !/"phone"/.test(dumped) && !/"persona"/.test(dumped), 'no people fields');
  assert(!/"score"/.test(dumped), 'no score field');

  const manyRoles = { ...ledger, roles: { ...ledger.roles } };
  for (let i = 3; i <= 30; i++) {
    manyRoles.roles[`Greenhouse|acme|${i}`] = {
      ...ledger.roles['Greenhouse|acme|1'],
      jobId: String(i),
      title: `Role ${i}`,
    };
  }
  const capped = buildCompanyPacket({ companyId: 'yc:acme', map, ledger: manyRoles, signals, benchmark });
  assert(capped.roles.length === 25, `roles capped at 25, got ${capped.roles.length}`);

  const manyClosed = { ...ledger, roles: { ...ledger.roles } };
  for (let i = 3; i <= 30; i++) {
    manyClosed.roles[`Greenhouse|acme|${i}`] = {
      ...ledger.roles['Greenhouse|acme|1'],
      jobId: String(i),
      title: `Role ${i}`,
      firstSeen: '2026-07-01',
      lastSeen: i === 30 ? '2026-08-12' : '2026-08-14',
      closedAt: i === 30 ? '2026-08-12' : null,
    };
  }
  const cappedJournal = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger: manyClosed,
    signals,
    benchmark,
    today: '2026-08-14',
  });
  assert(cappedJournal.roles.length === 25, 'roles stay capped at 25 when journal walks all board roles');
  assert(
    cappedJournal.journal.some((row) => row.kind === 'closed' && row.title === 'Role 30' && row.at === '2026-08-12'),
    '26th closed in-window role still journals',
  );

  const journaled = buildCompanyPacket({
    companyId: 'yc:journal',
    map,
    ledger,
    signals: {},
    benchmark: goldBenchmark('yc:journal'),
    today: '2026-08-14',
  });
  assert(journaled.identity.id === 'yc:journal', 'journal fixture builds');
  const byKind = Object.fromEntries(journaled.journal.map((row) => [row.kind, row]));
  assert(journaled.journal.length === 4, `journal has 4 events, got ${journaled.journal.length}`);
  assert(byKind.opened?.at === '2026-08-10' && byKind.opened.title === 'Opened Role', 'opened at firstSeen');
  assert(byKind.closed?.at === '2026-08-12' && byKind.closed.title === 'Closed Role', 'closed at closedAt');
  assert(
    byKind.reopened?.at === '2026-08-14'
      && byKind.reopened.extra?.reopenCount === 1
      && byKind.reopened.title === 'Reopened Role',
    'reopened at lastSeen with reopenCount',
  );
  assert(
    byKind.maintained_stale?.at === '2026-08-10'
      && byKind.maintained_stale.extra?.postedAt === '2026-06-01'
      && byKind.maintained_stale.extra?.updatedAt === '2026-08-10'
      && byKind.maintained_stale.extra?.postedVsEditedDays === 70
      && byKind.maintained_stale.title === 'Stale Role',
    'maintained_stale from first_published clocks',
  );
  assert(
    journaled.journal.map((row) => row.kind).join(',') === 'reopened,closed,opened,maintained_stale',
    'journal sorts newest at, then kind, then title',
  );

  const overflow = { ...ledger, roles: { ...ledger.roles } };
  for (let i = 0; i < 25; i++) {
    overflow.roles[`Greenhouse|journal|cap${i}`] = {
      provider: 'Greenhouse',
      slug: 'journal',
      jobId: `cap${i}`,
      company: 'Journal Co',
      title: `Cap ${String(i).padStart(2, '0')}`,
      url: `https://boards.greenhouse.io/journal/jobs/cap${i}`,
      firstSeen: '2026-08-01',
      lastSeen: '2026-08-14',
      closedAt: null,
      reopenCount: 0,
    };
  }
  const cappedEvents = buildCompanyPacket({
    companyId: 'yc:journal',
    map,
    ledger: overflow,
    signals: {},
    benchmark: goldBenchmark('yc:journal'),
    today: '2026-08-14',
  });
  assert(cappedEvents.journal.length === 20, `journal capped at 20, got ${cappedEvents.journal.length}`);

  console.log(JSON.stringify({ ok: true, selftest: 'company-packet' }));
}

function show(companyId) {
  if (!companyId) {
    console.error('usage: node demigod-company-packet.mjs show --id=yc:…');
    process.exit(2);
  }
  let packet;
  try {
    packet = buildCompanyPacket({ companyId, ...loadPacketInputs() });
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      console.error(JSON.stringify({
        schema: PACKET_SCHEMA,
        status: 'unknown',
        companyId,
        error: 'duplicate_company_id',
      }));
      process.exit(1);
    }
    throw error;
  }
  if (packet.status === 'unknown') {
    console.log(JSON.stringify({
      ...packet,
      note: `id ${companyId} is absent from the startup map`,
    }, null, 2));
    return;
  }
  console.log(JSON.stringify(packet, null, 2));
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'show') {
      show(argValue('--id'));
    } else {
      console.error('usage: node demigod-company-packet.mjs --selftest | show --id=yc:…');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
