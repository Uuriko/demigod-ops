#!/usr/bin/env node
// Enrich DEMIGOD-SF-STARTUP-MAP.json companies with live job-posting counts from public ATS
// job-board APIs (Greenhouse, Lever, Ashby, Workable, Personio, Recruitee, SmartRecruiters).
// Counts only a nonempty board for a slug derived from the company domain, with reviewed
// denylist exceptions for proven same-slug collisions. Secondary providers require owner evidence.
// Location honesty: count only roles whose posted location looks US (or Remote) when the board
// exposes locations; unknown/foreign-only boards are dropped rather than mislabeled as SF hiring.
// Point-in-time: stamps openRolesAt so the listing can say "as of {date}". Run at build time.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { websiteHostKey } from './demigod-startup-map-data.mjs';
import {
  workable as fetchWorkableRoles,
  personio as fetchPersonioRoles,
  recruitee as fetchRecruiteeRoles,
  smartrecruiters as fetchSmartrecruitersRoles,
} from './demigod-ats-providers.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
// Staging rebuilds set DEMIGOD_STARTUP_MAP so a killed enrich cannot leave the live map boardless.
const MAP = process.env.DEMIGOD_STARTUP_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
export const jobsEnrichCliMode = (args) =>
  args.length === 0
    ? 'enrich'
    : args.length === 1 && ['--selftest', '--repair-denied'].includes(args[0])
      ? args[0].slice(2)
      : null;
const cliMode = jobsEnrichCliMode(process.argv.slice(2));
if (isMain && cliMode == null) {
  console.error('usage: demigod-startup-jobs-enrich.mjs [--selftest | --repair-denied]');
  process.exit(1);
}
const CONCURRENCY = 12;
const TIMEOUT = 8000;

/** @param {...unknown} parts */
export function locationBlob(...parts) {
  return parts
    .flat(Infinity)
    .map((p) => (p == null ? '' : String(p)))
    .filter(Boolean)
    .join(' | ');
}

/**
 * Fail-closed US/Remote location gate for public board rows.
 * Bare empty location → not US. Clear foreign-only cities without US markers → not US.
 */
/** Heuristic: location text mentions remote/WFH (not a compensation or visa claim). */
export function isRemoteLocation(blob) {
  const t = String(blob || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return false;
  return /\b(remote|work from home|\bwfh\b|distributed team|work from anywhere|anywhere in the (?:us|u\.s|united states))\b/.test(
    t,
  );
}

export function isUsPostedLocation(blob) {
  const t = String(blob || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return false;
  if (/\b(united states|u\.?\s*s\.?\s*a\.?|u\.s\.|\bus\b)\b/.test(t)) return true;
  const foreign = /\b(japan|tokyo|osaka|london|united kingdom|\buk\b|england|scotland|india|bangalore|bengaluru|hyderabad|singapore|australia|sydney|melbourne|germany|berlin|munich|france|paris|netherlands|amsterdam|ireland|dublin|canada|toronto|vancouver|montreal|calgary|ottawa|mexico|brazil|china|beijing|shanghai|korea|seoul|israel|tel aviv|uae|dubai|poland|warsaw|spain|madrid|italy|milan|sweden|stockholm|switzerland|zurich)\b/;
  const clearUs = /\b(san francisco|oakland|berkeley|palo alto|mountain view|sunnyvale|redwood city|menlo park|los angeles|seattle|new york|nyc|brooklyn|austin|boston|chicago|denver|miami|atlanta|dallas|houston|phoenix|washington\s*d\.?c\.?|california|texas|massachusetts|colorado|illinois|florida|oregon|arizona)\b/;
  // A clear US alternative wins; foreign markers still beat bare "Remote",
  // ambiguous abbreviations, and place names in the same segment.
  if (t.split(/\s*[|;]\s*/).some((part) => clearUs.test(part) && !foreign.test(part))) return true;
  // Foreign markers — checked BEFORE US metros so an explicit foreign signal (esp. an ISO country code
  // like CA=Canada, MA=Morocco, CO=Colombia, GA=Gabon that collides with a US-state abbrev) wins the tie.
  if (foreign.test(t)) return false;
  // Common US metros / states / remote (SF-map companies; remote counted as US-posted).
  if (
    /\b(remote|san francisco|\bsf\b|bay area|oakland|berkeley|palo alto|mountain view|san jose|sunnyvale|redwood city|menlo park|south bay|east bay|peninsula|los angeles|\bla\b|seattle|new york|\bnyc\b|brooklyn|austin|boston|chicago|denver|miami|atlanta|portland|dallas|houston|phoenix|washington\s*d\.?c\.?|california|\bca\b|texas|\btx\b|washington|\bwa\b|massachusetts|\bma\b|colorado|\bco\b|illinois|\bil\b|florida|\bfl\b|oregon|\bor\b|arizona|\baz\b|georgia|\bga\b|\bny\b)\b/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

// Honesty: derive the board slug ONLY from the website's registrable domain, never the
// company name. Generic names (Camp→nouns.camp, Cedar→cedarcopilot.com, Sapien→outrove.ai)
// collide with unrelated companies' ATS boards and falsely attribute their jobs; the domain
// is unique to the company. Cost: a company whose ATS slug ≠ its domain label goes
// undetected (shown "hiring unknown") — under-claiming is the honest failure mode here.
// ponytail: naive registrable-label = second-to-last dotted label; fine for single-label
// TLDs (.com/.io/.ai/.co/.camp). Multi-part TLDs (.co.uk) yield a weak slug that just 404s.
// Domain → ATS board slug only when domain label ≠ board id and the board is
// independently evidenced (under-claim remains the default for unknowns).
// Never map by company name. Wrong-company boards (e.g. ashby "weave" = dental SaaS)
// must not appear here.
export const DOMAIN_ATS_SLUGS = {
  'usepylon.com': ['pylon-labs'],
};

// Exact domain/provider/slug collisions proven by the ATS board's own Home Page link.
export const DOMAIN_ATS_BOARD_DENYLIST = {
  'distro.app': { Lever: ['distro'] },
  'ion.design': { Lever: ['ion'] },
  'noble.ai': { Greenhouse: ['noble'] },
  'pivotal.io': { Lever: ['pivotal'] },
  'unusual.ai': { Lever: ['unusual'] },
};

// Exact map-row collisions from the 2026-07-29 provider-owner audit. IDs keep common
// company names (Assembly, Mesh, Ramp, Unit, etc.) from claiming unrelated same-slug boards.
export const COMPANY_ATS_BOARD_DENYLIST = {
  'hn:engineering.ramp.com': { Ashby: ['ramp'] },
  'hn:guild.ai': { Greenhouse: ['guild'] },
  'hn:job-boards.greenhouse.io': { Greenhouse: ['greenhouse'] },
  'hn:unit.inc': { Ashby: ['unit'] },
  'wd:Q117289144': { Greenhouse: ['katalyst'] },
  'wd:Q120985964': { Ashby: ['rain'] },
  'wd:Q137437985': { Ashby: ['foundation'] },
  'wd:Q139894906': { Ashby: ['adapt'] },
  'wd:Q17239559': { Ashby: ['obvious'] },
  'wd:Q20539341': { Greenhouse: ['quip'] },
  'wd:Q20715068': { Ashby: ['shift'] },
  'wd:Q5463898': { Ashby: ['focus'] },
  'wd:Q78083917': { Ashby: ['sisu'] },
  'wd:Q96372482': { Ashby: ['orbit'] },
  'yc:assembly': { Greenhouse: ['asm'] },
  'yc:assemble': { Ashby: ['assemble'] },
  'yc:atlas-2': { Ashby: ['atlas'] },
  'yc:aviator': { Ashby: ['aviator'] },
  'yc:axiom': { Greenhouse: ['axiom'] },
  'yc:blink-new': { Ashby: ['blink'] },
  'yc:butter': { Ashby: ['butter'] },
  'yc:castle-2': { Ashby: ['castle'] },
  'yc:conduit-ai': { Ashby: ['conduit'] },
  'yc:contextdev': { Ashby: ['context'] },
  'yc:dispatch': { Greenhouse: ['dispatch'] },
  'yc:double-coding-copilot': { Ashby: ['double'] },
  'yc:focal-systems': { Ashby: ['focal'] },
  'yc:grey': { Greenhouse: ['grey'] },
  'yc:infera': { Ashby: ['infera'] },
  'yc:medium-biosciences': { Greenhouse: ['medium'] },
  'yc:mesh': { Greenhouse: ['mesh'] },
  'yc:momentic': { Greenhouse: ['momentic'] },
  'yc:mosaic-2': { Ashby: ['mosaic'] },
  'yc:moss': { Ashby: ['moss'] },
  'yc:nex': { Greenhouse: ['nex'] },
  'yc:openprose': { Ashby: ['prose'] },
  'yc:orca': { Ashby: ['orca'] },
  'yc:osmosis': { Greenhouse: ['osmosis'] },
  'yc:parallel-bio': { Greenhouse: ['parallel'] },
  'yc:plane': { Ashby: ['plane'] },
  'yc:recall-ai': { Greenhouse: ['recall'] },
  'yc:reflex': { Greenhouse: ['reflex'] },
  'yc:rivet': { Ashby: ['rivet'] },
  'yc:rosebud-ai': { Greenhouse: ['rosebud'] },
  'yc:sagecare': { Ashby: ['sagecare'] },
  'yc:spotlight-realty': { Ashby: ['spotlight'] },
  'yc:stream': { Ashby: ['stream'] },
  'yc:substrate': { Ashby: ['substrate'] },
  'yc:superset': { Greenhouse: ['superset'] },
  'yc:sweep': { Ashby: ['sweep'] },
  'yc:tempo': { Greenhouse: ['tempo'] },
  'yc:vibe': { Ashby: ['vibe'] },
};

// One reviewed ownership change: The Athletic's site redirects into its NYT parent.
export const ATS_OWNER_HOST_ALIASES = {
  'brainbaselabs.com': ['usebrainbase.xyz'],
  'commodityai.io': ['commodityai.com'],
  'corgi.com': ['corgi.insure'],
  'docs.ditto.live': ['ditto.com'],
  'hud.ai': ['hud.so'],
  'instacart.com': ['instacart.careers'],
  'notion.so': ['notion.com'],
  'numeral.com': ['numeralhq.com'],
  'pinterest.de': ['pinterestcareers.com'],
  'speakeasy.com': ['speakeasyapi.dev'],
  'theathletic.com': ['nytimes.com'],
  'vera-health.ai': ['verahealth.ai'],
  'wikimedia.com': ['wikimediafoundation.org'],
};

const jobBoardSlug = (jobsUrl) => {
  try {
    return new URL(jobsUrl).pathname.split('/').filter(Boolean).pop()?.toLowerCase() || '';
  } catch {
    return '';
  }
};

export function hasDeniedAtsBoard(company) {
  const provider = company?.atsSource;
  const denied = [
    ...(DOMAIN_ATS_BOARD_DENYLIST[websiteHostKey(company?.website)]?.[provider] || []),
    ...(COMPANY_ATS_BOARD_DENYLIST[company?.id]?.[provider] || []),
  ];
  return denied.includes(jobBoardSlug(company?.jobsUrl));
}

export const slugs = (company) => {
  const out = new Set();
  // Domain labels: alphanumerics only. ATS aliases may keep hyphens (pylon-labs).
  const pushDomainLabel = (s) => {
    s = String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (s.length >= 3) out.add(s);
  };
  const pushAtsSlug = (s) => {
    s = String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
    if (s.replace(/-/g, '').length >= 3) out.add(s);
  };
  try {
    const host = new URL(company.website).hostname.replace(/^www\./, '').toLowerCase();
    const labels = host.split('.');
    const main = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
    pushDomainLabel(main);
    for (const alias of DOMAIN_ATS_SLUGS[host] || []) pushAtsSlug(alias);
  } catch {
    /* no website → no board */
  }
  return [...out].slice(0, 3);
};

async function tryFetch(url, parse) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return null;
    return parse(await r.json());
  } catch {
    return null;
  }
}

async function tryFetchText(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'text/html' },
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export function leverOwnerWebsiteFromHtml(html) {
  const link = [...String(html || '').matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)]
    .find((match) => /\bHome Page\b/i.test(match[3].replace(/<[^>]*>/g, ' ')));
  return websiteHostKey(link?.[2]) ? link[2] : null;
}

export function greenhouseOwnerWebsiteFromHtml(html) {
  const raw = /"boardConfiguration":\{[\s\S]*?"logo":\{"href":"([^"]+)"/i.exec(String(html || ''))?.[1]
    ?.replace(/\\\//g, '/');
  return websiteHostKey(raw) ? raw : null;
}

export function ashbyOwnerWebsiteFromHtml(html) {
  try {
    const raw = /window\.__appData\s*=\s*(\{[\s\S]*?\})\s*;/i.exec(String(html || ''))?.[1];
    const website = raw ? JSON.parse(raw)?.organization?.publicWebsite : null;
    return websiteHostKey(website) ? website : null;
  } catch {
    return null;
  }
}

export function workableOwnerWebsiteFromLlms(text) {
  const raw = /^\s*-\s*\[Company website\]\((https?:\/\/[^)\s]+)\)/im.exec(String(text || ''))?.[1];
  return websiteHostKey(raw) ? raw : null;
}

/** AR-28: SmartRecruiters company profile website (required for discover accept). */
export function smartrecruitersOwnerWebsiteFromCompanyJson(data) {
  const raw = data?.websiteUrl || data?.website || data?.companyWebsite;
  return websiteHostKey(raw) ? String(raw) : null;
}

/** AR-28: Recruitee careers HTML → non-recruitee company site (og:url or labeled link). */
export function recruiteeOwnerWebsiteFromHtml(html) {
  const s = String(html || '');
  const og =
    /property=["']og:url["'][^>]*content=["'](https?:\/\/[^"']+)/i.exec(s) ||
    /content=["'](https?:\/\/[^"']+)["'][^>]*property=["']og:url["']/i.exec(s);
  if (og?.[1]) {
    const host = websiteHostKey(og[1]);
    if (host && !host.endsWith('recruitee.com')) return og[1];
  }
  const link = [...s.matchAll(/<a\b[^>]*\bhref=(["'])(https?:\/\/.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].find(
    (m) =>
      /\b(website|home\s*page|company)\b/i.test(m[3].replace(/<[^>]*>/g, ' ')) &&
      websiteHostKey(m[2]) &&
      !websiteHostKey(m[2]).endsWith('recruitee.com'),
  );
  return link?.[2] || null;
}

/** AR-28: Personio careers HTML → non-personio company site (config JSON or labeled link). */
export function personioOwnerWebsiteFromHtml(html) {
  const s = String(html || '');
  const conf =
    /"company_website"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/i.exec(s) ||
    /"companyWebsite"\s*:\s*"(https?:\\?\/\\?\/[^"]+)"/i.exec(s);
  if (conf?.[1]) {
    const raw = conf[1].replace(/\\\//g, '/');
    const host = websiteHostKey(raw);
    if (host && !/personio\./i.test(host)) return raw;
  }
  const link = [...s.matchAll(/<a\b[^>]*\bhref=(["'])(https?:\/\/.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].find(
    (m) =>
      /\b(website|home|homepage|company)\b/i.test(m[3].replace(/<[^>]*>/g, ' ')) &&
      websiteHostKey(m[2]) &&
      !/personio\./i.test(websiteHostKey(m[2])),
  );
  return link?.[2] || null;
}

export function sameWebsiteOwner(companyWebsite, ownerWebsite) {
  const companyHost = websiteHostKey(companyWebsite);
  const ownerHost = websiteHostKey(ownerWebsite);
  if (!companyHost || !ownerHost) return false;
  if (
    companyHost === ownerHost ||
    companyHost.endsWith(`.${ownerHost}`) ||
    ownerHost.endsWith(`.${companyHost}`)
  ) return true;
  return (ATS_OWNER_HOST_ALIASES[companyHost] || []).some((host) =>
    ownerHost === host || ownerHost.endsWith(`.${host}`));
}

export function boardOwnerMatches(company, board) {
  return !board?.ownerWebsite || sameWebsiteOwner(company?.website, board.ownerWebsite);
}

// Coarse function category from a job title (keyword heuristic — an honest bucket, not a claim).
// Order matters: high-confidence PeopleOps first, then product and ai/data before engineering.
// AR-08: still PARTIAL taxonomy (honest coarse buckets); expand recall without stealing eng/science titles.
export function categorizeRole(title) {
  const t = String(title || '').toLowerCase();
  // PeopleOps: exclude eng/science/design craft titles so "SWE, People Ops" stays non-people.
  // Also skip bare "architect" (People Technology Solutions Architect → eng).
  if (
    !/\b(?:engineer|developer|scientist|designer|architect)\b/.test(t) &&
    (/\b(?:recruiters?|recruitment|talent acquisition|people (?:(?:team )?business partner|partner|consultant)|human resources|employee relations|total rewards|people experience|people success|learning and development|\bl&d\b|workforce planning|org(?:anizational)? development)\b|(?:^|[^/\w])hrbp\b|^(?:senior\s+)?(?:head|director|vp|vice president)\b.*\bpeople\b|^chief people officer\b/.test(t) ||
      /\b(?:compensation|benefits|\bhris\b|people (?:programs?|systems?|analytics|technology|tech)|workplace experience)\b/.test(t) ||
      /\bsourcers?\b/.test(t))
  ) {
    return 'people';
  }
  // Product leadership + PM craft (before marketing "product marketer")
  if (
    /\b(product manager|product management|product owner|\bpm\b|technical product|head of product|director of product|director, product|vp of product|vp, product|vice president of product|product leader|0\s*[→\->]\s*1 product)\b/.test(
      t,
    )
  ) {
    return 'product';
  }
  if (/\b(data scientist|machine learning|\bml\b|\bai\b|deep learning|\bnlp\b|computer vision|research scientist|data engineer|analytics engineer|data analyst|director of data|head of data)\b/.test(t)) return 'ai/data';
  // DevRel / tech writing / product marketing before eng bucket
  if (/\b(developer advocate|developer relations|\bdevrel\b|technical writer|docs engineer|documentation engineer|product market(?:er|ing))\b/.test(t)) {
    return 'marketing';
  }
  // Creative/design leadership before eng (avoids "design" false friends on non-design titles)
  if (/\b(head of design|creative director|head of creative|associate creative director|product creative)\b/.test(t)) {
    return 'design';
  }
  // Security product eng stays engineering; pure GRC/compliance (no eng title) → finance/legal
  if (
    /\b(security engineer|application security|appsec|detection engineer|security software|security platform|product security|security architecture)\b/.test(t)
  ) {
    return 'engineering';
  }
  // engineering manager / architect / bare "engineering" (title noun) before residual people/sales
  if (/\b(engineer|developer|\bswe\b|programmer|software|devops|\bsre\b|infrastructure|backend|frontend|full[\s-]?stack|mobile|\bios\b|android|platform|engineering|solutions architect|\barchitect\b|member of technical staff|systems administrator|\bit\b systems)\b/.test(t)) return 'engineering';
  if (/\b(designer|\bux\b|\bui\b|product design|brand|graphic|design systems?)\b/.test(t)) return 'design';
  // Presales/PS consultants + sellers (not bare "consultant" — jewelry/store stays other)
  if (
    /\b(sales|account executive|\bae\b|account manager|account management|account director|key accounts?|strategic account|account partner|business development|\bbdr\b|\bsdr\b|revenue|partnerships?|solutions engineer|sales engineer|customer engineer|founding gtm|gtm strategy|gtm planning|gtm presales|specialist seller|solutions? consultant|technical consultant|professional services consultant|partner development|partner manager|strategic partner|client partner|enterprise accounts?|renewals? manager)\b/.test(t) ||
    /\bregional director\b.*\benterprise\b|\benterprise\b.*\bregional director\b/.test(t)
  ) {
    return 'sales';
  }
  if (/\b(marketing|growth|content|\bseo\b|demand gen(?:eration)?|community|social media|communications|\bmarketer\b|agency lead|customer advocacy)\b/.test(t)) return 'marketing';
  if (
    /\b(?:recruit(?:er|ers|ing|ment)?|talent|people (?:ops|operations|partner)|human resources)\b|(?:^|[^/\w])hr(?:bp)?\b/.test(t) ||
    /\b(?:director,? learning|workforce strategy)\b/.test(t)
  ) {
    return 'people';
  }
  // Split-ish finance/legal: same bucket key for export stability, broader title recall
  if (
    /\b(finance|accounting|accountant|controller|fp&a|financial analyst|financial reporting|treasury|payroll|tax|accounts receivable|internal audit|credit underwriter|credit (?:&|and) collections|collections analyst|underwriting|credit risk|investor relations|corporate development|contracts manager|public policy)\b/.test(t) ||
    /\b(legal|counsel|attorney|paralegal|compliance|privacy counsel|data privacy|grc|governance risk)\b/.test(t)
  ) {
    return 'finance/legal';
  }
  // Security IR / SIRT before residual ops
  if (/\b(?:\bsirt\b|security incident|incident response)\b/.test(t)) return 'engineering';
  if (
    /\b(operations|\bops\b|support|customer success|client success|partner success|customer experience|\bcx\b|\bcsm\b|customer support|technical support|implementation|onboarding specialist|program manager|project manager|chief of staff|office manager|business operations|revops|sales ops|gtm ops|gtm enablement|executive assistant|executive business partner|scrum master|deployment strategist|\bbizops\b|business systems analyst|systems analyst|case management|deal desk|engagement manager|strategic projects|resolutions manager|resolutions lead)\b/.test(
      t,
    )
  ) {
    return 'operations';
  }
  return 'other';
}

// Normalized job-board identity: two records that resolve to the SAME public ATS board are the same
// company (Wikidata mints multiple QIDs for one firm — "OpenAI"+"OpenAI OpCo", Samsara ×3 — all →
// one board). Keying on the board URL is safe where name-keying is not (distinct real "Atlas"/"Bloom"
// companies exist). ponytail: exact normalized-URL key; upgrade to per-ATS slug if a cross-subdomain
// same-slug dup ever appears.
export function boardKey(jobsUrl) {
  if (!jobsUrl) return null;
  try {
    const u = new URL(jobsUrl);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return host + path;
  } catch { return null; }
}

// Collapse companies sharing a board (prevents role double-counting). Records with no board pass
// through untouched. Survivor = most-complete record (has website, most tags), tie-break shortest
// name (drops legal-entity suffixes like "OpCo"); tags unioned; openRoles = max of the group.
export function dedupeByBoard(companies) {
  const groups = new Map();
  const passthrough = [];
  for (const c of companies) {
    const k = boardKey(c.jobsUrl);
    if (!k) { passthrough.push(c); continue; }
    (groups.get(k) || groups.set(k, []).get(k)).push(c);
  }
  const merged = [];
  for (const group of groups.values()) {
    if (group.length === 1) { merged.push(group[0]); continue; }
    const best = group.slice().sort((a, b) =>
      (b.website ? 1 : 0) - (a.website ? 1 : 0) ||
      (b.tags?.length || 0) - (a.tags?.length || 0) ||
      (a.name || '').length - (b.name || '').length)[0];
    const tags = [...new Set(group.flatMap((c) => c.tags || []))];
    const openRoles = Math.max(...group.map((c) => c.openRoles || 0));
    merged.push({ ...best, ...(tags.length ? { tags } : {}), ...(openRoles ? { openRoles } : {}) });
  }
  return [...merged, ...passthrough];
}

export function withoutJobEvidence(company) {
  const {
    openRoles,
    jobsUrl,
    atsSource,
    openRolesAt,
    jobsSource,
    roleMix,
    agingRoles,
    oldestAgingDays,
    oldestObservedDays,
    observed7,
    observed30,
    observed60,
    observed90,
    ledgerOpenRoles,
    ...rest
  } = company;
  return rest;
}

export function updateJobsCoverage(map, at, collapsed = map?.coverage?.boardDupesCollapsed || 0) {
  const globalMix = {};
  let hits = 0;
  let totalRoles = 0;
  let ycLinks = 0;
  for (const c of map.companies || []) {
    if (c.openRoles && c.atsSource) {
      hits++;
      totalRoles += c.openRoles;
      for (const [key, value] of Object.entries(c.roleMix || {})) {
        globalMix[key] = (globalMix[key] || 0) + value;
      }
    } else if (c.jobsSource === 'YC') {
      ycLinks++;
    }
  }
  map.coverage ||= {};
  map.coverage.companiesWithOpenRoles = hits;
  map.coverage.companiesWithYcJobsLink = ycLinks;
  map.coverage.roleMix = globalMix;
  map.coverage.openRolesAt = at;
  map.coverage.boardDupesCollapsed = collapsed;
  map.coverage.openRolesScope =
    'US-posted (or Remote) roles on the company public Greenhouse/Lever/Ashby/Workable/Personio/Recruitee/SmartRecruiters board when location is listed; foreign-only and location-unknown postings are excluded. YC self-reported-hiring companies with no detected board link their YC jobs page (jobsSource:"YC", no verified count).';
  return { hits, totalRoles, ycLinks };
}

// count + role-mix over the US-posted jobs (null if none).
function hit(usJobs, titleOf, jobsUrl, ats) {
  if (!usJobs.length) return null;
  const roleMix = {};
  for (const job of usJobs) { const c = categorizeRole(titleOf(job)); roleMix[c] = (roleMix[c] || 0) + 1; }
  return { count: usJobs.length, jobsUrl, ats, roleMix };
}

// Each returns { count, jobsUrl, ats, roleMix } or null — count is US-posted only.
async function greenhouse(slug) {
  const board = await tryFetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, (j) => {
    const jobs = Array.isArray(j.jobs) ? j.jobs : [];
    const us = jobs.filter((job) => isUsPostedLocation(locationBlob(job?.location?.name)));
    const result = hit(us, (job) => job?.title, `https://boards.greenhouse.io/${slug}`, 'Greenhouse');
    if (!result) return null;
    const ownerWebsite = jobs
      .map((job) => job?.absolute_url)
      .find((url) => {
        const host = websiteHostKey(url);
        return host && !host.endsWith('greenhouse.io') && host !== 'app.careerpuck.com';
      });
    return { ...result, ownerWebsite: ownerWebsite || null };
  });
  if (!board || board.ownerWebsite) return board;
  return {
    ...board,
    ownerWebsite: greenhouseOwnerWebsiteFromHtml(
      await tryFetchText(`https://job-boards.greenhouse.io/${slug}`),
    ),
  };
}
async function lever(slug) {
  const board = await tryFetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, (j) => {
    const jobs = Array.isArray(j) ? j : [];
    const us = jobs.filter((job) =>
      isUsPostedLocation(
        locationBlob(
          job?.country,
          job?.categories?.location,
          job?.categories?.allLocations,
          job?.workplaceType,
        ),
      ),
    );
    return hit(us, (job) => job?.text, `https://jobs.lever.co/${slug}`, 'Lever');
  });
  if (!board) return null;
  return {
    ...board,
    ownerWebsite: leverOwnerWebsiteFromHtml(await tryFetchText(board.jobsUrl)),
  };
}
async function ashby(slug) {
  const board = await tryFetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, (j) => {
    const jobs = Array.isArray(j.jobs) ? j.jobs : [];
    const us = jobs.filter((job) =>
      isUsPostedLocation(
        locationBlob(
          job?.location,
          job?.address?.postalAddress?.addressCountry,
          job?.address?.postalAddress?.addressRegion,
          job?.address?.postalAddress?.addressLocality,
          job?.workplaceType,
          job?.isRemote ? 'remote' : '',
        ),
      ),
    );
    return hit(us, (job) => job?.title, `https://jobs.ashbyhq.com/${slug}`, 'Ashby');
  });
  if (!board) return null;
  return {
    ...board,
    ownerWebsite: ashbyOwnerWebsiteFromHtml(await tryFetchText(board.jobsUrl)),
  };
}
async function workable(slug) {
  const feed = await fetchWorkableRoles(slug);
  if (!feed?.ok) return null;
  const result = hit(
    feed.roles.filter((job) => isUsPostedLocation(locationBlob(job?.location))),
    (job) => job?.title,
    `https://apply.workable.com/${slug}/`,
    'Workable',
  );
  if (!result) return null;
  const ownerWebsite = workableOwnerWebsiteFromLlms(
    await tryFetchText(`${result.jobsUrl}llms.txt`),
  );
  return ownerWebsite ? { ...result, ownerWebsite } : null;
}

// AR-28 secondary providers: fail closed without owner evidence (same honesty as Workable).
async function personio(slug) {
  const feed = await fetchPersonioRoles(slug);
  if (!feed?.ok) return null;
  const result = hit(
    feed.roles.filter((job) => isUsPostedLocation(locationBlob(job?.location))),
    (job) => job?.title,
    `https://${slug}.jobs.personio.de/`,
    'Personio',
  );
  if (!result) return null;
  const ownerWebsite = personioOwnerWebsiteFromHtml(await tryFetchText(result.jobsUrl));
  return ownerWebsite ? { ...result, ownerWebsite } : null;
}

async function recruitee(slug) {
  const feed = await fetchRecruiteeRoles(slug);
  if (!feed?.ok) return null;
  const result = hit(
    feed.roles.filter((job) => isUsPostedLocation(locationBlob(job?.location))),
    (job) => job?.title,
    `https://${slug}.recruitee.com/`,
    'Recruitee',
  );
  if (!result) return null;
  const ownerWebsite = recruiteeOwnerWebsiteFromHtml(await tryFetchText(result.jobsUrl));
  return ownerWebsite ? { ...result, ownerWebsite } : null;
}

async function smartrecruiters(slug) {
  const feed = await fetchSmartrecruitersRoles(slug);
  if (!feed?.ok) return null;
  const result = hit(
    feed.roles.filter((job) => isUsPostedLocation(locationBlob(job?.location))),
    (job) => job?.title,
    `https://jobs.smartrecruiters.com/${slug}`,
    'SmartRecruiters',
  );
  if (!result) return null;
  const company = await tryFetch(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}`,
    (j) => j,
  );
  const ownerWebsite = smartrecruitersOwnerWebsiteFromCompanyJson(company);
  return ownerWebsite ? { ...result, ownerWebsite } : null;
}

/** Exact board repair path: unlike broad discovery, missing owner evidence fails closed. */
export async function fetchOwnedAtsBoard(company, slug, provider) {
  const probe = { Greenhouse: greenhouse, Lever: lever, Ashby: ashby, Workable: workable }[provider];
  if (!probe || !String(slug || '').trim()) return null;
  const found = await probe(String(slug).trim());
  if (
    !found?.ownerWebsite ||
    !sameWebsiteOwner(company?.website, found.ownerWebsite) ||
    hasDeniedAtsBoard({ ...company, atsSource: found.ats, jobsUrl: found.jobsUrl })
  ) return null;
  return found;
}

async function detect(company) {
  for (const slug of slugs(company)) {
    for (const probe of [
      greenhouse,
      lever,
      ashby,
      workable,
      personio,
      recruitee,
      smartrecruiters,
    ]) {
      const found = await probe(slug);
      if (
        found &&
        !hasDeniedAtsBoard({ ...company, atsSource: found.ats, jobsUrl: found.jobsUrl }) &&
        boardOwnerMatches(company, found)
      ) {
        return found;
      }
    }
  }
  return null;
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await worker(items[idx], idx);
      }
    }),
  );
  return out;
}

// Fallback job link for a YC company that self-reports hiring but has no detected ATS board:
// the canonical YC jobs page. Honest — no verified count (caller flags jobsSource:'YC' so the
// atlas shows "Hiring (per YC)", never a number), and only from a validated YC company URL.
export function ycJobsUrl(company) {
  if (company?.hiring !== 'yes') return null;
  const m = /^https:\/\/www\.ycombinator\.com\/companies\/([a-z0-9-]+)\/?$/i.exec(String(company?.sourceUrl || ''));
  return m ? `https://www.ycombinator.com/companies/${m[1]}/jobs` : null;
}

// CLI / unit: location + slug honesty (env or --selftest). Gate via verify-all.
// isMain guard: import must not exit, rewrite MAP, or hammer ATS boards.
if (isMain && (process.env.DEMIGOD_JOBS_ENRICH_SELFTEST === '1' || cliMode === 'selftest')) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  assert(isUsPostedLocation('San Francisco, CA'), 'SF');
  assert(isUsPostedLocation('United States'), 'US');
  assert(isUsPostedLocation('Remote'), 'remote');
  assert(isUsPostedLocation('US'), 'country US');
  assert(!isUsPostedLocation('Japan'), 'Japan');
  assert(!isUsPostedLocation('London, UK'), 'London');
  assert(!isUsPostedLocation('Toronto'), 'Toronto');
  assert(!isUsPostedLocation(''), 'empty');
  assert(!isUsPostedLocation('Tokyo · Japan'), 'Tokyo');
  // ISO country code CA=Canada must NOT beat the foreign check (was: \bca\b matched California first)
  assert(!isUsPostedLocation('CA | Toronto | Full-time'), 'CA(Canada)+Toronto → not US');
  assert(!isUsPostedLocation('Montreal, CA'), 'Montreal, CA → not US');
  assert(isUsPostedLocation('San Francisco, CA'), 'SF+CA still US-posted');
  assert(isUsPostedLocation('CA | Vancouver | Vancouver | Los Angeles | onsite'), 'mixed Canada+Los Angeles → US-posted');
  assert(!isUsPostedLocation('CA | Vancouver'), 'Canada-only remains foreign');
  assert(!isUsPostedLocation('Remote | Canada'), 'foreign remote remains foreign');
  assert(!isUsPostedLocation('Boston, UK'), 'foreign qualifier stays foreign');
  // Slug honesty: board slug comes from the domain, never the generic name (real misattributions found live).
  const sl = (name, website) => slugs({ name, website });
  assert(!sl('Camp', 'https://nouns.camp/').includes('camp'), 'Camp must not slug to the toy-store /camp board');
  assert(sl('Camp', 'https://nouns.camp/').includes('nouns'), 'nouns.camp → nouns');
  assert(!sl('Cedar', 'https://mail.cedarcopilot.com/').includes('cedar'), 'Cedar must not slug to healthcare /cedar');
  assert(sl('Cedar', 'https://mail.cedarcopilot.com/').includes('cedarcopilot'), 'cedarcopilot.com → cedarcopilot');
  assert(sl('GitLab Inc.', 'https://about.gitlab.com/company/').includes('gitlab'), 'about.gitlab.com → gitlab (subdomain parse)');
  assert(sl('Stripe', 'https://stripe.com/').includes('stripe'), 'stripe.com → stripe');
  assert(sl('X', '').length === 0, 'no website → no slug → no board');
  // Evidenced domain→board alias (usepylon.com ATS is pylon-labs, not usepylon).
  assert(sl('Pylon', 'https://usepylon.com/').includes('pylon-labs'), 'usepylon.com → pylon-labs alias');
  // Must NOT invent ashby "weave" for YC Weave (that board is dental SaaS in Lehi).
  assert(!sl('Weave', 'https://weaveos.com/').includes('weave') || sl('Weave', 'https://weaveos.com/').includes('weaveos'), 'weaveos primary');
  assert(!DOMAIN_ATS_SLUGS['weaveos.com'], 'no weaveos false alias');
  assert(sl('Pivotal Software', 'https://pivotal.io/').includes('pivotal'), 'domain-derived slug remains provider-neutral');
  assert(hasDeniedAtsBoard({
    website: 'https://pivotal.io/',
    atsSource: 'Lever',
    jobsUrl: 'https://jobs.lever.co/pivotal',
  }), 'known domain/board collision is denied');
  assert(!hasDeniedAtsBoard({
    website: 'https://pivotal.aero/',
    atsSource: 'Lever',
    jobsUrl: 'https://jobs.lever.co/pivotal',
  }), 'real board owner is not denied');
  assert(hasDeniedAtsBoard({
    id: 'yc:assembly',
    website: 'https://asm.co/',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/asm',
  }), 'audited same-slug Greenhouse collision is denied');
  assert(hasDeniedAtsBoard({
    id: 'yc:atlas-2',
    website: 'https://atlas.co/',
    atsSource: 'Ashby',
    jobsUrl: 'https://jobs.ashbyhq.com/atlas',
  }), 'audited same-slug Ashby collision is denied');
  assert(hasDeniedAtsBoard({
    website: 'https://www.noble.ai/',
    atsSource: 'Greenhouse',
    jobsUrl: 'https://boards.greenhouse.io/noble',
  }), 'NobleAI must not claim the unrelated Noble Greenhouse board');
  assert(leverOwnerWebsiteFromHtml('<a href="https://pivotal.aero">Pivotal Home Page</a>') === 'https://pivotal.aero', 'Lever owner link parsed');
  assert(greenhouseOwnerWebsiteFromHtml(
    'window.x={"boardConfiguration":{"logo":{"href":"https://www.noble.xyz/","url":"logo.png"}}}',
  ) === 'https://www.noble.xyz/', 'Greenhouse configured logo link parsed');
  assert(ashbyOwnerWebsiteFromHtml(
    'window.__appData = {"organization":{"name":"Rad AI","publicWebsite":"https://www.radai.com/"}};',
  ) === 'https://www.radai.com/', 'Ashby organization website parsed');
  assert(
    workableOwnerWebsiteFromLlms('- [Company website](https://www.doist.com): Doist website') === 'https://www.doist.com',
    'Workable company website parsed',
  );
  assert(
    smartrecruitersOwnerWebsiteFromCompanyJson({ websiteUrl: 'https://acme.example/' }) ===
      'https://acme.example/',
    'SmartRecruiters company website parsed',
  );
  assert(
    recruiteeOwnerWebsiteFromHtml('<meta property="og:url" content="https://www.owned.example/careers" />') ===
      'https://www.owned.example/careers',
    'Recruitee og:url owner parsed',
  );
  assert(
    personioOwnerWebsiteFromHtml('{"companyWebsite":"https://www.owned.example/"}') ===
      'https://www.owned.example/',
    'Personio companyWebsite parsed',
  );
  assert(!boardOwnerMatches(
    { website: 'https://pivotal.io/' },
    { ownerWebsite: 'https://pivotal.aero' },
  ), 'explicit Lever owner mismatch is rejected');
  assert(boardOwnerMatches(
    { website: 'https://theathletic.com/' },
    { ownerWebsite: 'https://www.nytimes.com/athletic/' },
  ), 'reviewed parent-company owner is accepted');
  assert(boardOwnerMatches(
    { website: 'https://gridware.io/' },
    { ownerWebsite: null },
  ), 'missing Lever owner link remains unverified, not a mismatch');
  {
    const originalFetch = globalThis.fetch;
    const mockWorkable = (ownerWebsite) => async (url) => {
      const target = String(url);
      if (target.endsWith('/api/v1/widget/accounts/owned')) {
        return {
          ok: true,
          json: async () => ({
            jobs: [{
              shortcode: 'WB1',
              title: 'Backend Engineer',
              city: 'San Francisco',
              country: 'United States',
              url: 'https://apply.workable.com/j/WB1',
            }],
          }),
        };
      }
      if (target.endsWith('/owned/llms.txt') && ownerWebsite) {
        return { ok: true, text: async () => `- [Company website](${ownerWebsite}): owner` };
      }
      return { ok: false };
    };
    try {
      globalThis.fetch = mockWorkable('https://www.owned.example/about');
      const owned = await detect({ website: 'https://owned.example/' });
      assert(owned?.ats === 'Workable' && owned.count === 1, 'owned Workable board accepted');
      globalThis.fetch = mockWorkable(null);
      assert(await detect({ website: 'https://owned.example/' }) === null, 'Workable without owner evidence rejected');
      globalThis.fetch = mockWorkable('https://other.example/');
      assert(await detect({ website: 'https://owned.example/' }) === null, 'mismatched Workable owner rejected');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
  // AR-28: Personio / Recruitee / SmartRecruiters discover with required owner evidence
  {
    const originalFetch = globalThis.fetch;
    const usRole = { id: '9', name: 'Backend Engineer', office: 'San Francisco, United States' };
    const mockSecondary = (provider, ownerWebsite) => async (url) => {
      const target = String(url);
      if (provider === 'Personio') {
        if (target.includes('owned.jobs.personio.de/xml')) {
          return {
            ok: true,
            text: async () =>
              `<workzag-jobs><position><id>9</id><name>Backend Engineer</name><office>San Francisco, United States</office><createdAt>2026-03-01</createdAt></position></workzag-jobs>`,
          };
        }
        if (target.includes('owned.jobs.personio.de') && ownerWebsite) {
          return {
            ok: true,
            text: async () => JSON.stringify({ companyWebsite: ownerWebsite }),
          };
        }
      }
      if (provider === 'Recruitee') {
        if (target.includes('owned.recruitee.com/api/offers')) {
          return {
            ok: true,
            json: async () => ({
              offers: [{
                id: 5,
                title: 'Backend Engineer',
                city: 'San Francisco',
                country_code: 'US',
                careers_url: 'https://owned.recruitee.com/o/backend',
                published_at: '2026-04-01',
              }],
            }),
          };
        }
        if (target.includes('owned.recruitee.com') && ownerWebsite) {
          return {
            ok: true,
            text: async () => `<meta property="og:url" content="${ownerWebsite}" />`,
          };
        }
      }
      if (provider === 'SmartRecruiters') {
        if (target.includes('/companies/owned/postings')) {
          return {
            ok: true,
            json: async () => ({
              totalFound: 1,
              content: [{
                id: '1',
                name: 'Backend Engineer',
                location: { fullLocation: 'San Francisco, CA, United States' },
                releasedDate: '2026-06-01',
              }],
            }),
          };
        }
        if (target.includes('/companies/owned') && !target.includes('postings') && ownerWebsite) {
          return {
            ok: true,
            json: async () => ({ websiteUrl: ownerWebsite }),
          };
        }
      }
      return { ok: false };
    };
    try {
      globalThis.fetch = mockSecondary('Personio', 'https://www.owned.example/');
      let found = await detect({ website: 'https://owned.example/' });
      assert(found?.ats === 'Personio' && found.count === 1, 'owned Personio board accepted');
      globalThis.fetch = mockSecondary('Personio', null);
      assert(await detect({ website: 'https://owned.example/' }) === null, 'Personio without owner rejected');
      globalThis.fetch = mockSecondary('Personio', 'https://other.example/');
      assert(await detect({ website: 'https://owned.example/' }) === null, 'Personio owner mismatch rejected');

      globalThis.fetch = mockSecondary('Recruitee', 'https://www.owned.example/jobs');
      found = await detect({ website: 'https://owned.example/' });
      assert(found?.ats === 'Recruitee' && found.count === 1, 'owned Recruitee board accepted');
      globalThis.fetch = mockSecondary('Recruitee', null);
      assert(await detect({ website: 'https://owned.example/' }) === null, 'Recruitee without owner rejected');

      globalThis.fetch = mockSecondary('SmartRecruiters', 'https://owned.example/');
      found = await detect({ website: 'https://owned.example/' });
      assert(found?.ats === 'SmartRecruiters' && found.count === 1, 'owned SmartRecruiters board accepted');
      globalThis.fetch = mockSecondary('SmartRecruiters', null);
      assert(await detect({ website: 'https://owned.example/' }) === null, 'SmartRecruiters without owner rejected');
      void usRole;
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
  // YC jobs-page fallback: only YC-hiring companies, only from a validated YC company URL, → /jobs page.
  const yc = { hiring: 'yes', sourceUrl: 'https://www.ycombinator.com/companies/rescale' };
  assert(ycJobsUrl(yc) === 'https://www.ycombinator.com/companies/rescale/jobs', 'YC hiring → /jobs page');
  assert(ycJobsUrl({ ...yc, hiring: 'unknown' }) === null, 'not hiring → no YC jobs link');
  assert(ycJobsUrl({ hiring: 'yes', sourceUrl: 'https://evil.example.com/x' }) === null, 'non-YC url → no link (no injection)');
  assert(ycJobsUrl({ hiring: 'yes', sourceUrl: 'https://www.wikidata.org/wiki/Q1' }) === null, 'wikidata source → no YC jobs link');
  // Role categorization — heuristic buckets; ai/data must win over engineering for ML/data titles.
  assert(categorizeRole('Senior Backend Engineer') === 'engineering', 'backend → engineering');
  assert(categorizeRole('Machine Learning Engineer') === 'ai/data', 'ML engineer → ai/data (not engineering)');
  assert(categorizeRole('Staff Data Scientist') === 'ai/data', 'data scientist → ai/data');
  assert(categorizeRole('AI Product Manager') === 'product', 'AI product manager → product');
  assert(categorizeRole('Product Designer') === 'design', 'designer → design');
  assert(categorizeRole('Account Executive') === 'sales', 'AE → sales');
  assert(categorizeRole('Senior HRBP') === 'people', 'HRBP → people');
  assert(categorizeRole('People Partner') === 'people', 'people partner → people');
  assert(categorizeRole('Recruiter') === 'people', 'recruiter → people');
  assert(categorizeRole('Sales Recruiter') === 'people', 'sales recruiter → people');
  assert(categorizeRole('Technical Recruiter, Infrastructure') === 'people', 'technical recruiter → people');
  assert(categorizeRole('Senior People Business Partner, Product & Marketing') === 'people', 'people business partner → people');
  assert(categorizeRole('Head of People') === 'people', 'head of people → people');
  assert(categorizeRole('Head of Total Rewards') === 'people', 'total rewards → people');
  assert(categorizeRole('Recruiting Solutions Engineer') === 'engineering', 'recruiting engineer stays engineering');
  assert(categorizeRole('Senior Software Engineer, People Ops and AI Tools') !== 'people', 'people-tools engineer is not PeopleOps');
  assert(categorizeRole('Join Our Talent Community') === 'marketing', 'talent community is not PeopleOps');
  assert(categorizeRole('Remote Therapist — $75–115/hr') === 'other', 'hourly rate is not HR');
  assert(categorizeRole('Chief of Staff') === 'operations', 'chief of staff → operations');
  assert(categorizeRole('Security Engineer') === 'engineering', 'security engineer stays eng');
  assert(categorizeRole('GRC Analyst') === 'finance/legal', 'grc → finance/legal');
  assert(categorizeRole('Privacy Counsel') === 'finance/legal', 'privacy counsel → finance/legal');
  assert(categorizeRole('Technical Writer') === 'marketing', 'tech writer → marketing');
  assert(categorizeRole('Developer Advocate') === 'marketing', 'devrel → marketing');
  assert(categorizeRole('Customer Support Specialist') === 'operations', 'support → operations');
  assert(categorizeRole('RevOps Manager') === 'operations', 'revops → operations');
  assert(categorizeRole('Learning and Development Partner') === 'people', 'l&d → people');
  assert(categorizeRole('Financial Analyst') === 'finance/legal', 'fin analyst → finance/legal');
  // AR-08 recall: compensation/HRIS/sourcer, creative heads, success, finance ops titles
  assert(categorizeRole('Compensation Lead') === 'people', 'compensation → people');
  assert(categorizeRole('Sr. Compensation Business Partner') === 'people', 'comp BP → people');
  assert(categorizeRole('Benefits Consultant (FL)') === 'people', 'benefits → people');
  assert(categorizeRole('People Programs Lead') === 'people', 'people programs → people');
  assert(categorizeRole('Senior HRIS Analyst') === 'people', 'hris → people');
  assert(categorizeRole('People Analytics Manager') === 'people', 'people analytics → people');
  assert(categorizeRole('Workplace Experience Manager') === 'people', 'workplace exp → people');
  assert(categorizeRole('Design Sourcer') === 'people', 'sourcer → people (not design craft)');
  assert(categorizeRole('Head of Design') === 'design', 'head of design → design');
  assert(categorizeRole('Creative Director') === 'design', 'creative director → design');
  assert(categorizeRole('Client Success Manager') === 'operations', 'client success → operations');
  assert(categorizeRole('Partner Success Manager') === 'operations', 'partner success → operations');
  assert(categorizeRole('Account Director, Strategic') === 'sales', 'account director → sales');
  assert(categorizeRole('Vice President Key Accounts, North America') === 'sales', 'key accounts → sales');
  assert(categorizeRole('Founding GTM') === 'sales', 'founding gtm → sales');
  assert(categorizeRole('Internal Audit Analyst') === 'finance/legal', 'internal audit → finance/legal');
  assert(categorizeRole('Credit Underwriter') === 'finance/legal', 'credit underwriter → finance/legal');
  assert(categorizeRole('Executive Assistant') === 'operations', 'EA → operations');
  assert(categorizeRole('Scrum Master') === 'operations', 'scrum master → operations');
  assert(categorizeRole('Engineering Manager, Onboarding') === 'engineering', 'eng manager → engineering');
  assert(categorizeRole('Data Center Design Execution Lead') === 'other', 'non-product design stays other');
  // AR-08: product leadership, architects, CX, account mgmt, people tech
  assert(categorizeRole('Director of Product') === 'product', 'director of product → product');
  assert(categorizeRole('Head of Product') === 'product', 'head of product → product');
  assert(categorizeRole('0→1 Product Leader') === 'product', '0→1 product leader → product');
  assert(categorizeRole('Product Marketer') === 'marketing', 'product marketer → marketing');
  assert(categorizeRole('Solutions Architect') === 'engineering', 'solutions architect → eng');
  assert(categorizeRole('Solutions Architect, People Technology') === 'engineering', 'people-tech architect stays eng');
  assert(categorizeRole('People Consultant') === 'people', 'people consultant → people');
  assert(categorizeRole('Senior People Technology Analyst - Workday') === 'people', 'people technology → people');
  assert(categorizeRole('Vice President of Customer Experience') === 'operations', 'CX → operations');
  assert(categorizeRole('Manager, Account Management') === 'sales', 'account management → sales');
  assert(categorizeRole('Strategic Account Partner') === 'sales', 'strategic account → sales');
  assert(categorizeRole('Senior Credit & Collections Analyst') === 'finance/legal', 'collections → finance');
  assert(categorizeRole('Principal Scientist, Cancer Biology') === 'other', 'wet-lab scientist stays other (not ai/data)');
  // AR-08: residual high-frequency other → coarse buckets (ledger-driven)
  assert(categorizeRole('Member of Technical Staff') === 'engineering', 'MOTS → engineering');
  assert(categorizeRole('Solutions Consultant') === 'sales', 'solutions consultant → sales');
  assert(categorizeRole('Senior Professional Services Consultant') === 'sales', 'PS consultant → sales');
  assert(categorizeRole('Technical Consultant I') === 'sales', 'technical consultant → sales');
  assert(categorizeRole('Specialist Seller, Mid-Market') === 'sales', 'specialist seller → sales');
  assert(categorizeRole('Senior Partner Development Manager') === 'sales', 'partner development → sales');
  assert(categorizeRole('Regional Client Partner, Ads Solutions') === 'sales', 'client partner → sales');
  assert(categorizeRole('Enterprise Accounts Associate') === 'sales', 'enterprise accounts → sales');
  assert(categorizeRole('Director, GTM Strategy & Planning') === 'sales', 'gtm strategy → sales');
  assert(categorizeRole('Head of Demand Generation') === 'marketing', 'demand generation → marketing');
  assert(categorizeRole('Agency Lead') === 'marketing', 'agency lead → marketing');
  assert(categorizeRole('Director, Credit Risk') === 'finance/legal', 'credit risk → finance');
  assert(categorizeRole('Deployment Strategist') === 'operations', 'deployment strategist → operations');
  assert(categorizeRole('BizOps Senior Manager (Technical)') === 'operations', 'bizops → operations');
  assert(categorizeRole('Business Systems Analyst') === 'operations', 'BSA → operations');
  assert(categorizeRole('Systems Analyst II') === 'operations', 'systems analyst → operations');
  assert(categorizeRole('Case Management Specialist (Remote Flexible)') === 'operations', 'case management → operations');
  assert(categorizeRole('Deal Desk Manager') === 'operations', 'deal desk → operations');
  assert(categorizeRole('Engagement Manager') === 'operations', 'engagement manager → operations');
  assert(categorizeRole('Curriculum Lead, GTM Enablement') === 'operations', 'gtm enablement → operations');
  assert(categorizeRole('Jewelry Consultant') === 'other', 'retail consultant stays other');
  assert(categorizeRole('General Application') === 'other', 'general application stays other');
  // AR-08: residual batch 2 (enterprise/security/IR/renewals/data lead)
  assert(categorizeRole('Regional Director, Enterprise') === 'sales', 'regional director enterprise → sales');
  assert(categorizeRole('Strategic Partner Manager') === 'sales', 'strategic partner → sales');
  assert(categorizeRole('Senior Renewals Manager') === 'sales', 'renewals → sales');
  assert(categorizeRole('Principal GTM Presales Enablement Business Partner') === 'sales', 'gtm presales → sales');
  assert(categorizeRole('Director of Data') === 'ai/data', 'director of data → ai/data');
  assert(categorizeRole('Senior Manager, Product Security') === 'engineering', 'product security → eng');
  assert(categorizeRole('IT Systems Administrator') === 'engineering', 'sysadmin → eng');
  assert(categorizeRole('Vice President, Investor Relations') === 'finance/legal', 'IR → finance');
  assert(categorizeRole('VP, Corporate Development') === 'finance/legal', 'corp dev → finance');
  assert(categorizeRole('Contracts Manager') === 'finance/legal', 'contracts → finance');
  assert(categorizeRole('Senior Manager, Financial Reporting') === 'finance/legal', 'fin reporting → finance');
  assert(categorizeRole('Director, Learning') === 'people', 'director learning → people');
  assert(categorizeRole('Workforce Strategy & Transformation Director') === 'people', 'workforce strategy → people');
  assert(categorizeRole('Lead, Customer Advocacy') === 'marketing', 'customer advocacy → marketing');
  assert(categorizeRole('Executive Business Partner') === 'operations', 'EBP → operations (not people)');
  assert(categorizeRole('Part-time Ambassador') === 'other', 'ambassador stays other');
  assert(categorizeRole('Store Manager, Jewelry') === 'other', 'store manager stays other');
  assert(categorizeRole('Public Policy Manager, State and Local') === 'finance/legal', 'public policy → finance/legal');
  assert(categorizeRole('Strategic Projects Lead') === 'operations', 'strategic projects → operations');
  assert(categorizeRole('Resolutions Manager') === 'operations', 'resolutions → operations');
  assert(categorizeRole('Senior Manager, SIRT') === 'engineering', 'SIRT → eng');
  assert(categorizeRole('Senior Analyst') === 'other', 'bare senior analyst stays other');
  assert(categorizeRole('') === 'other', 'empty → other');
  assert(
    jobsEnrichCliMode([]) === 'enrich' &&
      jobsEnrichCliMode(['--selftest']) === 'selftest' &&
      jobsEnrichCliMode(['--repair-denied']) === 'repair-denied' &&
      jobsEnrichCliMode(['--bogus']) === null &&
      jobsEnrichCliMode(['--help']) === null &&
      jobsEnrichCliMode(['--selftest', '--bogus']) === null,
    'CLI accepts only exact non-network modes; unknown/help/extra flags never fall through to polling',
  );
  // Board-dedup — same ATS board = same company; roles must NOT double-count (Wikidata multi-QID).
  assert(boardKey('https://boards.greenhouse.io/samsara/') === boardKey('https://boards.greenhouse.io/samsara'), 'boardKey ignores trailing slash');
  assert(boardKey('https://jobs.ashbyhq.com/openai') !== boardKey('https://jobs.ashbyhq.com/anthropic'), 'distinct boards distinct keys');
  assert(boardKey('') === null && boardKey(undefined) === null, 'no url → no key (passthrough)');
  {
    const dd = dedupeByBoard([
      { id: 'a', name: 'OpenAI OpCo', website: 'x', openRoles: 711, atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/openai', tags: ['yc'] },
      { id: 'b', name: 'OpenAI', website: 'x', openRoles: 711, atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/openai', tags: ['yc', 'YC Winter 2016'] },
      { id: 'c', name: 'Samsara', website: 'x', openRoles: 294, atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/samsara' },
      { id: 'd', name: 'Samsara', website: 'x', openRoles: 294, atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/samsara' },
      { id: 'e', name: 'Distinct', website: 'x', openRoles: 5, atsSource: 'Lever', jobsUrl: 'https://jobs.lever.co/distinct' },
      { id: 'f', name: 'NoBoard' }, // passthrough
    ]);
    assert(dd.length === 4, `dedupe 6→4 (got ${dd.length})`);
    const roles = dd.filter((c) => c.openRoles).reduce((s, c) => s + c.openRoles, 0);
    assert(roles === 711 + 294 + 5, `no double-count: ${roles} !== 1010`);
    const oa = dd.find((c) => c.jobsUrl?.includes('openai'));
    assert(oa.name === 'OpenAI' && oa.tags.includes('YC Winter 2016'), 'survivor: shortest name, unioned tags');
    assert(dd.some((c) => c.name === 'NoBoard'), 'boardless record passes through');
  }
  {
    const stripped = withoutJobEvidence({
      name: 'Wrong board',
      jobsUrl: 'x',
      openRoles: 2,
      atsSource: 'Lever',
      roleMix: { engineering: 2 },
      openRolesAt: '2026-07-24',
      agingRoles: 1,
      oldestAgingDays: 90,
    });
    assert(stripped.name === 'Wrong board' && !('jobsUrl' in stripped) && !('agingRoles' in stripped), 'strip all board-derived evidence');
    const tiny = {
      coverage: {},
      companies: [
        { openRoles: 2, atsSource: 'Lever', roleMix: { engineering: 2 } },
        { jobsSource: 'YC' },
      ],
    };
    const coverage = updateJobsCoverage(tiny, '2026-07-24');
    assert(coverage.hits === 1 && coverage.totalRoles === 2 && coverage.ycLinks === 1, 'coverage recomputed from current rows');
  }
  // Import must not rewrite MAP or run the enrich CLI (side-effect footgun).
  const selfPath = fileURLToPath(import.meta.url);
  const beforeMtime = fs.existsSync(MAP) ? fs.statSync(MAP).mtimeMs : 0;
  const imp = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import ${JSON.stringify(selfPath)}`],
    { encoding: 'utf8', timeout: 8000 },
  );
  assert(imp.status === 0, `import exit ${imp.status}: ${imp.stderr || ''}`);
  assert(!/withJobs|totalOpenRoles/.test(imp.stdout || ''), 'import must not print enrich summary');
  if (fs.existsSync(MAP)) {
    assert(fs.statSync(MAP).mtimeMs === beforeMtime, 'import must not rewrite MAP');
  }
  console.log(JSON.stringify({ ok: true, selftest: 'location-gate + slug-honesty + import-safe' }));
  process.exit(0);
}

if (isMain) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const repairDenied = cliMode === 'repair-denied';
  const at = repairDenied
    ? map.coverage?.openRolesAt || new Date().toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  if (repairDenied) {
    const removed = [];
    map.companies = map.companies.map((company) => {
      if (!hasDeniedAtsBoard(company)) return company;
      removed.push({ id: company.id || null, name: company.name || '', jobsUrl: company.jobsUrl });
      return withoutJobEvidence(company);
    });
    const coverage = updateJobsCoverage(map, at);
    atomicWrite(MAP, `${JSON.stringify(map)}\n`);
    console.log(JSON.stringify({ ok: true, removed, coverage, at }, null, 2));
    process.exit(0);
  }
  const results = await pool(map.companies, async (c) => {
    if (!c.website) return null;
    return detect(c);
  });
  map.companies = map.companies.map((c, idx) => {
    const board = results[idx];
    const rest = withoutJobEvidence(c);
    if (board) {
      return {
        ...rest,
        jobsUrl: board.jobsUrl,
        openRoles: board.count,
        atsSource: board.ats,
        roleMix: board.roleMix,
        openRolesAt: at,
      };
    }
    // No verified ATS board: link the YC jobs page for YC-self-reported hiring companies.
    const ycJobs = ycJobsUrl(rest);
    if (ycJobs) {
      return { ...rest, jobsUrl: ycJobs, jobsSource: 'YC', openRolesAt: at };
    }
    return rest; // strip any stale job fields when no board and not YC-hiring
  });
  // Collapse same-board duplicates BEFORE tallying, so totals never double-count (Wikidata multi-QID).
  const beforeDedup = map.companies.length;
  map.companies = dedupeByBoard(map.companies);
  const collapsed = beforeDedup - map.companies.length;
  map.coverage.namedCompanies = map.companies.length;
  map.coverage.companiesWithTeamSize = map.companies.filter(({ teamSize }) => Number.isSafeInteger(teamSize) && teamSize > 0).length;
  map.coverage.companiesWithStage = map.companies.filter(({ stage }) => ['Early', 'Growth'].includes(stage)).length;
  map.coverage.companiesWithSectorTags = map.companies.filter(({ sourceLicense, tags }) =>
    sourceLicense === 'YC-public' && tags?.some((tag) => tag !== 'yc' && !/^YC\s/.test(tag))).length;
  // Coverage tallied from the DEDUPED list — the honest numbers every consumer reads.
  const { hits, totalRoles, ycLinks } = updateJobsCoverage(map, at, collapsed);
  // Compact JSON — same bytes the CDN publisher seals; pretty-print only for console summary.
  atomicWrite(MAP, `${JSON.stringify(map)}\n`);
  console.log(
    JSON.stringify(
      { companies: map.companies.length, withJobs: hits, ycJobsLinks: ycLinks, totalOpenRoles: totalRoles, at, scope: 'us-posted' },
      null,
      2,
    ),
  );
}
