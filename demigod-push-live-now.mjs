import fs from 'fs';
import puppeteer from 'puppeteer-core';
const HEAD = fs.readFileSync('demigod-head-minimal.html', 'utf8');
const FOOT = fs.readFileSync('demigod-footer-lite.html', 'utf8');
async function push() {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223', protocolTimeout: 180000 });
  const ps = await b.pages();
  let cc = ps.find(p => /custom-code/i.test(p.url()));
  let des = ps.find(p => /designer.*talentlink/i.test(p.url()));
  if (!cc || !des) { console.error('need cc and des tabs open'); await b.disconnect(); process.exit(1); }
  // Head paste with readback
  await cc.bringToFront();
  await cc.evaluate(() => [...document.querySelectorAll('button,[role=tab]')].forEach(el => /head/i.test(el.textContent||'') && el.click()));
  await cc.waitForTimeout(600);
  let eds = await cc.$$('.cm-content,.cm-editor,textarea,[contenteditable=true]');
  if (eds[0]) {
    const e = eds[0]; await e.click({clickCount:3}); await cc.keyboard.down('Control'); await cc.keyboard.press('KeyA'); await cc.keyboard.up('Control'); await cc.keyboard.press('Backspace'); await cc.waitForTimeout(80);
    for (let i=0; i<HEAD.length; i+=850) { await cc.keyboard.type(HEAD.slice(i,i+850)); await cc.waitForTimeout(22); }
    await cc.waitForTimeout(300);
    const back = await cc.evaluate(() => (document.querySelector('.cm-content')||{}).textContent || '');
    const headOk = /unhide-v5/.test(back) && /dg-unhide-critical/.test(back) && !/foot-latest\.js/.test(back);
    console.log('HEAD readback keys:', { headOk, unhideV5: /unhide-v5/.test(back), critical: /dg-unhide-critical/.test(back) });
    if (!headOk) throw new Error('HEAD readback missing unhide-v5/critical or contains footer loader; aborting before Save');
  }
  await cc.evaluate(() => [...document.querySelectorAll('button')].forEach(el => /save/i.test(el.textContent||''.toLowerCase()) && el.click()));
  await cc.waitForTimeout(1200);
  // Footer
  await cc.evaluate(() => [...document.querySelectorAll('button,[role=tab]')].forEach(el => /footer/i.test(el.textContent||'') && el.click()));
  await cc.waitForTimeout(500);
  eds = await cc.$$('.cm-content,.cm-editor,textarea,[contenteditable=true]');
  const fe = eds[eds.length>1?1:0] || eds[0];
  if (fe) { await fe.click({clickCount:3}); await cc.keyboard.down('Control'); await cc.keyboard.press('KeyA'); await cc.keyboard.up('Control'); await cc.keyboard.press('Backspace'); await cc.waitForTimeout(60); for (let i=0; i<FOOT.length; i+=700) { await cc.keyboard.type(FOOT.slice(i,i+700)); await cc.waitForTimeout(18); } }
  await cc.evaluate(() => [...document.querySelectorAll('button')].forEach(el => /save/i.test(el.textContent||''.toLowerCase()) && el.click()));
  await cc.waitForTimeout(1000);
  console.log('saved cc head+footer');
  // Designer
  await des.bringToFront();
  const clicked = await des.evaluate(() => {
    const btns = [...document.querySelectorAll('button,a,[role=button]')];
    const p = btns.find(bb => /publish/i.test((bb.textContent||bb.getAttribute('title')||'').toLowerCase()) && !/custom/i.test((bb.textContent||'').toLowerCase()));
    if (p) { p.click(); return true; } return false;
  });
  console.log('des publish click:', clicked);
  await des.waitForTimeout(2500);
  await des.evaluate(() => { const c=[...document.querySelectorAll('button')].find(bb=>/publish|confirm/i.test((bb.textContent||'').toLowerCase())); if(c) c.click(); });
  console.log('confirm sent');
  await b.disconnect();
  console.log('push complete');
}
push().catch(e=>{console.error(e);process.exit(1);});
