import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url);
let axeSrc;
try{axeSrc=await readFile(require.resolve('axe-core/axe.min.js'),'utf8');}
catch{axeSrc=await readFile(require.resolve('@axe-core/cli/node_modules/axe-core/axe.min.js'),'utf8');}

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
  await page.goto(origin,{waitUntil:'networkidle2'});
  const mint=await page.$eval('#dd-ca',node=>node.textContent.trim());
  await page.$eval('#dd-paste',(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}))},mint);
  assert.match(await page.$eval('#dd-verify',node=>node.textContent),/Exact match/);
  await page.$eval('#dd-paste',node=>{node.value='11111111111111111111111111111111111111111111';node.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.match(await page.$eval('#dd-verify',node=>node.textContent),/Does not match/);
  await page.click('#dd-copy');
  await page.waitForFunction(()=>document.querySelector('#dd-copy').textContent==='Copied');
  assert.equal(await page.$eval('#dd-copy',node=>node.textContent),'Copied');
  await page.click('#dd-copy-share');
  await page.waitForFunction(()=>document.querySelector('#dd-copy-share').textContent==='Copied');
  assert.equal(await page.$eval('#dd-copy-share',node=>node.textContent),'Copied');
  await page.click('#dd-refresh');
  const result=await page.evaluate(()=>({
    telegram:[...document.links].some(link=>/t\.me\/dashacommunity/i.test(link.href+link.textContent)),
    xHref:document.querySelector('#dd-tweet').href,
    external:[...document.querySelectorAll('a[target="_blank"]')].every(link=>link.relList.contains('noopener')&&link.relList.contains('noreferrer')),
    overflow:document.documentElement.scrollWidth>innerWidth,
    controls:[...document.querySelectorAll('button,.dd-btn')].filter(node=>{const r=node.getBoundingClientRect();const s=getComputedStyle(node);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!node.closest('[hidden]')} ).map(node=>node.getBoundingClientRect().height)
  }));
  assert.equal(result.telegram,false);
  const x=new URL(result.xHref);
  assert.equal(x.origin,'https://x.com');
  assert.match(x.searchParams.get('text'),new RegExp(mint));
  assert.equal(result.external,true);
  assert.equal(result.overflow,false);
  assert.ok(result.controls.every(height=>height>=42));
  await page.addScriptTag({content:axeSrc});
  const axe=await page.evaluate(async()=>{const r=await window.axe.run(document,{});return{rules:r.passes.length+r.inapplicable.length,bad:r.violations.filter(item=>['critical','serious'].includes(item.impact)).map(item=>item.id)};});
  assert.ok(axe.rules>30,'axe did not really run');
  assert.deepEqual(axe.bad,[]);
  await page.close();await browser.disconnect();
  console.log('Dasha Desk interactions: PASS');
}finally{server.close()}
