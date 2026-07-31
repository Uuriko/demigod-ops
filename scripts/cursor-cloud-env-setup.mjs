#!/usr/bin/env node
/** Automate Cloud Agents env + default repo toward eat-the-sounds via CDP. */
import fs from 'fs';
import path from 'path';
import {
  connectPlaytestBrowser,
  openFreshPlaytestPage,
  closePlaytestPage,
  closeStalePlaytestTabs,
} from '../playtest-browser.mjs';

const OUT = '/home/potter/CURSOR-CLOUD-ENV-SETUP.json';
const SHOT = '/home/potter/audit-shots/cursor';
const TARGET = 'eat-the-sounds';

fs.mkdirSync(SHOT, { recursive: true });

const browser = await connectPlaytestBrowser({ protocolTimeout: 120000 });
const page = await openFreshPlaytestPage(browser);
const report = { at: new Date().toISOString(), steps: [], screenshots: [] };

async function shot(label) {
  const p = path.join(SHOT, `env-${label}.png`);
  await page.screenshot({ path: p, fullPage: false });
  report.screenshots.push({ label, path: p });
  return p;
}

async function bodySnippet() {
  return page.evaluate(() => (document.body?.innerText || '').slice(0, 2500));
}

try {
  report.steps.push({ step: 'goto-cloud-agents', url: 'https://cursor.com/dashboard/cloud-agents' });
  await page.goto('https://cursor.com/dashboard/cloud-agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 3000));
  await shot('01-cloud-agents');

  const defaults = await page.evaluate(() => {
    const hits = [...document.querySelectorAll('button, a, [role="button"], label, span, div')]
      .filter((el) => /default repository|repository|eat-the-sounds|crispy-garbanzo/i.test(el.innerText || ''))
      .map((el) => ({ tag: el.tagName, text: (el.innerText || '').trim().slice(0, 80) }))
      .slice(0, 15);
    return hits;
  });
  report.steps.push({ step: 'defaults-scan', hits: defaults });

  // Try New environment
  const clickedNew = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a, [role="button"]')]
      .find((el) => /^new$/i.test((el.innerText || '').trim()) || /new environment/i.test(el.innerText || ''));
    if (btn) { btn.click(); return btn.innerText?.trim(); }
    return null;
  });
  report.steps.push({ step: 'click-new-env', clicked: clickedNew });
  await new Promise((r) => setTimeout(r, 2500));
  await shot('02-new-env-modal');

  const repoPick = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('label, button, div, li, [role="option"], [role="checkbox"]')];
    const row = rows.find((el) => /^Uuriko\/eat-the-sounds$/i.test((el.innerText || '').trim()));
    if (row) {
      const input = row.querySelector('input[type="checkbox"]') || row;
      input.click();
      return 'clicked-eat-the-sounds-row';
    }
    const cb = [...document.querySelectorAll('input[type="checkbox"]')].find((el) => {
      const label = el.closest('label')?.innerText || el.parentElement?.innerText || '';
      return /eat-the-sounds/i.test(label);
    });
    if (cb) { cb.click(); return 'clicked-checkbox'; }
    return null;
  });
  report.steps.push({ step: 'pick-repo', result: repoPick });
  await new Promise((r) => setTimeout(r, 1500));
  await shot('03-repo-picked');

  const cont = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => /^Continue$/i.test((b.innerText || '').trim()));
    if (btn && !btn.disabled) { btn.click(); return btn.innerText?.trim(); }
    return { disabled: btn?.disabled ?? true, text: btn?.innerText?.trim() };
  });
  report.steps.push({ step: 'continue-env', result: cont });
  await new Promise((r) => setTimeout(r, 5000));
  await shot('04-after-continue');

  // Defaults: switch default repository
  await page.goto('https://cursor.com/dashboard/cloud-agents', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2500));
  const defaultRepo = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('button, [role="button"], div, span')];
    const repoBtn = blocks.find((el) => /Uuriko\/crispy-garbanzo/i.test(el.innerText || ''));
    if (repoBtn) { repoBtn.click(); return 'opened-repo-dropdown'; }
    return null;
  });
  report.steps.push({ step: 'open-default-repo', result: defaultRepo });
  await new Promise((r) => setTimeout(r, 1200));
  await page.keyboard.type('eat-the-sounds', { delay: 40 });
  await new Promise((r) => setTimeout(r, 800));
  const pickDefault = await page.evaluate(() => {
    const opt = [...document.querySelectorAll('button, [role="option"], div, li, span')]
      .find((el) => /eat-the-sounds/i.test((el.innerText || '').trim()));
    if (opt) { opt.click(); return (opt.innerText || '').trim().slice(0, 60); }
    return null;
  });
  report.steps.push({ step: 'pick-default-repo', result: pickDefault });
  await new Promise((r) => setTimeout(r, 2000));
  await shot('05-default-repo');

  report.bodySnippet = await bodySnippet();
  report.manualRemaining = [];
  if (!/eat-the-sounds/i.test(report.bodySnippet)) {
    report.manualRemaining.push('Select Uuriko/eat-the-sounds in default repo or env scope manually');
  }
  if (/setting up|loading/i.test(report.bodySnippet)) {
    report.manualRemaining.push('Wait for environment setup agent, then click Save');
  }
} catch (e) {
  report.error = String(e.message || e);
  await shot('error').catch(() => {});
} finally {
  await closePlaytestPage(page);
  await closeStalePlaytestTabs(browser);
  await browser.disconnect();
}

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));