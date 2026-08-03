#!/usr/bin/env node
// Conversion-path audit on the RENDERED artifact (retro meta-lesson: measure what users get, not
// served HTML). Drives the live Chrome via CDP (:9223), navigates the funnel, and reports rendered
// facts — visible hero/CTA, whether the honesty scrubs actually fire for users, route health, render
// bugs. Read-only: navigates + evaluates, never clicks-submit or publishes.
//
//   node demigod-conversion-audit.mjs
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
  const txt = (el) => (el && el.innerText || '').trim().replace(/\\s+/g, ' ');
  // biggest visible heading = the de-facto hero line
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
    heroTop: heads[0] ? heads[0].t.slice(0, 90) : null,
    heroCount: heads.length,
    ctas,
    renderedDishonesty,
    glitches,
    bodyChars: bodyText.length,
    url: location.href,
  };
})()`;

// --- tiny CDP client over the global WebSocket (Node 22+) ---
async function pickTarget() {
  const list = await (await fetch(CDP_URL + '/json/list')).json();
  const t = list.find((x) => x.type === 'page' && /trydemigod\.com/.test(x.url))
    || list.find((x) => x.type === 'page' && !/webflow|grok/.test(x.url));
  if (!t) throw new Error('no usable page target on ' + CDP_URL);
  return t;
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

const target = await pickTarget();
const c = connect(target.webSocketDebuggerUrl);
await c.ready;
await c.send('Page.enable'); await c.send('Runtime.enable');
const results = [];
for (const [name, url] of FUNNEL) {
  await c.send('Page.navigate', { url });
  await c.onceEvent('Page.loadEventFired', 12000);
  await sleep(3000); // let foot-core render (it rewrites the page async)
  const r = await c.send('Runtime.evaluate', { expression: AUDIT_FN, returnByValue: true, awaitPromise: true });
  results.push({ name, ...(r.result?.result?.value || { error: r.result?.exceptionDetails?.text || 'eval failed' }) });
}
c.ws.close();
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), target: target.url, results }, null, 2));
