#!/usr/bin/env node
/** Full source-truth ship: Webflow AI → wait → canvas patch → publish → verify metrics. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-WEBFLOW-AI-SHIP.json');

const AI_PROMPT = `SOURCE TRUTH SHIP — Demigod talentlink-sf. Make permanent model changes then PUBLISH.

FORMS (startup modal):
- Form name/data-name: startup-hire (NOT email-form)
- Remove mailto action — Webflow native POST only
- Delete Company Name field
- Notify hello@trydemigod.com

NAVIGATION MASTER:
- Delete SOLUTIONS dropdown + ABOUT/BLOG/SUPPORT links
- Nav CTA button: FIND TALENT → #startup-modal
- Keep hero HIRE TALENT + JOIN NETWORK unchanged

FOOTER MASTER:
- Delete Company/Services/Resources/Legal columns + all social icons
- Keep: tagline + hello@trydemigod.com + © 2026 Demigod

CANVAS: Delete METHODOLOGY, CURATED INSIGHTS, orphan forms if any.

PUBLISH to www.trydemigod.com AND talentlink-sf.webflow.io. List every change.`;

function metrics(html) {
  return {
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
    findTalent: (html.match(/FIND TALENT/gi) || []).length,
    solutions: (html.match(/<div>Solutions<\/div>/gi) || []).length,
    footerCols: /heading_xxsmall[^>]*>Company</i.test(html) ? 1 : 0,
    mailto: (html.match(/action=["']mailto:/gi) || []).length,
    methodology: /THE METHODOLOGY|METHODOLOGY 0/i.test(html) ? 1 : 0,
  };
}

async function openAiPanel(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].forEach((b) => {
      const a = b.getAttribute('aria-label') || '';
      if (/close|dismiss/i.test(a) && b.closest('[role="dialog"]')) b.click();
    });
  });
  await sleep(500);
  const r = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') || '').trim() === 'AI Assistant',
    );
    if (btn) { btn.click(); return { ok: true }; }
    return { ok: false, labels: [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')).filter(Boolean).slice(0, 15) };
  });
  await sleep(3000);
  const tas = await page.evaluate(() =>
    [...document.querySelectorAll('textarea')].map((t) => ({ ph: t.placeholder, disabled: t.disabled })),
  );
  return { ...r, textareas: tas };
}

async function submitAi(page, prompt) {
  return page.evaluate((text) => {
    const ta = [...document.querySelectorAll('textarea')].find((t) =>
      /what would you like/i.test(t.placeholder || ''),
    );
    if (!ta || ta.disabled) return { ok: false, reason: ta ? 'disabled' : 'no textarea' };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    const submit = [...document.querySelectorAll('button')].find((b) =>
      /^submit$/i.test((b.textContent || '').trim()) && !b.disabled,
    );
    if (submit) { submit.click(); return { ok: true, submitted: true }; }
    return { ok: true, submitted: false };
  }, prompt);
}

async function reliablePublish(page) {
  assertNotFrozen('webflow-ai-ship');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2000);
  const pub = await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /^publish$/i.test((x.textContent || '').trim()));
    return b || null;
  }, { timeout: 20000 });
  await (await pub.asElement()).click();
  await sleep(4000);
  await page.evaluate(() => {
    for (const btn of [...document.querySelectorAll('button,div,span')]) {
      if (/^select all$/i.test((btn.textContent || '').trim())) { btn.click(); break; }
    }
  });
  await sleep(1500);
  const confirm = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /publish to selected domains|publish site|publish now/i.test(b.textContent || ''),
    );
    if (!btn) return { ok: false };
    btn.click();
    return { ok: true };
  });
  let published = false;
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    const st = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      return {
        ago: body.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '',
        publishing: /publishing/i.test(body),
      };
    });
    if (st.ago && !st.publishing) { published = true; break; }
  }
  return { confirm, published };
}

async function main() {
  wlog('=== WEBFLOW AI SHIP START ===');
  const result = { at: new Date().toISOString(), steps: [] };
  result.before = metrics((await fetchLiveHtml()).html);

  const aiSub = await submitWebflowAiPrompt(AI_PROMPT);
  result.steps.push({ step: 'submit-ai', ...aiSub });
  wlog(`submit-ai: ${JSON.stringify(aiSub)}`);
  if (aiSub.ok) {
    const wait = await waitWebflowTurnComplete(600000, aiSub.beforeTail || '');
    result.steps.push({ step: 'ai-wait', ok: wait.ok, tail: (wait.tail || '').slice(-600) });
    wlog(`ai-wait ok=${wait.ok}`);
  }

  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 600000 });
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(1000);

  const pub = await reliablePublish(page);
  result.steps.push({ step: 'publish', ...pub });
  wlog(`publish: ${JSON.stringify(pub)}`);

  await browser.disconnect();
  await sleep(20000);

  result.after = metrics((await fetchLiveHtml()).html);
  result.pass = result.after.emailForm === 0 && result.after.findTalent >= 1 && result.after.footerCols === 0;

  spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  spawnSync('npm', ['run', 'demigod:capture:audit'], { cwd: ROOT, encoding: 'utf8' });

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  wlog('=== WEBFLOW AI SHIP END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
