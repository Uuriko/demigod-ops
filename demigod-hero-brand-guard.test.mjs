#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const guard = source.match(/function guardHeroBrandH1\(el\) \{[\s\S]+?\n\}/)?.[0] || '';
assert.match(guard, /el\._dgHeroObserver/);
assert.match(guard, /MutationObserver/);
assert.match(guard, /!\/\^Demigod\$\/i/);
assert.match(guard, /paintHeroBrandH1\(el\)/);
assert.match(source, /guardHeroBrandH1\(e\);/);
assert.match(source, /function paintHeroBrandH1[\s\S]+?style\.visibility = 'visible'/);
assert.doesNotMatch(source, /paintDualPathH1|Find talent\.<br>|I'm hiring\.<br>/i);
// The DG_ART indirection was removed and the hero art URL inlined. What actually mattered
// was never the variable — it was that the desktop hero points at an IMMUTABLE pinned CDN
// commit. @main is mutable and would let the hero change under a published release, so
// require a pinned ref explicitly rather than any jsdelivr URL.
assert.match(
  source,
  /<source media="\(min-width:901px\)" srcset="https:\/\/cdn\.jsdelivr\.net\/gh\/Uuriko\/demigod-site-cdn@(?!main\b)[0-9a-f]{8,}\/art\/[^"']+"/,
);
assert.doesNotMatch(source, /<img class="dg-art-img" src=/);

console.log('demigod permanent hero brand guard: PASS');
