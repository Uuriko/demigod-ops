#!/usr/bin/env node
/**
 * demigod-sms-sim.mjs
 * Clean end-to-end simulator for "text a number to start a conversation" onboarding.
 * Exercises SMS handler multi-turn -> match me / yes -> generate intro + pilot role.
 * Use for local readiness test, GTM dry runs, Fable/Grok loops. No real Twilio.
 *
 * npm run demigod:sms:sim
 * node demigod-sms-sim.mjs --phone=+14155550123 --skills="founding eng React seed SF"
 */

process.env.DEMIGOD_TEST_SCOPE = `sms-sim-${process.pid}`;
process.env.DEMIGOD_ALLOW_REAL_ROLES = '1';
const [{ handleSms }, { loadInbox, loadBoard }] = await Promise.all([
  import('./demigod-sms-handler.mjs'),
  import('./demigod-submissions-lib.mjs'),
]);

const args = process.argv.slice(2);
const phone = (args.find(a => a.startsWith('--phone=')) || '').split('=')[1] || `+1415555${Math.floor(10000+Math.random()*90000)}`;
const skills = (args.find(a => a.startsWith('--skills=')) || '').split('=')[1] || 'PM skills product GTM SF Bay why startups';

console.log(`\n=== Demigod SMS Onboard Simulator ===`);
console.log(`Phone: ${phone}`);
console.log(`Initial body: "${skills}"`);
console.log('(isolated: writes only under /tmp/dg-busy/tests)\n');

function runStep(label, body) {
  console.log(`--- ${label} ---`);
  const res = handleSms({ from: phone, body });
  if (res.replyForTwilio) console.log('Twilio reply:', res.replyForTwilio);
  if (res.ok === false) console.log('Rejected:', res.reason);
  return res;
}

function requireSuccess(result) {
  if (result?.ok === true) return result;
  console.log('\n=== Result: onboarding blocked ===');
  console.log('Reason:', result?.reason || 'invalid_handler_result');
  process.exit(1);
}

requireSuccess(runStep('1. First text (profile capture)', skills));

requireSuccess(runStep('2. "match me" (see + opt top)', 'match me'));

const yesBody = 'yes Product Manager';
const yesRes = requireSuccess(runStep('3. "yes Product Manager" (opt-in, generate, pilot log)', yesBody));

console.log('\n=== Result: onboard complete (stub) ===');
console.log('Candidate id:', yesRes.candidate && yesRes.candidate.id);
console.log('Intro generated + pilot role added to board (for ledger/signal).');

console.log('\n=== Current SMS cands (present-sms) ===');
const inbox = loadInbox();
const smsCands = (inbox.items || []).filter(i => i.source === 'sms' || (i.raw && i.raw.source === 'sms')).slice(-3);
smsCands.forEach(c => {
  console.log(`- ${c.id} | ${c.phone} | ${(c.raw && c.raw['skills-stack'] || '').slice(0,50)}`);
});

console.log('\n=== Board roles with recent pilot ===');
const board = loadBoard();
const recentPilots = (board.roles || []).filter(r => r.pilot).slice(0,2);
recentPilots.forEach(r => console.log(`- ${r.title} (${r.stageType}) intros:${r.intros || 0} outcome:${r.outcome || ''}`));

console.log('\nUse: node demigod-matching-engine.mjs present-sms');
console.log('     node demigod-matching-engine.mjs generate-intro-request ' + (yesRes.candidate ? yesRes.candidate.id : phone) + ' "Product Manager"');
console.log('Ready for real Twilio webhook (pending). hello@ will follow up.\n');
