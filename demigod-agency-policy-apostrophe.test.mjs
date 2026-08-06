#!/usr/bin/env node
// Guard: a company's "no agencies" statement must be detected however its apostrophe is encoded.
//
// extractAgencyPolicyEvidence had /won't/ with a STRAIGHT apostrophe, and the normaliser decoded
// &nbsp; and &amp; but no apostrophe entities. So "Agencies won’t be paid" was missed three ways —
// literal U+2019, &#39;, and &rsquo;.
//
// The consequence is not cosmetic. A missed policy leaves noAgencyEvidenceReqCount at 0, so
// demigod-lead-sourcer does NOT abstain on that company and surfaces it as a partner lead — a
// company that publicly asked not to be approached by agencies. Same silent-loss class as the
// x-hiring smart-quote bug, in a place where the cost is contacting someone who said no.
//
//   node --test demigod-agency-policy-apostrophe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAgencyPolicyEvidence } from './demigod-role-ledger.mjs';

const URL = 'https://boards.greenhouse.io/example/jobs/1';
const jd = (phrase) => `<div><p>About the role.</p><p>${phrase}</p></div>`;
const detect = (phrase) => extractAgencyPolicyEvidence(jd(phrase), URL);

test('every apostrophe encoding is detected', () => {
  const forms = {
    'straight ASCII': "Agencies won't be paid for unsolicited submissions.",
    'literal U+2019': 'Agencies won’t be paid for unsolicited submissions.',
    'numeric entity': 'Agencies won&#39;t be paid for unsolicited submissions.',
    'named entity': 'Agencies won&rsquo;t be paid for unsolicited submissions.',
    'decimal entity': 'Agencies won&#8217;t be paid for unsolicited submissions.',
  };
  for (const [label, phrase] of Object.entries(forms)) {
    const out = detect(phrase);
    assert.ok(out, `${label}: policy must be detected`);
    assert.equal(out.value, 'no_unsolicited_agency_submissions', `${label}: value`);
    assert.equal(out.status, 'supported', `${label}: status`);
    assert.match(out.quote, /agencies won/i, `${label}: quote must carry the matched phrase`);
  }
});

test('the apostrophe-free wording still works — this is a widening, not a swap', () => {
  const out = detect('Agencies will not be paid for unsolicited submissions.');
  assert.ok(out, 'the "will not" form must keep matching');
  assert.equal(out.value, 'no_unsolicited_agency_submissions');
});

test('silence is still not evidence', () => {
  // Positive-only by design: never treat absence, or a company that DOES use agencies, as a policy.
  assert.equal(detect('We work with recruiting agencies on some roles.'), null, 'using agencies is not a refusal');
  assert.equal(detect('About the role. Great team. Competitive salary.'), null, 'silence is not evidence');
  assert.equal(extractAgencyPolicyEvidence('', URL), null, 'empty input yields nothing');
});

test('evidence still requires a usable url', () => {
  assert.equal(extractAgencyPolicyEvidence(jd("Agencies won't be paid."), ''), null, 'no url, no evidence');
});
