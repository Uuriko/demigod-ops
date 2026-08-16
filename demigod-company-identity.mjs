#!/usr/bin/env node
/**
 * demigod-company-identity — domain-first entity resolution (Clay-useful slice 5).
 *
 * Company key is the registrable domain (TLD kept). Name is a label only.
 * Fail closed: dummy / shared / ATS hosts are not identity; unknown stays
 * unknown; same name + different domain stay split. Does not write the map.
 *
 *   node demigod-company-identity.mjs --selftest
 *   node demigod-company-identity.mjs resolve --id=yc:almanac
 *
 * Schema: demigod.company-identity/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeResearchUrl } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const IDENTITY_SCHEMA = 'demigod.company-identity/1';

/** Shared ATS platforms — host or registrable parent is never a company key. */
const ATS_PLATFORMS = new Set([
  'ashbyhq.com',
  'greenhouse.io',
  'lever.co',
  'workable.com',
  'gem.com',
  'myworkdayjobs.com',
  'smartrecruiters.com',
  'recruitee.com',
  'personio.de',
  'personio.com',
]);

const ATS_HOSTS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'job-boards.eu.greenhouse.io',
  'boards-api.greenhouse.io',
  'jobs.lever.co',
  'api.lever.co',
  'api.eu.lever.co',
  'jobs.ashbyhq.com',
  'api.ashbyhq.com',
  'jobs.workable.com',
  'apply.workable.com',
  'jobs.gem.com',
  'jobs.smartrecruiters.com',
]);

/** Dummy / shared / dead hosts that are never a company key (research 2026-08-14). */
const DUMMY_IDENTITY_HOSTS = new Set([
  'google.com',
  'tbc.com',
  'example.com',
  'example.org',
  'example.net',
  'afriexapp.com',
]);

const MULTI_PART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'co.jp',
  'co.kr',
  'co.in',
  'co.za',
  'com.br',
  'com.mx',
  'com.sg',
  'com.hk',
  'com.tw',
  'com.ar',
  'com.co',
]);

const CAREERS_PREFIX = /^(careers|jobs|job|jobs-eu|apply|boards)$/i;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function hostKey(value) {
  const safe = safeResearchUrl(value);
  if (!safe) return '';
  try {
    return new URL(safe).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

/** eTLD+1. Keeps the TLD (`frame.io` ≠ `frame.com`). No name-stem. */
export function registrableFromHost(host) {
  const h = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (!h || h.includes('/') || h.includes(' ')) return '';
  const parts = h.split('.').filter(Boolean);
  if (parts.length < 2) return '';
  const last2 = parts.slice(-2).join('.');
  if (parts.length >= 3 && MULTI_PART_SUFFIXES.has(last2)) return parts.slice(-3).join('.');
  return last2;
}

export function isAtsHost(host) {
  const h = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (!h) return false;
  if (ATS_HOSTS.has(h) || ATS_PLATFORMS.has(h)) return true;
  const reg = registrableFromHost(h);
  if (reg && ATS_PLATFORMS.has(reg)) return true;
  for (const platform of ATS_PLATFORMS) {
    if (h === platform || h.endsWith(`.${platform}`)) return true;
  }
  return false;
}

export function isDummyIdentityHost(host) {
  const h = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (!h) return true;
  if (DUMMY_IDENTITY_HOSTS.has(h)) return true;
  const reg = registrableFromHost(h);
  return Boolean(reg && DUMMY_IDENTITY_HOSTS.has(reg));
}

function isCareersOnlyHost(host, domain) {
  if (!host || !domain || host === domain) return false;
  if (!host.endsWith(`.${domain}`)) return false;
  const prefix = host.slice(0, -(domain.length + 1));
  return CAREERS_PREFIX.test(prefix) && !prefix.includes('.');
}

/**
 * Classify a URL as first-party website, first-party careers, ATS jobs board,
 * dummy/shared host, or unknown. ATS / dummy never yield an identity domain.
 */
export function classifyUrl(value) {
  const safe = safeResearchUrl(value);
  if (!safe) return { kind: 'unknown', host: '', domain: null, url: null };
  const host = hostKey(safe);
  if (!host) return { kind: 'unknown', host: '', domain: null, url: null };
  if (isAtsHost(host)) return { kind: 'jobs', host, domain: null, url: safe };
  if (isDummyIdentityHost(host)) return { kind: 'dummy', host, domain: null, url: safe };
  const domain = registrableFromHost(host);
  if (!domain) return { kind: 'unknown', host, domain: null, url: safe };
  if (isAtsHost(domain) || isDummyIdentityHost(domain)) {
    return { kind: isAtsHost(domain) ? 'jobs' : 'dummy', host, domain: null, url: safe };
  }
  if (isCareersOnlyHost(host, domain)) return { kind: 'careers', host, domain, url: safe };
  return { kind: 'website', host, domain, url: safe };
}

/** Packet/table join key. Null when the website is ATS, dummy, or missing. */
export function identityDomainFromWebsite(website) {
  const classified = classifyUrl(website);
  if ((classified.kind === 'website' || classified.kind === 'careers') && classified.domain) {
    return classified.domain;
  }
  return null;
}

/**
 * Pure. Domain only from a first-party website (or its careers host).
 * jobsUrl is never an identity key. Name is ignored.
 */
export function identityFromRow(row = {}) {
  const site = classifyUrl(row?.website);
  const jobsField = classifyUrl(row?.jobsUrl);
  let domain = null;
  let website = null;
  let jobsUrl = null;
  let reason = 'not_found';

  if (site.kind === 'website' && site.domain) {
    domain = site.domain;
    website = site.url;
    reason = 'ok';
  } else if (site.kind === 'careers' && site.domain) {
    domain = site.domain;
    reason = 'ok';
    jobsUrl = site.url;
  } else if (site.kind === 'jobs') {
    jobsUrl = site.url;
    reason = 'ats_host';
  } else if (site.kind === 'dummy') {
    reason = 'dummy_host';
  }

  if (jobsField.kind === 'jobs' || jobsField.kind === 'careers') {
    jobsUrl = jobsUrl || jobsField.url;
  } else if (jobsField.kind === 'website' && jobsField.url) {
    jobsUrl = jobsUrl || jobsField.url;
  }

  return {
    id: typeof row?.id === 'string' ? row.id : null,
    name: typeof row?.name === 'string' ? row.name : '',
    domain,
    website,
    jobsUrl,
    reason: domain ? null : reason,
  };
}

function preferLabel(cluster, member) {
  const id = String(member.id || '');
  if (id.startsWith('yc:') && member.name) cluster.name = member.name;
  else if (!cluster.name && member.name) cluster.name = member.name;
}

function emptyCluster(domain) {
  return {
    domain,
    name: '',
    website: null,
    jobsUrl: null,
    members: [],
  };
}

/**
 * Fail-closed resolver. Same domain → one cluster (yc:/wd:/hn: citations).
 * Same name, different domain → stay split. No domain → unresolved, never merged.
 */
export function resolveEntities(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const seenIds = new Set();
  const byDomain = new Map();
  const unresolved = [];

  for (const row of list) {
    if (!isRecord(row)) continue;
    const id = typeof row.id === 'string' ? row.id : '';
    if (id) {
      if (seenIds.has(id)) {
        const err = new Error(`duplicate company id: ${id}`);
        err.code = 'duplicate_company_id';
        throw err;
      }
      seenIds.add(id);
    }
    const ident = identityFromRow(row);
    const member = {
      id: ident.id,
      name: ident.name,
      source: row.source || null,
      sourceUrl: row.sourceUrl || null,
    };
    if (!ident.domain) {
      unresolved.push({
        ...member,
        domain: null,
        website: null,
        jobsUrl: ident.jobsUrl,
        reason: ident.reason || 'not_found',
      });
      continue;
    }
    if (!byDomain.has(ident.domain)) byDomain.set(ident.domain, emptyCluster(ident.domain));
    const cluster = byDomain.get(ident.domain);
    cluster.members.push(member);
    preferLabel(cluster, member);
    if (!cluster.website && ident.website) cluster.website = ident.website;
    if (!cluster.jobsUrl && ident.jobsUrl) cluster.jobsUrl = ident.jobsUrl;
  }

  return {
    schema: IDENTITY_SCHEMA,
    clusters: [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain)),
    unresolved,
  };
}

export function findResolvedCluster(rows, companyId) {
  if (typeof companyId !== 'string' || !companyId.trim()) {
    return { status: 'unknown', companyId: companyId || '', cluster: null, row: null };
  }
  const resolved = resolveEntities(rows);
  for (const cluster of resolved.clusters) {
    if (cluster.members.some((member) => member.id === companyId)) {
      return { status: 'resolved', companyId, cluster, row: null };
    }
  }
  const row = resolved.unresolved.find((member) => member.id === companyId) || null;
  return { status: 'unknown', companyId, cluster: null, row };
}

function argValue(flag) {
  const hit = process.argv.find((arg) => arg === flag || arg.startsWith(`${flag}=`));
  if (!hit) return '';
  if (hit.includes('=')) return hit.slice(hit.indexOf('=') + 1);
  const idx = process.argv.indexOf(hit);
  return process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-') ? process.argv[idx + 1] : '';
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`company-identity selftest: ${msg}`);
  };

  // Registrable domain keeps the TLD. www strips. No name-stem.
  assert(identityDomainFromWebsite('https://www.bolt.com/') === 'bolt.com', 'www.bolt.com → bolt.com');
  assert(identityDomainFromWebsite('https://bolt.com') === 'bolt.com', 'bolt.com');
  assert(identityDomainFromWebsite('https://bolt.eu/') === 'bolt.eu', 'bolt.eu keeps TLD');
  assert(identityDomainFromWebsite('https://www.frame.io/') === 'frame.io', 'frame.io');
  assert(identityDomainFromWebsite('https://frame.com/') === 'frame.com', 'frame.com ≠ frame.io');
  assert(identityDomainFromWebsite('https://www.acme.example/') === 'acme.example', 'acme.example');
  assert(identityDomainFromWebsite('https://shop.example.co.uk/') === 'example.co.uk', 'multi-part TLD');
  assert(identityDomainFromWebsite('') === null, 'empty website');
  assert(identityDomainFromWebsite('not-a-url') === null, 'invalid url');

  // Dummy / shared hosts are not identity.
  for (const url of [
    'https://google.com/',
    'https://www.google.com/',
    'https://docs.google.com/x',
    'https://tbc.com/',
    'https://example.com/',
    'https://afriexapp.com/',
  ]) {
    assert(identityDomainFromWebsite(url) === null, `dummy refused: ${url}`);
    assert(classifyUrl(url).kind === 'dummy', `dummy kind: ${url}`);
  }

  // ATS / shared board hosts are jobsUrl, never website/domain.
  const atsUrls = [
    'https://ashbyhq.com/',
    'https://jobs.ashbyhq.com/acme',
    'https://api.ashbyhq.com/posting-api/job-board/acme',
    'https://greenhouse.io/',
    'https://boards.greenhouse.io/acme',
    'https://job-boards.greenhouse.io/acme',
    'https://job-boards.eu.greenhouse.io/acme',
    'https://lever.co/',
    'https://jobs.lever.co/acme',
    'https://api.lever.co/v0/postings/acme',
    'https://jobs.workable.com/acme',
  ];
  for (const url of atsUrls) {
    const classified = classifyUrl(url);
    assert(classified.kind === 'jobs', `ATS kind jobs: ${url}`);
    assert(classified.domain === null, `ATS domain null: ${url}`);
    assert(identityDomainFromWebsite(url) === null, `ATS not identity: ${url}`);
  }
  const atsRow = identityFromRow({
    id: 'hn:boards.greenhouse.io/acme',
    name: 'Acme',
    website: 'https://boards.greenhouse.io/acme',
    jobsUrl: null,
  });
  assert(atsRow.domain === null && atsRow.website === null, 'ATS website is not identity');
  assert(atsRow.jobsUrl === 'https://boards.greenhouse.io/acme', 'ATS host is jobsUrl');
  assert(atsRow.reason === 'ats_host', 'ATS reason');

  // First-party careers host yields domain for join, not a homepage.
  const careers = identityFromRow({
    id: 'hn:snowflake',
    name: 'Snowflake',
    website: 'https://careers.snowflake.com/',
  });
  assert(careers.domain === 'snowflake.com', 'careers.snowflake.com → snowflake.com');
  assert(careers.website === null, 'careers host is not website');
  assert(careers.jobsUrl === 'https://careers.snowflake.com/', 'careers URL is jobsUrl');

  // Same domain → yc + wd + hn join. Name is a label.
  const joined = resolveEntities([
    {
      id: 'yc:bolt',
      name: 'Bolt',
      website: 'https://www.bolt.com/',
      source: 'Y Combinator',
      sourceUrl: 'https://www.ycombinator.com/companies/bolt',
    },
    {
      id: 'wd:Q1',
      name: 'Bolt',
      website: 'https://bolt.com/',
      source: 'Wikidata',
      sourceUrl: 'https://www.wikidata.org/wiki/Q1',
    },
    {
      id: 'hn:bolt.com',
      name: 'Bolt',
      website: 'https://bolt.com/',
      source: 'HN',
      sourceUrl: 'https://news.ycombinator.com/item?id=1',
    },
  ]);
  assert(joined.schema === IDENTITY_SCHEMA, 'schema');
  assert(joined.clusters.length === 1 && joined.unresolved.length === 0, 'one cluster');
  assert(joined.clusters[0].domain === 'bolt.com', 'join key bolt.com');
  assert(joined.clusters[0].members.map((m) => m.id).join(',') === 'yc:bolt,wd:Q1,hn:bolt.com', 'citations');
  assert(joined.clusters[0].name === 'Bolt', 'name is a label');
  assert(joined.clusters[0].website === 'https://www.bolt.com/', 'first-party website kept');

  // Dual card: HN careers URL joins YC homepage on registrable domain.
  const dual = resolveEntities([
    { id: 'yc:snowflake', name: 'Snowflake', website: 'https://www.snowflake.com/', source: 'Y Combinator' },
    { id: 'hn:snowflake', name: 'Snowflake', website: 'https://careers.snowflake.com/', source: 'HN' },
  ]);
  assert(dual.clusters.length === 1 && dual.clusters[0].domain === 'snowflake.com', 'dual card joins on domain');
  assert(dual.clusters[0].members.length === 2, 'HN is a citation, not a second pin');
  assert(dual.clusters[0].website === 'https://www.snowflake.com/', 'homepage wins over careers');

  // Same name, different domain → stay split (Bolt / Branch / Mercury).
  const homonyms = resolveEntities([
    { id: 'yc:bolt', name: 'Bolt', website: 'https://bolt.com/' },
    { id: 'wd:bolt-eu', name: 'Bolt', website: 'https://bolt.eu/' },
    { id: 'wd:boltthreads', name: 'Bolt', website: 'https://boltthreads.com/' },
    { id: 'yc:branch', name: 'Branch', website: 'https://branch.io/' },
    { id: 'wd:branch-ins', name: 'Branch', website: 'https://branch.com/' },
    { id: 'wd:branchapp', name: 'Branch', website: 'https://branchapp.com/' },
    { id: 'yc:mercury', name: 'Mercury', website: 'https://mercury.com/' },
    { id: 'wd:mrcy', name: 'Mercury', website: 'https://mrcy.com/' },
    { id: 'wd:mercmarine', name: 'Mercury', website: 'https://mercurymarine.com/' },
  ]);
  assert(homonyms.clusters.length === 9, `homonyms stay split, got ${homonyms.clusters.length}`);
  assert(homonyms.unresolved.length === 0, 'homonyms all have domains');
  const domains = homonyms.clusters.map((c) => c.domain).sort();
  assert(domains.includes('bolt.com') && domains.includes('bolt.eu') && domains.includes('boltthreads.com'), 'Bolt split');
  assert(domains.includes('branch.io') && domains.includes('branch.com') && domains.includes('branchapp.com'), 'Branch split');
  assert(domains.includes('mercury.com') && domains.includes('mrcy.com') && domains.includes('mercurymarine.com'), 'Mercury split');
  assert(new Set(homonyms.clusters.filter((c) => c.name === 'Bolt').map((c) => c.domain)).size === 3, 'Bolt name is not a key');

  // Unknown domain stays unknown. Same name does not invent a merge.
  const unknown = resolveEntities([
    { id: 'hn:boards.greenhouse.io/alpha', name: 'Alpha', website: 'https://boards.greenhouse.io/alpha' },
    { id: 'yc:alpha', name: 'Alpha', website: null },
    { id: 'wd:Q-no-site', name: 'Alpha', website: '' },
  ]);
  assert(unknown.clusters.length === 0, 'no invented cluster');
  assert(unknown.unresolved.length === 3, 'three unknowns stay split');
  assert(unknown.unresolved.every((row) => row.domain === null), 'unknown domain is null');
  assert(unknown.unresolved[0].jobsUrl === 'https://boards.greenhouse.io/alpha', 'ATS preserved as jobsUrl');
  assert(unknown.unresolved[0].reason === 'ats_host', 'ATS unknown reason');
  assert(unknown.unresolved[1].reason === 'not_found', 'missing website unknown');

  // jobsUrl on a real website row is not the domain.
  const withJobs = identityFromRow({
    id: 'yc:acme',
    name: 'Acme',
    website: 'https://acme.example/',
    jobsUrl: 'https://jobs.ashbyhq.com/acme',
  });
  assert(withJobs.domain === 'acme.example', 'domain from website');
  assert(withJobs.website === 'https://acme.example/', 'website kept');
  assert(withJobs.jobsUrl === 'https://jobs.ashbyhq.com/acme', 'ATS stays jobsUrl');

  // Duplicate map id fails closed.
  let dupThrew = false;
  try {
    resolveEntities([
      { id: 'yc:acme', name: 'Acme', website: 'https://acme.example/' },
      { id: 'yc:acme', name: 'Acme Dup', website: 'https://acme.example/' },
    ]);
  } catch (error) {
    dupThrew = error?.code === 'duplicate_company_id';
  }
  assert(dupThrew, 'duplicate id fails closed');

  // Unknown id invents nothing.
  const missing = findResolvedCluster(
    [{ id: 'yc:acme', name: 'Acme', website: 'https://acme.example/' }],
    'yc:nope',
  );
  assert(missing.status === 'unknown' && missing.cluster === null && missing.row === null, 'unknown id');

  const found = findResolvedCluster(
    [{ id: 'yc:acme', name: 'Acme', website: 'https://www.acme.example/' }],
    'yc:acme',
  );
  assert(found.status === 'resolved' && found.cluster.domain === 'acme.example', 'known id resolves');

  // Source / network canaries.
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const impl = here.split('function selftest')[0] || '';
  assert(!/\bfetch\s*\(/.test(impl), 'module never fetches');
  assert(!/\blevenshtein\b/i.test(impl) && !/\bfuzzy\b/i.test(impl), 'no fuzzy name merge');
  assert(!/\bscoreMatch\s*\(/.test(here), 'never scores');
  const brokers = ['hun' + 'ter', 'wi' + 'za', 'apo' + 'llo', 'zoom' + 'info', 'people' + 'datalabs'];
  assert(brokers.every((name) => !impl.toLowerCase().includes(name)), 'no people-broker names');
  assert(!/0\.0\.0\.0/.test(impl), 'no public bind');

  console.log(JSON.stringify({
    ok: true,
    selftest: 'company-identity',
    proofs: {
      sameDomainJoins: true,
      homonymsStaySplit: true,
      atsHostIsJobsUrl: true,
      dummyRefused: true,
      unknownStaysUnknown: true,
      noFuzzyNameMerge: true,
    },
  }));
}

function loadMapCompanies() {
  const filePath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  try {
    const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(doc?.companies) ? doc.companies : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function resolveCli(companyId) {
  if (!companyId) {
    console.error('usage: node demigod-company-identity.mjs resolve --id=yc:…');
    process.exit(2);
  }
  let hit;
  try {
    hit = findResolvedCluster(loadMapCompanies(), companyId);
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      console.error(JSON.stringify({
        schema: IDENTITY_SCHEMA,
        status: 'unknown',
        companyId,
        error: 'duplicate_company_id',
      }));
      process.exit(1);
    }
    throw error;
  }
  console.log(JSON.stringify({
    schema: IDENTITY_SCHEMA,
    status: hit.status,
    companyId,
    cluster: hit.cluster,
    row: hit.row,
    wroteMap: false,
  }, null, 2));
}

if (isMain) {
  try {
    if (process.argv.includes('--write') || process.argv.includes('--apply-map')) {
      console.error(JSON.stringify({ ok: false, error: 'identity does not write the map' }));
      process.exit(2);
    }
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'resolve') {
      resolveCli(argValue('--id'));
    } else {
      console.error('usage: node demigod-company-identity.mjs --selftest | resolve --id=yc:…');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
