#!/usr/bin/env node
/**
 * demigod-dm-auto-send — agent-authorized X DM send via CDP (Playwright)
 *
 * STOPPED: auto-DM disabled by user request (2026-07-15).
 * Refuse real sends unless DEMIGOD_ALLOW_AUTO_DM=1 (emergency only).
 * Default: dry/prep only. Human sends DMs; mark-sent after.
 *
 *   node demigod-dm-auto-send.mjs --name=T0 --dry
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
  const o = {
    names: [],
    dry: false,
    timeoutMs: 90000,
    pin: process.env.DEMIGOD_X_PIN || process.env.X_PIN || '',
  };
  for (const a of argv) {
    if (a.startsWith('--name=')) o.names.push(a.slice(7));
    else if (a.startsWith('--names=')) o.names.push(...a.slice(8).split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--dry') o.dry = true;
    else if (a.startsWith('--timeout=')) o.timeoutMs = Number(a.slice(10)) || 90000;
    else if (a.startsWith('--pin=')) o.pin = a.slice(6);
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

/** Enter X chat PIN if on recovery page. PIN from DEMIGOD_X_PIN or --pin= (never log the value). */
async function tryUnlockPin(page, pin) {
  if (!pin) return { ok: false, reason: 'no_pin' };
  const url = page.url();
  if (!/pin\/recovery|passcode|pin/i.test(url) && !(await page.locator('input[type="password"], input[inputmode="numeric"]').count().catch(() => 0))) {
    // may still be a modal
    const hasPinUi = (await page.locator('text=/Enter your PIN|PIN|passcode/i').count().catch(() => 0)) > 0;
    if (!hasPinUi) return { ok: false, reason: 'no_pin_ui', url };
  }

  const inputs = [
    'input[type="password"]',
    'input[inputmode="numeric"]',
    'input[name*="pin" i]',
    'input[autocomplete="one-time-code"]',
    'input[type="tel"]',
    'input[type="text"]',
  ];
  let filled = false;
  for (const sel of inputs) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) === 0) continue;
    if (!(await loc.isVisible().catch(() => false))) continue;
    try {
      await loc.click({ timeout: 3000 });
      await loc.fill('');
      await loc.type(String(pin), { delay: 40 });
      filled = true;
      break;
    } catch {
      /* try next */
    }
  }
  if (!filled) {
    // digit boxes
    const boxes = page.locator('input[maxlength="1"]');
    const n = await boxes.count().catch(() => 0);
    if (n >= 4) {
      const digits = String(pin).slice(0, n);
      for (let i = 0; i < digits.length; i++) {
        await boxes.nth(i).fill(digits[i]);
      }
      filled = true;
    }
  }
  if (!filled) return { ok: false, reason: 'pin_input_not_found', url: page.url() };

  // submit
  const submits = [
    'button:has-text("Confirm")',
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'button:has-text("Unlock")',
    'button:has-text("Submit")',
    'button[type="submit"]',
    '[data-testid="ocfEnterTextNextButton"]',
  ];
  let clicked = false;
  for (const sel of submits) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) > 0 && (await loc.isVisible().catch(() => false))) {
      try {
        await loc.click({ timeout: 4000 });
        clicked = true;
        break;
      } catch {
        /* */
      }
    }
  }
  if (!clicked) await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);
  const after = page.url();
  if (/pin\/recovery|challenge/i.test(after)) {
    return { ok: false, reason: 'pin_still_locked', url: after };
  }
  return { ok: true, url: after };
}

async function ensureLoggedIn(page, pin) {
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  let url = page.url();
  if (/login|signup|onboarding|i\/flow\/login/i.test(url)) {
    return { ok: false, reason: 'not_logged_in', url };
  }
  if (/pin\/recovery|account\/access|challenge/i.test(url)) {
    const u = await tryUnlockPin(page, pin);
    if (!u.ok) {
      return {
        ok: false,
        reason: u.reason || 'x_pin_or_challenge',
        url: u.url || url,
        hint: 'Set DEMIGOD_X_PIN or --pin= and re-run if unlock failed',
      };
    }
    url = page.url();
  }
  // open chat once to clear pin gate early
  await page.goto('https://x.com/i/chat', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (/pin\/recovery/i.test(page.url())) {
    const u = await tryUnlockPin(page, pin);
    if (!u.ok) {
      return { ok: false, reason: u.reason || 'x_pin_or_challenge', url: page.url() };
    }
  }
  return { ok: true, url: page.url() };
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
    const pin = process.env.DEMIGOD_X_PIN || process.env.X_PIN || '';
    const u = await tryUnlockPin(page, pin);
    if (!u.ok) {
      return {
        ok: false,
        name,
        handle,
        error: u.reason || 'x_pin_or_challenge',
        url: u.url || url0,
        hint: 'Complete X PIN in CDP Chrome or pass DEMIGOD_X_PIN',
      };
    }
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
    const pin = process.env.DEMIGOD_X_PIN || process.env.X_PIN || '';
    const u = await tryUnlockPin(page, pin);
    if (!u.ok) {
      return {
        ok: false,
        name,
        handle,
        error: u.reason || 'x_pin_or_challenge',
        url: page.url(),
        hint: 'Unlock X PIN (DEMIGOD_X_PIN) then re-run',
      };
    }
    await page.waitForTimeout(2000);
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
  const allow =
    process.env.DEMIGOD_ALLOW_AUTO_DM === '1' ||
    process.env.DEMIGOD_ALLOW_AUTO_DM === 'true';

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
    policy: allow ? 'auto-dm-opt-in' : 'auto-dm-stopped',
    cdp: CDP,
    dry: args.dry,
    results: [],
  };

  // Hard stop unless dry or explicit env opt-in
  if (!args.dry && !allow) {
    report.error = 'auto_dm_stopped';
    report.hint =
      'User stopped auto-DM. Use bin/dg demand draft --name=… then send yourself. Opt-in only: DEMIGOD_ALLOW_AUTO_DM=1';
    for (const t of targets) {
      report.results.push({
        ok: false,
        name: t.name,
        handle: t.handle,
        error: 'auto_dm_stopped',
        dry: false,
      });
    }
    fs.mkdirSync(BUSY, { recursive: true });
    fs.writeFileSync(path.join(BUSY, 'dm-auto-send.json'), JSON.stringify(report, null, 2));
    console.error(JSON.stringify(report, null, 2));
    process.exit(2);
  }

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

  report.pinProvided = Boolean(args.pin);
  const login = await ensureLoggedIn(page, args.pin);
  if (!login.ok) {
    report.results.push({ ok: false, error: login.reason, url: login.url, hint: login.hint });
    report.error = login.reason === 'not_logged_in'
      ? 'X not logged in on CDP browser — open x.com, sign in, re-run'
      : `X lock: ${login.reason}`;
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
