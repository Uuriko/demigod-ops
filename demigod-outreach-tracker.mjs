#!/usr/bin/env node
/**
 * Outreach state machine — warm leads without spam automation.
 * File: DEMIGOD-OUTREACH.json
 *
 * Usage:
 *   node demigod-outreach-tracker.mjs list
 *   node demigod-outreach-tracker.mjs add --name "Ada" --channel li --note "warm SF"
 *   node demigod-outreach-tracker.mjs set <id> --status drafted|sent|replied|brief|pilot|pass
 *   node demigod-outreach-tracker.mjs due   # needs follow-up (>3d no reply after sent)
 */
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, opt } from './demigod-agent-tools-lib.mjs';
import { canTransition } from './demigod-funnel.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-OUTREACH.json');
const STATUSES = new Set(['drafted', 'sent', 'replied', 'brief', 'pilot', 'pass']);
const args = process.argv.slice(2);
const cmd = args[0] || 'list';

function load() {
  if (!fs.existsSync(STORE)) {
    return { schema: 1, leads: [], at: new Date().toISOString() };
  }
  try {
    const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    if (!j || !Array.isArray(j.leads)) throw new Error('invalid outreach shape');
    return j;
  } catch (e) {
    const bak = STORE + '.corrupt-' + Date.now();
    try {
      fs.copyFileSync(STORE, bak);
    } catch {
      /* */
    }
    console.error(JSON.stringify({ ok: false, error: 'outreach_corrupt', backup: bak }));
    process.exit(1);
  }
}
function save(d) {
  d.at = new Date().toISOString();
  atomicWrite(STORE, JSON.stringify(d, null, 2) + '\n');
}

if (cmd === 'list') {
  const d = load();
  console.log(JSON.stringify({ count: d.leads.length, leads: d.leads }, null, 2));
  process.exit(0);
}

if (cmd === 'add') {
  const d = load();
  const lead = {
    id: `out_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`,
    at: new Date().toISOString(),
    name: opt(args, '--name', ''),
    company: opt(args, '--company', ''),
    channel: opt(args, '--channel', 'li'),
    status: 'drafted',
    note: opt(args, '--note', ''),
    history: [{ at: new Date().toISOString(), status: 'drafted' }],
  };
  if (!lead.name) {
    console.error(JSON.stringify({ ok: false, error: 'name required' }));
    process.exit(2);
  }
  // Dedupe: same name+company (case-insensitive) not already pass
  const key = `${lead.name}|${lead.company}`.toLowerCase().replace(/\s+/g, ' ').trim();
  const dup = d.leads.find((l) => {
    if (['pass'].includes(l.status)) return false;
    const k = `${l.name || ''}|${l.company || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
    return k === key;
  });
  if (dup && !process.argv.includes('--force')) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'duplicate_lead',
        existing: { id: dup.id, status: dup.status, name: dup.name },
        hint: 'use --force to add anyway',
      }),
    );
    process.exit(1);
  }
  d.leads.unshift(lead);
  save(d);
  console.log(JSON.stringify({ ok: true, lead }, null, 2));
  process.exit(0);
}

if (cmd === 'set') {
  const id = args[1];
  const status = opt(args, '--status');
  if (!id || !status || !STATUSES.has(status)) {
    console.error('usage: set <id> --status drafted|sent|replied|brief|pilot|pass');
    process.exit(2);
  }
  const d = load();
  const lead = d.leads.find((l) => l.id === id || l.id.startsWith(id));
  if (!lead) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  const evidence = opt(args, '--evidence', '');
  if (status === 'sent') {
    const gate = canTransition('approved', 'sent', { evidencePath: evidence });
    if (!gate.ok) {
      console.error(JSON.stringify({ ok: false, error: 'send_evidence_required', detail: gate.error }));
      process.exit(1);
    }
  }
  lead.status = status;
  lead.updatedAt = new Date().toISOString();
  if (status === 'sent') lead.sentAt = lead.sentAt || new Date().toISOString();
  if (status === 'replied') lead.repliedAt = new Date().toISOString();
  const note = opt(args, '--note', '');
  if (note) lead.note = note;
  lead.history = lead.history || [];
  lead.history.push({ at: new Date().toISOString(), status, note, evidence: evidence || undefined });
  save(d);
  console.log(JSON.stringify({ ok: true, lead }, null, 2));
  process.exit(0);
}

if (cmd === 'due') {
  const d = load();
  const now = Date.now();
  const due = d.leads.filter((l) => {
    if (l.status !== 'sent') return false;
    const t = Date.parse(l.sentAt || l.updatedAt || l.at || 0);
    return Number.isFinite(t) && now - t > 3 * 86400000;
  });
  console.log(JSON.stringify({ count: due.length, due }, null, 2));
  process.exit(0);
}

console.error('usage: list | add | set | due');
process.exit(2);
