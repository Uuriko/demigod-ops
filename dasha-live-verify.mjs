#!/usr/bin/env node
/** Live marker check for getdasha.com — fetch-only, no auth.
 *  Default: report source/live lag without failing.
 *  DASHA_LIVE_STRICT=1: hard-fail until the three canonical pages match.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SIMP_BOARD_SRI, STUDIO_WEBMANIFEST } from './dasha-lobby-static-gen.mjs';
import { rulesPublic } from './dasha-simp-score.mjs';
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const contract = JSON.parse(readFileSync(new URL('./dasha-release-contract.json', import.meta.url)));
const base = process.env.DASHA_LIVE_BASE || 'https://www.getdasha.com';
const serviceBase = process.env.DASHA_SERVICE_BASE || 'https://lobby.getdasha.com';
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
async function getExternal(url) {
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    return { status: r.status, text: r.status === 200 ? await r.text() : '' };
  } catch {
    return { status: 0, text: '' };
  }
}
const home = await get('/');
const desk = await get('/dasha');
const studio = await get('/studio');
const studioManifest = await get('/studio.webmanifest');
const expectedStudioManifest = JSON.parse(STUDIO_WEBMANIFEST);
const studioIcons = await Promise.all(expectedStudioManifest.icons.map(async (icon) => {
  try {
    const response = await fetch(base + icon.src, { redirect: 'manual' });
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      status: response.status,
      type: response.headers.get('content-type') || '',
      size: bytes.length >= 24 && bytes.subarray(1, 4).toString() === 'PNG'
        ? `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
        : null,
    };
  } catch {
    return { status: 0, type: '', size: null };
  }
}));
const simp = await get('/simp');
const chess = await get('/chess');
const contribute = await get('/contribute');
const contributorGuide = await getExternal('https://raw.githubusercontent.com/Uuriko/dasha-desk/main/CONTRIBUTING.md');
const which = await get('/which');
const sitemap = await get('/sitemap.xml');
const liveBoard = await fetch(`${serviceBase}/simp/board`, { cache: 'no-store' })
  .then((response) => response.ok ? response.json() : null)
  .catch(() => null);
const preparedSpotlightPlatforms = rulesPublic().spotlight.platforms;
const liveSpotlightPlatforms = Array.isArray(liveBoard?.rules?.spotlight?.platforms)
  ? liveBoard.rules.spotlight.platforms
  : null;
const spotlightPlatformsPrepared = liveSpotlightPlatforms
  ? JSON.stringify(liveSpotlightPlatforms) === JSON.stringify(preparedSpotlightPlatforms)
  : null;
const served = (page) => page.status === 200;
/* Canonical surfaces per DASHA-DOCS.md + the 2026-08-15 direction call: /simp and /chess are
   first-class and Studio/Desk stay active. A redirect here is a live defect, not a gate bug. */
const redirected = Object.entries({ home, desk, studio, simp, chess, contribute })
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
const servedPages = [home, desk, studio, contribute].filter(served);
const documentLang = servedPages.every(page => /<html\b[^>]*\blang=["']en["']/i.test(page.text));
const canonicalMetadata = [
  [home, `${base}/`],
  [studio, `${base}/studio`],
  [desk, `${base}/dasha`],
  [contribute, `${base}/contribute`],
].filter(([page]) => served(page))
  .every(([page, url]) => page.text.includes(`<link rel="canonical" href="${url}">`)
    && page.text.includes(`<meta property="og:url" content="${url}">`));
/* Canonical route inventory. The four thin SEO traps are not in any canonical product doc and
   roadmap D8 wants retired paths on a branded 404 so crawlers drop them — they do not belong
   in the sitemap while they serve a heading and a Buy button. */
const SITEMAP_REQUIRED = ['/', '/simp', '/chess', '/studio', '/dasha', '/bounties', '/contribute', '/which'];
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
const contributeCurrent = served(contribute)
  && contribute.text.includes('<h1>Build Dasha.</h1>')
  && contribute.text.includes('There’s nothing to join. Open a pull request and you’re a contributor')
  && contribute.text.includes('github.com/Uuriko/dasha-desk/contribute')
  && contribute.text.includes('blob/main/CONTRIBUTING.md')
  && contribute.text.includes('PR points are not live yet.');
const contributorGuideCurrent = contributorGuide.status === 200
  && /Prepared Simp Points lane/i.test(contributorGuide.text)
  && /not active yet[\s\S]*no current pull request earns Simp Points/i.test(contributorGuide.text)
  && !/A merged pull request scores points/i.test(contributorGuide.text);
const otherDashaMint = 'FQ1tyso61AH1tzodyJfSwmzsD3GToybbRNoZxUBz21p8';
const whichCurrent = served(which)
  && which.text.includes(`<link rel="canonical" href="${base}/which">`)
  && which.text.indexOf(MINT) >= 0
  && which.text.indexOf(MINT) < which.text.indexOf(otherDashaMint);

const homeSimpDoor = home.text.includes('href="/simp"');
const homeBoardAbsent = !home.text.includes('id="dasha-simp-board"')
  && !home.text.includes('/client/simp-board.js');

/* Wherever the board is embedded, that page's pinned hash must match the bytes the Worker actually
   serves. A mismatch is not cosmetic: the browser refuses the script and the board silently does
   not mount, which is exactly how it died on 2026-08-11 and again on 2026-08-16. Nothing else
   catches it — file-hash gates compare disk to disk, and a Designer paste never passes them.
   ("While home still embeds the board" until 2026-08-18, by which point it no longer did.) */
/* Pin by nearest sha384 TOKEN to the src, not by an `integrity=` prefix and not by a page-wide
   search. Three narrower versions were wrong before this one: a page-wide scan returned another
   script's pin; a fixed ±400-char window swallowed the preceding script's; keying on /integrity=/
   broke the day home shipped the pin as a JS constant (`const SIMP_SRI='sha384-…'`), reporting
   drift on a board whose bytes matched. The bare token covers every shape the loader has taken —
   attribute, `s.integrity=`, named constant.
   ponytail: still wrong if another script's sha384 sits nearer this src than the board's own. */
/* Read from the page that EMBEDS the board, which is /simp — not home.
   This block used to parse home.text, while forty lines below a strict assertion requires
   `homeBoardAbsent`: Home must link to /simp without embedding it. So the drift guard was reading
   the one page guaranteed not to contain the thing it guards. boardPin was null every run,
   boardSriOk was null every run, and /simp — which is fetched on line 25 and does carry a pin —
   was never compared to anything. A Designer publish could have swapped the served client with no
   check anywhere objecting, which is the exact failure this guard exists for.
   Home is still parsed as a fallback so an accidental re-embed there is not invisible. */
const boardHost = /simp-board\.js/.test(simp.text) ? simp : home;
const boardSrc = boardHost.text.match(/s\.src=['"]([^'"]*simp-board\.js[^'"]*)['"]/)?.[1]
  || boardHost.text.match(/src=['"]([^'"]*simp-board\.js[^'"]*)['"]/)?.[1]
  || null;
const boardAt = boardSrc ? boardHost.text.indexOf(boardSrc) : -1;
const boardPin = boardAt === -1 ? null
  : [...boardHost.text.matchAll(/(sha384-[A-Za-z0-9+/=]{40,})/g)]
    .map((match) => ({ pin: match[1], distance: Math.abs(match.index - boardAt) }))
    .sort((a, b) => a.distance - b.distance)[0]?.pin || null;
const boardServed = boardPin
  ? await fetch(boardSrc, { redirect: 'follow' })
      .then(async (r) => (r.status === 200
        ? `sha384-${createHash('sha384').update(Buffer.from(await r.arrayBuffer())).digest('base64')}`
        : null))
      .catch(() => null)
  : null;
/* null on either side = nothing to compare, not a pass: no pin means no embed, a failed fetch
   means no verdict. Only two known, differing hashes are a defect. */
const boardSriOk = boardPin && boardServed ? boardPin === boardServed : null;
const boardSriPrepared = boardPin && boardServed
  ? boardPin === SIMP_BOARD_SRI && boardServed === SIMP_BOARD_SRI
  : null;
const boardSriPage = boardSrc ? (boardHost === simp ? '/simp' : '/') : null;

/* Every internal link on live home must resolve. Nav and footer are edited in the Webflow Designer,
   which does not pass through dasha-ship.mjs, its SRI drift guard, or any source tree — so a link
   can point at a page nobody ever built and no file-hash check will ever notice. /graph has 404'd
   from live nav since at least 2026-08-16 and appears in no tree's source. A transport error is
   not a verdict: only a real >=400 counts, so a flaky fetch cannot fail the ship. */
const homeLinks = [...new Set(
  [...home.text.matchAll(/href="(\/[^"#?]*)/g)].map(([, path]) => path.replace(/\/$/, '') || '/'),
)];
const homeDeadLinks = (await Promise.all(homeLinks.map(async (path) => {
  const status = await get(path).then((r) => r.status, () => 0);
  return status >= 400 ? `${path}→${status}` : null;
}))).filter(Boolean);

/* Live-marker honesty (not just file hashes): catch "manifest aligned but live wrong".
   `null` where the surface is not served — an unserved page has no markers to be wrong about. */
const deskAcidPrimary = /\.dd-btn-primary\{[^}]*background:var\(--acid\)[^}]*color:var\(--ink\)/.test(desk.text);
const deskPurpleAa = /#5b21b6/.test(desk.text) && /linear-gradient\([^)]*#5b21b6/.test(desk.text);
const deskAaOk = served(desk) ? (deskAcidPrimary || deskPurpleAa) : null;
const deskLegacyGradient = /linear-gradient\([^)]*#a78bfa[^)]*#7c3aed/.test(desk.text);
const studioThinOk = served(studio)
  ? /lobby\.getdasha\.com\/client\/studio\.js/.test(studio.text) &&
    /dasha-studio-shell/.test(studio.text) &&
    !/attachShadow/.test(studio.text)
  : null;
let liveStudioManifest = null;
try { liveStudioManifest = JSON.parse(studioManifest.text); } catch {}
const studioInstallable = served(studio)
  && studio.text.includes('<link rel="manifest" href="/studio.webmanifest">')
  && studioManifest.status === 200
  && JSON.stringify(liveStudioManifest) === JSON.stringify(expectedStudioManifest)
  && studioIcons.every((icon, index) => icon.status === 200
    && icon.type.startsWith('image/png')
    && icon.size === expectedStudioManifest.icons[index].sizes);
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
  assert.ok(contributeCurrent, 'strict: /contribute onboarding is missing or misleading');
  assert.ok(contributorGuideCurrent, 'strict: live contributor guide misstates inactive OSS points');
  assert.equal(spotlightPlatformsPrepared, true, `strict: live Spotlight platforms ${JSON.stringify(liveSpotlightPlatforms)} differ from prepared ${JSON.stringify(preparedSpotlightPlatforms)}`);
  assert.ok(whichCurrent, 'strict: /which identity page is missing or ambiguous');
  assert.ok(homeSimpDoor && homeBoardAbsent, 'strict: Home must link to /simp without embedding it');
  assert.ok(deskAaOk, 'strict: desk primary CTA is not AA (acid-on-ink or #5b21b6)');
  assert.ok(studioThinOk, 'strict: studio is not the thin Worker loader');
  assert.ok(studioInstallable, 'strict: Studio manifest or install icons are missing or stale');
  assert.ok(inkuPopAbsent, 'strict: 2020 inkuPop apple-touch icon still present');
  assert.ok(!homeDeadLinks.length, `strict: live home links to dead routes: ${homeDeadLinks.join(', ')}`);
  assert.equal(boardSriPrepared, true, `strict: ${boardSriPage || 'board page'} pins ${boardPin}, Worker serves ${boardServed}, prepared release expects ${SIMP_BOARD_SRI}`);
}
const lag = [];
if (redirected.length) lag.push('canonical-surface-redirected');
if (!homeCurrent) lag.push('home-not-current');
if (studioCurrent === false) lag.push('studio-asset-not-current');
if (!deskNeutral) lag.push('desk-not-neutral');
if (!canonicalMetadata) lag.push('canonical-metadata-not-live');
if (!sitemapCurrent) lag.push('sitemap-not-live');
if (!contributeCurrent) lag.push('contribute-not-live');
if (!contributorGuideCurrent) lag.push('contributor-guide-points-misleading');
if (spotlightPlatformsPrepared === false) lag.push('spotlight-platforms-not-prepared');
if (!whichCurrent) lag.push('which-not-live');
if (!homeSimpDoor || !homeBoardAbsent) lag.push('home-simp-not-door-only');
if (deskAaOk === false || deskLegacyGradient) lag.push('desk-aa-gradient');
if (studioThinOk === false || studioShadowLegacy) lag.push('studio-not-thin-loader');
if (!studioInstallable) lag.push('studio-install-not-live');
if (!inkuPopAbsent) lag.push('inkuPop-apple-touch');
if (homeDeadLinks.length) lag.push('home-links-dead-routes');
if (boardSriOk === false) lag.push('board-sri-pin-mismatch');
if (boardSriOk === true && boardSriPrepared === false) lag.push('board-sri-not-prepared');
const warnings = [];
if (!documentLang) warnings.push('document-lang-not-live');
if (!homeSimpDoor || !homeBoardAbsent) warnings.push('Home must link to /simp without embedding its client');
if (redirected.length) warnings.push(`canonical surfaces redirect away: ${redirected.join(', ')}`);
if (sitemapMissing.length) warnings.push(`sitemap missing canonical routes: ${sitemapMissing.join(', ')}`);
if (sitemapTraps.length) warnings.push(`sitemap advertises thin SEO traps: ${sitemapTraps.join(', ')}`);
if (!contributeCurrent) warnings.push('/contribute must expose real issues, the guide, and honest points status');
if (!contributorGuideCurrent) warnings.push('live GitHub CONTRIBUTING must say the OSS points lane is inactive');
if (spotlightPlatformsPrepared === false) warnings.push(`live Spotlight platforms ${liveSpotlightPlatforms.join(', ')} differ from prepared ${preparedSpotlightPlatforms.join(', ')}`);
if (spotlightPlatformsPrepared === null) warnings.push('live Spotlight platform rules could not be read');
if (!whichCurrent) warnings.push('/which must identify the associated mint before VVAIFU and declare its canonical URL');
if (deskAaOk === false) warnings.push('desk Buy CTA is not AA (need acid-on-ink or #5b21b6)');
if (deskLegacyGradient) warnings.push('desk still has legacy #a78bfa→#7c3aed primary gradient');
if (studioThinOk === false) warnings.push('studio missing thin Worker loader (studio.js + dasha-studio-shell)');
if (studioShadowLegacy) warnings.push('studio looks like legacy shadow embed');
if (!studioInstallable) warnings.push('Studio manifest link, manifest JSON, or exact 192/512 PNG icons are not live');
if (!inkuPopAbsent) warnings.push('inkuPop 2020 template apple-touch still in live HTML');
if (!dashaTouchPresent) warnings.push('dasha-icon-180.png apple-touch missing');
if (homeDeadLinks.length) warnings.push(`live home links to dead routes: ${homeDeadLinks.join(', ')}`);
if (boardSriOk === false) warnings.push(`board SRI mismatch: ${boardSriPage || 'board page'} pins ${boardPin}, Worker serves ${boardServed}`);
if (boardSriOk === true && boardSriPrepared === false) warnings.push(`board SRI is internally consistent but stale: live uses ${boardPin}, prepared release expects ${SIMP_BOARD_SRI}`);
/* An embed we cannot read the pin out of must not read as "no mismatch found". */
if (!homeBoardAbsent && !boardPin) warnings.push('home embeds the board client but no SRI pin could be parsed — check is blind');
console.log(JSON.stringify({
  ok: lag.length === 0,
  base,
  home: home.status,
  desk: desk.status,
  studio: studio.status,
  simp: simp.status,
  chess: chess.status,
  contribute: contribute.status,
  contributorGuide: contributorGuide.status,
  which: which.status,
  sitemap: sitemap.status,
  redirected,
  sitemapMissing,
  sitemapTraps,
  homeCurrent,
  studioInline: true,
  studioCurrent,
  studioThinOk,
  studioInstallable,
  studioManifest: studioManifest.status,
  studioIcons,
  deskNeutral,
  deskAaOk,
  documentLang,
  canonicalMetadata,
  sitemapCurrent,
  contributeCurrent,
  contributorGuideCurrent,
  liveSpotlightPlatforms,
  preparedSpotlightPlatforms,
  spotlightPlatformsPrepared,
  whichCurrent,
  homeSimpDoor,
  homeBoardAbsent,
  homeDeadLinks,
  boardSriOk,
  boardSriPrepared,
  boardSriPreparedPin: SIMP_BOARD_SRI,
  boardSriPage,
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
