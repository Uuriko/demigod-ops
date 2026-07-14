#!/usr/bin/env node
/** Create /legal page + Insights CMS via Webflow AI, then publish. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import {
  ROOT,
  sleep,
  wlog,
  prepareWebflowDesigner,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-CMS-LEGAL-PASS.json');

const AI_PROMPT = `DEMIGOD — create Legal page + Insights CMS. PUBLISH when done.

1) NEW PAGE "Legal" slug /legal
- Duplicate homepage structure: Navigation + Footer components only
- Delete hero, pricing, trust, methodology, FAQ, forms from canvas on Legal page
- Leave empty main area (foot-core JS injects privacy/terms content at runtime)
- Page must be reachable at /legal after publish

2) CMS COLLECTION "Insights"
- Fields: Title (Plain text), Category (Plain text), Date (Date), Excerpt (Plain text)
- Add 3 items with lorem ipsum:
  a) "Lorem ipsum dolor sit amet" / Insights / Jun 12 2026 / Consectetur adipiscing elit...
  b) "Ut enim ad minim veniam" / Hiring / Jun 18 2026 / Quis nostrud exercitation...
  c) "Duis aute irure dolor" / Talent / Jun 24 2026 / Excepteur sint occaecat...

3) HOMEPAGE — add Collection List bound to Insights (3 items, 3-column grid) above footer
- Section heading: "Insights & updates"
- Hide if duplicate — one CMS block only

4) Remove inline Privacy Policy and Terms of Service sections from homepage canvas (legal lives on /legal)

5) PUBLISH to www.trydemigod.com AND talentlink-sf.webflow.io

List every change made.`;

async function reliablePublish(page) {
  assertNotFrozen('cms-legal-pass');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2000);
  const pub = await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /^publish$/i.test((x.textContent || '').trim()));
    return b || null;
  }, { timeout: 20000 }).catch(() => null);
  if (!pub) return { ok: false, reason: 'no publish button' };
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

async function checkLegalLive() {
  const res = await fetch(`https://www.trydemigod.com/legal?v=${Date.now()}`, { redirect: 'follow' });
  const html = await res.text();
  return {
    status: res.status,
    ok: res.status === 200,
    hasFoot: /lnyqlq\.js|dg-foot-v\d+-core/.test(html),
    hasLegalWrap: /demigod-legal|dg-legal-page/.test(html),
  };
}

async function main() {
  const result = { at: new Date().toISOString(), before: await checkLegalLive(), steps: [] };

  const aiSub = await submitWebflowAiPrompt(AI_PROMPT);
  result.steps.push({ step: 'submit-ai', ...aiSub });
  wlog(`cms-legal ai submit: ${JSON.stringify(aiSub)}`);

  if (aiSub.ok) {
    const wait = await waitWebflowTurnComplete(600000, aiSub.beforeTail || '');
    result.steps.push({ step: 'ai-wait', ok: wait.ok, tail: (wait.tail || '').slice(-500) });
    wlog(`cms-legal ai wait ok=${wait.ok}`);
  }

  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 600000 });
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  result.resize = resize;

  const pub = await reliablePublish(page);
  result.steps.push({ step: 'publish', ...pub });
  wlog(`cms-legal publish: ${JSON.stringify(pub)}`);

  await browser.disconnect();
  await sleep(15000);

  result.after = await checkLegalLive();
  result.pass = result.after.ok;

  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ ok: result.pass, before: result.before, after: result.after, out: OUT }, null, 2));
  wlog('CMS/legal pass done → ' + OUT);
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
