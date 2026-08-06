/**
 * Research-grounded copy gates (2026-08-06): action-named talent CTA +
 * post-submit "what happens next" honesty. Drives real foot-core source.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const foot = fs.readFileSync(path.join(root, 'demigod-foot-core.js'), 'utf8');
const head = fs.readFileSync(path.join(root, 'demigod-head-minimal.html'), 'utf8');

function extractCopyField(src, key) {
  const m = src.match(new RegExp(key + "\\s*:\\s*(['\"])([\\s\\S]*?)\\1"));
  return m ? m[2] : null;
}

test('talent CTA is action-named Share privately (not vague board language)', () => {
  const cta = extractCopyField(foot, 'ctaEngineer');
  assert.equal(cta, 'Share privately');
  assert.doesNotMatch(cta, /looking|job board|network/i);
  // Head fail-open must ship the same label (verify also derives this).
  assert.match(head, /Share privately/);
  assert.match(head, /\['Hire talent','Share privately'\]|Share privately — open private candidate form/);
});

test('post-submit copy names human read, contact channel, and no blast sequence', () => {
  assert.match(foot, /var STARTUP_OK='[^']*human reads every submission[^']*potter@trydemigod\.com[^']*no automated drip/);
  assert.match(foot, /var ENGINEER_OK='[^']*Saved privately[^']*approve an intro[^']*no blasts/);
  assert.match(foot, /WIZ_THANKS=\{[\s\S]*startup:\{[\s\S]*lead:'A human reads this next[\s\S]*potter@trydemigod\.com/);
  assert.match(foot, /engineer:\{[\s\S]*potter@trydemigod\.com is the contact channel/);
  // Honesty: no invented SLA hours/days in these thanks strings.
  const thanksBlock = foot.match(/var WIZ_THANKS=\{[\s\S]*?\n\};/)?.[0] || '';
  assert.doesNotMatch(thanksBlock, /\b\d+\s*(hour|hr|day|business day)s?\b/i);
});

test('startup welcome still states fee and mutual yes without inventing volume', () => {
  const welcome = foot.match(/startup:\{[\s\S]*?welcome:\{t:'Hiring brief',b:'([^']+)'/);
  assert.ok(welcome, 'startup welcome missing');
  assert.match(welcome[1], /10%/);
  assert.match(welcome[1], /mutual yes/i);
  assert.doesNotMatch(welcome[1], /\b\d+\s*(candidates|placements|hires)\b/i);
});
