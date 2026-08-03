#!/usr/bin/env node
/** Full Cursor exploration via CDP — tabs, agents, dashboard, env, settings */
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { CDP_URL } from './cdp-config.mjs';
import { GAME_ROOT } from './game-root.mjs';

const OUT = '/home/potter/CURSOR-EXPLORE-REPORT.json';
const MD = '/home/potter/CURSOR-EXPLORE-REPORT.md';
const SHOT_DIR = '/home/potter/audit-shots/cursor';

fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
const pages = await browser.pages();

const report = {
  at: new Date().toISOString(),
  tabs: [],
  pages: {},
  local: {},
  issues: [],
  recommendations: [],
};

for (const p of pages) {
  report.tabs.push({ url: p.url(), title: await p.title().catch(() => '') });
}

async function explorePage(page, label, url) {
  try {
    if (url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    const data = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      const buttons = [...document.querySelectorAll('button, a[href], [role="button"]')]
        .map((el) => ({
          tag: el.tagName,
          text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 80),
          href: el.getAttribute('href') || '',
          visible: el.offsetParent !== null,
        }))
        .filter((b) => b.text && b.visible)
        .slice(0, 60);
      const inputs = [...document.querySelectorAll('textarea, input, select, [contenteditable="true"]')]
        .map((el) => ({
          tag: el.tagName,
          type: el.type || '',
          placeholder: (el.placeholder || el.getAttribute('aria-label') || '').slice(0, 80),
          visible: el.offsetParent !== null,
        }))
        .filter((i) => i.visible)
        .slice(0, 20);
      const nav = [...document.querySelectorAll('nav a, aside a, [role="navigation"] a')]
        .map((a) => ({ text: (a.innerText || '').trim().slice(0, 50), href: a.getAttribute('href') || '' }))
        .filter((n) => n.text)
        .slice(0, 30);
      const crash = /something went wrong|try again/i.test(body);
      const repos = body.match(/Uuriko\/[\w-]+|crispy-garbanzo|eat-the-sounds/g) || [];
      return {
        title: document.title,
        url: location.href,
        bodyLen: body.length,
        snippet: body.slice(0, 3500),
        buttons,
        inputs,
        nav,
        crash,
        repos: [...new Set(repos)],
        hasComposer: /Ask Cursor to build|fix bugs|explore/i.test(body),
        hasAgents: /agent|GPT-5|Auto/i.test(body),
        usageLimit: /usage limits|running on auto/i.test(body),
      };
    });
    const shot = path.join(SHOT_DIR, `${label}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    report.pages[label] = { ...data, screenshot: shot };
    return data;
  } catch (e) {
    report.pages[label] = { error: String(e.message || e) };
    report.issues.push(`${label}: ${e.message}`);
    return null;
  }
}

let page = pages.find((p) => p.url().includes('cursor.com')) || await browser.newPage();

const routes = [
  ['agents', 'https://cursor.com/agents'],
  ['dashboard', 'https://cursor.com/dashboard'],
  ['cloud-agents', 'https://cursor.com/dashboard/cloud-agents'],
  ['settings', 'https://cursor.com/dashboard/settings'],
  ['integrations', 'https://cursor.com/dashboard/integrations'],
];

for (const [label, url] of routes) {
  await explorePage(page, label, url);
}

// Local config scan
const scanPaths = [
  `${GAME_ROOT}/AGENTS.md`,
  `${GAME_ROOT}/.cursor/mcp.json`,
  `${GAME_ROOT}/.cursor/rules/eat-the-sounds.mdc`,
  `${GAME_ROOT}/.cursor/hooks.json`,
  `${GAME_ROOT}/CURSOR-CLOUD-AGENT.md`,
  `${GAME_ROOT}/package.json`,
  '/home/potter/.cursorignore',
  '/home/potter/CURSOR-SETUP-STATUS.md',
  '/home/potter/launch-cursor-game.sh',
];
for (const p of scanPaths) {
  try {
    const stat = fs.statSync(p);
    report.local[p] = { exists: true, bytes: stat.size, mtime: stat.mtime.toISOString() };
  } catch (_) {
    report.local[p] = { exists: false };
  }
}

// Git remote check
try {
  const gitConfig = fs.readFileSync('/home/potter/eat-the-sounds/.git/config', 'utf8');
  const remotes = [...gitConfig.matchAll(/\[remote "([^"]+)"\][^\[]*url = (.+)/g)]
    .map((m) => ({ name: m[1], url: m[2].trim() }));
  report.local.gitRemotes = remotes;
} catch (_) {
  report.local.gitRemotes = [];
}

// Derive issues
const agents = report.pages.agents;
if (agents?.crash) report.issues.push('Cursor agents page showing crash/try again');
if (agents?.usageLimit) report.issues.push('Cloud agent on Auto due to usage limits');
if (!report.local.gitRemotes?.some((r) => /eat-the-sounds/.test(r.url))) {
  report.issues.push('eat-the-sounds has no GitHub remote — Cloud Agents cannot target it directly');
}
if (!report.local[`${GAME_ROOT}/AGENTS.md`]?.exists) {
  report.issues.push('AGENTS.md missing');
}

if (agents?.repos?.length) {
  report.recommendations.push(`Default cloud repo appears to be: ${agents.repos[0]}`);
}
report.recommendations.push(`Use local Cursor desktop at ${GAME_ROOT} for immediate P0 fixes`);
report.recommendations.push('Set cloud default repo to Uuriko/eat-the-sounds (not crispy-garbanzo)');
report.recommendations.push('Run npm run cursor:loose-ends for unused-feature checklist');
report.recommendations.push('chrome-devtools MCP on port 9223 is configured in project .cursor/mcp.json');

fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

const md = [
  '# Cursor Exploration Report',
  `**Run:** ${report.at}`,
  '',
  '## Open browser tabs',
  ...report.tabs.map((t) => `- ${t.title || '(no title)'} — ${t.url}`),
  '',
  '## Pages explored',
];
for (const [label, data] of Object.entries(report.pages)) {
  md.push(`### ${label}`);
  if (data.error) { md.push(`- ERROR: ${data.error}`); continue; }
  md.push(`- URL: ${data.url}`);
  md.push(`- Crash UI: ${data.crash ? 'YES' : 'no'}`);
  md.push(`- Repos mentioned: ${(data.repos || []).join(', ') || 'none'}`);
  md.push(`- Screenshot: ${data.screenshot}`);
  md.push('');
  md.push('```');
  md.push((data.snippet || '').slice(0, 1200));
  md.push('```');
  md.push('');
}
md.push('## Local config');
for (const [p, info] of Object.entries(report.local)) {
  if (p === 'gitRemotes') {
    md.push(`- **git remotes:** ${info.map((r) => `${r.name}=${r.url}`).join(', ') || 'none'}`);
  } else {
    md.push(`- ${path.basename(p)}: ${info.exists ? `${info.bytes} bytes` : 'MISSING'}`);
  }
}
if (report.issues.length) {
  md.push('', '## Issues');
  report.issues.forEach((i) => md.push(`- ${i}`));
}
if (report.recommendations.length) {
  md.push('', '## Recommendations');
  report.recommendations.forEach((r) => md.push(`- ${r}`));
}

fs.writeFileSync(MD, md.join('\n'));
console.log(md.join('\n'));
console.log('\nWrote', OUT, MD);
await browser.disconnect();