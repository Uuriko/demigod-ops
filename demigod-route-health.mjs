#!/usr/bin/env node
// Route-health + analytics-endpoint audit for the LIVE Demigod site. Codifies two site-review findings
// so they're caught on every run, not just once:
//   1. public pretty-paths must resolve (2xx/3xx) — /partners /mud /referral were found 404ing.
//   2. the served footer must NOT point __dgWebhookUrl at a dev tunnel (trycloudflare/ngrok/localtunnel)
//      — that caused CORS errors on every page load AND silently killed funnel capture.
//   node demigod-route-health.mjs [--json] [--selftest]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
// routes that MUST resolve. Derived from the live nav + funnel (pretty paths that return 200 today).
const MUST_RESOLVE = ['', 'hire', 'talent', 'startups', 'events', 'partnerships', 'legal', 'pricing', 'about', 'faq', 'how', 'security'];
// bare aliases whose content only renders via ?p= — reported as warnings (broken for shares/SEO), not fatal.
const KNOWN_BARE_404 = ['partners', 'mud', 'referral'];
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

// pure: given served homepage HTML, is the analytics beacon pointed at an ephemeral dev tunnel?
export function beaconIsDevTunnel(html) {
  const m = /__dgWebhookUrl\s*=\s*["']([^"']+)["']/.exec(String(html || ''));
  const url = m ? m[1] : '';
  return { url, devTunnel: /trycloudflare\.com|\bngrok\.|loca\.lt|localtunnel|\.serveo\./i.test(url) };
}

export async function audit(fetchImpl = fetch) {
  const required = await Promise.all(MUST_RESOLVE.map((p) => checkRoute(p, fetchImpl)));
  const brokenRequired = required.filter((r) => !r.ok);
  const bare = await Promise.all(KNOWN_BARE_404.map((p) => checkRoute(p, fetchImpl)));
  const bareStill404 = bare.filter((r) => !r.ok).map((r) => r.path);
  let beacon = { url: '', devTunnel: false };
  try {
    const r = await fetchImpl(`${SITE}/`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    beacon = beaconIsDevTunnel(await r.text());
  } catch (e) { beacon = { url: '', devTunnel: false, error: String(e.message || e).slice(0, 80) }; }
  // ok gate: every required route resolves AND the beacon is not a dev tunnel. Bare aliases are warnings.
  const ok = brokenRequired.length === 0 && !beacon.devTunnel;
  return { ok, site: SITE, brokenRequired, bareAliasesStill404: bareStill404, beacon };
}

if (process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  // beaconIsDevTunnel truth table
  assert(beaconIsDevTunnel(`a __dgWebhookUrl="https://abc.trycloudflare.com/api" b`).devTunnel === true, 'flags trycloudflare tunnel');
  assert(beaconIsDevTunnel(`__dgWebhookUrl="https://x.ngrok.io/a"`).devTunnel === true, 'flags ngrok tunnel');
  assert(beaconIsDevTunnel(`__dgWebhookUrl="https://www.trydemigod.com/api/events-bot"`).devTunnel === false, 'stable host is not a tunnel');
  assert(beaconIsDevTunnel('').devTunnel === false, 'no beacon -> not a tunnel');
  // audit() with a mock fetch — one required route 404 + dev-tunnel beacon -> ok:false
  const mkFetch = (statusMap, homeHtml) => async (url) => {
    const rel = url.slice(SITE.length + 1);
    if (rel === '') return { status: 200, text: async () => homeHtml };
    return { status: statusMap[rel] ?? 200, text: async () => '' };
  };
  const bad = await audit(mkFetch({ hire: 404 }, `__dgWebhookUrl="https://abc.trycloudflare.com/api"`));
  assert(bad.ok === false, 'audit fails on a broken required route or tunnel beacon');
  assert(bad.brokenRequired.some((r) => r.path === 'hire'), 'reports the broken required route');
  assert(bad.beacon.devTunnel === true, 'reports the dev-tunnel beacon');
  const good = await audit(mkFetch({}, `__dgWebhookUrl="https://www.trydemigod.com/api"`));
  assert(good.ok === true, 'audit passes when all required routes resolve + beacon is stable');
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
  console.log(`  analytics beacon: ${res.beacon.devTunnel ? 'DEV-TUNNEL (CORS + dead funnel) → ' + res.beacon.url : (res.beacon.url || '(none)')}`);
  process.exit(res.ok ? 0 : 1);
}
