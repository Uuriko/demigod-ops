#!/usr/bin/env node
/** Shared Webflow Designer, screenshot, and audit-state helpers. */
import fs from 'fs';
import path from 'path';
import { ROOT, sleep, connectBrowser } from './collab-lib.mjs';

export { ROOT, sleep };

const STATE_PATH = path.join(ROOT, 'DEMIGOD-LOOP-STATE.json');
const WATCHER_LOG = path.join(ROOT, 'demigod-watcher.log');
const SHOTS_WEBFLOW = path.join(ROOT, 'audit-shots/webflow');
const SHOTS_CURSOR = path.join(ROOT, 'audit-shots/cursor');

export function wlog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(WATCHER_LOG, `${line}\n`); } catch (_) { /* ignore */ }
}

export function loadDemigodState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch (_) { return {}; }
}

export function saveDemigodState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export const WEBFLOW_DESIGNER_URL =
  'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';
const WEBFLOW_MIN_VIEWPORT = 900;

async function ensureWebflowDesignerWide(page, opts = {}) {
  if (!page) return { ok: false, reason: 'no page' };
  const windowWidth = opts.windowWidth ?? 1600;
  const windowHeight = opts.windowHeight ?? 1000;
  const viewportWidth = opts.viewportWidth ?? 1440;
  const viewportHeight = opts.viewportHeight ?? 900;
  const minWidth = opts.minWidth ?? WEBFLOW_MIN_VIEWPORT;

  await page.bringToFront();
  const before = await page.evaluate((min) => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    tooSmall: /browser is too small|at least 900px/i.test(document.body?.innerText || ''),
    needsResize: window.innerWidth < min,
  }), minWidth);

  let windowResized = false;
  try {
    const session = await page.target().createCDPSession();
    const { windowId } = await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds', {
      windowId,
      bounds: { width: windowWidth, height: windowHeight, windowState: 'normal' },
    });
    windowResized = true;
  } catch (error) {
    wlog(`ensureWebflowDesignerWide: setWindowBounds failed — ${error.message || error}`);
  }

  await page.setViewport({ width: viewportWidth, height: viewportHeight });

  if (before.needsResize || before.tooSmall || windowResized) {
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(4500);
    } catch (error) {
      wlog(`ensureWebflowDesignerWide: reload failed — ${error.message || error}`);
      await sleep(1500);
    }
  } else {
    await sleep(800);
  }

  const after = await page.evaluate((min) => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    tooSmall: /browser is too small|at least 900px/i.test(document.body?.innerText || ''),
    ok: window.innerWidth >= min &&
      !/browser is too small/i.test(document.body?.innerText || ''),
  }), minWidth);

  return { ...after, before, windowResized };
}

async function findWebflowPage(browser) {
  return (await browser.pages())
    .find((page) => page.url().includes('talentlink-sf.design.webflow.com'));
}

async function findCursorPage(browser) {
  const pages = await browser.pages();
  return pages.find((page) => /cursor\.com\/agents\/bc-/.test(page.url()))
    || pages.find((page) => page.url().includes('cursor.com/agents'));
}

export async function prepareWebflowDesigner(browser, opts = {}) {
  const designerUrl = opts.url || WEBFLOW_DESIGNER_URL;
  let page = await findWebflowPage(browser);
  if (!page) {
    page = await browser.newPage();
    await page.goto(designerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(4000);
  } else {
    await page.bringToFront();
    if (!page.url().includes('design.webflow.com')) {
      await page.goto(designerUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(4000);
    }
  }
  const resize = await ensureWebflowDesignerWide(page, opts);
  return { page, resize };
}

export async function captureDemigodScreenshots(label = 'snap') {
  fs.mkdirSync(SHOTS_WEBFLOW, { recursive: true });
  fs.mkdirSync(SHOTS_CURSOR, { recursive: true });
  const browser = await connectBrowser();
  const timestamp = stamp();
  const out = { webflow: null, cursor: null, at: new Date().toISOString(), label };

  const webflow = await findWebflowPage(browser);
  if (webflow) {
    await webflow.bringToFront();
    await webflow.setViewport({ width: 1440, height: 900 });
    await sleep(800);
    out.webflow = path.join(SHOTS_WEBFLOW, `${label}-${timestamp}.png`);
    await webflow.screenshot({ path: out.webflow, fullPage: false });
  }

  const cursor = await findCursorPage(browser);
  if (cursor) {
    await cursor.bringToFront();
    await sleep(500);
    out.cursor = path.join(SHOTS_CURSOR, `${label}-${timestamp}.png`);
    await cursor.screenshot({ path: out.cursor, fullPage: false });
  }

  await browser.disconnect();
  wlog(`screenshots ${label}: webflow=${!!out.webflow} cursor=${!!out.cursor}`);
  return out;
}
