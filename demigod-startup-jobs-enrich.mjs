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
import { AsyncLocalStorage } from 'node:async_hooks';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { websiteHostKey } from './demigod-startup-map-data.mjs';
import {
  rippling as fetchRipplingRoles,
  workable as fetchWorkableRoles,
  personio as fetchPersonioRoles,
  recruitee as fetchRecruiteeRoles,
  smartrecruiters as fetchSmartrecruitersRoles,
} from './demigod-ats-providers.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
// Staging rebuilds set DEMIGOD_STARTUP_MAP so a killed enrich cannot leave the live map boardless.
const MAP = process.env.DEMIGOD_STARTUP_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const OPTOUT_PATH = process.env.DEMIGOD_DIRECTORY_OPTOUT || path.join(ROOT, 'DEMIGOD-DIRECTORY-OPTOUT.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
export const jobsEnrichCliMode = (args) =>
  args.length === 0
    ? 'enrich'
    : args.length === 1 && ['--selftest', '--repair-denied', '--repair-stamps', '--upgrade-https'].includes(args[0])
      ? args[0].slice(2)
      : null;
const cliMode = jobsEnrichCliMode(process.argv.slice(2));
if (isMain && cliMode == null) {
  console.error('usage: demigod-startup-jobs-enrich.mjs [--selftest | --repair-denied | --repair-stamps | --upgrade-https]');
  process.exit(1);
}
// 12 parallel workers over ~2900 companies × 7 providers is enough to get rate-limited by a single
// ATS: on 2026-08-16 it cost 90 Ashby boards in one run. Overridable so a recovery pass can go
// gently without editing the file — the polite value is not knowable from here, it depends on the
// providers' mood.
const CONCURRENCY = Math.max(1, Number(process.env.DEMIGOD_ENRICH_CONCURRENCY) || 12);
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
/**
 * Confirmed 2026-08-17, each by reading BOTH sites and checking they describe one business —
 * not by name similarity, which is how this goes wrong. Of fourteen pairs that looked obvious,
 * ten turned out to be unrelated companies sharing a brand: weaveos.com "AI to measure engineers"
 * is not getweave.com "communication platform for small business"; arlo1.com tracks drones and
 * missiles while joinarlo.com sells health insurance; joinminerva.ai acquires accounting firms
 * and minerva.io is marketing AI; helloconduit.com is dock scheduling and conduit.xyz is
 * blockchain infrastructure.
 *
 * Those are not near misses. The live directory currently credits the /arlo board — whose
 * openings include "VP of Clinical Strategy and Population Health" — to the drone company, and
 * the /weave board's Salesforce and billing support roles to the engineering-metrics company.
 * Refusing them is a CORRECTION, not a loss, and AR-28 has been silently preventing a dozen more.
 */
export const ATS_OWNER_HOST_ALIASES = {
  // Twilio acquired Authy; authy.com is a Twilio product page. Same shape as theathletic/nytimes.
  'authy.com': ['twilio.com'],
  // Both sites: "Candid Health", healthcare revenue-cycle automation. One company, two domains.
  'joincandidhealth.com': ['candidhealth.com'],
  // untolabs.com states it outright: "We are the team behind Thru." thru.org is the product.
  'thru.org': ['untolabs.com'],
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
  // A board slug is often the WHOLE host, not the domain label — Ashby is full of them
  // (ambient.ai, coram.ai). Only the label was ever offered, so `ambient` 404s while the real
  // board sits at `ambient.ai` with ten open roles, and the company reads as not hiring. That is
  // 109 companies carrying 1,752 roles as of 2026-08-17. Dots survive here; pushDomainLabel and
  // pushAtsSlug both strip them, which is why neither could ever produce this candidate.
  const pushHostSlug = (s) => {
    s = String(s || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').replace(/^[-.]+|[-.]+$/g, '');
    if (s.replace(/[.-]/g, '').length >= 3) out.add(s);
  };
  try {
    const host = new URL(company.website).hostname.replace(/^www\./, '').toLowerCase();
    const labels = host.split('.');
    const main = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
    pushDomainLabel(main);
    if (host !== main) pushHostSlug(host);
    for (const alias of DOMAIN_ATS_SLUGS[host] || []) pushAtsSlug(alias);
  } catch {
    /* no website → no board */
  }
  // 4, not 3, so the host candidate cannot be squeezed out by aliases. `detect` returns on the
  // first match, so only companies that currently find NOTHING pay for the extra probe — which is
  // exactly the set this candidate exists to rescue.
  return [...out].slice(0, 4);
};

/**
 * "This board does not exist" and "I could not read this board" were the same answer — null — and
 * the caller strips a company's job evidence on null. So one rate-limited request published a
 * company as having no open roles.
 *
 * Measured 2026-08-16: a full refresh hammered Ashby hard enough to lose 90 of its boards, and 109
 * companies carrying 1,752 roles went to zero on disk. Cursor's board still returned 114 jobs when
 * asked directly a few minutes later; nothing had closed. Publishing that would have pushed the
 * regression live.
 *
 * 404/410 is real evidence of absence — that slug is not on this provider, which is the normal
 * result for six of the seven probes. 429, 5xx, a timeout or a socket error are evidence of
 * nothing. AsyncLocalStorage keeps the distinction per detect() call without threading a context
 * argument through all seven providers, and it is concurrency-safe under `pool`.
 */
const fetchCtx = new AsyncLocalStorage();

/** How long a count may be carried across failed reads before we stop claiming it. */
export const STALE_BOARD_MAX_DAYS = 14;

/** PURE. May a previously verified count survive a failed read, given when it was last confirmed? */
export function withinStaleWindow(openRolesAt, at, maxDays = STALE_BOARD_MAX_DAYS) {
  const then = Date.parse(String(openRolesAt || ''));
  const now = Date.parse(String(at || ''));
  if (!Number.isFinite(then) || !Number.isFinite(now)) return false;
  const days = (now - then) / 86400000;
  return days >= 0 && days <= maxDays;
}

/** Note that a read failed for reasons that say nothing about whether the board has roles. */
function markUnreachable() {
  const store = fetchCtx.getStore();
  if (store) store.unreachable = true;
}

/**
 * Record WHY a read ended the way it did, so the map can say what happened rather than only that
 * something did. The kernel's `demigod.mission-company/1` contract distinguishes ok / rate_limited
 * / error / missing, and treats a null attempt as "we do not know" — never as success — so a
 * default of `ok` would quietly launder every unrecorded read into a verified one.
 */
function markAttempt(kind) {
  const store = fetchCtx.getStore();
  if (store) (store.attempts ||= []).push(kind);
}

/** Worst news wins: a rate limit is more informative than a 404 among the same company's probes. */
function worstAttempt(attempts = []) {
  for (const kind of ['rate_limited', 'error', 'missing']) {
    if (attempts.includes(kind)) return kind;
  }
  return attempts.includes('ok') ? 'ok' : null;
}

/**
 * A board we READ that had no US-posted roles. Recorded rather than merely skipped, because
 * "we read it and it was empty" and "we never found a board" are different facts and the map
 * could previously express only the second. Attribution still has to be earned: only a board
 * whose slug we had already verified may claim an empty count — see the guard in detect().
 */
function markEmptyBoard(jobsUrl, ats) {
  const store = fetchCtx.getStore();
  if (store && !store.emptyBoard) store.emptyBoard = { jobsUrl, ats };
}

/** True when the response proves the board is not there, rather than that we could not look. */
function isDefinitiveAbsence(status) {
  return status === 404 || status === 410;
}

async function tryFetch(url, parse) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) {
      if (isDefinitiveAbsence(r.status)) markAttempt('missing');
      else { markUnreachable(); markAttempt(r.status === 429 ? 'rate_limited' : 'error'); }
      return null;
    }
    markAttempt('ok');
    return parse(await r.json());
  } catch {
    markUnreachable();
    markAttempt('error');
    return null;
  }
}

async function tryFetchText(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { Accept: 'text/html' },
    });
    if (!response.ok && !isDefinitiveAbsence(response.status)) markUnreachable();
    return response.ok ? await response.text() : null;
  } catch {
    markUnreachable();
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
  if (/\b(data scientist|machine learning|\bml\b|\bai\b|deep learning|\bnlp\b|computer vision|research scientist|data engineer|analytics engineer|data analyst|director of data|head of data|business intelligence)\b/.test(t)) return 'ai/data';
  // DevRel / tech writing / product marketing before eng bucket
  if (/\b(developer advocate|developer relations|\bdevrel\b|technical writer|docs engineer|documentation engineer|product market(?:er|ing))\b/.test(t)) {
    return 'marketing';
  }
  // Creative/design leadership before eng (avoids "design" false friends on non-design titles)
  if (/\b(head of design|creative director|head of creative|associate creative director|product creative|art director)\b/.test(t)) {
    return 'design';
  }
  // Security product eng stays engineering; pure GRC/compliance (no eng title) → finance/legal
  if (
    /\b(security engineer|application security|appsec|detection engineer|security software|security platform|product security|security architecture)\b/.test(t)
  ) {
    return 'engineering';
  }
  // engineering manager / architect / bare "engineering" (title noun) before residual people/sales
  if (/\b(engineer|developer|\bswe\b|programmer|software|devops|\bsre\b|infrastructure|backend|frontend|full[\s-]?stack|mobile|\bios\b|android|platform|engineering|solutions architect|\barchitect\b|member of technical staff|systems administrator|\bit\b systems|tech(?:nical)? lead|eng (?:manager|lead))\b/.test(t)) return 'engineering';
  if (/\b(designer|\bux\b|\bui\b|product design|brand|graphic|design systems?)\b/.test(t)) return 'design';
  // Presales/PS consultants + sellers (not bare "consultant" — jewelry/store stays other)
  if (
    /\b(sales|account executive|\bae\b|account manager|account management|account director|key accounts?|strategic account|account partner|business development|\bbdr\b|\bsdr\b|revenue|partnerships?|solutions engineer|sales engineer|customer engineer|founding gtm|gtm strategy|gtm planning|gtm presales|specialist seller|solutions? consultant|technical consultant|professional services consultant|partner development|partner manager|strategic partner|client partner|enterprise accounts?|renewals? manager|solutions? advisor|value consultant|channel manager)\b/.test(t) ||
    /\bregional director\b.*\benterprise\b|\benterprise\b.*\bregional director\b/.test(t)
  ) {
    return 'sales';
  }
  if (/\b(marketing|growth|content|\bseo\b|demand gen(?:eration)?|community|social media|communications|\bmarketer\b|agency lead|customer advocacy|copywrit(?:er|ing)|video editor)\b/.test(t)) return 'marketing';
  if (
    /\b(?:recruit(?:er|ers|ing|ment)?|talent|people (?:ops|operations|partner)|human resources)\b|(?:^|[^/\w])hr(?:bp)?\b/.test(t) ||
    /\b(?:director,? learning|workforce strategy|people relations|candidate experience)\b/.test(t)
  ) {
    return 'people';
  }
  // Split-ish finance/legal: same bucket key for export stability, broader title recall
  if (
    /\b(finance|accounting|accountant|controller|fp&a|financial analyst|financial reporting|sec reporting|treasury|payroll|tax|accounts (?:receivable|payable)|internal audit(?:or)?|credit underwriter|credit (?:&|and) collections|collections analyst|underwriting|credit risk|investor relations|corporate development|contracts manager|public policy)\b/.test(t) ||
    /\b(legal|counsel|attorney|paralegal|compliance|privacy counsel|data privacy|grc|governance risk)\b/.test(t)
  ) {
    return 'finance/legal';
  }
  // Security IR / SIRT before residual ops
  if (/\b(?:\bsirt\b|security incident|incident response)\b/.test(t)) return 'engineering';
  if (
    /\b(operations|\bops\b|support|customer success|client success|partner success|customer experience|\bcx\b|\bcsm\b|customer support|technical support|implementation|onboarding specialist|program manager|project manager|chief of staff|office manager|business operations|revops|sales ops|gtm ops|gtm enablement|executive assistant|executive business partner|administrative business partner|founder(?:'s|’s|s)? (?:associate|office)|scrum master|deployment strategist|\bbizops\b|business systems analyst|systems analyst|case management|deal desk|engagement manager|strategic projects|resolutions manager|resolutions lead)\b/.test(
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
    // Stripped with the rest of the job evidence: a row that gets a fresh successful read must not
    // keep the stale flag from the run before it, or a recovered board stays marked unreliable.
    openRolesStale,
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

/**
 * One company row's job evidence after this run's board read.
 *
 * Exported because every honesty rule in this file lives in these five branches — a count only from
 * a real read, a zero only from a verified-empty board, a carried count keeping its ORIGINAL date,
 * a YC link carrying no date at all, and `ok` never appearing as a default — and none of them were
 * reachable by a test while they sat inside `if (isMain)`. The one that got out was the YC link,
 * which stamped the run's date onto a row it had read nothing for.
 *
 * Returns the row plus the two facts the run summary counts, so the caller stays a loop.
 */
export function projectJobRow(company, board, { at, attemptAt }) {
  // `ok` is never a default. A row we did not probe this run keeps whatever it already carried, and
  // a row we probed but could not read says so. The kernel reads a null attempt as unknown.
  const stamp = (row, lastAttempt) => (lastAttempt
    ? { ...row, lastAttempt, lastAttemptAt: attemptAt }
    : row);
  const rest = withoutJobEvidence(company);
  if (board?.count != null && !board.unreachable) {
    return {
      row: stamp({
        ...rest,
        jobsUrl: board.jobsUrl,
        openRoles: board.count,
        atsSource: board.ats,
        roleMix: board.roleMix,
        openRolesAt: at,
      }, 'ok'),
    };
  }
  // Read the board we had already verified, and it genuinely had no US-posted roles. Zero is a
  // FACT here, not an absence — and it is the only path that may write one. Everything else
  // leaves the count off entirely, because null means "we do not know".
  if (board?.verifiedEmpty) {
    return {
      row: stamp({ ...rest, jobsUrl: board.jobsUrl, openRoles: 0, atsSource: board.ats,
        roleMix: {}, openRolesAt: at }, 'ok'),
      verifiedEmpty: true,
    };
  }
  // Could not read the board this run. A previously verified count is still the best evidence we
  // have, so keep it with its ORIGINAL openRolesAt — the row reads as stale, which is true, rather
  // than as empty, which is not. Deliberately NOT restamped to `at`: that would launder an old
  // count as fresh. Bounded by STALE_BOARD_MAX_DAYS so a board that really went away drains out
  // instead of advertising roles forever; this codebase under-claims on purpose.
  if (board?.unreachable && Number(company.openRoles) > 0 && company.atsSource &&
      withinStaleWindow(company.openRolesAt, at)) {
    return {
      row: stamp({ ...rest, jobsUrl: company.jobsUrl, openRoles: company.openRoles, atsSource: company.atsSource,
        roleMix: company.roleMix, openRolesAt: company.openRolesAt, openRolesStale: true }, board.lastAttempt),
      carriedUnreachable: true,
    };
  }
  // No verified ATS board: link the YC jobs page for YC-self-reported hiring companies.
  const ycJobs = ycJobsUrl(rest);
  if (ycJobs) {
    // No `openRolesAt`. A YC jobs link is a link, not an observation: we found no board and read no
    // count, so there is no day on which we observed one. Stamping today's date here made the packet
    // call the row `board_observed` — live yc:10x read as a watched board with no roles and no
    // successful attempt, three claims a directory link cannot support.
    return { row: stamp({ ...rest, jobsUrl: ycJobs, jobsSource: 'YC' }, board?.lastAttempt) };
  }
  // No board and not YC-hiring — but say why we know that.
  return { row: stamp(rest, board?.lastAttempt) };
}

/**
 * Companies that asked not to be listed.
 *
 * A stated preference, kept apart from the misattribution denylists on purpose: those mean "this
 * board is not theirs", which is a factual correction with a different evidence bar and a different
 * permanence. Merging the two would let a correction be revoked by an argument and a request be
 * overturned by evidence, and neither is right.
 *
 * The effect is narrow and deliberate: we stop probing their board and drop the job evidence we
 * hold. The company stays in the directory as a company, because "stop publishing our openings" and
 * "erase us" are different asks and only the first one has been made. See docs/die/ATS-SOURCE-TERMS.md.
 */
export function loadDirectoryOptOuts(file = OPTOUT_PATH) {
  try {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (doc?.schema !== 'demigod.directory-optout/1') return new Set();
    return new Set((doc.entries || []).map((entry) => String(entry?.companyId || '').trim()).filter(Boolean));
  } catch {
    // No file, or an unreadable one. An opt-out we cannot read must never be silently ignored.
    if (fs.existsSync(file)) throw new Error('directory_optout_unreadable');
    return new Set();
  }
}

/**
 * Decide whether an https probe earns an upgrade. PURE, so the rule is testable without a network.
 *
 * 486 rows store `http://` websites (239 Wikidata, 247 YC) — both upstream sources hand them over
 * that way and safeUrl preserves what it is given. A public directory linking http:// sends every
 * visitor's first hop unencrypted, so it is worth fixing, but a bulk rewrite would be asserting
 * something nobody checked. The only upgrade allowed here is one an https request actually answered.
 *
 * Same host only. A redirect to a different host is a different company's problem — sites park,
 * merge and get sold, and following one would silently rewrite identity, which is keyed on the
 * registrable domain.
 */
export function httpsUpgradeVerdict(originalUrl, probe) {
  let original;
  try { original = new URL(String(originalUrl || '')); } catch { return { upgrade: false, reason: 'unparseable' }; }
  if (original.protocol !== 'http:') return { upgrade: false, reason: 'not-http' };
  if (!probe || probe.ok !== true) return { upgrade: false, reason: probe?.reason || 'no-answer' };
  let answered;
  try { answered = new URL(String(probe.finalUrl || '')); } catch { return { upgrade: false, reason: 'unparseable-answer' }; }
  if (answered.protocol !== 'https:') return { upgrade: false, reason: 'answered-http' };
  /* Compare the way identity does: websiteHostKey strips `www.` and lowercases, so
     `http://www.acme.com/` answering at `https://acme.com/` is the same site canonicalising, not a
     different company. An exact hostname comparison refused 195 of 486 rows on the first pass for
     exactly that reason. Arbitrary subdomains still count as different — a redirect to
     app.acme.com is another page, and refusing is the conservative direction. */
  if (websiteHostKey(answered.href) !== websiteHostKey(original.href)) {
    return { upgrade: false, reason: 'different-host' };
  }
  const next = new URL(original.href);
  next.protocol = 'https:';
  return { upgrade: true, url: next.href };
}

/**
 * May an empty board claim "we read it and it was empty"?
 *
 * Only when the empty board is the one we had ALREADY verified for this company. Extracted from
 * detect() so the rule can be tested, because the vendor behaviour it guards against is real and
 * was measured on 2026-08-17: `api.smartrecruiters.com/v1/companies/<anything>/postings` answers
 * HTTP 200 with `{"totalFound":0,"content":[]}` for a slug that belongs to nobody. Six other
 * providers 404 an unknown slug; SmartRecruiters says "here is your empty board".
 *
 * Without this guard, every slug guess against that provider would manufacture a verified-empty
 * board, and zero open roles is the one count this codebase treats as a fact. It would publish
 * "this company is hiring nobody" about thousands of businesses whose board we never found.
 */
export function acceptsVerifiedEmpty(emptyBoard, knownSlug) {
  if (!emptyBoard?.jobsUrl || !knownSlug) return false;
  return knownBoardSlug({ jobsUrl: emptyBoard.jobsUrl }) === knownSlug;
}

/**
 * Drop `openRolesAt` from rows that carry a date and no count.
 *
 * 597 of 2,917 live rows had one on 2026-08-17, all of them YC directory links stamped by a branch
 * that had read no board. `projectJobRow` stopped writing them, but a full enrich re-reads ~2,900
 * companies across seven providers and one run has already cost 90 Ashby boards to rate limiting —
 * too expensive to fire for a field nobody needs to re-derive. This touches the stamp and nothing
 * else: no count moves, no board is read, and a second run is a no-op.
 */
export function repairStampedRows(companies = []) {
  const touched = [];
  const rows = companies.map((company) => {
    if (!company?.openRolesAt || Number.isSafeInteger(company.openRoles)) return company;
    const { openRolesAt, ...rest } = company;
    touched.push({ id: company.id || null, jobsSource: company.jobsSource || null, openRolesAt });
    return rest;
  });
  return { rows, touched };
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
/**
 * PURE. A retired board is often left up with one "posting" that is really a forwarding note
 * ("We have moved our Careers Page to: https://jobs.ashbyhq.com/anyscale"). Counting it claims an
 * opening that does not exist and links a board page that 404s for every visitor.
 * Both halves are required: "moved"/"relocated" alone would eat real titles (Relocation Manager),
 * and a bare URL or the word "careers" is common in legitimate postings.
 */
export function isBoardMovedNotice(title) {
  const t = String(title || '');
  return /\b(?:moved|relocated|is now at|now live at)\b/i.test(t) &&
    (/\b(?:careers?|jobs?|job board|hiring page)\b/i.test(t) || /https?:\/\//i.test(t));
}

function hit(usJobs, titleOf, jobsUrl, ats) {
  // Drop forwarding notes before counting. An emptied board returns null, so `detect` falls through
  // to the provider the company actually moved to — under-claiming, never inventing.
  usJobs = usJobs.filter((job) => !isBoardMovedNotice(titleOf(job)));
  if (!usJobs.length) {
    // Read successfully, nothing US-posted on it. Note it and still return null so `detect` keeps
    // falling through to the provider a company may have moved to — the fall-through is unchanged,
    // only what we can say afterwards is.
    markEmptyBoard(jobsUrl, ats);
    return null;
  }
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

/**
 * Rippling exposes no owner anywhere on its board or feed, so the usual proof is unavailable and
 * this fails closed a different way: it counts a board ONLY when demigod-board-discover already
 * found the link on a page served by the company's own domain, and recorded where.
 *
 * That is a real but weaker claim than the others make. Greenhouse, Lever and Ashby say "this board
 * belongs to acme.com" and we check it. Here the company's own careers page says "our jobs are
 * here", which a careers page can get wrong — Cargo links Customer.io's board, and only Greenhouse
 * naming its owner caught that. The compensating guard is that the evidence has to come from the
 * company's own host; a link found anywhere else counts for nothing.
 */
async function rippling(slug, company) {
  const foundOn = company?.boardEvidence?.foundOn;
  if (!foundOn) return null;
  if (!websiteHostKey(foundOn) || websiteHostKey(foundOn) !== websiteHostKey(company?.website)) return null;
  const feed = await fetchRipplingRoles(slug);
  if (!feed?.ok) return null;
  const found = hit(
    feed.roles.filter((job) => isUsPostedLocation(locationBlob(job?.location))),
    (job) => job?.title,
    `https://ats.rippling.com/${slug}`,
    'Rippling',
  );
  return found ? { ...found, ownedBy: 'careers-page' } : null;
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
  const probe = { Greenhouse: greenhouse, Lever: lever, Ashby: ashby, Workable: workable, Rippling: rippling }[provider];
  if (!probe || !String(slug || '').trim()) return null;
  const found = await probe(String(slug).trim(), company);
  if (!found || hasDeniedAtsBoard({ ...company, atsSource: found.ats, jobsUrl: found.jobsUrl })) return null;
  /* Two ways a board may be proved ours, and they are not equal.
     - ownerWebsite: the board itself names the company. Greenhouse, Lever, Ashby and Workable all
       publish this, and it is the strong form, because it survives a careers page being wrong.
     - ownedBy 'careers-page': the company's own domain published the link, checked inside the probe.
       Rippling exposes no owner anywhere, so this is the only evidence available for it.
     The weak form is named rather than silently folded in, so a row's provenance can be read off
     the code instead of inferred. Everything except Rippling still fails closed without the strong
     form. */
  if (found.ownedBy === 'careers-page') return found;
  if (!found.ownerWebsite || !sameWebsiteOwner(company?.website, found.ownerWebsite)) return null;
  return found;
}

/**
 * The slug of a board we have ALREADY verified for this company, if any.
 *
 * A board slug is frequently not derivable from the company's domain at all: Anysphere's board is
 * ashbyhq.com/cursor while its site is anysphere.inc; Ashby's own board is /ashby while its host is
 * ashbyhq.com; Alembic has no website, so slugs() returns nothing and detect gives up before it
 * starts. Re-deriving candidates from the domain on every run throws away the one piece of hard
 * evidence we already had — the URL of the board we previously read — and then fails to guess it
 * back. That is 108 companies and 1,742 open roles reading as not hiring on 2026-08-17.
 *
 * This is a HINT about where to look, not a carried count: the board is still fetched and counted
 * fresh, and if it has gone away we find nothing and strip the evidence as before.
 */
const knownBoardSlug = (company) => {
  const url = String(company?.jobsUrl || '');
  if (!/^https:\/\/(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/|^https:\/\/jobs\.(?:lever\.co|ashbyhq\.com|gem\.com)\//i.test(url)) return null;
  const slug = jobBoardSlug(url);
  return slug && slug.length >= 2 ? slug : null;
};

/**
 * True when the company's own identity IS this board.
 *
 * A row like `hn:jobs.ashbyhq.com/baseten` exists BECAUSE that board was found in the company's own
 * public Hacker News post — the board is the identity, not an inference about it, and these rows
 * carry no website precisely because we never had one. Requiring owner evidence to match is then
 * circular: it asks the board to prove it belongs to a company we only know through the board, and
 * `sameWebsiteOwner(null, …)` is false, so the answer is always no.
 *
 * That cost 28 companies on 2026-08-17. This is NOT a loosening of the owner rule — AR-28 exists
 * because a published Fortune-500 ATS mapping audited at ~52% accurate when it was inferred rather
 * than probed, and a false attribution poisons every downstream claim about both companies. The
 * rule stands everywhere it is doing work. It simply cannot do work here, because there is no
 * competing claim to adjudicate: the identity and the board are the same fact. Exact host AND path
 * match only, so a different board on the same provider still has to earn its attribution.
 */
const idIsThisBoard = (company, found) => {
  const id = String(company?.id || '').toLowerCase();
  if (!id.startsWith('hn:')) return false;
  try {
    const u = new URL(found?.jobsUrl);
    return id === `hn:${u.host}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return false;
  }
};

async function detect(company) {
  return fetchCtx.run({ unreachable: false }, async () => {
    const known = knownBoardSlug(company);
    for (const slug of known ? [known, ...slugs(company).filter((s) => s !== known)] : slugs(company)) {
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
          (boardOwnerMatches(company, found) || idIsThisBoard(company, found))
        ) {
          return found;
        }
      }
    }
    // Found nothing. Say whether that is a finding or a failure — the caller strips job evidence
    // on a plain null, and stripping on a failed read is how a rate limit becomes "not hiring".
    const store = fetchCtx.getStore() || {};
    const lastAttempt = worstAttempt(store.attempts);
    if (store.unreachable) return { unreachable: true, lastAttempt };
    // Verified empty: every probe was READ, and the board we already knew about had no US-posted
    // roles. Only the previously verified board may claim this — an empty board discovered by slug
    // guessing has never had its owner checked, and AR-28 exists because inferred ATS attribution
    // audits around 52% accurate. Claiming "this company is hiring nobody" on an unverified board
    // would be a confident wrong answer about a real business.
    const empty = store.emptyBoard;
    if (acceptsVerifiedEmpty(empty, known)) {
      return { verifiedEmpty: true, jobsUrl: empty.jobsUrl, ats: empty.ats, lastAttempt: 'ok' };
    }
    return lastAttempt ? { lastAttempt } : null;
  });
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
  // Board-relocation notices: the exact live string that made Anyscale read as "1 open role on
  // Lever" while jobs.lever.co/anyscale 404s and their real board carries 16 roles.
  assert(isBoardMovedNotice('We have moved our Careers Page to: https://jobs.ashbyhq.com/anyscale'), 'the live Anyscale forwarding note is not a job');
  assert(isBoardMovedNotice('Our job board has moved to Ashby'), 'plain relocation note caught');
  assert(!isBoardMovedNotice('Relocation Program Manager'), 'a real title about relocation is still a job');
  assert(!isBoardMovedNotice('Head of Careers Content'), 'careers alone is not a relocation note');
  assert(!isBoardMovedNotice('Staff Engineer, Jobs Platform'), 'jobs alone is not a relocation note');
  assert(!isBoardMovedNotice('') && !isBoardMovedNotice(null), 'no title is not a relocation note');
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
      // 404: this slug is not on this provider — real evidence of absence, not a failed read.
      return { ok: false, status: 404 };
    };
    try {
      globalThis.fetch = mockWorkable('https://www.owned.example/about');
      const owned = await detect({ website: 'https://owned.example/' });
      assert(owned?.ats === 'Workable' && owned.count === 1, 'owned Workable board accepted');
      globalThis.fetch = mockWorkable(null);
      assert(!(await detect({ website: 'https://owned.example/' }))?.count, 'Workable without owner evidence rejected');
      globalThis.fetch = mockWorkable('https://other.example/');
      assert(!(await detect({ website: 'https://owned.example/' }))?.count, 'mismatched Workable owner rejected');
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
      // 404: this slug is not on this provider — real evidence of absence, not a failed read.
      return { ok: false, status: 404 };
    };
    try {
      globalThis.fetch = mockSecondary('Personio', 'https://www.owned.example/');
      let found = await detect({ website: 'https://owned.example/' });
      assert(found?.ats === 'Personio' && found.count === 1, 'owned Personio board accepted');
      globalThis.fetch = mockSecondary('Personio', null);
      assert(!(await detect({ website: 'https://owned.example/' }))?.count, 'Personio without owner rejected');
      globalThis.fetch = mockSecondary('Personio', 'https://other.example/');
      assert(!(await detect({ website: 'https://owned.example/' }))?.count, 'Personio owner mismatch rejected');

      globalThis.fetch = mockSecondary('Recruitee', 'https://www.owned.example/jobs');
      found = await detect({ website: 'https://owned.example/' });
      assert(found?.ats === 'Recruitee' && found.count === 1, 'owned Recruitee board accepted');
      globalThis.fetch = mockSecondary('Recruitee', null);
      assert(!(await detect({ website: 'https://owned.example/' }))?.count, 'Recruitee without owner rejected');

      globalThis.fetch = mockSecondary('SmartRecruiters', 'https://owned.example/');
      found = await detect({ website: 'https://owned.example/' });
      assert(found?.ats === 'SmartRecruiters' && found.count === 1, 'owned SmartRecruiters board accepted');
      globalThis.fetch = mockSecondary('SmartRecruiters', null);
      assert(!(await detect({ website: 'https://owned.example/' }))?.count, 'SmartRecruiters without owner rejected');
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
  // AR-08: residual batch 3 (ledger-driven 2026-08-14)
  assert(categorizeRole('Tech Lead, Agent Framework - Observability') === 'engineering', 'tech lead → engineering');
  assert(categorizeRole('Hardware Systems Technical Lead') === 'engineering', 'technical lead → engineering');
  assert(categorizeRole('Eng Manager') === 'engineering', 'eng manager (abbrev) → engineering');
  assert(categorizeRole('Administrative Business Partner - Security') === 'operations', 'admin business partner → operations');
  assert(categorizeRole("Founder's Associate") === 'operations', "founder's associate → operations");
  assert(categorizeRole('Founders Associate') === 'operations', 'founders associate → operations');
  assert(categorizeRole("Founder's Office") === 'operations', "founder's office → operations");
  assert(categorizeRole('Senior Solution Advisor') === 'sales', 'solution advisor → sales');
  assert(categorizeRole('Value Consultant') === 'sales', 'value consultant → sales');
  assert(categorizeRole('Channel Manager, DACH [German Fluency]') === 'sales', 'channel manager → sales');
  assert(categorizeRole('People Relations Specialist') === 'people', 'people relations → people');
  assert(categorizeRole('Senior Candidate Experience Coordinator') === 'people', 'candidate experience → people');
  assert(categorizeRole('Accounts Payable Manager') === 'finance/legal', 'accounts payable → finance');
  assert(categorizeRole('IT Internal Auditor') === 'finance/legal', 'internal auditor → finance');
  assert(categorizeRole('SEC Reporting Manager') === 'finance/legal', 'sec reporting → finance');
  assert(categorizeRole('Business Intelligence Manager') === 'ai/data', 'business intelligence → ai/data');
  assert(categorizeRole('Copywriter') === 'marketing', 'copywriter → marketing');
  assert(categorizeRole('Copywriting Lead') === 'marketing', 'copywriting lead → marketing (not eng tech-lead)');
  assert(categorizeRole('Video Editor') === 'marketing', 'video editor → marketing');
  assert(categorizeRole('Art Director') === 'design', 'art director → design');
  assert(categorizeRole('Maintenance Technician') === 'other', 'field technician stays other');
  assert(categorizeRole('Plumber') === 'other', 'trade role stays other');
  assert(categorizeRole('Don’t see what you’re looking for?') === 'other', 'catch-all posting stays other');
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
  // A failed read must never be recorded as an empty board. 404 means this slug is not on this
  // provider (the normal answer for six of seven probes); 429/5xx/timeout mean we learned nothing.
  // The whole host is a legitimate board slug and must survive intact — stripping the dot yields
  // `ambientai`, which is nobody's board. Verified live: slug `ambient` 404s, `ambient.ai` returns
  // ten open roles.
  // A board we already verified is the strongest hint about where the board is, and it is often
  // underivable from the domain: ashbyhq.com/cursor belongs to anysphere.inc, and Alembic has a
  // board with no website at all. Re-deriving from the domain every run discarded that evidence.
  // Owner aliases are confirmed by reading both sites, never by name similarity. These three were;
  // ten others that looked just as obvious were not, and are refused on purpose.
  assert(sameWebsiteOwner('https://www.authy.com/', 'https://twilio.com/'), 'acquisition alias holds');
  assert(sameWebsiteOwner('https://thru.org/', 'https://untolabs.com/'), 'stated-parent alias holds');
  assert(!sameWebsiteOwner('https://arlo1.com/', 'https://joinarlo.com/'), 'drone tracking is not health insurance');
  assert(!sameWebsiteOwner('https://weaveos.com/', 'https://www.getweave.com/'), 'engineering metrics is not a phone platform');
  assert(!sameWebsiteOwner('https://joinminerva.ai/', 'https://minerva.io/'), 'a shared brand is not a shared company');
  assert(knownBoardSlug({ jobsUrl: 'https://jobs.ashbyhq.com/cursor' }) === 'cursor', 'known Ashby board slug is recovered');
  // A row whose id IS the board: the identity and the attribution are one fact, so owner evidence
  // has nothing to adjudicate. Exact host and path only.
  // PR3: what happened on a read, and the difference between empty and unknown.
  assert(worstAttempt(['ok']) === 'ok', 'a clean read is ok');
  assert(worstAttempt(['missing','ok']) === 'missing', 'a definitive 404 outranks a success on another provider');
  assert(worstAttempt(['missing','rate_limited']) === 'rate_limited', 'a rate limit is the most informative outcome');
  assert(worstAttempt(['missing','error']) === 'error', 'a server error outranks a missing board');
  assert(worstAttempt([]) === null, 'no attempt recorded is null, never ok — the kernel reads null as unknown');
  assert(worstAttempt(['error','rate_limited']) === 'rate_limited', 'severity order is stable regardless of arrival order');
  assert(idIsThisBoard({ id: 'hn:jobs.ashbyhq.com/baseten' }, { jobsUrl: 'https://jobs.ashbyhq.com/baseten' }), 'a board-derived id vouches for its own board');
  assert(!idIsThisBoard({ id: 'hn:jobs.ashbyhq.com/baseten' }, { jobsUrl: 'https://jobs.ashbyhq.com/someoneelse' }), 'and not for a different board on the same provider');
  assert(!idIsThisBoard({ id: 'yc:acme', website: 'https://acme.com/' }, { jobsUrl: 'https://jobs.ashbyhq.com/acme' }), 'a YC row still has to satisfy the owner rule');
  assert(!idIsThisBoard({ id: 'hn:acme.com' }, { jobsUrl: 'https://jobs.ashbyhq.com/acme' }), 'a website-derived hn id is not a board voucher');
  assert(knownBoardSlug({ jobsUrl: 'https://boards.greenhouse.io/acme' }) === 'acme', 'known Greenhouse board slug is recovered');
  assert(knownBoardSlug({ jobsUrl: 'https://www.ycombinator.com/companies/acme/jobs' }) === null, 'a YC jobs page is not a board');
  assert(knownBoardSlug({ jobsUrl: 'https://evil.example/acme' }) === null, 'only public ATS hosts are trusted as hints');
  assert(knownBoardSlug({}) === null && knownBoardSlug(null) === null, 'no board, no hint');
  assert(slugs({ website: 'https://ambient.ai/' }).includes('ambient.ai'), 'full host is offered as a slug');
  assert(slugs({ website: 'https://ambient.ai/' }).includes('ambient'), 'and the domain label still is');
  assert(!slugs({ website: 'https://ambient.ai/' }).includes('ambientai'), 'a dot-stripped host is not a slug');
  assert(slugs({ website: null }).length === 0, 'no website, no slugs');
  assert(slugs({ website: 'https://x.io/' }).every((s) => s.length >= 3), 'slug floor holds');
  assert(isDefinitiveAbsence(404) && isDefinitiveAbsence(410), 'a missing board is real evidence');
  assert(!isDefinitiveAbsence(429) && !isDefinitiveAbsence(500) && !isDefinitiveAbsence(503),
    'rate limits and server errors prove nothing about a board');
  // The carry window: a count survives a failed read only while it is still recent, and a run
  // that cannot read a board for two weeks stops claiming its roles rather than advertising forever.
  assert(withinStaleWindow('2026-08-10', '2026-08-16'), 'a recent count survives an unreadable run');
  assert(!withinStaleWindow('2026-07-01', '2026-08-16'), 'a count past the window is dropped, not carried');
  assert(!withinStaleWindow(null, '2026-08-16') && !withinStaleWindow('2026-08-10', null),
    'a count with no confirmed date is never carried');
  // The five row projections. Until 2026-08-17 these lived inside `if (isMain)` and only the run
  // itself could reach them, so the YC branch stamped a date onto a row it had read nothing for and
  // no assertion existed to notice. `openRolesAt` is what downstream reads as "we watched this
  // board", so which branches may write it is the whole contract.
  const stamps = { at: '2026-08-17', attemptAt: '2026-08-17T08:00:00.000Z' };
  const ycRow = {
    id: 'yc:linkonly',
    name: 'LinkOnly',
    website: 'https://linkonly.example/',
    hiring: 'yes',
    sourceUrl: 'https://www.ycombinator.com/companies/linkonly',
    tags: ['yc'],
  };
  const linked = projectJobRow(ycRow, null, stamps).row;
  assert(linked.jobsSource === 'YC' && /ycombinator\.com/.test(linked.jobsUrl), 'a YC-hiring company still gets its directory link');
  assert(linked.openRolesAt === undefined, 'but a link is not an observation — no date is written');
  assert(linked.openRoles === undefined && linked.lastAttempt === undefined, 'and no count, and no attempt we did not make');
  const read = projectJobRow(ycRow, { count: 4, ats: 'Lever', jobsUrl: 'https://jobs.lever.co/linkonly', roleMix: { engineering: 4 } }, stamps).row;
  assert(read.openRoles === 4 && read.openRolesAt === '2026-08-17' && read.lastAttempt === 'ok', 'a real read writes count, date and ok');
  const emptied = projectJobRow(ycRow, { verifiedEmpty: true, ats: 'Lever', jobsUrl: 'https://jobs.lever.co/linkonly', lastAttempt: 'ok' }, stamps);
  assert(emptied.verifiedEmpty && emptied.row.openRoles === 0 && emptied.row.lastAttempt === 'ok', 'a board read empty is the only path that writes a zero');
  const carried = projectJobRow(
    { ...ycRow, openRoles: 7, atsSource: 'Lever', jobsUrl: 'https://jobs.lever.co/linkonly', openRolesAt: '2026-08-14' },
    { unreachable: true, lastAttempt: 'rate_limited' },
    stamps,
  );
  assert(carried.carriedUnreachable && carried.row.openRoles === 7, 'an unreadable run keeps the last verified count');
  assert(carried.row.openRolesAt === '2026-08-14' && carried.row.openRolesStale === true,
    'with the date it was actually verified, marked stale — never restamped as fresh');
  assert(carried.row.lastAttempt === 'rate_limited', 'and says what actually happened on the read');
  /* The one count this codebase treats as a fact is zero, so the gate in front of it matters more
     than the rest. Measured 2026-08-17: SmartRecruiters answers HTTP 200 with
     {"totalFound":0,"content":[]} for a slug belonging to nobody, where six other providers 404.
     Without this guard, every slug guess against that provider manufactures a verified-empty board
     and publishes "this company is hiring nobody" about a business whose board we never found. */
  assert(acceptsVerifiedEmpty({ jobsUrl: 'https://jobs.lever.co/acme' }, 'acme'),
    'the board we already verified may report itself empty');
  assert(!acceptsVerifiedEmpty({ jobsUrl: 'https://jobs.smartrecruiters.com/acme' }, 'someone-else'),
    'an empty board on a guessed slug is not this company reporting no roles');
  assert(!acceptsVerifiedEmpty({ jobsUrl: 'https://jobs.lever.co/acme' }, null),
    'with no previously verified board there is nothing an empty read can confirm');
  assert(!acceptsVerifiedEmpty(null, 'acme'), 'no empty board, nothing to accept');
  assert(!acceptsVerifiedEmpty({}, 'acme'), 'an empty-board record with no URL proves nothing');

  const nothing = projectJobRow({ id: 'yc:quiet', name: 'Quiet', website: 'https://quiet.example/' }, { lastAttempt: 'error' }, stamps).row;
  assert(nothing.openRolesAt === undefined && nothing.lastAttempt === 'error', 'no board and not YC-hiring still records the failed attempt');
  // The stamp repair: touch the dateless rows, leave everything else byte-identical, converge.
  const before = [
    { id: 'yc:link', jobsSource: 'YC', openRolesAt: '2026-08-17', hiring: 'yes' },
    { id: 'yc:counted', openRoles: 3, atsSource: 'Lever', openRolesAt: '2026-08-17' },
    { id: 'yc:empty', openRoles: 0, atsSource: 'Lever', openRolesAt: '2026-08-17' },
    { id: 'yc:none', hiring: 'yes' },
  ];
  const repaired = repairStampedRows(before);
  assert(repaired.touched.length === 1 && repaired.touched[0].id === 'yc:link', 'only the dateless row is touched');
  assert(repaired.rows[0].openRolesAt === undefined && repaired.rows[0].hiring === 'yes', 'and only its stamp is removed');
  assert(repaired.rows[1].openRolesAt === '2026-08-17' && repaired.rows[2].openRolesAt === '2026-08-17',
    'a counted board keeps its date — and so does a board read and found empty');
  assert(repairStampedRows(repaired.rows).touched.length === 0, 'running the repair twice is a no-op');
  // The https upgrade rule, without a network. Only an answer earns the rewrite.
  const httpsCases = [
    ['http://acme.example/', { ok: true, finalUrl: 'https://acme.example/' }, 'https://acme.example/', 'an https answer on the same host upgrades'],
    ['http://acme.example/', { ok: false, reason: 'fetch failed' }, null, 'no answer, no upgrade'],
    ['http://acme.example/', { ok: true, finalUrl: 'http://acme.example/' }, null, 'an http answer is not an https site'],
    ['http://acme.example/', { ok: true, finalUrl: 'https://someone-else.example/' }, null, 'a redirect off-host is a different company, not an upgrade'],
    ['http://acme.example/', { ok: true, finalUrl: 'https://ACME.example/' }, 'https://acme.example/', 'host comparison is case-insensitive'],
    ['http://www.acme.example/', { ok: true, finalUrl: 'https://acme.example/' }, 'https://www.acme.example/', 'a site canonicalising away www is the same site'],
    ['http://acme.example/', { ok: true, finalUrl: 'https://www.acme.example/' }, 'https://acme.example/', 'and the same in the other direction'],
    ['http://acme.example/', { ok: true, finalUrl: 'https://app.acme.example/' }, null, 'but a subdomain is another page, not a canonical form'],
    ['https://acme.example/', { ok: true, finalUrl: 'https://acme.example/' }, null, 'an https row is left alone'],
    ['not a url', { ok: true, finalUrl: 'https://acme.example/' }, null, 'an unparseable row is left alone'],
  ];
  for (const [from, probe, want, why] of httpsCases) {
    const verdict = httpsUpgradeVerdict(from, probe);
    const got = verdict.upgrade ? verdict.url : null;
    if (got !== want) throw new Error(`httpsUpgradeVerdict(${from}) = ${got}, want ${want} — ${why}`);
  }
  // The path and query survive; only the scheme moves.
  const kept = httpsUpgradeVerdict('http://acme.example/careers?src=yc', { ok: true, finalUrl: 'https://acme.example/' });
  assert(kept.url === 'https://acme.example/careers?src=yc', 'only the scheme changes — the path a source gave us is not ours to drop');
  // Opt-out: a stated preference, read from its own file and never confused with a denylist.
  const optDir = fs.mkdtempSync(path.join('/tmp', 'dg-optout-'));
  try {
    const optFile = path.join(optDir, 'optout.json');
    assert(loadDirectoryOptOuts(optFile).size === 0, 'no file means no opt-outs, not an error');
    fs.writeFileSync(optFile, JSON.stringify({ schema: 'demigod.directory-optout/1', entries: [{ companyId: 'yc:quiet-please', requestedAt: '2026-08-17', recordedBy: 'operator' }] }));
    const loaded = loadDirectoryOptOuts(optFile);
    assert(loaded.has('yc:quiet-please') && loaded.size === 1, 'an opt-out entry is loaded by company id');
    fs.writeFileSync(optFile, JSON.stringify({ schema: 'wrong', entries: [{ companyId: 'yc:quiet-please' }] }));
    assert(loadDirectoryOptOuts(optFile).size === 0, 'a foreign schema honours nothing rather than guessing');
    fs.writeFileSync(optFile, 'not json at all');
    let threw = false;
    try { loadDirectoryOptOuts(optFile); } catch { threw = true; }
    assert(threw, 'an unreadable opt-out file must fail loudly — silently ignoring one is the worst outcome here');
  } finally {
    fs.rmSync(optDir, { recursive: true, force: true });
  }
  assert(!withinStaleWindow('2026-08-20', '2026-08-16'), 'a future stamp is not evidence');
  console.log(JSON.stringify({ ok: true, selftest: 'location-gate + slug-honesty + import-safe' }));
  process.exit(0);
}

if (isMain) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const repairDenied = cliMode === 'repair-denied';
  const at = repairDenied
    ? map.coverage?.openRolesAt || new Date().toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  if (cliMode === 'upgrade-https') {
    const httpRows = map.companies.filter((c) => String(c?.website || '').startsWith('http://'));
    // Their own marketing sites, one HEAD-ish GET each, at the same polite concurrency the board
    // reads use. Nothing here touches an ATS.
    const probes = await pool(httpRows, async (company) => {
      const target = String(company.website).replace(/^http:/, 'https:');
      try {
        const response = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
        return { ok: response.ok, finalUrl: response.url || target, status: response.status };
      } catch (error) {
        return { ok: false, reason: String(error?.message || error).slice(0, 60) };
      }
    });
    const upgraded = [];
    const refused = {};
    map.companies = map.companies.map((company) => {
      const index = httpRows.indexOf(company);
      if (index === -1) return company;
      const verdict = httpsUpgradeVerdict(company.website, probes[index]);
      if (!verdict.upgrade) {
        refused[verdict.reason] = (refused[verdict.reason] || 0) + 1;
        return company;
      }
      upgraded.push({ id: company.id || null, from: company.website, to: verdict.url });
      return { ...company, website: verdict.url };
    });
    atomicWrite(MAP, `${JSON.stringify(map)}\n`);
    console.log(JSON.stringify({
      ok: true,
      checked: httpRows.length,
      upgraded: upgraded.length,
      // Never silent: a site that refused the upgrade says why, and stays http rather than being
      // quietly rewritten to a scheme it did not answer on.
      refused,
      sample: upgraded.slice(0, 5),
    }, null, 2));
    process.exit(0);
  }
  if (cliMode === 'repair-stamps') {
    // Coverage keeps the date of the run that actually read the boards. Restamping it here would
    // launder a field repair as a fresh crawl, which is the same lie in a different field.
    const coverageAt = map.coverage?.openRolesAt || at;
    const { rows, touched } = repairStampedRows(map.companies);
    map.companies = rows;
    const coverage = updateJobsCoverage(map, coverageAt);
    atomicWrite(MAP, `${JSON.stringify(map)}\n`);
    console.log(JSON.stringify({ ok: true, repaired: touched.length, coverage, at: coverageAt, sample: touched.slice(0, 5) }, null, 2));
    process.exit(0);
  }
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
  const optedOut = loadDirectoryOptOuts();
  const results = await pool(map.companies, async (c) => {
    // Never probe a board for a company that asked not to be listed. Skipping here rather than
    // discarding the result afterwards is the point: the request is to stop reading, not to read
    // and then be discreet about it.
    if (optedOut.has(String(c?.id || ''))) return null;
    // No website used to mean no board, because slugs() derives only from the domain. A company we
    // have already read a board for is the exception — Alembic has no verified website and a known
    // Ashby board, and was skipped before it could be probed.
    if (!c.website && !knownBoardSlug(c)) return null;
    return detect(c);
  });
  let carriedUnreachable = 0;
  let verifiedEmpty = 0;
  const attemptAt = new Date().toISOString();
  let optedOutRows = 0;
  map.companies = map.companies.map((c, idx) => {
    if (optedOut.has(String(c?.id || ''))) {
      optedOutRows++;
      return { ...withoutJobEvidence(c), directoryOptOut: true };
    }
    const projected = projectJobRow(c, results[idx], { at, attemptAt });
    if (projected.carriedUnreachable) carriedUnreachable++;
    if (projected.verifiedEmpty) verifiedEmpty++;
    return projected.row;
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
      { companies: map.companies.length, withJobs: hits, ycJobsLinks: ycLinks, totalOpenRoles: totalRoles,
        // Never silent: a run that could not read N boards says so, so an operator can retry
        // instead of reading a quiet number as a market that cooled.
        boardsUnreadableCarriedStale: carriedUnreachable,
        // Boards we READ that had no US-posted roles. Distinct from "no board found" — this is the
        // only path that writes openRoles: 0, and the count makes it visible rather than implied.
        boardsVerifiedEmpty: verifiedEmpty,
        // Never silent: a run that honoured N opt-outs says so, so a drop in coverage has an
        // explanation that is not "the market cooled".
        directoryOptOuts: optedOutRows,
        at,
        scope: 'us-posted',
        /* withoutJobEvidence strips the aging annotations along with the rest of the job evidence,
           and only demigod-directory-aging.mjs puts them back. Running this command on its own
           therefore leaves the directory with no "posted 90–365 days ago" line until that runs —
           silent, and caught on 2026-08-17 only because directory-static's selftest asserts the
           line exists. The next step is part of the result, so it is printed with it. */
        next: 'node demigod-directory-aging.mjs --enrich-map  # restores the aging annotations this run stripped',
      },
      null,
      2,
    ),
  );
}
