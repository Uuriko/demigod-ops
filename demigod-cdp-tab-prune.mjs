#!/usr/bin/env node
/**
 * Prune CDP Chrome tabs to Demigod budget (~6–10).
 * Keeps: 1 live trydemigod, 1 Designer, 1 custom-code, 1 forms, 1 grok.
 * Closes: duplicate live/?cb= shot tabs, extra custom-code, other noise.
 *
 * Usage: node demigod-cdp-tab-prune.mjs
 * Env: CDP_URL=http://127.0.0.1:9223
 */
import http from 'http';
import { URL } from 'url';

const BASE = process.env.CDP_URL || process.env.DEMIGOD_CDP || 'http://127.0.0.1:9223';

function get(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    http
      .get(u, (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            resolve(d);
          }
        });
      })
      .on('error', reject);
  });
}

function cat(url = '') {
  if (/127\.0\.0\.1:9878|localhost:9878/.test(url)) return 'ops-dash';
  if (url.includes('trydemigod.com')) return 'live';
  if (url.includes('design.webflow.com')) return 'designer';
  if (url.includes('custom-code')) return 'custom-code';
  if (url.includes('webflow.com') && url.includes('/forms')) return 'forms';
  if (url.includes('grok.com') || url.includes('x.ai')) return 'grok';
  if (url.includes('webflow.com')) return 'webflow-other';
  return 'other';
}

function liveScore(url = '') {
  const clean = url.replace(/\/$/, '');
  if (clean === 'https://www.trydemigod.com' || clean === 'https://trydemigod.com') return 0;
  if (url.includes('trydemigod.com') && !url.includes('?')) return 1;
  return 2;
}

async function main() {
  const tabs = await get('/json/list');
  const pages = (Array.isArray(tabs) ? tabs : []).filter((t) => t.type === 'page');
  const by = {};
  for (const p of pages) {
    const k = cat(p.url || '');
    (by[k] ||= []).push(p);
  }

  const closed = [];
  async function closeOne(p, reason) {
    try {
      const r = await get(`/json/close/${p.id}`);
      closed.push({ reason, url: (p.url || '').slice(0, 90), ok: true, r });
    } catch (e) {
      closed.push({ reason, url: (p.url || '').slice(0, 90), ok: false, err: String(e) });
    }
  }

  // Keep exactly one of each core role (ops dash counts — agents need :9878)
  for (const key of ['live', 'designer', 'custom-code', 'forms', 'grok', 'ops-dash']) {
    let items = by[key] || [];
    if (key === 'live') items = items.slice().sort((a, b) => liveScore(a.url) - liveScore(b.url));
    if (!items.length) continue;
    for (const p of items.slice(1)) await closeOne(p, `dup-${key}`);
  }
  for (const key of ['webflow-other', 'other']) {
    for (const p of by[key] || []) await closeOne(p, key);
  }

  const after = (await get('/json/list')).filter((t) => t.type === 'page');
  const out = {
    ok: true,
    before: pages.length,
    after: after.length,
    closed: closed.length,
    kept: after.map((p) => ({ cat: cat(p.url), url: (p.url || '').slice(0, 100) })),
    closedDetail: closed,
  };
  console.log(JSON.stringify(out, null, 2));
  return out.after > 12 ? 1 : 0;
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((e) => {
    console.error(JSON.stringify({ ok: false, error: String(e) }));
    process.exit(1);
  });
