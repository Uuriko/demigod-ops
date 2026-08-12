#!/usr/bin/env node
/**
 * Live Make→Ship→Return loop against production Studio (shadow-DOM thin loader).
 *
 *   node dasha-stranger-loop.mjs
 *   DASHA_LIVE_BASE=https://www.getdasha.com node dasha-stranger-loop.mjs
 *
 * Requires CDP at http://127.0.0.1:9223. Exit 0 only if L1–L7 checks pass.
 * Writes /tmp/dasha-stranger-loop.json
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const LIVE = `${process.env.DASHA_LIVE_BASE || 'https://www.getdasha.com'}/studio`;
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9223';
const OUT = process.env.DASHA_STRANGER_OUT || '/tmp/dasha-stranger-loop.json';

const report = { ok: true, steps: [], ms: 0 };
const t0 = Date.now();
const step = (id, ok, detail = {}) => {
  report.steps.push({ id, ok: Boolean(ok), ...detail });
  if (!ok) report.ok = false;
};

const rootEval = (page, fn, ...args) =>
  page.evaluate(
    (fnSrc, ...a) => {
      const fn = eval(`(${fnSrc})`);
      const host = document.querySelector('.dasha-studio-embed');
      const root = host?.shadowRoot || document;
      return fn(root, document, ...a);
    },
    fn.toString(),
    ...args,
  );

const rootClick = async (page, sel) => {
  const ok = await rootEval(
    page,
    (root, _, sel) => {
      const el = root.querySelector(sel);
      if (!el) return false;
      el.click();
      return true;
    },
    sel,
  );
  if (!ok) throw new Error(`click miss ${sel}`);
};

export async function runStrangerLoop() {
  report.ok = true;
  report.steps = [];
  const browser = await puppeteer.connect({ browserURL: CDP });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    page.setDefaultTimeout(60_000);
    await page.goto(`${LIVE}?_=${Date.now()}`, { waitUntil: 'networkidle2', timeout: 90_000 });

    await page.waitForFunction(() => {
      const host = document.querySelector('.dasha-studio-embed');
      const root = host?.shadowRoot || document;
      const c = root.querySelector('#canvas');
      try {
        return c && c.width > 0 && c.toDataURL().length > 5000;
      } catch {
        return false;
      }
    }, { timeout: 60_000 });

    const cold = await rootEval(page, (root) => {
      const canvas = root.querySelector('#canvas');
      const status = root.querySelector('#status')?.textContent || '';
      let pngOk = false;
      try {
        pngOk = canvas?.toDataURL()?.startsWith('data:image/png');
      } catch {
        /* ignore */
      }
      return {
        canvasW: canvas?.width,
        pngOk,
        status,
        share: Boolean(root.querySelector('#share')),
        wallet: /connect wallet|wallet required/i.test(root.textContent || ''),
        hasToday: Boolean(root.querySelector('#ritual-today')),
        hasSurprise: Boolean(root.querySelector('#surprise')),
        coldCopy: /change one thing|today/i.test(status),
      };
    });
    step('L1-cold-open', cold.pngOk && cold.share && !cold.wallet && cold.canvasW === 1080 && cold.coldCopy, cold);

    await rootEval(page, (root) => {
      const line = root.querySelector('#line');
      if (line) {
        line.value = 'Stranger loop $dasha';
        line.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 350));
    const afterEdit = await rootEval(page, (root) => ({
      line: root.querySelector('#line')?.value || '',
      shareStill: Boolean(root.querySelector('#share')),
    }));
    step('L2-one-change', afterEdit.line.includes('Stranger') && afterEdit.shareStill, afterEdit);

    await page.evaluate(() => {
      window.__nativeShare = null;
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: (d) => d?.files?.length === 1,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data) => {
          window.__nativeShare = {
            files: data.files?.length || 0,
            text: data.text || '',
            url: data.url || '',
          };
        },
      });
    });
    await rootClick(page, '#share');
    await page.waitForFunction(() => window.__nativeShare, { timeout: 60_000 });
    const shared = await page.evaluate(() => window.__nativeShare);
    const handoffUrl = String(shared?.url || '');
    const handoffOk = /lobby\.getdasha\.com\/h\/[A-Za-z0-9_-]+/.test(handoffUrl);
    step('L3-share', shared?.files === 1 && handoffOk, {
      files: shared?.files,
      url: handoffUrl.slice(0, 100),
    });

    const afterShare = await rootEval(page, (root) => {
      const tray = root.querySelector('#after-share');
      return {
        visible: tray && !tray.hidden,
        makeAnother: Boolean(root.querySelector('#after-dismiss')),
        copy: root.querySelector('#after-share-copy')?.textContent || '',
      };
    });
    step('L7-after-share', afterShare.visible && afterShare.makeAnother, afterShare);

    if (handoffOk) {
      const hp = await browser.newPage();
      try {
        await hp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
        await hp.setUserAgent(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        );
        const res = await hp.goto(handoffUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await new Promise((r) => setTimeout(r, 600));
        const snap = await hp.evaluate(() => ({
          url: location.href,
          ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
          onStudio: /getdasha\.com\/studio/i.test(location.href),
        }));
        // Humans auto-redirect into Studio; success is Studio+DNA (HTTP status may be 304/null after replace).
        step('L4-handoff', Boolean(snap.onStudio || snap.ogTitle), {
          ...snap,
          http: res?.status?.(),
        });

        if (!snap.onStudio) {
          await hp
            .waitForFunction(() => /getdasha\.com\/studio/i.test(location.href), { timeout: 20_000 })
            .catch(() => {});
        }
        await hp.waitForFunction(() => {
          const host = document.querySelector('.dasha-studio-embed');
          const root = host?.shadowRoot || document;
          const c = root.querySelector('#canvas');
          return c && c.width > 0;
        }, { timeout: 60_000 });

        const returned = await hp.evaluate(() => {
          const host = document.querySelector('.dasha-studio-embed');
          const root = host?.shadowRoot || document;
          const line = root.querySelector('#line')?.value || '';
          let canvasOk = false;
          try {
            canvasOk = root.querySelector('#canvas')?.toDataURL()?.startsWith('data:image/png');
          } catch {
            /* ignore */
          }
          return {
            line,
            canvasOk,
            inbound: Boolean(root.querySelector('#remix-note') && !root.querySelector('#remix-note').hidden),
            hash: location.hash.slice(0, 160),
          };
        });
        step(
          'L5-return',
          returned.canvasOk &&
            (/Stranger|stranger/i.test(returned.line) || /Stranger|stranger/i.test(decodeURIComponent(returned.hash || ''))),
          returned,
        );

        if (returned.canvasOk) {
          await hp.evaluate(() => {
            const host = document.querySelector('.dasha-studio-embed');
            const root = host?.shadowRoot || document;
            const line = root.querySelector('#line');
            if (line) {
              line.value = 'Stranger return edit $dasha';
              line.dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
          await new Promise((r) => setTimeout(r, 250));
          const re = await hp.evaluate(() => {
            const host = document.querySelector('.dasha-studio-embed');
            const root = host?.shadowRoot || document;
            return { line: root.querySelector('#line')?.value || '' };
          });
          step('L5-re-edit', /return/i.test(re.line), re);
        }

        const hum = await hp.evaluate(() => {
          const host = document.querySelector('.dasha-studio-embed');
          const root = host?.shadowRoot || document;
          return /connect wallet|bag rank|wallet required/i.test(root.textContent || '');
        });
        step('L6-no-humiliation', !hum, { humiliation: hum });
      } finally {
        await hp.close().catch(() => {});
      }
    } else {
      step('L4-handoff', false, { skipped: true });
      step('L5-return', false, { skipped: true });
    }

    const craft = await rootEval(page, (root) => ({
      surprise: Boolean(root.querySelector('#surprise')),
      today: Boolean(root.querySelector('#ritual-today')),
    }));
    step('craft', craft.surprise && craft.today, craft);
  } catch (e) {
    step('threw', false, { error: String(e?.stack || e).slice(0, 500) });
  } finally {
    await page.close().catch(() => {});
    try {
      browser.disconnect();
    } catch {
      /* ignore */
    }
  }

  report.ms = Date.now() - t0;
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  return report;
}

async function cdpUp() {
  try {
    const r = await fetch(`${CDP}/json/version`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

const isMain =
  Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain || process.argv[1]?.endsWith('dasha-stranger-loop.mjs')) {
  if (!(await cdpUp())) {
    console.log(JSON.stringify({ ok: false, error: 'CDP unavailable', cdp: CDP }, null, 2));
    process.exit(2);
  }
  const r = await runStrangerLoop();
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}
