#!/usr/bin/env node
// Improved full audit: step-aware, skips welcome, checks vis>0, no bad statics, 90day presence, review populated, touch, next clickable, mobile/desktop.
// Screenshots per step for "recording". Run: node demigod-full-audit.mjs --local
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';
const OUT = '/home/potter/audit-shots/full-audit-' + Date.now();
fs.mkdirSync(OUT, {recursive:true});
const CORE = fs.readFileSync('demigod-foot-core.js', 'utf8');
const USE_LOCAL = process.argv.includes('--local');

async function run() {
  const browser = await puppeteer.connect({browserURL: CDP_URL, defaultViewport:null});
  const report = {desktop:{}, mobile:{}, issues:[], screenshots:[]};
  for (const [name, vp] of [['desktop', {width:1280,height:800}], ['mobile',{width:375,height:700,isMobile:true,hasTouch:true}]]) {
    const page = await browser.newPage();
    if (USE_LOCAL) {
      await page.setRequestInterception(true);
      page.on('request', r => r.url().includes('demigod-foot') ? r.respond({status:200,contentType:'application/javascript',body:CORE}) : r.continue());
    }
    await page.setViewport(vp);
    await page.goto('https://www.trydemigod.com', {waitUntil:'networkidle2'});
    await page.screenshot({path: `${OUT}/${name}-00-home.png`});
    report[name].steps = [];
    // Startup flow
    await page.evaluate(() => Array.from(document.querySelectorAll('a,button')).find(b=>/HIRE/i.test(b.textContent))?.click());
    await new Promise(r=>setTimeout(r,700));
    // Advance past welcome explicitly
    await page.evaluate(() => document.querySelector('#startup-modal .dg-wiz-next')?.click());
    await new Promise(r=>setTimeout(r,500));
    let step = 0;
    let atReview = false;
    while (step < 12 && !atReview) {
      // Fill current if input
      await page.evaluate(() => {
        const m = document.querySelector('#startup-modal');
        const inp = m?.querySelector('input:not([type=hidden]),textarea,select');
        if(inp && !inp.value) { inp.value = 'test'+Date.now().toString().slice(-4); inp.dispatchEvent(new Event('input',{bubbles:true})); }
        const n = m?.querySelector('.dg-wiz-next'); if(n) n.click();
      });
      await new Promise(r=>setTimeout(r,450));
      const st = await page.evaluate(() => {
        const m = document.querySelector('#startup-modal');
        const visInputs = Array.from(m?.querySelectorAll('input,textarea,select')||[]).filter(e=>e.offsetParent!==null).length;
        const q = (m?.querySelector('.dg-wiz-q')?.textContent||'').trim().slice(0,60);
        const bad = /HIRING FORM|EXAMPLE BRIEF/i.test(m?.textContent||'');
        const nextRect = m?.querySelector('.dg-wiz-next')?.getBoundingClientRect();
        const nextOk = !!(nextRect && nextRect.width > 30 && nextRect.height >= 30);
        const has90 = !!m?.querySelector('[name="90day-outcome"],[id="90day-outcome"]');
        const rev = m?.querySelector('.dg-wiz-review');
        const hasReview = !!(rev && rev.textContent && rev.textContent.trim().length > 5);
        const isReviewStep = /submit|review/i.test(q);
        const revHtml = rev ? rev.innerHTML : '';
        const has90First = /90day-outcome/i.test(revHtml.slice(0,200));
        const goldBorder = /#C9A84C/i.test(revHtml);
        return {step, q, vis:visInputs, bad, nextOk, has90, hasReview, isReviewStep, has90First, goldBorder };
      });
      const shot = `${OUT}/${name}-startup-step${step}.png`;
      await page.screenshot({path: shot});
      report[name].steps.push(st);
      report.screenshots.push(shot);
      if (st.vis === 0 || st.bad || !st.nextOk) report.issues.push(`${name} startup step${step}: ${JSON.stringify(st)}`);
      if (st.isReviewStep || st.hasReview) atReview = true;
      step++;
    }
    // Engineer
    await page.evaluate(() => { document.querySelector('#startup-modal [class*=close]')?.click(); Array.from(document.querySelectorAll('a,button')).find(b=>/JOIN/i.test(b.textContent))?.click(); });
    await new Promise(r=>setTimeout(r,600));
    await page.evaluate(() => document.querySelector('#jobseeker-modal .dg-wiz-next')?.click());
    await new Promise(r=>setTimeout(r,450));
    for(let i=0; i<6; i++) {
      await page.evaluate(() => {
        const m = document.querySelector('#jobseeker-modal');
        const inp = m?.querySelector('input:not([type=hidden]),textarea');
        if(inp && !inp.value) { inp.value='e'+Date.now().toString().slice(-4); inp.dispatchEvent(new Event('input',{bubbles:true})); }
        m?.querySelector('.dg-wiz-next')?.click();
      });
      await new Promise(r=>setTimeout(r,420));
      const st = await page.evaluate(() => {
        const m = document.querySelector('#jobseeker-modal');
        const visInputs = Array.from(m?.querySelectorAll('input,textarea,select')||[]).filter(e=>e.offsetParent!==null).length;
        const q = (m?.querySelector('.dg-wiz-q')?.textContent||'').trim().slice(0,60);
        const bad = /APPLICATION|EXAMPLE/i.test(m?.textContent||'');
        const nextRect = m?.querySelector('.dg-wiz-next')?.getBoundingClientRect();
        const nextOk = !!(nextRect && nextRect.width > 30 && nextRect.height >= 30);
        const rev = m?.querySelector('.dg-wiz-review');
        const hasReview = !!(rev && rev.textContent && rev.textContent.trim().length > 5);
        return {step:i, q, vis:visInputs, bad, nextOk, hasReview };
      });
      const shot = `${OUT}/${name}-engineer-step${i}.png`;
      await page.screenshot({path: shot});
      report[name].steps.push(st);
      report.screenshots.push(shot);
      if (st.vis === 0 || st.bad || !st.nextOk) report.issues.push(`${name} engineer step${i}: ${JSON.stringify(st)}`);
    }
    // Touch / labels
    const touchOk = Array.from(await page.$$eval('.dg-wiz-next,.dg-wiz-back', bs => bs.every(b => b.getBoundingClientRect().height >= 44)));
    report[name].touchTargets = touchOk;
    await page.close();
  }
  console.log('AUDIT REPORT:', JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
  if (report.issues.length) { console.log('ISSUES FOUND:', report.issues.length); report.issues.forEach(i=>console.log(' -',i)); } else console.log('NO ISSUES - clean run.');
  await browser.disconnect();
}
run().catch(console.error);
