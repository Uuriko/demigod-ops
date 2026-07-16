#!/usr/bin/env node
/** CDP: register Webflow form_submission webhooks → public tunnel URL. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WEBHOOK-SETUP-RESULT.json');
const SITE = 'talentlink-sf';
const SITE_ID = '6a34c484dcedc18a17408187';
const FORMS = [
  { name: 'startup-hire', key: 'startup' },
  { name: 'engineer-join', key: 'engineer' },
];

function resolveWebhookUrl() {
  const env = process.env.DEMIGOD_WEBHOOK_PUBLIC_URL;
  if (env) return { webhookUrl: env.replace(/\/?$/, '/') + (env.endsWith('/') ? '' : ''), source: 'env' };
  const tunnelPath = path.join(ROOT, 'DEMIGOD-TUNNEL.json');
  if (fs.existsSync(tunnelPath)) {
    const t = JSON.parse(fs.readFileSync(tunnelPath, 'utf8'));
    if (t.webhookUrl) return { webhookUrl: t.webhookUrl, source: 'tunnel', tunnelUrl: t.tunnelUrl };
  }
  return { webhookUrl: `http://127.0.0.1:${process.env.DEMIGOD_WEBHOOK_PORT || 9877}/`, source: 'local' };
}

async function clickText(page, pattern) {
  const pos = await page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('button,a,[role="button"],div,span,li,p,label')].find((n) => {
      const t = (n.textContent || '').trim();
      return rx.test(t) && t.length < 90 && n.children.length < 10;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (el.textContent || '').trim().slice(0, 60) };
  }, pattern);
  if (!pos) return null;
  await page.mouse.click(pos.x, pos.y);
  await sleep(1800);
  return pos;
}

async function fillUrl(page, url) {
  return page.evaluate((hook) => {
    const input = [...document.querySelectorAll('input,textarea')].find((i) => {
      const ph = (i.placeholder || i.name || i.getAttribute('aria-label') || i.type || '').toLowerCase();
      const r = i.getBoundingClientRect();
      return r.width > 40 && (/url|webhook|endpoint|hook/i.test(ph) || i.type === 'url');
    });
    if (!input) return false;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, hook);
    else input.value = hook;
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, url);
}

async function tryApiWebhooks(webhookUrl) {
  let token = process.env.WEBFLOW_API_TOKEN || process.env.WEBFLOW_ACCESS_TOKEN || process.env.WEBFLOW_SITE_TOKEN;
  if (!token) {
    try {
      const { resolveWebflowApiToken } = await import('./demigod-webflow-token.mjs');
      token = resolveWebflowApiToken().token;
    } catch (_) { /* ignore */ }
  }
  if (!token) return { ok: false, reason: 'no WEBFLOW_API_TOKEN (set env or ~/.config/demigod/webflow.env)' };

  const results = [];
  for (const form of FORMS) {
    const body = {
      triggerType: 'form_submission',
      url: webhookUrl,
      filter: { name: form.name },
    };
    const res = await fetch(`https://api.webflow.com/v2/sites/${SITE_ID}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch (_) { /* ignore */ }
    results.push({ form: form.name, status: res.status, ok: res.ok, id: json.id, error: json.message });
  }
  return { ok: results.every((r) => r.ok), method: 'api', results };
}

async function tryDashboardCdp(page, webhookUrl) {
  const urls = [
    `https://webflow.com/dashboard/sites/${SITE}/integrations`,
    `https://webflow.com/dashboard/sites/${SITE}/settings/integrations`,
    `https://webflow.com/dashboard/sites/${SITE}/forms`,
    `https://webflow.com/dashboard/sites/${SITE}/settings`,
  ];

  const steps = [];
  for (const u of urls) {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(3000);
    steps.push({ url: u, title: await page.title() });

    await clickText(page, 'Webhooks|Integrations|API');
    await clickText(page, 'Add webhook|Create webhook|New webhook|Connect');
    await clickText(page, 'form_submission|Form submission|Form submissions');

    const filled = await fillUrl(page, webhookUrl);
    if (filled) {
      await clickText(page, '^Save$|^Create$|^Add$|^Connect$|^Done$');
      await sleep(2000);
    }

    const state = await page.evaluate((hook) => ({
      hasUrl: (document.body?.innerText || '').includes(hook.slice(0, 24)),
      snippet: (document.body?.innerText || '').slice(0, 2000),
    }), webhookUrl);
    if (state.hasUrl) return { ok: true, method: 'dashboard', steps, state };
  }
  return { ok: false, method: 'dashboard', steps, reason: 'webhook URL not found in dashboard UI' };
}

async function main() {
  const { webhookUrl, source, tunnelUrl } = resolveWebhookUrl();
  wlog(`webhook setup target: ${webhookUrl} (${source})`);

  const report = {
    at: new Date().toISOString(),
    webhookUrl,
    source,
    tunnelUrl: tunnelUrl || null,
    forms: FORMS,
    attempts: [],
  };

  const api = await tryApiWebhooks(webhookUrl);
  report.attempts.push(api);
  if (api.ok) {
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok: true, method: 'api', webhookUrl, out: OUT }));
    return;
  }

  const browser = await connectBrowser();
  let page = (await browser.pages()).find((p) => /webflow\.com/i.test(p.url()));
  if (!page) {
    page = await browser.newPage();
    await page.goto(`https://webflow.com/dashboard/sites/${SITE}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(3000);
  }
  await page.bringToFront();

  const cdp = await tryDashboardCdp(page, webhookUrl);
  report.attempts.push(cdp);
  await browser.disconnect();

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: cdp.ok, webhookUrl, attempts: report.attempts, out: OUT }));
  if (!cdp.ok && !api.ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });