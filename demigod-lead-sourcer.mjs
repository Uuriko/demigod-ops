#!/usr/bin/env node
/**
 * Demigod Lead Sourcer (internal automation tool)
 * Sources talent (engineers) and hiring partners (startups) leads.
 * Parses real submissions and writes a preview for human triage.
 * Never overwrites the canonical lead CRM.
 *
 * Usage:
 *   node demigod-lead-sourcer.mjs --type=talent
 *   node demigod-lead-sourcer.mjs --type=partners --limit=10
 *
 * Integrates: submissions-inbox. Partner sourcing has no connected evidence source yet.
 * Honest: outputs for human triage only. No auto board.
 */

import fs from 'fs';
import path from 'path';
import { candidateProfileReadiness, loadInbox } from './demigod-submissions-lib.mjs';
import { isSfBayLocation } from './demigod-lead-collect.mjs';

const OUT = path.join(process.env.DEMIGOD_BUSY || '/tmp/dg-busy', 'lead-sourcer-latest.json');
const USAGE = 'usage: node demigod-lead-sourcer.mjs [--type=talent|partners] [--limit=1..100]';

function parseArgs() {
  const args = process.argv.slice(2);
  const type = (args.find(a => a.startsWith('--type=')) || '--type=talent').split('=')[1];
  const rawLimit = (args.find(a => a.startsWith('--limit=')) || '--limit=5').split('=')[1];
  const limit = Number(rawLimit);
  if (
    args.length > 2 ||
    new Set(args.map(a => a.split('=')[0])).size !== args.length ||
    args.some(a => !a.startsWith('--type=') && !a.startsWith('--limit=')) ||
    !['talent', 'partners'].includes(type) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) throw new Error(USAGE);
  return { type, limit };
}

function scoreLead(lead, type) {
  let score = 0;
  const skills = (lead.skills || lead['stack-needs'] || '').toLowerCase();
  const stage = (lead.stageType || '').toLowerCase();
  const loc = (lead.location || lead['sf-bay'] || '').toLowerCase();
  if (skills) score += 30;
  if (stage.includes('seed') || stage.includes('pre')) score += 20;
  if (isSfBayLocation(loc)) score += 20;
  if (lead['90day-outcome'] || lead.why) score += 15;
  return Math.min(100, score);
}

function main() {
  const { type, limit } = parseArgs();
  let leads = [];
  if (type === 'talent') {
    const inbox = loadInbox();
    leads = (inbox.items || []).filter(i =>
      /engineer|candidate|jobseeker/i.test(i.form || '') && candidateProfileReadiness(i).policyReady
    ).map(i => ({
      id: i.id,
      type: 'talent',
      skills: i.raw?.['skills-stack'] || '',
      location: i.raw?.location || '',
      why: i.raw?.['why-this-role'] || '',
      score: 0
    }));
  }
  leads.forEach(l => l.score = scoreLead(l, type));
  leads.sort((a, b) => b.score - a.score);
  leads = leads.slice(0, limit);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify({ at: new Date().toISOString(), type, leads }, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, OUT);
  console.log(`Previewed ${leads.length} evidence-backed ${type} leads at ${OUT}`);
  if (type === 'partners') console.log('No connected partner evidence source; emitted an honest empty preview.');
  console.log('Top:', leads.slice(0, 2));
}

try {
  main();
} catch (error) {
  if (error.message !== USAGE) throw error;
  console.error(USAGE);
  process.exitCode = 2;
}
