#!/usr/bin/env node
// Content/SEO/route health for the LIVE site — the counterpart to `bin/dg truth` (which checks the
// release: version/CDN/lock). One fetch-based command, one honest verdict, evidence for each check:
//   1. every route foot-core declares resolves (reuses demigod-route-audit — no hardcoded list to rot).
//   2. served-HTML SEO invariant: a real <title> (not empty/Untitled).
//   3. /startups head carries no exact counts that routine map refreshes make stale.
//   node demigod-site-health.mjs [--json] [--selftest]
//   node demigod-site-health.mjs --startups-seo   # emit stable strings to apply via Webflow MCP
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDeclaredRoutes, auditRoutes } from './demigod-route-audit.mjs';
import { staticBodyTextLength } from './demigod-seo-audit.mjs';
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
// in with no Disallow. Most routes remain script-only (Webflow shell + foot-core) — report only.
// /startups is different: once sealed ships a <details class=dg-static> fragment, siteHealth gates
// that the SERVED page still carries the same block (see startupsFragmentFreshness).
export function servedBodyText(html) {
  const chars = staticBodyTextLength(html);
  // Sample is for a human reading the report; the LENGTH is the measured invariant.
  const body = /<body[^>]*>([\s\S]*)/i.exec(String(html || ''))?.[1] || '';
  const sample = body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return { chars, crawlableWithoutJs: chars > 0, sample };
}

const DG_STATIC_RE =
  /<details\b[^>]*\bclass=["'][^"']*\bdg-static\b[^"']*["'][^>]*>[\s\S]*?<\/details>/gi;

/** PURE: count page-scoped directory fragments (crawler may see all of them). */
export function countDgStaticFragments(html) {
  const s = String(html || '');
  const hits = s.match(DG_STATIC_RE);
  return hits ? hits.length : 0;
}

/** PURE: first page-scoped directory fragment (live or sealed). */
export function extractDgStaticFragment(html) {
  DG_STATIC_RE.lastIndex = 0;
  const m = DG_STATIC_RE.exec(String(html || ''));
  return m ? m[0] : '';
}

/** Strip data-generated-at so sealed regen alone does not couple site-health to a publish. */
function normalizeFragment(s) {
  return String(s || '')
    .replace(/\s*data-generated-at=["'][^"']*["']/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * PURE: live /startups must carry the sealed sf-startups-static.html dg-static block.
 * Content compare — data-generated-at is stripped (same-day date is blind when sections lag).
 * Multiple live dg-static blocks fail (first-match extract would false-green a trailing stale).
 * When sealed has no fragment, freshness is not required (pre-directory pastes).
 */
export function startupsFragmentFreshness(liveHtml, sealedHtml) {
  const sealed = extractDgStaticFragment(sealedHtml);
  if (!sealed) {
    return { ok: true, required: false, issues: [], liveLen: 0, sealedLen: 0, liveCount: 0 };
  }
  const liveCount = countDgStaticFragments(liveHtml);
  const live = extractDgStaticFragment(liveHtml);
  const issues = [];
  if (liveCount > 1) {
    issues.push(`live /startups has ${liveCount} dg-static fragments (expected 1)`);
  }
  if (!live) issues.push('live /startups missing <details class=dg-static> fragment');
  else if (normalizeFragment(live) !== normalizeFragment(sealed)) {
    issues.push(
      'live dg-static fragment stale vs sealed sf-startups-static.html (content; data-generated-at ignored)',
    );
  }
  return {
    ok: issues.length === 0,
    required: true,
    issues,
    liveLen: live.length,
    sealedLen: sealed.length,
    liveCount,
  };
}

// Fabricated event/speaker content that must never ship. These names are not people — they are
// placeholder copy sitting in the Webflow Designer canvas of /events, rendered as real event cards
// with times, titles and "Speaker" labels.
//
// WHY A SERVED-HTML CHECK. This was closed as resolved on 2026-07-22 by a repo grep that found zero
// hits — correct for the repo and wrong about the site, because canvas content is edited outside git
// and no `grep -r` can see it. Found still live 07-24, and still live 07-31. A rendered-DOM check
// also misses it: foot-core hides that section, so the CDP innerText is clean while the served bytes
// a crawler or social scraper receives still carry the fabrication.
//
// Names, not markup shape, because the shape is ordinary Webflow markup and pinning it would flag
// any real event card. If a real speaker ever shares one of these names, narrow the marker — do not
// delete the check.
export const FABRICATED_CANVAS_MARKERS = ['Morgan Patel', 'Casey Nguyen', 'Riley Chen'];

/** PURE: fabricated placeholder people present in a served document. */
export function fabricatedContent(html) {
  const s = String(html || '');
  const found = FABRICATED_CANVAS_MARKERS.filter((m) => s.includes(m));
  return { ok: found.length === 0, found };
}

export const STARTUPS_SEO = Object.freeze({
  title: 'SF Startups Hiring — Open Roles Directory | Demigod',
  description: 'Explore San Francisco startups and recently observed open roles, with direct links to apply. A free, open directory built from public data; no signup.',
  ogTitle: 'SF startups hiring — recently observed open roles',
});

// PURE: exact totals in indexed metadata go stale on every map refresh. Keep the high-intent copy,
// but fail any volatile count claim instead of coupling routine data refreshes to a site publish.
export function startupsSeoDrift(html) {
  const head = String(html || '').split(/<\/head>/i)[0];
  const claims = head.match(
    /\b\d[\d,]*\s+(?:San Francisco\s+)?(?:companies|startups|tracked|roles tracked|with(?:\s+verified)?(?:\s+live)?\s+open roles)\b/gi,
  ) || [];
  const issues = [...servedSeo(head).issues];
  if (claims.length) issues.push(`volatile count claim in /startups head: ${claims.join(', ')}`);
  return { ok: issues.length === 0, issues, claims };
}

export async function siteHealth(fetchImpl = fetch, footSrc = null) {
  const src = footSrc ?? fs.readFileSync(process.env.DEMIGOD_FOOT || path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  const routes = await auditRoutes(extractDeclaredRoutes(src), fetchImpl);
  // stubs: 301→/?p=… still ok for users but not hard-served (must not read as "all resolve").
  routes.fullyServed = routes.ok && (routes.stubs?.length || 0) === 0;
  const get = async (p) => {
    try { return await (await fetchImpl(`${SITE}${p}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })).text(); } catch (e) { return ''; }
  };
  const seo = servedSeo(await get('/'));
  const startupsHtml = await get('/startups');
  const counts = startupsSeoDrift(startupsHtml);
  const crawlable = servedBodyText(startupsHtml);
  // Sealed fragment is the SoR for page-scoped directory paste (not foot CDN).
  const sealedPath = process.env.DEMIGOD_STARTUPS_STATIC || path.join(ROOT, 'sf-startups-static.html');
  let sealedHtml = '';
  try {
    sealedHtml = fs.readFileSync(sealedPath, 'utf8');
  } catch {
    sealedHtml = '';
  }
  const freshness = startupsFragmentFreshness(startupsHtml, sealedHtml);
  // When sealed ships dg-static, live must be crawlable and content-fresh (publish-gated fix).
  const startupsBodyOk = !freshness.required || (crawlable.crawlableWithoutJs && freshness.ok);
  // Honesty gate, and it DOES fail the build. Unlike the empty served body (deliberate
  // architecture), fabricated people presented as speakers is a defect, and it should stay red
  // until the canvas is edited.
  const fabricated = fabricatedContent(await get('/events'));
  // Named failing checks — single allowlist source for useful-loop observational downgrade
  // (Claude tool-failure audit: denylist of "other checks green" fail-opens on new gates).
  const failing = [];
  if (!routes.ok) failing.push('routes');
  if (!seo.ok) failing.push('seo');
  if (!counts.ok) failing.push('counts');
  if (!fabricated.ok) failing.push('fabricated');
  if (freshness.required && !crawlable.crawlableWithoutJs) failing.push('crawlable');
  if (freshness.required && !freshness.ok) failing.push('freshness');
  return {
    ok: failing.length === 0,
    failing,
    routes,
    seo,
    counts,
    crawlable,
    freshness,
    fabricated,
  };
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

  // fabricatedContent: names in the SERVED bytes, which is where this actually lives.
  assert(fabricatedContent('<p>Morgan Patel</p>').ok === false, 'a fabricated speaker is caught');
  assert(fabricatedContent('<p>Morgan Patel</p>').found.length === 1, 'and named, so the fix is findable');
  assert(fabricatedContent('<div>Speaker</div><p>Casey Nguyen</p>').found[0] === 'Casey Nguyen', 'each marker matches independently');
  assert(fabricatedContent('<p>A real person</p>').ok, 'ordinary copy passes');
  assert(fabricatedContent('').ok && fabricatedContent(null).ok, 'no html -> pass, not a false red');
  assert(FABRICATED_CANVAS_MARKERS.length >= 3, 'the marker list must not be silently emptied');

  // /startups metadata: stable copy passes; any exact corpus claim fails.
  const stable = `<title>${STARTUPS_SEO.title}</title><meta name="description" content="${STARTUPS_SEO.description}"></head>`;
  assert(startupsSeoDrift(stable).ok, 'stable count-free metadata passes');
  const drifted = startupsSeoDrift('<title>SF Startups Hiring — 2,737 Companies, 339 With Open Roles | Demigod</title></head>');
  assert(drifted.ok === false, 'POSITIVE CONTROL: the volatile live title must FAIL this gate');
  assert(drifted.claims.length === 2 && drifted.issues.join(' ').includes('339'), 'the failure names both volatile claims');
  assert(!startupsSeoDrift('<title>Directory</title><meta name="description" content="8,124 roles tracked"></head>').ok, 'description counts fail too');
  assert(!startupsSeoDrift('').ok, 'an empty head still fails served SEO');

  // Content freshness: sealed dg-static is SoR; date alone is blind.
  const sealedOnDisk = fs.readFileSync(path.join(ROOT, 'sf-startups-static.html'), 'utf8');
  const sealedFrag = extractDgStaticFragment(sealedOnDisk);
  assert(sealedFrag.length > 0, 'repo sealed fragment present for selftest');
  assert(startupsFragmentFreshness(sealedOnDisk, sealedOnDisk).ok, 'identical sealed matches');
  assert(!startupsFragmentFreshness('', sealedOnDisk).ok, 'missing live fragment fails');
  assert(
    !startupsFragmentFreshness('<details class="dg-static" data-generated-at="2099">old</details>', sealedOnDisk).ok,
    'stale content fails even with dg-static present',
  );
  // A2: date-only drift must NOT red (directory-static regen must not couple to publish)
  const dateOnly = sealedFrag.replace(
    /data-generated-at=["'][^"']*["']/i,
    'data-generated-at="2099-01-01"',
  );
  assert(
    startupsFragmentFreshness(`<body>${dateOnly}</body>`, sealedOnDisk).ok,
    'data-generated-at-only drift is not content staleness',
  );
  // A3: trailing stale duplicate must not false-green
  assert(
    !startupsFragmentFreshness(
      `<body>${sealedFrag}<details class="dg-static">STALE</details></body>`,
      sealedOnDisk,
    ).ok,
    'multiple live dg-static fragments fail',
  );
  assert(!startupsFragmentFreshness('', 'no-fragment').required, 'no sealed fragment → not required');
  const goodStartups = `${stable}<body>${sealedFrag}</body>`;

  // siteHealth aggregates: a broken route OR bad SEO OR volatile metadata OR stale fragment -> not ok
  const home = '<title>Demigod</title>';
  const mock = (routeStatus, homeHtml, startupsHtml = '') => async (url) => {
    const p = url.slice(SITE.length);
    if (p === '/') return { status: 200, text: async () => homeHtml };
    if (p === '/startups') return { status: 200, text: async () => startupsHtml };
    return { status: routeStatus[p] ?? 200, text: async () => '' };
  };
  const good = await siteHealth(mock({}, home, goodStartups), "'/hire': 'hire'");
  assert(good.ok === true, 'all-good -> ok');
  assert(good.freshness?.ok === true, 'freshness green when live matches sealed');
  assert(good.routes.fullyServed === true, 'no stubs -> fullyServed');
  const badRoute = await siteHealth(mock({ '/privacy': 404 }, home, goodStartups), "'/hire': 'hire', '/privacy': 'legal'");
  assert(badRoute.ok === false && !badRoute.routes.ok, 'a declared route that 404s fails site-health');
  const badCounts = await siteHealth(mock({}, home, '<title>SF Startups Hiring — 2,735 Companies, 406 With Open Roles</title></head>'), "'/hire': 'hire'");
  assert(badCounts.ok === false && !badCounts.counts.ok, 'volatile /startups counts fail site-health');
  const staleFrag = await siteHealth(
    mock({}, home, `${stable}<body><details class="dg-static">stale only</details></body>`),
    "'/hire': 'hire'",
  );
  assert(staleFrag.ok === false && staleFrag.freshness?.ok === false, 'stale dg-static fails site-health');
  // Query-string stub: still site-health ok (users reach content) but not fullyServed.
  const stubFetch = async (url) => {
    const p = url.slice(SITE.length);
    if (p === '/') return { status: 200, text: async () => home, url: SITE + '/' };
    if (p === '/press') {
      return { status: 200, url: SITE + '/?p=press', redirected: true, text: async () => home };
    }
    if (p === '/startups') return { status: 200, text: async () => goodStartups, url: SITE + p };
    return { status: 200, text: async () => '', url: SITE + p };
  };
  const stubbed = await siteHealth(stubFetch, "'/hire': 'hire', '/press': 'press'");
  assert(stubbed.ok === true && stubbed.routes.ok === true, 'query stub is not a broken route');
  assert(stubbed.routes.fullyServed === false, 'query stub must not claim fullyServed');
  assert(stubbed.routes.stubs.some((r) => r.path === '/press'), 'press stub is listed');
  // A dg-static block inside <script> matches sealed while serving crawlers zero text.
  const inScript = await siteHealth(
    mock({}, home, `${stable}<body><script>${sealedFrag}</script></body>`),
    "'/hire': 'hire'",
  );
  assert(inScript.freshness?.ok === true, 'script-wrapped fragment still matches sealed');
  assert(
    inScript.ok === false && inScript.failing.includes('crawlable'),
    'a fragment only inside <script> serves 0 crawlable chars and must fail',
  );
  // useful-loop downgrades only this exact single failure.
  assert(
    JSON.stringify(staleFrag.failing) === '["freshness"]',
    'freshness-only red is exactly ["freshness"] (useful-loop observational allowlist)',
  );
  for (const r of [good, badRoute, badCounts, staleFrag, stubbed, inScript]) {
    assert(r.ok === (r.failing.length === 0), 'ok is exactly failing.length === 0');
  }
  console.log(JSON.stringify({ ok: true, selftest: 'site-health' }));
  process.exit(0);
}

// Emit-only mode: print the stable strings the /startups page SHOULD carry.
// Apply them with the Webflow Pages API (data_pages_tool → update_page_settings, page
// 6a63b78e2b942a56ab6cccf9) — there is no REST token on this box, so the write stays MCP-driven.
// Set openGraph.title explicitly; titleCopied:true does NOT clear an existing og title.
if (isMain && process.argv.includes('--startups-seo')) {
  console.log(JSON.stringify(STARTUPS_SEO, null, 2));
  process.exit(0);
}

if (isMain) {
  const res = await siteHealth();
  const receipt = {
    schema: 'demigod.site-health/1',
    at: new Date().toISOString(),
    ok: res.ok,
    failing: res.failing || [],
    site: SITE,
    routes: {
      ok: res.routes?.ok,
      checked: res.routes?.checked,
      stubs: res.routes?.stubs?.length || 0,
      // reported, not folded into ok — control-board/work-find read this receipt, not stdout
      fullyServed: res.routes?.fullyServed === true,
    },
    seo: res.seo,
    counts: res.counts,
    crawlable: res.crawlable,
    freshness: res.freshness,
    fabricated: res.fabricated,
  };
  try {
    const busy = process.env.DEMIGOD_BUSY || process.env.DG_BUSY || '/tmp/dg-busy';
    fs.mkdirSync(busy, { recursive: true });
    fs.writeFileSync(path.join(busy, 'site-health.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  } catch {
    /* receipt best-effort */
  }
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  console.log(`site-health ${res.ok ? 'PASS' : 'FAIL'} · ${SITE}`);
  const stubN = res.routes.stubs?.length || 0;
  // fullyServed is reported, not folded into ok — query stubs still reach users (see selftest).
  if (!res.routes.ok) {
    console.log(`  routes: ${res.routes.broken.length} broken → ` + res.routes.broken.map((r) => `${r.path}(${r.status})`).join(', '));
  } else if (stubN) {
    console.log(
      `  routes: ${res.routes.checked} declared reachable · ${stubN} query stubs (not hard-served; fullyServed=false, not in ok) → ` +
        res.routes.stubs.map((r) => r.path).join(', '),
    );
  } else {
    console.log(`  routes: all ${res.routes.checked} declared hard-served · fullyServed=true`);
  }
  console.log(`  served SEO: ${res.seo.ok ? `ok (title "${res.seo.title}")` : 'FAIL — ' + res.seo.issues.join(', ')}`);
  console.log(`  /startups metadata: ${res.counts.ok ? 'stable (no volatile count claim)' : 'FAIL — ' + res.counts.issues.join('; ')}`);
  console.log(
    `  /startups crawlable: ${res.crawlable?.chars ?? 0} chars · ${res.crawlable?.crawlableWithoutJs ? 'yes' : 'no'}`,
  );
  if (res.freshness?.required) {
    console.log(
      `  /startups fragment: ${res.freshness.ok ? 'fresh vs sealed' : 'FAIL — ' + (res.freshness.issues || []).join('; ')}` +
        ` · live=${res.freshness.liveLen} sealed=${res.freshness.sealedLen}`,
    );
  }
  console.log(
    `  /events fabricated: ${res.fabricated?.ok ? 'clean' : 'FAIL — ' + (res.fabricated?.found || []).join(', ')}`,
  );
  console.log(`  receipt: /tmp/dg-busy/site-health.json`);
  process.exit(res.ok ? 0 : 1);
}
