// Offline comparison only. Supply a freshly downloaded private Worker capture;
// this script never fetches, uploads, or reads deployment credentials.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as candidate from './demigod-html-worker.js';
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('Provide a freshly captured demigod-html Worker file');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(baselinePath);
const expected = '4d1a6f98e77f9614d9bda68e678d803a261c4f5d95bf9fd6fa406c3058db5097';
assert.equal(digest(bytes), expected, 'Live baseline changed: reconcile before deployment');
const baseline = await import('data:text/javascript;base64,' + bytes.toString('base64'));
const map = {generatedAt:'2026-09-24T00:00:00Z',companies:[{id:'yc:stripe',name:'Stripe',website:'https://stripe.com',openRoles:1}]};
globalThis.fetch = async input => {
  const url = String(input?.url || input);
  if(url.endsWith('sf-startup-map.json'))return Response.json(map);
  if(url.endsWith('roles-feed.json'))return Response.json({roles:[]});
  if(url.endsWith('.json'))return Response.json({schema:'fixture',name:'Demigod'});
  return new Response('<!doctype html><html><body>Local fixture</body></html>',{headers:{'content-type':'text/html'}});
};
const paths=['/','/?wiz=startup','/?wiz=engineer','/hire','/hire?company=yc:stripe','/room','/room/llms.txt','/room/llms-full.txt','/room/agents.md','/room/.well-known/agent.json','/compute','/compute?via=test','/api/opt-in/healthz','/api/opt-in','/opt-in','/humans.txt','/contribute','/ai-plugin.json','/.well-known/ai-plugin.json','/.well-known/mcp.json','/directory','/companies','/c/yc:stripe','/c/missing','/weekly','/packets','/journal','/peers','/memo','/ticket','/hardware','/hardware/directory','/hardware/signals','/app','/people','/startups','/legal','/contact','/pricing','/llms.txt','/ai.txt','/robots.txt','/sitemap.xml','/grok','/.well-known/grok-bot.json','/heads/archive/2026-09-01.json'];
let unchanged=0;
const changed=[];
for(const path of paths)for(const method of ['GET','HEAD']){
  const req=()=>new Request('https://www.trydemigod.com'+path,{method});
  const a=await baseline.default.fetch(req(),{}),b=await candidate.default.fetch(req(),{});
  const values=async r=>JSON.stringify([r.status,[...r.headers],await r.text()]);
  if(await values(a)===await values(b))unchanged++;else changed.push(method+' '+path);
}
assert.deepEqual(changed,['GET /'],'Only reviewed source-only homepage improvements may differ in baseline route checks');
console.log(JSON.stringify({baselineSha256:expected,baselineBytes:bytes.length,candidateSourceSha256:digest(readFileSync(new URL('./demigod-html-worker.js',import.meta.url))),homeModuleSha256:digest(readFileSync(new URL('./demigod-home-ia.js',import.meta.url))),unchanged,changed}));
