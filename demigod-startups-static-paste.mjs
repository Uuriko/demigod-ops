#!/usr/bin/env node
// Save/check the sealed crawlable directory in /startups page-scoped Webflow custom code.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { connectBrowser } from './collab-lib.mjs';
import { assertCanWriteFoot } from './demigod-foot-lock.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';
import { buildStaticDirectory } from './demigod-directory-static.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(ROOT, 'sf-startups-static.html');
const MAP = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
const FEED = path.join(ROOT, 'DEMIGOD-ROLES-FEED.json');
const PAGE_ID = '6a63b78e2b942a56ab6cccf9';
const DESIGNER = `https://talentlink-sf.design.webflow.com/?pageId=${PAGE_ID}`;
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const optionalBytes = (file) => { try { return fs.readFileSync(file); } catch (error) { if (error?.code === 'ENOENT') return null; throw error; } };
const fileSha256 = (file) => { const bytes = optionalBytes(file); return bytes == null ? null : sha256(bytes); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForPagesButton = async (page, timeout = 45000) => {
  try {
    await page.waitForFunction(
      () => [...document.querySelectorAll('[data-automation-id=left-sidebar-pages-button]')]
        .some((element) => element.isConnected && element.getClientRects().length),
      { timeout },
    );
  } catch {
    const title = await page.title().catch(() => '');
    const href = page.url();
    throw new Error(
      `Designer Pages button not ready within ${timeout}ms (url=${href} title=${title}). ` +
        'Open Designer on a wide viewport (≥1280px); Webflow hides Pages when the window is narrow.',
    );
  }
};

export function validateStaticFragment(value) {
  const text = String(value || '');
  const bytes = Buffer.byteLength(text);
  const fragments = (text.match(/<details\b[^>]*\bclass=["'][^"']*\bdg-static\b[^"']*["']/gi) || []).length;
  const ok = bytes > 0 && bytes <= 50000 && fragments === 1 && !/<(?:!doctype|html|head|body)\b/i.test(text);
  return { ok, bytes, fragments, sha256: sha256(text) };
}

export function validateStaticSources(value, map, feed = null) {
  const expected = buildStaticDirectory(map, '', feed);
  return { ok: String(value || '') === expected, expectedSha256: sha256(expected) };
}

async function openSettings(page) {
  const settingsVisible = await page.$eval(
    '[data-automation-id=page-settings-panel]',
    (element) => element.isConnected && element.getClientRects().length > 0,
  ).catch(() => false);
  if (settingsVisible) return;
  const pageRowVisible = await page.$eval(
    '[data-automation-id=sf-startups-hiring-page]',
    (element) => element.isConnected && element.getClientRects().length > 0,
  ).catch(() => false);
  if (!pageRowVisible) {
    const clicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('[data-automation-id=left-sidebar-pages-button]')]
        .find((element) => element.isConnected && element.getClientRects().length);
      button?.click();
      return Boolean(button);
    });
    if (!clicked) throw new Error('visible Pages button missing');
  }
  await page.waitForSelector('[data-automation-id=sf-startups-hiring-page]', { visible: true, timeout: 30000 });
  const opened = await page.evaluate(() => {
    const pageRow = [...document.querySelectorAll('[data-automation-id=sf-startups-hiring-page]')]
      .find((element) => element.isConnected && element.getClientRects().length)
      ?.closest('[data-automation-id=page-list-row-wrapper]');
    const button = pageRow?.querySelector('[data-automation-id=open-settings-button]');
    if (!button) return false;
    button.click();
    return true;
  });
  if (!opened) throw new Error('startups page settings button missing');
  await page.waitForSelector('[data-automation-id=page-settings-panel]', { timeout: 30000 });
  await page.evaluate(() => {
    const panes = [...document.querySelectorAll('.bem-Pane_Body')];
    if (panes.at(-1)) panes.at(-1).scrollTop = panes.at(-1).scrollHeight;
  });
  await wait(700);
}

const editorText = (page) => page.evaluate(() => {
  const views = [...document.querySelectorAll('.cm-editor')]
    .filter((editor) => editor.isConnected && editor.getClientRects().length)
    .map((editor) => {
      const node = [...editor.querySelectorAll('.cm-content')]
        .find((item) => item.cmView?.view?.state?.doc || item.cmTile?.view?.state?.doc);
      return node?.cmView?.view || node?.cmTile?.view;
    })
    .filter(Boolean);
  if (views.length !== 3) return { ok: false, reason: 'need-exactly-3-page-editors', count: views.length, text: '' };
  return { ok: true, count: views.length, text: views[2].state.doc.toString() };
});

async function setEditorText(page, expected) {
  return page.evaluate((text) => {
    const views = [...document.querySelectorAll('.cm-editor')]
      .filter((editor) => editor.isConnected && editor.getClientRects().length)
      .map((editor) => {
        const node = [...editor.querySelectorAll('.cm-content')]
          .find((item) => item.cmView?.view?.state?.doc || item.cmTile?.view?.state?.doc);
        return node?.cmView?.view || node?.cmTile?.view;
      })
      .filter(Boolean);
    if (views.length !== 3) return { ok: false, reason: 'need-exactly-3-page-editors', count: views.length };
    const view = views[2];
    const before = view.state.doc.toString();
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    try { view.dom?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); } catch { /* CM dispatch is authoritative */ }
    const after = view.state.doc.toString();
    return { ok: after === text, beforeLength: before.length, afterLength: after.length };
  }, expected);
}

export async function run(save) {
  const sourceBytes = fs.readFileSync(SOURCE);
  const mapBytes = fs.readFileSync(MAP);
  const feedBytes = optionalBytes(FEED);
  const expected = sourceBytes.toString('utf8');
  const map = JSON.parse(mapBytes.toString('utf8'));
  const feed = feedBytes == null ? null : JSON.parse(feedBytes.toString('utf8'));
  const binding = validateStaticSources(expected, map, feed);
  if (!binding.ok) throw new Error('sealed startups fragment is not generated from current map/feed');
  const snapshot = [[SOURCE, sha256(sourceBytes)], [MAP, sha256(mapBytes)], [FEED, feedBytes == null ? null : sha256(feedBytes)]];
  const assertSnapshotUnchanged = () => {
    if (snapshot.some(([file, hash]) => fileSha256(file) !== hash)) {
      throw new Error('startups static source changed during Webflow operation');
    }
  };
  const sealed = validateStaticFragment(expected);
  if (!sealed.ok) throw new Error(`invalid sealed startups fragment: ${JSON.stringify(sealed)}`);
  if (save) {
    assertNotFrozen('startups-static-paste');
    assertCanWriteFoot({ label: 'startups-static-paste' });
    assertSnapshotUnchanged();
  }

  const browser = await connectBrowser();
  let page;
  let ownsPage = false;
  try {
    page = (await browser.pages()).find((candidate) => candidate.url().startsWith('https://talentlink-sf.design.webflow.com/'));
    if (!page) {
      page = await browser.newPage();
      ownsPage = true;
    }
    await page.setViewport({ width: 1440, height: 900 });
    // Always navigate so the initial comparison is persisted Webflow state, never a stale editor store.
    await page.goto(DESIGNER, { waitUntil: 'domcontentloaded', timeout: 120000 });
    if (/webflow\.com\/login/.test(page.url()) || /access to this page has been denied/i.test(await page.title())) {
      throw new Error('Webflow Designer authentication unavailable; page fragment was not changed');
    }
    await page.bringToFront();
    await waitForPagesButton(page);
    await openSettings(page);
    let current = await editorText(page);
    if (!current.ok) throw new Error(current.reason);
    const beforeSha256 = sha256(current.text);

    if (save && current.text !== expected) {
      assertSnapshotUnchanged();
      const changed = await setEditorText(page, expected);
      if (!changed.ok) throw new Error(`page editor write failed: ${JSON.stringify(changed)}`);
      // Webflow mirrors CodeMirror into form state asynchronously. Saving immediately re-saves old bytes.
      await wait(1200);
      assertSnapshotUnchanged();
      const responsePromise = page.waitForResponse(
        (response) => response.request().method() === 'PUT' && response.url().includes(`/api/pages/${PAGE_ID}`),
        { timeout: 120000 },
      );
      const clicked = await page.evaluate(() => {
        const button = [...document.querySelectorAll('[data-automation-id=save-page-button]')]
          .find((element) => element.isConnected && element.getClientRects().length);
        button?.click();
        return Boolean(button);
      });
      if (!clicked) throw new Error('visible save-page-button missing');
      const response = await responsePromise;
      if (response.status() !== 200) throw new Error(`Webflow page save HTTP ${response.status()}`);
      await page.waitForSelector('[data-automation-id=page-settings-panel]', { hidden: true, timeout: 30000 });
      // Reload before readback so the comparison comes from Webflow's persisted state, not its in-memory editor store.
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
      await waitForPagesButton(page);
      await openSettings(page);
      current = await editorText(page);
      if (!current.ok) throw new Error(current.reason);
    }

    assertSnapshotUnchanged();
    const exact = current.text === expected;
    const report = { ok: exact, save, bytes: sealed.bytes, sha256: sha256(current.text), expectedSha256: sealed.sha256, beforeSha256 };
    console.log(JSON.stringify(report));
    if (!exact) {
      if (isMain) process.exitCode = 1;
      else throw new Error('persisted startups fragment differs from current sealed source');
    }
    return report;
  } finally {
    if (ownsPage) try { await page?.close(); } catch { /* best effort tab hygiene */ }
    await browser.disconnect();
  }
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--selftest') {
    const valid = '<style>.dg-static{}</style><details class="dg-static"><summary>x</summary></details>';
    if (!validateStaticFragment(valid).ok || validateStaticFragment(valid + valid).ok || validateStaticFragment(`<body>${valid}</body>`).ok) {
      throw new Error('startups static paste selftest failed');
    }
    const map = { generatedAt: '2026-08-02', companies: [{ name: 'Alpha', openRoles: 1, atsSource: 'Ashby', jobsUrl: 'https://jobs.ashbyhq.com/alpha' }] };
    const canonical = buildStaticDirectory(map);
    if (!validateStaticSources(canonical, map).ok || validateStaticSources(canonical.replaceAll('Alpha', 'Gong.io'), map).ok) {
      throw new Error('startups static source-binding selftest failed');
    }
    console.log(JSON.stringify({ ok: true, selftest: 'startups-static-paste' }));
  } else if (args.length === 1 && ['--check', '--save'].includes(args[0])) {
    try {
      await run(args[0] === '--save');
    } catch (err) {
      const msg = String(err?.message || err);
      console.error(msg);
      // Policy / Designer env — not a sealed-fragment product bug (POSIX usage-style amber).
      const policyOrEnv =
        /did not authorize|publish freeze|authentication unavailable|Pages button not ready|foot lock|lock held|browser too small/i.test(
          msg,
        );
      process.exitCode = policyOrEnv ? 2 : 1;
    }
  } else {
    console.error('usage: node demigod-startups-static-paste.mjs --check|--save|--selftest');
    process.exitCode = 2;
  }
}
