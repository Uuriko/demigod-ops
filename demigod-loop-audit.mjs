#!/usr/bin/env node
/**
 * demigod-loop-audit.mjs — single-conn robust audit + "screen recording" via seq shots.
 * Usage: node demigod-loop-audit.mjs --local   (for source intercept)
 * Always: cleans excess tabs first, reuses 1 page, full both forms traversal (desktop), checks 90d-first + gold review + formD + no bad titles.
 * Writes report + updates keep-going.md + dated shots in audit-shots/loopN-*
 * Designed to simplify loops: one command for visibility + feedback.
 */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';
import path from 'path';

const USE_LOCAL = process.argv.includes('--local');
const CORE = fs.readFileSync('demigod-foot-core.js', 'utf8');
const TS = Date.now();
const OUT = path.join('/home/potter/audit-shots', `loop-audit-${TS}`);
fs.mkdirSync(OUT, {recursive: true});

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function cleanTabs(browser) {
  try {
    const pages = await browser.pages();
    let closed = 0;
    for (let i = pages.length-1; i >= 0; i--) {
      const u = pages[i].url();
      if ((u.includes('trydemigod') && i > 0) || u.includes('grok.com') || u.includes('about:blank')) {
        try { await pages[i].close(); closed++; } catch(e){}
      }
    }
    return closed;
  } catch(e) { return 0; }
}

async function run() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: {width: 1100, height: 820}, protocolTimeout: 90000 });
  const closed = await cleanTabs(browser);
  console.log('tabs cleaned:', closed);
  let page = (await browser.pages()).find(p => p.url().includes('trydemigod')) || (await browser.pages())[0];
  if (!page) {
    page = await browser.newPage();
  }
  if (USE_LOCAL) {
    await page.setRequestInterception(true).catch(()=>{});
    page.removeAllListeners('request');
    page.on('request', r => {
      if (r.url().includes('demigod-foot') || (r.url().includes('catbox') && r.url().endsWith('.js'))) {
        r.respond({status:200, contentType:'application/javascript', body: CORE});
      } else r.continue();
    });
  }
  const results = { ts: TS, useLocal: USE_LOCAL, startup: {}, engineer: {}, shots: [], issues: [] };

  // HOME
  try { await page.goto('https://www.trydemigod.com?' + TS, {waitUntil:'domcontentloaded', timeout:30000}); } catch(e){}
  await wait(300);
  await page.screenshot({path: path.join(OUT, '00-home.png')}); results.shots.push('00-home');

  // STARTUP
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('a,button,[data-demigod-modal]')).find(x => /HIRE|TALENT/i.test(x.textContent||''));
    if (b) b.click();
  });
  await wait(600);
  await page.screenshot({path: path.join(OUT, '01-startup-open.png')}); results.shots.push('01-startup-open');

  // Advance through to review (include 90d)
  for (let i=0; i<12; i++) {
    await page.evaluate(() => {
      const m = document.querySelector('#startup-modal');
      if (!m) return;
      m.querySelectorAll('input,textarea,select').forEach(el => { if (el.offsetParent) { el.value = 'sval'+Date.now().toString(36).slice(-3); el.dispatchEvent(new Event('input',{bubbles:true})); }});
      const n = m.querySelector('.dg-wiz-next'); if (n) n.click();
    });
    await wait(180);
    const st = await page.evaluate(() => {
      const m = document.querySelector('#startup-modal');
      if (!m) return {};
      const rev = m.querySelector('.dg-wiz-review');
      const q = (m.querySelector('.dg-wiz-q')||{}).textContent || '';
      return {
        hasRev: !!(rev && rev.textContent.trim().length > 4),
        has90First: !!(rev && /90day-outcome|first 90 days/i.test(rev.innerHTML.slice(0,250))),
        gold: !!(rev && rev.innerHTML.includes('#C9A84C')),
        formD: m.querySelector('form') ? getComputedStyle(m.querySelector('form')).display : 'n/a',
        badTitle: /CANDIDATE APPLICATION|HIRING FORM|BRIEFS/i.test((m.textContent||'') + document.title),
        q: q.slice(0,50)
      };
    });
    results.startup['step'+i] = st;
    if (st.hasRev) {
      await page.screenshot({path: path.join(OUT, '02-startup-review.png')}); results.shots.push('02-startup-review');
      break;
    }
  }
  const finalSt = results.startup[Object.keys(results.startup).pop()] || {};
  if (!finalSt.has90First || !finalSt.gold || finalSt.formD === 'none' || finalSt.badTitle) {
    results.issues.push('startup-review: ' + JSON.stringify(finalSt));
  }

  // Close startup, open eng
  await page.evaluate(() => { const m=document.querySelector('#startup-modal'); if(m) m.style.display='none'; });
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('a,button,[data-demigod-modal]')).find(x => /JOIN|NETWORK/i.test(x.textContent||''));
    if (b) b.click();
  });
  await wait(500);
  await page.screenshot({path: path.join(OUT, '03-eng-open.png')}); results.shots.push('03-eng-open');

  for (let i=0; i<10; i++) {
    await page.evaluate(() => {
      const m = document.querySelector('#jobseeker-modal');
      if (!m) return;
      m.querySelectorAll('input,textarea,select').forEach(el => { if (el.offsetParent) { el.value = 'eval'; el.dispatchEvent(new Event('input',{bubbles:true})); }});
      const n = m.querySelector('.dg-wiz-next'); if (n) n.click();
    });
    await wait(120);
    const st = await page.evaluate(() => {
      const m = document.querySelector('#jobseeker-modal');
      if (!m) return {};
      const rev = m.querySelector('.dg-wiz-review');
      return {
        hasRev: !!(rev && rev.textContent.trim().length > 4),
        formD: m.querySelector('form') ? getComputedStyle(m.querySelector('form')).display : 'n/a',
        badTitle: /CANDIDATE APPLICATION|BRIEFS/i.test((m.textContent||'') + document.title)
      };
    });
    results.engineer['step'+i] = st;
    if (st.hasRev) {
      await page.screenshot({path: path.join(OUT, '04-eng-review.png')}); results.shots.push('04-eng-review');
      break;
    }
  }
  const f2 = results.engineer[Object.keys(results.engineer).pop()] || {};
  if (!f2.hasRev || f2.formD==='none' || f2.badTitle) results.issues.push('eng-review: ' + JSON.stringify(f2));

  await browser.disconnect();

  // Report
  const reportPath = path.join(OUT, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('AUDIT DONE. report:', reportPath);
  console.log('startup final:', JSON.stringify(finalSt));
  console.log('eng final:', JSON.stringify(f2));
  console.log('issues:', results.issues.length ? results.issues : 'none');

  // Append to keep-going (simple)
  const kg = '/home/potter/demigod-keep-going.md';
  let kgtxt = '';
  try { kgtxt = fs.readFileSync(kg, 'utf8'); } catch(e){}
  const entry = `\n\n### Loop-audit ${new Date().toISOString()} (source=${USE_LOCAL})\n- startup: ${JSON.stringify(finalSt)}\n- eng: ${JSON.stringify(f2)}\n- issues: ${results.issues.join('; ') || 'clean'}\n- shots: ${results.shots.join(', ')}\n`;
  fs.appendFileSync(kg, entry);
  console.log('keep-going updated');
}

run().catch(e => { console.error('loop-audit fail', e.message); process.exit(1); });
