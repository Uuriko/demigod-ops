#!/usr/bin/env node
// Route-health audit for the LIVE Demigod site.
// Public pretty-paths must resolve (2xx/3xx); /partners and /referral were found 404ing.
//   node demigod-route-health.mjs [--json] [--selftest]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
// routes that MUST resolve. Derived from the live nav + funnel (pretty paths that return 200 today).
const MUST_RESOLVE = ['', 'hire', 'talent', 'startups', 'events', 'partnerships', 'legal', 'pricing', 'about', 'faq', 'how', 'security'];
// bare aliases whose content only renders via ?p= — reported as warnings (broken for shares/SEO), not fatal.
const KNOWN_BARE_404 = ['partners', 'referral'];
const UA = 'Mozilla/5.0 (compatible; DemigodRouteHealth/1)';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export async function checkRoute(p, fetchImpl = fetch) {
  const url = `${SITE}/${p}`;
  try {
    const r = await fetchImpl(url, { headers: { 'User-Agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    // 2xx = ok; 3xx = a real redirect target (fine); 4xx/5xx = broken.
    return { path: p || '(home)', status: r.status, ok: r.status >= 200 && r.status < 400 };
  } catch (e) {
    return { path: p || '(home)', status: 0, ok: false, error: String(e.message || e).slice(0, 80) };
  }
}

export async function audit(fetchImpl = fetch) {
  const required = await Promise.all(MUST_RESOLVE.map((p) => checkRoute(p, fetchImpl)));
  const brokenRequired = required.filter((r) => !r.ok);
  const bare = await Promise.all(KNOWN_BARE_404.map((p) => checkRoute(p, fetchImpl)));
  const bareStill404 = bare.filter((r) => !r.ok).map((r) => r.path);
  return { ok: brokenRequired.length === 0, site: SITE, brokenRequired, bareAliasesStill404: bareStill404 };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const mkFetch = (statusMap) => async (url) => {
    const rel = url.slice(SITE.length + 1);
    return { status: statusMap[rel] ?? 200 };
  };
  const bad = await audit(mkFetch({ hire: 404 }));
  assert(bad.ok === false, 'audit fails on a broken required route');
  assert(bad.brokenRequired.some((r) => r.path === 'hire'), 'reports the broken required route');
  const good = await audit(mkFetch({}));
  assert(good.ok === true, 'audit passes when all required routes resolve');
  assert(good.brokenRequired.length === 0, 'no false broken-route on the happy path');
  console.log(JSON.stringify({ ok: true, selftest: 'route-health' }));
  process.exit(0);
}

if (isMain) {
  const res = await audit();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  console.log(`route-health ${res.ok ? 'PASS' : 'FAIL'} · ${res.site}`);
  console.log(`  required routes broken: ${res.brokenRequired.length}${res.brokenRequired.length ? ' → ' + res.brokenRequired.map((r) => `${r.path}(${r.status})`).join(', ') : ''}`);
  console.log(`  bare aliases still 404: ${res.bareAliasesStill404.length ? res.bareAliasesStill404.join(', ') : 'none'}`);
  process.exit(res.ok ? 0 : 1);
}
