import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html=await readFile(new URL('./dasha-remix-pack.html',import.meta.url),'utf8');
assert(!/thesis|receipt|telegram/i.test(html),'retired product or Telegram leaked into Remix Pack');
for(const text of ['Close the moment','Build capsule','Load examples','Share capsule','Save PNG','Copy capsule link','without an account, wallet, upload or public gallery'])assert(html.includes(text),`missing ${text}`);
assert(html.includes('not proof of authorship, consent, permission or endorsement'),'unverified capsule context is presented as proof');

const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223'}),page=await browser.newPage();
await page.setViewport({width:390,height:844});await page.setContent(html,{waitUntil:'load'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile page overflows');
await page.click('#examples');
assert.equal(await page.evaluate(()=>entries().length),5,'examples did not create five valid entries');
await page.$eval('#title',e=>e.value='Night shift at the casino');
await page.$eval('#source',e=>e.value='https://x.com/dash_eats/status/2085405228078432279');
await page.click('#build');
assert.equal(await page.evaluate(()=>entries()[0].by),'night shift','optional attribution was not parsed');
assert.equal(await page.$$eval('.dp-slot',rows=>rows.length),5,'built wall did not expose five editable slots');
assert.deepEqual(await page.$eval('.dp-slot a',a=>({href:a.getAttribute('href'),target:a.target,rel:a.rel})),{href:'/studio#look=poster&format=square&line=The+timeline+needs+adult+supervision.',target:'_blank',rel:'noopener noreferrer'},'slot did not expose a safe exact remix link');
assert.match(await page.$eval('#status',e=>e.textContent),/Built a 5-remix capsule/);
assert.deepEqual(await page.$eval('#context',a=>({hidden:a.hidden,href:a.href,target:a.target,rel:a.rel})),{hidden:false,href:'https://x.com/dash_eats/status/2085405228078432279',target:'_blank',rel:'noopener noreferrer'},'public context was not exposed safely');
await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:value=>{window.__packLink=value;return Promise.resolve()}}})});
await page.click('#copy');
assert.equal(await page.evaluate(()=>new URL(window.__packLink).search),'','pack state leaked into the server query');
assert.equal(await page.evaluate(()=>new URLSearchParams(new URL(window.__packLink).hash.slice(1)).getAll('r').length),5,'copied pack link lost entries');
assert.deepEqual(await page.evaluate(()=>new URLSearchParams(new URL(window.__packLink).hash.slice(1)).getAll('f')),Array(5).fill('square'),'copied pack link lost formats');
assert.deepEqual(await page.evaluate(()=>{const state=new URLSearchParams(new URL(window.__packLink).hash.slice(1));return [state.get('t'),state.get('s')]}),['Night shift at the casino','https://x.com/dash_eats/status/2085405228078432279'],'copied capsule link lost title or public context');
await page.evaluate(()=>{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>data.files?.length===1});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared={files:data.files.length,type:data.files[0].type,name:data.files[0].name,text:data.text,url:data.url}}});
});
await page.click('#share');await page.waitForFunction(()=>window.__shared);
assert.deepEqual(await page.evaluate(()=>window.__shared),{files:1,type:'image/png',name:'dasha-culture-capsule.png',text:'Night shift at the casino\n\n$dasha',url:await page.evaluate(()=>window.__packLink)},'native share did not keep the PNG and editable capsule link together');
assert(!/endorsement|official|verified|https?:\/\//i.test(await page.evaluate(()=>window.__shared.text)),'share copy made an unsupported trust claim or duplicated the URL');
await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{const error=new Error('cancelled');error.name='AbortError';throw error}}));
await page.click('#share');await page.waitForFunction(()=>$('status').textContent==='');assert.equal(await page.$eval('#status',e=>e.textContent),'','cancelled native share was presented as an error');
await page.evaluate(()=>{
  HTMLAnchorElement.prototype.click=function(){window.__saved={download:this.download,href:this.href}};
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});
  window.open=url=>{window.__shareUrl=String(url)};
});
await page.click('#share');
await page.waitForFunction(()=>$('status').textContent.includes('attach it in the X tab'));
assert.match(await page.$eval('#status',e=>e.textContent),/attach it in the X tab/);
assert.equal(await page.evaluate(()=>new URL(window.__shareUrl).searchParams.get('text')),'Night shift at the casino\n\n$dasha','X fallback changed the share copy');
assert.equal(await page.evaluate(()=>new URL(window.__shareUrl).searchParams.get('url')),await page.evaluate(()=>window.__packLink),'X fallback lost the editable capsule link');
assert.equal(await page.evaluate(()=>window.__saved.download),'dasha-culture-capsule.png','X fallback did not save the capsule PNG');
await page.$eval('#links',e=>e.value='');await page.click('#share');assert.equal(await page.$eval('#status',e=>e.textContent),'Build a capsule before sharing it.','empty capsule attempted to share');
await page.$eval('#source',e=>e.value='javascript:alert(1)');await page.click('#build');assert.equal(await page.$eval('#context',a=>a.hidden),true,'unsafe public context URL was accepted');
await page.$eval('#links',e=>e.value=[
  'https://evil.example/studio#look=poster&line=Nope',
  `${'x'.repeat(40)} | /studio#look=signal&line=Valid`,
  '/studio#look=wrong&line=Nope',
  ...Array.from({length:10},(_,i)=>`/studio#look=poster&line=Line%20${i}`)
].join('\n'));
await page.click('#build');
assert.equal(await page.evaluate(()=>entries().length),9,'valid input was not capped at nine');
assert.equal((await page.evaluate(()=>entries()[0].by)).length,24,'contributor label was not capped');
assert.match(await page.$eval('#status',e=>e.textContent),/invalid or extra links ignored/);
await page.click('#save');
assert.equal(await page.evaluate(()=>window.__saved.download),'dasha-culture-capsule.png');
assert.match(await page.evaluate(()=>window.__saved.href),/^blob:/);
await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
const axe=await page.evaluate(()=>window.axe.run());
assert.deepEqual(axe.violations.filter(item=>['critical','serious'].includes(item.impact)&&!['document-title','html-has-lang'].includes(item.id)).map(item=>item.id),[],'Culture Capsule accessibility regression');
await page.close();
const requests=[],server=createServer((request,response)=>{requests.push(request.url);response.writeHead(200,{'content-type':'text/html'});response.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const inbound=await browser.newPage(),port=server.address().port;
await inbound.goto(`http://127.0.0.1:${port}/pack#t=One%20night&s=https%3A%2F%2Fexample.com%2Fmoment&r=poster%3AFirst%20line&f=story&a=alice&r=signal%3ASecond%3A%20line&f=banner&a=bob&r=wrong%3ANope&a=mallory&r=ticket%3A&a=none`,{waitUntil:'domcontentloaded'});
assert.equal(requests[0],'/pack','fragment state was sent in the HTTP request');
assert.deepEqual(await inbound.evaluate(()=>entries()),[{look:'poster',format:'story',line:'First line',by:'alice'},{look:'signal',format:'banner',line:'Second: line',by:'bob'}],'valid inbound state did not round-trip exactly');
assert.deepEqual(await inbound.evaluate(()=>[$('title').value,$('source').value]),['One night','https://example.com/moment'],'inbound capsule context did not round-trip');
assert.match(await inbound.$eval('#status',e=>e.textContent),/Opened an editable 2-remix capsule/);
await inbound.click('.dp-remove');
assert.deepEqual(await inbound.evaluate(()=>entries()),[{look:'signal',format:'banner',line:'Second: line',by:'bob'}],'removing a slot did not rebuild the editable wall');
assert.equal(await inbound.evaluate(()=>new URLSearchParams(location.hash.slice(1)).getAll('r').length),1,'removing a slot did not update the private Wall link');
await inbound.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await browser.disconnect();
console.log('dasha culture capsule: context validation, parsing, private round-trip, rendering, export, and mobile checks passed');
