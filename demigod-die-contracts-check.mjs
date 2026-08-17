#!/usr/bin/env node
/**
 * demigod-die-contracts-check — make docs/die/CONTRACTS.md answerable instead of merely written.
 *
 * WHY
 * CONTRACTS.md declares 29 contracts and, as of 2026-08-17, no .mjs file read it. That is the
 * documented anti-pattern: a contract in a document drifts, a contract evaluated on every batch
 * cannot. The evidence runs both ways in this repo and that is what makes the case. §5 Claim holds
 * perfectly — 150 claims in the live benchmark, zero violations — because demigod-evidence.mjs
 * independently implements it. Every bug found in the 2026-08-17 DIE audit was instead a rule that
 * existed ONLY in prose or a docstring: hiring-shape's people-building had no share bound,
 * candidate-touch never suppressed the opt_out it recorded, hiringVelocity counted a board's
 * first-sight backlog as opens, assertNote let a duplicate rating carry an unevidenced judgment.
 * The contracts with code twins hold. The prose-only ones are where the defects live.
 *
 * WHAT THIS IS NOT
 * Not a markdown-to-code compiler, and not a second source of truth. Where a contract already has
 * an executor, this CALLS that executor rather than reimplementing the rule from the document —
 * a reimplementation would be a second thing to keep in sync and a tempting shortcut past the
 * real one. This file's job is to answer, per section: is this enforced, and does it hold?
 *
 * WHAT `enforced` DOES NOT MEAN. It means an executor was called and the assertions written here
 * passed. It does NOT mean the section is fully covered, and the count is not a quality score — a
 * section resting on one weak assertion counts the same as §8's nine. The spec-driven-development
 * literature names this failure directly: a spec can look authoritative while missing the edge
 * cases that matter, and the practice drifts into ceremony once the document stops being the real
 * contract and the truth quietly moves into the checker. That is why every executor here CALLS the
 * module that really decides, why the per-section detail line reports how many rules were actually
 * exercised rather than just "ok", and why the gate — never this file — is authoritative when they
 * disagree. Read the detail, not the headline.
 *
 * THREE ANSWERS, AND `unwired` IS THE HONEST ONE
 *   pass      an executor exists, was called, and the live artifact satisfies it
 *   violation an executor exists and something failed — this is the only failing state
 *   unwired   the section is prose with no executor. NOT a pass. Free prose must never fail
 *             verify-all, but it must never be counted as verified either. The unwired count is
 *             the backlog, and it is meant to be read.
 *
 * An absent artifact is a violation, never a pass. A checker that goes quiet when the file it
 * checks is missing is the exact failure this repo keeps hitting: absence read as health.
 *
 * OWNERSHIP: docs/die/CONTRACTS.md belongs to grok (sections 19–29 active). This module only ever
 * READS it, pins to headings and fenced blocks rather than a byte hash so the file can keep being
 * edited, and adds no check-markup to it.
 *
 *   node demigod-die-contracts-check.mjs [--json]
 *   node demigod-die-contracts-check.mjs --selftest
 *
 * Schema: demigod.die-contracts-check/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeResearchUrl } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS = path.join(ROOT, 'docs', 'die', 'CONTRACTS.md');
const BENCHMARK = path.join(ROOT, 'DEMIGOD-COMPANY-RESEARCH-BENCHMARK.json');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export const SCHEMA = 'demigod.die-contracts-check/1';

/** PURE. `## 5. Claim` -> { n: 5, title: 'Claim' }. Pinned to headings, not byte offsets. */
export function parseSections(markdown) {
  const out = [];
  for (const line of String(markdown || '').split('\n')) {
    const m = /^##\s+(\d+)\.\s+(.+?)\s*$/.exec(line);
    if (m) out.push({ n: Number(m[1]), title: m[2] });
  }
  return out;
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Walk any nested structure and yield objects that look like a Claim (§5 shape). */
function collectClaims(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if ('status' in node && 'value' in node) {
    out.push(node);
    return out;
  }
  for (const v of Object.values(node)) collectClaims(v, out);
  return out;
}

/**
 * §5 Claim. The rule lives in demigod-evidence.mjs; this asserts the live corpus satisfies the
 * shape the document promises — non-empty value, safe https URL, exact quote, at most 20 words,
 * and `unknown` carrying no payload at all.
 */
function checkClaim() {
  if (!fs.existsSync(BENCHMARK)) {
    return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };
  }
  const claims = collectClaims(readJson(BENCHMARK));
  if (!claims.length) {
    return { status: 'violation', detail: 'no claims found — a vacuous pass is not a pass' };
  }
  const bad = [];
  for (const c of claims) {
    if (c.status === 'unknown') {
      if (c.value !== null || c.url || c.quote) bad.push('unknown carries a payload');
      continue;
    }
    if (c.status !== 'supported' && c.status !== 'conflict') { bad.push(`status ${c.status}`); continue; }
    if (!c.value) bad.push(`${c.status}: empty value`);
    if (!c.url || !safeResearchUrl(c.url)) bad.push(`${c.status}: unsafe or missing url`);
    if (!c.quote) bad.push(`${c.status}: missing quote`);
    else if (String(c.quote).trim().split(/\s+/).length > 20) bad.push(`${c.status}: quote over 20 words`);
  }
  return bad.length
    ? { status: 'violation', detail: `${bad.length} of ${claims.length} claims violate §5`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `${claims.length} live claims satisfy §5` };
}

/**
 * §11 Safe URL. Calls safeResearchUrl — the executor — with one case per bullet the document
 * lists. If the document and the function ever disagree, this fails and one of them is wrong.
 */
function checkSafeUrl() {
  const accepted = ['http://example.com/a', 'https://example.com/a'];
  const rejected = [
    'http://localhost/a', 'http://foo.localhost/a', 'http://printer.local/a',
    'http://127.0.0.1/a', 'http://10.0.0.1/a', 'http://192.168.1.1/a', 'http://172.16.0.1/a',
    'http://169.254.1.1/a', 'http://[::1]/a', 'http://[fc00::1]/a', 'http://[fe80::1]/a',
    'https://user:pass@example.com/a', 'file:///etc/passwd', 'javascript:alert(1)',
  ];
  const bad = [];
  for (const u of accepted) if (!safeResearchUrl(u)) bad.push(`accepted URL refused: ${u}`);
  for (const u of rejected) if (safeResearchUrl(u)) bad.push(`rejected URL allowed: ${u}`);
  return bad.length
    ? { status: 'violation', detail: `${bad.length} §11 mismatches between document and executor`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `${accepted.length + rejected.length} §11 cases match safeResearchUrl` };
}

/**
 * §10 Hiring quarantine. The document lists exactly which fields go null when quarantined, which
 * is a real trap: quarantine must null the count, never zero it. Calls the packet builder.
 */
async function checkQuarantine() {
  const { buildCompanyPacket } = await import('./demigod-company-packet.mjs');
  if (!fs.existsSync(BENCHMARK)) {
    return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };
  }
  // Use the REAL benchmark: projectCompanyResearch grades it first and returns null on any error,
  // so a hand-made stub silently disables the very projection under test — the check would have
  // "passed" against a company that was never quarantined at all. Quarantine one real benchmark
  // row against a synthetic map company carrying a full hiring block, so every field §10 names
  // has something to null out.
  const benchmark = readJson(BENCHMARK);
  const companyId = (benchmark.companies || [])[0]?.id;
  if (!companyId) return { status: 'violation', detail: 'benchmark has no rows to quarantine' };
  const company = {
    id: companyId, name: 'Q', website: 'https://q.example/', source: 'Y Combinator',
    atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/q',
    openRoles: 7, openRolesAt: '2026-08-14', roleMix: { engineering: 7 }, hiring: 'yes',
  };
  const packet = buildCompanyPacket({
    companyId,
    map: { companies: [company] },
    ledger: { roles: {} },
    signals: {},
    benchmark,
    catalog: { version: 1, researchedAt: null, companies: [{ id: companyId, fields: {}, quarantineHiring: true }] },
  });
  const h = packet.hiring || {};
  const bad = [];
  if (h.status !== 'quarantined') bad.push(`status ${h.status} (expected quarantined)`);
  for (const field of ['openRoles', 'atsSource', 'jobsUrl', 'roleMix']) {
    if (h[field] !== null) bad.push(`${field} is ${JSON.stringify(h[field])}, contract says null`);
  }
  // The trap the contract exists to prevent: a quarantined company reported as hiring nobody.
  if (h.openRoles === 0) bad.push('openRoles zeroed rather than nulled — that publishes "not hiring"');
  return bad.length
    ? { status: 'violation', detail: '§10 quarantine projection disagrees with the contract', sample: bad }
    : { status: 'pass', detail: 'quarantine nulls the hiring block as written' };
}

/**
 * Section number -> the executor that really decides it. Deliberately small: a section earns an
 * entry only when a real executor exists to call. Everything else stays `unwired`, which is the
 * honest answer and the visible backlog.
 */
/**
 * §29 Role Mission kernel — the company-truth rules, pinned to the fenced block grok appended.
 *
 * This is the first section written to be machine-checkable on purpose: the fence text was agreed
 * on the bus before it was written, so this reads the document's own rules and then asks the KERNEL
 * whether it enforces them. It never reimplements a rule — every assertion below is `attachCompany`
 * refusing (or accepting) input. If grok changes the kernel and forgets the fence, or edits the
 * fence and forgets the kernel, the two disagree here and this goes red.
 *
 * Pinned to the fence block, never to a hash of the file: §19–29 are actively authored and must
 * stay editable without turning this red for cosmetic reasons.
 */
/**
 * The §29 `board-observed` rule, asked of any status function.
 *
 * Takes the function rather than reading the kernel directly so the poison suite can hand it a
 * broken one and prove this branch can actually go red. An executor whose failure path has never
 * been exercised is a green light with no bulb behind it.
 */
export function hiringStatusComplaints(hiringStatusOf) {
  const dated = { openRolesAt: '2026-08-14' };
  const says = (got, want, why) => (got === want ? null : `hiringStatusOf said ${got}, not ${want}: ${why}`);
  return [
    says(hiringStatusOf({ ...dated, openRoles: 3 }), 'board_observed', 'a date with a count is an observation'),
    says(hiringStatusOf({ ...dated, openRoles: 0 }), 'board_observed', 'zero is a count — a board read and found empty'),
    says(hiringStatusOf({ ...dated, hiring: 'yes' }), 'company_reported', 'a date with no count is a stamp, not an observation'),
    says(hiringStatusOf({ ...dated, openRoles: 3, openRolesStale: true }), 'board_stale', 'a carried count reports stale'),
    says(hiringStatusOf({ ...dated, openRoles: 3 }, { quarantined: true }), 'quarantined', 'quarantine outranks every other status'),
    says(hiringStatusOf(dated, { openRoles: 2 }), 'board_observed', "the caller's projected count is the one that decides"),
  ].filter(Boolean);
}

async function checkMissionCompany() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.mission-company\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.mission-company/1 fence in §29 yet' };

  const kernel = await import('./demigod-role-mission-kernel.mjs');
  const { openRoleMission, attachCompany, projectNextAction, MISSION_COMPANY_SCHEMA } = kernel;
  const { createPacket } = await import('./demigod-role-packet.mjs');
  const packet = createPacket({ roleId: 'role-contract-check', title: 'Engineer', outcome90d: 'Ship billing to ten customers' });
  const mission = openRoleMission({ packet, owner: 'founder-check', at: '2026-08-17T10:00:00.000Z' });
  const base = {
    schema: MISSION_COMPANY_SCHEMA,
    companyId: 'yc:check',
    identity: { name: 'Check', domain: 'check.example', website: 'https://check.example/' },
    hiring: { status: 'board_observed', openRoles: 3, openRolesAt: '2026-08-14', lastAttempt: 'ok', lastAttemptAt: '2026-08-14T00:00:00.000Z' },
    postings: { count: 3, oldestDays: 40, over180: 0, source: 'employer_declared', observedLifetimeUsable: false },
    quarantineHiring: false,
  };
  const attach = (patch) => attachCompany(mission, { ...base, ...patch });
  const refuses = (patch, why) => {
    try { attach(patch); return `kernel ACCEPTED ${why}`; } catch { return null; }
  };
  const bad = [];
  const before = projectNextAction(mission).kind;

  // Each line of the fence, asked of the kernel.
  if (/null-openRoles/.test(fence)) {
    try { attach({ hiring: { ...base.hiring, openRoles: null, lastAttempt: null } }); }
    catch (e) { bad.push(`kernel refused a null (unknown) count: ${e.message}`); }
  }
  if (/zero-openRoles/.test(fence)) {
    bad.push(refuses({ hiring: { ...base.hiring, openRoles: 0, lastAttempt: null } }, 'openRoles 0 with lastAttempt null'));
    bad.push(refuses({ hiring: { ...base.hiring, status: 'board_stale', openRoles: 0, lastAttempt: 'ok' } }, 'openRoles 0 while board_stale'));
  }
  if (/quarantined\s*=>\s*openRoles null/.test(fence)) {
    bad.push(refuses({ quarantineHiring: true, hiring: { ...base.hiring, status: 'quarantined', openRoles: 4 } }, 'a quarantined company with a numeric count'));
  }
  if (/observedLifetimeUsable\s*=\s*false/.test(fence)) {
    bad.push(refuses({ postings: { ...base.postings, observedLifetimeUsable: true } }, 'observedLifetimeUsable true'));
  }
  if (/board-observed\s*=>\s*requires openRolesAt AND an integer count/.test(fence)) {
    bad.push(...hiringStatusComplaints(kernel.hiringStatusOf));
  }
  if (/next-action\s*=>\s*never blocked/.test(fence)) {
    const stale = attach({ hiring: { ...base.hiring, status: 'board_stale', openRoles: 3, lastAttempt: 'rate_limited' } });
    const after = projectNextAction(stale).kind;
    if (after !== before) bad.push(`observation changed the next action (${before} -> ${after}) — the hire ladder must not depend on crawl health`);
  }
  const real = bad.filter(Boolean);
  return real.length
    ? { status: 'violation', detail: `§29 fence and kernel disagree on ${real.length} rule(s)`, sample: real.slice(0, 5) }
    : { status: 'pass', detail: `kernel enforces all ${fence.trim().split('\n').length - 1} fenced company-truth rules` };
}

/**
 * §8 Projector. The document writes the selection rule as an explicit decision table, which makes
 * it checkable line by line — so check it line by line, against the real `projectCompanyResearch`.
 *
 * The trap this guards is the one that bit me while writing §10's check: an invalid benchmark makes
 * the projector return null, which silently disables whatever you were testing downstream and can
 * look like a pass. Here that branch is the FIRST assertion rather than an accident.
 */
async function checkProjector() {
  if (!fs.existsSync(BENCHMARK)) return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };
  const { projectCompanyResearch } = await import('./demigod-evidence.mjs');
  const benchmark = readJson(BENCHMARK);
  const id = (benchmark.companies || [])[0]?.id;
  if (!id) return { status: 'violation', detail: 'benchmark has no rows to project' };
  const row = (fields) => ({ id, fields });
  const cat = (companies) => ({ version: 1, researchedAt: null, companies });
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  // if benchmark grade invalid -> null
  say(projectCompanyResearch({ companyId: id, benchmark: {}, catalog: {} }) === null,
    'an invalid benchmark must project null, not a partial answer');
  // if >1 catalog rows for id -> null
  say(projectCompanyResearch({ companyId: id, benchmark, catalog: cat([row({}), row({})]) }) === null,
    'duplicate catalog rows for one id must fail closed');
  // exactly 1 catalog row -> catalog wins over benchmark
  say(projectCompanyResearch({ companyId: id, benchmark, catalog: cat([row({})]) })?.source === 'catalog',
    'a single catalog row is selected over the benchmark');
  // else exactly 1 benchmark row -> benchmark
  say(projectCompanyResearch({ companyId: id, benchmark, catalog: cat([]) })?.source === 'benchmark',
    'with no catalog row the benchmark row is selected');
  // else -> null
  say(projectCompanyResearch({ companyId: 'yc:not-a-real-company-xyz', benchmark, catalog: cat([]) }) === null,
    'an id in neither document projects null');
  // quarantine only on literal true
  say(projectCompanyResearch({ companyId: id, benchmark, catalog: cat([{ ...row({}), quarantineHiring: 'true' }]) })?.quarantineHiring === false,
    'quarantine activates only on literal true, never a truthy string');
  say(projectCompanyResearch({ companyId: id, benchmark, catalog: cat([{ ...row({}), quarantineHiring: true }]) })?.quarantineHiring === true,
    'and does activate on literal true');
  // status: no projected field -> unknown
  say(projectCompanyResearch({ companyId: id, benchmark, catalog: cat([row({})]) })?.status === 'unknown',
    'a row projecting no field is unknown, not verified');
  // unknown claims are omitted rather than projected as values
  const withUnknown = projectCompanyResearch({
    companyId: id, benchmark,
    catalog: cat([row({ canonicalCompany: { value: null, status: 'unknown', url: null, quote: null } })]),
  });
  say(withUnknown?.status === 'unknown' && !('canonicalCompany' in (withUnknown?.fields || {})),
    'an unknown claim is omitted from fields, never carried as a value');

  return bad.length
    ? { status: 'violation', detail: `§8 projector disagrees with its own decision table on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: '9 selection, quarantine and status rules match projectCompanyResearch' };
}

/**
 * §9 Company evidence resolver. Two checkable promises: the status is one of three values, and it
 * "must not mutate any input or canonical store".
 *
 * Purity is the half worth automating. A resolver that quietly writes into the map or ledger it was
 * handed corrupts a shared object mid-run and the damage surfaces somewhere else entirely, which is
 * the hardest kind of bug to trace back. Cheap to assert: snapshot the inputs, call it, compare.
 */
async function checkEvidenceResolver() {
  const { resolveCompanyEvidence } = await import('./demigod-matching-engine.mjs');
  const map = {
    generatedAt: '2026-08-17T00:00:00.000Z',
    companies: [{
      id: 'yc:res', name: 'Res', website: 'https://res.example/', source: 'Y Combinator',
      atsSource: 'Greenhouse', jobsUrl: 'https://boards.greenhouse.io/res',
      openRoles: 2, openRolesAt: '2026-08-14', roleMix: { engineering: 2 }, hiring: 'yes',
    }],
  };
  const ledger = { schema: 'demigod.role-ledger/1', roles: {} };
  const role = { company: 'Res', title: 'Engineer' };
  const benchmark = fs.existsSync(BENCHMARK) ? readJson(BENCHMARK) : {};
  const before = {
    map: JSON.stringify(map), ledger: JSON.stringify(ledger),
    role: JSON.stringify(role), benchmark: JSON.stringify(benchmark),
  };
  const out = resolveCompanyEvidence(role, map, ledger, '2026-08-17', benchmark, {});
  const bad = [];
  if (JSON.stringify(map) !== before.map) bad.push('the map was mutated by the resolver');
  if (JSON.stringify(ledger) !== before.ledger) bad.push('the ledger was mutated by the resolver');
  if (JSON.stringify(role) !== before.role) bad.push('the role was mutated by the resolver');
  if (JSON.stringify(benchmark) !== before.benchmark) bad.push('the benchmark was mutated by the resolver');
  const status = out?.status ?? out?.state ?? null;
  if (status != null && !['unknown', 'ambiguous', 'matched'].includes(status)) {
    bad.push(`status ${JSON.stringify(status)} is outside the declared enum`);
  }
  return bad.length
    ? { status: 'violation', detail: '§9 resolver broke a declared promise', sample: bad }
    : { status: 'pass', detail: 'resolver mutates none of its four inputs; status within enum' };
}

/**
 * §26 Candidate evidence projection. The load-bearing promise is `globalScore: null` — no composite
 * number about a person, ever. That is the line the whole product rests on, it is the one the
 * industry's standard quality-of-hire scorecard crosses by design, and under the EU AI Act's
 * high-risk hiring rules it is also the line with legal weight. It should not depend on nobody
 * deciding a score would be convenient.
 *
 * Deliberately shallow: this pins the invariants reachable without constructing a full valid
 * assertion, which needs source spans, content hashes, clocks, purpose/basis and a retention
 * deadline. The deeper §24/§25 rules — supersede clocks, forks, cycles, withdrawal scope — are
 * already covered by that module's own tests; wiring them here would need a fixture builder the
 * module does not export, and a checker that fakes one would be testing my fixture, not the rule.
 */
async function checkCandidateProjection() {
  const { projectCandidateEvidence, CORPUS_SCHEMA } = await import('./demigod-candidate-evidence.mjs');
  const { createPacket } = await import('./demigod-role-packet.mjs');
  const packet = createPacket({ roleId: 'r-contract', title: 'Engineer', outcome90d: 'Ship billing to ten customers' });
  const at = '2026-08-17T00:00:00.000Z';
  const bad = [];
  const projection = projectCandidateEvidence({
    roleId: 'r-contract', packet, corpus: { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] }, at,
  });
  if (projection?.schema !== 'demigod.candidate-evidence-projection/1') bad.push(`schema ${projection?.schema}`);
  if (projection?.globalScore !== null) bad.push(`globalScore is ${JSON.stringify(projection?.globalScore)}, contract says null`);
  if (!('authority' in (projection || {}))) bad.push('projection omits the authority block');
  // A malformed corpus must fail closed rather than project an empty-but-confident answer.
  try {
    projectCandidateEvidence({ roleId: 'r-contract', packet, corpus: { schema: 'wrong', evidence: [], withdrawals: [] }, at });
    bad.push('a corpus with the wrong schema was accepted');
  } catch { /* refused, as required */ }
  // A projection with no packet has no criteria to project against and must refuse.
  try {
    projectCandidateEvidence({ roleId: 'r-contract', packet: null, corpus: { schema: CORPUS_SCHEMA, evidence: [], withdrawals: [] }, at });
    bad.push('a projection without a role packet was accepted');
  } catch { /* refused, as required */ }
  return bad.length
    ? { status: 'violation', detail: `§26 projection broke ${bad.length} declared rule(s)`, sample: bad }
    : { status: 'pass', detail: 'globalScore null, authority present, malformed corpus and missing packet refused' };
}

/**
 * §30 Board pay visibility. The trap here is the one the whole document exists for: an ATS that
 * cannot carry pay is not a company that withholds it. The fence declares four states plus two
 * suppression rules, and every one of them is a property a later edit could quietly collapse back
 * into a boolean. Calls the real classifier — a stub would pass while the projection lies.
 */
async function checkBoardPay() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.board-pay\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.board-pay/1 fence in §30 yet' };

  const { rolePayVisibility, rollUpBoardPay, comparablePayCompanies, payPublishRate } =
    await import('./demigod-board-pay.mjs');
  const bad = [];
  const rule = (name, cond) => {
    if (!fence.includes(name)) bad.push(`fence lost the ${name} rule`);
    else if (!cond) bad.push(`${name} declared but the executor disagrees`);
  };

  // An unreadable provider can never produce a company-level verdict.
  rule(
    'unsupported',
    ['Lever', 'Workable', 'Personio', ''].every(
      (ats) => rolePayVisibility({ shouldDisplayCompensationOnJobPostings: false }, ats).state === 'unsupported',
    ),
  );
  // A failed read is our problem, and neither it nor an empty board may be laundered into a
  // company choice. A board with no postings has nothing to state pay in.
  rule('unread', !['withheld', 'published'].includes(rollUpBoardPay([], 'Greenhouse').state));
  // Capable reader, nothing displayed and nothing in the body.
  rule(
    'withheld',
    rolePayVisibility(
      { shouldDisplayCompensationOnJobPostings: false, compensation: {}, descriptionPlain: 'no pay here' },
      'Ashby',
    ).state === 'withheld',
  );
  // Published must carry a quote that is a real substring of the posting, both sources.
  const structured = rolePayVisibility(
    { shouldDisplayCompensationOnJobPostings: true, compensation: { compensationTierSummary: '$196K – $235K' } },
    'Ashby',
  );
  const body = 'The salary range for this role is $150,000 - $210,000 USD.';
  const described = rolePayVisibility(
    { shouldDisplayCompensationOnJobPostings: false, compensation: {}, descriptionPlain: body },
    'Ashby',
  );
  rule(
    'published',
    structured.state === 'published' &&
      structured.quote === '$196K – $235K' &&
      described.state === 'published' &&
      body.includes(described.quote),
  );
  // The flag going off must take the string with it, or we republish pay a company pulled.
  rule(
    'stale-tier',
    rolePayVisibility(
      { shouldDisplayCompensationOnJobPostings: false, compensation: { compensationTierSummary: '$200K – $250K' }, descriptionPlain: 'x' },
      'Ashby',
    ).quote === null,
  );
  // The entity trap: a surviving &mdash; turns a band into its own floor, and the record then
  // understates the role by the whole width of the range.
  const banded = rolePayVisibility({ content: '<p>Pay Range $76,000 &mdash; $114,000 USD</p>' }, 'Greenhouse');
  rule('entities', banded.state === 'published' && /114,000/.test(String(banded.quote)));
  // A currency we cannot parse is still a company that stated its range.
  const gbp = rolePayVisibility({ content: 'Pay Range £51,000 &mdash; £67,000 GBP' }, 'Greenhouse');
  rule('unparsed-currency', gbp.state === 'published' && gbp.currency === 'unparsed');
  // The coverage-bias guard: unreadable boards must not enter any denominator.
  const rows = [
    { pay: { state: 'published' } },
    { pay: { state: 'withheld' } },
    { pay: { state: 'unsupported' } },
    { pay: { state: 'unread' } },
  ];
  rule('comparison', comparablePayCompanies(rows).length === 2 && payPublishRate(rows).rate === 0.5);

  return bad.length
    ? { status: 'violation', detail: `${bad.length} §30 rules the executor does not enforce`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: 'all 8 fenced board-pay rules hold; unreadable never becomes withheld' };
}

export const EXECUTORS = {
  5: { name: 'demigod-evidence.mjs (claim shape)', run: checkClaim },
  26: { name: 'demigod-candidate-evidence.mjs projectCandidateEvidence', run: checkCandidateProjection },
  8: { name: 'demigod-evidence.mjs projectCompanyResearch', run: checkProjector },
  9: { name: 'demigod-matching-engine.mjs resolveCompanyEvidence', run: checkEvidenceResolver },
  10: { name: 'demigod-company-packet.mjs (quarantine projection)', run: checkQuarantine },
  11: { name: 'demigod-evidence.mjs safeResearchUrl', run: checkSafeUrl },
  29: { name: 'demigod-role-mission-kernel.mjs attachCompany (grok)', run: checkMissionCompany },
  30: { name: 'demigod-board-pay.mjs rolePayVisibility', run: checkBoardPay },
};

export async function checkContracts({ file = CONTRACTS } = {}) {
  if (!fs.existsSync(file)) {
    // Absence is never health. This is the class of bug the whole exercise is about.
    return { schema: SCHEMA, ok: false, error: `CONTRACTS.md missing at ${file}`, sections: [] };
  }
  const sections = parseSections(fs.readFileSync(file, 'utf8'));
  if (!sections.length) {
    return { schema: SCHEMA, ok: false, error: 'no numbered sections parsed — heading shape changed', sections: [] };
  }
  const results = [];
  for (const s of sections) {
    const wired = EXECUTORS[s.n];
    if (!wired) {
      results.push({ ...s, status: 'unwired', detail: 'prose only — no executor calls this' });
      continue;
    }
    try {
      results.push({ ...s, executor: wired.name, ...(await wired.run()) });
    } catch (e) {
      results.push({ ...s, executor: wired.name, status: 'violation', detail: String(e?.message || e) });
    }
  }
  const violations = results.filter((r) => r.status === 'violation');
  return {
    schema: SCHEMA,
    ok: violations.length === 0,
    counts: {
      sections: results.length,
      pass: results.filter((r) => r.status === 'pass').length,
      violation: violations.length,
      unwired: results.filter((r) => r.status === 'unwired').length,
    },
    sections: results,
  };
}

async function selftest() {
  const assert = (c, m) => { if (!c) throw new Error(`die-contracts-check: ${m}`); };
  const parsed = parseSections('## 1. Company identity\ntext\n## 11. Safe URL\n### 5. not a section\n## 29. Kernel');
  assert(parsed.length === 3 && parsed[0].n === 1 && parsed[2].title === 'Kernel', 'headings parse, ### ignored');
  assert(parseSections('').length === 0, 'empty markdown parses to nothing');

  // unwired must never be counted as verified — that is the whole point of having the state.
  const report = await checkContracts();
  assert(report.ok, `live contracts violated: ${JSON.stringify(report.sections.filter((s) => s.status === 'violation'))}`);
  assert(report.counts.sections > 20, `expected the full contract set, got ${report.counts.sections}`);
  assert(report.counts.pass >= 3, 'the wired sections must actually run');
  assert(report.counts.unwired > 0, 'prose-only sections must be reported, not silently passed');
  assert(
    report.sections.every((s) => ['pass', 'violation', 'unwired'].includes(s.status)),
    'every section lands in exactly one of the three states',
  );
  // A missing contracts file is a violation, not a quiet pass.
  const absent = await checkContracts({ file: path.join(ROOT, 'docs', 'die', 'NOT-A-FILE.md') });
  assert(!absent.ok, 'a missing CONTRACTS.md must fail, never pass quietly');
  console.log(JSON.stringify({ ok: true, selftest: 'die-contracts-check' }));
}

if (isMain) {
  if (process.argv.includes('--selftest')) {
    await selftest();
    process.exit(0);
  }
  const report = await checkContracts();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const c = report.counts || {};
    console.log(`die-contracts ${report.ok ? 'OK' : 'FAIL'} · ${c.pass} enforced · ${c.violation} violated · ${c.unwired} unwired of ${c.sections}`);
    console.log('  enforced = an executor ran and its assertions held; not a coverage or quality score — read the rules count per line');
    for (const s of report.sections.filter((r) => r.status !== 'unwired')) {
      console.log(`  ${s.status === 'pass' ? '✓' : '✗'} §${s.n} ${s.title} — ${s.detail}`);
    }
    if (!report.ok && report.error) console.log(`  ${report.error}`);
  }
  process.exit(report.ok ? 0 : 1);
}
