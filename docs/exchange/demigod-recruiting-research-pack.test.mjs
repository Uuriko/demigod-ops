#!/usr/bin/env node
/**
 * Structural gate: recruiting research pack exists for Demigod brainstorming.
 * Drives real files on disk (not hard-coded content claims).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const index = join(dir, 'DEMIGOD-RECRUITING-RESEARCH-INDEX-2026-08-15.md');
const catalog = join(dir, 'DEMIGOD-RECRUITING-RESEARCH-CATALOG-2026-08-15.md');
const synthesis = join(dir, 'DEMIGOD-RECRUITING-RESEARCH-SYNTHESIS-2026-08-15.md');

for (const p of [index, catalog, synthesis]) {
  assert.ok(existsSync(p), `missing ${p}`);
  const t = readFileSync(p, 'utf8');
  assert.ok(t.length > 400, `too short ${p}`);
  assert.match(t, /brainstorm|Purpose/i);
  assert.doesNotMatch(t, /this authorizes publish|public website claim of superiority/i);
}

const cat = readFileSync(catalog, 'utf8');
for (const cls of [
  ['## A. Academic', /### A\d+\./],
  ['## B. Industry blogs', /### B\d+\./],
  ['## C. Forums', /### C\d+\./],
  ['## D. Startups', /### D\d+\./],
]) {
  assert.match(cat, new RegExp(cls[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const n = (cat.match(new RegExp(cls[1].source, 'g')) || []).length;
  assert.ok(n >= 2, `${cls[0]} needs >=2 entries, got ${n}`);
}

// ≥5 full-field entries
const blocks = cat.split(/^### /m).slice(1);
let full = 0;
for (const b of blocks) {
  if (/\*\*Class:\*\*/.test(b) && /\*\*URL:\*\*/.test(b) && /\*\*Takeaway:\*\*/.test(b) && /\*\*Demigod tag:\*\*/.test(b)) full++;
}
assert.ok(full >= 5, `need ≥5 full-field entries, got ${full}`);

const syn = readFileSync(synthesis, 'utf8');
assert.match(syn, /Theme map|Theme/i);
assert.match(syn, /mutual/i);
assert.match(syn, /human/i);
assert.match(syn, /fee|10%/i);
assert.match(syn, /privacy/i);

console.log('demigod-recruiting-research-pack: PASS', { fullFieldEntries: full });
