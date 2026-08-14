#!/usr/bin/env node
/**
 * Culture seeds must track public @dash_eats lines (docs/X-RESEARCH-DASHA-2026-08-08.md).
 * Drives real landing + studio source files.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const landing = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
const studio = readFileSync(join(root, 'dasha-meme-studio.html'), 'utf8');
const research = join(root, 'docs/X-RESEARCH-DASHA-2026-08-08.md');

const LANDING_LINES = [
  'How u crying at the casino and u can’t even get in',
  'It’s time $dasha',
  'All I want is free healthcare, honey',
];

for (const line of LANDING_LINES) {
  assert.ok(landing.includes(line), `landing missing seed: ${line}`);
}
for (const line of LANDING_LINES.slice(0, 2)) assert.ok(studio.includes(line), `studio canonical seed missing: ${line}`);

assert.ok(landing.includes('id="voice"'), 'voice section');
assert.ok(landing.includes('status/2085405075686801789'), 'casino status id');
assert.ok(landing.includes('status/2085544531739754651'), 'time $dasha status id');
for (const id of ['2085923569029242921', '2085905967426986334', '1743055416169304246', '2084021854386454629']) {
  assert.ok(landing.includes('status/' + id), `verified Grok shortlist status missing: ${id}`);
}
assert.ok(landing.includes('status/2085405228078432279'), 'mint source status id');
assert.ok(landing.includes('Friday in the 4HL you can really feel the pull of the weekend'), 'Perry weekend line on landing');
assert.ok(landing.includes('status/1938653816548712548') || landing.includes('PerryALPHA/status/1938653816548712548'), 'Perry weekend status id');
assert.ok(studio.includes('Friday in the 4HL you can really feel the pull of the weekend'), 'Perry weekend line in studio captions');

assert.ok(existsSync(research), 'X research dump missing');
const res = readFileSync(research, 'utf8');
assert.ok(res.includes('2085405075686801789'), 'research missing casino id');
assert.ok(res.includes('53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump'), 'research missing mint');

// The compact Studio keeps the two canonical public seeds while allowing the rest of its rotation
// to evolve independently from the larger homepage quote shelf.
assert.equal(studio.match(/const LOOKS = \[[\s\S]*?id: '(\w+)'/)?.[1], 'poster', 'default Studio look must stay type-first');
assert.match(studio, /id: 'photo'[\s\S]*?crying at the casino/);
assert.match(studio, /id: 'poster'[\s\S]*?It’s time \$dasha/);
assert.match(studio, /<div hidden>\s*<label>Image<\/label>/, 'face gallery must stay off first paint');
assert.match(studio, /LOOKS\.find\(\(option\) => option\.id === 'photo'\)/, 'picking a photo must select Photo, not LOOKS[0]');

console.log('dasha-culture-seeds: PASS');
