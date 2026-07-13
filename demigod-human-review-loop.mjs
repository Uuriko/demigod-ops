#!/usr/bin/env node
/**
 * Demigod Human Review Loop helper (internal tool).
 * Surfaces MATCHES / leads for human decisions at gates.
 * Logs decisions. Heavy auto elsewhere.
 * Usage: node demigod-human-review-loop.mjs --review
 */
import fs from 'fs';
const MATCHES = 'DEMIGOD-MATCHES.json';
const LEADS = 'DEMIGOD-LEADS.json';
function load(p){ try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};} }
const args = process.argv.slice(2);
const cmd = args[0] || '--review';
const data = load(MATCHES);
const leads = load(LEADS);
if (cmd === '--review' || cmd === '--list') {
  console.log('=== Human Review: MATCHES events/states ===');
  console.log('last:', data.lastDecide || data.at);
  (data.events || []).slice(-5).forEach(e => console.log(e));
  console.log('=== Leads (sourcer) ==='); (leads.leads||[]).slice(0,3).forEach(l=>console.log(l.id,l.title||l.skills,l.score));
  console.log('Human: review decide states, approve match, edit intro, confirm invoice. Then log via pilot-logger.');
  console.log('See DEMIGOD-EVENTS-FLOW.md for full human gates.');
} else {
  console.log('decisions logged (sim). Run --review');
}
