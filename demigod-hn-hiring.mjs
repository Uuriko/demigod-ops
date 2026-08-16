#!/usr/bin/env node
// Mine actively-hiring SF companies from Hacker News "Ask HN: Who is hiring?" monthly threads.
// These are companies publicly announcing they hire, in a semi-structured format:
//   COMPANY | ROLE(S) | LOCATION | ONSITE/REMOTE | ... <url>
// We extract company name + their own posted URL (→ website + often a direct ATS board), keep only
// posts that name an SF/Bay location, and dedupe by website host. Honest provenance: each entry is a
// company's own public HN posting ("HN-public"), attributed to the specific thread — not scraped
// private data, not our claim. Recurring + fresh: a new thread every month.
//
//   node demigod-hn-hiring.mjs [--months N] [--out <dir>] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { normalizeCompanyName } from './demigod-startup-atlas.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SF_RE = /\b(san\s*francisco|\bsf\b|bay\s*area|oakland|berkeley|palo\s*alto|mountain\s*view|san\s*mateo|redwood\s*city|menlo\s*park|sunnyvale|cupertino|santa\s*clara|san\s*jose|emeryville|south\s*san\s*francisco|silicon\s*valley|peninsula)\b/i;
// Hosts that are never a company's own website (aggregators, SaaS HR, short-links, video).
// Match exact host OR registrable domain via isBadHost() so app.deel.com is covered by deel.com.
const BADHOST = /^(github\.com|gitlab\.com|twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com|youtube\.com|youtu\.be|docs\.google\.com|forms\.gle|notion\.so|notion\.site|calendly\.com|medium\.com|angel\.co|wellfound\.com|producthunt\.com|indeed\.com|glassdoor\.com|builtin\.com|otta\.com|news\.ycombinator\.com|ycombinator\.com|discord\.gg|discord\.com|t\.me|mailto|tally\.so|grnh\.se|deel\.com|typeform\.com|bit\.ly|lnkd\.in|linktr\.ee)$/i;
/** True when host (or its last-two labels) is never a company identity. */
export function isBadHost(host) {
  if (!host) return true;
  const h = String(host).toLowerCase().replace(/^www\./, '');
  if (BADHOST.test(h)) return true;
  const reg = h.split('.').slice(-2).join('.');
  return reg !== h && BADHOST.test(reg);
}
// Place-only "company names" (HN posts that lead with a city instead of a brand).
const PLACE_ONLY_NAME =
  /^(san\s+francisco|sf|oakland|berkeley|palo\s+alto|mountain\s+view|san\s+mateo|santa\s+clara|san\s+jose|bay\s+area|silicon\s+valley|peninsula|redwood\s+city|menlo\s+park|sunnyvale|cupertino)(?:\s*,\s*[A-Za-z]{2})?$/i;

// Bias toward startups: HN "Who is hiring?" also draws big established companies. Exclude clearly
// non-startup mega-corps (household public companies) by registrable domain. Heuristic + extensible;
// only affects what HN *adds* (a company already in via YC/Wikidata is unaffected). A principled
// alternative (Wikidata public-company / employee-count) could replace this later.
const NOT_STARTUP = new Set([
  'apple.com', 'google.com', 'alphabet.com', 'microsoft.com', 'amazon.com', 'aws.amazon.com', 'meta.com',
  'facebook.com', 'netflix.com', 'adobe.com', 'oracle.com', 'salesforce.com', 'ibm.com', 'intel.com',
  'cisco.com', 'nvidia.com', 'qualcomm.com', 'hp.com', 'dell.com', 'sap.com', 'vmware.com', 'paypal.com',
  'ebay.com', 'yahoo.com', 'uber.com', 'lyft.com', 'doordash.com', 'walmart.com', 'target.com',
  'wellsfargo.com', 'jpmorgan.com', 'chase.com', 'visa.com', 'mastercard.com', 'disney.com', 'comcast.com',
  'verizon.com', 'att.com', 'tesla.com', '23andme.com', 'adyen.com', 'workday.com', 'servicenow.com',
  'zoom.us', 'samsung.com', 'sony.com', 'twilio.com', 'dropbox.com', 'atlassian.com', 'block.xyz',
]);
// Distinctive mega-corp labels — matched as a subdomain first-label too, since HN posts often link
// a careers subdomain (jobs.apple.com) or a shared-ATS host (23andme.wd5.myworkdayjobs.com). Kept to
// distinctive names only (no generic tokens like block/target/visa) to avoid false positives.
const NOT_STARTUP_NAMES = new Set(['apple', 'google', 'microsoft', 'amazon', 'adobe', 'oracle', 'salesforce', 'netflix', 'nvidia', 'qualcomm', '23andme', 'adyen', 'workday', 'servicenow', 'samsung', 'atlassian', 'twilio', 'dropbox', 'vmware', 'paypal', 'tesla']);
const NOT_STARTUP_ATS_SLUGS = new Set([...NOT_STARTUP].map((domain) => domain.split('.')[0]));
const BAD_NAME_HOST = new Set(['modal|engineering.ramp.com']);
const regDomain = (host) => host.split('.').slice(-2).join('.');
export function isMegaCorp(host) {
  if (!host) return false;
  if (NOT_STARTUP.has(host) || NOT_STARTUP.has(regDomain(host))) return true;
  // ATS-slug identities arrive as "greenhouse.io/<slug>" (parseHnPost sets this when a post links
  // only a board, because the board HOST is not a company identity — the slug is). Splitting on
  // "." only ever sees "greenhouse", so the startup-bias list never saw the slug and EVERY
  // mega-corp posting a clean ATS link walked straight through. Measured 2026-07-31: 65 of 314
  // cached HN rows are ATS-slug identities. Guard here rather than in the one caller, so the
  // cache-read boundary and any future caller get it too.
  const slash = String(host).indexOf('/');
  if (slash > -1) {
    const slug = String(host).slice(slash + 1).toLowerCase();
    if (slug && (NOT_STARTUP_ATS_SLUGS.has(slug) || NOT_STARTUP_NAMES.has(slug))) return true;
    return NOT_STARTUP_NAMES.has(String(host).slice(0, slash).split('.')[0]);
  }
  return NOT_STARTUP_NAMES.has(host.split('.')[0]);
}

export function decodeEntities(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x2f;/gi, '/').replace(/&#x27;/gi, "'").replace(/&#38;|&amp;/gi, '&')
    .replace(/&gt;/gi, '>').replace(/&lt;/gi, '<').replace(/&quot;/gi, '"').replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function registrableDomain(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    return h;
  } catch {
    return '';
  }
}

export function canonicalHnAtsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      !/^(?:boards\.greenhouse\.io|job-boards(?:\.eu)?\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|jobs\.gem\.com)$/.test(host)
    ) return null;
    const slug = url.pathname.split('/').filter(Boolean)[0];
    if (host === 'jobs.ashbyhq.com' && /^(?:pear|pear-vc)$/i.test(slug || '')) return null;
    return /^[a-z0-9._-]+$/i.test(slug || '') ? `https://${host}/${slug.toLowerCase()}` : null;
  } catch {
    return null;
  }
}

/** False only when a website is present AND its host is one we never accept as a company site.
 *  BADHOST is applied at parse time, so rows cached BEFORE a host joined the list keep flowing
 *  into the map on every rebuild (producthunt.com survived exactly this way). Callers that read
 *  the cache re-check here so the ban applies to old rows too. A null website is not banned —
 *  "no verified website on record" is an honest state the directory already renders.
 *
 *  SCOPED TO THE HN PATH ON PURPOSE — do not apply this to the YC or Wikidata rows. BADHOST means
 *  "not a company identity when linked from someone else's HN post", not "not a company website".
 *  Deel, Notion, AngelList, GitLab and Substack all legitimately own hosts on that list, and a
 *  blanket application deletes them from the directory. */
export function isCompanyWebsiteHost(url) {
  if (!url) return true;
  const host = registrableDomain(url);
  if (!host) return true;
  return !isBadHost(host);
}

// HN's convention is `Company | Role | Location | URL`, but a minority of posts lead with the ROLE,
// and then split('|')[0] hands us a job title as the company identity. That is how the map came to
// hold a company called "Engineering Director, Developer Experience" (really Adyen) carrying 90 open
// roles, which the ledger then ranked 5th by open roles. Sibling of PLACE_ONLY_NAME: a role is not a
// brand. Word-bounded so real names survive — "kW Engineering, Inc." is not "Engineer,".
const ROLE_NOUN = /\b(?:engineer|engineers|developer|developers|designer|designers|scientist|manager|director|architect|analyst|recruiter|technician|intern|internship)\b/i;
const ROLE_TITLE_NAME = [
  // A seniority or "founding" prefix only signals a JOB when a role noun follows it. Without that
  // second condition this rejected "Senior Whole Health" — a real healthcare company — and would
  // have silently dropped any senior-care or "Founding Farmers"-style business from the directory.
  (n) => /^(?:senior|sr\.?|staff|principal|junior|jr\.?|founding)\s+/i.test(n) && ROLE_NOUN.test(n),
  // ponytail: "Head of X" / "VP of X" is a title shape with no role noun to key on, so this also
  // rejects the rare real company named that way (Head of Zeus, a UK publisher). Acceptable in an
  // SF-startup ATS corpus; if one ever shows up, allowlist that name rather than drop the rule.
  (n) => /^(?:head of|vp of|vp,|director of)\b/i.test(n),
  // Role noun in HEAD position — at the end, or immediately before a comma-scope suffix.
  // "Engineering Director, Developer Experience" — not "kW Engineering, Inc." or "Scientist.com".
  (n) => new RegExp(`${ROLE_NOUN.source}\\s*(?:,|$)`, 'i').test(n),
];
const HN_UI_NAME = /^(?:\d+\s+points?\s+by\b|hacker news post\b)/i;

export function isPlausibleHnCompanyName(value) {
  const name = String(value ?? '').trim();
  const normalized = normalizeCompanyName(name);
  // ponytail: bounded HN-name heuristic; replace with attributed identity extraction if a valid
  // company name exceeds eight words or 80 characters.
  if (!normalized || name.length < 2 || name.length > 80 || normalized.split(' ').length > 8 || /https?:\/\/|(?:^|\s)www\./i.test(name) || HN_UI_NAME.test(name)) return false;
  return !ROLE_TITLE_NAME.some((looksLikeARole) => looksLikeARole(name));
}

// Parse one HN who-is-hiring comment → {name, website, host, atsUrl} or null.
export function parseHnPost(rawHtml) {
  const text = decodeEntities(rawHtml);
  if (!SF_RE.test(text)) return null; // must name an SF/Bay location
  const name = (text.split('|')[0] || '')
    .trim()
    .replace(/\s+(?:\[\s*)?https?:\/\/.*$/i, '')
    .replace(/\s*\(.*$/, '')
    .replace(/\s+(?:multiple|various|several)\s+roles?$/i, '');
  if (!isPlausibleHnCompanyName(name) || /^(remote|http|www\.)/i.test(name)) return null;
  if (PLACE_ONLY_NAME.test(name)) return null; // city/region is not a company brand
  const urls = (text.match(/https?:\/\/[^\s"'<>()]+/gi) || []).map((u) => u.replace(/[.,)]+$/, ''));
  let website = '', host = '', atsUrl = '';
  for (const u of urls) {
    const h = registrableDomain(u);
    if (!h || isBadHost(h) || /\.gov$/i.test(h)) continue;
    if (/^(boards\.greenhouse\.io|job-boards(?:\.eu)?\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|jobs\.gem\.com)$/i.test(h)) { atsUrl = atsUrl || canonicalHnAtsUrl(u) || ''; continue; }
    if (!website) { website = 'https://' + h + '/'; host = h; }
  }
  if (!website && atsUrl) {
    // An ATS board is not a company website, and its HOST is not a company identity.
    // Keying on the bare host made every ATS-only poster in a thread collide on
    // `hn:boards.greenhouse.io` — first one won, the rest were silently dropped — and
    // published a directory row linking to the ATS root. The board slug is the identity;
    // we simply have no verified website, so say so instead of inventing one.
    const slug = (() => {
      try {
        // Decode first: HN posts carry URLs with encoded spaces, and %20 in a map id is not a
        // board slug — it is a broken identity that fails the stable-id contract downstream.
        // A segment that is not a clean slug means we have no identity, so we say so.
        const raw = decodeURIComponent(new URL(atsUrl).pathname.split('/').filter(Boolean)[0] || '');
        return /^[a-z0-9][a-z0-9._-]*$/i.test(raw) ? raw : '';
      } catch { return ''; }
    })();
    if (!slug) return null;
    host = `${registrableDomain(atsUrl)}/${slug.toLowerCase()}`;
    website = null;
  }
  if (!host || isMegaCorp(host)) return null; // drop mega-corps (incl. careers subdomains) — bias toward startups
  if (BAD_NAME_HOST.has(`${name.toLowerCase()}|${host}`)) return null;
  return { name, website, host, atsUrl: atsUrl || null };
}

async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'DemigodStartupAtlas/1.0 (potter@trydemigod.com)' } });
  if (!r.ok) throw new Error(`${new URL(url).hostname} HTTP ${r.status}`);
  return r.json();
}

export function assertCommentFetchCoverage({ attempted, succeeded }, min = 0.9) {
  const ratio = attempted ? succeeded / attempted : 0;
  if (!Number.isSafeInteger(attempted) || !Number.isSafeInteger(succeeded) || attempted <= 0 || succeeded < 0 || succeeded > attempted || ratio < min) {
    throw new Error(`HN comment fetch coverage ${succeeded}/${attempted} below ${Math.round(min * 100)}%`);
  }
  return { attempted, succeeded, ratio };
}

export async function collectHnCompanies({ months = 2 } = {}) {
  const search = await fetchJson('https://hn.algolia.com/api/v1/search_by_date?query=%22Ask%20HN%3A%20Who%20is%20hiring%3F%22&tags=story,author_whoishiring&hitsPerPage=' + months);
  const threads = (search.hits || []).slice(0, months);
  if (threads.length !== months) throw new Error(`HN thread discovery ${threads.length}/${months}`);
  const byHost = new Map();
  let attempted = 0;
  let succeeded = 0;
  const threadsFetched = [];
  for (const th of threads) {
    const item = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${th.objectID}.json`);
    const kids = (item.kids || []).slice(0, 500);
    const posts = [];
    let threadSucceeded = 0;
    for (let i = 0; i < kids.length; i += 20) {
      posts.push(...await Promise.all(kids.slice(i, i + 20).map(async (id) => {
        attempted++;
        try {
          const c = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          succeeded++;
          threadSucceeded++;
          return c && !c.deleted && !c.dead ? c : null;
        } catch { return null; }
      })));
    }
    threadsFetched.push({ threadId: String(th.objectID), ...assertCommentFetchCoverage({ attempted: kids.length, succeeded: threadSucceeded }) });
    for (const post of posts) {
      if (!post?.text) continue;
      const p = parseHnPost(post.text);
      if (!p) continue;
      if (!byHost.has(p.host)) byHost.set(p.host, { ...p, thread: th.title, threadDate: th.created_at || null, threadUrl: `https://news.ycombinator.com/item?id=${post.id}` });
    }
  }
  return {
    companies: [...byHost.values()],
    commentFetch: { ...assertCommentFetchCoverage({ attempted, succeeded }), threads: threadsFetched },
  };
}

if (isMain && (process.env.DEMIGOD_HN_SELFTEST === '1' || process.argv.includes('--selftest'))) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const sf = parseHnPost('Acme Robotics | Senior Engineer | San Francisco, CA (ONSITE) | Full-time https:&#x2F;&#x2F;acme.io&#x2F;careers');
  assert(sf && sf.name === 'Acme Robotics' && sf.host === 'acme.io', 'SF post parsed: ' + JSON.stringify(sf));
  const multi = parseHnPost('Rad AI Multiple roles | On-site San Francisco | Full-time | https:&#x2F;&#x2F;www.radai.com&#x2F;');
  assert(multi?.name === 'Rad AI', 'role suffix stripped from company name: ' + JSON.stringify(multi));
  const inlineUrl = parseHnPost('Coram.ai https:&#x2F;&#x2F;www.coram.ai | Senior Engineer | Sunnyvale, CA | https:&#x2F;&#x2F;jobs.ashbyhq.com&#x2F;coram-ai');
  assert(inlineUrl?.name === 'Coram.ai' && inlineUrl.host === 'coram.ai', 'inline website stripped from company name: ' + JSON.stringify(inlineUrl));
  assert(parseHnPost('Mithril [ https:&#x2F;&#x2F;mithril.ai&#x2F; ] | ONSITE in Palo Alto | Full Time')?.name === 'Mithril', 'bracketed inline website stripped from company name');
  assert(parseHnPost('1 point by poster 2 days ago | Engineer | San Francisco | https:&#x2F;&#x2F;example.com') === null, 'HN UI metadata is not a company name');
  assert(parseHnPost('Hacker News Post - Who is hiring? ACME | Engineer | San Francisco | https:&#x2F;&#x2F;acme.example') === null, 'scraper labels are not company names');
  assert(
    parseHnPost("I'm Paula, Technical Recruiter @ Modular - Hiring in San Francisco https:&#x2F;&#x2F;jobs.gem.com&#x2F;modular") === null,
    'prose post must not become a company name',
  );
  const ats = parseHnPost('Beta Inc | Backend | SF Bay Area | https:&#x2F;&#x2F;boards.greenhouse.io&#x2F;betainc');
  assert(ats && ats.host === 'boards.greenhouse.io/betainc' && /betainc/.test(ats.atsUrl), 'ATS-only post keyed by board slug: ' + JSON.stringify(ats));
  assert(ats.website === null, 'ATS-only post must not invent a company website: ' + JSON.stringify(ats));
  // The bug this replaced: two ATS-only posters collided on the bare host, so the second
  // was silently dropped by the byHost dedupe and never reached the directory.
  const ats2 = parseHnPost('Gamma Corp | Eng | San Francisco | https:&#x2F;&#x2F;boards.greenhouse.io&#x2F;gammacorp');
  assert(ats2 && ats2.host !== ats.host, 'two ATS-only companies must not collapse into one row');
  const euAts = parseHnPost('Prolific | Eng | San Francisco | https:&#x2F;&#x2F;job-boards.eu.greenhouse.io&#x2F;prolific');
  assert(euAts?.website === null && euAts.host.endsWith('/prolific'), 'EU Greenhouse board is ATS identity, not company website');
  const gem = parseHnPost('Piq Energy | Eng | San Francisco | https:&#x2F;&#x2F;jobs.gem.com&#x2F;piqenergy');
  assert(gem?.website === null && gem.host.endsWith('/piqenergy'), 'Gem board is ATS identity, not company website');
  assert(parseHnPost('Zeta | Eng | San Francisco | https:&#x2F;&#x2F;boards.greenhouse.io&#x2F;') === null, 'ATS root with no slug has no identity');
  assert(parseHnPost('Fathom | Eng | San Francisco | https:&#x2F;&#x2F;producthunt.com&#x2F;posts&#x2F;fathom') === null, 'aggregator page is not a company website');
  assert(parseHnPost('Public Agency | Eng | San Francisco | https:&#x2F;&#x2F;careers.sf.gov&#x2F;') === null, 'government employer is not a startup company');
  assert(parseHnPost('Modal | Eng | San Francisco | https:&#x2F;&#x2F;engineering.ramp.com&#x2F;') === null, 'known name/domain mismatch rejected');
  assert(parseHnPost('Gamma | Engineer | Berlin, Germany | REMOTE (EU only) https://gamma.de') === null, 'non-SF post rejected');
  assert(parseHnPost('Delta | Remote (worldwide) | https://delta.com') === null, 'remote-only (no SF) rejected');
  assert(parseHnPost('Eps | Eng | San Francisco | https://github.com/eps') === null, 'social-only host rejected (no real site)');
  assert(parseHnPost('Apple | iOS Engineer | San Francisco | https:&#x2F;&#x2F;jobs.apple.com&#x2F;role') === null, 'mega-corp via careers subdomain (jobs.apple.com) excluded');
  assert(parseHnPost('Adobe | Backend | SF Bay Area | https:&#x2F;&#x2F;careers.adobe.com&#x2F;x') === null, 'mega-corp via careers subdomain (careers.adobe.com) excluded');
  assert(parseHnPost('23andMe | Eng | San Francisco | https:&#x2F;&#x2F;23andme.wd5.myworkdayjobs.com&#x2F;x') === null, 'mega-corp via shared-ATS subdomain (23andme.*.myworkdayjobs) excluded');
  assert(isMegaCorp('jobs.apple.com') && isMegaCorp('careers.adobe.com') && isMegaCorp('greenhouse.io/uber') && isMegaCorp('greenhouse.io/zoom') && !isMegaCorp('tinystartup.ai'), 'isMegaCorp matching');
  assert(parseHnPost('Tiny Startup | Eng | San Francisco | https:&#x2F;&#x2F;tinystartup.ai') !== null, 'real startup kept');
  // Codex map-data drift: third-party hosts / place-only names must not become company identities.
  assert(parseHnPost('SwingVision is the AI tennis app | Eng | San Francisco | https:&#x2F;&#x2F;app.deel.com&#x2F;') === null, 'deel.com HR SaaS is not a company website');
  assert(parseHnPost('Santa Clara, CA | Eng | San Francisco | https:&#x2F;&#x2F;tally.so&#x2F;r&#x2F;x') === null, 'place-only name + form host rejected');
  assert(parseHnPost('Charge Robotics | Eng | San Francisco | https:&#x2F;&#x2F;youtu.be&#x2F;abc') === null, 'youtu.be is not a company website');
  assert(parseHnPost('Pomelo Care | Eng | San Francisco | https:&#x2F;&#x2F;grnh.se&#x2F;x') === null, 'grnh.se short-link is not a company website');
  assert(isBadHost('app.deel.com') && isBadHost('youtu.be') && !isBadHost('tinystartup.ai'), 'isBadHost registrable-domain coverage');
  const atsRow = toCompanyRow({ ...ats, threadDate: '2026-07-01T00:00:00Z' }, '2026-07-31');
  assert(
    atsRow.jobsUrl === 'https://boards.greenhouse.io/betainc' &&
      atsRow.jobsSource === 'HN' && atsRow.hiringEvidenceAt === '2026-07-01',
    'HN ATS evidence and its date survive cache mapping',
  );
  assert(canonicalHnAtsUrl('https://evil.example/betainc') === null, 'only public ATS hosts survive cache mapping');
  // A percent-encoded path segment is not a board slug. Live case from the 12-month backfill:
  // jobs.ashbyhq.com/normal%20computing%20ai minted `hn:jobs.ashbyhq.com/normal%20computing%20ai`,
  // which fails stableMapCompanyId and breaks the map's id contract.
  assert(parseHnPost('Normal Computing | Eng | San Francisco | https://jobs.ashbyhq.com/normal%20computing%20ai') === null, 'encoded-space ATS segment is not an identity');
  assert(parseHnPost('Real Co | Eng | San Francisco | https://jobs.ashbyhq.com/real-co') !== null, 'a clean ATS slug is still an identity');
  assert(parseHnPost('Kato | Eng | San Francisco | https://jobs.ashbyhq.com/pear') === null, 'shared Pear portfolio board is not Kato identity');
  assert(parseHnPost('Kato | Eng | San Francisco | https://jobs.ashbyhq.com/pear-vc') === null, 'shared Pear VC portfolio board is not Kato identity');
  // Backfilled threads must not publish a stale "is hiring" claim.
  assert(isFreshHnThread('2026-07-01T00:00:00Z', '2026-07-31'), 'recent thread is a live hiring claim');
  assert(!isFreshHnThread('2025-09-01T00:00:00Z', '2026-07-31'), 'year-old thread is NOT a live hiring claim');
  assert(!isFreshHnThread('2026-08-01T00:00:00Z', '2026-07-31'), 'future evidence is not a live hiring claim');
  assert(!isFreshHnThread(null, '2026-07-31'), 'undated thread is not a live hiring claim');
  assert(assertCommentFetchCoverage({ attempted: 100, succeeded: 90 }).ratio === 0.9, '90% comment coverage passes');
  let coverageThrew = false;
  try { assertCommentFetchCoverage({ attempted: 100, succeeded: 89 }); } catch { coverageThrew = true; }
  assert(coverageThrew, 'degraded comment coverage fails cache replacement');
  let missingThreadThrew = false;
  try {
    [{ attempted: 5500, succeeded: 5500 }, { attempted: 500, succeeded: 0 }]
      .forEach((coverage) => assertCommentFetchCoverage(coverage));
  } catch { missingThreadThrew = true; }
  assert(missingThreadThrew, 'one missing current thread fails even when aggregate coverage exceeds 90%');
  assert(
    toCompanyRow({ host: 'a.io', name: 'A', website: 'https://a.io/', threadDate: '2025-09-01T00:00:00Z' }, '2026-07-31').hiring === 'unknown' &&
      toCompanyRow({ host: 'b.io', name: 'B', website: 'https://b.io/', threadDate: '2026-07-01T00:00:00Z' }, '2026-07-31').hiring === 'yes',
    'row hiring flag follows thread age',
  );
  assert(
    newHnCompanies([ats, sf, ats2], { companies: [
      { id: 'hn:boards.greenhouse.io/betainc', website: null },
      { id: 'yc:acme', website: 'https://acme.io/' },
    ] }).map((row) => row.host).join(',') === 'boards.greenhouse.io/gammacorp',
    'directory delta recognizes both exact ATS identities and matching company websites',
  );
  // The cache is a directory input on every rebuild, so a row dropped here is a company deleted
  // from the public map. These four properties are what stops that recurring.
  const oldRow = toCompanyRow({ host: 'old.io', name: 'Old Co', website: 'https://old.io/', threadDate: '2026-01-01T00:00:00Z' }, '2026-01-02');
  const newRow = toCompanyRow({ host: 'new.io', name: 'New Co', website: 'https://new.io/', threadDate: '2026-08-01T00:00:00Z' }, '2026-08-16');
  const carried = mergeHnCache([{ ...oldRow, hiring: 'yes' }], [newRow], '2026-08-16');
  assert(carried.length === 2, 'a company outside the --months window keeps its row: ' + carried.length);
  assert(carried.find((r) => r.id === 'hn:old.io')?.hiring === 'unknown', 'a carried hiring claim ages to unknown once its thread is stale');
  assert(carried.find((r) => r.id === 'hn:new.io')?.hiring === 'yes', 'a current thread still claims hiring');
  assert(carried.find((r) => r.id === 'hn:old.io')?.retrievedAt === '2026-01-02', 'carrying a row must not restamp when we retrieved it');
  const restated = mergeHnCache(
    [{ ...newRow, name: 'Stale Name' }],
    [{ ...newRow, name: 'New Co' }],
    '2026-08-16',
  );
  assert(restated.length === 1 && restated[0].name === 'New Co', 'same thread re-parsed: this run wins, no duplicate row');
  console.log(JSON.stringify({ ok: true, selftest: 'hn-hiring' }));
  process.exit(0);
}

/**
 * "Is hiring" is only a live claim while the post is recent. Backfilling older threads adds real
 * companies but a year-old "we're hiring" is not evidence they are hiring today — those rows say
 * `hiring:'unknown'` and let the ATS jobs-enrich speak for itself. 120d keeps the previous
 * 3-month window claiming 'yes' exactly as before.
 */
export function isFreshHnThread(threadDate, asOf = new Date(), maxDays = 120) {
  const t = Date.parse(String(threadDate || ''));
  const now = Date.parse(String(asOf?.toISOString?.() || asOf));
  if (!Number.isFinite(t) || !Number.isFinite(now)) return false;
  const age = now - t;
  return age >= 0 && age <= maxDays * 86400000;
}

// Map-ready company row from a parsed HN post. Provenance = the company's own public HN posting.
export function toCompanyRow(c, retrievedAt) {
  const jobsUrl = canonicalHnAtsUrl(c.atsUrl);
  return {
    id: 'hn:' + c.host,
    name: c.name,
    description: null,
    website: c.website,
    inceptionYear: null,
    tags: ['hn-hiring'],
    locationPrecision: 'city',
    neighborhood: null,
    hiring: isFreshHnThread(c.threadDate, retrievedAt) ? 'yes' : 'unknown',
    source: 'Hacker News (Who is Hiring)',
    sourceUrl: c.threadUrl,
    sourceLicense: 'HN-public',
    retrievedAt,
    hiringEvidenceAt: c.threadDate ? String(c.threadDate).slice(0, 10) : null,
    ...(jobsUrl ? { jobsUrl, jobsSource: 'HN' } : {}),
  };
}

/**
 * Union the cached rows with this run's rows. The cache is read on EVERY map rebuild
 * (`buildHnPublicCompanies`), so a replace-write silently deletes every company whose thread has
 * rolled out of the `--months` window — that is how 157 HN companies, 98 of them with live ATS
 * open roles, left the directory between the 2026-08-06 and 2026-08-14 maps. `isFreshHnThread`
 * already encodes the right answer: keep the company, age its hiring claim to 'unknown'.
 * Newest thread evidence wins per id, and freshness is recomputed against `asOf` so a carried
 * 'yes' cannot outlive its evidence. `retrievedAt` is left alone — we did not re-see those posts.
 *
 * ponytail: unbounded by design — an SF company we once observed stays observable, and identity
 * guards are re-applied on read. Prune by `hiringEvidenceAt` only if the cache outgrows the map.
 */
export function mergeHnCache(cached = [], fresh = [], asOf = new Date()) {
  const byId = new Map();
  const evidence = (row) => String(row?.hiringEvidenceAt || '');
  for (const row of [...(cached || []), ...(fresh || [])]) {
    if (!row?.id) continue;
    const prev = byId.get(row.id);
    // >= so this run's parse wins a tie: same thread, but current name/website rules applied.
    if (!prev || evidence(row) >= evidence(prev)) byId.set(row.id, row);
  }
  return [...byId.values()].map((row) => ({
    ...row,
    hiring: isFreshHnThread(row.hiringEvidenceAt, asOf) ? 'yes' : 'unknown',
  }));
}

/** Exact-id/website delta only; ATS-only rows cannot be compared to website hosts alone. */
export function newHnCompanies(hn, map) {
  const ids = new Set((map?.companies || []).map((row) => String(row?.id || '').toLowerCase()).filter(Boolean));
  const sites = new Set((map?.companies || []).map((row) => registrableDomain(row?.website)).filter(Boolean));
  return (hn || []).filter((row) =>
    !ids.has(`hn:${String(row?.host || '').toLowerCase()}`) &&
    (!row?.website || !sites.has(registrableDomain(row.website))));
}

if (isMain) {
  const months = (() => { const i = process.argv.indexOf('--months'); return i > 0 ? Number(process.argv[i + 1]) || 2 : 2; })();
  const outPath = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? path.join(process.argv[i + 1], 'DEMIGOD-HN-HIRING.json') : path.join(ROOT, 'DEMIGOD-HN-HIRING.json'); })();
  const today = new Date().toISOString().slice(0, 10);
  const { companies: hn, commentFetch } = await collectHnCompanies({ months });
  const rows = hn.map((c) => toCompanyRow(c, today));
  // cache the map-ready HN companies (map-data.mjs merges this; refresh monthly).
  // Accumulate: a company that rolled out of the --months window keeps its row and loses its
  // hiring claim, it does not leave the directory. See mergeHnCache.
  const cached = (() => {
    try { return JSON.parse(fs.readFileSync(outPath, 'utf8')).companies || []; } catch { return []; }
  })();
  const companies = mergeHnCache(cached, rows, today);
  atomicWrite(outPath, JSON.stringify({ generatedAt: today, months, source: 'Hacker News Who is Hiring', companies }, null, 2) + '\n', { mode: 0o644 });
  // report the delta vs the current directory (by website host)
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const novel = newHnCompanies(hn, map);
  console.log(JSON.stringify({
    ok: true, months, outPath, commentFetch, sfCompaniesFound: hn.length, alreadyInDirectory: hn.length - novel.length,
    cacheRows: companies.length, carriedFromEarlierThreads: companies.length - rows.length,
    stillClaimingHiring: companies.filter((c) => c.hiring === 'yes').length,
    discoveryCandidates: novel.length,
    candidatesWithDirectAtsLink: novel.filter((c) => c.atsUrl).length,
    note: 'discovery only; admission requires current identity, operating-status, and Bay evidence review',
    sample: novel.slice(0, 12).map((c) => c.name + ' (' + c.host + ')'),
  }, null, 2));
}
