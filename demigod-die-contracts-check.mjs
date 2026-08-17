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
 * §13 Company packet. The most-read artifact in DIE, and until now the section with the most
 * recent bugs and no executor at all.
 *
 * The contact rule is checked by putting an email and a phone on the map row and searching the
 * whole serialized packet for them — not by listing the keys the packet is known to copy. A leak
 * that mattered would arrive through a field nobody thought to enumerate, so the assertion has to
 * be "these bytes do not appear", at any depth.
 */
/**
 * §4 Company row. The shape every catalog row must have, checked against the real projector.
 *
 * The rule worth having an executor for is "unknown extra keys are ignored". That is the sentence a
 * future agent breaks by reaching for a convenient undeclared field — and it breaks silently, since
 * the row still validates and the projection still returns something. Comparing the serialized
 * projection with and without the extra keys is the only form of that claim that can fail.
 */
/**
 * §1 Company identity. The section the rest of DIE is keyed on, and the one where being wrong is
 * expensive in a way no gate would otherwise show: two companies merged into one identity produce
 * a packet, a table row and a match that all look perfectly well-formed.
 *
 * The no-fuzzy-merge rule is the load-bearing one. It is a rule about what the code must NOT do,
 * so the check builds the exact input a merge would be tempting on — same display name, different
 * domains — and asserts two clusters survive.
 */
/**
 * §14 Company table, §15 Company waterfall, §17 Writeback preview — the three surfaces that turn a
 * packet into something a human acts on, and therefore the three places where an accidental
 * authority would be most useful and most dangerous.
 *
 * One executor each, but they share a fixture: a real packet built by the real builder, because a
 * hand-made packet would let a projection quietly stop projecting and still look right.
 */
/**
 * §12 Research projection entry point. One export, no second door.
 *
 * The rule exists because a wrapper once sat beside the projector with no caller and no test — a
 * second contract nobody was verifying, which is the shape a divergence hides in. So the check is
 * about the module's surface, not its behaviour: nothing else may look like a research projector.
 */
/**
 * §6 Frozen fields and §7 Accepted-field policy.
 *
 * §7 is the one that was already drifting when this executor was written: the document listed four
 * accepted fields and a withheld `pricingStatus`, and the grader had been returning all five since
 * the benchmark improved. A hand-maintained list of a derived value is a fact with an expiry date,
 * so the check asserts the derivation — accepted comes from the grader and is a subset of the
 * frozen set — and the document now records how it is derived rather than what it was.
 */
/**
 * §2 Benchmark document. Gold is pinned and the map moves under it, so the interesting rule is not
 * "the selector reproduces gold" — it does not, today — but "when it does not, we are told which
 * companies moved and why". Two Wikidata rows in gold are absent from the current map; the selector
 * would admit Bugcrowd and Brave Software in their place. Re-selecting to make that agree would
 * discard 60 graded, evidenced claims to fix a number.
 */
/**
 * §18 Supported command surface. The rule is that a mutation flag fails BEFORE dispatch — not that
 * it eventually fails. A flag that reaches a subcommand which might honour it has already lost the
 * property, so every case here asserts the planner refuses rather than that the run does nothing.
 */
/**
 * §22 Mutual projection and §23 Mission scenario.
 *
 * The mutual projection is the only artifact in DIE that is meant to be seen by someone outside the
 * company, so its rules are all about absence. Absence is checked with sentinels: the workspace is
 * built with unmistakable strings in every field that must not cross, and the projection is
 * searched for those bytes. Listing the keys that are allowed through would pass a projection that
 * started copying a new private field tomorrow.
 */
async function missionWorkspaceFixture() {
  const { composeRoleWorkspace } = await import('./demigod-structured-hiring.mjs');
  const SENTINELS = {
    comp: 'PRIVATE-COMP-SENTINEL-220000',
    dealBreaker: 'PRIVATE-DEALBREAKER-SENTINEL',
    candId: 'cand-sentinel-9001',
    evidence: 'PRIVATE-EVIDENCE-TEXT-SENTINEL',
    reviewer: 'reviewer-sentinel-name',
  };
  const workspace = composeRoleWorkspace({
    roleId: 'role-contract-check',
    acceptedRole: { roleId: 'role-contract-check', company: 'Acme', roleTruthHash: 'abc' },
    packet: {
      roleId: 'role-contract-check',
      companyId: 'yc:acme',
      title: 'Founding Engineer',
      outcome90d: 'Ship the first reliable customer-facing product.',
      mustHaves: [
        { id: 'mh1', label: 'Backend craft' },
        { id: 'mh2', label: 'Product judgment' },
        { id: 'mh3', label: 'Clear communication' },
      ],
      dealBreakers: [{ id: 'db1', label: SENTINELS.dealBreaker }],
      compBand: { text: SENTINELS.comp, source: 'founder_stated' },
      stage: 'brief_ready',
    },
    companyPacket: { schema: 'demigod.company-packet/1', companyId: 'yc:acme', identity: { name: 'Acme' } },
    batch: { max: 3, candidates: [{ candId: SENTINELS.candId, why: 'Relevant shipped work', state: 'active' }] },
    notes: [{
      roleId: 'role-contract-check',
      candId: SENTINELS.candId,
      reviewedAt: '2026-08-14T00:00:00.000Z',
      reviewedBy: SENTINELS.reviewer,
      ratings: [{ mustHaveId: 'mh1', rating: 'yes', evidence: SENTINELS.evidence, evidenceIds: ['ev-1'] }],
    }],
    at: '2026-08-15T00:00:00.000Z',
  });
  return { workspace, SENTINELS };
}

async function checkMutualProjection() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.role-mission-mutual\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.role-mission-mutual/1 fence in §22 yet' };

  const { projectMutualMission } = await import('./demigod-structured-hiring.mjs');
  const { workspace, SENTINELS } = await missionWorkspaceFixture();
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/workspace-required\s*=>\s*a non-workspace input fails closed/.test(fence)) {
    for (const input of [null, {}, { schema: 'demigod.role-mission/1' }, []]) {
      let threw = false;
      try { projectMutualMission(input); } catch { threw = true; }
      say(threw, `projectMutualMission accepted ${JSON.stringify(input)}`);
    }
  }
  const mutual = JSON.stringify(projectMutualMission(workspace));
  const absent = (sentinel, rule) => say(!mutual.includes(sentinel), `${rule} crossed into the mutual projection`);
  if (/candidate-ids\s*=>\s*absent/.test(fence)) absent(SENTINELS.candId, 'a candidate id');
  if (/ratings-and-evidence\s*=>\s*absent/.test(fence)) {
    absent(SENTINELS.evidence, 'private evidence text');
    absent(SENTINELS.reviewer, "the reviewer's name");
  }
  if (/private-comp\s*=>\s*absent from the projection; named as withheld/.test(fence)) {
    absent(SENTINELS.comp, 'the private compensation band');
    say(/withheld/i.test(mutual), 'nothing is named as withheld — silence is not the same as declaring a boundary');
  }
  if (/deal-breakers\s*=>\s*absent/.test(fence)) absent(SENTINELS.dealBreaker, 'a founder-only deal-breaker');
  if (/action-authority\s*=>\s*declared as none, never granted/.test(fence)) {
    // The projection does carry an `authority` block, and that is correct: it states that the
    // employment decision is human and external action is none. A declaration that nothing is
    // authorized is the opposite of a grant, so the check is that the declaration says none --
    // not that the key is missing, which was this rule's first and wrong wording.
    const authority = projectMutualMission(workspace).authority || {};
    say(authority.externalAction === 'none', `externalAction is ${JSON.stringify(authority.externalAction)}`);
    say(authority.employmentDecision === 'human', `employmentDecision is ${JSON.stringify(authority.employmentDecision)}`);
    say(!/"(canSend|canIntro|canAct|allowed)"\s*:\s*true/.test(mutual), 'the mutual projection grants an action');
  }

  return bad.length
    ? { status: 'violation', detail: `§22 fence and projectMutualMission disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `5 private sentinels planted in the workspace, none survive the mutual projection` };
}

async function checkMissionScenario() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.role-mission-scenario\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.role-mission-scenario/1 fence in §23 yet' };

  const { compareMissionScenario } = await import('./demigod-structured-hiring.mjs');
  const { workspace } = await missionWorkspaceFixture();
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };
  const refuses = (changes) => {
    try { compareMissionScenario(workspace, changes); return false; } catch { return true; }
  };

  const scenario = compareMissionScenario(workspace, { title: 'Founding Engineer, Platform' });
  if (/changeable\s*=\s*title, outcome90d/.test(fence)) {
    say(scenario?.schema === 'demigod.role-mission-scenario/1', `scenario schema is ${scenario?.schema}`);
  }
  if (/unknown-field\s*=>\s*fails closed/.test(fence)) {
    say(refuses({ automaticDecision: true }), 'an undeclared field was accepted as a scenario change');
    say(refuses({ title: 'x', automaticDecision: true }), 'an undeclared field rode along with a legal one');
  }
  if (/empty-changes\s*=>\s*fails closed/.test(fence)) {
    say(refuses({}), 'an empty change set produced a scenario');
  }
  if (/wrong-shape\s*=>\s*fails closed/.test(fence)) {
    say(refuses(null), 'null changes produced a scenario');
    say(refuses([{ title: 'x' }]), 'an array of changes produced a scenario');
    say(refuses({ mustHaves: 'not-an-array' }), 'a string where an array belongs produced a scenario');
  }
  if (/committable\s*=\s*false/.test(fence)) {
    say(scenario?.committable === false, `committable is ${scenario?.committable}`);
  }
  if (/predictedOutcome\s*=\s*null/.test(fence)) {
    say(scenario?.predictedOutcome === null, `predictedOutcome is ${JSON.stringify(scenario?.predictedOutcome)}`);
  }

  return bad.length
    ? { status: 'violation', detail: `§23 fence and compareMissionScenario disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `6 fail-closed shapes refused; a scenario is never committable and predicts nothing` };
}

async function checkCommandSurface() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.command-surface\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.command-surface/1 fence in §18 yet' };

  const { companyCommandPlan } = await import('./demigod-company-intelligence.mjs');
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };
  const refuses = (argv) => {
    try { companyCommandPlan(argv); return false; } catch { return true; }
  };

  if (/commands\s*=\s*list, get, enrich, memo, writeback/.test(fence)) {
    for (const command of ['list', 'get', 'enrich', 'memo', 'writeback']) {
      let planned = true;
      try { companyCommandPlan([command, '--id=yc:acme']); } catch { planned = false; }
      say(planned, `${command} is documented as supported but the planner refused it`);
    }
  }
  if (/unknown-command\s*=>\s*refused/.test(fence)) {
    // Refusal here is a null plan, not a throw: the CLI prints usage and exits non-zero. The
    // property is that nothing is dispatched, and both shapes satisfy it — so assert the property.
    const dispatched = (argv) => {
      try { return companyCommandPlan(argv) !== null; } catch { return false; }
    };
    say(!dispatched(['apply']), 'an unknown command produced a dispatch plan');
    say(!dispatched(['apply-map', '--id=yc:acme']), 'an apply-shaped command produced a dispatch plan');
    say(!dispatched([]), 'an empty command line produced a dispatch plan');
  }
  if (/enrich\s*=>\s*always routed with --dry-run/.test(fence)) {
    const plan = companyCommandPlan(['enrich', '--id=yc:acme']);
    say(plan?.script === 'demigod-company-waterfall.mjs', `enrich routed to ${plan?.script}`);
    say((plan?.args || []).includes('--dry-run'), 'enrich was routed without --dry-run');
  }
  if (/mutation-flags\s*=>\s*--write, --apply and --apply-map refused/.test(fence)) {
    for (const flag of ['--write', '--apply', '--apply-map', '--apply=true', '--apply-map=DEMIGOD-SF-STARTUP-MAP.json']) {
      say(refuses(['writeback', flag]), `${flag} reached dispatch instead of being refused`);
      say(refuses(['enrich', flag]), `${flag} reached dispatch on enrich instead of being refused`);
    }
  }

  return bad.length
    ? { status: 'violation', detail: `§18 fence and companyCommandPlan disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `5 commands plan, 10 mutation-flag forms refused before dispatch, enrich forced to dry-run` };
}

async function checkBenchmarkDoc() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.benchmark\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.benchmark/1 fence in §2 yet' };
  if (!fs.existsSync(BENCHMARK)) return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };

  const { selectBenchmarkCompanies, describeSelectionDrift } = await import('./demigod-company-research-benchmark.mjs');
  const doc = readJson(BENCHMARK);
  const rows = doc.companies || [];
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/companies\s*=\s*exactly 30/.test(fence)) {
    say(rows.length === 30, `benchmark has ${rows.length} companies, not 30`);
    say(new Set(rows.map((row) => row.id)).size === rows.length, 'benchmark ids are not unique');
  }
  if (/fields\s*=>\s*every row carries a fields object/.test(fence)) {
    const missing = rows.filter((row) => !row.fields || typeof row.fields !== 'object' || Array.isArray(row.fields));
    say(missing.length === 0, `${missing.length} benchmark rows carry no fields object`);
  }
  if (/statuses\s*=\s*supported, conflict or unknown/.test(fence)) {
    const allowed = new Set(['supported', 'conflict', 'unknown']);
    const strays = new Set();
    for (const row of rows) for (const claim of Object.values(row.fields || {})) {
      if (claim && !allowed.has(claim.status)) strays.add(String(claim.status));
    }
    say(strays.size === 0, `claim statuses outside the enum: ${[...strays].join(', ')}`);
  }

  const mapPath = path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json');
  let drift = null;
  if (fs.existsSync(mapPath)) {
    const map = readJson(mapPath);
    const first = selectBenchmarkCompanies(map, doc.selectionSeed).map((row) => row.id);
    if (/selection\s*=>\s*deterministic/.test(fence)) {
      const second = selectBenchmarkCompanies(map, doc.selectionSeed).map((row) => row.id);
      say(JSON.stringify(first) === JSON.stringify(second), 'the selector returned different ids for the same map');
      say(first.length === 30, `the selector chose ${first.length} companies, not 30`);
    }
    if (/drift\s*=>\s*named, never silently absorbed/.test(fence)) {
      const actual = rows.map((row) => row.id);
      if (JSON.stringify(actual) !== JSON.stringify(first)) {
        drift = describeSelectionDrift(actual, first, map);
        say(Boolean(drift) && (drift.evicted.length > 0 || drift.admitted.length > 0 || drift.reorderedOnly),
          'gold and the selector disagree and the drift description says nothing');
      }
    }
  }

  return bad.length
    ? { status: 'violation', detail: `§2 fence and the benchmark disagree on ${bad.length} rule(s)`, sample: bad }
    : {
      status: 'pass',
      detail: drift
        ? `30 rows, unique, statuses clean; selection drifted and is named: ${drift.evicted.length} gold-only, ${drift.admitted.length} selector-only`
        : '30 rows, unique, statuses clean; selection reproduces gold exactly',
    };
}

/** §3 Operational catalog. Private overrides that must never touch the gold or its grades. */
async function checkOperationalCatalog() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.operational-catalog\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.operational-catalog/1 fence in §3 yet' };
  if (!fs.existsSync(BENCHMARK)) return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };

  const evidence = await import('./demigod-evidence.mjs');
  const { projectCompanyResearch, gradeResearchBenchmark } = evidence;
  const benchmark = readJson(BENCHMARK);
  const id = (benchmark.companies || [])[0]?.id;
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };
  const claim = { value: 'Acme Inc', status: 'supported', url: 'https://example.com/', quote: 'Exact source text.' };

  if (/row-researchedAt\s*=>\s*overrides the root/.test(fence)) {
    const projected = projectCompanyResearch({
      companyId: id,
      benchmark,
      catalog: { version: 1, researchedAt: '2026-01-01', companies: [{ id, researchedAt: '2026-08-17', fields: { canonicalCompany: claim } }] },
    });
    say(projected?.researchedAt === '2026-08-17', `row date must win, got ${projected?.researchedAt}`);
  }
  if (/duplicate-id\s*=>\s*fails closed/.test(fence)) {
    const dup = projectCompanyResearch({
      companyId: id,
      benchmark,
      catalog: { version: 1, researchedAt: null, companies: [{ id, fields: {} }, { id, fields: {} }] },
    });
    say(dup === null, 'two catalog rows for one company must project null, never a winner');
  }
  if (/grading-unaffected\s*=>\s*a catalog row changes no accepted field/.test(fence)) {
    // The grader takes the gold document alone. Proven by grading twice and comparing, so that a
    // future signature change that starts accepting a catalog is caught here.
    const before = JSON.stringify(gradeResearchBenchmark(benchmark));
    projectCompanyResearch({ companyId: id, benchmark, catalog: { version: 1, researchedAt: null, companies: [{ id, fields: { canonicalCompany: claim } }] } });
    say(JSON.stringify(gradeResearchBenchmark(benchmark)) === before, 'projecting a catalog row changed the benchmark grade');
    // Arity introspection was tried here and is useless: a default parameter makes .length 0, so
    // the check reported the grader taking no arguments at all. Grading twice is the real proof.
    const withCatalogShaped = JSON.stringify(gradeResearchBenchmark({ ...benchmark, catalog: { companies: [{ id, fields: { canonicalCompany: claim } }] } }));
    say(withCatalogShaped === before, 'a catalog-shaped key on the gold document moved the grade');
  }
  if (/no-writer\s*=>\s*no export writes the catalog/.test(fence)) {
    const writers = Object.keys(evidence).filter((name) => typeof evidence[name] === 'function' && /^(write|save|persist|update|upsert)/i.test(name));
    say(writers.length === 0, `a catalog-writing export exists: ${writers.join(', ')}`);
  }

  return bad.length
    ? { status: 'violation', detail: `§3 fence and the projector disagree on ${bad.length} rule(s)`, sample: bad }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} catalog rules hold; a catalog row moves no grade and no writer exists` };
}

async function checkFrozenFields() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.frozen-fields\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.frozen-fields/1 fence in §6 yet' };

  const { COMPANY_RESEARCH_FIELDS } = await import('./demigod-evidence.mjs');
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/fields\s*=\s*exactly the five named above/.test(fence)) {
    // Read the field names out of §6's own table, so the document and the constant cannot drift.
    const table = /## 6\. Frozen fields([\s\S]*?)\n## /.exec(md)?.[1] || '';
    const documented = [...table.matchAll(/^\|\s*`(\w+)`\s*\|/gm)].map(([, name]) => name);
    say(documented.length === 5, `§6's table lists ${documented.length} fields, expected five`);
    say(JSON.stringify(documented) === JSON.stringify([...COMPANY_RESEARCH_FIELDS]),
      `§6's table and COMPANY_RESEARCH_FIELDS disagree: ${JSON.stringify(documented)} vs ${JSON.stringify(COMPANY_RESEARCH_FIELDS)}`);
  }
  if (/authority\s*=>\s*no score, pair-state, consent, intro or public-claim/.test(fence)) {
    const { packet } = await packetFixture();
    say(!/"(score|fitScore|rank|pairState|consent|intro|publicClaim)"\s*:/.test(JSON.stringify(packet)),
      'a frozen field carried an authority-shaped key into the packet');
  }

  return bad.length
    ? { status: 'violation', detail: `§6 fence and COMPANY_RESEARCH_FIELDS disagree on ${bad.length} rule(s)`, sample: bad }
    : { status: 'pass', detail: `§6's own table and COMPANY_RESEARCH_FIELDS name the same five fields, in order` };
}

async function checkAcceptedFields() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.accepted-fields\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.accepted-fields/1 fence in §7 yet' };
  if (!fs.existsSync(BENCHMARK)) return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };

  const { COMPANY_RESEARCH_FIELDS, gradeResearchBenchmark, projectCompanyResearch } = await import('./demigod-evidence.mjs');
  const benchmark = readJson(BENCHMARK);
  const graded = gradeResearchBenchmark(benchmark);
  const accepted = graded?.acceptedFields || [];
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/source\s*=\s*gradeResearchBenchmark/.test(fence)) {
    say(Array.isArray(accepted) && accepted.length > 0, 'the grader returned no accepted fields — a vacuous pass is not a pass');
  }
  if (/subset\s*=>\s*accepted fields are always a subset/.test(fence)) {
    const stray = accepted.filter((name) => !COMPANY_RESEARCH_FIELDS.includes(name));
    say(stray.length === 0, `accepted fields outside the frozen set: ${stray.join(', ')}`);
  }
  if (/catalog-cannot-add\s*=>\s*a catalog claim for an unaccepted field/.test(fence)) {
    const id = (benchmark.companies || [])[0]?.id;
    const projected = projectCompanyResearch({
      companyId: id,
      benchmark,
      catalog: {
        version: 1,
        researchedAt: null,
        companies: [{
          id,
          fields: {
            inventedField: { value: 'anything', status: 'supported', url: 'https://example.com/', quote: 'Exact source text.' },
          },
        }],
      },
    });
    say(!Object.keys(projected?.fields || {}).includes('inventedField'),
      'a catalog row added a field the benchmark never accepted');
  }

  return bad.length
    ? { status: 'violation', detail: `§7 fence and gradeResearchBenchmark disagree on ${bad.length} rule(s)`, sample: bad }
    : { status: 'pass', detail: `accepted fields are derived from the grader (${accepted.length} of ${COMPANY_RESEARCH_FIELDS.length} frozen) and the catalog cannot add one` };
}

async function checkResearchEntry() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.research-entry\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.research-entry/1 fence in §12 yet' };

  const evidence = await import('./demigod-evidence.mjs');
  const names = Object.keys(evidence);
  const bad = [];
  if (/single-entry\s*=\s*projectCompanyResearch is the only/.test(fence)) {
    if (typeof evidence.projectCompanyResearch !== 'function') bad.push('projectCompanyResearch is not exported as a function');
  }
  if (/no-wrapper\s*=>\s*no alias or wrapper export/.test(fence)) {
    // Functions only: COMPANY_RESEARCH_FIELDS is a constant, not a second door.
    const projectors = names.filter((name) => typeof evidence[name] === 'function'
      && /research/i.test(name) && /^(project|company|get|resolve|build)/i.test(name));
    const extra = projectors.filter((name) => name !== 'projectCompanyResearch');
    if (extra.length) bad.push(`a second research projector is exported: ${extra.join(', ')}`);
  }
  return bad.length
    ? { status: 'violation', detail: `§12 fence and demigod-evidence exports disagree on ${bad.length} rule(s)`, sample: bad }
    : { status: 'pass', detail: `projectCompanyResearch is the only research projector among ${names.length} exports` };
}

/**
 * §16 Private memo. A memo is the artifact most likely to be pasted somewhere, so every rule here
 * is about what must not survive rendering.
 */
async function checkPrivateMemo() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.company-memo\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.company-memo/1 fence in §16 yet' };

  const { renderCompanyMemo } = await import('./demigod-company-memo.mjs');
  const { packet } = await packetFixture();
  const memo = renderCompanyMemo(packet);
  const markdown = String(memo?.markdown || '');
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/share\s*=\s*private, always/.test(fence)) {
    say(memo?.share === 'private', `memo share is ${memo?.share}`);
  }
  if (/no-contact\s*=>\s*contact-shaped data never reaches/.test(fence)) {
    say(!markdown.includes('leak@example.com'), 'an email on the map row reached the rendered memo');
    say(!/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i.test(markdown), 'the memo rendered something email-shaped');
  }
  if (/no-score\s*=>\s*no score, rank or recommendation/.test(fence)) {
    say(!/\b(score|ranked|rank:|we recommend|recommended)\b/i.test(markdown), 'the memo rendered a score or a recommendation');
  }
  if (/says-so\s*=>\s*the memo states it is not a recommendation/.test(fence)) {
    say(/not a recommendation/i.test(markdown), 'the memo does not say it is not a recommendation');
  }
  if (/safe-links\s*=>\s*every rendered link passes safeResearchUrl/.test(fence)) {
    for (const [, href] of markdown.matchAll(/\]\((https?:[^)\s]+)\)/g)) {
      say(Boolean(safeResearchUrl(href)), `the memo rendered an unsafe link: ${href}`);
    }
    for (const [, bare] of markdown.matchAll(/(?:^|\s)(https?:\/\/\S+)/g)) {
      say(Boolean(safeResearchUrl(bare.replace(/[.,)]+$/, ''))), `the memo rendered an unsafe bare link: ${bare}`);
    }
  }
  if (/bounded\s*=>\s*no rendered line exceeds/.test(fence)) {
    const longest = markdown.split('\n').reduce((n, line) => Math.max(n, line.length), 0);
    say(longest <= 260, `a rendered line ran to ${longest} characters`);
  }

  return bad.length
    ? { status: 'violation', detail: `§16 fence and renderCompanyMemo disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} memo rules hold; nothing contact-shaped survives rendering` };
}

async function packetFixture() {
  const { buildCompanyPacket } = await import('./demigod-company-packet.mjs');
  const company = {
    id: 'yc:surface-check',
    name: 'SurfaceCheck',
    website: 'https://surfacecheck.example/',
    hiring: 'yes',
    atsSource: 'Lever',
    jobsUrl: 'https://jobs.lever.co/surfacecheck',
    openRoles: 2,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 2 },
    email: 'leak@example.com',
  };
  const map = { generatedAt: '2026-08-14T00:00:00.000Z', companies: [company] };
  const ledger = { schema: 'demigod.role-ledger/1', updatedAt: '2026-08-14', roles: {} };
  return { company, map, ledger, packet: buildCompanyPacket({ companyId: company.id, map, ledger, catalog: {} }) };
}

async function checkCompanyTable() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.company-table\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.company-table/1 fence in §14 yet' };

  const { assertLoopbackBind, listCompanyRows } = await import('./demigod-company-table.mjs');
  const { map, ledger, company } = await packetFixture();
  const second = { ...company, id: 'yc:surface-check-2', name: 'SecondCheck', website: 'https://second.example/' };
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/bind\s*=\s*127\.0\.0\.1 only/.test(fence)) {
    // The one that matters: a table of company intelligence must not be reachable off-box.
    for (const host of ['0.0.0.0', '::', '192.168.1.10', 'localhost.evil.example']) {
      let refused = false;
      try { assertLoopbackBind(host); } catch { refused = true; }
      say(refused, `bind to ${host} was accepted — the table must be loopback only`);
    }
    let loopback = true;
    try { assertLoopbackBind('127.0.0.1'); } catch { loopback = false; }
    say(loopback, '127.0.0.1 was refused — the check has become unusable rather than strict');
  }

  const table = listCompanyRows({ map: { ...map, companies: [company, second] }, ledger, catalog: {} }, { limit: 50 });
  const rows = table?.rows || [];
  if (/map-order\s*=>\s*rows follow map order/.test(fence)) {
    say(rows.length === 2 && rows[0]?.id === company.id && rows[1]?.id === second.id,
      'rows did not follow map order — a table that reorders is a ranking nobody declared');
  }
  if (/vanished-id\s*=>\s*fails closed/.test(fence)) {
    const empty = listCompanyRows({ map: { ...map, companies: [] }, ledger, catalog: {} }, { limit: 50 });
    say((empty?.rows || []).length === 0, 'a map with no companies produced rows out of nothing');
  }
  if (/no-contact-or-score\s*=>\s*never present/.test(fence)) {
    const serialized = JSON.stringify(table);
    say(!serialized.includes('leak@example.com'), 'an email on the map row reached the table');
    say(!/"(score|fitScore|rank|email|phone)"\s*:/.test(serialized), 'the table carries a contact- or score-shaped key');
  }

  return bad.length
    ? { status: 'violation', detail: `§14 fence and listCompanyRows disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} table rules hold; loopback-only bind refused 4 off-box hosts` };
}

async function checkWaterfall() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.company-waterfall\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.company-waterfall/1 fence in §15 yet' };

  const { SOURCE_ORDER, runCompanyWaterfall } = await import('./demigod-company-waterfall.mjs');
  const retrievedAt = '2026-08-14T12:00:00.000Z';
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/order\s*=\s*first_party, yc, wikidata, ats_json/.test(fence)) {
    say(JSON.stringify(SOURCE_ORDER) === JSON.stringify(['first_party', 'yc', 'wikidata', 'ats_json']),
      `the document's source order and SOURCE_ORDER disagree: ${JSON.stringify(SOURCE_ORDER)}`);
  }
  if (/empty-never-clobbers\s*=>\s*a verified value survives/.test(fence)) {
    // An incomplete board read must never zero a verified count. This is the waterfall's half of the
    // same rule the enricher and the packet enforce: an unread board is not an empty one.
    const kept = runCompanyWaterfall({
      companyId: 'yc:acme',
      existing: { openRoles: 4, openRolesAt: '2026-08-01' },
      sources: { ats: { provider: 'Greenhouse', slug: 'acme', complete: false, boardUrl: 'https://boards.greenhouse.io/acme', json: { jobs: [] } } },
      retrievedAt,
    });
    say(kept?.fields?.openRoles?.status === 'kept' && kept?.fields?.openRoles?.value === 4,
      'an incomplete ATS read overwrote a verified count');
    say(kept?.fields?.openRolesAt?.status === 'kept', 'an incomplete ATS read restamped the observation date');
  }
  if (/dry-run\s*=>\s*the supported path mutates neither/.test(fence)) {
    const existing = { openRoles: 4, openRolesAt: '2026-08-01' };
    const before = JSON.stringify(existing);
    runCompanyWaterfall({ companyId: 'yc:acme', existing, sources: {}, retrievedAt });
    say(JSON.stringify(existing) === before, 'the waterfall mutated its existing-evidence input');
  }
  if (/provenance\s*=>\s*every fill retains its source URL/.test(fence)) {
    const filled = runCompanyWaterfall({
      companyId: 'yc:acme',
      existing: {},
      sources: {
        ats: {
          provider: 'Greenhouse',
          slug: 'acme',
          complete: true,
          boardUrl: 'https://boards.greenhouse.io/acme',
          json: { jobs: [{ id: 1, title: 'Backend Engineer', absolute_url: 'https://boards.greenhouse.io/acme/jobs/1' }] },
        },
      },
      retrievedAt,
    });
    const fills = Object.entries(filled?.fields || {}).filter(([, f]) => f?.status === 'filled');
    say(fills.length > 0, 'nothing filled — the provenance rule had nothing to check');
    for (const [name, field] of fills) {
      say(Boolean(field.url) && Boolean(field.retrievedAt), `${name} filled with no source URL or retrieval time`);
    }
  }

  return bad.length
    ? { status: 'violation', detail: `§15 fence and runCompanyWaterfall disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} waterfall rules hold; an incomplete read never clobbers a verified count` };
}

async function checkWriteback() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.packet-writeback\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.packet-writeback/1 fence in §17 yet' };

  const writeback = await import('./demigod-packet-writeback.mjs');
  const { packet } = await packetFixture();
  const unknown = { schema: 'demigod.company-packet/1', status: 'unknown', companyId: 'yc:ghost', unknowns: [] };
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  const plan = writeback.buildWritebackPlan([packet, unknown], { at: '2026-08-17' });
  if (/mode\s*=\s*dry-run, always/.test(fence)) {
    say(plan.mode === 'dry-run', `plan mode is ${plan.mode}`);
    // No exported function may take a mode: the constant is the whole safety property.
    say(!Object.keys(writeback).some((name) => /^apply/i.test(name)),
      `an apply-shaped export exists: ${Object.keys(writeback).filter((n) => /^apply/i.test(n)).join(', ')}`);
  }
  if (/unknown-packet\s*=>\s*skipped and counted/.test(fence)) {
    say(plan.counts?.skippedUnknown === 1, `an unknown packet must be skipped and counted, got ${plan.counts?.skippedUnknown}`);
    say(!JSON.stringify(plan.rows).includes('yc:ghost'), 'an unknown packet reached the planned rows');
  }
  if (/no-authority-fields\s*=>\s*no score, consent, match or intro/.test(fence)) {
    say(!/"(score|fitScore|rank|consent|match|intro)"\s*:/.test(JSON.stringify(plan.rows)),
      'a planned row carries an authority-shaped key');
    say(!JSON.stringify(plan).includes('leak@example.com'), 'a contact field reached the writeback plan');
  }
  if (/pure\s*=>\s*building a plan writes nothing/.test(fence)) {
    const before = JSON.stringify(packet);
    writeback.buildWritebackPlan([packet], { at: '2026-08-17' });
    say(JSON.stringify(packet) === before, 'building a plan mutated the packet it read');
  }

  return bad.length
    ? { status: 'violation', detail: `§17 fence and buildWritebackPlan disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} writeback rules hold; dry-run is the only reachable mode` };
}

async function checkCompanyIdentity() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.company-identity\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.company-identity/1 fence in §1 yet' };

  const { identityFromRow, resolveEntities, findResolvedCluster } = await import('./demigod-company-identity.mjs');
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  if (/key\s*=\s*registrable domain/.test(fence)) {
    const ident = identityFromRow({ id: 'yc:acme', name: 'Acme', website: 'https://acme.io/' });
    say(ident.domain === 'acme.io', `the registrable domain must be the key, got ${ident.domain}`);
  }
  if (/ats-host\s*=>\s*not an identity/.test(fence)) {
    // A board host as identity would merge every tenant of that ATS into one company.
    const ident = identityFromRow({ id: 'yc:acme', name: 'Acme', website: 'https://jobs.lever.co/acme' });
    say(ident.domain === null && ident.reason === 'ats_host', `an ATS host resolved to ${ident.domain}`);
  }
  if (/dummy-host\s*=>\s*not an identity/.test(fence)) {
    const ident = identityFromRow({ id: 'yc:acme', name: 'Acme', website: 'https://example.com/' });
    say(ident.domain === null && ident.reason === 'dummy_host', `a placeholder host resolved to ${ident.domain}`);
  }
  if (/same-name-diff-domain\s*=>\s*stay split/.test(fence)) {
    const rows = [
      { id: 'yc:acme-one', name: 'Acme', website: 'https://acme.io/' },
      { id: 'yc:acme-two', name: 'Acme', website: 'https://acme.dev/' },
    ];
    const resolved = resolveEntities(rows);
    say(resolved.clusters.length === 2, `one display name over two domains merged into ${resolved.clusters.length} cluster(s)`);
  }
  if (/duplicate-id\s*=>\s*throws duplicate_company_id/.test(fence)) {
    let code = null;
    try { resolveEntities([{ id: 'yc:dup', website: 'https://a.example/' }, { id: 'yc:dup', website: 'https://b.example/' }]); }
    catch (error) { code = error?.code; }
    say(code === 'duplicate_company_id', `two rows with one id must fail closed, got ${code}`);
  }
  if (/unknown-id\s*=>\s*status unknown/.test(fence)) {
    const miss = findResolvedCluster([{ id: 'yc:acme', name: 'Acme', website: 'https://acme.io/' }], 'yc:not-here');
    say(miss.status === 'unknown' && miss.cluster === null, 'an unmatched id must resolve to unknown with no cluster');
  }
  if (/resolution\s*=>\s*reads rows, mutates none/.test(fence)) {
    const rows = [{ id: 'yc:acme', name: 'Acme', website: 'https://acme.io/' }];
    const before = JSON.stringify(rows);
    resolveEntities(rows);
    say(JSON.stringify(rows) === before, 'resolution mutated its input rows — research must never rewrite a map identity');
  }

  return bad.length
    ? { status: 'violation', detail: `§1 fence and demigod-company-identity disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} identity rules hold; no shared host is a key and no name merges` };
}

async function checkCompanyRow() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.company-row\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.company-row/1 fence in §4 yet' };
  if (!fs.existsSync(BENCHMARK)) return { status: 'violation', detail: `benchmark artifact missing: ${BENCHMARK}` };

  const { projectCompanyResearch } = await import('./demigod-evidence.mjs');
  const benchmark = readJson(BENCHMARK);
  const id = (benchmark.companies || [])[0]?.id;
  if (!id) return { status: 'violation', detail: 'benchmark has no rows to project' };
  const cat = (companies) => ({ version: 1, researchedAt: null, companies });
  const project = (companies) => projectCompanyResearch({ companyId: id, benchmark, catalog: cat(companies) });
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };

  const base = { id, fields: {} };
  const plain = project([base]);
  if (/extra-keys\s*=>\s*ignored/.test(fence)) {
    // Names chosen to be exactly the kind a shortcut would use: a score, a verdict, a flag.
    const withJunk = project([{ ...base, score: 99, decide: true, surpriseKey: 'x' }]);
    say(JSON.stringify(plain) === JSON.stringify(withJunk),
      'extra keys changed the projection — an undeclared field is deciding something');
  }
  if (/id\s*=>\s*required/.test(fence)) {
    const idless = project([{ fields: { canonicalCompany: { value: 'Ghost' } } }]);
    say(idless?.source !== 'catalog', 'a row with no id was selected as catalog evidence');
  }
  if (/fields\s*=>\s*required/.test(fence)) {
    const fieldless = project([{ id }]);
    say(fieldless?.status === 'unknown', `a row with no fields must project unknown, got ${fieldless?.status}`);
  }
  if (/quarantineHiring\s*=>\s*only literal true/.test(fence)) {
    say(project([{ ...base, quarantineHiring: 'true' }])?.quarantineHiring === false,
      'the string "true" activated quarantine — only the literal boolean may');
    say(project([{ ...base, quarantineHiring: true }])?.quarantineHiring === true,
      'literal true failed to activate quarantine');
  }

  return bad.length
    ? { status: 'violation', detail: `§4 fence and projectCompanyResearch disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `all ${fence.trim().split('\n').length - 1} row rules hold; extra keys change no projection` };
}

async function checkCompanyPacket() {
  const md = fs.readFileSync(CONTRACTS, 'utf8');
  const fence = /```text\s*\n(demigod\.company-packet\/1[\s\S]*?)```/.exec(md)?.[1];
  if (!fence) return { status: 'unwired', detail: 'no demigod.company-packet/1 fence in §13 yet' };

  const { buildCompanyPacket } = await import('./demigod-company-packet.mjs');
  const bad = [];
  const say = (cond, msg) => { if (!cond) bad.push(msg); };
  const EMAIL = 'founder-leak@example.com';
  const PHONE = '+14155550123';
  const company = {
    id: 'yc:packet-check',
    name: 'PacketCheck',
    website: 'https://packetcheck.example/',
    hiring: 'yes',
    atsSource: 'Lever',
    jobsUrl: 'https://jobs.lever.co/packetcheck',
    openRoles: 4,
    openRolesAt: '2026-08-14',
    roleMix: { engineering: 4 },
    // The leak bait: a real map row can carry whatever a source put on it.
    email: EMAIL,
    contactEmail: EMAIL,
    phone: PHONE,
    people: [{ name: 'A Founder', email: EMAIL }],
  };
  // 30 roles on one board — more than the bound, so the bound has something to cut.
  const roles = {};
  for (let i = 0; i < 30; i += 1) {
    roles[`Lever|packetcheck|${i}`] = {
      provider: 'Lever',
      slug: 'packetcheck',
      jobId: String(i),
      company: 'PacketCheck',
      title: `Engineer ${i}`,
      location: 'San Francisco, CA',
      url: `https://jobs.lever.co/packetcheck/${i}`,
      firstSeen: '2026-08-01',
      lastSeen: '2026-08-14',
      closedAt: null,
    };
  }
  const map = { generatedAt: '2026-08-14T00:00:00.000Z', companies: [company] };
  const ledger = { schema: 'demigod.role-ledger/1', updatedAt: '2026-08-14', roles };
  const build = (companyId, override = {}) => buildCompanyPacket({ companyId, map, ledger, catalog: {}, ...override });

  if (/absent-id\s*=>\s*status unknown/.test(fence)) {
    const missing = build('yc:no-such-company');
    say(missing?.status === 'unknown', 'an absent id must project status unknown, not a partial packet');
    say(!missing?.hiring, 'and must not carry a hiring block it has no company for');
  }
  if (/duplicate-id\s*=>\s*throws duplicate_company_id/.test(fence)) {
    let code = null;
    try {
      buildCompanyPacket({ companyId: company.id, map: { ...map, companies: [company, { ...company }] }, ledger, catalog: {} });
    } catch (error) { code = error?.code || String(error?.message); }
    say(code === 'duplicate_company_id', `two rows with one id must fail closed, got ${code}`);
  }

  const packet = build(company.id);
  const serialized = JSON.stringify(packet);
  if (/contact-fields\s*=>\s*never present/.test(fence)) {
    say(!serialized.includes(EMAIL), 'an email on the map row reached the packet');
    say(!serialized.includes(PHONE), 'a phone on the map row reached the packet');
    say(!/"(email|phone|contactEmail|people)"\s*:/.test(serialized), 'the packet carries a contact-shaped key');
  }
  if (/authority-fields\s*=>\s*never present/.test(fence)) {
    say(!/"(score|fitScore|rank|match|consent|intro|writeback)"\s*:/.test(serialized),
      'the packet carries an authority-shaped key it must not grant');
  }
  if (/roles\s*<=\s*25/.test(fence)) {
    say(Array.isArray(packet.roles) && packet.roles.length === 25,
      `a 30-role board must project 25 roles, got ${packet.roles?.length}`);
  }

  return bad.length
    ? { status: 'violation', detail: `§13 fence and buildCompanyPacket disagree on ${bad.length} rule(s)`, sample: bad.slice(0, 5) }
    : { status: 'pass', detail: `packet honours all ${fence.trim().split('\n').length - 1} fenced rules; no contact or authority field survives the boundary` };
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

/** Sections with a working executor today. Raise it when you wire one; never lower it. */
export const ENFORCED_FLOOR = 23;

export const EXECUTORS = {
  5: { name: 'demigod-evidence.mjs (claim shape)', run: checkClaim },
  26: { name: 'demigod-candidate-evidence.mjs projectCandidateEvidence', run: checkCandidateProjection },
  8: { name: 'demigod-evidence.mjs projectCompanyResearch', run: checkProjector },
  9: { name: 'demigod-matching-engine.mjs resolveCompanyEvidence', run: checkEvidenceResolver },
  10: { name: 'demigod-company-packet.mjs (quarantine projection)', run: checkQuarantine },
  11: { name: 'demigod-evidence.mjs safeResearchUrl', run: checkSafeUrl },
  1: { name: 'demigod-company-identity.mjs resolveEntities', run: checkCompanyIdentity },
  2: { name: 'demigod-company-research-benchmark.mjs selection + gold shape', run: checkBenchmarkDoc },
  3: { name: 'demigod-evidence.mjs operational catalog', run: checkOperationalCatalog },
  4: { name: 'demigod-evidence.mjs company-row projection', run: checkCompanyRow },
  6: { name: 'demigod-evidence.mjs COMPANY_RESEARCH_FIELDS', run: checkFrozenFields },
  7: { name: 'demigod-evidence.mjs gradeResearchBenchmark', run: checkAcceptedFields },
  12: { name: 'demigod-evidence.mjs export surface', run: checkResearchEntry },
  13: { name: 'demigod-company-packet.mjs buildCompanyPacket', run: checkCompanyPacket },
  14: { name: 'demigod-company-table.mjs listCompanyRows', run: checkCompanyTable },
  15: { name: 'demigod-company-waterfall.mjs runCompanyWaterfall', run: checkWaterfall },
  16: { name: 'demigod-company-memo.mjs renderCompanyMemo', run: checkPrivateMemo },
  17: { name: 'demigod-packet-writeback.mjs buildWritebackPlan', run: checkWriteback },
  18: { name: 'demigod-company-intelligence.mjs companyCommandPlan', run: checkCommandSurface },
  22: { name: 'demigod-structured-hiring.mjs projectMutualMission', run: checkMutualProjection },
  23: { name: 'demigod-structured-hiring.mjs compareMissionScenario', run: checkMissionScenario },
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
  const pass = results.filter((r) => r.status === 'pass').length;
  /* Ratchet, not a target. Deleting an executor, or letting a fence drift until its section falls
     back to `unwired`, used to cost nothing: the run stayed green and the enforced count quietly
     dropped. The floor only ever moves up, in the same commit that wires the section. Lowering it
     to make a run green is the one thing it exists to prevent. */
  /* Only our own document is ratcheted. The poison suite feeds this checker hand-written stubs with
     one prose section, and those must still report cleanly-unwired rather than breaching a floor
     that describes a file they are not. */
  const regressed = path.resolve(file) === path.resolve(CONTRACTS) && pass < ENFORCED_FLOOR;
  return {
    schema: SCHEMA,
    ok: violations.length === 0 && !regressed,
    ...(regressed ? { error: `enforced sections fell to ${pass}, below the floor of ${ENFORCED_FLOOR} — an executor was removed or a fence stopped matching` } : {}),
    counts: {
      sections: results.length,
      pass,
      violation: violations.length,
      unwired: results.filter((r) => r.status === 'unwired').length,
      enforcedFloor: ENFORCED_FLOOR,
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
