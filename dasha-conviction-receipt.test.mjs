import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import puppeteer from 'puppeteer-core';

const html=await readFile(new URL('./dasha-conviction-receipt.html',import.meta.url));
const server=createServer((_,response)=>{response.setHeader('Content-Type','text/html');response.end(html)}).listen(0,'127.0.0.1');

try{
  const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223'}),page=await browser.newPage();
  await page.setViewport({width:390,height:844});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.click('button[type=submit]');
  assert.match(await page.$eval('#error',node=>node.textContent),/not verified/);
  assert.equal(await page.$eval('#address',node=>node===document.activeElement&&node.getAttribute('aria-invalid')==='true'),true,
    'invalid submit must identify and focus the first failing field');
  await page.type('#address','9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump');
  await page.type('#thesis','T'.repeat(280));
  await page.type('#invalidation','I'.repeat(180));
  await page.$eval('#resolution',node=>node.value='2099-12-31');
  await page.click('button[type=submit]');
  await page.waitForSelector('#output:not([hidden])');
  const result=await page.evaluate(()=>{
    const canvas=card(document.querySelector('#receipt-text').textContent.split('\n'),'abcdef123456');
    const ctx=canvas.getContext('2d');const band=ctx.getImageData(0,624,1200,51).data;let ink=0;for(let i=0;i<band.length;i+=4){if(band[i]>60||band[i+1]>60||band[i+2]>60)ink++}
    return {canvas:[canvas.width,canvas.height],bandInk:ink,body:document.querySelector('#receipt-text').textContent,png:canvas.toDataURL().startsWith('data:image/png'),share:new URL(document.querySelector('#share').href).searchParams.get('text'),calendar:calendar('2099-12-31','9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump','Depth improves','Depth falls'),overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('button,a.button')].map(node=>node.getBoundingClientRect().height)};
  });
  assert.deepEqual(result.canvas,[1200,675]);
  assert.equal(result.png,true);
  assert.match(result.body,/Saved locally on this device\./,'receipt body carries its storage note');
  assert.doesNotMatch(result.share,/NFA|not financial advice/i,'X share text stays clean');
  assert.ok(result.bandInk>1000,`canvas note band is drawn (ink px: ${result.bandInk})`);
  assert.ok(result.share.length<=280,`X text is ${result.share.length} characters`);
  assert.match(result.share,/Unspecified confidence/);
  assert.match(result.share,/Invalidation excerpt:/);
  assert.match(result.share,/Full-card checksum prefix:/);
  assert.match(result.share,/resolves 2099-12-31/);
  assert.match(result.calendar,/DTSTART;VALUE=DATE:20991231/);
  assert.match(result.calendar,/SUMMARY:Resolve Dasha thesis/);
  assert.doesNotMatch(result.calendar,/Depth improves|Depth falls/,'calendar export must not copy private thesis text into syncing calendar apps');
  assert.equal(result.overflow,false);
  assert.ok(result.controls.every(height=>height>=48));
  assert.match(await page.$eval('.note',node=>node.textContent),/local checksum/i);

  /* ---- focus state on the five controls -----------------------------------
     The form is the product and it had NO designed focus state until 2026-08-06 — the
     only :focus-visible rule covered <a> and <button>, so inputs fell back to the UA ring.
     axe passes either way, because a visible indicator does exist; that is exactly why no
     accessibility tool would ever surface it.

     Focus must be driven by KEYBOARD. Programmatic .focus() reports :focus-visible false
     and paints the UA default, so a test written with page.focus() fails for a reason
     unrelated to the defect. Verified empirically before writing this.

     Asserting the COLOUR, not merely that an outline exists — the UA default is also an
     outline, so an "outline is non-empty" assertion would have passed on the broken page. */
  const ACCENT='rgb(200, 182, 255)';
  const wanted=['address','thesis','invalidation','confidence','resolution'];
  await page.evaluate(()=>document.activeElement?.blur());
  const seen=new Map();
  for(let i=0;i<20&&seen.size<wanted.length;i++){
    await page.keyboard.press('Tab');
    const s=await page.evaluate(()=>{const el=document.activeElement;if(!el||!el.id)return null;
      const cs=getComputedStyle(el);
      return {id:el.id,visible:el.matches(':focus-visible'),color:cs.outlineColor,width:cs.outlineWidth}});
    if(s&&wanted.includes(s.id)&&!seen.has(s.id))seen.set(s.id,s);
  }
  assert.equal(seen.size,wanted.length,`tabbing reached ${seen.size}/${wanted.length} controls: ${[...seen.keys()]}`);
  for(const id of wanted){
    const f=seen.get(id);
    assert.equal(f.visible,true,`#${id}: keyboard focus does not match :focus-visible`);
    assert.equal(f.color,ACCENT,`#${id}: focus ring is ${f.color} (${f.width}), not the accent ${ACCENT} — UA default?`);
  }
  await page.close();

  /* ---- axe, at both gate widths, with proof the harness ran ----------------
     The standalone had never had axe in its own test — only ad hoc. The form is filled
     first because #output is hidden until submit and hidden subtrees are skipped. */
  const require=createRequire(import.meta.url);
  let axeSrc;
  try{axeSrc=await readFile(require.resolve('axe-core/axe.min.js'),'utf8')}
  catch{axeSrc=await readFile(require.resolve('@axe-core/cli/node_modules/axe-core/axe.min.js'),'utf8')}
  for(const width of [390,1440]){
    const p=await browser.newPage();
    await p.setViewport({width,height:900});
    await p.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle2'});
    await p.type('#address','9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump');
    await p.type('#thesis','Depth improves after listing.');
    await p.type('#invalidation','Depth under 50k for three days.');
    await p.$eval('#resolution',node=>node.value='2099-12-31');
    await p.click('button[type=submit]');
    await p.waitForSelector('#output:not([hidden])',{timeout:8000});
    await p.addScriptTag({content:axeSrc});
    const res=await p.evaluate(async()=>{const r=await axe.run(document,{});
      return{rules:r.passes.length+r.inapplicable.length,
        bad:r.violations.filter(v=>v.impact==='serious'||v.impact==='critical').map(v=>`${v.id}(${v.nodes.length})`)}});
    assert.ok(res.rules>30,`@${width}px: axe evaluated only ${res.rules} rules — the harness did not really run`);
    assert.deepEqual(res.bad,[],`@${width}px: serious/critical axe violations: ${res.bad.join(', ')}`);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,
      `@${width}px: horizontal overflow`);
    await p.close();
  }

  await browser.disconnect();
  console.log('Dasha Thesis Card: PASS (tool, focus, axe 390 + 1440)');
}finally{server.close()}
