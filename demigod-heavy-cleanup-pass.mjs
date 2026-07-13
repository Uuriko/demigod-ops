#!/usr/bin/env node
/** Heavy verdict cleanup: Webflow canvas DELETE + page SEO + publish + verify. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import {
  ROOT,
  wlog,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  captureDemigodScreenshots,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-HEAVY-CLEANUP.json');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-COPY-SPEC.json'), 'utf8'));

const PROMPT = `HEAVY CLEANUP PASS — trydemigod.com home page ONLY. Permanent DELETE from canvas (not hide).

DELETE entire sections/elements containing:
1. Mythic/legacy: HERMES, PANTHEON, DIVINE, SYNDICATE, SUMMON, FORGE, ELITE SYNDICATE, demigod.ai, THE COVENANT, AI AGENTS
2. Subscription pricing card: SYNDICATE SUBSCRIPTION, $5K/MO, CHOOSE SUBSCRIPTION, MOST POPULAR, PLUS 10% COMMISSION
3. Bloat: METHODOLOGY, CURATED INSIGHTS, HIRING MADE SIMPLE, GET IN TOUCH, FAQ accordion, ATHENA, HEPHAESTUS
4. Footer mega-nav columns (Company/Services/Resources/Legal grids, social icons, Get started, dead # links) — keep only logo area minimal
5. Tally embed divs: #tally-startup-embed, #tally-engineer-embed
6. Orphan forms outside modals: Email Form, Test Form
7. Hidden modal fields: team-size, urgency, hiring-model, availability, Source, Years Experience dropdown
8. Hero junk: LAT. 37.7749 coords, SF // CA, old "Two buttons" placeholder text
9. Ghost copy in modals: Oops error blocks, Hermes received, Welcome to the pantheon, CALL HAS BEEN HEARD
10. Page custom scripts: remove GSAP, SplitText, ScrollTrigger if attached to page (hero uses CSS only)

FORM FIXES (Designer):
- Startup modal form: rename to startup-hire, data-name startup-hire (not email-form)
- Engineer modal form: id engineer-join, data-name engineer-join
- Delete duplicate hiring-model radios

PAGE SETTINGS (SEO tab):
- Title: ${SPEC.ogTitle}
- Meta description: ${SPEC.metaDescription}
- OG title: ${SPEC.ogTitle}
- OG description: ${SPEC.ogDescription}

KEEP: Hero (HIRE TALENT + JOIN NETWORK), trust block area, single On hire pricing card, both modals with current fields, hello@trydemigod.com, © 2026 Demigod.

Publish to production + staging when done. List every section you deleted.`;

async function sourceLeakCheck() {
  const { html } = await fetchLiveHtml();
  const leaks = ['pantheon', 'SYNDICATE SUBSCRIPTION', 'Hermes received', 'demigod.ai', 'METHODOLOGY', 'tally-startup-embed'];
  const found = leaks.filter((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html));
  return { found, clean: found.length === 0, htmlLen: html.length };
}

async function shotSource(page) {
  const dir = path.join(ROOT, 'audit-shots', 'cleanup');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shot = path.join(dir, `source-view-${stamp}.png`);
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(`view-source:https://www.trydemigod.com/?v=cleanup-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  return shot;
}

async function main() {
  wlog('=== HEAVY CLEANUP PASS START ===');
  const result = { at: new Date().toISOString(), steps: [] };

  const submit = await submitWebflowAiPrompt(PROMPT);
  result.steps.push({ step: 'webflow-ai-submit', ...submit });
  if (!submit.ok) {
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ ok: false, reason: submit.reason, out: OUT }));
    process.exit(1);
  }

  const wait = await waitWebflowTurnComplete(420000, submit.beforeTail || '');
  result.steps.push({ step: 'webflow-ai-wait', ...wait });

  const shots = await captureDemigodScreenshots('heavy-cleanup');
  result.screenshots = shots;

  const leaksBefore = await sourceLeakCheck();
  result.sourceBefore = leaksBefore;

  // Re-publish custom code (head meta already has Heavy spec)
  const { spawnSync } = await import('child_process');
  const pub = spawnSync('node', ['demigod-fix-custom-code.mjs'], { cwd: ROOT, encoding: 'utf8' });
  result.steps.push({ step: 'custom-code-publish', code: pub.status, stdout: (pub.stdout || '').slice(-400) });

  await new Promise((r) => setTimeout(r, 8000));
  const leaksAfter = await sourceLeakCheck();
  result.sourceAfter = leaksAfter;

  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  result.sourceScreenshot = await shotSource(page);
  await page.close().catch(() => {});
  await browser.disconnect();

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;

  const formTest = spawnSync('node', ['demigod-form-submit-test.mjs'], { cwd: ROOT, encoding: 'utf8' });
  result.formTestExit = formTest.status;
  try {
    result.formTest = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-FORM-SUBMIT-TEST.json'), 'utf8'));
  } catch (_) { /* ignore */ }

  result.pass = wait.ok && leaksAfter.clean && verify.status === 0;
  result.verdict = result.pass ? 'CANVAS + REPO CLEAN PASS + SHIP READY' : 'PARTIAL — see steps';
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    ok: result.pass,
    verdict: result.verdict,
    webflowAi: wait.ok,
    leaksAfter: leaksAfter.found,
    verify: verify.status,
    formTest: formTest.status,
    out: OUT,
  }));
  wlog('=== HEAVY CLEANUP PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });