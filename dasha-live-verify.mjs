#!/usr/bin/env node
/** Live marker check for getdasha.com — fetch-only, no auth.
 *  Default: report source/live lag without failing.
 *  DASHA_LIVE_STRICT=1: hard-fail until the three canonical pages match.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const contract = JSON.parse(readFileSync(new URL('./dasha-release-contract.json', import.meta.url)));
const base = process.env.DASHA_LIVE_BASE || 'https://www.getdasha.com';
const strict = process.env.DASHA_LIVE_STRICT === '1';
/* Never follow redirects. /studio, /dasha and /desk 308 to home; a followed redirect handed
   home's HTML back as that surface's content, so every studio/desk marker check was really
   running against the homepage. The drift then reported as "studio-asset-not-current" and
   "desk-aa-gradient" — asset staleness for a surface that was not being served at all. */
async function get(path) {
  const r = await fetch(base + path, { redirect: 'manual' });
  const location = r.headers.get('location');
  return { status: r.status, text: location ? '' : await r.text(), location: location || null };
}
const home = await get('/');
const desk = await get('/dasha');
const studio = await get('/studio');
const simp = await get('/simp');
const chess = await get('/chess');
const sitemap = await get('/sitemap.xml');
const served = (page) => page.status === 200;
/* Canonical surfaces per DASHA-DOCS.md + the 2026-08-15 direction call: /simp and /chess are
   first-class and Studio/Desk stay active. A redirect here is a live defect, not a gate bug. */
const redirected = Object.entries({ home, desk, studio, simp, chess })
  .filter(([, page]) => page.status >= 300 && page.status < 400)
  .map(([name, page]) => `${name}→${page.location}`);
assert.equal(home.status, 200, 'home');
assert.ok(home.text.includes(MINT) && home.text.includes('jup.ag'), 'home mint+jup');
if (served(desk)) assert.ok(desk.text.includes(MINT) && desk.text.includes('jup.ag'), 'desk mint+jup');
assert.ok(!/t\.me\/dashacommunity/i.test(home.text + desk.text + studio.text), 'telegram ban');
assert.ok(!/thesis card|conviction receipt/i.test(home.text), 'no thesis on home');
const deskNeutral = !/buy the dip|dd-fomo|raid kit/i.test(desk.text);
const matches = (page, surface) => contract.surfaces[surface].required.every(marker => page.text.includes(marker))
  && contract.surfaces[surface].forbidden.every(marker => !page.text.includes(marker));
const homeCurrent = matches(home, 'home');
/* A redirected surface has no text to match. Report it as redirected, not as content drift. */
const studioCurrent = served(studio) ? matches(studio, 'studio') : null;
const servedPages = [home, desk, studio].filter(served);
const documentLang = servedPages.every(page => /<html\b[^>]*\blang=["']en["']/i.test(page.text));
const canonicalMetadata = [
  [home, `${base}/`],
  [studio, `${base}/studio`],
  [desk, `${base}/dasha`],
].filter(([page]) => served(page))
  .every(([page, url]) => page.text.includes(`<link rel="canonical" href="${url}">`)
    && page.text.includes(`<meta property="og:url" content="${url}">`));
/* Canonical route inventory. The four thin SEO traps are not in any canonical product doc and
   roadmap D8 wants retired paths on a branded 404 so crawlers drop them — they do not belong
   in the sitemap while they serve a heading and a Buy button. */
/* `/simp` is a canonical surface per the direction call but 404s on live, so it is not required
   here until the page is restored — a gate that demands a dead URL be advertised is worse than the
   drift it is watching for. Add it back with the page. */
const SITEMAP_REQUIRED = ['/', '/chess', '/studio', '/dasha'];
/* `/faucet` was on this list until 2026-08-15. It is a real Worker-served tip page with its own
   Durable Object and payout caps, not a trap — it was measured as thin before the Worker that
   serves it was deployed. Keeping it here would have made a correct sitemap fail. */
const SITEMAP_TRAPS = ['/airdrop', '/earn', '/claim'];
const sitemapMissing = SITEMAP_REQUIRED.filter(path => !sitemap.text.includes(`<loc>${base}${path}</loc>`));
const sitemapTraps = SITEMAP_TRAPS.filter(path => sitemap.text.includes(`<loc>${base}${path}</loc>`));
const sitemapCurrent = sitemap.status === 200
  && !sitemapMissing.length
  && !sitemapTraps.length
  && !/retired|desk-rc|thesis|receipt/i.test(sitemap.text);

// Simp Board SRI: live home pin must match live JS bytes (empty board when stale).
const { createHash } = await import('node:crypto');
const boardSrc = home.text.match(/s\.src=['"]([^'"]*simp-board\.js[^'"]*)['"]/)?.[1]
  || home.text.match(/src=['"]([^'"]*simp-board\.js[^'"]*)['"]/)?.[1]
  || 'https://lobby.getdasha.com/client/simp-board.js';
/* Pin by position, not by page-wide search. The previous fallback scanned every integrity= on the
   page and picked with `.find(h => home.text.includes('simp-board') && home.text.includes(h))`,
   whose clauses are both trivially true for every candidate — h came from home.text, and the
   simp-board test is a page-level constant — so it returned whichever sha384 appeared first.
   Live home carries seven; the first belongs to another script. It stayed harmless only while the
   loader kept its inline `s.integrity=` shape, and would have pinned an unrelated hash the moment
   that became a plain <script integrity> tag, reporting drift no correct ship could ever clear.

   ponytail: nearest sha384 TOKEN to the src, matched without an `integrity=` prefix. Two narrower
   versions were wrong before this one. A fixed ±400-char window swallows a preceding script's pin.
   Keying on /integrity=/ then broke the same day: home was republished with the pin held in a JS
   constant, `const SIMP_SRI='sha384-…'`, so the only candidates left were real integrity attributes
   belonging to other scripts, and the nearest sat 4,412 characters away while the board's own pin
   sat 22 away. That reported drift on a board whose pin and bytes matched exactly — a false failure
   on the command CLAUDE.md calls Dasha's truth. Matching the bare token covers every shape the
   loader has taken: attribute, `s.integrity=`, and a named constant.
   Ceiling: still wrong if some other script's sha384 sits nearer this src than the board's own. */
const boardAt = home.text.indexOf(boardSrc);
const boardPin = boardAt === -1 ? undefined
  : [...home.text.matchAll(/(sha384-[A-Za-z0-9+/=]{40,})/g)]
    .map(m => ({ pin: m[1], distance: Math.abs(m.index - boardAt) }))
    .sort((a, b) => a.distance - b.distance)[0]?.pin;
let boardSriOk = false;
let boardSriLive = null;
let boardSriError = null;
try {
  const br = await fetch(boardSrc, { redirect: 'follow' });
  assert.equal(br.status, 200, 'simp-board.js');
  const bytes = Buffer.from(await br.arrayBuffer());
  boardSriLive = 'sha384-' + createHash('sha384').update(bytes).digest('base64');
  boardSriOk = Boolean(boardPin) && boardPin === boardSriLive;
} catch (err) {
  boardSriError = String(err?.message || err);
}

let boardMounted = false;
let boardMountError = null;
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('console', message => message.type() === 'error' && errors.push(message.text()));
    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 60_000 });
    await page.locator('#simp').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#dasha-simp-board')?.children.length > 0, { timeout: 10_000 });
    boardMounted = !errors.some(message => /integrity|simp-board/i.test(message));
    if (!boardMounted) boardMountError = errors.find(message => /integrity|simp-board/i.test(message));
  } finally {
    await browser.close();
  }
} catch (err) {
  boardMountError = String(err?.message || err);
}

/* Live-marker honesty (not just file hashes): catch "manifest aligned but live wrong".
   `null` where the surface is not served — an unserved page has no markers to be wrong about. */
const deskAaOk = served(desk)
  ? /#5b21b6/.test(desk.text) && /linear-gradient\([^)]*#5b21b6/.test(desk.text)
  : null;
const deskLegacyGradient = /linear-gradient\([^)]*#a78bfa[^)]*#7c3aed/.test(desk.text);
const studioThinOk = served(studio)
  ? /lobby\.getdasha\.com\/client\/studio\.js/.test(studio.text) &&
    /dasha-studio-shell/.test(studio.text) &&
    !/attachShadow/.test(studio.text)
  : null;
const studioShadowLegacy = /attachShadow/.test(studio.text) && studio.text.length > 20_000;
const allPages = home.text + desk.text + studio.text;
const inkuPopAbsent = !/inkuPop/i.test(allPages);
const dashaTouchPresent = /dasha-icon-180\.png/.test(allPages);

if (strict) {
  assert.ok(!redirected.length, `strict: canonical surfaces redirect away: ${redirected.join(', ')}`);
  assert.ok(homeCurrent, 'strict: home differs from the prepared concise checkpoint');
  assert.ok(studioCurrent, 'strict: Studio asset differs from the generated local payload');
  assert.ok(deskNeutral, 'strict: desk still has FOMO/raid chrome');
  assert.ok(documentLang, 'strict: published pages do not declare English');
  assert.ok(canonicalMetadata, 'strict: published pages lack exact canonical or Open Graph URLs');
  assert.ok(sitemapCurrent, 'strict: bounded sitemap is missing or stale');
  assert.ok(boardSriOk, 'strict: home Simp Board SRI pin does not match live JS');
  assert.ok(boardMounted, 'strict: home Simp Board did not mount');
  assert.ok(deskAaOk, 'strict: desk primary CTA missing AA gradient #5b21b6');
  assert.ok(studioThinOk, 'strict: studio is not the thin Worker loader');
  assert.ok(inkuPopAbsent, 'strict: 2020 inkuPop apple-touch icon still present');
}
const lag = [];
if (redirected.length) lag.push('canonical-surface-redirected');
if (!homeCurrent) lag.push('home-not-current');
if (studioCurrent === false) lag.push('studio-asset-not-current');
if (!deskNeutral) lag.push('desk-not-neutral');
if (!canonicalMetadata) lag.push('canonical-metadata-not-live');
if (!sitemapCurrent) lag.push('sitemap-not-live');
if (!boardSriOk) lag.push('simp-board-sri-drift');
if (!boardMounted) lag.push('simp-board-not-mounted');
if (deskAaOk === false || deskLegacyGradient) lag.push('desk-aa-gradient');
if (studioThinOk === false || studioShadowLegacy) lag.push('studio-not-thin-loader');
if (!inkuPopAbsent) lag.push('inkuPop-apple-touch');
const warnings = [];
if (!documentLang) warnings.push('document-lang-not-live');
if (!boardSriOk) warnings.push(boardSriError || `simp-board-sri pin=${boardPin || 'missing'} live=${boardSriLive || 'unknown'}`);
if (!boardMounted) warnings.push(boardMountError || 'Simp Board did not mount');
if (redirected.length) warnings.push(`canonical surfaces redirect away: ${redirected.join(', ')}`);
if (sitemapMissing.length) warnings.push(`sitemap missing canonical routes: ${sitemapMissing.join(', ')}`);
if (sitemapTraps.length) warnings.push(`sitemap advertises thin SEO traps: ${sitemapTraps.join(', ')}`);
if (deskAaOk === false) warnings.push('desk Buy CTA missing #5b21b6 AA gradient');
if (deskLegacyGradient) warnings.push('desk still has legacy #a78bfa→#7c3aed primary gradient');
if (studioThinOk === false) warnings.push('studio missing thin Worker loader (studio.js + dasha-studio-shell)');
if (studioShadowLegacy) warnings.push('studio looks like legacy shadow embed');
if (!inkuPopAbsent) warnings.push('inkuPop 2020 template apple-touch still in live HTML');
if (!dashaTouchPresent) warnings.push('dasha-icon-180.png apple-touch missing');
console.log(JSON.stringify({
  ok: lag.length === 0,
  base,
  home: home.status,
  desk: desk.status,
  studio: studio.status,
  simp: simp.status,
  chess: chess.status,
  sitemap: sitemap.status,
  redirected,
  sitemapMissing,
  sitemapTraps,
  homeCurrent,
  studioInline: true,
  studioCurrent,
  studioThinOk,
  deskNeutral,
  deskAaOk,
  documentLang,
  canonicalMetadata,
  sitemapCurrent,
  boardSriOk,
  boardSriPin: boardPin || null,
  boardSriLive,
  boardMounted,
  inkuPopAbsent,
  dashaTouchPresent,
  shipLag: lag,
  warnings,
  strict,
  note: lag.length
    ? 'prepared or expected website state is not fully live'
    : 'live matches ship markers',
}, null, 2));

/* Exit non-zero when a real lag was detected.
   This printed `ok: false` and exited 0 until 2026-08-11, which made the command CLAUDE.md, AGENTS.md
   and DASHA-RULES.md all designate as Dasha's truth incapable of failing anything. Every documented
   invocation runs the plain form — none set DASHA_LIVE_STRICT=1 — so `node dasha-live-verify.mjs &&
   <next step>` proceeded happily over a live defect. The detection was already right; only the exit
   status disagreed with it.
   `--advisory` restores the old report-and-continue behaviour for callers that genuinely want it. */
if (!process.argv.includes('--advisory') && lag.length) process.exitCode = 1;
