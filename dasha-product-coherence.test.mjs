#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const brief = read('./DASHA-PRODUCT-BRIEF.md');
const roadmap = read('./DASHA-ROADMAP.md');
const docs = read('./DASHA-DOCS.md');
const guide = read('./DASHA-COMPLETE-GUIDE.md');
const simplify = read('./DASHA-SIMPLIFY.md');
const threat = read('./DASHA-THREAT-MODEL.md');
const claims = read('./DASHA-CLAIMS.md');
const landing = read('./dasha-landing.html');
const board = JSON.parse(read('./dasha-simp-board.json'));
const pkg = JSON.parse(read('./package.json'));
for (const marker of ['Home', 'Studio', 'Desk', 'Lobby', 'Simp Board']) {
  assert([brief, docs, roadmap].every((text) => text.toLowerCase().includes(marker.toLowerCase())), `${marker} is not coherent across its owners`);
}
for (const retired of ['Riding for Dasha', 'Season zero']) {
  assert(!landing.toLowerCase().includes(retired.toLowerCase()), `${retired} returned to the homepage`);
  assert(!JSON.stringify(board).toLowerCase().includes(retired.toLowerCase()), `${retired} returned to the Board contract`);
}
assert.equal(board.season, null, 'the retired Board season returned');
assert.match(simplify, /live Home \+ Studio \+ Desk \+ Lobby \+ Board system/);
assert.match(brief, /Transmissions\/alibi remains one unproven creative experiment/);
assert.match(roadmap, /live Board combines one editorial row with measured opt-in rows/);
for (const id of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9']) assert.match(threat, new RegExp(`\\*\\*${id}\\b`));
for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']) assert.match(claims, new RegExp(`\\*\\*${id}\\b`));
assert.match(claims, /53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump/);
assert.match(claims, /TOKEN_CONTROL\*\* \| Unestablished/);
assert.match(claims, /ENDORSEMENT\*\* \| No blanket endorsement claim is established/);

for (const [file, text] of [['DASHA-DOCS.md', docs], ['DASHA-COMPLETE-GUIDE.md', guide]]) {
  for (const [, target] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|#)/.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    assert(fs.existsSync(new URL(path, import.meta.url)), `${file} links to missing ${path}`);
  }
}
for (const file of ['./DASHA-DOCS.md', './DASHA-PRODUCT-BRIEF.md', './DASHA-ROADMAP.md', './DASHA-WORKFLOW.md', './DASHA-THREAT-MODEL.md', './DASHA-CLAIMS.md']) {
  for (const [, script] of read(file).matchAll(/npm run ([\w:-]+)/g)) {
    assert(pkg.scripts[script], `${file} documents missing npm script ${script}`);
  }
}
console.log('dasha product coherence PASS');
