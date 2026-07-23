#!/usr/bin/env node
/** Master-only pass: Navigation + Footer masters + form settings via CDP + Webflow AI. Requires --apply. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser } from './collab-lib.mjs';
import { closeExtraTabs } from './cdp-close-tabs.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  captureDemigodScreenshots,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-MASTER-ONLY.json');
const NAV_CTA = 'FIND TALENT';
const APPLY = process.argv.includes('--apply');

if (process.argv.includes('--policy') || !APPLY) {
  fs.writeFileSync(1, JSON.stringify({ apply: APPLY, externalWrites: APPLY, requiredFlag: '--apply' }) + '\n');
  process.exit(APPLY ? 0 : 2);
}

const AI_PROMPT = `MASTER-ONLY PASS — Demigod. Do NOT touch hero copy or pricing body.

VIEWPORT 1440px+. Publish when done.

1) NAVIGATION MASTER (double-click Navigation on canvas → Edit master):
- Nav button text: FIND TALENT (NOT HIRE TALENT) → link #startup-modal
- DELETE nav links: SOLUTIONS, ABOUT, BLOG, SUPPORT and all dropdowns
- Keep logo "Demigod" only + optional How it Works + Pricing anchors
- Update all instances → save master

2) FOOTER MASTER (double-click Footer → Edit master):
- DELETE Company/Services/Resources/Legal columns, social icons, fake phone/address
- KEEP: hello@trydemigod.com + "© 2026 Demigod. All rights reserved." + tagline
- Replace any TalentLink SF with Demigod
- Update all instances → save master

3) FORM SETTINGS (Site Settings → Forms + each modal form):
- Startup modal form: name startup-hire (unique, NOT email-form), notify hello@trydemigod.com
- Candidate modal form: name engineer-join (unique, NOT email-form)
- Fields: linkedin-url, github-url, is-engineer checkbox, portfolio-url optional
- DELETE dashboard orphan forms: Email Form, Test Form

Do NOT change hero HIRE TALENT or JOIN NETWORK buttons. List every change.`;

async function openNavigator(page) {
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('z');
  await sleep(1200);
}

async function clickMaster(page, name) {
  await openNavigator(page);
  return page.evaluate((masterName) => {
    const item = [...document.querySelectorAll('*')].find(
      (b) => (b.textContent || '').trim() === masterName && b.children.length <= 3,
    );
    item?.click();
    const open = [...document.querySelectorAll('button,a,div,span')].find((b) =>
      /^(open component|edit master|edit component)$/i.test((b.textContent || '').trim()),
    );
    open?.click();
    return { clicked: !!item, opened: !!open };
  }, name);
}

async function exitMaster(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a,div,span')].find((b) =>
      /update all/i.test((b.textContent || '').trim()),
    )?.click();
  });
  await sleep(1500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a,div')].find((b) =>
      /done editing|exit master|back to page/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(800);
}

function patchNavDoc(doc, cta) {
  const changes = [];
  for (const a of [...doc.querySelectorAll('nav a,.w-nav a,.w-nav-menu a,a.button.on-inverse')]) {
    const lbl = a.querySelector('.button_label,.btn-label') || a;
    const t = (lbl.textContent || '').trim();
    if (a.closest('nav,.w-nav,.w-nav-menu,.nav_container') && /^HIRE TALENT$/i.test(t)) {
      lbl.textContent = cta;
      a.setAttribute('href', '#startup-modal');
      changes.push('nav-find-talent');
    }
    if (/^(POST A JOB|GET STARTED)$/i.test(t) && a.closest('nav,.w-nav')) {
      lbl.textContent = cta;
      a.setAttribute('href', '#startup-modal');
      changes.push('nav-cta');
    }
    const linkT = (a.textContent || '').trim();
    if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test(linkT)) {
      (a.closest('li,.w-dropdown,.w-dropdown-toggle,div') || a).remove();
      changes.push(`rm:${linkT}`);
    }
  }
  return changes;
}

function patchFooterDoc(doc) {
  const changes = [];
  for (const col of [...doc.querySelectorAll('footer nav, footer ul, footer .w-col, footer section, footer div')]) {
    const t = col.textContent || '';
    if (t.length < 8 || t.length > 8000) continue;
    if (/Company|Services|Resources|Legal|Facebook|Instagram|YouTube|415-555|101 Web Lane/i.test(t)
      && !/hello@trydemigod|© 2026/i.test(t)) {
      col.remove();
      changes.push('rm-footer-col');
    }
  }
  for (const g of [...doc.querySelectorAll('footer .footer_icon-group, footer [class*="social"]')]) {
    g.remove();
    changes.push('rm-social');
  }
  const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const v = n.nodeValue || '';
    if (/TalentLink SF/i.test(v)) { n.nodeValue = v.replace(/TalentLink SF/gi, 'Demigod'); changes.push('brand'); }
    if (/©\s*2025/i.test(v)) { n.nodeValue = '© 2026 Demigod. All rights reserved.'; changes.push('year'); }
  }
  return changes;
}

async function patchAllIframes(page, kind) {
  return page.evaluate(({ kind, cta }) => {
    const patchNav = (doc) => {
      const changes = [];
      for (const a of [...doc.querySelectorAll('nav a,.w-nav a,.w-nav-menu a,a.button.on-inverse')]) {
        const lbl = a.querySelector('.button_label,.btn-label') || a;
        const t = (lbl.textContent || '').trim();
        if (a.closest('nav,.w-nav,.w-nav-menu,.nav_container') && /^HIRE TALENT$/i.test(t)) {
          lbl.textContent = cta;
          a.setAttribute('href', '#startup-modal');
          changes.push('nav-find-talent');
        }
        const linkT = (a.textContent || '').trim();
        if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test(linkT)) {
          (a.closest('li,.w-dropdown,div') || a).remove();
          changes.push(`rm:${linkT}`);
        }
      }
      return changes;
    };
    const patchFoot = (doc) => {
      const changes = [];
      for (const col of [...doc.querySelectorAll('footer nav, footer ul, footer .w-col, footer section')]) {
        const t = col.textContent || '';
        if (t.length < 8 || t.length > 8000) continue;
        if (/Company|Services|Resources|Legal/i.test(t) && !/hello@trydemigod/i.test(t)) {
          col.remove();
          changes.push('rm-footer-col');
        }
      }
      return changes;
    };
    const all = [];
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const doc = iframe.contentDocument;
        if (!doc) continue;
        all.push(...(kind === 'nav' ? patchNav(doc) : patchFoot(doc)));
      } catch (_) { /* ignore */ }
    }
    return { ok: all.length > 0, changes: [...new Set(all)] };
  }, { kind, cta: NAV_CTA });
}

async function savePublish(page) {
  assertNotFrozen('master-only-pass');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1000);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) =>
      /publish to selected|publish site|publish now/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(12000);
}

async function sourceAudit() {
  const { html } = await fetchLiveHtml(true);
  return {
    hireTalent: (html.match(/HIRE TALENT/gi) || []).length,
    findTalent: (html.match(/FIND TALENT/gi) || []).length,
    emailForm: (html.match(/data-name="email-form"/gi) || []).length,
    solutions: /SOLUTIONS/i.test(html),
    talentLink: /TalentLink/i.test(html),
    footerCols: /Company|Services|Resources|Legal/i.test(html),
    startupHire: /data-name="startup-hire"|name="startup-hire"/i.test(html),
    engineerJoin: /data-name="engineer-join"|name="engineer-join"/i.test(html),
  };
}

async function main() {
  wlog('=== MASTER ONLY PASS START ===');
  await closeExtraTabs();
  const result = { at: new Date().toISOString(), steps: [] };
  result.before = await sourceAudit();

  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  result.resize = resize;

  const navEnter = await clickMaster(page, 'Navigation');
  await sleep(2000);
  const navPatch = await patchAllIframes(page, 'nav');
  result.nav = { enter: navEnter, patch: navPatch };
  wlog(`nav: ${JSON.stringify(result.nav)}`);
  await captureDemigodScreenshots('master-nav');
  await exitMaster(page);

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(800);

  const footEnter = await clickMaster(page, 'Footer');
  await sleep(2000);
  const footPatch = await patchAllIframes(page, 'footer');
  result.footer = { enter: footEnter, patch: footPatch };
  wlog(`footer: ${JSON.stringify(result.footer)}`);
  await captureDemigodScreenshots('master-footer');
  await exitMaster(page);

  await savePublish(page);
  result.publishedCdp = true;

  const ai = await submitWebflowAiPrompt(AI_PROMPT);
  result.steps.push({ step: 'webflow-ai', ...ai });
  if (ai.ok) {
    const wait = await waitWebflowTurnComplete(420000, ai.beforeTail || '');
    result.steps.push({ step: 'webflow-ai-wait', ...wait });
    if (wait.ok) {
      const b2 = await connectBrowser();
      const { page: p2 } = await prepareWebflowDesigner(b2);
      await clickMaster(p2, 'Navigation');
      await sleep(1500);
      await patchAllIframes(p2, 'nav');
      await exitMaster(p2);
      await clickMaster(p2, 'Footer');
      await sleep(1500);
      await patchAllIframes(p2, 'footer');
      await exitMaster(p2);
      await savePublish(p2);
      result.publishedAi = true;
      await b2.disconnect();
      await sleep(12000);
    }
  }

  await browser.disconnect();

  spawnSync('npm', ['run', 'demigod:cleanup:tabs'], { cwd: ROOT, encoding: 'utf8' });
  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;
  result.after = await sourceAudit();
  result.screenshots = await captureDemigodScreenshots('master-only');
  result.pass = result.verifyExit === 0
    && (result.after.findTalent >= 1 || result.nav.patch?.ok)
    && result.after.hireTalent <= 2;

  const human = [];
  if (result.after.emailForm > 0) {
    human.push('Designer → Site Settings → Forms: rename startup/jobseeker forms; delete orphan Email Form + Test Form');
  }
  if (result.after.solutions) {
    human.push('Navigation master: manually delete SOLUTIONS/ABOUT/BLOG/SUPPORT if still visible after publish');
  }
  if (result.after.findTalent < 1) {
    human.push('Navigation master: change nav CTA button to FIND TALENT (hero keeps HIRE TALENT)');
  }
  if (result.after.footerCols) {
    human.push('Footer master: delete Company/Services/Resources/Legal columns manually');
  }
  human.push('Incognito: submit startup + candidate modals; confirm hello@trydemigod.com receives fields');
  result.humanTasks = human;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(ROOT, 'DEMIGOD-HUMAN-ACTIONS.json'), JSON.stringify({
    at: new Date().toISOString(),
    source: 'demigod-master-only-pass',
    tasks: human.map((t, i) => ({ id: i + 1, task: t, status: 'pending' })),
  }, null, 2));

  console.log(JSON.stringify({
    ok: result.pass,
    before: result.before,
    after: result.after,
    humanTasks: human,
    out: OUT,
  }));
  wlog('=== MASTER ONLY PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
