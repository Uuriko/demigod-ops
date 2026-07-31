/**
 * Create Webflow static shells via Designer: open Pages → Create page → set name/slug → create → publish.
 */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';

const SLUGS = [
  { slug: 'refer', name: 'Refer' },
  { slug: 'referral', name: 'Referral' },
  { slug: 'partners', name: 'Partners' },
  { slug: 'map', name: 'Map' },
  { slug: 'press', name: 'Press' },
];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setNative(el, v) {
  el.focus();
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc?.set) desc.set.call(el, v);
  else el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null, protocolTimeout: 300000 });
const pages = await browser.pages();
let page = pages.find((p) => /design\.webflow\.com/.test(p.url()));
if (!page) {
  page = await browser.newPage();
  await page.goto('https://talentlink-sf.design.webflow.com/', { waitUntil: 'domcontentloaded', timeout: 90000 });
}
await page.bringToFront();
await page.keyboard.press('Escape');
await wait(400);

const results = [];

async function openPagesPanel() {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /^Pages/i.test(b.getAttribute('aria-label') || ''));
    if (btn) btn.click();
  });
  await wait(900);
}

async function listed(slug) {
  return page.evaluate((slug) => {
    // Look in pages panel list only — avoid false positives
    const panel = [...document.querySelectorAll('div,aside,section')].find((el) => {
      const t = el.innerText || '';
      return t.includes('Create page') && t.includes('Utility pages') && t.includes('Static');
    });
    const text = panel?.innerText || document.body.innerText || '';
    // match line-ish
    return text.split('\n').some((line) => line.trim().toLowerCase() === slug.toLowerCase() || line.trim().toLowerCase() === slug.toLowerCase().replace(/-/g, ' '));
  }, slug);
}

for (const { slug, name } of SLUGS) {
  const rec = { slug, name };
  try {
    await openPagesPanel();
    await wait(500);
    if (await listed(slug)) {
      rec.ok = true;
      rec.skipped = true;
      results.push(rec);
      console.log('skip', slug);
      continue;
    }
    // Click exact "Create page" (not AI / template)
    const clicked = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('button,[role=button],div[role=button],a')];
      // prefer exact text Create page
      let btn = nodes.find((b) => (b.textContent || '').trim() === 'Create page');
      if (!btn) btn = nodes.find((b) => /Create page$/i.test((b.textContent || '').trim()) && !/AI|template/i.test(b.textContent || ''));
      if (!btn) return null;
      btn.click();
      return (btn.textContent || '').trim();
    });
    rec.clicked = clicked;
    await wait(1200);

    // Type into focused/visible inputs — Webflow often uses name first then slug auto
    const fill = await page.evaluate(({ name, slug }) => {
      const vis = [...document.querySelectorAll('input')].filter((i) => {
        const r = i.getBoundingClientRect();
        const st = getComputedStyle(i);
        return r.width > 20 && r.height > 8 && st.visibility !== 'hidden' && st.display !== 'none' && !i.disabled;
      });
      const set = (el, v) => {
        if (!el) return false;
        el.focus();
        el.select?.();
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc?.set) desc.set.call(el, v);
        else el.value = v;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: v, inputType: 'insertText' }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      // Prefer empty text inputs that aren't search
      const fields = vis.filter((i) => i.type === 'text' || i.type === '' || !i.type);
      const nonSearch = fields.filter((i) => !/search/i.test(i.placeholder || ''));
      const nameIn = nonSearch[0] || fields[0];
      const slugIn = nonSearch[1] || fields[1];
      const nameOk = set(nameIn, name);
      // slug may auto-fill from name; force if present
      let slugOk = false;
      if (slugIn) slugOk = set(slugIn, slug);
      return {
        vis: vis.length,
        fields: fields.map((i) => ({ ph: i.placeholder, aria: i.getAttribute('aria-label'), val: i.value })),
        nameOk,
        slugOk,
      };
    }, { name, slug });
    rec.fill = fill;
    await wait(400);

    // If only one field, name is set; open page settings for slug after create
    const created = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button,[role=button]')];
      const order = ['Create page', 'Create', 'Add page', 'Save', 'Done'];
      for (const label of order) {
        const btn = btns.find((b) => (b.textContent || '').trim() === label || (b.getAttribute('aria-label') || '').trim() === label);
        if (btn && !btn.disabled) {
          btn.click();
          return label;
        }
      }
      return null;
    });
    rec.createBtn = created;
    if (!created) await page.keyboard.press('Enter');
    await wait(2000);

    // After create, try set slug in page settings (gear)
    await page.evaluate((slug) => {
      // open settings if slug field visible
      const inputs = [...document.querySelectorAll('input')].filter((i) => {
        const r = i.getBoundingClientRect();
        return r.width > 20 && r.height > 8;
      });
      const slugIn = inputs.find((i) => /slug|path|url/i.test((i.getAttribute('aria-label') || '') + i.placeholder + i.name));
      if (slugIn) {
        slugIn.focus();
        const proto = Object.getPrototypeOf(slugIn);
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc?.set) desc.set.call(slugIn, slug);
        else slugIn.value = slug;
        slugIn.dispatchEvent(new Event('input', { bubbles: true }));
        slugIn.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, slug);
    await wait(500);
    rec.ok = true;
    rec.listedAfter = await listed(slug);
  } catch (e) {
    rec.ok = false;
    rec.error = String(e?.message || e);
  }
  results.push(rec);
  console.log(JSON.stringify(rec));
}

// Publish
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const pub = btns.find((b) => (b.textContent || '').trim() === 'Publish' || /Publish/i.test(b.getAttribute('aria-label') || ''));
  if (pub) pub.click();
});
await wait(1500);
const pub2 = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const candidates = btns.filter((b) => /Publish to selected domains|Publish to selected|Publish site/i.test((b.textContent || '').trim()));
  const btn = candidates[0] || btns.find((b) => (b.textContent || '').trim() === 'Publish' && b.getBoundingClientRect().width > 80);
  if (btn) { btn.click(); return (btn.textContent || '').trim().slice(0, 50); }
  return null;
});
await wait(8000);
const snap = await page.evaluate(() => (document.body.innerText || '').slice(0, 800));
const receipt = { at: new Date().toISOString(), results, publish: pub2, snap };
fs.writeFileSync('/tmp/dg-busy/shell-pages-create.json', JSON.stringify(receipt, null, 2));
console.log('PUBLISH', pub2);
console.log('SNAP', snap.slice(0, 400));
try { browser.disconnect(); } catch {}
