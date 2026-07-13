#!/usr/bin/env node
/**
 * demigod-submissions-view.mjs
 * Stub inbox viewer for WIZ briefs, applies 90d triage.
 * Mocks some from form fields + 90d.
 */
import { execSync } from 'child_process';

const mocks = [
  {email: 'pm@seed.co', brief: 'Founding PM', '90d': 'Ship v1 + $50k MRR'},
  {email: 'vague@co.com', brief: 'Engineer', '90d': 'help the team'},
  {email: 'designer@seed.co', brief: 'Founding Designer', '90d': 'Launch brand v1 + 10k users'},
];

console.log('=== Submissions Inbox (90d triage) ===');
mocks.forEach(m => {
  console.log(`\n${m.email} | ${m.brief}`);
  console.log(`90d: ${m['90d']}`);
  try {
    const out = execSync(`node demigod-intake-from-wiz.mjs --90d="${m['90d']}" --email="${m.email}" --brief="${m.brief}"`, {encoding:'utf8'});
    console.log(out.trim());
  } catch(e){ console.log('triage err'); }
});
console.log('\nHigh signal -> pilot log. Use --log-pilot for auto.');
