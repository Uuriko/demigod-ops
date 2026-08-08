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
async function get(path) {
  const r = await fetch(base + path, { redirect: 'follow' });
  const text = await r.text();
  return { status: r.status, text, final: r.url };
}
const home = await get('/');
const desk = await get('/dasha');
const studio = await get('/studio');
const sitemap = await get('/sitemap.xml');
assert.equal(home.status, 200, 'home');
assert.equal(desk.status, 200, 'desk');
assert.equal(studio.status, 200, 'studio');
assert.ok(home.text.includes(MINT) && home.text.includes('jup.ag'), 'home mint+jup');
assert.ok(desk.text.includes(MINT) && desk.text.includes('jup.ag'), 'desk mint+jup');
assert.ok(!/t\.me\/dashacommunity/i.test(home.text + desk.text + studio.text), 'telegram ban');
assert.ok(!/thesis card|conviction receipt/i.test(home.text), 'no thesis on home');
const deskNeutral = !/buy the dip|dd-fomo|raid kit/i.test(desk.text);
const matches = (page, surface) => contract.surfaces[surface].required.every(marker => page.text.includes(marker))
  && contract.surfaces[surface].forbidden.every(marker => !page.text.includes(marker));
const homeCurrent = matches(home, 'home');
const studioCurrent = matches(studio, 'studio');
const documentLang = [home, desk, studio].every(page => /<html\b[^>]*\blang=["']en["']/i.test(page.text));
const canonicalMetadata = [
  [home, `${base}/`],
  [studio, `${base}/studio`],
  [desk, `${base}/dasha`],
].every(([page, url]) => page.text.includes(`<link rel="canonical" href="${url}">`)
  && page.text.includes(`<meta property="og:url" content="${url}">`));
const sitemapCurrent = sitemap.status === 200
  && ['/', '/studio', '/dasha'].every(path => sitemap.text.includes(`<loc>${base}${path}</loc>`))
  && !/retired|desk-rc|thesis|receipt/i.test(sitemap.text);
if (strict) {
  assert.ok(homeCurrent, 'strict: home differs from the prepared concise checkpoint');
  assert.ok(studioCurrent, 'strict: Studio asset differs from the generated local payload');
  assert.ok(deskNeutral, 'strict: desk still has FOMO/raid chrome');
  assert.ok(documentLang, 'strict: published pages do not declare English');
  assert.ok(canonicalMetadata, 'strict: published pages lack exact canonical or Open Graph URLs');
  assert.ok(sitemapCurrent, 'strict: bounded sitemap is missing or stale');
}
const lag = [];
if (!homeCurrent) lag.push('home-not-current');
if (!studioCurrent) lag.push('studio-asset-not-current');
if (!deskNeutral) lag.push('desk-not-neutral');
if (!canonicalMetadata) lag.push('canonical-metadata-not-live');
if (!sitemapCurrent) lag.push('sitemap-not-live');
console.log(JSON.stringify({
  ok: lag.length === 0,
  base,
  home: home.status,
  desk: desk.status,
  studio: studio.status,
  sitemap: sitemap.status,
  homeCurrent,
  studioInline: true,
  studioCurrent,
  deskNeutral,
  documentLang,
  canonicalMetadata,
  sitemapCurrent,
  shipLag: lag,
  warnings: documentLang ? [] : ['document-lang-not-live'],
  strict,
  note: lag.length
    ? 'prepared or expected website state is not fully live'
    : 'live matches ship markers',
}, null, 2));
