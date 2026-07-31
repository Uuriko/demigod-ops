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

const MAP = '/home/potter/DEMIGOD-SF-STARTUP-MAP.json';
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

export function hnSourceBoard(company) {
  if (company?.jobsSource !== 'HN') return null;
  try {
    const url = new URL(String(company.jobsUrl || ''));
    const provider = {
      'boards.greenhouse.io': 'Greenhouse',
      'job-boards.greenhouse.io': 'Greenhouse',
      'job-boards.eu.greenhouse.io': 'Greenhouse',
      'jobs.lever.co': 'Lever',
      'jobs.ashbyhq.com': 'Ashby',
      'jobs.gem.com': null,
    }[url.hostname.toLowerCase()];
    const slug = url.pathname.split('/').filter(Boolean)[0];
    if (url.protocol !== 'https:' || provider === undefined || !/^[a-z0-9._-]+$/i.test(slug || '')) return null;
    return { jobsUrl: `https://${url.hostname.toLowerCase()}/${slug.toLowerCase()}`, provider, slug: slug.toLowerCase() };
  } catch {
    return null;
  }
}

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
  // Batch 15–16: product director/strategy/generalist/leadership + FR chef de produit + product dev mgr.
  // Batch 20: concepteur de produits.
  if (
    /\b(product manager|product management|product owner|\bpm\b|technical product|head of product|director of product|director, product|vp of product|vp, product|vice president of product|product leader|product lead|product leadership|product director|product strategy|product generalist|product development (?:specialist|manager)|product acceleration|chef de produit|concepteur de produits?|tokens?-as-a-service|\btaas\b|0\s*[→\->]\s*1 product|product line specialist)\b/.test(
      t,
    ) ||
    // "Manager, Product - Code" PM craft — not "Manager, Product Security" (eng below).
    (/\bmanager,?\s+product\b/.test(t) && !/\bproduct\s+security\b/.test(t)) ||
    // Batch 24: new-products strategy + monetization leadership when monetization is the role craft
    // (not "Designer, Monetization" / "Communications Manager, Monetization" side-tags).
    /\bnew products? strategy\b/.test(t) ||
    /\b(?:director|head|vp|vice president),?\s*(?:of\s+)?monetization\b|\bhead of monetization\b|\bmonetization\s+(?:director|manager|lead)\b/.test(
      t,
    )
  ) {
    return 'product';
  }
  // SDR/BDR is sales even when title includes "AI-Native" (bare \bai\b would false-friend).
  if (/\b(?:sales )?development representative\b|\bsdr\b|\bbdr\b/.test(t)) {
    return 'sales';
  }
  if (
    /\b(data scientist|data science|machine learning|\bml\b|\bai\b|deep learning|\bnlp\b|computer vision|research scientist|applied scientist|data engineer|analytics engineer|data analyst|product analyst|business intelligence|\bbi\b|analytics lead|advanced analytics|measurement science|director of data|head of data|insight analyst|behavioral scientist|data annotation|data collector|annotators?|agent post-training|data automation|data insights|data\s*(?:&|and)\s*insights|strategy\s*(?:&|and)\s*analytics|\bstatistician\b|data understanding|performance modeling|field analytics)\b/.test(
      t,
    ) ||
    // "Insights Analyst" (plural) is analytics craft; marketing insights stays marketing (below).
    (/\binsights analyst\b/.test(t) && !/\bmarketing\b/.test(t)) ||
    // AI-lab research titles only when paired with ML/RL/LLM signals (wet-lab "research associate" stays other)
    (/\bresearch (?:associate|manager|lead|staff)\b/.test(t) &&
      /\b(?:\brl\b|interpretability|\bllm\b|llms?|machine learning|\bnlp\b|\bai\b|\bml\b|data science)\b/.test(t)) ||
    // Frontier-lab researcher craft (alignment/evals/training/cyber) — wet-lab biology risks stay other
    // Note: "Researcher, Frontier Biological..." stays other (wet-lab/biosecurity canary) — not frontier biological.
    /\bresearcher,\s*(?:alignment|interpretability|pretraining|mid-training|post-training|safety|training|robustness|misalignment|synthetic|evals?|frontier cybersecurity|recursive self-improvement)\b/.test(t) ||
    /\bresearch,\s*(?:evals?|mid-training|post-training|pretraining)\b/.test(t) ||
    // Batch 22: training-insights / inference research leads; RL fellows; RE/RS search track; memory lead
    /\bresearch lead,\s*training insights\b|\btl,?\s*research inference\b|\banthropic fellows program,?\s*reinforcement learning\b|\bre\s*\/\s*rs\b.*\b(?:foundations|search)\b|\boperating memory lead\b/.test(t)
  ) {
    return 'ai/data';
  }
  // DevRel / tech writing / product marketing before eng bucket
  // Batch 15–16: copywriter + PR director + demand/lifecycle strategist + ad campaign.
  if (
    /\b(developer advocate|developer relations|\bdevrel\b|technical writer|docs engineer|documentation engineer|product market(?:er|ing)|media analytics|influencer|corporate communication|copy lead|copywriter|copywriting|social measurement|pr director|head of pr|corporate pr|head of social|ad campaign|demand strategist|lifecycle strategist)\b/.test(
      t,
    )
  ) {
    return 'marketing';
  }
  // Creative/design leadership before eng (avoids "design" false friends on non-design titles)
  // Batch 16: video producer / character artist (non-product craft stays design).
  // Batch 19: game director + creative manager.
  // Batch 20: prototype & design craft.
  // Batch 22: color design, motion producer, photo editing, user-research co-op.
  if (
    /\b(head of design|creative director|art director|head of creative|associate creative director|product creative|video editor|creative producer|video producer|character artist|game director|creative manager|prototype\s*(?:&|and)\s*design|color design|video\s*(?:&|and)\s*motion producer|photo editing|user research co-op)\b/.test(
      t,
    ) ||
    // Batch 26: CoDesign craft (not eng "design engineer").
    (/\bcodesign\b|\bco-design\b/.test(t) && !/\bengineer\b/.test(t)) ||
    // Batch 27: visual journalist + film script supervisor (photo/video craft; actors stay other).
    /\bvisual journalist\b|\bscript supervisor\b/.test(t)
  ) {
    return 'design';
  }
  // TPM craft is ops (program delivery) — before eng so "TPM, Infrastructure" does not eng-false-friend.
  if (/\btechnical program (?:manager|management)\b|\b\btpm\b/.test(t)) {
    return 'operations';
  }
  // Security product eng stays engineering; pure GRC/compliance (no eng title) → finance/legal
  // Batch 15–16: CISO / detection&response / cyber specialist / detection researcher.
  // Batch 17: IAM craft.
  if (
    /\b(security engineers?|application security|appsec|detection engineer|detection researcher|security software|security platform|product security|security architecture|threat detection|threat assessment|red team|offensive security|\bciso\b|chief information security|head of (?:information )?security|detection and response|cyber specialist)\b/.test(
      t,
    ) ||
    /\b(?:information technology|data center)\b.*\bsecurity\b|\bsecurity\b.*\b(?:information technology|data center)\b|\bit\b\s*(?:&|and)\s*security\b/.test(
      t,
    ) ||
    // AR-08 batch 8–10: threat-intel craft, product tech specialists, pen-test / red teaming
    /\b(?:threat intel|cyber threat|technical (?:cbrn|cyber)[- ]?e?\s*threat|threat investigator|threat modeler|penetration tester|pen tester|red teaming)\b/.test(t) ||
    (/\btechnical specialist\b/.test(t) && /\bclaude\b/.test(t)) ||
    /\bidentity\s*(?:&|and)\s*access management\b|\biam\b/.test(t) ||
    // Batch 21: cyber integration craft (gov/customer cyber delivery stays eng).
    /\bcyber integration\b/.test(t)
  ) {
    return 'engineering';
  }
  // engineering manager / architect / bare "engineering" (title noun) before residual people/sales
  // Batch 9–12: technical lead, IT director, hardware TLs, technical staff, release qualification.
  // Batch 15–16: plural craft, SDE, salesforce admin, network systems tech.
  // Batch 17: QA associate (non-textile), avionics/electrical integration hardware craft.
  // Batch 18: reliability design, technical quality specialist (non-textile).
  // Batch 20: core development leadership, solution specialist (identity/IAM-adjacent craft).
  // Batch 22: engineeer typo; applications mgr; security analysts; hardware/MES; tech interns; connectivity.
  if (
    /\b(engineers?|engineeer|developers?|developper|\bswe\b|\bsde\b|\bsdet\b|programmer|programming|applications? (?:development|engineers?|manager)|software|devops|\bsre\b|infrastructure|backend|frontend|full[\s-]?stack|mobile|\bios\b|android|platform|engineering|solutions architects?(?:ure)?|\barchitects?\b|tech lead|technical lead|\btlm\b|member of technical staff|technical staff|systems? administrator|system admin|salesforce administrator|\bit\b systems|network systems technician|insider threat|test (?:specialist|technician)|director of it|director,?\s*it\b|head of it|it director|it specialist|release qualification|neuroengineer|design technologist|qa (?:lead|manager|interns?|associate|analyst|engineer)|electrical integration|avionics|reliability design|technical quality specialist|core development|solution specialist|security analyst|security preparedness|manufacturing execution system|hardware exploratory|technical connectivity specialist|physical security systems|working student integrations?)\b/.test(
      t,
    ) ||
    /\b(?:power electronics|rf integration)\b.*\bteam lead\b|\bteam lead\b.*\b(?:power electronics|rf)\b/.test(t) ||
    (/\bquality assurance\b/.test(t) && !/\b(?:textile|knit|apparel|garment|fabric)\b/.test(t)) ||
    /\bsenior manager,?\s*it\b/.test(t) ||
    /\bsr\.?\s*director,?\s*security\b/.test(t) ||
    /\b(?:robot optics|power electronics|antenna|reliability test)\s+intern\b/.test(t) ||
    /\bassembly,\s*integration,\s*and\s*test intern\b/.test(t) ||
    // Batch 23: security&IT general opps; robotics prototyping lab tech.
    /\bsecurity\s*(?:&|and)\s*it\b/.test(t) ||
    /\bprototyping lab technician\b/.test(t) ||
    // Batch 25: FPGA craft (associate/intern without "engineer" token).
    /\bfpga\b/.test(t)
  ) {
    return 'engineering';
  }
  if (
    /\b(designer|\bux\b|\bui\b|product design|brand|graphic|design systems?|experience researcher|user researcher|ux researcher)\b/.test(
      t,
    )
  ) {
    return 'design';
  }
  // Presales/PS consultants + sellers (not bare "consultant" — jewelry/store stays other)
  // "acquisition manager" is GTM; talent acquisition is people (above).
  // Batch 8: common AE typo "acount", AE managers, strategic deals, customer business exec;
  // "head of business" GTM only — not "head of business operations" (ops).
  // Batch 9–11: head of channel; client RMs; bare market manager; territory sales.
  // Batch 15–16: bare GTM, AVP/country, RVP, director enterprise, field/tech enablement, field CTO.
  // Batch 17: alliance manager, value consultant, PS managers, strategic customer advisor, FDE, EM leads.
  // Batch 18: field CTOs plural, pipeline excellence, deal strategy.
  // Batch 19: relationship mgmt, client development, CRM lead, expansion, publisher, velocity enablement.
  // Batch 20: acquisitions head, partner management, commercial strategy, market lead, alliance partners.
  // Batch 22: territory/agency/GSI/adoption/payments strategists; country heads; presales (non-eng);
  // JP solutions architect; district/field activation; market associate/coordinator.
  if (
    /\b(sales|account executive|\bacount executive\b|\bae\b|account manager|accounts? management|account director|account associate|account strategist|account development|key accounts?|strategic accounts?|account partner|business development|\bbdr\b|\bsdr\b|market development representative|development representative|new business associate|revenue|partnerships?|solutions engineer|sales engineer|customer engineer|founding gtm|gtm strategy|gtm planning|gtm presales|specialist sellers?|solutions? consultant|solutions? consulting|solution advisor|solution scientist|solution advisory|technical consultant|professional services(?: consultant| manager| lead)?|value consultants?|partner development|partner manager|partner director|partner enablement|partner lead|partner management|partner business manager|strategic partner|client partner|client manager|client relationship management|client development|relationship management|enterprise accounts?|renewals? (?:manager|leader)|channel manager|head of channel|channel co-sell|acquisition manager|head of acquisitions|industry manager|technical solutions|services solutions|solutions partner|ads solutions|pipeline strategy|pipeline excellence|deal strategy|deal lead|deal strategist|commercial strategy|strategic pursuits|global alliance|alliance (?:lead|manager|rvp)|alliances|alliance partners|label relations|field enablement|technical enablement|velocity enablement|country director|country manager|area vice president|\brvp\b|account executives|strategic deals|customer business executive|regional vice president|territory (?:director|manager|executive)|expert marketplace|forward deployed|\bfde\b|abm lead|capture lead|director,?\s+enterprise\b|head of solutions|head of demand engine|head of enterprise|field ctos?|strategic customer advisors?|emerging markets? lead|emerging enterprise|sase specialists?|\bcrm lead\b|publisher development|expansion lead|market lead|agency development lead|agency partner|data cloud partners|product adoption strategist|payments performance strategist|premium\s*(?:&|and)\s*wealth|retail\s*(?:&|and)\s*consumer goods|accenture (?:lead|business group)|field activation|global system integrator|\bdirector gsi\b)\b/.test(
      t,
    ) ||
    // Bare GTM / go-to-market is sales craft; gtm enablement/ops stay operations (matched later).
    (/\b(?:go[-\s]?to[-\s]?market|\bgtm\b)/.test(t) && !/\bgtm\s+(?:enablement|ops|operations)\b/.test(t)) ||
    /\bregional director\b.*\b(?:enterprise|mid-market|mid market)\b|\b(?:enterprise|mid-market|mid market)\b.*\bregional director\b|\bpartner\b.*\balliances\b|\balliances\b.*\bpartner\b/.test(
      t,
    ) ||
    // Field-facing enablement (not customer enablement → ops; not skills/leadership → people).
    (/\benablement\b/.test(t) && /\bfield\b/.test(t) && !/\bcustomer enablement\b/.test(t)) ||
    /\bhead of business\b(?!\s+operations)/.test(t) ||
    (/\brelationship manager\b/.test(t) && !/\bvendor\b/.test(t)) ||
    (/\bmarket manager\b/.test(t) && !/\b(?:hotels?|vacation|rentals?|luxe)\b/.test(t)) ||
    (/\bmarket (?:associate|coordinator)\b/.test(t) && !/\b(?:hotels?|vacation|rentals?|luxe)\b/.test(t)) ||
    // Presales GTM without eng craft (presales customer engineer / SA stay eng above).
    (/\bpresales\b/.test(t) && !/\b(?:engineer|architect)\b/.test(t)) ||
    /\bhead of (?:germany|uk|southern europe)\b/.test(t) ||
    /\bassociate manager,?\s*sam\b/.test(t) ||
    /\b(?:sr\.?\s*)?district manager\b/.test(t) ||
    (/\boffice of the cro\b/.test(t) && /\b(?:engagement|executive)\b/.test(t)) ||
    /ソリューションアーキテクト|デリバリーソリューションアーキテクト/.test(title) ||
    // Batch 23: education/TAM GTM; commercial planning; consulting/resident practice; agent strategists;
    // global expansion strategy; executive business center leads.
    /\bfigma for education\b|\bmanager,?\s*tam\b|\bcommercial planning\b|\bconsulting services\b|\bresident consultants?\b|\blead practice manager\b|\bagent strategist\b|\bglobal expansion strategy\b|\bexecutive business center\b|\bebc lead\b/.test(
      t,
    ) ||
    // Batch 24: pipeline programs GTM; admissions/enrollment advisors.
    /\bpipeline programs?\b|\badmissions advisor\b/.test(t) ||
    // Batch 25: industry principal GTM (life-sciences / vertical solution selling).
    /\bindustry principals?\b/.test(t) ||
    // Batch 27: Field Application Scientist is customer-facing FAS (not wet-lab bench scientist).
    /\bfield application scientists?\b/.test(t)
  ) {
    return 'sales';
  }
  // Batch 22: analyst relations, consumer insights, ad measurement, editors/reporters, social/experiential producers.
  // Batch 24: regional insights specialist craft (not success insights → ops).
  if (
    /\b(marketing|growth|content|\bseo\b|demand gen(?:eration)?|community|social media|communications?|\bmarketer\b|agency lead|customer advocacy|customer advocate|paid media|integrated campaigns|competitive intelligence|media manager|events? manager|events? coordinator|events and experiences|field events|public relations|\bpr manager\b|creator outreach|creative strategist|google ads|microsoft ads|programmatic buying|demand\s*(?:&|and)\s*campaigns|corporate messaging|\beditorial\b|addressability|market research|\bugc\b|webinar|digital events|narrative lead|analyst relations|consumer insights|advertising measurement|creator in residence|social producer|audience development|experiential producer|executive producer|director,?\s*measurement|safety transparency editor|site merchandising|conversion analyst|creator program)\b/.test(
      t,
    ) ||
    /\b(?:managing|senior|deputy managing)\s+editor\b|\breporter\b/.test(t) ||
    (/\binsights specialist\b/.test(t) && !/\bsuccess insights\b/.test(t)) ||
    // Batch 25: insights manager craft (success insights stays ops via ops block).
    (/\binsights manager\b/.test(t) && !/\bsuccess insights\b/.test(t)) ||
    // Batch 26: medical writing is content craft (not clinical practice).
    /\bmedical writing\b/.test(t)
  ) {
    return 'marketing';
  }
  if (
    /\b(?:recruit(?:er|ers|ing|ment)?|talent|people (?:ops|operations|partner)|human resources)\b|(?:^|[^/\w])hr(?:bp)?\b/.test(t) ||
    /\b(?:director,? learning|workforce strategy|technical learning|learning specialist|learning tools|learning\s*(?:&|and)\s*knowledge|immigration specialist|workplace(?:\s*(?:&|and)\s*engagement)?|employee(?:\s*(?:&|and)\s*manager)? experience|manager development|leadership development|change activation|candidate experience|global mobility)\b/.test(
      t,
    ) ||
    // L&D enablement (skills/leadership) — field/tech enablement already sales above.
    (/\benablement\b/.test(t) && /\b(?:skills|leadership|learning)\b/.test(t)) ||
    // Batch 17–18: equity admin / global equity (comp), absence mgmt, team member relations.
    /\bequity admin(?:istrator|istration| analyst)?\b/.test(t) ||
    /\bglobal equity\b/.test(t) ||
    /\babsence management\b/.test(t) ||
    /\b(?:team )?member relations\b/.test(t) ||
    // Batch 19: benefits care + talent sourcing manager (not strategic/procurement sourcing).
    /\bbenefit(?:s)? customer\b/.test(t) ||
    (/\bsourcing manager\b/.test(t) && !/\bstrategic sourcing\b/.test(t)) ||
    // Batch 20: equity leadership (not private equity finance).
    (/\bequity\b/.test(t) &&
      !/\bprivate equity\b/.test(t) &&
      /\b(?:manager|director|admin|lead|analyst|partner)\b/.test(t)) ||
    // Batch 22: training mgr/specialist + head of learning & quality (not eng trainers).
    (/\b(?:senior )?(?:manager|specialist),?\s*(?:of\s+)?training\b|\bhead of learning\b|\blearning\s*(?:&|and)\s*quality\b/.test(t) &&
      !/\b(?:engineer|engineering)\b/.test(t)) ||
    // Batch 23: video people leadership (PeopleOps content org).
    /\bvideo people lead\b/.test(t) ||
    // Batch 24: training specialist word-order (Senior Training Specialist).
    (/\btraining specialist\b/.test(t) && !/\b(?:nuclear|engineer|engineering)\b/.test(t))
  ) {
    return 'people';
  }
  // Split-ish finance/legal: same bucket key for export stability, broader title recall
  // Batch 8: receivables/settlements/Anaplan/gov affairs/controls assurance (not eng security titles).
  // Batch 15–16: AP/AR, pricing strategist, fraud patterns, economist, export controls, quant, claims.
  // Batch 17: FP&A long-form, procure-to-pay, T&E.
  if (
    // Batch 22: product pricing/packaging analysts; contract mgr; funds recon; credit BA; investment lead;
    // regulatory exam; trust&assurance; tech/audit analytics; fraud research (not eng titles).
    /\b(finance|accounting|accountant|controller|fp&a|financial planning\s*(?:&|and)\s*analysis|financial analyst|financial reporting|sec reporting|treasury|payroll|tax|accounts (?:receivable|payable)|\bap\/ar\b|\bap manager\b|bookkeeper|cash application|finops|employment lawyer|chief audit officer|internal audit(?:or)?|internal controls|\bauditor\b|\bsox\b|credit underwriter|credit (?:&|and) collections|collections analyst|collections associate|underwriting|credit risk|investor relations|corporate development|contracts? manager|public policy|security policy|policy manager|policy economist|research economist|\beconomist\b|portfolio manager|subcontracts?|sanctions|fraud (?:investigator|analyst|intelligence|strategy|investigations?|strategist|specialist|patterns|research)|fraud\s*(?:&|and)\s*identity|\baml\b|trade surveillance|surveillance analyst|order[- ]to[- ]cash|order management(?:\s*(?:&|and)\s*billing)?|manager,?\s*billing|custody manager|\bgovernance\b|\brisk\b|settlements?|servicing collections|consolidations?|intercompany|\banaplan\b|government affairs|public affairs|external affairs|state and local affairs|security controls assurance|controls assurance|pricing strateg(?:y|ist)|transaction principal|regulatory affairs|regulatory cmc|regulatory associate|regulatory exam|export controls?|chief financial officer|\bcfo\b|financial crimes|quantitative (?:associate|analyst|intelligence)|head of claims|procure[- ]to[- ]pay|travel\s*(?:&|and)\s*expense|trade advisory|mortgage originations?|\boriginations?\b|ventures partner|government relations|project insurance|capital cost|licensing manager|fuels licensing|business planning\s*(?:&|and)\s*forecasting|business affairs|investment banking|public funding|model policy|product pricing|funds reconciliation|investment lead|trust\s*(?:&|and)\s*assurance|audit analytics|technology audit)\b/.test(
      t,
    ) ||
    // M&A craft (not M&A Integration ops delivery — that stays operations below).
    (/\bm&a\b/.test(t) && !/\bintegration\b/.test(t)) ||
    // Private equity is finance (equity HR craft already returned people above).
    /\bprivate equity\b/.test(t) ||
    /\b(legal|counsel|attorney|paralegal|compliance|privacy counsel|data privacy|grc|governance risk)\b/.test(t) ||
    // Pricing & packaging analysts only — SWE on pricing packaging stay eng above.
    (/\bpricing\s*(?:&|and)\s*packaging\b/.test(t) && !/\b(?:engineer|engineering)\b/.test(t)) ||
    (/\bbusiness analyst\b/.test(t) && /\bcredit\b/.test(t)) ||
    // Batch 23: sourcing analysts (procurement; talent sourcer already people); FCM; internal analysis;
    // national security / global affairs; scientific&regulatory product; business partner analyst.
    (/\bsourcing analyst\b/.test(t) && !/\b(?:talent|recruit)\b/.test(t)) ||
    /\bsenior associate,?\s*fcm\b|\binternal analysis\b|\bnational security lead\b|\bscientific\s*(?:&|and)\s*regulatory\b|\bbusiness partner analyst\b/.test(
      t,
    ) ||
    // Batch 24: special situations + technology audit title order.
    /\bspecial situations\b|\baudit,?\s*technology\b/.test(t)
  ) {
    return 'finance/legal';
  }
  // Security IR / SIRT before residual ops
  if (/\b(?:\bsirt\b|security incident|incident response)\b/.test(t)) return 'engineering';
  // Batch 8–9: installation/DC ops + client delivery / network deployment (eng craft already returned).
  // Batch 15–16: manufacturing floor, founding operator, admin assistants, incident mgr, retention/success.
  // Batch 17: warehouse/HVAC/maintenance, vendor RM, SCM specialist, strategy&execution, RE planning.
  // Batch 18: freight/customs ops, machine shop, manufacturing quality, service delivery, corporate programs.
  // Batch 19: founder's office, intake, inventory, shift, end-user services, production dir, montaje.
  // Batch 20: CS seasonal, supply manager, category mgr, strategic delivery, facilities/fab, site leader.
  // Batch 22: delivery/supply/escalation/guest ops; FR office mgr; merch/client services; physical security;
  // techops (non-eng); experience coordinator (not workplace/candidate people craft); JP back-office.
  if (
    /\b(operations|\bops\b|support|customer success|client success|partner success|technical success|delivery success|technical delivery|customer experience|\bcx\b|\bcsm\b|customer support|customer service|customer enablement|customer education|customer learning|customer retention|customer impact|customer engagement|member success|enterprise success|success insights|technical support|helpdesk|implementation|implementations?|onboarding specialist|onboarding manager|onboarding coordinator|program manager|project manager|project planner|construction planner|chief of staff|office manager|business operations|business strategy|business value|global transformation|\bstrategy lead\b|revops|sales ops|gtm ops|gtm enablement|executive assistant|executive (?:and|&) personal assistant|personal assistant|administrative (?:assistant|business partner)|executive business partner|scrum master|deployment strategist|technical deployment|deployment (?:lead|manager)|\bbizops\b|business systems?(?: analyst)?|systems analyst|application analyst|lead business analyst|case management|deal desk|deal pricing|engagement manager|engagement delivery|delivery manager|strategic projects?|strategic programs?|strategic initiatives|strategic delivery|strategic services|special projects|m&a integration|procurement|strategic sourcing|category manager|supplier enablement|supply chain|supply manager|global supply management|\bscm\b|rfp specialist|proposal manager|technology negotiations|administrative coordinator|founder'?s? associate|founders associate|founding operator|founder in residence|founder intern|founder'?s? office|office of the (?:ceo|founders?)|localization|managed services|safeguards?|trust (?:and|&) safety|abuse investigator|resolutions manager|resolutions lead|strategic resolutions|area manager|production manager|director of production|production (?:lead|supervisor|technician)|installation manager|installation specialist|data center manager|data center design|data center energy|data center logistics|data center compute|general manager,? data centers?|real estate construction|real estate program|real estate strategic planning|client delivery|network deployment|master scheduler|emr success|supply category|head of implementations?|head of manufacturing|capacity planning|technical services|workforce management|intraday workforce|interconnection manager|intelligence production|incident manager|incident and escalation|escalation management|manufacturing (?:associate|technician|intern|process|manager)|material handler|inventory manager|\binventory\b|logistics|warehouses?|almac[eé]n|\bhvac\b|facilities (?:technician|manager|specialist|mechanical)|document control|cnc machinist|lab manager|assembly technician|equipment maintenance|maintenance technician|mantenimiento\b|\bmontaje\b|microfabrication|vendor relationship|vendor performance|strategy\s*(?:&|and)\s*execution|life sciences operator|machine shop|shipping\s*(?:&|and)\s*receiving|fabrication technician|project (?:estimator|controls|delivery|forester)|electrical technician|quality manager|quality control supervisor|customs|air planning|air pricing|ocean planning|trucking|air freight|ocean gateway|service delivery|service advisor|services management|end user services|corporate programs|federal programs|performance center|performance solutions lead|program\s*(?:&|and)\s*experience|fleet intelligence|customer intake|shift supervisor|site leader|field supervisor|industrial management|industrial planning|verifications associate|field onboarding|global delivery excellence|guest services|guest engagement|merchandise planner|client services associate|drone dock|pos installer|planning and programs|outcomes success|trial success|deactivations|user escalation|food experience|land development|physical security specialist|executive protection|travel security|global physical security|global intelligence analyst|protective intelligence|gestionnaire de bureau|gestionnaire,?\s*soutien|gestion des effectifs|gathering programs|internal coordinator|account validation specialist|machinist\/fabrication|clean energy and new technology|strategy and research associate|manager of sustainability)\b/.test(
      t,
    ) ||
    // Network strategy craft for non-intern titles only (interns stay intentional other).
    (/\bnetwork strategy\b/.test(t) && !/\bintern\b/.test(t)) ||
    // Manufacturing quality manager (textile QA already excluded via eng QA path above).
    (/\bquality manager\b/.test(t) && /\bmanufacturing\b/.test(t)) ||
    // TechOps craft without engineer title (TechOps Engineer stays eng above).
    (/\btechops\b/.test(t) && !/\bengineer\b/.test(t)) ||
    // Experience coordinator is ops — workplace/candidate/employee experience is people (above).
    (/\bexperience coordinator\b/.test(t) && !/\b(?:workplace|candidate|employee)\b/.test(t)) ||
    /\bsupervisor,?\s*hosting\b/.test(t) ||
    // Batch 23: technical project management intern (TPM craft) + ES vehicle/telematics install.
    /\btechnical project management intern\b/.test(t) ||
    /especialista en (?:instalaci[oó]n|sistemas)/.test(t) ||
    /バックオフィス/.test(title) ||
    // Batch 24: residual ops craft (patient/auth, QMS/QC, investigations, social impact,
    // startups programs, shared-services enablement, business planning&architecture).
    /\bpatient experience\b|\bauthorization specialist\b|\bqms specialist\b|\bquality control associate\b|\bqa survey\b|\bnuclear training\b|\blaw enforcement\b|\bsocial impact\b|\bstartups? program\b|\bbusiness planning\s*(?:&|and)\s*architecture\b/.test(
      t,
    ) ||
    (/\benablement\b/.test(t) &&
      /\b(?:shared services|experience)\b/.test(t) &&
      !/\b(?:field|customer|skills|leadership|learning|partner|technical|gtm)\b/.test(t)) ||
    // Batch 25: QC abbrev, production associate, escalations craft.
    /\bqc associates?\b|\bproduction associates?\b/.test(t) ||
    /\bescalations?\s+(?:manager|associate|specialist|lead|coordinator|analyst)\b|\b(?:executive|customer|user)\s+escalations?\b/.test(
      t,
    ) ||
    // Batch 26: care/case team + call-center ops; localization translators; field data collection.
    // RN/clinical nurse/therapist titles stay other (medical intentional; eng people paths above).
    (/\b(?:care team|case manager|call center)\b/.test(t) &&
      !/\b(?:nurse|rn\b|lpn|therapist|clinician|physician|psychiatr)\b/.test(t)) ||
    /\b(?:translators?|linguists?)\b/.test(t) ||
    /\bvideo data collection\b|\bfield officer\b.*\bdata collection\b|\bdata collection\b.*\bfield officer\b/.test(
      t,
    ) ||
    // Batch 27: FR premium support supervisour; non-clinical compassionate care; enrollment/transcription;
    // radiation protection (not bare safety specialist); industrial cleaning; secure mfg investigation.
    /\bsoutien premium\b/.test(t) ||
    (/\bcompassionate care\b/.test(t) &&
      !/\b(?:nurse|rn\b|lpn|therapist|clinician|physician|psychiatr)\b/.test(t)) ||
    /\benrollment specialists?\b|\btranscriptionists?\b/.test(t) ||
    /\bradiation protection\b|\bradiation safety officer\b/.test(t) ||
    /\blimpieza industrial\b/.test(t) ||
    /\bsecure manufacturing\b|\bstealth investigator\b/.test(t)
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

export function withoutJobEvidence(company, preserveSourceBoard = true) {
  const sourceBoard = preserveSourceBoard ? hnSourceBoard(company) : null;
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
  return sourceBoard ? { ...rest, jobsUrl: sourceBoard.jobsUrl, jobsSource: 'HN' } : rest;
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
  map.coverage.namedCompanies = (map.companies || []).length;
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

async function detect(company) {
  const direct = hnSourceBoard(company);
  if (direct?.provider) {
    const probe = { Greenhouse: greenhouse, Lever: lever, Ashby: ashby }[direct.provider];
    const found = await probe(direct.slug);
    // The company-authored HN post is the board attribution; website-owner discovery is unnecessary.
    if (found && !hasDeniedAtsBoard({ ...company, atsSource: found.ats, jobsUrl: found.jobsUrl })) return found;
  }
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
  assert(hnSourceBoard({ jobsSource: 'HN', jobsUrl: 'https://jobs.ashbyhq.com/acme/role' })?.slug === 'acme', 'HN board slug preserved');
  assert(hnSourceBoard({ jobsSource: 'YC', jobsUrl: 'https://jobs.ashbyhq.com/acme' }) === null, 'only HN-attributed boards bypass website discovery');
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
    try {
      globalThis.fetch = async (url) => String(url).includes('/job-board/acme')
        ? { ok: true, json: async () => ({ jobs: [{ title: 'Backend Engineer', location: 'San Francisco', isRemote: false }] }) }
        : { ok: false };
      const direct = await detect({ id: 'hn:jobs.ashbyhq.com/acme', website: null, jobsSource: 'HN', jobsUrl: 'https://jobs.ashbyhq.com/acme' });
      assert(direct?.ats === 'Ashby' && direct.count === 1, 'company-posted HN ATS board enriches without an invented website');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
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
  // "design execution" is facilities ops (batch 8), not product design craft
  assert(categorizeRole('Interior Design Intern') === 'other', 'non-product design stays other');
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
  // AR-08: residual batch 3 (architecture/AP/SOX/alliances/success/deploy/BI)
  assert(categorizeRole('Senior Manager, Solutions Architecture') === 'engineering', 'solutions architecture → eng');
  assert(categorizeRole('SDET II') === 'engineering', 'SDET → eng');
  assert(categorizeRole('Threat Detection Analyst') === 'engineering', 'threat detection → eng');
  assert(categorizeRole('Tech Lead Manager - Lakebase') === 'engineering', 'tech lead → eng');
  assert(categorizeRole('Director, Strategic Accounts - Logistics') === 'sales', 'strategic accounts → sales');
  assert(categorizeRole('Partner Director') === 'sales', 'partner director → sales');
  assert(categorizeRole('Global Alliance Lead') === 'sales', 'global alliance → sales');
  assert(categorizeRole('Manager, Technical Solutions') === 'sales', 'technical solutions → sales');
  assert(categorizeRole('Head of Pipeline Strategy') === 'sales', 'pipeline strategy → sales');
  assert(categorizeRole('Senior Services Solutions Manager') === 'sales', 'services solutions → sales');
  assert(categorizeRole('Senior Label Relations Manager') === 'sales', 'label relations → sales');
  assert(categorizeRole('Accounts Payable Manager') === 'finance/legal', 'AP → finance');
  assert(categorizeRole('Head of SOX and Internal Controls') === 'finance/legal', 'SOX → finance');
  assert(categorizeRole('SEC Reporting Manager') === 'finance/legal', 'SEC reporting → finance');
  assert(categorizeRole('Manager, Global Sanctions') === 'finance/legal', 'sanctions → finance');
  assert(categorizeRole('Payments Fraud Investigator') === 'finance/legal', 'fraud investigator → finance');
  assert(categorizeRole('Risk & Monitoring Analyst IV') === 'finance/legal', 'risk analyst → finance');
  assert(categorizeRole('Portfolio Manager, Flexport Capital') === 'finance/legal', 'portfolio manager → finance');
  assert(categorizeRole('Subcontracts Manager') === 'finance/legal', 'subcontracts → finance');
  assert(categorizeRole('Staff Product Analyst') === 'ai/data', 'product analyst → ai/data');
  assert(categorizeRole('Business Intelligence Manager') === 'ai/data', 'BI → ai/data');
  assert(categorizeRole('Applied Scientist- Pricing') === 'ai/data', 'applied scientist → ai/data');
  assert(categorizeRole('Analytics Lead, Market Insights') === 'ai/data', 'analytics lead → ai/data');
  assert(categorizeRole('Product Lead, EMEA Payments') === 'product', 'product lead → product');
  assert(categorizeRole('Video Editor') === 'design', 'video editor → design');
  assert(categorizeRole('Creative Producer') === 'design', 'creative producer → design');
  assert(categorizeRole('Workplace & Engagement Coordinator') === 'people', 'workplace engagement → people');
  assert(categorizeRole('Vice President, Employee & Manager Experience') === 'people', 'employee experience → people');
  assert(categorizeRole('Technical Learning Manager') === 'people', 'technical learning → people');
  assert(categorizeRole('Associate Technical Success Manager') === 'operations', 'technical success → ops');
  assert(categorizeRole('Principal Delivery Success Manager') === 'operations', 'delivery success → ops');
  assert(categorizeRole('Technical Deployment Lead, Semiconductors') === 'operations', 'technical deployment → ops');
  assert(categorizeRole("Founder's Associate") === 'operations', "founder's associate → ops");
  assert(categorizeRole('RFP Specialist') === 'operations', 'RFP → ops');
  assert(categorizeRole('Administrative Coordinator') === 'operations', 'admin coordinator → ops');
  assert(categorizeRole('Deal Pricing') === 'operations', 'deal pricing → ops');
  assert(categorizeRole('Senior Manager, M&A Integration & Strategic Programs') === 'operations', 'M&A + strategic programs → ops');
  assert(categorizeRole('Senior Manager, Supplier Enablement & Spend Conversion') === 'operations', 'supplier enablement → ops');
  assert(categorizeRole('Senior Manager, Procurement & Strategic Sourcing') === 'operations', 'procurement → ops');
  assert(categorizeRole('Senior Manager, Strategic Initiatives (Fulfillment)') === 'operations', 'strategic initiatives → ops');
  assert(categorizeRole('Agent Deployment Manager') === 'operations', 'deployment manager → ops');
  assert(categorizeRole('Localization Manager, Canada') === 'operations', 'localization → ops');
  assert(categorizeRole('Head of Managed Services') === 'operations', 'managed services → ops');
  assert(categorizeRole('Open Application') === 'other', 'open application stays other');
  assert(categorizeRole('General Application') === 'other', 'general application stays other');
  assert(categorizeRole('Bilingual Therapist — LMHCA') === 'other', 'therapist stays other');
  // AR-08: residual batch 4 (fraud/surveillance, alliances, safeguards, AI-research, IT security)
  assert(categorizeRole('Director, Information Technology & Security') === 'engineering', 'IT & security → eng');
  assert(categorizeRole('Country Lead, Data Center Security') === 'engineering', 'data center security → eng');
  assert(categorizeRole('Senior Fraud Analyst – Fraud Investigations') === 'finance/legal', 'fraud analyst → finance');
  assert(categorizeRole('Trade Surveillance Analyst 1') === 'finance/legal', 'trade surveillance → finance');
  assert(categorizeRole('National Security Policy Lead, Biotech') === 'finance/legal', 'security policy → finance');
  assert(categorizeRole('VP, Partner & Alliances, AMER') === 'sales', 'partner & alliances → sales');
  assert(categorizeRole('Cloud Partner Enablement Lead') === 'sales', 'partner enablement → sales');
  assert(categorizeRole('Sr. Performance Solutions Partner') === 'sales', 'solutions partner → sales');
  assert(categorizeRole('Learning Specialist II') === 'people', 'learning specialist → people');
  assert(categorizeRole('Immigration Specialist, M&A') === 'people', 'immigration specialist → people');
  assert(categorizeRole('Research Associate (RL Environments)') === 'ai/data', 'RL research associate → ai/data');
  assert(categorizeRole('[Expression of Interest] Research Manager, Interpretability') === 'ai/data', 'interpretability research → ai/data');
  assert(categorizeRole('Senior Analyst, Advanced Analytics - Gurugram') === 'ai/data', 'advanced analytics → ai/data');
  assert(categorizeRole('Safeguards Enforcement Analyst, Fraud & Scams') === 'operations', 'safeguards → ops');
  assert(categorizeRole('Senior Engagement Delivery Manager') === 'operations', 'engagement delivery → ops');
  assert(categorizeRole('Sr. Application Analyst') === 'operations', 'application analyst → ops');
  assert(categorizeRole('Research Associate, Cancer Biology') === 'other', 'wet-lab research associate stays other');
  assert(categorizeRole('Senior Analyst') === 'other', 'bare senior analyst stays other');
  assert(categorizeRole('Safety Specialist') === 'other', 'physical safety specialist stays other');
  assert(categorizeRole('Delivery Driver') === 'other', 'delivery driver stays other');
  // AR-08: residual batch 5 (channel/acquisition, solution consulting, programming, peopleOps share titles)
  assert(categorizeRole('Channel Manager, DACH') === 'sales', 'channel manager → sales');
  assert(categorizeRole('Acquisition Manager') === 'sales', 'acquisition manager → sales');
  assert(categorizeRole('Talent Acquisition Manager') === 'people', 'talent acquisition stays people');
  assert(categorizeRole('Sr. Industry Manager') === 'sales', 'industry manager → sales');
  assert(categorizeRole('Director, Accounts Management') === 'sales', 'accounts management → sales');
  assert(categorizeRole('Director, Solution Consulting') === 'sales', 'solution consulting → sales');
  assert(categorizeRole('Renewals Leader') === 'sales', 'renewals leader → sales');
  assert(categorizeRole('Senior Programming & Development Manager, Twitch Rivals') === 'engineering', 'programming → eng');
  assert(categorizeRole('Director Applications Development') === 'engineering', 'applications development → eng');
  assert(categorizeRole('Lead, Frontier Red Team (Cyber)') === 'engineering', 'red team → eng');
  assert(categorizeRole('Art Director, Claude') === 'design', 'art director → design');
  assert(categorizeRole('Copy Lead, Claude') === 'marketing', 'copy lead → marketing');
  assert(categorizeRole('Corporate Communication Lead') === 'marketing', 'communication → marketing');
  assert(categorizeRole('Senior Influencer Manager') === 'marketing', 'influencer → marketing');
  assert(categorizeRole('Senior Director, Media Analytics') === 'marketing', 'media analytics → marketing');
  assert(categorizeRole('Measurement Science Manager II') === 'ai/data', 'measurement science → ai/data');
  assert(categorizeRole('Learning Tools Manager') === 'people', 'learning tools → people');
  assert(categorizeRole('Manager, Fraud Intelligence') === 'finance/legal', 'fraud intelligence → finance');
  assert(categorizeRole('Policy Manager, Korea') === 'finance/legal', 'policy manager → finance');
  assert(categorizeRole('Knowledge Strategist Team Lead, Governance') === 'finance/legal', 'governance → finance');
  assert(categorizeRole('Head of International Order-to-Cash') === 'finance/legal', 'order-to-cash → finance');
  assert(categorizeRole('Lyft Business Strategy Manager') === 'operations', 'business strategy → ops');
  assert(categorizeRole('Director, Global Transformation') === 'operations', 'global transformation → ops');
  assert(categorizeRole('Principal, Business Value & Strategy') === 'operations', 'business value → ops');
  assert(categorizeRole('Market Manager, Japan - Hotels') === 'other', 'hotel market manager stays other');
  assert(categorizeRole('General Application') === 'other', 'general application stays other');
  // AR-08: residual batch 6 (advisors/enablement, campaigns, AML/auditor, delivery/systems)
  assert(categorizeRole('Solution Advisor') === 'sales', 'solution advisor → sales');
  assert(categorizeRole('Director, Solutions Consulting') === 'sales', 'solutions consulting → sales');
  assert(categorizeRole('Field Enablement Manager') === 'sales', 'field enablement → sales');
  assert(categorizeRole('Paid Media Manager') === 'marketing', 'paid media → marketing');
  assert(categorizeRole('Integrated Campaigns Lead') === 'marketing', 'integrated campaigns → marketing');
  assert(categorizeRole('Competitive Intelligence Analyst') === 'marketing', 'competitive intelligence → marketing');
  assert(categorizeRole('Internal Auditor') === 'finance/legal', 'internal auditor → finance');
  assert(categorizeRole('Fraud Strategy Manager') === 'finance/legal', 'fraud strategy → finance');
  assert(categorizeRole('AML Analyst') === 'finance/legal', 'AML → finance');
  assert(categorizeRole('Insider Threat Analyst') === 'engineering', 'insider threat → eng');
  assert(categorizeRole('Test Specialist') === 'engineering', 'test specialist → eng');
  assert(categorizeRole('Test Technician') === 'engineering', 'test technician → eng');
  assert(categorizeRole('Technical Delivery Manager') === 'operations', 'technical delivery → ops');
  assert(categorizeRole('Business Systems Manager') === 'operations', 'business systems → ops');
  assert(categorizeRole('Supply Chain Manager') === 'operations', 'supply chain → ops');
  assert(categorizeRole('Part-Time Ambassador') === 'other', 'ambassador stays other');
  assert(categorizeRole('On-Site Catering Attendant') === 'other', 'catering stays other');
  // AR-08: residual batch 7 (field/area ops + country sales)
  assert(categorizeRole('Area Manager') === 'operations', 'area manager → ops');
  assert(categorizeRole('4PL Area Manager') === 'operations', '4PL area manager → ops');
  assert(categorizeRole('Production Manager') === 'operations', 'production manager → ops');
  assert(categorizeRole('Installation Manager') === 'operations', 'installation manager → ops');
  assert(categorizeRole('Special Projects Lead') === 'operations', 'special projects → ops');
  assert(categorizeRole('Country Director, India') === 'sales', 'country director → sales');
  assert(categorizeRole('Market Manager, Japan - Hotels') === 'other', 'hotel market manager stays other');
  assert(categorizeRole('Showroom Concierge') === 'other', 'concierge stays other');
  assert(categorizeRole('Brex Rotational Program') === 'other', 'rotational program stays other');
  // AR-08: residual batch 8 (threat-intel, deals/AE, settlements/gov affairs, DC/install ops)
  assert(categorizeRole('Threat Intel Manager, Model Exploitation') === 'engineering', 'threat intel → eng');
  assert(categorizeRole('Technical Cyber Threat Investigator') === 'engineering', 'cyber threat → eng');
  assert(categorizeRole('Technical Specialist, Claude Code') === 'engineering', 'claude tech specialist → eng');
  assert(categorizeRole('Enterprise Acount Executive') === 'sales', 'acount typo AE → sales');
  assert(categorizeRole('Manager, Account Executives, Startups') === 'sales', 'AE manager → sales');
  assert(categorizeRole('Strategic Deals Lead, Compute') === 'sales', 'strategic deals → sales');
  assert(categorizeRole('Senior Customer Business Executive') === 'sales', 'customer business exec → sales');
  assert(categorizeRole('Head of Business, Crypto Exchanges') === 'sales', 'head of business GTM → sales');
  assert(categorizeRole('Head of Business Operations') === 'operations', 'head of bizops stays ops');
  assert(categorizeRole('Regional Vice President - FSI team') === 'sales', 'RVP → sales');
  assert(categorizeRole('Settlements Associate') === 'finance/legal', 'settlements → finance');
  assert(categorizeRole('Servicing Collections Associate') === 'finance/legal', 'collections associate → finance');
  assert(categorizeRole('Head of Consolidations & Intercompany') === 'finance/legal', 'consolidations → finance');
  assert(categorizeRole('Anaplan Model Builder') === 'finance/legal', 'anaplan → finance');
  assert(categorizeRole('Vice President, Government Affairs') === 'finance/legal', 'gov affairs → finance');
  assert(categorizeRole('Security Controls Assurance Lead') === 'finance/legal', 'controls assurance → finance');
  assert(categorizeRole('Supervisor, Fraud Investigations') === 'finance/legal', 'fraud investigations → finance');
  assert(categorizeRole('Senior Media Manager') === 'marketing', 'media manager → marketing');
  assert(categorizeRole('Installation Specialist') === 'operations', 'installation specialist → ops');
  assert(categorizeRole('Regional Data Center Manager - Finland') === 'operations', 'DC manager → ops');
  assert(categorizeRole('Data Center Design Execution Lead') === 'operations', 'DC design lead → ops');
  assert(categorizeRole('Global Real Estate Construction Manager') === 'operations', 'RE construction → ops');
  assert(categorizeRole('Data Center Electrical Engineer') === 'engineering', 'DC engineer stays eng');
  assert(categorizeRole('Director, Data Center Counsel') === 'finance/legal', 'DC counsel stays legal');
  assert(categorizeRole('Senior Textile Quality Assurance Associate') === 'other', 'textile QA stays other');
  // AR-08: residual batch 9 (technical lead/IT dir, channel/events, economists, delivery/ops)
  assert(categorizeRole('Technical Lead, API') === 'engineering', 'technical lead → eng');
  assert(categorizeRole('Director of IT') === 'engineering', 'director of IT → eng');
  assert(categorizeRole('Power Electronics Team Lead') === 'engineering', 'power electronics TL → eng');
  assert(categorizeRole('RF Integration Team Lead') === 'engineering', 'RF team lead → eng');
  assert(categorizeRole('Network Deployment Engineer') === 'engineering', 'deployment engineer stays eng');
  assert(categorizeRole('Head of Channel APAC') === 'sales', 'head of channel → sales');
  assert(categorizeRole('Global Events Manager') === 'marketing', 'events manager → marketing');
  assert(categorizeRole('Customer Advocate') === 'marketing', 'customer advocate → marketing');
  assert(categorizeRole('Research Economist, Economic Research') === 'finance/legal', 'research economist → finance');
  assert(categorizeRole('Senior Pricing Strategy Manager') === 'finance/legal', 'pricing strategy → finance');
  assert(categorizeRole('Transaction Principal') === 'finance/legal', 'transaction principal → finance');
  assert(categorizeRole('Insight Analyst') === 'ai/data', 'insight analyst → ai/data');
  assert(categorizeRole('Senior Behavioral Scientist') === 'ai/data', 'behavioral scientist → ai/data');
  assert(categorizeRole('Client Delivery Director') === 'operations', 'client delivery → ops');
  assert(categorizeRole('Director, Network Deployment') === 'operations', 'network deployment dir → ops');
  assert(categorizeRole('Production Master Scheduler') === 'operations', 'master scheduler → ops');
  assert(categorizeRole('EMR Success Manager') === 'operations', 'EMR success → ops');
  assert(categorizeRole('Supply Category Lead, Airbnb Services') === 'operations', 'supply category → ops');
  assert(categorizeRole('Quality Assurance Associate') === 'engineering', 'QA associate → eng (batch 17)');
  // AR-08: residual batch 10 (pen-test, RM/market GTM, PR, regulatory, product-dev specialist)
  assert(categorizeRole('Associate Penetration Tester') === 'engineering', 'pen tester → eng');
  assert(categorizeRole('Researcher, Automated Red Teaming') === 'engineering', 'red teaming → eng');
  assert(categorizeRole('Banking Relationship Manager') === 'sales', 'client RM → sales');
  assert(categorizeRole('Senior Vendor Relationship Manager') === 'operations', 'vendor RM → ops (batch 17)');
  assert(categorizeRole('Market Manager') === 'sales', 'bare market manager → sales');
  assert(categorizeRole('Senior Market Manager, Luxe') === 'other', 'luxe market manager stays other');
  assert(categorizeRole('Market Manager, Japan - Hotels') === 'other', 'hotel market manager stays other');
  assert(categorizeRole('PR Manager, ASEAN') === 'marketing', 'PR manager → marketing');
  assert(categorizeRole('Associate Director, Public Relations') === 'marketing', 'public relations → marketing');
  assert(categorizeRole('Director, Regulatory Affairs') === 'finance/legal', 'regulatory affairs → finance');
  assert(categorizeRole('Director, Regulatory CMC') === 'finance/legal', 'regulatory CMC → finance');
  assert(categorizeRole('Product Development Specialist') === 'product', 'product dev specialist → product');
  assert(categorizeRole('Medical Director, Psychiatry') === 'other', 'medical director stays other');
  assert(categorizeRole('Staff Gemologist') === 'other', 'gemologist stays other');
  // AR-08: residual batch 11 (CFO, territory, UX research, implementations, L&D)
  assert(categorizeRole('Chief Financial Officer (CFO)') === 'finance/legal', 'CFO → finance');
  assert(categorizeRole('Territory Director - DACH') === 'sales', 'territory director → sales');
  assert(categorizeRole('Senior Territory Manager, Bay Area') === 'sales', 'territory manager → sales');
  assert(categorizeRole('Experience Researcher') === 'design', 'experience researcher → design');
  assert(categorizeRole('Rapid User Researcher') === 'design', 'user researcher → design');
  assert(categorizeRole('Head of Implementations') === 'operations', 'head of implementations → ops');
  assert(categorizeRole('Manager Development Lead') === 'people', 'manager development → people');
  assert(categorizeRole('Medical Director, Psychiatry') === 'other', 'medical director stays other');
  // AR-08: residual batch 12 (TPM before eng false-friends; technical staff; capacity/services)
  assert(categorizeRole('Technical Program Manager, Infrastructure') === 'operations', 'TPM infrastructure → ops not eng');
  assert(categorizeRole('Sr./Staff TPM - Inference Capacity') === 'operations', 'TPM acronym → ops');
  assert(categorizeRole('Construction TPM') === 'operations', 'construction TPM → ops');
  assert(categorizeRole('Sr. Technical Staff') === 'engineering', 'technical staff → eng');
  assert(categorizeRole('Release Qualification Team Lead') === 'engineering', 'release qualification → eng');
  assert(categorizeRole('Director of Capacity Planning & Delivery') === 'operations', 'capacity planning → ops');
  assert(categorizeRole('Vice President of Technical Services') === 'operations', 'technical services → ops');
  assert(categorizeRole('Member of Technical Staff') === 'engineering', 'MTS craft → eng');
  // AR-08: residual batch 13 (insights, financial crimes, WFM, change activation)
  assert(categorizeRole('Insights Analyst, Dispute Experience') === 'ai/data', 'insights analyst → ai/data');
  assert(categorizeRole('Marketing Insights Analyst') === 'marketing', 'marketing insights stays marketing');
  assert(categorizeRole('Senior Analyst, Financial Crimes & Identity Quality') === 'finance/legal', 'financial crimes → finance');
  assert(categorizeRole('Staff Software Engineer, Financial Crimes') === 'engineering', 'eng + financial crimes stays eng');
  assert(categorizeRole('Senior Manager, Global Workforce Management') === 'operations', 'workforce management → ops');
  assert(categorizeRole('Workforce Management Analyst') === 'operations', 'WFM analyst → ops');
  assert(categorizeRole('Senior Change Activation Partner') === 'people', 'change activation → people');
  // AR-08: residual batch 14 (system admin, solution scientist, marketplace, network ops)
  assert(categorizeRole('Senior Atlassian System Admin') === 'engineering', 'system admin → eng');
  assert(categorizeRole('Solution Scientist') === 'sales', 'solution scientist → sales');
  assert(categorizeRole('Head of Expert Marketplace / Technical GM') === 'sales', 'expert marketplace → sales');
  assert(categorizeRole('Interconnection Manager, Network Strategy Americas') === 'operations', 'interconnection → ops');
  assert(categorizeRole('Intelligence Production Lead') === 'operations', 'intelligence production → ops');
  assert(categorizeRole('Network Strategy Intern (Fall 2026)') === 'other', 'network strategy intern stays other');
  // AR-08: residual batch 15 (plural craft + GTM/CISO/data-science/copy/AP-AR/mfg)
  assert(categorizeRole('Applications Engineers, Agentic Workflows') === 'engineering', 'plural engineers → eng');
  assert(categorizeRole('Manager, Solutions Architects') === 'engineering', 'plural architects → eng');
  assert(categorizeRole('SDE 2') === 'engineering', 'SDE → eng');
  assert(categorizeRole('C/C++ Developper - Oracle Databases') === 'engineering', 'developper typo → eng');
  assert(categorizeRole('Neuroengineer, Next Gen') === 'engineering', 'neuroengineer → eng');
  assert(categorizeRole('Chief Information Security Officer (CISO)') === 'engineering', 'CISO → eng');
  assert(categorizeRole('Head of Security') === 'engineering', 'head of security → eng');
  assert(categorizeRole('Director, IT') === 'engineering', 'Director, IT → eng');
  assert(categorizeRole('QA Lead') === 'engineering', 'QA lead → eng');
  assert(categorizeRole('Data Science Manager, Rider Experience') === 'ai/data', 'data science → ai/data');
  assert(categorizeRole('Data Annotation Specialist, Generalist') === 'ai/data', 'data annotation → ai/data');
  assert(categorizeRole('Agent Post-Training, Personality') === 'ai/data', 'agent post-training → ai/data');
  assert(categorizeRole('Researcher, Alignment') === 'ai/data', 'alignment researcher → ai/data');
  assert(categorizeRole('Research Staff, LLMs') === 'ai/data', 'research staff LLM → ai/data');
  assert(categorizeRole('GTM Strategist') === 'sales', 'bare GTM → sales');
  assert(categorizeRole('Go-To-Market (GTM) Digital Natives Program Leader') === 'sales', 'go-to-market → sales');
  assert(categorizeRole('Account Associate - SF') === 'sales', 'account associate → sales');
  assert(categorizeRole('Area Vice President - LATAM') === 'sales', 'AVP → sales');
  assert(categorizeRole('Country Manager, Italy') === 'sales', 'country manager → sales');
  assert(categorizeRole('Forward Deployed Consultant - Remote') === 'sales', 'forward deployed → sales');
  assert(categorizeRole('Client Manager') === 'sales', 'client manager → sales');
  assert(categorizeRole('Cyber Security GTM Leader') === 'sales', 'security GTM → sales not eng');
  assert(categorizeRole('Copywriter') === 'marketing', 'copywriter → marketing');
  assert(categorizeRole('PR Director, EMEA') === 'marketing', 'PR director → marketing');
  assert(categorizeRole('Head of Social (Remote)') === 'marketing', 'head of social → marketing');
  assert(categorizeRole('AP/AR Specialist') === 'finance/legal', 'AP/AR → finance');
  assert(categorizeRole('Bookkeeper') === 'finance/legal', 'bookkeeper → finance');
  assert(categorizeRole('Cash Application Associate') === 'finance/legal', 'cash application → finance');
  assert(categorizeRole('Product Strategy Manager') === 'product', 'product strategy → product');
  assert(categorizeRole('Product Director, Common Voice') === 'product', 'product director → product');
  assert(categorizeRole('Manufacturing Associate') === 'operations', 'manufacturing associate → ops');
  assert(categorizeRole('Customer Enablement Manager') === 'operations', 'customer enablement → ops');
  assert(categorizeRole('Material Handler') === 'operations', 'material handler → ops');
  assert(categorizeRole('Principal Scientist, Cancer Biology') === 'other', 'wet-lab scientist stays other');
  assert(categorizeRole('Remote Therapist — LMFT') === 'other', 'therapist stays other');
  assert(categorizeRole('Market Manager - Vacation Rental') === 'other', 'vacation market manager stays other');
  // AR-08: residual batch 16 (pricing strategist, enablement split, founding ops, RVP, quant)
  assert(categorizeRole('Pricing Strategist, API') === 'finance/legal', 'pricing strategist → finance');
  assert(categorizeRole('Fraud Patterns Analyst') === 'finance/legal', 'fraud patterns → finance');
  assert(categorizeRole('Quantitative Associate') === 'finance/legal', 'quant associate → finance');
  assert(categorizeRole('Economist') === 'finance/legal', 'economist → finance');
  assert(categorizeRole('Head of Claims') === 'finance/legal', 'head of claims → finance');
  assert(categorizeRole('RVP, Retail') === 'sales', 'RVP → sales');
  assert(categorizeRole('Director, Enterprise') === 'sales', 'director enterprise → sales');
  assert(categorizeRole('Head of Solutions') === 'sales', 'head of solutions → sales');
  assert(categorizeRole('Head of Demand Engine') === 'sales', 'head of demand engine → sales');
  assert(categorizeRole('Head of Demand Generation') === 'marketing', 'head of demand gen stays marketing');
  assert(categorizeRole('Regional Director, Mid-Market') === 'sales', 'regional mid-market → sales');
  assert(categorizeRole('Sr. Technical Enablement Specialist') === 'sales', 'technical enablement → sales');
  assert(categorizeRole('Associate Enablement Manager - Field') === 'sales', 'field enablement → sales');
  assert(categorizeRole('Customer Enablement Manager') === 'operations', 'customer enablement stays ops');
  assert(categorizeRole('Field CTO - America Industries') === 'sales', 'field CTO → sales');
  assert(categorizeRole('Director, Enablement - Skills and Leadership Excellence') === 'people', 'skills enablement → people');
  assert(categorizeRole('Salesforce Administrator') === 'engineering', 'salesforce admin → eng');
  assert(categorizeRole('Detection Researcher (Coding Focused)') === 'engineering', 'detection researcher → eng');
  assert(categorizeRole('Cyber Specialist') === 'engineering', 'cyber specialist → eng');
  assert(categorizeRole('Researcher, Frontier Cybersecurity Risks') === 'ai/data', 'frontier cyber researcher → ai/data');
  assert(categorizeRole('Data Automation Specialist') === 'ai/data', 'data automation → ai/data');
  assert(categorizeRole('Demand Strategist') === 'marketing', 'demand strategist → marketing');
  assert(categorizeRole('Ad Campaign Manager') === 'marketing', 'ad campaign → marketing');
  assert(categorizeRole('Lead Video Producer') === 'design', 'video producer → design');
  assert(categorizeRole('Lead Character Artist') === 'design', 'character artist → design');
  assert(categorizeRole('Founding Operator France') === 'operations', 'founding operator → ops');
  assert(categorizeRole('Founder associate') === 'operations', 'founder associate → ops');
  assert(categorizeRole('Office of the Founders') === 'operations', 'office of founders → ops');
  assert(categorizeRole('Incident Manager') === 'operations', 'incident manager → ops');
  assert(categorizeRole('Business System Analyst') === 'operations', 'business system analyst → ops');
  assert(categorizeRole('Customer Retention Manager') === 'operations', 'customer retention → ops');
  assert(categorizeRole('Head of Manufacturing') === 'operations', 'head of manufacturing → ops');
  assert(categorizeRole('Chef de Produit Senior') === 'product', 'chef de produit → product');
  assert(categorizeRole('Manager, Product - Code') === 'product', 'manager product → product');
  assert(categorizeRole('Principal Scientist, Cancer Biology') === 'other', 'wet-lab scientist stays other');
  assert(categorizeRole('Researcher, Frontier Biological and Chemical Risks') === 'other', 'wet-lab frontier stays other');
  // AR-08: residual batch 17 (IAM/QA/avionics, FP&A long-form, PS/alliance/FDE, warehouse/HVAC, equity admin)
  assert(categorizeRole('Senior Manager, Identity & Access Management (IAM)') === 'engineering', 'IAM → eng');
  assert(categorizeRole('Quality Assurance Associate') === 'engineering', 'QA associate → eng');
  assert(categorizeRole('Senior Textile Quality Assurance Associate') === 'other', 'textile QA stays other');
  assert(categorizeRole('Electrical Integration Associate - Avionics (Fall 2026)') === 'engineering', 'avionics integration → eng');
  assert(categorizeRole('Senior Manager of Financial Planning & Analysis') === 'finance/legal', 'FP&A long-form → finance');
  assert(categorizeRole('Sr. Director, Procure to Pay') === 'finance/legal', 'procure-to-pay → finance');
  assert(categorizeRole('Director, Travel & Expense') === 'finance/legal', 'T&E → finance');
  assert(categorizeRole('Sr. Equity Admin Analyst') === 'people', 'equity admin → people');
  assert(categorizeRole('Sr. Alliance Manager') === 'sales', 'alliance manager → sales');
  assert(categorizeRole('Value Consultant') === 'sales', 'value consultant → sales');
  assert(categorizeRole('Manager, Professional Services') === 'sales', 'PS manager → sales');
  assert(categorizeRole('Strategic Customer Advisor, APJ') === 'sales', 'strategic customer advisor → sales');
  assert(categorizeRole('Emerging Markets Lead – Latin America (Spanish speaking)') === 'sales', 'emerging markets lead → sales');
  assert(categorizeRole('Evergreen - FDE Brazil') === 'sales', 'FDE → sales');
  assert(categorizeRole('Senior SASE Specialist, Enterprise (West)') === 'sales', 'SASE specialist → sales');
  assert(categorizeRole('Senior Manager, Data Insights') === 'ai/data', 'data insights → ai/data');
  assert(categorizeRole('Senior Vendor Relationship Manager') === 'operations', 'vendor RM → ops');
  assert(categorizeRole('Senior Oracle SCM Specialist') === 'operations', 'SCM specialist → ops');
  assert(categorizeRole('Jefe de Almacén / Warehouse Lead') === 'operations', 'warehouse → ops');
  assert(categorizeRole('Lead HVAC Technician') === 'operations', 'HVAC → ops');
  assert(categorizeRole('Técnico/a de Mantenimiento de Equipos') === 'operations', 'maintenance tech → ops');
  assert(categorizeRole('Strategy & Execution Manager') === 'operations', 'strategy & execution → ops');
  assert(categorizeRole('Real Estate Strategic Planning Lead') === 'operations', 'RE strategic planning → ops');
  assert(categorizeRole('Life Sciences Operator, Lead') === 'operations', 'life sciences operator → ops');
  assert(categorizeRole('Senior Analyst') === 'other', 'bare senior analyst stays other');
  assert(categorizeRole('Safety Specialist') === 'other', 'physical safety stays other');
  assert(categorizeRole('General Application') === 'other', 'general application stays other');
  // AR-08: residual batch 18 (reliability/quality eng, strategy&analytics, equity/HR, freight ops, pipeline)
  assert(categorizeRole('Reliability Design Associate (Fall 2026)') === 'engineering', 'reliability design → eng');
  assert(categorizeRole('Technical Quality Specialist') === 'engineering', 'technical quality → eng');
  assert(categorizeRole('Strategy & Analytics Senior Lead, Fulfillment') === 'ai/data', 'strategy & analytics → ai/data');
  assert(categorizeRole('Statistician') === 'ai/data', 'statistician → ai/data');
  assert(categorizeRole('Vice President, Data & Insights') === 'ai/data', 'data & insights → ai/data');
  assert(categorizeRole('Senior Manager, Global Equity') === 'people', 'global equity → people');
  assert(categorizeRole('Senior Absence Management Partner') === 'people', 'absence management → people');
  assert(categorizeRole('Staff Team Member Relations Partner') === 'people', 'member relations → people');
  assert(categorizeRole('Senior Director, Field CTOs') === 'sales', 'field CTOs → sales');
  assert(categorizeRole('Director, Pipeline Excellence') === 'sales', 'pipeline excellence → sales');
  assert(categorizeRole('Senior Deal Strategy Manager, APJ') === 'sales', 'deal strategy → sales');
  assert(categorizeRole('Lead, Global External Affairs') === 'finance/legal', 'external affairs → finance');
  assert(categorizeRole('Regulatory Associate') === 'finance/legal', 'regulatory associate → finance');
  assert(categorizeRole('Trade Advisory Manager') === 'finance/legal', 'trade advisory → finance');
  assert(categorizeRole('Machine Shop Manager') === 'operations', 'machine shop → ops');
  assert(categorizeRole('Quality Manager, Manufacturing') === 'operations', 'mfg quality manager → ops');
  assert(categorizeRole('Shipping & Receiving Specialist') === 'operations', 'shipping & receiving → ops');
  assert(categorizeRole('Air Planning Associate') === 'operations', 'air planning → ops');
  assert(categorizeRole('Customs Analyst') === 'operations', 'customs → ops');
  assert(categorizeRole('Account Service Delivery Associate') === 'operations', 'service delivery → ops');
  assert(categorizeRole('Manager, Corporate Programs') === 'operations', 'corporate programs → ops');
  assert(categorizeRole('Senior Fleet Intelligence Analyst') === 'operations', 'fleet intelligence → ops');
  assert(categorizeRole('Electrical Technician') === 'operations', 'electrical technician → ops');
  assert(categorizeRole('Project Estimator / Project Controls Manager') === 'operations', 'project controls → ops');
  assert(categorizeRole('Principal Scientist, Cancer Biology') === 'other', 'wet-lab stays other');
  // AR-08: residual batch 19 (sourcing/benefits people, GTM CRM/expansion, fraud&identity, ops intake/inventory)
  assert(categorizeRole('Sourcing Manager') === 'people', 'sourcing manager → people');
  assert(categorizeRole('Senior Manager, Procurement & Strategic Sourcing') === 'operations', 'strategic sourcing stays ops');
  assert(categorizeRole('Benefit Customer Care Advocate') === 'people', 'benefit customer care → people');
  assert(categorizeRole('Learning & Knowledge Systems Lead') === 'people', 'learning & knowledge → people');
  assert(categorizeRole("Founder's Office") === 'operations', "founder's office → ops");
  assert(categorizeRole('Director, Relationship Management') === 'sales', 'relationship management → sales');
  assert(categorizeRole('VP, Client Development - OEM and Telco') === 'sales', 'client development → sales');
  assert(categorizeRole('Head of Enterprise / GM') === 'sales', 'head of enterprise → sales');
  assert(categorizeRole('CRM Lead') === 'sales', 'CRM lead → sales');
  assert(categorizeRole('Central Expansion Lead') === 'sales', 'expansion lead → sales');
  assert(categorizeRole('High Velocity Enablement Lead') === 'sales', 'velocity enablement → sales');
  assert(categorizeRole('Senior Publisher Development Manager') === 'sales', 'publisher development → sales');
  assert(categorizeRole('Senior Manager,  Emerging Enterprise (DACH)') === 'sales', 'emerging enterprise → sales');
  assert(categorizeRole('Lead Analyst - Programmatic Buying') === 'marketing', 'programmatic buying → marketing');
  assert(categorizeRole('Game Director') === 'design', 'game director → design');
  assert(categorizeRole('Spanish-Speaking Creative Manager (Contractor)') === 'design', 'creative manager → design');
  assert(categorizeRole('Fraud & Identity Specialist (Contract)') === 'finance/legal', 'fraud & identity → finance');
  assert(categorizeRole('Director– Strategic M&A & Value Realisation') === 'finance/legal', 'M&A (not integration) → finance');
  assert(categorizeRole('Senior Manager, M&A Integration & Strategic Programs') === 'operations', 'M&A integration stays ops');
  assert(categorizeRole('Mortgage Originations Process Specialist') === 'finance/legal', 'mortgage origination → finance');
  assert(categorizeRole('Director, Ventures Partner Portfolio') === 'finance/legal', 'ventures partner → finance');
  assert(categorizeRole('Strategic Project Lead') === 'operations', 'strategic project → ops');
  assert(categorizeRole('Manager, Strategic Resolutions') === 'operations', 'strategic resolutions → ops');
  assert(categorizeRole('Intraday Workforce Analyst') === 'operations', 'intraday workforce → ops');
  assert(categorizeRole('Assistant Manager - Inventory - Robotics Labs') === 'operations', 'inventory → ops');
  assert(categorizeRole('Shift Supervisor') === 'operations', 'shift supervisor → ops');
  assert(categorizeRole('Customer Intake Specialist') === 'operations', 'customer intake → ops');
  assert(categorizeRole('Senior Manager, End User Services') === 'operations', 'end user services → ops');
  assert(categorizeRole('Director of Production') === 'operations', 'director of production → ops');
  assert(categorizeRole('Técnico/a de Montaje de Equipos') === 'operations', 'montaje → ops');
  assert(categorizeRole('Senior Analyst') === 'other', 'bare senior analyst stays other');
  // AR-08: residual batch 20 (acquisitions/partner GTM, equity people, CS/supply ops, originations finance)
  assert(categorizeRole('Head of Acquisitions') === 'sales', 'head of acquisitions → sales');
  assert(categorizeRole('Sr. Lead, Partner Management') === 'sales', 'partner management → sales');
  assert(categorizeRole('Startup Market Lead, AMER') === 'sales', 'market lead → sales');
  assert(categorizeRole('Director, Commercial Strategy & Buying Programs') === 'sales', 'commercial strategy → sales');
  assert(categorizeRole('Manager, Technology Alliance Partners') === 'sales', 'alliance partners → sales');
  assert(categorizeRole('Demand & Campaigns Lead, EMEA') === 'marketing', 'demand & campaigns → marketing');
  assert(categorizeRole('Senior Director of Corporate Messaging') === 'marketing', 'corporate messaging → marketing');
  assert(categorizeRole('Events and Experiences Specialist - NYC') === 'marketing', 'events and experiences → marketing');
  assert(categorizeRole('Head of Editorial + Platforms, Mozilla Ecosystem') === 'marketing', 'editorial → marketing');
  assert(categorizeRole('Director - Data, Identity, and Addressability') === 'marketing', 'addressability → marketing');
  assert(categorizeRole('Senior Manager, Equity') === 'people', 'equity manager → people');
  assert(categorizeRole('Private Equity Associate') === 'finance/legal', 'private equity → finance');
  assert(categorizeRole('Managing Director, Originations') === 'finance/legal', 'originations → finance');
  assert(categorizeRole('Government Relations Lead') === 'finance/legal', 'government relations → finance');
  assert(categorizeRole('Director of Project Insurance') === 'finance/legal', 'project insurance → finance');
  assert(categorizeRole('Licensing Manager') === 'finance/legal', 'licensing manager → finance');
  assert(categorizeRole('Senior Manager of Capital Cost Management') === 'finance/legal', 'capital cost → finance');
  assert(categorizeRole('Analyst, Business Planning & Forecasting') === 'finance/legal', 'BP&F → finance');
  assert(categorizeRole('Seasonal Customer Service Representative - 2026 (Eastern Region)') === 'operations', 'customer service → ops');
  assert(categorizeRole('Global Supply Manager') === 'operations', 'supply manager → ops');
  assert(categorizeRole('Category Manager - Technology Sourcing') === 'operations', 'category manager → ops');
  assert(categorizeRole('Director, Strategic Delivery') === 'operations', 'strategic delivery → ops');
  assert(categorizeRole('Proposal Manager') === 'operations', 'proposal manager → ops');
  assert(categorizeRole('Success Insights Manager') === 'operations', 'success insights → ops');
  assert(categorizeRole('Facilities Mechanical Specialist') === 'operations', 'facilities mechanical → ops');
  assert(categorizeRole('Microfabrication Technician') === 'operations', 'microfabrication → ops');
  assert(categorizeRole('Site Leader') === 'operations', 'site leader → ops');
  assert(categorizeRole('Senior Field Supervisor') === 'operations', 'field supervisor → ops');
  assert(categorizeRole('Associate, Customer Impact') === 'operations', 'customer impact → ops');
  assert(categorizeRole('Director of Industrial Planning') === 'operations', 'industrial planning → ops');
  assert(categorizeRole('Strategy Lead') === 'operations', 'strategy lead → ops');
  assert(categorizeRole('Air Pricing Associate') === 'operations', 'air pricing → ops');
  assert(categorizeRole('Verifications Associate') === 'operations', 'verifications associate → ops');
  assert(categorizeRole('Director of Core Development') === 'engineering', 'core development → eng');
  assert(categorizeRole('Identity Senior Solution Specialist -On-Premises & Hybrid Access') === 'engineering', 'solution specialist → eng');
  assert(categorizeRole('Prototype & Design Specialist') === 'design', 'prototype & design → design');
  assert(categorizeRole('Concepteur de Produits Technologiques Opérationnels') === 'product', 'concepteur de produits → product');
  assert(categorizeRole('Principal Scientist, Cancer Biology') === 'other', 'wet-lab stays other');
  // AR-08: residual batch 21 (ads solutions/pursuits, market research/UGC, cyber/threat, CS learning/ops)
  assert(categorizeRole('Regional Manager, Ads Solutions (APAC)') === 'sales', 'ads solutions → sales');
  assert(categorizeRole('Head of Scaled, Ads Solutions') === 'sales', 'head of scaled ads → sales');
  assert(categorizeRole('AWS Specialist Sellers, Strategic Pursuits') === 'sales', 'specialist sellers → sales');
  assert(categorizeRole('Strategic Pursuits Lead') === 'sales', 'strategic pursuits → sales');
  assert(categorizeRole('Deal Lead, Special Situations (Semiconductors)') === 'sales', 'deal lead → sales');
  assert(categorizeRole('Market Research Lead') === 'marketing', 'market research → marketing');
  assert(categorizeRole('UGC Creator') === 'marketing', 'UGC → marketing');
  assert(categorizeRole('Senior Webinar & Digital Events Strategist') === 'marketing', 'webinar/digital events → marketing');
  assert(categorizeRole('Enterprise 3P Field Events Lead') === 'marketing', 'field events → marketing');
  assert(categorizeRole('Executive Programs Narrative Lead') === 'marketing', 'narrative lead → marketing');
  assert(categorizeRole('Business Affairs Manager') === 'finance/legal', 'business affairs → finance');
  assert(categorizeRole('Subject Matter Expert, Investment Banking') === 'finance/legal', 'investment banking → finance');
  assert(categorizeRole('Public Funding Project Lead') === 'finance/legal', 'public funding → finance');
  assert(categorizeRole('Model Policy') === 'finance/legal', 'model policy → finance');
  assert(categorizeRole('Threat Modeler, Preparedness') === 'engineering', 'threat modeler → eng');
  assert(categorizeRole('Head of Government Cyber Integration, OpenAI for Government') === 'engineering', 'cyber integration → eng');
  assert(categorizeRole('TLM, Embedded Experiences') === 'engineering', 'TLM → eng');
  assert(categorizeRole('Performance Modeling Lead') === 'ai/data', 'performance modeling → ai/data');
  assert(categorizeRole('RE/RS, Data Understanding (MM)') === 'ai/data', 'data understanding → ai/data');
  assert(categorizeRole('Senior Product Acceleration Specialist') === 'product', 'product acceleration → product');
  assert(categorizeRole('Tokens-as-a-Service (TaaS) Lead') === 'product', 'TaaS → product');
  assert(categorizeRole('Abuse Investigator') === 'operations', 'abuse investigator → ops');
  assert(categorizeRole('Customer Learning Program Lead') === 'operations', 'customer learning → ops');
  assert(categorizeRole('Startup Program & Experience Lead') === 'operations', 'program & experience → ops');
  assert(categorizeRole('Project Planner') === 'operations', 'project planner → ops');
  assert(categorizeRole('Construction Planner/Scheduler (Paducah)') === 'operations', 'construction planner → ops');
  assert(categorizeRole('Strategic Technology Negotiations Lead') === 'operations', 'technology negotiations → ops');
  assert(categorizeRole('Performance Center - Program Lead') === 'operations', 'performance center → ops');
  assert(categorizeRole('Future Opportunities: Retirement Onboarding Coordinator') === 'operations', 'onboarding coordinator → ops');
  assert(categorizeRole('Future Opportunities: Dedicated Service Advisor (Chicago)') === 'operations', 'service advisor → ops');
  assert(categorizeRole('Data Center Compute, OpenHouse Savannah 2026') === 'operations', 'data center compute → ops');
  // AR-08 residual batch 22
  assert(categorizeRole('Production Engineeer') === 'engineering', 'engineeer typo → eng');
  assert(categorizeRole('Security Analyst, Bug Bounty') === 'engineering', 'security analyst → eng');
  assert(categorizeRole('Power Electronics Intern (Fall 2026)') === 'engineering', 'power electronics intern → eng');
  assert(categorizeRole('Presales Customer Engineer, Enterprise (Sydney)') === 'engineering', 'presales CE stays eng');
  assert(categorizeRole('Territory Executive (US)') === 'sales', 'territory executive → sales');
  assert(categorizeRole('ソリューションアーキテクト (プリセールス)') === 'sales', 'JP SA presales → sales');
  assert(categorizeRole('Head of Germany') === 'sales', 'country head → sales');
  assert(categorizeRole('Sales Development Representative, AI-Native') === 'sales', 'SDR AI-native → sales not ai/data');
  assert(categorizeRole('Researcher, Recursive Self-Improvement Safety') === 'ai/data', 'RSI safety researcher → ai/data');
  assert(categorizeRole('Anthropic Fellows Program, Reinforcement Learning') === 'ai/data', 'RL fellows → ai/data');
  assert(categorizeRole('Analyst Relations Senior Manager') === 'marketing', 'analyst relations → marketing');
  assert(categorizeRole('Video Editor') === 'design', 'video editor stays design (not bare editor→marketing)');
  assert(categorizeRole('Analyst, Product Pricing') === 'finance/legal', 'product pricing → finance');
  assert(categorizeRole('Senior Staff Software Engineer - Pricing and Packaging') === 'engineering', 'pricing packaging SWE stays eng');
  assert(categorizeRole('Gestionnaire de bureau, Montréal') === 'operations', 'FR office manager → ops');
  assert(categorizeRole('Physical Security Specialist II') === 'operations', 'physical security → ops');
  assert(categorizeRole('TechOps Engineer') === 'engineering', 'techops engineer stays eng');
  assert(categorizeRole('Financial Connections TechOps Manager') === 'operations', 'techops manager → ops');
  assert(categorizeRole('Candidate Experience Coordinator') === 'people', 'candidate experience stays people');
  assert(categorizeRole('Experience Coordinator, San Francisco') === 'operations', 'experience coordinator → ops');
  assert(categorizeRole('Head of Learning & Quality, Stripe Delivery Center') === 'people', 'head of learning → people');
  // AR-08 residual batch 23
  assert(categorizeRole('Customer Engagement') === 'operations', 'customer engagement → ops');
  assert(categorizeRole('Technical Project Management Intern (Fall 2026)') === 'operations', 'TPM intern → ops');
  assert(categorizeRole('Especialista en Sistemas Telemáticos') === 'operations', 'ES telematics → ops');
  assert(categorizeRole('Security & IT General Opportunities') === 'engineering', 'security&IT → eng');
  assert(categorizeRole('Prototyping Lab Technician, Robotics') === 'engineering', 'prototyping lab → eng');
  assert(categorizeRole('Manager, TAM (Greater China)') === 'sales', 'TAM manager → sales');
  assert(categorizeRole('Agent Strategist - SF') === 'sales', 'agent strategist → sales');
  assert(categorizeRole('Senior Analyst, Field Analytics') === 'ai/data', 'field analytics → ai/data');
  assert(categorizeRole('Conversion Analyst') === 'marketing', 'conversion analyst → marketing');
  assert(categorizeRole('Senior Sourcing Analyst') === 'finance/legal', 'sourcing analyst → finance');
  assert(categorizeRole('Business Partner Analyst, Financial Enablement') === 'finance/legal', 'BP analyst → finance');
  assert(categorizeRole('Video People Lead') === 'people', 'video people lead → people');
  assert(categorizeRole('Product Line Specialist, Characterization') === 'product', 'product line specialist → product');
  assert(categorizeRole('Senior Analyst') === 'other', 'bare senior analyst stays other');
  assert(categorizeRole('General Application') === 'other', 'general application stays other');
  // AR-08 residual batch 24
  assert(categorizeRole('Senior Pipeline Programs Manager') === 'sales', 'pipeline programs → sales');
  assert(categorizeRole('Admissions Advisor, MasterClass Executive (Temporary)') === 'sales', 'admissions advisor → sales');
  assert(categorizeRole('Sr. Manager, New Products Strategy') === 'product', 'new products strategy → product');
  assert(categorizeRole('Director, Monetization and Market Intelligence') === 'product', 'monetization → product');
  assert(categorizeRole('Product Designer, Growth & Monetization') === 'design', 'designer+monetization stays design');
  assert(categorizeRole('Product Marketing Manager, Monetization') === 'marketing', 'PMM+monetization stays marketing');
  assert(categorizeRole('EMEA Insights Specialist') === 'marketing', 'insights specialist → marketing');
  assert(categorizeRole('Senior Training Specialist') === 'people', 'training specialist → people');
  assert(categorizeRole('Business Lead, Special Situations') === 'finance/legal', 'special situations → finance');
  assert(categorizeRole('Audit, Technology') === 'finance/legal', 'audit technology → finance');
  assert(categorizeRole('Patient Experience Specialist') === 'operations', 'patient experience → ops');
  assert(categorizeRole('Authorization Specialist') === 'operations', 'authorization specialist → ops');
  assert(categorizeRole('Senior QMS Specialist') === 'operations', 'qms → ops');
  assert(categorizeRole('Quality Control Associate (Repairs)') === 'operations', 'qc associate → ops');
  assert(categorizeRole('QA Survey Technician') === 'operations', 'qa survey → ops');
  assert(categorizeRole('Nuclear Training Instructor') === 'operations', 'nuclear training → ops');
  assert(categorizeRole('Investigations, Law Enforcement and Engagement Lead') === 'operations', 'law enforcement → ops');
  assert(categorizeRole('Social Impact Coordinator') === 'operations', 'social impact → ops');
  assert(categorizeRole('Startups Program Lead') === 'operations', 'startups program → ops');
  assert(categorizeRole('Sr. Director, Enablement - Shared Services') === 'operations', 'shared services enablement → ops');
  assert(categorizeRole('Senior Enablement Experience Manager') === 'operations', 'enablement experience → ops');
  assert(categorizeRole('Director, Business Planning & Architecture') === 'operations', 'business planning architecture → ops');
  assert(categorizeRole('Market Manager, Japan - Hotels') === 'other', 'hotel market manager stays other');
  assert(categorizeRole('Senior Market Manager, Luxe') === 'other', 'luxe market manager stays other');
  assert(categorizeRole('Builder') === 'other', 'bare builder stays other');
  assert(categorizeRole('Field Enablement Manager') === 'sales', 'field enablement stays sales');
  assert(categorizeRole('Customer Enablement Manager') === 'operations', 'customer enablement stays ops');
  // AR-08 residual batch 25
  assert(categorizeRole('FPGA Associate (Fall 2026)') === 'engineering', 'FPGA associate → eng');
  assert(categorizeRole('FPGA Intern (Fall 2026)') === 'engineering', 'FPGA intern → eng');
  assert(categorizeRole('FPGA Engineer') === 'engineering', 'FPGA engineer stays eng');
  assert(categorizeRole('QC Associate II') === 'operations', 'QC associate abbrev → ops');
  assert(categorizeRole('Quality Control Associate (Repairs)') === 'operations', 'QC long-form stays ops');
  assert(categorizeRole('Production Associate') === 'operations', 'production associate → ops');
  assert(categorizeRole('Escalations Manager') === 'operations', 'escalations manager → ops');
  assert(
    categorizeRole('Executive Escalations Senior Associate') === 'operations',
    'executive escalations → ops',
  );
  assert(categorizeRole('Insights Manager II') === 'marketing', 'insights manager → marketing');
  assert(categorizeRole('Success Insights Manager') === 'operations', 'success insights stays ops');
  assert(
    categorizeRole('Industry Principal, Life Sciences') === 'sales',
    'industry principal → sales',
  );
  assert(categorizeRole('Senior Analyst') === 'other', 'bare senior analyst stays other');
  assert(categorizeRole('General Application') === 'other', 'general application stays other');
  assert(categorizeRole('Remote Therapist — $75–115/hr') === 'other', 'therapist stays other');
  // AR-08 residual batch 26
  assert(
    categorizeRole('Bilingual Care Team Manager (Remote PST, Spanish Speaking)') === 'operations',
    'care team manager → ops',
  );
  assert(categorizeRole('Bilingual Case Manager (Spanish Speaking)') === 'operations', 'case manager → ops');
  assert(
    categorizeRole('Bilingual Healthcare Call Center Representative (Spanish Speaking)') ===
      'operations',
    'call center → ops',
  );
  assert(
    categorizeRole('Bilingual RN Care Manager (Remote Flexible - Spanish Speaking)') === 'other',
    'RN care manager stays other (medical)',
  );
  assert(categorizeRole('Italian Translator / Linguist (Contract)') === 'operations', 'translator → ops');
  assert(
    categorizeRole('IFO (Inter-State Field Officer) – Commercial Video Data Collection') ===
      'operations',
    'video data collection → ops',
  );
  assert(
    categorizeRole('Associate Director, Medical Writing') === 'marketing',
    'medical writing → marketing',
  );
  assert(categorizeRole('CoDesign & NextGen - New College Grad') === 'design', 'codesign → design');
  assert(categorizeRole('Bilingual Actor - Spanish - English') === 'other', 'actor stays other');
  // AR-08 residual batch 27
  assert(
    categorizeRole('Field Application Scientist, SynBio and NGS Panel Design - CHINA') === 'sales',
    'field application scientist → sales',
  );
  assert(
    categorizeRole('Superviseur (-e), Soutien Premium Bilingue (français/anglais)') === 'operations',
    'soutien premium → ops',
  );
  assert(
    categorizeRole('Visual Journalist Intern (Photo + Video), Snappr News') === 'design',
    'visual journalist → design',
  );
  assert(
    categorizeRole('English-Italian Bilingual Script Supervisor') === 'design',
    'script supervisor → design',
  );
  assert(
    categorizeRole('Sr. Associate, Compassionate Care (Overnight)') === 'operations',
    'compassionate care → ops',
  );
  assert(
    categorizeRole('Field Hospital Enrollment Specialist (Bilingual Spanish)') === 'operations',
    'enrollment specialist → ops',
  );
  assert(
    categorizeRole('Radiology Transcriptionist (Contract)') === 'operations',
    'transcriptionist → ops',
  );
  assert(
    categorizeRole('Radiation Protection Technician (Paducah)') === 'operations',
    'radiation protection → ops',
  );
  assert(
    categorizeRole('Radiation Safety Officer (RSO)') === 'operations',
    'radiation safety officer → ops',
  );
  assert(
    categorizeRole('Operario/a de Limpieza Industrial') === 'operations',
    'limpieza industrial → ops',
  );
  assert(
    categorizeRole('Secure Manufacturing & Stealth Investigator') === 'operations',
    'secure mfg investigator → ops',
  );
  assert(categorizeRole('Bilingual Actor - French - English') === 'other', 'actor stays other');
  assert(
    categorizeRole('Bilingual RN Care Manager (Remote Flexible - Spanish Speaking)') === 'other',
    'RN care manager stays other',
  );
  assert(categorizeRole('Safety Specialist') === 'other', 'bare safety specialist stays other');
  assert(categorizeRole('On-Site Catering Attendant (Lunch)') === 'other', 'catering stays other');
  assert(categorizeRole('Scientist, Medicinal Chemistry') === 'other', 'wet-lab scientist stays other');
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
    assert(coverage.hits === 1 && coverage.totalRoles === 2 && coverage.ycLinks === 1 && tiny.coverage.namedCompanies === 2, 'coverage recomputed from current rows');
    const hnKept = withoutJobEvidence({ jobsUrl: 'https://jobs.ashbyhq.com/acme', jobsSource: 'HN', openRoles: 2, atsSource: 'Ashby' });
    assert(hnKept.jobsUrl === 'https://jobs.ashbyhq.com/acme' && !('openRoles' in hnKept), 'HN board identity survives stale role stripping');
    assert(!('jobsUrl' in withoutJobEvidence(hnKept, false)), 'repair can still remove a denied HN board');
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
      return withoutJobEvidence(company, false);
    });
    const coverage = updateJobsCoverage(map, at);
    atomicWrite(MAP, `${JSON.stringify(map)}\n`);
    console.log(JSON.stringify({ ok: true, removed, coverage, at }, null, 2));
    process.exit(0);
  }
  const results = await pool(map.companies, async (c) => {
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
