import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const svg=await readFile(new URL('./dasha-social-card.svg',import.meta.url),'utf8');
const png=await readFile(new URL('./dasha-social-card.png',import.meta.url));
const runbook=await readFile(new URL('./DASHA-DOMAIN-WEBFLOW-LAUNCH.md',import.meta.url),'utf8');
assert.equal(png.subarray(1,4).toString(),'PNG','social card is not a PNG');
assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1200,630],'social card must remain 1200×630');
for(const text of ['IT’S TIME','$DASHA.','Make it. Save it. Pass it on.','MAKE SOMETHING','HOW U CRYING','WELL IM STILL ALIVE','CMON','VERIFY THE MINT'])assert(svg.includes(text),`social card missing ${text}`);
assert(!/OLD COIN|NOT THE DEV/i.test(svg),'negative coin joke returned');
assert(!/A CULTURE COIN ON SOLANA|MAKE THE|TIMELINE|STRANGER|ADULT SUPERVISION|STAYED FOR THE BIT/.test(svg),'retired social-card copy returned');
assert(!/\b(thesis|receipt|forecast|price|return|holder|telegram)\b/i.test(svg),'retired, speculative, mutable or unofficial content leaked into social card');
assert(!/https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),'social card gained a remote asset dependency');
assert.equal((runbook.match(/`dasha-social-card\.png`/g)||[]).length>=3,true,'all public Dasha routes do not share the verified publication asset');
for(const text of ['fragments are client-only','does **not** claim to depict the specific remix','og:url=https://www.getdasha.com/studio','og:url=https://www.getdasha.com/dasha'])assert(runbook.includes(text),`social metadata runbook missing ${text}`);
console.log('dasha social card: dimensions, product copy, trust copy, and self-contained asset checks passed');

/* The Desk card prints the mint, split across three lines so it stays legible in a timeline preview.
   A split string is the easiest place in this repo to typo an address and the hardest place to
   notice: it is inside an image, so no text search finds it and no reader checks it character by
   character. Reassemble and compare. */
{
  const desk = await readFile(new URL('./dasha-social-card-desk.svg', import.meta.url), 'utf8');
  const parts = [...desk.matchAll(/monospace">([^<]+)<\/text>/g)].map((m) => m[1]);
  assert.ok(parts.length >= 2, 'the Desk card no longer prints the mint');
  assert.equal(parts.join(''), '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump',
    `the mint on the Desk share card is wrong: ${parts.join('')}`);
}

/* One card per route, all three the right size, none of them accidentally the same file. */
for (const card of ['dasha-social-card.png', 'dasha-social-card-studio.png', 'dasha-social-card-desk.png']) {
  const png = await readFile(new URL(`./${card}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${card} is not a PNG`);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630], `${card} is not 1200x630`);
}

// The word the operator removed must not survive inside an image, where no text search would find it.
for (const svg of ['dasha-social-card.svg', 'dasha-social-card-studio.svg', 'dasha-social-card-desk.svg']) {
  const text = await readFile(new URL(`./${svg}`, import.meta.url), 'utf8');
  assert.ok(!/>[^<]*remix[^<]*</i.test(text), `${svg} still shows the word "remix"`);
}
