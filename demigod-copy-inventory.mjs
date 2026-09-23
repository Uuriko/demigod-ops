#!/usr/bin/env node
/**
 * Copy inventory from a local source, or from the live site when no local source is planted.
 * Writes DEMIGOD-STATIC-TEXT-INVENTORY.json in DEMIGOD_ROOT. The command does not publish.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const localFlags = { sent: false, liveMail: false, livePublish: false };
const hiddenMarkers = [
  'THE METHODOLOGY', 'METHODOLOGY', 'CURATED INSIGHTS', 'HIRING MADE SIMPLE', 'CONNECT WITH HIRING',
  'GET IN TOUCH', 'pantheon', 'ATHENA', 'HEPHAESTUS', 'FORGE', 'SUMMON', 'SYNDICATE', 'SUBSCRIPTION',
  'TalentLink', 'POST A JOB', 'demigod.ai', 'hello@demigod', 'Two buttons', 'Oops', 'Hermes',
  'Welcome to the pantheon', 'CALL HAS BEEN HEARD', 'Email Form', 'Test Form', 'edtech', '415-555',
  '101 Web Lane', 'GET JOB', 'FIND TALENT', 'HIRE TALENT', 'JOIN NETWORK', 'ELITE SYNDICATE',
  'SUMMON DIVINE', 'perfect demigod', 'DIVINE TALENT', 'Syndicate Subscription',
];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}
function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}
function reportPath() {
  return path.join(dataRoot(), 'DEMIGOD-STATIC-TEXT-INVENTORY.json');
}
function liveOrigin() {
  return process.env.DEMIGOD_LIVE || 'https://www.trydemigod.com';
}
function cdpUrl() {
  return process.env.CDP_URL || 'http://127.0.0.1:9223';
}

function readLocal(name) {
  const file = path.join(dataRoot(), name);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

async function loadSources() {
  const html = readLocal('demigod-copy-source.html');
  const footerCoreJs = readLocal('demigod-foot-core.js');
  if (html != null || footerCoreJs != null) {
    return {
      html: html || '',
      footerCoreJs: footerCoreJs || '',
      source: 'disk',
      url: html != null ? path.join(dataRoot(), 'demigod-copy-source.html') : null,
    };
  }
  const origin = liveOrigin();
  if (!/trydemigod\.com/i.test(origin)) {
    return { html: '', footerCoreJs: '', source: 'disk', url: origin };
  }
  const { fetchLiveHtml } = await import('./demigod-live-lib.mjs');
  const live = await fetchLiveHtml(false);
  return { html: live.html || '', footerCoreJs: live.footerCoreJs || '', source: 'live', url: live.url };
}

async function hiddenFromBrowser(url) {
  try {
    const { default: puppeteer } = await import('puppeteer-core');
    const browser = await puppeteer.connect({
      browserURL: cdpUrl(),
      defaultViewport: { width: 1400, height: 900 },
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3500));
    const hiddenSections = await page.evaluate(() => {
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
    return hiddenSections;
  } catch (e) {
    return [{ error: String(e.message || e) }];
  }
}

function textBlocks(html) {
  const texts = new Set();
  const re = />([^<]{3,240})</g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (t && !/^\s*$/.test(t)) texts.add(t);
  }
  return [...texts].sort();
}

async function main() {
  const loaded = await loadSources();
  const { html, footerCoreJs } = loaded;
  const placeholders = [...html.matchAll(/placeholder="([^"]+)"/g)].map((x) => x[1]);
  const metas = [...html.matchAll(/<meta[^>]+(?:name|property)="([^"]+)"[^>]+content="([^"]+)"/gi)]
    .map((x) => ({ key: x[1], content: x[2] }));
  const leakMarkersFound = hiddenMarkers.filter((mk) => new RegExp(mk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html));
  const hiddenSections = loaded.source === 'live' && loaded.url
    ? await hiddenFromBrowser(loaded.url)
    : [];
  const copyFromJs = {};
  for (const key of ['heroSub', 'badge', 'ctaFounder', 'ctaEngineer', 'navCta', 'startupH2', 'startupBody',
    'engineerH2', 'engineerBody', 'feeNote', 'pricingNote', 'footerTag', 'trustKicker']) {
    const mm = footerCoreJs.match(new RegExp(`${key}:'([^']*)'`));
    if (mm) copyFromJs[key] = mm[1];
  }
  const trustSteps = footerCoreJs.match(/trustSteps:\[([^\]]+)\]/)?.[1]
    ?.split(',').map((s) => s.replace(/['"]/g, '').trim()) || [];
  const footMarker = (footerCoreJs.match(/Harbor \S+ keep/) || html.match(/Harbor \S+ keep/) || [''])[0];
  const out = {
    at: new Date().toISOString(),
    path: reportPath(),
    source: loaded.source,
    url: loaded.url,
    footMarker,
    footCoreVersion: (footerCoreJs.match(/dg-foot-v(\d+)-core/) || [])[1] || null,
    runtimeCopy: { ...copyFromJs, trustSteps },
    successMessages: {
      startup: footerCoreJs.match(/STARTUP_OK='([^']*)'/)?.[1] || null,
      engineer: footerCoreJs.match(/ENGINEER_OK='([^']*)'/)?.[1] || null,
    },
    privacyNote: 'We never blast your profile. Humans review every application.',
    staticTextBlocks: textBlocks(html),
    staticPlaceholders: placeholders,
    staticMetas: metas,
    leakMarkersInStaticHtml: leakMarkersFound,
    hiddenAndVisibleSections: hiddenSections,
    ...localFlags,
  };
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    ok: true,
    path: out.path,
    source: out.source,
    footMarker,
    staticBlocks: out.staticTextBlocks.length,
    leaks: leakMarkersFound.length,
    sections: hiddenSections.length,
    version: out.footCoreVersion,
    ...localFlags,
  }));
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.includes('--publish')) {
    console.error(JSON.stringify({ ok: false, error: 'publish_refused', ...localFlags }));
    process.exit(1);
  }
  main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: 'inventory_failed', detail: String(e.message || e), ...localFlags }));
    process.exit(1);
  });
}
