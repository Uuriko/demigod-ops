#!/usr/bin/env node
// Robust full user traversal: both forms, desktop+mobile, all WIZ steps (incl 90day + explicit review), state checks + seq screenshots.
// Run: node demigod-user-traversal.mjs --local
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';
import path from 'path';

const OUT = '/home/potter/audit-shots/user-trav-' + Date.now();
fs.mkdirSync(OUT, {recursive:true});
const CORE = fs.readFileSync('demigod-foot-core.js', 'utf8');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runOne(page, kind, ctaText, steps, label) {
  const modal = kind === 'startup' ? '#startup-modal' : '#jobseeker-modal';
  const states = [];
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(15000);
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().includes('demigod-foot') || (r.url().includes('catbox') && r.url().endsWith('.js'))) {
      r.respond({status:200, contentType:'application/javascript', body: CORE});
    } else r.continue();
  });
  try {
    await page.goto('https://www.trydemigod.com?' + Date.now(), {waitUntil:'domcontentloaded', timeout:45000});
  } catch(e) { console.log('goto soft fail, continuing with dom'); await page.waitForSelector('body', {timeout:10000}).catch(()=>{}); }
  await page.screenshot({path: path.join(OUT, `${label}-00-home.png`)});

  // Open modal by text
  await page.evaluate((txt) => {
    const btns = Array.from(document.querySelectorAll('a,button,[data-demigod-modal]'));
    const b = btns.find(x => (x.textContent||'').toUpperCase().includes(txt));
    if (b) b.click();
  }, ctaText);
  await wait(700);
  await page.screenshot({path: path.join(OUT, `${label}-01-open.png`)});

  for (let i = 0; i < steps.length; i++) {
    const key = steps[i];
    // Fill visible fields
    await page.evaluate((mSel) => {
      const m = document.querySelector(mSel);
      if (!m) return;
      m.querySelectorAll('input:not([type=hidden]):not([type=file]),textarea,select').forEach((el, j) => {
        if (!el.offsetParent) return;
        if (el.tagName === 'SELECT') { el.selectedIndex = Math.min(1, el.options.length-1); }
        else { el.value = 'tval' + Date.now().toString(36) + j; }
        el.dispatchEvent(new Event('input', {bubbles:true}));
      });
    }, modal);
    await wait(100);

    // State
    const st = await page.evaluate((mSel) => {
      const m = document.querySelector(mSel);
      if (!m) return {err:1};
      const qel = m.querySelector('.dg-wiz-q');
      const q = qel ? qel.textContent.trim().slice(0,55) : '';
      const vis = Array.from(m.querySelectorAll('input:not([type=hidden]),textarea,select')).filter(e => !!e.offsetParent).length;
      const n = m.querySelector('.dg-wiz-next');
      const nr = n ? n.getBoundingClientRect() : null;
      const bad = /HIRING FORM|ENGINEER APPLICATION|EXAMPLE BRIEFS/i.test(m.textContent||'');
      const has90 = !!m.querySelector('[name="90day-outcome"],[id="90day-outcome"]');
      const rev = m.querySelector('.dg-wiz-review');
      const hasRev = !!(rev && (rev.textContent||'').trim().length > 3);
      return { q, vis, nextOk: !!(nr && nr.width > 35 && nr.height > 28), bad, has90, hasRev, nextTxt: (n && n.textContent || '').trim().slice(0,12) };
    }, modal);

    const shot = path.join(OUT, `${label}-step${String(i).padStart(2,'0')}-${key}.png`);
    await page.screenshot({path: shot});
    states.push({i, key, ...st});
    console.log(`${label} s${i} ${key}: q="${st.q}" vis=${st.vis} next=${st.nextOk} bad=${st.bad} 90=${st.has90} rev=${st.hasRev}`);

    // Advance
    await page.evaluate((mSel) => { const n=document.querySelector(mSel+' .dg-wiz-next'); if(n) n.click(); }, modal);
    await wait(420);
  }

  const thanks = await page.evaluate((mSel) => {
    const m = document.querySelector(mSel);
    return !!(m && (m.querySelector('.w-form-done,[class*="success"]') || /thank|received|profile saved|brief received/i.test(m.textContent||'')));
  }, modal);
  console.log(`${label} thanks: ${thanks}`);
  return {states, thanks};
}

(async () => {
  const browser = await puppeteer.connect({browserURL: CDP_URL, defaultViewport:null});
  const sSteps = ['welcome','contact-email','company-name','company-stage','role-title','stack-needs','90day-outcome','salary-range','timeline','team-size','why-this-role','role-jd','__submit__','__thanks__'];
  const eSteps = ['welcome','full-name','seeker-email','linkedin-url','skills-stack','experience','sf-bay','availability','salary-expectation','why-startups','links','phone','resume','__submit__','__thanks__'];

  const p1 = await browser.newPage(); await p1.setViewport({width:1280,height:800});
  const ds = await runOne(p1, 'startup', 'HIRE', sSteps, 'd-startup'); await p1.close();

  const p2 = await browser.newPage(); await p2.setViewport({width:1280,height:800});
  const de = await runOne(p2, 'engineer', 'JOIN', eSteps, 'd-engineer'); await p2.close();

  const p3 = await browser.newPage(); await p3.setViewport({width:375,height:700,isMobile:true,hasTouch:true});
  const ms = await runOne(p3, 'startup', 'HIRE', sSteps, 'm-startup'); await p3.close();

  const p4 = await browser.newPage(); await p4.setViewport({width:375,height:700,isMobile:true,hasTouch:true});
  const me = await runOne(p4, 'engineer', 'JOIN', eSteps, 'm-engineer'); await p4.close();

  await browser.disconnect();

  const all = ds.thanks && de.thanks && ms.thanks && me.thanks;
  console.log('=== FULL TRAVERSAL ===');
  console.log({dStartup:ds.thanks, dEng:de.thanks, mStartup:ms.thanks, mEng:me.thanks, ALL: all});
  fs.writeFileSync(OUT+'/report.json', JSON.stringify({ds, de, ms, me, all}, null, 2));
  console.log('Artifacts:', OUT);
  process.exit(all ? 0 : 1);
})();
