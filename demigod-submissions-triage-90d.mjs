#!/usr/bin/env node
/**
 * Score a named founder's 90-day outcome and append the triage locally.
 * A missing email, brief, or outcome writes nothing. This command does not log a pilot.
 *
 * Usage: node demigod-submissions-triage-90d.mjs --90d="Ship the billing service and hit 40k MRR" --email=ada@harbor.example --brief="Founding Engineer" --company="Harbor East"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function triagePath() {
  return path.join(dataRoot(), 'DEMIGOD-TRIAGE-90D.jsonl');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    const key = (eq === -1 ? body : body.slice(0, eq)).replace(/-/g, '');
    if (eq !== -1) out[key] = body.slice(eq + 1);
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      out[key] = argv[i + 1];
      i += 1;
    } else out[key] = true;
  }
  return out;
}

function scoreOutcome(outcome) {
  const words = outcome.trim().split(/\s+/).filter(Boolean).length;
  const hasMetric = /\d|%|MRR|revenue|ship|launch|users|growth/i.test(outcome);
  const score = Math.min(100, Math.round(words * 8 + (hasMetric ? 25 : 0)));
  return { score, hasMetric };
}

export function recordTriage(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const outcome = String(args['90d'] || args['90doutcome'] || '').trim();
  const email = String(args.email || '').trim();
  const brief = String(args.brief || '').trim();
  const company = String(args.company || '').trim();
  if (!email || !brief || !outcome) {
    return {
      ok: false,
      error: !email ? 'email_required' : (!brief ? 'brief_required' : 'outcome_required'),
      sent: false,
      liveMail: false,
      loggedPilot: false,
    };
  }

  const { score, hasMetric } = scoreOutcome(outcome);
  const row = {
    at: new Date().toISOString(),
    email,
    brief,
    company,
    outcome,
    score,
    hasMetric,
    loggedPilot: false,
    sent: false,
    liveMail: false,
  };
  const file = triagePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
  return {
    ok: true,
    email,
    brief,
    company,
    outcome,
    score,
    hasMetric,
    path: file,
    sent: false,
    liveMail: false,
    loggedPilot: false,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = recordTriage();
  if (!result.ok) {
    console.error(JSON.stringify(result));
    process.exit(1);
  }
  console.log(JSON.stringify(result));
}
