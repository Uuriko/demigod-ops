#!/usr/bin/env node
// Enrich DEMIGOD-SF-STARTUP-MAP.json companies with live job-posting counts from public ATS
// job-board APIs (Greenhouse, Lever, Ashby). Honest: only counts a board that actually returns
// jobs for a slug derived from the company (no false positives — a wrong slug returns empty).
// Location honesty: count only roles whose posted location looks US (or Remote) when the board
// exposes locations; unknown/foreign-only boards are dropped rather than mislabeled as SF hiring.
// Point-in-time: stamps openRolesAt so the listing can say "as of {date}". Run at build time.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MAP = '/home/potter/DEMIGOD-SF-STARTUP-MAP.json';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
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
export function isUsPostedLocation(blob) {
  const t = String(blob || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return false;
  if (/\b(united states|u\.?\s*s\.?\s*a\.?|u\.s\.|\bus\b)\b/.test(t)) return true;
  // Common US metros / states / remote (SF-map companies; remote counted as US-posted).
  if (
    /\b(remote|san francisco|\bsf\b|bay area|oakland|berkeley|palo alto|mountain view|san jose|sunnyvale|redwood city|menlo park|south bay|east bay|peninsula|los angeles|\bla\b|seattle|new york|\bnyc\b|brooklyn|austin|boston|chicago|denver|miami|atlanta|portland|dallas|houston|phoenix|washington\s*d\.?c\.?|california|\bca\b|texas|\btx\b|washington|\bwa\b|massachusetts|\bma\b|colorado|\bco\b|illinois|\bil\b|florida|\bfl\b|oregon|\bor\b|arizona|\baz\b|georgia|\bga\b|new york|\bny\b)\b/.test(
      t,
    )
  ) {
    return true;
  }
  // Foreign-only strong signals without a US marker above.
  if (
    /\b(japan|tokyo|osaka|london|united kingdom|\buk\b|england|scotland|india|bangalore|bengaluru|hyderabad|singapore|australia|sydney|melbourne|germany|berlin|munich|france|paris|netherlands|amsterdam|ireland|dublin|canada|toronto|vancouver|montreal|mexico|brazil|china|beijing|shanghai|korea|seoul|israel|tel aviv|uae|dubai|poland|warsaw|spain|madrid|italy|milan|sweden|stockholm|switzerland|zurich)\b/.test(
      t,
    )
  ) {
    return false;
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

// Coarse function category from a job title (keyword heuristic — an honest bucket, not a claim).
// Order matters: ai/data before engineering so "ML engineer"/"data engineer" land in ai/data.
export function categorizeRole(title) {
  const t = String(title || '').toLowerCase();
  if (/\b(data scientist|machine learning|\bml\b|\bai\b|deep learning|\bnlp\b|computer vision|research scientist|data engineer|analytics engineer|data analyst)\b/.test(t)) return 'ai/data';
  if (/\b(engineer|developer|\bswe\b|programmer|software|devops|\bsre\b|infrastructure|backend|frontend|full[\s-]?stack|mobile|\bios\b|android|platform)\b/.test(t)) return 'engineering';
  if (/\b(designer|\bux\b|\bui\b|product design|brand|graphic)\b/.test(t)) return 'design';
  if (/\b(product manager|product management|product owner|\bpm\b|technical product)\b/.test(t)) return 'product';
  if (/\b(sales|account executive|\bae\b|account manager|business development|\bbdr\b|\bsdr\b|revenue|partnerships|solutions engineer)\b/.test(t)) return 'sales';
  if (/\b(marketing|growth|content|\bseo\b|demand gen|community|social media|communications)\b/.test(t)) return 'marketing';
  if (/\b(recruit|talent|people ops|\bhr\b|human resources)\b/.test(t)) return 'people';
  if (/\b(finance|accounting|accountant|controller|fp&a|legal|counsel|compliance)\b/.test(t)) return 'finance/legal';
  if (/\b(operations|\bops\b|support|customer success|\bcsm\b|program manager|project manager|chief of staff|office manager)\b/.test(t)) return 'operations';
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

// count + role-mix over the US-posted jobs (null if none).
function hit(usJobs, titleOf, jobsUrl, ats) {
  if (!usJobs.length) return null;
  const roleMix = {};
  for (const job of usJobs) { const c = categorizeRole(titleOf(job)); roleMix[c] = (roleMix[c] || 0) + 1; }
  return { count: usJobs.length, jobsUrl, ats, roleMix };
}

// Each returns { count, jobsUrl, ats, roleMix } or null — count is US-posted only.
async function greenhouse(slug) {
  return tryFetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, (j) => {
    const jobs = Array.isArray(j.jobs) ? j.jobs : [];
    const us = jobs.filter((job) => isUsPostedLocation(locationBlob(job?.location?.name)));
    return hit(us, (job) => job?.title, `https://boards.greenhouse.io/${slug}`, 'Greenhouse');
  });
}
async function lever(slug) {
  return tryFetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, (j) => {
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
}
async function ashby(slug) {
  return tryFetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, (j) => {
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
}

async function detect(company) {
  for (const slug of slugs(company)) {
    for (const probe of [greenhouse, lever, ashby]) {
      const hit = await probe(slug);
      if (hit) return hit;
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
if (isMain && (process.env.DEMIGOD_JOBS_ENRICH_SELFTEST === '1' || process.argv.includes('--selftest'))) {
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
  assert(categorizeRole('Product Designer') === 'design', 'designer → design');
  assert(categorizeRole('Account Executive') === 'sales', 'AE → sales');
  assert(categorizeRole('Chief of Staff') === 'operations', 'chief of staff → operations');
  assert(categorizeRole('') === 'other', 'empty → other');
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
  const at = new Date().toISOString().slice(0, 10);
  const results = await pool(map.companies, async (c) => {
    if (!c.website) return null;
    return detect(c);
  });
  map.companies = map.companies.map((c, idx) => {
    const board = results[idx];
    const { openRoles, jobsUrl, atsSource, openRolesAt, jobsSource, roleMix, ...rest } = c;
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
  // Coverage tallied from the DEDUPED list — the honest numbers every consumer reads.
  const globalMix = {};
  let hits = 0;
  let totalRoles = 0;
  let ycLinks = 0;
  for (const c of map.companies) {
    if (c.openRoles && c.atsSource) {
      hits++;
      totalRoles += c.openRoles;
      for (const [k, v] of Object.entries(c.roleMix || {})) globalMix[k] = (globalMix[k] || 0) + v;
    } else if (c.jobsSource === 'YC') {
      ycLinks++;
    }
  }
  map.coverage.companiesWithOpenRoles = hits;
  map.coverage.companiesWithYcJobsLink = ycLinks;
  map.coverage.roleMix = globalMix;
  map.coverage.openRolesAt = at;
  map.coverage.boardDupesCollapsed = collapsed;
  map.coverage.openRolesScope =
    'US-posted (or Remote) roles on the company public Greenhouse/Lever/Ashby board when location is listed; foreign-only and location-unknown postings are excluded. YC self-reported-hiring companies with no detected board link their YC jobs page (jobsSource:"YC", no verified count).';
  // Compact JSON — same bytes the CDN publisher seals; pretty-print only for console summary.
  fs.writeFileSync(MAP, `${JSON.stringify(map)}\n`);
  console.log(
    JSON.stringify(
      { companies: map.companies.length, withJobs: hits, ycJobsLinks: ycLinks, totalOpenRoles: totalRoles, at, scope: 'us-posted' },
      null,
      2,
    ),
  );
}
