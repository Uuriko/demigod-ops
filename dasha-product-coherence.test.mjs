#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const brief = read('./DASHA-PRODUCT-BRIEF.md');
const roadmap = read('./DASHA-ROADMAP.md');
const docs = read('./DASHA-DOCS.md');
const guide = read('./DASHA-COMPLETE-GUIDE.md');
const simplify = read('./DASHA-SIMPLIFY.md');
const landing = read('./dasha-landing.html');
const board = JSON.parse(read('./dasha-simp-board.json'));
const pkg = JSON.parse(read('./package.json'));
const current = ['Dasha Transmissions', 'Transmission 001', 'make me an alibi'];

for (const marker of current) {
  const owners = marker === 'Dasha Transmissions' ? [brief, docs] : [brief, roadmap, landing];
  assert(owners.every((text) => text.toLowerCase().includes(marker.toLowerCase())), `${marker} is not coherent across its owners`);
}
for (const retired of ['Riding for Dasha', 'Season zero']) {
  assert(!landing.toLowerCase().includes(retired.toLowerCase()), `${retired} returned to the homepage`);
  assert(!JSON.stringify(board).toLowerCase().includes(retired.toLowerCase()), `${retired} returned to the Board contract`);
}
assert.equal(board.season, null, 'the retired Board season returned');
assert.match(simplify, /Transmission 001 is the only participation experiment/);
assert.match(brief, /Studio is the instrument/);
assert.match(roadmap, /### A\. Remix Relay/);

for (const [file, text] of [['DASHA-DOCS.md', docs], ['DASHA-COMPLETE-GUIDE.md', guide]]) {
  for (const [, target] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|#)/.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    assert(fs.existsSync(new URL(path, import.meta.url)), `${file} links to missing ${path}`);
  }
}
for (const file of ['./DASHA-DOCS.md', './DASHA-PRODUCT-BRIEF.md', './DASHA-ROADMAP.md', './DASHA-WORKFLOW.md']) {
  for (const [, script] of read(file).matchAll(/npm run ([\w:-]+)/g)) {
    assert(pkg.scripts[script], `${file} documents missing npm script ${script}`);
  }
}
console.log('dasha product coherence PASS');
