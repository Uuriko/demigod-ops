#!/usr/bin/env node
/** Full copy inventory: static HTML + hidden DOM + runtime-injected. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const ROOT = '/home/potter';
const LIVE = `https://www.trydemigod.com/?v=copy-inv-${Date.now()}`;

const { html, footerCoreJs } = await fetchLiveHtml(false);

const texts = new Set();
const re = />([^<]{3,240})</g;
let m;
while ((m = re.exec(html)) !== null) {
  const t = m[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  if (t && !/^\s*$/.test(t)) texts.add(t);
}
const placeholders = [...html.matchAll(/placeholder="([^"]+)"/g)].map((x) => x[1]);
const metas = [...html.matchAll(/<meta[^>]+(?:name|property)="([^"]+)"[^>]+content="([^"]+)"/gi)]
  .map((x) => ({ key: x[1], content: x[2] }));

const hiddenMarkers = [
  'THE METHODOLOGY', 'METHODOLOGY', 'CURATED INSIGHTS', 'HIRING MADE SIMPLE', 'CONNECT WITH HIRING',
  'GET IN TOUCH', 'pantheon', 'ATHENA', 'HEPHAESTUS', 'FORGE', 'SUMMON', 'SYNDICATE', 'SUBSCRIPTION',
  'TalentLink', 'POST A JOB', 'demigod.ai', 'hello@demigod', 'Two buttons', 'Oops', 'Hermes',
  'Welcome to the pantheon', 'CALL HAS BEEN HEARD', 'Email Form', 'Test Form', 'edtech', '415-555',
  '101 Web Lane', 'GET JOB', 'FIND TALENT', 'HIRE TALENT', 'JOIN NETWORK', 'ELITE SYNDICATE',
  'SUMMON DIVINE', 'perfect demigod', 'DIVINE TALENT', 'Syndicate Subscription',
];
const leakMarkersFound = hiddenMarkers.filter((mk) => new RegExp(mk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html));

let hiddenSections = [];
try {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', defaultViewport: { width: 1400, height: 900 } });
  const page = await browser.newPage();
  await page.goto(LIVE, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  hiddenSections = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('section,main>div,footer,nav,.w-nav,#startup-modal,#jobseeker-modal')) {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length < 25) continue;
      const s = getComputedStyle(el);
      const hidden = s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') < 0.05;
      const h = el.querySelector('h1,h2,h3')?.textContent?.trim() || t.slice(0, 60);
      out.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        class: (el.className || '').slice(0, 80),
        hidden,
        headline: h.slice(0, 100),
        len: t.length,
        snippet: t.slice(0, 350),
      });
    }
    return out.sort((a, b) => Number(a.hidden) - Number(b.hidden));
  });
  await page.close().catch(() => {});
  await browser.disconnect();
} catch (e) {
  hiddenSections = [{ error: String(e.message) }];
}

const copyFromJs = {};
for (const key of ['heroSub', 'badge', 'ctaFounder', 'ctaEngineer', 'navCta', 'startupH2', 'startupBody',
  'engineerH2', 'engineerBody', 'feeNote', 'pricingNote', 'trustKicker']) {
  const mm = footerCoreJs.match(new RegExp(`${key}:'([^']*)'`));
  if (mm) copyFromJs[key] = mm[1];
}
const trustSteps = footerCoreJs.match(/trustSteps:\[([^\]]+)\]/)?.[1]
  ?.split(',').map((s) => s.replace(/['"]/g, '').trim()) || [];

const out = {
  at: new Date().toISOString(),
  url: LIVE,
  footCoreVersion: (footerCoreJs.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
  runtimeCopy: { ...copyFromJs, trustSteps },
  successMessages: {
    startup: footerCoreJs.match(/STARTUP_OK='([^']*)'/)?.[1],
    engineer: footerCoreJs.match(/ENGINEER_OK='([^']*)'/)?.[1],
  },
  privacyNote: 'We never blast your profile. Humans review every application.',
  staticTextBlocks: [...texts].sort(),
  staticPlaceholders: placeholders,
  staticMetas: metas,
  leakMarkersInStaticHtml: leakMarkersFound,
  hiddenAndVisibleSections: hiddenSections,
};

fs.writeFileSync(path.join(ROOT, 'DEMIGOD-STATIC-TEXT-INVENTORY.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  staticBlocks: out.staticTextBlocks.length,
  leaks: leakMarkersFound.length,
  sections: hiddenSections.length,
  version: out.footCoreVersion,
}));
