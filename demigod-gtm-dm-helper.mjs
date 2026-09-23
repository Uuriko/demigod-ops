#!/usr/bin/env node
/**
 * GTM DM helper for Demigod.
 * Generates personalized, honest outreach from current board roles.
 * Use to scale founder DMs → more briefs → more matches → revenue (10% on hires).
 * No SLA claims. Human follow-up only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadBoard } from './demigod-submissions-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function draftDir() {
  return path.join(dataRoot(), 'demigod-outreach');
}

function norm(s) { return String(s || '').toLowerCase(); }

function generateDM(role) {
  const stage = role.stageType || 'early-stage SF startup';
  const skills = role.skills || 'key skills for the role';
  const comp = role.comp || 'competitive comp + equity';

  return `Subject: Human-matched ${role.title} talent for your ${stage}

Hi [Name/Team],

Building in ${stage} — we're running human-reviewed matching for pre-vetted SF Bay talent (candidates upload once, we only forward strong fits). Unlike broad job boards (Wellfound volume) or global remote marketplaces (Arc/Lemon), we focus on warm, local SF intros with real human review and visible proof (see ledger/receipts).

For a ${role.title} role (${skills}, ${comp}), we ask founders for the #1 outcome this hire must deliver in the first 90 days (high-signal for precise matches). We can surface 1-2 curated intros when there's mutual interest.

10% on hire only. Or email hello@trydemigod.com (SMS pending) to onboard. Free for candidates. 90-day replacement once payments are live and a hire is placed.

If this is useful, reply with a quick brief (or just say hi): hello@trydemigod.com

Best,
Demigod (human matches only)`;
}

function activeRoles(board = loadBoard()) {
  return (board.roles || []).filter((role) => !role.pilot || role.status === 'Active').slice(0, 3);
}

function companyOf(role) {
  return String(role.company || role.companyName || '').trim();
}

function writeDrafts(roles) {
  const dir = draftDir();
  fs.mkdirSync(dir, { recursive: true });
  const written = [];
  for (const role of roles) {
    const id = String(role.id || '').trim();
    if (!id) continue;
    const company = companyOf(role);
    const founderPath = path.join(dir, `founder-dm-${id}.txt`);
    const recruitPath = path.join(dir, `sms-recruit-${id}.txt`);
    const skill = (role.skills || 'key skills').split(',')[0] || 'your stack';
    fs.writeFileSync(recruitPath, `Subject: SF startup roles — text to get matched (no spam)

Hey — if you're in the Bay and looking for the right next role, email hello@trydemigod.com (SMS pending) with your skills (e.g. "${skill} SF" or "${role.title} ${role.stageType || ''}".

Company: ${company}
Role id: ${id}
We only forward real fits to a handful of SF startups like this ${role.title} brief (${role.stageType || ''}, ${role.skills || ''}). Free for candidates. Humans review everything.
`);
    fs.writeFileSync(founderPath, `Subject: Human-matched ${role.title} talent for ${company || 'your company'}

Hi [Name/Team],

Company: ${company}
Role id: ${id}
Building in ${role.stageType || 'early-stage SF'} — we're running human-reviewed matching for pre-vetted SF Bay talent.

For a ${role.title} role (${role.skills || 'key skills'}, ${role.comp || 'comp on intro'}), we can surface 1-2 curated intros when there's mutual interest.

10% on hire. Or email hello@trydemigod.com (SMS pending) to onboard. Free for candidates.

Best,
Demigod (human matches only)
`);
    written.push({ id, company, title: role.title || '', path: founderPath, recruitPath });
  }
  return written;
}

function main() {
  const roles = activeRoles();
  if (!roles.length) {
    console.log('Add real roles to board.json for personalized DMs.');
    console.log(JSON.stringify({ ok: true, drafts: [], sent: false, liveMail: false }));
    return;
  }
  console.log('=== Personalized founder DM templates (copy/edit) ===\n');
  roles.forEach((role) => {
    console.log(`--- For: ${role.title} ${companyOf(role)} ${role.id} ---`);
    console.log(generateDM(role));
    console.log('\n');
  });
  console.log('Tip: Run after updating board with real pilot data. Pair with matching-engine for qualified leads.');
  return roles;
}
console.log('\n=== SMS Volume Driver (GTM) ===');
console.log('Email hello@trydemigod.com (SMS pending) to start a conversation and get matched to SF startups. Low friction, humans review every lead.');

console.log('\n--- Ready SMS-recruit copy for founders (paste into your DMs/posts) ---');
console.log(`Subject: SF startup roles — text to get matched (no spam)

Hey — if you're in the Bay and looking for the right next role, email hello@trydemigod.com (SMS pending) with your skills (e.g. "PM product GTM SF" or "eng React seed").

We only forward real fits to a handful of SF startups. Free for candidates. Humans review everything.

(Sharing because I just used it for my open role brief.)`);

console.log('\n--- Short version for replies / network shares ---');
console.log('Candidates: email hello@trydemigod.com (SMS pending) with your stack + "SF". Low-friction, human-reviewed intros to real Bay Area startup briefs. No blasting.');

console.log('\n--- Founder-to-candidate SMS specific for current board roles ---');
const roles2 = activeRoles();
roles2.forEach((role) => {
  const skill = role.skills || 'your key skills';
  const stage = role.stageType || 'early-stage SF';
  const company = companyOf(role);
  console.log(`For ${role.title} at ${company} (${stage}): "Email hello@trydemigod.com (SMS pending) with skills like ${skill} to get matched to this and similar SF briefs. Humans only forward strong fits."`);
});

console.log('\nTip: Use these in founder DMs, LinkedIn comments, or warm intros to drive inbound SMS volume. More quality SMS leads = stronger pool for mutual-interest matches.');

const drafts = writeDrafts(roles2);
const onboardPath = path.join(draftDir(), 'SMS-ONBOARD-INSTRUCTIONS.txt');
fs.writeFileSync(onboardPath, `HOW TO START A CONVERSATION (SMS)

Email hello@trydemigod.com (SMS pending)

What happens:
1. We reply (human). Low volume.
2. Say "yes <role>" or "match me" to opt in.
3. Human reviews + proposes mutual intros only.
4. Free for candidates. Startups pay 10% on hire only.

Pre-services: number pending real Twilio. Use the form at trydemigod.com too.
`);
const sweepPath = path.join(draftDir(), 'SMS-VOLUME-SWEEP.txt');
const sweep = drafts.map((row) => `For ${row.title} at ${row.company} (${row.id})`).join('\n');
fs.writeFileSync(sweepPath, `SMS Volume Sweep (local drafts only)\n${sweep}\n`);
console.log(JSON.stringify({ ok: true, drafts, sent: false, liveMail: false }));
