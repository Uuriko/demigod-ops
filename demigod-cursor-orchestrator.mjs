#!/usr/bin/env node
/**
 * demigod-cursor-orchestrator.mjs
 * Fable (plan) -> Cursor agent (build via CLI/app) -> verify loop.
 * Usage: node demigod-cursor-orchestrator.mjs "plan from /tmp/fable-xxx.txt"
 * Relies on cursor-agent (auth needed for full), or manual in Cursor app/tab.
 * Minimal, respects canonical foot-core for JS, verify gate.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const planFile = process.argv[2] || '/tmp/fable-roadmap-next.txt';
if (!fs.existsSync(planFile)) {
  console.error('Plan file missing. Run Fable first: bin/df review "..." > plan.txt');
  process.exit(1);
}

const plan = fs.readFileSync(planFile, 'utf8');
console.log('=== FABLE PLAN LOADED ===');
console.log(plan.slice(0, 500) + '...');

console.log('\n=== CURSOR UTILIZATION (max) ===');
console.log('1. Cursor app running (3.7.36) - use for multi-file review/edits.');
console.log('2. Cursor tab open (cursor.com/agents) - review plans.');
console.log('3. cursor-agent CLI: (requires auth/CURSOR_API_KEY for auto).');
console.log('   Example: cursor-agent --print "Implement from this Fable plan: ' + planFile + '"');
console.log('   Capture output, apply diffs to mjs/bin (not foot unless minimal).');

// Simulate Cursor "build" for one item: create/enhance tool.
const target = 'demigod-cursor-orchestrator.mjs'; // self or example
console.log('\n=== "CURSOR BUILD" SIM (since auth limit) ===');
console.log('Would run: cursor-agent --print "Based on plan, enhance this orchestrator to auto Fable->Cursor->verify for GTM tools like dm-simulator."');
console.log('Then: node ' + target + ' --apply');

// Auto verify
console.log('\n=== VERIFY GATE ===');
try {
  execSync('npm run demigod:verify:source', { stdio: 'inherit' });
  console.log('Source verify: PASS');
} catch (e) {
  console.error('Verify failed - fix before commit.');
}

// Example next: if plan has GTM, suggest
if (plan.includes('GTM') || plan.includes('DM')) {
  console.log('\n=== NEXT FROM PLAN (Cursor would gen) ===');
  console.log('Create demigod-dm-simulator.mjs (mock DM -> pilot log using current board/90day).');
  console.log('Command: node demigod-gtm-dm-helper.mjs (enhance with sim).');
}

console.log('\nFable self: df review "follow up on orchestrator from previous plan"');
console.log('Cursor: open app/tab, paste plan, iterate with composer/agent.');
