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
import { isPlausibleHnCompanyName } from './demigod-hn-hiring.mjs';
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

/**
 * PURE: money pages whose crawlable text is the SAME text.
 *
 * `crawlableWithoutJs` only asks whether a page has non-zero body text, and non-zero is not the
 * same as distinct. Measured live: /hire serves 448 chars and /talent 450, and they differ ONLY in
 * the leading title word — both then serve the identical site-level sentence. To a non-rendering
 * crawler (GPTBot, ClaudeBot, PerplexityBot) the employer page and the candidate page are one page.
 *
 * Compared after stripping the <title>, because two pages sharing a body but differing by title are
 * exactly the case this is meant to catch — a title-only diff must not read as distinct content.
 *
 * REPORT-ONLY on purpose: the remedy is page copy, which needs a publish. Folding it into `failing`
 * would park site-health permanently red on something no code change can clear, and a gate that is
 * always red is a gate people learn to skip.
 */
export function duplicateCrawlableText(pages = {}) {
  const norm = (html) => String(html || '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, ' ')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const byText = new Map();
  let checked = 0;
  for (const [route, html] of Object.entries(pages)) {
    const text = norm(html);
    if (!text) continue; // an empty body is the `crawlable` check's job, not this one
    checked += 1;
    byText.set(text, [...(byText.get(text) || []), route]);
  }
  const duplicates = [...byText.entries()]
    .filter(([, routes]) => routes.length > 1)
    .map(([text, routes]) => ({ routes: routes.sort(), chars: text.length }));
  // `checked` is the vacuity guard: "no duplicates" across zero fetched pages is not a clean site.
  return { ok: duplicates.length === 0, duplicates, checked };
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

// The company-identity sibling of fabricatedContent. HN "Who is hiring?" posts are `Company | Role
// | Location | URL`, but a minority lead with the ROLE — and the directory once published a company
// called "Engineering Director, Developer Experience" (really Adyen) with 90 open roles, appearing
// BOTH as a crawlable directory link and as a JSON-LD Organization entity. Structured data is the
// worse surface: it asserts to a machine that an organization by that name exists.
//
// Checked against the SEALED fragment as well as the served page, because a fabricated identity is
// introduced by a map regeneration and sits queued on disk long before anyone publishes it — which
// is exactly when it is cheap to catch.
//
// Reuses the ingest predicate rather than a second heuristic: one definition of "is this a company
// identity", so a name the parser would reject can never re-enter through a rendered artifact.
export function fabricatedOrgNames(html) {
  const s = String(html || '');
  const jsonLd = [...s.matchAll(/"@type":"Organization","name":"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => { try { return JSON.parse(`"${m[1]}"`); } catch { return ''; } });
  const listed = [...s.matchAll(/<li><a [^>]*>([^<]+?)\s+—\s+\d+\s+open roles/g)].map((m) => m[1]);
  const names = [...new Set([...jsonLd, ...listed])].filter(Boolean);
  const found = names.filter((n) => !isPlausibleHnCompanyName(n));
  // `checked` is the vacuity guard: found.length === 0 over ZERO names is not a clean directory,
  // it is an unparsed one, and the two must never read the same.
  return { ok: found.length === 0, found, checked: names.length };
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
  // Honesty gate, and it DOES fail the build. Unlike the empty served body (deliberate
  // architecture), fabricated people presented as speakers is a defect, and it should stay red
  // until the canvas is edited.
  const fabricated = fabricatedContent(await get('/events'));
  // Sealed first: a fabricated company identity is queued on disk before it is ever served.
  const fabricatedOrgs = fabricatedOrgNames(`${sealedHtml}\n${startupsHtml}`);
  // Checked against each other rather than each against zero.
  //
  // This deliberately covers far more than the two conversion pages. On 2026-08-01 the gate
  // watched only /hire, /talent and /startups; fixing /hire-vs-/talent turned it green while a
  // measured **24 of 32 routes** were still serving byte-identical 433-char text — the site-wide
  // NO_JS_FALLBACK block, which is every page's entire crawlable body. A gate that inspects 3 of
  // 32 subjects reports on its sample, not on the site.
  const DUPLICATE_SCAN_ROUTES = [
    '/', '/hire', '/talent', '/pricing', '/how-it-works', '/contact', '/events', '/blog',
    '/about', '/faq', '/how', '/fees', '/jobs', '/apply', '/careers', '/engineers',
    '/candidates', '/network', '/pilot', '/sample', '/method', '/founders', '/compare',
    '/status', '/security', '/notes', '/partnership', '/partnerships', '/legal', '/press',
    '/refer',
  ];
  const duplicatePages = { '/startups': startupsHtml };
  for (const route of DUPLICATE_SCAN_ROUTES) duplicatePages[route] = await get(route);
  const duplicateCrawlable = duplicateCrawlableText(duplicatePages);
  // Named failing checks — single allowlist source for useful-loop observational downgrade
  // (Claude tool-failure audit: denylist of "other checks green" fail-opens on new gates).
  const failing = [];
  if (!routes.ok) failing.push('routes');
  if (!seo.ok) failing.push('seo');
  if (!counts.ok) failing.push('counts');
  if (!fabricated.ok) failing.push('fabricated');
  if (!fabricatedOrgs.ok) failing.push('fabricatedOrgs');
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
    fabricatedOrgs,
    duplicateCrawlable,
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

  // duplicateCrawlableText: non-zero body text is not DISTINCT body text.
  // Live case this was written for: /hire and /talent serve the same site-level sentence and differ
  // only by <title>, so a no-JS crawler sees the employer page and the candidate page as one page.
  const dupPair = { '/hire': '<title>Hire</title><body><p>Same site sentence.</p></body>', '/talent': '<title>Talent</title><body><p>Same site sentence.</p></body>' };
  assert(duplicateCrawlableText(dupPair).ok === false, 'POSITIVE CONTROL: a title-only diff must NOT read as distinct content');
  assert(duplicateCrawlableText(dupPair).duplicates[0].routes.join() === '/hire,/talent', 'the duplicate names both routes so the fix is findable');
  assert(duplicateCrawlableText({ '/hire': '<body><p>For employers.</p></body>', '/talent': '<body><p>For candidates.</p></body>' }).ok, 'genuinely different copy passes');
  // Vacuity: an empty body is the `crawlable` check's subject, and "no duplicates" over zero
  // comparable pages is not a clean site — `checked` must say how many pages were compared.
  assert(duplicateCrawlableText({ '/a': '<body></body>', '/b': '<body></body>' }).checked === 0, 'empty bodies are not compared as duplicates of each other');
  assert(duplicateCrawlableText({}).checked === 0 && duplicateCrawlableText({}).ok, 'no pages -> nothing to report, but checked says so');
  assert(duplicateCrawlableText(dupPair).checked === 2, 'checked counts the pages actually compared');

  // fabricatedOrgNames: a role title is not a company, on either surface it ships on.
  const orgLd = '"@type":"Organization","name":"Engineering Director, Developer Experience"';
  const orgLi = '<li><a href="https://boards.greenhouse.io/adyen" rel="nofollow noopener">Engineering Director, Developer Experience — 90 open roles on Greenhouse</a></li>';
  assert(fabricatedOrgNames(orgLd).ok === false, 'POSITIVE CONTROL: a role title as a JSON-LD Organization must FAIL');
  assert(fabricatedOrgNames(orgLi).ok === false, 'POSITIVE CONTROL: a role title in the crawlable directory list must FAIL');
  assert(fabricatedOrgNames(orgLd).found[0] === 'Engineering Director, Developer Experience', 'the failure names the identity, so the fix is findable');
  assert(fabricatedOrgNames('"@type":"Organization","name":"Stripe"').ok, 'a real company passes');
  assert(fabricatedOrgNames('"@type":"Organization","name":"The Interaction Company of California"').ok, 'a long REAL name passes — this gate must not eat legitimate companies');
  assert(fabricatedOrgNames('').ok && fabricatedOrgNames(null).ok, 'no html -> pass, not a false red');
  // Vacuity: "0 fabricated names" over 0 parsed names is an unparsed directory, not a clean one.
  assert(fabricatedOrgNames('').checked === 0, 'an empty document parses zero names');
  {
    const sealed = fs.readFileSync(path.join(ROOT, 'sf-startups-static.html'), 'utf8');
    const real = fabricatedOrgNames(sealed);
    assert(real.checked > 50, `the extractor really parses the sealed fragment (checked=${real.checked}) — a silent regex break would otherwise read as clean`);
  }

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
  // The composite siteHealth asserts below exercise AGGREGATION, so their sealed input must not
  // depend on whatever the latest map regeneration happened to leave on disk — otherwise "all-good
  // -> ok" goes red whenever the live directory has a data defect, which reads as broken CODE.
  // Detection is proved by the positive controls above; here we neutralise any identity this gate
  // would reject, without naming today's offender.
  const sealedClean = fabricatedOrgNames(sealedOnDisk).found.reduce(
    (html, name) => html.split(name).join('Placeholder Co'),
    sealedOnDisk,
  );
  const tmpSealed = path.join('/tmp', `dg-sealed-${process.pid}.html`);
  const prevSealedEnv = process.env.DEMIGOD_STARTUPS_STATIC;
  fs.writeFileSync(tmpSealed, sealedClean);
  process.env.DEMIGOD_STARTUPS_STATIC = tmpSealed;
  const goodStartups = `${stable}<body>${extractDgStaticFragment(sealedClean)}</body>`;

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
    mock({}, home, `${stable}<body><script>${extractDgStaticFragment(sealedClean)}</script></body>`),
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
  if (prevSealedEnv === undefined) delete process.env.DEMIGOD_STARTUPS_STATIC;
  else process.env.DEMIGOD_STARTUPS_STATIC = prevSealedEnv;
  fs.rmSync(tmpSealed, { force: true });
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
    duplicateCrawlable: res.duplicateCrawlable,
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
  for (const d of res.duplicateCrawlable?.duplicates || []) {
    console.log(`  duplicate crawlable text (report-only, needs page copy): ${d.routes.join(' == ')} — same ${d.chars} chars`);
  }
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
