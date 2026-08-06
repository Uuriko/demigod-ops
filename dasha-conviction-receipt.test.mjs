import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html=await readFile(new URL('./dasha-conviction-receipt.html',import.meta.url));
const server=createServer((_,response)=>{response.setHeader('Content-Type','text/html');response.end(html)}).listen(0,'127.0.0.1');

try{
  const browser=await puppeteer.connect({browserURL:'http://127.0.0.1:9223'}),page=await browser.newPage();
  await page.setViewport({width:390,height:844});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.click('button[type=submit]');
  assert.match(await page.$eval('#error',node=>node.textContent),/valid Solana/);
  await page.type('#address','9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump');
  await page.type('#thesis','T'.repeat(280));
  await page.type('#invalidation','I'.repeat(180));
  await page.click('button[type=submit]');
  await page.waitForSelector('#output:not([hidden])');
  const result=await page.evaluate(()=>{
    const canvas=card(document.querySelector('#receipt-text').textContent.split('\n'),'abcdef123456');
    const ctx=canvas.getContext('2d');const band=ctx.getImageData(0,624,1200,51).data;let ink=0;for(let i=0;i<band.length;i+=4){if(band[i]>60||band[i+1]>60||band[i+2]>60)ink++}
    return {canvas:[canvas.width,canvas.height],bandInk:ink,body:document.querySelector('#receipt-text').textContent,png:canvas.toDataURL().startsWith('data:image/png'),share:new URL(document.querySelector('#share').href).searchParams.get('text'),overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('button,a.button')].map(node=>node.getBoundingClientRect().height)};
  });
  assert.deepEqual(result.canvas,[1200,675]);
  assert.equal(result.png,true);
  assert.match(result.body,/Not financial advice\. No wallet connection\./,'receipt body carries the risk line');
  assert.match(result.share,/NFA/,'X share text carries a disclaimer substring');
  assert.match(result.share,/No wallet/,'X share text names the no-wallet boundary');
  assert.ok(result.bandInk>2000,`canvas disclaimer band is drawn (ink px: ${result.bandInk})`);
  assert.ok(result.share.length<=280,`X text is ${result.share.length} characters`);
  assert.match(result.share,/55% confidence/);
  assert.match(result.share,/Invalid if:/);
  assert.equal(result.overflow,false);
  assert.ok(result.controls.every(height=>height>=48));
  assert.match(await page.$eval('.note',node=>node.textContent),/not proof/);
  await page.close();await browser.disconnect();
  console.log('Dasha Thesis Card: PASS');
}finally{server.close()}
