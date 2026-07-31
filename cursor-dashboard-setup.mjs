#!/usr/bin/env node
/** Explore Cursor dashboard — cloud defaults, drafts, env; document manual steps. */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { CDP_URL } from './cdp-config.mjs';
import {
  connectPlaytestBrowser,
  openFreshPlaytestPage,
  closePlaytestPage,
  closeStalePlaytestTabs,
} from './playtest-browser.mjs';

const OUT_JSON = '/home/potter/CURSOR-DASHBOARD-SETUP.json';
const OUT_MD = '/home/potter/CURSOR-DEFAULT-REPO.md';
const SHOT_DIR = '/home/potter/audit-shots/cursor';

fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await connectPlaytestBrowser({ protocolTimeout: 120000 });
const page = await openFreshPlaytestPage(browser);

const report = {
  at: new Date().toISOString(),
  pages: {},
  drafts: [],
  manualSteps: [],
  automated: [],
};

async function snap(label, url) {
  try {
    if (url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    const data = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      const buttons = [...document.querySelectorAll('button, a, [role="button"]')]
        .map((el) => (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 40);
      const selects = [...document.querySelectorAll('select, [role="combobox"], input[type="search"]')]
        .map((el) => ({
          tag: el.tagName,
          value: el.value || el.getAttribute('aria-label') || '',
          placeholder: el.placeholder || '',
        }))
        .slice(0, 10);
      return {
        title: document.title,
        url: location.href,
        snippet: body.slice(0, 4000),
        buttons,
        selects,
        defaultRepo: (body.match(/Default Repository[\s\S]{0,120}/) || [''])[0],
        defaultModel: (body.match(/Default Model[\s\S]{0,80}/) || [''])[0],
        usageLimit: /usage limits|running on auto/i.test(body),
        repos: [...new Set(body.match(/Uuriko\/[\w-]+|crispy-garbanzo|eat-the-sounds/g) || [])],
        draftCount: (body.match(/\bDraft\b/g) || []).length,
      };
    });
    const shot = path.join(SHOT_DIR, `${label}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    report.pages[label] = { ...data, screenshot: shot };
    return data;
  } catch (e) {
    report.pages[label] = { error: String(e.message || e) };
    return null;
  }
}

try {
  await snap('agents', 'https://cursor.com/agents');
  await snap('cloud-agents', 'https://cursor.com/dashboard/cloud-agents');
  await snap('settings', 'https://cursor.com/dashboard/settings');

  // Try to open default repository control on cloud-agents page
  const repoClick = await page.evaluate(() => {
    const hits = [...document.querySelectorAll('button, a, [role="button"], div, span')]
      .filter((el) => /crispy-garbanzo|default repository|repository/i.test(el.innerText || ''))
      .slice(0, 8)
      .map((el) => (el.innerText || '').trim().slice(0, 60));
    return hits;
  });
  report.automated.push({ action: 'repo_controls_found', hits: repoClick });

  // List sidebar agent rows (drafts)
  const agents = await page.evaluate(() => {
    return [...document.querySelectorAll('[class*="agent"], li, article')]
      .map((el) => (el.innerText || '').trim())
      .filter((t) => t.length > 10 && t.length < 200 && /draft|gpt|crispy|ninjawhee|playtest/i.test(t))
      .slice(0, 20);
  });
  report.drafts = agents;

  report.manualSteps = [
    '1. Dashboard → Cloud Agents → Defaults → Default Repository → select **Uuriko/eat-the-sounds**',
    '2. Cloud Agents → Environments → New → scope **Uuriko/eat-the-sounds** → run setup → Save',
    '3. Agents sidebar → delete or archive stale **Draft** agents (crispy-garbanzo clutter)',
    '4. Settings → Usage → note when agents fall back to **Auto** (weaker model)',
    '5. Desktop: `/home/potter/launch-cursor-game.sh` opens `/home/potter` workspace',
    '6. Before cloud spawn: `npm run sync:github` then push from eat-the-sounds/',
  ];

  if (report.pages['cloud-agents']?.repos?.includes('crispy-garbanzo')) {
    report.manualSteps.unshift('⚠ Default repo still crispy-garbanzo — change in Cloud Agents → Defaults');
  }
} finally {
  await closePlaytestPage(page);
  await closeStalePlaytestTabs(browser);
  await browser.disconnect();
}

const md = [
  '# Cursor Default Repo & Dashboard Setup',
  '',
  `**Audited:** ${report.at}`,
  '',
  '## Manual steps (click in browser)',
  ...report.manualSteps.map((s) => `- ${s}`),
  '',
  '## Current dashboard snapshot',
  ...Object.entries(report.pages).map(([k, v]) => {
    if (v.error) return `### ${k}\n- Error: ${v.error}`;
    return `### ${k}\n- URL: ${v.url}\n- Repos: ${(v.repos || []).join(', ') || 'none'}\n- Usage limit banner: ${v.usageLimit ? 'yes' : 'no'}\n- Draft mentions in page: ${v.draftCount ?? '?'}\n- Screenshot: \`${v.screenshot}\``;
  }),
  '',
  '## Draft agents detected (sidebar text)',
  ...(report.drafts.length ? report.drafts.map((d) => `- ${d.replace(/\s+/g, ' ').slice(0, 120)}`) : ['- (none parsed — check agents.png)']),
  '',
  '## Re-run audit',
  '```bash',
  'npm run cursor:dashboard',
  '```',
];

fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
fs.writeFileSync(OUT_MD, md.join('\n'));
console.log(md.join('\n'));