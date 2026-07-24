#!/usr/bin/env node
/** Live browser defect sweep: console errors, failed requests, invisible elements. */
import fs from 'fs';
import { connectBrowser } from './collab-lib.mjs';
import { appendNovelFindings } from './demigod-live-lib.mjs';

const PAGES = ['https://www.trydemigod.com/', 'https://www.trydemigod.com/?p=events', 'https://www.trydemigod.com/?p=mud'];
const FINDINGS_LOG = '/tmp/dg-busy/dg-findings.jsonl';
const RECEIPT = '/tmp/dg-busy/claude-yolo-last.json';

function appendFinding(f) {
  // Novel-only — same CORS/console defects re-appended every sweep otherwise.
  appendNovelFindings(FINDINGS_LOG, [{ at: new Date().toISOString(), task: 'live-browser-defect-sweep', ...f }]);
}

async function sweepPage(browser, url) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push({ url: res.url(), status: res.status() });
  });

  // page.on('console') misses browser-native errors (CORS blocks, mixed-content) —
  // those only surface via the CDP Log domain, not Runtime.consoleAPICalled.
  const cdp = await page.createCDPSession();
  await cdp.send('Log.enable');
  cdp.on('Log.entryAdded', (entry) => {
    if (entry.entry.level === 'error') consoleErrors.push(`[Log] ${entry.entry.text}`);
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  // events-bot config load (3.5s timeout) + tunnel health probe chain can fire well after
  // networkidle2 resolves — a short wait here false-negatives a known CORS finding.
  await new Promise((r) => setTimeout(r, 12000));

  const invisible = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const cs = getComputedStyle(el);
      const op = parseFloat(cs.opacity);
      if (op < 0.05 && cs.visibility !== 'hidden' && cs.display !== 'none') {
        out.push({
          tag: el.tagName,
          id: el.id || null,
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 80) : null,
          text: (el.textContent || '').trim().slice(0, 80),
          opacity: op,
        });
      }
    }
    return out.slice(0, 20);
  });

  await page.close();
  return { url, consoleErrors, failedRequests, invisible };
}

async function main() {
  const browser = await connectBrowser();
  const results = [];
  for (const url of PAGES) {
    console.log(`sweeping ${url}`);
    const r = await sweepPage(browser, url);
    results.push(r);
  }
  await browser.disconnect();

  let findingCount = 0;
  for (const r of results) {
    for (const e of r.consoleErrors) {
      appendFinding({ finding: `console error on ${r.url}`, evidence: e, severity: 'P2' });
      findingCount++;
    }
    for (const f of r.failedRequests) {
      appendFinding({ finding: `failed request on ${r.url}`, evidence: JSON.stringify(f), severity: 'P2' });
      findingCount++;
    }
    for (const inv of r.invisible) {
      appendFinding({ finding: `invisible element (opacity<0.05) on ${r.url}`, evidence: JSON.stringify(inv), severity: 'P3' });
      findingCount++;
    }
  }
  if (findingCount === 0) {
    appendFinding({ finding: 'zero defects found across all 3 pages (console/network/invisible-element sweep)', evidence: JSON.stringify(results.map(r => r.url)), severity: 'info' });
  }

  const receipt = { at: new Date().toISOString(), task: 'live-browser-defect-sweep', pages: PAGES, results, findingCount };
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
