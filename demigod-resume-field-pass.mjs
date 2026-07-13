#!/usr/bin/env node
/** Add native Webflow File upload to engineer-join form + publish. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-RESUME-FIELD.json');

const AI_PROMPT = `Demigod — add RESUME upload to candidate form only.

1) Open #jobseeker-modal → engineer-join form (engineer-join / jobseeker-form).
2) Add Webflow **File upload** field named "resume" — label "Resume (optional)".
3) Allow only Documents: .pdf .doc .docx — NOT required. Max 10MB note visible.
4) Place after Skills & experience, before SF Bay Area checkbox.
5) Do NOT change startup-hire form. Publish when done.`;

async function patchCanvasResume(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500) { doc = d; break; }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no iframe' };
    const form = doc.querySelector('#jobseeker-modal form, #engineer-join, form[data-name=engineer-join]');
    if (!form) return { ok: false, reason: 'no engineer form' };
    if (form.querySelector('[name=resume],[name=Resume],input[type=file]')) {
      return { ok: true, changes: ['resume-exists'] };
    }
    form.setAttribute('enctype', 'multipart/form-data');
    const wrap = doc.createElement('div');
    wrap.className = 'w-file-upload dg-resume-native';
    wrap.innerHTML = '<label class="w-form-label">Resume (optional)</label>'
      + '<input class="w-file-upload-input" type="file" name="resume" accept=".pdf,.doc,.docx">'
      + '<div class="w-file-upload-default">Upload resume</div>';
    const skills = form.querySelector('[name=skills-stack]');
    const anchor = skills?.closest('.w-input') || skills?.parentElement;
    if (anchor?.parentElement) anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
    else form.querySelector('[type=submit],.w-button')?.parentElement?.insertBefore(wrap, form.querySelector('[type=submit],.w-button'));
    return { ok: true, changes: ['inject-resume-canvas'] };
  });
}

async function savePublish(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1000);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /publish to selected|publish site/i.test(b.textContent || ''))?.click();
  });
  await sleep(12000);
}

async function main() {
  wlog('=== RESUME FIELD PASS START ===');
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(800);
  const canvas = await patchCanvasResume(page);
  if (canvas.ok && canvas.changes?.includes('inject-resume-canvas')) await savePublish(page);

  const ai = await submitWebflowAiPrompt(AI_PROMPT);
  let publishedAi = false;
  if (ai.ok) {
    const wait = await waitWebflowTurnComplete(360000, ai.beforeTail || '');
    if (wait.ok) {
      const b2 = await connectBrowser();
      const { page: p2 } = await prepareWebflowDesigner(b2);
      await patchCanvasResume(p2);
      await savePublish(p2);
      publishedAi = true;
      await b2.disconnect();
    }
  }
  await browser.disconnect();

  const out = { at: new Date().toISOString(), canvas, ai: { ok: ai.ok }, publishedAi };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== RESUME FIELD PASS END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });