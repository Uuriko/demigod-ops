#!/usr/bin/env node
/**
 * demigod-webflow-publish-auto.mjs
 * Fully autonomous Webflow custom code publish + verify.
 * Uses current canonicals:
 *   - demigod-head-minimal.html (HEAD)
 *   - demigod-footer-lite.html or xngres CDN loader (FOOTER)
 *
 * Run: node demigod-webflow-publish-auto.mjs
 * Or: ~/bin/dg-auto-publish
 *
 * Requirements:
 *   - ~/launch-chrome-automation.sh has been run (or service)
 *   - Chrome profile has active Webflow login (do this once manually in the automation profile)
 *   - CDP on 9223
 *
 * It will:
 *   - Connect to the running Chrome
 *   - Paste latest HEAD + FOOTER
 *   - Save + Publish (robust button clicking + waits)
 *   - Multiple cache-busted live checks on www.trydemigod.com
 *   - Screenshot key states
 *   - Run source verify at end
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';   // Using Playwright (installed) for superior auto-wait, selectors, reliability on Webflow UI
import { execSync, spawn } from 'child_process';
import { CDP_URL } from './cdp-config.mjs';

const ROOT = '/home/potter';
const HEAD = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const FOOTER_LITE = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const FOOT_CORE = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
const EXPECTED_FOOT_VERSION = (FOOT_CORE.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null;
// For v150 we often use the CDN loader. Prefer the small working one if present.
let FOOTER = FOOTER_LITE;
try {
  const pasteFoot = fs.readFileSync('/tmp/PASTE-FOOTER-ONLY.txt', 'utf8');
  if (pasteFoot.includes('catbox') || pasteFoot.includes('xngres')) FOOTER = pasteFoot;
} catch (_) {}

const SCREENSHOT_DIR = path.join(ROOT, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const DO_PUBLISH = process.argv.includes('--publish');

async function readEditorDoc(editorHandle) {
  return await editorHandle.evaluate((el) => {
    const content = el.classList?.contains('cm-content') ? el : (el.querySelector?.('.cm-content') || el.closest?.('.cm-editor')?.querySelector('.cm-content'));
    const view = content && content.cmView && content.cmView.view;
    if (view && view.state) return view.state.doc.toString();
    return el.innerText || el.textContent || '';
  });
}

function normCode(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

async function ensureCdp() {
  // Auto-start the dedicated automation browser if not running (max autonomy, Fable led)
  const isUp = await fetch(`${CDP_URL}/json/version`).then(r => r.ok).catch(() => false);
  if (!isUp) {
    console.log('CDP not up — launching automation Chrome (persistent profile)...');
    try {
      const { execSync } = await import('child_process');
      execSync('~/launch-chrome-automation.sh', { stdio: 'inherit' });
      await sleep(5000);
    } catch (e) { console.log('Launcher note:', e.message); }
  }
}

async function connect() {
  await ensureCdp();
  for (let i = 0; i < 20; i++) {
    try {
      const browser = await chromium.connectOverCDP(CDP_URL);  // Playwright connect for better reliability
      console.log('Connected to automation browser via Playwright');
      return browser;
    } catch (e) {
      console.log(`Waiting for CDP browser (${i + 1}/20)...`);
      await sleep(2000);
    }
  }
  throw new Error('Could not connect to Chrome CDP. Ensure ~/launch-chrome-automation.sh succeeded and you are logged into Webflow in the automation profile.');
}

async function getOrOpenCustomCodePage(browser) {
  // Playwright connectOverCDP structure: browser.contexts()[0]
  const context = browser.contexts()[0] || await browser.newContext();
  let page = (await context.pages()).find(p => p.url().includes('custom-code') || p.url().includes('webflow.com/dashboard'));
  if (!page) {
    page = await context.newPage();
    await page.goto('https://webflow.com/dashboard/sites/talentlink-sf/custom-code', { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  await page.bringToFront();
  await page.setViewportSize({ width: 1600, height: 1100 });
  await sleep(2000);
  return page;
}

async function findEditor(page, tabName) {
  // Click the tab (Head / Footer) - Playwright style
  await page.evaluate((name) => {
    const els = [...document.querySelectorAll('button, a, [role="tab"], div')];
    const tab = els.find(el => (el.textContent || '').trim().toLowerCase() === name.toLowerCase());
    if (tab) tab.click();
  }, tabName);
  await page.waitForTimeout(1200);

  // Find CodeMirror or contenteditable editor
  const editors = await page.$$('.cm-editor, .cm-content, [contenteditable="true"]');
  if (editors.length === 0) {
    const areas = await page.$$('textarea, [role="textbox"]');
    return areas[tabName.toLowerCase() === 'footer' ? 1 : 0] || null;
  }
  return editors[tabName.toLowerCase() === 'footer' && editors.length > 1 ? 1 : 0] || editors[0];
}

async function clearAndPasteEditor(page, editorHandle, text) {
  if (!editorHandle) throw new Error('No editor handle');

  // Better with Playwright: click + keyboard
  await editorHandle.click({ clickCount: 3 });
  await page.waitForTimeout(200);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.waitForTimeout(150);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);

  // Type the content (Playwright handles large input well; chunk for safety)
  const CHUNK = 1200;
  for (let i = 0; i < text.length; i += CHUNK) {
    await page.keyboard.type(text.slice(i, i + CHUNK), { delay: 5 });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(600);

  // Fable safety: read-back verification (CM virtualizes)
  const back = await readEditorDoc(editorHandle);
  const ok = normCode(back) === normCode(text);
  console.log(`Read-back: ${ok} (back ${back.length} vs expected ${text.length})`);
  if (!ok) {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/readback-mismatch.png` });
    throw new Error('Editor read-back does not match disk — ABORT before save/publish');
  }
}

async function saveAndPublish(page) {
  console.log('Clicking Save...');
  const saveBtn = page.locator('button:has-text("Save")').first();
  if (await saveBtn.count() > 0) {
    await saveBtn.click({ timeout: 5000 }).catch(() => {});
  } else {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const save = btns.find(b => /save/i.test((b.textContent || '').trim()) && !b.disabled);
      if (save) save.click();
    });
  }
  await page.waitForTimeout(4500);

  if (!DO_PUBLISH) {
    console.log('PREPARE MODE (no --publish): pasted + saved + read-back verified. Re-run with --publish for live.');
    return;
  }

  console.log('Clicking Publish...');
  let pubBtn = page.locator('button:has-text("Publish")').first();
  if (await pubBtn.count() === 0) {
    pubBtn = page.locator('button, [role="button"]').filter({ hasText: /publish to|publish site|publish now/i }).first();
  }
  if (await pubBtn.count() > 0) {
    await pubBtn.click({ timeout: 5000 }).catch(() => {});
  } else {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, [role="button"]')];
      let pub = btns.find(b => /^publish$/i.test((b.textContent || '').trim()));
      if (!pub) pub = btns.find(b => /publish to|publish site|publish now/i.test(b.textContent || ''));
      if (pub) pub.click();
    });
  }
  await page.waitForTimeout(3000);

  // Fable scoped confirm (dialog or data attr, not any publish/confirm on page)
  const confirmBtn = page.locator('[role="dialog"] button, [data-automation-id*="publish"] button').filter({ hasText: /^publish/i }).first();
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click({ timeout: 3000 }).catch(() => {});
  }
  await page.waitForTimeout(15000);
  console.log('Publish flow completed (best effort).');
}

async function verifyLive() {
  const ts = Date.now();
  const url = `https://www.trydemigod.com/?cb=${ts}`;
  let html = '';
  try { html = await fetch(url, { cache: 'no-store' }).then(r => r.text()); }
  catch (e) { console.log('Live fetch failed:', e.message); return false; }

  const hasCanonicalHead = /unhide-v5/i.test(html) && /dg-unhide-critical/i.test(html);
  const noLorem = !/lorem ipsum/i.test(html);

  // Require exactly one approved foot loader. Permanent releases use
  // foot-latest.js; hashed Catbox/Gist assets remain supported fallbacks.
  const loaderPattern = /<script\b[^>]*\bsrc=["'](https:\/\/(?:cdn\.jsdelivr\.net\/gh\/[^"']+\/foot-latest\.js(?:[?#][^"']*)?|cdn\.statically\.io\/gh\/[^"']+\/foot-latest\.js(?:[?#][^"']*)?|(?:files|litter)\.catbox\.moe\/[a-z0-9]+\.js(?:[?#][^"']*)?|gist\.githubusercontent\.com\/[^"']+\.js(?:[?#][^"']*)?))["'][^>]*>/gi;
  const loaders = [...html.matchAll(loaderPattern)].map((match) => match[1]);
  let footOk = false, detail = `foot loaders=${loaders.length}`;
  if (loaders.length === 1) {
    try {
      let response = await fetch(loaders[0], { cache: 'no-store', redirect: 'follow' });
      const mime = response.headers.get('content-type') || '';
      if (!/(?:javascript|ecmascript)/i.test(mime)) throw new Error(`non-JavaScript MIME ${mime || 'missing'}`);
      let js = await response.text();
      const inner = js.length < 4000 && js.match(/https:\/\/files\.catbox\.moe\/[^"']+\.js/);
      if (inner) {
        response = await fetch(inner[0], { cache: 'no-store', redirect: 'follow' });
        const innerMime = response.headers.get('content-type') || '';
        if (!/(?:javascript|ecmascript)/i.test(innerMime)) throw new Error(`inner non-JavaScript MIME ${innerMime || 'missing'}`);
        js = await response.text();
      }
      const has90d = /90day-outcome/.test(js);
      const ver = (js.match(/__dgFootVer='(\d+)'/) || [])[1];
      footOk = has90d && Boolean(ver) && ver === EXPECTED_FOOT_VERSION;
      detail = `foot loaders=1 ver=${ver} expected=${EXPECTED_FOOT_VERSION} 90d=${has90d} bytes=${js.length}`;
    } catch (e) { detail = 'CDN fetch failed: ' + e.message; }
  }
  console.log(`Live: headV5=${hasCanonicalHead} noLorem=${noLorem} | ${detail}`);
  return hasCanonicalHead && noLorem && footOk;
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  console.log('Screenshot:', file);
}

async function main() {
  console.log('=== Demigod Autonomous Webflow Publish ===');
  console.log('HEAD length:', HEAD.length);
  console.log('FOOTER length:', FOOTER.length);

  const browser = await connect();
  const page = await getOrOpenCustomCodePage(browser);

  await screenshot(page, 'before');

  // HEAD
  console.log('Pasting HEAD...');
  const headEd = await findEditor(page, 'Head');
  if (headEd) {
    await clearAndPasteEditor(page, headEd, HEAD);
  } else {
    console.warn('Could not find Head editor - manual intervention may be needed');
  }
  await sleep(1000);

  // FOOTER
  console.log('Pasting FOOTER...');
  const footEd = await findEditor(page, 'Footer');
  if (footEd) {
    await clearAndPasteEditor(page, footEd, FOOTER);
  } else {
    console.warn('Could not find Footer editor');
  }

  await screenshot(page, 'pasted');

  await saveAndPublish(page);

  await screenshot(page, 'after-publish');

  console.log('Waiting for propagation...');
  await sleep(8000);

  const liveOk = await verifyLive();

  // Run source verify for good measure
  try {
    console.log('Running source verify...');
    execSync('npm run demigod:verify:source', { stdio: 'inherit' });
  } catch (e) {
    console.log('Source verify had issues (non-fatal for publish)');
  }

  console.log('\n=== RESULT ===');
  console.log(liveOk ? 'LIVE CHECK PASSED (v4 + 90d visible)' : 'LIVE CHECK INCONCLUSIVE - check manually + hard refresh');
  console.log('Screenshots in:', SCREENSHOT_DIR);
  console.log('If still stale, the profile may need a fresh Webflow login in the automation Chrome.');

  // Do not close the browser - it is the user's persistent automation instance
  // Just detach if possible
  try { /* playwright connected browser - leave running */ } catch (_) {}
  process.exit(liveOk ? 0 : 1);
}

main().catch(err => {
  console.error('Automation error:', err);
  process.exit(1);
});

// Fable led addition: direct Playwright launch option for dedicated automation (start from scratch on browser if CDP flaky)
async function launchDirectPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launchPersistentContext('/home/potter/.grok/chrome-automation-playwright', {
    headless: false,
    args: ['--remote-debugging-port=9224']
  });
  console.log('Launched dedicated Playwright browser (persistent)');
  return browser;
}
// Usage: if needed, const pw = await launchDirectPlaywright(); const page = pw.pages()[0] || await pw.newPage();
