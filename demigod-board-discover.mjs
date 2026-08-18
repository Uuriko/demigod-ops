#!/usr/bin/env node
/**
 * demigod-board-discover — find the ATS board a company links to, instead of guessing its slug.
 *
 * THE GAP
 * 803 companies in the map are marked hiring by Y Combinator's own public dataset. We hold a real
 * ATS board for 207 of them. The other 596 carry a `ycombinator.com/companies/<slug>/jobs` URL,
 * which is a YC profile page, not a board — so the enrich has nothing to count and those companies
 * read as unknown rather than as hiring.
 *
 * The reason is structural. `demigod-startup-jobs-enrich.mjs` derives an ATS slug from the company's
 * domain and probes seven providers with it. That finds a board when the company named its board
 * after its domain, and finds nothing when it did not — `acme.com` whose Greenhouse board is
 * `acmerobotics` is invisible to a domain guess forever, no matter how many times the pass runs.
 *
 * So this asks the company instead. It reads the careers page they publish and takes the board they
 * link to, which is the same answer a human would get and does not depend on a naming coincidence.
 *
 * WHY A LINK IS NOT ENOUGH
 * A careers page can link to somebody else's board: an investor's job hub, a parent company, a
 * portfolio-wide listing, an agency. Attaching one of those would publish another company's roles
 * under this company's name, and open-role counts are the number this whole directory rests on.
 *
 * Every provider here exposes who owns a board — Greenhouse states it in `boardConfiguration.logo`,
 * Ashby in `window.__appData.organization.publicWebsite`, Lever in its "Home Page" link. This fetches
 * the board and requires that owner to be the company we started from. A board that will not say who
 * it belongs to is reported unverified and never applied.
 *
 *   node demigod-board-discover.mjs                 # dry run over hiring companies with no board
 *   node demigod-board-discover.mjs --limit 40
 *   node demigod-board-discover.mjs --apply
 *   node demigod-board-discover.mjs --selftest
 *
 * Schema: demigod.board-discover/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { websiteHostKey } from './demigod-startup-map-data.mjs';
import {
  leverOwnerWebsiteFromHtml,
  greenhouseOwnerWebsiteFromHtml,
  ashbyOwnerWebsiteFromHtml,
} from './demigod-startup-jobs-enrich.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const OUT = path.join(ROOT, 'DEMIGOD-BOARD-DISCOVERY.json');
const OPTOUT = path.join(ROOT, 'DEMIGOD-DIRECTORY-OPTOUT.json');
const CONCURRENCY = Math.max(1, Number(process.env.DEMIGOD_DISCOVER_CONCURRENCY) || 6);
const TIMEOUT_MS = 9000;

const UA = 'DemigodDirectoryBot/1.0 (+https://trydemigod.com; careers page board lookup)';

/** Careers pages, in the order companies actually use them. */
export const CAREERS_PATHS = ['/careers', '/jobs', '/', '/about', '/company/careers'];

/**
 * Board URL shapes, with the provider name the map already uses.
 *
 * Only the three providers whose boards state their owner. The enrich supports seven, but the other
 * four expose no ownership field on the page this pass reads, and an unverifiable board is exactly
 * what must not be attached automatically.
 */
export const BOARD_PATTERNS = [
  { provider: 'Greenhouse', re: /https?:\/\/(?:job-boards|boards)\.greenhouse\.io\/([a-z0-9][a-z0-9-]*)/ig },
  { provider: 'Lever', re: /https?:\/\/jobs\.lever\.co\/([a-z0-9][a-z0-9.-]*)/ig },
  { provider: 'Ashby', re: /https?:\/\/jobs\.ashbyhq\.com\/([a-z0-9][a-z0-9.-]*)/ig },
];

/** PURE. Every ATS board a page links to, deduped, with the provider named. */
export function boardsFromHtml(html) {
  const source = String(html || '');
  const found = [];
  const seen = new Set();
  for (const { provider, re } of BOARD_PATTERNS) {
    re.lastIndex = 0;
    for (const match of source.matchAll(re)) {
      const slug = match[1].toLowerCase().replace(/\.$/, '');
      // A board index rather than a company board — `jobs.lever.co/` alone, or an obvious page word.
      if (!slug || ['jobs', 'careers', 'search', 'api'].includes(slug)) continue;
      const key = `${provider}|${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ provider, slug, url: match[0] });
    }
  }
  return found;
}

/**
 * PURE. Does the board's stated owner match the company we started from?
 *
 * Host comparison uses the same `websiteHostKey` identity the rest of the codebase uses, so
 * `www.acme.com` and `acme.com` are one company and `app.acme.com` is not asserted to be.
 */
/**
 * Hosts that are never a company's own site. `greenhouseOwnerWebsiteFromHtml` reads
 * `boardConfiguration.logo.href`, and for Pump.co that field held a LinkedIn image CDN URL rather
 * than a website — so the "owner" came back as media.licdn.com and the board read as somebody
 * else's. A logo is not an owner; treat that as no evidence rather than as contrary evidence.
 */
export const NON_OWNER_HOSTS = [
  'media.licdn.com', 'licdn.com', 'linkedin.com', 'lh3.googleusercontent.com',
  'imgur.com', 'cloudfront.net', 'amazonaws.com', 'squarespace-cdn.com', 'wixstatic.com',
];

/** PURE. Is this a usable statement of ownership, or an asset host that says nothing? */
export function usableOwner(url) {
  const h = websiteHostKey(url);
  if (!h) return false;
  return !NON_OWNER_HOSTS.some((bad) => h === bad || h.endsWith(`.${bad}`));
}

export function ownerMatches(companyWebsite, ownerWebsite) {
  const a = websiteHostKey(companyWebsite);
  const b = websiteHostKey(ownerWebsite);
  if (!a || !b) return null;
  return a === b;
}

/** The owner-evidence reader for a provider, or null when the provider does not state one. */
export function ownerReaderFor(provider) {
  if (provider === 'Greenhouse') return greenhouseOwnerWebsiteFromHtml;
  if (provider === 'Lever') return leverOwnerWebsiteFromHtml;
  if (provider === 'Ashby') return ashbyOwnerWebsiteFromHtml;
  return null;
}

/** PURE. The verdict for one candidate board once its page has been read. */
export function verdictFor({ provider, slug, companyWebsite, boardHtml, redirectsTo = null }) {
  const reader = ownerReaderFor(provider);
  if (!reader) return { state: 'unverifiable', reason: `${provider} boards do not state an owner` };
  let owner = null;
  try { owner = reader(boardHtml); } catch { owner = null; }
  if (!owner) return { state: 'unverified', reason: 'the board did not say who it belongs to' };
  if (!usableOwner(owner)) return { state: 'unverified', owner, reason: 'the board named an asset host, not a company site' };
  const match = ownerMatches(companyWebsite, owner);
  if (match === null) return { state: 'unverified', reason: 'owner or company website unusable' };
  if (match) return { state: 'verified', provider, slug, owner, via: 'owner matches our website' };
  /* Second opinion before refusing. Our stored website can simply be the older one: Nash is listed
     at usenash.com, its site redirects to nash.ai, and its board states nash.ai as the owner. Two
     independent observations agreeing on the new domain is stronger evidence than either alone, and
     stronger than the stale field they both disagree with. Only a redirect WE measured counts —
     nothing here trusts the board's word about a domain we never resolved. */
  if (redirectsTo && websiteHostKey(owner) === redirectsTo) {
    return { state: 'verified', provider, slug, owner, via: 'our website redirects to the domain the board names' };
  }
  return { state: 'mismatch', provider, slug, owner, reason: 'the board belongs to a different company' };
}

function loadOptOuts() {
  try {
    const doc = JSON.parse(fs.readFileSync(OPTOUT, 'utf8'));
    return new Set((doc.entries || []).map((e) => websiteHostKey(e?.website) || e?.id).filter(Boolean));
  } catch { return new Set(); }
}

/** Companies worth asking about: someone says they are hiring, and we have no board. */
export function candidates(map, { limit = 0, optOuts = new Set() } = {}) {
  const rows = (map.companies || []).filter((c) => c
    && !c.atsSource
    && c.website
    && c.hiring === 'yes'
    && !optOuts.has(websiteHostKey(c.website))
    && !optOuts.has(c.id));
  return limit > 0 ? rows.slice(0, limit) : rows;
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!/text\/html|application\/json|text\/plain/i.test(type)) return null;
    return (await res.text()).slice(0, 500000);
  } catch { return null; }
}

function loadRedirects() {
  try {
    const drift = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-DOMAIN-DRIFT.json'), 'utf8'));
    return new Map((drift.rows || []).filter((r) => r.state === 'moved' && r.to).map((r) => [r.id, r.to]));
  } catch { return new Map(); }
}

async function discoverFor(company, redirects = new Map()) {
  const base = String(company.website).replace(/\/+$/, '');
  const seen = new Set();
  for (const suffix of CAREERS_PATHS) {
    const html = await fetchText(`${base}${suffix}`);
    if (!html) continue;
    for (const candidate of boardsFromHtml(html)) {
      const key = `${candidate.provider}|${candidate.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const boardHtml = await fetchText(candidate.url);
      if (!boardHtml) continue;
      const verdict = verdictFor({ ...candidate, companyWebsite: company.website, boardHtml, redirectsTo: redirects.get(company.id) || null });
      if (verdict.state === 'verified') {
        return { id: company.id, name: company.name, website: company.website, foundOn: `${base}${suffix}`, ...verdict, url: candidate.url };
      }
      if (verdict.state === 'mismatch') {
        return { id: company.id, name: company.name, website: company.website, ...verdict, url: candidate.url };
      }
    }
  }
  return { id: company.id, name: company.name, website: company.website, state: 'none' };
}

export async function run({ limit = 0, apply = false } = {}) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const list = candidates(map, { limit, optOuts: loadOptOuts() });
  const redirects = loadRedirects();
  const rows = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= list.length) return;
      rows.push(await discoverFor(list[index], redirects));
    }
  }));

  const verified = rows.filter((r) => r.state === 'verified');
  const report = {
    schema: 'demigod.board-discover/1',
    at: new Date().toISOString(),
    considered: list.length,
    verified: verified.length,
    mismatched: rows.filter((r) => r.state === 'mismatch').length,
    none: rows.filter((r) => r.state === 'none').length,
    applied: false,
    rows: rows.filter((r) => r.state !== 'none'),
  };

  if (apply && verified.length) {
    const byId = new Map(verified.map((r) => [r.id, r]));
    let wrote = 0;
    const next = map.companies.map((c) => {
      const hit = byId.get(c.id);
      // Re-check under the write: never overwrite a board another pass already proved.
      if (!hit || c.atsSource) return c;
      wrote += 1;
      return { ...c, jobsUrl: hit.url, atsSource: hit.provider, boardEvidence: { foundOn: hit.foundOn, owner: hit.owner, at: report.at } };
    });
    fs.writeFileSync(MAP, `${JSON.stringify({ ...map, companies: next })}\n`);
    report.applied = wrote;
  }
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);
  return report;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`board-discover selftest: ${msg}`); };

  const html = `<a href="https://job-boards.greenhouse.io/acmerobotics">Careers</a>
    <a href="https://jobs.ashbyhq.com/acme-ai/x">Roles</a>
    <a href="https://jobs.lever.co/acme.io">More</a>
    <a href="https://jobs.lever.co/">index</a>`;
  const found = boardsFromHtml(html);
  assert(found.length === 3, `three real boards, got ${found.length}`);
  assert(found.some((f) => f.provider === 'Greenhouse' && f.slug === 'acmerobotics'), 'a board slug that is not the domain is exactly the case a domain guess misses');
  assert(found.some((f) => f.provider === 'Lever' && f.slug === 'acme.io'), 'dotted slugs survive');
  assert(!found.some((f) => f.slug === 'jobs' || f.slug === ''), 'a bare provider index is not a board');
  assert(boardsFromHtml('').length === 0 && boardsFromHtml(null).length === 0, 'no html, no boards');

  // Ownership is the guard. A board that belongs to someone else must never be attached.
  const gh = (site) => `{"boardConfiguration":{"logo":{"href":"${site}"}}}`;
  assert(verdictFor({ provider: 'Greenhouse', slug: 'acme', companyWebsite: 'https://acme.com', boardHtml: gh('https://acme.com') }).state === 'verified', 'a matching owner verifies');
  assert(verdictFor({ provider: 'Greenhouse', slug: 'acme', companyWebsite: 'https://www.acme.com/', boardHtml: gh('https://acme.com') }).state === 'verified', 'www is the same company');
  const other = verdictFor({ provider: 'Greenhouse', slug: 'acme', companyWebsite: 'https://acme.com', boardHtml: gh('https://bigvc.com') });
  assert(other.state === 'mismatch', 'an investor job hub is a mismatch, not a board');
  assert(verdictFor({ provider: 'Greenhouse', slug: 'a', companyWebsite: 'https://acme.com', boardHtml: '{}' }).state === 'unverified', 'a board that will not name its owner is unverified');
  assert(verdictFor({ provider: 'Workable', slug: 'a', companyWebsite: 'https://acme.com', boardHtml: '' }).state === 'unverifiable', 'a provider with no ownership field is refused by name');

  // An asset host is not a statement of ownership. This is the Pump.co case.
  assert(usableOwner('https://acme.com') === true, 'a real site is a usable owner');
  assert(usableOwner('https://media.licdn.com/dms/image/x/logo.png') === false, 'a LinkedIn logo CDN is not an owner');
  assert(usableOwner('https://d1.cloudfront.net/x.png') === false, 'nor is a CDN subdomain');
  assert(usableOwner('') === false, 'nothing is not an owner');
  const logo = verdictFor({ provider: 'Greenhouse', slug: 'pump', companyWebsite: 'https://pump.co', boardHtml: gh('https://media.licdn.com/dms/image/x/logo.png') });
  assert(logo.state === 'unverified', 'a logo host yields no evidence rather than contrary evidence');

  // A redirect WE measured can confirm a board whose owner is our stale domain's successor.
  const moved = verdictFor({ provider: 'Greenhouse', slug: 'nash', companyWebsite: 'https://usenash.com', boardHtml: gh('https://www.nash.ai/'), redirectsTo: 'nash.ai' });
  assert(moved.state === 'verified' && /redirects/.test(moved.via), 'a measured redirect confirms the same company');
  const unmoved = verdictFor({ provider: 'Greenhouse', slug: 'x', companyWebsite: 'https://acme.com', boardHtml: gh('https://other.com'), redirectsTo: null });
  assert(unmoved.state === 'mismatch', 'without a measured redirect it stays a mismatch');
  const wrongMove = verdictFor({ provider: 'Greenhouse', slug: 'x', companyWebsite: 'https://acme.com', boardHtml: gh('https://other.com'), redirectsTo: 'elsewhere.com' });
  assert(wrongMove.state === 'mismatch', 'a redirect to a THIRD domain does not vouch for the board');

  assert(ownerMatches('https://acme.com', 'https://www.acme.com') === true, 'host identity ignores www');
  assert(ownerMatches('https://acme.com', 'https://app.acme.com') === false, 'a subdomain is not asserted to be the same company');
  assert(ownerMatches('junk', 'https://acme.com') === null, 'unusable input is unknown, not false');

  // Only companies with a hiring signal and no board, and never one that opted out.
  const map = { companies: [
    { id: 'a', website: 'https://a.com', hiring: 'yes' },
    { id: 'b', website: 'https://b.com', hiring: 'yes', atsSource: 'Ashby' },
    { id: 'c', website: 'https://c.com', hiring: 'no' },
    { id: 'd', website: null, hiring: 'yes' },
    { id: 'e', website: 'https://e.com', hiring: 'yes' },
  ] };
  const got = candidates(map, { optOuts: new Set(['e.com']) }).map((c) => c.id);
  assert(got.join(',') === 'a', `only the askable company qualifies, got ${got.join(',')}`);

  console.log(JSON.stringify({ ok: true, selftest: 'board-discover' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else {
    const at = args.indexOf('--limit');
    const report = await run({ limit: at >= 0 ? Number(args[at + 1]) : 0, apply: args.includes('--apply') });
    console.log(JSON.stringify({ considered: report.considered, verified: report.verified, mismatched: report.mismatched, none: report.none, applied: report.applied }, null, 2));
    for (const row of report.rows.slice(0, 25)) {
      console.log(row.state === 'verified'
        ? `  found     ${String(row.name).slice(0, 24).padEnd(25)} ${row.provider}|${row.slug}`
        : `  ${row.state.padEnd(9)} ${String(row.name).slice(0, 24).padEnd(25)} ${row.url || ''} — ${row.reason || ''}`);
    }
  }
}
