#!/usr/bin/env node
/**
 * One-shot: paste canonical HEAD + footer-lite into Webflow custom code,
 * Save, Publish with production domain selected, verify www.trydemigod.com.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';

const CLI_ARGS = new Set(process.argv.slice(2));
if (CLI_ARGS.has('--help') || CLI_ARGS.has('-h')) {
  console.log('Usage: node demigod-ship-head-now.mjs\n\nPastes canonical head and footer code, publishes Webflow, and verifies production.\nRequires publish freeze off and an active foot lock.');
  process.exit(0);
}

// Resolve canonical inputs from this checkout by default. The environment
// override keeps release preflight testable without accidentally reading a
// different worktree's head/footer/core artifacts.
const ROOT = path.resolve(process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url)));
const HEAD = fs.readFileSync(path.join(ROOT, 'demigod-head-minimal.html'), 'utf8');
const FOOT = fs.readFileSync(path.join(ROOT, 'demigod-footer-lite.html'), 'utf8');
const CORE = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const footLoaderUrls = (html) => [...String(html || '').matchAll(/<script\b[^>]*>/gi)]
  .map((match) => match[0])
  // Include both the canonical identified loader and raw foot-latest tags.
  // Otherwise the live gate can miss the exact dual-loader corruption where
  // one copy was pasted without the canonical id.
  .filter((tag) => /\bid=["']demigod-foot-cdn-loader["']/i.test(tag) || /\bsrc=["'][^"']*\/foot-latest\.js(?:[?#][^"']*)?["']/i.test(tag))
  .map((tag) => (tag.match(/\bsrc=["'](https?:\/\/[^"'\s<>]+)["']/i) || [])[1])
  .filter(Boolean);
// Count both the canonical identified tag and an accidentally pasted raw
// foot-latest tag. URL extraction alone is intentionally narrower, but the
// head safety gate must reject either form before Save/Publish.
const loaderCount = (html) => [...String(html || '').matchAll(/<script\b[^>]*>/gi)]
  .filter((match) => /\bid=["']demigod-foot-cdn-loader["']/i.test(match[0]) || /\bsrc=["'][^"']*\/foot-latest\.js(?:[?#][^"']*)?["']/i.test(match[0]))
  .length;
const canonicalUrl = (raw) => {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
};
const expectedFootUrls = footLoaderUrls(FOOT).map(canonicalUrl).filter(Boolean);
const expectedFootVersion = (CORE.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null;
const expectedPublicFootVersion = (CORE.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1] || null;
const expectedCoreSha = crypto.createHash('sha256').update(CORE).digest('hex');
const expectedCoreBytes = Buffer.byteLength(CORE);

assertNotFrozen('ship-head-now');
// This publisher writes both Custom Code editors, including the canonical footer.
// Refuse to race an active foot owner and accidentally publish a stale FOOT snapshot.
assertCanWriteFoot({ label: 'ship-head-now' });

async function readEditor(page, idx) {
  return page.evaluate((i) => {
    const eds = [...document.querySelectorAll('.cm-editor')].filter(
      (ed) => ed.isConnected && ed.getClientRects().length > 0,
    );
    const ed = eds[i];
    if (!ed) return '';
    const view = [...ed.querySelectorAll('.cm-content')]
      .map((node) => node.cmView?.view || node.cmTile?.view)
      .find((candidate) => {
        if (!candidate?.state?.doc) return false;
        const value = candidate.state.doc.toString();
        return !(/^\s*[\d\n]+\s*$/.test(value) && value.length < 200);
      });
    if (view?.state) return view.state.doc.toString();
    return ed.innerText || '';
  }, idx);
}

async function pasteEditor(page, idx, text) {
  const result = await page.evaluate((i, value) => {
    const eds = [...document.querySelectorAll('.cm-editor')].filter(
      (ed) => ed.isConnected && ed.getClientRects().length > 0,
    );
    const view = [...(eds[i]?.querySelectorAll('.cm-content') || [])]
      .map((node) => node.cmView?.view || node.cmTile?.view)
      .find((candidate) => {
        if (!candidate?.state?.doc) return false;
        const current = candidate.state.doc.toString();
        return !(/^\s*[\d\n]+\s*$/.test(current) && current.length < 200);
      });
    if (!view?.state?.doc) return { ok: false, reason: 'no-visible-cm6-view' };
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    try { view.dom?.dispatchEvent(new InputEvent('input', { bubbles: true })); } catch {}
    const after = view.state.doc.toString();
    return { ok: after === value, len: after.length };
  }, idx, text);
  if (!result.ok) throw new Error(`CM6 editor ${idx} paste failed: ${JSON.stringify(result)}`);
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
  if (!HEAD.includes('unhide-v5') || !HEAD.includes('dg-unhide-critical')) {
    throw new Error('disk head missing unhide-v5 / critical — abort');
  }
  if (expectedFootUrls.length !== 1) {
    throw new Error(`canonical footer must contain exactly one identified foot loader; found ${expectedFootUrls.length}`);
  }
  if (!expectedFootVersion || expectedFootVersion !== expectedPublicFootVersion) {
    throw new Error('disk foot version markers are missing or disagree');
  }
  const manifestUrl = canonicalUrl(MANIFEST?.cdnUrl);
  const manifestVersion = String(MANIFEST?.version || '').replace(/^v/i, '');
  const manifestFootVersion = String(MANIFEST?.footVer || '').replace(/^v/i, '');
  if (
    MANIFEST?.ok !== true ||
    !manifestUrl ||
    expectedFootUrls[0] !== manifestUrl ||
    manifestVersion !== expectedFootVersion ||
    manifestFootVersion !== expectedFootVersion ||
    MANIFEST?.sha256 !== expectedCoreSha ||
    MANIFEST?.bytes !== expectedCoreBytes
  ) {
    throw new Error('CDN manifest/footer is not attested to the current foot core; publish CDN before Custom Code');
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
  let editorCount = await page.evaluate(() => [...document.querySelectorAll('.cm-editor')]
    .filter((ed) => ed.isConnected && ed.getClientRects().length > 0).length);
  console.log('editors after Head tab:', editorCount);
  if (editorCount !== 2) throw new Error(`Need exactly 2 addressable Head + Footer CodeMirror editors; found ${editorCount}; refusing unsafe paste`);

  await pasteEditor(page, 0, HEAD);
  let headText = await readEditor(page, 0);
  console.log('head readback len', headText.length, 'v5', headText.includes('unhide-v5'), 'critical', headText.includes('dg-unhide-critical'));
  if (!headText.includes('unhide-v5') || headText.length < HEAD.length * 0.85) {
    // try again
    await pasteEditor(page, 0, HEAD);
    headText = await readEditor(page, 0);
    console.log('head retry len', headText.length, 'v5', headText.includes('unhide-v5'));
  }
  if (!headText.includes('unhide-v5')) throw new Error('HEAD paste failed readback');

  await clickTab(page, 'Footer');
  editorCount = await page.evaluate(() => [...document.querySelectorAll('.cm-editor')]
    .filter((ed) => ed.isConnected && ed.getClientRects().length > 0).length);
  if (editorCount !== 2) throw new Error(`Need exactly 2 editors before footer paste; found ${editorCount}; refusing unsafe paste`);
  const footIdx = 1;
  await pasteEditor(page, footIdx, FOOT);
  let footText = await readEditor(page, footIdx);
  const savedHeadText = await readEditor(page, 0);
  const loaderUrls = (value) => footLoaderUrls(value).map(canonicalUrl).filter(Boolean);
  const headLoaderUrls = loaderUrls(savedHeadText);
  const footerLoaderUrls = loaderUrls(footText);
  const headOk = savedHeadText === HEAD && loaderCount(savedHeadText) === 0;
  const footOk = footText === FOOT &&
    footerLoaderUrls.length === 1 &&
    footerLoaderUrls[0] === expectedFootUrls[0] &&
    !/unhide-v5|dg-unhide-critical/.test(footText);
  console.log('split readback', { headOk, footOk, headLen: savedHeadText.length, footLen: footText.length });
  if (!headOk || !footOk) throw new Error('Head/Footer split readback failed; aborting before Save');

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
    const headMatchesDisk = html.includes(HEAD);
    const v5 = /unhide-v5/.test(html);
    const critical = /dg-unhide-critical/.test(html);
    const liveFootUrls = footLoaderUrls(html).map(canonicalUrl);
    const singleCanonicalFoot = liveFootUrls.length === 1 && liveFootUrls[0] === expectedFootUrls[0];
    let liveFootVersion = null;
    let livePublicFootVersion = null;
    if (singleCanonicalFoot) {
      const liveFoot = await fetch(`${liveFootUrls[0]}?v=${ts}`, { cache: 'no-store' }).then((r) => r.text());
      liveFootVersion = (liveFoot.match(/__dgFootVer\s*=\s*['"](\d+)['"]/) || [])[1] || null;
      livePublicFootVersion = (liveFoot.match(/dgFootVersion\s*=\s*['"]v(\d+)['"]/) || [])[1] || null;
    }
    const liveFootMatchesDisk = liveFootVersion === expectedFootVersion && livePublicFootVersion === expectedPublicFootVersion;
    const early = (html.match(/<script id="dg-early-unhide"[^>]*>([\s\S]*?)<\/script>/) || [])[1] || '';
    const braces = early ? { o: (early.match(/\{/g) || []).length, c: (early.match(/\}/g) || []).length } : null;
    last = { i, pub: pub.slice(0, 40), headMatchesDisk, v5, critical, singleCanonicalFoot, liveFootMatchesDisk, liveFootVersion, livePublicFootVersion, liveFootUrls, braces, bytes: html.length };
    console.log('poll', last);
    if (headMatchesDisk && v5 && critical && singleCanonicalFoot && liveFootMatchesDisk && braces && braces.o === braces.c) {
      ok = true;
      break;
    }
  }

  // Also staging
  const st = await fetch(`https://talentlink-sf.webflow.io/?v=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
  console.log('staging v5', /unhide-v5/.test(st), 'pub', (st.match(/Last Published: ([^<]+)/) || [])[1]?.slice(0, 40));

  fs.writeFileSync(
    path.join(ROOT, 'DEMIGOD-SHIP-HEAD-NOW.json'),
    JSON.stringify({ ok, last, headLen: HEAD.length, at: new Date().toISOString() }, null, 2)
  );
  console.log(ok ? 'SUCCESS production has unhide-v5' : 'FAIL still missing v5 on production — check screenshots / domain checkboxes');
  await browser.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
