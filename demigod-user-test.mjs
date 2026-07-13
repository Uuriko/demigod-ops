#!/usr/bin/env node
/**
 * Demigod unified user-test harness
 *
 * Suites: site | dash | tools | forms | copy | all
 * Modes:  --quick (skip heavy) · --fix (fail on medium) · --json
 *
 * Uses CDP when available; degrades to HTTP for site/dash probes.
 * Writes /tmp/dg-busy/user-test-latest.json + .md
 *
 *   node demigod-user-test.mjs
 *   node demigod-user-test.mjs --suite site
 *   bin/dg-usertest
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const BUSY = '/tmp/dg-busy';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const DASH = process.env.DEMIGOD_DASH || 'http://127.0.0.1:9878';

const args = new Set(process.argv.slice(2));
const suiteArg = process.argv.includes('--suite')
  ? process.argv[process.argv.indexOf('--suite') + 1]
  : 'all';
const QUICK = args.has('--quick');
const STRICT = args.has('--strict');
const JSON_ONLY = args.has('--json');

const results = [];
const t0 = Date.now();

function check(suite, name, ok, detail = '', severity = 'high') {
  results.push({
    suite,
    name,
    ok: Boolean(ok),
    severity, // critical | high | medium | low
    detail: String(detail ?? '').slice(0, 280),
  });
}

function runNode(scriptArgs, timeout = 90000) {
  const r = spawnSync('node', scriptArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
  return {
    status: r.status ?? 1,
    out: ((r.stdout || '') + (r.stderr || '')).trim(),
    stdout: (r.stdout || '').trim(),
  };
}

async function httpJson(url, opts = {}) {
  const r = await fetch(url, {
    ...opts,
    signal: AbortSignal.timeout(opts.timeout || 12000),
    headers: { 'User-Agent': 'dg-user-test', ...(opts.headers || {}) },
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* */
  }
  return { ok: r.ok, status: r.status, text, json, ms: 0 };
}

async function httpGet(url, timeout = 12000) {
  const t = Date.now();
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'dg-user-test' },
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow',
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text, ms: Date.now() - t, error: null };
  } catch (e) {
    return { ok: false, status: 0, text: '', ms: Date.now() - t, error: String(e.message || e) };
  }
}

// ── CDP helpers ───────────────────────────────────────
async function cdpList() {
  try {
    return await (await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(3000) })).json();
  } catch {
    return null;
  }
}

function cdpConnect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) pending.get(m.id)(m);
  });
  const ready = new Promise((r, j) => {
    ws.once('open', r);
    ws.once('error', j);
  });
  async function send(method, params = {}, timeout = 20000) {
    await ready;
    const i = id++;
    const p = new Promise((resolve, reject) => {
      pending.set(i, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result || {})));
      setTimeout(() => reject(new Error('timeout ' + method)), timeout);
    });
    ws.send(JSON.stringify({ id: i, method, params }));
    return p;
  }
  return { ws, send, close: () => ws.close() };
}

async function withLivePage(fn) {
  const list = await cdpList();
  if (!list) throw new Error('CDP down');
  let tab = list.find((t) => t.type === 'page' && /trydemigod\.com/.test(t.url || '') && !/design/.test(t.url || ''));
  let created = false;
  if (!tab?.webSocketDebuggerUrl) {
    const r = await fetch(`${CDP}/json/new?${encodeURIComponent(LIVE + '/?ut=' + Date.now())}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(8000),
    });
    tab = await r.json();
    created = true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!tab?.webSocketDebuggerUrl) throw new Error('no live tab');
  const session = cdpConnect(tab.webSocketDebuggerUrl);
  try {
    await session.send('Runtime.enable');
    await session.send('Page.enable').catch(() => {});
    return await fn(session, tab);
  } finally {
    session.close();
    if (created && tab.id) {
      try {
        await fetch(`${CDP}/json/close/${tab.id}`, { signal: AbortSignal.timeout(2000) });
      } catch {
        /* */
      }
    }
  }
}

// ── Suites ────────────────────────────────────────────

async function suiteSite() {
  const home = await httpGet(`${LIVE}/?ut=${Date.now()}`);
  check('site', 'home HTTP 200', home.ok && home.status === 200, `status=${home.status} ${home.ms}ms`, 'critical');
  check('site', 'home TTFB < 4s', home.ms < 4000, `${home.ms}ms`, 'medium');
  check('site', 'foot version in HTML', /foot v\d+|__dgFootVer|dgFootVersion/.test(home.text), '', 'high');
  check('site', 'catbox foot script', /files\.catbox\.moe\/[a-z0-9]+\.js/.test(home.text), '', 'high');
  check(
    'site',
    'no banned SLA/48h in raw HTML',
    !/\b48\s*h(?:ours)?\b|\bSLA\b/i.test(home.text.replace(/demigod-copy|policy|no 48/gi, '')),
    '',
    'high',
  );

  // Product pages (JS-loaded on live; static files exist)
  for (const p of ['how', 'hire', 'talent', 'pricing', 'faq']) {
    const u = `${LIVE}/?p=${p}&ut=${Date.now()}`;
    const r = await httpGet(u, 10000);
    check('site', `product ?p=${p} loads shell`, r.ok, `${r.status} ${r.ms}ms`, 'medium');
  }

  // CDP deep checks
  const list = await cdpList();
  check('site', 'CDP available', Boolean(list), list ? `${list.filter((t) => t.type === 'page').length} pages` : 'down', 'high');
  if (!list) return;

  try {
    await withLivePage(async ({ send }) => {
      await send('Page.navigate', { url: `${LIVE}/?ut=${Date.now()}` });
      await new Promise((r) => setTimeout(r, 3500));

      const homeEval = await send('Runtime.evaluate', {
        expression: `(() => {
          const b = getComputedStyle(document.body);
          const h1 = document.querySelector('h1');
          const hr = h1 && h1.getBoundingClientRect();
          const ctas = [...document.querySelectorAll('a.premium-btn, a[data-demigod-modal], #dg-path-pills a')].map((a) => ({
            t: (a.innerText || a.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
            m: a.getAttribute('data-demigod-modal'),
            href: (a.getAttribute('href') || '').slice(0, 60),
          }));
          const foot = window.__dgFootVer || window.dgFootVersion || (document.body.innerText.match(/foot v\\d+/) || [])[0] || null;
          return {
            bodyDisplay: b.display,
            bodyVis: b.visibility,
            h1: h1 ? h1.textContent.trim().slice(0, 100) : null,
            h1w: hr ? Math.round(hr.width) : 0,
            h1h: hr ? Math.round(hr.height) : 0,
            foot,
            ctas,
            hasStartupModal: !!document.querySelector('#startup-modal'),
            hasJobModal: !!document.querySelector('#jobseeker-modal'),
            title: document.title,
          };
        })()`,
        returnByValue: true,
      });
      const h = homeEval.result?.value || {};
      check('site', 'body visible', h.bodyDisplay !== 'none' && h.bodyVis !== 'hidden', `display=${h.bodyDisplay}`, 'critical');
      check('site', 'h1 present with size', Boolean(h.h1 && h.h1w > 40 && h.h1h > 20), `${h.h1} ${h.h1w}x${h.h1h}`, 'critical');
      check('site', 'foot runtime version', Boolean(h.foot), String(h.foot), 'critical');
      check('site', 'startup modal in DOM', h.hasStartupModal, '', 'high');
      check('site', 'jobseeker modal in DOM', h.hasJobModal, '', 'high');

      const hasHire = (h.ctas || []).some((c) => /hiring/i.test(c.t) || c.m === 'startup');
      const hasJob = (h.ctas || []).some((c) => /job|looking/i.test(c.t) || c.m === 'jobseeker');
      check('site', 'hiring path CTA present', hasHire, JSON.stringify(h.ctas).slice(0, 160), 'high');
      check('site', 'job path CTA present', hasJob, JSON.stringify(h.ctas).slice(0, 160), 'high');
      check(
        'site',
        'dual CTAs not both company-side',
        hasHire && hasJob,
        'need startup + jobseeker paths',
        'high',
      );

      // Open WIZ startup — contract matches demigod-agent-smoke.mjs
      await send('Runtime.evaluate', {
        expression: `document.querySelector('a.premium-btn.is-talent,[data-demigod-modal=startup]')?.click(); 'ok'`,
        returnByValue: true,
      });
      await new Promise((r) => setTimeout(r, 1100));
      const wiz = await send('Runtime.evaluate', {
        expression: `(() => {
          const m = document.querySelector('#startup-modal');
          if (!m) return { open: false };
          const vis = [...m.querySelectorAll('.form-field-group,.dg-field-wrap')].filter((el) => {
            const s = getComputedStyle(el);
            return s.display !== 'none' && el.getBoundingClientRect().height > 5;
          }).map((el) => (el.querySelector('[name]') || {}).name || '?');
          const startBtn = [...m.querySelectorAll('button,a')].find((b) =>
            /start|continue|begin|→/i.test(b.textContent || ''),
          );
          return {
            open: getComputedStyle(m).display !== 'none',
            nVis: vis.length,
            visibleFields: vis,
            heads: m.querySelectorAll('.dg-wiz-head').length,
            navs: m.querySelectorAll('.dg-wiz-nav').length,
            q: (m.querySelector('.dg-wiz-q') || {}).textContent || null,
            hasProgress: !!m.querySelector('.dg-wiz-bar'),
            hasStart: !!startBtn,
          };
        })()`,
        returnByValue: true,
      });
      const w = wiz.result?.value || {};
      check('site', 'WIZ startup opens', w.open, JSON.stringify(w).slice(0, 120), 'critical');
      // Welcome: 0 fields OK; residual ≤1 OK (smoke contract)
      check(
        'site',
        'WIZ field chrome OK (nVis≤1 or start CTA)',
        w.open && ((w.nVis != null && w.nVis <= 1) || w.hasStart),
        `nVis=${w.nVis} start=${w.hasStart}`,
        'high',
      );
      check('site', 'WIZ single head + nav', w.heads === 1 && w.navs === 1, `heads=${w.heads} navs=${w.navs}`, 'high');
      check('site', 'WIZ has progress or question', Boolean(w.q || w.hasProgress || w.hasStart), w.q || '', 'medium');

      const reR = await send('Runtime.evaluate', {
        expression: `(() => {
          const counts = [];
          for (let i = 0; i < 3; i++) {
            document.querySelector('[data-demigod-modal=startup]')?.click();
            counts.push(document.querySelectorAll('#startup-modal .dg-wiz-head').length);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
          return counts;
        })()`,
        returnByValue: true,
      });
      const reopen = reR.result?.value || [];
      check(
        'site',
        'WIZ reopen heads === 1 each',
        Array.isArray(reopen) && reopen.length === 3 && reopen.every((n) => n === 1),
        JSON.stringify(reopen),
        'high',
      );

      // Mobile viewport snapshot
      await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      }).catch(() => null);
      await new Promise((r) => setTimeout(r, 400));
      const mob = await send('Runtime.evaluate', {
        expression: `(() => {
          const h1 = document.querySelector('h1');
          const r = h1 && h1.getBoundingClientRect();
          const overflow = document.documentElement.scrollWidth > window.innerWidth + 8;
          return { h1w: r ? Math.round(r.width) : 0, overflow, iw: window.innerWidth };
        })()`,
        returnByValue: true,
      });
      const m = mob.result?.value || {};
      check('site', 'mobile h1 fits width', (m.h1w || 0) > 0 && (m.h1w || 0) <= (m.iw || 390) + 20, `h1w=${m.h1w} iw=${m.iw}`, 'medium');
      check('site', 'mobile no horizontal overflow', !m.overflow, `overflow=${m.overflow}`, 'medium');
      await send('Emulation.clearDeviceMetricsOverride').catch(() => null);
    });
  } catch (e) {
    check('site', 'CDP site session', false, String(e.message || e), 'critical');
  }
}

async function suiteDash() {
  const health = await httpGet(`${DASH}/api/health`, 3000);
  check('dash', 'health up', health.ok, health.text.slice(0, 80), 'critical');
  if (!health.ok) return;

  const t = Date.now();
  const status = await httpGet(`${DASH}/api/status?force=1`, 20000);
  check('dash', 'status 200', status.ok, `${status.ms}ms`, 'critical');
  check('dash', 'status cold < 3s', status.ms < 3000, `${status.ms}ms`, 'medium');
  let d = null;
  try {
    d = JSON.parse(status.text);
  } catch {
    check('dash', 'status JSON', false, 'parse fail', 'critical');
    return;
  }
  check('dash', 'status version ≥3', (d.version || 0) >= 3, `v=${d.version}`, 'high');
  check('dash', 'next contract present', Boolean(d.next), JSON.stringify(d.next).slice(0, 80), 'high');
  check('dash', 'freeze field present', d.freeze != null, '', 'high');
  check('dash', 'brief freeze-first', /## FREEZE/.test(d.agentBriefMarkdown || ''), '', 'high');
  check('dash', 'freshness map', Boolean(d.freshness), '', 'medium');
  check('dash', 'jobQueue map', Boolean(d.jobQueue), '', 'medium');

  const warm = await httpGet(`${DASH}/api/status`, 5000);
  check('dash', 'status warm cache fast', warm.ms < 500, `${warm.ms}ms cached=${JSON.parse(warm.text || '{}').cached}`, 'medium');

  const next = await httpGet(`${DASH}/api/next`, 8000);
  check('dash', '/api/next', next.ok && JSON.parse(next.text || '{}').next !== undefined, '', 'high');

  const tools = await httpGet(`${DASH}/api/tools`, 8000);
  let tj = null;
  try {
    tj = JSON.parse(tools.text);
  } catch {
    /* */
  }
  check('dash', '/api/tools count≥10', tools.ok && (tj?.count || 0) >= 10, `count=${tj?.count}`, 'high');

  // Async job
  const jobStart = Date.now();
  const job = await fetch(`${DASH}/api/jobs?run=tools-registry`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  });
  const jobJ = await job.json();
  check('dash', 'async job returns jobId', job.status === 202 && jobJ.jobId, JSON.stringify(jobJ).slice(0, 100), 'high');
  check('dash', 'async job start < 1s', Date.now() - jobStart < 1000, `${Date.now() - jobStart}ms`, 'medium');
  if (jobJ.jobId) {
    let done = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const p = await httpGet(`${DASH}/api/jobs/${jobJ.jobId}`, 3000);
      try {
        done = JSON.parse(p.text);
      } catch {
        /* */
      }
      if (done?.status === 'done' || done?.status === 'failed') break;
    }
    check('dash', 'job completes', done?.status === 'done' && done?.ok !== false, JSON.stringify(done).slice(0, 100), 'high');
  }

  // Mutate blocked
  const mut = await fetch(`${DASH}/api/jobs?run=foot-cdn`, { method: 'POST', signal: AbortSignal.timeout(4000) });
  const mutJ = await mut.json().catch(() => ({}));
  check('dash', 'mutate blocked without allow', mutJ.ok === false, mutJ.error || '', 'critical');

  // UI HTML
  const ui = await httpGet(`${DASH}/`, 5000);
  check('dash', 'UI HTML 200', ui.ok, '', 'critical');
  check('dash', 'UI has v5 badge or Ops', /v5|Ops|Dashboard/.test(ui.text), '', 'medium');
  check('dash', 'UI Simple mode default', /class="simple"|body class="simple"/.test(ui.text), '', 'medium');
  check('dash', 'UI has Inbox tab', /data-tab="inbox"|panel-inbox|id="inboxRoot"/.test(ui.text), '', 'high');
  check('dash', 'UI has Matches tab', /data-tab="matches"|panel-matches|id="matchesRoot"/.test(ui.text), '', 'high');
  check(
    'dash',
    'UI home is control plane',
    /data-tab="overview"|id="overviewRoot"/.test(ui.text) &&
      (/Control plane|Demigod.*home|mod-grid|health-ring|bin\/dg home/i.test(ui.text) ||
        /plane-hero|Do this next|Modules/i.test(ui.text)),
    '',
    'high',
  );
  check('dash', 'UI no separate Plane tab', !/data-tab="plane"/.test(ui.text), '', 'medium');

  // Submissions inbox API (redacted)
  const inbox = await httpGet(`${DASH}/api/inbox`, 10000);
  let ib = null;
  try {
    ib = JSON.parse(inbox.text);
  } catch {
    /* */
  }
  check('dash', '/api/inbox', inbox.ok && ib && typeof ib.newCount === 'number', `new=${ib?.newCount} total=${ib?.total}`, 'high');
  check(
    'dash',
    'inbox rows redact emails',
    !(ib?.rows || []).some((r) => r.email && /@/.test(r.email) && !/\*\*\*/.test(r.email)),
    'no full emails in rows',
    'high',
  );

  // Match review queue API (pair ledger — not public board)
  const matches = await httpGet(`${DASH}/api/matches`, 10000);
  let mq = null;
  try {
    mq = JSON.parse(matches.text);
  } catch {
    /* */
  }
  check(
    'dash',
    '/api/matches',
    matches.ok && mq && mq.summary && typeof mq.summary.total === 'number',
    `total=${mq?.summary?.total} pairs=${(mq?.pairs || []).length}`,
    'high',
  );
  check('dash', 'matches pairs have pairId', !(mq?.pairs || []).length || (mq.pairs || []).every((p) => p.pairId), '', 'medium');

  // Control plane
  const ctrl = await httpGet(`${DASH}/api/control`, 15000);
  let cp = null;
  try {
    cp = JSON.parse(ctrl.text);
  } catch {
    /* */
  }
  check(
    'dash',
    '/api/control',
    ctrl.ok && cp && cp.modules && cp.spine,
    `health=${cp?.health} mode=${cp?.sessionMode}`,
    'high',
  );
  check('dash', 'control has module order', Array.isArray(cp?.moduleOrder) && cp.moduleOrder.includes('webflow'), '', 'medium');
  check('dash', 'UI consent buttons', /data-consent|data-intro-run/.test(ui.text), '', 'medium');
  // SSE endpoint hello
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`${DASH}/api/events?sse=1`, {
      headers: { Accept: 'text/event-stream' },
      signal: ctrl.signal,
    });
    const reader = r.body?.getReader?.();
    let chunk = '';
    if (reader) {
      const { value } = await reader.read();
      chunk = new TextDecoder().decode(value || new Uint8Array());
      try {
        reader.cancel();
      } catch {
        /* */
      }
    }
    clearTimeout(t);
    check('dash', 'SSE events hello', r.ok && /event:\s*hello|snapshot/.test(chunk), chunk.slice(0, 80), 'medium');
  } catch (e) {
    check('dash', 'SSE events hello', false, String(e.message || e), 'medium');
  }
  // Client JS parse
  const script = (ui.text.match(/<script>([\s\S]*)<\/script>/) || [])[1];
  if (script) {
    try {
      // eslint-disable-next-line no-new-func
      new Function(script);
      check('dash', 'UI client JS parses', true, '', 'critical');
    } catch (e) {
      check('dash', 'UI client JS parses', false, e.message, 'critical');
    }
  } else {
    check('dash', 'UI has script', false, '', 'critical');
  }

  // CDP open dashboard if possible
  if ((await cdpList()) && !QUICK) {
    try {
      const put = await fetch(`${CDP}/json/new?${encodeURIComponent(DASH + '/')}`, {
        method: 'PUT',
        signal: AbortSignal.timeout(5000),
      });
      const tab = await put.json();
      if (tab.webSocketDebuggerUrl) {
        const s = cdpConnect(tab.webSocketDebuggerUrl);
        await s.send('Runtime.enable');
        // Cold status can take ~1s; wait for paint
        let p = {};
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const paint = await s.send('Runtime.evaluate', {
            expression: `(() => {
              const title = document.getElementById('nextTitle');
              const stamp = document.getElementById('stamp');
              const root = document.getElementById('overviewRoot') || document.getElementById('root');
              const t = (title?.textContent || '').trim();
              const stamped = !/^loading/i.test(stamp?.textContent || '');
              const hasContent = (document.body.innerText || '').length > 200 && t && !/^loading/i.test(t);
              return {
                hasNext: !!document.getElementById('nextBar'),
                title: t.slice(0, 60),
                stamp: (stamp?.textContent || '').slice(0, 80),
                bodyTextLen: (document.body.innerText || '').length,
                painted: hasContent && stamped,
              };
            })()`,
            returnByValue: true,
          });
          p = paint.result?.value || {};
          if (p.painted) break;
        }
        check('dash', 'UI paints content', p.painted, JSON.stringify(p).slice(0, 140), 'critical');
        s.close();
        try {
          await fetch(`${CDP}/json/close/${tab.id}`);
        } catch {
          /* */
        }
      }
    } catch (e) {
      check('dash', 'UI CDP paint', false, String(e.message || e), 'medium');
    }
  }
}

async function suiteTools() {
  const cockpit = runNode(['demigod-agent-cockpit.mjs', '--json'], 45000);
  check('tools', 'cockpit exits 0/2', cockpit.status === 0 || cockpit.status === 2, `status=${cockpit.status}`, 'high');
  let cj = null;
  try {
    cj = JSON.parse(cockpit.stdout || cockpit.out.match(/\{[\s\S]*\}/)?.[0] || 'null');
  } catch {
    /* */
  }
  check('tools', 'cockpit has next', Boolean(cj?.next?.cmd || cj?.next?.title), '', 'high');
  check('tools', 'cockpit freeze field', cj?.freeze != null, '', 'medium');

  if (!QUICK) {
    const smoke = runNode(['demigod-agent-smoke.mjs'], 120000);
    check('tools', 'agent-smoke exit 0', smoke.status === 0, smoke.out.slice(0, 100), 'high');
    const smokeJ = (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(BUSY, 'agent-smoke.json'), 'utf8'));
      } catch {
        return null;
      }
    })();
    check('tools', 'agent-smoke corePass', smokeJ?.corePass === true, JSON.stringify(smokeJ?.summary || smokeJ).slice(0, 100), 'high');
  }

  const reg = runNode(['demigod-tools-registry.mjs', '--json'], 15000);
  check('tools', 'registry runs', reg.status === 0, '', 'medium');

  const fix = runNode(['demigod-submit-fixture.mjs'], 30000);
  check('tools', 'submit-fixture pass', fix.status === 0, fix.out.slice(0, 100), 'high');

  if (!QUICK) {
    const st = runNode(['demigod-tools-selftest.mjs'], 180000);
    check('tools', 'tools-selftest pass', st.status === 0, st.out.slice(-120), 'high');
  }

  // Shared lib exports
  try {
    const lib = await import(path.join(ROOT, 'demigod-agent-tools-lib.mjs'));
    check('tools', 'lib isFrozen', typeof lib.isFrozen === 'function', '', 'high');
    check('tools', 'lib gateFreshness', typeof lib.gateFreshness === 'function', '', 'medium');
    const fr = lib.isFrozen();
    check('tools', 'isFrozen shape', typeof fr.on === 'boolean', JSON.stringify(fr).slice(0, 80), 'medium');
  } catch (e) {
    check('tools', 'lib import', false, String(e.message || e), 'high');
  }
}

async function suiteForms() {
  // Unit fixture already in tools; here CDP WIZ advance one step if possible
  const list = await cdpList();
  if (!list) {
    check('forms', 'CDP for forms', false, 'CDP down — skip', 'medium');
    return;
  }
  try {
    await withLivePage(async ({ send }) => {
      await send('Page.navigate', { url: `${LIVE}/?ut=${Date.now()}` });
      await new Promise((r) => setTimeout(r, 3000));
      await send('Runtime.evaluate', {
        expression: `document.querySelector('[data-demigod-modal=startup]')?.click(); 'ok'`,
        returnByValue: true,
      });
      await new Promise((r) => setTimeout(r, 800));

      // Try advance: fill first visible required-ish input and click next
      const step = await send('Runtime.evaluate', {
        expression: `(() => {
          const m = document.querySelector('#startup-modal');
          if (!m) return { err: 'no modal' };
          const welcome = m.querySelector('.dg-wiz-nav button, button.dg-wiz-next, [data-dg-wiz-start]');
          // welcome start
          const start = [...m.querySelectorAll('button, a.premium-btn, .w-button')].find((b) => /start|begin|continue|next|→/i.test(b.textContent || ''));
          if (start) { start.click(); return { action: 'start', t: (start.textContent||'').trim().slice(0,40) }; }
          const input = [...m.querySelectorAll('input,textarea')].find((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.display !== 'none' && r.height > 0 && el.type !== 'hidden';
          });
          if (input) {
            input.focus();
            input.value = input.type === 'email' ? 'usertest@trydemigod.com' : 'User test co';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const next = [...m.querySelectorAll('button')].find((b) => /next|continue|→/i.test(b.textContent || ''));
            if (next) next.click();
            return { action: 'fill', name: input.name };
          }
          return { action: 'none' };
        })()`,
        returnByValue: true,
      });
      const st = step.result?.value || {};
      check('forms', 'WIZ can start/fill first step', st.action === 'start' || st.action === 'fill', JSON.stringify(st), 'high');
      await new Promise((r) => setTimeout(r, 600));
      const after = await send('Runtime.evaluate', {
        expression: `(() => {
          const m = document.querySelector('#startup-modal');
          const q = m && m.querySelector('.dg-wiz-q');
          return { q: q ? q.textContent.trim().slice(0, 60) : null, open: m && getComputedStyle(m).display !== 'none' };
        })()`,
        returnByValue: true,
      });
      const a = after.result?.value || {};
      check('forms', 'WIZ still open after step', a.open, JSON.stringify(a), 'high');
    });
  } catch (e) {
    check('forms', 'forms CDP flow', false, String(e.message || e), 'high');
  }

  // Local fixture suite
  const fix = runNode(['demigod-submit-fixture.mjs'], 30000);
  check('forms', 'submit fixture', fix.status === 0, fix.out.slice(0, 80), 'high');
}

async function suiteCopy() {
  const home = await httpGet(`${LIVE}/`);
  const text = home.text || '';
  // Policy: no founder names in marketing (loose)
  check('copy', 'has dual path language or foot CTAs', /hiring|job|talent|match/i.test(text), '', 'low');
  check('copy', 'hello@ present', /hello@trydemigod\.com/i.test(text), '', 'medium');
  // disk foot COPY
  try {
    const foot = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    check('copy', 'foot has I\'m hiring CTA', /I.?m hiring/.test(foot), '', 'high');
    check('copy', 'foot has Find a job CTA', /Find a job/.test(foot), '', 'high');
    check('copy', 'foot no 48h promise', !/48\s*h(?:our)?\s+(?:response|SLA|guarantee)/i.test(foot), '', 'high');
    check('copy', 'foot pending payments language', /pending/i.test(foot), '', 'medium');
  } catch (e) {
    check('copy', 'read foot-core', false, e.message, 'high');
  }
}

// ── Main ──────────────────────────────────────────────
async function main() {
  fs.mkdirSync(BUSY, { recursive: true });
  const want = suiteArg === 'all' ? ['site', 'dash', 'tools', 'forms', 'copy'] : [suiteArg];

  for (const s of want) {
    try {
      if (s === 'site') await suiteSite();
      else if (s === 'dash') await suiteDash();
      else if (s === 'tools') await suiteTools();
      else if (s === 'forms') await suiteForms();
      else if (s === 'copy') await suiteCopy();
      else check(s, 'unknown suite', false, s, 'critical');
    } catch (e) {
      check(s, 'suite crash', false, String(e.message || e), 'critical');
    }
  }

  const failed = results.filter((r) => !r.ok);
  const critical = failed.filter((r) => r.severity === 'critical');
  const high = failed.filter((r) => r.severity === 'high');
  const pass =
    critical.length === 0 && high.length === 0 && (!STRICT || failed.length === 0);

  const report = {
    at: new Date().toISOString(),
    suite: suiteArg,
    quick: QUICK,
    strict: STRICT,
    ms: Date.now() - t0,
    pass,
    counts: {
      total: results.length,
      ok: results.filter((r) => r.ok).length,
      fail: failed.length,
      critical: critical.length,
      high: high.length,
      medium: failed.filter((r) => r.severity === 'medium').length,
    },
    failed: failed.map((r) => ({ suite: r.suite, name: r.name, severity: r.severity, detail: r.detail })),
    results,
  };

  fs.writeFileSync(path.join(BUSY, 'user-test-latest.json'), JSON.stringify(report, null, 2));
  const md = [
    `# Demigod user-test`,
    `at: ${report.at} · suite=${suiteArg} · ${report.ms}ms · ${pass ? 'PASS' : 'FAIL'}`,
    '',
    `ok ${report.counts.ok}/${report.counts.total} · critical_fail ${report.counts.critical} · high_fail ${report.counts.high}`,
    '',
    failed.length ? '## Failures' : '## All checks passed',
    ...failed.map((f) => `- **[${f.severity}]** ${f.suite}/${f.name} — ${f.detail}`),
    '',
    '## All',
    ...results.map((r) => `- ${r.ok ? '✓' : '✗'} [${r.severity}] ${r.suite}/${r.name}${r.detail ? ' — ' + r.detail : ''}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(BUSY, 'user-test-latest.md'), md);

  if (!JSON_ONLY) {
    console.log(md);
    console.log('wrote /tmp/dg-busy/user-test-latest.json');
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
