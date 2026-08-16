#!/usr/bin/env node
/**
 * demigod-hiring-ticket — review-only founder hiring ticket (beyond-Clay slice 4).
 *
 * Fills a ticket from a company packet + open roles. Human still authors
 * must-haves and the 90-day outcome. Does not write RolePackets or invent criteria.
 *
 *   node demigod-hiring-ticket.mjs --selftest
 *   node demigod-hiring-ticket.mjs show --id=yc:abundant [--family=engineering] [--title-hint=…]
 *
 * Schema: demigod.hiring-ticket/1
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildCompanyPacket, loadPacketInputs } from './demigod-company-packet.mjs';
import { renderCompanyMemo } from './demigod-company-memo.mjs';
import { categorizeRole } from './demigod-startup-jobs-enrich.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const TICKET_SCHEMA = 'demigod.hiring-ticket/1';
export const TICKET_AUTHORITY = 'review_only';
const ROLE_LIMIT = 10;
const EMPTY_BLANKS = Object.freeze({ outcome90d: null, mustHaves: [] });

/** roleMix keys. Never invent a family outside this set. */
export const ROLE_FAMILIES = Object.freeze([
  'engineering',
  'sales',
  'other',
  'operations',
  'marketing',
  'ai/data',
  'product',
  'finance/legal',
  'design',
  'people',
]);
const ROLE_FAMILY_SET = new Set(ROLE_FAMILIES);

/** Simple title/department aliases. Family key itself is also accepted. */
const FAMILY_ALIASES = Object.freeze({
  engineering: ['engineer', 'eng', 'platform', 'backend', 'frontend', 'staff'],
  product: ['pm', 'product manager'],
  design: ['designer'],
  sales: ['sales', 'account executive', 'ae'],
  operations: ['ops', 'operations'],
  marketing: ['marketing', 'growth'],
  'ai/data': ['ai', 'ml', 'data'],
  'finance/legal': ['finance', 'legal'],
  people: ['people', 'recruiter', 'hr'],
  other: [],
});

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function emptyBlanks() {
  return { outcome90d: null, mustHaves: [] };
}

function readNeed(need) {
  const raw = isRecord(need) ? need : {};
  const familyRaw = typeof raw.family === 'string' ? raw.family.trim() : '';
  const hintRaw = typeof raw.titleHint === 'string' ? raw.titleHint.trim() : '';
  if (!familyRaw) {
    return {
      family: null,
      titleHint: hintRaw || null,
      familyKnown: false,
      familyPresent: false,
    };
  }
  const canonical = familyRaw.toLowerCase();
  if (ROLE_FAMILY_SET.has(canonical)) {
    return {
      family: canonical,
      titleHint: hintRaw || null,
      familyKnown: true,
      familyPresent: true,
    };
  }
  return {
    family: familyRaw,
    titleHint: hintRaw || null,
    familyKnown: false,
    familyPresent: true,
  };
}

function isOpenRole(role) {
  const closed = role?.closedAt;
  return closed == null || closed === '';
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blobHasAlias(blob, alias) {
  const a = String(alias || '').toLowerCase().trim();
  if (!a || !blob) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(a)}(?:[^a-z0-9]|$)`);
  return re.test(blob);
}

function roleMatchesFamily(role, family) {
  const title = typeof role?.title === 'string' ? role.title : '';
  if (categorizeRole(title) === family) return true;
  const dept = typeof role?.employerDepartment === 'string' ? role.employerDepartment : '';
  const blob = `${title} ${dept}`.toLowerCase();
  if (blobHasAlias(blob, family)) return true;
  for (const alias of FAMILY_ALIASES[family] || []) {
    if (blobHasAlias(blob, alias)) return true;
  }
  return false;
}

function roleMatchesHint(role, hint) {
  if (!hint) return true;
  const title = typeof role?.title === 'string' ? role.title : '';
  return title.toLowerCase().includes(hint.toLowerCase());
}

function filterOpenRoles(roles, { family, titleHint }) {
  const rows = (Array.isArray(roles) ? roles : []).filter((role) => isRecord(role) && isOpenRole(role));
  const filtered = rows.filter((role) => {
    if (family && !roleMatchesFamily(role, family)) return false;
    if (titleHint && !roleMatchesHint(role, titleHint)) return false;
    return true;
  });
  filtered.sort((a, b) =>
    String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))
    || String(a.title || '').localeCompare(String(b.title || '')));
  return filtered.slice(0, ROLE_LIMIT);
}

function projectCompany(packet) {
  const identity = packet?.identity;
  if (!isRecord(identity)) return null;
  return {
    id: identity.id,
    name: identity.name,
    domain: identity.domain,
    website: identity.website,
    hiring: isRecord(packet.hiring) ? packet.hiring : null,
  };
}

function isQuarantined(packet) {
  return packet?.hiring?.status === 'quarantined' || packet?.research?.quarantineHiring === true;
}

function unknownTicket(packet, need) {
  const companyId = typeof packet?.companyId === 'string' ? packet.companyId : '';
  const memo = renderCompanyMemo(packet);
  const unknowns = [];
  if (need.familyPresent && !need.familyKnown) {
    unknowns.push({ field: 'need.family', reason: 'not_a_role_family' });
  }
  return {
    schema: TICKET_SCHEMA,
    status: 'unknown',
    companyId,
    need: { family: need.family, titleHint: need.titleHint },
    company: null,
    roles: [],
    journal: [],
    peers: [],
    unknowns,
    memoMarkdown: typeof memo?.markdown === 'string' ? memo.markdown : '',
    blanks: emptyBlanks(),
    authority: TICKET_AUTHORITY,
  };
}

/**
 * Pure. Packet object only. No network. No fs. No RolePacket write.
 * blanks stay empty — must-haves and 90-day outcome are human-authored.
 */
export function fillHiringTicket({ packet, need = {} } = {}) {
  const parsedNeed = readNeed(need);
  if (!isRecord(packet) || packet.status === 'unknown') {
    return unknownTicket(packet, parsedNeed);
  }

  const quarantined = isQuarantined(packet);
  const familyFilter = parsedNeed.familyKnown ? parsedNeed.family : null;
  const roles = quarantined
    ? []
    : filterOpenRoles(packet.roles, { family: familyFilter, titleHint: parsedNeed.titleHint });
  const journal = quarantined
    ? []
    : (Array.isArray(packet.journal) ? packet.journal.slice() : []);
  const peers = quarantined
    ? []
    : (Array.isArray(packet.peers) ? packet.peers.slice() : []);
  const unknowns = Array.isArray(packet.unknowns) ? packet.unknowns.slice() : [];
  if (parsedNeed.familyPresent && !parsedNeed.familyKnown) {
    unknowns.push({ field: 'need.family', reason: 'not_a_role_family' });
  }
  const memo = renderCompanyMemo(packet);
  return {
    schema: TICKET_SCHEMA,
    status: 'ok',
    companyId: typeof packet.companyId === 'string' ? packet.companyId : '',
    need: { family: parsedNeed.family, titleHint: parsedNeed.titleHint },
    company: projectCompany(packet),
    roles,
    journal,
    peers,
    unknowns,
    memoMarkdown: typeof memo?.markdown === 'string' ? memo.markdown : '',
    blanks: emptyBlanks(),
    authority: TICKET_AUTHORITY,
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

function fingerprint(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const st = fs.statSync(filePath);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return { mtimeMs: st.mtimeMs, size: st.size, hash };
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
    if (!cond) throw new Error(`hiring-ticket selftest: ${msg}`);
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
    roleMix: { engineering: 1, sales: 1 },
    hiring: 'yes',
  };
  const peerCo = {
    id: 'yc:beta',
    name: 'Beta',
    website: 'https://beta.example/',
    source: 'Y Combinator',
    sourceUrl: 'https://www.ycombinator.com/companies/beta',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/beta',
    openRoles: 2,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 2 },
    hiring: 'yes',
  };
  const map = {
    generatedAt: '2026-08-14T12:00:00.000Z',
    companies: [company, peerCo],
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
        title: 'Staff Engineer',
        location: 'San Francisco, CA',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        firstSeen: '2026-08-10',
        lastSeen: '2026-08-14',
        closedAt: null,
        nativePostedAt: '2026-08-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Engineering',
        employerOffice: 'San Francisco',
      },
      'Greenhouse|acme|2': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '2',
        company: 'Acme',
        title: 'Account Executive',
        location: 'New York',
        url: 'https://boards.greenhouse.io/acme/jobs/2',
        firstSeen: '2026-08-08',
        lastSeen: '2026-08-13',
        closedAt: null,
        nativePostedAt: '2026-08-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Sales',
      },
      'Greenhouse|acme|3': {
        provider: 'Greenhouse',
        slug: 'acme',
        jobId: '3',
        company: 'Acme',
        title: 'Closed Engineer',
        location: 'San Francisco',
        url: 'https://boards.greenhouse.io/acme/jobs/3',
        firstSeen: '2026-07-01',
        lastSeen: '2026-08-01',
        closedAt: '2026-08-01',
        nativePostedAt: '2026-06-01',
        nativeDateField: 'first_published',
        employerDepartment: 'Engineering',
      },
    },
  };
  const benchmark = goldBenchmark('yc:acme');
  const knownPacket = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals: null,
    signalsMissing: true,
    benchmark,
    catalog: {},
    today: '2026-08-14',
  });
  assert(knownPacket.roles.some((row) => row.title === 'Staff Engineer'), 'fixture attached Staff Engineer');
  assert(knownPacket.roles.some((row) => row.title === 'Account Executive'), 'fixture attached Account Executive');

  // 1. family=engineering keeps Staff Engineer and drops Account Executive.
  const eng = fillHiringTicket({ packet: knownPacket, need: { family: 'engineering' } });
  assert(eng.schema === TICKET_SCHEMA, 'schema');
  assert(eng.status === 'ok', 'known status ok');
  assert(eng.companyId === 'yc:acme', 'companyId');
  assert(eng.need.family === 'engineering' && eng.need.titleHint === null, 'need echo');
  assert(eng.authority === TICKET_AUTHORITY, 'authority review_only');
  assert(eng.roles.length === 1 && eng.roles[0].title === 'Staff Engineer', 'eng filter keeps Staff Engineer');
  assert(!eng.roles.some((row) => row.title === 'Account Executive'), 'eng filter drops Account Executive');
  assert(!eng.roles.some((row) => row.title === 'Closed Engineer'), 'closed roles dropped');
  assert(eng.roles.length <= 10, 'roles capped at 10');
  assert(eng.company?.id === 'yc:acme' && eng.company?.website === 'https://www.acme.example/', 'company projects');
  assert(isRecord(eng.company?.hiring), 'company.hiring present');
  assert(typeof eng.memoMarkdown === 'string' && eng.memoMarkdown.includes('Acme'), 'memo from packet');
  assert(Array.isArray(eng.journal) && Array.isArray(eng.peers) && Array.isArray(eng.unknowns), 'arrays');

  // 2. unknown family → no filter plus unknowns reason not_a_role_family.
  const badFamily = fillHiringTicket({ packet: knownPacket, need: { family: 'not-a-family' } });
  assert(badFamily.status === 'ok', 'invalid family still known company');
  assert(badFamily.need.family === 'not-a-family', 'invalid family echoed, not invented');
  const titles = badFamily.roles.map((row) => row.title).sort();
  assert(titles.includes('Staff Engineer') && titles.includes('Account Executive'), 'unknown family does not filter');
  assert(!titles.includes('Closed Engineer'), 'unknown family still drops closed');
  assert(
    badFamily.unknowns.some((row) => row.field === 'need.family' && row.reason === 'not_a_role_family'),
    'unknown family recorded',
  );
  assert(!ROLE_FAMILY_SET.has(badFamily.need.family), 'did not invent a family');

  // 3. unknown company packet → status unknown, no fixture website in JSON company/roles.
  const absentPacket = buildCompanyPacket({
    companyId: 'yc:nope',
    map,
    ledger,
    signals: null,
    benchmark,
  });
  const absent = fillHiringTicket({ packet: absentPacket, need: { family: 'engineering' } });
  assert(absent.status === 'unknown', 'unknown status');
  assert(absent.company === null, 'unknown company null');
  assert(absent.roles.length === 0 && absent.journal.length === 0 && absent.peers.length === 0, 'unknown empty arrays');
  assert(absent.authority === TICKET_AUTHORITY, 'unknown authority');
  const absentJson = JSON.stringify(absent);
  assert(!absentJson.includes('acme.example'), 'unknown json has no fixture website');
  assert(!absentJson.includes('https://www.acme.example/'), 'unknown json has no website url');
  assert(!absentJson.includes('Staff Engineer'), 'unknown json has no fixture role');
  assert(!absentJson.includes('boards.greenhouse.io/acme'), 'unknown json has no fixture board');
  assert(absent.memoMarkdown.includes('was not found'), 'unknown memo');
  assert(!absent.memoMarkdown.includes('acme.example'), 'unknown memo no website');

  // 4. blanks always empty — never copy ATS text into must-haves.
  for (const ticket of [eng, badFamily, absent]) {
    assert(ticket.blanks.outcome90d === null, 'outcome90d blank');
    assert(Array.isArray(ticket.blanks.mustHaves) && ticket.blanks.mustHaves.length === 0, 'mustHaves blank');
    assert(!ticket.blanks.mustHaves.some((row) => JSON.stringify(row).includes('Staff')), 'no ATS in mustHaves');
  }
  assert(EMPTY_BLANKS.mustHaves.length === 0 && EMPTY_BLANKS.outcome90d === null, 'empty blanks constant');

  // 5. no score key; authority review_only.
  for (const ticket of [eng, badFamily, absent]) {
    assert(!Object.hasOwn(ticket, 'score'), 'no score key');
    assert(ticket.authority === 'review_only', 'authority literal');
    const dumped = JSON.stringify(ticket);
    assert(!/"score"\s*:/.test(dumped), 'json has no score key');
  }

  // 6. quarantine → roles [] (journal/peers empty; hiring still quarantined).
  const quarantinedPacket = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger,
    signals: null,
    signalsMissing: true,
    benchmark,
    catalog: {
      companies: [{
        id: 'yc:acme',
        quarantineHiring: true,
        fields: benchmark.companies[0].fields,
      }],
    },
    today: '2026-08-14',
  });
  const quarantined = fillHiringTicket({ packet: quarantinedPacket, need: { family: 'engineering' } });
  assert(quarantined.status === 'ok', 'quarantine is a known company');
  assert(quarantined.roles.length === 0, 'quarantine roles empty');
  assert(quarantined.journal.length === 0, 'quarantine journal empty');
  assert(quarantined.peers.length === 0, 'quarantine peers empty');
  assert(quarantined.company?.hiring?.status === 'quarantined', 'hiring still quarantined');
  assert(quarantined.blanks.outcome90d === null && quarantined.blanks.mustHaves.length === 0, 'quarantine blanks empty');
  assert(quarantined.authority === TICKET_AUTHORITY, 'quarantine authority');
  assert(!Object.hasOwn(quarantined, 'score'), 'quarantine no score');
  assert(quarantined.memoMarkdown.includes('quarantined'), 'quarantine memo');

  // titleHint is case-insensitive substring on title; AND with family.
  const hinted = fillHiringTicket({
    packet: knownPacket,
    need: { family: 'engineering', titleHint: 'STAFF' },
  });
  assert(hinted.roles.length === 1 && hinted.roles[0].title === 'Staff Engineer', 'titleHint keeps staff');
  const missHint = fillHiringTicket({
    packet: knownPacket,
    need: { family: 'engineering', titleHint: 'nobody-has-this' },
  });
  assert(missHint.roles.length === 0, 'titleHint can empty the list');

  // Cap 10, lastSeen desc then title. Neither family nor hint → all open.
  const manyLedger = { ...ledger, roles: { ...ledger.roles } };
  for (let i = 10; i <= 22; i++) {
    manyLedger.roles[`Greenhouse|acme|cap${i}`] = {
      provider: 'Greenhouse',
      slug: 'acme',
      jobId: `cap${i}`,
      company: 'Acme',
      title: `Open Role ${String(i).padStart(2, '0')}`,
      location: 'San Francisco',
      url: `https://boards.greenhouse.io/acme/jobs/cap${i}`,
      firstSeen: '2026-08-01',
      lastSeen: '2026-08-12',
      closedAt: null,
    };
  }
  const manyPacket = buildCompanyPacket({
    companyId: 'yc:acme',
    map,
    ledger: manyLedger,
    signals: null,
    signalsMissing: true,
    benchmark,
    catalog: {},
    today: '2026-08-14',
  });
  const capped = fillHiringTicket({ packet: manyPacket, need: {} });
  assert(capped.roles.length === 10, `uncapped open roles sliced to 10, got ${capped.roles.length}`);
  assert(capped.roles[0].title === 'Staff Engineer', 'sort lastSeen desc puts newest first');
  assert(capped.need.family === null && capped.need.titleHint === null, 'omitted need is nulls');

  // Source / import canaries — no RolePacket write, no score, no send/CRM.
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const surface = here.split('function selftest')[0] || here;
  assert(!/demigod-role-packet/.test(surface), 'ticket does not import role-packet');
  assert(!/DEMIGOD-ROLE-PACKETS/.test(surface), 'ticket surface does not name RolePackets store');
  assert(!/\bscoreMatch\s*\(/.test(surface), 'ticket never calls scoreMatch');
  assert(!/\bupsertPacket\s*\(/.test(surface), 'ticket never upserts a RolePacket');
  assert(!/\bsend\s*\(/.test(surface), 'ticket does not send');
  assert(!/RecruitAI/.test(surface), 'ticket does not name RecruitAI');
  assert(surface.includes("authority: TICKET_AUTHORITY") || surface.includes("authority: 'review_only'"), 'authority literal');
  assert(surface.includes('outcome90d: null') && surface.includes('mustHaves: []'), 'blanks stay empty in source');

  const packetsPath = path.join(ROOT, 'DEMIGOD-ROLE-PACKETS.json');
  const before = fingerprint(packetsPath);
  const selfPath = fileURLToPath(import.meta.url);
  const imp = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import ${JSON.stringify(selfPath)}`],
    { encoding: 'utf8', timeout: 15000 },
  );
  assert(imp.status === 0, `import exit ${imp.status}: ${imp.stderr || ''}`);
  const shown = spawnSync(
    process.execPath,
    [selfPath, 'show', '--id=yc:hiring-ticket-selftest-absent', '--family=engineering'],
    { encoding: 'utf8', timeout: 30000, env: process.env },
  );
  assert(shown.status === 0, `show exit ${shown.status}: ${shown.stderr || ''}`);
  const shownTicket = JSON.parse(shown.stdout);
  assert(shownTicket.status === 'unknown', 'show unknown id');
  assert(shownTicket.authority === TICKET_AUTHORITY, 'show authority');
  assert(shownTicket.company === null && shownTicket.roles.length === 0, 'show invents nothing');
  const after = fingerprint(packetsPath);
  if (before) {
    assert(after != null, 'RolePackets still present');
    assert(after.hash === before.hash, 'show must not change RolePackets hash');
    assert(after.mtimeMs === before.mtimeMs, 'show must not change RolePackets mtime');
    assert(after.size === before.size, 'show must not change RolePackets size');
  } else {
    assert(!fs.existsSync(packetsPath), 'show must not create RolePackets');
  }

  console.log(JSON.stringify({ ok: true, selftest: 'hiring-ticket' }));
}

function show(companyId, family, titleHint) {
  if (!companyId) {
    console.error('usage: node demigod-hiring-ticket.mjs show --id=yc:… [--family=engineering] [--title-hint=…]');
    process.exit(2);
  }
  let packet;
  try {
    packet = buildCompanyPacket({ companyId, ...loadPacketInputs() });
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      console.error(JSON.stringify({
        schema: TICKET_SCHEMA,
        status: 'unknown',
        companyId,
        error: 'duplicate_company_id',
        authority: TICKET_AUTHORITY,
      }));
      process.exit(1);
    }
    throw error;
  }
  const ticket = fillHiringTicket({
    packet,
    need: {
      ...(family != null && family !== '' ? { family } : {}),
      ...(titleHint != null && titleHint !== '' ? { titleHint } : {}),
    },
  });
  console.log(JSON.stringify(ticket, null, 2));
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'show') {
      show(argValue('--id'), argValue('--family'), argValue('--title-hint'));
    } else {
      console.error('usage: node demigod-hiring-ticket.mjs --selftest | show --id=yc:… [--family=engineering] [--title-hint=…]');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
