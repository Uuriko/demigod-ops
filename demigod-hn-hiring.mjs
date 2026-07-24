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

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SF_RE = /\b(san\s*francisco|\bsf\b|bay\s*area|oakland|berkeley|palo\s*alto|mountain\s*view|san\s*mateo|redwood\s*city|menlo\s*park|sunnyvale|cupertino|santa\s*clara|san\s*jose|emeryville|south\s*san\s*francisco|silicon\s*valley|peninsula)\b/i;
const BADHOST = /^(github\.com|gitlab\.com|twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com|youtube\.com|docs\.google\.com|forms\.gle|notion\.so|notion\.site|calendly\.com|medium\.com|angel\.co|wellfound\.com|news\.ycombinator\.com|ycombinator\.com|discord\.gg|discord\.com|t\.me|mailto)$/i;

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
const regDomain = (host) => host.split('.').slice(-2).join('.');
export function isMegaCorp(host) {
  if (!host) return false;
  if (NOT_STARTUP.has(host) || NOT_STARTUP.has(regDomain(host))) return true;
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

// Parse one HN who-is-hiring comment → {name, website, host, atsUrl} or null.
export function parseHnPost(rawHtml) {
  const text = decodeEntities(rawHtml);
  if (!SF_RE.test(text)) return null; // must name an SF/Bay location
  const name = (text.split('|')[0] || '').trim().replace(/\s*\(.*$/, '').slice(0, 120);
  if (!name || name.length < 2 || /^(remote|http|www\.)/i.test(name)) return null;
  const urls = (text.match(/https?:\/\/[^\s"'<>()]+/gi) || []).map((u) => u.replace(/[.,)]+$/, ''));
  let website = '', host = '', atsUrl = '';
  for (const u of urls) {
    const h = registrableDomain(u);
    if (!h || BADHOST.test(h)) continue;
    if (/^(boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|job-boards\.greenhouse\.io)$/i.test(h)) { atsUrl = atsUrl || u; continue; }
    if (!website) { website = 'https://' + h + '/'; host = h; }
  }
  if (!website && atsUrl) { host = registrableDomain(atsUrl); website = 'https://' + host + '/'; }
  if (!host || isMegaCorp(host)) return null; // drop mega-corps (incl. careers subdomains) — bias toward startups
  return { name, website, host, atsUrl: atsUrl || null };
}

async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'DemigodStartupAtlas/1.0 (potter@trydemigod.com)' } });
  if (!r.ok) throw new Error(`${new URL(url).hostname} HTTP ${r.status}`);
  return r.json();
}

export async function collectHnCompanies({ months = 2 } = {}) {
  const search = await fetchJson('https://hn.algolia.com/api/v1/search_by_date?query=%22Ask%20HN%3A%20Who%20is%20hiring%3F%22&tags=story,author_whoishiring&hitsPerPage=' + months);
  const threads = (search.hits || []).slice(0, months);
  const byHost = new Map();
  for (const th of threads) {
    const item = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${th.objectID}.json`);
    const kids = (item.kids || []).slice(0, 500);
    const posts = await Promise.all(kids.map(async (id) => {
      try { const c = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`); return c && !c.deleted && !c.dead ? c.text : null; } catch { return null; }
    }));
    for (const raw of posts) {
      if (!raw) continue;
      const p = parseHnPost(raw);
      if (!p) continue;
      if (!byHost.has(p.host)) byHost.set(p.host, { ...p, thread: th.title, threadUrl: `https://news.ycombinator.com/item?id=${th.objectID}` });
    }
  }
  return [...byHost.values()];
}

if (isMain && (process.env.DEMIGOD_HN_SELFTEST === '1' || process.argv.includes('--selftest'))) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const sf = parseHnPost('Acme Robotics | Senior Engineer | San Francisco, CA (ONSITE) | Full-time https:&#x2F;&#x2F;acme.io&#x2F;careers');
  assert(sf && sf.name === 'Acme Robotics' && sf.host === 'acme.io', 'SF post parsed: ' + JSON.stringify(sf));
  const ats = parseHnPost('Beta Inc | Backend | SF Bay Area | https:&#x2F;&#x2F;boards.greenhouse.io&#x2F;betainc');
  assert(ats && ats.host === 'boards.greenhouse.io' && /betainc/.test(ats.atsUrl), 'ATS-only post: ' + JSON.stringify(ats));
  assert(parseHnPost('Gamma | Engineer | Berlin, Germany | REMOTE (EU only) https://gamma.de') === null, 'non-SF post rejected');
  assert(parseHnPost('Delta | Remote (worldwide) | https://delta.com') === null, 'remote-only (no SF) rejected');
  assert(parseHnPost('Eps | Eng | San Francisco | https://github.com/eps') === null, 'social-only host rejected (no real site)');
  assert(parseHnPost('Apple | iOS Engineer | San Francisco | https:&#x2F;&#x2F;jobs.apple.com&#x2F;role') === null, 'mega-corp via careers subdomain (jobs.apple.com) excluded');
  assert(parseHnPost('Adobe | Backend | SF Bay Area | https:&#x2F;&#x2F;careers.adobe.com&#x2F;x') === null, 'mega-corp via careers subdomain (careers.adobe.com) excluded');
  assert(parseHnPost('23andMe | Eng | San Francisco | https:&#x2F;&#x2F;23andme.wd5.myworkdayjobs.com&#x2F;x') === null, 'mega-corp via shared-ATS subdomain (23andme.*.myworkdayjobs) excluded');
  assert(isMegaCorp('jobs.apple.com') && isMegaCorp('careers.adobe.com') && !isMegaCorp('tinystartup.ai'), 'isMegaCorp matching');
  assert(parseHnPost('Tiny Startup | Eng | San Francisco | https:&#x2F;&#x2F;tinystartup.ai') !== null, 'real startup kept');
  console.log(JSON.stringify({ ok: true, selftest: 'hn-hiring' }));
  process.exit(0);
}

// Map-ready company row from a parsed HN post. Provenance = the company's own public HN posting.
export function toCompanyRow(c, retrievedAt) {
  return {
    id: 'hn:' + c.host,
    name: c.name,
    description: null,
    website: c.website,
    inceptionYear: null,
    tags: ['hn-hiring'],
    locationPrecision: 'city',
    neighborhood: null,
    hiring: 'yes',
    source: 'Hacker News (Who is Hiring)',
    sourceUrl: c.threadUrl,
    sourceLicense: 'HN-public',
    retrievedAt,
  };
}

if (isMain) {
  const months = (() => { const i = process.argv.indexOf('--months'); return i > 0 ? Number(process.argv[i + 1]) || 2 : 2; })();
  const outPath = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? path.join(process.argv[i + 1], 'DEMIGOD-HN-HIRING.json') : path.join(ROOT, 'DEMIGOD-HN-HIRING.json'); })();
  const today = new Date().toISOString().slice(0, 10);
  const hn = await collectHnCompanies({ months });
  const rows = hn.map((c) => toCompanyRow(c, today));
  // cache the map-ready HN companies (map-data.mjs merges this; refresh monthly)
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: today, months, source: 'Hacker News Who is Hiring', companies: rows }, null, 2) + '\n');
  // report the delta vs the current directory (by website host)
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const have = new Set(map.companies.map((c) => registrableDomain(c.website)).filter(Boolean));
  const novel = hn.filter((c) => !have.has(c.host));
  console.log(JSON.stringify({
    ok: true, months, outPath, sfCompaniesFound: hn.length, alreadyInDirectory: hn.length - novel.length,
    NEW: novel.length, newWithDirectAtsLink: novel.filter((c) => c.atsUrl).length,
    sample: novel.slice(0, 12).map((c) => c.name + ' (' + c.host + ')'),
  }, null, 2));
}
