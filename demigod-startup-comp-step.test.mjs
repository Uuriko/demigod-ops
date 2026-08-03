import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { anonymizeRole } from './demigod-submissions-lib.mjs';

test('founder compensation is one required, reviewable wizard step', () => {
  const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  const startup = foot.match(/startup:\{\s*steps:\[([\s\S]*?)\],\s*welcome:[\s\S]*?optional:\[([^\]]*)\]/)?.slice(1);
  assert.ok(startup);
  assert.ok(startup[0].indexOf("['90day-outcome']") < startup[0].indexOf("['salary-range']"));
  assert.ok(startup[0].indexOf("['work-location']") < startup[0].indexOf("['salary-range']"));
  assert.ok(startup[0].indexOf("['salary-range']") < startup[0].indexOf("['contact-email']"));
  assert.equal((startup[0].match(/\['salary-range'\]/g) || []).length, 1);
  assert.doesNotMatch(startup[1], /salary-range/);
  assert.match(foot, /name="salary-range" required/);
  // The `'field':'constraints'` group map was deleted; the review panel is now built
  // generically from Object.keys(answers) against qmap, and `if (!qd) return;` SILENTLY
  // DROPS any field with no WIZ_Q entry. So a question entry is what actually keeps
  // compensation reviewable — assert that instead of the dead mapping.
  assert.match(foot, /'salary-range':\{q:'[^']+'/, 'salary-range needs a WIZ_Q entry or it vanishes from review');
  assert.doesNotMatch(foot, /'salary-range':\{q:'[^']*optional/i);

  const ingest = fs.readFileSync(new URL('./demigod-submissions-lib.mjs', import.meta.url), 'utf8');
  // The invariant is "all three constraint fields are carried into the submission, in this order".
  // submissions-lib hoisted them into locals (outcome/location/compensation) and added alias
  // fallbacks, so the literal `'field', raw['field']` pairing no longer appears even though the
  // ordering and the coverage are intact. Assert the ordering, not the access expression.
  const order = ['90day-outcome', 'work-location', 'salary-range'];
  const at = order.map((field) => {
    const index = ingest.indexOf(`['${field}',`);
    assert.notEqual(index, -1, `${field} must be carried into the submission`);
    return index;
  });
  assert.ok(at[0] < at[1] && at[1] < at[2], `constraint fields must stay in order ${order.join(' → ')}`);
  // Each must still be sourced from the raw payload somewhere, directly or via an alias.
  for (const field of order) {
    assert.match(ingest, new RegExp(`raw\\['${field}'\\]`), `${field} must read from raw`);
  }
});

test('public compensation keeps the range but removes contact details', () => {
  const role = anonymizeRole({
    'role-title': 'Founding PM',
    'stack-needs': 'B2B SaaS',
    'salary-range': '$180-220k — ask ceo@secret.com or (415) 555-0123, linkedin.com/in/founder',
  });
  assert.match(role.comp, /\$180-220k/);
  // Scrub on the public *comp* string (and known contact tokens on the card). Do not scan
  // bare digit fragments on JSON.stringify(role) — role ids are hex and can contain "415".
  assert.doesNotMatch(role.comp, /ceo@secret/i);
  assert.doesNotMatch(role.comp, /linkedin\.com\/in\/founder/i);
  assert.doesNotMatch(role.comp, /\(415\)\s*555[-.]?0123|415[-.]555[-.]0123/);
  assert.doesNotMatch(JSON.stringify(role), /ceo@secret\.com|linkedin\.com\/in\/founder/i);
});
