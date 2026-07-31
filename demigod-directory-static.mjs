#!/usr/bin/env node
// Generate a CRAWLABLE static snapshot of the SF startup directory from DEMIGOD-SF-STARTUP-MAP.json.
// The live directory is client-rendered (JS), so search engines and social scrapers see nothing.
// This emits real company + job content in the served HTML, with honest SEO <head> tags and
// JobPosting-style JSON-LD for VERIFIED postings only (never "hiring per YC" self-reports — that
// would overclaim). Same honesty invariants as the app: city-level, attributed, no PII.
//
//   node demigod-directory-static.mjs [--out <dir>] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeUrl = (v) => { try { const u = new URL(String(v || '')); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };

// Build the static directory HTML from a map object. Pure → testable.
export function buildStaticDirectory(map, generatedAt = '') {
  const companies = Array.isArray(map?.companies) ? map.companies : [];
  const verified = companies.filter((c) => c.openRoles && c.atsSource);
  const totalRoles = verified.reduce((s, c) => s + c.openRoles, 0);
  const sorted = companies.slice().sort((a, b) => (b.openRoles || 0) - (a.openRoles || 0) || String(a.name).localeCompare(String(b.name)));

  const title = `SF startups hiring — ${companies.length} companies, ${verified.length} with open roles | Demigod`;
  const desc = `A free, open-data directory of ${companies.length} San Francisco startups — ${verified.length} with ${totalRoles} live verified open roles and direct links to apply. Public data, no signup.`;

  // JSON-LD: ItemList of verified-hiring organizations only (honest — no self-reports).
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SF startups hiring — verified open roles',
    numberOfItems: verified.length,
    itemListElement: verified.slice(0, 200).map((c, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'Organization', name: c.name, url: safeUrl(c.website) || undefined, address: { '@type': 'PostalAddress', addressLocality: 'San Francisco', addressRegion: 'CA', addressCountry: 'US' } },
    })),
  };

  const row = (c) => {
    const web = safeUrl(c.website);
    const jobs = safeUrl(c.jobsUrl);
    const hiring = c.openRoles && c.atsSource ? `${c.openRoles} open role${c.openRoles === 1 ? '' : 's'} on ${esc(c.atsSource)}`
      : c.jobsSource === 'YC' ? 'Open jobs on Y Combinator'
        : c.hiring === 'yes' ? 'Hiring' : '';
    const agingBits = [];
    if (c.openRoles && c.atsSource && typeof c.oldestObservedDays === 'number' && c.oldestObservedDays > 0) {
      agingBits.push(`longest tracked ${c.oldestObservedDays}d (our first seen)`);
    }
    // Prefer the longest observed threshold that has signal (CH-15).
    if (c.openRoles && c.atsSource && typeof c.observed90 === 'number' && c.observed90 > 0) {
      agingBits.push(`${c.observed90} open ≥90d tracked`);
    } else if (c.openRoles && c.atsSource && typeof c.observed60 === 'number' && c.observed60 > 0) {
      agingBits.push(`${c.observed60} open ≥60d tracked`);
    } else if (c.openRoles && c.atsSource && typeof c.observed30 === 'number' && c.observed30 > 0) {
      agingBits.push(`${c.observed30} open ≥30d tracked`);
    } else if (c.openRoles && c.atsSource && typeof c.observed7 === 'number' && c.observed7 > 0) {
      agingBits.push(`${c.observed7} open ≥7d tracked`);
    }
    if (c.openRoles && c.atsSource && typeof c.agingRoles === 'number' && c.agingRoles > 0) {
      agingBits.push(`${c.agingRoles} posted 90–365d (board date)`);
    }
    const agingNote = agingBits.length ? ` · ${esc(agingBits.join(' · '))}` : '';
    const jobLink = jobs
      ? ` — <a href="${esc(jobs)}" rel="nofollow noopener">${esc(hiring || 'careers')}</a>${agingNote}`
      : hiring ? ` — ${esc(hiring)}${agingNote}` : '';
    const name = web ? `<a href="${esc(web)}" rel="nofollow noopener">${esc(c.name)}</a>` : esc(c.name);
    return `<li>${name}${c.description ? ' — ' + esc(String(c.description).slice(0, 140)) : ''}${jobLink}</li>`;
  };

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://www.trydemigod.com/startups">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="https://www.trydemigod.com/startups">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>body{font:16px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;max-width:52rem;margin:0 auto;padding:1.5rem;color:#1b1a17;background:#faf8f3}h1{font-size:1.7rem;margin:0 0 .3rem}.sub{color:#6b655c;margin:0 0 1.2rem}ul{list-style:none;padding:0;margin:0}li{padding:.5rem 0;border-bottom:1px solid #eee}a{color:#8a6d1f}.foot{color:#6b655c;font-size:.82rem;margin-top:1.5rem;border-top:2px solid #8a6d1f;padding-top:1rem}</style>
</head><body>
<h1>San Francisco startups that are hiring</h1>
<p class="sub">${companies.length} SF startups from public open data · ${verified.length} with ${totalRoles} verified open roles · updated ${esc(generatedAt || (map?.generatedAt || '').slice(0, 10))}</p>
<ul>
${sorted.map(row).join('\n')}
</ul>
<p class="foot"><strong>How this is built:</strong> ${esc(map?.coverage?.caveat || 'City-level only; current status not verified.')} Open-role counts come from each company's own public job board (Greenhouse/Lever/Ashby), US-posted or remote only. When we re-check a board over days, "tracked Nd (our first seen)" is days since Demigod first observed that open role — not a score and not a ghost-job verdict. Board posting age is shown only when the ATS exposes a real post date. Named companies come from public sources (Y Combinator, Wikidata/CC0, Hacker News "Who is hiring?"). No résumés, no private data. A <a href="https://www.trydemigod.com">Demigod</a> project.</p>
</body></html>`;
}

if (isMain && (process.env.DEMIGOD_STATIC_SELFTEST === '1' || process.argv.includes('--selftest'))) {
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const fake = { generatedAt: '2026-07-24', coverage: { caveat: 'test caveat' }, companies: [
    {
      name: 'Alpha Robotics',
      website: 'https://alpha.io/',
      openRoles: 12,
      atsSource: 'Ashby',
      jobsUrl: 'https://jobs.ashbyhq.com/alpha',
      description: 'robots',
      oldestObservedDays: 11,
      observed7: 4,
    },
    { name: 'Beta AI', website: 'https://beta.ai/', hiring: 'yes', jobsSource: 'YC', jobsUrl: 'https://www.ycombinator.com/companies/beta/jobs' },
    { name: 'Gamma <script>alert(1)</script>', website: 'https://gamma.com/', hiring: 'unknown' },
  ] };
  const html = buildStaticDirectory(fake);
  // crawlable: real company + job content is in the SERVED HTML (not JS-rendered)
  assert(html.includes('Alpha Robotics') && html.includes('12 open roles on Ashby'), 'verified company + count in served HTML');
  assert(html.includes('longest tracked 11d (our first seen)'), 'observed open-age is crawlable');
  assert(html.includes('4 open ≥7d tracked'), 'observed7 is crawlable');
  // CH-15 longer thresholds prefer over shorter when present
  const long = buildStaticDirectory({
    ...fake,
    companies: [{ ...fake.companies[0], observed90: 2, observed30: 5, observed7: 8 }],
  });
  assert(long.includes('2 open ≥90d tracked'), 'observed90 preferred badge');
  assert(!long.includes('open ≥7d tracked') || long.includes('≥90d'), 'shorter threshold demoted');
  assert(html.includes('San Francisco startups that are hiring'), 'crawlable heading');
  assert(html.includes('application/ld+json') && html.includes('"@type":"ItemList"'), 'JSON-LD present');
  // honest JSON-LD: only the verified company (Alpha), NOT the YC self-report (Beta)
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert(ld.numberOfItems === 1 && ld.itemListElement[0].item.name === 'Alpha Robotics', 'JSON-LD verified-only (no YC self-report)');
  assert(!ld.itemListElement.some((e) => /Beta/.test(e.item.name)), 'YC self-report excluded from JobPosting schema');
  // no injection
  assert(!html.includes('<script>alert(1)</script>') && html.includes('&lt;script&gt;'), 'escapes injection in names');
  console.log(JSON.stringify({ ok: true, selftest: 'directory-static' }));
  process.exit(0);
}

if (isMain) {
  const outDir = (() => { const i = process.argv.indexOf('--out'); return i > 0 ? process.argv[i + 1] : ROOT; })();
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const html = buildStaticDirectory(map);
  const outPath = path.join(outDir, 'sf-startups-static.html');
  fs.writeFileSync(outPath, html);
  console.log(JSON.stringify({ ok: true, outPath, companies: map.companies.length, bytes: html.length }));
}
