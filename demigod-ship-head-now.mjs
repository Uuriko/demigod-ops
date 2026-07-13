#!/usr/bin/env node
/**
 * One-shot: paste canonical HEAD + footer-lite into Webflow custom code,
 * Save, Publish with production domain selected, verify www.trydemigod.com.
 */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';

const ROOT = '/home/potter';
const HEAD = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const FOOT = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readEditor(page, idx) {
  return page.evaluate((i) => {
    const eds = document.querySelectorAll('.cm-editor');
    const ed = eds[i];
    if (!ed) return '';
    const content = ed.querySelector('.cm-content');
    const view = content?.cmView?.view;
    if (view?.state) return view.state.doc.toString();
    return content?.innerText || ed.innerText || '';
  }, idx);
}

async function pasteEditor(page, idx, text) {
  const pos = await page.evaluate((i) => {
    const r = document.querySelectorAll('.cm-editor')[i]?.getBoundingClientRect();
    return r ? { x: r.left + 40, y: r.top + 40 } : null;
  }, idx);
  if (!pos) throw new Error(`no editor at index ${idx}`);
  await page.mouse.click(pos.x, pos.y);
  await sleep(250);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  const client = await page.target().createCDPSession();
  const CHUNK = 1500;
  for (let off = 0; off < text.length; off += CHUNK) {
    await client.send('Input.insertText', { text: text.slice(off, off + CHUNK) });
    await sleep(40);
  }
  await sleep(400);
}

async function clickTab(page, name) {
  await page.evaluate((n) => {
    const els = [...document.querySelectorAll('button, a, [role="tab"], div, span')];
    const tab = els.find((el) => (el.textContent || '').trim().toLowerCase() === n.toLowerCase());
    tab?.click();
  }, name);
  await sleep(1000);
}

async function main() {
  console.log('HEAD', HEAD.length, 'FOOT', FOOT.length);
  if (!HEAD.includes('unhide-v4') || !HEAD.includes('dg-unhide-critical')) {
    throw new Error('disk head missing unhide-v4 / critical — abort');
  }

  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
    protocolTimeout: 120000,
  });

  let page = (await browser.pages()).find((p) => p.url().includes('custom-code'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://webflow.com/dashboard/sites/talentlink-sf/custom-code', {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
  }
  await page.bringToFront();
  await page.setViewport({ width: 1400, height: 1100 });
  await sleep(2500);

  // Ensure we are on custom code
  if (!page.url().includes('custom-code')) {
    await page.goto('https://webflow.com/dashboard/sites/talentlink-sf/custom-code', {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await sleep(2500);
  }

  await clickTab(page, 'Head');
  let editors = await page.$$('.cm-editor');
  console.log('editors after Head tab:', editors.length);
  if (!editors.length) throw new Error('No CodeMirror editors — are you logged into Webflow?');

  await pasteEditor(page, 0, HEAD);
  let headText = await readEditor(page, 0);
  console.log('head readback len', headText.length, 'v4', headText.includes('unhide-v4'), 'critical', headText.includes('dg-unhide-critical'));
  if (!headText.includes('unhide-v4') || headText.length < HEAD.length * 0.85) {
    // try again
    await pasteEditor(page, 0, HEAD);
    headText = await readEditor(page, 0);
    console.log('head retry len', headText.length, 'v4', headText.includes('unhide-v4'));
  }
  if (!headText.includes('unhide-v4')) throw new Error('HEAD paste failed readback');

  await clickTab(page, 'Footer');
  editors = await page.$$('.cm-editor');
  const footIdx = editors.length > 1 ? 1 : 0;
  await pasteEditor(page, footIdx, FOOT);
  let footText = await readEditor(page, footIdx);
  console.log('foot readback len', footText.length, 'xngres', footText.includes('xngres'));
  if (!footText.includes('xngres') && !footText.includes('catbox')) {
    await pasteEditor(page, 0, FOOT);
    footText = await readEditor(page, 0);
    console.log('foot alt idx0', footText.length, footText.includes('xngres'));
  }

  // Save
  console.log('Saving...');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(
      (el) => /^save$/i.test((el.textContent || '').trim()) && !el.disabled
    );
    b?.click();
  });
  await sleep(5000);
  await page.screenshot({ path: '/tmp/demigod-after-save.png' }).catch(() => {});

  // Publish button
  console.log('Opening Publish...');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, [role="button"]')].find((el) =>
      /^publish$/i.test((el.textContent || '').trim())
    );
    b?.click();
  });
  await sleep(2500);

  // Check domain checkboxes — must include trydemigod.com
  const domainState = await page.evaluate(() => {
    const text = document.body.innerText || '';
    const labels = [...document.querySelectorAll('label, [class*="domain"], [class*="checkbox"], li, div')];
    const hits = [];
    for (const el of labels) {
      const t = (el.textContent || '').trim();
      if (/trydemigod|webflow\.io|talentlink/i.test(t) && t.length < 120) {
        const input = el.querySelector('input[type=checkbox]') || el.closest('label')?.querySelector('input');
        hits.push({ t: t.slice(0, 80), checked: input ? input.checked : null, tag: el.tagName });
        if (input && /trydemigod/i.test(t) && !input.checked) {
          input.click();
          hits.push({ action: 'checked-trydemigod' });
        }
        if (input && /webflow\.io/i.test(t) && !input.checked) {
          input.click();
          hits.push({ action: 'checked-webflow-io' });
        }
      }
    }
    // Also click any unchecked inputs near domain text
    for (const input of document.querySelectorAll('input[type=checkbox]')) {
      const wrap = input.closest('label,div,li')?.textContent || '';
      if (/trydemigod\.com/i.test(wrap) && !input.checked) {
        input.click();
        hits.push({ action: 'force-check-prod' });
      }
    }
    return { dialogSnippet: text.slice(0, 800), hits };
  });
  console.log('domain dialog:', JSON.stringify(domainState, null, 2));
  await page.screenshot({ path: '/tmp/demigod-publish-dialog.png' }).catch(() => {});
  await sleep(800);

  // Confirm publish
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const conf =
      btns.find((b) => /publish to selected domains/i.test(b.textContent || '')) ||
      btns.find((b) => /publish to selected/i.test(b.textContent || '')) ||
      btns.find((b) => /publish site|publish now/i.test(b.textContent || '')) ||
      btns.find((b) => /^publish$/i.test((b.textContent || '').trim()));
    conf?.click();
  });
  console.log('Publish confirm clicked — waiting...');
  await sleep(20000);
  await page.screenshot({ path: '/tmp/demigod-after-publish.png' }).catch(() => {});

  // Verify production (poll)
  let ok = false;
  let last = {};
  for (let i = 0; i < 10; i++) {
    await sleep(5000);
    const ts = Date.now();
    const html = await fetch(`https://www.trydemigod.com/?v=${ts}`, { cache: 'no-store' }).then((r) => r.text());
    const pub = (html.match(/Last Published: ([^<]+)/) || [])[1] || '';
    const v4 = /unhide-v4/.test(html);
    const critical = /dg-unhide-critical/.test(html);
    const early = (html.match(/<script id="dg-early-unhide"[^>]*>([\s\S]*?)<\/script>/) || [])[1] || '';
    const bal = early ? early.count?.('{') : null;
    const braces = early ? { o: (early.match(/\{/g) || []).length, c: (early.match(/\}/g) || []).length } : null;
    last = { i, pub: pub.slice(0, 40), v4, critical, braces, bytes: html.length };
    console.log('poll', last);
    if (v4 && critical && braces && braces.o === braces.c) {
      ok = true;
      break;
    }
  }

  // Also staging
  const st = await fetch(`https://talentlink-sf.webflow.io/?v=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
  console.log('staging v4', /unhide-v4/.test(st), 'pub', (st.match(/Last Published: ([^<]+)/) || [])[1]?.slice(0, 40));

  fs.writeFileSync(
    path.join(ROOT, 'DEMIGOD-SHIP-HEAD-NOW.json'),
    JSON.stringify({ ok, last, headLen: HEAD.length, at: new Date().toISOString() }, null, 2)
  );
  console.log(ok ? 'SUCCESS production has unhide-v4' : 'FAIL still missing v4 on production — check screenshots / domain checkboxes');
  await browser.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
