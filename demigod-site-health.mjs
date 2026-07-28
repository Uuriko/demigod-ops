#!/usr/bin/env node
// Content/SEO/route health for the LIVE site — the counterpart to `bin/dg truth` (which checks the
// release: version/CDN/lock). One fetch-based command, one honest verdict, evidence for each check:
//   1. every route foot-core declares resolves (reuses demigod-route-audit — no hardcoded list to rot).
//   2. the analytics beacon is NOT an ephemeral dev tunnel (protects the fix; route-health lost this check).
//   3. served-HTML SEO invariants: a real <title> (not empty/Untitled) and a canonical link.
//   node demigod-site-health.mjs [--json] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDeclaredRoutes, auditRoutes } from './demigod-route-audit.mjs';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const UA = 'Mozilla/5.0 (compatible; DemigodSiteHealth/1)';

// PURE: is the analytics beacon healthy? Healthy = no beacon, or a stable host — NOT an ephemeral tunnel.
export function beaconHealth(html) {
  const m = /__dgWebhookUrl\s*=\s*["']([^"']+)["']/.exec(String(html || ''));
  const url = m ? m[1] : '';
  const devTunnel = /trycloudflare\.com|\bngrok\.|loca\.lt|localtunnel|\.serveo\./i.test(url);
  return { ok: !devTunnel, url, issue: devTunnel ? 'analytics beacon points at an ephemeral dev tunnel (CORS on every page + dead funnel)' : null };
}

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

export async function siteHealth(fetchImpl = fetch, footSrc = null) {
  const src = footSrc ?? fs.readFileSync(process.env.DEMIGOD_FOOT || path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
  const routes = await auditRoutes(extractDeclaredRoutes(src), fetchImpl);
  let home = '';
  try { home = await (await fetchImpl(`${SITE}/`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })).text(); } catch (e) { /* */ }
  const beacon = beaconHealth(home);
  const seo = servedSeo(home);
  return { ok: routes.ok && beacon.ok && seo.ok, routes, beacon, seo };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  // beaconHealth
  assert(beaconHealth('').ok, 'no beacon is healthy');
  assert(beaconHealth(`__dgWebhookUrl="https://www.trydemigod.com/api"`).ok, 'stable host is healthy');
  assert(!beaconHealth(`__dgWebhookUrl="https://x.trycloudflare.com/api"`).ok, 'dev tunnel is unhealthy');
  assert(!beaconHealth(`__dgWebhookUrl="https://y.ngrok.io/a"`).ok, 'ngrok tunnel is unhealthy');
  // servedSeo (title only — canonical is foot-core's runtime job, not a served-HTML fail)
  assert(servedSeo('<title>Demigod</title>').ok, 'a real title is ok (no static canonical required)');
  assert(!servedSeo('<title></title>').ok, 'empty title flagged');
  assert(servedSeo('<title>Untitled</title>').issues.some((i) => /Untitled/.test(i)), 'Untitled title flagged');
  assert(servedSeo('<title>Pricing</title>').ok && !servedSeo('').ok, 'title present ok; no title flagged');
  // siteHealth aggregates: a broken route OR bad beacon OR bad seo -> not ok
  const home = `<title>Demigod</title><link rel="canonical" href="x"> __dgWebhookUrl="https://www.trydemigod.com/api"`;
  const mock = (routeStatus, homeHtml) => async (url) => url.endsWith('/') ? { status: 200, text: async () => homeHtml } : { status: routeStatus[url.slice(SITE.length)] ?? 200, text: async () => '' };
  const good = await siteHealth(mock({}, home), "'/hire': 'hire'");
  assert(good.ok === true, 'all-good -> ok');
  const badRoute = await siteHealth(mock({ '/privacy': 404 }, home), "'/hire': 'hire', '/privacy': 'legal'");
  assert(badRoute.ok === false && !badRoute.routes.ok, 'a declared route that 404s fails site-health');
  const badBeacon = await siteHealth(mock({}, `<title>x</title><link rel="canonical" href="y"> __dgWebhookUrl="https://z.trycloudflare.com/a"`), "'/hire': 'hire'");
  assert(badBeacon.ok === false && !badBeacon.beacon.ok, 'a dev-tunnel beacon fails site-health');
  console.log(JSON.stringify({ ok: true, selftest: 'site-health' }));
  process.exit(0);
}

if (isMain) {
  const res = await siteHealth();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  console.log(`site-health ${res.ok ? 'PASS' : 'FAIL'} · ${SITE}`);
  console.log(`  routes: ${res.routes.ok ? `all ${res.routes.checked} declared resolve` : `${res.routes.broken.length} broken → ` + res.routes.broken.map((r) => `${r.path}(${r.status})`).join(', ')}`);
  console.log(`  beacon: ${res.beacon.ok ? 'ok' + (res.beacon.url ? ` (${res.beacon.url.slice(0, 40)})` : ' (none)') : 'FAIL — ' + res.beacon.issue}`);
  console.log(`  served SEO: ${res.seo.ok ? `ok (title "${res.seo.title}")` : 'FAIL — ' + res.seo.issues.join(', ')}`);
  process.exit(res.ok ? 0 : 1);
}
