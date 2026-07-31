#!/usr/bin/env node
/** Shared helpers — Grok Heavy, Cursor agents, loop state, service checks */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { spawnSync } from 'child_process';
import { CDP_URL } from './cdp-config.mjs';

export const ROOT = '/home/potter';
export const STATE_PATH = path.join(ROOT, 'LOOP-STATE.json');
export const LOG_PATH = path.join(ROOT, 'continuous-loop.log');

export const SYNC_FILES = [
  'ninjawhee-eat-the-sounds.html',
  'overworld.js',
  'pause-journal.js',
  'pixel-gfx.js',
  'game-progress.js',
  'vinyl-audio.js',
  'store-ambient.js',
  'manifest.webmanifest',
  'heavy-dialogue-art.js',
  'new-player-playtest.mjs',
  'audio-audit-playtest.mjs',
  'thorough-playtest.mjs',
  'playtest-browser.mjs',
];

export function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, `${line}\n`); } catch (_) { /* ignore */ }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (_) {
    return {
      cycle: 0,
      phase: 'idle',
      lastRun: null,
      lastPass: null,
      pendingHeavy: false,
      pendingCursor: false,
      errors: [],
    };
  }
}

export function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function ensureHttpServer() {
  try {
    const r = await fetch('http://127.0.0.1:8765/', { signal: AbortSignal.timeout(3000) });
    if (r.ok) return { started: false, ok: true };
  } catch (_) { /* restart below */ }
  const { spawn } = await import('child_process');
  const out = path.join(ROOT, 'http-server.log');
  const child = spawn('python3', ['-m', 'http.server', '8765', '--directory', ROOT], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  fs.writeFileSync(path.join(ROOT, '.http-server.pid'), String(child.pid));
  log(`restarted HTTP server on 8765 (pid ${child.pid})`);
  await sleep(1200);
  try {
    const r = await fetch('http://127.0.0.1:8765/', { signal: AbortSignal.timeout(5000) });
    return { started: true, ok: r.ok, pid: child.pid };
  } catch (e) {
    return { started: true, ok: false, error: String(e.message || e) };
  }
}

export async function ensureServices() {
  await ensureHttpServer();
  const checks = [];
  for (const [name, url] of [
    ['game', 'http://127.0.0.1:8765/ninjawhee-eat-the-sounds.html'],
    ['cdp', `${CDP_URL}/json/version`],
  ]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      checks.push({ name, ok: r.ok, status: r.status });
    } catch (e) {
      checks.push({ name, ok: false, error: String(e.message || e) });
    }
  }
  return checks;
}

export function syncEatTheSounds() {
  const dest = path.join(ROOT, 'eat-the-sounds');
  fs.mkdirSync(dest, { recursive: true });
  for (const f of SYNC_FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dest, f));
  }
}

export async function connectBrowser() {
  return puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 600000, defaultViewport: null });
}

export async function findGrokPage(browser) {
  const pages = await browser.pages();
  return pages.find((p) => p.url().includes('grok.com/c/'))
    || pages.find((p) => p.url().includes('grok.com'));
}

export async function findCursorAgentsPage(browser) {
  const pages = await browser.pages();
  return pages.find((p) => p.url().includes('cursor.com/agents'))
    || pages.find((p) => p.url().includes('cursor.com'));
}

export async function sendToGrok(page, text) {
  await page.bringToFront();
  const sent = await page.evaluate((t) => {
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      el.value = t;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.textContent = t;
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    return true;
  }, text);
  if (!sent) throw new Error('no grok input');
  await page.keyboard.press('Enter');
}

export async function collectGrokReply(page, { waitMs = 90000, minGrowth = 80 } = {}) {
  const before = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('article, [data-testid="message"], .message')];
    const last = nodes.at(-1);
    return (last?.innerText || document.body.innerText).slice(-8000);
  });
  await sleep(waitMs);
  const after = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('article, [data-testid="message"], .message')];
    const last = nodes.at(-1);
    const text = (last?.innerText || document.body.innerText).slice(-12000);
    const thinking = /thinking|Agents thinking/i.test(document.body.innerText);
    return { text, thinking };
  });
  if (after.thinking) return { text: '', thinking: true };
  if (after.text.length < before.length + minGrowth) {
    return { text: after.text, thinking: false, stale: true };
  }
  return { text: after.text, thinking: false, stale: false };
}

const CURSOR_CRASH_RE = /something went wrong|unexpected error|please try again|agent crashed|failed to load/i;

export async function detectCursorCrash(page) {
  return page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const body = document.body?.innerText || '';
    const hasCrashText = re.test(body);
    const tryAgainBtn = [...document.querySelectorAll('button, a, [role="button"]')].find((el) => {
      const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
      return /^try again$/i.test(t) || /^retry$/i.test(t);
    });
    return {
      crashed: hasCrashText || !!tryAgainBtn,
      hasTryAgain: !!tryAgainBtn,
      snippet: body.slice(0, 400),
    };
  }, CURSOR_CRASH_RE.source);
}

export async function clickCursorTryAgain(page, { maxClicks = 3, waitMs = 2500 } = {}) {
  await page.bringToFront();
  let clicks = 0;
  for (let i = 0; i < maxClicks; i++) {
    const state = await detectCursorCrash(page);
    if (!state.hasTryAgain && !state.crashed) {
      return { recovered: clicks > 0, clicks, state };
    }
    const clicked = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')];
      const btn = els.find((el) => {
        const t = (el.innerText || el.getAttribute('aria-label') || '').trim();
        return /^try again$/i.test(t) || /^retry$/i.test(t);
      });
      if (!btn || btn.offsetParent === null) return false;
      btn.click();
      return true;
    });
    if (!clicked) return { recovered: false, clicks, state, error: 'no try again button' };
    clicks++;
    log(`cursor try-again click ${clicks}`);
    await sleep(waitMs);
  }
  const final = await detectCursorCrash(page);
  return { recovered: !final.crashed, clicks, state: final };
}

export async function ensureCursorHealthy(page) {
  const state = await detectCursorCrash(page);
  if (!state.crashed) return { ok: true, recovered: false };
  log(`cursor crash detected — clicking try again`);
  const result = await clickCursorTryAgain(page);
  if (!result.recovered) {
    await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await sleep(3000);
    const retry = await clickCursorTryAgain(page, { maxClicks: 2 });
    return { ok: retry.recovered, recovered: retry.recovered, reload: true, ...retry };
  }
  return { ok: true, recovered: true, ...result };
}

export async function dispatchCursorTask(page, prompt) {
  await ensureCursorHealthy(page);
  await page.bringToFront();
  if (!page.url().includes('cursor.com/agents')) {
    await page.goto('https://cursor.com/agents', { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await sleep(2000);
  }
  const focused = await page.evaluate(() => {
    const form = document.querySelector('form');
    const box = form?.querySelector('textarea, [contenteditable="true"], [role="textbox"]')
      || [...document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')]
        .find((el) => el.offsetParent !== null && !/search/i.test(el.getAttribute('aria-label') || el.placeholder || ''));
    if (!box) return false;
    box.focus();
    box.click();
    return true;
  });
  if (!focused) throw new Error('no cursor composer');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(prompt.slice(0, 3500), { delay: 3 });
  await sleep(500);
  const sent = await page.evaluate(() => {
    const send = [...document.querySelectorAll('button')].find((b) => {
      const label = b.getAttribute('aria-label') || '';
      return /send|submit/i.test(label);
    });
    if (send) { send.click(); return 'clicked'; }
    return 'no-button';
  });
  if (sent === 'no-button') await page.keyboard.press('Enter');
  await sleep(2000);
  await ensureCursorHealthy(page);
  return sent;
}

/** Claude Code CLI integration (installed via https://claude.ai/code ) */

export function hasClaudeCode() {
  try {
    const res = spawnSync('claude', ['--version'], { encoding: 'utf8' });
    return res.status === 0;
  } catch { return false; }
}

export function runClaudeCode(prompt, opts = {}) {
  const args = [];
  if (opts.print !== false) args.push('-p');
  if (opts.model) args.push('--model', opts.model);
  if (opts.print) args.push('--print');
  // non-interactive safe defaults
  args.push('--bare', '--no-session-persistence');
  if (prompt) args.push(prompt);

  const res = spawnSync('claude', args, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
    timeout: opts.timeoutMs || 120000,
    env: { ...process.env, CLAUDE_CODE_SIMPLE: '1' }
  });

  return {
    ok: res.status === 0,
    stdout: res.stdout?.trim() || '',
    stderr: res.stderr?.trim() || '',
    code: res.status
  };
}

export function claudeCodeStatus() {
  const res = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' });
  return res.stdout || res.stderr || 'unknown';
}
