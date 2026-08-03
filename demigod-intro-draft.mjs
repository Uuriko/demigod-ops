#!/usr/bin/env node
/**
 * demigod-intro-draft.mjs — draft intro email from a submission id (NO SEND).
 *
 *   node demigod-intro-draft.mjs <sub-id>
 *   node demigod-intro-draft.mjs <sub-id> --json
 *
 * Writes /tmp/dg-busy/intros/<sub-id>.md
 * Redacts full emails in the draft body (uses masked form).
 */
import fs from 'fs';
import path from 'path';
import {
  findSubmission,
  extractEmail,
  extractResumeReference,
  projectDraftText,
  projectDraftUrl,
  publicStatus,
  scrubPII,
  loadBoard,
  loadInbox,
} from './demigod-submissions-lib.mjs';
import {
  assertCurrentPairEligibility,
  assertCurrentMutualPairEligibility,
  getValidPairConsentReceiptMeta,
  getPair,
  hasValidPairConsentReceipt,
} from './demigod-pairs-lib.mjs';
import { listAcceptedRoles } from './demigod-accepted-role.mjs';
import { getStartupRoles, matchEvidence } from './demigod-matching-engine.mjs';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const BUSY = process.env.DEMIGOD_BUSY || '/tmp/dg-busy';
const args = process.argv.slice(2);
const INTRO_FLAGS = new Set(['--json', '--force', '--help', '-h']);
const unknownIntro = args.find((a) => a.startsWith('-') && !INTRO_FLAGS.has(a));
if (unknownIntro) {
  console.error(
    `intro-draft: unknown argument ${unknownIntro} — try: node demigod-intro-draft.mjs <sub-id|pairId> [--json] [--force]`,
  );
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`demigod-intro-draft — draft intro email from submission/pair (NO SEND)

Usage: node demigod-intro-draft.mjs <sub-id|pairId> [--json] [--force]`);
  process.exit(0);
}
const id = args.find((a) => !a.startsWith('--'));
const asJson = args.includes('--json');

if (!id) {
  console.error('usage: node demigod-intro-draft.mjs <sub-id|pairId> [--json] [--force]');
  process.exit(2);
}

// Allow either submission id OR pair id for drafts
let pair = getPair(id);
const item = findSubmission(id);
if (!item && !pair) {
  console.error(JSON.stringify({ ok: false, error: 'not_found', id, hint: 'pass sub-id or pairId' }));
  process.exit(1);
}
const pairBoard = pair ? loadBoard() : null;
const pairInbox = pair ? loadInbox() : null;

// Intro lifecycle gate: if drafting for a pair, must be approved or mutual_yes
const forced = process.argv.includes('--force');
const pairSample = pair ? pair.sample !== false : false;
const forceAllowed = forced && pairSample;
const actor = projectDraftText(process.env.USER || 'agent', 80);
let gateError = pair && !['approved', 'mutual_yes'].includes(pair.state) ? 'pair_not_reviewed' : '';
if (pair && !forceAllowed && !gateError) {
  try {
    (pair.state === 'mutual_yes' ? assertCurrentMutualPairEligibility : assertCurrentPairEligibility)(pair, {
      pairKey: id,
      board: pairBoard,
      inbox: pairInbox,
    });
  } catch (error) {
    gateError = String(error.message || error);
  }
}
if (pair && gateError && !forceAllowed) {
  console.error(
    JSON.stringify({
      ok: false,
      error: 'intro_gate',
      reason: gateError,
      pairId: pair.pairId,
      state: pair.state,
      hint: 'review pair first: node demigod-match-review.mjs review <pairId> --decision approve --i-reviewed --note "evidence"',
    }),
  );
  process.exit(2);
}

if (pair) {
  // pair-only draft
  const role = pair.sample === false
    ? listAcceptedRoles(pairBoard, pairInbox).acceptedRoles
        .find((row) => String(row.roleId) === String(pair.roleId))
    : getStartupRoles(pairBoard).find((row) => String(row.id) === String(pair.roleId));
  const candidate = (pairInbox.items || []).find((row) => String(row.id) === String(pair.candId));
  const evidence = role && candidate
    ? matchEvidence(role, candidate)
        .map((line) => projectDraftText(scrubPII(line), 256))
        .filter(Boolean)
    : [];
  const openQuestions = evidence.filter((line) => /needs review/i.test(line));
  const candidateRaw = candidate?.raw || candidate || {};
  const candidateConsent = getValidPairConsentReceiptMeta(pair, 'candidate', role?.roleTruthHash);
  const introReady = !pairSample && pair.state === 'mutual_yes' && Boolean(candidateConsent);
  const candidateProof = introReady
    ? projectDraftText(scrubPII(candidateRaw.experience || candidateRaw['background & highlights'] || ''), 500)
    : '';
  const workReferenceOnFile = introReady && Boolean(projectDraftUrl(extractResumeReference(candidateRaw)));
  const candidateConsentDate = Number.isFinite(Date.parse(candidateConsent?.at || ''))
    ? candidateConsent.at.slice(0, 10)
    : 'date unavailable';
  const roleOpenDate = Number.isFinite(Date.parse(role?.openConfirmedAt || ''))
    ? role.openConfirmedAt.slice(0, 10)
    : 'not recorded';
  const dir = path.join(BUSY, 'intros');
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `pair-${pair.pairId}.md`);
  const md = [
    `# Intro draft (NOT SENT${pairSample ? ' · SAMPLE' : ''}) · pair ${pair.pairId}`,
    `state: ${pair.state} · role ${pair.roleId} · cand ${pair.candId}`,
    pairSample ? 'SAMPLE: true' : null,
    `score: ${pair.score ?? '—'}`,
    `reasons: ${projectDraftText(scrubPII(Array.isArray(pair.reasons) ? pair.reasons.slice(0, 8).join('; ') : ''), 500)}`,
    `mutual: founder=${!!pair.mutual?.founder} candidate=${!!pair.mutual?.candidate}`,
    `role truth: ${role?.roleTruthHash || 'not versioned (sample)'}`,
    `consent receipts: founder=${hasValidPairConsentReceipt(pair, 'founder', role?.roleTruthHash)} candidate=${hasValidPairConsentReceipt(pair, 'candidate', role?.roleTruthHash)}`,
    `open role: confirmed ${roleOpenDate}`,
    `intro intent: ${introReady ? `both sides approved this exact role · candidate ${candidateConsentDate}` : 'mutual yes pending — internal prep only'}`,
    `First result: ${projectDraftText(scrubPII(role?.outcome90d || role?.outcome || role?.['90day-outcome'] || 'not supplied'), 500)}`,
    `must-haves: ${projectDraftText(scrubPII(role?.skills || role?.stack || role?.['stack-needs'] || 'not supplied'), 500)}`,
    `constraints: ${projectDraftText(scrubPII(role?.locationPref || role?.['work-location'] || 'work arrangement not supplied'), 160)} · ${projectDraftText(scrubPII(role?.comp || role?.['salary-range'] || 'base salary not supplied'), 120)}`,
    `interview process: ${projectDraftText(scrubPII(role?.interviewProcess || role?.['interview-process'] || 'not supplied'), 300)}`,
    `why this intro: ${evidence.join(' · ') || 'human review found potential fit; structured evidence is incomplete'}`,
    `open question: ${openQuestions.join(' · ') || 'What important constraint or missing evidence could make this a poor fit?'}`,
    forced ? `FORCED: true · actor: ${actor} · at: ${new Date().toISOString()}` : null,
    '',
    'Hi,',
    '',
    introReady
      ? 'Both sides approved this exact role. Identity, contact details, and work links remain withheld from this decision brief.'
      : forced
        ? 'INTERNAL PREP — FORCED past review gate. Candidate proof remains withheld. Do not share.'
        : 'INTERNAL PREP — mutual yes is pending. Candidate proof remains withheld. Do not share.',
    introReady ? '' : null,
    introReady ? `**First result:** ${projectDraftText(scrubPII(role?.outcome90d || role?.outcome || role?.['90day-outcome'] || 'not supplied'), 500)}` : null,
    introReady ? '' : null,
    introReady ? `**Candidate-reported proof:** ${candidateProof || 'not supplied'}` : null,
    introReady ? `**Work reference:** ${workReferenceOnFile ? 'on file; withheld from this draft' : 'not supplied'}` : null,
    introReady ? `**Why this may fit:** ${evidence.join(' · ') || 'human review found potential fit; structured evidence is incomplete'}` : null,
    introReady ? `**Candidate intent:** Reviewed this exact role and opted in ${candidateConsentDate}.` : null,
    introReady ? `**Open question:** ${openQuestions.join(' · ') || 'What important constraint or missing evidence could make this a poor fit?'}` : null,
    introReady ? '**Evidence handshake:** Before any work sample, agree whether AI is allowed, limited, or off. Then spend 10 minutes live on one candidate-chosen artifact: what they personally owned, one tradeoff, and what they would change.' : null,
    introReady ? '' : null,
    introReady ? 'Candidate-submitted and human-reviewed for relevance; claims are not independently verified.' : null,
    '',
    'Draft only — no send from tools.',
    '',
    '— Demigod',
    '',
  ]
    .filter((line) => line != null)
    .join('\n');
  atomicWrite(outPath, md, { mode: 0o600 });
  try {
    const auditPath = path.join(BUSY, 'intro-draft-audit.jsonl');
    fs.appendFileSync(
      auditPath,
      JSON.stringify({
        at: new Date().toISOString(),
        pairId: pair.pairId,
        state: pair.state,
        sample: pairSample,
        forced,
        actor,
        path: outPath,
      }) + '\n',
      { mode: 0o600 },
    );
    fs.chmodSync(auditPath, 0o600);
  } catch {
    /* */
  }
  const result = {
    ok: true,
    pairId: pair.pairId,
    state: pair.state,
    sample: pairSample,
    path: outPath,
    sent: false,
    forced,
  };
  if (asJson) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(md);
    console.log(`Wrote ${outPath}`);
  }
  process.exit(0);
}

const raw = item.raw || {};
const form = String(item.form || '');
const kind = /partner/i.test(form)
  ? 'partner'
  : /startup/i.test(form)
    ? 'startup'
    : /engineer|jobseeker|candidate/i.test(form)
      ? 'engineer'
      : 'other';
const email = extractEmail(raw, form);
const masked = email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '(no email)';
const pub = publicStatus(item);

const role = projectDraftText(scrubPII(raw['role-title'] || raw.roleTitle || ''), 160);
const stack = projectDraftText(
  scrubPII(raw['stack-needs'] || raw.stackNeeds || raw['skills-stack'] || raw.skillsStack || ''),
  500,
);
const outcome = projectDraftText(scrubPII(raw['90day-outcome'] || raw['90dayOutcome'] || ''), 500);
const company = projectDraftText(scrubPII(raw['company-name'] || raw.companyName || ''), 120);
const name = projectDraftText(
  scrubPII(raw['full-name'] || raw.fullName || raw['partner-name'] || ''),
  120,
);
const resume = projectDraftUrl(extractResumeReference(raw));

const subject =
  kind === 'startup'
    ? `Demigod · brief received · ${role || 'role'} (draft)`
    : kind === 'engineer'
      ? `Demigod · profile note · ${name || 'candidate'} (draft)`
      : `Demigod · partner note · ${name || 'partner'} (draft)`;

const lines = [];
lines.push(`# Intro draft (NOT SENT)`);
lines.push(`sub: ${item.id}`);
lines.push(`kind: ${kind} · status: ${item.status} · at: ${item.at}`);
lines.push(`to: ${masked}`);
lines.push(`subject: ${subject}`);
lines.push('');
lines.push('---');
lines.push('');
if (kind === 'startup') {
  lines.push(`Hi${company ? ` ${company}` : ''},`);
  lines.push('');
  lines.push(`Thanks for the brief${role ? ` on **${role}**` : ''}. A human on our side reviews every submission — no bots, no blasts.`);
  lines.push('');
  if (outcome) {
    lines.push(`**First result you shared:** ${outcome}`);
    lines.push('');
  }
  if (stack) {
    lines.push(`**Skills / needs:** ${stack}`);
    lines.push('');
  }
  lines.push('If fit looks real, we only propose intros after mutual yes. Fee is 10% of first-year cash only when you hire (payments still pending — we confirm by email).');
  lines.push('');
  lines.push('Reply to potter@trydemigod.com with any constraints we missed.');
  lines.push('');
  lines.push('— Demigod');
} else if (kind === 'engineer') {
  lines.push(`Hi${name ? ` ${name.split(' ')[0]}` : ''},`);
  lines.push('');
  lines.push('Thanks for joining the network. Profiles stay private until a human sees a real SF startup fit — then you still say yes before any intro.');
  lines.push('');
  if (stack) {
    lines.push(`**Skills you listed:** ${stack}`);
    lines.push('');
  }
  lines.push('No spam. potter@trydemigod.com will reach out only when something is worth your time.');
  lines.push('');
  lines.push('— Demigod');
} else {
  lines.push('Hi,');
  lines.push('');
  lines.push(`We received your ${kind} submission (${pub.headline}). A human will review.`);
  lines.push('');
  lines.push('— Demigod');
}
lines.push('');
lines.push('---');
lines.push('## Ops notes (not in email)');
if (resume) lines.push(`- resume (untrusted private upload; inspect safely): ${resume}`);
lines.push(`- approve: node demigod-submissions-approve.mjs ${item.id}`);
lines.push(`- mark reviewed: node demigod-submissions-inbox.mjs --mark-reviewed=${item.id}`);
lines.push(`- pilot gate: node demigod-intro.mjs status <pilotId>`);
lines.push('- DO NOT send until human confirms. Freeze/publish unrelated.');

const md = lines.join('\n') + '\n';
const dir = path.join(BUSY, 'intros');
fs.mkdirSync(dir, { recursive: true });
const outPath = path.join(dir, `${item.id}.md`);
atomicWrite(outPath, md, { mode: 0o600 });

const result = {
  ok: true,
  id: item.id,
  kind,
  status: item.status,
  toMasked: masked,
  subject,
  path: outPath,
  public: pub,
};

if (asJson) console.log(JSON.stringify(result, null, 2));
else {
  console.log(md);
  console.log(`\nWrote ${outPath}`);
}
