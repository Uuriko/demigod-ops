#!/usr/bin/env node
// Route audit that CANNOT go stale: it discovers the routes to check from foot-core's own pathname->route
// map, then verifies each resolves live. A hardcoded route list (see demigod-route-health) silently rots —
// it missed that foot-core declares /privacy, /events-bot, /event, etc. as pretty paths that actually 404.
// This reads the authoritative source of truth (the declarations) so a newly-declared-but-unserved route
// is caught the moment it ships.
//   node demigod-route-audit.mjs [--json] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const UA = 'Mozilla/5.0 (compatible; DemigodRouteAudit/1)';

// PURE: pull declared pretty-path routes from a foot-core source string. Matches only the map form
// '/path': 'route' — not incidental string literals or function args.
export function extractDeclaredRoutes(footSrc) {
  return [...new Set([...String(footSrc || '').matchAll(/'(\/[a-z][a-z-]*)':\s*'[a-z-]+'/g)].map((m) => m[1]))];
}

export async function auditRoutes(routes, fetchImpl = fetch) {
  const results = await Promise.all((routes || []).map(async (r) => {
    try {
      const res = await fetchImpl(SITE + r, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
      return { path: r, status: res.status, ok: res.status < 400 }; // follow redirects; only a 4xx/5xx final is broken
    } catch (e) {
      return { path: r, status: 0, ok: false, error: String(e.message || e).slice(0, 60) };
    }
  }));
  const broken = results.filter((r) => !r.ok);
  return { ok: broken.length === 0, checked: results.length, broken };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  // extraction: only the map form, deduped; a bare string literal / function arg is NOT a route
  const src = "var m={ '/hire': 'hire', '/privacy': 'legal', '/hire': 'hire' }; go('/notaroute'); var x='/plain';";
  const routes = extractDeclaredRoutes(src);
  assert(routes.includes('/hire') && routes.includes('/privacy'), 'extracts declared routes');
  assert(!routes.includes('/notaroute') && !routes.includes('/plain'), 'ignores non-declaration string literals');
  assert(routes.filter((r) => r === '/hire').length === 1, 'dedupes');
  // audit: a route that 404s is reported broken; a 3xx that lands ok is not
  const mock = (map) => async (url) => ({ status: map[url.slice(SITE.length)] ?? 200 });
  const bad = await auditRoutes(['/hire', '/privacy'], mock({ '/privacy': 404 }));
  assert(bad.ok === false && bad.broken.some((r) => r.path === '/privacy'), 'flags a declared-but-404 route');
  const good = await auditRoutes(['/hire', '/talent'], mock({}));
  assert(good.ok === true && good.checked === 2, 'passes when all declared routes resolve');
  console.log(JSON.stringify({ ok: true, selftest: 'route-audit' }));
  process.exit(0);
}

if (isMain) {
  const footPath = process.env.DEMIGOD_FOOT || path.join(ROOT, 'demigod-foot-core.js');
  const routes = extractDeclaredRoutes(fs.readFileSync(footPath, 'utf8'));
  const res = await auditRoutes(routes);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  console.log(`route-audit ${res.ok ? 'PASS' : 'FAIL'} · ${res.checked} declared pretty-paths checked`);
  console.log(`  declared routes that 404/err: ${res.broken.length ? res.broken.map((r) => `${r.path}(${r.status || r.error})`).join(', ') : 'none'}`);
  process.exit(res.ok ? 0 : 1);
}
