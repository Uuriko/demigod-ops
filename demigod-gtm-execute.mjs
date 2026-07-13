#!/usr/bin/env node
/**
 * demigod-gtm-execute.mjs
 * "Execute" the prepared sends by logging them (sim for GTM).
 * Uses the sends dir + log-send.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const sendDir = 'demigod-outreach/sends-2026-07-07';
const files = fs.readdirSync(sendDir).filter(f => f.endsWith('.txt') && f !== 'SEND-LOG.txt');

console.log('=== GTM Execute (dry log) ===');
files.forEach(f => {
  const content = fs.readFileSync(path.join(sendDir, f), 'utf8');
  const role = f.replace('.txt','').replace(/-/g,' ').replace(/\b\w/g, l => l.toUpperCase());
  // Extract 90d from content or default
  const m = content.match(/90 days[^.]*\./i) || [];
  const d90 = (m[0] || 'Ship v1 + $50k MRR').trim();
  const to = 'founder@' + role.toLowerCase().replace(/\s+/g,'') + '.co';
  try {
    const out = execSync(`node demigod-gtm-log-send.mjs --role="${role}" --to="${to}" --90d="${d90}"`, {encoding:'utf8'});
    console.log(out.trim());
  } catch(e){ console.log('log err for', role); }
});
console.log('\nAll logged. Use real DMs now. Log: demigod-outreach/dm-send-log.txt');
