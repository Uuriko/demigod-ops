#!/usr/bin/env node
/**
 * Demigod Matching Engine (ops tool)
 * Organize submissions, compute potential matches, mutual interest tracking,
 * present options for startups and candidates to opt-in/intro/ignore.
 * When mutual, assist "auto" intro (log, receipt, notify stub).
 *
 * Usage examples:
 *   node demigod-matching-engine.mjs suggest --role="Product Manager"
 *   node demigod-matching-engine.mjs startup-interest --role-id=role-xxx --candidate-id=cand-yyy
 *   node demigod-matching-engine.mjs candidate-optin --candidate-id=cand-yyy --role="Founding Designer"
 *   node demigod-matching-engine.mjs mutual-intros
 *   node demigod-matching-engine.mjs propose-intro --startup=... --candidate=...
 *
 * Integrates with submissions-lib, board, pilot-logger, receipts.
 * Honest: human review always; this surfaces + tracks.
 */

import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadBoard, saveBoard, loadInbox, saveInbox, extractEmail } from './demigod-submissions-lib.mjs';
import { appendPilot, computeSignal } from './demigod-board-lib.mjs';
import {
  proposePair,
  consentPair,
  reviewPair,
  getPair,
  pairId as makePairId,
  listPairs,
} from './demigod-pairs-lib.mjs';

/**
 * Legacy interests file — kept for read-compat / migration.
 * Canonical SoR for pairs is DEMIGOD-PAIRS.json via demigod-pairs-lib.
 */
const MATCHES_PATH = path.join(ROOT, 'DEMIGOD-MATCHES.json');
const INBOX_PATH = path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json');

function loadMatches() {
  try {
    return JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf8'));
  } catch {
    return { interests: {}, intros: [], at: new Date().toISOString(), legacy: true };
  }
}
function saveMatches(m) {
  m.at = new Date().toISOString();
  m.note = m.note || 'legacy mirror — prefer demigod-pairs-lib / DEMIGOD-PAIRS.json';
  fs.writeFileSync(MATCHES_PATH, JSON.stringify(m, null, 2));
}

/** One-shot: copy legacy interests into pair ledger (idempotent). */
export function migrateLegacyMatchesToPairs() {
  const m = loadMatches();
  const out = { migrated: 0, errors: [] };
  for (const [key, val] of Object.entries(m.interests || {})) {
    const parts = String(key).split(':');
    if (parts.length < 2) continue;
    const [a, b] = parts;
    try {
      // keys are either roleId:candId or candId:roleTitle
      if (val.startup) {
        mirrorPairInterest(a, b, 'founder', { reasons: ['migrate-legacy'] });
        out.migrated++;
      }
      if (val.candidate) {
        // candidate key is candId:roleTitle — reverse
        mirrorPairInterest(b, a, 'candidate', { reasons: ['migrate-legacy'] });
        out.migrated++;
      }
    } catch (e) {
      out.errors.push(String(e.message || e));
    }
  }
  m.migratedToPairsAt = new Date().toISOString();
  saveMatches(m);
  return out;
}

/** Dual-write interests into canonical pair ledger (freeze-safe SoR). */
function mirrorPairInterest(roleId, candId, side, extra = {}) {
  try {
    if (!roleId || !candId) return null;
    const pair = proposePair({
      roleId: String(roleId),
      candId: String(candId),
      score: extra.score != null ? Number(extra.score) / 100 : null,
      reasons: extra.reasons || ['matching-engine'],
      actor: 'matching-engine',
    });
    if (side === 'founder' || side === 'candidate') {
      return consentPair(pair.pairId, { side, actor: 'matching-engine' });
    }
    return pair;
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

function norm(s) { return String(s || '').toLowerCase().trim(); }

// Events states (human-in-loop per EVENTS-FLOW.md): submitted -> reviewed(human) -> matched(human) -> introduced(human) -> piloted -> receipted -> invoiced(10% on hire) -> paid
export const MATCH_STATES = ['submitted','reviewed','matched','introduced','piloted','receipted','invoiced','paid'];

function scoreMatch(role, candidate) {
  // Deeper honest scoring for high-quality matches that drive revenue (better fit = higher close rate = more 10% invoices)
  let score = 0;
  const rSkills = norm(role.skills || role['stack-needs'] || '');
  const cSkills = norm(candidate.skills || candidate['skills-stack'] || '');
  const rStage = norm(role.stageType || role.stage || '');
  const cPref = norm(candidate['sf-bay'] || candidate.locationPref || 'sf');
  const rComp = norm(role.comp || '');
  const cWhy = norm(candidate['why-this-role'] || candidate.why || '');

  // Skills overlap (core for good match)
  if (rSkills && cSkills) {
    const rArr = rSkills.split(/[, ]+/).filter(Boolean);
    const cArr = cSkills.split(/[, ]+/).filter(Boolean);
    const overlap = rArr.filter(x => cArr.some(y => y.includes(x) || x.includes(y))).length;
    score += Math.min(55, overlap * 18);
  }

  // Stage + location fit (SF early startup focus)
  if (rStage.includes('seed') || rStage.includes('pre-seed')) {
    score += (cPref.includes('sf') || cPref.includes('bay')) ? 22 : 8;
  }

  // Comp alignment (revenue protection — realistic expectations)
  if (rComp && (candidate['salary-range'] || candidate.compExpect)) {
    const candComp = norm(candidate['salary-range'] || candidate.compExpect);
    if (candComp && (rComp.includes(candComp.split('-')[0]?.slice(0,3)) || candComp.includes(rComp.split('-')[0]?.slice(0,3)))) score += 12;
  }

  // "Why this" signal (deeper motivation = better retention/hire)
  if (cWhy && (rStage || rSkills)) score += 8;

  // Experience proxy
  if (candidate.experience || candidate['background & highlights']) score += 8;

  // SMS source boost (richer conversational signal for better matches)
  if (candidate.source === 'sms' || candidate.smsBody) {
    score += 5;
    const sms = (candidate.smsBody || '').toLowerCase();
    const smsRaw = candidate.smsBody || '';

    // deeper "why"/motivation parse from convo (quality signal for retention)
    const whyMatch = smsRaw.match(/(?:why|because|interested in|excited about|want to|looking for)[^.|!|?]{5,80}/i);
    if (whyMatch) score += 7;  // stronger boost for explicit motivation
    if (sms.includes('why') || sms.includes('because') || sms.includes('interested')) score += 3;

    // better skills parse directly from raw SMS body (beyond pre-extracted stack)
    const bodySkills = smsRaw.toLowerCase().match(/\b(react|figma|gtm|product|growth|plg|design|eng|engineer|pm|startup|seed|saas)\b/g) || [];
    const roleSkillHits = bodySkills.filter(s => rSkills.includes(s)).length;
    if (roleSkillHits) score += Math.min(8, roleSkillHits * 3);

    // engagement / convo depth (multi-turn = higher intent)
    const turns = (smsRaw.match(/\|/g) || []).length + (smsRaw.match(/[.!?]/g) || []).length;
    if (turns > 1) score += 4;
    if (turns > 3) score += 3;

    // stage + other quality keywords from text convo
    if (rStage.includes('seed') && (sms.includes('seed') || sms.includes('early') || sms.includes('0 to 1'))) score += 4;
    if (sms.includes('shipped') || sms.includes('built') || sms.includes('led')) score += 4;
    if (sms.includes('sf') || sms.includes('bay') || sms.includes('san francisco')) score += 3;

    // extra base if rich sms data present
    if (candidate.raw && candidate.raw['why-this-role'] && candidate.raw['why-this-role'].length > 10) score += 3;
  }

  return Math.min(100, Math.round(score));
}

function getStartupRoles(board) {
  return (board.roles || []).filter(r => !r.pilot || r.status === 'Active');
}

function getCandidates(inbox) {
  return (inbox.items || []).filter(i => /engineer|jobseeker|candidate/i.test(i.form || '') && i.status !== 'rejected' && i.status !== 'spam');
}

export function suggestMatches(roleTitleOrId, { propose = false, limit = 5 } = {}) {
  const board = loadBoard();
  const inbox = loadInbox ? loadInbox() : { items: [] };
  const roles = getStartupRoles(board);
  const cands = getCandidates(inbox);

  const role = roles.find(r => norm(r.title).includes(norm(roleTitleOrId)) || r.id === roleTitleOrId) || roles[0];
  if (!role) return { error: 'no role' };

  const scored = cands.map(c => ({
    candidate: c,
    score: scoreMatch(role, c.raw || c),
    id: c.id || extractEmail(c.raw || {}, c.form)
  })).sort((a,b) => b.score - a.score).slice(0, limit);

  const proposed = [];
  if (propose) {
    for (const m of scored) {
      try {
        const pair = proposePair({
          roleId: role.id || role.title,
          candId: m.id,
          score: Math.min(1, (m.score || 0) / 100),
          reasons: ['suggest-matches', `score=${m.score}`],
          actor: 'matching-engine',
        });
        proposed.push({ pairId: pair.pairId, state: pair.state, score: m.score, candId: m.id });
      } catch (e) {
        proposed.push({ error: String(e.message || e), candId: m.id });
      }
    }
  }

  return { role, matches: scored, proposed: propose ? proposed : undefined };
}

function markStartupInterest(roleId, candidateId) {
  const m = loadMatches();
  const key = `${roleId}:${candidateId}`;
  m.interests[key] = { ...(m.interests[key] || {}), startup: true, at: Date.now() };
  saveMatches(m);
  const pair = mirrorPairInterest(roleId, candidateId, 'founder');
  return { ok: true, key, pairId: pair?.pairId || makePairId(roleId, candidateId), pair };
}

export function markCandidateOptin(candidateId, roleTitle) {
  const m = loadMatches();
  const key = `${candidateId}:${norm(roleTitle)}`;
  m.interests[key] = { ...(m.interests[key] || {}), candidate: true, at: Date.now() };
  saveMatches(m);
  // roleTitle may be id or title — pairs ledger needs stable ids; use title slug as role key when unknown
  const roleKey = String(roleTitle || '').trim() || 'role-unknown';
  const pair = mirrorPairInterest(roleKey, candidateId, 'candidate');
  return { ok: true, key, pairId: pair?.pairId || null, pair };
}

function findMutual() {
  const board = loadBoard();
  const inbox = loadInbox ? loadInbox() : { items: [] };
  const mutuals = [];

  // Prefer canonical pair ledger
  for (const p of listPairs({ limit: 200 })) {
    if (p.state === 'mutual_yes' || (p.mutual?.founder && p.mutual?.candidate)) {
      mutuals.push({ key: p.pairId, role: p.roleId, cand: p.candId, pair: p });
    }
  }

  // Legacy DEMIGOD-MATCHES.json
  const m = loadMatches();
  Object.keys(m.interests || {}).forEach((k) => {
    const [a, b] = k.split(':');
    if (m.interests[k] && m.interests[k].startup && m.interests[k].candidate) {
      if (!mutuals.some((x) => x.role === a && x.cand === b)) {
        mutuals.push({ key: k, role: a, cand: b });
      }
    }
  });

  return mutuals
    .map((mu) => {
      const role = (board.roles || []).find((r) => r.id === mu.role || norm(r.title) === norm(mu.role));
      const cand = (inbox.items || []).find(
        (i) => (i.id || extractEmail(i.raw || {}, i.form)) === mu.cand,
      );
      return { role, candidate: cand, key: mu.key, pair: mu.pair || null };
    })
    .filter((x) => x.role || x.candidate || x.pair);
}

function proposeIntro(roleOrId, candIdOrEmail) {
  const board = loadBoard();
  const matches = findMutual();
  const target = matches.find(mm => (mm.role && (mm.role.id === roleOrId || norm(mm.role.title).includes(norm(roleOrId)))) && (mm.candidate && (mm.candidate.id === candIdOrEmail || extractEmail(mm.candidate.raw||{}, mm.candidate.form) === candIdOrEmail )) ) || matches[0];

  if (!target) return { error: 'no mutual match found' };

  // Fable 2026-07-09: NEVER write board on mere proposal (appendPilot corrupted honesty).
  // Quarantine intro in matches store only; real receipts go through pilot-logger + honesty gate.
  const mm = loadMatches();
  mm.intros = mm.intros || [];
  const introRec = {
    at: new Date().toISOString(),
    role: target.role ? target.role.title : roleOrId,
    candidate: candIdOrEmail,
    status: 'proposed_quarantine',
    boardWrite: false,
    note: 'Proposal only — no board mutation until human pilot log'
  };
  mm.intros.push(introRec);
  saveMatches(mm);

  // Canonical pair ledger: propose + soft to mutual_yes when both consented; leave review to human
  let pair = null;
  try {
    const rid = target.role?.id || roleOrId;
    const cid = target.candidate?.id || candIdOrEmail;
    pair = proposePair({
      roleId: rid,
      candId: cid,
      reasons: ['propose-intro', 'matching-engine'],
      actor: 'matching-engine',
    });
    try {
      consentPair(pair.pairId, { side: 'founder', actor: 'matching-engine' });
      consentPair(pair.pairId, { side: 'candidate', actor: 'matching-engine' });
      pair = getPair(pair.pairId);
    } catch {
      /* consent best-effort */
    }
  } catch (e) {
    pair = { error: String(e.message || e) };
  }

  const notify = `hello@trydemigod.com will follow up with intro details for ${target.role ? target.role.title : ''} + candidate.`;

  return {
    ok: true,
    intro: target,
    receipt: null,
    notify,
    boardWrite: false,
    pairId: pair?.pairId || null,
    pairState: pair?.state || null,
    introDraftHint: pair?.pairId
      ? `node demigod-intro-draft.mjs ${pair.pairId}  # requires approved|mutual_yes or --force`
      : null,
  };
}

function presentMatchCard(match) {
  // Creative rich presentation for human review (better decisions → better matches → more revenue)
  const c = match.candidate.raw || match.candidate;
  const email = extractEmail(c, '');
  return [
    `MATCH CARD (score: ${match.score})`,
    `Role: ${match.role ? match.role.title : ''} @ ${match.role ? match.role.stageType : ''}`,
    `Candidate: ${c['full-name'] || email}`,
    `Skills: ${c['skills-stack'] || ''}`,
    `Why: ${(c['why-this-role'] || '').slice(0,80)}`,
    `Action: startup-interest then propose when mutual`,
    `---`
  ].join('\n');
}

function logOutcome(introKey, outcome) {
  // Track outcomes for learning + proof assets (hired? comp? = direct revenue signal)
  const mm = loadMatches();
  mm.outcomes = mm.outcomes || {};
  mm.outcomes[introKey] = { outcome, at: Date.now() };
  saveMatches(mm);
  return { ok: true, key: introKey, outcome };
}

function presentForStartup(roleTitleOrId, includeSms = true) {
  const res = suggestMatches(roleTitleOrId);
  if (res.error) return res;
  console.log(`=== Matches for startup role: ${res.role.title} (${res.role.stageType}) ===`);
  console.log('Use: node demigod-matching-engine.mjs startup-interest --role-id=' + (res.role.id || res.role.title) + ' --candidate-id=CAND-ID');
  res.matches.forEach((m,i) => {
    const email = extractEmail(m.candidate.raw || {}, m.candidate.form || '');
    const isSms = m.candidate.source === 'sms' || (m.candidate.raw && m.candidate.raw.source === 'sms');
    const tag = isSms ? ' [SMS/text-started]' : '';
    console.log(`${i+1}. score=${m.score}${tag} | ${m.candidate.raw && m.candidate.raw['full-name'] || email || m.id}`);
    console.log(`   skills: ${(m.candidate.raw && m.candidate.raw['skills-stack']) || ''}`);
    console.log(`   To intro: mark interest then propose when mutual`);
  });
  if (includeSms) {
    const inbox = loadInbox ? loadInbox() : {items:[]};
    const smsOnly = (inbox.items || []).filter(i => (i.source === 'sms' || (i.raw && i.raw.source === 'sms')) && !res.matches.some(m => m.id === (i.id || extractEmail(i.raw||{},i.form))));
    if (smsOnly.length) {
      console.log('\n--- Additional SMS/text-started candidates (not scored for this role yet) ---');
      smsOnly.slice(0,3).forEach(c => {
        const skills = (c.raw && c.raw['skills-stack']) || '';
        console.log(`- ${c.id} phone:${c.phone} skills:${skills.slice(0,40)} | use: candidate-optin or present-sms`);
      });
    }
  }
  return {ok:true};
}

function presentForCandidate(candidateIdOrEmail) {
  const board = loadBoard();
  const roles = getStartupRoles(board);
  console.log(`=== Open roles candidate ${candidateIdOrEmail} may opt into ===`);
  roles.forEach(r => {
    const sc = scoreMatch(r, { 'skills-stack': '' }); // placeholder
    console.log(`- ${r.title} (${r.stageType}) | use: candidate-optin --candidate-id=${candidateIdOrEmail} --role="${r.title}"`);
  });
}

export function presentSmsCandidates() {
  // Best next for "present relevant" from SMS onboarding
  const inbox = loadInbox ? loadInbox() : {items:[]};
  const smsCands = (inbox.items || []).filter(i => i.source === 'sms' || (i.raw && i.raw.source === 'sms'));
  console.log(`=== SMS candidates (from text conversations) ready for matching ===`);
  smsCands.forEach(c => {
    const skills = (c.raw && c.raw['skills-stack']) || '';
    console.log(`- ${c.id} phone:${c.phone} skills:${skills.slice(0,40)} | use present-candidate or optin`);
  });
  if (!smsCands.length) console.log('(no SMS yet - test with node demigod-sms-handler)');
}

export function generateIntroRequest(smsCandIdOrPhone, roleTitle) {
  // High-impact for revenue + quality: turn SMS opt-in into actionable human-ready template
  const inbox = loadInbox ? loadInbox() : {items:[]};
  const cand = (inbox.items || []).find(i => i.id === smsCandIdOrPhone || i.phone === smsCandIdOrPhone || (i.raw && extractEmail(i.raw, i.form) === smsCandIdOrPhone));
  if (!cand) return {error: 'no SMS candidate'};
  const skills = (cand.raw && cand.raw['skills-stack']) || '';
  const why = (cand.raw && cand.raw['why-this-role']) || 'from SMS convo';
  const template = `Intro request (SMS-started candidate):
Role: ${roleTitle}
Candidate: ${cand.raw && cand.raw['full-name'] || cand.phone} (phone ${cand.phone})
Skills: ${skills}
Why from text: ${why}
Source: SMS conversation (low friction onboard)
Next: human review -> propose if fit -> log outcome.
Use: node demigod-matching-engine.mjs propose-intro --role="${roleTitle}" --candidate="${cand.id || cand.phone}"`;
  console.log(template);
  return {ok:true, template};
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  if (cmd === 'suggest' || cmd === 'list') {
    const q = args[1] || '';
    const doPropose = args.includes('--propose');
    const res = suggestMatches(q, { propose: doPropose });
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  if (cmd === 'startup-interest') {
    const roleId = (args.find(a=>a.startsWith('--role-id='))||'').split('=')[1] || args[1];
    const cand = (args.find(a=>a.startsWith('--candidate-id='))||'').split('=')[1] || args[2];
    console.log(markStartupInterest(roleId, cand));
    return;
  }
  if (cmd === 'candidate-optin') {
    const cand = (args.find(a=>a.startsWith('--candidate-id='))||'').split('=')[1] || args[1];
    const role = (args.find(a=>a.startsWith('--role='))||'').split('=')[1] || args[2];
    console.log(markCandidateOptin(cand, role));
    return;
  }
  if (cmd === 'mutual-intros' || cmd === 'mutuals') {
    console.log(JSON.stringify(findMutual(), null, 2));
    return;
  }
  if (cmd === 'propose-intro' || cmd === 'intro') {
    const role = (args.find(a=>a.startsWith('--role='))||'').split('=')[1] || args[1];
    const cand = (args.find(a=>a.startsWith('--candidate='))||'').split('=')[1] || args[2];
    console.log(proposeIntro(role, cand));
    return;
  }
  if (cmd === 'present-startup') {
    const q = args[1] || '';
    presentForStartup(q);
    return;
  }
  if (cmd === 'present-candidate') {
    const id = args[1] || '';
    presentForCandidate(id);
    return;
  }
  if (cmd === 'log-outcome') {
    const key = args[1] || '';
    const outcome = args[2] || 'hired';
    console.log(logOutcome(key, outcome));
    return;
  }
  if (cmd === 'present-sms') {
    presentSmsCandidates();
    return;
  }
  if (cmd === 'generate-intro-request') {
    const id = args[1] || '';
    const role = args[2] || '';
    generateIntroRequest(id, role);
    return;
  }
  if (cmd === 'sms-proof' || cmd === 'proof-sms') {
    generateSmsProof();
    return;
  }
  if (cmd === 'migrate-pairs' || cmd === 'migrate') {
    console.log(JSON.stringify(migrateLegacyMatchesToPairs(), null, 2));
    return;
  }

  console.log(`Demigod Matching Engine (for revenue + highest quality matches)
Commands:
  suggest "Product Manager"          # scored candidates (JSON)
  present-startup "Product Manager"  # rich cards + next actions (includes SMS)
  present-candidate CAND-ID          # roles for opt-in
  present-sms                        # list SMS/text-started candidates
  generate-intro-request <sms-id-or-phone> <role>  # human-ready template from SMS opt-in
  startup-interest --role-id=xxx --candidate-id=yyy
  candidate-optin --candidate-id=yyy --role="Founding Designer"
  mutual-intros
  propose-intro --role=xxx --candidate=yyy
  migrate-pairs                      # legacy DEMIGOD-MATCHES → DEMIGOD-PAIRS
  log-outcome INTRO-KEY hired|not|comp-180k   # track for proof & learning
  sms-proof                          # quick GTM proof text for SMS volume ("X started via text")
`);
}

export function generateSmsProof() {
  const inbox = loadInbox ? loadInbox() : {items:[]};
  const smsCands = (inbox.items || []).filter(i => i.source === 'sms' || (i.raw && i.raw.source === 'sms'));
  const board = loadBoard();
  const smsPilots = (board.pilots || []).filter(p => p.source === 'sms' || (p.email && /sms-/.test(p.email))).length;
  const text = `SMS/text-started leads: ${smsCands.length} candidates started via conversation. ${smsPilots} pilots logged from text. Low-friction SMS onboarding = stronger match pool.`;
  console.log(text);
  return text;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export function decideMatch(role, candidate, threshold=60) {
  // Design: human in loop. Auto scores based on 90d (key per research), skills, stage.
  // Return {score, match: bool, reasons}. Human approves.
  const score = scoreMatch(role, candidate); // existing
  const reasons = [];
  if (role.outcome90d && candidate.why) reasons.push("90d outcome alignment");
  if (role.skills && candidate.skills) reasons.push("skills overlap");
  if (role.stageType && candidate.locationPref) reasons.push("stage/location fit");
  return {score, match: score >= threshold, reasons, state: "matched" /* human confirm */ };
}
