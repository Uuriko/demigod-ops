#!/usr/bin/env node
/**
 * demigod-contact-discover — read the contact address a company already published.
 *
 * THE GAP THIS FILLS
 * 15 leads sit in `policy_hold` for want of a contact, and every one of them came from a Y Combinator
 * Work-at-a-Startup posting. The enrichment scraped that posting, got the company's own website, and
 * stopped. `attachPublicContact()` — the only contact step in the pipeline — reads contact out of the
 * lead's own URL string: an `x.com/<handle>/status` path, a LinkedIn profile. A
 * `workatastartup.com/jobs/98603` URL contains neither, so the lead parks and nothing ever looks at
 * `tryastraea.com` to see whether the founders published an address on their own front page.
 *
 * WHAT "NEVER INVENT CONTACT" MEANS HERE
 * The rule in this pipeline is that contact is never invented, and this obeys it exactly. Nothing is
 * guessed: no `firstname@company.com`, no pattern, no directory purchase. The only thing recorded is
 * a string the company itself put on its own website for people to write to. A `mailto:` link ranks
 * above an address in body text, because a mailto is an unambiguous "write to us here" and a bare
 * string in prose may be someone else's address being quoted.
 *
 * Everything found carries the page URL and the retrieval time, in the same `contactProvenance`
 * shape the rest of the funnel uses, so a human reviewing it can see where it came from.
 *
 * DRY RUN IS THE DEFAULT
 * `--apply` is required to touch DEMIGOD-LEADS.json, and even then this only fills the contact field.
 * Releasing a hold stays with `demigod-funnel.mjs release-holds`, and sending stays with a human.
 *
 *   node demigod-contact-discover.mjs                 # dry run over held leads
 *   node demigod-contact-discover.mjs --apply
 *   node demigod-contact-discover.mjs --selftest
 *
 * Schema: demigod.contact-discover/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isUsableOutreachEmail, isOwnSiteUrl } from './demigod-lead-collect.mjs';
import { withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const LEADS = path.join(ROOT, 'DEMIGOD-LEADS.json');
const LOCK = path.join(ROOT, 'DEMIGOD-LEADS.json.lock');
const OUT = path.join(ROOT, 'DEMIGOD-CONTACT-DISCOVERY.json');
const TIMEOUT_MS = 9000;

const UA = 'DemigodDirectoryBot/1.0 (+https://trydemigod.com; contact page lookup)';

/** Where companies actually put an address. Ordered: the front page first, then the obvious pages. */
export const CONTACT_PATHS = ['', '/contact', '/about', '/careers', '/jobs'];

/**
 * Job-board hosts that sometimes land in `companyUrl` by mistake. Clera's companyUrl is
 * `jobs.ashbyhq.com`, which is an applicant tracking system, not a company. Scraping it would find
 * Ashby's address and file it as Clera's.
 */
export const ATS_HOSTS = [
  'jobs.ashbyhq.com', 'boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co',
  'apply.workable.com', 'jobs.workable.com', 'workatastartup.com', 'www.workatastartup.com',
  'linkedin.com', 'www.linkedin.com',
];

/** PURE. Is this a company's own site, or a platform standing in for one? */
export function isCompanySite(url) {
  let host;
  try { host = new URL(String(url)).hostname.toLowerCase(); } catch { return false; }
  return !ATS_HOSTS.includes(host) && !ATS_HOSTS.includes(host.replace(/^www\./, ''));
}

/** Hold reasons this can help with. A LinkedIn identity conflict is a different problem. */
export const FIXABLE_HOLDS = ['no-usable-contact', 'enrich-exhausted', 'no-contact-email'];

/**
 * PURE. Pull candidate addresses out of one page, ranked by how deliberately they were published.
 *
 * `mailto` beats `text` because the company wrote a link meaning "write here", whereas an address
 * sitting in prose might belong to a customer, a press contact at another firm, or an example.
 */
export function candidatesFromHtml(html, { pageUrl } = {}) {
  const source = String(html || '');
  const out = [];
  const seen = new Set();
  const push = (raw, method) => {
    const email = String(raw || '').trim().toLowerCase().replace(/^mailto:/, '').split('?')[0];
    if (!email || seen.has(email)) return;
    seen.add(email);
    if (!isUsableOutreachEmail(email)) return;
    out.push({ email, method, pageUrl: pageUrl || null });
  };
  for (const m of source.matchAll(/href\s*=\s*["']mailto:([^"'?>]+)/gi)) push(m[1], 'mailto');
  for (const m of source.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) push(m[0], 'text');
  return out;
}

/** PURE. Does the address live on the company's own domain? Recorded, never used to auto-reject. */
export function sameRegistrableDomain(email, siteUrl) {
  const domainOf = (host) => String(host || '').toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
  let siteHost;
  try { siteHost = new URL(String(siteUrl)).hostname; } catch { return null; }
  const emailHost = String(email || '').split('@')[1];
  if (!emailHost || !siteHost) return null;
  return domainOf(emailHost) === domainOf(siteHost);
}

/**
 * PURE. Pick one address for a lead from everything found across its pages.
 *
 * A mailto on the company's own domain is the strongest signal available without asking a human.
 */
export function pickContact(candidates, siteUrl) {
  const scored = candidates.map((c) => ({
    ...c,
    sameDomain: sameRegistrableDomain(c.email, siteUrl),
    rank: (c.method === 'mailto' ? 2 : 0) + (sameRegistrableDomain(c.email, siteUrl) ? 1 : 0),
  }));
  scored.sort((a, b) => b.rank - a.rank || a.email.localeCompare(b.email));
  const best = scored[0];
  return best ? { ...best, confident: isConfident(best) } : null;
}

/**
 * PURE. May this be written to a lead without a human looking at it first?
 *
 * The first live run answered this. PerfectBit's page yielded `alex@frontier.ai` from body text —
 * a different company entirely, presumably an investor or a partner named on the site. Writing that
 * as PerfectBit's contact would send a pitch about PerfectBit's hiring to someone at Frontier.
 *
 * So a bare string in prose is only trusted when it is on the company's own domain. A `mailto:` is
 * trusted either way, because the company built a link on its own site meaning "write here" — a
 * founder pointing that at a personal domain is normal, and is still their deliberate choice.
 */
export function isConfident(candidate) {
  if (!candidate) return false;
  if (candidate.method === 'mailto') return true;
  return candidate.sameDomain === true;
}

/** PURE. The leads this can act on, with the site to look at. */
export function heldLeads(doc) {
  const all = [...(doc?.partners || []), ...(doc?.talent || [])];
  return all.filter((lead) => lead
    && lead.state === 'policy_hold'
    && FIXABLE_HOLDS.includes(lead.policyHoldReason)
    && !isUsableOutreachEmail(lead.contactEmail || lead.email)
    && lead.companyUrl
    && isCompanySite(lead.companyUrl)
    && !isOwnSiteUrl(lead.companyUrl));
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!/text\/html|text\/plain/i.test(type)) return null;
    return { html: (await res.text()).slice(0, 400000), url: res.url };
  } catch { return null; }
}

async function discoverFor(lead) {
  const base = String(lead.companyUrl).replace(/\/+$/, '');
  const found = [];
  for (const suffix of CONTACT_PATHS) {
    const page = await fetchPage(`${base}${suffix || '/'}`);
    if (!page) continue;
    found.push(...candidatesFromHtml(page.html, { pageUrl: page.url }));
    // The front page answering is the common case; stop early rather than fetch five pages per lead.
    if (found.some((c) => c.method === 'mailto')) break;
  }
  const pick = pickContact(found, lead.companyUrl);
  return { id: lead.id, company: lead.company || null, companyUrl: lead.companyUrl, found: found.length, pick };
}

export async function run({ apply = false } = {}) {
  const doc = JSON.parse(fs.readFileSync(LEADS, 'utf8'));
  const leads = heldLeads(doc);
  const results = [];
  for (const lead of leads) results.push(await discoverFor(lead));

  const hits = results.filter((r) => r.pick?.confident);
  const needsReview = results.filter((r) => r.pick && !r.pick.confident);
  const report = {
    schema: 'demigod.contact-discover/1',
    at: new Date().toISOString(),
    considered: leads.length,
    discovered: hits.length,
    needsReview: needsReview.map((r) => ({ id: r.id, company: r.company, email: r.pick.email, why: 'body text on a domain that is not the company' })),
    applied: false,
    results,
  };

  if (apply && hits.length) {
    withFileLock(LOCK, () => {
      const live = JSON.parse(fs.readFileSync(LEADS, 'utf8'));
      const index = new Map([...(live.partners || []), ...(live.talent || [])].map((l) => [l.id, l]));
      let wrote = 0;
      for (const hit of hits) {
        const lead = index.get(hit.id);
        // Re-check under the lock: another agent may have filled this since the fetch.
        if (!lead || isUsableOutreachEmail(lead.contactEmail || lead.email)) continue;
        lead.contactEmail = hit.pick.email;
        lead.contactProvenance = {
          url: hit.pick.pageUrl,
          at: report.at,
          method: `published-${hit.pick.method}`,
          fields: { contactEmail: { url: hit.pick.pageUrl, at: report.at, method: `published-${hit.pick.method}` } },
        };
        wrote += 1;
      }
      fs.writeFileSync(LEADS, `${JSON.stringify(live, null, 1)}\n`);
      report.applied = wrote;
    });
  }
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 1)}\n`);
  return report;
}

function selftest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`contact-discover selftest: ${msg}`); };

  // A mailto is a deliberate publication; prose is weaker evidence.
  const html = '<a href="mailto:founders@acme.com">write us</a> or see bob@other.example in the footer';
  const found = candidatesFromHtml(html, { pageUrl: 'https://acme.com/' });
  assert(found[0].email === 'founders@acme.com' && found[0].method === 'mailto', 'mailto is found and labelled');
  assert(found.some((c) => c.email === 'bob@other.example' && c.method === 'text'), 'body text is found but labelled weaker');

  // The existing noise policy must still apply — job-board mailboxes are not the company.
  const noisy = candidatesFromHtml('<a href="mailto:workatastartup@ycombinator.com">apply</a><a href="mailto:noreply@acme.com">x</a>');
  assert(noisy.length === 0, 'platform and no-reply mailboxes are refused by the existing rule');
  assert(candidatesFromHtml('<a href="mailto:a@trydemigod.com">us</a>').length === 0, 'our own address is never a discovery');

  // Query strings and duplicates must not produce junk.
  const q = candidatesFromHtml('<a href="mailto:hi@acme.com?subject=Hello">a</a><a href="mailto:hi@acme.com">b</a>');
  assert(q.length === 1 && q[0].email === 'hi@acme.com', 'a subject line is stripped and duplicates collapse');

  assert(sameRegistrableDomain('a@acme.com', 'https://www.acme.com/') === true, 'www does not break domain comparison');
  assert(sameRegistrableDomain('a@other.com', 'https://acme.com/') === false, 'a different domain is reported as such');
  assert(sameRegistrableDomain('nope', 'https://acme.com/') === null, 'junk is unknown, not false');

  // Ranking: own-domain mailto wins over a third-party mailto, which wins over own-domain prose.
  const pick = pickContact([
    { email: 'x@vendor.com', method: 'mailto' },
    { email: 'team@acme.com', method: 'text' },
    { email: 'hi@acme.com', method: 'mailto' },
  ], 'https://acme.com');
  assert(pick.email === 'hi@acme.com', `own-domain mailto must win, got ${pick.email}`);
  assert(pickContact([], 'https://acme.com') === null, 'nothing found is null, not a guess');

  // The rule the first live run forced: a stranger's address in prose is never auto-written.
  const stranger = pickContact([{ email: 'alex@frontier.ai', method: 'text' }], 'https://perfectbit.ai');
  assert(stranger.confident === false, 'body text on another domain must not be written unattended');
  const ownProse = pickContact([{ email: 'connect@asendia.ai', method: 'text' }], 'https://asendia.ai');
  assert(ownProse.confident === true, 'body text on the company own domain is trusted');
  const otherMailto = pickContact([{ email: 'founders@agentphone.to', method: 'mailto' }], 'https://agentphone.ai');
  assert(otherMailto.confident === true, 'a mailto the company published is their choice of address');

  // An ATS URL is not a company site.
  assert(isCompanySite('https://acme.com/') === true, 'a real site is a company site');
  assert(isCompanySite('https://jobs.ashbyhq.com/') === false, 'an ATS host is not a company');
  assert(isCompanySite('https://www.workatastartup.com/x') === false, 'nor is the job board we sourced from');
  assert(isCompanySite('nonsense') === false, 'junk is not a company site');

  // Nothing is ever synthesised from the company name.
  const invented = pickContact([], 'https://acme.com');
  assert(!invented, 'an empty page must never yield founders@acme.com');

  // Only leads that are actually stuck, and never one that already has contact.
  const doc = {
    partners: [
      { id: 'a', state: 'policy_hold', policyHoldReason: 'no-usable-contact', companyUrl: 'https://a.com' },
      { id: 'b', state: 'policy_hold', policyHoldReason: 'linkedin-identity-conflict', companyUrl: 'https://b.com' },
      { id: 'c', state: 'drafted', policyHoldReason: 'no-usable-contact', companyUrl: 'https://c.com' },
      { id: 'd', state: 'policy_hold', policyHoldReason: 'no-usable-contact', companyUrl: 'https://d.com', contactEmail: 'has@d.com' },
      { id: 'e', state: 'policy_hold', policyHoldReason: 'enrich-exhausted', companyUrl: null },
      { id: 'f', state: 'policy_hold', policyHoldReason: 'no-usable-contact', companyUrl: 'https://jobs.ashbyhq.com/' },
    ],
  };
  const held = heldLeads(doc).map((l) => l.id);
  assert(held.length === 1 && held[0] === 'a', `only the fixable hold qualifies, got ${held.join(',')}`);

  console.log(JSON.stringify({ ok: true, selftest: 'contact-discover' }));
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) selftest();
  else {
    const report = await run({ apply: args.includes('--apply') });
    console.log(JSON.stringify({ considered: report.considered, discovered: report.discovered, applied: report.applied }, null, 2));
    for (const row of report.results) {
      if (!row.pick) console.log(`  none    ${String(row.company).padEnd(20)} ${row.companyUrl}`);
      else if (row.pick.confident) console.log(`  found   ${String(row.company).padEnd(20)} ${row.pick.email}  (${row.pick.method}${row.pick.sameDomain ? ', own domain' : ', other domain'})`);
      else console.log(`  REVIEW  ${String(row.company).padEnd(20)} ${row.pick.email}  (body text on a domain that is not the company — not written)`);
    }
  }
}
