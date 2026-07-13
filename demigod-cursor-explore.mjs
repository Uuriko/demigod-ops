#!/usr/bin/env node
/** Exhaustive cursor.com dashboard exploration for Demigod config planning. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'CURSOR-DEMIGOD-EXPLORE.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'cursor-explore');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const PAGES = [
  { id: 'agents', url: 'https://cursor.com/agents' },
  { id: 'dashboard', url: 'https://cursor.com/dashboard' },
  { id: 'cloud-agents', url: 'https://cursor.com/dashboard/cloud-agents' },
  { id: 'settings', url: 'https://cursor.com/dashboard/settings' },
  { id: 'integrations', url: 'https://cursor.com/dashboard/integrations' },
  { id: 'plugins', url: 'https://cursor.com/dashboard/plugins' },
  { id: 'bugbot', url: 'https://cursor.com/dashboard/bugbot' },
  { id: 'automations', url: 'https://cursor.com/automations' },
  { id: 'docs', url: 'https://cursor.com/docs' },
  { id: 'marketplace', url: 'https://cursor.com/marketplace' },
];

function extractLinks(text) {
  return [...new Set((text.match(/https?:\/\/[^\s)]+/g) || []))].slice(0, 40);
}

function navItems(text) {
  const items = [
    'Overview', 'Settings', 'Cloud Agents', 'Bugbot', 'Security Agents', 'Approval Agents',
    'Plugins', 'Integrations', 'API Keys', 'Shared Canvases', 'Members', 'Usage', 'Spending',
    'Billing', 'Automations', 'Marketplace', 'Docs',
  ];
  return items.filter((i) => text.includes(i));
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const localConfig = {
    cliConfig: JSON.parse(fs.readFileSync(path.join(ROOT, '.cursor/cli-config.json'), 'utf8')),
    mcp: JSON.parse(fs.readFileSync(path.join(ROOT, '.cursor/mcp.json'), 'utf8')),
    rules: fs.readdirSync(path.join(ROOT, '.cursor/rules')).filter((f) => f.endsWith('.mdc')),
    hooks: fs.existsSync(path.join(ROOT, '.cursor/hooks.json')),
    skills: fs.readdirSync(path.join(ROOT, '.cursor/skills-cursor')).filter((d) => {
      try { return fs.statSync(path.join(ROOT, '.cursor/skills-cursor', d)).isDirectory(); } catch { return false; }
    }),
    cursorAgentCli: fs.existsSync(path.join(ROOT, '.local/share/cursor-agent/versions')),
    appImage: fs.existsSync(path.join(ROOT, 'Downloads/Cursor-3.7.36-x86_64.AppImage')),
  };

  const explored = [];
  for (const p of PAGES) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 90000 });
      await sleep(2500);
      const body = await page.evaluate(() => document.body?.innerText || '');
      const title = await page.title();
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map((a) => ({ text: (a.textContent || '').trim().slice(0, 60), href: a.href })).slice(0, 80));
      const shot = path.join(SHOTS, `${p.id}-${stamp()}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      explored.push({
        id: p.id,
        url: page.url(),
        title,
        navVisible: navItems(body),
        bodyLen: body.length,
        excerpt: body.slice(0, 2500),
        linkCount: hrefs.length,
        links: hrefs.slice(0, 30),
        screenshot: shot,
        loginRequired: /sign in|log in|continue with google/i.test(body) && body.length < 800,
      });
    } catch (e) {
      explored.push({ id: p.id, url: p.url, error: String(e.message || e) });
    }
  }

  await browser.disconnect();

  const out = {
    at: new Date().toISOString(),
    localConfig,
    explored,
    demigodRelevant: {
      webflowMcp: localConfig.mcp.mcpServers?.webflow,
      chromeDevtoolsMcp: localConfig.mcp.mcpServers?.['chrome-devtools'],
      demigodRule: localConfig.rules.includes('demigod.mdc'),
      approvalMode: localConfig.cliConfig.approvalMode,
      sandbox: localConfig.cliConfig.sandbox?.mode,
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: true, pages: explored.length, out: OUT }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });