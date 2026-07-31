#!/usr/bin/env node
// Content/SEO/route health for the LIVE site — the counterpart to `bin/dg truth` (which checks the
// release: version/CDN/lock). One fetch-based command, one honest verdict, evidence for each check:
//   1. every route foot-core declares resolves (reuses demigod-route-audit — no hardcoded list to rot).
//   2. served-HTML SEO invariant: a real <title> (not empty/Untitled).
//   3. /startups head counts still match the map (they are hand-set in Webflow and silently drift).
//   node demigod-site-health.mjs [--json] [--selftest]
//   node demigod-site-health.mjs --startups-seo   # emit the correct strings to apply via Webflow MCP
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDeclaredRoutes, auditRoutes } from './demigod-route-audit.mjs';
import { siteCounters } from './demigod-site-counters.mjs';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const UA = 'Mozilla/5.0 (compatible; DemigodSiteHealth/1)';

// PURE: served-HTML SEO invariants a no-JS crawler sees. NOTE: canonical is deliberately NOT checked
// here — foot-core injects it at runtime (verified: rendered DOM has the canonical, served HTML doesn't),
// and seo-audit checks the rendered canonical via CDP. A static-canonical check would fail-loud on a
// non-issue. Title is a genuine served-HTML invariant (matters for crawlers + social cards).
export function servedSeo(html) {
  const s = String(html || '');
  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(s)?.[1] || '').trim();
  const issues = [];
  if (!title) issues.push('missing <title>');
  else if (/^untitled$/i.test(title)) issues.push('title is "Untitled"');
  return { ok: issues.length === 0, title: title.slice(0, 60), issues };
}

// PURE: how much real content a NON-RENDERING crawler gets from the served body. Googlebot renders
// JS on a second pass; GPTBot, ClaudeBot and PerplexityBot largely do not, and robots.txt invites them
// in with no Disallow. Measured 2026-07-31 against the live site: every page serves 0 chars, because
// <body> holds two <script> tags and nothing else. 2,735 companies of directory content are invisible
// to them.
//
// DELIBERATELY NOT A PASS/FAIL. The empty body is the architecture (Webflow shell + foot-core injects
// everything), and a gate that reds all 32 pages on every run is a gate somebody switches off. What
// this is FOR: the moment crawlable body content ships, this proves it reached the SERVED html — the
// exact failure that already happened once, when a 518KB static directory was generated and never
// deployed and nothing noticed. Report the number; a human decides what it should be.
export function servedBodyText(html) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(String(html || ''))?.[1] || '';
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { chars: text.length, crawlableWithoutJs: text.length > 0, sample: text.slice(0, 80) };
}

const nfmt = (n) => Number(n).toLocaleString('en-US');

// PURE: the /startups head strings, DERIVED from the map so a human never retypes a count.
// Reuses siteCounters so the honesty invariant is shared: a counter with no backing value is
// omitted, never fabricated. Returns null when the map cannot back the claim at all — callers
// must then leave the metadata alone rather than publish a partial number.
export function startupsSeo(map = {}) {
  const counters = siteCounters(map);
  const companies = Array.isArray(map?.companies) ? map.companies.length : 0;
  const hiring = counters.find((c) => c.key === 'companiesHiring')?.value ?? null;
  const roles = counters.find((c) => c.key === 'rolesTracked')?.value ?? null;
  if (!companies || !hiring) return null;
  return {
    title: `SF Startups Hiring — ${nfmt(companies)} Companies, ${nfmt(hiring)} With Open Roles | Demigod`,
    description: `A free, open directory of ${nfmt(companies)} San Francisco startups — ${nfmt(hiring)} with verified live open roles${roles ? `, ${nfmt(roles)} roles tracked` : ''}, direct links to apply. Public data, no signup.`,
    ogTitle: `SF startups that are hiring — ${nfmt(companies)} tracked, ${nfmt(hiring)} with open roles`,
    counts: { companies, hiring, roles },
  };
}

// PURE: does the served /startups head still assert the map's numbers? This is the check that was
// missing when 2,735/406 sat live for five days against a map saying 2,737/339. Compares parsed
// integers, not string equality, so a copy reword cannot silently disable it.
export function startupsSeoDrift(html, map = {}) {
  const want = startupsSeo(map);
  if (!want) return { ok: true, skipped: 'map has no verified coverage — no count claim to check' };
  const head = String(html || '').split(/<\/head>/i)[0];
  const m = /([\d,]+)\s+Companies,\s+([\d,]+)\s+With Open Roles/i.exec(head);
  if (!m) return { ok: false, issues: ['no "N Companies, N With Open Roles" claim found in /startups head'], want: want.counts };
  const int = (s) => Number(String(s).replace(/,/g, ''));
  const got = { companies: int(m[1]), hiring: int(m[2]) };
  const issues = [];
  if (got.companies !== want.counts.companies) issues.push(`companies ${nfmt(got.companies)} ≠ map ${nfmt(want.counts.companies)}`);
  if (got.hiring !== want.counts.hiring) issues.push(`with-open-roles ${nfmt(got.hiring)} ≠ map ${nfmt(want.counts.hiring)}`);
  return { ok: issues.length === 0, issues, got, want: want.counts };
}

export async function siteHealth(fetchImpl = fetch, footSrc = null, map = null) {
  const src = footSrc ?? fs.readFileSync(process.env.DEMIGOD_FOOT || path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  const mapObj = map ?? JSON.parse(fs.readFileSync(process.env.DEMIGOD_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json'), 'utf8'));
  const routes = await auditRoutes(extractDeclaredRoutes(src), fetchImpl);
  // stubs: 301→/?p=… still ok for users but not hard-served (must not read as "all resolve").
  routes.fullyServed = routes.ok && (routes.stubs?.length || 0) === 0;
  const get = async (p) => {
    try { return await (await fetchImpl(`${SITE}${p}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })).text(); } catch (e) { return ''; }
  };
  const seo = servedSeo(await get('/'));
  const startupsHtml = await get('/startups');
  const counts = startupsSeoDrift(startupsHtml, mapObj);
  // Reported, not gated — see servedBodyText. Rides on the /startups fetch we already make.
  const crawlable = servedBodyText(startupsHtml);
  return { ok: routes.ok && seo.ok && counts.ok, routes, seo, counts, crawlable };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  // servedSeo (title only — canonical is foot-core's runtime job, not a served-HTML fail)
  assert(servedSeo('<title>Demigod</title>').ok, 'a real title is ok (no static canonical required)');
  assert(!servedSeo('<title></title>').ok, 'empty title flagged');
  assert(servedSeo('<title>Untitled</title>').issues.some((i) => /Untitled/.test(i)), 'Untitled title flagged');
  assert(servedSeo('<title>Pricing</title>').ok && !servedSeo('').ok, 'title present ok; no title flagged');
  // servedBodyText: the load-bearing distinction is text-in-markup vs text-only-inside-<script>,
  // because the live shape is the latter and a naive strip scores it as full of content.
  assert(servedBodyText('<body><p>Real copy</p></body>').chars === 9, 'markup text is counted');
  assert(servedBodyText('<body><p>Real copy</p></body>').crawlableWithoutJs, 'and reads as crawlable');
  const liveShape = '<body><script>var a="lots and lots of javascript text here";</script></body>';
  assert(servedBodyText(liveShape).chars === 0, 'POSITIVE CONTROL: script-only body (the live shape) is 0 chars');
  assert(!servedBodyText(liveShape).crawlableWithoutJs, 'script-only body is not crawlable without js');
  assert(servedBodyText('<body><style>p{content:"x"}</style></body>').chars === 0, 'style text is not content');
  assert(servedBodyText('<body><!-- a comment --></body>').chars === 0, 'comments are not content');
  assert(servedBodyText('<html><head><title>T</title></head></html>').chars === 0, 'no body -> 0, not head text');
  assert(servedBodyText('').chars === 0 && servedBodyText(null).chars === 0, 'empty/null -> 0, no crash');

  // startupsSeo: strings are DERIVED, never typed. Same omit-don't-fabricate rule as siteCounters.
  const MAP = { companies: new Array(2737), coverage: { companiesWithOpenRoles: 339, roleMix: { engineering: 8000, other: 124 } } };
  const want = startupsSeo(MAP);
  assert(want.title === 'SF Startups Hiring — 2,737 Companies, 339 With Open Roles | Demigod', 'title derived from map with thousands separators');
  assert(want.ogTitle.includes('2,737 tracked, 339 with open roles'), 'og title derived from map');
  assert(want.description.includes('8,124 roles tracked'), 'description carries roleMix sum');
  assert(startupsSeo({ companies: new Array(10), coverage: {} }) === null, 'no verified coverage -> null, never a partial claim');
  assert(startupsSeo({}) === null, 'no map -> null, no crash');
  assert(!startupsSeo({ companies: new Array(5), coverage: { companiesWithOpenRoles: 0, roleMix: {} } }), 'zero hiring -> null, not "0 With Open Roles"');
  // startupsSeoDrift: must PASS on agreement and FAIL on the exact drift that shipped live (2,735/406)
  assert(startupsSeoDrift(`<title>${want.title}</title></head>`, MAP).ok, 'head matching the map passes');
  const drifted = startupsSeoDrift('<title>SF Startups Hiring — 2,735 Companies, 406 With Open Roles | Demigod</title></head>', MAP);
  assert(drifted.ok === false, 'POSITIVE CONTROL: the real 2,735/406 drift must FAIL this gate');
  assert(drifted.issues.length === 2 && drifted.issues.join(' ').includes('406'), 'drift names both wrong numbers');
  assert(startupsSeoDrift('<title>SF Startups Hiring — 2,737 Companies, 406 With Open Roles</title></head>', MAP).ok === false, 'one wrong number is still a fail');
  assert(startupsSeoDrift('<title>Something else</title></head>', MAP).ok === false, 'a head with no count claim fails (not vacuously green)');
  assert(startupsSeoDrift('', {}).ok === true && startupsSeoDrift('', {}).skipped, 'no coverage -> skipped, not a false red');
  // siteHealth aggregates: a broken route OR bad SEO OR count drift -> not ok
  const home = '<title>Demigod</title>';
  const mock = (routeStatus, homeHtml, startupsHtml = '') => async (url) => {
    const p = url.slice(SITE.length);
    if (p === '/') return { status: 200, text: async () => homeHtml };
    if (p === '/startups') return { status: 200, text: async () => startupsHtml };
    return { status: routeStatus[p] ?? 200, text: async () => '' };
  };
  const good = await siteHealth(mock({}, home), "'/hire': 'hire'", {});
  assert(good.ok === true, 'all-good -> ok');
  assert(good.routes.fullyServed === true, 'no stubs -> fullyServed');
  const badRoute = await siteHealth(mock({ '/privacy': 404 }, home), "'/hire': 'hire', '/privacy': 'legal'", {});
  assert(badRoute.ok === false && !badRoute.routes.ok, 'a declared route that 404s fails site-health');
  const badCounts = await siteHealth(mock({}, home, '<title>SF Startups Hiring — 2,735 Companies, 406 With Open Roles</title></head>'), "'/hire': 'hire'", MAP);
  assert(badCounts.ok === false && !badCounts.counts.ok, 'stale /startups counts fail site-health');
  // Query-string stub: still site-health ok (users reach content) but not fullyServed.
  const stubFetch = async (url) => {
    const p = url.slice(SITE.length);
    if (p === '/') return { status: 200, text: async () => home, url: SITE + '/' };
    if (p === '/press') {
      return { status: 200, url: SITE + '/?p=press', redirected: true, text: async () => home };
    }
    return { status: 200, text: async () => '', url: SITE + p };
  };
  const stubbed = await siteHealth(stubFetch, "'/hire': 'hire', '/press': 'press'", {});
  assert(stubbed.ok === true && stubbed.routes.ok === true, 'query stub is not a broken route');
  assert(stubbed.routes.fullyServed === false, 'query stub must not claim fullyServed');
  assert(stubbed.routes.stubs.some((r) => r.path === '/press'), 'press stub is listed');
  console.log(JSON.stringify({ ok: true, selftest: 'site-health' }));
  process.exit(0);
}

// Emit-only mode: print the strings the /startups page SHOULD carry, straight from the map.
// Apply them with the Webflow Pages API (data_pages_tool → update_page_settings, page
// 6a63b78e2b942a56ab6cccf9) — there is no REST token on this box, so the write stays MCP-driven.
// Set openGraph.title explicitly; titleCopied:true does NOT clear an existing og title.
if (isMain && process.argv.includes('--startups-seo')) {
  const map = JSON.parse(fs.readFileSync(process.env.DEMIGOD_MAP || path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json'), 'utf8'));
  const seo = startupsSeo(map);
  if (!seo) { console.error('startups-seo: map has no verified coverage — leave the metadata alone'); process.exit(2); }
  console.log(JSON.stringify(seo, null, 2));
  process.exit(0);
}

if (isMain) {
  const res = await siteHealth();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  console.log(`site-health ${res.ok ? 'PASS' : 'FAIL'} · ${SITE}`);
  const stubN = res.routes.stubs?.length || 0;
  if (!res.routes.ok) {
    console.log(`  routes: ${res.routes.broken.length} broken → ` + res.routes.broken.map((r) => `${r.path}(${r.status})`).join(', '));
  } else if (stubN) {
    console.log(
      `  routes: ${res.routes.checked} declared reachable · ${stubN} query stubs (not hard-served) → ` +
        res.routes.stubs.map((r) => r.path).join(', '),
    );
  } else {
    console.log(`  routes: all ${res.routes.checked} declared hard-served`);
  }
  console.log(`  served SEO: ${res.seo.ok ? `ok (title "${res.seo.title}")` : 'FAIL — ' + res.seo.issues.join(', ')}`);
  console.log(`  /startups counts: ${res.counts.skipped ? `skipped (${res.counts.skipped})` : res.counts.ok ? `match map (${nfmt(res.counts.want.companies)} companies, ${nfmt(res.counts.want.hiring)} hiring)` : 'DRIFT — ' + res.counts.issues.join('; ')}`);
  process.exit(res.ok ? 0 : 1);
}
