#!/usr/bin/env node
/**
 * demigod-gtm-log-send.mjs
 * Log a sent DM, tie to 90d outcome for tracking.
 * Usage: node demigod-gtm-log-send.mjs --role="Founding PM" --to="name@co.com" --90d="Ship v1 + $50k MRR"
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2).reduce((o, a) => {
  const [k,v] = a.split('=');
  if (k.startsWith('--')) o[k.slice(2)] = v || true;
  return o;
}, {});

const role = args.role || 'Role';
const to = args.to || 'founder@co.com';
const d90 = args['90d'] || args['90d-outcome'] || 'N/A';
const date = new Date().toISOString().slice(0,10);

const logDir = 'demigod-outreach';
const logFile = path.join(logDir, 'dm-send-log.txt');
const entry = `${date} | ${role} -> ${to} | 90d: ${d90}\n`;

fs.appendFileSync(logFile, entry);
console.log('Logged send:', entry.trim());
console.log('Log at:', logFile);
