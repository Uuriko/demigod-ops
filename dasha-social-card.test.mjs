import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const svg=await readFile(new URL('./dasha-social-card.svg',import.meta.url),'utf8');
const png=await readFile(new URL('./dasha-social-card.png',import.meta.url));
const runbook=await readFile(new URL('./DASHA-DOMAIN-WEBFLOW-LAUNCH.md',import.meta.url),'utf8');
assert.equal(png.subarray(1,4).toString(),'PNG','social card is not a PNG');
assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1200,630],'social card must remain 1200×630');
for(const text of ['IT’S TIME','$DASHA.','Make it. Save it. Pass it on.','MAKE SOMETHING','HOW U CRYING','IT’S AN OLD COIN','CMON','VERIFY THE MINT'])assert(svg.includes(text),`social card missing ${text}`);
assert(!/A CULTURE COIN ON SOLANA|MAKE THE|TIMELINE|STRANGER|ADULT SUPERVISION|STAYED FOR THE BIT/.test(svg),'retired social-card copy returned');
assert(!/\b(thesis|receipt|forecast|price|return|holder|telegram)\b/i.test(svg),'retired, speculative, mutable or unofficial content leaked into social card');
assert(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),'social card gained a remote asset dependency');
assert.equal((runbook.match(/`dasha-social-card\.png`/g)||[]).length>=3,true,'all public Dasha routes do not share the verified publication asset');
for(const text of ['fragments are client-only','does **not** claim to depict the specific remix','og:url=https://www.getdasha.com/studio','og:url=https://www.getdasha.com/dasha'])assert(runbook.includes(text),`social metadata runbook missing ${text}`);
console.log('dasha social card: dimensions, product copy, trust copy, and self-contained asset checks passed');
