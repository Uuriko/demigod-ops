#!/usr/bin/env node
/**
 * demigod-submissions-triage-90d.mjs
 * Simple triage stub: prioritizes briefs by 90d-outcome quality (high-signal from WIZ).
 * In real: would read from submissions inbox or webhook, score 90d specificity, route to human.
 * Usage: node demigod-submissions-triage-90d.mjs --90d="Ship v1 + $50k MRR" [--email=...]
 * Honest pre-services: just logs + suggests next (manual review).
 */
import { parseArgs } from 'util';

const args = parseArgs({
  options: {
    '90d': { type: 'string' },
    email: { type: 'string' },
    brief: { type: 'string' },
  },
  strict: false,
});

const outcome = args.values['90d'] || args.values['90d-outcome'] || '';
const email = args.values.email || 'founder@co.com';
const brief = args.values.brief || 'unspecified role';

if (!outcome) {
  console.log('Usage: node demigod-submissions-triage-90d.mjs --90d="Specific measurable outcome in 90 days" [--email=..] [--brief=..]');
  console.log('Example: node demigod-submissions-triage-90d.mjs --90d="Ship core loop and hit $40k MRR"');
  process.exit(0);
}

// Simple heuristic: longer, specific, metric-containing = higher signal
const words = outcome.trim().split(/\s+/).length;
const hasMetric = /\d|%|k|MRR|revenue|ship|launch|users|growth/i.test(outcome);
const score = Math.min(100, Math.round((words * 8) + (hasMetric ? 25 : 0)));

console.log('=== 90d Triage (high-signal first) ===');
console.log('Founder:', email);
console.log('Brief:', brief);
console.log('90d outcome:', outcome);
console.log('Signal score:', score, hasMetric ? '(metric detected)' : '(add numbers/metrics for better match)');
console.log('');

if (score > 60) {
  console.log('HIGH SIGNAL — human review priority. Good for precise candidate matching.');
  console.log('Suggested: log to pilot with --outcome, or reply with 3-5 intros plan.');
} else {
  console.log('MED/LOW — ask for more specifics on 90d (via email or future SMS).');
}

console.log('\nNote: pre-services. Real triage will use WIZ data + human + 90d for flywheel.');
console.log('Verify: npm run demigod:verify:source (for site) + this for ops.');
console.log('Next: integrate with demigod-submissions-lib or pilot-logger.');
