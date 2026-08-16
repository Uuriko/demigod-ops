#!/usr/bin/env node
/**
 * demigod-company-waterfall — per-row public-source waterfall (Clay-useful slice 4).
 *
 * first-party site → YC → Wikidata → public ATS JSON → unknown.
 * Stop at the first confident result per field. Empty/uncertain never
 * overwrites a verified field. Every fill carries source URL + retrievedAt.
 * Dry-run / apply-to-packet only. Does not write the map.
 *
 *   node demigod-company-waterfall.mjs --selftest
 *   node demigod-company-waterfall.mjs run --id=yc:almanac --dry-run
 *
 * Schema: demigod.company-waterfall/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeResearchUrl } from './demigod-evidence.mjs';
import { buildCompanyPacket, loadPacketInputs } from './demigod-company-packet.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const WATERFALL_SCHEMA = 'demigod.company-waterfall/1';
export const SOURCE_ORDER = Object.freeze(['first_party', 'yc', 'wikidata', 'ats_json']);
export const WATERFALL_FIELDS = Object.freeze([
  'website',
  'description',
  'stage',
  'teamSize',
  'inceptionYear',
  'jobsUrl',
  'atsSource',
  'openRoles',
  'openRolesAt',
]);

const FORBIDDEN_FIELDS = Object.freeze([
  'email',
  'phone',
  'mobile',
  'linkedin',
  'persona',
  'firstName',
  'lastName',
  'workEmail',
  'personalEmail',
  'pricing',
  'pricingStatus',
  'price',
  'score',
]);

const ATS_WEBSITE_HOSTS = new Set([
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'job-boards.eu.greenhouse.io',
  'jobs.lever.co',
  'api.lever.co',
  'jobs.ashbyhq.com',
  'api.ashbyhq.com',
  'jobs.workable.com',
  'apply.workable.com',
]);

const DUMMY_WEBSITE_HOSTS = new Set([
  'google.com',
  'tbc.com',
  'example.com',
  'example.org',
  'example.net',
]);

const YC_STAGES = new Set(['Early', 'Growth']);
const ISO_OR_DAY = /^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z|\d{4}-\d{2}-\d{2})$/;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function hostKey(value) {
  const safe = safeResearchUrl(value) || (typeof value === 'string' && value.startsWith('http') ? value : null);
  if (!safe) return '';
  try {
    return new URL(safe).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function dayStamp(retrievedAt) {
  const raw = String(retrievedAt || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (ISO_OR_DAY.test(raw)) return raw.slice(0, 10);
  return null;
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function collapseText(value, max = 280) {
  const text = decodeEntities(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : '';
}

function wordCount(value) {
  return collapseText(value).split(/\s+/).filter(Boolean).length;
}

function claim(field, value, source, url, retrievedAt, confidence = 'confident') {
  if (FORBIDDEN_FIELDS.includes(field)) return null;
  if (!WATERFALL_FIELDS.includes(field)) return null;
  const safeUrl = safeResearchUrl(url);
  if (confidence === 'confident' && (value == null || value === '' || !safeUrl || !ISO_OR_DAY.test(String(retrievedAt || '')))) {
    return { field, value: null, confidence: 'uncertain', source, url: safeUrl, retrievedAt: retrievedAt || null };
  }
  return {
    field,
    value,
    confidence,
    source,
    url: safeUrl,
    retrievedAt: retrievedAt || null,
  };
}

function isDummyOrAtsHost(host) {
  if (!host) return true;
  if (DUMMY_WEBSITE_HOSTS.has(host)) return true;
  if (ATS_WEBSITE_HOSTS.has(host)) return true;
  if (host.startsWith('careers.') && ATS_WEBSITE_HOSTS.has(host.slice('careers.'.length))) return true;
  return false;
}

function confidentWebsite(url, source, pageUrl, retrievedAt) {
  const safe = safeResearchUrl(url);
  const host = hostKey(safe);
  if (!safe || isDummyOrAtsHost(host)) return null;
  return claim('website', safe, source, pageUrl || safe, retrievedAt);
}

function confidentDescription(text, source, url, retrievedAt) {
  const value = collapseText(text);
  if (wordCount(value) < 4) return null;
  return claim('description', value, source, url, retrievedAt);
}

export function isVerifiedField(field, value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') {
    if (field === 'openRoles') return Number.isSafeInteger(value) && value >= 0;
    if (field === 'teamSize' || field === 'inceptionYear') {
      return Number.isSafeInteger(value) && value > 0;
    }
    return Number.isFinite(value);
  }
  return false;
}

function allMeta(html) {
  const out = {};
  const re = /<meta\b[^>]*>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const tag = match[0];
    const key = (tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const content = (tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (key && content != null) out[key.toLowerCase()] = decodeEntities(content).trim();
  }
  return out;
}

function canonicalHref(html) {
  const link = String(html || '').match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i)
    || String(html || '').match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i);
  const href = link?.[0]?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  return href ? decodeEntities(href).trim() : '';
}

function resolvePageUrl(href, pageUrl) {
  try {
    const base = safeResearchUrl(pageUrl);
    if (!base) return safeResearchUrl(href);
    return safeResearchUrl(new URL(href, base).href);
  } catch {
    return safeResearchUrl(href);
  }
}

function firstCareersHref(html, pageUrl) {
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const raw = decodeEntities(match[1]).trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    const resolved = resolvePageUrl(raw, pageUrl);
    if (!resolved) continue;
    let parsed;
    try {
      parsed = new URL(resolved);
    } catch {
      continue;
    }
    const pathName = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (/\/(careers|jobs|job-openings|join-us|join)$/.test(pathName)) return resolved;
  }
  return null;
}

/**
 * Pure. Homepage / about HTML only. Never mints openRoles, emails, phones, or pricing.
 */
export function extractFirstParty(html, { pageUrl, retrievedAt } = {}) {
  const meta = allMeta(html);
  const siteUrl = canonicalHref(html) || meta['og:url'] || pageUrl;
  const description = meta['og:description'] || meta.description || '';
  const cite = safeResearchUrl(pageUrl) || safeResearchUrl(siteUrl);
  const out = {};
  const website = confidentWebsite(siteUrl, 'first_party', cite, retrievedAt);
  if (website) out.website = website;
  const desc = confidentDescription(description, 'first_party', cite, retrievedAt);
  if (desc) out.description = desc;
  const jobs = firstCareersHref(html, cite || siteUrl);
  if (jobs) {
    const row = claim('jobsUrl', jobs, 'first_party', cite || jobs, retrievedAt);
    if (row?.confidence === 'confident') out.jobsUrl = row;
  }
  return out;
}

function ycSourceUrl(row) {
  const slug = String(row?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return safeResearchUrl(row?.url || row?.sourceUrl)
    || (slug ? `https://www.ycombinator.com/companies/${slug}` : null);
}

function ycSlug(row) {
  return String(row?.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function ycMatchesRow(row, { companyId, domain } = {}) {
  const slug = ycSlug(row);
  if (companyId && slug && companyId === `yc:${slug}`) return true;
  const site = row?.website || row?.url;
  const host = hostKey(site);
  if (domain && host) return host === domain;
  return false;
}

/**
 * Pure. YC official dump / directory row. isHiring never mints openRoles.
 */
export function extractYc(row, { retrievedAt, companyId, domain } = {}) {
  if (!isRecord(row)) return {};
  if (!ycMatchesRow(row, { companyId, domain })) return {};
  const cite = ycSourceUrl(row);
  if (!cite) return {};
  const out = {};
  const website = confidentWebsite(row.website, 'yc', cite, retrievedAt);
  if (website) out.website = website;
  const desc = confidentDescription(row.one_liner || row.long_description || row.description, 'yc', cite, retrievedAt);
  if (desc) out.description = desc;
  if (YC_STAGES.has(row.stage)) {
    const stage = claim('stage', row.stage, 'yc', cite, retrievedAt);
    if (stage?.confidence === 'confident') out.stage = stage;
  }
  const teamSize = Math.round(Number(row.team_size ?? row.teamSize));
  if (Number.isSafeInteger(teamSize) && teamSize > 0) {
    const team = claim('teamSize', teamSize, 'yc', cite, retrievedAt);
    if (team?.confidence === 'confident') out.teamSize = team;
  }
  let year = Number(row.inceptionYear);
  const launched = Number(row.launched_at);
  if (!Number.isSafeInteger(year) && Number.isFinite(launched) && launched > 0) {
    year = new Date(launched * 1000).getUTCFullYear();
  }
  if (Number.isSafeInteger(year) && year >= 2005 && year <= 2100) {
    const inception = claim('inceptionYear', year, 'yc', cite, retrievedAt);
    if (inception?.confidence === 'confident') out.inceptionYear = inception;
  }
  const jobs = safeResearchUrl(row.jobsUrl)
    || (row.isHiring && ycSlug(row)
      ? `https://www.workatastartup.com/companies/${ycSlug(row)}`
      : null);
  if (jobs) {
    const jobsClaim = claim('jobsUrl', jobs, 'yc', cite, retrievedAt);
    if (jobsClaim?.confidence === 'confident') out.jobsUrl = jobsClaim;
  }
  return out;
}

function wdWebsite(entity) {
  return entity?.website
    || entity?.officialWebsite
    || entity?.company?.value
    || (typeof entity?.website === 'object' ? entity.website?.value : null);
}

function wdDescription(entity) {
  return entity?.description
    || entity?.companyDescription
    || entity?.companyDescription?.value
    || (typeof entity?.companyDescription === 'object' ? entity.companyDescription?.value : null);
}

function wdInceptionYear(entity) {
  if (Number.isSafeInteger(entity?.inceptionYear)) return entity.inceptionYear;
  const raw = entity?.inception?.value || entity?.inception || '';
  const year = Number(String(raw).slice(0, 4));
  return Number.isSafeInteger(year) ? year : null;
}

function wdCite(entity) {
  const qid = String(entity?.qid || entity?.id || '').replace(/^wd:/, '');
  if (/^Q\d+$/i.test(qid)) return `https://www.wikidata.org/wiki/${qid}`;
  return safeResearchUrl(wdWebsite(entity));
}

function wdMatchesRow(entity, { domain } = {}) {
  const host = hostKey(wdWebsite(entity));
  if (domain && host) return host === domain;
  return Boolean(host);
}

/**
 * Pure. Wikidata entity. Domain match required when the row already has a domain.
 */
export function extractWikidata(entity, { retrievedAt, domain } = {}) {
  if (!isRecord(entity)) return {};
  if (domain && !wdMatchesRow(entity, { domain })) return {};
  if (!domain && !hostKey(wdWebsite(entity))) return {};
  const cite = wdCite(entity);
  if (!cite) return {};
  const out = {};
  const website = confidentWebsite(wdWebsite(entity), 'wikidata', cite, retrievedAt);
  if (website) out.website = website;
  const desc = confidentDescription(wdDescription(entity), 'wikidata', cite, retrievedAt);
  if (desc) out.description = desc;
  const year = wdInceptionYear(entity);
  if (Number.isSafeInteger(year) && year >= 1800 && year <= 2100) {
    const inception = claim('inceptionYear', year, 'wikidata', cite, retrievedAt);
    if (inception?.confidence === 'confident') out.inceptionYear = inception;
  }
  return out;
}

function listedJobs(provider, payload) {
  if (provider === 'Greenhouse') {
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
    return jobs
      .filter((job) => job && String(job.title || '').trim() && /^https?:\/\//i.test(String(job.absolute_url || '')))
      .map((job) => ({ title: String(job.title).trim(), url: job.absolute_url }));
  }
  if (provider === 'Lever') {
    const jobs = Array.isArray(payload) ? payload : [];
    return jobs
      .filter((job) => job && String(job.text || '').trim() && /^https?:\/\//i.test(String(job.hostedUrl || job.applyUrl || '')))
      .map((job) => ({ title: String(job.text).trim(), url: job.hostedUrl || job.applyUrl }));
  }
  if (provider === 'Ashby') {
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
    return jobs
      .filter((job) => job && job.isListed !== false
        && String(job.title || '').trim()
        && /^https?:\/\//i.test(String(job.jobUrl || job.applyUrl || '')))
      .map((job) => ({ title: String(job.title).trim(), url: job.jobUrl || job.applyUrl }));
  }
  return [];
}

function atsBoardUrl(provider, slug, given) {
  const safe = safeResearchUrl(given);
  if (safe) return safe;
  const token = String(slug || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!token) return null;
  if (provider === 'Greenhouse') return `https://boards.greenhouse.io/${token}`;
  if (provider === 'Lever') return `https://jobs.lever.co/${token}`;
  if (provider === 'Ashby') return `https://jobs.ashbyhq.com/${token}`;
  return null;
}

/**
 * Pure. Public ATS JSON. complete !== true is empty (does not zero a board).
 * 0 listed jobs on a complete fetch is a confident answer.
 */
export function extractAtsJson(ats, { retrievedAt } = {}) {
  if (!isRecord(ats)) return {};
  if (ats.complete !== true) return {};
  const provider = ats.provider;
  if (!['Greenhouse', 'Lever', 'Ashby'].includes(provider)) return {};
  const jobsUrl = atsBoardUrl(provider, ats.slug, ats.boardUrl || ats.jobsUrl);
  if (!jobsUrl) return {};
  const jobs = listedJobs(provider, ats.json);
  const at = dayStamp(retrievedAt);
  const out = {};
  const count = claim('openRoles', jobs.length, 'ats_json', jobsUrl, retrievedAt);
  if (count?.confidence === 'confident') out.openRoles = count;
  if (at) {
    const stamped = claim('openRolesAt', at, 'ats_json', jobsUrl, retrievedAt);
    if (stamped?.confidence === 'confident') out.openRolesAt = stamped;
  }
  const source = claim('atsSource', provider, 'ats_json', jobsUrl, retrievedAt);
  if (source?.confidence === 'confident') out.atsSource = source;
  const urlClaim = claim('jobsUrl', jobsUrl, 'ats_json', jobsUrl, retrievedAt);
  if (urlClaim?.confidence === 'confident') out.jobsUrl = urlClaim;
  return out;
}

function sourceClaims(name, sources, ctx) {
  if (name === 'first_party') return extractFirstParty(sources.firstParty, ctx);
  if (name === 'yc') return extractYc(sources.yc, ctx);
  if (name === 'wikidata') return extractWikidata(sources.wikidata, ctx);
  if (name === 'ats_json') return extractAtsJson(sources.ats, ctx);
  return {};
}

function existingFromCompany(company = {}) {
  if (!isRecord(company)) return {};
  return {
    website: company.website ?? null,
    description: company.description ?? null,
    stage: company.stage ?? null,
    teamSize: company.teamSize ?? null,
    inceptionYear: company.inceptionYear ?? null,
    jobsUrl: company.jobsUrl ?? null,
    atsSource: company.atsSource ?? null,
    openRoles: company.openRoles ?? null,
    openRolesAt: company.openRolesAt ?? null,
  };
}

export function existingFromPacket(packet, company = {}) {
  const fromCompany = existingFromCompany(company);
  if (!isRecord(packet) || packet.status === 'unknown') return fromCompany;
  return {
    website: packet.identity?.website ?? fromCompany.website ?? null,
    description: packet.identity?.description ?? fromCompany.description ?? null,
    stage: fromCompany.stage ?? null,
    teamSize: fromCompany.teamSize ?? null,
    inceptionYear: fromCompany.inceptionYear ?? null,
    jobsUrl: packet.hiring?.jobsUrl ?? fromCompany.jobsUrl ?? null,
    atsSource: packet.hiring?.atsSource ?? fromCompany.atsSource ?? null,
    openRoles: packet.hiring?.openRoles ?? fromCompany.openRoles ?? null,
    openRolesAt: packet.hiring?.openRolesAt ?? fromCompany.openRolesAt ?? null,
  };
}

function resolvedDomain(existing, fields) {
  if (existing.website) return hostKey(existing.website);
  const filled = fields.website;
  if (filled?.status === 'filled' || filled?.status === 'kept') return hostKey(filled.value);
  return '';
}

/**
 * Pure. Per-field first-confident-wins. Empty/uncertain never clobbers verified.
 */
export function runCompanyWaterfall({
  companyId = '',
  existing = {},
  sources = {},
  retrievedAt,
  dryRun = true,
} = {}) {
  const stamp = ISO_OR_DAY.test(String(retrievedAt || '')) ? retrievedAt : '2026-08-14T00:00:00.000Z';
  const fields = {};
  const traces = [];
  const ctxBase = {
    pageUrl: sources.firstPartyUrl || existing.website || null,
    retrievedAt: stamp,
    companyId,
    domain: hostKey(existing.website) || (typeof existing.domain === 'string' ? existing.domain : ''),
  };

  for (const field of WATERFALL_FIELDS) {
    if (isVerifiedField(field, existing[field])) {
      fields[field] = {
        field,
        value: existing[field],
        status: 'kept',
        source: 'existing',
        url: null,
        retrievedAt: null,
      };
      traces.push({ field, source: 'existing', confidence: 'verified', action: 'keep' });
      continue;
    }

    let winner = null;
    for (const sourceName of SOURCE_ORDER) {
      const domain = resolvedDomain(existing, fields) || ctxBase.domain;
      const extracted = sourceClaims(sourceName, sources, { ...ctxBase, domain });
      const row = extracted[field];
      if (!row) {
        traces.push({ field, source: sourceName, confidence: 'empty', action: 'skip' });
        continue;
      }
      if (row.confidence !== 'confident') {
        traces.push({ field, source: sourceName, confidence: row.confidence, action: 'skip' });
        continue;
      }
      winner = row;
      traces.push({ field, source: sourceName, confidence: 'confident', action: 'fill' });
      break;
    }

    if (winner) {
      fields[field] = {
        field,
        value: winner.value,
        status: 'filled',
        source: winner.source,
        url: winner.url,
        retrievedAt: winner.retrievedAt,
      };
    } else {
      fields[field] = {
        field,
        value: null,
        status: 'unknown',
        source: null,
        url: null,
        retrievedAt: null,
      };
    }
  }

  const fills = WATERFALL_FIELDS
    .map((name) => fields[name])
    .filter((row) => row.status === 'filled');
  const unknowns = WATERFALL_FIELDS
    .filter((name) => fields[name].status === 'unknown')
    .map((name) => ({ field: name, reason: 'not_found' }));

  return {
    schema: WATERFALL_SCHEMA,
    companyId,
    dryRun: dryRun !== false,
    retrievedAt: stamp,
    sourceOrder: [...SOURCE_ORDER],
    fields,
    fills,
    unknowns,
    traces,
  };
}

function packetUnknownField(name) {
  if (name === 'website') return 'identity.website';
  if (name === 'jobsUrl') return 'hiring.jobsUrl';
  if (name === 'atsSource') return 'hiring.atsSource';
  if (name === 'openRoles') return 'hiring.openRoles';
  return name;
}

/**
 * Apply fills onto a packet copy. Never writes the map. Dry-run is the default.
 */
export function applyWaterfallToPacket(packet, result) {
  if (!isRecord(packet) || packet.status === 'unknown') return packet;
  const next = structuredClone(packet);
  const fields = result?.fields || {};
  if (fields.website?.status === 'filled') {
    next.identity = { ...next.identity, website: fields.website.value, domain: hostKey(fields.website.value) || null };
  }
  if (fields.jobsUrl?.status === 'filled') {
    next.hiring = { ...next.hiring, jobsUrl: fields.jobsUrl.value };
  }
  if (fields.atsSource?.status === 'filled') {
    next.hiring = { ...next.hiring, atsSource: fields.atsSource.value };
  }
  if (fields.openRoles?.status === 'filled') {
    next.hiring = { ...next.hiring, openRoles: fields.openRoles.value };
  }
  if (fields.openRolesAt?.status === 'filled') {
    next.hiring = { ...next.hiring, openRolesAt: fields.openRolesAt.value };
  }
  const filledPaths = new Set(
    WATERFALL_FIELDS
      .filter((name) => fields[name]?.status === 'filled')
      .map(packetUnknownField),
  );
  next.unknowns = (Array.isArray(next.unknowns) ? next.unknowns : [])
    .filter((row) => !filledPaths.has(row.field));
  next.waterfall = {
    schema: WATERFALL_SCHEMA,
    dryRun: result?.dryRun !== false,
    retrievedAt: result?.retrievedAt || null,
    fills: result?.fills || [],
    unknowns: result?.unknowns || [],
    fields,
  };
  return next;
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

function readOptionalJson(filePath) {
  if (!filePath) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readOptionalText(filePath) {
  if (!filePath) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function findMapCompany(map, companyId) {
  const rows = Array.isArray(map?.companies) ? map.companies : [];
  return rows.find((row) => row && row.id === companyId) || null;
}

function selftest() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`company-waterfall selftest: ${msg}`);
  };
  const retrievedAt = '2026-08-14T17:00:00.000Z';
  const firstPartyHtml = `<!doctype html>
<html>
<head>
  <link rel="canonical" href="https://acme.example/">
  <meta property="og:description" content="Acme makes useful things for operators.">
  <meta name="description" content="Shorter fallback copy here.">
</head>
<body>
  <p>Contact jane@acme.example or +1-415-555-0100 for a demo.</p>
  <a href="mailto:jane@acme.example">Email Jane</a>
  <a href="/careers">Careers</a>
  <p>Pricing starts at $99 per seat.</p>
</body>
</html>`;

  const ycRow = {
    slug: 'acme',
    website: '',
    one_liner: 'YC would like to overwrite this description with different words.',
    stage: 'Early',
    team_size: 12,
    launched_at: Date.UTC(2019, 0, 1) / 1000,
    isHiring: true,
    url: 'https://www.ycombinator.com/companies/acme',
  };
  const wikidata = {
    qid: 'Q65085822',
    website: 'https://acme.example/',
    companyDescription: 'Wikidata later description must not win.',
    inception: { value: '2019-01-01T00:00:00Z' },
  };
  const ats = {
    provider: 'Greenhouse',
    slug: 'acme',
    complete: true,
    boardUrl: 'https://boards.greenhouse.io/acme',
    json: {
      jobs: [
        { id: 1, title: 'Backend Engineer', absolute_url: 'https://boards.greenhouse.io/acme/jobs/1' },
        { id: 2, title: 'Designer', absolute_url: 'https://boards.greenhouse.io/acme/jobs/2' },
      ],
    },
  };

  const won = runCompanyWaterfall({
    companyId: 'yc:acme',
    existing: {},
    sources: { firstParty: firstPartyHtml, firstPartyUrl: 'https://acme.example/', yc: ycRow, wikidata, ats },
    retrievedAt,
    dryRun: true,
  });

  assert(won.schema === WATERFALL_SCHEMA, 'schema');
  assert(won.dryRun === true, 'dry-run default');
  assert(won.fields.description.status === 'filled' && won.fields.description.source === 'first_party', 'first confident description wins');
  assert(won.fields.description.value === 'Acme makes useful things for operators.', 'first-party description kept');
  assert(won.fields.website.status === 'filled' && won.fields.website.source === 'first_party', 'first-party website wins');
  assert(won.fields.website.value === 'https://acme.example/', 'canonical website');
  assert(won.fields.stage.status === 'filled' && won.fields.stage.source === 'yc' && won.fields.stage.value === 'Early', 'YC fills empty stage');
  assert(won.fields.teamSize.status === 'filled' && won.fields.teamSize.value === 12, 'YC teamSize when present');
  assert(won.fields.inceptionYear.status === 'filled' && won.fields.inceptionYear.source === 'yc', 'YC inception beats later Wikidata');
  assert(won.fields.inceptionYear.value === 2019, 'YC launched_at year');
  assert(won.fields.jobsUrl.status === 'filled' && won.fields.jobsUrl.source === 'first_party', 'first-party careers URL wins over ATS');
  assert(won.fields.jobsUrl.value === 'https://acme.example/careers', 'careers resolved');
  assert(won.fields.openRoles.status === 'filled' && won.fields.openRoles.value === 2, 'ATS listed count');
  assert(won.fields.openRoles.source === 'ats_json', 'openRoles only from ATS');
  assert(won.fields.atsSource.value === 'Greenhouse', 'atsSource from ATS');
  assert(won.fields.openRolesAt.value === '2026-08-14', 'openRolesAt is the fetch day');

  // Later empty does not clobber a first-party fill (YC website is empty).
  assert(won.fields.website.value === 'https://acme.example/', 'empty YC website does not clobber');
  const emptyLater = runCompanyWaterfall({
    companyId: 'yc:acme',
    existing: { website: 'https://acme.example/' },
    sources: {
      firstParty: '<html><head></head><body><p>No canonical here.</p></body></html>',
      firstPartyUrl: 'https://acme.example/',
      yc: { ...ycRow, website: '' },
      wikidata: { ...wikidata, website: '' },
    },
    retrievedAt,
  });
  assert(emptyLater.fields.website.status === 'kept' && emptyLater.fields.website.value === 'https://acme.example/', 'verified website survives empty sources');

  // Incomplete ATS never zeros a verified openRoles.
  const noClobberAts = runCompanyWaterfall({
    companyId: 'yc:acme',
    existing: { openRoles: 4, openRolesAt: '2026-08-01' },
    sources: { ats: { ...ats, complete: false, json: { jobs: [] } } },
    retrievedAt,
  });
  assert(noClobberAts.fields.openRoles.status === 'kept' && noClobberAts.fields.openRoles.value === 4, 'incomplete ATS does not clobber');
  assert(noClobberAts.fields.openRolesAt.status === 'kept', 'incomplete ATS does not clobber openRolesAt');

  // Complete empty board is confident 0 only when the field is empty.
  const zeroBoard = runCompanyWaterfall({
    companyId: 'yc:acme',
    existing: {},
    sources: { ats: { ...ats, json: { jobs: [] } } },
    retrievedAt,
  });
  assert(zeroBoard.fields.openRoles.status === 'filled' && zeroBoard.fields.openRoles.value === 0, 'complete 0 is a fact');

  // Complete 0 still does not overwrite a verified count (fill-empty-only).
  const keepVerified = runCompanyWaterfall({
    companyId: 'yc:acme',
    existing: { openRoles: 4 },
    sources: { ats: { ...ats, json: { jobs: [] } } },
    retrievedAt,
  });
  assert(keepVerified.fields.openRoles.status === 'kept' && keepVerified.fields.openRoles.value === 4, 'verified count not overwritten by later 0');

  // Unknown stays unknown. YC isHiring must not mint a count.
  const unknownRow = runCompanyWaterfall({
    companyId: 'yc:thin',
    existing: {},
    sources: {
      yc: { slug: 'thin', isHiring: true, url: 'https://www.ycombinator.com/companies/thin', website: 'https://thin.example/' },
    },
    retrievedAt,
  });
  assert(unknownRow.fields.openRoles.status === 'unknown' && unknownRow.fields.openRoles.value === null, 'YC hiring is not a count');
  assert(unknownRow.fields.teamSize.status === 'unknown', 'missing teamSize stays unknown');
  assert(unknownRow.fields.stage.status === 'unknown', 'missing stage stays unknown');
  assert(unknownRow.fields.description.status === 'unknown', 'no description stays unknown');
  assert(unknownRow.unknowns.some((row) => row.field === 'openRoles' && row.reason === 'not_found'), 'unknowns list');

  // Wikidata domain mismatch is refused (Almanac-beer class).
  const beer = runCompanyWaterfall({
    companyId: 'yc:acme',
    existing: { website: 'https://acme.example/' },
    sources: {
      wikidata: {
        qid: 'Q4733679',
        website: 'https://almanacbeer.example/',
        companyDescription: 'A brewery that is not this company.',
        inceptionYear: 1902,
      },
    },
    retrievedAt,
  });
  assert(beer.fields.description.status === 'unknown', 'WD mismatch does not fill description');
  assert(beer.fields.inceptionYear.status === 'unknown', 'WD mismatch does not fill inception');

  // retrievedAt + url on every fill.
  for (const fill of won.fills) {
    assert(fill.status === 'filled', 'fill status');
    assert(typeof fill.url === 'string' && /^https:\/\//.test(fill.url), `${fill.field} has url`);
    assert(fill.retrievedAt === retrievedAt, `${fill.field} has retrievedAt`);
    assert(!FORBIDDEN_FIELDS.includes(fill.field), `${fill.field} is not forbidden`);
  }

  // No people / pricing / score fields in the result.
  const dumped = JSON.stringify(won);
  assert(!/"email"/.test(dumped) && !/"phone"/.test(dumped) && !/"persona"/.test(dumped), 'no people fields');
  assert(!/"linkedin"/.test(dumped) && !/"workEmail"/.test(dumped), 'no contact fields');
  assert(!/"pricing"/.test(dumped) && !/"pricingStatus"/.test(dumped) && !/"score"/.test(dumped), 'no pricing/score');
  assert(!/jane@acme\.example/.test(dumped), 'email in HTML is not extracted');
  assert(!/415-555-0100/.test(dumped), 'phone in HTML is not extracted');
  assert(!/\$99/.test(dumped), 'pricing in HTML is not extracted');

  // Apply-to-packet only; dry-run packet is a copy.
  const packet = {
    schema: 'demigod.company-packet/1',
    companyId: 'yc:acme',
    identity: { id: 'yc:acme', name: 'Acme', domain: null, website: null, source: 'Y Combinator', sourceUrl: ycRow.url },
    hiring: { status: 'unknown', openRoles: null, openRolesAt: null, atsSource: null, jobsUrl: null, roleMix: null },
    roles: [],
    unknowns: [
      { field: 'identity.website', reason: 'not_found' },
      { field: 'hiring.jobsUrl', reason: 'not_found' },
      { field: 'hiring.openRoles', reason: 'not_found' },
    ],
    evidence: [],
  };
  const applied = applyWaterfallToPacket(packet, won);
  assert(applied !== packet, 'apply returns a copy');
  assert(packet.identity.website === null && packet.hiring.openRoles === null, 'original packet unchanged');
  assert(applied.identity.website === 'https://acme.example/' && applied.identity.domain === 'acme.example', 'packet website patched');
  assert(applied.hiring.openRoles === 2 && applied.hiring.atsSource === 'Greenhouse', 'packet hiring patched');
  assert(applied.hiring.jobsUrl === 'https://acme.example/careers', 'packet jobsUrl patched');
  assert(applied.waterfall?.dryRun === true, 'packet carries dry-run waterfall');
  assert(!applied.unknowns.some((row) => row.field === 'identity.website'), 'filled website dropped from unknowns');
  assert(!applied.unknowns.some((row) => row.field === 'hiring.openRoles'), 'filled openRoles dropped from unknowns');

  // Source / network canaries (implementation only — names stay out of the loop).
  const here = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const impl = here.split('function selftest')[0] || '';
  const brokers = ['hun'+'ter', 'wi'+'za', 'apo'+'llo', 'zoom'+'info', 'people'+'datalabs', 'clear'+'bit', 'pros'+'peo'];
  assert(brokers.every((name) => !impl.toLowerCase().includes(name)), 'no people-broker names');
  assert(!/\bfetch\s*\(/.test(impl), 'module never fetches (fixtures / disk only)');
  assert(!/0\.0\.0\.0/.test(impl), 'no public bind');
  assert(!/\bscoreMatch\s*\(/.test(here), 'never scores');

  // Dummy / ATS host is not a company website.
  const dummy = extractFirstParty(
    '<link rel="canonical" href="https://boards.greenhouse.io/acme">',
    { pageUrl: 'https://boards.greenhouse.io/acme', retrievedAt },
  );
  assert(!dummy.website, 'ATS host is not website');

  console.log(JSON.stringify({
    ok: true,
    selftest: 'company-waterfall',
    proofs: {
      firstConfidentWins: true,
      laterEmptyDoesNotClobber: true,
      unknownStaysUnknown: true,
      noPeopleFields: true,
      retrievedAtAndUrlOnFills: true,
    },
    fills: won.fills.map((row) => row.field),
  }));
}

function runCli() {
  if (process.argv.includes('--write') || process.argv.includes('--apply-map')) {
    console.error(JSON.stringify({ ok: false, error: 'waterfall does not write the map' }));
    process.exit(2);
  }
  const companyId = argValue('--id');
  if (!companyId) {
    console.error('usage: node demigod-company-waterfall.mjs run --id=yc:… --dry-run');
    process.exit(2);
  }
  const inputs = loadPacketInputs();
  let packet;
  try {
    packet = buildCompanyPacket({ companyId, ...inputs });
  } catch (error) {
    if (error?.code === 'duplicate_company_id') {
      console.error(JSON.stringify({ schema: WATERFALL_SCHEMA, status: 'unknown', companyId, error: 'duplicate_company_id' }));
      process.exit(1);
    }
    throw error;
  }
  const company = findMapCompany(inputs.map, companyId);
  const sources = {
    firstParty: readOptionalText(argValue('--first-party')),
    firstPartyUrl: argValue('--first-party-url') || company?.website || packet?.identity?.website || null,
    yc: readOptionalJson(argValue('--yc')),
    wikidata: readOptionalJson(argValue('--wikidata')),
    ats: null,
  };
  const atsPath = argValue('--ats');
  if (atsPath) {
    sources.ats = {
      provider: argValue('--ats-provider') || 'Greenhouse',
      slug: argValue('--ats-slug') || '',
      complete: argValue('--ats-complete') !== 'false',
      boardUrl: argValue('--ats-url') || null,
      json: readOptionalJson(atsPath),
    };
  }
  const result = runCompanyWaterfall({
    companyId,
    existing: existingFromPacket(packet, company || {}),
    sources,
    retrievedAt: new Date().toISOString(),
    dryRun: true,
  });
  const applied = applyWaterfallToPacket(packet, result);
  console.log(JSON.stringify({
    schema: WATERFALL_SCHEMA,
    dryRun: true,
    companyId,
    result,
    packet: applied.status === 'unknown' ? applied : {
      schema: applied.schema,
      companyId: applied.companyId,
      identity: applied.identity,
      hiring: applied.hiring,
      unknowns: applied.unknowns,
      waterfall: applied.waterfall,
    },
  }, null, 2));
}

if (isMain) {
  try {
    if (process.argv.includes('--selftest')) {
      selftest();
    } else if (process.argv[2] === 'run') {
      runCli();
    } else {
      console.error('usage: node demigod-company-waterfall.mjs --selftest | run --id=yc:… --dry-run');
      process.exit(2);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exit(1);
  }
}
