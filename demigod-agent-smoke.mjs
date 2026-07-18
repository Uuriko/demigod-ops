#!/usr/bin/env node
/**
 * demigod-agent-smoke.mjs — one-shot live proof for agents
 *
 * Checks: body display, h1 rect, foot version, dual CTAs, WIZ open field count, reopen head count.
 * Writes /tmp/dg-busy/agent-smoke.json + .md
 * Exit 0 only if core pass (body+h1+foot present); wiz quality is reported separately.
 *
 * Soft under freeze: disk≠live → WARN / softDrift / driftExpected — never flips corePass alone.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import WebSocket from 'ws';
import { classifyFootDrift } from './demigod-smoke-policy.mjs';

const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const LIVE = process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
const BUSY = '/tmp/dg-busy';
const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
export { classifyFootDrift } from './demigod-smoke-policy.mjs';

async function getTab() {
  const tabs = await (await fetch(`${CDP}/json/list`)).json();
  let t = tabs.find(
    (x) => (x.url || '').includes('trydemigod.com') && !(x.url || '').includes('design'),
  );
  if (t) return t;
  const ver = await (await fetch(`${CDP}/json/version`)).json();
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    bws.once('open', r);
    bws.once('error', j);
  });
  let id = 1;
  const pending = new Map();
  bws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) pending.get(m.id)(m);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = id++;
      pending.set(i, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result || {})));
      bws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => reject(new Error(method)), 15000);
    });
  const created = await send('Target.createTarget', { url: `${LIVE}/?smoke=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 2500));
  const tabs2 = await (await fetch(`${CDP}/json/list`)).json();
  t = tabs2.find((x) => x.id === created.targetId) || tabs2.find((x) => (x.url || '').includes('trydemigod'));
  bws.close();
  return t;
}

function connect(wsUrl) {
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
  async function send(method, params = {}, timeout = 20000, tries = 2) {
    await ready;
    let lastErr;
    for (let attempt = 0; attempt < tries; attempt++) {
      const i = id++;
      try {
        const p = new Promise((resolve, reject) => {
          pending.set(i, (m) => {
            pending.delete(i); // drop the handler so a late reply can't invoke a settled promise
            if (m.error) reject(new Error(JSON.stringify(m.error)));
            else resolve(m.result || {});
          });
          setTimeout(() => {
            pending.delete(i); // don't leak the stale entry across a retry
            reject(new Error('timeout ' + method));
          }, timeout);
        });
        ws.send(JSON.stringify({ id: i, method, params }));
        return await p;
      } catch (e) {
        lastErr = e;
        // Retry once on a transient CDP timeout (browser load false-fails the smoke); real CDP
        // errors and the final attempt rethrow immediately.
        if (!/^timeout /.test(e.message) || attempt === tries - 1) throw e;
      }
    }
    throw lastErr;
  }
  return { ws, send };
}

async function main() {
  const at = new Date().toISOString();
  let out = { at, pass: false, corePass: false, wizPass: null, error: null };

  try {
    const tab = await getTab();
    if (!tab?.webSocketDebuggerUrl) throw new Error('no CDP live tab');
    const { ws, send } = connect(tab.webSocketDebuggerUrl);
    await send('Runtime.enable');
    await send('Page.navigate', { url: `${LIVE}/?smoke=${Date.now()}` });
    await new Promise((r) => setTimeout(r, 4000));

    const homeR = await send('Runtime.evaluate', {
      expression: `(() => {
        const b = getComputedStyle(document.body);
        const h1 = document.querySelector('h1');
        const hr = h1 && h1.getBoundingClientRect();
        const btns = [...document.querySelectorAll('a.premium-btn,a[data-demigod-modal]')].map((a) => ({
          t: (a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 32),
          m: a.getAttribute('data-demigod-modal'),
        }));
        return {
          foot: window.__dgFootVer || window.dgFootVersion || null,
          bodyDisplay: b.display,
          h1: h1 ? h1.textContent.trim().slice(0, 80) : null,
          h1w: hr ? Math.round(hr.width) : 0,
          h1h: hr ? Math.round(hr.height) : 0,
          ctas: btns,
        };
      })()`,
      returnByValue: true,
    });
    const home = homeR.result?.value || homeR;

    await send(
      'Runtime.evaluate',
      {
        expression: `document.querySelector('a.premium-btn.is-talent,[data-demigod-modal=startup]')?.click(); 'ok'`,
        returnByValue: true,
      },
      20000,
      1, // mutating (click) — do NOT retry: a timeout doesn't cancel the first click (codex 252)
    );
    await new Promise((r) => setTimeout(r, 1000));

    const wizR = await send('Runtime.evaluate', {
      expression: `(() => {
        const m = document.querySelector('#startup-modal');
        if (!m) return { open: false };
        const vis = [...m.querySelectorAll('.form-field-group,.dg-field-wrap')].filter((el) => {
          const s = getComputedStyle(el);
          return s.display !== 'none' && el.getBoundingClientRect().height > 5;
        }).map((el) => (el.querySelector('[name]') || {}).name || '?');
        return {
          open: getComputedStyle(m).display !== 'none',
          q: (m.querySelector('.dg-wiz-q') || {}).textContent || null,
          visibleFields: vis,
          nVis: vis.length,
          heads: m.querySelectorAll('.dg-wiz-head').length,
          navs: m.querySelectorAll('.dg-wiz-nav').length,
        };
      })()`,
      returnByValue: true,
    });
    const wiz = wizR.result?.value || wizR;

    const reR = await send(
      'Runtime.evaluate',
      {
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
      },
      20000,
      1, // mutating (click + dispatch loop) — do NOT retry (non-idempotent, codex 252)
    );
    const reopenHeads = reR.result?.value || reR;

    ws.close();

    const corePass =
      home.bodyDisplay === 'block' &&
      home.h1w > 20 &&
      home.h1h > 20 &&
      !!home.foot;
    const hasHire = (home.ctas || []).some((c) => /hiring/i.test(c.t) || c.m === 'startup');
    const hasJob = (home.ctas || []).some((c) => /job|looking/i.test(c.t) || c.m === 'jobseeker');
    // welcome: prefer 0 fields; allow 1 residual; fail if many
    const wizPass =
      wiz.open &&
      wiz.heads === 1 &&
      wiz.navs === 1 &&
      wiz.nVis <= 1 &&
      Array.isArray(reopenHeads) &&
      reopenHeads.every((n) => n === 1);

    out = {
      at,
      corePass,
      wizPass,
      pass: corePass && wizPass,
      home,
      wiz,
      reopenHeads,
      ctaOk: hasHire && hasJob,
      summary: {
        foot: home.foot,
        body: home.bodyDisplay,
        h1: `${home.h1w}x${home.h1h}`,
        wizVisibleFields: wiz.nVis,
        reopenHeads,
      },
    };
  } catch (e) {
    out.error = String(e.message || e);
    out.pass = false;
    out.corePass = false;
  }

  // Soft disk/live foot report — under freeze, mismatch is WARN not FAIL
  try {
    const diskJs = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
    const diskFootVer = (diskJs.match(/__dgFootVer='(\d+)'/) || [])[1] || null;
    out.diskFootVer = diskFootVer;
    out.liveFootVer = out.summary?.foot || out.home?.foot || null;
    let freezeOn = false;
    try {
      const fz = JSON.parse(fs.readFileSync(path.join(BUSY, 'publish-freeze.json'), 'utf8'));
      freezeOn = Boolean(fz?.on);
    } catch {
      freezeOn = process.env.DEMIGOD_PUBLISH_FREEZE === '1';
    }
    out.freezeOn = freezeOn;
    const drift = classifyFootDrift({
      freezeOn,
      diskVer: diskFootVer,
      liveVer: out.liveFootVer,
    });
    out.footVersionMatch = drift.footVersionMatch;
    out.driftExpected = drift.driftExpected;
    out.softDrift = Boolean(drift.softDrift && out.corePass);
    out.footVersionSeverity = drift.footVersionSeverity;
    out.footVersionNote = drift.note;
    // Never flip corePass / pass false solely due to freeze drift
    if (out.softDrift) {
      out.passReason = 'core-ok-soft-drift-under-freeze';
    }
  } catch (e) {
    out.diskFootVer = null;
  }

  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'agent-smoke.json'), JSON.stringify(out, null, 2));
  const md = [
    `# Agent smoke ${out.at}`,
    `pass: ${out.pass} core: ${out.corePass} wiz: ${out.wizPass} cta: ${out.ctaOk}`,
    out.driftExpected ? `softDrift: disk v${out.diskFootVer} live ${out.liveFootVer} (freeze ON)` : '',
    out.summary ? JSON.stringify(out.summary) : '',
    out.error ? `error: ${out.error}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  fs.writeFileSync(path.join(BUSY, 'agent-smoke.md'), md + '\n');
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.corePass ? 0 : 1);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((e) => {
    console.error(JSON.stringify({ pass: false, error: String(e.message || e) }));
    process.exit(1);
  });
}
