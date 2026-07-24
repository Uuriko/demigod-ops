#!/usr/bin/env node
/** Heavy 12-step source truth pass: masters + canvas delete + custom code + CDN + verify. */
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

const OUT = path.join(ROOT, 'DEMIGOD-SOURCE-TRUTH.json');
const NAV_CTA = 'FIND TALENT';

const AI_PROMPT = `SOURCE TRUTH PASS — Demigod talentlink-sf. Viewport 1440px+. Publish when done.

1) NAVIGATION MASTER: CTA button text FIND TALENT → #startup-modal. DELETE SOLUTIONS, ABOUT, BLOG, SUPPORT links and dropdowns. Save master + Update all instances.
2) FOOTER MASTER: DELETE Company/Services/Resources/Legal columns + social icons + fake phone/address. KEEP potter@trydemigod.com + © 2026 Demigod + tagline only.
3) CANVAS DELETE (home page): remove METHODOLOGY block, CURATED INSIGHTS, FAQ accordion, ATHENA/HEPHAESTUS pantheon cards, fake contact (415-555), SYNDICATE SUBSCRIPTION pricing card.
4) FORM SETTINGS: startup form data-name startup-hire (NOT email-form). Candidate form data-name engineer-join. Delete orphan Email Form + Test Form in dashboard.
5) Do NOT change hero HIRE TALENT or JOIN NETWORK buttons. List every deletion.`;

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

async function patchAllIframes(page, kind) {
  return page.evaluate(({ kind, cta }) => {
    const patchNav = (doc) => {
      const changes = [];
      for (const a of [...doc.querySelectorAll('nav a,.w-nav a,.w-nav-menu a,a.button.on-inverse')]) {
        const lbl = a.querySelector('.button_label,.btn-label') || a;
        const t = (lbl.textContent || '').trim();
        if (a.closest('nav,.w-nav,.w-nav-menu,.nav_container') && /^(HIRE TALENT|POST A JOB|GET STARTED)$/i.test(t)) {
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
        if (/Company|Services|Resources|Legal|Facebook|Instagram|YouTube|415-555/i.test(t) && !/potter@trydemigod\.com|hello@trydemigod/i.test(t)) {
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

async function patchCanvasDelete(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500) { doc = d; break; }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };

    const changes = [];
    const removeIf = (re, label) => {
      for (const el of [...doc.querySelectorAll('section,div,article')]) {
        const t = (el.textContent || '').trim();
        if (!re.test(t) || t.length < 40 || t.length > 12000) continue;
        if (el.closest('#startup-modal,#jobseeker-modal')) continue;
        if (el.querySelector('#startup-modal,#jobseeker-modal')) continue;
        el.remove();
        changes.push(`del:${label}`);
      }
    };

    removeIf(/THE METHODOLOGY|METHODOLOGY\s*0?1/i, 'methodology');
    removeIf(/CURATED INSIGHTS/i, 'curated');
    removeIf(/HIRING MADE SIMPLE|FREQUENTLY ASKED|CONTACT US/i, 'faq');
    removeIf(/GET IN TOUCH|415-555|101 Web Lane/i, 'fake-contact');
    removeIf(/ATHENA[\s\S]{0,200}HEPHAESTUS|THE PANTHEON OF AGENTS/i, 'pantheon-extra');
    removeIf(/SYNDICATE SUBSCRIPTION|\$5,?000|\$5K\/MO/i, 'old-pricing');

    for (const a of [...doc.querySelectorAll('nav a,.w-nav a')]) {
      const t = (a.textContent || '').trim();
      if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test(t)) {
        (a.closest('li,.w-dropdown,div') || a).remove();
        changes.push(`nav-rm:${t}`);
      }
      if (/^(POST A JOB|HIRE TALENT|GET STARTED)$/i.test(t) && a.closest('nav,.w-nav')) {
        const lbl = a.querySelector('.button_label,.btn-label') || a;
        lbl.textContent = 'FIND TALENT';
        a.setAttribute('href', '#startup-modal');
        changes.push('nav-find-talent');
      }
    }

    const stForm = doc.querySelector('#startup-modal form, #startup-form, #startup-hire');
    if (stForm) {
      stForm.id = 'startup-hire';
      stForm.setAttribute('data-name', 'startup-hire');
      stForm.setAttribute('name', 'startup-hire');
      changes.push('form:startup-hire');
    }
    const enForm = doc.querySelector('#jobseeker-modal form, #jobseeker-form, #engineer-join');
    if (enForm) {
      enForm.id = 'engineer-join';
      enForm.setAttribute('data-name', 'engineer-join');
      enForm.setAttribute('name', 'engineer-join');
      changes.push('form:engineer-join');
    }

    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  });
}

async function savePublish(page) {
  assertNotFrozen('source-truth-pass');
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
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    solutions: /SOLUTIONS/i.test(html),
    talentLink: /TalentLink/i.test(html),
    methodology: /METHODOLOGY/i.test(html),
    athena: /ATHENA/i.test(html),
    syndicate: /SYNDICATE SUBSCRIPTION/i.test(html),
    footerCols: /Company|Services|Resources|Legal/i.test(html),
    startupHire: /data-name=["']startup-hire["']/i.test(html),
    engineerJoin: /data-name=["']engineer-join["']/i.test(html),
    mythic: /Hermes|pantheon|demigod\.ai|ELITE SYNDICATE/i.test(html),
  };
}

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  return { script, status: r.status, stdout: (r.stdout || '').slice(-2000), stderr: (r.stderr || '').slice(-1000) };
}

async function main() {
  wlog('=== SOURCE TRUTH PASS START ===');
  await closeExtraTabs();
  const result = { at: new Date().toISOString(), steps: [] };
  result.before = await sourceAudit();

  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  result.resize = resize;

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(800);

  result.nav = { enter: await clickMaster(page, 'Navigation'), patch: null };
  await sleep(2000);
  result.nav.patch = await patchAllIframes(page, 'nav');
  await exitMaster(page);

  result.footer = { enter: await clickMaster(page, 'Footer'), patch: null };
  await sleep(2000);
  result.footer.patch = await patchAllIframes(page, 'footer');
  await exitMaster(page);

  result.canvas = await patchCanvasDelete(page);
  wlog(`canvas: ${JSON.stringify(result.canvas)}`);
  await captureDemigodScreenshots('source-truth-canvas');

  await savePublish(page);
  result.publishedDesigner = true;

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
      result.canvas2 = await patchCanvasDelete(p2);
      await savePublish(p2);
      result.publishedAi = true;
      await b2.disconnect();
      await sleep(12000);
    }
  }

  await browser.disconnect();

  result.cdn = runNpm('demigod:foot:cdn');
  result.customCode = runNpm('demigod:fix:custom-code');
  spawnSync('npm', ['run', 'demigod:cleanup:tabs'], { cwd: ROOT, encoding: 'utf8' });
  await sleep(8000);

  result.verify = runNpm('demigod:verify:all');
  result.audit = runNpm('demigod:capture:audit');
  result.after = await sourceAudit();

  result.pass = result.verify.status === 0
    && result.after.emailForm === 0
    && result.after.findTalent >= 1
    && !result.after.talentLink
    && !result.after.mythic;

  result.shipReady = result.pass
    && result.after.startupHire
    && result.after.engineerJoin
    && !result.after.methodology
    && !result.after.syndicate;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    shipReady: result.shipReady,
    pass: result.pass,
    before: result.before,
    after: result.after,
    out: OUT,
  }, null, 2));
  wlog('=== SOURCE TRUTH PASS END ===');
  process.exit(result.shipReady ? 0 : result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
