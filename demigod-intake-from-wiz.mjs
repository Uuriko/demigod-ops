#!/usr/bin/env node
/**
 * demigod-intake-from-wiz.mjs
 * Simulate receiving a WIZ submission (from the fixed form) and triage by 90d-outcome.
 * High signal -> suggest/log to pilot with --outcome.
 * Usage: node demigod-intake-from-wiz.mjs --90d="..." --email=... [--brief=...] [--log-pilot]
 * Ties directly to the WIZ 90d step we built/polished.
 */
import { spawnSync } from 'child_process';
const args = {};
process.argv.slice(2).forEach((v, i, arr) => {
  if (v.startsWith('--')) {
    let [k, val] = v.slice(2).split('=');
    k = k.replace(/-/g, '');
    if (val !== undefined) {
      args[k] = val;
    } else if (arr[i+1] && !arr[i+1].startsWith('--')) {
      args[k] = arr[i+1];
    } else {
      args[k] = true;
    }
  }
});

const outcome = args['90d'] || args['90doutcome'] || '';
const email = args.email || 'unknown@co.com';
const brief = args.brief || 'unspecified';
const doLog = !!args.log;

if (!outcome) {
  console.error('Need --90d="specific outcome" from WIZ');
  console.log('Example: node demigod-intake-from-wiz.mjs --90d="Ship v1 + hit $50k MRR" --email="f@co.com" --brief="Head of Growth" --log');
  process.exit(1);
}

const words = outcome.split(/\s+/).length;
const hasNum = /\d/.test(outcome);
const hasMetric = /MRR|revenue|users|growth|ship|launch|acquire|hit|k\b/i.test(outcome);
const score = Math.min(100, Math.round(words * 7 + (hasNum ? 15 : 0) + (hasMetric ? 20 : 0)));

console.log('WIZ INTAKE RECEIVED');
console.log('Email:', email);
console.log('Brief:', brief);
console.log('90d-outcome:', outcome);
console.log('Signal:', score, hasMetric ? '(strong metric)' : '');

if (score >= 70) {
  console.log('\nHIGH SIGNAL — route to human review + white-glove (not auto-mint board).');
  const pilotCmd = `node demigod-pilot-logger.mjs --founder="${email}" --brief="${brief}" --outcome="${outcome}" --intros=0 --no-publish --no-receipt --no-signal`;
  console.log('Suggested after real delivery:', pilotCmd);
  console.log('Warm log: bin/dg pilot warm --who="' + email + '" --channel=wiz');
  console.log('Checklist: bin/dg pilot white-glove');
  if (doLog || args.logpilot) {
    console.log('Logging high-signal (dry: no publish, no fake receipt)...');
    const res = spawnSync('node', ['demigod-pilot-logger.mjs', `--founder=${email}`, `--brief=${brief}`, `--outcome=${outcome}`, '--intros=0', '--no-publish', '--no-receipt', '--no-signal'], { encoding: 'utf8' });
    // Fail-closed: a spawn error or non-zero exit means the pilot was NOT logged. Do not print the
    // "logged" fallback (a false success claim) — surface the failure and exit non-zero.
    if (res.error || res.status !== 0) {
      console.error('NOT logged — pilot-logger failed:', res.error?.message || (res.stderr || '').slice(-300) || `exit ${res.status}`);
      process.exit(1);
    }
    console.log(res.stdout || res.stderr || 'logged (check board/pilots)');
  }
} else {
  console.log('\nNEEDS MORE — follow up for better 90d specifics (pre-services: email).');
  console.log('Still log warm: bin/dg pilot warm --who="' + email + '" --channel=wiz --status=needs-90d');
}

console.log('\nPath: WIZ → bin/dg pilot from-wiz → warm/PILOT-LOG → white-glove → pilot-logger after delivery.');
console.log('Pre-services: webhook+WIZ later; until then human email + this triage.');
