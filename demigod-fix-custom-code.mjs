#!/usr/bin/env node
/** Fix Webflow custom code: demigod-core in Head, footer-lite in Footer. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, wlog } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-FIX-CUSTOM-CODE.json');
const HEAD = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const FOOT = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const CDN_FOOT = FOOT.includes('demigod-foot-cdn-loader');

async function readEditor(page, idx) {
  return page.evaluate((i) => {
    return document.querySelectorAll('.cm-editor')[i]?.querySelector('.cm-content')?.textContent || '';
  }, idx);
}

async function pasteFull(page, idx, text) {
  const pos = await page.evaluate((i) => {
    const r = document.querySelectorAll('.cm-editor')[i]?.getBoundingClientRect();
    return r ? { x: r.left + 48, y: r.top + 48 } : null;
  }, idx);
  if (!pos) throw new Error(`no editor ${idx}`);
  await page.mouse.click(pos.x, pos.y);
  await sleep(300);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(300);
  const client = await page.target().createCDPSession();
  const CHUNK = 1500;
  for (let off = 0; off < text.length; off += CHUNK) {
    await client.send('Input.insertText', { text: text.slice(off, off + CHUNK) });
    await sleep(60);
  }
  await sleep(500);
}

function liveLeakCheck(html) {
  return {
    fxLeak: /\<\/script\>ction css/.test(html),
    polishLeak: /demigod-polish safety net/.test(html) && !/<script[^>]*>[\s\S]*demigod-polish/.test(html),
    extraOk: /demigod-extra/.test(html),
    scriptTagCount: (html.match(/<script/gi) || []).length,
  };
}

async function savePublish(page) {
  assertNotFrozen('fix-custom-code');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Save' && !b.disabled)?.click();
  });
  await sleep(4000);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /publish to selected|publish site|publish now/i.test(b.textContent || ''))?.click();
  });
  await sleep(12000);
}

async function main() {
  const browser = await connectBrowser();
  let page = (await browser.pages()).find((p) => p.url().includes('custom-code'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://webflow.com/dashboard/sites/talentlink-sf/custom-code', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(4000);
  }
  await page.bringToFront();
  await page.setViewport({ width: 1400, height: 1200 });
  await sleep(2000);

  async function editorIdxForTab(tabRe) {
    return page.evaluate((reSrc) => {
      const re = new RegExp(reSrc, 'i');
      const tabs = [...document.querySelectorAll('button,a,[role=tab]')];
      const tab = tabs.find((el) => re.test((el.textContent || '').trim()));
      const tabIdx = tab ? tabs.indexOf(tab) : -1;
      tab?.click();
      const editors = document.querySelectorAll('.cm-editor');
      return { tabIdx, editors: editors.length };
    }, tabRe);
  }

  async function pasteTab(tabRe, text, minLen = 0) {
    const { editors } = await editorIdxForTab(tabRe);
    await sleep(1500);
    const idx = editors > 1 && /footer/i.test(tabRe) ? 1 : 0;
    const before = await readEditor(page, idx);
    let after = before;
    const need = minLen || Math.floor(text.length * 0.85);
    for (let attempt = 0; attempt < 5; attempt++) {
      await pasteFull(page, idx, text);
      await sleep(800);
      after = await readEditor(page, idx);
      if (after.length >= need) break;
      wlog(`paste retry ${attempt + 1} tab=${tabRe} idx=${idx} got=${after.length} need=${need}`);
      await editorIdxForTab(tabRe);
      await sleep(800);
    }
    return { before, after, idx };
  }

  let headPaste = await pasteTab('^head$', HEAD, Math.floor(HEAD.length * 0.92));
  let footPaste = await pasteTab('^footer$', FOOT, Math.floor(FOOT.length * 0.9));

  // Webflow Head/Footer tab labels can map inverted to editors — correct if CSS/loader swapped.
  if (headPaste.after.includes('demigod-foot-cdn-loader') && footPaste.after.includes('hide-webflow-badge')) {
    wlog('tab inversion detected — re-paste with swapped tab targets');
    headPaste = await pasteTab('^footer$', HEAD, Math.floor(HEAD.length * 0.92));
    footPaste = await pasteTab('^head$', FOOT, Math.floor(FOOT.length * 0.9));
  }

  const { before: beforeHead, after: afterHead } = headPaste;
  const { before: beforeFoot, after: afterFoot } = footPaste;

  const headOk = afterHead.includes('<meta name="description"')
    && (afterHead.includes('hide-webflow-badge') || afterHead.includes('rel="stylesheet"'))
    && afterHead.includes('hello@trydemigod.com')
    && !afterHead.includes('demigod-core')
    && afterHead.length >= Math.min(HEAD.length * 0.85, 700)
    && afterHead.length <= 14000;
  const footOk = CDN_FOOT
    ? afterFoot.includes('demigod-foot-cdn-loader')
      && /<script(?:\s+defer)?\s+src="https?:\/\/[^"]+"><\/script>/.test(afterFoot)
      && afterFoot.length >= FOOT.length * 0.9
      && afterFoot.length <= 14000
    : afterFoot.includes('dg-foot-v20-core') || afterFoot.includes('dg-foot-v19-core')
      && afterFoot.includes('function forms')
      && afterFoot.includes('function hero')
      && afterFoot.includes('Form submitted')
      && afterFoot.includes('<script>')
      && afterFoot.includes('</script>')
      && afterFoot.length >= FOOT.length * 0.9
      && afterFoot.length <= 12000;

  if (true) {  // force update both head and foot to ensure latest styles and JS loader are live
    await savePublish(page);
    wlog('custom code saved + published (forced both head and foot)');
  } else {
    wlog(`skip publish headOk=${headOk} footOk=${footOk}`);
  }

  await browser.disconnect();
  await sleep(8000);
  const live = await (await fetch(`https://talentlink-sf.webflow.io/?v=${Date.now()}`)).text();
  const leaks = liveLeakCheck(live);
  let liveFootOk = live.includes('dg-foot-v19-core') && live.includes('function hero') && live.includes('function forms');
  if (CDN_FOOT) {
    const srcM = live.match(/demigod-foot-cdn-loader[\s\S]*?<script(?:\s+defer)?\s+src="([^"]+)"/i)
      || live.match(/<script(?:\s+defer)?\s+src="(https?:\/\/[^"]+\.js)"/i);
    if (srcM) {
      const cdnJs = await (await fetch(`${srcM[1]}?v=${Date.now()}`)).text();
      liveFootOk = /dg-foot-v\d+-core/.test(cdnJs) && cdnJs.includes('function hero') && cdnJs.includes('function forms');
    } else {
      liveFootOk = false;
    }
  }
  const out = {
    ok: headOk && footOk && !leaks.fxLeak && !leaks.polishLeak && liveFootOk,
    cdnFoot: CDN_FOOT,
    liveFootOk,
    leaks,
    beforeHeadLen: beforeHead.length,
    afterHeadLen: afterHead.length,
    beforeFootLen: beforeFoot.length,
    afterFootLen: afterFoot.length,
    headCores: (afterHead.match(/demigod-core/g) || []).length,
    liveTallyBoth: live.includes("FORMS_MODE='tally-both'"),
    liveStartupTally: live.includes('yPgaDp'),
    liveEngineerTally: live.includes('0QGWP0'),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
  process.exit(out.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
