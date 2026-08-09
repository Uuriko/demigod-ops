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
const contrast = read('./dasha-contrast.test.mjs');
const simpScore = read('./.grok/worktrees/potter/dasha/dasha-simp-score.mjs');
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
/* "The official project" names no noun, so a reader supplies one — official token, official account,
   officially endorsed — and C1 quietly becomes C3, C4 and C5. The brief is canonical_for product, so
   it is what every other document and agent paraphrases from; the collapse has to be stopped at the
   source rather than caught surface by surface. Scoped uses ("the official getdasha.com project")
   are fine and deliberately still pass — it is the bare noun phrase that does the damage. */
assert(!/\bthe official project\b/i.test(brief),
  'DASHA-PRODUCT-BRIEF.md claims "the official project" with no scope — say official *what*, or a reader reads it as token control, account control and endorsement (DASHA-CLAIMS.md C3-C5)');
assert.match(simpScore, /QUIZ_PATH_LENGTH = 20/);
assert.match(simpScore, /QUIZ_QUICK_LENGTH = 10/);
assert.match(simpScore, /const points = basePoints/);
assert.match(brief, /10-question quick mode and a\s+20-question deep mode/);
assert.match(brief, /Scored retakes\s+replace the prior quiz score with the latest finish/);
assert.match(brief, /random vibe remains share copy and\s+never changes rank/);
assert.doesNotMatch(brief, /one scored\s+attempt per quiz version|practice replay/i);

for (const route of ['/', '/studio', '/dasha', '/lobby', '/how-to-buy']) {
  assert(contrast.includes(`https://www.getdasha.com${route}`), `live contrast coverage lost ${route}`);
}
assert.match(contrast, /page\.screenshot\(/, 'contrast must sample one viewport coordinate system');
assert.doesNotMatch(contrast, /handle\.screenshot\(/, 'element screenshots misalign transformed text ranges');
assert.match(contrast, /for \(let p = el; p; p = p\.parentElement\)/,
  'contrast clipping must include the text element itself');

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
