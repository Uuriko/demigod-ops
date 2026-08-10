import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const files={
  '/':await readFile(new URL('./dasha-desk/index.html',import.meta.url)),
  '/src/app.js':await readFile(new URL('./dasha-desk/src/app.js',import.meta.url)),
  '/src/styles.css':await readFile(new URL('./dasha-desk/src/styles.css',import.meta.url))
};
const server=createServer((request,response)=>{
  const body=files[request.url];
  if(!body){response.writeHead(404);response.end();return}
  response.setHeader('Content-Type',request.url.endsWith('.js')?'text/javascript':request.url.endsWith('.css')?'text/css':'text/html');response.end(body);
}).listen(0,'127.0.0.1');

try{
  const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223'}),origin=`http://127.0.0.1:${server.address().port}`;
  await browser.defaultBrowserContext().overridePermissions(origin,['clipboard-read','clipboard-write']);
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844});
  await page.setRequestInterception(true);
  let dexRequests=0;
  page.on('request',request=>{
    if(!request.url().startsWith('https://api.dexscreener.com/latest/dex/tokens/'))return request.continue();
    dexRequests+=1;
    return dexRequests===1
      ? request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({pairs:[{priceUsd:'1',marketCap:2000,liquidity:{usd:3000},priceChange:{h24:4},dexId:'test'}]})})
      : request.respond({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{}'});
  });
  await page.goto(origin);
  await page.waitForFunction(()=>document.querySelector('#s-price').textContent==='$1.00');
  const focusable=await page.$$eval('a[href],button,input,textarea,summary',nodes=>nodes.filter(node=>{const box=node.getBoundingClientRect();return box.width>0&&box.height>0}).length);
  for(let i=0;i<focusable;i++){
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>parseFloat(getComputedStyle(document.activeElement).outlineWidth)>=3),true,`keyboard target ${i+1} has no visible focus ring`);
  }
  assert.equal(await page.$eval('#s-price',node=>node.textContent),'$1.00');
  await page.click('#dd-refresh');
  await page.waitForFunction(()=>document.querySelector('#dd-live').textContent==='offline');
  assert.deepEqual(await page.$$eval('#dd-stats strong',nodes=>nodes.map(node=>node.textContent)),['—','—','—','—'],'failed Dex request left stale numbers visible');
  assert.match(await page.$eval('#dd-asof',node=>node.textContent),/unavailable · use sources below/i);
  assert.ok(await page.$$eval('.dd-tools a',links=>links.filter(link=>/^https?:/.test(link.href)).length>=6),'independent sources disappeared with Dex data');
  const mint=await page.$eval('#dd-ca',node=>node.textContent.trim());
  await page.$eval('#dd-paste',(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}))},mint);
  assert.match(await page.$eval('#dd-verify',node=>node.textContent),/Exact match/);
  await page.$eval('#dd-paste',node=>{node.value='11111111111111111111111111111111111111111111';node.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.match(await page.$eval('#dd-verify',node=>node.textContent),/Does not match/);
  await page.click('#dd-copy');
  await page.waitForFunction(()=>document.querySelector('#dd-copy').textContent==='Copied');
  assert.equal(await page.$eval('#dd-copy',node=>node.textContent),'Copied');
  await page.$$eval('.dd-disclosure', blocks => blocks.forEach(block => { block.open = true; }));
  await page.click('#dd-copy-share');
  await page.waitForFunction(()=>document.querySelector('#dd-copy-share').textContent==='Copied');
  assert.equal(await page.$eval('#dd-copy-share',node=>node.textContent),'Copied');
  await page.click('#dd-refresh');
  const result=await page.evaluate(()=>({
    telegram:[...document.links].some(link=>/t\.me|telegram/i.test(link.href+link.textContent)),
    xHref:document.querySelector('#dd-tweet').href,
    external:[...document.querySelectorAll('a[target="_blank"]')].every(link=>link.relList.contains('noopener')&&link.relList.contains('noreferrer')),
    blankLinks:[...document.querySelectorAll('a[href]')].filter(link=>!link.getAttribute('href')||link.getAttribute('href')==='#').map(link=>link.textContent.trim()),
    overflow:document.documentElement.scrollWidth>innerWidth,
    controls:[...document.querySelectorAll('button,.dd-btn')].map(node=>node.getBoundingClientRect().height)
  }));
  assert.equal(result.telegram,false);
  const x=new URL(result.xHref);
  assert.equal(x.origin,'https://x.com');
  assert.match(x.searchParams.get('text'),new RegExp(mint));
  assert.equal(result.external,true);
  assert.deepEqual(result.blankLinks,[],'empty/hash-only link remained clickable');
  assert.equal(result.overflow,false);
  assert.ok(result.controls.every(height=>height>=42));
  await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
  const axe=await page.evaluate(()=>window.axe.run());
  assert.deepEqual(axe.violations.filter(item=>['critical','serious'].includes(item.impact)).map(item=>item.id),[]);
  for(const width of [320,1440]){
    await page.setViewport({width,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const layout=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('button,.dd-btn')].map(node=>node.getBoundingClientRect().height)}));
    assert.equal(layout.overflow,false,`${width}px Desk overflow: ${JSON.stringify(layout)}`);
    assert.ok(layout.controls.every(height=>Math.round(height)>=42),`${width}px Desk control below 42px`);
  }
  await page.close();await browser.disconnect();
  console.log('Dasha Desk interactions: PASS');
}finally{server.close()}
