#!/usr/bin/env node
/**
 * Surface sourced leads for a human decision.
 * The review reads this data root's lead file. A decision with no named lead writes nothing.
 * This command does not log a pilot.
 *
 * Usage:
 *   node demigod-human-review-loop.mjs --review
 *   node demigod-human-review-loop.mjs --decide sub-harbor-east --decision approve
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, readJson } from './demigod-agent-tools-lib.mjs';

function dataRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function leadsPath() {
  return path.join(dataRoot(), 'DEMIGOD-LEADS.json');
}

function matchesPath() {
  return path.join(dataRoot(), 'DEMIGOD-MATCHES.json');
}

function reviewPath() {
  return path.join(dataRoot(), 'DEMIGOD-HUMAN-REVIEW.json');
}

function decisionsPath() {
  return path.join(dataRoot(), 'DEMIGOD-HUMAN-DECISIONS.jsonl');
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    if (eq !== -1) out[key] = body.slice(eq + 1);
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      out[key] = argv[i + 1];
      i += 1;
    } else out[key] = true;
  }
  return out;
}

function loadLeads() {
  const doc = readJson(leadsPath()) || {};
  return Array.isArray(doc.leads) ? doc.leads : [];
}

function reviewBody() {
  const leads = loadLeads();
  const matches = readJson(matchesPath()) || {};
  const events = Array.isArray(matches.events) ? matches.events.slice(-5) : [];
  return {
    ok: true,
    at: new Date().toISOString(),
    leadCount: leads.length,
    leads: leads.map((lead) => ({
      id: lead.id,
      type: lead.type || '',
      email: lead.email || '',
      company: lead.company || '',
      title: lead.title || '',
      skills: lead.skills || '',
      score: lead.score ?? null,
    })),
    events,
    leadsPath: leadsPath(),
    report: reviewPath(),
    sent: false,
    liveMail: false,
    loggedPilot: false,
  };
}

function fail(error) {
  return {
    code: 1,
    body: {
      ok: false,
      error,
      sent: false,
      liveMail: false,
      loggedPilot: false,
    },
  };
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const reviewing = args.review === true || args.list === true || argv.length === 0;
  if (reviewing) {
    const body = reviewBody();
    fs.mkdirSync(dataRoot(), { recursive: true });
    atomicWrite(body.report, JSON.stringify(body, null, 2) + '\n');
    return { code: 0, body };
  }
  if (args.decide == null && !argv.some((arg) => arg === '--decide' || arg.startsWith('--decide='))) {
    return fail('command_invalid');
  }
  const id = String(args.decide || '').trim();
  const decision = String(args.decision || '').trim();
  if (!id || id === 'true') return fail('lead_required');
  if (!['approve', 'reject', 'defer'].includes(decision)) return fail('decision_invalid');
  const lead = loadLeads().find((row) => row.id === id);
  if (!lead) return fail('lead_not_found');
  const row = {
    at: new Date().toISOString(),
    id,
    decision,
    type: lead.type || '',
    company: lead.company || '',
    sent: false,
    liveMail: false,
    loggedPilot: false,
  };
  const file = decisionsPath();
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
  return {
    code: 0,
    body: {
      ok: true,
      id,
      decision,
      path: file,
      sent: false,
      liveMail: false,
      loggedPilot: false,
    },
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = run();
  const line = JSON.stringify(result.body);
  if (result.code === 0) console.log(line);
  else console.error(line);
  process.exit(result.code);
}
