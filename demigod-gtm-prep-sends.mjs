#!/usr/bin/env node
/**
 * demigod-gtm-prep-sends.mjs
 * Prep ready-to-send DMs from templates + board roles, for GTM execution.
 * Outputs to demigod-outreach/sends-YYYY-MM-DD/ with personalized files + send-log stub.
 * Use after updating board with real targets.
 */
import fs from 'fs';
import path from 'path';
import { loadBoard } from './demigod-submissions-lib.mjs';

const outDir = 'demigod-outreach';
const today = new Date().toISOString().slice(0,10);
const sendDir = path.join(outDir, `sends-${today}`);
fs.mkdirSync(sendDir, {recursive: true});

const board = loadBoard();
const roles = (board.roles || []).filter(r => !r.pilot || r.status === 'Active').slice(0,5);

const templates = {
  'Product Manager': fs.readFileSync(path.join(outDir, 'dms-2026-07-07-product-manager.txt'), 'utf8'),
  'Founding Designer': fs.readFileSync(path.join(outDir, 'dms-2026-07-07-founding-designer.txt'), 'utf8'),
  'Head of Growth': fs.readFileSync(path.join(outDir, 'dms-2026-07-07-head-of-growth.txt'), 'utf8'),
};

let log = `DM Send Log ${today}\n`;
roles.forEach(r => {
  const title = r.title || 'Role';
  let tmpl = templates[title] || templates['Head of Growth']; // fallback
  tmpl = tmpl.replace(/\[Name\/Team\]/g, 'Founder/Team at ' + (r.stageType || 'your startup'));
  const fname = path.join(sendDir, `${title.toLowerCase().replace(/\s+/g,'-')}.txt`);
  fs.writeFileSync(fname, tmpl);
  log += `- ${title} (${r.stageType || ''}): ${fname}\n`;
  log += `  90d hook included. Reply to hello@ or use brief.\n`;
});

fs.writeFileSync(path.join(sendDir, 'SEND-LOG.txt'), log);
console.log('Prepared sends in', sendDir);
console.log('Roles:', roles.map(r=>r.title).join(', '));
console.log('Log:', path.join(sendDir, 'SEND-LOG.txt'));
