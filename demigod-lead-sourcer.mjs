#!/usr/bin/env node
/**
 * Demigod Lead Sourcer (internal automation tool)
 * Sources talent (engineers) and hiring partners (startups) leads.
 * Parses submissions + mocks for external. Scores basic fit.
 * Human reviews before board/ingest.
 *
 * Usage:
 *   node demigod-lead-sourcer.mjs --type=talent
 *   node demigod-lead-sourcer.mjs --type=partners --limit=10
 *
 * Integrates: submissions-inbox, mock for now (future LinkedIn etc API).
 * Honest: outputs for human triage only. No auto board.
 */

import fs from 'fs';
import path from 'path';
import { ROOT } from './demigod-turn-lib.mjs';
import { loadInbox } from './demigod-submissions-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-LEADS.json');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    type: (args.find(a => a.startsWith('--type=')) || '--type=talent').split('=')[1],
    limit: parseInt((args.find(a => a.startsWith('--limit=')) || '--limit=5').split('=')[1])
  };
}

function scoreLead(lead, type) {
  let score = 0;
  const skills = (lead.skills || lead['stack-needs'] || '').toLowerCase();
  const stage = (lead.stageType || '').toLowerCase();
  const loc = (lead.location || lead['sf-bay'] || '').toLowerCase();
  if (skills) score += 30;
  if (stage.includes('seed') || stage.includes('pre')) score += 20;
  if (loc.includes('sf') || loc.includes('bay')) score += 20;
  if (lead['90day-outcome'] || lead.why) score += 15;
  return Math.min(100, score);
}

function main() {
  const { type, limit } = parseArgs();
  const MOCK_PARTNERS = [
    {id:'p-seed-ai-1', type:'partner', title:'Founding Engineer', stage:'Seed · AI', skills:'full-stack, agents, matching', location:'SF Bay', comp:'seed+eq', outcome90d:'Ship core matching + 3 pilots logged', why:'Early 0-1 builder.'},
    {id:'p-pre-b2b-2', type:'partner', title:'Head of Growth', stage:'Pre-seed · SaaS', skills:'GTM, DMs, demand', location:'SF', comp:'seed+eq', outcome90d:'15+ warm founder DMs + 1 white-glove pilot', why:'Demand gen phase.'},
    {id:'p-seed-3', type:'partner', title:'Founding PM', stage:'Seed · Consumer', skills:'product, research, 0-1', location:'Bay Area', comp:'seed+eq', outcome90d:'Define v1 product + 5 user interviews/week', why:'Own roadmap early.'}
  ];
  let leads = [];
  if (type === 'talent') {
    const inbox = loadInbox();
    leads = (inbox.items || []).filter(i => /engineer|candidate|jobseeker/i.test(i.form || '')).slice(0, limit).map(i => ({
      id: i.id,
      type: 'talent',
      skills: i.raw?.['skills-stack'] || '',
      location: i.raw?.location || '',
      why: i.raw?.['why-this-role'] || '',
      score: 0
    }));
  } else {
    leads = MOCK_PARTNERS.slice(0, limit);
  }
  leads.forEach(l => l.score = scoreLead(l, type));
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), type, leads }, null, 2));
  console.log(`Sourced ${leads.length} ${type} leads to ${OUT}`);
  console.log('Top:', leads.sort((a,b)=>b.score-a.score).slice(0,2));
}

main();