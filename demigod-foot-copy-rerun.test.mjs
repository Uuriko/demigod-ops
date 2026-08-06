#!/usr/bin/env node
// Guard: the copy scrubs must be re-applied after DOMContentLoaded.
//
// boot() ran run() exactly once on DOMContentLoaded. Webflow writes some section headings after
// that, so the scrubs in copy() tested text that was not final and the shout titles reached users —
// observed live on 2026-08-05: "TECH-MATCHED SF STARTUP TALENT" survived, while the paragraph
// scrub in the same function applied. Re-running the exact scrub logic in the live DOM fixed it,
// which proved the logic was correct and only the timing was wrong.
//
//   node --test demigod-foot-copy-rerun.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8');

test('foot-core re-applies copy scrubs on load (non-vacuous: source is readable)', () => {
  // An empty/short read must fail here rather than silently satisfy the regexes below.
  assert(SRC.length > 100000, `foot-core read looks wrong: ${SRC.length} bytes`);
  assert.match(SRC, /function boot\(\)/, 'boot() present');
});

test('boot wires a one-shot load re-run of copy()', () => {
  const boot = SRC.slice(SRC.indexOf('function boot()'), SRC.indexOf('function boot()') + 1200);
  assert(boot.length > 200, 'boot() body located');
  assert.match(
    boot,
    /addEventListener\('load',\s*function\s*\(\)\s*\{\s*try\s*\{\s*copy\(\)/,
    'boot() must re-run copy() on load — without it, headings written after DOMContentLoaded are never scrubbed',
  );
  assert.match(boot, /\{\s*once:\s*true\s*\}/, 're-run must be one-shot, not a repeating listener');
});

test('the shout-title scrub it protects still exists', () => {
  // If this scrub is ever removed, the re-run above is protecting nothing. Assert the two halves
  // independently — the source between them contains regex literals, so an adjacency match is
  // brittle rather than strict.
  const scrub = SRC.split('\n').find((l) => /TECH-MATCHED/.test(l) && /textContent\s*=/.test(l));
  assert(scrub, 'a line must both match TECH-MATCHED and assign textContent');
  /* Assert the MECHANISM, not the replacement copy. This pinned the literal
     "A match has three gates." and went red when a copy pass changed it to
     "A match has three clear steps." — the scrub was working the whole time.
     Same copy-coupled-oracle class this suite has been cleaning up all session:
     what must hold is that the shout title is replaced with something, not with
     one exact sentence that marketing is free to revise. */
  assert.match(scrub, /textContent\s*=\s*'[^']{8,}'/, 'scrub assigns a non-trivial replacement');
  assert.doesNotMatch(scrub, /textContent\s*=\s*''/, 'scrub must replace the title, not blank it');
});
