#!/usr/bin/env node
/**
 * Capture design-lab variants via CDP Chrome (:9223).
 *   node design-lab/capture.mjs --variant V1
 *   node design-lab/capture.mjs --all
 * Out: design-lab/out/{id}-desktop.png, -mobile.png, -meta.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAB = path.join(ROOT, 'design-lab');
const OUT = path.join(LAB, 'out');
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const PORT = Number(process.env.DESIGN_LAB_PORT || 8766);

const VARIANTS = {
  V1: 'V1-operator-calm.html',
  V2: 'V2-signal-split.html',
  V7: 'V7-one-screen.html',
  TWODOORS: 'V-codex-two-doors.html',
};

const args = process.argv.slice(2);
const all = args.includes('--all');
const vIdx = args.indexOf('--variant');
const only = vIdx >= 0 ? args[vIdx + 1] : null;

function listTargets() {
  if (all || !only) return Object.keys(VARIANTS);
  if (!VARIANTS[only]) {
    console.error('unknown variant', only, 'known', Object.keys(VARIANTS));
    process.exit(1);
  }
  return [only];
}

async function cdpList() {
  const r = await fetch(`${CDP}/json/list`);
  return r.json();
}

async function openUrl(url) {
  const enc = encodeURIComponent(url);
  let r = await fetch(`${CDP}/json/new?${enc}`, { method: 'PUT' }).catch(() => null);
  if (!r || !r.ok) r = await fetch(`${CDP}/json/new?${enc}`);
  return r.json();
}

async function withPage(url, fn) {
  const page = await openUrl(url);
  const wsUrl = page.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error('no ws for page');
  // Prefer playwright if available
  try {
    const { default: pw } = await import('playwright');
    const browser = await pw.chromium.connectOverCDP(CDP);
    const context = browser.contexts()[0] || (await browser.newContext());
    const p = context.pages().find((x) => x.url().includes(url.split('/').pop())) || (await context.newPage());
    await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const result = await fn(p);
    await browser.close().catch(() => {});
    return result;
  } catch (e) {
    // screenshot via chrome-headless-shell style: use Page.captureScreenshot over raw WS is heavy;
    // fall back: tell caller to use chromium
    throw new Error(`playwright CDP capture failed: ${e.message}`);
  }
}

async function ensureServer() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/V1-operator-calm.html`, { signal: AbortSignal.timeout(800) });
    if (r.ok) return;
  } catch { /* start */ }
  const child = spawnSync(
    'bash',
    ['-c', `cd "${LAB}" && python3 -m http.server ${PORT} >/tmp/dg-busy/design-lab-http.log 2>&1 & echo $!`],
    { encoding: 'utf8' },
  );
  const pid = (child.stdout || '').trim();
  fs.mkdirSync('/tmp/dg-busy', { recursive: true });
  fs.writeFileSync('/tmp/dg-busy/design-lab-http.pid', pid + '\n');
  await new Promise((r) => setTimeout(r, 600));
}

async function captureOne(id) {
  const file = VARIANTS[id];
  const url = `http://127.0.0.1:${PORT}/${file}`;
  const { chromium } = await import('playwright');
  // Headless launch is reliable; CDP connect hung under tab load.
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const meta = { id, file, url, at: new Date().toISOString(), shots: {} };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const desk = path.join(OUT, `${id}-desktop.png`);
  await page.screenshot({ path: desk, fullPage: false });
  meta.shots.desktop = desk;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const mob = path.join(OUT, `${id}-mobile.png`);
  await page.screenshot({ path: mob, fullPage: false });
  meta.shots.mobile = mob;

  // extract text for scoring aids
  meta.text = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.innerText || '',
    bodySnippet: (document.body?.innerText || '').slice(0, 500),
  }));

  fs.writeFileSync(path.join(OUT, `${id}-meta.json`), JSON.stringify(meta, null, 2));
  await browser.close().catch(() => {});
  console.log(JSON.stringify({ ok: true, id, desk, mob }));
  return meta;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await ensureServer();
  const ids = listTargets();
  const results = [];
  for (const id of ids) {
    results.push(await captureOne(id));
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
