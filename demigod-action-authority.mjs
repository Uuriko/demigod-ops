#!/usr/bin/env node
/**
 * demigod-action-authority — the Action layer DEMIGOD-DIE-SPEC declares but nothing implemented.
 *
 * The spec's object table already lists `Action` ("Proposed or executed write/send/export |
 * idempotency key + authority receipt") and `Approval` ("subject + scope + reviewer + time"). The
 * non-negotiable invariant in §0.2 names what may not happen without authority for that exact
 * action: fabricate facts, make an employment decision, manufacture consent, send a message,
 * publish, move money, or mutate an external system.
 *
 * All of that lives in prose, spread across DEMIGOD-DIE-SPEC.md, AGENTS.md and CLAUDE.md, which
 * means every tool re-derives it and any tool can quietly get it wrong. This module is the one
 * place a caller asks "am I allowed to do this, and what is missing?" — the Palantir move of making
 * Actions a first-class thing with their authority attached, rather than a convention.
 *
 * It authorizes nothing by itself. It answers a question and emits a receipt; the caller still has
 * to honour the answer. That is deliberate: a module that could grant authority would be a way to
 * launder it.
 *
 * WHERE EACH ACTION IS ACTUALLY ENFORCED TODAY. This table is the point of the module — it is an
 * index of existing gates, not a replacement for them. The failure mode to avoid is this file
 * becoming a second source of truth that drifts from the code that really decides. If you change a
 * gate below, change the tier here; if they disagree, the gate is right and this file is stale.
 *
 *   claim.record / company.enrich   demigod-company-packet + evidence receipts (source + retrievedAt)
 *   pair.propose                    demigod-role-packet assertNote — every must-have rated, and
 *                                   evidence under 8 chars is refused per rating
 *   pair.decide_hire                no code path exists, by design; a person decides
 *   consent.record                  demigod-intro yes --i-observed-consent, with per-side evidence
 *   intro.prepare                   demigod-intro packet — mutual-yes gate, prepares only, no send
 *   intro.send / message.send       no automated path; current-request authorization required
 *   site.publish                    bin/dg ship (Demigod) · dasha-ship.mjs (Dasha), plus the
 *                                   PreToolUse guard at bin/dasha-publish-guard-hook
 *   money.move                      no code path exists
 *
 * The two never-tier entries have no enforcement row because they have no implementation. That is
 * the enforcement.
 *
 *   node demigod-action-authority.mjs --list
 *   node demigod-action-authority.mjs check intro.send --consent=both --request-auth
 *   node demigod-action-authority.mjs --selftest
 *
 * Schema: demigod.action-authority/1
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

/**
 * Authority tiers, weakest to strongest. A tier names WHO must have decided, not how hard it is.
 */
export const TIERS = {
  local: 'Private computation or a write to a Demigod store. No external effect, no person affected.',
  evidence: 'Local, and every asserted value must carry its source. An empty successful cell is not allowed.',
  'human-decision': 'A person decides. Software may rank and explain for review; it may not decide.',
  'mutual-consent': 'Both sides have approved this specific step, recorded as Approvals with subject, scope, reviewer and time.',
  'current-request': 'The user authorized this exact action in the request being executed. Prior authorization does not carry.',
  never: 'Not permitted by any authority. The capability is the problem, not the permission.',
};

/**
 * The actions Demigod can take, each with the authority it requires.
 * Grouped by the object they act on, per the spec's object table.
 */
export const ACTIONS = {
  // --- research and claims -------------------------------------------------
  'claim.record': { object: 'Claim', tier: 'evidence', effect: 'Write a value with its source into a Demigod store.' },
  'claim.fabricate': { object: 'Claim', tier: 'never', effect: 'Assert a value no source returned.', note: 'Listed so it has a name. §0.2 forbids it outright.' },
  'company.enrich': { object: 'Company', tier: 'evidence', effect: 'Fill company fields from permitted public sources.' },
  'signal.derive': { object: 'Signal', tier: 'evidence', effect: 'Derive a material change from observations.', note: 'A signal may trigger review; §7 says it may never trigger an external action on its own.' },

  // --- roles and pairs -----------------------------------------------------
  'role.accept': { object: 'Role', tier: 'human-decision', effect: 'Accept a brief as real work Demigod will do.' },
  'pair.propose': { object: 'Pair', tier: 'evidence', effect: 'Put a role/candidate pair in front of a human with cited reasons.', note: 'Proposing is not deciding. Ranking for review is explicitly allowed.' },
  'pair.decide_hire': { object: 'Pair', tier: 'human-decision', effect: 'Decide someone is or is not hired.', note: '§0.2: no employment decision without the authority for it, and never by an unexplained model.' },

  // --- people and consent --------------------------------------------------
  'consent.record': { object: 'Approval', tier: 'human-decision', effect: 'Record that a person consented, from their own act.' },
  'consent.manufacture': { object: 'Approval', tier: 'never', effect: 'Infer or assume consent nobody gave.', note: 'Named so it can be refused explicitly.' },
  'person.reengage': { object: 'Person', tier: 'mutual-consent', effect: 'Contact a prior candidate about a new role.', note: 'Needs a live consent basis; §7 allows re-engagement only for those who consented to it.' },
  'person.release_identity': { object: 'Person', tier: 'mutual-consent', effect: 'Reveal identifying details to the other side.' },

  // --- outward effects -----------------------------------------------------
  'intro.prepare': { object: 'Action', tier: 'local', effect: 'Draft an introduction without sending it.' },
  'intro.send': { object: 'Action', tier: 'mutual-consent', alsoRequires: 'current-request', effect: 'Introduce two parties to each other.' },
  'message.send': { object: 'Action', tier: 'current-request', effect: 'Send any outbound message, DM, or email.' },
  'site.publish': { object: 'Action', tier: 'current-request', effect: 'Publish to a live public surface.' },
  'money.move': { object: 'Action', tier: 'current-request', effect: 'Move funds or sign a value-bearing transaction.' },
  'external.write': { object: 'Action', tier: 'current-request', effect: 'Mutate a system Demigod does not own.' },
};

/**
 * Ask whether an action may proceed.
 *
 * Fails closed twice over: an unknown action is denied rather than defaulted, and every requirement
 * must be positively present — absent context is treated as absent authority, never as consent.
 *
 * @param {string} name
 * @param {{ requestAuthorized?: boolean, consent?: 'none'|'one'|'both', humanDecided?: boolean, evidence?: unknown[] }} ctx
 */
export function checkAction(name, ctx = {}) {
  const action = ACTIONS[name];
  if (!action) {
    return { action: name, allowed: false, tier: null, missing: ['unknown_action'], reason: `No action named "${name}". Unknown actions are denied, not assumed harmless.` };
  }
  const tiers = [action.tier, action.alsoRequires].filter(Boolean);
  const missing = [];
  for (const tier of tiers) {
    if (tier === 'never') missing.push('not_permitted');
    if (tier === 'evidence' && !(Array.isArray(ctx.evidence) && ctx.evidence.length)) missing.push('evidence');
    if (tier === 'human-decision' && ctx.humanDecided !== true) missing.push('human_decision');
    if (tier === 'mutual-consent' && ctx.consent !== 'both') missing.push('mutual_consent');
    if (tier === 'current-request' && ctx.requestAuthorized !== true) missing.push('current_request_authorization');
  }
  const allowed = missing.length === 0;
  return {
    action: name,
    object: action.object,
    tier: action.tier,
    alsoRequires: action.alsoRequires || null,
    allowed,
    missing,
    reason: allowed
      ? `Permitted: ${tiers.map((t) => TIERS[t]).join(' ')}`
      : `Refused. Missing ${missing.join(', ')}. ${tiers.map((t) => TIERS[t]).join(' ')}`,
  };
}

/**
 * The receipt the spec asks an executed Action to carry. Refuses to produce one for a denied
 * action, so a receipt can never be the thing that makes something look authorized.
 */
export function authorityReceipt(name, ctx = {}, { at = null, idempotencyKey = null } = {}) {
  const verdict = checkAction(name, ctx);
  if (!verdict.allowed) return null;
  return {
    schema: 'demigod.action-authority/1',
    action: name,
    object: verdict.object,
    tier: verdict.tier,
    alsoRequires: verdict.alsoRequires,
    grantedBy: {
      evidence: Array.isArray(ctx.evidence) ? ctx.evidence.length : 0,
      humanDecided: ctx.humanDecided === true,
      consent: ctx.consent || 'none',
      requestAuthorized: ctx.requestAuthorized === true,
    },
    idempotencyKey,
    at,
  };
}

if (isMain && process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };

  // fail closed on the unknown
  assert(!checkAction('totally.made.up').allowed, 'unknown action denied');
  assert(checkAction('totally.made.up').missing.includes('unknown_action'), 'and says why');

  // never means never — no context unlocks it
  for (const forbidden of ['claim.fabricate', 'consent.manufacture']) {
    const all = checkAction(forbidden, { requestAuthorized: true, humanDecided: true, consent: 'both', evidence: [1] });
    assert(!all.allowed && all.missing.includes('not_permitted'), `${forbidden} stays refused with every flag set`);
    assert(authorityReceipt(forbidden, { requestAuthorized: true }) === null, `${forbidden} yields no receipt`);
  }

  // evidence tier: an empty successful cell is not allowed
  assert(!checkAction('claim.record', {}).allowed, 'claim without evidence refused');
  assert(!checkAction('claim.record', { evidence: [] }).allowed, 'empty evidence array is still no evidence');
  assert(checkAction('claim.record', { evidence: ['https://example.com/source'] }).allowed, 'claim with a source is fine');

  // proposing is not deciding
  assert(checkAction('pair.propose', { evidence: ['note'] }).allowed, 'ranking for review is allowed');
  assert(!checkAction('pair.decide_hire', { evidence: ['note'] }).allowed, 'evidence does not substitute for a human decision');
  assert(checkAction('pair.decide_hire', { humanDecided: true }).allowed, 'a person may decide');

  // consent is never inferred
  assert(!checkAction('person.release_identity', { consent: 'one' }).allowed, 'one side is not mutual');
  assert(!checkAction('person.release_identity', {}).allowed, 'absent consent is not consent');
  assert(checkAction('person.release_identity', { consent: 'both' }).allowed, 'both sides approved');

  // outbound needs authorization in THIS request
  assert(!checkAction('message.send', {}).allowed, 'no outbound by default');
  assert(!checkAction('site.publish', {}).allowed, 'no publish by default');
  assert(!checkAction('money.move', {}).allowed, 'no money by default');
  assert(checkAction('site.publish', { requestAuthorized: true }).allowed, 'publish with current-request auth');

  // the compound case: an intro needs BOTH mutual consent and authorization to send
  assert(!checkAction('intro.send', { consent: 'both' }).allowed, 'consent alone does not authorize sending');
  assert(!checkAction('intro.send', { requestAuthorized: true }).allowed, 'authorization alone does not create consent');
  const intro = checkAction('intro.send', { consent: 'both', requestAuthorized: true });
  assert(intro.allowed && intro.alsoRequires === 'current-request', 'intro.send needs both and says so');
  assert(checkAction('intro.prepare', {}).allowed, 'preparing an intro is local and always fine');

  // receipts only exist for permitted actions and record what granted them
  const r = authorityReceipt('site.publish', { requestAuthorized: true }, { at: '2026-08-16T00:00:00Z', idempotencyKey: 'k1' });
  assert(r && r.grantedBy.requestAuthorized === true && r.idempotencyKey === 'k1', 'receipt records its grant');
  assert(authorityReceipt('site.publish', {}) === null, 'no receipt without authority');

  // every action names a real tier
  for (const [name, a] of Object.entries(ACTIONS)) {
    assert(TIERS[a.tier], `${name} has a defined tier`);
    if (a.alsoRequires) assert(TIERS[a.alsoRequires], `${name} alsoRequires a defined tier`);
  }
  console.log(JSON.stringify({ ok: true, selftest: 'action-authority', actions: Object.keys(ACTIONS).length }));
  process.exit(0);
}

if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--list') || !args.length) {
    console.log(`# Demigod actions · ${Object.keys(ACTIONS).length} declared\n`);
    for (const [name, a] of Object.entries(ACTIONS)) {
      console.log(`  ${name.padEnd(26)} ${a.tier}${a.alsoRequires ? ' + ' + a.alsoRequires : ''}`);
      console.log(`  ${' '.repeat(26)} ${a.effect}${a.note ? '\n' + ' '.repeat(28) + a.note : ''}\n`);
    }
    process.exit(0);
  }
  const [cmd, name] = args;
  if (cmd === 'check' && name) {
    const consent = (args.find((a) => a.startsWith('--consent=')) || '').split('=')[1] || 'none';
    const out = checkAction(name, {
      consent,
      requestAuthorized: args.includes('--request-auth'),
      humanDecided: args.includes('--human-decided'),
      evidence: args.includes('--evidence') ? ['cli'] : [],
    });
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.allowed ? 0 : 1);
  }
  console.log('usage: demigod-action-authority.mjs [--list] | check <action> [--request-auth] [--consent=both] [--human-decided] [--evidence]');
}
