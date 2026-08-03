/** CDP playtest helpers — always close game tabs; open fresh pages. */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';

const PLAYTEST_URL_RE = /127\.0\.0\.1:8765|localhost:8765|eat-the-sounds\.html/;

export async function connectPlaytestBrowser(opts = {}) {
  return puppeteer.connect({
    browserURL: CDP_URL,
    protocolTimeout: opts.protocolTimeout ?? 300000,
  });
}

export async function closeStalePlaytestTabs(browser) {
  const pages = await browser.pages();
  let closed = 0;
  for (const p of pages) {
    try {
      if (p.isClosed?.()) continue;
      const url = p.url();
      if (PLAYTEST_URL_RE.test(url)) {
        await p.close();
        closed++;
      }
    } catch (_) { /* tab already gone */ }
  }
  return closed;
}

/** Close leftover game tabs, then open a new one. */
export async function openFreshPlaytestPage(browser) {
  await closeStalePlaytestTabs(browser);
  return browser.newPage();
}

export async function closePlaytestPage(page) {
  if (!page) return;
  try {
    if (!page.isClosed?.()) await page.close();
  } catch (_) { /* already closed */ }
}

export async function withPlaytestBrowser(fn, opts = {}) {
  const browser = await connectPlaytestBrowser(opts);
  let page = null;
  try {
    page = await openFreshPlaytestPage(browser);
    return await fn(browser, page);
  } finally {
    await closePlaytestPage(page);
    await closeStalePlaytestTabs(browser);
    await browser.disconnect();
  }
}