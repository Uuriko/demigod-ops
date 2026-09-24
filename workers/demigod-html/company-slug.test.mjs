import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { resolveMapCompany } from './demigod-html-worker.js';

const map = {generatedAt:'2026-09-24T00:00:00Z', companies:[
  {id:'wd:Q21708200',name:'OpenAI',website:'https://openai.com',openRoles:1},
  {id:'yc:stripe',name:'Stripe',website:'https://stripe.com',openRoles:1},
  {id:'yc:atlas-one',name:'Atlas'}, {id:'yc:atlas-two',name:'Atlas'},
]};
test('names and case variants resolve only unique catalog identities', () => {
  for (const value of ['OpenAI','openai','open-ai','WD:q21708200'])
    assert.equal(resolveMapCompany(map,value)?.id,'wd:Q21708200');
  assert.equal(resolveMapCompany(map,'yc:stripe')?.id,'yc:stripe');
  for(const value of ['Atlas','unknown','!!!','open/ai','open\\ai',''])
    assert.equal(resolveMapCompany(map,value),null,value);
  assert.equal(resolveMapCompany(null,'openai'),null);
});
test('slug HTTP redirects preserve exact-ID pages and fail closed on ambiguous names', async t => {
  const original=globalThis.fetch;
  globalThis.fetch=async input => {
    const url=String(input?.url || input);
    if(url.endsWith('/sf-startup-map.json'))return Response.json(map);
    if(url.endsWith('/roles-feed.json'))return Response.json({roles:[]});
    throw new Error('Unexpected test network request');
  };
  t.after(()=>{globalThis.fetch=original;});
  for(const method of ['GET','HEAD']){
    const r=await worker.fetch(new Request('https://www.trydemigod.com/c/open-ai',{method}),{});
    assert.equal(r.status,302);
    assert.equal(r.headers.get('location'),'/c/wd%3AQ21708200');
    assert.equal(await r.text(),'');
    const known=await worker.fetch(new Request('https://www.trydemigod.com/c/yc:stripe',{method}),{});
    assert.equal(known.status,200);
    assert.equal(known.headers.get('location'),null);
    for(const id of ['atlas','unknown','%21%21%21']){
      const missing=await worker.fetch(new Request('https://www.trydemigod.com/c/'+id,{method}),{});
      assert.equal(missing.status,404,id);
      assert.equal(missing.headers.get('location'),null);
    }
  }
});

test('live room aliases and compute remain readable, including HEAD', async () => {
  for(const path of ['/room/skill.md','/room/agents.md','/room/claude.md','/room/llms-full.txt']){
    for(const suffix of ['', '/'])for(const method of ['GET','HEAD']){
      const r=await worker.fetch(new Request('https://www.trydemigod.com'+path+suffix,{method}),{});
      assert.equal(r.status,200);
      if(method==='HEAD')assert.equal(await r.text(),'');
      else assert.match(await r.text(),/^# Project Room/);
    }
  }
  const compute=await worker.fetch(new Request('https://www.trydemigod.com/compute'),{});
  assert.equal(compute.status,200);
  assert.match(await compute.text(),/compute/i);
});
