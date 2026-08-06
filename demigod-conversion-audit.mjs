#!/usr/bin/env node
// Conversion-path audit on the RENDERED artifact (retro meta-lesson: measure what users get, not
// served HTML). Drives the live Chrome via CDP (:9223), navigates the funnel, and reports rendered
// facts — visible hero/CTA, whether the honesty scrubs actually fire for users, route health, render
// bugs. Read-only: navigates + evaluates, never clicks-submit or publishes.
//
//   node demigod-conversion-audit.mjs
import WebSocket from 'ws';
import { CDP_URL } from './cdp-config.mjs';

const FUNNEL = [
  ['home', 'https://www.trydemigod.com/'],
  ['how', 'https://www.trydemigod.com/how'],
  ['hire', 'https://www.trydemigod.com/hire'],
  ['talent', 'https://www.trydemigod.com/talent'],
  ['startups', 'https://www.trydemigod.com/startups'],
];

// Runs IN the page. Returns rendered-DOM facts. Visibility = real (rect + computed display/visibility).
const AUDIT_FN = `(() => {
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity !== 0; };
  // textContent for brand (letter-spacing can space glyphs in innerText); innerText for visible copy.
  const txt = (el) => (el && el.innerText || '').trim().replace(/\\s+/g, ' ');
  const rawTxt = (el) => (el && (el.textContent || el.innerText) || '').trim().replace(/\\s+/g, ' ');
  // Brand hero is the marked H1; size-ranked h1/h2 can be a roles rail on shells.
  const brandEl = document.querySelector('[data-dg-hero-h1],.hero-section h1,.header h1,h1.hero-title');
  const brandHero = vis(brandEl) ? rawTxt(brandEl).slice(0, 90) : null;
  // Per-letter cyber spans make AT/innerText "D E M I G O D"; host aria-label is the spoken name (disk v1020+).
  const brandAria = brandEl ? (brandEl.getAttribute('aria-label') || '').trim() : '';
  const hasLetterSpans = !!(brandEl && brandEl.querySelectorAll('.dg-cyber-ch').length > 1);
  const brandA11yOk = !brandEl || !vis(brandEl)
    || /^demigod$/i.test(brandAria)
    || (!hasLetterSpans && /^demigod$/i.test(brandHero || ''));
  const heads = [...document.querySelectorAll('h1,h2')].filter(vis)
    .map((el) => ({ t: txt(el), size: parseFloat(getComputedStyle(el).fontSize) || 0 })).filter((h) => h.t);
  heads.sort((a, b) => b.size - a.size);
  // visible primary actions (buttons + button-like links), first few
  const ctas = [...document.querySelectorAll('a,button')].filter(vis).map(txt)
    .filter((t) => t && t.length < 40).slice(0, 12);
  const bodyText = (document.body && document.body.innerText || '');
  // honesty RED items — do the runtime scrubs actually fix them in the RENDERED page?
  const renderedDishonesty = ['Human-Matched', 'Human-matched', 'FIND TALENT', 'hello@'].filter((s) => bodyText.includes(s));
  // obvious render bugs
  const glitches = ['undefined', 'NaN', '[object Object]', 'null,', '{{'].filter((s) => bodyText.includes(s));
  return {
    title: document.title,
    footVer: (window.__dgFootVer || null),
    heroTop: brandHero || (heads[0] ? heads[0].t.slice(0, 90) : null),
    brandHero,
    brandAria: brandAria || null,
    brandA11yOk,
    largestHeading: heads[0] ? heads[0].t.slice(0, 90) : null,
    heroCount: heads.length,
    ctas,
    renderedDishonesty,
    glitches,
    bodyChars: bodyText.length,
    url: location.href,
  };
})()`;

// --- tiny CDP client (ws package — works on Node 18+) ---
// Always open a private tab: shared live tabs race with nav-audit/hygiene (empty body / wrong URL).
async function openPrivateTab() {
  const boot = `https://www.trydemigod.com/?cv-audit=${Date.now()}`;
  const r = await fetch(`${CDP_URL}/json/new?${encodeURIComponent(boot)}`, {
    method: 'PUT',
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`CDP /json/new HTTP ${r.status}`);
  const tab = await r.json();
  if (!tab?.webSocketDebuggerUrl) throw new Error('no usable private page target on ' + CDP_URL);
  return tab;
}
async function closeTab(tab) {
  if (!tab?.id) return;
  try {
    await fetch(`${CDP_URL}/json/close/${tab.id}`, { signal: AbortSignal.timeout(3000) });
  } catch {
    /* best-effort */
  }
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map(); const waiters = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method) waiters.forEach((w) => w(m));
  });
  const ready = new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const onceEvent = (method, ms = 12000) => new Promise((res) => { const to = setTimeout(() => res(null), ms);
    const w = (m) => { if (m.method === method) { clearTimeout(to); const k = waiters.indexOf(w); if (k >= 0) waiters.splice(k, 1); res(m); } }; waiters.push(w); });
  return { ws, ready, send, onceEvent };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function expectedPath(url) {
  try {
    const u = new URL(url);
    return (u.pathname.replace(/\/+$/, '') || '/');
  } catch {
    return '/';
  }
}

async function evalJson(c, expression) {
  const r = await c.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return r.result?.result?.value;
}

/** Navigate and wait until this tab's location matches the target path (anti-hijack). */
async function navigateSettled(c, url, { loadMs = 12000, settleMs = 3500, matchTries = 8 } = {}) {
  const want = expectedPath(url);
  await c.send('Page.navigate', { url });
  await c.onceEvent('Page.loadEventFired', loadMs);
  await sleep(settleMs); // foot-core rewrites async
  for (let i = 0; i < matchTries; i++) {
    const href = await evalJson(c, 'location.href');
    let got = '/';
    try {
      got = new URL(String(href || '')).pathname.replace(/\/+$/, '') || '/';
    } catch {
      /* */
    }
    if (got === want) return { ok: true, href, want };
    // Another agent stole the tab — re-assert navigation.
    await c.send('Page.navigate', { url });
    await c.onceEvent('Page.loadEventFired', loadMs);
    await sleep(1500);
  }
  const href = await evalJson(c, 'location.href');
  return { ok: false, href, want };
}

function routeOk(row, name) {
  if (row.error) return false;
  if (row.urlMismatch) return false;
  if ((row.bodyChars || 0) < 200) return false;
  if ((row.renderedDishonesty || []).length) return false;
  if ((row.glitches || []).length) return false;
  if (!row.footVer) return false;
  // v1020+ ships host aria-label so AT does not speak "D E M I G O D". Pre-1020 live is soft.
  if (name === 'home' && row.brandA11yOk === false && Number(row.footVer) >= 1020) return false;
  return true;
}

async function main() {
  const tab = await openPrivateTab();
  await sleep(600);
  const c = connect(tab.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  const results = [];
  try {
    for (const [name, url] of FUNNEL) {
      const nav = await navigateSettled(c, url);
      if (!nav.ok) {
        results.push({
          name,
          error: 'url_mismatch_after_navigate',
          urlMismatch: true,
          wantPath: nav.want,
          url: nav.href || null,
          bodyChars: 0,
        });
        continue;
      }
      const value = await evalJson(c, AUDIT_FN);
      results.push({
        name,
        ...(value || { error: 'eval failed' }),
      });
    }
  } finally {
    try { c.ws.close(); } catch { /* */ }
    await closeTab(tab);
  }

  const ok = results.length === FUNNEL.length && results.every((row) => routeOk(row, row.name));
  const report = {
    auditedAt: new Date().toISOString(),
    target: tab.url,
    privateTab: true,
    ok,
    results,
  };
  try {
    const fs = await import('node:fs');
    fs.mkdirSync('/tmp/dg-busy', { recursive: true });
    fs.writeFileSync('/tmp/dg-busy/conversion-audit.json', JSON.stringify(report, null, 2) + '\n');
  } catch {
    /* receipt best-effort */
  }
  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
