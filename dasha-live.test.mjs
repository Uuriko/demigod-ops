#!/usr/bin/env node
/**
 * Production gate. Checks what getdasha.com actually serves, not what the sources say it should.
 *
 * Written after 2026-08-08, when the Studio's CC0 dedication was live, was silently dropped by a
 * republish, and stayed gone for hours. Every other gate in this repo passed the whole time,
 * because every other gate reads local files. The failure lived in the gap between source and site,
 * and nothing was watching it.
 *
 * So this asserts only things that would be quietly damaging if they disappeared:
 *   - the mint, which is the one string where being wrong costs someone money;
 *   - the promises we make in public (public domain, total-loss risk, no likeness permission);
 *   - the absence of the permanently retired product;
 *   - that the Studio actually mounts and can still export an image.
 *
 * It is deliberately not a design test. Copy changes, looks come and go — that is normal. This
 * fails only when something is wrong in a way a visitor would be harmed or misled by.
 *
 *   node dasha-live.test.mjs           # needs CDP Chrome on :9223, and the internet
 *   node dasha-live.test.mjs --staging # check the staging domain instead
 */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const ORIGIN = process.argv.includes('--staging')
  ? 'https://johns-awesome-project-39b1b5.webflow.io'
  : 'https://www.getdasha.com';

/* GitHub Pages serves a second live public copy of the Desk, deployed by CI on every push to main.
   Nothing was watching it: dasha-release-contract.json lists only the Webflow hosts, so this surface
   could drift or lose its risk disclosures and no gate would notice. It is checked here because it
   is public, not because it is primary. */
const PAGES = 'https://uuriko.github.io/dasha-desk/';

const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
/* The scrapped product. If any of these resurface on a live route, something republished an
   archived source — the same class of accident that caused the CC0 regression. */
const RETIRED = /\b(thesis card|conviction receipt|forecasting)\b/i;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

for (const route of ['/', '/studio', '/dasha']) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 90)));
  await page.setViewport({ width: 1280, height: 900 });
  const response = await page.goto(ORIGIN + route, { waitUntil: 'networkidle2', timeout: 45000 });
  // 304 is a cache revalidation, not an error — the page still rendered.
  check([200, 304].includes(response.status()), `${route}: HTTP ${response.status()}`);
  await new Promise((r) => setTimeout(r, 1200));

  const seen = await page.evaluate(() => {
    const root = document.querySelector('.dasha-studio-embed')?.shadowRoot;
    const text = document.body.innerText + (root ? ' ' + root.textContent : '');
    return {
      text,
      icons: [...document.querySelectorAll('link[rel~="icon"]')].map((l) => l.href),
      studioMounted: !!root,
      wrongMint: [...text.matchAll(/[1-9A-HJ-NP-Za-km-z]{32,44}pump/g)].map((m) => m[0]),
    };
  });

  // The mint: any pump-suffixed address on our own pages must be ours.
  for (const found of seen.wrongMint) {
    check(found === MINT, `${route}: shows a mint that is not ours — ${found}`);
  }
  check(!RETIRED.test(seen.text), `${route}: the retired product reappeared in live copy`);

  // The retired Dasha Labs icon was a 32-unit viewBox; ours is 64. Catches an old icon coming back.
  check(!seen.icons.some((h) => h.includes('0%2032%2032')),
    `${route}: the retired favicon is live again`);
  check(seen.icons.length > 0, `${route}: no favicon at all`);

  check(errors.length === 0, `${route}: console errors — ${errors[0] || ''}`);

  if (route === '/studio') {
    check(seen.studioMounted, '/studio: the Studio did not mount');
    // The public promises. Each was live and is load-bearing; losing one silently is the bug.
    check(/CC0/.test(seen.text), '/studio: the CC0 dedication is missing — makers have no statement of their rights');
    check(/name or likeness/i.test(seen.text), '/studio: the likeness carve-out is missing');
    check(/can go to zero|lose all/i.test(seen.text), '/studio: the total-loss disclosure is missing');
    check(!/not affiliated with dasha/i.test(seen.text),
      '/studio: claims no affiliation, which is false — this is the official project');

    if (seen.studioMounted) {
      const png = await page.evaluate(async () => {
        const root = document.querySelector('.dasha-studio-embed').shadowRoot;
        const blob = await new Promise((r) => root.querySelector('#canvas').toBlob(r, 'image/png'));
        return blob.size;
      });
      check(png > 5000, `/studio: canvas exported only ${png} bytes — the tool is broken`);
    }
  }

  if (route === '/dasha' || route === '/') {
    check(seen.text.includes(MINT), `${route}: the mint is not shown`);
  }

  await page.close();
}

/* The Pages copy of the Desk. Same standard as the Webflow one: the mint must be right and the risk
   language must be present, because a visitor cannot tell which deployment they landed on. */
{
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 90)));
  await page.setViewport({ width: 1280, height: 900 });
  const response = await page.goto(PAGES, { waitUntil: 'networkidle2', timeout: 45000 });
  check([200, 304].includes(response.status()), `pages: HTTP ${response.status()}`);
  await new Promise((r) => setTimeout(r, 1200));
  const seen = await page.evaluate(() => document.body.innerText);
  check(seen.includes(MINT), 'pages: the mint is not shown');
  check(/can go to zero|lose all/i.test(seen), 'pages: no total-loss disclosure');
  check(/not financial advice/i.test(seen), 'pages: no "not financial advice"');
  check(!RETIRED.test(seen), 'pages: the retired product reappeared');
  const foreign = [...seen.matchAll(/[1-9A-HJ-NP-Za-km-z]{32,44}pump/g)]
    .map((m) => m[0]).filter((a) => a !== MINT);
  check(foreign.length === 0, `pages: shows a mint that is not ours — ${foreign[0] || ''}`);
  check(errors.length === 0, `pages: console errors — ${errors[0] || ''}`);
  console.log(`pages    served, mint ${seen.includes(MINT) ? 'ok' : 'MISSING'}`);
  await page.close();
}

await browser.disconnect();

if (failures.length) {
  console.error(`Dasha live: ${failures.length} FAILURE(S) on ${ORIGIN}\n`);
  for (const f of failures) console.error('  · ' + f);
  process.exit(1);
}
console.log(`Dasha live: PASS (${ORIGIN} — mint, promises, favicon, no retired product, Studio exports)`);
