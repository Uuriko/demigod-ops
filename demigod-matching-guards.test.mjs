#!/usr/bin/env node
// Fail-closed input guards on the matcher's intro entry point (outbound-adjacent — proposeIntro feeds
// intro drafting). Run: node --test demigod-matching-guards.test.mjs
//
// NOTE: suggestMatches('') also has an important anti-sample-seed guard (a blank query would
// .includes('')-match roles[0], a sample seed). It is NOT asserted here: with no injectable board,
// removing the guard still yields {error:'no role'} via the later `if (!role)` fallback, so the
// assertion would be VACUOUS (passes even if the guard is deleted). Left uncovered on purpose rather
// than shipping a green-but-meaningless test — needs a board-injection seam to test honestly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposeIntro } from './demigod-matching-engine.mjs';

test('proposeIntro fails closed on missing role/candidate (proven non-vacuous)', () => {
  // Without the guard, proposeIntro('','') proceeds and returns 'no mutual match found' — so a
  // /required/ match genuinely goes RED if the guard is removed.
  assert.match(proposeIntro('', '').error, /required/);
  assert.match(proposeIntro('role', '').error, /required/);
  assert.match(proposeIntro('', 'cand').error, /required/);
  assert.match(proposeIntro('  ', '  ').error, /required/, 'whitespace-only trims to empty -> still required');
});
