#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
assert.match(source, /const JOBS = Object\.assign\(Object\.create\(null\), \{/);
const allowlist = Object.assign(Object.create(null), { smoke: {} });
for (const query of ['run=toString', 'run=%74%6fString', 'run=constructor', 'run=__proto__']) {
  assert.equal(allowlist[new URLSearchParams(query).get('run')], undefined);
}
const jobQueue = source.slice(source.indexOf('function buildJobQueue()'), source.indexOf('function ensureDemandFresh'));
assert.match(jobQueue, /const knownJob = \(j\) =>[\s\S]*Object\.prototype\.hasOwnProperty\.call\(JOBS, j\.id\)/);
assert.match(jobQueue, /\[\.\.\.jobMap\.values\(\)\]\s*\.filter\(knownJob\)/);
assert.match(jobQueue, /\.filter\(Boolean\)\s*\.filter\(knownJob\)/);
const job = source.match(/'auto-propose':\s*\{[^\n]+\}/)?.[0] || '';
assert.match(job, /safe:\s*false/);
assert.match(job, /mutate:\s*true/);
assert.doesNotMatch(job, /safe:\s*true/);
assert.match(ui, /if\(ba\) ba\.onclick=\(\)=>runJob\('auto-propose',\{mutate:true,btn:ba\}\);/);
assert.doesNotMatch(ui, /Auto-propose done|await runJob\('auto-propose'\)/);

console.log('demigod dashboard mutation policy: PASS');
