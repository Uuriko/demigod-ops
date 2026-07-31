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
} from './demigod-submissions-lib.mjs';
import { assertCurrentPairEligibility, getPair } from './demigod-pairs-lib.mjs';
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

// Intro lifecycle gate: if drafting for a pair, must be approved or mutual_yes
const forced = process.argv.includes('--force');
const pairSample = pair ? pair.sample !== false : false;
const forceAllowed = forced && pairSample;
const actor = projectDraftText(process.env.USER || 'agent', 80);
let gateError = pair && !['approved', 'mutual_yes'].includes(pair.state) ? 'pair_not_reviewed' : '';
if (pair && !forceAllowed && !gateError) {
  try {
    assertCurrentPairEligibility(pair, { pairKey: id });
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
    forced ? `FORCED: true · actor: ${actor} · at: ${new Date().toISOString()}` : null,
    '',
    'Hi,',
    '',
    forced
      ? 'Draft only — FORCED past review gate. No send from tools.'
      : 'Draft only — a human approved this pair for consideration. No send from tools.',
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
    lines.push(`**90-day outcome you shared:** ${outcome}`);
    lines.push('');
  }
  if (stack) {
    lines.push(`**Skills / needs:** ${stack}`);
    lines.push('');
  }
  lines.push('If fit looks real, we only propose intros after mutual yes. Fee is 10% of first-year base salary when a hire starts (payments still pending — we confirm by email).');
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
