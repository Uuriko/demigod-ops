import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { anonymizeRole } from './demigod-submissions-lib.mjs';

test('founder compensation is one required, reviewable wizard step', () => {
  const foot = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  /* Slice the startup wizard out of WIZ_CFG first, then read `steps` and `optional` from inside
     it. The single mega-regex this replaces required `startup:{` to be followed by `steps:` with
     only whitespace between, so adding one explanatory comment above the steps array — which is
     what happened — made the whole match return undefined and the test read as "the founder
     compensation step is gone" when every field was present and required. The invariant is
     structural, so match it structurally, and fail with a message that says which half is missing. */
  const cfg = foot.slice(foot.indexOf('var WIZ_CFG='));
  const startupBlock = cfg.slice(0, cfg.indexOf('talent:{') === -1 ? undefined : cfg.indexOf('talent:{'));
  assert.notEqual(startupBlock.indexOf('startup:{'), -1, 'WIZ_CFG must still define a startup wizard');
  // steps is an array OF arrays, so a lazy `[\s\S]*?\],` stops at the first inner `],` and
  // captures only `['welcome'`. Match the sequence of bracketed entries instead.
  const steps = startupBlock.match(/steps:\[((?:\s*\[[^\]]*\],?)+)\s*\]/)?.[1];
  const optional = startupBlock.match(/optional:\[([^\]]*)\]/)?.[1];
  assert.ok(steps, 'startup wizard must declare its steps');
  assert.notEqual(optional, undefined, 'startup wizard must declare its optional set');
  const startup = [steps, optional];
  /* PRESENCE is the invariant; SEQUENCE is design. This used to assert
     90day-outcome before salary-range. The wizard now asks the hard constraints together
     (work-location → salary-range) and the open-ended outcome question after — verified
     identical at HEAD, so it is a committed design choice, not drift. Neither order is more
     honest, and the requiredness/reviewability assertions below are what this test is actually
     named for; they all still pass. Encoding a flow preference as a guarantee made a design
     change look like an honesty regression. */
  for (const field of ['90day-outcome', 'work-location', 'salary-range', 'contact-email']) {
    assert.notEqual(startup[0].indexOf(`['${field}']`), -1, `${field} must be its own wizard step`);
  }
  /* This ordering IS load-bearing and stays: describe the role before collecting contact
     details. Asking for an email first turns a brief into a lead-capture form. */
  assert.ok(startup[0].indexOf("['salary-range']") < startup[0].indexOf("['contact-email']"),
    'contact details are collected only after the role is described');
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
