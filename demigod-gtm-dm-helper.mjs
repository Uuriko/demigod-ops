#!/usr/bin/env node
/**
 * GTM DM helper for Demigod.
 * Generates personalized, honest outreach from current board roles.
 * Use to scale founder DMs → more briefs → more matches → revenue (10% on hires).
 * No SLA claims. Human follow-up only.
 */
import { loadBoard } from './demigod-submissions-lib.mjs';

function norm(s) { return String(s || '').toLowerCase(); }

function generateDM(role) {
  const stage = role.stageType || 'early-stage SF startup';
  const skills = role.skills || 'key skills for the role';
  const comp = role.comp || 'competitive comp + equity';

  return `Subject: Human-matched ${role.title} talent for your ${stage}

Hi [Name/Team],

Building in ${stage} — we're running human-reviewed matching for pre-vetted SF Bay talent (candidates upload once, we only forward strong fits). Unlike broad job boards (Wellfound volume) or global remote marketplaces (Arc/Lemon), we focus on warm, local SF intros with real human review and visible proof (see ledger/receipts).

For a ${role.title} role (${skills}, ${comp}), we ask founders for the #1 outcome this hire must deliver in the first 90 days (high-signal for precise matches). We can surface 1-2 curated intros when there's mutual interest.

10% on hire only. Or email potter@trydemigod.com (SMS pending) to onboard. Free for candidates. 90-day replacement once payments are live and a hire is placed.

If this is useful, reply with a quick brief (or just say hi): potter@trydemigod.com

Best,
Demigod (human matches only)`;
}

function main() {
  const board = loadBoard();
  const roles = (board.roles || []).filter(r => !r.pilot || r.status === 'Active').slice(0, 3);
  if (!roles.length) {
    console.log('Add real roles to board.json for personalized DMs.');
    return;
  }
  console.log('=== Personalized founder DM templates (copy/edit) ===\n');
  roles.forEach(r => {
    console.log(`--- For: ${r.title} ---`);
    console.log(generateDM(r));
    console.log('\n');
  });
  console.log('Tip: Run after updating board with real pilot data. Pair with matching-engine for qualified leads.');
}

main();
console.log('\n=== SMS Volume Driver (GTM) ===');
console.log('Email potter@trydemigod.com (SMS pending) to start a conversation and get matched to SF startups. Low friction, humans review every lead.');

console.log('\n--- Ready SMS-recruit copy for founders (paste into your DMs/posts) ---');
console.log(`Subject: SF startup roles — text to get matched (no spam)

Hey — if you're in the Bay and looking for the right next role, email potter@trydemigod.com (SMS pending) with your skills (e.g. "PM product GTM SF" or "eng React seed").

We only forward real fits to a handful of SF startups. Free for candidates. Humans review everything.

(Sharing because I just used it for my open role brief.)`);

console.log('\n--- Short version for replies / network shares ---');
console.log('Candidates: email potter@trydemigod.com (SMS pending) with your stack + "SF". Low-friction, human-reviewed intros to real Bay Area startup briefs. No blasting.');

console.log('\n--- Founder-to-candidate SMS specific for current board roles ---');
const board2 = loadBoard();
const roles2 = (board2.roles || []).filter(r => !r.pilot || r.status === 'Active').slice(0, 3);
roles2.forEach(r => {
  const sk = r.skills || 'your key skills';
  const st = r.stageType || 'early-stage SF';
  console.log(`For ${r.title} (${st}): "Email potter@trydemigod.com (SMS pending) with skills like ${sk} to get matched to this and similar SF briefs. Humans only forward strong fits."`);
  console.log(`  Alt: "Email potter@trydemigod.com (SMS pending) — ${r.title} at ${st} (${sk}). Low volume, real intros only."`);
});

console.log('\nTip: Use these in founder DMs, LinkedIn comments, or warm intros to drive inbound SMS volume. More quality SMS leads = stronger pool for mutual-interest matches.');

// Auto-write ready SMS-recruit DM files for GTM volume (actionable for 15+ DMs)
const outDir = 'demigod-outreach';
try { require('fs').mkdirSync(outDir, {recursive:true}); } catch {}
roles2.forEach(r => {
  const safe = r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fname = `${outDir}/sms-recruit-${safe}.txt`;
  const sk = (r.skills || 'key skills').split(',')[0] || 'your stack';
  const body = `Subject: SF startup roles — text to get matched (no spam)

Hey — if you're in the Bay and looking for the right next role, email potter@trydemigod.com (SMS pending) with your skills (e.g. "${sk} SF" or "${r.title} ${r.stageType}").

We only forward real fits to a handful of SF startups like this ${r.title} brief (${r.stageType}, ${r.skills}). Free for candidates. Humans review everything.

(Sharing because we have an active brief for ${r.title} — ${r.skills}. 10% on hire only.)
`;
  try { require('fs').writeFileSync(fname, body); console.log('Wrote SMS recruit file:', fname); } catch(e){}
});

// Write per-role founder DM that includes explicit SMS CTA (best for volume)
roles2.forEach(r => {
  const safe = r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fname = `${outDir}/founder-dm-sms-${safe}.txt`;
  const body = `Subject: Human-matched ${r.title} talent for your ${r.stageType}

Hi [Name/Team],

Building in ${r.stageType} — we're running human-reviewed matching for pre-vetted SF Bay talent (candidates upload once, we only forward strong fits).

For a ${r.title} role (${r.skills}, ${r.comp || 'comp on intro'}), we can surface 1-2 curated intros when there's mutual interest.

10% on hire. Or email potter@trydemigod.com (SMS pending) to onboard. Free for candidates. 90-day replacement once payments are live and a hire is placed.

If this is useful, reply with a quick brief or just say hi: potter@trydemigod.com

Best,
Demigod (human matches only)`;
  try { require('fs').writeFileSync(fname, body); console.log('Wrote founder-dm-sms:', fname); } catch(e){}
});

// Dedicated candidate SMS onboard instructions (easy to share / pin)
try {
  const onboard = `HOW TO START A CONVERSATION (SMS)

Email potter@trydemigod.com (SMS pending)

Examples:
- "PM product GTM SF" or "Founding Designer Figma seed"
- "Head of Growth PLG analytics" or just "React eng SF Bay"

What happens:
1. We reply (human). Low volume.
2. Say "yes <role>" or "match me" to opt in.
3. Human reviews + proposes mutual intros only.
4. Free for candidates. Startups pay 10% on hire only.

Pre-services: number pending real Twilio. Use form at trydemigod.com too.

See trydemigod.com for current briefs. potter@trydemigod.com follows up.
`;
  require('fs').writeFileSync(`${outDir}/SMS-ONBOARD-INSTRUCTIONS.txt`, onboard);
  console.log('Wrote SMS-ONBOARD-INSTRUCTIONS.txt');
} catch(e){}

// Combined SMS volume sweep
try {
  const sweep = roles2.map(r => `For ${r.title}: email potter@trydemigod.com (SMS pending) with skills like ${r.skills}`).join('\n');
  require('fs').writeFileSync(`${outDir}/SMS-VOLUME-SWEEP.txt`, `SMS Volume Sweep (use with founder DMs)\n${sweep}\n\nSee individual sms-recruit-*.txt , founder-dm-sms-*.txt and SMS-ONBOARD-INSTRUCTIONS.txt for full ready DMs and sharing.`);
  console.log('Wrote SMS-VOLUME-SWEEP.txt');
} catch(e){}

// Tie volume to current SMS text onboarding leads (self-sustaining visibility)
try {
  const {execSync} = require('child_process');
  const leadCount = execSync('node demigod-matching-engine.mjs present-sms 2>/dev/null | grep -c "sms-cand" || echo 0', {encoding:'utf8'}).trim();
  console.log(`Current SMS text-started leads ready for pilots/proof: ${leadCount} (see present-sms, SMS-ONBOARD-INSTRUCTIONS.txt, submissions-inbox)`);
  const sweepPath = `${outDir}/SMS-VOLUME-SWEEP.txt`;
  const extra = `\n\nCurrent SMS leads from text convos: ${leadCount}\nUse: node demigod-pilot-logger.mjs --source=sms on them for proof; triage via submissions-inbox.`;
  require('fs').appendFileSync(sweepPath, extra);
} catch(e){}
