import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html=await readFile(new URL('./dasha-relay-lab.html',import.meta.url),'utf8');
assert(!/\b(thesis|receipt|telegram)\b/i.test(html),'scrapped or unofficial product leaked into Relay Lab');
for(const text of ['Does editability','Pass editable','Pass image only','Check a handoff','Local observation record','Open the recipe elsewhere','semantic, not a claim','2 of 10','never submits or stores'])assert(html.includes(text),`missing ${text}`);
const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223'}),page=await browser.newPage();
await page.setViewport({width:390,height:844});await page.setContent(html,{waitUntil:'domcontentloaded'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile page overflows');
assert.equal(await page.$$eval('.seed',cards=>cards.length),5,'matched seed count changed');
const arms=await page.$$eval('.seed:first-child a',links=>links.map(a=>new URLSearchParams(new URL(a.getAttribute('href'),'https://getdasha.com').hash.slice(1)).get('arm')));
assert.deepEqual(arms,[null,'flat'],'starter arms are not matched editable/image-only variants');
const set=async(parent,child)=>{await page.$eval('#parent',(e,v)=>e.value=v,parent);await page.$eval('#child',(e,v)=>e.value=v,child);await page.click('#compare');return page.$eval('#result',e=>e.textContent)};
assert.match(await set('https://www.getdasha.com/studio#look=poster&format=square&line=Stay+weird','https://www.getdasha.com/studio#look=signal&format=story&line=Stay+weirder'),/yes · changed look, format, line/);
assert.deepEqual(await page.$eval('#observation-json',e=>JSON.parse(e.textContent)),{schema:'dasha-relay-observation/v0',arm:'editable',material_edit:true,changed:['look','format','line'],parent_url:'https://www.getdasha.com/studio#look=poster&format=square&line=Stay+weird',child_url:'https://www.getdasha.com/studio#look=signal&format=story&line=Stay+weirder'});
assert.match(await set('https://getdasha.com/studio#look=poster&format=square&line=Same','https://getdasha.com/studio#look=poster&format=square&line=Same'),/Material edit: no/);
assert.match(await set('javascript:alert(1)','https://evil.example/studio#look=poster&format=square&line=Nope'),/two valid/,'unsafe or off-domain link accepted');assert.equal(await page.$eval('#observation',e=>e.hidden),true,'invalid comparison left a stale observation visible');
const open=async(url)=>{await page.$eval('#object-url',(e,v)=>e.value=v,url);await page.click('#open-object');return page.evaluate(()=>({message:document.getElementById('object-result').textContent,hidden:document.getElementById('object').hidden,look:document.getElementById('preview').dataset.look,format:document.getElementById('preview').dataset.format,line:document.getElementById('preview').textContent,recipe:document.getElementById('recipe').textContent}))};
assert.deepEqual(await open('https://www.getdasha.com/studio#look=signal&format=banner&line=Portable%20culture'),{message:'Semantic reconstruction: passed.',hidden:false,look:'signal',format:'banner',line:'Portable culture',recipe:'{\n  "v": 0,\n  "renderer": "dasha-studio",\n  "look": "signal",\n  "format": "banner",\n  "line": "Portable culture"\n}'});
const invalid=await open(`https://www.getdasha.com/studio#look=unknown&format=square&line=${'x'.repeat(121)}`);assert.equal(invalid.hidden,true,'unknown or overlong recipe was reconstructed');
const corpus=[
  ['https://getdasha.com/studio#look=poster&format=square&line=One',true],
  ['https://www.getdasha.com/studio#look=ticket&format=story&line=Two',true],
  ['https://www.getdasha.com/studio#look=marquee&format=banner&line=Three&extra=ignored',true],
  ['https://www.getdasha.com/studio#look=poster&format=square&line=',false],
  ['https://www.getdasha.com/studio#format=square&line=Missing+look',false],
  ['https://www.getdasha.com/studio#look=poster&line=Missing+format',false],
  ['https://www.getdasha.com/studio#look=unknown&format=square&line=No',false],
  ['https://www.getdasha.com/studio#look=poster&format=wide&line=No',false],
  [`https://www.getdasha.com/studio#look=poster&format=square&line=${'x'.repeat(121)}`,false],
  ['https://evil.example/studio#look=poster&format=square&line=No',false],
  ['https://www.getdasha.com/not-studio#look=poster&format=square&line=No',false],
  ['not a URL',false],
];
for(const [url,accepted] of corpus)assert.equal(await page.evaluate(value=>Boolean(state(value)),url),accepted,`grammar corpus mismatch: ${url.slice(0,90)}`);
await page.addScriptTag({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
const axe=await page.evaluate(()=>window.axe.run());assert.deepEqual(axe.violations.filter(item=>['critical','serious'].includes(item.impact)).map(item=>item.id),[],'Relay Lab accessibility regression');
await page.close();await browser.disconnect();console.log('dasha relay lab: matched arms, material-diff validation, mobile, trust, and accessibility checks passed');
