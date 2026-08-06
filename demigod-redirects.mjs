#!/usr/bin/env node
/**
 * List / set Webflow 301 redirects via CDP session on dashboard.
 * Usage:
 *   node demigod-redirects.mjs list
 *   node demigod-redirects.mjs ensure   # product pages from DEMIGOD-PAGES.json
 *   node demigod-redirects.mjs set /path https://target
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const SITE = 'talentlink-sf';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(d); }
      });
    }).on('error', reject);
  });
}

async function connectDashboard() {
  let tabs = await getJson(`${CDP}/json/list`);
  let page = tabs.find((t) => t.type === 'page' && (t.url || '').includes('webflow.com/dashboard'));
  if (!page) {
    await new Promise((resolve, reject) => {
      const req = http.request(
        `${CDP}/json/new?https://webflow.com/dashboard/sites/${SITE}/publishing`,
        { method: 'PUT' },
        (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d)); },
      );
      req.on('error', reject);
      req.end();
    });
    await new Promise((r) => setTimeout(r, 3000));
    tabs = await getJson(`${CDP}/json/list`);
    page = tabs.find((t) => t.type === 'page' && (t.url || '').includes('webflow.com/dashboard'));
  }
  if (!page) throw new Error('no webflow dashboard tab / login');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const call = (method, params = {}) => {
    const i = ++id;
    return new Promise((resolve) => {
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  };
  await call('Runtime.enable');
  return { ws, call };
}

async function evalAsync(call, expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value ?? r.result?.value;
}

async function listRedirects(call) {
  return evalAsync(call, `(async () => {
    const r = await fetch('/api/sites/${SITE}/redirects?page=1&pageSize=100', { credentials: 'include' });
    return await r.json();
  })()`);
}

// Webflow redirect writes need BOTH CSRF headers (X-CSRF alone → 412). Same as demigod-cm6-paste-publish.
function csrfHeadersExpr() {
  return `(() => {
    const csrf = document.querySelector('meta[name="_csrf"]')?.content || '';
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (csrf) { headers['X-CSRF-Token'] = csrf; headers['X-XSRF-TOKEN'] = csrf; }
    return { csrf, headers };
  })()`;
}

async function setRedirect(call, pathName, target) {
  return evalAsync(
    call,
    `(async () => {
      const { csrf, headers } = ${csrfHeadersExpr()};
      const r = await fetch('/api/sites/${SITE}/redirect', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ path: ${JSON.stringify(pathName)}, targetPath: ${JSON.stringify(target)} }),
      });
      const text = await r.text();
      let body; try { body = JSON.parse(text); } catch { body = text; }
      return { status: r.status, body, csrf: Boolean(csrf) };
    })()`,
  );
}

/** Targeted delete by path (UI-equivalent). Prefer this over delete-all. */
async function deleteRedirect(call, pathName) {
  return evalAsync(
    call,
    `(async () => {
      const { csrf, headers } = ${csrfHeadersExpr()};
      const r = await fetch('/api/sites/${SITE}/redirect/delete', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ path: ${JSON.stringify(pathName)} }),
      });
      const text = await r.text();
      let body; try { body = JSON.parse(text); } catch { body = text; }
      return { status: r.status, body, csrf: Boolean(csrf) };
    })()`,
  );
}

async function deleteAllRedirects(call) {
  return evalAsync(
    call,
    `(async () => {
      const { csrf, headers } = ${csrfHeadersExpr()};
      delete headers['Content-Type'];
      const r = await fetch('/api/sites/${SITE}/redirects', { method: 'DELETE', credentials: 'include', headers });
      return { status: r.status, body: (await r.text()).slice(0, 200), csrf: Boolean(csrf) };
    })()`,
  );
}

function productMap() {
  const p = path.join(ROOT, 'DEMIGOD-PAGES.json');
  if (!fs.existsSync(p)) throw new Error('missing DEMIGOD-PAGES.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return j.pages || {};
}

const WRITE_COMMANDS = new Set(['set', 'delete', 'ensure']);

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '-h') {
    console.log('usage: list | set <path> <targetPath> | delete <path> | ensure');
    process.exit(0);
  }
  // set/delete/ensure write durable production site config. Every other Webflow writer
  // (foot-cdn-publish, cm6-paste-publish, board-publish, webhook-setup) already routes through
  // this guard; this one did not, so a redirect could be rewritten with no current-request
  // authorization AND while publish freeze was on — the freeze exists to stop exactly that
  // during an incident. Written config ships on the next publish by anyone, so "it needs a
  // publish to take effect" is not a safety boundary. `list` stays ungated: it is read-only
  // and is how an audit inspects the live config.
  if (WRITE_COMMANDS.has(cmd)) assertNotFrozen(`redirect ${cmd}`);
  const { ws, call } = await connectDashboard();
  try {
    if (cmd === 'list') {
      console.log(JSON.stringify(await listRedirects(call), null, 2));
      return;
    }
    if (cmd === 'delete') {
      if (!a) throw new Error('delete needs path');
      const pathName = a.startsWith('/') ? a : `/${a}`;
      console.log(JSON.stringify(await deleteRedirect(call, pathName), null, 2));
      return;
    }
    if (cmd === 'set') {
      if (!a || !b) throw new Error('set needs path and target');
      const pathName = a.startsWith('/') ? a : `/${a}`;
      // Targeted replace: delete existing then add (UI pattern; no delete-all).
      // Delete may 404/500 when path is absent — still try add.
      const del = await deleteRedirect(call, pathName);
      const add = await setRedirect(call, pathName, b);
      const ok = add.status >= 200 && add.status < 300;
      console.log(JSON.stringify({ path: pathName, target: b, delete: del, add, ok }, null, 2));
      if (!ok) process.exitCode = 1;
      return;
    }
    if (cmd === 'ensure') {
      // Product-page external redirects only — targeted upsert, never delete-all.
      const pages = productMap();
      const want = Object.entries(pages);
      const results = [];
      for (const [slug, url] of want) {
        const src = `/${slug}`;
        const again = await listRedirects(call);
        const have2 = new Map((again.siteRedirects || []).map((r) => [r.source, r.target]));
        if (have2.get(src) === url) {
          results.push({ src, status: 'ok', target: url });
          continue;
        }
        if (have2.has(src)) results.push({ src, action: 'delete', ...(await deleteRedirect(call, src)) });
        const r = await setRedirect(call, src, url);
        results.push({ src, status: r.status, target: url, body: r.body });
      }
      const after = await listRedirects(call);
      console.log(JSON.stringify({ results, count: after.paginationMetadata?.totalCount, redirects: after.siteRedirects }, null, 2));
      return;
    }
    throw new Error(`unknown cmd ${cmd}`);
  } finally {
    ws.close();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
