import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// 2026-07-30: this gate used to require the proof question be exactly `Resume?` and to ban the word
// `portfolio`. That rule was retired deliberately, not lost. It was untracked, wired into no gate,
// carried no recorded rationale, and contradicted committed copy that had been curated past five
// earlier phrasings this same file still bans below. `demigod-form-p0.test.mjs:16` independently
// pins the shipped wording. What survives is the invariant that actually mattered: BOTH candidate
// paths ask the SAME question, and neither offers an artefact the product does not accept.
// Do not re-narrow to `Resume?` without a recorded conversion result — see
// /tmp/dg-busy/claude-form-decision-matrix.md.
test('talent experience adapts to skills while the proof ask stays uniform across paths', () => {
  const source = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
  // Anchored on the last helper it needs, not on a passing comment marker: the old
  // `(?=/* v624:)` end-anchor was deleted from foot-core, so this slice silently came back
  // undefined and the test failed on `assert.ok(helpers)` instead of on what it guards.
  const helpers = source.match(/function talentIsTechnical[\s\S]+?function talentNativeLabel\(text\)\{[\s\S]+?\n\}/)?.[0];
  assert.ok(helpers, 'talent helper block not found in foot-core — did a helper get renamed?');
  const context = {};
  vm.runInNewContext(`${helpers};base={q:'What are the 2–3 true must-haves?',h:'A few must-haves.'};result=[talentExperiencePrompt('React, systems, product'),talentProofPrompt('React, systems, product',true),talentExperiencePrompt('growth marketing'),talentProofPrompt('growth marketing',false),['TypeScript','Python','Kubernetes','product design','design systems','product operations','Recruiting operations, people analytics, data','Data engineering, Python, pipelines'].map(talentIsTechnical),talentNativeLabel('Skills & stack *'),talentNativeLabel('What you shipped *'),startupRequirementsPrompt('Founding designer',base),startupRequirementsPrompt('',base)]`, context);
  assert.match(context.result[0].q, /built or shipped/);
  assert.equal(context.result[1].q, 'Resume or work link?');
  assert.match(context.result[1].h, /^Upload a PDF\/Word resume or paste a shareable HTTPS resume, portfolio, or work link\./);
  assert.match(context.result[2].h, /campaign, hire/);
  assert.equal(context.result[3].q, 'Resume or work link?');
  assert.match(context.result[3].h, /^Paste a shareable HTTPS resume, portfolio, or work link\./);
  // The uniformity rule itself, asserted directly rather than implied by two literals: a technical
  // and a non-technical candidate must be asked for proof in the same words.
  assert.equal(context.result[1].q, context.result[3].q, 'technical and non-technical paths must ask the same proof question');
  // Consent travels with the ask on BOTH paths — dropping it is the honesty regression to catch.
  for (const i of [1, 3]) assert.match(context.result[i].h, /Shared only after both sides approve\.$/);
  assert.doesNotMatch([context.result[1], context.result[3]].map(({ q, h }) => `${q} ${h}`).join(' '), /work sample|GitHub|project/i);
  assert.deepEqual(Array.from(context.result[4]), [true, true, true, false, false, false, false, true]);
  assert.equal(context.result[5], 'Next role & strengths *');
  assert.equal(context.result[6], 'What work are you proud of? *');
  assert.equal(context.result[7].q, 'What are the 2–3 true must-haves for your Founding designer?');
  assert.equal(context.result[8].q, 'What are the 2–3 true must-haves?');
  assert.match(source, /'resume':\{q:'Resume or work link\?',h:'PDF\/Word upload or one HTTPS portfolio \/ resume link\. Shared only after both sides approve\./);
  for (const stale of ['Resume or profile link', 'Resume or profile file', 'Resume or technical work sample', 'Resume or work sample', 'shareable work link']) {
    assert.ok(!source.includes(stale), `stale resume alternative: ${stale}`);
  }
  assert.equal((source.match(/steps:\[\['welcome'\],\['sf-bay'\],\['full-name'\]/g) || []).length, 1);
});
