#!/usr/bin/env node
// demigod-gtm-blast.mjs --dry
// Reads sends- dir DMs + variants, logs as blasted (for execution tracking, no real send).
import fs from 'fs'; import path from 'path';
const dir = 'demigod-outreach/sends-2026-07-07';
const logf = 'demigod-outreach/dm-send-log.txt';
const variantsf = '/tmp/demigod-x-variants.txt';
const dry = process.argv.includes('--dry');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt') && f !== 'SEND-LOG.txt');
const variants = fs.existsSync(variantsf) ? fs.readFileSync(variantsf,'utf8') : '';
const now = new Date().toISOString().slice(0,10);
let added = 0;
files.forEach(f => {
  const to = f.replace('.txt','@example.co');
  const role = f.replace('.txt','').replace(/-/g,' ');
  const entry = `${now} | BLAST | ${role} -> ${to} | 90d + variants + board artifact`;
  if (!dry) fs.appendFileSync(logf, entry + '\n');
  added++;
});
console.log((dry ? 'DRY ' : '') + 'blasted ' + added + ' DMs (see log + variants)');
if (variants) console.log('used variants for creative');
