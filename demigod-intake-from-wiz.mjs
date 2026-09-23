#!/usr/bin/env node
/**
 * demigod-intake-from-wiz.mjs
 * Record a wizard brief locally and score its 90-day outcome.
 * A missing email, brief, or outcome writes nothing. This command does not log a pilot.
 *
 * Usage: node demigod-intake-from-wiz.mjs --90d="Ship the billing service" --email=ada@harbor.example --brief="Founding Engineer" --company="Harbor East"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function intakePath() {
  return path.join(dataRoot(), 'DEMIGOD-WIZ-INTAKE.jsonl');
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
  const words = outcome.split(/\s+/).filter(Boolean).length;
  const hasNum = /\d/.test(outcome);
  const hasMetric = /MRR|revenue|users|growth|ship|launch|acquire|hit|k\b/i.test(outcome);
  const score = Math.min(100, Math.round(words * 7 + (hasNum ? 15 : 0) + (hasMetric ? 20 : 0)));
  return { score, hasMetric };
}

export function recordWizIntake(argv = process.argv.slice(2)) {
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
  const file = intakePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
  return {
    ok: true,
    email,
    brief,
    company,
    outcome,
    score,
    path: file,
    sent: false,
    liveMail: false,
    loggedPilot: false,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = recordWizIntake();
  if (!result.ok) {
    console.error(JSON.stringify(result));
    process.exit(1);
  }
  console.log(`WIZ intake recorded for ${result.email} / ${result.company || result.brief}. Signal ${result.score}.`);
  console.log(JSON.stringify(result));
}
