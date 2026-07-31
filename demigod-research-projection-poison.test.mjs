#!/usr/bin/env node
// Adversarial poison tests for the Phase 1 catalog projector (docs/die/ROADMAP.md).
// The roadmap claims the projector derives accepted fields ONLY from frozen gold, fails closed on
// duplicates and malformed claims, and never lets an operational row widen what the benchmark
// accepted. Reviews asserted those properties; this executes them. Every case here is an attempt
// to make the projector emit something it promised it would not.
import assert from 'node:assert/strict';
import { projectCompanyResearch, gradeResearchBenchmark, COMPANY_RESEARCH_FIELDS } from './demigod-evidence.mjs';

const good = (value, quote = 'exact supporting words from the page') => ({
  status: 'supported', value, url: 'https://example.com/about', quote,
});
const blank = { status: 'unknown', value: null, url: null, quote: null };

// A synthetic gold that grades clean and reproduces the real shape: four accepted fields with
// pricingStatus withheld (its coverage is deliberately below the 0.9 threshold).
function goldDoc() {
  const companies = Array.from({ length: 30 }, (_, i) => ({
    id: `gold:${i}`,
    researchedAt: '2026-07-28',
    fields: Object.fromEntries(COMPANY_RESEARCH_FIELDS.map((name) => [
      name,
      name === 'pricingStatus' ? blank : good(`${name}-value-${i}`),
    ])),
  }));
  return { researchedAt: '2026-07-28', companies };
}

const gold = goldDoc();
const grade = gradeResearchBenchmark(gold);
assert.deepEqual(grade.errors, [], 'the synthetic gold must itself be valid, or every case below is vacuous');
assert.ok(grade.acceptedFields.length === COMPANY_RESEARCH_FIELDS.length - 1, 'four accepted');
assert.ok(!grade.acceptedFields.includes('pricingStatus'), 'pricing withheld, mirroring the real receipt');

{
  const weakened = structuredClone(gold);
  weakened.thresholds = { usableCoverage: 0, evidenceSupport: 0 };
  assert.match(
    gradeResearchBenchmark(weakened).errors.join('\n'),
    /benchmark thresholds must remain/,
    'a tampered threshold must not make an unsupported field pass',
  );
  assert.equal(
    projectCompanyResearch({ companyId: 'gold:0', benchmark: weakened }),
    null,
    'the projector must fail closed on tampered benchmark policy',
  );
}

const project = (catalogRows, companyId = 'op:1') =>
  projectCompanyResearch({ companyId, benchmark: gold, catalog: { researchedAt: '2026-07-29', companies: catalogRows } });
const row = (fields, extra = {}) => ({ id: 'op:1', researchedAt: '2026-07-29', fields, ...extra });

// --- the headline promise: a catalog row cannot widen what the gold accepted -------------
{
  const out = project([row({ pricingStatus: good('public-exact'), productSummary: good('a summary') })]);
  assert.equal(out.source, 'catalog');
  assert.ok(!('pricingStatus' in out.fields), 'a withheld field must not project even with perfect evidence');
  assert.ok('productSummary' in out.fields, 'an accepted field still projects');
  assert.deepEqual(out.acceptedFields, grade.acceptedFields, 'accepted set comes from gold, not the catalog');
}

// Non-vacuity control for the case above: pricing is excluded BECAUSE the gold withheld it, not
// because the projector special-cases the name. Accept it in the gold and it projects normally.
{
  const pricingGold = goldDoc();
  for (const company of pricingGold.companies) company.fields.pricingStatus = good('contact-sales');
  const openGrade = gradeResearchBenchmark(pricingGold);
  assert.deepEqual(openGrade.errors, []);
  assert.ok(openGrade.acceptedFields.includes('pricingStatus'), 'control gold accepts pricing');
  const out = projectCompanyResearch({
    companyId: 'op:1',
    benchmark: pricingGold,
    catalog: { companies: [row({ pricingStatus: good('public-exact') })] },
  });
  assert.equal(out.fields.pricingStatus.value, 'public-exact',
    'so the earlier exclusion was the gold gate doing its job, not a hardcoded field name');
}

// --- SSRF: the catalog is operator-authored, so its URLs are untrusted input --------------
for (const url of [
  'http://169.254.169.254/latest/meta-data/',  // cloud metadata
  'http://127.0.0.1:8080/admin',
  'http://localhost/secret',
  'http://10.0.0.5/internal',
  'http://192.168.1.1/router',
  'http://172.16.0.9/private',
  'file:///etc/passwd',
  'javascript:alert(1)',
]) {
  const out = project([row({ productSummary: { status: 'supported', value: 'v', url, quote: 'words here' } })]);
  assert.ok(!('productSummary' in out.fields), `must refuse evidence hosted at ${url}`);
}

// --- the SSRF surface Codex widened after the first pass of this suite -------------------
// isIP() now rejects bare addresses outright and .internal/.lan join the suffix list, so these
// are new code paths. Locked here so the widening cannot silently narrow again.
for (const url of [
  'http://metadata.internal/creds',      // .internal suffix
  'http://printer.lan/status',           // .lan suffix
  'http://[::1]/admin',                  // IPv6 loopback, bracketed
  'http://[fd00::1]/private',            // IPv6 unique-local
  'http://2130706433/',                  // 127.0.0.1 as a bare integer
  'http://0x7f000001/',                  // 127.0.0.1 as hex
  'https://user:pass@example.com/a',     // credentials in the URL
  `https://example.com/${'a'.repeat(2100)}`, // over the 2048-char cap
]) {
  const out = project([row({ productSummary: { status: 'supported', value: 'v', url, quote: 'words here' } })]);
  assert.ok(!('productSummary' in out.fields), `must refuse evidence at ${url.slice(0, 60)}`);
}
// Control: a normal public URL on a real host still passes, so the block above is not blanket refusal.
{
  const out = project([row({ productSummary: { status: 'supported', value: 'v', url: 'https://sub.example.co.uk/page?q=1#f', quote: 'words here' } })]);
  assert.ok('productSummary' in out.fields, 'an ordinary public URL must still be accepted');
}

// --- fail-closed on ambiguity -------------------------------------------------------------
assert.equal(project([row({ productSummary: good('a') }), row({ productSummary: good('b') })]), null,
  'two catalog rows for one company must project nothing, not pick one');
{
  const dupGold = goldDoc();
  dupGold.companies[1].id = dupGold.companies[0].id;   // duplicate ids -> grade error
  assert.equal(projectCompanyResearch({ companyId: 'gold:0', benchmark: dupGold, catalog: {} }), null,
    'a gold set that does not grade must project nothing at all');
}
assert.equal(projectCompanyResearch({ companyId: 'nobody', benchmark: gold, catalog: {} }), null,
  'an unknown company projects nothing');

// --- a malformed CATALOG must fail closed, not masquerade as an empty one -----------------
// Found by a peer: `companies` present but not an array was being treated as an empty catalog,
// silently falling back to the benchmark. My suite had tested `{}` and `[]` and missed the whole
// class between them. Locking every shape, so the fix cannot regress to any one of them.
for (const [label, catalog] of Object.entries({
  nullCompanies: { companies: null },
  stringCompanies: { companies: 'nope' },
  objectCompanies: { companies: {} },
  numberCompanies: { companies: 0 },
  boolCompanies: { companies: true },
})) {
  assert.equal(
    projectCompanyResearch({ companyId: 'gold:3', benchmark: gold, catalog }),
    null,
    `${label}: a present-but-malformed catalog must refuse, not fall back to the benchmark`,
  );
}
// The two shapes that legitimately mean "no catalog" must still fall back.
for (const [label, catalog] of Object.entries({ absent: {}, emptyArray: { companies: [] } })) {
  const out = projectCompanyResearch({ companyId: 'gold:3', benchmark: gold, catalog });
  assert.equal(out?.source, 'benchmark', `${label}: an absent or empty catalog is valid, not an error`);
}
// This case CRASHED before 2026-07-30: `[null]` reached `.filter(c => c.id === ...)` and threw on
// `null.id` — a module documented fail-closed taking down its caller. I had been about to write this
// boundary as a prose comment claiming "a non-object has no .id to match"; asserting it instead is
// what exposed that the claim was false for null. Junk entries are now skipped, so an array of junk
// reads as an empty catalog: data lost silently, but no crash and no wrong answer.
{
  const out = projectCompanyResearch({ companyId: 'gold:3', benchmark: gold, catalog: { companies: [[], null, 'x'] } });
  assert.equal(out?.source, 'benchmark', 'array-of-junk currently reads as an empty catalog');
}

// --- malformed claims are dropped field-by-field, not accepted wholesale ------------------
const malformed = {
  emptyValue: { status: 'supported', value: '   ', url: 'https://example.com/a', quote: 'words' },
  blankQuote: { status: 'supported', value: 'v', url: 'https://example.com/a', quote: '   ' },
  longQuote: { status: 'supported', value: 'v', url: 'https://example.com/a', quote: Array.from({ length: 21 }, () => 'w').join(' ') },
  badStatus: { status: 'probably', value: 'v', url: 'https://example.com/a', quote: 'words' },
  missingUrl: { status: 'supported', value: 'v', url: null, quote: 'words' },
};
for (const [label, field] of Object.entries(malformed)) {
  const out = project([row({ productSummary: field, likelyBuyer: good('kept') })]);
  assert.ok(!('productSummary' in out.fields), `${label} must be dropped`);
  assert.ok('likelyBuyer' in out.fields, `${label} must not poison its sibling fields`);
}
// A 20-word quote is the boundary and must still be allowed.
{
  const twenty = Array.from({ length: 20 }, () => 'w').join(' ');
  const out = project([row({ productSummary: { status: 'supported', value: 'v', url: 'https://example.com/a', quote: twenty } })]);
  assert.ok('productSummary' in out.fields, 'exactly 20 words is inside the limit');
}

// --- status semantics ---------------------------------------------------------------------
assert.equal(project([row({ productSummary: good('v') })]).status, 'verified');
assert.equal(project([row({ productSummary: { ...good('v'), status: 'conflict' } })]).status, 'verified_with_conflict',
  'a conflict must surface, never be smoothed into a clean verdict');
assert.equal(project([row({ productSummary: blank })]).status, 'unknown');
assert.equal(project([row({})]).status, 'unknown', 'a row with no fields is unknown, not an error');

// --- catalog precedence, and the benchmark fallback ---------------------------------------
{
  assert.equal(projectCompanyResearch({ companyId: 'gold:3', benchmark: gold, catalog: { companies: {} } }), null,
    'a non-array catalog companies field must fail closed, not masquerade as an empty catalog');
  const out = projectCompanyResearch({ companyId: 'gold:3', benchmark: gold, catalog: { companies: [] } });
  assert.equal(out.source, 'benchmark', 'an empty catalog falls back to gold');
  const over = projectCompanyResearch({
    companyId: 'gold:3',
    benchmark: gold,
    catalog: { companies: [{ id: 'gold:3', researchedAt: '2026-07-29', fields: { productSummary: good('catalog wins') } }] },
  });
  assert.equal(over.source, 'catalog');
  assert.equal(over.fields.productSummary.value, 'catalog wins');
}

// --- quarantine flag ----------------------------------------------------------------------
assert.equal(project([row({ productSummary: good('v') }, { quarantineHiring: true })]).quarantineHiring, true);
assert.equal(project([row({ productSummary: good('v') })]).quarantineHiring, false);
// Documents current behaviour, which is strict-equality: a truthy NON-true value does not
// quarantine. Recorded deliberately — see the note reported to Codex. If the contract changes to
// "any truthy value quarantines", this assertion is the one to flip.
assert.equal(project([row({ productSummary: good('v') }, { quarantineHiring: 'yes' })]).quarantineHiring, false,
  'strict === true today: a string flag silently does NOT quarantine');

// A quarantine is a NARROWING the frozen gold applied, so a catalog row cannot lift it by omission.
// The widening guard above protects the accepted-field set; this protects the flag. Before the fix
// the catalog row simply shadowed the gold row and the projection came back false, which the export
// happily validated (it only type-checks the boolean) and which lead-sourcer reads as "not
// quarantined" — the company re-entered partner selection.
{
  const quarantined = goldDoc();
  quarantined.companies[0].quarantineHiring = true;
  const p = (catalogRows) => projectCompanyResearch({
    companyId: 'gold:0', benchmark: quarantined,
    catalog: { researchedAt: '2026-07-29', companies: catalogRows },
  });
  assert.equal(p([]).quarantineHiring, true, 'gold-only quarantine still projects');
  assert.equal(
    p([{ id: 'gold:0', researchedAt: '2026-07-29', fields: { productSummary: good('catalog summary') } }]).quarantineHiring,
    true,
    'a catalog row that omits the flag must NOT clear a gold quarantine',
  );
  assert.equal(
    p([{ id: 'gold:0', quarantineHiring: false, fields: { productSummary: good('v') } }]).quarantineHiring,
    true,
    'nor may it clear one by asserting false',
  );
  // Non-vacuity control: the union only ever ADDS. With a clean gold row the catalog still decides,
  // so the assertions above are the gold flag surviving, not the projector hardcoding true.
  const clean = goldDoc();
  assert.equal(
    projectCompanyResearch({
      companyId: 'gold:0', benchmark: clean,
      catalog: { companies: [{ id: 'gold:0', fields: { productSummary: good('v') } }] },
    }).quarantineHiring,
    false,
    'no quarantine anywhere still projects false',
  );
  assert.equal(
    projectCompanyResearch({
      companyId: 'gold:0', benchmark: clean,
      catalog: { companies: [{ id: 'gold:0', quarantineHiring: true, fields: { productSummary: good('v') } }] },
    }).quarantineHiring,
    true,
    'and a catalog-only quarantine still applies',
  );
}

// --- unknownReason closed enum (mechanism #5 unlock) --------------------------------------
// Optional on status:'unknown' only. Junk codes fail the grade (and thus the projector).
// A valid reason must NOT invent a verified claim or lift usableCoverage into pass.
{
  const withReason = goldDoc();
  for (const company of withReason.companies) {
    company.fields.pricingStatus = {
      status: 'unknown', value: null, url: null, quote: null, unknownReason: 'not_applicable',
    };
  }
  const g = gradeResearchBenchmark(withReason);
  assert.deepEqual(g.errors, [], 'closed-enum unknownReason on all-null unknown stays valid');
  assert.equal(g.fields.pricingStatus.unknown, 30);
  assert.equal(g.fields.pricingStatus.supported, 0, 'a reason is not a supported claim');
  assert.equal(g.fields.pricingStatus.pass, false, 'reasons must not auto-accept pricing');
  assert.ok(!g.acceptedFields.includes('pricingStatus'), 'pricing stays withheld with reasons');
  // Projector still refuses pricing when gold withholds it — reason is not a backdoor.
  const out = projectCompanyResearch({
    companyId: 'op:1',
    benchmark: withReason,
    catalog: { companies: [row({
      pricingStatus: {
        status: 'unknown', value: null, url: null, quote: null, unknownReason: 'not_found',
      },
      productSummary: good('ok'),
    })] },
  });
  assert.ok(out, 'valid gold with reasons still projects accepted fields');
  assert.ok(!('pricingStatus' in out.fields), 'unknown+reason never projects as evidence');
  assert.ok('productSummary' in out.fields);
}
for (const junk of ['invented_code', 'NOT_FOUND', 'not-applicable', ' ', 0, true, ['not_found'], { r: 'not_found' }]) {
  const poisoned = goldDoc();
  poisoned.companies[0].fields.pricingStatus = {
    status: 'unknown', value: null, url: null, quote: null, unknownReason: junk,
  };
  const errors = gradeResearchBenchmark(poisoned).errors.join('\n');
  assert.match(errors, /unknownReason must be/, `junk reason ${JSON.stringify(junk)} must fail grade`);
  assert.equal(
    projectCompanyResearch({ companyId: 'gold:0', benchmark: poisoned, catalog: {} }),
    null,
    `junk reason ${JSON.stringify(junk)} must fail the projector closed`,
  );
}
// value/url/quote still required null even when a valid reason is present.
{
  const conflicted = goldDoc();
  conflicted.companies[0].fields.pricingStatus = {
    status: 'unknown',
    value: 'secretly priced',
    url: 'https://example.com/pricing',
    quote: 'plans start free',
    unknownReason: 'not_found',
  };
  const errors = gradeResearchBenchmark(conflicted).errors.join('\n');
  assert.match(errors, /unknown must have null value\/url\/quote/,
    'a reason must not launder non-null evidence on an unknown claim');
  assert.equal(
    projectCompanyResearch({ companyId: 'gold:0', benchmark: conflicted, catalog: {} }),
    null,
    'value+reason conflict fails closed at the projector',
  );
}
// Empty / null reason remains the pre-unlock shape (ledger reports unstated).
for (const reason of [null, undefined, '']) {
  const plain = goldDoc();
  plain.companies[0].fields.pricingStatus = {
    status: 'unknown', value: null, url: null, quote: null,
    ...(reason === undefined ? {} : { unknownReason: reason }),
  };
  assert.deepEqual(gradeResearchBenchmark(plain).errors, [],
    `absence shape ${JSON.stringify(reason)} stays valid`);
}

console.log('research projection poison: all cases PASS');
