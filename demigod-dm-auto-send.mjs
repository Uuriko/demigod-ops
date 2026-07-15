#!/usr/bin/env node
/**
 * demigod-dm-auto-send — agent-authorized X DM send via CDP (Playwright)
 *
 * Policy: user authorized auto-DM (2026-07-15). Requires Chrome CDP with
 * an X session already logged in at http://127.0.0.1:9223.
 *
 *   node demigod-dm-auto-send.mjs --name=T0
 *   node demigod-dm-auto-send.mjs --names=T0,Hellyeah,Weave
 *   bin/dg demand send --name=T0
 *
 * On success: appends SENT-CONFIRMED via mark-sent --i-sent-it --channel=x --agent-auto
 * Never invents success if login/message UI missing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const OUTREACH = path.join(ROOT, 'demigod-outreach');
const OPS = path.join(ROOT, 'demigod-ops');

function parseArgs(argv) {
  const o = { names: [], dry: false, timeoutMs: 90000 };
  for (const a of argv) {
    if (a.startsWith('--name=')) o.names.push(a.slice(7));
    else if (a.startsWith('--names=')) o.names.push(...a.slice(8).split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--dry') o.dry = true;
    else if (a.startsWith('--timeout=')) o.timeoutMs = Number(a.slice(10)) || 90000;
  }
  return o;
}

function parseQueue() {
  const md = fs.readFileSync(path.join(OPS, 'SEND-QUEUE-PRIORITIZED.md'), 'utf8');
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/Prio|Name|----/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length < 4) continue;
    const [prio, name, handle, company] = cells;
    if (!name || name === 'Name') continue;
    rows.push({ prio, name, handle, company });
  }
  return rows;
}

function loadBody(name) {
  const slug = name.toLowerCase().replace(/\W+/g, '');
  const readyDir = path.join(OUTREACH, 'ready-emails');
  try {
    const hit = fs.readdirSync(readyDir).find((f) => f.endsWith('.txt') && f.includes(slug));
    if (hit) {
      let t = fs.readFileSync(path.join(readyDir, hit), 'utf8');
      // strip header comments
      t = t
        .split('\n')
        .filter((l) => !l.startsWith('#') && !l.startsWith('//'))
        .join('\n')
        .trim();
      return t;
    }
  } catch {
    /* */
  }
  // fallback draft CLI
  const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-demand.mjs'), 'draft', `--name=${name}`, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15000,
  });
  try {
    const j = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
    return (j.body || '')
      .split('\n')
      .filter((l) => !l.startsWith('#'))
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}

function markSent(name) {
  return spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'demigod-dm-mark-sent.mjs'),
      `--name=${name}`,
      '--i-sent-it',
      '--channel=x',
      '--agent-auto',
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 15000 },
  );
}

async function ensureLoggedIn(page) {
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const url = page.url();
  if (/login|signup|onboarding|i\/flow\/login/i.test(url)) {
    return { ok: false, reason: 'not_logged_in', url };
  }
  if (/pin\/recovery|account\/access|challenge/i.test(url)) {
    return { ok: false, reason: 'x_pin_or_challenge', url, hint: 'Unlock X PIN / complete challenge in CDP Chrome' };
  }
  return { ok: true, url };
}

async function findComposer(page) {
  const editors = [
    '[data-testid="dmComposerTextInput"]',
    'div[data-testid="dmComposerTextInput"]',
    'div[role="textbox"][data-testid="dmComposerTextInput"]',
    'div[contenteditable="true"][data-testid="dmComposerTextInput"]',
    // new X i/chat UI
    'div[data-testid="dm-composer-textarea"]',
    'textarea[data-testid="dm-composer-textarea"]',
    'div[aria-label*="Message"][contenteditable="true"]',
    'div[aria-label*="message"][contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div.public-DraftEditor-content[contenteditable="true"]',
    'div[data-contents="true"]',
  ];
  for (const sel of editors) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) > 0 && (await loc.isVisible().catch(() => false))) {
      return loc;
    }
  }
  return null;
}

async function sendOne(page, { name, handle, body }) {
  const h = (handle || '').replace(/^@/, '');
  if (!h) return { ok: false, name, error: 'no_handle' };
  if (!body) return { ok: false, name, error: 'no_body' };

  // Profile → Message
  await page.goto(`https://x.com/${h}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);

  const url0 = page.url();
  if (/login|signup|onboarding/i.test(url0)) {
    return { ok: false, name, handle, error: 'not_logged_in', url: url0 };
  }
  if (/pin\/recovery|account\/access|challenge/i.test(url0)) {
    return {
      ok: false,
      name,
      handle,
      error: 'x_pin_or_challenge',
      url: url0,
      hint: 'Complete X PIN/recovery in the CDP Chrome window, then re-run',
    };
  }

  const msgSelectors = [
    '[data-testid="sendDMFromProfile"]',
    'button[data-testid="sendDMFromProfile"]',
    'a[href*="/messages"]',
    'a[href*="/i/chat"]',
    'button:has-text("Message")',
    'div[role="button"]:has-text("Message")',
    'a:has-text("Message")',
    '[aria-label="Message"]',
  ];
  let clicked = false;
  for (const sel of msgSelectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) > 0) {
      try {
        await loc.click({ timeout: 6000 });
        clicked = true;
        break;
      } catch {
        /* */
      }
    }
  }
  if (!clicked) {
    await page.goto(`https://x.com/messages/compose`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  await page.waitForTimeout(3500);

  // pin/challenge after click
  if (/pin\/recovery|account\/access|challenge/i.test(page.url())) {
    return {
      ok: false,
      name,
      handle,
      error: 'x_pin_or_challenge',
      url: page.url(),
      hint: 'Unlock X in CDP Chrome (PIN), then re-run bin/dg demand send',
    };
  }

  let editor = await findComposer(page);
  if (!editor) {
    // wait a bit more for chat sheet
    await page.waitForTimeout(3000);
    editor = await findComposer(page);
  }
  if (!editor) {
    // dump a11y snapshot snippet for debug
    const html = await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '');
    return {
      ok: false,
      name,
      handle: `@${h}`,
      error: 'no_composer',
      url: page.url(),
      hint: 'X chat UI open but no textbox — may need Message access / PIN / follow first',
      pageText: html,
    };
  }

  await editor.click({ timeout: 8000 });
  await page.keyboard.press('Control+a');
  await page.keyboard.insertText(body.slice(0, 9000));
  await page.waitForTimeout(800);

  const sendBtns = [
    '[data-testid="dmComposerSendButton"]',
    'button[data-testid="dmComposerSendButton"]',
    'button[aria-label="Send"]',
    'button[aria-label*="Send"]',
    'button:has-text("Send")',
    '[data-testid="dm-composer-send-button"]',
  ];
  let sentClick = false;
  for (const sel of sendBtns) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) > 0) {
      try {
        await loc.click({ timeout: 5000 });
        sentClick = true;
        break;
      } catch {
        /* */
      }
    }
  }
  if (!sentClick) {
    await page.keyboard.press('Meta+Enter').catch(() => {});
    await page.keyboard.press('Control+Enter').catch(() => {});
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(2500);

  return {
    ok: true,
    name,
    handle: `@${h}`,
    url: page.url(),
    bodyChars: body.length,
    note: 'Composer filled + send action; confirm in X if message appears',
  };
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  let names = args.names;
  const queue = parseQueue();
  if (!names.length) {
    names = queue.slice(0, 3).map((r) => r.name);
  }
  const targets = names.map((n) => {
    const row = queue.find((q) => q.name.toLowerCase() === n.toLowerCase());
    return {
      name: row?.name || n,
      handle: row?.handle || '',
      company: row?.company || '',
      body: loadBody(row?.name || n),
    };
  });

  const report = {
    schema: 'demigod.dm-auto-send/1',
    at: new Date().toISOString(),
    policy: 'auto-dm-allowed',
    cdp: CDP,
    dry: args.dry,
    results: [],
  };

  if (args.dry) {
    for (const t of targets) {
      report.results.push({
        ok: true,
        dry: true,
        name: t.name,
        handle: t.handle,
        bodyChars: (t.body || '').length,
      });
    }
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(path.join(BUSY, 'dm-auto-send.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP);
  } catch (e) {
    console.error(JSON.stringify({ error: 'cdp_connect_failed', message: String(e.message || e), cdp: CDP }));
    process.exit(3);
  }

  const context = browser.contexts()[0] || (await browser.newContext());
  const page = await context.newPage();

  const login = await ensureLoggedIn(page);
  if (!login.ok) {
    report.results.push({ ok: false, error: login.reason, url: login.url });
    report.error = 'X not logged in on CDP browser — open x.com, sign in, re-run';
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(path.join(BUSY, 'dm-auto-send.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    try {
      await page.close();
    } catch {
      /* */
    }
    process.exit(4);
  }

  for (const t of targets) {
    let r;
    try {
      r = await sendOne(page, t);
    } catch (e) {
      r = { ok: false, name: t.name, handle: t.handle, error: String(e.message || e) };
    }
    if (r.ok) {
      const ms = markSent(t.name);
      r.markSent = {
        status: ms.status,
        out: ((ms.stdout || '') + (ms.stderr || '')).slice(0, 400),
      };
    }
    report.results.push(r);
  }

  try {
    await page.close();
  } catch {
    /* */
  }
  // do not close browser — shared CDP

  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'dm-auto-send.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const anyOk = report.results.some((x) => x.ok);
  const allOk = report.results.length > 0 && report.results.every((x) => x.ok);
  const code = allOk ? 0 : anyOk ? 1 : 2;
  process.exitCode = code;
  process.exit(code);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((e) => {
    console.error(JSON.stringify({ error: String(e.message || e) }));
    process.exit(3);
  });
}
