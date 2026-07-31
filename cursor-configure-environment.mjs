#!/usr/bin/env node
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 90000 });
const page = (await browser.pages()).find((p) => p.url().includes('cursor.com'));
await page.bringToFront();

await page.goto('https://cursor.com/dashboard/cloud-agents', { waitUntil: 'networkidle2', timeout: 60000 });

// Click environment row to configure existing one
const opened = await page.evaluate(() => {
  const link = [...document.querySelectorAll('a')].find((a) =>
    (a.getAttribute('href') || '').includes('crispy-garbanzo')
  );
  if (link) { link.click(); return 'env-detail'; }
  const btn = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === 'New');
  btn?.click();
  return 'new-modal';
});
console.log('open:', opened);
await new Promise((r) => setTimeout(r, 3000));

if (opened === 'new-modal') {
  // Click checkbox/input near crispy-garbanzo
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const row = all.find((el) => el.childElementCount < 8 && (el.innerText || '') === 'Uuriko/crispy-garbanzo');
    const input = row?.querySelector('input[type="checkbox"]') || row?.parentElement?.querySelector('input');
    if (input) input.click();
    else row?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const cont = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /^Continue$/i.test((b.innerText || '').trim()));
    if (!btn) return { ok: false, disabled: true };
    btn.click();
    return { ok: true, disabled: btn.disabled };
  });
  console.log('continue:', cont);
  await new Promise((r) => setTimeout(r, 4000));
}

await page.screenshot({ path: '/home/potter/cursor-env-configured.png' });
console.log('url:', page.url());
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1200));
await browser.disconnect();